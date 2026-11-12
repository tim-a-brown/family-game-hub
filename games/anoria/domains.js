// Anoria: how a Domain looks. (A Domain is the card that lies at each of the map's five positions. The game's words
// still call it a Place: that changes with the rules work that follows this.)
// Tim, 2026-11-11: "domains need to be clear in their design/border what type of domain they are and geographically
// what "home" they represent for figures with home powers", and "things the game needs to track: 1- who played what
// domain. easy on device but needs a real-life translation since there could be effects that reverse the domains or
// randomly rearrange them (using a manual shuffle or die). 2 - markers for nullified/modified effects; 3 - turn count
// tracker for various reasons". Everything here is drawn as a piece that could lie on a real table.
//
// Every Domain has one kind, and its frame is that kind's material, so the kind is read from the border alone:
//   Commerce  a twisted cord, straw and green, with a brass seal at each corner       mark: a coin
//   Industry  riveted iron plate, a bolt at each corner                               mark: an anvil
//   Thought   a ruled margin on vellum, pricked for the ruling, the lines crossing    mark: an open book
//   Land      a battlement of dressed stone, a tower at each corner                   mark: a tower
//   Culture   a carved dog-tooth frieze in black on terracotta                        mark: a lyre
//   Law       a fluted marble moulding between slate fillets, a stud at each corner   mark: a pair of scales on a shield
//   Routes    a chart's neatline, ink and paper bars                                  mark: a compass needle
// No two share a pattern (slanting, dots, lines along, square teeth, triangles, a fine comb, long bars), and each
// mark sits on a plate of its own shape, so the seven hold apart without colour.
//
//   AnoriaDomains.KINDS, ORDER      the seven kinds: n its name, c its deep colour (a full card's ribbon)
//   AnoriaDomains.OF, kindOf(key)   the kind of each Domain there is today
//   AnoriaDomains.frame(kind)       the patterned border as an element, to lay inside any box that has a position
//   AnoriaDomains.mark(kind)        the kind's mark on its plate
//   AnoriaDomains.home(reg, o)      the home plate: a slip of paper cut to the shape of the house mark, with the
//                                   region's outline in it (o.lit: gold, a Figure that has been picked up is at home
//                                   here). With o.name: the house mark, the outline and the region's name in a row,
//                                   the way a Figure's home is written at the foot of its card
//   AnoriaDomains.emblem(reg)       the region's outline alone, as an SVG string (drawn from land.js)
//   AnoriaDomains.dress(card, key, o)   a full card from cardEl takes its kind's frame, mark, name and home;
//                                   o = {kind (another kind than the Domain's own), mini, owner, side, silenced,
//                                   changed, counter}
//   AnoriaDomains.tile(node, o)     a map tile takes them: {key or kind, reg, lit (a Figure about to be played or
//                                   walked is at home here), owner (0 or 1) and side ('L' or 'R': which side of the
//                                   tile that player sits on), silenced, changed, counter (1 to 5)}. The mark and
//                                   the home plate are clasps on the tile's left and right edges, tokens hang under
//                                   the mark, a banner stands over its player's corner, and a silenced rule lies
//                                   under a veil of ash, struck out
//   AnoriaDomains.banner(owner, side)   a player's banner: a cloth pennant on a brass pin (the second player's is
//                                   swallow-tailed)
//   AnoriaDomains.token(what, n)    'changed' (a rule altered for a while) or 'counter' (rounds left, n)
//   AnoriaDomains.track(node, o)    the round track; with no node it makes one. o = {round, max, turn (the seat
//                                   whose turn it is, or -1), due: [{r, o}] (something is due at the start of
//                                   round r for seat o)}
//   AnoriaDomains.proof(ctx)        the Domains part of the art proof (anoria.html?art=1)
// The looks are domains.css.
(function () {
  'use strict';
  const el = Kit.el, C = window.AnoriaCards, LAND = window.AnoriaLand || [];
  const KINDS = {
    COM: { n: 'Commerce', c: '#1f5a3c' }, IND: { n: 'Industry', c: '#3a414c' }, THO: { n: 'Thought', c: '#2a3f73' }, LAND: { n: 'Land', c: '#6f6248' },
    CUL: { n: 'Culture', c: '#9c4a26' }, LAW: { n: 'Law', c: '#4a5876' }, ROU: { n: 'Routes', c: '#18223f' }
  };
  const ORDER = ['COM', 'IND', 'THO', 'LAND', 'CUL', 'LAW', 'ROU'];
  // The twelve Domains of today's game (scripts/anoria/places/places.json, where Thought is still called Ideas)
  const OF = { library: 'THO', silk: 'ROU', colosseum: 'CUL', acropolis: 'CUL', wall: 'LAND', stonehenge: 'CUL', globe: 'CUL', machu: 'LAND', timbuktu: 'COM', petra: 'COM', nineveh: 'LAW', seneca: 'THO' };
  // (a Domain's kind is in its data, cards.js PLACES d, by name; the twelve first Places also have theirs in OF)
  const BYNAME = { Commerce: 'COM', Industry: 'IND', Thought: 'THO', Land: 'LAND', Culture: 'CUL', Law: 'LAW', Routes: 'ROU' };
  const kindOf = key => { const p = C && C.PLACES[key]; return (p && BYNAME[p.d]) || OF[key] || null; };
  const REG = { MED: 'Mediterranean', AFR: 'Africa', ASIA: 'Asia', EUR: 'Europe', MIDEAST: 'Middle East', AMER: 'Americas', OCE: 'Oceania' };

  // ═══ The seven frames ════════════════════════════════════════════════════════════════════════════════════
  // Each is one SVG cut in nine for border-image: a corner piece and one length of the edge, drawn once with the
  // outside of the frame up, and turned for the other three sides. The band is 12 units thick; P is the length of
  // the edge piece.
  const r = (x, y, w, h, f, more) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + f + '"' + (more || '') + '/>';
  const FR = {
    COM: { P: 12,
      edge: r(-2, 0, 16, 12, '#0f2419') +
        '<path d="M-6 10.4 -1.5 1.6H4.5L0 10.4zM6 10.4 10.5 1.6H16.5L12 10.4z" fill="#2f7d55"/><path d="M0 10.4 4.5 1.6H10.5L6 10.4z" fill="#e2c98a"/>' +
        '<path d="M0 10.4 4.5 1.6M6 10.4 10.5 1.6M12 10.4 16.5 1.6M-6 10.4-1.5 1.6" stroke="#0b1a11" stroke-width=".9"/>' +
        r(-2, 1.6, 16, 1.9, '#fff', ' opacity=".26"') + r(-2, 8.3, 16, 2.1, '#000', ' opacity=".3"'),
      corner: r(0, 0, 12, 12, '#0f2419') + '<circle cx="7.4" cy="7.4" r="4.3" fill="#7d5f22"/><circle cx="7.4" cy="7.4" r="3.4" fill="#dcbd6e"/><circle cx="7.4" cy="7.4" r="1.4" fill="#7d5f22"/><path d="M5 6.2a2.9 2.9 0 0 1 2.4-1.6" fill="none" stroke="#fff6d8" stroke-width=".8" stroke-linecap="round"/>' },
    IND: { P: 16,
      edge: r(0, 0, 16, 12, '#3a414c') + r(0, 0, 16, 1.5, '#fff', ' opacity=".24"') + r(0, 10.4, 16, 1.6, '#000', ' opacity=".45"') + r(0, 0, 1, 12, '#000', ' opacity=".5"') + r(1, 0, .8, 12, '#fff', ' opacity=".12"') +
        '<circle cx="8.5" cy="6" r="3.4" fill="#15181d"/><circle cx="8.5" cy="6" r="2.6" fill="#b9c2ce"/><circle cx="7.7" cy="5.2" r=".95" fill="#f2f5f9"/>',
      corner: r(0, 0, 12, 12, '#454d59') + r(0, 0, 12, 1.5, '#fff', ' opacity=".24"') + r(0, 0, 1.5, 12, '#fff', ' opacity=".2"') +
        '<path d="M7.4 3.4 10.9 5.4v4L7.4 11.4 3.9 9.4v-4z" fill="#15181d"/><path d="M7.4 4.5 9.9 6v2.9L7.4 10.3 4.9 8.9V6z" fill="#b9c2ce"/><circle cx="6.7" cy="6.7" r=".9" fill="#f2f5f9"/>' },
    THO: { P: 12,
      edge: r(0, 0, 12, 12, '#ecdcae') + r(0, 0, 12, 1, '#b09a68') + r(0, 11.1, 12, .9, '#8a7a58') + r(0, 5.4, 12, 2.5, '#2c4f8f') + r(0, 9, 12, 1.2, '#b0402e') +
        '<circle cx="3" cy="3" r="1" fill="#6e5f41"/><circle cx="9" cy="3" r="1" fill="#6e5f41"/>',
      corner: r(0, 0, 12, 12, '#ecdcae') + r(0, 0, 12, 1, '#b09a68') + r(0, 0, 1, 12, '#b09a68') + r(0, 5.4, 12, 2.5, '#2c4f8f') + r(5.4, 0, 2.5, 12, '#2c4f8f') + r(0, 9, 12, 1.2, '#b0402e') + r(9, 0, 1.2, 12, '#b0402e') +
        '<circle cx="3" cy="3" r="1" fill="#6e5f41"/>' },
    LAND: { P: 12,
      edge: r(8, 0, 4, 5.2, '#15120d') + r(0, 0, 8, 5.4, '#c2b289') + r(0, 5.2, 12, 6.8, '#a99870') + r(0, 0, 8, 1.1, '#fff', ' opacity=".38"') +
        '<path d="M0 5.4H12M0 8.6H12M4 5.4V8.6M10 5.4V8.6M7 8.6V12M1 8.6V12M8 0V5.4M0 0V5.4" fill="none" stroke="#5a4d36" stroke-width=".8"/>' + r(0, 11.2, 12, .8, '#4a3f2c'),
      corner: r(0, 0, 12, 12, '#cbbb93') + r(0, 0, 12, 1.2, '#fff', ' opacity=".4"') + r(0, 0, 1.2, 12, '#fff', ' opacity=".3"') + r(11, 0, 1, 12, '#5a4d36') + r(0, 11, 12, 1, '#5a4d36') + r(6.2, 4.6, 2.2, 4.8, '#2a2318') },
    CUL: { P: 8,
      edge: r(0, 0, 8, 12, '#bb5d31') + r(0, 0, 8, 1.7, '#1c1410') + r(0, 10.3, 8, 1.7, '#1c1410') + '<path d="M0 10.4 4 2.7 8 10.4z" fill="#1c1410"/>',
      corner: r(0, 0, 12, 12, '#1c1410') + r(3.4, 3.4, 6.9, 6.9, '#bb5d31') + r(5.5, 5.5, 2.7, 2.7, '#1c1410') },
    LAW: { P: 4,
      edge: r(0, 0, 4, 12, '#d5dae1') + r(0, 0, 4, 1.8, '#3d4a66') + r(0, 10.2, 4, 1.8, '#3d4a66') + r(.7, 2.7, 1.8, 6.6, '#5d6880', ' rx=".8"') + r(2.5, 2.7, .8, 6.6, '#fff'),
      corner: r(0, 0, 12, 12, '#3d4a66') + r(3, 3, 7.3, 7.3, '#d5dae1') + '<circle cx="6.7" cy="6.7" r="2.3" fill="#46536f"/><circle cx="6.1" cy="6.1" r=".75" fill="#c9d0dc"/>' },
    ROU: { P: 40,
      edge: r(0, 0, 40, 12, '#f4eedd') + r(0, 0, 40, 1.5, '#18223f') + r(0, 10.5, 40, 1.5, '#18223f') + r(0, 2.9, 20, 6.2, '#18223f') + '<path d="M20 3.3H40M20 8.7H40" stroke="#18223f" stroke-width=".8"/>',
      corner: r(0, 0, 12, 12, '#18223f') + '<path d="M7.2 3.4 11 7.2 7.2 11 3.4 7.2z" fill="#f4eedd"/><path d="M7.2 3.4V11L3.4 7.2z" fill="#c9a24a"/>' }
  };
  function frameSVG(k) {
    const f = FR[k], P = f.P, W = 24 + P, g = (rot, x, y, body) => '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')">' + body + '</g>';
    const clip = '<clipPath id="e"><rect x="-.02" width="' + (P + .04) + '" height="12"/></clipPath>', E = '<g clip-path="url(#e)">' + f.edge + '</g>';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + W + '" viewBox="0 0 ' + W + ' ' + W + '"><defs>' + clip + '</defs>' +
      g(0, 12, 0, E) + g(90, W, 12, E) + g(180, 12 + P, W, E) + g(270, 0, 12 + P, E) +
      g(0, 0, 0, f.corner) + g(90, W, 0, f.corner) + g(180, W, W, f.corner) + g(270, 0, W, f.corner) + '</svg>';
  }
  const uri = svg => 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  (function () {   // (the seven are made once, as rules of the page: a tile drawn again paints its frame at once)
    const st = document.createElement('style');
    st.textContent = ORDER.map(k => '.dm-fr.k-' + k + '{border-image-source:' + uri(frameSVG(k)) + ';}').join('\n');
    document.head.appendChild(st);
  })();
  const frame = kind => el('i', { class: 'dm-fr k-' + kind, 'aria-hidden': 'true' });

  // ═══ The seven marks, each on a plate of its own shape ═══════════════════════════════════════════════════
  const O = ' stroke="#10131c" stroke-width="1.3" stroke-linejoin="round"';
  const MARK = {
    COM: '<circle cx="12" cy="12" r="10.2" fill="#1f5a3c"' + O + '/><circle cx="12" cy="12" r="6.6" fill="#e2c98a" stroke="#0f2419" stroke-width="1"/><rect x="9.9" y="9.9" width="4.2" height="4.2" fill="#1f5a3c" stroke="#0f2419" stroke-width=".8"/>',
    IND: '<path d="M12 1.4 21.2 6.7v10.6L12 22.6 2.8 17.3V6.7z" fill="#98a2b0"' + O + '/><path d="M12 2.9 19.9 7.4v9.2L12 21.1 4.1 16.6V7.4z" fill="none" stroke="#e4e9ef" stroke-width=".8" opacity=".7"/><path d="M4.4 9 7.4 8.2H18.2V10.2C16.7 10.4 15.2 11.2 14.8 12.6V14.2L16.8 15.9V17.6H8.2V15.9L10.2 14.2V12.6C9 11.6 6.4 10.9 4.4 9z" fill="#1c2027"/>',
    THO: '<rect x="2.4" y="2.4" width="19.2" height="19.2" rx="2.2" fill="#efe4c4"' + O + '/><path d="M4.9 8.2C7 7 9.8 7.1 12 8.5 14.2 7.1 17 7 19.1 8.2V16.8C17 15.7 14.2 15.8 12 17.2 9.8 15.8 7 15.7 4.9 16.8z" fill="#fbf6e6" stroke="#2a3f73" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 8.5V17.2" stroke="#2a3f73" stroke-width="1.4"/><path d="M7 10.6C8 10.3 9.1 10.4 10 10.8M7 13C8 12.7 9.1 12.8 10 13.2M14 10.8C14.9 10.4 16 10.3 17 10.6M14 13.2C14.9 12.8 16 12.7 17 13" fill="none" stroke="#2a3f73" stroke-width="1"/>',
    LAND: '<path d="M3 22.4V6.6H5.2V2.6H8.8V6.6H10.2V2.6H13.8V6.6H15.2V2.6H18.8V6.6H21V22.4z" fill="#bdad85"' + O + '/><path d="M3.6 11.4H20.4M3.6 16H9.4M14.6 16H20.4" stroke="#5a4d36" stroke-width="1"/><path d="M9.4 22.4V16.4A2.6 2.6 0 0 1 14.6 16.4V22.4z" fill="#2a2318"/>',
    CUL: '<path d="M3.6 22.4V10.2A8.4 8.4 0 0 1 20.4 10.2V22.4z" fill="#bb5d31"' + O + '/><g fill="none" stroke="#1c1410" stroke-linecap="round"><path d="M9 18.6C6.4 14.6 6.7 10.8 8.5 7.9M15 18.6C17.6 14.6 17.3 10.8 15.5 7.9M7.2 9.8H16.8M9 18.6Q12 21 15 18.6" stroke-width="1.6"/><path d="M10.3 9.8V18.4M12 9.8V19.2M13.7 9.8V18.4" stroke-width=".95"/></g>',
    LAW: '<path d="M2.6 2.6H21.4V12.2C21.4 17.6 17.4 21 12 23 6.6 21 2.6 17.6 2.6 12.2z" fill="#dde0e5"' + O + '/><g fill="none" stroke="#3a4763" stroke-linecap="round"><path d="M12 6V17.6M9.2 17.8H14.8M6.6 8H17.4" stroke-width="1.6"/><path d="M7 8 5 12.4M7 8 9 12.4M17 8 15 12.4M17 8 19 12.4" stroke-width=".9"/></g><path d="M4.5 12.4H9.5A2.5 2.2 0 0 1 4.5 12.4zM14.5 12.4H19.5A2.5 2.2 0 0 1 14.5 12.4z" fill="#3a4763"/>',
    ROU: '<path d="M12 1.2 20.4 12 12 22.8 3.6 12z" fill="#f4eedd"' + O + '/><path d="M12 1.2V22.8L3.6 12z" fill="#18223f"/><circle cx="12" cy="12" r="1.9" fill="#c9a24a" stroke="#10131c" stroke-width=".8"/>'
  };
  const svg = (body, cls, vb) => '<svg class="' + (cls || '') + '" viewBox="' + (vb || '0 0 24 24') + '" aria-hidden="true">' + body + '</svg>';
  const mark = kind => el('span', { class: 'dm-k k-' + kind, role: 'img', 'aria-label': KINDS[kind].n, html: svg(MARK[kind]) });

  // ═══ Home: the region's outline, from the coastlines ═════════════════════════════════════════════════════
  // The middle of each region and how far the emblem reaches north and south of it, in degrees.
  const WIN = { MED: [16, 38.5, 13], AFR: [17.5, 2, 38], ASIA: [100, 30, 36], EUR: [13, 53, 19], MIDEAST: [45, 27, 16], AMER: [-86, 12, 62], OCE: [147, -22, 26] };
  const emb = {};
  function emblem(reg) {
    if (emb[reg] != null) return emb[reg];
    const w = WIN[reg]; if (!w || !LAND.length) return (emb[reg] = '');
    const k = 10.6 / w[2], kx = k * Math.cos(w[1] * Math.PI / 180), X = lon => 12 + (lon - w[0]) * kx, Y = lat => 12 - (lat - w[1]) * k;
    let d = '';
    for (const ring of LAND) {
      // (a ring far from the window is left out; one that crosses it is thinned to what an emblem can show)
      let a = 1e9, b = 1e9, c = -1e9, e = -1e9;
      for (let j = 0; j < ring.length; j += 2) { const x = X(ring[j]), y = Y(ring[j + 1]); if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > e) e = y; }
      if (c < 0 || a > 24 || e < 0 || b > 24 || (c - a) * (e - b) < 2) continue;
      let lx = 1e9, ly = 1e9, n = 0, s = '';
      for (let j = 0; j < ring.length; j += 2) {
        const x = X(ring[j]), y = Y(ring[j + 1]), far = x < -6 || x > 30 || y < -6 || y > 30, tol = far ? 9 : .8;
        if (Math.abs(x - lx) + Math.abs(y - ly) < tol) continue;
        s += (n ? 'L' : 'M') + Math.max(-40, Math.min(64, x)).toFixed(1) + ' ' + Math.max(-40, Math.min(64, y)).toFixed(1); lx = x; ly = y; n++;
      }
      if (n > 2) d += s + 'Z';
    }
    return (emb[reg] = '<circle cx="12" cy="12" r="11.4" class="sea"/><path d="' + d + '" class="land" clip-path="url(#dm-round)"/><circle cx="12" cy="12" r="11.4" class="rim"/>');
  }
  // (the land is cut to the round of the emblem by one clip that every emblem on the page shares)
  function clipReady() {
    if (document.getElementById('dm-round') || !document.body) return;
    document.body.appendChild(el('div', { 'aria-hidden': 'true', style: { position: 'absolute', width: '0', height: '0', overflow: 'hidden' }, html: '<svg width="0" height="0"><defs><clipPath id="dm-round"><circle cx="12" cy="12" r="11.4"/></clipPath></defs></svg>' }));
  }
  const emblemSVG = reg => { clipReady(); return '<svg class="dm-emb" viewBox="0 0 24 24" aria-hidden="true">' + emblem(reg) + '</svg>'; };
  const HOUSE = '<svg class="dm-house" viewBox="0 0 12 12" aria-hidden="true"><path d="M1.4 6 6 1.8 10.6 6M2.8 5.2v5h6.4v-5" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // On a map tile the home plate is a slip of the card's paper cut to the shape of the house mark, with the region's
  // outline in it. At the foot of a full card (o.name) it is the house mark, the outline and the region's name, the
  // way a Figure's home is written at the foot of a Figure's card.
  // (each is made once and copied: the table draws its five tiles again on every step)
  const homes = {};
  function home(reg, o) {
    o = o || {}; const label = 'Home region: ' + (REG[reg] || reg), k = reg + (o.name ? '/row' : ''); clipReady();
    if (!homes[k]) homes[k] = o.name ? el('span', { class: 'dm-home row r-' + reg, role: 'img', 'aria-label': label, html: HOUSE + emblemSVG(reg) + '<b>' + Kit.esc(REG[reg] || '') + '</b>' })
      : el('span', { class: 'dm-home r-' + reg, role: 'img', 'aria-label': label,
        html: '<svg class="dm-hp" viewBox="0 0 24 28" aria-hidden="true"><path class="hp" d="M12 1.3 22.8 10.6V26.7H1.2V10.6z"/><g transform="translate(3.9 7.7) scale(.675)">' + emblem(reg) + '</g></svg>' });
    const n = homes[k].cloneNode(true); if (o.lit) n.classList.add('lit'); return n;
  }

  // ═══ The pieces that lie on a Domain ═════════════════════════════════════════════════════════════════════
  // A player's banner: a cloth pennant on a brass pin. One stands on every Domain that player brought to the table,
  // over that player's own corner of it, and flies toward their side.
  const BANNER = '<path d="M4 3.2V25" stroke="#3b2a12" stroke-width="2.4" stroke-linecap="round"/><path d="M4 3.2V25" stroke="#e2c57c" stroke-width="1.1" stroke-linecap="round"/>' +
    '<path d="M5.2 3.6C10 4.2 15.4 6.2 22.6 9.4 15.4 11.6 10 13.4 5.2 15.2z" class="cloth"/><path d="M5.2 3.6C8 7 8 11.8 5.2 15.2z" fill="#000" opacity=".2"/><path d="M6.4 9.4H19" stroke="#fff" stroke-width=".8" opacity=".5" stroke-linecap="round"/>' +
    '<circle cx="4" cy="2.9" r="2.3" fill="#f0d98c" stroke="#5a4215" stroke-width=".8"/>';
  // (the second player's pennant is swallow-tailed, so the two are told apart without colour)
  const TAIL = BANNER.replace('M5.2 3.6C10 4.2 15.4 6.2 22.6 9.4 15.4 11.6 10 13.4 5.2 15.2z', 'M5.2 3.6C10 3.9 16 4.4 22.8 5.2L17.4 9.4 22.8 13.6C16 14.4 10 14.9 5.2 15.2z').replace('M6.4 9.4H19', 'M6.4 9.4H15.6');
  const banner = (owner, side) => el('span', { class: 'dm-ban o' + owner + ' ' + (side || 'R'), role: 'img', 'aria-label': 'Brought by the ' + (owner ? 'second' : 'first') + ' player', html: svg(owner ? TAIL : BANNER, '', '0 0 24 26') });
  // A rule that is changed for a while: a dark enamel token with a gilt pen nib. A counter: a bone disc with the
  // rounds that are left.
  const NIB = '<circle cx="12" cy="12" r="10.6" fill="#1d2445" stroke="#e9cf86" stroke-width="1.7"/><path d="M12 4.2 16.4 12.2C16.4 15.2 14.4 17.4 12 19.8 9.6 17.4 7.6 15.2 7.6 12.2z" fill="#e9cf86"/><path d="M12 19.8V13" stroke="#1d2445" stroke-width="1.1"/><circle cx="12" cy="11.6" r="1.4" fill="#1d2445"/>';
  function token(what, n) {
    if (what === 'counter') return el('span', { class: 'dm-tok cnt', role: 'img', 'aria-label': n + (n === 1 ? ' round left' : ' rounds left') }, [el('b', { text: String(n) })]);
    return el('span', { class: 'dm-tok chg', role: 'img', 'aria-label': 'This rule is changed for now', html: svg(NIB) });
  }

  // ═══ A map tile ══════════════════════════════════════════════════════════════════════════════════════════
  function tile(node, o) {
    o = o || {}; const kind = o.kind || kindOf(o.key); if (!kind) return node;
    node.classList.add('dm', 'k-' + kind); node.setAttribute('data-kind', kind);
    if (o.lit) node.classList.add('lit'); if (o.silenced) node.classList.add('sil'); if (o.changed) node.classList.add('chg');
    node.appendChild(frame(kind));
    const left = el('span', { class: 'dm-clasp L' }, [mark(kind)]);
    if (o.changed) left.appendChild(token('changed')); if (o.counter) left.appendChild(token('counter', o.counter));
    node.appendChild(left);
    if (o.reg) node.appendChild(el('span', { class: 'dm-clasp R' }, [home(o.reg, { lit: o.lit })]));
    if (o.owner != null) node.appendChild(banner(o.owner, o.side));
    return node;
  }

  // ═══ A full card ═════════════════════════════════════════════════════════════════════════════════════════
  // cardEl (ui.js) hands over the card it has made: the border becomes the kind's frame, the ribbon takes the
  // kind's colour and name, the mark stands in the corner where other cards have their cost, and the region goes
  // to the foot, the way a Figure's home does.
  function dress(n, key, o) {
    o = o || {}; const kind = o.kind || kindOf(key), p = C.PLACES[key]; if (!kind || !p) return n;
    const K = KINDS[kind];
    n.classList.add('dm', 'k-' + kind); n.setAttribute('data-kind', kind); n.style.setProperty('--f', K.c);
    const inn = n.querySelector('.ac-in'), paper = n.querySelector('.ac-paper'), rib = paper && paper.querySelector('.ac-rib span');
    // (a card dressed a second time, as another kind: what the first time added comes off, and the card's own words stay)
    n.querySelectorAll('.dm-foot .ac-say').forEach(x => paper.appendChild(x));
    n.querySelectorAll('.dm-fr, .dm-k, .dm-foot, .dm-ban, .dm-clasp').forEach(x => x.remove()); ORDER.forEach(k => n.classList.remove('k-' + k));
    n.appendChild(frame(kind));
    if (rib) rib.textContent = K.n;
    if (inn) inn.appendChild(mark(kind));
    if (paper && !o.mini) {
      const say = paper.querySelector('.ac-say'), h = window.AnoriaUI && window.AnoriaUI.homeFoot ? window.AnoriaUI.homeFoot(p.reg) : home(p.reg, { name: true }); h.classList.add('ac-home');
      paper.appendChild(el('div', { class: 'dm-foot' }, [say || el('span'), h]));
      // (turned over to its picture, the card keeps its home on the strip at the foot)
      // (a Domain's picture view has its home on the name line, as every card's has: ui.js cardEl)
    }
    if (o.silenced) n.classList.add('sil'); if (o.changed) n.classList.add('chg');
    if (!o.mini && (o.changed || o.counter)) { const t = el('span', { class: 'dm-clasp L' }); if (o.changed) t.appendChild(token('changed')); if (o.counter) t.appendChild(token('counter', o.counter)); n.appendChild(t); }
    if (o.owner != null) n.appendChild(banner(o.owner, o.side));
    return n;
  }

  // ═══ The round track ═════════════════════════════════════════════════════════════════════════════════════
  // An enamel rule with the rounds engraved along it and a slide that stands at this round, in the colour of the
  // player whose turn it is (brass while the round is being counted). A gem hangs at a round where something is due.
  function track(node, o) {
    o = o || {}; const max = o.max || (node && node._max) || 14;
    if (!node) {
      node = el('div', { class: 'dm-track', role: 'img' }); node._max = max; node.style.setProperty('--n', max);
      const stops = el('div', { class: 'tr-stops' });
      for (let i = 1; i <= max; i++) stops.appendChild(el('span', { class: 'tr-s', style: { '--i': i - 1 } }, [el('b', { text: String(i) })]));
      node._cur = el('span', { class: 'tr-cur' }, [el('b')]); node.appendChild(stops); node.appendChild(node._cur); node._stops = stops;
    }
    if (o.round == null) return node;
    const round = Math.max(1, Math.min(max, o.round)), turn = o.turn == null ? -1 : o.turn, due = (o.due || []).filter(Boolean);
    const sig = round + '/' + turn + '/' + due.map(d => d.r + ':' + d.o).join(',');
    if (node._sig === sig) return node; node._sig = sig;
    Array.prototype.forEach.call(node._stops.children, (s, i) => {
      const cls = 'tr-s' + (i + 1 < round ? ' past' : i + 1 === round ? ' now' : ''); if (s.className !== cls) s.className = cls;
      const d = due.filter(x => x.r === i + 1), old = s.querySelectorAll('.tr-due');
      if (old.length !== d.length || d.some((x, j) => old[j].getAttribute('data-o') !== String(x.o))) { old.forEach(x => x.remove()); d.forEach(x => s.appendChild(el('i', { class: 'tr-due o' + x.o, 'data-o': x.o }))); }
    });
    node._cur.style.setProperty('--at', round - 1); node._cur.className = 'tr-cur' + (turn >= 0 ? ' o' + turn : '');
    if (node._cur.firstChild.textContent !== String(round)) node._cur.firstChild.textContent = String(round);
    node.setAttribute('aria-label', 'Round ' + round + ' of ' + max);
    return node;
  }

  // ═══ The proof ═══════════════════════════════════════════════════════════════════════════════════════════
  // ctx = {cardEl, artImg, matFill, mats, rule: {key: the rule as the tile says it}}
  function proof(ctx) {
    const P = C.PLACES, cell = (label, node) => el('div', { class: 'ap-c' }, [node, el('small', { text: label })]);
    const row = (title, kids, note) => el('div', { class: 'ap-row dp-row' }, [el('h2', { text: title }), note ? el('p', { class: 'dp-note', text: note }) : null, el('div', { class: 'ap-line' }, kids)]);
    // one Domain of each kind (Industry has none with a picture yet, so it is shown on a picture that is here)
    const EX = { COM: 'timbuktu', IND: 'petra', THO: 'library', LAND: 'wall', CUL: 'colosseum', LAW: 'nineveh', ROU: 'silk' };
    const fig = (key, o, m, home) => {
      const a = el('span', { class: 'fp-art' }), im = ctx.artImg(key, true); if (im) a.appendChild(im);
      const n = el('span', { class: 'fp o' + o, style: { '--f': '#555' } }, [el('span', { class: 'fp-card' }, [a]), el('span', { class: 'fp-m' }, [el('b', { text: String(m) })])]);
      if (home) n.appendChild(el('span', { class: 'fp-home', html: HOUSE })); return n;
    };
    // a tile as the table draws it (rowEl in ui.js), with what this file adds
    function tileEl(key, o) {
      o = o || {}; const p = P[key], t = el('span', { class: 'pl-tile' });
      const art = el('span', { class: 'pl-art' }, [el('span', { class: 'na' })]), im = ctx.artImg(key, true); if (im) art.appendChild(im);
      t.appendChild(art);
      const tot = o.tot || [0, 0];
      t.appendChild(el('span', { class: 'pl-tots' }, [el('span', { class: 'pl-tot L' + (tot[0] ? '' : ' zero'), style: { '--tc': 'var(--pc1)' }, text: String(tot[0]) }), el('span', { class: 'pl-tot R' + (tot[1] ? '' : ' zero'), style: { '--tc': 'var(--pc0)' }, text: String(tot[1]) })]));
      t.appendChild(el('span', { class: 'pl-flag' + (o.hold != null ? '' : ' none'), style: o.hold != null ? { '--hc': 'var(--pc' + o.hold + ')' } : null }, [el('b', { text: '1' })]));
      const rule = o.rule != null ? o.rule : ctx.rule[key];
      t.appendChild(el('span', { class: 'pl-plate' }, [el('span', { class: 'pl-name' + (p.n.length > 15 ? ' long' : ''), text: p.n }), rule ? el('span', { class: 'pl-rule', text: rule }) : null]));
      return tile(t, Object.assign({ key: key, reg: p.reg }, o));
    }
    function rowEl(key, o) {
      o = o || {};
      const rw = el('div', { class: 'pl' + (o.hold != null ? ' held' + o.hold : ''), style: { '--pcL': 'var(--pc1)', '--pcR': 'var(--pc0)' } });
      const side = (cls, figs) => { const s = el('div', { class: 'pl-side ' + cls }); (figs || []).forEach(f => s.appendChild(f)); for (let i = (figs || []).length; i < 3; i++) s.appendChild(el('span', { class: 'slot' })); return s; };
      rw.appendChild(side('L', o.L)); rw.appendChild(tileEl(key, o)); rw.appendChild(side('R', o.R)); return rw;
    }
    // five Domains with everything on them: both players' banners (the second player's Outpost has changed places
    // with the Crossroads, and the Crossroads is the second player's), one silenced, one changed for 3 more rounds,
    // Hypatia at home at the Library and Tomoe Gozen away from home at Petra
    function map(top, bot, cls) {
      const pm = [el('div', { class: 'an-pm top' }), el('div', { class: 'an-pm bot' })]; ctx.matFill(pm[0], top, 'dp' + (cls || '')); ctx.matFill(pm[1], bot, 'dp' + (cls || ''));
      const m = el('div', { class: 'an-map tight' }, [el('div', { class: 'an-road' }),
        rowEl('nineveh', { owner: 1, side: 'L', hold: 1, tot: [4, 0], L: [fig('hammurabi', 1, 4, true)], rule: 'Your last Seal holds' }),
        rowEl('colosseum', { owner: 0, side: 'R', silenced: true, counter: 2, tot: [3, 3], L: [fig('baibars', 1, 3)], R: [fig('leonidas', 0, 3, true)] }),
        rowEl('silk', { owner: 1, side: 'L', hold: 0, tot: [0, 5], R: [fig('zhenghe', 0, 5, true)] }),
        rowEl('library', { owner: 1, side: 'L', changed: true, counter: 3, hold: 0, lit: true, tot: [0, 3], R: [fig('hypatia', 0, 3, true)] }),
        rowEl('petra', { owner: 0, side: 'R', hold: 0, tot: [0, 4], R: [fig('tomoe', 0, 4)] })]);
      return el('div', { class: 'dp-table ' + (cls || '') }, [el('div', { class: 'an-mats' }, pm), m, track(track(null, { max: 14 }), { round: 5, turn: 0, due: [{ r: 5, o: 1 }, { r: 9, o: 0 }] })]);
    }
    const mats = Object.keys(ctx.mats), pic = window.MatKit ? window.MatKit.make({ c: 'colosseum', w: 960, h: 640, col: '#2b1c16', d: .2 }, 1.75) : 'chart';
    if (pic && typeof pic === 'object') { pic.x = .3; pic.y = .5; pic.s = 1.1; }
    const pairs = []; for (let i = 0; i < mats.length; i += 2) pairs.push([mats[i], mats[i + 1] || mats[0]]); pairs.push([pic, 'chart']);
    const full = k => el('div', { class: 'ap-s full' }, [dress(ctx.cardEl(EX[k]), EX[k], { kind: k })]);
    const tiles = (big) => el('div', { class: 'dp-tiles an-map tight' + (big ? ' big' : '') }, ORDER.map(k => el('div', { class: 'dp-t' }, [tileEl(EX[k], { kind: k, tot: [2, 3] }), el('small', { text: KINDS[k].n })])));
    const sheet = () => el('div', { class: 'dp-sheet' }, [
      el('div', { class: 'dp-cards' }, ORDER.map(k => el('div', { class: 'ap-s dp-sm' }, [dress(ctx.cardEl(EX[k]), EX[k], { kind: k })]))), tiles(), el('div', { class: 'dp-marks' }, ORDER.map(k => mark(k))), map('cleopatra', 'franklin', 'cb')]);
    const trk = (round, turn, due, v) => { const t = track(track(null, { max: 14 }), { round: round, turn: turn, due: due }); if (v) t.classList.add('v'); return el('div', { class: 'dp-trk' + (v ? ' v' : '') }, [t]); };
    const fil = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      '<filter id="dp-deut" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values=".367 .861 -.228 0 0  .280 .673 .047 0 0  -.012 .043 .969 0 0  0 0 0 1 0"/></filter>' +
      '<filter id="dp-prot" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values=".152 1.053 -.205 0 0  .115 .786 .099 0 0  -.004 -.048 1.052 0 0  0 0 0 1 0"/></filter></defs></svg>';
    return el('div', { class: 'dp' }, [
      el('div', { html: fil }),
      el('h1', { text: 'Domains' }),
      el('p', { text: 'The seven kinds of Domain, the pieces that lie on a Domain, and the round track.' }),
      row('The seven frames on a full card', ORDER.map(k => cell(KINDS[k].n + (k === 'IND' ? ', on a picture that is here' : ''), full(k))).concat([cell('The back', el('div', { class: 'ap-s full' }, [el('div', { class: 'ac t-place back dm-back' }, [el('div', { class: 'ac-in' })])]))])),
      row('The seven marks', ORDER.map(k => cell(KINDS[k].n, el('span', { class: 'dp-mark' }, [mark(k)])))),
      row('Home plates: on a tile, and at the foot of a full card', Object.keys(REG).map(g => cell(REG[g], el('span', { class: 'dp-home' }, [home(g), home(g, { name: true })]))).concat([cell('Lit: the Figure that has been picked up is at home here', el('span', { class: 'dp-home' }, [home('ASIA', { lit: true })]))])),
      row('The seven frames as tiles, the size they are on a phone', [tiles()]),
      row('The same at twice the size', [tiles(true)]),
      row('A full card with a banner, silenced, and changed for 3 rounds', [
        cell('The first player brought it', el('div', { class: 'ap-s full' }, [dress(ctx.cardEl('timbuktu'), 'timbuktu', { owner: 0, side: 'R' })])),
        cell('Silenced', el('div', { class: 'ap-s full' }, [dress(ctx.cardEl('colosseum'), 'colosseum', { owner: 1, side: 'L', silenced: true, counter: 2 })])),
        cell('Changed for 3 rounds', el('div', { class: 'ap-s full' }, [dress(ctx.cardEl('library'), 'library', { owner: 1, side: 'L', changed: true, counter: 3 })]))]),
      row('The pieces', [cell('First player\'s banner', el('span', { class: 'dp-piece' }, [banner(0, 'R')])), cell('Second player\'s banner', el('span', { class: 'dp-piece' }, [banner(1, 'L')])),
        cell('A veil of ash on a rule that is silenced', el('span', { class: 'pl-tile sil dp-veil' }, [el('span', { class: 'pl-rule', text: 'Win a clash: 1 Renown' })])),
        cell('A rule is changed', el('span', { class: 'dp-piece' }, [token('changed')]))].concat([1, 2, 3, 4, 5].map(i => cell(i + (i === 1 ? ' round left' : ' rounds left'), el('span', { class: 'dp-piece' }, [token('counter', i)]))))),
      row('The round track', [cell('Round 1, the first player\'s turn', trk(1, 0, [{ r: 5, o: 1 }])), cell('Round 5, the second player\'s turn, with something due this round and at round 9', trk(5, 1, [{ r: 5, o: 1 }, { r: 9, o: 0 }])), cell('Round 14, the count', trk(14, -1, [{ r: 5, o: 1 }])),
        cell('Sideways, round 5', trk(5, 0, [{ r: 5, o: 1 }], true))]),
      row('The map on every play mat', pairs.map(pr => cell((typeof pr[0] === 'object' ? 'A picture mat' : ctx.mats[pr[0]].n) + ' over ' + ctx.mats[pr[1]].n, map(pr[0], pr[1]))),
        'Banners of both players, the Colosseum silenced for 2 more rounds, the Library changed for 3, Hypatia at home at the Library with its home plate lit, Tomoe Gozen away from home at Petra. The second player\'s Outpost and the Crossroads are both the second player\'s.'),
      el('div', { class: 'ap-row dp-row' }, [el('h2', { text: 'Without colour' }), el('div', { class: 'dp-grey' }, [sheet()])]),
      el('div', { class: 'ap-row dp-row' }, [el('h2', { text: 'Red and green alike (deuteranopia)' }), el('div', { class: 'dp-deut' }, [sheet()])]),
      el('div', { class: 'ap-row dp-row' }, [el('h2', { text: 'Red and green alike (protanopia)' }), el('div', { class: 'dp-prot' }, [sheet()])])
    ]);
  }

  window.AnoriaDomains = { KINDS: KINDS, ORDER: ORDER, OF: OF, REG: REG, kindOf: kindOf, frame: frame, mark: mark, home: home, emblem: emblemSVG, banner: banner, token: token, tile: tile, dress: dress, track: track, proof: proof };
})();
