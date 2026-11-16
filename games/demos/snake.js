// Snake's demo (demo.js; CLAUDE.md, Demos): a swipe starts the snake and it eats an apple, the arrow pad turns it, you
// steer it to an apple yourself, and a golden apple shows what it's worth. The snake is held still between moves
// (window.__snk.hold), so nothing crashes before the closing card.
(function () {
  'use strict';
  var S = window.__snk;
  function G() { return S.get(); }
  function apples() { var g = G(); return g ? g.apples : 0; }
  // a point on the board as a target: the canvas has nothing inside it, so this stands in for a cell
  function cell(fx, fy) {
    return function () {
      var cv = S.canvas(); if (!cv || !cv.isConnected) return null;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () { var r = cv.getBoundingClientRect(), x = r.left + r.width * fx, y = r.top + r.height * fy; return { left: x - 14, top: y - 14, right: x + 14, bottom: y + 14, width: 28, height: 28 }; },
        contains: function (t) { return t === cv; }, dispatchEvent: function (e) { return cv.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  function key(d) { return function () { return document.querySelector('.ar-key.' + d); }; }
  function keys() { return [].slice.call(document.querySelectorAll('.ar-key')); }
  // the cell the head is in, as a fraction of the board
  function headAt(dx, dy) { var h = G().head; return cell((h.x + 0.5 + (dx || 0)) / 16, (h.y + 0.5 + (dy || 0)) / 20); }
  async function eatThenHold(D, n) {
    await D.wait(function () { return apples() >= n; }, 9000);
    S.hold();
    await D.wait(350);
  }

  Kit.demoScript({
    intro: 'Here’s how to steer the snake, and then you guide it to an apple yourself.',
    beats: 8,
    end: 'Swipe or tap the arrows to steer, eat the apples to grow, and keep clear of the walls and your own tail.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      S.start({ who: me, speed: 'relaxed', wrap: false, pad: true });
      S.apple(11, 10);
    },
    steps: async function (D) {
      await D.say('This is your snake. It waits on the board until you swipe.', { at: headAt(-1.5, 0), pad: 20 });
      await D.say('Swipe across the board the way you want it to go.', { at: '.ar-cab', wait: 1800 });
      await D.drag(headAt(-1, 1), headAt(3, 1), { after: 100 });
      await eatThenHold(D, 1);
      await D.say('It ate the apple. Every apple scores points and makes the snake one piece longer.', { at: '.ar-hud' });
      // the arrow pad: up to the next apple
      var h = G().head; S.apple(h.x, h.y - 4);
      await D.say('You can also steer with the arrow buttons under the board.', { at: '.ar-pad', wait: 2400 });
      await D.tap(key('u'), { after: 100 });
      await eatThenHold(D, 2);
      // your turn: an apple off to the left (the walls wrap round while you steer, so a wrong turn comes back)
      h = G().head; S.apple(h.x - 4, h.y); S.wrap(true);
      await D.you(function () { return keys().concat([document.querySelector('.ar-cab')]); }, 'Your turn. Swipe left, or tap the left arrow, to reach the apple.', {
        allow: function () { return keys().concat([document.querySelector('.ar-cab')]); },
        autoTap: key('l'), until: function () { return apples() >= 3; }
      });
      S.hold(); S.wrap(false);
      await D.wait(400);
      await D.say('Nicely done. The snake grows a little longer every time.', { at: headAt(), pad: 24, wait: 2600 });
      // a golden apple straight ahead
      h = G().head;
      var g = G(), d = g.dir, gx = h.x + (d === 'l' ? -3 : d === 'r' ? 3 : 0), gy = h.y + (d === 'u' ? -3 : d === 'd' ? 3 : 0);
      if (gx < 1 || gx > 14 || gy < 1 || gy > 18) { d = h.y > 9 ? 'u' : 'd'; gx = h.x; gy = h.y + (d === 'u' ? -3 : 3); }
      S.golden(gx, gy);
      await D.say('Now and then a golden apple shows up. It’s worth five times as much, so grab it before it fades.', { at: cell((gx + 0.5) / 16, (gy + 0.5) / 20), pad: 20 });
      await D.tap(key(d), { after: 100 });
      await D.wait(function () { return !G().gold; }, 6000);
      S.hold();
      await D.wait(500);
      await D.say('The game ends when the snake hits a wall or bites its own tail, so plan your turns as it grows.', { at: '.ar-cab' });
    }
  });
})();
