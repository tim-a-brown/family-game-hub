// Mini Golf's demo (demo.js; CLAUDE.md, Demos): Mini Golf is the scorecard for a round played at a real course. The first
// hole is scored stroke by stroke and you score your own hole in one; then the demo skips to the last hole and you finish
// the round.
(function () {
  'use strict';
  var X = window.__mg;
  function S() { return X.state(); }
  var me = 'You', P = [];
  var PAR = [2, 2, 3, 2, 3, 2, 2, 3, 2];
  var EARLY = [[1, 2, 3, 2, 3, 2, 2, 3], [2, 3, 2, 3, 3, 2, 3, 2], [3, 2, 3, 3, 4, 3, 2, 3]];   // holes 1 to 8, by player
  function row(i) { return function () { return document.querySelectorAll('.turf .prow')[i] || null; }; }
  function plus(i) { return function () { var r = row(i)(); return r && r.querySelector('.stk button:last-child'); }; }
  function next() { return document.querySelector('.holenav .btn-yellow'); }

  Kit.demoScript({
    intro: 'Here’s how scoring a round goes, for three players. You’ll score a hole in one.',
    beats: 12,
    end: 'Tap + for every stroke each player takes, then Next hole. After the last hole, the fewest strokes wins.',
    start: function () {
      me = (localStorage.getItem('my_name') || '').trim() || 'You';
      P = [me].concat(['Jamie', 'Pete', 'Sam'].filter(function (n) { return n !== me; }).slice(0, 2));
      X.start({ players: P.map(function (n) { return { name: n }; }), options: { holes: 9, cap: 6 } });
      X.set(function (s) { s.par = PAR.slice(); });
    },
    steps: async function (D) {
      await D.say('Mini Golf keeps the score while you play a round at a real course. Everyone in your group has a row.', { at: '.turf' });
      await D.say('Hole 1 is a par 2, which means a good player gets the ball in with two strokes. Tap the par to change it.', { at: '.parbtn' });
      await D.say(P[1] + ' took two strokes to get the ball in, so ' + P[1] + ' gets two taps on +.', { at: row(1), wait: false });
      await D.tap(plus(1), { after: 250 });
      await D.tap(plus(1), { after: 600 });
      await D.say(P[2] + ' needed three.', { at: row(2), wait: false });
      await D.tap(plus(2), { after: 200 });
      await D.tap(plus(2), { after: 200 });
      await D.tap(plus(2), { after: 600 });
      await D.you(plus(0), 'Your ball went in on the very first stroke. Tap + once for yourself.', { until: function () { return S().strokes[0][0] === 1; } });
      await D.wait(700);
      await D.say('One stroke is a hole in one!', { at: row(0), wait: 2000 });
      await D.tap(next, { say: 'Once everyone is in, tap Next hole.' });
      await D.wait(2000);
      await D.say('The scorecard fills in as you go, with each player’s total and how far over or under par they are.', { at: '.card' });
      await D.set(function () {
        X.set(function (s) {
          EARLY.forEach(function (l, i) { l.forEach(function (v, h) { s.strokes[i][h] = v; }); });
          s.strokes[1][8] = 2; s.strokes[2][8] = 2; s.hole = 8;
        });
      });
      await D.say('Now we skip ahead to the last hole. ' + P[1] + ' and ' + P[2] + ' both took two.', { at: '.turf' });
      await D.tap(plus(0), { after: 200, say: 'You took two as well.' });
      await D.tap(plus(0), { after: 700 });
      await D.you(next, 'Tap Finish round.', { until: function () { return S().over; } });
      await D.wait(function () { return document.querySelector('.k-win'); }, 5000);
      await D.wait(2200);
      await D.say('Fewest strokes wins. You finished with 20, one under par, and the round is kept in Past rounds with your hole in one.', { at: function () { return document.querySelector('.k-win .rank') || document.querySelector('.k-win .card'); } });
    }
  });
})();
