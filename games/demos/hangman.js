// Hangman's demo (demo.js; CLAUDE.md, Demos): one word from Animals on Easy, PENGUIN. The demo guesses a letter that is in
// it and one that isn't, opens the clue, and you guess the N (both of them land at once) and the last letter to save him.
(function () {
  'use strict';
  var H = window.__hm;
  function S() { return H.state(); }
  function W() { return S().W; }
  function key(L) { return function () { return [].filter.call(document.querySelectorAll('.hm .kb .key'), function (k) { return k.textContent === L; })[0] || null; }; }
  function slots(L) { return function () { return document.querySelectorAll('.word .lt[data-ch="' + L + '"]'); }; }
  function btn(text) { return function () { return [].filter.call(document.querySelectorAll('.hm .acts .btn'), function (b) { return b.textContent.indexOf(text) >= 0; })[0] || null; }; }
  async function pick(D, L, after) {
    var n = W().guessed.length;
    await D.tap(key(L), { after: 200 });
    await D.wait(function () { return W().guessed.length > n; }, 2000);
    await D.wait(after != null ? after : 900);
  }

  Kit.demoScript({
    intro: 'Here’s how a word of Hangman goes. You’ll guess the letters that finish it.',
    beats: 10,
    end: 'Guess one letter at a time and solve the word before the picture is finished. Every miss you have left is worth a point.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      H.start({ mode: 'solo', options: { diff: 'easy', theme: 'classic', count: 3 }, players: [{ name: me }] }, 'Animals');
      H.word('PENGUIN', 'Flightless bird from Antarctica', 'Animals');
    },
    steps: async function (D) {
      await D.say('There’s a secret animal on the board. Each blank is one of its letters.', { at: '.word' });
      await D.say('Tap a letter on the keyboard to guess it.', { at: '.hm .kb', wait: 2200 });
      await pick(D, 'E');
      await D.say('E is in the word, so it’s written into its blank.', { at: slots('E') });
      await pick(D, 'S', 1300);
      await D.say('There’s no S, so that’s a miss. Each miss draws one more piece of the picture, and Easy allows ten.', { at: '.pic' });
      await D.tap(btn('Clue'), { say: 'Stuck? Clue shows a hint, but it costs you a point.' });
      await D.wait(900);
      await D.say('A flightless bird from Antarctica. That should help!', { at: '.clue', wait: 2600 });
      await D.you(key('N'), 'Your turn. Tap N.', { until: function () { return W().guessed.indexOf('N') >= 0; } });
      await D.wait(900);
      await D.say('There are two N’s, and every N in the word is written in at once.', { at: slots('N') });
      await pick(D, 'P', 700);
      await pick(D, 'G', 700);
      await pick(D, 'U', 900);
      await D.you(key('I'), 'Only one letter is left. Tap I to finish the word.', { until: function () { return W().over; } });
      await D.wait(2600);
      await D.say('Saved! A solved word scores 1 point plus one for each miss you had left, less 1 for the clue. That’s 9 points.', { at: '.slate .banner' });
    }
  });
})();
