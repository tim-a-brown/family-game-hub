// Wheel of Fortune's demo (demo.js; CLAUDE.md, Demos): the first round of a show against two computer contestants. You
// spin $700 and call T (three T's, $2,100), the demo buys an E, then you fill in the last four letters and solve SET THE
// TONE. (Toss-ups are set off for the demo, so the round starts on your spin; a caption says what they are.)
(function () {
  'use strict';
  var W = window.__wof;
  var PZ = { cat: 'PHRASE', text: 'SET THE TONE' };
  function S() { return W.state(); }
  function key(L) { return function () { return [].slice.call(document.querySelectorAll('.kb .key')).filter(function (k) { return k.textContent === L; })[0]; }; }
  function btnOf(re) { return function () { return [].slice.call(document.querySelectorAll('.acts button')).filter(function (b) { return re.test(b.textContent); })[0]; }; }
  function idle() { var u = W.ui(); return !u.busy && !W.wheel.busy(); }
  function pod(i) { return function () { return document.querySelectorAll('.pods .pod')[i]; }; }
  Kit.demoScript({
    intro: 'Here’s how a round of Wheel of Fortune goes. You’ll spin, call a letter and solve the puzzle yourself.',
    beats: 11,
    end: 'Spin and call consonants to build your money, buy vowels when you need them, and solve when you know it.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      W.rigPz = PZ;
      // (toss-ups off, so the round starts with your spin)
      W.start({ mode: 'cpu', players: [{ name: me }, { name: 'Bender', cpu: true }, { name: 'EVE', cpu: true }], options: { rounds: 3, tossups: 'off', clock: 10 } });
    },
    steps: async function (D) {
      await D.wait(function () { var s = S(); return s && s.phase === 'turn' && idle(); }, 15000);
      await D.say('Here’s the puzzle. It’s a phrase, and each white tile hides one letter.', { at: '.board' });
      W.rigW = 700;
      await D.you('.acts .spinbtn', 'It’s your turn. Tap Spin, or flick the wheel with your finger.', { until: function () { return S().phase === 'call' && idle(); } });
      await D.wait(600);
      await D.say('You landed on $700. Now you call a consonant, and every time it’s in the puzzle you win $700.', { at: '.studio' });
      await D.you(key('T'), 'Call T.', { until: function () { return S().used.indexOf('T') >= 0 && idle(); } });
      await D.wait(300);
      await D.say('There are three T’s, so you win $2,100. A letter that isn’t in the puzzle passes the turn.', { at: pod(0) });
      await D.say('Your turn goes on. Vowels aren’t spun for: you buy one for $250.', { at: btnOf(/Buy a vowel/) });
      await D.tap(btnOf(/Buy a vowel/), { after: 400 });
      await D.tap(key('E'));
      await D.wait(function () { return S().used.indexOf('E') >= 0 && idle(); }, 8000);
      await D.say('Three E’s. Now there’s enough on the board to solve it.', { at: '.board' });
      await D.tap(btnOf(/^Solve$/), { after: 400 });
      await D.you('.kb', 'Fill in the missing letters on the keyboard, one for each blank tile.', {
        allow: function () { return D.qa('.kb .key'); }, autoTap: function () { var L = W.nextBlank(); return L ? key(L)() : null; },
        until: function () { return W.filled(); }, spot: false
      });
      await D.tap(btnOf(/Solve it/));
      await D.wait(function () { return S().phase === 'roundEnd' && idle(); }, 12000);
      await D.say('You solved it, so you keep the money you won this round. The other contestants lose theirs.', { at: pod(0) });
      await D.say('Before each round there’s a toss-up too: letters pop up one at a time, and the first to buzz in and solve wins the cash.', { at: '.board' });
      await D.say('After three rounds, the contestant with the most money plays the Bonus Round for a prize in an envelope.', { at: btnOf(/Round 2|Bonus/) });
    }
  });
})();
