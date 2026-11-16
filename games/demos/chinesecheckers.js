// Chinese Checkers' demo (demo.js; CLAUDE.md, Demos): two players across the star. A step and a hop from the start; then,
// near the end, you hop one marble five times across the board into your goal point, and the last marble steps in to win.
(function () {
  'use strict';
  var C = window.__cc, E = C.E;
  var VB = { x: -7, y: -8.08, w: 14, h: 16.16 };   // (the board's view box, as the page places its marbles)
  function S() { return C.state(); }
  // a tappable spot over a hole (the marbles don't take taps: the board finds the nearest hole to a tap)
  function spot(c) {
    return function () {
      var layer = document.querySelector('.bwrap .mlayer'); if (!layer) return null;
      var n = layer.querySelector('.dm-spot[data-c="' + c + '"]');
      if (!n) {
        n = document.createElement('div'); n.className = 'dm-spot'; n.setAttribute('data-c', c);
        n.style.cssText = 'position:absolute;width:5.3%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;pointer-events:auto;z-index:6;' +
          'left:' + ((E.PX[c] - VB.x) / VB.w * 100) + '%;top:' + ((E.PY[c] - VB.y) / VB.h * 100) + '%;';
        layer.appendChild(n);
      }
      return n;
    };
  }
  function spots(l) { return function () { return l.map(function (c) { return spot(c)(); }); }; }
  function marbles(p) { return function () { var s = S(); return [].slice.call(document.querySelectorAll('.bwrap .mb')).filter(function (m) { return s.b[+m.dataset.c] === p + 1; }); }; }
  function hints() { return document.querySelector('.bwrap .hsvg'); }
  function count() { var s = S(); return s ? s.cnt[0] + s.cnt[1] : 0; }
  async function move(D, f, t, o) {
    o = o || {};
    var n = count();
    await D.tap(spot(f), { after: o.pause != null ? o.pause : 420 });
    if (o.say) await D.say(o.say, { at: spot(f), avoid: [hints] });
    await D.tap(spot(t), { after: 200 });
    await D.wait(function () { return count() > n && !document.querySelector('.bwrap .mb.fly'); }, 6000);
    await D.wait(o.after != null ? o.after : 700);
  }
  // near the end: nine of your marbles are in your goal point or beside it, and one is far back, with marbles to hop over
  var RUN = 89, GOAL = 7, LAST = 18, LASTTO = 9;
  function later() {
    var b = []; for (var i = 0; i < E.N; i++) b.push(0);
    [0, 1, 2, 3, 4, 5, 6, 8, LAST, RUN].forEach(function (c) { b[c] = 1; });
    [16, 40, 49, 57, 77, 115, 116, 118, 119, 120].forEach(function (c) { b[c] = 2; });
    return b;
  }

  Kit.demoScript({
    intro: 'Here’s how marbles step and hop across the star, and then you hop one five times in a single move.',
    beats: 12,
    end: 'Step or hop one marble a turn, chain hops to cross the star fast, and fill the point across from you first.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      C.start({ mode: 'pp', level: 'normal', places: false, nostay: false, spin: false,
        players: [{ name: me, cpu: false, col: 'red' }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false, col: 'blue' }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('Your ten red marbles start in the point of the star nearest you.', { at: marbles(0) });
      await D.say('The goal is to move all of them into the point straight across, where ' + them + '’s blue marbles start. ' + them + ' races the other way.', { at: marbles(1) });
      await move(D, 113, 105, { say: 'Tap a marble to see where it can go. A marble can step into an empty hole right next to it.' });
      await move(D, 6, 15, { pause: 260, after: 500 });
      await D.say('Then ' + them + ' moves, and the two of you take turns.', { at: spot(15) });
      await move(D, 117, 106, { say: 'Or a marble can hop over a marble right next to it, of any color, into the empty hole just past it.' });
      await D.set(function () { var s = S(); s.cnt = [21, 21]; s.round = 22; C.set(later(), 0); });
      await D.say('Now we skip ahead to near the end of the game.', { pos: 'center', ring: false, wait: 2200 });
      await D.say('After a hop, a marble can keep hopping from where it lands, as many times as it can. The marbles it hops over stay where they are.', { at: spots([RUN, 66, 48, 50, 29, GOAL]) });
      await D.you(spot(RUN), 'Your turn. Tap your red marble at the back.', { until: function () { return !!document.querySelector('.bwrap .mb.sel'); } });
      await D.you(spot(GOAL), 'The lines show where it can hop. Tap the empty hole in your goal point, at the end of the longest route.', {
        avoid: [spot(RUN)], until: function () { return S().b[GOAL] === 1; }
      });
      await D.wait(function () { return !document.querySelector('.bwrap .mb.fly'); }, 5000);
      await D.wait(2400);
      await D.say('Five hops in one move, all the way across the star!', { at: spot(GOAL) });
      var jm = E.movesFrom(S().b, 77, S().pts, false).filter(function (m) { return !m.h; }).sort(function (a, b) { return E.PY[b.t] - E.PY[a.t]; })[0];
      await move(D, 77, jm.t, { pause: 260, after: 500 });
      await D.say('You have one marble left to bring in, and one empty hole. Whoever fills every hole of the point across first wins.', { at: spots([LAST, LASTTO]) });
      await move(D, LAST, LASTTO, { after: 300 });
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 6000);
      await D.wait(700);
      await D.say('All ten of your marbles made it across, so you win!', { at: '.k-win h2', pos: 'above' });
    }
  });
})();
