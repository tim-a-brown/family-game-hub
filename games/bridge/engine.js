// ═══════════════════════════════════════════════════════════════════════════
// Bridge: the rules engine (window.BridgeEngine, and module.exports for Node's robot tests).
// No DOM here. The page (games/bridge.html) draws; this file deals, keeps the auction legal, scores, and holds the
// computer's bidding system (bid.js-style rules, below) and card play.
//
// Rules: the Laws of Contract Bridge as the ACBL publishes them for rubber bridge, with its Chicago (four-deal)
// form. Seats: 0 South, 1 West, 2 North, 3 East; the next seat clockwise is (p + 1) % 4, so a player's left-hand
// opponent is p + 1. Sides: p % 2 (0 North-South, 1 East-West).
//
// Calls are strings: '1C'..'7N' (strains C D H S N), 'P', 'X' (double), 'XX' (redouble).
// Cards: {r: '2'..'10','J','Q','K','A', s: 'c'|'d'|'h'|'s', id: 'Qh'}.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var SUITS = ['c', 'd', 'h', 's'], STR = ['C', 'D', 'H', 'S', 'N'];
  var RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  var RV = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14 };
  var RN = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  var SEAT = ['South', 'West', 'North', 'East'], SEAT1 = ['S', 'W', 'N', 'E'];
  var SUITWORD = { c: 'clubs', d: 'diamonds', h: 'hearts', s: 'spades' };
  var SUIT1 = { c: 'club', d: 'diamond', h: 'heart', s: 'spade' };
  var GLYPH = { c: '♣', d: '♦', h: '♥', s: '♠', n: 'NT' };
  function sIdx(s) { return SUITS.indexOf(s); }
  function stOf(call) { return STR.indexOf(call.charAt(1)); }   // 0..4
  function lvOf(call) { return +call.charAt(0); }
  function isBid(c) { return /^[1-7][CDHSN]$/.test(c); }
  function bidRank(c) { return (lvOf(c) - 1) * 5 + stOf(c); }
  function mkBid(l, st) { return l + STR[st]; }
  function suitOfSt(st) { return st < 4 ? SUITS[st] : null; }
  function side(p) { return p % 2; }
  function partner(p) { return (p + 2) % 4; }
  function cid(r, s) { return r + s; }
  // A call as people say it: "1♥", "3NT", "Pass", "Double", "Redouble"
  function callText(c, long) {
    if (c === 'P') return 'Pass'; if (c === 'X') return long ? 'Double' : 'X'; if (c === 'XX') return long ? 'Redouble' : 'XX';
    var st = stOf(c); return lvOf(c) + (st === 4 ? 'NT' : GLYPH[SUITS[st]]);
  }
  function callWords(c) {
    if (c === 'P') return 'Pass'; if (c === 'X') return 'Double'; if (c === 'XX') return 'Redouble';
    var st = stOf(c); return lvOf(c) + ' ' + (st === 4 ? 'notrump' : SUITWORD[SUITS[st]]);
  }

  // ── Random numbers (seedable, so the Node tests repeat) ──
  var rnd = Math.random;
  function seed(s) {
    if (s == null) { rnd = Math.random; return; }
    var a = s >>> 0;
    rnd = function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function R() { return rnd(); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function deck() { var d = []; SUITS.forEach(function (s) { RANKS.forEach(function (r) { d.push({ r: r, s: s, id: cid(r, s) }); }); }); return d; }
  function sortHand(h) {   // spades, hearts, clubs, diamonds (black and red alternate), high to low
    var O = { s: 0, h: 1, c: 2, d: 3 };
    return h.sort(function (a, b) { return O[a.s] - O[b.s] || RV[b.r] - RV[a.r]; });
  }
  function deal() {
    var d = shuffle(deck()), hands = [[], [], [], []];
    d.forEach(function (c, i) { hands[i % 4].push(c); });
    hands.forEach(sortHand);
    return hands;
  }
  // PBN-style text for one hand: spades.hearts.diamonds.clubs, ranks high to low, T for ten ("AK52.QJ3.T9.874")
  function handPbn(h) {
    return ['s', 'h', 'd', 'c'].map(function (s) {
      return h.filter(function (c) { return c.s === s; }).sort(function (a, b) { return RV[b.r] - RV[a.r]; }).map(function (c) { return c.r === '10' ? 'T' : c.r; }).join('');
    }).join('.');
  }
  function pbnHand(t) {
    var out = [], parts = String(t || '').split('.');
    ['s', 'h', 'd', 'c'].forEach(function (s, i) { (parts[i] || '').split('').forEach(function (ch) { var r = ch === 'T' ? '10' : ch; if (RV[r]) out.push({ r: r, s: s, id: cid(r, s) }); }); });
    return out;
  }
  function code(c) { return (c.r === '10' ? 'T' : c.r) + c.s; }
  function uncode(k) { var r = k.charAt(0) === 'T' ? '10' : k.charAt(0), s = k.charAt(1); return { r: r, s: s, id: cid(r, s) }; }

  // ── The auction ──────────────────────────────────────────────────────────
  // calls: [call strings], first by the dealer. Returns the facts the laws care about.
  function auction(calls, dealer) {
    var o = { last: null, lastBy: -1, dbl: 0, dblBy: -1, passes: 0, over: false, passedOut: false, n: calls.length, turn: (dealer + calls.length) % 4 };
    calls.forEach(function (c, i) {
      var by = (dealer + i) % 4;
      if (c === 'P') o.passes++;
      else { o.passes = 0; if (isBid(c)) { o.last = c; o.lastBy = by; o.dbl = 0; o.dblBy = -1; } else if (c === 'X') { o.dbl = 1; o.dblBy = by; } else if (c === 'XX') { o.dbl = 2; o.dblBy = by; } }
    });
    if (calls.length >= 4 && !o.last && o.passes >= 4) { o.over = true; o.passedOut = true; }
    else if (o.last && o.passes >= 3) o.over = true;
    return o;
  }
  // Every call the player whose turn it is may make now
  function legalCalls(calls, dealer) {
    var a = auction(calls, dealer), out = ['P'];
    if (a.over) return [];
    var me = a.turn, from = a.last ? bidRank(a.last) + 1 : 0;
    for (var k = from; k < 35; k++) out.push(mkBid(Math.floor(k / 5) + 1, k % 5));
    if (a.last && a.dbl === 0 && side(a.lastBy) !== side(me)) out.push('X');
    if (a.last && a.dbl === 1 && side(a.dblBy) !== side(me)) out.push('XX');
    return out;
  }
  function isLegal(calls, dealer, c) { return legalCalls(calls, dealer).indexOf(c) >= 0; }
  // The final contract: {lvl, st, dbl, decl} (declarer: the first of the side to name the strain), or null when passed out
  function contract(calls, dealer) {
    var a = auction(calls, dealer); if (!a.last) return null;
    var st = stOf(a.last), sd = side(a.lastBy), decl = a.lastBy;
    for (var i = 0; i < calls.length; i++) { var by = (dealer + i) % 4; if (isBid(calls[i]) && side(by) === sd && stOf(calls[i]) === st) { decl = by; break; } }
    return { lvl: lvOf(a.last), st: st, dbl: a.dbl, decl: decl };
  }
  function contractText(k, words) {
    if (!k) return words ? 'Passed out' : 'Pass';
    return k.lvl + (k.st === 4 ? (words ? ' notrump' : 'NT') : (words ? ' ' + SUITWORD[SUITS[k.st]] : GLYPH[SUITS[k.st]])) + (k.dbl === 1 ? (words ? ' doubled' : ' X') : k.dbl === 2 ? (words ? ' redoubled' : ' XX') : '');
  }

  // ── Play ─────────────────────────────────────────────────────────────────
  function legalPlays(hand, trick) {
    if (!trick.length) return hand.slice();
    var led = trick[0].c.s, f = hand.filter(function (c) { return c.s === led; });
    return f.length ? f : hand.slice();
  }
  function beats(a, b, led, trump) {   // does card a beat card b (b already winning)?
    if (a.s === b.s) return RV[a.r] > RV[b.r];
    if (trump && a.s === trump) return true;
    return false;
  }
  function trickWinner(trick, trump) {
    var best = trick[0];
    for (var i = 1; i < trick.length; i++) if (beats(trick[i].c, best.c, trick[0].c.s, trump)) best = trick[i];
    return best.p;
  }

  // ── Scoring (ACBL rubber bridge; Chicago differs only in the bonuses) ──
  function trickValue(st) { return st < 2 ? 20 : 30; }
  // the points below the line for a made contract
  function belowPts(k) {
    var base = k.st === 4 ? 40 + 30 * (k.lvl - 1) : trickValue(k.st) * k.lvl;
    return base * (k.dbl === 2 ? 4 : k.dbl === 1 ? 2 : 1);
  }
  function underPts(n, vul, dbl) {
    if (n <= 0) return 0;
    if (!dbl) return n * (vul ? 100 : 50);
    var t = 0;
    for (var i = 1; i <= n; i++) t += vul ? (i === 1 ? 200 : 300) : (i === 1 ? 100 : i <= 3 ? 200 : 300);
    return t * (dbl === 2 ? 2 : 1);
  }
  // A deal's result: k contract, vul of the declaring side, took = tricks the declarer's side won
  // -> {made, over, down, below (declarer side), above: [{pts, why}] for the declarer side, def: [{pts, why}] for the defenders}
  function scoreContract(k, vul, took) {
    var need = 6 + k.lvl, o = { made: took >= need, over: Math.max(0, took - need), down: Math.max(0, need - took), below: 0, above: [], def: [] };
    if (o.made) {
      o.below = belowPts(k);
      if (o.over) {
        var ov = k.dbl ? o.over * (vul ? 200 : 100) * (k.dbl === 2 ? 2 : 1) : o.over * (k.st === 4 ? 30 : trickValue(k.st));
        o.above.push({ pts: ov, why: o.over === 1 ? 'Overtrick' : o.over + ' overtricks' });
      }
      if (k.dbl) o.above.push({ pts: k.dbl === 2 ? 100 : 50, why: k.dbl === 2 ? 'Making a redoubled contract' : 'Making a doubled contract' });
      if (k.lvl === 6) o.above.push({ pts: vul ? 750 : 500, why: 'Small slam' });
      if (k.lvl === 7) o.above.push({ pts: vul ? 1500 : 1000, why: 'Grand slam' });
    } else o.def.push({ pts: underPts(o.down, vul, k.dbl), why: o.down === 1 ? 'Down 1' : 'Down ' + o.down });
    return o;
  }
  // Honors: 4 or 5 of the trump honors in one hand, or all four aces in one hand at notrump (whoever holds them)
  function honors(hands, st) {
    for (var p = 0; p < 4; p++) {
      var h = hands[p];
      if (st === 4) { if (h.filter(function (c) { return c.r === 'A'; }).length === 4) return { p: p, pts: 150, why: 'Four aces' }; }
      else {
        var t = SUITS[st], n = h.filter(function (c) { return c.s === t && RV[c.r] >= 10; }).length;
        if (n === 5) return { p: p, pts: 150, why: 'All five trump honors' };
        if (n === 4) return { p: p, pts: 100, why: 'Four trump honors' };
      }
    }
    return null;
  }

  // ── The score pad ────────────────────────────────────────────────────────
  // pad: {fmt: 'chicago'|'rubber', games: [ns, ew], part: [ns, ew] (below the line in this game), g: game number,
  //       rows: [{s: side, pts, a: 1 above the line | 0 below, why, d: deal, g}], tot: [ns, ew], deals: [{...}], over}
  function newPad(fmt) { return { fmt: fmt === 'rubber' ? 'rubber' : 'chicago', games: [0, 0], part: [0, 0], g: 0, rows: [], tot: [0, 0], deals: [], over: false }; }
  // Chicago: deal 1 nobody, deals 2 and 3 the dealer's side, deal 4 both. Rubber: a side that has won a game.
  function vulOf(pad, dealNo, dealer) {
    if (pad.fmt === 'rubber') return [pad.games[0] > 0, pad.games[1] > 0];
    var n = ((dealNo - 1) % 4) + 1;
    if (n === 1) return [false, false];
    if (n === 4) return [true, true];
    return [side(dealer) === 0, side(dealer) === 1];
  }
  function vulCode(v) { return v[0] && v[1] ? 'B' : v[0] ? 'N' : v[1] ? 'E' : '-'; }
  // Record one deal on the pad. rec: {k (or null: passed out), took, hands (as dealt), dealer, dealNo}
  // Returns {res (scoreContract), hon, rows added, game (side that just made game or -1), bonus rows, over}
  function padDeal(pad, rec) {
    var vul = vulOf(pad, rec.dealNo, rec.dealer), out = { rows: [], game: -1, vul: vul, res: null, hon: null };
    function add(s, pts, a, why) { if (!pts) return; var r = { s: s, pts: pts, a: a ? 1 : 0, why: why, d: rec.dealNo, g: pad.g }; pad.rows.push(r); out.rows.push(r); pad.tot[s] += pts; }
    var k = rec.k;
    if (k) {
      var ds = side(k.decl), res = scoreContract(k, vul[ds], rec.took);
      out.res = res;
      if (res.made) {
        add(ds, res.below, 0, contractText(k));
        pad.part[ds] += res.below;
        res.above.forEach(function (x) { add(ds, x.pts, 1, x.why); });
      } else res.def.forEach(function (x) { add(1 - ds, x.pts, 1, x.why); });
      var hon = honors(rec.hands, k.st);
      if (hon) { out.hon = hon; add(side(hon.p), hon.pts, 1, 'Honors: ' + hon.why.toLowerCase()); }
      if (pad.part[ds] >= 100) {
        out.game = ds; pad.games[ds]++;
        if (pad.fmt === 'chicago') add(ds, vul[ds] ? 500 : 300, 1, vul[ds] ? 'Game, vulnerable' : 'Game, not vulnerable');
        pad.part = [0, 0]; pad.g++;
      } else if (pad.fmt === 'chicago' && res.made && ((rec.dealNo - 1) % 4) === 3) add(ds, 100, 1, 'Part score on the fourth deal');
    }
    pad.deals.push({ d: rec.dealNo, k: k ? contractText(k) : null, decl: k ? k.decl : -1, took: rec.took, vul: vulCode(vul) });
    if (pad.fmt === 'chicago' && rec.dealNo >= 4) pad.over = true;
    if (pad.fmt === 'rubber' && (pad.games[0] >= 2 || pad.games[1] >= 2)) {
      var w = pad.games[0] >= 2 ? 0 : 1;
      out.rubber = w; add(w, pad.games[1 - w] ? 500 : 700, 1, pad.games[1 - w] ? 'Rubber, two games to one' : 'Rubber, two games to none');
      pad.over = true;
    }
    out.over = pad.over;
    return out;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // The bidding system: Standard American Yellow Card in its basics
  // ══════════════════════════════════════════════════════════════════════════
  // Each situation has a list of rules, in the order the computer tries them. A rule: {c: call, ok(h, X) -> bool,
  // say: what the call shows, sh: what partner learns {lo, hi, len: {s: n}, bal}}. The computer bids the first rule
  // its hand passes; the meaning of any call (a robot's or a person's) is the rule with that call. So what the
  // robots' bids mean is exactly what they bid on.
  var HCPV = { A: 4, K: 3, Q: 2, J: 1 };
  function feat(hand, lv) {
    var h = { hcp: 0, len: { c: 0, d: 0, h: 0, s: 0 }, cards: { c: [], d: [], h: [], s: [] }, aces: 0, kings: 0 };
    hand.forEach(function (c) { h.hcp += HCPV[c.r] || 0; h.len[c.s]++; h.cards[c.s].push(RV[c.r]); if (c.r === 'A') h.aces++; if (c.r === 'K') h.kings++; });
    SUITS.forEach(function (s) { h.cards[s].sort(function (a, b) { return b - a; }); });
    var L = SUITS.map(function (s) { return h.len[s]; }).sort(function (a, b) { return b - a; });
    h.shape = L;
    h.bal = (L[0] <= 5 && L[3] >= 2 && L[1] <= 4 && !(L[0] === 5 && L[1] === 4)) ;   // 4333 4432 5332
    h.lp = 0; SUITS.forEach(function (s) { h.lp += Math.max(0, h.len[s] - 4); });
    h.r20 = h.hcp + L[0] + L[1];
    h.raw = h.hcp;
    // The computer's skill: Easy misjudges its hand by up to two points either way
    if (lv === 'easy') { h.hcp = Math.max(0, h.hcp + Math.round((R() - 0.5) * 4)); h.r20 = h.hcp + L[0] + L[1]; }
    h.lv = lv || 'hard';
    return h;
  }
  function has(h, s, r) { return h.cards[s].indexOf(r) >= 0; }
  function top3(h, s) { var n = 0; [14, 13, 12].forEach(function (r) { if (has(h, s, r)) n++; }); return n; }
  function top5(h, s) { var n = 0; [14, 13, 12, 11, 10].forEach(function (r) { if (has(h, s, r)) n++; }); return n; }
  function goodSuit(h, s) { return top3(h, s) >= 2 || top5(h, s) >= 3; }
  function okSuit(h, s) { return top3(h, s) >= 1 && top5(h, s) >= 2 || top3(h, s) >= 2; }
  function stopper(h, s) { var n = h.len[s]; return has(h, s, 14) || has(h, s, 13) && n >= 2 || has(h, s, 12) && n >= 3 || has(h, s, 11) && n >= 4; }
  // dummy points with t as trumps (support points)
  function supPts(h, t) {
    var sup = h.len[t], d = 0;
    if (sup >= 3) SUITS.forEach(function (s) { if (s === t) return; var n = h.len[s]; d += n === 0 ? (sup >= 4 ? 5 : 3) : n === 1 ? (sup >= 4 ? 3 : 2) : n === 2 ? 1 : 0; });
    return h.hcp + (h.lv === 'normal' || h.lv === 'easy' ? Math.min(d, 2) : d);
  }
  function longest(h, list) {   // longest suit in list; ties to the higher ranking
    var best = null; (list || SUITS).forEach(function (s) { if (best == null || h.len[s] > h.len[best] || h.len[s] === h.len[best] && sIdx(s) > sIdx(best)) best = s; }); return best;
  }
  function qt(h) {   // quick tricks
    var t = 0; SUITS.forEach(function (s) { var a = has(h, s, 14), k = has(h, s, 13), q = has(h, s, 12);
      t += a && k ? 2 : a && q ? 1.5 : a ? 1 : k && q ? 1 : k && h.len[s] >= 2 ? 0.5 : 0; });
    return t;
  }
  function SW(st) { return st === 4 ? 'notrump' : SUITWORD[SUITS[st]]; }
  function S1(s) { return SUIT1[s]; }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  // Pictures: what each seat has shown so far. {lo, hi, len: {c,d,h,s mins}, mx: {maxes}, bal, tags}
  function blank() { return { lo: 0, hi: 37, len: { c: 0, d: 0, h: 0, s: 0 }, mx: { c: 13, d: 13, h: 13, s: 13 }, bal: false, f: {} }; }
  function apply(pic, sh) {
    if (!sh) return;
    if (sh.lo != null) pic.lo = Math.max(pic.lo, sh.lo);
    if (sh.hi != null) pic.hi = Math.min(pic.hi, sh.hi);
    if (pic.lo > pic.hi) pic.hi = pic.lo;   // (a misbid: trust the latest)
    if (sh.len) for (var s in sh.len) pic.len[s] = Math.max(pic.len[s], sh.len[s]);
    if (sh.mx) for (var t in sh.mx) pic.mx[t] = Math.min(pic.mx[t], sh.mx[t]);
    if (sh.bal) { pic.bal = true; SUITS.forEach(function (s) { pic.len[s] = Math.max(pic.len[s], 2); }); }
    if (sh.f) for (var k in sh.f) pic.f[k] = sh.f[k];
  }

  // The situation for the player whose turn it is (calls so far, dealer)
  function context(calls, dealer, pics) {
    var a = auction(calls, dealer), me = a.turn, pd = partner(me);
    var X = { calls: calls, dealer: dealer, a: a, me: me, pd: pd, lho: (me + 1) % 4, rho: (me + 3) % 4, pics: pics, legal: legalCalls(calls, dealer) };
    X.ours = []; X.theirs = []; X.mine = []; X.pds = [];
    var opener = -1, openCall = null;
    calls.forEach(function (c, i) {
      var by = (dealer + i) % 4, e = { c: c, by: by, i: i };
      if (c !== 'P') { if (side(by) === side(me)) X.ours.push(e); else X.theirs.push(e); }
      if (by === me) X.mine.push(e); if (by === pd) X.pds.push(e);
      if (opener < 0 && isBid(c)) { opener = by; openCall = c; }
    });
    X.opener = opener; X.open = openCall;
    X.weOpened = opener >= 0 && side(opener) === side(me);
    X.myBids = X.mine.filter(function (e) { return e.c !== 'P'; });
    X.pdBids = X.pds.filter(function (e) { return e.c !== 'P'; });
    X.round = X.mine.length;   // how many times I have called before
    X.interf = X.theirs.length > 0;
    X.last = a.last; X.lastBy = a.lastBy;
    X.pdLast = X.pdBids.length ? X.pdBids[X.pdBids.length - 1].c : null;
    X.pdPic = pics[pd]; X.myPic = pics[me];
    // the suits each side has bid
    X.bidBy = function (p) { var o = {}; calls.forEach(function (c, i) { if ((dealer + i) % 4 === p && isBid(c) && stOf(c) < 4) o[SUITS[stOf(c)]] = 1; }); return o; };
    X.theirSuits = {}; X.theirs.forEach(function (e) { if (isBid(e.c) && stOf(e.c) < 4) X.theirSuits[SUITS[stOf(e.c)]] = 1; });
    X.ourSuits = {}; X.ours.forEach(function (e) { if (isBid(e.c) && stOf(e.c) < 4) X.ourSuits[SUITS[stOf(e.c)]] = 1; });
    X.can = function (c) { return X.legal.indexOf(c) >= 0; };
    // the cheapest legal bid in strain st
    X.cheap = function (st) { for (var l = 1; l <= 7; l++) { var b = mkBid(l, st); if (X.can(b)) return b; } return null; };
    X.cheapLvl = function (st) { var b = X.cheap(st); return b ? lvOf(b) : 8; };
    // our side's sequence of non-pass calls, as text: "p:1NT m:2C p:2H"
    X.seq = X.ours.map(function (e) { return (e.by === me ? 'm:' : 'p:') + e.c; }).join(' ');
    X.oppAfterOpen = opener >= 0 && X.theirs.some(function (e) { return e.i > 0; });
    return X;
  }

  // Rules: r(call, ok, say, sh)
  function r(c, ok, say, sh, extra) { var o = { c: c, ok: ok, say: say, sh: sh || null }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }
  function T() { return true; }

  // Which kind of auction this is, and its rules
  function rulesFor(X) {
    var L = [];
    var nOurs = X.ours.length;
    // Answers to an ace or king ask come first, whatever else is going on
    var bw = blackwoodState(X);
    if (bw) return bw;
    var nt = ntSeqRules(X);
    if (nt) return nt;
    if (X.opener < 0) return openingRules(X);
    if (X.weOpened) {
      if (X.opener === X.pd && X.myBids.length === 0 && !X.mine.some(function (e) { return e.i > X.pdBids[0].i; })) return respondRules(X);
      if (X.opener === X.me && X.myBids.length === 1 && X.pdBids.length === 1 && X.round === 1) return rebidRules(X);
    } else {
      // they opened
      if (X.myBids.length === 0 && X.pdBids.length === 0 && !X.mine.some(function (e) { return e.i > X.theirs[0].i; })) return overcallRules(X);
      if (X.myBids.length === 0 && X.pdBids.length >= 1 && !X.mine.some(function (e) { return e.i > X.pdBids[0].i; })) return advanceRules(X);
    }
    return laterRules(X);
  }

  // ── After a 1NT or 2NT opening, Stayman and transfers carry on as a set conversation ──
  function ntSeqRules(X) {
    if (X.interf || X.opener < 0 || !X.weOpened || (X.open !== '1N' && X.open !== '2N')) return null;
    var q = X.ours.map(function (e) { return (e.by === X.opener ? 'o' : 'r') + e.c; }).join(' ');
    var one = X.open === '1N', u = one ? 2 : 3, L = [];
    var maxO = one ? 16 : 21, inv = one ? [8, 9] : [-1, -1], gm = one ? [10, 15] : [4, 10];
    var Oc = 'o' + X.open;
    // responder's second call after Stayman's answer
    if (X.me !== X.opener && new RegExp('^' + Oc + ' r' + u + 'C o' + u + '[DHS]$').test(q)) {
      var ans = q.slice(-1), fs = ans === 'H' ? 'h' : ans === 'S' ? 's' : null;
      if (fs) {
        L.push(r((u + 1) + fs.toUpperCase(), function (h) { return h.len[fs] >= 4 && h.hcp >= inv[0] && h.hcp <= inv[1]; }, 'Invites game: 4 ' + SUITWORD[fs] + ' to go with partner\'s, and 8 to 9 points.', { lo: 8, hi: 9, len: o1(fs, 4) }, { fit: fs, inv: 1 }));
        L.push(r('4' + fs.toUpperCase(), function (h) { return h.len[fs] >= 4 && h.hcp >= gm[0] && h.hcp < 16; }, 'To play: game in ' + SUITWORD[fs] + ', the 4-4 fit Stayman found.', { lo: gm[0], len: o1(fs, 4) }, { fit: fs }));
      }
      if (one) L.push(r('2N', function (h) { return h.hcp >= 8 && h.hcp <= 9 && !(fs && h.len[fs] >= 4); }, 'Invites game: 8 to 9 points, without a fit for partner\'s answer.' + (fs === 'h' ? ' This hand has 4 spades.' : ''), { lo: 8, hi: 9, len: fs === 'h' ? { s: 4 } : null }, { inv: 1 }));
      L.push(r('3N', function (h) { return h.hcp >= gm[0] && h.hcp < 16 && !(fs && h.len[fs] >= 4); }, 'To play: game in notrump, without a fit for partner\'s answer.' + (fs === 'h' ? ' This hand has 4 spades.' : ''), { lo: gm[0], len: fs === 'h' ? { s: 4 } : null }));
      if (one) L.push(r('P', function (h) { return h.hcp < 8; }, 'To play: too weak to go further.', { hi: 7 }));
      return L.length ? L.concat([{ c: null, dyn: function (h) { return place(X, h); } }]) : null;
    }
    // opener's third call after Stayman
    if (X.me === X.opener && new RegExp('^' + Oc + ' r' + u + 'C o' + u + '[DHS] r').test(q) && X.ours.length === 4) {
      var a2 = q.split(' ')[2].slice(-1), R2 = X.pdLast, hf = a2 === 'H';
      if (R2 === '2N' || R2 === '3N') {
        var g4 = R2 === '3N';
        L.push(r('4S', function (h) { return hf && h.len.s >= 4 && (g4 || h.hcp >= maxO); }, 'Partner has 4 spades, so does this hand: game in spades.', { len: { s: 4 } }, { fit: 's' }));
        if (!g4) L.push(r('3S', function (h) { return hf && h.len.s >= 4; }, 'A minimum with 4 spades: partner chooses 4♠ or passes.', { len: { s: 4 }, hi: maxO - 1 }, { fit: 's' }));
        if (!g4) L.push(r('3N', function (h) { return h.hcp >= maxO; }, 'Accepts the invitation: a maximum.', { lo: maxO }));
        L.push(r('P', T, g4 ? 'Partner chose the contract.' : 'Declines the invitation: a minimum.', g4 ? null : { hi: maxO - 1 }));
        return L;
      }
      if (/^3[HS]$/.test(R2)) { L.push(r('4' + R2.charAt(1), function (h) { return h.hcp >= maxO; }, 'Accepts the invitation: a maximum.', { lo: maxO })); L.push(r('P', T, 'Declines the invitation: a minimum.', { hi: maxO - 1 })); return L; }
      if (/^4[HS]$/.test(R2)) { L.push(r('P', T, 'Partner chose the contract.')); return L; }
    }
    // responder's second call after the transfer was completed
    var mt = new RegExp('^' + Oc + ' r' + u + '([DH]) o' + u + '([HS])$').exec(q);
    if (X.me !== X.opener && mt) {
      var ms = mt[2].toLowerCase(), M = mt[2];
      L.push(r('P', function (h) { return h.hcp < (one ? 8 : 4); }, 'To play: partner\'s ' + u + GLYPH[ms] + ' is the contract. This hand is weak, with 5 or more ' + SUITWORD[ms] + '.', { hi: one ? 7 : 3 }, { signoff: 1 }));
      if (one) L.push(r('2N', function (h) { return h.hcp >= 8 && h.hcp <= 9 && h.len[ms] === 5; }, 'Invites game with exactly 5 ' + SUITWORD[ms] + ' and 8 to 9 points. Partner chooses where to play.', { lo: 8, hi: 9 }, { inv: 1 }));
      if (one) L.push(r('3' + M, function (h) { return h.hcp >= 8 && h.hcp <= 9 && h.len[ms] >= 6; }, 'Invites game with 6 or more ' + SUITWORD[ms] + ' and 8 to 9 points.', { lo: 8, hi: 9, len: o1(ms, 6) }, { inv: 1, fit: ms }));
      L.push(r('3N', function (h) { return h.hcp >= gm[0] && h.hcp < 16 && h.len[ms] === 5; }, 'Game with exactly 5 ' + SUITWORD[ms] + ': partner chooses 3NT or 4' + GLYPH[ms] + '.', { lo: gm[0] }));
      L.push(r('4' + M, function (h) { return h.hcp >= gm[0] && h.hcp < 16 && h.len[ms] >= 6; }, 'To play: game in ' + SUITWORD[ms] + ' with 6 or more of them.', { lo: gm[0], len: o1(ms, 6) }, { fit: ms }));
      return L.concat([{ c: null, dyn: function (h) { return place(X, h); } }]);
    }
    // opener's third call after a transfer
    var mt2 = new RegExp('^' + Oc + ' r' + u + '([DH]) o' + u + '([HS]) r(\\S+)$').exec(q);
    if (X.me === X.opener && mt2) {
      var s3 = mt2[2].toLowerCase(), R3 = mt2[3], M3 = mt2[2];
      if (R3 === '2N') {
        L.push(r('4' + M3, function (h) { return h.hcp >= maxO && h.len[s3] >= 3; }, 'Accepts with 3 or more ' + SUITWORD[s3] + ': game in ' + SUITWORD[s3] + '.', { lo: maxO, len: o1(s3, 3) }, { fit: s3 }));
        L.push(r('3N', function (h) { return h.hcp >= maxO; }, 'Accepts with only 2 ' + SUITWORD[s3] + ': game in notrump.', { lo: maxO, mx: o1(s3, 2) }));
        L.push(r('3' + M3, function (h) { return h.len[s3] >= 3; }, 'A minimum with 3 or more ' + SUITWORD[s3] + ': this is the place to stop.', { hi: maxO - 1, len: o1(s3, 3) }, { fit: s3, signoff: 1 }));
        L.push(r('P', T, 'A minimum with only 2 ' + SUITWORD[s3] + ': 2NT is the place to stop.', { hi: maxO - 1 }));
        return L;
      }
      if (R3 === '3' + M3) { L.push(r('4' + M3, function (h) { return h.hcp >= maxO; }, 'Accepts the invitation: a maximum.', { lo: maxO })); L.push(r('P', T, 'Declines the invitation: a minimum.', { hi: maxO - 1 })); return L; }
      if (R3 === '3N') { L.push(r('4' + M3, function (h) { return h.len[s3] >= 3; }, 'Chooses ' + SUITWORD[s3] + ': 3 or more of them makes an 8-card fit.', { len: o1(s3, 3) }, { fit: s3 })); L.push(r('P', T, 'Chooses notrump: only 2 ' + SUITWORD[s3] + '.', { mx: o1(s3, 2) })); return L; }
      if (R3 === '4' + M3) { L.push(r('P', T, 'Partner chose the contract.')); return L; }
    }
    return null;
  }

  // ── Openings ──
  function openingRules(X) {
    var seat4 = X.calls.length === 3, seat3 = X.calls.length === 2, L = [];
    var minOpen = function (h) { return h.hcp >= 12 || h.hcp >= 10 && h.r20 >= 20 && h.lv !== 'easy' || seat4 && h.hcp + h.len.s >= 15 && h.hcp >= 10 || seat3 && h.hcp >= 10 && h.lv === 'hard' && SUITS.some(function (s) { return h.len[s] >= 5 && goodSuit(h, s) && (s === 'h' || s === 's'); }); };
    L.push(r('2C', function (h) { return h.hcp >= 22; }, 'Strong and artificial: 22 or more points. It says nothing about clubs, and partner must answer.', { lo: 22 }, { force: 'game', conv: 1 }));
    L.push(r('2N', function (h) { return h.bal && h.hcp >= 20 && h.hcp <= 21; }, '20 to 21 points with a balanced hand.', { lo: 20, hi: 21, bal: 1 }));
    L.push(r('1N', function (h) { return h.bal && h.hcp >= 15 && h.hcp <= 17; }, '15 to 17 points with a balanced hand.', { lo: 15, hi: 17, bal: 1 }));
    // one of a suit
    function suitToOpen(h) {
      var five = SUITS.filter(function (s) { return h.len[s] >= 5; });
      if (five.length) return longest(h, five);
      if (h.len.d >= 4 && h.len.d >= h.len.c) return 'd';
      if (h.len.c > h.len.d) return 'c';
      if (h.len.d === 3 && h.len.c === 3) return 'c';
      return h.len.d >= h.len.c ? 'd' : 'c';
    }
    ['s', 'h', 'd', 'c'].forEach(function (s) {
      var say = s === 's' || s === 'h' ? 'Opening bid: 12 to 21 points and 5 or more ' + SUITWORD[s] + '.' : 'Opening bid: 12 to 21 points and 3 or more ' + SUITWORD[s] + (s === 'd' ? ', usually 4 or more.' : '.');
      L.push(r('1' + s.toUpperCase(), function (h) { return minOpen(h) && h.hcp <= 21 && suitToOpen(h) === s; }, say, { lo: 11, hi: 21, len: o1(s, s === 'h' || s === 's' ? 5 : 3) }));
    });
    if (!seat4) {
      ['s', 'h', 'd'].forEach(function (s) {
        L.push(r('2' + s.toUpperCase(), function (h) { return h.len[s] === 6 && h.hcp >= 5 && h.hcp <= 11 && goodSuit(h, s) && !(s !== 's' && h.len.s >= 4) && !(s !== 'h' && h.len.h >= 4); },
          'Weak two: 5 to 11 points and a good 6-card ' + S1(s) + ' suit.', { lo: 5, hi: 11, len: o1(s, 6), mx: o1(s, 6) }, { weak: 1 }));
      });
      ['s', 'h', 'd', 'c'].forEach(function (s) {
        L.push(r('3' + s.toUpperCase(), function (h) { return h.len[s] === 7 && h.hcp >= 5 && h.hcp <= 10 && okSuit(h, s); },
          'Preempt: a 7-card ' + S1(s) + ' suit and not enough points to open at the one level.', { lo: 5, hi: 10, len: o1(s, 7) }, { weak: 1 }));
      });
      ['s', 'h'].forEach(function (s) {
        L.push(r('4' + s.toUpperCase(), function (h) { return h.len[s] >= 8 && h.hcp >= 5 && h.hcp <= 11; },
          'Preempt: an 8-card ' + S1(s) + ' suit and not enough points to open at the one level.', { lo: 5, hi: 11, len: o1(s, 8) }, { weak: 1 }));
      });
    }
    L.push(r('P', T, X.calls.length ? 'Not enough to open the bidding: fewer than 12 points, or no long suit to open a weak bid with.' : 'Not enough to open the bidding: fewer than 12 points.', { hi: 11 }));
    return L;
  }
  function o1(s, n) { var o = {}; o[s] = n; return o; }

  // ── Responding to partner's opening (my first call) ──
  function respondRules(X) {
    var O = X.open, L = [], st = stOf(O), lvl = lvOf(O), os = suitOfSt(st);
    var rhoAct = X.theirs.length ? X.theirs[X.theirs.length - 1] : null;   // their call after the opening
    var interf = X.theirs.length > 0;
    var dblOnly = interf && X.theirs.every(function (e) { return e.c === 'X'; });
    if (O === '1N' && !interf) return nt1Resp(X, 1);
    if (O === '2N' && !interf) return nt1Resp(X, 2);
    if (O === '2C' && !interf) {
      [['2H', 'h'], ['2S', 's'], ['3C', 'c'], ['3D', 'd']].forEach(function (b) {
        L.push(r(b[0], function (h) { return h.hcp >= 8 && h.len[b[1]] >= 5 && goodSuit(h, b[1]); }, 'Positive answer: 8 or more points and a good 5-card ' + S1(b[1]) + ' suit.', { lo: 8, len: o1(b[1], 5) }, { force: 'game' }));
      });
      L.push(r('2N', function (h) { return h.hcp >= 8 && h.bal; }, 'Positive answer: 8 or more points, balanced.', { lo: 8, bal: 1 }));
      L.push(r('2D', T, 'Waiting: it says nothing about diamonds. It gives partner room to describe the strong hand.', null, { conv: 1 }));
      return L;
    }
    if (lvl === 1 && st < 4) {
      if (!interf || dblOnly) return oneSuitResp(X, os, dblOnly);
      return compResp(X, os, rhoAct);
    }
    // weak twos and preempts
    if (st < 4 && (lvl === 2 || lvl >= 3)) {
      var weak = lvl === 2;
      var major = os === 'h' || os === 's';
      L.push(r(lvl <= 3 && major ? '4' + os.toUpperCase() : null, function (h) { return h.len[os] >= 2 && (h.hcp + (h.len[os] >= 3 ? 2 : 0) >= (weak ? 16 : 14) || h.len[os] >= 4 && h.hcp < 12); },
        'Raises to game: a good fit with partner, either strong enough to make it or long trumps to make the opponents\' life harder.', { len: o1(os, 2) }));
      if (weak) L.push(r('2N', function (h) { return h.hcp >= 15; }, 'Asks partner to describe: a minimum weak two, or a maximum with an ace or king in another suit.', { lo: 15 }, { force: 1, conv: 1, ask: 'feature' }));
      L.push(r('3N', function (h) { return h.hcp >= (weak ? 16 : 16) && SUITS.every(function (s) { return s === os || stopper(h, s) || h.len[os] >= 2 && has(h, os, 14); }); }, 'To play: enough points for game, with the other suits stopped.', { lo: 15 }));
      if (!major) L.push(r('5' + os.toUpperCase(), function (h) { return h.len[os] >= 3 && h.hcp >= 16; }, 'Raises to game in ' + SUITWORD[os] + '.', { lo: 14, len: o1(os, 3) }));
      if (weak) L.push(r('3' + os.toUpperCase(), function (h) { return h.len[os] >= 3 && h.hcp < 15; }, 'Raises to the three level to make it harder for the opponents. It doesn\'t invite game.', { len: o1(os, 3), hi: 14 }));
      ['s', 'h', 'd', 'c'].forEach(function (s) {
        if (s === os) return;
        var b = X.cheap(sIdx(s)); if (!b || lvOf(b) > 3) return;
        L.push(r(b, function (h) { return h.len[s] >= 5 && goodSuit(h, s) && h.hcp >= 16; }, 'A new suit: 5 or more ' + SUITWORD[s] + ' and a strong hand. Partner must bid again.', { lo: 16, len: o1(s, 5) }, { force: 1 }));
      });
      L.push(r('P', T, 'Nothing to add: partner\'s bid is weak, and so is this hand for it.'));
      return L;
    }
    return laterRules(X);
  }
  // Answers to 1NT (n = 1) or 2NT (n = 2)
  function nt1Resp(X, n) {
    var L = [], lo = n === 1 ? 15 : 20, up = n === 1 ? '2' : '3';
    var inv = n === 1 ? [8, 9] : [-1, -1], game = n === 1 ? [10, 15] : [4, 10], quant = n === 1 ? [16, 17] : [11, 12], six = n === 1 ? [18, 21] : [13, 16];
    var minS = n === 1 ? 8 : 4;
    L.push(r(up + 'C', function (h) { return h.hcp >= minS && (h.len.h === 4 || h.len.s === 4) && !(h.len.h >= 5 || h.len.s >= 5) && !(h.shape[0] === 4 && h.shape[3] === 3 && h.hcp <= 11) || h.hcp >= minS && (h.len.h === 4 && h.len.s >= 5 || h.len.s === 4 && h.len.h >= 5) && h.hcp < 12; },
      'Stayman: asks partner for a 4-card major. It shows ' + minS + ' or more points and at least one 4-card major.', { lo: minS }, { conv: 1, force: 1, ask: 'stayman' }));
    L.push(r(up + 'H', function (h) { return h.len.s >= 5 && h.len.s >= h.len.h; }, 'Jacoby transfer: 5 or more spades. Partner bids ' + up + '♠ next, and this hand chooses what happens after that.', { len: { s: 5 } }, { conv: 1, force: 1, xfer: 's' }));
    L.push(r(up + 'D', function (h) { return h.len.h >= 5; }, 'Jacoby transfer: 5 or more hearts. Partner bids ' + up + '♥ next, and this hand chooses what happens after that.', { len: { h: 5 } }, { conv: 1, force: 1, xfer: 'h' }));
    if (n === 1) L.push(r('2N', function (h) { return h.hcp >= inv[0] && h.hcp <= inv[1]; }, 'Invites game: 8 to 9 points. Partner bids 3NT with a maximum.', { lo: 8, hi: 9 }, { inv: 1 }));
    L.push(r('3N', function (h) { return h.hcp >= game[0] && h.hcp <= game[1]; }, 'To play: enough points for game together (' + game[0] + ' to ' + game[1] + '), and no 4-card major.', { lo: game[0], hi: game[1] }));
    L.push(r('4N', function (h) { return h.hcp >= quant[0] && h.hcp <= quant[1] && h.bal; }, 'Invites slam: ' + quant[0] + ' to ' + quant[1] + ' points. Partner bids 6NT with a maximum and passes with a minimum.', { lo: quant[0], hi: quant[1] }, { quant: 1 }));
    L.push(r('6N', function (h) { return h.hcp >= six[0] && h.hcp <= six[1]; }, 'To play: about 33 points together, enough for a small slam.', { lo: six[0], hi: six[1] }));
    L.push(r('7N', function (h) { return h.hcp > six[1]; }, 'To play: 37 or more points together, enough for a grand slam.', { lo: six[1] + 1 }));
    L.push(r('3N', function (h) { return h.hcp >= game[0]; }, 'To play: enough points for game together.', { lo: game[0] }));
    L.push(r('P', T, n === 1 ? 'Too weak for game: 7 points or fewer.' : 'Too weak for game: 3 points or fewer.', { hi: n === 1 ? 7 : 3 }));
    return L;
  }
  // Answers to one of a suit, nobody in the way (or after a takeout double)
  function oneSuitResp(X, os, afterX) {
    var L = [], major = os === 'h' || os === 's', O = '1' + os.toUpperCase();
    if (afterX) L.push(r('XX', function (h) { return h.hcp >= 10 && h.len[os] < (major ? 3 : 4); }, 'Redouble: 10 or more points, usually without a fit for partner.', { lo: 10 }));
    if (major) {
      L.push(r(afterX ? '2N' : '2N', function (h) { return h.len[os] >= 4 && h.hcp >= (afterX ? 10 : 13); }, afterX ? 'Jordan 2NT: a raise to at least the three level, 10 or more points with 4 or more ' + SUITWORD[os] + '.' : 'Jacoby 2NT: 4 or more ' + SUITWORD[os] + ' and enough for game (13 or more points).', { lo: afterX ? 10 : 13, len: o1(os, 4) }, { conv: 1, force: afterX ? 1 : 'game', fit: os, jac: !afterX }));
      L.push(r('4' + os.toUpperCase(), function (h) { return h.len[os] >= 5 && h.hcp < 10 && h.shape[3] <= 1; }, 'Weak raise to game: 5 or more ' + SUITWORD[os] + ' and fewer than 10 points. It makes it hard for the opponents.', { hi: 9, len: o1(os, 5) }, { fit: os }));
      L.push(r('3' + os.toUpperCase(), function (h) { var p = supPts(h, os); return afterX ? h.len[os] >= 4 && h.hcp < 10 && h.hcp >= 4 : h.len[os] >= 4 && p >= 10 && p <= 12; },
        afterX ? 'Preemptive raise: 4 or more ' + SUITWORD[os] + ' and a weak hand.' : 'Limit raise: 4 or more ' + SUITWORD[os] + ' and 10 to 12 points. Partner goes on to game with more than a minimum.', afterX ? { hi: 9, len: o1(os, 4) } : { lo: 10, hi: 12, len: o1(os, 4) }, { fit: os, inv: !afterX }));
      L.push(r('2' + os.toUpperCase(), function (h) { var p = supPts(h, os); return h.len[os] >= 3 && p >= 6 && p <= 10; }, 'Raise: 3 or more ' + SUITWORD[os] + ' and 6 to 10 points.', { lo: 6, hi: 10, len: o1(os, 3) }, { fit: os }));
      if (os === 'h') L.push(r('1S', function (h) { return h.len.s >= 4 && h.hcp >= 6; }, 'A new suit: 4 or more spades and 6 or more points. Partner must bid again.', { lo: 6, len: { s: 4 } }, { force: 1 }));
      L.push(r('3N', function (h) { return h.bal && h.hcp >= 15 && h.hcp <= 17 && h.len[os] <= 2; }, 'To play: 15 to 17 points, balanced, without a fit.', { lo: 15, hi: 17, bal: 1 }));
      twoLevelNew(L, X, os);
      L.push(r('3' + os.toUpperCase(), function (h) { var p = supPts(h, os); return h.len[os] >= 3 && p >= 10 && p <= 12; }, 'Limit raise: 3 or more ' + SUITWORD[os] + ' and 10 to 12 points.', { lo: 10, hi: 12, len: o1(os, 3) }, { fit: os, inv: 1 }));
      L.push(r('1N', function (h) { return h.hcp >= 6 && h.hcp <= 11; }, '6 to 10 points without a fit, and no suit to show at the one level. It may not be balanced.', { lo: 6, hi: 10 }));
    } else {
      // minors: majors first at the one level
      var ups = os === 'c' ? ['d', 'h', 's'] : ['h', 's'];
      L.push(r('1D', function (h) { return os === 'c' && h.len.d >= 5 && h.hcp >= 11 && h.len.d > Math.max(h.len.h, h.len.s); }, 'A new suit: 4 or more diamonds and 6 or more points. Partner must bid again.', { lo: 6, len: { d: 4 } }, { force: 1 }));
      L.push(r('1H', function (h) { return h.len.h >= 4 && h.hcp >= 6 && h.len.h >= h.len.s && !(h.len.s >= 5 && h.len.s > h.len.h); }, 'A new suit: 4 or more hearts and 6 or more points. Partner must bid again.', { lo: 6, len: { h: 4 } }, { force: 1 }));
      L.push(r('1S', function (h) { return h.len.s >= 4 && h.hcp >= 6; }, 'A new suit: 4 or more spades and 6 or more points. Partner must bid again.', { lo: 6, len: { s: 4 } }, { force: 1 }));
      if (os === 'c') L.push(r('1D', function (h) { return h.len.d >= 4 && h.hcp >= 6; }, 'A new suit: 4 or more diamonds and 6 or more points. Partner must bid again.', { lo: 6, len: { d: 4 } }, { force: 1 }));
      var need = os === 'd' ? 4 : 5;
      L.push(r('3' + os.toUpperCase(), function (h) { return h.len[os] >= need + (afterX ? 0 : 1) - (afterX ? 0 : 1) && h.hcp >= (afterX ? 3 : 10) && h.hcp <= (afterX ? 9 : 12) && h.len.h < 4 && h.len.s < 4; },
        afterX ? 'Preemptive raise: long ' + SUITWORD[os] + ' and a weak hand.' : 'Limit raise: ' + need + ' or more ' + SUITWORD[os] + ', 10 to 12 points and no 4-card major.', afterX ? { hi: 9, len: o1(os, need) } : { lo: 10, hi: 12, len: o1(os, need) }, { fit: os, inv: !afterX }));
      L.push(r('2N', function (h) { return h.bal && h.hcp >= 13 && h.hcp <= 15 && h.len.h < 4 && h.len.s < 4; }, '13 to 15 points, balanced, no 4-card major. Forcing to game.', { lo: 13, hi: 15, bal: 1, mx: { h: 3, s: 3 } }, { force: 'game' }));
      L.push(r('3N', function (h) { return h.bal && h.hcp >= 16 && h.hcp <= 17 && h.len.h < 4 && h.len.s < 4; }, 'To play: 16 to 17 points, balanced, no 4-card major.', { lo: 16, hi: 17, bal: 1 }));
      L.push(r('2' + os.toUpperCase(), function (h) { return h.len[os] >= need && h.hcp >= 6 && h.hcp <= 10 && h.len.h < 4 && h.len.s < 4; }, 'Raise: ' + need + ' or more ' + SUITWORD[os] + ', 6 to 10 points and no 4-card major.', { lo: 6, hi: 10, len: o1(os, need) }, { fit: os }));
      twoLevelNew(L, X, os);
      L.push(r('1N', function (h) { return h.hcp >= 6 && h.hcp <= 10; }, '6 to 10 points and no 4-card major.', { lo: 6, hi: 10, mx: { h: 3, s: 3 } }));
      L.push(r('2' + os.toUpperCase(), function (h) { return h.len[os] >= 3 && h.hcp >= 6 && h.hcp <= 10; }, 'Raise: support for ' + SUITWORD[os] + ', 6 to 10 points.', { lo: 6, hi: 10, len: o1(os, 3) }, { fit: os }));
    }
    L.push(r('P', function (h) { return h.hcp < 6; }, 'Fewer than 6 points: not enough to answer.', { hi: 5 }));
    // stronger hands with nothing else to bid: the cheapest new suit
    SUITS.slice().reverse().forEach(function (s) { if (s === os) return; var b = X.cheap(sIdx(s)); if (b) L.push(r(b, function (h) { return h.len[s] >= 3; }, 'A new suit: ' + SUITWORD[s] + ', and 6 or more points. Partner must bid again.', { lo: 6, len: o1(s, 3) }, { force: 1 })); });
    L.push(r('1N', T, '6 to 10 points.', { lo: 6, hi: 10 }));
    return L;
  }
  function twoLevelNew(L, X, os) {
    ['c', 'd', 'h', 's'].slice().sort(function () { return 0; }).forEach(function () {});
    var cand = ['c', 'd', 'h', 's'].filter(function (s) { return s !== os && sIdx(s) < sIdx(os); });
    // with two to choose from, the longer (then the higher)
    var order = cand.slice().reverse();
    order.forEach(function (s) {
      var need = s === 'h' ? 5 : 4;
      L.push(r('2' + s.toUpperCase(), function (h) { return h.hcp >= 10 && h.len[s] >= need && cand.every(function (t) { return t === s || h.len[t] < h.len[s] || h.len[t] === h.len[s] && sIdx(t) < sIdx(s); }); },
        'A new suit at the two level: ' + need + ' or more ' + SUITWORD[s] + ' and 10 or more points. Partner must bid again.', { lo: 10, len: o1(s, need) }, { force: 1 }));
    });
  }
  // Partner opened one of a suit and they overcalled
  function compResp(X, os, their) {
    var L = [], major = os === 'h' || os === 's', ts = their && isBid(their.c) && stOf(their.c) < 4 ? SUITS[stOf(their.c)] : null, tl = their && isBid(their.c) ? lvOf(their.c) : 0;
    var need = major ? 3 : 4;
    if (ts) {
      var cue = X.cheap(sIdx(ts));
      if (cue && lvOf(cue) <= 3) L.push(r(cue, function (h) { return h.len[os] >= need && supPts(h, os) >= 11; }, 'Cuebid of their suit: support for partner\'s ' + SUITWORD[os] + ' and 11 or more points (a limit raise or better).', { lo: 11, len: o1(os, need) }, { force: 1, fit: os, conv: 1 }));
    }
    var raise = X.cheap(sIdx(os));
    if (raise && lvOf(raise) <= 3) L.push(r(raise, function (h) { var p = supPts(h, os); return h.len[os] >= need && p >= 6 && p <= 10; }, 'Raise: ' + need + ' or more ' + SUITWORD[os] + ' and 6 to 10 points.', { lo: 6, hi: 10, len: o1(os, need) }, { fit: os }));
    // negative double: through 2♠
    if (ts && tl <= 2 && their.c !== '2N' && X.can('X')) {
      var unbid = ['h', 's'].filter(function (s) { return s !== os && s !== ts; });
      if (unbid.length) L.push(r('X', function (h) { return h.hcp >= (tl === 1 ? 6 : 8) && unbid.every(function (s) { return h.len[s] >= 4; }) && !(h.len[os] >= need && supPts(h, os) >= 6 && supPts(h, os) <= 10); },
        'Negative double: 4 or more ' + unbid.map(function (s) { return SUITWORD[s]; }).join(' and ') + ' and ' + (tl === 1 ? 6 : 8) + ' or more points. It isn\'t for penalty.', o2(unbid, 4, tl === 1 ? 6 : 8), { conv: 1, force: 1 }));
    }
    ['s', 'h', 'd', 'c'].forEach(function (s) {
      if (s === os || s === ts) return;
      var b = X.cheap(sIdx(s)); if (!b) return; var l = lvOf(b); if (l > 2) return;
      L.push(r(b, function (h) { return l === 1 ? h.len[s] >= 4 && h.hcp >= 6 : h.len[s] >= 5 && h.hcp >= 10; }, 'A new suit: ' + (l === 1 ? 4 : 5) + ' or more ' + SUITWORD[s] + ' and ' + (l === 1 ? 6 : 10) + ' or more points. Partner must bid again.', { lo: l === 1 ? 6 : 10, len: o1(s, l === 1 ? 4 : 5) }, { force: 1 }));
    });
    if (ts) {
      var nt1 = X.can('1N'), nt2 = X.can('2N');
      if (nt1) L.push(r('1N', function (h) { return h.hcp >= 6 && h.hcp <= 10 && stopper(h, ts); }, '6 to 10 points with ' + SUITWORD[ts] + ' stopped.', { lo: 6, hi: 10 }));
      if (nt2 && tl === 1) L.push(r('2N', function (h) { return h.hcp >= 11 && h.hcp <= 12 && stopper(h, ts); }, 'Invites game: 11 to 12 points with ' + SUITWORD[ts] + ' stopped.', { lo: 11, hi: 12 }, { inv: 1 }));
      if (X.can('3N')) L.push(r('3N', function (h) { return h.hcp >= 13 && stopper(h, ts) && h.len[os] <= 2; }, 'To play: 13 or more points with ' + SUITWORD[ts] + ' stopped.', { lo: 13 }));
      // penalty double of a two-level overcall in a suit we hold
      if (X.can('X') && tl >= 2) L.push(r('X', function (h) { return h.len[ts] >= 4 && top5(h, ts) >= 2 && h.hcp >= 10; }, 'Penalty double: good ' + SUITWORD[ts] + ' and 10 or more points.', { lo: 10, len: o1(ts, 4) }));
    }
    if (major && X.can('4' + os.toUpperCase())) L.push(r('4' + os.toUpperCase(), function (h) { return h.len[os] >= need && supPts(h, os) >= 13; }, 'To play: game in ' + SUITWORD[os] + ', with support and enough points for it.', { lo: 13, len: o1(os, need) }, { fit: os }));
    if (raise && lvOf(raise) <= 4) L.push(r(raise, function (h) { return h.len[os] >= need && supPts(h, os) >= 6; }, 'Raise: support for ' + SUITWORD[os] + '.', { lo: 6, len: o1(os, need) }, { fit: os }));
    L.push(r('P', T, 'Nothing good to say over their bid.', { hi: 10 }));
    return L;
  }
  function o2(list, n, lo) { var o = { lo: lo, len: {} }; list.forEach(function (s) { o.len[s] = n; }); return o; }

  // ── Opener's second bid (I opened, partner answered) ──
  function rebidRules(X) {
    var O = X.open, R1 = X.pdLast, L = [], ost = stOf(O), os = suitOfSt(ost), olvl = lvOf(O);
    var rst = isBid(R1) ? stOf(R1) : -1, rs = rst >= 0 ? suitOfSt(rst) : null, rl = isBid(R1) ? lvOf(R1) : 0;
    var interf = X.theirs.length > 0;
    // 1NT / 2NT openings: Stayman and transfers
    if ((O === '1N' || O === '2N') && !interfAfter(X, 0)) {
      var up = O === '1N' ? 2 : 3;
      if (R1 === up + 'C') {
        L.push(r(up + 'H', function (h) { return h.len.h >= 4; }, 'Answers Stayman: 4 hearts (maybe 4 spades too).', { len: { h: 4 } }));
        L.push(r(up + 'S', function (h) { return h.len.s >= 4; }, 'Answers Stayman: 4 spades and not 4 hearts.', { len: { s: 4 }, mx: { h: 3 } }));
        L.push(r(up + 'D', T, 'Answers Stayman: no 4-card major. It says nothing about diamonds.', { mx: { h: 3, s: 3 } }, { conv: 1 }));
        return L;
      }
      if (R1 === up + 'D' || R1 === up + 'H') {
        var xs = R1 === up + 'D' ? 'h' : 's';
        L.push(r(up + xs.toUpperCase(), T, 'Completes the transfer: it says nothing about ' + SUITWORD[xs] + ', it just lets partner choose what comes next.', null, { conv: 1 }));
        return L;
      }
      if (R1 === '2N' && O === '1N') { L.push(r('3N', function (h) { return h.hcp >= 16; }, 'Accepts the invitation: a maximum, 16 to 17 points.', { lo: 16 })); L.push(r('P', T, 'Declines the invitation: a minimum, 15 points.', { hi: 15 })); return L; }
      if (R1 === '4N') { L.push(r('6N', function (h) { return h.hcp >= (O === '1N' ? 17 : 21); }, 'Accepts the slam invitation: a maximum.', null)); L.push(r('P', T, 'Declines the slam invitation: a minimum.', null)); return L; }
      if (R1 === '3N' || R1 === '6N' || R1 === '7N') { L.push(r('P', T, 'Partner chose the contract.')); return L; }
    }
    if (O === '2C' && R1 === '2D' && !interf) {
      L.push(r('2N', function (h) { return h.bal && h.hcp >= 22 && h.hcp <= 24; }, '22 to 24 points with a balanced hand.', { lo: 22, hi: 24, bal: 1 }));
      L.push(r('3N', function (h) { return h.bal && h.hcp >= 25 && h.hcp <= 27; }, '25 to 27 points with a balanced hand.', { lo: 25, hi: 27, bal: 1 }));
      [['2H', 'h'], ['2S', 's'], ['3C', 'c'], ['3D', 'd']].forEach(function (b) {
        L.push(r(b[0], function (h) { return longest(h) === b[1] && h.len[b[1]] >= 5; }, 'A strong hand with 5 or more ' + SUITWORD[b[1]] + '. The bidding goes on to at least game.', { len: o1(b[1], 5) }, { force: 'game' }));
      });
      L.push(r('2N', T, 'A strong balanced hand.', { bal: 1 }));
      return L;
    }
    if (olvl === 2 && os && os !== 'c' && R1 === '2N' && !interf) {
      // weak two, partner asks
      L.push(r('3N', function (h) { return top3(h, os) === 3; }, 'A solid suit: ace, king and queen of ' + SUITWORD[os] + '.', null));
      ['c', 'd', 'h', 's'].forEach(function (s) {
        if (s === os) return;
        var b = X.cheap(sIdx(s)); if (!b || lvOf(b) > 3) return;
        L.push(r(b, function (h) { return h.hcp >= 9 && (has(h, s, 14) || has(h, s, 13)); }, 'A maximum weak two (9 to 11 points), with the ace or king of ' + SUITWORD[s] + '.', { lo: 9 }));
      });
      L.push(r('3' + os.toUpperCase(), T, 'A minimum weak two (5 to 8 points).', { hi: 8 }));
      return L;
    }
    if (olvl === 1 && os && !interf) {
      var pf = X.pics[X.pd].f || {};
      var major = os === 'h' || os === 's';
      // partner raised
      if (rs === os && !pf.jac && !interf) {
        if (rl === 2) {
          L.push(r('4' + os.toUpperCase(), function (h) { return h.hcp + h.lp >= 19 && major; }, 'To play: enough for game opposite a raise (19 or more points).', { lo: 18 }));
          L.push(r('3N', function (h) { return h.hcp + h.lp >= 18 && !major && h.bal; }, 'To play: enough for game opposite a raise.', { lo: 18 }));
          L.push(r('3' + os.toUpperCase(), function (h) { return h.hcp + h.lp >= 16 && h.hcp + h.lp <= 18; }, 'Invites game: 16 to 18 points. Partner goes on with a good raise.', { lo: 15, hi: 18 }, { inv: 1 }));
          L.push(r('P', T, 'A minimum opening: game is unlikely opposite a simple raise.', { hi: 15 }));
          return L;
        }
        if (rl === 3) {
          L.push(r(major ? '4' + os.toUpperCase() : '3N', function (h) { return h.hcp + h.lp >= 14; }, 'Accepts the invitation: more than a minimum opening.', { lo: 14 }));
          L.push(r('P', T, 'Declines the invitation: a minimum opening.', { hi: 13 }));
          return L;
        }
      }
      if (pf.jac && R1 === '2N') {
        L.push(r('3' + os.toUpperCase(), function (h) { return h.hcp + h.lp >= 15; }, 'Extra values (15 or more) and interest in a slam.', { lo: 15 }));
        L.push(r('4' + os.toUpperCase(), T, 'A minimum opening: game, and no interest in a slam.', { hi: 14 }));
        return L;
      }
      if (rl === 1 || R1 === '1N' || rl === 2 && rs && rs !== os) {
        var pdSuit = rs && rs !== os ? rs : null;
        // raise partner's suit
        if (pdSuit) {
          var lv1 = lvOf(R1);
          var n4 = pdSuit === 'h' && lv1 === 2 ? 3 : 4;
          L.push(r((lv1 + 3) + pdSuit.toUpperCase() === '5' + pdSuit.toUpperCase() && (pdSuit === 'h' || pdSuit === 's') ? '4' + pdSuit.toUpperCase() : null, function (h) { return h.len[pdSuit] >= n4 && supPts(h, pdSuit) >= 19; }, 'Raises to game: 4-card support and 19 or more points.', { lo: 19, len: o1(pdSuit, n4) }, { fit: pdSuit }));
          if (lv1 === 1) L.push(r('4' + pdSuit.toUpperCase(), function (h) { return (pdSuit === 'h' || pdSuit === 's') && h.len[pdSuit] >= 4 && supPts(h, pdSuit) >= 19; }, 'Raises to game: 4-card support and 19 or more points.', { lo: 19, len: o1(pdSuit, 4) }, { fit: pdSuit }));
          L.push(r((lv1 + 2) + pdSuit.toUpperCase(), function (h) { var p = supPts(h, pdSuit); return h.len[pdSuit] >= n4 && p >= 16 && p <= 18; }, 'Jump raise: 4-card support and 16 to 18 points. Invites game.', { lo: 16, hi: 18, len: o1(pdSuit, n4) }, { fit: pdSuit, inv: 1 }));
          L.push(r((lv1 + 1) + pdSuit.toUpperCase(), function (h) { var p = supPts(h, pdSuit); return h.len[pdSuit] >= n4 && p <= 15; }, 'Raise: 4-card support and a minimum opening (12 to 15).', { hi: 15, len: o1(pdSuit, n4) }, { fit: pdSuit }));
        }
        // a new suit at the one level
        ['h', 's'].forEach(function (s) {
          if (s === os || s === pdSuit || !X.can('1' + s.toUpperCase())) return;
          L.push(r('1' + s.toUpperCase(), function (h) { return h.len[s] >= 4 && !(pdSuit && h.len[pdSuit] >= 4 && (pdSuit === 'h' || pdSuit === 's')); }, 'A second suit: 4 or more ' + SUITWORD[s] + '.', { len: o1(s, 4) }, { force: 0 }));
        });
        if (R1 === '1N') {
          L.push(r('P', function (h) { return h.bal && h.hcp <= 14; }, 'A balanced minimum: 1NT is a fine place to play.', { hi: 14 }));
          L.push(r('3N', function (h) { return h.bal && h.hcp >= 18; }, '18 to 19 points, balanced: enough for game.', { lo: 18 }));
          L.push(r('2N', function (h) { return h.bal && h.hcp >= 16 && h.hcp <= 17; }, 'Invites game: 16 to 17 points, balanced.', { lo: 16, hi: 17 }, { inv: 1 }));
        } else {
          L.push(r('1N', function (h) { return h.bal && h.hcp >= 12 && h.hcp <= 14 && X.can('1N'); }, '12 to 14 points with a balanced hand.', { lo: 12, hi: 14, bal: 1 }));
          L.push(r('2N', function (h) { return h.bal && h.hcp >= 18 && h.hcp <= 19 && lvOf(R1) === 1; }, '18 to 19 points with a balanced hand. Invites game.', { lo: 18, hi: 19, bal: 1 }, { inv: 1 }));
          L.push(r('2N', function (h) { return h.bal && h.hcp >= 12 && h.hcp <= 14 && lvOf(R1) === 2; }, '12 to 14 points with a balanced hand.', { lo: 12, hi: 14, bal: 1 }));
          L.push(r('3N', function (h) { return h.bal && h.hcp >= 18 && lvOf(R1) === 2; }, '18 to 19 points with a balanced hand: enough for game.', { lo: 18, bal: 1 }));
        }
        // a strong opening with a long major: straight to game
        if (major && X.can('4' + os.toUpperCase())) L.push(r('4' + os.toUpperCase(), function (h) { return h.len[os] >= 6 && h.hcp + h.lp >= 19 && !(pdSuit && h.len[pdSuit] >= 4); }, 'To play: game in ' + SUITWORD[os] + ', with 6 or more of them and a strong opening (19 or more).', { lo: 18, len: o1(os, 6) }));
        // jump rebid of a six-card suit
        var j = X.cheap(ost); var jl = j ? lvOf(j) + 1 : 9;
        if (jl <= 3) L.push(r(jl + os.toUpperCase(), function (h) { return h.len[os] >= 6 && h.hcp + h.lp >= 16 && h.hcp + h.lp <= 18; }, 'Jump rebid: 6 or more ' + SUITWORD[os] + ' and 16 to 18 points. Invites game.', { lo: 16, hi: 18, len: o1(os, 6) }, { inv: 1 }));
        // a second, lower suit at the two level (not a reverse)
        ['s', 'h', 'd', 'c'].forEach(function (s) {
          if (s === os || s === pdSuit) return;
          var b = X.cheap(sIdx(s)); if (!b) return;
          var reverse = lvOf(b) === 2 && sIdx(s) > sIdx(os);
          if (lvOf(b) > 2) return;
          if (lvOf(b) === 1) return;
          L.push(r(b, function (h) { return h.len[s] >= 4 && (reverse ? h.hcp >= 17 && h.len[os] > h.len[s] : h.hcp <= 18); }, reverse ? 'Reverse: 4 or more ' + SUITWORD[s] + ', longer ' + SUITWORD[os] + ', and 17 or more points. Partner must bid again.' : 'A second suit: 4 or more ' + SUITWORD[s] + ', and 12 to 18 points.', reverse ? { lo: 17, len: o1(s, 4) } : { hi: 18, len: o1(s, 4) }, { force: reverse ? 1 : 0 }));
        });
        // rebid the suit
        var rb = X.cheap(ost);
        if (rb && lvOf(rb) <= 2) L.push(r(rb, function (h) { return h.len[os] >= 6 && h.hcp + h.lp <= 16 || h.len[os] >= 5 && h.hcp <= 14; }, 'Rebids ' + SUITWORD[os] + ': 6 or more of them, and a minimum opening.', { hi: 15, len: o1(os, 6) }));
        if (pdSuit && rb) L.push(r((lvOf(R1) + 1) + pdSuit.toUpperCase(), function (h) { return h.len[pdSuit] >= 3 && h.hcp <= 15; }, 'Raise: support for ' + SUITWORD[pdSuit] + ' and a minimum opening.', { hi: 15, len: o1(pdSuit, 3) }, { fit: pdSuit }));
        if (R1 === '1N') L.push(r('P', function (h) { return h.hcp <= 14; }, 'A minimum opening: 1NT is a fine place to play.', { hi: 14 }));
        if (rb) L.push(r(rb, function (h) { return h.len[os] >= 5; }, 'Rebids ' + SUITWORD[os] + ': 5 or more of them.', { len: o1(os, 5) }));
        if (X.can('1N')) L.push(r('1N', T, 'A balanced minimum opening.', { lo: 12, hi: 14 }));
        if (X.can('2N')) L.push(r('2N', T, 'A balanced hand.', { lo: 12 }));
        if (rb) L.push(r(rb, T, 'Rebids ' + SUITWORD[os] + '.', null));
        return L;
      }
    }
    return laterRules(X);
  }
  function interfAfter(X, i) { return X.theirs.some(function (e) { return e.i > i; }); }

  // ── They opened: our first call ──
  function overcallRules(X) {
    var L = [], op = X.theirs[0], ost = stOf(op.c), os = suitOfSt(ost), olvl = lvOf(op.c);
    var lastTheirs = X.theirs[X.theirs.length - 1];
    var balancing = X.calls.length >= 3 && X.calls[X.calls.length - 1] === 'P' && X.calls[X.calls.length - 2] === 'P' && X.theirs.length === 1;
    var b = balancing ? 3 : 0;
    var ts = {}; X.theirs.forEach(function (e) { if (isBid(e.c) && stOf(e.c) < 4) ts[SUITS[stOf(e.c)]] = 1; });
    var ourUnbid = SUITS.filter(function (s) { return !ts[s]; });
    var tl = lastTheirs && isBid(lastTheirs.c) ? lvOf(lastTheirs.c) : olvl;
    if (op.c === '1N') {
      if (X.can('X')) L.push(r('X', function (h) { return h.hcp >= 15; }, 'Penalty double: 15 or more points. It expects to beat 1NT.', { lo: 15 }));
      ['s', 'h', 'd', 'c'].forEach(function (s) { var bb = X.cheap(sIdx(s)); if (bb && lvOf(bb) === 2) L.push(r(bb, function (h) { return h.len[s] >= 6 && h.hcp >= 8 && goodSuit(h, s) || h.len[s] >= 5 && h.hcp >= 10 && goodSuit(h, s) && (s === 'h' || s === 's'); }, 'Overcall: a good suit of 5 or more ' + SUITWORD[s] + ', to compete.', { lo: 8, len: o1(s, 5) })); });
      L.push(r('P', T, 'Nothing to say over their 1NT.', { hi: 14 }));
      return L;
    }
    if (op.c === '2C' && X.theirs.length === 1) {
      ['s', 'h', 'd'].forEach(function (s) { var bb = X.cheap(sIdx(s)); if (bb && lvOf(bb) === 2) L.push(r(bb, function (h) { return h.len[s] >= 6 && goodSuit(h, s) && h.hcp >= 8; }, 'Overcall: a good 6-card ' + S1(s) + ' suit, mostly to suggest a lead.', { len: o1(s, 6) })); });
      L.push(r('P', T, 'Their 2♣ is strong: nothing to say.', null));
      return L;
    }
    if (ost < 4) {
      // 1NT overcall
      if (X.can('1N')) L.push(r('1N', function (h) { return h.bal && h.hcp >= 15 - b * 1.3 && h.hcp <= 18 - b && stopper(h, os); }, balancing ? 'Balancing 1NT: 11 to 14 points, balanced, with ' + SUITWORD[os] + ' stopped.' : 'Notrump overcall: 15 to 18 points, balanced, with ' + SUITWORD[os] + ' stopped.', balancing ? { lo: 11, hi: 14, bal: 1 } : { lo: 15, hi: 18, bal: 1 }));
      if (X.can('2N') && olvl >= 2) L.push(r('2N', function (h) { return h.bal && h.hcp >= 15 && h.hcp <= 18 && stopper(h, os); }, 'Natural: 15 to 18 points, balanced, with ' + SUITWORD[os] + ' stopped.', { lo: 15, hi: 18, bal: 1 }));
      if (X.can('3N') && olvl >= 3) L.push(r('3N', function (h) { return h.hcp >= 16 && stopper(h, os); }, 'To play: a strong hand with ' + SUITWORD[os] + ' stopped.', { lo: 16 }));
      // takeout double
      var unbidM = ['h', 's'].filter(function (s) { return !ts[s]; });
      if (X.can('X') && tl <= 4) L.push(r('X', function (h) {
        var need = 12 - b + (tl >= 3 ? 1 : 0);
        var shape = h.len[os] <= 2 && ourUnbid.every(function (s) { return h.len[s] >= 3 || h.len[s] >= 2 && unbidM.indexOf(s) < 0; }) && unbidM.every(function (s) { return h.len[s] >= 3; });
        return h.hcp >= need && shape || h.hcp >= 18;
      }, 'Takeout double: an opening hand or better, short in ' + SUITWORD[os] + ', and support for the other suits. Partner should pick a suit.', o2(unbidM, 3, 12 - b), { conv: 1, tko: 1 }));
      // weak jump overcalls
      ['s', 'h', 'd', 'c'].forEach(function (s) {
        if (ts[s]) return;
        var bb = X.cheap(sIdx(s)); if (!bb) return;
        var jl = lvOf(bb) + 1; if (jl > 3 || balancing) return;
        L.push(r(jl + s.toUpperCase(), function (h) { return h.len[s] >= 6 && h.hcp >= 6 && h.hcp <= 10 && goodSuit(h, s); }, 'Weak jump overcall: 6 or more ' + SUITWORD[s] + ' and 6 to 10 points.', { lo: 6, hi: 10, len: o1(s, 6) }, { weak: 1 }));
      });
      // simple overcalls
      ['s', 'h', 'd', 'c'].forEach(function (s) {
        if (ts[s]) return;
        var bb = X.cheap(sIdx(s)); if (!bb) return; var l = lvOf(bb); if (l > 3) return;
        var lo = (l === 1 ? 8 : l === 2 ? 10 : 12) - b;
        L.push(r(bb, function (h) { return h.hcp >= lo && h.hcp <= 17 && (h.len[s] >= 5 && (l === 1 ? okSuit(h, s) : goodSuit(h, s) || h.hcp >= 12 && okSuit(h, s)) || h.len[s] >= 6 && l >= 2 && okSuit(h, s)) && longest(h, ourUnbid) === s; },
          'Overcall: 5 or more ' + SUITWORD[s] + ' and ' + lo + ' to 17 points.', { lo: lo, hi: 17, len: o1(s, 5) }));
      });
      L.push(r('P', T, balancing ? 'Not enough to reopen the bidding.' : 'Nothing safe to bid over their opening.', { hi: balancing ? 9 : 14 }));
      return L;
    }
    // they opened 2NT or higher notrump
    if (X.can('X')) L.push(r('X', function (h) { return h.hcp >= 16; }, 'Penalty double: a strong hand that expects to beat them.', { lo: 16 }));
    L.push(r('P', T, 'Nothing to say over their notrump.', null));
    return L;
  }

  // ── Partner overcalled or doubled: my first call ──
  function advanceRules(X) {
    var L = [], op = X.theirs[0], os = stOf(op.c) < 4 ? SUITS[stOf(op.c)] : null;
    var pd = X.pdBids[0], pc = pd.c;
    var ts = {}; X.theirs.forEach(function (e) { if (isBid(e.c) && stOf(e.c) < 4) ts[SUITS[stOf(e.c)]] = 1; });
    var rhoBid = X.calls.length && X.calls[X.calls.length - 1] !== 'P';
    if (pc === 'X' && X.pdBids.length === 1 && stOf(op.c) < 4 && pd.i > op.i && X.pics[X.pd].f.tko) {
      // takeout double
      var free = rhoBid;
      if (X.can('3N')) L.push(r('3N', function (h) { return h.hcp >= 13 && stopper(h, os) && h.len.h < 4 && h.len.s < 4; }, 'To play: 13 or more points with ' + SUITWORD[os] + ' stopped.', { lo: 13 }));
      var cue = X.cheap(sIdx(os));
      if (cue && lvOf(cue) <= 3) L.push(r(cue, function (h) { return h.hcp >= 12; }, 'Cuebid of their suit: 12 or more points. Asks partner to describe the hand further.', { lo: 12 }, { force: 1, conv: 1 }));
      ['s', 'h', 'd', 'c'].forEach(function (s) {
        if (ts[s]) return;
        var bb = X.cheap(sIdx(s)); if (!bb) return; var l = lvOf(bb);
        if (l <= 3 && (s === 'h' || s === 's')) L.push(r((l + 2) + s.toUpperCase(), function (h) { return h.len[s] >= 4 && h.hcp >= 10 && h.hcp <= 12 && longestUnbid(h, ts) === s && l + 2 === 4; }, 'To play: game in ' + SUITWORD[s] + ', with 4 or more of them and 10 to 12 points.', { lo: 10, len: o1(s, 4) }));
        if (l <= 2) L.push(r((l + 1) + s.toUpperCase(), function (h) { return h.len[s] >= 4 && h.hcp >= 9 && h.hcp <= 11 && longestUnbid(h, ts) === s; }, 'Jump answer: 4 or more ' + SUITWORD[s] + ' and 9 to 11 points. Invites game.', { lo: 9, hi: 11, len: o1(s, 4) }, { inv: 1 }));
      });
      if (X.can('1N')) L.push(r('1N', function (h) { return h.hcp >= 6 && h.hcp <= 10 && stopper(h, os) && h.len.h < 4 && h.len.s < 4; }, '6 to 10 points with ' + SUITWORD[os] + ' stopped, and no 4-card major.', { lo: 6, hi: 10 }));
      if (X.can('2N') && lvOf(op.c) === 1) L.push(r('2N', function (h) { return h.hcp >= 11 && h.hcp <= 12 && stopper(h, os); }, 'Invites game: 11 to 12 points with ' + SUITWORD[os] + ' stopped.', { lo: 11, hi: 12 }, { inv: 1 }));
      if (free) L.push(r('P', function (h) { return h.hcp < 6; }, 'Their bid takes the pressure off: nothing to say with a weak hand.', { hi: 5 }));
      if (!free) L.push(r('P', function (h) { return h.len[os] >= 5 && top5(h, os) >= 3 && lvOf(op.c) === 1; }, 'Penalty pass: long, strong ' + SUITWORD[os] + '. It turns partner\'s double into one for penalty.', { len: o1(os, 5) }));
      ['s', 'h', 'd', 'c'].forEach(function (s) {
        if (ts[s]) return; var bb = X.cheap(sIdx(s)); if (!bb || lvOf(bb) > 3) return;
        if (free) L.push(r(bb, function (h) { return longestUnbid(h, ts) === s && h.hcp >= 6 && h.len[s] >= 4; }, 'A free answer to the double: 4 or more ' + SUITWORD[s] + ' and some values, about 6 to 11 points.', { lo: 6, hi: 11, len: o1(s, 4) }));
        else L.push(r(bb, function (h) { return longestUnbid(h, ts) === s; }, 'Answers the double: ' + SUITWORD[s] + ' is this hand\'s best suit, with 0 to 8 points.', { hi: 8, len: o1(s, 3) }));
      });
      L.push(r('P', T, 'Nothing to say.', null));
      return L;
    }
    if (isBid(pc) && stOf(pc) < 4) {
      var ps = SUITS[stOf(pc)], weak = X.pics[X.pd].f.weak;
      var cue2 = os ? X.cheap(sIdx(os)) : null;
      if (cue2 && lvOf(cue2) <= 3 && !weak) L.push(r(cue2, function (h) { return h.len[ps] >= 3 && supPts(h, ps) >= 11; }, 'Cuebid of their suit: support for partner\'s ' + SUITWORD[ps] + ' and 11 or more points.', { lo: 11, len: o1(ps, 3) }, { force: 1, fit: ps, conv: 1 }));
      if ((ps === 'h' || ps === 's') && X.can('4' + ps.toUpperCase())) L.push(r('4' + ps.toUpperCase(), function (h) { return h.len[ps] >= (weak ? 3 : 4) && (h.hcp < 10 && h.shape[3] <= 1 || weak && h.hcp >= 15); }, weak ? 'Raises to game opposite a weak jump overcall.' : 'Raises to game: 4 or more ' + SUITWORD[ps] + ', mostly to block the opponents.', { len: o1(ps, 4) }, { fit: ps }));
      var rz = X.cheap(sIdx(ps));
      if (rz && lvOf(rz) <= 3) L.push(r(rz, function (h) { var p = supPts(h, ps); return h.len[ps] >= 3 && p >= 6 && p <= 10; }, 'Raise: 3 or more ' + SUITWORD[ps] + ' and 6 to 10 points.', { lo: 6, hi: 10, len: o1(ps, 3) }, { fit: ps }));
      if (os && X.can('1N')) L.push(r('1N', function (h) { return h.hcp >= 8 && h.hcp <= 11 && stopper(h, os); }, '8 to 11 points with ' + SUITWORD[os] + ' stopped.', { lo: 8, hi: 11 }));
      if (os && X.can('2N')) L.push(r('2N', function (h) { return h.hcp >= 12 && h.hcp <= 14 && stopper(h, os); }, 'Invites game: 12 to 14 points with ' + SUITWORD[os] + ' stopped.', { lo: 12, hi: 14 }, { inv: 1 }));
      if (os && X.can('3N')) L.push(r('3N', function (h) { return h.hcp >= 15 && stopper(h, os); }, 'To play: 15 or more points with ' + SUITWORD[os] + ' stopped.', { lo: 15 }));
      ['s', 'h', 'd', 'c'].forEach(function (s) {
        if (ts[s] || s === ps) return; var bb = X.cheap(sIdx(s)); if (!bb || lvOf(bb) > 2) return;
        L.push(r(bb, function (h) { return h.len[s] >= 5 && goodSuit(h, s) && h.hcp >= 10 && h.len[ps] <= 2; }, 'A new suit: a good 5 or more ' + SUITWORD[s] + ' and 10 or more points.', { lo: 10, len: o1(s, 5) }));
      });
      L.push(r('P', T, 'Not enough to bid over partner\'s overcall.', { hi: 9 }));
      return L;
    }
    if (pc === '1N' || pc === '2N') return nt1Resp(X, pc === '1N' ? 1 : 2).filter(function (q) { return X.can(q.c); }).concat([r('P', T, 'Nothing to add.')]);
    return laterRules(X);
  }
  function longestUnbid(h, ts) { return longest(h, SUITS.filter(function (s) { return !ts[s]; })); }

  // ── Ace and king asks ──
  // 4NT is Blackwood unless it comes straight after partner's notrump with no suit agreed (then it invites 6NT)
  function isBW(X, e) {
    if (!e || e.c !== '4N') return false;
    // our side's calls before it
    var before = X.calls.slice(0, e.i).map(function (c, i) { return { c: c, by: (X.dealer + i) % 4 }; }).filter(function (q) { return q.c !== 'P' && side(q.by) === side(e.by); });
    var prev = before[before.length - 1];
    if (prev && isBid(prev.c) && stOf(prev.c) === 4) return false;
    return before.some(function (q) { return isBid(q.c) && stOf(q.c) < 4; });
  }
  function blackwoodState(X) {
    var L = [];
    var ours = X.ours, n = ours.length; if (!n) return null;
    var last = ours[n - 1];
    // partner asked for aces: answer (they may have bid in between: then just answer anyway, or pass/double)
    if (last.by === X.pd && last.c === '4N' && isBW(X, last)) {
      var steps = [['5C', '0 or 4 aces'], ['5D', '1 ace'], ['5H', '2 aces'], ['5S', '3 aces']];
      steps.forEach(function (q, i) { L.push(r(q[0], function (h) { return h.aces % 4 === i; }, 'Answers Blackwood: ' + q[1] + '.', null, { conv: 1, aces: q[1] })); });
      return L;
    }
    if (last.by === X.pd && last.c === '5N' && n >= 3 && ours[n - 3].c === '4N' && ours[n - 3].by === X.pd && isBW(X, ours[n - 3])) {
      [['6C', '0 or 4 kings'], ['6D', '1 king'], ['6H', '2 kings'], ['6S', '3 kings']].forEach(function (q, i) { L.push(r(q[0], function (h) { return h.kings % 4 === i; }, 'Answers the king ask: ' + q[1] + '.', null, { conv: 1 })); });
      return L;
    }
    // I asked and partner answered: place the contract
    if (n >= 2 && last.by === X.pd && ours[n - 2].by === X.me && ours[n - 2].c === '4N' && isBW(X, ours[n - 2]) && /^5[CDHS]$/.test(last.c)) {
      var shown = stOf(last.c);   // 0..3 aces (0 = 0 or 4)
      return [{ c: null, dyn: function (h) {
        var fit = agreedSuit(X, h);
        var pa = shown === 0 ? (h.aces === 0 ? 4 : 0) : shown;
        var tot = pa + h.aces, t = fit != null ? sIdx(fit) : 4;
        if (tot <= 2) return { c: X.can(mkBid(5, t)) ? mkBid(5, t) : X.cheap(t) || 'P', say: 'Signs off: the side is missing two aces, too many for a slam.' };
        if (tot === 3) return { c: X.can(mkBid(6, t)) ? mkBid(6, t) : 'P', say: 'To play: a small slam, missing one ace.' };
        var est = h.hcp + mid(X.pdPic);
        if (est >= 35) return { c: '5N', say: 'Asks for kings: every ace is here, so a grand slam is possible.', ext: { conv: 1 } };
        return { c: mkBid(6, t), say: 'To play: a small slam with every ace.' };
      } }];
    }
    if (n >= 2 && last.by === X.pd && ours[n - 2].by === X.me && ours[n - 2].c === '5N' && /^6[CDHS]$/.test(last.c)) {
      var sk = stOf(last.c);
      return [{ c: null, dyn: function (h) {
        var fit2 = agreedSuit(X, h), t2 = fit2 != null ? sIdx(fit2) : 4;
        var pk = sk === 0 ? (h.kings === 0 ? 4 : 0) : sk, tot = pk + h.kings;
        var est = h.hcp + mid(X.pdPic);
        if (tot === 4 && est >= 35) return { c: mkBid(7, t2), say: 'To play: a grand slam, with every ace and king.' };
        return { c: X.can(mkBid(6, t2)) ? mkBid(6, t2) : 'P', say: 'To play: a small slam. A king is missing.' };
      } }];
    }
    return null;
  }
  function mid(pic) { var hi = Math.min(pic.hi, pic.lo + 8); return Math.round((pic.lo * 2 + hi) / 3); }
  // the suit our side has agreed (both of us bid it, or one bid it and the other showed support), or a long one
  function agreedSuit(X, h) {
    var best = null, bl = 0;
    SUITS.forEach(function (s) {
      var me = h ? h.len[s] : X.myPic.len[s], pd = X.pdPic.len[s];
      var n = me + pd;
      if (n >= 8 && (n > bl || n === bl && (s === 'h' || s === 's') && !(best === 'h' || best === 's'))) { best = s; bl = n; }
    });
    return best;
  }

  // ── Every later call: place the contract ──
  // The computer works out what the partnership holds (its own hand and what partner has shown), where the
  // partnership belongs, and bids toward it: pass when we're there, invite when partner's range decides it,
  // a forcing bid when partner's last bid demands one, compete for a partscore, and double when they've gone too far.
  function laterRules(X) {
    return [{ c: null, dyn: function (h) { return place(X, h); } }];
  }
  function place(X, h) {
    var pd = X.pdPic, me = X.me, a = X.a;
    var pdMid = mid(pd), pdLo = pd.lo, pdHi = Math.min(pd.hi, 37);
    var ourLast = a.last && side(a.lastBy) === side(me);
    var theirLast = a.last && !ourLast;
    // partner's forcing bid binds only if it came after this hand's last call
    var pdLastI = X.pdBids.length ? X.pdBids[X.pdBids.length - 1].i : -1, myLastI = X.myBids.length ? X.myBids[X.myBids.length - 1].i : -1;
    var pdForce = pdLastI > myLastI && lastRuleOf(X, X.pd) && lastRuleOf(X, X.pd).force && X.pdBids[X.pdBids.length - 1].c !== 'X';
    var gameForce = X.ours.some(function (e) { var ru = ruleAt(X, e.i); return ru && ru.force === 'game'; });
    // our best fit
    var fit = null, fitLen = 0;
    SUITS.forEach(function (s) {
      var n = h.len[s] + pd.len[s];
      if (n >= 8 && (n > fitLen || n === fitLen && (s === 'h' || s === 's'))) { fit = s; fitLen = n; }
      else if (n >= 8 && (s === 'h' || s === 's') && !(fit === 'h' || fit === 's')) { fit = s; fitLen = n; }
    });
    // (the hand with the longer trumps counts its length and a little for shortness; the shorter one, dummy points)
    var longHand = fit && h.len[fit] > pd.len[fit];
    var short = 0; if (fit) SUITS.forEach(function (s) { if (s !== fit) short += h.len[s] === 0 ? 2 : h.len[s] === 1 ? 1 : 0; });
    var myPts = fit ? (longHand ? h.hcp + h.lp + Math.min(short, 2) : supPts(h, fit)) : h.hcp + (h.bal ? 0 : Math.min(h.lp, 2));
    var tot = myPts + pdMid, totLo = myPts + pdLo, totHi = myPts + pdHi;
    var hcpTot = h.hcp + Math.min(pdMid, pdLo + 2);   // (slams are counted in high cards: shape alone doesn't take twelve tricks)
    var theyHaveSuit = Object.keys(X.theirSuits);
    var allStopped = theyHaveSuit.every(function (s) { return stopper(h, s); });
    var major = fit === 'h' || fit === 's';
    // where we belong: [strain, level]
    var tgt = null, why = '';
    var ntOk = !fit ? (h.bal || pd.bal && h.shape[0] <= 5 && h.shape[3] >= 1) && allStopped : !major && fitLen < 9 && (h.bal || pd.bal) && allStopped || !major && allStopped && h.bal;
    if (fit && !ntOk) {
      var st = sIdx(fit);
      if (tot >= 37 && hcpTot >= 35) tgt = [st, 7]; else if (tot >= 33 && hcpTot >= 32) tgt = [st, 6];
      else if (tot >= (major ? 25 : 28)) tgt = [st, major ? 4 : 5];
      else tgt = [st, Math.max(2, Math.min(fitLen - 6, 3))];
    } else if (ntOk) {
      if (hcpTot >= 37) tgt = [4, 7]; else if (hcpTot >= 33) tgt = [4, 6]; else if (tot >= 25) tgt = [4, 3]; else tgt = [4, tot >= 23 ? 2 : 1];
    } else {
      // no fit: partner's long suit, notrump with the other suits covered, or this hand's own long suit
      var mine = longest(h), pl = SUITS.filter(function (s) { return pd.len[s] >= 6; })[0] || SUITS.filter(function (s) { return pd.len[s] >= 5; })[0];
      var others = SUITS.filter(function (s) { return pd.len[s] < 4; });
      var covered = others.filter(function (s) { return stopper(h, s); }).length >= Math.min(2, others.length) && theyHaveSuit.every(function (s) { return stopper(h, s); });
      if (pl && h.len[pl] >= 2 && pd.len[pl] + h.len[pl] >= 7 && !(tot >= 25 && covered && pl !== 'h' && pl !== 's')) tgt = [sIdx(pl), tot >= 25 ? gameLvl(sIdx(pl)) : 2];
      else if (tot >= 25 && covered) tgt = [4, hcpTot >= 33 ? 6 : 3];
      else tgt = [sIdx(mine), tot >= 27 && h.len[mine] >= 6 ? gameLvl(sIdx(mine)) : h.len[mine] >= 6 && tot >= 22 ? 3 : 2];
    }
    var tgtBid = mkBid(tgt[1], tgt[0]);
    // they bid last: compete, double, or let them have it
    if (theirLast) {
      var tl = lvOf(a.last), tst = stOf(a.last);
      // partner doubled them for penalty: leave it in
      if (a.dbl === 1 && side(a.dblBy) === side(me) && a.dblBy === X.pd) {
        var dr = ruleAt(X, X.calls.lastIndexOf('X'));
        if (!(dr && (dr.tko || dr.conv))) return { c: 'P', say: 'Leaves partner\'s penalty double in: their contract should go down.' };
      }
      var defense = qt(h) + (h.len[suitOfSt(tst)] >= 4 && tst < 4 ? Math.min(2, top5(h, suitOfSt(tst))) : 0) + pdLo / 5;
      var needSet = 8 - tl;
      if (X.can('X') && a.dbl === 0 && h.lv !== 'easy' && tl >= 2 && defense >= needSet + 0.5 && totLo >= 20) return { c: 'X', say: 'Penalty double: this side has the strength to beat their contract.' };
      if (X.can('X') && a.dbl === 0 && h.lv === 'hard' && tl >= 4 && tot >= 23 && defense >= needSet) return { c: 'X', say: 'Penalty double: this side has the strength to beat their contract.' };
      // compete to the level our fit is worth, or bid our game/slam
      var mine2 = tgtBid;
      if (bidRank(mine2) > bidRank(a.last)) {
        var lvlNeeded = lvOf(X.cheap(tgt[0]) || '8C');
        var allowed = tot >= 25 ? tgt[1] : fit ? Math.min(tgt[1], fitLen - 6) : tgt[0] === 4 ? (tot >= 23 ? 2 : 1) : 2;
        if (lvlNeeded <= allowed && (tot >= 19 || fit && fitLen >= 9 && tot >= 15) && !(X.myBids.length === 0 && X.pdBids.length === 0 && h.hcp < 12)) {
          var bb = X.cheap(tgt[0]);
          if (bb && lvOf(bb) >= tgt[1]) return { c: bb, say: describePlace(bb, tot, fit, true) };
          if (bb) return { c: bb, say: tot >= 25 ? 'Keeps bidding toward game in ' + SW(tgt[0]) + '.' : fit && sIdx(fit) === tgt[0] ? 'Competes in ' + SW(tgt[0]) + ': the partnership has a fit and some strength.' : 'Competes in ' + SW(tgt[0]) + ', this hand\'s best suit.' };
        }
      }
      return { c: 'P', say: 'Lets them play it: bidding on would be too risky.' };
    }
    // our side bid last (or we were doubled)
    var cur = a.last, curL = lvOf(cur), curSt = stOf(cur), ourCur = side(a.lastBy) === side(me);
    // slam: ask for aces first when a suit is agreed
    var askedBW = X.ours.some(function (e) { return e.c === '4N' && isBW(X, e); });
    if (fit && tot >= 33 && hcpTot >= 32 && !askedBW && X.can('4N') && !ntOk && h.lv !== 'easy') return { c: '4N', say: 'Blackwood: asks partner how many aces they hold, on the way to a slam.', ext: { conv: 1, bw: 1 } };
    if (!fit && ntOk && hcpTot >= 31 && hcpTot <= 32 && X.can('4N') && curSt === 4 && pdHi - pdLo >= 2 && !askedBW) return { c: '4N', say: 'Invites a slam in notrump: partner bids 6NT with a maximum.', ext: { quant: 1 } };
    // already there (or partner's last bid set the contract)
    var curIsTgt = curSt === tgt[0] && curL >= tgt[1];
    var pdSignedOff = X.pdBids.length && lastRuleOf(X, X.pd) && lastRuleOf(X, X.pd).signoff;
    if (curIsTgt && !pdForce || curL >= 6 && curSt === tgt[0] && !pdForce) return { c: 'P', say: 'The partnership has found its contract.' };
    if (pdSignedOff && a.lastBy === X.pd && !pdForce) return { c: 'P', say: 'Partner chose where to stop.' };
    // partner bid a game: leave it there, unless a slam is on, or a long major of this hand's own plays better than notrump
    if (a.lastBy === X.pd && isGameOrMore(cur) && curL < 6 && !pdForce && tot < 33) {
      var lm = ['s', 'h'].filter(function (s) { return h.len[s] >= 6 && X.myPic.len[s] < 6 && pd.len[s] < 3; })[0];
      if (curSt === 4 && lm && X.can('4' + lm.toUpperCase())) return { c: '4' + lm.toUpperCase(), say: 'Prefers ' + SUITWORD[lm] + ': with 6 or more of them, game in ' + SUITWORD[lm] + ' plays better than in notrump.' };
      return { c: 'P', say: 'Partner chose the game.' };
    }
    if (gameForce && !isGameOrMore(cur) || pdForce) {
      // must bid: the target if it is above, otherwise something descriptive
      if (bidRank(tgtBid) > bidRank(cur) && X.can(tgtBid) && (tgt[1] >= gameLvl(tgt[0]) || !gameForce)) return { c: tgtBid, say: describePlace(tgtBid, tot, fit, false) };
      var g = mkBid(gameLvl(tgt[0]), tgt[0]);
      if (gameForce && X.can(g)) return { c: g, say: describePlace(g, tot, fit, false) };
      // descriptive: support partner's last suit, rebid a long suit, or notrump
      if (fit && X.cheap(sIdx(fit)) && lvOf(X.cheap(sIdx(fit))) <= Math.max(4, gameLvl(sIdx(fit)))) return { c: X.cheap(sIdx(fit)), say: 'Shows the fit in ' + SUITWORD[fit] + '.', ext: { fit: fit } };
      var pr = lastRuleOf(X, X.pd);
      var ps = X.pdLast && isBid(X.pdLast) && stOf(X.pdLast) < 4 && !(pr && pr.conv) && !X.theirSuits[SUITS[stOf(X.pdLast)]] ? SUITS[stOf(X.pdLast)] : null;
      if (ps && h.len[ps] >= 3 && X.cheap(sIdx(ps))) return { c: X.cheap(sIdx(ps)), say: 'Support for partner\'s ' + SUITWORD[ps] + '.', ext: { fit: ps } };
      var ls = longest(h); if (h.len[ls] >= 5 && X.cheap(sIdx(ls)) && lvOf(X.cheap(sIdx(ls))) <= 4) return { c: X.cheap(sIdx(ls)), say: 'Shows ' + SUITWORD[ls] + ' again: 5 or more of them.', ext: { len: o1(ls, 5) } };
      if (X.cheap(4) && lvOf(X.cheap(4)) <= 3) return { c: X.cheap(4), say: 'Notrump: no clear fit yet.' };
    }
    // aim higher?
    var gl = gameLvl(tgt[0]), gameBid = mkBid(gl, tgt[0]);
    var pdInv = lastRuleOf(X, X.pd) && lastRuleOf(X, X.pd).inv && a.lastBy === X.pd;
    // partner invited: accept with enough, decline without
    if (pdInv && !isGameOrMore(cur)) {
      if (tot >= 25 && X.can(gameBid)) return { c: gameBid, say: 'Accepts the invitation: game in ' + SW(tgt[0]) + '.' };
      if (tot >= 25 && curSt === 4 && X.can('3N')) return { c: '3N', say: 'Accepts the invitation: game in notrump.' };
      return { c: 'P', say: 'Declines the invitation: not enough for game.' };
    }
    if (bidRank(tgtBid) > bidRank(cur)) {
      // invite when partner's range decides it: game is possible but not sure
      if (tgt[1] < gl && tot >= 22 && totHi >= 25 && X.ours.length >= 2 && (fit && sIdx(fit) === tgt[0] || tgt[0] === 4)) {
        var inv = mkBid(tgt[0] === 4 ? 2 : 3, tgt[0]);
        if (X.can(inv) && bidRank(inv) > bidRank(cur) && !(lastRuleOf(X, X.me) && lastRuleOf(X, X.me).inv)) return { c: inv, say: 'Invites game in ' + SW(tgt[0]) + ': partner goes on with the top of what they have shown.', ext: { inv: 1 } };
      }
      if (X.can(tgtBid) && (tgt[1] >= gl || ourCur && a.lastBy === X.pd && curSt !== tgt[0] && lvOf(tgtBid) <= 3)) return { c: tgtBid, say: describePlace(tgtBid, tot, fit, false) };
    }
    // a sign-off or a correction to a better strain at the same level
    if (ourCur && curSt !== tgt[0] && fit && X.cheap(tgt[0]) && lvOf(X.cheap(tgt[0])) <= Math.max(curL, 2) + 1 && lvOf(X.cheap(tgt[0])) <= (tot >= 25 ? 5 : 3) && a.lastBy === X.pd) {
      var cb = X.cheap(tgt[0]);
      return { c: cb, say: 'Prefers ' + SW(tgt[0]) + ': the partnership\'s fit.' };
    }
    return { c: 'P', say: ourCur ? 'Happy where the bidding stands.' : 'Nothing more to say.' };
  }
  function gameLvl(st) { return st === 4 ? 3 : st >= 2 ? 4 : 5; }
  function isGameOrMore(c) { if (!c) return false; return lvOf(c) >= gameLvl(stOf(c)); }
  function describePlace(b, tot, fit, comp) {
    var l = lvOf(b), st = stOf(b);
    if (l === 7) return 'To play: a grand slam in ' + SW(st) + '.';
    if (l === 6) return 'To play: a small slam in ' + SW(st) + '.';
    if (l >= gameLvl(st)) return 'To play: game in ' + SW(st) + '.';
    return comp ? 'Competes in ' + SW(st) + '.' : 'Bids ' + SW(st) + ': the partnership\'s best spot.';
  }

  // Walk the auction: what each call meant and what each player has shown. Cached per auction text.
  var CACHE = {};
  function analyze(calls, dealer) {
    var key = dealer + ':' + calls.join(',');
    if (CACHE[key]) return CACHE[key];
    var pics = [blank(), blank(), blank(), blank()], out = [];
    for (var i = 0; i < calls.length; i++) {
      var X = context(calls.slice(0, i), dealer, pics), ru = matchRule(X, calls[i]);
      out.push(ru);
      var by = (dealer + i) % 4;
      if (ru && ru.sh) apply(pics[by], ru.sh);
      if (ru && (ru.fit || ru.force || ru.inv || ru.weak || ru.tko || ru.jac)) { var f = pics[by].f; ['fit', 'force', 'inv', 'weak', 'tko', 'jac', 'quant'].forEach(function (k) { if (ru[k]) f[k] = ru[k]; }); }
      if (ru && !ru.force) pics[by].f.force = 0;
      if (ru && ru.fit) apply(pics[by], { len: o1(ru.fit, 3) });
    }
    var res = { rules: out, pics: pics };
    CACHE[key] = res;
    var ks = Object.keys(CACHE); if (ks.length > 400) CACHE = {};
    return res;
  }
  function ruleAt(X, i) { return analyze(X.calls.slice(0, i + 1), X.dealer).rules[i]; }
  function lastRuleOf(X, p) { for (var i = X.calls.length - 1; i >= 0; i--) if ((X.dealer + i) % 4 === p && X.calls[i] !== 'P') return ruleAt(X, i); return null; }
  // The meaning of a call in its place (for the auction table, and for a person's own bids)
  function matchRule(X, call) {
    var L = rulesFor(X), hits = [];
    for (var i = 0; i < L.length; i++) {
      var q = L[i];
      if (q.c === call) hits.push(q);
      if (q.dyn) break;   // (a placement: the call is read as its plain meaning below)
    }
    if (!hits.length) return genericMeaning(X, call);
    var real = hits.filter(function (q) { return q.sh; });
    if (real.length) hits = real;
    if (hits.length === 1) return hits[0];
    // the same call on more than one rule: partner learns only what they all share
    var o = {}; for (var k in hits[0]) o[k] = hits[0][k];
    var sh = { lo: 37, hi: 0, len: {} };
    hits.forEach(function (h) {
      var s2 = h.sh || {};
      sh.lo = Math.min(sh.lo, s2.lo != null ? s2.lo : 0); sh.hi = Math.max(sh.hi, s2.hi != null ? s2.hi : 37);
      SUITS.forEach(function (s) { var v = s2.len && s2.len[s] || 0; sh.len[s] = sh.len[s] == null ? v : Math.min(sh.len[s], v); });
      if (h === hits[0] && s2.bal) sh.bal = 1;
      ['force', 'inv', 'fit'].forEach(function (f) { if (!h[f]) o[f] = o[f] && h[f] ? o[f] : 0; });
    });
    o.sh = sh;
    return o;
  }
  function genericMeaning(X, call) {
    var o = { c: call, say: '', sh: null };
    var ours = X.ours, prevOur = ours.length ? ours[ours.length - 1] : null;
    if (call === '4N' && isBW(X, { c: '4N', by: X.me, i: X.calls.length })) { o.say = 'Blackwood: asks partner how many aces they hold, on the way to a slam.'; o.conv = 1; return o; }
    if (call === '5N' && ours.some(function (e) { return e.by === X.me && e.c === '4N' && isBW(X, e); })) { o.say = 'Asks partner how many kings they hold: every ace is on this side, so a grand slam is possible.'; o.conv = 1; return o; }
    if (call === 'P') { o.say = X.a.last ? 'No bid: content to stop here, or nothing useful to add.' : 'No bid.'; return o; }
    if (call === 'X') { var ourLast = X.a.last && side(X.a.lastBy) === side(X.me); o.say = X.a.lastBy >= 0 && lvOf(X.a.last) >= 3 ? 'Penalty double: expects to beat their contract.' : 'Double: asks partner to bid a suit, or expects to beat them if partner passes.'; return o; }
    if (call === 'XX') { o.say = 'Redouble: expects to make the contract, and doubles the score if it does.'; return o; }
    var l = lvOf(call), st = stOf(call);
    var ourBidBefore = X.ours.some(function (e) { return isBid(e.c) && stOf(e.c) === st; });
    var pdBidIt = X.pdBids.some(function (e) { return isBid(e.c) && stOf(e.c) === st; });
    var competing = X.a.lastBy >= 0 && side(X.a.lastBy) !== side(X.me);
    if (l === gameLvl(st) - 1 && !competing && X.ours.length >= 2 && (pdBidIt || st === 4)) { o.say = 'Invites game in ' + SW(st) + ': partner goes on with the top of what they have shown.'; o.inv = 1; if (st < 4) { o.sh = { len: o1(SUITS[st], 3) }; o.fit = SUITS[st]; } return o; }
    if (l >= gameLvl(st) && l < 6) o.say = 'To play: game in ' + SW(st) + '.';
    else if (l === 6) o.say = 'To play: a small slam in ' + SW(st) + '.';
    else if (l === 7) o.say = 'To play: a grand slam in ' + SW(st) + '.';
    else if (st === 4) o.say = 'Notrump: a balanced hand, and the opponents\' suits stopped.';
    else if (X.theirSuits[SUITS[st]]) o.say = 'Cuebid of their suit: a strong hand that asks partner to describe further.';
    else if (pdBidIt) o.say = 'Support for partner\'s ' + SUITWORD[SUITS[st]] + '.';
    else if (ourBidBefore) { o.say = 'Shows ' + SUITWORD[SUITS[st]] + ' again: 5 or more of them.'; if (X.opener === X.pd && X.cheap(st) === call) { o.say = 'Shows ' + SUITWORD[SUITS[st]] + ' again: 5 or more of them, and not much more than a minimum answer.'; o.sh = { hi: 10, len: o1(SUITS[st], 5) }; return o; } }
    else o.say = 'Shows ' + SUITWORD[SUITS[st]] + ': 4 or more of them.';
    if (st < 4) o.sh = { len: o1(SUITS[st], pdBidIt ? 3 : 4) };
    if (pdBidIt && st < 4) o.fit = SUITS[st];
    return o;
  }

  // The computer's call. lv: 'easy' | 'normal' | 'hard'. Returns {call, say}
  function chooseCall(hand, calls, dealer, lv) {
    var A = analyze(calls, dealer), X = context(calls, dealer, A.pics), h = feat(hand, lv);
    var L = rulesFor(X), pick = null;
    for (var i = 0; i < L.length && !pick; i++) {
      var q = L[i];
      if (q.dyn) { var d = q.dyn(h); if (d && d.c && X.can(d.c)) pick = { call: d.c, say: d.say }; else if (d && d.c === 'P') pick = { call: 'P', say: d.say }; continue; }
      if (!q.c || !X.can(q.c)) continue;
      if (q.ok(h, X)) pick = { call: q.c, say: q.say };
    }
    if (!pick) pick = { call: 'P', say: 'Nothing more to say.' };
    // Easy forgets to compete now and then
    if (lv === 'easy' && pick.call !== 'P' && X.a.last && R() < 0.12) pick = { call: 'P', say: 'Nothing more to say.' };
    return pick;
  }
  // What a call means where it was made (the auction table's explanations)
  function meaning(calls, dealer, i) {
    var A = analyze(calls.slice(0, i), dealer), X = context(calls.slice(0, i), dealer, A.pics);
    var ru = matchRule(X, calls[i]);
    if (ru && ru.dyn) ru = genericMeaning(X, calls[i]);
    return ru ? ru.say : '';
  }
  function pictures(calls, dealer) { return analyze(calls, dealer).pics; }

  // ══════════════════════════════════════════════════════════════════════════
  // Card play
  // ══════════════════════════════════════════════════════════════════════════
  // G (the play state the engine reads): {hands[4], trick: [{p, c}], played: [{p, c}] (every card so far, in order),
  //   k: contract {lvl, st, decl}, dummy, shown (dummy face up), voids: [{s: 1}], won: [ns, ew], calls, dealer, lead: p}
  function trumpOf(G) { return G.k.st < 4 ? SUITS[G.k.st] : null; }
  function whoControls(G, p) { return p === G.dummy ? G.k.decl : p; }   // the declarer plays the dummy's cards
  // What player p (the one choosing) can see: own hand, the dummy (once face up), and every card played
  function knownTo(G, p) {
    var me = whoControls(G, p);
    var vis = {}; vis[me] = true; if (G.shown || me === G.dummy) vis[G.dummy] = true;
    if (me === G.k.decl) vis[G.dummy] = true;
    return vis;
  }
  function playedSet(G) { var o = {}; G.played.forEach(function (x) { o[x.c.id] = 1; }); return o; }
  // the highest card of suit s not yet played and not in the hands listed
  function outstanding(G, s, exclude) {
    var pl = playedSet(G), out = [];
    RANKS.forEach(function (r) {
      var id = cid(r, s); if (pl[id]) return;
      for (var q = 0; q < exclude.length; q++) if (G.hands[exclude[q]].some(function (c) { return c.id === id; })) return;
      out.push(RV[r]);
    });
    return out.sort(function (a, b) { return b - a; });
  }
  // is card c (held by p's side, visible hands vis) the highest of its suit still out?
  function isBoss(G, c, seen) {
    var pl = playedSet(G);
    for (var v = RV[c.r] + 1; v <= 14; v++) { var id = cid(RN[v], c.s); if (pl[id]) continue; if (seen[id]) continue; return false; }
    return true;
  }
  function seenCards(G, vis) { var o = {}; for (var q in vis) G.hands[q].forEach(function (c) { o[c.id] = 1; }); return o; }
  function lowest(cs) { return cs.slice().sort(function (a, b) { return RV[a.r] - RV[b.r]; })[0]; }
  function highest(cs) { return cs.slice().sort(function (a, b) { return RV[b.r] - RV[a.r]; })[0]; }
  function bySuit(cs) { var o = { c: [], d: [], h: [], s: [] }; cs.forEach(function (c) { o[c.s].push(c); }); for (var s in o) o[s].sort(function (a, b) { return RV[b.r] - RV[a.r]; }); return o; }
  function curWinner(trick, trump) { return trick.length ? trickWinner(trick, trump) : -1; }
  function winCard(trick, trump) { var w = curWinner(trick, trump); for (var i = 0; i < trick.length; i++) if (trick[i].p === w) return trick[i].c; return null; }

  // Opening leads, by the standard conventions
  function openingLead(G, p, lv) {
    var h = G.hands[p], t = trumpOf(G), S = bySuit(h), pics = pictures(G.calls, G.dealer);
    var pd = partner(p), decl = G.k.decl, dummy = G.dummy;
    var bidSuits = {}; (G.calls || []).forEach(function (c, i) { if (isBid(c) && stOf(c) < 4) { var by = (G.dealer + i) % 4; (bidSuits[by] = bidSuits[by] || {})[SUITS[stOf(c)]] = 1; } });
    var pdSuits = bidSuits[pd] || {}, theirs = Object.assign({}, bidSuits[decl] || {}, bidSuits[dummy] || {});
    if (lv === 'easy' && R() < 0.35) return h[Math.floor(R() * h.length)];
    // partner's suit: high from a doubleton, top of a sequence, low from three or more with an honor
    var ps = SUITS.filter(function (s) { return pdSuits[s] && S[s].length && s !== t; });
    if (ps.length) { var s0 = ps[ps.length - 1]; return leadFrom(S[s0], true); }
    var cand = SUITS.filter(function (s) { return S[s].length && s !== t; });
    if (!cand.length) cand = SUITS.filter(function (s) { return S[s].length; });
    // top of a strong sequence anywhere
    var seq = cand.filter(function (s) { return seqTop(S[s]) && !theirs[s]; });
    if (seq.length) { var best = seq.sort(function (a, b) { return RV[seqTop(S[b]).r] - RV[seqTop(S[a]).r]; })[0]; return seqTop(S[best]); }
    if (!t) {
      // notrump: fourth best from the longest and strongest suit they haven't bid
      var nt = cand.filter(function (s) { return !theirs[s]; }); if (!nt.length) nt = cand;
      nt.sort(function (a, b) { return S[b].length - S[a].length || hcpOf(S[b]) - hcpOf(S[a]); });
      var ls = S[nt[0]];
      if (ls.length >= 4) return ls[3];
      return ls.length === 2 ? ls[0] : ls[ls.length - 1];
    }
    // suit contract: a singleton with trumps to ruff, else a safe lead; avoid leading away from an ace
    if (S[t].length >= 1 && S[t].length <= 3 && lv !== 'easy') { var sg = cand.filter(function (s) { return S[s].length === 1 && RV[S[s][0].r] < 13 && !theirs[s]; }); if (sg.length) return S[sg[0]][0]; }
    var ak = cand.filter(function (s) { return S[s].length >= 2 && S[s][0].r === 'A' && S[s][1].r === 'K'; });
    if (ak.length) return S[ak[0]][1];   // (king from ace-king in this style: top of the sequence's... the ace shows it too)
    var safe = cand.filter(function (s) { return !theirs[s] && S[s][0].r !== 'A' && !(S[s][0].r === 'K' && S[s].length >= 2 && S[s][1].r !== 'Q'); });
    if (safe.length) {
      safe.sort(function (a, b) { return S[b].length - S[a].length; });
      var ss = S[safe[0]];
      if (ss.length === 2) return ss[0];
      if (ss.length >= 4) return ss[3];
      return ss[ss.length - 1];
    }
    // a trump lead when there's nothing better
    if (S[t].length >= 2) return lowest(S[t]);
    var any = cand.length ? S[cand[0]] : h;
    return lowest(any);
  }
  function seqTop(cs) {   // AK, KQ, QJ, JT with a third touching or near card (KQJ, KQT, QJ9, JT8, T98): the top card
    if (cs.length < 2) return null;
    var v = cs.map(function (c) { return RV[c.r]; });
    if (v[0] >= 10 && v[1] === v[0] - 1 && (cs.length === 2 ? v[0] >= 13 : v[2] >= v[0] - 3)) return cs[0];
    // interior: AQJ, KJT: top of the touching pair underneath
    if (cs.length >= 3 && v[1] >= 10 && v[2] === v[1] - 1 && v[0] > v[1] + 1 && v[0] < 14) return cs[1];
    return null;
  }
  function hcpOf(cs) { return cs.reduce(function (a, c) { return a + (HCPV[c.r] || 0); }, 0); }
  function leadFrom(cs, partnersSuit) {
    if (cs.length === 1) return cs[0];
    if (cs.length === 2) return cs[0];
    var sq = seqTop(cs); if (sq) return sq;
    if (RV[cs[0].r] >= 11) return cs[cs.length - 1];   // low from an honor
    return cs[0];   // top of nothing
  }

  // The computer's card. lv: 'easy' | 'normal' | 'hard'
  function chooseCard(G, p, lv) {
    var h = G.hands[p], opts = legalPlays(h, G.trick);
    if (opts.length === 1) return opts[0];
    if (!G.played.length) return openingLead(G, p, lv);
    if (lv === 'easy' && R() < 0.15) return opts[Math.floor(R() * opts.length)];
    if (lv === 'hard') return hardCard(G, p, opts);
    return normalCard(G, p, opts, lv === 'easy');
  }

  // ── Normal: the rules a good club player follows ──
  function normalCard(G, p, opts, dull) {
    var t = trumpOf(G), trick = G.trick, pos = trick.length, decl = G.k.decl, dm = G.dummy;
    var declSide = side(p) === side(decl), me = p;
    var vis = knownTo(G, p), seen = dull ? {} : seenCards(G, vis);
    if (dull) G.hands[p].forEach(function (c) { seen[c.id] = 1; });
    var boss = function (c) { return dull ? c.r === 'A' : isBoss(G, c, seen); };
    var mateHand = declSide ? (p === decl ? dm : decl) : partner(p);
    var S = bySuit(opts);
    var need = 6 + G.k.lvl, have = G.won[side(decl)], tricksLeft = 13 - G.played.length / 4 | 0;
    if (pos === 0) return declSide ? declLead(G, p, opts, boss, seen) : defLead(G, p, opts, boss, seen);
    var led = trick[0].c.s, wc = winCard(trick, t), wp = curWinner(trick, t), mateWinning = side(wp) === side(p);
    var follow = opts[0].s === led;
    var beaters = opts.filter(function (c) { return beats(c, wc, led, t); });
    var last = pos === 3;
    // the player still to play after me this trick (if any) and whether they can see to beat our card
    function safeFor(card) {   // would card hold the trick against the players still to come?
      if (last) return true;
      if (!boss(card) && card.s === led) {
        // a later player who is on our side doesn't matter
        var later = []; for (var k = pos + 1; k < 4; k++) later.push((trick[0].p + k) % 4);
        var enemiesLater = later.filter(function (q) { return side(q) !== side(p); });
        if (!enemiesLater.length) return true;
        // the dummy is visible: if the dummy is the enemy still to play, check it exactly
        if (enemiesLater.length === 1 && enemiesLater[0] === dm && vis[dm]) return !G.hands[dm].some(function (c) { return c.s === led && RV[c.r] > RV[card.r]; }) && !(t && !G.hands[dm].some(function (c) { return c.s === led; }) && G.hands[dm].some(function (c) { return c.s === t; }));
        return false;
      }
      if (card.s === t && led !== t) return true;
      return boss(card);
    }
    if (mateWinning) {
      // partner (or our other hand) is winning: if it's safe, play low (signal on partner's lead)
      var holds = last || safeFor(wc) || (pos === 2 && side(trick[0].p) === side(p) && false);
      if (holds || !beaters.length) {
        if (follow) {
          // attitude: on partner's lead as a defender, a high spot encourages when we hold the next honor
          if (!declSide && pos === 1 || !declSide && pos === 2 && trick[0].p === partner(p)) {
            var ours = S[led]; var hasHon = ours.some(function (c) { return RV[c.r] >= 12; });
            var spots = ours.filter(function (c) { return RV[c.r] <= 9; });
            if (hasHon && spots.length >= 2) return highest(spots);
          }
          return lowest(opts);
        }
        return discard(G, p, opts, boss, seen);
      }
    }
    if (follow) {
      if (!beaters.length) return lowest(opts);
      if (pos === 1) {
        // second hand low, but cover an honor with an honor, and take a sure trick at the end
        var ledC = trick[0].c;
        if (RV[ledC.r] >= 11 && !declSide) { var cover = beaters.filter(function (c) { return RV[c.r] >= 12; }); if (cover.length && !(side(trick[0].p) === side(dm) && false)) return lowest(cover); }
        if (declSide) {
          // our partner hand plays last: if it can win cheaply, play low here
          var mh = G.hands[mateHand].filter(function (c) { return c.s === led; });
          if (mh.some(function (c) { return beats(c, wc, led, t) && boss(c); })) return lowest(opts);
          var bb = beaters.filter(boss); if (bb.length && tricksLeft <= 4) return lowest(bb);
          return lowest(opts);
        }
        var sure = beaters.filter(boss);
        if (sure.length && (tricksLeft <= 3 || G.won[side(p)] + 1 >= 14 - need)) return lowest(sure);
        return lowest(opts);
      }
      if (pos === 2) {
        // third hand high: the cheapest card that wins, preferring one that holds the trick
        if (declSide && mateHand !== trick[1].p) {
          // finesse: our other hand led low, LHO played low, we hold a tenace (AQ): play the Q
        }
        var holdBeat = beaters.filter(safeFor);
        if (holdBeat.length) return lowest(holdBeat);
        // no card holds it for sure: play high (lowest of touching top cards) to force out their honor
        var top = highest(beaters), tv = RV[top.r];
        var touching = beaters.filter(function (c) { return true; }).sort(function (a, b) { return RV[b.r] - RV[a.r]; });
        var pick = top; for (var i = 1; i < touching.length; i++) { if (RV[touching[i].r] === tv - i) pick = touching[i]; else break; }
        return pick;
      }
      // fourth hand: win as cheaply as possible
      return lowest(beaters);
    }
    // void in the suit led
    if (t && opts.some(function (c) { return c.s === t; })) {
      var tr = opts.filter(function (c) { return c.s === t; });
      var ok = tr.filter(function (c) { return beats(c, wc, led, t); });
      if (ok.length) {
        if (last || pos === 2 && side(trick[0].p) !== side(p) || pos === 1 && !(declSide && G.hands[mateHand].some(function (c) { return c.s === led && beats(c, wc, led, t) && boss(c); }))) {
          // over-ruff danger from the last player: ruff high enough
          if (!last) {
            var lastP = (trick[0].p + 3) % 4;
            if (vis[lastP] && side(lastP) !== side(p) && !G.hands[lastP].some(function (c) { return c.s === led; })) { var hiT = G.hands[lastP].filter(function (c) { return c.s === t; }); if (hiT.length) { var need2 = ok.filter(function (c) { return RV[c.r] > RV[highest(hiT).r]; }); if (need2.length) return lowest(need2); } }
          }
          return lowest(ok);
        }
      }
    }
    return discard(G, p, opts, boss, seen);
  }
  // Throw away: from the weakest suit, keeping winners and length that guards; a high spot signals a suit to lead
  function discard(G, p, opts, boss, seen) {
    var t = trumpOf(G), S = bySuit(opts);
    var suits = SUITS.filter(function (s) { return S[s].length && s !== t; });
    if (!suits.length) return lowest(opts);
    suits.sort(function (a, b) { return value(S[a]) - value(S[b]); });
    var s = suits[0];
    function value(cs) { var v = 0; cs.forEach(function (c) { if (boss(c)) v += 10; v += (HCPV[c.r] || 0); }); return v + cs.length * 0.3; }
    return lowest(S[s]);
  }
  // Declarer leading from either of its hands
  function declLead(G, p, opts, boss, seen) {
    var t = trumpOf(G), decl = G.k.decl, dm = G.dummy, other = p === decl ? dm : decl;
    var A = bySuit(G.hands[p]), B = bySuit(G.hands[other]);
    var pl = playedSet(G);
    function outN(s) { var n = 13; n -= A[s].length + B[s].length; G.played.forEach(function (x) { if (x.c.s === s) n--; }); return n; }
    // 1) draw trumps while the opponents still hold some (unless the short hand needs its trumps to ruff)
    if (t && outN(t) > 0 && A[t].length) {
      var ruffable = SUITS.filter(function (s) { return s !== t && B[s].length === 0 && A[s].length > 0 && B[t].length > 0 && !A[s].some(boss) && A[t].length >= B[t].length; });
      if (ruffable.length && B[t].length <= 3 && A[t].length + B[t].length >= 7) return lowest(A[ruffable[0]]);
      var bt = A[t].filter(boss);
      if (bt.length) return highest(bt);
      if (B[t].some(boss) || A[t].length + B[t].length >= 8) return lowest(A[t]);
    }
    // 2) cash winners, high card from the short side first
    var cash = SUITS.filter(function (s) { return s !== t && A[s].some(boss) && (outN(s) > 0 || !t); });
    if (cash.length) {
      cash.sort(function (a, b) { return (A[a].length - B[a].length) - (A[b].length - B[b].length); });
      var s = cash[0];
      // in notrump, don't block: if the other hand also has winners and is longer, play the high one here first
      return highest(A[s].filter(boss));
    }
    // 3) a finesse: lead low toward a tenace in the other hand (A Q with the K missing)
    for (var i = 0; i < SUITS.length; i++) {
      var s2 = SUITS[i]; if (!A[s2].length || !B[s2].length) continue;
      var bv = B[s2].map(function (c) { return RV[c.r]; });
      for (var k = 0; k < bv.length - 1; k++) {
        var hi = bv[k], lo = bv[k + 1];
        var gap = []; for (var v = lo + 1; v < hi; v++) if (!pl[cid(RN[v], s2)] && !seen[cid(RN[v], s2)]) gap.push(v);
        if (gap.length === 1 && B[s2].slice(0, k + 1).every(function (c) { return boss(c) || true; }) && boss(B[s2][0])) return lowest(A[s2]);
      }
    }
    // 4) ruff in the short hand
    if (t && B[t].length) { var r2 = SUITS.filter(function (s) { return s !== t && A[s].length && !B[s].length; }); if (r2.length) return lowest(A[r2[0]]); }
    // 5) knock out their high card in our longest suit (lead high from a sequence, else low)
    var longS = SUITS.filter(function (s) { return A[s].length && s !== t; }).sort(function (a, b) { return (A[b].length + B[b].length) - (A[a].length + B[a].length); });
    if (longS.length) {
      var ls = A[longS[0]], sq = seqTop(ls);
      return sq || lowest(ls);
    }
    return lowest(opts);
  }
  // A defender leading after the opening lead
  function defLead(G, p, opts, boss, seen) {
    var t = trumpOf(G), S = bySuit(opts), pd = partner(p), dm = G.dummy, decl = G.k.decl;
    var need = 6 + G.k.lvl, setNeed = 14 - need - G.won[1 - side(decl)];
    // cash winners that set the contract
    var winners = opts.filter(boss).filter(function (c) { return c.s !== t || true; });
    if (winners.length && winners.length >= setNeed) return highest(winners);
    // return partner's suit (the suit partner led first)
    var pLead = null; for (var i = 0; i < G.played.length; i += 4) { if (G.played[i] && G.played[i].p === pd) { pLead = G.played[i].c.s; break; } }
    if (pLead && S[pLead].length && pLead !== t) return S[pLead].length === 2 ? S[pLead][0] : (boss(S[pLead][0]) ? S[pLead][0] : lowest(S[pLead]));
    // continue our own suit when we hold its winners
    var sure = winners.filter(function (c) { return c.s !== t; });
    if (sure.length && t) return highest(sure);
    // a suit partner signaled with a high spot on a discard
    var sig = null; G.played.forEach(function (x, i) { var lead = G.played[i - (i % 4)]; if (x.p === pd && lead && x.c.s !== lead.c.s && RV[x.c.r] >= 7 && x.c.s !== t) sig = x.c.s; });
    if (sig && S[sig].length) return S[sig].length <= 2 ? S[sig][0] : lowest(S[sig]);
    // lead through the dummy's weakness when the dummy is on our left; avoid leading into its tenaces
    var dmS = bySuit(G.hands[dm]);
    var cand = SUITS.filter(function (s) { return S[s].length && s !== t; });
    if (!cand.length) return lowest(opts);
    cand.sort(function (a, b) {
      function score(s) { var d = dmS[s], v = 0; if ((p + 1) % 4 === dm) v += d.length && RV[d[0].r] >= 12 ? -3 : 2; else v += d.length && RV[d[0].r] >= 13 ? 1 : 0; v += S[s].length * 0.5; if (!t && S[s].length >= 4) v += 2; return v; }
      return score(b) - score(a);
    });
    var cs = S[cand[0]];
    var sq = seqTop(cs); if (sq) return sq;
    if (t && cs.length === 1) return cs[0];
    return cs.length >= 4 ? cs[3] : lowest(cs);
  }

  // ── Hard: think each card through ──
  // Deals the unseen cards to the hidden hands in ways that fit everything known (cards played, suits players are
  // out of, and what the bidding showed: points and suit lengths), plays each candidate card out to the end of the
  // deal on every one of those layouts, and keeps the card that wins the most tricks for its side. The last few
  // tricks are worked out exactly (double dummy).
  var HARD_DEALS = 60, HARD_MS = 450, DD_AT = 3;
  function hardCard(G, p, opts) {
    var me = whoControls(G, p), vis = knownTo(G, p);
    var groups = groupEq(G, opts, me, vis); if (groups.length === 1) return groups[0];
    var pics = pictures(G.calls, G.dealer), tot = groups.map(function () { return 0; });
    var t0 = Date.now(), n = 0, mySide = side(p);
    var hidden = [0, 1, 2, 3].filter(function (q) { return !vis[q]; });
    var unseen = [], pl = playedSet(G);
    deck().forEach(function (c) { if (pl[c.id]) return; for (var q in vis) if (G.hands[q].some(function (x) { return x.id === c.id; })) return; unseen.push(c); });
    var tricksLeft = G.hands[p].length;
    for (n = 0; n < HARD_DEALS && (n < 10 || Date.now() - t0 < HARD_MS); n++) {
      var hands = sampleHands(G, hidden, unseen, pics, n);
      for (var i = 0; i < groups.length; i++) tot[i] += playOutFrom(G, hands, p, groups[i], mySide, tricksLeft);
    }
    var best = 0; for (var j = 1; j < groups.length; j++) if (tot[j] > tot[best] + 1e-9) best = j;
    // when cards come out level, play as Normal would
    var usual = normalCard(G, p, opts), ui = -1;
    for (var k = 0; k < groups.length; k++) if (groups[k].id === usual.id || sameGroup(G, groups[k], usual, me, vis)) ui = k;
    return ui >= 0 && tot[ui] >= tot[best] - 1e-9 ? usual : groups[best];
  }
  // cards in one hand that are equal in effect (touching, counting the cards already played between them)
  function groupEq(G, opts, me, vis) {
    var pl = playedSet(G), out = [], used = {};
    var S = bySuit(opts);
    SUITS.forEach(function (s) {
      var cs = S[s]; if (!cs.length) return;
      var g = [cs[0]];
      for (var i = 1; i < cs.length; i++) {
        var hi = RV[cs[i - 1].r], lo = RV[cs[i].r], gap = false;
        for (var v = lo + 1; v < hi; v++) if (!pl[cid(RN[v], s)]) { gap = true; break; }
        if (gap) { out.push(lowest(g)); g = [cs[i]]; } else g.push(cs[i]);
      }
      out.push(lowest(g));
    });
    return out;
  }
  function sameGroup(G, a, b, me, vis) { if (a.s !== b.s) return false; var pl = playedSet(G), lo = Math.min(RV[a.r], RV[b.r]), hi = Math.max(RV[a.r], RV[b.r]); for (var v = lo + 1; v < hi; v++) if (!pl[cid(RN[v], a.s)] && !G.hands[G.trick.length ? 0 : 0]) return false; return G.hands.some(function (h) { return h.some(function (c) { return c.id === a.id; }) && h.some(function (c) { return c.id === b.id; }); }) && (function () { for (var v = lo + 1; v < hi; v++) if (!pl[cid(RN[v], a.s)]) return false; return true; })(); }
  // One layout of the hidden cards that fits what's known
  function sampleHands(G, hidden, unseen, pics, n) {
    var need = {}, played = {}, tries = 0;
    hidden.forEach(function (q) { need[q] = G.hands[q].length; played[q] = G.played.filter(function (x) { return x.p === q; }).map(function (x) { return x.c; }); });
    var best = null;
    for (tries = 0; tries < 60; tries++) {
      var cards = shuffle(unseen.slice()), hands = {}, left = {};
      hidden.forEach(function (q) { hands[q] = []; left[q] = need[q]; });
      // cards only some can hold (because of voids) go first
      cards.sort(function (a, b) { return holders(a).length - holders(b).length; });
      function holders(c) { return hidden.filter(function (q) { return left[q] > 0 && !(G.voids[q] && G.voids[q][c.s]); }); }
      var ok = true;
      for (var i = 0; i < cards.length; i++) {
        var hs = holders(cards[i]);
        if (!hs.length) { hs = hidden.filter(function (q) { return left[q] > 0; }); ok = false; }
        var q = hs[Math.floor(R() * hs.length)]; hands[q].push(cards[i]); left[q]--;
      }
      best = hands;
      if (!ok) continue;
      // does it fit the bidding? (whole hand as dealt: what's left plus what was played)
      var fits = hidden.every(function (q) {
        var pic = pics[q]; if (!pic) return true;
        var all = hands[q].concat(played[q]), hcp = hcpOf(all), L = { c: 0, d: 0, h: 0, s: 0 };
        all.forEach(function (c) { L[c.s]++; });
        var slack = tries > 40 ? 3 : tries > 20 ? 2 : 1;
        if (hcp < pic.lo - slack || hcp > pic.hi + slack) return false;
        for (var s in pic.len) if (L[s] < pic.len[s] - (tries > 30 ? 1 : 0)) return false;
        return true;
      });
      if (fits) break;
    }
    var out = G.hands.map(function (h) { return h.slice(); });
    hidden.forEach(function (q) { out[q] = best[q]; });
    return out;
  }
  // Play card from p, then everyone to the end: returns the tricks p's side wins from here
  function playOutFrom(G, hands, p, card, mySide, tricksLeft) {
    var t = trumpOf(G), H = hands.map(function (h) { return h.slice(); }), trick = G.trick.slice(), won = 0, turn = p, c = card;
    var cardsLeft = H.reduce(function (a, h) { return a + h.length; }, 0);
    for (;;) {
      var hh = H[turn]; hh.splice(idxOf(hh, c), 1); trick.push({ p: turn, c: c });
      if (trick.length === 4) {
        var w = trickWinner(trick, t); if (side(w) === mySide) won++;
        trick = []; turn = w;
        if (!H[0].length) break;
        // the last few tricks exactly
        if (H[turn].length <= DD_AT) { won += side(turn) === mySide ? ddSolve(H, [], turn, t, mySide) : ddSolve(H, [], turn, t, mySide); break; }
      } else turn = (turn + 1) % 4;
      c = greedy(H, trick, turn, t);
    }
    return won;
  }
  function idxOf(h, c) { for (var i = 0; i < h.length; i++) if (h[i].id === c.id) return i; return -1; }
  // a quick open-handed policy for the playouts: win the trick cheaply when it can be held, else play low
  function greedy(H, trick, p, t) {
    var h = H[p], opts = legalPlays(h, trick);
    if (opts.length === 1) return opts[0];
    if (!trick.length) {
      // lead a winner (a card no one else can beat in its suit), else low from the longest suit
      var others = [0, 1, 2, 3].filter(function (q) { return q !== p; });
      var wins = opts.filter(function (c) { return others.every(function (q) { return !H[q].some(function (x) { return x.s === c.s && RV[x.r] > RV[c.r]; }); }) && (c.s === t || !t || !others.some(function (q) { return side(q) !== side(p) && !H[q].some(function (x) { return x.s === c.s; }) && H[q].some(function (x) { return x.s === t; }); })); });
      // draw trumps when we hold the boss and opponents still have some
      if (t) { var tw = wins.filter(function (c) { return c.s === t; }); if (tw.length && others.some(function (q) { return side(q) !== side(p) && H[q].some(function (x) { return x.s === t; }); })) return tw[0]; }
      if (wins.length) return wins.filter(function (c) { return c.s !== t; })[0] || wins[0];
      var S = bySuit(opts.filter(function (c) { return c.s !== t; })), best = null;
      SUITS.forEach(function (s) { if (S[s].length && (!best || S[s].length > S[best].length)) best = s; });
      return best ? lowest(S[best]) : lowest(opts);
    }
    var led = trick[0].c.s, wc = winCard(trick, t), wp = curWinner(trick, t), pos = trick.length;
    var later = []; for (var k = pos + 1; k < 4; k++) later.push((trick[0].p + k) % 4);
    function holds(c) {
      return later.every(function (q) {
        if (side(q) === side(p)) return true;
        var qh = H[q], f = qh.filter(function (x) { return x.s === led; });
        if (f.length) return !f.some(function (x) { return beats(x, c, led, t); });
        return !(t && qh.some(function (x) { return x.s === t && beats(x, c, led, t); }));
      });
    }
    if (side(wp) === side(p) && holds(wc)) {
      var fl = opts.filter(function (c) { return c.s === led; });
      return fl.length ? lowest(fl) : lowDiscard(opts, t);
    }
    var beat = opts.filter(function (c) { return beats(c, wc, led, t) && holds(c); });
    if (beat.length) return lowest(beat);
    var f2 = opts.filter(function (c) { return c.s === led; });
    return f2.length ? lowest(f2) : lowDiscard(opts, t);
  }
  function lowDiscard(opts, t) { var nt = opts.filter(function (c) { return c.s !== t; }); return lowest(nt.length ? nt : opts); }
  // Exact tricks for side mySide from here (alpha-beta), every hand open
  function ddSolve(H, trick, turn, t, mySide) {
    var nodes = 0;
    function rec(trick, turn, alpha, beta) {
      nodes++;
      if (!H[0].length && !trick.length && !H[1].length) return 0;
      var opts = legalPlays(H[turn], trick);
      // one card from each run of touching cards
      var seen = {}, cand = [];
      opts.forEach(function (c) { var k = c.s + ':' + RV[c.r]; if (!seen[k]) { cand.push(c); } });
      var maxer = side(turn) === mySide, best = maxer ? -1 : 99;
      for (var i = 0; i < cand.length; i++) {
        var c = cand[i], h = H[turn], ix = idxOf(h, c); h.splice(ix, 1);
        var tr = trick.concat([{ p: turn, c: c }]), v;
        if (tr.length === 4) { var w = trickWinner(tr, t); v = (side(w) === mySide ? 1 : 0) + (H[w].length ? rec([], w, alpha - (side(w) === mySide ? 1 : 0), beta - (side(w) === mySide ? 1 : 0)) : 0); }
        else v = rec(tr, (turn + 1) % 4, alpha, beta);
        h.splice(ix, 0, c);
        if (maxer) { if (v > best) best = v; if (best > alpha) alpha = best; } else { if (v < best) best = v; if (best < beta) beta = best; }
        if (alpha >= beta || nodes > 20000) break;
      }
      return best;
    }
    var H2 = H.map(function (h) { return h.slice(); });
    var saved = H; H = H2;
    var res = rec(trick, turn, -1, 99);
    H = saved;
    return Math.max(0, res);
  }

  // A hint for a person: what the Hard computer would do here
  function hintCall(hand, calls, dealer) { return chooseCall(hand, calls, dealer, 'hard'); }
  function hcp(hand) { return hand.reduce(function (a, c) { return a + (HCPV[c.r] || 0); }, 0); }

  var API = {
    SUITS: SUITS, STR: STR, RANKS: RANKS, RV: RV, SEAT: SEAT, SEAT1: SEAT1, SUITWORD: SUITWORD, GLYPH: GLYPH,
    seed: seed, shuffle: shuffle, deck: deck, deal: deal, sortHand: sortHand, handPbn: handPbn, pbnHand: pbnHand, code: code, uncode: uncode,
    isBid: isBid, lvOf: lvOf, stOf: stOf, bidRank: bidRank, callText: callText, callWords: callWords, side: side, partner: partner,
    auction: auction, legalCalls: legalCalls, isLegal: isLegal, contract: contract, contractText: contractText,
    legalPlays: legalPlays, trickWinner: trickWinner, beats: beats,
    scoreContract: scoreContract, honors: honors, belowPts: belowPts, underPts: underPts,
    newPad: newPad, vulOf: vulOf, vulCode: vulCode, padDeal: padDeal,
    chooseCall: chooseCall, meaning: meaning, pictures: pictures, hintCall: hintCall, hcp: hcp, feat: feat,
    chooseCard: chooseCard, openingLead: openingLead, gameLvl: gameLvl,
    setHard: function (n, ms, dd) { HARD_DEALS = n; HARD_MS = ms; if (dd != null) DD_AT = dd; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.BridgeEngine = API;
})(typeof window !== 'undefined' ? window : this);
