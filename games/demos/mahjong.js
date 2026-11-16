// Mahjong Tiles' demo (demo.js; CLAUDE.md, Demos): the Mini layout with five pairs left. It shows which tiles are free,
// takes a pair, you take the next one, and the last three pairs clear the table.
(function () {
  'use strict';
  var MJ = window.__mj;
  function S() { return MJ.get(); }
  function tile(i) { return function () { return MJ.tile(i); }; }
  function both(p) { return function () { return [MJ.tile(p[0]), MJ.tile(p[1])]; }; }
  function taken() { return S().pairs.length; }
  // "two 3 Bamboo tiles", or for the flowers and seasons, which match any of their own kind, "two Flowers"
  function pairName(p) { var n = MJ.name(p[0]); return /^two /.test(n) ? n : 'two ' + n + ' tiles'; }
  var SOL, LEFT = 5;
  async function take(D, p, after) {
    var n = taken();
    await D.tap(tile(p[0]), { after: 250 });
    await D.tap(tile(p[1]), { after: 250 });
    await D.wait(function () { return taken() > n; }, 2000);
    await D.wait(after != null ? after : 500);
  }

  Kit.demoScript({
    intro: 'Here’s how to find a pair you can take, and then you take one.',
    beats: 7,
    end: 'Match two free tiles with the same face to take them off, and plan ahead so you never get stuck.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      MJ.start('mini', me);
      SOL = MJ.solution();
      var s = S();
      SOL.slice(0, SOL.length - LEFT).forEach(function (p) { s.gone[p[0]] = s.gone[p[1]] = true; s.pairs.push([p[0], p[1], s.k[p[0]]]); });
      SOL = SOL.slice(SOL.length - LEFT);
      s.time = 212;
      MJ.redraw();
    },
    steps: async function (D) {
      await D.say('Clear the table by taking matching tiles off in pairs. Ten tiles are left here.', { at: '.mjw .bd' });
      var blk = D.qa('.mjw .bd .t:not(.out).blk')[0];
      if (blk) await D.say('You can only take a free tile: nothing rests on top of it, and its left or right side is open. Blocked tiles look darker.', { at: blk });
      var p0 = SOL[0], p1 = SOL[1];
      await D.say('These ' + pairName(p0) + ' are both free, so they make a pair. Tap one, then the other.', { at: both(p0) });
      await take(D, p0, 700);
      await D.you(both(p1), 'Your turn. Take the ' + pairName(p1) + '.', {
        allow: [tile(p1[0]), tile(p1[1])], until: function () { return taken() >= S().gone.length / 2 - 3; },
        autoTap: function () { var a = MJ.tile(p1[0]); return a && a.classList.contains('sel') ? MJ.tile(p1[1]) : a; }
      });
      await D.wait(600);
      await D.say('Stuck? Hint lights up a pair you can take, and Shuffle mixes up the tiles that are left.', { at: function () { return D.qa('.mjw .sbar > .icon-btn').slice(1); } });
      await D.say('Three pairs to go.', { at: '.mjw .bd', wait: 1500 });
      for (var i = 2; i < SOL.length; i++) await take(D, SOL[i], 250);
      await D.wait(2200);
      await D.say('The table is clear! Your time goes on the best times for the Mini.', { pos: 'top' });
    }
  });
})();
