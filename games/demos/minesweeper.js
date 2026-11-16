// Minesweeper's demo (demo.js; CLAUDE.md, Demos): a Beginner field laid ahead of time. The first dig opens a patch, a 1
// that touches one covered square gives away a mine, a flag goes on it and a tap on the next 1 clears around it; then
// you flag a mine and clear around a 1 yourself.
(function () {
  'use strict';
  var M = window.__ms;
  // the field (9 by 9, square i is row * 9 + column): ten mines that leave two clear lessons after the first dig
  var MINES = [13, 21, 26, 37, 45, 51, 61, 64, 73, 77];
  function cell(i) { return function () { return M.cell(i); }; }
  function cells(l) { return function () { return l.map(function (i) { return M.cell(i); }); }; }
  function S() { return M.get(); }

  Kit.demoScript({
    intro: 'Here’s how to read the numbers, plant a flag and clear a field.',
    beats: 8,
    end: 'Each number counts the mines touching it. Flag the mines you’re sure of, and dig everything else.',
    start: function () {
      M.start('beginner');
      M.lay(MINES);
    },
    steps: async function (D) {
      await D.say('Somewhere under these squares are 10 mines. Your first dig is always safe.', { at: '.field' });
      await D.tap(cell(40), { after: 900 });
      await D.say('A dig opens a patch of the field. Each number tells you how many mines touch that square, corners included.', { at: '.field' });
      await D.say('This 1 touches only one covered square, so that square must hide a mine.', { at: cells([41, 51]), pad: 4 });
      await D.say('Switch the button at the bottom to Flag, then tap the square to plant a flag on it.', { at: '.tools .seg', wait: 2800 });
      await D.tap('.tools .seg .flagm', { after: 300 });
      await D.tap(cell(51), { after: 700 });
      await D.say('The 1 next door already has its mine flagged, so every other square around it is safe. A tap on it opens them all at once.', { at: cells([43, 51]), pad: 4 });
      await D.tap(cell(43), { after: 1000 });
      await D.you(cell(77), 'Your turn. The 1 to the left of this square touches no other covered square, so tap this one to plant a flag.', {
        allow: [cell(77)], until: function () { return !!S().flag[77]; }
      });
      await D.wait(400);
      await D.you(cell(68), 'Now tap the 1 beside your flag to open every square around it.', {
        allow: [cell(68)], until: function () { return !!S().open[60] && !!S().open[78]; }
      });
      await D.wait(700);
      await D.say('Nicely done. You win by opening every square that isn’t a mine, and the clock keeps your best time.', { at: '.hud' });
    }
  });
})();
