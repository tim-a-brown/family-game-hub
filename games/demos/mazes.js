// Mazes' demo (demo.js; CLAUDE.md, Demos): the daily maze card on the setup, then an Easy Pencil maze. The finger draws the
// line from Start along the first corridors, and you draw the rest of the way to Finish.
(function () {
  'use strict';
  var Z = window.__maze, MC = window.MazeCore;
  var SEED = 100010;   // an Easy winding maze whose way out is 21 squares in 7 straight runs
  function M() { return Z.maze(); }
  function svg() { return document.querySelector('svg.mzs'); }
  function nib() { return document.querySelector('svg.mzs circle.nib'); }
  // an invisible point at a square's middle, for the finger to carry the line to
  function spot(c) {
    return function () {
      var s = svg(); if (!s) return null;
      var g = s.querySelector('#mzc') || s, n = g.querySelector('circle.dm-spot[data-c="' + c + '"]');
      if (!n) {
        var p = MC.center(M(), c, Z.view().tr);
        n = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        n.setAttribute('class', 'dm-spot'); n.setAttribute('data-c', c); n.setAttribute('cx', p[0]); n.setAttribute('cy', p[1]); n.setAttribute('r', MC.U * 0.12);
        n.setAttribute('fill', 'none'); n.style.pointerEvents = 'none';
        g.appendChild(n);
      }
      return n;
    };
  }
  // the way out as the squares where it turns (the end of each straight run)
  function corners() {
    var s = M().solution, out = [];
    for (var i = 1; i < s.length; i++) if (i === s.length - 1 || s[i] - s[i - 1] !== s[i + 1] - s[i]) out.push(s[i]);
    return out;
  }
  function head() { var st = Z.state(); return st ? st.head : -1; }
  async function drawTo(D, c) {
    await D.drag(nib, spot(c), { after: 120 });
    await D.wait(function () { return head() === c; }, 1200);
  }

  Kit.demoScript({
    intro: 'Here’s the daily maze, and then you draw your way out of a Pencil maze.',
    beats: 6,
    end: 'Drag the line from Start to Finish along the corridors, and drag back to rub out a wrong turn.',
    start: function () {},
    steps: async function (D) {
      await D.say('Every day there’s a new daily maze, the same for everyone. Solve it each day to keep a streak going.', { at: '.mz .daily' });
      await D.set(function () { var me = (localStorage.getItem('my_name') || '').trim() || 'You'; Z.newGame({ mode: 'pencil', size: 'easy', shape: 'square', paths: 'winding', seed: SEED, name: me }); });
      await D.wait(500);
      await D.say('Each maze has exactly one way from Start to Finish. In Pencil, you draw it with your finger.', { at: 'svg.mzs' });
      var cs = corners(), mine = 3;
      await D.say('Put your finger down and drag. The red line follows the corridors and stops at the walls.', { at: nib, wait: 2800 });
      for (var i = 0; i < cs.length - mine; i++) await drawTo(D, cs[i]);
      await D.wait(300);
      await D.say('Took a wrong turn? Drag back along your line, and it rubs itself out.', { at: 'svg.mzs', wait: 3200 });
      if (D.auto) {
        await D.say('Your turn. Draw the rest of the way to Finish.', { at: 'svg.mzs', wait: 1200 });
        for (i = cs.length - mine; i < cs.length; i++) await drawTo(D, cs[i]);
      } else await D.you('svg.mzs', 'Your turn. Draw the rest of the way to Finish.', { until: function () { var st = Z.state(); return st && st.solved; } });
      await D.wait(2600);
      await D.say('You’re out! The time is written on the page, and a daily maze adds a day to your streak.', { pos: 'top' });
    }
  });
})();
