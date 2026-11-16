// Riddle Stories' demo (demo.js; CLAUDE.md, Demos): you read the case "Friday" to Jamie and Pete. You open the case file,
// peek at the solution, answer their questions, give a clue, and Pete cracks it.
(function () {
  'use strict';
  var X = window.__rs;
  function S() { return X.state(); }
  var me = 'You', P = [];
  function pill(i) { return function () { return document.querySelectorAll('.strip .pill')[i] || null; }; }
  function btn(text) { return function () { return [].filter.call(document.querySelectorAll('.dock .btn'), function (b) { return b.textContent.indexOf(text) >= 0; })[0] || null; }; }
  function who(name) { return function () { return [].filter.call(document.querySelectorAll('.k-sheet .k-name'), function (b) { return b.textContent.indexOf(name) >= 0; })[0] || null; }; }

  Kit.demoScript({
    intro: 'Here’s how a case goes with three detectives. You’ll be the reader this time.',
    beats: 13,
    end: 'The reader reads the story and answers only yes, no or doesn’t matter. Everyone else asks until someone cracks the case.',
    start: function () {
      me = (localStorage.getItem('my_name') || '').trim() || 'You';
      P = [me].concat(['Jamie', 'Pete', 'Sam'].filter(function (n) { return n !== me; }).slice(0, 2));
      X.start({ mode: 'group', players: P.map(function (n, i) { return { name: n, color: Kit.color(i) }; }), options: { deck: 'M', n: 5 } }, ['friday', 'frozen', 'trucker', 'horserace', 'shaver']);
    },
    steps: async function (D) {
      await D.say('Each case is a little mystery. One player is the reader, and this time that’s you.', { at: pill(0) });
      await D.you('.folder .cover', 'Tap the case file to open it.', { until: function () { return S().phase === 'open'; } });
      await D.wait(900);
      await D.say('Read the story out loud: a cowboy rides into town on Friday, stays three days, and rides out on Friday. How?', { at: '.page' });
      await D.tap(btn('Hold to peek'), { ghost: true, after: 0 });
      await D.set(function () { X.peek(true); });
      await D.say('Only the reader holds Peek, to see the solution in secret. Now you know how to answer.', { pos: 'top', ring: false, wait: 4200 });
      await D.set(function () { X.peek(false); });
      await D.say('The others ask questions, and the reader may only answer yes, no, or doesn’t matter.', { at: '.howto' });
      await D.say(P[1] + ' asks, “Did he stay longer than a week?” You say no. ' + P[2] + ' asks, “Is Friday a day of the week here?” You say no.', { pos: 'center', ring: false, wait: 5200 });
      await D.tap(btn('Clue'), { say: 'They’re stuck, so you give them a clue. Fewer clues means more points.' });
      await D.wait(1200);
      await D.say('A case solved with no clues scores 3 points, with one clue 2, and with more than that 1.', { at: '.clue' });
      await D.say(P[2] + ' asks, “Is Friday the name of his horse?” Yes! ' + P[2] + ' cracked the case.', { pos: 'center', ring: false, wait: 3800 });
      await D.you(btn('Solved'), 'Tap Solved!', { until: function () { return !!document.querySelector('.k-sheet .k-name'); } });
      await D.wait(500);
      await D.you(who(P[2]), 'Tap ' + P[2] + ', who cracked it.', { until: function () { return S().phase === 'revealed'; } });
      await D.wait(2600);
      await D.say('The sealed envelope opens to show the solution, and ' + P[2] + ' scores 2 points.', { at: '.solution' });
      await D.say('The reader changes every case, so everyone gets a turn. After the last case, the best detective wins.', { at: '.dock .btn-primary' });
    }
  });
})();
