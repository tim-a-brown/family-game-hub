'use strict';
// History views: dice (and game-show) games
// yahtzee · farkle · lrc · plinko · wheeloffortune · dealornodeal · shellgame
(function () {
  if (!window.HistView) return;
  var R = HistView.register;
  var uid = 0;
  function esc(s) { return HistView.ui.esc(s); }
  function names(e) { return (e.players || []).map(function (p) { return p.name; }); }
  function arr(v) { return Array.isArray(v) ? v : v && typeof v === 'object' ? Object.keys(v).map(function (k) { return v[k]; }) : []; }
  function fmtK(v) {
    v = Number(v) || 0;
    if (v < 1) return '1¢';
    if (v < 1000) return '$' + Math.round(v);
    if (v < 10000) return '$' + (Math.round(v / 100) / 10).toString().replace(/\.0$/, '') + 'K';
    if (v < 999500) return '$' + Math.round(v / 1000) + 'K';
    return '$' + (Math.round(v / 10000) / 100).toString().replace(/\.?0+$/, '') + 'M';
  }
  function cash(v) { v = Number(v) || 0; return v > 0 && v < 1 ? '$0.01' : '$' + Math.round(v).toLocaleString('en-US'); }
  function fmtN(n) { return (Number(n) || 0).toLocaleString('en-US'); }

  // A small die drawn in SVG (for tables where real dice would be too big)
  var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function svgDie(v, x, y, s) {
    var o = '<rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" rx="' + s * 0.2 + '" fill="#fbf7ee" stroke="rgba(0,0,0,.25)" stroke-width="1"/>';
    (PIPS[v] || []).forEach(function (k) {
      var cx = x + s * (0.25 + 0.25 * (k % 3)), cy = y + s * (0.25 + 0.25 * Math.floor(k / 3));
      o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + s * (v === 1 ? 0.12 : 0.085) + '" fill="' + (v === 1 ? '#c8102e' : '#1a1830') + '"/>';
    });
    return o;
  }
  function diceStrip(str, s) {
    var vals = String(str || '').split('').map(Number).filter(function (v) { return v >= 1 && v <= 6; });
    if (!vals.length) return '';
    s = s || 15; var g = 2, w = vals.length * s + (vals.length - 1) * g;
    return '<svg class="dv-dstrip" viewBox="0 0 ' + w + ' ' + s + '" width="' + w + '" height="' + s + '" aria-label="Dice ' + vals.join(' ') + '">' +
      vals.map(function (v, i) { return svgDie(v, i * (s + g), 0, s); }).join('') + '</svg>';
  }

  function legend(ui, series) {
    return ui.el('div', { class: 'dv-legend' }, series.map(function (s) {
      return ui.el('span', null, [ui.el('i', { style: { background: s.color, opacity: s.dash ? 0.6 : 1 } }), ui.el('span', { text: s.name })]);
    }));
  }

  HistView.css('hv-dice', [
    '.dv-legend{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.78rem;font-weight:800;color:var(--text-2);}',
    '.dv-legend>span{display:inline-flex;align-items:center;gap:5px;}.dv-legend i{width:10px;height:10px;border-radius:50%;}',
    '.dv-note{font-size:.86rem;font-weight:700;color:var(--text-2);margin:0;line-height:1.35;}',
    '.dv-note b{color:var(--text);}',
    '.dv-good{color:#4ade80 !important;}.dv-bad{color:#f87171 !important;}',
    '.dv-sub{font-size:.8rem;font-weight:900;color:var(--text);margin:2px 0 -2px;display:flex;align-items:center;gap:6px;}',
    '.dv-dstrip{display:inline-block;vertical-align:middle;}',
    /* Yahtzee scorecard: paper and ink */
    '.dv-card{background:#f7f2e4;color:#1d1a2e;border-radius:12px;padding:6px 8px 8px;box-shadow:0 6px 16px -6px rgba(0,0,0,.6);overflow-x:auto;}',
    '.dv-card table{width:100%;border-collapse:collapse;font-size:.84rem;font-variant-numeric:tabular-nums;}',
    '.dv-card th,.dv-card td{padding:4px 6px;border-bottom:1px solid rgba(60,50,120,.14);text-align:center;white-space:nowrap;}',
    '.dv-card th{font-weight:900;color:#3b3560;}',
    '.dv-card td:first-child,.dv-card th:first-child{text-align:left;font-weight:800;color:#3b3560;}',
    '.dv-card tr.hd th{font-family:var(--display);font-weight:400;font-size:.95rem;color:#c8102e;letter-spacing:.02em;border-bottom:2px solid #c8102e;}',
    '.dv-card tr.sum td{font-weight:900;color:#1d1a2e;background:rgba(60,50,120,.06);}',
    '.dv-card tr.big td{font-weight:900;font-size:1rem;border-top:2px solid #1d1a2e;border-bottom:0;}',
    '.dv-card td.z{color:#c8102e;text-decoration:line-through;opacity:.7;}',
    '.dv-card td.w{color:#0f7a3d;font-weight:900;}',
    '.dv-card td.dd{padding:2px 4px;}',
    '.dv-card .cap{font-size:.7rem;font-weight:800;color:#6d6790;}',
    /* Wheel of Fortune */
    '.wv-pz{display:flex;flex-direction:column;gap:7px;padding:10px;border-radius:14px;background:rgba(255,255,255,.04);}',
    '.wv-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-weight:900;font-size:.82rem;letter-spacing:.06em;text-transform:uppercase;color:var(--text-3);}',
    '.wv-top b{color:var(--yellow);letter-spacing:0;font-size:.9rem;}',
    '.wv-seq{display:flex;flex-wrap:wrap;gap:4px;}',
    '.wv-l{display:inline-flex;align-items:baseline;gap:3px;min-width:22px;justify-content:center;padding:3px 7px;border-radius:7px;font-weight:900;font-size:.86rem;',
    '  background:color-mix(in srgb,var(--pc) 22%,#1a1630);box-shadow:inset 0 0 0 1.5px var(--pc);color:#fff;}',
    '.wv-l small{font-size:.66rem;font-weight:800;opacity:.85;}',
    '.wv-l.miss{background:transparent;color:var(--text-3);text-decoration:line-through;box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--pc) 55%,transparent);}',
    '.wv-x{display:inline-flex;align-items:baseline;gap:4px;padding:3px 7px;border-radius:7px;font-weight:900;font-size:.7rem;letter-spacing:.04em;border-left:4px solid var(--pc);}',
    '.wv-x.bk{background:#0b0b0f;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);}',
    '.wv-x.lt{background:#f4f4f4;color:#222;}',
    '.wv-x.ws{background:rgba(248,113,113,.15);color:#fca5a5;}',
    '.wv-x small{font-size:.68rem;opacity:.85;}',
    '.wv-keys{display:flex;flex-wrap:wrap;gap:4px;align-items:center;font-size:.76rem;font-weight:800;color:var(--text-3);}',
    '.wv-k{display:inline-grid;place-items:center;width:24px;height:26px;border-radius:5px;font-weight:900;font-size:.85rem;background:#fff;color:#111;}',
    '.wv-k.pk{background:#ffc83d;color:#2a1c00;}.wv-k.no{background:transparent;color:var(--text-3);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.2);text-decoration:line-through;}',
    /* Deal or No Deal */
    '.dd-verdict{display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:linear-gradient(180deg,#121a3c,#0a0f26);box-shadow:inset 0 0 0 1px rgba(255,210,120,.25);}',
    '.dd-verdict svg{flex:none;width:64px;height:auto;}',
    '.dd-verdict p{margin:0;font-size:.9rem;font-weight:700;color:#c9c1e6;line-height:1.35;}',
    '.dd-verdict p b{color:#fff;}.dd-verdict .big{font-family:var(--display);font-size:1.5rem;color:#ffdf8a;line-height:1.1;}',
    '.dd-rounds{display:flex;flex-direction:column;gap:6px;}',
    '.dd-r{display:grid;grid-template-columns:62px 1fr;gap:4px 8px;align-items:start;padding:7px 8px;border-radius:10px;background:rgba(255,255,255,.04);}',
    '.dd-r.ghost{opacity:.6;background:transparent;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);}',
    '.dd-r.deal{box-shadow:inset 0 0 0 2px #4ade80;}',
    '.dd-r>b{white-space:nowrap;font-size:.72rem;font-weight:900;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;padding-top:3px;}',
    '.dd-cs{display:flex;flex-wrap:wrap;gap:3px;}',
    '.dd-c{display:inline-flex;align-items:center;gap:4px;padding:2px 6px 2px 2px;border-radius:6px;font-size:.74rem;font-weight:900;}',
    '.dd-c i{font-style:normal;display:inline-grid;place-items:center;min-width:18px;height:16px;border-radius:4px;background:#e9ecf1;color:#222;font-size:.66rem;}',
    '.dd-c.lo{background:rgba(47,120,230,.25);color:#bcd7ff;}.dd-c.hi{background:rgba(255,190,40,.22);color:#ffe199;}',
    '.dd-c.top{background:#ffc93a;color:#3b2500;}',
    '.dd-off{grid-column:2;font-size:.8rem;font-weight:700;color:var(--text-2);display:flex;flex-wrap:wrap;gap:4px 8px;align-items:baseline;}',
    '.dd-off b{color:#ffdf8a;}',
    '.dd-tag{font-size:.66rem;font-weight:900;letter-spacing:.06em;padding:2px 6px;border-radius:5px;background:rgba(255,255,255,.1);color:var(--text-2);}',
    '.dd-tag.deal{background:#22a55a;color:#fff;}.dd-tag.nd{background:#c2304b;color:#fff;}',
    /* Shell game */
    '.sg-run{display:flex;flex-wrap:wrap;gap:3px;}',
    '.sg-p{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;font-size:.62rem;font-weight:900;color:#fff;}',
    '.sg-p.ok{background:#22a55a;}.sg-p.no{background:#c2304b;}',
    '.sg-p.t4{box-shadow:0 0 0 2px #ffc83d;}.sg-p.t5{box-shadow:0 0 0 2px #f472b6;}'
  ].join('\n'));

  // ════════════════════════════════════════════════════════════════════════
  // Yahtzee: the full scorecard
  // ════════════════════════════════════════════════════════════════════════
  var YCATS = [['Ones', 1], ['Twos', 1], ['Threes', 1], ['Fours', 1], ['Fives', 1], ['Sixes', 1],
    ['3 of a Kind'], ['4 of a Kind'], ['Full House'], ['Sm. Straight'], ['Lg. Straight'], ['Yahtzee'], ['Chance']];
  R('yahtzee', function (e, ui) {
    var d = e.dt; if (!d || !d.p) return null;
    var ps = arr(d.p), nm = names(e);
    if (!ps.length) return null;
    var solo = ps.length === 1, showDice = solo && ps[0].d;
    var cards = ps.map(function (p) {
      var c = arr(p.c), dice = String(p.d || '').split(' ');
      var up = 0, lo = 0; c.forEach(function (v, i) { if (i < 6) up += v || 0; else lo += v || 0; });
      var bonus = up >= 63 ? 35 : 0, yb = (p.yb || 0) * 100;
      return { c: c, dice: dice, up: up, bonus: bonus, lo: lo, yb: yb, total: up + bonus + lo + yb };
    });
    var best = Math.max.apply(null, cards.map(function (c) { return c.total; }));
    var t = '<table><tr class="hd"><th>' + (solo ? 'Box' : '') + '</th>' + (showDice ? '<th class="cap">Dice</th>' : '') +
      cards.map(function (c, i) { return '<th>' + esc(solo ? 'Score' : nm[i] || 'P' + (i + 1)) + '</th>'; }).join('') + '</tr>';
    function row(label, fn, cls, diceFn) {
      t += '<tr class="' + (cls || '') + '"><td>' + label + '</td>' + (showDice ? '<td class="dd">' + (diceFn ? diceFn() : '') + '</td>' : '') + cards.map(fn).join('') + '</tr>';
    }
    function cell(v, extra) { return v == null ? '<td>–</td>' : v === 0 ? '<td class="z">0</td>' : '<td' + (extra ? ' class="' + extra + '"' : '') + '>' + v + '</td>'; }
    YCATS.forEach(function (cat, k) {
      if (k === 6) {
        row('Upper total', function (c) { return '<td>' + c.up + '</td>'; }, 'sum');
        row('Bonus <span class="cap">(63+)</span>', function (c) { return c.bonus ? '<td class="w">+35</td>' : '<td class="cap">' + (63 - c.up) + ' short</td>'; }, 'sum');
      }
      row(cat[0], function (c) { var v = c.c[k]; return cell(v, k === 11 && v === 50 ? 'w' : ''); }, '', function () { var x = cards[0].dice[k]; return x && x !== '-' ? diceStrip(x, 13) : ''; });
    });
    row('Lower total', function (c) { return '<td>' + c.lo + '</td>'; }, 'sum');
    if (cards.some(function (c) { return c.yb; })) row('Yahtzee bonus', function (c) { return c.yb ? '<td class="w">+' + c.yb + '</td>' : '<td>–</td>'; }, 'sum');
    row('Grand total', function (c) { return '<td' + (c.total === best && !solo ? ' class="w"' : '') + '>' + c.total + '</td>'; }, 'big');
    t += '</table>';
    var out = [ui.section(solo ? 'Scorecard' : 'Scorecards', ui.el('div', { class: 'dv-card', html: t }), { icon: 'pencil' })];

    // Big rolls: the dice behind the best boxes (multi-player; solo shows them in the card)
    if (!solo) {
      var BIG = [11, 10, 9, 8, 7], rows = [];
      ps.forEach(function (p, i) {
        var dice = String(p.d || '').split(' '), c = arr(p.c);
        BIG.forEach(function (k) { if (c[k] > 0 && dice[k] && dice[k] !== '-') rows.push({ i: i, k: k, d: dice[k], v: c[k] }); });
      });
      if (rows.length) {
        var box = ui.el('div', { class: 'stack', style: { display: 'flex', 'flex-direction': 'column', gap: '6px' } });
        rows.slice(0, 10).forEach(function (r) {
          box.appendChild(ui.el('div', { style: { display: 'flex', 'align-items': 'center', gap: '10px', 'font-size': '.86rem', 'font-weight': '800' } }, [
            ui.el('span', { html: diceStrip(r.d, 20) }),
            ui.el('span', { style: { color: ui.color(r.i) }, text: nm[r.i] || '' }),
            ui.el('span', { style: { color: 'var(--text-2)' }, text: YCATS[r.k][0] + ' · ' + r.v })
          ]));
        });
        out.push(ui.section('Big rolls', box, { icon: 'dice' }));
      }
    }
    var yz = ps.map(function (p, i) { var c = arr(p.c); return { i: i, n: (c[11] === 50 ? 1 : 0) + (p.yb || 0) }; }).filter(function (x) { return x.n; });
    if (yz.length) out.push(ui.stats(yz.map(function (x) { return [solo ? 'Yahtzees' : (nm[x.i] || '') + "'s Yahtzees", x.n]; })));
    return ui.wrap(out);
  });

  // ════════════════════════════════════════════════════════════════════════
  // Farkle: race to the target, best rolls, farkles and hot dice
  // ════════════════════════════════════════════════════════════════════════
  R('farkle', function (e, ui) {
    var d = e.dt, nm = names(e), out = [];
    if (!d || !d.p) return ui.wrap(out);
    var ps = arr(d.p);
    // biggest turn: the dice set aside, one group per roll
    var bi = -1; ps.forEach(function (p, i) { if (p.b && (bi < 0 || p.b > ps[bi].b)) bi = i; });
    if (bi >= 0 && ps[bi].bs) {
      var sets = String(ps[bi].bs).split(' ').filter(Boolean).map(function (x) { var q = x.split(':'); return { d: q[0], p: +q[1] }; });
      var row = ui.el('div', { style: { display: 'flex', 'flex-wrap': 'wrap', gap: '10px 14px', 'align-items': 'flex-end' } });
      sets.forEach(function (st, k) {
        row.appendChild(ui.el('div', { style: { display: 'flex', 'flex-direction': 'column', gap: '3px', 'align-items': 'flex-start' } }, [
          ui.el('span', { html: diceStrip(st.d, 30) }),
          ui.el('small', { style: { 'font-weight': '900', color: 'var(--text-2)', 'font-size': '.74rem' }, text: (k ? '+' : '') + fmtN(st.p) })
        ]));
      });
      out.push(ui.section('Biggest turn: ' + (nm[bi] || '') + ' banked ' + fmtN(ps[bi].b), [
        ui.el('div', { class: 'hv-snap f-felt', style: { 'max-width': '100%', 'line-height': 'normal', padding: '12px', background: 'radial-gradient(120% 120% at 50% 0%,#26508e,#0f274b)' } }, [row]),
        ps[bi].bh ? ui.el('p', { class: 'dv-note', html: 'Hot dice ' + (ps[bi].bh === 1 ? 'once' : ps[bi].bh + ' times') + ' in that turn: all six scored and got rolled again.' }) : null
      ], { icon: 'flame' }));
    }
    // best single roll per player
    var br = ps.map(function (p, i) { var q = String(p.br || '').split(':'); return { i: i, d: q[0], p: +q[1] || 0 }; }).filter(function (x) { return x.d && x.p; });
    if (br.length) {
      var box = ui.el('div', { style: { display: 'flex', 'flex-direction': 'column', gap: '6px' } });
      br.forEach(function (x) {
        box.appendChild(ui.el('div', { style: { display: 'flex', 'align-items': 'center', gap: '10px', 'font-size': '.86rem', 'font-weight': '800' } }, [
          ui.el('span', { style: { color: ui.color(x.i), 'min-width': '64px' }, text: nm[x.i] || '' }),
          ui.el('span', { html: diceStrip(x.d, 20) }),
          ui.el('span', { style: { color: 'var(--text-2)' }, text: fmtN(x.p) })
        ]));
      });
      out.push(ui.section(br.length > 1 ? 'Best single roll' : 'Best roll', box, { icon: 'dice' }));
    }
    var head = [''].concat(nm), rows = [
      ['Farkles'].concat(ps.map(function (p) { return p.f; })),
      ['Hot dice'].concat(ps.map(function (p) { return p.h ? { t: p.h, c: 'hi' } : 0; })),
      ['Turns banked'].concat(ps.map(function (p) { return p.k; })),
      ['Best turn'].concat(ps.map(function (p) { return p.b ? fmtN(p.b) : '–'; })),
      ['Biggest farkle'].concat(ps.map(function (p) { return p.lm ? { t: '−' + fmtN(p.lm), c: 'bad' } : '–'; }))
    ];
    out.push(ui.section(ps.length > 1 ? 'Player stats' : 'Stats', ui.table(head, rows), { icon: 'pulse' }));
    return ui.wrap(out);
  });

  // ════════════════════════════════════════════════════════════════════════
  // Left Right Center: chips over time, who held out, the last roll
  // ════════════════════════════════════════════════════════════════════════
  function lrcDie(f, x, y, s) {
    var o = '<rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" rx="' + s * 0.2 + '" fill="#fbf7ee" stroke="rgba(0,0,0,.25)"/>';
    if (f === '.') o += '<circle cx="' + (x + s / 2) + '" cy="' + (y + s / 2) + '" r="' + s * 0.12 + '" fill="#1a1830"/>';
    else o += '<text x="' + (x + s / 2) + '" y="' + (y + s / 2 + 1) + '" text-anchor="middle" dominant-baseline="central" font-size="' + s * 0.58 + '" font-weight="900" fill="' + (f === 'C' ? '#c8102e' : '#1a1830') + '" font-family="system-ui">' + f + '</text>';
    return o;
  }
  R('lrc', function (e, ui) {
    var d = e.dt, nm = names(e), out = [];
    var labs = e.rounds && e.rounds.labels ? arr(e.rounds.labels) : [], sc = e.rounds && e.rounds.scores ? arr(e.rounds.scores) : [];
    var keep = []; labs.forEach(function (l, i) { if (l !== 'Pot') keep.push(i); });
    if (keep.length > 1 && nm.length) {
      var run = nm.map(function () { return 0; }), cum = nm.map(function () { return []; }), pot = [];
      keep.forEach(function (ri) { var row = arr(sc[ri]); nm.forEach(function (n, i) { run[i] += Number(row[i]) || 0; cum[i].push(run[i]); }); pot.push(nm.length * 3 - run.reduce(function (a, b) { return a + b; }, 0)); });
      // who held out: rounds each player still had chips at the end of the round
      var bars = nm.map(function (n, i) {
        var held = cum[i].slice(1).filter(function (v) { return v > 0; }).length, last = 0;
        cum[i].forEach(function (v, k) { if (v > 0) last = k; });
        return { label: n, value: held, max: keep.length - 1, color: ui.color(i), text: held + ' of ' + (keep.length - 1) };
      });
      out.push(ui.section('Rounds with chips', ui.bars(bars), { icon: 'coins' }));
    }
    if (!d) return ui.wrap(out);
    var ps = arr(d.p);
    if (d.lf && d.lw >= 0) {
      var f = String(d.lf).split(''), s = 34, g = 8, w = f.length * s + (f.length - 1) * g;
      var svg = '<svg viewBox="-4 -4 ' + (w + 8) + ' ' + (s + 8) + '" style="max-width:' + (w + 8) * 1.4 + 'px">' + f.map(function (x, i) { return lrcDie(x, i * (s + g), 0, s); }).join('') + '</svg>';
      var winner = e.winner, who = nm[d.lw] || '';
      var words = f.map(function (x) { return x === 'L' ? 'left' : x === 'R' ? 'right' : x === 'C' ? 'center' : 'dot'; });
      out.push(ui.section('The last roll', [
        ui.el('div', { class: 'hv-snap', style: { 'max-width': '100%', padding: '14px', display: 'flex', 'justify-content': 'center', background: 'radial-gradient(120% 120% at 50% 0%,#17727a,#09393e)' }, html: svg }),
        ui.el('p', { class: 'dv-note', html: '<b>' + esc(who) + '</b> rolled ' + words.join(', ') + (who !== winner ? ' and passed away the last chip' + (f.filter(function (x) { return x !== '.'; }).length > 1 ? 's' : '') + '. <b>' + esc(winner || '') + '</b> was the only one left holding chips.' : ' and was the only one left holding chips.') })
      ], { icon: 'dice' }));
    }
    if (ps.length) {
      var tall = -1; ps.forEach(function (p, i) { if (tall < 0 || p.pk > ps[tall].pk) tall = i; });
      var broke = ps.reduce(function (a, p) { return a + (p.z || 0); }, 0), c3 = ps.reduce(function (a, p) { return a + (p.c3 || 0); }, 0), d3 = ps.reduce(function (a, p) { return a + (p.d3 || 0); }, 0);
      out.push(ui.stats([
        ['Tallest stack', ps[tall].pk, (nm[tall] || '') + (ps[tall].pr ? ', round ' + ps[tall].pr : '')],
        ['Biggest pot', d.mp],
        ['Times broke', broke],
        ['C-C-C rolls', c3 || null],
        ['Three dots', d3 || null]
      ]));
    }
    return ui.wrap(out);
  });

  // ════════════════════════════════════════════════════════════════════════
  // Plinko: the board with every chip, where it was dropped and where it landed
  // ════════════════════════════════════════════════════════════════════════
  var PV = [100, 500, 1000, 0, 10000, 0, 1000, 500, 100];
  function pSlot(v) { return v === 10000 ? ['#ffe27a', '#e6a412', '#3a2300'] : v === 0 ? ['#c22a3c', '#7a0f1e', '#fff'] : v === 1000 ? ['#2f7be0', '#1a4a9a', '#fff'] : v === 500 ? ['#2bb3a3', '#137468', '#fff'] : ['#8a5ae0', '#53309c', '#fff']; }
  R('plinko', function (e, ui) {
    var d = e.dt; if (!d || !d.p) return null;
    var ps = arr(d.p), nm = names(e), out = [];
    var drops = [];
    ps.forEach(function (p, i) { String(p.d || '').split(' ').filter(Boolean).forEach(function (t, k) { var q = t.split(':'); drops.push({ i: i, k: k, x: (+q[0]) / 10, s: +q[1] }); }); });
    if (drops.length) {
      var W = 340, pad = 8, sw = (W - 2 * pad) / 9, top = 26, rowsY = 12, gapY = 15, H = top + rowsY * gapY + 70;
      var slotTop = top + rowsY * gapY + 4, plateY = H - 26, id = 'pk' + (++uid);
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Plinko board with every chip">';
      s += '<defs><linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232a6b"/><stop offset="1" stop-color="#11143a"/></linearGradient></defs>';
      s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="10" fill="url(#' + id + 'b)"/>';
      for (var r = 0; r < rowsY; r++) {
        var y = top + 10 + r * gapY;
        for (var c = 0; c <= 9; c++) {
          var x = pad + (r % 2 ? c * sw : (c + 0.5) * sw);
          if (r % 2 === 0 && c === 9) continue;
          s += '<circle cx="' + x.toFixed(1) + '" cy="' + y + '" r="2" fill="#d6dcff" opacity=".75"/>';
        }
      }
      for (var k = 0; k < 9; k++) {
        var col = pSlot(PV[k]), sx = pad + k * sw;
        if (k) s += '<rect x="' + (sx - 1) + '" y="' + slotTop + '" width="2" height="' + (plateY - slotTop) + '" fill="#c7cde8"/>';
        s += '<rect x="' + (sx + 1.5) + '" y="' + plateY + '" width="' + (sw - 3) + '" height="20" rx="4" fill="' + col[1] + '"/>';
        s += '<rect x="' + (sx + 1.5) + '" y="' + plateY + '" width="' + (sw - 3) + '" height="10" rx="4" fill="' + col[0] + '" opacity=".55"/>';
        s += '<text x="' + (sx + sw / 2) + '" y="' + (plateY + 10.5) + '" text-anchor="middle" dominant-baseline="central" font-size="' + (PV[k] === 10000 ? 9.5 : 10) + '" font-weight="900" fill="' + col[2] + '" font-family="system-ui">' + (PV[k] === 10000 ? '$10K' : '$' + PV[k]) + '</text>';
      }
      // paths and chips: drop marker on the rail, chip stacked in its slot
      var stack = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      drops.forEach(function (q) {
        var x0 = pad + q.x * sw, x1 = pad + (q.s + 0.5) * sw, n = stack[q.s]++, y1 = plateY - 9 - n * 13;
        var colr = ui.color(q.i);
        s += '<path d="M' + x0.toFixed(1) + ' 14 C ' + x0.toFixed(1) + ' ' + (top + 70) + ', ' + x1.toFixed(1) + ' ' + (slotTop - 60) + ', ' + x1.toFixed(1) + ' ' + y1 + '" fill="none" stroke="' + colr + '" stroke-width="1.6" stroke-dasharray="3 3" opacity=".55"/>';
        s += '<circle cx="' + x0.toFixed(1) + '" cy="14" r="5" fill="none" stroke="' + colr + '" stroke-width="2"/>';
        s += '<circle cx="' + x1.toFixed(1) + '" cy="' + y1 + '" r="6.5" fill="' + colr + '" stroke="rgba(255,255,255,.85)" stroke-width="1.5"/>';
      });
      s += '</svg>';
      out.push(ui.section('Where the chips went', [ui.picture(s, { max: 380 }), ps.length > 1 ? legend(ui, nm.map(function (n, i) { return { name: n, color: ui.color(i) }; })) : null,
        ui.el('p', { class: 'dv-note', text: 'Rings at the top: where each chip was let go. Dots: the slot it landed in.' })], { icon: 'coins' }));
      var aimMid = drops.filter(function (q) { return q.x >= 4 && q.x <= 5; }).length, hit = drops.filter(function (q) { return q.s === 4; }).length, zero = drops.filter(function (q) { return PV[q.s] === 0; }).length;
      out.push(ui.stats([['Chips dropped', drops.length], ['Aimed at $10K', aimMid], ['Landed on $10K', hit], ['Landed on $0', zero]]));
    }
    // price game that earned the chips
    var q = []; ps.forEach(function (p, i) { arr(p.q).forEach(function (x) { q.push({ i: i, x: x }); }); });
    if (q.length) {
      var multi = ps.length > 1;
      var rows = q.map(function (r) {
        var res = { t: r.x.ok ? 'Right' : 'Wrong', c: r.x.ok ? 'good' : 'bad' };
        return multi ? [nm[r.i] || '', r.x.n, '$' + r.x.s + ' → $' + r.x.r, res] : [r.x.n, '$' + r.x.s, '$' + r.x.r, res];
      });
      out.push(ui.section('Earning the chips', ui.table(multi ? ['', 'Prize', 'Shown → real', ''] : ['Prize', 'Shown', 'Real', ''], rows), { icon: 'eye' }));
    }
    return ui.wrap(out);
  });

  // ════════════════════════════════════════════════════════════════════════
  // Shell game: every pick of every run, and the cup that fooled you
  // ════════════════════════════════════════════════════════════════════════
  function cupsSvg(n, ball, picked) {
    var W = 320, H = 120, cw = Math.min(64, (W - 20) / n - 10), gap = (W - n * cw) / (n + 1), id = 'sg' + (++uid);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Where the ball was">';
    s += '<defs><linearGradient id="' + id + '" x1="0" x2="1"><stop offset="0" stop-color="#3a2008"/><stop offset=".3" stop-color="#c58d3a"/><stop offset=".42" stop-color="#f6d996"/><stop offset=".58" stop-color="#b47a30"/><stop offset="1" stop-color="#2e1906"/></linearGradient></defs>';
    for (var i = 0; i < n; i++) {
      var x = gap + i * (cw + gap), up = i === ball || i === picked, lift = up ? 26 : 0, base = 98;
      if (i === ball) s += '<circle cx="' + (x + cw / 2) + '" cy="' + (base - 11) + '" r="11" fill="#e0263b"/><circle cx="' + (x + cw / 2 - 4) + '" cy="' + (base - 15) + '" r="3.5" fill="rgba(255,255,255,.55)"/>';
      s += '<ellipse cx="' + (x + cw / 2) + '" cy="' + (base + 4) + '" rx="' + cw / 2 + '" ry="5" fill="rgba(0,0,0,.25)"/>';
      s += '<path d="M' + (x + cw * 0.14) + ' ' + (base - 56 - lift) + ' L' + (x + cw * 0.86) + ' ' + (base - 56 - lift) + ' L' + (x + cw) + ' ' + (base - lift) + ' L' + x + ' ' + (base - lift) + ' Z" fill="url(#' + id + ')"' + (i === picked && i !== ball ? ' stroke="#f87171" stroke-width="3"' : '') + '/>';
      s += '<rect x="' + (x - 2) + '" y="' + (base - 6 - lift) + '" width="' + (cw + 4) + '" height="6" rx="3" fill="#7a5220"/>';
      if (i === picked && i !== ball) s += '<text x="' + (x + cw / 2) + '" y="' + (base - 28 - lift) + '" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#fff" font-family="system-ui">PICKED</text>';
    }
    return s + '</svg>';
  }
  R('shellgame', function (e, ui) {
    var d = e.dt; if (!d || !d.r) return null;
    var runs = arr(d.r), nm = names(e), out = [];
    runs.forEach(function (r, i) {
      var parts = [], seq = String(r.q || ''), lvl = 1, row = ui.el('div', { class: 'sg-run' });
      seq.split('').forEach(function (ch) {
        var n = lvl <= 6 ? 3 : lvl <= 12 ? 4 : 5;
        row.appendChild(ui.el('span', { class: 'sg-p ' + (ch === '1' ? 'ok' : 'no') + (n > 3 ? ' t' + n : ''), text: String(lvl), title: 'Level ' + lvl + (ch === '1' ? ': found it' : ': missed') }));
        if (ch === '1') lvl++;
      });
      if (seq) parts.push(row);
      var h = String(r.h || '').split(',');
      parts.push(ui.stats([['Levels cleared', r.c], ['Best streak', r.b], ['Most cups', r.mc], h.length === 3 ? ['Hardest shuffle', h[0] + ' moves', h[1] + ' cups · level ' + h[2]] : null]));
      var miss = arr(r.m), last = miss[miss.length - 1];
      if (last && last.a >= 0 && last.p >= 0) {
        parts.push(ui.el('div', { class: 'dv-sub', text: (miss.length > 1 ? 'Last miss' : 'The miss') + ': level ' + last.l + ', ' + last.mv + ' moves' }));
        parts.push(ui.el('div', { class: 'hv-snap', style: { 'max-width': '360px', background: 'radial-gradient(120% 120% at 50% 0%,#1d6a70,#0b3439)' }, html: cupsSvg(last.n, last.a, last.p) }));
      }
      out.push(ui.section(runs.length > 1 ? (nm[i] || 'Player ' + (i + 1)) + "'s run" : 'The run', parts, { icon: 'eye' }));
    });
    if (seqLegendNeeded(runs)) out.push(ui.el('p', { class: 'dv-note', text: 'Green: found the ball. Red: missed. A yellow ring means 4 cups, pink means 5.' }));
    return ui.wrap(out);
  });
  function seqLegendNeeded(runs) { return runs.some(function (r) { return r.q; }); }

  // ════════════════════════════════════════════════════════════════════════
  // Wheel of Fortune: every puzzle board as it stood when it was solved
  // ════════════════════════════════════════════════════════════════════════
  function isL(c) { return c >= 'A' && c <= 'Z'; }
  var ROWW = [12, 14, 14, 12];
  function rowOK(r, c) { return r === 0 || r === 3 ? c >= 1 && c <= 12 : c >= 0 && c <= 13; }
  function splitsOf(ws, n) {
    var out = [];
    (function rec(s, acc) {
      if (acc.length === n - 1) { if (s < ws.length) out.push(acc.concat([ws.slice(s).join(' ')])); return; }
      for (var e = s + 1; e <= ws.length - (n - 1 - acc.length); e++) rec(e, acc.concat([ws.slice(s, e).join(' ')]));
    })(0, []);
    return out;
  }
  // same layout the game uses (4 rows of 12 / 14 / 14 / 12)
  function layoutPuzzle(text) {
    var words = text.split(' '), SETS = { 1: [[1]], 2: [[1, 2]], 3: [[0, 1, 2], [1, 2, 3]], 4: [[0, 1, 2, 3]] }, best = null;
    for (var n = 1; n <= 4 && !best; n++) {
      if (words.length < n) break;
      splitsOf(words, n).forEach(function (lines) {
        SETS[n].forEach(function (rows) {
          if (lines.some(function (l, k) { return l.length > ROWW[rows[k]]; })) return;
          var mx = Math.max.apply(null, lines.map(function (l) { return l.length; }));
          var sc = mx * 1000 + lines.reduce(function (a, l) { return a + (mx - l.length) * (mx - l.length); }, 0);
          if (!best || sc < best.sc) best = { sc: sc, lines: lines, rows: rows };
        });
      });
    }
    if (!best) return null;
    var cell = []; for (var k = 0; k < 56; k++) cell.push(-1);
    var mx = Math.max.apply(null, best.lines.map(function (l) { return l.length; })), start = Math.floor((14 - mx) / 2), off = 0;
    best.lines.forEach(function (l, i) {
      var r = best.rows[i], s = start;
      if (r === 0 || r === 3) { s = Math.max(1, s); if (s + l.length > 13) s = 13 - l.length; }
      for (var j = 0; j < l.length; j++) if (l[j] !== ' ') cell[r * 14 + s + j] = off + j;
      off += l.length + 1;
    });
    return cell;
  }
  function wofBoard(z) {
    var text = String(z.x || ''), m = String(z.m || ''), cell = layoutPuzzle(text);
    if (!cell) return null;
    var solved = z.w >= 0, TW = 22, TH = 28, G = 2, pad = 9, W = pad * 2 + 14 * TW + 13 * G, BH = pad * 2 + 4 * TH + 3 * G, H = BH + 30, id = 'wf' + (++uid);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Puzzle board: ' + esc(text) + '">';
    s += '<defs><linearGradient id="' + id + 'f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d74ff"/><stop offset=".18" stop-color="#2c3fc4"/><stop offset="1" stop-color="#1b278a"/></linearGradient>' +
      '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3cc07a"/><stop offset=".55" stop-color="#1d8f53"/><stop offset="1" stop-color="#147040"/></linearGradient>' +
      '<linearGradient id="' + id + 'w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f1f4f6"/><stop offset="1" stop-color="#dfe5ea"/></linearGradient></defs>';
    s += '<rect x="0" y="0" width="' + W + '" height="' + BH + '" rx="12" fill="url(#' + id + 'f)"/>';
    for (var k = 0; k < 56; k++) {
      var r = (k / 14) | 0, c = k % 14;
      if (!rowOK(r, c)) continue;
      var x = pad + c * (TW + G), y = pad + r * (TH + G), ci = cell[k];
      if (ci < 0) { s += '<rect x="' + x + '" y="' + y + '" width="' + TW + '" height="' + TH + '" rx="3" fill="url(#' + id + 'g)" stroke="#0b4f2c" stroke-width="1"/>'; continue; }
      var ch = text.charAt(ci), shown = !isL(ch) || m.charAt(ci) === '1';
      var fill = shown ? 'url(#' + id + 'w)' : solved ? '#fff3c4' : '#ffe1e1', ink = shown ? '#101018' : solved ? '#1d4ed8' : '#c8102e';
      s += '<rect x="' + x + '" y="' + y + '" width="' + TW + '" height="' + TH + '" rx="3" fill="' + fill + '" stroke="#168048" stroke-width="1"/>';
      s += '<text x="' + (x + TW / 2) + '" y="' + (y + TH / 2 + 1) + '" text-anchor="middle" dominant-baseline="central" font-size="17" font-weight="900" fill="' + ink + '" font-family="system-ui,sans-serif">' + esc(ch) + '</text>';
    }
    var cat = String(z.c || ''), cw = Math.min(W - 40, cat.length * 9.5 + 34);
    s += '<rect x="' + (W - cw) / 2 + '" y="' + (BH + 4) + '" width="' + cw + '" height="24" rx="7" fill="#16206e" stroke="#7d93ff" stroke-width="1.5"/>';
    s += '<text x="' + W / 2 + '" y="' + (BH + 16.5) + '" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" letter-spacing="1.6" fill="#fff" font-family="system-ui,sans-serif">' + esc(cat) + '</text>';
    return s + '</svg>';
  }
  function wofSeq(ui, z, nm) {
    var text = String(z.x || ''), toks = String(z.e || '').split(' ').filter(Boolean), box = ui.el('div', { class: 'wv-seq' }), any = false;
    toks.forEach(function (t) {
      var mm = /^(\d)([A-Z!\/?])(.*)$/.exec(t); if (!mm) return;
      var p = +mm[1], code = mm[2], rest = mm[3], pc = ui.color(p), who = nm[p] || '';
      any = true;
      if (code === '!') box.appendChild(ui.el('span', { class: 'wv-x bk', style: { '--pc': pc }, title: who, html: 'BANKRUPT' + (+rest ? ' <small>' + esc(who) + ' −' + cash(+rest) + '</small>' : ' <small>' + esc(who) + '</small>') }));
      else if (code === '/') box.appendChild(ui.el('span', { class: 'wv-x lt', style: { '--pc': pc }, html: 'LOSE A TURN <small>' + esc(who) + '</small>' }));
      else if (code === '?') box.appendChild(ui.el('span', { class: 'wv-x ws', style: { '--pc': pc }, html: 'Wrong solve <small>' + esc(who) + '</small>' }));
      else {
        var n = text.split(code).length - 1, v = rest === 'f' ? 500 : +rest || 0;
        var sub = n > 1 ? '×' + n : '';
        if (n && v) sub += (sub ? ' ' : '') + fmtK(n * v);
        box.appendChild(ui.el('span', { class: 'wv-l' + (n ? '' : ' miss'), style: { '--pc': pc }, title: who + ': ' + code + (n ? ' (' + n + ')' : ' (none)'), html: esc(code) + (sub ? '<small>' + esc(sub) + '</small>' : '') }));
      }
    });
    return any ? box : null;
  }
  R(['wheeloffortune', 'wof'], function (e, ui) {
    var d = e.dt; if (!d || !d.pz) return null;
    var pz = arr(d.pz), nm = names(e), out = [];
    if (!pz.length) return null;
    out.push(legend(ui, nm.map(function (n, i) { return { name: n, color: ui.color(i) }; })));
    var KIND = { tu: 'Toss-up', tb: 'Tiebreaker', r: 'Round', b: 'Bonus round' };
    pz.forEach(function (z) {
      var text = String(z.x || ''), m = String(z.m || ''), total = 0, showing = 0;
      for (var i = 0; i < text.length; i++) if (isL(text.charAt(i))) { total++; if (m.charAt(i) === '1') showing++; }
      var title = z.k === 'r' ? 'Round ' + z.r : KIND[z.k] || 'Puzzle';
      var prize = z.k === 'tu' || z.k === 'tb' ? fmtK(z.p) : '';
      var who = z.w >= 0 ? nm[z.w] || '' : '';
      var res;
      if (z.k === 'b') res = who ? '<b>' + esc(who) + '</b> solved it with ' + showing + ' of ' + total + ' letters showing' : 'Time ran out with ' + showing + ' of ' + total + ' letters showing.';
      else if (z.w < 0) res = 'Nobody got it. ' + (total - showing) + ' letter' + (total - showing === 1 ? ' was' : 's were') + ' still hidden.';
      else if (showing === total) res = '<b>' + esc(who) + '</b> called the last letter' + (z.a ? ' and banked <b>' + cash(z.a) + '</b>' : '') + '.';
      else res = '<b>' + esc(who) + '</b> ' + (z.k === 'r' ? 'solved' : 'buzzed in') + ' with ' + (showing === 0 ? 'no letters' : showing + ' of ' + total + ' letters') + ' showing' + (z.a ? ' and won <b>' + cash(z.a) + '</b>' : '') + '.';
      var kids = [ui.el('div', { class: 'wv-top' }, [ui.el('span', { text: title }), prize ? ui.el('b', { text: prize }) : null]),
        ui.picture(wofBoard(z) || '', { max: 380 }), ui.el('p', { class: 'dv-note', html: res })];
      if (z.k === 'b' && d.b) {
        var b = d.b, pk = String(b.pk || '').split('');
        var keys = ui.el('div', { class: 'wv-keys' }, [ui.el('span', { text: 'Free:' })].concat('RSTLNE'.split('').map(function (L) { return ui.el('span', { class: 'wv-k' + (text.indexOf(L) < 0 ? ' no' : ''), text: L }); }))
          .concat(pk.length ? [ui.el('span', { text: ' Picked:', style: { 'margin-left': '6px' } })].concat(pk.map(function (L) { return ui.el('span', { class: 'wv-k pk' + (text.indexOf(L) < 0 ? ' no' : ''), text: L }); })) : []));
        kids.push(keys);
        kids.push(ui.el('p', { class: 'dv-note', html: b.ok ? 'Opened the envelope: <b class="dv-good">' + cash(b.env) + '</b> won.' : 'The envelope held <b>' + cash(b.env) + '</b>. Not this time.' }));
      }
      var seq = wofSeq(ui, z, nm);
      if (seq) kids.push(seq);
      out.push(ui.el('div', { class: 'wv-pz' }, kids));
    });
    out.push(ui.el('p', { class: 'dv-note', text: 'Dark letters were showing when it ended. Blue letters were filled in by the solver; red ones nobody got. Under each board: letters called in order (crossed out = not in the puzzle).' }));
    return ui.wrap(out);
  });

  // ════════════════════════════════════════════════════════════════════════
  // Deal or No Deal: the case-by-case story
  // ════════════════════════════════════════════════════════════════════════
  var DV = [0.01, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750,
    1000, 5000, 10000, 25000, 50000, 75000, 100000, 200000, 300000, 400000, 500000, 750000, 1000000];
  var DCUM = [6, 11, 15, 18, 20, 21, 22, 23, 24], AZ = 'abcdefghijklmnopqrstuvwxyz';
  function caseSvg(num) {
    return '<svg viewBox="0 0 64 56" aria-hidden="true"><rect x="22" y="2" width="20" height="10" rx="3" fill="none" stroke="#3f444c" stroke-width="3.5"/>' +
      '<rect x="2" y="10" width="60" height="44" rx="6" fill="#c7ccd4" stroke="#7b838e" stroke-width="1.5"/><rect x="2" y="10" width="60" height="16" rx="6" fill="#eef0f3"/>' +
      '<rect x="16" y="22" width="32" height="22" rx="4" fill="#fffef6" stroke="#bdb59a"/><text x="32" y="34" text-anchor="middle" dominant-baseline="central" font-size="17" font-weight="900" fill="#111" font-family="system-ui">' + num + '</text></svg>';
  }
  function moneyBoard(inPlay, mine) {
    var W = 326, bw = 150, bh = 18, g = 3, pad = 8, H = pad * 2 + 13 * bh + 12 * g, id = 'dd' + (++uid);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Money board">';
    s += '<defs><linearGradient id="' + id + 'l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7db7ff"/><stop offset=".45" stop-color="#2f78e6"/><stop offset="1" stop-color="#1c55b8"/></linearGradient>' +
      '<linearGradient id="' + id + 'h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".45" stop-color="#ffc93a"/><stop offset="1" stop-color="#d99a12"/></linearGradient></defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="12" fill="#0a0f26"/>';
    DV.forEach(function (v, k) {
      var col = k < 13 ? 0 : 1, row = k % 13, x = pad + col * (bw + 10), y = pad + row * (bh + g), live = inPlay[k], me = k === mine;
      s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bh + '" rx="4" fill="' + (live ? 'url(#' + id + (col ? 'h' : 'l') + ')' : 'rgba(255,255,255,.05)') + '"' + (me ? ' stroke="#fff" stroke-width="2.5"' : '') + '/>';
      s += '<text x="' + (x + bw / 2) + '" y="' + (y + bh / 2 + 0.5) + '" text-anchor="middle" dominant-baseline="central" font-size="11.5" font-weight="900" fill="' + (live ? (col ? '#3b2500' : '#fff') : 'rgba(255,255,255,.25)') + '" font-family="system-ui"' + (live ? '' : ' text-decoration="line-through"') + '>' + cash(v) + '</text>';
    });
    return s + '</svg>';
  }
  function offerChart(offs, avgs, dealR, nReal) {
    var W = 340, H = 180, L = 8, Rr = 8, T = 18, B = 20, n = 9, bw = (W - L - Rr) / n;
    var mx = Math.max.apply(null, offs.concat(avgs).filter(function (x) { return x != null; }).concat([1]));
    function Y(v) { return T + (H - T - B) * (1 - v / mx); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Banker offers by round">';
    for (var r = 0; r < n; r++) {
      var x = L + r * bw, o = offs[r];
      if (o != null) {
        var ghost = r >= nReal, deal = r === dealR, y = Y(o);
        s += '<rect x="' + (x + bw * 0.18) + '" y="' + y + '" width="' + bw * 0.64 + '" height="' + Math.max(2, H - B - y) + '" rx="3" fill="' + (ghost ? 'rgba(255,201,58,.12)' : deal ? '#22c55e' : '#ffc93a') + '"' + (ghost ? ' stroke="#ffc93a" stroke-dasharray="3 3" stroke-width="1.2"' : '') + '/>';
        s += '<text x="' + (x + bw / 2) + '" y="' + (y - 5) + '" text-anchor="middle" font-size="9" font-weight="800" fill="' + (deal ? '#4ade80' : ghost ? 'rgba(255,223,138,.6)' : '#ffdf8a') + '" font-family="system-ui">' + fmtK(o) + '</text>';
      }
      s += '<text x="' + (x + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" font-weight="' + (r === dealR ? 900 : 600) + '" fill="' + (r === dealR ? '#4ade80' : 'rgba(255,255,255,.5)') + '" font-family="system-ui">' + (r === dealR ? 'DEAL' : r + 1) + '</text>';
    }
    var pts = []; avgs.forEach(function (a, r) { if (a != null) pts.push([L + r * bw + bw / 2, Y(a)]); });
    if (pts.length) {
      s += '<path d="' + pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="#7db7ff" stroke-width="2.2" stroke-linejoin="round"/>';
      pts.forEach(function (p) { s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="#7db7ff"/>'; });
    }
    return s + '</svg>';
  }
  function dondOne(ui, g, name, multi) {
    var vals = String(g.v || '').split('').map(function (c) { return DV[AZ.indexOf(c)]; });
    var opened = String(g.o || '').split('').map(function (c) { return AZ.indexOf(c); });
    if (vals.length !== 26 || g.my == null) return null;
    var my = g.my, mv = vals[my], offs = arr(g.of), gh = arr(g.gh), allOff = offs.concat(gh), dealR = g.d != null && g.d >= 0 ? g.d : -1, da = g.da || 0;
    var won = dealR >= 0 ? da : mv, out = [];
    // averages of what was still in play when each offer came
    var avgs = [];
    for (var r = 0; r < 9; r++) {
      if (opened.length < DCUM[r]) { avgs.push(null); continue; }
      var gone = {}; opened.slice(0, DCUM[r]).forEach(function (i) { gone[i] = 1; });
      var left = []; for (var i = 0; i < 26; i++) if (!gone[i]) left.push(vals[i]);
      avgs.push(left.reduce(function (a, b) { return a + b; }, 0) / left.length);
    }
    // verdict
    var best = -1; offs.forEach(function (o, r) { if (best < 0 || o > offs[best]) best = r; });
    var big = cash(won), line;
    if (dealR >= 0) {
      line = 'Took the deal in round ' + (dealR + 1) + '. Case ' + (my + 1) + ' held <b>' + cash(mv) + '</b>. ' +
        (mv <= da ? '<b class="dv-good">Great deal: ' + cash(da - mv) + ' more than the case.</b>' : '<b class="dv-bad">Left ' + cash(mv - da) + ' on the table.</b>');
    } else {
      line = (g.sw ? 'Swapped from case ' + (g.org + 1) + ' (' + cash(vals[g.org]) + ') to case ' + (my + 1) + '. ' : 'No Deal all the way with case ' + (my + 1) + '. ');
      if (best >= 0) line += mv >= offs[best] ? '<b class="dv-good">Beat the best offer (' + cash(offs[best]) + ') by ' + cash(mv - offs[best]) + '.</b>' : '<b class="dv-bad">The best offer was ' + cash(offs[best]) + ' in round ' + (best + 1) + '.</b>';
    }
    out.push(ui.el('div', { class: 'dd-verdict' }, [ui.el('div', { html: caseSvg(my + 1) }), ui.el('div', null, [ui.el('div', { class: 'big', text: big }), ui.el('p', { html: line })])]));
    // offers vs what was left
    if (allOff.length) {
      out.push(ui.section("The Banker's offers", [ui.picture(offerChart(allOff.slice(0, 9), avgs.map(function (a, r) { return allOff[r] != null ? a : null; }), dealR, offs.length), { frame: 'dark', max: 420 }),
        ui.el('div', { class: 'dv-legend' }, [ui.el('span', null, [ui.el('i', { style: { background: '#ffc93a', 'border-radius': '2px' } }), ui.el('span', { text: 'Offer' })]),
          ui.el('span', null, [ui.el('i', { style: { background: '#7db7ff' } }), ui.el('span', { text: 'Average left in play' })]),
          gh.length ? ui.el('span', null, [ui.el('i', { style: { background: 'transparent', border: '1.5px dashed #ffc93a', 'border-radius': '2px' } }), ui.el('span', { text: 'What it would have been' })]) : null])], { icon: 'chart' }));
    }
    // round by round
    var list = ui.el('div', { class: 'dd-rounds' }), prev = 0;
    for (var rr = 0; rr < 9; rr++) {
      var ids = opened.slice(prev, DCUM[rr]); prev = DCUM[rr];
      if (!ids.length) break;
      var ghost = dealR >= 0 && rr > dealR, o = allOff[rr], deal = rr === dealR;
      var cs = ui.el('div', { class: 'dd-cs' }, ids.map(function (i) { var v = vals[i]; return ui.el('span', { class: 'dd-c ' + (v >= 100000 ? 'top' : v >= 1000 ? 'hi' : 'lo') }, [ui.el('i', { text: String(i + 1) }), ui.el('span', { text: fmtK(v) })]); }));
      var offLine = o != null ? ui.el('div', { class: 'dd-off' }, [ui.el('span', { html: (ghost ? 'Would have offered ' : 'Offer ') + '<b>' + cash(o) + '</b>' }),
        avgs[rr] != null ? ui.el('span', { text: Math.round(o / avgs[rr] * 100) + '% of the ' + fmtK(avgs[rr]) + ' average' }) : null,
        ghost ? ui.el('span', { class: 'dd-tag', text: 'WHAT IF' }) : ui.el('span', { class: 'dd-tag ' + (deal ? 'deal' : 'nd'), text: deal ? 'DEAL' : 'NO DEAL' })]) : null;
      list.appendChild(ui.el('div', { class: 'dd-r' + (ghost ? ' ghost' : '') + (deal ? ' deal' : '') }, [ui.el('b', { text: 'Round ' + (rr + 1) }), cs, offLine]));
    }
    // the final two
    if (opened.length >= 25) {
      var other = opened[24];
      list.appendChild(ui.el('div', { class: 'dd-r' }, [ui.el('b', { text: 'Final' }), ui.el('div', { class: 'dd-cs' }, [
        ui.el('span', { class: 'dd-c ' + (vals[other] >= 1000 ? 'hi' : 'lo') }, [ui.el('i', { text: String(other + 1) }), ui.el('span', { text: fmtK(vals[other]) + (g.sw ? ' (first pick)' : ' (left on stage)') })]),
        ui.el('span', { class: 'dd-c top' }, [ui.el('i', { text: String(my + 1) }), ui.el('span', { text: fmtK(mv) + ' (your case)' })])])]));
    }
    out.push(ui.section('Case by case', list, { icon: 'book' }));
    // the money board at the moment of decision
    var cut = dealR >= 0 ? DCUM[dealR] : Math.min(24, opened.length);
    var gone2 = {}; opened.slice(0, cut).forEach(function (i) { gone2[i] = 1; });
    var inPlay = DV.map(function (v) { var ci = vals.indexOf(v); return !gone2[ci]; });
    out.push(ui.section(dealR >= 0 ? 'The board when you took the deal' : 'The board at the end', [ui.picture(moneyBoard(inPlay, DV.indexOf(mv)), { max: 380 }),
      ui.el('p', { class: 'dv-note', text: 'Lit amounts were still in play. The white outline is what your case held.' })], { icon: 'coins' }));
    return multi ? ui.section(name + ' · ' + cash(won), out) : out;
  }
  R('dealornodeal', function (e, ui) {
    var d = e.dt; if (!d || !d.g) return null;
    var gs = arr(d.g), nm = names(e), multi = gs.length > 1;
    var out = [];
    gs.forEach(function (g, i) { var n = dondOne(ui, g, nm[i] || 'Player ' + (i + 1), multi); if (n) out = out.concat(n); });
    return ui.wrap(out);
  });
})();
