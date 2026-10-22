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

  // ── Trivia: the quiz, question by question (tap one), how each category went ──
  // dt.qs: [{q, a, k category, o other choices 'a|b|c', w wrong pick, t seconds, pt points,
  //          p who answered (-1 nobody), ok, m who buzzed wrong first}]; countdown games (dt.cd): pp = each player's points
  var TRIV_COLOR = { animals: '#16a34a', space: '#6d28d9', science: '#7c3aed', nature: '#059669', world: '#0284c7', america: '#2563eb',
    history: '#dc2626', colorado: '#d97706', sports: '#ea580c', movies: '#db2777', food: '#c2410c', math: '#4f46e5' };
  R('trivia', function (e, ui) {
    var el = ui.el, P = names(e), d = e.dt;
    if (!d || !arr(d.qs).length) return null;
    var cd = !!d.cd, qs = arr(d.qs), cn = d.cn || {}, cc = d.cc || {}, solo = P.length === 1;
    var me = cd ? (d.me >= 0 && d.me < P.length ? d.me : 0) : 0;
    function ccol(k) { return cc[k] || TRIV_COLOR[k] || '#64748b'; }
    function pts(q) { return String(q.pp || '').split(','); }
    // each question's result as the strip shows it: solo and countdown games from this player's side, else whoever answered
    var res = qs.map(function (q) {
      if (cd) { var v = pts(q)[me], n = +v || 0; return { ok: n > 0, who: n > 0 ? me : -1, none: v === 'x' || v == null || v === '-', t: q.t, pt: n }; }
      return { ok: !!q.ok, who: q.p >= 0 ? q.p : -1, none: !(q.p >= 0), t: q.t, pt: q.pt || 0 };
    });
    var out = [];
    // the numbers
    var right = res.filter(function (r) { return r.ok; }).length, streak = 0, run = 0;
    res.forEach(function (r) { run = r.ok ? run + 1 : 0; streak = Math.max(streak, run); });
    var times = res.filter(function (r) { return r.ok && r.t != null; }).map(function (r) { return +r.t; });
    var fast = times.length ? Math.min.apply(null, times) : null, avg = times.length ? times.reduce(function (a, b) { return a + b; }, 0) / times.length : null;
    if (solo || cd) {
      out.push(ui.stats([['Right', right + ' of ' + qs.length, Math.round(right / qs.length * 100) + '%'], streak >= 2 ? ['Best streak', streak, 'in a row'] : null,
        fast != null ? ['Fastest', fast.toFixed(1) + 's', avg != null && times.length > 1 ? 'average ' + avg.toFixed(1) + 's' : ''] : null]));
    }
    if (!solo) {
      // right answers per player
      var tally = P.map(function (n, i) {
        if (cd) { var r2 = 0; qs.forEach(function (q) { if ((+pts(q)[i] || 0) > 0) r2++; }); return { label: n, value: r2, max: qs.length, text: r2 + ' of ' + qs.length, color: ui.color(i) }; }
        var rr = arr(e.right)[i], as = arr(e.asked)[i];
        if (rr == null) { rr = 0; as = 0; qs.forEach(function (q) { if (q.p === i) { as++; if (q.ok) rr++; } }); }
        return { label: n, value: rr, max: Math.max(1, as || 0), text: rr + ' of ' + (as || 0), color: ui.color(i) };
      });
      out.push(ui.section('Right answers', ui.bars(tally), { icon: 'check' }));
    }
    // time per question: a bar each, green right, red wrong, the average right answer dashed
    var timed = (solo || cd) && res.some(function (r) { return r.t != null; }) && qs.length >= 3;
    if (timed) {
      var tmax = Math.max(5, Math.ceil(Math.max.apply(null, res.map(function (r) { return +r.t || 0; })) * 1.1)), W = 320, H = 96, L = 18, B = 14, bw = (W - L - 4) / qs.length;
      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Seconds taken on each question">';
      res.forEach(function (r, i) {
        var h = r.t != null ? Math.max(3, (+r.t) / tmax * (H - B - 6)) : 3, x = L + i * bw;
        svg += '<rect x="' + (x + bw * 0.14).toFixed(1) + '" y="' + (H - B - h).toFixed(1) + '" width="' + (bw * 0.72).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + Math.min(3, bw * 0.2).toFixed(1) + '" fill="' + (r.ok ? '#4ade80' : r.none ? 'rgba(255,255,255,.22)' : '#f87171') + '"/>';
        if (qs.length <= 20 || i % 5 === 4 || i === 0) svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 3) + '" text-anchor="middle" font-size="8" font-weight="800" fill="rgba(255,255,255,.45)" font-family="system-ui">' + (i + 1) + '</text>';
      });
      svg += '<text x="2" y="12" font-size="8" font-weight="800" fill="rgba(255,255,255,.45)" font-family="system-ui">' + tmax + 's</text><line x1="' + L + '" x2="' + (W - 4) + '" y1="6" y2="6" stroke="rgba(255,255,255,.08)"/>';
      if (avg != null) { var ay = H - B - avg / tmax * (H - B - 6); svg += '<line x1="' + L + '" x2="' + (W - 4) + '" y1="' + ay.toFixed(1) + '" y2="' + ay.toFixed(1) + '" stroke="#ffd447" stroke-width="1.2" stroke-dasharray="4 3"/>'; }
      svg += '</svg>';
      out.push(ui.section('Seconds per question', [el('div', { class: 'tv-chart', html: svg }), el('div', { class: 'tv-key', html: '<span><i style="background:#4ade80"></i>right</span><span><i style="background:#f87171"></i>wrong</span>' + (avg != null ? '<span><i class="ln"></i>average right answer</span>' : '') })], { icon: 'clock' }));
    }
    // question by question: tap one to see the card
    var card = el('div');
    function result(q) {
      if (cd) {
        var pp = pts(q);
        if (solo) {
          var v = pp[0], n = +v || 0;
          return n > 0 ? el('span', { class: 'tv-res ok' }, [el('i', { html: ui.icon('check') }), el('span', { text: '+' + n.toLocaleString() + (q.t != null ? ' in ' + q.t + 's' : '') })])
            : el('span', { class: 'tv-res no' }, [el('i', { html: ui.icon('close') }), el('span', { text: v === 'x' ? 'Ran out of time' : q.w ? 'Said “' + q.w + '”' : 'Not quite' })]);
        }
        var who = P.map(function (n2, k) { return { n: n2, v: pp[k], k: k }; }).filter(function (x) { return x.v != null && x.v !== '-'; }).sort(function (a, b) { return (+b.v || 0) - (+a.v || 0); });
        var box = el('div', { class: 'tv-who' });
        who.slice(0, 10).forEach(function (x) { var n3 = +x.v || 0; box.appendChild(el('span', { class: 'tv-pp ' + (n3 > 0 ? 'ok' : 'no'), text: x.n + ' ' + (n3 > 0 ? '+' + n3.toLocaleString() : 'missed') })); });
        if (who.length > 10) box.appendChild(el('span', { class: 'tv-pp no', text: '+' + (who.length - 10) + ' more' }));
        return box;
      }
      if (q.ok && q.p >= 0) return el('span', { class: 'tv-res ok' }, [el('i', { html: ui.icon('check') }), el('span', { text: (P.length > 1 ? (P[q.p] || '') + ' got it' : 'Got it') + (q.t != null ? ' in ' + q.t + 's' : '') + (q.pt ? ' · +' + q.pt + ' points' : '') })]);
      if (q.p >= 0) return el('span', { class: 'tv-res no' }, [el('i', { html: ui.icon('close') }), el('span', { text: (P.length > 1 ? (P[q.p] || '') + ' ' : '') + (q.w ? 'said “' + q.w + '”' : 'ran out of time') })]);
      return el('span', { class: 'tv-res no' }, [el('i', { html: ui.icon('close') }), el('span', { text: 'Nobody got it' })]);
    }
    function show(i) {
      var q = qs[i], choices = null;
      if (q.o) {
        var list = [{ t: q.a, ok: 1 }].concat(String(q.o).split('|').filter(Boolean).map(function (x) { return { t: x }; }));
        list.sort(function (a, b) { return String(a.t).localeCompare(String(b.t)); });
        choices = el('div', { class: 'tv-opts' }, list.map(function (c) {
          var bad = !c.ok && q.w && c.t === q.w;
          return el('div', { class: 'tv-opt' + (c.ok ? ' ok' : bad ? ' bad' : '') }, [c.ok ? el('i', { html: ui.icon('check') }) : bad ? el('i', { html: ui.icon('close') }) : null, el('span', { text: c.t })]);
        }));
      }
      var missed = !cd && q.m ? String(q.m).split('').map(function (x) { return P[+x]; }).filter(Boolean) : [];
      card.innerHTML = '';
      card.appendChild(el('div', { class: 'tv-q', style: { '--cc': ccol(q.k) } }, [
        el('div', { class: 'tv-top' }, [el('span', { class: 'tv-n', text: 'Q' + (i + 1) }), el('span', { class: 'tv-k', text: cn[q.k] || q.k })]),
        el('p', { text: q.q }),
        choices || el('div', { class: 'tv-a' }, [el('span', { class: 'tv-ans', text: q.a })]),
        result(q),
        missed.length ? el('span', { class: 'tv-miss', text: 'Buzzed wrong first: ' + missed.join(', ') }) : null
      ]));
    }
    var road = el('div', { class: 'tv-road' }), btns = [];
    res.forEach(function (r, i) {
      var col = r.ok ? (solo || cd ? '#22c55e' : ui.color(r.who)) : r.none && !cd ? '#4b5068' : '#ef4444';
      var b = el('button', { type: 'button', class: 'tv-rb' + (r.ok ? '' : ' miss'), style: { '--c': col }, html: '<b>' + (i + 1) + '</b><i>' + (r.t != null && r.ok ? (+r.t).toFixed(1) + 's' : '') + '</i>',
        'aria-label': 'Question ' + (i + 1) + (r.ok ? ', right' : ', missed'), onclick: function () { pick(i); } });
      btns.push(b); road.appendChild(b);
    });
    function pick(i) { btns.forEach(function (b, j) { b.classList.toggle('on', i === j); }); show(i); }
    pick(0);
    var key = solo || cd ? '<span><i style="background:#22c55e"></i>right</span><span><i style="background:#ef4444"></i>wrong</span>'
      : P.map(function (n, i) { return '<span><i style="background:' + ui.color(i) + '"></i>' + ui.esc(n) + ' got it</span>'; }).join('') + '<span><i style="background:#ef4444"></i>wrong</span><span><i style="background:#4b5068"></i>nobody</span>';
    out.push(ui.section('Question by question · tap one', [road, timed ? null : el('div', { class: 'tv-key', html: key }), card].filter(Boolean), { icon: 'help' }));
    if (d.n > qs.length) out.push(el('p', { class: 'tv-more', text: 'The first ' + qs.length + ' of ' + d.n + ' questions' }));
    // how each category went
    var cats = {}, ck = [];
    qs.forEach(function (q, i) { var c = cats[q.k]; if (!c) { c = cats[q.k] = { r: [] }; ck.push(q.k); } c.r.push(res[i].ok ? 1 : 0); });
    if (ck.length > 1 && ck.some(function (k) { return cats[k].r.length > 1; })) {
      var grid = el('div', { class: 'tv-cats' });
      ck.sort(function (a, b) { return cats[b].r.length - cats[a].r.length; }).forEach(function (k) {
        var c = cats[k], r3 = c.r.filter(Boolean).length;
        grid.appendChild(el('div', { class: 'tv-cat', style: { '--cc': ccol(k) } }, [
          el('b', { text: cn[k] || k }),
          el('span', { class: 'tv-pips', html: c.r.map(function (x) { return '<i class="' + (x ? 'y' : 'n') + '"></i>'; }).join('') }),
          el('small', { text: r3 + '/' + c.r.length })
        ]));
      });
      out.push(ui.section(cd && !solo ? 'Categories · ' + P[me] : 'Categories', grid, { icon: 'tiles' }));
    }
    return ui.wrap(out);
  });
  HistView.css('hv-trivia',
    '.tv-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:5px;}' +
    '.tv-cat{display:flex;align-items:center;gap:6px;padding:7px 9px;border-radius:10px;background:color-mix(in srgb,var(--cc) 16%,transparent);box-shadow:inset 3px 0 0 var(--cc);}' +
    '.tv-cat b{flex:1;min-width:0;font-size:.8rem;font-weight:900;line-height:1.15;}.tv-cat small{flex:none;font-size:.72rem;font-weight:900;color:var(--text-2);}' +
    '.tv-pips{display:flex;flex-wrap:wrap;gap:3px;flex:none;max-width:60px;}.tv-pips i{width:9px;height:9px;border-radius:50%;}.tv-pips i.y{background:#4ade80;}.tv-pips i.n{background:rgba(255,255,255,.18);}' +
    '.tv-q{position:relative;padding:12px 12px 12px 14px;border-radius:14px;background:linear-gradient(160deg,#1c2350,#141a3c);box-shadow:inset 4px 0 0 var(--cc),0 6px 14px -8px rgba(0,0,0,.7);color:#fff;display:flex;flex-direction:column;gap:8px;}' +
    '.tv-top{display:flex;align-items:center;gap:8px;}' +
    '.tv-n{font-family:var(--display);font-size:1rem;color:#ffd447;}' +
    '.tv-k{font-size:.64rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:999px;background:var(--cc);color:#fff;}' +
    '.tv-q p{margin:0;font-weight:800;font-size:.98rem;line-height:1.3;}' +
    '.tv-a{display:flex;}.tv-ans{padding:3px 9px;border-radius:8px;background:#1fa64a;color:#fff;font-weight:900;font-size:.84rem;}' +
    '.tv-opts{display:grid;grid-template-columns:1fr 1fr;gap:6px;}' +
    '.tv-opt{display:flex;align-items:center;gap:5px;min-height:38px;padding:6px 9px;border-radius:10px;background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);font-size:.82rem;font-weight:800;line-height:1.2;color:rgba(255,255,255,.62);}' +
    '.tv-opt i{display:flex;flex:none;}.tv-opt .ico{width:15px;height:15px;}' +
    '.tv-opt.ok{background:linear-gradient(180deg,#22b85a,#178a42);color:#fff;box-shadow:0 3px 0 #0f6a31;}' +
    '.tv-opt.bad{background:linear-gradient(180deg,#e5484d,#b4232a);color:#fff;box-shadow:0 3px 0 #85161c;}' +
    '.tv-res{display:flex;align-items:center;gap:5px;font-size:.8rem;font-weight:800;}.tv-res i{display:flex;}.tv-res .ico{width:14px;height:14px;}' +
    '.tv-res.ok{color:#86efac;}.tv-res.no{color:#fca5a5;}.tv-miss{font-size:.74rem;font-weight:700;color:rgba(255,255,255,.55);}' +
    '.tv-more{margin:0;text-align:center;color:var(--text-3);font-weight:800;font-size:.82rem;}' +
    '.tv-who{display:flex;flex-wrap:wrap;gap:4px;}.tv-pp{padding:2px 8px;border-radius:999px;font-size:.74rem;font-weight:900;}' +
    '.tv-pp.ok{background:rgba(74,222,128,.18);color:#86efac;}.tv-pp.no{background:rgba(255,255,255,.08);color:rgba(255,255,255,.55);}' +
    '.tv-road{display:flex;flex-wrap:wrap;gap:4px;}' +
    '.tv-rb{appearance:none;border:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;width:34px;height:38px;padding:0;border-radius:8px;font:inherit;color:#0e1a10;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 75%,#fff),var(--c));box-shadow:inset 0 -2px 0 rgba(0,0,0,.25);}' +
    '.tv-rb.miss{color:#fff;}' +
    '.tv-rb b{font-size:.76rem;font-weight:900;line-height:1;}.tv-rb i{font-style:normal;font-size:.56rem;font-weight:900;line-height:1;min-height:.56rem;opacity:.8;}' +
    '.tv-rb.on{outline:2.5px solid #fff;outline-offset:1.5px;}' +
    '.tv-key{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.72rem;font-weight:800;color:var(--text-3);}' +
    '.tv-key i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px;}.tv-key i.ln{height:0;border-top:2px dashed #ffd447;border-radius:0;vertical-align:3px;}' +
    '.tv-chart{border-radius:12px;padding:8px 8px 2px;background:#141a3c;line-height:0;}.tv-chart svg{width:100%;height:auto;display:block;}');

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
      var who = String(q.who || ''); if (who.length !== P.length) who = ''; var tot = (q.va || 0) + (q.vb || 0), pa = tot ? Math.round(q.va / tot * 100) : 50;
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
        qs.forEach(function (q) { var a = String(q.who || '').charAt(i), b = String(q.who || '').charAt(j); if (P.length === String(q.who || '').length && /[ab]/.test(a) && /[ab]/.test(b)) { both++; if (a === b) same++; } });
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

  // ── Mad Libs: the finished story, filled words highlighted, then the word pad as it was filled in blind ──
  R('madlibs', function (e, ui) {
    var el = ui.el, P = names(e), words = arr(e.words), by = arr(e.by), d = e.dt || {};
    if (!words.length) return null;
    var multi = P.length > 1, ty = arr(d.ty);
    var paper = el('div', { class: 'ml-paper' });
    paper.appendChild(el('div', { class: 'ml-band' }, [el('span', { text: 'Mad Libs' }), el('small', { text: words.length + ' blanks' })]));
    paper.appendChild(el('h3', { text: e.title || 'Mad Libs' }));
    var body = el('p', { class: 'ml-story' });
    function word(i) {
      var w = words[i] || '___', p = +by[i] || 0;
      return el('span', { class: 'ml-w', style: multi ? { '--c': ui.color(p) } : null }, [el('b', { text: w }), ty[i] ? el('small', { text: ty[i] }) : null]);
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
    var out = [];
    if (multi) out.push(ui.stats(P.map(function (n, i) { var c = words.filter(function (w, k) { return (+by[k] || 0) === i; }).length; return [n, c, c === 1 ? 'word' : 'words']; })));
    out.push(ui.section('The story', paper, { icon: 'book' }));
    // the pad: every blank as it was asked for, before anyone saw the story
    if (ty.length) {
      var pad = el('ol', { class: 'ml-pad' });
      words.forEach(function (w, i) {
        var p = +by[i] || 0;
        pad.appendChild(el('li', { style: multi ? { '--c': ui.color(p) } : null }, [el('i', { text: String(i + 1) }), el('span', { class: 'ln' }, [el('b', { text: w || '' }), el('small', { text: ty[i] || '' })])]));
      });
      var key = multi ? el('div', { class: 'ml-key', html: P.map(function (n, i) { return '<span><i style="background:' + ui.color(i) + '"></i>' + ui.esc(n) + '</span>'; }).join('') }) : null;
      out.push(ui.section('The words, filled in blind', [pad, key].filter(Boolean), { icon: 'pencil' }));
    } else if (multi) {
      out.push(ui.section('Who filled in what', ui.el('div', { class: 'ml-by' }, P.map(function (n, i) {
        var mine = words.filter(function (w, k) { return (+by[k] || 0) === i; });
        return el('div', { style: { '--c': ui.color(i) } }, [el('b', { text: n }), el('span', { text: mine.join(', ') || '–' })]);
      })), { icon: 'pencil' }));
    }
    return ui.wrap(out);
  });
  HistView.css('hv-madlibs',
    '.ml-paper{position:relative;padding:0 16px 16px;border-radius:6px;overflow:hidden;color:#2a2a3a;background:repeating-linear-gradient(180deg,transparent 0 37px,rgba(70,110,200,.13) 37px 38px),linear-gradient(180deg,#fffaf0,#f6eedb);box-shadow:0 10px 24px -8px rgba(0,0,0,.6);}' +
    '.ml-band{display:flex;align-items:center;justify-content:space-between;margin:0 -16px 10px;padding:7px 16px;background:linear-gradient(180deg,#e0344f,#b81f3a);color:#fff;box-shadow:inset 0 -3px 0 #ffd447;}' +
    '.ml-band span{font-family:var(--display);font-size:1.1rem;letter-spacing:.02em;}.ml-band small{font-size:.68rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;opacity:.85;}' +
    '.ml-paper h3{margin:0 0 6px;font-family:var(--display);font-weight:400;font-size:1.25rem;color:#c2304b;}' +
    '.ml-story{margin:0;font-size:.95rem;line-height:2.5;font-weight:600;white-space:pre-line;}' +
    '.ml-w{display:inline-flex;flex-direction:column;align-items:center;vertical-align:baseline;line-height:1.05;margin:0 1px;}' +
    '.ml-w b{font-family:var(--hand);font-size:1.18rem;font-weight:400;color:color-mix(in srgb,var(--c,var(--ink)) 72%,#1d1b2e);padding:0 3px;border-bottom:1.5px solid #2a2a3a;}' +
    '.ml-w small{font-size:.54rem;font-weight:800;color:#8a8796;letter-spacing:.02em;white-space:nowrap;}' +
    '.ml-only{line-height:2.4;}' +
    '.ml-pad{list-style:none;margin:0;padding:12px 12px 6px;display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;border-radius:6px;color:#2a2a3a;background:linear-gradient(180deg,#fffef8,#f4f1e4);box-shadow:inset 4px 0 0 #e0344f,0 8px 18px -10px rgba(0,0,0,.6);}' +
    '.ml-pad li{display:flex;align-items:flex-end;gap:6px;min-width:0;}' +
    '.ml-pad i{flex:none;width:16px;font-style:normal;font-size:.62rem;font-weight:900;color:#a29fae;text-align:right;padding-bottom:13px;}' +
    '.ml-pad .ln{flex:1;min-width:0;display:flex;flex-direction:column;}' +
    '.ml-pad b{font-family:var(--hand);font-weight:400;font-size:1.12rem;line-height:1.2;color:color-mix(in srgb,var(--c,#1f2a6b) 72%,#1d1b2e);border-bottom:1.5px solid #2a2a3a;padding:0 2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.ml-pad small{font-size:.56rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#8a8796;padding:2px 2px 4px;}' +
    '.ml-key{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.74rem;font-weight:800;color:var(--text-2);}.ml-key i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px;}' +
    '.ml-by{display:flex;flex-direction:column;gap:5px;font-size:.86rem;}.ml-by>div{display:flex;gap:8px;}.ml-by b{flex:none;color:var(--c);font-weight:900;}.ml-by span{color:var(--text-2);font-weight:600;}');

  // ── Riddle Stories: the casebook at a glance (tap a case), the detectives, each case file and its answer ──
  // dt.cs: [{t title, d deck, q story, a answer, h clues used, c the clues, s who solved (-1 nobody), r who read it, p points}]
  var DECKN = { E: 'Easy', C: 'Classic', T: 'Tricky', B: 'Brain' };
  R('riddlestories', function (e, ui) {
    var el = ui.el, P = names(e), d = e.dt;
    if (!d || !arr(d.cs).length) return null;
    var cs = arr(d.cs), group = P.length > 1, list = el('div', { class: 'rs-list' }), pages = [];
    cs.forEach(function (c, i) {
      var solved = c.s >= 0;
      var stamp = el('span', { class: 'rs-stamp ' + (solved ? 'ok' : 'no'), text: solved ? 'Solved' : 'Unsolved' });
      var meta = [];
      if (c.r >= 0 && P[c.r]) meta.push('Read by ' + P[c.r]);
      if (solved && group && P[c.s]) meta.push('Cracked by ' + P[c.s]);
      meta.push(c.h ? c.h + (c.h === 1 ? ' clue' : ' clues') : 'No clues');
      if (c.p) meta.push('+' + c.p + (c.p === 1 ? ' point' : ' points'));
      var env = el('details', { class: 'rs-env' }, [el('summary', { html: ui.icon('eye') + '<span>Open the envelope</span>' }), el('p', { text: c.a || '' })]);
      var page = el('div', { class: 'rs-case' }, [
        el('span', { class: 'rs-tab', text: 'Case ' + (i + 1) + (DECKN[c.d] ? ' · ' + DECKN[c.d] : '') }),
        el('div', { class: 'rs-page' }, [
          stamp,
          el('h5', { text: c.t || '' }),
          el('p', { class: 'rs-q', text: c.q || '' }),
          c.c ? el('p', { class: 'rs-clues', text: 'Clues used: ' + c.c }) : null,
          el('small', { class: 'rs-meta', text: meta.join(' · ') }),
          env
        ])
      ]);
      pages.push(page); list.appendChild(page);
    });
    var n = cs.length, ok = cs.filter(function (c) { return c.s >= 0; }).length, clean = cs.filter(function (c) { return c.s >= 0 && !c.h; }).length;
    var out = [ui.stats([['Solved', ok + ' / ' + n], ['No clues', clean, 'cracked cold'], ['Clues used', cs.reduce(function (a, c) { return a + (c.h || 0); }, 0)]])];
    // the casebook: a folder per case, stamped by who cracked it, a dot per clue it took; tap one to open it below
    var shelf = el('div', { class: 'rs-shelf' }), fs = [];
    cs.forEach(function (c, i) {
      var solved = c.s >= 0, col = !solved ? '#b3261e' : group ? ui.color(c.s) : '#1d7a3c';
      var dots = ''; for (var k = 0; k < Math.min(4, c.h || 0); k++) dots += '<i></i>';
      var b = el('button', { type: 'button', class: 'rs-f' + (solved ? '' : ' no'), style: { '--c': col }, 'aria-label': 'Case ' + (i + 1) + ': ' + (solved ? 'solved' : 'unsolved') + (c.h ? ', ' + c.h + ' clues' : ''),
        html: '<b>' + (i + 1) + '</b><span class="dots">' + dots + '</span>' + (solved ? '' : '<s></s>'), onclick: function () {
          fs.forEach(function (x, j) { x.classList.toggle('on', i === j); });
          pages.forEach(function (x, j) { x.classList.toggle('hl', i === j); });
          try { pages[i].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (er) {}
        } });
      fs.push(b); shelf.appendChild(b);
    });
    var key = (group ? P.map(function (nm, i) { return '<span><i style="background:' + ui.color(i) + '"></i>' + ui.esc(nm) + '</span>'; }).join('') : '<span><i style="background:#1d7a3c"></i>solved</span>') +
      '<span><i style="background:#b3261e"></i>unsolved</span><span><i class="dot"></i>a clue</span>';
    out.push(ui.section('The casebook · tap a case', [shelf, el('div', { class: 'rs-key', html: key })], { icon: 'book' }));
    // the detectives: cases cracked and points each
    if (group) {
      out.push(ui.section('Detectives', ui.bars(P.map(function (nm, i) {
        var mine = cs.filter(function (c) { return c.s === i; }), pts = mine.reduce(function (a, c) { return a + (c.p || 0); }, 0);
        return { label: nm, value: mine.length, max: n, text: mine.length + (mine.length === 1 ? ' case' : ' cases') + (pts ? ' · ' + pts + ' pts' : ''), color: ui.color(i) };
      })), { icon: 'users' }));
    }
    out.push(ui.section('The case files', list, { icon: 'book' }));
    return ui.wrap(out);
  });
  HistView.css('hv-riddle',
    '.rs-list{display:flex;flex-direction:column;gap:18px;padding-top:10px;}' +
    '.rs-case{position:relative;transition:transform .25s;}' +
    '.rs-case.hl .rs-page{box-shadow:0 0 0 3px #ffd447,0 10px 20px -8px rgba(0,0,0,.7);}' +
    '.rs-tab{position:absolute;left:12px;top:-13px;height:18px;padding:2px 12px 0;border-radius:7px 7px 0 0;background:#efdcaa;color:#3a2a14;font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;}' +
    '.rs-page{position:relative;padding:12px 14px 12px;border-radius:3px 10px 10px 10px;color:#3a2a14;background:linear-gradient(170deg,#efdcaa,#dcc286);box-shadow:0 1px 0 rgba(255,255,255,.4) inset,0 8px 18px -8px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:6px;transition:box-shadow .25s;}' +
    '.rs-page h5{margin:0;padding-right:80px;font-family:"American Typewriter","Courier Prime",Georgia,serif;font-size:1rem;font-weight:700;}' +
    '.rs-q{margin:0;font-family:"American Typewriter","Courier Prime",Georgia,serif;font-size:.84rem;line-height:1.4;}' +
    '.rs-clues{margin:0;font-family:var(--hand);font-size:.98rem;line-height:1.2;color:#1f2a6b;}' +
    '.rs-meta{font-size:.7rem;font-weight:800;color:#7a6236;}' +
    '.rs-stamp{position:absolute;right:10px;top:10px;transform:rotate(-8deg);padding:2px 7px;border:2px solid currentColor;border-radius:4px;font-family:var(--display);font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;opacity:.85;}' +
    '.rs-stamp.ok{color:#1d7a3c;}.rs-stamp.no{color:#b3261e;}' +
    '.rs-env{border-radius:8px;background:#fbf4e1;box-shadow:0 1px 3px rgba(0,0,0,.18);}' +
    '.rs-env summary{display:flex;align-items:center;gap:6px;padding:7px 10px;cursor:pointer;list-style:none;font-size:.78rem;font-weight:900;color:#7a4f12;}.rs-env summary::-webkit-details-marker{display:none;}.rs-env summary .ico{width:15px;height:15px;}' +
    '.rs-env[open] summary span::after{content:"";}.rs-env p{margin:0;padding:0 10px 9px;font-family:var(--hand);font-size:1.05rem;line-height:1.25;color:#1f2a6b;}' +
    '.rs-shelf{display:flex;flex-wrap:wrap;gap:8px 6px;padding:14px 10px 10px;border-radius:12px;background:linear-gradient(180deg,#5a3a22,#3e2716);box-shadow:inset 0 -6px 0 #2c1b0f,inset 0 2px 0 rgba(255,255,255,.08);}' +
    '.rs-f{appearance:none;border:0;cursor:pointer;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:space-between;width:40px;height:50px;padding:7px 0 5px;border-radius:2px 7px 4px 4px;font:inherit;color:#3a2a14;background:linear-gradient(170deg,#efdcaa,#d8bd7f);box-shadow:inset 0 4px 0 var(--c),0 3px 6px rgba(0,0,0,.45);}' +
    '.rs-f::before{content:"";position:absolute;left:4px;top:-6px;width:16px;height:7px;border-radius:4px 4px 0 0;background:#e3cd96;}' +
    '.rs-f b{font-family:"American Typewriter","Courier Prime",Georgia,serif;font-size:.95rem;line-height:1;}' +
    '.rs-f .dots{display:flex;gap:2px;min-height:6px;}.rs-f .dots i{width:6px;height:6px;border-radius:50%;background:#1f2a6b;}' +
    '.rs-f s{position:absolute;inset:auto 4px 17px;height:2.5px;background:#b3261e;transform:rotate(-24deg);border-radius:2px;}' +
    '.rs-f.on{outline:2.5px solid #ffd447;outline-offset:2px;}' +
    '.rs-key{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.72rem;font-weight:800;color:var(--text-2);}.rs-key i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px;}.rs-key i.dot{width:7px;height:7px;border-radius:50%;background:#8fa0ff;vertical-align:0;}');

  // ── Conversation Starters: how long each card kept the table talking, then the cards themselves ──
  // e.cards: [{q, c category, who answered, star, s seconds on the card (newer games)}]
  var CONV_CAT = { family: ['Family', '#e8833a'], wouldyou: ['Would you…', '#2f9e6e'], memories: ['Memories', '#3d7fd6'], dreams: ['Dreams', '#c2479a'], funny: ['Funny', '#e0a21a'],
    deep: ['Deep', '#7b5bd6'], you: ['About you', '#1f9bb0'], kids: ['Kids', '#e5534b'], colorado: ['Colorado', '#4a7a5a'] };
  function mmss(s) { s = Math.round(+s || 0); var m = Math.floor(s / 60), r = s % 60; return m ? m + ':' + (r < 10 ? '0' : '') + r : r + 's'; }
  R('conversation', function (e, ui) {
    var el = ui.el, P = names(e), cards = arr(e.cards);
    if (!cards.length) return null;
    function cat(c) { return CONV_CAT[c.c] || [c.c || '', '#64748b']; }
    var timed = cards.filter(function (c) { return c.s > 0; }), total = timed.reduce(function (a, c) { return a + c.s; }, 0);
    var longest = null; timed.forEach(function (c) { if (!longest || c.s > longest.s) longest = c; });
    var stars = cards.filter(function (c) { return c.star; }).length;
    var byCat = {}; cards.forEach(function (c) { byCat[c.c] = (byCat[c.c] || 0) + 1; });
    var out = [ui.stats([['Cards', cards.length, stars ? stars + ' starred' : ''], timed.length ? ['Talk time', mmss(total)] : null, longest && timed.length > 1 ? ['Longest talk', mmss(longest.s), 'on one card'] : null,
      ['Topics', timed.length ? null : Object.keys(byCat).length]])];
    // the cards, in order, as a deck laid out on the table
    var list = el('div', { class: 'cv-cards' }), nodes = [];
    cards.forEach(function (c, i) {
      var ct = cat(c), pi = c.who ? P.indexOf(c.who) : -1;
      var n = el('div', { class: 'cv-card', style: { '--cc': ct[1], '--r': (i % 2 ? .4 : -.4) + 'deg' } }, [
        el('div', { class: 'cv-top' }, [el('span', { class: 'cv-k', text: ct[0] }), c.s > 0 ? el('span', { class: 'cv-t', html: ui.icon('clock') + '<span>' + mmss(c.s) + '</span>' }) : null, c.star ? el('span', { class: 'cv-star', html: ui.icon('star') }) : null]),
        el('p', { text: c.q }),
        c.who ? el('span', { class: 'cv-who', style: { '--c': ui.color(pi < 0 ? 0 : pi) } }, [el('i', { text: c.who.charAt(0).toUpperCase() }), el('span', { text: c.who })]) : null
      ]);
      nodes.push(n); list.appendChild(n);
    });
    // how the talk went: a bar per card, as tall as the talk it started, in its topic's colour; tap one to find the card
    if (timed.length >= 2) {
      var mx = Math.max.apply(null, timed.map(function (c) { return c.s; })), bars = el('div', { class: 'cv-bars' }), bs = [];
      cards.forEach(function (c, i) {
        var h = c.s > 0 ? Math.max(8, Math.round(c.s / mx * 92)) : 4;
        var b = el('button', { type: 'button', class: 'cv-bar' + (c.star ? ' star' : ''), style: { '--cc': cat(c)[1], height: h + 'px' }, title: mmss(c.s) + ' · ' + c.q, 'aria-label': 'Card ' + (i + 1) + ', ' + (c.s ? mmss(c.s) : 'no time'), onclick: function () {
          bs.forEach(function (x, j) { x.classList.toggle('on', i === j); });
          nodes.forEach(function (x, j) { x.classList.toggle('hl', i === j); });
          try { nodes[i].scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (er) {}
        } });
        bs.push(b); bars.appendChild(b);
      });
      var key = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; }).map(function (k) { var ct = CONV_CAT[k] || [k, '#64748b']; return '<span><i style="background:' + ct[1] + '"></i>' + ui.esc(ct[0]) + ' ' + byCat[k] + '</span>'; }).join('');
      out.push(ui.section('How long each card ran · tap one', [el('div', { class: 'cv-chart' }, [bars, el('div', { class: 'cv-axis' }, [el('span', { text: 'First card' }), el('span', { text: 'Last card' })])]), el('div', { class: 'cv-key', html: key })], { icon: 'chart' }));
    } else {
      out.push(ui.chips(Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; }).map(function (k) { return { t: (CONV_CAT[k] ? CONV_CAT[k][0] : k) + ' ' + byCat[k], c: CONV_CAT[k] ? CONV_CAT[k][1] : null }; })));
    }
    // who answered
    if (P.length > 1 && timed.length && cards.some(function (c) { return c.who; })) {
      out.push(ui.section('Who answered', ui.bars(P.map(function (n, i) {
        var k = cards.filter(function (c) { return c.who === n; }), t = k.reduce(function (a, c) { return a + (c.s || 0); }, 0);
        return { label: n, value: k.length, text: k.length + (t ? ' · ' + mmss(t) : ''), color: ui.color(i) };
      })), { icon: 'users' }));
    }
    out.push(ui.section('The cards', list, { icon: 'cards' }));
    return ui.wrap(out);
  });
  HistView.css('hv-conv',
    '.cv-cards{display:flex;flex-direction:column;gap:8px;}' +
    '.cv-card{padding:10px 12px 11px;border-radius:12px;background:#fffdf7;color:#22222e;transform:rotate(var(--r));box-shadow:inset 0 5px 0 var(--cc),0 6px 14px -8px rgba(0,0,0,.7);display:flex;flex-direction:column;gap:6px;transition:box-shadow .25s,transform .25s;}' +
    '.cv-card.hl{transform:rotate(0) scale(1.02);box-shadow:inset 0 5px 0 var(--cc),0 0 0 3px #ffd447,0 10px 20px -8px rgba(0,0,0,.8);}' +
    '.cv-top{display:flex;align-items:center;gap:8px;padding-top:2px;}' +
    '.cv-k{font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--cc);}' +
    '.cv-t{display:inline-flex;align-items:center;gap:3px;font-size:.7rem;font-weight:800;color:#7a7588;}.cv-t .ico{width:12px;height:12px;}' +
    '.cv-star{margin-left:auto;display:flex;color:#e0a21a;}.cv-star .ico{width:16px;height:16px;fill:currentColor;}' +
    '.cv-card p{margin:0;font-family:var(--display);font-weight:400;font-size:1.02rem;line-height:1.25;}' +
    '.cv-who{display:flex;align-items:center;gap:6px;font-size:.76rem;font-weight:800;color:#5a5a6e;}' +
    '.cv-who i{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--c);color:#fff;font-style:normal;font-size:.62rem;font-weight:900;}' +
    '.cv-chart{padding:10px 10px 6px;border-radius:14px;background:linear-gradient(180deg,#2a1f18,#1c1410);box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);}' +
    '.cv-bars{display:flex;align-items:flex-end;gap:3px;height:100px;}' +
    '.cv-bar{appearance:none;border:0;cursor:pointer;flex:1 1 0;max-width:28px;min-width:4px;padding:0;border-radius:4px 4px 1px 1px;background:linear-gradient(180deg,color-mix(in srgb,var(--cc) 70%,#fff),var(--cc));position:relative;}' +
    '.cv-bar.star::after{content:"";position:absolute;left:50%;top:-8px;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:#ffd447;}' +
    '.cv-bar.on{outline:2px solid #fff;outline-offset:1px;}' +
    '.cv-axis{display:flex;justify-content:space-between;margin-top:5px;font-size:.62rem;font-weight:800;color:rgba(255,255,255,.4);}' +
    '.cv-key{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.72rem;font-weight:800;color:var(--text-2);}.cv-key i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px;}');

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

  // ── Apples to Apples: the race for cards, then every round on the table (tap one) ──
  // dt: {dk: 'a2a'|'cah', k: kinds 'gr' (prompt, answer: g green, r red, b black, w white), t: target, ru: house rules,
  //      gh: ghost's cards (-1 no ghost), rs: [{j judge, b winner (-1 ghost), p prompt, d what the prompt card says,
  //      w winning card, o the other cards: 'player:card' per line}]}
  // The grown-up deck's card text shows only on a device where that deck has been unlocked.
  R('applestoapples', function (e, ui) {
    var el = ui.el, P = names(e), d = e.dt;
    if (!d || !arr(d.rs).length) return null;
    var cah = d.dk === 'cah', open = true, rs = arr(d.rs);
    if (cah) { try { open = localStorage.getItem('a2a_cah') === '1'; } catch (x) { open = false; } }
    var kinds = String(d.k || (cah ? 'bw' : 'gr')), pk = kinds.charAt(0) || 'g', ak = kinds.charAt(1) || 'r';
    var ghost = cah && open ? 'Rando Cardrissian' : 'Ghost', out = [];
    var GH = '#9aa3b8';
    function wname(b) { return b >= 0 ? P[b] || '?' : ghost; }
    function wcol(b) { return b >= 0 ? ui.color(b) : GH; }
    // how many cards each player won
    var tally = P.map(function (n, i) { return { label: n, value: 0, color: ui.color(i) }; });
    if (d.gh >= 0) tally.push({ label: ghost, value: 0, color: GH });
    rs.forEach(function (r) { var k = r.b >= 0 ? r.b : d.gh >= 0 ? P.length : -1; if (tally[k]) tally[k].value++; });
    out.push(ui.stats([['Rounds', rs.length], ['To win', d.t], ['House rules', d.ru || 'Classic']]));
    // the race: cards won after each round, one line per player
    if (rs.length >= 3) {
      var who = tally.map(function () { return 0; }), pts = [who.slice()];
      rs.forEach(function (r) { var k = r.b >= 0 ? r.b : d.gh >= 0 ? P.length : -1; if (who[k] != null) who[k]++; pts.push(who.slice()); });
      var top = Math.max(d.t || 1, Math.max.apply(null, who)), W = 320, H = 120, L = 18, Rr = 26, T = 8, B = 16, n = pts.length - 1;
      var x = function (i) { return L + i * (W - L - Rr) / n; }, y = function (v) { return T + (top - v) * (H - T - B) / top; };
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Cards won after each round">';
      for (var g = 1; g < top; g++) s += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="rgba(255,255,255,.06)"/>';
      if (d.t) s += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y(d.t) + '" y2="' + y(d.t) + '" stroke="#ffd447" stroke-width="1.4" stroke-dasharray="5 4"/><text x="' + (L - 4) + '" y="' + (y(d.t) + 3) + '" text-anchor="end" font-size="9" font-weight="900" fill="#ffd447" font-family="system-ui">' + d.t + '</text>';
      s += '<text x="' + L + '" y="' + (H - 3) + '" font-size="9" font-weight="800" fill="rgba(255,255,255,.45)" font-family="system-ui">Round 1</text><text x="' + (W - Rr) + '" y="' + (H - 3) + '" text-anchor="end" font-size="9" font-weight="800" fill="rgba(255,255,255,.45)" font-family="system-ui">Round ' + n + '</text>';
      tally.forEach(function (t, p) {
        var line = ''; pts.forEach(function (r, i) { var X = x(i).toFixed(1), Y = y(r[p]).toFixed(1); line += (i ? ' L' + X + ' ' + y(pts[i - 1][p]).toFixed(1) + ' L' : 'M') + X + ' ' + Y; });
        s += '<path d="' + line + '" fill="none" stroke="' + t.color + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" opacity=".95" transform="translate(0 ' + ((p - (tally.length - 1) / 2) * 1.6).toFixed(1) + ')"/>';
        s += '<circle cx="' + x(n) + '" cy="' + y(pts[n][p]) + '" r="4" fill="' + t.color + '" stroke="#16102e" stroke-width="1.5"/>';
      });
      s += '</svg>';
      out.push(ui.section(cah && open ? 'Black cards won' : 'Cards won', [el('div', { class: 'aa-chart', html: s }),
        el('div', { class: 'aa-key', html: tally.map(function (t) { return '<span><i style="background:' + t.color + '"></i>' + ui.esc(t.label) + ' <b>' + t.value + '</b></span>'; }).join('') })], { icon: 'trophy' }));
    } else out.push(ui.section(cah && open ? 'Black cards won' : 'Cards won', ui.bars(tally.map(function (t) { return { label: t.label, value: t.value, max: d.t, text: String(t.value), color: t.color }; })), { icon: 'trophy' }));
    if (!open) { out.push(el('p', { class: 'aa-note', text: 'The cards from this game show on devices where its deck is turned on.' })); return ui.wrap(out); }
    // a card as it looks on the table
    function aCard(kind, text, o) {
      o = o || {};
      if (kind === 'b') return el('div', { class: 'aa-c k' }, [el('span', { class: 'tx', html: blackText(text, o.fill) })]);
      if (kind === 'w') return el('div', { class: 'aa-c w' + (o.win ? ' win' : '') }, [el('span', { class: 'tx', text: text })]);
      return el('div', { class: 'aa-c ' + kind + (o.win ? ' win' : '') + (o.big ? ' big' : '') }, [el('b', { text: text }), o.sub ? el('small', { text: o.sub }) : null]);
    }
    // the black card read out with the winning white card in its blanks
    function blackText(t, fill) {
      t = String(t || ''); var parts = String(fill || '').split(' / '), k = 0;
      var h = ui.esc(t).replace(/_+/g, function () { var f = parts[k++]; return f ? '<u>' + ui.esc(f.replace(/\.$/, '')) + '</u>' : '_____'; });
      return h;
    }
    var view = el('div');
    function show(i) {
      var r = rs[i], kids = [], others = String(r.o || '').split('\n').filter(Boolean).map(function (x) { var c = x.indexOf(':'); return { p: +x.slice(0, c), a: x.slice(c + 1) }; });
      kids.push(el('div', { class: 'aa-top' }, [el('span', { class: 'aa-n', text: 'Round ' + (i + 1) }), el('span', { text: (cah ? 'Card Czar ' : 'Judge ') + (P[r.j] || '?') }), el('span', { class: 'aa-w', style: { '--c': wcol(r.b) }, text: wname(r.b) + ' won' })]));
      kids.push(el('div', { class: 'aa-prompt' }, [aCard(pk, r.p, { big: true, sub: r.d, fill: r.w })]));
      var hand = el('div', { class: 'aa-hand' });
      var all = [{ p: r.b, a: r.w, win: true }].concat(others);
      all.forEach(function (x, k) {
        hand.appendChild(el('div', { class: 'aa-play' + (x.win ? ' win' : ''), style: { '--r': ((k - (all.length - 1) / 2) * 2.2).toFixed(1) + 'deg' } }, [
          aCard(ak, x.a, { win: x.win }),
          el('span', { class: 'aa-tag', style: { '--c': wcol(x.p) } }, [x.win ? el('i', { html: ui.icon('trophy') }) : null, el('span', { text: wname(x.p) })])
        ]));
      });
      kids.push(hand);
      if (!others.length && rs.some(function (q) { return q.o; }) === false) kids.push(el('p', { class: 'aa-note', text: 'This game saved only the winning card.' }));
      view.innerHTML = ''; view.appendChild(el('div', { class: 'aa-tbl' + (cah ? ' cah' : '') }, kids));
    }
    var road = el('div', { class: 'aa-road' }), btns = [];
    rs.forEach(function (r, i) {
      var b = el('button', { type: 'button', class: 'aa-rb', style: { '--c': wcol(r.b) }, text: String(i + 1), title: 'Round ' + (i + 1) + ': ' + wname(r.b) + ' won', 'aria-label': 'Round ' + (i + 1) + ', ' + wname(r.b) + ' won', onclick: function () { pick(i); } });
      btns.push(b); road.appendChild(b);
    });
    function pick(i) { btns.forEach(function (b, j) { b.classList.toggle('on', i === j); }); show(i); }
    pick(rs.length - 1);
    out.push(ui.section('Every round · tap one', [road, view], { icon: 'cards' }));
    return ui.wrap(out);
  });
  HistView.css('hv-a2a',
    '.aa-chart{border-radius:12px;padding:8px 8px 2px;background:#1a1438;line-height:0;}.aa-chart svg{width:100%;height:auto;display:block;}' +
    '.aa-key{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.74rem;font-weight:800;color:var(--text-2);}' +
    '.aa-key i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px;}.aa-key b{color:var(--text);margin-left:2px;}' +
    '.aa-road{display:flex;flex-wrap:wrap;gap:4px;}' +
    '.aa-rb{appearance:none;border:0;cursor:pointer;width:30px;height:30px;padding:0;border-radius:7px;font:inherit;font-size:.74rem;font-weight:900;color:#16102e;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 75%,#fff),var(--c));box-shadow:inset 0 -2px 0 rgba(0,0,0,.25);}' +
    '.aa-rb.on{outline:2.5px solid #fff;outline-offset:1.5px;}' +
    '.aa-tbl{display:flex;flex-direction:column;gap:12px;padding:12px 10px 14px;border-radius:16px;background:radial-gradient(120% 90% at 50% 20%,#2f8a4a,#145a2a 75%);box-shadow:inset 0 0 0 3px rgba(0,0,0,.18),inset 0 0 24px rgba(0,0,0,.45),0 10px 22px -10px rgba(0,0,0,.8);}' +
    '.aa-tbl.cah{background:radial-gradient(120% 90% at 50% 20%,#3a3a44,#17171d 75%);}' +
    '.aa-top{display:flex;align-items:center;gap:8px;font-size:.74rem;font-weight:800;color:rgba(255,255,255,.75);}' +
    '.aa-n{font-weight:900;color:#fff;}.aa-w{margin-left:auto;padding:2px 9px;border-radius:999px;background:var(--c);color:#16102e;font-weight:900;}' +
    '.aa-prompt{display:flex;justify-content:center;}' +
    '.aa-hand{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 8px;}' +
    '.aa-play{display:flex;flex-direction:column;align-items:center;gap:5px;transform:rotate(var(--r));}' +
    '.aa-play.win{transform:translateY(-6px);z-index:1;}' +
    '.aa-tag{display:inline-flex;align-items:center;gap:3px;max-width:96px;padding:1px 7px;border-radius:999px;background:var(--c);color:#16102e;font-size:.66rem;font-weight:900;}' +
    '.aa-tag span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.aa-tag .ico{width:11px;height:11px;}' +
    '.aa-c{position:relative;display:flex;flex-direction:column;gap:4px;width:92px;min-height:118px;padding:9px 8px;border-radius:9px;box-sizing:border-box;font-size:.8rem;line-height:1.2;box-shadow:0 5px 12px -5px rgba(0,0,0,.75);}' +
    '.aa-c b{font-family:var(--display);font-weight:400;font-size:1.02rem;line-height:1.1;overflow-wrap:anywhere;}' +
    '.aa-c small{font-size:.66rem;font-weight:700;opacity:.85;line-height:1.25;}' +
    '.aa-c.big{width:150px;min-height:96px;}.aa-c.big b{font-size:1.4rem;}' +
    '.aa-c.g{color:#fff;background:linear-gradient(170deg,#3aae52,#16692c);box-shadow:inset 0 0 0 3px #f4fff0,0 5px 12px -5px rgba(0,0,0,.75);}' +
    '.aa-c.r{color:#fff;background:linear-gradient(170deg,#e8344b,#a10d25);box-shadow:inset 0 0 0 3px #fff4e8,0 5px 12px -5px rgba(0,0,0,.75);}' +
    '.aa-c.win{box-shadow:inset 0 0 0 3px #fff4e8,0 0 0 3px #ffd447,0 8px 18px -4px rgba(0,0,0,.8);}' +
    '.aa-c.g.win{box-shadow:inset 0 0 0 3px #f4fff0,0 0 0 3px #ffd447,0 8px 18px -4px rgba(0,0,0,.8);}' +
    '.aa-c.k{width:min(100%,240px);min-height:120px;color:#fff;background:#111;font:700 .95rem/1.3 "Helvetica Neue",Helvetica,Arial,sans-serif;padding:12px;}' +
    '.aa-c.k u{text-decoration:none;border-bottom:2px solid #fff;padding:0 2px;}' +
    '.aa-c.w{color:#111;background:#fff;font:700 .78rem/1.25 "Helvetica Neue",Helvetica,Arial,sans-serif;}' +
    '.aa-c.w.win{box-shadow:0 0 0 3px #ffd447,0 8px 18px -4px rgba(0,0,0,.8);}' +
    '.aa-note{margin:0;color:var(--text-3);font-weight:700;font-size:.84rem;}' +
    '.aa-tbl .aa-note{color:rgba(255,255,255,.6);text-align:center;font-size:.76rem;}');
})();
