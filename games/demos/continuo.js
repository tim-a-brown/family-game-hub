// Continuo's demo (demo.js; CLAUDE.md, Demos): the first card is turned up; you turn your card a quarter, move it beside
// the first card where every touching square matches, and score its two chains; Jamie answers; a few cards later your
// card joins two green chains into one, and the points show where they come from before you put it down.
(function () {
  'use strict';
  var A = window.__continuo;
  function S() { return A.state(); }
  function aim() { return A.aim() || {}; }
  // the deal (seed 1080): your first card fits best turned a quarter at (-4, -2); Jamie's at (4, 1); then six cards,
  // and your card fits at (-1, 4), joining two green chains
  var LATER = ['14@-5,2/', '33@-9,-1', '3@2,-4', '4@-6,-6', '10@-2,-8', '41@-13,1'];

  Kit.demoScript({
    intro: 'Here’s how to match the colors, and how one card can score a whole chain.',
    beats: 11,
    end: 'Match every square your card touches, and look for the card that joins two chains into one.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      A.start({ mode: 'pp', seed: 1080, hints: true, players: [{ name: me, cpu: false }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false }] });
      A.orient(0);
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('Every card has 16 small squares in four colors. Where your card’s squares touch squares on the table, the colors must match. That’s the one rule.', { at: '.frame .tiles .tl' });
      await D.you('.ct-rot', 'Tap Turn to turn your card a quarter turn.', { until: function () { return aim().o === 1; } });
      await D.you(A.spot(-4, -2), 'Now tap the table at the left of the first card to move your card there.', { until: function () { var a = aim(); return a.x === -4 && a.y === -2 && a.o === 1; } });
      await D.wait(300);
      await D.say('The gold dots mark the squares that match. Your card makes a red chain and a yellow chain longer, and +8 is what they score.', { at: function () { return A.ghostTag(); } });
      await D.you('.ct-go', 'Tap Place to put the card down.', { until: function () { return S().pl.length >= 2; } });
      await D.wait(function () { return !A.busy; }, 4000);
      var n = S().pl.length;
      await D.set(function () { A.play('2@4,1'); });
      await D.wait(function () { return S().pl.length > n && !A.busy; }, 5000);
      await D.say('A chain your card makes longer scores its whole length: a red chain of 4 and a yellow chain of 4 made 8 points. ' + them + ' put a card down on the other side.', { at: '.ct-plates' });
      await D.set(function () { A.set(LATER); A.orient(0); A.zoom(true, 1, 6); });
      await D.you(A.spot(-1, 4), 'A few cards later, tap the table where your card fits between two green chains.', { until: function () { var a = aim(); return a.x === -1 && a.y === 4 && a.o === 0; } });
      await D.wait(300);
      await D.you(function () { return A.ghostTag(); }, 'Tap the points to see where they come from.', { until: function () { return A.peeked; } });
      await D.wait(400);
      await D.say('Each chain lights up with its length. The two green chains become one, and it scores once, at its new length.', { at: '.frame' });
      n = S().pl.length;
      await D.you('.ct-go', 'Tap Place for the points.', { until: function () { return S().pl.length > n; } });
      await D.wait(function () { return !A.busy; }, 6000);
      await D.say('Chains joined, for 22 points. The game ends when the last card is down, and the highest score wins.', { at: '.ct-plates' });
    }
  });
})();
