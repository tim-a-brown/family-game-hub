// Math Puzzles' demo (demo.js; CLAUDE.md, Demos): the last two puzzles of a Grades 3 to 4 worksheet. A word problem is
// answered after a hint (1 point), then you work out what comes next in a times-table pattern and finish the worksheet.
(function () {
  'use strict';
  var MP = window.__mp;
  function S() { return MP.get(); }
  function key(k) { return function () { return D0.qa('.mp .pad button').filter(function (b) { return b.textContent === k; })[0]; }; }
  var D0 = { qa: function (s) { return [].slice.call(document.querySelectorAll(s)); } };
  function boxText() { var b = document.querySelector('.mp .ans .box'); return b ? b.textContent : ''; }
  var P9 = { type: 'Word Problem', q: 'Mia has 4 bags with 6 marbles in each. How many marbles?', ans: 24, hint: '4 groups of 6 is 4 × 6' };
  var P10 = { type: 'Times Table', q: null, seq: [7, 14, 21, '?'], ans: 28, hint: 'Multiply by 7 each time' };
  var LOG = [['Multiplication', 2, '6 × 8 = ?', '48'], ['Division', 2, '42 ÷ 7 = ?', '6'], ['Halving', 2, 'Half of 36 = ?', '18'], ['Money', 0, '2 quarters, 3 dimes. How many cents?', '80'],
    ['Area', 2, 'Rectangle: 5 wide, 4 tall. Area = ?', '20'], ['Rounding', 2, 'Round 67 to the nearest 10', '70'], ['Addition', 2, '38 + 25 = ?', '63'], ['Missing Factor', 2, '3 × ? = 27', '9']];

  Kit.demoScript({
    intro: 'Here’s how to answer a puzzle, and then you solve the last one on the worksheet.',
    beats: 6,
    end: 'Read the puzzle on the chalkboard, type your answer and tap Check. Beat the clock shows how many you can solve in a minute.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      MP.start('ten', 'g34');
      var s = S();
      s.name = me;
      s.log = LOG.map(function (l, i) { return { t: l[0], r: l[1], q: l[2], a: l[3], s: 6 + i % 4 }; });
      s.score = 14; s.solved = 7; s.streak = 4; s.best = 4;
      s.types = { Multiplication: 1, Division: 1, Halving: 1, Area: 1, Rounding: 1, Addition: 1, 'Missing Factor': 1 };
      MP.set(P9);
    },
    steps: async function (D) {
      await D.say('Each puzzle goes up on the chalkboard. Type the answer on the number pad, then tap Check.', { at: '.mp .slate' });
      await D.say('A worksheet is ten puzzles, and this is the ninth. Each right answer scores 2 points.', { at: '.mp .tray .dotsrow' });
      await D.tap('.mp .tray .chalk', { after: 600 });
      await D.say('Hint gives you a nudge. A right answer after a hint scores 1 point instead of 2.', { at: '.mp .slate .note' });
      await D.tap(key('2'), { after: 200 });
      await D.tap(key('4'), { after: 300 });
      await D.tap(key('Check'), { after: 300 });
      await D.say('That’s right! A wrong answer gets one more try before the board shows how it’s done.', { at: '.mp .ans', wait: 3000 });
      await D.wait(function () { return S().cur !== P9; }, 3000);
      MP.set(P10);
      await D.wait(400);
      await D.you('.mp .pad', 'Your turn. Type the next number and tap Check.', {
        allow: '.mp .pad button', avoid: '.mp .slate', until: function () { return S().log.length >= 10; },
        autoTap: function () { var t = boxText(); return key(t === '' ? '2' : t === '2' ? '8' : 'Check')(); }
      });
      await D.wait(3200);
      var right = S().log.filter(function (l) { return l.r > 0; }).length;
      await D.say('That’s the worksheet: ' + right + ' of 10 right for ' + S().score + ' points. Every round is kept in Past rounds.', { pos: 'top' });
    }
  });
})();
