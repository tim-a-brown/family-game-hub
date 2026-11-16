// Candy Match's demo (demo.js; CLAUDE.md, Demos): the first level on a board laid ahead of time, with the candies that
// fall in seeded. A swipe makes three red beans and the falling candies make three green squares (a cascade); four lemon
// drops make a striped candy; then you match the striped candy and it clears its row.
(function () {
  'use strict';
  var C = window.__candy;
  function G() { return C.G(); }
  function cv() { return document.querySelector('.cm-frame canvas'); }
  // cells of the board (row, column) as a target: the canvas has nothing inside it, so this stands in for them
  function cells(list) {
    return function () {
      var c = cv(); if (!c || !c.isConnected || !G()) return null;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () {
          var r = c.getBoundingClientRect(), w = r.width / G().C, h = r.height / G().R, b = null;
          list.forEach(function (p) { var x = r.left + p[1] * w, y = r.top + p[0] * h;
            b = b ? { left: Math.min(b.left, x), top: Math.min(b.top, y), right: Math.max(b.right, x + w), bottom: Math.max(b.bottom, y + h) } : { left: x, top: y, right: x + w, bottom: y + h }; });
          b.width = b.right - b.left; b.height = b.bottom - b.top; return b;
        },
        contains: function (t) { return t === c; }, dispatchEvent: function (e) { return c.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  function cell(r, c) { return cells([[r, c]]); }
  function moves() { var g = G(); return g ? g.stats.moves : 0; }
  function idle() { return C.idle(); }
  var autoN = 0;

  Kit.demoScript({
    intro: 'Here’s how to swap candies, set off a cascade and make a striped candy.',
    beats: 7,
    end: 'Swap two candies to line up three or more. Bigger lines make special candies, and each level has a goal to reach before the moves run out.',
    start: function () {
      C.start(1, 'level');
      // the new candies that fall in come from a seeded draw, so they are the same every time
      G().rng = new (G().rng.constructor)(20261116);
      C.board([
        'r o y g b r o y g',
        'y g b r o y y b r',
        'b r o y g b r y y',
        'o y g b r o y g b',
        'g b r o y g b y o',
        'r o y g b r o y g',
        'y g b r o y g b y',
        'b r o g b r r y y',
        'o g g r r o y g b']);
    },
    steps: async function (D) {
      await D.say('Line up three or more candies of the same kind and they pop. You make a line by swapping two candies that sit side by side.', { at: '.cm-frame', pos: 'below' });
      await D.say('Two red beans sit side by side, and a third is just above the row. Swipe that one down, and it swaps with the candy under it to make three.', { at: cells([[8, 3], [8, 4], [7, 5]]), pad: 4 });
      await D.drag(cell(7, 5), cell(8, 5), { after: 200 });
      await D.wait(function () { return moves() >= 1 && idle(); }, 6000);
      await D.say('The three red beans popped and the candies above fell. The falling candies lined up three green squares on their own, which is a cascade. Each one scores more than the last.', { at: '.cm-sc' });
      await D.say('Four in a line make a special candy. Here, one lemon drop swapped to the left makes four.', { at: cells([[4, 7], [5, 7], [7, 7], [6, 8]]), pad: 4 });
      await D.drag(cell(6, 8), cell(6, 7), { after: 200 });
      await D.wait(function () { return moves() >= 2 && idle(); }, 6000);
      await D.say('The four lemon drops became one striped candy. Its stripes run the way you swiped, and when it pops, it clears its whole row.', { at: cell(7, 7), pad: 8 });
      await D.you(cells([[7, 6], [7, 7], [7, 8], [8, 6]]), 'Your turn. Swipe the lemon drop up into the striped candy’s row to make three. You can also tap one candy and then the other.', {
        allow: [cells([[0, 0], [8, 8]])], pad: 4,
        autoTap: function () { autoN++; return autoN % 2 ? cell(8, 6)() : cell(7, 6)(); },
        until: function () { return moves() >= 3; }
      });
      await D.wait(function () { return idle(); }, 6000);
      await D.wait(400);
      await D.say('The striped candy cleared the row. Each level has a goal: on this one, you score 5,000 points before your 18 moves run out.', { at: '.cm-hud' });
    }
  });
})();
