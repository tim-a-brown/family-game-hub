// Craps' demo (demo.js; CLAUDE.md, Demos): you put a chip on the Pass line and shoot. An 8 sets the point, a 9 changes
// nothing, the 8 again wins; then a 6 is the new point and a 7 is the seven-out that ends the shooter's turn.
(function () {
  'use strict';
  var C = window.__cr;
  function S() { return C.state(); }
  var pass = '.zone[data-bet="pass"]', rollBtn = '.rail .btn.roll', dice = '.dz';
  function box(n) { return '.zone[data-bet="box' + n + '"]'; }
  function rolled(n) { return function () { return S() && S().sess.rolls >= n && !C.busy(); }; }
  var msg = function () { return document.querySelector('.msg'); };

  Kit.demoScript({
    intro: 'Here’s how a turn of Craps goes. You’ll make the first bet and roll the dice yourself.',
    beats: 10,
    end: 'Bet the Pass line, then roll. On the first roll 7 or 11 wins; after that, roll the point again before a 7.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      // (the bank lives in memory during a demo; a low one is topped up so the bets fit)
      if ((parseInt(localStorage.getItem('casino_bank'), 10) || 0) < 100) localStorage.setItem('casino_bank', '1000');
      C.start(me);
      C.dice([[4, 4], [5, 4], [6, 2], [2, 4], [3, 4]]);
    },
    steps: async function (D) {
      await D.say('Craps is played with two dice. Whoever rolls them is the shooter, and this time the shooter is you.', { at: dice });
      await D.you(pass, 'The most common bet is the Pass line. Tap it to put a $5 chip there.', { until: function () { return !!S().bets.pass; } });
      await D.wait(400);
      await D.say('The first roll is the come-out. A 7 or 11 wins right away, and a 2, 3 or 12 loses.', { at: dice, wait: 4600 });
      await D.you(rollBtn, 'Tap Roll to throw the dice.', { until: function () { return C.busy() || S().sess.rolls >= 1; } });
      await D.wait(rolled(1), 8000);
      await D.wait(400);
      await D.say('You rolled an 8, so 8 is the point. The puck says ON over the 8.', { at: box(8) });
      await D.say('Now you keep rolling. An 8 wins the Pass line, and a 7 loses it. Every other number just rolls again.', { at: pass });
      await D.tap(rollBtn);
      await D.wait(rolled(2), 8000);
      await D.say('A 9 doesn’t win or lose. Roll again.', { at: dice, wait: 2200 });
      await D.tap(rollBtn);
      await D.wait(rolled(3), 8000);
      await D.wait(500);
      await D.say('An 8 again! You made the point, and the Pass line pays $5. Your chip stays down for the next come-out.', { at: msg });
      await D.tap(rollBtn);
      await D.wait(rolled(4), 8000);
      await D.say('This come-out roll is a 6, so 6 is the new point.', { at: box(6), wait: 3000 });
      await D.tap(rollBtn);
      await D.wait(rolled(5), 8000);
      await D.wait(500);
      await D.say('A 7 before the 6 is a seven-out. The Pass line loses, and the dice pass to the next shooter.', { at: msg });
    }
  });
})();
