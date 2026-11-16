// Euchre's demo (demo.js; CLAUDE.md, Demos): a hand with EVE as your partner against Bender and Johnny 5. The 10 of
// Hearts is turned up; you hold both bowers, order it up, lead the right bower and then the left, and the hand is scored.
(function () {
  'use strict';
  var X = window.__euchre;
  var RK = ['9', '10', 'J', 'Q', 'K', 'A'], DECK = Cards.deck({ ranks: RK });
  function card(code) { var s = code.slice(-1), r = code.slice(0, -1); return DECK.filter(function (c) { return c.r === r && c.s === s; })[0]; }
  function id(code) { return card(code).id; }
  function mine(code) { return function () { return document.querySelector('.chand .pcard[data-id="' + id(code) + '"]'); }; }
  function S() { return X.state(); }
  function seat(pos) { return function () { return document.querySelector('.cseat.' + pos); }; }
  function trick() { return document.querySelectorAll('.ctrick .pcard'); }
  function myTurn() { var s = S(); return s && s.phase === 'play' && s.turn === 0 && s.trick.length < 4; }
  function playable() { return document.querySelector('.chand .pcard.play'); }
  function won() { var s = S(); return s.tricks[0] + s.tricks[2]; }

  Kit.demoScript({
    intro: 'Here’s how a hand of Euchre goes. You’ll call trump and lead with the bowers.',
    beats: 12,
    end: 'Call trump when your hand is strong in that suit, remember the bowers are the two best cards, and take three of the five tricks.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.start({ players: [{ name: me }, { name: 'Bender', cpu: true }, { name: 'EVE', cpu: true }, { name: 'Johnny 5', cpu: true }], level: 'normal', target: 10, dealer: 3 });
      X.set(function (s) {
        var h = function (l) { return l.map(card); };
        s.hands = [h(['Jh', 'Jd', 'Ah', 'Ks', '9c']), h(['Kh', '9h', 'As', 'Qc', '10d']), h(['Ad', 'Kd', 'Ac', 'Qs', '10s']), h(['Qh', '9s', 'Js', 'Kc', 'Jc'])];
        s.up = card('10h'); s.kitty = [card('9d'), card('Qd'), card('10c')];
        s.phase = 'bid1'; s.turn = 0; s.bids = [null, null, null, null]; s.passes = 0;
      });
    },
    steps: async function (D) {
      await D.wait(function () { return document.querySelector('.cbar .bidbox'); }, 6000);
      await D.say('Euchre is played with 24 cards, the 9s up to the aces. EVE, across the table, is your partner.', { at: seat('n'), avoid: ['.kitty'] });
      await D.say('Everyone has five cards, and one card is turned up. Its suit, hearts, is offered as trump.', { at: '.kitty' });
      await D.say('The Jack of the trump suit is the right bower, the highest card in the game.', { at: mine('Jh') });
      await D.say('The other jack of the same color is the left bower, the next highest. With hearts as trump, your Jack of Diamonds counts as a heart.', { at: mine('Jd') });
      await D.you('.cbar .bidbox .btn-primary', 'With both bowers and the Ace of Hearts, your hand is strong in hearts. Tap Order up to make hearts trump.', { until: function () { return S().trump === 'h'; } });
      await D.wait(1200);
      await D.say('Johnny 5 is the dealer, so he picks up the 10 of Hearts and throws one of his cards away.', { at: seat('e') });
      await D.wait(function () { return myTurn(); }, 9000);
      await D.you(mine('Jh'), 'You lead first. Tap your right bower, the Jack of Hearts.', { until: function () { return S().trick.length > 0 || S().trickNo > 0; } });
      await D.wait(function () { return S().trick.length >= 4; }, 8000);
      await D.say('Everyone had to follow with a heart if they had one, and nothing beats the right bower.', { at: trick, ring: false, wait: false });
      await D.wait(function () { return myTurn() && S().trickNo === 1; }, 9000);
      await D.wait(1000);
      await D.tap(mine('Jd'), { say: 'Now lead the left bower. It counts as a heart, so the others have to follow with hearts.' });
      await D.wait(function () { return myTurn() && S().trickNo === 2; }, 9000);
      await D.wait(600);
      await D.tap(mine('Ah'), { say: 'Then your Ace of Hearts, the best trump that’s left.' });
      await D.wait(function () { return S().trickNo === 3 && S().trick.length === 0; }, 9000);
      await D.wait(function () { return myTurn() || S().phase !== 'play'; }, 9000);
      if (S().phase === 'play') await D.tap(playable);
      await D.wait(function () { return myTurn() || S().phase !== 'play'; }, 9000);
      if (S().phase === 'play') await D.tap(playable);
      await D.wait(function () { return document.querySelector('.k-sheet .hsum'); }, 12000);
      await D.wait(600);
      var n = won(), w = ['no', 'one', 'two', 'three', 'four', 'all five'][n];
      await D.say(n === 5 ? 'Your team called trump, so you needed three of the five tricks. You took all five, a march, worth 2 points.' : 'Your team called trump, so you needed three of the five tricks. You took ' + w + ', worth 1 point, and all five would score 2.', { at: '.k-sheet .hsum' });
      await D.say('If the team that called trump takes fewer than three, it’s euchred, and the other team scores 2. The first team to 10 wins.', { at: '.k-sheet .sum' });
    }
  });
})();
