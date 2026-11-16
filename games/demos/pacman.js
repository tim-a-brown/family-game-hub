// Pac-Man's demo (demo.js; CLAUDE.md, Demos): the pad turns Pac-Man up a corridor and along a row of dots, you steer him
// down to a power pellet, and a blue ghost runs into him and is eaten. The maze is held still while captions speak
// (window.__pac.hold), and no ghost can catch him during the demo (window.__pac.god).
(function () {
  'use strict';
  var P = window.__pac;
  function G() { return P.G(); }
  function pac() { var g = G(); return { c: Math.floor(g.pac.x / 8), r: Math.floor(g.pac.y / 8) }; }
  function pad(d) { return function () { return document.querySelector('#pad i.' + d); }; }
  // a few tiles of the maze as a target (the canvas has nothing inside it)
  function tiles(c, r, w, h) {
    return function () {
      var cv = P.canvas(); if (!cv || !cv.isConnected) return null;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () { var a = P.at(c, r), t = a.t, l = a.x - t / 2, tp = a.y - t / 2; return { left: l, top: tp, right: l + t * (w || 1), bottom: tp + t * (h || 1), width: t * (w || 1), height: t * (h || 1) }; },
        contains: function (t) { return t === cv; }, dispatchEvent: function (e) { return cv.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  function pacSpot() { var p = pac(); return tiles(p.c - 1, p.r - 1, 3, 3)(); }
  function run() { P.hold = false; }
  function hold() { P.hold = true; }

  Kit.demoScript({
    intro: 'Here’s how to steer Pac-Man, and then you take him to a power pellet yourself.',
    beats: 8,
    end: 'Swipe or use the pad to steer, eat every dot, and save the power pellets for when the ghosts get close.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      P.god = true;
      P.start({ who: me, lives: 3, pad: true });
    },
    steps: async function (D) {
      await D.wait(function () { return P.phase() === 'ready'; }, 4000);
      hold();
      await D.say('This is Pac-Man. He eats the dots as he goes, and he keeps moving until a wall stops him.', { at: pacSpot, pad: 6 });
      await D.say('Tap the pad, or swipe on the maze, to choose where he turns. He turns at the next opening.', { at: '#pad', wait: 2600 });
      await D.tap(pad('u'), { after: 200 });
      run();
      await D.wait(function () { return P.phase() === 'play' && pac().r <= 20; }, 6000);
      await D.wait(500);
      await D.tap(pad('l'), { after: 100 });
      await D.wait(function () { return pac().c <= 4; }, 5000);
      hold();
      await D.say('Every dot scores 10 points. The big flashing dots are power pellets.', { at: tiles(1, 23), pad: 12 });
      await D.you(function () { return [document.querySelector('#pad'), P.canvas()]; }, 'Your turn. Swipe down, or press down on the pad, to take Pac-Man to the power pellet.', {
        allow: function () { return [document.querySelector('#pad'), P.canvas()]; }, autoTap: pad('d'),
        until: function () { var p = G().pac; if (p.want != null && p.want !== 2 && p.want !== 1) p.want = null; return p.want === 2; }
      });
      run();
      await D.wait(function () { return G().frightT > 0; }, 5000);
      await D.wait(400);
      hold();
      await D.say('A power pellet turns the ghosts blue for a few seconds. Now Pac-Man can eat them!', { at: pacSpot, pad: 6 });
      P.ghost(0, 3, 25, 0, true);
      run();
      await D.wait(function () { return P.phase() === 'eat'; }, 6000);
      await D.wait(function () { return P.phase() === 'play'; }, 3000);
      hold();
      await D.say('Each ghost you catch while they’re blue is worth more: 200, then 400, 800 and 1,600.', { at: '.hud .plate.sc' });
      await D.say('The ghosts chase Pac-Man the rest of the time, and a touch costs a life. Clear every dot to finish the level.', { at: '#cab' });
    }
  });
})();
