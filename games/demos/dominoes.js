// Dominoes' demo (demo.js; CLAUDE.md, Demos): the Draw game against Bender. The double six leads, you match a 6, a tile
// that fits both ends shows where it can go, you draw from the boneyard when nothing fits, and then you go out and score.
(function () {
  'use strict';
  var X = window.__dom;
  function S() { return X.state(); }
  function tid(a, b) { return Math.min(a, b) * 7 + Math.max(a, b); }
  function mine(a, b) { return function () { return document.querySelector('.rack .dm[data-id="' + tid(a, b) + '"]'); }; }
  function line() { return document.querySelectorAll('.tbl .layer .dm'); }
  function lineTile(a, b) { return function () { return [].slice.call(line()).filter(function (n) { return n._a != null && tid(n._a, n._b) === tid(a, b); })[0]; }; }
  function ghosts() { return document.querySelectorAll('.tbl .layer .ghost'); }
  function ghostFor(v) { return function () { return [].slice.call(ghosts()).filter(function (g) { return g._mv && g._mv.v === v; })[0]; }; }
  function placed() { var s = S(), L = s && s.line; return L ? 1 + L.arms.E.length + L.arms.W.length : 0; }
  function myTurn() { var s = S(); return s && s.phase === 'play' && s.cur === 0 && !X.lock(); }
  var WORD = ['blank', 'one', 'two', 'three', 'four', 'five', 'six'];
  function name(t) { return t[0] === t[1] ? 'double ' + WORD[t[0]] : t[0] + '-' + t[1]; }
  var drawBtn = '.status .acts .btn-primary';
  // the end of the hand: your last tile fits the 0 at one end of the line
  function endOfHand() {
    var L = null;
    L = X.place(L, [6, 6]);
    [[6, 3], [3, 2], [2, 5], [5, 0]].forEach(function (t) { L = X.place(L, t, 'E'); });
    [[6, 2], [2, 1], [1, 4], [4, 6]].forEach(function (t) { L = X.place(L, t, 'W'); });
    var s = S(), used = {};
    s.line = L;
    s.players[0].hand = [[0, 3]];
    s.players[1].hand = [[5, 5], [3, 4], [1, 1]];
    [[6, 6], [6, 3], [3, 2], [2, 5], [5, 0], [6, 2], [2, 1], [1, 4], [4, 6], [0, 3], [5, 5], [3, 4], [1, 1]].forEach(function (t) { used[tid(t[0], t[1])] = 1; });
    s.bone = []; for (var a = 0; a <= 6; a++) for (var b = a; b <= 6; b++) if (!used[tid(a, b)]) s.bone.push([a, b]);
    s.cur = 0; s.viewer = 0; s.last = null; s.passes = 0; s.undo = null; s.undoBy = -1; s.phase = 'play';
    s.players.forEach(function (p) { p.drewTurn = 0; });
    X.load(s);
  }

  Kit.demoScript({
    intro: 'Here’s how a hand of Dominoes goes. You’ll play a tile and then go out yourself.',
    beats: 12,
    end: 'Match the numbers at the open ends, draw when nothing fits, and play all your tiles first to score the dots left in everyone else’s hands.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.start({ mode: 'cpu', variant: 'draw', target: 100, players: [{ name: me, color: Kit.color(0) }, { name: 'Bender', cpu: true, level: 'normal', color: Kit.color(1) }] },
        [[[6, 3], [2, 3], [4, 4], [5, 4], [6, 4], [3, 4], [5, 3]], [[6, 6], [6, 2], [5, 5], [0, 0], [0, 1], [1, 2], [4, 0]]]);
    },
    steps: async function (D) {
      await D.wait(function () { return myTurn() && placed() === 1; }, 6000);
      await D.wait(400);
      await D.say('You and Bender each have seven tiles. Whoever holds the highest double plays it first, and Bender had the double six.', { at: lineTile(6, 6) });
      await D.say('On your turn, you play a tile that matches a number at an open end of the line. Both ends of the double six are 6.', { at: '.rack' });
      await D.you(mine(6, 3), 'Tap your 6-3 to play it.', { until: function () { return placed() >= 2; } });
      await D.wait(function () { return myTurn() && placed() >= 3; }, 8000);
      await D.wait(500);
      await D.say('Bender matched the other 6 with the 6-2. Now the open ends are 3 and 2.', { at: lineTile(6, 2) });
      await D.tap(mine(2, 3), { after: 500 });
      await D.say('Your 2-3 fits at either end, so glowing spots show where it can go.', { at: ghosts });
      await D.tap(ghostFor(3), { after: 200 });
      await D.wait(function () { return myTurn() && placed() >= 5; }, 8000);
      await D.wait(500);
      await D.say('Bender played the 1-2, so the ends are 2 and 1. None of your tiles has a 1 or a 2.', { at: '.rack' });
      await D.say('When nothing fits, you draw from the boneyard, one tile at a time, until a tile fits.', { at: drawBtn });
      for (var k = 0; k < 14 && !X.legal().length; k++) {
        await D.tap(drawBtn, { after: 200 });
        await D.wait(function () { return !X.lock(); }, 3000);
        await D.wait(400);
      }
      var m = X.legal()[0];
      if (m) {
        await D.say('The ' + name(m.t) + ' you drew fits, so you can play it.', { at: mine(m.t[0], m.t[1]) });
        var n = placed();
        await D.tap(mine(m.t[0], m.t[1]), { after: 500 });
        if (placed() === n && ghosts().length) await D.tap(ghostFor(m.v), { after: 200 });
        await D.wait(function () { return placed() > n; }, 3000);
        await D.wait(900);
      }
      await D.set(endOfHand);
      await D.say('Now we skip ahead to the end of the hand.', { pos: 'center', ring: false, wait: 2200 });
      await D.you(mine(0, 3), 'You have one tile left, and its 0 matches the 0 at the end of the line. Play it to go out.', { until: function () { return S().phase !== 'play'; } });
      // (the hand's count: a sheet over the table on a phone or a tablet, the panel beside the table in a large window)
      await D.wait(function () { return document.querySelector('.hres .row2'); }, 8000);
      await D.wait(600);
      await D.say('Domino! You went out first, so you score the dots left in Bender’s hand: 19 points.', { at: function () { return document.querySelectorAll('.hres .row2')[1]; }, pos: 'below' });
      await D.say('A new hand is dealt each time, until someone reaches 100 points and wins the match.', { at: function () { return document.querySelector('.k-sheet .hres .tot') || document.querySelector('.dk-sheet .dk-pad .pf'); } });
    }
  });
})();
