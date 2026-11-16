// Plinko's demo (demo.js; CLAUDE.md, Demos): you spin the Big Wheel for three chips, then drop the first chip yourself
// into the $10,000 slot; the demo drops the other two, one into a $0 slot and one into $1,000, and the game is totaled.
(function () {
  'use strict';
  var P = window.__plinko;
  function S() { return P.state(); }
  function me() { return S().players[0]; }
  // A part of the board as a target: the canvas has no elements in it, so this stands in for one (its box on the screen,
  // and it "contains" the canvas, so a press there reaches the board)
  function spot(fn) {
    return function () {
      var cv = P.canvas(); if (!cv || !cv.isConnected) return null;
      var r = fn(cv); if (!r) return null;
      return { nodeType: 1, isConnected: true, tagName: 'DIV', getBoundingClientRect: function () { var q = fn(cv); return { left: q.l, top: q.t, right: q.l + q.w, bottom: q.t + q.h, width: q.w, height: q.h }; },
        contains: function (t) { return t === cv; }, dispatchEvent: function (e) { return cv.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  // the drop rail above slot x (a slot's middle is x + 0.5), and the row of slots along the bottom
  function rail(x, wide) { return spot(function () { var a = P.at(x, true); return a && { l: a.x - a.k * (wide ? 4.3 : 0.45), t: a.y - a.k * 0.42, w: a.k * (wide ? 8.6 : 0.9), h: a.k * 0.84 }; }); }
  function slot(s) { return spot(function () { var a = P.at(s + 0.5, false); return a && { l: a.x - a.k * 0.5, t: a.y - a.k * 0.95, w: a.k, h: a.k * 1.7 }; }); }
  function slots(a0, a1) { return spot(function () { var a = P.at(a0, false), b = P.at(a1, false); return a && { l: a.x, t: a.y - a.k * 0.95, w: b.x - a.x, h: a.k * 1.7 }; }); }
  function aiming() { var m = P.mode(); return m === 'aim' || m === 'enter'; }
  function landed(n) { return function () { return me().res.length >= n && P.mode() !== 'drop'; }; }
  function waitTurn() { return function () { return P.mode() === 'aim'; }; }

  Kit.demoScript({
    intro: 'Here’s how Plinko goes. You’ll spin the Big Wheel and drop a chip yourself.',
    beats: 10,
    end: 'Spin the Big Wheel for your chips, then aim each one over the slot you want and let go. The pegs decide the rest.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      P.start([{ name: me, color: Kit.color(0) }], true);
    },
    steps: async function (D) {
      await D.say('First you spin the Big Wheel. The number it stops on is how many chips you get to drop.', { at: '.pk-show' });
      window.PlinkoWheel.rig = 3;   // (a 3 panel)
      await D.you('.bw-spin', 'Tap Spin, or swipe down on the wheel to pull it.', { until: function () { return !!me().wheel; } });
      await D.wait(function () { return !P.wheelBusy(); }, 8000);
      await D.say('The wheel stopped on 3, so you have three chips to drop.', { at: '.pk-show' });
      await D.tap('.bw-next', { after: 300 });
      await D.wait(waitTurn(), 4000);
      await D.say('Each slot along the bottom pays what it says. The $10,000 slot is in the middle, between the two $0 slots.', { at: slots(0, 9) });
      P.rig = 4;
      await D.you(rail(4.5, true), 'Drag the chip along the top to aim it, then let go to drop it.', { autoTap: rail(4.5), until: function () { return !aiming(); } });
      await D.wait(landed(1), 12000);
      await D.wait(300);
      await D.say('Your chip bounced all the way down into the $10,000 slot!', { at: '.pk-show' });
      await D.wait(waitTurn(), 6000);
      P.rig = 3;
      await D.drag(rail(4.5), rail(3.5), { after: 200 });
      await D.say('The pegs bounce every chip left and right on the way down, so you can aim but you can’t steer.', { at: P.canvas, wait: false });
      await D.wait(landed(2), 12000);
      await D.wait(300);
      await D.say('This one found a $0 slot, so it adds nothing.', { at: slot(3) });
      await D.wait(waitTurn(), 6000);
      P.rig = 2;
      await D.drag(rail(3.5), rail(4.5), { after: 200 });
      await D.wait(landed(3), 12000);
      await D.wait(300);
      await D.say('Your last chip lands in the $1,000 slot.', { at: slot(2) });
      await D.wait(function () { return document.querySelector('.k-win .card'); }, 8000);
      await D.wait(500);
      await D.say('When every chip is down, your total is what you won. Playing with friends, the biggest total wins.', { at: '.k-win .card' });
    }
  });
})();
