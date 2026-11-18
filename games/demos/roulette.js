// Roulette's demo (demo.js; CLAUDE.md, Demos): you put a chip on red and one on the number 19, spin and land on 3 (red
// wins, the number doesn't), then repeat the same bets and hit 19 straight up for 35 to 1.
(function () {
  'use strict';
  var RL = window.__rl;
  function cell(k) { return function () { return RL.cell(k); }; }
  function chip(v) { return '.rail .cz-slot[data-v="' + v + '"]'; }
  var spinBtn = '.rail .btn.spin', rep = '.rail .btn.rep';
  function spun(n) { return function () { var s = RL.state(); return s && s.sess.spins >= n && !RL.busy() && !document.querySelector('.spinov'); }; }
  var msg = function () { return document.querySelector('.msg'); };

  Kit.demoScript({
    intro: 'Here’s how Roulette goes. You’ll place a bet and spin the wheel yourself.',
    beats: 9,
    end: 'Put your chips on a color, a group of numbers or a single number, then spin. The fewer numbers a bet covers, the more it pays.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      // (the bank lives in memory during a demo; a low one is topped up so the bets fit)
      if ((parseInt(localStorage.getItem('casino_bank'), 10) || 0) < 100) localStorage.setItem('casino_bank', '1000');
      RL.start('eu', me);
    },
    steps: async function (D) {
      await D.say('The wheel has 37 numbers, red and black from 1 to 36 and a green 0. You bet on where the ball will land.', { at: '.lay' });
      await D.say('First pick a chip from the rack. This $5 chip is the one you’ll bet with.', { at: chip(5) });
      await D.tap(chip(5), { after: 500 });
      await D.you(cell('red'), 'Tap the red diamond to bet $5 on red. If the ball lands on any red number, red pays 1 to 1.', { until: function () { return !!RL.state().bets.red; } });
      await D.wait(500);
      await D.say('A single number pays 35 to 1. Here’s $5 on 19.', { at: cell(19), wait: 2400 });
      await D.tap(cell(19), { after: 800 });
      RL.next(3);
      await D.you(spinBtn, 'Now tap Spin to send the ball around the wheel.', { until: function () { return RL.busy(); } });
      await D.wait(spun(1), 12000);
      await D.wait(600);
      await D.say('The ball landed on 3, which is red. Your red bet won $5, and the chip on 19 was lost.', { at: msg });
      await D.say('Repeat puts the same bets down again, on red and on 19.', { at: rep, wait: 2600 });
      await D.tap(rep, { after: 700 });
      RL.next(19);
      await D.tap(spinBtn);
      await D.wait(spun(2), 12000);
      await D.wait(2200);
      await D.say('19 came up! Your $5 on 19 straight up won $175, and 19 is red, so your red bet won too.', { at: cell(19) });
      // (in a large window the board is a panel of the room, .pn-board; on a phone or tablet it is beside the little wheel)
      await D.say('The board keeps the last numbers that came up, newest first.', { at: function () { return document.querySelector('.pn-board') || document.querySelector('.board'); }, avoid: ['.lay'] });
    }
  });
})();
