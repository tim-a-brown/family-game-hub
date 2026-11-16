// Connect Four's demo (demo.js; CLAUDE.md, Demos): a short game against Jamie. Your row across the bottom is blocked,
// then you drop the disc that blocks Jamie's column and finishes four in a row on a diagonal.
(function () {
  'use strict';
  var C = window.__c4;
  function S() { return C.state(); }
  function col(c) { return function () { return document.querySelectorAll('.board .col')[c]; }; }
  // the hole at row r (0 is the top) of column c
  function hole(r, c) { var k = col(c)(); return k ? k.querySelectorAll('.hole')[r] : null; }
  function holes(l) { return function () { return l.map(function (x) { return hole(x[0], x[1]); }); }; }
  function moves() { var s = S(); return s && s.moves ? s.moves.length : 0; }
  async function drop(D, c, after) {
    var n = moves();
    await D.wait(function () { var s = S(); return s && !s.busy; }, 3000);
    await D.tap(col(c), { after: 150 });
    await D.wait(function () { return moves() > n; }, 3000);
    await D.wait(after != null ? after : 900);
  }

  Kit.demoScript({
    intro: 'Here’s a short game of Connect Four. You’ll drop the winning disc yourself.',
    beats: 9,
    end: 'Take turns dropping discs, block the other player’s lines, and watch the diagonals.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      C.start({ players: [{ name: me }, { name: me === 'Jamie' ? 'Pat' : 'Jamie' }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play red, and red goes first. Get four of your discs in a row to win: across, up and down, or on a diagonal.', { at: '.board' });
      await D.say('To drop a disc, tap a column. The disc falls to the lowest empty spot.', { at: col(3) });
      await drop(D, 3);
      await drop(D, 3, 600);
      await D.say('Then ' + them + ' drops a yellow disc, and the two of you take turns.', { at: function () { return hole(4, 3); } });
      await drop(D, 4, 500);
      await drop(D, 2, 500);
      await drop(D, 5, 700);
      await D.say('You have three red discs in a row across the bottom. One more on the right would make four.', { at: holes([[5, 3], [5, 4], [5, 5], [5, 6]]) });
      await drop(D, 6, 1100);
      await D.say(them + ' saw it and dropped a disc on that spot to block you.', { at: function () { return hole(5, 6); } });
      await drop(D, 4, 500);
      await drop(D, 2, 500);
      await drop(D, 3, 700);
      await D.say('Now look at the diagonal. Three red discs climb from the bottom right toward the left.', { at: holes([[5, 5], [4, 4], [3, 3]]) });
      await drop(D, 2, 800);
      await D.say(them + ' has three yellow discs stacked in the third column. A fourth on top would win the game for ' + them + '.', { at: holes([[5, 2], [4, 2], [3, 2]]) });
      await D.you(col(2), 'That empty spot also finishes your diagonal. Tap the third column to drop your disc there.', { until: function () { return moves() >= 11; } });
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 6000);
      await D.wait(700);
      await D.say('Your disc blocked ' + them + ' and made four in a row, so you win! In the next game, ' + them + ' goes first.', { at: '.k-win h2', pos: 'above' });
    }
  });
})();
