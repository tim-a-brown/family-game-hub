// Truth or Lies' demo (demo.js; CLAUDE.md, Demos): Classic No. 1, the Island of Knights and Knaves. Ada says she and Ben
// are both knaves, and Ben says Ada is a knave. The demo works out that Ada must be a knave and gives her a red token; you
// give Ben his green one, and the demo checks the answer.
(function () {
  'use strict';
  var X = window.__tl;
  function S() { return X.get(); }
  function actor(i) { return function () { return document.querySelectorAll('.tl .actor')[i] || null; }; }
  function bub(i) { return function () { return document.querySelectorAll('.tl .bub')[i] || null; }; }
  function marks() { return S() ? S().marks : []; }

  Kit.demoScript({
    intro: 'Here’s how a Truth or Lies puzzle goes. You’ll place one of the tokens yourself.',
    beats: 10,
    end: 'Ask what would happen if each person told the truth. When every token fits what they said, you’ve solved it.',
    start: function () { X.start('classic', { cls: 0 }); },
    steps: async function (D) {
      await D.wait(function () { return document.querySelector('.tl .actor'); }, 3000);
      await D.wait(2400);
      await D.say('On this island, knights always tell the truth and knaves always lie. Work out which one each person is.', { at: '.tl .bill' });
      await D.say('Ada says that she and Ben are both knaves.', { at: bub(0), wait: 2600 });
      await D.say('Could Ada be a knight? A knight never lies, and a knight calling herself a knave would be lying. So Ada must be a knave.', { at: bub(0) });
      await D.tap(actor(0), { say: 'Tap a person to put a token at their feet. Green means a knight, and a second tap makes it red for a knave.', after: 900 });
      await D.tap(actor(0), { after: 900 });
      await D.say('Ada is a knave, so her words are false: they are not both knaves. That means Ben must be a knight.', { at: bub(0) });
      await D.you(actor(1), 'Your turn. Tap Ben once to give him a green knight token.', {
        until: function () { return marks()[1] === 0; },
        autoTap: function () { return marks()[1] === 0 ? null : actor(1)(); }
      });
      await D.wait(700);
      await D.say('Ben says Ada is a knave, and that’s true, just as a knight’s words must be. Everything fits.', { at: bub(1) });
      await D.tap('.tl .tray .go', { say: 'When everyone has a token, tap Check.', after: 600 });
      await D.wait(function () { return S().done; }, 4000);
      await D.wait(1200);
      await D.say('Solved! Every speech bubble lights up true or false and says why.', { at: function () { return document.querySelectorAll('.tl .bub'); }, wait: 3600 });
      await D.wait(function () { return document.querySelector('.k-win .card'); }, 5000);
      await D.wait(600);
      await D.say('Harder puzzles have more people, spies who can say anything, and whodunits where you name who did it.', { at: '.k-win .card .sub', place: 'bottom' });
    }
  });
})();
