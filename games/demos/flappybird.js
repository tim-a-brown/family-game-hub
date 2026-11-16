// Flappy Bird's demo (demo.js; CLAUDE.md, Demos): taps start the flight and show the hop, the bird flies itself through
// the first pipes (window.__fb.auto), and then you flap it through a gap yourself. A guard (window.__fb.guard) lets the
// bird through a pipe and hops it off the ground instead of ending the flight, so the demo never reaches a game over.
(function () {
  'use strict';
  var F = window.__fb;
  // a part of the screen as a target, in the game's own units (288 wide)
  function spot(fn) {
    return function () {
      var cv = F.canvas(); if (!cv || !cv.isConnected) return null;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () { var r = cv.getBoundingClientRect(), k = r.width / F.W(), b = fn(); return { left: r.left + b[0] * k, top: r.top + b[1] * k, right: r.left + (b[0] + b[2]) * k, bottom: r.top + (b[1] + b[3]) * k, width: b[2] * k, height: b[3] * k }; },
        contains: function (t) { return t === cv; }, dispatchEvent: function (e) { return cv.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  var birdSpot = spot(function () { var b = F.bird(); return [b.x - 22, b.y - 18, 44, 36]; });
  var tapSpot = spot(function () { return [F.W() * 0.55, F.H() * 0.5, 40, 40]; });
  // the next pipe ahead of the bird
  function nextPipe() { var b = F.bird(), l = F.pipes(); for (var i = 0; i < l.length; i++) if (l[i].x + l[i].w > b.x - 17) return l[i]; return null; }
  var gapSpot = spot(function () { var p = nextPipe() || { x: 200, y: 200, w: 52, g: 100 }; return [p.x, p.y - p.g / 2, p.w, p.g]; });
  var screen = function () { return document.getElementById('scr'); };

  Kit.demoScript({
    intro: 'Here’s how the bird flies, and then you flap it through a gap yourself.',
    beats: 8,
    end: 'Tap to flap, and time each hop so the bird glides through the gaps. Every pipe you pass is a point.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      F.start(me);
    },
    steps: async function (D) {
      await D.say('This is your bird. Tap anywhere on the screen to flap its wings and start the flight.', { at: birdSpot, pad: 10 });
      F.guard = true;
      await D.tap(tapSpot, { after: 60 });
      await D.tap(tapSpot, { after: 60 });
      await D.tap(tapSpot, { after: 60 });
      F.auto = true;
      await D.wait(350);
      F.hold = true;
      await D.say('Every tap gives the same small hop, and then gravity pulls the bird straight back down.', { at: birdSpot, pad: 14 });
      F.hold = false;
      await D.wait(function () { var p = nextPipe(); return p && p.x < F.bird().x + 80; }, 6000);
      F.hold = true;
      await D.say('Fly through the opening between the pipes. Touching a pipe or the ground ends the flight.', { at: gapSpot, pad: 4 });
      F.hold = false;
      await D.wait(function () { return F.score() >= 1; }, 8000);
      await D.say('Each pipe you pass scores a point. The openings jump up and down at random.', { pos: 'bottom', wait: false });
      await D.wait(function () { return F.score() >= 4; }, 9000);
      // your turn: the bird waits in the air for your first tap, and the guard keeps it safe
      await D.wait(function () { var p = nextPipe(); return p && p.x > F.bird().x + 60; }, 5000);
      F.hold = true;
      var sc = F.score(), fl = F.flaps();
      if (!D.auto) F.auto = false;
      await D.you(screen, 'Your turn. Tap to flap, and fly the bird through the next gap.', {
        pos: 'above', autoTap: tapSpot,
        until: function () { return F.score() > sc && F.flaps() > fl; }
      });
      F.auto = true;
      await D.say('You made it through! Medals start at 10 pipes, then 20, 30 and 40.', { at: birdSpot, pad: 14, wait: false });
      await D.wait(function () { return F.score() >= sc + 3; }, 6000);
      await D.say('Your best flight is kept on the Best plate, so every new flight has a score to beat.', { at: '.hud .plate.gold' });
    }
  });
})();
