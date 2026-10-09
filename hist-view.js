'use strict';
// ── Game history: the detail view for one finished game ───────────────────
// Games save a small `detail` object with their record (Kit.record(key, {..., detail})), stored as entry.dt.
// A view for each game turns it into something to look at: the final board, the cards, the scorecard, the
// moments that mattered. Views live in hist/*.js and register here:
//
//   HistView.register('connectfour', function (e, ui) { return node or null; })
//     e  = the saved record (e.dt = the detail; older records have no dt, so check)
//     ui = building blocks below (sections, stats, mini boards, cards, dice, tiles, tables, logs)
//
// Detail rules (it syncs, so keep it small): no arrays inside arrays (the cloud can't store them; use
// strings like 'RRY..Y' per row), and keep each record's detail to a couple of KB.
var HistView = window.HistView = (function () {
  var views = {}, cssDone = {};
  function register(ids, fn) { [].concat(ids).forEach(function (id) { views[id] = fn; }); }
  function has(id) { return !!views[id]; }
  function K() { return window.Kit; }
  function el(t, a, kids) { return K().el(t, a, kids); }
  function esc(s) { return K().esc(String(s == null ? '' : s)); }

  // Cloud copies turn [[a,b],[c,d]] into [{i0:a,i1:b},...]: turn those back into arrays
  function unpack(v) {
    if (Array.isArray(v)) return v.map(unpack);
    if (v && typeof v === 'object') {
      var ks = Object.keys(v);
      if (ks.length && ks.every(function (k) { return /^i\d+$/.test(k); })) { var a = []; ks.forEach(function (k) { a[+k.slice(1)] = unpack(v[k]); }); return a; }
      var o = {}; ks.forEach(function (k) { o[k] = unpack(v[k]); }); return o;
    }
    return v;
  }

  function render(e, gameId) {
    var fn = views[gameId] || (e && views[e.game]);
    if (!fn) return null;
    try { var n = fn(unpack(e), ui); return n || null; } catch (err) { console.warn('[hist-view]', gameId, err); return null; }
  }

  // A view's own styles, added once
  function css(id, text) { if (cssDone[id]) return; cssDone[id] = 1; var s = document.createElement('style'); s.textContent = text; document.head.appendChild(s); }

  // ── Building blocks ──
  var ui = {
    el: el, esc: esc, icon: function (n) { return K().icon(n); }, css: css,
    color: function (i) { return K().color(i); },
    // a titled block
    section: function (title, node, o) {
      o = o || {};
      return el('section', { class: 'hv-sec' + (o.cls ? ' ' + o.cls : '') }, [title ? el('h4', { class: 'hv-h', html: (o.icon ? K().icon(o.icon) : '') + '<span>' + esc(title) + '</span>' }) : null].concat([].concat(node)));
    },
    // big numbers in tiles: [[label, value, sub?], ...]
    stats: function (list) {
      var box = el('div', { class: 'hv-stats' });
      list.filter(function (x) { return x && x[1] != null && x[1] !== ''; }).forEach(function (x) {
        box.appendChild(el('div', { class: 'hv-stat' }, [el('b', { text: String(x[1]) }), el('small', { text: x[0] }), x[2] ? el('i', { text: x[2] }) : null]));
      });
      return box.children.length ? box : null;
    },
    // label: value lines
    facts: function (list) {
      var box = el('dl', { class: 'hv-facts' });
      list.filter(function (x) { return x && x[1] != null && x[1] !== ''; }).forEach(function (x) { box.appendChild(el('dt', { text: x[0] })); box.appendChild(el('dd', x[2] ? { html: x[1] } : { text: String(x[1]) })); });
      return box.children.length ? box : null;
    },
    // A picture of a board from rows of characters. pal maps each character to a colour (or {fill, ring, text, shape}).
    // o: {shape:'circle'|'square'|'round', cell:px, gap, bg, frame:'wood'|'felt'|'blue'|'paper'|'dark', pad, mark:['r,c',..] ringed cells,
    //     labels:{cols:'abc..', rows:'87..'}, max: max width px}
    board: function (rows, pal, o) {
      o = o || {}; rows = [].concat(rows || []).map(String);
      if (!rows.length) return null;
      var R = rows.length, C = Math.max.apply(null, rows.map(function (r) { return r.length; }));
      var cs = o.cell || 24, gap = o.gap != null ? o.gap : 3, pad = o.pad != null ? o.pad : 8;
      var lab = o.labels || null, lw = lab && lab.rows ? 14 : 0, lh = lab && lab.cols ? 14 : 0;
      var W = pad * 2 + C * cs + (C - 1) * gap + lw, H = pad * 2 + R * cs + (R - 1) * gap + lh;
      var marks = {}; (o.mark || []).forEach(function (m) { marks[m] = 1; });
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="hv-board-svg" role="img" aria-label="' + esc(o.aria || 'Final board') + '">';
      s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" rx="' + (o.radius != null ? o.radius : 10) + '" fill="' + (o.bg || 'transparent') + '"/>';
      rows.forEach(function (row, r) {
        for (var c = 0; c < C; c++) {
          var ch = row.charAt(c) || ' ', p = pal[ch]; if (p == null) p = pal['*'];
          if (p == null || p === '') continue;
          if (typeof p === 'string') p = { fill: p };
          var x = pad + lw + c * (cs + gap), y = pad + r * (cs + gap), shape = p.shape || o.shape || 'round';
          if (shape === 'circle') s += '<circle cx="' + (x + cs / 2) + '" cy="' + (y + cs / 2) + '" r="' + (cs / 2 - (p.inset || 0)) + '" fill="' + p.fill + '"' + (p.ring ? ' stroke="' + p.ring + '" stroke-width="2"' : '') + '/>';
          else s += '<rect x="' + (x + (p.inset || 0)) + '" y="' + (y + (p.inset || 0)) + '" width="' + (cs - 2 * (p.inset || 0)) + '" height="' + (cs - 2 * (p.inset || 0)) + '" rx="' + (shape === 'square' ? 1 : cs * 0.18) + '" fill="' + p.fill + '"' + (p.ring ? ' stroke="' + p.ring + '" stroke-width="2"' : '') + '/>';
          if (p.shine) s += '<circle cx="' + (x + cs * 0.38) + '" cy="' + (y + cs * 0.34) + '" r="' + cs * 0.14 + '" fill="rgba(255,255,255,.35)"/>';
          if (p.text) s += '<text x="' + (x + cs / 2) + '" y="' + (y + cs / 2) + '" text-anchor="middle" dominant-baseline="central" font-size="' + (p.size || cs * 0.55) + '" font-weight="800" fill="' + (p.ink || '#111') + '" font-family="ui-rounded,system-ui,sans-serif">' + esc(p.text === true ? ch : p.text) + '</text>';
          if (marks[r + ',' + c]) s += (shape === 'circle' ? '<circle cx="' + (x + cs / 2) + '" cy="' + (y + cs / 2) + '" r="' + (cs / 2 + 1) + '"' : '<rect x="' + (x - 1) + '" y="' + (y - 1) + '" width="' + (cs + 2) + '" height="' + (cs + 2) + '" rx="' + cs * 0.22 + '"') + ' fill="none" stroke="' + (o.markColor || '#fff') + '" stroke-width="2.5"/>';
        }
      });
      if (lab) {
        if (lab.cols) for (var c2 = 0; c2 < C; c2++) s += '<text x="' + (pad + lw + c2 * (cs + gap) + cs / 2) + '" y="' + (H - pad / 2 - 4) + '" text-anchor="middle" font-size="10" fill="rgba(255,255,255,.55)" font-family="system-ui">' + esc(lab.cols.charAt(c2)) + '</text>';
        if (lab.rows) for (var r2 = 0; r2 < R; r2++) s += '<text x="' + (pad + 4) + '" y="' + (pad + r2 * (cs + gap) + cs / 2) + '" dominant-baseline="central" font-size="10" fill="rgba(255,255,255,.55)" font-family="system-ui">' + esc(lab.rows.charAt(r2)) + '</text>';
      }
      s += (o.extraSvg || '') + '</svg>';
      return el('div', { class: 'hv-snap ' + (o.frame ? 'f-' + o.frame : ''), style: o.max ? { 'max-width': o.max + 'px' } : null, html: s });
    },
    // any SVG picture, framed like a board
    picture: function (svg, o) { o = o || {}; return el('div', { class: 'hv-snap ' + (o.frame ? 'f-' + o.frame : ''), style: o.max ? { 'max-width': o.max + 'px' } : null, html: svg }); },
    // playing cards from codes like 'AS', '10h', 'Qd', 'Kc' ('??' = face down); o.small
    cards: function (codes, o) {
      o = o || {};
      var row = el('div', { class: 'hv-cards' + (o.small === false ? '' : ' sm') + (o.fan ? ' fan' : '') });
      [].concat(codes || []).forEach(function (c) {
        c = String(c); var back = c === '??' || c === 'XX';
        var m = /^(10|[2-9TJQKA])([shdc♠♥♦♣])$/i.exec(c.trim());
        var card = back || !m ? K().card('A', 's', { back: true }) : K().card(m[1].toUpperCase() === 'T' ? '10' : m[1].toUpperCase(), m[2].toLowerCase());
        if (o.hl && o.hl.indexOf(c) >= 0) card.classList.add('hv-hl');
        row.appendChild(card);
      });
      return row;
    },
    // dice faces: [1..6]; o.held = indexes to ring
    dice: function (vals, o) {
      o = o || {}; var row = el('div', { class: 'hv-dice' });
      if (o.size) row.style.setProperty('--ds', o.size + 'px');
      [].concat(vals || []).forEach(function (v, i) { var d = K().die(v); d.disabled = true; d.tabIndex = -1; if (o.held && o.held.indexOf(i) >= 0) d.classList.add('hv-hl'); row.appendChild(d); });
      return row;
    },
    // letter tiles: word + states per letter (g = right spot, y = in word, b = not, ' ' = blank)
    tiles: function (word, states, o) {
      o = o || {}; var row = el('div', { class: 'hv-tiles' + (o.cls ? ' ' + o.cls : '') });
      String(word || '').split('').forEach(function (ch, i) { row.appendChild(el('span', { class: 'hv-tile s-' + ((states || '').charAt(i) || 'n'), text: ch === '_' ? '' : ch.toUpperCase() })); });
      return row;
    },
    // a table: head = ['', 'Tim', ...], rows = [['H1', 3, 4], ...], o.foot = totals row, o.hlCol
    table: function (head, rows, o) {
      o = o || {};
      var t = el('table', { class: 'hv-tbl' + (o.cls ? ' ' + o.cls : '') });
      if (head) t.appendChild(el('tr', null, head.map(function (h, i) { return el('th', { text: h == null ? '' : String(h), style: o.headColors && o.headColors[i] ? { color: o.headColors[i] } : null }); })));
      (rows || []).forEach(function (r) { t.appendChild(el('tr', { class: r && r._cls || '' }, [].concat(r).map(function (v, i) { var cell = el(i === 0 ? 'th' : 'td', v && typeof v === 'object' && !Array.isArray(v) ? { text: String(v.t), class: v.c || '' } : { text: v == null ? '–' : String(v) }); return cell; }))); });
      if (o.foot) t.appendChild(el('tr', { class: 'tot' }, o.foot.map(function (v, i) { return el(i === 0 ? 'th' : 'td', { text: v == null ? '' : String(v) }); })));
      return el('div', { class: 'hv-scroll' }, [t]);
    },
    // play by play: ['line', ...] or [{t:'text', c:'#color' or player index, b: bold prefix}]
    log: function (lines, o) {
      o = o || {}; var ol = el('ol', { class: 'hv-log' + (o.numbered ? ' num' : '') });
      [].concat(lines || []).forEach(function (x) {
        if (x == null) return; if (typeof x !== 'object') x = { t: x };
        var col = typeof x.c === 'number' ? K().color(x.c) : x.c;
        ol.appendChild(el('li', { style: col ? { '--lc': col } : null, class: col ? 'dot' : '' }, [x.b ? el('b', { text: x.b }) : null, el('span', { text: x.t })]));
      });
      return ol;
    },
    // horizontal bars: [{label, value, max?, color?, text?}]
    bars: function (list, o) {
      o = o || {}; var mx = Math.max.apply(null, list.map(function (x) { return Math.abs(x.max || x.value || 0); }).concat([1]));
      var box = el('div', { class: 'hv-bars' });
      list.forEach(function (x, i) {
        var pct = Math.max(2, Math.round(Math.abs(x.value || 0) / mx * 100));
        box.appendChild(el('div', { class: 'hv-bar' }, [el('span', { class: 'l', text: x.label }), el('span', { class: 't' }, [el('i', { style: { width: pct + '%', background: x.color || K().color(i) } })]), el('b', { text: x.text != null ? x.text : String(x.value) })]));
      });
      return box;
    },
    // small rounded tags
    chips: function (list, o) {
      o = o || {}; var box = el('div', { class: 'hv-chips' });
      [].concat(list || []).forEach(function (x) { if (x == null || x === '') return; if (typeof x !== 'object') x = { t: x }; box.appendChild(el('span', { class: 'hv-chip' + (x.on ? ' on' : '') + (x.off ? ' off' : ''), style: x.c ? { '--cc': x.c } : null, text: x.t })); });
      return box;
    },
    // a person's name with their avatar
    who: function (name, i) { return el('span', { class: 'hv-who' }, [K().avatar ? K().avatar.el(name || '?', 'sm', K().color(i || 0)) : null, el('span', { text: name || '' })]); },
    money: function (n) { n = Number(n) || 0; return (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US'); },
    num: function (n) { return (Number(n) || 0).toLocaleString('en-US'); },
    time: function (sec) { sec = Math.round(Number(sec) || 0); var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; },
    // several nodes in one wrapper (skips nulls)
    wrap: function (nodes, cls) { var n = [].concat(nodes).filter(Boolean); return n.length ? el('div', { class: 'hv' + (cls ? ' ' + cls : '') }, n) : null; }
  };

  // the views, one file per kind of game
  var files = ['hist/board.js', 'hist/board2.js', 'hist/cards.js', 'hist/specialty.js', 'hist/dice.js', 'hist/party.js', 'hist/puzzle.js', 'hist/words.js', 'hist/casino.js', 'hist/arcade.js', 'hist/lorcana.js'];
  return { register: register, has: has, render: render, unpack: unpack, ui: ui, css: css, files: files };
})();
