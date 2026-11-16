// Cribbage's demo (demo.js; CLAUDE.md, Demos): the first hand against Bender, with you dealing. You throw two cards to
// your crib, then in the play you make fifteen and then thirty-one, the pegs moving on the board, and your hand of
// 4, 5, 5, 6 with a 5 cut counts 23.
(function () {
  'use strict';
  var X = window.__crib, DECK = Cards.deck();
  function card(code) { var s = code.slice(-1), r = code.slice(0, -1); return DECK.filter(function (c) { return c.r === r && c.s === s; })[0]; }
  function id(code) { return card(code).id; }
  function mine(code) { return function () { return document.querySelector('.chand .pcard[data-id="' + id(code) + '"]'); }; }
  function S() { return X.state(); }
  function P() { return S().peg; }
  function myPeg() { var s = S(); return s.phase === 'peg' && P().turn === 0 && !P().reset && document.querySelector('.chand .pcard.play'); }
  function count() { return document.querySelector('.ctable .pile .count'); }
  function pile() { return document.querySelectorAll('.ctable .pile .row .pcard'); }
  var NAME = { K: 'King', Q: 'Queen', J: 'Jack', '10': '10' };
  var KEEP = ['4c', '5h', '5c', '6d'], TOSS = ['Kd', '9s'];

  Kit.demoScript({
    intro: 'Here’s how a hand of Cribbage goes. You’ll build your crib and peg to fifteen and thirty-one.',
    beats: 14,
    end: 'Throw two cards to the crib, peg points in the play by making 15, 31, pairs and runs, then count your hand. The first to 121 wins.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.start([{ name: me }, { name: 'Bender', cpu: true, level: 'normal' }], 0, function (s) {
        var used = KEEP.concat(TOSS, ['Kc', 'Qs', 'Jc', '10h', '2h', '8c', '5s']), rest = [];
        DECK.forEach(function (c) { if (used.indexOf(c.r + c.s) < 0) rest.push(c); });
        s.hands = [KEEP.concat(TOSS).map(card), ['Kc', 'Qs', 'Jc', '10h', '2h', '8c'].map(card)];
        s.keep = [null, ['10h', 'Jc', 'Qs', 'Kc'].map(card)]; s.tossed = [[], ['2h', '8c'].map(card)]; s.crib = s.tossed[1].slice();
        s.deck = rest.concat([card('5s')]); s.sel = [];
      }, card('5s'));
    },
    steps: async function (D) {
      await D.wait(function () { return document.querySelector('.chand .pcard.play'); }, 6000);
      await D.say('This is the cribbage board. Every point you score moves your peg along it, and the first to 121 wins.', { at: '.cboard' });
      await D.say('You’re the dealer this hand, so the crib is yours. Each of you throws two cards into it, and you’ll count it at the end.', { at: '.ctable .crib' });
      await D.you('.chand', 'Keep your 4, 5, 5 and 6, which go well together. Tap the King of Diamonds and the 9 of Spades to throw them in.', {
        allow: TOSS.map(mine), pos: 'above',
        until: function () { return (S().sel || []).length === 2 && TOSS.every(function (c) { return S().sel.indexOf(id(c)) >= 0; }); },
        autoTap: function () { var c = TOSS.filter(function (x) { return S().sel.indexOf(id(x)) < 0; })[0]; return c ? mine(c)() : null; }
      });
      await D.tap('.cbar .btn-primary');
      await D.wait(function () { return S().phase === 'peg'; }, 9000);
      await D.wait(700);
      await D.say('Bender cut the deck, and the starter is the 5 of Spades. It counts as part of everyone’s hand.', { at: '.ctable .deck' });
      await D.wait(function () { return myPeg(); }, 9000);
      await D.say('Now the play. You take turns laying cards and saying the count. ' + (P().pile[0].c.r === '10' ? 'Bender led a 10.' : 'Bender led the ' + NAME[P().pile[0].c.r] + ', and every face card counts 10.'), { at: count });
      await D.you(mine('5h'), 'Make the count exactly 15 and you score 2. Tap your 5 of Hearts.', { until: function () { return P().count >= 15; } });
      await D.wait(900);
      await D.say('Fifteen for 2! Your peg moves two holes on the board.', { at: '.cboard', wait: 2600 });
      await D.wait(function () { return myPeg(); }, 9000);
      await D.say('Bender made it 25. Reaching exactly 31 also scores 2.', { at: count, wait: 2400 });
      await D.you(mine('6d'), 'Tap your 6 of Diamonds for 31.', { until: function () { return P().count === 31 || P().reset; } });
      await D.wait(1300);
      await D.say('Thirty-one for 2! The count starts again from zero.', { at: '.cboard', wait: 2600 });
      await D.wait(function () { return myPeg(); }, 9000);
      await D.tap(mine('5c'), { say: 'Another 10 and your other 5 make fifteen again.' });
      await D.wait(function () { return myPeg() || S().phase !== 'peg'; }, 9000);
      if (S().phase === 'peg') await D.tap(mine('4c'));
      await D.wait(function () { return S().phase === 'show' && S().showStep >= 0; }, 12000);
      await D.wait(500);
      await D.say('When the cards are played out, each hand is counted with the starter. Bender’s goes first, then yours.', { at: '.showv .slip', pos: 'below' });
      await D.tap('.cbar .btn-primary');
      await D.wait(function () { return S().showStep >= 1; }, 6000);
      await D.wait(600);
      await D.say('Your 4, 5, 5 and 6 with the 5 cut make four fifteens, three 5s for a pair royal, and three runs of 4, 5, 6.', { at: '.showv .cards', avoid: ['.k-mo'] });
      await D.say('That hand is worth 23 points, and your peg races up the board.', { at: '.showv .slip .tot', avoid: ['.k-mo'] });
    }
  });
})();
