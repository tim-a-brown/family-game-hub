// Pai Gow's demo (demo.js; CLAUDE.md, Demos): a $20 bet, seven cards with a pair of 9s, an Ace and a King. You set the
// Ace and King as your low hand and keep the pair high; both hands beat the dealer's, and the win is paid less 5%.
(function () {
  'use strict';
  var P = window.__pg;
  function S() { return P.state(); }
  function card(id) { return function () { return document.querySelector('.pz .pcard[data-id="' + id + '"]'); }; }
  function chip(v) { return '.cz-slot[data-v="' + v + '"]'; }
  var main = '.acts .btn-primary.main', hw = '.acts .btn-soft';
  var lo = function () { return document.querySelector('.pz.lo'); }, hi = function () { return document.querySelector('.pz.hi'); };
  var status = function () { return document.querySelector('.ctl .status'); };
  // the dealer's cards (in a large window laid out in one line the dealer's zone has no box of its own: the dealer's hands then)
  var dealer = function () {
    var z = document.querySelector('.ctable .zone'); if (z && z.getClientRects().length) return z;
    var l = z ? [].slice.call(z.querySelectorAll('.row7, .dset .grp')).filter(function (n) { return n.getClientRects().length; }) : [];
    return l.length ? l : document.querySelector('.ctable .felt-in') || document.querySelector('.ctable');
  };
  // (a large window has the room to keep a caption about the dealer off your own two hands)
  var mine = function () { return document.documentElement.classList.contains('pgd') ? [].slice.call(document.querySelectorAll('.pz')) : []; };
  function ph(p) { return function () { return S() && S().phase === p && !P.busy(); }; }
  // your cards: dm0 the Ace of Spades, dm1 the King of Diamonds
  var ACE = 'dm0', KING = 'dm1';

  Kit.demoScript({
    intro: 'Here’s a hand of Pai Gow. You’ll split your seven cards into two hands yourself.',
    beats: 9,
    end: 'Split your seven cards into a five-card high hand and a two-card low hand, with the high hand the stronger. Win both to win the bet.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      // (the bank lives in memory during a demo; a low one is topped up so the bets fit)
      if ((parseInt(localStorage.getItem('casino_bank'), 10) || 0) < 100) localStorage.setItem('casino_bank', '1000');
      P.start(me);
      P.next(['As', 'Kd', '9c', '9h', '6d', '4c', '2s'], ['Qs', 'Jh', '8d', '8c', '5h', '3s', '2d']);
    },
    steps: async function (D) {
      await D.say('In Pai Gow, you and the dealer each get seven cards. You split yours into two hands, and both play against the dealer’s.', { at: dealer });
      await D.tap(chip(5), { say: 'First, a bet. Four $5 chips make a $20 bet in the Bet circle.', after: 250 });
      await D.tap(chip(5), { after: 250 });
      await D.tap(chip(5), { after: 250 });
      await D.tap(chip(5), { after: 600 });
      await D.tap(main);
      await D.wait(ph('set'), 6000);
      await D.wait(700);
      await D.say('You have a pair of 9s, an Ace and a King. Two cards go in the low hand, and the other five are the high hand.', { at: hi });
      await D.say('The high hand has to beat the low hand. So the pair stays high, and the Ace and King make a strong low hand.', { at: hi });
      await D.you(card(ACE), 'Tap the Ace, then the King, to move them to your low hand.', {
        allow: [card(ACE), card(KING)], until: function () { return S().low.length === 2; },
        autoTap: function () { return S().low.length === 0 ? card(ACE)() : card(KING)(); }
      });
      await D.wait(500);
      await D.say('Not sure how to split a hand? House way sets it the way the dealer would.', { at: hw, wait: 3200 });
      await D.you(main, 'Tap Play hands to turn over the dealer’s cards.', { until: function () { return S().phase !== 'set'; } });
      await D.wait(ph('result'), 9000);
      await D.wait(900);
      await D.say('The dealer split a pair of 8s high and Queen-Jack low. Your 9s beat the 8s, and your Ace-King beats Queen-Jack.', { at: dealer, avoid: mine });
      await D.say('Win both hands and you win the bet, less a 5% commission: $19 on $20. Win one and it’s a push, and your bet comes back.', { at: status });
    }
  });
})();
