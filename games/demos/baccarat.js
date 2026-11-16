// Baccarat's demo (demo.js; CLAUDE.md, Demos): two hands from a stacked shoe. You bet $25 on Player; Player stands on 7,
// Banker's 5 draws a third card and stays 5, and Player wins. Then a bet on Banker wins with a natural 9, less the 5%.
(function () {
  'use strict';
  var B = window.__bc;
  function S() { return B.state(); }
  function spot(k) { return '.felt .hit[data-spot="' + k + '"]'; }
  var deal = '.btn.btn-primary', chip = '.cz-slot[data-v="25"]';
  function zone(k) { return '.felt .zone.' + k; }
  function dealt(n) { return function () { return S() && S().st.hands >= n && !B.busy(); }; }
  var verdict = function () { var v = document.querySelector('.felt .verdict'); return v && v.offsetWidth ? v : document.querySelector('.felt'); };

  Kit.demoScript({
    intro: 'Here’s how Baccarat goes. You’ll place the first bet yourself.',
    beats: 11,
    end: 'Bet on Player, Banker or Tie before the deal. The hand closest to 9 wins, and the dealer plays the cards by fixed rules.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      // (the bank lives in memory during a demo; a low one is topped up so the bets fit)
      if ((parseInt(localStorage.getItem('casino_bank'), 10) || 0) < 100) localStorage.setItem('casino_bank', '1000');
      B.start(me, 'squeeze');
      // hand 1: Player 4 and 3 for 7; Banker King and 5 for 5, draws a 10 and stays at 5
      // hand 2: Player 2 and Queen for 2; Banker 8 and Ace, a natural 9
      B.stack(['4h', 'Ks', '3c', '5d', '10h', '2s', '8c', 'Qd', 'Ah']);
    },
    steps: async function (D) {
      await D.say('In Baccarat, two hands are dealt, Player and Banker. You don’t play the cards. You bet on which hand will win.', { at: '.felt' });
      await D.tap(chip, { say: 'Pick a $25 chip from the rack.', after: 600 });
      await D.you(spot('p'), 'Tap the Player band to bet $25 on Player.', { until: function () { return !!S().bets.p; } });
      await D.wait(400);
      await D.you(deal, 'Now tap Deal.', { until: function () { return B.busy(); } });
      await D.say('Cards count their number, an Ace counts 1, and tens and picture cards count 0. Only the last digit of the total counts.', { at: zone('p'), wait: 5200, avoid: [zone('b')] });
      await D.wait(dealt(1), 30000);
      await D.wait(500);
      await D.say('Player has 4 and 3, which is 7. Banker’s King and 5 make 5, so Banker had to take a third card. A 10 counts 0, so Banker stays at 5.', { at: zone('b') });
      await D.say('Player’s 7 beats Banker’s 5, so your $25 bet on Player wins $25.', { at: verdict });
      await D.tap(spot('b'), { say: 'This time, $25 goes on Banker.', after: 800 });
      await D.tap(deal);
      await D.wait(dealt(2), 30000);
      await D.wait(500);
      await D.say('Banker’s 8 and Ace make 9, the best total there is. A first-two-card 8 or 9 is called a natural, and no one draws.', { at: zone('b') });
      await D.say('Banker wins a little more often, so a winning Banker bet pays 5% less: your $25 wins $23.75.', { at: verdict });
      await D.say('The scoreboard keeps every hand in the shoe, so you can see how the hands have gone.', { at: '.road', avoid: ['.felt'] });
    }
  });
})();
