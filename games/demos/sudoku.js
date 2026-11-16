// Sudoku's demo (demo.js; CLAUDE.md, Demos): an Easy grid with four squares left. A square that could hold two numbers
// gets them as pencil notes; you fill the square beside it, whose column rules one of them out, and that rubs the number
// out of the notes, so the first square is worked out by elimination. The last two squares finish the grid.
(function () {
  'use strict';
  var K = window.__sdk;
  function S() { return K.get(); }
  function cell(i) { return function () { return document.querySelectorAll('#grid .c')[i]; }; }
  function pad(d) { return function () { return document.querySelectorAll('#pad button')[d - 1]; }; }
  var X, Y, Z, W, A, B, AY;   // the two-note square, its neighbor, the other square of the pair, one more; A and B the numbers

  // four squares to leave open: X and Y side by side in one box (one row missing A and B), Z the B in X's column (so X
  // keeps both), W anywhere clear of them
  function choose(s) {
    var rows = [4, 3, 5, 2, 6, 1, 7, 0, 8], cols = [3, 0, 6, 4, 1, 7];
    for (var a = 0; a < rows.length; a++) for (var b = 0; b < cols.length; b++) {
      var r = rows[a], c = cols[b], x = r * 9 + c, y = x + 1;
      if (s.given[x] || s.given[y]) continue;
      var z = -1;
      for (var rr = 0; rr < 9; rr++) if (Math.floor(rr / 3) !== Math.floor(r / 3) && s.sol[rr * 9 + c] === s.sol[y]) z = rr * 9 + c;
      if (z < 0 || s.given[z]) continue;
      var w = -1;
      for (var k = 0; k < 81 && w < 0; k++) {
        var kr = Math.floor(k / 9), kc = k % 9, ok = !s.given[k];
        [x, y, z].forEach(function (q) { var qr = Math.floor(q / 9), qc = q % 9; if (kr === qr || kc === qc || (Math.floor(kr / 3) === Math.floor(qr / 3) && Math.floor(kc / 3) === Math.floor(qc / 3))) ok = false; });
        if (ok && kr >= 5) w = k;
      }
      if (w < 0) continue;
      X = x; Y = y; Z = z; W = w; A = s.sol[x]; B = s.sol[y];
      for (rr = 0; rr < 9; rr++) if (s.sol[rr * 9 + c + 1] === A) AY = rr * 9 + c + 1;
      return true;
    }
    return false;
  }
  function selIs(i) { return function () { var c = cell(i)(); return !!(c && c.classList.contains('sel')); }; }

  Kit.demoScript({
    intro: 'Here’s how a square gets worked out, and then you fill one in.',
    beats: 11,
    end: 'Each row, column and box needs 1 to 9 once. Rule numbers out until only one fits, and pencil in notes when two could.',
    start: async function () {
      K.start('easy');
      await new Promise(function (res) { (function poll() { if (S() && document.querySelector('#grid .c')) res(); else setTimeout(poll, 50); })(); });
      var s = S();
      choose(s);
      s.vals = s.sol.slice(); [X, Y, Z, W].forEach(function (i) { s.vals[i] = 0; });
      s.notes = s.notes.map(function () { return 0; }); s.time = 487;
      K.fill(4);
    },
    steps: async function (D) {
      await D.say('Fill every empty square so each row, each column and each 3 by 3 box has the numbers 1 to 9, each one once.', { at: '#grid' });
      await D.say('The printed numbers are the clues, and they never change. Only four squares are left to fill.', { at: function () { return [X, Y, Z, W].map(function (i) { return cell(i)(); }); } });
      await D.tap(cell(X), { after: 500 });
      await D.say('Tapping a square shades its row, its column and its box.', { at: cell(X) });
      await D.say('This row is missing a ' + A + ' and a ' + B + ', and either one could still go in this square.', { at: cell(X) });
      await D.say('When two numbers could fit, turn on Notes and pencil them both in.', { at: '.tools .tool.notes', wait: 3000 });
      await D.tap('.tools .tool.notes', { after: 350 });
      await D.tap(pad(A), { after: 300 });
      await D.tap(pad(B), { after: 300 });
      await D.tap('.tools .tool.notes', { after: 500 });
      await D.say('The square beside it can only be the ' + B + ', because its column already has a ' + A + '.', { at: function () { return [cell(Y)(), cell(AY)()]; } });
      await D.you(cell(Y), 'Tap this square.', { until: selIs(Y) });
      await D.you(pad(B), 'Now tap ' + B + ' to write it in.', { until: function () { return S().vals[Y] === B; } });
      await D.wait(700);
      await D.say('Writing the ' + B + ' rubbed it out of the notes next door, so only the ' + A + ' is left there.', { at: cell(X) });
      await D.tap(cell(X), { after: 300 });
      await D.tap(pad(A), { after: 700 });
      await D.say('The last two squares each have only one number that fits.', { at: function () { return [cell(Z)(), cell(W)()]; }, wait: 2600 });
      await D.tap(cell(Z), { after: 300 });
      await D.tap(pad(B), { after: 600 });
      await D.tap(cell(W), { after: 300 });
      await D.tap(pad(S().sol[W]), { after: 300 });
      await D.wait(2200);
      await D.say('Solved! Your time goes on your best times for that level.', { pos: 'top' });
    }
  });
})();
