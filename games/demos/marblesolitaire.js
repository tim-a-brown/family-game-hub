// Marble Solitaire's demo (demo.js; CLAUDE.md, Demos): the English board near its end, five marbles left. Three jumps show
// how a marble jumps and comes off, and you make the last jump into the center hole for a perfect finish.
(function () {
  'use strict';
  var M = window.__ms;
  function hole(rc) { return M.G().at[rc]; }
  // the marble sitting in a hole, by row and column ('3,1')
  function marble(rc) { return function () { var id = M.S().holes[hole(rc)]; return id >= 0 ? document.querySelectorAll('#bd .layer .mb')[id] : null; }; }
  // the glowing hole a selected marble can jump to
  function target(rc) { return function () { return document.querySelector('#bd .tgt[data-h="' + hole(rc) + '"]'); }; }
  function moves() { return M.S() ? M.S().moves : 0; }
  async function jump(D, a, t, o) {
    o = o || {};
    var n = moves();
    await D.tap(marble(a), { after: 450 });
    if (o.say) await D.say(o.say, { at: function () { return [marble(a)(), target(t)()].filter(Boolean); } });
    await D.tap(target(t), { after: 300 });
    await D.wait(function () { return moves() > n; }, 3000);
    await D.wait(o.after != null ? o.after : 900);
  }

  Kit.demoScript({
    intro: 'Here’s how a marble jumps, and then you make the last jump of a perfect game.',
    beats: 9,
    end: 'Jump one marble over another to take it off, and keep going until only one is left, in the center if you can.',
    start: function () {
      M.setup('english', ['3,1', '3,2', '3,4', '1,4', '2,4']);
    },
    steps: async function (D) {
      await D.say('Jump marbles over each other to take them off the board, until only one is left.', { at: '#bd' });
      await D.say('The perfect finish is the last marble sitting in the center hole. Five marbles are left here.', { at: '#bd', wait: 3600 });
      await jump(D, '3,1', '3,3', { say: 'Tap a marble, and the holes it can jump to glow. A marble jumps straight over its neighbor into the empty hole just past it.' });
      await D.say('The marble it jumped over comes off and rolls into the gutter.', { at: '#pqLeft', wait: 3000 });
      await jump(D, '3,3', '3,5', { say: 'The same marble can keep going. It jumps again, over the next marble to the right.', after: 700 });
      await jump(D, '1,4', '3,4', { say: 'This one jumps down from the top arm.' });
      await D.you(marble('3,5'), 'Two marbles are left. Tap the one on the right.', {
        until: function () { return !!document.querySelector('#bd .mb.sel'); }
      });
      await D.you(target('3,3'), 'Now tap the center hole to jump into it.', {
        until: function () { return moves() >= 31; }
      });
      await D.wait(1600);
      await D.say('One marble left, and it’s in the center. That’s a perfect game!', { pos: 'top' });
    }
  });
})();
