// Twixt's demo (demo.js; CLAUDE.md, Demos): aiming a peg and the link it makes, which you place; the other player's
// link turning your chain aside, and the dashed line of a link that would be blocked; then the last peg of a chain from
// the top to the bottom, which you place to win.
(function () {
  'use strict';
  var T = window.__twixt;
  function S() { return T.state(); }
  function hole(n) { return function () { return T.hole(n); }; }
  function pegs(l) { return function () { return l.map(function (n) { return T.peg(n) || T.hole(n); }); }; }
  function moved() { var s = S(); return s ? s.n : 0; }
  // early on: two red pegs joined, a black peg on the way down
  var EARLY = 'K10 M13 J8 E15';
  // near the end: Red's chain runs from the top row to the second row from the bottom
  var END = 'L1 A6 M3 C7 L5 E8 M7 G9 L9 I10 M11 X16 L13 V17 M15 T18 L17 R19 M19 P20 L21 F4 M23 D13';

  Kit.demoScript({
    intro: 'Here’s how pegs link up, how a link blocks the way, and how a chain from border to border wins.',
    beats: 8,
    end: 'Put pegs a knight’s move apart to link them, block the other player’s way with your links, and join your two borders.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      T.start({ mode: '2p', swap: false, players: [{ name: me, cpu: false, side: 1 }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false, side: 2 }] });
      T.set(EARLY);
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play red. To win, join the top row to the bottom row with a chain of your pegs. ' + them + ' plays black and joins the left side to the right.', { at: '.frame' });
      await D.tap(hole('L12'), { after: 700 });
      await D.say('Touching a hole shows a ghost peg there. Two of your pegs a knight’s move apart, two holes down and one across, are joined by a link, and the moving red line shows the link this one would make.', { at: hole('L12'), avoid: '.bd' });
      await D.you(hole('L12'), 'Your turn. Tap the ghost peg again to put your peg there.', { avoid: '.bd', until: function () { return moved() > 4; } });
      await D.wait(1300);
      await D.tap(hole('K14'), { after: 500 });
      await D.tap(hole('K14'), { after: 1300 });
      await D.say(them + ' linked two black pegs right across the way your chain was heading.', { at: pegs(['K14', 'M13']), avoid: '.bd' });
      await D.tap(hole('M14'), { after: 700 });
      await D.say('Links never cross. A peg here would make no link: the red dashed line shows the link that black link blocks.', { at: pegs(['L12', 'M13', 'K14', 'M14']), avoid: '.bd' });
      await D.set(function () { T.set(END); });
      await D.say('Later in the game, your chain runs from the top row nearly to the bottom. The number on your plate counts the pegs you still need: one.', { at: '.pbar.bot .tg', avoid: '.bd' });
      await D.tap(hole('K24'), { after: 600 });
      await D.you(hole('K24'), 'Your turn. Place the last peg in the bottom row.', { avoid: '.bd', until: function () { var s = S(); return s && s.over; } });
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 14000);
      await D.wait(700);
      await D.say('Your links join the top row to the bottom row without a break, so you win the game.', { at: '.k-win .rank', pos: 'above' });
    }
  });
})();
