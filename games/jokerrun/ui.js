// ═══════════════════════════════════════════════════════════════════════════
// Balatro (Joker Run) view: layout, input, the scoring show and every screen.
// Rules live in engine.js (window.JRE); art in art.js; background in bg.js.
// Battery: nothing runs while idle except the optional background. Card bob and
// edition shines are CSS and pause after a few idle seconds; JS timers only run
// during a scoring or dealing sequence; count-ups draw at most ~60 times a second.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var E = window.JRE, A = window.JRArt, el = Kit.el, esc = Kit.esc;
  var app = document.getElementById('app'), fxl = document.getElementById('jr-fx');
  var SAVE = 'jokerrun_state', HKEY = 'jokerrun';
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function S() { return E.S; }
  function C(id) { return E.C(id); }
  function fmt(n) { n = Math.round(n); return Math.abs(n) >= 1e11 ? n.toExponential(3).replace('+', '') : n.toLocaleString('en-US'); }
  function fx(x) { return E.fx(x); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function hap(k) { var u = navigator.userActivation; if (!u || u.hasBeenActive) Kit.haptic(k); }
  // Balatro text markup: {c|+30} chips, {m|+4} mult, {x|x2} xmult, {o|$3} money, {p|1 in 4} chance, {a|...} key words, {s|h} suit
  function md(s) {
    return esc(s || '').replace(/\{(\w)\|([^}]*)\}/g, function (_, k, t) {
      if (k === 's') return '<b class="t-s t-s' + t + '">' + E.SUITN[t] + '</b>';
      return '<b class="t-' + k + '">' + t + '</b>';
    });
  }

  // ═══ Settings (this device only) ═════════════════════════════════════════
  var speed = +lsGet('jr_speed', '1') || 1;
  var motion = lsGet('jr_motion', '1') !== '0';
  var scan = lsGet('jr_scan', '0') === '1';
  document.documentElement.classList.toggle('jr-scan', scan);
  JRBg.motion(motion && !REDUCE);
  var fast = false;                      // a tap during the scoring show speeds it up
  function D(ms) { var m = ms / speed; if (fast) m *= 0.25; if (REDUCE) m = Math.min(m, 120); return wait(Math.max(16, m)); }

  // Idle: bobbing cards and shines rest after 12 s without a touch
  var idleT = 0;
  function poke() { document.documentElement.classList.remove('jr-idle'); clearTimeout(idleT); idleT = setTimeout(function () { document.documentElement.classList.add('jr-idle'); }, 12000); }
  ['pointerdown', 'keydown'].forEach(function (t) { document.addEventListener(t, poke, { passive: true, capture: true }); });
  poke();
  document.addEventListener('visibilitychange', function () { if (document.hidden) document.documentElement.classList.add('jr-idle'); else poke(); });

  // ═══ Sounds: Kit.sfx plus rising blips for the count (as in Balatro) ═════
  var actx = null;
  function blip(n, kind) {
    if (lsGet('gn_sound', '1') === '0') return;
    try {
      if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx = new AC(); }
      if (actx.state === 'suspended') actx.resume();
      var f = 260 * Math.pow(2, Math.min(n, 30) / 12), t = actx.currentTime;
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = kind === 'x' ? 'square' : kind === 'm' ? 'sawtooth' : 'triangle';
      o.frequency.setValueAtTime(kind === 'x' ? f * 0.5 : f, t);
      if (kind === 'x') o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.16);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'x' ? 0.06 : kind === 'm' ? 0.035 : 0.08, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'x' ? 0.22 : 0.09));
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 0.25);
    } catch (e) {}
  }

  // ═══ Background palettes ══════════════════════════════════════════════════
  var PAL = { menu: ['#b0242f', '#1f5e8e', '#170a1e'], round: ['#2a8a5a', '#145a6a', '#0a2018'], shop: ['#a0302a', '#2a4a8a', '#1a0a14'], over: ['#5a1a2a', '#2a2a3a', '#0e0a12'] };
  function bgFor() {
    var s = S(); if (!s) return PAL.menu;
    if (s.phase === 'play') { if (s.bi === 2) { var c = E.BOSSES[s.boss].col; return [c, '#2a1a3a', '#0e0812']; } return PAL.round; }
    if (s.phase === 'shop' || s.phase === 'cashout') return PAL.shop;
    if (s.phase === 'over') return PAL.over;
    return PAL.menu;
  }

  // ═══ How to play ═════════════════════════════════════════════════════════
  var RULES =
    '<p class="goal">Play poker hands to score chips. Beat each blind\'s target before your hands run out. Clear all <b>8 antes</b> to win the run.</p>' +
    '<h3>A round</h3><ul><li>You hold 8 cards. Tap up to 5 to select them; the panel on the left shows the poker hand and its <b class="c">Chips</b> x <b class="m">Mult</b>.</li>' +
    '<li><b>Play Hand</b> scores the selected cards. You get 4 hands a round.</li>' +
    '<li><b>Discard</b> swaps the selected cards for new ones. You get 3 discards a round (the Red deck adds a 4th).</li>' +
    '<li>Drag cards to change their order: they score left to right.</li></ul>' +
    '<h3>Scoring</h3><p>Score = <b class="c">Chips</b> x <b class="m">Mult</b>, in this order:</p><ol>' +
    '<li>The poker hand gives starting Chips and Mult (its level raises both).</li>' +
    '<li>Each card that makes the hand scores, left to right: its chips (2 to 10 face value, J Q K 10, A 11), then its enhancement, edition and seal, then any Joker that reacts to it.</li>' +
    '<li>Cards still in your hand trigger (Steel cards, some Jokers).</li>' +
    '<li>Jokers fire left to right. Order matters: put x Mult Jokers on the right.</li></ol>' +
    '<p>Example: a Pair of 8s scores 10 + 8 + 8 = <b class="c">26</b> Chips x <b class="m">2</b> Mult = 52.</p>' +
    '<h3>Blinds and antes</h3><p>Each ante has a Small Blind, a Big Blind (1.5x the score) and a Boss Blind (2x, with a twist like "all Hearts are debuffed"). ' +
    'You can skip the Small or Big Blind to take its tag instead of its money and shop.</p>' +
    '<h3>Money</h3><p>Beat a blind for $3, $4 or $5, plus $1 for each hand you did not use, plus $1 interest for every $5 you hold (up to $5).</p>' +
    '<h3>The shop</h3><ul><li><b>Jokers</b> (5 slots): sell any for half price. Tap one to see what it does; drag to reorder.</li>' +
    '<li><b>Tarot</b> cards change the cards in your deck, <b>Planet</b> cards level up a poker hand, <b>Spectral</b> cards are powerful with a catch. You can hold 2.</li>' +
    '<li><b>Booster packs</b> let you pick from a few cards. <b>Vouchers</b> are permanent upgrades.</li>' +
    '<li><b>Reroll</b> costs $5, then $1 more each time.</li></ul>' +
    '<h3>Cards</h3><p>Enhancements: Bonus +30 Chips, Mult +4 Mult, Wild (any suit), Glass x2 Mult (may break), Steel x1.5 Mult while held, Stone +50 Chips, Gold $3 if held at round end, Lucky (chance of +20 Mult or $20). ' +
    'Editions: Foil +50 Chips, Holographic +10 Mult, Polychrome x1.5 Mult, Negative +1 slot. Seals: Gold $3 when scored, Red triggers twice, Blue makes a Planet, Purple makes a Tarot when discarded.</p>' +
    '<h3>Undo</h3><p>In the shop, Undo takes back your last buy, sale or reroll. Plays and discards can\'t be undone because new cards were already drawn.</p>';

  Kit.init({
    id: 'jokerrun',
    orient: 'landscape',
    onNew: function () { clearSave(); showSetup(); },
    undo: function () { undo(); },
    menu: [
      { icon: 'chart', label: 'Run info', onClick: function () { runInfo(); } },
      { icon: 'cards', label: 'Your deck', onClick: function () { showDeck(); } },
      { icon: 'trophy', label: 'Biggest hands', onClick: function () { ArcadeHi.show(HKEY, 'Balatro: biggest hands'); } },
      { icon: 'history', label: 'Past runs', onClick: function () { Kit.history(HKEY, { title: 'Balatro: past runs' }); } },
      { icon: 'bolt', label: function () { return 'Game speed: ' + speed + 'x'; }, sub: 'Tap to change', onClick: function () {
        speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; lsSet('jr_speed', String(speed)); Kit.toast('Game speed ' + speed + 'x'); } },
      { icon: 'sparkle', label: 'Background motion', sub: 'Turn off to save battery', toggle: function () { return motion; }, onClick: function () {
        motion = !motion; lsSet('jr_motion', motion ? '1' : '0'); JRBg.motion(motion && !REDUCE); } },
      { icon: 'eye', label: 'Scanlines', sub: 'Old-TV lines over the table', toggle: function () { return scan; }, onClick: function () {
        scan = !scan; lsSet('jr_scan', scan ? '1' : '0'); document.documentElement.classList.toggle('jr-scan', scan); } }
    ],
    rules: RULES
  });

  // ═══ Card and item elements ═══════════════════════════════════════════════
  var SV = {}; E.SUITS.forEach(function (s) { SV[s] = 'url("' + A.suit(s) + '")'; });
  var PIPS = {
    2: [[50, 0], [50, 100, 1]], 3: [[50, 0], [50, 50], [50, 100, 1]], 4: [[0, 0], [100, 0], [0, 100, 1], [100, 100, 1]],
    5: [[0, 0], [100, 0], [50, 50], [0, 100, 1], [100, 100, 1]], 6: [[0, 0], [100, 0], [0, 50], [100, 50], [0, 100, 1], [100, 100, 1]],
    7: [[0, 0], [100, 0], [50, 25], [0, 50], [100, 50], [0, 100, 1], [100, 100, 1]],
    8: [[0, 0], [100, 0], [50, 25], [0, 50], [100, 50], [50, 75, 1], [0, 100, 1], [100, 100, 1]],
    9: [[0, 0], [100, 0], [0, 33], [100, 33], [50, 50], [0, 67, 1], [100, 67, 1], [0, 100, 1], [100, 100, 1]],
    10: [[0, 0], [100, 0], [50, 17], [0, 33], [100, 33], [0, 67, 1], [100, 67, 1], [50, 83, 1], [0, 100, 1], [100, 100, 1]]
  };
  var ELAB = { bonus: '+30', mult: '+4', wild: 'WILD', glass: 'x2', steel: 'x1.5', stone: '+50', gold: '$3', lucky: 'LUCKY' };
  var bobN = 0;
  function bob() { bobN = (bobN + 1) % 9; return (-bobN * 0.41).toFixed(2) + 's'; }
  // A playing card: Kit.card with a pixel face. o: {down, deb}
  function cardEl(c, o) {
    o = o || {};
    var n = Kit.card(E.isStone(c) ? 'A' : c.r, c.s, {});
    n.classList.add('jc'); n.dataset.id = c.id; n.style.setProperty('--bd', bob());
    if (o.down) { n.classList.add('back'); n.setAttribute('aria-label', 'Face-down card'); n.innerHTML = ''; deckCols(n); return n; }
    n.style.setProperty('--sv', SV[c.s]);
    var h = '';
    if (E.isStone(c)) { n.setAttribute('aria-label', 'Stone card'); }
    else {
      var ix = '<span class="ix">' + esc(c.r) + '<i class="su"></i></span>';
      h += ix + ix.replace('class="ix"', 'class="ix bot"');
      if (c.r === 'A') h += '<i class="ace"></i>';
      else if (/^[JQK]$/.test(c.r)) h += '<span class="fc"><img alt="" src="' + A.url('f:' + c.r + c.s) + '"></span>';
      else h += '<span class="pips">' + PIPS[+c.r].map(function (p) { return '<i' + (p[2] ? ' class="f"' : '') + ' style="left:' + p[0] + '%;top:' + p[1] + '%"></i>'; }).join('') + '</span>';
    }
    if (c.e) { n.classList.add('e-' + c.e); h += '<span class="el">' + ELAB[c.e] + '</span>'; }
    if (c.sl) h += '<i class="seal ' + c.sl + '"></i>';
    if (c.ed) { if (c.ed === 'neg') n.classList.add('ed-neg'); else h += '<i class="ed ' + c.ed + '"></i>'; }
    n.innerHTML = h;
    if (o.deb) n.classList.add('debuf');
    if (c.bc) n.title = '+' + c.bc + ' extra chips';
    return n;
  }
  function deckCols(n) {
    var d = E.DECKS[(S() && S().deckId) || 'red'];
    n.style.setProperty('--dk-a', d.col); n.style.setProperty('--dk-b', 'color-mix(in srgb,' + d.col + ' 75%,#000)');
  }
  function edEl(ed) { return ed && ed !== 'neg' ? el('i', { class: 'ed ' + ed }) : null; }
  function artCard(url, name, cls, ed) {
    var n = el('div', { class: 'jk ' + (cls || ''), role: 'button', 'aria-label': name, style: { '--bd': bob() } }, [
      el('img', { alt: '', src: url, draggable: 'false' }), el('span', { class: 'nm', text: name }), edEl(ed)]);
    if (ed === 'neg') n.classList.add('neg-ed');
    return n;
  }
  function jokerEl(j) {
    var d = E.JK[j.k], n = artCard(A.url('j:' + j.k), d.n, 'r' + d.r, j.ed);
    if (j.v && d.val) { var t = d.val(j.v); n.appendChild(el('span', { class: 'val ' + (/^x/.test(t) ? 'm' : /^\$/.test(t) ? 'o' : /Chips|chips/.test(d.d) && /^\+/.test(t) ? 'c' : 'm'), text: t })); }
    if (S() && S().jOff === j.u) n.classList.add('off');
    if (S() && S().jFlip && S().phase === 'play') n.classList.add('down');
    return n;
  }
  function consEl(k, neg) { var d = E.CONS[k]; return artCard(A.url('c:' + k), d.n, 'k-' + d.t + 'c', neg ? 'neg' : null); }
  function voucherEl(k) { return artCard(A.url('v:' + k), E.VOUCHERS[k].n, 'vch'); }
  function packEl(kind, size) { return artCard(A.url('p:' + kind + ':' + size), E.PSIZE[size].n + E.PACKS[kind].n.replace(' Pack', ''), 'pk'); }
  function itemEl(it) {
    if (it.t === 'joker') return jokerEl({ k: it.k, ed: it.ed, v: null });
    if (it.t === 'cons') return consEl(it.k);
    if (it.t === 'voucher') return voucherEl(it.k);
    if (it.t === 'pack') return packEl(it.kind, it.size);
    var c = Object.assign({ id: 'shop' }, it.card); return cardEl(c);
  }

  // ═══ Descriptions for the tooltip ═════════════════════════════════════════
  function cardDesc(c) {
    var ds = [], bd = [];
    if (E.isStone(c)) ds.push(md('{c|+50} Chips. No rank or suit, always scores'));
    else ds.push(md('{c|+' + (E.chipsOf(c) + (c.bc || 0)) + '} chips' + (c.bc ? ' (' + c.bc + ' extra)' : '')));
    if (c.e && c.e !== 'stone') { ds.push('<b>' + E.ENH[c.e].n + '</b><br>' + md(E.ENH[c.e].d)); }
    if (c.ed) ds.push('<b>' + E.EDN[c.ed].n + '</b><br>' + md(c.ed === 'neg' ? '{a|+1} hand size' : E.EDN[c.ed].d));
    if (c.sl) ds.push('<b>' + E.SEAL[c.sl].n + '</b><br>' + md(E.SEAL[c.sl].d));
    if (S() && S().phase === 'play' && E.isDebuffed(c.id)) ds.push('<b class="t-m">Debuffed</b>: scores nothing this round');
    return { title: E.cardName(c), ds: ds, bd: bd };
  }
  function jokerInfo(j) {
    var d = E.JK[j.k], ds = [md(d.d)], bd = [['r' + d.r, E.RARITY[d.r]]];
    var cur = j.v && d.cur ? d.cur(j.v) : j.v && d.val ? 'Currently ' + d.val(j.v) : '';
    if (cur) ds[0] += '<span class="cur">' + esc(cur) + '</span>';
    if (d.copy && S()) {
      var i = S().jokers.indexOf(j), t = d.copy === 'right' ? S().jokers[i + 1] : S().jokers[0];
      ds[0] += '<span class="cur">' + (t && t !== j ? 'Copying ' + esc(E.JK[t.k].n) : 'Nothing to copy') + '</span>';
    }
    if (j.ed) { ds.push('<b>' + E.EDN[j.ed].n + '</b>: ' + md(E.EDN[j.ed].d)); bd.push(['k-ed', E.EDN[j.ed].n]); }
    if (S() && S().jOff === j.u) ds.push('<b class="t-m">Turned off</b> by the Crimson Crown this hand');
    return { title: d.n, ds: ds, bd: bd };
  }
  function consInfo(k, neg) {
    var d = E.CONS[k], ds = [md(d.d)];
    if (d.t === 'planet') { var lv = S() ? S().levels[d.hand] : 1; ds.push('Now level <b>' + lv + '</b>: ' + md('{c|' + E.hChips(d.hand, lv) + '} x {m|' + E.hMult(d.hand, lv) + '}')); }
    if (neg) ds.push(md('{a|Negative}: does not use a slot'));
    return { title: d.n, ds: ds, bd: [['k-' + d.t, d.t === 'tarot' ? 'Tarot' : d.t === 'planet' ? 'Planet' : 'Spectral']] };
  }
  function itemInfo(it) {
    if (it.t === 'joker') return jokerInfo({ k: it.k, ed: it.ed, v: null });
    if (it.t === 'cons') return consInfo(it.k);
    if (it.t === 'voucher') { var v = E.VOUCHERS[it.k]; return { title: v.n, ds: [md(v.d)], bd: [['k-voucher', 'Voucher']] }; }
    if (it.t === 'pack') { var P = E.PACKS[it.kind], z = E.PSIZE[it.size]; return { title: z.n + P.n, ds: [md('Choose {a|' + z.pick + '} of up to {a|' + E.packShow(it.kind, it.size) + '} ' + P.what)], bd: [['k-pack', 'Booster']] }; }
    var c = Object.assign({ id: 'x' }, it.card), inf = cardDesc(c); inf.bd = [['k-card', 'Playing card']]; inf.ds.push('Adds this card to your deck'); return inf;
  }

  // ═══ Tooltip: tap a joker, card, voucher... ══════════════════════════════
  var tipEl = null, tipScrim = null;
  function closeTip() { if (tipEl) { tipEl.remove(); tipEl = null; } if (tipScrim) { tipScrim.remove(); tipScrim = null; } document.querySelectorAll('.sel-on').forEach(function (n) { n.classList.remove('sel-on'); }); }
  // btns: [{label, cls, on, why}] (why: shown greyed with a reason)
  function showTip(anchor, info, btns) {
    closeTip();
    tipScrim = el('div', { class: 'tip-scrim', onpointerdown: function (e) { e.preventDefault(); closeTip(); } });
    var t = el('div', { class: 'tip', role: 'dialog', 'aria-label': info.title }, [el('h4', { text: info.title })]);
    info.ds.forEach(function (h) { t.appendChild(el('div', { class: 'ds', html: h })); });
    if (info.bd && info.bd.length) t.appendChild(el('div', { class: 'bdg' }, info.bd.map(function (b) { return el('span', { class: b[0], text: b[1] }); })));
    var whys = [];
    if (btns && btns.length) {
      t.appendChild(el('div', { class: 'tb' }, btns.map(function (b) {
        var bt = el('button', { type: 'button', class: 'bb ' + (b.cls || ''), html: b.label, onclick: function () { if (b.why) return; closeTip(); b.on(); } });
        if (b.why) { bt.disabled = true; whys.push(b.why); }
        return bt;
      })));
      if (whys.length) t.appendChild(el('div', { class: 'why', text: whys[0] }));
    }
    document.body.appendChild(tipScrim); document.body.appendChild(t); tipEl = t;
    if (anchor && anchor.classList && anchor.classList.contains('jk')) anchor.classList.add('sel-on');
    var r = anchor.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight, vw = innerWidth, vh = innerHeight;
    var x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
    var y = r.bottom + 8; if (y + h > vh - 6) y = r.top - h - 8; if (y < 6) { y = Math.max(6, Math.min(vh - h - 6, r.top)); x = r.right + 8 + w < vw ? r.right + 8 : Math.max(8, r.left - w - 8); }
    t.style.left = x + 'px'; t.style.top = y + 'px';
    Kit.sfx('tap', 0.6); hap('light');
  }

  // ═══ Layout: card sizes from the space available ══════════════════════════
  var R = {};
  function layout() {
    var jr = R.jr; if (!jr || !jr.isConnected) return;
    var bar = document.querySelector('.gbar'), top = bar ? bar.getBoundingClientRect().bottom : 56;
    var cs = getComputedStyle(app), padB = parseFloat(cs.paddingBottom) || 6;
    var H = Math.max(240, innerHeight - top - padB - 2);
    jr.style.setProperty('--jrh', H + 'px');
    var tall = innerWidth >= 600 && innerHeight > innerWidth * 1.1;
    jr.classList.toggle('tall', tall);
    var sb = R.side ? R.side.getBoundingClientRect().width : 200, JW = jr.getBoundingClientRect().width;
    var W = Math.max(240, JW - sb - 10), WH = tall ? JW : W;
    var s = S(), n = Math.max(5, s && s.phase === 'play' ? Math.max(s.hand.length, s.hs || 8) : 8);
    var cwH = (H - 106) / 4.2;
    var cwW = (WH - 10) / (1.1 + 1 + 0.5 * (n - 1));
    var cw = Math.max(38, Math.min(118, cwH, cwW));
    var slots = (s ? E.jslots() + E.cslots() : 7);
    var jw = Math.max(34, Math.min(104, cw * 1.0, (W - 46) / (slots + 0.6)));
    var pw = Math.max(36, Math.min(cw * 0.95, (W - 20) / 5.8));
    var Hm = H - jw * 1.35 - 26, sw = Math.max(jw, Math.min(130, (Hm - 70) / 2 / 1.6, (W - 170) / 5.2));
    jr.style.setProperty('--sw', sw.toFixed(1) + 'px');
    jr.style.setProperty('--cw', cw.toFixed(1) + 'px'); jr.style.setProperty('--jw', jw.toFixed(1) + 'px'); jr.style.setProperty('--pw', pw.toFixed(1) + 'px');
    R.cw = cw;
    placeHand();
  }
  var lt = 0;
  window.addEventListener('resize', function () { clearTimeout(lt); lt = setTimeout(function () { layout(); closeTip(); }, 60); });

  // ═══ Render ══════════════════════════════════════════════════════════════
  var busy = false, sel = [], shopUndo = [], packSel = -1;
  function render() {
    var s = S(); if (!s) return;
    closeTip();
    app.innerHTML = '';
    var full = s.phase !== 'play' && !(s.phase === 'pack' && s.pack && s.pack.hand);
    var jr = el('div', { class: 'jr ph-' + s.phase + (full ? ' full' : '') + (s.phase === 'pack' && !full ? ' packhand' : '') });
    R = { jr: jr, cw: R.cw };
    R.side = el('aside', { class: 'side' }); R.top = el('div', { class: 'top' }); R.mid = el('div', { class: 'mid' });
    R.hnd = el('div', { class: 'hnd' }); R.acts = el('div', { class: 'acts' });
    [R.side, R.top, R.mid, R.hnd, R.acts].forEach(function (n) { jr.appendChild(n); });
    app.appendChild(jr);
    paintSide(); paintTop();
    ({ blind: paintBlinds, play: paintPlay, cashout: paintCash, shop: paintShop, pack: paintPack, over: paintOver })[s.phase]();
    layout();
    JRBg.set(bgFor());
  }

  // ── Sidebar ────────────────────────────────────────────────────────────
  function curBlindInfo() { var s = S(); return E.blindInfo(s.bi); }
  function paintSide() {
    var s = S(), sd = R.side; sd.innerHTML = '';
    var playing = s.phase === 'play';
    if (playing || s.phase === 'over') {
      var info = curBlindInfo(), B = E.activeBoss();
      var bl = el('div', { class: 'pn sb-blind', style: { '--bl': info.color } }, [
        el('div', { class: 'bn', text: info.name }),
        el('div', { class: 'bd' }, [el('img', { alt: '', src: A.url('b:' + (info.kind === 'boss' ? info.key : info.kind)) }),
          el('div', { class: 'pn2 tgt', html: '<small>Score at least</small><b><i class="chipi"></i>' + fmt(s.target || info.target) + '</b><i>Reward: <em>' + '$'.repeat(info.reward) + '</em></i>' })])
      ]);
      if (info.boss && playing) bl.appendChild(el('div', { class: 'note', text: B ? info.boss.d : 'Turned off' }));
      sd.appendChild(bl);
    } else {
      var t = { blind: ['Choose your', 'next Blind'], cashout: ['Blind', 'defeated'], shop: ['Shop', 'Improve your run'], pack: ['Booster', 'Pick your cards'] }[s.phase] || ['', ''];
      sd.appendChild(el('div', { class: 'pn sb-blind phase' }, [el('div', { class: 'ph', html: esc(t[0]) + '<small>' + esc(t[1]) + '</small>' })]));
    }
    R.score = el('div', { class: 'pn2 val', html: '<i class="chipi"></i>' + fmt(playing || s.phase === 'over' ? s.score : 0) });
    sd.appendChild(el('div', { class: 'pn sb-score' }, [el('span', { text: 'Round score' }), R.score]));
    R.hn = el('div', { class: 'hn', html: '&nbsp;' });
    R.chips = el('div', { class: 'bx c', text: '0' }); R.mult = el('div', { class: 'bx m', text: '0' });
    R.cm = el('div', { class: 'cmx' }, [R.chips, el('span', { class: 'x', text: 'X' }), R.mult]);
    sd.appendChild(el('div', { class: 'pn sb-hand' }, [R.hn, R.cm]));
    R.sh = el('b', { text: String(playing ? s.hands : E.maxHands()) });
    R.sd = el('b', { text: String(playing ? s.discards : E.maxDisc()) });
    R.sm = el('b', { text: '$' + s.money });
    sd.appendChild(el('div', { class: 'sb-grid' }, [
      el('button', { type: 'button', class: 'bb runb', html: Kit.icon('chart') + '<span>Run<br>Info</span>', onclick: function () { if (!busy) runInfo(); } }),
      el('div', { class: 'pn stat h' }, [el('small', { text: 'Hands' }), R.sh]),
      el('div', { class: 'pn stat d' }, [el('small', { text: 'Discards' }), R.sd]),
      el('div', { class: 'pn stat mo' }, [R.sm]),
      el('div', { class: 'pn stat an' }, [el('small', { text: 'Ante' }), el('b', { html: s.ante + (s.ante <= 8 ? '<small>/8</small>' : '') })]),
      el('div', { class: 'pn stat rd', style: { 'grid-column': '2 / 4' } }, [el('small', { text: 'Round' }), el('b', { text: String(s.round) })])
    ]));
  }
  function setMoney(v, bump) { if (!R.sm) return; R.sm.textContent = '$' + (v == null ? S().money : v); if (bump) retrig(R.sm, 'bump'); }
  function setCM(c, m, which) {
    R.chips.textContent = fmt(c); R.mult.textContent = m >= 1e5 ? fmt(m) : fx(Math.round(m * 100) / 100);
    if (which === 'c') retrig(R.chips, 'bump'); else if (which === 'm') retrig(R.mult, 'bump'); else if (which === 'b') { retrig(R.chips, 'bump'); retrig(R.mult, 'bump'); }
  }
  function retrig(n, cls) { if (!n) return; n.classList.remove(cls); void n.offsetWidth; n.classList.add(cls); }

  // ── Jokers and consumables row ────────────────────────────────────────
  function paintTop() {
    var s = S(), t = R.top; t.innerHTML = ''; R.jEls = []; R.cEls = [];
    var jrow = el('div', { class: 'area jrow' }), row = el('div', { class: 'row' });
    s.jokers.forEach(function (j, i) {
      var slot = el('div', { class: 'slot' }), n = jokerEl(j);
      slot.appendChild(n); row.appendChild(slot); R.jEls.push(n);
      dragRow(slot, row, 'joker', function () { openJoker(n, j); });
    });
    if (!s.jokers.length) row.appendChild(el('div', { class: 'empty', text: 'Jokers' }));
    jrow.appendChild(row); jrow.appendChild(el('span', { class: 'cnt', text: s.jokers.length + '/' + E.jslots() }));
    var crow = el('div', { class: 'area crow' }), crw = el('div', { class: 'row' });
    s.cons.forEach(function (c, i) {
      var n = consEl(c.k, c.neg); R.cEls.push(n);
      n.addEventListener('click', function () { if (!busy) openCons(n, i); });
      crw.appendChild(el('div', { class: 'slot' }, [n]));
    });
    if (!s.cons.length) crw.appendChild(el('div', { class: 'empty', text: 'Cards' }));
    crow.style.minWidth = 'calc(var(--jw) * ' + E.cslots() + ' + ' + (E.cslots() * 4 + 16) + 'px)';
    crow.appendChild(crw); crow.appendChild(el('span', { class: 'cnt', text: s.cons.length + '/' + E.cslots() }));
    t.appendChild(jrow); t.appendChild(crow);
  }
  function openJoker(n, j) {
    if (busy) return;
    var s = S(), i = s.jokers.indexOf(j); if (i < 0) return;
    var canSell = s.phase !== 'over';
    showTip(n, jokerInfo(j), canSell ? [{ label: 'Sell <small>$' + E.sellValue(j) + '</small>', cls: 'green', on: function () {
      shopSnap(); var v = E.sellJoker(i); Kit.sfx('chip'); hap('medium'); popAt(n, '+$' + v, 'o'); drainNotes(); save(); afterChange(); } }] : null);
  }
  function openCons(n, i) {
    var s = S(), c = s.cons[i]; if (!c) return;
    var why = E.consCheck(c.k, selForCons(), true);
    showTip(n, consInfo(c.k, c.neg), s.phase === 'over' ? null : [
      { label: 'Use', cls: 'red', why: why, on: function () { useConsumable(i, n); } },
      { label: 'Sell <small>$' + E.consSell(c) + '</small>', cls: 'green', on: function () { shopSnap(); var v = E.sellCons(i); Kit.sfx('chip'); hap('medium'); popAt(n, '+$' + v, 'o'); save(); afterChange(); } }]);
  }
  function selForCons() { var s = S(); return s.phase === 'play' || (s.phase === 'pack' && s.pack && s.pack.hand) ? sel.slice() : []; }
  // after a sale, use, buy: repaint what's on screen without losing the hand
  function afterChange() {
    var s = S();
    if (s.phase === 'play') { paintSide(); paintTop(); paintHand(); paintActs(); preview(); layout(); }
    else render();
  }

  // ═══ Drag to reorder (jokers), tap to inspect ══════════════════════════════
  function dragRow(slot, row, kind, onTap) {
    var st = null;
    slot.addEventListener('pointerdown', function (e) {
      if (busy || e.button > 0) return;
      st = { x: e.clientX, y: e.clientY, id: e.pointerId, drag: false, dx: 0 };
      try { slot.setPointerCapture(e.pointerId); } catch (er) {}
    });
    slot.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return;
      var dx = e.clientX - st.x;
      if (!st.drag && Math.abs(dx) > 8) { st.drag = true; slot.classList.add('drag'); closeTip(); Kit.sfx('tap', 0.5); }
      if (!st.drag) return;
      slot.style.transform = 'translateX(' + dx + 'px)';
      // move the slot in the row when its centre passes a neighbour's
      var sibs = Array.prototype.slice.call(row.children).filter(function (n) { return n.classList.contains('slot'); });
      var me = slot.getBoundingClientRect(), cx = me.left + me.width / 2, idx = sibs.indexOf(slot);
      sibs.forEach(function (o, k) {
        if (o === slot) return; var r = o.getBoundingClientRect(), oc = r.left + r.width / 2;
        if ((k > idx && cx > oc) || (k < idx && cx < oc)) {
          var before = slot.getBoundingClientRect().left - dx;
          if (k > idx) row.insertBefore(slot, o.nextSibling); else row.insertBefore(slot, o);
          slot.style.transform = 'none';
          var after = slot.getBoundingClientRect().left;
          st.x += after - before; slot.style.transform = 'translateX(' + (e.clientX - st.x) + 'px)';
          idx = Array.prototype.slice.call(row.children).filter(function (n) { return n.classList.contains('slot'); }).indexOf(slot);
          Kit.sfx('slide'); hap('tick');
        }
      });
    });
    function end(e) {
      if (!st || e.pointerId !== st.id) return;
      var was = st; st = null;
      slot.classList.remove('drag'); slot.style.transform = '';
      if (!was.drag) { if (e.type === 'pointerup') onTap(); return; }
      var order = Array.prototype.slice.call(row.children).filter(function (n) { return n.classList.contains('slot'); });
      var els = order.map(function (n) { return n.firstChild; });
      var s = S(), newJ = els.map(function (n) { return s.jokers[R.jEls.indexOf(n)]; }).filter(Boolean);
      if (newJ.length === s.jokers.length) { shopSnap(); s.jokers = newJ; R.jEls = els; save(); }
      Kit.sfx('deal'); hap('light');
    }
    slot.addEventListener('pointerup', end); slot.addEventListener('pointercancel', end);
  }
  // 3D tilt toward your finger or pointer (one card at a time, drawn at most once a frame)
  var tiltEl = null, tiltRaf = 0, tiltEv = null;
  function tilt() {
    tiltRaf = 0; var e = tiltEv; if (!e) return;
    var t = e.target && e.target.closest ? e.target.closest('.jk, .pcard.jc') : null;
    if (tiltEl && tiltEl !== t) { tiltEl.style.removeProperty('--tx'); tiltEl.style.removeProperty('--ty'); tiltEl = null; }
    if (!t || t.closest('.deck')) return;
    var r = t.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    if (Math.abs(px) > 0.8 || Math.abs(py) > 0.8) return;
    t.style.setProperty('--tx', (px * 22).toFixed(1) + 'deg'); t.style.setProperty('--ty', (-py * 22).toFixed(1) + 'deg'); tiltEl = t;
  }
  document.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch' && !e.buttons) return; tiltEv = e; if (!tiltRaf) tiltRaf = requestAnimationFrame(tilt); }, { passive: true });
  document.addEventListener('pointerup', function () { if (tiltEl) { tiltEl.style.removeProperty('--tx'); tiltEl.style.removeProperty('--ty'); tiltEl = null; } }, { passive: true });

  // ═══ Blind select ═════════════════════════════════════════════════════════
  function paintBlinds() {
    var s = S(), wrap = el('div', { class: 'bls' });
    for (var i = 0; i < 3; i++) (function (i) {
      var info = E.blindInfo(i), cur = i === s.bi, done = i < s.bi;
      var c = el('div', { class: 'pn blc ' + (cur ? 'cur' : done ? 'done' : 'fut'), style: { '--bl': info.color } });
      if (cur) c.appendChild(el('button', { type: 'button', class: 'bb go', text: 'Select', onclick: onSelectBlind }));
      else c.appendChild(el('div', { class: 'st', text: done ? (s.skipped[i] ? 'Skipped' : 'Defeated') : 'Upcoming' }));
      c.appendChild(el('div', { class: 'nm', text: info.name }));
      c.appendChild(el('img', { class: 'ch', alt: '', src: A.url('b:' + (info.kind === 'boss' ? info.key : info.kind)) }));
      if (info.boss) c.appendChild(el('div', { class: 'bd2', text: info.boss.d }));
      c.appendChild(el('div', { class: 'pn2 tg', html: '<small>Score at least</small><b><i class="chipi"></i>' + fmt(info.target) + '</b><i>Reward: <em>' + '$'.repeat(info.reward) + '</em></i>' }));
      if (i < 2 && !done) {
        var tag = s.tags[i], T = E.TAGS[tag.k];
        var tb = el('button', { type: 'button', class: 'tagb', 'aria-label': T.n, html: '<img alt="" src="' + A.url('t:' + tag.k) + '">' });
        tb.addEventListener('click', function () { showTip(tb, tagInfo(tag), null); });
        var sk = el('div', { class: 'sk' }, [el('span', { class: 'or', text: 'or' }), el('button', { type: 'button', class: 'bb green', text: 'Skip Blind', onclick: onSkip }), tb]);
        if (!cur) sk.querySelector('.bb').disabled = true;
        c.appendChild(sk);
      } else if (done) c.appendChild(el('span', { class: 'stamp' + (s.skipped[i] ? ' skp' : ''), text: s.skipped[i] ? 'Skipped' : 'Beaten' }));
      if (i === 2 && (E.hasV('swap') || E.hasV('bossroll'))) {
        var rb = el('button', { type: 'button', class: 'bb red rrb', html: 'Reroll Boss <small>$10</small>', onclick: function () { var n = E.rerollBoss(); if (n) { Kit.sfx('roll'); Kit.callout(n); save(); render(); } } });
        rb.disabled = !E.canRerollBoss(); c.appendChild(rb);
      }
      wrap.appendChild(c);
    })(i);
    R.mid.appendChild(wrap);
  }
  function tagInfo(t) {
    var T = E.TAGS[t.k], d = T.d;
    if (t.k === 'orbital') d = 'Levels up {a|' + E.HMAP[t.h].n + '} by {a|3}';
    return { title: T.n, ds: [md(d)], bd: [['k-voucher', 'Skip tag']] };
  }
  function onSelectBlind() {
    if (busy) return;
    shopUndo = []; sel = [];
    var notes = E.startBlind();
    Kit.sfx('deal'); hap('medium'); save();
    render();
    var B = E.activeBoss();
    if (B) { Kit.callout(B.n); JRBg.kick(5); Kit.sfx('boom', 0.6); }
    showNotes(notes);
    drainNotes();
  }
  function onSkip() {
    if (busy) return;
    var s = S(), t = s.tags[s.bi];
    var r = E.skipBlind(); if (!r) return;
    Kit.sfx('good'); hap('success'); Kit.callout(E.TAGS[t.k].n);
    if (r.msg) Kit.toast(r.msg, 2400);
    save(); render();
  }
  function showNotes(notes) {
    (notes || []).forEach(function (nt, k) {
      setTimeout(function () {
        var s = S(), i = s.jokers.findIndex(function (j) { return j.u === nt.u; }), n = i >= 0 && R.jEls ? R.jEls[i] : null;
        if (n) { retrig(n, 'wig'); popAt(n, nt.txt, 'a', true); Kit.sfx('pop', 0.6); }
        else if (nt.txt) Kit.toast(nt.txt);
      }, 250 + k * 280);
    });
  }
  function drainNotes() { var s = S(); if (s && s.fxq && s.fxq.length) { var q = s.fxq; s.fxq = []; showNotes(q); } }

  // ═══ Popups ═══════════════════════════════════════════════════════════════
  function popAt(target, text, kind, under) {
    if (!target || !target.getBoundingClientRect) return;
    var r = target.getBoundingClientRect();
    var n = el('div', { class: 'pop ' + kind + (under ? ' under' : ''), text: text });
    n.style.left = (r.left + r.width / 2) + 'px';
    n.style.top = (under ? r.bottom + 2 : r.top - 2) + 'px';
    n.style.setProperty('--pd', Math.max(0.35, 0.75 / speed * (fast ? 0.5 : 1)) + 's');
    fxl.appendChild(n);
    setTimeout(function () { n.remove(); }, 900 / Math.min(speed, 2) + 100);
  }

  // ═══ The round: play area, hand, buttons ══════════════════════════════════
  function paintPlay() {
    var s = S(), info = curBlindInfo();
    if (info.boss) {
      var off = !E.activeBoss();
      R.mid.appendChild(el('div', { class: 'boss' + (off ? ' off' : ''), style: { '--bcol': info.color }, html: '<img alt="" src="' + A.url('b:' + info.key) + '"><span>' + esc(info.name) + ': ' + esc(info.boss.d) + '</span>' }));
    }
    R.played = el('div', { class: 'played' });
    R.mid.appendChild(R.played);
    R.mid.addEventListener('click', function () { if (busy) fast = true; });
    paintHand(); paintActs(); preview();
  }
  function paintHand(fresh) {
    var s = S(), hand = E.curHand(), hEl = el('div', { class: 'hand' });
    R.hnd.innerHTML = ''; R.hEls = {};
    var opt = E.optNow(), B = E.activeBoss();
    fresh = fresh || s.fresh || [];
    hand.forEach(function (id) {
      var c = C(id); if (!c) return;
      var down = s.phase === 'play' && !!s.fd[id];
      var pc = cardEl(c, { down: down, deb: s.phase === 'play' && !down && E.isDebuffed(id) });
      if (s.forced === id && s.phase === 'play') pc.classList.add('forced');
      var cd = el('div', { class: 'cd' + (sel.indexOf(id) >= 0 ? ' sel' : '') + (fresh.indexOf(id) >= 0 ? ' deal' : '') }, [pc]);
      cd.dataset.id = id;
      handInput(cd, id);
      R.hEls[id] = cd; hEl.appendChild(cd);
    });
    R.hand = hEl; R.hnd.appendChild(hEl);
    R.hcount = el('div', { class: 'hcount' }); R.hnd.appendChild(R.hcount); countSel();
    // the deck: tap to see what's left
    var dk = el('button', { type: 'button', class: 'deck', 'aria-label': 'Deck: see the cards left', onclick: function () { if (!busy) showDeck(); } });
    for (var k = 0; k < 3; k++) { var b = cardEl({ id: 'dk' + k, r: 'A', s: 's' }, { down: true }); dk.appendChild(b); }
    R.deckN = el('span', { class: 'dn', text: (s.phase === 'play' ? s.draw.length : s.deck.length) + '/' + s.deck.length });
    dk.appendChild(R.deckN);
    R.deck = dk; R.hnd.appendChild(dk);
    s.fresh = [];
    placeHand(fresh);
  }
  function countSel() {
    if (R.hcount && S().phase === 'pack') { R.hcount.innerHTML = sel.length ? '<b>' + sel.length + '</b> selected: now tap a card above to use it' : 'Select cards here, then tap a card above to use it on them'; return; }
    if (R.hcount) R.hcount.innerHTML = sel.length ? '<b>' + sel.length + '</b>/5 selected' : E.curHand().length + '/' + (S().hs || E.handSizeNow()) + ' in hand'; }
  // fan the hand: a gentle arc, overlapping when space is short
  function placeHand(fresh) {
    if (!R.hand || !R.hand.isConnected) return;
    var ids = E.curHand().filter(function (id) { return R.hEls[id]; }), n = ids.length; if (!n) return;
    var W = R.hand.getBoundingClientRect().width, cw = R.cw || 60;
    var gap = n > 1 ? Math.min(cw * 1.04, (W - cw - 4) / (n - 1)) : 0;
    var dr = R.deck ? R.deck.getBoundingClientRect() : null, hr = R.hand.getBoundingClientRect();
    ids.forEach(function (id, i) {
      var t = n > 1 ? (i - (n - 1) / 2) / ((n - 1) / 2) : 0;
      var cd = R.hEls[id];
      cd.style.setProperty('--hx', ((i - (n - 1) / 2) * gap).toFixed(1) + 'px');
      cd.style.setProperty('--hy', (t * t * cw * 0.045).toFixed(1) + 'px');
      cd.style.setProperty('--hr', (t * Math.min(7, n * 0.9)).toFixed(2) + 'deg');
      cd.style.zIndex = String(i + 1);
      if (fresh && fresh.indexOf(id) >= 0 && dr) {
        cd.style.setProperty('--dx', (dr.left - (hr.left + hr.width / 2 - cw / 2)).toFixed(0) + 'px');
        cd.style.setProperty('--dy', (dr.top - (hr.bottom - cw * 1.36)).toFixed(0) + 'px');
        cd.style.animationDelay = (fresh.indexOf(id) * 55 / speed) + 'ms';
        cd.addEventListener('animationend', function () { cd.classList.remove('deal'); cd.style.animationDelay = ''; }, { once: true });
      }
    });
  }
  // tap: select. drag sideways: reorder (cards score left to right). hold: details.
  function handInput(cd, id) {
    var st = null, lp = 0;
    cd.addEventListener('pointerdown', function (e) {
      if (busy || e.button > 0) return;
      st = { x: e.clientX, y: e.clientY, id: e.pointerId, drag: false, long: false };
      try { cd.setPointerCapture(e.pointerId); } catch (er) {}
      clearTimeout(lp);
      lp = setTimeout(function () { if (st && !st.drag) { st.long = true; var c = C(id); if (c && !(S().fd[id] && S().phase === 'play')) showTip(cd, cardDesc(c), null); } }, 480);
    });
    cd.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return;
      var dx = e.clientX - st.x;
      if (!st.drag && Math.abs(dx) > 10) { st.drag = true; clearTimeout(lp); cd.classList.add('drag'); }
      if (!st.drag) return;
      var hand = E.curHand(), n = hand.length, cw = R.cw || 60, W = R.hand.getBoundingClientRect().width;
      var gap = n > 1 ? Math.min(cw * 1.04, (W - cw - 4) / (n - 1)) : 1;
      var base = parseFloat(cd.style.getPropertyValue('--hx')) || 0;
      cd.style.transform = 'translate(' + (base + dx) + 'px,' + (sel.indexOf(id) >= 0 ? -cw * 0.26 : 0) + 'px)';
      var from = hand.indexOf(id), to = Math.max(0, Math.min(n - 1, Math.round((base + dx) / gap + (n - 1) / 2)));
      if (to !== from) {
        hand.splice(from, 1); hand.splice(to, 0, id);
        var nb = (to - (n - 1) / 2) * gap; st.x += nb - base; cd.style.setProperty('--hx', nb + 'px');
        placeHand(); Kit.sfx('slide'); hap('tick');
      }
    });
    function end(e) {
      if (!st || e.pointerId !== st.id) return;
      clearTimeout(lp);
      var was = st; st = null;
      if (was.drag) { cd.classList.remove('drag'); cd.style.transform = ''; placeHand(); save(); preview(); return; }
      if (was.long || e.type !== 'pointerup') return;
      toggleSel(id);
    }
    cd.addEventListener('pointerup', end); cd.addEventListener('pointercancel', end);
  }
  function toggleSel(id) {
    if (busy) return;
    var s = S();
    if (s.forced === id && s.phase === 'play') { Kit.toast('Azure Chime: this card stays selected'); return; }
    var i = sel.indexOf(id);
    if (i >= 0) sel.splice(i, 1);
    else { if (sel.length >= 5) { Kit.sfx('bad', 0.5); hap('error'); retrig(R.hcount, 'bump'); return; } sel.push(id); }
    var cd = R.hEls[id]; if (cd) cd.classList.toggle('sel', sel.indexOf(id) >= 0);
    Kit.sfx(i >= 0 ? 'tap' : 'flip', 0.7); hap('light');
    countSel(); paintActs(); preview();
  }
  function ordered(ids) { return E.curHand().filter(function (id) { return ids.indexOf(id) >= 0; }); }
  // live hand name, level and chips x mult as you select
  function preview() {
    var s = S(); if (!R.hn || busy) return;
    R.cm.classList.remove('fire');
    if (s.phase !== 'play' || !sel.length) { R.hn.innerHTML = '&nbsp;'; R.hn.classList.remove('tot'); setCM(0, 0); return; }
    if (sel.some(function (id) { return s.fd[id]; })) { R.hn.innerHTML = '????'; setCM(0, 0); return; }
    var r = E.score(ordered(sel), false);
    R.hn.classList.remove('tot');
    R.hn.innerHTML = esc(E.HMAP[r.hand].n) + ' <small>lvl.' + r.level + '</small>';
    if (r.notAllowed) R.hn.innerHTML = '<span class="t-m">Not allowed</span>';
    setCM(r.bc, r.bm, null);
  }
  function paintActs() {
    var s = S(), a = R.acts; a.innerHTML = '';
    if (s.phase === 'pack') { paintPackActs(); return; }
    var B = E.activeBoss(), forcedOk = !s.forced || sel.indexOf(s.forced) >= 0;
    var play = el('button', { type: 'button', class: 'bb blue big', html: 'Play Hand', onclick: onPlay });
    play.disabled = busy || !sel.length || !forcedOk;
    var disc = el('button', { type: 'button', class: 'bb red big', html: 'Discard', onclick: onDiscard });
    disc.disabled = busy || !sel.length || s.discards <= 0;
    var sortb = el('div', { class: 'pn sortb' }, [el('small', { text: 'Sort Hand' }), el('div', null, [
      el('button', { type: 'button', class: 'bb', text: 'Rank', onclick: function () { sortBy('rank'); } }),
      el('button', { type: 'button', class: 'bb', text: 'Suit', onclick: function () { sortBy('suit'); } })])]);
    a.appendChild(play); a.appendChild(sortb); a.appendChild(disc);
  }
  function sortBy(m) {
    if (busy) return;
    var s = S(); s.sort = m;
    if (s.phase === 'pack' && s.pack && s.pack.hand) { var keep = s.hand; s.hand = s.pack.hand; E.sortHand(); s.pack.hand = s.hand; s.hand = keep; }
    else E.sortHand();
    Kit.sfx('slide'); placeHand(); save(); preview();
  }

  // ═══ Playing a hand: the scoring show ═════════════════════════════════════
  var token = 0;
  function onPlay() {
    if (busy || !sel.length) return;
    var s = S(), ids = ordered(sel);
    if (s.forced && ids.indexOf(s.forced) < 0) { Kit.toast('The chimed card must be played'); return; }
    var snap = {}; ids.forEach(function (id) { snap[id] = JSON.parse(JSON.stringify(C(id))); });
    var rects = {}; ids.forEach(function (id) { if (R.hEls[id]) rects[id] = R.hEls[id].firstChild.getBoundingClientRect(); });
    var pre = { score: s.score, money: s.money, target: s.target, jokers: s.jokers.slice(), hand: s.hand.slice() };
    var res = E.play(ids);
    sel = [];
    save();
    showPlay(res, snap, rects, pre);
  }
  async function showPlay(res, snap, rects, pre) {
    busy = true; fast = false; var tok = ++token; closeTip();
    var s = S();
    paintActs();
    // jokers as they were while scoring (some may be used up after)
    var jEls = R.jEls.slice();
    // 1. the played cards slide to the middle
    var pEls = {};
    R.played.innerHTML = '';
    res.played.forEach(function (id) {
      var c = snap[id], pc = cardEl(c, {}), cd = el('div', { class: 'cd' }, [pc]);
      pEls[id] = cd; R.played.appendChild(cd);
      var h = R.hEls[id]; if (h) h.classList.add('fly');
    });
    // the held cards close up
    var held = pre.hand.filter(function (id) { return res.played.indexOf(id) < 0; });
    res.played.forEach(function (id) { var r = rects[id], cd = pEls[id]; if (!r) return; var to = cd.getBoundingClientRect(); cd.style.transition = 'none'; cd.style.transform = 'translate(' + (r.left - to.left) + 'px,' + (r.top - to.top) + 'px)'; });
    void R.played.offsetWidth;
    res.played.forEach(function (id, k) { var cd = pEls[id]; cd.style.transition = 'transform ' + (0.3 / speed) + 's cubic-bezier(.22,1,.36,1) ' + (k * 0.04 / speed) + 's'; cd.style.transform = ''; });
    Kit.sfx('deal'); hap('light');
    placeHand();
    await D(340); if (tok !== token) return;
    res.played.forEach(function (id) { pEls[id].style.transition = ''; pEls[id].classList.add(res.scoring.indexOf(id) >= 0 ? 'up' : 'no'); });
    // 2. the hand and its base chips x mult
    R.hn.innerHTML = esc(E.HMAP[res.hand].n) + ' <small>lvl.' + res.level + '</small>';
    setCM(res.bc, res.bm, 'b');
    Kit.sfx('pop', 0.8);
    await D(300); if (tok !== token) return;
    if (res.notAllowed) {
      R.played.parentNode.appendChild(el('div', { class: 'msg na', text: 'Not allowed! ' + res.notAllowed }));
      Kit.sfx('bad'); hap('error'); await D(900);
    }
    // 3. every event, in order
    var step = 0, money = pre.money;
    for (var i = 0; i < res.events.length; i++) {
      if (tok !== token) return;
      var e = res.events[i], jel = e.j != null ? jEls[e.j] : null, cardT = e.id ? (pEls[e.id] || R.hEls[e.id]) : null;
      var cardFace = cardT ? cardT.firstChild : null;
      if (e.k === 'up') { if (jel) { retrig(jel, 'wig'); popAt(jel, e.txt || 'Upgrade', 'a', true); } refreshPlayed(res, pEls); Kit.sfx('sparkle', 0.6); await D(260); continue; }
      if (e.k === 'debuff') { popAt(cardFace, 'Debuffed', 'g'); Kit.sfx('bad', 0.5); await D(220); continue; }
      if (e.k === 'again') { if (jel) retrig(jel, 'wig'); popAt(cardFace, 'Again!', 'a'); Kit.sfx('whoosh', 0.6); await D(220); continue; }
      if (e.k === 'off') { popAt(jel, 'Off', 'g', true); await D(160); continue; }
      if (e.k === 'make') { if (jel) retrig(jel, 'wig'); popAt(jel || cardFace, e.txt, 'p', !!jel); Kit.sfx('sparkle', 0.7); await D(240); continue; }
      if (e.k === 'note') { if (jel) retrig(jel, 'wig'); popAt(jel, e.txt, 'a', true); await D(160); continue; }
      // chips / mult / xmult / money
      var kind = e.x ? 'x' : e.mult ? 'm' : e.chips ? 'c' : 'o';
      var txt = e.x ? 'X' + fx(e.x) + ' Mult' : e.mult ? '+' + fmt(e.mult) + ' Mult' : e.chips ? '+' + fmt(e.chips) : '$' + e.money;
      if (e.chips && e.mult) txt = '+' + fmt(e.chips) + ' +' + fmt(e.mult) + ' Mult';
      var at = e.k === 'joker' || e.k === 'cons' ? (e.k === 'cons' ? R.cEls[e.ci] : jel) : cardFace;
      if (cardFace && (e.k === 'card' || e.k === 'held')) retrig(cardFace, 'hit');
      if (jel) retrig(jel, 'wig');
      popAt(e.j != null && e.k !== 'joker' ? jel : at, txt, kind, e.j != null || e.k === 'joker' || e.k === 'cons');
      if (e.money) { money += e.money; setMoney(money, true); Kit.sfx('chip'); }
      else blip(step, kind === 'x' ? 'x' : kind === 'm' ? 'm' : 'c');
      if (e.x) { Kit.sfx('clash', 0.5); if (e.x >= 2) JRBg.kick(3); }
      hap(e.x ? 'medium' : 'tick');
      if (!e.money) setCM(e.c, e.m, kind === 'c' ? 'c' : 'm');
      step++;
      await D(Math.max(110, (e.k === 'joker' ? 300 : 250) - step * 6));
    }
    if (tok !== token) return;
    // 4. chips x mult = the score, with flames when one hand clears the blind
    var hot = res.total >= pre.target;
    R.cm.style.setProperty('--heat', String(Math.min(2.5, res.total / Math.max(1, pre.target))));
    R.cm.classList.toggle('fire', hot);
    R.hn.classList.add('tot'); R.hn.innerHTML = '<i class="chipi"></i>' + fmt(res.total);
    retrig(R.hn, 'bump');
    var bt = el('div', { class: 'bigtot', text: fmt(res.total) }), pr = R.played.getBoundingClientRect();
    bt.style.left = (pr.left + pr.width / 2) + 'px'; bt.style.top = (pr.top - 6) + 'px';
    if (res.total > 0) { fxl.appendChild(bt); setTimeout(function () { bt.remove(); }, 1000); }
    Kit.sfx(hot ? 'boom' : 'chip', hot ? 0.8 : 1); hap(hot ? 'heavy' : 'medium');
    if (hot) JRBg.kick(6);
    await D(420); if (tok !== token) return;
    await tick(R.score, pre.score, pre.score + res.total, tok);
    if (tok !== token) return;
    // 5. after the hand: glass breaks, jokers used up, taxes
    if (res.broken.length) { res.broken.forEach(function (id) { if (pEls[id]) { pEls[id].classList.add('broke'); } }); Kit.sfx('clash'); hap('heavy'); await D(420); }
    res.gone.forEach(function (g) { var k = pre.jokers.findIndex(function (j) { return j.u === g.u; }); var n = jEls[k]; if (n) { popAt(n, 'Gone', 'g', true); n.style.transition = 'opacity .4s,transform .4s'; n.style.opacity = '0'; n.style.transform = 'scale(.5)'; } Kit.toast(g.txt); });
    (res.made || []).forEach(function () { Kit.sfx('sparkle'); });
    if (res.tax) { popAt(R.sm, '-$' + res.tax, 'g'); }
    if (res.yoke != null) { popAt(R.sm, 'The Yoke: $0', 'g'); Kit.sfx('bad'); }
    setMoney(S().phase === 'cashout' ? pre.money + res.money - (res.tax || 0) : null);
    if (res.saved) { Kit.callout('Saved by Lucky Bones!'); Kit.sfx('good'); }
    if (res.outcome === 'win') { Kit.sfx('good'); hap('success'); }
    else if (res.outcome === 'lose') { Kit.sfx('lose'); hap('error'); }
    await D(res.outcome === 'go' ? 260 : 600);
    if (tok !== token) return;
    // 6. played cards leave, new cards deal in
    Object.keys(pEls).forEach(function (k, n) { setTimeout(function () { pEls[k].classList.add('gone'); }, n * 40 / speed); });
    if (res.clawed) res.clawed.forEach(function (id) { var h = R.hEls[id]; if (h) h.classList.add('away'); });
    Kit.sfx('whoosh', 0.7);
    await D(360);
    if (tok !== token) return;
    busy = false;
    R.cm.classList.remove('fire');
    if (res.outcome === 'lose') { render(); endRun(false); return; }
    if (res.outcome === 'win') {
      if (S().winPending) { S().winPending = false; save(); render(); winRun(); return; }
      render(); return;
    }
    paintSide(); paintTop(); paintHand(); paintActs(); preview(); layout();
    drainNotes();
  }
  // cards whose look changed during scoring (Midas gold, Leech...)
  function refreshPlayed(res, pEls) {
    res.played.forEach(function (id) { var c = C(id), cd = pEls[id]; if (!c || !cd) return; var n = cardEl(c, {}); cd.replaceChild(n, cd.firstChild); });
  }
  // count a number up, at most ~60 draws a second
  function tick(node, from, to, tok) {
    return new Promise(function (done) {
      if (!node) return done();
      var t0 = performance.now(), dur = (fast || REDUCE ? 200 : Math.min(1000, 380 + Math.log10(Math.max(10, to - from)) * 110)) / speed, last = 0, k = 0, lastBlip = 0;
      (function f(now) {
        if (tok !== token) return done();
        if (now - last >= 12) {
          last = now;
          var p = Math.min(1, (now - t0) / dur), ez = 1 - Math.pow(1 - p, 3);
          node.innerHTML = '<i class="chipi"></i>' + fmt(from + (to - from) * ez);
          if (now - lastBlip > 70 && p < 1) { lastBlip = now; blip(8 + k++, 'c'); }
          if (p >= 1) { retrig(node, 'bump'); return done(); }
        }
        requestAnimationFrame(f);
      })(t0);
    });
  }
  function onDiscard() {
    if (busy || !sel.length) return;
    var s = S(); if (s.discards <= 0) return;
    var ids = ordered(sel);
    busy = true; closeTip();
    ids.forEach(function (id) { var n = R.hEls[id]; if (n) n.classList.add('away'); });
    Kit.sfx('whoosh'); hap('light');
    var r = E.discard(ids);
    sel = []; save();
    setTimeout(function () {
      busy = false;
      if (r && r.lose) { render(); endRun(false); return; }
      paintSide(); paintTop(); paintHand(); paintActs(); preview(); layout();
      if (r) showNotes(r.notes.filter(function (n) { return n.u; }));
      if (r && r.made.length) { Kit.toast('Purple Seal: +' + r.made.length + ' Tarot'); Kit.sfx('sparkle'); }
    }, 300 / speed);
  }

  // ═══ Cash out ═════════════════════════════════════════════════════════════
  function paintCash() {
    var s = S(), c = s.cash, box = el('div', { class: 'pn cash' });
    box.appendChild(el('button', { type: 'button', class: 'bb big', html: 'Cash Out: <span class="t-o" style="color:#fff">$' + c.total + '</span>', onclick: onCollect }));
    c.lines.forEach(function (l, k) {
      var am = l.dollars || l.k === 'blind' ? '$'.repeat(Math.min(l.amt, 10)) : '$' + l.amt;
      var row = el('div', { class: 'ln' + (l.k === 'blind' ? ' blind' : ''), style: { 'animation-delay': (k * 0.18 / speed) + 's' } }, [
        el('div', { class: 'lb', html: (l.k === 'blind' ? '<i class="chipi"></i>' : '') + esc(l.label) + (l.sub ? '<small>' + esc(l.sub) + '</small>' : '') }),
        el('span', { class: 'am', text: am })]);
      box.appendChild(row);
      setTimeout(function () { if (row.isConnected) Kit.sfx('chip', 0.6); }, k * 180 / speed + 60);
    });
    (c.notes || []).forEach(function (t) { box.appendChild(el('div', { class: 'note', text: t })); });
    R.mid.appendChild(box);
  }
  function onCollect() {
    if (busy) return;
    var s = S(), from = s.money;
    E.collect(); shopUndo = [];
    Kit.sfx('chip'); setTimeout(function () { Kit.sfx('chip'); }, 90); hap('success');
    save(); render();
    var to = S().money, t = ++token;
    (function step(k) { if (t !== token || !R.sm) return; var v = Math.round(from + (to - from) * k / 6); setMoney(v, k === 6); if (k < 6) setTimeout(function () { step(k + 1); }, 45); })(1);
  }

  // ═══ Shop ═════════════════════════════════════════════════════════════════
  function shopSnap() { var s = S(); if (s && (s.phase === 'shop' || (s.phase === 'pack' && s.pack && s.pack.back === 'shop'))) { shopUndo.push(JSON.stringify(s)); if (shopUndo.length > 25) shopUndo.shift(); } }
  function undo() {
    if (busy) return;
    var s = S();
    if (s && (s.phase === 'shop' || (s.phase === 'pack' && s.pack && s.pack.back === 'shop')) && shopUndo.length) { E.S = JSON.parse(shopUndo.pop()); Kit.sfx('whoosh'); Kit.toast('Undone'); save(); render(); return; }
    if (s && s.phase === 'play' && sel.length) { sel = []; paintHand(); paintActs(); preview(); Kit.toast('Cards unselected'); return; }
    Kit.toast(s && s.phase === 'play' ? 'Plays and discards can\'t be undone: new cards were already drawn' : 'Nothing to undo', 2600);
  }
  function priceTag(it) { return el('span', { class: 'price' + (it.price === 0 ? ' free' : !E.canAfford(it.price) ? ' no' : ''), text: it.price === 0 ? 'Free' : '$' + it.price }); }
  function paintShop() {
    var s = S(), sh = s.shop, box = el('div', { class: 'pn shop' });
    var rr = E.rerollCost();
    var rrb = el('button', { type: 'button', class: 'bb green', html: 'Reroll<small>' + (rr ? '$' + rr : 'Free') + '</small>', onclick: onReroll });
    rrb.disabled = !E.canAfford(rr);
    box.appendChild(el('div', { class: 'sbtns' }, [el('button', { type: 'button', class: 'bb red', html: 'Next<br>Round', onclick: onLeaveShop }), rrb]));
    var top = el('div', { class: 'shelf' }), bot = el('div', { class: 'shelf lo' });
    sh.items.forEach(function (it, i) { top.appendChild(shopSlot('items', i, it)); });
    sh.vouchers.forEach(function (it, i) { bot.appendChild(shopSlot('vouchers', i, it)); });
    if (!sh.vouchers.length) bot.appendChild(el('div', { class: 'sit' }, [el('span', { class: 'price', text: 'Voucher' }), el('div', { class: 'sold', title: 'A new voucher arrives next ante' })]));
    bot.appendChild(el('div', { style: { width: '14px' } }));
    sh.packs.forEach(function (it, i) { bot.appendChild(shopSlot('packs', i, it)); });
    box.appendChild(top); box.appendChild(bot);
    R.mid.appendChild(box);
  }
  function shopSlot(where, i, it) {
    var w = el('div', { class: 'sit' });
    if (!it || it.sold) { w.appendChild(el('span', { class: 'price', html: '&nbsp;' })); w.appendChild(el('div', { class: 'sold' })); return w; }
    w.appendChild(priceTag(it));
    var n = itemEl(it); w.appendChild(n);
    n.addEventListener('click', function () { if (!busy) openShopItem(n, where, i); });
    return w;
  }
  function buyWhy(it, useNow) {
    if (!E.canAfford(it.price)) return 'Not enough money';
    if (it.t === 'joker' && !E.jokerRoom() && it.ed !== 'neg') return 'No room: sell a Joker first';
    if (it.t === 'cons' && !useNow && !E.consRoom()) return 'No room: use or sell a card first';
    if (it.t === 'cons' && useNow) return E.consCheck(it.k, [], false);
    return '';
  }
  function openShopItem(n, where, i) {
    var it = S().shop[where][i]; if (!it || it.sold) return;
    var lbl = it.t === 'pack' ? 'Open' : it.t === 'voucher' ? 'Redeem' : 'Buy';
    var btns = [{ label: lbl + ' <small>' + (it.price ? '$' + it.price : 'free') + '</small>', cls: 'green', why: buyWhy(it, false), on: function () { doBuy(where, i, false, n); } }];
    if (it.t === 'cons') btns.push({ label: 'Buy &amp; Use', cls: 'red', why: buyWhy(it, true), on: function () { doBuy(where, i, true, n); } });
    showTip(n, itemInfo(it), btns);
  }
  function doBuy(where, i, useNow, n) {
    if (busy) return;
    var snap = JSON.stringify(S());
    var it = S().shop[where][i];
    var why = E.buy(where, i, useNow);
    if (why) { Kit.toast(why); hap('error'); Kit.sfx('bad'); return; }
    shopUndo.push(snap);
    Kit.sfx('chip'); hap('medium');
    if (it.t === 'joker') Kit.sfx('good');
    if (it.t === 'voucher') { Kit.callout(E.VOUCHERS[it.k].n); Kit.sfx('sparkle'); }
    if (it.t === 'cons' && useNow) consUsedFx(it.k, it.msg);
    if (it.t === 'pack') { Kit.sfx('flip'); packSel = -1; sel = []; }
    save(); render(); drainNotes();
    if (it.t === 'joker' && R.jEls.length) retrig(R.jEls[R.jEls.length - 1], 'wig');
  }
  function onReroll() {
    if (busy) return;
    var snap = JSON.stringify(S());
    if (!E.reroll()) { Kit.toast('Not enough money'); return; }
    shopUndo.push(snap);
    Kit.sfx('roll'); hap('light'); save(); render(); drainNotes();
  }
  function onLeaveShop() {
    if (busy) return;
    var notes = E.leaveShop(); shopUndo = [];
    Kit.sfx('whoosh'); save(); render(); showNotes(notes);
  }

  // ═══ Consumables ═════════════════════════════════════════════════════════
  function useConsumable(i, n) {
    var s = S(), c = s.cons[i]; if (!c) return;
    var ids = selForCons();
    var r = E.useCons(i, ordered(ids));
    if (r.err) { Kit.toast(r.err); hap('error'); return; }
    shopUndo = [];
    var d = E.CONS[r.k];
    if (d.sel || d.inHand) sel = [];
    consUsedFx(r.k, r.msg);
    save();
    if (s.phase === 'play' || (s.phase === 'pack' && s.pack)) { afterChange(); flashHand(ids); }
    else render();
    drainNotes();
  }
  function consUsedFx(k, msg) {
    var d = E.CONS[k];
    Kit.sfx(d.t === 'planet' ? 'sparkle' : d.t === 'spectral' ? 'boom' : 'flip'); hap('success');
    if (d.t === 'planet') showLevelUp(d.hand);
    else Kit.callout(msg ? d.n + ': ' + msg : d.n);
  }
  // Balatro's level-up: the hand, its new level and chips x mult show in the side panel
  function showLevelUp(h) {
    if (!R.hn) return;
    var lv = S().levels[h];
    R.hn.classList.remove('tot');
    R.hn.innerHTML = esc(E.HMAP[h].n) + ' <small>lvl.' + lv + '</small>';
    setCM(E.hChips(h, lv), E.hMult(h, lv), 'b'); retrig(R.hn, 'bump');
    Kit.callout(E.HMAP[h].n + ' level ' + lv);
    var t = token;
    setTimeout(function () { if (t === token && !busy) preview(); }, 1600);
  }
  function flashHand(ids) { (ids || []).forEach(function (id) { var cd = R.hEls[id]; if (cd) retrig(cd.firstChild, 'hit'); }); }

  // ═══ Booster packs ═══════════════════════════════════════════════════════
  function paintPack() {
    var s = S(), p = s.pack, P = E.PACKS[p.kind], z = E.PSIZE[p.size];
    var box = el('div', { class: 'pack' });
    box.appendChild(el('div', { class: 'ph' }, [el('b', { text: z.n + P.n }), el('span', { text: 'Choose ' + p.left + ' of ' + p.choices.length })]));
    var row = el('div', { class: 'ch' });
    p.choices.forEach(function (it, i) {
      var w = el('div', { class: 'sit' + (it.taken ? ' taken' : '') }), n = itemEl(it);
      w.appendChild(n);
      n.addEventListener('click', function () { if (!busy) openPackItem(n, i); });
      row.appendChild(w);
    });
    box.appendChild(row);
    if (!p.hand) box.appendChild(el('button', { type: 'button', class: 'bb green', text: 'Skip', onclick: onSkipPack }));

    R.mid.appendChild(box);
    if (p.hand) { paintHand(); paintActs(); }
  }
  function paintPackActs() {
    var a = R.acts; a.innerHTML = '';
    a.appendChild(el('div', { class: 'pn sortb' }, [el('small', { text: 'Sort Hand' }), el('div', null, [
      el('button', { type: 'button', class: 'bb', text: 'Rank', onclick: function () { sortBy('rank'); } }),
      el('button', { type: 'button', class: 'bb', text: 'Suit', onclick: function () { sortBy('suit'); } })])]));
    a.appendChild(el('button', { type: 'button', class: 'bb green big', text: 'Skip', onclick: onSkipPack }));
  }
  function openPackItem(n, i) {
    var s = S(), it = s.pack.choices[i]; if (!it || it.taken) return;
    var why = it.t === 'joker' ? (!E.jokerRoom() && it.ed !== 'neg' ? 'No room: sell a Joker first' : '') : it.t === 'cons' ? E.consCheck(it.k, ordered(sel), false) : '';
    var lbl = it.t === 'cons' ? 'Use' : 'Select';
    showTip(n, itemInfo(it), [{ label: lbl, cls: it.t === 'cons' ? 'red' : 'green', why: why, on: function () { takePack(i, n); } }]);
  }
  function takePack(i, n) {
    var s = S(), it = s.pack.choices[i], ids = ordered(sel);
    shopSnap();
    var r = E.pickPack(i, ids);
    if (r.err) { Kit.toast(r.err); hap('error'); return; }
    if (it.t === 'cons') { consUsedFx(it.k, r.msg); sel = []; }
    else { Kit.sfx('good'); hap('success'); if (it.t === 'card') Kit.toast('Added to your deck'); }
    save();
    if (S().phase === 'pack') { render(); flashHand(ids); } else render();
    drainNotes();
  }
  function onSkipPack() { if (busy) return; shopSnap(); E.closePack(); sel = []; Kit.sfx('whoosh'); save(); render(); }

  // ═══ Game over / win ═════════════════════════════════════════════════════
  function paintOver() {
    var s = S(), st = s.stats, lt = st.lostTo, won = s.won;
    var box = el('div', { class: 'pn over' + (won ? ' won' : '') }, [el('h2', { text: won ? 'You Win!' : 'Game Over' })]);
    if (lt && !won) box.appendChild(el('div', { class: 'ds', style: { color: '#ffd2cc' }, text: lt.name + ' needed ' + fmt(lt.target) + '. You scored ' + fmt(lt.score) + '.' }));
    var mp = E.mostPlayed();
    var stats = [['Best hand', fmt(st.best)], ['Most played hand', (s.plays[mp] ? E.HMAP[mp].n + ' (' + s.plays[mp] + ')' : 'None')], ['Hands played', st.hands],
      ['Rerolls', st.rerolls || 0], ['Ante', s.ante], ['Round', s.round], ['Money earned', '$' + st.earned], ['Bosses beaten', st.bosses.length]];
    box.appendChild(el('div', { class: 'stats' }, stats.map(function (x) { return el('div', { html: esc(x[0]) + '<b>' + esc(String(x[1])) + '</b>' }); })));
    box.appendChild(el('div', { class: 'row' }, [
      el('button', { type: 'button', class: 'bb green big', text: 'New Run', onclick: function () { clearSave(); startRun(s.name, s.deckId); } }),
      el('button', { type: 'button', class: 'bb slate big', text: 'Past runs', onclick: function () { Kit.history(HKEY, { title: 'Balatro: past runs' }); } })]));
    R.mid.appendChild(box);
  }
  function highlights(won) {
    var s = S(), st = s.stats, hl = [];
    hl.push(won ? 'Beat all 8 antes with the ' + E.DECKS[s.deckId].n + '!' : 'Reached ante ' + s.ante + (s.endless && s.ante > 8 ? ' in endless mode' : ''));
    if (st.best) hl.push('Biggest hand: ' + fmt(st.best) + ' with a' + (/^[AEIOU]/.test(E.HMAP[st.bestHand].n) ? 'n ' : ' ') + E.HMAP[st.bestHand].n);
    var bj = null; Object.keys(st.jt).forEach(function (k) { if (!bj || st.jt[k] > st.jt[bj]) bj = k; });
    if (bj) hl.push('Best joker: ' + E.JK[bj].n + ' (fired ' + st.jt[bj] + (st.jt[bj] === 1 ? ' time)' : ' times)'));
    var mp = E.mostPlayed(); if (s.plays[mp]) hl.push('Favorite hand: ' + E.HMAP[mp].n + ', played ' + s.plays[mp] + (s.plays[mp] === 1 ? ' time' : ' times'));
    if (!won && st.lostTo) hl.push('Stopped by ' + st.lostTo.name + ': ' + fmt(st.lostTo.score) + ' of ' + fmt(st.lostTo.target));
    else if (st.bosses.length) hl.push('Bosses beaten: ' + st.bosses.slice(-3).join(', '));
    if (s.vouchers.length) hl.push('Vouchers: ' + s.vouchers.map(function (v) { return E.VOUCHERS[v].n; }).join(', '));
    if (st.earned >= 40) hl.push('Earned $' + st.earned + ' along the way');
    return hl;
  }
  function runDetail(won) {
    var s = S(), st = s.stats;
    function jo(k) { var d = E.JK[k]; return d ? { n: d.n, r: Math.min(3, d.r), a: d.art[1], b: d.art[2], k: d.art[3], d: d.d.replace(/\{\w\|([^}]*)\}/g, '$1') } : null; }
    var bh = st.bh ? Object.assign({}, st.bh, { hn: E.HMAP[st.bh.h] ? E.HMAP[st.bh.h].n : st.bh.h, j: (st.bh.j || []).map(function (k) { return E.JK[k] ? E.JK[k].n : k; }) }) : null;
    if (bh) bh.c = bh.c.filter(function (c) { return c !== 'S'; }).length === bh.c.length ? bh.c : bh.c.map(function (c) { return c === 'S' ? 'As' : c; });
    var lv = {}; Object.keys(s.levels).forEach(function (k) { if (s.levels[k] > 1 && E.HMAP[k]) lv[E.HMAP[k].n] = s.levels[k]; });
    var pl = {}; Object.keys(s.plays).forEach(function (k) { if (E.HMAP[k]) pl[E.HMAP[k].n] = s.plays[k]; });
    return { won: !!won, ante: s.ante, bh: bh, jk: s.jokers.map(function (j) { return jo(j.k); }).filter(Boolean), bosses: st.bosses.slice(-12), lost: st.lostTo || null,
      lv: lv, plays: pl, money: s.money, earned: st.earned || 0, deck: s.deck.length, diff: s.deckId };
  }
  function record(won) {
    var s = S(), st = s.stats, labels = [], scores = [];
    for (var a = 1; a <= s.ante; a++) if (st.ante[a] != null) { labels.push('Ante ' + a); scores.push([st.ante[a]]); }
    Kit.record(HKEY, {
      started: s.started, mode: E.DECKS[s.deckId].n + (s.endless && !won ? ' · Endless' : ''),
      players: [{ name: s.name, score: st.best }], winner: won ? s.name : null,
      summary: (won ? 'Won the run' : 'Reached ante ' + s.ante) + ' · best hand ' + fmt(st.best), badge: 'Ante ' + s.ante,
      rounds: { labels: labels, scores: scores }, highlights: highlights(won), meta: { ante: s.ante, best: st.best, won: !!won },
      detail: runDetail(won)
    });
  }
  function endRun(won) {
    var s = S(), best = s.stats.best;
    record(false);
    clearSave();
    ArcadeHi.check(HKEY, best, function () {
      Kit.win({ lose: true, icon: 'meh', title: 'Game Over', sub: (s.stats.lostTo ? s.stats.lostTo.name + ' needed ' + fmt(s.stats.lostTo.target) + '. ' : '') + 'You reached ante ' + s.ante + '.',
        againLabel: 'New run', again: function () { startRun(s.name, s.deckId); },
        extra: [{ label: 'See the table', onClick: function () {} }, { label: 'Past runs', onClick: function () { Kit.history(HKEY, { title: 'Balatro: past runs' }); } }] });
    });
  }
  function winRun() {
    var s = S(), best = s.stats.best;
    record(true);
    s.endless = true; save();
    ArcadeHi.check(HKEY, best, function () {
      Kit.win({ icon: 'trophy', title: 'You Win!', sub: 'You beat ante 8. Biggest hand: ' + fmt(best) + '. Keep going in endless mode, or start fresh.',
        againLabel: 'Keep going (endless)', again: function () { save(); render(); },
        extra: [{ label: 'Start a new run', onClick: function () { clearSave(); startRun(s.name, s.deckId); } }] });
    });
  }

  // ═══ Run info: poker hands, blinds, vouchers ══════════════════════════════
  function runInfo(tab) {
    var s = S(); tab = tab || 'hands';
    var box = el('div', { class: 'jsh' }), body = el('div');
    var tabs = el('div', { class: 'tabs' });
    [['hands', 'Poker Hands'], ['blinds', 'Blinds'], ['vouchers', 'Vouchers']].forEach(function (t) {
      tabs.appendChild(el('button', { type: 'button', class: 'bb' + (t[0] === tab ? ' on' : ''), text: t[1], onclick: function () { tab = t[0]; Array.prototype.forEach.call(tabs.children, function (b, k) { b.classList.toggle('on', k === ['hands', 'blinds', 'vouchers'].indexOf(tab)); }); fill(); } }));
    });
    box.appendChild(tabs); box.appendChild(body);
    function fill() {
      body.innerHTML = '';
      if (!s) { body.appendChild(el('p', { text: 'Start a run first.' })); return; }
      if (tab === 'hands') {
        var hl = el('div', { class: 'hl' });
        E.HANDS.forEach(function (h) {
          if (h.secret && !s.plays[h.id] && s.levels[h.id] <= 1) return;
          var lv = s.levels[h.id];
          hl.appendChild(el('div', { class: 'hr' }, [el('span', { class: 'lv' + (lv > 1 ? ' up' : ''), text: 'lvl.' + lv }),
            el('div', { class: 'nm', html: esc(h.n) + '<small>' + esc(h.ex) + '</small>' }),
            el('div', { class: 'cm' }, [el('span', { class: 'c', text: String(E.hChips(h.id, lv)) }), el('span', { text: 'X' }), el('span', { class: 'm', text: String(E.hMult(h.id, lv)) })]),
            el('span', {}), el('span', { class: 'pl', text: '#' + (s.plays[h.id] || 0) })]));
        });
        body.appendChild(hl);
        body.appendChild(el('p', { class: 'muted', style: { 'margin-top': '8px', 'font-size': '.85rem' }, text: '#: times played this run. Planet cards level up a hand.' }));
      } else if (tab === 'blinds') {
        for (var i = 0; i < 3; i++) {
          var info = E.blindInfo(i);
          var tx = '<b>' + esc(info.name) + '</b>' + (info.boss ? '<small>' + esc(info.boss.d) + '</small>' : '') + '<small>Score at least <span class="t-m">' + fmt(info.target) + '</span> · Reward <span class="t-o">$' + info.reward + '</span></small>';
          if (i < 2) tx += '<small>Skip for: ' + esc(E.TAGS[s.tags[i].k].n) + '</small>';
          body.appendChild(el('div', { class: 'blrow' }, [el('img', { alt: '', src: A.url('b:' + (info.kind === 'boss' ? info.key : info.kind)) }), el('div', { class: 'tx', html: tx })]));
        }
        body.appendChild(el('p', { class: 'muted', style: { 'font-size': '.85rem' }, text: 'Ante ' + s.ante + (s.ante <= 8 ? ' of 8' : ' (endless)') + '. Deck: ' + E.DECKS[s.deckId].n + ': ' + E.DECKS[s.deckId].d + '.' }));
        if (s.pend.length) body.appendChild(el('p', { class: 'muted', style: { 'font-size': '.85rem' }, text: 'Tags waiting: ' + s.pend.map(function (t) { return E.TAGS[t.k].n; }).join(', ') }));
      } else {
        var vg = el('div', { class: 'vgrid' });
        if (!s.vouchers.length) body.appendChild(el('p', { class: 'muted', text: 'No vouchers yet. Each shop has one voucher per ante: a permanent upgrade.' }));
        s.vouchers.forEach(function (k) { vg.appendChild(el('div', { class: 'vi' }, [voucherEl(k), el('b', { text: E.VOUCHERS[k].n }), el('span', { html: md(E.VOUCHERS[k].d) })])); });
        body.appendChild(vg);
      }
    }
    fill();
    Kit.sheet({ title: 'Run info', node: box, actions: [{ label: 'Close', cls: 'btn-soft' }] });
  }
  // The deck: cards left to draw (dimmed ones are used this round)
  function showDeck() {
    var s = S(); if (!s) return;
    var inPlay = s.phase === 'play', left = {};
    if (inPlay) s.draw.forEach(function (id) { left[id] = 1; });
    var box = el('div', { class: 'jsh dview' });
    var counts = {};
    box.appendChild(el('div', { class: 'dh', html: '<span>' + (inPlay ? '<b style="color:#fff">' + s.draw.length + '</b> cards left to draw' : 'Full deck') + '</span><span>' + s.deck.length + ' cards</span>' }));
    E.SUITS.forEach(function (su) {
      var cards = s.deck.map(C).filter(function (c) { return c.s === su && !E.isStone(c); }).sort(function (a, b) { return E.RV[b.r] - E.RV[a.r]; });
      var row = el('div', { class: 'dr' });
      var n = 0;
      cards.forEach(function (c) { var pc = cardEl(c, {}); if (inPlay && !left[c.id]) pc.classList.add('used'); else n++; row.appendChild(pc); if (!inPlay || left[c.id]) counts[c.r] = (counts[c.r] || 0) + 1; });
      box.appendChild(el('div', { class: 'dh', html: '<span class="t-s' + su + '">' + E.SUITN[su] + '</span><span>' + n + (inPlay ? ' left' : '') + '</span>' }));
      box.appendChild(row);
    });
    var stones = s.deck.map(C).filter(E.isStone);
    if (stones.length) { var sr = el('div', { class: 'dr' }); stones.forEach(function (c) { var pc = cardEl(c, {}); if (inPlay && !left[c.id]) pc.classList.add('used'); sr.appendChild(pc); }); box.appendChild(el('div', { class: 'dh', text: 'Stone cards' })); box.appendChild(sr); }
    box.appendChild(el('div', { class: 'ranks' }, E.RANKS.slice().reverse().map(function (r) { return el('span', { text: r + ': ' + (counts[r] || 0) }); })));
    Kit.sheet({ title: inPlay ? 'Deck: cards left' : 'Your deck', node: box, actions: [{ label: 'Close', cls: 'btn-soft' }] });
  }

  // ═══ Save / resume ════════════════════════════════════════════════════════
  function save() {
    var s = S(); if (!s) return;
    try { localStorage.setItem(SAVE, JSON.stringify(s)); } catch (e) {}
    if (s.phase !== 'over') {
      var lbl = 'Ante ' + s.ante + ' · ' + (s.phase === 'shop' ? 'Shop' : s.phase === 'play' ? E.blindInfo(s.bi).name : s.phase === 'cashout' ? 'Cash out' : s.phase === 'pack' ? 'Booster pack' : 'Choose a blind');
      Kit.resume.set(lbl);
    }
  }
  function clearSave() { try { localStorage.removeItem(SAVE); } catch (e) {} Kit.resume.clear(); }

  // ═══ Setup ════════════════════════════════════════════════════════════════
  function showSetup() {
    E.S = null; busy = false; token++; shopUndo = []; sel = [];
    var best = 0; try { GameHistory.load(HKEY).forEach(function (e) { best = Math.max(best, e.ante || 0); }); } catch (e) {}
    app.innerHTML = '';
    app.style.fontFamily = '';
    var wrap = el('div', { style: { 'max-width': '620px', margin: '0 auto', padding: '0 8px', 'overflow-y': 'auto', 'max-height': 'calc(100dvh - 70px)' } });
    app.appendChild(wrap);
    Kit.setup(wrap, {
      players: { min: 1, max: 1, label: "Who's playing?" },
      options: [{ id: 'deck', label: 'Deck', value: 'red', choices: Object.keys(E.DECKS).map(function (k) { return [k, E.DECKS[k].n.replace(' Deck', ''), E.DECKS[k].d + '.']; }) }],
      intro: 'Play poker hands, collect Jokers, beat 8 antes.' + (best ? ' Best so far: ante ' + best + '.' : ''),
      start: 'Start the run',
      onStart: function (cfg) { startRun(cfg.players[0].name, cfg.options.deck); }
    });
    JRBg.set(PAL.menu);
  }
  function startRun(name, deck, seed) {
    E.newRun(name, deck, seed);
    Kit.gameStart(); sel = []; shopUndo = [];
    save(); render(); Kit.sfx('deal');
  }

  // ═══ Keyboard (computers) ═════════════════════════════════════════════════
  document.addEventListener('keydown', function (e) {
    var s = S();
    if (!s || busy || document.querySelector('.k-scrim,.k-win,.ahi-overlay')) return;
    if (e.key === 'Escape') { closeTip(); return; }
    if (s.phase === 'play') {
      if (e.key >= '1' && e.key <= '9') { var id = s.hand[+e.key - 1]; if (id) toggleSel(id); }
      else if (e.key === 'Enter') onPlay();
      else if (e.key === 'd' || e.key === 'D') onDiscard();
      else if (e.key === 'r' || e.key === 'R') sortBy('rank');
      else if (e.key === 's' || e.key === 'S') sortBy('suit');
    }
  });
  document.addEventListener('kit:orient', function (e) { if (e.detail && e.detail.ok) setTimeout(layout, 60); });

  // ═══ Test hooks ═══════════════════════════════════════════════════════════
  window.JR = {
    E: E, get S() { return E.S; }, render: function () { render(); }, save: save,
    start: function (seed, deck) { clearSave(); startRun('Tester', deck || 'red', seed); },
    select: function (ids) { sel = ids.slice(); paintHand(); paintActs(); preview(); },
    play: function () { onPlay(); }, discard: function () { onDiscard(); },
    busy: function () { return busy; }, speed: function (n) { speed = n; },
    bot: function () { var r = E.botStep(); save(); render(); return r; },
    sim: function (n, deck, seed0) {
      var keep = E.S, out = { runs: n, wins: 0, antes: {} };
      for (var i = 0; i < n; i++) { var r = E.simRun((seed0 || 1000) + i * 7919, deck); if (r.won) out.wins++; out.antes[r.ante] = (out.antes[r.ante] || 0) + 1; }
      E.S = keep; return out;
    },
    tip: function (sel2) { var n = document.querySelector(sel2); if (n) n.click(); }
  };

  // ═══ Boot ═════════════════════════════════════════════════════════════════
  function boot() {
    var saved = null; try { saved = JSON.parse(localStorage.getItem(SAVE)); } catch (e) {}
    if (saved && saved.v === 2 && saved.deck && saved.phase && saved.phase !== 'over') {
      E.S = saved; Kit.gameStart(); saved.fresh = [];
      if (saved.winPending) { saved.winPending = false; render(); winRun(); } else render();
    } else {
      if (saved && saved.v !== 2) { clearSave(); setTimeout(function () { Kit.toast('Balatro was rebuilt, so your old saved run was cleared.', 3200); }, 400); }
      showSetup();
    }
  }
  var booted = false;
  function go() { if (booted) return; booted = true; boot(); }
  A.ready.then(go); setTimeout(go, 2500);
})();
