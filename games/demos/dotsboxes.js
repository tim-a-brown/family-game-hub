// Dots and Boxes' demo (demo.js; CLAUDE.md, Demos): a 3 by 3 sheet against the computer. You and Bender draw a line each;
// then, later in the game, you close the box Bender left open, draw again, close two boxes with one line, and draw a safe line.
(function () {
  'use strict';
  var X = window.__dots, U = 100, PAD = 50, NS = 'http://www.w3.org/2000/svg';
  function S() { return X.state(); }
  function svg() { return document.querySelector('.sheet svg'); }
  // a see-through shape on the sheet for the finger and the ring: a line's place (t 'h' or 'v', i its index) or a box's
  function mark(key, x, y, w, h) {
    var g = svg(); if (!g) return null;
    var r = g.querySelector('rect.dm-' + key);
    if (!r) {
      r = document.createElementNS(NS, 'rect'); r.setAttribute('class', 'dm-' + key);
      r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h);
      r.setAttribute('fill', 'transparent'); r.style.pointerEvents = 'all';
      g.appendChild(r);
    }
    return r;
  }
  function line(t, i) {
    return function () {
      var n = S().n, x, y;
      if (t === 'h') { x = PAD + (i % n) * U; y = PAD + Math.floor(i / n) * U; return mark(t + i, x + 16, y - 15, U - 32, 30); }
      x = PAD + (i % (n + 1)) * U; y = PAD + Math.floor(i / (n + 1)) * U; return mark(t + i, x - 15, y + 16, 30, U - 32);
    };
  }
  function box(r, c) { return function () { return mark('b' + r + c, PAD + c * U + 10, PAD + r * U + 10, U - 20, U - 20); }; }
  function idle() { var s = S(); return s && !s.over && s.cur === 0; }

  Kit.demoScript({
    intro: 'Here’s how a game of Dots and Boxes goes. You’ll close a box yourself.',
    beats: 10,
    end: 'Draw one line a turn, close a box to draw again, and never draw the third side of a box if you can help it.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.start({ mode: 'cpu', level: 'normal', n: 3, players: [{ name: me, cpu: false }, { name: 'Bender', cpu: true, level: 'normal' }] });
    },
    steps: async function (D) {
      await D.say('On your turn, you draw one line between two dots that sit next to each other.', { at: '.sheet' });
      await D.tap(line('h', 4));
      await D.wait(function () { return S().moves.length >= 2 && idle(); }, 6000);
      await D.wait(500);
      await D.say('Then Bender draws a line, and you take turns, one line each.', { at: '.scores' });
      // later in the game: Bender has just drawn the third side of a box
      await D.set(function () {
        X.set(function (s) {
          var H = { 0: 2, 1: 1, 2: 2, 3: 1, 4: 2, 5: 1, 9: 2 }, V = { 0: 1, 3: 2, 4: 1, 7: 2, 8: 1, 11: 2 }, k;
          for (k = 0; k < 12; k++) { s.h[k] = H[k] || 0; s.v[k] = V[k] || 0; }
          s.box = s.box.map(function () { return 0; });
          s.moves = [{ t: 'h', i: 4, p: 0, got: 0 }, { t: 'h', i: 1, p: 1, got: 0 }]; s.cur = 0; s.run = 0; s.last = { t: 'h', i: 0 };
        });
      });
      await D.say('Now we skip ahead to later in the game.', { pos: 'center', ring: false, wait: 2200 });
      await D.say('Bender just drew the third side of this box. Whoever draws the fourth side closes it.', { at: box(0, 0) });
      await D.you(line('v', 1), 'Tap here to draw the fourth side.', { until: function () { return S().box[0] > 0; } });
      await D.wait(700);
      await D.say('The box is yours, and your initial goes in it. Closing a box means you draw another line.', { at: box(0, 0) });
      await D.say('This line closes the next two boxes at once.', { at: line('v', 2), wait: 2400 });
      await D.tap(line('v', 2));
      await D.wait(900);
      await D.say('That makes three boxes for you, and you still draw one more line.', { at: function () { return [box(0, 0)(), box(0, 2)()]; } });
      await D.say('Try not to draw the third side of a box, or the next player closes it. This line is safe.', { at: line('h', 7) });
      await D.tap(line('h', 7));
      await D.wait(function () { return S().moves.length >= 6 && idle(); }, 6000);
      await D.wait(500);
      await D.say('When every box is closed, the player with the most boxes wins.', { at: '.scores' });
    }
  });
})();
