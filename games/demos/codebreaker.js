// Mastermind's demo (demo.js; CLAUDE.md, Demos): the computer hides a code of four colors (Blue, Green, Red, Yellow).
// Two guesses show how the little pegs answer, and then you put in the code yourself and crack it on the third guess.
(function () {
  'use strict';
  var M = window.CodeBreaker;
  var RED = 0, ORANGE = 1, YELLOW = 2, GREEN = 3, BLUE = 4;
  var CODE = [BLUE, GREEN, RED, YELLOW];
  function S() { return M.state(); }
  function color(c) { return function () { return document.querySelectorAll('.tray .pal .tp')[c]; }; }
  var check = '.tray .acts .btn-primary';
  function row(r) { return function () { return document.querySelector('.grw[data-r="' + r + '"] .holes'); }; }
  function keys(r) { return function () { return document.querySelector('.grw[data-r="' + r + '"] .keys'); }; }
  function guesses() { var s = S(); return s && s.guesses ? s.guesses.length : 0; }
  // the color the current row needs next to read as the code (the player's guess)
  function nextColor() { var s = S(); if (!s || !s.cur) return null; for (var i = 0; i < 4; i++) if (s.cur[i] !== CODE[i]) return color(CODE[i])(); return null; }
  async function guess(D, g, o) {
    o = o || {};
    for (var i = 0; i < g.length; i++) await D.tap(color(g[i]), { after: 260 });
    var n = guesses();
    await D.tap(check, { after: 200 });
    await D.wait(function () { return guesses() > n; }, 3000);
    await D.wait(o.after != null ? o.after : 1500);
  }

  Kit.demoScript({
    intro: 'Here’s how to crack a secret code. You’ll put in the winning guess yourself.',
    beats: 9,
    end: 'Guess, read the little pegs, and make every new guess fit all the clues so far.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      M.start({ diff: 'classic', name: me, code: CODE });
    },
    steps: async function (D) {
      await D.say('The computer has hidden a secret code of four colored pegs behind this shield. Your job is to crack it.', { at: '.coderow .shield' });
      await D.say('Tap a color in the tray, and it goes into the glowing hole of your guess. When the row is full, tap Check.', { at: '.tray .pal' });
      await guess(D, [RED, RED, ORANGE, ORANGE]);
      await D.say('Each white peg means one of your colors is in the code, but in a different spot.', { at: keys(0) });
      await D.say('You got one white peg and no red ones. So one red is in the code, but not in the first two spots, and there’s no orange at all.', { at: row(0) });
      await guess(D, [YELLOW, GREEN, RED, BLUE], { after: 2200 });
      await D.say('Each red peg means one of your colors is in exactly the right spot.', { at: keys(1) });
      await D.say('Two red pegs and two white ones: all four colors are right, and two of them are in the right spots. Green and red could stay, and yellow and blue could trade places.', { at: row(1) });
      await D.you(function () { return nextColor() || document.querySelector(check); }, 'Your turn. Tap blue, green, red and yellow, in that order.', {
        allow: [function () { return nextColor(); }], pos: 'above',
        until: function () { var s = S(); return s && s.cur && s.cur.every(function (c, i) { return c === CODE[i]; }); }
      });
      await D.you(check, 'Now tap Check.', { until: function () { return guesses() >= 3; } });
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 8000);
      await D.wait(700);
      await D.say('Four red pegs means you cracked the code, in just three guesses!', { at: '.k-win h2', pos: 'above' });
    }
  });
})();
