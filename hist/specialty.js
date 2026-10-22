'use strict';
// History views: specialty
(function () {
  if (!window.HistView) return;
  var R = HistView.register;

  // ── Shared bits for this file ─────────────────────────────────────────────
  function names(e) { return (e.players || []).map(function (p) { return p.name; }); }
  function short(n, k) { n = String(n || ''); k = k || 8; return n.length > k ? n.slice(0, k - 1) + '…' : n; }
  function nums(s) { return String(s == null ? '' : s).split(',').map(function (x) { return x === '' ? null : +x; }); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function sum(a) { return a.reduce(function (s, v) { return s + (Number(v) || 0); }, 0); }
  function svgEsc(s) { return HistView.ui.esc(s); }

  // A small line chart (cumulative scores, income by round). series: [{name, color, pts:[..]}]
  // Names are written at the end of each line (nudged apart), so colour is never the only label.
  function lineChart(series, o) {
    o = o || {};
    var W = 340, H = o.h || 170, L = 34, Rt = 74, T = 10, B = 22;
    var all = []; series.forEach(function (s) { s.pts.forEach(function (v) { if (v != null) all.push(v); }); });
    if (!all.length) return '';
    var lo = Math.min(0, Math.min.apply(null, all)), hi = Math.max.apply(null, all); if (hi === lo) hi = lo + 1;
    var n = Math.max.apply(null, series.map(function (s) { return s.pts.length; }));
    function x(i) { return L + (n <= 1 ? 0 : i * (W - L - Rt) / (n - 1)); }
    function y(v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); }
    var g = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + svgEsc(o.aria || 'Chart') + '" style="font-family:system-ui,sans-serif">';
    // three quiet gridlines
    [lo, (lo + hi) / 2, hi].forEach(function (v) {
      var yy = y(v).toFixed(1), lab = Math.round(v);
      g += '<line x1="' + L + '" x2="' + (W - Rt) + '" y1="' + yy + '" y2="' + yy + '" stroke="rgba(255,255,255,' + (v === 0 ? '.28' : '.1') + '" stroke-width="1"/>';
      g += '<text x="' + (L - 6) + '" y="' + yy + '" text-anchor="end" dominant-baseline="central" font-size="10" fill="rgba(255,255,255,.5)">' + lab + '</text>';
    });
    var step = Math.max(1, Math.ceil(n / 8));
    for (var i = 0; i < n; i += step) g += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" fill="rgba(255,255,255,.5)">' + svgEsc(o.xl ? o.xl(i) : i + 1) + '</text>';
    var ends = [];
    series.forEach(function (s) {
      var d = '', last = null;
      s.pts.forEach(function (v, i) { if (v == null) return; d += (d ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); last = { i: i, v: v }; });
      g += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      if (last) { g += '<circle cx="' + x(last.i).toFixed(1) + '" cy="' + y(last.v).toFixed(1) + '" r="3.5" fill="' + s.color + '"/>'; ends.push({ y: y(last.v), x: x(last.i), s: s, v: last.v }); }
    });
    // end labels, pushed apart so they never overlap
    ends.sort(function (a, b) { return a.y - b.y; });
    for (var k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 12) ends[k].y = ends[k - 1].y + 12;
    var over = ends.length ? ends[ends.length - 1].y - (H - B) : 0;
    if (over > 0) ends.forEach(function (e) { e.y -= over; });
    ends.forEach(function (e) {
      g += '<text x="' + (W - Rt + 8) + '" y="' + e.y.toFixed(1) + '" dominant-baseline="central" font-size="11" font-weight="700" fill="rgba(255,255,255,.85)">' +
        '<tspan fill="' + e.s.color + '">■ </tspan>' + svgEsc(short(e.s.name, 8)) + ' <tspan fill="rgba(255,255,255,.55)">' + svgEsc(o.fmt ? o.fmt(e.v) : e.v) + '</tspan></text>';
    });
    return g + '</svg>';
  }

  HistView.css('hv-specialty', [
    // generic grid table
    '.sx-grid{border-collapse:separate;border-spacing:3px;font-size:.8rem;font-variant-numeric:tabular-nums;margin:0 auto;}',
    '.sx-grid th{font-weight:800;color:var(--text-3);padding:2px 4px;white-space:nowrap;font-size:.72rem;}',
    '.sx-grid th.nm{text-align:left;color:var(--text-2);max-width:84px;overflow:hidden;text-overflow:ellipsis;}',
    '.sx-grid td{min-width:26px;height:26px;padding:0 4px;text-align:center;border-radius:6px;font-weight:800;color:var(--text);background:rgba(255,255,255,.05);white-space:nowrap;}',
    '.sx-grid td.hit{background:rgba(34,165,90,.85);color:#fff;}',
    '.sx-grid td.miss{background:rgba(194,48,75,.22);color:#ffb3bf;}',
    '.sx-grid td.su{background:#f6f1e3;font-size:1rem;line-height:1;}',
    '.sx-grid td.su small{display:block;font-size:.55rem;color:#6b5a2e;font-weight:900;}',
    '.sx-legend{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.74rem;color:var(--text-3);font-weight:700;}',
    '.sx-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px;}',
    // rows of a player's cards on felt
    '.sx-felt{border-radius:14px;padding:10px;background:radial-gradient(120% 120% at 50% 0%,var(--f1,#1f7a4a),var(--f2,#0e4a2b));box-shadow:inset 0 0 0 2px rgba(0,0,0,.25),0 6px 16px -6px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:9px;}',
    '.sx-prow{display:flex;flex-direction:column;gap:4px;}',
    '.sx-prow .hd{display:flex;align-items:baseline;gap:8px;font-size:.82rem;font-weight:800;color:rgba(255,255,255,.92);}',
    '.sx-prow .hd span:first-child{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.sx-prow .hd b{font-variant-numeric:tabular-nums;}',
    '.sx-prow .hd small{font-weight:800;color:rgba(255,255,255,.6);font-size:.72rem;}',
    '.sx-cards{display:flex;flex-wrap:wrap;gap:4px;align-items:flex-end;}',
    '.sx-grp{display:flex;gap:2px;padding:3px;border-radius:7px;background:rgba(0,0,0,.18);}',
    '.sx-grp.left{background:rgba(220,40,60,.28);box-shadow:inset 0 0 0 1.5px rgba(255,120,130,.6);}',
    '.sx-c{position:relative;width:24px;height:34px;border-radius:4px;background:#fbf8ef;box-shadow:0 1px 2px rgba(0,0,0,.4);display:grid;place-items:center;font-weight:900;font-size:.8rem;line-height:1;color:#222;font-family:ui-rounded,system-ui,sans-serif;}',
    '.sx-c small{display:block;font-size:.66rem;}',
    '.sx-c.solid{color:#fff;}',
    '.sx-c.wild{box-shadow:inset 0 0 0 2px #e7b416,0 1px 2px rgba(0,0,0,.4);}',
    '.sx-c.dup{box-shadow:inset 0 0 0 2px #e5263f,0 1px 2px rgba(0,0,0,.4);opacity:.85;}',
    '.sx-c.dup::after{content:"";position:absolute;left:3px;right:3px;top:50%;height:2px;background:#e5263f;transform:rotate(-30deg);}',
    '.sx-c.act{font-size:.5rem;letter-spacing:.02em;text-transform:uppercase;padding:0 1px;text-align:center;}',
    // wild-card strip (Five Crowns)
    '.sx-strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:6px;}',
    '.sx-strip>div{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;}',
    '.sx-strip .crown{width:34px;height:46px;border-radius:5px;display:grid;place-items:center;background:linear-gradient(180deg,#ffd75e,#e7a900);color:#3a2600;font-weight:900;font-size:1.05rem;box-shadow:0 2px 0 #a87400;font-family:ui-rounded,system-ui,sans-serif;}',
    '.sx-strip small{font-size:.68rem;font-weight:800;color:var(--text-2);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.sx-strip small.none{color:var(--text-3);}',
    // baseball scoreboard (Sandlot)
    '.sx-sb{border-radius:12px;padding:8px;background:linear-gradient(135deg,#8a5a2b,#5b3716);box-shadow:inset 0 0 0 2px rgba(0,0,0,.25),0 6px 16px -6px rgba(0,0,0,.6);}',
    '.sx-sb .in{background:#123d26;border-radius:7px;padding:6px 4px;overflow-x:auto;}',
    '.sx-sb table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;color:#fff;font-family:ui-monospace,Menlo,monospace;font-size:.82rem;}',
    '.sx-sb th{color:#f5e9b8;font-weight:700;padding:2px 3px;font-size:.7rem;text-align:center;}',
    '.sx-sb td{text-align:center;padding:3px 3px;font-weight:800;}',
    '.sx-sb td.tm{text-align:left;font-family:system-ui,sans-serif;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.sx-sb td.tm i{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);margin-right:6px;}',
    '.sx-sb td.rhe{color:#ffd75e;border-left:1px solid rgba(255,255,255,.15);}',
    '.sx-sb tr.w td.tm{color:#ffd75e;}',
    // victory cities (Axis & Allies)
    '.sx-vc{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:5px;}',
    '.sx-vc span{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:8px;font-size:.78rem;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;}',
    '.sx-vc span.a{background:#4b5054;} .sx-vc span.l{background:#56702c;}',
    '.sx-vc span.flip{box-shadow:inset 0 0 0 2px #ffd75e;}',
    '.sx-vc em{font-style:normal;font-size:.62rem;opacity:.8;margin-left:auto;}',
    '.sx-row2{display:flex;gap:8px;align-items:center;font-size:.86rem;font-weight:800;color:var(--text-2);}',
    '.sx-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.72rem;font-weight:900;}',
    '.hv-tbl.sx-box th,.hv-tbl.sx-box td{padding:4px 3px;font-size:.78rem;}',
    '.sx-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:0;}'
  ].join(''));

  function el(t, a, k) { return HistView.ui.el(t, a, k); }
  function grid(head, rows) {
    // head: [{t, c?, color?}], rows: [[{t, c?, html?}...]]
    var t = el('table', { class: 'sx-grid' });
    t.appendChild(el('tr', null, head.map(function (h) { return el('th', { class: h.c || '', text: h.t, style: h.color ? { color: h.color } : null }); })));
    rows.forEach(function (r) {
      t.appendChild(el('tr', null, r.map(function (c, i) {
        if (c == null) c = { t: '' };
        if (typeof c !== 'object') c = { t: c };
        var tag = c.th ? 'th' : 'td';
        return el(tag, c.html != null ? { class: c.c || '', html: c.html, title: c.title || null } : { class: c.c || '', text: String(c.t), title: c.title || null, style: c.style || null });
      })));
    });
    return el('div', { class: 'hv-scroll' }, [t]);
  }
  function legend(items) {
    return el('div', { class: 'sx-legend' }, items.map(function (x) { return el('span', null, [el('i', { style: { background: x[0] } }), document.createTextNode(x[1])]); }));
  }

  // ── Wizard: every round (trump card, bids and tricks, your cards), bid/took grid, and what decided it ──
  var SUIT = { s: ['♠', '#1d1b2e', 'Spades'], h: ['♥', '#d81e3a', 'Hearts'], d: ['♦', '#d81e3a', 'Diamonds'], c: ['♣', '#1d1b2e', 'Clubs'] };
  HistView.css('hv-wizard', '.sx-wz{background:linear-gradient(160deg,#3b2a8f,#1d1550)!important;color:#ffd166!important;}.sx-wz .big,.sx-js .big{font-size:calc(var(--cw) * .32)!important;font-weight:900;}' +
    '.sx-js{background:linear-gradient(160deg,#e8e3d6,#bdb6a2)!important;color:#5a4a8a!important;}');
  function wzCard(code, w) {
    var ck = HistView.ck, n;
    if (code === 'W' || code === 'W+') n = window.Kit.cardFace({ center: 'W', label: 'Wizard', cls: 'sx-wz', aria: 'Wizard' });
    else if (code === 'J' || code === 'J-') n = window.Kit.cardFace({ center: 'J', label: 'Jester', cls: 'sx-js', aria: 'Jester' });
    else return ck.card(code, w);
    n.style.setProperty('--cw', w + 'px');
    return n;
  }
  R('wizard', function (e, ui) {
    var d = e.dt; if (!d || !d.r || !d.r.length) return null;
    var P = names(e), n = P.length, ck = HistView.ck, sc = ck ? ck.scoresOf(e) : [], tot = ck ? ck.cum(sc, n) : [];
    var hitsAll = P.map(function (x, i) { return d.r.filter(function (r) { return nums(r.b)[i] === nums(r.k)[i]; }).length; });
    var hTop = hitsAll.indexOf(Math.max.apply(null, hitsAll)), big = null;
    sc.forEach(function (r, ri) { r.forEach(function (v, p) { if (!big || v > big.v) big = { v: v, p: p, r: ri + 1 }; }); });
    var wz = d.wiz && d.wiz.length ? d.wiz : null, wTop = wz ? wz.indexOf(Math.max.apply(null, wz)) : -1;
    var out = [ui.stats([['Most bids made', hitsAll[hTop] + ' of ' + d.r.length, P[hTop]], big ? ['Best round', '+' + big.v, P[big.p] + ', round ' + big.r] : null,
      wz && wz[wTop] ? ['Most Wizards', wz[wTop], P[wTop]] : null])];
    // every round: trump card, bids vs tricks, your cards
    if (ck) {
      var panel = el('div', { class: 'hv' });
      var show = function (i) {
        var r = d.r[i], b = nums(r.b), k = nums(r.k), pts = sc[i] || [], kids = [], su = SUIT[r.t];
        var made = P.filter(function (x, p) { return b[p] === k[p]; }).length;
        kids.push(ck.head('<b>Round ' + (i + 1) + '</b> · ' + plural(i + 1, 'card') + (P[r.d] ? ' · ' + ui.esc(short(P[r.d], 10)) + ' dealt' : ''), made === n ? 'Everyone made it' : made ? made + ' of ' + n + ' made it' : 'Nobody made it', made ? 'good' : 'bad'));
        var tc = r.tc === 'W' ? 'W' : r.tc === 'J' ? 'J' : r.tc;
        kids.push(el('div', { class: 'hvc-pair', style: { 'align-items': 'center' } }, [
          ck.grp(r.tc === 'W' ? 'Turned up: a Wizard' : r.tc === 'J' ? 'Turned up: a Jester' : r.tc ? 'Trump card' : 'No trump card', tc ? el('div', { class: 'hvc-row', style: { '--cw': '40px' } }, [wzCard(tc, 40)]) : el('div', { class: 'hvc-sub', text: 'Every card was dealt' })),
          el('div', { class: 'hvc-sub', text: su ? su[2] + ' were trump' + (r.tc === 'W' ? ' (the dealer chose)' : '') : 'No trump this round' })]));
        kids.push(ck.plates(P.map(function (x, p) { return { n: short(x, 8), v: k[p] + '/' + b[p], s: 'took / bid', s2: (pts[p] > 0 ? '+' : '') + (pts[p] != null ? pts[p] : '') + (tot[i] ? ' · ' + tot[i][p] : ''), c: ui.color(p), cls: b[p] === k[p] ? 'good' : 'bad' }; })));
        if (r.h) {
          var hand = el('div', { class: 'hvc-row' + (r.h.length > 20 ? ' fan' : ''), style: { '--cw': '34px', '--ov': '-.45' } });
          for (var j = 0; j + 1 < r.h.length; j += 2) { var c = wzCard(r.h.substr(j, 2), 34), cd = r.h.substr(j, 2); if (r.t && cd.charAt(1) !== r.t && cd !== 'W+') c.classList.add('dim'); hand.appendChild(c); }
          kids.push(ck.grp(short(P[0], 12) + "'s cards", hand, r.t ? 'Trump and Wizards are bright' : ''));
        }
        panel.innerHTML = ''; panel.appendChild(ck.felt(['#3a2f7a', '#241c55', '#18123d'], kids));
      };
      var items = d.r.map(function (r, i) { var pts = sc[i] || [], best = -1; pts.forEach(function (v, p) { if (best < 0 || v > pts[best]) best = p; }); var b = nums(r.b), k = nums(r.k); return { t: String(i + 1), c: best >= 0 ? ui.color(best) : null, ring: P.every(function (x, p) { return b[p] === k[p]; }), title: 'Round ' + (i + 1) }; });
      out.push(ui.section('Every round · tap one', [ck.road(items, d.r.length - 1, show), panel, ck.key(P.map(function (x, p) { return ['Best round: ' + short(x, 8), ui.color(p)]; }).concat([['Everyone made it', 'ring']]))], { icon: 'cards' }));
    }
    var rows = d.r.map(function (r, ri) {
      var su = SUIT[r.t], tc = r.tc;
      var trump = su ? { c: 'su', html: '<span style="color:' + su[1] + '">' + su[0] + '</span>' + (tc === 'W' ? '<small>WIZ</small>' : ''), title: su[2] + (tc === 'W' ? ' (dealer chose after a Wizard)' : '') }
        : { c: 'su', html: '<small>' + (tc === 'J' ? 'JEST' : 'NONE') + '</small>', title: 'No trump' };
      var b = nums(r.b), k = nums(r.k);
      return [{ th: 1, t: String(ri + 1) }, trump].concat(P.map(function (x, i) {
        var hit = b[i] === k[i];
        return { c: hit ? 'hit' : 'miss', t: b[i] + '/' + k[i], title: 'Bid ' + b[i] + ', took ' + k[i] };
      }));
    });
    var head = [{ t: '' }, { t: 'Trump' }].concat(P.map(function (x, i) { return { t: short(x, 6), color: ui.color(i) }; }));
    out.push(ui.section('Bid / took each round', [grid(head, rows), legend([['rgba(34,165,90,.85)', 'Made the bid'], ['rgba(194,48,75,.5)', 'Missed']])], { icon: 'target' }));
    var bars = P.map(function (x, i) {
      var run = 0, best = 0;
      d.r.forEach(function (r) { if (nums(r.b)[i] === nums(r.k)[i]) { run++; best = Math.max(best, run); } else run = 0; });
      return { label: x, value: hitsAll[i], max: d.r.length, color: ui.color(i), text: hitsAll[i] + ' of ' + d.r.length + (best >= 2 ? ' · ' + best + ' in a row' : '') };
    });
    out.push(ui.section('Bids made', ui.bars(bars)));
    if (ck && tot.length) {
      var last = tot[tot.length - 1], hi = Math.max.apply(null, last), w = last.indexOf(hi), sorted = last.slice().sort(function (a, c) { return c - a; });
      var why = last.filter(function (v) { return v === hi; }).length > 1 ? 'A tie at ' + hi + ' after ' + d.r.length + ' rounds.' : P[w] + ' won with ' + hi + ', ' + (hi - sorted[1]) + ' ahead, making ' + hitsAll[w] + ' of ' + d.r.length + ' bids.';
      out.push(ck.foot(why, 'target'));
    }
    return ui.wrap(out);
  });

  // ── Flip 7: the final table, best hands, busts ─────────────────────────────
  var F7C = ['#2b2b33', '#9a7b6c', '#8f9a14', '#e0306f', '#14998c', '#3a9a3e', '#8e2bb0', '#e0352f', '#f0561d', '#c48d00', '#3346b0', '#0093a8', '#5d7484'];
  function f7card(code) {
    var m;
    if (/^\d+!?$/.test(code)) { var v = parseInt(code, 10); return el('span', { class: 'sx-c' + (/!$/.test(code) ? ' dup' : ''), style: { color: F7C[v] || '#222' }, text: String(v), title: /!$/.test(code) ? 'Duplicate ' + v + ': bust' : String(v) }); }
    if ((m = /^\+(\d+)$/.exec(code))) return el('span', { class: 'sx-c solid', style: m[1].length > 1 ? { background: '#f08400', 'font-size': '.64rem' } : { background: '#f08400' }, text: '+' + m[1] });
    if (code === 'x2') return el('span', { class: 'sx-c solid', style: { background: '#f08400' }, text: '×2' });
    var A = { fz: ['Frz', '#3aa6d8', 'Freeze'], f3: ['Flip 3', '#e0a400', 'Flip Three'], sc: ['2nd', '#d6336c', 'Second Chance'] }[code];
    if (A) return el('span', { class: 'sx-c solid act', style: { background: A[1] }, text: A[0], title: A[2] });
    return null;
  }
  function f7row(codes) { var box = el('div', { class: 'sx-cards' }); String(codes || '').split(' ').filter(Boolean).forEach(function (c) { var n = f7card(c); if (n) box.appendChild(n); }); return box; }
  R('flip7', function (e, ui) {
    var d = e.dt; if (!d || !d.st) return null;
    var P = names(e), out = [], lastSt = d.st[d.st.length - 1] || '';
    var lastPts = e.rounds && e.rounds.scores ? e.rounds.scores[e.rounds.scores.length - 1] || [] : [];
    var STN = { b: 'Bust', '7': 'Flip 7!', f: 'Frozen', s: 'Stayed' };
    if (d.fin && d.fin.length) {
      var felt = el('div', { class: 'sx-felt' });
      P.forEach(function (x, i) {
        var st = lastSt.charAt(i);
        felt.appendChild(el('div', { class: 'sx-prow' }, [el('div', { class: 'hd' }, [el('span', { text: x }), el('small', { text: STN[st] || '' }), el('b', { text: st === 'b' ? '0' : lastPts[i] != null ? '+' + lastPts[i] : '' })]), f7row(d.fin[i])]));
      });
      out.push(ui.section('Last round: round ' + d.st.length, felt, { icon: 'cards' }));
    }
    if (d.best && d.best.some(function (b) { return b && b.pts; })) {
      var felt2 = el('div', { class: 'sx-felt', style: { '--f1': '#1d5f86', '--f2': '#0f3a55' } });
      P.forEach(function (x, i) {
        var b = d.best[i]; if (!b || !b.pts) return;
        felt2.appendChild(el('div', { class: 'sx-prow' }, [el('div', { class: 'hd' }, [el('span', { text: x }), el('small', { text: 'Round ' + b.r }), el('b', { text: b.pts + ' pts' })]), f7row(b.c)]));
      });
      out.push(ui.section('Best hands', felt2, { icon: 'star' }));
    }
    // how each round ended for each player
    var COLR = { b: 'rgba(229,38,63,.85)', '7': '#e7b416', f: '#3aa6d8', s: 'rgba(34,165,90,.85)' };
    var rows = P.map(function (x, i) {
      return [{ th: 1, c: 'nm', t: short(x, 9) }].concat(d.st.map(function (s, r) {
        var c = s.charAt(i), v = e.rounds && e.rounds.scores && e.rounds.scores[r] ? e.rounds.scores[r][i] : '';
        return { t: c === 'b' ? '×' : v, style: { background: COLR[c] || '', color: c === '7' ? '#3a2600' : '#fff' }, title: STN[c] };
      }));
    });
    out.push(ui.section('Round by round', [grid([{ t: '' }].concat(d.st.map(function (s, r) { return { t: String(r + 1) }; })), rows),
      legend([[COLR.s, 'Stayed'], [COLR.f, 'Frozen'], [COLR.b, 'Bust'], [COLR['7'], 'Flip 7']])]));
    out.push(ui.section('Tally', ui.table(['', 'Busts', 'Flip 7', 'Froze', 'Saved'], P.map(function (x, i) {
      return [x, (d.bust || [])[i] || 0, (d.f7 || [])[i] || 0, (d.frz || [])[i] || 0, (d.sv || [])[i] || 0];
    }))));
    return ui.wrap(out);
  });

  // ── Five Crowns: every round (the wild card, who went out, everyone's hand laid down), and what decided it ──
  var FC = { t: ['★', '#e3a400'], h: ['♥', '#d81e3a'], c: ['♣', '#178a4a'], s: ['♠', '#1d1b2e'], d: ['♦', '#1f62d0'] };
  var FCR = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  function fcCard(code, wildRank) {
    if (code === 'JK') return el('span', { class: 'sx-c solid wild', style: { background: '#6c3fd6', 'font-size': '.62rem' }, text: 'JK', title: 'Joker' });
    var m = /^(10|[3-9JQK])([thcsd])$/.exec(code); if (!m) return null;
    var s = FC[m[2]];
    return el('span', { class: 'sx-c' + (m[1] === wildRank ? ' wild' : ''), style: { color: s[1] }, html: m[1] + '<small>' + s[0] + '</small>' });
  }
  function fcHand(groups, left, wr) {
    var row = el('div', { class: 'sx-cards' });
    String(groups || '').split('|').filter(Boolean).forEach(function (g) { var gg = el('div', { class: 'sx-grp' }); g.split(' ').forEach(function (c) { var n = fcCard(c, wr); if (n) gg.appendChild(n); }); row.appendChild(gg); });
    if (left) { var lf = el('div', { class: 'sx-grp left' }); left.split(' ').forEach(function (c) { var n = fcCard(c, wr); if (n) lf.appendChild(n); }); row.appendChild(lf); }
    return row;
  }
  function fcWild(i) { return FCR[i] === 'K' ? 'Kings' : FCR[i] === 'J' ? 'Jacks' : FCR[i] === 'Q' ? 'Queens' : FCR[i] + 's'; }
  R(['five-crowns', 'fivecrowns', 'fivecrwns', 'fivecrownss-ai'], function (e, ui) {
    var d = e.dt; if (!d || d.out == null) return null;
    var P = names(e), out = [], nR = d.out.length, ck = HistView.ck, sc = ck ? ck.scoresOf(e) : [], tot = ck ? ck.cum(sc, P.length) : [];
    var outs = P.map(function (x, i) { return d.out.split('').filter(function (o) { return o === String(i); }).length; });
    var most = outs.indexOf(Math.max.apply(null, outs)), big = null;
    sc.forEach(function (r, ri) { r.forEach(function (v, p) { if (!big || v > big.v) big = { v: v, p: p, r: ri }; }); });
    out.push(ui.stats([['Rounds', nR, nR < 11 ? 'quick game' : '3s wild to Kings wild'], outs[most] ? ['Went out most', outs[most] + '×', P[most]] : null,
      big && big.v ? ['Worst catch', big.v, P[big.p] + ', ' + fcWild(big.r).toLowerCase() + ' wild'] : null]));
    var rr = d.rr || [];
    if (ck) {
      var panel = el('div', { class: 'hv' });
      var show = function (i) {
        var o = d.out.charAt(i), wr = FCR[i], kids = [], r = rr[i], pts = sc[i] || [];
        kids.push(ck.head('<b>' + ui.esc(fcWild(i)) + ' wild</b> · round ' + (i + 1), o === '-' ? null : short(P[+o], 10) + ' went out', 'good'));
        if (r && r.h) P.forEach(function (x, p) {
          var hp = String(r.h[p] || '').split('/'), wentOut = o === String(p);
          kids.push(el('div', { class: 'sx-prow' }, [el('div', { class: 'hd' }, [el('span', { text: x }), el('small', { text: wentOut ? 'Went out' : hp[1] ? 'Caught with' : 'All down' }),
            el('b', { text: (pts[p] ? '+' + pts[p] : '0') + (tot[i] ? ' · ' + tot[i][p] : '') })]), fcHand(hp[0], hp[1], wr)]));
        });
        else if (i === nR - 1 && d.fin && d.fin.length) P.forEach(function (x, p) {
          var f = d.fin[p]; if (!f) return;
          kids.push(el('div', { class: 'sx-prow' }, [el('div', { class: 'hd' }, [el('span', { text: x }), el('small', { text: o === String(p) ? 'Went out' : f.l ? 'Caught with' : 'All down' }), el('b', { text: f.p ? '+' + f.p : '0' })]), fcHand(f.g, f.l, wr)]));
        });
        else kids.push(ck.plates(P.map(function (x, p) { return { n: short(x, 8), v: pts[p] != null ? (pts[p] ? '+' + pts[p] : '0') : '–', s: tot[i] ? 'total ' + tot[i][p] : '', c: ui.color(p), cls: o === String(p) ? 'good' : '' }; })));
        panel.innerHTML = ''; panel.appendChild(ck.felt(['#1d7a52', '#105636', '#0a3f27'], kids));
      };
      var items = d.out.split('').map(function (o, i) { return { t: FCR[i], c: o === '-' ? null : ui.color(+o), title: fcWild(i) + ' wild' + (o === '-' ? '' : ': ' + P[+o] + ' went out') }; });
      out.push(ui.section('Every round · tap one', [ck.road(items, nR - 1, show), panel,
        ck.key(P.map(function (x, p) { return [short(x, 10) + ' went out', ui.color(p)]; })), legend([['#e7b416', 'Wild card'], ['rgba(220,40,60,.6)', 'Left in hand (counts against)']])], { icon: 'crown' }));
    }
    out.push(ui.section('Went out first', ui.bars(P.map(function (x, i) { return { label: x, value: outs[i], max: nR, color: ui.color(i), text: outs[i] + (outs[i] === 1 ? ' time' : ' times') }; }))));
    if (ck && tot.length) {
      var last = tot[tot.length - 1], lo = Math.min.apply(null, last), w = last.indexOf(lo), second = last.slice().sort(function (a, b) { return a - b; })[1];
      var why = last.filter(function (v) { return v === lo; }).length > 1 ? 'A tie at ' + lo + ' after ' + nR + ' rounds.' : P[w] + ' won with the lowest total, ' + lo + (second != null ? ', ' + (second - lo) + ' ahead' : '') + '.';
      if (outs[w] && outs[w] === outs[most]) why += ' ' + P[w] + ' went out first ' + (outs[w] === 1 ? 'once' : outs[w] + ' times') + '.';
      else if (big && big.p !== w && big.v >= 40) why += ' ' + P[big.p] + ' was caught with ' + big.v + ' when ' + fcWild(big.r).toLowerCase() + ' were wild.';
      out.push(ck.foot(why, 'crown'));
    }
    return ui.wrap(out);
  });

  // ── Rook: every hand (the bid, trump, the bidder's cards, the nest and what was buried), and what decided it ──
  var RK = { r: ['Red', '#e0485a'], y: ['Yellow', '#f0b000'], g: ['Green', '#2bb36a'], b: ['Black', '#9a98ad'] };
  var RKINK = { r: '#d42a3c', y: '#d99a00', g: '#1d9a52', b: '#22202f' };
  var RKBIRD = '<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="#1d1b2e"><path d="M4 44 L20 36 L22 41 L8 50 Z"/>' +
    '<path d="M16 38 C18 28 28 23 38 24 C40 18 44 14 50 15 C54 16 56 19 56 21 L62 23 L56 25 C55 30 52 33 48 35 C46 42 38 47 28 47 C22 47 18 44 16 38 Z"/>' +
    '<path d="M27 47 L25 57 M25 57 L21 58 M25 57 L28 59 M35 46 L36 56 M36 56 L32 58 M36 56 L40 57" stroke="#1d1b2e" stroke-width="2.4" stroke-linecap="round" fill="none"/></g>' +
    '<path d="M22 36 C28 30 36 30 42 33 C36 34 30 37 26 41 Z" fill="#4a4660"/><circle cx="50" cy="20" r="2" fill="#fff"/><circle cx="50.4" cy="20" r="1" fill="#1d1b2e"/></svg>';
  HistView.css('hv-rook', [
    '.sx-rk{display:flex;flex-wrap:wrap;gap:3px;--cw:34px;}.sx-rk.fan{flex-wrap:nowrap;gap:0;}.sx-rk.fan .pcard+.pcard{margin-left:calc(var(--cw) * -.45);}',
    '.sx-rk .pcard{flex:none;box-shadow:0 2px 5px rgba(0,0,0,.4);}',
    '.sx-rk .pcard.rk{background:linear-gradient(160deg,#ffffff 0%,#fbf8f0 55%,color-mix(in srgb,var(--ink) 14%,#f4eedf) 100%);}',
    '.sx-rk .pcard.rk::before{content:"";position:absolute;inset:5%;border-radius:calc(var(--cw) * .07);border:calc(var(--cw) * .025) solid color-mix(in srgb,var(--ink) 45%,transparent);}',
    '.sx-rk .pcard.rk .ix{color:var(--ink);font-weight:900;font-size:calc(var(--cw) * .27);left:9%;top:6%;}',
    '.sx-rk .pcard.rk .big{font-size:calc(var(--cw) * .5);padding-left:calc(var(--cw) * .12);}',
    '.sx-rk .pcard.rk .lbl{bottom:7%;left:auto;right:9%;width:auto;font-size:calc(var(--cw) * .15);}',
    '.sx-rk .pcard.rook{background:linear-gradient(160deg,#fdfbf6,#e9e3d3);}',
    '.sx-rk .pcard.rook::before{content:"";position:absolute;inset:8% 10%;border-radius:calc(var(--cw) * .07);background:radial-gradient(circle at 50% 45%,#ffb340 0,#f07c1c 70%,#c9560c 100%);box-shadow:inset 0 0 0 calc(var(--cw) * .025) #1d1b2e;}',
    '.sx-rk .pcard.rook .big{inset:6% 8% 18%;}.sx-rk .pcard.rook .big svg{width:78%;height:auto;}',
    '.sx-rk .pcard.rook .lbl{color:#fff;bottom:11%;font-size:calc(var(--cw) * .15);letter-spacing:.1em;}',
    '.sx-rk .pcard.dim{filter:brightness(.6) saturate(.6);}',
    '.sx-rk .pcard.tr{box-shadow:0 0 0 2px #ffd166,0 2px 5px rgba(0,0,0,.4);}'
  ].join(''));
  function rkPts(c) { return c === 'rook' ? 20 : 0; }
  function rkCard(id, trump) {
    var Kt = window.Kit, n;
    if (id === 'rook') n = Kt.cardFace({ html: RKBIRD, label: 'Rook', cls: 'rook', aria: 'The Rook' });
    else {
      var col = id.charAt(0), r = +id.slice(1), p = r === 1 ? 15 : r === 14 || r === 10 ? 10 : r === 5 ? 5 : 0;
      n = Kt.cardFace({ rank: String(r), corner: false, color: RKINK[col] || '#333', label: p ? p + '' : '', cls: 'rk', aria: (RK[col] || [''])[0] + ' ' + r });
      n.insertAdjacentHTML('afterbegin', '<span class="ix">' + r + '</span>');
    }
    if (trump && (id === 'rook' || id.charAt(0) === trump)) n.classList.add('tr');
    return n;
  }
  function rkRow(list, o) {
    o = o || {}; var box = el('div', { class: 'sx-rk' + (o.fan ? ' fan' : '') });
    if (o.w) box.style.setProperty('--cw', o.w + 'px');
    String(list || '').split('.').filter(Boolean).forEach(function (id) { var c = rkCard(id, o.trump); if (o.dim && o.dim(id)) c.classList.add('dim'); box.appendChild(c); });
    return box;
  }
  function rkVal(id) { if (id === 'rook') return 20; var r = +id.slice(1); return r === 1 ? 15 : r === 14 || r === 10 ? 10 : r === 5 ? 5 : 0; }
  R('rook', function (e, ui) {
    var d = e.dt; if (!d || !d.h || !d.h.length) return null;
    var ck = HistView.ck, pl = d.pl || [], T = [pl[0] + ' & ' + pl[2], pl[1] + ' & ' + pl[3]], out = [];
    var sc = ck ? ck.scoresOf(e) : [], tot = ck ? ck.cum(sc, 2) : [];
    var rk = d.rook || [], hb = d.h.reduce(function (a, h) { return h.bid > a.bid ? h : a; }, d.h[0]);
    var rkTop = rk.length ? rk.indexOf(Math.max.apply(null, rk)) : -1, sets = d.h.filter(function (h) { return !h.m; }).length;
    out.push(ui.stats([['Hands', d.h.length, d.target ? 'played to ' + d.target : ''], ['Highest bid', hb.bid, pl[hb.b] + (hb.m ? ', made it' : ', went set')],
      rkTop >= 0 && rk[rkTop] ? ['Rook caught', rk[rkTop] + '×', pl[rkTop]] : null, ['Bids set', sets, 'of ' + d.h.length]]));
    if (ck) {
      var panel = el('div', { class: 'hv' });
      var show = function (i) {
        var h = d.h[i], bt = h.b % 2, took = [h.c0, h.c1], tr = RK[h.t] || ['?', '#888'], kids = [], pts = sc[i] || [], after = h.s ? String(h.s).split('.').map(Number) : tot[i] || [];
        kids.push(ck.head('<b>Hand ' + (i + 1) + '</b> · ' + ui.esc(short(pl[h.b], 10)) + ' bid ' + h.bid, h.m ? 'Made it with ' + took[bt] : 'Set: took ' + took[bt], h.m ? 'good' : 'bad'));
        kids.push(el('div', { class: 'sx-row2', style: { color: 'rgba(255,255,255,.85)' } }, [el('span', { class: 'sx-dot', style: { background: tr[1], width: '14px', height: '14px' } }), document.createTextNode(tr[0] + ' was trump' + (h.rk >= 0 ? ' · the Rook went to ' + pl[h.rk] : ''))]));
        var w = h.w ? String(h.w).split('.').map(Number) : null, bs = h.bs ? String(h.bs).split('.').map(Number) : null;
        if (w || bs) kids.push(ck.plates(pl.map(function (x, p) {
          return { n: short(x, 9), v: bs ? (bs[p] ? bs[p] : 'Pass') : w[p], s: bs ? 'last bid' : 'tricks', s2: w ? (bs ? w[p] + (w[p] === 1 ? ' trick' : ' tricks') : '') : '', c: ui.color(p % 2), cls: p === h.b ? (h.m ? 'good' : 'bad') : '' };
        })));
        kids.push(ck.plates([0, 1].map(function (t) {
          return { n: T[t], v: pts[t] != null ? (pts[t] > 0 ? '+' : '') + pts[t] : '–', s: 'took ' + took[t] + ' of 180', s2: 'score ' + (after[t] != null ? after[t] : ''), c: ui.color(t), cls: t === bt ? (h.m ? 'good' : 'bad') : '' };
        })));
        if (h.bh) {
          kids.push(ck.grp(short(pl[h.b], 12) + "'s cards after the nest", rkRow(h.bh, { w: 27, trump: h.t }), 'Trump cards ringed'));
          kids.push(el('div', { class: 'hvc-pair' }, [ck.grp('The nest', rkRow(h.ne, { w: 28 })), ck.grp('Buried', rkRow(h.bu, { w: 28 }), String(h.bu || '').split('.').filter(Boolean).reduce(function (a, id) { return a + rkVal(id); }, 0) + ' points, to whoever won the last trick' + (h.lt != null && pl[h.lt] ? ' (' + short(pl[h.lt], 10) + ')' : ''))]));
          if (h.yh) kids.push(ck.grp(short(pl[0], 12) + "'s cards", rkRow(h.yh, { w: 27, trump: h.t })));
        } else if (h.n) kids.push(el('div', { class: 'hvc-mini', text: 'The nest held ' + h.n + ' points.' }));
        panel.innerHTML = ''; panel.appendChild(ck.felt(['#1c5a8a', '#123d61', '#0b2a45'], kids));
      };
      var items = d.h.map(function (h, i) { return { t: String(i + 1), c: ui.color(h.b % 2), ring: !h.m, title: 'Hand ' + (i + 1) + ': ' + pl[h.b] + ' bid ' + h.bid + (h.m ? ', made' : ', set') }; });
      out.push(ui.section('Every hand · tap one', [ck.road(items, d.h.length - 1, show), panel, ck.key([['Bid by ' + T[0], ui.color(0)], ['Bid by ' + T[1], ui.color(1)], sets ? ['Went set', 'ring'] : null])], { icon: 'cards' }));
    }
    var rows = d.h.map(function (h, i) {
      var bt = h.b % 2, took = bt ? h.c1 : h.c0, tr = RK[h.t] || ['?', '#888'];
      return [{ th: 1, t: String(i + 1) }, { t: String(h.bid), c: 'bid' }, { t: short(pl[h.b], 8), style: { color: ui.color(bt) } },
        { html: '<span class="sx-dot" style="background:' + tr[1] + '"></span>' + tr[0] }, { t: String(took) },
        { t: h.m ? 'Made' : 'Set', c: h.m ? 'hit' : 'miss' }];
    });
    out.push(ui.section('Hand by hand', [grid([{ t: '' }, { t: 'Bid' }, { t: 'Won by' }, { t: 'Trump' }, { t: 'Took' }, { t: '' }], rows),
      el('p', { class: 'sx-legend', text: 'Took = points the bidding team captured (180 in the deck).' })]));
    var won = [0, 0]; d.h.forEach(function (h) { won[h.b % 2]++; });
    out.push(ui.section('Teams', ui.table(['', 'Bids won', 'Made', 'Set'], [0, 1].map(function (t) { return [short(T[t], 16), won[t], (d.made || [])[t] || 0, (d.set || [])[t] || 0]; }))));
    var fin = (e.players || []).map(function (p) { return p.score; }), lh = d.h[d.h.length - 1];
    if (ck && fin.length === 2 && fin[0] != null) {
      var wt = fin[0] > fin[1] ? 0 : 1, lbt = lh.b % 2;
      var how = lbt === wt ? (lh.m ? ' by making a bid of ' + lh.bid : '') : lh.m ? '' : ' when ' + pl[lh.b] + ' went set on ' + lh.bid;
      out.push(ck.foot(T[wt] + ' passed ' + (d.target || 500) + ' in hand ' + d.h.length + how + ', winning ' + fin[wt] + ' to ' + fin[1 - wt] + '.', 'flag'));
    }
    return ui.wrap(out);
  });

  // ── Phase 10: the phase ladder, skips, the last phases laid down ───────────
  var P10 = { r: '#e0253a', b: '#1e6fdc', g: '#169a4c', y: '#f0b000' };
  function p10card(code) {
    if (code === 'w') return el('span', { class: 'sx-c solid', style: { background: '#1d1b2e', 'font-size': '.62rem' }, text: 'W', title: 'Wild' });
    if (code === 's') return el('span', { class: 'sx-c solid', style: { background: '#26335c', 'font-size': '.62rem' }, text: 'S', title: 'Skip' });
    var m = /^([rbgy])(\d+)$/.exec(code); if (!m) return null;
    return el('span', { class: 'sx-c solid', style: { background: P10[m[1]] }, text: m[2] });
  }
  R('phase10', function (e, ui) {
    var d = e.dt; if (!d || !d.made || !d.made.length) return null;
    var P = names(e), out = [];
    var rows = P.map(function (x, i) {
      return [{ th: 1, c: 'nm', t: short(x, 9) }].concat(d.made.map(function (m, r) {
        var h = d.h[r], ph = h ? nums(h.a)[i] : '', ok = m.charAt(i) === '1', went = h && h.o === i;
        return { t: ph, c: ok ? 'hit' : 'miss', title: 'Phase ' + ph + (ok ? ' made' : ' missed') + (went ? ', went out' : ''), style: went ? { 'box-shadow': 'inset 0 0 0 2px #ffd75e' } : null };
      }));
    });
    out.push(ui.section('Phase ladder', [grid([{ t: 'Hand' }].concat(d.made.map(function (m, r) { return { t: String(r + 1) }; })), rows),
      legend([['rgba(34,165,90,.85)', 'Made the phase'], ['rgba(194,48,75,.5)', 'Missed'], ['#ffd75e', 'Went out (ring)']])], { icon: 'target' }));
    if (d.laid && d.laid.some(Boolean)) {
      var felt = el('div', { class: 'sx-felt', style: { '--f1': '#2c3a7a', '--f2': '#151d48' } });
      P.forEach(function (x, i) {
        var lay = d.laid[i]; var lastH = d.h[d.h.length - 1], ph = lastH ? nums(lastH.a)[i] : '';
        var row = el('div', { class: 'sx-cards' });
        if (lay) lay.split('|').forEach(function (g) { var gg = el('div', { class: 'sx-grp' }); g.split(' ').forEach(function (c) { var n = p10card(c); if (n) gg.appendChild(n); }); row.appendChild(gg); });
        felt.appendChild(el('div', { class: 'sx-prow' }, [el('div', { class: 'hd' }, [el('span', { text: x }), el('small', { text: 'Phase ' + ph }), el('b', { text: lay ? 'Down' : 'Not down' })]), lay ? row : null]));
      });
      out.push(ui.section('Last hand on the table', felt, { icon: 'cards' }));
    }
    if (d.skips) {
      var list = [];
      d.skips.forEach(function (r, a) { nums(r).forEach(function (v, b) { if (v) list.push({ t: P[a] + ' skipped ' + P[b] + (v > 1 ? ' ×' + v : ''), v: v, c: a }); }); });
      list.sort(function (x, y) { return y.v - x.v; });
      if (list.length) out.push(ui.section('Skips', ui.log(list.slice(0, 8).map(function (x) { return { t: x.t, c: x.c }; }))));
    }
    return ui.wrap(out);
  });

  // ── Sandlot: scoreboard, box score, scoring plays (or the Derby board) ─────
  function sbNode(d) {
    var aw = 1 - d.home, order = [aw, d.home], n = 0;
    order.forEach(function (t) { n = Math.max(n, nums(d.tm[t].l).length); });
    n = Math.max(n, d.inn || 0);
    var win = d.tm[0].r > d.tm[1].r ? 0 : 1;
    var t = el('table'), hr = el('tr', null, [el('th', { text: 'FINAL' })]);
    for (var i = 1; i <= n; i++) hr.appendChild(el('th', { text: String(i) }));
    ['R', 'H', 'E'].forEach(function (x) { hr.appendChild(el('th', { text: x })); });
    t.appendChild(hr);
    order.forEach(function (tm, row) {
      var T = d.tm[tm], l = nums(T.l), tr = el('tr', { class: tm === win ? 'w' : '' }, [el('td', { class: 'tm', style: { '--c': T.c || '#fff' }, html: '<i></i>' + HistView.ui.esc(T.n) })]);
      for (var k = 0; k < n; k++) tr.appendChild(el('td', { text: l[k] == null ? (row === 1 && k === n - 1 && !d.wo ? 'X' : '') : String(l[k]) }));
      [T.r, T.h, T.e].forEach(function (v) { tr.appendChild(el('td', { class: 'rhe', text: String(v == null ? '' : v) })); });
      t.appendChild(tr);
    });
    return el('div', { class: 'sx-sb' }, [el('div', { class: 'in' }, [t])]);
  }
  R('sandlot', function (e, ui) {
    var d = e.dt; if (!d || !d.tm) return null;
    var out = [], ck = HistView.ck;
    if (d.derby) {
      d.tm.forEach(function (T, t) {
        var rows = (T.s || []).map(function (s) { var a = s.split('|'); return [a[0], a[1], { t: a[2], c: +a[2] ? 'hi' : '' }, a[3], +a[4] ? a[4] + ' ft' : '–']; });
        out.push(ui.section(T.n + (d.tm.length > 1 && t === d.win ? ' · winner' : ''), ui.table(['Slugger', 'Card HR', 'HR', 'Outs', 'Long'], rows, { cls: 'sx-box' }), { icon: t === d.win ? 'trophy' : null }));
      });
      var best = null; d.tm.forEach(function (T) { (T.s || []).forEach(function (s) { var a = s.split('|'); if (!best || +a[4] > +best[4]) best = a; }); });
      if (best && +best[4]) out.push(ui.stats([['Longest home run', best[4] + ' ft', best[0]], d.off ? ['Swing-off', 'Yes', 'to break a tie'] : null]));
      return ui.wrap(out);
    }
    var aw = 1 - d.home, win = d.tm[0].r > d.tm[1].r ? 0 : 1, T0 = d.tm[aw], T1 = d.tm[d.home];
    // big numbers: hits, homers, errors, the star bat
    var hrs = [0, 0], star = null;
    d.tm.forEach(function (T, t) { (T.b || []).forEach(function (s) { var a = s.split('|'), v = a.slice(2, 9).map(Number); hrs[t] += v[3]; var sc = v[2] * 2 + v[3] * 4 + v[4] * 2 + v[1]; if (!star || sc > star.sc) star = { sc: sc, n: a[0], t: t, h: v[2], ab: v[0], hr: v[3], rbi: v[4] }; }); });
    var innN = Math.max(nums(T0.l).length, nums(T1.l).length);
    out.push(ui.stats([['Hits', T0.h + ' – ' + T1.h, short(T0.n, 10) + ' first'], ['Home runs', hrs[aw] + ' – ' + hrs[d.home]], ['Errors', T0.e + ' – ' + T1.e],
      star && star.h ? ['Star bat', star.h + ' for ' + star.ab, star.n + (star.hr ? ', ' + star.hr + ' HR' : '') + (star.rbi ? ', ' + star.rbi + ' RBI' : '')] : null,
      innN > (d.inn || 9) ? ['Extra innings', innN] : null]));
    // how it ended: the diamond at the last play
    if (d.end) {
      var E = d.end, b = String(E.b || '000'), W = 320, H = 190, cx = 160, hy = 168, s = 62;
      var bx = [[cx + s, hy - s], [cx, hy - 2 * s], [cx - s, hy - s]];
      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="The bases at the last play">' +
        '<rect width="' + W + '" height="' + H + '" fill="#2f7a3a"/>' +
        '<path d="M' + cx + ' ' + (hy + 12) + ' L' + (cx - 150) + ' ' + (hy - 140) + ' A 210 210 0 0 1 ' + (cx + 150) + ' ' + (hy - 140) + ' Z" fill="#36893f"/>' +
        '<path d="M' + cx + ' ' + (hy + 8) + ' L' + (cx + s + 22) + ' ' + (hy - s) + ' L' + cx + ' ' + (hy - 2 * s - 22) + ' L' + (cx - s - 22) + ' ' + (hy - s) + ' Z" fill="#b9804a"/>' +
        '<path d="M' + cx + ' ' + (hy - 6) + ' L' + (cx + s - 14) + ' ' + (hy - s) + ' L' + cx + ' ' + (hy - 2 * s + 14) + ' L' + (cx - s + 14) + ' ' + (hy - s) + ' Z" fill="#3f9447"/>' +
        '<circle cx="' + cx + '" cy="' + (hy - s) + '" r="9" fill="#b9804a"/>' +
        '<path d="M' + cx + ' ' + hy + ' L' + (cx + s) + ' ' + (hy - s) + ' L' + cx + ' ' + (hy - 2 * s) + ' L' + (cx - s) + ' ' + (hy - s) + ' Z" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.5"/>';
      bx.forEach(function (p, k) { var on = b.charAt(k) === '1'; svg += '<rect x="' + (p[0] - 8) + '" y="' + (p[1] - 8) + '" width="16" height="16" transform="rotate(45 ' + p[0] + ' ' + p[1] + ')" fill="' + (on ? '#ffd166' : '#fbf3dc') + '" stroke="' + (on ? '#fff' : 'rgba(0,0,0,.25)') + '" stroke-width="' + (on ? 2 : 1) + '"/>' + (on ? '<circle cx="' + p[0] + '" cy="' + (p[1] - 16) + '" r="6" fill="' + (d.tm[E.h ? d.home : aw].c || '#fff') + '" stroke="#fff" stroke-width="1.5"/>' : ''); });
      svg += '<path d="M' + (cx - 7) + ' ' + (hy - 4) + ' h14 v6 l-7 6 l-7 -6 z" fill="#fbf3dc"/>';
      var outs = Math.min(3, E.o || 0);
      if (!d.wo && E.o === 0 && !/\d/.test(b.replace(/0/g, ''))) outs = 3;   // older records: the side was already reset
      svg += '<rect x="10" y="10" width="92" height="44" rx="8" fill="rgba(10,26,19,.82)"/><text x="20" y="28" font-size="11" font-weight="900" fill="#fbf3dc" font-family="system-ui">' + (E.h ? 'BOT ' : 'TOP ') + E.i + '</text>';
      for (var k = 0; k < 3; k++) svg += '<circle cx="' + (24 + k * 14) + '" cy="42" r="5" fill="' + (k < outs ? '#ffb84a' : 'rgba(251,243,220,.2)') + '"/>';
      svg += '<text x="70" y="45" font-size="9" font-weight="800" fill="rgba(251,243,220,.7)" font-family="system-ui">OUTS</text>';
      svg += '<rect x="' + (W - 112) + '" y="10" width="102" height="44" rx="8" fill="rgba(10,26,19,.82)"/>';
      [aw, d.home].forEach(function (t, r) { svg += '<circle cx="' + (W - 100) + '" cy="' + (24 + r * 18) + '" r="4" fill="' + (d.tm[t].c || '#fff') + '"/><text x="' + (W - 90) + '" y="' + (28 + r * 18) + '" font-size="11" font-weight="800" fill="' + (t === win ? '#ffd166' : '#fbf3dc') + '" font-family="system-ui">' + ui.esc(short(d.tm[t].n, 8)) + '</text><text x="' + (W - 16) + '" y="' + (28 + r * 18) + '" text-anchor="end" font-size="13" font-weight="900" fill="' + (t === win ? '#ffd166' : '#fbf3dc') + '" font-family="system-ui">' + d.tm[t].r + '</text>'; });
      svg += '</svg>';
      out.push(ui.section('How it ended', [ui.picture(svg, { max: 420 }), E.t ? el('p', { class: 'sx-play', text: '“' + E.t + '”' }) : null], { icon: 'flag' }));
    }
    out.push(ui.section('Scoreboard', sbNode(d), { icon: 'trophy' }));
    // every half-inning: the result of each play, and how the runs scored
    if (ck && d.hx && d.hx.length) {
      var OC = { S: ['1B', 'h'], D: ['2B', 'h'], T: ['3B', 'h'], HR: ['HR', 'hr'], BH: ['Bunt hit', 'h'], K: ['K', 'o'], GB: ['Ground out', 'o'], FB: ['Fly out', 'o'], LD: ['Line out', 'o'], PU: ['Pop out', 'o'],
        DP: ['Double play', 'o'], SH: ['Sac bunt', 'o'], BO: ['Bunt out', 'o'], CS: ['Caught stealing', 'o'], BB: ['Walk', 'w'], IBB: ['Int. walk', 'w'], HBP: ['Hit by pitch', 'w'], E: ['Error', 'w'], SB: ['Stolen base', 'w'] };
      var panel = el('div', { class: 'hv' });
      var show = function (i) {
        var h = d.hx[i], bt = h.h ? d.home : aw, kids = [];
        kids.push(ck.head('<b>' + (h.h ? 'Bottom ' : 'Top ') + h.i + '</b> · ' + ui.esc(d.tm[bt].n) + ' batting', h.r ? '+' + h.r + (h.r === 1 ? ' run' : ' runs') : 'No runs', h.r ? 'good' : ''));
        var row = el('div', { class: 'sx-pas' });
        String(h.o || '').split(',').filter(Boolean).forEach(function (x) { var m = /^([A-Z]+)(\+(\d))?$/.exec(x) || [], o = OC[m[1]] || [m[1] || x, 'o']; row.appendChild(el('span', { class: 'sx-pa ' + o[1], text: o[0] + (m[3] ? ' +' + m[3] : '') })); });
        kids.push(row);
        if (h.t) h.t.split(' / ').forEach(function (t) { kids.push(el('p', { class: 'sx-play', text: '“' + t + '”' })); });
        panel.innerHTML = ''; panel.appendChild(ck.felt(['#2f7a3a', '#1f5a2a', '#15401d'], kids));
      };
      var items = d.hx.map(function (h) { var bt = h.h ? d.home : aw; return { t: (h.h ? 'B' : 'T') + h.i, c: h.r ? d.tm[bt].c : null, dk: h.r && /^#(f|e|d)/i.test(d.tm[bt].c || ''), ring: /HR/.test(h.o || ''), title: (h.h ? 'Bottom ' : 'Top ') + h.i + (h.r ? ': ' + h.r + ' runs' : '') }; });
      var start = 0; d.hx.forEach(function (h, i) { if (h.r >= (d.hx[start].r || 0)) start = i; });
      out.push(ui.section('Every half-inning · tap one', [ck.road(items, start, show), panel,
        ck.key([[short(T0.n, 12) + ' scored', T0.c], [short(T1.n, 12) + ' scored', T1.c], ['Home run', 'ring']])], { icon: 'chart' }));
    }
    [aw, d.home].forEach(function (t) {
      var T = d.tm[t];
      if (!T || !T.b || !T.b.length) return;
      var tot = [0, 0, 0, 0, 0, 0, 0];
      var rows = T.b.map(function (s) {
        var a = s.split('|'), v = a.slice(2, 9).map(Number); v.forEach(function (x, k) { tot[k] += x; });
        return [short(a[0], 15) + (a[1] ? ' ' + a[1] : '') + (a[9] === '1' ? ' (out)' : '')].concat(v.map(function (x, k) { return k === 2 && x >= 2 || k === 3 && x ? { t: x, c: 'hi' } : x; }));
      });
      var nodes = [ui.table(['', 'AB', 'R', 'H', 'HR', 'RBI', 'BB', 'K'], rows, { foot: ['Team'].concat(tot), cls: 'sx-box' })];
      if (T.p && T.p.length) nodes.push(ui.table(['Pitching', 'IP', 'H', 'R', 'BB', 'K', 'HR', 'PC'], T.p.map(function (s) { var a = s.split('|'); return [short(a[0], 15), Math.floor(a[1] / 3) + '.' + a[1] % 3].concat(a.slice(2)); })));
      out.push(ui.section('Box score: ' + T.n, nodes));
    });
    if (d.plays && d.plays.length && !(d.hx && d.hx.length)) {
      out.push(ui.section('Scoring plays', ui.log(d.plays.map(function (p) {
        var bt = p.h ? d.home : aw;
        return { b: (p.h ? 'Bot ' : 'Top ') + p.i, t: p.t + (p.r > 1 ? ' (' + p.r + ' runs)' : ''), c: d.tm[bt].c };
      })), { icon: 'flag' }));
    }
    if (ck) {
      var W2 = d.tm[win], L2 = d.tm[1 - win], la = nums(T0.l), lh = nums(T1.l), run = [0, 0], go = null;
      // the half-inning where the winner went ahead for good
      for (var ii = 0; ii < innN; ii++) [0, 1].forEach(function (hh) {
        var t = hh ? d.home : aw, v = (hh ? lh : la)[ii]; if (v == null) return;
        var before = run[win] > run[1 - win]; run[t] += v;
        var now = run[win] > run[1 - win];
        if (now && !before) go = { i: ii + 1, h: hh }; else if (!now) go = null;
      });
      var why = W2.n + ' won ' + W2.r + '–' + L2.r + (d.wo ? ' on a walk-off in the bottom of the ' + ord(innN) : innN > (d.inn || 9) ? ' in ' + innN + ' innings' : '') + '.';
      if (go && !d.wo) {
        var gh = (d.hx || []).filter(function (h) { return h.i === go.i && h.h === go.h; })[0];
        why += ' They took the lead for good in the ' + (go.h ? 'bottom' : 'top') + ' of the ' + ord(go.i) + (gh && gh.t ? ': ' + gh.t.split(' / ')[0] : '.');
      }
      out.push(ck.foot(why, 'trophy'));
    }
    return ui.wrap(out);
  });
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  HistView.css('hv-sandlot', '.sx-play{margin:0;font-size:.82rem;font-weight:700;font-style:italic;color:rgba(255,255,255,.85);line-height:1.35;}' +
    '.hv-sec>.sx-play{color:var(--text-2);}' +
    '.sx-pas{display:flex;flex-wrap:wrap;gap:4px;}.sx-pa{font-size:.72rem;font-weight:900;padding:4px 8px;border-radius:7px;background:rgba(0,0,0,.28);color:rgba(255,255,255,.8);}' +
    '.sx-pa.h{background:#fbf3dc;color:#17382b;}.sx-pa.hr{background:#ffd166;color:#3a2600;}.sx-pa.w{background:rgba(120,180,255,.3);color:#e3efff;}');

  // ── Scorecard (any game): the race, leader changes, biggest rounds ─────────
  // Works from the saved rounds, so older games get it too.
  R(['scorecard', 'sc', 'cs_sc'], function (e, ui) {
    var sc = e.rounds && e.rounds.scores, P = names(e);
    if (!sc || !sc.length || !P.length) return null;
    sc = sc.map(function (r) { return Array.isArray(r) ? r : []; });
    var low = !!e.lowWins, n = P.length, run = P.map(function () { return 0; }), cum = [];
    sc.forEach(function (r) { r.forEach(function (v, i) { run[i] += Number(v) || 0; }); cum.push(run.slice()); });
    var out = [];
    function leader(c) { var b = null, w = -1, tie = false; c.forEach(function (v, i) { if (b === null || (low ? v < b : v > b)) { b = v; w = i; tie = false; } else if (v === b) tie = true; }); return tie ? -1 : w; }
    var changes = 0, prev = -1, ledRounds = P.map(function () { return 0; });
    cum.forEach(function (c) { var l = leader(c); if (l >= 0) { ledRounds[l]++; if (prev >= 0 && l !== prev) changes++; prev = l; } });
    var big = null; sc.forEach(function (r, ri) { r.forEach(function (v, i) { if (v == null) return; v = Number(v) || 0; if (!big || (low ? v < big.v : v > big.v)) big = { v: v, i: i, r: ri + 1 }; }); });
    var tight = null; if (n > 1) cum.forEach(function (c, ri) { var s = c.slice().sort(function (a, b) { return low ? a - b : b - a; }); var gap = Math.abs(s[0] - s[1]); if (ri >= 1 && (tight === null || gap < tight.g)) tight = { g: gap, r: ri + 1 }; });
    out.push(ui.stats([
      n > 1 ? ['Lead changes', changes] : null,
      big ? [low ? 'Best round' : 'Biggest round', ui.num(big.v), P[big.i] + ', round ' + big.r] : null,
      tight && sc.length > 2 ? ['Closest after', 'Round ' + tight.r, tight.g === 0 ? 'tied' : 'gap of ' + ui.num(tight.g)] : null,
      ['Rounds', sc.length]
    ]));
    if (n > 1 && sc.length >= 2) {
      out.push(ui.section('Rounds in the lead', ui.bars(P.map(function (x, i) { return { label: x, value: ledRounds[i], max: sc.length, color: ui.color(i), text: ledRounds[i] + ' of ' + sc.length }; }))));
      out.push(ui.section('Average per round', ui.bars(P.map(function (x, i) { var a = run[i] / sc.length; return { label: x, value: Math.abs(a), color: ui.color(i), text: (Math.round(a * 10) / 10).toLocaleString('en-US') }; }))));
    }
    return ui.wrap(out);
  });

  // ── Axis & Allies score keeper: victory cities and the IPC tally ───────────
  var AA = { ger: ['Germany', '#8e959a', 'axis', 'GER'], sov: ['Soviet Union', '#c8434b', 'allies', 'USSR'], jpn: ['Japan', '#e0922b', 'axis', 'JPN'], uk: ['United Kingdom', '#c4a06a', 'allies', 'UK'], usa: ['United States', '#7f9f45', 'allies', 'USA'] };
  var AORDER = ['sov', 'ger', 'uk', 'jpn', 'usa'], ASTART = { sov: 24, ger: 41, uk: 31, jpn: 30, usa: 42 };
  var ACITIES = [['Berlin', 'a'], ['Paris', 'a'], ['Rome', 'a'], ['Tokyo', 'a'], ['Shanghai', 'a'], ['Manila', 'a'], ['Moscow', 'l'], ['Leningrad', 'l'], ['London', 'l'], ['Calcutta', 'l'], ['Washington', 'l'], ['San Francisco', 'l'], ['Honolulu', 'l']];
  R(['axisallies-score'], function (e, ui) {
    var d = e.dt || {}, pw = d.pw || null, meta = e.powers || [];
    if (!pw && !meta.length) return null;
    var out = [], by = {}; meta.forEach(function (m) { if (m && m.k) by[m.k] = m.by; });
    if (d.vc) {
      var ax = d.vc.split('').filter(function (c) { return c === 'a'; }).length, al = d.vc.length - ax;
      var box = el('div', { class: 'sx-vc' });
      ACITIES.forEach(function (c, i) { var h = d.vc.charAt(i); box.appendChild(el('span', { class: h + (h !== c[1] ? ' flip' : ''), title: (h === 'a' ? 'Axis' : 'Allies') + (h !== c[1] ? ', changed hands' : '') }, [document.createTextNode(c[0])])); });
      out.push(ui.section('Victory cities at the end', [
        el('div', { class: 'sx-row2' }, [el('span', { class: 'sx-tag', style: { background: '#4b5054', color: '#fff' }, text: 'Axis ' + ax + (d.need ? ' / ' + d.need[0] : '') }), el('span', { class: 'sx-tag', style: { background: '#56702c', color: '#fff' }, text: 'Allies ' + al + (d.need ? ' / ' + d.need[1] : '') }), el('small', { text: d.need ? 'held / needed' : '' })]),
        box, d.vc.split('').some(function (h, i) { return h !== ACITIES[i][1]; }) ? legend([['#ffd75e', 'Gold edge: changed hands']]) : null], { icon: 'flag' }));
    }
    var rows = AORDER.map(function (k) {
      var p = pw ? pw.filter(function (x) { return x.k === k; })[0] || {} : meta.filter(function (x) { return x.k === k; })[0] || {};
      return [{ t: AA[k][3] }, short(by[k] || '', 9), p.inc != null ? p.inc : '–', p.bank != null ? p.bank : '–', pw ? (p.sp || 0) : '–', pw ? { t: p.cap ? 'Held' : 'Lost', c: p.cap ? 'good' : 'bad' } : '–'];
    });
    out.push(ui.section('IPC tally', ui.table(['Power', 'Player', 'Income', 'Bank', 'Spent', 'Capital'], rows, { cls: 'sx-box' }), { icon: 'coins' }));
    if (d.ih && d.ih.length) {
      var hist = [AORDER.map(function (k) { return ASTART[k]; })].concat(d.ih.map(nums));
      var series = AORDER.map(function (k, j) { return { name: AA[k][3], color: AA[k][1], pts: hist.map(function (r) { return r[j]; }) }; });
      out.push(ui.section('Income by round', ui.picture(lineChart(series, { aria: 'Income by round', xl: function (i) { return i === 0 ? 'Start' : i; } }), { frame: 'dark', max: 420 }), { icon: 'chart' }));
    }
    if (d.bat) out.push(ui.stats([['Battles rolled', d.bat], ['Dice thrown', ui.num(d.dice)]]));
    return ui.wrap(out);
  });
})();
