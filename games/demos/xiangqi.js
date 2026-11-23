// Xiangqi's demo (demo.js; CLAUDE.md, Demos): the first moves show the points, the river, the Cannon and the Horse; you
// capture with a Cannon over its screen; then, on set positions, a Horse whose leg is blocked, a Horse that may not
// leave the file between the two Generals, and you finish with the two Chariots' checkmate.
(function () {
  'use strict';
  var Q = window.__xq, X = Q.X;
  function S() { return Q.state(); }
  function plies() { var s = S(); return s && s.g ? s.g.pl.length : 0; }
  // the piece on a point, or the mark on it while a piece is chosen
  function at(n) { return function () { var s = X.sqOf(n); return document.querySelector('.bd .layer .pc[data-s="' + s + '"]:not(.gone)') || document.querySelector('.bd .mk[data-s="' + s + '"]:not(.from):not(.to)'); }; }
  function pts(list) { return function () { return list.map(function (n) { return at(n)(); }).filter(Boolean); }; }
  function marks() { return document.querySelectorAll('.bd .mk.mv, .bd .mk.cap, .bd .mk.blk, .bd .mk.face'); }
  async function move(D, a, z, o) {
    o = o || {};
    var n = plies();
    await D.tap(at(a), { after: o.pause != null ? o.pause : 420 });
    if (o.say) await D.say(o.say, { at: o.ringAt || at(a), avoid: [marks] });
    await D.tap(at(z), { after: 300 });
    await D.wait(function () { return plies() > n; }, 3000);
    await D.wait(o.after != null ? o.after : 750);
  }

  Kit.demoScript({
    intro: 'Here’s how the pieces of Chinese chess move, and then you finish a game with a checkmate.',
    beats: 12,
    end: 'Every piece has its own way to move. Keep your General safe in its palace, and trap theirs.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      Q.start({ mode: '2p', letters: true, players: [{ name: me, cpu: false, side: 1 }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false, side: -1 }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play Red, and Red moves first. The pieces stand where the lines cross, and the river runs across the middle.', { at: '.bd', pos: 'below' });
      await move(D, 'h3', 'e3', { say: 'A Cannon moves like a Chariot, any distance in a straight line.' });
      await move(D, 'h10', 'g8', { pause: 260, after: 400 });
      await D.say('A Cannon captures by jumping over exactly one piece, its screen, to take the piece behind it.', { at: pts(['b3', 'b8', 'b10']) });
      await D.you(at('b3'), 'Your move. Tap your Cannon on the left.', { until: function () { var s = S(); return !!(s && document.querySelector('.bd .pc.lift')); } });
      await D.you(at('b10'), 'The black Cannon is the screen. Tap the Horse behind it to capture it.', {
        avoid: [at('b3')], until: function () { return plies() > 2; }, autoTap: function () { return at('b10')(); }
      });
      await D.wait(1100);
      // a Horse with its leg blocked
      await D.set(function () { Q.set([['e1', 1], ['d10', -1], ['c3', 4], ['c4', 7], ['f10', -2], ['g7', -7], ['b8', -6]], 1); });
      await D.you(at('c3'), 'Now another game. Tap your Horse.', { until: function () { return !!document.querySelector('.bd .pc.lift'); } });
      await D.say('A Horse steps one point straight, then one diagonally. Your Soldier stands on its first step, so the crossed points are blocked.', { at: pts(['c4', 'b5', 'd5']), avoid: [marks] });
      // the flying General
      await D.set(function () { Q.set([['e1', 1], ['e10', -1], ['e5', 4], ['d10', -2], ['a7', -7], ['h3', 6]], 1); });
      await D.you(at('e5'), 'Tap the Horse between the two Generals.', { until: function () { return !!document.querySelector('.bd .pc.lift'); } });
      await D.say('The two Generals may never face each other on an open file, so this Horse can’t move at all.', { at: pts(['e1', 'e5', 'e10']), avoid: [marks] });
      // the two Chariots' mate
      await D.set(function () { Q.set([['d1', 1], ['e10', -1], ['a9', 5], ['b8', 5], ['h8', -4], ['g7', -7], ['c4', 7]], 1); });
      await D.you(at('b8'), 'Your left Chariot guards the second rank. Tap your other Chariot.', { until: function () { return !!document.querySelector('.bd .pc.lift'); } });
      await D.you(at('b10'), 'Now tap the far rank to check the General along it.', {
        until: function () { var s = S(); return s && s.over; }, autoTap: function () { return at('b10')(); }
      });
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 6000);
      await D.wait(500);
      await D.say('Checkmate! ' + them + '’s General is in check with no point to move to, so you win.', { at: '.k-win h2', pos: 'above' });
    }
  });
})();
