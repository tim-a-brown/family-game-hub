// Anoria: the playable table. The rules live in engine.js (AnoriaEngine); this file draws the table, lets a
// player pick up a card or a Figure and shows where it can go, and plays back what the engine did from its
// event log (S.ev), one moment at a time.
(function () {
  'use strict';
  const E = window.AnoriaEngine, C = window.AnoriaCards, TX = window.AnoriaText, LAND = window.AnoriaLand || [];
  // (every Guide a game can hold: today's, and those who have left the roster, whom a game saved with one still shows)
  const TXG = Object.assign({}, TX.OLD_GUIDES || {}, TX.GUIDES);
  const NUM = n => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen'][n] || String(n);
  // (CARDS: every card the table can be asked to show, which is the set and the cards that have left it: a game saved
  // with a retired card still plays it. The set alone is C.CARDS: the Library, the packs and the decks get that.)
  const CARDS = Object.assign({}, C.RETIRED || {}, C.CARDS), el = Kit.el, esc = Kit.esc, app = document.getElementById('app');
  const KEY = 'anoria', SAVE = 'anoria_save', FAST = 'anoria_fast', ART = 'anoria/art/';
  const Coll = window.AnoriaColl;   // your collection (coll.js): what you own, your decks, what a game earns
  // Domains: once they are on (C.DM_LIVE), the five cards on the map are Domains in every word a player reads (Tim:
  // one word, not Place). The cards' and Guides' own words are changed here once; the table's own words go through DW.
  const DW = s => (C.DM_LIVE && typeof s === 'string' ? s.replace(/\bPlace(s?)\b/g, 'Domain$1') : s);
  if (C.DM_LIVE) [TX.CARDS, TX.GUIDES, TX.OLD_GUIDES || {}, TX.RETIRED || {}].forEach(T => Object.keys(T).forEach(k => { if (T[k] && T[k].tx) T[k].tx = DW(T[k].tx); }));

  // ═══ What things are called ═════════════════════════════════════════════════════════════════════════════
  const FAC = {
    D: { n: 'Discovery', c: '#1d4f9c' }, S: { n: 'Statecraft', c: '#1f6f6a' }, V: { n: 'Valor', c: '#a3262b' },
    A: { n: 'Arts', c: '#b5672a' }, W: { n: 'Wonder', c: '#6a3a72' }, N: { n: 'Relic', c: '#6b5a36' }, P: { n: 'Place', c: '#3c4a6e' }
  };
  const REG = { MED: 'Mediterranean', AFR: 'Africa', ASIA: 'Asia', EUR: 'Europe', MIDEAST: 'Middle East', AMER: 'Americas' };
  const PLAN = { Explorers: 'Go anywhere', Legion: 'Big Might, hold the middle', Legacy: 'Chains of influence', Court: 'Control and steady Renown', Pathfinders: 'Hidden roads, swaps and sudden arrivals' };
  const DECKS = Object.keys(C.ARCH);
  const RULE = {
    library: 'Holder draws a card', silk: 'Linked to every Place', colosseum: 'Win a clash: 1 Renown', acropolis: 'Double Renown', wall: 'Defenders +1',
    stonehenge: 'Holder: +1 Spark', globe: 'Arts +1', machu: 'Own side only', timbuktu: 'Play here for 1 less', petra: 'Safe from Deeds', nineveh: '', seneca: ''
  };
  // A Domain's power in a few words on its tile (22 characters at most), by the power's word (cards.js DRULES; the whole
  // sentence is text.js DRULE). Every Domain has its own.
  const DSHORT = {
    spark: 'Holder: +1 Spark', cheap: 'Play here for 1 less', harbour: 'Every Figure at home',
    toll: 'Walk in: pay 1 Spark', monopoly: 'Held alone: +2 Spark', loan: 'Borrow 2 Spark',
    books: '1 Spark buys a card', hire: '1 Spark: +2 Might here', league: '+1 Spark per Commerce',
    fair: 'All here: +1 Spark',
    forge: 'Relics, Deeds 1 less', arms: 'Played here: +1 Might', facV: 'Valor +1', print: 'Relic or Deed: draw 1',
    kiln: '+1 Spark per Relic', strike: 'First hold: +2 Spark', ships: 'Voyagers cost 1 less',
    stay: 'Stayed here: +1 Might',
    draw: 'Holder draws a card', line: 'Legacy Lines +1 Renown', facD: 'Discovery +1',
    clock: 'Holder takes last turn', recall: 'Discard back to hand', study: 'All here draw a card',
    school: 'First played: draw 1', equal: 'All Figures start at 3',
    fort: 'Defenders +1', closed: 'Own side only', narrow: 'Two each at most', maze: 'Tied attacker falls',
    siege: 'Few defenders +2', citadel: 'Own side\'s Figures +1', relief: 'Attack the holder: +2',
    engines: 'Defenders +1 per Relic', heartland: 'At home: +2 Might', islets: 'Theirs can\'t walk out',
    rock: 'No jumping in',
    arena: 'Win a clash: 1 Renown', crowd: 'Two here: 2 Renown', facA: 'Arts +1', patron: 'Arts cost 1 less here',
    court: 'Arts here: 2 Renown', pupils: 'Legacy Lines +2 Might', memorial: 'Held again: +1 Renown',
    facW: 'Wonder +1', gathering: 'Owner walks in freely', victor: 'Victors keep +1 Might',
    confederacy: 'Two together: +1 each', punt: 'Play a Relic: 1 Renown', rank: 'Costliest Figure holds',
    ballcourt: 'Win by 3+: 2 Renown', stool: 'Mend a Seal, once', ancestors: 'Fallen return to deck',
    peace: 'Only holder clashes', sanctuary: 'Safe from Deeds', facS: 'Statecraft +1', vote: 'Holder: most Figures',
    declare: 'Behind: 2 Renown', tribute: 'Tribute: take 1 Spark', code: 'Figures here cost 3',
    treeofpeace: 'No clashes here', throne: 'Ties: last holder', treaty: 'Tied: both score',
    charter: 'Losers back to Gate', wergild: 'Knocked out: +1 Spark',
    link: 'Linked to every Domain', road: 'Walk when played', landing: 'Owner can land here',
    garrison: 'Owner: walk and clash', relay: 'Relay: swap Figures', canal: 'Linked to owner\'s Gate',
    port: 'Linked to Commerce', passage: 'Walk to their Outpost', searoad: 'Walk 2 steps from here',
    flight: 'To anywhere but a Gate' };
  // What a skill word means, written out under a card that only names it (n: the card's name). Each says what
  // happens in the game's own terms, and where it helps, what the ordinary rule is that the skill changes.
  const GLOSS = {
    voyager: ['Voyager', n => DW('most Figures have +1 Might only in their home region, and walk one Place at a time. ' + n + ' has +1 Might at every Place and can walk to any Place.')],
    scholar: ['Scholar', n => DW('you draw a card when you play ' + n + '.')],
    guard: ['Guard', n => DW('enemies at the same Place as ' + n + ' have to clash with ' + n + ' before they can clash with anyone else there.')],
    steadfast: ['Steadfast', n => DW(n + ' has +2 Might in any clash that an enemy starts.')],
    inspiring: ['Inspiring', n => DW('each of your other Figures at the same Place as ' + n + ' has +1 Might.')],
    swift: ['Swift', n => DW('most Figures can\'t walk on the turn you play them. ' + n + ' can.')],
    raider: ['Raider', n => DW(n + ' has +2 Might in a clash that ' + n + ' starts at an opponent\'s Gate or Outpost.')],
    ward: ['Ward', n => 'Opponents\' Deeds can\'t make your Figures at the same Domain as ' + n + ' miss a turn, move them, start a clash with them, stop them starting one or switch off their skills, and the Defense of Syracuse can\'t drive them back. That Domain\'s power can\'t work against them either: at Seneca Falls they keep their own Might when it is more than 3, at Himeji Castle a tie doesn\'t knock them out, at Nan Madol they can always walk out, and at Nineveh they can start a clash.', 1]   // (1: written out even under a card that says what it does, which can only say it in general)
  };
  const LEVEL = { easy: 'novice', normal: 'normal', hard: 'hard' }, LEVEL_NAME = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
  // The players' colours. Two players are gold and sky, as always. With more, each seat has a colour of its own, chosen
  // to read apart from every other one on the dark table and in red-green colour blindness (the nearest two still
  // differ by a clear step of lightness or hue: scratchpad np/cvd.py). With teams, each team is one family of colours
  // (golds, blues, pinks) and the team's own colour is its first player's (TCOL).
  const PCOL = ['#f2b84b', '#8fd3f4', '#ee7fc0', '#8a83f0', '#f4efe2', '#d9622b'];
  const TCOL = [['#f2b84b', '#e07a2e', '#f6e3a0'], ['#8fd3f4', '#5f7bea', '#c4ecff'], ['#ee7fc0', '#c05aa6', '#f4bfe6']];
  function seatColors(n, teams) { const c = PCOL.slice(0, n); if (teams) teams.forEach((t, k) => t.forEach((o, j) => { c[o] = TCOL[k % 3][j % 3]; })); return c; }
  // Who plays together, from the setup's Teams choice: teammates sit on alternating spokes (players-2026-11-13.txt):
  // 2 against 2 is seats 1 and 3 against 2 and 4, 3 against 3 is 1, 3, 5 against 2, 4, 6, and three teams of two are
  // 1 and 4, 2 and 5, 3 and 6.
  function teamsFor(n, v) {
    if (n === 4 && v === 'two') return [[0, 2], [1, 3]];
    if (n === 6 && v === 'three') return [[0, 2, 4], [1, 3, 5]];
    if (n === 6 && v === 'two') return [[0, 3], [1, 4], [2, 5]];
    return null;
  }
  // The seats' colours as --pc0 to --pc5, on the page (for what opens over the table: the scan, the clash, the log)
  // and on the table itself. Two players keep the stylesheet's gold and sky. (null: back to the stylesheet's)
  function setCols(cols) {
    const R = document.documentElement.style;
    for (let o = 0; o < 6; o++) { const c = cols && cols[o]; if (c) R.setProperty('--pc' + o, c); else R.removeProperty('--pc' + o); }
    if (dom.root) for (let o = 0; o < 6; o++) { const c = cols && cols[o]; if (c) dom.root.style.setProperty('--pc' + o, c); else dom.root.style.removeProperty('--pc' + o); }
  }
  const MARK = {
    fig: '<svg viewBox="0 0 12 12"><circle cx="6" cy="4" r="2.4" fill="#e8b04a"/><path d="M1.6 11.2c.4-3 2.3-4.3 4.4-4.3s4 1.3 4.4 4.3Z" fill="#e8b04a"/></svg>',
    legacy: '<svg viewBox="0 0 12 12"><path d="M2 7 6 3.2 10 7M2 10.6 6 6.8l4 3.8" fill="none" stroke="#e8b04a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    guide: '<svg viewBox="0 0 12 12"><path d="M2.6 1v10.4" stroke="#e8b04a" stroke-width="1.5" stroke-linecap="round"/><path d="M2.6 1.6h7.6L8 4.4l2.2 2.8H2.6z" fill="#e8b04a"/></svg>',
    relic: '<svg viewBox="0 0 12 12"><path d="M6 .8 11.2 6 6 11.2.8 6z" fill="#e8b04a"/><circle cx="6" cy="6" r="1.7" fill="#10131c"/></svg>',
    // (a Deed is a scroll, the record of a deed done; the lightning bolt is Quick's, Tim 2026-11-12)
    deed: '<svg viewBox="0 0 12 12"><path d="M3.4 1.2h6a1.5 1.5 0 0 1 0 3H8.7v5.1a1.5 1.5 0 0 1-1.5 1.5H2.6a1.5 1.5 0 0 1 0-3h.8z" fill="#e8b04a"/><path d="M4.6 4.4h2.6M4.6 6.2h2.6" stroke="#10131c" stroke-width=".8" stroke-linecap="round"/></svg>',
    quick: '<svg viewBox="0 0 12 12"><path d="M7.2.6 2.2 6.8h3.1l-.8 4.6 5.3-6.4H6.6z" fill="currentColor"/></svg>',
    place: '<svg viewBox="0 0 12 12"><path d="M1.2 4.8 6 1.4l4.8 3.4z" fill="#e8b04a"/><path d="M1.6 10.8h8.8M2.8 10.4V5.4M6 10.4V5.4M9.2 10.4V5.4" stroke="#e8b04a" stroke-width="1.4" stroke-linecap="round"/></svg>'
  };
  // (the marks of the Deeds that lie on a Domain until the count and keep clashes off it: the Peace of Westphalia,
  // two swords crossed under a bar; the Edict of Milan, a shield)
  const DIPI = {
    westphalia: '<svg viewBox="0 0 12 12"><path d="M2.4 2.4l7.2 7.2M9.6 2.4 2.4 9.6" stroke="#e8b04a" stroke-width="1.5" stroke-linecap="round"/><path d="M1.2 6h9.6" stroke="#f3ead2" stroke-width="2.2" stroke-linecap="round"/></svg>',
    milan: '<svg viewBox="0 0 12 12"><path d="M6 1 10.6 2.7v3.2c0 2.6-1.9 4.2-4.6 5.1C3.3 10.1 1.4 8.5 1.4 5.9V2.7z" fill="#e8b04a"/><path d="M6 3v6M3.8 5.2h4.4" stroke="#10131c" stroke-width="1.1" stroke-linecap="round"/></svg>'
  };
  const SVG = {
    home: '<svg viewBox="0 0 12 12"><path d="M1.4 6 6 1.8 10.6 6M2.8 5.2v5h6.4v-5" fill="none" stroke="#b8862d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    // (the marks printed on the table at the outer end of each row: what that place is. Tim, 2026-11-12)
    posGate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V11a8 8 0 0 1 16 0v10M9 21v-8a3 3 0 0 1 6 0v8M3 21h18"/></svg>',
    posOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21V10h10v11M5 10V5h2.5v2h2.5V5h4v2h2.5V5H19v5M10.5 21v-4a1.5 1.5 0 0 1 3 0v4M4 21h16"/></svg>',
    posCross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M12 5.5h6.5l2 2-2 2H12M12 12H5.5l-2 2 2 2H12M8.5 21h7"/></svg>',
    arch: '<svg viewBox="0 0 12 12"><path d="M2 11V5.5a4 4 0 0 1 8 0V11M4.6 11V6.6a1.4 1.4 0 0 1 2.8 0V11" fill="none" stroke="#10131c" stroke-width="1.6" stroke-linecap="round"/></svg>',
    swords: '<svg viewBox="0 0 24 24"><g fill="none" stroke="#e9cf86" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3l10 10M4 3v3.4M4 3h3.4M12.2 15.8l3.6-3.6M13.4 14.6 19 20.2M17.6 21.6l2.8-2.8"/><path d="M20 3 10 13M20 3v3.4M20 3h-3.4M11.8 15.8l-3.6-3.6M10.6 14.6 5 20.2M6.4 21.6l-2.8-2.8"/></g></svg>',
    // the two faces of a card you are reading: its picture large, or its words (the button on the picture)
    art: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.6" r="1.6" fill="currentColor" stroke="none"/><path d="M4 17l5-4.6 3.4 3 3-2.8L20 16.6"/></svg>',
    words: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M7.5 9.5h9M7.5 12.5h9M7.5 15.5h5.5"/></svg>',
    ff: '<svg class="ico" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 5l8 7-8 7zM13 5l8 7-8 7z"/></svg>'
  };
  const LAUREL = '<img src="anoria/ui/mark-renown.webp" alt="">';

  const SAY = TX.SAY || {}, FY = TX.FY || {};
  function info(key) {
    // (a Guide first: the seven Guides of the roster of twelve were cards before, and their old cards are still in RETIRED)
    if (CARDS[key] && !(TX.GUIDES[key] && !C.CARDS[key])) { const c = CARDS[key], t = TX.CARDS[key] || (TX.RETIRED || {})[key] || {}, old = !!(c.k0 && (!C.DM_LIVE || (S && !S.dm)));   // (old: a card whose power changed with Domains, in a game on the old map)
      return { key: key, kind: c.t, n: c.n, f: c.f, c: c.c, m: c.m, reg: c.reg, insp: c.insp, k: (old ? c.k0 : c.k) || {}, quick: c.quick, tx: DW((old && t.tx0 != null ? t.tx0 : t.tx) || ''), cap: t.cap || '', fact: t.fact || '', ll: t.ll, say: SAY[key], fy: FY[key] }; }
    if (TXG[key]) { const g = TXG[key]; return { key: key, kind: 'guide', n: g.n, f: g.f, k: {}, tx: g.tx, cap: g.cap, fact: g.fact, ll: g.ll, say: SAY[key], fy: FY[key] }; }
    if (C.PLACES[key]) { const p = C.PLACES[key], t = TX.PLACES[key] || {}, old = !!(t.tx0 != null && (!C.DM_LIVE || (S && !S.dm)));   // (old: the rule it had as a Place on the old fixed map)
      return { key: key, kind: 'place', n: p.n, f: 'P', reg: p.reg, era: p.era, d: p.d, pw: old ? p.pw0 : p.pw, k: {}, tx: DW((old ? t.tx0 : (TX.DRULE || {})[p.pw]) || ''), cap: t.cap || '', fact: t.fact || '', ll: t.ll, say: SAY[key], fy: FY[key] }; }
    return { key: key, kind: 'fig', n: key, f: 'N', k: {}, tx: '', cap: '', fact: '' };
  }
  const isPlace = key => !CARDS[key] && !TXG[key] && !!C.PLACES[key];
  const names = list => list.map(k => info(k).n).join(' or ');
  const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
  // a position on the table, as a sentence says it to the player looking at the table
  const posName = i => { const w = E.ownerOfSpoke(S, i); return w < 0 ? 'the Crossroads' : (w === ui.view && human(w) ? 'your' : Kit.poss(pname(w))) + (E.isGate(S, i) ? ' Gate' : ' Outpost'); };

  // ═══ Pictures: a missing one leaves the flat panel underneath showing ════════════════════════════════════
  const noArt = {}, hasArt = {};
  function artSrc(key, small) { return ART + (small ? 't/' : '') + (isPlace(key) ? 'place-' : '') + key + '.webp'; }
  // Cards whose pictures have not been made yet (text.js NOPIC: the 150 of the third printing, until the art pass).
  // They are known to have none from the start, so nothing ever asks the network for them: not the table, not a
  // card being read, not the warm-up of the whole set. Each shows its initial as a monogram on its faction's colour.
  const noPic = key => !!(TX.NOPIC && TX.NOPIC[key]);
  Object.keys(TX.NOPIC || {}).forEach(k => { noArt[artSrc(k, false)] = noArt[artSrc(k, true)] = 1; });
  // Small pictures that have loaded once are kept in memory, and a table drawn again shows them from there. (On
  // Tim's phone every picture went blank for a second whenever the table was redrawn: each new <img> asked the
  // service worker again, which was busy saving the release.)
  const kept = {};
  function keep(src) {
    if (src in kept || !window.fetch || !window.URL || !URL.createObjectURL) return; kept[src] = '';
    fetch(src).then(r => (r.ok ? r.blob() : null)).then(bl => { if (bl) kept[src] = URL.createObjectURL(bl); }).catch(() => {});
  }
  // The table is rebuilt whole on every step, and a new <img> is blank for a frame or more (Tim: "lots of flashing
  // throughout gameplay": every picture on the table blinked to its flat panel). So while the table is being drawn
  // (render() opens a pass) each picture it asks for is the same element it used last time, moved into the new table.
  const pool = {}; let pass = null;
  function artImg(key, small, now) {
    const src = artSrc(key, small); if (noArt[src]) return null;
    if (pass && small) {
      const n = pass[src] = (pass[src] || 0) + 1, have = pool[src] || (pool[src] = []), old = have[n - 1];
      if (old) return old;   // (still loading or long since drawn: either way it is the one to keep)
      const im = newImg(key, small, src); have[n - 1] = im; return im;
    }
    // (anywhere else, a card in flight or in a clash: painted at once from a picture already loaded, where there is
    // one, since a new <img> would show its flat panel for a frame first)
    const got = now && small && loaded[src];
    if (got && got.complete && got.naturalWidth) {
      try { const c = el('canvas', { width: got.naturalWidth, height: got.naturalHeight, 'aria-hidden': 'true' }); c.getContext('2d').drawImage(got, 0, 0); if (FY[key] != null) c.style.objectPosition = '50% ' + FY[key] + '%'; return c; } catch (e) {}
    }
    return newImg(key, small, src);
  }
  const loaded = {}, smallWait = {};
  // (a small picture is in memory from here on: whoever was waiting for it to stand in for a full one is told)
  function gotSmall(src, im) { if (!loaded[src]) loaded[src] = im; const w = smallWait[src]; if (w) { delete smallWait[src]; w.forEach(fn => fn()); } }
  function newImg(key, small, src) {
    let mem = small && kept[src];
    const im = el('img', { src: mem || src, alt: '', draggable: 'false', decoding: small ? 'sync' : 'async' });
    if (FY[key] != null) im.style.objectPosition = '50% ' + FY[key] + '%';   // (which part of the picture to keep, wherever it is cropped)
    im.onerror = function () { if (mem) { mem = ''; kept[src] = ''; im.src = src; return; } noArt[src] = 1; im.remove(); };
    im.onload = function () { hasArt[src] = 1; if (small) { keep(src); gotSmall(src, im); } };
    return im;
  }
  // the name shown where a picture is missing (left out once the picture is known to be there, so a piece
  // that is drawn again never flashes its name)
  // The same initial for the small round and square pictures of a card that has none yet (a medallion on a Legacy
  // Line, a thumbnail in a strip, a tile in the Library): drawn as SVG so that it fits whatever holds it.
  const mono = key => noPic(key) ? el('span', { class: 'mono-i', 'aria-hidden': 'true', html: '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><circle cx="50" cy="50" r="36"/><text x="50" y="52" text-anchor="middle" dominant-baseline="central">' + esc(info(key).n.replace(/^The /, '').charAt(0)) + '</text></svg>' }) : null;
  // (A card whose picture has not been made yet shows its initial as a monogram in a ring: its name is on its title
  // plate already, and twice on one card read like a placeholder.)
  const noArtLabel = (key, small, cls) => hasArt[artSrc(key, small)] ? null : noPic(key) ? el('span', { class: cls + ' mono', 'aria-hidden': 'true' }, [el('b', { text: info(key).n.replace(/^The /, '').charAt(0) })]) : el('span', { class: cls, text: info(key).n });
  function preload(keys) { keys.forEach(k => { const src = artSrc(k, true); if (hasArt[src] || noArt[src]) return; const im = new Image(); im.onload = () => { hasArt[src] = 1; keep(src); gotSmall(src, im); }; im.onerror = () => { noArt[src] = 1; }; im.src = src; }); }

  // Full-size pictures, made ready ahead of the finger (Tim, 2026-11-11: "some of the art flashes into place after
  // briefly seeing a placeholder"). warm(keys) fetches and decodes them a few at a time and says when they are all
  // ready; a pack warms its cards the moment it is torn, a strip the cards either side of the front one, the table
  // your hand. A full card whose picture is not ready is never a flat panel if the small picture is in memory: the
  // small one stands in, softened (standIn), and the full one comes up over it without a pop (comeUp).
  const full = {}, fails = {}, warmQ = []; let warmN = 0;
  function pump() { while (warmN < 4 && warmQ.length) { warmN++; warmQ.shift()(); } }
  function artReady(key) {
    const src = artSrc(key, false); if (full[src]) return full[src].p; if (noArt[src]) return Promise.resolve(false);
    const f = full[src] = { ok: false, im: null };
    f.p = new Promise(res => { warmQ.push(() => {
      const im = new Image(), done = ok => { f.ok = ok; warmN--; pump(); res(ok); }; f.im = im; im.decoding = 'async';
      im.onload = () => { hasArt[src] = 1; (im.decode ? im.decode() : Promise.resolve()).then(() => done(true), () => done(true)); };
      // (a dropped connection: it can be tried again, once. A picture that fails twice is taken to be missing, and is
      // not asked for again while the page is open.)
      im.onerror = () => { delete full[src]; if ((fails[src] = (fails[src] || 0) + 1) >= 2) noArt[src] = 1; done(false); };
      im.src = src; }); pump(); });
    return f.p;
  }
  const warm = keys => Promise.all((keys || []).filter(k => k && (CARDS[k] || TXG[k] || C.PLACES[k])).map(artReady));
  function standIn(key) {
    const got = loaded[artSrc(key, true)]; if (!got || !got.complete || !got.naturalWidth) return null;
    try { const c = el('canvas', { class: 'ac-lo', width: got.naturalWidth, height: got.naturalHeight, 'aria-hidden': 'true' }); c.getContext('2d').drawImage(got, 0, 0); if (FY[key] != null) c.style.objectPosition = '50% ' + FY[key] + '%'; return c; } catch (e) { return null; }
  }
  function comeUp(key, im) {
    const f = full[artSrc(key, false)]; if (im.tagName !== 'IMG' || (f && f.ok) || (im.complete && im.naturalWidth)) return;
    im.classList.add('ld'); const show = () => im.classList.remove('ld');
    (im.decode ? im.decode() : Promise.reject()).then(show, () => { if (im.complete) show(); else im.addEventListener('load', show); });
    // (no small picture in memory yet to stand in: it is asked for, and stands in as soon as it comes, if the full one still hasn't)
    const ssrc = artSrc(key, true);
    if (!loaded[ssrc] && !noArt[ssrc]) { (smallWait[ssrc] || (smallWait[ssrc] = [])).push(() => { if (!im.classList.contains('ld') || !im.parentNode) return; const lo = standIn(key); if (lo) im.parentNode.insertBefore(lo, im); });
      preload([key]); }
  }
  // The small pictures of the whole set (about 20 KB each), warmed a few at a time once the page is idle, so that
  // there is always one to stand in.
  function warmSmall() {
    const all = Object.keys(C.CARDS).concat(Object.keys(TX.GUIDES)); let i = 0;
    const idle = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 500));
    // (it gives way to anything that is wanted now: full pictures on their way, a pack being opened, a card being read)
    const busy = () => warmN > 0 || warmQ.length > 0 || !!document.querySelector('.pk-flow, .view');
    const step = () => { if (i >= all.length) return; if (!busy()) preload(all.slice(i, i += 4)); setTimeout(() => idle(step), busy() ? 1200 : 350); };
    // (not before the page itself has finished loading: a picture asked for sooner would hold that up)
    const begin = () => setTimeout(() => idle(step), 2500);
    if (document.readyState === 'complete') begin(); else window.addEventListener('load', begin);
  }

  // ═══ The map behind a card's text, drawn from the coastlines ═════════════════════════════════════════════
  let LB = null;
  function landBoxes() {
    if (LB) return LB; LB = [];
    for (let i = 0; i < LAND.length; i++) { const r = LAND[i]; let a = 999, b = 999, c = -999, d = -999; for (let j = 0; j < r.length; j += 2) { if (r[j] < a) a = r[j]; if (r[j] > c) c = r[j]; if (r[j + 1] < b) b = r[j + 1]; if (r[j + 1] > d) d = r[j + 1]; } LB.push([a, b, c, d]); }
    return LB;
  }
  // Sutherland–Hodgman: the part of a ring inside the frame
  function clipRing(pts, x0, y0, x1, y1) {
    const edges = [[0, x0, 1], [0, x1, -1], [1, y0, 1], [1, y1, -1]];
    for (const e of edges) {
      const ax = e[0], lim = e[1], sg = e[2], out = [], n = pts.length; if (!n) break;
      let px = pts[n - 2], py = pts[n - 1], pin = sg * ((ax ? py : px) - lim) >= 0;
      for (let i = 0; i < n; i += 2) {
        const cx = pts[i], cy = pts[i + 1], cin = sg * ((ax ? cy : cx) - lim) >= 0;
        if (cin !== pin) { const t = (lim - (ax ? py : px)) / ((ax ? cy : cx) - (ax ? py : px)); out.push(px + (cx - px) * t, py + (cy - py) * t); }
        if (cin) out.push(cx, cy);
        px = cx; py = cy; pin = cin;
      }
      pts = out;
    }
    return pts;
  }
  const mapCache = {};
  let mapN = 0;
  const MAPW = 284, MAPH = 196, DOT0 = { x: 227.2, y: 47, r: 9 };
  // at: where the dot stands in the map's own box (x, y) and its ring's radius (r; 0 for the dot alone): dotSpot() below finds the place clear of the card's words
  // how close a card's map is drawn: 10.92 to the degree, or less until some coastline (a vertex of LAND) stands well
  // inside the part of the map the card shows, not at its rim (x0: its left edge, y1: its foot; the card crops the map's box to fit
  // the paper), from the dot's line down to two thirds of the way, below the name and clear of the shield and plates
  const zoomAt = {};
  function mapZoom(ll, cx, cy, x0, y1) {
    x0 = x0 || 0; y1 = Math.min(MAPH, y1 || MAPH);
    const zk = ll.join(',') + '|' + cx + ',' + cy + ',' + x0 + ',' + y1; if (zoomAt[zk]) return zoomAt[zk];
    const B = landBoxes(), m = 14; let k = 10.92;
    for (let step = 0; step < 7; step++) {
      const ky = k / Math.cos(ll[1] * Math.PI / 180), mx = Math.max(m, (MAPW - x0) * .18), lonA = ll[0] - (cx - x0 - mx) / k, lonB = ll[0] + (MAPW - cx - mx) / k, latA = ll[1] - (y1 * .66 - cy) / ky, latB = ll[1] + Math.min(cy - m, 8) / ky;
      let seen = 0;   // (points of coastline in view: a stretch of coast, not one tip of a bay at the edge)
      for (let i = 0; i < LAND.length && seen < 25; i++) {
        const b = B[i]; if (b[2] < lonA || b[0] > lonB || b[3] < latA || b[1] > latB) continue;
        const r = LAND[i]; for (let j = 0; j < r.length && seen < 25; j += 2) if (r[j] > lonA && r[j] < lonB && r[j + 1] > latA && r[j + 1] < latB) seen++;
      }
      if (seen >= 25) break; k /= 1.45;
    }
    return (zoomAt[zk] = k);
  }
  function mapSVG(ll, color, at, reg) {
    if (!ll) return '';
    at = at || DOT0; const ck = ll.join(',') + color + '|' + at.x + ',' + at.y + ',' + at.r + ',' + (at.x0 || 0) + ',' + (at.y1 || 0) + '|' + (reg || ''); if (mapCache[ck]) return mapCache[ck];
    const tint = reg && window.AnoriaDomains && window.AnoriaDomains.REGCOL ? window.AnoriaDomains.REGCOL[reg] : null;   // (the land in a faint wash of the home region's colour: Tim, 2026-11-12)
    // (a place far from any coast, like Sitting Bull's plains, would show a blank map: the map draws back, step by step,
    // until a coastline is in view to give a bearing, and the dot stays the same size: Tim, 2026-11-12)
    const W = MAPW, H = MAPH, cx = at.x, cy = at.y, k = mapZoom(ll, cx, cy, at.x0, at.y1), ky = k / Math.cos(ll[1] * Math.PI / 180), lon0 = ll[0], lat0 = ll[1], pad = 6;
    const X = lon => cx + (lon - lon0) * k, Y = lat => cy - (lat - lat0) * ky;
    const lonA = lon0 - (cx + pad) / k, lonB = lon0 + (W - cx + pad) / k, latA = lat0 - (H - cy + pad) / ky, latB = lat0 + (cy + pad) / ky;
    const B = landBoxes(); let d = '';
    for (let i = 0; i < LAND.length; i++) {
      const b = B[i]; if (b[2] < lonA || b[0] > lonB || b[3] < latA || b[1] > latB) continue;
      const r = LAND[i], pts = new Array(r.length);
      for (let j = 0; j < r.length; j += 2) { pts[j] = X(r[j]); pts[j + 1] = Y(r[j + 1]); }
      const c = clipRing(pts, -pad, -pad, W + pad, H + pad); if (c.length < 6) continue;
      d += 'M' + c[0].toFixed(1) + ' ' + c[1].toFixed(1);
      for (let j = 2; j < c.length; j += 2) d += 'L' + c[j].toFixed(1) + ' ' + c[j + 1].toFixed(1);
      d += 'Z';
    }
    let grat = '';
    const gs = k < 6 ? 10 : 5;   // (a map drawn further back keeps its lines of latitude and longitude about as far apart)
    for (let la = Math.ceil(latA / gs) * gs; la <= latB; la += gs) grat += '<path d="M0 ' + Y(la).toFixed(1) + 'H' + W + '"/>';
    for (let lo = Math.ceil(lonA / gs) * gs; lo <= lonB; lo += gs) grat += '<path d="M' + X(lo).toFixed(1) + ' 0V' + H + '"/>';
    const id = 'anh' + (++mapN);
    const s = '<svg class="ac-map" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMaxYMin slice" aria-hidden="true"><defs><pattern id="' + id + '" width="5" height="3.2" patternUnits="userSpaceOnUse"><path d="M0 1.6H5" stroke="#5a6f78" stroke-width=".55"/></pattern></defs>' +
      '<g opacity=".3"><rect width="' + W + '" height="' + H + '" fill="url(#' + id + ')" opacity=".22"/><path d="' + d + '" fill="#f8f5ee"/><path d="' + d + '" fill="#efe6d2" opacity=".55"/>' + (tint ? '<path d="' + d + '" fill="' + tint + '" opacity=".16"/>' : '') +
      '<g fill="none" stroke="#7b6a52" stroke-width=".4" stroke-dasharray="2 3" opacity=".45">' + grat + '</g><path d="' + d + '" fill="none" stroke="#5b4a33" stroke-width=".8" stroke-linejoin="round" opacity=".55"/></g>' +
      '<g opacity=".25">' + (at.r ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + at.r + '" fill="none" stroke="' + color + '" stroke-width="1.2" opacity=".55"/>' : '') + '<circle cx="' + cx + '" cy="' + cy + '" r="3.4" fill="' + color + '"/></g></svg>';   // (the map at .3 and the dot and its ring at .25: Tim, 2026-11-12, "make the map background and dot 50% more transparent")
    mapCache[ck] = s; return s;
  }

  // The dot on a card's map stands just to the right of the card's "Place, years" line, level with the middle of that line
  // and its gilded rule (Tim, 2026-11-12:
  // "place the map dot just to the right of the "Location, Date to Date" text"), and clear of every word on the card
  // (Tim, 2026-11-11: "Eratosthenes' dot is under text - careful to be clear of all card text"); where that line runs too
  // far right for it, the search below finds the clear place nearest the upper right. A card is laid out in em, so the place is found once for each card and
  // layout, on a copy of the card set down off the screen with no transform on it: every line of text, the shield,
  // the home plate, the ribbon and the Legacy Line are boxes the dot's ring must miss, and of the places that miss
  // them all the one nearest the upper right of the paper is taken. A crowded card gets a smaller ring, then the dot
  // alone. The map is then drawn round that place.
  const dotAt = {}; let dotBox = null;
  function dotSpot(n) {
    if (!dotBox) { dotBox = el('div', { 'aria-hidden': 'true', style: { position: 'fixed', left: '-4000px', top: '0', visibility: 'hidden', pointerEvents: 'none', contain: 'layout style' } }); document.body.appendChild(dotBox); }
    const c = n.cloneNode(true); c.removeAttribute('style'); ['--lc', '--lg', '--lh'].forEach(v => { const x = n.style.getPropertyValue(v); if (x) c.style.setProperty(v, x); });
    c.classList.remove('tg'); c.style.fontSize = '14px'; c.style.transform = 'none'; dotBox.appendChild(c);
    let out = null;
    try {
      const sv = c.querySelector('.ac-map'), sr = sv && sv.getBoundingClientRect(); if (!sr || !sr.width || !sr.height) return null;
      const sc = Math.max(sr.width / MAPW, sr.height / MAPH), em = 14, boxes = [];
      const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT, { acceptNode: t => t.nodeValue.trim() && !t.parentNode.closest('svg') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
      for (let t = tw.nextNode(); t; t = tw.nextNode()) { const rg = document.createRange(); rg.selectNodeContents(t); const rs = rg.getClientRects(); for (let i = 0; i < rs.length; i++) boxes.push(rs[i]); }
      c.querySelectorAll('.ac-st, .ac-home, .ac-ll, .ac-rib, .ac-cost, .ac-kind, button, .ed-mark, .ac-rare').forEach(x => { const q = x.getBoundingClientRect(); if (q.width && q.height) boxes.push(q); });
      const near = boxes.filter(q => q.right > sr.left - em && q.left < sr.right + em && q.bottom > sr.top - em && q.top < sr.bottom + em);
      // the map's box is fitted to the paper's right edge and its top (xMaxYMin slice): where a point of it falls on the page
      const PX = x => sr.right - (MAPW - x) * sc, PY = y => sr.top + y * sc, x0 = MAPW - sr.width / sc, y1 = sr.height / sc, top = 1.9 * em / sc;
      const clear = (x, y, rad) => { const px = PX(x), py = PY(y); for (let i = 0; i < near.length; i++) { const q = near[i], dx = Math.max(q.left - px, 0, px - q.right), dy = Math.max(q.top - py, 0, py - q.bottom); if (dx * dx + dy * dy < rad * rad) return false; } return true; };
      // first choice (Tim, 2026-11-12): just to the right of the "Place, years" line, at the middle of that line and the
      // gilded rule under it taken together ("align it vertically with the text+gilded divider height combined")
      const wh = c.querySelector('.ac-when');
      if (wh && wh.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(wh); const rs = rg.getClientRects(), q = rs[rs.length - 1];
        // (every card's ring the same size, Newton's: Tim, 2026-11-12)
        if (q) for (const [r, pad] of [[6.5, .22], [6.5, .08]]) { const body = Math.max(r, 3.4), x = MAPW - (sr.right - (q.right + .45 * em + body * sc)) / sc, y = ((q.top + wh.getBoundingClientRect().bottom) / 2 - sr.top) / sc;
          if (x <= MAPW - body - 4 && y >= body + 2 && clear(x, y, body * sc + pad * em)) { out = { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2, r: r }; break; } } }
      const tiers = out ? [] : [[9, .28], [6.5, .22], [0, .16]];
      for (let ti = 0; ti < tiers.length && !out; ti++) { const r = tiers[ti][0], body = Math.max(r, 3.4), rad = body * sc + tiers[ti][1] * em; let best = 1e9;
        for (let y = Math.max(body + 2, top); y <= y1 - body - 3; y += 2.5) for (let x = MAPW - body - 4; x >= x0 + body + 4; x -= 2.5) {
          const d = (x - DOT0.x) * (x - DOT0.x) + 2.2 * (y - DOT0.y) * (y - DOT0.y); if (d >= best) continue; if (clear(x, y, rad)) { best = d; out = { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2, r: r }; } } }
      if (out) { out.x0 = Math.max(0, Math.round(x0)); out.y1 = Math.round(y1); }
    } catch (e) { out = null; }
    c.remove(); return out;
  }
  function placeDot(n, key, ll, color) {
    const sig = () => key + (n.classList.contains('hasll') ? '|l' : '') + (n.classList.contains('ed-rainbow') ? '|r' : '');
    const put = at => { const old = n.querySelector('.ac-map'); if (!old || !at) return; const t = document.createElement('div'); t.innerHTML = mapSVG(ll, color, at, n.dataset.reg); old.replaceWith(t.firstChild); };
    const go = () => { const s = sig(); if (!(s in dotAt)) dotAt[s] = dotSpot(n); put(dotAt[s]); };
    n._dot = go;
    // (with the faces loaded the place is found before the card is ever shown; until then it is found as soon as they are)
    if (!document.fonts || document.fonts.status === 'loaded') go(); else { const s = sig(); if (s in dotAt) put(dotAt[s]); else { n.classList.add('dotwait'); document.fonts.ready.then(() => { go(); n.classList.remove('dotwait'); }); } }
  }

  // ═══ The card ════════════════════════════════════════════════════════════════════════════════════════════
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function tear(key) {   // the torn top edge of the paper: the same tear every time for the same card
    const R = E.rng(hash(key)); let x = 0, out = ['0% ' + (R() * .5).toFixed(2) + 'em'];
    while (x < 96) { x += 3 + R() * 3.4; if (x >= 99) break; out.push(x.toFixed(1) + '% ' + (R() * .68).toFixed(2) + 'em'); }
    out.push('100% .2em', '100% 100%', '0 100%'); return 'polygon(' + out.join(',') + ')';
  }
  // Each skill word wears its own small mark in the text (Tim, 2026-11-12: "use icons in text for (chevrons) Legacy of..
  // and Guard/Steadfast, etc"): a shield for Guard, a mountain for Steadfast, a wing for Swift, a book for Scholar, a
  // globe for Voyager, a sun for Inspiring, a scimitar for Raider, a law stone for Law, a dome for Ward and Quick's bolt.
  // The mark and the word never part at a line's end. (A card's text no longer says "Legacy of": the Legacy Line drawn
  // down its side shows it. Tim, 2026-11-12: "remove 'Legacy of' text from descriptions (redundant with diagram)".)
  const KW = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">';
  const KEYI = {
    voyager: KW + '<circle cx="6" cy="6" r="4.6" stroke-width="1.3"/><ellipse cx="6" cy="6" rx="2" ry="4.6" stroke-width="1.1"/><path d="M1.4 6h9.2" stroke-width="1.1"/></svg>',
    scholar: KW + '<path d="M6 3.2C4.6 2.2 2.8 2 1.2 2.4v7.2c1.6-.4 3.4-.2 4.8.8 1.4-1 3.2-1.2 4.8-.8V2.4C9.2 2 7.4 2.2 6 3.2zM6 3.2v7.2" stroke-width="1.15"/></svg>',
    guard: KW + '<path d="M6 1.2 10.4 2.8V6c0 2.6-1.9 4.2-4.4 5-2.5-.8-4.4-2.4-4.4-5V2.8z" fill="currentColor" stroke="none"/></svg>',
    steadfast: KW + '<path d="M.6 10.8 4.4 3.8l1.9 3.2 1.7-2.5 3.4 6.3z" fill="currentColor" stroke="none"/></svg>',
    inspiring: KW + '<circle cx="6" cy="6" r="2.2" fill="currentColor" stroke="none"/><path d="M6 .8v1.6M6 9.6v1.6M.8 6h1.6M9.6 6h1.6M2.3 2.3l1.1 1.1M8.6 8.6l1.1 1.1M2.3 9.7l1.1-1.1M8.6 3.4l1.1-1.1" stroke-width="1.15"/></svg>',
    swift: KW + '<path d="M1 9.6C2.4 6 5.6 3 11.2 1.6 10.2 3.2 9.2 4 7.8 4.6c1.4 0 2.4-.3 3.2-.7C10.2 5.4 9 6.2 7.4 6.6c.9 0 1.7-.2 2.4-.5C8.4 8.2 6 9.6 1 9.6z" fill="currentColor" stroke="none"/></svg>',
    raider: KW + '<path d="M3.2 8.4C6.2 7.6 9.2 5.2 11 1c.5 3.6-1.8 7-6.6 8.9z" fill="currentColor" stroke="none"/><path d="M1.9 7.2l2.9 2.9" stroke-width="1.5"/><path d="M3 9.4 1.2 11.2" stroke-width="1.6"/></svg>',
    law: KW + '<path d="M3 11V4.2a3 3 0 0 1 6 0V11z" stroke-width="1.2"/><path d="M4.6 5.4h2.8M4.6 7.2h2.8M4.6 9h2.8" stroke-width=".9"/></svg>',
    ward: KW + '<path d="M1.4 9.6a4.6 4.6 0 0 1 9.2 0" stroke-width="1.4"/><path d="M.8 10.6h10.4" stroke-width="1.2"/><circle cx="6" cy="8.1" r="1.2" fill="currentColor" stroke="none"/></svg>',
    quick: MARK.quick
  };
  const keyMark = k => { const w = k.toLowerCase(), ic = KEYI[w]; if (!ic) return '<b>' + k + '</b>';
    const sp = k.indexOf(' '), first = sp < 0 ? k : k.slice(0, sp), rest = sp < 0 ? '' : k.slice(sp);
    return '<b class="kq"><span class="kq-n"><i class="kq-i">' + ic + '</i>' + first + '</span>' + rest + '</b>'; };
  // "+2 Might" in a card's words is the number and the game's Might shield (Tim, 2026-11-12: "she has +2 might" ->
  // "has +2 [might shield]"), the same mark as on the cards, at the size of the text and named Might for a screen
  // reader. Only what is drawn changes: text.js keeps the word, so the rules checks, the log and the history read it.
  const mightMarks = h => h.replace(/([+\u2212-]\d+) Might\b/g, '<i class="mi">$1<i class="mi-t" role="img" aria-label="Might"></i></i>');
  const SKILL = /(^|\. )(Voyager|Scholar|Guard|Steadfast|Inspiring|Swift|Raider|Law|Ward|Quick|Eureka!)(?=[.:! ]|$)/g;
  function boldKeys(tx) {
    return mightMarks(esc(tx)).replace(SKILL, (m, a, k) => a + keyMark(k));   // (Quick wears the lightning bolt)
  }
  // a card's or a Place's name as it reads in the middle of a sentence ("the Library of Alexandria", "Timbuktu")
  const THE = Object.assign({ library: 1, silk: 1, acropolis: 1, globe: 1, colosseum: 1, wall: 1 }, TX.THE || {});   // (Domains whose names take "the" mid-sentence)
  // (a Relic takes "the": the Astrolabe, the Wheel for The Wheel. Paper and Braille are not things one has one of.)
  const NO_THE = { paper: 1, braille: 1, dsteel: 1 };
  // Where a card is at home, at the foot of a full card: the same house plate with the region's outline in it that the
  // map's tiles wear (domains.js home), and the region's name beside it, centred on the plate by its capitals (Tim)
  const homeFoot = reg => { const D = window.AnoriaDomains, n = el('div', { class: 'ac-home' + (D ? ' plate' : ''), 'aria-label': 'Home region: ' + (REG[reg] || '') });
    n.appendChild(D ? D.home(reg) : el('span', { html: SVG.home })); n.appendChild(el('span', { class: 'ac-hn', text: REG[reg] || '' })); return n; };
  // A name's pronunciation breaks only between its words, never at a hyphen inside one (Tim: "MAR-kus aw- / REE-lee-us"
  // is "MAR-kus / aw-REE-lee-us")
  const sayHTML = t => String(t).split(' ').map(w => '<span class="say-w">' + esc(w) + '</span>').join(' ');
  const theName = x => x[0] === '@' ? (THE[x.slice(1)] ? 'the ' : '') + C.PLACES[x.slice(1)].n : (CARDS[x].t === 'relic' && !NO_THE[x] ? 'the ' : '') + (CARDS[x].t === 'relic' ? CARDS[x].n.replace(/^The /, '') : CARDS[x].n);
  // cardEl(key, {mini, cost}): the approved card. mini = a hand card (picture, name, cost, Might).
  // tg: a card being read has a button on its picture (Tim, 2026-11-11) that turns every such card over to its picture:
  // the picture takes the card, and what's essential (cost, Might, name, what it does in a line) keeps to a strip at the
  // foot, the same height on every card. The choice is remembered (anoria_artview) and held as a class on the page.
  function artView(on) { document.documentElement.classList.toggle('an-artview', !!on); lsSet('anoria_artview', on ? '1' : null);
    document.querySelectorAll('.ac-tg').forEach(b => { b.setAttribute('aria-pressed', String(!!on)); b.setAttribute('aria-label', on ? 'Show the card’s words' : 'Show the picture large'); }); }
  // what a card does, short enough for the strip: its own words if they are few, or just its skill words, or, for a
  // power with no skill word, its own words in two lines when they fit there (the plain short powers of 2026-11-12:
  // "+2 Might while outnumbered here."). A Legacy Figure with no other power has no words: its strip shows its name.
  function briefOf(c) {
    const tx = c.tx || ''; if (tx.length <= 46) return boldKeys(tx);
    const ks = []; tx.replace(SKILL, (m, a, k) => { if (k !== 'Eureka!') ks.push(k); return m; });
    return ks.length ? ks.map(k => keyMark(esc(k))).join('. ') + '.' : tx.length <= 80 ? boldKeys(tx) : '';
  }
  function cardEl(key, o) {
    o = o || {};
    const c = info(key), f = FAC[c.f] || FAC.N, place = c.kind === 'place', fig = c.kind === 'fig';
    const kind = place ? 'place' : c.kind === 'guide' ? 'guide' : fig ? (c.insp ? 'legacy' : 'fig') : c.kind;
    const label = { place: C.DM_LIVE ? 'Domain' : 'Place', guide: 'Guide', fig: 'Figure', legacy: 'Figure', relic: 'Relic', deed: 'Deed' }[kind];   // (a Legacy Figure is a Figure: its label wears both marks, Tim 2026-11-12)   // (a Quick Deed is a Deed with the power Quick: Tim, 2026-11-12)
    const tgPic = o.tg && !o.mini && !noPic(key);   // (a card with no picture yet has nothing to turn over to)
    const n = el('div', { class: 'ac t-' + kind + (fig && o.hush ? ' hush' : '') + (fig ? ' hasst' : '') + (o.mini ? ' mini' + (c.c != null ? ' sp' : '') : '') + (tgPic ? ' tg' : '') + (noPic(key) ? ' nopic' : ''), style: { '--f': f.c }, 'data-card': key });
    if (c.fy != null) n.style.setProperty('--fy', c.fy + '%');   // (which part of its picture this card keeps in view)
    const inn = el('div', { class: 'ac-in' });
    const art = el('div', { class: 'ac-art' }, [noArtLabel(key, !!o.mini, 'ac-noart')]);
    // (a full card shown on the table: the small picture is there at once, and the full one comes in over it)
    if (!o.mini) { const lo = standIn(key); if (lo) art.appendChild(lo); }
    const im = artImg(key, !!o.mini, o.now); if (im) art.appendChild(im);
    if (im && !o.mini) comeUp(key, im);
    inn.appendChild(art);
    if (c.c != null) { const cost = o.cost != null ? o.cost : c.c; inn.appendChild(el('div', { class: 'ac-cost' + (cost < c.c ? ' less' : '') }, [el('b', { text: String(cost) })])); }
    inn.appendChild(el('div', { class: 'ac-kind', html: (kind === 'legacy' ? MARK.legacy + MARK.fig : MARK[kind]) + '<span>' + label + '</span>' }));
    const paper = el('div', { class: 'ac-paper', style: { 'clip-path': tear(key) } });
    if (!o.mini && c.ll) { paper.innerHTML = mapSVG(c.ll, place ? '#8a6a2a' : f.c, null, c.reg); if (c.reg) n.dataset.reg = c.reg; }
    paper.appendChild(el('div', { class: 'ac-rib' }, [el('span', { text: place ? REG[c.reg] : f.n })]));
    paper.appendChild(el('div', { class: 'ac-name', text: c.n }));
    // (a small Domain says its power in the few words its tile has: Tim, 2026-11-12)
    if (o.mini && place && C.PLACES[key]) { const w = C.DM_LIVE ? C.PLACES[key].pw : C.PLACES[key].pw0; if (w && DSHORT[w]) paper.appendChild(el('div', { class: 'ac-pw', text: DSHORT[w] })); }
    if (!o.mini) {
      paper.appendChild(el('div', { class: 'ac-when', text: c.cap }));
      paper.appendChild(el('div', { class: 'ac-txt', html: boldKeys(c.tx) }));
      if (c.fact) paper.appendChild(el('div', { class: 'ac-fact', text: c.fact }));
      // (how the name is said, as fine print at the foot: a Place's paper is as tall as its words, so it goes last in it)
      if (c.say && place) paper.appendChild(el('div', { class: 'ac-say', html: sayHTML(c.say), 'aria-label': 'Said ' + c.say }));
    }
    inn.appendChild(paper);
    if (tgPic) {
      const on = document.documentElement.classList.contains('an-artview'), tx = briefOf(c);
      art.appendChild(el('button', { type: 'button', class: 'ac-tg', 'aria-pressed': String(on), 'aria-label': on ? 'Show the card’s words' : 'Show the picture large', html: '<span class="a">' + SVG.art + '</span><span class="t">' + SVG.words + '</span>',
        onpointerdown: e => e.stopPropagation(), onclick: e => { e.stopPropagation(); Kit.sfx('flip', .6); Kit.haptic('light'); artView(!document.documentElement.classList.contains('an-artview')); } }));
      inn.appendChild(el('div', { class: 'ac-brief', style: { 'clip-path': tear(key) } }, [el('i', { class: 'ac-rib' }), el('div', { class: 'ac-bn' }, [el('b', { text: c.n, class: c.n.length > 21 ? 'long' : null }), c.reg && window.AnoriaDomains ? window.AnoriaDomains.home(c.reg) : null]), tx ? el('span', { html: tx, class: tx.replace(/<[^>]+>/g, '').length > 38 ? 'two' : null }) : null]));   // (two: too long for one line, so it takes two, a little smaller: nothing is cut off)
    }
    if (fig) inn.appendChild(el('div', { class: 'ac-st m' }, [el('b', { text: String(o.might != null ? o.might : c.m) })]));
    // (a small card's home region: the house plate under the Might on its spine, as on the map's tiles. Tim, 2026-11-12)
    if (fig && o.mini && c.c != null && c.reg && window.AnoriaDomains) inn.appendChild(el('div', { class: 'ac-mh' }, [window.AnoriaDomains.home(c.reg)]));
    // the foot of a full card: how the name is said, between a Figure's Might and its home
    // and under that, in finer print, the Thread: what this card grew from (Tim: the link belongs on the card)
    if (!o.mini && !place && (c.say || fig)) {
      if (c.say) n.classList.add('hassay');
      if (fig && c.say && c.say.length > 26) n.classList.add('foot4');   // (a name said in two lines of fine print: the paper leaves more room)
      inn.appendChild(el('div', { class: 'ac-foot' }, [el('div', { class: 'ac-mid' }, [c.say ? el('div', { class: 'ac-say', html: sayHTML(c.say), 'aria-label': 'Said ' + c.say }) : null]),
        fig ? homeFoot(c.reg) : null]));
    }
    // A card's Legacy Line is printed on it as a line (Tim, 2026-11-11: "maybe legacy line is displayed vertically down
    // the right side of the card"): down the right side of the paper, one gold line for each card it grows from, that
    // card's picture at the top and its name down the line, and at the foot what the line gives as the game's marks
    // (the laurel a line scores; a Legacy Figure's Spark and Might too). Lines that are each enough join above the marks.
    const llSrc = !o.mini && !place && CARDS[key] && E.STD.threads ? (CARDS[key].insp || []).concat(CARDS[key].from || []) : [];
    if (llSrc.length) {
      const groups = []; llSrc.forEach(k => { const w = worthOf(k, key); let g = groups.filter(x => x.w === w)[0]; if (!g) groups.push(g = { w: w, ks: [] }); g.ks.push(k); });
      const rail = el('div', { class: 'ac-ll', role: 'img', 'aria-label': lineSay(llSrc, key) }); let tall = 0;
      groups.forEach(g => { const cols = el('div', { class: 'al-cols' + (g.ks.length > 1 ? ' join' : '') }); let nm = 0;
        g.ks.forEach(k => { const bare = k.replace(/^@/, ''), i2 = info(bare), im = artImg(bare, true, true) || mono(bare), r = el('i', { class: 'al-m' + (k[0] === '@' ? ' pl' : ''), style: { '--f': (FAC[i2.f] || FAC.P).c } }); if (im) r.appendChild(im);
          cols.appendChild(el('div', { class: 'al-c' }, [r, el('span', { class: 'al-n', text: i2.n }), el('i', { class: 'al-t' })])); nm = Math.max(nm, i2.n.length); });
        const each = g.w === 'legacy' && g.ks.length > 1 && !!E.STD.inspEach;   // (+1 Might for each person it names: the Might on each person's own line)
        if (each) cols.querySelectorAll('.al-c').forEach(cn => cn.appendChild(el('i', { class: 'al-k mi' }, [el('b', { text: '+1' })])));
        const marks = g.w === 'legacy' ? (each ? [['sp', '−1'], ['re', '+1']] : [['sp', '−1'], ['mi', '+1'], ['re', '+1']]) : [['re', '+1']];
        rail.appendChild(el('div', { class: 'al-g' }, [cols, el('div', { class: 'al-w' }, marks.map(m => el('i', { class: 'al-k ' + m[0] }, [el('b', { text: m[1] })])))]));
        tall = Math.max(tall, 2.1 + nm * .41 + .9 + marks.length * 1.75 + (g.w === 'legacy' ? .45 : 0)); });   // (the Spark flame stands a little taller)
      n.classList.add('hasll'); n.style.setProperty('--lc', llSrc.length); n.style.setProperty('--lg', groups.length); n.style.setProperty('--lh', tall.toFixed(2) + 'em');
      const paper = inn.querySelector('.ac-paper'); (paper || inn).appendChild(rail);
    }
    n.appendChild(inn);
    // (its edition: the finish it is shown in, its rarity mark and the edition button, editions.js. A lesson's cards are Matte.)
    if (window.AnoriaEd) window.AnoriaEd.dress(n, key, { mini: o.mini, tg: o.tg, ed: o.ed, plain: !!(G && G.demo) });
    // (a Place takes the frame of its kind, the kind's mark and name, and its home region at the foot: domains.js)
    if (place && window.AnoriaDomains) window.AnoriaDomains.dress(n, key, { mini: o.mini });
    if (!o.mini && c.ll) placeDot(n, key, c.ll, place ? '#8a6a2a' : f.c);   // (the dot on its map, clear of the card's words)
    return n;
  }

  // ═══ Reading a card full size ════════════════════════════════════════════════════════════════════════════
  let viewEl = null;
  function closeView() { if (!viewEl) return; const v = viewEl; viewEl = null; v.classList.remove('show'); document.removeEventListener('keydown', viewKey); if (v._off) v._off(); setTimeout(() => v.remove(), 220); }
  function viewKey(e) { if (e.key === 'Escape') closeView(); }
  function mightParts(f) {   // where a Figure's Might on the table comes from (the engine's sum, spelled out)
    const c = CARDS[f.c], k = E.kOf(S, f), pl = C.PLACES[S.places[f.p]], w = E.pw(S, f.p), out = [w === 'equal' ? [pl.n, 3] : ['On the card', c.m]];   // (Seneca Falls: every Figure starts from 3)
    const home = c.reg === pl.reg, at = home || k.voyager || w === 'harbour';
    if (f.ta) out.push([pl.n + ', this turn', f.ta]);   // (an Industry Domain that arms a Figure on the turn it arrives)
    if (f.tb - (f.ta || 0)) out.push([f.tq && CARDS[f.tq] ? CARDS[f.tq].n : 'Phalanx', f.tb - (f.ta || 0)]);   // (the Quick Deed played with its clash)
    if (at) out.push([home ? 'At home' : k.voyager ? 'Voyager, at home anywhere' : 'At home at ' + pl.n, 1 + (k.homeDouble && home ? 2 : 0) + (w === 'heartland' && home ? 1 : 0)]);
    if (f.vic) out.push(['Olympic victor', f.vic]);
    let own = 0, opp = 0, insp = 0;
    for (const g of S.figs) if (g.p === f.p) { if (g.o === f.o) { own++; if (g !== f && E.kOf(S, g).inspiring) insp++; } else opp++; }
    if (f.li) { const nI = (c.insp || []).filter(x => S.figs.some(g => g.o === f.o && g !== f && g.c === x)).length; out.push(['Legacy line', (S.cfg.inspEach ? Math.max(1, nI) : 1) + (w === 'pupils' ? 1 : 0)]); }   // (+1 for each person it names in play: engine.js might())
    if (insp) out.push(['Inspired', Math.min(2, insp)]);
    if (k.uprising && own > 1) out.push(['Others here', own - 1]);
    if (k.orator && own > opp) out.push(['More of you here', 2]);
    if (k.underdog && opp > own) out.push(['Outnumbered', 2]);
    if (k.monument && f.stay) out.push(['Rounds stayed', Math.min(2, f.stay)]);
    if (k.shoulders && S.P[f.o].lines) out.push(['Legacy lines', Math.min(2, S.P[f.o].lines)]);
    if (w === 'fac' + c.f) out.push([pl.n, 1]);   // (a theatre for Arts Figures, an observatory for Discovery, a capital for Statecraft, a forge for Valor, a wonder for Wonder)
    if ((w === 'stay' && f.stay >= 1) || (w === 'citadel' && E.ownerOfSpoke(S, f.p) === f.o) || (w === 'confederacy' && own >= 2)) out.push([pl.n, 1]);   // (Benin City, Citadelle Laferrière, Prophetstown)
    const sum = out.reduce((s, x) => s + x[1], 0);
    return sum === E.might(S, f, 0) ? out : null;
  }
  // A Legacy Line is drawn as a small scene of the table, not described (Tim, 2026-11-11: "I'd rather it be a
  // graphical representation of how this card connects to others, rather than using words"). The pieces are the
  // table's own: a card that is IN PLAY stands on a slab of its player's side of the board (a Figure as the piece on
  // the map, a Relic in its slot, a Place as its tile), and the card that is BEING PLAYED is a card from the hand,
  // lifted, that comes down. The gold line runs from the one to the other and carries what the line is worth as the
  // game's marks. Two scenes: what this card grows from (it is the card coming down), and what grows from this card
  // (it is the piece on the board, and the others come down along its line). Cards that can each make the line are
  // joined by a bracket. The true sentence about the two cards is the only text; a tap on another card shows that
  // card's sentence, and a tap on the card already chosen opens it.
  const KIDS = {}; Object.keys(C.CARDS).forEach(k => { const c = CARDS[k]; (c.insp || []).concat(c.from || []).forEach(sk => { (KIDS[sk] = KIDS[sk] || []).push(k); }); });
  const worthOf = (from, to) => (CARDS[to].insp || []).indexOf(from) >= 0 ? 'legacy' : 'thread';
  // each: a Legacy Figure that names two people has +1 Might for each of them in play, so that Might is drawn on each
  // person's own stretch of line (llMi), and the shared line carries the Spark and the Renown
  const llMi = () => el('i', { class: 'al-k mi ll-mi', role: 'img', 'aria-label': 'plus 1 Might' }, [el('b', { text: '+1' })]);
  function worthEl(kind, each) {
    const w = (cls, tx, say) => el('span', { class: 'ln-w ' + cls, role: 'img', 'aria-label': say }, [el('i'), el('b', { text: tx })]);
    return el('span', { class: 'ln-worth' }, [kind === 'legacy' ? w('sp', '−1', 'costs 1 Spark less') : null, kind === 'legacy' && !each ? w('mi', '+1', 'plus 1 Might') : null, w('re', '+1', 'scores 1 Renown')]);
  }
  // one card of a scene. how: 'board' (in play) or 'play' (coming down from the hand)
  function lineNode(k, how, o) {
    o = o || {}; const bare = k.replace(/^@/, ''), i2 = info(bare), place = k[0] === '@', kind = place ? 'place' : CARDS[bare] ? CARDS[bare].t : 'fig';
    const n = el(o.tap ? 'button' : 'span', { class: 'll-n ' + how + ' ' + kind + (o.me ? ' me' : ''), style: { '--f': (FAC[i2.f] || FAC.P).c }, 'data-k': k });
    if (o.tap) { n.type = 'button'; n.setAttribute('aria-label', i2.n); }
    const im = artImg(bare, true, true) || mono(bare); if (im) n.appendChild(el('span', { class: 'll-art' }, [im]));
    if (place && o.guest) n.appendChild(el('i', { class: 'll-guest', 'aria-hidden': 'true' }));   // (one of your Figures standing at the Place)
    return el('span', { class: 'll-who' + (how === 'board' ? ' onb' : '') }, [how === 'board' ? el('span', { class: 'll-slab' }, [n]) : n, o.name === false ? null : el('small', { text: i2.n })]);
  }
  // what the pictures say, for a screen reader (and it is the sentence the scene replaced)
  function lineSay(srcs, key) {
    const c = info(key), fig = CARDS[key] && CARDS[key].t === 'fig', me = CARDS[key] && CARDS[key].t === 'relic' ? theName(key) : c.n;
    const ppl = srcs.filter(x => x[0] !== '@' && CARDS[x].t !== 'relic').map(theName), rel = srcs.filter(x => x[0] !== '@' && CARDS[x].t === 'relic').map(theName), pl = srcs.filter(x => x[0] === '@').map(theName), when = [];
    if (ppl.length) when.push('With ' + listOf(ppl, 'or') + ' in play on your side');
    if (rel.length) when.push((when.length ? 'with ' : 'With ') + listOf(rel, 'or') + ' among your Relics');
    if (pl.length) when.push(fig ? (when.length ? 'when ' : 'When ') + 'you play ' + me + ' at ' + listOf(pl, 'or') : (when.length ? 'with ' : 'With ') + 'one of your Figures at ' + listOf(pl, 'or'));
    if (fig && pl.length && !ppl.length && !rel.length && !c.insp) return 'When you play ' + me + ' at ' + listOf(pl, 'or') + ', you score 1 Renown.';
    return when.join(', or ') + ', ' + me + ' ' + (c.insp ? (c.insp.length > 1 && E.STD.inspEach ? 'costs 1 Spark less, scores 1 Renown, and has +1 Might for each of them in play.' : 'costs 1 Spark less, has +1 Might and scores 1 Renown.') : 'scores 1 Renown.');
  }
  // is this card in play on the viewer's side right now? (only asked of a card in the viewer's hand, at the table)
  function inPlayNow(k, forFig) {
    if (!S || ui.view == null || !S.P[ui.view]) return false; const me = ui.view;
    if (k[0] === '@') { const p = S.places.indexOf(k.slice(1)); return p >= 0 && (forFig || S.figs.some(f => f.o === me && f.p === p)); }
    return CARDS[k].t === 'relic' ? S.P[me].relics.indexOf(k) >= 0 : S.figs.some(f => f.o === me && f.c === k);
  }
  // The scene of one line or of several that end at one card: the cards in play at the left, each on its slab with
  // its own stretch of line and what that line is worth, a bracket where there is more than one, and the card that
  // comes down at the right. o.small: the plate over a pack's card.
  function lineScene(srcs, key, o) {
    o = o || {}; const isFig = CARDS[key] && CARDS[key].t === 'fig';
    const groups = []; srcs.forEach(k => { const w = worthOf(k, key); let g = groups.filter(x => x.w === w)[0]; if (!g) groups.push(g = { w: w, ks: [] }); g.ks.push(k); });
    const alts = el('span', { class: 'll-alts n' + groups.length });
    groups.forEach(g => { const row = el('span', { class: 'll-alt' }); let any = false, each = g.w === 'legacy' && g.ks.length > 1 && !!E.STD.inspEach;
      g.ks.forEach(k => { const lit = o.state ? inPlayNow(k, isFig) : null, w = lineNode(k, 'board', { tap: o.tap, guest: !isFig }); if (lit === true) { w.classList.add('lit'); any = true; } else if (lit === false) w.classList.add('dim'); w.setAttribute('data-from', k); if (each) (w.querySelector('.ll-slab') || w).appendChild(llMi()); row.appendChild(w); });
      if (o.state && !any) row.classList.add('dim'); row.appendChild(el('span', { class: 'll-line' }, [worthEl(g.w, each)])); alts.appendChild(row); });
    const sc = el('div', { class: 'll-scene earn' + (o.small ? ' small' : '') + (srcs.length > 2 ? ' many' : '') + (o.state ? (srcs.some(k => inPlayNow(k, isFig)) ? ' on' : ' off') : ''), 'data-to': key, style: { '--n': groups.length } }, [
      el('span', { class: 'll-sr', text: lineSay(srcs, key) }), alts, groups.length > 1 ? el('i', { class: 'll-stub', 'aria-hidden': 'true' }) : null, lineNode(key, 'play', { me: true, tap: false })]);
    return sc;
  }
  // Everything a card is joined to, under the card being read. Kept plain (Tim, 2026-11-11: "legacy lines are looking
  // jumbled ... make the benefits and connections clear visually without losing information ... maybe there's a ?
  // tooltip on items like that which require more explanation"): the scene of what this card grows from, the true
  // sentence, then one row of the cards that grow from it. The ? opens the same thing said in whole sentences, with
  // this card's own names in them.
  function lineage(key, o) {
    o = o || {}; if (!CARDS[key] || !E.STD.threads) return null;
    const c = CARDS[key], i0 = info(key), srcs = (c.insp || []).concat(c.from || []), kids = o.brief && (c.insp || c.from) ? [] : (KIDS[key] || []).filter(k => CARDS[k]);
    if (!srcs.length && !kids.length) return null;
    const inHand = !!(o.live && S && G && !G.over && !G.demo && S.P[ui.view] && S.P[ui.view].hand.indexOf(key) >= 0 && !document.querySelector('.an-screen'));
    const box = el('div', { class: 'll' }), why = el('p', { class: 'ln-why' }); let sel = null;
    const tx = (from, to) => (TX.LINKS && TX.LINKS[from + '>' + to]) || '';
    function choose(from, to) { sel = from + '>' + to; why.textContent = tx(from, to); why.hidden = !why.textContent;
      box.querySelectorAll('.ll-n.chosen').forEach(n => n.classList.remove('chosen')); const other = from === key ? to : from;
      if (srcs.length + kids.length > 1) box.querySelectorAll('.ll-n[data-k="' + other + '"]').forEach(n => n.classList.add('chosen')); }
    function tap(from, to) { return e => { e.stopPropagation(); if (sel === from + '>' + to || srcs.length + kids.length === 1) openView((from === key ? to : from).replace(/^@/, '')); else { Kit.sfx('tap', .4); choose(from, to); } }; }
    // the ?: what the pictures mean, in sentences a person would say, about these very cards
    const help = el('div', { class: 'll-help', hidden: true }), says = [];
    if (srcs.length) { says.push(lineSay(srcs, key)); if (c.insp) says.push(c.insp.length > 1 ? 'With both ' + listOf(c.insp.map(k => info(k).n), 'and') + ' in play on your side, ' + i0.n + ' has +2 Might, and a gold Legacy Line on the map runs from ' + i0.n + ' to each of them.' : i0.n + ' keeps the +1 Might for as long as ' + info(c.insp[0]).n + ' is in play on your side, joined by a gold Legacy Line on the map.'); }
    const kidSay = []; if (kids.length) { const th = kids.filter(k => worthOf(key, k) === 'thread'), lg = kids.filter(k => worthOf(key, k) === 'legacy'), all = th.concat(lg);
      kidSay.push('With ' + theName(key) + ' in play on your side, ' + listOf(all.map(k => CARDS[k].t === 'relic' ? theName(k) : CARDS[k].n), 'and') + (all.length > 1 ? ' each score 1 Renown as you play them.' : ' scores 1 Renown as you play that card.'));
      if (lg.length) kidSay.push(listOf(lg.map(k => CARDS[k].n), 'and') + (lg.length > 1 ? ' also cost 1 Spark less and have' : ' also costs 1 Spark less and has') + ' +1 Might for as long as the Legacy Line holds.'); }
    kidSay.forEach(t => says.push(t));
    if (S && S.cfg && S.cfg.lineCap !== 0) says.push('Only one Legacy Line scores in each round. A second one made in the same round still joins the two cards, and scores nothing.');   // (only in a game saved under the old rule)
    says.forEach(t => help.appendChild(el('p', { text: t })));
    const q = el('button', { type: 'button', class: 'll-q', 'aria-label': 'What a Legacy Line does', 'aria-expanded': 'false', text: '?', onclick: e => { e.stopPropagation(); help.hidden = !help.hidden; q.setAttribute('aria-expanded', String(!help.hidden)); q.classList.toggle('on', !help.hidden); Kit.sfx('tap', .4);
      // (the words open inside the notes: if they would run off the screen the notes scroll, and the card stays where it is)
      const vn = box.closest('.view-notes, .vf-notes'); if (!help.hidden && vn) { const r = vn.getBoundingClientRect(); if (vn.classList.contains('view-notes') && !vn.classList.contains('scroll') && r.top + vn.scrollHeight > window.innerHeight - 10) { vn.classList.add('scroll'); vn.style.maxHeight = Math.max(120, Math.round(r.height)) + 'px'; }
        vn.scrollTop += help.getBoundingClientRect().top - vn.getBoundingClientRect().top - 46; } } });
    box.appendChild(el('div', { class: 'll-head' }, [el('div', { class: 'ln-k', text: 'Legacy Line' }), q]));
    if (srcs.length) { const sc = lineScene(srcs, key, { tap: true, state: inHand }); sc.querySelectorAll('.ll-who[data-from]').forEach(a => { a.querySelector('.ll-n').onclick = tap(a.getAttribute('data-from'), key); });
      // (the card comes down once as the notes open, and again at a tap on it)
      const me = sc.querySelector('.ll-n.me'); if (me) me.parentNode.onclick = e => { e.stopPropagation(); sc.classList.remove('go'); void sc.offsetWidth; sc.classList.add('go'); };
      sc.classList.add('go'); box.appendChild(sc); }
    box.appendChild(why); box.appendChild(help);
    if (kids.length) {
      // (what grows from this card: the cards themselves in a row on one line that starts at this card, each a tap away)
      const rail = el('span', { class: 'll-rail' });
      kids.forEach(k => { const w = lineNode(k, 'play', { tap: true }); w.classList.add('kid'); w.querySelector('.ll-n').onclick = tap(key, k); rail.appendChild(w); });
      box.appendChild(el('div', { class: 'll-scene give k' + Math.min(6, kids.length) + (srcs.length ? ' also' : '') }, [el('span', { class: 'll-sr', text: kidSay.join(' ') }), lineNode(key, 'board', { me: true, tap: false, name: false }), rail]));
    }
    if (srcs.length) choose(srcs[0], key); else choose(key, kids[0]);
    return box;
  }
  // what is written under a card being read: where its Might comes from, its links and its skills, in full
  function notesFor(key, o) {
    o = o || {};
    const c = info(key), notes = el('div', { class: 'view-notes' });
    const f = o.u != null && S ? E.byU(S, o.u) : null;
    if (f) {
      const parts = mightParts(f);
      if (parts && parts.length > 1) notes.appendChild(el('div', { class: 'mt' }, parts.map(p => el('span', { html: esc(p[0]) + ' <b>' + (p === parts[0] ? '' : '+') + p[1] + '</b>' }))));
      lyingNotes(notes, f.p, f);
    }
    // A Relic in your hand that can't be played, and why: you have its power in play already, or you have two Relics.
    if (S && G && !G.over && !G.demo && CARDS[key] && CARDS[key].t === 'relic' && S.P[ui.view] && S.P[ui.view].hand.indexOf(key) >= 0) {
      const P = S.P[ui.view], same = E.relicOf(P, E.fxOf(key)), cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
      const why = same ? 'You have ' + theName(same) + ' in play. ' + cap1(theName(key)) + ' has the same power, and your two Relics have to be Relics with different powers.' : P.relics.length >= 2 ? 'You have two Relics in play, and two is the most you can have.' : '';
      if (why) notes.appendChild(el('div', { class: 'why', text: why }));
    }
    // A card's Legacy Lines, drawn as the table (lineage(), below): no sentence says when a line counts.
    const ll = lineage(key, { live: !o.lesson, brief: !!o.lesson }); if (ll) notes.appendChild(ll);   // (a lesson shows only what the card grows from: its caption needs the room)
    Object.keys(GLOSS).forEach(k => { if (c.k[k] && new RegExp(GLOSS[k][0] + (GLOSS[k][2] ? '[.:]' : '(\\.|$)')).test(c.tx)) notes.appendChild(el('p', { html: keyMark(GLOSS[k][0]) + ': ' + mightMarks(esc(GLOSS[k][1](c.n))) })); });
    if (c.kind === 'place') {
      notes.appendChild(el('p', { html: '<b>Home ground</b>: ' + esc(REG[c.reg]) + mightMarks(' Figures have +1 Might here.') }));
      if (o.p != null && S) {
        const own = E.ownerOfSpoke(S, o.p), gate = E.isGate(S, o.p);
        if (gate) notes.appendChild(el('p', { html: '<b>' + esc(Kit.poss(pname(own))) + ' Gate</b>: ' + (own === ui.view ? 'You play your Figures here.' : 'Their Figures are played here.') + ' If an opponent holds this Gate when a round ends, one of ' + (own === ui.view ? 'your' : 'their') + ' Seals breaks.' }));
        else notes.appendChild(el('p', { html: own < 0 ? (S.N > 2 ? '<b>The Crossroads</b> lies in the middle of the table, with a road to every Outpost.' : '<b>The Crossroads</b> lies between the two Outposts.') : '<b>' + esc(Kit.poss(pname(own))) + ' Outpost</b> lies between the Gate and the Crossroads' + (S.N > 2 ? ', with a road to the Outposts on either side.' : '.') }));
        const hd = E.holder(S, o.p), worth = (hd >= 0 ? E.rv(S, o.p, hd) : E.pw(S, o.p) === 'double' ? 2 : 1) * E.stake(S.cfg, S.round);
        // (Domains: whose banner is on it, and what lies across its rule, said in words beside the pieces on the tile)
        if (S.dm) { const sil = E.silenced(S, o.p), who = S.ban[o.p];
          notes.appendChild(el('p', { html: '<b>' + (who === ui.view && human(who) ? 'Your' : esc(Kit.poss(pname(who)))) + ' banner</b> is on this Domain: ' + (who === ui.view && human(who) ? 'you' : esc(pname(who))) + ' brought it to the table.' }));
          if (sil) notes.appendChild(el('p', { html: '<b>Power switched off</b>: ' + esc(sil.k === 'card' ? CARDS[sil.c].n + ' lies on this Domain' : CARDS[E.byU(S, sil.u).c].n + ' is at this Domain') + ', so its power does nothing for now.' })); }
        lyingNotes(notes, o.p, null);
        // (a game saved under the old rule, when Places scored double from round 4, finishes under it)
        notes.appendChild(el('p', { html: S.cfg.ramp ? DW('<b>This round</b>: holding this Place scores ') + worth + ' Renown.' : DW('<b>Every round</b>: whoever holds this Place when the round ends scores ') + worth + ' Renown.' }));
      }
    }
    if (c.kind === 'guide') notes.appendChild(el('p', { html: '<b>Guide</b>: a Guide is always in play, so this power is on for the whole game.' }));
    return notes;
  }
  // What lies on a Domain or a Figure until the count, said under it: the Peace of Westphalia, the Edict of Milan, the
  // Walk to Canossa (2026-11-12)
  function lyingNotes(notes, p, f) {
    const yours = o => o === ui.view && human(o), poss = o => (yours(o) ? 'your' : Kit.poss(pname(o)));
    (S.dip || []).forEach(d => { const fx = E.fxOf(d.c), n = CARDS[d.c].n;
      if (fx === 'westphalia' && d.p === p) notes.appendChild(el('p', { html: '<b>' + esc(n) + '</b> lies on this Domain until the count: nobody can start a clash here until this round ends.' }));
      if (fx === 'milan' && d.p === p && (!f || f.o === d.o)) notes.appendChild(el('p', { html: '<b>' + esc(n) + '</b> lies on this Domain until the count: until this round ends, ' + (S.N > 2 ? (yours(d.o) ? 'your opponents' : esc(Kit.poss(pname(d.o))) + ' opponents') : yours(d.o) ? 'the other player' : human(1 - d.o) ? 'you' : esc(pname(1 - d.o))) + ' can\'t start a clash with ' + esc(poss(d.o)) + ' Figures here.' })); });
    if (f && f.hush) notes.appendChild(el('p', { class: 'hush-n', html: '<b>' + esc(CARDS[(S.dip || []).find(d => d.u === f.u) ? S.dip.find(d => d.u === f.u).c : 'canossa'].n) + '</b> lies on this Figure: until this round ends, the skills and powers on ' + esc(Kit.poss(CARDS[f.c].n)) + ' card don\'t work.' }));
  }
  function openView(key, o) {
    o = o || {};
    if (o.list && o.list.length > 1) return browse(o.list, Object.assign({ at: Math.max(0, o.list.indexOf(key)) }, o));
    closeView(); Kit.sfx('flip'); Kit.haptic('light');
    const c = info(key), notes = notesFor(key, o), f = o.u != null && S ? E.byU(S, o.u) : null;
    const card = cardEl(key, { might: f ? E.might(S, f, 0) : null, tg: !o.lesson, hush: !!(f && f.hush) });
    const v = el('div', { class: 'view', role: 'dialog', 'aria-modal': 'true', 'aria-label': c.n, onclick: closeView }, [
      el('button', { type: 'button', class: 'icon-btn view-x', 'aria-label': 'Close', html: Kit.icon('close') }), card, notes.childNodes.length ? notes : null]);
    // (a lesson reads the card part by part: it sits under the lesson's rings and caption, with room kept for the
    // caption below it, or beside it when the screen is sideways)
    const side = o.lesson && window.innerWidth > window.innerHeight * 1.15, bar = o.lesson ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar')) || 56) : 0;
    // (a phone on its side: what's written about the card goes beside it, where there is room, not under it)
    const wide = !o.lesson && notes.childNodes.length > 0 && window.innerWidth > window.innerHeight * 1.15 && window.innerHeight <= 560;
    if (o.lesson) v.classList.add('lesson'); if (side) v.classList.add('side'); if (wide) v.classList.add('wide');
    const vw = Math.min(side ? window.innerWidth * .34 : wide ? window.innerWidth * .4 : window.innerWidth - 36, 420), vh = window.innerHeight - (o.lesson ? 26 : 40) - bar - (side ? 0 : o.room || 0);
    document.body.appendChild(v);
    // as big as fits: the card, then what's written under it
    let w = vw; v.style.setProperty('--vw', w + 'px');
    // (the card gives way to its notes only so far: notes taller than about a third of the screen scroll under it)
    const stacked = !side && !wide && !o.lesson && notes.childNodes.length, cap = Math.max(150, Math.round(window.innerHeight * .3));
    const under = () => (stacked ? Math.min(notes.scrollHeight, cap) + 12 : 0);
    for (let i = 0; i < 14 && w > 150 && card.offsetHeight + under() > vh; i++) { w = Math.round(w * .92); v.style.setProperty('--vw', w + 'px'); }
    if (stacked && card.offsetHeight + notes.scrollHeight + 12 > vh) { notes.classList.add('scroll'); notes.style.maxHeight = Math.max(90, vh - card.offsetHeight - 12) + 'px'; }
    viewEl = v; document.addEventListener('keydown', viewKey);
    requestAnimationFrame(() => requestAnimationFrame(() => v.classList.add('show')));
  }

  // ═══ A bunch of cards to read ════════════════════════════════════════════════════════════════════════════
  // Tim: "use the lorcana carousel mechanics to scroll through bunches of cards". Every card has a spot on one
  // strip. pos is a float index: the card at pos faces you, the others fan out and turn away on each side.
  // Dragging (every card follows the finger), flicking (with momentum), the thumbnails and the arrow keys all just
  // move pos, so the whole strip glides; what's written under the card changes when it comes to rest.
  // The strip's own mechanics, for browse() below and for a pack's cards as they are turned over (packs.js).
  //   o.flow  the box the cards stand in (its height is one card's height)   o.strip  its thumbnails, or null
  //   o.n  how many cards   o.at  where to start   o.make(j, F)  the element for card j
  //   o.keep  every card stays made (a pack's cards remember whether they have been turned), not just the few
  //           on either side of the front one
  //   o.front(i, was)  another card faces you now (called as the strip moves)   o.rest(i)  it came to rest on card i
  //   o.pose(j, p, CU, FX)  card j's own pose when it is p cards from the front ({t, z, o, dim}), or nothing for the usual one
  //   o.dimVar  a selector: those elements inside each card also carry its shade as --dim (a pack's tumbling sides and
  //           stamps). Small leaves only: --dim set on a card's root would recalculate every element of the card.
  // Returns F: pos, items, settle(i, vel), render(), reset() after a resize, stop(), moved(), key(e)
  // What keeps the strip smooth (Tim, 2026-11-13: "make the carousel more efficient -- it doesn't feel smooth and
  // responsive to scrub through"). Measured with the CPU slowed 4x for the iPad mini and 2x for the phone:
  //   - A finger, the wheel and the keys only move pos; the cards are moved once a frame (requestAnimationFrame).
  //     Nothing is written to the page inside an input event, so what reads the page there (the kit's touchmove guard,
  //     the foil light) never makes the browser work the styles out early.
  //   - A frame writes only what changed, and only transform, opacity and z-index on a card: z-index changes only where
  //     two cards change places, and the shade over a card is a layer of its own (.vf-dim) whose opacity is set. No
  //     custom property is set on a card's root while it moves (one is inherited by every element of the card, so
  //     setting it recalculates them all): a foil's --ls goes only on the few elements its light falls on
  //     (AnoriaEd.lights), and --dim only on the leaves o.dimVar names.
  //   - Only cards that are on the screen are in the page. A card that goes off it is kept, made, for when it comes
  //     back (the last 24), and the cards either side of the one at rest are made ahead while nothing moves.
  //   - What the host writes under the card (o.rest) waits until the frame where the strip stops has been drawn.
  function makeFlow(o) {
    const n = o.n, flow = o.flow, strip = o.strip, F = { pos: Math.max(0, Math.min(n - 1, o.at || 0)), items: {}, raf: 0, at: -1 };
    let CU = 0, FX = .46, RL = 0, RR = 0, q = 0, pre = 0, restT = 0, tick = 0;
    const made = {}, used = {}, KEEP = 24;
    const measure = () => {
      CU = flow.offsetHeight || 400; const cs = getComputedStyle(flow); FX = parseFloat(cs.getPropertyValue('--fx')) || .46;
      // (how far the screen reaches either side of the strip's middle: the strip's own edges where it clips its cards)
      const r = flow.getBoundingClientRect(), mid = r.left + r.width / 2, clip = cs.overflowX !== 'visible';
      RL = mid - (clip ? r.left : 0); RR = (clip ? r.right : window.innerWidth) - mid; if (!r.width) { RL = RR = 1e5; }
    };
    // (z-index by rank: the card nearer the front is on top, and it changes only where two cards change places; a
    // strip with poses of its own, a pack's, keeps the finer steps those poses are drawn against)
    function pose(p) {
      const a = Math.abs(p), sg = p < 0 ? -1 : 1; let x, r, sc, op = 1;
      if (a <= 1) { x = a * FX; r = a * 48; sc = 1 - a * .18; } else { x = FX + (a - 1) * FX * .62; r = 48 + (a - 1) * 6; sc = Math.max(.4, .82 - (a - 1) * .12); op = Math.max(0, 1 - (a - 1) * .38); }
      return { t: 'translate3d(' + (sg * x * CU).toFixed(1) + 'px,0,0) rotateY(' + (-sg * r).toFixed(1) + 'deg) scale(' + sc.toFixed(3) + ')', z: o.pose ? 100 - Math.round(a * 10) : 100 - 2 * Math.floor(a + .5) - (p > 0 ? 1 : 0), o: op, dim: Math.min(1, a) };
    }
    // is a card p cards from the front on the screen at all? (its inner edge, unturned, inside the screen with room to spare)
    function seen(p) {
      const a = Math.abs(p); if (a <= 1.5) return true; if (a >= 1 + 1 / .38) return false;
      const x = (FX + (a - 1) * FX * .62) * CU, half = .3572 * CU * Math.max(.4, .82 - (a - 1) * .12);
      return x - half < (p < 0 ? RL : RR) + 24;
    }
    function make(j) {
      const b = o.make(j, F); b._s = {}; b._ac = b.querySelector('.ac[data-ed]');
      b._dim = el('i', { class: 'vf-dim', 'aria-hidden': 'true' }); b.appendChild(b._dim);
      made[j] = b; used[j] = ++tick;
      // (no more than KEEP cards kept off the strip: the ones seen longest ago go)
      const ks = Object.keys(made); if (ks.length > KEEP + 10) ks.filter(k => !F.items[k]).sort((x, y) => used[x] - used[y]).slice(0, ks.length - KEEP).forEach(k => { delete made[k]; delete used[k]; });
      return b;
    }
    // (a card kept off the strip may have been shown in another edition meanwhile)
    function fresh(b) {
      const Ed = window.AnoriaEd; if (!Ed) return;
      b.querySelectorAll('.ac[data-card]:not([data-edfix])').forEach(ac => { const e = Ed.of(ac.getAttribute('data-card')); if (String(e) !== ac.getAttribute('data-ed')) { Ed.paint(ac, e); if (ac._dot) ac._dot(); } });
    }
    function item(j) {
      let b = F.items[j]; if (b) return b;
      b = made[j]; if (b) fresh(b); else b = make(j);
      used[j] = ++tick; flow.appendChild(b); return (F.items[j] = b);
    }
    function render() {
      if (q) { cancelAnimationFrame(q); q = 0; }
      if (!CU) measure();
      const lo = o.keep ? 0 : Math.max(0, Math.floor(F.pos) - 3), hi = o.keep ? n - 1 : Math.min(n - 1, Math.ceil(F.pos) + 3);
      for (const k in F.items) { const j = +k; if (j < lo || j > hi || (!o.keep && !seen(j - F.pos))) { F.items[k].remove(); delete F.items[k]; } }
      for (let j = lo; j <= hi; j++) {
        const p = j - F.pos; if (!o.keep && !seen(p)) continue;
        const b = item(j), w = (o.pose && o.pose(j, p, CU, FX)) || pose(p), s = b._s, st = b.style, d = w.dim.toFixed(2);
        if (s.t !== w.t) st.transform = s.t = w.t;
        if (s.z !== w.z) st.zIndex = s.z = w.z;
        if (s.o !== w.o) st.opacity = s.o = w.o;
        if (s.d !== d) { s.d = d; b._dim.style.opacity = d; }
        if (o.dimVar) b.querySelectorAll(o.dimVar).forEach(x => { if (x.style.getPropertyValue('--dim') !== d) x.style.setProperty('--dim', d); });   // (a stamp put on later gets it too)
        // (the light on a foil slides over it as it passes: only a foil has any use for --ls, and it is set only on what
        // the light falls on, AnoriaEd.lights)
        const foil = !!b._ac && +b._ac.getAttribute('data-ed') > 0, ls = foil ? Math.max(-1.5, Math.min(1.5, p)).toFixed(3) : '';
        if (s.ls !== ls) { s.ls = ls; const lit = foil && window.AnoriaEd ? AnoriaEd.lights(b._ac) : [];
          (b._lit || []).forEach(x => { if (lit.indexOf(x) < 0) x.style.removeProperty('--ls'); }); lit.forEach(x => x.style.setProperty('--ls', ls)); b._lit = lit; }
        const fr = Math.abs(p) < .5; if (s.f !== fr) { s.f = fr; b.classList.toggle('front', fr); }
        if (o.keep) { const v = w.o ? '' : 'hidden'; if (s.v !== v) st.visibility = s.v = v; }
      }
      const idx = Math.max(0, Math.min(n - 1, Math.round(F.pos)));
      if (idx !== F.at) {
        const was = F.at; if (was >= 0) { Kit.sfx('slide'); Kit.haptic('light'); } F.at = idx;
        if (strip) {
          const old = strip.children[was], on = strip.children[idx]; if (old) old.classList.remove('on'); if (on) on.classList.add('on');
          if (on && strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: on.offsetLeft - strip.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' });
        }
        if (o.front) o.front(idx, was);
      }
      if (!F.begun) { F.begun = true; ahead(idx); }
    }
    const queue = () => { if (!q) q = requestAnimationFrame(render); };
    // the cards either side of the one at rest, made one at a time while nothing moves
    function ahead(i) {
      clearTimeout(pre); if (o.keep) return;
      const want = []; for (let d = 1; d <= 3; d++) [i + d, i - d].forEach(j => { if (j >= 0 && j < n && !made[j]) want.push(j); });
      const step = () => { if (!flow.isConnected) return; if (F.raf || sw) { pre = setTimeout(step, 300); return; } const j = want.shift(); if (j == null) return; if (!made[j]) make(j); pre = setTimeout(step, 40); };
      pre = setTimeout(step, 160);
    }
    const stop = () => { if (F.raf) cancelAnimationFrame(F.raf); F.raf = 0; };
    // glide pos to a card: longer trips take a little longer, leave at the flick's own speed, ease to a stop
    function settle(target, vel, slow) {
      target = Math.max(0, Math.min(n - 1, Math.round(target))); stop(); measure(); F.to = target;   // (where the strip is gliding to)
      const from = F.pos, dist = target - from, t0 = performance.now(), ms = slow ? Math.max(260, Math.abs(dist) * slow) : Math.min(900, 220 + 140 * Math.pow(Math.abs(dist), .85));
      const s0 = vel && dist && (vel > 0) === (dist > 0) ? Math.min(3, Math.abs(vel) * ms / Math.abs(dist)) : 0;
      const ease = t => { const t2 = t * t, t3 = t2 * t; return s0 ? s0 * (t3 - 2 * t2 + t) + 3 * t2 - 2 * t3 : slow ? t2 * (3 - 2 * t) : 1 - Math.pow(1 - t, 3); };
      (function frame(now) {
        const t = Math.min(1, Math.max(0, now - t0) / ms); F.pos = from + dist * (dist ? ease(t) : 1); render();
        if (t < 1) { F.raf = requestAnimationFrame(frame); return; }
        F.raf = 0; F.pos = target; render();
        // (the notes under the card, once this frame is on the screen)
        clearTimeout(restT); restT = setTimeout(() => { if (F.raf) return; if (o.rest) o.rest(target); ahead(target); }, 0);
      })(t0);
    }
    // dragging: every card follows your finger; the ends push back
    let sw = null, moved = false;
    flow.addEventListener('pointerdown', e => { stop(); moved = false; sw = { x: e.clientX, y: e.clientY, id: e.pointerId, h: false, p0: F.pos, pts: [] }; });
    flow.addEventListener('pointermove', e => {
      if (!sw || e.pointerId !== sw.id) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
      if (!sw.h) { if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) { sw.h = true; moved = true; clearTimeout(restT); measure(); try { flow.setPointerCapture(e.pointerId); } catch (x) {} } else return; }
      // (the event's own time: when the page is busy, moves arrive late and together, and the flick's speed must not suffer)
      sw.pts.push({ x: e.clientX, t: e.timeStamp || performance.now() }); if (sw.pts.length > 8) sw.pts.shift();
      let p = sw.p0 - dx / (FX * CU); if (p < 0) p *= .3; else if (p > n - 1) p = n - 1 + (p - (n - 1)) * .3;
      F.pos = p; queue();
    });
    const end = e => {
      if (!sw) return; const s = sw; sw = null; if (!s.h) return; setTimeout(() => { moved = false; }, 120);   // (the click that ends a drag is not a tap)
      // speed at release, in cards a millisecond; momentum carries it on, and a flick always moves at least one card
      let vel = 0, first = null; const pts = s.pts, now = Math.max(e && e.timeStamp || 0, pts.length ? pts[pts.length - 1].t : 0) || performance.now();
      for (let i = pts.length - 1; i >= 0; i--) { if (now - pts[i].t > 90) break; first = pts[i]; }
      if (first && pts.length && now - first.t > 6) vel = -(pts[pts.length - 1].x - first.x) / (now - first.t) / (FX * CU);
      let target = F.pos + vel * 320;
      if (Math.abs(vel) < .0012) target = F.pos; else if (Math.round(target) === Math.round(s.p0)) target = s.p0 + (vel > 0 ? 1 : -1);
      settle(target, vel);
    };
    flow.addEventListener('pointerup', end); flow.addEventListener('pointercancel', end);
    // a trackpad's two-finger swipe, and the arrow keys
    let wt = 0;
    (o.wheel || flow).addEventListener('wheel', e => { const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0; if (!dx) return; e.preventDefault(); stop(); clearTimeout(restT); if (!CU) measure(); F.pos = Math.max(-.3, Math.min(n - .7, F.pos + dx / (FX * CU))); queue(); clearTimeout(wt); wt = setTimeout(() => settle(F.pos, 0), 110); }, { passive: false });
    F.key = e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); settle(Math.round(F.pos) + (e.key === 'ArrowRight' ? 1 : -1), 0); } };
    F.settle = settle; F.render = render; F.stop = () => { stop(); clearTimeout(pre); clearTimeout(restT); }; F.moved = () => moved; F.reset = () => { CU = 0; render(); };
    return F;
  }
  //   browse(keys, {at, counts: {key: copies}, title, sub, bar})
  //   o.bar(key, redo): what can be done with the card in front, as buttons under the strip (the deck builder's Take
  //   one out and Add to the deck); redo() draws them again after one is used
  function browse(keys, o) {
    o = o || {}; closeView(); if (!keys || !keys.length) return; Kit.sfx('flip'); Kit.haptic('light');
    const n = keys.length, counts = o.counts || {};
    const flow = el('div', { class: 'vf-flow' }), under = el('div', { class: 'vf-notes' });
    const strip = el('div', { class: 'vf-strip' }, keys.map((k, i) => { const t = el('button', { type: 'button', class: 'vf-t', 'aria-label': info(k).n, style: { '--f': (FAC[info(k).f] || FAC.N).c }, onclick: e => { e.stopPropagation(); F.settle(i, 0); } }); const im = artImg(k, true) || mono(k); if (im) t.appendChild(im); return t; }));
    const v = el('div', { class: 'view flow', role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || 'Cards', onclick: e => { if (F.moved()) return; if (e.target === v || e.target === flow) closeView(); } }, [
      el('button', { type: 'button', class: 'icon-btn view-x', 'aria-label': 'Close', html: Kit.icon('close'), onclick: closeView }),
      o.title ? el('div', { class: 'vf-head' }, [el('b', { text: o.title }), o.sub ? el('small', { text: o.sub }) : null,
        // (o.pick = {label, fn}: the strip is for choosing one of its cards, and this button hands back the card at the front)
        o.pick ? el('button', { type: 'button', class: 'btn btn-primary btn-sm vf-pick', text: o.pick.label, onclick: e => { e.stopPropagation(); const k = keys[Math.max(0, Math.min(n - 1, Math.round(F.pos)))]; closeView(); o.pick.fn(k); } }) : null]) : null, flow, n > 1 ? strip : null, under]);
    const actRow = o.bar ? el('div', { class: 'sc-acts vf-acts', onclick: e => e.stopPropagation() }) : null;
    if (actRow) { v.classList.add('acts'); v.insertBefore(actRow, under); }
    const fillBar = i => { if (!actRow) return; actRow.innerHTML = ''; [].concat(o.bar(keys[i], () => fillBar(Math.round(F.pos))) || []).forEach(x => { if (x) actRow.appendChild(x); }); };
    function rest(i) { fillBar(i); under.innerHTML = ''; const nt = notesFor(keys[i]); while (nt.firstChild) under.appendChild(nt.firstChild); under.scrollTop = 0; warm(keys.slice(Math.max(0, i - 3), i + 4)); }
    const F = makeFlow({ flow: flow, strip: strip, n: n, at: o.at, wheel: v, rest: rest,
      make: j => { const k = keys[j]; return el('div', { class: 'vf-c', onclick: e => { e.stopPropagation(); if (F.moved()) return; if (j !== Math.round(F.pos)) F.settle(j, 0); } }, [cardEl(k, { now: true, tg: true }), counts[k] > 1 ? el('span', { class: 'hc-n vf-n', 'aria-label': counts[k] + ' copies', text: String(counts[k]) }) : null]); } });
    // Upright, the card is as tall as the room left once the longest of the bunch's notes has its place under it,
    // so no card's notes are ever cut off and the strip never jumps as you go from card to card. (Sideways the notes
    // have the right-hand side to themselves.)
    function size() {
      const W = window.innerWidth, H = window.innerHeight, side = W > H * 1.15 && H <= 560;
      under.style.height = ''; flow.style.removeProperty('--cu');
      if (side) return;
      let most = 0; const uniq = keys.filter((k, i) => keys.indexOf(k) === i);
      uniq.forEach(k => { under.innerHTML = ''; const nt = notesFor(k); while (nt.firstChild) under.appendChild(nt.firstChild); under.style.height = 'auto'; most = Math.max(most, under.scrollHeight); });
      const cs = getComputedStyle(v), room = H - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - (o.title ? v.querySelector('.vf-head').offsetHeight + 8 : 0) - (n > 1 ? strip.offsetHeight + 8 : 0) - (actRow ? (fillBar(Math.round(F.pos)), actRow.offsetHeight + 8) : 0) - 8;
      const cu = Math.round(Math.max(H * .4, Math.min(520, W * 1.02, room - Math.min(most, Math.max(150, H * .3)))));   // (notes taller than about a third of the screen scroll: one card with many lines doesn't make the whole strip small)
      flow.style.setProperty('--cu', cu + 'px'); under.style.height = Math.max(0, Math.min(most, room - cu)) + 'px';
    }
    const resize = () => { size(); F.reset(); rest(Math.round(F.pos)); };
    const resize2 = () => { resize(); setTimeout(() => { if (v.isConnected) resize(); }, 350); };
    document.addEventListener('keydown', F.key); window.addEventListener('resize', resize2); window.addEventListener('orientationchange', resize2);
    v._off = () => { F.stop(); document.removeEventListener('keydown', F.key); window.removeEventListener('resize', resize2); window.removeEventListener('orientationchange', resize2); };
    document.body.appendChild(v); viewEl = v; document.addEventListener('keydown', viewKey);
    size(); F.render(); rest(Math.round(F.pos));
    requestAnimationFrame(() => requestAnimationFrame(() => v.classList.add('show')));
  }

  // ═══ Looking through the cards on the table ═════════════════════════════════════════════════════════════
  // Tim, 2026-11-11: "the eye icon to view cards is not a great mechanism for seeing the cards closer. tap and hold is
  // one. carousel on each domain with a swipe up and down to my cards at each domain down to my hand (with a side
  // map to represent which group/level of cards im scanning through might help.) and need to include ways to act on
  // cards as I scan through them in the carousel".
  // scan({u} | {p} | {h} | {side, key}): the table's cards in levels, top to bottom as the table lies: the other
  // player's Guide and Relics, the five Places (the other player's Figures, the Place's own card, your Figures), your
  // Guide and Relics, and your hand last. (Tim, the next day: "in the carousel view it's also good to know what
  // opponents have at each level too".) Sideways the cards of
  // one level go by on the strip (makeFlow); up and down changes level (a swipe, the wheel, the arrow keys, or a tap
  // on the map at the left, which shows the five Places and the hand with the level you are on lit). Under the card
  // in front are the things you can do with it now, as buttons (Play at, Move to, Clash with, Discard), then
  // what is written about it. A hold on any card on the table opens it there; so does a tap wherever a tap used to
  // open a single card.
  function scanActs(it) {
    const out = []; if (!S || !G || G.over || G.demo || !idle()) return out;
    const o = S.turn, P = S.P[o], hand = P.hand;
    if (it.h != null && ui.discard) return hand[it.h] === it.key ? [{ label: 'Discard', run: () => discardOne(it.h) }] : out;
    if (ui.discard) return out;
    let acts, sel;
    if (it.h != null) { if (hand[it.h] !== it.key) return out; sel = { kind: 'hand', h: it.h };
      acts = ui.acts.filter(a => (a.h != null && hand[a.h] === it.key) || (E.fxOf(it.key) === 'phalanx' && a.t === 'clash' && a.ph && hand[a.hq] === it.key)); }
    else if (it.u != null) { const f = E.byU(S, it.u); if (!f || f.o !== o) return out; sel = { kind: 'fig', u: it.u };
      acts = ui.acts.filter(a => (a.u === it.u && (a.t === 'walk' || a.t === 'clash' || a.t === 'antik' || a.t === 'tub' || a.t === 'relay')) || (a.t === 'relay' && a.v === it.u)); }
    else if (it.p != null && S.dm) { sel = { kind: 'dom', p: it.p }; acts = ui.acts.filter(a => (a.t === 'loan' || a.t === 'buy' || a.t === 'hire') && a.p === it.p); }   // (what a Domain lets you do: Florence lends, Timbuktu sells a card, Carthage hires Might)
    else return out;
    const at = p => theName('@' + S.places[p]), nm = u => { const f = E.byU(S, u); return f ? CARDS[f.c].n : ''; }, seen = {}; let table = false;
    acts.forEach(a => {
      let label = null;
      if (sel.kind === 'dom') label = a.t === 'loan' ? 'Borrow 2 Spark, paid back next turn' : a.t === 'buy' ? 'Buy a card' : 'Hire 2 Might here this round';
      else if (a.t === 'relay') label = 'Change places with ' + nm(a.u === it.u ? a.v : a.u);   // (the Qhapaq Ñan: a Figure there and one of yours elsewhere change places)
      else if (sel.kind === 'fig') label = a.t === 'clash' ? 'Clash with ' + nm(a.v) + (a.ph && quickOf(a) ? ', with ' + CARDS[quickOf(a)].n : '') : (a.t === 'walk' ? 'Move to ' : a.t === 'antik' ? 'Jump to ' : 'Step to ') + at(a.p);
      else if (a.t === 'fig') label = 'Play at ' + at(a.p);
      else if (a.t === 'relic') label = 'Play';
      else if (a.t === 'deed' && a.w != null) label = 'Trade Gates and Outposts with ' + pname(a.w);   // (the Columbian Exchange, with more players: whose)
      else if (a.t === 'deed') { const n = (a.h2 != null) + (a.u != null) + (a.v != null) + (a.p != null); if (!n) label = 'Play'; else if (n === 1 && a.p != null) label = 'Play at ' + at(a.p); else if (n === 1 && a.u != null) label = 'Play on ' + nm(a.u); else if (n === 1 && a.v != null) label = 'Play on ' + nm(a.v); else table = true; }
      else table = true;
      if (!label || seen[label]) return; seen[label] = 1;
      const cost = a.t === 'buy' || a.t === 'hire' ? 1 : sel.kind === 'hand' ? E.costOf(S, o, it.key, a.t === 'fig' ? a.p : undefined) : a.ph && quickOf(a) ? E.costOf(S, o, quickOf(a)) : null;
      out.push({ label: label, cost: cost, run: () => { if (idle() && ui.acts.indexOf(a) >= 0) doHuman(a); } });
    });
    // (a card that needs more than one thing chosen is chosen on the table, where its targets light up)
    if (table) out.push({ label: out.length ? 'More: choose on the table' : 'Choose on the table', soft: out.length > 0, run: () => { if (idle()) select(sel); } });
    // (a card in your hand that can't be played now says why)
    if (!out.length && it.h != null) { const c = E.costOf(S, o, it.key), fig = CARDS[it.key].t === 'fig', nm0 = info(it.key).n;
      if (CARDS[it.key].quick && E.fxOf(it.key) !== 'phalanx') out.push({ note: info(it.key).n + ' plays itself when its moment comes, so it stays in your hand until then.' });   // (Testudo, the Defence of Syracuse, the Tribune's Veto)
      else if (E.fxOf(it.key) === 'walls' && P.seals >= 4) out.push({ note: 'You have 4 Seals, and no player can have more.' });
      else if (E.fxOf(it.key) === 'canossa' && c <= P.spark) out.push({ note: 'No enemy Figure on the table has a skill or a power that ' + nm0 + ' can switch off right now.' });
      else if (E.fxOf(it.key) === 'milan' && c <= P.spark) out.push({ note: nm0 + ' goes on a Domain where you have a Figure.' });
      else if (fig && S.cfg.unique && S.figs.some(f => f.o === o && f.c === it.key)) out.push({ note: nm0 + ' is already in play on your side, and you can have one of each person in play at a time.' });
      else if (c > P.spark) out.push({ note: nm0 + ' costs ' + c + ' Spark, and you have ' + P.spark + '.' });
      else if (fig) out.push({ note: DW('You play a Figure at your Gate or at a Place where you already have a Figure, and each of those Places has ') + S.cfg.cap + ' of your Figures already.' }); }
    return out;
  }
  // ═══ The road under the card ═════════════════════════════════════════════════════════════════════════════
  // Tim approved on 2026-11-13 ("keep going with face off, carousel and the rest"): no stack of buttons under the card
  // in front, but the road itself, the table's Domains as small tiles in the order they lie, always in the same place,
  // so the card and its notes never move. The Domains a card can go to light up, each with the two Might totals there
  // (yours as it would be after the move) and what the move does ("Play", "Take it", "Walk"); a tap there makes it.
  // A Figure's clashes, a Deed's chosen Figure or player, a Domain's own power and a Relic are chips and buttons on the
  // line under the road. A card that can't be played dims the road, and a plate on the card says why (its cost against
  // your Spark, or the reason). roadOf(it) works out what the road shows; paintRoad draws it.
  // (a Domain's name the way people say it, for a small tile: "Padua", "Greenwich")
  const domShort = n => n.replace(/^The /, '').replace(/^.*, /, '').replace(/^(University|Silver Mines|Library|Market|Rock) of /, '').replace(/^Great Pyramid of Giza$/, 'Great Pyramid').replace(/^Kilwa Kisiwani$/, 'Kilwa').replace(/^Citadelle /, '');
  const roadOrd = () => (many() ? mapOrder() : rowsOrder());
  // a Domain as a small tile: its picture, its kind's frame and its name (o.rule: its power's few words too)
  function miniTile(i, o) {
    o = o || {}; const pk = S.places[i], pi = C.PLACES[pk];
    const t = el('span', { class: 'pl-tile rd-tile' + (o.cls ? ' ' + o.cls : '') });
    const art = el('span', { class: 'pl-art' }, [el('span', { class: 'na' })]); const im = artImg(pk, true, true); if (im) art.appendChild(im); t.appendChild(art);
    const rule = o.rule && S.dm ? DSHORT[pi.pw] : o.rule ? DW(RULE[pk] || '') : '';
    t.appendChild(el('span', { class: 'pl-plate' }, [el('span', { class: 'pl-name', text: o.full ? pi.n : domShort(pi.n) }), rule ? el('span', { class: 'pl-rule', text: rule }) : null]));
    if (window.AnoriaDomains) window.AnoriaDomains.tile(t, { key: pk, reg: pi.reg, silenced: !!(S.dm && vSil(i)) });
    if (!im && window.AnoriaDomains) art.style.setProperty('--kc', (window.AnoriaDomains.KINDS[window.AnoriaDomains.kindOf(pk)] || {}).c || '#223');
    return t;
  }
  // the legal move that matches one worked out earlier (the moves are worked out again after every step)
  const reAct = a => { const s = JSON.stringify(a); return ui.acts.filter(x => JSON.stringify(x) === s)[0] || null; };
  function runActs(acts, title) {
    if (!idle()) return; acts = acts.map(reAct).filter(x => x); if (!acts.length) return;
    closeView(); Kit.sfx('pop'); Kit.haptic('medium');
    if (acts.length === 1) return doHuman(acts[0]);
    const rank = { walk: 0, tub: 1, antik: 2, clash: 0 };
    acts.sort((x, y) => (rank[x.t] || 0) - (rank[y.t] || 0) || (x.ph ? 1 : 0) - (y.ph ? 1 : 0) || (x.x ? 1 : 0) - (y.x ? 1 : 0));
    Kit.sheet({ title: title, actions: acts.map((a, k) => Object.assign(actLabel(a), { primary: !k, onClick: () => { const b = reAct(a); if (b && idle()) doHuman(b); } })) });
  }
  // the Might a clash would start with: the attacker's (with Phalanx or an Ambush where it adds) and the defender's
  function clashMights(u, v, add) { const f = E.byU(S, u), g = E.byU(S, v); if (!f || !g) return null; return [Math.floor(E.might(S, f, 1, g) + (add || 0)), Math.floor(E.might(S, g, 2, f))]; }
  // the totals at a Domain: [the strongest other side's, yours] (Ms: E.mights of some state)
  const sidesOf = (Ms, o) => { let t = 0; Ms.forEach((m, q) => { if (q !== o && !E.ally(S, q, o)) t = Math.max(t, m); }); return [t, Ms[o]]; };
  function roadOf(it) {
    const R = { lit: {}, here: -1, chips: [], btns: [], plate: null, off: false, after: {} };
    if (!S || !G || !V || G.demo) return R;
    if (it.u != null) { const f = vfig(it.u); if (f) R.here = f.p; } else if (it.p != null) R.here = it.p;
    if (G.over || !idle()) return R;
    const o = S.turn, P = S.P[o], hand = P.hand, nm = u => { const f = E.byU(S, u); return f ? CARDS[f.c].n : ''; };
    if (ui.discard) { if (it.h != null && hand[it.h] === it.key) R.btns.push({ label: 'Discard ' + info(it.key).n, main: true, run: () => discardOne(it.h) }); R.off = true; return R; }
    let acts, sel;
    if (it.h != null) { if (hand[it.h] !== it.key) return R; sel = { kind: 'hand', h: it.h };
      acts = ui.acts.filter(a => (a.h != null && hand[a.h] === it.key) || (E.fxOf(it.key) === 'phalanx' && a.t === 'clash' && a.ph && hand[a.hq] === it.key)); }
    else if (it.u != null) { const f = E.byU(S, it.u); if (!f || f.o !== o) return R; sel = { kind: 'fig', u: it.u };
      acts = ui.acts.filter(a => (a.u === it.u && (a.t === 'walk' || a.t === 'clash' || a.t === 'antik' || a.t === 'tub' || a.t === 'relay')) || (a.t === 'relay' && a.v === it.u)); }
    else if (it.p != null && S.dm) acts = ui.acts.filter(a => (a.t === 'loan' || a.t === 'buy' || a.t === 'hire') && a.p === it.p);
    else return R;
    const key = it.h != null ? it.key : null, cost = a => (key ? E.costOf(S, o, key, a.t === 'fig' ? a.p : undefined) : null);
    const chip = {}, order = []; let table = false;
    const addChip = (k, c, a) => { if (!chip[k]) { chip[k] = Object.assign({ acts: [] }, c); order.push(k); } chip[k].acts.push(a); };
    acts.forEach(a => {
      const t = a.t;
      if (t === 'fig' || t === 'walk' || t === 'antik' || t === 'tub') { (R.lit[a.p] = R.lit[a.p] || []).push(a); return; }
      if (t === 'clash') { addChip('x' + a.u + '-' + a.v, { kind: 'clash', u: a.u, v: a.v, pair: !!key }, a); return; }
      if (t === 'relay') { const w = a.u === it.u ? a.v : a.u; addChip('r' + w, { kind: 'fig', v: w, label: 'Change places with ' + nm(w) }, a); return; }
      if (t === 'loan') { R.btns.push({ label: 'Borrow 2 Spark, paid back next turn', acts: [a] }); return; }
      if (t === 'buy') { R.btns.push({ label: 'Buy a card', cost: 1, acts: [a] }); return; }
      if (t === 'hire') { R.btns.push({ label: 'Hire 2 Might here this round', cost: 1, acts: [a] }); return; }
      if (t === 'relic') { R.btns.push({ label: 'Play ' + theName(key), cost: cost(a), main: true, acts: [a] }); return; }
      if (t === 'deed') {
        const n = (a.h2 != null) + (a.u != null) + (a.v != null) + (a.p != null) + (a.q != null) + (a.w != null);
        if (!n) R.btns.push({ label: 'Play ' + theName(key), cost: cost(a), main: true, acts: [a] });
        else if (n === 1 && a.p != null) (R.lit[a.p] = R.lit[a.p] || []).push(a);
        else if (n === 1 && (a.u != null || a.v != null)) { const w = a.u != null ? a.u : a.v; addChip('f' + w, { kind: 'fig', v: w, label: nm(w) }, a); }
        else if (n === 1 && a.w != null) addChip('w' + a.w, { kind: 'who', o: a.w, label: 'Trade with ' + pname(a.w) }, a);
        else if (n === 2 && a.u != null && a.v != null && E.fxOf(key) === 'ambush') addChip('x' + a.u + '-' + a.v, { kind: 'clash', u: a.u, v: a.v, pair: true, add: 1 }, a);
        else table = true;
        return;
      }
      table = true;
    });
    order.forEach(k => { const c = chip[k]; if (c.kind === 'clash') { const plain = c.acts.some(a => !a.ph); c.m = clashMights(c.u, c.v, (c.add || 0) + (plain ? 0 : 2)); } R.chips.push(c); });
    // (what each lit Domain would look like after the move: your total there, and whether you would hold it)
    const cs = {};
    Object.keys(R.lit).forEach(p => { const a = R.lit[p][0], i = +p; let Ms = V.tot[i], h = V.hold[i];
      if (a.t !== 'deed') { const T = simulate(a); Ms = E.mights(T, i); h = E.holder(T, i); }
      const sd = sidesOf(Ms, o), take = (h === o || (h >= 0 && E.ally(S, h, o))) && !(V.hold[i] === o || (V.hold[i] >= 0 && E.ally(S, V.hold[i], o)));
      const verb = a.t === 'walk' ? 'Walk' : a.t === 'antik' ? 'Jump' : a.t === 'tub' ? 'Step' : 'Play';
      R.after[i] = { m: sd, word: take ? 'Take it' : verb, take: take, cost: cost(a) }; if (cost(a) != null) cs[cost(a)] = 1; });
    R.costly = Object.keys(cs).length > 1;   // (a Domain where the card costs less, Timbuktu: each lit tile says its cost)
    if (table) R.btns.push({ label: R.btns.length || R.chips.length || Object.keys(R.lit).length ? 'More: choose on the table' : 'Choose on the table', soft: true, run: () => { if (idle()) { closeView(); select(sel); } } });
    if (!R.btns.length && !R.chips.length && !Object.keys(R.lit).length) {
      R.off = true;
      if (it.h != null) { const c = E.costOf(S, o, it.key); if (c > P.spark) R.plate = { cost: c, have: P.spark }; else { const n = scanActs(it).filter(x => x.note)[0]; if (n) R.plate = { note: n.note }; } }
      else if (it.u != null) { const f = E.byU(S, it.u), n = CARDS[f.c].n;
        if (f.arr && !f.acted) R.plate = { note: n + ' came into play this turn, so ' + n + ' can walk on your next turn.' };
        else if (!f.rdy) R.plate = { note: n + ' has already moved this turn.' }; }
    }
    return R;
  }
  const canDo = it => { const R = roadOf(it); return !!(Object.keys(R.lit).length || R.chips.length || R.btns.some(b => !b.soft || b.run)); };
  // How big the road's tiles are at this screen size: as wide as the room for one row of them allows
  function roadDims(box) {
    const W = window.innerWidth, H = window.innerHeight, side = W > H * 1.15 && H <= 560, n = S ? roadOrd().length : 5, per = n > 7 ? Math.ceil(n / 2) : n;
    const w = box && box.clientWidth ? box.clientWidth : side ? (W - 16) / 2.15 - 20 : Math.min(W - 24, 640), gap = W < 500 ? 5 : 8;
    const rw = Math.max(40, Math.min(side ? 84 : 124, Math.floor((w - (per - 1) * gap) / per))), rh = Math.round(rw * .62), rows = Math.ceil(n / per), chips = W < 500 || side ? 40 : 46;
    return { rw: rw, rh: rh, gap: gap, per: per, h: rows * (rh + 22) + (rows - 1) * 4 + 8 + chips, chips: chips };
  }
  function paintRoad(box, R, it) {
    box.innerHTML = ''; const D = roadDims(box), o = S.turn, me = ui.view;
    box.className = 'sc-road' + (R.off ? ' off' : ''); box.style.setProperty('--rw', D.rw + 'px'); box.style.setProperty('--rh', D.rh + 'px'); box.style.setProperty('--rg', D.gap + 'px'); box.style.setProperty('--rc', D.chips + 'px'); box.style.height = D.h + 'px';
    const ord = roadOrd(), rows = el('div', { class: 'rd-rows' }); let row = null;
    ord.forEach((p, k) => {
      if (k % D.per === 0) { row = el('div', { class: 'rd-row' }); rows.appendChild(row); }
      const lit = R.lit[p], here = R.here === p, af = R.after[p], m = af ? af.m : sidesOf(V.tot[p], me), hold = V.hold[p];
      const b = el(lit ? 'button' : 'span', { class: 'rd-t' + (lit ? ' lit' : '') + (here ? ' here' : '') + (af && af.take ? ' take' : '') + (hold >= 0 ? ' held' : ''), 'data-p': p, type: lit ? 'button' : null, style: hold >= 0 ? { '--hc': 'var(--pc' + hold + ')' } : null,
        'aria-label': C.PLACES[S.places[p]].n + (lit ? ': ' + af.word + (af.cost != null && R.costly ? ', for ' + af.cost + ' Spark' : '') + ', your Might there ' + m[1] + ' against ' + m[0] : here ? ', where this card is' : '') });
      b.appendChild(miniTile(p));
      b.appendChild(el('span', { class: 'rd-m L' + (m[0] ? '' : ' zero'), style: { '--tc': 'var(--pc' + (many() ? (rivalAt(p) >= 0 ? rivalAt(p) : 1 - me) : 1 - me) + ')' } }, [el('b', { text: String(m[0]) })]));
      b.appendChild(el('span', { class: 'rd-m R' + (m[1] ? '' : ' zero') + (af ? ' up' : ''), style: { '--tc': 'var(--pc' + me + ')' } }, [el('b', { text: String(m[1]) })]));
      if (lit) { b.appendChild(el('span', { class: 'rd-g' }, [el('span', { text: af.word }), af.cost != null && R.costly ? el('span', { class: 'sc-cost' }, [el('b', { text: String(af.cost) })]) : null]));
        b.addEventListener('click', e => { e.stopPropagation(); runActs(lit, info(it.key).n + ' to ' + theName('@' + S.places[p])); }); }
      else if (here) b.appendChild(el('span', { class: 'rd-g here', text: 'Here' }));
      row.appendChild(b);
    });
    box.appendChild(rows);
    const line = el('div', { class: 'rd-chips' });
    R.chips.forEach(c => {
      const pic = k => { const s = el('span', { class: 'rd-pic' }), im = artImg(k, true, true) || mono(k); if (im) s.appendChild(im); return s; };
      let b;
      if (c.kind === 'clash') { const f = E.byU(S, c.u), g = E.byU(S, c.v);
        b = el('button', { type: 'button', class: 'rd-c clash', 'aria-label': 'Clash: ' + CARDS[f.c].n + ' with ' + c.m[0] + ' Might against ' + CARDS[g.c].n + ' with ' + c.m[1] },
          [c.pair ? pic(f.c) : null, el('span', { class: 'rd-x', html: SVG.swords }), pic(g.c), el('b', { text: c.m[0] + ' vs ' + c.m[1] })]); }
      else if (c.kind === 'who') b = el('button', { type: 'button', class: 'rd-c who', style: { '--pc': 'var(--pc' + c.o + ')' } }, [el('i', { class: 'rd-dot' }), el('span', { text: c.label })]);
      else { const f = E.byU(S, c.v); b = el('button', { type: 'button', class: 'rd-c fig' }, [f ? pic(f.c) : null, el('span', { text: c.label })]); }
      b.addEventListener('click', e => { e.stopPropagation(); runActs(c.acts, info(it.key).n); });
      line.appendChild(b);
    });
    R.btns.forEach(x => line.appendChild(el('button', { type: 'button', class: 'btn btn-sm ' + (x.main ? 'btn-primary' : 'btn-soft') + ' rd-b', onclick: e => { e.stopPropagation(); if (x.run) { Kit.sfx('pop'); Kit.haptic('medium'); closeView(); x.run(); } else runActs(x.acts, info(it.key).n); } },
      [el('span', { text: x.label }), x.cost != null ? el('span', { class: 'sc-cost', role: 'img', 'aria-label': 'costs ' + x.cost + ' Spark' }, [el('b', { text: String(x.cost) })]) : null])));
    box.appendChild(line);
  }
  // the plate on a card that can't be played: its cost against your Spark, or the reason in a sentence
  function lockPlate(R) {
    if (!R.plate) return null;
    if (R.plate.cost != null) return el('div', { class: 'sc-lock' }, [el('span', { class: 'sc-cost big' }, [el('b', { text: String(R.plate.cost) })]), el('span', {}, [document.createTextNode('You have '), el('b', { text: String(R.plate.have) }), document.createTextNode(' Spark.')])]);
    return el('div', { class: 'sc-lock note' }, [el('span', { text: R.plate.note })]);
  }

  // ═══ The face-off ════════════════════════════════════════════════════════════════════════════════════════
  // A Domain's level in the scan (Tim approved, 2026-11-13): the two sides face each other across the Domain, every
  // card large enough to read. Sideways the other player's Figures stand to its left and yours to its right; upright
  // theirs are above and yours below. In the middle: both totals on shields, a balance beam tipped toward whoever
  // holds it, and a sentence that says who holds it and what that is worth when the round ends. Under each of your
  // Figures, what it can do from here: Clash, and a walk toward the Domain on either side along the road. A tap on a
  // card reads it on the strip (the carousel of this Domain's cards); a swipe, the arrow keys or the side map walks on.
  // what the middle of a face-off says: who holds this Domain and what it is worth when the round ends, with the
  // reason when a tie is settled by a rule
  function holdSay(p) {
    const me = ui.view, h = V.hold[p], t = V.tot[p], nm = theName('@' + S.places[p]), you = o => o === me && human(me);
    const mx = Math.max.apply(null, t), tied = t.filter(x => x === mx).length > 1, any = V.figs.some(f => f.p === p), own = E.ownerOfSpoke(S, p), gate = E.isGate(S, p);
    const ren = n => n + ' Renown', who = o => (you(o) ? 'you' : pname(o)), whose = o => (you(o) ? 'your' : Kit.poss(pname(o)));
    let pre = '';
    if (h >= 0 && (tied || !any)) {
      if (!any || mx === 0) pre = 'Nobody has a Figure here, and a Gate with nobody at it is held by its owner. ';
      else if (p === 2 * S.N && S.dm && S.ban[p] === h) pre = 'The Might is tied at ' + mx + ', and ' + who(h) + (you(h) ? ' win' : ' wins') + ' a tie at the Crossroads, because ' + who(h) + ' laid it and ' + (you(h) ? 'have' : 'has') + ' a Figure here. ';
      else if (gate && own === h) pre = 'The Might is tied at ' + mx + ', and a tie at a Gate goes to the Gate’s owner. ';
      else pre = 'The Might is tied at ' + mx + ', and ' + who(h) + (you(h) ? ' win' : ' wins') + ' the tie here. ';
      pre = cap1(pre);
    }
    if (h >= 0) {
      const w = E.rv(S, p, h) * E.stake(S.cfg, V.round);
      if (gate && own >= 0 && own !== h && !E.ally(S, own, h)) return pre + cap1(who(h)) + (you(h) ? ' hold ' : ' holds ') + nm + ', which is ' + whose(own) + ' Gate, so ' + who(h) + (you(h) ? ' score ' : ' scores ') + ren(w) + ' and one of ' + whose(own) + ' Seals breaks when the round ends.';
      return pre + cap1(who(h)) + (you(h) ? ' hold ' : ' holds ') + nm + ', and ' + (you(h) ? 'score ' : 'scores ') + ren(w) + ' when the round ends.';
    }
    if (!any) return 'Nobody has a Figure here, so nobody holds ' + nm + '.';
    if (tied && S.dm && E.pw(S, p) === 'treaty') { const ts = []; t.forEach((x, o) => { if (x === mx && V.figs.some(f => f.p === p && f.o === o)) ts.push(o); }); if (ts.length > 1) return 'The Might is tied at ' + mx + ', so ' + listOf(ts.map(who)) + ' each score 1 Renown here when the round ends.'; }
    if (tied) return 'The Might is tied at ' + mx + ', so nobody holds ' + nm + '.';
    return 'Nobody holds ' + nm + '.';
  }
  // Build a face-off for the Domain level L. at: {u} the card in front. h: {cards(k) read card k of the level on the
  // strip, step(d) the next Domain along the road, armed} (armed: your Figure whose Clash chip was tapped)
  function faceOffEl(L, at, h) {
    const p = L.p, me = ui.view, M = many(), riv = M ? (rivalAt(p) >= 0 ? rivalAt(p) : seatsFrom(me)[1]) : 1 - me;
    const box = el('div', { class: 'fo' }), sOrd = seatsFrom(me), rk = o => (sOrd.indexOf(o) + S.N - 1) % S.N;
    const bg = el('div', { class: 'fo-bg', 'aria-hidden': 'true' }, [riv, me].map((o, k) => { const n = el('div', { class: 'an-pm fo-pm ' + (k ? 'me' : 'them') }); try { matFill(n, matOf(o), 'fo' + o); } catch (e) {} return n; }));
    box.appendChild(bg);
    const th = V.figs.filter(f => f.p === p && f.o !== me).sort((a, b) => rk(a.o) - rk(b.o) || a.u - b.u), mi = V.figs.filter(f => f.p === p && f.o === me).sort((a, b) => a.u - b.u);
    const ix = u => L.items.findIndex(x => x.u === u), on = idle() && !G.over && S.turn === me;
    const ord = roadOrd(), k0 = ord.indexOf(p), prev = ord[k0 - 1], next = ord[k0 + 1];
    // (your Figure's moves from here: a clash with one of theirs, a walk to the Domain on either side; the rest are on its road)
    const moves = u => ui.acts.filter(a => a.u === u && (a.t === 'walk' || a.t === 'clash' || a.t === 'antik' || a.t === 'tub' || a.t === 'relay') || (a.t === 'relay' && a.v === u));
    const cardB = f => {
      const b = el('button', { type: 'button', class: 'fo-c o' + f.o + (at && at.u === f.u ? ' front' : ''), 'data-u': f.u, style: { '--pc': 'var(--pc' + f.o + ')' }, 'aria-label': CARDS[f.c].n + ', Might ' + f.m + ', ' + Kit.poss(pname(f.o)) },
        [cardEl(f.c, { mini: true, now: true, might: f.m, hush: !!f.hush })]);
      b.addEventListener('click', e => { e.stopPropagation(); h.cards(ix(f.u)); });
      return b;
    };
    const chipsFor = f => {
      if (!on) return null; const ms = moves(f.u); if (!ms.length) return null;
      const n = el('div', { class: 'fo-chips' }), cl = ms.filter(a => a.t === 'clash'), foes = cl.map(a => a.v).filter((v, k, s) => s.indexOf(v) === k);
      if (foes.length === 1) { const m = clashMights(f.u, foes[0]);
        n.appendChild(el('button', { type: 'button', class: 'rd-c clash', 'aria-label': 'Clash with ' + CARDS[E.byU(S, foes[0]).c].n + ', ' + m[0] + ' against ' + m[1], onclick: e => { e.stopPropagation(); runActs(cl, CARDS[f.c].n); } }, [el('span', { class: 'rd-x', html: SVG.swords }), el('b', { text: m[0] + ' vs ' + m[1] })])); }
      else if (foes.length > 1) n.appendChild(el('button', { type: 'button', class: 'rd-c clash' + (h.armed === f.u ? ' on' : ''), 'aria-pressed': String(h.armed === f.u), onclick: e => { e.stopPropagation(); Kit.sfx('tap'); h.arm(h.armed === f.u ? null : f.u); } }, [el('span', { class: 'rd-x', html: SVG.swords }), el('b', { text: 'Clash' })]));
      const walk = q => { for (const t of ['walk', 'tub', 'antik']) { const as = ms.filter(a => a.p === q && a.t === t); if (as.length) return as; } return null; };   // (a plain walk first; a Jump to the same place is on the Figure's road)
      const wp = prev != null ? walk(prev) : null, wn = next != null ? walk(next) : null;
      if (wp) n.appendChild(el('button', { type: 'button', class: 'rd-c mv', onclick: e => { e.stopPropagation(); runActs(wp, CARDS[f.c].n + ' to ' + theName('@' + S.places[prev])); } }, [el('span', { class: 'ar', text: '←' }), el('span', { text: domShort(C.PLACES[S.places[prev]].n) })]));
      if (wn) n.appendChild(el('button', { type: 'button', class: 'rd-c mv', onclick: e => { e.stopPropagation(); runActs(wn, CARDS[f.c].n + ' to ' + theName('@' + S.places[next])); } }, [el('span', { text: domShort(C.PLACES[S.places[next]].n) }), el('span', { class: 'ar', text: '→' })]));
      if (ms.some(a => a.t === 'relay' || (a.t !== 'clash' && ((wp || []).indexOf(a) < 0 && (wn || []).indexOf(a) < 0)))) n.appendChild(el('button', { type: 'button', class: 'rd-c more', onclick: e => { e.stopPropagation(); h.cards(ix(f.u)); } }, [el('span', { text: 'More moves' })]));
      return n.childNodes.length ? n : null;
    };
    const side = (figs, who) => {
      const s = el('div', { class: 'fo-side ' + who });
      if (!figs.length) s.appendChild(el('p', { class: 'fo-none', text: who === 'me' ? 'You have no Figures here.' : M ? 'Nobody else has a Figure here.' : pname(riv) + ' has no Figures here.' }));
      figs.forEach(f => {
        const cell = el('div', { class: 'fo-f' }, [cardB(f)]);
        if (who === 'me') { const c = chipsFor(f); if (c) cell.appendChild(c); }
        else if (h.armed != null) { const a = ui.acts.filter(x => x.t === 'clash' && x.u === h.armed && x.v === f.u);
          if (a.length) { cell.classList.add('tgt'); const m = clashMights(h.armed, f.u);
            cell.appendChild(el('div', { class: 'fo-chips' }, [el('button', { type: 'button', class: 'rd-c clash', onclick: e => { e.stopPropagation(); runActs(a, CARDS[E.byU(S, h.armed).c].n); } }, [el('span', { class: 'rd-x', html: SVG.swords }), el('b', { text: m[0] + ' vs ' + m[1] })])])); } }
        s.appendChild(cell);
      });
      return s;
    };
    // the middle: the Domain, the two totals on a balance, the sentence, the Domain's own power, the road on either side
    const hold = V.hold[p], sd = sidesOf(V.tot[p], me), mid = el('div', { class: 'fo-mid' });
    const tb = el('button', { type: 'button', class: 'fo-tile' + (hold >= 0 ? ' held' : ''), style: hold >= 0 ? { '--hc': 'var(--pc' + hold + ')' } : null, 'aria-label': 'Read ' + C.PLACES[S.places[p]].n, onclick: e => { e.stopPropagation(); h.cards(L.items.findIndex(x => x.p === p && x.u == null)); } }, [miniTile(p, { full: true, rule: true })]);
    mid.appendChild(tb);
    const wonL = hold >= 0 && hold !== me && !E.ally(S, hold, me), wonR = hold >= 0 && !wonL, sum = Math.max(1, sd[0] + sd[1]);
    mid.appendChild(el('div', { class: 'fo-bal' + (wonL ? ' l' : wonR ? ' r' : ''), role: 'img', 'aria-label': (M ? 'The strongest other side has ' : pname(riv) + ' has ') + sd[0] + ' Might here, and you have ' + sd[1] }, [
      el('span', { class: 'fo-sh' + (wonL ? ' win' : hold >= 0 ? ' lose' : ''), style: { '--tc': 'var(--pc' + riv + ')' } }, [el('b', { text: String(sd[0]) })]),
      el('span', { class: 'fo-beam' }, [el('span', { class: 'fo-arm' }, [el('i', { style: { flex: String(sd[0] || .001), background: 'var(--pc' + riv + ')' } }), el('i', { style: { flex: String(sd[1] || .001), background: 'var(--pc' + me + ')' } })]), el('span', { class: 'fo-pivot' })]),
      el('span', { class: 'fo-sh' + (wonR ? ' win' : hold >= 0 ? ' lose' : ''), style: { '--tc': 'var(--pc' + me + ')' } }, [el('b', { text: String(sd[1]) })])]));
    mid.appendChild(el('p', { class: 'fo-who', text: DW(holdSay(p)) }));
    if (on) { const R = roadOf({ p: p, key: S.places[p] }); if (R.btns.length) mid.appendChild(el('div', { class: 'fo-pw' }, R.btns.map(x => el('button', { type: 'button', class: 'btn btn-sm btn-soft rd-b', onclick: e => { e.stopPropagation(); runActs(x.acts, C.PLACES[S.places[p]].n); } },
      [el('span', { text: x.label }), x.cost != null ? el('span', { class: 'sc-cost' }, [el('b', { text: String(x.cost) })]) : null])))); }
    const nav = el('div', { class: 'fo-nav' });
    if (prev != null) nav.appendChild(el('button', { type: 'button', class: 'fo-go', 'aria-label': 'The next Domain along the road: ' + C.PLACES[S.places[prev]].n, onclick: e => { e.stopPropagation(); h.step(-1); } }, [el('span', { class: 'ar', text: '←' }), el('span', { text: domShort(C.PLACES[S.places[prev]].n) })]));
    if (next != null) nav.appendChild(el('button', { type: 'button', class: 'fo-go', 'aria-label': 'The next Domain along the road: ' + C.PLACES[S.places[next]].n, onclick: e => { e.stopPropagation(); h.step(1); } }, [el('span', { text: domShort(C.PLACES[S.places[next]].n) }), el('span', { class: 'ar', text: '→' })]));
    mid.appendChild(nav);
    box.appendChild(side(th, 'them')); box.appendChild(mid); box.appendChild(side(mi, 'me'));
    return box;
  }
  // Size a face-off to its box: the cards as large as both sides allow, the same size on both, nothing cut off
  function fitFaceOff(box) {
    const W = box.clientWidth, H = box.clientHeight; if (!W || !H) return;
    const hz = W > H * 1.05; box.classList.toggle('hz', hz); box.classList.toggle('vt', !hz);
    const sides = box.querySelectorAll('.fo-side'), n = Math.max(1, ...Array.prototype.map.call(sides, s => s.querySelectorAll('.fo-f').length));
    const mw = hz ? Math.round(Math.max(200, Math.min(360, W * .32))) : W, tw = hz ? mw - 16 : Math.round(Math.min(W * .66, 400));
    box.style.setProperty('--mw', mw + 'px'); box.style.setProperty('--tw', tw + 'px'); box.style.setProperty('--th', Math.round(tw * .56) + 'px');
    const mid = box.querySelector('.fo-mid'), midH = hz ? 0 : mid.offsetHeight, sw = hz ? (W - mw - 24) / 2 : W - 12, shH = hz ? H - 12 : (H - midH - 24) / 2;
    let best = 0; for (let r = 1; r <= 3; r++) { const cols = Math.ceil(n / r); best = Math.max(best, Math.min((sw - (cols - 1) * 10) / cols, ((shH - (r - 1) * 10) / r - (hz ? 40 : 34)) / 1.4)); }
    let cw = Math.round(Math.max(54, Math.min(180, best))); box.style.setProperty('--cw', cw + 'px');
    const over = () => Array.prototype.some.call(sides, s => s.scrollHeight > s.clientHeight + 1 || s.scrollWidth > s.clientWidth + 1) || mid.scrollHeight > mid.clientHeight + 1;
    for (let i = 0; i < 24 && cw > 48 && over(); i++) { cw = Math.round(cw * .94); box.style.setProperty('--cw', cw + 'px'); }
    // (a phone: a tile shorter, then smaller words, when the middle is still too tall)
    for (let i = 0; i < 6 && mid.scrollHeight > mid.clientHeight + 1; i++) { const t = Math.round(parseFloat(box.style.getPropertyValue('--tw')) * .9); box.style.setProperty('--tw', t + 'px'); box.style.setProperty('--th', Math.round(t * .56) + 'px'); }
  }
  function scan(at) {
    if (at && at.su) return openView(at.su);   // (a Domain at the set-up: read it on its own)
    at = at || {}; if (!G || !S || !V) return; closeView(); Kit.sfx('flip'); Kit.haptic('light');
    const me = ui.view, opp = 1 - me, role = p => { const w = E.ownerOfSpoke(S, p); return w < 0 ? 'The Crossroads' : (w === me ? 'Your ' : Kit.poss(pname(w)) + ' ') + (E.isGate(S, p) ? 'Gate' : 'Outpost'); };
    // (a Domain's cards lie as they do on the table: the other player's Figures, the Domain's own card, yours. A
    // Domain's level opens as the face-off; a tap on a card there reads the level's cards on the strip)
    const sideOf = o => { const P = V.P[o]; return { side: o, at0: 0, name: o === me ? 'Your side' : Kit.poss(pname(o)) + ' side', role: '', cards: P.hand.length, relics: P.relics.length,
      items: [{ key: P.guide, g: 1, o: o }].concat(P.relics.map(r => ({ key: r, r: 1, o: o }))) }; };
    // (more players: everyone else's Figures to the left, in seat order from your left, each ringed in their colour;
    // the levels go round the rim, each player's Guide, Gate and Outpost, then your three Domains, your side, your hand)
    const sOrd = S.N > 2 ? seatsFrom(me) : [me, opp], rk = o => (sOrd.indexOf(o) + S.N - 1) % S.N;
    const domLv = p => { const figs = V.figs.filter(f => f.p === p), it = f => ({ key: f.c, u: f.u, o: f.o, m: f.m }), th = figs.filter(f => f.o !== me).sort((a, b) => rk(a.o) - rk(b.o) || a.u - b.u), mi = figs.filter(f => f.o === me);
      return { p: p, name: C.PLACES[S.places[p]].n, role: role(p), mine: mi.length, theirs: th.length, at0: th.length,
        items: th.map(it).concat([{ key: S.places[p], p: p }], mi.map(it)) }; };
    const levels = S.N > 2 ? seatsFrom(me).slice(1).reduce((a, o) => a.concat([sideOf(o), domLv(2 * o), domLv(2 * o + 1)]), []).concat([domLv(2 * S.N), domLv(2 * me + 1), domLv(2 * me), sideOf(me)])
      : [sideOf(opp)].concat(rowsOrder().map(domLv), [sideOf(me)]);
    const hand = !ui.hideHand && ui.viewer >= 0 && V.P[me] ? V.P[me].hand : [];
    if (hand.length) levels.push({ hand: true, at0: 0, name: 'Your hand', role: hand.length + (hand.length === 1 ? ' card' : ' cards'), items: hand.map((k, h) => ({ key: k, h: h })) });
    // where to open
    let li = S.N > 2 ? levels.length - 4 : 1, ii = -1, front = null;
    if (at.h != null && hand.length) { li = levels.length - 1; ii = Math.max(0, Math.min(hand.length - 1, at.h)); }
    else if (at.u != null) { levels.forEach((L, i) => L.items.forEach((x, j) => { if (x.u === at.u) { li = i; ii = j; } })); front = { u: at.u }; }
    else if (at.p != null) levels.forEach((L, i) => { if (L.p === at.p) li = i; });
    else if (at.side != null) levels.forEach((L, i) => { if (L.side === at.side) { li = i; L.items.forEach((x, j) => { if (x.key === at.key) ii = j; }); } });
    if (ii < 0) ii = levels[li].at0;
    let flow = el('div', { class: 'vf-flow' }), cuPx = '', mode = '';   // (each level has a strip of its own: a strip's handlers belong to its cards; mode: 'fo' a face-off, 'cards' a Domain's cards on the strip)
    const under = el('div', { class: 'vf-notes' }), strip = el('div', { class: 'vf-strip' }), hb = el('b'), hs = el('small'), road = el('div', { class: 'sc-road' }), body = el('div', { class: 'sc-body' });
    const both = el('button', { type: 'button', class: 'btn btn-sm btn-soft sc-both', text: 'See both sides', onclick: e => { e.stopPropagation(); Kit.sfx('tap'); go(li, 0, 0, 'fo'); } });
    // (the map is the table made small: on each Place, a dot for each Figure and the Might they have there, the
    // other player's at the top left in their colour and yours at the bottom right in yours; a player's Guide with
    // their Relics as brass diamonds, and on the other player's the cards in their hand as a card's back)
    const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
    const tally = (L, o, cls) => { const n = o === me ? L.mine : L.theirs; if (!n) return null; const r = el('span', { class: 'sc-row ' + cls + ' o' + o }); for (let k = 0; k < n; k++) r.appendChild(el('i')); r.appendChild(el('b', { text: String(V.tot[L.p][o]) })); return r; };
    const said = L => L.hand ? L.name + ', ' + L.role
      : L.side != null ? (L.side === me ? 'Your Guide' : Kit.poss(pname(L.side)) + ' Guide') + (L.relics ? ' and ' + plural(L.relics, 'Relic') : '') + (L.side === me ? '' : ', and ' + plural(L.cards, 'card') + ' in their hand')
        : S.N > 2 ? L.name + ', ' + L.role + '. ' + (L.items.length > 1 ? listOf(sOrd.filter(o => L.items.some(x => x.o === o)).map(o => (o === me ? 'you have ' : pname(o) + ' has ') + plural(L.items.filter(x => x.o === o).length, 'Figure'))) + ' here.' : 'Nobody has a Figure here.')
        : L.name + ', ' + L.role + '. ' + pname(opp) + ' has ' + plural(L.theirs, 'Figure') + ' here and you have ' + L.mine + '.';
    const tabs = levels.map((L, i) => {
      const t = el('button', { type: 'button', class: 'sc-lv' + (L.hand ? ' hand' : L.side != null ? ' side o' + L.side : ''), role: 'tab', 'aria-label': said(L), onclick: e => { e.stopPropagation(); if (i !== li || mode === 'cards') go(i, L.at0, i > li ? 1 : i < li ? -1 : 0); } });
      if (L.hand) { t.appendChild(el('span', { class: 'sc-fan', 'aria-hidden': 'true' }, [el('i'), el('i'), el('i')])); t.appendChild(el('b', { text: String(L.items.length) })); }
      else if (L.side != null) { const g = el('span', { class: 'sc-gd', style: { '--f': (FAC[TXG[L.items[0].key].f] || FAC.N).c } }), im = artImg(L.items[0].key, true, true); if (im) g.appendChild(im); t.appendChild(g);
        if (L.relics) { const r = el('span', { class: 'sc-rel' }); for (let k = 0; k < L.relics; k++) r.appendChild(el('i')); t.appendChild(r); }
        if (L.side !== me) t.appendChild(el('span', { class: 'sc-back' }, [el('b', { text: String(L.cards) })])); }
      else { const im = artImg(S.places[L.p], true, true); if (im) t.appendChild(im);
        if (S.N > 2) { const d = el('span', { class: 'sc-dots' }); sOrd.forEach(o => { if (L.items.some(x => x.o === o)) d.appendChild(el('i', { style: { background: 'var(--pc' + o + ')' } })); }); if (d.firstChild) t.appendChild(d); }
        else { const a = tally(L, opp, 'them'), b = tally(L, me, 'me'); if (a) t.appendChild(a); if (b) t.appendChild(b); } }
      return t; });
    // (more players: each other player's Guide, Gate and Outpost side by side on a line of the map, then yours down it)
    const map = el('div', { class: 'sc-map' + (S.N > 2 ? ' n' : ''), role: 'tablist', 'aria-label': 'The table from the other side to your hand' },
      S.N > 2 ? Array.from({ length: S.N - 1 }, (x, k) => el('div', { class: 'sc-grp' }, tabs.slice(3 * k, 3 * k + 3))).concat(tabs.slice(3 * (S.N - 1))) : tabs);
    const v = el('div', { class: 'view flow scan', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'The cards on the table', onclick: e => { if ((F && F.moved()) || held) return; if (e.target === v || e.target === flow || e.target === body) closeView(); } }, [
      el('button', { type: 'button', class: 'icon-btn view-x', 'aria-label': 'Close', html: Kit.icon('close'), onclick: closeView }),
      el('div', { class: 'vf-head' }, [hb, hs, both]), body, strip, road, under]);
    body.appendChild(map); body.appendChild(flow);
    let F = null, held = false, armed = null;   // (held: a swipe has just ended, and the click that ends it is not a tap)
    const clearLock = () => flow.querySelectorAll('.sc-lock').forEach(n => n.remove());
    function rest(i) {
      const it = levels[li].items[i]; under.innerHTML = ''; clearLock(); if (!it) return;
      const kind = it.u != null ? 'Figure' : it.g ? 'Guide' : it.r ? 'Relic' : '';
      hs.textContent = kind ? (it.o === me ? 'Your ' : Kit.poss(pname(it.o)) + ' ') + kind : levels[li].role; hs.className = kind ? 'own o' + it.o : '';
      // (the road under the card: where it can go, what it can do; a card that can't be played says why on the card)
      const R = roadOf(it); paintRoad(road, R, it);
      const lk = lockPlate(R), b = F && F.items[i]; if (lk && b) b.appendChild(lk);
      const nt = notesFor(it.key, it.u != null ? { u: it.u } : it.p != null ? { p: it.p } : {}); while (nt.firstChild) under.appendChild(nt.firstChild); under.scrollTop = 0;
      warm(levels[li].items.slice(Math.max(0, i - 3), i + 4).map(x => x.key));
    }
    // a Domain's face-off, drawn again where it stands (a Clash chip armed, the table moved on)
    function drawFo(dir) {
      const L = levels[li], node = faceOffEl(L, front, { armed: armed, arm: u => { armed = u; drawFo(0); }, step: roadStep, cards: k => { if (k >= 0) go(li, k, 0, 'cards'); } });
      if (F) { F.stop(); F = null; } const old = flow; flow = node; old.parentNode.replaceChild(flow, old); foGest(flow);
      fitFaceOff(flow);
      if (dir && flow.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) flow.animate([{ transform: 'translate' + (Math.abs(dir) > 1 ? 'X(' + (dir > 0 ? 46 : -46) : 'Y(' + (dir > 0 ? 46 : -46)) + 'px)', opacity: .15 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    // another level: its name, its thumbnails, its cards; the strip comes in from the side it was swiped from
    // (m: 'cards' reads a Domain's cards on the strip; a Domain's level otherwise opens as its face-off)
    function go(i, j, dir, m) {
      li = Math.max(0, Math.min(levels.length - 1, i)); const L = levels[li], n = L.items.length;
      mode = L.p != null ? (m === 'cards' ? 'cards' : 'fo') : ''; if (mode !== 'fo' || m !== 'keep') armed = null;
      v.classList.toggle('fo-on', mode === 'fo'); v.classList.toggle('fo-cards', mode === 'cards');
      hb.textContent = L.name;
      tabs.forEach((t, k) => { t.classList.toggle('on', k === li); t.setAttribute('aria-selected', String(k === li)); });
      if (mode === 'fo') { hs.textContent = L.role; hs.className = ''; strip.innerHTML = ''; road.innerHTML = ''; under.innerHTML = ''; drawFo(dir); if (dir) { Kit.sfx('slide', .6); Kit.haptic('light'); } return; }
      if (F) F.stop(); const old = flow; flow = el('div', { class: 'vf-flow' }); if (cuPx) flow.style.setProperty('--cu', cuPx); old.parentNode.replaceChild(flow, old); swipes(flow); strip.innerHTML = '';
      // (a card you can do something with now has a gold pip on its thumbnail: what can be played from the hand, which of your Figures can still act)
      L.items.forEach((x, k) => { const c = info(x.key), can = canDo(x), t = el('button', { type: 'button', class: 'vf-t' + (x.o != null ? ' o' + x.o : '') + (x.p != null && n > 1 ? ' mid' : '') + (can ? ' can' : ''), 'aria-label': c.n, style: { '--f': (FAC[c.f] || FAC.N).c }, onclick: e => { e.stopPropagation(); F.settle(k, 0); } }); const im = artImg(x.key, true) || mono(x.key); if (im) t.appendChild(im); strip.appendChild(t); });
      strip.hidden = n < 2;
      size();
      F = makeFlow({ flow: flow, strip: strip, n: n, at: j || 0, rest: rest, front: clearLock,
        make: k => { const x = L.items[k]; return el('div', { class: 'vf-c' + (x.o != null ? ' own o' + x.o : ''), onclick: e => { e.stopPropagation(); if (F.moved()) return; if (k !== Math.round(F.pos)) F.settle(k, 0); } }, [cardEl(x.key, { now: true, tg: true, might: x.m != null ? x.m : null, cost: x.h != null && S ? E.costOf(S, me, x.key) : null, hush: x.u != null && !!(E.byU(S, x.u) || {}).hush })]); } });
      F.render(); rest(Math.round(F.pos));
      if (dir && flow.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) flow.animate([{ transform: 'translateY(' + (dir > 0 ? 46 : -46) + 'px)', opacity: .15 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' });
      if (dir) { Kit.sfx('slide', .6); Kit.haptic('light'); }
    }
    const step = d => { const t = li + d; if (t < 0 || t >= levels.length) return false; go(t, levels[t].at0, d); return true; };
    // along the road from a Domain: the next Domain level that way (a swipe sideways, the arrow keys, the face-off's arrows)
    function roadStep(d) { for (let t = li + d; t >= 0 && t < levels.length; t += d) if (levels[t].p != null) { front = null; go(t, levels[t].at0, 2 * d); return true; } return false; }
    // up and down: a swipe on the cards, the wheel, the arrow keys
    function swipes(flow) {
      let sw = null;
      flow.addEventListener('pointerdown', e => { sw = { x: e.clientX, y: e.clientY, id: e.pointerId, v: false }; });
      flow.addEventListener('pointermove', e => { if (!sw || e.pointerId !== sw.id || (F && F.moved())) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
        if (!sw.v) { if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.2) { sw.v = true; try { flow.setPointerCapture(e.pointerId); } catch (x) {} } else return; }
        const edge = (dy < 0 && li === levels.length - 1) || (dy > 0 && li === 0); flow.style.transform = 'translateY(' + (edge ? dy * .25 : dy * .6).toFixed(1) + 'px)'; flow.style.opacity = String(Math.max(.35, 1 - Math.abs(dy) / 320)); });
      const endV = e => { if (!sw) return; const s0 = sw; sw = null; if (!s0.v) return; const dy = e.clientY - s0.y; flow.style.transform = ''; flow.style.opacity = ''; held = true; setTimeout(() => { held = false; }, 160);
        if (Math.abs(dy) > 44) step(dy < 0 ? 1 : -1); };
      flow.addEventListener('pointerup', endV); flow.addEventListener('pointercancel', endV);
    }
    // a face-off: a swipe sideways walks along the road, up and down changes level, as on the strip
    function foGest(n) {
      let sw = null;
      n.addEventListener('pointerdown', e => { sw = { x: e.clientX, y: e.clientY, id: e.pointerId, d: 0 }; });
      n.addEventListener('pointermove', e => { if (!sw || e.pointerId !== sw.id) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
        if (!sw.d) { if (Math.hypot(dx, dy) < 12) return; sw.d = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'h' : Math.abs(dy) > Math.abs(dx) * 1.2 ? 'v' : 0; if (!sw.d) return; try { n.setPointerCapture(e.pointerId); } catch (x) {} }
        n.style.transform = sw.d === 'h' ? 'translateX(' + (dx * .5).toFixed(1) + 'px)' : 'translateY(' + (dy * .5).toFixed(1) + 'px)'; n.style.opacity = String(Math.max(.4, 1 - Math.abs(sw.d === 'h' ? dx : dy) / 360)); });
      const end = e => { if (!sw) return; const s0 = sw; sw = null; if (!s0.d) return; const dx = e.clientX - s0.x, dy = e.clientY - s0.y; n.style.transform = ''; n.style.opacity = ''; held = true; setTimeout(() => { held = false; }, 160);
        if (s0.d === 'h' && Math.abs(dx) > 50) roadStep(dx < 0 ? 1 : -1); else if (s0.d === 'v' && Math.abs(dy) > 50) step(dy < 0 ? 1 : -1); };
      n.addEventListener('pointerup', end); n.addEventListener('pointercancel', end);
      // (the click that ends a swipe is not a tap on the card under it)
      n.addEventListener('click', e => { if (held) { e.stopPropagation(); e.preventDefault(); } }, true);
    }
    let wt = 0; v.addEventListener('wheel', e => { if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.shiftKey || e.target.closest('.vf-notes')) return; e.preventDefault(); const now = performance.now(); if (now - wt < 420 || Math.abs(e.deltaY) < 12) return; wt = now; step(e.deltaY > 0 ? 1 : -1); }, { passive: false });
    const key = e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); step(e.key === 'ArrowDown' ? 1 : -1); } else if (mode === 'fo' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); roadStep(e.key === 'ArrowRight' ? 1 : -1); } else if (F) F.key(e); };
    // (upright: the card is as big as leaves the map its place at the left and the road and notes theirs below; the
    // notes take what is left and scroll. Sideways on a phone the road and notes have the right-hand side to themselves.)
    function size() {
      const W = window.innerWidth, H = window.innerHeight, side = W > H * 1.15 && H <= 560;
      flow.style.removeProperty('--cu'); cuPx = ''; if (side || mode === 'fo') return;
      const cs = getComputedStyle(v), room = H - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - v.querySelector('.vf-head').offsetHeight - 46 - roadDims().h - 4 * 8, notes = Math.max(96, Math.round(H * .16));
      const mapW = map.offsetWidth + 14;
      cuPx = Math.round(Math.max(200, Math.min(520, (W - 2 * mapW) * 1.4, room - notes))) + 'px'; flow.style.setProperty('--cu', cuPx);
    }
    const resize = () => { if (mode === 'fo') { fitFaceOff(flow); return; } size(); if (F) { F.reset(); rest(Math.round(F.pos)); } };
    const resize2 = () => { resize(); setTimeout(() => { if (v.isConnected) resize(); }, 350); };
    document.addEventListener('keydown', key); window.addEventListener('resize', resize2); window.addEventListener('orientationchange', resize2);
    v._off = () => { if (F) F.stop(); document.removeEventListener('keydown', key); window.removeEventListener('resize', resize2); window.removeEventListener('orientationchange', resize2); };
    document.body.appendChild(v); viewEl = v; document.addEventListener('keydown', viewKey);
    go(li, ii, 0);
    requestAnimationFrame(() => requestAnimationFrame(() => v.classList.add('show')));
  }
  // A hold on a card on the table opens it in the scanner (a right click does the same with a mouse)
  function holdToScan(box, find) {
    let t = 0, p0 = null; const clear = () => { if (t) clearTimeout(t); t = 0; p0 = null; };
    box.addEventListener('pointerdown', e => { clear(); if (!G || G.demo || viewEl || (e.pointerType === 'mouse' && e.button !== 0)) return; const at = find(e.target); if (!at) return; p0 = { x: e.clientX, y: e.clientY };
      t = setTimeout(() => { t = 0; if (!p0) return; ui.held = true; setTimeout(() => { ui.held = false; }, 700); Kit.haptic('medium'); scan(at); }, 420); });
    box.addEventListener('pointermove', e => { if (p0 && Math.hypot(e.clientX - p0.x, e.clientY - p0.y) > 10) clear(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => box.addEventListener(n, clear));
    box.addEventListener('contextmenu', e => { const at = !G || G.demo ? null : find(e.target); if (!at) return; e.preventDefault(); clear(); scan(at); });
  }
  const scanAt = n => { if (G && G.ph === 'setup') { const d = n.closest('[data-su]'); return d ? { su: d.dataset.su } : null; } const fp = n.closest('.fp, .stk'), row = n.closest('.pl'), hc = n.closest('.hc'); return fp ? { u: +fp.dataset.u } : hc ? (ui.hideHand ? null : { h: +hc.dataset.h }) : row && n.closest('.pl-tile') ? { p: +row.dataset.p } : null; };

  // ═══ Drag to play ════════════════════════════════════════════════════════════════════════════════════════
  // Tim approved, 2026-11-13 ("keep going with face off, carousel and the rest"): a card from your hand can be dragged
  // onto the board. The Domains it can go to glow and the others dim, and the one under your finger shows your total
  // there after the move and what it does ("You take it"); letting go there plays it. A Figure on the board is dragged
  // the same way to a Domain to walk, or onto an enemy Figure to clash. A drag is the same pick as a tap (select, pick),
  // so tap-then-tap works as before, and the lessons, which pick with the engine's moves, never see it. A drag starts
  // only once the finger has moved 12 px, after the hold that opens the scan has been let go (it gives up at 10 px).
  let drag = null;
  function dragDown(e) {
    drag = null;
    if (!G || G.demo || viewEl || !idle() || ui.discard || ui.pend || G.ph !== 'play' || ui.view !== S.turn || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const hc = e.target.closest('.an-hand .hc'), fp = e.target.closest('.an-map .fp'), o = S.turn, hand = S.P[o].hand;
    let sel = null, key = null, m = null;
    if (hc && hc.dataset.h != null) { const h = +hc.dataset.h; key = hand[h]; if (key == null || !ui.acts.some(a => (a.h != null && hand[a.h] === key) || (E.fxOf(key) === 'phalanx' && a.ph && hand[a.hq] === key))) return; sel = { kind: 'hand', h: h }; }
    else if (fp) { const u = +fp.dataset.u, f = E.byU(S, u); if (!f || f.o !== o || !ui.acts.some(a => a.u === u && (a.t === 'walk' || a.t === 'clash' || a.t === 'antik' || a.t === 'tub'))) return; sel = { kind: 'fig', u: u }; key = f.c; m = E.might(S, f, 0); }
    else return;
    const r = (hc || fp).getBoundingClientRect();
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, sel: sel, key: key, m: m, w: Math.max(54, Math.min(120, (hc || fp).querySelector('.ac') ? (hc || fp).querySelector('.ac').getBoundingClientRect().width : r.width)), from: r, on: false, at: null };
  }
  function dragBegin() {
    const d = drag; d.on = true; ui.held = true;
    if (!(ui.sel && ui.sel.kind === d.sel.kind && (ui.sel.h === d.sel.h && ui.sel.u === d.sel.u) && !ui.sel.picks.length)) select(d.sel); else render();
    dom.felt.classList.add('dragging');
    lift(true);
    const c = cardEl(d.key, { mini: true, now: true, might: d.m != null ? d.m : undefined }); c.style.fontSize = (d.w / 30) + 'px';
    d.pv = el('div', { class: 'an-drag-pv' }); d.g = el('div', { class: 'an-drag', style: { width: d.w + 'px' } }, [c, d.pv]);
    document.body.appendChild(d.g); Kit.sfx('slide'); Kit.haptic('light');
  }
  // the card or Figure that is being dragged stays where it was, faint, until it lands
  function lift(on) {
    const d = drag; if (!d || !dom.root) return;
    dom.root.querySelectorAll('.an-lifted').forEach(n => n.classList.remove('an-lifted'));
    if (!on) return;
    const n = d.sel.kind === 'hand' ? dom.hand.querySelector('.hc[data-h="' + d.sel.h + '"]') : dom.map.querySelector('.fp[data-u="' + d.sel.u + '"]'); if (n) n.classList.add('an-lifted');
  }
  // what is under the finger: a Domain the card can go to, an enemy Figure it can clash with, or the table (a Relic, a Deed with nothing to choose)
  function dragAt(x, y) {
    const T = targets(), n = document.elementFromPoint(x, y); if (!n || !dom.root.contains(n)) return null;
    const fp = n.closest('.fp'), stk = n.closest('.stk'), row = n.closest('.pl[data-p]');
    if (fp && T.figs[+fp.dataset.u]) return { k: 'f', v: +fp.dataset.u, n: fp, acts: T.figs[+fp.dataset.u] };
    if (stk) { const u = stk.dataset.us.split(' ').map(Number).filter(x => T.figs[x])[0]; if (u != null) return { k: 'f', v: u, n: stk, acts: T.figs[u] }; }
    if (row && T.places[+row.dataset.p]) return { k: 'p', v: +row.dataset.p, n: row, acts: T.places[+row.dataset.p] };
    if (T.done.length && !Object.keys(T.places).length && !Object.keys(T.figs).length && !Object.keys(T.hand).length && !n.closest('.an-hand')) return { k: 'done', n: n.closest('.an-map, .an-strip.me') || dom.map, acts: T.done };
    return null;
  }
  // what letting go there would do, in a few words and a number: your total there after it, or the clash's two Mights
  function dragSay(t) {
    const o = S.turn, me = o;
    if (t.k === 'f') { const pv = clashPreview(t.acts); return pv ? { m: pv[0] + ' vs ' + pv[1], tx: pv[0] > pv[1] ? 'You are stronger' : pv[0] < pv[1] ? 'They are stronger' : 'Even' } : { tx: 'Clash' }; }
    if (t.k === 'done') return { tx: 'Play ' + theName(drag.key) };
    const a = t.acts[0], moves = a.t === 'fig' || a.t === 'walk' || a.t === 'antik' || a.t === 'tub';
    if (!moves) return { tx: 'Play here' };
    const T2 = simulate(a), sd = sidesOf(E.mights(T2, t.v), me), h = E.holder(T2, t.v), was = V.hold[t.v], mine = q => q >= 0 && (q === me || E.ally(S, q, me));
    return { m: sd[1], tx: mine(h) ? (mine(was) ? 'You keep it' : 'You take it') : h < 0 ? (sd[0] === sd[1] && sd[1] ? 'Tied' : 'Nobody holds it') : pname(h) + (mine(was) ? ' takes it' : ' keeps it') };
  }
  function dragMove(e) {
    const d = drag; if (!d || e.pointerId !== d.id) return;
    if (viewEl || !G || !idle()) { dragEnd(null); return; }
    if (!d.on) { if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 12) return; dragBegin(); }
    d.g.style.left = e.clientX + 'px'; d.g.style.top = (e.clientY - d.w * .55) + 'px';
    const t = dragAt(e.clientX, e.clientY), was = d.at;
    if ((t && t.n) !== (was && was.n) || (t && was && t.v !== was.v)) {
      if (was && was.n) was.n.classList.remove('an-dhov');
      d.at = t; d.pv.innerHTML = '';
      if (t) { t.n.classList.add('an-dhov'); Kit.haptic('light'); const s = dragSay(t);
        if (s.m != null) d.pv.appendChild(el('span', { class: 'sh' + (typeof s.m === 'string' ? ' vs' : '') }, [el('b', { text: String(s.m) })]));
        d.pv.appendChild(el('span', { class: 'tx', text: s.tx })); d.g.classList.add('over'); }
      else d.g.classList.remove('over');
    }
  }
  function dragEnd(e) {
    const d = drag; drag = null; if (!d || !d.on) return;
    if (e && e.pointerId !== d.id) { drag = d; return; }
    setTimeout(() => { ui.held = false; }, 400);   // (the click that ends a drag is not a tap)
    dom.felt && dom.felt.classList.remove('dragging'); if (d.at && d.at.n) d.at.n.classList.remove('an-dhov');
    const t = e && G && idle() ? dragAt(e.clientX, e.clientY) : null;
    const gone = () => { d.g.remove(); dom.root && dom.root.querySelectorAll('.an-lifted').forEach(n => n.classList.remove('an-lifted')); };
    if (t) { gone(); Kit.haptic('medium'); if (t.k === 'done') finishPick(t.acts); else pick(t.k, t.v); return; }
    // (let go anywhere else: the card goes back where it came from, and nothing is picked up)
    const g = d.g.getBoundingClientRect(), fr = d.from;
    if (d.g.animate) d.g.animate([{ transform: 'none' }, { transform: 'translate(' + (fr.left + fr.width / 2 - (g.left + g.width / 2)) + 'px,' + (fr.top + fr.height / 2 - (g.top + g.height / 2)) + 'px) scale(.9)', opacity: .4 }], { duration: 220, easing: 'cubic-bezier(.3,.8,.4,1)' }).onfinish = gone; else gone();
    Kit.sfx('slide', .5); clearSel();
  }
  window.addEventListener('pointermove', dragMove, { passive: true });
  window.addEventListener('pointerup', dragEnd); window.addEventListener('pointercancel', e => { if (drag && drag.on) dragEnd(null); else drag = null; });

  const listOf = (a, w) => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' ' + (w || 'and') + ' ' + a[a.length - 1];
  // ═══ Setup ═══════════════════════════════════════════════════════════════════════════════════════════════
  function deckFacs(cards) {
    const n = {}; cards.forEach(k => { const f = CARDS[k].f; if (f !== 'N') n[f] = (n[f] || 0) + 1; });
    return Object.keys(n).sort((a, b) => n[b] - n[a]).map(f => [f, n[f]]);
  }
  // a deck's Guide and cards, one of each with how many (d = {n, guide, cards})
  function deckSheet(d) {
    const n = {}; d.cards.forEach(k => { n[k] = (n[k] || 0) + 1; });
    const keys = (d.guide ? [d.guide] : []).concat(Object.keys(n).sort((a, b) => (CARDS[a].t === 'fig' ? 0 : 1) - (CARDS[b].t === 'fig' ? 0 : 1) || CARDS[a].c - CARDS[b].c));
    browse(keys, { counts: n, title: d.n, sub: d.cards.length + ' cards' });
  }
  // The decks a seat can choose. A person: the decks they can play (their starter, any ready deck they own all of,
  // the decks they built), then the ready decks still locked, with how much of each they own, and Build a deck.
  // The computer: any of the five ready decks, or a surprise.
  const readyDeck = name => ({ id: 'ready:' + name, n: name, guide: C.ARCH[name].guide, cards: C.ARCH[name].cards.concat(C.ARCH[name].cards), ready: true, ok: true });
  const starterId = () => 'ready:' + (Coll.load().starter || DECKS[0]);
  function deckChoice(v, who) {   // the choice as it stands: a deck this seat can play
    if (who === 'cpu') { const n = String(v || '').replace(/^ready:/, ''); return C.ARCH[n] ? 'ready:' + n : 'any'; }
    const d = Coll.deck(String(v || '')) || Coll.deck('ready:' + v); return d && d.ok ? d.id : starterId();
  }
  function deckPicker(label, value, set, who, many) {
    value = deckChoice(value, who);
    const box = el('div', { class: 'k-opt dk-pick' }, [el('div', { class: 'label' }, [el('span', { text: label })])]);
    const row = el('div', { class: 'dk-row' });
    const all = who === 'cpu' ? [{ id: 'any', n: 'Surprise me', ok: true }].concat(DECKS.map(readyDeck)) : Coll.decks().sort((a, b) => (b.ok ? 1 : 0) - (a.ok ? 1 : 0));
    all.forEach(d => {
      const any = d.id === 'any', g = any ? null : d.guide;
      const pic = el('span', { class: 'dk-g' + (any || !g ? ' back' : ''), style: any || !g ? null : { '--f': FAC[TXG[g].f].c } });
      if (g) { const im = artImg(g, true); if (im) pic.appendChild(im); }
      const cols = el('span', { class: 'dk-c' });
      (any ? [['D', 1], ['S', 1], ['V', 1], ['A', 1], ['W', 1]] : deckFacs(d.cards)).forEach(x => cols.appendChild(el('i', { style: { '--c': FAC[x[0]].c, '--n': x[1] } })));
      row.appendChild(el('button', { type: 'button', class: 'dk' + (value === d.id ? ' on' : '') + (d.ok ? '' : ' locked'), 'aria-pressed': String(value === d.id), 'aria-label': d.n + (d.ok ? '' : ', not yours to play yet: ' + d.why.join(', ')),
        onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); if (d.ok) set(d.id); else lockedDeck(d); } },
        [pic, el('span', { class: 'dk-n', text: d.n }), d.ok ? cols : el('span', { class: 'dk-own', html: Kit.icon('lock') + '<b>' + (d.ready ? d.own : d.cards.length) + ' of ' + Coll.DECK + '</b>' })]));
    });
    if (who !== 'cpu' && window.AnoriaDecks) row.appendChild(el('button', { type: 'button', class: 'dk dk-new', onclick: () => { Kit.sfx('tap'); window.AnoriaDecks.open(null, showSetup); } },
      [el('span', { class: 'dk-g back plus', html: Kit.icon('plus') }), el('span', { class: 'dk-n', text: 'Build a deck' })]));
    box.appendChild(row);
    const d = value === 'any' ? null : who === 'cpu' ? readyDeck(value.slice(6)) : Coll.deck(value);
    if (d) {
      const g = TXG[d.guide];
      box.appendChild(el('div', { class: 'dk-info' }, [
        el('div', { class: 'plan', text: d.ready ? PLAN[d.n] : 'A deck you built' }),
        el('div', { class: 'gd', html: '<b>' + esc(g.n) + '</b> is this deck’s Guide. ' + esc(g.tx) }),
        el('span', { class: 'dk-btns' }, [
          d.built && window.AnoriaDecks ? el('button', { type: 'button', class: 'btn btn-soft btn-sm', text: 'Change', onclick: () => { Kit.sfx('tap'); window.AnoriaDecks.open(d.id, showSetup); } }) : null,
          el('button', { type: 'button', class: 'btn btn-soft btn-sm', text: 'Cards', onclick: () => { Kit.sfx('tap'); deckSheet(d); } })])
      ]));
    } else box.appendChild(el('div', { class: 'dk-info' }, [el('div', { class: 'plan', text: many ? 'The game picks one of the five decks for each computer player at the start, a different one for each while there are enough.' : 'The game picks one of the five decks at the start.' })]));
    return box;
  }
  // a ready deck you don't own all of yet: what's missing, and where to go for it
  function lockedDeck(d) {
    const acts = [{ label: 'OK', cls: 'btn-soft' }];
    if (d.ready && window.AnoriaLibrary) acts.unshift({ label: 'Open the Library', primary: true, onClick: () => window.AnoriaLibrary.open(showSetup) });
    if (d.built && window.AnoriaDecks) acts.unshift({ label: 'Change this deck', primary: true, onClick: () => window.AnoriaDecks.open(d.id, showSetup) });
    Kit.sheet({ title: d.n, html: '<p>' + esc(d.why.join('. ')) + '.</p>' + (d.ready ? '<p class="muted">A ready deck is yours to play once you own every card in it. New cards come in packs.</p>' : ''), actions: acts });
  }
  // The way into your collection, under who's playing: the Library (how much of it is yours), the packs waiting to
  // be opened (or what earns the next one), and your decks
  function hubRow() {
    const c = Coll.counts(), packs = Coll.packs(), next = Coll.nextUp()[0], mine = Coll.myDecks().length, row = el('div', { class: 'an-hub' });
    const tile = (cls, ic, name, sub, on, fn) => el('button', { type: 'button', class: 'an-hub-t ' + cls + (on ? ' on' : ''), onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); fn(); } },
      [el('span', { class: 'ic', html: ic }), el('b', { text: name }), el('small', { text: sub })]);
    if (window.AnoriaLibrary) row.appendChild(tile('lib', Kit.icon('book'), 'Library', c.own + ' of ' + c.cards, false, () => window.AnoriaLibrary.open(showSetup)));
    if (window.AnoriaPacks) row.appendChild(tile('pk', Kit.icon('sparkle'), 'Packs', packs.length ? packs.length + ' to open' : next && next.done ? 'Next one tomorrow' : 'Win today for one', packs.length > 0, () => window.AnoriaPacks.open(showSetup)));
    if (window.AnoriaDecks) row.appendChild(tile('dk', Kit.icon('cards'), 'Decks', mine ? mine + ' you built' : 'Build your own', false, () => window.AnoriaDecks.open(null, showSetup)));
    return row;
  }
  // Who's playing goes through the kit's players sheet like every game: 2 to 6 seats, people and the computer in any
  // seat after the first (vs Computer is everyone else a robot; Pass & play is two or more people, with robots in any
  // other seats). Each person chooses their deck as the two-player setup always had it; the computer players share one
  // choice (one deck for all of them, or a different surprise for each), so a table of six stays one screen. At 4 and 6
  // seats a Teams choice joins them: 2 against 2, 3 against 3, or three teams of 2 (teamsFor).
  function showSetup() {
    stop(); G = null; S = null; V = null; clearSave(); setCols(null);
    app.className = 'stage'; app.innerHTML = ''; document.documentElement.classList.remove('an-low'); window.scrollTo(0, 0);
    // the first time: choose your Guide (their deck is your starter) and open your welcome packs
    if (!Coll.load().starter && window.AnoriaPacks) { window.AnoriaPacks.chooseStarter(app, showSetup); return; }
    const none = () => el('span', { style: { display: 'none' } });
    const seat = (i, ctx) => (ctx && ctx.seats ? ctx.seats[i] : null);
    const people = ctx => (ctx && ctx.seats ? ctx.seats.filter(s => !s.cpu).length : 1), bots = ctx => (ctx && ctx.seats ? ctx.seats.filter(s => s.cpu).length : 1);
    // (a person's deck: "Your deck" while one person plays, else the deck of that person by name)
    const label = (i, ctx) => { if (people(ctx) <= 1) return 'Your deck'; const s = seat(i, ctx), n = s && s.name ? s.name : ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'][i] + ' player'; return Kit.poss(n) + ' deck'; };
    const deckOpt = i => ({ id: 'deck' + i, value: starterId(), when: (m, v, n) => (n || 2) > i,
      render: (v, set, ctx) => (seat(i, ctx) ? !seat(i, ctx).cpu : !i) ? deckPicker(label(i, ctx), v, set, 'me') : none(),
      summary: v => { const d = Coll.deck(deckChoice(v, 'me')); return d ? d.n : ''; } });
    // (the computer starts on Easy until you've won a game: a first game is for learning)
    const st = Kit.setup(app, {
      modes: Kit.modes([{ id: 'cpu', desc: 'Easy, Normal or Hard' }, { id: 'local' }]),
      options: [0, 1, 2, 3, 4, 5].map(deckOpt).concat([
        { id: 'decks', value: 'any', render: (v, set, ctx) => bots(ctx) ? deckPicker(bots(ctx) > 1 ? 'The computer players\' decks' : 'The computer\'s deck', v, set, 'cpu', bots(ctx) > 1) : none() },
        { id: 'teams', label: 'Teams', value: 'off', when: (m, v, n) => n === 4 || n === 6,
          help: 'Teammates sit with an opponent between them. They add their Renown together and their Might together, and they can\'t clash with each other.',
          choices: n => n === 6 ? [['off', 'No teams', 'Each player plays for themselves, and the first to 25 Renown wins.'], ['three', '3 against 3', 'Two teams of three. The first team to 65 Renown between them wins.'], ['two', 'Three teams of 2', 'Three teams of two. The first team to 45 Renown between them wins.']]
            : [['off', 'No teams', 'Each player plays for themselves, and the first to 25 Renown wins.'], ['two', '2 against 2', 'Two teams of two. The first team to 45 Renown between them wins.']] },
        { id: 'level', robot: true, label: 'Computer skill', value: Coll.load().wins ? 'normal' : 'easy', choices: [['easy', 'Easy', 'The computer stops early and misses things, which makes for a good first game.'], ['normal', 'Normal', DW('The computer plays to hold Places, with the odd slip.')], ['hard', 'Hard', 'The computer plays its best, and comes for your Gate and your Seals.']] }
      ]),
      players: { range: () => [2, 6], count: 2, cpu: m => m === 'cpu' ? 'seats' : m === 'local' ? 'mix' : false, teams: (n, v) => teamsFor(n, v.teams) },
      start: 'Deal the cards',
      onStart: cfg => {
        const n = cfg.players.length, teams = teamsFor(n, cfg.options.teams), cols = seatColors(n, teams), cpu = cfg.players.every((p, i) => !i || p.cpu);
        // (the computer players' decks: the one chosen for all of them, or a different ready deck for each while there are enough)
        const pool = E.shuffle(DECKS.slice(), Math.random); let k = 0;
        const theirs = () => { const id = deckChoice(cfg.options.decks, 'cpu'); return readyDeck(id === 'any' ? pool[(k++) % pool.length] : id.slice(6)); };
        newGame({ mode: cpu ? 'cpu' : 'local', level: LEVEL[cfg.options.level] ? cfg.options.level : 'normal', teams: teams,
          players: cfg.players.map((p, i) => { const d = p.cpu ? theirs() : Coll.deck(deckChoice(cfg.options['deck' + i], 'me'));
            return { name: p.name, cpu: !!p.cpu, level: p.cpu && LEVEL[p.level] ? p.level : undefined, color: cols[i], deck: d.n, deckId: d.id, built: !!d.built, guide: d.guide, cards: d.cards.slice() }; }) });
      }
    });
    const seats = st && st.el && st.el.querySelector('.k-seats'); if (seats) seats.parentNode.insertBefore(hubRow(), seats.nextSibling);
    matWarm();
  }

  // ═══ The game: state, saving ═════════════════════════════════════════════════════════════════════════════
  // G = {mode, level, players:[{name,cpu,color,deck}], S (the engine's state), ord (who goes first and second this
  //      round), k (0 or 1: which of them is on), ph ('start': the turn hasn't begun, 'play'), started, stats, hist}
  let G = null, S = null, V = null, gen = 0, speed = 1, undoStack = [];
  const ui = { sel: null, busy: false, view: 0, viewer: -1, hideHand: false, discard: false, acts: [], newLine: 0, banner: 0, fresh: {}, crack: null, drop: {} };
  const dom = {};
  const cfgStd = () => Object.assign({}, E.DEF, { log: 1, coin: 1 }, E.STD);
  const pname = o => G.players[o].name;
  const human = o => !G.players[o].cpu;
  // (the first person at the table: the seat whose side of the table is drawn large when the computer is playing)
  const firstHuman = () => { for (let o = 0; o < G.players.length; o++) if (human(o)) return o; return 0; };
  // (a game of three to six players: the table is drawn as spokes round the Crossroads, the others round the rim)
  const many = () => !!S && S.N > 2;
  // (a robot's way of playing: its own skill, or the table's)
  const profOf = (p, lv) => E.PROF[LEVEL[(p && p.level) || lv] || 'holder'];
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  if (lsGet('anoria_artview') === '1') document.documentElement.classList.add('an-artview');
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  function save() {
    if (!G || !S || G.demo) return;   // (a lesson on the table is never saved: your own game is)
    if (G.over) { clearSave(); return; }
    lsSet(SAVE, JSON.stringify({ v: 1, G: Object.assign({}, G, { S: Object.assign({}, S, { cfg: null, st: null, ev: null }) }) }));
    Kit.resume.set('Round ' + S.round, { keys: [SAVE] });
  }
  function clearSave() { lsSet(SAVE, null); Kit.resume.clear(); }
  // (a saved game that holds a card which has left the set is played on as it was, with that card: cards.js RETIRED)
  function readSave() { let d = null; try { d = JSON.parse(lsGet(SAVE)); } catch (e) {} return d; }
  function stop() { gen++; ui.demoIdle = false; ui.clashHold = null; if (ui.ackGo) { const go = ui.ackGo; ui.ack = null; ui.ackGo = null; go(); } if (window.AnoriaGuide) window.AnoriaGuide.halt(); document.documentElement.classList.remove('an-fast'); ui.sel = null; ui.busy = false; ui.discard = false; undoStack = []; closeView(); try { Kit.handoff.close(); } catch (e) {} document.querySelectorAll('.clash,.show-card,.an-banner,.an-story').forEach(n => n.remove()); if (dom.fx) dom.fx.innerHTML = ''; }
  // (a player from before decks could be built: their ready deck by name)
  function deckOf(p) { if (!p.cards) { const A = C.ARCH[p.deck] || C.ARCH.Explorers; p.cards = A.cards.concat(A.cards); p.guide = A.guide; } return p; }
  // A player's Domain stack: the one that came with the game's set-up, or the one saved with their deck (a ready
  // deck's ready stack unless they chose another), with any Domain that is no longer in the game left out.
  function stackOf(p) {
    let st = Array.isArray(p.stack) && p.stack.length ? p.stack : null;
    if (!st && !p.cpu && Coll.stackFor) st = Coll.stackFor(p.deckId || ('ready:' + p.deck));
    if (!st) st = (C.ARCH[p.deck] || {}).stack || C.STACKS[(C.ARCH[Coll.load().starter] ? Coll.load().starter : 'Explorers')];
    st = st.filter((id, i) => C.PLACES[id] && st.indexOf(id) === i);
    return st.length >= 5 ? st : C.STACKS.Explorers.slice();
  }
  function newGame(cfg) {
    stop();
    cfg.players.forEach(deckOf);
    cfg.players.forEach(p => { p.cards = p.cards.map(C.now); });   // (Play again after an old game: a new game is dealt from the set as it is today)
    const decks = cfg.players.map(p => p.cards.slice()), guides = cfg.players.map(p => p.guide);
    // Domains: each player brings a stack of 15 (the stack saved with their deck: coll.js). Set-up is decided by the
    // engine for now (E.setupAuto: a person's three Domains are laid as a robot playing its best would lay them, and
    // the dice are rolled unseen). SEAM for the set-up screen: pass {wait: true} and drive E.setupOptions, E.setupLay
    // and E.setupRoll from it; S.su holds what was drawn, laid and rolled either way.
    // (Until the Domain screens are built, a new game on the page is played on the old fixed map, as before: the
    // engine's Domains are on for the test games and for a page opened with ?domains=1, or anoria_dm '1' on the device.)
    const dmOn = !!C.DM_LIVE;
    cfg.players.forEach(p => { p.stack = dmOn ? stackOf(p) : null; });
    // (teams: who plays together, and the Renown a team needs, 20 for each player on it and 5 more: engine.js targetFor.
    // Everything else about a game of more players, the engine's rules give it: cfgStd)
    const ecfg = cfgStd(); if (cfg.teams) { ecfg.teams = cfg.teams; ecfg.target = E.targetFor(cfg.teams); }
    S = E.newGame(decks, guides, ecfg, E.rng((Math.random() * 4294967296) >>> 0), dmOn ? cfg.players.map(p => p.stack.slice()) : null, { wait: dmOn, profs: cfg.players.map(p => (p.cpu ? profOf(p, cfg.level) : null)) });
    S.st = null; S.ev = [];
    // (sc: the scoring this game is played under. 2: every Place scores 1 all game. A game saved before that has none,
    // and finishes the way it began, with Places scoring double from round 4. tg: the Renown that wins this game. A
    // game saved when that was 30 has none, and still ends at 30. teams: who plays together, or none.)
    // (ord: the turns of this round in order, E.order(S); k: whose turn it is among them)
    const N = cfg.players.length, seats = () => cfg.players.map(() => ({ ko: 0, lines: 0, seals: 0, held: 0 }));
    G = { mode: cfg.mode, level: cfg.level, sc: 2, tg: S.cfg.target, teams: cfg.teams || null, players: cfg.players, S: S, ord: E.order(S), k: 0, ph: 'start', started: Date.now(), n: 0,
      stats: seats(), hist: [], seen: {}, tale: { links: [], seals: [], hold: [], tot: [], ko: cfg.players.map(() => ({})), outs: [] } };
    S.turn = G.ord[0]; setCols(N > 2 || cfg.teams ? cfg.players.map(p => p.color) : null);
    ui.view = G.mode === 'cpu' ? 0 : human(S.turn) ? S.turn : firstHuman(); ui.viewer = G.mode === 'cpu' ? 0 : -1; ui.banner = 0;
    if (S.su && S.su.step !== 'done') { G.ph = 'setup'; cfg.players.forEach((p, o) => { if (p.cpu) E.setupLay(S, o, E.setupPick(S, o, profOf(p, cfg.level), Math.random)); }); }
    Kit.gameStart(); save(); buildTable(); V = snap(); render();
    if (G.ph === 'setup') suBegin(); else beginTurn();
  }
  // ═══ Domains: the set-up (S.su) ═══
  // Each player draws four Domains, lays one face down at their Gate and one at their Outpost, keeps one as their offer
  // for the Crossroads, and puts the one left over under their stack (shown tucked under a card back once three are laid). Then the four turn up, each player rolls a die, the higher roll's offer is laid at
  // the Crossroads, and the other player takes the first turn. All of it happens on the table: the map's five rows
  // hold the slots, the hand holds the Domains drawn, and the two offers wait on either side of the Crossroads. A tap
  // picks a Domain up and a tap on a slot lays it (the last one lays itself); a tap on a laid one picks it up again,
  // and a second tap on one in the hand, or a hold, reads it. The engine's E.setupLay and E.setupRoll do the rest.
  const SU_SLOT = { gate: 0, out: 1 };
  function suBegin() {
    if (!G || G.ph !== 'setup') return;
    const my = gen, todo = G.players.map((p, o) => (!p.cpu && !S.su.lay[o] ? o : -1)).filter(o => o >= 0);
    if (ui.turbo || G.demo) { todo.forEach(o => E.setupLay(S, o, E.setupPick(S, o, null, Math.random))); return suRoll(); }
    if (!todo.length) return suRoll();
    const o = todo[0];
    ui.su = { o: o, put: {}, sel: null }; ui.view = o; setBusy(false);
    if (G.mode === 'local' && ui.viewer !== o) {
      ui.hideHand = true; ui.viewer = -1; render();
      Kit.handoff({ name: G.players[o].name, color: G.players[o].color, what: 'hand' }).then(() => { if (gen !== my) return; ui.hideHand = false; ui.viewer = o; render(); });
      return;
    }
    ui.hideHand = false; if (G.mode !== 'cpu') ui.viewer = o; render();
  }
  // a Domain as it lies on the map, with no Figures yet: its picture, its name and rule, its kind's frame and home
  function suTile(pk, cls, at) {
    const pi = C.PLACES[pk], AD = window.AnoriaDomains;
    const tile = el('button', { type: 'button', class: 'pl-tile su-t' + (cls ? ' ' + cls : ''), 'data-su': pk, 'aria-label': pi.n });
    const art = el('span', { class: 'pl-art' }, [el('span', { class: 'na' })]); const im = artImg(pk, true); if (im) art.appendChild(im); else art.style.setProperty('--kc', (AD && AD.KINDS[AD.kindOf(pk)] || {}).c || '#223');
    tile.appendChild(art);
    tile.appendChild(el('span', { class: 'pl-plate' }, [el('span', { class: 'pl-name' + (pi.n.length > 15 ? ' long' : ''), text: pi.n }), DSHORT[pi.pw] ? el('span', { class: 'pl-rule', text: DSHORT[pi.pw] }) : null]));
    if (AD) AD.tile(tile, { key: pk, reg: pi.reg });
    // (a power that does nothing where it is laid looks idle: Commerce and Greenwich at a Gate, Lisbon away from the
    // Crossroads, Citadelle Laferrière at a Gate, L'Anse aux Meadows on its own side: E.pw, and actions() for L'Anse)
    if ((at === 'gate' && (pi.d === 'Commerce' || pi.pw === 'clock' || pi.pw === 'citadel')) || ((at === 'gate' || at === 'out') && (pi.pw === 'monopoly' || pi.pw === 'landing'))) tile.classList.add('idle');
    return tile;
  }
  const suBack = cls => el('span', { class: 'su-back' + (cls ? ' ' + cls : ''), 'aria-label': 'A Domain laid face down' });
  // what the set-up shows the player whose side this is: what they have laid (put), what they have picked up (sel)
  function suCtx() {
    const v = ui.view, su = S.su, me = ui.su && ui.su.o === v && !ui.hideHand ? ui.su : null;
    return { v: v, su: su, me: me, put: me ? me.put : {}, sel: me ? me.sel : null, shown: su.step === 'done' };   // (shown: turned up, the dice are rolling)
  }
  function suDraw() { const X = suCtx(); rowsOrder().forEach(i => dom.map.appendChild(suRow(i, X))); suCapHand(X); }
  const suDrawN = () => suCapHand(suCtx());
  // (more players: the set-up on the table of spokes, drawN's layout with the set-up's slots in it)
  const suBoardN = T => drawN(T, suCtx());
  // A Domain's place at the set-up, on the rim: face down once its player has laid it, turned up with the dice
  function suRim(i, X, w, h) {
    const o = i >> 1, k = i & 1 ? 'Outpost' : 'Gate', wrap = el('div', { class: 'pl wn-t su', 'data-p': i });
    if (X.shown) return rimTile(i, NOT, w, h);
    wrap.appendChild(X.su.lay[o] ? el('span', { class: 'pl-tile su-slot face wn-small' }, [suBack('tile')])
      : el('span', { class: 'pl-tile su-slot dim wn-small', 'aria-label': Kit.poss(pname(o)) + ' ' + k }, [el('span', { class: 'su-lbl', html: k === 'Gate' ? '<span class="pl-gate" style="--gc:var(--pc' + o + ')">' + SVG.arch + '</span>' : '' })]));
    return wrap;
  }
  // one of the set-up's rows: a place to lay a Domain, or the Crossroads with the offers beside it (yours on the right;
  // with more players, everyone else's on the left)
  function suRow(i, X) {
    const v = X.v, t = many() ? (v + 1) % S.N : 1 - v, su = X.su, me = X.me, put = X.put, sel = X.sel, shown = X.shown;
    {
      const row = el('div', { class: 'pl su' + (many() ? ' wn-row' : ''), 'data-p': i, style: { '--pcL': 'var(--pc' + t + ')', '--pcR': 'var(--pc' + v + ')' } });
      const L = el('div', { class: 'pl-side L' }), R = el('div', { class: 'pl-side R' });
      let mid;
      if (i === 2 * S.N) {   // the Crossroads, with the two offers beside it
        mid = el('span', { class: 'pl-tile su-slot hub', 'aria-label': 'The Crossroads' }, [el('span', { class: 'su-lbl', text: 'The Crossroads' })]);
        const off = (o, side) => {
          const id = shown ? su.lay[o].offer : o === v ? put.offer : null;
          if (id) return el('span', { class: 'su-off', 'data-su': o === v && !shown ? id : null, style: { '--oc': 'var(--pc' + o + ')' } }, [cardEl(id, { mini: true, now: true })]);
          if (su.lay[o] && o !== v) return el('span', { class: 'su-off' }, [suBack()]);
          if (o === v && me) return el('button', { type: 'button', class: 'su-off empty' + (sel ? ' lit' : ''), 'data-slot': 'offer', 'aria-label': 'Your offer for the Crossroads' }, [el('span', { class: 'su-lbl', text: 'Your offer' })]);
          return el('span', { class: 'su-off empty dim' }, [el('span', { class: 'su-lbl', text: Kit.poss(pname(o)) + ' offer' })]);
        };
        if (many()) seatsFrom(v).slice(1).forEach(o => L.appendChild(off(o, 'L'))); else L.appendChild(off(t, 'L'));
        R.appendChild(off(v, 'R'));
      } else {
        const o = i >> 1, k = i & 1 ? 'out' : 'gate', said = (o === v ? 'Your ' : Kit.poss(pname(o)) + ' ') + (k === 'gate' ? 'Gate' : 'Outpost');
        const id = shown ? S.places[i] : o === v ? put[k] : null;
        if (id) mid = suTile(id, shown ? 'flip' : o === v ? 'placed' : '', k);
        else if (su.lay[o] && o !== v) { mid = el('span', { class: 'pl-tile su-slot face' }, [suBack('tile')]); }
        else if (o === v && me) mid = el('button', { type: 'button', class: 'pl-tile su-slot' + (sel ? ' lit' : ''), 'data-slot': k, 'aria-label': said }, [el('span', { class: 'su-lbl', html: (k === 'gate' ? '<span class="pl-gate" style="--gc:var(--pc' + o + ')">' + SVG.arch + '</span>' : '') + '<span class="su-lt">' + esc(said) + '</span>' })]);
        else mid = el('span', { class: 'pl-tile su-slot dim' }, [el('span', { class: 'su-lbl', html: (k === 'gate' ? '<span class="pl-gate" style="--gc:var(--pc' + o + ')">' + SVG.arch + '</span>' : '') + '<span class="su-lt">' + esc(said) + '</span>' })]);
      }
      row.appendChild(L); row.appendChild(mid); row.appendChild(R);
      return row;
    }
  }
  // the set-up's caption (what is being laid, and the button once all three are) and its hand (the Domains drawn)
  function suCapHand(X) {
    const v = X.v, su = X.su, me = X.me, put = X.put, sel = X.sel, shown = X.shown;
    const n = dom.cap; n.innerHTML = '';
    const full = me && put.gate && put.out && put.offer, next = G.players.some((p, o) => o !== v && !p.cpu && !su.lay[o]), N = S.N;
    n.appendChild(el('div', { class: 'cap-txt' + (me ? '' : ' dim'), text: shown || !me ? '' : full ? (next ? (N > 2 ? 'Your Domains lie face down until everyone has laid theirs.' : 'Your Domains lie face down until both of you have laid yours.') : (N > 2 ? 'The highest roll’s offer is the Crossroads.' : 'The higher roll’s offer is the Crossroads.')) : 'Lay three of your ' + ['', 'one', 'two', 'three', 'four', 'five'][su.drew[v].length] + ' Domains.' }));
    // the hand: the Domains drawn and not yet laid
    const h = dom.hand; h.innerHTML = '';
    if (me) su.drew[v].filter(id => id !== put.gate && id !== put.out && id !== put.offer).forEach(id => {
      // (once three are laid, the one left over turns face down and is tucked under a card back that stands for the stack:
      // it goes under the stack. Tim: "animate the unchosen domain card to flip face down as it is tucked under". It can
      // still be picked up, face up again, and laid in place of another)
      const tuck = full && sel !== id;
      if (!tuck) { h.appendChild(el('button', { type: 'button', class: 'hc' + (sel === id ? ' sel' : ' ok'), 'data-su': id, 'aria-label': C.PLACES[id].n }, [cardEl(id, { mini: true })])); return; }
      const go = me.tucked !== id; me.tucked = id;
      const c = el('button', { type: 'button', class: 'hc su-under', 'data-su': id, 'aria-label': C.PLACES[id].n + ', going under your stack' }, [el('span', { class: 'su-tk' }, [el('span', { class: 'su-tf' }, [cardEl(id, { mini: true })]), el('span', { class: 'su-tb' }, [suBack()])])]);
      h.appendChild(el('span', { class: 'su-stack' + (go ? ' go' : '') }, [c, suBack('stk')]));
      if (go) { setTimeout(() => Kit.sfx('flip', .5), 380); setTimeout(() => { Kit.sfx('deal', .5); Kit.haptic('light'); }, 820); }
    });
  }
  function suTap(e) {
    const me = ui.su; if (!me || ui.busy || ui.hideHand || G.ph !== 'setup' || S.su.step === 'done') return;
    const slot = e.target.closest('[data-slot]'), d = e.target.closest('[data-su]');
    if (slot && me.sel) {
      const k = slot.dataset.slot; me.put[k] = me.sel; me.sel = null;
      const left = S.su.drew[me.o].filter(id => id !== me.put.gate && id !== me.put.out && id !== me.put.offer), free = ['gate', 'out', 'offer'].filter(x => !me.put[x]);
      if (left.length === 1 && free.length === 1) me.put[free[0]] = left[0];   // (the last one lays itself)
      Kit.sfx('deal'); Kit.haptic('light'); render();
      const land = dom.root.querySelector('.pl-tile.placed[data-su="' + me.put[k] + '"], .su-off[data-su="' + me.put[k] + '"]'); if (land) land.classList.add('in');
      return;
    }
    if (!d) { if (me.sel) { me.sel = null; render(); } return; }
    const id = d.dataset.su, inHand = !!d.closest('.an-hand');
    if (inHand) { if (me.sel === id) { openView(id); return; } me.sel = id; Kit.sfx('tap'); Kit.haptic('light'); render(); return; }
    for (const k in me.put) if (me.put[k] === id) delete me.put[k];   // (a laid one is picked up again)
    me.sel = id; Kit.sfx('tap'); render();
  }
  function suDone() {
    const me = ui.su; if (!me || ui.busy) return;
    if (!E.setupLay(S, me.o, { gate: me.put.gate, out: me.put.out, offer: me.put.offer })) return;
    ui.su = null; save(); Kit.sfx('flip'); Kit.haptic('medium');
    suBegin();
  }
  async function suRoll() {
    const my = gen, su = S.su;
    if (!E.setupRoll(S, Math.random, G.demo && G.suDice ? G.suDice : undefined)) return;   // (a lesson rolls the dice it wants)
    const evs = S.ev.splice(0), first = su.first, dibs = su.dibs;
    G.ord = S.N > 2 ? E.order(S) : [first, 1 - first]; G.k = 0; S.turn = G.ord[0];
    G.log = G.log || []; G.log.push({ o: dibs, x: [Kit.poss(pname(dibs)) + ' offer, ', { k: '@' + S.places[2 * S.N] }, ', is the Crossroads, and ' + (pname(first) === 'You' ? 'you take' : pname(first) + ' takes') + ' the first turn.'] });
    if (ui.turbo || (G.demo && !G.suShow)) { G.ph = 'start'; save(); ui.su = null; V = snap(); render(); return beginTurn(); }   // (G.suShow: the Domains lesson shows the dice)
    setBusy(true); ui.su = null; if (G.mode === 'local') { ui.view = 0; ui.viewer = -1; ui.hideHand = false; }
    render(); Kit.sfx('flip'); Kit.haptic('medium'); await wait(900); if (gen !== my) return;
    // the dice: each offer with a die under it, rolled again while they tie
    const dup = evs.filter(e => e.t === 'dunder');
    if (dup.length) { const ws = dup.filter(e => e.id === dup[0].id).map(e => (pname(e.o) === 'You' ? 'You' : pname(e.o)));
      Kit.toast(S.N > 2 ? listOf(ws) + ' turned up ' + C.PLACES[dup[0].id].n + ', so each of them lays the next Domain from their stack instead.' : 'You both turned up ' + C.PLACES[dup[0].id].n + ', so each of you lays the next Domain from your stack instead.', 2600); await wait(1200); }
    if (S.N > 2) { if (!(await suDiceN(su, first, dibs))) return; }
    else {
    const sideOf = o => {
      const dn = Kit.die(1); dn.tabIndex = -1; dn.style.visibility = 'hidden';
      const n = el('div', { class: 'cl-side o' + o + ' ' + (o === ui.view ? 'R' : 'L') }, [el('div', { class: 'cl-card' }, [cardEl(su.lay[o].offer, { mini: true, now: true })]), el('div', { class: 'cl-nm', text: Kit.poss(pname(o)) + ' offer' }), el('div', { class: 'cl-sum' }, [dn]), el('div', { class: 'cl-note' })]);
      return { n: n, die: dn, card: n.querySelector('.cl-card'), note: n.querySelector('.cl-note') };
    };
    const X = [sideOf(0), sideOf(1)], Lx = X[1 - ui.view], Rx = X[ui.view], where = el('div', { class: 'cl-where', text: 'The Crossroads' });
    const ov = el('div', { class: 'clash su-roll' }, [el('div', { class: 'cl-in' }, [Lx.n, el('div', { class: 'cl-vs' }), Rx.n, where])]);
    document.body.appendChild(ov); void ov.offsetWidth; ov.classList.add('show'); await wait(500);
    for (let r = 0; r < su.rolls.length; r++) {
      const roll = su.rolls[r];
      X.forEach((x, o) => { x.die.setAttribute('data-v', roll[o]); x.die.setAttribute('aria-label', 'Die showing ' + roll[o]); x.die.style.visibility = ''; x.die.classList.remove('rolling'); void x.die.offsetWidth; x.die.style.setProperty('--dx', (o === ui.view ? 40 : -40) + 'px'); x.die.classList.add('rolling'); x.note.textContent = ''; });
      Kit.sfx('roll'); Kit.haptic('light'); await wait(900); if (gen !== my) return ov.remove();
      if (r < su.rolls.length - 1) { X.forEach(x => { x.note.textContent = 'A tie, so you both roll again'; }); Kit.sfx('tap'); await wait(1100); if (gen !== my) return ov.remove(); }
    }
    X[dibs].card.classList.add('win'); X[dibs].note.textContent = 'This is the Crossroads';
    X[1 - dibs].note.textContent = (pname(first) === 'You' ? 'You take' : pname(first) + ' takes') + ' the first turn';
    if (S.places[2 * S.N] !== su.lay[dibs].offer) where.textContent = C.PLACES[S.places[2 * S.N]].n + ' is laid instead, because ' + C.PLACES[su.lay[dibs].offer].n + ' is already on the table';
    Kit.sfx('good'); Kit.haptic('success'); await wait(1900); if (gen !== my) return ov.remove();
    ov.classList.remove('show'); await wait(260); ov.remove();
    }
    G.ph = 'start'; save(); V = snap(); render();
    const hub = dom.map.querySelector('.pl[data-p="' + 2 * S.N + '"] .pl-tile'); if (hub) hub.classList.add('su-land');
    Kit.sfx('deal'); await wait(700); if (gen !== my) return;
    if (G.demo) { setBusy(false); V = snap(); V.turn = -1; render(); const k = G.suDone; G.suDone = null; if (k) k(); return; }   // (a still table: nobody's turn has begun)   // (the lesson goes on from here, not into a turn)
    setBusy(false); beginTurn();
  }
  // The dice for the Crossroads with three or more players: everyone's offer with a die under it, in seat order from
  // your left with yours last; on a tie for the highest roll only those in the tie roll again (the others' dice stay
  // where they fell, dimmed), until one roll is highest. That offer is the Crossroads, and the player on its owner's
  // left takes the first turn.
  async function suDiceN(su, first, dibs) {
    const my = gen, seats = seatsFrom(ui.view).slice(1).concat([ui.view]);
    const cell = o => {
      const dn = Kit.die(1); dn.tabIndex = -1; dn.style.visibility = 'hidden';
      const n = el('div', { class: 'cl-side su-c o' + o, style: { '--pc': 'var(--pc' + o + ')' } }, [el('div', { class: 'cl-card' }, [cardEl(su.lay[o].offer, { mini: true, now: true })]), el('div', { class: 'su-nm', text: o === ui.view && human(o) ? 'Your offer' : Kit.poss(pname(o)) + ' offer' }), el('div', { class: 'cl-sum' }, [dn]), el('div', { class: 'cl-note' })]);
      return { o: o, n: n, die: dn, card: n.querySelector('.cl-card'), note: n.querySelector('.cl-note') };
    };
    const X = seats.map(cell), at = {}; X.forEach(x => { at[x.o] = x; });
    const where = el('div', { class: 'cl-where', text: 'The Crossroads' });
    const ov = el('div', { class: 'clash su-roll su-n n' + S.N }, [el('div', { class: 'cl-in' }, [where].concat(X.map(x => x.n)))]);
    document.body.appendChild(ov); void ov.offsetWidth; ov.classList.add('show'); await wait(500);
    for (let r = 0; r < su.rolls.length; r++) {
      const roll = su.rolls[r];
      X.forEach(x => { const d = roll[x.o]; x.note.textContent = ''; if (!d) { x.n.classList.add('out'); return; }
        x.die.setAttribute('data-v', d); x.die.setAttribute('aria-label', 'Die showing ' + d); x.die.style.visibility = ''; x.die.classList.remove('rolling'); void x.die.offsetWidth; x.die.style.setProperty('--dx', '30px'); x.die.classList.add('rolling'); });
      Kit.sfx('roll'); Kit.haptic('light'); await wait(900); if (gen !== my) { ov.remove(); return false; }
      if (r < su.rolls.length - 1) { const nx = su.rolls[r + 1], tied = X.filter(x => nx[x.o]);
        tied.forEach(x => { x.note.textContent = 'A tie for the highest, so roll again'; }); Kit.sfx('tap'); await wait(1200); if (gen !== my) { ov.remove(); return false; } }
    }
    X.forEach(x => { if (x.o !== dibs) x.n.classList.add('out'); });
    at[dibs].n.classList.remove('out'); at[dibs].card.classList.add('win'); at[dibs].note.textContent = 'This is the Crossroads';
    where.textContent = (pname(first) === 'You' ? 'You take' : pname(first) + ' takes') + ' the first turn';
    if (S.places[2 * S.N] !== su.lay[dibs].offer) where.textContent = C.PLACES[S.places[2 * S.N]].n + ' is laid instead, because ' + C.PLACES[su.lay[dibs].offer].n + ' is already on the table';
    Kit.sfx('good'); Kit.haptic('success'); await wait(1900); if (gen !== my) { ov.remove(); return false; }
    ov.classList.remove('show'); await wait(260); ov.remove();
    return true;
  }
  function restore(d) {
    stop(); G = d.G; S = G.S; S.cfg = cfgStd(); S.st = null; S.ev = []; G.players.forEach(deckOf); G.seen = G.seen || {};
    if (!(G.sc >= 2)) S.cfg.ramp = [1, 1, 1, 2, 2, 2];   // (a game begun under the old scoring keeps it to the end)
    S.cfg.target = G.tg || E.OLD_TARGET;                 // (and it ends at the Renown it was begun under: 30 before 2026-11-11)
    if (G.teams) S.cfg.teams = G.teams;                  // (who plays together: S.tm came back with the state)
    if (!Array.isArray(G.ord) || !G.ord.length) G.ord = E.order(S);
    ui.view = G.mode === 'cpu' ? 0 : human(S.turn) ? S.turn : firstHuman(); ui.viewer = G.mode === 'cpu' ? 0 : -1; ui.banner = S.round;
    setCols(S.N > 2 || G.teams ? G.players.map(p => p.color) : null);
    buildTable(); V = snap(); render(); if (G.ph === 'setup') suBegin(); else beginTurn();
  }
  // What's on the table right now, as the screen shows it. Playing back the engine's log moves this along
  // one event at a time; settle() brings it level with the engine again.
  function snap() {
    return { round: S.round, turn: S.turn,
      figs: S.figs.map(f => ({ u: f.u, c: f.c, o: f.o, p: f.p, rdy: f.rdy, arr: f.arr, acted: f.acted, stun: f.stun, hush: f.hush || 0, li: f.li, m: E.might(S, f, 0) })),
      P: S.P.map(p => ({ hand: p.hand.slice(), deck: p.deck.length, relics: p.relics.slice(), guide: p.guide, spark: p.spark, reserve: p.reserve, renown: p.renown, seals: p.seals, sm: p.sm || 3, uA: p.uA, uT: p.uT, uC: p.uC, uD: p.uD, uN: p.uN, uM: p.uM, uW: p.uW, uR: p.uR, sg: (p.sg || 0) + Math.max(0, p.sb || 0), debt: p.debt || 0 })),
      tot: S.places.map((x, i) => E.mights(S, i)), hold: S.places.map((x, i) => E.holder(S, i)), pb: S.pb.map(x => x.slice()), dip: (S.dip || []).map(d => Object.assign({}, d)), mk: S.mk ? S.mk.slice() : null };
  }
  function settle() {
    const old = V; V = snap(); render();
    if (!old) return;
    const om = {}; old.figs.forEach(f => { om[f.u] = f.m; });
    V.figs.forEach(f => { if (om[f.u] != null && om[f.u] !== f.m) { const n = dom.map.querySelector('.fp[data-u="' + f.u + '"] .fp-m'); if (n) n.classList.add('bump'); } });
  }

  // ═══ Drawing the table ═══════════════════════════════════════════════════════════════════════════════════
  // An old chart of the world, engraved faintly into the mat (the coastlines, thinned out)
  let chartURL = null;
  function chart() {
    if (chartURL != null) return chartURL;
    let d = '';
    for (const r of LAND) { if (r.length < 80) continue; for (let j = 0; j < r.length; j += 12) d += (j ? 'L' : 'M') + (r[j] + 180).toFixed(1) + ' ' + (90 - r[j + 1]).toFixed(1); d += 'Z'; }
    let g = ''; for (let x = 0; x <= 360; x += 30) g += 'M' + x + ' 0V180'; for (let y = 0; y <= 180; y += 30) g += 'M0 ' + y + 'H360';
    try { chartURL = d ? URL.createObjectURL(new Blob(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="20 8 320 150" preserveAspectRatio="xMidYMid slice"><path d="' + g + '" fill="none" stroke="#e9cf86" stroke-width=".25" stroke-dasharray="1.2 1.8" opacity=".5"/><path d="' + d + '" fill="#e9cf86" fill-opacity=".1" stroke="#e9cf86" stroke-width=".45" stroke-linejoin="round"/></svg>'], { type: 'image/svg+xml' })) : ''; } catch (e) { chartURL = ''; }
    return chartURL;
  }
  // ── Play mats ──
  // Each player's side of the map (their Gate, their Outpost and their half of the Crossroads) lies on a mat of
  // their own, and the two mats meet edge to edge in a seam under the Crossroads, as the mats do in Lorcana. In pass
  // and play the other player's mat is turned to face them. A player's mat is their Guide's, unless they have chosen
  // another (matPicker; the choice is anoria_mat, which follows the account).
  // The pictures are ui/mats/<id>.webp: printed cloth in the cards' own inked style, each true to its Guide's world.
  // A mat for a new Guide is one line here and its picture. Until a Guide has one, that Guide plays on the chart
  // of Anoria in their own colour.
  //   n: the mat's name, c: its cloth (shown until the picture has come), th: the thread its edge is bound with,
  //   d: how far the print is dimmed so the pieces stay the brightest things on it (0 to 1; .2 if not given),
  //   fill: the picture is stretched to the mat's shape, not cropped (a pattern with borders that should all show)
  // What each mat draws was checked against a text that could be read (2026-11-11), where one could be:
  //   genghis: the lattice of interlaced sticks, the roof poles meeting in a hoop and the felt worked with vines and
  //     trees are William of Rubruck's account of 1253 (Rockhill's translation, 1900); the white standard with nine
  //     tails is the Secret History, section 202 (how it was made is not recorded: the row of nine is the picture's own)
  //   curie: the shed, the glow of the bottles and capsules at night and the piezo-electric quartz electrometer are
  //     in her own book, Pierre Curie (1923), which names the three instruments of the measuring set-up: a Curie
  //     electrometer, a piezo-electric quartz and an ionization chamber of two plates one above the other. Her thesis
  //     (Radio-active Substances, 1904) has the quartz stretched by 'placing weights in a plate'; Eve Curie, Madame
  //     Curie (1938), has the glass receivers' 'phosphorescent bluish outlines'. Redrawn 2026-11-12: the first mat's
  //     glow was green (the colour of later radium paint) and its weighing pan stood on the base instead of hanging
  //     from the quartz, so the balance could not have worked; its arc-scale instrument was nothing the Curies used
  //   lincoln: the compass and chain, the rails and the axe are in his own account of his life (1860); the telegraph
  //     is Bates, Lincoln in the Telegraph Office (1907)
  //   mandela: the valley, the stream, the hills, the three huts and the maize at Qunu are as Long Walk to Freedom
  //     describes them (read in quotation only); the beadwork's white and blue and the aloes rest on memory
  //   gandhi: the spinning wheel found at Vijapur, the slivers and khadi are his autobiography; the salt at Dandi
  //     was read in summaries only. The wheel is the traditional charkha: two stars of spokes with cord laced
  //     between their tips for a rim and no solid hoop (the first picture drew a solid wooden rim, and Tim had it redrawn)
  //   The first five: Franklin's kite of two cedar strips with a tail and a key is his own letter of 1752 (the kite
  //     was silk); Tubman's North Star is Bradford (1869); Leonardo's knots, solids and red chalk are in Muntz (1898);
  //     the lotus and papyrus are Owen Jones (1856); bamboo slips strung into books and the thunder scroll are
  //     Bushell (1904). What rests on memory is listed in CLAUDE.md. Checked 2026-11-12:
  //     tubman: the marsh and the pines are Shreve, The Plant Life of Maryland (1910): marshland 'as in southern
  //       Dorchester County', a stream swamp on the Little Blackwater near Cambridge, and the Loblolly Pine dominant
  //       in Dorchester's forest
  //     leonardo: Richter, The Literary Works of Leonardo da Vinci (1883): the red chalk drawings and the 'silver point
  //       on reddish paper' at Windsor, and his note that the surface of water 'resembles that of hair' and 'forms
  //       eddying whirlpools'. Redrawn 2026-11-12: the first mat's water was breaking waves with clawed foam crests, like
  //       a Japanese woodblock wave; it is now his study of a stream falling into a pool and curling into eddies
  //     cleopatra: Owen Jones (1856), Egyptian Plate X: the running spiral 'arranged like an S' on tomb ceilings
  //     suntzu: two cords is the usual binding of a bamboo book (Dao Companion to the Excavated Guodian Bamboo
  //       Manuscripts, Springer 2019: 'two cords would have connected the slips in one bundle', and short slips 'bound
  //       with three rather than two strings' are the exception); what the Yinqueshan Sunzi slips had could not be read
  //   The seven of the roster of twelve (2026-11-12), what each draws and where it can be read:
  //   shakespeare: Shakespeare's England (Oxford, 1917), vol. 1, Agriculture and Gardening: the 'curious-knotted garden' (Love's Labour's Lost I.i) of box-edged beds laid out with mathematical precision, with Thomas Hill's 'proper knotte'; honeysuckle and 'pansies, that's for thoughts' in its list of Shakespeare's flowers; Desdemona's handkerchief embroidered with strawberries (Othello III.iii). The acorn border: Thomas Trevelyon's pattern book of 1608 (Folger MS V.b.232; Hough, 'Drawen Workes', 2020) has 'oak leaves and acorns', 'acorns, strawberries, leaves' and honeysuckle with acorns among London's embroidery patterns of the day.
  //   joan: Murray, Jeanne d'Arc, Maid of Orleans (1902), the trial record: 'a banner of which the field was sprinkled with lilies ... it was white, of the white cloth called boccassin ... fringed with silk'; the arms granted to her brothers: 'a shield azure, two fleurs-de-lys of gold, and a sword betwixt', the sword argent, point upward, surmounted by a gilded crown. Left out on purpose: the world, the two angels and 'Jhesus Maria' she also described on it (no figures, no lettering). The lily-powdered field is the trial's own 'sprinkled with lilies'. The forked end: Gordon, Flags of the World (1915), p. 223, draws her banner long and swallow-tailed; her own words give no shape, so the fork is how her standard has been drawn, not a record.
  //   saladin: Nur al-Din's carved cedar pulpit, which Saladin set up in the Aqsa Mosque in 1187, and the Horns of Hattin above the Lake of Galilee with Hermon snow-streaked to the north and the dry scrub burning, as Lane-Poole, Saladin and the Fall of the Kingdom of Jerusalem (1898), describes the field (the citadel tower of the first mat rested on memory, and Tim had it redrawn). The pulpit's carving: Baedeker, Palestine and Syria (1898), 'beautifully carved in wood ... inlaid with ivory and mother-of-pearl', made at Aleppo in 1168; Auld, 'The Minbar of Nur al-Din in Context', in Hillenbrand and Auld, Ayyubid Jerusalem (2009): star-polygons with eight points round a boss, hexagons between, carved arabesque insets, small stars and squares of ivory or bone. (The mat's small inlays are faint turquoise, not ivory white: a small liberty, left as it is.)
  //   wuzetian: Stein, Innermost Asia (1928), vol. 1: silks of the sixth to eighth centuries framing animals, 'single or in pairs, within medallion borders decorated with discs', pairs of confronting creatures woven by turning the pattern over, and a tree between the pair; earlier Chinese silks with a pair of phoenixes. The phoenix as hers: her Ming-t'ang of 688 at Luoyang was crowned with 'an iron phoenix, ten feet high' (Soper, 'The Dome of Heaven in Asia', The Art Bulletin, December 1947, from the T'ang records). The flower rosette rests on memory.
  //   akbar: Smith, The Moghul Architecture of Fathpur-Sikri (Archaeological Survey of India, 1894), the Turkish Sultana's house: carved red sandstone dado panels, one 'a garden walk ... in the centre is the cypress partly hidden by the branches of an almond tree', another with the pomegranate; and the 'red sandstone jali windows' and pierced stone screens. The exact lattice of the jali is the picture's own.
  //   mansamusa: Dubois, Timbuctoo the Mysterious (1896, trans. 1897): Kankan Musa 'presented the Cathedral Mosque with a minaret of pyramidal form' (the minarets look like 'abbreviated pyramids'); native gold 'in rings', gold-dust, and the salt of Taghaza traded for gold. The wooden toron in the minaret rest on memory: Dubois does not mention them, and Caillie (Travels through Central Africa to Timbuctoo, 1830, vol. 2), who climbed the great mosque's tower, gives its plan, buttresses and inner stair but not them. Musa's own tower is long gone, so the toron are the look of the mosque as it stands.
  //   sorjuana: Her own Respuesta a Sor Filotea (1691), printed in Fama y obras posthumas (Madrid, 1700): she watched girls spin a top, had flour brought and sifted, and found that the top traced 'not perfect circles but spiral lines'. The tiles: Barber, The Maiolica of Mexico (1908), Puebla maiolica of 1650 to 1700 painted in blue, the 'white medallion variety with conventionalized floral decorations', used for convent dados. The quill and book are general.
  const MATK = 'anoria_mat', MATSRC = 'anoria/ui/mats/';
  const MATS = {
    cleopatra: { n: 'Papyrus and lotus', c: '#113c3d', th: '#a98c4e', d: .3 },
    leonardo: { n: 'A sheet of studies', c: '#6b3122', th: '#b98a66', d: .24 },
    tubman: { n: 'The North Star', c: '#151d36', th: '#7484ab', d: .04 },
    franklin: { n: 'The printing house', c: '#33271d', th: '#a5834a', d: .1 },
    suntzu: { n: 'Bamboo slips', c: '#45401f', th: '#8d8a58', d: .22, fill: true },
    genghis: { n: 'The felt tent', c: '#2b2520', th: '#9a8663', d: .06 },
    curie: { n: 'The laboratory shed', c: '#1c1627', th: '#857f9c', d: 0 },
    lincoln: { n: 'Rails and wire', c: '#172039', th: '#9a8a68', d: .08 },
    mandela: { n: 'The valley at Qunu', c: '#12161f', th: '#9aa5bb', d: .14 },
    gandhi: { n: 'Homespun and salt', c: '#54493b', th: '#b9aa8c', d: .34 },
    shakespeare: { n: 'The knot garden', c: '#1c2219', th: '#8f8a5c', d: 0.18 },
    joan: { n: 'The Maid\'s standard', c: '#0e1821', th: '#a8894a', d: 0.3 },
    saladin: { n: 'Cedar and Hattin', c: '#2e2716', th: '#a68a4c', d: 0.2 },
    wuzetian: { n: 'Phoenix silk', c: '#341112', th: '#a9804e', d: 0.05 },
    akbar: { n: 'Red sandstone', c: '#401e1b', th: '#b08a6a', d: 0.04 },
    mansamusa: { n: 'Gold and salt', c: '#372717', th: '#b08d4a', d: 0.12 },
    sorjuana: { n: 'The top in the flour', c: '#151d28', th: '#8c97ad', d: 0.35 },
    chart: { n: 'The chart of Anoria', c: '#1b2850', th: '#a9853d', d: 0, chart: true }
  };
  const matPics = {};   // (each mat's picture is made once for each place it lies and kept, so a mat is never loaded twice)
  // A mat can also be made from a card's picture, placed anywhere on it by hand, with a cloth of the player's choosing
  // in the part the picture leaves empty (matkit.js, which Lorcana's mats use too). Such a choice is MatKit's value:
  // {k: 'art', c: the card's key, x, y, s, f, col, ...}. The picture is the card's full-size one.
  const MK = window.MatKit;
  const hasCard = k => !!(CARDS[k] || TXG[k] || C.PLACES[k]);
  // a stored choice as the table uses it: '' (the Guide's mat), a mat's id, or a picture mat
  function matRead(raw) {
    if (!raw) return '';
    if (typeof raw === 'string' && MATS[raw]) return raw;
    const v = MK ? MK.read(raw) : null;
    return v && hasCard(v.c) ? v : '';
  }
  const matStore = pick => typeof pick === 'object' && pick ? MK.str(pick) : pick || '';
  // the cloth colour and the dimming a card's picture asks for, read from the picture once
  const toneOf = {};
  function matTone(key, done) { if (toneOf[key]) { done(toneOf[key]); return; } MK.tone([artSrc(key, true)], null, t => { if (t) toneOf[key] = t; done(t); }); }
  // lay a mat on a node: a Guide's key, 'chart', a Guide who has no mat yet, or a picture mat; slot says which copy of a picture
  function matFill(n, id, slot) {
    if (typeof id === 'object' && id) {
      Array.prototype.slice.call(n.children).forEach(c => { if (!c.classList.contains('mk-lay')) c.remove(); });
      n.style.setProperty('--mc', id.col); n.style.setProperty('--mth', 'color-mix(in srgb,' + id.col + ' 40%,#cdbb8c)'); n.style.setProperty('--md', 0);
      MK.paint(n, id, { url: artSrc(id.c, false), small: typeof slot === 'string' && slot.charAt(0) === 's' });
      return;
    }
    if (MK) MK.clear(n);
    const m = MATS[id], g = TXG[id], plain = !m || m.chart;
    n.style.setProperty('--mc', m ? m.c : g ? 'color-mix(in srgb,' + FAC[g.f].c + ' 46%,#0b1124)' : MATS.chart.c);
    n.style.setProperty('--mth', m ? m.th : MATS.chart.th); n.style.setProperty('--md', m && m.d != null ? m.d : plain ? 0 : .2);
    n.innerHTML = '';
    if (plain) { const i = el('i', { class: 'pm-art chart' }); if (chart()) i.style.backgroundImage = 'url("' + chart() + '")'; n.appendChild(i); return; }
    const k = id + '/' + slot; let im = matPics[k];
    if (!im) {
      im = matPics[k] = el('img', { class: 'pm-art' + (m.fill ? ' fill' : ''), alt: '', draggable: 'false', decoding: 'sync' });
      im.onerror = () => { im.remove(); delete matPics[k]; };
      im.src = MATSRC + id + '.webp';
      // (a picture still on its way fades in over its cloth once; one that is here already is simply there)
      if (!(im.complete && im.naturalWidth)) { im.classList.add('wait'); im.onload = () => im.classList.remove('wait'); }
    }
    n.appendChild(im);
  }
  // The account's own choice (anoria_mat), read once and again only when the stored text has changed. While a hand
  // is moving a picture in the editor, `live` is what the table shows; it is stored when the hand lets go.
  const mine = { raw: undefined, v: '', live: null }, seatMat = [{}, {}, {}, {}, {}, {}];
  function matMineV() { const raw = lsGet(MATK); if (raw !== mine.raw) { mine.raw = raw; mine.v = matRead(raw); } return mine.live || mine.v; }
  function matSeatV(o) { const c = seatMat[o], raw = G.players[o].mat; if (c.raw !== raw) { c.raw = raw; c.v = matRead(raw); } return c.v; }
  // (at the setup: your own mat's picture is fetched ahead, so it is there when the cards are dealt)
  // (a moment later the other Guides' mats too, for whichever one the other player turns out to have)
  const warmed = {};
  const warmSrc = src => { if (!warmed[src]) { warmed[src] = new Image(); warmed[src].src = src; } };
  const matWarm = () => { const v = matMineV(), id = v || (Coll.deck(starterId()) || {}).guide; if (typeof id === 'object') warmSrc(artSrc(id.c, false)); else if (MATS[id] && !MATS[id].chart) warmSrc(MATSRC + id + '.webp');
    setTimeout(() => Object.keys(MATS).forEach(k => { if (!MATS[k].chart) warmSrc(MATSRC + k + '.webp'); }), 900); };
  // the seat whose choice of mat is the account's own: the first person at the table
  const matMine = o => !G.players[o].cpu && o === (G.players[0].cpu ? 1 : 0);
  const matPick = o => G.demo || G.players[o].cpu ? '' : matMine(o) ? matMineV() : matSeatV(o);
  // the mat a seat plays on: the one that person chose, or their Guide's
  const matOf = o => matPick(o) || S.P[o].guide;
  // The other player's mat is turned to face them only when two people sit at one device (pass and play). Against
  // the computer nobody sits across the table, and a picture upside down reads badly, so that mat stays upright.
  const matTurned = () => !!G && G.mode === 'local' && !G.demo;
  // The two mats are part of the table that is built once: a step of the game never draws them again. Each stays
  // with its player; when the view changes hands (pass and play) the two change places, with the board.
  function paintMats() {
    if (!dom.pm || !G || !S) return;
    if (many()) { (dom.nm || []).forEach((n, o) => { if (n && o < S.N) matN(o); }); return; }   // (more players: each spoke's own mat, matN)
    for (let o = 0; o < 2; o++) {
      const n = dom.pm[o], pick = matOf(o), side = o === ui.view ? 'bot' : 'top', cls = 'an-pm ' + side + (side === 'top' && matTurned() ? ' turn' : '');
      if (n._pick !== pick) { n._pick = pick; n.dataset.m = typeof pick === 'object' ? 'art:' + pick.c : pick; matFill(n, pick, o); }
      if (n.className !== cls) n.className = cls;
    }
  }
  function buildTable() {
    app.className = 'an-on'; app.innerHTML = ''; window.scrollTo(0, 0);
    preload(S.places.concat(S.su ? [].concat.apply([], S.su.drew) : []).filter(x => x).concat(S.P.map(p => p.guide), G.players.reduce((a, p) => a.concat(deckOf(p).cards), [])));
    dom.opp = el('div', { class: 'an-strip opp' }); dom.me = el('div', { class: 'an-strip me' });
    dom.map = el('div', { class: 'an-map', onclick: onMapTap }); dom.cap = el('div', { class: 'an-cap' }); dom.hand = el('div', { class: 'an-hand', onclick: onHandTap });
    holdToScan(dom.map, scanAt); holdToScan(dom.hand, scanAt); dom.map.addEventListener('pointerdown', dragDown); dom.hand.addEventListener('pointerdown', dragDown);
    dom.fx = el('div', { class: 'an-fx' });
    if (!dom.pm) dom.pm = [0, 1].map(() => el('div', { class: 'an-pm' }));   // (the same two mats from one table to the next)
    if (!many()) paintMats();   // (with more players each spoke lies on its player's mat: matN)
    // (the round track lies along the edge of the map that faces the caption: domains.js)
    dom.track = window.AnoriaDomains ? window.AnoriaDomains.track(null, { max: S.cfg.rounds }) : null;
    // (two players: the button for the turn, End turn, Next, Roll the dice, stands in the dock beside the caption: .an-go)
    dom.go = el('div', { class: 'an-go' });
    const felt = el('div', { class: 'an-felt felt-in' + (dom.track ? ' has-trk' : '') + (many() ? ' many' + (G.teams ? ' teams' : '') : '') }, [el('div', { class: 'an-mats', 'aria-hidden': 'true' }, dom.pm), dom.track, dom.opp, dom.map, dom.cap, dom.go, dom.me, dom.hand]);
    dom.felt = felt;
    if (chart()) felt.style.setProperty('--chart', 'url("' + chart() + '")');
    dom.root = el('div', { class: 'an k-hold' }, [el('div', { class: 'an-mat wood' }, [felt]), dom.fx]);
    if (many() || G.teams) G.players.forEach((p, o) => { if (p.color) dom.root.style.setProperty('--pc' + o, p.color); });   // (each seat's colour: setCols)
    app.appendChild(dom.root);
  }
  // The two-player table, A3 "the battle line" (Tim, 2026-11-13): on an iPad, or any screen wider than tall, the five
  // Domains lie in a row across the table, your Gate at the far left and the other player's at the far right, with
  // your mat under the left half and theirs under the right; their Figures stand above the line, yours below it.
  // A phone held upright stands the line on its end, their Gate at the top (rows). Upright on an iPad the Figures
  // overlap down the table in cascades (up); sideways on a phone each side's Figures at a Domain are one stack (short).
  // Decided from the window every time the table is drawn, so a turned iPad redraws in its new shape.
  function layMode() {
    const W = window.innerWidth, H = window.innerHeight;
    if (W <= H && Math.min(W, H) < 600) return { rows: true, phone: true };
    return { ln: true, up: W <= H, short: H < 520 };
  }
  const rowsOrder = () => { const v = ui.view, t = 1 - v; return ui.lay && ui.lay.ln ? [2 * v, 2 * v + 1, 4, 2 * t + 1, 2 * t] : [2 * t, 2 * t + 1, 4, 2 * v + 1, 2 * v]; };
  const idle = () => !!G && !G.over && !ui.busy && G.ph === 'play' && human(S.turn) && ui.viewer === S.turn && !ui.hideHand && (!G.demo || ui.demoIdle);

  function stripEl(node, o, me) {
    const p = V.P[o], pl = G.players[o], g = TXG[p.guide], on = V.turn === o && !G.over;
    node.className = 'an-strip ' + (me ? 'me' : 'opp') + ' p' + o + (on ? ' on' : ''); node.innerHTML = ''; node.dataset.o = o;
    const spent = (on && ((p.guide === 'tubman' && p.uT) || (p.guide === 'suntzu' && p.uC) || (p.guide === 'franklin' && p.uD) || (p.guide === 'saladin' && p.uR) || (p.guide === 'curie' && p.uN >= 3 && p.uN < 9))) || (p.guide === 'mandela' && p.uM) || (p.guide === 'shakespeare' && p.uW);   // (a once-a-turn power, used; Mandela's and Shakespeare's are once a round)
    const gb = el('button', { type: 'button', class: 'st-guide' + (spent ? ' used' : ''), 'aria-label': g.n + ', ' + Kit.poss(pl.name) + ' Guide', style: { '--f': FAC[g.f].c }, onclick: () => { if (G.demo) openView(p.guide); else scan({ side: o, key: p.guide }); } }, [el('span', { class: 'na', text: g.n.charAt(0) })]);
    const gi = artImg(p.guide, true); if (gi) gb.appendChild(gi);
    node.appendChild(gb);
    const sm = p.sm || 3, seals = el('div', { class: 'st-seals', 'aria-label': p.seals + ' of ' + sm + ' Seals left' });   // (Lincoln begins with four)
    for (let i = 0; i < sm; i++) seals.appendChild(el('span', { class: 'seal' + (i >= p.seals ? ' broken' : '') + (ui.crack && ui.crack.o === o && ui.crack.i === i ? ' crack' : '') + (ui.press && ui.press.o === o && ui.press.i === i ? ' press' : '') }));
    const relics = el('div', { class: 'st-relics' });
    const T = me ? targets() : null;
    for (let i = 0; i < 2; i++) {
      const r = p.relics[i];
      if (r) { const b = el('button', { type: 'button', class: 'relic' + (E.fxOf(r) === 'antikythera' && p.uA && on ? ' used' : ''), 'aria-label': info(r).n, 'data-relic': r, onclick: () => { if (G.demo) openView(r); else scan({ side: o, key: r }); } }); const im = artImg(r, true); if (im) b.appendChild(im); else b.appendChild(el('span', { class: 'relic-nm', 'aria-hidden': 'true', text: info(r).n.replace(/^The /, '').charAt(0) })); relics.appendChild(b); }   // (a Relic with no picture yet shows its initial)
      else {
        const tg = me && T.done.length && ui.sel && ui.sel.kind === 'hand' && CARDS[ui.sel.key].t === 'relic' && i === p.relics.length;
        relics.appendChild(el(tg ? 'button' : 'span', { class: 'relic empty' + (tg ? ' tgt' : ''), 'data-slot': i, type: tg ? 'button' : null, 'aria-label': tg ? 'Play the Relic here' : null, onclick: tg ? () => finishPick(T.done) : null }));
      }
    }
    // the Deeds this player has in play until the count, after the Relics: each its picture with the Deed's scroll on it
    // (Tim, 2026-11-12: "we might also need board space for deeds in play")
    const dips = (V.dip || []).filter(d => d.o === o), dipEl = dips.length ? el('div', { class: 'st-dip', 'aria-label': dips.length + (dips.length > 1 ? ' Deeds' : ' Deed') + ' in play until the count' }, dips.map(d => {
      const b = el('button', { type: 'button', class: 'relic dip', 'aria-label': info(d.c).n + ', in play until the count', 'data-dip': d.c, onclick: () => openView(d.c) }); const im = artImg(d.c, true); if (im) b.appendChild(im);
      b.appendChild(el('i', { class: 'dip-m', html: MARK.deed })); return b; })) : null;
    const spark = on ? p.spark : p.reserve + (p.sg || 0);   // (not their turn: the Spark held back, and the 1 Empress Wu has coming)
    const sp = el('div', { class: 'st-spark' + (spark ? '' : ' zero'), 'aria-label': spark + ' Spark' }, [el('b', { text: String(spark) })]);
    if (me && ui.sel && ui.sel.kind === 'hand' && idle()) {
      const cost = selCost(); if (cost != null) sp.appendChild(el('span', { class: 'pay' + (cost > p.spark ? ' no' : ''), text: '−' + cost }));
    }
    node.appendChild(el('div', { class: 'st-top' }, [
      el('div', { class: 'st-name' }, [el('i'), pl.cpu ? el('span', { class: 'bot', html: Kit.icon('bot') }) : null, el('span', { class: 'nm', text: pl.name })]),
      // (in a team game the track is the team's Renown together, toward the team's target; the wreath is the player's own)
      el('div', { class: 'st-ren', 'aria-label': p.renown + ' Renown' + (G.teams ? ', and ' + tren(o) + ' for the team, of ' : ' of ') + S.cfg.target }, [el('div', { class: 'st-track', style: { '--r': Math.min(S.cfg.target, G.teams ? tren(o) : p.renown), '--tg': S.cfg.target } }, [el('i')]), el('div', { class: 'lau' }, [el('b', { text: String(p.renown) })])])]));
    if (G.teams) node.appendChild(el('i', { class: 'wn-tm', style: { '--tc': teamCol(o) }, 'aria-label': 'Team ' + teamName(o) }));
    node.appendChild(el('div', { class: 'st-bot' }, [seals, relics, dipEl,
      me && !ui.hideHand ? null : el('div', { class: 'st-hand', 'aria-label': p.hand.length + ' cards in hand' }, [el('b', { text: String(p.hand.length) })]),
      el('span', { class: 'st-fill' }), sp]));
    if (me) {
      let b;
      if (G.over) b = el('button', { type: 'button', class: 'btn btn-primary btn-sm st-go', text: 'Results', onclick: () => showWin(true) });
      else if (ui.pend) {   // (a choice of Domain: the button lays none, where the choice allows it)
        const P = ui.pend, can = P.acts.some(a => a.no);
        b = can ? el('button', { type: 'button', class: 'btn btn-primary btn-sm st-go st-su', text: 'Lay no Domain', onclick: () => { Kit.sfx('tap'); setBusy(true); P.res({ t: 'dom', no: 1 }); } }) : el('span', { class: 'st-go-none' });
      }
      else if (G.ph === 'setup') {   // (the set-up: once all three Domains are laid, the dice, or the device to the next player)
        const su = ui.su, full = su && su.o === o && su.put.gate && su.put.out && su.put.offer, next = G.players.some((q, x) => x !== o && !q.cpu && !S.su.lay[x]);
        b = S.su.step === 'done' || !su ? el('span', { class: 'st-go-none' }) : el('button', { type: 'button', class: 'btn btn-primary btn-sm st-go st-su' + (full ? ' ready' : ''), text: next ? 'Hand over' : 'Roll the dice', disabled: !full, onclick: suDone });
      }
      else if (!human(S.turn) && stepOn() && !ui.turbo && !G.demo) b = el('button', { type: 'button', class: 'btn btn-primary btn-sm st-go' + (ui.ack ? ' ready' : ''), text: 'Next', disabled: !ui.ack, 'aria-label': ui.ack ? 'Next: let ' + pname(S.turn) + ' make the next move' : pname(S.turn) + ' is playing', onclick: () => { Kit.sfx('pop'); Kit.haptic('light'); ackGo(); } });
      else if (!human(S.turn)) b = el('button', { type: 'button', class: 'btn btn-sm st-go ' + (speed > 1 ? 'btn-primary' : 'btn-soft'), 'aria-label': 'Fast forward', 'aria-pressed': String(speed > 1), html: SVG.ff, onclick: toggleFast });
      else {
        const can = idle() && !ui.discard, nothing = can && !ui.acts.length;
        b = el('button', { type: 'button', class: 'btn btn-primary btn-sm st-go' + (nothing ? ' ready' : ''), text: 'End turn', disabled: !can, onclick: () => { Kit.sfx('pop'); Kit.haptic('medium'); endTurn(); } });
      }
      // (two players: in the dock, beside the caption; with more players it stays at the end of the strip)
      if (many() || !dom.go) node.appendChild(b); else { dom.go.innerHTML = ''; dom.go.appendChild(b); }
    }
  }

  // A Figure on the map. With two players it is the card itself (Tim, 2026-11-13, A3: "real readable cards"), edged in
  // its player's colour, with a tab on the side that faces the line, since the mat no longer says whose it is; its
  // Might as it stands now is on its spine. With more players your rows keep the pieces (picture and Might).
  function figEl(f, T, asCard) {
    const c = CARDS[f.c], fac = FAC[c.f], mine = f.o === V.turn, pl = C.PLACES[S.places[f.p]];
    const can = idle() && mine && !ui.sel && ui.acts.some(a => a.u === f.u && (a.t === 'walk' || a.t === 'clash' || a.t === 'antik' || a.t === 'tub'));   // (while something is picked up, only where it can go is lit)
    const done = mine && !G.over && !f.rdy && !(f.arr && !f.acted);
    const sel = ui.sel && ui.sel.kind === 'fig' && ui.sel.u === f.u, tg = T.figs[f.u];
    const picked = ui.sel && ui.sel.picks.some(p => p.k === 'f' && p.v === f.u);
    const insp = ui.sel && ui.sel.kind === 'hand' && CARDS[ui.sel.key].insp && f.o === S.turn && CARDS[ui.sel.key].insp.indexOf(f.c) >= 0;
    const n = el('button', { type: 'button', class: 'fp o' + f.o + (can ? ' can' : '') + (done ? ' done' : '') + (f.stun ? ' stun' : '') + (sel || picked ? ' sel' : '') + (tg ? ' tgt' : '') + (insp ? ' insp' : '') + (ui.fresh[f.u] ? ' ' + ui.fresh[f.u] : ''),
      'data-u': f.u, 'aria-label': c.n + ', Might ' + f.m + ', ' + Kit.poss(pname(f.o)), style: { '--f': fac.c } });
    if (asCard) {
      n.classList.add('card'); if (c.reg === pl.reg) n.classList.add('home');
      const cd = cardEl(f.c, { mini: true, now: true, might: f.m }); if (f.m > c.m) cd.classList.add('m-up'); else if (f.m < c.m) cd.classList.add('m-dn');
      n.appendChild(cd); n.appendChild(el('i', { class: 'fp-tab' }));
    } else {
    const art = el('span', { class: 'fp-art' }, [noArtLabel(f.c, true, 'na')]); const im = artImg(f.c, true); if (im) art.appendChild(im);
    n.appendChild(el('span', { class: 'fp-card' }, [art]));
    n.appendChild(el('span', { class: 'fp-m' + (f.m > c.m ? ' up' : '') }, [el('b', { text: String(f.m) })]));
    // (the piece's home region in its lower right corner, as on the cards: gold while it stands at home. Tim, 2026-11-12)
    if (c.reg && window.AnoriaDomains) n.appendChild(el('span', { class: 'fp-home' + (c.reg === pl.reg ? ' at' : '') }, [window.AnoriaDomains.home(c.reg, { lit: c.reg === pl.reg })]));
    else if (c.reg === pl.reg) n.appendChild(el('span', { class: 'fp-home', html: SVG.home }));
    }
    if (f.stun) n.appendChild(el('span', { class: 'fp-stun' }));
    if (f.hush) n.appendChild(hushMark(f.c, ui.fresh[f.u] === 'hushin'));   // (the Walk to Canossa: its skills switched off until the count)
    if (tg) { const pv = clashPreview(tg); if (pv) n.appendChild(el('span', { class: 'pv-x', html: '<span class="a">' + pv[0] + '</span><i>v</i><span>' + pv[1] + '</span>', 'aria-label': 'Your ' + pv[0] + ' against ' + pv[1] })); }
    if (window.AnoriaEd && !G.demo && !asCard) window.AnoriaEd.piece(n, f.c);   // (the piece's frame takes the card's edition; a card wears its own)
    return n;
  }
  // The Walk to Canossa's mark on a piece: the card's first skill mark (or a plain star for a power with no skill
  // word), struck through in red, on a dark disc at the piece's top left, until the count. Its card lies on the piece.
  function hushMark(key, fresh) {
    const k = CARDS[key].k || {}, w = Object.keys(k).find(x => KEYI[x]);
    return el('span', { class: 'fp-hush' + (fresh ? ' in' : ''), 'aria-label': 'Skills switched off until the count', html: (w ? KEYI[w] : KW + '<path d="M6 1.2 7.3 4.7 10.8 6 7.3 7.3 6 10.8 4.7 7.3 1.2 6 4.7 4.7z" fill="currentColor" stroke="none"/></svg>') + '<i></i>' });
  }
  // a Figure that is picked up (from the hand to play, on the map to walk) is at home at Places of this region
  function homeLit(reg) {
    const s = ui.sel; if (!s || !idle()) return false;
    const f = s.kind === 'hand' ? null : E.byU(S, s.u), c = CARDS[s.kind === 'hand' ? s.key : f && f.c];
    return !!c && c.t === 'fig' && (c.reg === reg || !!(c.k && c.k.voyager));
  }
  function banAv(o) {
    const pl = G.players[o] || {}, n = el('span', { class: 'pl-av', style: { '--pc': 'var(--pc' + o + ')' }, 'aria-label': Kit.poss(pname(o)) + ' Domain' });
    n.appendChild(pl.cpu ? el('span', { class: 'avatar', html: Kit.icon('bot') }) : Kit.avatar.el(pl.name, null, 'var(--pc' + o + ')'));
    return n;
  }
  // What lies across a Domain's power as the table shows it at this moment of the playback (V): Vesuvius, or Diogenes
  // standing there (E.silenced says the same of the engine's state, which can be a few moves ahead)
  function vSil(i) {
    if (!S.dm) return null; const mk = (V.mk || S.mk)[i]; if (mk) return { k: 'card', c: mk };
    const f = V.figs.filter(g => g.p === i && !g.hush && (CARDS[g.c].k || {}).cynic && !E.prot(S, i, g.o))[0];
    return f ? { k: 'fig', c: f.c, o: f.o } : null;
  }
  // Pope Leo I's Ward changes what these Domain powers do while he stands there: they don't reach his side's Figures
  const WARDED = { equal: 1, maze: 1, islets: 1, peace: 1 };
  const wardHere = i => (WARDED[E.pw(S, i)] && V.figs.filter(f => f.p === i && !f.hush && (CARDS[f.c].k || {}).ward)[0]) || null;
  // The pieces a real table lays on a Domain (the looks are domains.js's and domains.css's), half on the tile's lower
  // edge beside its owner's avatar, clear of the Might totals, the flag and the words. At the avatar's left: the card
  // that switches its power off (Vesuvius lies across it as a small card; Diogenes's marker is his portrait on a
  // square token edged in his player's colour), and the pen-nib token while a Ward (Pope Leo I's) changes what its
  // power does, with a dotted line under the power (.chg). At its right: a bone counter in a player's colour for the
  // Spark they borrowed at Florence and pay back when their next turn starts.
  function domTokens(i, sil) {
    const out = [], D = window.AnoriaDomains, pk = S.places[i];
    const wd = wardHere(i); if (D && wd) { const t = D.token('changed'); t.setAttribute('aria-label', 'While ' + CARDS[wd.c].n + ' is here, this Domain\'s power can\'t hurt the Figures on ' + Kit.poss(pname(wd.o)) + ' side'); t.dataset.sd = 'L'; out.push(t); }
    if (sil) {
      const fig = sil.k === 'fig', t = el('span', { class: 'dm-tok ' + (fig ? 'who' : 'crd') + (ui.mkNew === i ? ' drop' : ''), role: 'img', style: fig ? { '--pc': 'var(--pc' + sil.o + ')' } : null,
        'aria-label': fig ? CARDS[sil.c].n + ' is at this Domain, so its power is switched off while ' + CARDS[sil.c].n + ' stays' : CARDS[sil.c].n + ' lies on this Domain, so its power is switched off' });
      const im = artImg(sil.c, true) || mono(sil.c); if (im) t.appendChild(im); t.dataset.sd = 'L'; out.push(t);
    }
    if (D && C.PLACES[pk] && C.PLACES[pk].pw === 'loan') V.P.forEach((p, o) => { if (p.debt > 0) { const t = D.token('counter', p.debt); t.classList.add('owe'); t.style.setProperty('--pc', 'var(--pc' + o + ')');
      t.setAttribute('aria-label', pname(o) + ' borrowed ' + p.debt + ' Spark here and pays it back at the start of their next turn'); t.dataset.sd = 'R'; out.push(t); } });
    return out;
  }
  // One row of the map: the Domain's tile in the middle, the Figures of the player across the table on its left and
  // yours on its right (two players). With more players (o.many) the row is one of your three, drawn large: everyone
  // else's Figures there stand on its left as stacks, one for each player in seat order from your left (stackEl), and
  // the totals on the tile are your side's and the strongest other side's.
  function rowEl(i, T, o) {
    o = o || {};
    const v = ui.view, M = !!o.many, t = M ? rivalAt(i) : 1 - v, pk = S.places[i], pi = C.PLACES[pk], hold = V.hold[i], tg = T.places[i];
    const row = el('div', { class: 'pl' + (M ? ' wn-row' : '') + (hold >= 0 ? ' held' + hold : '') + (tg ? ' tgt' : '') + (ui.count === i ? ' count' : '') + (ui.pend && ui.pend.x === i ? ' pk' : ''), 'data-p': i, style: { '--pcL': 'var(--pc' + t + ')', '--pcR': 'var(--pc' + v + ')' } });
    const sil = vSil(i);
    if (S.dm) { row.dataset.ban = S.ban[i]; row.dataset.kind = pi.d; row.dataset.rule = E.pw(S, i); if (sil) row.dataset.silenced = sil.c; }
    // (what this place is, printed faintly on the table in the row's gutter: a Gate's arch, an Outpost's tower or the
    // Crossroads' signpost, in the color of the player whose place it is. At the left, and on an iPad at the right too.)
    if (!M) { const own0 = E.ownerOfSpoke(S, i), kind = own0 < 0 ? 'posCross' : E.isGate(S, i) ? 'posGate' : 'posOut', st0 = own0 >= 0 ? { '--pc': 'var(--pc' + own0 + ')' } : null;
      row.appendChild(el('i', { class: 'pl-pos L', style: st0, html: SVG[kind] })); row.appendChild(el('i', { class: 'pl-pos R', style: st0, html: SVG[kind] })); }
    [[t, 'L'], [v, 'R']].forEach(sd => {
      const side = el('div', { class: 'pl-side ' + sd[1] });
      if (M && sd[1] === 'L') {   // (everyone else's Figures here: a stack for each player, in seat order from your left)
        seatsFrom(v).slice(1).forEach(q => { const fs = V.figs.filter(f => f.p === i && f.o === q); if (fs.length) side.appendChild(stackEl(q, i, fs, T)); });
      } else {
        const figs = V.figs.filter(f => f.p === i && f.o === sd[0]).sort((a, b) => a.u - b.u);
        // (two players: the cards themselves, no engraved places for the ones not there; a phone on its side has the
        // room for one stack a side, its top card, how many and their Might together, which a tap reads in the scan)
        if (!M && ui.lay && ui.lay.short) { if (figs.length) side.appendChild(stackEl(sd[0], i, figs, T, 0, true)); }
        else figs.forEach(f => side.appendChild(figEl(f, T, !M)));
        let free = M ? Math.min(E.capAt(S, i), o.slots || 9) - figs.length : figs.length < E.capAt(S, i) ? 1 : 0;
        if (tg && sd[0] === S.turn && free > 0) {
          const pv = landPreview(tg);
          if (pv) { const s = el('span', { class: 'slot land' }); if (pv.cost != null) s.appendChild(el('span', { class: 'pv-c' }, [el('b', { text: String(pv.cost) })])); if (pv.m != null) s.appendChild(el('span', { class: 'pv-m' }, [el('b', { text: String(pv.m) })])); if (pv.via) { const vi = el('span', { class: 'pv-v' }); const im = artImg(pv.via, true) || mono(pv.via); if (im) vi.appendChild(im); s.appendChild(vi); } side.appendChild(s); free--; }
        }
        if (M) for (let k = 0; k < free; k++) side.appendChild(el('span', { class: 'slot' }));
      }
      row.appendChild(side);
      if (sd[1] === 'L') row.appendChild(tileEl(i, T, M ? { o: t, n: sideTot(i, t) } : { o: t, n: V.tot[i][t] }, M ? { o: v, n: sideTot(i, v) } : { o: v, n: V.tot[i][v] }, sil));
    });
    if (!M) [t, v].forEach(o => { if (V.pb[i][o]) row.appendChild(el('span', { class: 'pl-decree ' + (o === t ? 'L' : 'R'), text: '+' + V.pb[i][o], 'aria-label': V.pb[i][o] + ' more Might here until the end of the round' })); });
    else if (V.pb[i][v]) row.appendChild(el('span', { class: 'pl-decree R', text: '+' + V.pb[i][v], 'aria-label': V.pb[i][v] + ' more Might here until the end of the round' }));
    return row;
  }
  // A Domain's tile as the map shows it full size: its picture, both totals (L and R: {o: the player, n: the Might},
  // the one that holds it lit), the Deeds lying on it, the banner with what it scores, its name and power, its kind's
  // frame and home plate, the pieces a power uses, and whose Domain it is
  function tileEl(i, T, L, R, sil) {
    const v = ui.view, pk = S.places[i], pi = C.PLACES[pk], hold = V.hold[i];
    const worth = (hold >= 0 ? E.rv(S, i, hold) : E.pw(S, i) === 'double' ? 2 : 1) * E.stake(S.cfg, V.round);
    const tAct = S.dm && human(S.turn) && idle() && (ui.acts || []).some(a => (a.t === 'loan' || a.t === 'buy' || a.t === 'hire') && a.p === i);   // (a Domain that offers something to do now is lit, like a Figure that can act)
    const tile = el('button', { type: 'button', class: 'pl-tile' + (tAct ? ' can' : ''), style: tAct ? { '--pc': 'var(--pc' + S.turn + ')' } : null, 'aria-label': pi.n + (hold >= 0 ? ', held by ' + pname(hold) : '') });
    const art = el('span', { class: 'pl-art' }, [el('span', { class: 'na' })]); const im = artImg(pk, true); if (im) art.appendChild(im);
    tile.appendChild(art);
    const won = o => hold >= 0 && (hold === o || E.ally(S, hold, o));
    tile.appendChild(el('span', { class: 'pl-tots' }, [
      // (the total of whoever holds the Domain is lit and the other dimmed, so a tie settled by a banner or a power
      // reads as plainly as a higher number. Tim, 2026-11-12)
      el('span', { class: 'pl-tot L' + (L.n ? '' : ' zero') + (won(L.o) ? ' win' : hold >= 0 ? ' lose' : ''), style: { '--tc': 'var(--pc' + L.o + ')' }, text: String(L.n) }),
      el('span', { class: 'pl-tot R' + (R.n ? '' : ' zero') + (won(R.o) ? ' win' : hold >= 0 ? ' lose' : ''), style: { '--tc': 'var(--pc' + R.o + ')' }, text: String(R.n) })]));
    // (a Gate is marked on the table at the row's ends: .pl-pos)
    (V.dip || []).filter(d => d.p === i).forEach((d, n) => tile.appendChild(el('span', { class: 'pl-dip ' + (d.o === v ? 'R' : 'L'), style: { '--pc': 'var(--pc' + d.o + ')', '--n': n }, 'aria-label': info(d.c).n + ' lies here until the count', html: DIPI[E.fxOf(d.c)] || MARK.deed })));   // (a Deed in play on this Domain)
    tile.appendChild(el('span', { class: 'pl-flag' + (hold >= 0 ? '' : ' none') + (ui.drop[i] ? ' drop' : ''), style: hold >= 0 ? { '--hc': 'var(--pc' + hold + ')' } : null }, [el('b', { text: String(worth) })]));
    tile.appendChild(el('span', { class: 'pl-plate' }, [
      el('span', { class: 'pl-name' + (pi.n.length > 15 ? ' long' : ''), text: pi.n }),
      (S.dm ? DSHORT[pi.pw] : RULE[pk]) ? el('span', { class: 'pl-rule', text: S.dm ? DSHORT[pi.pw] : DW(RULE[pk]) }) : null]));
    // (the frame of the Domain's kind and its home plate, lit while a Figure that is at home here is picked up; with
    // Domains, the banner of the player who brought it on that player's side of the tile, and a rule that is
    // silenced under its veil of ash, or one that does nothing at this position shown struck through: domains.js)
    const dmo = { key: pk, reg: pi.reg, lit: homeLit(pi.reg) };
    if (S.dm && sil) dmo.silenced = true;   // (whose Domain it is: the player's avatar on its bottom border, below, not a pennant)
    if (window.AnoriaDomains) window.AnoriaDomains.tile(tile, dmo);
    if (S.dm) { const tk = domTokens(i, sil); ['L', 'R'].forEach(sd => { const k = tk.filter(t => t.dataset.sd === sd); if (k.length) tile.appendChild(el('span', { class: 'pl-toks ' + sd }, k)); }); if (wardHere(i)) tile.classList.add('chg'); }   // (the pieces lying on it, beside the flag)
    // (whose Domain this is: that player's avatar in a ring of their color, in the middle of the tile's bottom border.
    // Tim, 2026-11-12, in place of the pennants)
    if (S.dm && S.ban[i] >= 0) tile.appendChild(banAv(S.ban[i]));
    if (S.dm && pi.pw && !dmo.silenced && !E.silenced(S, i) && !E.pw(S, i)) tile.classList.add('idle');   // (a rule that does nothing where it lies, like Commerce at a Gate)
    if (S.dm && !im) art.style.setProperty('--kc', (window.AnoriaDomains && window.AnoriaDomains.KINDS[window.AnoriaDomains.kindOf(pk)] || {}).c || '#223');
    return tile;
  }
  // a Figure in hand whose other copy matters: standing on your side already (one of each person at a time), or
  // in your discard pile (it returns for less)
  function twinNote(key) {
    const c = CARDS[key], o = S.turn; if (!c || c.t !== 'fig') return '';
    if (S.cfg.unique && S.figs.some(f => f.o === o && f.c === key)) return '<b>This person is already on your side.</b> Only one of each person can be there at a time. ';
    if (S.cfg.ret && (S.P[o].gone || []).indexOf(key) >= 0) return '<b>Returns for ' + S.cfg.ret + ' less.</b> ';
    return '';
  }
  function capEl() {
    const n = dom.cap; n.innerHTML = '';
    if (ui.pend) return pendCap(n);
    const st = E.stake(S.cfg, V.round);
    n.appendChild(el('button', { type: 'button', class: 'cap-round' + (ui.flip ? ' flip' : ''), 'aria-label': 'Round ' + V.round + DW(', Places score ') + st, onclick: roundSheet },
      [el('span', { class: 'n', text: String(V.round) }), el('span', { class: 'w', html: st > 1 ? LAUREL + LAUREL : LAUREL })]));
    if (ui.sel && idle()) {
      const s = ui.sel, key = s.kind === 'hand' ? s.key : E.byU(S, s.u).c, c = info(key), T = targets();
      n.appendChild(el('button', { type: 'button', class: 'cap-card', 'aria-label': 'Read ' + c.n, onclick: () => { if (G.demo) openView(key, s.kind === 'fig' ? { u: s.u } : { list: V.P[ui.view].hand.slice(), at: s.h }); else scan(s.kind === 'fig' ? { u: s.u } : { h: s.h }); } }, [
        el('span', { class: 'tx', html: '<span class="who">' + esc(c.n) + '</span> ' + (s.kind === 'hand' ? twinNote(key) : '') + (boldKeys(c.tx) || esc(c.cap)) })]));
      if (s.kind === 'hand' && !s.picks.length && T.done.length) n.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-sm cap-play', text: 'Play', onclick: () => finishPick(T.done) }));
      return;
    }
    if (ui.ack && !G.over) {   // (what the computer just did; a tap reads the card)
      const k = ui.ack.key, inner = [el('span', { class: 'tx', text: ui.ack.tx })];
      n.appendChild(k ? el('button', { type: 'button', class: 'cap-card cap-ack', 'aria-label': ui.ack.tx + ' Read ' + info(k).n, onclick: () => openView(k) }, inner) : el('div', { class: 'cap-card cap-ack' }, inner));
      return;
    }
    let txt = '', dim = false;
    if (G.over) txt = S.winner < 0 ? 'A draw' : G.teams ? winName(S.winner) + ' win' : pname(S.winner) === 'You' ? 'You win' : pname(S.winner) + ' wins';
    else if (ui.discard) { const k = S.P[S.turn].hand.length - S.cfg.handMax; txt = 'Hand limit ' + S.cfg.handMax + ': discard ' + k; }
    else if (V.turn < 0) { txt = G.demo && !ui.counting ? '' : 'The count'; dim = true; }
    else if (!human(V.turn)) { txt = pname(V.turn) + ' is playing'; dim = true; }
    else txt = Kit.poss(pname(V.turn)) + ' turn';
    n.appendChild(el('div', { class: 'cap-txt' + (dim ? ' dim' : ''), text: txt }));
    if (!G.demo) n.appendChild(el('button', { type: 'button', class: 'cap-log', 'aria-label': 'Turn log', html: Kit.icon('rows'), onclick: logScreen }));
  }
  function handEl() {
    const n = dom.hand; n.innerHTML = '';
    if (ui.pend) return pendHand(n);
    if (ui.hideHand || ui.viewer < 0) return;
    const o = ui.view, hand = V.P[o].hand, can = idle() && o === S.turn, T = targets();
    const picking = Object.keys(T.hand).length > 0;
    if (!G.demo) warm(hand);   // (the full pictures of your hand are ready before you tap one to read it)
    hand.forEach((key, h) => {
      const c = CARDS[key], cost = E.costOf(S, o, key);
      const ok = can && !ui.discard && (ui.acts.some(a => a.h != null && S.P[o].hand[a.h] === key) || (E.fxOf(key) === 'phalanx' && ui.acts.some(a => a.ph && S.P[o].hand[a.hq] === key)));
      const sel = ui.sel && ui.sel.kind === 'hand' && (ui.sel.h === h || ui.sel.picks.some(p => p.k === 'h' && p.v === h));
      const b = el('button', { type: 'button', class: 'hc' + (ui.discard ? ' toss' : !can ? '' : picking ? (T.hand[h] || sel ? '' : ' no') : ui.sel ? (ok ? '' : ' no') : ok ? ' ok' : ' no') + (sel ? ' sel' : '') + (T.hand[h] ? ' tgt' : '') + (ui.dealt && h >= ui.dealt ? ' in' : ''),
        'data-h': h, 'aria-label': c.n + ', costs ' + cost }, [cardEl(key, { mini: true, cost: cost })]);
      n.appendChild(b);
    });
  }
  function render() {
    if (!G || !V || !dom.root) return;
    const v = ui.view, M = many();
    ui.lay = M ? {} : layMode();
    // (the shape of the two-player table, for the style sheet: ln the battle line, up and short its upright and low
    // forms, rw the rows of a phone held upright; and the game bar folds down while a phone on its side plays)
    if (dom.felt) { const L = ui.lay, want = 'an-felt felt-in' + (dom.track ? ' has-trk' : '') + (M ? ' many' + (G.teams ? ' teams' : '') : L.ln ? ' bl' + (L.up ? ' up' : '') + (L.short ? ' short' : '') : ' rw'); if (dom.felt.className !== want) dom.felt.className = want; }
    document.documentElement.classList.toggle('an-low', !!(ui.lay.short && dom.root && dom.root.isConnected));
    if (M && dom.go && dom.go.firstChild) dom.go.innerHTML = '';
    const T = targets();
    if (!M) paintMats();   // (only when a mat has been changed, or the view has changed hands)
    pass = {};   // (pictures are put back, not made again: see artImg)
    try {
      // (more players: the other players' plates are on the rim, so where the other player's strip is with two there
      // is the teams' bar in a team game, and nothing otherwise)
      if (!M) stripEl(dom.opp, 1 - v, false); else if (G.teams) sidesEl(dom.opp); else { dom.opp.className = 'an-strip opp wn-none'; dom.opp.innerHTML = ''; }
      stripEl(dom.me, v, true);
      dom.map.innerHTML = '';
      if (M) {   // (the hand is sized first, then the table is laid out in the room it leaves: drawN)
        if (dom.map.className !== 'an-map wn') dom.map.className = 'an-map wn';
        if (G.ph === 'setup') { suDrawN(); layoutHand(); suBoardN(T); }
        else { capEl(); handEl(); layoutHand(); drawN(T); }
      }
      else if (G.ph !== 'setup') dom.map.appendChild(el('div', { class: 'an-road' }));   // (the set-up's slots are empty: no road runs under them)
      if (M) {}
      else if (G.ph === 'setup') suDraw();
      else { rowsOrder().forEach(i => dom.map.appendChild(rowEl(i, T))); capEl(); handEl(); }
      // (the slide on the round track: this round, in the colour of whoever's turn it is. Lincoln's Seal is due at round 5.)
      if (dom.track) window.AnoriaDomains.track(dom.track, { round: V.round, turn: G.over ? -1 : V.turn, due: V.P.map((p, o) => (p.guide === 'lincoln' ? { r: 5, o: o } : null)) });
    } finally { pass = null; }
    if (!M) layout(); fitPlates(); if (!M) { fitNames(); piles(); } lines(); fitSides();
    dom.root.querySelectorAll('.st-name').forEach(n => Kit.fitText(n, .6));
  }
  // A tile's name and rule stay on the paper, clear of the Might totals and the banner above it and the frame below.
  // Fonts are drawn taller on some devices (Tim's iPhone), so this is measured, not assumed. Every tile on the map
  // takes the same size of words (f1 to f3, the smallest step at which all of them fit) and the same height of paper,
  // the height the tallest needs (Tim: "these domains aren't the same size and they should be, even though the
  // pyramid text is the one going an extra line"). Only on a tile too short for a name and a rule at the smallest
  // size (a 320-wide phone) does the rule leave the tile (f4); it is read where the tile is tapped.
  // (a tile as wide as an iPad's has room inside its paper: the kind's mark and the home go in at its left and right,
  // not half off its edges. Tim, 2026-11-12)
  function roomy(t) {
    const p = t.querySelector('.pl-plate'); if (!p || !t.classList.contains('dm')) return;
    const on = t.getBoundingClientRect().width >= 170; t.classList.toggle('roomy', on);
    if (on) t.querySelectorAll(':scope > .dm-clasp').forEach(c => p.appendChild(c));
    else p.querySelectorAll(':scope > .dm-clasp').forEach(c => t.appendChild(c));   // (and back out when the tile narrows: an iPad turned upright)
  }
  function fitPlates() {
    if (!dom.map) return;
    const tiles = Array.prototype.filter.call(dom.map.querySelectorAll('.pl-tile:not(.wn-small)'), t => t.querySelector('.pl-plate'));
    if (!tiles.length) return;
    const plate = t => t.querySelector('.pl-plate');
    const set = (t, k) => { t.classList.remove('f1', 'f2', 'f3', 'f4'); if (k) t.classList.add('f' + Math.min(k, 3)); if (k > 3) t.classList.add('f4'); };
    const bad = t => {
      // (the paper starts below the Might totals; on the battle line they are shields standing on the tile's top and
      // bottom edges, so only the top one counts)
      const p = plate(t), tr = t.getBoundingClientRect(), pr = p.getBoundingClientRect(), tt = t.querySelector('.pl-tots'), ln = !!t.closest('.an-map.bl');
      const top = ln ? Math.max(tr.top, ...Array.prototype.map.call(t.querySelectorAll('.pl-tot.L'), x => x.getBoundingClientRect().bottom)) : tt ? tt.getBoundingClientRect().bottom : tr.top;
      const nm = p.querySelector('.pl-name'), a = nm && nm.getBoundingClientRect();
      const hits = a && Array.prototype.some.call(t.querySelectorAll('.pl-flag, .pl-tot'), x => { const r = x.getBoundingClientRect(); return a.top - 2 < r.bottom && a.bottom > r.top && a.left < r.right && a.right > r.left; });
      const ru = p.querySelector('.pl-rule'), rr = ru && ru.offsetParent ? ru.getBoundingClientRect() : null;
      return pr.top < top - 1 || pr.bottom > tr.bottom - 2 || (ln && !(ui.lay || {}).short && pr.height > tr.height * .62) || (rr && rr.bottom > pr.bottom + 1) || p.scrollWidth > p.clientWidth + 1 || (nm && nm.scrollWidth > nm.clientWidth + 1) || hits;
    };
    tiles.forEach(t => { plate(t).style.minHeight = ''; roomy(t); });   // (the mark and home go into a roomy tile's paper before its words are measured)
    let k = 0; for (; k <= 3; k++) { tiles.forEach(t => set(t, k)); if (!tiles.some(bad)) break; }
    if (k > 3) tiles.forEach(t => { set(t, 3); if (bad(t)) set(t, 4); });
    // the same paper on every tile: the tallest one's height, the words centred on it
    const H = Math.max.apply(null, tiles.map(t => plate(t).getBoundingClientRect().height));
    tiles.forEach(t => { plate(t).style.minHeight = H + 'px'; });
  }
  // Sizes from the room there is
  function layout() { if (!dom.map) return; layoutHand(); layoutMap(); }
  function layoutHand() {
    if (!dom.map) return;
    // The hand is sized first and the map measured after it. (The other way round, a hand that had just grown
    // squeezed the map for one measurement: every card drawn made the whole board jump flat and back.)
    // the hand: side by side, never overlapping. As it fills the cards get smaller, and below a readable size
    // they drop the name (picture, cost and Might stay; tap one and the caption says what it is)
    const h = dom.hand, n = h.children.length, land = window.innerWidth > window.innerHeight, hr = h.getBoundingClientRect(), W = hr.width - 2, g = W > 600 ? 8 : 4;
    h.classList.remove('two'); Array.prototype.forEach.call(h.children, c => c.classList.remove('r0'));
    h.style.setProperty('--ho', g + 'px'); h.style.paddingBottom = '';
    let hw, rows = 1, per = n;
    const cap = Math.min(132, Math.max(window.innerHeight, window.innerWidth) * .098);
    h.style.minHeight = '';
    if (!many() && ui.lay && ui.lay.ln) {
      // The battle line: the hand is one row of whole cards along the dock, as big as eight of them side by side allow;
      // its room is kept at that size, so the table never jumps as cards come and go. More than fit at a readable size
      // overlap, as cards held in a hand do, each with its spine and number showing.
      const L = ui.lay, big = L.short ? 66 : 132, least = L.short ? 50 : 78;
      const hw8 = Math.floor(Math.min(big, (W - 7 * g) / 8, L.short ? (window.innerHeight * .222) / 1.4 : 999)), fit = n ? (W - (n - 1) * g) / n : hw8;
      hw = Math.floor(Math.min(hw8, Math.max(fit, Math.min(hw8, least))));
      const ov = n > 1 && n * hw + (n - 1) * g > W ? (W - n * hw) / (n - 1) : g;
      h.style.setProperty('--ho', ov.toFixed(1) + 'px'); h.classList.toggle('over', ov < 0);
      h.style.minHeight = Math.ceil(hw8 * 1.4 + (L.short ? 2 : 8)) + 'px';
      h.style.setProperty('--hw', hw + 'px'); h.classList.toggle('small', hw < 62);
      return;
    }
    h.classList.remove('over');
    if (land) {
      // beside the map: one, two or three rows, whichever gives the bigger cards
      const room = Math.max(60, hr.height - 6), fit = (rw, pr) => Math.min((room - (rw - 1) * 6) / rw / 1.4, (W - (pr - 1) * g) / pr, cap);
      hw = 0;
      for (let rw = 1; rw <= 3; rw++) { const pr = Math.ceil(n / rw), v = fit(rw, pr); if (v > hw + 2) { hw = v; rows = rw; per = pr; } }
    } else {
      // upright: one row while the names stay readable, else two (a phone keeps room for two rows, so the map never jumps)
      const phone = W < 560 && window.innerHeight >= 740; if (phone) per = Math.max(4, Math.ceil(n / 2));   // (a short phone keeps one row of small cards)
      rows = phone ? 2 : 1;
      const hw4 = Math.min((W - 3 * g) / 4, cap);
      hw = Math.min((W - (per - 1) * g) / per, cap);
      h.style.minHeight = phone ? Math.ceil(2 * Math.floor(hw4) * 1.4 + 6 + 8) + 'px' : '';
      if (n <= per) rows = 1;
      // (more players: the table needs the height, so the hand keeps the room of one row of five cards; more cards than
      // that go smaller, in one row or in two, whichever leaves them bigger)
      // (more players, Tim, 2026-11-13: the hand as big as the two-player table gives it, so its names and numbers read.
      // A phone: two rows of five as there, with room kept for both so the table never jumps; an iPad: one row, as
      // there, and the room for it kept at the size of eight cards; a short phone: the room of one row of five, the
      // cards in one row or in two, whichever leaves them bigger)
      if (many() || (ui.lay && ui.lay.rows)) {
        if (phone) {
          const hw5 = Math.floor(Math.min((W - 4 * g) / 5, cap)); per = Math.max(5, Math.ceil(n / 2)); rows = n > per ? 2 : 1;
          hw = Math.min((W - (per - 1) * g) / per, cap); h.style.minHeight = Math.ceil(2 * hw5 * 1.4 + g + 18) + 'px'; h.style.paddingBottom = '10px';   // (the last row clear of the screen's rounded corners)
        }
        else if (window.innerHeight >= 740) {
          const hr8 = Math.floor(Math.min((W - 7 * g) / 8, cap)); per = Math.max(n, 5); rows = 1;
          hw = Math.min((W - (per - 1) * g) / per, hr8); h.style.minHeight = Math.ceil(hr8 * 1.4 + 8) + 'px';
        } else {
          const h5 = Math.floor(Math.max(30, Math.min((W - 4 * g) / 5, cap))), room = h5 * 1.4 + 2;
          per = Math.max(n, 5); rows = 1; hw = Math.min((W - (per - 1) * g) / per, cap);
          if (n > 5) { const p2 = Math.ceil(n / 2), w2 = Math.min((W - (p2 - 1) * g) / p2, (room - 6) / 2 / 1.4); if (w2 > hw) { hw = w2; rows = 2; per = p2; } }
          h.style.minHeight = Math.ceil(room + 6) + 'px';
        }
      }
    }
    if (rows > 1) { h.classList.add('two'); h.style.setProperty('--per', per); }
    hw = Math.floor(Math.max(30, hw));
    h.style.setProperty('--hw', hw + 'px'); h.classList.toggle('small', hw < 62);
  }
  function layoutMap() {
    // the map, from the room the hand leaves it
    const LN = !many() && ui.lay && ui.lay.ln; dom.map.classList.toggle('bl', !!LN); dom.map.classList.toggle('rw', !many() && !LN);
    if (LN) return layoutLine();
    dom.map.style.paddingTop = dom.map.style.paddingBottom = dom.map.style.paddingLeft = dom.map.style.paddingRight = '';
    const r0 = dom.map.getBoundingClientRect(); if (!r0.width || !r0.height) return; const mcs = getComputedStyle(dom.map), r = { width: r0.width, height: r0.height - (parseFloat(mcs.paddingTop) || 0) - (parseFloat(mcs.paddingBottom) || 0), left: r0.left, top: r0.top, right: r0.right, bottom: r0.bottom };   // (the rows share the map's height less its padding)
    const rg = r.height > 640 ? 9 : r.height > 420 ? 5 : 3, sg = r.width > 700 ? 7 : 3, gp = r.width >= 690 ? 10 : 5;
    // (a gutter at the row's outer end for the place marks, the Gate's arch, the Outpost's tower and the Crossroads' sign:
    // on a phone at the left only, on an iPad at both ends. Tim, 2026-11-12)
    const pos2 = r.width >= 560, pgL = pos2 ? 24 : r.width < 330 ? 6 : 17, pgR = pos2 ? 24 : 6, padX = pgL + pgR;
    dom.map.classList.toggle('pos2', pos2); dom.map.style.setProperty('--pgL', pgL + 'px'); dom.map.style.setProperty('--pgR', pgR + 'px');
    const rowH = (r.height - 4 * rg) / 5, mwMin = Math.max(r.width < 340 ? 84 : 98, Math.min(r.width * .27, 300));
    let fw = Math.floor(Math.max(24, Math.min((rowH - 9) / 1.44, (r.width - padX - 2 * gp - mwMin - 4 * sg) / 6, 118)));
    let mw = Math.floor(Math.min(r.width - padX - 2 * gp - 6 * fw - 4 * sg, Math.max(mwMin, rowH * 2.2, 240)));
    if (!many()) {   // (two players, a phone upright: the Figures are cards, as tall as the row allows, beside a tile a third of the width)
      mw = Math.floor(Math.max(mwMin, Math.min(rowH * 1.7, r.width * .37)));
      const sideW = (r.width - padX - 2 * gp - mw) / 2; fw = Math.floor(Math.max(26, Math.min((rowH - 4) / 1.4, sideW * .6, 118)));
      dom.map.style.setProperty('--sdw', Math.floor(sideW) + 'px');
    }
    const st = dom.map.style; st.setProperty('--fw', fw + 'px'); st.setProperty('--rg', rg + 'px'); st.setProperty('--sg', sg + 'px'); st.setProperty('--mw', mw + 'px'); st.setProperty('--gp', gp + 'px');
    dom.map.classList.toggle('tight', rowH < 74);
  }
  // The battle line's sizes, from the room between the two players' bars: five columns, one for each Domain, the
  // tile across the middle of each, the other player's Figures in the band above it and yours in the band below.
  function layoutLine() {
    const M = dom.map, L = ui.lay, st = M.style;
    // (the bars ride the mats' far corners, theirs at the top right and yours at the bottom left: the bands start
    // below the one and end above the other)
    // (a phone on its side has no height to spare: there the bars stand on end at the table's two ends, yours at the
    // left and theirs at the right, and the map keeps its full height)
    // (a bar that stands on end and is taller than the table steps down: smaller marks, then the name left to the
    // portrait, whose ring and aria name say whose bar it is)
    [dom.opp, dom.me].forEach(b => { b.classList.remove('t1', 't2'); if (!L.short) return; const room = M.getBoundingClientRect().height;
      if (b.offsetHeight > room) b.classList.add('t1'); if (b.offsetHeight > room) b.classList.add('t2'); });
    const oh = L.short ? 0 : dom.opp.offsetHeight, mh = L.short ? 0 : dom.me.offsetHeight, gapB = L.short ? 2 : 6;
    const ow = L.short ? dom.opp.offsetWidth + 6 : 0, mw = L.short ? dom.me.offsetWidth + 6 : 0;
    st.paddingTop = (oh + gapB) + 'px'; st.paddingBottom = (mh + gapB) + 'px'; st.paddingLeft = mw + 'px'; st.paddingRight = ow + 'px';
    const r0 = M.getBoundingClientRect(); if (!r0.width || !r0.height) return;
    const W = r0.width - ow - mw, H = r0.height - oh - mh - 2 * gapB;
    const cg = L.short ? 14 : W > 900 ? 12 : 8, colW = (W - 4 * cg) / 5;
    const tw = Math.floor(colW - (L.up ? 30 : L.short ? 4 : 12)), sh = Math.round(L.short ? 24 : Math.max(30, Math.min(44, tw * .21)));
    const th = Math.floor(Math.min(tw * (L.short ? .5 : L.up ? .86 : .62), H * (L.short ? .3 : L.up ? .2 : .32)));
    const bg = Math.round(sh * .62 + (L.short ? 1 : 3)), band = (H - th - 2 * bg) / 2;
    // (the cards: two side by side in a column on the iPad sideways; one a column wide, overlapping down the table, upright)
    const fw = Math.floor(Math.max(30, L.up ? Math.min(colW - 14, (band - 6) / 1.62 / 1.4, 124) : Math.min((colW - 6) / 2, (band - 4) / 1.4, 124)));
    const sw = Math.floor(Math.max(22, Math.min((band - 4) / 1.36, colW * .4, 60)));
    const pn = Math.max(11, Math.min(15, tw * .075)), pr = Math.max(10, Math.min(13.5, tw * .064));
    [['--ry', oh + gapB + H / 2], ['--cg', cg], ['--colw', colW], ['--tw', tw], ['--th', th], ['--sh', sh], ['--bg', bg], ['--band', band], ['--fw', fw], ['--sw', sw], ['--pn', pn], ['--pr', pr], ['--fl', Math.round(Math.max(18, Math.min(32, tw * .16)))]].forEach(x => st.setProperty(x[0], (Math.round(x[1] * 10) / 10) + 'px'));
    M.classList.remove('tight', 'pos2');
  }
  // A card's name on the board or in the hand is set as large as reads at arm's length (11px on an iPad), and a name
  // with a word too long for its card at that size steps down until the word fits: nothing is broken or cut off.
  function fitNames() {
    if (!dom.map || !(ui.lay && (ui.lay.ln || ui.lay.rows))) return;
    dom.root.querySelectorAll('.an-map .fp.card .ac-name, .an-hand .hc .ac-name').forEach(n => {
      n.style.fontSize = ''; if (n.scrollWidth <= n.clientWidth + 1) return;
      let fs = parseFloat(getComputedStyle(n).fontSize); while (n.scrollWidth > n.clientWidth + 1 && fs > 6) { fs -= .5; n.style.fontSize = fs + 'px'; }
    });
  }
  // The Figures at each Domain lie as a pile: side by side while they fit, else overlapping, the newest on top, every
  // name still showing; upright on an iPad they overlap down the table like a column of patience, each card's name
  // showing under the next. (Measured after the tiles' words are fitted, so a pile never runs over its neighbour.)
  function piles() {
    if (!dom.map || many()) return;
    const L = ui.lay || {};
    dom.map.querySelectorAll('.pl-side').forEach(sd => {
      const ks = Array.prototype.filter.call(sd.children, c => c.matches('.fp, .slot, .stk')), n = ks.length;
      ks.forEach(k => { k.style.zIndex = ''; });
      if (n < 2) { sd.style.removeProperty('--ov'); return; }
      const r = sd.getBoundingClientRect(), b = ks[0].getBoundingClientRect(), gap = L.ln ? 6 : 3;
      if (L.ln && L.up) {
        const ch = b.height, step = Math.min(ch * .58, Math.max(ch * .3, (r.height - ch) / (n - 1))); sd.style.setProperty('--ov', (step - ch).toFixed(1) + 'px');   // (a third of a card at least: its name shows)
        if (sd.classList.contains('R')) ks.forEach((k, j) => { if (!k.classList.contains('sel')) k.style.zIndex = String(n - j + 1); });   // (yours: each card over the next, so the names below show)
        return;
      }
      const w = b.width, room = r.width - 2, fit = n * w + (n - 1) * gap;
      sd.style.setProperty('--ov', (fit <= room ? gap : (room - n * w) / (n - 1)).toFixed(1) + 'px');
    });
  }
  // Legacy lines: gold thread from each Legacy Figure to the one who inspired it
  function lines() {
    const old = dom.map.querySelector('.an-line'); if (old) old.remove();
    // (a Legacy Figure joined to its line is drawn to every person it names who is in play on its side: Tim, "draw the
    // gold line to both if both are in play")
    const ls = []; V.figs.forEach(f => { if (!f.li || !V.figs.some(g => g.u === f.li)) return; const ns = CARDS[f.c].insp || [];
      V.figs.forEach(g => { if (g.o === f.o && g !== f && (g.u === f.li || ns.indexOf(g.c) >= 0)) ls.push({ u: f.u, li: g.u }); }); });
    if (!ls.length) return;
    const mr = dom.map.getBoundingClientRect(); let h = '<defs><linearGradient id="an-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e3a1"/><stop offset=".5" stop-color="#fff1bf"/><stop offset="1" stop-color="#b8862d"/></linearGradient></defs>';
    ls.forEach(f => {
      const a = figN(f.u), b = figN(f.li); if (!a || !b || a === b) return;   // (two Figures in one stack: the stack is the line)
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const x1 = ra.left + ra.width / 2 - mr.left, y1 = ra.top + ra.height * .3 - mr.top, x2 = rb.left + rb.width / 2 - mr.left, y2 = rb.top + rb.height * .3 - mr.top;
      const mx = (x1 + x2) / 2 + (y2 - y1) * .18, my = (y1 + y2) / 2 - Math.abs(x2 - x1) * .25 - 8, len = Math.hypot(x2 - x1, y2 - y1) * 1.25 + 20;
      h += '<path' + (ui.newLine === f.u ? ' class="new" style="--len:' + len.toFixed(0) + '"' : '') + ' d="M' + x2.toFixed(1) + ' ' + y2.toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '"/><circle cx="' + x1.toFixed(1) + '" cy="' + y1.toFixed(1) + '" r="2.6"/><circle cx="' + x2.toFixed(1) + '" cy="' + y2.toFixed(1) + '" r="2.6"/>';
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'an-line'); svg.innerHTML = h; dom.map.appendChild(svg);
  }
  let rsT = 0;
  // A new size redraws the whole table (render, which also fits the Domains' paper again: fitPlates, roomy). Only laying
  // it out again left every tile with its old paper height after an iPad turned (Tim, 2026-11-13: "trying to rotate
  // between the orientations messed up the cards fully"). Safari can report the old size when the event fires, so the
  // table is drawn once more a moment later.
  const reTable = () => { if (G && dom.root && dom.root.isConnected) render(); };
  const onSize = () => { clearTimeout(rsT); rsT = setTimeout(() => { reTable(); clearTimeout(rsT2); rsT2 = setTimeout(reTable, 350); }, 80); };
  let rsT2 = 0; window.addEventListener('resize', onSize); window.addEventListener('orientationchange', onSize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onSize);

  // ═══ The table for three to six players ══════════════════════════════════════════════════════════════════
  // Tim, 2026-11-13, layout C of the mockups: "your spoke large, the others round the rim". The player whose side of
  // the table this is (ui.view) has their three Domains drawn large, as the two-player rows are: the Crossroads, their
  // Outpost and their Gate, with their Figures as cards on the right and everyone else's Figures there as stacks on the
  // left. Every other player's spoke is a column on their own mat along the top (a row down the left, sideways): their
  // plate, their Gate and their Outpost, with the dotted roads into the Crossroads and, round the ring, from your two
  // neighbours' Outposts to yours. The rim goes round the table to the left: the player on your left is the first
  // column (the first row sideways), the player on your right the last, so "the player on your left" (the Congress of
  // Vienna, nextLive) is the column at the left. A short phone folds each column to its plate and two small tokens.
  // A player's Figures at one Domain away from your rows are one stack (stackEl): the strongest on top, the others'
  // edges under it, the total Might on the shield, edged in the player's colour. A tap reads the stack in the scan,
  // or picks up the Figure in it that is yours to move or the one a picked-up card can reach.
  // The table is drawn from the room the map has (drawN, after the hand is sized), as absolutely placed pieces, every
  // time it is drawn, like the two-player rows; the mats are built once and only moved (matN).
  const seatsFrom = o => { const out = []; for (let k = 0; k < S.N; k++) out.push((o + k) % S.N); return out; };
  // (a side's Might at a Domain as holding it counts it: with teams that add their Might, the team's together)
  const sideTot = (i, o) => { if (!S.tm) return V.tot[i][o]; const add = S.cfg.tmight === 'add'; let n = 0; for (let q = 0; q < S.N; q++) if (E.ally(S, q, o)) n = add ? n + V.tot[i][q] : Math.max(n, V.tot[i][q]); return n; };
  // (the side across from yours at a Domain, for its total on the tile: whoever holds it if that is not your side, or
  // the strongest other side there; shown in the colour of that side's strongest player there)
  function rivalAt(i) {
    const v = ui.view, h = V.hold[i]; let best = -1, bn = -1;
    if (h >= 0 && !E.ally(S, h, v)) best = h;
    else for (let q = 0; q < S.N; q++) { if (E.ally(S, q, v)) continue; const n = sideTot(i, q); if (n > bn || (n === bn && V.tot[i][q] > V.tot[i][best])) { bn = n; best = q; } }
    if (best >= 0 && S.tm) { let b2 = best; for (let q = 0; q < S.N; q++) if (E.ally(S, q, best) && V.tot[i][q] > V.tot[i][b2]) b2 = q; best = b2; }
    return best < 0 ? (v + 1) % S.N : best;
  }
  // a Figure's piece on the table, wherever it is drawn: its card in your rows, or the stack it is in
  const figN = u => dom.map ? dom.map.querySelector('.fp[data-u="' + u + '"]') || dom.map.querySelector('.stk[data-us~="' + u + '"]') : null;
  // the stack of a player's Figures at one Domain (w: its width, when it is placed by hand)
  function stackEl(q, i, fs, T, w, count) {
    fs = fs.slice().sort((a, b) => b.m - a.m || a.u - b.u); const top = fs[0], c = CARDS[top.c], mineQ = q === S.turn, us = fs.map(f => f.u);
    const acts = a => a.t === 'walk' || a.t === 'clash' || a.t === 'antik' || a.t === 'tub';
    const can = idle() && mineQ && !ui.sel && fs.some(f => ui.acts.some(a => a.u === f.u && acts(a)));
    const done = mineQ && !G.over && fs.every(f => !f.rdy && !(f.arr && !f.acted));
    const sel = ui.sel && ((ui.sel.kind === 'fig' && us.indexOf(ui.sel.u) >= 0) || ui.sel.picks.some(p => p.k === 'f' && us.indexOf(p.v) >= 0));
    const tg = us.some(u => T.figs[u]), fresh = us.map(u => ui.fresh[u]).filter(Boolean)[0];
    const m = fs.reduce((a, f) => a + f.m, 0), n = el('button', { type: 'button', class: 'stk o' + q + (fs.length > 1 ? ' many' : '') + (can ? ' can' : '') + (done ? ' done' : '') + (sel ? ' sel' : '') + (tg ? ' tgt' : '') + (top.stun ? ' stun' : '') + (fresh ? ' ' + fresh : ''),
      'data-o': q, 'data-p': i, 'data-u': top.u, 'data-us': us.join(' '), style: { '--pc': 'var(--pc' + q + ')', '--f': (FAC[c.f] || FAC.N).c, '--w': w ? w + 'px' : null },
      'aria-label': (q === ui.view ? 'Your ' : Kit.poss(pname(q)) + ' ') + (fs.length > 1 ? fs.length + ' Figures, ' + listOf(fs.map(f => CARDS[f.c].n)) : CARDS[top.c].n) + ', ' + m + ' Might' });
    for (let k = Math.min(3, fs.length - 1); k >= 1; k--) n.appendChild(el('i', { class: 'e', style: { '--k': k } }));
    const card = el('span', { class: 'c' }, [noArtLabel(top.c, true, 'na')]); const im = artImg(top.c, true); if (im) card.appendChild(im); n.appendChild(card);
    if (fs.some(f => f.hush)) n.appendChild(el('span', { class: 'stk-x' }));
    n.appendChild(el('span', { class: 'm' }, [el('b', { text: String(m) })]));
    if (count && fs.length > 1) n.appendChild(el('span', { class: 'stk-n', text: String(fs.length) }));   // (how many cards are in it)
    return n;
  }
  // A player's plate on the rim: their Guide, name, Renown, Seals and the cards in their hand (and their team's
  // diamond). It is a strip in small (an-strip pN), so everything that flies to a player's strip finds it.
  function plateEl(o, f) {
    const p = V.P[o], pl = G.players[o], g = TXG[p.guide], on = V.turn === o && !G.over && G.ph !== 'setup', out = !!S.P[o].out, sm = p.sm || 3;
    const n = el('div', { class: 'an-strip wn-plate p' + o + (on ? ' on' : '') + (out ? ' out' : '') + (f ? ' ' + f : ''), 'data-o': o, style: { '--pc': 'var(--pc' + o + ')' } });
    const gb = el('button', { type: 'button', class: 'st-guide', 'aria-label': g.n + ', ' + Kit.poss(pl.name) + ' Guide', style: { '--f': FAC[g.f].c }, onclick: e => { e.stopPropagation(); scan({ side: o, key: p.guide }); } }, [el('span', { class: 'na', text: g.n.charAt(0) })]);
    const gi = artImg(p.guide, true); if (gi) gb.appendChild(gi);
    const seals = el('span', { class: 'st-seals', 'aria-label': p.seals + ' of ' + sm + ' Seals left' });
    for (let i = 0; i < sm; i++) seals.appendChild(el('span', { class: 'seal' + (i >= p.seals ? ' broken' : '') + (ui.crack && ui.crack.o === o && ui.crack.i === i ? ' crack' : '') + (ui.press && ui.press.o === o && ui.press.i === i ? ' press' : '') }));
    n.appendChild(gb);
    n.appendChild(el('span', { class: 'st-name' }, [pl.cpu ? el('span', { class: 'bot', html: Kit.icon('bot') }) : null, el('span', { class: 'nm', text: pl.name })]));
    n.appendChild(el('span', { class: 'st-ren', 'aria-label': p.renown + ' Renown' }, [el('span', { class: 'lau' }, [el('b', { text: String(p.renown) })])]));
    n.appendChild(el('span', { class: 'st-bot' }, [seals, el('span', { class: 'st-hand', 'aria-label': p.hand.length + ' cards in hand' }, [el('b', { text: String(p.hand.length) })])]));
    if (S.tm) n.appendChild(el('i', { class: 'wn-tm', style: { '--tc': teamCol(o) }, 'aria-label': 'Team ' + teamName(o) }));
    // (their Relics in play, as brass diamonds on the plate's lower edge; a tap on the Guide reads them in the scan)
    if (p.relics.length) n.appendChild(el('span', { class: 'wn-rel', 'aria-label': p.relics.length + (p.relics.length > 1 ? ' Relics' : ' Relic') + ' in play' }, p.relics.map(r => el('i', { class: 'relic', 'data-relic': r }))));
    if (out) n.appendChild(el('span', { class: 'wn-out', text: 'Out' }));
    return n;
  }
  // (a team's colour is its first player's, and its name is its players' names joined the way people say them)
  const teamOf = o => (G.teams || []).filter(t => t.indexOf(o) >= 0)[0] || [o];
  const teamCol = o => (G.players[teamOf(o)[0]] || {}).color || PCOL[0];
  const teamName = o => teamOf(o).map(pname).join(' & ');
  const tren = o => teamOf(o).reduce((a, q) => a + V.P[q].renown, 0);   // (a team's Renown together, as the table shows it now)
  // The sides in a team game, where the other player's strip is with two: "Tim & Jamie vs Pete & Pam", each team's
  // diamond in its colour and the Renown it has together. When the names don't fit on one line, the bar keeps the
  // diamonds and the Renown (the plates carry the same diamonds, so who is on which team still reads).
  function sidesEl(node) {
    node.className = 'wn-sides'; node.innerHTML = ''; node.dataset.o = '';
    (G.teams || []).forEach((t, k) => {
      if (k) node.appendChild(el('span', { class: 'vs', text: 'vs' }));
      const r = t.reduce((a, o) => a + V.P[o].renown, 0), lead = t.indexOf(V.turn) >= 0 && !G.over && G.ph !== 'setup';
      node.appendChild(el('span', { class: 'side' + (lead ? ' on' : ''), style: { '--tc': G.players[t[0]].color }, 'aria-label': t.map(pname).join(' and ') + ', ' + r + ' Renown of ' + S.cfg.target }, [
        el('i'), el('span', { class: 'n', text: t.map(pname).join(' & ') }), el('span', { class: 'rn' }, [el('b', { text: String(r) })])]));
    });
  }
  const fitSides = () => { const n = dom.opp; if (!n || !n.classList.contains('wn-sides')) return; n.classList.remove('tight'); if (n.scrollWidth > n.clientWidth + 1 || n.getBoundingClientRect().height > 40) n.classList.add('tight'); };
  // each player's mat on this table, made once and moved to wherever their spoke lies
  function matN(o) {
    dom.nm = dom.nm || [];
    let n = dom.nm[o]; if (!n) n = dom.nm[o] = el('div', { class: 'an-pm', 'aria-hidden': 'true' });
    const pick = matOf(o); if (n._pick !== pick) { n._pick = pick; n.dataset.m = typeof pick === 'object' ? 'art:' + pick.c : pick; matFill(n, pick, 'n' + o); }
    return n;
  }
  // A Domain on the rim: its picture in its kind's frame, the kind's mark and its home on the clasps, the holder's flag
  // with what it scores, and its name on a paper slip when the tile is big enough for a name you can read (9px and up);
  // a smaller tile is its picture, and a tap reads it. (pip: the token a short phone shows instead, no frame)
  // (the size a name can take on a rim tile w by h: its words wrapped on the paper slip, no more than about a third of
  // the tile high; 0 when it would be under 9px. Every rim tile on a table takes the same size, the smallest that fits
  // all of them, so the names read as one set: nameFs)
  function nameFit(n, w, h) {
    const room = w - 2 * Math.max(3, Math.round(w * .045)) - 6, words = n.split(/\s+/);
    for (let fs = 14; fs >= 9; fs -= .5) {
      const cw = fs * .64; if (Math.max.apply(null, words.map(x => x.length)) * cw > room) continue;
      let lines = 1, at = 0; words.forEach(x => { const l = x.length * cw; if (at && at + cw + l > room) { lines++; at = l; } else at += (at ? cw : 0) + l; });
      if (lines * fs * 1.06 + fs * .4 <= h * .46) return fs;
    }
    return 0;
  }
  // (a name that can't be set at 9px on its tile leaves that tile a picture, and the rest keep their names: Tim, "text
  // first for finding things")
  const nameFs = (w, h, own) => { if (!own) return 0; const fs = seatsFrom(ui.view).slice(1).reduce((a, o) => a.concat([2 * o, 2 * o + 1]), []).map(i => (S.places[i] ? nameFit(C.PLACES[S.places[i]].n, w, h) : 14)).filter(x => x >= 9); return fs.length ? Math.min.apply(null, fs) : 0; };
  function rimTile(i, T, w, h, pip) {
    const pk = S.places[i], pi = C.PLACES[pk], hold = V.hold[i], tg = T.places[i], sil = vSil(i);
    const wrap = el('div', { class: 'pl wn-t' + (pip ? ' pip' : '') + (hold >= 0 ? ' held' + hold : '') + (tg ? ' tgt' : '') + (ui.count === i ? ' count' : '') + (ui.pend && ui.pend.x === i ? ' pk' : ''), 'data-p': i, style: hold >= 0 ? { '--hc': 'var(--pc' + hold + ')' } : null });
    const tile = el('button', { type: 'button', class: 'pl-tile wn-small', 'aria-label': pi.n + (hold >= 0 ? ', held by ' + pname(hold) : '') });
    const art = el('span', { class: 'pl-art' }, [el('span', { class: 'na' })]); const im = artImg(pk, true); if (im) art.appendChild(im); else if (window.AnoriaDomains) art.style.setProperty('--kc', (window.AnoriaDomains.KINDS[window.AnoriaDomains.kindOf(pk)] || {}).c || '#223');
    tile.appendChild(art);
    const worth = (hold >= 0 ? E.rv(S, i, hold) : 1) * E.stake(S.cfg, V.round);
    if (pip) {   // (who is there: a dot in each player's colour; the holder's Might on a tab in theirs)
      const dots = el('span', { class: 'wn-dots' }); seatsFrom(ui.view).forEach(q => { if (V.figs.some(f => f.p === i && f.o === q)) dots.appendChild(el('i', { style: { background: 'var(--pc' + q + ')' } })); });
      tile.appendChild(dots); if (hold >= 0) tile.appendChild(el('b', { class: 'wn-hm', text: String(V.tot[i][hold]) }));
      wrap.appendChild(tile); return wrap;
    }
    tile.appendChild(el('span', { class: 'pl-flag' + (hold >= 0 ? '' : ' none') + (ui.drop[i] ? ' drop' : ''), style: hold >= 0 ? { '--hc': 'var(--pc' + hold + ')' } : null }, [el('b', { text: String(worth) })]));
    const db = Math.max(3, Math.round(w * .045)), fs = nameFs(w, h, nameFit(pi.n, w, h));
    if (fs >= 9) tile.appendChild(el('span', { class: 'pl-plate wn-nm' }, [el('span', { class: 'pl-name', text: pi.n, style: { fontSize: fs.toFixed(1) + 'px' } })]));
    else tile.classList.add('bare');
    tile.style.setProperty('--db', db + 'px'); tile.style.setProperty('--dm', Math.max(10, Math.min(16, Math.round(w * .15))) + 'px'); tile.style.setProperty('--fl', Math.max(15, Math.min(26, Math.round(w * .2))) + 'px');
    (V.dip || []).filter(d => d.p === i).forEach((d, n) => tile.appendChild(el('span', { class: 'pl-dip L', style: { '--pc': 'var(--pc' + d.o + ')', '--n': n }, 'aria-label': info(d.c).n + ' lies here until the count', html: DIPI[E.fxOf(d.c)] || MARK.deed })));
    const dmo = { key: pk, reg: pi.reg, lit: homeLit(pi.reg) }; if (S.dm && sil) dmo.silenced = true;
    if (window.AnoriaDomains) window.AnoriaDomains.tile(tile, dmo);
    if (S.dm && S.ban[i] >= 0 && S.ban[i] !== E.ownerOfSpoke(S, i)) tile.appendChild(banAv(S.ban[i]));   // (whose Domain it is, when it is not the spoke's own player's)
    wrap.appendChild(tile);
    return wrap;
  }
  // Lay the table out in the map's room and draw it
  function drawN(T, X) {
    const M = dom.map, mr = M.getBoundingClientRect(), W = Math.floor(mr.width), H = Math.floor(mr.height); if (W < 60 || H < 60) return;
    const N = S.N, v = ui.view, rim = seatsFrom(v).slice(1), R = rim.length, land = window.innerWidth > window.innerHeight && W > H * 1.15;
    const put = (n, x, y, w, h) => { n.style.left = Math.round(x) + 'px'; n.style.top = Math.round(y) + 'px'; if (w != null) n.style.width = Math.round(w) + 'px'; if (h != null) n.style.height = Math.round(h) + 'px'; M.appendChild(n); return n; };
    const here = (i, q) => V.figs.filter(f => f.p === i && f.o === q);
    const tileAt = (i, w, h, pip) => (X ? suRim(i, X, w, h) : rimTile(i, T, w, h, pip));
    const who = i => seatsFrom(ui.view).filter(q => V.figs.some(f => f.p === i && f.o === q));
    M.dataset.lay = land ? 'side' : 'up';
    let mine, compact = false;
    // (the stacks round a rim tile: beside it in two rows ('r'), or in a row under it ('b'))
    // (xl, xr: the room the column or lane gives them; with more players there than fit, the stacks get smaller)
    const stacks = (i, x, y, tw, th, ps, dir, own, xl, xr) => {
      if (X) return;
      const qs = who(i).sort((a, b) => (a === own ? -1 : b === own ? 1 : 0)), n = qs.length;
      // (beside the tile: two rows within its height; a third or fourth player there fans over the first two, like cards
      // in a hand, so the stacks never cross into the next player's column)
      const cols = Math.ceil(n / 2), room = xr - x - tw - 4;
      if (dir === 'r') ps = Math.max(14, Math.min(Math.max(16, Math.min(ps, room / cols - 4)), n > 1 ? (th + 4) / 2.72 - 1 : ps, room - 6 * (cols - 1)));
      else ps = Math.max(14, Math.min(ps, (xr - xl) / n - 4));
      const step = cols > 1 ? Math.min(ps + 4, Math.max(6, (room - ps) / (cols - 1))) : 0;
      qs.forEach((q, j) => { const nd = stackEl(q, i, here(i, q), T, Math.floor(ps));
        if (dir === 'r') { const cc = j >> 1, rr = j & 1, two = n > 1; if (step < ps + 4) nd.classList.add('fan'); put(nd, x + tw + 4 + cc * step, y + th / 2 - (two ? ps * 1.36 + 2 : ps * .68) + rr * (ps * 1.36 + 4)); }
        else { const tot = n * (ps + 4) - 4; put(nd, Math.max(xl, Math.min(xr - tot, x + tw / 2 - tot / 2)) + j * (ps + 4), y + th + 4); } });
    };
    if (!land) {
      compact = H < 380;
      const rimH = compact ? Math.round(Math.min(104, H * .32)) : Math.round(Math.min(H * (N <= 3 ? .42 : N >= 5 && W < 560 ? .45 : .4), 300));
      mine = { x: 0, y: rimH + 6, w: W, h: H - rimH - 6 };
      const colW = W / R;
      rim.forEach((o, k) => {
        const x0 = k * colW, col = matN(o); col.className = 'an-pm wn-col' + (V.turn === o && !G.over && G.ph !== 'setup' ? ' on' : '') + (S.P[o].out ? ' out' : ''); col.style.setProperty('--pc', 'var(--pc' + o + ')'); put(col, x0 + 2, 0, colW - 4, rimH);
        const ph = compact ? Math.round(rimH * .44) : Math.round(Math.max(46, Math.min(60, rimH * .25))), pl = plateEl(o, colW < 96 ? 'f' : 'w');
        pl.style.fontSize = Math.max(9, Math.min(14, ph * .24, colW < 96 ? colW * .13 : (colW - 8) / 11.5)).toFixed(1) + 'px'; put(pl, x0 + 4, 3, colW - 8, ph);
        if (compact) {   // a short phone: the Gate and Outpost as two tokens side by side
          const pz = Math.round(Math.min((colW - 14) / 2, (rimH - ph - 14) / .8, 40)), y = ph + 8;
          [2 * o, 2 * o + 1].forEach((i, j) => { put(tileAt(i, pz, Math.round(pz * .8), true), x0 + colW / 2 + (j ? 2 : -pz - 2), y, pz, Math.round(pz * .8)); });
          return;
        }
        // (the tiles at their biggest: stacks beside them, or under them, whichever leaves the tiles bigger)
        const avail = rimH - ph - 12, twA = Math.min(colW * .58, avail / 2 / .74 - 4);
        let twB = Math.round(colW - 10), psB = 18; for (; twB > 30; twB--) { psB = Math.max(16, Math.min(26, twB * .3)); if (2 * twB * .74 + 2 * (psB * 1.36 + 6) + 6 <= avail) break; }
        const wide = twA >= twB, tw = Math.round(wide ? twA : twB), th = Math.round(tw * .74);
        const ps = Math.round(wide ? Math.max(16, Math.min(tw * .42, (colW - tw) / 2 - 6)) : psB);
        const tx = x0 + colW / 2 - tw / 2 - (wide ? ps * .55 : 0), y1 = ph + 8, gap = wide ? (avail - 2 * th) / 2 : (avail - 2 * th - 2 * (ps * 1.36 + 4)) / 2;
        const yG = y1 + Math.max(2, gap * .5), yO = yG + th + (wide ? Math.max(6, gap) : ps * 1.36 + 8 + Math.max(0, gap));
        [[2 * o, yG], [2 * o + 1, yO]].forEach(x => { put(tileAt(x[0], tw, th), tx, x[1], tw, th); stacks(x[0], tx, x[1], tw, th, ps, wide ? 'r' : 'b', o, x0 + 5, x0 + colW - 5); });
      });
    } else {
      const rimW = Math.round(W * (N <= 3 ? .5 : .53)); mine = { x: rimW + 6, y: 0, w: W - rimW - 6, h: H };
      const rowH = H / R, pw = Math.round(Math.min(rimW * .3, 150));
      rim.forEach((o, k) => {
        const y0 = k * rowH, col = matN(o); col.className = 'an-pm wn-col wn-lane' + (V.turn === o && !G.over && G.ph !== 'setup' ? ' on' : '') + (S.P[o].out ? ' out' : ''); col.style.setProperty('--pc', 'var(--pc' + o + ')'); put(col, 0, y0 + 1, rimW, rowH - 2);
        const pl = plateEl(o, rowH > 50 ? 'l' : 'w'); pl.style.fontSize = Math.max(9, Math.min(14, rowH * .2, (pw - 4) / (rowH > 50 ? 9 : 11.5))).toFixed(1) + 'px'; put(pl, 3, y0 + 3, pw - 4, rowH - 6);
        const cellW = (rimW - pw) / 2; let th = Math.round(Math.min(rowH - 10, 110)), tw = Math.round(th / .74), ps = Math.round(Math.max(16, Math.min(th * .44, 30)));
        if (tw + ps + 12 > cellW) { tw = Math.round(cellW - ps - 12); th = Math.round(tw * .74); }
        [2 * o, 2 * o + 1].forEach((i, j) => { const x = pw + j * cellW + 4, y = y0 + rowH / 2 - th / 2; put(tileAt(i, tw, th), x, y, tw, th); stacks(i, x, y, tw, th, ps, 'r', o, x, pw + (j + 1) * cellW - 2); });
      });
    }
    // your three rows: the Crossroads, your Outpost, your Gate, drawn as the two-player rows are, on your own mat
    // (the tiles as wide as the two-player rows' where the room allows: on an iPad wide and low as there, on a phone taller)
    const rh = mine.h / 3, mw = Math.round(Math.min(mine.w * (land ? .4 : mine.w > 560 ? .42 : .38), 300, (rh - 6) * (mine.w > 560 ? 2.4 : 1 / .62))), bh = Math.round(Math.min(rh - 8, mw * .64));
    // (your Figures as cards: as big as the row and the room beside the tile allow for the most you have in one row, two
    // at least; the engraved places for the rest of the three are drawn where they fit)
    const sideW = (mine.w - mw) / 2 - 10, most = Math.max(2, Math.max.apply(null, [2 * N, 2 * v + 1, 2 * v].map(i => V.figs.filter(f => f.p === i && f.o === v).length + (T.places[i] ? 1 : 0))));
    const fw = Math.floor(Math.max(24, Math.min((rh - 10) / 1.36, sideW / (most * 1.1), 96))), slots = Math.max(most, Math.min(3, Math.floor((sideW + 4) / (fw * 1.1))));
    const mm = matN(v); mm.className = 'an-pm wn-col wn-mine' + (V.turn === v && !G.over && G.ph !== 'setup' ? ' on' : ''); mm.style.setProperty('--pc', 'var(--pc' + v + ')'); put(mm, mine.x, mine.y + rh - 2, mine.w, mine.h - rh + 2);
    [2 * N, 2 * v + 1, 2 * v].forEach((i, r) => {
      const row = X ? suRow(i, X) : rowEl(i, T, { many: true, slots: slots });
      row.style.setProperty('--mw', mw + 'px'); row.style.setProperty('--fw', fw + 'px'); row.style.setProperty('--sw', Math.round(Math.min(fw * .92, X ? (sideW - 4) / (N - 1) - 10 : (sideW - 8) / 2.2, (rh - 12) / 1.42)) + 'px');   // (the set-up: everyone else's offers in one line)
      put(row, mine.x, mine.y + r * rh + (rh - bh) / 2, mine.w, bh);
    });
    fitRim();
    if (!X) roadsN(land);
  }
  function fitRim() {
    // (a plate's words and marks fit inside it: its size steps down until nothing runs over its edge)
    dom.map.querySelectorAll('.wn-plate').forEach(pl => { let fs = parseFloat(pl.style.fontSize) || 12; const r = pl.getBoundingClientRect();
      const over = () => pl.scrollWidth > pl.clientWidth + 1 || Array.prototype.some.call(pl.querySelectorAll('.st-name, .st-ren, .st-bot, .st-guide'), c => { const b = c.getBoundingClientRect(); return b.right > r.right + 1 || b.bottom > r.bottom + 1; }) || (() => { const bt = pl.querySelector('.st-hand'), rn = pl.querySelector('.lau'); if (!bt || !rn) return false; const a = bt.getBoundingClientRect(), b = rn.getBoundingClientRect(); return a.right + a.width * .9 > b.left && a.bottom > b.top && a.top < b.bottom; })();
      while (over() && fs > 8) { fs -= .5; pl.style.fontSize = fs + 'px'; } });
    const ns = Array.prototype.slice.call(dom.map.querySelectorAll('.wn-nm .pl-name')); if (!ns.length) return;
    const bad = () => ns.some(n => { const t = n.closest('.pl-tile'), sl = n.parentNode; return n.scrollWidth > n.clientWidth + 1 || sl.getBoundingClientRect().height > t.getBoundingClientRect().height * .5; });
    let fs = parseFloat(ns[0].style.fontSize) || 12;
    while (bad() && fs > 9) { fs -= .5; ns.forEach(n => { n.style.fontSize = fs + 'px'; }); }
    ns.forEach(n => { const t = n.closest('.pl-tile'), sl = n.parentNode; if (n.scrollWidth > n.clientWidth + 1 || sl.getBoundingClientRect().height > t.getBoundingClientRect().height * .5) { sl.remove(); t.classList.add('bare'); } });
  }
  // The roads, drawn from where the tiles lie: each spoke's Gate to its Outpost, each Outpost to the Crossroads, and
  // round the ring from Outpost to Outpost; lit gold where the Figure picked up can walk.
  function roadsN(land) {
    const M = dom.map, mr = M.getBoundingClientRect(), N = S.N, v = ui.view, box = {};
    M.querySelectorAll('.pl[data-p]').forEach(n => { const t = n.querySelector('.pl-tile') || n, r = t.getBoundingClientRect(); box[n.dataset.p] = { x: r.left - mr.left, y: r.top - mr.top, w: r.width, h: r.height, cx: r.left - mr.left + r.width / 2, cy: r.top - mr.top + r.height / 2 }; });
    const sel = ui.sel && ui.sel.kind === 'fig' && idle() ? E.byU(S, ui.sel.u) : null, from = sel ? sel.p : -1, T = sel ? targets() : null;
    const X = box[2 * N], O = box[2 * v + 1]; if (!X || !O) return;
    let d = '', lit = '', d2 = '', ringD = '';
    const seg = (a, b, path) => { const on = from >= 0 && ((a === from && T.places[b]) || (b === from && T.places[a])); if (on) lit += path; else d += path; };
    for (let o = 0; o < N; o++) {
      const g = box[2 * o], u = box[2 * o + 1]; if (!g || !u) continue;
      if (o === v) { seg(2 * o, 2 * o + 1, 'M' + u.cx + ' ' + (u.y + u.h) + 'V' + g.y); seg(2 * o + 1, 2 * N, 'M' + u.cx + ' ' + u.y + 'V' + (X.y + X.h)); continue; }
      seg(2 * o, 2 * o + 1, land ? 'M' + (g.x + g.w) + ' ' + g.cy + 'H' + u.x : 'M' + g.cx + ' ' + (g.y + g.h) + 'V' + u.y);
      seg(2 * o + 1, 2 * N, land ? 'M' + (u.x + u.w) + ' ' + u.cy + 'Q' + (X.x - 16) + ' ' + u.cy + ' ' + X.x + ' ' + (X.cy + (u.cy - X.cy) * .25) : 'M' + u.cx + ' ' + (u.y + u.h) + 'Q' + u.cx + ' ' + (X.y - 10) + ' ' + (X.cx + (u.cx - X.cx) * .2) + ' ' + X.y);
    }
    // round the ring: between neighbours on the rim straight across, and from your two neighbours round to your Outpost
    if (N >= 3) for (let o = 0; o < N; o++) {
      const q = (o + 1) % N, a = box[2 * o + 1], b = box[2 * q + 1]; if (!a || !b) continue; let path;
      if (o === v || q === v) { const w = o === v ? b : a, side = (o === v ? 1 : -1);   // (the player on your left is at the left)
        path = land ? 'M' + (w.x + w.w / 2) + ' ' + (w.y + (w.cy < O.cy ? w.h : 0)) + 'C' + (w.x + w.w / 2) + ' ' + O.cy + ' ' + (O.x - 30) + ' ' + O.cy + ' ' + O.x + ' ' + O.cy
          : 'M' + w.cx + ' ' + (w.y + w.h) + 'C' + (side < 0 ? 4 : mr.width - 4) + ' ' + (w.y + w.h + 40) + ' ' + (side < 0 ? 4 : mr.width - 4) + ' ' + O.cy + ' ' + (side < 0 ? O.x : O.x + O.w) + ' ' + O.cy;}
      else path = land ? 'M' + a.cx + ' ' + (a.y + a.h) + 'L' + b.cx + ' ' + b.y : 'M' + (a.x + a.w) + ' ' + a.cy + 'L' + b.x + ' ' + b.cy;
      const on = from >= 0 && ((2 * o + 1 === from && T.places[2 * q + 1]) || (2 * q + 1 === from && T.places[2 * o + 1]));
      if (on) lit += path; else if (o === v || q === v) ringD += path; else d2 += path;
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'wn-roads'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<path class="rd" d="' + d + '"/>' + (d2 ? '<path class="rd ring" d="' + d2 + '"/>' : '') + (ringD ? '<path class="rd ring" d="' + ringD + '"/>' : '') + (lit ? '<path class="rd lit" d="' + lit + '"/>' : '');
    M.insertBefore(svg, M.firstChild);
  }

  // ═══ Picking things up: what can this card or Figure do? ══════════════════════════════════════════════════
  function legal() { ui.acts = idle() ? E.actions(S) : []; }
  function seqOf(a) {
    const q = [], s = ui.sel;
    if (s.kind === 'fig') { q.push(a.t === 'clash' ? ['f', a.v] : ['p', a.p]); return q; }
    if (a.t === 'fig') q.push(['p', a.p]);
    else if (a.t === 'clash') { q.push(['f', a.u]); q.push(['f', a.v]); }
    else if (a.t === 'deed') { if (a.w != null) q.push(['p', 2 * a.w]); if (a.h2 != null) q.push(['h', a.h2]); if (a.u != null) q.push(['f', a.u]); if (a.v != null) q.push(['f', a.v]); if (a.p != null) q.push(['p', a.p]); if (a.q != null) q.push(['p', a.q]); }
    return q;
  }
  const NOT = { places: {}, figs: {}, hand: {}, done: [] };
  function targets() {
    if (ui.pend) return pendTargets();
    const s = ui.sel; if (!s || !idle()) return NOT;
    const out = { places: {}, figs: {}, hand: {}, done: [] }, n = s.picks.length;
    s.acts.forEach(a => {
      const q = seqOf(a); for (let i = 0; i < n; i++) if (!q[i] || q[i][0] !== s.picks[i].k || q[i][1] !== s.picks[i].v) return;
      if (q.length === n) { out.done.push(a); return; }
      const b = q[n][0] === 'p' ? out.places : q[n][0] === 'h' ? out.hand : out.figs; (b[q[n][1]] = b[q[n][1]] || []).push(a);
    });
    return out;
  }
  function selCost() { const s = ui.sel, o = S.turn; if (!s || s.kind !== 'hand') return null; const cs = s.acts.map(a => E.costOf(S, o, s.key, a.t === 'fig' ? a.p : undefined)); return cs.length ? Math.min.apply(null, cs) : E.costOf(S, o, s.key); }
  function simulate(a) { const T = E.clone(S); T.turn = S.turn; E.apply(T, a.x ? Object.assign({}, a, { x: 0 }) : a, 0, 0); return T; }   // (a.x would turn up a Domain nobody has seen yet)
  // what a Figure landing at a Place would cost and how strong it would stand there
  // (a Deed that brings a Figure in from the hand: Night Crossing, and the Trojan Horse in a game saved with one)
  const carries = key => !!key && !!CARDS[key] && E.fxOf(key) === 'trojan';
  function landPreview(acts) {
    const a = acts[0], t = a.t, o = S.turn;
    const moves = t === 'fig' || t === 'walk' || t === 'antik' || t === 'tub' || (t === 'deed' && ((ui.sel.key && E.fxOf(ui.sel.key) === 'fairwinds') || carries(ui.sel.key)));
    if (!moves) return null;
    const T = simulate(a), f = t === 'fig' || carries(ui.sel.key) ? E.byU(T, S.uid) : E.byU(T, a.u);
    const via = acts.every(x => x.t === 'antik') ? (E.relicOf(S.P[o], 'antikythera') || 'antikythera') : acts.every(x => x.t === 'tub') ? S.P[o].guide : null;
    return { cost: t === 'fig' ? E.costOf(S, o, ui.sel.key, a.p) : null, m: f ? E.might(T, f, 0) : null, via: via };
  }
  function clashPreview(acts) {
    const a = acts.filter(x => !x.ph)[0] || acts[0], s = ui.sel;
    const fight = a.t === 'clash' || (a.t === 'deed' && !!s.key && E.fxOf(s.key) === 'ambush'); if (!fight) return null;
    const last = s.picks.length ? s.picks[s.picks.length - 1] : null;
    if (s.kind === 'hand' && !(last && last.k === 'f')) return null;   // (first pick which of yours fights)
    const f = E.byU(S, a.u), g = E.byU(S, a.v); if (!f || !g) return null;
    return [Math.floor(E.might(S, f, 1, g) + (a.t === 'deed' ? 1 : 0) + (a.ph ? 2 : 0)), Math.floor(E.might(S, g, 2, f))];
  }
  function select(sel) {
    const o = S.turn, hand = S.P[o].hand;
    if (sel.kind === 'hand') { sel.key = hand[sel.h]; sel.acts = ui.acts.filter(a => (a.h != null && hand[a.h] === sel.key) || (E.fxOf(sel.key) === 'phalanx' && a.t === 'clash' && a.ph && hand[a.hq] === sel.key)); }
    else sel.acts = ui.acts.filter(a => a.u === sel.u && (a.t === 'walk' || a.t === 'clash' || a.t === 'antik' || a.t === 'tub'));
    sel.picks = []; ui.sel = sel; Kit.sfx('slide'); Kit.haptic('light'); render();
  }
  function clearSel() { if (ui.sel) { ui.sel = null; render(); } }
  function pick(k, v) {
    ui.sel.picks.push({ k: k, v: v }); Kit.sfx('tap'); Kit.haptic('light');
    const T = targets();
    if (T.done.length && !Object.keys(T.places).length && !Object.keys(T.figs).length && !Object.keys(T.hand).length) finishPick(T.done); else render();
  }
  // the Quick Deed that goes with a clash (a.ph): Phalanx, or any card with its effect, by its place in the hand
  const quickOf = a => { const P = S.P[S.turn], h = a.hq != null ? a.hq : E.quicks(P)[0]; return h != null && P.hand[h] && E.fxOf(P.hand[h]) === 'phalanx' ? P.hand[h] : null; };
  function actLabel(a) {
    if (a.t === 'walk') return { label: 'Walk', sub: 'This Figure’s move for this turn' };
    if (a.t === 'tub') return { label: 'Free step', sub: TXG[S.P[S.turn].guide].n + ', once a turn' };
    if (a.t === 'antik') return { label: 'Jump', sub: info(E.relicOf(S.P[S.turn], 'antikythera') || 'antikythera').n + '. Done for the turn' };
    if (a.t === 'clash') { const qk = a.ph ? quickOf(a) : null; return qk ? { label: 'Clash with ' + CARDS[qk].n, sub: '+2 Might for ' + E.costOf(S, S.turn, qk) + ' Spark' } : { label: 'Clash' }; }
    if (a.t === 'fig' && a.x) { const arr = (CARDS[S.P[S.turn].hand[a.h]].arr || [])[0];   // (Constantine, William the Conqueror: the "you may" on the card)
      return { label: 'Play, and change the Domain', sub: arr === 'found' ? 'The top Domain of your stack is laid at the Crossroads.' : 'The Domain here is discarded, and ' + pname(a.p >> 1) + ' lays the top Domain of their stack.' }; }
    return { label: 'Play' };
  }
  function finishPick(acts) {
    if (acts.length === 1) return doHuman(acts[0]);
    const s = ui.sel, who = info(s.kind === 'hand' ? s.key : E.byU(S, s.u).c).n, rank = { walk: 0, tub: 1, antik: 2, clash: 0 };
    acts = acts.slice().sort((x, y) => (rank[x.t] || 0) - (rank[y.t] || 0) || (x.ph ? 1 : 0) - (y.ph ? 1 : 0) || (x.x ? 1 : 0) - (y.x ? 1 : 0));
    const to = acts[0].p != null && acts[0].t !== 'clash' ? ' to ' + (/^(The|the) /.test(C.PLACES[S.places[acts[0].p]].n) ? '' : /^(Great Wall|Colosseum|Acropolis|Silk Road|Globe Theatre|Library)/.test(C.PLACES[S.places[acts[0].p]].n) ? 'the ' : '') + C.PLACES[S.places[acts[0].p]].n : '';
    Kit.sheet({ title: who + to, actions: acts.map(a => Object.assign(actLabel(a), { primary: a === acts[0], onClick: () => doHuman(a) })), onCancel: () => { if (ui.sel) { ui.sel.picks.pop(); render(); } } });
  }
  // ═══ A choice of Domain (S.pend) ═══
  // Pachacuti (the top three of your stack), Al-Idrisi (your whole stack) and Christopher Wren (your Domain discard
  // pile) let you lay one Domain at your Gate or your Outpost: the Domains on offer take the hand's place, a tap picks
  // one up and your Gate and Outpost light; a tap on one lays it there. The button where End turn is lays none. A 6 on
  // the Congress of Vienna's dice names the Domain you choose: the Domains it can name light on the map.
  function askPend() {
    return new Promise(res => {
      const q = S.pend, acts = E.pendActions(S);
      ui.pend = { q: q, acts: acts, sel: q.k === 'congress' ? null : (acts.filter(a => a.id).length && new Set(acts.filter(a => a.id).map(a => a.id)).size === 1 ? acts.filter(a => a.id)[0].id : null), x: -1, res: a => { ui.pend = null; res(a); } };
      setBusy(false); Kit.sfx('flip'); render();
    });
  }
  function pendTargets() {
    const P = ui.pend, out = { places: {}, figs: {}, hand: {}, done: [] };
    if (P.q.k === 'congress') {
      if (P.q.fixed >= 0) P.acts.forEach(a => { (out.places[a.q] = out.places[a.q] || []).push(a); });
      else if (P.x < 0) P.acts.forEach(a => { out.places[a.p] = out.places[a.p] || [a]; out.places[a.q] = out.places[a.q] || [a]; });
      else P.acts.forEach(a => { const y = a.p === P.x ? a.q : a.q === P.x ? a.p : -1; if (y >= 0) (out.places[y] = out.places[y] || []).push(a); });
      return out;
    }
    if (P.sel) P.acts.forEach(a => { if (a.id === P.sel) (out.places[a.p] = out.places[a.p] || []).push(a); });
    return out;
  }
  function pendHand(n) {
    const P = ui.pend; if (P.q.k === 'congress') return;
    const ids = []; P.acts.forEach(a => { if (a.id && ids.indexOf(a.id) < 0) ids.push(a.id); });
    warm(ids);
    ids.forEach(id => n.appendChild(el('button', { type: 'button', class: 'hc' + (P.sel === id ? ' sel' : ' ok'), 'data-pd': id, 'aria-label': C.PLACES[id].n }, [cardEl(id, { mini: true })])));
  }
  function pendCap(n) {
    const P = ui.pend, q = P.q, who = CARDS[q.c] ? CARDS[q.c].n : '', dn = i => theName('@' + S.places[i]);
    let txt;
    if (q.k === 'congress') txt = q.fixed >= 0 ? 'A die shows a 6, so you choose the Domain that changes places with ' + dn(q.fixed) + '. Choosing ' + dn(q.fixed) + ' itself replaces it.'
      : P.x < 0 ? 'Both dice show a 6, so you choose the two Domains that change places.' : 'Now choose the Domain that changes places with ' + dn(P.x) + '. Choosing ' + dn(P.x) + ' again replaces it.';
    else if (q.k === 'scout') txt = who + ' lets you lay one of the top three Domains of your stack at your Gate or your Outpost.';
    else if (q.k === 'survey') txt = who + ' lets you lay any Domain from your stack at your Gate or your Outpost.';
    else txt = who + ' lets you lay a Domain from your discard pile at your Gate or your Outpost.';
    n.appendChild(el('div', { class: 'cap-txt', text: txt }));
  }
  function pendTap(e) {
    const P = ui.pend; if (!P) return;
    const card = e.target.closest('[data-pd]');
    if (card) {
      const id = card.dataset.pd, ids = []; P.acts.forEach(a => { if (a.id && ids.indexOf(a.id) < 0) ids.push(a.id); });
      // (a whole stack is too many to read in the hand: a tap opens them on the strip, and its button chooses the one in front)
      if (ids.length > 6 && P.sel !== id) { browse(ids, { at: ids.indexOf(id), title: P.q.k === 'survey' ? 'Your Domain stack' : 'Your Domain discard pile', pick: { label: 'Lay this Domain', fn: k => { if (ui.pend !== P) return; P.sel = k; Kit.sfx('tap'); render(); } } }); return; }
      if (P.sel === id) { openView(id); return; } P.sel = id; Kit.sfx('tap'); Kit.haptic('light'); render(); return;
    }
    const row = e.target.closest('.pl'); if (!row) return;
    const p = +row.dataset.p, T = pendTargets(), acts = T.places[p];
    if (!acts) { if (P.q.k === 'congress' && P.x >= 0 && p === P.x) { P.x = -1; render(); } return; }
    if (P.q.k === 'congress' && P.q.fixed < 0 && P.x < 0) { P.x = p; Kit.sfx('tap'); Kit.haptic('light'); render(); return; }
    Kit.sfx('deal'); Kit.haptic('medium'); setBusy(true); P.res(acts[0]);
  }
  // A tap on a stack (more players): the Figure in it that a picked-up card or Figure can reach, or the Domain it
  // stands on when that is where it can go; your own Figure in it that can still act; otherwise the stack is read in
  // the scan. When more than one Figure in it could be meant, a sheet asks which.
  function stackTap(stk) {
    const us = stk.dataset.us.split(' ').map(Number), sp = +stk.dataset.p, nm = x => { const f = E.byU(S, x); return f ? CARDS[f.c].n : ''; };
    const which = (xs, title, fn) => Kit.sheet({ title: title, actions: xs.map(x => { const f = E.byU(S, x); return { label: nm(x), sub: f ? E.might(S, f, 0) + ' Might' : '', onClick: () => fn(x) }; }).concat([{ label: 'Cancel', cls: 'btn-soft' }]) });
    if (idle() && !ui.discard) {
      const T = targets(), tg = us.filter(x => T.figs[x]);
      if (tg.length === 1) return pick('f', tg[0]);
      if (tg.length > 1) return which(tg, 'Which Figure in ' + Kit.poss(pname(+stk.dataset.o)) + ' stack?', x => pick('f', x));
      if (T.places[sp]) return pick('p', sp);
      const mv = us.filter(x => { const f = E.byU(S, x); return f && f.o === S.turn && ui.acts.some(a => a.u === x && (a.t === 'walk' || a.t === 'clash' || a.t === 'antik' || a.t === 'tub')); });
      if (mv.length === 1) { if (ui.sel && ui.sel.kind === 'fig' && ui.sel.u === mv[0]) return clearSel(); return select({ kind: 'fig', u: mv[0] }); }
      // (two players, a phone on its side: the stack opens in the scan at its Domain, each card there with what it can do)
      if (mv.length > 1) return many() ? which(mv, 'Which of your Figures?', x => select({ kind: 'fig', u: x })) : scan({ u: mv[0] });
    }
    return G.demo ? openView(CARDS[(vfig(us[0]) || {}).c] ? vfig(us[0]).c : S.places[sp]) : scan({ u: us[0] });
  }
  function onMapTap(e) {
    if (!G) return; if (ui.held) { ui.held = false; return; }
    if (G.ph === 'setup') return suTap(e);
    if (ui.pend) return pendTap(e);
    const stk = e.target.closest('.stk'); if (stk) return stackTap(stk);
    const fpN = e.target.closest('.fp'), row = e.target.closest('.pl'), tile = e.target.closest('.pl-tile');
    const u = fpN ? +fpN.dataset.u : 0, p = row ? +row.dataset.p : -1;
    if (idle() && !ui.discard) {
      const T = targets();
      if (fpN && T.figs[u]) return pick('f', u);
      if (row && T.places[p]) return pick('p', p);
      if (fpN) {
        const f = E.byU(S, u);
        if (f && f.o === S.turn && ui.acts.some(a => a.u === u && (a.t === 'walk' || a.t === 'clash' || a.t === 'antik' || a.t === 'tub'))) {
          if (ui.sel && ui.sel.kind === 'fig' && ui.sel.u === u) return clearSel();
          return select({ kind: 'fig', u: u });
        }
      }
    }
    if (fpN) { const f = V.figs.filter(x => x.u === u)[0]; if (f) { if (G.demo) openView(f.c, { u: u }); else scan({ u: u }); } return; }
    if (tile && row) return G.demo ? openView(S.places[p], { p: p }) : scan({ p: p });
    clearSel();
  }
  function onHandTap(e) {
    if (ui.held) { ui.held = false; return; }
    if (G && G.ph === 'setup') return suTap(e);
    if (ui.pend) return pendTap(e);
    const b = e.target.closest('.hc'); if (!b || !G) { clearSel(); return; }
    const h = +b.dataset.h, key = V.P[ui.view].hand[h];
    if (ui.discard && idle()) return discardOne(h);
    if (!idle()) return G.demo ? openView(key, { list: V.P[ui.view].hand.slice(), at: h }) : scan({ h: h });
    const T = targets();
    if (T.hand[h]) return pick('h', h);
    if (ui.sel && ui.sel.kind === 'hand' && ui.sel.h === h) return clearSel();
    select({ kind: 'hand', h: h });
  }
  function roundSheet() {
    Kit.sfx('tap');
    const st = E.stake(S.cfg, S.round);
    Kit.sheet({ title: 'Round ' + S.round, html: DW((S.cfg.ramp ? '<p>Each Place you hold when the round ends scores <b>' + st + ' Renown</b>' + (st > 1 ? '.' : ' (2 from round 4 on).') + ' The number on a Place\'s banner is what it scores.</p>'
      : '<p>Each Place you hold when the round ends scores <b>1 Renown</b>' + (!S.dm && S.places.indexOf('acropolis') >= 0 ? ', and the Acropolis scores 2' : '') + '. A Place scores the same in every round of the game, and the number on its banner is what it scores.</p>') +
      (S.N > 2 ? '<p>The first ' + (G.teams ? 'team' : 'player') + ' to reach <b>' + S.cfg.target + ' Renown</b>' + (G.teams ? ' between them' : '') + ' at the end of a round wins. Whoever has the most Renown goes first, and the turns go round the table to the left. This round the turns go ' + esc(listOf((G.ord || E.order(S)).map(o => (o === ui.view && human(o) && G.mode === 'cpu' ? 'you' : pname(o))), 'then')) + '.</p>'
        : '<p>The first player to reach <b>' + S.cfg.target + ' Renown</b> at the end of a round wins. Whoever has more Renown goes first, so the player behind has the last word.</p>')), actions: [{ label: 'Got it', cls: 'btn-soft' }] });
  }

  // ═══ Motion ══════════════════════════════════════════════════════════════════════════════════════════════
  const wait = ms => new Promise(r => setTimeout(r, ms / speed));
  function anim(node, frames, o) {
    if (!node || !node.animate) return Promise.resolve();
    o = typeof o === 'number' ? { duration: o } : Object.assign({}, o); o.duration = (o.duration || 300) / speed; if (o.delay) o.delay /= speed;
    return new Promise(res => { try { const a = node.animate(frames, o); a.onfinish = res; a.oncancel = res; } catch (e) { res(); } });
  }
  const rc = n => n ? n.getBoundingClientRect() : null;
  const q = s => dom.root.querySelector(s);
  function fly(node, from, to, o) {
    o = o || {}; if (!from || !to) return Promise.resolve();
    node.classList.add('fly'); dom.fx.appendChild(node);
    const s0 = o.s0 || 1, s1 = (to.width / from.width) * s0;
    const f0 = 'translate(' + from.left + 'px,' + from.top + 'px) scale(' + s0 + ')', f1 = 'translate(' + to.left + 'px,' + to.top + 'px) scale(' + s1 + ')';
    const frames = [{ transform: f0, opacity: o.o0 == null ? 1 : o.o0 }, { transform: f1, opacity: o.o1 == null ? 1 : o.o1 }];
    if (o.arc) frames.splice(1, 0, { transform: 'translate(' + (from.left + to.left) / 2 + 'px,' + (Math.min(from.top, to.top) - o.arc) + 'px) scale(' + (s0 + s1) / 2 * 1.15 + ')', opacity: 1 });
    return anim(node, frames, { duration: o.ms || 450, easing: o.ease || 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }).then(() => node.remove());
  }
  function flyCard(key, from, to, o) { const c = cardEl(key, { mini: true, now: true }); c.style.fontSize = (from.width / 30) + 'px'; return fly(c, from, to, o); }
  // "+2" drifting from where it was won to that player's wreath
  function plus(n, from, o, what) {
    const dest = rc(q('.an-strip.p' + o + (what === 'spark' ? ' .st-spark' : ' .lau'))); if (!from || !dest) return Promise.resolve();
    const node = el('div', { class: 'plus', html: '+' + n + (what === 'spark' ? '<img src="anoria/ui/mark-spark.webp" alt="">' : LAUREL) });
    const a = { left: from.left + from.width / 2 - 18, top: from.top + from.height / 2 - 12, width: 40 }, b = { left: dest.left + dest.width / 2 - 14, top: dest.top, width: 26 };
    return fly(node, a, b, { ms: 700, arc: 26, ease: 'cubic-bezier(.4,0,.2,1)' });
  }
  function bump(sel) { const n = q(sel); if (n) { n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); } }
  // re-draw, sliding every Figure that changed place from where it stood
  // (only: the Figures that moved; one that leaves or joins a stack, with more players, goes as a card flying from
  // where it was to where it is now, over the stack it joins)
  function renderFlip(ms, only) {
    const before = {}; dom.map.querySelectorAll('.fp').forEach(n => { before[n.dataset.u] = n.getBoundingClientRect(); });
    const sb = {}; dom.map.querySelectorAll('.stk').forEach(n => { const r = n.getBoundingClientRect(); n.dataset.us.split(' ').forEach(u => { sb[u] = r; }); });
    render();
    const ps = [];
    (only || []).forEach(u => {
      const a = before[u] || sb[u], n = figN(u), f = vfig(u); if (!a || !n || !f || (before[u] && n.classList.contains('fp'))) return;
      const b = n.getBoundingClientRect(); if (Math.abs(a.left - b.left) + Math.abs(a.top - b.top) < 2) return;
      const fp = n.classList.contains('fp'); if (fp) n.style.visibility = 'hidden';
      ps.push(flyCard(f.c, a, b, { ms: ms || 420, arc: 22 }).then(() => { if (fp) n.style.visibility = ''; else { n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); } }));
    });
    dom.map.querySelectorAll('.fp').forEach(n => {
      const b = before[n.dataset.u]; if (!b) return; const a = n.getBoundingClientRect(), dx = b.left - a.left, dy = b.top - a.top;
      if (Math.abs(dx) + Math.abs(dy) < 2) return;
      n.style.zIndex = 6;
      ps.push(anim(n, [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'translate(' + dx / 2 + 'px,' + (dy / 2 - 10) + 'px) scale(1.12)', offset: .5 }, { transform: 'none' }], { duration: ms || 420, easing: 'cubic-bezier(.3,.1,.3,1)' }).then(() => { n.style.zIndex = ''; }));
    });
    return Promise.all(ps);
  }
  function showCard(key, ms) {
    const n = el('div', { class: 'show-card in' }, [cardEl(key, { now: true })]); document.body.appendChild(n);
    return wait(ms).then(() => anim(n, [{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%,-56%) scale(.9)' }], { duration: 200, fill: 'forwards' })).then(() => n.remove());
  }
  // The Tribune's Veto coming down across the Deed it cancels: the Deed is held up, the Veto slides in from its player's
  // side and lands on it, the Deed goes grey and struck through, and both drop away
  async function vetoShow(dc, vc, vo) {
    const n = el('div', { class: 'show-card in an-veto' + (vo === ui.view ? ' mine' : '') }, [cardEl(dc, { now: true })]); document.body.appendChild(n);
    await wait(700);
    const v = el('div', { class: 'vt-card' }, [cardEl(vc, { now: true })]); n.appendChild(el('i', { class: 'vt-x' })); n.appendChild(v); Kit.sfx('whoosh');
    await wait(360); n.classList.add('struck'); Kit.sfx('clash'); Kit.haptic('heavy');
    await wait(1100);
    await anim(n, [{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%,-30%) scale(.7) rotate(-6deg)' }], { duration: 300, fill: 'forwards' }); n.remove();
  }
  // A Deed's mark pressed onto a Domain's tile: it comes down large over the tile and settles where it lies until the
  // count (the Peace of Westphalia, the Edict of Milan)
  async function stampTile(p, html, o) {
    const t = dom.map.querySelector('.pl[data-p="' + p + '"] .pl-tile'); Kit.sfx('pop'); Kit.haptic('medium'); if (!t) { await wait(500); return; }
    t.classList.remove('dbl'); void t.offsetWidth; t.classList.add('dbl'); const r = rc(t); if (!r) return;
    const x = el('div', { class: 'tile-stamp', html: html, style: { left: (r.left + r.width / 2) + 'px', top: (r.top + r.height / 2) + 'px', '--pc': 'var(--pc' + o + ')' } }); dom.fx.appendChild(x);
    await wait(1100); x.remove();
  }
  // x2 stamped, in the player's colour, on the banner of each Domain a Deed doubles for them
  async function doubled(ps, o) {
    Kit.sfx('sparkle'); Kit.haptic('medium');
    ps.forEach((p, k) => { const t = dom.map.querySelector('.pl[data-p="' + p + '"] .pl-tile'); if (!t) return; t.classList.remove('dbl'); void t.offsetWidth; t.classList.add('dbl');
      const r = rc(t.querySelector('.pl-flag') || t); if (!r) return; const x = el('div', { class: 'dbl-x', text: '\u00d72', style: { left: (r.left + r.width / 2) + 'px', top: (r.top + r.height / 2) + 'px', animationDelay: (k * 90) + 'ms', color: (G.players[o] && G.players[o].color) || PCOL[o] } }); dom.fx.appendChild(x); setTimeout(() => x.remove(), 1500 + k * 90); });
    await wait(1100);
  }
  function banner(k, t, s) {
    const n = el('div', { class: 'an-banner' }, [k ? el('div', { class: 'k', text: k }) : null, el('div', { class: 't', text: t }), s ? el('div', { class: 's', html: s }) : null]);
    if (speed > 1) n.style.animationDuration = '.7s';
    document.body.appendChild(n); return wait(1900).then(() => n.remove());
  }
  const vfig = u => V.figs.filter(f => f.u === u)[0];
  const handRect = (o, h) => (o === ui.view && !ui.hideHand ? rc(dom.hand.querySelector('.hc[data-h="' + h + '"]')) : null) || rc(q('.an-strip.p' + o + ' .st-hand')) || rc(q('.an-strip.p' + o + ' .st-guide'));
  const told = {};
  // The true story behind a Legacy line or a Thread, told once a game when it first forms: the two cards joined by a
  // gold thread and the sentence, on a plate of the table's own (top of the screen upright, over the map sideways:
  // never over the hand or the buttons). A tap puts it away.
  function story(key, ren, kind) {
    const t = TX.LINKS && TX.LINKS[key]; if (!t || told[key] === gen) return false; told[key] = gen;
    const ab = key.split('>'), th = k => { const sp = el('span', { class: 'sy-th', style: { '--f': (FAC[info(k).f] || FAC.N).c } }); const im = artImg(k, true, true) || mono(k); if (im) sp.appendChild(im); return sp; };
    document.querySelectorAll('.an-story').forEach(x => x.remove());
    const n = el('div', { class: 'an-story', role: 'status' }, [el('div', { class: 'sy-pair', 'aria-hidden': 'true' }, [th(ab[0].replace(/^@/, '')), el('i'), th(ab[1])]),
      el('div', { class: 'sy-tx' }, [el('div', { class: 'sy-k' }, [el('span', { text: kind || 'A Legacy Line' }), ren ? el('b', { text: '+' + ren + ' Renown' }) : null]), el('p', { text: t })])]);
    // (a lesson's caption may be at the top of the screen: the story sits under it)
    const away = () => { n.classList.remove('show'); setTimeout(() => n.remove(), 260); };
    n.addEventListener('click', away); document.body.appendChild(n);
    // (a lesson's caption may be where the story goes: the story sits under it, or over it if there's no room below)
    const cap = document.querySelector('.gd-plate.on');
    if (cap) { const cb = cap.getBoundingClientRect(), r = n.getBoundingClientRect();
      if (Math.min(r.right, cb.right) > Math.max(r.left, cb.left) && r.top < cb.bottom + 8 && r.top + r.height + 14 > cb.top)
        n.style.top = Math.round(cb.bottom + 8 + r.height < window.innerHeight - 8 ? cb.bottom + 8 : Math.max(0, cb.top - r.height - 8)) + 'px'; }
    requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add('show'))); setTimeout(away, 5600);
    return true;
  }
  function dropHand(o, h) { if (h != null && h >= 0) V.P[o].hand.splice(h, 1); }

  // The clash: the two lunge, both dice tumble, the totals land, the loser's card tears in half
  async function clashShow(ev, ctx) {
    const a = vfig(ev.a), d = vfig(ev.d); if (!a || !d) return;
    const rU = a.o === ui.view ? a.u : d.u;   // (on the right: your Figure; between two other players, the one attacked)
    const am0 = Math.floor(ev.am - ev.da), dm0 = Math.floor(ev.dm - ev.dd), am = Math.floor(ev.am), dm = Math.floor(ev.dm);
    const res = ev.am > ev.dm ? 'a' : ev.dm > ev.am ? 'd' : '';
    // (plain dice: the face rolled, then what it was worth, +1 or +2 for the higher roll. Older games: a die of 0, 1, 2)
    const plain = !!S.cfg.dice;
    function side(f, base, die, total, att, face) {
      const dn = Kit.die(1); dn.setAttribute('data-v', plain ? face : die); dn.setAttribute('aria-label', 'Die showing ' + (plain ? face : die)); dn.tabIndex = -1; dn.style.visibility = 'hidden';
      const won = plain ? el('span', { class: 'cl-plus' + (die ? '' : ' none'), style: { visibility: 'hidden' }, text: die ? '+' + die : '' }) : null;
      const tot = el('span', { class: 'sh big', style: { visibility: 'hidden' } }, [el('b', { text: String(total) })]);
      // Phalanx is not a line of small print: its card comes in under the Figure it helps (aid(), below), and the
      // Might it adds is counted then. Until it does, the shields show the numbers without it.
      const ph = (att && ctx.a && ctx.a.ph) || (!att && ctx.quick) ? Math.min(2, Math.max(0, base - f.m)) : 0;
      const st = att && stK ? 1 : 0, hold = ph + st;   // (Damascus Steel's +1 is held back until its card comes in)
      const extra = base - f.m - hold, notes = [];
      if (att && ctx.a && ctx.a.t === 'deed') notes.push(ctx.key && CARDS[ctx.key] ? CARDS[ctx.key].n : 'Ambush');   // (Ambush, or the Deed with its effect, by its own name)
      const note = extra > 0 ? (notes.length ? notes.join(', ') : att ? 'Attacking' : 'Defending') + ' +' + extra : '';
      const bs = el('span', { class: 'sh' }, [el('b', { text: String(base - hold) })]);
      if (hold) tot.firstChild.textContent = String(total - hold);
      const n = el('div', { class: 'cl-side o' + f.o + ' ' + (f.u === rU ? 'R' : 'L') }, [
        el('div', { class: 'cl-card' }, [cardEl(f.c, { mini: true, might: f.m, now: true })]), el('div', { class: 'cl-nm', text: CARDS[f.c].n }),
        el('div', { class: 'cl-sum' }, [bs, dn, won, tot]), el('div', { class: 'cl-note', text: note })]);
      return { n: n, die: dn, tot: tot, won: won, card: n.querySelector('.cl-card'), note: n.querySelector('.cl-note'), base: bs, ph: ph, st: st, hold: hold, b: base, t: total, shown: false };
    }
    // the Phalanx card slides in under its Figure, lands, and its +2 goes onto the shields
    // (key: the Defence of Syracuse or Testudo, which come in the same way and add no Might: no number on them.
    // n: what it adds, when that is not Phalanx's: Damascus Steel's +1, which comes in before the dice, in a second slot
    // when Phalanx comes too)
    async function aid(X, key, n) {
      const add = n != null ? n : key ? 0 : X.ph;
      const c = el('div', { class: 'cl-aid' + (X.n.querySelectorAll('.cl-aid').length ? ' two' : '') + (key && add ? ' hi' : '') }, [cardEl(key || (ctx.qk && CARDS[ctx.qk] ? ctx.qk : 'phalanx'), { mini: true, now: true }), add ? el('b', { class: 'cl-aid-n', text: '+' + add }) : null]);
      X.n.classList.add('aided'); X.n.parentNode.classList.add('aided'); X.card.appendChild(c); Kit.sfx('deal'); await wait(430);
      Kit.sfx('clash', .6); Kit.haptic('medium'); c.classList.add('in');
      X.hold = Math.max(0, X.hold - add);
      X.base.firstChild.textContent = String(X.b - X.hold); X.base.classList.remove('bump'); void X.base.offsetWidth; X.base.classList.add('bump');
      if (X.shown) { X.tot.firstChild.textContent = String(X.t - X.hold); X.tot.classList.remove('bump'); void X.tot.offsetWidth; X.tot.classList.add('bump'); Kit.sfx('good'); }
      else X.tot.firstChild.textContent = String(X.t - X.hold);
      await wait(620);
    }
    const stK = (V.P[a.o].relics || []).find(r => E.fxOf(r) === 'dsteel') || null;   // (Damascus Steel: the attacker's player's Relic)
    const A = side(a, am0, ev.da, am, true, ev.ra), D = side(d, dm0, ev.dd, dm, false, ev.rd), L = a.o === ui.view ? D : A, R = a.o === ui.view ? A : D;
    const ov = el('div', { class: 'clash' }, [el('div', { class: 'cl-in' }, [L.n, el('div', { class: 'cl-vs', html: SVG.swords }), R.n, el('div', { class: 'cl-where', text: C.PLACES[S.places[ev.p]].n })])]);
    document.body.appendChild(ov); void ov.offsetWidth; ov.classList.add('show');
    await wait(420);
    A.card.classList.add('lunge'); D.card.classList.add('lunge'); Kit.sfx('whoosh');
    await wait(230); Kit.sfx('clash'); Kit.haptic('heavy');
    await wait(380);
    if (A.st) await aid(A, stK, 1);   // (Damascus Steel's blade comes in under the attacker: +1 Might when attacking)
    if (A.ph) await aid(A);   // (the attacker chose Phalanx before the dice)
    [A, D].forEach((x, i) => { x.die.style.visibility = ''; x.die.style.setProperty('--dx', (i ? 40 : -40) + 'px'); x.die.classList.add('rolling'); }); Kit.sfx('roll');
    await wait(760);
    if (plain) { [A, D].forEach(x => { x.won.style.visibility = ''; if (!x.won.classList.contains('none')) { x.won.classList.add('bump'); x.die.classList.add('high'); } }); if (ev.da || ev.dd) Kit.sfx('pop'); await wait(380); }
    [A, D].forEach(x => { x.tot.style.visibility = ''; x.tot.classList.add('bump'); x.shown = true; }); Kit.sfx('tick');
    await wait(420);
    if (D.ph) { await wait(380); await aid(D); }   // (the defender's plays itself once the dice have fallen against them)
    if (ui.clashHold) { const h = ui.clashHold; ui.clashHold = null; await h(); }   // (a lesson holds the clash here, totals showing, while its caption is read)
    // The Defence of Syracuse comes to the defender's side and the attacker is driven back, whole; Testudo comes to a
    // beaten attacker's side and it draws back under the shields, whole. Nobody's card is torn.
    const back = X => { X.card.classList.add('driven'); Kit.sfx('whoosh'); Kit.haptic('medium'); };
    if (ev.rep) { await wait(300); await aid(D, ev.rep, 0); D.card.classList.add('win'); back(A); await wait(900); }
    else if (ev.tq && res === 'd') { D.card.classList.add('win'); await wait(200); await aid(A, ev.tq, 0); back(A); await wait(900); }
    else if (res) {
      const W = res === 'a' ? A : D, X = res === 'a' ? D : A, lost = res === 'a' ? d : a;
      if (am === dm) W.note.textContent = 'Sun Tzu wins the tie';
      W.card.classList.add('win');
      const c1 = X.card.firstChild, c2 = c1.cloneNode(true);
      X.card.innerHTML = ''; X.card.appendChild(el('div', { class: 'half a' }, [c1])); X.card.appendChild(el('div', { class: 'half b' }, [c2]));
      void X.card.offsetWidth; X.card.classList.add('torn');
      Kit.sfx('flip'); Kit.sfx(lost.o === ui.view && G.mode === 'cpu' ? 'bad' : 'boom'); Kit.haptic(lost.o === ui.view ? 'error' : 'success');
      await wait(950);
    } else {
      A.note.textContent = D.note.textContent = 'Stand-off'; Kit.sfx('tap'); await wait(900);
    }
    ov.classList.remove('show'); await wait(240); ov.remove();
  }

  // Each kind of event in the engine's log: move what's on screen along by one step
  const EV = {
    async turn(ev) {
      V.turn = ev.o; V.round = ev.round; V.P[ev.o].spark = ev.spark; V.P[ev.o].reserve = 0; V.P[ev.o].sg = 0; V.P[ev.o].debt = 0; V.P[ev.o].uA = V.P[ev.o].uT = V.P[ev.o].uC = V.P[ev.o].uD = V.P[ev.o].uR = 0;
      V.figs.forEach(f => { if (f.o === ev.o) { f.rdy = f.stun ? 0 : 1; f.stun = 0; f.arr = 0; f.acted = 0; } });
      render(); bump('.an-strip.p' + ev.o + ' .st-spark'); Kit.sfx('sparkle'); await wait(420);
    },
    async draw(ev) {
      const p = V.P[ev.o], card = S.P[ev.o].hand[p.hand.length]; if (card == null) return;
      p.deck = Math.max(0, p.deck - 1); p.hand.push(card);
      if (ev.o === ui.view && !ui.hideHand) { ui.dealt = p.hand.length - 1; render(); ui.dealt = 0; } else { render(); bump('.an-strip.p' + ev.o + ' .st-hand b'); }
      Kit.sfx('deal'); await wait(230);
    },
    async arrive(ev, ctx) {
      const o = ev.o, trojan = ctx.a && ctx.a.t === 'deed';
      const h = trojan ? V.P[o].hand.indexOf(ev.c) : ctx.a ? ctx.a.h : -1, from = handRect(o, h);
      if (!trojan) { V.P[o].spark = Math.max(0, V.P[o].spark - (ctx.cost || 0)); if (o !== ui.view) await showCard(ev.c, 950); }
      dropHand(o, h);
      const f0 = S.figs.filter(f => f.u === ev.u)[0];
      V.figs.push({ u: ev.u, c: ev.c, o: o, p: ev.p, rdy: f0 && f0.rdy ? 1 : 0, arr: 1, acted: 0, stun: 0, li: 0, m: f0 ? E.might(S, f0, 0) : CARDS[ev.c].m });
      V.tot[ev.p][o] += CARDS[ev.c].m;
      render();
      const n = figN(ev.u);
      if (n && from) { const fp = n.classList.contains('fp'); if (fp) n.style.visibility = 'hidden'; Kit.sfx('whoosh'); await flyCard(ev.c, from, rc(n), { ms: 480, arc: 30 }); if (fp) n.style.visibility = ''; }
      if (n) { n.classList.add('arrive'); }
      Kit.sfx('deal'); Kit.sfx('tap'); Kit.haptic('medium'); await wait(380);
    },
    async spark(ev) {
      if (ev.why === 'next') V.P[ev.o].sg = Math.max(0, (V.P[ev.o].sg || 0) + ev.n); else V.P[ev.o].spark += ev.n;   // (next: Empress Wu's, or a Domain's, for the next turn; it waits on the strip)
      if (ev.why === 'ransom') V.P[ev.o].uR = 1;   // (Saladin's, once a turn: his portrait takes the used mark)
      const tile = ev.p != null ? dom.map.querySelector('.pl[data-p="' + ev.p + '"] .pl-tile') : null;   // (a Domain's Spark comes from its tile)
      const src = rc(tile || q('.an-strip.p' + ev.o + ' .st-guide')); if (ev.why && !tile) bump('.an-strip.p' + ev.o + ' .st-guide');
      render(); Kit.sfx(ev.n < 0 ? 'bad' : 'chip'); bump('.an-strip.p' + ev.o + ' .st-spark'); if (ev.n > 0) await plus(ev.n, src, ev.o, 'spark'); else await wait(300); },
    // ── Domain powers ── Spark paid at Petra, lent at Florence, a card bought at Timbuktu (the draw follows), Might hired
    // at Carthage, a card back from the discard pile at the House of Wisdom, an Olympic victor
    async toll(ev) { V.P[ev.o].spark = Math.max(0, V.P[ev.o].spark - ev.n); render(); bump('.an-strip.p' + ev.o + ' .st-spark'); Kit.sfx('chip'); await wait(260); },
    async loan(ev) { V.P[ev.o].spark += ev.n; V.P[ev.o].debt = (V.P[ev.o].debt || 0) + ev.n; render(); Kit.sfx('chip'); bump('.an-strip.p' + ev.o + ' .st-spark'); await plus(ev.n, rc(dom.map.querySelector('.pl[data-p="' + ev.p + '"] .pl-tile')), ev.o, 'spark'); },
    async buy(ev) { V.P[ev.o].spark = Math.max(0, V.P[ev.o].spark - 1); render(); bump('.an-strip.p' + ev.o + ' .st-spark'); Kit.sfx('chip'); await wait(200); },
    async hire(ev) { V.P[ev.o].spark = Math.max(0, V.P[ev.o].spark - 1); V.pb[ev.p][ev.o] += ev.n; V.tot[ev.p][ev.o] += ev.n; V.hold[ev.p] = E.holder(S, ev.p); render(); Kit.sfx('pop'); Kit.haptic('medium'); await wait(420); },
    async recall(ev) { V.P[ev.o].hand.push(ev.c); render(); bump('.an-strip.p' + ev.o + ' .st-hand b'); Kit.sfx('deal'); await wait(260); },
    async victor(ev) { const f = vfig(ev.u), g = E.byU(S, ev.u); if (f && g) f.m = E.might(S, g, 0); ui.fresh[ev.u] = 'hop'; render(); ui.fresh = {}; Kit.sfx('good'); await wait(380); },
    // The Lisbon Earthquake: the Domain's row shakes, then every Figure it stops is marked (the stun events after it)
    async quake(ev) {
      const row = dom.map.querySelector('.pl[data-p="' + ev.p + '"]'); Kit.sfx('boom'); Kit.haptic('heavy');
      if (row) { row.classList.remove('quake'); void row.offsetWidth; row.classList.add('quake'); }
      await wait(760); if (row) row.classList.remove('quake');
    },
    // The Walk to Canossa: its card lies on the piece, and the piece's skill mark is struck through until the count
    async hush(ev) {
      const f = vfig(ev.u); if (!f) return; f.hush = 1; V.dip = (S.dip || []).map(d => Object.assign({}, d)); ui.fresh[ev.u] = 'hushin'; render(); ui.fresh = {};
      Kit.sfx('bad'); Kit.haptic('medium'); await wait(820);
    },
    async stun(ev) { const f = vfig(ev.u); if (!f) return; f.stun = 1; ui.fresh[ev.u] = 'zap'; render(); ui.fresh = {}; Kit.sfx('bad'); Kit.haptic('light'); await wait(480); },
    async move(ev) {
      const f = vfig(ev.u); if (!f) return;
      const n0 = figN(ev.u), r0 = rc(n0);
      f.p = ev.to; f.rdy = 0;
      if (ev.jump && r0) {
        // a jump: a streak of gold across the map
        if (n0 && n0.classList.contains('fp')) await anim(n0, [{ transform: 'none', opacity: 1 }, { transform: 'scale(.2)', opacity: 0 }], { duration: 160, fill: 'forwards' });
        render();
        const n1 = figN(ev.u), r1 = rc(n1), hid = n1 && n1.classList.contains('fp'); if (hid) n1.style.visibility = 'hidden'; if (!r1) return;
        const x0 = r0.left + r0.width / 2, y0 = r0.top + r0.height / 2, x1 = r1.left + r1.width / 2, y1 = r1.top + r1.height / 2, len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
        const st = el('div', { class: 'streak', style: { width: len + 'px' } }); dom.fx.appendChild(st);
        const tf = 'translate(' + x0 + 'px,' + y0 + 'px) rotate(' + ang + 'rad) ';
        Kit.sfx('whoosh'); Kit.sfx('sparkle', .6);
        await anim(st, [{ transform: tf + 'scaleX(0)', opacity: 1 }, { transform: tf + 'scaleX(1)', opacity: 1, offset: .6 }, { transform: tf + 'translateX(' + len + 'px) scaleX(0)', opacity: 0 }], { duration: 430, easing: 'ease-in', fill: 'forwards' });
        st.remove(); if (n1) { if (hid) n1.style.visibility = ''; n1.classList.add('arrive'); } Kit.sfx('tap'); Kit.haptic('medium'); await wait(300);
      } else {
        Kit.sfx(ev.push ? 'whoosh' : 'slide'); await renderFlip(ev.push ? 380 : 440, [ev.u]); Kit.sfx('tap'); Kit.haptic('light'); await wait(90);
      }
    },
    async line(ev) {
      const f = vfig(ev.a); if (!f) return; f.li = ev.b; ui.newLine = ev.a; render(); ui.newLine = 0;
      Kit.sfx('sparkle'); Kit.haptic('success'); story(((vfig(ev.b) || {}).c) + '>' + f.c, ev.ren, 'A Legacy Line'); await wait(900);
      if (ev.ren) { V.P[ev.o].renown += ev.ren; const src = rc(figN(ev.a)); await plus(ev.ren, src, ev.o); render(); bump('.an-strip.p' + ev.o + ' .lau b'); Kit.sfx('good'); }
    },
    // (how one led to the other, in a sentence, the first time each link is drawn in a game)
    async thread(ev) {
      const src = ev.src.k === 'fig' ? figN(ev.src.u) : ev.src.k === 'relic' ? q('.an-strip.p' + ev.o + ' .relic[data-relic="' + ev.src.c + '"]') : dom.map.querySelector('.pl[data-p="' + ev.src.p + '"] .pl-tile');
      const to = ev.u ? figN(ev.u) : CARDS[ev.c].t === 'relic' ? q('.an-strip.p' + ev.o + ' .relic[data-relic="' + ev.c + '"]') : q('.an-strip.p' + ev.o + ' .st-guide');
      const from = ev.src.k === 'fig' ? CARDS[(vfig(ev.src.u) || {}).c] : ev.src.k === 'relic' ? CARDS[ev.src.c] : C.PLACES[S.places[ev.src.p]];
      [src, to].forEach(n => { if (n) { n.classList.remove('thread'); void n.offsetWidth; n.classList.add('thread'); } });
      Kit.sfx('sparkle'); Kit.haptic('success');
      // (the link is told on its own plate, the two cards joined by a gold thread with the true sentence under them:
      // not a banner in the site's stock lettering)
      const shown = story((ev.src.k === 'place' ? '@' + S.places[ev.src.p] : ev.src.k === 'relic' ? ev.src.c : (vfig(ev.src.u) || {}).c) + '>' + ev.c, ev.ren);
      await wait(shown ? 1250 : 700);
      if (ev.ren) { V.P[ev.o].renown += ev.ren; await plus(ev.ren, rc(to || src), ev.o); render(); bump('.an-strip.p' + ev.o + ' .lau b'); Kit.sfx('good'); }
    },
    async relic(ev, ctx) {
      const o = ev.o, from = handRect(o, ctx.a.h); if (o !== ui.view) await showCard(ev.c, 900);
      dropHand(o, ctx.a.h); V.P[o].spark = Math.max(0, V.P[o].spark - (ctx.cost || 0)); V.P[o].relics.push(ev.c); render();
      const n = q('.an-strip.p' + o + ' .relic[data-relic="' + ev.c + '"]');
      if (n && from) { n.style.visibility = 'hidden'; Kit.sfx('whoosh'); await flyCard(ev.c, from, rc(n), { ms: 480, arc: 24 }); n.style.visibility = ''; }
      Kit.sfx('chip'); Kit.haptic('medium'); await wait(260);
    },
    async deed(ev, ctx) {
      const o = ev.o, a = ctx.a;
      if (ctx.veto) {   // (the Tribune's Veto plays itself: it comes down across the Deed, which goes to the discard pile having done nothing)
        await vetoShow(ev.c, ctx.veto.c, ctx.veto.o); dropHand(o, a.h); V.P[o].spark = Math.max(0, V.P[o].spark - (ctx.cost || 0)); render(); return; }
      await showCard(ev.c, o === ui.view ? 620 : 1050);
      dropHand(o, a.h);   // (the Figure that a Night Crossing carries leaves the hand as it arrives)
      V.P[o].spark = Math.max(0, V.P[o].spark - (ctx.cost || 0));
      const fx = E.fxOf(ev.c);   // (what the Deed does, whichever Deed it is)
      { const ab = (V.P[o].relics || []).find(r => E.fxOf(r) === 'abacus'); if (ab) bump('.an-strip.p' + o + ' .relic[data-relic="' + ab + '"]'); }   // (the Abacus made it cheaper)
      if (fx === 'caravan') { V.P[o].spark += 3; render(); Kit.sfx('chip'); bump('.an-strip.p' + o + ' .st-spark'); await plus(3, rc(q('.an-strip.p' + o + ' .st-guide')), o, 'spark'); return; }
      if (fx === 'decree') { V.pb[ev.p][o] += 4; V.tot[ev.p][o] += 4; V.hold[ev.p] = E.holder(S, ev.p); render(); Kit.sfx('pop'); Kit.haptic('medium'); await wait(420); return; }
      if (fx === 'eclipse') { V.figs.forEach(f => { if (f.p === ev.p && f.o !== o) { f.stun = 1; ui.fresh[f.u] = 'zap'; } }); render(); ui.fresh = {}; Kit.sfx('bad'); Kit.haptic('medium'); await wait(520); return; }
      if (fx === 'encore') { const f = vfig(ev.u); if (f) { f.rdy = 1; f.arr = 0; ui.fresh[f.u] = 'hop'; } render(); ui.fresh = {}; Kit.sfx('good'); await wait(480); return; }
      // (the Peace of Westphalia and the Edict of Milan: the card's mark is pressed onto the Domain it lies on until the
      // count, the Peace's sheathed swords, the Edict's shield over the player's Figures there, which lift)
      if (fx === 'westphalia' || fx === 'milan') { V.dip = (S.dip || []).map(d => Object.assign({}, d));
        if (fx === 'milan') V.figs.forEach(f => { if (f.p === ev.p && f.o === o) ui.fresh[f.u] = 'hop'; });
        render(); ui.fresh = {}; await stampTile(ev.p, DIPI[fx], o); return; }
      if (fx === 'lisbonquake' || fx === 'canossa') { render(); return; }   // (their moments are their own events: quake, hush)
      // (the four Deeds that double a count: the Domains they double are marked x2 on their banners, which now show what each will score)
      if (fx === 'triumph' || fx === 'medici' || fx === 'holyyear') { render(); await doubled(fx === 'triumph' ? [ev.p] : S.places.map((id, i) => i).filter(i => fx === 'holyyear' || C.PLACES[S.places[i]].d === CARDS[ev.c].dk), o); return; }
      render();
    },
    // ── Domains ── A Domain is laid (ev.old: the one it replaces, which goes to ev.was's Domain discard pile), Domains
    // change places (ev.perm), Vesuvius is laid on one (marker), a player has chosen one (chose). The rows read the
    // engine's state, so drawing the table again shows them where they now lie.
    async domain(ev) {
      if (ev.why === 'setup') return;
      V.mk = S.mk.slice(); V.tot = S.places.map((x, i) => E.mights(S, i)); V.hold = S.places.map((x, i) => E.holder(S, i)); render(); Kit.sfx('flip'); Kit.haptic('medium');
      const tl = dom.map.querySelector('.pl[data-p="' + ev.p + '"] .pl-tile'); if (tl) tl.classList.add('flip');   // (the new Domain turns over onto the table)
      Kit.toast((ev.old != null ? cap1(theName('@' + ev.old)) + ' is discarded, and ' + theName('@' + ev.id) + ' is laid' : cap1(theName('@' + ev.id)) + ' is laid') + ' at ' + posName(ev.p) + '.', 2600); await wait(900);
    },
    async domains(ev) {
      V.mk = S.mk.slice(); V.tot = S.places.map((x, i) => E.mights(S, i)); V.hold = S.places.map((x, i) => E.holder(S, i)); render(); Kit.sfx('whoosh'); Kit.haptic('medium');
      const moved = ev.perm.map((from, i) => (from !== i ? i : -1)).filter(i => i >= 0);
      moved.forEach(i => { const tl = dom.map.querySelector('.pl[data-p="' + i + '"] .pl-tile'); if (tl) tl.classList.add('su-land'); });
      Kit.toast(moved.length === 2 ? cap1(theName('@' + S.places[moved[0]])) + ' and ' + theName('@' + S.places[moved[1]]) + ' change places.' : swapSaid(moved), 2600); await wait(900);
    },
    // Congress of Vienna: the two dice as they fell (ev.dice), and what each names (ev.p: a position, or -1 for a 6, which the
    // player names: SEAM for the dice and the chooser; until then the engine chooses for the player and a line says the roll)
    async relink(ev) { const f = vfig(ev.a); if (f) f.li = ev.b; ui.newLine = ev.a; render(); ui.newLine = 0; Kit.sfx('sparkle', .6); await wait(500); },
    // Congress of Vienna: the Domains are numbered 1 to 5 from the roller's own Gate, the two dice tumble over the map,
    // and the numbers they show light up with their Domains (a 6 is the roller's choice, made next)
    async congress(ev) {
      const g = 2 * ev.o, t = 2 * E.nextLive(S, ev.o), line = [g, g + 1, 2 * S.N, t + 1, t], tags = [];
      line.forEach((p, k) => { const r = dom.map.querySelector('.pl[data-p="' + p + '"]'); if (r) { const b = el('span', { class: 'cg-n', text: String(k + 1) }); r.appendChild(b); tags.push([r, b, k + 1]); } });
      const mr = dom.map.getBoundingClientRect(), dice = ev.dice.map((v, i) => { const d = Kit.die(1); d.setAttribute('data-v', v); d.setAttribute('aria-label', 'Die showing ' + v); d.style.setProperty('--dx', (i ? 40 : -40) + 'px'); return d; });
      const tray = el('div', { class: 'cg-tray', style: { left: (mr.left + mr.width / 2) + 'px', top: (mr.top + mr.height / 2) + 'px' } }, dice);
      dom.fx.appendChild(tray); await wait(200); dice.forEach(d => d.classList.add('rolling')); Kit.sfx('roll'); Kit.haptic('light'); await wait(900);
      tags.forEach(x => { if (ev.dice.indexOf(x[2]) >= 0) { x[0].classList.add('pk'); x[1].classList.add('on'); } });
      if (ev.dice.indexOf(6) >= 0) tray.appendChild(el('div', { class: 'cg-six', text: Kit.poss(pname(ev.o)) + ' choice' }));
      Kit.sfx('pop'); await wait(1500);
      tray.remove(); tags.forEach(x => { x[0].classList.remove('pk'); x[1].remove(); });
    },
    async nothing(ev) { Kit.toast(ev.why === 'kudurru' ? 'A Boundary Stone protects that Domain, so nothing changes.' : 'There is no Domain left to lay, so nothing changes.', 2200); await wait(700); },
    async marker(ev) { if (V.mk) V.mk[ev.p] = ev.c; ui.mkNew = ev.p; render(); ui.mkNew = -1; Kit.sfx('bad'); Kit.toast(CARDS[ev.c].n + ' lies on ' + theName('@' + S.places[ev.p]) + ', so its power does nothing while it lies there.', 2600); await wait(900); },
    // The Tribune's Veto: the Deed's card was held up (deed, above); the Veto's player's hand and kept Spark catch up
    async veto(ev) { dropHand(ev.o, V.P[ev.o].hand.indexOf(ev.c)); V.P[ev.o].reserve = S.P[ev.o].reserve; render(); await wait(120); },
    async quick(ev, ctx) {
      const o = ev.o; dropHand(o, V.P[o].hand.indexOf(ev.c)); ctx.quick = !ev.att; ctx.qk = ev.c;
      if (ev.att) V.P[o].spark = Math.max(0, V.P[o].spark - (ctx.cost || 0)); else V.P[o].reserve = Math.max(0, V.P[o].reserve - 1);
      render();   // (the card itself is shown in the clash, coming to its Figure's side)
    },
    async clash(ev, ctx) {
      // (the Defence of Syracuse is paid for with Spark kept, Testudo with the Spark of the turn: S has paid them already)
      if (ev.rep || ev.tq) { const k = ev.rep || ev.tq, f = vfig(ev.rep ? ev.d : ev.a), o = f ? f.o : -1; if (o >= 0) { dropHand(o, V.P[o].hand.indexOf(k)); if (ev.rep) V.P[o].reserve = S.P[o].reserve; else V.P[o].spark = S.P[o].spark; render(); } }
      await clashShow(ev, ctx); const a = vfig(ev.a); if (a) { a.rdy = 0; a.acted = 1; } },
    async ko(ev) {
      const n = figN(ev.u), f0 = vfig(ev.u);
      // (from a stack that keeps other Figures, the card falls away from it and the stack stays)
      if (n && f0 && n.classList.contains('stk') && n.dataset.us.indexOf(' ') > 0) { const r = rc(n); await flyCard(f0.c, r, { left: r.left + (ev.o === ui.view ? 10 : -10), top: r.top + r.height * .5, width: r.width * .7 }, { ms: 380, o1: 0, ease: 'ease-in' }); }
      else if (n) await anim(n, [{ transform: 'none', opacity: 1 }, { transform: 'rotate(' + (ev.o === ui.view ? 24 : -24) + 'deg) translateY(30%) scale(.7)', opacity: 0 }], { duration: 360, easing: 'ease-in', fill: 'forwards' });
      V.figs = V.figs.filter(f => f.u !== ev.u); V.figs.forEach(f => { if (f.li === ev.u) { const g = S.figs.find(x => x.u === f.u); f.li = g ? g.li : 0; } });   // (a line that moves to another source: 'relink')
      if (ev.top) V.P[ev.o].deck++;   // (Rapa Nui: on top of its player's deck)
      render();
    },
    // Mandela: once a round, a Figure of his defeated on the other player's side goes back to his Gate instead
    async fallback(ev) {
      if (!ev.why) { V.P[ev.o].uM = 1; bump('.an-strip.p' + ev.o + ' .st-guide'); } Kit.sfx('good'); Kit.haptic('light');   // (charter: Runnymede's, testudo and syracuse: the Deeds', not Mandela's)
      await EV.move({ t: 'move', u: ev.u, from: ev.from, to: ev.to, jump: 1 });
    },
    // Lincoln: once a game, at the start of round 5, one of his broken Seals is whole again
    async mend(ev) {
      if (ev.why === 'walls') {   // (the Theodosian Walls: a Seal is pressed into its place on the strip, a fourth one where there were three)
        V.P[ev.o].seals = ev.left; V.P[ev.o].sm = ev.sm; ui.press = { o: ev.o, i: ev.left - 1 }; render(); ui.press = null;
        Kit.sfx('deal'); await wait(330); Kit.sfx('boom', .55); Kit.haptic('heavy'); await wait(700); return; }
      V.P[ev.o].seals = ev.left; ui.crack = { o: ev.o, i: ev.left - 1 }; render(); ui.crack = null; if (ev.why !== 'stool') bump('.an-strip.p' + ev.o + ' .st-guide');   // (stool: Kumasi's, not Lincoln's)
      Kit.callout('A Seal is mended'); Kit.sfx('good'); Kit.haptic('medium'); await wait(700);
    },
    async renown(ev) {
      // (a Guide's own Renown comes from the Crossroads, where it was won, and the Guide's portrait answers: Shakespeare's
      // for a Figure of his defeated there, his portrait marked used for the rest of the round; Akbar's for his court)
      if (ev.why === 'tragedy') { V.P[ev.o].uW = 1; render(); }
      V.P[ev.o].renown += ev.n;
      const guide = ev.why === 'tragedy' || ev.why === 'court', hub = guide ? dom.map.querySelector('.pl[data-p="' + (S.places.length - 1) + '"] .pl-tile') : null;
      if (guide) { bump('.an-strip.p' + ev.o + ' .st-guide'); if (hub) { hub.classList.remove('thread'); void hub.offsetWidth; hub.classList.add('thread'); } Kit.haptic('light'); }
      const src = guide ? rc(hub) || rc(q('.an-strip.p' + ev.o + ' .st-guide')) : ev.u && figN(ev.u) ? rc(figN(ev.u)) : ev.p != null ? rc(dom.map.querySelector('.pl[data-p="' + ev.p + '"] .pl-tile')) : rc(dom.map);
      if (ev.why === 'bounty') Kit.callout('Bounty');
      Kit.sfx('good'); await plus(ev.n, src, ev.o); render(); bump('.an-strip.p' + ev.o + ' .lau b');
    },
    async hold(ev) {
      ui.count = ev.p; ui.drop = {}; ui.drop[ev.p] = 1; V.hold[ev.p] = ev.o; render(); ui.drop = {};
      Kit.sfx('deal'); Kit.haptic('light'); await wait(520);
      V.P[ev.o].renown += ev.n; await plus(ev.n, rc(dom.map.querySelector('.pl[data-p="' + ev.p + '"] .pl-flag')), ev.o);
      render(); bump('.an-strip.p' + ev.o + ' .lau b'); Kit.sfx('chip'); await wait(160);
    },
    async seal(ev) {
      V.P[ev.o].seals = ev.left; ui.crack = { o: ev.o, i: ev.left }; render(); ui.crack = null;
      Kit.sfx('boom'); Kit.sfx('clash', .7); Kit.haptic('heavy'); Kit.callout(ev.left ? 'Seal broken' : 'The last Seal breaks');
      await wait(900);
      V.P[ev.by].renown += S.cfg.sealRen; await plus(S.cfg.sealRen, rc(q('.an-strip.p' + ev.o + ' .st-seals')), ev.by); render(); bump('.an-strip.p' + ev.by + ' .lau b'); Kit.sfx('good'); await wait(200);
    },
    // A player with no Seals left is out of the game (three or more players): their Figures leave the map for their
    // discard pile, their plate goes dark with the word Out on it, and the table says so
    async out(ev) {
      const ns = []; ev.us.forEach(u => { const n = figN(u); if (n && ns.indexOf(n) < 0) ns.push(n); });
      Kit.sfx('boom'); Kit.haptic('heavy');
      await Promise.all(ns.map(n => anim(n, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(30%) scale(.6)', opacity: 0 }], { duration: 420, easing: 'ease-in', fill: 'forwards' })));
      V.figs = V.figs.filter(f => ev.us.indexOf(f.u) < 0); V.tot = S.places.map((x, i) => E.mights(S, i)); V.hold = S.places.map((x, i) => E.holder(S, i));
      render(); Kit.callout(pname(ev.o) === 'You' ? 'You are out' : pname(ev.o) + ' is out'); await wait(1300);
    },
    async discard(ev, ctx) {
      const o = ev.o, h = ctx.h != null ? ctx.h : V.P[o].hand.indexOf(ev.c), from = o === ui.view && !ui.hideHand ? rc(dom.hand.querySelector('.hc[data-h="' + h + '"]')) : null;
      dropHand(o, h); render(); Kit.sfx('flip');
      if (from) await flyCard(ev.c, from, { left: from.left, top: from.top + 90, width: from.width * .8 }, { ms: 320, o1: 0, ease: 'ease-in' }); else await wait(160);
    }
  };
  async function playEvents(evs, ctx) {
    const my = gen; ctx = ctx || {};
    for (let i = 0; i < evs.length; i++) {
      const ev = evs[i], fn = EV[ev.t];
      if (fn) { try { await fn(ev, ctx); } catch (e) { if (window.console) console.error('anoria event', ev.t, e); } }
      if (gen !== my) return false;
    }
    return true;
  }
  // What the game's history will show (hist/anoria.js): besides the counts, the Threads and Legacy lines as they were
  // made, the round each Seal broke, who won the most clashes, and who scored each Place every round (G.tale; a game
  // saved before this was kept has none, and its record says so by leaving those parts out)
  const MAPORD = [0, 1, 4, 3, 2];
  // (with more players, the Domains as the history keeps them: in the engine's order, each seat's Gate and Outpost and the Crossroads last)
  const posOrder = () => (S.N > 2 ? S.places.map((x, i) => i) : MAPORD);
  // (the Domains as the table shows them from where you sit: the rim from your left, then your three rows)
  const mapOrder = () => { const out = []; seatsFrom(ui.view).slice(1).forEach(o => out.push(2 * o, 2 * o + 1)); out.push(2 * S.N, 2 * ui.view + 1, 2 * ui.view); return out; };   // (the five Places as they lie: seat 1's Gate and Outpost, the Crossroads, seat 2's Outpost and Gate)
  // ═══ The turn log ═══════════════════════════════════════════════════════════════════════════════════════
  // Tim, 2026-11-11: "add a turn log with tappable card names like we have in lorcana". Every event the engine
  // reports becomes a sentence in G.log (kept with the saved game, the last 200): who played what where, each clash
  // with its Might and who was knocked out, Legacy Lines, Seals, and the count Place by Place. A line is a list of
  // words and cards ({k: key}, a Place as '@id'); logScreen() draws the cards' names as buttons that read the card.
  const LOGMAX = 200;
  function logEvs(evs, round) {
    if (!G || G.demo || !evs || !evs.length) return;
    const L = G.log || (G.log = []), who = G.who || (G.who = {});
    S.figs.forEach(f => { if (!who[f.u]) who[f.u] = [f.c, f.o]; });
    evs.forEach(ev => { if (ev.t === 'arrive') who[ev.u] = [ev.c, ev.o]; });
    const nm = o => pname(o), F = u => who[u] ? { k: who[u][0] } : 'a Figure', own = u => who[u] ? Kit.poss(pname(who[u][1])) + ' ' : '', Pl = p => ({ k: '@' + S.places[p] }), K = k => ({ k: k });
    const add = (o, x) => L.push({ o: o, x: x }), ren = n => n + ' Renown', obj = o => (nm(o) === 'You' ? 'you' : nm(o)), pos = o => (nm(o) === 'You' ? 'your' : Kit.poss(nm(o)));   // (mid-sentence)
    evs.forEach((ev, i) => {
      const t = ev.t;
      if (t === 'turn') L.push({ h: 't', r: ev.round, o: ev.o });
      else if (t === 'arrive') add(ev.o, [nm(ev.o) + ' played ', K(ev.c), ' at ', Pl(ev.p), '.']);
      else if (t === 'relic') add(ev.o, [nm(ev.o) + ' played ', K(ev.c), '.']);
      else if (t === 'deed') { const fx = E.fxOf(ev.c), oth = 1 - ev.o;
        if (fx === 'westphalia') add(ev.o, [nm(ev.o) + ' played ', K(ev.c), ' at ', Pl(ev.p), '. Nobody can start a clash there until this round ends.']);
        else if (fx === 'milan') add(ev.o, [nm(ev.o) + ' played ', K(ev.c), ' at ', Pl(ev.p), '. Until this round ends, ' + (S.N > 2 ? Kit.poss(nm(ev.o)) + ' opponents' : nm(oth) === 'You' ? 'you' : nm(oth)) + ' can\'t start a clash with ' + pos(ev.o) + ' Figures there.']);
        else if (ev.w != null) add(ev.o, [nm(ev.o) + ' played ', K(ev.c), ' with ' + obj(ev.w) + '.']);
        else if (fx === 'lisbonquake') add(ev.o, [nm(ev.o) + ' played ', K(ev.c), ' at ', Pl(ev.p), '.']);
        else if (fx === 'canossa') add(ev.o, [nm(ev.o) + ' played ', K(ev.c), ' on ', who[ev.v] ? pos(who[ev.v][1]) + ' ' : '', F(ev.v), '.']);   // (pos: "your" mid-sentence)
        else add(ev.o, [nm(ev.o) + ' played ', K(ev.c), '.']); }
      else if (t === 'quake') { if (!ev.us.length) add(ev.o, ['The earthquake at ', Pl(ev.p), ' stopped no Figure.']); }   // (each Figure it stops has its own line: stun)
      else if (t === 'hush') add(who[ev.u] ? who[ev.u][1] : -1, [own(ev.u), F(ev.u), '\'s skills and powers don\'t work until this round ends.']);
      else if (t === 'quick') add(ev.o, [nm(ev.o) + ' added ', K(ev.c), ' to the clash.']);
      else if (t === 'move' && ev.relay) return;   // (said once, by the relay)
      else if (t === 'move') add(who[ev.u] ? who[ev.u][1] : -1, ev.push ? [own(ev.u), F(ev.u), ' was pushed to ', Pl(ev.to), '.'] : [own(ev.u), F(ev.u), ev.jump ? ' jumped to ' : ' moved to ', Pl(ev.to), '.']);
      else if (t === 'clash') { let out = false; for (let j = i + 1; j < evs.length && evs[j].t !== 'clash'; j++) if ((evs[j].t === 'ko' || evs[j].t === 'fallback') && (evs[j].u === ev.a || evs[j].u === ev.d)) out = true;
        add(who[ev.a] ? who[ev.a][1] : -1, [own(ev.a), F(ev.a), ' clashed with ', own(ev.d), F(ev.d), ' at ', Pl(ev.p), ', ' + Math.floor(ev.am) + ' Might against ' + Math.floor(ev.dm) + '.' + (out ? '' : ' They were tied, so nobody was knocked out.')]); }
      else if (t === 'ko') add(ev.o, ev.top ? [Kit.poss(nm(ev.o)) + ' ', K(ev.c), ' was knocked out at ', Pl(ev.p), ' and went on top of ' + Kit.poss(nm(ev.o)) + ' deck.'] : [Kit.poss(nm(ev.o)) + ' ', K(ev.c), ' was knocked out.']);
      else if (t === 'fallback' && ev.why === 'syracuse') add(who[ev.by] ? who[ev.by][1] : 1 - ev.o, [K(ev.card), ' played itself for ' + obj(who[ev.by] ? who[ev.by][1] : 1 - ev.o) + ', and ' + Kit.poss(nm(ev.o)) + ' ', K(ev.c), ' was driven back to ' + pos(ev.o) + ' Gate. Nobody was knocked out.']);
      else if (t === 'fallback' && ev.why === 'testudo') add(ev.o, [K(ev.card), ' played itself for ' + obj(ev.o) + ', and ', K(ev.c), ' fell back to ' + pos(ev.o) + ' Gate instead of being knocked out.']);
      else if (t === 'fallback') add(ev.o, [Kit.poss(nm(ev.o)) + ' ', K(ev.c), ' was defeated and went back to ' + Kit.poss(nm(ev.o)) + ' Gate' + (ev.why === 'charter' ? ', as the charter of ' : '.'), ev.why === 'charter' ? K('@runnymede') : '', ev.why === 'charter' ? ' says.' : '']);
      else if (t === 'veto') add(ev.o, [K(ev.c), ' played itself for ' + obj(ev.o) + ', and ', K(ev.d), ', which ' + obj(ev.by) + ' played, did nothing.']);
      else if (t === 'stun') add(who[ev.u] ? who[ev.u][1] : -1, [own(ev.u), F(ev.u), ' misses the next turn.']);
      else if (t === 'line') add(ev.o, [nm(ev.o) + ' made the Legacy Line from ', F(ev.b), ' to ', F(ev.a), ev.ren ? ' and scored ' + ren(ev.ren) + '.' : '.']);
      else if (t === 'thread') add(ev.o, [nm(ev.o) + ' made the Legacy Line from ', !ev.src ? 'a card' : ev.src.k === 'place' ? Pl(ev.src.p) : ev.src.k === 'relic' ? K(ev.src.c) : F(ev.src.u), ' to ', K(ev.c), ev.ren ? ' and scored ' + ren(ev.ren) + '.' : '.']);
      else if (t === 'renown' && (ev.why === 'tragedy' || ev.why === 'court')) add(ev.o, [nm(ev.o) + ' scored ' + ren(ev.n) + ' at ', Pl(S.places.length - 1), ev.why === 'tragedy' ? ', because Shakespeare turns a defeat there into a tragedy.' : ', because Akbar\'s court there holds Figures of more than one faction.']);
      else if (t === 'spark' && ev.w) add(ev.o, sparkSaid(ev, nm, Pl));   // (Spark a Domain gives for the next turn)
      else if (t === 'spark' && (ev.why === 'ransom' || ev.why === 'kept' || ev.why === 'next')) add(ev.o, [ev.why === 'ransom' ? nm(ev.o) + ' gained ' + ev.n + ' Spark from Saladin for winning the clash.' : ev.why === 'kept' ? nm(ev.o) + ' kept ' + ev.n + ' Spark from the turn before, through Mansa Musa.' : nm(ev.o) + ' will have ' + ev.n + ' more Spark next turn, through Empress Wu, for holding more Places.']);
      else if (t === 'renown' && ev.p != null && (ev.why === 'punt' || ev.why === 'ballcourt' || ev.why === 'treaty')) add(ev.o, [nm(ev.o) + ' scored ' + ren(ev.n) + ' at ', Pl(ev.p), ev.why === 'punt' ? ' for playing a Relic.' : ev.why === 'ballcourt' ? ' for winning the clash there by 3 or more.' : ', because the Might there was tied.']);
      else if (t === 'renown') add(ev.o, ev.why === 'bounty' ? [nm(ev.o) + ' scored ' + ren(ev.n) + ' for the Bounty.'] : ev.why === 'colosseum' ? [nm(ev.o) + ' scored ' + ren(ev.n) + ' at ', K('@colosseum'), '.'] : ev.why === 'stage' && ev.u ? [nm(ev.o) + ' scored ' + ren(ev.n) + ' with ', F(ev.u), '.'] : [nm(ev.o) + ' scored ' + ren(ev.n) + '.']);
      else if (t === 'hold') { if (!L.length || L[L.length - 1].h !== 'c' && !(L[L.length - 1].cnt)) L.push({ h: 'c', r: round || S.round }); L.push({ o: ev.o, cnt: 1, x: ev.o >= 0 ? [nm(ev.o) + ' held ', Pl(ev.p), ' and scored ' + ren(ev.n) + '.'] : ['Nobody held ', Pl(ev.p), '.'] }); }
      else if (t === 'out') add(ev.o, [(nm(ev.o) === 'You' ? 'You have' : nm(ev.o) + ' has') + ' no Seals left and ' + (nm(ev.o) === 'You' ? 'are' : 'is') + ' out of the game' + (ev.us.length ? ', and ' + (nm(ev.o) === 'You' ? 'your' : Kit.poss(nm(ev.o))) + ' Figures have left the map.' : '.')]);
      else if (t === 'seal') add(ev.by, [nm(ev.by) + ' held ' + Kit.poss(nm(ev.o)) + ' Gate, and one of ' + Kit.poss(nm(ev.o)) + ' Seals broke. ' + (nm(ev.o) === 'You' ? 'You have ' : nm(ev.o) + ' has ') + ev.left + ' left.']);
      else if (t === 'mend' && ev.why === 'walls') add(ev.o, [nm(ev.o) + (nm(ev.o) === 'You' ? ' have ' : ' has ') + ev.left + ' Seals now, after ', K(ev.c), '.']);
      else if (t === 'mend') add(ev.o, ev.why === 'stool' ? [nm(ev.o) + ' held ', Pl(ev.p), ', and one of ' + Kit.poss(nm(ev.o)) + ' broken Seals was mended.'] : ['One of ' + Kit.poss(nm(ev.o)) + ' broken Seals was mended.']);
      // Domain powers
      else if (t === 'toll') add(ev.o, [nm(ev.o) + ' paid ' + ev.n + ' Spark to walk into ', Pl(ev.p), '.']);
      else if (t === 'loan') add(ev.o, [nm(ev.o) + ' borrowed ' + ev.n + ' Spark at ', Pl(ev.p), ' and will start the next turn with ' + ev.n + ' Spark less.']);
      else if (t === 'debt') add(ev.o, [nm(ev.o) + ' paid back the ' + ev.n + ' Spark borrowed at ', K('@firenze'), '.']);
      else if (t === 'buy') add(ev.o, [nm(ev.o) + ' paid 1 Spark at ', Pl(ev.p), ' to draw a card.']);
      else if (t === 'hire') add(ev.o, [nm(ev.o) + ' paid 1 Spark at ', Pl(ev.p), ' for ' + ev.n + ' more Might there until the round ends.']);
      else if (t === 'relay') add(ev.o, [Kit.poss(nm(ev.o)) + ' ', F(ev.u), ' and ', F(ev.v), ' changed places along ', Pl(ev.p), '.']);
      else if (t === 'recall') add(ev.o, [nm(ev.o) + ' held ', Pl(ev.p), ' and took ', K(ev.c), ' back from the discard pile.']);
      else if (t === 'victor') add(ev.o, [own(ev.u), F(ev.u), ' won at ', Pl(ev.p), ' and keeps 1 more Might while in play.']);
      else if (t === 'dpow') add(ev.o, dpowSaid(ev, nm, Pl));
      else if (t === 'discard') add(ev.o, [nm(ev.o) + ' discarded ', K(ev.c), '.']);
      else if (t === 'relink') add(ev.o, [Kit.poss(nm(ev.o)) + ' ', F(ev.a), '’s Legacy Line now runs to ', F(ev.b), ', so ', F(ev.a), ' keeps the +1 Might.']);
      // Domains: laid in another's place, moved, covered, and the Congress of Vienna's dice
      else if (t === 'domain' && ev.why !== 'setup') { const w = E.ownerOfSpoke(S, ev.p), at = w < 0 ? 'the Crossroads' : Kit.poss(nm(w)) + (E.isGate(S, ev.p) ? ' Gate' : ' Outpost');
        add(ev.o, ev.old ? [{ k: '@' + ev.old }, ' was discarded, and ', { k: '@' + ev.id }, ' was laid at ' + at + '.'] : [{ k: '@' + ev.id }, ' was laid at ' + at + '.']); }
      else if (t === 'domains') { const mv = ev.perm.map((f, j) => (f !== j ? j : -1)).filter(j => j >= 0);
        add(-1, mv.length === 2 ? [{ k: '@' + S.places[mv[0]] }, ' and ', { k: '@' + S.places[mv[1]] }, ' changed places.'] : [swapSaid(mv, true)]); }
      else if (t === 'marker') add(-1, [K(ev.c), ' lies on ', { k: '@' + S.places[ev.p] }, ', so its power does nothing while it lies there.']);
      else if (t === 'congress') add(ev.o, ['The dice for ', K(ev.c), ' showed ' + ev.dice[0] + ' and ' + ev.dice[1] + '.']);
      else if (t === 'nothing' && ev.why === 'kudurru') add(-1, ['A Boundary Stone protected that Domain, so nothing changed.']);
    });
    if (L.length > LOGMAX) L.splice(0, L.length - LOGMAX);
  }
  // (two players' Gates and Outposts trading places, as a sentence: the Columbian Exchange, the Cape Route)
  function swapSaid(mv, past) {
    const ws = []; mv.forEach(i => { const w = i >> 1; if (i < 2 * S.N && ws.indexOf(w) < 0) ws.push(w); });
    if (S.N === 2 || ws.length !== 2) return past ? 'The Domains at the two Gates changed places, and so did the Domains at the two Outposts.' : 'The Domains at the two Gates change places, and so do the Domains at the two Outposts.';
    const a = ws[0] === ui.view && human(ws[0]) ? 'your' : Kit.poss(pname(ws[0])), b = ws[1] === ui.view && human(ws[1]) ? 'your' : Kit.poss(pname(ws[1]));
    return 'The Domains at ' + a + ' Gate and ' + b + ' Gate ' + (past ? 'changed' : 'change') + ' places, and so ' + (past ? 'did' : 'do') + ' their Outposts.';
  }
  // what a Domain's power did, as a line of the turn log (w: the power's word)
  function sparkSaid(ev, nm, Pl) {
    const P = Pl(ev.p), n = Math.abs(ev.n);
    if (ev.n < 0) return [nm(ev.o) + ' will have ' + n + ' less Spark next turn, taken as tribute at ', P, '.'];
    const why = { spark: ['held ', P, ''], monopoly: ['was the only player with Figures at ', P, ''], league: ['held ', P, ', ' + ev.n + (ev.n === 1 ? ' Commerce Domain' : ' Commerce Domains') + ' in all'], fair: ['had a Figure at ', P, ''],
      kiln: ['held ', P, ' with ' + ev.n + (ev.n === 1 ? ' Relic' : ' Relics') + ' in play'], strike: ['held ', P, ' for the first time'], tribute: ['held ', P, ' and took tribute there'], wergild: ['lost a Figure at ', P, ''] }[ev.w] || ['held ', P, ''];
    return [nm(ev.o) + ' ' + why[0], why[1], why[2] + (why[2] ? ',' : '') + ' and will have ' + n + ' more Spark next turn.'];
  }
  function dpowSaid(ev, nm, Pl) {
    const P = Pl(ev.p);
    if (ev.w === 'clock') return [nm(ev.o) + ' held ', P, ' and will take the last turn of the next round.'];
    if (ev.w === 'study') return [nm(ev.o) + ' had a Figure at ', P, ' and drew a card.'];
    if (ev.w === 'school') return [nm(ev.o) + ' drew a card for playing a Figure at ', P, '.'];
    if (ev.w === 'print') return [nm(ev.o) + ' drew a card at ', P, ' for playing a Relic or a Deed.'];
    return [nm(ev.o) + ' held ', P, ' and drew a card.'];
  }
  function logEnd() { if (!G || G.demo || !G.log) return; if (S.N > 2) { G.log.push({ h: 'e', x: [S.winner < 0 ? 'The game was a draw.' : endSaid()] }); return; } G.log.push({ h: 'e', x: [S.winner < 0 ? 'The game was a draw.' : pname(S.winner) + ' won' + (S.how === 'seals' ? ' by breaking all of ' + Kit.poss(pname(1 - S.winner)) + ' Seals.' : ' with ' + S.P[S.winner].renown + ' Renown.')] }); }
  function logScreen() {
    if (!G || G.demo) return; Kit.sfx('tap');
    const sc = screen({ title: 'Turn log', cls: 'an-log' }), L = G.log || [], groups = []; let cur = null;
    L.forEach(e => { if (e.h === 't' || e.h === 'c' || e.h === 'e' || !cur) { cur = { head: e.h ? e : null, lines: [] }; groups.push(cur); if (e.h === 'e' || !e.h) cur.lines.push(e); } else cur.lines.push(e); });
    const name = k => k[0] === '@' ? theName(k) : CARDS[k] ? (CARDS[k].t === 'relic' ? theName(k) : CARDS[k].n) : k;
    const line = e => el('p', { class: 'lg-l' + (e.o >= 0 ? ' o' + e.o : '') }, (e.x || []).map(x => typeof x === 'string' ? document.createTextNode(DW(x))
      : el('button', { type: 'button', class: 'lg-c', text: name(x.k), onclick: () => openView(x.k.replace(/^@/, '')) })));
    if (!groups.length) sc.body.appendChild(el('p', { class: 'lg-none', text: 'Nothing has happened yet. Every card played, every clash and every count is written here as the game goes.' }));
    // (the newest turn first; inside a turn, things in the order they happened)
    groups.slice().reverse().forEach(g => { const h = g.head, box = el('section', { class: 'lg-g' + (h && h.h === 'c' ? ' cnt' : h && h.h === 'e' ? ' end' : h && h.o >= 0 ? ' o' + h.o : '') });
      if (h && h.h === 't') box.appendChild(el('h2', {}, [el('i'), el('span', { text: Kit.poss(pname(h.o)) + ' turn' }), el('small', { text: 'Round ' + h.r })]));
      else if (h && h.h === 'c') box.appendChild(el('h2', {}, [el('span', { text: 'The count' }), el('small', { text: 'Round ' + h.r })]));
      else if (h && h.h === 'e') box.appendChild(el('h2', {}, [el('span', { text: 'The end' })]));
      if (!g.lines.length && h && h.h === 't') box.appendChild(el('p', { class: 'lg-l dim', text: h.o === S.turn && !G.over ? 'Nothing yet this turn.' : 'Nothing was played.' }));
      g.lines.forEach(e => box.appendChild(line(e))); sc.body.appendChild(box); });
  }

  // (whose Figure knocked one out: the knocker's player, from the table, or from who the log has seen play it)
  const byOf = ev => { const f = E.byU(S, ev.by); if (f) return f.o; const w = G.who && G.who[ev.by]; return w ? w[1] : S.N === 2 ? 1 - ev.o : -1; };
  function tally(evs) {
    const T = G.tale, r = G.hist.length + 1, cardOf = u => { const f = u && E.byU(S, u); return f ? f.c : ''; };
    let held = null;
    evs.forEach(ev => {
      if (ev.t === 'ko' && ev.by) { const w = byOf(ev); if (w >= 0 && G.stats[w]) { G.stats[w].ko++; const c = T && cardOf(ev.by); if (c && T.ko[w]) { const m = T.ko[w]; m[c] = (m[c] || 0) + 1; } } }
      else if (ev.t === 'line' || ev.t === 'thread') { G.stats[ev.o].lines++;
        if (T) { const from = ev.t === 'line' ? cardOf(ev.b) : ev.src.k === 'fig' ? cardOf(ev.src.u) : ev.src.k === 'relic' ? ev.src.c : '@' + S.places[ev.src.p], to = ev.t === 'line' ? cardOf(ev.a) : ev.c;
          if (from && to && T.links.length < 24) T.links.push([r, ev.o, from, to, ev.ren || 0, ev.t === 'line' ? 'l' : 't'].join('|')); } }
      if ((ev.t === 'arrive' || ev.t === 'relic' || ev.t === 'deed' || ev.t === 'quick') && ev.c) G.seen[ev.c] = 1;
      else if (ev.t === 'seal') { G.stats[ev.by].seals++; if (T) T.seals.push(r + '|' + ev.by + (S.N > 2 ? '|' + ev.o : '')); }
      else if (ev.t === 'out' && T) (T.outs = T.outs || []).push(r + '|' + ev.o);
      else if (ev.t === 'hold') { G.stats[ev.o].held++; (held = held || {})[ev.p] = ev.o; }
      // (Domains that changed during the game, for its history: round | position as the map lies | the Domain laid | whose banner | the Domain it replaced | the card that did it; and 'round|m|perm' when Domains changed places)
      else if (ev.t === 'domain' && ev.why !== 'setup' && T) { if (!T.dom) T.dom = []; if (T.dom.length < 24) T.dom.push([r, posOrder().indexOf(ev.p), ev.id, ev.o, ev.old || '', ev.why].join('|')); }
      else if (ev.t === 'domains' && T) { if (!T.dom) T.dom = []; if (T.dom.length < 24) T.dom.push([r, 'm', posOrder().map(i => posOrder().indexOf(ev.perm[i])).join(S.N > 2 ? ',' : ''), ev.why].join('|')); }
    });
    return held;
  }

  // ═══ Taking turns ════════════════════════════════════════════════════════════════════════════════════════
  function setBusy(b) { ui.busy = b; }
  async function doAction(a, ctx) {
    const o = S.turn, P = S.P[o];
    ctx = Object.assign({ a: a, o: o }, ctx);
    ctx.key = a.h != null ? P.hand[a.h] : a.ph ? quickOf(a) : null; ctx.h2key = a.h2 != null ? P.hand[a.h2] : null;
    if (a.t === 'clash' && a.ph) ctx.key = quickOf(a);
    ctx.cost = ctx.key ? E.costOf(S, o, ctx.key, a.t === 'fig' ? a.p : undefined) : 0;
    const roll = ctx.roll || E.rollClash(S.cfg); E.apply(S, a, roll.da, roll.dd, roll);
    const evs = S.ev.splice(0); G.n++; tally(evs); logEvs(evs); save();
    ctx.random = evs.some(e => e.t === 'draw' || e.t === 'clash' || e.t === 'domain' || e.t === 'choose' || e.t === 'dunder' || e.t === 'congress' || e.t === 'veto');   // (a Veto shows a card from the other hand)
    ctx.veto = evs.find(e => e.t === 'veto') || null;   // (a card drawn, dice, a Domain turned up: not to be taken back)
    const ok = await playEvents(evs, ctx);
    return ok ? ctx : null;
  }
  async function doHuman(a) {
    if (!idle()) return;
    const my = gen, snapS = JSON.stringify(Object.assign({}, S, { cfg: null, st: null, ev: null }));
    ui.sel = null; setBusy(true); render();
    const ctx = await doAction(a); if (gen !== my || !ctx) return;
    // A choice of Domain left open (Pachacuti, Al-Idrisi, Christopher Wren, a 6 for the Congress of Vienna): the
    // player makes it on the table (askPend). A lesson or a test game lets the engine choose (E.pendPick).
    while (S.pend) { const a2 = G.demo || ui.turbo ? E.pendPick(S) : await askPend(); if (gen !== my) return; const c2 = await doAction(a2); if (gen !== my || !c2) return; }
    if (ctx.random) undoStack = []; else undoStack.push(snapS);
    setBusy(false); legal(); settle();
  }
  function undo() {
    if (G && G.demo) return;
    if (!G || G.over) return Kit.toast('The game is over');
    if (!idle()) return Kit.toast('Wait for your turn');
    if (!undoStack.length) return Kit.toast('There is nothing to take back. Clashes and drawn cards can’t be undone.');
    const d = JSON.parse(undoStack.pop()); d.cfg = cfgStd(); d.st = null; d.ev = [];
    S = G.S = d; ui.sel = null; ui.discard = false; Kit.sfx('whoosh'); save(); legal(); V = snap(); render();
  }
  function toggleFast() { speed = speed > 1 ? 1 : 4; lsSet(FAST, speed > 1 ? '1' : null); document.documentElement.classList.toggle('an-fast', speed > 1); Kit.sfx('tap'); Kit.haptic('light'); render(); }

  async function beginTurn() {
    const my = gen, o = S.turn, pl = G.players[o];
    ui.sel = null; ui.discard = false; undoStack = []; setBusy(true);
    speed = ui.turbo || (pl.cpu && !stepOn() && lsGet(FAST) === '1' ? 4 : 1); document.documentElement.classList.toggle('an-fast', speed > 1);
    // (pass and play: the device goes to the person whose turn it is, and their side of the table comes to the front;
    // the computer's turns don't take the device from whoever has it)
    if (G.mode === 'local' && !pl.cpu && ui.viewer !== o) {
      ui.hideHand = true; ui.viewer = -1; ui.view = o; V = snap(); render();
      await Kit.handoff({ name: pl.name, color: pl.color, what: 'hand' });
      if (gen !== my) return;
      ui.viewer = o; ui.hideHand = false; render();
    }
    if (G.ph === 'start') {
      V = snap(); render();
      if (G.k === 0 && ui.banner !== S.round) {
        ui.banner = S.round;
        const st = E.stake(S.cfg, S.round), up = S.round > 1 && st > E.stake(S.cfg, S.round - 1);
        if (up) { Kit.sfx('win'); Kit.haptic('success'); ui.flip = 1; render(); ui.flip = 0; }
        else Kit.sfx('pop');
        await banner(up ? 'Round ' + S.round : '', up ? 'The stakes double' : 'Round ' + S.round, up ? LAUREL + LAUREL + '<span>Every Place now scores 2 Renown</span>' : (S.round === 1 ? '<span>' + (G.teams ? 'The first team to ' : 'First to ') + S.cfg.target + ' Renown</span>' : ''));
        if (gen !== my) return;
      }
      E.startTurn(S); G.ph = 'play'; const evs = S.ev.splice(0); logEvs(evs); save();
      if (!(await playEvents(evs, { o: o }))) return;
    }
    V = snap();
    if (pl.cpu) { render(); robotTurn(); return; }
    setBusy(false); legal(); render();
    if (o === ui.view) { Kit.sfx('turn', .5); }
  }
  // The computer's moves, one at a time (Tim, 2026-11-11: "cpu moves in anoria need to be acknowledged by the player
  // by default otherwise it moves too quick"). After each move has played out the table stops: the caption says what
  // the computer just did, with the card a tap away, and the player's own button, where End turn is on their turn,
  // reads Next. A tap on it (or Enter, or the space bar) lets the computer make its next move. On unless the player
  // turns it off in the game's menu (`anoria_step` '0'); with it off the fast-forward button is there as before.
  const STEP = 'anoria_step', stepOn = () => lsGet(STEP) !== '0';
  function toggleStep() { lsSet(STEP, stepOn() ? '0' : '1'); Kit.sfx('tap'); if (!stepOn() && ui.ack) ackGo(); else if (G && S) render(); }
  // what the computer just did, as a sentence (said before the move is applied, while its card is still in its hand)
  function moveSaid(a) {
    const o = S.turn, P = S.P[o], who = pname(o), at = p => theName('@' + S.places[p]), fig = u => E.byU(S, u);
    const mine = f => f && f.o === ui.view ? 'your ' : f ? Kit.poss(pname(f.o)) + ' ' : '';
    if (a.t === 'fig') { const k = P.hand[a.h]; return { key: k, tx: who + ' played ' + CARDS[k].n + ' at ' + at(a.p) + '.' }; }
    if (a.t === 'relic') { const k = P.hand[a.h]; return { key: k, tx: who + ' played ' + theName(k) + '.' }; }
    if (a.t === 'deed') { const k = P.hand[a.h], fx = E.fxOf(k), n = CARDS[k].n.replace(/^The /, 'the '), has = who === 'You' ? ' have ' : ' has ';
      // (the four Deeds that double a count, and the Theodosian Walls, say what they did: a Tribune's Veto may still cancel them, robotTurn)
      if (fx === 'triumph') return { key: k, tx: who + ' played ' + n + ' at ' + at(a.p) + '. If ' + who + ' holds ' + at(a.p) + ' at this round\'s count, it scores double.' };
      if (fx === 'medici') return { key: k, tx: who + ' played ' + n + '. Every ' + CARDS[k].dk + ' Domain ' + who + ' holds at this round\'s count scores double.' };
      if (fx === 'holyyear') return { key: k, tx: who + ' played ' + n + '. Every Domain ' + who + ' holds at this round\'s count scores double.' };
      if (fx === 'walls') return { key: k, tx: who + ' played ' + n + ' and' + has + Math.min(4, P.seals + 1) + ' Seals now.' };
      // (the five held cards and Canossa, 2026-11-12)
      if (fx === 'westphalia') return { key: k, tx: who + ' played ' + n + ' at ' + at(a.p) + '. Nobody can start a clash there until this round ends.' };
      if (fx === 'milan') return { key: k, tx: who + ' played ' + n + ' at ' + at(a.p) + '. Until this round ends, ' + (S.N > 2 ? (o === ui.view ? 'your opponents' : Kit.poss(who) + ' opponents') : o === ui.view ? 'the other player' : 'you') + ' can\'t start a clash with ' + (o === ui.view ? 'your' : Kit.poss(who)) + ' Figures there.' };
      if (a.w != null) return { key: k, tx: who + ' played ' + n + ' with ' + (a.w === ui.view && human(a.w) ? 'you' : pname(a.w)) + '. Their Gates change places, and so do their Outposts.' };
      if (fx === 'lisbonquake') return { key: k, tx: who + ' played ' + n + ' at ' + at(a.p) + '. Every Figure there misses its next turn.' };
      if (fx === 'canossa') { const g = fig(a.v); return { key: k, tx: who + ' played ' + n + ' on ' + mine(g) + (g ? CARDS[g.c].n : 'a Figure') + '. Until this round ends, the skills and powers on ' + (g ? Kit.poss(CARDS[g.c].n) : 'its') + ' card don\'t work.' }; }
      return { key: k, tx: who + ' played ' + n + '.' }; }
    if (a.t === 'walk' || a.t === 'antik' || a.t === 'tub') { const f = fig(a.u); return f ? { key: f.c, tx: who + ' moved ' + CARDS[f.c].n + ' to ' + at(a.p) + '.' } : null; }
    if (a.t === 'loan') return { key: S.places[a.p], tx: who + ' borrowed ' + 2 + ' Spark at ' + at(a.p) + '.' };
    if (a.t === 'buy') return { key: S.places[a.p], tx: who + ' paid 1 Spark at ' + at(a.p) + ' to draw a card.' };
    if (a.t === 'hire') return { key: S.places[a.p], tx: who + ' paid 1 Spark at ' + at(a.p) + ' for more Might there.' };
    if (a.t === 'relay') { const f = fig(a.u), g = fig(a.v); return f && g ? { key: f.c, tx: Kit.poss(who) + ' ' + CARDS[f.c].n + ' and ' + CARDS[g.c].n + ' changed places along the Qhapaq Ñan.' } : null; }
    if (a.t === 'clash') { const f = fig(a.u), g = fig(a.v), q = a.ph ? quickOf(a) : null; return f && g ? { key: f.c, tx: Kit.poss(who) + ' ' + CARDS[f.c].n + ' clashed with ' + mine(g) + CARDS[g.c].n + (q ? ', with ' + CARDS[q].n : '') + '.' } : null; }
    return null;
  }
  function ackGo() { const go = ui.ackGo; ui.ack = null; ui.ackGo = null; if (go) go(); }
  function ackKey(e) { if (!ui.ack || viewEl || document.querySelector('.k-scrim.show, .an-screen')) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); Kit.sfx('tap'); ackGo(); } }
  document.addEventListener('keydown', ackKey);
  function ackWait(said) {
    return new Promise(ok => { ui.ack = said || { tx: pname(S.turn) + ' made a move.' }; ui.ackGo = ok; render(); });
  }
  async function robotTurn() {
    const my = gen, prof = profOf(G.players[S.turn], G.level);
    setBusy(true); await wait(500); if (gen !== my) return;
    for (let n = 0; n < 40; n++) {
      // (the computer does not move while the player is looking at cards: the table would change under what they read)
      while ((viewEl || document.querySelector('.an-screen.an-log')) && !ui.turbo) { await new Promise(r => setTimeout(r, 200)); if (gen !== my) return; }
      const a = E.aiPick(S, prof, Math.random); if (!a) break;
      const said = stepOn() && !ui.turbo && !G.demo ? moveSaid(a) : null;
      const ctx = await doAction(a); if (gen !== my || !ctx) return;
      if (said && ctx.veto) said.tx = CARDS[ctx.veto.c].n + ' played itself for ' + (pname(ctx.veto.o) === 'You' ? 'you' : pname(ctx.veto.o)) + ', and ' + Kit.poss(pname(S.turn)) + ' ' + CARDS[ctx.veto.d].n.replace(/^The /, '') + ' did nothing.';   // (the Veto played itself)
      settle();
      if (stepOn() && !ui.turbo && !G.demo && !S.over) { await ackWait(said); if (gen !== my) return; render(); await wait(160); }
      else await wait(380);
      if (gen !== my) return;
    }
    await wait(250); if (gen !== my) return;
    endTurn();
  }
  async function discardOne(h) {
    const my = gen, o = S.turn; setBusy(true);
    E.discard(S, o, h); const evs = S.ev.splice(0); logEvs(evs); save();
    if (!(await playEvents(evs, { h: h, o: o }))) return;
    setBusy(false); V = snap();
    if (S.P[o].hand.length <= S.cfg.handMax) { ui.discard = false; if (gen === my) endTurn(); } else render();
  }
  async function endTurn() {
    const my = gen, o = S.turn;
    if (human(o) && S.P[o].hand.length > S.cfg.handMax) { ui.sel = null; ui.discard = true; setBusy(false); legal(); render(); Kit.sfx('bad'); return; }
    ui.sel = null; ui.discard = false; undoStack = []; setBusy(true); render();
    E.endTurn(S); const evs = S.ev.splice(0), mid = snap(); logEvs(evs);
    let evR = null; const r0 = S.P.map(p => p.renown);
    if (G.k < G.ord.length - 1) { G.k++; S.turn = G.ord[G.k]; G.ph = 'start'; }   // (the next player this round: G.ord, E.order)
    else {
      const rNow = G.hist.length + 1; E.endRound(S); evR = S.ev.splice(0); logEvs(evR, rNow); const held = tally(evR) || {}; if (G.tale) G.tale.hold.push(posOrder().map(i => held[i] == null ? '.' : 'abcdef'[held[i]]).join(''));
      G.hist.push(S.P.map((p, i) => p.renown - r0[i])); if (G.tale) G.tale.tot.push(S.P.map(p => p.renown).join('-'));   // (tot: Renown so far, with what Threads and Seals gave during the round)
      if (S.over) G.over = true; else { G.ord = E.order(S); G.k = 0; S.turn = G.ord[0]; G.ph = 'start'; }
    }
    if (G.over) { logEnd(); clearSave(); record(); } else save();
    if (!(await playEvents(evs, { o: o }))) return;
    V = mid; render();
    if (evR) { if (!(await roundEnd(evR))) return; }
    if (G.over) { V = snap(); ui.count = -1; setBusy(false); render(); await wait(500); if (gen === my) showWin(false); return; }
    beginTurn();
  }
  // The count: Place by Place down the map, the banner drops in the holder's colour and their Renown ticks up
  async function roundEnd(evs) {
    const my = gen, order = many() ? mapOrder() : rowsOrder(), groups = [], tail = []; let cur = null;
    evs.forEach(ev => { if (ev.t === 'hold') { cur = { p: ev.p, evs: [ev] }; groups.push(cur); } else if (ev.t === 'renown' || ev.t === 'spark') { cur = null; tail.push(ev); } else if (cur) cur.evs.push(ev); else tail.push(ev); });
    groups.sort((a, b) => order.indexOf(a.p) - order.indexOf(b.p));
    V.turn = -1; render(); Kit.sfx('pop'); await banner('', 'The count', '<span>Round ' + V.round + '</span>'); if (gen !== my) return false;
    const sp = speed; if (!ui.turbo && speed > 1) { speed = 1; document.documentElement.classList.remove('an-fast'); }   // (the count is never fast-forwarded; a lesson may slow it)
    for (const g of groups) { if (!(await playEvents(g.evs, {}))) return false; }
    ui.count = -1;
    if (!(await playEvents(tail, {}))) return false;
    render(); await wait(350); speed = sp;
    return gen === my;
  }

  // If a step ever throws, the game doesn't freeze: the table is drawn again from the engine (which is already
  // saved) and play carries on from there
  let slips = 0;
  function recover(e) {
    if (window.console) console.error('anoria', e);
    if (!G || !S || ++slips > 5) return;
    try { document.querySelectorAll('.clash,.show-card,.an-banner').forEach(n => n.remove()); dom.fx.innerHTML = ''; ui.sel = null; ui.count = -1; V = snap(); setBusy(false); legal(); render(); } catch (e2) {}
    if (G.over) setTimeout(() => showWin(true), 300);
    else if (G.ph === 'setup') setTimeout(() => { if (G && !G.over) suBegin(); }, 400);
    else if (G.ph === 'start' || !human(S.turn)) setTimeout(() => { if (G && !G.over) beginTurn(); }, 400);
  }
  const guard = fn => function () { const my = gen; return fn.apply(null, arguments).catch(e => { if (gen === my) recover(e); }); };
  beginTurn = guard(beginTurn); robotTurn = guard(robotTurn); endTurn = guard(endTurn); doHuman = guard(doHuman); discardOne = guard(discardOne);

  // ═══ The end ═════════════════════════════════════════════════════════════════════════════════════════════
  // How a game of three or more players ended, said as a sentence: the count that put a company out (the game ends
  // there, and the side still in with the most Renown wins: cfg.outEnds), the last side left, or the Renown
  const winName = w => (G.teams ? teamName(w) : pname(w));
  function endSaid() {
    const w = S.winner, W = winName(w), outs = S.P.map((p, o) => (p.out ? o : -1)).filter(o => o >= 0), tm = !!G.teams;
    if (w < 0) return 'The game ended level on Renown, Seals and Might.';
    if (S.how === 'seals' && outs.length && E.liveSides(S).length > 1) return listOf(outs.map(pname)) + (outs.length > 1 ? ' lost their last Seals' : ' lost the last Seal') + ' in round ' + S.round + ', and that ends the game. ' + W + (tm ? ' had the most Renown, with ' : ' had the most Renown of the players still in, with ') + E.sren(S, w) + '.';
    if (S.how === 'seals') return W + (tm ? ' were' : ' was') + ' the last ' + (tm ? 'team' : 'player') + ' left with Seals.';
    if (E.sren(S, w) >= S.cfg.target) return W + ' reached ' + E.sren(S, w) + ' Renown' + (tm ? ' together' : '') + ' at the end of round ' + S.round + '.';
    return W + ' had the most Renown when the last round ended.';
  }
  function modeName() { return G.mode === 'cpu' ? 'vs Computer (' + LEVEL_NAME[G.level] + ')' : 'Pass & play'; }
  function record() {
    if (S.N > 2) return recordN();
    const w = S.winner, T = G.tale, hl = [];
    // (a game begun before the history kept its details: the short notes it always had)
    if (!T) {
      if (w >= 0) hl.push(S.how === 'seals' ? pname(w) + ' broke all ' + (S.P[1 - w].sm === 4 ? 'four' : 'three') + ' of ' + Kit.poss(pname(1 - w)) + ' Seals in round ' + S.round : pname(w) + ' reached ' + S.P[w].renown + ' Renown after ' + S.round + ' rounds');
      else hl.push('A dead-level draw after ' + S.round + ' rounds');
      G.players.forEach((p, i) => { hl.push(p.name + ' played ' + p.deck + ', guided by ' + TXG[S.P[i].guide].n); });
    }
    const top = m => Object.keys(m).sort((a, b) => m[b] - m[a])[0] || '';
    try {
      Kit.record(KEY, { started: G.started, mode: modeName(), players: G.players.map((p, i) => ({ name: p.name, score: S.P[i].renown, cpu: p.cpu })), winner: w >= 0 ? pname(w) : null,
        rounds: T ? null : { labels: G.hist.map((x, i) => String(i + 1)), scores: G.hist }, highlights: hl,
        detail: !T ? { how: S.how, rounds: S.round, decks: G.players.map(p => p.deck).join(', '), seals: S.P.map(p => p.seals).join(' and ') } : {
          v: 2, how: S.how, rounds: G.hist.length, tg: S.cfg.target, w: w,
          pl: G.players.map((p, i) => { const st = G.stats[i], c = top(T.ko[i]); return { g: S.P[i].guide, d: p.deck, b: p.built ? 1 : 0, s: S.P[i].seals, sm: S.P[i].sm || 3, ko: st.ko, ln: st.lines, sb: st.seals, h: st.held, ch: c, cn: c ? T.ko[i][c] : 0 }; }),
          rt: T.tot.slice(), hold: T.hold.slice(), links: T.links.slice(), sl: T.seals.slice(),
          // (a game played with Domains: whose banner is on each of the five as the map lies, whose offer was the Crossroads, who took the first turn, the Domains each player laid at set-up as 'gate,outpost,offer', and the changes during the game)
          dm: S.dm ? { ban: MAPORD.map(i => S.ban[i]).join(''), dibs: S.su ? S.su.dibs : -1, first: S.f0 || 0, lay: S.su && S.su.lay ? S.su.lay.map(l => (l ? [l.gate, l.out, l.offer].join(',') : '')) : [], ch: (T.dom || []).slice() } : null,
          map: MAPORD.map(i => { const m = E.mights(S, i), by = o => S.figs.filter(f => f.p === i && f.o === o).map(f => f.c).join(','); return [S.places[i], E.holder(S, i), m[0], m[1], by(0), by(1)].join('|'); }) } });
    } catch (e) {}
    // the collection: cards that crossed the table are seen; a win against the computer can earn a pack or a Guide
    try { G.rew = Coll.gameOver({ win: G.mode === 'cpu' && w === 0, cpu: G.mode === 'cpu', level: G.level, built: !!G.players[0].built, seen: Object.keys(G.seen || {}) }); } catch (e) { G.rew = []; }
  }
  // The record of a game of three or more players for its history (hist/anoria.js reads it: v 3). Each player's
  // numbers as with two; rt, each round's Renown so far for every player; hold, who held each Domain at each count,
  // a letter a to f for each seat, in the engine's order of the Domains (each seat's Gate and Outpost, the Crossroads
  // last); sl, 'round|by|whose' for each Seal; outs, 'round|who'; tm, the teams.
  function recordN() {
    const w = S.winner, T = G.tale || { tot: [], hold: [], links: [], seals: [], ko: G.players.map(() => ({})) }, top = m => Object.keys(m || {}).sort((a, b) => m[b] - m[a])[0] || '';
    try {
      Kit.record(KEY, { started: G.started, mode: modeName(), players: G.players.map((p, i) => ({ name: p.name, score: S.P[i].renown, cpu: p.cpu })), winner: w >= 0 ? winName(w) : null, highlights: [],
        detail: { v: 3, n: S.N, how: S.how, rounds: G.hist.length, tg: S.cfg.target, w: w, tm: G.teams || null, out: S.P.map(p => (p.out ? 1 : 0)),
          pl: G.players.map((p, i) => { const st = G.stats[i], c = top(T.ko[i]); return { g: S.P[i].guide, d: p.deck, b: p.built ? 1 : 0, s: S.P[i].seals, sm: S.P[i].sm || 3, ko: st.ko, ln: st.lines, sb: st.seals, h: st.held, ch: c, cn: c ? T.ko[i][c] : 0, c: p.color, o: S.P[i].out ? 1 : 0 }; }),
          rt: T.tot.slice(), hold: T.hold.slice(), links: T.links.slice(), sl: T.seals.slice(), outs: (T.outs || []).slice() } });
    } catch (e) {}
    // (a win against the computer: your own, or your team's)
    try { G.rew = Coll.gameOver({ win: G.mode === 'cpu' && w >= 0 && E.ally(S, 0, w), cpu: G.mode === 'cpu', level: G.level, built: !!G.players[0].built, seen: Object.keys(G.seen || {}) }); } catch (e) { G.rew = []; }
  }
  // The results card for three or more players: everyone in order (or every team, with its Renown together), the
  // winner first and anyone who was put out last, and how it ended in a sentence
  function showWinN(quiet) {
    const w = S.winner, T = G.teams, win = w < 0 ? [] : T ? teamOf(w) : [w], people = G.players.some((p, o) => human(o));
    const lose = w >= 0 && people && !win.some(human), mine = G.mode === 'cpu' && win.indexOf(0) >= 0;
    const notes = [], earned = (G.rew || []).filter(x => window.AnoriaPacks);
    earned.forEach(x => notes.push(x.t === 'guide' ? TXG[x.g].n + ' joins you as a Guide' : 'A pack of ' + x.pack.n + ': ' + x.pack.why.charAt(0).toLowerCase() + x.pack.why.slice(1)));
    const said = endSaid(); notes.push(said);
    S.P.forEach((p, o) => { if (p.out && !/ lost (the last Seal|their last Seals) /.test(said)) notes.push(pname(o) + (pname(o) === 'You' ? ' are out' : ' is out') + ', with no Seals left'); });
    const rank = T ? T.map(t => t[0]).sort((a, b) => (E.ally(S, b, w) ? 1 : 0) - (E.ally(S, a, w) ? 1 : 0) || E.sren(S, b) - E.sren(S, a)).map(o => ({ name: teamName(o), score: E.sren(S, o), color: teamCol(o), cpu: !teamOf(o).some(human) }))
      : S.P.map((p, o) => o).sort((a, b) => (b === w) - (a === w) || (S.P[a].out ? 1 : 0) - (S.P[b].out ? 1 : 0) || S.P[b].renown - S.P[a].renown).map(o => ({ name: pname(o), score: S.P[o].renown, color: G.players[o].color, cpu: G.players[o].cpu }));
    Kit.win({ quiet: quiet, icon: w < 0 ? 'users' : lose ? 'bot' : 'trophy', lose: !!lose,
      title: w < 0 ? 'A draw' : T ? (mine ? 'Your team wins!' : winName(w) + ' win!') : lose ? pname(w) + ' wins this one' : pname(w) === 'You' ? 'You win!' : pname(w) + ' wins!',
      sub: 'Round ' + S.round + ', ' + (S.how === 'seals' ? 'when the Seals ran out' : 'on Renown'), notes: notes, notesTitle: 'How it ended', rank: rank,
      again: () => newGame({ mode: G.mode, level: G.level, teams: G.teams, players: G.players }), look: 'Look at the table', setup: showSetup, setupLabel: 'Change decks or players',
      extra: earned.length ? [{ label: earned.length === 1 ? earnedLabel(earned[0]) : 'See what you earned', onClick: () => { window.AnoriaPacks.earned(earned, showSetup); } }] : null });
  }
  const earnedLabel = x => x.t === 'guide' ? 'Meet your new Guide' : 'Open your pack';
  function showWin(quiet) {
    if (S.N > 2) return showWinN(quiet);
    const w = S.winner, lose = w >= 0 && G.players[w].cpu, order = [0, 1].sort((a, b) => (b === w) - (a === w) || S.P[b].renown - S.P[a].renown);
    const notes = [], earned = (G.rew || []).filter(x => window.AnoriaPacks);
    earned.forEach(x => notes.push(x.t === 'guide' ? TXG[x.g].n + ' joins you as a Guide' : 'A pack of ' + x.pack.n + ': ' + x.pack.why.charAt(0).toLowerCase() + x.pack.why.slice(1)));
    notes.push(S.how === 'seals' ? 'All ' + (S.P[1 - w].sm === 4 ? 'four' : 'three') + ' of ' + Kit.poss(pname(1 - w)) + ' Seals are broken' : w < 0 ? 'Level on Renown, Seals and Might' : 'First to ' + S.cfg.target + ' Renown at the end of a round');
    G.players.forEach((p, i) => notes.push((p.name === 'You' ? 'You have ' : p.name + ' has ') + S.P[i].seals + (S.P[i].seals === 1 ? ' Seal' : ' Seals') + ' left'));
    Kit.win({ quiet: quiet, icon: w < 0 ? 'users' : lose ? 'bot' : 'trophy', lose: !!lose,
      title: w < 0 ? 'A draw' : lose ? pname(w) + ' wins this one' : pname(w) === 'You' ? 'You win!' : pname(w) + ' wins!',
      sub: 'Round ' + S.round + ', ' + (S.how === 'seals' ? 'by breaking the Seals' : 'on Renown'), notes: notes, notesTitle: 'How it ended',
      rank: order.map(i => ({ name: pname(i), score: S.P[i].renown, color: G.players[i].color, cpu: G.players[i].cpu })),
      again: () => newGame({ mode: G.mode, level: G.level, players: G.players }), look: 'Look at the table', setup: showSetup, setupLabel: 'Change decks or players',
      extra: earned.length ? [{ label: earned.length === 1 ? earnedLabel(earned[0]) : 'See what you earned', onClick: () => { window.AnoriaPacks.earned(earned, showSetup); } }] : null });
  }

  // ═══ The page ════════════════════════════════════════════════════════════════════════════════════════════
  // The key to the marks on the map's tiles, drawn with the marks themselves (rules page)
  function kindKey() { const D = window.AnoriaDomains; if (!D) return ''; return '<span class="rk-keys">' + D.ORDER.map(k => '<span class="rk-k">' + D.mark(k).outerHTML + '<b>' + D.KINDS[k].n + '</b></span>').join('') + '</span>'; }
  function homeKey() { const D = window.AnoriaDomains; if (!D || !D.home) return ' '; const regs = ['MED', 'EUR', 'AFR', 'MIDEAST', 'ASIA', 'AMER']; let h = ''; try { h = regs.map(r => '<span class="rk-k">' + D.home(r).outerHTML + '<b>' + REG[r] + '</b></span>').join(''); } catch (e) { return ' '; } return '<span class="rk-keys">' + h + '</span>'; }
  const RULES = () => { const WIN = (G && S && !G.demo && !G.teams && S.cfg && S.cfg.target) || E.STD.target, RC = (G && S && !G.demo && S.N > 2 && S.cfg) || E.STD; return ('' +
    '<p>What the world remembers is never quite gone: it lives on in Anoria, the country of memory, where every age stands at once among the wonders of the world. At its heart turns a great sphere. Each time the sphere comes full circle an age ends, and the world can’t carry everything it knew into the next one.</p>' +
    '<p>So the greats gather companies to keep their people from being forgotten. You lead one, with one of the greats as your Guide. The world remembers whoever stands at its wonders, and that is Renown. A company comes into Anoria through its Gate, which three Seals hold open: a company whose Seals are all broken is shut out and forgotten.</p>' +
    '<p class="goal">Send great Figures from history to hold Places on the map. <b>The first player to reach ' + WIN + ' Renown</b> at the end of a round wins. With two players, breaking all of the other player\'s Seals wins on the spot. Each player starts with <b>3 Seals</b>.</p>' +
    '<h3>The map</h3><ul><li>With two players, five Places lie in a line: your <b>Gate</b> nearest you, then your <b>Outpost</b>, the shared <b>Crossroads</b>, and the other player\'s Outpost and Gate.</li>' +
    '<li>Each Place has one rule of its own, printed on it. Tap a Place to read it.</li>' +
    '<li>The mark on the left edge of a Place shows its kind:' + kindKey() + '</li>' +
    '<li>The house on the right edge shows the Place\'s home region, with the region\'s outline inside it.' + homeKey() + 'A Figure from that region has +1 Might there, and while you hold such a Figure in your hand or move one on the map, the houses where it would be at home light up gold.</li>' +
    (C.DM_LIVE ? '<li>The border of each Domain is the material of its kind, as well: a cord with seals for Commerce, riveted iron for Industry, a ruled margin for Thought, a battlement for Land, a dog-tooth frieze for Culture, a marble moulding for Law and a chart\'s border for Routes.</li></ul>' +
    '<h3>Domains</h3><ul><li>Each deck brings a <b>stack of ' + Coll.STACK + ' Domains</b>, no two the same. You choose them under Decks.</li>' +
    '<li>Before the first round, each player draws four Domains, lays one at their Gate and one at their Outpost, offers one for the Crossroads, and puts the fourth under their stack.</li>' +
    '<li>Then each player rolls a die. The highest roll\'s offer is laid at the Crossroads with that player\'s banner on it, and the next player round the table takes the first turn. If the highest roll is tied, the players in the tie roll again.</li>' +
    '<li>If the Might at the Crossroads is tied, the player whose banner is on it holds it, as long as they have a Figure there.</li>' +
    '<li>A Commerce Domain pays nothing at a Gate. Its rule works at an Outpost or the Crossroads.</li>' +
    '<li>Some cards lay a new Domain, move Domains or cover a Domain\'s rule. The turn log says what changed.</li></ul>' : '</ul>') +
    '<h3>Your turn</h3><ul><li>Your Figures are ready to act again, you <b>draw 2 cards</b> and you gain <b>Spark</b>: 2 in round 1 and one more each round, up to 7. If you\'re behind on Renown you get 1 extra.</li>' +
    '<li>Then, in any order, play cards and act. When you tap a card or one of your Figures, everywhere it can go lights up.</li>' +
    '<li>You play a <b>Figure</b> at your Gate, or at any Place where you already have one. Up to 3 of your Figures can stand at one Place.</li>' +
    '<li>Each Figure does one thing a turn: <b>walk</b> one step to the next Place, or <b>clash</b> with an enemy Figure where it stands. A Figure you have just played can clash but not walk.</li>' +
    '<li><b>Relics</b> stay in play. You can have 2 Relics in play at a time, and they have to be Relics with different powers. <b>Deeds</b> happen once and are gone.</li>' +
    '<li>You keep up to 2 Spark you don\'t spend through the other players\' turns. That Spark pays for a Deed with <b>Quick</b>, such as Phalanx, which plays itself when it saves your Figure.</li>' +
    '<li>Three Quick Deeds only ever play themselves, each at the moment its card names. <b>Testudo</b> pulls back a Figure of yours that loses a clash it started on an opponent\'s side, so it goes back to your Gate instead of being knocked out. The <b>Defense of Syracuse</b> drives back to its own Gate an enemy Figure that would win a clash it started at your Gate or your Outpost. The <b>Tribune\'s Veto</b> cancels a Deed an opponent plays that would score Renown or move, stun or knock out one of your Figures. Testudo is paid for with the Spark of your own turn, and the other two with Spark you kept.</li>' +
    '<li>You can hold 8 cards when your turn ends.</li></ul>' +
    '<h3>Two of a card</h3><ul><li>A deck is 40 cards, with one or two copies of each card, so a single card from a pack can go straight in. Both copies of a person can stand on your side at the same time.</li></ul>' +
    '<h3>Collecting</h3><ul><li>The small mark at the foot of the band down a card\'s left side is how rare the card is in packs: <span class="rr-i r1"></span>a dot is Common, <span class="rr-i r2"></span>a triangle Uncommon, <span class="rr-i r3"></span>a four-point star Rare and <span class="rr-i r4"></span>a compass rose Legendary. The cards that do the most are the rarest. Rarity plays no part in a game.</li>' +
    '<li>Every card comes in five <b>editions</b>: Matte, Shiny, Silver foil, Gold foil and Rainbow foil, each rarer than the one before. An edition is only the card\'s finish and frame, and all five play the same. When you read a card you own, the round button with the stack of cards on its picture shows that card\'s editions and lets you choose which one you see.</li></ul>' +
    '<h3>Might, home and away</h3><ul><li>The number on the shield is a Figure\'s <b>Might</b>.</li>' +
    '<li>A Figure has <b>+1 Might at a Place in its home region</b> (the small house on it). A Voyager has that +1 Might at every Place, and can walk to any Place in one move.</li></ul>' +
    '<h3>A clash</h3><ul><li>Both sides roll a die. The <b>higher roll adds 1</b> to its Figure\'s Might, or <b>2 if it is higher by 3 or more</b>. Then the Figure with the lower Might is knocked out. If they are tied, nothing happens.</li>' +
    '<li><b>Bounty</b>: knocking out a Figure of a player who is ahead of you on Renown scores 1 Renown.</li></ul>' +
    '<h3>Looking at cards</h3><ul><li><b>Hold your finger on any card</b>, in your hand or on the map, to read it large. Swipe sideways to go through the cards at that Place: everyone else’s Figures are to the left of the Place’s card and yours are to the right. Swipe up and down to go from Place to Place, to each player’s Guide and Relics, and to your hand. The little map at the left shows where you are, and how many Figures and how much Might each of you has at every Place.</li>' +
    '<li>Under the card in front are buttons for what you can do with that card now: play it, move it, or start a clash.</li>' +
    '<li>The computer makes one move at a time and waits for you to tap <b>Next</b>. You can turn that off in the menu.</li></ul>' +
    '<h3>Legacy Lines</h3><ul><li>A <b>Legacy Line</b> connects a card to the person, Relic or Place it grew from in history. The gold line down the right side of the card shows that source, and at the foot of the line what the Legacy Line gives you.</li>' +
    '<li>With the source in play on your side, the card scores <b>1 Renown</b> as you play it. A Figure scores the same way when you play that Figure at the Place named on the card.</li>' +
    '<li>A <b>Legacy Figure</b> has a Legacy Line to the person who inspired that Figure, drawn down the side of its card. With that person in play on your side, the Legacy Figure also costs 1 Spark less, and has +1 Might for as long as that person is in play on your side, connected by a gold Legacy Line on the map. A Legacy Figure with lines to two people has +1 Might for each of them in play on your side, so +2 with both, and a gold line to each one in play. Two copies of one of those people count once.</li>' +
    '<li>Every Legacy Line you make scores its Renown, however many you make in a round.</li></ul>' +
    '<h3>Your collection</h3><ul><li>Your first win of the day against the computer earns a pack of ' + ((window.AnoriaColl && AnoriaColl.DAILY) || 5) + ' cards. So do your first win against Normal, against Hard, and with a deck you built.</li>' +
    '<li>A deck has one <b>Guide</b>, and you never play two at once. You start with the Guide you chose. There are ' + NUM(Object.keys(C.GUIDES).length) + ' Guides. The other ' + NUM(Object.keys(C.GUIDES).length - 1) + ' join you one at a time as you beat the computer: the first at ' + Coll.GUIDE_AT[0] + ' wins and the last at ' + Coll.GUIDE_AT.slice(-1)[0] + '. Each has a different power, so a new Guide is a new way to play, and any deck you build can have them as its Guide. Five of the Guides each bring a ready deck, which opens once you own its cards.</li>' +
    '<li>A pack holds cards from the whole set. Each card in it is one you are missing, or a finish of a card you haven\'t found yet, so you go on collecting Shiny, Silver, Gold and Rainbow cards after you own every card. A deck can still hold no more than two of a card.</li></ul>' +
    '<h3>The end of a round</h3><ul><li>When every player has had a turn, each Place goes to the side with <b>the most Might</b> there. If the Might is tied, nobody holds the Place. An empty or tied Gate stays with its owner.</li>' +
    '<li>Each Place you hold scores <b>1 Renown</b>, and a Place scores the same in every round of the game. The banner on a Place shows what it scores and who holds it right now.</li>' +
    '<li>If you hold an opponent\'s Gate, one of their <b>Seals breaks</b>. Breaking a Seal scores you 1 Renown, on top of what the Place itself scores.</li>' +
    '<li>The <b>Theodosian Walls</b> give you a Seal: they mend a broken one, or add a fourth. No player can have more than 4 Seals.</li>' +
    '<li>Some Deeds make a Place score <b>double</b> at this round\'s count, and its banner shows the doubled number until then. A Place scores double only once, however many Deeds double it.</li>' +
    '<li>Some Deeds last until the count, and their card lies on the table until then: on a Domain, like the <b>Peace of Westphalia</b>, which stops every clash there, or on a Figure, like the <b>Walk to Canossa</b>, which switches off the skills and powers on its card.</li>' +
    '<li>Whoever has the most Renown goes first next round, so whoever is behind has the last word. If you are level, you take turns going first.</li>' +
    '<li>If more than one player passes ' + WIN + ' in the same round, whoever has the most Renown wins. The game also ends after 14 rounds, and again whoever has the most Renown wins.</li></ul>' +
    '<h3>Three to six players</h3><ul><li>Each player\'s Gate and Outpost are a spoke off the Crossroads, and each Outpost is also joined by a road to the Outposts on either side. Your spoke is drawn large in the middle of the table, and everyone else\'s spoke is round the edge, starting with the player on your left.</li>' +
    '<li>A player\'s Figures at a Place away from your spoke stand as one stack, the strongest on top, with their Might added up on its shield. Tap a stack to read every card in it.</li>' +
    '<li>Each round, whoever has the most Renown goes first, and the turns go round the table to the left.</li>' +
    '<li>A player who loses their last Seal is out of the game. ' + (RC.outEnds ? 'The count that puts a player out ends the game, and whoever has the most Renown of the players still in wins.' : 'Their Figures leave the map, and the game goes on without them until one player is left or someone reaches ' + E.STD.target + ' Renown.') + '</li>' +
    '<li>A card that says <b>an opponent</b> means any other player. The Congress of Vienna counts 4 and 5 on the spoke of the player on your left. With the Columbian Exchange you choose whose Gate and Outpost trade places with yours, by tapping that player\'s Gate.</li></ul>' +
    '<h3>Teams</h3><ul><li>With 4 or 6 players you can play in teams: 2 against 2, 3 against 3, or three teams of 2. Teammates sit with an opponent between them, and each team has a color of its own and a diamond on its players\' plates.</li>' +
    '<li>A team\'s Renown is its players\' Renown added together. The first team to reach 20 Renown for each player on it, and 5 more, wins: 45 Renown for a team of two, and 65 for a team of three.</li>' +
    '<li>' + (RC.tmight === 'add' ? 'Teammates add their Might together to hold a Place. ' : '') + 'Teammates can\'t clash with each other, no card hurts a teammate, and holding a teammate\'s Gate breaks none of their Seals.</li></ul>' +
    '<h3>Tips</h3><ul><li>Tap any card, Figure, Guide or Place to read it full size.</li><li>Your Guide\'s power is always on. Build your turn around it.</li>' +
    '<li>You can take a move back from the menu, as long as it drew no card and rolled no dice.</li></ul>').replace(/\bPlace(s?)\b/g, (m, x) => (C.DM_LIVE ? 'Domain' + x : m)); };
  // The Library, Packs and Decks, from the menu or from the home screen's sheet (anoria.html?library=1 and so on): each
  // opens over whatever is on the table and leaves a game as it is; over the setup, the setup is drawn again after
  // (a new deck, a pack opened). Someone who has not chosen a first deck yet has nothing to show there.
  function tool(name) {
    if (G && G.demo) return;
    if (!Coll.load().starter) { Kit.toast('Choose your first deck, and the ' + (name === 'library' ? 'Library' : name === 'packs' ? 'packs' : 'decks') + ' will open.', 2600); return; }
    const after = () => { if (!G) showSetup(); };
    if (name === 'library' && window.AnoriaLibrary) window.AnoriaLibrary.open(after);
    else if (name === 'packs' && window.AnoriaPacks) window.AnoriaPacks.open(after);
    else if (name === 'decks' && window.AnoriaDecks) window.AnoriaDecks.open(null, after);
  }
  // Choosing a mat (the game's menu). It opens over the setup or a game and leaves it as it is; in a game the table
  // behind takes the new mat at once. Pass and play: each person chooses their own (the first person's choice is
  // the account's, anoria_mat; the other person's stays with this game). What is on offer: the mat of whichever
  // Guide you are playing (the choice until you make another), every mat in MATS, the chart, and a mat made from
  // the picture of any card you have found, which you then place by hand (MatKit's editor, in this game's look).
  function matPicker() {
    if (G && G.demo) return;
    Kit.sfx('tap');
    const live = !!(G && S && dom.pm), seats = live ? G.players.map((p, o) => o).filter(human) : [0], two = seats.length > 1, N = live ? S.N : 2;
    let cur = live ? (seats.indexOf(ui.view) >= 0 ? ui.view : seats[0]) : 0;
    const guide = () => live ? S.P[cur].guide : (Coll.deck(starterId()) || {}).guide || Object.keys(TX.GUIDES)[0];
    const chosen = () => live ? matPick(cur) : matMineV();
    const isArt = v => typeof v === 'object' && !!v;
    // the choice is kept: the account's in anoria_mat, the other person's with this game. `settled` is false while a
    // hand is still moving a picture: the table shows it, and it is stored when the hand lets go.
    function keep(pick, settled) {
      if (!live || matMine(cur)) { if (settled === false) mine.live = pick; else { mine.live = null; lsSet(MATK, matStore(pick) || null); } }
      else { if (pick) G.players[cur].mat = pick; else delete G.players[cur].mat; if (settled !== false) save(); }
      paintMats();
    }
    function put(id) { if (id === chosen()) return; keep(id); Kit.sfx('flip', .6); Kit.haptic('light'); paint(); }
    // the shape of a mat on this table (its width over its height), or what it will be on a screen this shape
    function shape() {
      const n = live && (N > 2 ? (dom.nm || [])[cur] : dom.pm[0]), w = n ? n.offsetWidth : 0, h = n ? n.offsetHeight : 0; if (w > 40 && h > 20) return w / h;
      const W = window.innerWidth, H = window.innerHeight; return W > H ? (H >= 600 ? 1.8 : 2.57) : W >= 700 ? 2.7 : 2.2;
    }
    // every picture you have found: your Guides, your cards, and the Places
    function pictures() {
      const c = Coll.load(), ok = k => !noPic(k) && !noArt[artSrc(k, true)];
      return (c.guides || []).filter(k => TX.GUIDES[k]).concat(Object.keys(CARDS).filter(k => (c.cards || {})[k] > 0), C.SHOWN || Object.keys(C.PLACES)).filter(ok);
    }
    // a new picture mat: the picture as MatKit first lays it, on a cloth of the picture's own colour. A mat that
    // already has a picture keeps where the picture lay and how large it was.
    function usePicture(key) {
      matTone(key, t => {
        const old = chosen(), fy = FY[key], place = isPlace(key);
        const v = MK.make({ c: key, w: place ? 960 : 640, h: place ? 640 : 960, col: t ? t.col : undefined, d: t ? t.d : undefined, focus: [.5, fy != null ? fy / 100 : place ? .5 : .3] }, shape());
        // (the part of a tall picture the card itself keeps in view, FY, is the part the mat shows first)
        if (v.s > 1) v.y = Math.round((v.s / 2 - (v.s - 1) * (fy != null ? fy / 100 : place ? .5 : .22)) * 1000) / 1000;
        if (isArt(old)) { v.x = old.x; v.y = old.y; v.s = old.s; v.f = old.f; if (!old.au) { v.au = 0; v.col = old.col; } }
        keep(v); Kit.sfx('flip', .6); Kit.haptic('light'); paint();
        if (ed) { ed.set(v); edSc.title.textContent = info(v.c).n; } else placeIt(v);
      });
    }
    function choose() {
      const keys = pictures(), on = chosen(), at = keys.indexOf(isArt(on) ? on.c : guide());
      browse(keys, { at: Math.max(0, at), title: 'Choose a picture', sub: 'The cards you have found', pick: { label: 'Use this picture', fn: usePicture } });
    }
    // placing the picture: the mat in its real shape, as large as the screen allows
    let ed = null, edSc = null;
    function placeIt(v) {
      matTone(v.c, () => {
        edSc = screen({ title: info(v.c).n, cls: 'an-mt an-mte', onClose: () => { if (ed) ed.close(); ed = null; edSc = null; paint(); } });
        edSc.tools.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Done', onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); edSc.close(); } }));
        ed = MK.edit({ host: edSc.body, value: v, cls: 'an-mk', matCls: 'an-pm', btn: 'btn btn-soft btn-sm',
          url: x => artSrc(x.c, false), thumb: x => artSrc(x.c, true), own: x => toneOf[x.c], shape: shape, maxH: () => Math.max(150, window.innerHeight - 350),
          dress: (mat, x) => { mat.style.setProperty('--mc', x.col); mat.style.setProperty('--mth', 'color-mix(in srgb,' + x.col + ' 40%,#cdbb8c)'); mat.style.setProperty('--md', 0); },
          onChange: (x, settled) => keep(x, settled), another: choose,
          icons: { hand: Kit.icon('hand'), centre: Kit.icon('target'), small: SVG.art, big: SVG.art },
          words: { size: 'The size of the picture', centre: 'Put the picture back in the middle of the mat', cloth: 'Cloth', colour: 'Colour', fromPic: 'A cloth color taken from the picture', another: 'Choose another card',
            stage: 'The picture on the mat. Drag the picture to move it. Pinch, scroll or use the slider to change its size.' } });
      });
    }
    const sc = screen({ title: 'Play mats', cls: 'an-mt' });
    const who = el('div', { class: 'mt-who' }), view = el('div', { class: 'mt-view', 'aria-hidden': 'true' }), say = el('p', { class: 'mt-say' }), grid = el('div', { class: 'mt-grid' });
    sc.body.appendChild(el('div', { class: 'mt' }, [el('div', { class: 'mt-look' }, [who, view, say]), grid]));
    const mat = (id, slot, cls) => { const n = el('div', { class: 'an-pm ' + cls }); matFill(n, id, slot); return n; };
    // (until a card is chosen, the swatch shows what such a mat is: this Guide's picture on a cloth of its own colour)
    const sample = g => { const t = toneOf[g], fy = FY[g]; return MK.make({ c: g, w: 640, h: 960, col: t ? t.col : '#1b2850', d: t ? t.d : .2, f: 'quilt', focus: [.5, fy != null ? fy / 100 : .3] }, 2.33); };
    function paint() {
      if (!sc.el.isConnected) return;
      const g = guide(), on = chosen(), art = isArt(on) ? on : null, name = two ? Kit.poss(pname(cur)) : 'Your', other = live && N === 2 ? Kit.poss(pname(1 - cur)) : 'the other player\'s';
      who.innerHTML = ''; who.hidden = !two;
      if (two) seats.forEach(o => who.appendChild(el('button', { type: 'button', class: 'btn btn-sm ' + (o === cur ? 'btn-primary' : 'btn-soft'), 'aria-pressed': String(o === cur), onclick: () => { if (o === cur) return; cur = o; Kit.sfx('tap'); Kit.haptic('light'); paint(); } },
        [el('i', { style: { background: G.players[o].color || PCOL[o] } }), el('span', { text: pname(o) })])));
      // the two mats as they lie on the table: this player's nearest, the other player's beyond it (turned to face
      // them when two people sit at one device)
      view.innerHTML = ''; view.classList.toggle('one', !live || N > 2);
      if (live && N === 2) view.appendChild(mat(matOf(1 - cur), 'v1', 'top' + (matTurned() ? ' turn' : '')));
      view.appendChild(mat(on || g, 'v0', 'bot'));
      say.textContent = name + ' mat lies under ' + (two ? name : 'your') + ' Gate and Outpost, ' + (N > 2 ? 'and every other player\'s mat lies under their own Gate and Outpost round the table.' : 'and meets ' + other + ' mat under the Crossroads.');
      grid.innerHTML = '';
      const sw = (isOn, shown, slot, title, sub, face, fn) => grid.appendChild(el('button', { type: 'button', class: 'mt-sw' + (isOn ? ' on' : ''), 'aria-pressed': String(isOn), 'aria-label': title + '. ' + sub, onclick: fn }, [
        el('span', { class: 'mt-m' }, [mat(shown, slot, ''), face ? el('span', { class: 'mt-g', style: { '--f': FAC[info(face).f].c } }, [artImg(face, true)]) : null]),
        el('b', { text: title }), el('small', { text: sub })]));
      sw(!on, g, 'sg', two ? 'The mat of ' + name + ' Guide' : 'Your Guide\'s mat', 'This mat changes with the Guide ' + (two ? pname(cur) + ' plays' : 'you play') + '.', g, () => put(''));
      Object.keys(MATS).filter(id => TX.GUIDES[id] || !TXG[id] || id === on).forEach(id => sw(id === on, id, 's', MATS[id].n, TX.GUIDES[id] ? Kit.poss(TX.GUIDES[id].n) + ' mat' : 'The old map of the world', null, () => put(id)));
      if (MK) sw(!!art, art || sample(g), 'sa', 'A card\'s picture', art ? 'This mat shows the picture from the ' + info(art.c).n + ' card.' : (two ? pname(cur) + ' chooses' : 'You choose') + ' a card and place its picture anywhere on the mat.', null,
        () => { Kit.sfx('tap'); Kit.haptic('light'); if (art) placeIt(art); else choose(); });
    }
    if (MK) matTone(guide(), paint);
    paint();
  }
  Kit.init({
    id: KEY, color: '#d9b45a', mark: false, rules: RULES, guide: () => { if (window.AnoriaGuide) window.AnoriaGuide.open(); else Kit.rules(); },
    theme: { felt: ['#22305a', '#141d3a', '#0b1124'], wood: ['#4a3826', '#261b11'], back: ['#10131c', '#b8862d'] },
    onNew: () => { if (G && G.demo) demo.end(); else showSetup(); }, undo: undo,
    menu: [
      { icon: 'book', label: 'Library', sub: 'Every card, and the ones you own', onClick: () => tool('library') },
      { icon: 'sparkle', label: 'Packs', sub: 'Open the packs you have won', onClick: () => tool('packs') },
      { icon: 'cards', label: 'Decks', sub: 'Build a deck of your own', onClick: () => tool('decks') },
      { icon: 'palette', label: 'Play mats', sub: 'Choose the mat on your side of the table', onClick: matPicker },
      { icon: 'clock', label: 'Computer moves one at a time', sub: 'The computer waits for you to tap Next after each move', toggle: () => stepOn(), onClick: toggleStep },
      { icon: 'rows', label: 'Turn log', sub: 'Everything that has happened in this game', when: () => !!(G && S && !G.demo), onClick: logScreen },
      { icon: 'history', label: 'Past games', onClick: () => Kit.history(KEY, { title: 'Anoria: past games' }) }
    ]
  });


  // ═══ Lessons on the table ════════════════════════════════════════════════════════════════════════════════
  // guide.js plays its lessons and the quick start on this same table: a made-up position (never saved, never
  // recorded), with the script choosing every step and every roll. Your own game waits in its save and comes back.
  function resume() {
    const d = readSave();
    if (d && d.v === 1 && d.G && d.G.S && !d.G.over && d.G.S.figs) { try { restore(d); return; } catch (e) {} }
    showSetup();
  }
  const demo = {
    on: () => !!(G && G.demo), gen: () => gen, S: () => S, q: s => (dom.root ? dom.root.querySelector(s) : null), wait: ms => wait(ms),
    // o = {S (an engine state), players: [{name, cpu, color}]}
    begin(o) {
      stop(); S = o.S; S.st = null; S.ev = []; speed = 1; ui.clashHold = null;
      G = { demo: 1, mode: 'cpu', level: 'normal', players: o.players, S: S, ord: [S.turn, 1 - S.turn], k: 0, ph: 'start', started: Date.now(), n: 0,
        stats: [{ ko: 0, lines: 0, seals: 0, held: 0 }, { ko: 0, lines: 0, seals: 0, held: 0 }], hist: [], seen: {} };
      ui.view = 0; ui.viewer = 0; ui.hideHand = false; ui.banner = S.round; ui.count = -1;
      buildTable(); V = snap(); V.turn = -1; render(); return gen;
    },
    // the set-up with Domains (the Domains lesson): o = {S at its set-up (newGame with stacks and {wait}), players,
    // dice: [[yours, theirs], ...]}. You lay yours as at a real set-up, by taps the lesson makes; the other player's are
    // laid already. done() resolves when the dice have decided the Crossroads.
    setup(o) {
      stop(); S = o.S; S.st = null; S.ev = []; speed = 1; ui.clashHold = null;
      G = { demo: 1, mode: 'cpu', level: 'normal', players: o.players, S: S, ord: [0, 1], k: 0, ph: 'setup', started: Date.now(), n: 0, suShow: 1, suDice: o.dice,
        stats: [{ ko: 0, lines: 0, seals: 0, held: 0 }, { ko: 0, lines: 0, seals: 0, held: 0 }], hist: [], seen: {} };
      ui.view = 0; ui.viewer = 0; ui.hideHand = false; ui.su = { o: 0, put: {}, sel: null }; ui.banner = 0; ui.count = -1;
      buildTable(); V = snap(); render(); setBusy(false); return gen;
    },
    suDone: () => new Promise(res => { G.suDone = res; }),
    // the start of o's turn: Figures ready, Spark, two cards
    async turn(o) {
      const my = gen; S.turn = o; ui.sel = null; ui.demoIdle = false; setBusy(true);
      E.startTurn(S); G.ph = 'play'; const evs = S.ev.splice(0);
      if (!(await playEvents(evs, { o: o }))) return false;
      V = snap(); setBusy(false); demo.light(human(o)); if (human(o)) Kit.sfx('turn', .5);
      return gen === my;
    },
    // light up what can be played (as on your own turn), or put the lights out
    light(on) { ui.demoIdle = !!on; ui.sel = null; legal(); render(); },
    // pick something up: {kind: 'hand', h} or {kind: 'fig', u}; everywhere it can go lights up
    lift(sel) { ui.demoIdle = true; setBusy(false); legal(); select(sel); },
    drop() { ui.sel = null; render(); },
    acts: () => E.actions(S), speed(n) { speed = n || 1; }, holdClash(fn) { ui.clashHold = fn; },
    // one step, with the dice the lesson wants: roll = [attacker's die, defender's die]
    async act(a, dice) {
      const my = gen, lit = ui.demoIdle; let roll = null;
      if (dice) { const gap = Math.abs(dice[0] - dice[1]), b = !gap ? 0 : gap >= 3 ? 2 : 1; roll = { ra: dice[0], rd: dice[1], da: dice[0] > dice[1] ? b : 0, dd: dice[1] > dice[0] ? b : 0 }; }
      ui.sel = null; setBusy(true); render();
      const ctx = await doAction(a, roll ? { roll: roll } : null); if (gen !== my || !ctx) return false;
      setBusy(false); ui.demoIdle = lit; legal(); settle(); return true;
    },
    async endTurn() {
      const my = gen; ui.sel = null; ui.demoIdle = false; setBusy(true); render();
      E.endTurn(S); const evs = S.ev.splice(0); if (!(await playEvents(evs, { o: S.turn }))) return false;
      V = snap(); V.turn = -1; render(); return gen === my;
    },
    // the count at the end of a round
    async count() {
      const my = gen, r0 = S.P.map(p => p.renown); ui.demoIdle = false; setBusy(true);
      E.endRound(S); const evR = S.ev.splice(0); G.hist.push(S.P.map((p, i) => p.renown - r0[i]));
      ui.counting = true; const ok = await roundEnd(evR); ui.counting = false; if (!ok) return false;
      V = snap(); V.turn = -1; render(); return gen === my;
    },
    async round() {   // the banner that opens a round
      const my = gen, st = E.stake(S.cfg, S.round), up = S.round > 1 && st > E.stake(S.cfg, S.round - 1);
      V = snap(); V.turn = -1; render();
      if (up) { Kit.sfx('win'); Kit.haptic('success'); ui.flip = 1; render(); ui.flip = 0; } else Kit.sfx('pop');
      await banner(up ? 'Round ' + S.round : '', up ? 'The stakes double' : 'Round ' + S.round, up ? LAUREL + LAUREL + '<span>Every Place now scores 2 Renown</span>' : '');
      return gen === my;
    },
    // change the position by hand (a lesson skipping ahead), then draw it
    set(fn) { fn(S); S.ev = []; demo.show(); },
    show() { V = snap(); if (!ui.demoIdle) V.turn = -1; legal(); render(); },
    end() { const was = demo.on(); stop(); if (!was) return; G = null; S = null; V = null; resume(); }
  };

  // A full-screen layer over the page (the table underneath is left alone), with a back button, a title and room on
  // the right for the screen's own controls. Sheets and the card reader open above it. o = {title, cls, onClose}
  // Returns {el (the layer), head, tools (right of the title), body (scrolls), close()}
  function screen(o) {
    o = o || {};
    const back = el('button', { type: 'button', class: 'icon-btn an-sc-back', 'aria-label': 'Back', html: Kit.icon('back') });
    const title = el('h1', { class: 'an-sc-t', text: o.title || '' }), tools = el('div', { class: 'an-sc-tools' });
    const head = el('header', { class: 'an-sc-h' }, [back, title, tools]), body = el('div', { class: 'an-sc-b' });
    const layer = el('div', { class: 'an-screen ' + (o.cls || ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || '' }, [head, body]);
    let closed = false;
    function close() { if (closed) return; closed = true; document.removeEventListener('keydown', key); layer.classList.remove('show'); setTimeout(() => layer.remove(), 240); if (o.onClose) o.onClose(); }
    function key(e) { if (e.key !== 'Escape' || document.querySelector('.k-scrim.show, .view.show')) return; const all = document.querySelectorAll('.an-screen'); if (all[all.length - 1] === layer) close(); }   // (the top screen, with nothing open over it)
    back.addEventListener('click', () => { Kit.sfx('tap'); Kit.haptic('light'); close(); });
    document.addEventListener('keydown', key);
    document.body.appendChild(layer); requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add('show')));
    return { el: layer, head: head, title: title, tools: tools, body: body, close: close };
  }
  // what the collection's screens (library.js, packs.js, decks.js) share with the table
  window.AnoriaUI = { line: () => !!(ui.lay && ui.lay.ln), homeFoot: homeFoot, DW: DW, DSHORT: DSHORT, lineScene: lineScene, lineage: lineage, app: app, el: el, esc: esc, C: C, E: E, TX: TX, CARDS: C.CARDS, Coll: Coll, FAC: FAC, REG: REG, PLAN: PLAN, DECKS: DECKS, PCOL: PCOL, MARK: MARK, LAUREL: LAUREL, SVG: SVG,
    cardEl: cardEl, artImg: artImg, mono: mono, noPic: noPic, warm: warm, artReady: artReady, preload: preload, info: info, boldKeys: boldKeys, openView: openView, closeView: closeView, browse: browse, makeFlow: makeFlow, deckSheet: deckSheet, deckFacs: deckFacs, listOf: listOf,
    showSetup: showSetup, inGame: () => !!(G && S && !G.over && !G.demo), screen: screen, demo: demo, resume: resume, readyDeck: readyDeck, hubRefresh: () => { const h = document.querySelector('.an-hub'); if (h) h.parentNode.replaceChild(hubRow(), h); } };
  window.__anoria = { seatColors: seatColors, teamsFor: teamsFor, scan: scan, relegal: () => { legal(); V = snap(); render(); }, E: E, ui: ui, mats: MATS, G: () => G, S: () => S, V: () => V, card: cardEl, view: openView, newGame: newGame, act: doHuman, legal: () => ui.acts, idle: idle, endTurn: endTurn, setSpeed: s => { speed = s; }, turbo: s => { ui.turbo = s; speed = s || 1; }, showWin: showWin, refresh: () => { legal(); V = snap(); render(); }, events: (evs, ctx) => playEvents(evs, ctx || {}), undo: undo };

  // The art proof (anoria.html?art=1): every card as it is drawn at each size, side by side, so a new or changed
  // picture can be checked in one look: the full card, the small card, the smallest hand card and the piece on the
  // map. Nothing a picture is about should be cut off or sit under a number.
  function artProof() {
    stop(); G = null; S = null; V = null;
    // (?art=1&only=hannibal,compass shows just those; a card that comes in editions has a line for each of them)
    // (&matte=1: a contact sheet, each card once in its plain finish with no play mats)
    const only = (/[?&]only=([^&]+)/.exec(location.search) || [])[1], sheet = /[?&]matte=1/.test(location.search), EDS = window.AnoriaEd && !sheet ? window.AnoriaEd.ED : [{ id: 'matte', n: '' }];
    const keys = Object.keys(C.CARDS).concat(Object.keys(TX.GUIDES), Object.keys(C.PLACES)).filter(k => !only || only.split(',').indexOf(k) >= 0);
    const cell = (label, node) => el('div', { class: 'ap-c' }, [node, el('small', { text: label })]);
    const sized = (cls, n) => el('div', { class: 'ap-s ' + cls }, [n]);
    const rows = keys.map(k => {
      const c = info(k), fig = c.kind === 'fig', row = el('div', { class: 'ap-row' }, [el('h2', { text: c.n })]);
      (C.CARDS[k] ? EDS : EDS.slice(0, 1)).forEach((x, e) => {
        const line = el('div', { class: 'ap-line' }, [cell(C.CARDS[k] && x.n ? x.n : 'Full', sized('full', cardEl(k, { ed: e })))]);
        if (C.CARDS[k] && window.AnoriaEd) { line.appendChild(cell('The picture large', sized('full an-artview', cardEl(k, { ed: e, tg: true })))); }
        if (c.kind === 'place' && C.DM_LIVE) {   // (a Domain: small in a hand at the set-up, and as it lies on the map)
          line.appendChild(cell('Small', sized('mini', cardEl(k, { mini: true }))));
          // (as it lies on a phone's map and on an iPad's: the phone's tile has its words eased down as fitPlates does there)
          const onMap = (cls, f) => { const t = suTile(k); if (f) t.classList.add(f); return el('div', { class: 'an-map ap-tile ' + cls }, [el('div', { class: 'pl su' }, [el('div', { class: 'pl-side L' }), t, el('div', { class: 'pl-side R' })])]); };
          line.appendChild(cell('On a phone\u2019s map', onMap('phone', 'f3'))); line.appendChild(cell('On an iPad\u2019s map', onMap('pad')));
          setTimeout(() => line.querySelectorAll('.ap-tile.pad .pl-tile').forEach(roomy), 0);
        }
        if (c.kind !== 'place') {
          line.appendChild(cell('Small', sized('mini', cardEl(k, { mini: true, ed: e }))));
          if (c.c != null) line.appendChild(cell('Smallest', el('div', { class: 'an-hand small' }, [sized('tiny', cardEl(k, { mini: true, ed: e }))])));
        }
        if (fig) {
          const art = el('span', { class: 'fp-art' }), im = artImg(k, true); if (im) art.appendChild(im);
          line.appendChild(cell('On the map', el('span', { class: 'fp o0' + (e ? ' ed-' + x.id : ''), style: { '--f': (FAC[c.f] || FAC.N).c, '--fw': '62px' } }, [el('span', { class: 'fp-card' }, [art]), el('span', { class: 'fp-m' }, [el('b', { text: String(c.m) })]), c.reg && window.AnoriaDomains ? el('span', { class: 'fp-home' }, [window.AnoriaDomains.home(c.reg)]) : null])));
        }
        row.appendChild(line);
      });
      return row;
    });
    // the play mats, each the size it lies on a phone, under an empty standing place and a piece of each player's colour
    const piece = o => el('span', { class: 'fp o' + o, style: { '--f': FAC.V.c } }, [el('span', { class: 'fp-card' }, [el('span', { class: 'fp-art' })]), el('span', { class: 'fp-m' }, [el('b', { text: '4' })])]);
    if (!sheet) rows.push(el('div', { class: 'ap-row' }, [el('h2', { text: 'Play mats' }), el('div', { class: 'ap-line' }, Object.keys(MATS).map(id => {
      const n = el('div', { class: 'an-pm ap-mat' }); matFill(n, id, 'proof');
      n.appendChild(el('div', { class: 'an-map ap-on', style: { '--fw': '38px' } }, [el('span', { class: 'slot' }), piece(0), piece(1), el('span', { class: 'slot' })]));
      return cell(MATS[id].n, n); }))]));
    app.className = 'stage an-proof'; app.innerHTML = '';
    // (the Domains: the seven frames, the pieces that lie on a Domain and the round track, on every mat: domains.js.
    // ?art=1&only=domains shows that part alone.)
    const dp = window.AnoriaDomains && (!only || only.split(',').indexOf('domains') >= 0) ? window.AnoriaDomains.proof({ cardEl: cardEl, artImg: artImg, matFill: matFill, mats: MATS, rule: RULE }) : null;
    app.appendChild(el('div', { class: 'ap' }, [el('h1', { text: 'Art proof' }), el('p', { text: keys.length + ' cards, each at every size it is drawn' + (EDS.length > 1 ? ' in every edition' : '') + ', and the play mats.' })].concat(rows, dp ? [dp] : [])));
  }

  const saved = readSave();
  const want = (/[?&](library|packs|decks|guide)(=|&|$)/.exec(location.search) || [])[1];   // (a row of the home screen's sheet)
  if (!/[?&]art(=|&|$)/.test(location.search)) warmSmall();   // (the proof draws every picture itself)
  if (/[?&]art(=|&|$)/.test(location.search)) artProof();
  else if (saved && saved.v === 1 && saved.G && saved.G.S && !saved.G.over && saved.G.S.figs) { try { restore(saved); } catch (e) { showSetup(); } }
  else if (window.AnoriaGuide && window.AnoriaGuide.firstTime()) { window.AnoriaGuide.quickStart(); return; }   // (the first time here: two minutes of the game being played)
  else showSetup();
  if (want === 'guide') { if (window.AnoriaGuide) window.AnoriaGuide.open(); }
  else if (want && Coll.load().starter) tool(want);
})();
