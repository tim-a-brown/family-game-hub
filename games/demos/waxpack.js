// Wax Pack's demo (demo.js; CLAUDE.md, Demos): a stack of old cards on the table, the draft with its three pitchers a
// side, the lineup with the mound's three stints, then two at-bats: the pitch named and the batter's die read on his
// Guessed right row, then a wrong guess and the pitcher's die read on his card.
(function () {
  'use strict';
  var W = window.__wax;
  function S() { return W.state(); }
  function ab() { return W.ab(); }
  function hx() { var s = S(); return s && s.g ? s.g.hx.length : 0; }
  function myTurnTo(step) { return function () { var a = ab(); return a && !a.busy && a.step === step && !a.cover && D0.q('.wp-pb'); }; }
  function rolled() { var a = ab(); return a && a.shown; }
  var D0 = null;

  Kit.demoScript({
    intro: 'Here’s Wax Pack. Your old baseball cards play a real game, and the dice decide every at-bat.',
    beats: 9,
    end: 'Spread out a stack of your cards and pick teams. Every card stays in your league with its numbers, and the menu prints the cards to play at a table without the app.',
    start: function () {
      W.first(0);
      return W.quick({ to: 'stack', seed: 21, inn: 3, a: (localStorage.getItem('my_name') || '').trim() || 'You' });
    },
    steps: async function (D) {
      D0 = D;
      await D.wait(function () { return D.q('.wp-grid .wp-cbtn'); }, 4000);
      await D.say('Spread a stack of old cards face up on the table, and tell the app who is on each one, by name or with a photo.', { at: '.wp-gbox' });
      await D.tap('.wp-go');
      await D.wait(function () { return S().phase === 'draft' && !D.q('.wp-coinov'); }, 6000);
      await D.wait(300);
      await D.you(function () { return D.qa('.wp-cbtn').filter(function (b) { return /Boggs/.test(b.getAttribute('aria-label') || ''); })[0]; },
        'A coin flip says you pick first. Pick teams the way kids do at recess: take Wade Boggs.', { until: function () { return S().T[0].cards.length > 0; } });
      await D.wait(function () { return S().T[1].cards.length > 0; }, 6000);
      await D.wait(500);
      await D.set(function () { W.finishDraft(); });
      await D.say('You take turns until both teams are full. Every team takes exactly three pitchers, and the dots count them.', { at: '.wp-dteams' });
      await D.tap('.wp-go');
      await D.wait(function () { return S().phase === 'lineup'; }, 4000);
      await D.wait(400);
      await D.say('Your three pitchers split the innings, one inning each in this game. Tap two of them on the mound to change the order.', { at: '.wp-mound' });
      await D.tap('.wp-ldock .wp-go');
      await D.wait(myTurnTo('look'), 9000);
      await D.wait(600);
      W.rig({ pitch: 'H', bd: 20, pd: 5 });
      await D.you(function () { return D.qa('.wp-pb')[0]; }, 'The pitcher has laid one of his pitch cards face down. Guess what’s coming: look for Heat.', { until: function () { var a = ab(); return a && a.step === 'reveal'; } });
      await D.wait(rolled, 9000);
      await D.say('You both roll a d20 and add your numbers. The batter has to win by ' + window.WaxEngine.RULE.margin + ', and you did.', { at: '.rl-duel' });
      await D.say('You named the pitch, so you read your own 20 on your Guessed right row, and it lands on a home run.', { at: '.rl-card' });
      await D.wait(myTurnTo('look'), 9000);
      await D.wait(500);
      W.rig({ pitch: 'H', bd: 5, pd: 19 });
      await D.you(function () { return D.qa('.wp-pb')[1]; }, 'Now look for the Breaking ball.', { until: function () { var a = ab(); return a && a.step === 'reveal'; } });
      await D.wait(rolled, 9000);
      await D.say('The pitcher won the throw this time, so his own 19 is read on his card, and it’s a strikeout.', { at: '.rl-card' });
    }
  });
})();
