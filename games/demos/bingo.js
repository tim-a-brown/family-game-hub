// Bingo's demo (demo.js; CLAUDE.md, Demos): three players' cards on the screen. You draw the first ball, every card is
// marked as the balls are called, Tim's middle row comes down to one ball, and you draw the ball that makes it Bingo.
(function () {
  'use strict';
  var X = window.__bingo;
  function S() { return X.state(); }
  var me = 'You', P = [];
  var GRIDS = [
    [3, 18, 33, 48, 63, 11, 25, 38, 50, 71, 7, 22, 0, 53, 68, 14, 29, 42, 57, 74, 1, 16, 44, 59, 66],
    [5, 20, 40, 47, 62, 9, 27, 31, 52, 68, 12, 17, 0, 55, 70, 2, 30, 36, 49, 73, 15, 24, 43, 58, 64],
    [7, 19, 35, 50, 61, 4, 26, 39, 46, 72, 13, 21, 0, 51, 65, 10, 28, 34, 60, 69, 6, 23, 45, 54, 75]];
  var BALLS = [7, 40, 22, 68, 50, 53];   // in the order they come out of the cage
  function L(n) { return 'BINGO'.charAt(Math.floor((n - 1) / 15)); }
  function board(i) { return function () { return document.querySelectorAll('.k-boards .kb')[i] || null; }; }
  function cells(n) { return function () { return document.querySelectorAll('.kb .kc[aria-label="' + L(n) + ' ' + n + '"]'); }; }
  function drawn() { return S().drawn.length; }
  async function draw(D, say) {
    var n = drawn();
    await D.tap('.drawbtn', say ? { say: say } : null);
    await D.wait(function () { return drawn() > n && !X.busy(); }, 4000);
    await D.wait(500);
  }

  Kit.demoScript({
    intro: 'Here’s how a game of Bingo goes with three players. You’ll draw the balls.',
    beats: 10,
    end: 'Draw a ball, and every card that has its number is marked. The first to cover a line shouts Bingo!',
    start: function () {
      me = (localStorage.getItem('my_name') || '').trim() || 'You';
      P = [me].concat(['Jamie', 'Pete', 'Sam'].filter(function (n) { return n !== me; }).slice(0, 2));
      X.cards({ options: { pattern: 'line' }, players: P.map(function (n, k) { return { name: n, color: Kit.color(k) }; }) }, function (s) {
        var rest = [];
        for (var n = 1; n <= 75; n++) if (BALLS.indexOf(n) < 0) rest.push(n);
        for (var i = rest.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
        s.deck = rest.concat(BALLS.slice().reverse());   // (balls are drawn from the end)
        s.players.forEach(function (p, k) { p.grid = GRIDS[k].slice(); });
      });
    },
    steps: async function (D) {
      await D.say('Everyone at the table gets their own card on the screen. Nothing on them is secret, so they all show at once.', { at: function () { return [board(0)(), board(1)()]; } });
      await D.say('A card has five columns, B, I, N, G and O. The star in the middle is a free space, already covered.', { at: board(0) });
      await D.you('.drawbtn', 'Tap Draw ball to roll the first ball out of the cage.', { until: function () { return drawn() >= 1 && !X.busy(); } });
      await D.wait(500);
      await D.say('B 7! ' + P[0] + ' and ' + P[2] + ' both have 7, so their squares are marked for them.', { at: cells(7) });
      await draw(D, 'Each ball is called out, and every card with that number is marked.');
      await draw(D);
      await draw(D);
      await D.say(P[0] + ' needs just one more ball. The square that would finish the middle row glows.', { at: function () { return board(0)().querySelector('.kc.need'); } });
      await D.you('.drawbtn', 'Draw the next ball.', { until: function () { return drawn() >= 5 && !X.busy(); } });
      await D.wait(400);
      await D.say('G 50 is on ' + P[0] + '’s card and ' + P[2] + '’s, but not in the middle row. Try again.', { at: cells(50) });
      await D.you('.drawbtn', 'Draw one more ball.', { until: function () { return drawn() >= 6; } });
      await D.wait(function () { return document.querySelector('.k-win .rank') || document.querySelector('.k-win'); }, 8000);
      await D.wait(1400);
      await D.say('G 53 finished ' + P[0] + '’s middle row, so ' + P[0] + ' wins! Keep calling to play on for second place.', { at: function () { return document.querySelector('.k-win .rank') || document.querySelector('.k-win .card'); } });
    }
  });
})();
