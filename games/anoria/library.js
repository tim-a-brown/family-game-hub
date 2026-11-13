// Anoria: the Library. Every card in the set has a spot: yours in full colour (with the ladder of its finishes), the
// ones you've only met across the table in grey, and the ones you've never seen as the card back with nothing showing
// but a sash in its faction's colour and where it sits in time.
//
// Two ways to look at it:
//   Binder    a grid to roll through, with the count, filters and sorts
//   Timeline  every card and Place in order of time, with the Threads drawn as lines from a card to what it grew
//             from (gold when both ends are yours). Upright, time runs down the screen with the lines gathered in
//             a channel down the middle; sideways it runs left to right with the channel across the middle.
//
//   AnoriaLibrary.open(done)   done() is called when the Library closes
//
// The rules of collecting live in coll.js (AnoriaColl); the card face, the card reader and the screen frame are the
// table's (AnoriaUI in ui.js, which loads after this file, so it's looked up when the Library opens).
(function () {
  'use strict';
  let U = null, C, TX, Coll, CARDS, FAC, REG, ERAS, el, esc;
  const SORTS = [['time', 'Time'], ['cost', 'Cost'], ['might', 'Might'], ['reg', 'Region'], ['name', 'Name'], ['newest', 'Newest']];
  const HAVE = [['own', 'Yours'], ['seen', 'Seen'], ['new', 'Not found']];
  const KINDS = [['fig', 'Figure'], ['deed', 'Deed'], ['relic', 'Relic']];
  const WORDS = [['legacy', 'Legacy'], ['voyager', 'Voyager'], ['scholar', 'Scholar'], ['guard', 'Guard'], ['steadfast', 'Steadfast'], ['inspiring', 'Inspiring'], ['swift', 'Swift'], ['raider', 'Raider']];
  // how each reward that's next is earned, in two or three words (the full sentence is a tap away)
  const EARN = { daily: 'Win today', normal: 'Beat Normal', hard: 'Beat Hard', built: 'Your own deck' };
  const GIFT = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5h16V20H4zM3 7.5h18v4H3zM12 7.5V20M12 7.5c-1.4-4-6.6-3.6-5.4-.6.5 1 2.4.6 5.4.6ZM12 7.5c1.4-4 6.6-3.6 5.4-.6-.5 1-2.4.6-5.4.6Z"/></svg>';
  const ARROW = '<svg class="ar" viewBox="0 0 28 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6h24M20.5 1.5 25.5 6l-5 4.5"/></svg>';
  const blankF = () => ({ have: [], fac: [], kind: [], cost: [], might: [], era: [], reg: [], key: [] });
  // what the Library remembers while the page stays open
  const st = { view: 'binder', sort: 'time', f: blankF(), thread: null };
  const calm = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  // ═══ The set, in order of time ════════════════════════════════════════════════════════════════════════════
  // A spot on the timeline is a card (its key) or a Place ('@' + its id, the way cards.js names what a card grew from).
  let ALL, NODES, LINKS, IDX, BUS, LANES;
  const isPl = id => id[0] === '@';
  const keyOf = id => isPl(id) ? id.slice(1) : id;   // the name AnoriaUI.info and the pictures go by
  const nameOf = id => isPl(id) ? C.PLACES[id.slice(1)].n : CARDS[id].n;
  const whenOf = id => isPl(id) ? C.PLACES[id.slice(1)].y : CARDS[id].y;
  const facOf = id => isPl(id) ? FAC.P : FAC[CARDS[id].f];
  const stateOf = id => isPl(id) ? 'place' : Coll.cardState(id);   // Places are part of the story: never owned, never hidden
  const known = id => stateOf(id) !== 'new';
  const owned = id => { const s = stateOf(id); return s === 'own' || s === 'place'; };
  const yearText = y => y < 0 ? (-y) + ' BC' : y < 1000 ? 'AD ' + y : String(y);
  // The era a year falls in (0 = no year at all: Rift stands outside time). The Library goes by the year alone, so
  // the timeline never runs backwards.
  function eraOf(id) { const y = whenOf(id); if (y == null) return 0; for (let e = 1; e < ERAS.length; e++) if (y <= ERAS[e].to) return e; return ERAS.length - 1; }
  const eraName = e => e ? ERAS[e].n : 'Outside time';
  const eraSpan = e => !e ? 'No year at all' : e === 1 ? 'Before ' + yearText(ERAS[1].to) : yearText(ERAS[e - 1].to) + ' to ' + yearText(ERAS[e].to);

  function boot() {
    if (U) return;
    U = window.AnoriaUI; C = U.C; TX = U.TX; Coll = U.Coll; CARDS = U.CARDS; FAC = U.FAC; REG = U.REG; ERAS = C.ERAS; el = U.el; esc = U.esc;
    ALL = Object.keys(CARDS);
    const rank = { place: 0, fig: 1, relic: 2, deed: 3 };
    NODES = ALL.filter(k => CARDS[k].y != null).map(k => ({ id: k, y: CARDS[k].y, r: rank[CARDS[k].t] }))
      .concat((C.SHOWN || Object.keys(C.PLACES)).map(p => ({ id: '@' + p, y: C.PLACES[p].y, r: 0 })))
      .sort((a, b) => a.y - b.y || a.r - b.r || (a.id < b.id ? -1 : 1)).map(n => n.id);
    IDX = {}; NODES.forEach((id, i) => { IDX[id] = i; });
    ALL.filter(k => CARDS[k].y == null).forEach((k, i) => { IDX[k] = NODES.length + i; });
    // every line there is: a Figure's Legacy (insp) and what any card grew from (from), each with its true sentence
    LINKS = [];
    ALL.forEach(k => { const c = CARDS[k]; (c.insp || []).concat(c.from || []).forEach(a => { if (IDX[a] != null && IDX[a] < NODES.length) LINKS.push({ id: a + '>' + k, a: a, b: k, tx: TX.LINKS[a + '>' + k] || '' }); }); });
    // Lines that start at the same card share one run down the channel. Runs that overlap in time sit side by side:
    // BUS[source] = {lo, hi (the first and last spot it reaches), lane}
    BUS = {};
    LINKS.forEach(l => { const a = IDX[l.a], b = IDX[l.b], B = BUS[l.a] || (BUS[l.a] = { lo: a, hi: a }); B.lo = Math.min(B.lo, b); B.hi = Math.max(B.hi, b); });
    const ends = [];
    Object.keys(BUS).map(k => BUS[k]).sort((a, b) => a.lo - b.lo || a.hi - b.hi).forEach(B => { let i = 0; while (ends[i] != null && ends[i] >= B.lo) i++; ends[i] = B.hi; B.lane = i; });
    LANES = Math.max(1, ends.length);
  }
  const linkLit = l => owned(l.a) && owned(l.b), linkKnown = l => known(l.a) && known(l.b);
  // what a line has to say: its sentence, or (while one end is still undiscovered) only that it's there
  function linkText(l) {
    if (linkKnown(l)) return l.tx;
    if (known(l.a)) return 'A Legacy Line runs on from ' + nameOf(l.a) + ' to a card you haven\'t found.';
    if (known(l.b)) return nameOf(l.b) + ' grew from a card you haven\'t found.';
    return 'A Legacy Line runs between two cards you haven\'t found.';
  }
  // A named Thread laid out to read: its cards in the order cards.js gives them, each Place just ahead of the card
  // that grew from it, and the lines among them in that order
  function threadPlan(t) {
    const places = (t.places || []).map(p => '@' + p), inn = {}; t.cards.concat(places).forEach(x => { inn[x] = 1; });
    const links = LINKS.filter(l => inn[l.a] && inn[l.b]), order = [], put = x => { if (order.indexOf(x) < 0) order.push(x); };
    t.cards.forEach(k => { links.forEach(l => { if (l.b === k && isPl(l.a)) put(l.a); }); put(k); }); places.forEach(put);
    const steps = []; order.forEach(x => links.forEach(l => { if (l.b === x) steps.push(l); }));
    return { order: order, links: links, steps: steps };
  }

  // ═══ Small pieces ═════════════════════════════════════════════════════════════════════════════════════════
  const tap = () => { Kit.sfx('tap'); Kit.haptic('light'); };
  // a small picture of a spot: the card's art, a Place's art in a round frame, or the card back with its sash
  function thumb(id, cls) {
    const s = stateOf(id), p = el('span', { class: 'lb-th ' + s + (cls ? ' ' + cls : ''), style: { '--f': facOf(id).c } });
    if (s === 'new') p.appendChild(el('i', { class: 'lb-rib' })); else { const im = U.artImg(keyOf(id), true) || U.mono(keyOf(id)); if (im) p.appendChild(im); }
    return p;
  }
  // the card back for a card never seen: its faction's sash, and (in the binder) its era on a plate
  function backEl(k, plate) {
    return el('span', { class: 'lb-back', style: { '--f': FAC[CARDS[k].f].c } }, [el('i', { class: 'lb-rib' }), plate ? el('span', { class: 'lb-plate', text: eraName(eraOf(k)) }) : null]);
  }
  function countUp(node, to) {
    if (calm() || to < 2) { node.textContent = String(to); return; }
    const t0 = performance.now();
    (function step(t) { const p = Math.min(1, (t - t0) / 650), e = 1 - Math.pow(1 - p, 3); node.textContent = String(Math.round(to * e)); if (p < 1 && node.isConnected) requestAnimationFrame(step); })(t0);
  }

  // ═══ The screen ═══════════════════════════════════════════════════════════════════════════════════════════
  let L = null;   // the Library while it's open: its screen and the parts of it
  function open(done) {
    if (L) return;
    boot();
    const scr = U.screen({ title: 'Library', cls: 'an-lib', onClose: () => { shut(); Coll.lookedAll(); if (done) done(); } });   // (New marks last for one visit)
    L = { scr: scr, first: true, wide: false,
      root: el('div', { class: 'lb' }), side: el('aside', { class: 'lb-side' }), main: el('div', { class: 'lb-main' }), scroll: el('div', { class: 'lb-scroll' }),
      ledger: el('section', { class: 'lb-led', 'aria-label': 'Your collection' }), bar: el('div', { class: 'lb-bar' }), acts: el('div', { class: 'lb-acts' }),
      view: el('div', { class: 'lb-view' }), cap: el('div', { class: 'tl-cap', 'aria-live': 'polite' }) };
    L.main.appendChild(L.scroll); L.main.appendChild(L.cap); L.root.appendChild(L.side); L.root.appendChild(L.main); scr.body.appendChild(L.root);
    L.view.addEventListener('click', onViewTap);
    L.scroll.addEventListener('scroll', hideHint, { passive: true });
    // a mouse wheel rolls the sideways timeline along
    L.scroll.addEventListener('wheel', e => { if (L && L.wide && st.view === 'timeline' && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { L.scroll.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    // The device turned, or the window changed: lay it out again. The timeline is set out from the room it has (its
    // width upright, its height sideways), so it's drawn again when that changes, keeping what was chosen.
    L.onResize = () => { clearTimeout(L.rz); L.rz = setTimeout(() => {
      if (!L) return; const w = L.wide, was = L.room; arrange();
      if (w !== L.wide) drawView(); else if (T && was !== L.room) { const keep = { id: T.link && T.link.l.id, soft: T.soft, step: T.step }; drawTimeline(keep); }
    }, 140); };
    window.addEventListener('resize', L.onResize);
    arrange(); drawAll();
    L.first = false;
  }
  function shut() { if (!L) return; window.removeEventListener('resize', L.onResize); clearTimeout(L.rz); hideHint(); L = null; T = null; }
  // Upright, everything is one column that scrolls, with the switch and the filters pinned as you go. Sideways (and
  // wide), what you only look at (the count, what's next) stands on the left, the cards you tap fill the right and
  // the switch and filters move up into the top bar.
  function arrange() {
    const w = window.innerWidth, h = window.innerHeight; L.wide = w > h && w >= 640; L.room = L.wide ? h : w;
    L.root.classList.toggle('wide', L.wide);
    if (L.wide) { L.side.appendChild(L.ledger); L.scr.tools.appendChild(L.bar); L.scr.tools.appendChild(L.acts); }
    else { L.scr.tools.appendChild(L.acts); L.scroll.insertBefore(L.bar, L.scroll.firstChild); L.scroll.insertBefore(L.ledger, L.bar); }
    if (L.view.parentNode !== L.scroll) L.scroll.appendChild(L.view);
  }
  function drawAll() { drawActs(); drawLedger(); drawBar(); drawView(); }
  // after packs were opened or decks changed: draw it again, and let the cards that are new to you arrive
  function refresh(before) {
    if (!L) return;
    drawAll();
    if (!before) return;
    const got = ALL.filter(k => !before[k] && Coll.copies(k));
    if (got.length) { Kit.sfx('sparkle'); got.forEach(k => { const n = L.view.querySelector('[data-k="' + k + '"],[data-id="' + k + '"]'); if (n) n.classList.add('arrive'); }); }
  }
  const ownedNow = () => { const o = {}; ALL.forEach(k => { if (Coll.copies(k)) o[k] = 1; }); return o; };

  // ── Top right: the packs waiting to be opened, and the way to the deck builder ──────────────────────────────
  function drawActs() {
    const a = L.acts, n = Coll.packs().length; a.innerHTML = '';
    if (n && window.AnoriaPacks) a.appendChild(el('button', { type: 'button', class: 'lb-btn gold', 'aria-label': 'Open ' + n + (n > 1 ? ' packs' : ' pack'), html: Kit.icon('sparkle') + '<b>' + n + '</b><span>' + (n > 1 ? 'packs' : 'pack') + '</span>',
      onclick: () => { tap(); const b = ownedNow(); window.AnoriaPacks.open(() => refresh(b)); } }));
    if (window.AnoriaDecks) a.appendChild(el('button', { type: 'button', class: 'lb-btn dk', 'aria-label': 'Decks', html: Kit.icon('cards') + '<span>Decks</span>', onclick: () => { tap(); window.AnoriaDecks.open(null, () => refresh()); } }));
    a.classList.toggle('two', a.childNodes.length > 1);
  }

  // ── The ledger: how much of the set is yours, and what's next to earn ───────────────────────────────────────
  function drawLedger() {
    const c = Coll.counts(), th = Coll.threads(), g = el('div', { class: 'lb-li' }); L.ledger.innerHTML = ''; L.ledger.appendChild(g);
    const num = el('b', { text: String(c.own) });
    const cell = (cls, label, a, b, fn) => el('button', { type: 'button', class: 'lb-cell ' + cls, 'aria-label': label + ': ' + a + ' of ' + b, onclick: () => { tap(); fn(); } }, [el('small', { text: label }), el('span', { html: '<b>' + a + '</b> of ' + b })]);
    g.appendChild(el('div', { class: 'lb-top' }, [
      el('div', { class: 'lb-count' + (c.own === c.cards ? ' all' : ''), 'aria-label': c.own + ' of ' + c.cards + ' cards are yours' }, [num, el('span', { html: '<em>of ' + c.cards + '</em><small>' + (c.own === c.cards ? 'the whole set' : 'cards') + '</small>' })]),
      el('div', { class: 'lb-cells' }, [
        cell('gd', 'Guides', c.guides, c.guidesAll, () => { if (window.AnoriaRewards) window.AnoriaRewards.collection(() => refresh()); else showGuides(); }),
        cell('th', 'Legacy Lines', th.filter(t => t.done).length, th.length, () => threadSheet())])]));
    // one bar for the whole set: yours, seen, not found
    const none = c.cards - c.own - c.seen;
    g.appendChild(el('div', { class: 'lb-meter', 'aria-hidden': 'true' }, [['two', c.own], ['seen', c.seen], ['new', none]].map(x => x[1] ? el('i', { class: x[0], style: { 'flex-grow': x[1] } }) : null)));
    // the three kinds of spot, counted. Each one is also a switch: show only those.
    const n = { own: c.own, seen: c.seen, new: none };
    g.appendChild(el('div', { class: 'lb-key' }, HAVE.map(h => el('button', { type: 'button', class: 'lb-k ' + h[0] + (st.f.have.indexOf(h[0]) >= 0 ? ' on' : ''), 'aria-pressed': String(st.f.have.indexOf(h[0]) >= 0), 'aria-label': n[h[0]] + ' ' + h[1],
      onclick: () => { tap(); flip('have', h[0]); drawLedger(); drawBar(); drawView(); } }, [el('i'), el('b', { text: String(n[h[0]]) }), el('span', { text: h[1] })]))));
    // the foils found so far, counted: one gem for each edition, with how many cards you have in it
    if (Coll.edCounts && window.AnoriaEd) { const ed = Coll.edCounts();
      g.appendChild(el('div', { class: 'lb-edrow', role: 'img', 'aria-label': 'Foils found: ' + Coll.EDITIONS.slice(1).map((x, i) => ed[i + 1] + ' ' + x.n).join(', ') }, [el('small', { class: 'lb-cap', text: 'Foils' })].concat(
        Coll.EDITIONS.slice(1).map((x, i) => el('span', { class: 'lb-ed' + (ed[i + 1] ? ' on' : '') }, [window.AnoriaEd.gem(i + 1, !ed[i + 1]), el('b', { text: String(ed[i + 1]) }), el('i', { text: window.AnoriaEd.SHORT[i + 1] })]))))); }
    g.appendChild(nextRow());
    if (L.first) { countUp(num, c.own); L.ledger.classList.add('in'); }
  }
  // What's next to earn: the sphere with its signs lit, how many more bring it round, and how many turns of it to the
  // next Guide. A tap opens the sphere's screen, with every calling.
  function nextRow() {
    const R = window.AnoriaRewards; if (!R) return nextRow0();
    const sp = Coll.sphere(), left = sp.of - sp.lit;
    return el('button', { type: 'button', class: 'lb-next lb-sph', 'aria-label': sp.lit + ' of ' + sp.of + ' signs on the sphere are lit. Open the sphere', onclick: () => { tap(); R.path(() => refresh()); } }, [
      R.sphere({ lit: sp.lit, size: 58 }),
      el('span', { class: 'lb-sph-w' }, [el('small', { class: 'lb-cap', text: 'The sphere' }), el('b', { text: sp.lit + ' of ' + sp.of + ' signs' }),
        el('span', { text: left + (left === 1 ? ' more sign brings a pack.' : ' more signs bring a pack.') + (sp.toGuide ? ' A new Guide joins you in ' + sp.toGuide + (sp.toGuide === 1 ? ' turn.' : ' turns.') : '') })])]);
  }
  function nextRow0() {
    const row = el('div', { class: 'lb-next' }, [el('small', { class: 'lb-cap', text: 'Next to earn' })]), seals = el('div', { class: 'lb-seals' });
    Coll.nextUp().forEach(x => {
      let seal, label, say;
      if (x.id === 'guide' || x.id === 'sphere') return;
      {
        const n = x.n || Coll.PACK;
        seal = el('span', { class: 'lb-seal pack', html: Kit.icon(x.done ? 'check' : 'cards') + '<b>' + n + '</b>' });
        label = x.done ? 'Won today' : EARN[x.id];
        say = (x.id === 'daily' ? (x.done ? 'Tomorrow\'s first win' : 'Your first win today') : x.when) + ' earns a pack of ' + n + '.';
      }
      seals.appendChild(el('button', { type: 'button', class: 'lb-nx' + (x.done ? ' done' : ''), 'aria-label': say, onclick: () => { tap(); Kit.toast(say, 2600); } }, [seal, el('span', { text: label })]));
    });
    row.appendChild(seals); return row;
  }

  // ── The switch between the two views, with the binder's filter and sort beside it ───────────────────────────
  function drawBar() {
    const b = L.bar; b.innerHTML = '';
    b.appendChild(el('div', { class: 'lb-seg', role: 'tablist' }, [['binder', 'Binder'], ['timeline', 'Timeline']].map(v => el('button', { type: 'button', role: 'tab', class: st.view === v[0] ? 'on' : '', 'aria-selected': String(st.view === v[0]), text: v[1], onclick: () => setView(v[0]) }))));
    if (st.view !== 'binder') { const th = Coll.threads(), got = th.filter(t => t.done).length;
      b.appendChild(el('button', { type: 'button', class: 'lb-btn thr', 'aria-label': 'Legacy Lines: ' + got + ' of ' + th.length + ' complete', html: KNOT + '<span>Legacy Lines</span>', onclick: () => { tap(); threadSheet(); } })); return; }
    const n = filterCount(), so = SORTS.filter(x => x[0] === st.sort)[0];
    b.appendChild(el('button', { type: 'button', class: 'lb-btn flt' + (n ? ' on' : ''), 'aria-label': 'Filter' + (n ? ', ' + n + ' on' : ''), html: FUNNEL + '<span>Filter</span>' + (n ? '<b>' + n + '</b>' : ''), onclick: () => { tap(); filterSheet(); } }));
    b.appendChild(el('button', { type: 'button', class: 'lb-btn srt', 'aria-label': 'Sorted by ' + so[1].toLowerCase() + '. Change the order', html: Kit.icon('swap') + '<span>' + so[1] + '</span>',
      onclick: () => { Kit.sfx('flip'); Kit.haptic('light'); st.sort = SORTS[(SORTS.indexOf(so) + 1) % SORTS.length][0]; drawBar(); drawView(); } }));
  }
  const FUNNEL = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';
  function setView(v, keep) {
    if (st.view === v && !keep) return;
    if (!keep) { Kit.sfx('slide'); Kit.haptic('light'); }
    st.view = v; hideHint(); drawBar();
    L.scroll.scrollTop = 0; L.scroll.scrollLeft = 0;
    drawView();
  }
  function drawView() {
    hideHint();
    L.root.classList.toggle('v-tl', st.view === 'timeline'); L.root.classList.toggle('v-bn', st.view !== 'timeline');
    L.scroll.classList.toggle('across', st.view === 'timeline' && L.wide);
    L.root.style.setProperty('--barh', (L.wide ? 0 : L.bar.offsetHeight) + 'px');   // (the era names pin under the switch)
    if (st.view === 'timeline') drawTimeline(); else { T = null; drawBinder(); }
  }
  // a tap anywhere in the view: a card in the binder, a Guide, a spot on the timeline, or a line
  function onViewTap(e) {
    const kn = T && e.target.closest('.tl-k'); if (kn) { tapLoom(e, T.links[+kn.dataset.l]); return; }
    const b = e.target.closest('.lb-c, .tl-n');
    if (b && b.dataset.g) { if (b.classList.contains('locked')) { const tr = L.view.querySelector('.lb-track'); if (tr) { tr.classList.remove('nudge'); void tr.offsetWidth; tr.classList.add('nudge'); } } U.openView(b.dataset.g); return; }
    if (b) { tapSpot(b, b.dataset.k || b.dataset.id); return; }
    if (T && e.target.closest('.tl-in')) tapLoom(e);
  }
  function tapSpot(b, id) {
    if (isPl(id)) { U.openView(id.slice(1)); return; }
    if (Coll.cardState(id) === 'new') { mystery(b, id); return; }
    if (b.classList.contains('fresh')) { Coll.looked(id); b.classList.remove('fresh'); const t = b.querySelector('.lb-new, .tl-new'); if (t) t.remove(); }
    // (every card you have found on this page, in its order, as one strip to slide through)
    const all = Array.from(L.view.querySelectorAll('.lb-c, .tl-n')).map(x => x.dataset.k || x.dataset.id).filter(x => x && !isPl(x) && Coll.cardState(x) !== 'new');
    U.openView(id, { list: all.filter((x, i) => all.indexOf(x) === i), counts: Coll.load().cards });
  }
  // A card never seen stays shut: it starts to turn, falls back, and gives up only its faction and its era. The plate
  // that says so stands in one place, low in the middle of the screen, whichever card was tapped (Tim: "the callout
  // location shouldn't be based on where i tap"); the card itself shows which one it is about by turning. A tap on
  // another card changes the plate's words where it stands, with no flash, and a second tap on the same card hides it.
  let hintEl = null, hintT = 0, hintK = null;
  function hideHint() { if (!hintEl) return; const h = hintEl; hintEl = null; hintK = null; clearTimeout(hintT); h.classList.remove('show'); setTimeout(() => h.remove(), 200); }
  function mystery(b, k) {
    if (hintEl && hintK === k) { Kit.sfx('tap'); hideHint(); return; }
    Kit.sfx('tick'); Kit.haptic('light');
    b.classList.remove('peek'); void b.offsetWidth; b.classList.add('peek');
    const f = FAC[CARDS[k].f], kids = [el('i'), el('b', { text: f.n }), el('span', { text: eraName(eraOf(k)) })];
    if (hintEl) { hintEl.innerHTML = ''; kids.forEach(x => hintEl.appendChild(x)); hintEl.style.setProperty('--f', f.c); }
    else { hintEl = el('div', { class: 'lb-hint', role: 'status', style: { '--f': f.c } }, kids); document.body.appendChild(hintEl); const h = hintEl; requestAnimationFrame(() => h.classList.add('show')); }
    hintK = k; clearTimeout(hintT); hintT = setTimeout(hideHint, 3200);
  }

  // ═══ The binder ═══════════════════════════════════════════════════════════════════════════════════════════
  const filterCount = () => Object.keys(st.f).reduce((n, g) => n + st.f[g].length, 0);
  function flip(g, v) { const a = st.f[g], i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); }
  // A card never seen is known only by its sash and its era (and a Relic's sash says Relic), so any other
  // filter leaves it out
  function match(k, f) {
    f = f || st.f;
    const c = CARDS[k], s = Coll.cardState(k), has = (g, v) => !f[g].length || f[g].indexOf(v) >= 0;
    if (!has('have', s) || !has('fac', c.f) || !has('era', eraOf(k))) return false;
    if (s === 'new') return !(f.cost.length || f.might.length || f.reg.length || f.key.length) && (!f.kind.length || (c.f === 'N' && f.kind.indexOf('relic') >= 0));
    if (!has('kind', c.t) || !has('cost', c.c) || (f.reg.length && f.reg.indexOf(c.reg) < 0)) return false;
    if (f.might.length && (c.t !== 'fig' || f.might.indexOf(c.m) < 0)) return false;   // (Might: Figures only)
    return !f.key.length || f.key.some(w => w === 'legacy' ? !!c.insp : !!(c.k && c.k[w]));
  }
  // By time: as the timeline has them. By cost or name: the ones never seen go last (neither is known). Newest: not
  // yet looked at first, then yours with the latest to join you first (cards are kept in the order they joined).
  function sortKeys(keys) {
    const nm = (a, b) => CARDS[a].n < CARDS[b].n ? -1 : CARDS[a].n > CARDS[b].n ? 1 : 0, time = (a, b) => IDX[a] - IDX[b], un = k => Coll.cardState(k) === 'new' ? 1 : 0;
    if (st.sort === 'cost') keys.sort((a, b) => un(a) - un(b) || (un(a) ? time(a, b) : CARDS[a].c - CARDS[b].c || nm(a, b)));
    // (by Might: Figures strongest first, then the other cards; by region: grouped as the map's regions, Figures and Domains with a home first)
    else if (st.sort === 'might') { const mt = k => CARDS[k].t === 'fig' ? CARDS[k].m : -1; keys.sort((a, b) => un(a) - un(b) || (un(a) ? time(a, b) : mt(b) - mt(a) || nm(a, b))); }
    else if (st.sort === 'reg') { const RO = Object.keys(REG), rg = k => CARDS[k].reg ? RO.indexOf(CARDS[k].reg) : 99; keys.sort((a, b) => un(a) - un(b) || (un(a) ? time(a, b) : rg(a) - rg(b) || nm(a, b))); }
    else if (st.sort === 'name') keys.sort((a, b) => un(a) - un(b) || (un(a) ? time(a, b) : nm(a, b)));
    else if (st.sort === 'newest') {
      const s = Coll.load(), at = {}; Object.keys(s.cards).forEach((k, i) => { at[k] = i; });
      const r = k => { const x = Coll.cardState(k); return x === 'own' ? (s.fresh[k] ? 0 : 1) : x === 'seen' ? 2 : 3; };
      keys.sort((a, b) => r(a) - r(b) || (r(a) < 2 ? at[b] - at[a] : time(a, b)));
    } else keys.sort(time);
    return keys;
  }
  function cardTile(k, i) {
    const s = Coll.cardState(k), c = CARDS[k], fresh = s === 'own' && !!Coll.load().fresh[k];
    const b = el('button', { type: 'button', class: 'lb-c ' + s + (fresh ? ' fresh' : ''), 'data-k': k, style: { '--i': Math.min(i, 17) },
      'aria-label': s === 'new' ? 'Not found yet. ' + FAC[c.f].n + ', ' + eraName(eraOf(k)) : c.n + (s === 'own' ? (fresh ? ', new' : '') : ', seen, not yours') });
    b.appendChild(el('span', { class: 'lb-cf' }, [s === 'new' ? backEl(k, st.sort !== 'time') : U.cardEl(k, { mini: true })]));   // (by time, the era is the heading it sits under)
    b.appendChild(s === 'seen' ? el('span', { class: 'lb-pips eye', html: Kit.icon('eye') }) : el('span', { class: 'lb-pips' }));
    // the editions of the card you have found, as a ladder of five: Matte, Shiny, Silver foil, Gold foil, Rainbow foil
    if (s === 'own' && Coll.editions) { const have = Coll.editions(k);
      b.appendChild(el('span', { class: 'lb-eds', role: 'img', 'aria-label': 'Found in ' + U.listOf(Coll.EDITIONS.filter((x, e) => have[e]).map(x => x.n)) }, have.map((on, e) => el('i', { class: 'e' + e + (on ? ' on' : '') })))); }
    if (fresh) b.appendChild(el('span', { class: 'lb-new', text: 'New' }));
    return b;
  }
  function drawBinder() {
    const v = L.view; v.innerHTML = ''; v.className = 'lb-view bn' + (L.first ? ' in' : ' re');
    const keys = sortKeys(ALL.filter(k => match(k))), on = filterCount();
    if (on) v.appendChild(filterRow(keys.length));
    let grid = null, era = -1;
    keys.forEach((k, i) => {
      if (st.sort === 'time' && eraOf(k) !== era) { era = eraOf(k); grid = null; v.appendChild(el('h2', { class: 'lb-era' }, [el('b', { text: eraName(era) }), el('i', { text: eraSpan(era) })])); }
      if (!grid) { grid = el('div', { class: 'lb-grid' }); v.appendChild(grid); }
      grid.appendChild(cardTile(k, i));
    });
    if (!keys.length) v.appendChild(el('div', { class: 'lb-none' }, [el('i', { class: 'lb-back' }), el('p', { text: 'No card fits all of that.' })]));
    if (!on) v.appendChild(guideShelf());
  }
  // what's filtering, each one a chip that lifts it, and how many cards are left
  function filterRow(n) {
    const row = el('div', { class: 'lb-on' }, [el('span', { class: 'lb-on-n', html: '<b>' + n + '</b> ' + (n === 1 ? 'card' : 'cards') })]);
    groups().forEach(g => g[2].forEach(o => { if (st.f[g[0]].indexOf(o[0]) < 0) return;
      row.appendChild(el('button', { type: 'button', class: 'lb-chip on', 'aria-label': 'Stop filtering by ' + o[1], style: o[2] ? { '--f': o[2] } : null, html: (o[2] ? '<i></i>' : '') + '<span>' + esc(o[1]) + '</span>' + Kit.icon('close'), onclick: () => { tap(); flip(g[0], o[0]); drawLedger(); drawBar(); drawView(); } })); }));
    row.appendChild(el('button', { type: 'button', class: 'lb-clear', text: 'Clear', onclick: () => { tap(); st.f = blankF(); drawLedger(); drawBar(); drawView(); } }));
    // (cards never seen drop out of any filter that asks what isn't known about them)
    const deep = st.f.kind.length || st.f.cost.length || st.f.reg.length || st.f.key.length;
    if (deep) { const lean = Object.assign({}, st.f, { kind: [], cost: [], reg: [], key: [] }), hid = ALL.filter(k => Coll.cardState(k) === 'new' && match(k, lean) && !match(k)).length;
      if (hid) row.appendChild(el('span', { class: 'lb-hid' }, [el('i', { class: 'lb-back' }), el('span', { text: hid + ' not found yet ' + (hid === 1 ? 'keeps its' : 'keep their') + ' secrets' })])); }
    return row;
  }
  const groups = () => [
    ['have', 'In your collection', HAVE],
    ['fac', 'Faction', ['D', 'S', 'V', 'A', 'W'].map(f => [f, FAC[f].n, FAC[f].c])],
    ['kind', 'Kind', KINDS],
    ['cost', 'Spark cost', [0, 1, 2, 3, 4, 5].map(n => [n, String(n)])],
    ['might', 'Might', [...new Set(Object.keys(CARDS).filter(k => CARDS[k].t === 'fig').map(k => CARDS[k].m))].sort((a, b) => a - b).map(n => [n, String(n)])],   // (every Might a Figure has: the 1-Spark Figures brought 1)
    ['era', 'Era', ERAS.map((e, i) => i ? [i, e.n] : null).filter(Boolean)],
    ['reg', 'Home region', Object.keys(REG).map(r => [r, REG[r]])],
    ['key', 'Keyword', WORDS]
  ];
  function filterSheet() {
    const box = el('div', { class: 'lb-fs' }); let sh = null;
    const count = () => ALL.filter(k => match(k)).length;
    function paint() {
      box.innerHTML = '';
      groups().forEach(g => {
        box.appendChild(el('div', { class: 'label', text: g[1] }));
        box.appendChild(el('div', { class: 'lb-chips' + (g[0] === 'cost' || g[0] === 'might' ? ' nums' : '') }, g[2].map(o => { const on = st.f[g[0]].indexOf(o[0]) >= 0;
          return el('button', { type: 'button', class: 'lb-chip' + (on ? ' on' : ''), 'aria-pressed': String(on), style: o[2] ? { '--f': o[2] } : null, html: (o[2] ? '<i></i>' : '') + '<span>' + esc(o[1]) + '</span>', onclick: () => { tap(); flip(g[0], o[0]); paint(); } }); })));
      });
      const go = sh && sh.el.querySelector('.k-acts .btn-primary'), n = count(); if (go) go.textContent = n === 1 ? 'Show 1 card' : 'Show ' + n + ' cards';
    }
    sh = Kit.sheet({ title: 'Filter', node: box, actions: [{ label: 'Show cards', primary: true }, { label: 'Clear', cls: 'btn-ghost', keep: true, onClick: () => { st.f = blankF(); paint(); } }], onClose: () => { if (L) { drawLedger(); drawBar(); drawView(); } } });
    paint();
  }
  // The Guides: the ones with you in colour, the rest waiting in grey behind a lock (the sphere and their callings bring
  // them: the sphere's screen, from the ledger)
  function guideShelf() {
    const s = Coll.load(), all = Object.keys(C.GUIDES), mine = s.guides.filter(g => C.GUIDES[g]), rest = all.filter(g => mine.indexOf(g) < 0);
    const box = el('section', { class: 'lb-guides' }, [el('h2', { class: 'lb-era' }, [el('b', { text: 'Guides' }), el('i', { text: mine.length + ' of ' + all.length + ' with you' })])]);
    const grid = el('div', { class: 'lb-grid' });
    mine.concat(rest).forEach((g, i) => { const have = i < mine.length;
      grid.appendChild(el('button', { type: 'button', class: 'lb-c guide ' + (have ? 'own' : 'locked'), 'data-g': g, style: { '--i': i }, 'aria-label': C.GUIDES[g] + (have ? ', your Guide' : ', a Guide who hasn\'t joined you yet') },
        [el('span', { class: 'lb-cf' }, [U.cardEl(g, { mini: true })]), have ? el('span', { class: 'lb-pips' }) : el('span', { class: 'lb-pips lock', html: Kit.icon('lock') })])); });
    box.appendChild(grid); return box;
  }
  function showGuides() {
    const was = filterCount(); if (was) { st.f = blankF(); drawLedger(); }
    if (st.view !== 'binder') setView('binder', true); else if (was) { drawBar(); drawView(); }
    const g = L.view.querySelector('.lb-guides'); if (g) g.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'start' });
  }

  // ═══ The timeline ═════════════════════════════════════════════════════════════════════════════════════════
  // Spots stand on either side of a channel, in order of time and staggered so each has room. Every line leaves its
  // card for the channel, runs along its own lane and turns out again at the card that grew from it, where a knot
  // marks the join. "Along" below is the way time runs (down the screen upright, across it sideways).
  let T = null;   // the timeline as drawn: {across, inn, svg, node{id: {el, a (where along time), side, port}}, links[], link (the chosen one), soft, step}
  function drawTimeline(keep) {
    const v = L.view, across = L.wide; v.innerHTML = ''; v.className = 'lb-view tl ' + (across ? 'h' : 'v');
    const inn = el('div', { class: 'tl-in' }); v.appendChild(inn);
    const W = inn.clientWidth, H = v.clientHeight, big = across ? H >= 520 : W >= 600, tiny = across ? H < 330 : W < 340;
    const LG = big ? 9 : tiny ? 5 : 6, CM = big ? 24 : tiny ? 13 : 17, CH = (LANES - 1) * LG + 2 * CM;
    // the size of a spot: th by tw is its picture, tile its length along time, deep how far it reaches from the channel
    let th, tw, tile, deep, gap, EH, mid;
    if (across) {
      EH = big ? 40 : 28; const text = big ? 62 : 48; gap = big ? 14 : 8;
      th = Math.max(36, Math.min(big ? 190 : 96, Math.floor((H - EH - CH - 2 * text - 12) / 2))); tw = Math.round(th * 0.78);
      tile = Math.max(tw + 10, big ? 132 : 86); deep = th + text; mid = EH + (H - EH) / 2;
    } else {
      EH = big ? 62 : 54; gap = big ? 22 : 16; th = big ? 96 : tiny ? 52 : 58; tw = Math.round(th * 0.78);
      tile = th + 4; deep = Math.min((W - CH) / 2, big ? 330 : 999); mid = W / 2;
    }
    const step = (tile + gap) / 2, node = {}, eras = [];
    // each era in turn, then the card with no year
    const byEra = []; NODES.forEach(id => { const e = eraOf(id); (byEra[e] || (byEra[e] = [])).push(id); });
    const loose = ALL.filter(k => CARDS[k].y == null); if (loose.length) byEra.push(loose);
    let pos = 0;
    byEra.forEach((ids, e) => { if (!ids) return;
      const out = e >= ERAS.length, start = pos, run = (ids.length - 1) * step + tile, room = across ? Math.max(run + 24, big ? 400 : 310) : run + EH + 28;
      pos += across ? (room - run) / 2 : EH + 10;   // (sideways, an era with a card or two is still wide enough for its name)
      ids.forEach((id, j) => { node[id] = { a: pos + tile / 2 + j * step, side: j % 2 }; });
      pos = start + room;
      eras.push({ e: out ? 0 : e, ids: ids, start: start, size: pos - start });
    });
    inn.style[across ? 'width' : 'height'] = pos + 'px'; if (across) inn.style.height = H + 'px';
    inn.style.setProperty('--th', th + 'px'); inn.style.setProperty('--tw', tw + 'px'); inn.style.setProperty('--ch', CH + 'px'); inn.style.setProperty('--eh', EH + 'px');
    inn.classList.toggle('big', big); inn.classList.toggle('tiny', tiny);
    // the eras: a band each, with its name, its years and how many of its cards are yours
    eras.forEach((E, i) => {
      const cards = E.ids.filter(id => !isPl(id)), own = cards.filter(id => Coll.copies(id)).length;
      const head = el('header', { class: 'tl-eh' }, [el('div', { class: 'nm' }, [el('b', { text: eraName(E.e) }), el('i', { text: eraSpan(E.e) })]), el('div', { class: 'ct', 'aria-label': own + ' of ' + cards.length + ' yours', html: '<b>' + own + '</b><span>of ' + cards.length + '</span>' })]);
      inn.appendChild(el('div', { class: 'tl-era' + (i % 2 ? ' alt' : ''), style: across ? { left: E.start + 'px', width: E.size + 'px' } : { top: E.start + 'px', height: E.size + 'px' } }, [head]));
    });
    // the spots
    NODES.concat(loose).forEach(id => {
      const n = node[id], s = stateOf(id), pl = s === 'place', fresh = s === 'own' && !!Coll.load().fresh[id];
      const b = el('button', { type: 'button', class: 'tl-n ' + s + ' s' + n.side + (fresh ? ' fresh' : ''), 'data-id': id, style: { '--f': facOf(id).c },
        'aria-label': s === 'new' ? 'Not found yet. ' + facOf(id).n + ', ' + eraName(eraOf(id)) : nameOf(id) + (whenOf(id) != null ? ', ' + yearText(whenOf(id)) : '') + (pl ? (C.DM_LIVE ? ', a Domain' : ', a Place') : s === 'own' ? ', yours' : ', seen, not yours') });
      const pic = thumb(id, 'tl-p');

      if (fresh) pic.appendChild(el('span', { class: 'tl-new', html: Kit.icon('sparkle') }));
      b.appendChild(pic);
      b.appendChild(el('span', { class: 'tl-t' }, s === 'new' ? [el('i', { class: 'tl-blank' })] : [el('b', { class: 'tl-nm', text: nameOf(id) }), whenOf(id) != null ? el('i', { class: 'tl-y', text: yearText(whenOf(id)) }) : null]));
      const st2 = b.style;
      if (across) { st2.left = (n.a - tile / 2) + 'px'; st2.width = tile + 'px'; st2.height = deep + 'px'; st2.top = (n.side ? mid + CH / 2 : mid - CH / 2 - deep) + 'px'; n.port = n.side ? mid + CH / 2 : mid - CH / 2; }
      else { st2.top = (n.a - tile / 2) + 'px'; st2.height = tile + 'px'; st2.width = deep + 'px'; st2.left = (n.side ? mid + CH / 2 : mid - CH / 2 - deep) + 'px'; n.port = n.side ? mid + CH / 2 : mid - CH / 2; }
      n.el = b; inn.appendChild(b);
    });
    // the lines
    const xy = (a, c) => across ? [a, c] : [c, a], po = Math.round(Math.min(tile * 0.2, (across ? tw : th) * 0.28)), sp = big ? 14 : across ? 8 : 10, into = {};
    LINKS.forEach(l => { (into[l.b] || (into[l.b] = [])).push(l); });
    Object.keys(into).forEach(k => into[k].sort((p, q) => IDX[p.a] - IDX[q.a]));
    const links = LINKS.map((l, i) => {
      const A = node[l.a], B = node[l.b], lane = mid + (BUS[l.a].lane - (LANES - 1) / 2) * LG, ins = into[l.b];
      const a0 = A.a + po, a1 = B.a - po + (ins.indexOf(l) - (ins.length - 1) / 2) * sp, kn = B.port + (B.side ? -8 : 8);
      const pts = [xy(a0, A.port), xy(a0, lane), xy(a1, lane), xy(a1, B.port)];
      return { l: l, i: i, pts: pts, d: bend(pts, 5), knot: xy(a1, kn), end: xy(a1, B.port), lit: linkLit(l), known: linkKnown(l) };
    });
    const size = across ? [pos, H] : [W, pos], cls = k => 'ln ' + (k.lit ? 'lit' : k.known ? 'dim' : 'dark');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tl-loom' + (calm() || keep ? '' : ' in')); svg.setAttribute('width', size[0]); svg.setAttribute('height', size[1]); svg.setAttribute('viewBox', '0 0 ' + size[0] + ' ' + size[1]); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = links.filter(k => !k.lit).map(k => '<path class="' + cls(k) + '" data-l="' + k.i + '" d="' + k.d + '"/>').join('') +
      links.filter(k => k.lit).map(k => '<path class="glow" data-l="' + k.i + '" d="' + k.d + '"/>').join('') +
      links.filter(k => k.lit).map((k, j) => '<path class="' + cls(k) + '" data-l="' + k.i + '" pathLength="1" style="--i:' + j + '" d="' + k.d + '"/>').join('') +
      '<path class="flow-g" d=""/><path class="flow" d=""/>' +
      links.map(k => '<circle class="kn ' + (k.lit ? 'lit' : k.known ? 'dim' : 'dark') + '" data-l="' + k.i + '" cx="' + k.knot[0] + '" cy="' + k.knot[1] + '" r="' + (k.lit ? 3.8 : 2.8) + '"/>').join('');
    inn.insertBefore(svg, inn.firstChild);
    // each knot is also something to tap (a finger near a card would otherwise land on the card)
    links.forEach(k => inn.appendChild(el('button', { type: 'button', class: 'tl-k', 'data-l': k.i, style: { left: k.knot[0] + 'px', top: k.knot[1] + 'px' },
      'aria-label': k.known ? 'The line from ' + nameOf(k.l.a) + ' to ' + nameOf(k.l.b) : 'A line to a card not found yet' })));
    setTimeout(() => svg.classList.remove('in'), 2600);
    T = { across: across, inn: inn, svg: svg, node: node, links: links, link: null, soft: false, step: 0 };
    fitNames(inn); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (inn.isConnected) fitNames(inn); });   // (again once the period type is in: it's narrower than what stands in for it)
    // Something to read from the start: the Thread that was chosen, or else the first gold line (lit, not dimming
    // the rest), so the strip underneath already shows what a line has to say
    if (keep) { T.step = keep.step; T.soft = keep.soft; T.link = links.filter(k => k.l.id === keep.id)[0] || null; paint(); }
    else if (st.thread && Coll.threads().some(t => t.id === st.thread)) { paint(); reveal(); }
    else { st.thread = null; const far = k => Math.max(IDX[k.l.a], IDX[k.l.b]), early = a => a.sort((p, q) => far(p) - far(q))[0];
      const first = early(links.filter(k => k.lit)) || early(links.filter(k => k.known)); if (first) { T.link = first; T.soft = true; } paint(); }
  }
  // a path through the points with the corners rounded
  function bend(p, r) {
    let d = 'M' + p[0][0].toFixed(1) + ' ' + p[0][1].toFixed(1);
    for (let i = 1; i < p.length - 1; i++) {
      const a = p[i - 1], b = p[i], c = p[i + 1], la = Math.hypot(b[0] - a[0], b[1] - a[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]), q = Math.min(r, la / 2, lc / 2);
      if (q < 0.5) { d += 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1); continue; }
      d += 'L' + (b[0] + (a[0] - b[0]) / la * q).toFixed(1) + ' ' + (b[1] + (a[1] - b[1]) / la * q).toFixed(1) + 'Q' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + ' ' + (b[0] + (c[0] - b[0]) / lc * q).toFixed(1) + ' ' + (b[1] + (c[1] - b[1]) / lc * q).toFixed(1);
    }
    const e = p[p.length - 1]; return d + 'L' + e[0].toFixed(1) + ' ' + e[1].toFixed(1);
  }
  // a name too long for its spot is eased down a size at a time (never clipped, never under 11px)
  function fitNames(inn) {
    const across = T ? T.across : L.wide;
    inn.querySelectorAll('.tl-nm').forEach(n => {
      const box = n.parentNode, room = across ? box.clientHeight : box.parentNode.clientHeight, last = box.lastElementChild; let fs = parseFloat(getComputedStyle(n).fontSize), i = 0;
      const over = () => n.scrollWidth > n.clientWidth || last.getBoundingClientRect().bottom - n.getBoundingClientRect().top > room + 0.5;
      while (i++ < 10 && fs > 11 && over()) { fs = Math.max(11, fs - 0.6); n.style.fontSize = fs + 'px'; }
    });
  }
  // the line nearest a tap (lines that share a run down the channel: the one whose far end is nearest)
  function tapLoom(e, knot) {
    const r = T.inn.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let best = null, bd = 22;
    // on a knot: that line, or its neighbour if the tap was nearer the neighbour's knot
    if (knot) { best = knot; bd = e.clientX || e.clientY ? Math.hypot(x - knot.knot[0], y - knot.knot[1]) : 0; T.links.forEach(k => { const d = Math.hypot(x - k.knot[0], y - k.knot[1]); if (d < bd - 1) { bd = d; best = k; } }); pickLink(best); return; }
    T.links.forEach(k => {
      let d = 1e9; for (let i = 0; i < k.pts.length - 1; i++) d = Math.min(d, segDist(x, y, k.pts[i], k.pts[i + 1]));
      d += Math.hypot(x - k.end[0], y - k.end[1]) * 0.002; if (d < bd) { bd = d; best = k; }
    });
    if (best) pickLink(best); else if (T.link || st.thread) { st.thread = null; T.link = null; paint(); }
  }
  function segDist(x, y, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], n = dx * dx + dy * dy, t = n ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / n)) : 0; return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); }
  function pickLink(k) {
    if (k.lit) { Kit.sfx('sparkle'); Kit.haptic('medium'); } else { Kit.sfx('tick'); Kit.haptic('light'); }
    st.thread = null; T.link = k; T.soft = false; paint();
  }
  function plan() { const t = st.thread && C.THREADS.filter(x => x.id === st.thread)[0]; return t ? threadPlan(t) : null; }
  // light what's chosen (a line with its two ends, or a whole Thread) and let the rest fall back
  function paint() {
    if (!T) return;
    const p = plan(), hot = {}, on = {}; let cur = T.link;
    // (a named Legacy Line is walked card by card, in its order: Tim, 2026-11-12, "shouldn't the focus move from card to
    // card as I cycle between one and four". The card in front is T.at; the line that arrives at it is drawn flowing.)
    if (p) { p.order.forEach(id => { hot[id] = 1; }); p.links.forEach(l => { on[l.id] = 1; }); T.step = Math.max(0, Math.min(p.order.length - 1, T.step)); T.at = p.order[T.step];
      const arr = T.links.filter(k => k.l.b === T.at && on[k.l.id]); cur = arr.filter(k => k.lit)[0] || arr.filter(k => k.known)[0] || arr[0] || null; T.link = cur; }
    else { T.at = null; if (cur) { hot[cur.l.a] = 1; hot[cur.l.b] = 1; on[cur.l.id] = 1; } }
    const focus = !!p || (!!cur && !T.soft);
    T.inn.classList.toggle('focus', focus);
    Object.keys(T.node).forEach(id => { const c = T.node[id].el.classList; c.toggle('hot', focus && !!hot[id]); c.toggle('end', p ? id === T.at : !!cur && (cur.l.a === id || cur.l.b === id)); });
    T.svg.querySelectorAll('[data-l]').forEach(n => { n.classList.toggle('on', focus && !!on[T.links[+n.dataset.l].l.id]); });
    T.svg.querySelector('.flow').setAttribute('d', cur ? cur.d : ''); T.svg.querySelector('.flow-g').setAttribute('d', cur ? cur.d : '');
    T.svg.classList.toggle('lit-flow', !!cur && cur.lit);
    drawCap();
  }
  // bring the chosen line's far end to the middle of the screen
  function reveal() {
    const at = T && (T.at || (T.link && T.link.l.b)); if (!at || !T.node[at]) return;
    const n = T.node[at].el, sc = L.scroll, r = n.getBoundingClientRect(), s = sc.getBoundingClientRect(), how = calm() ? 'auto' : 'smooth';
    if (T.across) sc.scrollTo({ left: sc.scrollLeft + r.left - s.left - (s.width - r.width) / 2, behavior: how });
    else { const head = L.bar.offsetHeight + T.inn.querySelector('.tl-eh').offsetHeight;   // (the switch and the era's name cover the top)
      sc.scrollTo({ top: sc.scrollTop + r.top - s.top - head - (s.height - head - r.height) / 2, behavior: how }); }
  }
  // ── The strip under the timeline: what the chosen line says, with the buttons on the right ──────────────────
  function drawCap() {
    const c = L.cap; c.innerHTML = ''; if (!T) return;
    const p = plan(), k = T.link;
    const ib = (ic, label, fn, off) => el('button', { type: 'button', class: 'icon-btn', 'aria-label': label, disabled: off || null, html: ic, onclick: fn });
    c.classList.toggle('thr', !!p);
    if (p) {
      const t = Coll.threads().filter(x => x.id === st.thread)[0], acts = el('div', { class: 'tc-a' });
      const go = d => { Kit.sfx('tick'); Kit.haptic('light'); T.step += d; paint(); reveal(); };
      const N = p.order.length;
      c.appendChild(el('div', { class: 'tc-h' }, [el('b', { class: 'tc-th', text: t.n }), N > 1 ? el('span', { class: 'tc-n', text: (T.step + 1) + ' of ' + N }) : null]));
      if (N > 1) { acts.appendChild(ib(Kit.icon('back'), 'The card before', () => go(-1), T.step < 1)); acts.appendChild(ib(Kit.icon('right'), 'The next card', () => go(1), T.step >= N - 1)); }
      acts.appendChild(ib(Kit.icon('close'), 'Leave this Legacy Line', () => { tap(); st.thread = null; T.link = null; paint(); }));
      c.appendChild(acts);
    }
    const end = id => el('span', { class: 'tc-e ' + stateOf(id) }, [thumb(id), el('b', { text: known(id) ? nameOf(id) : 'Not found' })]);
    if (p && T.at && !k) {   // (the first card of the line: nothing arrives at it)
      c.appendChild(el('div', { class: 'tc-pair' }, [end(T.at)]));
      c.appendChild(el('p', { class: 'tc-tx' + (known(T.at) ? '' : ' hush'), text: known(T.at) ? t0(p) + ' begins with ' + nameOf(T.at) + '.' : t0(p) + ' begins with a card you haven\u2019t found.' }));
    } else if (k) {
      c.appendChild(el('div', { class: 'tc-pair' + (k.lit ? ' lit' : '') }, [end(k.l.a), el('span', { class: 'tc-to' }, [el('span', { class: 'tc-ar', html: ARROW }), end(k.l.b)])]));
      c.appendChild(el('p', { class: 'tc-tx' + (k.known ? '' : ' hush'), text: linkText(k.l) }));
    } else c.appendChild(el('p', { class: 'tc-tx hush', text: p ? 'These stand together, with no line between them.' : 'Every line is something true.' }));
  }
  const t0 = p => { const t = Coll.threads().filter(x => x.id === st.thread)[0]; return t ? t.n : 'This Legacy Line'; };
  const KNOT = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M7.2 6H13a3 3 0 0 1 3 3v6.8"/></svg>';

  // ═══ The named Threads ════════════════════════════════════════════════════════════════════════════════════
  // A list with how much of each is yours. Choosing one opens its chain: each card in order under the sentence that
  // joins it to the one it grew from, and a way to see it lit on the timeline.
  function threadSheet(openId) {
    const box = el('div', { class: 'lb-ths' }); let sh = null, open = openId || st.thread || null;
    function paint() {
      box.innerHTML = '';
      box.appendChild(el('p', { class: 'th-gift', html: '<span>A named Legacy Line is complete when every card on it is yours.</span>' }));
      Coll.threads().forEach(t => {
        const p = threadPlan(C.THREADS.filter(x => x.id === t.id)[0]), isOpen = open === t.id;
        const row = el('div', { class: 'th-row' + (t.done ? ' done' : '') + (isOpen ? ' open' : '') });
        row.appendChild(el('button', { type: 'button', class: 'th-h', 'aria-expanded': String(isOpen), 'aria-label': t.n + ': ' + (t.done ? 'complete' : t.have.length + ' of ' + t.cards.length + ' cards'),
          onclick: () => { tap(); open = isOpen ? null : t.id; paint(); if (!isOpen) setTimeout(() => { const r = box.querySelector('.th-row.open'); if (r) r.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'nearest' }); }, 60); } }, [
          el('span', { class: 'th-nm', text: t.n }),
          el('span', { class: 'th-ct', html: t.done ? Kit.icon('check') + '<b>Complete</b>' : '<b>' + t.have.length + '</b> of ' + t.cards.length }),
          el('span', { class: 'th-cards' }, p.order.map(id => thumb(id)))]));
        if (isOpen) {
          const chain = el('div', { class: 'th-chain' });
          p.order.forEach(id => {
            const s = stateOf(id), ins = p.links.filter(l => l.b === id), tx = el('div', { class: 'th-tx' });
            // (the line between the pictures says where a link runs from, so each card shows only the true sentence of a
            // link it has found: Tim, 2026-11-12, "a link still to be found" and "from X" were saying it twice)
            ins.forEach(l => { if (linkKnown(l)) tx.appendChild(el('p', { class: linkLit(l) ? 'lit' : '', text: l.tx })); });
            chain.appendChild(el('div', { class: 'th-n ' + s + (ins.length ? '' : ' root') + (s === 'new' ? ' nf' : '') }, [
              el('button', { type: 'button', class: 'th-pic', 'aria-label': s === 'new' ? 'Not found yet' : nameOf(id), onclick: e => { if (s === 'new') mystery(e.currentTarget, id); else U.openView(keyOf(id)); } }, [thumb(id)]),
              el('div', { class: 'th-w' }, [el('b', { text: s === 'new' ? 'Not found' : nameOf(id) }), s !== 'new' && whenOf(id) != null ? el('i', { text: yearText(whenOf(id)) }) : null, tx])]));
          });
          chain.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-block', text: 'Show this Legacy Line on the timeline', onclick: () => { Kit.sfx('whoosh'); Kit.haptic('medium'); st.thread = t.id; sh.close(); if (L) setView('timeline', true); } }));
          row.appendChild(chain);
        }
        box.appendChild(row);
      });
    }
    paint();
    sh = Kit.sheet({ title: 'Legacy Lines', node: box, actions: [{ label: 'Done', cls: 'btn-soft' }] });
  }

  window.AnoriaLibrary = { open: open, lines: threadSheet };
})();
