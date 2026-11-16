// Centipede's demo (demo.js; CLAUDE.md, Demos): the first wave, played sideways. A drag flies the ship like a
// trackball while it fires on its own, the centipede splits into mushrooms, you fly in and blast it yourself, and a
// Scatter power-up is flown into. The field is held still while a caption speaks (window.__centi.hold), and nothing
// can cost a life during the demo (window.__centi.god).
(function () {
  'use strict';
  var C = window.__centi;
  function G() { return C.state(); }
  function me() { return G().players[0]; }
  function W() { return C.dims().W; }
  function H() { return C.dims().H; }
  // the page's own canvas (the 3D view lies under it): the field is W wide and H + HB tall, the top HB a band of score
  function canvas() {
    var d = C.dims(), l = [].slice.call(document.querySelectorAll('#app canvas'));
    l = l.filter(function (c) { return c.offsetWidth > 0; });
    for (var i = l.length - 1; i >= 0; i--) if (d.canvas && l[i].style.width === d.canvas[2]) return l[i];
    return l[l.length - 1] || null;
  }
  // a point on the field as a target, in the game's own units (the canvas has nothing inside it)
  function spot(x, y, w, h) {
    return function () {
      var cv = canvas(); if (!cv) return null;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () {
          var d = C.dims(), r = cv.getBoundingClientRect(), xx = typeof x === 'function' ? x() : x, yy = typeof y === 'function' ? y() : y;
          var px = r.left + xx / d.W * r.width, py = r.top + (yy + d.HB) / (d.H + d.HB) * r.height;
          return { left: px - w / 2, top: py - h / 2, right: px + w / 2, bottom: py + h / 2, width: w, height: h };
        },
        contains: function (t) { return t === cv || document.getElementById('app').contains(t); }, dispatchEvent: function (e) { return cv.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  var ship = spot(function () { return me().x; }, function () { return me().y; }, 56, 56);
  // a drag across the lower field that moves the ship by dx, dy (in the game's units: the trackball's own gearing)
  function dragBy(D, dx, dy) {
    var k = C.ctl.drag || 1, x0 = W() * 0.5 - dx / k / 2, y0 = H() * 0.8;
    return D.drag(spot(x0, y0, 16, 16), spot(x0 + dx / k, y0 + dy / k, 16, 16), { after: 200 });
  }
  var screen = function () { return canvas(); };
  function hold(on) { C.hold(on); }
  function score() { return G().score; }

  Kit.demoScript({
    intro: 'Here’s how to fly and fire, and then you blast the centipede yourself.',
    beats: 8,
    end: 'Drag anywhere to fly your ship. It fires on its own, so line it up under the bugs and keep moving.',
    start: function () {
      var who = (localStorage.getItem('my_name') || '').trim() || 'Player';
      C.solo({ who: who, diff: 'arcade' });
      C.god(true);
      C.auto(true);
    },
    steps: async function (D) {
      // (a phone held upright shows the kit's cover asking to turn it: the demo waits for the turn)
      if (Kit.orientOk && !Kit.orientOk()) { await D.wait(function () { return Kit.orientOk(); }, 600000); await D.wait(800); }
      await D.wait(function () { return G().segs.length > 0; }, 6000);
      await D.wait(1200);
      hold(true);
      await D.say('A centipede crawls down through the field of mushrooms toward your ship at the bottom.', { at: ship, pad: 4 });
      await D.say('Put a finger down anywhere and drag. Your ship moves with your finger like a trackball, and it fires on its own.', { pos: 'top' });
      hold(false);
      await dragBy(D, -50, -6);
      await dragBy(D, 70, 0);
      await D.wait(function () { return score() > 0; }, 8000);
      await D.wait(800);
      hold(true);
      await D.say('Every segment you hit turns into a mushroom, and the centipede splits in two. A head is worth 100 points.', { pos: 'top' });
      // your turn
      var s0 = score(), x0 = me().x;
      hold(false);
      await D.you(screen, 'Your turn. Drag to fly under the centipede and blast it.', {
        pos: 'top', autoTap: spot(function () { return W() / 2; }, function () { return H() * 0.8; }, 20, 20),
        until: function () { return score() > s0 && (D.auto || Math.abs(me().x - x0) > 8); }
      });
      await D.wait(600);
      // a power-up next to the ship
      hold(true);
      var p = me(), cx = Math.max(20, Math.min(W() - 20, p.x + 40)), cy = p.y - 30;
      C.cap('scatter', cx, cy);
      await D.say('Power-ups float in now and then. Shoot one or fly into it: Scatter fires three shots in a spread.', { at: spot(cx, cy, 50, 50), pad: 4 });
      hold(false);
      await dragBy(D, cx - me().x, cy - me().y);
      await D.wait(2500);
      hold(true);
      await D.say('Clear every centipede to finish the wave. Spiders, fleas and wasps join in, and a big boss comes every few waves.', { pos: 'top' });
    }
  });
})();
