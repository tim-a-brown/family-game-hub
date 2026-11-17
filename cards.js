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
//   A large window (a laptop, any shape of window; see "The desk" below):
//   Cards.desk(stage)                    -> {l, r, on()}  the table takes the window, with a panel at each side
//   Cards.pad(host, {cols, rows, live, total, meter})   the ruled score sheet for the left panel
//   Cards.lastTrick(host, {plays, cls, fresh})          the trick just taken, on a small felt, for the right panel
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
    '.cseat .tag{position:relative;display:flex;align-items:center;gap:6px;padding:4px 10px 4px 4px;border-radius:13px;background:var(--plate-bg);-webkit-backdrop-filter:blur(10px) saturate(.7);backdrop-filter:blur(10px) saturate(.7);color:#fff;font-family:var(--type-sign,var(--font));font-weight:650;font-size:.82rem;white-space:nowrap;box-shadow:var(--plate-line),0 2px 8px rgba(0,0,0,.3);transition:box-shadow .2s, transform .3s var(--spring);}',
    '.cseat .tag .avatar{width:26px;height:26px;font-size:.75rem;}',
    '.cseat .tag .avatar .ico{width:60%;height:60%;}',
    '.cseat.turn .tag{box-shadow:inset 0 0 0 1px rgba(255,211,77,.7),0 0 18px var(--litg),0 2px 8px rgba(0,0,0,.3);transform:scale(1.06);}',
    '.cseat.turn .tag::before{content:"";position:absolute;left:9px;right:9px;top:-1px;height:2px;border-radius:2px;background:var(--lit);box-shadow:0 0 8px 1px var(--litg);}',
    '.cseat .info{display:flex;gap:4px;}',
    '.cseat .chip-s{padding:2px 8px;border-radius:8px;background:var(--plate-bg);color:#fff;font-family:var(--type-sign,var(--font));font-size:.74rem;font-weight:700;font-variant-numeric:tabular-nums;box-shadow:var(--plate-line);}',
    '.cseat .chip-s.hot{color:var(--lit);box-shadow:inset 0 0 0 1px rgba(255,211,77,.6),0 0 10px var(--litg);}',
    '.cseat .backs{display:flex;--cw:22px;}',
    '.cseat .backs .pcard+.pcard{margin-left:-15px;}',
    '.cseat .say{position:absolute;top:100%;margin-top:4px;padding:5px 11px;border-radius:12px;background:var(--plate-bg);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fff;font-family:var(--type-sign,var(--font));font-weight:700;font-size:.82rem;white-space:nowrap;box-shadow:var(--plate-line),0 4px 12px rgba(0,0,0,.35);animation:pop .35s var(--spring);z-index:5;}',
    '.cseat.s .say{top:auto;bottom:100%;margin:0 0 4px;}',
    // Trick area: cards land toward the player who played them
    '.ctrick{position:absolute;left:50%;top:47%;width:0;height:0;z-index:2;}',
    '.ctrick .pcard{--cw:clamp(50px,13vw,66px);position:absolute;left:0;top:0;}',
    '.ctrick .pcard.p-s{transform:translate(-50%,-12%) rotate(3deg);}',
    '.ctrick .pcard.p-n{transform:translate(-50%,-88%) rotate(-4deg);}',
    '.ctrick .pcard.p-w{transform:translate(-112%,-50%) rotate(-8deg);}',
    '.ctrick .pcard.p-e{transform:translate(12%,-50%) rotate(7deg);}',
    '.ctrick .pcard.win{box-shadow:0 0 0 3px var(--lit), 0 0 20px var(--litg);}',
    '.cmsg{position:absolute;left:50%;bottom:24%;transform:translateX(-50%);z-index:4;padding:6px 14px;border-radius:14px;background:var(--plate-bg);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:var(--plate-line);color:#fff;font-weight:700;font-size:.86rem;white-space:nowrap;}',
    // Your hand along the bottom
    '.chand{position:relative;display:flex;justify-content:center;align-items:flex-end;padding:22px 8px 4px;min-height:calc(var(--cw) * 1.4 + 26px);--cw:clamp(56px,15vw,74px);}',
    '.chand > .pcard + .pcard{margin-left:var(--overlap,-24px);}',
    '.chand .pcard.play{box-shadow:0 1px 0 rgba(255,255,255,.8) inset, 0 0 0 1px rgba(0,0,0,.08), 0 6px 14px rgba(0,0,0,.3);}',
    '.cbar{display:flex;gap:10px;justify-content:center;align-items:center;min-height:52px;margin:6px 0 4px;}',
    '.cbar .hint{color:var(--text-2);font-weight:800;}',
    // Sort toggle: a small pill sitting just above the hand, right-aligned
    '.csort-row{display:flex;justify-content:flex-end;align-items:center;min-height:32px;padding:0 4px;margin:0 0 -2px;position:relative;}',
    '.csort-row[hidden]{display:none;}',
    '.csort{display:inline-flex;align-items:stretch;height:32px;border-radius:13px;background:var(--gl);box-shadow:inset 0 0 0 1px var(--gl-line);}',
    '.csort button{position:relative;isolation:isolate;display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:44px;height:32px;padding:0 11px;border:0;border-radius:11px;background:none;color:var(--text-3,#8f88b0);font:inherit;font-weight:700;font-size:.76rem;white-space:nowrap;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:color .2s;}',
    '.csort button::before{content:"";position:absolute;inset:3px;z-index:-1;border-radius:10px;background:transparent;transition:background .2s, box-shadow .2s;}',
    '.csort button[aria-pressed="true"]{color:var(--lit-ink);}',
    '.csort button[aria-pressed="true"]::before{background:rgba(255,211,77,.14);box-shadow:inset 0 0 0 1px rgba(255,211,77,.6),0 0 12px rgba(255,190,60,.16);}',
    '.csort button:active::before{background:var(--gl-2);}',
    '.csort button:focus-visible{outline:2px solid var(--lit);outline-offset:-2px;}',
    '.csort .csg{display:inline-flex;align-items:center;opacity:.8;}',
    '.csort button[aria-pressed="true"] .csg{opacity:1;}',
    '.csort .csg svg{width:12px;height:12px;fill:currentColor;}',
    '.csort .csg-s{font-size:.8rem;line-height:1;letter-spacing:-.04em;}',
    '.csort .csg-s i{font-style:normal;color:#ff6b80;}',
    '.csort .csg-c{display:grid;grid-template-columns:5px 5px;gap:2px;}',
    '.csort .csg-c i{width:5px;height:5px;border-radius:50%;}',
    // Scorepad (paper)
    '.spad{position:relative;border-radius:22px;overflow:hidden;color:var(--text);background:linear-gradient(165deg,color-mix(in srgb,var(--h,#6c7bff) 14%,transparent),transparent 50%),var(--gl);box-shadow:inset 0 0 0 1px var(--gl-line),inset 0 1px 0 rgba(255,255,255,.12),var(--shadow);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);}',
    '.spad::before{content:"";position:absolute;left:0;right:0;top:0;height:5px;background:color-mix(in srgb,var(--h,#6c7bff) 70%,transparent);opacity:.8;}',
    '.spad-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:14px 14px 8px;border-bottom:3px double color-mix(in srgb,var(--h,#6c7bff) 55%,var(--gl-line));}',
    '.spad-h h2{font-family:var(--display);font-size:1.5rem;color:var(--text);letter-spacing:-.025em;}',
    '.spad-h small{font-family:var(--hand);font-size:1.05rem;color:var(--text-3);}',
    '.spad table{width:100%;border-collapse:collapse;table-layout:fixed;}',
    '.spad th,.spad td{height:42px;border-bottom:1px solid var(--gl-line);text-align:center;padding:0 2px;}',
    '.spad thead th{font-family:var(--hand);font-weight:400;font-size:1.15rem;color:var(--text-2);border-bottom:1px solid color-mix(in srgb,var(--text) 22%,transparent);line-height:1.05;text-wrap:balance;}',   // (a team, Player 2 & Player 4, takes two lines instead of being cut)
    '.spad th.rn{width:44px;font-family:var(--font);font-size:.74rem;font-weight:700;color:var(--text-3);}',
    '.spad td{font-family:var(--hand);font-size:1.4rem;color:var(--text);border-left:1px solid var(--gl-line);}',
    '.spad td small{display:block;font-size:.8rem;line-height:1;color:var(--text-3);margin-top:-4px;}',
    '.spad td.neg{color:var(--bad-ink);}',
    '.spad tbody tr{cursor:pointer;}',
    '.spad tbody tr:active{background:var(--gl-2);}',
    '.spad tbody tr.just td{animation:write .5s ease-out;}',
    '@keyframes write{from{clip-path:inset(0 100% 0 0);}to{clip-path:inset(0 0 0 0);}}',
    '.spad tfoot td,.spad tfoot th{height:52px;border-top:2px solid color-mix(in srgb,var(--h,#6c7bff) 55%,var(--gl-line));background:var(--gl-3);}',
    '.spad tfoot td{font-size:1.8rem;}',
    '.spad tfoot td.lead{background:color-mix(in srgb,var(--lit) 16%,transparent);color:var(--lit-ink);}',
    '.spad .goal{padding:8px 14px;font-family:var(--hand);font-size:1.05rem;color:var(--text-3);text-align:center;}',
    '.spad-empty{padding:26px 16px;text-align:center;font-family:var(--hand);font-size:1.25rem;color:var(--text-3);}',
    '.spad-acts{display:flex;gap:10px;margin-top:14px;}',
    '.spad-acts .btn-lg{flex:1;white-space:nowrap;}',
    '.spad tbody tr.open,.spad tbody tr.mods{cursor:default;background:color-mix(in srgb,var(--lit) 7%,transparent);}',
    '.spad tbody tr.open:active,.spad tbody tr.mods:active{background:color-mix(in srgb,var(--lit) 7%,transparent);}',
    '.spad tbody tr.open th.rn{color:var(--lit-ink);}',
    '.spad tr.open td{height:auto;padding:4px 2px 2px;vertical-align:top;}',
    // Open-round pieces (Scorepad.step / .tog / .eq): a sub row of taps under the open row
    '.spad tr.sub td{height:auto;padding:3px 2px 7px;vertical-align:top;border-top:0;}',
    '.spad tr.sub th.rn{vertical-align:top;padding-top:8px;font-size:.62rem;color:var(--text-3);line-height:1.1;white-space:normal;}',
    '.spad tr.open th.rn small{display:block;font-size:.62rem;color:var(--text-3);margin-top:2px;}',
    '.spad [hidden]{display:none !important;}',
    '.sp-step{display:flex;flex-direction:column;align-items:stretch;}',
    '.sp-step > button{height:28px;padding:0;border:1px solid var(--gl-line);background:var(--gl-2);color:var(--text);font-family:var(--font);font-weight:800;font-size:1rem;line-height:1;transition:transform .12s var(--spring),background .12s;}',
    '.sp-step > button:first-child{border-radius:8px 8px 0 0;border-bottom:0;}',
    '.sp-step > button:last-child{border-radius:0 0 8px 8px;border-top:0;}',
    '.sp-step > button:active{background:color-mix(in srgb,var(--lit) 22%,transparent);}',
    '.sp-step > button:disabled{opacity:.3;}',
    '.spad td .sp-step input.cell{height:38px;border-left:1px solid var(--gl-line);border-right:1px solid var(--gl-line);background:var(--gl);}',
    '.sp-col{display:flex;flex-direction:column;gap:3px;}',
    '.sp-tg{display:flex;align-items:center;justify-content:center;gap:3px;width:100%;min-height:30px;padding:2px 1px;border:1px solid var(--gl-line);border-radius:9px;background:var(--gl-2);color:var(--text-2);font-family:var(--font);font-weight:750;font-size:.72rem;line-height:1.05;overflow:hidden;transition:transform .12s var(--spring),background .12s;}',
    '.sp-tg:active{transform:scale(.94);}',
    '.sp-tg:disabled{opacity:.3;}',
    '.sp-tg.on{background:color-mix(in srgb,var(--lit) 16%,transparent);border-color:color-mix(in srgb,var(--lit) 65%,transparent);color:var(--lit-ink);}',
    '.sp-tg.good.on{background:#1f8a4c;border-color:#17703c;color:#fff;}',
    '.sp-tg.bad.on{background:#d23a4c;border-color:#d23a4c;color:#fff;}',
    '.sp-tg.gold.on{background:#ffc42e;border-color:#e0a800;color:#2b1a00;}',
    '.sp-tg.blue.on{background:#5ac8fa;border-color:#1a88c4;color:#06283d;}',
    '.sp-tg .ico{width:13px;height:13px;flex:none;}',
    '.spad td .eq{display:block;font-family:var(--hand);font-size:.86rem;line-height:1;color:var(--text-3);margin:3px 0 1px;min-height:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.spad td .eq.bad{color:var(--bad-ink);}',
    '.spad td .eq.good{color:var(--green);}',
    '.spad td .sum{display:block;height:40px;line-height:40px;font-size:1.4rem;color:var(--text);border-bottom:2px dashed color-mix(in srgb,var(--text) 28%,transparent);}',
    '.spad td .sum.neg{color:var(--bad-ink);}',
    // Five or more columns: names wrap instead of cutting off
    '.spad.many thead th{white-space:normal;line-height:1;height:auto;padding:7px 1px 6px;font-size:1rem;overflow-wrap:anywhere;}',
    '.spad.many td .eq{font-size:.78rem;}',
    '.spad.many .sp-tg{font-size:.64rem;}',
    '.spad td input.cell{display:block;width:100%;height:40px;margin:0;padding:0 2px;border:0;border-bottom:2px dashed color-mix(in srgb,var(--text) 28%,transparent);border-radius:0;background:transparent;font:inherit;font-size:1.35rem;color:var(--text);text-align:center;outline:0;-webkit-appearance:none;}',
    '.spad td input.cell:focus{border-bottom-color:var(--lit);background:var(--gl-2);}',
    '.spad td input.cell:disabled{opacity:.3;}',
    '.spad td input.cell::placeholder{color:color-mix(in srgb,var(--text-3) 60%,transparent);}',
    '.spad tfoot td.pend{color:var(--text-3);}',
    '.spad-acts{flex-wrap:wrap;align-items:center;}',
    '.spad-acts .btn-primary{flex:1;}',
    // The line beside the lock button: what is missing, what looks wrong, or that it adds up
    '.spad-note{flex:0 0 100%;min-height:1.25em;margin:-4px 0 -2px;text-align:center;font-weight:800;font-size:.88rem;line-height:1.25;color:var(--text-3);}',
    '.spad-note.bad{color:var(--red);}',
    '.spad-note.ok{color:var(--text-2);}',
    // Fixing a past round right on the sheet: that row opens, the others fade back
    '.spad tbody tr.dim{cursor:default;}',
    '.spad tbody tr.dim > *{opacity:.38;}',
    '.spad tbody tr.dim:active{background:none;}',
    '.spad tbody tr.fixing,.spad tbody tr.fixing:active{background:color-mix(in srgb,var(--lit) 14%,transparent);}',
    '.spad tbody tr.fixing th.rn{color:var(--lit-ink);}',
    '.spad-acts.fixing{position:sticky;bottom:0;z-index:4;margin:14px -16px 0;padding:10px 16px max(calc(var(--safe-b) + 10px), 18px);background:linear-gradient(rgba(0,0,0,0),var(--bg) 16px);}',
    // Phones: Save across the top, Delete and Cancel side by side under it; wider screens: one row
    '.spad-acts.fixing .btn-primary{flex:1 1 100%;}',
    '.spad-acts.fixing .spad-del,.spad-acts.fixing .spad-cancel{flex:1 1 0;min-height:48px;font-size:1rem;}',
    '@media (min-width:560px){.spad-acts.fixing .btn-primary{flex:1 1 0;}.spad-acts.fixing .spad-del,.spad-acts.fixing .spad-cancel{flex:0 0 auto;min-height:60px;padding:0 18px;font-size:1.1rem;}}',
    '.spad-acts .spad-del.armed{--b:var(--red);--b-ink:#fff;--b-lip:#a8202e;color:#fff;}',
    // Short landscape screens below 700 wide: keep Add round reachable without scrolling for every entry
    '@media (orientation:landscape) and (max-height:820px) and (max-width:699px){.spad-acts{position:sticky;bottom:0;z-index:4;margin:14px -16px 0;padding:10px 16px max(calc(var(--safe-b) + 10px), 18px);background:linear-gradient(rgba(0,0,0,0),var(--bg) 16px);}}',
    // Sideways from 700 wide (a phone on its side, an iPad): the score sheet at the left and what you do with it (the
    // note and the buttons) in a column of its own at the right, held in view while the sheet scrolls, so it never lies
    // over a row being written in
    '@media (orientation:landscape) and (min-width:700px) and (max-height:820px){' +
      '.stage:has(.spad-acts){max-width:min(1180px,100%);padding-right:18px;display:grid;grid-template-columns:minmax(0,1fr) clamp(200px,26vw,280px);column-gap:18px;align-items:start;}' +
      '.stage:has(.spad-acts) > *{grid-column:1;}' +
      '.stage > div:has(> .spad-acts){display:contents;}' +
      '.stage > div:has(> .spad-acts) > :not(.spad-acts){grid-column:1;}' +
      '.stage .spad-acts,.stage .spad-acts.fixing{grid-column:2;grid-row:1 / span 6;position:sticky;top:calc(var(--safe-t) + 66px);bottom:auto;margin:0;padding:0 0 calc(var(--safe-b) + 18px);background:none;flex-direction:column;flex-wrap:nowrap;align-items:stretch;gap:10px;}' +
      '.stage .spad-acts .spad-note{flex:none;margin:0;text-align:left;text-wrap:balance;}' +
      '.stage .spad-acts .btn,.stage .spad-acts.fixing .btn-primary,.stage .spad-acts.fixing .spad-del,.stage .spad-acts.fixing .spad-cancel{flex:none;width:100%;min-height:56px;white-space:normal;}' +
    '}',
    // Tablets: a bigger score sheet
    '@media (min-width:700px){.spad th,.spad td{height:52px;}.spad td{font-size:1.7rem;}.spad thead th{font-size:1.35rem;}.spad th.rn{width:56px;font-size:.85rem;}.spad tfoot td,.spad tfoot th{height:64px;}.spad tfoot td{font-size:2.2rem;}.spad-h h2{font-size:1.9rem;}.spad-h small,.spad .goal{font-size:1.25rem;}}',
    // Round entry form
    '.rform{display:flex;flex-direction:column;gap:10px;}',
    '.rrow{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--r);background:var(--gl);box-shadow:inset 0 0 0 1px var(--gl-line);}',
    '.rrow .nm{flex:1;min-width:0;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.rrow .num{width:84px;text-align:center;font-size:1.3rem;font-weight:900;min-height:46px;padding:0 6px;}',
    '.rrow .pm{display:flex;gap:4px;}',
    '.rrow .pm button{width:40px;height:40px;border:0;border-radius:13px;background:var(--gl-2);box-shadow:inset 0 0 0 1px var(--gl-line);color:var(--text);font-weight:800;font-size:1.1rem;}',
    '.rrow .pm button:active{transform:scale(.9);}',
    '.rnote{color:var(--text-3);font-weight:700;font-size:.85rem;text-align:center;}',
    '.rnote.bad{color:var(--red);}',
    // ── The desk (Cards.desk): the panels beside a table in a large window. They are in the page at every size and
    // shown only by the desk's own layouts, so a phone or a tablet never draws them.
    '.cdk-panel{display:none;position:relative;flex-direction:column;border-radius:22px;overflow:hidden;color:var(--text);background:linear-gradient(165deg,color-mix(in srgb,var(--h,#6c7bff) 13%,transparent),transparent 46%),var(--gl);box-shadow:inset 0 0 0 1px var(--gl-line),inset 0 1px 0 rgba(255,255,255,.1),var(--shadow-sm);container:cdkp / size;}',
    '.cdk-panel::before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:color-mix(in srgb,var(--h,#6c7bff) 70%,transparent);opacity:.8;}',
    // (what is written on a panel grows a little with the panel, as a sheet on the wall would; never past 1.3rem)
    '.cdk-in{flex:1 1 0;min-height:0;min-width:0;display:flex;flex-direction:column;font-size:clamp(.92rem,min(4.4cqw,3.4cqh),1.3rem);}',
    '.cdk-h{flex:none;display:flex;align-items:baseline;justify-content:space-between;gap:.6em;padding:1em 1em .55em;}',
    '.cdk-h h2{margin:0;font-family:var(--display);font-size:1.28em;letter-spacing:-.02em;line-height:1.1;color:var(--text);}',
    '.cdk-h small{font-size:.8em;font-weight:650;color:var(--text-3);white-space:nowrap;font-variant-numeric:tabular-nums;}',
    '.cdk-lbl{flex:none;display:flex;align-items:baseline;justify-content:space-between;gap:.6em;padding:.7em 1.25em .35em;font-size:.8em;font-weight:650;color:var(--text-3);font-variant-numeric:tabular-nums;}',
    // The pad (Cards.pad): a ruled score sheet, a column a player, a row a hand, the totals along its foot
    '.cdk-pad{position:relative;flex:1 1 0;min-height:0;display:flex;flex-direction:column;--n:4;--mi:-1;--rh:2.3em;--lc:2.7em;--px:.55em;}',
    '.cdk-pad .pr{position:relative;display:grid;grid-template-columns:var(--lc) repeat(var(--n),minmax(0,1fr));align-items:center;padding:0 var(--px);}',
    '.cdk-pad .meb{position:absolute;top:0;bottom:0;left:calc(var(--px) + var(--lc) + (100% - var(--px) * 2 - var(--lc)) * var(--mi) / var(--n));width:calc((100% - var(--px) * 2 - var(--lc)) / var(--n));pointer-events:none;background:linear-gradient(180deg,color-mix(in srgb,var(--lit) 11%,transparent),color-mix(in srgb,var(--lit) 5%,transparent));box-shadow:inset 1px 0 0 color-mix(in srgb,var(--lit) 22%,transparent),inset -1px 0 0 color-mix(in srgb,var(--lit) 22%,transparent);}',
    '.cdk-pad .ph{flex:none;align-items:end;padding-bottom:.5em;border-bottom:3px double color-mix(in srgb,var(--h,#6c7bff) 55%,var(--gl-line));}',
    '.cdk-pad .ph .pc{display:flex;flex-direction:column;align-items:center;gap:.28em;min-width:0;padding:0 1px;font-size:.8em;font-weight:700;line-height:1.05;text-align:center;overflow-wrap:anywhere;color:var(--text-2);}',
    '.cdk-pad .ph .pc .avatar{width:2em;height:2em;font-size:.95em;}',
    '.cdk-pad .ph .pc.me{color:var(--lit-ink);}',
    '.cdk-pad .pb{flex:1 1 0;min-height:var(--rh);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;background:repeating-linear-gradient(180deg,transparent 0 calc(var(--rh) - 1px),var(--gl-line) calc(var(--rh) - 1px) var(--rh)) local;}',
    '.cdk-pad .pb::-webkit-scrollbar{display:none;}',
    '.cdk-pad .pb .pr{height:var(--rh);}',
    '.cdk-pad .rl{font-size:.74em;font-weight:700;color:var(--text-3);text-align:center;font-variant-numeric:tabular-nums;}',
    '.cdk-pad .cv{position:relative;text-align:center;font-family:var(--hand);font-size:1.42em;line-height:1;color:var(--text);white-space:nowrap;}',
    '.cdk-pad .cv.z{color:var(--text-3);}',
    '.cdk-pad .cv.hot{color:var(--lit-ink);}',
    // (a mark beside a number: who took the Queen, who shot the moon)
    '.cdk-pad .cv .mk{display:inline-flex;align-items:center;margin-left:.22em;vertical-align:.16em;font-family:var(--font);font-style:normal;font-weight:800;font-size:.5em;line-height:1;color:var(--text-2);}',
    '.cdk-pad .cv .mk .ico{width:1.45em;height:1.45em;color:var(--lit-ink);}',
    '.cdk-pad .pr.live{background:color-mix(in srgb,var(--lit) 9%,transparent);box-shadow:inset 0 1px 0 color-mix(in srgb,var(--lit) 50%,transparent),inset 0 -1px 0 color-mix(in srgb,var(--lit) 50%,transparent);}',
    '.cdk-pad .pr.live .rl{color:var(--lit-ink);}',
    '.cdk-pad .pr.just .cv{animation:write .5s ease-out;}',
    '.cdk-pad .pf{flex:none;padding-top:.3em;border-top:2px solid color-mix(in srgb,var(--h,#6c7bff) 55%,var(--gl-line));background:var(--gl-3);}',
    '.cdk-pad .pf .cv{font-size:1.95em;}',
    '.cdk-pad .pf .cv.lead{color:var(--lit-ink);}',
    '.cdk-pad .pm{flex:none;padding-bottom:.6em;background:var(--gl-3);}',
    '.cdk-pad .pm .rl{font-size:.68em;}',
    '.cdk-pad .mt{display:block;height:.3em;margin:.25em 14% 0;border-radius:1em;background:var(--gl-2);overflow:hidden;}',
    '.cdk-pad .mt b{display:block;height:100%;min-width:0;border-radius:1em;background:var(--c);transition:width .5s var(--ease,ease);}',
    '.cdk-pad .mt.warn b{background:var(--bad-ink);}',
    '@container cdkp (max-height:430px){.cdk-goal{display:none;}.cdk-pad .pm{padding-bottom:.75em;}}',
    '.cdk-goal{flex:none;padding:.6em 1.2em .85em;font-size:.78em;font-weight:600;line-height:1.3;color:var(--text-3);text-align:center;text-wrap:balance;}',
    // The last trick (Cards.lastTrick): its cards lie on a small felt the way they lay on the table
    '.cdk-lt{position:relative;flex:1 1 0;min-height:7.6em;margin:0 1em;border-radius:14px;overflow:hidden;container-type:size;}',
    '.cdk-lt .ctrick{top:50%;}',
    '.cdk-lt .ctrick .pcard{box-shadow:0 0 0 1px rgba(0,0,0,.08),0 3px 8px rgba(0,0,0,.35);}',
    '.cdk-lt.new .ctrick .pcard{animation:cdkIn .32s var(--spring,ease-out) both;}',
    '@keyframes cdkIn{from{opacity:0;scale:.8;}}'
  ].join('\n');
  document.head.appendChild(css);

  // ── The desk: a card table in a large window (a laptop, any shape of window) ─────────────────────────────────
  // Cards.desk(stage) -> {l, r, on()}
  //   A table page lays itself out for a phone and a tablet. A window larger than those gets the desk's layouts
  //   instead: the felt takes the room, the cards and the pieces on the felt step up with it, and two panels stand
  //   beside the table: l at the left for what there is to look at (the score sheet), r at the right for the hand in
  //   play (the last trick), over the bar and the sort toggle. The stage needs an id and the usual children
  //   (.ctable > .felt-in, .csort-row, .chand, .cbar). l and r are made once: append them to the stage after the
  //   bar each time the stage is rebuilt, fill them with a <div class="cdk-in">, or leave either out. on() is true
  //   while a desk layout is showing (so nothing is drawn for a phone). Nothing here changes a window of 1024 by
  //   768 or smaller, upright or sideways, beyond closing two gaps no device has (sideways 520 to 600 tall, and
  //   sideways under 1000 wide).
  //     wide (1200 or more across, under 1.85 times as wide as tall, or under 2.1 times when 700 or more tall):
  //                                                                l | table | r over the bar; the hand below
  //     strip (wider than that):                                   l | table | r, the bar and the hand at the right
  //     square (900 to 1199 across, upright but nearly square):    l over r | table; the hand and the bar below
  //     tall (1200 or more high, well taller than wide):           the table, the hand, the bar; l and r below
  //   A sheet of 5 or 6 columns: set --cdk-lmin on the stage (the least width l needs).
  var DESK = {
    wide: '(min-width:1200px) and (min-aspect-ratio:77/100) and (max-aspect-ratio:1849/1000), (min-width:1200px) and (min-aspect-ratio:37/20) and (max-aspect-ratio:2099/1000) and (min-height:700px)',
    strip: '(min-width:1200px) and (min-aspect-ratio:21/10), (min-width:1200px) and (min-aspect-ratio:37/20) and (max-height:699.98px)',
    square: '(min-width:900px) and (max-width:1199.98px) and (min-aspect-ratio:77/100) and (max-aspect-ratio:1/1)',
    tall: '(max-aspect-ratio:7699/10000) and (min-height:1200px)'
  };
  function deskCss(S) {
    var any = '@media ' + [DESK.wide, DESK.strip, DESK.square, DESK.tall].join(', ');
    function rules(a) { return a.map(function (r) { return r.replace(/(^|,)\s*&/g, '$1' + S); }).join('\n'); }
    return [
      any + '{' + rules([
        '&:has(> .ctable){max-width:none;height:calc(100dvh - var(--bar));display:grid;column-gap:0;row-gap:0;padding:4px 20px max(calc(var(--safe-b) + 8px),18px);}',
        '& > .ctable{grid-area:table;display:flex;flex-direction:column;min-width:0;min-height:0;margin:0 0 6px;padding:clamp(9px,.75vmin,14px);border-radius:clamp(28px,2.2vmin,40px);}',
        '& > .ctable .felt-in{flex:1 1 0;height:auto;min-height:0;container:cfelt / size;border-radius:clamp(21px,1.7vmin,30px);}',
        '& > .csort-row{grid-area:sort;}',
        '& > .cbar{grid-area:bar;}',
        '& > .chand{grid-area:hand;justify-self:center;width:100%;max-width:calc(var(--cw) * 8.7 + 16px);padding:calc(var(--cw) * .22) 8px 4px;}',
        '& > .chand .pcard.sel{transform:translateY(calc(var(--cw) * -.19));}',
        '& > .chand .pcard.play:hover:not(.sel){transform:translateY(calc(var(--cw) * -.09));}',
        '& > .cdk-panel{display:flex;min-width:0;min-height:0;}',
        '& > .cdk-l{grid-area:left;}',
        '& > .cdk-r{grid-area:right;}',
        // the pieces on the felt step up with the felt (container units of the felt), to a largest size
        '& .cseat{font-size:clamp(.98rem,2cqmin,1.85rem);gap:.22em;}',
        '& .cseat.n{top:clamp(8px,1.6cqmin,24px);}',
        '& .cseat.s{bottom:clamp(8px,1.6cqmin,24px);}',
        '& .cseat.w{left:clamp(6px,1.6cqmin,24px);}',
        '& .cseat.e{right:clamp(6px,1.6cqmin,24px);}',
        '& .cseat .tag{font-size:1em;padding:.32em .82em .32em .32em;gap:.5em;border-radius:.85em;}',
        '& .cseat .tag .avatar{width:2.05em;height:2.05em;font-size:.9em;}',
        '& .cseat .info{gap:.28em;}',
        '& .cseat .chip-s{font-size:.86em;padding:.12em .65em;border-radius:.55em;}',
        '& .cseat .backs{--cw:1.95em;}',
        '& .cseat .backs .pcard + .pcard{margin-left:-1.36em;}',
        '& .cseat .say{font-size:.9em;}',
        '& .ctrick .pcard{--cw:clamp(40px,min(17cqw,15cqh),210px);}',
        '& .cmsg{font-size:clamp(.98rem,1.9cqmin,1.7rem);padding:.5em 1em;}',
        '& .cdk-lt .ctrick .pcard{--cw:min(25cqw,27cqh);}'
      ]) + '}',
      any + '{@container cfelt (max-height:500px){' + rules(['& .cseat .backs{display:none;}']) + '}}',
      '@media ' + DESK.wide + '{' + rules([
        '&:has(> .ctable){grid-template-columns:auto minmax(0,1fr) auto;grid-template-rows:minmax(0,1fr) auto auto auto;grid-template-areas:"left table right" "left table bar" "left table sort" "hand hand hand";--cdk-lw:clamp(260px,21vw,520px);--cdk-rw:clamp(230px,17vw,420px);}',
        '& > .cdk-l{width:max(var(--cdk-lw),var(--cdk-lmin,0px));margin:0 16px 6px 0;}',
        '& > .cdk-r{width:var(--cdk-rw);margin:0 0 10px 16px;}',
        '& > .cbar{width:var(--cdk-rw);min-height:52px;margin:0 0 10px 16px;align-self:end;flex-wrap:wrap;text-align:center;}',
        '& > .cbar .btn{width:100%;}',
        '& > .csort-row{width:var(--cdk-rw);margin:0 0 6px 16px;justify-content:center;}',
        '& > .chand{--cw:clamp(84px,min(12.4vw,12.5dvh),210px);}'
      ]) + '}',
      '@media ' + DESK.strip + '{' + rules([
        '&:has(> .ctable){grid-template-columns:auto minmax(0,min(38vw,calc((100dvh - var(--bar)) * 1.3))) minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto auto auto;grid-template-areas:"left table right" "left table bar" "left table sort" "left table hand";--cdk-lw:clamp(260px,21vw,460px);}',
        '& > .cdk-l{width:max(var(--cdk-lw),var(--cdk-lmin,0px));margin:0 16px 0 0;}',
        '& > .ctable{margin:0;}',
        '& > .cdk-r{margin:0 0 8px 18px;}',
        '& > .cbar{min-height:44px;margin:0 0 0 18px;align-self:center;flex-wrap:wrap;text-align:center;}',
        '& > .csort-row{margin:0 0 0 18px;}',
        '& > .chand{--cw:clamp(56px,17dvh,150px);justify-self:stretch;width:auto;max-width:none;min-height:0;margin-left:18px;padding:calc(var(--cw) * .22) 0 0;}'
      ]) + '}',
      '@media (min-width:1200px) and (min-aspect-ratio:37/20) and (max-height:480px){' + rules(['& > .cdk-r{display:none;}']) + '}',
      '@media ' + DESK.square + '{' + rules([
        '&:has(> .ctable){grid-template-columns:auto minmax(0,1fr);grid-template-rows:minmax(0,3fr) minmax(0,2fr) auto auto auto;grid-template-areas:"left table" "right table" "sort sort" "hand hand" "bar bar";--cdk-lw:clamp(250px,27vw,300px);}',
        '& > .cdk-l{width:max(var(--cdk-lw),var(--cdk-lmin,0px));margin:0 14px 10px 0;}',
        '& > .cdk-r{width:max(var(--cdk-lw),var(--cdk-lmin,0px));margin:0 14px 6px 0;}',
        '&:not(:has(> .cdk-r)) > .cdk-l{grid-row:1 / span 2;margin-bottom:6px;}',
        '& > .chand{--cw:clamp(84px,min(11vw,10.5dvh),210px);}'
      ]) + '}',
      '@media ' + DESK.tall + '{' + rules([
        '&:has(> .ctable){grid-template-columns:minmax(0,5fr) minmax(0,4fr);grid-template-rows:minmax(0,1fr) auto auto auto clamp(250px,27dvh,540px);grid-template-areas:"table table" "sort sort" "hand hand" "bar bar" "left right";}',
        '& > .cdk-l{margin:6px 7px 0 0;}',
        '& > .cdk-r{margin:6px 0 0 7px;}',
        '&:not(:has(> .cdk-r)) > .cdk-l{grid-column:1 / -1;margin-right:0;}',
        '& > .chand{--cw:clamp(56px,min(15vw,9dvh),170px);}'
      ]) + '}',
      '@media ' + DESK.tall + ' and (max-width:519.98px){' + rules([
        '&:has(> .ctable){grid-template-areas:"table table" "sort sort" "hand hand" "bar bar" "left left";}',
        '& > .cdk-r{display:none;}',
        '& > .cdk-l{margin-right:0;}'
      ]) + '}',
      // Between the devices and the desk: a window no phone or tablet has still fills itself
      // (upright and wider than an iPad mini: the table runs the full width)
      '@media (orientation:portrait) and (min-width:621px) and (max-width:699.98px), (orientation:portrait) and (min-width:780px){' + rules(['&:has(> .ctable){max-width:none;}']) + '}',
      '@media (orientation:landscape) and (min-width:1100px){' + rules(['&:has(> .ctable){max-width:none;}']) + '}',
      // (a small window, upright or square, wider than a phone and under 760 tall: what's happening and the sort toggle
      // share a line, so the table keeps the height)
      '@media (orientation:portrait) and (min-width:480px) and (max-height:759.98px){' + rules([
        '&:has(> .ctable){max-width:none;height:calc(100dvh - var(--bar));display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:minmax(0,1fr) auto auto;grid-template-areas:"table table" "bar sort" "hand hand";padding-bottom:max(calc(var(--safe-b) + 6px),18px);}',
        '& > .ctable{grid-area:table;display:flex;flex-direction:column;min-height:0;margin-bottom:6px;}',
        '& > .ctable .felt-in{flex:1 1 0;height:auto;min-height:0;container-type:size;}',
        '& > .cbar{grid-area:bar;justify-content:flex-start;min-height:52px;margin:0 0 0 4px;}',
        '& > .csort-row{grid-area:sort;align-self:center;margin:0;}',
        '& > .chand{grid-area:hand;--cw:clamp(56px,min(17vw,13dvh),80px);}'
      ]) + '}',
      // (sideways, 520 to 600 tall: the phone's sideways layout, the table at the left and the hand at the right)
      '@media (orientation:landscape) and (min-height:520.02px) and (max-height:599.98px) and (max-width:1199.98px){' + rules([
        '&:has(> .ctable){max-width:none;height:calc(100dvh - var(--bar));display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto auto;grid-template-areas:"table bar" "table sort" "table hand";column-gap:14px;padding:0 calc(12px + var(--corner-x)) max(calc(var(--safe-b) + 6px),18px);}',
        '& > .ctable{grid-area:table;margin:0;display:flex;flex-direction:column;min-height:0;}',
        '& > .ctable .felt-in{flex:1 1 0;height:auto;min-height:0;container-type:size;}',
        '& > .cbar{grid-area:bar;align-self:center;flex-wrap:wrap;margin:0;min-height:0;text-align:center;}',
        '& > .csort-row{grid-area:sort;margin:0;}',
        '& > .chand{grid-area:hand;--cw:clamp(48px,min(18dvh,12.5vw),104px);padding:14px 0 0;min-height:0;}'
      ]) + '}',
      // (sideways, under 1000 wide and 600 or more tall: the tablet's sideways layout with a narrower side column)
      '@media (orientation:landscape) and (max-width:999.98px) and (min-height:600px){' + rules([
        '&:has(> .ctable){max-width:none;height:calc(100dvh - var(--bar));display:grid;grid-template-columns:minmax(0,1fr) clamp(170px,24vw,240px);grid-template-rows:minmax(0,1fr) auto auto;grid-template-areas:"table bar" "table sort" "hand hand";column-gap:16px;padding-bottom:max(calc(var(--safe-b) + 6px),18px);}',
        '& > .ctable{grid-area:table;display:flex;flex-direction:column;min-height:0;margin-bottom:6px;}',
        '& > .ctable .felt-in{flex:1 1 0;height:auto;min-height:0;container-type:size;}',
        '& > .cbar{grid-area:bar;align-self:end;flex-wrap:wrap;margin:0 0 14px;text-align:center;}',
        '& > .cbar .btn{width:100%;}',
        '& > .csort-row{grid-area:sort;align-self:end;justify-content:center;margin:0 0 8px;}',
        '& > .chand{grid-area:hand;--cw:clamp(64px,min(11dvh,11vw),100px);}'
      ]) + '}'
    ].join('\n');
  }
  function desk(stage) {
    if (!stage || !stage.id) return null;
    var S = 'html.cdesk #' + stage.id + '.stage';
    var st = document.createElement('style'); st.textContent = deskCss(S); document.head.appendChild(st);
    var root = document.documentElement, mq = window.matchMedia([DESK.wide, DESK.strip, DESK.square, DESK.tall].join(', '));
    root.classList.add('cdesk');
    // html.cdesk-on while a desk layout shows, for a page's own rules about its pieces at a desk
    function sync() { root.classList.toggle('cdesk-on', mq.matches); }
    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync); else if (mq.addListener) mq.addListener(sync);
    function panel(side) { var p = document.createElement('aside'); p.className = 'cdk-panel cdk-' + side; return p; }
    return { l: panel('l'), r: panel('r'), on: function () { return mq.matches; } };
  }

  // Cards.pad(host, o): the ruled score sheet on a desk panel. o = {
  //   cols:  [{name, color, cpu, me}]            a column for each player (or side); me is ruled in gold
  //   rows:  [{label, cells: [cell]}]            the hands played
  //   live:  {label, cells: [cell]} or null      the hand in play, lit
  //   total: [{v, lead, pct, warn}]              the totals; lead lights the one ahead, pct (0 to 1) fills a meter
  //   meter: text for the meters' row label (the score the game is played to), or nothing for no meters
  //   just:  true writes the last row in (a hand just scored) }
  //   cell = {v, mark (html beside the number), zero (faded), hot (lit)}
  // It fills its panel: the rows played, then empty ruled lines down to the totals. More hands than fit scroll, the
  // newest in view (give it a host that is already in the page).
  function pad(host, o) {
    var E = Kit.el, n = o.cols.length, mi = -1;
    o.cols.forEach(function (c, i) { if (c.me) mi = i; });
    var root = E('div', { class: 'cdk-pad', style: { '--n': String(n), '--mi': String(mi) } });
    if (mi >= 0) root.appendChild(E('div', { class: 'meb' }));
    function cell(c) { c = c || {}; return E('span', { class: 'cv' + (c.zero ? ' z' : '') + (c.hot ? ' hot' : '') + (c.lead ? ' lead' : ''), html: Kit.esc(c.v == null ? '' : String(c.v)) + (c.mark ? '<i class="mk">' + c.mark + '</i>' : '') }); }
    function row(cls, label, cells) { return E('div', { class: 'pr ' + cls }, [E('span', { class: 'rl', text: label == null ? '' : String(label) })].concat(cells)); }
    root.appendChild(row('ph', '', o.cols.map(function (c) {
      return E('span', { class: 'pc' + (c.me ? ' me' : '') }, [E('span', { class: 'avatar', style: { '--c': c.color }, html: c.cpu ? Kit.icon('bot') : Kit.esc(String(c.name || '?').charAt(0).toUpperCase()) }), E('span', { text: c.name })]);
    })));
    var body = E('div', { class: 'pb' });
    (o.rows || []).forEach(function (r, i) { body.appendChild(row(o.just && i === o.rows.length - 1 ? 'just' : '', r.label, r.cells.map(cell))); });
    if (o.live) body.appendChild(row('live', o.live.label, o.live.cells.map(cell)));
    root.appendChild(body);
    root.appendChild(row('pf', 'Total', o.total.map(cell)));
    if (o.meter != null) root.appendChild(row('pm', o.meter, o.total.map(function (t, i) {
      return E('i', { class: 'mt' + (t.warn ? ' warn' : ''), style: { '--c': o.cols[i].color } }, [E('b', { style: { width: Math.round(Math.max(0, Math.min(1, t.pct || 0)) * 100) + '%' } })]);
    })));
    host.appendChild(root);
    body.scrollTop = body.scrollHeight;   // (the host must be in the page already, or nothing is measured)
    return root;
  }

  // Cards.lastTrick(host, {plays: [{c: {r, s}, pos, win}], cls, fresh}): the trick just taken, lying on a small felt
  // as it lay on the table (pos is the seat's place there: s, w, n, e, ...; cls the table's own classes, so the
  // page's rules for its trick apply), the winning card ringed. fresh plays the cards in.
  function lastTrick(host, o) {
    var box = Kit.el('div', { class: 'cdk-lt felt-in' + (o.cls ? ' ' + o.cls : '') + (o.fresh ? ' new' : '') }), t = Kit.el('div', { class: 'ctrick' });
    (o.plays || []).forEach(function (p) { t.appendChild(el(p.c, { cls: 'p-' + p.pos + (p.win ? ' win' : '') })); });
    box.appendChild(t); host.appendChild(box);
    return box;
  }

  return { RANKS: RANKS, SUITS: SUITS, GLYPH: GLYPH, deck: deck, shuffle: shuffle, sort: sort, sortBy: sortBy, el: el, label: label, fan: fan, fly: fly, flip: flip, wait: wait, rankIndex: rankIndex, sortToggle: sortToggle, sortMode: sortMode, desk: desk, pad: pad, lastTrick: lastTrick, DESK: DESK };
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
//   onChange(state) called after any round is added, fixed or deleted
//   onEnd(result)  optional hook after the game ends
//   mode:     text recorded in history (e.g. 'Scorekeeper')
//
//   Entering a round ON the sheet (the notepad way, preferred):
//   entryRows(ctx) -> [tr…]  the open round's rows. They sit under the last
//              round for a new round, or in place of a round being fixed
//              (tap a past round). ctx = {
//                round      1-based number of the round being entered/fixed
//                index      its index in rounds (rounds.length for a new one)
//                editing    true when fixing a past round
//                prev       that round {scores, label, detail, data} or null
//                rounds     the rounds so far (read only)
//                sides, totals (totals WITHOUT this round)
//                pending([pts])   live round points: footer shows totals + pts
//                status(msg, ok)  note beside the lock button; ok: true = fine,
//                                 'wait' = not finished (grey, lock off),
//                                 false = a mistake (red, lock off)
//                done(scores, extra)  write the round in (adds or replaces)
//                draft() / draft(obj)  the unlocked new round, kept across
//                                 reloads (null while fixing or for another round)
//              }
//   onLock(ctx)   the lock / save button was tapped: check, then ctx.done(…)
//   lockLabel     'Lock round' (followed by the number), or fn(ctx) -> text
//   afterRender(ctx)  after each render with open rows
//
//   Old way (pop-up, still works for pages without entryRows):
//   form(ctx)  builds the round-entry UI in a sheet. ctx = {sides, round,
//              totals, prev, number(i, opts) -> input row, done(scores, extra), node}
//              extra = {label, detail:[...per side text], highlights:[..], data:{any}}
//              Omit form for a plain "points per player" entry.
//   noAdd:    the game has its own entry panel and calls pad.add(scores, extra)
// })
// Returns {state, render, addRound, add, undo, reset, totals, clear, edit}.
// ═══════════════════════════════════════════════════════════════════════════
function Scorepad(host, o) {
  'use strict';
  var el = Kit.el, SAVE = 'pad_' + o.key, DRAFT = SAVE + '_draft';
  var S = null, editIdx = -1, delArm = 0;
  try { S = JSON.parse(localStorage.getItem(SAVE)); } catch (e) {}
  if (!S || !S.sides || S.sides.length !== o.sides.length || S.sides.some(function (s, i) { return s.name !== o.sides[i].name; })) {
    S = { sides: o.sides.map(function (s) { return { name: s.name }; }), rounds: [], over: false, highlights: [], started: Date.now() };
  }
  function save() { try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {} if (!S.over) Kit.resume.set(S.rounds.length ? 'Round ' + (S.rounds.length + 1) : 'Ready', { keys: [SAVE, DRAFT] }); }
  function dropDraft() { try { localStorage.removeItem(DRAFT); } catch (e) {} }
  function clear() { try { localStorage.removeItem(SAVE); } catch (e) {} dropDraft(); Kit.resume.clear(); }
  function totals(skip) {
    var t = S.sides.map(function () { return 0; });
    S.rounds.forEach(function (r, ri) { if (ri !== skip) r.scores.forEach(function (v, i) { t[i] += Number(v) || 0; }); });
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
  function roundWord(ri) { var l = S.rounds[ri] && S.rounds[ri].label; return /^[a-z]+$/i.test(l || '') ? l.toLowerCase() : 'round ' + (ri + 1); }

  function render(justAdded) {
    host.innerHTML = '';
    if (!o.entryRows || editIdx >= S.rounds.length) editIdx = -1;
    var editing = editIdx >= 0, t = totals(), lead = S.rounds.length ? (o.winner ? o.winner(t, S.rounds) : leader(t)) : -1;
    var pad = el('div', { class: 'spad' + (editing ? ' fixing' : '') + (S.sides.length >= 5 ? ' many' : '') });
    pad.appendChild(el('div', { class: 'spad-h' }, [el('h2', { text: o.title || (Kit.game() ? Kit.game().name : 'Score') }), el('small', { text: editing ? 'fixing ' + roundWord(editIdx) : S.rounds.length ? 'tap a round to fix it' : '' })]));
    var tbl = el('table'), hr = el('tr', null, [el('th', { class: 'rn' })]);
    S.sides.forEach(function (s, i) { hr.appendChild(el('th', { text: s.name, style: { color: Kit.color(i) } })); });
    tbl.appendChild(el('thead', null, [hr]));
    var tb = el('tbody');
    // o.entryRows(ctx): the round being entered (or fixed) is written right on the sheet
    var footCells = [], ectx = null, entry = [], base = t, lastPend = null, note = null, lockBtn = null, stat = { msg: '', ok: true };
    if (o.entryRows && (editing || !S.over)) {
      base = editing ? totals(editIdx) : t;
      var idx = editing ? editIdx : S.rounds.length;
      ectx = {
        round: idx + 1, index: idx, editing: editing, prev: editing ? S.rounds[editIdx] : null,
        rounds: S.rounds, sides: S.sides, totals: base.slice(),
        pending: function (arr) {
          lastPend = arr || null;
          if (!footCells.length) return;
          var tt = base.map(function (v, i) { return v + (Number(arr && arr[i]) || 0); }), ld = o.winner ? o.winner(tt, S.rounds) : leader(tt);
          footCells.forEach(function (td, i) { td.textContent = String(tt[i]); td.className = (i === ld && tt[i] !== base[i] ? 'lead' : i === ld && !arr ? 'lead' : '') + (tt[i] < 0 ? ' neg' : '') + (tt[i] !== base[i] ? ' pend' : ''); });
        },
        status: function (msg, ok) {
          stat = { msg: msg || '', ok: ok === undefined ? true : ok };
          if (note) { note.textContent = stat.msg; note.className = 'spad-note' + (stat.ok === false ? ' bad' : stat.ok === true && stat.msg ? ' ok' : ''); }
          if (lockBtn) lockBtn.disabled = stat.ok !== true;
        },
        done: function (scores, extra) {
          if (editing) return replaceRound(idx, scores, extra || {});
          dropDraft(); pushRound(scores, extra);
        },
        cancel: function () { editIdx = -1; render(); },
        draft: function (v) {
          if (editing) return null;
          if (arguments.length) { try { localStorage.setItem(DRAFT, JSON.stringify({ round: idx + 1, v: v })); } catch (e) {} return v; }
          try { var d = JSON.parse(localStorage.getItem(DRAFT)); return d && d.round === idx + 1 ? d.v : null; } catch (e) { return null; }
        }
      };
      entry = o.entryRows(ectx) || [];
      if (editing) entry.forEach(function (r) { r.classList.add('fixing'); });
    }
    S.rounds.forEach(function (r, ri) {
      if (editing && ri === editIdx) { entry.forEach(function (n) { tb.appendChild(n); }); return; }
      var tr = el('tr', { class: (justAdded && ri === S.rounds.length - 1 ? 'just' : '') + (editing ? ' dim' : '') }, [el('th', { class: 'rn', text: r.label || String(ri + 1) })]);
      r.scores.forEach(function (v, i) {
        var td = el('td', { class: Number(v) < 0 ? 'neg' : '', text: v == null ? '–' : String(v) });
        if (r.detail && r.detail[i]) td.appendChild(Kit.facts(el('small'), r.detail[i]));   // (a round's facts, a line each)
        tr.appendChild(td);
      });
      tr.addEventListener('click', function () {
        if (editing) { Kit.toast('Save or cancel ' + roundWord(editIdx) + ' first'); return; }
        editRound(ri);
      });
      tb.appendChild(tr);
    });
    if (ectx && !editing) entry.forEach(function (n) { tb.appendChild(n); });
    tbl.appendChild(tb);
    if (S.rounds.length || ectx) {
      var fr = el('tr', null, [el('th', { class: 'rn', text: 'Total' })]);
      base.forEach(function (v, i) { var td = el('td', { class: (!editing && i === lead ? 'lead' : '') + (v < 0 ? ' neg' : ''), text: String(v) }); footCells.push(td); fr.appendChild(td); });
      tbl.appendChild(el('tfoot', null, [fr]));
    }
    pad.appendChild(tbl);
    if (!S.rounds.length && !ectx) pad.appendChild(el('div', { class: 'spad-empty', text: o.noAdd ? 'The scores land here after the first round.' : 'Play a hand at the table, then tap Add round.' }));
    if (o.goal) pad.appendChild(el('div', { class: 'goal', text: o.goal }));
    host.appendChild(pad);
    var acts = el('div', { class: 'spad-acts' + (editing ? ' fixing' : '') });
    if (ectx) {
      note = el('div', { class: 'spad-note', role: 'status', 'aria-live': 'polite' });
      acts.appendChild(note);
      var lbl = editing ? 'Save ' + roundWord(editIdx) : typeof o.lockLabel === 'function' ? o.lockLabel(ectx) : (o.lockLabel || 'Lock round') + ' ' + ectx.round;
      lockBtn = el('button', { type: 'button', class: 'btn btn-primary btn-lg', html: Kit.icon('check') + '<span>' + Kit.esc(lbl) + '</span>', onclick: function () { if (o.onLock) o.onLock(ectx); } });
      acts.appendChild(lockBtn);
      if (editing) {
        var del = el('button', { type: 'button', class: 'btn btn-soft btn-lg spad-del', 'aria-label': 'Delete ' + roundWord(editIdx), html: Kit.icon('trash') + '<span>Delete</span>', onclick: function () {
          if (Date.now() - delArm > 3000) { delArm = Date.now(); del.classList.add('armed'); del.lastChild.textContent = 'Tap again'; Kit.haptic('light'); setTimeout(function () { if (del.isConnected) { del.classList.remove('armed'); del.lastChild.textContent = 'Delete'; } }, 3000); return; }
          delArm = 0; var ri = editIdx; editIdx = -1; S.rounds.splice(ri, 1); S.over = false; Kit.sfx('whoosh'); Kit.toast('Round deleted'); afterChange();
        } });
        acts.appendChild(del);
        acts.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-lg spad-cancel', text: 'Cancel', onclick: function () { editIdx = -1; Kit.sfx('tap'); render(); } }));
      }
      ectx.status(stat.msg, stat.ok);
      if (lastPend) ectx.pending(lastPend);
    } else if (!S.over) {
      if (!o.noAdd) acts.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-lg', html: Kit.icon('plus') + '<span>Add round ' + (S.rounds.length + 1) + '</span>', onclick: function () { addRound(); } }));
    }
    if (S.over && !editing) acts.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-lg', html: Kit.icon('sparkle') + '<span>New game</span>', onclick: function () { reset(); } }));
    if (acts.childNodes.length) host.appendChild(acts);
    if (ectx && o.afterRender) o.afterRender(ectx);
  }
  function pushRound(scores, extra) {
    extra = extra || {};
    Kit.resume.set('Round ' + (S.rounds.length + 2), { keys: [SAVE, DRAFT] });
    S.rounds.push({ scores: scores, label: extra.label || '', detail: extra.detail || null, highlights: extra.highlights || [], data: extra.data || null });
    if (extra.callout) Kit.callout(extra.callout);
    Kit.sfx('good'); Kit.haptic('success');
    afterChange(true);
  }
  function replaceRound(ri, scores, extra) {
    var r = S.rounds[ri];
    S.rounds[ri] = { scores: scores, label: extra.label || r.label || '', detail: extra.detail || null, highlights: extra.highlights || [], data: extra.data || null };
    editIdx = -1; S.over = false; Kit.sfx('good'); Kit.haptic('success');
    afterChange();
  }

  function openForm(prev, onDone, title) {
    var node = el('div', { class: 'rform' }), s;
    var ctx = {
      sides: S.sides, round: prev ? prev.index + 1 : S.rounds.length + 1, totals: totals(), prev: prev ? prev.round : null, node: node,
      number: function (i, opt) {
        opt = opt || {};
        var start = opt.value != null ? opt.value : (prev && prev.round.scores[i] != null ? prev.round.scores[i] : '');
        var inp = el('input', { class: 'input num', type: 'text', inputmode: opt.neg === false ? 'numeric' : 'text', 'data-osk': opt.neg === false ? null : 'neg', enterkeyhint: 'next', value: String(start), placeholder: opt.placeholder || '0', 'aria-label': (opt.label || S.sides[i].name) + ' points' });
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
    if (o.entryRows) { editIdx = -1; render(); return; }
    openForm(null, function (scores, extra) { pushRound(scores, extra); }, 'Round ' + (S.rounds.length + 1));
  }
  function editRound(ri) {
    var r = S.rounds[ri];
    if (!r) return;
    // Sheet games: the round opens again right where it is written, ready to change
    if (o.entryRows) {
      editIdx = ri; delArm = 0; Kit.sfx('tap'); Kit.haptic('light'); render();
      var row = host.querySelector('tr.fixing');
      if (row && row.scrollIntoView) try { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { row.scrollIntoView(); }
      return;
    }
    Kit.sheet({
      title: 'Round ' + (ri + 1), html: '<table class="k-rnd-t">' + S.sides.map(function (s, i) { return '<tr><th>' + Kit.esc(s.name) + '</th><td>' + r.scores[i] + '</td></tr>'; }).join('') + '</table>',   // (a small table: each side and its score)
      actions: [
        { label: 'Fix this round', primary: true, onClick: function () {
          openForm({ index: ri, round: r }, function (scores, extra) { replaceRound(ri, scores, extra); }, 'Fix round ' + (ri + 1));
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
    editIdx = -1; S.rounds.pop(); S.over = false; Kit.sfx('whoosh'); Kit.toast('Last round removed'); save(); render();
  }
  function reset() {
    editIdx = -1; dropDraft();
    S = { sides: o.sides.map(function (s) { return { name: s.name }; }), rounds: [], over: false, highlights: [], started: Date.now() };
    save(); render();
  }
  render(); save();
  return { state: function () { return S; }, render: render, addRound: addRound, add: pushRound, undo: undo, reset: reset, totals: totals, clear: clear, edit: editRound, editing: function () { return editIdx; } };
}

// ── Pieces for a game's entryRows (paper look, sized for narrow columns) ────
// Scorepad.step({value, min, max, step, label, neg, onChange(v)}) -> stepper:
//   + on top, the number (typeable), − underneath. Blank is null; + from blank
//   gives min + step, − gives min. el.get(), el.set(v), el.input, el.disable(b)
Scorepad.step = function (o) {
  var el = Kit.el, v = o.value == null || o.value === '' ? null : Number(o.value), step = o.step || 1, min = o.min != null ? o.min : (o.neg ? null : 0);
  var inp = el('input', { class: 'cell', type: 'text', inputmode: o.neg ? 'text' : 'numeric', 'data-osk': o.neg ? 'neg' : null, placeholder: o.placeholder || '–', 'aria-label': o.label || 'Points', enterkeyhint: 'next', autocomplete: 'off' });
  function clamp(x) { if (min != null) x = Math.max(min, x); if (o.max != null) x = Math.min(o.max, x); return x; }
  function paint() { inp.value = v == null ? '' : String(v); }
  function bump(d) {
    v = v == null ? (d > 0 ? (min || 0) + step : (min || 0)) : clamp(v + d);
    paint(); Kit.sfx('tick'); Kit.haptic('light'); if (o.onChange) o.onChange(v);
  }
  var up = el('button', { type: 'button', text: '+', 'aria-label': (o.label || 'Points') + ' up', onclick: function () { bump(step); } });
  var dn = el('button', { type: 'button', text: '−', 'aria-label': (o.label || 'Points') + ' down', onclick: function () { bump(-step); } });
  inp.addEventListener('focus', function () { inp.select(); });
  inp.addEventListener('input', function () {
    var t = String(inp.value).replace(o.neg ? /[^0-9-]/g : /[^0-9]/g, '');
    v = t === '' || t === '-' ? null : parseInt(t, 10);
    if (isNaN(v)) v = null;
    if (o.onChange) o.onChange(v);
  });
  inp.addEventListener('blur', function () { if (v != null && clamp(v) !== v) { v = clamp(v); paint(); if (o.onChange) o.onChange(v); } });
  inp.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var all = Array.prototype.slice.call(document.querySelectorAll('.spad input.cell:not(:disabled)')), k = all.indexOf(inp);
    if (all[k + 1]) all[k + 1].focus(); else inp.blur();
  });
  paint();
  var w = el('div', { class: 'sp-step' }, [up, inp, dn]);
  w.input = inp;
  w.get = function () { return v; };
  w.set = function (x) { v = x == null ? null : x; paint(); };
  w.disable = function (b) { up.disabled = dn.disabled = inp.disabled = !!b; };
  return w;
};
// Scorepad.tog(label, {cls, aria, on, onClick, html}) -> a paper toggle button (class "on" when set)
Scorepad.tog = function (label, o) {
  o = o || {};
  var b = Kit.el('button', { type: 'button', class: 'sp-tg' + (o.cls ? ' ' + o.cls : '') + (o.on ? ' on' : ''), 'aria-label': o.aria || label, html: o.html || null, text: o.html ? null : label,
    onclick: function () { Kit.sfx('tap'); Kit.haptic('light'); if (o.onClick) o.onClick(); } });
  b.set = function (on) { b.classList.toggle('on', !!on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); };
  b.set(!!o.on);
  return b;
};
