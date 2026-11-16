// Slots' demo (demo.js; CLAUDE.md, Demos): Diamond Sevens, the first machine. You spin once with the Spin button for a
// small win on a payline, the demo pulls the handle for a big win with a Diamond, and the pay table's idea is said aloud.
(function () {
  'use strict';
  var SL = window.__slots;
  function mulberry(a) { return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function S() { return SL.state(); }
  var spin = '.ctrls .btn-spin', reels = '.ov .win', handle = '.ov .hit.handle';
  function spun(n) { return function () { return S() && S().spins >= n && !SL.busy(); }; }

  Kit.demoScript({
    intro: 'Here’s how the slot machine plays. You’ll spin the reels yourself.',
    beats: 8,
    end: 'Choose your bet, then spin or pull the handle. Matching pictures on a payline win, and a Diamond doubles the win.',
    start: async function (D) {
      Math.random = mulberry(11);   // (the reels stop the same way every time)
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      // (the bank lives in memory during a demo; a low one is topped up so the bets fit)
      if ((parseInt(localStorage.getItem('casino_bank'), 10) || 0) < 100) localStorage.setItem('casino_bank', '1000');
      SL.start('classic', me);
      await D.wait(function () { return SL.ready() && document.querySelector(spin); }, 15000);
      await D.wait(600);
    },
    steps: async function (D) {
      await D.say('This is Diamond Sevens, an old chrome slot machine with three reels.', { at: reels });
      await D.say('The numbered tabs at the sides mark five paylines: the three rows and the two diagonals. Three matching pictures on a line win.', { at: reels });
      await D.say('Each spin bets $1 on each of the five lines, so a spin costs $5. These buttons change the lines and the bet.', { at: '.ctrls .row' });
      SL.force('win');
      await D.you(spin, 'Tap Spin to set the reels going.', { until: function () { return S().spins >= 1; } });
      await D.wait(spun(1), 60000);
      await D.wait(700);
      await D.say('That spin paid on a line. The line that paid lights up, and what it paid goes into your bankroll.', { at: reels });
      SL.force('diamond');
      await D.say('This machine has a real handle too. Pull it down and let go, or just tap it, to spin.', { at: handle, wait: 3000 });
      await D.tap(handle, { after: 300 });
      await D.wait(spun(2), 60000);
      await D.wait(900);
      await D.say('A big win! A Diamond is wild: it stands in for any picture and doubles what the line pays.', { at: reels });
      await D.say('Tap the glass above the reels any time to see the pay table, with what every line of pictures pays.', { at: function () { var g = document.querySelector('.ov .hit[aria-label="Pay table"]'); return g && g.offsetWidth ? g : document.querySelector(reels); } });
    }
  });
})();
