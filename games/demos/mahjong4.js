// Mahjong's demo (demo.js; CLAUDE.md, Demos): a hand against three computer players, a few turns in. Johnny 5 discards
// the Red Dragon and you claim it for a pung; you discard the North Wind and are one tile from winning; the others draw
// and discard, and you draw the 9 of Characters and go Mahjong.
(function () {
  'use strict';
  var X = window.__mahjong;
  function S() { return X.state(); }
  // kinds: 1-9 Characters 0-8, 1-9 Dots 9-17, 1-9 Bamboo 18-26, East South West North 27-30, Red Green White Dragons 31-33
  function C(n) { return n - 1; } function Dt(n) { return 8 + n; } function Bm(n) { return 17 + n; }
  var N = 30, RED = 31, GREEN = 32, WHITE = 33, SOUTH = 28;
  function id(k, copy) { return k * 4 + (copy || 0); }
  function rackTile(name) { return function () { return document.querySelector('.rack .mt[aria-label="' + name + '"]'); }; }
  function btn(text) { return function () { return [].slice.call(document.querySelectorAll('.acts .btn')).filter(function (b) { return b.textContent.trim() === text; })[0]; }; }
  function pond(q) { return function () { return document.querySelectorAll('.mtable .pond')[q]; }; }

  Kit.demoScript({
    intro: 'Here’s how a hand of Mahjong goes. You’ll claim a discard and win the hand yourself.',
    beats: 12,
    end: 'Draw and discard to build four sets and a pair, claim the discards that help, and call Mahjong when your hand is complete.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.start({ players: [{ name: me, cpu: false }, { name: 'Bender', cpu: true, level: 'normal' }, { name: 'EVE', cpu: true, level: 'normal' }, { name: 'Johnny 5', cpu: true, level: 'normal' }] });
      X.set(function (s) {
        var used = {};
        function take(list) { return list.map(function (t) { used[t] = 1; return t; }); }
        var mine = take([id(Dt(2)), id(Dt(3)), id(Dt(4)), id(Bm(5), 0), id(Bm(5), 1), id(Bm(5), 2), id(C(7)), id(C(8)), id(RED, 0), id(RED, 1), id(Dt(6), 0), id(Dt(6), 1), id(N, 0)]);
        var ponds = [take([id(WHITE, 0), id(Bm(1), 0)]), take([id(C(1), 0), id(GREEN, 0)]), take([id(Dt(9), 0), id(SOUTH, 0)]), take([id(Bm(9), 0), id(RED, 2)])];
        // nobody else holds a 6 or 9 of Characters (what you will wait on); the 9 you draw waits fourth in the wall
        var win = id(C(9), 0), late = [];
        [1, 2, 3].forEach(function (c) { late.push(id(C(9), c)); }); [0, 1, 2, 3].forEach(function (c) { late.push(id(C(6), c)); }); late.push(id(RED, 3));
        take(late); used[win] = 1;
        var pool = []; for (var t = 0; t < 136; t++) if (!used[t]) pool.push(t);
        for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = pool[i]; pool[i] = pool[j]; pool[j] = x; }
        var hands = [mine, pool.splice(0, 13), pool.splice(0, 13), pool.splice(0, 13)];
        var head = pool.splice(0, 20), wall = head.concat([win], late, pool);   // (the 9 waits deep in the wall until your draw)
        s.order = [].concat(hands[0], hands[1], hands[2], hands[3], ponds[0], ponds[1], ponds[2], ponds[3], wall);
        s.front = 60; s.back = 0;
        s.hands = hands; s.melds = [[], [], [], []]; s.ponds = ponds;
        s.handNo = 1; s.cur = 3; s.last = { id: id(RED, 2), from: 3 }; s.drawn = null; s.kongDraw = false; s.claim = null; s.result = null;
        s.phase = 'claim';
      });
    },
    steps: async function (D) {
      await D.wait(function () { return S().claim && S().claim.q === 0; }, 5000);
      await D.say('A hand wins with four sets and a pair. A set is three tiles in a row of one suit, or three of the same tile.', { at: '.rack', avoid: ['.acts', '.claim'] });
      await D.say('Johnny 5, on your left, just discarded the Red Dragon. You hold the other two Red Dragons.', { at: '.claim' });
      await D.you(btn('Pung'), 'Three of a kind is a pung. Tap Pung to take the Red Dragon.', { until: function () { return S().melds[0].length > 0; } });
      await D.wait(800);
      await D.say('A claimed set goes face up on the table, and it counts toward your four sets.', { at: function () { return document.querySelector('.mtable .melds .meld'); } });
      await D.say('Now you discard one tile. Your North Wind doesn’t fit with anything.', { at: rackTile('North Wind') });
      await D.you(rackTile('North Wind'), 'Tap the North Wind, then tap it again to discard it.', {
        until: function () { return S().hands[0].length === 10; }
      });
      await D.wait(700);
      await D.say('You need just one more tile now. A 6 or a 9 of Characters finishes your hand.', { at: '.waits', avoid: ['.rack'] });
      // (your next draw is the 9 of Characters: it moves to the front of the wall the moment your draw comes round)
      var iv = setInterval(function () { var s = S(); if (s.cur !== 0 || s.phase !== 'draw') return; clearInterval(iv); var w = s.order.indexOf(id(C(9), 0)), f = s.front; if (w > f) { var t = s.order[f]; s.order[f] = s.order[w]; s.order[w] = t; } }, 40);
      await D.say('Each player in turn draws a tile from the wall and discards one into their pond.', { at: '.mtable .wall' });
      await D.wait(function () { var s = S(); return s.cur === 0 && s.phase === 'discard' && s.drawn != null; }, 20000);
      await D.wait(700);
      await D.say('You drew the 9 of Characters, and your hand is complete.', { at: rackTile('9 Characters') });
      await D.you(btn('Mahjong!'), 'Tap Mahjong! to win the hand.', { until: function () { return !!S().result; } });
      await D.wait(function () { return document.querySelector('.k-sheet'); }, 6000);
      await D.wait(600);
      await D.say('Your hand scores faan for what it holds. A Red Dragon pung and a tile you drew yourself are 1 faan each.', { at: function () { return document.querySelector('.k-sheet .res table'); } });
      await D.say('A game is several hands. Whoever has the most points at the end wins.', { at: function () { return document.querySelectorAll('.k-sheet .res table')[1]; } });
    }
  });
})();
