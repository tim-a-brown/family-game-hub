// ═══════════════════════════════════════════════════════════════════════════
// Balatro (Joker Run) rules engine: pure game state, no DOM.
// Loaded by games/jokerrun.html; also runs under Node for the scoring tests.
//   JRE.newRun(name, deck, seed)        start a run (state in JRE.S)
//   JRE.score(ids, live)                full scoring breakdown as an event list
//   JRE.play(ids) / JRE.discard(ids)    take a turn (returns what happened)
//   ...flow: startBlind, skipBlind, collect, buy, reroll, sell, use, pick
// Joker, consumable, boss, tag and voucher names and art are our own; the
// mechanics follow Balatro's rules and numbers.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var E = {};
  var S = null;

  // ═══ Cards ═══════════════════════════════════════════════════════════════
  var RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  var RV = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 };
  var SUITS = ['s', 'h', 'c', 'd'];
  var SUITN = { s: 'Spades', h: 'Hearts', c: 'Clubs', d: 'Diamonds' };
  var GLYPH = { s: '♠', h: '♥', c: '♣', d: '♦' };
  var ENH = {
    bonus: { n: 'Bonus Card', d: '{c|+30} extra Chips' },
    mult: { n: 'Mult Card', d: '{m|+4} Mult' },
    wild: { n: 'Wild Card', d: 'Counts as every suit' },
    glass: { n: 'Glass Card', d: '{x|x2} Mult, {p|1 in 4} chance to break after scoring' },
    steel: { n: 'Steel Card', d: '{x|x1.5} Mult while this card stays in your hand' },
    stone: { n: 'Stone Card', d: '{c|+50} Chips, no rank or suit, always scores' },
    gold: { n: 'Gold Card', d: '{o|$3} if this card is in your hand at the end of the round' },
    lucky: { n: 'Lucky Card', d: '{p|1 in 5} chance of {m|+20} Mult, {p|1 in 15} chance to win {o|$20}' }
  };
  var EDN = {
    foil: { n: 'Foil', d: '{c|+50} Chips', price: 2 },
    holo: { n: 'Holographic', d: '{m|+10} Mult', price: 3 },
    poly: { n: 'Polychrome', d: '{x|x1.5} Mult', price: 5 },
    neg: { n: 'Negative', d: '{a|+1} Joker slot', dc: '{a|+1} consumable slot', price: 5 }
  };
  var SEAL = {
    gold: { n: 'Gold Seal', d: 'Earn {o|$3} when this card scores' },
    red: { n: 'Red Seal', d: 'This card triggers {a|1} more time' },
    blue: { n: 'Blue Seal', d: 'Makes the Planet card for your last hand if held at the end of the round' },
    purple: { n: 'Purple Seal', d: 'Makes a Tarot card when discarded' }
  };

  // ═══ Poker hands (base chips × mult, and what each level adds) ═══════════
  var HANDS = [
    { id: 'flushfive', n: 'Flush Five', c: 160, m: 16, ac: 50, am: 3, secret: true, ex: 'Five cards of the same rank and suit' },
    { id: 'flushhouse', n: 'Flush House', c: 140, m: 14, ac: 40, am: 4, secret: true, ex: 'A Full House, all one suit' },
    { id: 'five', n: 'Five of a Kind', c: 120, m: 12, ac: 35, am: 3, secret: true, ex: 'Five cards of one rank' },
    { id: 'sflush', n: 'Straight Flush', c: 100, m: 8, ac: 40, am: 4, ex: 'A Straight, all one suit' },
    { id: 'four', n: 'Four of a Kind', c: 60, m: 7, ac: 30, am: 3, ex: 'Four cards of one rank' },
    { id: 'full', n: 'Full House', c: 40, m: 4, ac: 25, am: 2, ex: 'Three of a kind plus a pair' },
    { id: 'flush', n: 'Flush', c: 35, m: 4, ac: 15, am: 2, ex: 'Five cards of one suit' },
    { id: 'straight', n: 'Straight', c: 30, m: 4, ac: 30, am: 3, ex: 'Five ranks in a row (A can be low or high)' },
    { id: 'three', n: 'Three of a Kind', c: 30, m: 3, ac: 20, am: 2, ex: 'Three cards of one rank' },
    { id: 'two', n: 'Two Pair', c: 20, m: 2, ac: 20, am: 1, ex: 'Two different pairs' },
    { id: 'pair', n: 'Pair', c: 10, m: 2, ac: 15, am: 1, ex: 'Two cards of one rank' },
    { id: 'high', n: 'High Card', c: 5, m: 1, ac: 10, am: 1, ex: 'Nothing else: your highest card scores' }
  ];
  var HMAP = {}; HANDS.forEach(function (h, i) { h.rank = i; HMAP[h.id] = h; });
  function hChips(id, lvl) { var h = HMAP[id]; return Math.max(0, h.c + h.ac * (lvl - 1)); }
  function hMult(id, lvl) { var h = HMAP[id]; return Math.max(1, h.m + h.am * (lvl - 1)); }
  // Planets: one per hand
  var PLANETS = { high: 'Polaris', pair: 'Gemma', two: 'Castor', three: 'Altair', straight: 'Rigel', flush: 'Vega', full: 'Sirius',
    four: 'Deneb', sflush: 'Antares', five: 'Nova', flushhouse: 'Halo', flushfive: 'Zenith' };

  // ═══ RNG (seeded, saved with the run) ═════════════════════════════════════
  function rnd() { var t = (S.rs = (S.rs + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function ri(n) { return Math.floor(rnd() * n); }
  function pick(a) { return a[ri(a.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = ri(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function wpick(list) { var t = 0, i; for (i = 0; i < list.length; i++) t += list[i][1]; var r = rnd() * t; for (i = 0; i < list.length; i++) { r -= list[i][1]; if (r < 0) return list[i][0]; } return list[list.length - 1][0]; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ═══ Card helpers ════════════════════════════════════════════════════════
  function C(id) { return S.cards[id]; }
  function newCard(r, s, o) {
    o = o || {};
    var id = 'k' + (S.nid++);
    S.cards[id] = { id: id, r: r, s: s, e: o.e || null, ed: o.ed || null, sl: o.sl || null, bc: o.bc || 0 };
    return S.cards[id];
  }
  function addToDeck(c) { S.deck.push(c.id); jokerEvent('addCard', c); return c; }
  function destroyCard(id) {
    var c = C(id); if (!c) return;
    S.deck = S.deck.filter(function (x) { return x !== id; });
    S.hand = S.hand.filter(function (x) { return x !== id; });
    S.draw = S.draw.filter(function (x) { return x !== id; });
    delete S.cards[id];
    if (c.e === 'glass') jokerEvent('shard', c);
    if (isFaceRaw(c)) jokerEvent('faceGone', c);
  }
  function isStone(c) { return c.e === 'stone'; }
  function rankOf(c) { return isStone(c) ? 0 : RV[c.r]; }
  function chipsOf(c) { if (isStone(c)) return 50; var v = RV[c.r]; return v === 14 ? 11 : v > 10 ? 10 : v; }
  function isFaceRaw(c) { return !isStone(c) && (c.r === 'J' || c.r === 'Q' || c.r === 'K'); }
  function isFace(c, o) { return !isStone(c) && (c.r === 'J' || c.r === 'Q' || c.r === 'K' || !!(o && o.allFace)); }
  var SMEAR = { h: 'd', d: 'h', s: 'c', c: 's' };
  function suitIs(c, s, o) {
    if (isStone(c)) return false;
    if (c.e === 'wild') return true;
    return c.s === s || !!(o && o.smeared && SMEAR[c.s] === s);
  }
  function cardName(c) {
    if (isStone(c)) return 'Stone Card';
    var r = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack' }[c.r] || c.r;
    return r + ' of ' + SUITN[c.s];
  }

  // ═══ Hand evaluation ═════════════════════════════════════════════════════
  // opt: four (4-card flushes/straights), shortcut (straights may skip one rank), smeared
  function straightOf(cards, need, shortcut) {
    var at = {};
    cards.forEach(function (c) { var v = rankOf(c); if (!v) return; (at[v] = at[v] || []).push(c); if (v === 14) (at[1] = at[1] || []).push(c); });
    var best = null;
    for (var lo = 1; lo <= 14; lo++) {
      if (!at[lo]) continue;
      var run = [lo], v = lo;
      while (true) {
        if (at[v + 1]) { v += 1; run.push(v); }
        else if (shortcut && at[v + 2] && v + 2 <= 14) { v += 2; run.push(v); }
        else break;
      }
      if (run.length >= need && (!best || run.length > best.length)) best = run;
    }
    if (!best) return null;
    var out = [];
    best.forEach(function (v) { at[v].forEach(function (c) { if (out.indexOf(c) < 0 && !(v === 1 && best.indexOf(14) >= 0)) out.push(c); }); });
    return out;
  }
  function evalHand(cards, opt) {
    opt = opt || {};
    var real = cards.filter(function (c) { return !isStone(c); });
    var stones = cards.filter(isStone);
    var byR = {};
    real.forEach(function (c) { var v = RV[c.r]; (byR[v] = byR[v] || []).push(c); });
    var groups = Object.keys(byR).map(function (k) { return byR[k]; }).sort(function (a, b) { return b.length - a.length || RV[b[0].r] - RV[a[0].r]; });
    var need = opt.four ? 4 : 5, flush = null, st = null;
    if (real.length >= need) {
      SUITS.forEach(function (s) { var m = real.filter(function (c) { return suitIs(c, s, opt); }); if (m.length >= need && (!flush || m.length > flush.length)) flush = m; });
      st = straightOf(real, need, opt.shortcut);
    }
    var g0 = groups.length ? groups[0].length : 0, g1 = groups.length > 1 ? groups[1].length : 0;
    var fullFlush = flush && flush.length === real.length && real.length === 5;
    var hand, sc;
    if (g0 >= 5 && fullFlush) { hand = 'flushfive'; sc = real; }
    else if (g0 === 3 && g1 === 2 && fullFlush) { hand = 'flushhouse'; sc = real; }
    else if (g0 >= 5) { hand = 'five'; sc = groups[0]; }
    else if (st && flush) { hand = 'sflush'; sc = real.filter(function (c) { return st.indexOf(c) >= 0 || flush.indexOf(c) >= 0; }); }
    else if (g0 === 4) { hand = 'four'; sc = groups[0]; }
    else if (g0 === 3 && g1 >= 2) { hand = 'full'; sc = groups[0].concat(groups[1]); }
    else if (flush) { hand = 'flush'; sc = flush; }
    else if (st) { hand = 'straight'; sc = st; }
    else if (g0 === 3) { hand = 'three'; sc = groups[0]; }
    else if (g0 === 2 && g1 === 2) { hand = 'two'; sc = groups[0].concat(groups[1]); }
    else if (g0 === 2) { hand = 'pair'; sc = groups[0]; }
    else { hand = 'high'; sc = real.length ? [real.slice().sort(function (a, b) { return RV[b.r] - RV[a.r]; })[0]] : []; }
    var has = { high: true, pair: g0 >= 2, two: g0 >= 2 && g1 >= 2, three: g0 >= 3, four: g0 >= 4, five: g0 >= 5,
      straight: !!st, flush: !!flush, full: g0 >= 3 && g1 >= 2, sflush: !!(st && flush), flushhouse: hand === 'flushhouse' || hand === 'flushfive', flushfive: hand === 'flushfive' };
    // scoring cards keep their played order; Stone cards always score
    var scoring = cards.filter(function (c) { return sc.indexOf(c) >= 0 || isStone(c); });
    return { hand: hand, scoring: scoring, has: has, stones: stones.length };
  }

  // ═══ Jokers (original names and art; Balatro-style effects) ══════════════
  // r: 1 Common, 2 Uncommon, 3 Rare, 4 Legendary. c: shop price.
  // Hooks (v = this joker's saved values, x = the hand being scored):
  //   before(v,x)        scaling before scoring       card(v,c,x)  each scored card
  //   held(v,c,x)        each card held in hand       main(v,x)    the joker's own turn
  //   retrig(v,c,x,i)    extra triggers for a scored card     retrigHeld(v,c,x)
  //   after(v,x)         after the hand              disc(v,cards,x)  on discard
  //   sel(v)             blind selected              end(v) -> $   at cash out
  //   endRound(v)        round over (-> {gone:msg})  boss(v)      boss beaten
  //   on: {addCard, shard, faceGone, lucky, planet, tarot, reroll, sell}
  // Flags: four, shortcut, splash, allFace, smeared, hs, hands, discs, debt, freeRR, silence, dice, moon
  var JK = {};
  function J(k, n, r, c, art, d, o) { o = o || {}; o.n = n; o.r = r; o.c = c; o.art = art; o.d = d; JK[k] = o; }
  function cont(h, eff) { return function (v, x) { return x.has[h] ? eff : null; }; }
  function suitCard(s, eff) { return function (v, c, x) { return suitIs(c, s, x.opt) ? eff : null; }; }
  function scale(key, per, unit) { return function (v) { return '+' + (v[key] || 0); }; }

  // Common
  J('grin', "Jester's Grin", 1, 2, ['grin', '#5b2bb5', '#24104f', '#ffcf4a'], '{m|+4} Mult', { main: function () { return { mult: 4 }; } });
  J('rose', 'Rose Garden', 1, 5, ['rose', '#2f6b3a', '#123018', '#ff5c7a'], 'Played {s|h} cards give {m|+3} Mult when scored', { card: suitCard('h', { mult: 3 }) });
  J('mine', 'Diamond Mine', 1, 5, ['gem', '#7a4220', '#2e170a', '#ff8a5c'], 'Played {s|d} cards give {m|+3} Mult when scored', { card: suitCard('d', { mult: 3 }) });
  J('owl', 'Night Owl', 1, 5, ['owl', '#22306a', '#0b1130', '#8fb4ff'], 'Played {s|s} cards give {m|+3} Mult when scored', { card: suitCard('s', { mult: 3 }) });
  J('clover', 'Four-Leaf', 1, 5, ['clover', '#1f5c4a', '#0b2e24', '#5fe08f'], 'Played {s|c} cards give {m|+3} Mult when scored', { card: suitCard('c', { mult: 3 }) });
  J('socks', 'Pair of Socks', 1, 3, ['sock', '#b5476b', '#5c1a33', '#ffd166'], '{m|+8} Mult if the hand contains a {a|Pair}', { main: cont('pair', { mult: 8 }) });
  J('scoop', 'Triple Scoop', 1, 4, ['scoop', '#c26a8a', '#5e2440', '#e8a85a'], '{m|+12} Mult if the hand contains {a|Three of a Kind}', { main: cont('three', { mult: 12 }) });
  J('twostep', 'Two-Step', 1, 4, ['steps', '#3a6fb0', '#18325c', '#ffd166'], '{m|+10} Mult if the hand contains {a|Two Pair}', { main: cont('two', { mult: 10 }) });
  J('ladder', 'Step Ladder', 1, 4, ['ladder', '#8a5a2b', '#3d2410', '#ffcf4a'], '{m|+12} Mult if the hand contains a {a|Straight}', { main: cont('straight', { mult: 12 }) });
  J('bucket', 'Paint Bucket', 1, 4, ['bucket', '#2b7a8a', '#0f3540', '#ff7ac0'], '{m|+10} Mult if the hand contains a {a|Flush}', { main: cont('flush', { mult: 10 }) });
  J('mittens', 'Matching Mittens', 1, 3, ['mitten', '#2f5fa8', '#132a52', '#ff6b6b'], '{c|+50} Chips if the hand contains a {a|Pair}', { main: cont('pair', { chips: 50 }) });
  J('stack', 'Tall Stack', 1, 4, ['stack', '#256b4a', '#0d3322', '#ff5c5c'], '{c|+100} Chips if the hand contains {a|Three of a Kind}', { main: cont('three', { chips: 100 }) });
  J('bookends', 'Bookends', 1, 4, ['books', '#6b3a2b', '#2e1710', '#ffcf7a'], '{c|+80} Chips if the hand contains {a|Two Pair}', { main: cont('two', { chips: 80 }) });
  J('bridge', 'Rope Bridge', 1, 4, ['bridge', '#4a6b2b', '#1e2e0f', '#e8b06a'], '{c|+100} Chips if the hand contains a {a|Straight}', { main: cont('straight', { chips: 100 }) });
  J('wheel', 'Color Wheel', 1, 4, ['wheel', '#3b3b6b', '#16162e', '#ffffff'], '{c|+80} Chips if the hand contains a {a|Flush}', { main: cont('flush', { chips: 80 }) });
  J('light', 'Light Touch', 1, 5, ['feather', '#5a7a9a', '#22344a', '#ffe08a'], '{m|+20} Mult if you play {a|3} or fewer cards', { main: function (v, x) { return x.n <= 3 ? { mult: 20 } : null; } });
  J('gallery', 'Portrait Gallery', 1, 4, ['frame', '#7a2b3a', '#33101a', '#ffcf4a'], 'Played face cards give {c|+30} Chips when scored', { card: function (v, c, x) { return isFace(c, x.opt) ? { chips: 30 } : null; } });
  J('hole', 'Ace in the Hole', 1, 4, ['ace', '#2b2b4a', '#0e0e1f', '#ff5c7a'], 'Played {a|Aces} give {c|+20} Chips and {m|+4} Mult when scored', { card: function (v, c) { return !isStone(c) && c.r === 'A' ? { chips: 20, mult: 4 } : null; } });
  J('duck', 'Odd Duck', 1, 4, ['duck', '#2f7a9a', '#103a4d', '#ffb020'], 'Played {a|A, 9, 7, 5, 3} give {c|+31} Chips when scored', { card: function (v, c) { return /^(A|9|7|5|3)$/.test(c.r) && !isStone(c) ? { chips: 31 } : null; } });
  J('keel', 'Even Keel', 1, 4, ['boat', '#245a8a', '#0c2540', '#ff6b6b'], 'Played {a|10, 8, 6, 4, 2} give {m|+4} Mult when scored', { card: function (v, c) { return /^(10|8|6|4|2)$/.test(c.r) && !isStone(c) ? { mult: 4 } : null; } });
  J('fry', 'Small Fry', 1, 4, ['fish', '#1f6f9a', '#0a2f45', '#ffb347'], 'Played {a|10s and 4s} give {c|+10} Chips and {m|+4} Mult when scored', { card: function (v, c) { return (c.r === '10' || c.r === '4') && !isStone(c) ? { chips: 10, mult: 4 } : null; } });
  J('patience', 'Patience', 1, 5, ['hourglass', '#7a5a3a', '#33240f', '#ffd27a'], '{c|+30} Chips for each discard you have left', { main: function (v, x) { return x.disc > 0 ? { chips: 30 * x.disc } : null; } });
  J('rope', 'Tightrope', 1, 5, ['rope', '#5a2b6b', '#240f2e', '#ffcf4a'], '{m|+15} Mult when you have {a|0} discards left', { main: function (v, x) { return x.disc === 0 ? { mult: 15 } : null; } });
  J('piggy', 'Piggy Bank', 1, 6, ['pig', '#c2668a', '#5c2440', '#ffd1e0'], 'Earn {o|$4} at the end of each round', { end: function () { return 4; } });
  J('penny', 'Lucky Penny', 1, 4, ['coin', '#5a3a1a', '#24160a', '#e0913a'], 'Played face cards have a {p|1 in 2} chance to give {o|$2} when scored', { card: function (v, c, x) { return isFace(c, x.opt) && x.chance(1, 2) ? { money: 2 } : null; } });
  J('cookie', 'Fortune Cookie', 1, 4, ['cookie', '#8a3a2a', '#3a140c', '#ffcf7a'], 'A surprise {m|+0 to +23} Mult every hand', { main: function (v, x) { return { mult: x.live ? Math.floor(x.rnd() * 24) : 0, rand: true }; } });
  J('bird', 'Early Bird', 1, 5, ['bird', '#e07a3a', '#7a2e10', '#fff1a8'], '{m|+15} Mult on the {a|first} hand of each round', { main: function (v, x) { return x.first ? { mult: 15 } : null; } });
  J('well', 'Deep Well', 1, 5, ['well', '#2b4a6b', '#0f1e2e', '#7ac0ff'], '{c|+2} Chips for each card left in your deck', { main: function (v, x) { return x.deckLeft > 0 ? { chips: 2 * x.deckLeft } : null; } });
  J('goose', 'Golden Goose', 1, 4, ['egg', '#3a6b5a', '#13302a', '#ffcf4a'], 'Earn {o|$2} per discard left at the end of the round, if you used no discards', { end: function () { return S.discUsed ? 0 : 2 * S.discards; } });
  J('egg', 'Nest Egg', 1, 4, ['nest', '#7a6a3a', '#2e2810', '#fff1c8'], 'Gains {o|$3} of sell value at the end of each round', { val: function (v) { return '$' + (v.sv || 0); }, cur: function (v) { return 'Sells for ' + (v.sv || 0) + ' more'; }, endRound: function (v) { v.sv = (v.sv || 0) + 3; } });
  J('popcorn', 'Popcorn', 1, 5, ['popcorn', '#c23a3a', '#5c1414', '#fff6d0'], '{m|+20} Mult, {m|-4} Mult at the end of each round', { init: function () { return { m: 20 }; }, val: function (v) { return '+' + v.m; },
    main: function (v) { return { mult: v.m }; }, endRound: function (v) { v.m -= 4; if (v.m <= 0) return { gone: 'Popcorn is all eaten' }; } });
  J('snowcone', 'Snow Cone', 1, 5, ['cone', '#5ab0e0', '#1e4a6b', '#ffffff'], '{c|+100} Chips, {c|-5} Chips for every hand played', { init: function () { return { c: 100 }; }, val: function (v) { return '+' + v.c; },
    main: function (v) { return { chips: v.c }; }, after: function (v) { v.c -= 5; if (v.c <= 0) return { gone: 'Snow Cone melted' }; } });
  J('ring', 'Ringleader', 1, 4, ['hat', '#8a1f3a', '#3a0816', '#ffcf4a'], '{m|+3} Mult for each Joker you have', { main: function (v, x) { return { mult: 3 * x.nJ }; } });
  J('fist', 'Iron Fist', 1, 5, ['fist', '#6b4a3a', '#2e1e14', '#ffb070'], 'Adds {a|double} the rank of the lowest card held in hand to Mult', { fist: true });
  J('melon', 'Overripe Melon', 1, 5, ['melon', '#3a8a3a', '#14361a', '#ff6b7a'], '{m|+15} Mult. {p|1 in 6} chance it spoils at the end of the round', { main: function () { return { mult: 15 }; },
    endRound: function (v, x) { if (x.chance(1, 6)) return { gone: 'Overripe Melon spoiled' }; } });
  J('crowd', 'Crowd Favorite', 1, 5, ['star', '#5a2b8a', '#22103a', '#ffd84a'], 'Adds the number of times this poker hand has been played this run to Mult', { main: function (v, x) { return { mult: x.playsRun }; } });
  J('commuter', 'Commuter', 1, 6, ['bus', '#c28a1f', '#5c3a0a', '#fff1a8'], 'Gains {m|+1} Mult per hand in a row with no scoring face card', { val: function (v) { return '+' + (v.m || 0); },
    before: function (v, x) { if (x.scoring.some(function (c) { return isFace(c, x.opt); })) { var had = v.m; v.m = 0; return had ? { msg: 'Reset' } : null; } v.m = (v.m || 0) + 1; return { msg: 'Upgrade' }; }, main: function (v) { return v.m ? { mult: v.m } : null; } });
  J('sprout', 'Sprout', 1, 4, ['sprout', '#2f8a3a', '#0f3a14', '#b6ff5c'], '{m|+1} Mult per hand played, {m|-1} Mult per discard', { val: function (v) { return '+' + (v.m || 0); },
    before: function (v) { v.m = (v.m || 0) + 1; return { msg: '+1' }; }, main: function (v) { return v.m ? { mult: v.m } : null; }, disc: function (v) { v.m = Math.max(0, (v.m || 0) - 1); } });
  J('credit', 'Store Credit', 1, 1, ['card2', '#2b5a8a', '#0e2440', '#ffd84a'], 'You can go up to {o|-$20} into debt', { debt: 20 });
  J('juggler', 'Juggler', 1, 4, ['juggle', '#c23a6b', '#4a0f26', '#7ad0ff'], '{a|+1} hand size', { hs: 1 });
  J('nightcap', 'Night Cap', 1, 4, ['nightcap', '#2b2b6b', '#0e0e2e', '#ffd84a'], '{a|+1} discard each round', { discs: 1 });
  J('freeroll', 'Free Roll', 1, 4, ['dice', '#b5232f', '#4a0a10', '#ffffff'], '{a|1} free reroll in every shop', { freeRR: 1 });
  J('square', 'Square Dance', 1, 4, ['square', '#2b6b6b', '#0e2e2e', '#ffcf4a'], 'Gains {c|+4} Chips when you play exactly {a|4} cards', { val: function (v) { return '+' + (v.c || 0); },
    before: function (v, x) { if (x.n === 4) { v.c = (v.c || 0) + 4; return { msg: 'Upgrade' }; } }, main: function (v) { return v.c ? { chips: v.c } : null; } });
  J('sprinter', 'Sprinter', 1, 5, ['shoe', '#2b6bb0', '#0e2a4a', '#ffe08a'], 'Gains {c|+15} Chips when the hand contains a {a|Straight}', { val: function (v) { return '+' + (v.c || 0); },
    before: function (v, x) { if (x.has.straight) { v.c = (v.c || 0) + 15; return { msg: 'Upgrade' }; } }, main: function (v) { return v.c ? { chips: v.c } : null; } });
  J('guard', "Queen's Guard", 1, 5, ['shield', '#5a2b8a', '#220f3a', '#ff5c7a'], 'Each {a|Queen} held in hand gives {m|+13} Mult', { held: function (v, c) { return !isStone(c) && c.r === 'Q' ? { mult: 13 } : null; } });
  J('spot', 'Spotlight', 1, 3, ['spot', '#3a1f5a', '#140826', '#ffcf4a'], 'Every card you play counts in scoring', { splash: true });
  J('echo', 'Echo', 1, 4, ['echo', '#3a2b7a', '#140a33', '#ff9de0'], 'The first scored card triggers {a|2} more times', { retrig: function (v, c, x, i) { return i === 0 ? 2 : 0; } });
  J('eight', 'Magic Eight', 1, 5, ['eightball', '#1a1a2a', '#05050e', '#7ac0ff'], 'Each scored {a|8} has a {p|1 in 4} chance to make a Tarot card', { card: function (v, c, x) { return c.r === '8' && !isStone(c) && x.chance(1, 4) ? { make: 'tarot' } : null; } });
  J('tealeaves', 'Tea Leaves', 1, 6, ['cup', '#6b3a5a', '#2a1022', '#ffd1e0'], '{m|+1} Mult for each Tarot card used this run', { main: function () { return S.stats.tarots ? { mult: S.stats.tarots } : null; }, cur: function () { return 'Now +' + S.stats.tarots + ' Mult'; } });
  J('rabble', 'Rabble', 1, 6, ['crowd', '#7a5a2b', '#2e200a', '#ffcf7a'], 'When a blind starts, makes {a|2} Common Jokers (if you have room)', { sel: function () { var m = 0; for (var i = 0; i < 2; i++) if (jokerRoom()) { addJoker(jokerKey(1)); m++; } return m ? { msg: '+' + m + ' Joker' + (m > 1 ? 's' : '') } : null; } });
  J('ticket', 'Gilded Ticket', 1, 5, ['ticket', '#8a6a1a', '#3a2a08', '#fff1a8'], 'Played {a|Gold} cards earn {o|$4} when scored', { card: function (v, c) { return c.e === 'gold' ? { money: 4 } : null; } });
  J('pawn', 'Pawn Shop', 1, 4, ['scale', '#5a5a2b', '#24240e', '#ffd84a'], 'Adds the sell value of your other Jokers to Mult', { main: function (v, x) { var t = 0; S.jokers.forEach(function (j) { if (j.u !== x.self) t += sellValue(j); }); return t ? { mult: t } : null; } });
