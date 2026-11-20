// Wax Pack's demo (demo.js; CLAUDE.md, Demos): a box of cards dealt for someone with none at hand, the draft with its
// three pitchers a side, the lineup with the mound's three stints, then two at-bats: the pitch named and the batter's
// die read on his Guessed right row, then a wrong guess and the pitcher's die read on his card.
(function () {
  'use strict';
  var W = window.__wax;
  function S() { return W.state(); }
  function ab() { return W.ab(); }
  function myTurnTo(step) { return function () { var a = ab(); return a && !a.busy && a.step === step && !a.cover && D0.q('.wp-pb'); }; }
  function rolled() { var a = ab(); return a && a.shown; }
  var D0 = null;
  // the hitter with the best Bat still on the table, for the first pick
  function bestHitter() {
    var s = S(), taken = {}, best = null;
    s.T.forEach(function (T) { T.cards.forEach(function (id) { taken[id] = 1; }); });
    s.stack.forEach(function (id) { var c = s.C[id]; if (taken[id] || c.kind !== 'player' || c.role !== 'h') return; var b = window.WaxEngine.table(c).r.bat; if (!best || b > best.b) best = { c: c, b: b }; });
    return best && best.c;
  }

  Kit.demoScript({
    intro: 'Here’s Wax Pack. Your old baseball cards play a real game, and the dice decide every at-bat.',
    beats: 8,
    end: 'Spread out a stack of your own cards, or open a box, and pick teams. The menu prints the cards to play at a table without the app.',
    start: function () {
      W.first(0);
      return W.quick({ to: 'stack', empty: 1, seed: 21, inn: 3, a: (localStorage.getItem('my_name') || '').trim() || 'You' });
    },
    steps: async function (D) {
      D0 = D;
      await D.wait(function () { return D.q('.wp-boxt'); }, 4000);
      await D.you('.wp-boxt', 'No cards at hand? Open a box, and the app deals real players from the record book.', { until: function () { return S().stack.length > 0; } });
      await D.wait(function () { return !W.boxing() && D.q('.wp-grid .wp-cbtn.dealt'); }, 9000);
      await D.wait(200);
      await D.tap('.wp-go');
      await D.wait(function () { return S().phase === 'draft' && !D.q('.wp-coinov'); }, 6000);
      await D.wait(150);
      var star = bestHitter();
      await D.you(function () { return D.qa('.wp-cbtn').filter(function (b) { return b.getAttribute('aria-label') === 'Take ' + star.name; })[0]; },
        'A coin flip says you pick first. Pick teams the way kids do at recess: take ' + star.name + '.', { until: function () { return S().T[0].cards.length > 0; } });
      await D.wait(function () { return S().T[1].cards.length > 0; }, 6000);
      await D.wait(200);
      await D.set(function () { W.finishDraft(); });
      await D.say('You take turns until both teams are full. Every team takes exactly three pitchers, and the dots count them.', { at: '.wp-dteams' });
      await D.tap('.wp-go');
      await D.wait(function () { return S().phase === 'lineup'; }, 4000);
      await D.wait(150);
      await D.say('Your three pitchers split the innings, one inning each in this game. Tap two of them to swap.', { at: '.wp-mound' });
      await D.tap('.wp-ldock .wp-go');
      await D.wait(myTurnTo('look'), 9000);
      await D.wait(200);
      W.rig({ pitch: 'H', bd: 20, pd: 5 });
      await D.you(function () { return D.qa('.wp-pb')[0]; }, 'The pitcher has laid one of his pitch cards face down. Guess what’s coming: look for Heat.', { until: function () { var a = ab(); return a && a.step === 'reveal'; } });
      await D.wait(rolled, 9000);
      await D.say('You both rolled a d20 and added your numbers, and you won by ' + window.WaxEngine.RULE.margin + ' or more. You named the pitch, so your own 20 is read on your Guessed right row: a home run.', { at: '.rl-card' });
      await D.wait(myTurnTo('look'), 9000);
      await D.wait(200);
      W.rig({ pitch: 'H', bd: 5, pd: 19 });
      await D.you(function () { return D.qa('.wp-pb')[1]; }, 'Now look for the Breaking ball.', { until: function () { var a = ab(); return a && a.step === 'reveal'; } });
      await D.wait(rolled, 9000);
      await D.say('The pitcher won the roll this time, so his own 19 is read on his card, and it’s a strikeout.', { at: '.rl-card' });
    }
  });
})();
