// Tic-Tac-Toe's demo (demo.js; CLAUDE.md, Demos): a quick classic game against Jamie. You take the middle, Jamie blocks
// your first line, then you make a fork (two lines at once) and finish down the left side.
(function () {
  'use strict';
  var T = window.__ttt;
  function S() { return T.state(); }
  function cell(i) { return function () { return document.querySelectorAll('.tb .cells .tc')[i]; }; }
  function cells(l) { return function () { return l.map(function (i) { return cell(i)(); }); }; }
  function moves() { var s = S(); return s && s.G ? s.G.moves.length : 0; }
  async function mark(D, i, o) {
    var n = moves();
    await D.tap(cell(i), { after: 200 });
    await D.wait(function () { return moves() > n; }, 3000);
    await D.wait(o && o.after != null ? o.after : 700);
  }

  Kit.demoScript({
    intro: 'Here’s a quick game of Tic-Tac-Toe. You’ll make the winning moves yourself.',
    beats: 9,
    end: 'Take turns drawing your mark, block the other player’s lines, and look for a move that makes two lines at once.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      T.start({ mode: '2p', players: [{ name: me }, { name: me === 'Jamie' ? 'Pat' : 'Jamie' }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play X, and you go first. Get three of your marks in a row to win.', { at: '.frame' });
      await D.say('To draw your mark, tap an empty square. The middle square is part of four lines, so it’s a strong start.', { at: cell(4) });
      await mark(D, 4);
      await mark(D, 1, { after: 500 });
      await D.say('Then ' + them + ' draws an O, and the two of you take turns.', { at: cell(1) });
      await mark(D, 0);
      await D.say('Now you have two X’s on the line from corner to corner.', { at: cells([0, 4]) });
      await mark(D, 8, { after: 900 });
      await D.say(them + ' drew an O in the last square of that line, so it’s blocked.', { at: cell(8) });
      await D.you(cell(6), 'Your turn. Tap the bottom left corner.', { until: function () { return moves() >= 5; } });
      await D.wait(1100);
      await D.say('That’s a fork! You can now finish the left side or the other corner-to-corner line, and ' + them + ' can only block one of them.', { at: cells([0, 2, 3, 4, 6]) });
      await mark(D, 2, { after: 600 });
      await D.you(cell(3), them + ' blocked the corner. Tap the middle square on the left to finish your line.', { until: function () { var s = S(); return s && s.G && s.G.over; } });
      await D.wait(function () { return document.querySelector('.k-win .card'); }, 6000);
      await D.wait(700);
      await D.say('Three in a row, so you win! In the next game, ' + them + ' goes first.', { at: '.k-win h2', pos: 'above' });
    }
  });
})();
