// Conversation Starters' demo (demo.js; CLAUDE.md, Demos): you draw the first card, the demo stars it and draws the next,
// switches to the Funny pile, and finishes the talk.
(function () {
  'use strict';
  var X = window.__conv;
  function S() { return X.state(); }
  var Q1 = 'What\'s your favorite family tradition?', Q2 = 'What\'s the best advice a parent or grandparent gave you?',
    Q3 = 'Would you rather fight one horse-sized duck or a hundred duck-sized horses?';
  function chip(name) { return function () { return [].filter.call(document.querySelectorAll('.cats .chip'), function (b) { return b.textContent.trim() === name; })[0] || null; }; }
  function cur() { var s = S(); return s && s.cur; }

  Kit.demoScript({
    intro: 'Here’s how a talk goes. You’ll draw the first card.',
    beats: 11,
    end: 'Draw a card, read the question out loud, and talk about it. There are no wrong answers.',
    start: function () { X.start({ options: { timer: 0, depth: 'all' } }, [Q1, Q2]); },
    steps: async function (D) {
      await D.say('This is the deck. Every card holds a question to talk about, and there are no wrong answers.', { at: '.deckwrap' });
      await D.you('.dock .draw', 'Tap Draw a card.', { until: function () { return !!cur(); } });
      await D.wait(900);
      await D.say('Read it out loud: what’s your favorite family tradition? Then everyone answers, one at a time or all together.', { at: '.ccard' });
      await D.say('The dots in the corner show how deep a question goes, from light to deep.', { at: '.ccard .foot' });
      await D.tap('.ccard .star', { say: 'If you love a question, tap its star to keep it in the Starred pile.' });
      await D.wait(1200);
      await D.tap('.dock .draw', { say: 'When everyone has had a say, draw the next card. A swipe to the left works too.' });
      await D.wait(1100);
      await D.say('The chips at the top choose a pile, like Memories, Funny or Deep.', { at: '.cats' });
      await D.tap(chip('Funny'));
      await D.set(function () { X.top([Q3]); });
      await D.wait(400);
      await D.tap('.dock .draw', { say: 'Now every card comes from the Funny pile.' });
      await D.wait(1100);
      await D.say('Would you rather fight one horse-sized duck, or a hundred duck-sized horses? Anyone can say pass, and you just draw the next one.', { at: '.ccard' });
      await D.tap('.dock .btn-soft[aria-label="Finish and save"]', { say: 'When you’re done, Finish saves the cards you talked about in Past talks.' });
      await D.wait(function () { return document.querySelector('.k-sheet .k-acts .btn-primary'); }, 3000);
      await D.wait(500);
      await D.tap('.k-sheet .k-acts .btn-primary');
      await D.wait(function () { return document.querySelector('.k-win'); }, 5000);
      await D.wait(1200);
      await D.say('Your starred cards wait in the Starred pile for next time.', { at: function () { return document.querySelector('.k-win .card') || document.querySelector('.k-win'); } });
    }
  });
})();
