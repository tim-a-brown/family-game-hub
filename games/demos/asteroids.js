// Asteroids' demo (demo.js; CLAUDE.md, Demos): the rocks are laid by hand around the ship, no saucer comes, and rocks
// pass through the ship for the demo's length (__ast.ghost), so nothing is lost while you learn. The stick turns the
// ship, Fire splits a big rock, you blast one yourself, then the engine and hyperspace.
(function () {
  'use strict';
  var A = window.__ast;
  function G() { return A.G() || {}; }
  function cv() { return document.querySelector('.ar-cab canvas'); }
  function ship() { return A.ship(); }
  function broken() { var r = (G().stats || {}).rocks || []; return (r[1] || 0) + (r[2] || 0) + (r[3] || 0); }
  // a spot on the field (its own units) as a target
  function spot(fx, fy, r) {
    return function () {
      var c = cv(); if (!c) return null;
      var x = typeof fx === 'function' ? fx() : fx, y = typeof fy === 'function' ? fy() : fy;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () { var q = c.getBoundingClientRect(), px = q.left + x / A.WW() * q.width, py = q.top + y / A.WH() * q.height, rr = r / A.WW() * q.width; return { left: px - rr, top: py - rr, right: px + rr, bottom: py + rr, width: rr * 2, height: rr * 2 }; },
        contains: function (t) { return t === c; }, dispatchEvent: function (e) { return c.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  function shipSpot(r) { return spot(function () { var s = ship(); return s ? s.x : A.WW() / 2; }, function () { var s = ship(); return s ? s.y : A.WH() / 2; }, r || 22); }
  function stick() { return document.querySelector('.deck .stick'); }
  function fireBtn() { return document.querySelector('.deck .fire'); }
  // a point on the stick, pushed toward (dx, dy) by k of its reach (past 0.3 of its width fires the engine)
  function push(dx, dy, k) {
    return function () {
      var b = stick(); if (!b) return null;
      var r = b.getBoundingClientRect(), m = Math.hypot(dx, dy) || 1, R = r.width * k, x = r.left + r.width / 2 + dx / m * R, y = r.top + r.height / 2 + dy / m * R;
      return { nodeType: 1, isConnected: true, tagName: 'DIV', getBoundingClientRect: function () { return { left: x - 2, top: y - 2, right: x + 2, bottom: y + 2, width: 4, height: 4 }; },
        contains: function (t) { return t === b || b.contains(t); }, dispatchEvent: function (e) { return b.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  function times(x, n) { var l = []; for (var i = 0; i < n; i++) l.push(x); return l; }

  Kit.demoScript({
    intro: 'Here’s how to steer your ship and blast the space rocks.',
    beats: 8,
    end: 'Push the stick to turn and all the way out to thrust, hold Fire to shoot, and keep clear of the rocks.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      A.begin(me);
      A.noUfo(); A.ghost(true);
      var W = A.WW(), H = A.WH();
      A.clearRocks(0);
      A.rock(W / 2 + Math.min(130, W * 0.32), H / 2, 3, 0, 0);
      A.rock(W * 0.22, H * 0.18, 3, 6, 4);
      A.rock(W * 0.75, H * 0.85, 2, -8, -5);
    },
    steps: async function (D) {
      await D.wait(1200);
      await D.say('This is your ship. Space rocks drift all around it, and a big one sits off to the right.', { at: shipSpot(26) });
      await D.say('Push the stick the way you want the ship to point. A small push only turns it.', { at: stick, pad: 8, wait: 2600 });
      await D.drag(push(0, 0, 0), times(push(1, 0, 0.18), 5), { after: 200 });
      await D.say('Hold Fire to shoot. You can have four shots in the air at once.', { at: fireBtn, pad: 8, wait: 2400 });
      var b0 = broken();
      await D.drag(fireBtn, times(fireBtn, 6), { after: 300 });
      await D.wait(function () { return broken() > b0; }, 3000);
      await D.say('The big rock split into two medium rocks, and medium rocks split into small ones. The smaller the rock, the more points it’s worth.', { at: '.ar-hud' });
      // your turn: a medium rock straight ahead of the ship
      var s = ship(), W = A.WW();
      A.rock(s.x + Math.min(110, W * 0.28), s.y, 2, 0, 0);
      var b1 = broken();
      await D.you(fireBtn, 'Your turn. Hold Fire to blast the rock in front of your ship.', {
        allow: function () { return [fireBtn(), stick()]; },
        until: function () { return broken() > b1; }
      });
      await D.wait(700);
      await D.say('Push the stick all the way out to fire the engine. The ship keeps drifting after you let go, just like in space.', { at: stick, pad: 8, wait: 3000 });
      await D.drag(push(0, 0, 0), times(push(0, -1, 0.42), 3), { after: 1400 });
      await D.say('In a tight spot, Hyper jumps your ship to a random place. It’s a gamble, so save it for emergencies.', { at: '.deck .hyper', pad: 8 });
      await D.say('Clear every rock to start the next wave. Flying saucers come by too, and the small ones are worth 1,000 points.', { at: '.ar-hud' });
    }
  });
})();
