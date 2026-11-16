// Breakout's demo (demo.js; CLAUDE.md, Demos): a drag slides the paddle, a tap launches the ball into the Rainbow wall,
// a capsule widens the paddle, and then you keep the ball in play yourself with the ball slowed down. Between your turn
// and the end, the test autopilot keeps the paddle under the ball (window.__brk.autopilot), so no life is lost.
(function () {
  'use strict';
  var B = window.__brk;
  function S() { return B.get(); }
  // a part of the field as a target, in the field's own units (360 by 560)
  function spot(x, y, w, h) {
    return function () {
      var cv = B.canvas(); if (!cv || !cv.isConnected) return null;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () {
          var r = cv.getBoundingClientRect(), k = r.width / B.FW, xx = typeof x === 'function' ? x() : x;
          var l = r.left + (xx - w / 2) * k, t = r.top + (y - h / 2) * k; return { left: l, top: t, right: l + w * k, bottom: t + h * k, width: w * k, height: h * k };
        },
        contains: function (t) { return t === cv; }, dispatchEvent: function (e) { return cv.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  function padX() { var s = S(); return s ? s.pad.x : 180; }
  var paddle = spot(padX, B.PAD_Y + 6, 80, 26);
  var wall = spot(180, 95, 350, 100);
  var field = function () { return document.querySelector('.ar-cab'); };

  Kit.demoScript({
    intro: 'Here’s how to move the paddle and launch the ball, and then you keep the ball in play yourself.',
    beats: 8,
    end: 'Slide the paddle to bounce the ball back up, and break every brick to clear the wall. Catch the capsules for power-ups.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      B.start({ who: me, startLevel: 1 });
    },
    steps: async function (D) {
      await D.say('This is your paddle, with the ball resting on it. Your job is to break every brick in the wall above.', { at: paddle, pad: 8 });
      await D.say('Drag anywhere on the screen to slide the paddle left and right.', { at: field, wait: 1800 });
      await D.drag(spot(180, 400, 10, 10), spot(90, 400, 10, 10), { after: 150 });
      await D.drag(spot(90, 400, 10, 10), spot(200, 400, 10, 10), { after: 250 });
      await D.say('A tap launches the ball.', { at: paddle, pad: 8, wait: 1500 });
      B.autopilot(true);
      await D.tap(spot(180, 380, 40, 40), { after: 200 });
      await D.wait(function () { return S().stats.bricks >= 3; }, 8000);
      await D.say('Every brick the ball hits breaks. Higher rows score more points.', { at: wall });
      // a capsule falls onto the paddle while the ball is on its way up (the autopilot rests while it falls)
      await D.wait(function () { var b = S().balls[0]; return b && b.vy < 0 && b.y < 260; }, 6000);
      B.autopilot(false);
      B.setPad(padX());
      B.capsule('W');
      await D.say('Some bricks drop a capsule. Catch it with the paddle for a power-up, like this wider paddle.', { at: paddle, pad: 10, wait: false });
      await D.wait(function () { return S().pw.W > 0; }, 2500);
      B.autopilot(true);
      await D.wait(3200);
      // your turn: the ball slowed down, on its way up
      B.power('S');
      await D.wait(function () { var b = S().balls[0]; return b && b.vy < 0 && b.y < 300; }, 6000);
      var hits = S().stats.paddleHits, lives = S().lives;
      if (!D.auto) B.autopilot(false);
      await D.you(field, 'Your turn. Drag to keep the paddle under the ball and bounce it back up.', {
        pos: 'above', until: function () { var s = S(); return s.stats.paddleHits > hits || s.lives < lives; }
      });
      B.autopilot(true);
      if (S().lives < lives) {
        await D.wait(function () { return S().phase === 'serve'; }, 4000);
        await D.say('That one got past the paddle, so it cost a life. You have three to start with.', { at: '.ar-hud' });
        await D.tap(spot(180, 380, 40, 40), { after: 300 });
      } else {
        await D.say('Nice save! The spot where the ball hits the paddle steers it: near an end sends it off at an angle.', { at: paddle, pad: 10 });
      }
      await D.wait(1500);
      await D.say('If the ball gets past your paddle, you lose a life. Clear every brick to go on to the next wall.', { at: '.ar-hud' });
    }
  });
})();
