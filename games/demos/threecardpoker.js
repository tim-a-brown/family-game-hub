// Three Card Poker's demo (demo.js; CLAUDE.md, Demos): an Ante and a Pair Plus bet, a pair of Kings that you play and win
// with (Pair Plus pays too), then a weak hand that you fold.
(function () {
  'use strict';
  var T = window.__tcp;
  function S() { return T.state(); }
  function spot(k) { return '.spot[data-k="' + k + '"]'; }
  function chip(v) { return '.cz-slot[data-v="' + v + '"]'; }
  var main = '.acts .btn-primary.main', soft = '.acts .btn-soft';
  var you = function () { return document.querySelector('.zone.you') || document.querySelector('.spots'); };
  function ph(p) { return function () { return S() && S().phase === p && !T.busy(); }; }
  var status = function () { return document.querySelector('.status') || document.querySelector('.spots'); };

  Kit.demoScript({
    intro: 'Here’s how Three Card Poker goes. You’ll decide to play a hand yourself.',
    beats: 12,
    end: 'Ante up, look at your three cards, and play the good hands. Queen-6-4 or better is worth playing; fold the rest.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      // (the bank lives in memory during a demo; a low one is topped up so the bets fit)
      if ((parseInt(localStorage.getItem('casino_bank'), 10) || 0) < 100) localStorage.setItem('casino_bank', '1000');
      T.start(me);
      T.next(['Ks', '4c', 'Kd'], ['Qh', '9c', '3d']);
    },
    steps: async function (D) {
      await D.say('In Three Card Poker, you and the dealer each get three cards, and your hand plays against the dealer’s.', { at: '.ctable' });
      await D.say('You start with a bet on the Ante. Each chip you tap goes there.', { at: spot('ante') });
      await D.tap(chip(5), { after: 300 });
      await D.tap(chip(5), { after: 500 });
      await D.you(spot('pp'), 'Pair Plus is a side bet that pays if your cards have a pair or better. Tap it, and a $5 chip goes there.', { until: function () { return S().target === 'pp'; } });
      await D.tap(chip(5), { after: 600 });
      await D.tap(main, { say: 'Now deal the cards.' });
      await D.wait(ph('decide'), 6000);
      await D.wait(600);
      await D.say('You have a pair of Kings. That’s a strong hand in three cards.', { at: you });
      await D.you(main, 'To keep playing, you put a Play bet down the same size as your Ante. Tap Play $10.', { until: function () { return S().phase !== 'decide'; } });
      await D.wait(ph('result'), 8000);
      await D.wait(800);
      await D.say('The dealer needs a Queen high or better to qualify, and has a Queen. Your Kings beat it, so the Ante and Play bets each pay 1 to 1.', { at: status });
      await D.say('And Pair Plus pays 1 to 1 for a pair, whatever the dealer has.', { at: spot('pp') });
      T.next(['8c', '2h', '5d'], ['Ah', 'Kc', '7s']);
      await D.tap(main, { say: 'Same bet deals the next hand with the same chips.' });
      await D.wait(ph('decide'), 6000);
      await D.wait(600);
      await D.say('8-5-2 is a weak hand. The usual advice is to play Queen-6-4 or better, and fold anything lower.', { at: you });
      await D.tap(soft, { say: 'Fold gives up the Ante and Pair Plus, but saves the Play bet.' });
      await D.wait(ph('result'), 8000);
      await D.wait(800);
      await D.say('The dealer had Ace-King, so folding saved you $10.', { at: status });
    }
  });
})();
