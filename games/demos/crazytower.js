// Crazy Tower's demo (demo.js; CLAUDE.md, Demos): Drop starts a tower, a block dropped a little off has its overhang
// sliced away, the next lands perfectly, and then you drop blocks yourself with the slide slowed down. The demo's own
// drops are lined up so the block arrives where the story needs it as the finger presses (window.__tower.lineUp), and
// a guard keeps a demo from missing the tower, so it never reaches a game over.
(function () {
  'use strict';
  var T = window.__tower, LAG = 0.42;
  function st() { return T.state(); }
  function cur() { return T.cur(); }
  var screen = function () { return document.getElementById('scr'); };
  function sliding() { var c = cur(); return st() === 'play' && c && c.phase === 'slide'; }
  // the demo drops the sliding block so it lands `off` from the block below
  async function dropAt(D, off) {
    await D.wait(sliding, 4000);
    await D.wait(500);
    T.lineUp(off, LAG);
    await D.tap('#big', { after: 0 });
    var h = T.height();
    await D.wait(function () { return T.height() > h; }, 4000);
  }

  Kit.demoScript({
    intro: 'Here’s how the blocks stack, and then you drop a few yourself.',
    beats: 8,
    end: 'Tap Drop when the sliding block is right over the tower. Anything hanging over the edge is sliced off.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      T.start(me);
      T.demo.guard = true;
    },
    steps: async function (D) {
      await D.say('Build the tallest tower you can, one glowing block at a time.', { at: screen, pos: 'below', wait: 2800 });
      await D.tap('#big', { after: 300 });
      await D.wait(sliding, 4000);
      await D.say('Each block slides back and forth above the tower. Tap Drop to let it fall.', { at: '#big', wait: false });
      await dropAt(D, 0.8);
      await D.wait(400);
      await D.say('That one landed a little off, so the part hanging over the edge was sliced away. The next block is smaller.', { at: screen, pos: 'below' });
      await dropAt(D, 0);
      await D.wait(400);
      await D.say('Perfect! A block that lands right on the one below keeps its whole size and scores a bonus.', { at: '#p-sc', pad: 6 });
      // your turn, with the slide slowed down
      T.demo.speed = 0.55;
      var h0 = T.height();
      await D.you('#big', 'Your turn. Watch the lit patch on top of the tower, and tap Drop when the block is right over it.', {
        pos: 'above', until: function () { return T.height() > h0; }
      });
      await D.wait(700);
      await D.say('Nice drop! Perfects in a row score more, and from the third, each one makes the block a little wider again.', { at: '#p-sc', pad: 6 });
      T.demo.speed = 1;
      await dropAt(D, 0);
      await D.wait(500);
      await D.say('Blocks slide faster as the tower grows. Reach the jackpot line at 40 blocks for a big bonus, and a miss ends the game.', { at: screen, pos: 'below' });
    }
  });
})();
