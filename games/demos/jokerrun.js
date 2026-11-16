// Balatro's demo (demo.js; CLAUDE.md, Demos; the game's files say jokerrun): the first blind of a run. You select the
// Small Blind, throw away three cards that don't help, then pick and play a Full House, which the Joker's Mult carries
// past the blind's target; then the blind pays out.
(function () {
  'use strict';
  var J = window.JR, E = J.E;
  function S() { return E.S; }
  function idOf(code) { var r = code.slice(0, -1), s = code.slice(-1), c = Object.keys(S().cards).map(function (k) { return S().cards[k]; }).filter(function (c) { return c.r === r && c.s === s; })[0]; return c && c.id; }
  function card(code) { return function () { var id = idOf(code); return id && document.querySelector('.hnd .cd[data-id="' + id + '"]'); }; }
  function cards(list) { return function () { return list.map(function (c) { return card(c)(); }).filter(Boolean); }; }
  function picked() { return [].slice.call(document.querySelectorAll('.hnd .cd.sel')).map(function (n) { return n.dataset.id; }); }
  var HAND = ['8h', '8s', 'Kd', 'Ks', '2c', '5d', 'Jh', '3s'], DRAW = ['8c', 'Qc', '4h'], FULL = ['8h', '8s', '8c', 'Kd', 'Ks'];

  Kit.demoScript({
    intro: 'Here’s the first blind of a run. You’ll pick a poker hand and play it.',
    beats: 12,
    end: 'Play poker hands to beat each blind’s target, and collect Jokers in the shop to make your hands score bigger. Clear eight antes to win the run.',
    start: async function (D) {
      // (the page boots once its art is ready: wait for its setup, then start the run over it)
      await D.wait(function () { return document.querySelector('#app .k-start, #app .k-startdock'); }, 6000);
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      E.newRun(me, 'red', 20261116);
      E.addJoker('grin');
      Kit.gameStart(); J.save(); J.render();
    },
    steps: async function (D) {
      await D.say('A run is made of antes, and each ante has three blinds. To beat a blind, you score at least its target in chips.', { at: function () { return D.qa('.bls .blc'); } });
      await D.you('.blc.cur .bb.go', 'Tap Select to play the Small Blind, which needs 300.', { until: function () { return S().phase === 'play'; } });
      await D.wait(300);
      await D.set(function () {
        var s = S(), hand = HAND.map(idOf), draw = DRAW.map(idOf);
        s.draw = s.draw.concat(s.hand).filter(function (id) { return hand.indexOf(id) < 0 && draw.indexOf(id) < 0; }).concat(draw.slice().reverse());
        s.hand = hand; s.fresh = hand.slice(); E.sortHand();
        J.save(); J.render();
      });
      await D.wait(900);
      await D.say('You hold eight cards, and you can play up to five of them as a poker hand. You get four hands to reach the target.', { at: '.hnd .hand' });
      await D.say('Your Joker, Jester’s Grin, adds 4 Mult to every hand you play.', { at: '.top .slot' });
      await D.say('The 2, 3 and 5 don’t help, so throw them away. You get three discards a round, and each one draws new cards.', { at: cards(['5d', '3s', '2c']) });
      await D.tap(card('5d'), { after: 160 });
      await D.tap(card('3s'), { after: 160 });
      await D.tap(card('2c'), { after: 260 });
      await D.tap('.acts .bb.red.big');
      await D.wait(1100);
      await D.say('The 8 of Clubs came in, so now you have three 8s and two Kings.', { at: card('8c') });
      await D.you('.hnd .hand', 'Tap the three 8s and the two Kings.', {
        allow: FULL.map(card), until: function () { var p = picked(); return FULL.every(function (c) { return p.indexOf(idOf(c)) >= 0; }); },
        autoTap: function () { var p = picked(), c = FULL.filter(function (x) { return p.indexOf(idOf(x)) < 0; })[0]; return c ? card(c)() : null; }
      });
      await D.say('That’s a Full House, which starts at 40 Chips and 4 Mult. Your score for a hand is its Chips times its Mult.', { at: '.sb-hand' });
      await D.you('.acts .bb.blue.big', 'Tap Play Hand.', { until: function () { return S().handsPlayedRound > 0; } });
      await D.say('Watch the hand score. Each card adds its chips, and then the Joker adds its Mult.', { at: '.side .sb-hand', wait: false });
      await D.wait(function () { return document.querySelector('.cash'); }, 20000);
      await D.wait(700);
      await D.say('Your Full House scored 84 Chips times 8 Mult, which is 672, so the Small Blind is beaten. Beating a blind pays money.', { at: '.cash' });
      await D.tap('.cash .bb.big');
      await D.wait(function () { return document.querySelector('.shop .shelf'); }, 6000);
      await D.wait(500);
      await D.say('In the shop you spend it on more Jokers, which make your hands score bigger as the targets grow.', { at: '.shop .shelf' });
    }
  });
})();
