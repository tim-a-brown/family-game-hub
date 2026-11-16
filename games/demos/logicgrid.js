// Logic Grids' demo (demo.js; CLAUDE.md, Demos): Easy puzzle No. 1, the Community Garden. Two clues are marked on the
// grid (a check that crosses out the rest of its row and column, then an X), a hint works out a square, and after the
// rest is filled in you put in the last check and the puzzle is solved.
(function () {
  'use strict';
  var L = window.__lg;
  function S() { return L.get(); }
  function cell(a, i, b, j) { return function () { return L.cell(a, i, b, j); }; }
  function clue(ci) { return function () { return L.clue(ci); }; }
  var T = null;   // the last answer square, for you

  Kit.demoScript({
    intro: 'Here’s how clues become marks on the grid, and then you solve the puzzle.',
    beats: 9,
    end: 'Turn each clue into checks and Xs on the grid, and carry what you learn from box to box until every answer fits.',
    start: async function () {
      L.start('easy', 1);
      await new Promise(function (res) { (function poll() { if (S() && document.querySelector('#grid .c')) res(); else setTimeout(poll, 50); })(); });
      S().time = 143;
    },
    steps: async function (D) {
      await D.say('Each puzzle tells a short story. Every gardener planted one flower and has one plot, and no two share.', { at: '#story' });
      await D.say('Each box of squares pairs two of the groups, like names and flowers. A square is where one of each meets.', { at: '#grid' });
      // Clue 3: Ruth planted daisies
      await D.say('Clue 3 says Ruth planted daisies. Tap their square once for an X, and twice for a check.', { at: clue(2), avoid: '#grid' });
      await D.tap(cell(0, 3, 1, 0), { after: 300 });
      await D.tap(cell(0, 3, 1, 0), { after: 600 });
      await D.say('Ruth has only one flower, and only one gardener planted daisies, so the rest of that row and column are crossed out for you.', { at: cell(0, 3, 1, 0) });
      // Clue 2: lilies don't have plot 2
      await D.say('Clue 2 says the one who planted lilies doesn’t have plot 2, so that square gets an X.', { at: clue(1), avoid: '#grid' });
      await D.tap(cell(1, 1, 2, 1), { after: 600 });
      await D.tap('#tools .tool.hint', { after: 600 });
      await D.say('Stuck? Hint marks the next square you can work out, and a note says why.', { at: '#note' });
      // a few clues later: every answer but one is in
      await D.set(function () {
        L.solveTo(1);
        var P = L.P();
        for (var c = 1; c < P.k && !T; c++) for (var p = 0; p < P.n && !T; p++) if (L.mk(0, p, c, P.itemOf[c][p]) !== 2) T = [0, p, c, P.itemOf[c][p]];
        if (!T) { T = [0, 0, 1, P.itemOf[1][0]]; L.mark(T[0], T[1], T[2], T[3], 'check'); }
      });
      var P = L.P(), last = L.LG.fact(P, [0, T[1]], [T[2], T[3]], true).replace(/\.$/, '');
      await D.say('A few clues later, the last answer left to mark is that ' + last + '.', { at: cell(T[0], T[1], T[2], T[3]), avoid: '#grid', wait: 3000 });
      await D.you(cell(T[0], T[1], T[2], T[3]), 'Your turn. Tap this square twice to put a check in it.', {
        avoid: '#grid', until: function () { return S().done; }
      });
      await D.wait(2600);
      await D.say('Solved! The answer table fills in, and the page gets its stamp.', { pos: 'top' });
    }
  });
})();
