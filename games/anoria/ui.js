// Anoria: the playable table. The rules live in engine.js (AnoriaEngine); this file draws the table, lets a
// player pick up a card or a Figure and shows where it can go, and plays back what the engine did from its
// event log (S.ev), one moment at a time.
(function () {
  'use strict';
  const E = window.AnoriaEngine, C = window.AnoriaCards, TX = window.AnoriaText, LAND = window.AnoriaLand || [];
  const CARDS = C.CARDS, el = Kit.el, esc = Kit.esc, app = document.getElementById('app');
  const KEY = 'anoria', SAVE = 'anoria_save', FAST = 'anoria_fast', ART = 'anoria/art/';
  const Coll = window.AnoriaColl;   // your collection (coll.js): what you own, your decks, what a game earns

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
    stonehenge: 'Holder: +1 Spark', globe: 'Arts +1', machu: 'Own side only', timbuktu: 'Arrive for 1 less', petra: 'Safe from Deeds', nineveh: '', seneca: ''
  };
  const GLOSS = {
    voyager: ['Voyager', 'this Figure is at home at every Place and can walk to any Place.'],
    scholar: ['Scholar', 'you draw a card when this Figure arrives.'],
    guard: ['Guard', 'enemies here must clash with this Figure first.'],
    steadfast: ['Steadfast', 'this Figure has +2 Might when it defends.'],
    inspiring: ['Inspiring', 'your other Figures here get +1 Might.'],
    swift: ['Swift', 'this Figure can walk on the turn it arrives.'],
    raider: ['Raider', 'this Figure has +2 Might when it attacks on the other player\'s side of the map.']
  };
  const LEVEL = { easy: 'novice', normal: 'normal', hard: 'hard' }, LEVEL_NAME = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
  const PCOL = ['#f2b84b', '#8fd3f4'];
  const MARK = {
    fig: '<svg viewBox="0 0 12 12"><circle cx="6" cy="4" r="2.4" fill="#e8b04a"/><path d="M1.6 11.2c.4-3 2.3-4.3 4.4-4.3s4 1.3 4.4 4.3Z" fill="#e8b04a"/></svg>',
    legacy: '<svg viewBox="0 0 12 12"><path d="M2 7 6 3.2 10 7M2 10.6 6 6.8l4 3.8" fill="none" stroke="#e8b04a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    guide: '<svg viewBox="0 0 12 12"><path d="M2.6 1v10.4" stroke="#e8b04a" stroke-width="1.5" stroke-linecap="round"/><path d="M2.6 1.6h7.6L8 4.4l2.2 2.8H2.6z" fill="#e8b04a"/></svg>',
    relic: '<svg viewBox="0 0 12 12"><path d="M6 .8 11.2 6 6 11.2.8 6z" fill="#e8b04a"/><circle cx="6" cy="6" r="1.7" fill="#10131c"/></svg>',
    deed: '<svg viewBox="0 0 12 12"><path d="M7.2.6 2.2 6.8h3.1l-.8 4.6 5.3-6.4H6.6z" fill="#e8b04a"/></svg>',
    place: '<svg viewBox="0 0 12 12"><path d="M1.2 4.8 6 1.4l4.8 3.4z" fill="#e8b04a"/><path d="M1.6 10.8h8.8M2.8 10.4V5.4M6 10.4V5.4M9.2 10.4V5.4" stroke="#e8b04a" stroke-width="1.4" stroke-linecap="round"/></svg>'
  };
  const SVG = {
    home: '<svg viewBox="0 0 12 12"><path d="M1.4 6 6 1.8 10.6 6M2.8 5.2v5h6.4v-5" fill="none" stroke="#b8862d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arch: '<svg viewBox="0 0 12 12"><path d="M2 11V5.5a4 4 0 0 1 8 0V11M4.6 11V6.6a1.4 1.4 0 0 1 2.8 0V11" fill="none" stroke="#10131c" stroke-width="1.6" stroke-linecap="round"/></svg>',
    swords: '<svg viewBox="0 0 24 24"><g fill="none" stroke="#e9cf86" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3l10 10M4 3v3.4M4 3h3.4M12.2 15.8l3.6-3.6M13.4 14.6 19 20.2M17.6 21.6l2.8-2.8"/><path d="M20 3 10 13M20 3v3.4M20 3h-3.4M11.8 15.8l-3.6-3.6M10.6 14.6 5 20.2M6.4 21.6l-2.8-2.8"/></g></svg>',
    ff: '<svg class="ico" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 5l8 7-8 7zM13 5l8 7-8 7z"/></svg>'
  };
  const LAUREL = '<img src="anoria/ui/mark-renown.webp" alt="">';

  const SAY = TX.SAY || {}, FY = TX.FY || {};
  function info(key) {
    if (CARDS[key]) { const c = CARDS[key], t = TX.CARDS[key] || {}; return { key: key, kind: c.t, n: c.n, f: c.f, c: c.c, m: c.m, reg: c.reg, insp: c.insp, k: c.k || {}, quick: c.quick, tx: t.tx || '', cap: t.cap || '', fact: t.fact || '', ll: t.ll, say: SAY[key], fy: FY[key] }; }
    if (TX.GUIDES[key]) { const g = TX.GUIDES[key]; return { key: key, kind: 'guide', n: g.n, f: g.f, k: {}, tx: g.tx, cap: g.cap, fact: g.fact, ll: g.ll, say: SAY[key], fy: FY[key] }; }
    if (C.PLACES[key]) { const p = C.PLACES[key], t = TX.PLACES[key] || {}; return { key: key, kind: 'place', n: p.n, f: 'P', reg: p.reg, era: p.era, k: {}, tx: t.tx || '', cap: t.cap || '', fact: t.fact || '', ll: t.ll, say: SAY[key], fy: FY[key] }; }
    return { key: key, kind: 'fig', n: key, f: 'N', k: {}, tx: '', cap: '', fact: '' };
  }
  const isPlace = key => !CARDS[key] && !TX.GUIDES[key] && !!C.PLACES[key];
  const names = list => list.map(k => info(k).n).join(' or ');

  // ═══ Pictures: a missing one leaves the flat panel underneath showing ════════════════════════════════════
  const noArt = {}, hasArt = {};
  function artSrc(key, small) { return ART + (small ? 't/' : '') + (isPlace(key) ? 'place-' : '') + key + '.webp'; }
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
  const loaded = {};
  function newImg(key, small, src) {
    let mem = small && kept[src];
    const im = el('img', { src: mem || src, alt: '', draggable: 'false', decoding: small ? 'sync' : 'async' });
    if (FY[key] != null) im.style.objectPosition = '50% ' + FY[key] + '%';   // (which part of the picture to keep, wherever it is cropped)
    im.onerror = function () { if (mem) { mem = ''; kept[src] = ''; im.src = src; return; } noArt[src] = 1; im.remove(); };
    im.onload = function () { hasArt[src] = 1; if (small) { keep(src); if (!loaded[src]) loaded[src] = im; } };
    return im;
  }
  // the name shown where a picture is missing (left out once the picture is known to be there, so a piece
  // that is drawn again never flashes its name)
  const noArtLabel = (key, small, cls) => hasArt[artSrc(key, small)] ? null : el('span', { class: cls, text: info(key).n });
  function preload(keys) { keys.forEach(k => { const src = artSrc(k, true); if (hasArt[src] || noArt[src]) return; const im = new Image(); im.onload = () => { hasArt[src] = 1; keep(src); }; im.onerror = () => { noArt[src] = 1; }; im.src = src; }); }

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
  function mapSVG(ll, color) {
    if (!ll) return '';
    const ck = ll.join(',') + color; if (mapCache[ck]) return mapCache[ck];
    const W = 284, H = 196, k = 10.92, cx = 227.2, cy = 47, ky = k / Math.cos(ll[1] * Math.PI / 180), lon0 = ll[0], lat0 = ll[1], pad = 6;
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
    for (let la = Math.ceil(latA / 5) * 5; la <= latB; la += 5) grat += '<path d="M0 ' + Y(la).toFixed(1) + 'H' + W + '"/>';
    for (let lo = Math.ceil(lonA / 5) * 5; lo <= lonB; lo += 5) grat += '<path d="M' + X(lo).toFixed(1) + ' 0V' + H + '"/>';
    const id = 'anh' + (++mapN);
    const s = '<svg class="ac-map" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMaxYMin slice" aria-hidden="true"><defs><pattern id="' + id + '" width="5" height="3.2" patternUnits="userSpaceOnUse"><path d="M0 1.6H5" stroke="#5a6f78" stroke-width=".55"/></pattern></defs>' +
      '<g opacity=".6"><rect width="' + W + '" height="' + H + '" fill="url(#' + id + ')" opacity=".22"/><path d="' + d + '" fill="#f8f5ee"/><path d="' + d + '" fill="#efe6d2" opacity=".55"/>' +
      '<g fill="none" stroke="#7b6a52" stroke-width=".4" stroke-dasharray="2 3" opacity=".45">' + grat + '</g><path d="' + d + '" fill="none" stroke="#5b4a33" stroke-width=".8" stroke-linejoin="round" opacity=".55"/></g>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="9" fill="none" stroke="' + color + '" stroke-width="1.2" opacity=".55"/><circle cx="' + cx + '" cy="' + cy + '" r="3.4" fill="' + color + '"/></svg>';
    mapCache[ck] = s; return s;
  }

  // ═══ The card ════════════════════════════════════════════════════════════════════════════════════════════
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function tear(key) {   // the torn top edge of the paper: the same tear every time for the same card
    const R = E.rng(hash(key)); let x = 0, out = ['0% ' + (R() * .5).toFixed(2) + 'em'];
    while (x < 96) { x += 3 + R() * 3.4; if (x >= 99) break; out.push(x.toFixed(1) + '% ' + (R() * .68).toFixed(2) + 'em'); }
    out.push('100% .2em', '100% 100%', '0 100%'); return 'polygon(' + out.join(',') + ')';
  }
  function boldKeys(tx) {
    return esc(tx).replace(/(^|\. )(Legacy of [^.]+|Voyager|Scholar|Guard|Steadfast|Inspiring|Swift|Raider|Law|Quick|Eureka!)(?=[.:! ]|$)/g, '$1<b>$2</b>');
  }
  // a card's or a Place's name as it reads in the middle of a sentence ("the Library of Alexandria", "Timbuktu")
  const THE = { library: 1, silk: 1, acropolis: 1, globe: 1, colosseum: 1, wall: 1 };
  const theName = x => x[0] === '@' ? (THE[x.slice(1)] ? 'the ' : '') + C.PLACES[x.slice(1)].n : (CARDS[x].t === 'relic' ? 'the ' : '') + CARDS[x].n;
  // cardEl(key, {mini, cost}): the approved card. mini = a hand card (picture, name, cost, Might).
  function cardEl(key, o) {
    o = o || {};
    const c = info(key), f = FAC[c.f] || FAC.N, place = c.kind === 'place', fig = c.kind === 'fig';
    const kind = place ? 'place' : c.kind === 'guide' ? 'guide' : fig ? (c.insp ? 'legacy' : 'fig') : c.kind;
    const label = { place: 'Place', guide: 'Guide', fig: 'Figure', legacy: 'Legacy', relic: 'Relic', deed: c.quick ? 'Quick Deed' : 'Deed' }[kind];
    const n = el('div', { class: 'ac t-' + kind + (fig ? ' hasst' : '') + (o.mini ? ' mini' + (c.c != null ? ' sp' : '') : ''), style: { '--f': f.c }, 'data-card': key });
    if (c.fy != null) n.style.setProperty('--fy', c.fy + '%');   // (which part of its picture this card keeps in view)
    const inn = el('div', { class: 'ac-in' });
    const art = el('div', { class: 'ac-art' }, [noArtLabel(key, !!o.mini, 'ac-noart')]);
    // (a full card shown on the table: the small picture is there at once, and the full one comes in over it)
    if (o.now && !o.mini) { const lo = artImg(key, true, true); if (lo && lo.tagName === 'CANVAS') art.appendChild(lo); }
    const im = artImg(key, !!o.mini, o.now); if (im) art.appendChild(im);
    inn.appendChild(art);
    if (c.c != null) { const cost = o.cost != null ? o.cost : c.c; inn.appendChild(el('div', { class: 'ac-cost' + (cost < c.c ? ' less' : '') }, [el('b', { text: String(cost) })])); }
    inn.appendChild(el('div', { class: 'ac-kind', html: MARK[kind] + '<span>' + label + '</span>' }));
    const paper = el('div', { class: 'ac-paper', style: { 'clip-path': tear(key) } });
    if (!o.mini && c.ll) paper.innerHTML = mapSVG(c.ll, place ? '#8a6a2a' : f.c);
    paper.appendChild(el('div', { class: 'ac-rib' }, [el('span', { text: place ? REG[c.reg] : f.n })]));
    paper.appendChild(el('div', { class: 'ac-name', text: c.n }));
    if (!o.mini) {
      paper.appendChild(el('div', { class: 'ac-when', text: c.cap }));
      paper.appendChild(el('div', { class: 'ac-txt', html: boldKeys(c.tx) }));
      if (c.fact) paper.appendChild(el('div', { class: 'ac-fact', text: c.fact }));
      // (how the name is said, as fine print at the foot: a Place's paper is as tall as its words, so it goes last in it)
      if (c.say && place) paper.appendChild(el('div', { class: 'ac-say', text: c.say, 'aria-label': 'Said ' + c.say }));
    }
    inn.appendChild(paper);
    if (fig) inn.appendChild(el('div', { class: 'ac-st m' }, [el('b', { text: String(o.might != null ? o.might : c.m) })]));
    // the foot of a full card: how the name is said, between a Figure's Might and its home
    // and under that, in finer print, the Thread: what this card grew from (Tim: the link belongs on the card)
    const from = !o.mini && !place && CARDS[key] && CARDS[key].from && E.STD.threads ? 'Thread from ' + listOf(CARDS[key].from.map(theName), 'or') : '';
    if (!o.mini && !place && (c.say || fig || from)) {
      if (c.say) n.classList.add('hassay'); if (from) n.classList.add('hasfrom');
      inn.appendChild(el('div', { class: 'ac-foot' }, [el('div', { class: 'ac-mid' }, [c.say ? el('div', { class: 'ac-say', text: c.say, 'aria-label': 'Said ' + c.say }) : null, from ? el('div', { class: 'ac-from', text: from }) : null]),
        fig ? el('div', { class: 'ac-home', html: SVG.home + '<span>' + esc(REG[c.reg] || '') + '</span>' }) : null]));
    }
    n.appendChild(inn);
    return n;
  }

  // ═══ Reading a card full size ════════════════════════════════════════════════════════════════════════════
  let viewEl = null;
  function closeView() { if (!viewEl) return; const v = viewEl; viewEl = null; v.classList.remove('show'); document.removeEventListener('keydown', viewKey); setTimeout(() => v.remove(), 220); }
  function viewKey(e) { if (e.key === 'Escape') closeView(); }
  function mightParts(f) {   // where a Figure's Might on the table comes from (the engine's sum, spelled out)
    const c = CARDS[f.c], k = c.k || {}, pl = C.PLACES[S.places[f.p]], out = [['On the card', c.m]];
    const home = c.reg === pl.reg, at = home || k.voyager;
    if (f.tb) out.push(['Phalanx', f.tb]);
    if (at) out.push([home ? 'At home' : 'Voyager, at home anywhere', 1 + (k.homeDouble && home ? 2 : 0)]);
    let own = 0, opp = 0, insp = 0;
    for (const g of S.figs) if (g.p === f.p) { if (g.o === f.o) { own++; if (g !== f && CARDS[g.c].k.inspiring) insp++; } else opp++; }
    if (f.li) out.push(['Legacy line', 1]);
    if (insp) out.push(['Inspired', Math.min(2, insp)]);
    if (k.uprising && own > 1) out.push(['Others here', own - 1]);
    if (k.orator && own > opp) out.push(['More of you here', 2]);
    if (k.underdog && opp > own) out.push(['Outnumbered', 2]);
    if (k.monument && f.stay) out.push(['Rounds stayed', Math.min(2, f.stay)]);
    if (k.shoulders && S.P[f.o].lines) out.push(['Legacy lines', Math.min(2, S.P[f.o].lines)]);
    if (S.places[f.p] === 'globe' && c.f === 'A') out.push(['Globe Theatre', 1]);
    const sum = out.reduce((s, x) => s + x[1], 0);
    return sum === E.might(S, f, 0) ? out : null;
  }
  function openView(key, o) {
    o = o || {}; closeView(); Kit.sfx('flip'); Kit.haptic('light');
    const c = info(key), notes = el('div', { class: 'view-notes' });
    const f = o.u != null && S ? E.byU(S, o.u) : null;
    if (f) {
      const parts = mightParts(f);
      if (parts && parts.length > 1) notes.appendChild(el('div', { class: 'mt' }, parts.map(p => el('span', { html: esc(p[0]) + ' <b>' + (p === parts[0] ? '' : '+') + p[1] + '</b>' }))));
    }
    if (c.insp) notes.appendChild(el('p', { html: '<b>Legacy</b>: if ' + esc(names(c.insp)) + ' is in play on your side when you play this card, it costs 1 less and you score 1 Renown as it arrives. A gold line joins them, and this card has +1 Might while they stand. Only one line or Thread scores in a round.' }));
    if (CARDS[key] && CARDS[key].from && E.STD.threads) {
      const src = CARDS[key].from.map(theName), fig = CARDS[key].t === 'fig';
      const how = CARDS[key].from.map(x => x[0] === '@' ? (fig ? 'at ' + theName(x) : 'while a Figure of yours is at ' + theName(x)) : 'while ' + theName(x) + ' is ' + (CARDS[x].t === 'relic' ? 'in play' : 'on your side'));
      notes.appendChild(el('p', { html: '<b>Thread</b>: this card grew from ' + esc(listOf(src, 'or')) + '. It scores 1 Renown when you play it ' + esc(listOf(how, 'or')) + '. Only one line or Thread scores in a round.' }));
    }
    Object.keys(GLOSS).forEach(k => { if (c.k[k] && new RegExp(GLOSS[k][0] + '(\\.|$)').test(c.tx)) notes.appendChild(el('p', { html: '<b>' + GLOSS[k][0] + '</b>: ' + esc(GLOSS[k][1]) })); });
    if (c.kind === 'place') {
      notes.appendChild(el('p', { html: '<b>Home ground</b>: ' + esc(REG[c.reg]) + ' Figures have +1 Might here.' }));
      if (o.p != null && S) {
        const own = E.ownerOfSpoke(S, o.p), gate = E.isGate(S, o.p);
        if (gate) notes.appendChild(el('p', { html: '<b>' + esc(Kit.poss(pname(own))) + ' Gate</b>: ' + (own === ui.view ? 'your' : 'their') + ' Figures arrive here. If the other side holds it when a round ends, a Seal breaks.' }));
        else notes.appendChild(el('p', { html: own < 0 ? '<b>The Crossroads</b> lies between the two Outposts.' : '<b>' + esc(Kit.poss(pname(own))) + ' Outpost</b> lies between the Gate and the Crossroads.' }));
        const worth = (S.places[o.p] === 'acropolis' ? 2 : 1) * E.stake(S.cfg, S.round);
        notes.appendChild(el('p', { html: '<b>This round</b>: holding this Place scores ' + worth + ' Renown.' }));
      }
    }
    if (c.kind === 'guide') notes.appendChild(el('p', { html: '<b>Guide</b>: a Guide is always in play, so this power is on for the whole game.' }));
    const card = cardEl(key, { might: f ? E.might(S, f, 0) : null });
    const v = el('div', { class: 'view', role: 'dialog', 'aria-modal': 'true', 'aria-label': c.n, onclick: closeView }, [
      el('button', { type: 'button', class: 'icon-btn view-x', 'aria-label': 'Close', html: Kit.icon('close') }), card, notes.childNodes.length ? notes : null]);
    // (a lesson reads the card part by part: it sits under the lesson's rings and caption, with room kept for the
    // caption below it, or beside it when the screen is sideways)
    const side = o.lesson && window.innerWidth > window.innerHeight * 1.15, bar = o.lesson ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar')) || 56) : 0;
    if (o.lesson) v.classList.add('lesson'); if (side) v.classList.add('side');
    const vw = Math.min(side ? window.innerWidth * .34 : window.innerWidth - 36, 420), vh = window.innerHeight - (o.lesson ? 26 : 40) - bar - (side ? 0 : o.room || 0);
    document.body.appendChild(v);
    // as big as fits: the card, then what's written under it
    let w = vw; v.style.setProperty('--vw', w + 'px');
    const under = () => (!side && !o.lesson && notes.childNodes.length ? notes.offsetHeight + 12 : 0);
    for (let i = 0; i < 12 && w > (o.lesson ? 150 : 200) && card.offsetHeight + under() > vh; i++) { w = Math.round(w * .92); v.style.setProperty('--vw', w + 'px'); }
    viewEl = v; document.addEventListener('keydown', viewKey);
    requestAnimationFrame(() => requestAnimationFrame(() => v.classList.add('show')));
  }

  const listOf = (a, w) => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' ' + (w || 'and') + ' ' + a[a.length - 1];
  // ═══ Setup ═══════════════════════════════════════════════════════════════════════════════════════════════
  function deckFacs(cards) {
    const n = {}; cards.forEach(k => { const f = CARDS[k].f; if (f !== 'N') n[f] = (n[f] || 0) + 1; });
    return Object.keys(n).sort((a, b) => n[b] - n[a]).map(f => [f, n[f]]);
  }
  // a deck's Guide and cards, one of each with how many (d = {n, guide, cards})
  function deckSheet(d) {
    const list = el('div', { class: 'dk-list' }), n = {}; d.cards.forEach(k => { n[k] = (n[k] || 0) + 1; });
    [d.guide].concat(Object.keys(n).sort((a, b) => (CARDS[a].t === 'fig' ? 0 : 1) - (CARDS[b].t === 'fig' ? 0 : 1) || CARDS[a].c - CARDS[b].c)).forEach(k => {
      list.appendChild(el('button', { type: 'button', class: 'hc', 'aria-label': info(k).n + (n[k] > 1 ? ', two' : ''), onclick: () => openView(k) }, [cardEl(k, { mini: true }), n[k] > 1 ? el('span', { class: 'hc-n', text: '2' }) : null]));
    });
    Kit.sheet({ title: d.n + ': ' + d.cards.length + ' cards', node: list, actions: [{ label: 'Done', cls: 'btn-soft' }] });
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
  function deckPicker(label, value, set, who) {
    value = deckChoice(value, who);
    const box = el('div', { class: 'k-opt dk-pick' }, [el('div', { class: 'label' }, [el('span', { text: label })])]);
    const row = el('div', { class: 'dk-row' });
    const all = who === 'cpu' ? [{ id: 'any', n: 'Surprise me', ok: true }].concat(DECKS.map(readyDeck)) : Coll.decks().sort((a, b) => (b.ok ? 1 : 0) - (a.ok ? 1 : 0));
    all.forEach(d => {
      const any = d.id === 'any', g = any ? null : d.guide;
      const pic = el('span', { class: 'dk-g' + (any || !g ? ' back' : ''), style: any || !g ? null : { '--f': FAC[TX.GUIDES[g].f].c } });
      if (g) { const im = artImg(g, true); if (im) pic.appendChild(im); }
      const cols = el('span', { class: 'dk-c' });
      (any ? [['D', 1], ['S', 1], ['V', 1], ['A', 1], ['W', 1]] : deckFacs(d.cards)).forEach(x => cols.appendChild(el('i', { style: { '--c': FAC[x[0]].c, '--n': x[1] } })));
      row.appendChild(el('button', { type: 'button', class: 'dk' + (value === d.id ? ' on' : '') + (d.ok ? '' : ' locked'), 'aria-pressed': String(value === d.id), 'aria-label': d.n + (d.ok ? '' : ', not yours to play yet: ' + d.why.join(', ')),
        onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); if (d.ok) set(d.id); else lockedDeck(d); } },
        [pic, el('span', { class: 'dk-n', text: d.n }), d.ok ? cols : el('span', { class: 'dk-own', html: Kit.icon('lock') + '<b>' + (d.ready ? d.own + ' of 30' : d.cards.length + ' of 30') + '</b>' })]));
    });
    if (who !== 'cpu' && window.AnoriaDecks) row.appendChild(el('button', { type: 'button', class: 'dk dk-new', onclick: () => { Kit.sfx('tap'); window.AnoriaDecks.open(null, showSetup); } },
      [el('span', { class: 'dk-g back plus', html: Kit.icon('plus') }), el('span', { class: 'dk-n', text: 'Build a deck' })]));
    box.appendChild(row);
    const d = value === 'any' ? null : who === 'cpu' ? readyDeck(value.slice(6)) : Coll.deck(value);
    if (d) {
      const g = TX.GUIDES[d.guide];
      box.appendChild(el('div', { class: 'dk-info' }, [
        el('div', { class: 'plan', text: d.ready ? PLAN[d.n] : 'A deck you built' }),
        el('div', { class: 'gd', html: '<b>' + esc(g.n) + '</b> is this deck’s Guide. ' + esc(g.tx) }),
        el('span', { class: 'dk-btns' }, [
          d.built && window.AnoriaDecks ? el('button', { type: 'button', class: 'btn btn-soft btn-sm', text: 'Change', onclick: () => { Kit.sfx('tap'); window.AnoriaDecks.open(d.id, showSetup); } }) : null,
          el('button', { type: 'button', class: 'btn btn-soft btn-sm', text: 'Cards', onclick: () => { Kit.sfx('tap'); deckSheet(d); } })])
      ]));
    } else box.appendChild(el('div', { class: 'dk-info' }, [el('div', { class: 'plan', text: 'The game picks one of the five decks when it starts.' })]));
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
  let curMode = 'cpu';
  function showSetup() {
    stop(); G = null; S = null; V = null; clearSave();
    app.className = 'stage'; app.innerHTML = ''; window.scrollTo(0, 0);
    // the first time: choose your Guide (their deck is your starter) and open your welcome packs
    if (!Coll.load().starter && window.AnoriaPacks) { window.AnoriaPacks.chooseStarter(app, showSetup); return; }
    const who = i => (i === 1 && curMode === 'cpu' ? 'cpu' : 'me');
    // (the computer starts on Easy until you've won a game: a first game is for learning)
    const st = Kit.setup(app, {
      modes: Kit.modes([{ id: 'cpu', desc: 'Easy, Normal or Hard' }, { id: 'local' }]),
      options: [
        { id: 'deck0', value: starterId(), when: m => { curMode = m; return true; }, render: (v, set) => deckPicker(curMode === 'cpu' ? 'Your deck' : 'First player\'s deck', v, set, 'me'), summary: v => { const d = Coll.deck(deckChoice(v, 'me')); return d ? d.n : ''; } },
        { id: 'deck1', value: 'any', render: (v, set) => deckPicker(curMode === 'cpu' ? 'The computer\'s deck' : 'Second player\'s deck', v, set, who(1)) },
        { id: 'level', robot: true, label: 'Computer skill', value: Coll.load().wins ? 'normal' : 'easy', choices: [['easy', 'Easy', 'It stops early and misses things, which makes for a good first game.'], ['normal', 'Normal', 'It plays to hold Places, with the odd slip.'], ['hard', 'Hard', 'It plays its best, and comes for your Gate and your Seals.']], when: m => m === 'cpu' }
      ],
      players: { min: 2, max: 2, cpu: m => m === 'cpu' ? 'seats' : false },
      start: 'Deal the cards',
      onStart: cfg => {
        const cpu = cfg.players.some(p => p.cpu);
        const theirs = v => { const id = deckChoice(v, 'cpu'); return readyDeck(id === 'any' ? DECKS[(Math.random() * DECKS.length) | 0] : id.slice(6)); };
        newGame({ mode: cpu ? 'cpu' : 'local', level: LEVEL[cfg.options.level] ? cfg.options.level : 'normal',
          players: cfg.players.map((p, i) => { const d = p.cpu ? theirs(cfg.options.deck1) : Coll.deck(deckChoice(cfg.options['deck' + i], 'me'));
            return { name: p.name, cpu: !!p.cpu, color: PCOL[i], deck: d.n, deckId: d.id, built: !!d.built, guide: d.guide, cards: d.cards.slice() }; }) });
      }
    });
    const seats = st && st.el && st.el.querySelector('.k-seats'); if (seats) seats.parentNode.insertBefore(hubRow(), seats.nextSibling);
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
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  function save() {
    if (!G || !S || G.demo) return;   // (a lesson on the table is never saved: your own game is)
    if (G.over) { clearSave(); return; }
    lsSet(SAVE, JSON.stringify({ v: 1, G: Object.assign({}, G, { S: Object.assign({}, S, { cfg: null, st: null, ev: null }) }) }));
    Kit.resume.set('Round ' + S.round, { keys: [SAVE] });
  }
  function clearSave() { lsSet(SAVE, null); Kit.resume.clear(); }
  function stop() { gen++; ui.demoIdle = false; ui.clashHold = null; if (window.AnoriaGuide) window.AnoriaGuide.halt(); document.documentElement.classList.remove('an-fast'); ui.sel = null; ui.busy = false; ui.discard = false; undoStack = []; closeView(); try { Kit.handoff.close(); } catch (e) {} document.querySelectorAll('.clash,.show-card,.an-banner,.an-story').forEach(n => n.remove()); if (dom.fx) dom.fx.innerHTML = ''; }
  // (a player from before decks could be built: their ready deck by name)
  function deckOf(p) { if (!p.cards) { const A = C.ARCH[p.deck] || C.ARCH.Explorers; p.cards = A.cards.concat(A.cards); p.guide = A.guide; } return p; }
  function newGame(cfg) {
    stop();
    cfg.players.forEach(deckOf);
    const decks = cfg.players.map(p => p.cards.slice()), guides = cfg.players.map(p => p.guide);
    S = E.newGame(decks, guides, cfgStd(), E.rng((Math.random() * 4294967296) >>> 0));
    S.st = null; S.ev = [];
    const first = E.firstOf(S);
    G = { mode: cfg.mode, level: cfg.level, players: cfg.players, S: S, ord: [first, 1 - first], k: 0, ph: 'start', started: Date.now(), n: 0,
      stats: [{ ko: 0, lines: 0, seals: 0, held: 0 }, { ko: 0, lines: 0, seals: 0, held: 0 }], hist: [], seen: {} };
    S.turn = first;
    ui.view = G.mode === 'cpu' ? 0 : first; ui.viewer = G.mode === 'cpu' ? 0 : -1; ui.banner = 0;
    Kit.gameStart(); save(); buildTable(); V = snap(); render();
    beginTurn();
  }
  function restore(d) {
    stop(); G = d.G; S = G.S; S.cfg = cfgStd(); S.st = null; S.ev = []; G.players.forEach(deckOf); G.seen = G.seen || {};
    ui.view = G.mode === 'cpu' ? 0 : S.turn; ui.viewer = G.mode === 'cpu' ? 0 : -1; ui.banner = S.round;
    buildTable(); V = snap(); render(); beginTurn();
  }
  // What's on the table right now, as the screen shows it. Playing back the engine's log moves this along
  // one event at a time; settle() brings it level with the engine again.
  function snap() {
    return { round: S.round, turn: S.turn,
      figs: S.figs.map(f => ({ u: f.u, c: f.c, o: f.o, p: f.p, rdy: f.rdy, arr: f.arr, acted: f.acted, stun: f.stun, li: f.li, m: E.might(S, f, 0) })),
      P: S.P.map(p => ({ hand: p.hand.slice(), deck: p.deck.length, relics: p.relics.slice(), guide: p.guide, spark: p.spark, reserve: p.reserve, renown: p.renown, seals: p.seals, uA: p.uA, uT: p.uT, uC: p.uC, uD: p.uD })),
      tot: S.places.map((x, i) => E.mights(S, i)), hold: S.places.map((x, i) => E.holder(S, i)), pb: S.pb.map(x => x.slice()) };
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
  function buildTable() {
    app.className = 'an-on'; app.innerHTML = ''; window.scrollTo(0, 0);
    preload(S.places.concat(S.P.map(p => p.guide), G.players.reduce((a, p) => a.concat(deckOf(p).cards), [])));
    dom.opp = el('div', { class: 'an-strip opp' }); dom.me = el('div', { class: 'an-strip me' });
    dom.map = el('div', { class: 'an-map', onclick: onMapTap }); dom.cap = el('div', { class: 'an-cap' }); dom.hand = el('div', { class: 'an-hand', onclick: onHandTap });
    dom.fx = el('div', { class: 'an-fx' });
    const felt = el('div', { class: 'an-felt felt-in' }, [dom.opp, dom.map, dom.cap, dom.me, dom.hand]);
    if (chart()) felt.style.setProperty('--chart', 'url("' + chart() + '")');
    dom.root = el('div', { class: 'an k-hold' }, [el('div', { class: 'an-mat wood' }, [felt]), dom.fx]);
    app.appendChild(dom.root);
  }
  const rowsOrder = () => { const v = ui.view, t = 1 - v; return [2 * t, 2 * t + 1, 4, 2 * v + 1, 2 * v]; };
  const idle = () => !!G && !G.over && !ui.busy && G.ph === 'play' && human(S.turn) && ui.viewer === S.turn && !ui.hideHand && (!G.demo || ui.demoIdle);

  function stripEl(node, o, me) {
    const p = V.P[o], pl = G.players[o], g = TX.GUIDES[p.guide], on = V.turn === o && !G.over;
    node.className = 'an-strip ' + (me ? 'me' : 'opp') + ' p' + o + (on ? ' on' : ''); node.innerHTML = ''; node.dataset.o = o;
    const spent = on && ((p.guide === 'tubman' && p.uT) || (p.guide === 'suntzu' && p.uC) || (p.guide === 'franklin' && p.uD));   // (a once-a-turn power, used)
    const gb = el('button', { type: 'button', class: 'st-guide' + (spent ? ' used' : ''), 'aria-label': g.n + ', ' + Kit.poss(pl.name) + ' Guide', style: { '--f': FAC[g.f].c }, onclick: () => openView(p.guide) }, [el('span', { class: 'na', text: g.n.charAt(0) })]);
    const gi = artImg(p.guide, true); if (gi) gb.appendChild(gi);
    node.appendChild(gb);
    const seals = el('div', { class: 'st-seals', 'aria-label': p.seals + ' of 3 Seals left' });
    for (let i = 0; i < 3; i++) seals.appendChild(el('span', { class: 'seal' + (i >= p.seals ? ' broken' : '') + (ui.crack && ui.crack.o === o && ui.crack.i === i ? ' crack' : '') }));
    const relics = el('div', { class: 'st-relics' });
    const T = me ? targets() : null;
    for (let i = 0; i < 2; i++) {
      const r = p.relics[i];
      if (r) { const b = el('button', { type: 'button', class: 'relic' + (r === 'antikythera' && p.uA && on ? ' used' : ''), 'aria-label': info(r).n, 'data-relic': r, onclick: () => openView(r) }); const im = artImg(r, true); if (im) b.appendChild(im); relics.appendChild(b); }
      else {
        const tg = me && T.done.length && ui.sel && ui.sel.kind === 'hand' && CARDS[ui.sel.key].t === 'relic' && i === p.relics.length;
        relics.appendChild(el(tg ? 'button' : 'span', { class: 'relic empty' + (tg ? ' tgt' : ''), 'data-slot': i, type: tg ? 'button' : null, 'aria-label': tg ? 'Play it here' : null, onclick: tg ? () => finishPick(T.done) : null }));
      }
    }
    const spark = on ? p.spark : p.reserve;
    const sp = el('div', { class: 'st-spark' + (spark ? '' : ' zero'), 'aria-label': spark + ' Spark' }, [el('b', { text: String(spark) })]);
    if (me && ui.sel && ui.sel.kind === 'hand' && idle()) {
      const cost = selCost(); if (cost != null) sp.appendChild(el('span', { class: 'pay' + (cost > p.spark ? ' no' : ''), text: '−' + cost }));
    }
    node.appendChild(el('div', { class: 'st-top' }, [
      el('div', { class: 'st-name' }, [el('i'), pl.cpu ? el('span', { class: 'bot', html: Kit.icon('bot') }) : null, el('span', { class: 'nm', text: pl.name })]),
      el('div', { class: 'st-ren', 'aria-label': p.renown + ' Renown of 30' }, [el('div', { class: 'st-track', style: { '--r': Math.min(30, p.renown) } }, [el('i')]), el('div', { class: 'lau' }, [el('b', { text: String(p.renown) })])])]));
    node.appendChild(el('div', { class: 'st-bot' }, [seals, relics,
      me && !ui.hideHand ? null : el('div', { class: 'st-hand', 'aria-label': p.hand.length + ' cards in hand' }, [el('b', { text: String(p.hand.length) })]),
      el('span', { class: 'st-fill' }), sp]));
    if (me) {
      let b;
      if (G.over) b = el('button', { type: 'button', class: 'btn btn-primary btn-sm st-go', text: 'Results', onclick: () => showWin(true) });
      else if (!human(S.turn)) b = el('button', { type: 'button', class: 'btn btn-sm st-go ' + (speed > 1 ? 'btn-primary' : 'btn-soft'), 'aria-label': 'Fast forward', 'aria-pressed': String(speed > 1), html: SVG.ff, onclick: toggleFast });
      else {
        const can = idle() && !ui.discard, nothing = can && !ui.acts.length;
        b = el('button', { type: 'button', class: 'btn btn-primary btn-sm st-go' + (nothing ? ' ready' : ''), text: 'End turn', disabled: !can, onclick: () => { Kit.sfx('pop'); Kit.haptic('medium'); endTurn(); } });
      }
      node.appendChild(b);
    }
  }

  function figEl(f, T) {
    const c = CARDS[f.c], fac = FAC[c.f], mine = f.o === V.turn, pl = C.PLACES[S.places[f.p]];
    const can = idle() && mine && !ui.sel && ui.acts.some(a => a.u === f.u && (a.t === 'walk' || a.t === 'clash' || a.t === 'antik' || a.t === 'tub'));   // (while something is picked up, only where it can go is lit)
    const done = mine && !G.over && !f.rdy && !(f.arr && !f.acted);
    const sel = ui.sel && ui.sel.kind === 'fig' && ui.sel.u === f.u, tg = T.figs[f.u];
    const picked = ui.sel && ui.sel.picks.some(p => p.k === 'f' && p.v === f.u);
    const insp = ui.sel && ui.sel.kind === 'hand' && CARDS[ui.sel.key].insp && f.o === S.turn && CARDS[ui.sel.key].insp.indexOf(f.c) >= 0;
    const n = el('button', { type: 'button', class: 'fp o' + f.o + (can ? ' can' : '') + (done ? ' done' : '') + (f.stun ? ' stun' : '') + (sel || picked ? ' sel' : '') + (tg ? ' tgt' : '') + (insp ? ' insp' : '') + (ui.fresh[f.u] ? ' ' + ui.fresh[f.u] : ''),
      'data-u': f.u, 'aria-label': c.n + ', Might ' + f.m + ', ' + Kit.poss(pname(f.o)), style: { '--f': fac.c } });
    const art = el('span', { class: 'fp-art' }, [noArtLabel(f.c, true, 'na')]); const im = artImg(f.c, true); if (im) art.appendChild(im);
    n.appendChild(el('span', { class: 'fp-card' }, [art]));
    n.appendChild(el('span', { class: 'fp-m' + (f.m > c.m ? ' up' : '') }, [el('b', { text: String(f.m) })]));
    if (c.reg === pl.reg) n.appendChild(el('span', { class: 'fp-home', html: SVG.home }));
    if (f.stun) n.appendChild(el('span', { class: 'fp-stun' }));
    if (tg) { const pv = clashPreview(tg); if (pv) n.appendChild(el('span', { class: 'pv-x', html: '<span class="a">' + pv[0] + '</span><i>v</i><span>' + pv[1] + '</span>', 'aria-label': 'Your ' + pv[0] + ' against ' + pv[1] })); }
    return n;
  }
  function rowEl(i, T) {
    const v = ui.view, t = 1 - v, pk = S.places[i], pi = C.PLACES[pk], hold = V.hold[i], tg = T.places[i];
    const row = el('div', { class: 'pl' + (hold >= 0 ? ' held' + hold : '') + (tg ? ' tgt' : '') + (ui.count === i ? ' count' : ''), 'data-p': i, style: { '--pcL': 'var(--pc' + t + ')', '--pcR': 'var(--pc' + v + ')' } });
    [[t, 'L'], [v, 'R']].forEach(sd => {
      const side = el('div', { class: 'pl-side ' + sd[1] });
      const figs = V.figs.filter(f => f.p === i && f.o === sd[0]).sort((a, b) => a.u - b.u);
      figs.forEach(f => side.appendChild(figEl(f, T)));
      let free = 3 - figs.length;
      if (tg && sd[0] === S.turn && free > 0) {
        const pv = landPreview(tg);
        if (pv) { const s = el('span', { class: 'slot land' }); if (pv.cost != null) s.appendChild(el('span', { class: 'pv-c' }, [el('b', { text: String(pv.cost) })])); if (pv.m != null) s.appendChild(el('span', { class: 'pv-m' }, [el('b', { text: String(pv.m) })])); if (pv.via) { const vi = el('span', { class: 'pv-v' }); const im = artImg(pv.via, true); if (im) vi.appendChild(im); s.appendChild(vi); } side.appendChild(s); free--; }
      }
      for (let k = 0; k < free; k++) side.appendChild(el('span', { class: 'slot' }));
      row.appendChild(side);
      if (sd[1] === 'L') {
        const gate = E.isGate(S, i), own = E.ownerOfSpoke(S, i), worth = (pk === 'acropolis' ? 2 : 1) * E.stake(S.cfg, V.round);
        const tile = el('button', { type: 'button', class: 'pl-tile', 'aria-label': pi.n + (hold >= 0 ? ', held by ' + pname(hold) : '') });
        const art = el('span', { class: 'pl-art' }, [el('span', { class: 'na' })]); const im = artImg(pk, true); if (im) art.appendChild(im);
        tile.appendChild(art);
        tile.appendChild(el('span', { class: 'pl-tots' }, [
          el('span', { class: 'pl-tot L' + (V.tot[i][t] ? '' : ' zero'), style: { '--tc': 'var(--pc' + t + ')' }, text: String(V.tot[i][t]) }),
          el('span', { class: 'pl-tot R' + (V.tot[i][v] ? '' : ' zero'), style: { '--tc': 'var(--pc' + v + ')' }, text: String(V.tot[i][v]) })]));
        tile.appendChild(el('span', { class: 'pl-flag' + (hold >= 0 ? '' : ' none') + (ui.drop[i] ? ' drop' : ''), style: hold >= 0 ? { '--hc': 'var(--pc' + hold + ')' } : null }, [el('b', { text: String(worth) })]));
        tile.appendChild(el('span', { class: 'pl-plate' }, [
          el('span', { class: 'pl-name' + (pi.n.length > 15 ? ' long' : ''), html: (gate ? '<span class="pl-gate" style="--gc:var(--pc' + own + ')">' + SVG.arch + '</span>' : '') + esc(pi.n) }),
          RULE[pk] ? el('span', { class: 'pl-rule', text: RULE[pk] }) : null]));
        row.appendChild(tile);
      }
    });
    [t, v].forEach(o => { if (V.pb[i][o]) row.appendChild(el('span', { class: 'pl-decree ' + (o === t ? 'L' : 'R'), text: '+' + V.pb[i][o], 'aria-label': 'Royal Decree, ' + V.pb[i][o] + ' more Might' })); });
    return row;
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
    const st = E.stake(S.cfg, V.round);
    n.appendChild(el('button', { type: 'button', class: 'cap-round' + (ui.flip ? ' flip' : ''), 'aria-label': 'Round ' + V.round + ', Places score ' + st, onclick: roundSheet },
      [el('span', { class: 'n', text: String(V.round) }), el('span', { class: 'w', html: st > 1 ? LAUREL + LAUREL : LAUREL })]));
    if (ui.sel && idle()) {
      const s = ui.sel, key = s.kind === 'hand' ? s.key : E.byU(S, s.u).c, c = info(key), T = targets();
      n.appendChild(el('button', { type: 'button', class: 'cap-card', 'aria-label': 'Read ' + c.n, onclick: () => openView(key, s.kind === 'fig' ? { u: s.u } : null) }, [
        el('span', { class: 'tx', html: '<span class="who">' + esc(c.n) + '</span> ' + (s.kind === 'hand' ? twinNote(key) : '') + (boldKeys(c.tx) || esc(c.cap)) }), el('span', { class: 'eye', html: Kit.icon('eye') })]));
      if (s.kind === 'hand' && !s.picks.length && T.done.length) n.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-sm cap-play', text: 'Play', onclick: () => finishPick(T.done) }));
      return;
    }
    let txt = '', dim = false;
    if (G.over) txt = S.winner < 0 ? 'A draw' : pname(S.winner) === 'You' ? 'You win' : pname(S.winner) + ' wins';
    else if (ui.discard) { const k = S.P[S.turn].hand.length - S.cfg.handMax; txt = 'Hand limit ' + S.cfg.handMax + ': discard ' + k; }
    else if (V.turn < 0) { txt = G.demo && !ui.counting ? '' : 'The count'; dim = true; }
    else if (!human(V.turn)) { txt = pname(V.turn) + ' is playing'; dim = true; }
    else txt = Kit.poss(pname(V.turn)) + ' turn';
    n.appendChild(el('div', { class: 'cap-txt' + (dim ? ' dim' : ''), text: txt }));
  }
  function handEl() {
    const n = dom.hand; n.innerHTML = '';
    if (ui.hideHand || ui.viewer < 0) return;
    const o = ui.view, hand = V.P[o].hand, can = idle() && o === S.turn, T = targets();
    const picking = Object.keys(T.hand).length > 0;
    hand.forEach((key, h) => {
      const c = CARDS[key], cost = E.costOf(S, o, key);
      const ok = can && !ui.discard && (ui.acts.some(a => a.h != null && S.P[o].hand[a.h] === key) || (key === 'phalanx' && ui.acts.some(a => a.ph)));
      const sel = ui.sel && ui.sel.kind === 'hand' && (ui.sel.h === h || ui.sel.picks.some(p => p.k === 'h' && p.v === h));
      const b = el('button', { type: 'button', class: 'hc' + (ui.discard ? ' toss' : !can ? '' : picking ? (T.hand[h] || sel ? '' : ' no') : ui.sel ? (ok ? '' : ' no') : ok ? ' ok' : ' no') + (sel ? ' sel' : '') + (T.hand[h] ? ' tgt' : '') + (ui.dealt && h >= ui.dealt ? ' in' : ''),
        'data-h': h, 'aria-label': c.n + ', costs ' + cost }, [cardEl(key, { mini: true, cost: cost })]);
      n.appendChild(b);
    });
  }
  function render() {
    if (!G || !V || !dom.root) return;
    const v = ui.view, T = targets();
    pass = {};   // (pictures are put back, not made again: see artImg)
    try {
      stripEl(dom.opp, 1 - v, false); stripEl(dom.me, v, true);
      dom.map.innerHTML = '';
      dom.map.appendChild(el('div', { class: 'an-road' }));
      rowsOrder().forEach(i => dom.map.appendChild(rowEl(i, T)));
      capEl(); handEl();
    } finally { pass = null; }
    layout(); lines();
    dom.root.querySelectorAll('.st-name').forEach(n => Kit.fitText(n, .6));
  }
  // Sizes from the room there is
  function layout() {
    if (!dom.map) return;
    // The hand is sized first and the map measured after it. (The other way round, a hand that had just grown
    // squeezed the map for one measurement: every card drawn made the whole board jump flat and back.)
    // the hand: side by side, never overlapping. As it fills the cards get smaller, and below a readable size
    // they drop the name (picture, cost and Might stay; tap one and the caption says what it is)
    const h = dom.hand, n = h.children.length, land = window.innerWidth > window.innerHeight, hr = h.getBoundingClientRect(), W = hr.width - 2, g = W > 600 ? 8 : 4;
    h.classList.remove('two'); Array.prototype.forEach.call(h.children, c => c.classList.remove('r0'));
    h.style.setProperty('--ho', g + 'px');
    let hw, rows = 1, per = n;
    const cap = Math.min(132, Math.max(window.innerHeight, window.innerWidth) * .098);
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
    }
    if (rows > 1) { h.classList.add('two'); h.style.setProperty('--per', per); }
    hw = Math.floor(Math.max(30, hw));
    h.style.setProperty('--hw', hw + 'px'); h.classList.toggle('small', hw < 62);
    // the map, from the room the hand leaves it
    const r = dom.map.getBoundingClientRect(); if (!r.width || !r.height) return;
    const rg = r.height > 640 ? 9 : r.height > 420 ? 5 : 3, sg = r.width > 700 ? 7 : 3, gp = r.width >= 690 ? 10 : 5;
    const rowH = (r.height - 4 * rg) / 5, mwMin = Math.max(r.width < 340 ? 84 : 98, Math.min(r.width * .27, 300));
    const fw = Math.floor(Math.max(24, Math.min((rowH - 9) / 1.44, (r.width - 12 - 2 * gp - mwMin - 4 * sg) / 6, 118)));
    const mw = Math.floor(Math.min(r.width - 12 - 2 * gp - 6 * fw - 4 * sg, Math.max(mwMin, rowH * 2.2, 240)));
    const st = dom.map.style; st.setProperty('--fw', fw + 'px'); st.setProperty('--rg', rg + 'px'); st.setProperty('--sg', sg + 'px'); st.setProperty('--mw', mw + 'px'); st.setProperty('--gp', gp + 'px');
    dom.map.classList.toggle('tight', rowH < 74);
  }
  // Legacy lines: gold thread from each Legacy Figure to the one who inspired it
  function lines() {
    const old = dom.map.querySelector('.an-line'); if (old) old.remove();
    const ls = V.figs.filter(f => f.li && V.figs.some(g => g.u === f.li)); if (!ls.length) return;
    const mr = dom.map.getBoundingClientRect(); let h = '<defs><linearGradient id="an-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e3a1"/><stop offset=".5" stop-color="#fff1bf"/><stop offset="1" stop-color="#b8862d"/></linearGradient></defs>';
    ls.forEach(f => {
      const a = dom.map.querySelector('.fp[data-u="' + f.u + '"]'), b = dom.map.querySelector('.fp[data-u="' + f.li + '"]'); if (!a || !b) return;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const x1 = ra.left + ra.width / 2 - mr.left, y1 = ra.top + ra.height * .3 - mr.top, x2 = rb.left + rb.width / 2 - mr.left, y2 = rb.top + rb.height * .3 - mr.top;
      const mx = (x1 + x2) / 2 + (y2 - y1) * .18, my = (y1 + y2) / 2 - Math.abs(x2 - x1) * .25 - 8, len = Math.hypot(x2 - x1, y2 - y1) * 1.25 + 20;
      h += '<path' + (ui.newLine === f.u ? ' class="new" style="--len:' + len.toFixed(0) + '"' : '') + ' d="M' + x2.toFixed(1) + ' ' + y2.toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '"/><circle cx="' + x1.toFixed(1) + '" cy="' + y1.toFixed(1) + '" r="2.6"/><circle cx="' + x2.toFixed(1) + '" cy="' + y2.toFixed(1) + '" r="2.6"/>';
    });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'an-line'); svg.innerHTML = h; dom.map.appendChild(svg);
  }
  let rsT = 0;
  window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { if (G && dom.root && dom.root.isConnected) { layout(); lines(); } }, 80); });

  // ═══ Picking things up: what can this card or Figure do? ══════════════════════════════════════════════════
  function legal() { ui.acts = idle() ? E.actions(S) : []; }
  function seqOf(a) {
    const q = [], s = ui.sel;
    if (s.kind === 'fig') { q.push(a.t === 'clash' ? ['f', a.v] : ['p', a.p]); return q; }
    if (a.t === 'fig') q.push(['p', a.p]);
    else if (a.t === 'clash') { q.push(['f', a.u]); q.push(['f', a.v]); }
    else if (a.t === 'deed') { if (a.h2 != null) q.push(['h', a.h2]); if (a.u != null) q.push(['f', a.u]); if (a.v != null) q.push(['f', a.v]); if (a.p != null) q.push(['p', a.p]); }
    return q;
  }
  const NOT = { places: {}, figs: {}, hand: {}, done: [] };
  function targets() {
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
  function simulate(a) { const T = E.clone(S); T.turn = S.turn; E.apply(T, a, 0, 0); return T; }
  // what a Figure landing at a Place would cost and how strong it would stand there
  function landPreview(acts) {
    const a = acts[0], t = a.t, o = S.turn;
    const moves = t === 'fig' || t === 'walk' || t === 'antik' || t === 'tub' || (t === 'deed' && (ui.sel.key === 'fairwinds' || ui.sel.key === 'trojan'));
    if (!moves) return null;
    const T = simulate(a), f = t === 'fig' || ui.sel.key === 'trojan' ? E.byU(T, S.uid) : E.byU(T, a.u);
    const via = acts.every(x => x.t === 'antik') ? 'antikythera' : acts.every(x => x.t === 'tub') ? S.P[o].guide : null;
    return { cost: t === 'fig' ? E.costOf(S, o, ui.sel.key, a.p) : null, m: f ? E.might(T, f, 0) : null, via: via };
  }
  function clashPreview(acts) {
    const a = acts.filter(x => !x.ph)[0] || acts[0], s = ui.sel;
    const fight = a.t === 'clash' || (a.t === 'deed' && s.key === 'ambush'); if (!fight) return null;
    const last = s.picks.length ? s.picks[s.picks.length - 1] : null;
    if (s.kind === 'hand' && !(last && last.k === 'f')) return null;   // (first pick which of yours fights)
    const f = E.byU(S, a.u), g = E.byU(S, a.v); if (!f || !g) return null;
    return [Math.floor(E.might(S, f, 1, g) + (a.t === 'deed' ? 1 : 0) + (a.ph ? 2 : 0)), Math.floor(E.might(S, g, 2, f))];
  }
  function select(sel) {
    const o = S.turn, hand = S.P[o].hand;
    if (sel.kind === 'hand') { sel.key = hand[sel.h]; sel.acts = ui.acts.filter(a => (a.h != null && hand[a.h] === sel.key) || (sel.key === 'phalanx' && a.t === 'clash' && a.ph)); }
    else sel.acts = ui.acts.filter(a => a.u === sel.u && (a.t === 'walk' || a.t === 'clash' || a.t === 'antik' || a.t === 'tub'));
    sel.picks = []; ui.sel = sel; Kit.sfx('slide'); Kit.haptic('light'); render();
  }
  function clearSel() { if (ui.sel) { ui.sel = null; render(); } }
  function pick(k, v) {
    ui.sel.picks.push({ k: k, v: v }); Kit.sfx('tap'); Kit.haptic('light');
    const T = targets();
    if (T.done.length && !Object.keys(T.places).length && !Object.keys(T.figs).length && !Object.keys(T.hand).length) finishPick(T.done); else render();
  }
  function actLabel(a) {
    if (a.t === 'walk') return { label: 'Walk', sub: 'Its move for this turn' };
    if (a.t === 'tub') return { label: 'Free step', sub: TX.GUIDES[S.P[S.turn].guide].n + ', once a turn' };
    if (a.t === 'antik') return { label: 'Jump', sub: 'Antikythera Mechanism. Done for the turn' };
    if (a.t === 'clash') return a.ph ? { label: 'Clash with Phalanx', sub: '+2 Might for ' + E.costOf(S, S.turn, 'phalanx') + ' Spark' } : { label: 'Clash' };
    return { label: 'Play' };
  }
  function finishPick(acts) {
    if (acts.length === 1) return doHuman(acts[0]);
    const s = ui.sel, who = info(s.kind === 'hand' ? s.key : E.byU(S, s.u).c).n, rank = { walk: 0, tub: 1, antik: 2, clash: 0 };
    acts = acts.slice().sort((x, y) => (rank[x.t] || 0) - (rank[y.t] || 0) || (x.ph ? 1 : 0) - (y.ph ? 1 : 0));
    const to = acts[0].p != null && acts[0].t !== 'clash' ? ' to ' + (/^(The|the) /.test(C.PLACES[S.places[acts[0].p]].n) ? '' : /^(Great Wall|Colosseum|Acropolis|Silk Road|Globe Theatre|Library)/.test(C.PLACES[S.places[acts[0].p]].n) ? 'the ' : '') + C.PLACES[S.places[acts[0].p]].n : '';
    Kit.sheet({ title: who + to, actions: acts.map(a => Object.assign(actLabel(a), { primary: a === acts[0], onClick: () => doHuman(a) })), onCancel: () => { if (ui.sel) { ui.sel.picks.pop(); render(); } } });
  }
  function onMapTap(e) {
    if (!G) return;
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
    if (fpN) { const f = V.figs.filter(x => x.u === u)[0]; if (f) openView(f.c, { u: u }); return; }
    if (tile && row) return openView(S.places[p], { p: p });
    clearSel();
  }
  function onHandTap(e) {
    const b = e.target.closest('.hc'); if (!b || !G) { clearSel(); return; }
    const h = +b.dataset.h, key = V.P[ui.view].hand[h];
    if (ui.discard && idle()) return discardOne(h);
    if (!idle()) return openView(key);
    const T = targets();
    if (T.hand[h]) return pick('h', h);
    if (ui.sel && ui.sel.kind === 'hand' && ui.sel.h === h) return clearSel();
    select({ kind: 'hand', h: h });
  }
  function roundSheet() {
    Kit.sfx('tap');
    const st = E.stake(S.cfg, S.round);
    Kit.sheet({ title: 'Round ' + S.round, html: '<p>Each Place you hold when the round ends scores <b>' + st + ' Renown</b>' + (st > 1 ? '.' : ' (2 from round 4 on).') + ' The number on a Place\'s banner is what it scores.</p>' +
      '<p>The first player to reach <b>30 Renown</b> at the end of a round wins. Whoever has more Renown goes first, so the player behind has the last word.</p>', actions: [{ label: 'Got it', cls: 'btn-soft' }] });
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
  function renderFlip(ms) {
    const before = {}; dom.map.querySelectorAll('.fp').forEach(n => { before[n.dataset.u] = n.getBoundingClientRect(); });
    render();
    const ps = [];
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
    const ab = key.split('>'), th = k => { const sp = el('span', { class: 'sy-th', style: { '--f': (FAC[info(k).f] || FAC.N).c } }); const im = artImg(k, true, true); if (im) sp.appendChild(im); return sp; };
    document.querySelectorAll('.an-story').forEach(x => x.remove());
    const n = el('div', { class: 'an-story', role: 'status' }, [el('div', { class: 'sy-pair', 'aria-hidden': 'true' }, [th(ab[0].replace(/^@/, '')), el('i'), th(ab[1])]),
      el('div', { class: 'sy-tx' }, [el('div', { class: 'sy-k' }, [el('span', { text: kind || 'A Thread' }), ren ? el('b', { text: '+' + ren + ' Renown' }) : null]), el('p', { text: t })])]);
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
      const extra = base - f.m - ph, notes = [];
      if (att && ctx.a && ctx.a.t === 'deed') notes.push('Ambush');
      const note = extra > 0 ? (notes.length ? notes.join(', ') : att ? 'Attacking' : 'Defending') + ' +' + extra : '';
      const bs = el('span', { class: 'sh' }, [el('b', { text: String(base - ph) })]);
      if (ph) tot.firstChild.textContent = String(total - ph);
      const n = el('div', { class: 'cl-side o' + f.o + ' ' + (f.o === ui.view ? 'R' : 'L') }, [
        el('div', { class: 'cl-card' }, [cardEl(f.c, { mini: true, might: f.m, now: true })]), el('div', { class: 'cl-nm', text: CARDS[f.c].n }),
        el('div', { class: 'cl-sum' }, [bs, dn, won, tot]), el('div', { class: 'cl-note', text: note })]);
      return { n: n, die: dn, tot: tot, won: won, card: n.querySelector('.cl-card'), note: n.querySelector('.cl-note'), base: bs, ph: ph, b: base, t: total, shown: false };
    }
    // the Phalanx card slides in under its Figure, lands, and its +2 goes onto the shields
    async function aid(X) {
      const c = el('div', { class: 'cl-aid' }, [cardEl('phalanx', { mini: true, now: true }), el('b', { class: 'cl-aid-n', text: '+' + X.ph })]);
      X.n.classList.add('aided'); X.n.parentNode.classList.add('aided'); X.card.appendChild(c); Kit.sfx('deal'); await wait(430);
      Kit.sfx('clash', .6); Kit.haptic('medium'); c.classList.add('in');
      X.base.firstChild.textContent = String(X.b); X.base.classList.remove('bump'); void X.base.offsetWidth; X.base.classList.add('bump');
      if (X.shown) { X.tot.firstChild.textContent = String(X.t); X.tot.classList.remove('bump'); void X.tot.offsetWidth; X.tot.classList.add('bump'); Kit.sfx('good'); }
      else X.tot.firstChild.textContent = String(X.t);
      await wait(620);
    }
    const A = side(a, am0, ev.da, am, true, ev.ra), D = side(d, dm0, ev.dd, dm, false, ev.rd), L = a.o === ui.view ? D : A, R = a.o === ui.view ? A : D;
    const ov = el('div', { class: 'clash' }, [el('div', { class: 'cl-in' }, [L.n, el('div', { class: 'cl-vs', html: SVG.swords }), R.n, el('div', { class: 'cl-where', text: C.PLACES[S.places[ev.p]].n })])]);
    document.body.appendChild(ov); void ov.offsetWidth; ov.classList.add('show');
    await wait(420);
    A.card.classList.add('lunge'); D.card.classList.add('lunge'); Kit.sfx('whoosh');
    await wait(230); Kit.sfx('clash'); Kit.haptic('heavy');
    await wait(380);
    if (A.ph) await aid(A);   // (the attacker chose Phalanx before the dice)
    [A, D].forEach((x, i) => { x.die.style.visibility = ''; x.die.style.setProperty('--dx', (i ? 40 : -40) + 'px'); x.die.classList.add('rolling'); }); Kit.sfx('roll');
    await wait(760);
    if (plain) { [A, D].forEach(x => { x.won.style.visibility = ''; if (!x.won.classList.contains('none')) { x.won.classList.add('bump'); x.die.classList.add('high'); } }); if (ev.da || ev.dd) Kit.sfx('pop'); await wait(380); }
    [A, D].forEach(x => { x.tot.style.visibility = ''; x.tot.classList.add('bump'); x.shown = true; }); Kit.sfx('tick');
    await wait(420);
    if (D.ph) { await wait(380); await aid(D); }   // (the defender's plays itself once the dice have fallen against them)
    if (ui.clashHold) { const h = ui.clashHold; ui.clashHold = null; await h(); }   // (a lesson holds the clash here, totals showing, while its caption is read)
    if (res) {
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
      V.turn = ev.o; V.round = ev.round; V.P[ev.o].spark = ev.spark; V.P[ev.o].reserve = 0; V.P[ev.o].uA = V.P[ev.o].uT = V.P[ev.o].uC = V.P[ev.o].uD = 0;
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
      const n = dom.map.querySelector('.fp[data-u="' + ev.u + '"]');
      if (n && from) { n.style.visibility = 'hidden'; Kit.sfx('whoosh'); await flyCard(ev.c, from, rc(n), { ms: 480, arc: 30 }); n.style.visibility = ''; }
      if (n) { n.classList.add('arrive'); }
      Kit.sfx('deal'); Kit.sfx('tap'); Kit.haptic('medium'); await wait(380);
    },
    async spark(ev) { V.P[ev.o].spark += ev.n; const src = rc(q('.an-strip.p' + ev.o + ' .st-guide')); render(); Kit.sfx('chip'); bump('.an-strip.p' + ev.o + ' .st-spark'); await plus(ev.n, src, ev.o, 'spark'); },
    async stun(ev) { const f = vfig(ev.u); if (!f) return; f.stun = 1; ui.fresh[ev.u] = 'zap'; render(); ui.fresh = {}; Kit.sfx('bad'); Kit.haptic('light'); await wait(480); },
    async move(ev) {
      const f = vfig(ev.u); if (!f) return;
      const n0 = dom.map.querySelector('.fp[data-u="' + ev.u + '"]'), r0 = rc(n0);
      f.p = ev.to; f.rdy = 0;
      if (ev.jump && r0) {
        // a jump: a streak of gold across the map
        if (n0) await anim(n0, [{ transform: 'none', opacity: 1 }, { transform: 'scale(.2)', opacity: 0 }], { duration: 160, fill: 'forwards' });
        render();
        const n1 = dom.map.querySelector('.fp[data-u="' + ev.u + '"]'), r1 = rc(n1); if (n1) n1.style.visibility = 'hidden';
        const x0 = r0.left + r0.width / 2, y0 = r0.top + r0.height / 2, x1 = r1.left + r1.width / 2, y1 = r1.top + r1.height / 2, len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
        const st = el('div', { class: 'streak', style: { width: len + 'px' } }); dom.fx.appendChild(st);
        const tf = 'translate(' + x0 + 'px,' + y0 + 'px) rotate(' + ang + 'rad) ';
        Kit.sfx('whoosh'); Kit.sfx('sparkle', .6);
        await anim(st, [{ transform: tf + 'scaleX(0)', opacity: 1 }, { transform: tf + 'scaleX(1)', opacity: 1, offset: .6 }, { transform: tf + 'translateX(' + len + 'px) scaleX(0)', opacity: 0 }], { duration: 430, easing: 'ease-in', fill: 'forwards' });
        st.remove(); if (n1) { n1.style.visibility = ''; n1.classList.add('arrive'); } Kit.sfx('tap'); Kit.haptic('medium'); await wait(300);
      } else {
        Kit.sfx(ev.push ? 'whoosh' : 'slide'); await renderFlip(ev.push ? 380 : 440); Kit.sfx('tap'); Kit.haptic('light'); await wait(90);
      }
    },
    async line(ev) {
      const f = vfig(ev.a); if (!f) return; f.li = ev.b; ui.newLine = ev.a; render(); ui.newLine = 0;
      Kit.sfx('sparkle'); Kit.haptic('success'); story(((vfig(ev.b) || {}).c) + '>' + f.c, ev.ren, 'A Legacy line'); await wait(900);
      if (ev.ren) { V.P[ev.o].renown += ev.ren; const src = rc(dom.map.querySelector('.fp[data-u="' + ev.a + '"]')); await plus(ev.ren, src, ev.o); render(); bump('.an-strip.p' + ev.o + ' .lau b'); Kit.sfx('good'); }
    },
    // (how one led to the other, in a sentence, the first time each link is drawn in a game)
    async thread(ev) {
      const src = ev.src.k === 'fig' ? dom.map.querySelector('.fp[data-u="' + ev.src.u + '"]') : ev.src.k === 'relic' ? q('.an-strip.p' + ev.o + ' .relic[data-relic="' + ev.src.c + '"]') : dom.map.querySelector('.pl[data-p="' + ev.src.p + '"] .pl-tile');
      const to = ev.u ? dom.map.querySelector('.fp[data-u="' + ev.u + '"]') : CARDS[ev.c].t === 'relic' ? q('.an-strip.p' + ev.o + ' .relic[data-relic="' + ev.c + '"]') : q('.an-strip.p' + ev.o + ' .st-guide');
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
      await showCard(ev.c, o === ui.view ? 620 : 1050);
      dropHand(o, a.h);   // (the Figure in the Trojan Horse leaves the hand as it arrives)
      V.P[o].spark = Math.max(0, V.P[o].spark - (ctx.cost || 0));
      if (ev.c === 'caravan') { V.P[o].spark += 3; render(); Kit.sfx('chip'); bump('.an-strip.p' + o + ' .st-spark'); await plus(3, rc(q('.an-strip.p' + o + ' .st-guide')), o, 'spark'); return; }
      if (ev.c === 'decree') { V.pb[ev.p][o] += 4; V.tot[ev.p][o] += 4; V.hold[ev.p] = E.holder(S, ev.p); render(); Kit.sfx('pop'); Kit.haptic('medium'); await wait(420); return; }
      if (ev.c === 'eclipse') { V.figs.forEach(f => { if (f.p === ev.p && f.o !== o) { f.stun = 1; ui.fresh[f.u] = 'zap'; } }); render(); ui.fresh = {}; Kit.sfx('bad'); Kit.haptic('medium'); await wait(520); return; }
      if (ev.c === 'encore') { const f = vfig(ev.u); if (f) { f.rdy = 1; f.arr = 0; ui.fresh[f.u] = 'hop'; } render(); ui.fresh = {}; Kit.sfx('good'); await wait(480); return; }
      render();
    },
    async quick(ev, ctx) {
      const o = ev.o; dropHand(o, V.P[o].hand.indexOf('phalanx')); ctx.quick = !ev.att;
      if (ev.att) V.P[o].spark = Math.max(0, V.P[o].spark - (ctx.cost || 0)); else V.P[o].reserve = Math.max(0, V.P[o].reserve - 1);
      render();   // (the card itself is shown in the clash, coming to its Figure's side)
    },
    async clash(ev, ctx) { await clashShow(ev, ctx); const a = vfig(ev.a); if (a) { a.rdy = 0; a.acted = 1; } },
    async ko(ev) {
      const n = dom.map.querySelector('.fp[data-u="' + ev.u + '"]');
      if (n) await anim(n, [{ transform: 'none', opacity: 1 }, { transform: 'rotate(' + (ev.o === ui.view ? 24 : -24) + 'deg) translateY(30%) scale(.7)', opacity: 0 }], { duration: 360, easing: 'ease-in', fill: 'forwards' });
      V.figs = V.figs.filter(f => f.u !== ev.u); V.figs.forEach(f => { if (f.li === ev.u) f.li = 0; });
      render();
    },
    async renown(ev) {
      V.P[ev.o].renown += ev.n;
      const src = ev.u ? rc(dom.map.querySelector('.fp[data-u="' + ev.u + '"]')) : rc(dom.map);
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
  function tally(evs) {
    evs.forEach(ev => {
      if (ev.t === 'ko' && ev.by) G.stats[1 - ev.o].ko++;
      else if (ev.t === 'line' || ev.t === 'thread') G.stats[ev.o].lines++;
      if ((ev.t === 'arrive' || ev.t === 'relic' || ev.t === 'deed' || ev.t === 'quick') && ev.c) G.seen[ev.c] = 1;
      else if (ev.t === 'seal') G.stats[ev.by].seals++;
      else if (ev.t === 'hold') G.stats[ev.o].held++;
    });
  }

  // ═══ Taking turns ════════════════════════════════════════════════════════════════════════════════════════
  function setBusy(b) { ui.busy = b; }
  async function doAction(a, ctx) {
    const o = S.turn, P = S.P[o];
    ctx = Object.assign({ a: a, o: o }, ctx);
    ctx.key = a.h != null ? P.hand[a.h] : a.ph ? 'phalanx' : null; ctx.h2key = a.h2 != null ? P.hand[a.h2] : null;
    if (a.t === 'clash' && a.ph) ctx.key = 'phalanx';
    ctx.cost = ctx.key ? E.costOf(S, o, ctx.key, a.t === 'fig' ? a.p : undefined) : 0;
    const roll = ctx.roll || E.rollClash(S.cfg); E.apply(S, a, roll.da, roll.dd, roll);
    const evs = S.ev.splice(0); G.n++; tally(evs); save();
    ctx.random = evs.some(e => e.t === 'draw' || e.t === 'clash');
    const ok = await playEvents(evs, ctx);
    return ok ? ctx : null;
  }
  async function doHuman(a) {
    if (!idle()) return;
    const my = gen, snapS = JSON.stringify(Object.assign({}, S, { cfg: null, st: null, ev: null }));
    ui.sel = null; setBusy(true); render();
    const ctx = await doAction(a); if (gen !== my || !ctx) return;
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
    speed = ui.turbo || (pl.cpu && lsGet(FAST) === '1' ? 4 : 1); document.documentElement.classList.toggle('an-fast', speed > 1);
    if (G.mode === 'local' && ui.viewer !== o) {
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
        await banner(up ? 'Round ' + S.round : '', up ? 'The stakes double' : 'Round ' + S.round, up ? LAUREL + LAUREL + '<span>Every Place now scores 2 Renown</span>' : (S.round === 1 ? '<span>First to 30 Renown</span>' : ''));
        if (gen !== my) return;
      }
      E.startTurn(S); G.ph = 'play'; const evs = S.ev.splice(0); save();
      if (!(await playEvents(evs, { o: o }))) return;
    }
    V = snap();
    if (pl.cpu) { render(); robotTurn(); return; }
    setBusy(false); legal(); render();
    if (o === ui.view) { Kit.sfx('turn', .5); }
  }
  async function robotTurn() {
    const my = gen, prof = E.PROF[LEVEL[G.level] || 'holder'];
    setBusy(true); await wait(500); if (gen !== my) return;
    for (let n = 0; n < 40; n++) {
      const a = E.aiPick(S, prof, Math.random); if (!a) break;
      const ctx = await doAction(a); if (gen !== my || !ctx) return;
      settle(); await wait(380); if (gen !== my) return;
    }
    await wait(250); if (gen !== my) return;
    endTurn();
  }
  async function discardOne(h) {
    const my = gen, o = S.turn; setBusy(true);
    E.discard(S, o, h); const evs = S.ev.splice(0); save();
    if (!(await playEvents(evs, { h: h, o: o }))) return;
    setBusy(false); V = snap();
    if (S.P[o].hand.length <= S.cfg.handMax) { ui.discard = false; if (gen === my) endTurn(); } else render();
  }
  async function endTurn() {
    const my = gen, o = S.turn;
    if (human(o) && S.P[o].hand.length > S.cfg.handMax) { ui.sel = null; ui.discard = true; setBusy(false); legal(); render(); Kit.sfx('bad'); return; }
    ui.sel = null; ui.discard = false; undoStack = []; setBusy(true); render();
    E.endTurn(S); const evs = S.ev.splice(0), mid = snap();
    let evR = null; const r0 = S.P.map(p => p.renown);
    if (G.k === 0) { G.k = 1; S.turn = G.ord[1]; G.ph = 'start'; }
    else {
      E.endRound(S); evR = S.ev.splice(0); tally(evR); G.hist.push(S.P.map((p, i) => p.renown - r0[i]));
      if (S.over) G.over = true; else { const f = E.firstOf(S); G.ord = [f, 1 - f]; G.k = 0; S.turn = f; G.ph = 'start'; }
    }
    if (G.over) { clearSave(); record(); } else save();
    if (!(await playEvents(evs, { o: o }))) return;
    V = mid; render();
    if (evR) { if (!(await roundEnd(evR))) return; }
    if (G.over) { V = snap(); ui.count = -1; setBusy(false); render(); await wait(500); if (gen === my) showWin(false); return; }
    beginTurn();
  }
  // The count: Place by Place down the map, the banner drops in the holder's colour and their Renown ticks up
  async function roundEnd(evs) {
    const my = gen, order = rowsOrder(), groups = [], tail = []; let cur = null;
    evs.forEach(ev => { if (ev.t === 'hold') { cur = { p: ev.p, evs: [ev] }; groups.push(cur); } else if (ev.t === 'renown') { cur = null; tail.push(ev); } else if (cur) cur.evs.push(ev); else tail.push(ev); });
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
    else if (G.ph === 'start' || !human(S.turn)) setTimeout(() => { if (G && !G.over) beginTurn(); }, 400);
  }
  const guard = fn => function () { const my = gen; return fn.apply(null, arguments).catch(e => { if (gen === my) recover(e); }); };
  beginTurn = guard(beginTurn); robotTurn = guard(robotTurn); endTurn = guard(endTurn); doHuman = guard(doHuman); discardOne = guard(discardOne);

  // ═══ The end ═════════════════════════════════════════════════════════════════════════════════════════════
  function modeName() { return G.mode === 'cpu' ? 'vs Computer (' + LEVEL_NAME[G.level] + ')' : 'Pass & play'; }
  function record() {
    const w = S.winner, hl = [];
    if (w >= 0) hl.push(S.how === 'seals' ? pname(w) + ' broke all three of ' + Kit.poss(pname(1 - w)) + ' Seals in round ' + S.round : pname(w) + ' reached ' + S.P[w].renown + ' Renown after ' + S.round + ' rounds');
    else hl.push('A dead-level draw after ' + S.round + ' rounds');
    G.players.forEach((p, i) => { hl.push(p.name + ' played ' + p.deck + ', guided by ' + TX.GUIDES[S.P[i].guide].n); });
    G.players.forEach((p, i) => { const s = G.stats[i]; if (s.ko >= 3) hl.push(p.name + ' won ' + s.ko + ' clashes'); if (s.lines >= 2) hl.push(p.name + ' drew ' + s.lines + ' Legacy lines'); if (s.seals && S.how !== 'seals') hl.push(p.name + ' broke ' + s.seals + (s.seals === 1 ? ' Seal' : ' Seals')); });
    try {
      Kit.record(KEY, { started: G.started, mode: modeName(), players: G.players.map((p, i) => ({ name: p.name, score: S.P[i].renown, cpu: p.cpu })), winner: w >= 0 ? pname(w) : null,
        rounds: { labels: G.hist.map((x, i) => String(i + 1)), scores: G.hist }, highlights: hl,
        detail: { how: S.how, rounds: S.round, decks: G.players.map(p => p.deck).join(', '), seals: S.P.map(p => p.seals).join(' and ') } });
    } catch (e) {}
    // the collection: cards that crossed the table are seen; a win against the computer can earn a pack or a Guide
    try { G.rew = Coll.gameOver({ win: G.mode === 'cpu' && w === 0, cpu: G.mode === 'cpu', level: G.level, built: !!G.players[0].built, seen: Object.keys(G.seen || {}) }); } catch (e) { G.rew = []; }
  }
  const earnedLabel = x => x.t === 'guide' ? 'Meet your new Guide' : 'Open your pack';
  function showWin(quiet) {
    const w = S.winner, lose = w >= 0 && G.players[w].cpu, order = [0, 1].sort((a, b) => (b === w) - (a === w) || S.P[b].renown - S.P[a].renown);
    const notes = [], earned = (G.rew || []).filter(x => window.AnoriaPacks);
    earned.forEach(x => notes.push(x.t === 'guide' ? TX.GUIDES[x.g].n + ' joins you as a Guide' : 'A pack of ' + x.pack.n + ': ' + x.pack.why.charAt(0).toLowerCase() + x.pack.why.slice(1)));
    notes.push(S.how === 'seals' ? 'All three of ' + Kit.poss(pname(1 - w)) + ' Seals are broken' : w < 0 ? 'Level on Renown, Seals and Might' : 'First to 30 Renown at the end of a round');
    G.players.forEach((p, i) => notes.push((p.name === 'You' ? 'You have ' : p.name + ' has ') + S.P[i].seals + (S.P[i].seals === 1 ? ' Seal' : ' Seals') + ' left'));
    Kit.win({ quiet: quiet, icon: w < 0 ? 'users' : lose ? 'bot' : 'trophy', lose: !!lose,
      title: w < 0 ? 'A draw' : lose ? pname(w) + ' wins this one' : pname(w) === 'You' ? 'You win!' : pname(w) + ' wins!',
      sub: 'Round ' + S.round + ', ' + (S.how === 'seals' ? 'by breaking the Seals' : 'on Renown'), notes: notes, notesTitle: 'How it ended',
      rank: order.map(i => ({ name: pname(i), score: S.P[i].renown, color: G.players[i].color, cpu: G.players[i].cpu })),
      again: () => newGame({ mode: G.mode, level: G.level, players: G.players }), look: 'Look at the table', setup: showSetup, setupLabel: 'Change decks or players',
      extra: earned.length ? [{ label: earned.length === 1 ? earnedLabel(earned[0]) : 'See what you earned', onClick: () => { window.AnoriaPacks.earned(earned, showSetup); } }] : null });
  }

  // ═══ The page ════════════════════════════════════════════════════════════════════════════════════════════
  const RULES =
    '<p>Anoria is a world where all of history happens at once. The great figures of every age live there together, among the wonders of the world. You lead a company of them with one of the greats as your Guide, and so does the other player. A company wins Renown by holding the wonders.</p>' +
    '<p class="goal">Send great Figures from history to hold Places on the map. <b>The first player to reach 30 Renown</b> at the end of a round wins. Breaking all <b>3 of the other player\'s Seals</b> wins on the spot.</p>' +
    '<h3>The map</h3><ul><li>Five Places lie in a line: your <b>Gate</b> nearest you, then your <b>Outpost</b>, the shared <b>Crossroads</b>, and the other player\'s Outpost and Gate.</li>' +
    '<li>Each Place has one rule of its own, printed on it. Tap a Place to read it.</li></ul>' +
    '<h3>Your turn</h3><ul><li>Your Figures are ready to act again, you <b>draw 2 cards</b> and you gain <b>Spark</b>: 2 in round 1 and one more each round, up to 7. If you\'re behind on Renown you get 1 extra.</li>' +
    '<li>Then, in any order, play cards and act. When you tap a card or one of your Figures, everywhere it can go lights up.</li>' +
    '<li>A <b>Figure</b> arrives at your Gate, or at any Place where you already have one. Up to 3 of your Figures can stand at one Place.</li>' +
    '<li>Each Figure does one thing a turn: <b>walk</b> one step to the next Place, or <b>clash</b> with an enemy Figure where it stands. A Figure that just arrived can clash but not walk.</li>' +
    '<li><b>Relics</b> stay in play, and you can have 2 at a time. <b>Deeds</b> happen once and are gone.</li>' +
    '<li>You keep up to 2 Spark you don\'t spend through the other player\'s turn. That Spark pays for <b>Phalanx</b>, which plays itself when it saves your Figure.</li>' +
    '<li>You can hold 8 cards when your turn ends.</li></ul>' +
    '<h3>Two of a card</h3><ul><li>A deck is 30 cards, with one or two copies of each card, so a single card from a pack can go straight in. Only <b>one of each person</b> can stand on your side at a time.</li>' +
    '<li><b>The return</b>: a Figure whose other copy is in your discard pile costs 1 less.</li></ul>' +
    '<h3>Might, home and away</h3><ul><li>The number on the shield is a Figure\'s <b>Might</b>.</li>' +
    '<li>A Figure has <b>+1 Might at a Place in its home region</b> (the small house on it). Voyagers are at home everywhere and can walk to any Place.</li></ul>' +
    '<h3>A clash</h3><ul><li>Both sides roll a die. The <b>higher roll adds 1</b> to its Figure\'s Might, or <b>2 if it is higher by 3 or more</b>. Then the Figure with the lower Might is knocked out. If they are tied, nothing happens.</li>' +
    '<li><b>Bounty</b>: knocking out a Figure of a player who is ahead of you on Renown scores 1 Renown.</li></ul>' +
    '<h3>Threads</h3><ul><li>Some cards grew out of something else: a Place, a Relic or a person. If you play one while what it grew from is on your side (a Figure arriving at that Place, the Relic in play, the person standing), it scores <b>1 Renown</b> as you play it. That Renown is scored once, not every turn, and only one Thread or Legacy line scores in a round. Read a card to see its Thread.</li></ul>' +
    '<h3>Your collection</h3><ul><li>Your first win of the day against the computer earns a pack of 3 cards. So do your first win against Normal, against Hard, and with a deck you built.</li>' +
    '<li>A deck has one <b>Guide</b>, and you never play two at once. You start with the Guide you chose. The other four join you as you beat the computer, one each at 3, 8, 15 and 25 wins. Each has a different power, so a new Guide is a new way to play: any deck you build can have them as its Guide, and the deck they bring opens once you own its cards.</li>' +
    '<li>A pack never holds a card you already have two of.</li></ul>' +
    '<h3>Legacy lines</h3><ul><li>A Legacy Figure names who inspired it. If one of them is in play on your side, it costs 1 less, a gold line joins the two, it has +1 Might while the other stands, and you score 1 Renown as it arrives. That Renown is scored once, not every turn, and only one line or Thread scores in a round.</li></ul>' +
    '<h3>The end of a round</h3><ul><li>When both players have had a turn, each Place goes to the side with <b>more Might</b> there. If the Might is tied, nobody holds the Place. An empty or tied Gate stays with its owner.</li>' +
    '<li>Each Place you hold scores <b>1 Renown</b> in rounds 1 to 3 and <b>2 from round 4 on</b>. The banner on a Place shows what it scores and who holds it right now.</li>' +
    '<li>If you hold the other player\'s Gate, one of their <b>Seals breaks</b>. Breaking a Seal scores you 1 Renown, on top of what the Place itself scores.</li>' +
    '<li>Whoever has more Renown goes first next round, so the player behind has the last word. If you are level, you take turns going first.</li>' +
    '<li>If both players pass 30 in the same round, whoever has more Renown wins. The game also ends after 14 rounds, and again whoever has more Renown wins.</li></ul>' +
    '<h3>Tips</h3><ul><li>Tap any card, Figure, Guide or Place to read it full size.</li><li>Your Guide\'s power is always on. Build your turn around it.</li>' +
    '<li>You can take a move back from the menu, as long as it drew no card and rolled no dice.</li></ul>';
  Kit.init({
    id: KEY, color: '#d9b45a', mark: false, rules: RULES, guide: () => { if (window.AnoriaGuide) window.AnoriaGuide.open(); else Kit.rules(); },
    theme: { felt: ['#22305a', '#141d3a', '#0b1124'], wood: ['#4a3826', '#261b11'], back: ['#10131c', '#b8862d'] },
    onNew: () => { if (G && G.demo) demo.end(); else showSetup(); }, undo: undo,
    menu: [
      { icon: 'book', label: 'Library', sub: 'Every card, and the ones you own', onClick: () => { if (window.AnoriaLibrary) window.AnoriaLibrary.open(); } },
      { icon: 'history', label: 'Past games', onClick: () => Kit.history(KEY, { title: 'Anoria: past games' }) },
      { icon: 'eye', label: 'Hide Anoria', sub: 'Anoria goes back behind Lorcana’s icon', onClick: () => { lsSet('anoria_unlocked', null); Kit.home(); } }
    ]
  });


  // ═══ Lessons on the table ════════════════════════════════════════════════════════════════════════════════
  // guide.js plays its lessons and the quick start on this same table: a made-up position (never saved, never
  // recorded), with the script choosing every step and every roll. Your own game waits in its save and comes back.
  function resume() {
    let d = null; try { d = JSON.parse(lsGet(SAVE)); } catch (e) {}
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
  window.AnoriaUI = { app: app, el: el, esc: esc, C: C, E: E, TX: TX, CARDS: CARDS, Coll: Coll, FAC: FAC, REG: REG, PLAN: PLAN, DECKS: DECKS, PCOL: PCOL, MARK: MARK, LAUREL: LAUREL, SVG: SVG,
    cardEl: cardEl, artImg: artImg, info: info, boldKeys: boldKeys, openView: openView, closeView: closeView, deckSheet: deckSheet, deckFacs: deckFacs, listOf: listOf,
    showSetup: showSetup, inGame: () => !!(G && S && !G.over && !G.demo), screen: screen, demo: demo, resume: resume, readyDeck: readyDeck, hubRefresh: () => { const h = document.querySelector('.an-hub'); if (h) h.parentNode.replaceChild(hubRow(), h); } };
  window.__anoria = { E: E, ui: ui, G: () => G, S: () => S, V: () => V, card: cardEl, view: openView, newGame: newGame, act: doHuman, legal: () => ui.acts, idle: idle, endTurn: endTurn, setSpeed: s => { speed = s; }, turbo: s => { ui.turbo = s; speed = s || 1; }, showWin: showWin, refresh: () => { legal(); V = snap(); render(); }, events: (evs, ctx) => playEvents(evs, ctx || {}), undo: undo };

  // The art proof (anoria.html?art=1): every card as it is drawn at each size, side by side, so a new or changed
  // picture can be checked in one look: the full card, the small card, the smallest hand card and the piece on the
  // map. Nothing a picture is about should be cut off or sit under a number.
  function artProof() {
    stop(); G = null; S = null; V = null;
    const keys = Object.keys(CARDS).concat(Object.keys(TX.GUIDES), Object.keys(C.PLACES));
    const cell = (label, node) => el('div', { class: 'ap-c' }, [node, el('small', { text: label })]);
    const sized = (cls, n) => el('div', { class: 'ap-s ' + cls }, [n]);
    const rows = keys.map(k => {
      const c = info(k), fig = c.kind === 'fig', row = el('div', { class: 'ap-row' }, [el('h2', { text: c.n })]);
      const line = el('div', { class: 'ap-line' }, [cell('Full', sized('full', cardEl(k)))]);
      if (c.kind !== 'place') {
        line.appendChild(cell('Small', sized('mini', cardEl(k, { mini: true }))));
        if (c.c != null) line.appendChild(cell('Smallest', el('div', { class: 'an-hand small' }, [sized('tiny', cardEl(k, { mini: true }))])));
      }
      if (fig) {
        const art = el('span', { class: 'fp-art' }), im = artImg(k, true); if (im) art.appendChild(im);
        line.appendChild(cell('On the map', el('span', { class: 'fp o0', style: { '--f': (FAC[c.f] || FAC.N).c, '--fw': '62px' } }, [el('span', { class: 'fp-card' }, [art]), el('span', { class: 'fp-m' }, [el('b', { text: String(c.m) })])])));
      }
      row.appendChild(line); return row;
    });
    app.className = 'stage an-proof'; app.innerHTML = '';
    app.appendChild(el('div', { class: 'ap' }, [el('h1', { text: 'Art proof' }), el('p', { text: keys.length + ' cards, each at every size it is drawn.' })].concat(rows)));
  }

  let saved = null; try { saved = JSON.parse(lsGet(SAVE)); } catch (e) {}
  if (/[?&]art(=|&|$)/.test(location.search)) artProof();
  else if (saved && saved.v === 1 && saved.G && saved.G.S && !saved.G.over && saved.G.S.figs) { try { restore(saved); } catch (e) { showSetup(); } }
  else if (window.AnoriaGuide && window.AnoriaGuide.firstTime()) window.AnoriaGuide.quickStart();   // (the first time here: two minutes of the game being played)
  else showSetup();
})();
