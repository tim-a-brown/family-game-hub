// Slide Puzzle's demo (demo.js; CLAUDE.md, Demos): the 15 puzzle a few moves from solved. A tap slides one tile, a tap
// farther along a row pushes two, a swipe slides one up, and you tap the 15 to push the last two tiles home.
(function () {
  'use strict';
  var P = window.__slide;
  function tileV(v) { return function () { return document.querySelector('#board .tile[data-v="' + v + '"]'); }; }
  function moves() { return P.get() ? P.get().moves : 0; }

  Kit.demoScript({
    intro: 'Here’s how the tiles slide, and then you finish the puzzle.',
    beats: 6,
    end: 'Slide the tiles into the empty space until they read 1 to 15 in order, and try to do it in as few moves as you can.',
    start: function () {
      P.start(4, 'num', 'meadow');
      var s = P.get(); s.moves = 118; s.time = 194;
      P.set([1, 2, 3, 4,
             5, 6, 7, 8,
             9, 11, 12, 15,
             13, 10, 14, 0]);
    },
    steps: async function (D) {
      await D.say('Slide the tiles back in order, 1 to 15, with the empty space in the bottom right corner.', { at: '#board', place: innerWidth > innerHeight && innerHeight >= 700 ? 'top' : null });
      await D.say('Only a tile next to the empty space can slide into it. Tap one, and it slides over.', { at: tileV(15) });
      await D.tap(tileV(15), { after: 700 });
      await D.say('Tap a tile farther along the same row, and every tile between it and the space slides too.', { at: function () { return [tileV(11)(), tileV(12)()]; } });
      await D.tap(tileV(11), { after: 800 });
      await D.say('You can also swipe a tile toward the space. Each tile that slides counts as one move.', { at: tileV(10) });
      var n = moves();
      await D.drag(tileV(10), tileV(6), { after: 300 });
      await D.wait(function () { return moves() > n; }, 2000);
      await D.wait(700);
      await D.you(tileV(15), 'Tap the 15 to slide the last two tiles home.', { until: function () { var s = P.get(); return s && s.done; } });
      await D.wait(1300);
      await D.say('Solved! Every tile is back in order, and the moves and the time go on your best results.', { pos: 'top' });
    }
  });
})();
