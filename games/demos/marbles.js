// Marbles' demo (demo.js; CLAUDE.md, Demos): the card game against Bender on the cross board. A King brings a marble out;
// later you land exactly on Bender's marble with a 5 and send it back to its base, and a 3 takes your last marble home.
(function () {
  'use strict';
  var M = window.__marbles;
  function S() { return M.state(); }
  var used = {};
  // a card of the deck by rank and suit, each only once
  function card(r, s) {
    var st = S(), all = st.deck.concat.apply(st.deck, st.hands).concat(st.pile.map(function (x) { return x.c; }));
    var c = all.filter(function (x) { return x.r === r && x.s === s && !used[x.id]; })[0]; used[c.id] = 1; return c;
  }
  function hand(c) { return function () { return document.querySelector('.chand .pcard[data-id="' + c.id + '"]'); }; }
  function marble(pi, mi) { return function () { return document.querySelector('.board .mb[data-k="' + pi + ':' + mi + '"]'); }; }
  function marbles(pi) { return function () { return [0, 1, 2, 3].map(function (mi) { return marble(pi, mi)(); }); }; }
  function target() { return document.querySelector('.board .tgt'); }
  function myTurn() { var s = S(); return s && s.phase === 'play' && s.cur === 0 && !M.lock(); }
  function turns() { var s = S(); return s ? s.turns : 0; }
  // set the hands (and the deck from what is left), then draw the table again
  function deal(mine, bender, pos) {
    var s = S();
    var all = s.deck.concat.apply(s.deck, s.hands).concat(s.pile.map(function (x) { return x.c; }));
    s.hands = [mine, bender];
    var held = {}; mine.concat(bender).forEach(function (c) { held[c.id] = 1; });
    s.deck = all.filter(function (c) { return !held[c.id]; });
    for (var i = s.deck.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = s.deck[i]; s.deck[i] = s.deck[j]; s.deck[j] = t; }
    s.pile = []; s.lastCard = [null, null]; s.pend = null; s.cur = 0; s.viewer = 0; s.phase = 'play'; s.line = '';
    if (pos) pos.forEach(function (m, pi) { s.players[pi].m = m.slice(); });
    M.load(s);
  }
  var KING, FIVE, THREE;

  Kit.demoScript({
    intro: 'Here’s how the card game of Marbles goes. You’ll send Bender’s marble home and bring your last marble in.',
    beats: 11,
    end: 'Play a card to move a marble, land on other marbles to send them home, and bring all four of yours into your home row first.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      M.start({ mode: 'cpu', rules: 'cards', king: '13', jokers: 'on', deal: '5', teams: false,
        players: [{ name: me, color: Kit.color(0) }, { name: 'Bender', cpu: true, level: 'normal', color: Kit.color(1) }] });
      KING = card('K', 's');
      deal([KING, card('8', 'c'), card('9', 'd'), card('Q', 'h'), card('10', 's')], [card('A', 'h'), card('2', 'c'), card('6', 'd'), card('10', 'h'), card('J', 'c')]);
    },
    steps: async function (D) {
      await D.say('You and Bender each have four marbles in a base. The race is to move all four around the board and into your home row.', { at: marbles(0) });
      await D.say('You move by playing cards. Only an Ace, a King or a Joker can bring a marble out of the base.', { at: hand(KING) });
      await D.tap(hand(KING), { after: 500 });
      await D.say('The marbles that can move with the King glow. Tap one, and it comes out onto your start hole.', { at: marbles(0) });
      await D.tap(marble(0, 0), { after: 300 });
      await D.wait(function () { return S().cur === 1; }, 4000);
      await D.wait(function () { return myTurn(); }, 9000);
      await D.wait(600);
      var line = S().line;
      await D.say(line ? line + '.' : 'Then Bender takes a turn.', { at: function () { var l = S().last; return l ? marble(l.o, l.mi)() : null; } });
      // later in the game: three of your marbles are home, and Bender's marble is five holes ahead of your last one
      await D.set(function () {
        FIVE = card('5', 'h'); THREE = card('3', 's');
        deal([FIVE, THREE, card('Q', 'c')], [card('9', 's'), card('6', 'c')], [[48, 57, 58, 59], [25, 56, -1, -1]]);
      });
      await D.say('Now we skip ahead. Three of your marbles are home, and your last one is coming around the board.', { pos: 'center', ring: false, wait: 2800 });
      await D.say('Most cards move a marble forward that many holes. Land exactly on another player’s marble and it goes back to its base.', { at: function () { return [marble(0, 0)(), marble(1, 0)()]; } });
      var t0 = turns();
      await D.you(hand(FIVE), 'Bender’s marble is five holes ahead of yours. Tap your 5.', { until: function () { return !!target(); } });
      await D.you(target, 'Now tap the glowing hole where your marble lands.', { allow: [target, '.board .layer'], until: function () { return turns() > t0; } });
      await D.wait(1500);
      await D.say('Your marble landed on Bender’s, so it went back to Bender’s base.', { at: marble(1, 0) });
      await D.wait(function () { return myTurn(); }, 9000);
      await D.wait(500);
      await D.say('You need the exact count to move into your home row. A 3 takes your last marble into the last open hole.', { at: hand(THREE) });
      await D.tap(hand(THREE), { after: 500 });
      if (target()) await D.tap(target, { after: 300 });
      else await D.tap(marble(0, 0), { after: 300 });
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 8000);
      await D.wait(700);
      await D.say('All four of your marbles are home, so you win!', { at: '.k-win h2', pos: 'above' });
    }
  });
})();
