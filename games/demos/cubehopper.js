// Q*bert's demo (demo.js; CLAUDE.md, Demos): round 1 with most of the pyramid already changed and nobody else on it
// (no enemies come during the demo). Q*bert hops down a path of cubes still to change, then you finish the last three
// and clear the round.
(function () {
  'use strict';
  var Q = window.__qb;
  function g() { return Q.get() || {}; }
  function cv() { return document.querySelector('.ar-cab canvas'); }
  // the path still to change, from the top: dr, dr, dl (the demo), then dr, dl, dr (you)
  var PATH = [[1, 1], [2, 2], [3, 2], [4, 3], [5, 3], [6, 4]];
  function pt(get, r) {
    return function () {
      var c = cv(), p = get(); if (!c || !p) return null;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () { var q = c.getBoundingClientRect(), x = q.left + p.x / p.FW * q.width, y = q.top + p.y / p.FH * q.height, rr = r / p.FW * q.width; return { left: x - rr, top: y - rr * 1.3, right: x + rr, bottom: y + rr * 0.7, width: rr * 2, height: rr * 2 }; },
        contains: function (t) { return t === c; }, dispatchEvent: function (e) { return c.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  function qbert() { return pt(Q.qAt, 26); }
  function cells(list) { return function () { return list.map(function (rc) { return pt(function () { return Q.at(rc[0], rc[1]); }, 24)(); }).filter(Boolean); }; }
  function pad(d) { return function () { return document.querySelector('.qb-pad i.' + d); }; }
  function idle() { var s = g(); return s.q && !s.q.hop; }
  async function hop(D, d) { await D.tap(pad(d), { after: 120 }); await D.wait(idle, 1500); await D.wait(150); }
  // (tests and recordings: the hop that lands on a cube still to change)
  function nextHop() {
    var s = g(), r = s.q ? s.q.r : 0, c = s.q ? s.q.c : 0, D = { ul: [-1, -1], ur: [-1, 0], dl: [1, 0], dr: [1, 1] };
    for (var k in D) { var r2 = r + D[k][0], c2 = c + D[k][1]; if (r2 >= 0 && r2 < 7 && c2 >= 0 && c2 <= r2 && !Q.done(r2, c2)) return pad(k)(); }
    return pad('dr')();
  }

  Kit.demoScript({
    intro: 'Here’s how Q*bert hops, and then you finish a round yourself.',
    beats: 7,
    end: 'Hop diagonally to change every cube to the target color, and keep away from the edge and the bad guys.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      Q.begin(me);
      Q.noSpawn(); Q.clearEnemies();
      Q.leave(PATH);
    },
    steps: async function (D) {
      await D.wait(1600);   // (the round's name, shown as it starts)
      await D.say('This is Q*bert. Every cube he lands on changes to the round’s target color, and the round ends when every cube has changed.', { at: qbert() });
      await D.say('Most of this pyramid is done already. Six cubes down the middle still show their first color.', { at: cells(PATH), pad: 4 });
      await D.say('Q*bert only hops diagonally. Tap a corner of the pad to hop that way.', { at: '.qb-pad', pad: 6, wait: 2800 });
      await hop(D, 'dr');
      await hop(D, 'dr');
      await hop(D, 'dl');
      await D.say('Each cube he changes scores 25 points. Hopping off the edge costs a life, unless a spinning disc beside the pyramid catches him.', { at: '.ar-hud' });
      var c0 = (g().stats || {}).cubes || 0;
      await D.you('.qb-pad', 'Your turn. Hop onto the last three cubes that haven’t changed. You can also swipe across the pyramid.', {
        allow: function () { return [document.querySelector('.qb-pad'), document.querySelector('.ar-wrap')]; },
        autoTap: nextHop,
        until: function () { return ((g().stats || {}).cubes || 0) >= c0 + 3 || (g().stats || {}).rounds > 0; }
      });
      // (the next round would send enemies in: they stay away until the demo is over)
      var calm = setInterval(function () { Q.noSpawn(); }, 200);
      await D.wait(function () { return (g().stats || {}).rounds > 0; }, 3000);
      await D.wait(300);
      await D.say('Round clear! Every round brings new colors, and from level 2 a cube takes two hops to change.', { pos: 'top' });
      await D.say('Red balls bounce down the pyramid, Coily the snake chases you, and the green ball freezes them all when you catch it.', { at: cv });
    }
  });
})();
