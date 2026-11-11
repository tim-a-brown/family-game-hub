// Anoria: your decks and the deck builder.
//   AnoriaDecks.open(id, done)   id null: the list of decks (yours, a new one, the five ready decks as recipes);
//                                a built deck's id: that deck, open for changing. done() when the player leaves.
// The rules of a deck (30 cards, two of a card at most, no more than you own, one Guide) live in coll.js; this file
// only draws them. The builder is two things side by side: the cards you own (tap one to add it) and the deck as it
// stands (how many of 30, the Spark curve, the factions, the years it spans and the Threads it holds), which is
// under the cards on a phone held upright and to their left everywhere else.
(function () {
  'use strict';
  let U = null, el, esc, C, CARDS, TX, Coll, FAC, PAIRS, COSTS, DECK, CAP;
  const FACS = ['D', 'S', 'V', 'A', 'W', 'N'];
  const KINDS = [['fig', 'Figure'], ['deed', 'Deed'], ['relic', 'Relic']];
  const WORDS = [['legacy', 'Legacy'], ['voyager', 'Voyager'], ['scholar', 'Scholar'], ['guard', 'Guard'], ['steadfast', 'Steadfast'], ['inspiring', 'Inspiring'], ['swift', 'Swift'], ['raider', 'Raider']];
  const SORTS = [['cost', 'Cost'], ['time', 'Time'], ['name', 'Name']];
  const DRAWN = 19;   // about how many of its 30 cards a deck draws in a game
  const SORT_KEY = 'anoria_deck_sort';
  // a Thread: two dots joined by a line (the gold line that joins two Figures on the table)
  const THREAD = '<svg class="adk-thg" viewBox="0 0 24 12" aria-hidden="true"><path d="M4 8C9 0 15 12 20 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="4" cy="8" r="2.6" fill="currentColor"/><circle cx="20" cy="4" r="2.6" fill="currentColor"/></svg>';
  const WAND = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20 15 9"/><path d="M17.5 3v3M16 4.5h3M20 9.5v2M19 10.5h2M10.5 3.5v2M9.5 4.5h2"/></svg>';
  const still = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  // the table's helpers and the card data, read the first time a screen opens (ui.js loads after this file)
  function boot() {
    if (U) return; U = window.AnoriaUI;
    el = U.el; esc = U.esc; C = U.C; CARDS = U.CARDS; TX = U.TX; Coll = U.Coll; FAC = U.FAC; DECK = Coll.DECK; CAP = Coll.CAP;
    // every pair of cards where one grew from the other (a Figure's Legacy, any card's Thread). Places aren't cards.
    PAIRS = [];
    Object.keys(CARDS).forEach(b => { (CARDS[b].insp || []).concat(CARDS[b].from || []).forEach(a => { if (a[0] !== '@' && CARDS[a]) PAIRS.push({ a: a, b: b, t: (TX.LINKS || {})[a + '>' + b] || '' }); }); });
    let top = 0; Object.keys(CARDS).forEach(k => { top = Math.max(top, CARDS[k].c); });
    COSTS = []; for (let i = 0; i <= top; i++) COSTS.push(i);
  }
  const year = y => y < 0 ? (-y) + ' BC' : y < 1000 ? 'AD ' + y : String(y);
  // which age a year falls in (1 to 6), and where it sits on a line that gives each age the same room
  function eraOf(y) { for (let i = 1; i < C.ERAS.length; i++) if (y <= C.ERAS[i].to) return i; return C.ERAS.length - 1; }
  function whenX(y) { const i = eraOf(y), lo = i > 1 ? C.ERAS[i - 1].to : -2700, hi = C.ERAS[i].to; return (i - 1 + Math.max(0, Math.min(1, (y - lo) / (hi - lo)))) / (C.ERAS.length - 1); }
  const hasWord = (k, w) => w === 'legacy' ? !!CARDS[k].insp : !!(CARDS[k].k && CARDS[k].k[w]);
  const byCost = (a, b) => CARDS[a].c - CARDS[b].c || (CARDS[a].t === 'fig' ? 0 : 1) - (CARDS[b].t === 'fig' ? 0 : 1) || CARDS[a].n.localeCompare(CARDS[b].n);
  const byTime = (a, b) => (CARDS[a].y == null ? 1 : 0) - (CARDS[b].y == null ? 1 : 0) || (CARDS[a].y || 0) - (CARDS[b].y || 0) || CARDS[a].n.localeCompare(CARDS[b].n);
  const byName = (a, b) => CARDS[a].n.localeCompare(CARDS[b].n);
  const byFac = (a, b) => FACS.indexOf(CARDS[a].f) - FACS.indexOf(CARDS[b].f) || byCost(a, b);
  const thumb = (key, cls) => { const s = el('span', { class: cls, style: { '--f': (FAC[(CARDS[key] || TX.GUIDES[key] || {}).f] || FAC.N).c } }); const im = U.artImg(key, true); if (im) s.appendChild(im); return s; };
  const coin = n => el('span', { class: 'adk-coin' }, [el('b', { text: String(n) })]);
  // a kit sheet in Anoria's own colours (navy and gilt in every app theme)
  const sheet = o => { const sh = Kit.sheet(o); sh.el.classList.add('adk-sheet'); return sh; };
  const btn = (cls, label, icon, fn) => el('button', { type: 'button', class: 'btn ' + cls, html: (icon || '') + '<span>' + esc(label) + '</span>', onclick: fn });
  // thirty small slots: the cards in a deck coloured by faction, the rest empty (keys = the deck's cards)
  function slots(keys, cls) {
    const row = el('span', { class: 'adk-slots ' + (cls || '') }), list = keys.slice().sort(byFac);
    for (let i = 0; i < DECK; i++) row.appendChild(el('i', list[i] ? { class: 'on', style: { '--c': FAC[CARDS[list[i]].f].c } } : null));
    return row;
  }

  function open(id, done) {
    boot();
    const d = id ? Coll.myDecks().filter(x => x.id === id)[0] : null;
    if (d) edit(d, done); else list(done);
  }

  // ═══ The list: your decks, a new one, and the five ready decks to copy ═══════════════════════════════════
  function list(done) {
    const sc = U.screen({ title: 'Decks', cls: 'an-adk adk-home', onClose: () => { if (done) done(); } });
    const guideOf = g => TX.GUIDES[g] ? TX.GUIDES[g].n : '';
    function start(deck, o) { edit(deck, paint, o); }
    function fresh() {
      const names = Coll.myDecks().map(d => d.n); let n = 'My deck', i = 2; while (names.indexOf(n) >= 0) n = 'My deck ' + (i++);
      start({ n: n, guide: '', cards: [] });
    }
    // a ready deck as a recipe: the cards of it you own go into a deck of your own
    function copy(d) {
      const have = {}, cards = []; d.cards.forEach(k => { have[k] = (have[k] || 0) + 1; if (have[k] <= Math.min(CAP, Coll.copies(k))) cards.push(k); });
      const names = Coll.myDecks().map(x => x.n); let n = 'My ' + d.n, i = 2; while (names.indexOf(n) >= 0) n = 'My ' + d.n + ' ' + (i++);
      start({ n: n, guide: Coll.load().guides.indexOf(d.guide) >= 0 ? d.guide : '', cards: cards }, { copy: d.n, short: DECK - cards.length });
    }
    function mine(d) {
      const g = TX.GUIDES[d.guide], pic = g ? thumb(d.guide, 'adk-dg') : el('span', { class: 'adk-dg none', html: Kit.icon('plus') });
      const state = d.ok ? el('span', { class: 'adk-ds ok', html: Kit.icon('check') + '<b>Ready to play</b>' })
        : el('span', { class: 'adk-ds' }, d.why.slice(0, 2).map(w => el('b', { text: w })));
      return el('button', { type: 'button', class: 'adk-deck' + (d.ok ? ' ok' : ''), 'aria-label': d.n + (d.ok ? ', ready to play' : ', not ready: ' + d.why.join(', ')), onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); start(Coll.myDecks().filter(x => x.id === d.id)[0] || d); } }, [
        pic, el('span', { class: 'adk-dn', text: d.n }), el('span', { class: 'adk-dw', text: g ? g.n : 'No Guide yet' }),
        el('span', { class: 'adk-dc' }, [el('b', { text: String(d.cards.length) }), el('small', { text: 'of ' + DECK })]),
        slots(d.cards.filter(k => CARDS[k])), state]);
    }
    function recipe(d) {
      const g = TX.GUIDES[d.guide], hasG = Coll.load().guides.indexOf(d.guide) >= 0, all = d.own === DECK;
      const own = []; const have = {}; d.cards.forEach(k => { have[k] = (have[k] || 0) + 1; if (have[k] <= Math.min(CAP, Coll.copies(k))) own.push(k); });
      return el('div', { class: 'adk-rec' + (all ? ' all' : '') }, [
        thumb(d.guide, 'adk-dg' + (hasG ? '' : ' away')),
        el('span', { class: 'adk-dn', text: d.n }), el('span', { class: 'adk-rp', text: U.PLAN[d.n] || '' }),
        el('span', { class: 'adk-dw' }, [hasG ? null : el('i', { html: Kit.icon('lock') }), el('span', { text: hasG ? g.n + ' is the Guide' : g.n + ' hasn\'t joined you yet' })]),
        slots(own),
        el('span', { class: 'adk-ra' }, [
          el('span', { class: 'adk-rn' }, [el('b', { text: String(d.own) }), el('small', { text: 'of ' + DECK + ' are yours' })]),
          btn('btn-soft btn-sm', 'Cards', '', () => { Kit.sfx('tap'); U.deckSheet(d); }),
          btn('btn-primary btn-sm', 'Copy', Kit.icon('plus'), () => { Kit.sfx('tap'); Kit.haptic('light'); copy(d); })])
      ]);
    }
    function paint() {
      if (!sc.el.isConnected) return;
      const all = Coll.decks(), built = all.filter(d => d.built), ready = all.filter(d => d.ready), top = sc.body.scrollTop;
      sc.body.innerHTML = '';
      const pack = Coll.nextUp().filter(x => x.id === 'built')[0];
      const grid = el('div', { class: 'adk-decks' }, [
        el('button', { type: 'button', class: 'adk-deck adk-new', onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); fresh(); } }, [
          el('span', { class: 'adk-dg none', html: Kit.icon('plus') }), el('span', { class: 'adk-dn', text: 'Build a new deck' }),
          el('span', { class: 'adk-dw', text: built.length ? DECK + ' cards and a Guide' : 'From the cards you own: ' + DECK + ' and a Guide' }),
          pack ? el('span', { class: 'adk-ds gift', html: Kit.icon('sparkle') }, [el('b', { text: pack.what }), el('small', { text: pack.when })]) : null])
      ].concat(built.map(mine)));
      sc.body.appendChild(el('section', { class: 'adk-sec' }, [el('h2', { text: 'Your decks' }), grid]));
      sc.body.appendChild(el('section', { class: 'adk-sec' }, [el('h2', { text: 'Ready decks' }), el('p', { class: 'adk-lead', text: 'Five ways to play. Copy one and make it your own.' }),
        el('div', { class: 'adk-recs' }, ready.sort((a, b) => b.own - a.own).map(recipe))]));
      sc.body.scrollTop = top;
    }
    paint();
  }

  // ═══ Building a deck ═════════════════════════════════════════════════════════════════════════════════════
  // deck = {id?, n, guide, cards[]}; o.copy = the ready deck it was copied from (o.short = cards still to add)
  function edit(deck, done, o) {
    o = o || {};
    const guides = () => Coll.load().guides.filter(g => TX.GUIDES[g]);
    const owned = k => Math.min(CAP, Coll.copies(k));
    const st = { id: deck.id || null, n: deck.n || 'My deck', guide: guides().indexOf(deck.guide) >= 0 ? deck.guide : '', cnt: {}, sort: 'cost',
      f: { fac: {}, kind: {}, cost: {}, word: {}, mine: false, thr: false } };
    (deck.cards || []).forEach(k => { if (CARDS[k]) st.cnt[k] = (st.cnt[k] || 0) + 1; });
    if (!st.guide && !deck.guide && guides().length === 1) st.guide = guides()[0];
    const sv = lsGet(SORT_KEY); if (SORTS.some(s => s[0] === sv)) st.sort = sv;
    const n = k => st.cnt[k] || 0;
    const flat = () => { const out = []; Object.keys(st.cnt).sort(byCost).forEach(k => { for (let i = 0; i < st.cnt[k]; i++) out.push(k); }); return out; };
    const total = () => { let t = 0; for (const k in st.cnt) t += st.cnt[k]; return t; };
    const snap = () => JSON.stringify([st.n.trim(), st.guide, flat()]);
    let orig = o.copy ? '' : snap();
    const dirty = () => snap() !== orig;
    const unsaved = () => dirty() && (!!st.id || total() > 0);   // (a new deck with nothing in it is nothing to lose)
    const held = () => PAIRS.filter(p => n(p.a) && n(p.b));
    // a Thread one card away: half of it is in the deck and you own the other half
    const near = () => PAIRS.filter(p => (n(p.a) > 0) !== (n(p.b) > 0) && owned(n(p.a) ? p.b : p.a) > 0).map(p => ({ p: p, need: n(p.a) ? p.b : p.a }));
    const pool = Coll.ALL.filter(k => owned(k) > 0 || n(k) > 0);

    // ── the frame ──
    const sc = U.screen({ title: st.n, cls: 'an-adk adk-ed', onClose: () => { window.removeEventListener('keydown', onEsc, true); window.removeEventListener('resize', onSize); clearTimeout(sayT); if (done) done(); } });
    const nameIn = el('input', { class: 'adk-name', type: 'text', value: st.n, maxlength: '24', 'aria-label': 'Deck name', placeholder: 'Name this deck', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', enterkeyhint: 'done' });
    // (a long name eases down in size until all of it shows)
    function fitName() { nameIn.style.fontSize = ''; let fs = parseFloat(getComputedStyle(nameIn).fontSize) || 20; while (nameIn.scrollWidth > nameIn.clientWidth + 1 && fs > 12) { fs -= 1; nameIn.style.fontSize = fs + 'px'; } }
    nameIn.addEventListener('input', () => { st.n = nameIn.value; sc.el.setAttribute('aria-label', st.n); fitName(); saveState(); });
    nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') nameIn.blur(); });
    sc.title.textContent = ''; sc.title.appendChild(el('label', { class: 'adk-nm' }, [nameIn, el('i', { html: Kit.icon('pencil') })]));
    const binBtn = el('button', { type: 'button', class: 'icon-btn adk-bin', 'aria-label': 'Delete this deck', html: Kit.icon('trash'), onclick: remove });
    const saveTop = btn('btn-primary btn-sm adk-save top', 'Save', '', save), saveDock = btn('btn-primary btn-sm adk-save', 'Save', '', save);
    sc.tools.appendChild(binBtn); sc.tools.appendChild(saveTop);
    // leaving with changes not saved asks first: the back button and Escape both come through here
    sc.head.addEventListener('click', e => { if (e.target.closest('.an-sc-back') && unsaved()) { e.stopPropagation(); Kit.sfx('tap'); leave(); } }, true);
    function onEsc(e) { if (e.key !== 'Escape' || !unsaved() || document.querySelector('.k-scrim.show, .view.show') || Array.prototype.slice.call(document.querySelectorAll('.an-screen')).pop() !== sc.el) return; e.stopPropagation(); leave(); }
    window.addEventListener('keydown', onEsc, true);

    // ── the deck as it stands ──
    const guideBtn = el('button', { type: 'button', class: 'adk-guide', onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); pickGuide(); } });
    const countEl = el('span', { class: 'adk-count' }), curveEl = el('span', { class: 'adk-curve' }), whenEl = el('span', { class: 'adk-when' }), thrEl = el('span', { class: 'adk-thr' });
    const barEl = el('span', { class: 'adk-slots big' }), facEl = el('span', { class: 'adk-facs' });
    for (let i = 0; i < DECK; i++) barEl.appendChild(el('i'));
    const bars = COSTS.map(c => { const fill = el('i'), num = el('b'); curveEl.appendChild(el('span', { class: 'adk-cv' }, [el('span', { class: 'adk-cvb' }, [num, fill]), el('small', { text: String(c) })])); return { fill: fill, num: num }; });
    const factsBtn = el('button', { type: 'button', class: 'adk-facts', 'aria-label': 'The deck as it stands', onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); details(); } }, [countEl, curveEl, whenEl, thrEl, el('i', { class: 'adk-up', html: Kit.icon('down') })]);
    const moreEl = el('div', { class: 'adk-more' });
    const finBtn = btn('btn-soft btn-sm adk-fin', 'Finish it for me', WAND, finish);
    const deckEl = el('div', { class: 'adk-deckside' }, [el('div', { class: 'adk-stats' }, [guideBtn, factsBtn, el('span', { class: 'adk-barrow' }, [barEl, facEl])]), moreEl, el('div', { class: 'adk-acts' }, [finBtn, saveDock])]);

    // ── the cards you own ──
    const grid = el('div', { class: 'adk-grid' }), sayEl = el('div', { class: 'adk-say', role: 'status' });
    const filterBtn = el('button', { type: 'button', class: 'adk-chip adk-fbtn', onclick: () => { Kit.sfx('tap'); filterSheet(); } });
    const mineBtn = el('button', { type: 'button', class: 'adk-chip adk-mine', html: Kit.icon('cards') + '<span>In the deck</span>', onclick: () => { Kit.sfx('tap'); st.f.mine = !st.f.mine; refilter(); } });
    const setSort = v => { Kit.sfx('tap'); Kit.haptic('light'); st.sort = v; lsSet(SORT_KEY, st.sort); paintTools(); paintGrid(true); grid.scrollTop = 0; };
    const sortEl = el('div', { class: 'adk-sort', role: 'group', 'aria-label': 'Sort by' }, [el('i', { html: Kit.icon('swap') })].concat(SORTS.map(s => el('button', { type: 'button', 'data-s': s[0], text: s[1], onclick: () => { if (st.sort !== s[0]) setSort(s[0]); } }))));
    const sortBtn = el('button', { type: 'button', class: 'adk-chip adk-sort1', onclick: () => setSort(SORTS[(SORTS.findIndex(x => x[0] === st.sort) + 1) % SORTS.length][0]) });
    const inlineF = el('div', { class: 'adk-fg' }), onEl = el('div', { class: 'adk-on' }), tallyEl = el('span', { class: 'adk-tally' });
    const tools = el('div', { class: 'adk-tools' }, [inlineF, el('div', { class: 'adk-trow' }, [filterBtn, mineBtn, tallyEl, sortBtn, sortEl]), onEl]);
    const poolEl = el('div', { class: 'adk-pool' }, [tools, grid, sayEl]);
    sc.body.appendChild(deckEl); sc.body.appendChild(poolEl);

    // ── a card in the pool: the card (tap to add), and under it take one out, the copies you have, and read ──
    const tiles = {};
    let hold = 0, read1 = false;   // (the hold that reads a card, and whether it just did)
    const drop = () => { clearTimeout(hold); hold = 0; };
    grid.addEventListener('scroll', drop, { passive: true });
    pool.forEach(k => {
      const c = CARDS[k], have = owned(k), face = el('span', { class: 'adk-face' }, [U.cardEl(k, { mini: true })]);
      const cardBtn = el('button', { type: 'button', class: 'adk-tc' }, [face, el('span', { class: 'adk-tt', html: THREAD })]);
      const pips = el('span', { class: 'adk-tp' });
      const minus = el('button', { type: 'button', class: 'adk-tm', 'aria-label': 'Take one ' + c.n + ' out', html: Kit.icon('minus'), onclick: () => take(k) });
      // (reading one card opens every card on this shelf as one strip to slide through)
      const readK = () => { const p = t.parentNode, list = p ? Array.from(p.querySelectorAll('.adk-t[data-k]')).map(x => x.dataset.k) : null; U.openView(k, { list: list }); };
      const read = el('button', { type: 'button', class: 'adk-tr', 'aria-label': 'Read ' + c.n, html: Kit.icon('eye'), onclick: readK });
      const t = el('div', { class: 'adk-t' + (have > 1 ? ' two' : ''), 'data-k': k }, [cardBtn, el('div', { class: 'adk-tf' }, [minus, pips, read])]);
      // tap adds; holding the card (or a right click) reads it full size
      cardBtn.addEventListener('pointerdown', e => { if (e.button > 0) return; drop(); read1 = false; hold = setTimeout(() => { read1 = true; readK(); }, 480); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => cardBtn.addEventListener(ev, drop));
      cardBtn.addEventListener('contextmenu', e => { e.preventDefault(); drop(); if (!read1) { read1 = true; readK(); } });
      cardBtn.addEventListener('click', () => { if (read1) { read1 = false; return; } add(k); });
      tiles[k] = { el: t, card: cardBtn, pips: pips, minus: minus };
    });
    function syncTile(k, lit, reach) {
      const t = tiles[k]; if (!t) return;
      const have = owned(k), inn = n(k), c = CARDS[k];
      t.el.classList.toggle('in', inn > 0); t.el.classList.toggle('max', inn >= have); t.el.classList.toggle('bad', inn > have);
      t.el.classList.toggle('lit', !!lit[k]); t.el.classList.toggle('near', !lit[k] && !!reach[k]);
      t.pips.innerHTML = '';
      for (let i = 0; i < Math.max(have, inn); i++) t.pips.appendChild(el('i', { class: (i < inn ? 'on' : '') + (i >= have ? ' no' : '') }));
      t.minus.disabled = !inn; t.minus.tabIndex = inn ? 0 : -1;
      t.card.setAttribute('aria-label', c.n + ', ' + c.c + ' Spark. You have ' + have + ', ' + inn + ' in the deck' + (inn > have ? ', more than you own' : inn >= have ? '' : '. Add one'));
    }
    function syncTiles() {
      const lit = {}, reach = {}; held().forEach(p => { lit[p.a] = lit[p.b] = 1; }); near().forEach(x => { reach[x.need] = 1; });
      pool.forEach(k => syncTile(k, lit, reach));
      grid.classList.toggle('full', total() >= DECK);
    }

    // ── filters and sorts ──
    const anyF = g => Object.keys(st.f[g]).length > 0;
    const activeN = () => ['fac', 'kind', 'cost', 'word'].reduce((s, g) => s + Object.keys(st.f[g]).length, 0) + (st.f.thr ? 1 : 0);
    function shows(k) {
      const c = CARDS[k], f = st.f;
      if (f.mine && !n(k)) return false;
      if (anyF('fac') && !f.fac[c.f]) return false;
      if (anyF('kind') && !f.kind[c.t]) return false;
      if (anyF('cost') && !f.cost[c.c]) return false;
      if (anyF('word') && !Object.keys(f.word).some(w => hasWord(k, w))) return false;
      if (f.thr && !PAIRS.some(p => (p.a === k && n(p.b)) || (p.b === k && n(p.a)))) return false;
      return true;
    }
    function clearF() { st.f.fac = {}; st.f.kind = {}; st.f.cost = {}; st.f.word = {}; st.f.thr = false; }
    function refilter() { paintTools(); paintGrid(); grid.scrollTop = 0; }
    // the chips, by group: only what's in your cards. Painted inline where there's room and in the Filter sheet.
    const groupBoxes = [];
    function chip(g, key, label, o) {
      o = o || {};
      const on = g === 'thr' ? st.f.thr : !!st.f[g][key];
      return el('button', { type: 'button', class: 'adk-chip ' + (o.cls || '') + (on ? ' on' : ''), 'aria-pressed': String(on), 'aria-label': o.say || label, style: o.c ? { '--c': o.c } : null,
        html: (o.html || '') + (o.bare ? '' : '<span>' + esc(label) + '</span>'),
        onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); if (g === 'thr') st.f.thr = !st.f.thr; else if (st.f[g][key]) delete st.f[g][key]; else st.f[g][key] = 1; refilter(); } });
    }
    function paintGroups(box) {
      box.innerHTML = '';
      const has = fn => pool.some(fn), grp = (name, cls, kids) => { kids = kids.filter(Boolean); if (kids.length) box.appendChild(el('div', { class: 'adk-grp ' + cls }, [el('span', { class: 'adk-gl', text: name }), el('div', { class: 'adk-chips' }, kids)])); };
      grp('Faction', 'fac', FACS.filter(f => f !== 'N').map(f => has(k => CARDS[k].f === f) ? chip('fac', f, FAC[f].n, { cls: 'fac', c: FAC[f].c, html: '<i class="dot"></i>' }) : null));
      grp('Kind', 'kind', KINDS.map(x => has(k => CARDS[k].t === x[0]) ? chip('kind', x[0], x[1], { cls: 'kind', html: U.MARK[x[0]] }) : null));
      grp('Spark', 'cost', COSTS.map(c => has(k => CARDS[k].c === c) ? chip('cost', c, String(c), { cls: 'cost', bare: true, html: '<b>' + c + '</b>', say: c + ' Spark' }) : null));
      grp('Keyword', 'word', WORDS.map(w => has(k => hasWord(k, w[0])) ? chip('word', w[0], w[1]) : null).concat([chip('thr', '', 'Threads with this deck', { cls: 'thr', html: THREAD })]));
    }
    function paintTools() {
      groupBoxes.forEach(b => { if (b.isConnected) paintGroups(b); });
      const act = activeN();
      filterBtn.className = 'adk-chip adk-fbtn' + (act ? ' on' : ''); filterBtn.innerHTML = Kit.icon('sliders') + '<span>Filter</span>' + (act ? '<b>' + act + '</b>' : '');
      filterBtn.setAttribute('aria-label', act ? 'Filter, ' + act + ' on' : 'Filter');
      mineBtn.classList.toggle('on', st.f.mine); mineBtn.setAttribute('aria-pressed', String(st.f.mine));
      const si = SORTS.findIndex(x => x[0] === st.sort), nextS = SORTS[(si + 1) % SORTS.length];
      sortBtn.innerHTML = Kit.icon('swap') + '<span>' + SORTS[si][1] + '</span>'; sortBtn.setAttribute('aria-label', 'Sorted by ' + SORTS[si][1].toLowerCase() + '. Sort by ' + nextS[1].toLowerCase());
      sortEl.querySelectorAll('button').forEach(b => { const on = b.getAttribute('data-s') === st.sort; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
      // what's on, each one tap from off (a phone, where the chips themselves are in the sheet)
      onEl.innerHTML = '';
      const off = (label, fn, o) => onEl.appendChild(el('button', { type: 'button', class: 'adk-chip on x ' + ((o && o.cls) || ''), style: o && o.c ? { '--c': o.c } : null, 'aria-label': 'Stop showing only ' + label, html: ((o && o.html) || '') + '<span>' + esc(label) + '</span>' + Kit.icon('close'), onclick: () => { Kit.sfx('tap'); fn(); refilter(); } }));
      Object.keys(st.f.fac).forEach(f => off(FAC[f].n, () => { delete st.f.fac[f]; }, { cls: 'fac', c: FAC[f].c }));
      Object.keys(st.f.kind).forEach(t => off(KINDS.filter(x => x[0] === t)[0][1], () => { delete st.f.kind[t]; }));
      Object.keys(st.f.cost).forEach(c => off(c + ' Spark', () => { delete st.f.cost[c]; }));
      Object.keys(st.f.word).forEach(w => off(WORDS.filter(x => x[0] === w)[0][1], () => { delete st.f.word[w]; }));
      if (st.f.thr) off('Threads', () => { st.f.thr = false; }, { cls: 'thr' });
    }
    let shownN = 0, showBtn = null;
    const showLabel = () => { if (showBtn) showBtn.textContent = shownN === 1 ? 'Show 1 card' : 'Show ' + shownN + ' cards'; };
    function filterSheet() {
      const box = el('div', { class: 'adk-fsheet' }); groupBoxes.push(box); paintGroups(box);
      const sh = sheet({ title: 'Filter the cards', node: box, onClose: () => { groupBoxes.splice(groupBoxes.indexOf(box), 1); showBtn = null; },
        actions: [{ label: 'Show', primary: true }, { label: 'Clear the filters', cls: 'btn-ghost', keep: true, onClick: () => { clearF(); refilter(); } }] });
      showBtn = sh.el.querySelector('.k-acts .btn-primary'); showLabel();
    }
    function paintGrid(deal) {
      const cmp = st.sort === 'time' ? byTime : st.sort === 'name' ? byName : byCost, keys = pool.filter(shows).sort(cmp);
      shownN = keys.length; showLabel();
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      let era = -1, i = 0;
      keys.forEach(k => {
        // by time: the cards sit under the name of their age
        if (st.sort === 'time') { const y = CARDS[k].y, e = y == null ? 0 : eraOf(y); if (e !== era) { era = e; grid.appendChild(el('div', { class: 'adk-era' }, [el('b', { text: e ? C.ERAS[e].n : 'Out of time' }), e ? el('small', { text: (e > 1 ? year(C.ERAS[e - 1].to) + ' to ' : 'To ') + year(C.ERAS[e].to) }) : null])); } }
        const t = tiles[k].el; t.classList.toggle('deal', !!deal); if (deal) t.style.setProperty('--i', String(Math.min(i++, 14)));
        grid.appendChild(t);
      });
      if (!keys.length) grid.appendChild(el('div', { class: 'adk-none' }, [el('b', { text: st.f.mine && !total() ? 'Nothing in the deck yet' : 'None of your cards match' }),
        btn('btn-soft btn-sm', 'Show them all', '', () => { Kit.sfx('tap'); clearF(); st.f.mine = false; refilter(); })]));
      tallyEl.innerHTML = ''; tallyEl.appendChild(el('b', { text: String(shownN) })); tallyEl.appendChild(el('small', { text: shownN === pool.length ? (shownN === 1 ? 'card' : 'cards') : 'of ' + pool.length }));
    }

    // ── the deck side, painted from the deck as it stands ──
    let lastTotal = -1, lastThr = -1;
    function paintDeck() {
      const cards = flat(), tot = cards.length, g = TX.GUIDES[st.guide];
      // the Guide: who, and what they do for the deck
      guideBtn.innerHTML = ''; guideBtn.className = 'adk-guide' + (g ? '' : ' none');
      guideBtn.setAttribute('aria-label', g ? 'Guide: ' + g.n + '. ' + g.tx + ' Change' : 'Choose a Guide');
      guideBtn.appendChild(g ? thumb(st.guide, 'adk-gp') : el('span', { class: 'adk-gp', html: Kit.icon('plus') }));
      guideBtn.appendChild(el('span', { class: 'adk-gw' }, [el('small', { text: 'Guide' }), el('b', { text: g ? g.n : 'Choose a Guide' }), g ? el('span', { text: g.tx }) : null]));
      // how many of 30
      countEl.className = 'adk-count' + (tot === DECK ? ' ok' : tot > DECK ? ' over' : '');
      countEl.innerHTML = '<b>' + tot + '</b><small>of ' + DECK + '</small>';
      if (lastTotal >= 0 && lastTotal !== tot && !still()) { countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump'); }
      // the Spark curve
      const by = COSTS.map(() => 0); cards.forEach(k => { by[Math.min(COSTS.length - 1, CARDS[k].c)]++; });
      const top = Math.max(6, Math.max.apply(null, by));
      bars.forEach((b, i) => { b.fill.style.flexBasis = 'calc((100% - 14px) * ' + (by[i] / top).toFixed(3) + ')'; b.num.textContent = by[i] ? String(by[i]) : ''; });
      curveEl.setAttribute('aria-label', 'Spark curve: ' + by.map((x, i) => x + ' at ' + i).join(', '));
      // the thirty slots, coloured by faction, and each faction's count
      const sorted = cards.slice().sort(byFac), was = lastTotal;
      Array.prototype.forEach.call(barEl.children, (p, i) => {
        const k = sorted[i]; p.className = k ? 'on' + (owned(k) < n(k) ? ' bad' : '') : ''; if (k) p.style.setProperty('--c', FAC[CARDS[k].f].c); else p.style.removeProperty('--c');
        if (k && was >= 0 && i >= was && !still()) { p.classList.add('pop'); p.style.setProperty('--i', String(Math.min(i - was, 12))); }
      });
      facEl.innerHTML = '';
      FACS.forEach(f => { const x = cards.filter(k => CARDS[k].f === f).length; if (x) facEl.appendChild(el('span', { style: { '--c': FAC[f].c } }, [el('i'), el('b', { text: String(x) }), el('small', { text: FAC[f].n })])); });
      // the years it spans, each card a tick on the line of ages
      const ys = cards.map(k => CARDS[k].y).filter(y => y != null);
      whenEl.innerHTML = '';
      if (ys.length) {
        const lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys), line = el('span', { class: 'adk-line' }), seen = {};
        whenEl.appendChild(el('span', { class: 'adk-yrs' }, lo === hi ? [el('b', { text: year(lo) })] : [el('b', { text: year(lo) }), el('span', {}, [el('small', { text: 'to' }), el('b', { text: hi < 0 || lo < 0 ? year(hi) : String(hi) })])]));
        cards.forEach(k => { const y = CARDS[k].y; if (y == null || seen[k]) return; seen[k] = 1; line.appendChild(el('i', { style: { left: (whenX(y) * 100).toFixed(1) + '%', '--c': FAC[CARDS[k].f].c } })); });
        held().forEach(p => { const a = CARDS[p.a].y, b = CARDS[p.b].y; if (a == null || b == null) return; const x1 = Math.min(whenX(a), whenX(b)), x2 = Math.max(whenX(a), whenX(b)); line.appendChild(el('u', { style: { left: (x1 * 100).toFixed(1) + '%', width: ((x2 - x1) * 100).toFixed(1) + '%' } })); });
        whenEl.appendChild(line);
      } else whenEl.appendChild(el('span', { class: 'adk-yrs dim' }, [el('small', { text: 'No years yet' })]));
      // the Threads it holds
      const th = held().length;
      thrEl.className = 'adk-thr' + (th ? ' on' : ''); thrEl.innerHTML = THREAD + '<b>' + th + '</b><small>' + (th === 1 ? 'Thread' : 'Threads') + '</small>';
      if (lastThr >= 0 && th > lastThr && !still()) { thrEl.classList.remove('glow'); void thrEl.offsetWidth; thrEl.classList.add('glow'); }
      finBtn.hidden = tot >= DECK || !pool.some(k => owned(k) > n(k));
      // thirty and a Guide: a gleam runs along the slots
      const done = tot === DECK && !!g;
      if (done && !deckEl.classList.contains('done') && lastTotal >= 0 && !still()) { barEl.classList.remove('gleam'); void barEl.offsetWidth; barEl.classList.add('gleam'); }
      deckEl.classList.toggle('done', done);
      lastTotal = tot; lastThr = th;
      // (the full list beside the cards is only painted where it shows: not on a phone held upright)
      moreBoxes.forEach(b => { if (b.isConnected && (b !== moreEl || getComputedStyle(moreEl).display !== 'none')) paintMore(b); });
    }
    function saveState() {
      const d = dirty(), label = d || !st.id ? 'Save' : 'Saved';
      const ready = d && total() === DECK && !!st.guide;   // (a deck that can be played and isn't saved yet: the button asks for it)
      [saveTop, saveDock].forEach(b => { b.disabled = !d && !!st.id; b.lastChild.textContent = label; b.classList.toggle('saved', !d && !!st.id); b.classList.toggle('ready', ready); });
      binBtn.hidden = !st.id;
    }
    function after() { syncTiles(); paintDeck(); saveState(); if (st.f.mine || st.f.thr) paintGrid(); }

    // ── everything about the deck, in full: beside the cards where there's room, in a sheet on a phone ──
    const moreBoxes = [moreEl];
    function paintMore(box) {
      const cards = flat(), keys = Object.keys(st.cnt).sort(byCost), top = box.scrollTop;
      box.innerHTML = '';
      if (box !== moreEl) {   // (in the sheet: the thirty slots and each faction's count first)
        const b = barEl.cloneNode(true); Array.prototype.forEach.call(b.children, p => p.classList.remove('pop'));
        box.appendChild(el('div', { class: 'adk-dh' }, [b, facEl.cloneNode(true)]));
      }
      // Threads: the ones it holds, then the ones a single card away
      const th = held(), nr = near(), sec = el('section', { class: 'adk-sec2 thr' }, [el('h3', {}, [el('span', { text: 'Threads' }), el('b', { text: String(th.length) })])]);
      const row = (p, need) => {
        const r = el('div', { class: 'adk-th' + (need ? ' near' : ' lit') }, [
          el('span', { class: 'adk-pair' }, [thumb(p.a, 'adk-pp' + (need === p.a ? ' off' : '')), el('i'), thumb(p.b, 'adk-pp' + (need === p.b ? ' off' : ''))]),
          el('span', { class: 'adk-tn' }, [el('b', { text: CARDS[p.a].n }), el('small', { text: 'to' }), el('b', { text: CARDS[p.b].n })]),
          need ? btn('btn-soft btn-sm adk-add', 'Add ' + CARDS[need].n, Kit.icon('plus'), () => add(need)) : null,
          el('p', { text: p.t })]);
        return r;
      };
      th.forEach(p => sec.appendChild(row(p)));
      if (nr.length) { sec.appendChild(el('h4', { text: th.length ? 'One card away' : 'One card away from a Thread' })); nr.forEach(x => sec.appendChild(row(x.p, x.need))); }
      if (!th.length && !nr.length) sec.appendChild(el('p', { class: 'adk-hint', text: 'A Thread is a card together with the card it grew from. When both are in the deck and you play them together, they score Renown.' }));
      else sec.insertBefore(el('p', { class: 'adk-hint', text: 'If you play one while the other is on your side, it scores 1 Renown.' }), sec.children[1]);
      box.appendChild(sec);
      // the cards, cheapest first
      const lst = el('section', { class: 'adk-sec2 cards' }, [el('h3', {}, [el('span', { text: 'Cards' }), el('b', { text: String(cards.length) })])]);
      let spare = false;
      keys.forEach(k => {
        const c = CARDS[k], x = st.cnt[k], bad = x > owned(k), two = x > 1 && c.t === 'fig'; if (two) spare = true;
        lst.appendChild(el('div', { class: 'adk-li' + (bad ? ' bad' : '') }, [
          el('button', { type: 'button', class: 'adk-lr', 'aria-label': 'Read ' + c.n, onclick: () => U.openView(k) }, [coin(c.c), thumb(k, 'adk-lp'), el('span', { class: 'adk-ln' }, [el('b', { text: c.n }), bad ? el('small', { text: 'You have ' + owned(k) }) : null])]),
          two ? el('span', { class: 'adk-spare', 'aria-label': 'The second is a spare. It returns for ' + Math.max(0, c.c - 1) + ' Spark', html: Kit.icon('undo') }, [coin(Math.max(0, c.c - 1))]) : null,
          el('span', { class: 'adk-lx', text: x > 1 ? 'x' + x : '' }),
          el('button', { type: 'button', class: 'adk-tm', 'aria-label': 'Take one ' + c.n + ' out', html: Kit.icon('minus'), onclick: () => take(k) })]));
      });
      if (!keys.length) lst.appendChild(el('p', { class: 'adk-hint', text: 'Tap a card to add it.' }));
      box.appendChild(lst);
      // two rules of play a builder should know
      const notes = el('section', { class: 'adk-sec2 notes' });
      if (spare) notes.appendChild(el('div', { class: 'adk-note side' }, [el('span', { class: 'adk-spare', html: Kit.icon('undo') }, [coin('-1')]), el('p', { text: 'Only one of each person stands on your side at a time. The second copy is a spare: once the first has fallen it returns for 1 Spark less.' })]));
      const drawn = el('span', { class: 'adk-slots draw' }); for (let i = 0; i < DECK; i++) drawn.appendChild(el('i', i < DRAWN ? { class: 'on' } : null));
      notes.appendChild(el('div', { class: 'adk-note' }, [drawn, el('p', { text: 'A game draws about ' + DRAWN + ' of a deck\'s ' + DECK + ' cards. Two copies of a card make it far more likely to turn up.' })]));
      box.appendChild(notes);
      box.scrollTop = top;
    }
    function details() {
      if (getComputedStyle(moreEl).display !== 'none') return;   // (it's already on the screen, beside the cards)
      const box = el('div', { class: 'adk-more sheet' });
      moreBoxes.push(box); paintMore(box);
      sheet({ title: st.n.trim() || 'This deck', node: box, actions: [{ label: 'Done', cls: 'btn-soft' }], onClose: () => { moreBoxes.splice(moreBoxes.indexOf(box), 1); } });
    }

    // ── a line about what just happened, over the foot of the cards ──
    let sayT = 0;
    function say(nodes, o) {
      o = o || {}; clearTimeout(sayT);
      sayEl.innerHTML = ''; sayEl.className = 'adk-say ' + (o.cls || '');
      nodes.forEach(x => { if (x) sayEl.appendChild(x); });
      if (o.act) sayEl.appendChild(btn('btn-soft btn-sm', o.act[0], '', () => { hush(); o.act[1](); }));
      void sayEl.offsetWidth; sayEl.classList.add('show');
      sayT = setTimeout(hush, o.ms || 3400);
    }
    function hush() { clearTimeout(sayT); sayEl.classList.remove('show'); }
    const line = (title, text, cls) => el('span', { class: 'adk-sl ' + (cls || '') }, [title ? el('b', { text: title }) : null, text ? el('span', { text: text }) : null]);

    // ── adding and taking out ──
    function nope(k) {
      const t = tiles[k]; Kit.sfx('tick'); Kit.haptic('error');
      if (t && !still()) { t.el.classList.remove('nope'); void t.el.offsetWidth; t.el.classList.add('nope'); }
    }
    function fly(k, back) {
      const t = tiles[k]; if (!t || still() || !t.el.isConnected) return;
      const a = t.card.getBoundingClientRect(), slot = barEl.children[Math.min(DECK - 1, Math.max(0, total() - 1))], b = slot.getBoundingClientRect();
      if (!a.width || !b.width || a.bottom < 0 || a.top > window.innerHeight) return;
      const g = thumb(k, 'adk-fly'); g.style.cssText += ';left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;height:' + a.height + 'px';
      sc.el.appendChild(g);
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2), s = Math.max(.08, b.height / a.height);
      const far = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', frames = back ? [{ transform: far, opacity: .9 }, { transform: 'none', opacity: 0 }] : [{ transform: 'none', opacity: .95 }, { transform: far, opacity: .5 }];
      const an = g.animate(frames, { duration: back ? 260 : 340, easing: 'cubic-bezier(.3,.7,.3,1)' });
      an.onfinish = an.oncancel = () => g.remove();
    }
    function add(k) {
      if (n(k) >= owned(k)) { nope(k); if (n(k) > 0) { const t = tiles[k]; if (t && !still()) { t.minus.classList.remove('hey'); void t.minus.offsetWidth; t.minus.classList.add('hey'); } } return; }
      if (total() >= DECK) { nope(k); countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump'); say([line(DECK + ' of ' + DECK, 'Take a card out to make room.')], { ms: 2200 }); return; }
      const before = held().length, c = CARDS[k];
      st.cnt[k] = n(k) + 1;
      Kit.sfx('deal'); Kit.haptic('light'); fly(k);
      after();
      const now = held(), tot = total();
      if (now.length > before) {
        // the other half of a Thread just went in: say how one led to the other
        const p = now.filter(x => (x.a === k || x.b === k) && n(x.a === k ? x.b : x.a))[0] || now[now.length - 1];
        Kit.sfx('sparkle'); Kit.haptic('success');
        say([el('span', { class: 'adk-pair' }, [thumb(p.a, 'adk-pp'), el('i'), thumb(p.b, 'adk-pp')]), line(CARDS[p.a].n + ' to ' + CARDS[p.b].n, p.t, 'thr')], { cls: 'thr', ms: 5200 });
        [p.a, p.b].forEach(x => { const t = tiles[x]; if (t && !still()) { t.el.classList.remove('tie'); void t.el.offsetWidth; t.el.classList.add('tie'); } });
      } else if (st.cnt[k] === 2 && c.t === 'fig') {
        say([el('span', { class: 'adk-spare', html: Kit.icon('undo') }, [coin(Math.max(0, c.c - 1))]), line('A spare ' + c.n, 'Only one stands on your side at a time. Once the first has fallen, the spare returns for ' + Math.max(0, c.c - 1) + ' Spark.')], { ms: 5200 });
      }
      if (tot === DECK) {
        setTimeout(() => { Kit.sfx('good'); Kit.haptic('success'); }, 260);
        if (!(now.length > before)) say([el('span', { class: 'adk-seal', html: Kit.icon('check') }), line(DECK + ' of ' + DECK, st.guide ? 'This deck is ready to play. Save it to keep it.' : 'Now choose a Guide.')], { cls: 'ok', ms: 3600 });
      }
    }
    function take(k) {
      if (!n(k)) return;
      fly(k, true);
      st.cnt[k]--; if (!st.cnt[k]) delete st.cnt[k];
      Kit.sfx('slide'); Kit.haptic('light'); hush();
      after();
    }
    function finish() {
      const before = JSON.stringify(st.cnt), was = total(), cards = Coll.finish({ cards: flat() });
      if (cards.length <= was) { say([line('', 'You own nothing more to add.')]); return; }
      st.cnt = {}; cards.forEach(k => { st.cnt[k] = n(k) + 1; });
      Kit.sfx('whoosh'); Kit.haptic('medium'); setTimeout(() => Kit.sfx('deal'), 140); setTimeout(() => Kit.sfx('deal'), 260);
      after();
      const added = cards.length - was;
      say([el('span', { class: 'adk-seal', html: WAND }), line(added + (added === 1 ? ' card' : ' cards') + ' added', cards.length === DECK ? 'It\'s a full deck. Change anything you like.' : 'That\'s every card you own.')],
        { cls: 'ok', ms: 6000, act: ['Undo', () => { st.cnt = JSON.parse(before); Kit.sfx('slide'); after(); }] });
    }

    // ── the Guide ──
    function pickGuide() {
      const box = el('div', { class: 'adk-guides' }); let sh = null;
      guides().forEach(g => {
        const x = TX.GUIDES[g], on = st.guide === g;
        box.appendChild(el('div', { class: 'adk-gr' + (on ? ' on' : '') }, [
          el('button', { type: 'button', class: 'adk-gb', 'aria-pressed': String(on), onclick: () => { const ch = st.guide !== g; st.guide = g; sh.close(); if (ch) { Kit.sfx('flip'); Kit.haptic('medium'); } after(); if (ch && total() === DECK) say([el('span', { class: 'adk-seal', html: Kit.icon('check') }), line(x.n + ' is now the Guide', 'This deck is ready to play. Save it to keep it.')], { cls: 'ok' }); } },
            [thumb(g, 'adk-gp'), el('span', { class: 'adk-gw' }, [el('b', { text: x.n }), el('span', { text: x.tx })]), on ? el('i', { class: 'adk-seal', html: Kit.icon('check') }) : null]),
          el('button', { type: 'button', class: 'adk-tr', 'aria-label': 'Read ' + x.n, html: Kit.icon('eye'), onclick: () => U.openView(g) })]));
      });
      // who else there is to meet, and when
      const nx = Coll.nextUp().filter(x => x.id === 'guide')[0];
      if (nx) box.appendChild(el('div', { class: 'adk-gr next' }, [el('span', { class: 'adk-gp', html: Kit.icon('lock') }), el('span', { class: 'adk-gw' }, [el('b', { text: nx.what }), el('span', { text: nx.when + '. You have ' + nx.have + '.' })])]));
      sh = sheet({ title: 'Who guides this deck?', node: box, actions: [{ label: 'Close', cls: 'btn-ghost' }] });
    }

    // ── saving, deleting, leaving ──
    function save() {
      if (!dirty() && st.id) return;
      st.n = st.n.trim() || 'My deck'; nameIn.value = st.n;
      const rec = Coll.saveDeck({ id: st.id, n: st.n, guide: st.guide, cards: flat() });
      st.id = rec.id; st.n = rec.n; nameIn.value = rec.n; fitName(); orig = snap(); saveState();
      const why = Coll.problems(rec);
      Kit.sfx('good'); Kit.haptic('success');
      say([el('span', { class: 'adk-seal', html: Kit.icon('check') }), line('Saved', why.length ? 'Not ready to play yet: ' + why[0].charAt(0).toLowerCase() + why[0].slice(1) + '.' : 'Ready to play.')], { cls: why.length ? '' : 'ok', ms: 3000 });
    }
    function remove() {
      Kit.sfx('tap');
      sheet({ title: 'Delete ' + (st.n.trim() || 'this deck') + '?', html: '<p class="muted">The cards stay in your collection.</p>', actions: [
        { label: 'Delete it', danger: true, onClick: () => { Coll.deleteDeck(st.id); Kit.sfx('whoosh'); Kit.haptic('medium'); orig = snap(); sc.close(); } },
        { label: 'Keep it', cls: 'btn-ghost' }] });
    }
    function leave() {
      sheet({ title: 'Save your changes?', html: '<p class="muted">' + esc(st.n.trim() || 'This deck') + ' has changes that aren\'t saved.</p>', actions: [
        { label: 'Save and leave', primary: true, onClick: () => { save(); sc.close(); } },
        { label: 'Leave without saving', cls: 'btn-soft', onClick: () => { orig = snap(); sc.close(); } },
        { label: 'Keep building', cls: 'btn-ghost' }] });
    }

    function onSize() { hush(); fitName(); paintDeck(); }
    window.addEventListener('resize', onSize);
    groupBoxes.push(inlineF);
    paintTools(); paintGrid(true); after(); fitName();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (sc.el.isConnected) fitName(); });
    // a recipe you don't own all of: offer to fill the gaps from your own cards
    if (o.copy && o.short > 0) setTimeout(() => { if (!sc.el.isConnected) return; sheet({ title: (DECK - o.short) + ' of ' + o.copy + '\'s ' + DECK + ' cards are yours',
      html: '<p class="muted">They\'re in your new deck. The other ' + o.short + ' can come from the rest of your cards.</p>',
      actions: [{ label: 'Finish it for me', primary: true, onClick: finish }, { label: 'I\'ll choose them', cls: 'btn-soft' }] }); }, 420);
    else if (!st.guide && guides().length > 1 && !deck.id) setTimeout(() => { if (sc.el.isConnected && !document.querySelector('.k-scrim.show')) pickGuide(); }, 420);
  }

  window.AnoriaDecks = { open: open };
})();
