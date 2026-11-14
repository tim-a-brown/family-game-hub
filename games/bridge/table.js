// ═══════════════════════════════════════════════════════════════════════════
// Bridge: the page. Rules, scoring and the computer's bidding and play are in engine.js (BridgeEngine); this
// draws the table, runs a local game (you and the computer, or pass and play), and an online one (TurnNet).
//
// State (S, the same shape locally and online): seats 0 South, 1 West, 2 North, 3 East (sides 0 North-South,
// 1 East-West). players [{name, cpu, level}], fmt 'chicago' | 'rubber', pad (the score pad, engine.newPad),
// dealNo, dealer, vul [ns, ew], hands [[cards]], dealt [pbn x4], calls [strings], why [the robots' reasons],
// phase 'bid' | 'play' | 'done' (a deal's score is up) | 'over', k (contract), dummy, shown (dummy face up),
// trick [{p, c}], played [{p, c}], voids, won [ns, ew], tricks [{l, w}], turn, hx (history per deal), hl.
// The view: bottom() is the seat drawn at the bottom (you; in pass and play whoever holds the device).
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var E = window.BridgeEngine, el = Kit.el, app = document.getElementById('app');
  // (tests: bridge_fast makes the table's pauses short)
  var FAST = (function () { try { return localStorage.getItem('bridge_fast') === '1'; } catch (e) { return false; } })();
  function tw(f, ms) { return setTimeout(f, FAST ? (ms || 0) / 6 : ms); }
  var SAVE = 'bridge_state', HKEY = 'bridge', SLOT = ['b', 'l', 't', 'r'];
  var SEATN = E.SEAT, GL = E.GLYPH, SUITS = E.SUITS;
  var LEVELS = [['easy', 'Easy', 'Bids by the book but misjudges its hand, and often plays the wrong card.'],
    ['normal', 'Normal', 'Bids by the system and plays the way a good club player does.'],
    ['hard', 'Hard', 'Thinks every card through, counting what the bidding and the play have shown.']];
  function lvName(v) { return v === 'easy' || v === 'hard' ? v : 'normal'; }

  Kit.init({
    id: 'bridge',
    onNew: function () { if (NET) { Kit.toast('Leave the online game first (in the menu)'); return; } clearSave(); showSetup(); },
    undo: function () { if (NET) { Kit.toast('Moves can’t be taken back online'); return; } undo(); },
    menu: TurnNet.menu().concat([
      { icon: 'chart', label: 'Score pad', onClick: function () { if (S && S.pad) padSheet(); } },
      { icon: 'rows', label: 'The auction', onClick: function () { if (S && S.calls) slipSheet(); } },
      { icon: 'history', label: 'Past games', onClick: function () { Kit.history(HKEY, { keys: ['bridge'], title: 'Bridge: past games' }); } }
    ]),
    rules:
      '<p class="goal">You and your partner, sitting across from you, play against the other two. First the four of you bid for the right to name trumps; the side that bids highest has to win the number of tricks it bid. Then everyone plays the cards out, one trick at a time.</p>' +
      '<h3>The deal and the bidding</h3><ul>' +
      '<li>Each player gets 13 cards. The dealer calls first, then everyone in turn to the left.</li>' +
      '<li>A bid names a number and a suit or notrump, like 2♥. The number is how many tricks over six your side will win: 2♥ means 8 tricks with hearts as trumps.</li>' +
      '<li>Each bid has to be higher than the last one: a bigger number, or the same number in a higher suit. From lowest to highest the suits go clubs, diamonds, hearts, spades, then notrump.</li>' +
      '<li>You can pass instead. You can double an opponent\'s bid (it doubles the score), and the other side can redouble.</li>' +
      '<li>The bidding ends when three players pass in a row after a bid. If all four pass at the start, the cards are dealt again.</li>' +
      '<li>The last bid is the <b>contract</b>. Of the side that won it, the player who first named that suit is the <b>declarer</b>.</li></ul>' +
      '<h3>The play</h3><ul>' +
      '<li>The player to the declarer\'s left leads the first card. Then the declarer\'s partner lays their cards face up on the table: that hand is the <b>dummy</b>, and the declarer plays it.</li>' +
      '<li>Everyone must follow the suit that was led if they can. If they can\'t, they can play any card, including a trump.</li>' +
      '<li>The highest trump wins the trick; with no trump in it, the highest card of the suit led wins. Whoever wins a trick leads the next.</li></ul>' +
      '<h3>The score</h3><ul>' +
      '<li>Made it: each trick bid over six scores <b>below the line</b>, 20 in clubs or diamonds, 30 in hearts or spades, and 40 for the first notrump trick, then 30. 100 below the line is a <b>game</b>.</li>' +
      '<li>Extra tricks, slams (bidding and making 12 or 13 tricks) and penalties go <b>above the line</b>. A side that falls short gives the other side 50 a trick, or 100 a trick if it is vulnerable, and more when doubled.</li>' +
      '<li><b>Vulnerable</b> sides score more for slams and lose more when they go down. A vulnerable seat\'s name has a red edge.</li>' +
      '<li><b>Chicago</b> is four deals. Deal one nobody is vulnerable; deals two and three, the dealer\'s side; deal four, both. A game scores 300, or 500 vulnerable.</li>' +
      '<li><b>Rubber</b> goes on until a side wins two games. Winning a game makes you vulnerable. The rubber is worth 700 if you won it two games to none, 500 if two to one.</li>' +
      '<li>Honors: four of the five top trumps in one hand score 100, all five 150, and all four aces at notrump 150, for whoever holds them.</li>' +
      '<li>The highest total wins.</li></ul>' +
      '<h3>Help while you play</h3><ul>' +
      '<li>The computer bids by Standard American: tap any bid in the auction to see what it means. A blue dot marks a bid that doesn\'t mean the suit it names.</li>' +
      '<li>The number by your hand is its high-card points: ace 4, king 3, queen 2, jack 1. The light bulb in the bidding box suggests a bid.</li></ul>' +
      '<h3>Online</h3><ul><li><b>Play online</b>, beside the start button, opens a table. The first two people to sit are partners, and the computer plays any empty seat.</li>' +
      '<li>Bid and play whenever it\'s your turn. A declarer plays the dummy\'s cards from their own device.</li></ul>'
  });

  // ── State ─────────────────────────────────────────────────────────────────
  var S = null, token = 0, undoStack = [], busy = false;
  var NET = null, ME = 0;          // online: the table, and this device's seat (position)
  var LME = 0, BLIND = false;      // pass and play: the seat drawn at the bottom; every hand face down while the device is passed
  function bottom() { return NET ? ME : LME; }
  function slotOf(p) { return SLOT[(p - bottom() + 4) % 4]; }
  function person(p) { return p >= 0 && S && S.players[p] && !S.players[p].cpu; }
  function onePerson() { return !!NET || !S || S.players.filter(function (p) { return !p.cpu; }).length < 2; }
  function ctrl(p) { return S.k && S.phase === 'play' && p === S.dummy ? S.k.decl : p; }
  function lvOf(p) { var pl = S.players[p]; return lvName((pl && pl.level) || S.level); }
  function nm(p) { return S.players[p].name; }
  function who(p) { return p === bottom() && onePerson() && (!NET || NET.seat >= 0) ? 'You' : nm(p); }
  function first(n) { return String(n || '').split(' ')[0]; }
  function sideNames(t) { return S.players[t].name + ' & ' + S.players[t + 2].name; }
  function weSide() { return bottom() % 2; }
  function sideSay(t) { return onePerson() ? (t === weSide() ? 'You and ' + first(nm((bottom() + 2) % 4)) : first(nm(t)) + ' and ' + first(nm(t + 2))) : first(nm(t)) + ' and ' + first(nm(t + 2)); }
  function trump() { return S.k && S.k.st < 4 ? SUITS[S.k.st] : null; }
  function Gv(st) { st = st || S; return { hands: st.hands, trick: st.trick, played: st.played, k: st.k, dummy: st.dummy, shown: st.shown, voids: st.voids, won: st.won, calls: st.calls, dealer: st.dealer }; }
  function canSee(p) {
    if (BLIND) return false;
    if (p === bottom()) return !NET || NET.seat >= 0 || false;
    if (S.phase === 'play' && p === S.dummy && S.shown) return true;
    if (S.phase === 'done' || S.phase === 'over') return true;
    return false;
  }
  function save() {
    if (NET || !S) return;
    try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {}
    if (S.phase !== 'over') Kit.resume.set(resumeLabel());
  }
  function resumeLabel() { return (S.fmt === 'chicago' ? 'Deal ' + S.dealNo + ' of 4' : 'Rubber, deal ' + S.dealNo) + ' · we ' + S.pad.tot[weSide()] + ', they ' + S.pad.tot[1 - weSide()]; }
  function clearSave() { try { localStorage.removeItem(SAVE); } catch (e) {} Kit.resume.clear(); token++; busy = false; }

  // ── Setup ─────────────────────────────────────────────────────────────────
  function fresh(players, o) {
    var st = { v: 1, mode: o.mode || 'cpu', fmt: o.fmt === 'rubber' ? 'rubber' : 'chicago', level: lvName(o.level), aids: o.aids !== false, me: 0,
      players: players.map(function (p) { return { name: p.name, cpu: !!p.cpu, level: p.cpu && p.level ? lvName(p.level) : undefined }; }),
      pad: E.newPad(o.fmt), dealNo: 0, dealer: Math.floor(Math.random() * 4), hx: [], hl: [], started: Date.now(), stats: { slams: 0, sets: 0, games: [0, 0], best: 0, run: [0, 0] } };
    st.dealer = (st.dealer + 3) % 4;   // (startDeal moves it on to the first dealer)
    return st;
  }
  function showSetup() {
    S = null; token++; BLIND = false; LME = 0; Kit.handoff.close(); teardown();
    Kit.setup(app, {
      modes: Kit.modes(['cpu', 'local']),
      players: { min: 4, max: 4, cpu: function (m) { return m === 'cpu' ? 'seats' : m === 'local' ? 'mix' : false; }, teams: [[0, 2], [1, 3]] },
      options: [
        { id: 'fmt', label: 'Scoring', help: 'Chicago is four deals with the vulnerability set for each one. Rubber goes on until a side wins two games.', value: 'chicago',
          choices: [['chicago', 'Chicago\nFour deals', 'Four deals. Nobody is vulnerable on the first, the dealer\'s side on the second and third, and both sides on the fourth.'], ['rubber', 'Rubber\nBest of three games', 'Deals go on until a side wins two games. A side that has won a game is vulnerable.']] },
        { id: 'aids', label: 'Learning aids', help: 'Your hand\'s points beside it and a suggested bid in the bidding box. What every bid means is always a tap away.', value: 1,
          choices: [[1, 'On', 'Your high-card points beside your hand, and a light bulb in the bidding box that suggests a bid.'], [0, 'Off', 'The table as it would be at a club: no points shown and no suggestions.']] },
        { id: 'level', robot: true, label: 'Computer skill', value: 'normal', choices: LEVELS }
      ],
      onStart: function (cfg) {
        S = fresh(cfg.players, { mode: cfg.mode, fmt: cfg.options.fmt, level: cfg.options.level, aids: +cfg.options.aids !== 0 });
        LME = 0; Kit.gameStart(); undoStack = []; startDeal(S); afterDeal();
      }
    });
  }

  // ── The rules on a state (shared by the local game and the online table) ──
  function startDeal(st, redeal) {
    if (!redeal) { st.dealNo++; st.dealer = (st.dealer + 1) % 4; }
    else if (st.fmt === 'rubber') st.dealer = (st.dealer + 1) % 4;   // (a passed-out deal: rubber moves the deal on; Chicago redeals by the same dealer)
    st.hands = E.deal();
    st.dealt = st.hands.map(E.handPbn);
    st.vul = E.vulOf(st.pad, st.dealNo, st.dealer);
    st.calls = []; st.why = []; st.phase = 'bid'; st.k = null; st.dummy = -1; st.shown = false;
    st.trick = []; st.played = []; st.voids = [{}, {}, {}, {}]; st.won = [0, 0]; st.tricks = []; st.turn = st.dealer; st.lastTrick = null;
    st.run = [0, 0];
  }
  // a call; returns a move description or null when it isn't allowed
  function nCall(st, p, c, why) {
    if (st.phase !== 'bid' || st.turn !== p || !E.isLegal(st.calls, st.dealer, c)) return null;
    st.calls.push(c); st.why.push(why || '');
    var a = E.auction(st.calls, st.dealer), mv = { k: 'call', p: p, c: c };
    if (!a.over) { st.turn = (p + 1) % 4; return mv; }
    if (a.passedOut) {
      mv.out = 1;
      (st.hx = st.hx || []).push({ n: st.dealNo, d: st.dealer, v: E.vulCode(st.vul), h: st.dealt.join('/'), a: st.calls.join('.'), po: 1 });
      startDeal(st, true);
      return mv;
    }
    st.k = E.contract(st.calls, st.dealer); st.dummy = (st.k.decl + 2) % 4;
    st.phase = 'play'; st.turn = (st.k.decl + 1) % 4; mv.k2 = st.k;
    return mv;
  }
  // a card from seat p (the seat whose turn it is; the declarer moves for the dummy)
  function nCard(st, p, id) {
    if (st.phase !== 'play' || st.turn !== p || st.trick.length >= 4) return null;
    var h = st.hands[p], i = -1; for (var j = 0; j < h.length; j++) if (h[j].id === id) i = j;
    if (i < 0) return null;
    var ok = E.legalPlays(h, st.trick).some(function (c) { return c.id === id; }); if (!ok) return null;
    var c = h[i], mv = { k: 'card', p: p, c: c };
    if (st.trick.length && c.s !== st.trick[0].c.s) st.voids[p][st.trick[0].c.s] = 1;
    h.splice(i, 1); st.trick.push({ p: p, c: c }); st.played.push({ p: p, c: c });
    if (!st.shown) { st.shown = true; mv.lead = 1; }
    if (st.trick.length < 4) { st.turn = (p + 1) % 4; return mv; }
    var t = st.k.st < 4 ? SUITS[st.k.st] : null, w = E.trickWinner(st.trick, t), sd = w % 2;
    st.won[sd]++; st.tricks.push({ l: st.trick[0].p, w: w });
    st.run[sd]++; st.run[1 - sd] = 0;
    st.stats.run[sd] = Math.max(st.stats.run[sd] || 0, st.run[sd]);
    mv.w = w; mv.trick = st.trick.slice();
    st.lastTrick = st.trick.slice(); st.trick = []; st.turn = w;
    if (st.tricks.length === 13) { mv.end = 1; endDeal(st); }
    return mv;
  }
  // the deal is over: score it on the pad, keep it for the history, and mark its moments
  function endDeal(st) {
    var k = st.k, ds = k.decl % 2, took = st.won[ds];
    var hands = st.dealt.map(E.pbnHand);
    var before = st.pad.games.slice();
    var rec = E.padDeal(st.pad, { k: k, took: took, hands: hands, dealer: st.dealer, dealNo: st.dealNo });
    var pts = [0, 0]; rec.rows.forEach(function (r) { pts[r.s] += r.pts; });
    var first = st.played[0] ? E.code(st.played[0].c) : '';
    var mom = moments(st, rec, took);
    st.hx.push({ n: st.dealNo, d: st.dealer, v: E.vulCode(rec.vul), h: st.dealt.join('/'), a: st.calls.join('.'), k: k.lvl + E.STR[k.st] + (k.dbl === 2 ? 'XX' : k.dbl === 1 ? 'X' : ''), de: k.decl, l: first,
      t: took, s: pts.join('.'), g: rec.game, m: mom.map(function (m) { return m.id; }).join('.'), hn: rec.hon ? rec.hon.pts + ':' + (rec.hon.p % 2) : '' });
    (st.rounds = st.rounds || []).push(pts);
    mom.forEach(function (m) { if (m.hl) st.hl.push(m.hl); });
    st.last = { n: st.dealNo, k: k, took: took, rows: rec.rows, res: rec.res, hon: rec.hon, game: rec.game, rubber: rec.rubber, vul: rec.vul, dealer: st.dealer, dealt: st.dealt.slice(), calls: st.calls.slice(), why: st.why.slice(), lead: first, mom: mom, pts: pts };
    st.phase = st.pad.over ? 'over' : 'done';
    if (st.pad.over) { var T = st.pad.tot; st.winner = T[0] === T[1] ? -1 : T[0] > T[1] ? 0 : 1; st.series = st.series || [0, 0]; if (st.winner >= 0) st.series[st.winner]++; }
  }
  // Uncommon things worth a moment on the table (and a line in the history)
  function moments(st, rec, took) {
    var k = st.k, ds = k.decl % 2, res = rec.res, out = [], who = st.players[k.decl].name, sideN = st.players[ds].name + ' & ' + st.players[ds + 2].name, dsN = st.players[1 - ds].name + ' & ' + st.players[3 - ds].name;
    var kt = E.contractText(k, true), n = st.dealNo;
    function m(id, side, title, line, hl, big) { out.push({ id: id, side: side, title: title, line: line, hl: hl, big: !!big }); }
    if (res.made && k.lvl === 7) m('grand', ds, 'Grand slam!', who + ' made all thirteen tricks in ' + kt + '.', who + ' bid and made a grand slam, ' + kt + ', on deal ' + n, 2);
    else if (res.made && k.lvl === 6) m('slam', ds, 'Small slam!', who + ' made twelve tricks in ' + kt + '.', who + ' bid and made a small slam, ' + kt + ', on deal ' + n, 2);
    if (took === 13 && k.lvl < 7) m('all13', ds, 'All thirteen tricks!', sideN + ' won every trick.', sideN + ' won all thirteen tricks on deal ' + n, 1);
    if (13 - took === 13) m('all13', 1 - ds, 'All thirteen tricks!', dsN + ' won every trick.', dsN + ' won all thirteen tricks on deal ' + n, 1);
    if (res.made && k.dbl === 2) m('xxmade', ds, 'Redoubled and made!', who + ' made ' + kt + '.', who + ' made ' + kt + ' redoubled on deal ' + n, 1);
    else if (res.made && k.dbl === 1) m('xmade', ds, 'Doubled and made!', who + ' made ' + kt + ' after all.', who + ' made ' + kt + ' doubled on deal ' + n, 1);
    if (!res.made && k.dbl) m('xset', 1 - ds, k.dbl === 2 ? 'Redoubled and beaten!' : 'Doubled and beaten!', dsN + ' beat ' + kt + ' by ' + res.down + ' for ' + rec.rows.filter(function (r) { return r.s !== ds; }).reduce(function (a, r) { return a + r.pts; }, 0) + '.', dsN + ' beat ' + kt + ' by ' + res.down + ' on deal ' + n, 1);
    else if (!res.made && res.down >= 3) m('bigset', 1 - ds, 'Down ' + res.down + '!', dsN + ' beat ' + kt + ' by ' + res.down + ' tricks.', dsN + ' beat ' + kt + ' by ' + res.down + ' on deal ' + n, 0);
    if (rec.game >= 0 && res.made && k.lvl < E.gameLvl(k.st)) m('partgame', ds, 'Part score to game!', 'With what was already below the line, ' + kt + ' makes a game.', sideN + '\'s part scores added up to a game on deal ' + n, 1);
    else if (rec.game >= 0 && k.lvl < 6) m('game', ds, 'Game!', sideN + ' made ' + kt + '.', '', 0);
    if (rec.hon) m('honors', rec.hon.p % 2, 'Honors', st.players[rec.hon.p].name + ' held ' + rec.hon.why.toLowerCase() + ': ' + rec.hon.pts + ' points.', st.players[rec.hon.p].name + ' scored ' + rec.hon.pts + ' for honors on deal ' + n, 0);
    for (var sd = 0; sd < 2; sd++) if ((st.stats.run[sd] || 0) >= 7) { /* (the long run is shown during the play) */ }
    // a hand of 20 or more points
    st.dealt.forEach(function (t, p) { var hc = E.hcp(E.pbnHand(t)); if (hc >= 20) out.push({ id: 'big' + p, side: p % 2, quiet: 1, hl: st.players[p].name + ' was dealt ' + hc + ' high-card points on deal ' + n }); });
    if (rec.rubber != null) m('rubber', rec.rubber, 'Rubber!', (rec.rubber === 0 ? st.players[0].name + ' & ' + st.players[2].name : st.players[1].name + ' & ' + st.players[3].name) + ' won the rubber.', '', 2);
    return out;
  }

  // ── Local game: moves with their animation ─────────────────────────────────
  function afterDeal() {
    clearUndo(); save();
    if (!person(LME)) { LME = firstPersonFrom(0); S.me = LME; }
    // pass and play: every hand face down until the first person to act has the device
    BLIND = !onePerson();
    render(); dealAnim();
    var big = S.hands[bottom()] && E.hcp(S.hands[bottom()]);
    if (big >= 20 && canSee(bottom()) && S.aids) tw(function () { if (S && S.phase === 'bid') { glowHcp(); Kit.callout(big + ' points!'); Kit.sfx('sparkle'); Kit.haptic('success'); } }, 900);
    tw(next, 700);
  }
  function firstPersonFrom(p) { for (var i = 0; i < 4; i++) { var q = (p + i) % 4; if (person(q)) return q; } return 0; }
  // Before a different person acts: every hand face down, and the cover asks to pass the device
  function gate(p, then) {
    if (NET || !person(p)) { then && then(); return; }
    if (p === LME) { if (BLIND) { BLIND = false; paint(); } then && then(); return; }
    BLIND = true; undoStack = []; paint();
    var t = token;
    Kit.handoff({ name: nm(p), color: Kit.color(p % 2), what: 'cards' }).then(function () {
      if (t !== token || !S || NET) return;
      BLIND = false; LME = p; S.me = p; save(); render(); then && then();
    });
  }
  function next() {
    if (!S || NET || busy) return;
    var t = token;
    if (S.phase === 'bid') {
      var p = S.turn;
      if (person(p)) { if (p !== LME || BLIND) { gate(p, next); return; } paint(); return; }
      paint();
      tw(function () { if (t !== token || !S || S.phase !== 'bid' || S.turn !== p) return; var c = E.chooseCall(S.hands[p], S.calls, S.dealer, lvOf(p)); doCall(p, c.call, c.say); }, 650 + Math.random() * 350);
    } else if (S.phase === 'play' && S.trick.length < 4) {
      var q = S.turn, c2 = ctrl(q);
      if (person(c2)) { if (c2 !== LME || BLIND) { gate(c2, next); return; } paint(); return; }
      paint();
      var wait = S.trick.length ? 520 + Math.random() * 260 : 760;
      tw(function () {
        if (t !== token || !S || S.phase !== 'play' || S.turn !== q || busy) return;
        var card = E.chooseCard(Gv(), q, lvOf(c2));
        doCard(q, card);
      }, wait);
    } else paint();
  }
  function doCall(p, c, why) {
    var prevBid = S.calls.slice();
    var mv = nCall(S, p, c, why);
    if (!mv) return;
    callAnim(p, c);
    if (person(p)) Kit.haptic('medium');
    if (mv.out) {
      save();
      tw(function () { if (!S) return; moment({ title: 'Passed out', line: S.fmt === 'chicago' ? 'Nobody bid, so the same dealer deals again.' : 'Nobody bid, so the next player deals.', tone: 'cool', ms: 1600 }); }, 400);
      tw(function () { if (!S) return; afterDeal(); }, 2300);
      return;
    }
    save();
    if (S.phase === 'play') { auctionDone(); return; }
    paintSlip(); paintSeats(); paintAct(); next();
  }
  function auctionDone() {
    var k = S.k, t = token;
    busy = true; paint();
    if (k.lvl >= 6) tw(function () { if (t === token) moment({ title: k.lvl === 7 ? 'A grand slam bid' : 'A slam bid', line: who(k.decl) + (who(k.decl) === 'You' ? ' need ' : ' needs ') + (k.lvl + 6) + ' tricks in ' + E.contractText(k, true) + '.', ms: 1700 }); Kit.sfx('boom'); }, 350);
    else if (k.dbl === 2) tw(function () { if (t === token) Kit.callout('Redoubled!'); }, 300);
    tw(function () {
      if (t !== token) return;
      busy = false; relayout(true);
      // the opening leader may be a person on another seat
      if (!NET) next();
    }, k.lvl >= 6 ? 1500 : 650);
  }
  function doCard(p, card) {
    if (!S || busy) return;
    var fromEl = cardNode(card) || seatTag(p);
    var fromRect = fromEl ? fromEl.getBoundingClientRect() : null;
    var mv = nCard(S, p, card.id);
    if (!mv) return;
    if (person(ctrl(p))) Kit.haptic('light');
    playAnim(mv, fromRect, function () { save(); if (!mv.end) next(); else dealEnd(); });
  }
  // the end of a deal: the moments, then the score
  function dealEnd() {
    var L = S.last, t = token;
    clearUndo(); save();
    var res = L.res, ds = L.k.decl % 2, mine = ds === weSide(), pad = 900;
    var big = L.mom.filter(function (m) { return !m.quiet && m.big; });
    var small = L.mom.filter(function (m) { return !m.quiet && !m.big; });
    var made = res.made;
    // the contract made or beaten, from where you sit
    var head = made ? (res.over ? 'Made with ' + res.over + ' over' : 'Made it exactly') : 'Down ' + res.down;
    var good = onePerson() ? (made === mine) : made;
    var seq = [], sc = made ? ds : 1 - ds, chip = E.contractText(L.k), ptsS = L.pts && L.pts[sc] ? '+' + L.pts[sc] : '';
    if (big.length) big.forEach(function (m, j) { seq.push({ title: m.title, line: m.line, tone: m.side === weSide() || !onePerson() ? '' : 'cold', big: m.big, chip: j ? '' : chip, pts: j ? '' : ptsS }); });
    else seq.push({ title: head, line: E.contractText(L.k, true) + ' by ' + who(L.k.decl) + '.', tone: good ? 'cool' : 'cold', small: 1, chip: chip, pts: ptsS });
    small.forEach(function (m) { seq.push({ title: m.title, line: m.line, tone: m.side === weSide() || !onePerson() ? '' : 'cold' }); });
    var i = 0;
    (function step() {
      if (t !== token || !S) return;
      if (i >= seq.length) { tw(function () { if (t === token && S) { if (S.phase === 'over') finish(); else dealSheet(); } }, 300); return; }
      var m = seq[i++];
      moment({ title: m.title, line: m.line, tone: m.tone, big: m.big, chip: m.chip, pts: m.pts, ms: m.big ? 2300 : 1500 });
      if (m.big === 2) { Kit.confetti(); Kit.sfx('win'); Kit.haptic('success'); }
      else if (m.tone === 'cold') { Kit.sfx('bad'); Kit.haptic('error'); }
      else { Kit.sfx('good'); Kit.haptic('success'); }
      tw(step, m.big ? 2400 : 1600);
    })();
    paintScore();
  }

  // ── Undo (your last call or card) ─────────────────────────────────────────
  function snapshot() { undoStack.push(JSON.stringify(S)); if (undoStack.length > 30) undoStack.shift(); }
  function clearUndo() { undoStack = []; }
  function undo() {
    if (!undoStack.length || busy) return Kit.toast('Nothing to take back this deal');
    var back = JSON.parse(undoStack[undoStack.length - 1]);
    if ((back.me || 0) !== LME) return Kit.toast('Only your own last move can be taken back');
    undoStack.pop();
    token++; busy = false; S = back; Kit.sfx('whoosh'); Kit.toast('Taken back'); save(); render(); next();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Drawing
  // ══════════════════════════════════════════════════════════════════════════
  var D = null;   // the table's parts
  var lay = null; // the layout in use: {mode, ...sizes}
  function teardown() { D = null; }
  function render() {
    if (!S) return;
    if (!D || !D.root.isConnected) build();
    applyLayout();
    paint();
  }
  function build() {
    app.innerHTML = '';
    D = {};
    D.root = el('div', { class: 'bx' + (document.startViewTransition ? ' vt-ok' : '') });
    D.info = el('div', { class: 'bx-info' });
    D.table = el('div', { class: 'bx-table wood', style: { 'view-transition-name': 'b-table' } });
    D.felt = el('div', { class: 'bx-felt felt-in' });
    D.table.appendChild(D.felt);
    D.hand = el('div', { class: 'bx-hand', style: { 'view-transition-name': 'b-hand' } });
    D.act = el('div', { class: 'bx-act', style: { 'view-transition-name': 'b-act' } });
    D.root.appendChild(D.info); D.root.appendChild(D.table); D.root.appendChild(D.hand); D.root.appendChild(D.act);
    D.seats = [0, 1, 2, 3].map(function (p) { var s = el('div', { class: 'bs', style: { 'view-transition-name': 'b-seat' + p } }); D.felt.appendChild(s); return s; });
    D.trick = el('div', { class: 'bt' });
    D.felt.appendChild(D.trick);
    D.dummy = el('div', { class: 'bd' });
    D.corner = {};
    ['tl', 'tr', 'bl', 'br', 'mid'].forEach(function (k) { D.corner[k] = el('div', { class: 'bcorner ' + k }); D.felt.appendChild(D.corner[k]); });
    D.board = el('div', { class: 'bboard', style: { 'view-transition-name': 'b-board' } });
    D.score = el('button', { type: 'button', class: 'bscore', 'aria-label': 'The score pad', style: { 'view-transition-name': 'b-score' }, onclick: function () { Kit.sfx('tap'); padSheet(); } });
    D.slip = el('div', { class: 'bslip', style: { 'view-transition-name': 'b-slip' } });
    D.contract = el('button', { type: 'button', class: 'bk', style: { 'view-transition-name': 'b-contract' }, onclick: function () { Kit.sfx('tap'); slipSheet(); } });
    D.tray = el('div', { class: 'bq', style: { 'view-transition-name': 'b-tray' } });
    D.shape = el('div', { class: 'bshape', style: { 'view-transition-name': 'b-shape' } });
    D.trayW = el('div', { class: 'bq' }); D.trayT = el('div', { class: 'bq' });
    D.handEl = el('div', { class: 'bh' });
    D.hcp = el('button', { type: 'button', class: 'bh-hcp', onclick: function () { Kit.sfx('tap'); Kit.toast('High-card points: ace 4, king 3, queen 2, jack 1. About 25 between you and your partner makes a game.', 3600); } });
    D.htag = el('span', { class: 'bh-tag' });
    D.hand.appendChild(D.hcp); D.hand.appendChild(D.htag); D.hand.appendChild(D.handEl);
    D.cap = el('div', { class: 'ba-cap' });
    D.box = el('div', { class: 'bbox', style: { 'view-transition-name': 'b-box' } });
    D.act.appendChild(D.box); D.act.appendChild(D.cap);
    D.mom = null;
    app.appendChild(D.root);
  }

  // ── Layout: four shapes, each using the whole screen ──
  function layMode() {
    var W = window.innerWidth, H = window.innerHeight;
    if (W > H) return H < 600 ? 'ps' : 'ts';
    return W < 700 ? 'pu' : 'tu';
  }
  function px(v) { return Math.round(v) + 'px'; }
  function applyLayout() {
    if (!D || !S) return;
    var mode = layMode(), R = D.root, W = window.innerWidth, H = window.innerHeight;
    var play = S.phase === 'play' || S.phase === 'done' || S.phase === 'over';
    ['pu', 'ps', 'tu', 'ts'].forEach(function (m) { R.classList.toggle('L-' + m, m === mode); });
    R.classList.toggle('ph-bid', !play); R.classList.toggle('ph-play', play);
    var land = mode === 'ps' || mode === 'ts', tab = mode === 'tu' || mode === 'ts';
    // a small phone (320 wide, or short): your own name tag steps aside and the caption rides above your hand
    var small = mode === 'pu' && (W < 380 || H < 700);
    R.classList.toggle('small', small);
    var n = Math.max(1, (S.hands && S.hands[bottom()] || []).length || 13);
    // an iPad sideways in the auction: your hand takes the whole width under everything, and the bidding box is
    // the whole box of 35 bids in the right-hand column, one tap to a call
    var full = mode === 'ts' && !play;
    R.classList.toggle('fullbox', full);
    // widths of the side columns sideways
    var infw = mode === 'ps' ? Math.min(230, Math.max(176, W * 0.24)) : Math.min(270, Math.max(232, W * 0.235));
    var actw = play ? 0 : (mode === 'ps' ? Math.min(300, Math.max(236, W * 0.3)) : Math.min(380, Math.max(300, W * 0.32)));
    R.style.setProperty('--infw', px(infw)); R.style.setProperty('--actw', px(actw));
    // the hand: as large as fits, 13 cards across with their corners showing
    var handW = mode === 'ps' && play ? W - infw - 30 : W - 20;
    var hcw;
    if (mode === 'pu') hcw = Math.min(84, Math.max(52, handW / 5.4));
    else if (mode === 'tu') hcw = Math.min(118, Math.max(70, handW / 6.2));
    else if (mode === 'ps') hcw = Math.min(64, Math.max(46, (H - 60) * 0.19));
    else hcw = Math.min(118, Math.max(64, H * 0.145));
    // the hand spreads across the width it has, however few cards are left
    var step = Math.min(hcw * 0.9, (handW - hcw - 8 - 3 * hcw * 0.12) / Math.max(1, n - 1));
    R.style.setProperty('--hcw', px(hcw)); R.style.setProperty('--ov', px(step - hcw));
    R.style.setProperty('--bcw', px(tab ? 54 : mode === 'ps' ? 40 : 44));
    // the bidding box fills the right-hand column sideways
    var bxH = R.getBoundingClientRect().height || (H - 60);
    R.style.setProperty('--bbh', px(land && !play ? Math.max(32, Math.min(tab ? 74 : 56, (bxH - hcw * 1.4 - 70) / 3.75)) : tab ? 50 : 40));
    R.style.setProperty('--qcw', px(tab ? 20 : mode === 'ps' ? 13 : 15));
    R.style.setProperty('--bbw', px(tab ? 56 : 44));
    // the pieces: in the felt's corners upright, in the left column sideways
    placePieces(mode, play);
    // the felt's own size decides the trick and the dummy
    var fr = D.felt.getBoundingClientRect(), fw = fr.width || W - 30, fh = fr.height || H * 0.5;
    var tcw = Math.max(40, Math.min(tab ? 96 : 74, fw * (tab ? 0.13 : 0.17), fh * 0.16));
    R.style.setProperty('--tcw', px(tcw));
    lay = { mode: mode, land: land, tab: tab, fw: fw, fh: fh };
    sizeDummy();
    if (D.box) sizeBox();
  }
  function R0() { return D.root; }
  function placePieces(mode, play) {
    var land = mode === 'ps' || mode === 'ts';
    function put(parent, node) { if (node.parentNode !== parent) parent.appendChild(node); }
    function out(node) { if (node.parentNode) node.parentNode.removeChild(node); }
    if (land) {
      put(D.info, D.board); D.board.style.order = 0;
      put(D.info, D.score); D.score.style.order = 1;
      if (play) { put(D.info, D.contract); D.contract.style.order = 2; } else out(D.contract);
      if (mode === 'ps' && play) out(D.slip); else { put(D.info, D.slip); D.slip.style.order = 3; }
      if (play) { put(D.info, D.tray); D.tray.style.order = 4; } else out(D.tray);
      put(D.info, D.cap); D.cap.style.order = 5;
      if (mode === 'ts' && !play) { put(D.info, D.shape); D.shape.style.order = 6; } else out(D.shape);
      out(D.trayW); out(D.trayT);
    } else {
      put(D.corner.tl, D.board); put(D.corner.tl, D.score);
      var bs = D.seats[bottom()];
      if (D.root.classList.contains('small')) { if (D.cap.parentNode !== D.hand) D.hand.appendChild(D.cap); }
      else if (D.cap.parentNode !== bs) bs.insertBefore(D.cap, bs.firstChild);
      if (play) {
        out(D.slip); put(D.corner.tr, D.contract);
        out(D.tray); put(D.corner.bl, D.trayW); put(D.corner.br, D.trayT);
      } else {
        out(D.contract); out(D.tray); out(D.trayW); out(D.trayT); out(D.shape);
        put(D.corner.mid, D.slip);
      }
    }
    R0().classList.toggle('lowhand', mode === 'ps' && play);
    D.box.style.display = play ? 'none' : '';
    D.act.style.display = play ? 'none' : '';
  }
  // Turning the device (or any resize) moves everything to the new layout smoothly
  var relayT = 0;
  // (at once: a moment in the old layout at the new size would show a squashed table)
  var lastWH = '';
  window.addEventListener('resize', function () { var wh = window.innerWidth + 'x' + window.innerHeight; if (wh === lastWH) return; lastWH = wh; relayout(true); });
  function relayout(anim) {
    if (!D || !S) return;
    finishFlights();
    function go() { applyLayout(); paint(); }
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (anim && document.startViewTransition && !reduce && !document.hidden) { try { document.startViewTransition(go); return; } catch (e) {} }
    go();
  }
  function finishFlights() { (D && D.root.getAnimations ? D.root.getAnimations({ subtree: true }) : []).forEach(function (a) { if (a.id === 'fly') try { a.finish(); } catch (e) {} }); }

  function paint() {
    if (!S || !D) return;
    paintSeats(); paintTrick(); paintDummy(); paintHand(); paintAct(); paintSlip(); paintBoard(); paintScore(); paintContract(); paintTray(); paintShape(); placeTrick();
  }
  // iPad sideways in the auction: your hand's shape, a row of pips for each suit, under the auction (a learning aid)
  function paintShape() {
    if (!D.shape.isConnected) return;
    var m = bottom(), h = S.hands && S.hands[m] || [];
    var on = S.aids && S.phase === 'bid' && h.length && canSee(m) && !(NET && NET.seat < 0);
    D.shape.style.display = on ? '' : 'none';
    if (!on) return;
    var f = E.feat(h);
    D.shape.innerHTML = '';
    D.shape.appendChild(el('div', { class: 'hd', text: 'Your hand' }));
    ['s', 'h', 'd', 'c'].forEach(function (su) {
      var pips = el('span', { class: 'pp' });
      for (var i = 0; i < f.len[su]; i++) pips.appendChild(el('i'));
      D.shape.appendChild(el('div', { class: 'rw' }, [el('span', { class: 'g' + (su === 'h' || su === 'd' ? ' r' : ''), text: GL[su] }), el('b', { text: String(f.len[su]) }), pips]));
    });
    D.shape.appendChild(el('div', { class: 'ft', text: f.bal ? 'A balanced hand' : 'An unbalanced hand' }));
  }
  // ── seats ──
  function seatTag(p) { return D && D.seats[p] && D.seats[p].querySelector('.bs-tag'); }
  function paintSeats() {
    S.players.forEach(function (pl, p) {
      var s = D.seats[p], slot = slotOf(p);
      var hasDummy = S.phase === 'play' && p === S.dummy && S.shown && slot !== 'b';
      s.className = 'bs ' + slot + (S.vul[p % 2] ? ' vul' : '') + (pl.away ? ' away' : '') + (isTurn(p) ? ' turn' : '') + (hasDummy ? ' hasdummy' : '');
      Array.prototype.slice.call(s.children).forEach(function (n) { if (n !== D.dummy && n !== D.cap) n.remove(); });
      var role = S.phase !== 'bid' && S.k ? (p === S.k.decl ? 'Declarer' : p === S.dummy ? 'Dummy' : '') : S.phase === 'bid' && p === S.dealer ? 'Dealer' : '';
      var tag = el('div', { class: 'bs-tag' }, [
        el('span', { class: 'avatar', style: { '--c': Kit.color(p % 2) }, html: pl.cpu ? Kit.icon('bot') : Kit.esc(pl.name.charAt(0).toUpperCase()) }),
        el('span', { class: 'tx' }, [el('span', { class: 'nm' + (first(pl.name).length >= 9 ? ' long' : ''), text: slot === 'b' && who(p) === 'You' ? 'You' : first(pl.name) }), role ? el('span', { class: 'role' + (role === 'Dealer' ? ' dl' : ''), text: role }) : null])
      ]);
      tag.setAttribute('aria-label', pl.name + ', ' + SEATN[p] + (S.vul[p % 2] ? ', vulnerable' : ', not vulnerable') + (role ? ', ' + role.toLowerCase() : ''));
      tag.addEventListener('click', function () { if (NET) netNudge(); });
      // the call they made last, in front of them (the auction)
      if (S.phase === 'bid') { var lc = lastCallOf(p); if (lc) tag.appendChild(el('div', { class: 'bs-call' }, [bidCard(lc.c, false)])); }
      if (slot === 'b' && D.cap.parentNode === s) s.insertBefore(tag, D.cap.nextSibling); else s.insertBefore(tag, s.firstChild);
      // the backs of a hidden hand (top and sides), or the dummy face up
      if (hasDummy) { if (D.dummy.parentNode !== s) s.appendChild(D.dummy); }
      else if (slot !== 'b' && S.hands && S.hands[p] && S.hands[p].length && S.phase !== 'done' && S.phase !== 'over') {
        var bk = el('div', { class: 'bs-backs' }), nn = Math.min(S.hands[p].length, slot === 't' ? 7 : 5);
        for (var i = 0; i < nn; i++) bk.appendChild(Kit.card('', '', { back: true }));
        s.appendChild(bk);
      }
    });
    if (!(S.phase === 'play' && S.shown && S.dummy >= 0 && slotOf(S.dummy) !== 'b') && D.dummy.parentNode) D.dummy.remove();
  }
  function isTurn(p) {
    if (S.phase === 'bid') return S.turn === p;
    if (S.phase === 'play' && S.trick.length < 4) return ctrl(S.turn) === p && !busy || S.turn === p && !busy;
    return false;
  }
  function lastCallOf(p) { var r = null; S.calls.forEach(function (c, i) { if ((S.dealer + i) % 4 === p) r = { c: c, i: i }; }); return r; }
  // a bidding card
  function bidCard(c, alert) {
    var n;
    if (c === 'P') n = el('span', { class: 'bc pass', text: 'PASS' });
    else if (c === 'X') n = el('span', { class: 'bc dbl', text: 'X' });
    else if (c === 'XX') n = el('span', { class: 'bc rdbl', text: 'XX' });
    else { var st = E.stOf(c); n = el('span', { class: 'bc', html: E.lvOf(c) + strainHtml(st) }); }
    if (alert) n.classList.add('alert');
    n.setAttribute('aria-label', E.callWords(c));
    return n;
  }
  function strainHtml(st) { if (st === 4) return '<span class="s n">NT</span>'; var s = SUITS[st]; return '<span class="s' + (s === 'h' || s === 'd' ? ' r' : '') + '">' + GL[s] + '</span>'; }
  function callHtml(c) { if (c === 'P') return 'Pass'; if (c === 'X') return 'X'; if (c === 'XX') return 'XX'; return E.lvOf(c) + strainHtml(E.stOf(c)); }
  function isAlert(i) {
    var c = S.calls[i]; if (!E.isBid(c) && c !== 'X') return false;
    var w = S.why[i] || E.meaning(S.calls, S.dealer, i);
    return /^(Stayman|Jacoby|Blackwood|Michaels|Unusual 2NT|New minor forcing|Answers new minor|Answers the ask|Asks partner which minor|Pass or correct|Answers Blackwood|Answers Stayman|Strong and artificial|Waiting|Completes the transfer|Cuebid|Negative double|Takeout double|Asks for kings|Answers the king|Asks partner to describe|Jordan)/.test(w);
  }
  // ── the trick ──
  function paintTrick() {
    if (!D) return;
    var showing = S.phase === 'play' ? S.trick : [];
    var keep = {};
    showing.forEach(function (t) { keep[t.c.id] = 1; });
    Array.prototype.slice.call(D.trick.children).forEach(function (n) { if (!keep[n.dataset.id] && !n.classList.contains('fly-hold')) n.remove(); });
    showing.forEach(function (t) {
      var slot = slotOf(t.p), node = D.trick.querySelector('.tc[data-id="' + t.c.id + '"]');
      if (!node) { node = el('div', { class: 'tc ' + slot, 'data-id': t.c.id, style: { 'view-transition-name': 'b-c' + t.c.id } }, [Cards.el(t.c)]); D.trick.appendChild(node); }
      else node.className = 'tc ' + slot + (node.classList.contains('fly-hold') ? ' fly-hold' : '');
    });
  }
  // ── the dummy, face up ──
  function sizeDummy() {
    if (!lay || !S || S.dummy < 0) return;
    var slot = slotOf(S.dummy), fw = lay.fw, fh = lay.fh, h = S.hands[S.dummy] || [], by = suitsOf(h), L = Math.max(1, Math.max.apply(null, by.map(function (x) { return x.cs.length; })));
    var mode = slot === 't' ? (lay.mode === 'ps' ? 'line' : 'cols') : slot === 'b' ? 'none' : lay.mode === 'ps' ? 'cols' : 'rows';
    var dcw;
    if (mode === 'cols' && slot !== 't') dcw = Math.min(52, fw * 0.3 / 4.4, (fh - 56) / (1.4 + (L - 1) * 0.3));
    else if (mode === 'cols') dcw = Math.min(lay.tab ? 78 : 60, (fw - 190) / 4.4, (fh * 0.36) / (1.4 + (L - 1) * 0.34));
    else if (mode === 'line') dcw = Math.min(50, (fw - 170) / (4 + 9 * 0.38 + 0.5), fh * 0.23 / 1.4);
    else dcw = Math.min(lay.tab ? 64 : 48, (fw * 0.34) / (1 + (L - 1) * 0.36), (fh * 0.62) / (4 * 1.46));
    D.root.style.setProperty('--dcw', px(Math.max(26, dcw)));
    D.root.style.setProperty('--dvis', mode === 'cols' && slot !== 't' ? '.3' : '.34');
    D.dmode = mode;
  }
  function suitsOf(h) {
    var t = trump(), order = t ? [t].concat(['s', 'h', 'c', 'd'].filter(function (s) { return s !== t; })) : ['s', 'h', 'c', 'd'];
    return order.map(function (s) { return { s: s, cs: h.filter(function (c) { return c.s === s; }).sort(function (a, b) { return E.RV[b.r] - E.RV[a.r]; }) }; }).filter(function (x) { return x.cs.length; });
  }
  function paintDummy() {
    if (!D) return;
    D.dummy.innerHTML = '';
    if (S.phase !== 'play' || !S.shown || S.dummy < 0) { D.dummy.style.display = 'none'; placeTrick(); return; }
    var slot = slotOf(S.dummy);
    if (slot === 'b') { D.dummy.style.display = 'none'; placeTrick(); return; }   // (you are the dummy: your own cards, face up below)
    if (D.dummy.parentNode !== D.seats[S.dummy]) D.seats[S.dummy].appendChild(D.dummy);
    sizeDummy();
    var mode = D.dmode;
    D.dummy.style.display = '';
    D.dummy.className = 'bd ' + mode;
    var by = suitsOf(S.hands[S.dummy]), playable = myMoveFor(S.dummy) ? legalIds(S.dummy) : null;
    by.forEach(function (g) {
      var col = el('div', { class: 'col' });
      g.cs.forEach(function (c) {
        var n = Cards.el(c); n.style.setProperty('view-transition-name', 'b-c' + c.id);
        if (playable) {
          if (playable[c.id]) { n.classList.add('play'); n.addEventListener('click', function () { humanCard(S.dummy, c); }); }
          else { n.classList.add('dim'); n.addEventListener('click', function () { whyNot(S.dummy, c); }); }
        }
        col.appendChild(n);
      });
      D.dummy.appendChild(col);
    });
    placeTrick();
  }
  // The trick sits in the middle of the room the seats, the dummy and the corner pieces leave, as large as fits
  // Upright, the corner pieces, the auction slip and the side seats share the felt: the slip sits just above your
  // name, and the side seats in the room between the top corners and whatever lies below them
  function fitPieces() {
    if (!D || !lay) return;
    var fr = D.felt.getBoundingClientRect(); if (!fr.width) return;
    var portrait = !lay.land, sb = D.seats[bottom()], mid = D.corner.mid;
    D.seats.forEach(function (s) { s.style.top = ''; s.style.bottom = ''; });
    mid.style.top = ''; mid.style.bottom = ''; mid.style.width = ''; mid.style.marginLeft = ''; mid.style.translate = '';
    D.score.style.display = '';
    if (!portrait) { fitInfo(); return; }
    // a long name over the top seat would run into the contract in the top right corner: the contract goes under the score
    var tt = seatTag(D.seats.indexOf(D.seats.filter(function (s) { return s.classList.contains('t'); })[0]));
    if (tt && D.contract.parentNode === D.corner.tr) {
      var a1 = tt.getBoundingClientRect(), a2 = D.contract.getBoundingClientRect();
      if (a1.right > a2.left - 4 && a1.left < a2.right && a1.bottom > a2.top && a1.top < a2.bottom) D.corner.tl.appendChild(D.contract);
    }
    var sr = sb.getBoundingClientRect(), bottomTop = sr.height ? sr.top - fr.top : fr.height;
    var topB = 0;
    ['tl', 'tr'].forEach(function (k) { var c = D.corner[k]; if (c.children.length) topB = Math.max(topB, c.getBoundingClientRect().bottom - fr.top); });
    var low = bottomTop;
    // a small phone in the auction: the score plaque steps aside (the menu's Score pad has it), the side seats are
    // their name tags in a band under the board, and the auction (whose slip shows every call) takes the rest
    var small = mid.children.length && D.root.classList.contains('small');
    var lim = topB;
    if (small) {
      D.score.style.display = 'none';
      topB = 0;
      ['tl', 'tr'].forEach(function (k) { var c = D.corner[k]; if (c.children.length) topB = Math.max(topB, c.getBoundingClientRect().bottom - fr.top); });
      var band = 0;
      D.seats.forEach(function (s) { if (s.classList.contains('l') || s.classList.contains('r')) { var tg = s.querySelector('.bs-tag'); if (tg) band = Math.max(band, tg.getBoundingClientRect().height); } });
      lim = topB + band + 8;
      var ts = D.seats.filter(function (s) { return s.classList.contains('t'); })[0];
      if (ts) Array.prototype.forEach.call(ts.querySelectorAll('.bs-tag, .bs-call'), function (k) { if (k.offsetWidth) lim = Math.max(lim, k.getBoundingClientRect().bottom - fr.top); });
    }
    if (mid.children.length) {
      mid.style.bottom = px(fr.height - bottomTop + 8); mid.style.top = 'auto'; mid.style.translate = '0 0';
      var sc = D.slip.querySelector('.bslip-scroll');
      if (sc) {
        sc.style.maxHeight = px(Math.max(90, (fr.height - topB) * 0.42));
        // never over the board and the score: a short table shows the latest rows of a long auction, the names kept
        var over = lim + 6 - (mid.getBoundingClientRect().top - fr.top);
        if (over > 0) sc.style.maxHeight = px(Math.max(50, sc.getBoundingClientRect().height - over));
        snapSlip(sc);
        // a table too short for both: the score plaque steps aside while the auction is on, and the board stays
        if (!small && topB + 6 > mid.getBoundingClientRect().top - fr.top && D.score.parentNode === D.corner.tl) {
          D.score.style.display = 'none';
          topB = D.board.getBoundingClientRect().bottom - fr.top;
          ['tr'].forEach(function (k) { var c = D.corner[k]; if (c.children.length) topB = Math.max(topB, c.getBoundingClientRect().bottom - fr.top); });
        }
      }
      low = mid.getBoundingClientRect().top - fr.top;
    }
    ['bl', 'br'].forEach(function (k) { var c = D.corner[k]; if (c.children.length) low = Math.min(low, c.getBoundingClientRect().top - fr.top); });
    D.seats.forEach(function (s) {
      if (!(s.classList.contains('l') || s.classList.contains('r'))) return;
      s.style.top = px(topB + 4); s.style.bottom = px(Math.max(0, fr.height - low + 4));
      // too little room between the corner and the auction: the backs of that hand step aside, the name and call stay
      s.classList.remove('slim');
      if (s.scrollHeight > s.clientHeight + 1) s.classList.add('slim');
    });
    // a dummy across the top starts below the corner pieces it would otherwise run into
    D.dummy.style.marginTop = '';
    if (D.dummy.isConnected && D.dummy.parentNode.classList.contains('t')) {
      var dr = D.dummy.getBoundingClientRect(), need = 0;
      ['tl', 'tr'].forEach(function (k) { var c = D.corner[k]; if (!c.children.length) return; var q = c.getBoundingClientRect(); if (q.right > dr.left && q.left < dr.right) need = Math.max(need, q.bottom - dr.top + 6); });
      if (need > 0) D.dummy.style.marginTop = px(need);
    }
  }
  // sideways, the left column gives the auction room first: if its calls would scroll, the hand's shape (in the
  // auction) or the lines under the tricks (in the play) step aside, and then the auction itself (the contract
  // plaque still opens it)
  // a scrolled auction shows whole rows under the names, never a row cut in half
  function snapSlip(sc) {
    if (!sc || sc.scrollHeight <= sc.clientHeight + 1) return;
    var th = sc.querySelector('th'), td = sc.querySelector('td'); if (!th || !td) return;
    var hh = th.getBoundingClientRect().height, rh = td.getBoundingClientRect().height; if (!rh) return;
    var rows = Math.max(1, Math.floor((sc.clientHeight - hh) / rh));
    sc.style.maxHeight = px(hh + rows * rh + 1);
    sc.scrollTop = sc.scrollHeight;
  }
  function fitInfo() {
    var R = D.root; R.classList.remove('tight1', 'tight2');
    var sc = D.slip.isConnected && D.slip.querySelector('.bslip-scroll');
    if (sc) sc.style.maxHeight = '';
    function over() { return sc && sc.scrollHeight > sc.clientHeight + 2 || D.info.scrollHeight > D.info.clientHeight + 2; }
    if (!over()) return;
    R.classList.add('tight1');
    if (!over()) return;
    if (S.phase === 'bid') { snapSlip(sc); return; }
    R.classList.add('tight2');
  }
  function placeTrick() {
    if (!D || !lay) return;
    fitPieces();
    var fr = D.felt.getBoundingClientRect(); if (!fr.width) return;
    var L = 0, Rr = fr.width, T = 0, B = fr.height;
    function rel(n) { var r = n.getBoundingClientRect(); return { l: r.left - fr.left, r: r.right - fr.left, t: r.top - fr.top, b: r.bottom - fr.top, w: r.width, h: r.height }; }
    D.seats.forEach(function (s) {
      if (!s.isConnected) return;
      var sl = s.classList, kids = Array.prototype.slice.call(s.children).filter(function (k) { return k.offsetWidth; });
      kids.forEach(function (k) { var q = rel(k); if (sl.contains('l')) L = Math.max(L, q.r); else if (sl.contains('r')) Rr = Math.min(Rr, q.l); else if (sl.contains('t')) T = Math.max(T, q.b); else if (sl.contains('b')) B = Math.min(B, q.t); });
    });
    ['tl', 'tr'].forEach(function (k) { var c = D.corner[k]; if (c.children.length) { var q = rel(c); if (q.h && q.b > T && (q.r > fr.width * 0.3 && k === 'tl' || q.l < fr.width * 0.7 && k === 'tr')) T = Math.max(T, Math.min(q.b, fr.height * 0.3)); } });
    ['bl', 'br'].forEach(function (k) { var c = D.corner[k]; if (c.children.length) { var q = rel(c); if (q.h) B = Math.min(B, Math.max(q.t, fr.height * 0.6)); } });
    if (D.root.classList.contains('lowhand')) { var hr = D.handEl.getBoundingClientRect(); if (hr.height) B = Math.min(B, hr.top - fr.top + 6); }
    var w = Math.max(60, Rr - L - 12), h = Math.max(60, B - T - 12);
    var tcw = Math.max(36, Math.min(lay.tab ? 90 : 76, w / 3, h / 3.05));
    D.root.style.setProperty('--tcw', px(tcw));
    D.trick.style.left = px((L + Rr) / 2 - 7); D.trick.style.top = px((T + B) / 2 + tcw * 0.02 - 7);
  }
  function myMoveFor(p) {
    // can the person holding this device play seat p's card now?
    if (busy || BLIND || S.phase !== 'play' || S.turn !== p || S.trick.length >= 4) return false;
    var c = ctrl(p);
    if (NET) return c === ME && NET.myTurn();
    return person(c) && c === LME;
  }
  function legalIds(p) { var o = {}; E.legalPlays(S.hands[p], S.trick).forEach(function (c) { o[c.id] = 1; }); return o; }
  function whyNot(p, c) { Kit.haptic('error'); Kit.toast(S.trick.length ? 'You have to follow ' + E.SUITWORD[S.trick[0].c.s] + ' when you can' : 'You can’t play that now'); }
  // ── your hand ──
  function cardNode(c) { return D && (D.handEl.querySelector('[data-id="' + c.id + '"]') || D.dummy.querySelector('[data-id="' + c.id + '"]')); }
  function paintHand() {
    if (!D) return;
    var m = bottom(), h = S.hands && S.hands[m] ? S.hands[m] : [];
    D.handEl.innerHTML = '';
    var show = canSee(m) && !(NET && NET.seat < 0);
    var isDummy = S.phase === 'play' && m === S.dummy;
    D.handEl.className = 'bh' + (isDummy ? ' dummy' : '') + (show ? '' : ' blind') + (show && (myMoveFor(m) || S.phase === 'bid' && S.turn === m && (NET ? NET.myTurn() : person(m))) ? ' myturn' : '');
    var playable = show && myMoveFor(m) ? legalIds(m) : null;
    var order = ['s', 'h', 'c', 'd'], t = trump();
    if (t) order = [t].concat(order.filter(function (s) { return s !== t; }));
    var cs = h.slice().sort(function (a, b) { return order.indexOf(a.s) - order.indexOf(b.s) || E.RV[b.r] - E.RV[a.r]; });
    var prevS = null;
    cs.forEach(function (c) {
      var n = show ? Cards.el(c) : Kit.card('', '', { back: true });
      if (show) n.style.setProperty('view-transition-name', 'b-c' + c.id);
      if (show && prevS && prevS !== c.s) n.classList.add('gap');
      prevS = c.s;
      if (playable) {
        if (playable[c.id]) { n.classList.add('play'); n.addEventListener('click', function () { humanCard(m, c); }); }
        else { n.classList.add('dim'); n.addEventListener('click', function () { whyNot(m, c); }); }
      } else if (NET && show && S.phase === 'play') n.addEventListener('click', netNudge);
      D.handEl.appendChild(n);
    });
    // what your hand is, beside it
    var hc = show && h.length ? E.hcp(S.dealt ? E.pbnHand(S.dealt[m]) : h) : 0;
    D.hcp.style.display = show && S.aids && h.length ? '' : 'none';
    D.hcp.innerHTML = hc + ' <small>HCP</small>';
    D.hcp.classList.toggle('big', hc >= 20);
    D.hcp.setAttribute('aria-label', hc + ' high-card points');
    D.htag.textContent = isDummy ? 'Dummy: ' + first(nm(S.k.decl)) + ' plays these' : '';
    D.htag.style.display = isDummy && !D.root.classList.contains('small') ? '' : 'none';
  }
  function glowHcp() { if (!D) return; D.hcp.classList.add('big'); D.hcp.animate([{ scale: 1 }, { scale: 1.35 }, { scale: 1 }], { duration: 700, easing: 'ease-out' }); }
  function humanCard(p, c) {
    if (NET) { netCard(p, c); return; }
    if (busy || !myMoveFor(p)) return;
    snapshot(); doCard(p, c);
  }

  // ── what you do: the caption, and the bidding box in the auction ──
  var boxLv = 0, sugCall = null;
  function paintAct() {
    if (!D) return;
    var m = bottom(), txt = '', go = false;
    D.cap.classList.remove('go');
    if (BLIND) txt = '';
    else if (S.phase === 'bid') {
      var mine = S.turn === m && (NET ? NET.myTurn() : person(m));
      if (mine) { txt = 'Your call'; go = true; }
      else txt = (person(S.turn) && !NET ? 'Pass the device to ' : '') + first(nm(S.turn)) + (person(S.turn) && !NET ? '' : NET && !S.players[S.turn].cpu ? ' is choosing a call' : ' is thinking');
    } else if (S.phase === 'play') {
      var q = S.turn, c = ctrl(q);
      if (S.trick.length >= 4 || busy) txt = '';
      else if ((NET ? c === ME && NET.myTurn() : c === LME && person(c))) {
        go = true;
        txt = q === S.dummy && q !== m ? (S.trick.length ? 'Play a card from the dummy' : 'Lead from the dummy') : S.trick.length ? 'Your turn: tap a card' : (S.played.length ? 'Your lead' : 'Your opening lead');
      } else txt = (c === q ? first(nm(q)) : first(nm(c)) + ', for the dummy,') + (person(c) && !NET ? ' plays next: pass the device' : ' is thinking');
      if (S.k) {
        var ds = S.k.decl % 2, need = 6 + S.k.lvl;
        D.cap.dataset.k = '';
      }
    }
    if (sugCall && S.phase === 'bid' && D.sugSay) { D.cap.innerHTML = '<span class="sug"><b>' + callHtml(sugCall) + '</b> ' + Kit.esc(D.sugSay) + '</span>'; go = false; D.cap.classList.add('tipc'); }
    else { D.cap.classList.remove('tipc'); D.cap.textContent = txt; }
    if (go) D.cap.classList.add('go');
    D.cap.classList.toggle('empty', !D.cap.textContent);
    D.cap.onclick = NET ? netNudge : null;
    paintBox();
  }
  function paintBox() {
    var m = bottom();
    var mine = S.phase === 'bid' && !BLIND && S.turn === m && (NET ? NET.myTurn() : person(m));
    D.box.innerHTML = ''; D.box.classList.remove('full');
    if (S.phase !== 'bid') return;
    var legal = mine ? E.legalCalls(S.calls, S.dealer) : [];
    var lo = 8; legal.forEach(function (c) { if (E.isBid(c)) lo = Math.min(lo, E.lvOf(c)); });
    if (D.boxAt !== S.calls.length + ':' + S.dealNo) { D.boxAt = S.calls.length + ':' + S.dealNo; boxLv = 0; }
    if (!boxLv || boxLv < lo || boxLv > 7) boxLv = lo <= 7 ? lo : 7;
    if (D.root.classList.contains('fullbox')) { paintFullBox(mine, legal, lo); return; }
    var lvRow = el('div', { class: 'row lv' }), stRow = el('div', { class: 'row st' }), caRow = el('div', { class: 'row ca' });
    for (var l = 1; l <= 7; l++) (function (l) {
      var ok = mine && l >= lo;
      lvRow.appendChild(el('button', { type: 'button', class: 'lvb' + (l === boxLv && ok ? ' on' : ''), text: String(l), disabled: !ok, 'aria-label': 'Level ' + l,
        onclick: function () { boxLv = l; Kit.sfx('tick'); Kit.haptic('light'); paintBox(); } }));
    })(l);
    for (var st = 0; st < 5; st++) (function (st) {
      var c = boxLv + E.STR[st], ok = mine && legal.indexOf(c) >= 0;
      var b = el('button', { type: 'button', class: 'stb' + (sugCall === c ? ' sug' : ''), html: (mine ? boxLv : '') + strainHtml(st), disabled: !ok, 'aria-label': 'Bid ' + E.callWords(c),
        onclick: function () { pickCall(c); } });
      stRow.appendChild(b);
    })(st);
    [['P', 'pass', 'Pass'], ['X', 'dbl', 'X'], ['XX', 'rdbl', 'XX']].forEach(function (q) {
      var ok = mine && legal.indexOf(q[0]) >= 0;
      caRow.appendChild(el('button', { type: 'button', class: 'cab ' + q[1] + (sugCall === q[0] ? ' sug' : ''), text: q[2], disabled: !ok, 'aria-label': E.callWords(q[0]), onclick: function () { pickCall(q[0]); } }));
    });
    if (S.aids && !NET || S.aids && NET) caRow.appendChild(el('button', { type: 'button', class: 'hintb', html: Kit.icon('lightbulb'), disabled: !mine, 'aria-label': 'Suggest a bid', onclick: function () { hint(); } }));
    else caRow.style.gridTemplateColumns = 'repeat(3,minmax(0,1fr))';
    D.box.appendChild(lvRow); D.box.appendChild(stRow); D.box.appendChild(caRow);
    D.box.style.opacity = mine ? '' : '.75';
  }
  // the whole bidding box at once: a row for each level, the five strains across, and Pass, X and XX under them
  function paintFullBox(mine, legal, lo) {
    D.box.classList.add('full');
    for (var l = 1; l <= 7; l++) for (var st = 0; st < 5; st++) (function (c, st) {
      var ok = mine && legal.indexOf(c) >= 0;
      D.box.appendChild(el('button', { type: 'button', class: 'stb' + (sugCall === c ? ' sug' : '') + (E.lvOf(c) < lo ? ' used' : ''), html: E.lvOf(c) + strainHtml(st), disabled: !ok, 'aria-label': 'Bid ' + E.callWords(c),
        onclick: function () { pickCall(c); } }));
    })(l + E.STR[st], st);
    var caRow = el('div', { class: 'row ca' });
    [['P', 'pass', 'Pass'], ['X', 'dbl', 'X'], ['XX', 'rdbl', 'XX']].forEach(function (q) {
      var ok = mine && legal.indexOf(q[0]) >= 0;
      caRow.appendChild(el('button', { type: 'button', class: 'cab ' + q[1] + (sugCall === q[0] ? ' sug' : ''), text: q[2], disabled: !ok, 'aria-label': E.callWords(q[0]), onclick: function () { pickCall(q[0]); } }));
    });
    if (S.aids) caRow.appendChild(el('button', { type: 'button', class: 'hintb', html: Kit.icon('lightbulb'), disabled: !mine, 'aria-label': 'Suggest a bid', onclick: function () { hint(); } }));
    else caRow.style.gridTemplateColumns = 'repeat(3,minmax(0,1fr))';
    D.box.appendChild(caRow);
    D.box.style.opacity = mine ? '' : '.75';
  }
  function sizeBox() {}
  function hint() {
    var m = bottom(), h = E.hintCall(S.hands[m], S.calls, S.dealer);
    sugCall = h.call; D.sugSay = h.say;
    if (E.isBid(h.call)) boxLv = E.lvOf(h.call);
    Kit.sfx('sparkle'); Kit.haptic('light'); paintAct(); placeTrick();
  }
  function pickCall(c) {
    sugCall = null; D.sugSay = null;
    if (NET) { netCall(c); return; }
    var m = bottom();
    if (busy || S.phase !== 'bid' || S.turn !== m || !person(m)) return;
    snapshot();
    doCall(m, c, '');
  }

  // ── the auction slip: West North East South ──
  var slipPick = -1;
  function paintSlip() {
    if (!D) return;
    var cols = [1, 2, 3, 0];   // W N E S
    var tb = el('table'), hd = el('tr');
    cols.forEach(function (p) {
      var nmL = (p === bottom() && who(p) === 'You' ? 'You' : first(nm(p))).length;
      var th = el('th', { class: (S.vul[p % 2] ? 'vul' : '') + (nmL >= 9 ? ' xs' : nmL >= 7 ? ' sm' : ''), title: SEATN[p] + (S.vul[p % 2] ? ', vulnerable' : '') }, [document.createTextNode(SEATN[p].charAt(0) === 'S' && p === bottom() && who(p) === 'You' ? 'You' : first(nm(p)))]);
      if (p === S.dealer) th.appendChild(el('span', { class: 'dl', text: 'D' }));
      hd.appendChild(th);
    });
    tb.appendChild(hd);
    var start = cols.indexOf(S.dealer), cells = [];
    for (var i = 0; i < start; i++) cells.push(null);
    S.calls.forEach(function (c, i) { cells.push(i); });
    if (S.phase === 'bid') cells.push('next');
    for (var r = 0; r < cells.length; r += 4) {
      var tr = el('tr');
      for (var j = 0; j < 4; j++) {
        var v = cells[r + j], td = el('td');
        if (v === 'next') td.className = 'next';
        else if (v != null) (function (i) {
          var c = S.calls[i];
          var b = el('button', { type: 'button', class: (c === 'P' ? 'p' : c === 'X' ? 'x' : c === 'XX' ? 'xx' : '') + (isAlert(i) ? ' alert' : '') + (i === slipPick ? ' on' : '') + (i === S.calls.length - 1 && S.phase === 'bid' ? ' new' : ''), html: callHtml(c),
            'aria-label': E.callWords(c) + ' by ' + nm((S.dealer + i) % 4) + ': what it means', onclick: function () { Kit.sfx('tap'); slipPick = slipPick === i ? -1 : i; paintSlip(); } });
          td.appendChild(b);
        })(v);
        tr.appendChild(td);
      }
      tb.appendChild(tr);
    }
    D.slip.innerHTML = '';
    var sc = el('div', { class: 'bslip-scroll' }, [tb]);
    D.slip.appendChild(sc);
    if (slipPick >= 0 && slipPick < S.calls.length) {
      var p = (S.dealer + slipPick) % 4, say = S.why[slipPick] || E.meaning(S.calls, S.dealer, slipPick);
      D.slip.appendChild(el('div', { class: 'say', html: '<b>' + callHtml(S.calls[slipPick]) + '</b> by ' + Kit.esc(who(p)) + ': ' + Kit.esc(say) }));
    }
    fitHeads(tb);
    if (D.root && D.root.contains(D.slip) && lay) placeTrick();
    requestAnimationFrame(function () { sc.scrollTop = sc.scrollHeight; fitHeads(tb); });
  }
  // a name too wide for its column over the auction is set smaller, then in lower case, and only then shortened
  function fitHeads(tb) {
    if (!tb.isConnected) return;
    Array.prototype.forEach.call(tb.querySelectorAll('th'), function (th) {
      var tx = th.firstChild; if (!tx || tx.nodeType !== 3) return;
      function over() { return th.scrollWidth > th.clientWidth + 1; }
      if (!over()) return;
      var steps = [['.52rem', ''], ['.5rem', 'none']];
      for (var i = 0; i < steps.length && over(); i++) { th.style.fontSize = steps[i][0]; th.style.textTransform = steps[i][1]; th.style.letterSpacing = '0'; }
      var full = tx.nodeValue;
      for (var k = full.length - 1; k >= 3 && over(); k--) tx.nodeValue = full.slice(0, k);
      th.title = full;
    });
  }
  // ── the board tray, the contract and the score ──
  function boardSvg(dealer, vul, size) {
    // a duplicate board seen from above: a pocket at each seat, red when that side is vulnerable, the dealer's marked
    var pos = { 2: [30, 6, 'N'], 3: [54, 30, 'E'], 0: [30, 54, 'S'], 1: [6, 30, 'W'] };
    var s = '<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="3" y="3" width="54" height="54" rx="8" fill="#e9e1cc" stroke="#7a6a48" stroke-width="1.5"/>';
    [2, 3, 0, 1].forEach(function (p) {
      var q = pos[p], v = vul[p % 2], horiz = p === 2 || p === 0;
      var w = horiz ? 22 : 9, h = horiz ? 9 : 22;
      s += '<rect x="' + (q[0] - w / 2) + '" y="' + (q[1] - h / 2) + '" width="' + w + '" height="' + h + '" rx="2.5" fill="' + (v ? '#d0142f' : '#fbf8f0') + '" stroke="' + (v ? '#8a0c1f' : '#a89a78') + '" stroke-width="1"/>';
      s += '<text x="' + q[0] + '" y="' + (q[1] + 0.5) + '" text-anchor="middle" dominant-baseline="central" font-size="7" font-weight="900" font-family="system-ui" fill="' + (v ? '#fff' : '#5a4c30') + '">' + q[2] + '</text>';
      if (p === dealer) s += '<circle cx="' + (q[0] + (horiz ? 14 : 0)) + '" cy="' + (q[1] + (horiz ? 0 : 14)) + '" r="3.6" fill="#1b1b28"/><text x="' + (q[0] + (horiz ? 14 : 0)) + '" y="' + (q[1] + (horiz ? 0 : 14) + .3) + '" text-anchor="middle" dominant-baseline="central" font-size="4.6" font-weight="900" font-family="system-ui" fill="#fff">D</text>';
    });
    return s + '<circle cx="30" cy="30" r="9" fill="#cfc4a6"/><text x="30" y="30.5" text-anchor="middle" dominant-baseline="central" font-size="9" font-weight="900" font-family="system-ui" fill="#5a4c30">' + (size || '') + '</text></svg>';
  }
  function paintBoard() {
    if (!D) return;
    var n = S.dealNo, v = S.vul;
    var vs = v[0] && v[1] ? 'Both sides vulnerable' : v[0] ? 'North-South vulnerable' : v[1] ? 'East-West vulnerable' : 'Nobody vulnerable';
    D.board.innerHTML = boardSvg(S.dealer, v, n) + '<div class="tx"><b>Deal ' + n + '</b><span>' + (S.fmt === 'chicago' ? 'of 4' : 'Rubber') + '</span></div>';
    D.board.setAttribute('aria-label', 'Deal ' + n + '. ' + first(nm(S.dealer)) + ' dealt. ' + vs);
  }
  function paintScore() {
    if (!D) return;
    var w = weSide(), T = S.pad.tot, pad = S.pad;
    function col(t, label) {
      var c = el('span', { class: 'c' }, [el('small', { text: label }), el('b', { text: String(T[t]) })]);
      if (pad.fmt === 'rubber') c.appendChild(el('i', { text: pad.games[t] ? (pad.games[t] === 1 ? '1 game' : '2 games') : pad.part[t] ? pad.part[t] + ' to go on' : 'no game' }));
      else c.appendChild(el('i', { text: pad.part[t] ? pad.part[t] + ' below' : ' ' }));
      return c;
    }
    D.score.innerHTML = '';
    D.score.appendChild(col(w, onePerson() ? 'WE' : sideAbbr(w)));
    D.score.appendChild(col(1 - w, onePerson() ? 'THEY' : sideAbbr(1 - w)));
  }
  function sideAbbr(t) { return t === 0 ? 'N-S' : 'E-W'; }
  function paintContract() {
    if (!D || !S.k) return;
    var k = S.k, need = 6 + k.lvl;
    var cards = el('span', { class: 'cards' }, [bidCard(k.lvl + E.STR[k.st])]);
    if (k.dbl) cards.appendChild(bidCard(k.dbl === 2 ? 'XX' : 'X'));
    D.contract.innerHTML = '';
    D.contract.appendChild(cards);
    D.contract.appendChild(el('span', { class: 'tx' }, [el('b', { text: who(k.decl) === 'You' ? 'You declare' : first(nm(k.decl)) }), el('span', { text: 'Needs ' + need })]));
    D.contract.setAttribute('aria-label', E.contractText(k, true) + ' by ' + nm(k.decl) + '. ' + need + ' tricks needed. Tap to see the auction.');
  }
  // tricks taken: a face-down card for each, the tricks needed marked in gold
  function paintTray() {
    if (!D || !S.k || S.phase === 'bid') return;
    var w = weSide(), ds = S.k.decl % 2, need = 6 + S.k.lvl;
    function row(t, holder) {
      holder.innerHTML = '';
      var goal = t === ds ? need : 14 - need, got = S.won[t];
      var lb = el('span', { class: 'lb', html: '<b>' + got + '</b>' + (onePerson() ? (t === w ? 'We' : 'They') : sideAbbr(t)) });
      var tk = el('span', { class: 'tk', 'data-side': t });
      var shown = Math.max(goal, got);
      for (var i = 0; i < shown; i++) {
        if (i < got) { var c = Kit.card('', '', { back: true }); if (i === goal - 1) c.classList.add('goal'); tk.appendChild(c); }
        else tk.appendChild(el('span', { class: 'slot' + (i === goal - 1 ? ' goal' : '') }));
      }
      var line = el('div', { class: 'rw' }, [lb, tk]);
      var note = got >= goal ? (t === ds ? 'Contract made' : 'Contract beaten') : (goal - got) + ' more ' + (t === ds ? 'to make it' : 'to beat it');
      var st = S.run[t] >= 4 ? el('span', { class: 'streak', html: Kit.icon('flame') + S.run[t] + ' in a row' }) : null;
      var nb = el('div', { class: 'rw' }, [el('span', { class: 'lb' }), el('span', { class: 'need' + (got >= goal ? ' ok' : ''), text: note }), st]);
      holder.appendChild(line); holder.appendChild(nb);
      holder.setAttribute('aria-label', (t === w ? 'We' : 'They') + ' have won ' + got + ' tricks. ' + note);
    }
    if (lay && lay.land) { D.tray.innerHTML = ''; var a = el('div', { class: 'bq' }), b = el('div', { class: 'bq' }); row(w, a); row(1 - w, b); D.tray.appendChild(a); D.tray.appendChild(b); }
    else { row(w, D.trayW); row(1 - w, D.trayT); }
  }
  function trayRow(t) { if (!D) return null; return (lay && lay.land ? D.tray : (t === weSide() ? D.trayW : D.trayT)).querySelector('.tk[data-side="' + t + '"]'); }

  // ── Motion ────────────────────────────────────────────────────────────────
  function fly(node, fromRect, ms, done) {
    if (!node || !fromRect) { done && done(); return; }
    var b = node.getBoundingClientRect();
    var dx = (fromRect.left + fromRect.width / 2) - (b.left + b.width / 2), dy = (fromRect.top + fromRect.height / 2) - (b.top + b.height / 2);
    var sc = fromRect.width && b.width ? Math.max(.35, Math.min(2, fromRect.width / b.width)) : 1;
    var a = node.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')', zIndex: 30 }, { transform: 'none', zIndex: 30 }], { duration: ms || 360, easing: 'cubic-bezier(.2,.8,.25,1)' });
    a.id = 'fly';
    a.onfinish = function () { done && done(); };
    return a;
  }
  function dealAnim() {
    if (!D) return;
    var cs = D.handEl.children, from = D.felt.getBoundingClientRect();
    var center = { left: from.left + from.width / 2 - 20, top: from.top + from.height / 2 - 28, width: 40, height: 56 };
    Kit.sfx('deal');
    Array.prototype.forEach.call(cs, function (n, i) {
      n.style.opacity = '0';
      tw(function () { n.style.opacity = ''; fly(n, center, 380); if (i % 3 === 0) Kit.sfx('deal'); }, 40 * i);
    });
  }
  function callAnim(p, c) {
    paintSeats(); paintSlip(); paintAct();
    var cc = D.seats[p].querySelector('.bs-call .bc'), tg = seatTag(p);
    if (cc) { cc.classList.add('new'); }
    Kit.sfx(c === 'P' ? 'tick' : c === 'X' || c === 'XX' ? 'chip' : 'flip');
  }
  // a card played: it flies to the trick; the fourth card lights the winner, then the trick sweeps to their side
  function playAnim(mv, fromRect, done) {
    var t = token;
    paintHand(); paintDummy(); paintSeats();
    // the trick as it stands with this card (the state already moved on if the trick is complete)
    var cards = mv.trick || S.trick;
    paintTrickList(cards);
    var node = D.trick.querySelector('.tc[data-id="' + mv.c.id + '"]');
    if (!fromRect) { var tg = seatTag(mv.p); fromRect = tg && tg.getBoundingClientRect(); }
    fly(node, fromRect, 340);
    Kit.sfx(mv.lead ? 'flip' : trump() && mv.c.s === trump() && cards[0].c.s !== trump() ? 'chip' : 'flip');
    if (mv.lead) tw(function () { if (t === token && S) { paintDummy(); dummyLanding(); paintSeats(); } }, 380);
    if (mv.w == null) { paintAct(); tw(function () { if (t === token) done(); }, 380); return; }
    busy = true; paintAct();
    var w = mv.w, ws = w % 2;
    tw(function () {
      if (t !== token) return;
      var wc = cards.filter(function (x) { return x.p === w; })[0], wn = wc && D.trick.querySelector('.tc[data-id="' + wc.c.id + '"] .pcard');
      if (wn) wn.classList.add('win');
      var ours = onePerson() ? ws === weSide() : true;
      if (ours) { Kit.sfx('chip'); if (w === bottom() || w === (bottom() + 2) % 4) Kit.haptic('light'); }
      tw(function () {
        if (t !== token) return;
        sweep(cards, ws, function () {
          busy = false;
          paintTrickList([]); paintTray(); paintSeats(); paintAct();
          trickReward(ws);
          done();
        });
      }, 620);
    }, 700);
  }
  function paintTrickList(list) {
    D.trick.innerHTML = '';
    list.forEach(function (x) { D.trick.appendChild(el('div', { class: 'tc ' + slotOf(x.p), 'data-id': x.c.id, style: { 'view-transition-name': 'b-c' + x.c.id } }, [Cards.el(x.c)])); });
  }
  // the four cards gather, turn face down and slide to the side that won them
  function sweep(cards, side, done) {
    var row = trayRow(side), dest = row ? row.getBoundingClientRect() : null;
    var nodes = Array.prototype.slice.call(D.trick.children);
    if (!dest || !nodes.length) { done(); return; }
    var tx = dest.right - 8, ty = dest.top + dest.height / 2, n = 0;
    Kit.sfx('whoosh');
    nodes.forEach(function (nd) {
      var r = nd.getBoundingClientRect(), dx = tx - (r.left + r.width / 2), dy = ty - (r.top + r.height / 2);
      var a = nd.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(' + (dx * .15) + 'px,' + (dy * .15) + 'px) scale(.9) rotateY(90deg)', opacity: 1, offset: .35 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.25)', opacity: .2 }], { duration: 520, easing: 'ease-in', fill: 'forwards' });
      a.id = 'fly';
      a.onfinish = function () { if (++n === nodes.length) done(); };
    });
  }
  // a little reward for a trick won by your side, a bigger one for the trick that makes or beats the contract
  function trickReward(ws) {
    if (!S || !S.k) return;
    var ds = S.k.decl % 2, need = 6 + S.k.lvl, goal = ws === ds ? need : 14 - need, got = S.won[ws];
    var row = trayRow(ws), last = row && row.querySelectorAll('.pcard'); last = last && last[last.length - 1];
    if (last) last.classList.add('won');
    var ours = !onePerson() || ws === weSide();
    if (last && ours) sparkle(last.getBoundingClientRect(), got === goal ? 10 : 4);
    var lastTrick = S.phase !== 'play' || (S.tricks && S.tricks.length >= 13);   // (the end of the deal has its own moment)
    if (got === goal && !lastTrick) {
      var made = ws === ds;
      var mine = !onePerson() || ws === weSide();
      Kit.callout(made ? 'Contract made!' : 'Contract beaten!', mine ? '#7ff0a8' : '#ff8a94');
      Kit.sfx(mine ? 'good' : 'bad'); Kit.haptic(mine ? 'success' : 'error');
    } else if (got > goal && ws === ds && ours) { plus(last, '+1'); Kit.sfx('sparkle'); }
    var run = S.run[ws];
    if (run === 9 || run === 13) { S.hl = S.hl.filter(function (x) { return x.indexOf(' tricks in a row on deal ' + S.dealNo) < 0; }); S.hl.push(sideNames(ws) + ' won ' + run + ' tricks in a row on deal ' + S.dealNo); }
    if (ours && !lastTrick && (run === 6 || run === 9 || run === 12)) { Kit.callout(run + ' tricks in a row!'); Kit.sfx('sparkle'); Kit.haptic('success'); }
  }
  function sparkle(r, n) {
    if (!r || !D) return;
    var fr = D.root.getBoundingClientRect();
    for (var i = 0; i < n; i++) (function (i) {
      var s = el('span', { class: 'bspark' }); D.root.appendChild(s);
      var x = r.left + r.width / 2 - fr.left, y = r.top + r.height / 2 - fr.top, ang = Math.PI * 2 * i / n + Math.random(), dist = 24 + Math.random() * 26;
      s.style.left = px(x - 5); s.style.top = px(y - 5);
      var a = s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + Math.cos(ang) * dist + 'px,' + Math.sin(ang) * dist + 'px) scale(.2)', opacity: 0 }], { duration: 620 + Math.random() * 200, easing: 'cubic-bezier(.2,.8,.3,1)' });
      a.onfinish = function () { s.remove(); };
    })(i);
  }
  function plus(node, txt) {
    if (!node || !D) return;
    var r = node.getBoundingClientRect(), fr = D.root.getBoundingClientRect(), s = el('span', { class: 'bplus', text: txt });
    D.root.appendChild(s); s.style.left = px(r.left - fr.left); s.style.top = px(r.top - fr.top - 10);
    var a = s.animate([{ transform: 'translateY(0)', opacity: 0 }, { transform: 'translateY(-12px)', opacity: 1, offset: .3 }, { transform: 'translateY(-34px)', opacity: 0 }], { duration: 1100, easing: 'ease-out' });
    a.onfinish = function () { s.remove(); };
  }
  function dummyLanding() {
    if (!D) return;
    Kit.sfx('deal');
    var tg = seatTag(S.dummy), fr = tg && tg.getBoundingClientRect();
    Array.prototype.forEach.call(D.dummy.querySelectorAll('.pcard'), function (n, i) {
      n.style.opacity = '0';
      tw(function () { n.style.opacity = ''; fly(n, fr, 340); }, 30 * i);
    });
  }
  // A moment, on the table: the kit's edge-lit strip across the felt's lower edge, the contract on its square and the
  // points glowing at its end (a deal's bad news for your side lit warm)
  function moment(o) {
    if (!D) return;
    Kit.moment({ title: o.title, line: o.line, chip: o.chip, pts: o.pts, tone: o.tone === 'cold' ? 'bad' : '', big: !!o.big, at: D.felt, ms: o.ms || 1600 });
  }

  // ── Sheets: the end of a deal, the pad, the auction ──
  function padNode(pad, fresh) {
    var w = weSide(), node = el('div', { class: 'bpad' });
    var sides = [w, 1 - w];
    node.appendChild(el('div', { class: 'bpad-h' }, sides.map(function (t) { return el('div', null, [document.createTextNode(onePerson() ? (t === w ? 'WE' : 'THEY') : sideAbbr(t)), el('small', { text: sideNames(t) })]); })));
    if (pad.fmt === 'chicago') {
      var dl = el('div', { class: 'bpad-deals' });
      for (var i = 1; i <= 4; i++) {
        var v = i === 1 ? 'Nobody vulnerable' : i === 4 ? 'Both vulnerable' : 'Dealer\'s side vulnerable', d = pad.deals.filter(function (x) { return x.d === i; }).slice(-1)[0];
        dl.appendChild(el('div', { class: (S && i === S.dealNo && S.phase !== 'over' && !d ? 'cur' : '') }, [el('b', { text: d ? (d.k || 'Passed') : 'Deal ' + i }), document.createTextNode(d ? 'Deal ' + i : v)]));
      }
      node.appendChild(dl);
    }
    var above = el('div', { class: 'bpad-g above' }), below = el('div', { class: 'bpad-g below' });
    var cA = sides.map(function () { return el('div'); }), cB = sides.map(function () { return el('div'); });
    cA.forEach(function (c) { above.appendChild(c); }); cB.forEach(function (c) { below.appendChild(c); });
    var lastG = 0;
    pad.rows.forEach(function (r) {
      var col = sides.indexOf(r.s), isNew = fresh && fresh.indexOf(r) >= 0;
      var e = el('div', { class: 'bpad-e' + (isNew ? ' new' : '') }, [document.createTextNode(String(r.pts)), el('small', { text: r.why })]);
      if (r.a) cA[col].appendChild(e);
      else {
        // a game line across the pad after each finished game
        if (r.g > lastG) { for (; lastG < r.g; lastG++) cB.forEach(function (c) { c.appendChild(el('div', { class: 'bpad-gl', style: { width: '100%' } })); }); }
        cB[col].appendChild(e);
      }
    });
    for (; lastG < pad.g; lastG++) cB.forEach(function (c) { c.appendChild(el('div', { class: 'bpad-gl' + (fresh ? ' new' : ''), style: { width: '100%' } })); });
    node.appendChild(above); node.appendChild(el('div', { class: 'bpad-line' })); node.appendChild(below);
    var T = pad.tot, lead = T[0] === T[1] ? -1 : T[0] > T[1] ? 0 : 1;
    node.appendChild(el('div', { class: 'bpad-t' }, sides.map(function (t) { return el('div', null, [el('small', { text: 'TOTAL' }), el('b', { class: t === lead ? 'lead' : '', text: String(T[t]) })]); })));
    return node;
  }
  function padSheet() {
    Kit.sheet({ title: S.fmt === 'chicago' ? 'Score pad: Chicago' : 'Score pad: rubber', node: padNode(S.pad), actions: [{ label: 'Close', cls: 'btn-soft' }] });
  }
  function slipSheet() {
    var keep = slipPick; slipPick = -1;
    var host = el('div');
    var copy = D.slip.cloneNode(true);
    // a fresh, live copy (its own taps)
    var sl = el('div', { class: 'bslip' });
    host.appendChild(sl);
    var save0 = D.slip; D.slip = sl; paintSlip(); D.slip = save0;
    sl.addEventListener('click', function () { tw(function () { var s0 = D.slip; D.slip = sl; paintSlip(); D.slip = s0; }, 0); });
    Kit.sheet({ title: 'The auction', node: host, actions: [{ label: 'Close', cls: 'btn-soft' }] });
    slipPick = keep;
  }
  function diagram(dealt, dealer, vul, names) {
    var g = el('div', { class: 'bdg' });
    [[2, 'n'], [1, 'w'], [3, 'e'], [0, 's']].forEach(function (q) {
      var p = q[0], parts = String(dealt[p]).split('.'), h = el('div', { class: 'h ' + q[1] });
      h.appendChild(el('div', { class: 'who', html: SEATN[p] + ' <b>' + Kit.esc(first(names[p])) + '</b>' }));
      ['s', 'h', 'd', 'c'].forEach(function (s, i) { h.appendChild(el('div', { class: 'ln', html: '<i class="' + (s === 'h' || s === 'd' ? 'r' : '') + '">' + GL[s] + '</i>' + (parts[i] ? parts[i].replace(/T/g, '10').split('').join(' ').replace(/1 0/g, '10') : '—') })); });
      g.appendChild(h);
    });
    g.appendChild(el('div', { class: 'ctr', html: boardSvg(dealer, vul, '') }));
    return g;
  }
  function dealSheet() {
    var L = S.last, k = L.k, res = L.res, ds = k.decl % 2;
    var node = el('div', { class: 'bsum' });
    var good = onePerson() ? (res.made === (ds === weSide())) : res.made;
    var line = res.made ? (res.over ? 'made it with ' + res.over + ' over' : 'made it exactly') : 'went down ' + res.down;
    var cards = el('span', { class: 'cards', style: { display: 'flex' } }, [bidCard(k.lvl + E.STR[k.st])]);
    if (k.dbl) cards.appendChild(bidCard(k.dbl === 2 ? 'XX' : 'X'));
    node.appendChild(el('div', { class: 'res ' + (good ? 'good' : 'bad') }, [cards, el('div', { class: 'tx' }, [document.createTextNode(cap1(who(k.decl)) + ' ' + line + '.'), el('small', { text: L.took + ' tricks taken, ' + (6 + k.lvl) + ' needed' })])]));
    var rows = el('div', { class: 'rows' });
    L.rows.forEach(function (r) { rows.appendChild(el('div', null, [el('span', { text: r.why }), el('b', { text: (onePerson() ? (r.s === weSide() ? 'We score ' : 'They score ') : sideNames(r.s) + ' score ') + r.pts })])); });
    node.appendChild(rows);
    node.appendChild(padNode(S.pad, L.rows));
    var showD = el('button', { type: 'button', class: 'btn btn-soft btn-block', html: Kit.icon('eye') + '<span>See all four hands</span>' });
    showD.onclick = function () { showD.replaceWith(diagram(L.dealt, L.dealer, L.vul, S.players.map(function (p) { return p.name; }))); };
    node.appendChild(showD);
    var t = token;
    Kit.sheet({ title: 'Deal ' + L.n + (S.fmt === 'chicago' ? ' of 4' : ''), node: node, dismissible: false,
      actions: [{ label: 'Deal the next hand', primary: true, onClick: function () { if (t !== token) return; startDeal(S); afterDeal(); } }] });
  }
  function cap1(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  // ── The end of the game ──
  function recordGame(st, mode, netCode) {
    var T = st.pad.tot, w = T[0] === T[1] ? -1 : T[0] > T[1] ? 0 : 1;
    var names = st.players.map(function (p) { return p.name; });
    var sn = [names[0] + ' & ' + names[2], names[1] + ' & ' + names[3]];
    var hl = st.hl.slice(-10);
    hl.push(st.fmt === 'chicago' ? 'A Chicago of four deals' : 'A rubber, won ' + Math.max(st.pad.games[0], st.pad.games[1]) + ' games to ' + Math.min(st.pad.games[0], st.pad.games[1]));
    if (netCode) hl.push('Played online at table ' + netCode);
    Kit.record(HKEY, {
      started: st.started, mode: mode,
      players: [{ name: sn[0], score: T[0], cpu: st.players[0].cpu && st.players[2].cpu }, { name: sn[1], score: T[1], cpu: st.players[1].cpu && st.players[3].cpu }],
      winner: w >= 0 ? sn[w] : null,
      rounds: { labels: (st.rounds || []).map(function (r, i) { return 'D' + (i + 1); }), scores: st.rounds || [] },
      highlights: hl,
      detail: { names: names, fmt: st.fmt, hx: st.hx || [], rows: st.pad.rows.map(function (r) { return r.s + ':' + r.pts + ':' + r.a + ':' + r.g + ':' + r.d + ':' + r.why; }), games: st.pad.games.join('.') }
    });
  }
  function finish() {
    var T = S.pad.tot, w = S.winner, w0 = weSide();
    recordGame(S, S.mode === 'local' ? 'Pass & play' : 'vs Computer');
    var players = S.players, opts = { mode: S.mode, fmt: S.fmt, level: S.level, aids: S.aids };
    var mine = onePerson() && w === w0, lose = onePerson() ? w !== w0 && w >= 0 : false;
    var what = S.fmt === 'chicago' ? 'the Chicago' : 'the rubber';
    var title = w < 0 ? 'A tie' : mine ? 'You win ' + what + '!' : sideSay(w) + ' win ' + what;
    var fin = S;
    clearSave(); S = fin; S.phase = 'over';
    Kit.win({
      title: title,
      sub: w < 0 ? 'Both sides finished on ' + T[0] : 'By ' + Math.abs(T[0] - T[1]) + ' points · ' + (S.fmt === 'chicago' ? 'four deals' : 'won ' + Math.max(S.pad.games[0], S.pad.games[1]) + ' games to ' + Math.min(S.pad.games[0], S.pad.games[1])),
      rank: (w === 1 ? [1, 0] : [0, 1]).map(function (t) { return { name: sideNames(t), score: T[t], color: Kit.color(t), me: onePerson() && t === w0, cpu: S.players[t].cpu && S.players[t + 2].cpu }; }),
      lose: lose, icon: lose ? 'meh' : 'trophy',
      again: function () { S = fresh(players, opts); LME = 0; Kit.gameStart(); undoStack = []; startDeal(S); afterDeal(); },
      look: { label: 'Look at the score pad', onClick: function () { padSheet(); } },
      setup: function () { clearSave(); showSetup(); }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Online (turnnet.js)
  // ══════════════════════════════════════════════════════════════════════════
  // The table's state is the game in fixed seats 0 S, 1 W, 2 N, 3 E. Table seats fill people first, so the first
  // two people to sit are partners (table seats 0, 1 -> positions 0, 2). Each device draws the table turned so its
  // own seat is at the bottom, and shows only its own hand and the dummy.
  var PS = [0, 2, 1, 3];
  var NQ = [], NGEN = 0, NETREC = {}, NOVER = null, NST = null;
  function withS(st, f) { var keep = S; S = st; try { return f(); } finally { S = keep; } }
  function netOpts() {
    var o = {}; try { o = (JSON.parse(localStorage.getItem('gn_setup_bridge')) || {}).options || {}; } catch (e) {}
    return { fmt: o.fmt === 'rubber' ? 'rubber' : 'chicago', level: lvName(o.level), aids: +o.aids !== 0 };
  }
  function netStart(players, opts, last) {
    var pl = [0, 1, 2, 3].map(function (p) { var x = players[PS[p]] || { name: 'Robot', bot: true }; return { name: x.name, cpu: !!x.bot }; });
    var st = fresh(pl, { mode: 'online', fmt: opts.fmt, level: opts.level, aids: opts.aids });
    st.series = last && last.series ? last.series.slice() : [0, 0];
    startDeal(st);
    return st;
  }
  function netTurn(st) {
    if (!st || st.phase === 'over') return [];
    if (st.phase === 'bid') return [PS[st.turn]];
    var c = st.phase === 'play' && st.turn === st.dummy ? st.k.decl : st.turn;
    return [PS[c]];
  }
  function netOver(st) {
    if (!st || st.phase !== 'over') return null;
    var w = st.winner;
    if (w < 0) return { win: [], text: 'A tie at ' + st.pad.tot[0] };
    return { win: [PS[w], PS[w + 2]], text: st.players[w].name + ' & ' + st.players[w + 2].name + ' win ' + st.pad.tot[w] + ' to ' + st.pad.tot[1 - w] };
  }
  // after a deal is scored online the next one is dealt at once (each device shows the score first)
  function netAfter(st, mv) { if (mv && mv.end && st.phase === 'done') { startDeal(st); } }
  function netBot(st, seat) {
    var p = PS[seat], mv = null;
    withS(st, function () {
      if (st.phase === 'bid' && st.turn === p) { var c = E.chooseCall(st.hands[p], st.calls, st.dealer, lvOf(p)); mv = nCall(st, p, c.call, c.say); }
      else if (st.phase === 'play') {
        var q = st.turn, cc = q === st.dummy ? st.k.decl : q;
        if (cc === p) { var card = E.chooseCard(Gv(st), q, lvOf(p)); mv = nCard(st, q, card.id); }
      }
    });
    if (mv) netAfter(st, mv);
    return mv ? { state: st, mv: mv } : null;
  }
  function netAct(f) {
    var me = ME;
    NET.act(function (st) { var mv = withS(st, function () { return f(st, me); }); if (mv) netAfter(st, mv); return mv ? { state: st, mv: mv } : null; });
  }
  function netCall(c) {
    if (busy) return;
    if (!NET.myTurn()) { netNudge(); return; }
    netAct(function (st, me) { return nCall(st, me, c, ''); });
  }
  function netCard(p, c) {
    if (busy) return;
    if (!NET.myTurn()) { netNudge(); return; }
    var id = c.id;
    netAct(function (st, me) { var q = st.turn, cc = q === st.dummy && st.k ? st.k.decl : q; if (cc !== me || q !== p) return null; return nCard(st, q, id); });
  }
  function netNudge() {
    if (busy || !NET || !D) return;
    Kit.haptic('error');
    [D.cap].concat(D.seats.filter(function (s) { return s.classList.contains('turn'); })).forEach(function (e) { e.classList.remove('nudge'); void e.offsetWidth; e.classList.add('nudge'); });
  }
  function netView(st) {
    var V = JSON.parse(JSON.stringify(st)), seats = NET ? NET.seats : [];
    V.players = V.players.map(function (pl, p) { var s = seats[PS[p]]; return { name: pl.name, cpu: s ? !!s.bot : pl.cpu, away: !!(s && !s.bot && !s.me && s.away), level: pl.level }; });
    // only this device's own hand and the dummy (once it's down) are sent to the screen
    V.hands = V.hands.map(function (h, p) { return p === ME && NET && NET.seat >= 0 || V.phase === 'play' && p === V.dummy && V.shown ? h : h.map(function (c) { return { r: '', s: '', id: 'x' + p + Math.random().toString(36).slice(2, 7) }; }); });
    return V;
  }
  function netShow(net, info) {
    NET = net; ME = net.seat >= 0 ? PS[net.seat] : 0;
    if (info.fresh || info.again) { NQ = []; NGEN++; busy = false; netCloseOver(); }
    NQ.push({ st: JSON.parse(JSON.stringify(net.state)), prev: info.prev ? JSON.parse(JSON.stringify(info.prev)) : null, mv: info.mv, info: info });
    if (NQ.length > 8) NQ = NQ.slice(-1).map(function (x) { x.skip = true; return x; });
    if (!busy) netPump();
  }
  function netCloseOver() { if (NOVER) { var o = NOVER; NOVER = null; try { o.close(); } catch (e) {} } }
  function netPump() {
    var it = NQ.shift(); if (!it) return;
    var g = NGEN; busy = true;
    netStep(it, function () { if (g !== NGEN) return; busy = false; if (NQ.length) netPump(); else if (NET && S) { paint(); } });
  }
  function netStep(it, done) {
    var st = it.st, prev = it.prev, mv = it.mv, info = it.info, g = NGEN;
    function later(f, ms) { tw(function () { if (g === NGEN && NET) f(); }, ms); }
    NST = st; token++;
    if (!mv || !prev || info.fresh || info.again || it.skip) {
      S = netView(st); render();
      if (info.again) { Kit.gameStart(); Kit.sfx('deal'); Kit.callout('New game'); }
      else if (info.fresh) { Kit.gameStart(); if (st.phase !== 'over') Kit.sfx('deal'); }
      if (st.phase === 'over') later(netEnd, info.fresh ? 300 : 900);
      done(); return;
    }
    if (mv.k === 'call') {
      S = netView(st);
      if (mv.out) { render(); moment({ title: 'Passed out', line: 'Nobody bid, so the cards are dealt again.', tone: 'cool' }); dealAnim(); later(done, 1600); return; }
      if (st.phase === 'play' && prev.phase === 'bid') {
        // the auction is over: show the last call, then the table for the play
        var pv = netView(prev); pv.calls = st.calls; pv.why = st.why; S = pv; render(); callAnim(mv.p, mv.c);
        later(function () { S = netView(st); busy = false; relayout(true); paint(); if (st.k.lvl >= 6) { moment({ title: st.k.lvl === 7 ? 'A grand slam bid' : 'A slam bid', line: who(st.k.decl) + ' must take ' + (st.k.lvl + 6) + ' tricks.' }); Kit.sfx('boom'); } busy = true; later(done, 500); }, 700);
        return;
      }
      render(); callAnim(mv.p, mv.c);
      if (mv.p !== ME) {}
      if (NET.myTurn() && st.phase === 'bid') Kit.sfx('turn');
      later(done, 420); return;
    }
    if (mv.k === 'card') {
      // the table as it was, then this card applied to it (the next state may already be the next deal)
      var V = netView(prev);
      S = V; if (!D) render(); else paint();
      var fromEl = cardNode(mv.c) || seatTag(mv.p), fromRect = fromEl ? fromEl.getBoundingClientRect() : null;
      var hh = V.hands[mv.p], ix = -1; for (var j = 0; j < hh.length; j++) if (hh[j].id === mv.c.id) ix = j;
      hh.splice(ix >= 0 ? ix : hh.length - 1, 1);
      if (!V.shown) V.shown = true;
      if (mv.w == null) { V.trick.push({ p: mv.p, c: mv.c }); V.turn = (mv.p + 1) % 4; }
      else { var sd = mv.w % 2; V.won[sd]++; V.run[sd]++; V.run[1 - sd] = 0; V.tricks.push({ l: mv.trick[0].p, w: mv.w }); V.trick = []; V.turn = mv.w; }
      playAnim(mv, fromRect, function () {
        if (mv.end) { netDealEnd(st, done); return; }
        S = netView(st); paint();
        if (NET.myTurn()) Kit.sfx('turn');
        done();
      });
      return;
    }
    S = netView(st); render(); done();
  }
  function countWon(last, side) { var ds = last.k.decl % 2; return side === ds ? last.took : 13 - last.took; }
  function netDealEnd(st, done) {
    var g = NGEN;
    // replay the end-of-deal moments, then the score sheet; the next deal is already on the table behind it
    var L = st.last;
    S.last = L; S.pad = st.pad; S.phase = st.phase === 'over' ? 'over' : 'done';
    var seq = L.mom.filter(function (m) { return !m.quiet; });
    var res = L.res, ds = L.k.decl % 2;
    if (!seq.length) seq = [{ title: res.made ? (res.over ? 'Made with ' + res.over + ' over' : 'Made it exactly') : 'Down ' + res.down, line: E.contractText(L.k, true) + ' by ' + who(L.k.decl) + '.', side: res.made ? ds : 1 - ds }];
    var i = 0;
    (function step() {
      if (g !== NGEN || !NET) return;
      if (i >= seq.length) {
        if (st.phase === 'over') { S = netView(st); render(); netEnd(); done(); return; }
        var node = el('div');
        withS(Object.assign({}, S, { last: L, pad: st.pad }), function () {
          var tmpS = S; node.appendChild(padNode(st.pad, L.rows));
        });
        var shown = false;
        function deal() { if (shown || g !== NGEN || !NET) return; shown = true; S = netView(st); render(); dealAnim(); done(); }
        NOVER = Kit.sheet({ title: 'Deal ' + L.n + ': ' + E.contractText(L.k) + ' by ' + who(L.k.decl) + (res.made ? (res.over ? ', made with ' + res.over + ' over' : ', made') : ', down ' + res.down), node: node, onClose: function () { NOVER = null; deal(); }, actions: [{ label: 'Next deal', primary: true }] });
        return;
      }
      var m = seq[i++], ours = m.side === weSide(), sc = res.made ? ds : 1 - ds;
      moment({ title: m.title, line: m.line, tone: ours ? (m.big ? '' : 'cool') : 'cold', big: m.big, chip: i === 1 ? E.contractText(L.k) : '', pts: i === 1 && L.pts && L.pts[sc] ? '+' + L.pts[sc] : '' });
      if (m.big === 2) { Kit.confetti(); Kit.sfx('win'); } else Kit.sfx(ours ? 'good' : 'bad');
      tw(step, m.big ? 2400 : 1600);
    })();
  }
  function netEnd() {
    if (!NET || !NST || NST.phase !== 'over') return;
    var st = NST, w = st.winner, key = NET.code + ':' + st.started;
    var done = []; try { done = JSON.parse(localStorage.getItem('bridge_netrec')) || []; } catch (e) {}
    if (NET.seat >= 0 && !NETREC[key] && done.indexOf(key) < 0) {
      NETREC[key] = 1;
      try { localStorage.setItem('bridge_netrec', JSON.stringify(done.concat([key]).slice(-20))); } catch (e) {}
      withS(st, function () { recordGame(st, 'Online', NET.code); });
    }
    var V = netView(st), watching = NET.seat < 0, res = NET.result, left = res && res.left != null;
    var T = st.pad.tot, won = !watching && w === ME % 2;
    netCloseOver();
    S = V;
    NOVER = Kit.win({
      title: left ? res.text : w < 0 ? 'A tie' : won ? 'You win the ' + (st.fmt === 'chicago' ? 'Chicago' : 'rubber') + '!' : sideNames(w) + ' win',
      sub: w < 0 ? 'Both sides finished on ' + T[0] : 'By ' + Math.abs(T[0] - T[1]) + ' points' + (st.series[0] + st.series[1] > 1 ? ' · games ' + st.series[ME % 2] + '–' + st.series[1 - ME % 2] : ''),
      rank: (w === 1 ? [1, 0] : [0, 1]).map(function (t) { return { name: sideNames(t), score: T[t], color: Kit.color(t), me: !watching && t === ME % 2 }; }),
      lose: !won, icon: won ? 'trophy' : 'users',
      againLabel: left ? 'Back to the lobby' : 'Play again',
      again: function () { if (left) { TurnNet.leave(); TurnNet.open(); } else NET.again(); },
      look: { label: 'Look at the score pad', onClick: function () { padSheet(); } },
      closeLabel: 'Back to games'
    });
  }
  function netLeave() {
    NET = null; NST = null; NQ = []; NGEN++; busy = false; token++;
    netCloseOver(); D = null;
    resumeLocal(true);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function resumeLocal(back) {
    var saved = null; try { saved = JSON.parse(localStorage.getItem(SAVE)); } catch (e) {}
    if (saved && saved.players && saved.hands && saved.pad && saved.phase !== 'over') {
      S = saved; LME = S.me || 0; BLIND = false; Kit.gameStart(); S.started = S.started || Date.now();
      if (back) save();
      D = null; render();
      if (S.phase === 'done') tw(dealSheet, 300);
      else if (!person(LME) && S.mode === 'local') next(); else next();
    } else showSetup();
  }
  resumeLocal();
  TurnNet.setup({
    game: 'bridge', title: 'Bridge', min: 2, max: 4, botMs: FAST ? 150 : 1100,
    seats: function () { return 4; },
    opts: netOpts, start: netStart, turn: netTurn, over: netOver, bot: netBot,
    show: netShow, leave: netLeave
  });
  // for tests: a peek at the state
  window.__bridge = { S: function () { return S; }, E: E, relayout: relayout, D: function () { return D; }, go: function () { next(); },
    // tests: deal until the robots' auction ends with the wanted declarer (o.decl, a seat) and level, play o.cards cards, draw it
    setup: function (o) {
      o = o || {}; if (!S) return false;
      for (var tries = 0; tries < 400; tries++) {
        var keep = JSON.parse(JSON.stringify(S));
        keep.dealNo = Math.max(0, (o.dealNo || 1) - 1); startDeal(keep);
        if (o.bid) { S = keep; break; }
        while (keep.phase === 'bid') { var p = keep.turn, c = E.chooseCall(keep.hands[p], keep.calls, keep.dealer, 'hard'); nCall(keep, p, c.call, c.say); if (keep.phase === 'bid' && keep.calls.length === 0) break; }
        if (keep.phase !== 'play') continue;
        if (o.decl != null && keep.k.decl !== o.decl) continue;
        if (o.slam && keep.k.lvl < 6) continue;
        for (var i = 0; i < (o.cards || 0) && keep.phase === 'play'; i++) { var q = keep.turn; nCard(keep, q, E.chooseCard(Gv(keep), q, 'normal').id); }
        S = keep; break;
      }
      token++; busy = false; BLIND = false; LME = 0; D = null; render(); save(); if (!o.stop) next(); return { decl: S.k && S.k.decl, k: S.k && E.contractText(S.k) };
    } };
})();
