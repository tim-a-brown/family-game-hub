// Cipher Cases' demo (demo.js; CLAUDE.md, Demos): Case 3, Message in a Bottle, a Caesar shift of one. The demo reads the
// case and the clue on the bottle, turns the cipher wheel one step and decodes the first word letter by letter; you decode
// the second word; then the demo types the rest and checks the message, and the case is closed.
(function () {
  'use strict';
  var X = window.__cc;
  function S() { return X.get(); }
  function key(L) { return function () { return document.querySelector('.tw .tk[aria-label="' + L + '"]'); }; }
  function cellsOf(n) { return function () { return [].slice.call(document.querySelectorAll('.paperstrip .word'))[n]; }; }
  function lookCloser() { return [].filter.call(document.querySelectorAll('.tools .tool'), function (b) { return b.textContent.indexOf('Look closer') >= 0; })[0] || null; }
  function firstCell() { return document.querySelector('.paperstrip .word .cell'); }
  async function typeAll(D, w, after) { for (var i = 0; i < w.length; i++) await D.tap(key(w[i]), { after: after != null ? after : 120 }); }
  function filled(n) { var w = cellsOf(n)(); return w ? [].map.call(w.querySelectorAll('.cell .s'), function (s) { return s.textContent; }).join('') : ''; }

  Kit.demoScript({
    intro: 'Here’s how a case gets cracked. You’ll decode part of the message yourself.',
    beats: 12,
    end: 'Read the case, look closely at the picture for clues, and use the decoder to turn each code letter into a real one.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.start('e3', me);
    },
    steps: async function (D) {
      await D.wait(600);
      await D.say('Every case is a little mystery with something locked inside. This one is a coded note that washed up in a bottle.', { at: '.file' });
      await D.say('The note is in a Caesar shift: every letter has been moved the same number of places along the alphabet.', { at: '.paperstrip .words' });
      await D.tap(lookCloser, { say: 'Clues hide in the picture. Look closer shows it big.', after: 900 });
      await D.say('The tag on the bottle says +1, so every letter of the note was moved one step forward.', { at: '.k-sheet .zoomsvg' });
      await D.tap('.k-sheet .k-acts .btn, .k-sheet .btn', { after: 700 });
      await D.say('The cipher wheel lines up the code letters on the blue ring with the real letters around the outside.', { at: '.cwheel' });
      await D.tap('.wheelrow .nudge:last-child', { say: 'Turn the blue ring one step to match the +1.', after: 900 });
      await D.say('The first code letter is E, and on the wheel it sits under D. So E really means D.', { at: firstCell });
      await typeAll(D, 'D', 600);
      await D.say('In this code a letter always stands for the same letter, so every E in the note turns into D at once.', { at: '.paperstrip .words' });
      await typeAll(D, 'IG', 220);
      await D.wait(400);
      await D.you(cellsOf(1), 'Your turn. On the wheel, C is B and Z is Y. Type B, then Y.', {
        allow: [key('B'), key('Y'), key('Delete')], avoid: ['.cwheel'],
        until: function () { return filled(1) === 'BY'; },
        autoTap: function () { return filled(1).charAt(0) !== 'B' ? key('B')() : key('Y')(); }
      });
      await D.wait(500);
      await D.say('DIG BY… The rest of the note decodes the same way.', { at: '.paperstrip .words', wait: 2200 });
      await typeAll(D, 'THEBIGROCK', 70);
      await D.wait(300);
      await D.tap(key('Check the message'), { after: 1200 });
      await D.wait(function () { return document.querySelector('.k-win .card'); }, 6000);
      await D.wait(900);
      await D.say('Case closed! The note says to dig by the big rock. Fewer tries and no hints make for a better record.', { at: '.k-win .card .sub', place: 'bottom' });
    }
  });
})();
