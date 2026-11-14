'use strict';
// History view: Arvela. Who led each company and how the game ended, the race for Renown with who scored each Place
// every round, the map as it stood at the end, the numbers side by side, and the Threads and Legacy lines that were
// made, each with its true sentence. (The record's detail is written by record() in games/anoria/ui.js.)
(function () {
  if (!window.HistView) return;
  // (once Domains are on, the five cards on the map are Domains in every word: cards.js DM_LIVE)
  var DW = function (x) { return window.AnoriaCards && window.AnoriaCards.DM_LIVE ? x.replace(/\bPlace(s?)\b/g, 'Domain$1') : x; };
  var base = (function () { try { var s = document.querySelector('script[src*="hist-view.js"]'); return new URL('games/', s.src).href; } catch (e) { return ''; } })();
  var ART = base + 'anoria/art/t/', FONTS = (function () { try { return new URL('../fonts/', base).href; } catch (e) { return ''; } })();
  var PCOL = ['#f2b84b', '#8fd3f4'];   // (the two seats' colours on Arvela's table)
  var FAC = { D: '#1d4f9c', S: '#1f6f6a', V: '#a3262b', A: '#b5672a', W: '#6a3a72', N: '#6b5a36', P: '#3c4a6e' };

  // The cards' names and the sentences behind each Thread live with the game (cards.js, text.js): on Arvela's own
  // page they are already there; anywhere else they are fetched the first time one of its games is opened.
  var waiting = null;
  function data(then) {
    if (window.AnoriaCards && window.AnoriaText) return then();
    if (!waiting) {
      waiting = [];
      var left = 2, done = function () { if (--left > 0) return; var w = waiting; waiting = []; w.forEach(function (f) { try { f(); } catch (e) {} }); };
      [['AnoriaCards', 'anoria/cards.js'], ['AnoriaText', 'anoria/text.js']].forEach(function (x) {
        if (window[x[0]]) return done();
        var s = document.createElement('script'); s.src = base + x[1]; s.onload = done; s.onerror = done; document.head.appendChild(s);
      });
    }
    waiting.push(then);
  }
  function card(k) { var C = window.AnoriaCards; return (C && (C.CARDS[k] || (C.RETIRED || {})[k] || (C.GUIDES[k] ? { n: C.GUIDES[k], f: ((window.AnoriaText || {}).GUIDES || {})[k] ? window.AnoriaText.GUIDES[k].f : 'N' } : (C.OLD_GUIDES || {})[k] ? { n: C.OLD_GUIDES[k].n, f: (((window.AnoriaText || {}).OLD_GUIDES || {})[k] || {}).f || 'N' } : null))) || null; }
  function placeName(k) { var C = window.AnoriaCards; return C && C.PLACES[k] ? C.PLACES[k].n : cap(k); }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function nameOf(k) { if (k.charAt(0) === '@') return placeName(k.slice(1)); var c = card(k); return c ? c.n : cap(k); }
  // a name as it reads in the middle of a sentence ("the Library of Alexandria")
  function theName(k) { var n = nameOf(k); return k.charAt(0) === '@' && !/^(Stonehenge|Machu|Timbuktu|Petra|Nineveh|Seneca)/.test(n) ? 'the ' + n : n; }
  function facOf(k) { if (k.charAt(0) === '@') return FAC.P; var c = card(k); return FAC[(c && (c.t === 'fig' || !c.t ? c.f : 'N')) || 'N'] || FAC.N; }
  function poss(n) { return n === 'You' ? 'your' : n + (/s$/i.test(n) ? '’' : '’s'); }
  function Poss(n) { return n === 'You' ? 'Your' : poss(n); }

  // A game of three to six players, or teams (record v 3, written by recordN in games/anoria/ui.js): who led each
  // company, in seat order, grouped by team, and how it ended; the race for Renown, one line for each player (or each
  // team); the numbers side by side in a small table; and the Legacy Lines that were made.
  function viewN(e, ui, d) {
    var el = ui.el, N = d.pl.length, P = (e.players || []).slice(0, N); if (P.length !== N) return null;
    var name = function (i) { return P[i].name || 'Player ' + (i + 1); }, col = function (i) { return d.pl[i].c || PCOL[i] || '#f2b84b'; };
    var teams = Array.isArray(d.tm) && d.tm.length ? d.tm : null, teamOf = function (i) { return teams ? teams.filter(function (t) { return t.indexOf(i) >= 0; })[0] || [i] : [i]; };
    var side = function (i) { return teamOf(i).map(name).join(' & '); };
    var w = typeof d.w === 'number' ? d.w : -1, won = function (i) { return w >= 0 && teamOf(w).indexOf(i) >= 0; }, tg = +d.tg || 25;
    var cum = (d.rt || []).map(function (s) { return String(s).split('-').map(Number); }), n = cum.length;
    var root = el('div', { class: 'ah' }), fills = [];
    // ── who led each company ──
    // (a row for each player: their Guide's portrait, their name with their Guide and deck under it, their Renown and Seals)
    var card = function (i) {
      var p = d.pl[i], por = el('span', { class: 'ah-por', style: { '--c': col(i) } }, [pic(ui, ART + p.g + '.webp', '')]);
      var gname = el('span', { text: cap(p.g) }); fills.push(function () { gname.textContent = nameOf(p.g); });
      var sm = p.sm === 4 ? 4 : 3, s = '', left = Math.max(0, Math.min(sm, +p.s || 0)); for (var k = 0; k < sm; k++) s += SEAL(k < left, col(i));
      return el('div', { class: 'ah-pr' + (w >= 0 && !won(i) ? ' ah-lose' : '') }, [por,
        el('div', { class: 'ah-pt2' }, [el('div', { class: 'ah-pn2' }, [el('span', { text: name(i) }), won(i) ? el('em', { class: 'ah-won2', text: 'Won' }) : null, p.o ? el('em', { class: 'ah-outn', text: 'Out' }) : null]),
          el('div', { class: 'ah-gd' }, [gname]), el('div', { class: 'ah-gd' }, [el('span', { text: (p.d || '') + (p.b ? ', a deck ' + name(i) + ' built' : ' deck') })])]),
        el('div', { class: 'ah-pr-r' }, [el('b', { text: String(P[i].score == null ? 0 : P[i].score) }), el('div', { class: 'ah-seals', role: 'img', 'aria-label': left + (left === 1 ? ' Seal' : ' Seals') + ' left', html: s })])]);
    };
    var groups = teams || d.pl.map(function (x, i) { return [i]; });
    var top = el('div', { class: 'ah-plate ah-top' });
    var grid = el('div', { class: 'ah-many' + (teams ? ' ah-tms' : '') });
    groups.forEach(function (t) {
      if (teams) { var tot = t.reduce(function (a, i) { return a + (P[i].score || 0); }, 0);
        grid.appendChild(el('div', { class: 'ah-team', style: { '--c': col(t[0]) } }, [el('div', { class: 'ah-th2' }, [el('i', { class: 'ah-dia', style: { '--c': col(t[0]) } }), el('span', { text: t.map(name).join(' & ') }), el('b', { text: tot + ' Renown' })]), el('div', { class: 'ah-tgr' }, t.map(card))])); }
      else grid.appendChild(card(t[0]));
    });
    top.appendChild(grid);
    var outs = (d.out || []).map(function (x, i) { return x ? i : -1; }).filter(function (i) { return i >= 0; }), how;
    var list = function (a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };
    if (w < 0) how = 'The game ended level after ' + d.rounds + ' rounds.';
    else if (d.how === 'seals' && outs.length) how = list(outs.map(name)) + (outs.length > 1 ? ' lost their last Seals' : ' lost the last Seal') + ' in round ' + d.rounds + ', which ended the game, and ' + side(w) + (teams ? ' had the most Renown.' : ' had the most Renown of the players still in.');
    else if (d.how === 'seals') how = side(w) + (teams ? ' were' : ' was') + ' the last ' + (teams ? 'team' : 'player') + ' left with Seals.';
    else how = side(w) + ' reached ' + tg + ' Renown' + (teams ? ' together' : '') + ' first, at the end of round ' + d.rounds + '.';
    var sub = e.mode ? (/^vs Computer \((.+)\)$/.test(e.mode) ? 'The computer played at ' + RegExp.$1 + '.' : e.mode === 'Pass & play' ? N + ' players shared one device.' : '') : '';
    top.appendChild(el('p', { class: 'ah-how' }, [el('span', { text: how }), sub ? el('small', { text: sub }) : null]));
    root.appendChild(top);
    // ── the race: one line for each player, or each team's Renown together ──
    if (n >= 1) (function () {
      var lines = teams ? teams.map(function (t) { return { c: col(t[0]), nm: t.map(name).join(' & '), v: cum.map(function (r) { return t.reduce(function (a, i) { return a + (r[i] || 0); }, 0); }) }; })
        : d.pl.map(function (x, i) { return { c: col(i), nm: name(i), v: cum.map(function (r) { return r[i] || 0; }) }; });
      var topv = Math.max.apply(null, [tg].concat(lines.map(function (l) { return l.v[n - 1]; }))), step = topv > 40 ? 20 : 10, max = Math.ceil((topv + 1) / 5) * 5;
      var X = function (r) { return (r - 0.5) / n * 100; }, Y = function (v) { return (1 - v / max) * 100; };
      var plot = el('div', { class: 'ah-plot' }), y = el('div', { class: 'ah-y' });
      for (var v = 0; v <= max; v += step) if (v !== tg) { if (v) plot.appendChild(el('i', { class: 'ah-gl', style: { top: Y(v) + '%' } })); if (Math.abs(v - tg) >= step * 0.6 || v === 0) y.appendChild(el('span', { text: String(v), style: { bottom: (v / max * 100) + '%' } })); }
      plot.appendChild(el('i', { class: 'ah-gl ah-tg', style: { top: Y(tg) + '%' } })); y.appendChild(el('span', { class: 'ah-tg', text: String(tg), style: { bottom: (tg / max * 100) + '%' } }));
      var svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">';
      lines.slice().reverse().forEach(function (l) { svg += '<polyline points="' + ['0,100'].concat(l.v.map(function (x, r) { return X(r + 1).toFixed(2) + ',' + Y(x).toFixed(2); })).join(' ') + '" fill="none" stroke="' + l.c + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'; });
      plot.insertAdjacentHTML('beforeend', svg + '</svg>');
      lines.forEach(function (l) { plot.appendChild(el('i', { class: 'ah-pt', style: { left: X(n) + '%', top: Y(l.v[n - 1]) + '%', '--c': l.c } })); });
      var rn = el('div', { class: 'ah-rn' }); for (var r = 1; r <= n; r++) rn.appendChild(el('span', { text: String(r) }));
      var cols = el('div', { class: 'ah-cols' }, [plot, rn]); cols.style.setProperty('--n', n);
      var key = el('div', { class: 'ah-key' }, lines.map(function (l) { return el('span', null, [el('i', { class: 'ah-dot', style: { '--c': l.c } }), el('span', { text: l.nm })]); }));
      root.appendChild(ui.section('Renown, round by round', el('div', { class: 'ah-plate ah-race' }, [key, el('div', { class: 'ah-grid' }, [el('div', { class: 'ah-labs' }, [y]), cols])])));
    })();
    // ── the numbers, a row for each player ──
    (function () {
      var heads = ['Clashes won', 'Domains scored', 'Seals broken', 'Legacy Lines'], keys = ['ko', 'h', 'sb', 'ln'];
      var t = el('table', { class: 'ah-nt' }, [el('tr', null, [el('th', { text: '' })].concat(heads.map(function (h) { return el('th', { text: h }); })))]);
      d.pl.forEach(function (p, i) { t.appendChild(el('tr', null, [el('td', null, [el('span', { class: 'ah-ntn' }, [el('i', { class: 'ah-dot', style: { '--c': col(i) } }), el('span', { text: name(i) })])])].concat(keys.map(function (k) { return el('td', { text: String(+p[k] || 0) }); })))); });
      root.appendChild(ui.section('Side by side', el('div', { class: 'ah-plate ah-tape' }, [t])));
    })();
    // ── the Legacy Lines that were made ──
    var links = [], seen = {};
    (d.links || []).forEach(function (s) { var a = String(s).split('|'), k = a[2] + '>' + a[3]; if (seen[k + a[1]]) return; seen[k + a[1]] = 1; links.push({ r: +a[0], o: +a[1], from: a[2], to: a[3], ren: +a[4] || 0, line: a[5] === 'l', key: k }); });
    if (links.length) {
      var box = el('div', { class: 'ah-links' });
      links.forEach(function (x) {
        var th = function (k) { var bare = k.replace(/^@/, ''), s = el('span', { class: 'ah-th' }, [pic(ui, ART + (k.charAt(0) === '@' ? 'place-' : '') + bare + '.webp', '')]); fills.push(function () { s.style.setProperty('--f', facOf(k)); }); return s; };
        var title = el('b', { text: cap(x.from.replace(/^@/, '')) + ' and ' + cap(x.to) }), tale = el('p', { text: '' });
        fills.push(function () { var from = nameOf(x.from), to = nameOf(x.to), T = (window.AnoriaText || {}).LINKS || {}; title.textContent = from + ' and ' + to; tale.textContent = T[x.key] || (x.line ? to + ' followed ' + theName(x.from) + '.' : to + ' grew from ' + theName(x.from) + '.'); });
        box.appendChild(el('div', { class: 'ah-plate ah-link' }, [el('div', { class: 'ah-pair', 'aria-hidden': 'true' }, [th(x.from), el('u'), th(x.to)]),
          el('div', { class: 'ah-lt' }, [el('div', { class: 'ah-lk' }, [el('span', { text: 'A Legacy Line in round ' + x.r }), x.ren ? el('em', { text: '+' + x.ren + ' Renown' }) : null]), title, tale,
            el('span', { class: 'ah-lw' }, [el('i', { class: 'ah-dot', style: { '--c': col(x.o) } }), el('span', { text: name(x.o) + ' made this one' })])])]));
      });
      root.appendChild(ui.section('Legacy Lines', box));
    }
    data(function () { fills.forEach(function (f) { try { f(); } catch (err) {} }); });
    return root;
  }

  HistView.css('hv-anoria', [
    // (the game's own type: EB Garamond for the words, its small capitals for the labels, as on Arvela's page)
    '@font-face{font-family:"Arvela Text";src:url("' + FONTS + 'arvela-text.woff2") format("woff2");font-weight:450 600;font-display:swap;}',
    '@font-face{font-family:"Arvela Text";src:url("' + FONTS + 'arvela-text-italic.woff2") format("woff2");font-weight:450 600;font-style:italic;font-display:swap;}',
    '@font-face{font-family:"Arvela SC";src:url("' + FONTS + 'arvela-sc.woff2") format("woff2");font-weight:450 600;font-display:swap;}',
    '.ah{--gold:#d9b45a;--ink:#f3e9d2;--dim:rgba(243,233,210,.62);--sc:"Arvela SC",Georgia,serif;--bk:"Arvela Text",Georgia,serif;display:flex;flex-direction:column;gap:14px;min-width:0;}',
    '.ah-plate{position:relative;border-radius:16px;color:var(--ink);background:radial-gradient(120% 90% at 50% 0%,#22305a,#0e1428 72%);box-shadow:inset 0 0 0 1.5px rgba(217,180,90,.5),inset 0 0 0 4px rgba(11,17,36,.9),inset 0 0 0 5px rgba(217,180,90,.22),0 8px 20px rgba(0,0,0,.35);}',
    // who led each company
    '.ah-top{display:flex;flex-direction:column;gap:10px;padding:16px 12px 13px;}',
    '.ah-vs{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start;gap:12px;background:linear-gradient(rgba(217,180,90,0),rgba(217,180,90,.4),rgba(217,180,90,0)) center/1px 84% no-repeat;}',
    '.ah-side{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0;text-align:center;}',
    '.ah-por{position:relative;width:74px;height:74px;border-radius:50%;background:var(--f,#3c4a6e);box-shadow:0 0 0 2px #0b1124,0 0 0 4px var(--c),0 6px 14px rgba(0,0,0,.5);}',
    '.ah-por img{width:100%;height:100%;object-fit:cover;object-position:50% 22%;border-radius:50%;display:block;}',
    '.ah-side.ah-lose .ah-por{filter:saturate(.75) brightness(.85);}',
    '.ah-won{position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);padding:1px 9px 2px;border-radius:999px;font:400 .68rem/1.2 var(--sc);letter-spacing:.14em;color:#1b1407;background:linear-gradient(180deg,#f5dc97,#c9a24a);box-shadow:0 1px 3px rgba(0,0,0,.5);white-space:nowrap;}',
    '.ah-nm{margin-top:6px;max-width:100%;font:400 1.08rem/1.1 var(--sc);letter-spacing:.05em;overflow-wrap:break-word;}',
    '.ah-ren{display:flex;align-items:baseline;justify-content:center;gap:6px;max-width:100%;}',
    '.ah-ren b{font:600 2.1rem/1 var(--bk);color:var(--ink);}',
    '.ah-side.ah-lose .ah-ren b{color:var(--dim);font-weight:500;}',
    '.ah-ren small{font:400 .62rem/1.2 var(--sc);letter-spacing:.16em;color:var(--gold);text-transform:uppercase;}',
    '.ah-fact{display:flex;flex-direction:column;gap:1px;max-width:100%;}',
    '.ah-fact small{font:400 .6rem/1.2 var(--sc);letter-spacing:.16em;color:var(--gold);text-transform:uppercase;}',
    '.ah-fact span{font:500 .9rem/1.2 var(--bk);color:var(--ink);overflow-wrap:break-word;text-wrap:balance;}',
    '.ah-seals{display:flex;gap:4px;justify-content:center;}',
    '.ah-seal{width:15px;height:17px;display:block;}',
    '.ah-many{display:flex;flex-direction:column;gap:8px;}',
    '.ah-pr{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;}',
    '.ah-pr .ah-por{width:46px;height:46px;}',
    '.ah-pr.ah-lose .ah-por{filter:saturate(.75) brightness(.85);}',
    '.ah-pt2{display:flex;flex-direction:column;gap:1px;min-width:0;}',
    '.ah-pn2{display:flex;flex-wrap:wrap;align-items:center;gap:2px 8px;font:400 1.02rem/1.15 var(--sc);letter-spacing:.04em;color:var(--ink);}',
    '.ah-gd{font:500 .84rem/1.2 var(--bk);color:var(--dim);overflow-wrap:break-word;}',
    '.ah-pr-r{display:flex;flex-direction:column;align-items:flex-end;gap:3px;}',
    '.ah-pr-r b{font:600 1.5rem/1 var(--bk);color:var(--ink);}',
    '.ah-pr.ah-lose .ah-pr-r b{color:var(--dim);font-weight:500;}',
    '.ah-won2{font-style:normal;padding:0 8px;border-radius:999px;font:400 .66rem/1.5 var(--sc);letter-spacing:.14em;color:#1b1407;background:linear-gradient(180deg,#f5dc97,#c9a24a);}',
    '.ah-team{display:flex;flex-direction:column;gap:8px;padding:8px 6px 10px;border-radius:12px;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 45%,transparent);}',
    '.ah-th2{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px 10px;font:400 .95rem/1.15 var(--sc);letter-spacing:.04em;color:var(--ink);text-align:center;}',
    '.ah-th2 b{font:500 .85rem/1.2 var(--bk);color:var(--gold);}',
    '.ah-tgr{display:flex;flex-direction:column;gap:8px;}',
    '.ah-outn{font-style:normal;padding:0 8px;border-radius:999px;font:400 .66rem/1.5 var(--sc);letter-spacing:.14em;color:#f3e9d2;background:#7a1f1a;}',
    '.ah-nt{width:100%;border-collapse:collapse;font:500 .9rem/1.2 var(--bk);color:var(--ink);}',
    '.ah-nt th{padding:6px 4px;font:400 .62rem/1.15 var(--sc);letter-spacing:.08em;color:var(--gold);text-transform:uppercase;text-align:center;vertical-align:bottom;}',
    '.ah-nt td{padding:6px 4px;text-align:center;border-top:1px solid rgba(217,180,90,.2);}',
    '.ah-nt td:first-child{text-align:left;}',
    '.ah-ntn{display:inline-flex;align-items:center;gap:6px;min-width:0;white-space:nowrap;}',
    '.ah-nt th{letter-spacing:.04em;font-size:.58rem;}',
    '.ah-how{margin:0;padding-top:9px;text-align:center;font:500 .95rem/1.3 var(--bk);color:var(--ink);text-wrap:balance;background:radial-gradient(closest-side,rgba(217,180,90,.55),transparent) top center/82% 1px no-repeat;}',
    '.ah-how small{display:block;margin-top:2px;font:500 .8rem/1.3 var(--bk);color:var(--dim);}',
    // the race, and who scored each Place every round
    '.ah-race{--lab:74px;--ph:118px;--rh:25px;padding:12px 10px 10px 8px;display:flex;flex-direction:column;gap:8px;}',
    '.ah-key{display:flex;flex-wrap:wrap;gap:4px 14px;padding-left:var(--lab);font:500 .78rem/1.2 var(--bk);color:var(--ink);}',
    '.ah-key span{display:inline-flex;align-items:center;gap:6px;}',
    '.ah-dot{flex:none;width:9px;height:9px;border-radius:50%;background:var(--c);box-shadow:0 0 0 1.5px rgba(11,17,36,.9);}',
    '.ah-dia{flex:none;width:8px;height:8px;transform:rotate(45deg);background:#0e1428;box-shadow:0 0 0 2px var(--c,#d9b45a);}',
    '.ah-grid{display:grid;grid-template-columns:var(--lab) minmax(0,1fr);}',
    '.ah-labs{display:flex;flex-direction:column;}',
    '.ah-y{position:relative;height:var(--ph);}',
    '.ah-y span{position:absolute;right:7px;transform:translateY(50%);font:500 .66rem/1 var(--bk);color:var(--dim);}',
    '.ah-y span.ah-tg{color:var(--gold);}',
    '.ah-pn{height:var(--rh);display:flex;align-items:center;justify-content:flex-end;padding-right:7px;text-align:right;font:400 .62rem/1.02 var(--sc);letter-spacing:.03em;color:var(--ink);text-wrap:balance;}',
    '.ah-pn.me{color:var(--gold);}',
    '.ah-cols{position:relative;min-width:0;}',
    '.ah-plot{position:relative;height:var(--ph);border-bottom:1px solid rgba(243,233,210,.28);margin-bottom:5px;}',
    '.ah-plot svg{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible;}',
    '.ah-gl{position:absolute;left:0;right:0;height:0;border-top:1px solid rgba(243,233,210,.1);}',
    '.ah-gl.ah-tg{border-top:1px dashed rgba(217,180,90,.7);}',
    '.ah-pt{position:absolute;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:var(--c);box-shadow:0 0 0 2px #0e1428;}',
    '.ah-pt.ah-sl{width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:1px;transform:rotate(45deg);background:#0e1428;box-shadow:0 0 0 2px var(--c),0 0 0 4px #0e1428;}',
    '.ah-row{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));height:var(--rh);}',
    '.ah-cell{margin:2px 1.5px;border-radius:4px;background:rgba(243,233,210,.07);}',
    '.ah-cell.ah-a{background:' + PCOL[0] + ';}.ah-cell.ah-b{background:' + PCOL[1] + ';}',
    '.ah-rn{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));padding-top:3px;}',
    '.ah-rn span{text-align:center;font:500 .66rem/1.3 var(--bk);color:var(--dim);}',
    '.ah-rn span.ah-on{color:var(--ink);}',
    '.ah-band{position:absolute;top:-3px;bottom:-2px;width:calc(100% / var(--n));left:calc((var(--at) - 1) * 100% / var(--n));border-radius:7px;background:rgba(243,233,210,.1);box-shadow:inset 0 0 0 1px rgba(243,233,210,.3);pointer-events:none;transition:left .18s ease;}',
    '.ah-hits{position:absolute;inset:-3px 0 -2px;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));}',
    '.ah-hits button{appearance:none;border:0;background:none;padding:0;margin:0;cursor:pointer;border-radius:7px;-webkit-tap-highlight-color:transparent;}',
    '.ah-hits button:focus-visible{outline:2px solid #fff;outline-offset:-2px;}',
    '.ah-cap{margin:0;padding-left:var(--lab);font:500 .74rem/1.25 var(--bk);color:var(--dim);}',
    '.ah-read{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px;align-items:center;margin-top:2px;padding:9px 11px;border-radius:12px;background:rgba(11,17,36,.55);box-shadow:inset 0 0 0 1px rgba(217,180,90,.25);}',
    '.ah-rd-n{display:flex;flex-direction:column;align-items:center;min-width:44px;}',
    '.ah-rd-n small{font:400 .6rem/1.2 var(--sc);letter-spacing:.16em;color:var(--gold);text-transform:uppercase;}',
    '.ah-rd-n b{font:500 1.7rem/1 var(--bk);}',
    '.ah-rd-t{width:100%;border-collapse:collapse;font:500 .86rem/1.25 var(--bk);}',
    '.ah-rd-t th{padding:0 0 2px;text-align:right;font:400 .58rem/1.2 var(--sc);letter-spacing:.14em;color:var(--gold);text-transform:uppercase;}',
    '.ah-rd-t td{padding:1px 0;text-align:right;white-space:nowrap;}',
    '.ah-rd-t td:first-child{text-align:left;white-space:normal;overflow-wrap:break-word;}',
    '.ah-rd-t td:first-child span{display:inline-flex;align-items:center;gap:6px;}',
    '.ah-rd-t td.ah-g{color:var(--dim);}',
    '.ah-rd-x{grid-column:1 / -1;margin:0;font:500 .82rem/1.3 var(--bk);color:var(--ink);}',
    // the map at the end
    '.ah-map{padding:11px 10px 6px;display:flex;flex-direction:column;gap:0;}',
    '.ah-mh{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;padding-bottom:8px;font:400 .82rem/1.2 var(--sc);letter-spacing:.05em;}',
    '.ah-mh span{display:flex;align-items:center;gap:6px;min-width:0;}',
    '.ah-mh>span:first-child{justify-content:flex-end;text-align:right;}',
    '.ah-mh>span:nth-child(2){display:none;}',
    // (a phone: the Place on a line of its own, the two sides facing each other under it; wider: the Place between them)
    '.ah-mr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px 10px;align-items:start;padding:10px 0;border-top:1px solid rgba(217,180,90,.22);}',
    '.ah-mp{order:-1;grid-column:1 / -1;display:flex;align-items:center;justify-content:center;gap:10px;min-width:0;}',
    '.ah-mp-pic{position:relative;flex:none;width:46px;height:46px;border-radius:11px;background:#3c4a6e;box-shadow:0 0 0 1.5px #0b1124,0 0 0 3.5px var(--h,rgba(243,233,210,.3)),0 4px 10px rgba(0,0,0,.45);}',
    '.ah-mp-pic img{width:100%;height:100%;object-fit:cover;border-radius:11px;display:block;}',
    '.ah-mp-t{display:flex;flex-direction:column;gap:2px;min-width:0;}',
    '.ah-mp b{font:400 .86rem/1.05 var(--sc);letter-spacing:.03em;}',
    '.ah-mp small{font:500 .74rem/1.15 var(--bk);color:var(--dim);}',
    '.ah-ms{display:flex;align-items:flex-start;gap:7px;min-width:0;}',
    '.ah-ms.ah-l{flex-direction:row-reverse;}',
    '.ah-mi{flex:none;min-width:27px;height:27px;padding:0 5px;border-radius:999px;display:grid;place-items:center;font:600 1rem/1 var(--bk);color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--c);}',
    '.ah-mi.ah-hold{background:var(--c);color:#14110a;box-shadow:0 0 0 2px #0b1124,0 0 0 3px var(--c);}',
    '.ah-mf{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1;}',
    '.ah-ms.ah-l .ah-mf{align-items:flex-end;}',
    '.ah-fig{display:flex;align-items:center;gap:5px;min-width:0;max-width:100%;font:500 .78rem/1.1 var(--bk);}',
    '.ah-ms.ah-l .ah-fig{flex-direction:row-reverse;text-align:right;}',
    '.ah-fig i{flex:none;width:24px;height:24px;border-radius:50%;overflow:hidden;background:var(--f,#3c4a6e);box-shadow:0 0 0 1.5px var(--c);}',
    '.ah-fig i img{width:100%;height:100%;object-fit:cover;object-position:50% 22%;display:block;}',
    '.ah-fig span{min-width:0;overflow-wrap:break-word;}',
    '.ah-none{font:500 .78rem/27px var(--bk);color:rgba(243,233,210,.4);}',
    // the numbers, side by side
    '.ah-tape{padding:6px 12px;display:flex;flex-direction:column;}',
    '.ah-tr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr);gap:8px;align-items:center;padding:7px 0;border-top:1px solid rgba(217,180,90,.2);}',
    '.ah-tr:first-child{border-top:0;}',
    '.ah-tr b{font:500 1.25rem/1.1 var(--bk);color:var(--ink);overflow-wrap:break-word;min-width:0;}',
    '.ah-tr b:last-child{text-align:right;}',
    '.ah-tr b.ah-up{color:var(--c);}',
    '.ah-tr span{text-align:center;font:400 .7rem/1.15 var(--sc);letter-spacing:.1em;color:var(--gold);text-transform:uppercase;text-wrap:balance;}',
    '.ah-tr.ah-hd,.ah-tr.ah-ch{grid-template-columns:minmax(0,1fr) minmax(0,1fr);}',
    '.ah-tr.ah-ch span{grid-column:1 / -1;}',
    '.ah-tr.ah-ch b{font-size:.95rem;}',
    '.ah-tr.ah-hd b{font:400 .86rem/1.15 var(--sc);letter-spacing:.05em;display:flex;align-items:center;gap:6px;min-width:0;}',
    '.ah-tr.ah-hd b:last-child{justify-content:flex-end;}',
    // the Threads that were made
    '.ah-links{display:flex;flex-direction:column;gap:8px;}',
    '.ah-link{display:grid;grid-template-columns:auto minmax(0,1fr);gap:11px;align-items:center;padding:10px 12px;}',
    '.ah-pair{display:flex;align-items:center;}',
    '.ah-th{flex:none;width:40px;height:52px;border-radius:6px;overflow:hidden;background:var(--f,#3c4a6e);box-shadow:0 0 0 1.5px rgba(217,180,90,.75),0 3px 8px rgba(0,0,0,.45);}',
    '.ah-th img{width:100%;height:100%;object-fit:cover;object-position:50% 22%;display:block;}',
    '.ah-pair u{flex:none;width:16px;height:2px;background:linear-gradient(90deg,#c9a24a,#f5dc97,#c9a24a);box-shadow:0 0 6px rgba(245,220,151,.7);}',
    '.ah-lt{display:flex;flex-direction:column;gap:3px;min-width:0;}',
    '.ah-lk{display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px;font:400 .62rem/1.2 var(--sc);letter-spacing:.14em;color:var(--gold);text-transform:uppercase;}',
    '.ah-lk em{font-style:normal;color:#14110a;background:linear-gradient(180deg,#f5dc97,#c9a24a);padding:0 6px;border-radius:999px;letter-spacing:.08em;}',
    '.ah-lt b{font:400 .95rem/1.15 var(--sc);letter-spacing:.03em;color:var(--ink);overflow-wrap:anywhere;}',
    '.ah-lt p{margin:0;font:500 .86rem/1.3 var(--bk);color:var(--ink);}',
    '.ah-lw{display:inline-flex;align-items:center;gap:5px;font:500 .76rem/1.2 var(--bk);color:var(--dim);}',
    '@media (max-width:379px){.ah-por{width:60px;height:60px;}.ah-nm{font-size:.95rem;letter-spacing:.03em;}.ah-ren b{font-size:1.8rem;}' +
      '.ah-read{grid-template-columns:minmax(0,1fr);}.ah-rd-n{flex-direction:row;align-items:baseline;gap:8px;}.ah-rd-n b{font-size:1.3rem;}' +
      '.ah-mr{grid-template-columns:minmax(0,1fr);}.ah-ms.ah-l{flex-direction:row;}.ah-mf,.ah-ms.ah-l .ah-mf{flex-direction:row;flex-wrap:wrap;align-items:center;gap:4px 10px;min-height:27px;}.ah-ms.ah-l .ah-fig{flex-direction:row;text-align:left;}' +
      '.ah-mh>span:first-child{flex-direction:row-reverse;}.ah-link{grid-template-columns:minmax(0,1fr);}.ah-pair{justify-content:center;}}',
    '@media (min-width:600px){.ah-race{--lab:112px;--ph:150px;}.ah-pn{font-size:.72rem;}.ah-fig{font-size:.88rem;}.ah-th{width:48px;height:62px;}' +
      '.ah-mh,.ah-mr{grid-template-columns:minmax(0,1fr) 150px minmax(0,1fr);}.ah-mh>span:nth-child(2){display:block;}.ah-mr{align-items:center;}.ah-ms{align-items:center;}' +
      '.ah-mp{order:0;grid-column:auto;flex-direction:column;gap:5px;text-align:center;}.ah-mp-t{align-items:center;}.ah-mp-pic{width:62px;height:62px;}.ah-mp b{text-wrap:balance;}}'
  ].join(''));

  function pic(ui, src, alt) {
    // (a card whose picture has not been made yet, text.js NOPIC: not asked for, once the card texts are here)
    var m = /\/t\/(?:place-)?([a-z]+)\.webp$/.exec(src), TX = window.AnoriaText;   // (a Domain's picture is place-<id>)
    if (m && TX && TX.NOPIC && TX.NOPIC[m[1]]) return ui.el('span', { 'aria-hidden': 'true' });
    var im = ui.el('img', { src: src, alt: alt || '', loading: 'lazy' });
    im.addEventListener('error', function () { im.remove(); });   // (no picture: the flat panel in the card's colour)
    return im;
  }
  // a Seal: whole in its owner's colour, or broken (an empty outline with a crack)
  var SEAL = function (on, c) {
    return '<svg class="ah-seal" viewBox="0 0 15 17" aria-hidden="true"><path d="M7.5 1l5.6 2.1v4.6c0 3.6-2.3 6.4-5.6 8.1-3.3-1.7-5.6-4.5-5.6-8.1V3.1z" fill="' + (on ? c : 'none') + '" stroke="' + (on ? '#0b1124' : 'rgba(243,233,210,.38)') + '" stroke-width="1.2"/>' +
      (on ? '' : '<path d="M5.2 5.3l2 2.6-1.6 2 2.4 3" fill="none" stroke="rgba(243,233,210,.38)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>') + '</svg>';
  };

  HistView.register('anoria', function (e, ui) {
    var d = e.dt, el = ui.el;
    if (d && d.v === 3 && Array.isArray(d.pl)) return viewN(e, ui, d);
    if (!d || d.v !== 2 || !Array.isArray(d.pl) || d.pl.length !== 2) return null;   // (a game from before the details were kept)
    var P = (e.players || []).slice(0, 2); if (P.length !== 2) return null;
    var name = function (i) { return P[i].name || 'Player ' + (i + 1); };
    var w = typeof d.w === 'number' ? d.w : P[0].name === e.winner ? 0 : P[1].name === e.winner ? 1 : -1;
    // (rt: each side's Renown at the end of every round; what a round added is the step from the round before)
    var cum = (d.rt || []).map(function (s) { var a = String(s).split('-'); return [+a[0] || 0, +a[1] || 0]; }), n = cum.length, tg = +d.tg || 30;   // (a record with no tg is from when 30 Renown won; every game since says its own)
    var rr = cum.map(function (c, r) { return [c[0] - (r ? cum[r - 1][0] : 0), c[1] - (r ? cum[r - 1][1] : 0)]; });
    var seals = (d.sl || []).map(function (s) { var a = String(s).split('|'); return { r: +a[0], by: +a[1] }; });
    var links = [], seen = {};
    (d.links || []).forEach(function (s) { var a = String(s).split('|'), k = a[2] + '>' + a[3]; if (seen[k + a[1]]) return; seen[k + a[1]] = 1; links.push({ r: +a[0], o: +a[1], from: a[2], to: a[3], ren: +a[4] || 0, line: a[5] === 'l', key: k }); });
    var root = el('div', { class: 'ah' });
    var fills = [];   // (what waits for the cards' names)

    // ── Who led each company, and how the game ended ──
    var side = function (i) {
      var p = d.pl[i], won = w === i, por = el('span', { class: 'ah-por', style: { '--c': PCOL[i] } }, [pic(ui, ART + p.g + '.webp', '')]);
      if (won) por.appendChild(el('em', { class: 'ah-won', text: 'Won' }));
      var gname = el('span', { text: cap(p.g) }); fills.push(function () { gname.textContent = nameOf(p.g); });
      var sm = p.sm === 4 ? 4 : 3, s = '', left = Math.max(0, Math.min(sm, +p.s || 0)); for (var k = 0; k < sm; k++) s += SEAL(k < left, PCOL[i]);   // (Lincoln's company begins with four)
      return el('div', { class: 'ah-side' + (w >= 0 && !won ? ' ah-lose' : '') }, [por,
        el('div', { class: 'ah-nm', text: name(i) }),
        el('div', { class: 'ah-ren' }, [el('b', { text: String(P[i].score == null ? 0 : P[i].score) }), el('small', { text: 'Renown' })]),
        el('div', { class: 'ah-fact' }, [el('small', { text: 'Guide' }), gname]),
        el('div', { class: 'ah-fact' }, [el('small', { text: p.b ? 'Built deck' : 'Deck' }), el('span', { text: p.d || '' })]),
        el('div', { class: 'ah-seals', role: 'img', 'aria-label': left + (left === 1 ? ' Seal' : ' Seals') + ' left', html: s })]);
    };
    var how, sub = '';
    var L = w >= 0 ? 1 - w : -1;
    if (w < 0) how = 'The game ended level after ' + d.rounds + ' rounds.';
    else if (d.how === 'seals') how = name(w) + ' broke all ' + (d.pl[L].sm === 4 ? 'four' : 'three') + ' of ' + poss(name(L)) + ' Seals in round ' + d.rounds + '.';
    else if ((P[w].score || 0) >= tg) how = name(w) + ' reached ' + P[w].score + ' Renown at the end of round ' + d.rounds + '.';
    else how = name(w) + ' had more Renown when round ' + d.rounds + ', the last round, ended.';
    if (e.mode) sub = /^vs Computer \((.+)\)$/.test(e.mode) ? 'The computer played at ' + RegExp.$1 + '.' : e.mode === 'Pass & play' ? 'Two people played on one device.' : '';
    root.appendChild(el('div', { class: 'ah-plate ah-top' }, [
      el('div', { class: 'ah-vs' }, [side(0), side(1)]),
      el('p', { class: 'ah-how' }, [el('span', { text: how }), sub ? el('small', { text: sub }) : null])]));

    // ── The race for Renown, and who scored each Place every round ──
    if (n >= 1) (function () {
      var top = Math.max(tg, cum[n - 1][0], cum[n - 1][1]), step = top > 40 ? 20 : 10, max = Math.ceil((top + 1) / 5) * 5;
      var X = function (r) { return (r - 0.5) / n * 100; }, Y = function (v) { return (1 - v / max) * 100; };
      var plot = el('div', { class: 'ah-plot' }), y = el('div', { class: 'ah-y' });
      for (var v = 0; v <= max; v += step) if (v !== tg) {
        if (v) plot.appendChild(el('i', { class: 'ah-gl', style: { top: Y(v) + '%' } }));
        if (Math.abs(v - tg) >= step * 0.6 || v === 0) y.appendChild(el('span', { text: String(v), style: { bottom: (v / max * 100) + '%' } }));
      }
      plot.appendChild(el('i', { class: 'ah-gl ah-tg', style: { top: Y(tg) + '%' } }));
      y.appendChild(el('span', { class: 'ah-tg', text: String(tg), style: { bottom: (tg / max * 100) + '%' } }));
      var svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">';
      [1, 0].forEach(function (i) {   // (the first seat's line is drawn last, on top)
        var pts = ['0,100'].concat(cum.map(function (c, r) { return X(r + 1).toFixed(2) + ',' + Y(c[i]).toFixed(2); })).join(' ');
        svg += '<polyline points="' + pts + '" fill="none" stroke="' + PCOL[i] + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>';
      });
      plot.insertAdjacentHTML('beforeend', svg + '</svg>');
      [1, 0].forEach(function (i) { cum.forEach(function (c, r) {
        var sb = seals.some(function (s) { return s.r === r + 1 && s.by === i; });
        if (sb || r === n - 1) plot.appendChild(el('i', { class: 'ah-pt' + (sb ? ' ah-sl' : ''), style: { left: X(r + 1) + '%', top: Y(c[i]) + '%', '--c': PCOL[i] } }));
      }); });
      var labs = el('div', { class: 'ah-labs' }, [y]), cols = el('div', { class: 'ah-cols' }, [plot]);
      var hold = (d.hold || []).map(String), pk = (d.map || []).map(function (s) { return String(s).split('|')[0]; });
      if (hold.length === n && pk.length === 5) pk.forEach(function (k, row) {
        var lab = el('div', { class: 'ah-pn', text: cap(k) }); fills.push(function () { lab.textContent = placeName(k); }); labs.appendChild(lab);
        var line = el('div', { class: 'ah-row' });
        hold.forEach(function (h, r) { var ch = h.charAt(row); line.appendChild(el('i', { class: 'ah-cell' + (ch === 'a' ? ' ah-a' : ch === 'b' ? ' ah-b' : ''), title: 'Round ' + (r + 1) })); });
        cols.appendChild(line);
      });
      var rn = el('div', { class: 'ah-rn' }); for (var r = 1; r <= n; r++) rn.appendChild(el('span', { text: String(r) }));
      cols.appendChild(rn);
      var band = el('i', { class: 'ah-band' }), hits = el('div', { class: 'ah-hits' }), read = el('div', { class: 'ah-read', 'aria-live': 'polite' });
      cols.appendChild(band); cols.appendChild(hits);
      var at = 0;
      function pick(r) {
        if (r === at) return; at = r; cols.style.setProperty('--at', r);
        [].forEach.call(rn.children, function (s, i) { s.classList.toggle('ah-on', i === r - 1); });
        read.innerHTML = '';
        read.appendChild(el('div', { class: 'ah-rd-n' }, [el('small', { text: 'Round' }), el('b', { text: String(r) })]));
        var t = el('table', { class: 'ah-rd-t' }, [el('tr', null, [el('th', { text: '' }), el('th', { text: 'This round' }), el('th', { text: 'So far' })])]);
        [0, 1].forEach(function (i) {
          t.appendChild(el('tr', null, [el('td', null, [el('span', null, [el('i', { class: 'ah-dot', style: { '--c': PCOL[i] } }), el('span', { text: name(i) })])]),
            el('td', { class: 'ah-g', text: '+' + (rr[r - 1][i] || 0) }), el('td', { text: String(cum[r - 1][i]) })]));
        });
        read.appendChild(t);
        seals.filter(function (s) { return s.r === r; }).forEach(function (s) {
          read.appendChild(el('p', { class: 'ah-rd-x', text: name(s.by) + ' held ' + poss(name(1 - s.by)) + ' Gate, and one of ' + poss(name(1 - s.by)) + ' Seals broke.' }));
        });
      }
      for (var q = 1; q <= n; q++) (function (r) {
        var b = el('button', { type: 'button', 'aria-label': 'Round ' + r });
        b.addEventListener('click', function () { pick(r); if (window.Kit && Kit.haptic) Kit.haptic('tick'); });
        b.addEventListener('mouseenter', function () { pick(r); }); b.addEventListener('focus', function () { pick(r); });
        hits.appendChild(b);
      })(q);
      var key = el('div', { class: 'ah-key' }, [0, 1].map(function (i) { return el('span', null, [el('i', { class: 'ah-dot', style: { '--c': PCOL[i] } }), el('span', { text: name(i) })]); }));
      if (seals.length) key.appendChild(el('span', null, [el('i', { class: 'ah-dia', style: { '--c': '#f3e9d2' } }), el('span', { text: 'A Seal broke' })]));
      var grid = el('div', { class: 'ah-grid' }, [labs, cols]); cols.style.setProperty('--n', n);
      var box = el('div', { class: 'ah-plate ah-race' }, [key, grid,
        hold.length === n && pk.length === 5 ? el('p', { class: 'ah-cap', text: DW('Under the lines, each square is a Place in one round, in the color of whoever held it.') }) : null, read]);
      pick(n);
      root.appendChild(ui.section('Renown, round by round', box));
    })();

    // ── The map as it stood at the end ──
    var rows = (d.map || []).map(function (s) { var a = String(s).split('|'); return { k: a[0], h: +a[1], m: [+a[2] || 0, +a[3] || 0], f: [a[4] ? a[4].split(',') : [], a[5] ? a[5].split(',') : []] }; });
    if (rows.length === 5) (function () {
      var box = el('div', { class: 'ah-plate ah-map' });
      box.appendChild(el('div', { class: 'ah-mh' }, [el('span', null, [el('span', { text: name(0) }), el('i', { class: 'ah-dot', style: { '--c': PCOL[0] } })]), el('span'),
        el('span', null, [el('i', { class: 'ah-dot', style: { '--c': PCOL[1] } }), el('span', { text: name(1) })])]));
      var role = [Poss(name(0)) + ' Gate', Poss(name(0)) + ' Outpost', 'The Crossroads', Poss(name(1)) + ' Outpost', Poss(name(1)) + ' Gate'];
      rows.forEach(function (x, ri) {
        var half = function (i) {
          var figs = el('div', { class: 'ah-mf' });
          if (!x.f[i].length) figs.appendChild(el('span', { class: 'ah-none', text: 'Nobody' }));
          x.f[i].forEach(function (k) {
            var nm = el('span', { text: cap(k) }), th = el('i', { style: { '--c': PCOL[i] } }, [pic(ui, ART + k + '.webp', '')]);
            fills.push(function () { nm.textContent = nameOf(k); th.style.setProperty('--f', facOf(k)); });
            figs.appendChild(el('span', { class: 'ah-fig' }, [th, nm]));
          });
          return el('div', { class: 'ah-ms' + (i === 0 ? ' ah-l' : '') }, [
            el('b', { class: 'ah-mi' + (x.h === i ? ' ah-hold' : ''), style: { '--c': PCOL[i] }, 'aria-label': x.m[i] + ' Might' + (x.h === i ? DW(', holding the Place') : ''), text: String(x.m[i]) }), figs]);
        };
        var nm = el('b', { text: cap(x.k) }); fills.push(function () { nm.textContent = placeName(x.k); });
        box.appendChild(el('div', { class: 'ah-mr' }, [half(0),
          el('div', { class: 'ah-mp' }, [el('span', { class: 'ah-mp-pic', style: x.h >= 0 ? { '--h': PCOL[x.h] } : null }, [pic(ui, ART + 'place-' + x.k + '.webp', '')]), el('div', { class: 'ah-mp-t' }, [nm, el('small', { text: role[ri] })])]),
          half(1)]));
      });
      root.appendChild(ui.section('The map at the end', [box, el('p', { class: 'ah-cap', style: { 'padding-left': '0' }, text: DW('The numbers are each side’s Might at the Place. A filled number held the Place.') })]));
    })();

    // ── The numbers, side by side ──
    (function () {
      var a = d.pl[0], b = d.pl[1], box = el('div', { class: 'ah-plate ah-tape' });
      var who = function (i) { return el('b', null, i === 0 ? [el('i', { class: 'ah-dot', style: { '--c': PCOL[0] } }), el('span', { text: name(0) })] : [el('span', { text: name(1) }), el('i', { class: 'ah-dot', style: { '--c': PCOL[1] } })]); };
      box.appendChild(el('div', { class: 'ah-tr ah-hd' }, [who(0), who(1)]));
      var num = function (label, x, y) {
        box.appendChild(el('div', { class: 'ah-tr' }, [el('b', { class: x > y ? 'ah-up' : '', style: { '--c': PCOL[0] }, text: String(x) }), el('span', { text: label }), el('b', { class: y > x ? 'ah-up' : '', style: { '--c': PCOL[1] }, text: String(y) })]));
      };
      num('Clashes won', +a.ko || 0, +b.ko || 0);
      num(DW('Times a Place scored'), +a.h || 0, +b.h || 0);
      num('Seals broken', +a.sb || 0, +b.sb || 0);
      num('Legacy Lines', +a.ln || 0, +b.ln || 0);
      if (a.ch || b.ch) {
        var ch = function (p) { var s = el('b', { text: p.ch ? cap(p.ch) : 'Nobody' }); if (p.ch) fills.push(function () { s.textContent = nameOf(p.ch); }); return s; };
        box.appendChild(el('div', { class: 'ah-tr ah-ch' }, [el('span', { text: 'Won the most clashes' }), ch(a), ch(b)]));
      }
      root.appendChild(ui.section('Side by side', box));
    })();

    // ── The Threads and Legacy lines that were made ──
    if (links.length) (function () {
      var list = el('div', { class: 'ah-links' });
      links.forEach(function (x) {
        var th = function (k) { var bare = k.replace(/^@/, ''), s = el('span', { class: 'ah-th' }, [pic(ui, ART + (k.charAt(0) === '@' ? 'place-' : '') + bare + '.webp', '')]); fills.push(function () { s.style.setProperty('--f', facOf(k)); }); return s; };
        var title = el('b', { text: cap(x.from.replace(/^@/, '')) + ' and ' + cap(x.to) }), tale = el('p', { text: '' });
        fills.push(function () {
          var from = nameOf(x.from), to = nameOf(x.to), T = (window.AnoriaText || {}).LINKS || {};
          title.textContent = from + ' and ' + to;
          tale.textContent = T[x.key] || (x.line ? to + ' followed ' + theName(x.from) + '.' : to + ' grew from ' + theName(x.from) + '.');
        });
        list.appendChild(el('div', { class: 'ah-plate ah-link' }, [
          el('div', { class: 'ah-pair', 'aria-hidden': 'true' }, [th(x.from), el('u'), th(x.to)]),
          el('div', { class: 'ah-lt' }, [
            el('div', { class: 'ah-lk' }, [el('span', { text: 'A Legacy Line in round ' + x.r }), x.ren ? el('em', { text: '+' + x.ren + ' Renown' }) : null]),
            title, tale,
            el('span', { class: 'ah-lw' }, [el('i', { class: 'ah-dot', style: { '--c': PCOL[x.o] } }), el('span', { text: name(x.o) + ' made this one' })])])]));
      });
      root.appendChild(ui.section('Legacy Lines', list));
    })();

    data(function () { fills.forEach(function (f) { try { f(); } catch (err) {} }); });
    return root;
  });
})();
