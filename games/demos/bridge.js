// Bridge's demo (demo.js; CLAUDE.md, Demos): one deal with EVE as your partner (North). You open 1 Spade with the
// light bulb's help, EVE makes a limit raise and you bid game, 4 Spades. West leads, EVE's hand goes down as the dummy,
// and you play a card from it; then the demo skips to the last trick and the score.
(function () {
  'use strict';
  var B = window.__bridge, E = B.E;
  var DEAL = ['AKQ75.K4.AK83.96', '92.QJT8.QJT9.A83', 'JT83.A95.64.KQJ4', '64.7632.752.T752'];
  function S() { return B.S(); }
  function seat(p) { return function () { return document.querySelectorAll('.bx-felt .bs')[p]; }; }
  function myCall() { var s = S(); return s && s.phase === 'bid' && s.turn === 0 && document.querySelector('.bbox .hintb:not([disabled])'); }
  function myCard() { var s = S(); return s && s.phase === 'play' && s.trick.length < 4 && (s.turn === 0 || s.turn === 2) && document.querySelector('.bx .pcard.play'); }
  function dummyCard() { return document.querySelector('.bx .bd .pcard.play'); }
  function slip() { return document.querySelector('.bx .bslip'); }

  Kit.demoScript({
    intro: 'Here’s how a deal of Bridge goes. You’ll open the bidding and play a card from the dummy.',
    beats: 12,
    end: 'Bid with your partner to a contract you can make, then take the tricks you promised. Bid and make a game for the big points.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      B.start({ players: [{ name: me }, { name: 'Bender', cpu: true }, { name: 'EVE', cpu: true }, { name: 'Johnny 5', cpu: true }], level: 'normal' }, DEAL, 0);
    },
    steps: async function (D) {
      await D.wait(myCall, 8000);
      await D.wait(300);
      await D.say('You sit South. EVE, across the table, is your partner, and Bender and Johnny 5 play against you.', { at: seat(2) });
      await D.say('Your hand has 19 high-card points: 4 for an ace, 3 for a king, 2 for a queen and 1 for a jack.', { at: '.bx .bh-hcp' });
      await D.say('First comes the auction. A bid says how many tricks over six your side will take, and which suit will be trump.', { at: '.bx .bbox' });
      await D.tap('.bbox .hintb');
      await D.wait(500);
      await D.you('.bbox .stb.sug', 'The light bulb suggests a bid and says what it means. With 19 points and five spades, you open the bidding: tap 1 Spade.', { until: function () { return S().calls.length > 0; }, avoid: ['.bx .ba-cap'] });
      await D.wait(function () { return myCall(); }, 12000);
      await D.wait(300);
      await D.say('EVE bid 3 Spades. That shows four spades and 10 to 12 points, and asks you to go on to game if you have more than a minimum.', { at: slip });
      await D.tap('.bbox .hintb');
      await D.wait(400);
      await D.tap('.bbox .stb.sug', { say: 'You do, so you bid 4 Spades, a game.' });
      await D.wait(function () { return S().phase === 'play' && S().shown; }, 15000);
      await D.wait(900);
      await D.say('Everyone passed, so the contract is 4 Spades. Spades are trump, and you need 10 of the 13 tricks.', { at: '.bx .bk' });
      await D.say('Bender made the opening lead, and EVE’s hand went face up. EVE is the dummy, and you play her cards as well as your own.', { at: '.bx .bd' });
      await D.wait(function () { return S().turn === 2 && dummyCard(); }, 9000);
      await D.you(dummyCard, 'Play a card from the dummy. You have to follow suit when you can, and the highest card of the suit led wins unless someone plays a trump.', { allow: ['.bx .bd .pcard.play'], until: function () { return S().trick.length !== 1; } });
      await D.wait(function () { return S().tricks.length >= 1 || myCard(); }, 9000);
      if (S().tricks.length < 1) { await D.wait(600); await D.tap(myCard); }
      await D.wait(function () { return S().tricks.length >= 1; }, 9000);
      await D.wait(600);
      await D.set(function () { B.playTo(12); });
      await D.say('Now we skip ahead to the last trick.', { pos: 'center', wait: 2000 });
      await D.wait(function () { return myCard() || S().phase !== 'play'; }, 9000);
      if (S().phase === 'play') await D.tap(myCard);
      await D.wait(function () { return S().phase === 'play' && myCard(); }, 4000);
      if (S().phase === 'play' && myCard()) await D.tap(myCard);
      await D.wait(function () { return document.querySelector('.k-sheet .bsum'); }, 15000);
      await D.wait(600);
      var L = S().last;
      await D.say(L.res.made ? 'You took ' + L.took + ' tricks, ' + (L.took > 6 + L.k.lvl ? 'more than the 10 you needed' : 'the 10 you needed') + ', so you made your contract.' : 'You took ' + L.took + ' tricks, ' + (6 + L.k.lvl - L.took) + ' short, so the other side scores.', { at: '.k-sheet .bsum .res' });
      await D.say('Tricks you bid score below the line, and making a game earns a bonus too. A game of Chicago is four deals.', { at: '.k-sheet .bsum .rows' });
    }
  });
})();
