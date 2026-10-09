'use strict';
// History views: party
(function () {
  if (!window.HistView) return;
  var R = HistView.register;
  function names(e) { return (e.players || []).map(function (p) { return p && p.name || ''; }); }
  function arr(v) { return Array.isArray(v) ? v : []; }

  // ── Mini Golf: the course and a real paper scorecard ──────────────────────
  // Birdie circled, eagle / hole in one double-circled, bogey boxed, double bogey or worse double-boxed.
  R('minigolf', function (e, ui) {
    var el = ui.el, P = names(e), d = e.dt || {};
    var holes = +e.holes || (e.rounds && e.rounds.labels ? e.rounds.labels.length : 0) || (e.par ? e.par.length : 0);
    if (!holes || !P.length) return null;
    var par = []; for (var h = 0; h < holes; h++) par.push(+(arr(e.par)[h]) || 2);
    // strokes[player][hole] (null = no score)
    var S = P.map(function (n, i) {
      var row = [];
      if (d.s && d.s[i] != null) row = String(d.s[i]).split(',').map(function (v) { return v === '' ? null : +v; });
      else if (e.rounds && e.rounds.scores) row = e.rounds.scores.map(function (r) { var v = arr(r)[i]; return v ? +v : null; });
      while (row.length < holes) row.push(null);
      return row.slice(0, holes);
    });
    if (!S.some(function (r) { return r.some(function (v) { return v != null; }); })) return null;
    function sum(a, from, to) { var t = 0; for (var k = from; k < to; k++) t += a[k] || 0; return t; }
    function played(i, from, to) { for (var k = from; k < to; k++) if (S[i][k] != null) return true; return false; }
    var parTot = sum(par, 0, holes);
    function mark(v, p) {
      if (v == null) return '';
      var d2 = v - p, cls = v === 1 ? 'ace' : d2 <= -2 ? 'eagle' : d2 === -1 ? 'birdie' : d2 === 1 ? 'bogey' : d2 >= 2 ? 'dbl' : 'par';
      return '<span class="mg-m ' + cls + '">' + v + '</span>';
    }
    function toPar(n) { return n === 0 ? 'E' : n > 0 ? '+' + n : String(n); }
    function half(from, to, sumLabel, last) {
      var t = el('table', { class: 'mg-sc' });
      var cg = '<colgroup><col class="nm">'; for (var k = from; k < to; k++) cg += '<col>'; cg += '<col class="s">' + (last && holes > 9 ? '<col class="s">' : '') + '</colgroup>';
      var hr = '<tr class="hole"><th>Hole</th>'; for (var k2 = from; k2 < to; k2++) hr += '<th>' + (k2 + 1) + '</th>';
      hr += '<th>' + sumLabel + '</th>' + (last && holes > 9 ? '<th>Tot</th>' : '') + '</tr>';
      var pr = '<tr class="par"><th>Par</th>'; for (var k3 = from; k3 < to; k3++) pr += '<td>' + par[k3] + '</td>';
      pr += '<td>' + sum(par, from, to) + '</td>' + (last && holes > 9 ? '<td>' + parTot + '</td>' : '') + '</tr>';
      var rows = '';
      P.forEach(function (n, i) {
        var r = '<tr class="pl"><th style="color:' + ui.color(i) + '">' + ui.esc(n) + '</th>';
        for (var k4 = from; k4 < to; k4++) r += '<td>' + mark(S[i][k4], par[k4]) + '</td>';
        var pp = 0; S[i].forEach(function (v, k) { if (v != null) pp += v - par[k]; });
        var tp = '<small class="tp ' + (pp < 0 ? 'u' : pp > 0 ? 'o' : 'e') + '">' + toPar(pp) + '</small>';
        r += '<td class="sub' + (last && holes <= 9 ? ' tot' : '') + '">' + (played(i, from, to) ? sum(S[i], from, to) : '') + (last && holes <= 9 ? tp : '') + '</td>';
        if (last && holes > 9) r += '<td class="sub tot">' + sum(S[i], 0, holes) + tp + '</td>';
        rows += r + '</tr>';
      });
      t.innerHTML = cg + hr + pr + rows;
      return t;
    }
    var c = e.course || null, title = c ? c.name + (c.sub ? '' : '') : 'Mini Golf';
    var card = el('div', { class: 'mg-card' });
    var head = el('div', { class: 'mg-head' }, [
      el('div', { class: 'mg-flag', html: '<svg viewBox="0 0 40 56" aria-hidden="true"><ellipse cx="12" cy="52" rx="10" ry="3" fill="rgba(0,0,0,.18)"/><rect x="11" y="4" width="2.5" height="48" rx="1" fill="#2a2a3a"/><path d="M13.5 4 34 11 13.5 18z" fill="#d6283d"/></svg>' }),
      el('div', { class: 'mg-ttl' }, [
        el('b', { text: title }),
        c && c.sub ? el('span', { class: 'mg-sub', text: c.sub + ' course' }) : null,
        c && c.place ? el('small', { text: c.place }) : null
      ]),
      el('div', { class: 'mg-meta' }, [el('b', { text: 'Par ' + parTot }), el('small', { text: holes + ' holes' + (d.cap ? ' · max ' + d.cap : '') })])
    ]);
    card.appendChild(head);
    if (holes > 9) {
      card.appendChild(el('div', { class: 'mg-nine', text: 'Front nine' }));
      card.appendChild(el('div', { class: 'mg-wrap' }, [half(0, 9, 'Out', false)]));
      card.appendChild(el('div', { class: 'mg-nine', text: 'Back nine' }));
      card.appendChild(el('div', { class: 'mg-wrap' }, [half(9, holes, 'In', true)]));
    } else card.appendChild(el('div', { class: 'mg-wrap' }, [half(0, holes, 'Tot', true)]));
    card.appendChild(el('div', { class: 'mg-key', html: '<span><span class="mg-m ace">1</span>hole in one</span><span><span class="mg-m birdie">1</span>birdie</span><span><span class="mg-m bogey">3</span>bogey</span><span><span class="mg-m dbl">4</span>double</span>' }));
    if (c && c.lat != null && c.lon != null) card.appendChild(el('a', { class: 'mg-map', href: 'https://maps.apple.com/?ll=' + c.lat + ',' + c.lon + '&q=' + encodeURIComponent(c.name || 'Mini golf'), target: '_blank', rel: 'noopener', html: ui.icon('compass') + '<span>Open the course in Maps</span>' }));
    var out = [ui.section('Scorecard', card, { icon: 'flag' })];

    // The round in numbers: aces, birdies and so on per player, and the hardest and easiest holes
    var kinds = P.map(function (n, i) {
      var k = { ace: 0, bird: 0, par: 0, bog: 0 };
      S[i].forEach(function (v, h2) { if (v == null) return; var dd = v - par[h2]; if (v === 1) k.ace++; if (dd < 0) k.bird++; else if (dd === 0) k.par++; else k.bog++; });
      return k;
    });
    out.push(ui.section('Card summary', ui.table(['', 'Aces', 'Under par', 'Par', 'Over'], P.map(function (n, i) { var k = kinds[i]; return [n, k.ace || '–', k.bird || '–', k.par || '–', k.bog || '–']; }))));
    var avg = par.map(function (p, h3) { var t = 0, n = 0; S.forEach(function (r) { if (r[h3] != null) { t += r[h3] - p; n++; } }); return n ? t / n : null; });
    var hi = -1, lo = -1; avg.forEach(function (a, h4) { if (a == null) return; if (hi < 0 || a > avg[hi]) hi = h4; if (lo < 0 || a < avg[lo]) lo = h4; });
    var facts = [];
    if (hi >= 0 && avg[hi] > 0) facts.push(['Toughest hole', 'Hole ' + (hi + 1) + ' (par ' + par[hi] + '): ' + fmtAvg(avg[hi] + par[hi]) + ' strokes on average']);
    if (lo >= 0 && lo !== hi && avg[lo] < 0) facts.push(['Kindest hole', 'Hole ' + (lo + 1) + ' (par ' + par[lo] + '): ' + fmtAvg(avg[lo] + par[lo]) + ' strokes on average']);
    var f = ui.facts(facts); if (f) out.push(f);
    return ui.wrap(out);
  });
  function fmtAvg(x) { return (Math.round(x * 10) / 10).toString(); }
  HistView.css('hv-minigolf',
    '.mg-card{border-radius:6px 6px 12px 12px;overflow:hidden;color:#2a2a3a;background:linear-gradient(180deg,#fffaf0,#f3ead3);box-shadow:0 10px 24px -8px rgba(0,0,0,.6);padding-bottom:10px;}' +
    '.mg-head{display:flex;align-items:center;gap:8px;padding:12px 12px 10px;border-bottom:3px double #1f9a4f;}' +
    '.mg-flag{width:22px;height:32px;flex:none;}.mg-flag svg{width:100%;height:100%;display:block;}' +
    '.mg-ttl{flex:1;min-width:0;display:flex;flex-direction:column;}' +
    '.mg-ttl b{font-family:var(--display);font-weight:400;font-size:1.25rem;line-height:1.1;color:#1f7a3f;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.mg-sub{font-family:var(--hand);font-size:1rem;color:#2a2a3a;line-height:1.1;}' +
    '.mg-ttl small{font-size:.74rem;font-weight:700;color:#7a7588;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.mg-meta{text-align:right;flex:none;display:flex;flex-direction:column;}' +
    '.mg-meta b{font-family:var(--display);font-weight:400;font-size:1.05rem;color:#1f7a3f;line-height:1.1;}.mg-meta small{font-size:.7rem;font-weight:800;color:#7a7588;white-space:nowrap;}' +
    '.mg-nine{margin:10px 12px 3px;font-size:.66rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#1f7a3f;}' +
    '.mg-wrap{overflow-x:auto;padding:0 6px;}' +
    '.mg-sc{width:100%;min-width:300px;table-layout:fixed;border-collapse:collapse;font-variant-numeric:tabular-nums;}' +
    '.mg-sc col.nm{width:56px;}.mg-sc col.s{width:31px;}' +
    '.mg-sc th,.mg-sc td{height:32px;padding:0;text-align:center;border:1px solid rgba(31,122,63,.22);}' +
    '.mg-sc tr>th:first-child{text-align:left;padding-left:5px;font-weight:900;font-size:.76rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.mg-sc tr.hole th{height:22px;background:#1f7a3f;color:#fff;font-size:.68rem;font-weight:900;border-color:#1a6a36;}' +
    '.mg-sc tr.hole th:first-child{font-size:.62rem;letter-spacing:.06em;text-transform:uppercase;}' +
    '.mg-sc tr.par td,.mg-sc tr.par th{height:22px;font-size:.72rem;font-weight:800;color:#7a7588;background:rgba(31,122,63,.06);}' +
    '.mg-sc tr.par th{text-transform:uppercase;font-size:.62rem;letter-spacing:.06em;}' +
    '.mg-sc td.sub{font-family:var(--hand);font-size:1.12rem;font-weight:700;color:var(--ink);background:rgba(31,122,63,.08);}' +
    '.mg-sc td.tot{background:rgba(31,122,63,.16);}' +
    '.mg-sc td.sub{line-height:1;}.mg-sc .tp{display:block;font-family:var(--font);font-size:.6rem;font-weight:900;line-height:1;}.mg-sc .tp.u{color:#15803d;}.mg-sc .tp.o{color:#c8102e;}.mg-sc .tp.e{color:#7a7588;}' +
    '.mg-m{display:inline-grid;place-items:center;width:21px;height:21px;font-family:var(--hand);font-size:1.08rem;line-height:1;color:var(--ink);box-sizing:border-box;}' +
    '.mg-m.birdie,.mg-m.eagle,.mg-m.ace{border:1.5px solid #c8102e;border-radius:50%;color:#c8102e;}' +
    '.mg-m.eagle,.mg-m.ace{box-shadow:0 0 0 2px #fffaf0,0 0 0 3.3px #c8102e;}' +
    '.mg-m.ace{background:rgba(255,212,71,.45);}' +
    '.mg-m.bogey,.mg-m.dbl{border:1.5px solid #1f2a6b;border-radius:2px;}' +
    '.mg-m.dbl{box-shadow:0 0 0 2px #fffaf0,0 0 0 3.3px #1f2a6b;}' +
    '.mg-key{display:flex;flex-wrap:wrap;gap:4px 9px;justify-content:center;margin:10px 10px 0;font-size:.7rem;font-weight:800;color:#7a7588;}' +
    '.mg-key>span{display:inline-flex;align-items:center;gap:6px;}.mg-key .mg-m{width:17px;height:17px;font-size:.9rem;}' +
    '.mg-map{display:flex;align-items:center;justify-content:center;gap:6px;margin:10px 12px 0;padding:8px;border-radius:10px;background:rgba(31,122,63,.1);color:#1f7a3f;font-weight:900;font-size:.82rem;text-decoration:none;}.mg-map .ico{width:16px;height:16px;}');

  // ── Trivia: every question, the right answer, and who got it ─────────────
  var TRIV_COLOR = { animals: '#16a34a', space: '#6d28d9', science: '#7c3aed', nature: '#059669', world: '#0284c7', america: '#2563eb',
    history: '#dc2626', colorado: '#d97706', sports: '#ea580c', movies: '#db2777', food: '#c2410c', math: '#4f46e5' };
  R('trivia', function (e, ui) {
    var el = ui.el, P = names(e), d = e.dt;
    if (!d || !arr(d.qs).length) return null;
    var cn = d.cn || {}, cc = d.cc || {};
    function ccol(k) { return cc[k] || TRIV_COLOR[k] || '#64748b'; }
    var out = [];
    // How each category went: right / asked, per player when more than one
    var cats = {}; arr(d.qs).forEach(function (q) { var c = cats[q.k] = cats[q.k] || { r: 0, n: 0, p: P.map(function () { return [0, 0]; }) }; c.n++; if (q.ok) c.r++; if (q.p >= 0 && c.p[q.p]) { c.p[q.p][1]++; if (q.ok) c.p[q.p][0]++; } });
    var ck = Object.keys(cats).sort(function (a, b) { return cats[b].n - cats[a].n; });
    if (ck.length) {
      var grid = el('div', { class: 'tv-cats' });
      ck.forEach(function (k) {
        var c = cats[k], who = P.length > 1 && !d.buzz ? '' : '';
        grid.appendChild(el('div', { class: 'tv-cat', style: { '--cc': ccol(k) } }, [
          el('b', { text: cn[k] || k }),
          el('span', { class: 'tv-pips', html: arr(d.qs).filter(function (q) { return q.k === k; }).map(function (q) { return '<i class="' + (q.ok ? 'y' : 'n') + '"></i>'; }).join('') }),
          el('small', { text: c.r + ' of ' + c.n + ' right' + who })
        ]));
      });
      out.push(ui.section('Categories', grid, { icon: 'tiles' }));
    }
    // The questions, quiz-card style
    var list = el('ol', { class: 'tv-qs' });
    arr(d.qs).forEach(function (q, i) {
      var res;
      if (q.ok && q.p >= 0) res = el('span', { class: 'tv-res ok' }, [el('i', { html: ui.icon('check') }), el('span', { text: (P.length > 1 ? (P[q.p] || '') + ' got it' : 'Got it') + (q.t != null ? ' in ' + q.t + 's' : '') })]);
      else if (q.p >= 0) res = el('span', { class: 'tv-res no' }, [el('i', { html: ui.icon('close') }), el('span', { text: (P.length > 1 ? (P[q.p] || '') + ' ' : '') + (q.w ? 'said “' + q.w + '”' : 'ran out of time') })]);
      else res = el('span', { class: 'tv-res no' }, [el('i', { html: ui.icon('close') }), el('span', { text: 'Nobody got it' })]);
      var missed = q.m ? String(q.m).split('').map(function (x) { return P[+x]; }).filter(Boolean) : [];
      list.appendChild(el('li', { class: 'tv-q', style: { '--cc': ccol(q.k) } }, [
        el('div', { class: 'tv-top' }, [el('span', { class: 'tv-n', text: 'Q' + (i + 1) }), el('span', { class: 'tv-k', text: cn[q.k] || q.k })]),
        el('p', { text: q.q }),
        el('div', { class: 'tv-a' }, [el('span', { class: 'tv-ans', text: q.a })]),
        res,
        missed.length ? el('span', { class: 'tv-miss', text: 'Buzzed wrong first: ' + missed.join(', ') }) : null
      ]));
    });
    out.push(ui.section('The questions', list, { icon: 'help' }));
    if (d.n > arr(d.qs).length) out.push(el('p', { class: 'tv-more', text: '…and ' + (d.n - arr(d.qs).length) + ' more questions' }));
    return ui.wrap(out);
  });
  HistView.css('hv-trivia',
    '.tv-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;}' +
    '.tv-cat{display:flex;flex-direction:column;gap:4px;padding:8px 10px;border-radius:12px;background:color-mix(in srgb,var(--cc) 16%,transparent);box-shadow:inset 3px 0 0 var(--cc);}' +
    '.tv-cat b{font-size:.86rem;font-weight:900;}.tv-cat small{font-size:.72rem;font-weight:800;color:var(--text-3);}' +
    '.tv-pips{display:flex;flex-wrap:wrap;gap:3px;}.tv-pips i{width:9px;height:9px;border-radius:50%;}.tv-pips i.y{background:#4ade80;}.tv-pips i.n{background:rgba(255,255,255,.18);}' +
    '.tv-qs{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}' +
    '.tv-q{position:relative;padding:10px 12px 10px 14px;border-radius:12px;background:linear-gradient(160deg,#1c2350,#141a3c);box-shadow:inset 4px 0 0 var(--cc),0 4px 10px -6px rgba(0,0,0,.6);color:#fff;display:flex;flex-direction:column;gap:5px;}' +
    '.tv-top{display:flex;align-items:center;gap:8px;}' +
    '.tv-n{font-family:var(--display);font-size:.9rem;color:#ffd447;}' +
    '.tv-k{font-size:.64rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:999px;background:var(--cc);color:#fff;}' +
    '.tv-q p{margin:0;font-weight:700;font-size:.9rem;line-height:1.3;}' +
    '.tv-a{display:flex;}.tv-ans{padding:3px 9px;border-radius:8px;background:#1fa64a;color:#fff;font-weight:900;font-size:.84rem;}' +
    '.tv-res{display:flex;align-items:center;gap:5px;font-size:.78rem;font-weight:800;}.tv-res i{display:flex;}.tv-res .ico{width:14px;height:14px;}' +
    '.tv-res.ok{color:#86efac;}.tv-res.no{color:#fca5a5;}.tv-miss{font-size:.74rem;font-weight:700;color:rgba(255,255,255,.55);}' +
    '.tv-more{margin:0;text-align:center;color:var(--text-3);font-weight:800;font-size:.82rem;}');

  // ── Would You Rather: each choice and how people split ────────────────────
  var WYR_CAT = { fun: ['Fun', '#e0457b'], silly: ['Silly', '#e39b12'], food: ['Food', '#d9622b'], animals: ['Animals', '#2f9e5a'], powers: ['Superpowers', '#7b5bd6'],
    adventure: ['Adventure', '#1f8fb0'], family: ['Family', '#e8833a'], everyday: ['Everyday', '#3d7fd6'], tough: ['Tough choices', '#8a4bbd'] };
  R('wouldyourather', function (e, ui) {
    var el = ui.el, P = names(e), qs = arr(e.qs);
    if (!qs.length) return null;
    var ks = e.dt && e.dt.k ? String(e.dt.k).split(' ') : [];
    var out = [];
    var list = el('div', { class: 'wy-list' });
    qs.forEach(function (q, i) {
      var who = String(q.who || ''), tot = (q.va || 0) + (q.vb || 0), pa = tot ? Math.round(q.va / tot * 100) : 50;
      function side(s, text, n) {
        var ppl = []; for (var k = 0; k < who.length; k++) if (who.charAt(k) === s && P[k]) ppl.push(k);
        var lead = s === 'a' ? q.va > q.vb : q.vb > q.va;
        return el('div', { class: 'wy-side ' + s + (lead ? ' lead' : '') }, [
          el('p', { text: text }),
          el('div', { class: 'wy-who' }, ppl.map(function (k) { return el('span', { class: 'wy-dot', style: { '--c': ui.color(k) }, title: P[k], text: P[k].charAt(0).toUpperCase() }); }).concat(n ? [el('b', { text: String(n) })] : []))
        ]);
      }
      var cat = WYR_CAT[ks[i]];
      list.appendChild(el('div', { class: 'wy-q' }, [
        el('div', { class: 'wy-top' }, [el('span', { class: 'wy-n', text: String(i + 1) }), cat ? el('span', { class: 'wy-k', style: { '--cc': cat[1] }, text: cat[0] }) : null,
          el('span', { class: 'wy-split', text: tot ? (q.va === q.vb ? 'Split ' + q.va + '–' + q.vb : !q.va || !q.vb ? 'Everyone agreed' : Math.max(q.va, q.vb) + '–' + Math.min(q.va, q.vb)) : 'No votes' })]),
        el('div', { class: 'wy-two' }, [side('a', q.a, q.va), el('span', { class: 'wy-or', text: 'or' }), side('b', q.b, q.vb)]),
        el('div', { class: 'wy-bar' }, [el('i', { class: 'a', style: { width: pa + '%' } }), el('i', { class: 'b', style: { width: (100 - pa) + '%' } })])
      ]));
    });
    out.push(ui.section('The choices', list, { icon: 'swap' }));
    // Who thinks alike: how often each pair picked the same side
    if (P.length > 2) {
      var pairs = [];
      for (var i = 0; i < P.length; i++) for (var j = i + 1; j < P.length; j++) {
        var same = 0, both = 0;
        qs.forEach(function (q) { var a = String(q.who || '').charAt(i), b = String(q.who || '').charAt(j); if (a && b) { both++; if (a === b) same++; } });
        if (both) pairs.push({ label: P[i] + ' & ' + P[j], value: same, max: both, text: same + ' of ' + both, color: ui.color(i) });
      }
      pairs.sort(function (a, b) { return b.value / b.max - a.value / a.max; });
      if (pairs.length) out.push(ui.section('Who thinks alike', ui.bars(pairs.slice(0, 6).map(function (p) { return { label: p.label, value: Math.round(p.value / p.max * 100), max: 100, text: p.text, color: p.color }; })), { icon: 'users' }));
    }
    return ui.wrap(out);
  });
  HistView.css('hv-wyr',
    '.wy-list{display:flex;flex-direction:column;gap:8px;}' +
    '.wy-q{padding:10px;border-radius:14px;background:rgba(255,255,255,.05);display:flex;flex-direction:column;gap:7px;}' +
    '.wy-top{display:flex;align-items:center;gap:7px;font-size:.72rem;font-weight:900;}' +
    '.wy-n{color:var(--text-3);}.wy-k{padding:2px 7px;border-radius:999px;background:var(--cc);color:#fff;letter-spacing:.06em;text-transform:uppercase;font-size:.62rem;}' +
    '.wy-split{margin-left:auto;color:var(--text-2);}' +
    '.wy-two{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:stretch;}' +
    '.wy-or{align-self:center;font-family:var(--display);font-size:.8rem;color:var(--text-3);}' +
    '.wy-side{display:flex;flex-direction:column;justify-content:space-between;gap:6px;padding:8px 9px;border-radius:10px;color:#fff;opacity:.62;}' +
    '.wy-side.a{background:linear-gradient(160deg,#e0457b,#b02a5e);}.wy-side.b{background:linear-gradient(160deg,#3d7fd6,#2a5aa8);}' +
    '.wy-side.lead{opacity:1;box-shadow:0 0 0 2px rgba(255,255,255,.75);}' +
    '.wy-side p{margin:0;font-weight:800;font-size:.84rem;line-height:1.25;}' +
    '.wy-who{display:flex;flex-wrap:wrap;align-items:center;gap:3px;}.wy-who b{margin-left:auto;font-family:var(--display);font-size:1rem;}' +
    '.wy-dot{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--c);color:#fff;font-size:.62rem;font-weight:900;box-shadow:0 0 0 1.5px rgba(255,255,255,.85);}' +
    '.wy-bar{display:flex;height:6px;border-radius:3px;overflow:hidden;background:rgba(255,255,255,.08);}.wy-bar i{display:block;height:100%;}.wy-bar i.a{background:#e0457b;}.wy-bar i.b{background:#3d7fd6;}');

  // ── Mad Libs: the finished story, filled words highlighted ────────────────
  R('madlibs', function (e, ui) {
    var el = ui.el, P = names(e), words = arr(e.words), by = arr(e.by), d = e.dt || {};
    if (!words.length) return null;
    var multi = P.length > 1;
    var paper = el('div', { class: 'ml-paper' });
    paper.appendChild(el('h3', { text: e.title || 'Mad Libs' }));
    var body = el('p', { class: 'ml-story' });
    function word(i) {
      var w = words[i] || '___', p = +by[i] || 0;
      return el('span', { class: 'ml-w', style: multi ? { '--c': ui.color(p) } : null }, [el('b', { text: w }), d.ty && d.ty[i] ? el('small', { text: d.ty[i] }) : null]);
    }
    if (d.s) {
      var re = /\{(\d+)\}/g, last = 0, m, s = String(d.s).slice(0, 1800);
      while ((m = re.exec(s))) {
        if (m.index > last) body.appendChild(document.createTextNode(s.slice(last, m.index)));
        body.appendChild(word(+m[1])); last = re.lastIndex;
      }
      if (last < s.length) body.appendChild(document.createTextNode(s.slice(last)));
      if (String(d.s).length > 1800) body.appendChild(document.createTextNode('…'));
    } else {
      // older records: just the words that were filled in
      words.forEach(function (w, i) { body.appendChild(word(i)); body.appendChild(document.createTextNode(' ')); });
      body.classList.add('ml-only');
    }
    paper.appendChild(body);
    var out = [ui.section('The story', paper, { icon: 'book' })];
    if (multi) {
      out.push(ui.section('Who filled in what', ui.el('div', { class: 'ml-by' }, P.map(function (n, i) {
        var mine = words.filter(function (w, k) { return (+by[k] || 0) === i; });
        return el('div', { style: { '--c': ui.color(i) } }, [el('b', { text: n }), el('span', { text: mine.join(', ') || '–' })]);
      })), { icon: 'pencil' }));
    }
    return ui.wrap(out);
  });
  HistView.css('hv-madlibs',
    '.ml-paper{padding:14px 16px 16px;border-radius:6px;color:#2a2a3a;background:repeating-linear-gradient(180deg,transparent 0 31px,rgba(60,80,160,.16) 31px 32px),linear-gradient(180deg,#fffaf0,#f6eedb);box-shadow:0 10px 24px -8px rgba(0,0,0,.6);}' +
    '.ml-paper h3{margin:0 0 6px;font-family:var(--display);font-weight:400;font-size:1.25rem;color:#c2304b;}' +
    '.ml-story{margin:0;font-size:.95rem;line-height:2;font-weight:600;white-space:pre-line;}' +
    '.ml-w{display:inline-flex;flex-direction:column;align-items:center;vertical-align:-.85em;line-height:1.05;margin:0 1px;}' +
    '.ml-w b{font-family:var(--hand);font-size:1.18rem;font-weight:400;color:var(--c,var(--ink));padding:0 3px;border-bottom:1.5px solid #2a2a3a;}' +
    '.ml-w small{font-size:.54rem;font-weight:800;color:#8a8796;letter-spacing:.02em;white-space:nowrap;}' +
    '.ml-only{line-height:2.4;}' +
    '.ml-by{display:flex;flex-direction:column;gap:5px;font-size:.86rem;}.ml-by>div{display:flex;gap:8px;}.ml-by b{flex:none;color:var(--c);font-weight:900;}.ml-by span{color:var(--text-2);font-weight:600;}');

  // ── Riddle Stories: each case file, its answer, who cracked it ────────────
  var DECKN = { E: 'Easy', C: 'Classic', T: 'Tricky', B: 'Brain' };
  R('riddlestories', function (e, ui) {
    var el = ui.el, P = names(e), d = e.dt;
    if (!d || !arr(d.cs).length) return null;
    var list = el('div', { class: 'rs-list' });
    arr(d.cs).forEach(function (c, i) {
      var solved = c.s >= 0;
      var stamp = el('span', { class: 'rs-stamp ' + (solved ? 'ok' : 'no'), text: solved ? 'Solved' : 'Unsolved' });
      var meta = [];
      if (c.r >= 0 && P[c.r]) meta.push('Read by ' + P[c.r]);
      if (solved && P.length > 1 && P[c.s]) meta.push('Cracked by ' + P[c.s]);
      meta.push(c.h ? c.h + (c.h === 1 ? ' clue' : ' clues') : 'No clues');
      var env = el('details', { class: 'rs-env' }, [el('summary', { html: ui.icon('eye') + '<span>Open the envelope</span>' }), el('p', { text: c.a || '' })]);
      list.appendChild(el('div', { class: 'rs-case' }, [
        el('span', { class: 'rs-tab', text: 'Case ' + (i + 1) + (DECKN[c.d] ? ' · ' + DECKN[c.d] : '') }),
        el('div', { class: 'rs-page' }, [
          stamp,
          el('h5', { text: c.t || '' }),
          el('p', { class: 'rs-q', text: c.q || '' }),
          c.c ? el('p', { class: 'rs-clues', text: 'Clues used: ' + c.c }) : null,
          el('small', { class: 'rs-meta', text: meta.join(' · ') }),
          env
        ])
      ]));
    });
    var n = arr(d.cs).length, ok = arr(d.cs).filter(function (c) { return c.s >= 0; }).length, clean = arr(d.cs).filter(function (c) { return c.s >= 0 && !c.h; }).length;
    return ui.wrap([ui.stats([['Solved', ok + ' / ' + n], ['No clues', clean], ['Clues used', arr(d.cs).reduce(function (a, c) { return a + (c.h || 0); }, 0)]]), ui.section('The case files', list, { icon: 'book' })]);
  });
  HistView.css('hv-riddle',
    '.rs-list{display:flex;flex-direction:column;gap:18px;padding-top:10px;}' +
    '.rs-case{position:relative;}' +
    '.rs-tab{position:absolute;left:12px;top:-13px;height:18px;padding:2px 12px 0;border-radius:7px 7px 0 0;background:#efdcaa;color:#3a2a14;font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;}' +
    '.rs-page{position:relative;padding:12px 14px 12px;border-radius:3px 10px 10px 10px;color:#3a2a14;background:linear-gradient(170deg,#efdcaa,#dcc286);box-shadow:0 1px 0 rgba(255,255,255,.4) inset,0 8px 18px -8px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:6px;}' +
    '.rs-page h5{margin:0;padding-right:80px;font-family:"American Typewriter","Courier Prime",Georgia,serif;font-size:1rem;font-weight:700;}' +
    '.rs-q{margin:0;font-family:"American Typewriter","Courier Prime",Georgia,serif;font-size:.84rem;line-height:1.4;}' +
    '.rs-clues{margin:0;font-family:var(--hand);font-size:.98rem;line-height:1.2;color:#1f2a6b;}' +
    '.rs-meta{font-size:.7rem;font-weight:800;color:#7a6236;}' +
    '.rs-stamp{position:absolute;right:10px;top:10px;transform:rotate(-8deg);padding:2px 7px;border:2px solid currentColor;border-radius:4px;font-family:var(--display);font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;opacity:.85;}' +
    '.rs-stamp.ok{color:#1d7a3c;}.rs-stamp.no{color:#b3261e;}' +
    '.rs-env{border-radius:8px;background:#fbf4e1;box-shadow:0 1px 3px rgba(0,0,0,.18);}' +
    '.rs-env summary{display:flex;align-items:center;gap:6px;padding:7px 10px;cursor:pointer;list-style:none;font-size:.78rem;font-weight:900;color:#7a4f12;}.rs-env summary::-webkit-details-marker{display:none;}.rs-env summary .ico{width:15px;height:15px;}' +
    '.rs-env[open] summary span::after{content:"";}.rs-env p{margin:0;padding:0 10px 9px;font-family:var(--hand);font-size:1.05rem;line-height:1.25;color:#1f2a6b;}');

  // ── Conversation Starters: the cards that came up ─────────────────────────
  var CONV_CAT = { family: ['Family', '#e8833a'], wouldyou: ['Would you…', '#2f9e6e'], memories: ['Memories', '#3d7fd6'], dreams: ['Dreams', '#c2479a'], funny: ['Funny', '#e0a21a'],
    deep: ['Deep', '#7b5bd6'], you: ['About you', '#1f9bb0'], kids: ['Kids', '#e5534b'], colorado: ['Colorado', '#4a7a5a'] };
  R('conversation', function (e, ui) {
    var el = ui.el, P = names(e), cards = arr(e.cards);
    if (!cards.length) return null;
    var list = el('div', { class: 'cv-cards' });
    cards.forEach(function (c, i) {
      var cat = CONV_CAT[c.c] || [c.c || '', '#64748b'], pi = c.who ? P.indexOf(c.who) : -1;
      list.appendChild(el('div', { class: 'cv-card', style: { '--cc': cat[1], '--r': (i % 2 ? .6 : -.6) + 'deg' } }, [
        el('div', { class: 'cv-top' }, [el('span', { class: 'cv-k', text: cat[0] }), c.star ? el('span', { class: 'cv-star', html: ui.icon('star') }) : null]),
        el('p', { text: c.q }),
        c.who ? el('span', { class: 'cv-who', style: { '--c': ui.color(pi < 0 ? 0 : pi) } }, [el('i', { text: c.who.charAt(0).toUpperCase() }), el('span', { text: c.who })]) : null
      ]));
    });
    var byCat = {}; cards.forEach(function (c) { byCat[c.c] = (byCat[c.c] || 0) + 1; });
    var chips = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; }).map(function (k) { return { t: (CONV_CAT[k] ? CONV_CAT[k][0] : k) + ' ' + byCat[k], c: CONV_CAT[k] ? CONV_CAT[k][1] : null }; });
    var stars = cards.filter(function (c) { return c.star; }).length;
    return ui.wrap([
      ui.stats([['Cards', cards.length], ['Starred', stars || null], ['Topics', Object.keys(byCat).length]]),
      ui.chips(chips),
      ui.section('The cards', list, { icon: 'cards' })
    ]);
  });
  HistView.css('hv-conv',
    '.cv-cards{display:flex;flex-direction:column;gap:8px;}' +
    '.cv-card{padding:10px 12px 11px;border-radius:12px;background:#fffdf7;color:#22222e;transform:rotate(var(--r));box-shadow:inset 0 5px 0 var(--cc),0 6px 14px -8px rgba(0,0,0,.7);display:flex;flex-direction:column;gap:6px;}' +
    '.cv-top{display:flex;align-items:center;gap:6px;padding-top:2px;}' +
    '.cv-k{font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--cc);}' +
    '.cv-star{margin-left:auto;display:flex;color:#e0a21a;}.cv-star .ico{width:16px;height:16px;fill:currentColor;}' +
    '.cv-card p{margin:0;font-family:var(--display);font-weight:400;font-size:1.02rem;line-height:1.25;}' +
    '.cv-who{display:flex;align-items:center;gap:6px;font-size:.76rem;font-weight:800;color:#5a5a6e;}' +
    '.cv-who i{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--c);color:#fff;font-style:normal;font-size:.62rem;font-weight:900;}');

  // ── Bingo: the flashboard of called balls, the call order, the winning card ──
  var BL = ['B', 'I', 'N', 'G', 'O'], BCOL = { B: '#1f6fe5', I: '#e0263a', N: '#c9ccd8', G: '#1fa64a', O: '#f28a10' };
  var PATN = { line: 'Line', corners: '4 corners', x: 'X', blackout: 'Blackout' };
  function bLet(n) { return BL[Math.floor((n - 1) / 15)]; }
  function nums(s) { return String(s || '').split(',').filter(Boolean).map(Number).filter(function (n) { return n >= 1 && n <= 75; }); }
  // Lay the winning numbers onto a card by letter, in the shape of the pattern
  function bingoCard(pat, w, free) {
    var g = []; for (var r = 0; r < 5; r++) g.push([null, null, null, null, null]);
    var col = {}; BL.forEach(function (x) { col[x] = []; });
    w.slice().sort(function (a, b) { return a - b; }).forEach(function (n) { col[bLet(n)].push(n); });
    if (free) g[2][2] = 'F';
    function put(c, rowsList) { rowsList.forEach(function (r, k) { if (col[BL[c]][k] != null) g[r][c] = col[BL[c]][k]; }); }
    var counts = BL.map(function (x) { return col[x].length; });
    if (pat === 'corners') { put(0, [0, 4]); put(4, [0, 4]); }
    else if (pat === 'x') { [0, 1, 3, 4].forEach(function (c) { put(c, [c, 4 - c].sort()); }); }
    else if (pat === 'blackout') { BL.forEach(function (x, c) { put(c, c === 2 ? [0, 1, 3, 4] : [0, 1, 2, 3, 4]); }); }
    else {
      var down = counts.indexOf(5) >= 0 ? counts.indexOf(5) : (free && counts[2] === 4 ? 2 : -1);
      if (down >= 0) put(down, down === 2 && free ? [0, 1, 3, 4] : [0, 1, 2, 3, 4]);
      else { var row = free ? 2 : 0; BL.forEach(function (x, c) { put(c, [row]); }); }
    }
    return g;
  }
  R('bingo', function (e, ui) {
    var el = ui.el, d = e.dt;
    if (!d || !d.c) return null;
    var called = nums(d.c), w = nums(d.w), set = {}; called.forEach(function (n) { set[n] = 1; });
    var lastN = called[called.length - 1], pat = e.pattern || 'line';
    var out = [];
    // Winning card
    if (w.length || d.f) {
      var g = bingoCard(pat, w, !!d.f);
      var card = el('div', { class: 'bg-card' });
      card.appendChild(el('div', { class: 'bg-hdr' }, BL.map(function (x) { return el('b', { style: { '--c': BCOL[x] }, text: x }); })));
      var grid = el('div', { class: 'bg-grid' });
      g.forEach(function (row) { row.forEach(function (v) {
        if (v === 'F') grid.appendChild(el('span', { class: 'bg-sq free on', text: 'FREE' }));
        else if (v == null) grid.appendChild(el('span', { class: 'bg-sq blank' }));
        else grid.appendChild(el('span', { class: 'bg-sq on' + (v === lastN ? ' last' : ''), text: String(v) }));
      }); });
      card.appendChild(grid);
      out.push(ui.section('Winning card · ' + (PATN[pat] || pat), ui.el('div', { class: 'bg-wrap' }, [card, el('small', { class: 'bg-note', text: 'The numbers ' + (e.players && e.players[0] ? e.players[0].name : 'the winner') + ' read out' + (lastN && w.indexOf(lastN) >= 0 ? '. Ringed: ' + bLet(lastN) + '-' + lastN + ', the ball that finished it.' : '.') })]), { icon: 'trophy' }));
    }
    // The flashboard
    var svg = '', cs = 20, gap = 3, lw = 22, W = lw + 15 * (cs + gap) - gap + 12, H = 5 * (cs + gap) - gap + 12;
    svg += '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Called numbers">';
    BL.forEach(function (x, r) {
      var y = 6 + r * (cs + gap);
      svg += '<rect x="6" y="' + y + '" width="' + (lw - 4) + '" height="' + cs + '" rx="4" fill="' + BCOL[x] + '"/><text x="' + (6 + (lw - 4) / 2) + '" y="' + (y + cs / 2) + '" text-anchor="middle" dominant-baseline="central" font-family="Lilita One,system-ui" font-size="12" fill="' + (x === 'N' ? '#1b1d2a' : '#fff') + '">' + x + '</text>';
      for (var c = 0; c < 15; c++) {
        var n = r * 15 + c + 1, on = set[n], xx = 6 + lw + c * (cs + gap);
        svg += '<circle cx="' + (xx + cs / 2) + '" cy="' + (y + cs / 2) + '" r="' + (cs / 2) + '" fill="' + (on ? '#ffd447' : 'rgba(255,255,255,.07)') + '"' + (n === lastN ? ' stroke="#fff" stroke-width="2.2"' : '') + '/>';
        svg += '<text x="' + (xx + cs / 2) + '" y="' + (y + cs / 2 + .5) + '" text-anchor="middle" dominant-baseline="central" font-family="system-ui" font-weight="800" font-size="8.5" fill="' + (on ? '#2a1c00' : 'rgba(255,255,255,.28)') + '">' + n + '</text>';
      }
    });
    svg += '</svg>';
    out.push(ui.section('Called board · ' + called.length + ' of 75', ui.picture(svg, { frame: 'dark', max: 420 }), { icon: 'tiles' }));
    // Call order as little balls
    var seq = el('div', { class: 'bg-seq' });
    called.forEach(function (n, i) { seq.appendChild(el('span', { class: 'bg-ball' + (n === lastN ? ' last' : ''), style: { '--c': BCOL[bLet(n)] }, title: (i + 1) + ': ' + bLet(n) + '-' + n }, [el('i', { text: String(n) })])); });
    out.push(ui.section('In the order called', seq, { icon: 'rows' }));
    var cnt = BL.map(function (x, i) { return { label: x, value: called.filter(function (n) { return Math.floor((n - 1) / 15) === i; }).length, max: 15, color: BCOL[x] }; });
    out.push(ui.section('Calls by letter', ui.bars(cnt.map(function (c) { return { label: c.label, value: c.value, max: 15, text: c.value + ' of 15', color: c.color }; }))));
    return ui.wrap(out);
  });
  HistView.css('hv-bingo',
    '.bg-wrap{display:flex;flex-direction:column;align-items:center;gap:6px;}' +
    '.bg-card{width:100%;max-width:250px;padding:8px;border-radius:12px;background:#fffdf6;box-shadow:inset 0 0 0 3px #e11d48,0 10px 22px -10px rgba(0,0,0,.7);}' +
    '.bg-hdr,.bg-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;}' +
    '.bg-hdr b{display:grid;place-items:center;height:30px;border-radius:6px;background:var(--c);color:#fff;font-family:var(--display);font-weight:400;font-size:1.25rem;}' +
    '.bg-hdr b:nth-child(3){color:#1b1d2a;}' +
    '.bg-grid{margin-top:3px;}' +
    '.bg-sq{position:relative;display:grid;place-items:center;aspect-ratio:1;border-radius:4px;border:1px solid #e3dccb;color:#2a2a3a;font-family:var(--display);font-size:1.05rem;}' +
    '.bg-sq.blank{background:repeating-linear-gradient(135deg,transparent 0 5px,rgba(0,0,0,.035) 5px 6px);}' +
    '.bg-sq.on::before{content:"";position:absolute;inset:12%;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(255,90,140,.85),rgba(225,29,72,.7));}' +
    '.bg-sq.on{color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.4);}.bg-sq{z-index:0;}.bg-sq::before{z-index:-1;}' +
    '.bg-sq.free{font-size:.66rem;letter-spacing:.06em;}' +
    '.bg-sq.last{box-shadow:0 0 0 2.5px #ffd447;}' +
    '.bg-note{text-align:center;font-size:.74rem;font-weight:700;color:var(--text-3);}' +
    '.bg-seq{display:flex;flex-wrap:wrap;gap:4px;}' +
    '.bg-ball{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--c) 70%,#fff),var(--c) 70%);}' +
    '.bg-ball i{display:grid;place-items:center;width:17px;height:17px;border-radius:50%;background:#fff;color:#1b1d2a;font-style:normal;font-size:.6rem;font-weight:900;}' +
    '.bg-ball.last{box-shadow:0 0 0 2px #ffd447;}');
})();
