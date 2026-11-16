// Word Scramble's demo (demo.js; CLAUDE.md, Demos): two Animals words against the clock. The demo unscrambles TURTLE tile by
// tile; then it opens the clue for the next word and you unscramble RABBIT yourself.
(function () {
  'use strict';
  var X = window.__sc;
  function S() { return X.state(); }
  function R() { return S().R; }
  function tile(t) { return document.querySelector('.tile[data-t="' + t + '"]'); }
  // the next tile to tap: one on the rack with the letter the next empty square needs
  function nextTile() {
    var r = R(); if (!r) return null;
    var i = r.slots.indexOf(null); if (i < 0) return null;
    var t = r.rack.filter(function (x) { return x != null && r.letters[x] === r.w[i]; })[0];
    return t == null ? null : tile(t);
  }
  function tool(name) { return function () { return [].filter.call(document.querySelectorAll('.tools .btn'), function (b) { return b.textContent.trim() === name; })[0] || null; }; }
  async function placeSome(D, n) {
    for (var k = 0; k < n; k++) { var t = nextTile(); if (!t) return; await D.tap(t, { after: 260 }); }
  }

  Kit.demoScript({
    intro: 'Here’s how Word Scramble works. You’ll unscramble a word yourself.',
    beats: 10,
    end: 'Tap the tiles in order to spell the hidden word, and solve as many as you can before the sand runs out.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.start({ mode: 'solo', options: { diff: 'medium', time: 90 }, players: [{ name: me }] }, 'Animals');
      X.word('TURTLE');
    },
    steps: async function (D) {
      await D.wait(700);
      await D.say('The letters of a hidden word are mixed up on the rack. This one is an animal with six letters.', { at: '.rack' });
      await D.say('The bar is your clock. Solve as many words as you can before it runs out.', { at: '.clock', wait: 3000 });
      await D.say('Tap a tile to put it in the next empty square.', { at: nextTile, wait: 2000 });
      await placeSome(D, 3);
      await D.say('T, U, R. Can you see it yet?', { at: '.slots', avoid: ['.rack'], wait: 2200 });
      await placeSome(D, 3);
      await D.wait(function () { return S().T.solved >= 1; }, 3000);
      await D.say('TURTLE! A word scores the small numbers on its tiles added up.', { at: '.slots', avoid: ['.rack'], wait: 3000 });
      await D.wait(function () { return R() && R().w !== 'TURTLE' && document.querySelector('.rack .tile'); }, 4000);
      await D.set(function () { X.word('RABBIT'); });
      await D.wait(900);
      await D.tap(tool('Clue'), { say: 'Clue shows a hint, but it halves what the word scores.' });
      await D.wait(700);
      await D.say('Long ears and a fluffy tail. That sounds like a RABBIT.', { at: '.clue', wait: 2800 });
      await D.you(nextTile, 'Your turn. Tap the tiles in order to spell RABBIT.', {
        allow: ['.rack .tile', '.slots .tile'],
        until: function () { return S().T.solved >= 2; },
        autoTap: nextTile
      });
      await D.wait(900);
      await D.say('Solved! Three words in a row earn 5 bonus points each, and Skip ends the streak.', { at: '.hud' });
      await D.say('Stuck on a word? Letter puts one tile in the right square, and Shuffle mixes up the rack.', { at: '.tools' });
    }
  });
})();
