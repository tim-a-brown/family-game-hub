// Trivia's demo (demo.js; CLAUDE.md, Demos): a game of Countdown, the way to play by yourself. The category comes up,
// then the question, then the four answers while the points drain from 1,000; you pick an answer and lock it in. Then
// the demo skips to the last question, answers it fast for a streak bonus, and shows the final score.
(function () {
  'use strict';
  var T = window.__tv;
  function V() { return T.view(); }
  function E() { return T.eng(); }
  function ph() { var v = V(); return v && v.ph; }
  function tile(k) { return function () { return document.querySelectorAll('.stage .tiles .tile')[k]; }; }
  function revealed() { var v = V(); return !!(v && v.rv && document.querySelector('.cnext .btn')); }
  function myRes() { var v = V(); return v && v.rv && v.rv.r[v.me]; }

  Kit.demoScript({
    intro: 'Here’s how a game of Trivia goes. You’ll answer a question yourself.',
    beats: 12,
    end: 'Read the question, tap your answer and lock it in. The faster you answer, the more points you score.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      T.solo(me, { level: 'medium', count: 10 });
    },
    steps: async function (D) {
      await D.wait(function () { return ph() === 'cat' || ph() === 'read'; }, 6000);
      await D.say('Each question starts with its category. This game mixes every category.', { at: '.stage .qwrap', wait: false });
      await D.wait(function () { return ph() === 'read'; }, 8000);
      await D.wait(1300);
      await D.say('Then the question comes up. Read it while the bar under it fills.', { at: '.qcard', wait: false });
      await D.wait(function () { return ph() === 'ans'; }, 15000);
      await D.say('Now the four answers show, and your points start draining from 1,000. The faster you answer, the more you score.', { at: '.stage .meter', wait: 3800 });
      await D.you('.stage .tiles', 'Tap the answer you think is right.', {
        allow: function () { return D.qa('.stage .tiles .tile'); }, autoTap: function () { return tile(T.right())(); },
        until: function () { return V().pick >= 0; }, spot: false
      });
      await D.you('.cfoot .lockbtn', 'Tap Lock in to keep those points. Until then you can still change your answer.', { until: function () { return V().locked || !!V().rv; } });
      await D.wait(revealed, 6000);
      await D.wait(600);
      var r = myRes(), ok = r && r[0] === V().rv.k;
      if (ok) await D.say('Right! You scored ' + (r[2] + r[3]).toLocaleString('en-US') + ' points for answering in ' + (r[1] / 1000).toFixed(1) + ' seconds.', { at: '.stage .meter' });
      else await D.say('Not this time. The right answer lights up green, and its tile tells you a fact about it.', { at: function () { return document.querySelector('.stage .tiles .tile.ok'); } });
      await D.say('Your score is at the top, beside how many you’ve answered right in a row. A streak earns bonus points.', { at: '.hud' });
      // the end of the game: the last question
      await D.set(function () { var e = E(); e.n = e.cfg.count - 2; e.st[1] = 3; V().st = 3; });
      await D.tap('.cnext .btn', { say: 'Now we skip ahead to the last of the ten questions.', after: 300 });
      await D.wait(function () { return ph() === 'ans'; }, 15000);
      await D.wait(900);
      await D.tap(function () { return tile(T.right())(); }, { after: 500 });
      await D.tap('.cfoot .lockbtn', { say: 'This time the answer is locked in fast.' });
      await D.wait(revealed, 6000);
      await D.wait(1600);
      await D.say('Four in a row adds a streak bonus on top of the points for speed.', { at: '.stage .meter' });
      await D.tap('.cnext .btn', { after: 900 });
      await D.wait(function () { return V() && V().ended; }, 6000);
      await D.wait(900);
      // a score that makes the device's top 50 asks for initials (from the device's own high scores, so not always)
      if (document.querySelector('.ahi-overlay')) {
        await D.you(function () { return D.q('.ahi-quick') || D.q('#ahi-slots'); }, 'Your score made the high score board. Tap your initials, or type them, to sign it.', {
          allow: function () { return D.qa('.ahi-overlay, .k-osk'); },
          autoTap: function () { return D.q('.ahi-quick button') || D.q('#ahi-skip'); },
          until: function () { return !document.querySelector('#ahi-slots') && !document.querySelector('.ahi-quick'); }, spot: false, avoid: ['.k-osk', '#ahi-slots', '.ahi-acts']
        });
        await D.wait(1400);
        if (document.querySelector('#ahi-go')) await D.tap('#ahi-go', { after: 900 });
      }
      await D.say('Your score for the game is here. With friends, Pass and play, Buzz in and Play online put everyone in the same game.', { at: function () { return D.q('.k-win .card') || D.q('.stage'); }, ring: false });
    }
  });
})();
