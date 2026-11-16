// Word Search's demo (demo.js; CLAUDE.md, Demos): an Easy Animals puzzle. The demo circles a word that reads across, you
// drag across one that runs down or backwards, the demo shows Hint, then skips ahead and circles the last word.
(function () {
  'use strict';
  var X = window.__ws;
  function S() { return X.state(); }
  function cell(r, c) { return document.querySelectorAll('.board .cells .cell')[r * S().n + c] || null; }
  function endOf(w) { return [w.r + w.dr * (w.w.length - 1), w.c + w.dc * (w.w.length - 1)]; }
  function first(w) { return function () { return cell(w.r, w.c); }; }
  function last(w) { return function () { var e = endOf(w); return cell(e[0], e[1]); }; }
  function cells(w) { return function () { var l = []; for (var i = 0; i < w.w.length; i++) l.push(cell(w.r + w.dr * i, w.c + w.dc * i)); return l; }; }
  function listed(w) { return function () { return [].filter.call(document.querySelectorAll('.words .w'), function (s) { return s.textContent === w.w; })[0] || null; }; }
  function way(w) { return w.dr === 0 ? (w.dc > 0 ? 'runs across' : 'runs backwards, from right to left') : (w.dr > 0 ? 'runs down' : 'runs up the grid, from the bottom'); }
  var A, B, Z;   // the demo's word, yours, and the last one

  Kit.demoScript({
    intro: 'Here’s how a Word Search goes. You’ll circle one of the words yourself.',
    beats: 9,
    end: 'Drag from the first letter of a word to its last, forwards or backwards, until every word on the list is found.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.start('Animals', 'easy', me, false);
      var ws = S().words.slice().sort(function (a, b) { return b.w.length - a.w.length; });
      A = ws.filter(function (w) { return w.dr === 0 && w.dc === 1; })[0] || ws[0];
      B = ws.filter(function (w) { return w !== A && (w.dc === -1 || w.dr !== 0); })[0] || ws.filter(function (w) { return w !== A; })[0];
      Z = ws.filter(function (w) { return w !== A && w !== B; }).pop();
    },
    steps: async function (D) {
      await D.wait(600);
      await D.say('Every word on this list is hidden somewhere in the grid of letters.', { at: '.words' });
      await D.say('Here’s ' + A.w + ', reading across. To circle a word, drag from its first letter to its last.', { at: cells(A), wait: 2200 });
      await D.drag(first(A), last(A), { after: 900 });
      await D.wait(function () { return A.f > 0; }, 2000);
      await D.say('Found! ' + A.w + ' is crossed off the list in highlighter.', { at: listed(A) });
      await D.say('Words can run across or down, and backwards too. ' + B.w + ' ' + way(B) + '.', { at: cells(B) });
      await D.you(cells(B), 'Your turn. Drag along ' + B.w + ', from its first letter to its last.', {
        allow: ['.board'],
        until: function () { return B.f > 0; },
        autoTap: function () { return document.querySelector('.board .sel line') ? last(B)() : first(B)(); }
      });
      await D.wait(1300);
      await D.tap('.below .btn', { say: 'Stuck? Hint makes the first letter of a word blink, and adds 15 seconds to your time.' });
      await D.wait(2400);
      await D.set(function () { S().words.forEach(function (w) { if (!w.f && w !== Z) X.select(w); }); });
      await D.say('Now we skip ahead to the last word.', { pos: 'center', ring: false, wait: 2000 });
      await D.say(Z.w + ' is the only word left.', { at: cells(Z), wait: 2200 });
      await D.drag(first(Z), last(Z), { after: 300 });
      await D.wait(function () { return document.querySelector('.k-win .card'); }, 6000);
      await D.wait(600);
      await D.say('Every word is found. Your time is your score, so try to beat your best one.', { at: '.k-win .sub', place: 'bottom' });
    }
  });
})();
