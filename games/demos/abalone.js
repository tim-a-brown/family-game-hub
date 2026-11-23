// Abalone's demo (demo.js; CLAUDE.md, Demos): you choose three marbles in a line and move them sideways, then, a few
// moves on, your three push two of Jamie's (a sumito), and late in the game your three push Jamie's sixth marble off
// the board to win.
(function () {
  'use strict';
  var A = window.__abalone;
  function S() { return A.state(); }
  function mb(n) { return function () { return A.marble(n); }; }
  function mbs(l) { return function () { return l.map(function (n) { return A.marble(n); }).filter(Boolean); }; }
  function arrows() { return document.querySelectorAll('.frame .ar'); }
  function arrow(d) { return function () { return A.arrow(d); }; }
  function moved() { var s = S(); return s ? s.n : 0; }
  // Black's three in row E face two of White's with an empty hole past them: the push of three against two
  var PUSH = ['.www.', '..www.', '...w...', '........', '..bbbww..', '..bbb...', '..b.b..', '......', '.....'];
  // late in the game: Jamie has lost five, you have lost two, and your three face Jamie's last two at the edge of row E
  var LATE = ['.....', '...w..', '..w.w..', '...b.w..', '....bbbww', '...bb...', '..b.b..', '......', '.....'];

  Kit.demoScript({
    intro: 'Here’s how marbles move and push, and then you push the sixth marble off the board to win.',
    beats: 9,
    end: 'Move up to three marbles in a line, push when you outnumber the other side, and push six of their marbles off the board.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      A.start({ mode: '2p', start: 'std', players: [{ name: me, cpu: false, side: 1 }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false, side: 2 }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play black, and black goes first. The first to push six of the other side’s marbles off the board wins.', { at: mbs(['A3', 'I7']) });
      await D.tap(mb('C3'), { after: 350 });
      await D.tap(mb('C5'), { after: 400 });
      await D.say('Tap a marble, then one or two more in a straight line. The gold arrows show every way they can go.', { at: arrows });
      var n = moved();
      await D.tap(arrow(1), { after: 200 });
      await D.wait(function () { return moved() > n; }, 3000);
      await D.wait(450);
      await D.say('All three slid sideways into the empty holes. A sideways move never pushes.', { at: mbs(['D4', 'D5', 'D6']) });
      await D.set(function () { A.set(PUSH, 1, [1, 2]); });
      await D.tap(mb('E3'), { after: 350 });
      await D.tap(mb('E5'), { after: 400 });
      await D.say('Later on, your three face two of ' + them + '’s. Moving along their line, yours can push when they outnumber ' + them + '’s.', { at: arrow(0) });
      await D.you(arrow(0), 'Your turn. Tap the red arrow to push.', { until: function () { return moved() > 0; } });
      await D.wait(700);
      await D.say('That push is a sumito: three push two, and two push one. Equal numbers can never push.', { at: mbs(['E4', 'E5', 'E6', 'E7', 'E8']) });
      await D.set(function () { A.set(LATE, 1, [2, 5]); });
      await D.tap(mb('E5'), { after: 350 });
      await D.tap(mb('E7'), { after: 400 });
      await D.say('Now you have pushed five of ' + them + '’s marbles off. With no hole past the marble at the edge, this push sends it off too.', { at: mbs(['E8', 'E9']) });
      await D.you(arrow(0), 'Your turn. Push the sixth marble off the board.', { until: function () { return moved() > 0; } });
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 9000);
      await D.wait(500);
      await D.say('Six of ' + them + '’s marbles are off the board, so you win the game.', { at: '.k-win .rank', pos: 'above' });
    }
  });
})();
