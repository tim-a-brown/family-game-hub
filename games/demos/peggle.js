// Peggle's demo (demo.js; CLAUDE.md, Demos): the first level. A drag turns the launcher and lifting the finger shoots;
// the shot is aimed ahead of time (31.5 degrees, with the table's clock set as the finger lifts) so it lights 15 orange
// pegs, fills the meter to x3 and lands in the bucket for a free ball. Then you take a shot of your own.
(function () {
  'use strict';
  var P = window.__peg;
  var FW = 360, FH = 640, RAIL = 34, CW = FW + RAIL * 2;
  var AIM = 31.5, CLOCK = 12;
  function cv() { return document.querySelector('.pg-frame canvas'); }
  function g() { return P.get() || {}; }
  // a box on the board, in the board's own units (360 by 640 between the rails), as a target
  function box(x0, y0, x1, y1) {
    return function () {
      var c = cv(); if (!c || !c.isConnected) return null;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () {
          var r = c.getBoundingClientRect(), sx = r.width / CW, sy = r.height / FH;
          var b = { left: r.left + (x0 + RAIL) * sx, top: r.top + y0 * sy, right: r.left + (x1 + RAIL) * sx, bottom: r.top + y1 * sy };
          b.width = b.right - b.left; b.height = b.bottom - b.top; return b;
        },
        contains: function (t) { return t === c; }, dispatchEvent: function (e) { return c.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  function at(x, y) { return box(x - 2, y - 2, x + 2, y + 2); }
  // the right rail with the meter
  function meter() {
    return function () {
      var c = cv(); if (!c) return null;
      var o = box(0, 0, 1, 1)(); o.getBoundingClientRect = function () { var r = c.getBoundingClientRect(), sx = r.width / CW; return { left: r.right - RAIL * sx, top: r.top, right: r.right, bottom: r.bottom, width: RAIL * sx, height: r.height }; };
      return o;
    };
  }
  function bucket() { var p = P.pieces(), x = p && p.bucket != null ? p.bucket : 180; return box(x - 36, 588, x + 36, 626)(); }
  // the drag that turns the launcher to AIM: the board turns 0.32 degrees for each unit the finger moves
  var pin = null;
  window.addEventListener('pointerup', function () { if (pin != null) { P.aim(pin); P.clock(CLOCK); pin = null; } }, true);

  Kit.demoScript({
    intro: 'Here’s how to aim, shoot and clear the orange pegs.',
    beats: 7,
    end: 'Drag to aim and lift your finger to shoot. Clear every orange peg before your 10 balls run out.',
    start: function () {
      P.start(1, 'guide');
    },
    steps: async function (D) {
      await D.wait(1600);   // (the level's name, shown as it starts)
      await D.say('Clear all 25 orange pegs to win the level. You have 10 balls to do it.', { at: box(0, 60, 360, 560) });
      await D.say('Drag left or right on the board to turn the launcher at the top. When you lift your finger, it shoots.', { at: box(140, 0, 220, 60), pad: 8 });
      var dx = AIM / 0.32;
      pin = AIM;
      await D.drag(at(110, 420), at(110 + dx, 420), { after: 300 });
      await D.wait(900);
      await D.say('Every peg the ball touches lights up, and the orange ones count toward clearing the level.', { pos: 'top', wait: false });
      await D.wait(function () { var s = g(); return (s.stats && s.stats.freeBucket > 0) || s.state !== 'fly'; }, 40000);
      if (g().stats.freeBucket > 0) await D.say('The ball dropped into the moving bucket at the bottom, so you get that ball back.', { at: bucket, wait: 3200 });
      else await D.say('When the ball falls out the bottom, the lit pegs clear. Land it in the moving bucket and you get the ball back.', { at: bucket, wait: 3600 });
      await D.wait(function () { return g().state === 'aim'; }, 12000);
      await D.wait(500);
      var n = g().orangeHit, m = g().mult;
      await D.say(m >= 2 ? 'That shot cleared ' + n + ' orange pegs. The meter on the right fills as you hit them, and now every point counts ' + ({ 2: 'double', 3: 'three times', 5: 'five times', 10: 'ten times' }[m] || m + ' times') + '.'
        : 'That shot cleared ' + n + (n === 1 ? ' orange peg' : ' orange pegs') + '. The meter on the right fills as you hit them, and from 10, every point counts double.', { at: meter() });
      await D.you(box(20, 300, 340, 560), 'Your turn. Drag across the board to aim, then lift your finger to shoot.', {
        allow: function () { return [box(0, 0, 360, 640)(), document.querySelector('.pg-fire')].concat([].slice.call(document.querySelectorAll('.pg-nudge'))); },
        until: function () { var s = g(); return s.shots && s.shots.length >= 2 || s.state === 'fly'; }
      });
      await D.wait(function () { return g().state === 'aim' || g().state === 'done'; }, 20000);
      await D.wait(600);
      await D.say('Hitting a green peg sets off your power. This level’s power is the Super Guide, a longer aiming line for your next three shots.', { at: '.pg-pw' });
    }
  });
})();
