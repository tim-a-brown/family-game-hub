// Backgammon's demo (demo.js; CLAUDE.md, Demos): a game against the computer. You open with 3 and 1, moving two
// checkers to make your 5 point; later you hit Bender's lone checker and send it to the bar; at the end you bear off
// your last two checkers, a gammon.
(function () {
  'use strict';
  var B = window.__bg;
  function S() { return B.state(); }
  function pt(n) { return function () { return document.querySelector('.bboard button.hit[aria-label="Point ' + n + '"]'); }; }
  // the checkers of one color standing on a point (w: yours, b: Bender's)
  function cks(n, c) {
    return function () {
      var h = pt(n)(); if (!h) return null;
      var r = h.getBoundingClientRect();
      var l = [].slice.call(document.querySelectorAll('.bboard .ck.' + c)).filter(function (e) { var q = e.getBoundingClientRect(), x = q.left + q.width / 2; return x > r.left && x < r.right && q.top < r.bottom && q.bottom > r.top; });
      return l.length ? l : h;
    };
  }
  function bar() { return [].slice.call(document.querySelectorAll('.bboard .ck.b')).filter(function (e) { var b = document.querySelector('.bboard .barstrip').getBoundingClientRect(), q = e.getBoundingClientRect(), x = q.left + q.width / 2; return x > b.left && x < b.right; }); }
  function picked() { return !!document.querySelector('.bboard .ck.sel'); }
  function used(k) { return function () { var s = S(); return s.phase !== 'move' || s.left.length <= k; }; }
  function pos(w, b) { var p = []; for (var i = 0; i < 24; i++) p.push((w[i + 1] || 0) - (b[i + 1] || 0)); return p; }

  Kit.demoScript({
    intro: 'Here’s how Backgammon goes. You’ll make the opening move and bear off your last checkers.',
    beats: 15,
    end: 'Move your checkers home by the dice, hit lone checkers when you can, and be first to bear off all fifteen.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      B.rig([3, 1]);
      B.start({ level: 'med', players: [{ name: me, cpu: false }, { name: 'Bender', cpu: true }] });
    },
    steps: async function (D) {
      await D.wait(function () { return !!document.querySelector('.bboard .ck.can'); }, 4000);
      await D.say('You play the white checkers. They race around the board to your home, these six points in the bottom right corner, and then off the board.', { at: function () { return [1, 2, 3, 4, 5, 6].map(function (n) { return pt(n)(); }); } });
      await D.say('You rolled a 3 and a 1. You move one checker 3 points and one checker 1 point.', { at: '.dicebox' });
      await D.you(cks(8, 'w'), 'Tap one of your checkers on the 8 point.', { allow: [pt(8)], autoTap: pt(8), until: picked });
      await D.you(pt(5), 'The gold points show where it can go. Tap the 5 point to move it 3.', { until: used(1) });
      await D.wait(500);
      await D.tap(pt(6), { after: 260 });
      await D.tap(pt(5));
      await D.wait(600);
      await D.say('Two of your checkers on one point make it yours. Bender can’t land there now.', { at: cks(5, 'w') });
      await D.wait(function () { var s = S(); return s.cur === 0 && s.phase === 'roll'; }, 15000);
      await D.say('Bender rolled and moved too. Turns go back and forth like this.', { at: '.btag.on', wait: 2400 });

      // later: a lone checker of Bender's within reach
      await D.set(function () {
        B.set(function (s) {
          s.pos = { p: pos({ 24: 2, 13: 4, 8: 2, 6: 4, 5: 2, 3: 1 }, { 1: 2, 9: 1, 12: 3, 17: 3, 19: 4, 21: 2 }), bar: [0, 0], off: [0, 0] };
          s.cur = 0; s.phase = 'move'; s.dice = [4, 2]; s.left = [4, 2]; s.opening = null;
        });
      });
      await D.say('Now we skip ahead to later in the game.', { pos: 'center', ring: false, wait: 2200 });
      await D.say('Bender has a lone checker on your 9 point. A single checker can be hit.', { at: cks(9, 'b') });
      B.rig([6, 1]);
      await D.tap(pt(13), { after: 260 });
      await D.tap(pt(9));
      await D.wait(700);
      await D.say('A hit sends that checker to the bar in the middle. Bender has to bring it back in through your home before moving anything else.', { at: bar });
      await D.tap(pt(8), { after: 260 });
      await D.tap(pt(6));
      await D.wait(function () { var s = S(); return s.cur === 0 && s.phase === 'roll'; }, 15000);
      await D.say('Bender rolled a 6 and a 1. Your 6 point was blocked, so the checker came in with the 1.', { at: '.bboard', wait: 3600 });

      // the end of the game: two checkers left to bear off
      await D.set(function () {
        B.set(function (s) {
          s.pos = { p: pos({ 6: 1, 4: 1 }, { 13: 1, 16: 2, 19: 3, 20: 3, 21: 2, 22: 2, 23: 1, 24: 1 }), bar: [0, 0], off: [13, 0] };
          s.cur = 0; s.phase = 'roll'; s.dice = []; s.left = []; s.opening = null;
        });
      });
      await D.say('Now it’s the end of the game. Once all your checkers are home, you bear them off the board.', { at: '.traystrip' });
      B.rig([6, 4]);
      await D.tap('.ctrl .btn-primary');
      await D.wait(function () { return !!document.querySelector('.bboard .ck.can'); }, 4000);
      await D.say('You rolled a 6 and a 4, exactly what your last two checkers need.', { at: '.dicebox' });
      await D.you(cks(6, 'w'), 'Tap your checker on the 6 point.', { allow: [pt(6)], autoTap: pt(6), until: picked });
      await D.you('.offhit', 'Now tap the glowing tray to bear it off.', { until: used(1) });
      await D.wait(400);
      await D.tap(pt(4), { after: 260 });
      await D.tap('.offhit');
      await D.wait(function () { return document.querySelector('.k-mo'); }, 6000);
      await D.wait(300);
      await D.say('You bore off all fifteen before Bender bore off any. That’s a gammon, and it counts double.', { at: '.k-mo' });
      await D.wait(function () { return document.querySelector('.k-win .card'); }, 6000);
      await D.wait(1200);
    }
  });
})();
