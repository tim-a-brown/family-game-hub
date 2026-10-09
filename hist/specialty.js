'use strict';
// History views: specialty
(function () {
  if (!window.HistView) return;
  var R = HistView.register;

  // ── Shared bits for this file ─────────────────────────────────────────────
  function names(e) { return (e.players || []).map(function (p) { return p.name; }); }
  function short(n, k) { n = String(n || ''); k = k || 8; return n.length > k ? n.slice(0, k - 1) + '…' : n; }
  function nums(s) { return String(s == null ? '' : s).split(',').map(function (x) { return x === '' ? null : +x; }); }
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
    '.sx-grid td{min-width:28px;height:26px;padding:0 4px;text-align:center;border-radius:6px;font-weight:800;color:var(--text);background:rgba(255,255,255,.05);white-space:nowrap;}',
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
    '.sx-vc{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:5px;}',
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

  // ── Wizard: trump and bid/took every round ─────────────────────────────────
  var SUIT = { s: ['♠', '#1d1b2e', 'Spades'], h: ['♥', '#d81e3a', 'Hearts'], d: ['♦', '#d81e3a', 'Diamonds'], c: ['♣', '#1d1b2e', 'Clubs'] };
  R('wizard', function (e, ui) {
    var d = e.dt; if (!d || !d.r || !d.r.length) return null;
    var P = names(e), n = P.length;
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
    var out = [ui.section('Bid / took each round', [grid(head, rows), legend([['rgba(34,165,90,.85)', 'Made the bid'], ['rgba(194,48,75,.5)', 'Missed']])], { icon: 'target' })];
    // exact bids and best streak per player
    var bars = P.map(function (x, i) {
      var hits = 0, run = 0, best = 0;
      d.r.forEach(function (r) { var b = nums(r.b)[i], k = nums(r.k)[i]; if (b === k) { hits++; run++; best = Math.max(best, run); } else run = 0; });
      return { label: x, value: hits, max: d.r.length, color: ui.color(i), text: hits + ' of ' + d.r.length + (best >= 2 ? ' · ' + best + ' in a row' : '') };
    });
    out.push(ui.section('Bids made', ui.bars(bars)));
    var tc = { s: 0, h: 0, d: 0, c: 0, x: 0 }; d.r.forEach(function (r) { if (SUIT[r.t]) tc[r.t]++; else tc.x++; });
    var wz = d.wiz && d.wiz.length ? d.wiz : null;
    out.push(ui.section('Trump suits', ui.chips(['s', 'h', 'd', 'c'].map(function (k) { return { t: SUIT[k][2] + ' ' + tc[k] }; }).concat(tc.x ? [{ t: 'No trump ' + tc.x }] : [])
      .concat(wz && Math.max.apply(null, wz) ? [{ t: 'Most Wizards played: ' + P[wz.indexOf(Math.max.apply(null, wz))] + ' (' + Math.max.apply(null, wz) + ')', on: 1 }] : []))));
    return ui.wrap(out);
  });

  // ── Flip 7: the final table, best hands, busts ─────────────────────────────
  var F7C = ['#2b2b33', '#9a7b6c', '#8f9a14', '#e0306f', '#14998c', '#3a9a3e', '#8e2bb0', '#e0352f', '#f0561d', '#c48d00', '#3346b0', '#0093a8', '#5d7484'];
  function f7card(code) {
    var m;
    if (/^\d+!?$/.test(code)) { var v = parseInt(code, 10); return el('span', { class: 'sx-c' + (/!$/.test(code) ? ' dup' : ''), style: { color: F7C[v] || '#222' }, text: String(v), title: /!$/.test(code) ? 'Duplicate ' + v + ': bust' : String(v) }); }
    if ((m = /^\+(\d+)$/.exec(code))) return el('span', { class: 'sx-c solid', style: { background: '#f08400' }, text: '+' + m[1] });
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

  // ── Five Crowns: wilds by round, who went out, the final hands ─────────────
  var FC = { t: ['★', '#e3a400'], h: ['♥', '#d81e3a'], c: ['♣', '#178a4a'], s: ['♠', '#1d1b2e'], d: ['♦', '#1f62d0'] };
  var FCR = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  function fcCard(code, wildRank) {
    if (code === 'JK') return el('span', { class: 'sx-c solid wild', style: { background: '#6c3fd6', 'font-size': '.62rem' }, text: 'JK', title: 'Joker' });
    var m = /^(10|[3-9JQK])([thcsd])$/.exec(code); if (!m) return null;
    var s = FC[m[2]];
    return el('span', { class: 'sx-c' + (m[1] === wildRank ? ' wild' : ''), style: { color: s[1] }, html: m[1] + '<small>' + s[0] + '</small>' });
  }
  R(['five-crowns', 'fivecrowns', 'fivecrwns', 'fivecrownss-ai'], function (e, ui) {
    var d = e.dt; if (!d || d.out == null) return null;
    var P = names(e), out = [], nR = d.out.length;
    var strip = el('div', { class: 'sx-strip' });
    d.out.split('').forEach(function (o, i) {
      strip.appendChild(el('div', null, [el('span', { class: 'crown', text: FCR[i] }), el('small', { class: o === '-' ? 'none' : '', text: o === '-' ? '–' : short(P[+o], 8) })]));
    });
    out.push(ui.section('Wilds and who went out', strip, { icon: 'crown' }));
    if (d.fin && d.fin.length) {
      var wr = FCR[nR - 1], felt = el('div', { class: 'sx-felt' });
      P.forEach(function (x, i) {
        var f = d.fin[i]; if (!f) return;
        var row = el('div', { class: 'sx-cards' });
        String(f.g || '').split('|').filter(Boolean).forEach(function (g) { var gg = el('div', { class: 'sx-grp' }); g.split(' ').forEach(function (c) { var n = fcCard(c, wr); if (n) gg.appendChild(n); }); row.appendChild(gg); });
        if (f.l) { var lf = el('div', { class: 'sx-grp left' }); f.l.split(' ').forEach(function (c) { var n = fcCard(c, wr); if (n) lf.appendChild(n); }); row.appendChild(lf); }
        var wentOut = d.out.charAt(nR - 1) === String(i);
        felt.appendChild(el('div', { class: 'sx-prow' }, [el('div', { class: 'hd' }, [el('span', { text: x }), el('small', { text: wentOut ? 'Went out' : f.l ? 'Caught with' : 'All down' }), el('b', { text: f.p ? '+' + f.p : '0' })]), row]));
      });
      out.push(ui.section('Final round: ' + (FCR[nR - 1] === 'K' ? 'Kings' : FCR[nR - 1] + 's') + ' wild', [felt, legend([['#e7b416', 'Wild card'], ['rgba(220,40,60,.6)', 'Left in hand (counts against)']])], { icon: 'cards' }));
    }
    var outs = P.map(function (x, i) { return d.out.split('').filter(function (o) { return o === String(i); }).length; });
    out.push(ui.section('Went out first', ui.bars(P.map(function (x, i) { return { label: x, value: outs[i], max: nR, color: ui.color(i), text: outs[i] + (outs[i] === 1 ? ' time' : ' times') }; }))));
    return ui.wrap(out);
  });

  // ── Rook: every hand's bid, trump and result ───────────────────────────────
  var RK = { r: ['Red', '#e0485a'], y: ['Yellow', '#f0b000'], g: ['Green', '#2bb36a'], b: ['Black', '#9a98ad'] };
  R('rook', function (e, ui) {
    var d = e.dt; if (!d || !d.h || !d.h.length) return null;
    var pl = d.pl || [], T = [pl[0] + ' & ' + pl[2], pl[1] + ' & ' + pl[3]];
    var rows = d.h.map(function (h, i) {
      var bt = h.b % 2, took = bt ? h.c1 : h.c0, tr = RK[h.t] || ['?', '#888'];
      return [{ th: 1, t: String(i + 1) }, { t: String(h.bid), c: 'bid' }, { t: short(pl[h.b], 8), style: { color: ui.color(bt) } },
        { html: '<span class="sx-dot" style="background:' + tr[1] + '"></span>' + tr[0] }, { t: String(took) },
        { t: h.m ? 'Made' : 'Set', c: h.m ? 'hit' : 'miss' }];
    });
    var out = [ui.section('Hand by hand', [grid([{ t: '' }, { t: 'Bid' }, { t: 'Won by' }, { t: 'Trump' }, { t: 'Took' }, { t: '' }], rows),
      el('p', { class: 'sx-legend', text: 'Took = points the bidding team captured (180 in the deck).' })], { icon: 'cards' })];
    var won = [0, 0]; d.h.forEach(function (h) { won[h.b % 2]++; });
    out.push(ui.section('Teams', ui.table(['', 'Bids won', 'Made', 'Set'], [0, 1].map(function (t) { return [short(T[t], 16), won[t], (d.made || [])[t] || 0, (d.set || [])[t] || 0]; }))));
    var rk = d.rook || [], hb = d.h.reduce(function (a, h) { return h.bid > a.bid ? h : a; }, d.h[0]);
    var rkTop = rk.length ? rk.indexOf(Math.max.apply(null, rk)) : -1;
    out.push(ui.stats([['Highest bid', hb.bid, pl[hb.b]], ['Hands', d.h.length], rkTop >= 0 && rk[rkTop] ? ['Rook caught', rk[rkTop] + '×', pl[rkTop]] : null,
      ['Trump picks', (function () { var c = {}; d.h.forEach(function (h) { c[h.t] = (c[h.t] || 0) + 1; }); var k = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0]; return RK[k] ? RK[k][0] : ''; })(), 'most often']]));
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
    var out = [];
    if (d.derby) {
      d.tm.forEach(function (T, t) {
        var rows = (T.s || []).map(function (s) { var a = s.split('|'); return [a[0], a[1], { t: a[2], c: +a[2] ? 'hi' : '' }, a[3], +a[4] ? a[4] + ' ft' : '–']; });
        out.push(ui.section(T.n + (d.tm.length > 1 && t === d.win ? ' · winner' : ''), ui.table(['Slugger', 'Card HR', 'HR', 'Outs', 'Longest'], rows), { icon: t === d.win ? 'trophy' : null }));
      });
      var best = null; d.tm.forEach(function (T) { (T.s || []).forEach(function (s) { var a = s.split('|'); if (!best || +a[4] > +best[4]) best = a; }); });
      if (best && +best[4]) out.push(ui.stats([['Longest home run', best[4] + ' ft', best[0]], d.off ? ['Swing-off', 'Yes', 'to break a tie'] : null]));
      return ui.wrap(out);
    }
    out.push(ui.section('Scoreboard', sbNode(d), { icon: 'trophy' }));
    [1 - d.home, d.home].forEach(function (t) {
      var T = d.tm[t];
      if (!T || !T.b || !T.b.length) return;
      var tot = [0, 0, 0, 0, 0, 0, 0];
      var rows = T.b.map(function (s) {
        var a = s.split('|'), v = a.slice(2, 9).map(Number); v.forEach(function (x, k) { tot[k] += x; });
        return [short(a[0], 15) + (a[1] ? ' ' + a[1] : '') + (a[9] === '1' ? ' (out)' : '')].concat(v.map(function (x, k) { return k === 2 && x >= 2 || k === 3 && x ? { t: x, c: 'hi' } : x; }));
      });
      var nodes = [ui.table(['', 'AB', 'R', 'H', 'HR', 'RBI', 'BB', 'K'], rows, { foot: ['Team'].concat(tot), cls: 'sx-box' })];
      if (T.p && T.p.length) nodes.push(ui.table(['Pitching', 'IP', 'H', 'R', 'BB', 'K', 'HR', 'PC'], T.p.map(function (s) { var a = s.split('|'); return [short(a[0], 15), Math.floor(a[1] / 3) + '.' + a[1] % 3].concat(a.slice(2)); })));
      out.push(ui.section(T.n + ' box score', nodes));
    });
    if (d.plays && d.plays.length) {
      var aw = 1 - d.home;
      out.push(ui.section('Scoring plays', ui.log(d.plays.map(function (p) {
        var bt = p.h ? d.home : aw;
        return { b: (p.h ? 'Bot ' : 'Top ') + p.i, t: p.t + (p.r > 1 ? ' (' + p.r + ' runs)' : ''), c: d.tm[bt].c };
      })), { icon: 'flag' }));
    }
    return ui.wrap(out);
  });

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
  var AA = { ger: ['Germany', '#8e959a', 'axis'], sov: ['Soviet Union', '#c8434b', 'allies'], jpn: ['Japan', '#e0922b', 'axis'], uk: ['United Kingdom', '#c4a06a', 'allies'], usa: ['United States', '#7f9f45', 'allies'] };
  var AORDER = ['sov', 'ger', 'uk', 'jpn', 'usa'], ASTART = { sov: 24, ger: 41, uk: 31, jpn: 30, usa: 42 };
  var ACITIES = [['Berlin', 'a'], ['Paris', 'a'], ['Rome', 'a'], ['Tokyo', 'a'], ['Shanghai', 'a'], ['Manila', 'a'], ['Moscow', 'l'], ['Leningrad', 'l'], ['London', 'l'], ['Calcutta', 'l'], ['Washington', 'l'], ['San Francisco', 'l'], ['Honolulu', 'l']];
  R(['axisallies-score'], function (e, ui) {
    var d = e.dt || {}, pw = d.pw || null, meta = e.powers || [];
    if (!pw && !meta.length) return null;
    var out = [], by = {}; meta.forEach(function (m) { if (m && m.k) by[m.k] = m.by; });
    if (d.vc) {
      var ax = d.vc.split('').filter(function (c) { return c === 'a'; }).length, al = d.vc.length - ax;
      var box = el('div', { class: 'sx-vc' });
      ACITIES.forEach(function (c, i) { var h = d.vc.charAt(i); box.appendChild(el('span', { class: h + (h !== c[1] ? ' flip' : ''), title: h !== c[1] ? 'Changed hands' : '' }, [document.createTextNode(c[0]), el('em', { text: h === 'a' ? 'Axis' : 'Allies' })])); });
      out.push(ui.section('Victory cities at the end', [
        el('div', { class: 'sx-row2' }, [el('span', { class: 'sx-tag', style: { background: '#4b5054', color: '#fff' }, text: 'Axis ' + ax + (d.need ? ' / ' + d.need[0] : '') }), el('span', { class: 'sx-tag', style: { background: '#56702c', color: '#fff' }, text: 'Allies ' + al + (d.need ? ' / ' + d.need[1] : '') }), el('small', { text: d.need ? 'held / needed' : '' })]),
        box, legend([['#ffd75e', 'Gold edge: changed hands']])], { icon: 'flag' }));
    }
    var rows = AORDER.map(function (k) {
      var p = pw ? pw.filter(function (x) { return x.k === k; })[0] || {} : meta.filter(function (x) { return x.k === k; })[0] || {};
      return [{ t: AA[k][0] }, short(by[k] || '', 10), p.inc != null ? p.inc : '–', p.bank != null ? p.bank : '–', pw ? (p.sp || 0) : '–', pw ? { t: p.cap ? 'Held' : 'Lost', c: p.cap ? 'good' : 'bad' } : '–'];
    });
    out.push(ui.section('IPC tally', ui.table(['Power', 'Player', 'Income', 'Bank', 'Spent', 'Capital'], rows), { icon: 'coins' }));
    if (d.ih && d.ih.length) {
      var hist = [AORDER.map(function (k) { return ASTART[k]; })].concat(d.ih.map(nums));
      var series = AORDER.map(function (k, j) { return { name: AA[k][0].split(' ')[0] === 'United' ? (k === 'uk' ? 'UK' : 'USA') : k === 'sov' ? 'USSR' : AA[k][0], color: AA[k][1], pts: hist.map(function (r) { return r[j]; }) }; });
      out.push(ui.section('Income by round', ui.picture(lineChart(series, { aria: 'Income by round', xl: function (i) { return i === 0 ? 'Start' : i; } }), { frame: 'dark', max: 420 }), { icon: 'chart' }));
    }
    if (d.bat) out.push(ui.stats([['Battles rolled', d.bat], ['Dice thrown', ui.num(d.dice)]]));
    return ui.wrap(out);
  });
})();
