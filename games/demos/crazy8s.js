// Crazy Eights' demo (demo.js; CLAUDE.md, Demos): the end of a hand against two computer players. A 7 matched by rank, a
// king matched by suit, EVE drawing until she can play, your 8 naming spades, and you going out on your last card.
(function () {
  'use strict';
  var X = window.__c8, Core = X.core;
  function S() { return X.S; }
  function hand(c) { return function () { return document.querySelector('.c8h .pcard[data-id="' + c + '"]'); }; }
  function seat(p) { return function () { return document.querySelectorAll('.c8 .felt-in > .st')[p - 1]; }; }
  function pile() { return document.querySelector('.c8 .pile'); }
  function topCard() { return document.querySelector('.c8 .pile .pcard.top') || pile(); }
  function myTurn() { var s = S(); return s && !X.busy && !X.view && Core.turn(s) === 0; }
  function played(c) { return S().disc.indexOf(c) >= 0; }

  Kit.demoScript({
    intro: 'Here’s the end of a hand of Crazy Eights. You’ll play a wild 8 and go out yourself.',
    beats: 11,
    end: 'Match the suit or the rank of the top card, save your 8s for when nothing else will do, and be the first to play every card.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      var s = Core.newGame({ players: [{ name: me }, { name: 'Bender', cpu: true, level: 'normal' }, { name: 'EVE', cpu: true, level: 'normal' }], target: 100, level: 'normal' });
      var hands = [['7c', '8d', '4s'], ['Kc', '3d', '5h', 'Jh', '2h'], ['6d', 'Jd', '7d', 'Ad', '3h']];
      // what comes off the stock, in order: two for EVE, two for Bender, two for EVE
      var draws = ['2d', '5c', '9c', 'Ts', '6c', '3s'];
      var used = {}; hands.forEach(function (h) { h.forEach(function (c) { used[c] = 1; }); }); draws.forEach(function (c) { used[c] = 1; }); used['7h'] = 1;
      var rest = []; Core.SUITS.forEach(function (su) { Core.RANKS.forEach(function (r) { if (!used[r + su]) rest.push(r + su); }); });
      for (var i = rest.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
      s.hands = hands; s.deck = rest.concat(draws.slice().reverse()); s.disc = ['7h']; s.suit = 'h';
      s.dealer = 2; s.turn = 0; s.pend = 0; s.run = 0; s.drew = 0; s.dId = null; s.stuck = 0;
      s.plays = [0, 0, 0]; s.draws = [0, 0, 0]; s.vd = ['', '', '']; s.played = { s: 0, h: 1, d: 0, c: 0 };
      s.mode = 'cpu'; s.me = 0; s.seen = s.round;
      X.S = s; X.paint(); X.next();
    },
    steps: async function (D) {
      await D.wait(600);
      await D.say('This is the discard pile. On your turn, you play a card that matches the top card’s suit or its rank.', { at: pile });
      await D.say('The top card is the 7 of Hearts. Your 7 of Clubs matches its rank.', { at: hand('7c') });
      await D.tap(hand('7c'));
      await D.wait(function () { return played('Kc'); }, 8000);
      await D.wait(500);
      await D.say('Bender matched the suit with the King of Clubs.', { at: topCard, wait: 2600 });
      await D.wait(function () { return S().hands[2].length > 5; }, 8000);
      await D.say('EVE has no club and no king, so she draws from the stock until she gets a card she can play.', { at: seat(2), avoid: [pile] });
      await D.wait(myTurn, 9000);
      await D.say('Now the top card is the 5 of Clubs, and you have no club or 5. But 8s are wild, so an 8 can go on anything.', { at: hand('8d'), avoid: [topCard] });
      await D.you(hand('8d'), 'Tap your 8 of Diamonds.', { until: function () { return !!document.querySelector('.c8 .pick'); } });
      await D.wait(400);
      await D.you('.c8 .pick button[aria-label="Spades"]', 'Name the suit the next player has to follow. Choose spades, because your last card is a spade.', {
        avoid: ['.c8 .pick .g'], until: function () { return !document.querySelector('.c8 .pick'); }
      });
      await D.wait(function () { return played('Ts'); }, 9000);
      await D.say('You’re down to your last card. Bender had no spade, so he drew until he found the 10 of Spades.', { at: seat(1), avoid: [pile] });
      await D.wait(myTurn, 12000);
      await D.say('EVE drew too, and played the 3 of Spades.', { at: topCard, wait: 2600 });
      await D.you(hand('4s'), 'Play your 4 of Spades to go out.', { until: function () { return S().hands[0].length === 0 || S().round > 1; } });
      await D.wait(function () { return document.querySelector('.k-sheet .cnt8'); }, 12000);
      await D.wait(2600);
      await D.say('You went out first, so you score the cards left in the other hands. The first to 100 points wins the game.', { at: '.k-sheet .cnt8 .r.w' });
    }
  });
})();
