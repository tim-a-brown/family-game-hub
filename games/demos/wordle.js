// Wordle's demo (demo.js; CLAUDE.md, Demos): a practice word, BRAIN. The demo guesses CRANE and the tiles show green, yellow
// and gray; then TRAIN leaves one letter to find, and you type BRAIN on the game's own keys and solve it.
(function () {
  'use strict';
  var W = window.__wd;
  function S() { return W.get(); }
  function key(k) { return function () { return document.querySelector('#kb .key[aria-label="' + (k === 'BACK' ? 'Delete' : k) + '"]'); }; }
  function row(i) { return function () { return document.querySelectorAll('#grid .row')[i]; }; }
  function tile(r, c) { return function () { var x = row(r)(); return x && x.querySelectorAll('.tile')[c]; }; }
  function settled(n) { return function () { var s = S(); return s.guesses.length >= n && !document.querySelector('#grid .tile.flip:not(.hit):not(.near):not(.miss)'); }; }
  async function typeWord(D, w) {
    for (var i = 0; i < w.length; i++) await D.tap(key(w[i]), { after: 90 });
  }
  async function guess(D, w) {
    var n = S().guesses.length;
    await typeWord(D, w);
    await D.wait(250);
    await D.tap(key('ENTER'), { after: 200 });
    await D.wait(function () { return S().guesses.length > n; }, 3000);
    await D.wait(5 * 260 + 500);
  }
  var SOLVE = 'BRAIN';

  Kit.demoScript({
    intro: 'Here’s how a Wordle goes. You’ll type the last guess yourself.',
    beats: 9,
    end: 'Guess a five-letter word, read the colors, and use what they tell you in your next guess. You have six tries.',
    start: function () {
      W.start(true);            // a practice word, so today’s daily word stays a surprise
      S().answer = SOLVE;
    },
    steps: async function (D) {
      await D.say('There’s a secret five-letter word, and you have six guesses to find it.', { at: '#grid' });
      await D.say('Type any real word on the keys, then tap Enter.', { at: '#kb', wait: 2400 });
      await guess(D, 'CRANE');
      await D.say('Green means the right letter in the right spot. R and A are both in the right place.', { at: function () { return [tile(0, 1)(), tile(0, 2)()]; } });
      await D.say('Yellow means the word has an N, but not in that spot.', { at: tile(0, 3) });
      await D.say('Gray means the letter isn’t in the word at all, so there’s no C and no E.', { at: function () { return [tile(0, 0)(), tile(0, 4)()]; } });
      await D.say('The keys keep the same colors, so you can see which letters you’ve already tried.', { at: '#kb' });
      await guess(D, 'TRAIN');
      await D.say('TRAIN moved the N to the end and added an I. Now four letters are green, and only the first one is wrong.', { at: row(1) });
      await D.you('#kb', 'Your turn. Type BRAIN, then tap Enter.', {
        allow: ['B', 'R', 'A', 'I', 'N', 'ENTER', 'BACK'].map(key),
        until: function () { return S().guesses.length >= 3; },
        autoTap: function () { var c = S().cur; return c.length < 5 ? key(SOLVE[c.length])() : key('ENTER')(); }
      });
      await D.wait(function () { return document.querySelector('.k-win .card'); }, 6000);
      await D.wait(700);
      await D.say('Solved in three guesses! Your stats keep count of how many guesses each word takes you.', { at: '.k-win .answer', place: 'bottom' });
    }
  });
})();
