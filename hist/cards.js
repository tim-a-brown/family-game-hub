'use strict';
// History views: cards
(function () {
  if (!window.HistView) return;
  var R = HistView.register;
  function K() { return window.Kit; }

  // ── Shared bits for card games ──────────────────────────────────────────
  var FELT = {
    hearts: ['#6e1f33', '#4a1222', '#360b18'], spades: ['#24407a', '#152a55', '#0e1d3f'], euchre: ['#188a5c', '#0d5c3c', '#0a4a30'],
    cribbage: ['#188a5c', '#0d5c3c', '#0a4a30'], gin: ['#147a74', '#0b524e', '#073c39'], sol: ['#188a5c', '#0d5c3c', '#0a4a30'],
    fc: ['#1f6b86', '#11475c', '#0b3446'], pyr: ['#6f6a34', '#4a461f', '#353215'], jr: ['#167662', '#0a4a40', '#06302c'], ps: ['#7a1f2a', '#521219', '#3c0c12']
  };
  var GL = { s: '♠', h: '♥', d: '♦', c: '♣' }, SN = { s: 'Spades', h: 'Hearts', d: 'Diamonds', c: 'Clubs' };
  function parse(code) {
    var m = /^(10|[2-9TJQKA])([shdc])$/i.exec(String(code || '').trim());
    return m ? { r: m[1].toUpperCase() === 'T' ? '10' : m[1].toUpperCase(), s: m[2].toLowerCase() } : null;
  }
  function label(code) { var c = parse(code); return c ? c.r + GL[c.s] : String(code || ''); }
  function red(s) { return s === 'h' || s === 'd'; }
  // one card element at width w; code '??' = face down
  function card(code, w, cls) {
    var c = parse(code), n = c ? K().card(c.r, c.s) : K().card('A', 's', { back: true });
    if (w) n.style.setProperty('--cw', w + 'px');
    if (cls) cls.split(' ').forEach(function (x) { if (x) n.classList.add(x); });
    return n;
  }
  // a row of cards: o.w width, o.fan overlap, o.hl codes to ring, o.dim codes to fade, o.cls per-card class fn
  function row(codes, o) {
    o = o || {}; var box = K().el('div', { class: 'hvc-row' + (o.fan ? ' fan' : '') + (o.cls2 ? ' ' + o.cls2 : '') });
    if (o.w) box.style.setProperty('--cw', o.w + 'px');
    if (o.ov) box.style.setProperty('--ov', String(o.ov));
    [].concat(codes || []).forEach(function (c, i) {
      var extra = (o.hl && o.hl.indexOf(c) >= 0 ? ' hv-hl' : '') + (o.dim && o.dim.indexOf(c) >= 0 ? ' dim' : '') + (o.cls ? ' ' + (o.cls(c, i) || '') : '');
      box.appendChild(card(c, o.w, extra));
    });
    return box;
  }
  function felt(kind, kids, cls) {
    var f = FELT[kind] || FELT.sol;
    return K().el('div', { class: 'hvc-felt' + (cls ? ' ' + cls : ''), style: { '--fa': f[0], '--fb': f[1], '--fc': f[2] } }, [].concat(kids).filter(Boolean));
  }
  // a labelled group inside a felt panel
  function grp(title, node, sub) {
    return K().el('div', { class: 'hvc-grp' }, [title ? K().el('div', { class: 'hvc-cap', text: title }) : null, node, sub ? K().el('div', { class: 'hvc-sub', text: sub }) : null]);
  }
  function suitTag(s) { return K().el('span', { class: 'hvc-suit' + (red(s) ? ' red' : ''), text: GL[s] || '' }); }
  function names(e) { return (e.players || []).map(function (p) { return p.name; }); }
  function first(n) { return String(n || '').split(' & ')[0]; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  // a step line chart: series = [{pts:[y...], color}], o: {w,h,max,lines:[{y,label}], xmarks:[x]}
  function chart(series, o) {
    o = o || {}; var W = o.w || 320, H = o.h || 150, pl = 26, pr = 8, pt = 10, pb = 18;
    var n = Math.max.apply(null, series.map(function (s) { return s.pts.length; }).concat([2])), mx = o.max || Math.max.apply(null, series.map(function (s) { return Math.max.apply(null, s.pts.concat([1])); }));
    function X(i) { return pl + (W - pl - pr) * i / Math.max(1, n - 1); }
    function Y(v) { return pt + (H - pt - pb) * (1 - v / mx); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + K().esc(o.aria || 'Chart') + '">';
    (o.xmarks || []).forEach(function (x) { s += '<line x1="' + X(x) + '" x2="' + X(x) + '" y1="' + pt + '" y2="' + (H - pb) + '" stroke="rgba(255,255,255,.08)" stroke-width="1"/>'; });
    (o.lines || []).forEach(function (l) {
      s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(l.y) + '" y2="' + Y(l.y) + '" stroke="' + (l.c || 'rgba(255,255,255,.22)') + '" stroke-dasharray="3 3" stroke-width="1"/>';
      s += '<text x="' + (pl - 4) + '" y="' + Y(l.y) + '" text-anchor="end" dominant-baseline="central" font-size="9" font-weight="700" fill="rgba(255,255,255,.6)" font-family="system-ui">' + K().esc(l.label) + '</text>';
    });
    series.forEach(function (sr) {
      if (!sr.pts.length) return;
      var d = 'M' + X(0) + ' ' + Y(sr.pts[0]);
      for (var i = 1; i < sr.pts.length; i++) d += sr.step ? ' H' + X(i) + ' V' + Y(sr.pts[i]) : ' L' + X(i) + ' ' + Y(sr.pts[i]);
      if (sr.fill) s += '<path d="' + d + ' L' + X(sr.pts.length - 1) + ' ' + Y(0) + ' L' + X(0) + ' ' + Y(0) + 'Z" fill="' + sr.color + '" opacity=".18"/>';
      s += '<path d="' + d + '" fill="none" stroke="' + sr.color + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
      var li = sr.pts.length - 1; s += '<circle cx="' + X(li) + '" cy="' + Y(sr.pts[li]) + '" r="4" fill="' + sr.color + '" stroke="#fff" stroke-width="1.5"/>';
    });
    if (o.xlabel) s += '<text x="' + (W - pr) + '" y="' + (H - 4) + '" text-anchor="end" font-size="9" fill="rgba(255,255,255,.5)" font-family="system-ui">' + K().esc(o.xlabel) + '</text>';
    return s + '</svg>';
  }

  HistView.css('hv-cards', [
    '.hvc-felt{position:relative;border-radius:16px;padding:12px;display:flex;flex-direction:column;gap:12px;color:#fff;',
    'background:radial-gradient(rgba(255,255,255,.035) 1px,transparent 1px) 0 0/4px 4px,radial-gradient(120% 90% at 50% 35%,var(--fa) 0%,var(--fb) 70%,var(--fc) 100%);',
    'box-shadow:inset 0 4px 14px rgba(0,0,0,.5),inset 0 0 0 2px rgba(0,0,0,.25),0 0 0 5px #6e3d1c,0 0 0 6px rgba(0,0,0,.35);margin:5px;}',
    '.hvc-row{display:flex;flex-wrap:wrap;gap:5px;--cw:38px;align-items:flex-end;}',
    '.hvc-row .pcard{box-shadow:0 2px 5px rgba(0,0,0,.4);flex:none;}',
    '.hvc-row.fan{flex-wrap:nowrap;gap:0;}.hvc-row.fan .pcard+.pcard{margin-left:calc(var(--cw) * var(--ov,-.42));}',
    '.hvc-row .pcard.dim{filter:brightness(.62) saturate(.6);}',
    '.hvc-grp{display:flex;flex-direction:column;gap:6px;min-width:0;}',
    '.hvc-cap{font-size:.72rem;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.7);}',
    '.hvc-sub{font-size:.8rem;font-weight:700;color:rgba(255,255,255,.75);}',
    '.hvc-pair{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;}',
    '.hvc-suit{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:7px;background:#fffaf0;color:#1b1b22;font-size:17px;line-height:1;flex:none;box-shadow:0 1px 3px rgba(0,0,0,.4);}',
    '.hvc-suit.red{color:#d81e3a;}',
    '.hvc-who{display:flex;flex-direction:column;align-items:center;gap:3px;}',
    '.hvc-who small{font-size:.7rem;font-weight:800;color:rgba(255,255,255,.8);max-width:52px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.hvc-who.win small{color:#ffd166;}',
    '.hvc-snap{line-height:0;}.hvc-snap svg{width:100%;height:auto;display:block;}',
    '.hvc-hands{display:flex;flex-direction:column;gap:8px;}',
    '.hvc-hand{display:grid;grid-template-columns:auto 1fr auto;gap:4px 10px;align-items:center;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.05);}',
    '.hvc-hand .t{font-size:.86rem;font-weight:800;min-width:0;}.hvc-hand .t small{display:block;font-size:.74rem;font-weight:700;color:var(--text-3);}',
    '.hvc-hand .r{font-size:.74rem;font-weight:900;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.08);color:var(--text-2);white-space:nowrap;}',
    '.hvc-hand .r.good{background:rgba(74,222,128,.16);color:#4ade80;}.hvc-hand .r.bad{background:rgba(248,113,113,.16);color:#f87171;}.hvc-hand .r.big{background:var(--yellow);color:#16102e;}',
    '.hvc-hand .cs{grid-column:1 / -1;}',
    '.hvc-hand .n{font-size:.72rem;font-weight:900;color:var(--text-3);min-width:22px;}'
  ].join(''));

  // ── Shared: replay strip, seat plates, footer ──────────────────────────────
  HistView.css('hv-cards-kit', [
    '.hvc-road{display:flex;flex-wrap:wrap;gap:4px;}',
    '.hvc-rb{appearance:none;border:0;cursor:pointer;min-width:27px;height:27px;padding:0 6px;border-radius:7px;font:inherit;font-size:.7rem;font-weight:900;color:#fff;',
    'background:var(--rc,rgba(255,255,255,.14));box-shadow:inset 0 -2px 0 rgba(0,0,0,.28);font-variant-numeric:tabular-nums;}',
    '.hvc-rb.dk{color:#1b1404;}.hvc-rb.on{outline:2.5px solid #fff;outline-offset:1.5px;}',
    '.hvc-rb.ring{box-shadow:inset 0 0 0 2.5px #fff,inset 0 -2px 0 rgba(0,0,0,.28);}',
    '.hvc-key i.ring{background:transparent;box-shadow:inset 0 0 0 2px #fff;}',
    '.hvc-key{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;font-size:.72rem;font-weight:800;color:var(--text-3);}',
    '.hvc-key span{display:inline-flex;align-items:center;gap:5px;}.hvc-key i{width:10px;height:10px;border-radius:3px;display:inline-block;}',
    '.hvc-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:.86rem;font-weight:800;color:rgba(255,255,255,.85);}',
    '.hvc-head b{font-size:1rem;color:#fff;}',
    '.hvc-tag{font-size:.74rem;font-weight:900;padding:3px 9px;border-radius:999px;background:rgba(0,0,0,.3);color:#fff;white-space:nowrap;}',
    '.hvc-tag.good{background:rgba(74,222,128,.22);color:#86efac;}.hvc-tag.bad{background:rgba(248,113,113,.22);color:#fecaca;}.hvc-tag.big{background:#ffd166;color:#1b1404;}',
    '.hvc-plates{display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:6px;}',
    '.hvc-plate{display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 3px 5px;border-radius:10px;background:rgba(0,0,0,.24);min-width:0;}',
    '.hvc-plate small{font-size:.68rem;font-weight:800;color:rgba(255,255,255,.75);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.hvc-plate b{font-size:1.15rem;font-weight:900;line-height:1.15;color:#fff;font-variant-numeric:tabular-nums;}',
    '.hvc-plate i{font-style:normal;font-size:.64rem;font-weight:800;color:rgba(255,255,255,.62);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;}',
    '.hvc-plate.bad{background:rgba(190,30,50,.42);}.hvc-plate.win b{color:#ffd166;}.hvc-plate.gold{background:rgba(255,209,102,.28);}.hvc-plate.good{background:rgba(34,165,90,.4);}',
    '.hvc-plate .dot{width:8px;height:8px;border-radius:50%;background:var(--pc);margin-bottom:1px;}',
    '.hvc-foot{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(255,209,102,.1);box-shadow:inset 0 0 0 1px rgba(255,209,102,.22);font-size:.86rem;font-weight:800;line-height:1.35;color:var(--text);}',
    '.hvc-foot .ico{width:20px;height:20px;flex:none;color:#ffd166;}',
    '.hvc-trick{display:flex;gap:6px;flex-wrap:wrap;}',
    '.hvc-mini{font-size:.76rem;font-weight:800;color:rgba(255,255,255,.72);}'
  ].join(''));
  // a strip of squares, one per hand: items [{t, c (colour), dk (dark text), title}]; show(i) fills the panel
  function road(items, start, show) {
    var box = K().el('div', { class: 'hvc-road' }), btns = [];
    items.forEach(function (it, i) {
      var b = K().el('button', { type: 'button', class: 'hvc-rb' + (it.dk ? ' dk' : '') + (it.ring ? ' ring' : ''), style: it.c ? { '--rc': it.c } : null, text: it.t, title: it.title || '', 'aria-label': it.title || it.t,
        onclick: function () { pick(i); } });
      btns.push(b); box.appendChild(b);
    });
    function pick(i) { btns.forEach(function (b, j) { b.classList.toggle('on', i === j); b.setAttribute('aria-pressed', i === j ? 'true' : 'false'); }); show(i); }
    if (items.length) pick(Math.max(0, Math.min(items.length - 1, start)));
    return box;
  }
  function key(list) { return K().el('div', { class: 'hvc-key' }, list.filter(Boolean).map(function (x) { return K().el('span', null, [K().el('i', x[1] === 'ring' ? { class: 'ring' } : { style: { background: x[1] } }), document.createTextNode(x[0])]); })); }
  // one plate per seat: [{n: name, v: big value, s: sub text, c: colour, cls}]
  function plates(list) {
    var box = K().el('div', { class: 'hvc-plates', style: { '--n': list.length } });
    list.forEach(function (x) { box.appendChild(K().el('div', { class: 'hvc-plate' + (x.cls ? ' ' + x.cls : ''), style: x.c ? { '--pc': x.c } : null }, [x.c ? K().el('span', { class: 'dot' }) : null, K().el('small', { text: x.n }), K().el('b', { text: String(x.v) }), x.s ? K().el('i', { text: x.s }) : null, x.s2 ? K().el('i', { text: x.s2 }) : null])); });
    return box;
  }
  function head(left, tag, tagCls) { return K().el('div', { class: 'hvc-head' }, [K().el('span', { html: left }), tag ? K().el('span', { class: 'hvc-tag' + (tagCls ? ' ' + tagCls : ''), text: tag }) : null]); }
  // the plain-language line about what decided the game
  function foot(text, icon) { return text ? K().el('div', { class: 'hvc-foot', html: K().icon(icon || 'flag') + '<span>' + K().esc(text) + '</span>' }) : null; }
  // a played trick: cards with the player under each, the winner in gold
  function trick(codes, leader, winner, nm, n, hl, w) {
    var t = K().el('div', { class: 'hvc-trick' });
    codes.forEach(function (c, i) { var p = (leader + i) % n; t.appendChild(K().el('div', { class: 'hvc-who' + (p === winner ? ' win' : '') }, [card(c, w || 40, hl && hl.indexOf(c) >= 0 ? 'hv-hl' : ''), K().el('small', { text: first(nm[p]) })])); });
    return t;
  }
  function scoresOf(e) { return e.rounds && e.rounds.scores ? e.rounds.scores.map(function (r) { return Array.isArray(r) ? r : []; }) : []; }
  function cum(sc, n) { var run = [], t = []; for (var i = 0; i < n; i++) t.push(0); sc.forEach(function (r) { for (var i = 0; i < n; i++) t[i] += Number(r[i]) || 0; run.push(t.slice()); }); return run; }
  var SORD = { c: 0, d: 1, s: 2, h: 3 }, RORD = '2345678910JQKA';
  function rIdx(r) { return r === '10' ? 8 : RORD.indexOf(r); }
  function sortH(cs, ord) { ord = ord || SORD; return cs.slice().sort(function (a, b) { var x = parse(a), y = parse(b); if (!x || !y) return 0; return ord[x.s] - ord[y.s] || rIdx(x.r) - rIdx(y.r); }); }

  // ── Hearts: every hand (who took the Queen, the moon, your cards and passes), and what decided it ──
  var HDIR = { l: 'passed left', r: 'passed right', a: 'passed across', h: 'no passing' };
  R('hearts', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var nm = names(e), n = nm.length || 4, sc = scoresOf(e), tot = cum(sc, n), hx = d.hx || [], out = [];
    var moons = (d.moons || []).reduce(function (a, b) { return a + b; }, 0);
    var qsTop = d.qs ? d.qs.indexOf(Math.max.apply(null, d.qs)) : -1;
    var clean = nm.map(function (x, i) { return sc.filter(function (r) { return r[i] === 0; }).length; });
    var wi = e.winner ? nm.indexOf(e.winner) : -1;
    out.push(ui.stats([['Hands', hx.length || sc.length || null, d.to ? 'played to ' + d.to : ''],
      qsTop >= 0 && d.qs[qsTop] ? ['Most Q♠', d.qs[qsTop] + '×', first(nm[qsTop])] : null,
      ['Moons shot', moons || 'None', moons ? nm.filter(function (x, i) { return d.moons[i]; }).map(first).join(', ') : '']]));
    // every hand: a square in the colour of whoever got stuck with the Queen (gold: a moon)
    if (hx.length) {
      var panel = K().el('div', { class: 'hv' });
      var show = function (i) {
        var h = hx[i], r = sc[i] || [], kids = [], last = i === hx.length - 1;
        var tk = h.k ? String(h.k).split('.').map(Number) : null;
        kids.push(head('<b>Hand ' + (i + 1) + '</b> · ' + (HDIR[h.d] || ''), h.m >= 0 ? first(nm[h.m]) + ' shot the moon' : h.q >= 0 ? 'Q♠ went to ' + first(nm[h.q]) : null, h.m >= 0 ? 'big' : ''));
        kids.push(plates(nm.map(function (x, p) {
          return { n: first(x), v: r[p] != null ? (r[p] ? '+' + r[p] : '0') : '–', s: tk ? plural(tk[p], 'trick') : '', s2: tot[i] ? 'total ' + tot[i][p] : '', c: ui.color(p),
            cls: h.m === p ? 'gold' : h.q === p && h.m < 0 ? 'bad' : r[p] === 0 ? 'win' : '' };
        })));
        var deal = h.h ? codes2(h.h) : null, po = h.po ? codes2(h.po) : null, pg = h.pg ? codes2(h.pg) : null;
        // older records kept only the last hand (after passing)
        if (!deal && last && d.hand && d.hand.length) { po = d.pass ? d.pass.out : null; pg = d.pass ? d.pass.got : null; deal = d.hand.filter(function (c) { return !pg || pg.indexOf(c) < 0; }).concat(po || []); }
        if (deal && deal.length) {
          kids.push(grp(first(nm[0]) + "'s cards as dealt", row(sortH(deal), { fan: true, w: 34, ov: -.52, dim: po || [] }), po ? 'Dimmed: the 3 passed away' : 'No passing this hand'));
          if (pg && pg.length) kids.push(K().el('div', { class: 'hvc-pair' }, [grp('Passed', row(po, { w: 32 })), grp('Got', row(pg, { w: 32 }))]));
        }
        var qc = h.qc ? codes2(h.qc) : last && d.q && d.q.c && h.q === d.q.w ? d.q.c : null, ql = h.qc ? h.ql : d.q ? d.q.l : 0, qn = h.qc ? h.qn : d.q ? d.q.n : '';
        if (qc && qc.length === 4 && h.q >= 0) kids.push(grp('The Queen of Spades trick', trick(qc, ql || 0, h.q, nm, n, ['Qs']), 'Trick ' + qn + ' · ' + nm[h.q] + ' took it'));
        if (h.b) kids.push(K().el('div', { class: 'hvc-mini', text: h.b === 1 ? 'Hearts were broken on the first trick.' : 'Hearts were broken on trick ' + h.b + '.' }));
        panel.innerHTML = ''; panel.appendChild(felt('hearts', kids));
      };
      var items = hx.map(function (h, i) { var w = h.m >= 0 ? h.m : h.q; return { t: String(i + 1), c: w >= 0 ? ui.color(w) : null, ring: h.m >= 0, title: 'Hand ' + (i + 1) + (h.m >= 0 ? ': ' + nm[h.m] + ' shot the moon' : h.q >= 0 ? ': Q♠ to ' + nm[h.q] : '') }; });
      out.push(ui.section('Every hand · tap one', [road(items, hx.length - 1, show), panel,
        key(nm.map(function (x, p) { return ['Q♠ to ' + first(x), ui.color(p)]; }).concat(moons ? [['Moon shot', 'ring']] : []))], { icon: 'cards' }));
    }
    // over the game
    if (d.qs) {
      var tw = nm.map(function () { return 0; }), any = false;
      hx.forEach(function (h) { if (h.k) { any = true; String(h.k).split('.').forEach(function (v, p) { tw[p] += +v || 0; }); } });
      out.push(ui.section('Over the game', ui.table([''].concat(nm.map(first)), [['Q♠ taken'].concat(d.qs), ['Moons'].concat(nm.map(function (x, p) { return (d.moons || [])[p] || 0; })),
        ['Clean hands'].concat(clean), any ? ['Tricks won'].concat(tw) : null].filter(Boolean), { headColors: [null].concat(nm.map(function (x, p) { return ui.color(p); })) })));
    }
    out.push(foot(heartsWhy(nm, tot, d), 'flag'));
    return ui.wrap(out);
  });
  function heartsWhy(nm, tot, d) {
    if (!tot.length) return '';
    var last = tot[tot.length - 1], to = d.to || 100, over = [];
    last.forEach(function (v, p) { if (v >= to) over.push(p); });
    var lo = Math.min.apply(null, last), win = [];
    last.forEach(function (v, p) { if (v === lo) win.push(p); });
    var hx = d.hx || [], lh = hx[hx.length - 1] || {};
    var s = over.length ? over.map(function (p) { return first(nm[p]); }).join(' and ') + ' went past ' + to + ' in hand ' + tot.length : 'The game ended after hand ' + tot.length;
    if (lh.m >= 0) s += ' when ' + first(nm[lh.m]) + ' shot the moon';
    s += win.length > 1 ? ', leaving a tie at ' + lo + '.' : ', so ' + nm[win[0]] + ' won with the lowest score, ' + lo + '.';
    return s;
  }

  // ── Spades: every hand (bids, tricks, made or set, your cards), bags and what decided it ──
  var SPORD = { s: 0, h: 1, c: 2, d: 3 };
  R('spades', function (e, ui) {
    var d = e.dt; if (!d || !d.names) return null;
    var nm = d.names, hx = d.hx || [], out = [], sc = scoresOf(e), tot = cum(sc, 2);
    var teams = [first(nm[0]) + ' & ' + first(nm[2]), first(nm[1]) + ' & ' + first(nm[3])];
    function bidTxt(b) { return b === 'B' ? 'Blind nil' : b === 'N' ? 'Nil' : 'Bid ' + b; }
    var nilsMade = (d.nils || []).reduce(function (a, b) { return a + (b || 0); }, 0);
    out.push(ui.stats([['Hands', hx.length || sc.length || null, d.to ? 'played to ' + d.to : ''],
      d.sets ? ['Times set', d.sets[0] + ' – ' + d.sets[1], first(nm[0]) + "'s team first"] : null,
      d.bags ? ['Bags left', d.bags[0] + ' – ' + d.bags[1], 'every 10 cost 100'] : null,
      nilsMade ? ['Nils made', nilsMade, nm.filter(function (x, i) { return d.nils[i]; }).map(first).join(', ')] : null]));
    if (hx.length) {
      var panel = K().el('div', { class: 'hv' });
      var show = function (i) {
        var h = hx[i], b = String(h.b).split('.'), t = String(h.t).split('.').map(Number), r = String(h.r || ''), kids = [], pts = sc[i] || [];
        var after = h.s ? String(h.s).split('.').map(Number) : tot[i] || [], bags = h.g ? String(h.g).split('.') : null;
        var set = [0, 1].filter(function (tm) { return r.charAt(tm) === 's'; });
        var tag = set.length === 2 ? 'Both teams set' : set.length ? teams[set[0]] + ' set' : 'Both made it';
        kids.push(head('<b>Hand ' + (i + 1) + '</b>' + (h.d != null && nm[h.d] ? ' · ' + K().esc(first(nm[h.d])) + ' dealt' : ''), tag, set.length ? 'bad' : 'good'));
        kids.push(plates([0, 1, 2, 3].map(function (p) {
          var nil = b[p] === 'N' || b[p] === 'B', ok = nil ? t[p] === 0 : r.charAt(p % 2) === 'm';
          return { n: first(nm[p]), v: t[p], s: 'took · ' + bidTxt(b[p]).toLowerCase(), s2: nil ? (ok ? 'nil made' : 'nil broken') : '', c: ui.color(p % 2), cls: nil ? (ok ? 'gold' : 'bad') : r.charAt(p % 2) === 's' ? 'bad' : '' };
        })));
        kids.push(plates([0, 1].map(function (tm) {
          var bid = 0, took = 0; [tm, tm + 2].forEach(function (p) { if (b[p] !== 'N' && b[p] !== 'B') { bid += +b[p] || 0; took += t[p]; } });
          var pen = r.indexOf(tm ? 'q' : 'p') >= 0;
          return { n: teams[tm], v: pts[tm] != null ? (pts[tm] > 0 ? '+' : '') + pts[tm] : '–', s: 'bid ' + bid + ' · took ' + took + (pen ? ' · bag penalty' : ''), s2: 'score ' + (after[tm] != null ? after[tm] : '') + (bags ? ' · ' + plural(+bags[tm], 'bag') : ''),
            c: ui.color(tm), cls: r.charAt(tm) === 's' ? 'bad' : r.charAt(tm) === 'm' ? 'good' : '' };
        })));
        var mine = h.h ? codes2(h.h) : i === hx.length - 1 && d.hand && d.hand.length ? d.hand : null;
        if (mine) kids.push(grp(first(nm[0]) + "'s cards", row(sortH(mine, SPORD), { fan: true, w: 34, ov: -.52, cls: function (c) { var x = parse(c); return x && x.s === 's' ? '' : 'dim'; } }), 'Spades are bright' + (h.sb ? ' · spades broke on trick ' + h.sb : '')));
        else if (h.sb) kids.push(K().el('div', { class: 'hvc-mini', text: 'Spades broke on trick ' + h.sb + '.' }));
        panel.innerHTML = ''; panel.appendChild(felt('spades', kids));
      };
      var items = hx.map(function (h, i) {
        var r = String(h.r || ''), b = String(h.b).split('.'), t = String(h.t).split('.').map(Number), nilOk = [0, 1, 2, 3].some(function (p) { return (b[p] === 'N' || b[p] === 'B') && t[p] === 0; });
        var pts = sc[i] || [0, 0], w = pts[0] === pts[1] ? -1 : pts[0] > pts[1] ? 0 : 1;
        return { t: String(i + 1), c: w >= 0 ? ui.color(w) : null, ring: nilOk, title: 'Hand ' + (i + 1) + (r.indexOf('s') >= 0 ? ': a team went set' : '') };
      });
      out.push(ui.section('Every hand · tap one', [road(items, hx.length - 1, show), panel,
        key([['Hand to ' + teams[0], ui.color(0)], ['Hand to ' + teams[1], ui.color(1)], nilsMade ? ['Nil made', 'ring'] : null])], { icon: 'cards' }));
      var rows = hx.map(function (h, i) {
        var b = String(h.b).split('.'), t = String(h.t).split('.').map(Number), r = String(h.r || '');
        return ['H' + (i + 1)].concat([0, 1, 2, 3].map(function (p) {
          var bid = b[p], nil = bid === 'N' || bid === 'B', ok = nil ? t[p] === 0 : r.charAt(p % 2) === 'm';
          return { t: (nil ? (bid === 'B' ? 'BN' : 'Nil') : bid) + ' / ' + t[p], c: nil ? (ok ? 'hi' : 'bad') : r.charAt(p % 2) === 's' ? 'bad' : ok ? 'good' : '' };
        }));
      });
      out.push(ui.section('Bid / took, each hand', [ui.table([''].concat(nm.map(first)), rows, { headColors: [null, ui.color(0), ui.color(1), ui.color(0), ui.color(1)] }),
        ui.el('p', { class: 'hv-note', text: 'Green: team made its bid. Red: set. Gold: Nil made.' })]));
    }
    if (d.tricks) out.push(ui.section('Tricks over the game', ui.bars(nm.map(function (n, i) { return { label: n, value: d.tricks[i] || 0, color: ui.color(i % 2) }; }))));
    if (!hx.length && d.hand && d.hand.length) out.push(ui.section('Your cards, last hand', felt('spades', [row(d.hand, { fan: true, w: 36 })])));
    var fin = (e.players || []).map(function (p) { return p.score; });
    if (fin.length === 2 && fin[0] != null) {
      var w = fin[0] > fin[1] ? 0 : 1, lh = hx[hx.length - 1], lr = lh ? String(lh.r || '') : '';
      var why = teams[w] + ' won ' + fin[w] + ' to ' + fin[1 - w] + (hx.length ? ' after ' + plural(hx.length, 'hand') : '') + '.';
      if (lr.charAt(1 - w) === 's') why += ' ' + teams[1 - w] + ' went set in the last hand.';
      else if (d.sets && d.sets[1 - w] > d.sets[w]) why += ' ' + teams[1 - w] + ' went set ' + plural(d.sets[1 - w], 'time') + '.';
      else if (d.bags && lr.indexOf(w ? 'p' : 'q') >= 0) why += ' A bag penalty cost ' + teams[1 - w] + ' 100.';
      out.push(foot(why, 'flag'));
    }
    return ui.wrap(out);
  });
  HistView.css('hv-cards-note', '.hv-note{margin:0;font-size:.76rem;color:var(--text-3);font-weight:700;}');

  // ── Euchre: every hand (the turned card, who called what, tricks, the maker's cards), and what decided it ──
  var LEFTOF = { s: 'c', c: 's', h: 'd', d: 'h' };
  function euTrump(code, t) { var p = parse(code); return !!(p && t && (p.s === t || (p.r === 'J' && LEFTOF[t] === p.s))); }
  R('euchre', function (e, ui) {
    var d = e.dt; if (!d || !d.hx) return null;
    var nm = d.names || [], hx = d.hx, out = [], sc = scoresOf(e), tot = cum(sc, 2);
    var RES = { made: ['Made it', 'good'], march: ['March', 'big'], 'alone-march': ['Alone march', 'big'], euchred: ['Euchred', 'bad'] };
    var tn = [first(nm[0]) + ' & ' + first(nm[2]), first(nm[1]) + ' & ' + first(nm[3])];
    var tm = [0, 1].map(function (t) {
      var mine = hx.filter(function (h) { return h.m % 2 === t; });
      return { calls: mine.length, eu: mine.filter(function (h) { return h.r === 'euchred'; }).length, mar: mine.filter(function (h) { return /march/.test(h.r); }).length, al: mine.filter(function (h) { return h.a; }).length };
    });
    out.push(ui.stats([['Hands', hx.length, d.to ? 'played to ' + d.to : ''], ['Euchres', tm[0].eu + tm[1].eu, 'callers who fell short'],
      ['Marches', tm[0].mar + tm[1].mar, 'all 5 tricks'], tm[0].al + tm[1].al ? ['Went alone', tm[0].al + tm[1].al] : null]));
    var panel = K().el('div', { class: 'hv' });
    var show = function (i) {
      var h = hx[i], r = RES[h.r] || [h.r, ''], kids = [], mt = h.m % 2, pts = sc[i] || [], after = h.s ? String(h.s).split('.').map(Number) : tot[i] || [];
      var w = h.w ? String(h.w).split('.').map(Number) : null, out1 = h.a ? (h.m + 2) % 4 : -1;
      kids.push(head('<b>Hand ' + (i + 1) + '</b>' + (nm[h.d] ? ' · ' + K().esc(first(nm[h.d])) + ' dealt' : ''), r[0], r[1]));
      var call = h.c === 1 ? (h.m === h.d ? first(nm[h.m]) + ' picked it up' : first(nm[h.m]) + ' ordered it up') : first(nm[h.m]) + ' named ' + (SN[h.t] || '').toLowerCase();
      kids.push(K().el('div', { class: 'hvc-pair', style: { 'align-items': 'center' } }, [
        h.u ? grp(h.c === 1 ? 'Turned up' : 'Turned down', row([h.u], { w: 40, cls: function () { return h.c === 1 ? '' : 'dim'; } })) : null,
        K().el('div', { class: 'hvc-grp' }, [K().el('div', { class: 'hvc-cap', text: 'Trump' }), K().el('div', { style: { display: 'flex', 'align-items': 'center', gap: '8px' } }, [suitTag(h.t), K().el('span', { class: 'hvc-sub', text: call + (h.a ? ', alone' : '') })])])
      ]));
      if (w) kids.push(plates([0, 1, 2, 3].map(function (p) {
        return { n: first(nm[p]), v: p === out1 ? '–' : w[p], s: p === out1 ? 'sat out' : plural(w[p], 'trick'), s2: p === h.m ? 'caller' : '', c: ui.color(p % 2), cls: p === h.m ? (h.r === 'euchred' ? 'bad' : 'good') : '' };
      })));
      kids.push(plates([0, 1].map(function (t) { return { n: tn[t], v: pts[t] ? '+' + pts[t] : '0', s: 'score ' + (after[t] != null ? after[t] : ''), c: ui.color(t), cls: pts[t] ? (t === mt ? 'good' : 'bad') : '' }; })));
      var trumpCls = function (c) { return euTrump(c, h.t) ? '' : 'dim'; };
      if (h.h && h.h.length) kids.push(grp(first(nm[h.m]) + "'s cards", row(h.h, { w: 36, hl: h.c === 1 && h.d === h.m ? [h.u] : [], cls: trumpCls }), 'Trump is bright' + (h.c === 1 && h.d === h.m ? ' · ringed: the card picked up' : '')));
      if (h.y && h.y.length) kids.push(grp(first(nm[0]) + "'s cards", row(h.y, { w: 32, cls: trumpCls })));
      panel.innerHTML = ''; panel.appendChild(felt('euchre', kids));
    };
    var items = hx.map(function (h, i) { var mt = h.m % 2, win = h.r === 'euchred' ? 1 - mt : mt, big = /march/.test(h.r); return { t: String(i + 1), c: ui.color(win), ring: big, title: 'Hand ' + (i + 1) + ': ' + (RES[h.r] || [h.r])[0] }; });
    out.push(ui.section('Every hand · tap one', [road(items, hx.length - 1, show), panel,
      key([['Point to ' + tn[0], ui.color(0)], ['Point to ' + tn[1], ui.color(1)], ['March', 'ring']])], { icon: 'cards' }));
    out.push(ui.table(['', tn[0], tn[1]], [['Called trump', tm[0].calls, tm[1].calls], ['Euchred', tm[0].eu, tm[1].eu], ['Marches', tm[0].mar, tm[1].mar], ['Went alone', tm[0].al, tm[1].al]], { headColors: [null, ui.color(0), ui.color(1)] }));
    if (d.throwins) out.push(ui.facts([['Thrown in', plural(d.throwins, 'deal') + ' (everyone passed)']]));
    var fin = (e.players || []).map(function (p) { return p.score; }), lh = hx[hx.length - 1];
    if (fin.length === 2 && fin[0] != null && lh) {
      var wt = fin[0] > fin[1] ? 0 : 1, lm = lh.m % 2;
      var how = lh.r === 'euchred' ? 'by euchring ' + first(nm[lh.m]) : lm === wt ? (/march/.test(lh.r) ? 'with a march' + (lh.a ? ' alone' : '') : 'making ' + (SN[lh.t] || '').toLowerCase() + ' trump') : '';
      out.push(foot(tn[wt] + ' reached ' + fin[wt] + ' in hand ' + hx.length + (how ? ' ' + how : '') + ', winning ' + fin[wt] + ' to ' + fin[1 - wt] + '.', 'flag'));
    }
    return ui.wrap(out);
  });

  // ── Cribbage: the peg race, best hands with their cards, and the last show ──
  R('cribbage', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var nm = names(e), out = [];
    if (d.tr) {
      var sc = [0, 0], pts = [[0], [0]], marks = [], i = 0, n = 0;
      var tr = String(d.tr);
      while (i < tr.length) {
        var ch = tr.charAt(i);
        if (ch === '|') { marks.push(n); i++; continue; }
        var p = ch === '0' || ch === 'a' ? 0 : 1, v = parseInt(tr.charAt(i + 1), 36) || 0; i += 2;
        sc[p] = Math.min(121, sc[p] + v); n++;
        pts[0].push(sc[0]); pts[1].push(sc[1]);
      }
      var svg = chart([{ pts: pts[0], color: ui.color(0), step: true }, { pts: pts[1], color: ui.color(1), step: true }],
        { max: 121, h: 170, xmarks: marks, aria: 'Peg race', lines: [{ y: 121, label: '121', c: 'rgba(255,209,102,.55)' }, { y: 91, label: '91' }, { y: 61, label: '61' }], xlabel: 'every score, hand by hand' });
      out.push(ui.section('The peg race', [ui.chips(nm.map(function (n, p) { return { t: n + ' · ' + sc[p], c: ui.color(p), on: true }; })), ui.picture(svg, { frame: 'wood', max: 380 }), ui.el('p', { class: 'hv-note', text: 'Each step is a score. Faint lines split the hands. 91 is the skunk line, 61 double skunk.' })]));
    }
    if (d.best) {
      var bk = [];
      var HOW = { '15': 'Fifteens', pair: 'Pair', royal: 'Three of a kind', double: 'Four of a kind', run: 'Runs', flush: 'Flush', nobs: 'His nobs' };
      [0, 1].forEach(function (p) {
        var b = d.best[p]; if (!b || !b.c) return;
        var parts = b.how ? Object.keys(b.how).filter(function (k) { return b.how[k] > 0; }).map(function (k) { return (HOW[k] || k) + ' ' + b.how[k]; }).join(' · ') : '';
        bk.push(grp(nm[p] + ' · best ' + (b.crib ? 'crib' : 'hand') + ': ' + b.pts, K().el('div', { class: 'hvc-pair' }, [row(b.c, { w: 38 }), b.st ? row([b.st], { w: 38, hl: [b.st] }) : null]),
          (parts || 'No points') + ' · hand ' + b.hand + (b.st ? ' · ringed card is the starter' : '')));
      });
      if (bk.length) out.push(ui.section('Best hands', felt('cribbage', bk)));
    }
    if (d.last && d.last.h0) {
      var L = d.last, kids = [];
      [0, 1].forEach(function (p) { var h = p ? L.h1 : L.h0; if (h && h.length) kids.push(grp(nm[p] + (L.d === p ? ' (dealer)' : ''), row(h, { w: 36 }))); });
      kids.push(K().el('div', { class: 'hvc-pair' }, [L.cr && L.cr.length ? grp('Crib (' + first(nm[L.d]) + ')', row(L.cr, { w: 36 })) : null, L.st ? grp('Starter', row([L.st], { w: 36 })) : null]));
      out.push(ui.section('Last hand (hand ' + L.n + ')', felt('cribbage', kids)));
    }
    if (d.peg && d.show) out.push(ui.table(['', first(nm[0]), first(nm[1])], [['Pegging', d.peg[0], d.peg[1]], ['Hands & crib', d.show[0], d.show[1]],
      d.heels && (d.heels[0] || d.heels[1]) ? ['His heels', d.heels[0], d.heels[1]] : null, d.zero ? ['Zero hands', d.zero[0], d.zero[1]] : null].filter(Boolean), { headColors: [null, ui.color(0), ui.color(1)] }));
    if (d.big && d.big.pts >= 3) out.push(ui.facts([['Biggest peg', d.big.pts + ' for ' + String(d.big.text || '').replace(/ for \d+/g, '').replace(/, /g, ' + ') + ' (' + nm[d.big.p] + ')']]));
    return ui.wrap(out);
  });

  // ── Gin Rummy: the last hand laid down, and how every hand ended ──
  R('gin-rummy', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var nm = names(e), out = [];
    var L = d.last;
    function melds(ms, dead, lays) {
      var box = K().el('div', { class: 'hvc-pair' });
      (ms || []).forEach(function (m) { var cs = String(m).split(','); box.appendChild(row(cs, { w: 32, fan: true })); });
      if (lays && lays.length) box.appendChild(grp('', row(lays, { w: 32, fan: true, hl: lays }), 'laid off'));
      if (dead && dead.length) box.appendChild(grp('', row(dead, { w: 32, fan: true, cls: function () { return 'dim'; } }), 'deadwood'));
      return box;
    }
    if (L) {
      var K1 = nm[L.kn], D = nm[1 - L.kn];
      var head = L.gin ? K1 + ' went gin' : L.uc ? D + ' undercut ' + K1 : K1 + ' knocked';
      out.push(ui.section('Last hand: ' + head, felt('gin', [
        grp(K1 + (L.gin ? ' · gin' : ' · ' + L.kw + ' deadwood'), melds(L.km, L.kd)),
        grp(D + ' · ' + L.dw + ' deadwood', melds(L.dm, L.dd, L.ly), L.ly && L.ly.length ? 'Laid off cards went onto ' + first(K1) + "'s melds" : ''),
        K().el('div', { class: 'hvc-sub', text: nm[L.w] + ' scored ' + L.pts + (L.gin ? ' (deadwood + 25 gin bonus)' : L.uc ? ' (difference + 25 undercut bonus)' : ' (deadwood difference)') })
      ])));
    }
    if (d.hx && d.hx.length) {
      out.push(ui.section('How each hand ended', ui.log(d.hx.map(function (h, i) {
        if (h.x) return { b: 'H' + (i + 1), t: 'No winner: the stock ran out' };
        var t = h.g ? nm[h.k] + ' went gin' : h.u ? nm[h.w] + ' undercut ' + first(nm[h.k]) + ' (' + h.dd + ' vs ' + h.kd + ')' : nm[h.k] + ' knocked with ' + h.kd + ' (' + first(nm[1 - h.k]) + ' had ' + h.dd + ')';
        return { b: 'H' + (i + 1), t: t + ' · +' + h.p, c: h.w };
      }))));
    }
    if (d.wins) out.push(ui.stats([[first(nm[0]) + ' hands won', d.wins[0]], [first(nm[1]) + ' hands won', d.wins[1]], ['Played to', d.to]]));
    return ui.wrap(out);
  });

  // ── Solitaire & FreeCell: the deal as it was laid out, and the race to the foundations ──
  var PGA = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ';
  function codes2(s) { var o = []; s = String(s || ''); for (var i = 0; i + 1 < s.length; i += 2) o.push(s.substr(i, 2)); return o; }
  function tableau(cols, down, w) {
    var box = K().el('div', { class: 'hvc-tab', style: { '--cols': cols.length, '--cw': w + 'px' } });
    cols.forEach(function (col, i) {
      var c = K().el('div', { class: 'col' });
      codes2(col).forEach(function (code, k) { c.appendChild(card(code, w, down && k < down[i] ? 'dim' : '')); });
      box.appendChild(c);
    });
    return box;
  }
  function progress(ui, pg, moves) {
    var p = String(pg || ''); if (p.length < 2) return null;
    var pts = p.split('').map(function (ch) { return Math.max(0, PGA.indexOf(ch)); });
    return ui.section('Cards home, move by move', ui.picture(chart([{ pts: pts, color: '#ffd166', fill: true }], { max: 52, h: 130, aria: 'Cards on the foundations', lines: [{ y: 52, label: '52' }, { y: 26, label: '26' }], xlabel: (moves || pts.length - 1) + ' moves' }), { frame: 'dark', max: 380 }));
  }
  HistView.css('hv-cards-tab', '.hvc-tab{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:4px;justify-items:center;}' +
    '.hvc-tab .col{display:flex;flex-direction:column;align-items:center;}.hvc-tab .col .pcard{box-shadow:0 1px 4px rgba(0,0,0,.4);}' +
    '.hvc-tab .col .pcard+.pcard{margin-top:calc(var(--cw) * -1.05);}.hvc-tab .pcard.dim{filter:brightness(.7) saturate(.65);}');
  R('solitaire', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var out = [];
    if (d.tab) {
      var down = [0, 1, 2, 3, 4, 5, 6];
      var stock = codes2(d.stock).reverse();
      out.push(ui.section('The deal', felt('sol', [tableau(d.tab, down, 42),
        stock.length ? grp('The stock, in the order it turned over', row(stock, { w: 26, fan: true, ov: -.6 })) : null,
        K().el('div', { class: 'hvc-sub', text: 'Dimmed cards started face down.' })])));
    }
    out.push(progress(ui, d.pg, e.moves));
    out.push(ui.stats([['Moves', e.moves], ['Time', e.time != null ? ui.time(e.time) : null], ['Score', e.score != null ? ui.num(e.score) : null],
      ['Trips through deck', d.passes != null ? d.passes + 1 : null], ['Cards turned up', d.flips], ['Undos', d.undos], ['Cards that finished themselves', d.auto || null]]));
    return ui.wrap(out);
  });
  R('freecell', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var out = [];
    if (d.tab) out.push(ui.section('Deal #' + (e.deal || ''), felt('fc', [tableau(d.tab, null, 34)])));
    out.push(progress(ui, d.pg, e.moves));
    out.push(ui.stats([['Moves', e.moves], ['Time', e.time != null ? ui.time(e.time) : null], ['Most free cells used', d.cells != null ? d.cells + ' of 4' : null], ['Undos', d.undos], ['Cards that went home themselves', d.auto || null]]));
    return ui.wrap(out);
  });

  // ── Pyramid: the pyramid as dealt (what was left stays bright), and every pair ──
  HistView.css('hv-cards-pyr', '.hvc-pyr{display:flex;flex-direction:column;align-items:center;--cw:40px;}' +
    '.hvc-pyr .pr{display:flex;gap:4px;}.hvc-pyr .pr+.pr{margin-top:calc(var(--cw) * -.78);}.hvc-pyr .pcard{box-shadow:0 2px 5px rgba(0,0,0,.45);}' +
    '.hvc-pyr .pcard:not(.gone){position:relative;z-index:2;}.hvc-pyr .pcard.gone{filter:brightness(.42) saturate(.25);box-shadow:0 1px 2px rgba(0,0,0,.3);}');
  R('pyramid', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var out = [], p0 = codes2(d.p0), left = codes2(d.left);
    var src = p0.length === 28 ? p0 : left.length === 28 ? left : null;
    if (src) {
      var pyr = K().el('div', { class: 'hvc-pyr' }), k = 0;
      for (var r = 0; r < 7; r++) {
        var pr = K().el('div', { class: 'pr' });
        for (var c = 0; c <= r; c++, k++) { var code = src[k], still = left[k] && left[k] !== '..'; pr.appendChild(card(code === '..' ? '??' : code, 40, d.won || still ? '' : 'gone')); }
        pyr.appendChild(pr);
      }
      var cleared = left.filter(function (x) { return x === '..'; }).length;
      out.push(ui.section(d.won ? 'The pyramid you cleared' : 'Where it stopped', felt('pyr', [pyr, K().el('div', { class: 'hvc-sub', text: d.won ? 'All 28 cards taken away.' : 'Bright cards were left: ' + cleared + ' of 28 cleared.' })])));
    }
    if (d.pl && d.pl.length) {
      out.push(ui.section('Taken away, in order', ui.chips(d.pl.map(function (x) { var cs = codes2(x); return { t: cs.map(label).join(' + '), c: cs.length === 1 ? '#ffd166' : null }; }))));
    }
    out.push(ui.stats([['Moves', e.moves], ['Time', e.time != null ? ui.time(e.time) : null], ['Trips through deck', d.pass], ['Left in deck', d.deck], ['Undos', d.undos]]));
    return ui.wrap(out);
  });

  // ── Balatro: the biggest hand (cards, chips × mult), the jokers you ended with ──
  var ENHB = { b: ['+30', '#1f63d0'], m: ['+4', '#c81e36'], g: ['x2', '#ff8a1c'], s: ['x1.5', '#56616e'], o: ['$3', '#a87a00'] };
  HistView.css('hv-cards-jr', [
    '.hvc-cm{display:flex;align-items:center;justify-content:center;gap:8px;font-weight:900;font-variant-numeric:tabular-nums;}',
    '.hvc-cm .b{min-width:64px;padding:6px 10px;border-radius:10px;text-align:center;font-size:1.25rem;color:#fff;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25);}',
    '.hvc-cm .ch{background:#1f7ae0;}.hvc-cm .mu{background:#e0353f;}.hvc-cm .x{font-size:1.2rem;color:#fff;}',
    '.hvc-cm .tot{font-size:1.5rem;color:#ffd166;text-shadow:0 2px 0 rgba(0,0,0,.35);}',
    '.hvc-hn{text-align:center;font-family:var(--display);font-size:1.35rem;color:#fff;line-height:1.1;}.hvc-hn small{display:block;font-family:var(--font);font-size:.76rem;font-weight:800;color:rgba(255,255,255,.75);margin-top:2px;}',
    '.hvc-row .pcard .eb{position:absolute;right:6%;top:5%;padding:0 3px;border-radius:4px;font-weight:900;font-size:calc(var(--cw) * .17);line-height:1.25;color:#fff;}',
    '.hvc-jks{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px;}',
    '.hvc-jk{display:flex;flex-direction:column;gap:6px;align-items:center;text-align:center;}',
    '.hvc-jk .jc{position:relative;width:64px;aspect-ratio:5/7;border-radius:8px;background:linear-gradient(160deg,var(--a),var(--b));',
    'box-shadow:inset 0 0 0 3px #e8e8f0,inset 0 0 0 4.5px rgba(0,0,0,.35),0 6px 14px rgba(0,0,0,.45);display:grid;place-items:center;overflow:hidden;}',
    '.hvc-jk.r3 .jc{box-shadow:inset 0 0 0 3px #ffd56a,inset 0 0 0 4.5px rgba(0,0,0,.35),0 6px 14px rgba(0,0,0,.45);}',
    '.hvc-jk .jc .ico{width:30px;height:30px;color:var(--k);}',
    '.hvc-jk .jc i{position:absolute;top:7%;right:9%;width:8px;height:8px;border-radius:50%;background:#5fb0ff;}.hvc-jk.r2 .jc i{background:#3ddc84;}.hvc-jk.r3 .jc i{background:#ff4d6d;}',
    '.hvc-jk b{font-size:.78rem;font-weight:900;line-height:1.1;}.hvc-jk small{font-size:.7rem;color:var(--text-3);font-weight:700;line-height:1.2;}'
  ].join(''));
  R('jokerrun', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var out = [], b = d.bh;
    if (b && b.c) {
      var sc = String(b.s || ''), en = String(b.e || '');
      var cards = row(b.c, { w: 46, cls: function (c, i) { return sc.charAt(i) === '0' ? 'dim' : ''; } });
      Array.prototype.forEach.call(cards.children, function (n, i) {
        var x = ENHB[en.charAt(i)]; if (x) { var t = K().el('span', { class: 'eb', text: x[0] }); t.style.background = x[1]; n.appendChild(t); }
      });
      cards.style.justifyContent = 'center';
      out.push(ui.section('Biggest hand', felt('jr', [
        K().el('div', { class: 'hvc-hn', html: K().esc(b.hn || '') + '<small>Level ' + (b.l || 1) + ' · ante ' + b.a + ' · ' + K().esc(b.b || '') + '</small>' }),
        cards,
        K().el('div', { class: 'hvc-cm' }, [K().el('span', { class: 'b ch', text: ui.num(b.ch) }), K().el('span', { class: 'x', text: '×' }), K().el('span', { class: 'b mu', text: String(b.m) }), K().el('span', { class: 'x', text: '=' }), K().el('span', { class: 'tot', text: ui.num(b.t) })]),
        b.j && b.j.length ? K().el('div', { class: 'hvc-sub', style: { 'text-align': 'center' }, text: 'Jokers: ' + b.j.join(', ') }) : null
      ])));
    }
    if (d.jk && d.jk.length) {
      var box = K().el('div', { class: 'hvc-jks' });
      d.jk.forEach(function (j) {
        box.appendChild(K().el('div', { class: 'hvc-jk r' + (j.r || 1) }, [
          K().el('div', { class: 'jc', style: { '--a': j.a, '--b': j.b, '--k': j.k }, html: '<i></i>' + K().icon('sparkle') }),
          K().el('b', { text: j.n }), K().el('small', { text: j.d || '' })]));
      });
      out.push(ui.section(d.won ? 'Jokers at the finish' : 'Jokers at the end', box));
    }
    var facts = [];
    if (d.lost) facts.push(['Stopped by', d.lost.name + ': ' + ui.num(d.lost.score) + ' of ' + ui.num(d.lost.target)]);
    if (d.bosses && d.bosses.length) facts.push(['Bosses beaten', d.bosses.join(', ')]);
    if (d.lv && Object.keys(d.lv).length) facts.push(['Hands levelled', Object.keys(d.lv).map(function (k) { return k + ' ' + d.lv[k]; }).join(', ')]);
    if (facts.length) out.push(ui.facts(facts));
    if (d.plays) {
      var pl = Object.keys(d.plays).map(function (k) { return { label: k, value: d.plays[k], color: '#e0353f' }; }).sort(function (a, c) { return c.value - a.value; });
      if (pl.length) out.push(ui.section('Hands played', ui.bars(pl)));
    }
    out.push(ui.stats([['Ante reached', d.ante], ['Money earned', d.earned ? '$' + d.earned : null], ['Cash at the end', d.money != null ? '$' + d.money : null], ['Deck size', d.deck]]));
    return ui.wrap(out);
  });

  // ── Poker Squares: the final 5×5 grid with each row and column's hand, and a replay ──
  var PSN = { royal: 'Royal flush', sf: 'Straight flush', quads: 'Four of a kind', full: 'Full house', flush: 'Flush', straight: 'Straight', trips: 'Three of a kind', two: 'Two pair', pair: 'Pair', none: 'Nothing' };
  HistView.css('hv-cards-ps', [
    '.hvc-ps{display:grid;grid-template-columns:repeat(5,var(--cw)) minmax(0,1fr);gap:5px 5px;--cw:44px;align-items:center;justify-content:center;}',
    '.hvc-ps .pcard{box-shadow:0 2px 5px rgba(0,0,0,.45);}.hvc-ps .pcard.slot{background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.2);}',
    '.hvc-ps .pcard.new{outline:2.5px solid #ffd166;outline-offset:1px;}',
    '.hvc-ps .lb{font-size:.68rem;font-weight:800;line-height:1.1;color:rgba(255,255,255,.65);min-width:0;}',
    '.hvc-ps .lb b{display:block;font-size:.9rem;font-weight:900;color:#fff;}.hvc-ps .lb.z b{color:rgba(255,255,255,.45);}',
    '.hvc-ps .lb.c{text-align:center;align-self:start;font-size:.6rem;overflow-wrap:anywhere;}.hvc-ps .lb.big b{color:#ffd166;}'
  ].join(''));
  R('pokersquares', function (e, ui) {
    var d = e.dt; if (!d || !d.g) return null;
    var out = [], ord = String(d.ord || '');
    var snap = K().el('div');
    function lb(L, col, show) {
      var id = d.ln[L] || 'none', p = d.pt[L] || 0;
      return K().el('div', { class: 'lb' + (col ? ' c' : '') + (p ? '' : ' z') + (/royal|sf|quads|full/.test(id) ? ' big' : ''), html: show ? '<b>' + p + '</b>' + K().esc(PSN[id] || id) : '' });
    }
    function draw(n) {
      var have = {}, last = -1;
      if (n == null || n >= 25 || !ord) for (var i = 0; i < 25; i++) have[i] = 1;
      else for (var j = 0; j < n; j++) { have[ord.charCodeAt(j) - 97] = 1; last = ord.charCodeAt(j) - 97; }
      var full = n == null || n >= 25 || !ord;
      var g = K().el('div', { class: 'hvc-ps' });
      for (var r = 0; r < 5; r++) {
        for (var c = 0; c < 5; c++) {
          var k = r * 5 + c, el = have[k] ? card(d.g[k], 44, k === last ? 'new' : '') : K().el('div', { class: 'pcard slot' });
          g.appendChild(el);
        }
        g.appendChild(lb(r, false, full));
      }
      for (var c2 = 0; c2 < 5; c2++) g.appendChild(lb(5 + c2, true, full));
      snap.innerHTML = ''; snap.appendChild(g);
    }
    draw(null);
    out.push(ui.section('Final grid', felt('ps', [snap])));
    if (ord.length >= 25) {
      var cap = ui.el('b'), rng = ui.el('input', { type: 'range', min: '0', max: '25', value: '25', class: 'hv-range', 'aria-label': 'Card' });
      var show = function (n) { draw(n); cap.textContent = n >= 25 ? 'Final grid · ' + (e.players && e.players[0] ? e.players[0].score : '') + ' points' : n === 0 ? 'Empty grid' : 'Card ' + n + ': ' + label(d.g[ord.charCodeAt(n - 1) - 97]); };
      rng.addEventListener('input', function () { show(+rng.value); });
      show(25);
      out.push(ui.section('Replay, card by card', ui.el('div', { class: 'hv-replay' }, [rng, cap])));
    }
    var made = {}; d.ln.forEach(function (id, i) { if (d.pt[i]) made[id] = (made[id] || 0) + 1; });
    var order = ['royal', 'sf', 'quads', 'full', 'flush', 'straight', 'trips', 'two', 'pair'];
    var chips = order.filter(function (k) { return made[k]; }).map(function (k) { return { t: made[k] + ' × ' + PSN[k], on: /royal|sf|quads|full/.test(k), c: '#ef4444' }; });
    if (chips.length) out.push(ui.chips(chips));
    out.push(ui.facts([['Scoring', d.sys === 'british' ? 'British' : 'American']]));
    return ui.wrap(out);
  });
  HistView.css('hv-cards-replay', '.hv-replay{display:flex;flex-direction:column;gap:6px;}.hv-range{width:100%;accent-color:var(--yellow);}.hv-replay b{font-size:.85rem;color:var(--text-2);}');
})();
