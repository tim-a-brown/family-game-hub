// Boggle's demo (demo.js; CLAUDE.md, Demos): a solo game on the classic board. The demo shakes the cubes and traces STAR
// straight across and SLAP zigzagging on the diagonals; then you trace PLANETS, a seven-letter word worth 5 points.
(function () {
  'use strict';
  var B = window.__bg;
  var BOARD = ['S', 'T', 'A', 'R', 'E', 'L', 'P', 'O', 'D', 'A', 'N', 'E', 'G', 'O', 'S', 'T'];
  var PATH = { star: [0, 1, 2, 3], slap: [0, 5, 2, 6], planets: [6, 5, 9, 10, 11, 15, 14] };
  function S() { return B.S; }
  function cube(i) { return function () { return document.querySelector('.tray .cube[data-i="' + i + '"]'); }; }
  function cubes(w) { return function () { return PATH[w].map(function (i) { return cube(i)(); }); }; }
  function mine() { return S() && S().words[0] || []; }
  async function trace(D, w) {
    var p = PATH[w], n = mine().length;
    await D.drag(cube(p[0]), p.slice(1).map(cube), { after: 300 });
    await D.wait(function () { return mine().length > n; }, 2000);
    await D.wait(800);
  }
  function sel() { return document.querySelectorAll('.tray .cube.path, .tray .cube.last').length; }

  Kit.demoScript({
    intro: 'Here’s how a round of Boggle goes. You’ll trace a long word yourself.',
    beats: 9,
    end: 'Swipe across touching letters to spell words before the sand runs out. Longer words score more.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      B.play(BOARD, me);
    },
    steps: async function (D) {
      await D.tap('.lid .btn-primary', { say: 'Shake the cubes and a new grid of sixteen letters lands in the tray.' });
      await D.wait(function () { return S().phase === 'play' && !document.querySelector('.cube.tumble'); }, 4000);
      await D.wait(700);
      await D.say('The sand timer is running. You have three minutes to find as many words as you can.', { at: '.glass' });
      await D.say('Swipe across touching letters to spell a word, then let go. STAR runs straight across the top.', { at: cubes('star'), wait: 3400 });
      await trace(D, 'star');
      await D.say('Letters can touch on the diagonal too, so SLAP zigzags through the grid.', { at: cubes('slap'), wait: 3000 });
      await trace(D, 'slap');
      await D.say('Every word goes on your list. You can’t use the same cube twice in one word.', { at: '.found' });
      await D.you(cubes('planets'), 'Your turn. Swipe from P through L, A, N, E, T and S to spell PLANETS.', {
        allow: ['.tray'],
        until: function () { return mine().indexOf('planets') >= 0; },
        autoTap: function () {
          var k = sel(), p = PATH.planets;
          return k < p.length ? cube(p[k])() : document.querySelector('.wordrow .btn-primary');
        }
      });
      await D.wait(1800);
      await D.say('PLANETS! Three or four letters score 1 point, and a seven-letter word scores 5.', { at: '.found' });
      await D.say('A word of eight letters or more scores 11, the biggest prize in the tray.', { at: '.tray', wait: 3000 });
      await D.say('When the sand runs out, you see every word that was hiding in the grid.', { at: '.glass' });
    }
  });
})();
