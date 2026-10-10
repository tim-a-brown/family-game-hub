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
  JK.fist.main = function (v, x) {
    var lo = null; x.held.forEach(function (c) { if (!isStone(c) && !x.deb(c) && (!lo || RV[c.r] < RV[lo.r])) lo = c; });
    return lo ? { mult: 2 * chipsOf(lo) } : null;
  };

  // Uncommon
  J('worm', 'Glow Worm', 2, 6, ['worm', '#1a3a2a', '#07160f', '#b6ff5c'], 'Gains {c|+3} Chips for every card you discard', { val: function (v) { return '+' + (v.c || 0); },
    disc: function (v, cards) { v.c = (v.c || 0) + 3 * cards.length; return { msg: 'Upgrade' }; }, main: function (v) { return v.c ? { chips: v.c } : null; } });
  J('wallet', 'Fat Wallet', 2, 6, ['wallet', '#6b4a2b', '#2e1d0e', '#ffcf4a'], '{c|+2} Chips for every {o|$1} you have', { main: function (v, x) { return x.money > 0 ? { chips: 2 * x.money } : null; } });
  J('shoestring', 'Shoestring', 2, 5, ['boot', '#6b3a1f', '#2a1508', '#ffd27a'], '{m|+2} Mult for every {o|$5} you have', { main: function (v, x) { var n = Math.floor(Math.max(0, x.money) / 5); return n ? { mult: 2 * n } : null; } });
  J('recycler', 'Recycler', 2, 5, ['recycle', '#2b6b4a', '#0e2e1e', '#9cff8a'], 'Gains {m|+2} Mult every time you discard', { val: function (v) { return '+' + (v.m || 0); },
    disc: function (v) { v.m = (v.m || 0) + 2; return { msg: 'Upgrade' }; }, main: function (v) { return v.m ? { mult: v.m } : null; } });
  J('backbeat', 'Backbeat', 2, 6, ['note', '#2b4a7a', '#0e1a33', '#ff6bb0'], 'Every scored {a|2, 3, 4 and 5} triggers {a|1} more time', { retrig: function (v, c) { var r = rankOf(c); return r >= 2 && r <= 5 ? 1 : 0; } });
  J('encore', 'Encore', 2, 6, ['mask', '#7a1f4a', '#30081c', '#ffcf4a'], 'Every scored {a|face card} triggers {a|1} more time', { retrig: function (v, c, x) { return isFace(c, x.opt) ? 1 : 0; } });
  J('lastcall', 'Last Call', 2, 5, ['clock', '#2b5a6b', '#0e252e', '#ff8a3d'], 'On the {a|final hand} of the round, every scored card triggers {a|1} more time', { retrig: function (v, c, x) { return x.last ? 1 : 0; } });
  J('mime', 'Pantomime', 2, 5, ['mime', '#e0e0f0', '#5a5a7a', '#1a1a2a'], 'Cards held in hand trigger their effects {a|1} more time', { retrigHeld: function () { return 1; } });
  J('finale', 'Grand Finale', 2, 6, ['curtain', '#5a0f2e', '#22040f', '#d81e4a'], '{x|x3} Mult on the {a|final hand} of the round', { main: function (v, x) { return x.last ? { x: 3 } : null; } });
  J('shark', 'Card Shark', 2, 6, ['fin', '#1f4a7a', '#081c33', '#5fe0ff'], '{x|x3} Mult if this poker hand was already played this round', { main: function (v, x) { return x.playedRound ? { x: 3 } : null; } });
  J('stargazer', 'Stargazer', 2, 6, ['scope', '#24206b', '#0a0826', '#ffd84a'], 'Gains {x|x0.1} Mult for every Planet card you use', { init: function () { return { x: 1 }; }, val: function (v) { return 'x' + fx(v.x); },
    on: { planet: function (v) { v.x += 0.1; return 'x' + fx(v.x); } }, main: function (v) { return v.x > 1 ? { x: v.x } : null; } });
  J('cat', 'Black Cat', 2, 6, ['cat', '#7a5aa8', '#3a2560', '#ffd84a'], '{x|x3} Mult. {p|1 in 6} chance it wanders off at the end of the round', { main: function () { return { x: 3 }; },
    endRound: function (v, x) { if (x.chance(1, 6)) return { gone: 'The Black Cat wandered off' }; } });
  J('wolf', 'Lone Wolf', 2, 5, ['wolf', '#3a4a7a', '#141a33', '#ffcf4a'], '{x|x3} Mult if you play exactly {a|1} card', { main: function (v, x) { return x.n === 1 ? { x: 3 } : null; } });
  J('bouquet', 'Flower Pot', 2, 6, ['bouquet', '#2f6b3a', '#123018', '#ff7ac0'], '{x|x3} Mult if the scoring cards include a {s|d} {s|c} {s|h} and {s|s}', { main: function (v, x) {
    var need = ['d', 'c', 'h', 's'], used = [], wild = 0;
    x.scoring.forEach(function (c) { if (isStone(c) || x.deb(c)) return; if (c.e === 'wild') { wild++; return; } for (var i = 0; i < need.length; i++) if (used.indexOf(need[i]) < 0 && suitIs(c, need[i], x.opt)) { used.push(need[i]); break; } });
    return used.length + wild >= 4 ? { x: 3 } : null; } });
  J('midas', 'Midas', 2, 7, ['hand', '#7a5a1a', '#33240a', '#ffd84a'], 'Played face cards turn into {o|Gold} cards when scored', { before: function (v, x) {
    var n = 0; x.scoring.forEach(function (c) { if (isFace(c, x.opt) && !x.deb(c) && c.e !== 'gold') { if (x.live) S.cards[c.id].e = 'gold'; c.e = 'gold'; n++; } }); return n ? { msg: 'Gold!' } : null; } });
  J('corner', 'Corner Cutter', 2, 7, ['corner', '#2b6b6b', '#0e2e2e', '#ff8a5c'], 'Flushes and Straights need only {a|4} cards', { four: true });
  J('hopskip', 'Hop Skip', 2, 7, ['hop', '#8a2b6b', '#33102a', '#7ae0ff'], 'Straights may skip {a|1} rank (like 3 5 7 9 10)', { shortcut: true });
  J('masque', 'Masquerade', 2, 5, ['masque', '#3a1f6b', '#14082e', '#ff9de0'], 'Every card counts as a {a|face card}', { allFace: true });
  J('inkblot', 'Ink Blot', 2, 7, ['ink', '#2b2b4a', '#0e0e1f', '#ff5c7a'], '{s|h} and {s|d} count as the same suit, so do {s|s} and {s|c}', { smeared: true });
  J('chalk', 'Chalkboard', 2, 6, ['chalk', '#1f3a2b', '#0a1a12', '#e8f0e0'], '{x|x3} Mult if every card held in hand is a {s|s} or {s|c}', { main: function (v, x) {
    return x.held.every(function (c) { return suitIs(c, 's', x.opt) || suitIs(c, 'c', x.opt); }) ? { x: 3 } : null; } });
  J('ironwill', 'Iron Will', 2, 7, ['iron', '#56616e', '#1e2228', '#e0e8f0'], '{x|x0.2} Mult for every {a|Steel} card in your full deck', { main: function () { var n = S.deck.filter(function (id) { return C(id).e === 'steel'; }).length; return n ? { x: 1 + 0.2 * n } : null; },
    cur: function () { return 'Now x' + fx(1 + 0.2 * S.deck.filter(function (id) { return C(id).e === 'steel'; }).length) + ' Mult'; } });
  J('shards', 'Shard Collector', 2, 6, ['glass', '#4a6b8a', '#1a2a3a', '#bfe8ff'], 'Gains {x|x0.75} Mult every time a {a|Glass} card breaks', { init: function () { return { x: 1 }; }, val: function (v) { return 'x' + fx(v.x); },
    on: { shard: function (v) { v.x += 0.75; return 'x' + fx(v.x); } }, main: function (v) { return v.x > 1 ? { x: v.x } : null; } });
  J('flipbook', 'Flip Book', 2, 5, ['flipbook', '#8a3a1f', '#3a1508', '#ffe08a'], 'Gains {m|+2} Mult every time you reroll the shop', { val: function (v) { return '+' + (v.m || 0); },
    on: { reroll: function (v) { v.m = (v.m || 0) + 2; return '+' + v.m; } }, main: function (v) { return v.m ? { mult: v.m } : null; } });
  J('photocopy', 'Photocopy', 2, 7, ['copy2', '#3a5a7a', '#14243a', '#ffffff'], 'Gains {x|x0.25} Mult every time a playing card is added to your deck', { init: function () { return { x: 1 }; }, val: function (v) { return 'x' + fx(v.x); },
    on: { addCard: function (v) { v.x += 0.25; return 'x' + fx(v.x); } }, main: function (v) { return v.x > 1 ? { x: v.x } : null; } });
  J('teller', 'Fortune Teller', 2, 6, ['crystal', '#4a2b7a', '#1a0a33', '#c8a8ff'], 'When a blind starts, makes a {a|Tarot} card (if you have room)', { sel: function () { if (consRoom()) { addCons(consKey('tarot')); return { msg: '+1 Tarot' }; } } });
  J('ruby', 'Ruby Heart', 2, 7, ['ruby', '#8a1f2a', '#3a0810', '#ff9daa'], 'Played {s|h} cards have a {p|1 in 2} chance to give {x|x1.5} Mult when scored', { card: function (v, c, x) { return suitIs(c, 'h', x.opt) && x.chance(1, 2) ? { x: 1.5 } : null; } });
  J('spear', 'Spearhead', 2, 7, ['spear', '#2b3a5a', '#0e1424', '#bfd4ff'], 'Played {s|s} cards give {c|+50} Chips when scored', { card: suitCard('s', { chips: 50 }) });
  J('pearl', 'Black Pearl', 2, 7, ['pearl', '#1f1f2b', '#08080e', '#e0e8ff'], 'Played {s|c} cards give {m|+7} Mult when scored', { card: suitCard('c', { mult: 7 }) });
  J('topaz', 'Raw Topaz', 2, 7, ['topaz', '#8a5a1a', '#3a2208', '#ffd27a'], 'Played {s|d} cards earn {o|$1} when scored', { card: suitCard('d', { money: 1 }) });
  J('hiker', "Hiker's Boots", 2, 5, ['mountain', '#4a5a3a', '#1a2414', '#e8f0d0'], 'Every scored card gains {c|+5} Chips for good', { card: function (v, c, x) { if (x.live && S.cards[c.id]) S.cards[c.id].bc = (S.cards[c.id].bc || 0) + 5; return { note: 'Upgrade', perm: 5 }; } });
  J('leech', 'Leech', 2, 7, ['fang', '#5a0f1f', '#22040a', '#ff9daa'], 'Gains {x|x0.1} Mult for every enhanced card scored, and removes the enhancement', { init: function () { return { x: 1 }; }, val: function (v) { return 'x' + fx(v.x); },
    before: function (v, x) { var n = 0; x.scoring.forEach(function (c) { if (c.e && c.e !== 'stone' && !x.deb(c)) { n++; if (x.live && S.cards[c.id]) S.cards[c.id].e = null; c.e = null; } }); if (n) { v.x += 0.1 * n; return { msg: 'x' + fx(v.x) }; } },
    main: function (v) { return v.x > 1 ? { x: v.x } : null; } });
  J('pickpocket', 'Pickpocket', 2, 6, ['glove', '#3a3a4a', '#121218', '#ffcf4a'], 'When a blind starts, gain {a|+3} hands and lose all discards', { sel: function () { S.hands += 3; S.discards = 0; return { msg: '+3 Hands' }; } });
  J('bones', 'Lucky Bones', 2, 5, ['skull', '#d8d0c0', '#5a5040', '#2a2014'], 'Saves the run if you scored at least {a|25%} of the target, then breaks');
  J('satellite', 'Satellite Dish', 2, 5, ['dish', '#2b3a6b', '#0a1028', '#c8d8ff'], '{p|1 in 4} chance to level up the poker hand you play', { before: function (v, x) { if (x.chance(1, 4)) { if (x.live) levelUp(x.hand, 1); return { msg: 'Level up!', lvl: 1 }; } } });
  J('punch', 'Punch Card', 2, 5, ['punch', '#d8c8a0', '#6b5a3a', '#3a2a14'], '{x|x4} Mult every {a|6} hands played', { val: function (v) { var n = 5 - ((v.n || 0) % 6); return n ? n + ' left' : 'Ready'; },
    main: function (v) { return ((v.n || 0) % 6) === 5 ? { x: 4 } : null; }, after: function (v) { v.n = (v.n || 0) + 1; } });
  J('noodles', 'Noodle Bowl', 2, 6, ['bowl', '#c28a3a', '#5a3a14', '#fff1c8'], '{x|x2} Mult, loses {x|x0.01} for every card discarded', { init: function () { return { x: 2 }; }, val: function (v) { return 'x' + fx(v.x); },
    disc: function (v, cards) { v.x = Math.round((v.x - 0.01 * cards.length) * 100) / 100; if (v.x <= 1) return { gone: 'Noodle Bowl is empty' }; }, main: function (v) { return { x: v.x }; } });
  J('horseshoe', 'Horseshoe', 2, 6, ['horseshoe', '#5a3a1f', '#22140a', '#e0e8f0'], 'Gains {x|x0.25} Mult every time a {a|Lucky} card pays out', { init: function () { return { x: 1 }; }, val: function (v) { return 'x' + fx(v.x); },
    on: { lucky: function (v) { v.x += 0.25; return 'x' + fx(v.x); } }, main: function (v) { return v.x > 1 ? { x: v.x } : null; } });
  J('dice', 'Loaded Dice', 2, 7, ['dice2', '#e0e0f0', '#6b6b8a', '#c81e36'], 'Doubles every listed chance (1 in 4 becomes 2 in 4)', { dice: true });
  J('double', 'Double Vision', 2, 6, ['eyes', '#2b5a3a', '#0e2414', '#e0ffe8'], '{x|x2} Mult if the scoring cards have a {s|c} and a card of another suit', { main: function (v, x) {
    var cl = false, other = false; x.scoring.forEach(function (c) { if (isStone(c) || x.deb(c)) return; if (suitIs(c, 'c', x.opt) && !cl) cl = true; else if (!suitIs(c, 'c', x.opt) || c.e === 'wild') other = true; });
    return cl && other ? { x: 2 } : null; } });
  J('frame', 'Empty Frame', 2, 8, ['frame2', '#6b5a3a', '#2a2214', '#ffe8a8'], '{x|x1} Mult for each empty Joker slot (this one counts as empty)', { main: function (v, x) { var e = x.jslots - x.nJ + 1; return e > 1 ? { x: e } : null; } });
  J('spiral', 'Spiral Shell', 2, 8, ['shell', '#c27a5a', '#5a2a1a', '#fff1e0'], 'Played {a|A, 2, 3, 5 and 8} give {m|+8} Mult when scored', { card: function (v, c) { return /^(A|2|3|5|8)$/.test(c.r) && !isStone(c) ? { mult: 8 } : null; } });
  J('moonshot', 'Moon Shot', 2, 5, ['moon', '#232a5c', '#0a0d26', '#9aa7d8'], 'Earn an extra {o|$1} of interest for every {o|$5} you have', { moon: 1 });
  J('sandstone', 'Sandstone', 2, 6, ['sand', '#c2a05a', '#5a4214', '#fff1c8'], '{m|+4} Mult for each card your deck has below 52', { main: function () { var n = 52 - S.deck.length; return n > 0 ? { mult: 4 * n } : null; } });
  J('mirrorball', 'Mirror Ball', 2, 6, ['disco', '#2a1a4a', '#0a0618', '#ff9de0'], 'Every scored card triggers {a|1} more time, for the next {a|10} hands', { init: function () { return { n: 10 }; }, val: function (v) { return v.n + ' left'; },
    retrig: function () { return 1; }, after: function (v) { v.n--; if (v.n <= 0) return { gone: 'Mirror Ball went dark' }; } });
  J('rocket', 'Rocket', 2, 6, ['rocket', '#2b3a7a', '#0e1433', '#ff7a3d'], 'Earn {o|$1} at the end of each round. Pays {o|$2} more after every Boss Blind', { init: function () { return { p: 1 }; }, val: function (v) { return '$' + v.p; },
    end: function (v) { return v.p; }, boss: function (v) { v.p += 2; } });

  // Rare
  J('date', 'Double Date', 3, 8, ['hearts2', '#a8325a', '#4a0f26', '#ff9dc0'], '{x|x2} Mult if the hand contains a {a|Pair}', { main: cont('pair', { x: 2 }) });
  J('trident', 'Trident', 3, 8, ['trident', '#1f5a7a', '#081e2e', '#ffd84a'], '{x|x3} Mult if the hand contains {a|Three of a Kind}', { main: cont('three', { x: 3 }) });
  J('table', 'Family Table', 3, 8, ['table', '#7a4a1f', '#2e1a08', '#ffcf7a'], '{x|x4} Mult if the hand contains {a|Four of a Kind}', { main: cont('four', { x: 4 }) });
  J('zigzag', 'Zigzag', 3, 8, ['bolt', '#2b2b5a', '#0e0e26', '#ffd84a'], '{x|x3} Mult if the hand contains a {a|Straight}', { main: cont('straight', { x: 3 }) });
  J('prism', 'Prism', 3, 8, ['prism', '#1f1f3a', '#08081a', '#ffffff'], '{x|x2} Mult if the hand contains a {a|Flush}', { main: cont('flush', { x: 2 }) });
  J('throne', 'Throne Room', 3, 8, ['throne', '#7a1f2a', '#2e0810', '#ffd56a'], 'Each {a|King} held in hand gives {x|x1.5} Mult', { held: function (v, c) { return !isStone(c) && c.r === 'K' ? { x: 1.5 } : null; } });
  J('copy', 'Copycat', 3, 10, ['copy', '#4a4a5a', '#1a1a24', '#ffcf4a'], 'Copies what the Joker to its {a|right} does', { copy: 'right' });
  J('mirror', 'Mirror Image', 3, 10, ['mirror', '#3a4a6b', '#141a2a', '#bfe0ff'], 'Copies what your {a|leftmost} Joker does', { copy: 'left' });
  J('wish', 'Wishing Well', 3, 8, ['wish', '#1f3a6b', '#08142e', '#ffd84a'], 'Gains {x|x0.5} Mult every time you beat a Boss Blind', { init: function () { return { x: 1 }; }, val: function (v) { return 'x' + fx(v.x); },
    main: function (v) { return v.x > 1 ? { x: v.x } : null; }, boss: function (v) { v.x += 0.5; } });
  J('clone', 'Clone Kit', 3, 8, ['dna', '#2b6b5a', '#0e2a24', '#9cffd8'], 'If the first hand of a round is a {a|single card}, adds a copy of it to your deck and hand', { before: function (v, x) {
    if (x.first && x.n === 1) { if (x.live) { var o = x.played[0], c = newCard(o.r, o.s, { e: o.e, ed: o.ed, sl: o.sl }); addToDeck(c); S.hand.push(c.id); S.fresh = (S.fresh || []).concat([c.id]); } return { msg: 'Copied!' }; } } });
  J('drifter', 'Drifter', 3, 8, ['bindle', '#6b4a2b', '#2a1a0a', '#ffd27a'], 'Makes a {a|Tarot} card if you play a hand with {o|$4} or less', { main: function (v, x) { return x.money <= 4 ? { make: 'tarot' } : null; } });

  // Legendary (only from the Heartstone spectral card)
  J('king', 'The Jester King', 4, 20, ['crown', '#5a1f7a', '#1e0830', '#ffd84a'], 'Played {a|Kings} and {a|Queens} each give {x|x2} Mult when scored', { card: function (v, c) { return !isStone(c) && (c.r === 'K' || c.r === 'Q') ? { x: 2 } : null; } });
  J('silencer', 'The Silencer', 4, 20, ['hush', '#3a3a4a', '#0e0e18', '#ff5c7a'], 'Turns off every Boss Blind', { silence: true });
  J('duplicator', 'The Duplicator', 4, 20, ['twins', '#1f5a6b', '#081e26', '#ffffff'], 'When you leave the shop, makes a {a|Negative} copy of 1 random consumable you hold', {});
  J('archivist', 'The Archivist', 4, 20, ['book', '#6b2b1f', '#2a0e08', '#ffd27a'], 'Gains {x|x1} Mult every time a face card is destroyed', { init: function () { return { x: 1 }; }, val: function (v) { return 'x' + fx(v.x); },
    on: { faceGone: function (v) { v.x += 1; return 'x' + fx(v.x); } }, main: function (v) { return v.x > 1 ? { x: v.x } : null; } });
  J('glutton', 'The Glutton', 4, 20, ['maw', '#3a5a1f', '#142208', '#e0ff9c'], 'Gains {x|x1} Mult for every {a|23} cards discarded', { init: function () { return { x: 1, n: 0 }; }, val: function (v) { return 'x' + fx(v.x); },
    disc: function (v, cards) { v.n += cards.length; var x = 1 + Math.floor(v.n / 23); if (x !== v.x) { v.x = x; return { msg: 'x' + v.x }; } }, main: function (v) { return v.x > 1 ? { x: v.x } : null; } });
  var RARITY = ['', 'Common', 'Uncommon', 'Rare', 'Legendary'];
  function fx(x) { return String(Math.round(x * 100) / 100); }

  // ═══ Consumables: Tarot, Planet and Spectral cards (2 slots) ═════════════
  // sel: [min, max] cards you must select first (from your hand or the pack's hand)
  var CONS = {};
  function T(k, t, n, d, o) { o = o || {}; o.t = t; o.n = n; o.d = d; CONS[k] = o; }
  function enh(e) { return function (ids) { ids.forEach(function (id) { C(id).e = e; }); }; }
  function toSuit(s) { return function (ids) { ids.forEach(function (id) { C(id).s = s; if (C(id).e === 'stone') C(id).e = null; }); }; }
  function sealIt(sl) { return function (ids) { C(ids[0]).sl = sl; }; }
  function curHand() { return S.phase === 'pack' && S.pack && S.pack.hand ? S.pack.hand : S.hand; }
  function randEnh() { return pick(['bonus', 'mult', 'wild', 'glass', 'steel', 'gold', 'lucky']); }
  function destroyRandomInHand(n) {
    var h = curHand().slice(); shuffle(h);
    var gone = h.slice(0, n);
    gone.forEach(destroyCard);
    if (S.pack && S.pack.hand) S.pack.hand = S.pack.hand.filter(function (id) { return gone.indexOf(id) < 0; });
    return gone;
  }
  function giveCards(list) { var h = curHand(); list.forEach(function (c) { addToDeck(c); h.push(c.id); }); S.fresh = (S.fresh || []).concat(list.map(function (c) { return c.id; })); }

  T('t_repeat', 'tarot', 'The Repeat', 'Makes a copy of the last {a|Tarot} or {a|Planet} card you used (not The Repeat)', { can: function () { return !!S.lastCons && S.lastCons !== 't_repeat'; }, room: 1, use: function () { addCons(S.lastCons); return CONS[S.lastCons].n; } });
  T('t_gambler', 'tarot', 'The Gambler', 'Up to {a|2} selected cards become {a|Lucky} cards', { sel: [1, 2], use: enh('lucky'), e: 'lucky' });
  T('t_furnace', 'tarot', 'The Furnace', 'Up to {a|2} selected cards become {a|Mult} cards', { sel: [1, 2], use: enh('mult'), e: 'mult' });
  T('t_anvil', 'tarot', 'The Anvil', 'Up to {a|2} selected cards become {a|Bonus} cards', { sel: [1, 2], use: enh('bonus'), e: 'bonus' });
  T('t_mimic', 'tarot', 'The Mimic', '{a|1} selected card becomes a {a|Wild} card', { sel: [1, 1], use: enh('wild'), e: 'wild' });
  T('t_knight', 'tarot', 'The Knight', '{a|1} selected card becomes a {a|Steel} card', { sel: [1, 1], use: enh('steel'), e: 'steel' });
  T('t_glass', 'tarot', 'The Looking Glass', '{a|1} selected card becomes a {a|Glass} card', { sel: [1, 1], use: enh('glass'), e: 'glass' });
  T('t_miser', 'tarot', 'The Miser', '{a|1} selected card becomes a {a|Gold} card', { sel: [1, 1], use: enh('gold'), e: 'gold' });
  T('t_quarry', 'tarot', 'The Quarry', '{a|1} selected card becomes a {a|Stone} card', { sel: [1, 1], use: enh('stone'), e: 'stone' });
  T('t_rose', 'tarot', 'The Rose', 'Up to {a|3} selected cards become {s|h}', { sel: [1, 3], use: toSuit('h'), suit: 'h' });
  T('t_raven', 'tarot', 'The Raven', 'Up to {a|3} selected cards become {s|s}', { sel: [1, 3], use: toSuit('s'), suit: 's' });
  T('t_oak', 'tarot', 'The Oak', 'Up to {a|3} selected cards become {s|c}', { sel: [1, 3], use: toSuit('c'), suit: 'c' });
  T('t_lantern', 'tarot', 'The Lantern', 'Up to {a|3} selected cards become {s|d}', { sel: [1, 3], use: toSuit('d'), suit: 'd' });
  T('t_climb', 'tarot', 'The Climb', 'Raises up to {a|2} selected cards by {a|1} rank (an Ace becomes a 2)', { sel: [1, 2], use: function (ids) { ids.forEach(function (id) { var c = C(id); if (isStone(c)) return; c.r = RANKS[(RANKS.indexOf(c.r) + 1) % 13]; }); } });
  T('t_shears', 'tarot', 'The Shears', 'Destroys up to {a|2} selected cards', { sel: [1, 2], use: function (ids) { ids.forEach(destroyCard); if (S.pack && S.pack.hand) S.pack.hand = S.pack.hand.filter(function (id) { return ids.indexOf(id) < 0; }); } });
  T('t_twin', 'tarot', 'The Twin', 'Select {a|2} cards: the {a|left} one becomes a copy of the {a|right} one', { sel: [2, 2], use: function (ids) { var h = curHand(); ids = h.filter(function (id) { return ids.indexOf(id) >= 0; }); var a = C(ids[0]), b = C(ids[1]); a.r = b.r; a.s = b.s; a.e = b.e; a.ed = b.ed; a.sl = b.sl; a.bc = b.bc; } });
  T('t_hoard', 'tarot', 'The Hoard', 'Doubles your money (up to {o|$20} more)', { use: function () { var g = Math.max(0, Math.min(20, S.money)); S.money += g; return '+$' + g; } });
  T('t_pawn', 'tarot', 'The Pawnbroker', 'Gives you the total sell value of your Jokers (up to {o|$50})', { use: function () { var t = 0; S.jokers.forEach(function (j) { t += sellValue(j); }); t = Math.min(50, t); S.money += t; return '+$' + t; } });
  T('t_astro', 'tarot', 'The Astronomer', 'Makes up to {a|2} random {a|Planet} cards', { room: 1, use: function () { var n = 0; for (var i = 0; i < 2; i++) if (consRoom()) { addCons(consKey('planet')); n++; } return '+' + n + ' Planet'; } });
  T('t_oracle', 'tarot', 'The Oracle', 'Makes up to {a|2} random {a|Tarot} cards', { room: 1, use: function () { var n = 0; for (var i = 0; i < 2; i++) if (consRoom()) { addCons(consKey('tarot', 't_oracle')); n++; } return '+' + n + ' Tarot'; } });
  T('t_summon', 'tarot', 'The Summoner', 'Makes a random {a|Joker} (needs a free Joker slot)', { can: function () { return jokerRoom(); }, use: function () { var k = jokerKey(); addJoker(k); return JK[k].n; } });
  T('t_spin', 'tarot', 'The Spinner', '{p|1 in 4} chance to add {a|Foil}, {a|Holographic} or {a|Polychrome} to a random Joker', { can: function () { return S.jokers.some(function (j) { return !j.ed; }); }, use: function () {
    if (rnd() < probMul() / 4) { var js = S.jokers.filter(function (j) { return !j.ed; }), j = pick(js); j.ed = wpick([['foil', 50], ['holo', 35], ['poly', 15]]); return JK[j.k].n + ' is now ' + EDN[j.ed].n; } return 'Nope!'; } });
  HANDS.forEach(function (h) {
    T('p_' + h.id, 'planet', PLANETS[h.id], 'Levels up {a|' + h.n + '}: {c|+' + h.ac + '} Chips and {m|+' + h.am + '} Mult', { hand: h.id, use: function () { levelUp(h.id, 1); jokerEvent('planet'); S.stats.planets++; return h.n + ' level ' + S.levels[h.id]; } });
  });
  T('s_pageant', 'spectral', 'Pageant', 'Destroys {a|1} random card in your hand, adds {a|3} random enhanced {a|face cards} to your hand', { inHand: 1, use: function () { destroyRandomInHand(1); var l = []; for (var i = 0; i < 3; i++) l.push(newCard(pick(['J', 'Q', 'K']), pick(SUITS), { e: randEnh() })); giveCards(l); } });
  T('s_grave', 'spectral', 'Gravedigger', 'Destroys {a|1} random card in your hand, adds {a|2} random enhanced {a|Aces} to your hand', { inHand: 1, use: function () { destroyRandomInHand(1); var l = []; for (var i = 0; i < 2; i++) l.push(newCard('A', pick(SUITS), { e: randEnh() })); giveCards(l); } });
  T('s_conjure', 'spectral', 'Conjure', 'Destroys {a|1} random card in your hand, adds {a|4} random enhanced number cards to your hand', { inHand: 1, use: function () { destroyRandomInHand(1); var l = []; for (var i = 0; i < 4; i++) l.push(newCard(pick(RANKS.slice(0, 9)), pick(SUITS), { e: randEnh() })); giveCards(l); } });
  T('s_gwax', 'spectral', 'Gilded Wax', 'Adds a {a|Gold Seal} to {a|1} selected card', { sel: [1, 1], use: sealIt('gold') });
  T('s_rwax', 'spectral', 'Crimson Wax', 'Adds a {a|Red Seal} to {a|1} selected card', { sel: [1, 1], use: sealIt('red') });
  T('s_bwax', 'spectral', 'Azure Wax', 'Adds a {a|Blue Seal} to {a|1} selected card', { sel: [1, 1], use: sealIt('blue') });
  T('s_pwax', 'spectral', 'Violet Wax', 'Adds a {a|Purple Seal} to {a|1} selected card', { sel: [1, 1], use: sealIt('purple') });
  T('s_halo', 'spectral', 'Halo', 'Adds {a|Foil}, {a|Holographic} or {a|Polychrome} to {a|1} selected card', { sel: [1, 1], use: function (ids) { C(ids[0]).ed = wpick([['foil', 50], ['holo', 35], ['poly', 15]]); } });
  T('s_pact', 'spectral', 'Pact', 'Makes a {a|Rare} Joker, sets your money to {o|$0}', { can: function () { return jokerRoom(); }, use: function () { var k = jokerKey(3); addJoker(k); S.money = Math.min(S.money, 0); return JK[k].n; } });
  T('s_eclipse', 'spectral', 'Eclipse', 'Turns every card in your hand into one random suit', { inHand: 1, use: function () { var s = pick(SUITS); curHand().forEach(function (id) { var c = C(id); c.s = s; if (c.e === 'stone') c.e = null; }); return SUITN[s]; } });
  T('s_unison', 'spectral', 'Unison', 'Turns every card in your hand into one random rank. {a|-1} hand size', { inHand: 1, use: function () { var r = pick(RANKS); curHand().forEach(function (id) { var c = C(id); c.r = r; if (c.e === 'stone') c.e = null; }); S.handSize--; return 'All ' + r + 's'; } });
  T('s_void', 'spectral', 'Void', 'Makes a random Joker {a|Negative} ({a|+1} Joker slot). {a|-1} hand size', { can: function () { return S.jokers.some(function (j) { return !j.ed; }); }, use: function () { var j = pick(S.jokers.filter(function (j) { return !j.ed; })); j.ed = 'neg'; S.handSize--; return JK[j.k].n; } });
  T('s_pyre', 'spectral', 'Pyre', 'Destroys {a|5} random cards in your hand, gives you {o|$20}', { inHand: 1, use: function () { destroyRandomInHand(5); S.money += 20; return '+$20'; } });
  T('s_effigy', 'spectral', 'Effigy', 'Copies {a|1} random Joker, destroys all the others', { can: function () { return S.jokers.length > 0; }, use: function () {
    var keep = pick(S.jokers), cp = clone(keep); cp.u = ++S.juid; if (cp.ed === 'neg') cp.ed = null; S.jokers = [keep, cp]; return JK[keep.k].n; } });
  T('s_curse', 'spectral', 'Curse', 'Adds {a|Polychrome} to a random Joker, destroys all the others', { can: function () { return S.jokers.length > 0; }, use: function () { var keep = pick(S.jokers); keep.ed = 'poly'; S.jokers = [keep]; return JK[keep.k].n; } });
  T('s_replica', 'spectral', 'Replica', 'Adds {a|2} copies of {a|1} selected card to your deck and hand', { sel: [1, 1], use: function (ids) { var o = C(ids[0]), l = []; for (var i = 0; i < 2; i++) l.push(newCard(o.r, o.s, { e: o.e, ed: o.ed, sl: o.sl, bc: o.bc })); giveCards(l); } });
  T('s_heart', 'spectral', 'Heartstone', 'Makes a {a|Legendary} Joker (needs a free Joker slot)', { can: function () { return jokerRoom(); }, use: function () { var k = jokerKey(4); addJoker(k); return JK[k].n; } });
  T('s_singular', 'spectral', 'Singularity', 'Levels up {a|every} poker hand by {a|1}', { use: function () { HANDS.forEach(function (h) { levelUp(h.id, 1); }); return 'All hands +1 level'; } });
  var TAROTS = Object.keys(CONS).filter(function (k) { return CONS[k].t === 'tarot'; });
  var SPECTRALS = Object.keys(CONS).filter(function (k) { return CONS[k].t === 'spectral'; });
  var CONS_PRICE = { tarot: 3, planet: 3, spectral: 4 };

  // ═══ Boss blinds (original names; Balatro's effects) ══════════════════════
  var BOSSES = {
    claw: { n: 'The Claw', d: 'After every hand you play, 2 random cards in your hand are discarded', col: '#b8452a', min: 1, claw: true },
    yoke: { n: 'The Yoke', d: 'Playing your most played poker hand sets your money to $0', col: '#8a5a2b', min: 6, yoke: true },
    shutter: { n: 'The Shutter', d: 'Your first hand is dealt face down', col: '#4a4a7b', min: 2, shutter: true },
    mountain: { n: 'The Mountain', d: 'A huge blind: 4x the usual score', col: '#7a5a48', min: 2, mul: 4 },
    fog: { n: 'The Fog', d: '1 in 7 cards are dealt face down', col: '#5f6b7a', min: 2, fog: 7 },
    drain: { n: 'The Drain', d: 'The poker hand you play loses 1 level', col: '#2e7d8a', min: 2, drain: true },
    bramble: { n: 'The Bramble', d: 'All Clubs are debuffed', col: '#3a7a4a', min: 1, suit: 'c' },
    tide: { n: 'The Tide', d: 'Cards drawn after you play a hand are face down', col: '#2b5aa8', min: 2, tide: true },
    lock: { n: 'The Lock', d: 'You must play 5 cards', col: '#8a6a3a', min: 1, five: true },
    eclipse: { n: 'The Eclipse', d: 'All Spades are debuffed', col: '#4a47a3', min: 1, suit: 's' },
    drought: { n: 'The Drought', d: 'You start with 0 discards', col: '#a0622d', min: 2, nodisc: true },
    rust: { n: 'The Rust', d: 'All Diamonds are debuffed', col: '#c26a2b', min: 1, suit: 'd' },
    squeeze: { n: 'The Squeeze', d: '-1 hand size', col: '#7a3b5e', min: 1, hs: -1 },
    gaze: { n: 'The Gaze', d: 'Each poker hand can only be played once this round', col: '#3a6b8a', min: 3, gaze: true },
    muzzle: { n: 'The Muzzle', d: 'You may play only one kind of poker hand this round', col: '#8a3a5a', min: 2, muzzle: true },
    mask: { n: 'The Mask', d: 'All face cards are debuffed', col: '#5a7a2b', min: 4, face: true },
    coil: { n: 'The Coil', d: 'After every play or discard, you draw exactly 3 cards', col: '#5a8a3a', min: 5, coil: true },
    column: { n: 'The Column', d: 'Cards you already played this ante are debuffed', col: '#7a6a5a', min: 1, pillar: true },
    pin: { n: 'The Pin', d: 'You get only 1 hand', col: '#4a5a7a', min: 2, oneHand: true, mul: 1 },
    thorn: { n: 'The Thorn', d: 'All Hearts are debuffed', col: '#c2185b', min: 1, suit: 'h' },
    tax: { n: 'The Tax', d: 'Lose $1 for every card you play', col: '#8d6e00', min: 3, tooth: true },
    dimmer: { n: 'The Dimmer', d: 'Base Chips and Mult of every hand are halved', col: '#5a4f8a', min: 2, half: true },
    veil: { n: 'The Veil', d: 'Face cards are dealt face down', col: '#6b4a7a', min: 2, veil: true },
    crimson: { n: 'Crimson Crown', d: 'One random Joker is turned off for every hand', col: '#b0182c', fin: true, crimson: true },
    violet: { n: 'Violet Vault', d: 'An enormous blind: 6x the usual score', col: '#7a2fbf', fin: true, mul: 6 },
    jade: { n: 'Jade Seal', d: 'Every card is debuffed until you sell a Joker', col: '#1f8a5a', fin: true, jade: true },
    azure: { n: 'Azure Chime', d: 'One card in your hand is always selected', col: '#2f7de1', fin: true, azure: true },
    amber: { n: 'Amber Mirror', d: 'Your Jokers are shuffled and turned face down', col: '#d98a12', fin: true, amber: true }
  };

  // ═══ Skip tags ════════════════════════════════════════════════════════════
  var TAGS = {
    uncommon: { n: 'Wild Invite', d: 'The next shop has a free {a|Uncommon} Joker', shop: 1, col: '#3ddc84' },
    rare: { n: 'Royal Invite', d: 'The next shop has a free {a|Rare} Joker', shop: 1, col: '#ff4d6d' },
    negative: { n: 'Void Tag', d: 'The next shop Joker is free and {a|Negative}', shop: 1, min: 2, col: '#3a3a4a' },
    foil: { n: 'Foil Tag', d: 'The next shop Joker is free and {a|Foil} ({c|+50} Chips)', shop: 1, col: '#9fc8ff' },
    holo: { n: 'Holo Tag', d: 'The next shop Joker is free and {a|Holographic} ({m|+10} Mult)', shop: 1, col: '#ff7aa8' },
    poly: { n: 'Prism Tag', d: 'The next shop Joker is free and {a|Polychrome} ({x|x1.5} Mult)', shop: 1, col: '#c87aff' },
    invest: { n: 'Investment Tag', d: 'Gain {o|$25} after you beat the next Boss Blind', col: '#ffc83d' },
    voucher: { n: 'Voucher Tag', d: 'Adds a {a|Voucher} to the next shop', shop: 1, col: '#e0703a' },
    boss: { n: 'Reroll Tag', d: 'Rerolls this ante\'s {a|Boss Blind}', col: '#b8452a' },
    standard: { n: 'Deck Tag', d: 'Opens a free {a|Mega Standard Pack}', pack: ['standard', 'mega'], min: 2, col: '#5a8ad8' },
    charm: { n: 'Arcana Tag', d: 'Opens a free {a|Mega Arcana Pack}', pack: ['arcana', 'mega'], col: '#9b5ad8' },
    meteor: { n: 'Star Tag', d: 'Opens a free {a|Mega Celestial Pack}', pack: ['celestial', 'mega'], min: 2, col: '#3a6ad8' },
    buffoon: { n: 'Jester Tag', d: 'Opens a free {a|Mega Buffoon Pack}', pack: ['buffoon', 'mega'], min: 2, col: '#e0303f' },
    ethereal: { n: 'Spirit Tag', d: 'Opens a free {a|Spectral Pack}', pack: ['spectral', 'normal'], min: 2, col: '#2fb8b0' },
    handy: { n: 'Handy Tag', d: 'Gives {o|$1} for every hand played this run', min: 2, col: '#ffc83d' },
    garbage: { n: 'Scrap Tag', d: 'Gives {o|$1} for every discard left unused this run', min: 2, col: '#8a8a6a' },
    coupon: { n: 'Coupon Tag', d: 'The first cards and packs in the next shop are free', shop: 1, col: '#3ddc84' },
    d6: { n: 'Dice Tag', d: 'Rerolls in the next shop start at {o|$0}', shop: 1, col: '#e0e0f0' },
    juggle: { n: 'Juggle Tag', d: '{a|+3} hand size next round', col: '#ff8a3d' },
    topup: { n: 'Top-up Tag', d: 'Makes up to {a|2} Common Jokers', min: 2, col: '#5fb0ff' },
    speed: { n: 'Speed Tag', d: 'Gives {o|$5} for every blind you have skipped this run', col: '#7ad0ff' },
    orbital: { n: 'Orbit Tag', d: 'Levels up a poker hand by {a|3}', min: 2, col: '#4a5ad8' },
    economy: { n: 'Economy Tag', d: 'Doubles your money (up to {o|$40} more)', col: '#ffd84a' }
  };

  // ═══ Vouchers: permanent upgrades in pairs (the second needs the first) ═══
  var VOUCHERS = {
    shelf: { n: 'Extra Shelf', d: '{a|+1} card slot in the shop' },
    aisle: { n: 'Extra Aisle', d: '{a|+1} more card slot in the shop', req: 'shelf' },
    discount: { n: 'Discount Card', d: 'Everything in the shop is {a|25%} off' },
    clearance: { n: 'Clearance Card', d: 'Everything in the shop is {a|50%} off', req: 'discount' },
    polish: { n: 'Polish', d: 'Jokers with an edition show up {a|2x} as often' },
    lacquer: { n: 'Lacquer', d: 'Jokers with an edition show up {a|4x} as often', req: 'polish' },
    rrdeal: { n: 'Reroll Deal', d: 'Rerolls cost {o|$2} less' },
    rrbargain: { n: 'Reroll Bargain', d: 'Rerolls cost {o|$2} less again', req: 'rrdeal' },
    pocket: { n: 'Deep Pocket', d: '{a|+1} consumable slot' },
    omen: { n: 'Omen Lens', d: '{a|Spectral} cards can turn up in Arcana Packs', req: 'pocket' },
    chart: { n: 'Star Chart', d: 'Celestial Packs always have the Planet for your most played hand' },
    planetarium: { n: 'Planetarium', d: 'Planet cards you hold give {x|x1.5} Mult to their poker hand', req: 'chart' },
    hand1: { n: 'Extra Hand', d: '{c|+1} hand every round' },
    hand2: { n: 'Second Wind', d: '{c|+1} more hand every round', req: 'hand1' },
    bin1: { n: 'Spare Bin', d: '{m|+1} discard every round' },
    bin2: { n: 'Big Bin', d: '{m|+1} more discard every round', req: 'bin1' },
    arcana1: { n: 'Arcana Stall', d: 'Tarot cards show up {a|2x} as often in the shop' },
    arcana2: { n: 'Arcana Market', d: 'Tarot cards show up {a|4x} as often in the shop', req: 'arcana1' },
    star1: { n: 'Star Stall', d: 'Planet cards show up {a|2x} as often in the shop' },
    star2: { n: 'Star Market', d: 'Planet cards show up {a|4x} as often in the shop', req: 'star1' },
    jar: { n: 'Savings Jar', d: 'Interest can reach {o|$10} a round' },
    vault: { n: 'Vault', d: 'Interest can reach {o|$20} a round', req: 'jar' },
    slip: { n: 'Lucky Slip', d: 'Does nothing by itself, but unlocks Extra Slot' },
    slot: { n: 'Extra Slot', d: '{a|+1} Joker slot', req: 'slip' },
    cards1: { n: 'Card Stall', d: 'Playing cards can show up in the shop' },
    cards2: { n: 'Card Market', d: 'Shop playing cards can be enhanced, sealed or shiny', req: 'cards1' },
    rewind: { n: 'Rewind', d: '{a|-1} Ante, {c|-1} hand every round' },
    timeslip: { n: 'Time Slip', d: '{a|-1} Ante, {m|-1} discard every round', req: 'rewind' },
    swap: { n: 'Boss Swap', d: 'Reroll the Boss Blind once per ante for {o|$10}' },
    bossroll: { n: 'Boss Reroll', d: 'Reroll the Boss Blind as often as you like for {o|$10}', req: 'swap' },
    big1: { n: 'Big Hands', d: '{a|+1} hand size' },
    big2: { n: 'Bigger Hands', d: '{a|+1} more hand size', req: 'big1' }
  };

  // ═══ Starting decks ══════════════════════════════════════════════════════
  var DECKS = {
    red: { n: 'Red Deck', d: '+1 discard every round', col: '#c8283a' },
    blue: { n: 'Blue Deck', d: '+1 hand every round', col: '#2f6fe0' },
    yellow: { n: 'Yellow Deck', d: 'Start with an extra $10', col: '#e0a400' },
    green: { n: 'Green Deck', d: 'No interest. $2 for each hand and $1 for each discard left at the end of a round', col: '#2f9a4a' },
    black: { n: 'Black Deck', d: '+1 Joker slot, but 1 fewer hand every round', col: '#2a2a35' }
  };
  var BASE = [300, 800, 2000, 5000, 11000, 20000, 35000, 50000];

  // ═══ Derived numbers ═════════════════════════════════════════════════════
  function hasV(k) { return S.vouchers.indexOf(k) >= 0; }
  function jflag(f) { return S.jokers.some(function (j, i) { var d = jdef(i); return d && d[f]; }); }
  function jsum(f) { var t = 0; S.jokers.forEach(function (j, i) { var d = jdef(i); if (d && d[f]) t += d[f]; }); return t; }
  // A copy joker takes on the flags of the joker it copies
  function jdef(i, depth) {
    var j = S.jokers[i]; if (!j) return null;
    var d = JK[j.k];
    if (d.copy) { depth = depth || 0; if (depth > 5) return null; var t = d.copy === 'right' ? i + 1 : 0; if (t === i) return null; return jdef(t, depth + 1); }
    return d;
  }
  function maxHands() { return Math.max(1, 4 + (S.deckId === 'blue' ? 1 : 0) - (S.deckId === 'black' ? 1 : 0) + (hasV('hand1') ? 1 : 0) + (hasV('hand2') ? 1 : 0) - (hasV('rewind') ? 1 : 0)); }
  function maxDisc() { return Math.max(0, 3 + (S.deckId === 'red' ? 1 : 0) + (hasV('bin1') ? 1 : 0) + (hasV('bin2') ? 1 : 0) - (hasV('timeslip') ? 1 : 0) + jsum('discs')); }
  function handSizeNow() { return Math.max(1, S.handSize + (hasV('big1') ? 1 : 0) + (hasV('big2') ? 1 : 0) + jsum('hs') + (S.juggle || 0)); }
  function jslots() { return 5 + (S.deckId === 'black' ? 1 : 0) + (hasV('slot') ? 1 : 0) + S.jokers.filter(function (j) { return j.ed === 'neg'; }).length; }
  function cslots() { return 2 + (hasV('pocket') ? 1 : 0) + S.cons.filter(function (c) { return c.neg; }).length; }
  function jokerRoom() { return S.jokers.length < jslots(); }
  function consRoom() { return S.cons.length < cslots(); }
  function interestCap() { return hasV('vault') ? 20 : hasV('jar') ? 10 : 5; }
  function debtLimit() { return jsum('debt'); }
  function probMul() { return jflag('dice') ? 2 : 1; }
  function discountPct() { return hasV('clearance') ? 50 : hasV('discount') ? 25 : 0; }
  function priceOf(base) { return Math.max(1, Math.floor((base + 0.5) * (100 - discountPct()) / 100)); }
  function sellValue(j) { return Math.max(1, Math.floor((j.cost || JK[j.k].c) / 2)) + ((j.v && j.v.sv) || 0); }
  function consSell(c) { return Math.max(1, Math.floor(CONS_PRICE[CONS[c.k].t] / 2)); }
  function levelUp(h, n) { S.levels[h] = Math.max(1, (S.levels[h] || 1) + n); }
  function mostPlayed() { var best = 'high', n = 0; HANDS.slice().reverse().forEach(function (h) { if ((S.plays[h.id] || 0) > n) { n = S.plays[h.id]; best = h.id; } }); return best; }

  // Engine notes for the view (joker popups after shop/discard events), drained by the UI
  function note(o) { (S.fxq = S.fxq || []).push(o); }
  function jokerEvent(name, arg) {
    if (!S) return;
    S.jokers.forEach(function (j) { var d = JK[j.k]; if (d.on && d.on[name]) { var m = d.on[name](j.v, arg); if (m) note({ u: j.u, txt: m }); } });
  }
  function addJoker(k, ed, o) {
    var d = JK[k]; o = o || {};
    var j = { k: k, u: ++S.juid, v: d.init ? d.init() : {}, ed: ed || null, cost: o.cost != null ? o.cost : d.c + (ed ? EDN[ed].price : 0) };
    S.jokers.push(j); S.stats.jseen = S.stats.jseen || {}; S.stats.jseen[k] = 1;
    return j;
  }
  function addCons(k, neg) { var c = { k: k, u: ++S.juid, neg: !!neg }; S.cons.push(c); return c; }
  function jokerKey(rar, avoid) {
    avoid = avoid || [];
    var taken = S.jokers.map(function (j) { return j.k; }).concat(avoid);
    var r = rar || wpick([[1, 70], [2, 25], [3, 5]]);
    var pool = Object.keys(JK).filter(function (k) { return JK[k].r === r && taken.indexOf(k) < 0; });
    if (!pool.length) pool = Object.keys(JK).filter(function (k) { return JK[k].r === r; });
    return pick(pool);
  }
  function consKey(t, avoid) {
    avoid = avoid || [];
    if (t === 'planet') {
      var ok = HANDS.filter(function (h) { return !h.secret || S.plays[h.id]; }).map(function (h) { return 'p_' + h.id; }).filter(function (k) { return avoid.indexOf(k) < 0; });
      return pick(ok.length ? ok : ['p_pair']);
    }
    if (t === 'spectral') return wpick(SPECTRALS.filter(function (k) { return avoid.indexOf(k) < 0; }).map(function (k) { return [k, k === 's_heart' || k === 's_singular' ? 0.06 : 1]; }));
    var p = TAROTS.filter(function (k) { return avoid.indexOf(k) < 0; });
    return pick(p.length ? p : TAROTS);
  }
  function rollEdition(mul) {
    var m = (hasV('lacquer') ? 4 : hasV('polish') ? 2 : 1) * (mul || 1), r = rnd();
    if (r < 0.003) return 'neg';
    if (r < 0.003 + 0.003 * m) return 'poly';
    if (r < 0.006 + 0.014 * m) return 'holo';
    if (r < 0.006 + 0.034 * m) return 'foil';
    return null;
  }

  // ═══ Run, antes and blinds ═══════════════════════════════════════════════
  function newRun(name, deckId, seed) {
    S = { v: 2, name: name || 'You', deckId: DECKS[deckId] ? deckId : 'red', rs: (seed != null ? seed : (Date.now() ^ (Math.random() * 1e9))) | 0, nid: 0,
      cards: {}, deck: [], draw: [], hand: [], fd: {}, jokers: [], juid: 0, cons: [], levels: {}, plays: {}, playsRound: {},
      handSize: 8, hands: 0, discards: 0, hs: 8, score: 0, target: 0, ante: 1, bi: 0, round: 0, phase: 'blind', money: 4,
      boss: null, bossUsed: [], tags: [], skipped: [false, false], voucher: null, vouchers: [], shop: null, pack: null, pend: [],
      cash: null, endless: false, won: false, sort: 'rank', lastCons: null, firstShop: true, lastHand: null, juggle: 0, fresh: [],
      started: Date.now(), stats: { best: 0, bestHand: '', consts: 0, planets: 0, tarots: 0, jt: {}, bosses: [], earned: 0, ante: {}, skips: 0, broken: 0, lostTo: null, hands: 0, discUnused: 0 } };
    SUITS.forEach(function (s) { RANKS.forEach(function (r) { S.deck.push(newCard(r, s).id); }); });
    HANDS.forEach(function (h) { S.levels[h.id] = 1; });
    if (S.deckId === 'yellow') S.money += 10;
    rollAnte();
    return S;
  }
  function rollAnte() {
    var fin = S.ante % 8 === 0;
    var ok = function (k) { var b = BOSSES[k]; return !!b.fin === fin && (fin || (b.min || 1) <= S.ante); };
    var pool = Object.keys(BOSSES).filter(function (k) { return ok(k) && S.bossUsed.indexOf(k) < 0; });
    if (!pool.length) { S.bossUsed = S.bossUsed.filter(function (k) { return !ok(k); }); pool = Object.keys(BOSSES).filter(ok); }
    S.boss = pick(pool); S.bossUsed.push(S.boss); S.bossRerolled = false;
    var tk = Object.keys(TAGS).filter(function (k) { return (TAGS[k].min || 1) <= S.ante; });
    S.tags = [0, 1].map(function () { var k = pick(tk), t = { k: k }; if (k === 'orbital') t.h = pick(HANDS.filter(function (h) { return !h.secret; })).id; return t; });
    S.skipped = [false, false];
    S.voucher = voucherKey(); S.voucherSold = false;
  }
  function voucherKey(avoid) {
    var pool = Object.keys(VOUCHERS).filter(function (k) { var v = VOUCHERS[k]; return !hasV(k) && (!v.req || hasV(v.req)) && (avoid || []).indexOf(k) < 0; });
    return pool.length ? pick(pool) : null;
  }
  function rerollBoss() {
    var keep = S.boss;
    var fin = S.ante % 8 === 0;
    var pool = Object.keys(BOSSES).filter(function (k) { var b = BOSSES[k]; return k !== keep && !!b.fin === fin && (fin || (b.min || 1) <= S.ante); });
    S.boss = pick(pool); S.bossUsed.push(S.boss);
    return BOSSES[S.boss].n;
  }
  function canRerollBoss() { return S.phase === 'blind' && (hasV('bossroll') || (hasV('swap') && !S.bossRerolled)) && S.money - 10 >= -debtLimit(); }
  function doRerollBoss() { if (!canRerollBoss()) return null; S.money -= 10; S.bossRerolled = true; return rerollBoss(); }
  function anteBase(a) {
    if (a < 1) return 100;
    if (a <= 8) return BASE[a - 1];
    var c = a - 8, d = 1 + 0.2 * c, amount = Math.floor(BASE[7] * Math.pow(1.6 + Math.pow(0.75 * c, d), c));
    var p = Math.pow(10, Math.floor(Math.log10(amount) - 1));
    return amount - amount % p;
  }
  function blindInfo(i, ante, bossKey) {
    ante = ante || S.ante;
    var b = anteBase(ante);
    if (i === 0) return { kind: 'small', name: 'Small Blind', target: b, reward: 3, color: '#2f6fe0' };
    if (i === 1) return { kind: 'big', name: 'Big Blind', target: Math.floor(b * 1.5), reward: 4, color: '#e0a400' };
    var B = BOSSES[bossKey || S.boss];
    return { kind: 'boss', key: bossKey || S.boss, name: B.n, target: Math.floor(b * (B.mul != null ? B.mul : 2)), reward: B.fin ? 8 : 5, color: B.col, boss: B };
  }
  function activeBoss() {
    if (!S || S.phase !== 'play' || S.bi !== 2 || S.bossOff || jflag('silence')) return null;
    return BOSSES[S.boss];
  }
  function optNow() { return { four: jflag('four'), shortcut: jflag('shortcut'), smeared: jflag('smeared'), allFace: jflag('allFace'), splash: jflag('splash') }; }
  function debOf(c, B, opt) {
    if (!B) return false;
    if (B.jade) return true;
    if (B.suit && suitIs(c, B.suit, opt)) return true;
    if (B.face && isFace(c, opt)) return true;
    if (B.pillar && c.pa === S.ante) return true;
    return false;
  }
  function isDebuffed(id) { var c = C(id); return !!c && debOf(c, activeBoss(), optNow()); }

  function sortHand() {
    var so = { s: 0, h: 1, c: 2, d: 3 };
    function rv(c) { return isStone(c) ? 0 : RV[c.r]; }
    S.hand.sort(function (a, b) {
      var x = C(a), y = C(b);
      return S.sort === 'suit' ? ((isStone(x) ? 9 : so[x.s]) - (isStone(y) ? 9 : so[y.s]) || rv(y) - rv(x)) : (rv(y) - rv(x) || so[x.s] - so[y.s]);
    });
  }
  function drawUp(n, afterPlay) {
    var B = activeBoss(), fresh = [], opt = optNow();
    var want = n != null ? n : S.hs - S.hand.length;
    while (want > 0 && S.draw.length) {
      var id = S.draw.pop(), c = C(id);
      if (B && ((B.shutter && S.handsPlayedRound === 0 && !S.dealtOnce) || (B.fog && rnd() < 1 / B.fog) || (B.tide && afterPlay) || (B.veil && isFace(c, opt)))) S.fd[id] = 1;
      S.hand.push(id); fresh.push(id); want--;
    }
    S.dealtOnce = true;
    if (B && B.azure && (!S.forced || S.hand.indexOf(S.forced) < 0) && S.hand.length) S.forced = pick(S.hand);
    sortHand();
    S.fresh = (S.fresh || []).concat(fresh);
    return fresh;
  }
  function startBlind() {
    var info = blindInfo(S.bi), B = S.bi === 2 ? BOSSES[S.boss] : null, notes = [];
    S.round++;
    S.target = S.testTarget || info.target; S.testTarget = 0;
    S.score = 0; S.handsPlayedRound = 0; S.dealtOnce = false; S.fd = {}; S.playsRound = {}; S.discUsed = false; S.bossOff = false; S.forced = null; S.jOff = null; S.fresh = [];
    if (S.pend.some(function (t) { return t.k === 'juggle'; })) { S.juggle = 3; S.pend = S.pend.filter(function (t) { return t.k !== 'juggle'; }); }
    S.phase = 'play';
    var Bon = activeBoss();
    S.hands = Bon && Bon.oneHand ? 1 : maxHands();
    S.discards = Bon && Bon.nodisc ? 0 : maxDisc();
    S.hs = handSizeNow() + (Bon && Bon.hs || 0);
    if (Bon && Bon.amber) { shuffle(S.jokers); S.jFlip = true; }
    if (Bon && Bon.crimson && S.jokers.length) S.jOff = pick(S.jokers).u;
    // "When a blind starts" jokers (copies too)
    S.jokers.forEach(function (j, i) { var d = jdef(i); if (d && d.sel) { var r = d.sel(j.v); if (r && r.msg) notes.push({ u: j.u, txt: r.msg }); } });
    S.draw = shuffle(S.deck.slice());
    S.hand = [];
    drawUp();
    return notes;
  }
  function skipBlind() {
    if (S.phase !== 'blind' || S.bi > 1) return null;
    var t = S.tags[S.bi];
    S.skipped[S.bi] = true; S.stats.skips++;
    S.bi++;
    var msg = applyTag(t);
    return { tag: t, msg: msg };
  }
  function applyTag(t) {
    var T = TAGS[t.k];
    if (T.shop || t.k === 'invest' || t.k === 'juggle') { S.pend.push(t); return T.n + ': saved for later'; }
    if (T.pack) { openPack(T.pack[0], T.pack[1], 'blind'); return null; }
    if (t.k === 'boss') return 'New Boss: ' + rerollBoss();
    if (t.k === 'handy') { S.money += S.stats.hands; return '+$' + S.stats.hands; }
    if (t.k === 'garbage') { S.money += S.stats.discUnused; return '+$' + S.stats.discUnused; }
    if (t.k === 'speed') { S.money += 5 * S.stats.skips; return '+$' + 5 * S.stats.skips; }
    if (t.k === 'economy') { var g = Math.max(0, Math.min(40, S.money)); S.money += g; return '+$' + g; }
    if (t.k === 'orbital') { levelUp(t.h, 3); return HMAP[t.h].n + ' is now level ' + S.levels[t.h]; }
    if (t.k === 'topup') { var n = 0; for (var i = 0; i < 2; i++) if (jokerRoom()) { addJoker(jokerKey(1)); n++; } return n ? n + ' new Joker' + (n > 1 ? 's' : '') : 'No room for Jokers'; }
    return null;
  }
