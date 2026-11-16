// Crossword's demo (demo.js; CLAUDE.md, Demos): the classic Mini 1. The demo fills 4-Across from its clue and switches to
// 2-Down; you fill 5-Across, EXTRA, from its clue; then the demo fills the last two downs and the grid is solved.
(function () {
  'use strict';
  var X = window.__cw;
  function S() { return X.S; }
  function key(k) { return function () { return document.querySelector('#kb .key[aria-label="' + k + '"]'); }; }
  function sq(r, c) { return function () { return document.querySelector('#grid .sq[data-r="' + r + '"][data-c="' + c + '"]'); }; }
  function row(r) { return function () { return [0, 1, 2, 3, 4].map(function (c) { return sq(r, c)(); }); }; }
  function col(c) { return function () { return [0, 1, 2, 3, 4].map(function (r) { return sq(r, c)(); }); }; }
  async function typeWord(D, w) { for (var i = 0; i < w.length; i++) await D.tap(key(w[i]), { after: 80 }); }
  function filled(r) { return S().fill[r].join(''); }

  Kit.demoScript({
    intro: 'Here’s how a Mini crossword goes. You’ll fill in one of the answers yourself.',
    beats: 10,
    end: 'Read the clue, type the answer, and let the letters that cross help with the next one.',
    start: async function () {
      var t0 = Date.now();
      while (!X.Z && Date.now() - t0 < 3000) await new Promise(function (r) { setTimeout(r, 60); });
      await X.open('c1');
    },
    steps: async function (D) {
      await D.say('Every numbered square starts an answer. The highlighted row is the one you’re filling in.', { at: row(1) });
      await D.say('Its clue is under the grid: 4-Across, a sound you can hear from a speaker.', { at: '#ct' });
      await typeWord(D, 'AUDIO');
      await D.wait(500);
      await D.say('AUDIO fits. Type on the keys and the cursor moves along the answer for you.', { at: row(1) });
      await D.tap(sq(0, 2), { say: 'Tap a square to work on the answer that runs through it. This one only goes down.' });
      await D.wait(600);
      await D.say('2-Down: makes corrections to writing. Its D is already there from AUDIO.', { at: col(2) });
      await typeWord(D, 'EDITS');
      await D.wait(400);
      await D.tap(sq(3, 0), { after: 500 });
      await D.tap(sq(3, 0), { say: 'Tap the same square again to switch between Down and Across.' });
      await D.wait(700);
      await D.say('5-Across is more than needed, or a bonus. Its T is already filled in from EDITS.', { at: '#ct' });
      var W = 'EXTRA';
      await D.you('#kb', 'Your turn. Type EXTRA on the keys.', {
        allow: ['E', 'X', 'T', 'R', 'A', 'Delete'].map(key), avoid: [row(3)],
        until: function () { return filled(3) === W; },
        autoTap: function () { var s = S(); return s.r === 3 && s.c >= 0 && s.c < 5 ? key(W[s.c])() : key(W[filled(3).length] || 'A')(); }
      });
      await D.wait(700);
      await D.say('Now we fill in the last two answers, 1-Down and 3-Down.', { at: function () { return col(0)().concat(col(4)()); }, wait: 2400 });
      await D.tap(sq(0, 0), { after: 300 });
      await typeWord(D, 'WAVES');
      await D.tap(sq(0, 4), { after: 300 });
      await typeWord(D, 'CORAL');
      await D.wait(function () { return document.querySelector('.k-win .card'); }, 6000);
      await D.wait(600);
      await D.say('Solved! Check and Reveal can help when you’re stuck, and every day brings a new Mini.', { at: '.k-win .sub', place: 'bottom' });
    }
  });
})();
