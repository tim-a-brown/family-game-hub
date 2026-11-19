// Wax Pack's demo (demo.js; CLAUDE.md, Demos): a stack of old cards on the table, the draft, the lineup on its
// diamond, then the first at-bats of the game: the pitch duel guessed right, a strikeout on a wrong guess, and a home run.
(function () {
  'use strict';
  var W = window.__wax;
  function S() { return W.state(); }
  function ab() { return W.ab(); }
  function hx() { var s = S(); return s && s.g ? s.g.hx.length : 0; }
  function myTurnTo(step) { return function () { var a = ab(); return a && !a.busy && a.step === step && !a.cover; }; }

  Kit.demoScript({
    intro: 'Here’s Wax Pack. Your old baseball cards play a real game, and the app calls it.',
    beats: 12,
    end: 'Spread out a stack of your cards, tell the app who’s on them, and pick teams. Every at-bat is a guessing game between the pitcher and the batter.',
    start: function () {
      W.first(0);
      return W.quick({ to: 'stack', seed: 21, inn: 3, a: (localStorage.getItem('my_name') || '').trim() || 'You' });
    },
    steps: async function (D) {
      await D.wait(function () { return D.q('.wp-grid .wp-cbtn'); }, 4000);
      await D.say('Spread a stack of old cards face up on the table. Every card on the table is in the app too.', { at: '.wp-gbox' });
      await D.say('To add a card, take a photo of it or type the name. The app knows every big leaguer and rates him from the year on his card.', { at: '.wp-row2' });
      await D.tap('.wp-go');
      await D.wait(function () { return S().phase === 'draft' && !D.q('.wp-coinov'); }, 6000);
      await D.wait(400);
      await D.you(function () { return D.qa('.wp-cbtn').filter(function (b) { return /Boggs/.test(b.getAttribute('aria-label') || ''); })[0]; },
        'A coin flip says you pick first. Pick teams the way kids do at recess: take Wade Boggs.', { until: function () { return S().T[0].cards.length > 0; } });
      await D.wait(function () { return S().T[1].cards.length > 0; }, 6000);
      await D.wait(700);
      await D.set(function () { W.finishDraft(); });
      await D.say('You take turns until both teams are full, and slide the computer’s picks to its side of the table.', { at: '.wp-dteams' });
      await D.tap('.wp-go');
      await D.wait(function () { return S().phase === 'lineup'; }, 4000);
      await D.wait(600);
      await D.say('Your cards go around the diamond. A green rim means he really played that spot. Red means he’s out of position, and he’ll make more errors there.', { at: '.wp-dia' });
      await D.tap('.wp-ldock .wp-go');
      await D.wait(myTurnTo('look'), 8000);
      await D.wait(1200);
      await D.say('The announcer tells you about the man on each card, from his real seasons.', { at: '.wp-ann' });
      W.rig({ pitch: 'H', o: 'D' });
      await D.you(function () { return D.qa('.wp-pb')[0]; }, 'Every at-bat is a duel. The pitcher has picked a pitch in secret. Guess what’s coming: look for Heat.', { until: function () { var a = ab(); return a && a.step === 'reveal'; } });
      await D.wait(1000);
      await D.say('He guessed it! A batter who looks for the right pitch squares it up. That’s a double.', { at: '.wp-rev' });
      await D.wait(myTurnTo('look'), 9000);
      await D.wait(800);
      W.rig({ pitch: 'H', o: 'K' });
      await D.you(function () { return D.qa('.wp-pb')[2]; }, 'Guess wrong and the pitcher has the edge. Look for Junk this time.', { until: function () { var a = ab(); return a && a.step === 'reveal'; } });
      await D.wait(1000);
      await D.say('It was heat, and he struck out. The bar under each pitch shows whose ratings it favors: the pitcher’s color against the batter’s.', { at: '.wp-rev' });
      await D.wait(myTurnTo('look'), 9000);
      await D.wait(800);
      W.rig({ pitch: 'B', o: 'HR' });
      await D.you(function () { return D.qa('.wp-pb')[1]; }, 'One more: look for the Breaking ball.', { until: function () { return hx() >= 3; } });
      await D.wait(3200);
      await D.say('A home run! Every card you enter stays in your league, with its numbers from every game you play.', { at: '.wp-sb' });
    }
  });
})();
