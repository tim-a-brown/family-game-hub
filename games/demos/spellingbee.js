// Spelling Bee's demo (demo.js; CLAUDE.md, Demos): a practice hive with K in the middle. The demo spells KITE and CHICKEN,
// tries THIN without the center letter, and then you spell KITCHEN, the hive's pangram.
(function () {
  'use strict';
  var B = window.__sb;
  function hx(l) { return function () { return document.querySelector('#hive .hx[data-l="' + l + '"]'); }; }
  function found() { return B.S.found; }
  async function letters(D, w) { for (var i = 0; i < w.length; i++) await D.tap(hx(w[i]), { after: 110 }); }
  async function spell(D, w) {
    await letters(D, w);
    await D.wait(250);
    await D.tap('#enter', { after: 300 });
  }

  Kit.demoScript({
    intro: 'Here’s how the hive works. You’ll find the big word yourself.',
    beats: 10,
    end: 'Make words of four letters or more, always with the center letter. A word that uses all seven letters is a pangram.',
    start: function () { B.hive('kitchen', 'k'); },
    steps: async function (D) {
      await D.say('Make as many words as you can from these seven letters. Letters can be used more than once.', { at: '#hive' });
      await D.say('Every word has to use the gold letter in the middle, and in this hive that’s K.', { at: hx('k') });
      await spell(D, 'kite');
      await D.wait(function () { return found().length >= 1; }, 3000);
      await D.say('KITE is a real word with a K in it. A four-letter word scores 1 point.', { at: '#found' });
      await letters(D, 'thin');
      await D.say('THIN is a word, but it has no K in it, so the hive won’t take it.', { at: '.sb-entry', avoid: ['#hive'], wait: 3000 });
      await D.tap('#enter', { after: 1300 });
      await spell(D, 'chicken');
      await D.wait(function () { return found().length >= 2; }, 3000);
      await D.say('Longer words score a point for every letter, so CHICKEN is worth 7.', { at: '#found' });
      await D.say('Your score moves you up the ranks, from Beginner all the way to Genius.', { at: '#rank' });
      await D.say('A word that uses all seven letters is a pangram, and it scores 7 extra points. There’s one hiding in this hive.', { at: '#hive' });
      var W = 'kitchen';
      await D.you('#hive', 'Spell KITCHEN, then tap Enter.', {
        allow: ['#hive .hx', '#enter', '#del'],
        until: function () { return found().indexOf(W) >= 0; },
        autoTap: function () { var t = (document.getElementById('word').textContent || '').toLowerCase(); return t.length < W.length ? hx(W[t.length])() : document.getElementById('enter'); }
      });
      await D.wait(2000);
      await D.say('A perfect pangram uses each letter exactly once. KITCHEN scores 7 for its letters and 7 more for the pangram.', { at: '#found' });
    }
  });
})();
