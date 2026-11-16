// Space Invaders' demo (demo.js; CLAUDE.md, Demos): stage 1 for one player. The joystick moves the round target and
// Fire shoots where it is; then you clear three invaders yourself, with the target easing onto the nearest invader
// whenever you let go of the stick (a forgiving aim for the demo only). The demo ends long before the shield could run out.
(function () {
  'use strict';
  var I = window.__inv;
  function g() { return I.get() || {}; }
  function cv() { return document.querySelector('.inv-box canvas'); }
  function kills() { var s = g().stats; return s ? s.kills || 0 : 0; }
  // a point of the playfield (its own 400-wide units) as a target
  function spot(fx, fy, r) {
    return function () {
      var c = cv(), s = g(); if (!c || !s.WW) return null;
      var x = typeof fx === 'function' ? fx() : fx, y = typeof fy === 'function' ? fy() : fy;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () { var q = c.getBoundingClientRect(), px = q.left + x / s.WW * q.width, py = q.top + y / s.WH * q.height, rr = (r || 16) / s.WW * q.width; return { left: px - rr, top: py - rr, right: px + rr, bottom: py + rr, width: rr * 2, height: rr * 2 }; },
        contains: function (t) { return t === c; }, dispatchEvent: function (e) { return c.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  // a box on the playfield, as fractions of its width and height
  function box(x0, y0, x1, y1) {
    return function () {
      var c = cv(); if (!c) return null;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () { var q = c.getBoundingClientRect(); return { left: q.left + x0 * q.width, top: q.top + y0 * q.height, right: q.left + x1 * q.width, bottom: q.top + y1 * q.height, width: (x1 - x0) * q.width, height: (y1 - y0) * q.height }; },
        contains: function (t) { return t === c; }, dispatchEvent: function (e) { return c.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  function aimSpot() { return spot(function () { return g().aim.x; }, function () { return g().aim.y; }, 22); }
  function stick() { return document.querySelector('.inv-sz:not(.c2) .inv-stick'); }
  function fireBtn() { return document.querySelector('.inv-fire'); }
  // a point beside the stick's middle, pushed toward (dx, dy) on the screen, as a target for the finger
  function push(dx, dy) {
    return function () {
      var b = stick(); if (!b) return null;
      var r = b.getBoundingClientRect(), m = Math.hypot(dx, dy) || 1, R = r.width * 0.3, x = r.left + r.width / 2 + dx / m * R, y = r.top + r.height / 2 + dy / m * R;
      return { nodeType: 1, isConnected: true, tagName: 'DIV', getBoundingClientRect: function () { return { left: x - 2, top: y - 2, right: x + 2, bottom: y + 2, width: 4, height: 4 }; },
        contains: function (t) { return t === b || b.contains(t); }, dispatchEvent: function (e) { return b.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  // steer the target to (x, y) with the joystick: the stick is pushed the way the target must go (the other way when
  // the controls are reversed) and held while the target travels there, eased by the demo so it stops on the spot
  async function steer(D, x, y) {
    var s = g(), a0 = s.aim, dx = x - a0.x, dy = y - a0.y;
    var px = s.set.invX ? -dx : dx, py = s.set.invY ? -dy : dy;
    var held = push(px, py), legs = [held, held, held, held, held, held];
    var t0 = 0, iv = setInterval(function () {
      if (!I.stickOn()) { if (t0) I.setAim(x, y); return; }
      if (!t0) t0 = Date.now();
      var k = Math.min(1, (Date.now() - t0) / 1300), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      I.setAim(a0.x + dx * e, a0.y + dy * e);
    }, 16);
    try { await D.drag(push(0, 0), legs, { after: 100 }); } finally { clearInterval(iv); }
    I.setAim(x, y);
  }
  function nearest() {
    var s = g(), v = I.firstInv('std') || I.firstInv();
    return v || { x: s.WW / 2, y: s.WH * 0.3 };
  }

  Kit.demoScript({
    intro: 'Here’s how to aim your cannons and blast the invaders.',
    beats: 7,
    end: 'Push the joystick to move the target, hold Fire to shoot, and stop the invaders before they reach your bunkers.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      I.begin(me);
      I.stop();
    },
    steps: async function (D) {
      await D.say('The invaders march down toward your base. Your two cannons in the bottom corners shoot at the round target.', { at: aimSpot() });
      I.go();
      var rev = g().set.invX || g().set.invY;
      await D.say(rev ? 'Push the joystick to move the target. It’s reversed like a mounted gun, so the target goes the other way from your push.' : 'Push the joystick to move the target. A little push moves it slowly, and a big push moves it fast.', { at: stick, pad: 8 });
      await D.wait(function () { return !!I.firstInv('std'); }, 8000);   // (the invaders fly in to their places first)
      var v = nearest();
      await steer(D, v.x, v.y);
      await D.say('Hold Fire for a stream of shots. Every shot lands right where the target is.', { at: fireBtn, pad: 8, wait: 2400 });
      var hold = fireBtn, legs = [hold, hold, hold, hold, hold, hold, hold, hold];
      var k0 = kills();
      // (the target stays on the invader the demo is shooting)
      var follow = setInterval(function () { var n = nearest(); var a = g().aim; I.setAim(a.x + (n.x - a.x) * 0.25, a.y + (n.y - a.y) * 0.25); }, 50);
      await D.drag(fireBtn, legs, { after: 200 });
      clearInterval(follow);
      await D.say(kills() > k0 ? 'Every hit adds to your streak. Ten hits in a row raise your points multiplier, but a miss starts it over.' : 'Every hit adds to your streak, and ten in a row raise your points multiplier.', { at: '.inv-side.l .inv-top, .inv-top', wait: 3600 });
      // your turn: the target eases onto the nearest invader whenever you let go of the stick
      var k1 = kills();
      var assist = setInterval(function () { if (I.stickOn()) return; var n = nearest(), a = g().aim; I.setAim(a.x + (n.x - a.x) * 0.12, a.y + (n.y - a.y) * 0.12); }, 50);
      try {
        await D.you(fireBtn, 'Your turn. Hold Fire to blast three invaders. Push the joystick if you want to aim somewhere else.', {
          allow: function () { return [document.querySelector('.inv-fz'), document.querySelector('.inv-sz:not(.c2)')]; },
          until: function () { return kills() >= k1 + 3; },
          // (tests and recordings: a tap can't be held, so the demo holds Fire for the player)
          autoTap: function () { I.fire(true); return fireBtn(); }
        });
      } finally { clearInterval(assist); }
      I.fire(false);
      await D.wait(400);
      I.stop();
      await D.say('Nicely done. The green bunkers block the invaders’ lasers. If an invader reaches them, or the shield bar under them runs out, the game is over.', { at: box(0.08, 0.7, 0.92, 0.97) });
      await D.say('Each new stage brings new kinds of ships, and a UFO crossing the top is worth up to 2,500 points.', { pos: 'top' });
    }
  });
})();
