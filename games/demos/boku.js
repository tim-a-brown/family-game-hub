// Boku's demo (demo.js; CLAUDE.md, Demos): you play Black, first; a marble goes down with its ghost first; then your
// marble traps two of Jamie's and you take one, which goes back to Jamie, and Jamie can't use that hole on the next turn; then your open four gives you two ways
// to win, Jamie blocks one and you make five in a row with the other.
(function () {
  'use strict';
  var A = window.__boku;
  function S() { return A.state(); }
  function hole(n) { return A.hole(n); }
  function mb(n) { return function () { return A.marble(n); }; }
  function mbs(l) { return function () { return l.map(function (n) { return A.marble(n); }).filter(Boolean); }; }
  function moved() { var s = S(); return s ? s.n : 0; }
  // a position from the holes each color holds: yours (Black) and Jamie's (White)
  function rows(mine, theirs) {
    var C = A.core, g = []; for (var i = 0; i < C.N; i++) g.push(0);
    mine.split(' ').forEach(function (n) { g[C.idx(n)] = C.BLACK; }); theirs.split(' ').forEach(function (n) { g[C.idx(n)] = C.WHITE; });
    return C.grid(g);
  }
  // your F3 and Jamie's F4 and F5 in row F, so a marble on F6 traps the two
  var TRAP = rows('F3 G3 E6 H5', 'F4 F5 E4 G5');
  // later on: your three in row E with both ends open
  var FOUR = rows('E3 E4 E5 G4 F7 D6', 'F4 F5 D4 G6 E8 H5 F6');

  Kit.demoScript({
    intro: 'Here’s how marbles go down, how one is taken, and then you make five in a row to win.',
    beats: 10,
    end: 'Line up five of your marbles, and take one whenever you trap two of the other player’s.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      A.start({ mode: '2p', players: [{ name: me, cpu: false, side: 1 }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false, side: 2 }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play black, and black goes first. Each of you has 36 marbles, and five of yours in a straight line win the game.', { at: '.frame' });
      await D.tap(hole('F5'), { after: 350 });
      await D.say('A tap on a hole shows your marble there faintly. A second tap puts it down.', { at: hole('F5') });
      var n = moved();
      await D.tap(hole('F5'));
      await D.wait(function () { return moved() > n; }, 3000);
      await D.wait(500);
      await D.set(function () { A.set(TRAP, 1); });
      await D.say('A few turns later, two of ' + them + '’s marbles lie in a row next to yours on F3.', { at: mbs(['F3', 'F4', 'F5']) });
      await D.you(hole('F6'), 'Your turn. Tap F6, then tap your marble again to trap the two.', { until: function () { return !!A.pend; } });
      await D.say('Your marble on F6 traps exactly two of ' + them + '’s between two of yours, so you have to take one of them.', { at: mbs(['F4', 'F5']) });
      await D.you(mb('F5'), 'Tap the marble on F5 to take it.', { until: function () { return moved() > 0; } });
      await D.wait(1700);
      await D.say('The marble went back to ' + them + ', who can place it again later, but not on F5 this turn. The red cross marks that hole.', { at: hole('F5') });
      n = moved();
      await D.tap(hole('G6'), { after: 300 });
      await D.tap(hole('G6'));
      await D.wait(function () { return moved() > n; }, 3000);
      await D.wait(700);
      await D.set(function () { A.set(FOUR, 1, [1, 0]); });
      await D.say('Later still, you have three in a row on E3, E4 and E5, with both ends of the line open.', { at: mbs(['E3', 'E4', 'E5']) });
      await D.you(hole('E6'), 'Tap E6 twice to make four in a row.', { until: function () { return moved() > 0; } });
      await D.wait(1200);
      await D.say('Now you can make five on E2 or on E7, and the dashed rings show both. ' + them + ' can block only one.', { at: function () { return [A.hole('E2')(), A.hole('E7')()]; } });
      n = moved();
      await D.tap(hole('E7'), { after: 300 });
      await D.tap(hole('E7'));
      await D.wait(function () { return moved() > n; }, 3000);
      await D.wait(600);
      await D.you(hole('E2'), 'Your turn. Tap E2 twice to make five in a row.', { until: function () { return S().over; } });
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 9000);
      await D.wait(500);
      await D.say('Five of your marbles in a straight line, so you win the game.', { at: '.k-win .rank', pos: 'above' });
    }
  });
})();
