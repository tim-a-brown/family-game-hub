// Donkey Kong's demo (demo.js; CLAUDE.md, Demos): the opening climb, then on the girders the stick walks Jumpman, you
// jump a barrel yourself (it is rolled toward him at the right distance, and the game waits for your tap), he climbs a
// ladder and jumps up into a hammer. The game is held still while a caption speaks (window.__dk.hold), and no barrel or
// fireball can cost a life during the demo (window.__dk.god).
(function () {
  'use strict';
  var K = window.__dk;
  function G() { return K.G(); }
  function M() { return G().m; }
  function hold(on) { K.hold(on); }
  function pad(d) { return function () { return document.querySelector('#pad i.' + d); }; }
  var screen = function () { return document.getElementById('scr'); };
  // the finger rests on the stick while Jumpman walks or climbs
  async function push(D, d, done, max) {
    await D.tap(pad(d), { ghost: true, after: 0 });
    hold(false);
    K.ctl[d] = true;
    await D.wait(done, max || 5000);
    K.ctl[d] = false;
  }
  // a part of the screen around Jumpman (the arcade screen is 224 by 256)
  function jumpman() {
    var cv = document.getElementById('cv'); if (!cv || !G()) return null;
    return { nodeType: 1, isConnected: true, tagName: 'DIV',
      getBoundingClientRect: function () { var r = cv.getBoundingClientRect(), k = r.width / 224, m = M(), x = r.left + m.x * k, y = r.top + (m.y - 8) * k; return { left: x - 16 * k, top: y - 14 * k, right: x + 16 * k, bottom: y + 10 * k, width: 32 * k, height: 24 * k }; },
      contains: function (t) { return t === cv; }, dispatchEvent: function (e) { return cv.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
  }

  Kit.demoScript({
    intro: 'Here’s how Jumpman walks, climbs and jumps, and then you jump a barrel yourself.',
    beats: 9,
    end: 'Walk with the stick, climb the ladders, and jump the barrels on your way up to Pauline.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      K.start({ who: me, lives: 3 });
      K.god(true);
    },
    steps: async function (D) {
      await D.say('Donkey Kong has carried Pauline to the top of a building site. Your job is to climb up and rescue her.', { at: screen, pos: 'below' });
      await D.tap(screen, { after: 300 });   // (a tap skips the opening)
      await D.wait(function () { return K.phase() === 'play'; }, 8000);
      hold(true);
      await D.say('You play Jumpman, down at the bottom.', { at: jumpman, pad: 8, wait: 2400 });
      await D.say('Push the stick left or right to walk.', { at: '#pad', wait: 1800 });
      await push(D, 'r', function () { return M().x >= 92; });
      hold(true);
      // a barrel rolling toward Jumpman, just the right distance away
      await D.set(function () { var S = K.ST(), m = M(); S.barrels.push({ x: m.x + 22, y: 248, p: S.plats[0], st: 'roll', dir: -1, blue: false, fr: 0 }); K.render(); });
      await D.say('Donkey Kong rolls barrels down the girders, and touching one costs a life.', { at: jumpman, pad: 26 });
      var score = G().score;
      await D.you('#jbtn', 'Your turn. Tap Jump to leap over the barrel.', {
        avoid: [function () { var j = jumpman(); if (!j) return null; var r = j.getBoundingClientRect(); return { nodeType: 1, isConnected: true, getBoundingClientRect: function () { return { left: r.left - 10, top: r.top - 20, right: r.right + 80, bottom: r.bottom + 10, width: r.width + 90, height: r.height + 30 }; } }; }],
        until: function () { if (K.ctl.jumpQ) { hold(false); return true; } return M().st === 'jump'; }
      });
      hold(false);
      await D.wait(function () { return M().st === 'ground' && G().score > score; }, 4000);
      hold(true);
      await D.say('Over it! Every barrel you jump scores 100 points.', { at: '#p-score', pad: 6, wait: 2600 });
      // over to the ladder on the right, and up
      await push(D, 'r', function () { return M().x >= 186; }, 6000);
      hold(true);
      await D.say('Stand at the bottom of a ladder and push up to climb it. Broken ladders only go part of the way.', { at: '#pad' });
      await D.set(function () { K.put(188, 0); });   // (right at the ladder's foot)
      await push(D, 'u', function () { var m = M(); return m.st === 'ground' && m.p === K.ST().plats[1]; }, 6000);
      hold(true);
      await push(D, 'l', function () { return M().x <= 173; }, 4000);
      hold(true);
      await D.say('Jump up into a hammer to grab it. For a few seconds, it smashes any barrel it touches.', { at: '#jbtn', wait: 3000 });
      await D.tap('#jbtn', { after: 0 });
      hold(false);
      await D.wait(function () { return M().ham > 0; }, 3000);
      await D.wait(1800);
      hold(true);
      await D.say('Climb all the way to Pauline before the bonus timer runs out to finish the stage.', { at: screen, pos: 'below' });
    }
  });
})();
