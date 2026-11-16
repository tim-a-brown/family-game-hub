// Blackjack's demo (demo.js; CLAUDE.md, Demos): three hands against the dealer from a stacked shoe. You bet with chips,
// hit a 9 up to 19 and stand; then double down on 11 and the dealer busts; then you're dealt a blackjack, paid 3 to 2.
(function () {
  'use strict';
  var B = window.__bj;
  function S() { return B.state(); }
  var seat = '.bjfelt .seat[data-seat="0"]';
  function hand() { return document.querySelector(seat + ' .hand') || document.querySelector(seat); }
  function act(a) { return '.ctrl [data-a="' + a + '"]'; }
  function chip(v) { return '.ctrl .cz-slot[data-v="' + v + '"]'; }
  var deal = '.ctrl .btn-primary';
  function phase(p) { return function () { return S() && S().phase === p; }; }
  function msg() { return document.querySelector('.bjmsg') || document.querySelector('.bjfelt .dealer'); }

  Kit.demoScript({
    intro: 'Here’s how a few hands of Blackjack go. You’ll hit, stand and double yourself.',
    beats: 14,
    end: 'Take cards until you’re happy with your total, without going over 21, and double down when one more card could win it.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      // (the bank lives in memory during a demo; a low one is topped up so the bets fit)
      if ((parseInt(localStorage.getItem('casino_bank'), 10) || 0) < 400) localStorage.setItem('casino_bank', '1000');
      B.start([{ name: me }], { decks: 6, soft17: 's17', surr: 'off', coach: 'off' });
    },
    steps: async function (D) {
      await D.say('You play against the dealer. The goal is to finish closer to 21 than the dealer, without going over.', { at: '.bjfelt .dealer', avoid: ['.ctrl'] });
      await D.say('First you bet. Each chip you tap goes into your betting circle.', { at: '.ctrl .rack' });
      await D.tap(chip(25), { after: 300 });
      await D.tap(chip(25), { after: 500 });
      // hand 1: a 9 against the dealer's 10, hit to 19 and stand; the dealer turns over a 7 and stands on 17
      B.stack(['5h', '10s', '4c', '7d', 'Kh']);
      await D.tap(deal, { say: 'That’s a bet of $50. Deal sends out the cards.' });
      await D.wait(phase('play'), 6000);
      await D.wait(500);
      await D.say('Cards count their number, picture cards count 10, and an Ace counts 1 or 11. You have 9, and the dealer shows a 10.', { at: hand, avoid: ['.ctrl .acts'] });
      await D.you(act('H'), 'A 9 can’t go over 21 with one more card. Tap Hit to take a card.', { until: function () { var h = S().hands[0]; return h && h.cards.length > 2; } });
      await D.wait(700);
      await D.you(act('S'), 'A King makes 19, which is a strong total. Tap Stand to keep it.', { until: function () { return S().phase !== 'play'; } });
      await D.wait(phase('done'), 8000);
      await D.wait(400);
      await D.say('The dealer turned over a 7 for 17. The dealer must stand on 17 or more, so your 19 wins $50.', { at: msg });
      // hand 2: 11 against a 6, doubled to 21; the dealer has 16, has to hit, and busts
      B.stack(['6c', '6d', '5s', '10h', '10d', '8s']);
      await D.tap(deal, { say: 'Rebet puts the same $50 down and deals the next hand.' });
      await D.wait(phase('play'), 6000);
      await D.wait(500);
      await D.say('You have 11 against the dealer’s 6. That’s a good time to double down.', { at: hand, avoid: ['.ctrl .acts'] });
      await D.tap(act('D'), { say: 'Double doubles your bet to $100, and you get exactly one more card.' });
      await D.wait(phase('dealer'), 5000);
      await D.say('A 10 makes 21! Now the dealer plays.', { at: hand, wait: 2000 });
      await D.wait(phase('done'), 8000);
      await D.wait(400);
      await D.say('The dealer had 16, has to hit below 17, and drew an 8 to go over 21. That’s a bust, and your $100 wins.', { at: msg });
      // hand 3: a blackjack
      B.stack(['As', '8h', 'Kc', '9d']);
      var r3 = S().round + 1;
      await D.tap(deal);
      await D.wait(function () { return S().round === r3 && S().phase === 'done'; }, 9000);
      await D.wait(700);
      await D.say('An Ace and a King as your first two cards are a blackjack. It pays 3 to 2, so your $50 bet wins $75.', { at: hand, avoid: ['.ctrl .acts'] });
      await D.say('Your bank goes up and down with every hand, and it’s the same bank in all of the casino games.', { at: '.ctrl .st .bank, .ctrl .st' });
    }
  });
})();
