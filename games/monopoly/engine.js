// ═══════════════════════════════════════════════════════════════════════════
// Monopoly rules engine (no DOM). Used by games/monopoly.html and by tests in Node.
//
//   var M = MonoEngine;
//   S = M.newGame([{name, cpu, tok}], opts)     opts: {fp, go400, noAuction, len}
//   r = M.act(S, {t, p, ...})                   -> {ok, err, ev:[events]}; changes S in place
//   M.needs(S)                                  -> the player who has to act now (-1 when over)
//   M.bot(S, p)                                 -> the computer's next action for p, or null
//
// The whole game is one plain JSON object, so it saves, undoes and goes over the network as is.
// Actions (p = the player doing it):
//   roll · payJail · useCard · buy · decline · bid {amt} · pass · endTurn · pay (a debt) · bankrupt
//   build {sq} · sell {sq} · sellAll {g} · mort {sq} · unmort {sq}
//   propose {to, give:{cash, props, cards}, get:{...}} · answer {ok} · cancel (a proposed trade)
// Events (for the animations): dice · move · pay · card · jail · free · buy · build · sell · mort · unmort
//   auction · bid · won · trade · bankrupt · over · say
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var BANK = -1;
  // k: st street, rr railroad, ut utility, go, cc community chest, ch chance, tax, jail, fp free parking, gtj go to jail
  var SQ = [
    { n: 'Go', k: 'go' },
    { n: 'Mediterranean Avenue', k: 'st', g: 0, p: 60, r: [2, 10, 30, 90, 160, 250], h: 50 },
    { n: 'Community Chest', k: 'cc' },
    { n: 'Baltic Avenue', k: 'st', g: 0, p: 60, r: [4, 20, 60, 180, 320, 450], h: 50 },
    { n: 'Income Tax', k: 'tax', amt: 200 },
    { n: 'Reading Railroad', k: 'rr', p: 200 },
    { n: 'Oriental Avenue', k: 'st', g: 1, p: 100, r: [6, 30, 90, 270, 400, 550], h: 50 },
    { n: 'Chance', k: 'ch' },
    { n: 'Vermont Avenue', k: 'st', g: 1, p: 100, r: [6, 30, 90, 270, 400, 550], h: 50 },
    { n: 'Connecticut Avenue', k: 'st', g: 1, p: 120, r: [8, 40, 100, 300, 450, 600], h: 50 },
    { n: 'Jail', k: 'jail' },
    { n: 'St. Charles Place', k: 'st', g: 2, p: 140, r: [10, 50, 150, 450, 625, 750], h: 100 },
    { n: 'Electric Company', k: 'ut', p: 150 },
    { n: 'States Avenue', k: 'st', g: 2, p: 140, r: [10, 50, 150, 450, 625, 750], h: 100 },
    { n: 'Virginia Avenue', k: 'st', g: 2, p: 160, r: [12, 60, 180, 500, 700, 900], h: 100 },
    { n: 'Pennsylvania Railroad', k: 'rr', p: 200 },
    { n: 'St. James Place', k: 'st', g: 3, p: 180, r: [14, 70, 200, 550, 750, 950], h: 100 },
    { n: 'Community Chest', k: 'cc' },
    { n: 'Tennessee Avenue', k: 'st', g: 3, p: 180, r: [14, 70, 200, 550, 750, 950], h: 100 },
    { n: 'New York Avenue', k: 'st', g: 3, p: 200, r: [16, 80, 220, 600, 800, 1000], h: 100 },
    { n: 'Free Parking', k: 'fp' },
    { n: 'Kentucky Avenue', k: 'st', g: 4, p: 220, r: [18, 90, 250, 700, 875, 1050], h: 150 },
    { n: 'Chance', k: 'ch' },
    { n: 'Indiana Avenue', k: 'st', g: 4, p: 220, r: [18, 90, 250, 700, 875, 1050], h: 150 },
    { n: 'Illinois Avenue', k: 'st', g: 4, p: 240, r: [20, 100, 300, 750, 925, 1100], h: 150 },
    { n: 'B. & O. Railroad', k: 'rr', p: 200 },
    { n: 'Atlantic Avenue', k: 'st', g: 5, p: 260, r: [22, 110, 330, 800, 975, 1150], h: 150 },
    { n: 'Ventnor Avenue', k: 'st', g: 5, p: 260, r: [22, 110, 330, 800, 975, 1150], h: 150 },
    { n: 'Water Works', k: 'ut', p: 150 },
    { n: 'Marvin Gardens', k: 'st', g: 5, p: 280, r: [24, 120, 360, 850, 1025, 1200], h: 150 },
    { n: 'Go to Jail', k: 'gtj' },
    { n: 'Pacific Avenue', k: 'st', g: 6, p: 300, r: [26, 130, 390, 900, 1100, 1275], h: 200 },
    { n: 'North Carolina Avenue', k: 'st', g: 6, p: 300, r: [26, 130, 390, 900, 1100, 1275], h: 200 },
    { n: 'Community Chest', k: 'cc' },
    { n: 'Pennsylvania Avenue', k: 'st', g: 6, p: 320, r: [28, 150, 450, 1000, 1200, 1400], h: 200 },
    { n: 'Short Line', k: 'rr', p: 200 },
    { n: 'Chance', k: 'ch' },
    { n: 'Park Place', k: 'st', g: 7, p: 350, r: [35, 175, 500, 1100, 1300, 1500], h: 200 },
    { n: 'Luxury Tax', k: 'tax', amt: 100 },
    { n: 'Boardwalk', k: 'st', g: 7, p: 400, r: [50, 200, 600, 1400, 1700, 2000], h: 200 }
  ];
  var GROUPS = [
    { n: 'Brown', c: '#8a4b2a' }, { n: 'Light Blue', c: '#a9dcf5' }, { n: 'Pink', c: '#d6338a' }, { n: 'Orange', c: '#f3901d' },
    { n: 'Red', c: '#e1251b' }, { n: 'Yellow', c: '#f6e100' }, { n: 'Green', c: '#1d9e55' }, { n: 'Dark Blue', c: '#1b5fae' }
  ];
  var GSQ = [[], [], [], [], [], [], [], []], RRS = [], UTS = [], OWNABLE = [];
  SQ.forEach(function (s, i) {
    if (s.k === 'st') GSQ[s.g].push(i);
    if (s.k === 'rr') RRS.push(i);
    if (s.k === 'ut') UTS.push(i);
    if (s.p) OWNABLE.push(i);
    s.m = s.p ? s.p / 2 : 0;   // mortgage value
  });
  // Card texts are our own words; the effects are the standard ones.
  var CHANCE = [
    { a: 'to', sq: 39, t: 'Take a stroll down to Boardwalk.' },
    { a: 'to', sq: 0, t: 'Advance to Go and collect $200.' },
    { a: 'to', sq: 24, t: 'Head to Illinois Avenue. If you pass Go, collect $200.' },
    { a: 'to', sq: 11, t: 'Head to St. Charles Place. If you pass Go, collect $200.' },
    { a: 'rr', t: 'Go to the nearest railroad. If no one owns it, you may buy it. If someone does, pay them twice the usual rent.' },
    { a: 'rr', t: 'Go to the nearest railroad. If no one owns it, you may buy it. If someone does, pay them twice the usual rent.' },
    { a: 'ut', t: 'Go to the nearest utility. If no one owns it, you may buy it. If someone does, roll the dice and pay them ten times the roll.' },
    { a: 'gain', amt: 50, t: 'The bank pays you a dividend of $50.' },
    { a: 'goojf', t: 'Get Out of Jail Free. Keep this card until you need it, or trade it.' },
    { a: 'back', n: 3, t: 'Go back three spaces.' },
    { a: 'jail', t: 'Go straight to Jail. Do not pass Go, do not collect $200.' },
    { a: 'repairs', house: 25, hotel: 100, t: 'Your buildings need repairs: pay $25 for each house and $100 for each hotel.' },
    { a: 'pay', amt: 15, t: 'Speeding ticket! Pay $15.' },
    { a: 'to', sq: 5, t: 'Take a ride on the Reading Railroad. If you pass Go, collect $200.' },
    { a: 'payEach', amt: 50, t: 'You’ve been made chair of the board. Pay each player $50.' },
    { a: 'gain', amt: 150, t: 'Your building loan pays out. Collect $150.' }
  ];
  var CHEST = [
    { a: 'to', sq: 0, t: 'Advance to Go and collect $200.' },
    { a: 'gain', amt: 200, t: 'The bank made a mistake in your favor. Collect $200.' },
    { a: 'pay', amt: 50, t: 'Doctor’s visit. Pay $50.' },
    { a: 'gain', amt: 50, t: 'You sold some stock. Collect $50.' },
    { a: 'goojf', t: 'Get Out of Jail Free. Keep this card until you need it, or trade it.' },
    { a: 'jail', t: 'Go straight to Jail. Do not pass Go, do not collect $200.' },
    { a: 'gain', amt: 100, t: 'Your holiday savings pay out. Collect $100.' },
    { a: 'gain', amt: 20, t: 'Income tax refund. Collect $20.' },
    { a: 'collectEach', amt: 10, t: 'It’s your birthday! Collect $10 from every player.' },
    { a: 'gain', amt: 100, t: 'Your life insurance pays out. Collect $100.' },
    { a: 'pay', amt: 100, t: 'Hospital bill. Pay $100.' },
    { a: 'pay', amt: 50, t: 'School fees. Pay $50.' },
    { a: 'gain', amt: 25, t: 'You did some consulting work. Collect $25.' },
    { a: 'repairs', house: 40, hotel: 115, t: 'The street needs repairs: pay $40 for each house and $115 for each hotel.' },
    { a: 'gain', amt: 10, t: 'You won second prize in a beauty contest. Collect $10.' },
    { a: 'gain', amt: 100, t: 'You inherit $100.' }
  ];
  var DECK = { ch: CHANCE, cc: CHEST };
  var TOKENS = ['hat', 'car', 'dog', 'ship', 'boot', 'thimble', 'iron', 'barrow'];

  // ── Random numbers (tests can swap in their own, or queue dice) ──
  var rand = Math.random, forced = [];
  function die() { return 1 + Math.floor(rand() * 6); }
  function roll2() { if (forced.length) return forced.shift().slice(); return [die(), die()]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function fill(n, v) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  // ── New game ──
  function newGame(players, opts) {
    opts = opts || {};
    var S = {
      v: 1, opts: { fp: !!opts.fp, go400: !!opts.go400, noAuction: !!opts.noAuction, len: opts.len || 'all' },
      players: players.map(function (p, i) {
        return { name: p.name, cpu: !!p.cpu, tok: p.tok || TOKENS[i % 8], cash: 1500, pos: 0, jail: false, tries: 0, cards: [], out: false, outAt: 0 };
      }),
      own: fill(40, -1), hs: fill(40, 0), mort: fill(40, 0), fresh: [],
      bankH: 32, bankT: 12, deck: { ch: shuffle(range(16)), cc: shuffle(range(16)) },
      cur: 0, phase: 'roll', dice: null, dbl: 0, again: false, pot: 0,
      offer: null, auction: null, aq: [], trade: null, debt: null, dq: [], ret: null, cont: null,
      turn: 1, round: 1, elapsed: 0, started: Date.now(), last: null, lastCard: null,
      log: [], bm: {}, out: [], winner: -1, endWhy: '',
      st: players.map(function () { return { rentPaid: 0, rentGot: 0, dbl: 0, jail: 0, go: 0, built: 0, trades: 0, bought: 0 }; }),
      big: null   // the biggest rent paid: {a, f, t, sq}
    };
    say(S, 'The game begins. ' + S.players[0].name + ' rolls first.');
    return S;
  }

  // ── Helpers ──
  function say(S, t, p) { S.log.push({ t: t, p: p == null ? -1 : p, n: S.turn }); if (S.log.length > 120) S.log.splice(0, S.log.length - 120); }
  function P(S, p) { return S.players[p]; }
  function nm(S, p) { return p === BANK ? 'the bank' : S.players[p].name; }
  function active(S) { var a = []; S.players.forEach(function (x, i) { if (!x.out) a.push(i); }); return a; }
  function ownsGroup(S, p, g) { return GSQ[g].every(function (s) { return S.own[s] === p; }); }
  function groupHasBuildings(S, g) { return GSQ[g].some(function (s) { return S.hs[s] > 0; }); }
  function sqGroupBuilt(S, sq) { var s = SQ[sq]; return s.k === 'st' && groupHasBuildings(S, s.g); }
  function countOwned(S, p, list) { var n = 0; list.forEach(function (s) { if (S.own[s] === p) n++; }); return n; }
  function unmortCost(S, sq) { var m = SQ[sq].m; return S.fresh.indexOf(sq) >= 0 ? m : m + Math.ceil(m / 10); }
  function interest(sq) { return Math.ceil(SQ[sq].m / 10); }
  function houses(S, p) { var h = 0, t = 0; S.own.forEach(function (o, i) { if (o === p) { if (S.hs[i] === 5) t++; else h += S.hs[i]; } }); return { h: h, t: t }; }
  // Rent owed on landing (dice: the roll, for utilities). mod: {rr2} nearest-railroad card, {ut10} nearest-utility card
  function rent(S, sq, dice, mod) {
    var s = SQ[sq], o = S.own[sq]; if (o < 0 || S.mort[sq]) return 0;
    mod = mod || {};
    if (s.k === 'st') { var n = S.hs[sq]; return n ? s.r[n] : s.r[0] * (ownsGroup(S, o, s.g) ? 2 : 1); }
    if (s.k === 'rr') { var c = countOwned(S, o, RRS); return 25 * Math.pow(2, c - 1) * (mod.rr2 ? 2 : 1); }
    if (s.k === 'ut') { var u = countOwned(S, o, UTS); return (mod.ut10 || u === 2 ? 10 : 4) * (dice || 0); }
    return 0;
  }
  // What a player could raise by selling every building and mortgaging everything (plus cash)
  function liquid(S, p) {
    var v = S.players[p].cash;
    S.own.forEach(function (o, i) { if (o !== p) return; if (S.hs[i]) v += S.hs[i] * SQ[i].h / 2; if (!S.mort[i]) v += SQ[i].m; });
    return v;
  }
  // Net worth (the official short-game count): cash, property at its price (half if mortgaged), buildings at cost
  function worth(S, p) {
    var x = S.players[p]; if (x.out) return 0;
    var v = x.cash;
    S.own.forEach(function (o, i) { if (o !== p) return; v += S.mort[i] ? SQ[i].m : SQ[i].p; v += S.hs[i] * (SQ[i].h || 0); });
    return v;
  }

  // ── Money ──
  // Everything owed goes through one queue, so "pay each player" and "collect from every player" work the same as rent.
  function charge(S, ev, f, t, a, why, sq) { if (a > 0) S.dq.push({ f: f, t: t, a: a, w: why, sq: sq == null ? -1 : sq }); }
  function gain(S, ev, p, a, why) { if (a <= 0) return; S.players[p].cash += a; ev.push({ e: 'pay', f: BANK, t: p, a: a, w: why }); }
  // Pays what can be paid now; stops at the first debt the payer can't cover (phase 'debt')
  function settle(S, ev) {
    while (S.dq.length) {
      var d = S.dq[0];
      if (S.players[d.f].out || (d.t >= 0 && S.players[d.t].out)) { S.dq.shift(); continue; }
      if (S.players[d.f].cash < d.a) {
        S.debt = d; if (S.phase !== 'debt') S.dret = S.phase; S.phase = 'debt';
        say(S, nm(S, d.f) + ' owes ' + money(d.a) + ' and has to raise the money.', d.f);
        return false;
      }
      S.dq.shift(); transfer(S, ev, d);
    }
    return true;
  }
  function transfer(S, ev, d) {
    S.players[d.f].cash -= d.a;
    if (d.t >= 0) S.players[d.t].cash += d.a;
    var toPot = d.t === BANK && S.opts.fp && /^(tax|fee|jail|card|repairs)$/.test(d.w);
    if (toPot) S.pot += d.a;
    ev.push({ e: 'pay', f: d.f, t: toPot ? -2 : d.t, a: d.a, w: d.w, sq: d.sq });
    if (d.w === 'rent') {
      S.st[d.f].rentPaid += d.a; S.st[d.t].rentGot += d.a;
      if (!S.big || d.a > S.big.a) S.big = { a: d.a, f: d.f, t: d.t, sq: d.sq };
    }
  }

  // ── Moving ──
  function moveTo(S, ev, p, to, o) {
    o = o || {};
    var x = S.players[p], from = x.pos, steps = o.back ? -o.back : (to - from + 40) % 40;
    if (!o.back && steps === 0 && o.full) steps = 40;
    x.pos = to;
    ev.push({ e: 'move', p: p, from: from, to: to, n: steps });
    if (!o.back && steps > 0 && from + steps >= 40) {
      var exact = to === 0, amt = exact && S.opts.go400 ? 400 : 200;
      S.st[p].go++;
      gain(S, ev, p, amt, 'go');
      say(S, x.name + (exact ? ' landed on Go: ' : ' passed Go: ') + 'collect ' + money(amt) + '.', p);
    }
  }
  function toJail(S, ev, p, why) {
    var x = S.players[p];
    ev.push({ e: 'move', p: p, from: x.pos, to: 10, n: 0, jail: 1 });
    ev.push({ e: 'jail', p: p });
    x.pos = 10; x.jail = true; x.tries = 0;
    S.again = false; S.dbl = 0; S.st[p].jail++;
    say(S, x.name + ' goes to Jail' + (why ? ' (' + why + ')' : '') + '.', p);
  }

  // Lands p on its square. Returns false when the turn has to wait (buy decision, a debt)
  function land(S, ev, p, dice, mod) {
    var x = S.players[p], sq = x.pos, s = SQ[sq];
    S.last = { p: p, sq: sq };
    if (s.p) {
      var o = S.own[sq];
      if (o < 0) {
        S.offer = { sq: sq }; S.phase = 'buy';
        say(S, x.name + ' landed on ' + s.n + ', for sale at ' + money(s.p) + '.', p);
        return false;
      }
      if (o === p) { say(S, x.name + ' landed on ' + s.n + ', their own property.', p); return true; }
      if (S.mort[sq]) { say(S, x.name + ' landed on ' + s.n + ' (mortgaged, no rent).', p); return true; }
      var dd = dice;
      if (mod && mod.ut10) { var d2 = roll2(); dd = d2[0] + d2[1]; ev.push({ e: 'dice', p: p, d: d2, ut: 1 }); }
      var r = rent(S, sq, dd, mod);
      say(S, x.name + ' landed on ' + s.n + ' and pays ' + nm(S, o) + ' ' + money(r) + ' rent' + (s.k === 'ut' ? ' (' + (mod && mod.ut10 || countOwned(S, o, UTS) === 2 ? 10 : 4) + ' × ' + dd + ')' : mod && mod.rr2 ? ' (double)' : '') + '.', p);
      charge(S, ev, p, o, r, 'rent', sq);
      return settle(S, ev);
    }
    if (s.k === 'tax') { say(S, x.name + ' pays ' + s.n + ': ' + money(s.amt) + '.', p); charge(S, ev, p, BANK, s.amt, 'tax', sq); return settle(S, ev); }
    if (s.k === 'gtj') { toJail(S, ev, p); return true; }
    if (s.k === 'fp') {
      if (S.opts.fp && S.pot > 0) { var pot = S.pot; S.pot = 0; gain(S, ev, p, pot, 'pot'); say(S, x.name + ' landed on Free Parking and scoops the jackpot: ' + money(pot) + '!', p); ev.push({ e: 'pot', p: p, a: pot }); }
      else say(S, x.name + ' takes a break on Free Parking.', p);
      return true;
    }
    if (s.k === 'ch' || s.k === 'cc') return draw(S, ev, p, s.k, dice);
    if (s.k === 'jail') say(S, x.name + ' is just visiting Jail.', p);
    return true;
  }
  function draw(S, ev, p, deck, dice) {
    var id = S.deck[deck].shift(), c = DECK[deck][id], x = S.players[p];
    if (c.a !== 'goojf') S.deck[deck].push(id);
    S.lastCard = { d: deck, id: id };
    ev.push({ e: 'card', p: p, d: deck, id: id, t: c.t });
    say(S, x.name + ' draws ' + (deck === 'ch' ? 'Chance' : 'Community Chest') + ': ' + c.t, p);
    switch (c.a) {
      case 'to': moveTo(S, ev, p, c.sq); return land(S, ev, p, dice);
      case 'rr': case 'ut': {
        var list = c.a === 'rr' ? RRS : UTS, to = list.filter(function (s) { return s > x.pos; })[0];
        if (to == null) to = list[0];
        moveTo(S, ev, p, to);
        return land(S, ev, p, dice, c.a === 'rr' ? { rr2: 1 } : { ut10: 1 });
      }
      case 'back': { var b = (x.pos + 40 - c.n) % 40; moveTo(S, ev, p, b, { back: c.n }); return land(S, ev, p, dice); }
      case 'jail': toJail(S, ev, p, 'card'); return true;
      case 'goojf': x.cards.push(deck + id); return true;
      case 'gain': gain(S, ev, p, c.amt, 'card'); return true;
      case 'pay': charge(S, ev, p, BANK, c.amt, 'card'); return settle(S, ev);
      case 'repairs': {
        var hh = houses(S, p), amt = hh.h * c.house + hh.t * c.hotel;
        say(S, x.name + ' has ' + hh.h + ' house' + (hh.h === 1 ? '' : 's') + ' and ' + hh.t + ' hotel' + (hh.t === 1 ? '' : 's') + ': ' + (amt ? 'pays ' + money(amt) + '.' : 'nothing to pay.'), p);
        charge(S, ev, p, BANK, amt, 'repairs'); return settle(S, ev);
      }
      case 'payEach': active(S).forEach(function (q) { if (q !== p) charge(S, ev, p, q, c.amt, 'card'); }); return settle(S, ev);
      case 'collectEach': active(S).forEach(function (q) { if (q !== p) charge(S, ev, q, p, c.amt, 'card'); }); return settle(S, ev);
    }
    return true;
  }

  // The end of whatever was happening: run what's queued (debts, auctions of a bankrupt's property, a move after a
  // jail fine), then the turn either rolls again (doubles) or waits for End turn
  function finish(S, ev) {
    if (S.dq.length && !settle(S, ev)) return;
    if (S.ret) { var r = S.ret; S.ret = null; S.phase = r; return; }
    if (S.cont && S.players[S.cur].out) S.cont = null;
    if (S.cont) {
      var c = S.cont; S.cont = null;
      if (c.k === 'move') { var x = S.players[S.cur]; moveTo(S, ev, S.cur, (x.pos + c.n) % 40); if (!land(S, ev, S.cur, c.n)) return; if (S.dq.length && !settle(S, ev)) return; }
    }
    if (S.aq.length && !S.opts.noAuction) { startAuction(S, ev, S.aq.shift()); return; }
    S.aq = [];
    if (checkOver(S, ev)) return;
    var me = S.players[S.cur];
    if (me.out) { nextTurn(S, ev); return; }
    S.phase = S.again && !me.jail ? 'roll' : 'done';
    if (S.phase === 'roll') say(S, me.name + ' rolled doubles and goes again.', S.cur);
  }
  function checkOver(S, ev) {
    var a = active(S);
    if (a.length <= 1) { endGame(S, ev, a[0], 'last'); return true; }
    return false;
  }
  function endGame(S, ev, w, why) {
    S.phase = 'over'; S.winner = w; S.endWhy = why;
    S.offer = null; S.auction = null; S.trade = null; S.debt = null; S.dq = []; S.aq = [];
    say(S, (why === 'last' ? S.players[w].name + ' is the last one standing and wins!' : 'Time’s up! ' + S.players[w].name + ' is the richest player and wins.'), w);
    ev.push({ e: 'over', w: w, why: why });
  }
  function limitHit(S) {
    var L = S.opts.len || 'all';
    if (/^r\d+$/.test(L)) return S.round > +L.slice(1);
    if (/^m\d+$/.test(L)) return S.elapsed >= +L.slice(1) * 60000;
    return false;
  }
  function richest(S) {
    var best = -1, bv = -1;
    active(S).forEach(function (p) { var w = worth(S, p); if (w > bv) { bv = w; best = p; } });
    return best;
  }
  function nextTurn(S, ev) {
    S.fresh = []; S.dbl = 0; S.again = false; S.dice = null; S.offer = null; S.last = null;
    var n = S.players.length, i = S.cur;
    do { i = (i + 1) % n; } while (S.players[i].out && i !== S.cur);
    if (i <= S.cur) S.round++;
    S.cur = i; S.turn++; S.phase = 'roll';
    if (checkOver(S, ev)) return;
    // a timed or round-limited game ends when a round is complete, so everyone has had the same number of turns
    if (i <= firstActive(S) && limitHit(S)) { endGame(S, ev, richest(S), 'time'); return; }
    ev.push({ e: 'turn', p: i });
  }
  function firstActive(S) { for (var i = 0; i < S.players.length; i++) if (!S.players[i].out) return i; return 0; }

  // ── Auctions ──
  function startAuction(S, ev, sq) {
    var order = [], n = S.players.length;
    for (var k = 0; k < n; k++) { var q = (S.cur + k) % n; if (!S.players[q].out) order.push(q); }
    S.auction = { sq: sq, high: 0, hb: -1, act: order, i: 0 };
    S.phase = 'auction'; S.offer = null;
    say(S, SQ[sq].n + ' goes up for auction.', -1);
    ev.push({ e: 'auction', sq: sq });
    skipBroke(S, ev);
  }
  // players who can't top the high bid drop out on their own
  function skipBroke(S, ev) {
    var A = S.auction;
    for (var guard = 0; guard < 20 && A && S.phase === 'auction'; guard++) {
      if (auctionDone(S, ev)) return;
      var p = A.act[A.i];
      if (p === A.hb) { A.i = (A.i + 1) % A.act.length; continue; }
      if (S.players[p].cash <= A.high) { A.act.splice(A.i, 1); if (A.i >= A.act.length) A.i = 0; continue; }
      return;
    }
  }
  function auctionDone(S, ev) {
    var A = S.auction;
    if (A.act.length === 0 || (A.hb >= 0 && A.act.length === 1 && A.act[0] === A.hb)) {
      S.auction = null;
      if (A.hb >= 0) {
        var w = A.hb; S.players[w].cash -= A.high; S.own[A.sq] = w; S.st[w].bought++;
        ev.push({ e: 'won', p: w, sq: A.sq, a: A.high });
        ev.push({ e: 'pay', f: w, t: BANK, a: A.high, w: 'auction' });
        say(S, S.players[w].name + ' wins ' + SQ[A.sq].n + ' at auction for ' + money(A.high) + '.', w);
      } else { say(S, 'No one bid. ' + SQ[A.sq].n + ' stays with the bank.', -1); ev.push({ e: 'won', p: -1, sq: A.sq, a: 0 }); }
      S.phase = 'done';   // finish() decides what comes next
      finish(S, ev);
      return true;
    }
    return false;
  }

  // ── Bankruptcy ──
  function goBankrupt(S, ev, p, to) {
    var x = S.players[p];
    // buildings go back to the bank at half price first
    S.own.forEach(function (o, i) {
      if (o !== p || !S.hs[i]) return;
      x.cash += S.hs[i] * SQ[i].h / 2;
      if (S.hs[i] === 5) S.bankT++; else S.bankH += S.hs[i];
      S.hs[i] = 0;
    });
    if (to >= 0) {
      var c = S.players[to];
      if (x.cash > 0) { c.cash += x.cash; ev.push({ e: 'pay', f: p, t: to, a: x.cash, w: 'bankrupt' }); }
      S.own.forEach(function (o, i) {
        if (o !== p) return;
        S.own[i] = to;
        if (S.mort[i]) { charge(S, ev, to, BANK, interest(i), 'interest'); if (S.fresh.indexOf(i) < 0) S.fresh.push(i); }
      });
      c.cards = c.cards.concat(x.cards);
    } else {
      S.own.forEach(function (o, i) { if (o !== p) return; S.own[i] = -1; S.mort[i] = 0; S.aq.push(i); });
      x.cards.forEach(function (k) { S.deck[k.slice(0, 2)].push(+k.slice(2)); });
    }
    x.cash = 0; x.cards = []; x.out = true; x.jail = false; x.outAt = S.turn;
    S.out.push({ p: p, to: to, n: S.turn });
    S.dq = S.dq.filter(function (d) { return d.f !== p && d.t !== p; });
    if (S.auction) { var k2 = S.auction.act.indexOf(p); if (k2 >= 0) S.auction.act.splice(k2, 1); }
    if (S.trade && (S.trade.f === p || S.trade.to === p)) S.trade = null;
    ev.push({ e: 'bankrupt', p: p, to: to });
    say(S, x.name + ' is bankrupt' + (to >= 0 ? ', and everything goes to ' + S.players[to].name : '; the bank takes the property back') + '.', p);
  }

  // ── Trades ──
  function tradeErr(S, f, to, T) {
    if (to === f || to < 0 || to >= S.players.length || S.players[to].out) return 'Pick someone to trade with';
    function side(p, s) {
      s = s || {};
      if ((s.cash || 0) < 0 || (s.cash || 0) > S.players[p].cash) return S.players[p].name + ' doesn’t have that much cash';
      if ((s.cards || 0) > S.players[p].cards.length) return S.players[p].name + ' doesn’t have that card';
      for (var i = 0; i < (s.props || []).length; i++) {
        var sq = s.props[i];
        if (S.own[sq] !== p) return SQ[sq].n + ' isn’t ' + S.players[p].name + '’s';
        if (sqGroupBuilt(S, sq)) return 'Sell the buildings on the ' + GROUPS[SQ[sq].g].n + ' group before trading ' + SQ[sq].n;
      }
      return null;
    }
    var e = side(f, T.give) || side(to, T.get); if (e) return e;
    var n = (T.give.cash || 0) + (T.get.cash || 0) + (T.give.props || []).length + (T.get.props || []).length + (T.give.cards || 0) + (T.get.cards || 0);
    if (!n) return 'Add something to the trade';
    return null;
  }
  function doTrade(S, ev, T) {
    var f = T.f, to = T.to;
    function move(from, dest, s) {
      s = s || {};
      if (s.cash) { S.players[from].cash -= s.cash; S.players[dest].cash += s.cash; ev.push({ e: 'pay', f: from, t: dest, a: s.cash, w: 'trade' }); }
      (s.props || []).forEach(function (sq) {
        S.own[sq] = dest;
        if (S.mort[sq]) { charge(S, ev, dest, BANK, interest(sq), 'interest', sq); if (S.fresh.indexOf(sq) < 0) S.fresh.push(sq); }
      });
      for (var k = 0; k < (s.cards || 0); k++) S.players[dest].cards.push(S.players[from].cards.pop());
    }
    move(f, to, T.give); move(to, f, T.get);
    S.st[f].trades++; S.st[to].trades++;
    ev.push({ e: 'trade', f: f, to: to });
    say(S, S.players[f].name + ' and ' + S.players[to].name + ' make a trade: ' + tradeText(S, T) + '.', f);
  }
  function sideText(S, s) {
    var b = [];
    (s.props || []).forEach(function (sq) { b.push(SQ[sq].n + (S.mort[sq] ? ' (mortgaged)' : '')); });
    if (s.cards) b.push(s.cards === 1 ? 'a Get Out of Jail Free card' : s.cards + ' Get Out of Jail Free cards');
    if (s.cash) b.push(money(s.cash));
    return b.length ? b.join(', ') : 'nothing';
  }
  function tradeText(S, T) { return S.players[T.f].name + ' gives ' + sideText(S, T.give) + ' for ' + sideText(S, T.get); }

  // ── Building rules ──
  function canBuild(S, p, sq) {
    var s = SQ[sq]; if (!s || s.k !== 'st') return 'Only streets can have houses';
    if (S.own[sq] !== p) return 'That isn’t yours';
    if (!ownsGroup(S, p, s.g)) return 'You need the whole ' + GROUPS[s.g].n + ' group to build';
    if (GSQ[s.g].some(function (x) { return S.mort[x]; })) return 'Pay off the mortgages on the ' + GROUPS[s.g].n + ' group first';
    var n = S.hs[sq]; if (n >= 5) return 'It already has a hotel';
    var min = Math.min.apply(null, GSQ[s.g].map(function (x) { return S.hs[x]; }));
    if (n > min) return 'Build evenly: put a house on the others in the group first';
    if (n === 4 && S.bankT < 1) return 'The bank is out of hotels';
    if (n < 4 && S.bankH < 1) return 'The bank is out of houses';
    if (S.players[p].cash < s.h) return 'Not enough cash (' + money(s.h) + ' needed)';
    return null;
  }
  function canSell(S, p, sq) {
    var s = SQ[sq]; if (!s || S.own[sq] !== p || !S.hs[sq]) return 'Nothing to sell there';
    var max = Math.max.apply(null, GSQ[s.g].map(function (x) { return S.hs[x]; }));
    if (S.hs[sq] < max) return 'Sell evenly: take from the others in the group first';
    if (S.hs[sq] === 5 && S.bankH < 4) return 'The bank needs 4 houses to swap for the hotel. Sell the whole group instead';
    return null;
  }
  function canMort(S, p, sq) {
    var s = SQ[sq]; if (!s || !s.p || S.own[sq] !== p) return 'That isn’t yours';
    if (S.mort[sq]) return 'It’s already mortgaged';
    if (sqGroupBuilt(S, sq)) return 'Sell the buildings on the ' + GROUPS[s.g].n + ' group first';
    return null;
  }

  // ── Who acts now ──
  function needs(S) {
    switch (S.phase) {
      case 'roll': case 'done': case 'buy': return S.cur;
      case 'auction': return S.auction ? S.auction.act[S.auction.i] : -1;
      case 'debt': return S.debt ? S.debt.f : -1;
      case 'trade': return S.trade ? S.trade.to : -1;
    }
    return -1;
  }

  // ── Actions ──
  function act(S, a) {
    var ev = [], err = null, p = a.p, me = S.players[p];
    if (!me) return { ok: false, err: 'No such player', ev: ev };
    if (S.phase === 'over') return { ok: false, err: 'The game is over', ev: ev };
    if (me.out) return { ok: false, err: me.name + ' is out of the game', ev: ev };
    var turnActs = { roll: 1, payJail: 1, useCard: 1, buy: 1, decline: 1, endTurn: 1 };
    if (turnActs[a.t] && p !== S.cur) return { ok: false, err: 'It isn’t your turn', ev: ev };
    switch (a.t) {
      case 'roll': {
        if (S.phase !== 'roll') { err = 'You can’t roll now'; break; }
        var d = roll2(), sum = d[0] + d[1], dbl = d[0] === d[1];
        S.dice = d; ev.push({ e: 'dice', p: p, d: d });
        if (dbl) S.st[p].dbl++;
        if (me.jail) {
          if (dbl) {
            me.jail = false; me.tries = 0; S.again = false;
            ev.push({ e: 'free', p: p, how: 'doubles' });
            say(S, me.name + ' rolls doubles (' + d[0] + ' and ' + d[1] + ') and is out of Jail.', p);
            moveTo(S, ev, p, (me.pos + sum) % 40);
            if (land(S, ev, p, sum)) finish(S, ev);
          } else {
            me.tries++;
            if (me.tries >= 3) {
              say(S, me.name + ' misses a third time and must pay the $50 fine.', p);
              me.jail = false; me.tries = 0; S.again = false;
              ev.push({ e: 'free', p: p, how: 'fine' });
              charge(S, ev, p, BANK, 50, 'jail');
              S.cont = { k: 'move', n: sum };
              finish(S, ev);
            } else {
              say(S, me.name + ' rolls ' + d[0] + ' and ' + d[1] + ': no doubles, still in Jail (try ' + me.tries + ' of 3).', p);
              S.phase = 'done';
            }
          }
          break;
        }
        S.again = dbl;
        if (dbl) {
          S.dbl++;
          if (S.dbl >= 3) { say(S, me.name + ' rolls doubles three times in a row.', p); toJail(S, ev, p, 'three doubles'); S.phase = 'done'; break; }
        }
        say(S, me.name + ' rolls ' + d[0] + ' and ' + d[1] + (dbl ? ' (doubles)' : '') + '.', p);
        moveTo(S, ev, p, (me.pos + sum) % 40);
        if (land(S, ev, p, sum)) finish(S, ev);
        break;
      }
      case 'payJail': case 'useCard': {
        if (S.phase !== 'roll' || !me.jail) { err = 'You’re not in Jail'; break; }
        if (a.t === 'payJail') {
          if (me.cash < 50) { err = 'You need $50 to pay the fine'; break; }
          me.cash -= 50; if (S.opts.fp) S.pot += 50;
          ev.push({ e: 'pay', f: p, t: S.opts.fp ? -2 : BANK, a: 50, w: 'jail' });
          say(S, me.name + ' pays $50 to get out of Jail.', p);
        } else {
          if (!me.cards.length) { err = 'You don’t have a Get Out of Jail Free card'; break; }
          var k = me.cards.shift(); S.deck[k.slice(0, 2)].push(+k.slice(2));
          say(S, me.name + ' uses a Get Out of Jail Free card.', p);
        }
        me.jail = false; me.tries = 0;
        ev.push({ e: 'free', p: p, how: a.t === 'payJail' ? 'paid' : 'card' });
        break;
      }
      case 'buy': {
        if (S.phase !== 'buy' || !S.offer) { err = 'Nothing to buy'; break; }
        var sq = S.offer.sq, s = SQ[sq];
        if (me.cash < s.p) { err = 'Not enough cash. Mortgage or sell something first, or let it go to auction.'; break; }
        me.cash -= s.p; S.own[sq] = p; S.offer = null; S.st[p].bought++;
        ev.push({ e: 'pay', f: p, t: BANK, a: s.p, w: 'buy' }); ev.push({ e: 'buy', p: p, sq: sq });
        say(S, me.name + ' buys ' + s.n + ' for ' + money(s.p) + '.', p);
        finish(S, ev);
        break;
      }
      case 'decline': {
        if (S.phase !== 'buy' || !S.offer) { err = 'Nothing to decline'; break; }
        var sq2 = S.offer.sq; S.offer = null;
        if (S.opts.noAuction) { say(S, me.name + ' passes on ' + SQ[sq2].n + '.', p); finish(S, ev); }
        else { say(S, me.name + ' doesn’t buy ' + SQ[sq2].n + '.', p); startAuction(S, ev, sq2); }
        break;
      }
      case 'bid': case 'pass': {
        var A = S.auction;
        if (S.phase !== 'auction' || !A || A.act[A.i] !== p) { err = 'It isn’t your bid'; break; }
        if (a.t === 'bid') {
          var amt = Math.floor(+a.amt || 0);
          if (amt <= A.high) { err = 'Bid more than ' + money(A.high); break; }
          if (amt > me.cash) { err = 'You only have ' + money(me.cash); break; }
          A.high = amt; A.hb = p; A.i = (A.i + 1) % A.act.length;
          ev.push({ e: 'bid', p: p, a: amt });
        } else {
          A.act.splice(A.i, 1); if (A.i >= A.act.length) A.i = 0;
          ev.push({ e: 'bid', p: p, a: 0 });
        }
        skipBroke(S, ev);
        if (S.auction) auctionDone(S, ev);
        break;
      }
      case 'endTurn': {
        if (S.phase !== 'done') { err = S.phase === 'roll' ? 'Roll first' : 'Finish what’s happening first'; break; }
        nextTurn(S, ev);
        break;
      }
      case 'pay': {
        var D = S.debt;
        if (S.phase !== 'debt' || !D || D.f !== p) { err = 'You don’t owe anything'; break; }
        if (me.cash < D.a) { err = 'You need ' + money(D.a - me.cash) + ' more'; break; }
        S.debt = null; S.dq.shift(); transfer(S, ev, D);
        S.phase = S.dret || 'done'; S.dret = null;
        resumeAfterDebt(S, ev);
        break;
      }
      case 'bankrupt': {
        var D2 = S.debt;
        if (S.phase !== 'debt' || !D2 || D2.f !== p) { err = 'You can only go bankrupt when you can’t pay a debt'; break; }
        if (liquid(S, p) >= D2.a) { err = 'You can still raise the money: sell buildings or mortgage property'; break; }
        S.debt = null; S.dq.shift();
        S.phase = S.dret || 'done'; S.dret = null;
        goBankrupt(S, ev, p, D2.t);
        if (checkOver(S, ev)) break;
        resumeAfterDebt(S, ev);
        break;
      }
      case 'build': {
        err = canBuild(S, p, a.sq); if (err) break;
        var s3 = SQ[a.sq], n3 = S.hs[a.sq];
        me.cash -= s3.h;
        if (n3 === 4) { S.bankT--; S.bankH += 4; } else S.bankH--;
        S.hs[a.sq] = n3 + 1; S.st[p].built++;
        ev.push({ e: 'pay', f: p, t: BANK, a: s3.h, w: 'build' }); ev.push({ e: 'build', p: p, sq: a.sq, n: n3 + 1 });
        say(S, me.name + ' builds ' + (n3 === 4 ? 'a hotel' : 'a house') + ' on ' + s3.n + '.', p);
        break;
      }
      case 'sell': {
        err = canSell(S, p, a.sq); if (err) break;
        var s4 = SQ[a.sq], n4 = S.hs[a.sq];
        if (n4 === 5) { S.bankT++; S.bankH -= 4; } else S.bankH++;
        S.hs[a.sq] = n4 - 1; me.cash += s4.h / 2;
        ev.push({ e: 'pay', f: BANK, t: p, a: s4.h / 2, w: 'sell' }); ev.push({ e: 'sell', p: p, sq: a.sq, n: n4 - 1 });
        say(S, me.name + ' sells ' + (n4 === 5 ? 'the hotel' : 'a house') + ' on ' + s4.n + ' for ' + money(s4.h / 2) + '.', p);
        break;
      }
      case 'sellAll': {
        var g = a.g; if (g == null || !GSQ[g] || !GSQ[g].every(function (x) { return S.own[x] === p; }) || !groupHasBuildings(S, g)) { err = 'Nothing to sell there'; break; }
        var got = 0;
        GSQ[g].forEach(function (x) { var n5 = S.hs[x]; if (!n5) return; got += n5 * SQ[x].h / 2; if (n5 === 5) S.bankT++; else S.bankH += n5; S.hs[x] = 0; ev.push({ e: 'sell', p: p, sq: x, n: 0 }); });
        me.cash += got; ev.push({ e: 'pay', f: BANK, t: p, a: got, w: 'sell' });
        say(S, me.name + ' sells all the buildings on the ' + GROUPS[g].n + ' group for ' + money(got) + '.', p);
        break;
      }
      case 'mort': {
        err = canMort(S, p, a.sq); if (err) break;
        S.mort[a.sq] = 1; me.cash += SQ[a.sq].m;
        ev.push({ e: 'pay', f: BANK, t: p, a: SQ[a.sq].m, w: 'mortgage' }); ev.push({ e: 'mort', p: p, sq: a.sq });
        say(S, me.name + ' mortgages ' + SQ[a.sq].n + ' for ' + money(SQ[a.sq].m) + '.', p);
        break;
      }
      case 'unmort': {
        if (S.own[a.sq] !== p || !S.mort[a.sq]) { err = 'That isn’t mortgaged'; break; }
        var cst = unmortCost(S, a.sq);
        if (me.cash < cst) { err = 'You need ' + money(cst) + ' to pay off the mortgage'; break; }
        me.cash -= cst; S.mort[a.sq] = 0;
        ev.push({ e: 'pay', f: p, t: BANK, a: cst, w: 'unmortgage' }); ev.push({ e: 'unmort', p: p, sq: a.sq });
        say(S, me.name + ' pays off the mortgage on ' + SQ[a.sq].n + ' (' + money(cst) + ').', p);
        break;
      }
      case 'propose': {
        if (S.trade) { err = 'Another trade is waiting for an answer'; break; }
        if (!/^(roll|done|debt)$/.test(S.phase)) { err = 'Trades wait until this is settled'; break; }
        var T = { f: p, to: a.to, give: clean(a.give), get: clean(a.get) };
        err = tradeErr(S, p, a.to, T); if (err) break;
        S.trade = T; T.ret = S.phase; S.phase = 'trade';
        ev.push({ e: 'offer', f: p, to: a.to });
        say(S, me.name + ' offers ' + S.players[a.to].name + ' a trade.', p);
        break;
      }
      case 'answer': case 'cancel': {
        var T2 = S.trade;
        if (S.phase !== 'trade' || !T2) { err = 'No trade waiting'; break; }
        if (a.t === 'answer' && T2.to !== p) { err = 'That trade isn’t for you'; break; }
        if (a.t === 'cancel' && T2.f !== p) { err = 'That isn’t your trade'; break; }
        S.trade = null; S.phase = T2.ret;
        if (a.t === 'answer' && a.ok) {
          var e2 = tradeErr(S, T2.f, T2.to, T2);
          if (e2) { say(S, 'The trade fell through: ' + e2 + '.', -1); ev.push({ e: 'tradeNo', f: T2.f, to: T2.to }); break; }
          doTrade(S, ev, T2);
          // a debt that was waiting may be payable now (and mortgaged property brings interest to pay)
          if (S.phase === 'debt') { S.phase = S.dret || 'done'; S.dret = null; S.debt = null; resumeAfterDebt(S, ev); }
          else if (S.dq.length) { S.ret = S.phase; if (settle(S, ev)) { S.phase = S.ret; S.ret = null; } }
        } else {
          ev.push({ e: 'tradeNo', f: T2.f, to: T2.to });
          say(S, a.t === 'cancel' ? me.name + ' takes the offer back.' : me.name + ' turns down the trade.', p);
          var key = T2.f + '>' + T2.to + ':' + JSON.stringify([T2.give, T2.get]);
          var bm = S.bm[T2.f] = S.bm[T2.f] || {}; bm.no = (bm.no || []).concat([key]).slice(-12);
        }
        break;
      }
      default: err = 'Unknown action';
    }
    return { ok: !err, err: err, ev: ev };
  }
  function clean(s) {
    s = s || {};
    return { cash: Math.max(0, Math.floor(+s.cash || 0)), props: (s.props || []).map(Number).filter(function (x, i, a) { return SQ[x] && SQ[x].p && a.indexOf(x) === i; }), cards: Math.max(0, Math.floor(+s.cards || 0)) };
  }
  // After a debt is paid or written off: the next queued debt, else back to whatever was going on
  function resumeAfterDebt(S, ev) {
    if (S.dq.length && !settle(S, ev)) return;
    if (S.phase === 'trade' && !S.trade) S.phase = 'done';
    if (S.phase === 'auction' && S.auction) { skipBroke(S, ev); return; }
    if (S.ret) { var r = S.ret; S.ret = null; S.phase = r; if (S.phase === 'over') return; if (r === 'roll' || r === 'done') { if (S.players[S.cur].out) { if (!checkOver(S, ev)) nextTurn(S, ev); } return; } }
    finish(S, ev);
  }

  // ═══ The computer players ════════════════════════════════════════════════
  // A position's value to player p: cash, property (complete groups are worth much more), less the danger of
  // the other players' complete groups. Used for buying, bidding and trading.
  var GROUP_W = [0.8, 1.05, 1.0, 1.25, 1.2, 1.05, 0.95, 1.05];   // how good each group is to own (orange and red land most)
  function evalP(S, p) {
    var v = 0, need = 350;
    for (var g = 0; g < 8; g++) {
      var sqs = GSQ[g], mine = 0, theirs = {}, base = 0, toBuild = 0;
      sqs.forEach(function (s) { var o = S.own[s]; if (o === p) { mine++; base += SQ[s].p * (S.mort[s] ? 0.55 : 1) + S.hs[s] * SQ[s].h * 1.1; toBuild += (5 - S.hs[s]) * SQ[s].h; } else if (o >= 0) theirs[o] = (theirs[o] || 0) + 1; });
      if (mine === sqs.length) { v += base * 1.9 * GROUP_W[g] + 150; need += toBuild; }
      else if (mine) v += base * (1 + 0.3 * (mine - 1)) * (Object.keys(theirs).length ? 0.95 : 1);
      Object.keys(theirs).forEach(function (q) {
        q = +q; if (S.players[q].out) return;
        if (theirs[q] === sqs.length) { var gb = 0; sqs.forEach(function (s) { gb += SQ[s].p + S.hs[s] * SQ[s].h * 1.4; }); v -= gb * 0.6 * GROUP_W[g] + 60; }
        else if (theirs[q] === sqs.length - 1 && mine === 1) v += 50;   // blocking someone's group
      });
    }
    [RRS, UTS].forEach(function (list, u) {
      var n = countOwned(S, p, list), each = u ? 150 : 200;
      list.forEach(function (s) { if (S.own[s] === p) v += each * (S.mort[s] ? 0.55 : 1) * (1 + (u ? 0.15 : 0.22) * (n - 1)); });
    });
    // cash counts in full up to what this player can use (a safety cushion and building its groups); beyond that, less
    var c = S.players[p].cash;
    return v + Math.min(c, need) + 0.35 * Math.max(0, c - need);
  }
  // just what evalP reads, so the computer can try thousands of trades quickly
  function lite(S) { return { players: S.players.map(function (x) { return { cash: x.cash, out: x.out }; }), own: S.own.slice(), hs: S.hs.slice(), mort: S.mort.slice() }; }
  function liteTrade(t, T) {
    function mv(from, dest, s) {
      if (s.cash) { t.players[from].cash -= s.cash; t.players[dest].cash += s.cash; }
      (s.props || []).forEach(function (sq) { t.own[sq] = dest; if (t.mort[sq]) t.players[dest].cash -= interest(sq); });
      if (s.cards) { t.players[from].cash -= 40 * s.cards; t.players[dest].cash += 40 * s.cards; }   // a card is worth about $40
    }
    mv(T.f, T.to, T.give); mv(T.to, T.f, T.get);
    return t;
  }
  // the most anyone could charge right now: how much cash a careful player keeps
  function danger(S, p) {
    var mx = 0;
    S.own.forEach(function (o, i) { if (o < 0 || o === p || S.mort[i] || S.players[o].out) return; var r = SQ[i].k === 'ut' ? (countOwned(S, o, UTS) === 2 ? 70 : 28) : rent(S, i, 7); if (r > mx) mx = r; });
    return mx;
  }
  function reserve(S, p) { var d = danger(S, p); return Math.max(60, Math.min(700, d * 0.55)); }
  function unownedLeft(S) { var n = 0; OWNABLE.forEach(function (s) { if (S.own[s] < 0) n++; }); return n; }
  // how much p would pay for sq (the value it adds, with a little sense about cash)
  function wantFor(S, p, sq) {
    var t = lite(S); var before = evalP(t, p); t.own[sq] = p; var after = evalP(t, p) + SQ[sq].p;   // value of the property itself, cash not spent
    var gainV = after - before;
    // whether someone else would complete a group with it: worth paying extra to keep it from them
    var s = SQ[sq], block = 0;
    if (s.k === 'st') S.players.forEach(function (x, q) { if (q === p || x.out) return; if (countOwned(S, q, GSQ[s.g]) === GSQ[s.g].length - 1) block = Math.max(block, s.p * 0.6); });
    return Math.round(gainV + block);
  }
  function botBuy(S, p) {
    var sq = S.offer.sq, s = SQ[sq], me = S.players[p];
    if (me.cash < s.p) return false;
    var left = me.cash - s.p, res = reserve(S, p) * (unownedLeft(S) > 14 ? 0.35 : 0.8);
    var want = wantFor(S, p, sq);
    if (want > s.p * 1.4 && left >= 20) return true;   // completes a group or blocks one
    return left >= res;
  }
  function botMaxBid(S, p, sq) {
    var me = S.players[p], w = wantFor(S, p, sq), cap = me.cash - reserve(S, p) * 0.5;
    var mx = Math.min(w * (0.85 + (p % 3) * 0.05), cap);
    if (w > SQ[sq].p * 1.4) mx = Math.min(w, me.cash - 20);
    return Math.max(0, Math.floor(mx));
  }
  // the next step toward raising money: mortgage loose property, then sell buildings, then mortgage the rest
  function raiseStep(S, p) {
    var mine = []; S.own.forEach(function (o, i) { if (o === p) mine.push(i); });
    var loose = mine.filter(function (i) { return !S.mort[i] && !(SQ[i].k === 'st' && ownsGroup(S, p, SQ[i].g)); });
    loose.sort(function (a, b) { return SQ[a].m - SQ[b].m; });
    if (loose.length) return { t: 'mort', p: p, sq: loose[0] };
    var built = mine.filter(function (i) { return S.hs[i] > 0 && !canSell(S, p, i); });
    built.sort(function (a, b) { return GROUP_W[SQ[a].g] - GROUP_W[SQ[b].g] || SQ[a].p - SQ[b].p; });
    if (built.length) return { t: 'sell', p: p, sq: built[0] };
    var g = -1; mine.forEach(function (i) { if (S.hs[i] > 0 && g < 0) g = SQ[i].g; });
    if (g >= 0) return { t: 'sellAll', p: p, g: g };
    var rest = mine.filter(function (i) { return !S.mort[i] && !canMort(S, p, i); });
    rest.sort(function (a, b) { return SQ[a].m - SQ[b].m; });
    if (rest.length) return { t: 'mort', p: p, sq: rest[0] };
    return null;
  }
  // building and paying off mortgages when there's money to spare
  function botManage(S, p) {
    var me = S.players[p], res = reserve(S, p);
    // pay off mortgages on complete groups first (so they can be built on)
    var best = null;
    for (var g = 0; g < 8; g++) {
      if (!ownsGroup(S, p, g)) continue;
      var mm = GSQ[g].filter(function (s) { return S.mort[s]; });
      if (mm.length) { var c = unmortCost(S, mm[0]); if (me.cash - c >= res * 0.6) return { t: 'unmort', p: p, sq: mm[0] }; continue; }
      GSQ[g].forEach(function (s) {
        if (canBuild(S, p, s)) return;
        var score = GROUP_W[g] * 10 - S.hs[s] * 2 + (S.hs[s] < 3 ? 3 : 0);
        if (!best || score > best.score) best = { sq: s, score: score };
      });
    }
    if (best && me.cash - SQ[best.sq].h >= res) return { t: 'build', p: p, sq: best.sq };
    if (best) return null;
    // otherwise pay off other mortgages when rich
    var mm2 = []; S.own.forEach(function (o, i) { if (o === p && S.mort[i]) mm2.push(i); });
    mm2.sort(function (a, b) { return SQ[b].p - SQ[a].p; });
    if (mm2.length && me.cash - unmortCost(S, mm2[0]) >= res + 200) return { t: 'unmort', p: p, sq: mm2[0] };
    return null;
  }
  // A trade the computer would like to offer: get the last piece of a group, for a swap and/or cash
  function botTrade(S, p) {
    var me = S.players[p], bm = S.bm[p] = S.bm[p] || {};
    if (bm.lt && S.turn - bm.lt < 2 * active(S).length) return null;
    bm.lt = S.turn;   // looks again in a couple of rounds, offer or not
    var base = evalP(S, p), best = null;
    for (var g = 0; g < 8; g++) {
      var sqs = GSQ[g], mine = countOwned(S, p, sqs);
      if (mine === 0 || mine < sqs.length - 1) continue;
      var missing = sqs.filter(function (s) { return S.own[s] !== p; });
      if (missing.length !== 1) continue;
      var m = missing[0], q = S.own[m];
      if (q < 0 || S.players[q].out) continue;
      // things p could give: any of its own property outside this group, or nothing; plus cash
      var gives = [null];
      S.own.forEach(function (o, i) { if (o === p && !(SQ[i].k === 'st' && SQ[i].g === g) && !sqGroupBuilt(S, i)) gives.push(i); });
      var qBase = evalP(S, q);
      gives.forEach(function (y) {
        function at(cash) {
          var T = { f: p, to: q, give: { cash: cash, props: y == null ? [] : [y], cards: 0 }, get: { cash: 0, props: [m], cards: 0 } };
          var t = liteTrade(lite(S), T);
          return { T: T, mine: evalP(t, p) - base, theirs: evalP(t, q) - qBase };
        }
        // the least cash that makes it worth their while (their gain grows with the cash, ours shrinks)
        var lo = y == null ? 10 : 0, hi = Math.max(0, me.cash - 60), r = at(lo);
        if (r.theirs <= 25) {
          if (hi <= lo || at(hi).theirs <= 25) return;
          while (hi - lo > 10) { var mid = Math.floor((lo + hi) / 2); if (at(mid).theirs > 25) hi = mid; else lo = mid; }
          r = at(Math.ceil(hi / 10) * 10 > me.cash - 60 ? hi : Math.ceil(hi / 10) * 10);
        }
        if (r.mine < 80 || r.theirs <= 25) return;
        var key = p + '>' + q + ':' + JSON.stringify([r.T.give, r.T.get]);
        if ((bm.no || []).indexOf(key) >= 0) return;
        if (!best || r.mine - r.theirs > best.score) best = { T: r.T, score: r.mine - r.theirs };
      });
    }
    if (!best) return null;
    return { t: 'propose', p: p, to: best.T.to, give: best.T.give, get: best.T.get };
  }
  function botAnswer(S, p) {
    var T = S.trade, t = liteTrade(lite(S), T);
    var gainV = evalP(t, p) - evalP(S, p);
    return { t: 'answer', p: p, ok: gainV > 20 };
  }
  function bot(S, p) {
    if (S.phase === 'over' || needs(S) !== p) return null;
    var me = S.players[p];
    switch (S.phase) {
      case 'roll': {
        var mg = botManage(S, p); if (mg) return mg;
        var tr = botTrade(S, p); if (tr) return tr;
        if (me.jail) {
          var early = unownedLeft(S) > 8, dng = danger(S, p) > 300;
          if (!dng || early) {
            if (me.cards.length) return { t: 'useCard', p: p };
            if (me.cash >= 50 + reserve(S, p) * 0.5 && early) return { t: 'payJail', p: p };
          }
        }
        return { t: 'roll', p: p };
      }
      case 'done': { var mg2 = botManage(S, p); if (mg2) return mg2; return { t: 'endTurn', p: p }; }
      case 'buy': {
        if (botBuy(S, p)) return { t: 'buy', p: p };
        // short of cash for a property it really wants: mortgage something loose first
        var sq = S.offer.sq;
        if (me.cash < SQ[sq].p && wantFor(S, p, sq) > SQ[sq].p * 1.4 && liquid(S, p) - SQ[sq].p > 150) {
          var rs = raiseStep(S, p); if (rs && rs.t === 'mort') return rs;
        }
        return { t: 'decline', p: p };
      }
      case 'auction': {
        var A = S.auction, mx = botMaxBid(S, p, A.sq), next = A.high + (A.high < 40 ? 10 : A.high < 200 ? 10 : 20);
        if (A.high === 0) next = Math.min(Math.max(10, Math.floor(SQ[A.sq].p * 0.3 / 10) * 10), mx);
        if (next > A.high && next <= mx) return { t: 'bid', p: p, amt: next };
        if (A.high + 1 <= mx) return { t: 'bid', p: p, amt: A.high + 1 };
        return { t: 'pass', p: p };
      }
      case 'debt': {
        if (me.cash >= S.debt.a) return { t: 'pay', p: p };
        var st = raiseStep(S, p);
        if (st) return st;
        return { t: 'bankrupt', p: p };
      }
      case 'trade': return botAnswer(S, p);
    }
    return null;
  }

  var api = {
    SQ: SQ, GROUPS: GROUPS, GSQ: GSQ, RRS: RRS, UTS: UTS, OWNABLE: OWNABLE, CHANCE: CHANCE, CHEST: CHEST, TOKENS: TOKENS, BANK: BANK,
    newGame: newGame, act: act, needs: needs, bot: bot, rent: rent, worth: worth, liquid: liquid, unmortCost: unmortCost, interest: interest,
    canBuild: canBuild, canSell: canSell, canMort: canMort, tradeErr: tradeErr, tradeText: tradeText, sideText: sideText, ownsGroup: ownsGroup,
    countOwned: countOwned, houses: houses, evalP: evalP, money: money, active: active, richest: richest, limitHit: limitHit,
    setRandom: function (f) { rand = f || Math.random; }, forceDice: function (list) { forced = forced.concat(list); }, clearDice: function () { forced = []; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MonoEngine = api;
})(this);
