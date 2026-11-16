// 2048's demo (demo.js; CLAUDE.md, Demos): late in a game, with 1024, 512, 256 and 128 lined up along the top row. A first
// swipe shows tiles sliding and two 4s joining; you swipe up to join the 128s, and three swipes left run the chain all the
// way to 2048.
(function () {
  'use strict';
  var G = window.__g2048;
  function S() { return G.get(); }
  function slot(i) { return function () { return document.querySelectorAll('#slots i')[i]; }; }
  // the tile showing a number (the last one found, row by row: the one a join just made)
  function tile(v) {
    return function () {
      var best = null, bi = -1;
      document.querySelectorAll('#tiles .tile:not(.gone)').forEach(function (t) {
        var f = t.firstChild; if (!f || f.textContent !== String(v)) return;
        var i = +t.style.getPropertyValue('--y') * 4 + +t.style.getPropertyValue('--x');
        if (i > bi) { bi = i; best = t; }
      });
      return best;
    };
  }
  function topRow() { return [0, 1, 2, 3].map(function (i) { return document.querySelectorAll('#slots i')[i]; }); }
  function moves() { var s = S(); return s ? s.moves : 0; }
  // a swipe across the tray: the finger presses on one slot and carries to another
  async function swipe(D, a, b) {
    var n = moves();
    await D.drag(slot(a), slot(b), { after: 250 });
    await D.wait(function () { return moves() > n; }, 2000);
    await D.wait(450);
  }

  Kit.demoScript({
    intro: 'Here’s how the tiles slide and join, and then you help build the 2048 tile.',
    beats: 9,
    end: 'Swipe to slide every tile at once, join matching numbers, and keep your biggest tile in a corner.',
    start: function () {
      G.set([1024, 512, 256, 128,
             8, 4, 4, 128,
             2, 0, 0, 0,
             0, 2, 0, 0], 16840);
      var s = S();
      s.moves = 912; s.best0 = 0; s.marks = { 512: 700, 1024: 860 }; s.first = { 64: 300, 128: 420, 256: 560, 512: 700, 1024: 860 };
      G.set(s.cells.map(function (c) { return c ? c.v : 0; }), 16840);
    },
    steps: async function (D) {
      await D.say('Swipe the tray, and every tile slides as far as it can that way.', { at: '#tray' });
      await swipe(D, 8, 11);
      await D.say('The two 4s bumped together and joined into an 8. Every join adds the new number to your score.', { at: tile(8) });
      await D.say('After each swipe, a new 2 or 4 drops into an empty square.', { at: '#tray', wait: 3000 });
      await D.say('Your 1024 sits in the corner, with 512, 256 and 128 lined up beside it. That’s how the big tiles get built.', { at: topRow, pos: 'above', avoid: '#tray' });
      var n = moves();
      if (D.auto) { await D.say('Swipe up to bring the two 128s together.', { at: '#tray', wait: 1200 }); await swipe(D, 13, 1); }
      else await D.you('#tray', 'Swipe up to bring the two 128s together.', { until: function () { return moves() > n; } });
      await D.wait(600);
      await D.say('The 128s made a 256, right beside the other 256. Now every swipe to the left joins a pair.', { at: topRow, pos: 'above', avoid: '#tray' });
      await swipe(D, 3, 0);
      await D.say('The 256s made 512, and that 512 sits next to the other one.', { at: topRow, pos: 'above', avoid: '#tray', wait: 2800 });
      await swipe(D, 3, 0);
      await D.say('Two 512s make 1024. One more swipe.', { at: topRow, pos: 'above', avoid: '#tray', wait: 2400 });
      await swipe(D, 3, 0);
      await D.wait(900);
      await D.say('Two 1024s join into 2048, and that wins the game! You can keep going for 4096 if you like.', { pos: 'top' });
    }
  });
})();
