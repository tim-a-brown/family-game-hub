// ═══════════════════════════════════════════════════════════════════════════
// Card table toolkit (load after kit.js). Shared by every card game.
//
//   Cards.deck({suits, ranks, decks})   -> [{r,s,id}]  standard 52 by default
//   Cards.shuffle(arr)                   -> arr (in place, Fisher–Yates)
//   Cards.sort(hand, {suits, ranks, trump, by})  sort for display (in place)
//       by: 'suit' (default: suit groups, trump first, then rank)
//           'rank' (rank order, then suit order; trump still first on ties)
//   Cards.sortBy(hand, mode, {suit: cmp, rank: cmp, …})  sort in place with
//       the comparator for `mode` (falls back to the first one). For decks
//       with their own card types (Rook colours, Phase 10 wilds/skips, Five
//       Crowns jokers, Wizard wizards/jesters). Ties keep their old order.
//   Cards.el(card, opts)                 -> Kit.card element for {r,s}
//   Cards.fan(container)                 squeeze overlap so a hand fits its width
//   Cards.fly(node, fromEl, opts)        animate node from fromEl's position
//   Cards.flip(root, mutate, {ms})       FLIP: note where every [data-id] card
//       in root is, run mutate() (re-sort + repaint), then slide each card
//       from its old spot to its new one. root may be a function returning
//       the element (if mutate rebuilds it).
//   Cards.wait(ms)                       -> Promise
//
//   Sort toggle (the "Suit | Rank" pill above your hand):
//   Cards.sortToggle(host, {key, modes, value, onChange, flip, retap})
//       -> {el, get(), set(mode)}
//       key:      localStorage key that remembers the choice (e.g. 'hearts_sort')
//       modes:    ['suit','rank'] (default). Presets: 'suit', 'rank', 'melds',
//                 'groups', 'color'. Or objects {id, label, glyph} (glyph is
//                 HTML; omitted fields come from the preset with the same id).
//       value:    default mode when nothing is remembered yet
//       onChange: fn(mode) after a tap that changes the mode
//       flip:     element (or fn returning it) to FLIP-animate around onChange
//       retap:    true = tapping the current mode calls onChange again
//                 (e.g. tidy up after dragging cards around)
//       host may be null: append toggle.el yourself, usually inside a
//       <div class="csort-row"> placed right above the hand (right-aligned).
//   Cards.sortMode(key, def, ids)        -> remembered mode (or def)
//
//   Scorepad(host, opts)                 paper scorepad for "keep score" games
//     (see the comment above Scorepad for options)
//
// Table layout CSS (.ctable, .cseat, .ctrick, .chand) lives at the bottom of
// this file and is injected once.
// ═══════════════════════════════════════════════════════════════════════════
var Cards = (function () {
  'use strict';
  var RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  var SUITS = ['c', 'd', 's', 'h'];
  var GLYPH = { s: '♠', h: '♥', d: '♦', c: '♣' };

  function deck(o) {
    o = o || {};
    var ranks = o.ranks || RANKS, suits = o.suits || SUITS, n = o.decks || 1, out = [], id = 0;
    for (var d = 0; d < n; d++) suits.forEach(function (s) { ranks.forEach(function (r) { out.push({ r: r, s: s, id: 'c' + (id++) }); }); });
    return out;
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function rankIndex(r, ranks) { return (ranks || RANKS).indexOf(String(r)); }
  function sort(hand, o) {
    o = o || {};
    var suits = (o.suits || ['s', 'h', 'c', 'd']).slice(), ranks = o.ranks || RANKS;
    if (o.trump) { suits = suits.filter(function (s) { return s !== o.trump; }); suits.unshift(o.trump); }
    if (o.by === 'rank') return hand.sort(function (a, b) {
      return rankIndex(a.r, ranks) - rankIndex(b.r, ranks) || suits.indexOf(a.s) - suits.indexOf(b.s);
    });
    return hand.sort(function (a, b) {
      return suits.indexOf(a.s) - suits.indexOf(b.s) || rankIndex(a.r, ranks) - rankIndex(b.r, ranks);
    });
  }
  // Sort with a game's own comparator per mode (stable: ties keep their order)
  function sortBy(hand, mode, cmps) {
    var cmp = cmps[mode] || cmps[Object.keys(cmps)[0]];
    var idx = new Map(); hand.forEach(function (c, i) { idx.set(c, i); });
    return hand.sort(function (a, b) { return cmp(a, b) || idx.get(a) - idx.get(b); });
  }

  // ── FLIP: slide cards to their new places after a re-sort ─────────────────
  var canTranslate = !!(window.CSS && CSS.supports && CSS.supports('translate', '1px 1px'));
  function flip(root, mutate, o) {
    o = o || {};
    var get = typeof root === 'function' ? root : function () { return root; };
    var r0 = get(), before = {};
    if (r0) Array.prototype.forEach.call(r0.querySelectorAll('.pcard[data-id]'), function (n) { before[n.dataset.id] = n.getBoundingClientRect(); });
    mutate();
    // Measure after the game's own fan/layout pass (queued in rAF), before paint
    requestAnimationFrame(function () {
      var r1 = get(); if (!r1) return;
      Array.prototype.forEach.call(r1.querySelectorAll('.pcard[data-id]'), function (n) {
        var a = before[n.dataset.id]; if (!a || !n.animate) return;
        var b = n.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        var from = dx + 'px ' + dy + 'px';
        try {
          n.animate(canTranslate ? [{ translate: from }, { translate: '0px 0px' }] : [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }],
            { duration: o.ms || 320, easing: 'cubic-bezier(.2,.8,.25,1)' });
        } catch (e) {}
      });
    });
  }

  // ── Sort toggle: small "Suit | Rank" pill ─────────────────────────────────
  var SVGO = '<svg viewBox="0 0 16 16" aria-hidden="true">';
  var SORT_PRESET = {
    suit: { label: 'Suit', glyph: '<span class="csg-s">♠︎<i>♥︎</i></span>' },
    rank: { label: 'Rank', glyph: SVGO + '<rect x="1.5" y="9" width="3" height="5" rx="1"/><rect x="6.5" y="6" width="3" height="8" rx="1"/><rect x="11.5" y="2.5" width="3" height="11.5" rx="1"/></svg>' },
    melds: { label: 'Melds', glyph: SVGO + '<rect x="1" y="2" width="5" height="8" rx="1.2"/><rect x="4" y="3" width="5" height="8" rx="1.2" fill-opacity=".75"/><rect x="10" y="2" width="5" height="8" rx="1.2" fill-opacity=".55"/><path d="M1.5 12.5v1.5h13v-1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' },
    color: { label: 'Color', glyph: '<span class="csg-c"><i style="background:#e0253a"></i><i style="background:#1e6fdc"></i><i style="background:#169a4c"></i><i style="background:#f0b000"></i></span>' }
  };
  SORT_PRESET.groups = { label: 'Groups', glyph: SORT_PRESET.melds.glyph };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function sortMode(key, def, ids) {
    var v = key ? lsGet(key) : null;
    if (v && (!ids || ids.indexOf(v) >= 0)) return v;
    return def !== undefined ? def : (ids ? ids[0] : 'suit');
  }
  function sortToggle(host, o) {
    o = o || {};
    var modes = (o.modes || ['suit', 'rank']).map(function (m) {
      var x = typeof m === 'string' ? { id: m } : m, p = SORT_PRESET[x.id] || {};
      return { id: x.id, label: x.label || p.label || x.id, glyph: x.glyph != null ? x.glyph : (p.glyph || '') };
    });
    var ids = modes.map(function (m) { return m.id; });
    var cur = sortMode(o.key, o.value != null ? o.value : ids[0], ids);
    var wrap = document.createElement('div');
    wrap.className = 'csort';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Sort your hand');
    var btns = modes.map(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = (m.glyph ? '<span class="csg">' + m.glyph + '</span>' : '') + '<span>' + m.label + '</span>';
      b.setAttribute('aria-label', 'Sort by ' + m.label.toLowerCase());
      b.addEventListener('click', function () {
        if (m.id === cur && !o.retap) return;
        set(m.id, true);
      });
      wrap.appendChild(b);
      return b;
    });
    function paint() { btns.forEach(function (b, i) { b.setAttribute('aria-pressed', ids[i] === cur ? 'true' : 'false'); }); }
    function set(id, user) {
      if (ids.indexOf(id) < 0) return;
      cur = id; if (o.key) lsSet(o.key, id); paint();
      if (!user) return;
      if (window.Kit) { try { Kit.sfx('tap'); Kit.haptic('light'); } catch (e) {} }
      var run = function () { if (o.onChange) o.onChange(id); };
      if (o.flip) flip(o.flip, run); else run();
    }
    paint();
    if (host) host.appendChild(wrap);
    return { el: wrap, get: function () { return cur; }, set: function (id) { set(id, false); } };
  }
  function el(c, o) { o = o || {}; var n = Kit.card(c.r, c.s, o); n.dataset.id = c.id || (c.r + c.s); return n; }
  function label(c) { return (c.r === '10' ? '10' : c.r) + GLYPH[c.s]; }

  // Fit a row of overlapping cards inside its container.
  function fan(container, o) {
    o = o || {};
    var cards = container.querySelectorAll('.pcard'); if (!cards.length) return;
    var w = container.clientWidth - 16, cw = cards[0].offsetWidth || 64, n = cards.length;
    var natural = o.gap != null ? o.gap : 6;
    var overlap = n > 1 ? Math.min(natural, (w - cw) / (n - 1) - cw) : 0;
    overlap = Math.max(overlap, -cw * .78);
    container.style.setProperty('--overlap', overlap + 'px');
  }

  // FLIP animation: move `node` from where `fromEl` is to where node sits now.
  function fly(node, fromEl, o) {
    o = o || {};
    if (!node || !fromEl) return Promise.resolve();
    var a = fromEl.getBoundingClientRect(), b = node.getBoundingClientRect();
    var dx = (a.left + a.width / 2) - (b.left + b.width / 2), dy = (a.top + a.height / 2) - (b.top + b.height / 2);
    var sc = a.width && b.width ? Math.max(.4, Math.min(1.6, a.width / b.width)) : 1;
    node.style.transition = 'none';
    node.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ') rotate(' + (o.rot || 0) + 'deg)';
    node.style.zIndex = 30;
    return new Promise(function (res) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          node.style.transition = 'transform ' + (o.ms || 380) + 'ms cubic-bezier(.2,.8,.25,1)';
          node.style.transform = o.endRot ? 'rotate(' + o.endRot + 'deg)' : '';
          setTimeout(function () { node.style.zIndex = ''; res(); }, (o.ms || 380) + 20);
        });
      });
    });
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ── Table layout CSS ──────────────────────────────────────────────────────
  var css = document.createElement('style');
  css.textContent = [
    // Felt table inside a wooden rim; fills the space between bar and hand
    '.ctable{position:relative;border-radius:28px;padding:9px;margin:0 0 10px;}',
    '.ctable .felt-in{position:relative;border-radius:21px;min-height:300px;height:clamp(300px,52dvh,460px);overflow:hidden;}',
    // Seats: N (top), W (left), E (right), S (bottom) around the felt
    '.cseat{position:absolute;z-index:3;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:76px;}',
    '.cseat.n{top:8px;left:50%;transform:translateX(-50%);}',
    '.cseat.w{left:6px;top:46%;transform:translateY(-50%);}',
    '.cseat.e{right:6px;top:46%;transform:translateY(-50%);}',
    '.cseat.s{bottom:8px;left:50%;transform:translateX(-50%);}',
    '.cseat .tag{display:flex;align-items:center;gap:6px;padding:4px 10px 4px 4px;border-radius:999px;background:rgba(10,20,15,.55);color:#fff;font-weight:800;font-size:.82rem;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.25);transition:box-shadow .2s, transform .3s var(--spring);}',
    '.cseat .tag .avatar{width:26px;height:26px;font-size:.75rem;}',
    '.cseat .tag .avatar .ico{width:60%;height:60%;}',
    '.cseat.turn .tag{box-shadow:0 0 0 3px var(--yellow), 0 0 18px rgba(255,200,61,.55);transform:scale(1.06);}',
    '.cseat .info{display:flex;gap:4px;}',
    '.cseat .chip-s{padding:1px 8px;border-radius:999px;background:rgba(255,255,255,.88);color:#1d1b2e;font-size:.72rem;font-weight:900;font-variant-numeric:tabular-nums;}',
    '.cseat .chip-s.hot{background:var(--yellow);}',
    '.cseat .backs{display:flex;--cw:22px;}',
    '.cseat .backs .pcard+.pcard{margin-left:-15px;}',
    '.cseat .say{position:absolute;top:100%;margin-top:4px;padding:5px 10px;border-radius:12px;background:#fff;color:#1d1b2e;font-weight:900;font-size:.8rem;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,.3);animation:pop .35s var(--spring);z-index:5;}',
    '.cseat.s .say{top:auto;bottom:100%;margin:0 0 4px;}',
    // Trick area: cards land toward the player who played them
    '.ctrick{position:absolute;left:50%;top:47%;width:0;height:0;z-index:2;}',
    '.ctrick .pcard{--cw:clamp(50px,13vw,66px);position:absolute;left:0;top:0;}',
    '.ctrick .pcard.p-s{transform:translate(-50%,-12%) rotate(3deg);}',
    '.ctrick .pcard.p-n{transform:translate(-50%,-88%) rotate(-4deg);}',
    '.ctrick .pcard.p-w{transform:translate(-112%,-50%) rotate(-8deg);}',
    '.ctrick .pcard.p-e{transform:translate(12%,-50%) rotate(7deg);}',
    '.ctrick .pcard.win{box-shadow:0 0 0 3px var(--yellow), 0 0 20px rgba(255,200,61,.7);}',
    '.cmsg{position:absolute;left:50%;bottom:24%;transform:translateX(-50%);z-index:4;padding:6px 14px;border-radius:999px;background:rgba(0,0,0,.45);color:#fff;font-weight:800;font-size:.86rem;white-space:nowrap;}',
    // Your hand along the bottom
    '.chand{position:relative;display:flex;justify-content:center;align-items:flex-end;padding:22px 8px 4px;min-height:calc(var(--cw) * 1.4 + 26px);--cw:clamp(56px,15vw,74px);}',
    '.chand > .pcard + .pcard{margin-left:var(--overlap,-24px);}',
    '.chand .pcard.play{box-shadow:0 1px 0 rgba(255,255,255,.8) inset, 0 0 0 1px rgba(0,0,0,.08), 0 6px 14px rgba(0,0,0,.3);}',
    '.cbar{display:flex;gap:10px;justify-content:center;align-items:center;min-height:52px;margin:6px 0 4px;}',
    '.cbar .hint{color:var(--text-2);font-weight:800;}',
    // Sort toggle: a small pill sitting just above the hand, right-aligned
    '.csort-row{display:flex;justify-content:flex-end;align-items:center;min-height:32px;padding:0 4px;margin:0 0 -2px;position:relative;}',
    '.csort-row[hidden]{display:none;}',
    '.csort{display:inline-flex;align-items:stretch;height:32px;border-radius:999px;background:rgba(0,0,0,.26);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);}',
    '.csort button{position:relative;isolation:isolate;display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:44px;height:32px;padding:0 11px;border:0;border-radius:999px;background:none;color:var(--text-3,#8f88b0);font:inherit;font-weight:800;font-size:.74rem;letter-spacing:.02em;white-space:nowrap;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:color .2s;}',
    '.csort button::before{content:"";position:absolute;inset:3px;z-index:-1;border-radius:999px;background:transparent;transition:background .2s, box-shadow .2s;}',
    '.csort button[aria-pressed="true"]{color:var(--text);}',
    '.csort button[aria-pressed="true"]::before{background:rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.1), 0 1px 3px rgba(0,0,0,.3);}',
    '.csort button:active::before{background:rgba(255,255,255,.2);}',
    '.csort button:focus-visible{outline:2px solid var(--yellow);outline-offset:-2px;}',
    '.csort .csg{display:inline-flex;align-items:center;opacity:.8;}',
    '.csort button[aria-pressed="true"] .csg{opacity:1;}',
    '.csort .csg svg{width:12px;height:12px;fill:currentColor;}',
    '.csort .csg-s{font-size:.8rem;line-height:1;letter-spacing:-.04em;}',
    '.csort .csg-s i{font-style:normal;color:#ff6b80;}',
    '.csort .csg-c{display:grid;grid-template-columns:5px 5px;gap:2px;}',
    '.csort .csg-c i{width:5px;height:5px;border-radius:50%;}',
    // Scorepad (paper)
    '.spad{border-radius:6px 6px 14px 14px;overflow:hidden;background:linear-gradient(180deg,#fffaf0,#f6eedb);color:#2a2a3a;box-shadow:0 16px 34px rgba(0,0,0,.45);}',
    '.spad-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:14px 14px 8px;border-bottom:3px double #c8102e;}',
    '.spad-h h2{font-family:var(--display);font-weight:400;font-size:1.5rem;color:#c8102e;letter-spacing:.03em;text-transform:uppercase;}',
    '.spad-h small{font-family:var(--hand);font-size:1.05rem;color:#6a6a80;}',
    '.spad table{width:100%;border-collapse:collapse;table-layout:fixed;}',
    '.spad th,.spad td{height:42px;border-bottom:1px solid rgba(60,80,160,.16);text-align:center;padding:0 2px;}',
    '.spad thead th{font-family:var(--hand);font-weight:400;font-size:1.15rem;border-bottom:2px solid rgba(60,80,160,.3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.spad th.rn{width:44px;font-family:var(--font);font-size:.72rem;font-weight:900;color:#c8102e;letter-spacing:.06em;}',
    '.spad td{font-family:var(--hand);font-size:1.4rem;color:var(--ink);border-left:1px solid rgba(200,16,46,.2);}',
    '.spad td small{display:block;font-size:.8rem;line-height:1;color:#7a7a90;margin-top:-4px;}',
    '.spad td.neg{color:#c8102e;}',
    '.spad tbody tr{cursor:pointer;}',
    '.spad tbody tr:active{background:rgba(255,220,60,.2);}',
    '.spad tbody tr.just td{animation:write .5s ease-out;}',
    '@keyframes write{from{clip-path:inset(0 100% 0 0);}to{clip-path:inset(0 0 0 0);}}',
    '.spad tfoot td,.spad tfoot th{height:52px;border-top:2px solid #c8102e;background:rgba(200,16,46,.05);}',
    '.spad tfoot td{font-size:1.8rem;}',
    '.spad tfoot td.lead{background:rgba(255,220,60,.35);}',
    '.spad .goal{padding:8px 14px;font-family:var(--hand);font-size:1.05rem;color:#6a6a80;text-align:center;}',
    '.spad-empty{padding:26px 16px;text-align:center;font-family:var(--hand);font-size:1.25rem;color:#8a8796;}',
    '.spad-acts{display:flex;gap:10px;margin-top:14px;}',
    '.spad-acts .btn:first-child{flex:1;}',
    // Tablets: a bigger score sheet
    '@media (min-width:700px){.spad th,.spad td{height:52px;}.spad td{font-size:1.7rem;}.spad thead th{font-size:1.35rem;}.spad th.rn{width:56px;font-size:.85rem;}.spad tfoot td,.spad tfoot th{height:64px;}.spad tfoot td{font-size:2.2rem;}.spad-h h2{font-size:1.9rem;}.spad-h small,.spad .goal{font-size:1.25rem;}}',
    // Round entry form
    '.rform{display:flex;flex-direction:column;gap:10px;}',
    '.rrow{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--r);background:rgba(255,255,255,.06);}',
    '.rrow .nm{flex:1;min-width:0;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.rrow .num{width:84px;text-align:center;font-size:1.3rem;font-weight:900;min-height:46px;padding:0 6px;}',
    '.rrow .pm{display:flex;gap:4px;}',
    '.rrow .pm button{width:40px;height:40px;border:0;border-radius:12px;background:var(--surface-3);color:var(--text);font-weight:900;font-size:1.1rem;}',
    '.rrow .pm button:active{transform:scale(.9);}',
    '.rnote{color:var(--text-3);font-weight:700;font-size:.85rem;text-align:center;}',
    '.rnote.bad{color:var(--red);}'
  ].join('\n');
  document.head.appendChild(css);

  return { RANKS: RANKS, SUITS: SUITS, GLYPH: GLYPH, deck: deck, shuffle: shuffle, sort: sort, sortBy: sortBy, el: el, label: label, fan: fan, fly: fly, flip: flip, wait: wait, rankIndex: rankIndex, sortToggle: sortToggle, sortMode: sortMode };
})();

// ═══════════════════════════════════════════════════════════════════════════
// Scorepad: a paper score sheet for playing a real card game at the table.
//
// Scorepad(host, {
//   key:      history key (e.g. 'ht'), also used for the saved-state key
//   title:    heading on the pad (defaults to the game name)
//   sides:    [{name}]  players or teams, in seat order
//   target:   number    game ends when someone reaches it (optional)
//   lowWins:  bool      lowest total wins (Hearts, Five Crowns, Phase 10 ties)
//   rounds:   number    fixed number of rounds (Five Crowns = 11) (optional)
//   goal:     text      shown under the table, e.g. "First to 500"
//   isOver(totals, rounds) -> bool    custom end rule (optional)
//   winner(totals, rounds) -> index   custom winner rule (optional)
//   form(ctx)  builds the round-entry UI. ctx = {sides, round, totals, prev,
//              number(i, opts) -> input row, done(scores, extra), node}
//              extra = {label, detail:[...per side text], highlights:[..], data:{any}}
//   onChange(state) called after any round is added, fixed or deleted
//              Omit form for a plain "points per player" entry.
//   onEnd(result)  optional hook after the game ends
//   mode:     text recorded in history (e.g. 'Scorekeeper')
// })
// Returns {state, render, addRound, undo, reset}.
// ═══════════════════════════════════════════════════════════════════════════
function Scorepad(host, o) {
  'use strict';
  var el = Kit.el, SAVE = 'pad_' + o.key;
  var S = null;
  try { S = JSON.parse(localStorage.getItem(SAVE)); } catch (e) {}
  if (!S || !S.sides || S.sides.length !== o.sides.length || S.sides.some(function (s, i) { return s.name !== o.sides[i].name; })) {
    S = { sides: o.sides.map(function (s) { return { name: s.name }; }), rounds: [], over: false, highlights: [], started: Date.now() };
  }
  function save() { try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {} if (!S.over) Kit.resume.set(S.rounds.length ? 'Round ' + (S.rounds.length + 1) : 'Ready', { keys: [SAVE] }); }
  function clear() { try { localStorage.removeItem(SAVE); } catch (e) {} Kit.resume.clear(); }
  function totals() {
    var t = S.sides.map(function () { return 0; });
    S.rounds.forEach(function (r) { r.scores.forEach(function (v, i) { t[i] += Number(v) || 0; }); });
    return t;
  }
  function leader(t) {
    var best = 0;
    t.forEach(function (v, i) { if (o.lowWins ? v < t[best] : v > t[best]) best = i; });
    return t.filter(function (v) { return v === t[best]; }).length > 1 ? -1 : best;
  }
  function isOver(t) {
    if (o.isOver) return o.isOver(t, S.rounds);
    if (o.rounds && S.rounds.length >= o.rounds) return true;
    if (o.target != null) return t.some(function (v) { return o.lowWins ? v >= o.target : v >= o.target; });
    return false;
  }

  function render(justAdded) {
    host.innerHTML = '';
    var t = totals(), lead = S.rounds.length ? (o.winner ? o.winner(t, S.rounds) : leader(t)) : -1;
    var pad = el('div', { class: 'spad' });
    pad.appendChild(el('div', { class: 'spad-h' }, [el('h2', { text: o.title || (Kit.game() ? Kit.game().name : 'Score') }), el('small', { text: S.rounds.length ? 'tap a round to fix it' : '' })]));
    var tbl = el('table'), hr = el('tr', null, [el('th', { class: 'rn' })]);
    S.sides.forEach(function (s, i) { hr.appendChild(el('th', { text: s.name, style: { color: Kit.color(i) } })); });
    tbl.appendChild(el('thead', null, [hr]));
    var tb = el('tbody');
    S.rounds.forEach(function (r, ri) {
      var tr = el('tr', { class: justAdded && ri === S.rounds.length - 1 ? 'just' : '' }, [el('th', { class: 'rn', text: r.label || String(ri + 1) })]);
      r.scores.forEach(function (v, i) {
        var td = el('td', { class: Number(v) < 0 ? 'neg' : '', text: v == null ? '–' : String(v) });
        if (r.detail && r.detail[i]) td.appendChild(el('small', { text: r.detail[i] }));
        tr.appendChild(td);
      });
      tr.addEventListener('click', function () { editRound(ri); });
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    if (S.rounds.length) {
      var fr = el('tr', null, [el('th', { class: 'rn', text: 'TOTAL' })]);
      t.forEach(function (v, i) { fr.appendChild(el('td', { class: (i === lead ? 'lead' : '') + (v < 0 ? ' neg' : ''), text: String(v) })); });
      tbl.appendChild(el('tfoot', null, [fr]));
    }
    pad.appendChild(tbl);
    if (!S.rounds.length) pad.appendChild(el('div', { class: 'spad-empty', text: 'Play a hand at the table, then tap Add round.' }));
    if (o.goal) pad.appendChild(el('div', { class: 'goal', text: o.goal }));
    host.appendChild(pad);
    var acts = el('div', { class: 'spad-acts' });
    if (!S.over) acts.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-lg', html: Kit.icon('plus') + '<span>Add round ' + (S.rounds.length + 1) + '</span>', onclick: function () { addRound(); } }));
    else acts.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-lg', html: Kit.icon('sparkle') + '<span>New game</span>', onclick: function () { reset(); } }));
    host.appendChild(acts);
  }

  function openForm(prev, onDone, title) {
    var node = el('div', { class: 'rform' }), s;
    var ctx = {
      sides: S.sides, round: prev ? prev.index + 1 : S.rounds.length + 1, totals: totals(), prev: prev ? prev.round : null, node: node,
      number: function (i, opt) {
        opt = opt || {};
        var start = opt.value != null ? opt.value : (prev && prev.round.scores[i] != null ? prev.round.scores[i] : '');
        var inp = el('input', { class: 'input num', type: 'text', inputmode: opt.neg === false ? 'numeric' : 'text', value: String(start), placeholder: opt.placeholder || '0', 'aria-label': (opt.label || S.sides[i].name) + ' points' });
        inp.addEventListener('focus', function () { inp.select(); });
        var step = opt.step || 1;
        function bump(d) { var v = parseInt(inp.value, 10) || 0; v += d; if (opt.min != null) v = Math.max(opt.min, v); if (opt.max != null) v = Math.min(opt.max, v); inp.value = String(v); inp.dispatchEvent(new Event('input')); Kit.sfx('tick'); }
        var row = el('div', { class: 'rrow' }, [
          el('span', { class: 'avatar sm', style: { '--c': Kit.color(i) }, text: (S.sides[i].name || '?').charAt(0).toUpperCase() }),
          el('span', { class: 'nm', text: opt.label || S.sides[i].name }),
          el('span', { class: 'pm' }, [el('button', { type: 'button', text: '−', onclick: function () { bump(-step); } })]),
          inp,
          el('span', { class: 'pm' }, [el('button', { type: 'button', text: '+', onclick: function () { bump(step); } })])
        ]);
        row.input = inp;
        row.value = function () { var v = String(inp.value).trim(); return v === '' ? 0 : parseInt(v.replace(/[^0-9-]/g, ''), 10) || 0; };
        return row;
      },
      done: function (scores, extra) { s.close(); onDone(scores, extra || {}); },
      close: function () { s.close(); }
    };
    if (o.form) o.form(ctx);
    else {
      var rows = S.sides.map(function (sd, i) { var r = ctx.number(i); node.appendChild(r); return r; });
      node.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-block', text: prev ? 'Save changes' : 'Add round', onclick: function () { ctx.done(rows.map(function (r) { return r.value(); })); } }));
    }
    s = Kit.sheet({ title: title, node: node });
  }

  function addRound() {
    openForm(null, function (scores, extra) {
      Kit.resume.set('Round ' + (S.rounds.length + 2), { keys: [SAVE] });
      S.rounds.push({ scores: scores, label: extra.label || '', detail: extra.detail || null, highlights: extra.highlights || [], data: extra.data || null });
      if (extra.callout) Kit.callout(extra.callout);
      Kit.sfx('good'); Kit.haptic('success');
      afterChange(true);
    }, 'Round ' + (S.rounds.length + 1));
  }
  function editRound(ri) {
    var r = S.rounds[ri];
    Kit.sheet({
      title: 'Round ' + (ri + 1), html: '<p class="muted">' + S.sides.map(function (s, i) { return Kit.esc(s.name) + ': ' + r.scores[i]; }).join(' · ') + '</p>',
      actions: [
        { label: 'Fix this round', primary: true, onClick: function () {
          openForm({ index: ri, round: r }, function (scores, extra) {
            S.rounds[ri] = { scores: scores, label: extra.label || r.label || '', detail: extra.detail || null, highlights: extra.highlights || [], data: extra.data || null };
            S.over = false; afterChange();
          }, 'Fix round ' + (ri + 1));
        } },
        { label: 'Delete this round', danger: true, onClick: function () { S.rounds.splice(ri, 1); S.over = false; Kit.sfx('whoosh'); afterChange(); } },
        { label: 'Cancel', cls: 'btn-ghost' }
      ]
    });
  }
  function afterChange(added) {
    if (o.onChange) try { o.onChange(S); } catch (e) {}
    var t = totals();
    if (!S.over && isOver(t)) { S.over = true; save(); render(added); finish(t); return; }
    save(); render(added);
  }
  function finish(t) {
    var w = o.winner ? o.winner(t, S.rounds) : leader(t);
    var order = S.sides.map(function (s, i) { return { name: s.name, score: t[i], color: Kit.color(i) }; })
      .sort(function (a, b) { return o.lowWins ? a.score - b.score : b.score - a.score; });
    Kit.record(o.key, {
      started: S.started, mode: o.mode || 'Scorekeeper', lowWins: !!o.lowWins,
      players: S.sides.map(function (s, i) { return { name: s.name, score: t[i] }; }),
      winner: w >= 0 ? S.sides[w].name : null,
      rounds: { labels: S.rounds.map(function (r, i) { return r.label || String(i + 1); }), scores: S.rounds.map(function (r) { return r.scores; }) },
      // Highlights live on each round, so fixing or deleting a round updates them
      highlights: (S.highlights || []).concat([].concat.apply([], S.rounds.map(function (r) { return r.highlights || []; }))).concat([S.rounds.filter(function (r) { return !/^bonus/i.test(r.label || ''); }).length + ' rounds played'])
    });
    clear();
    setTimeout(function () {
      Kit.win({
        title: w >= 0 ? S.sides[w].name + (/ & | and /.test(S.sides[w].name) ? ' win!' : ' wins!') : "It's a tie!", sub: 'Final scores', rank: order,
        again: function () { reset(); }, againLabel: 'New game with same players',
        extra: [{ label: 'View score sheet', onClick: function () {} }]
      });
      if (o.onEnd) o.onEnd({ totals: t, winner: w });
    }, 450);
  }
  function undo() {
    if (!S.rounds.length) return Kit.toast('Nothing to undo');
    S.rounds.pop(); S.over = false; Kit.sfx('whoosh'); Kit.toast('Last round removed'); save(); render();
  }
  function reset() {
    S = { sides: o.sides.map(function (s) { return { name: s.name }; }), rounds: [], over: false, highlights: [], started: Date.now() };
    save(); render();
  }
  render(); save();
  return { state: function () { return S; }, render: render, addRound: addRound, undo: undo, reset: reset, totals: totals, clear: clear };
}
