// Farkle's demo (demo.js; CLAUDE.md, Demos): a game against Bender. Your first turn sets aside three 3s (you tap them) and a
// 1, rolls on for hot dice and banks 600; after Bender's turn you set aside three 1s, push your luck once more and Farkle.
(function () {
  'use strict';
  var F = window.__farkle;
  // every roll of yours in the demo, in order (the page reads __farkle.rig once a roll and sets it back to null); Bender's
  // dice fall as they fall
  var ROLLS = [
    [3, 1, 3, 4, 3, 6],   // three 3s and a 1
    [5, 1],               // the last two dice both score: hot dice
    [2, 5, 4, 2, 6, 3],   // all six again: only the 5 scores
    [2, 1, 4, 1, 6, 1],   // your next turn: three 1s
    [2, 3, 6]             // the three that are left: a Farkle
  ];
  var q = ROLLS.slice();
  function S() { return F.state(); }
  function die(i) { return function () { return document.querySelector('.zone .spot[data-i="' + i + '"] .die'); }; }
  function dice(l) { return function () { return l.map(function (i) { return die(i)(); }).filter(Boolean); }; }
  function live() { return document.querySelectorAll('.zone .spot .die'); }
  function sel() { return S().dice.filter(function (d) { return d.sel && !d.kept; }).length; }
  function settled() { return !F.lock() && S().phase === 'pick'; }
  var cup = '.zone .cup', rollBtn = '.acts .btn-primary', bankBtn = '.acts .bank', score = '.tscore', board = '.board';

  Kit.demoScript({
    intro: 'Here’s how a turn of Farkle goes. You’ll set aside scoring dice and bank your points yourself.',
    beats: 12,
    end: 'Set aside the dice that score, then roll on for more or bank before a Farkle takes it all.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      Object.defineProperty(F, 'rig', { configurable: true, get: function () { return q.length && S() && S().cur === 0 ? q[0] : null; }, set: function (v) { if (v == null) q.shift(); } });
      F.start({ mode: 'cpu', players: [{ name: me, color: Kit.color(0) }, { name: 'Bender', cpu: true, level: 'normal', color: Kit.color(1) }],
        options: { target: 10000, entry: 500, scoring: 'std', pen: 'on', level: 'normal' } });
    },
    steps: async function (D) {
      await D.say('Each turn starts with all six dice in the cup. Tap the cup or Roll to throw them.', { at: cup });
      await D.tap(cup);
      await D.wait(settled, 4000);
      await D.say('A 1 scores 100 and a 5 scores 50. Three of a kind scores 100 times the number, so three 3s are worth 300.', { at: live });
      await D.you(die(0), 'Tap one of your 3s. All three are set aside together.', { allow: dice([0, 2, 4]), until: function () { return S().dice[0].sel; } });
      await D.tap(die(1), { after: 500 });
      await D.say('Your 1 scores too, so you set it aside as well. That’s 400 so far this turn.', { at: score });
      await D.say('You could bank now, or roll the last two dice for more. You need 500 in one turn to get on the board, so you roll.', { at: rollBtn });
      await D.tap(rollBtn);
      await D.wait(settled, 4000);
      await D.tap(die(3), { after: 200 });
      await D.tap(die(5), { after: 500 });
      await D.say('Both dice score, so all six have scored. That’s hot dice: you pick all six up and roll again.', { at: rollBtn });
      await D.tap(rollBtn);
      await D.wait(settled, 4500);
      await D.tap(die(1), { after: 500 });
      await D.say('Only the 5 scores this time, which makes 600 for the turn.', { at: score });
      await D.you(bankBtn, 'Tap Bank to put your 600 on the scoreboard.', { until: function () { return S().players[0].score > 0; } });
      await D.wait(function () { return S().cur === 1; }, 4000);
      F.speed(0.3);
      await D.say('Then Bender takes a turn the same way.', { at: board, wait: false });
      await D.wait(function () { return S().cur === 0 && S().phase === 'start' && !F.lock(); }, 30000);
      F.speed(1);
      await D.wait(400);
      await D.tap(cup);
      await D.wait(settled, 4000);
      await D.tap(die(1), { after: 500 });
      await D.say('Three 1s are worth 1,000. You could bank them, but this time you press your luck with the other three dice.', { at: dice([1, 3, 5]) });
      await D.tap(rollBtn);
      await D.wait(function () { return S().phase === 'farkle' && document.querySelector('.zone .stamp'); }, 4000);
      await D.wait(400);
      await D.say('A 2, a 3 and a 6: nothing scores, so that’s a Farkle. You lose the 1,000 from this turn, and your turn is over.', { at: live });
      await D.wait(function () { return S().cur === 1; }, 4000);
      await D.say('The first player to bank 10,000 sets the mark, and everyone else gets one last turn to beat it.', { at: board });
    }
  });
})();
