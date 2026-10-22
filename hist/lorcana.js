'use strict';
// History views: Lorcana (the game, and the lore counter)
(function () {
  if (!window.HistView) return;
  var INKS = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'];
  var INKC = { Amber: '#f2b01e', Amethyst: '#8a4bb0', Emerald: '#2e9a4c', Ruby: '#d0213f', Sapphire: '#1679c0', Steel: '#9aa8b4' };
  var LCP = 'https://cards.lorcast.io/', BACKUP = 'https://firebasestorage.googleapis.com/v0/b/familygames-da3e5.firebasestorage.app/o/';
  // the ink symbols cut from the cards (games/lorcana-inks.webp, one per ink in INKS order)
  var base = (function () { try { var s = document.querySelector('script[src*="hist-view.js"]'); return new URL('games/', s.src).href; } catch (e) { return ''; } })();
  function inkIco(k) { var i = INKS.indexOf(k); return i < 0 ? '' : '<i class="hv-ink" role="img" aria-label="' + k + '" title="' + k + '" style="background-image:url(' + base + 'lorcana-inks.webp);background-position:' + (i * 20) + '% 0"></i>'; }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function poss(n) { return n === 'You' ? 'Your' : n + (/s$/i.test(n) ? '’' : '’s'); }

  HistView.css('hv-lorc', [
    '.hv-lp{display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:16px;background:linear-gradient(160deg,rgba(232,193,106,.10),rgba(255,255,255,.03));box-shadow:inset 0 0 0 1px rgba(232,193,106,.22);}',
    '.hv-lp-h{display:flex;align-items:center;gap:10px;}',
    '.hv-lp-h .grow{flex:1;min-width:0;}',
    '.hv-lp-h b{display:block;font-weight:900;font-size:1.02rem;}',
    '.hv-lp-dk{display:flex;align-items:center;gap:6px;color:var(--text-2);font-weight:800;font-size:.86rem;min-width:0;}',
    '.hv-lp-dk span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.hv-ink{display:inline-block;flex:none;width:17px;height:19px;background:0 0/600% 100% no-repeat;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.55));}',
    '.hv-lp-board{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}',
    '.hv-lc{position:relative;flex:none;width:52px;height:72px;border-radius:5px;overflow:hidden;background:var(--lc,#444);box-shadow:0 2px 6px rgba(0,0,0,.45);transition:transform .2s;}',
    '.hv-lc img{width:100%;height:100%;object-fit:cover;display:block;}',
    '.hv-lc>span{position:absolute;inset:0;display:flex;align-items:center;padding:3px;font-size:.5rem;font-weight:800;line-height:1.1;color:#fff;text-shadow:0 1px 2px #000;}',
    '.hv-lc.x{transform:rotate(90deg) scale(.86);margin:0 10px;}',
    '.hv-lc.l{width:72px;height:52px;}',
    '.hv-lp-note{font-size:.78rem;color:var(--text-3);font-weight:700;}',
    // the scoreboard
    '.lh-hd{position:relative;display:flex;flex-direction:column;gap:8px;padding:14px 12px 12px;border-radius:16px;color:#f6ecd2;background:radial-gradient(120% 90% at 50% 0%,#24305e,#0f1430 70%);box-shadow:inset 0 0 0 1.5px rgba(232,193,106,.55),inset 0 0 0 5px rgba(15,20,48,.9),inset 0 0 0 6px rgba(232,193,106,.25),0 10px 24px -10px rgba(0,0,0,.8);}',
    '.lh-vs{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px;}',
    '.lh-side{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;}',
    '.lh-gem{position:relative;width:74px;height:84px;}',
    '.lh-gem svg{width:100%;height:100%;display:block;overflow:visible;}',
    '.lh-gem b{position:absolute;inset:0;display:grid;place-items:center;padding-bottom:4px;font-family:var(--display);font-weight:400;font-size:1.9rem;color:#1d1530;text-shadow:0 1px 0 rgba(255,255,255,.5);}',
    '.lh-side.lose .lh-gem{opacity:.8;transform:scale(.88);}',
    '.lh-nm{display:flex;align-items:center;gap:5px;max-width:100%;font-weight:900;font-size:.92rem;}',
    '.lh-nm span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.lh-nm i.dot{flex:none;width:9px;height:9px;border-radius:50%;background:var(--c);box-shadow:0 0 0 1.5px rgba(255,255,255,.7);}',
    '.lh-inks{display:flex;gap:2px;min-height:19px;}',
    '.lh-won{font-size:.6rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#1d1530;background:linear-gradient(180deg,#f7dc93,#d8a944);padding:2px 8px;border-radius:999px;}',
    '.lh-mid{font-family:var(--display);font-size:1rem;color:rgba(232,193,106,.7);}',
    '.lh-foot{text-align:center;font-size:.84rem;font-weight:800;color:#e8c16a;line-height:1.3;}',
    '.lh-foot small{display:block;color:rgba(246,236,210,.6);font-size:.74rem;font-weight:700;}',
    // the lore race
    '.lh-chart{border-radius:14px;padding:8px 8px 4px;background:#11162f;box-shadow:inset 0 0 0 1px rgba(232,193,106,.18);line-height:0;}',
    '.lh-chart svg{width:100%;height:auto;display:block;}',
    // the table at the end
    '.lh-mat{display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:16px;background:radial-gradient(110% 80% at 50% 50%,#2a3a72,#121a3c 75%);box-shadow:inset 0 0 0 2px rgba(232,193,106,.45),inset 0 0 22px rgba(0,0,0,.6),0 10px 22px -10px rgba(0,0,0,.8);}',
    '.lh-half{display:flex;flex-direction:column;gap:6px;}',
    '.lh-who{display:flex;align-items:center;gap:6px;font-size:.78rem;font-weight:900;color:#f6ecd2;}',
    '.lh-who .grow{flex:1;}',
    '.lh-ct{display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:999px;background:rgba(0,0,0,.3);color:rgba(246,236,210,.8);font-size:.66rem;font-weight:800;}',
    '.lh-ct .ico{width:11px;height:11px;}',
    '.lh-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;min-height:60px;}',
    '.lh-row .none{font-size:.74rem;font-weight:700;color:rgba(246,236,210,.45);}',
    '.lh-line{height:12px;background:radial-gradient(closest-side,rgba(232,193,106,.6),transparent) center/100% 1.5px no-repeat;position:relative;}',
    '.lh-line::after{content:"";position:absolute;left:50%;top:50%;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;transform:rotate(45deg);background:#e8c16a;}',
    '.hv-lc .dmg{position:absolute;right:2px;top:2px;min-width:15px;height:15px;padding:0 3px;border-radius:8px;display:grid;place-items:center;background:#c8102e;color:#fff;font-size:.56rem;font-weight:900;box-shadow:0 0 0 1.5px #fff;}',
    '.hv-lc .lore{position:absolute;left:50%;bottom:-2px;transform:translateX(-50%);min-width:22px;height:16px;padding:0 4px;border-radius:5px;display:grid;place-items:center;background:linear-gradient(180deg,#f7dc93,#d8a944);color:#1d1530;font-size:.62rem;font-weight:900;box-shadow:0 1px 3px rgba(0,0,0,.6);}',
    '.hv-lc .n{position:absolute;right:2px;bottom:2px;padding:0 4px;border-radius:6px;background:rgba(0,0,0,.72);color:#fff;font-size:.58rem;font-weight:900;}',
    '.hv-lc.gone{filter:grayscale(.75) brightness(.7);}',
    '.hv-lc.gone::after{content:"";position:absolute;inset:0;background:linear-gradient(45deg,transparent 46%,rgba(200,16,46,.95) 46% 54%,transparent 54%),linear-gradient(-45deg,transparent 46%,rgba(200,16,46,.95) 46% 54%,transparent 54%);}',
    // turn by turn
    '.lh-road{display:flex;flex-wrap:wrap;gap:3px;}',
    '.lh-rb{appearance:none;border:0;cursor:pointer;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;width:31px;height:38px;border-radius:7px;padding:0;font:inherit;color:#16102e;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 80%,#fff),var(--c));box-shadow:inset 0 -2px 0 rgba(0,0,0,.22);}',
    '.lh-rb b{font-size:.74rem;font-weight:900;line-height:1;}',
    '.lh-rb i{font-style:normal;font-size:.58rem;font-weight:900;line-height:1;min-height:.58rem;opacity:.75;}',
    '.lh-rb.big i{opacity:1;padding:1px 3px;border-radius:4px;background:#16102e;color:#f7dc93;}',
    '.lh-rb.on{outline:2.5px solid #fff;outline-offset:1.5px;}',
    '.lh-kl{display:inline-block;margin-right:5px;padding:0 3px;border-radius:4px;font-size:.62rem;background:#16102e;color:#f7dc93;box-shadow:0 0 0 1px rgba(247,220,147,.4);}',
    '.lh-turn{display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:14px;color:#f6ecd2;background:radial-gradient(120% 100% at 50% 0%,#24305e,#11162f);box-shadow:inset 0 0 0 1px rgba(232,193,106,.3);}',
    '.lh-th{display:flex;align-items:center;gap:8px;font-weight:900;font-size:.9rem;}',
    '.lh-th .grow{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.lh-th .gain{padding:2px 8px;border-radius:999px;background:linear-gradient(180deg,#f7dc93,#d8a944);color:#1d1530;font-size:.74rem;}',
    '.lh-th .tot{font-size:.74rem;font-weight:800;color:rgba(246,236,210,.65);}',
    '.lh-acts{display:flex;flex-wrap:wrap;gap:10px 16px;}',
    '.lh-act{display:flex;flex-direction:column;gap:4px;}',
    '.lh-act>small{font-size:.62rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,193,106,.85);}',
    '.lh-cards{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}',
    '.lh-cards .hv-lc{width:56px;height:78px;}',
    '.lh-cards .hv-lc.l{width:78px;height:56px;}',
    '.lh-fight{display:flex;align-items:center;gap:4px;}',
    '.lh-fight .vs{display:flex;flex-direction:column;align-items:center;color:#e8c16a;font-size:.56rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase;}',
    '.lh-fight .vs .ico{width:16px;height:16px;}',
    '.lh-tap{display:flex;align-items:center;flex-wrap:wrap;gap:8px;font-size:.86rem;}',
    '.lh-tap .sum{font-weight:900;color:#e8c16a;}',
    '.lh-quiet{font-size:.8rem;font-weight:700;color:rgba(246,236,210,.6);}',
    '.lh-key{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.72rem;font-weight:800;color:var(--text-3);}',
    '.lh-key i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px;}',
    // decks
    '.lh-played{display:flex;flex-wrap:wrap;gap:5px;}',
    '.lh-played .hv-lc{width:44px;height:61px;}',
    '.lh-played .hv-lc.l{width:61px;height:44px;}'
  ].join(''));

  function artUrl(i) {
    if (!i) return '';
    if (/^https?:/.test(i)) return i;
    var m = /^(crd_[0-9a-f]+)(\?\d+)?$/.exec(i);
    return m ? LCP + 'card/digital/small/' + m[1] + '.avif' + (m[2] || '') : LCP + i;
  }
  // c: {n name, i art, x exerted, t 'l' location, dmg, lore, count, gone}
  function cardTile(c, ui, ink) {
    var src = artUrl(c.i);
    var t = ui.el('span', { class: 'hv-lc' + (c.x ? ' x' : '') + (c.t === 'l' ? ' l' : '') + (c.gone ? ' gone' : ''), title: c.n + (c.x ? ' (exerted)' : '') + (c.dmg ? ', ' + c.dmg + ' damage' : ''), style: { '--lc': INKC[ink] || '#3a3550' } });
    function nameOnly() { var b = t.querySelector('img'); if (b) b.remove(); t.insertBefore(ui.el('span', { text: c.n }), t.firstChild); }
    if (src) {
      var img = ui.el('img', { src: src, alt: c.n, loading: 'lazy' }), tried = false;
      // the card art host is down or offline: try the backup copy, then just the name
      img.addEventListener('error', function () {
        if (!tried && src.indexOf(LCP) === 0) { tried = true; try { img.src = BACKUP + encodeURIComponent('lorcana/' + new URL(src).pathname.slice(1)) + '?alt=media'; return; } catch (e) {} }
        nameOnly();
      });
      t.appendChild(img);
    } else t.appendChild(ui.el('span', { text: c.n }));
    if (c.dmg) t.appendChild(ui.el('i', { class: 'dmg', text: String(c.dmg) }));
    if (c.lore) t.appendChild(ui.el('i', { class: 'lore', text: '+' + c.lore }));
    if (c.count > 1) t.appendChild(ui.el('i', { class: 'n', text: '×' + c.count }));
    return t;
  }

  function kindName(k) { return k === 'quick' ? 'Quick deck' : k === 'saved' ? 'Saved deck' : k === 'random' ? 'Random deck' : ''; }
  // the cards list: 'owner|type|art|name'
  function cardList(d) {
    return (Array.isArray(d.cs) ? d.cs : []).map(function (s) {
      var a = String(s).split('|');
      return { o: +a[0] || 0, t: a[1] || 'c', i: a[2] || '', n: a.slice(3).join('|') || 'Card' };
    });
  }
  function nums(s) { return String(s || '').split('.').filter(function (x) { return x !== ''; }).map(Number); }
  // a turn: 't|player|inked|played|quested|challenged|banished'
  function parseTurn(s) {
    var a = String(s).split('|');
    return { t: +a[0] || 0, p: +a[1] || 0, ink: +a[2] || 0, pl: nums(a[3]),
      q: String(a[4] || '').split('.').filter(Boolean).map(function (x) { var y = x.split(':'); return { c: +y[0], n: +y[1] || 0 }; }),
      ch: String(a[5] || '').split('.').filter(Boolean).map(function (x) { var y = x.split('>'); return { a: +y[0], t: +y[1] }; }),
      bn: nums(a[6]) };
  }
  // lore after each turn: [[a, b], ...]
  function loreRuns(d) { return String(d.lr || '').split(',').filter(Boolean).map(function (x) { var y = x.split('.'); return [+y[0] || 0, +y[1] || 0]; }); }

  // ── the scoreboard: two lore gems, the inks, how it ended ──
  var gid = 0;
  function gemSvg(win) {
    var id = 'lzg' + (++gid);
    return '<svg viewBox="0 0 74 84" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + (win ? '#fff3c4' : '#e9e4f2') + '"/><stop offset=".55" stop-color="' + (win ? '#e8c16a' : '#b9b2cc') + '"/><stop offset="1" stop-color="' + (win ? '#a8751c' : '#6f6a86') + '"/></linearGradient></defs>' +
      (win ? '<polygon points="37,0 72,40 37,84 2,40" fill="#e8c16a" opacity=".25" transform="translate(37 42) scale(1.12) translate(-37 -42)"/>' : '') +
      '<polygon points="37,4 68,40 37,80 6,40" fill="url(#' + id + ')" stroke="' + (win ? '#fff1b8' : '#d8d2e6') + '" stroke-width="2"/>' +
      '<polyline points="6,40 37,30 68,40" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.2"/><line x1="37" y1="4" x2="37" y2="30" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/></svg>';
  }
  function scoreboard(e, d, ui, P) {
    var el = ui.el, players = e.players || [], goal = d.goal || 20;
    var wi = -1; players.forEach(function (p, i) { if (e.winner && p.name === e.winner) wi = i; });
    function side(i) {
      var p = players[i] || {}, pd = (d.p || [])[i] || {}, win = i === wi;
      return el('div', { class: 'lh-side' + (wi >= 0 && !win ? ' lose' : '') }, [
        el('div', { class: 'lh-gem', html: gemSvg(win) + '<b>' + (p.score != null ? p.score : '') + '</b>' }),
        el('div', { class: 'lh-nm', style: { '--c': ui.color(i) } }, [el('i', { class: 'dot' }), el('span', { text: p.name || 'Player ' + (i + 1) })]),
        el('div', { class: 'lh-inks', html: (pd.k || []).map(inkIco).join('') }),
        win ? el('span', { class: 'lh-won', text: 'Winner' }) : null
      ]);
    }
    var turns = d.turns, w = players[wi], l = players[1 - wi], foot;
    if (d.how === 'deck' && w && l) foot = l.name + ' ran out of cards' + (turns ? ' on turn ' + turns : '');
    else if (w) foot = w.name + ' reached ' + (w.score >= goal ? w.score : goal) + ' lore' + (turns ? ' on turn ' + turns : '');
    var first = players[d.first] ? players[d.first].name + ' went first' : '';
    return el('div', { class: 'lh-hd' }, [
      el('div', { class: 'lh-vs' }, [side(0), el('span', { class: 'lh-mid', text: 'vs' }), side(1)]),
      foot ? el('div', { class: 'lh-foot' }, [document.createTextNode(foot), first || goal !== 20 ? el('small', { text: [first, goal !== 20 ? 'Long game, to ' + goal : ''].filter(Boolean).join(' · ') }) : null]) : null
    ]);
  }

  // ── the lore race: each side's lore after every turn, the goal line in gold ──
  function raceChart(runs, ui, goal, unit) {
    if (runs.length < 2) return null;
    var pts = [[0, 0]].concat(runs), n = pts.length - 1;
    var W = 320, H = 150, L = 22, Rr = 26, T = 10, B = 20;
    var top = Math.max(goal, Math.max.apply(null, pts.map(function (r) { return Math.max(r[0], r[1]); })));
    function x(i) { return L + i * (W - L - Rr) / n; }
    function y(v) { return T + (top - v) * (H - T - B) / top; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Lore after each ' + unit + '">';
    for (var g = top > 25 ? 10 : 5; g < top; g += top > 25 ? 10 : 5) s += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="rgba(255,255,255,.07)"/><text x="' + (L - 5) + '" y="' + (y(g) + 3) + '" text-anchor="end" font-size="8.5" font-weight="800" fill="rgba(255,255,255,.35)" font-family="system-ui">' + g + '</text>';
    s += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y(goal) + '" y2="' + y(goal) + '" stroke="#e8c16a" stroke-width="1.5" stroke-dasharray="5 4"/>';
    s += '<text x="' + (L - 5) + '" y="' + (y(goal) + 3) + '" text-anchor="end" font-size="9" font-weight="900" fill="#e8c16a" font-family="system-ui">' + goal + '</text>';
    s += '<text x="' + L + '" y="' + (H - 5) + '" font-size="9" font-weight="800" fill="rgba(255,255,255,.45)" font-family="system-ui">Start</text>';
    s += '<text x="' + (W - Rr) + '" y="' + (H - 5) + '" text-anchor="end" font-size="9" font-weight="800" fill="rgba(255,255,255,.45)" font-family="system-ui">' + cap(unit) + ' ' + n + '</text>';
    [0, 1].forEach(function (p) {
      var col = ui.color(p), line = pts.map(function (r, i) { return x(i).toFixed(1) + ',' + y(r[p]).toFixed(1); }).join(' ');
      s += '<polyline points="' + line + '" fill="none" stroke="' + col + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>';
      pts.forEach(function (r, i) { if (i && r[p] > pts[i - 1][p] + 2) s += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(r[p]).toFixed(1) + '" r="2.6" fill="' + col + '"/>'; });
      var last = pts[n][p], oth = pts[n][1 - p], dy = Math.abs(last - oth) < top * 0.08 ? (last >= oth ? -6 : 6) : 0;
      s += '<circle cx="' + x(n) + '" cy="' + y(last) + '" r="4.2" fill="' + col + '" stroke="#11162f" stroke-width="1.5"/>';
      s += '<text x="' + (x(n) + 7) + '" y="' + (y(last) + 3.5 + dy) + '" font-size="11" font-weight="900" fill="' + col + '" font-family="system-ui">' + last + '</text>';
    });
    return el0(ui, 'div', { class: 'lh-chart', html: s + '</svg>' });
  }
  function el0(ui, t, a, k) { return ui.el(t, a, k); }

  // ── the table at the end: each side's cards in play, the other player across the table ──
  function boardOf(pd, cards) {
    if (pd.bb != null) return nums0(pd.bb).map(function (s) { var m = /^(\d+)(x?)(?:d(\d+))?$/.exec(s); if (!m || !cards[+m[1]]) return null; var c = cards[+m[1]]; return { n: c.n, i: c.i, t: c.t, x: !!m[2], dmg: m[3] ? +m[3] : 0 }; }).filter(Boolean);
    return (pd.b || []).map(function (c) { return { n: c.n, i: c.i, t: c.t, x: !!c.x }; });
  }
  function nums0(s) { return String(s || '').split('.').filter(Boolean); }
  function tableAtEnd(e, d, ui, cards) {
    var el = ui.el, players = e.players || [];
    function half(i) {
      var pd = (d.p || [])[i] || {}, b = boardOf(pd, cards), ink = (pd.k || [])[0];
      var row = el('div', { class: 'lh-row' });
      b.forEach(function (c, j) { row.appendChild(cardTile(c, ui, (pd.k || [])[j % Math.max(1, (pd.k || []).length)] || ink)); });
      if (!b.length) row.appendChild(el('span', { class: 'none', text: 'Nothing in play' }));
      var cts = [];
      if (pd.iw != null) cts.push(el('span', { class: 'lh-ct', title: 'Cards in the inkwell', html: '<span>Inkwell ' + pd.iw + '</span>' }));
      if (pd.hd != null) cts.push(el('span', { class: 'lh-ct', title: 'Cards in hand', html: '<span>Hand ' + pd.hd + '</span>' }));
      if (pd.dk != null) cts.push(el('span', { class: 'lh-ct', title: 'Cards left in the deck', html: '<span>Deck ' + pd.dk + '</span>' }));
      var who = el('div', { class: 'lh-who' }, [ui.who((players[i] || {}).name || 'Player ' + (i + 1), i), el('span', { class: 'grow' })].concat(cts));
      return el('div', { class: 'lh-half' }, i === 1 ? [who, row] : [row, who]);
    }
    return el('div', { class: 'lh-mat' }, [half(1), el('div', { class: 'lh-line' }), half(0)]);
  }

  // ── turn by turn: a strip of turns, tap one to see its plays ──
  function turnByTurn(e, d, ui, cards, runs) {
    var el = ui.el, players = e.players || [], tks = (d.tk || []).map(parseTurn);
    if (!tks.length) return null;
    function name(i) { return (players[i] || {}).name || 'Player ' + (i + 1); }
    function inkFor(c) { var k = ((d.p || [])[c.o] || {}).k || []; return k[0]; }
    function tile(ix, o) { var c = cards[ix]; if (!c) return null; o = o || {}; return cardTile({ n: c.n, i: c.i, t: c.t, lore: o.lore, gone: o.gone, count: o.count }, ui, inkFor(c)); }
    function gain(tt) { var a = runs[tt.t - 1], b = runs[tt.t - 2] || [0, 0]; return a ? [a[0] - b[0], a[1] - b[1]] : [tt.q.reduce(function (s, q) { return tt.p === 0 ? s + q.n : s; }, 0), tt.q.reduce(function (s, q) { return tt.p === 1 ? s + q.n : s; }, 0)]; }
    var best = tks.length - 1, bestG = -1;
    tks.forEach(function (tt, i) { var g = gain(tt)[tt.p]; if (g > bestG) { bestG = g; best = i; } });
    var view = el('div');
    function show(i) {
      var tt = tks[i], g = gain(tt), kids = [], lr = runs[tt.t - 1];
      kids.push(el('div', { class: 'lh-th' }, [
        el('span', { class: 'grow', html: '<span style="color:' + ui.color(tt.p) + '">' + ui.esc(name(tt.p)) + '</span> · turn ' + tt.t }),
        g[tt.p] > 0 ? el('span', { class: 'gain', text: '+' + g[tt.p] + ' lore' }) : null,
        lr ? el('span', { class: 'tot', text: lr[0] + '–' + lr[1] }) : null
      ]));
      var killed = {}; tt.bn.forEach(function (b) { killed[b] = 1; });
      var acts = el('div', { class: 'lh-acts' });
      function act(label, nodes) { nodes = nodes.filter(Boolean); if (nodes.length) acts.appendChild(el('div', { class: 'lh-act' }, [el('small', { text: label }), el('div', { class: 'lh-cards' }, nodes)])); }
      var pn = {}, po = []; tt.pl.forEach(function (c) { if (!pn[c]) { pn[c] = { c: c, k: 0 }; po.push(pn[c]); } pn[c].k++; });
      act('Played', po.map(function (p) { return tile(p.c, { count: p.k }); }));
      var qn = {}, qo = []; tt.q.forEach(function (q) { if (!qn[q.c]) { qn[q.c] = { c: q.c, n: 0, k: 0 }; qo.push(qn[q.c]); } qn[q.c].n += q.n; qn[q.c].k++; });
      act('Quested', qo.map(function (q) { return tile(q.c, { lore: q.n, count: q.k }); }));
      act('Challenged', tt.ch.map(function (c) {
        var a = tile(c.a, { gone: killed[c.a] }), t = tile(c.t, { gone: killed[c.t] }); if (!a || !t) return null;
        return el('div', { class: 'lh-fight' }, [a, el('span', { class: 'vs', html: ui.icon('bolt') + (killed[c.t] ? '<span>' + (killed[c.a] ? 'both banished' : 'banished') + '</span>' : '') }), t]);
      }));
      var inCh = {}; tt.ch.forEach(function (c) { inCh[c.a] = inCh[c.t] = 1; });
      act('Banished', tt.bn.filter(function (b) { return !inCh[b]; }).map(function (b) { return tile(b, { gone: true }); }));
      if (acts.children.length) kids.push(acts);
      if (kids.length === 1) kids.push(el('div', { class: 'lh-quiet', text: tt.ink ? 'Put a card in the inkwell and passed' : 'Passed' }));
      else if (tt.ink) kids.push(el('div', { class: 'lh-quiet', text: 'Put a card in the inkwell' }));
      view.innerHTML = ''; view.appendChild(el('div', { class: 'lh-turn' }, kids));
    }
    var road = el('div', { class: 'lh-road' }), btns = [];
    tks.forEach(function (tt, i) {
      var g = gain(tt)[tt.p];
      var b = el('button', { type: 'button', class: 'lh-rb' + (g >= 3 ? ' big' : ''), style: { '--c': ui.color(tt.p) }, html: '<b>' + tt.t + '</b><i>' + (g > 0 ? '+' + g : '') + '</i>', title: name(tt.p) + ', turn ' + tt.t + (g > 0 ? ': +' + g + ' lore' : ''), 'aria-label': name(tt.p) + ', turn ' + tt.t + (g > 0 ? ', ' + g + ' lore' : ''), onclick: function () { pick(i); } });
      btns.push(b); road.appendChild(b);
    });
    function pick(i) { btns.forEach(function (b, j) { b.classList.toggle('on', i === j); }); show(i); }
    pick(best);
    var key = el('div', { class: 'lh-key', html: [0, 1].map(function (i) { return '<span><i style="background:' + ui.color(i) + '"></i>' + ui.esc(poss(name(i))) + ' turns</span>'; }).join('') + '<span><b class="lh-kl">+3</b>3 or more lore</span>' });
    var first = tks[0].t;
    return ui.section(first > 1 ? 'Turns ' + first + ' to ' + tks[tks.length - 1].t + ' · tap one' : 'Turn by turn · tap one', [road, key, view], { icon: 'rows' });
  }

  // ── each deck: its inks, the cards it played, the numbers ──
  function decks(e, d, ui, cards) {
    var el = ui.el, players = e.players || [];
    var played = [{}, {}], order = [[], []];
    (d.tk || []).map(parseTurn).forEach(function (tt) {
      tt.pl.forEach(function (c) { var x = cards[c]; if (!x) return; var o = x.o === 1 ? 1 : 0; if (!played[o][c]) { played[o][c] = 0; order[o].push(c); } played[o][c]++; });
    });
    var box = ui.el('div', { class: 'hv', style: { gap: '10px' } });
    (d.p || []).forEach(function (p, i) {
      var pl = players[i] || {}, won = e.winner && pl.name === e.winner;
      var head = el('div', { class: 'hv-lp-h' }, [ui.who(pl.name || 'Player ' + (i + 1), i), el('div', { class: 'grow' }),
        won ? el('span', { class: 'hv-chip on', style: { '--cc': '#e8c16a' }, text: 'Winner' }) : null]);
      var dk = el('div', { class: 'hv-lp-dk', html: (p.k || []).map(inkIco).join('') + '<span>' + ui.esc(p.d || 'Deck') + '</span>' + (kindName(p.kd) ? '<small style="color:var(--text-3);flex:none">· ' + kindName(p.kd) + '</small>' : '') });
      var kids = [head, dk];
      if (order[i] && order[i].length) {
        var grid = el('div', { class: 'lh-played' });
        order[i].slice(0, 24).forEach(function (c) { var x = cards[c]; grid.appendChild(cardTile({ n: x.n, i: x.i, t: x.t, count: played[i][c] }, ui, (p.k || [])[0])); });
        kids.push(el('div', { class: 'hv-lp-note', text: 'Cards played' })); kids.push(grid);
      } else if (!d.cs && p.b) {
        // older records: the board at the end, shown here
        var board = el('div', { class: 'hv-lp-board' });
        p.b.forEach(function (c, j) { board.appendChild(cardTile(c, ui, (p.k || [])[j % Math.max(1, (p.k || []).length)])); });
        kids.push(el('div', { class: 'hv-lp-note', text: p.b.length ? 'In play at the end' : 'Nothing in play at the end' }));
        if (p.b.length) kids.push(board);
      }
      kids.push(ui.stats([['Lore quested', p.ql], ['Quests', p.q], ['Cards played', p.pl], ['Inked', p.ink], ['Banished', p.ban], ['Lost', p.lost]]));
      var notes = [];
      if (p.big && p.big.l >= 2) notes.push('Biggest quest: ' + p.big.n + ' for ' + p.big.l + ' lore');
      if (p.so && p.so.length) notes.push('Sang ' + p.so.join(', '));
      if (p.sh && p.sh.length) notes.push('Shifted ' + p.sh.join(', '));
      if (p.loc >= 2) notes.push(p.loc + ' lore from locations');
      if (notes.length) kids.push(ui.log(notes));
      box.appendChild(el('div', { class: 'hv-lp' }, kids));
    });
    return ui.section('Decks', box, { icon: 'cards' });
  }

  // runs from the per-round lore (older records): lore after each round
  function roundRuns(e) {
    var sc = e.rounds && e.rounds.scores; if (!Array.isArray(sc) || !sc.length) return [];
    var run = [0, 0]; return sc.map(function (r) { r = r || []; run = [run[0] + (+r[0] || 0), run[1] + (+r[1] || 0)]; return run.slice(); });
  }

  HistView.register(['lorcana-play'], play);
  function play(e, ui) {
    var d = e.dt; if (!d || !d.p) return null;
    var cards = cardList(d), out = [], runs = loreRuns(d), goal = d.goal || 20;
    out.push(scoreboard(e, d, ui));
    var chart = runs.length >= 2 ? raceChart(runs, ui, goal, 'turn') : raceChart(roundRuns(e), ui, goal, 'round');
    if (chart) out.push(ui.section('The lore race', chart, { icon: 'chart' }));
    if (d.cs) out.push(ui.section('The table at the end', tableAtEnd(e, d, ui, cards), { icon: 'tiles' }));
    var tbt = turnByTurn(e, d, ui, cards, runs); if (tbt) out.push(tbt);
    out.push(decks(e, d, ui, cards));
    return ui.wrap(out);
  }

  // ── The lore counter (games/lorcana.html): each player's ink, the lore race, every turn's lore ──
  // dt (newer games): {g: goal, f: who went first, lg: 'turn:player:change ...' every lore tap}
  var CINK = { amber: '#f2a81d', amethyst: '#9b4fc9', emerald: '#2aa857', ruby: '#d8243f', sapphire: '#2390d8', steel: '#97a3b3' };
  HistView.register('lorcana', function (e, ui) {
    if (e.dt && e.dt.p) return play(e, ui);   // a game from the Lorcana table, saved under the same game
    var inks = e.inks, players = e.players || [], d = e.dt || {};
    if (!Array.isArray(inks) || !inks.length || !players.length) return null;
    var el = ui.el, n = players.length, goal = d.g || e.target || 20, out = [];
    var wi = -1; players.forEach(function (p, i) { if (e.winner && p.name === e.winner) wi = i; });
    // the lore gems, one per player, in their ink
    var gems = el('div', { class: 'lh-vs', style: { 'grid-template-columns': 'repeat(' + n + ',minmax(0,1fr))' } });
    players.forEach(function (p, i) {
      var k = String(inks[i] || ''), nm = cap(k), win = i === wi;
      gems.appendChild(el('div', { class: 'lh-side' + (wi >= 0 && !win ? ' lose' : '') }, [
        el('div', { class: 'lh-gem', html: gemSvg(win) + '<b>' + (p.score != null ? p.score : '') + '</b>' }),
        el('div', { class: 'lh-nm', style: { '--c': CINK[k] || ui.color(i) } }, [el('i', { class: 'dot' }), el('span', { text: p.name })]),
        el('div', { class: 'lh-inks', html: inkIco(nm) }),
        win ? el('span', { class: 'lh-won', text: 'Winner' }) : null
      ]));
    });
    var w = players[wi], foot = w ? w.name + ' reached ' + w.score + ' lore' + (e.turns ? ' on turn ' + e.turns : '') : '';
    var sub = [d.f != null && players[d.f] ? players[d.f].name + ' went first' : '', goal !== 20 ? 'Long game, to ' + goal : ''].filter(Boolean).join(' · ');
    out.push(el('div', { class: 'lh-hd' }, [gems, foot ? el('div', { class: 'lh-foot' }, [document.createTextNode(foot), sub ? el('small', { text: sub }) : null]) : null]));
    // every lore tap: 'turn:player:change'
    var taps = String(d.lg || '').split(' ').filter(Boolean).map(function (s) { var a = s.split(':'); return { t: +a[0] || 0, p: +a[1] || 0, d: +a[2] || 0 }; });
    var turns = 0; taps.forEach(function (x) { turns = Math.max(turns, x.t); }); turns = Math.max(turns, +e.turns || 0);
    var colors = players.map(function (p, i) { return CINK[String(inks[i] || '')] || ui.color(i); });
    var cum = [], run = players.map(function () { return 0; }), byTurn = {};
    taps.forEach(function (x) { (byTurn[x.t] = byTurn[x.t] || []).push(x); });
    for (var t = 1; t <= turns; t++) { (byTurn[t] || []).forEach(function (x) { if (run[x.p] != null) run[x.p] = Math.max(0, run[x.p] + x.d); }); cum.push(run.slice()); }
    var unit = 'turn';
    if (!taps.length) { cum = []; unit = 'round'; var r0 = players.map(function () { return 0; }); ((e.rounds && e.rounds.scores) || []).forEach(function (r) { r = r || []; r0 = r0.map(function (v, i) { return v + (+r[i] || 0); }); cum.push(r0.slice()); }); }
    if (cum.length >= 2) {
      var pts = [players.map(function () { return 0; })].concat(cum), N = pts.length - 1, W = 320, H = 150, L = 22, Rr = 26, T = 10, B = 20;
      var top = Math.max(goal, Math.max.apply(null, [].concat.apply([], pts)));
      var x = function (i) { return L + i * (W - L - Rr) / N; }, y = function (v) { return T + (top - v) * (H - T - B) / top; };
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Lore after each ' + unit + '">';
      for (var g = top > 25 ? 10 : 5; g < top; g += top > 25 ? 10 : 5) s += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="rgba(255,255,255,.07)"/><text x="' + (L - 5) + '" y="' + (y(g) + 3) + '" text-anchor="end" font-size="8.5" font-weight="800" fill="rgba(255,255,255,.35)" font-family="system-ui">' + g + '</text>';
      s += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + y(goal) + '" y2="' + y(goal) + '" stroke="#e8c16a" stroke-width="1.5" stroke-dasharray="5 4"/><text x="' + (L - 5) + '" y="' + (y(goal) + 3) + '" text-anchor="end" font-size="9" font-weight="900" fill="#e8c16a" font-family="system-ui">' + goal + '</text>';
      s += '<text x="' + L + '" y="' + (H - 5) + '" font-size="9" font-weight="800" fill="rgba(255,255,255,.45)" font-family="system-ui">Start</text><text x="' + (W - Rr) + '" y="' + (H - 5) + '" text-anchor="end" font-size="9" font-weight="800" fill="rgba(255,255,255,.45)" font-family="system-ui">' + cap(unit) + ' ' + N + '</text>';
      players.forEach(function (p, pi) {
        s += '<polyline points="' + pts.map(function (r, i) { return x(i).toFixed(1) + ',' + y(r[pi]).toFixed(1); }).join(' ') + '" fill="none" stroke="' + colors[pi] + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>';
        s += '<circle cx="' + x(N) + '" cy="' + y(pts[N][pi]) + '" r="4.2" fill="' + colors[pi] + '" stroke="#11162f" stroke-width="1.5"/>';
      });
      out.push(ui.section('The lore race', el('div', { class: 'lh-chart', html: s + '</svg>' }), { icon: 'chart' }));
    }
    // turn by turn: who quested for what
    if (taps.length) {
      var list = [];
      for (var t2 = 1; t2 <= turns; t2++) { var who = d.f != null ? (d.f + t2 - 1) % n : null; list.push({ t: t2, p: who, taps: byTurn[t2] || [], tot: cum[t2 - 1] }); }
      var best = 0, bestG = -1; list.forEach(function (x2, i) { var g2 = x2.taps.reduce(function (a, b) { return a + Math.max(0, b.d); }, 0); if (g2 > bestG) { bestG = g2; best = i; } });
      var view = el('div'), road = el('div', { class: 'lh-road' }), btns = [];
      var show = function (i) {
        var x2 = list[i], kids = [], gained = {};
        x2.taps.forEach(function (tp) { gained[tp.p] = (gained[tp.p] || 0) + tp.d; });
        kids.push(el('div', { class: 'lh-th' }, [el('span', { class: 'grow', html: x2.p != null && players[x2.p] ? '<span style="color:' + colors[x2.p] + '">' + ui.esc(players[x2.p].name) + '</span> · turn ' + x2.t : 'Turn ' + x2.t }),
          x2.tot ? el('span', { class: 'tot', text: x2.tot.join('–') }) : null]));
        var rows = Object.keys(gained).map(Number);
        if (!rows.length) kids.push(el('div', { class: 'lh-quiet', text: 'No lore this turn' }));
        rows.forEach(function (pi) {
          var chips = x2.taps.filter(function (tp) { return tp.p === pi; }).map(function (tp) { return { t: (tp.d > 0 ? '+' : '−') + Math.abs(tp.d), c: tp.d > 0 ? colors[pi] : '#9aa3b8' }; });
          kids.push(el('div', { class: 'lh-tap' }, [el('b', { style: { color: colors[pi] }, text: (players[pi] || {}).name }), ui.chips(chips), x2.taps.filter(function (tp) { return tp.p === pi; }).length > 1 ? el('span', { class: 'sum', text: '= ' + (gained[pi] > 0 ? '+' : '−') + Math.abs(gained[pi]) }) : null]));
        });
        view.innerHTML = ''; view.appendChild(el('div', { class: 'lh-turn' }, kids));
      };
      list.forEach(function (x2, i) {
        var g2 = x2.taps.reduce(function (a, b) { return a + Math.max(0, b.d); }, 0);
        var b = el('button', { type: 'button', class: 'lh-rb' + (g2 >= 3 ? ' big' : ''), style: { '--c': x2.p != null ? colors[x2.p] : '#4a5070' }, html: '<b>' + x2.t + '</b><i>' + (g2 > 0 ? '+' + g2 : '') + '</i>', 'aria-label': 'Turn ' + x2.t + (g2 > 0 ? ', ' + g2 + ' lore' : ''), onclick: function () { pick(i); } });
        btns.push(b); road.appendChild(b);
      });
      var pick = function (i) { btns.forEach(function (b, j) { b.classList.toggle('on', i === j); }); show(i); };
      pick(best);
      out.push(ui.section('Turn by turn · tap one', [road, view], { icon: 'rows' }));
    }
    return ui.wrap(out);
  });
})();
