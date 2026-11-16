// Othello's demo (demo.js; CLAUDE.md, Demos): the first two moves show trapping and flipping; then, near the end with
// Jamie far ahead, you take the bottom right corner and flip 10 discs at once, and your last disc wins the game.
(function () {
  'use strict';
  var O = window.__othello;
  function S() { return O.state(); }
  function sq(s) { return function () { return document.querySelector('.bd .sq[data-s="' + s + '"]'); }; }
  function sqs(l) { return function () { return l.map(function (s) { return sq(s)(); }); }; }
  function hints() { return document.querySelectorAll('.bd .sq.hint'); }
  function moved() { var s = S(); return s ? s.n : 0; }
  async function place(D, s, after) {
    var n = moved();
    await D.tap(sq(s), { after: 200 });
    await D.wait(function () { return moved() > n; }, 3000);
    await D.wait(after != null ? after : 1200);
  }
  // near the end: Jamie has 39 discs to your 22, and three squares are empty
  var LATE = [0, -1, 1, 1, 1, 1, 1, 1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, 1, -1, -1, -1, -1, -1, -1, 1, 1, -1, -1, -1, -1, -1, -1, 1, 1, 1,
    -1, -1, -1, -1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 0, 1, -1, -1, -1, -1, -1, -1, 0];

  Kit.demoScript({
    intro: 'Here’s how discs get trapped and flipped, and then you make a big flip to win the game.',
    beats: 11,
    end: 'Trap the other color in straight lines to flip it, grab the corners, and have the most discs when the board fills up.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      O.start({ mode: '2p', players: [{ name: me, cpu: false, side: 1 }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false, side: -1 }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play black, and black goes first. The board starts with two black and two white discs in the middle.', { at: sqs([27, 28, 35, 36]) });
      await D.say('Place a disc so that white discs are trapped in a straight line between it and another black disc. The dots show where you can play.', { at: hints });
      await place(D, 19);
      await D.say('The white disc you trapped flipped over to black.', { at: sqs([19, 27, 35]) });
      await place(D, 18, 1100);
      await D.say('Then ' + them + ' trapped one of yours on a diagonal and flipped it back. The two of you take turns.', { at: sqs([18, 27, 36]) });
      await D.set(function () { O.set(LATE, 1); });
      await D.say('Now we skip ahead to near the end of the game. ' + them + ' has 39 discs and you have only 22.', { pos: 'center', ring: false, wait: 3200 });
      await D.say('One disc can trap several lines at once: across, up and down, and on a diagonal.', { at: hints });
      await D.you(sq(63), 'Your turn. Place a disc in the corner at the bottom right.', { until: function () { return moved() > 0; } });
      await D.wait(2600);
      await D.say('That disc trapped two lines and flipped 10 discs! A disc in a corner can never be flipped back.', { at: function () { var l = S().last; return l ? sqs([l.s].concat(l.f))() : []; } });
      await place(D, 55, 1100);
      await D.say(them + ' had one square left to play. Your last disc goes in the top left corner.', { at: sq(0) });
      await place(D, 0, 300);
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 8000);
      await D.wait(700);
      await D.say('When nobody can move, the game is over and the most discs wins. You won, 39 to 25.', { at: '.k-win .rank', pos: 'above' });
    }
  });
})();
