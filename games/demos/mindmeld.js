// Hive Mind's demo (demo.js; CLAUDE.md, Demos; the page and its ids still say mindmeld): one turn against three computer
// players, about a minute. You roll the die (one dot), choose "Name 2 things you put on a hot dog" from the card's three
// questions, and hand in a paper already written (Ketchup, Mustard); Chili and Chili sauce are put together by hand, the
// points are counted, and the pawns move: EVE, the lowest total, moves down a level.
(function () {
  'use strict';
  var X = window.__ta;
  function G() { return X.state(); }
  var me = 'You', BOTS = ['Bender', 'EVE', 'Johnny 5'];
  var ANS = [null, ['Ketchup', 'Mustard'], ['Chili', 'Onions'], ['Ketchup', 'Chili sauce']];
  var SPOT = 0;   // where the hot dog question is on its card
  function stack(id) { return function () { return document.querySelector('.stk[data-g="' + id + '"]'); }; }
  function pawn(k) { return function () { return document.querySelector('.hive .pawn[data-p="' + k + '"]'); }; }

  Kit.demoScript({
    intro: 'Here’s how a turn of Hive Mind goes against three computer players. You’ll roll the die, choose the question and hand in your responses.',
    beats: 8,
    end: 'Write what you think everyone else will write. The die moves the lowest totals down the board, and as soon as a pawn goes off it, everyone still on the board wins.',
    start: function () {
      me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.local({ mode: 'cpu', timer: 0, levels: 6, players: [{ name: me, color: Kit.color(0) }].concat(BOTS.map(function (n, i) { return { name: n, color: Kit.color(i + 1), cpu: true }; })) });
      var g = G(), cards = X.core.cards(), hd = -1;
      for (var i = 0; i < X.data.length; i++) if (/hot dog/i.test(X.data[i].q)) { hd = i; break; }
      // the card with the hot dog question is the top of the deck, and the die comes up one dot
      for (var c = 0; c < cards.length; c++) { var k = cards[c].indexOf(hd); if (k >= 0) { SPOT = k; g.deck = [c].concat(g.deck.filter(function (x) { return x !== c; })); break; } }
      X.ui.forceRoll = 0;
      X.ui.sig = ''; X.kick();
    },
    steps: async function (D) {
      await D.you('.rtray .qd', 'Every Mind pawn starts on level 1, at the top of the board. It’s your turn: tap the die to roll it.', {
        until: function () { return G().phase === 'ask'; },
        autoTap: function () { return document.querySelector('.rtray .qd'); }
      });
      await D.wait(1100);
      await D.say('One dot: after this question, the player with the lowest total moves down a level.', { at: '.pcw .qd' });
      await D.say('You drew a card with three questions on it. You can ask any of them, or make up your own.', { at: '.hmc' });
      await D.you('.bq[data-c="' + SPOT + '"]', 'Tap the hot dog question to ask it.', {
        until: function () { return G().phase === 'write'; },
        autoTap: function () { return document.querySelector('.bq[data-c="' + SPOT + '"]'); }
      });
      // (your paper already says Ketchup and Mustard, and the computer players hand theirs in at once)
      await D.set(function () { var g = G(); g.cpuAt = g.players.map(function () { return Date.now() + 864e5; }); X.draft(['Ketchup', 'Mustard']); X.ui.sig = ''; X.kick(); });
      await D.wait(700);
      await D.set(function () { [1, 2, 3].forEach(function (k) { G().ans[k] = ANS[k].slice(); }); X.kick(); });
      await D.you('.pad .fold', 'Everyone writes what they think the others will write. Your paper says Ketchup and Mustard: tap to hand it in.', {
        until: function () { return !!G().ans[0]; },
        autoTap: function () { return document.querySelector('.pad .fold'); }
      });
      await D.wait(function () { return G().phase === 'reveal'; }, 8000);
      await D.wait(1300);
      await D.say('Matching responses stack up. Chili and Chili sauce are the same thing, so tap one and then the other to put them together.', { at: function () { return [stack('chilisauce')(), stack('chili')()].filter(Boolean); } });
      await D.tap(stack('chilisauce'), { after: 400 });
      await D.tap(stack('chili'), { after: 700 });
      await D.tap('.acts .btn-primary', { say: 'You score 1 point for each response you wrote, and 1 more for each other player who wrote it too.' });
      await D.wait(1500);
      var pts = G().pts || [0];
      await D.say('Three of you wrote Ketchup, so each of you scores 3 for it. Your total is ' + pts[0] + ', and EVE’s is only ' + (pts[2] || 0) + '.', { at: pawn(0), wait: 3600 });
      await D.wait(function () { return X.ui.shook === String(G().round); }, 6000);
      await D.wait(1100);
      await D.say('EVE had the lowest total, so EVE’s pawn moves down a level. As soon as a pawn goes off the bottom of the board, the game ends and everyone still on it wins.', { at: '.hive' });
    }
  });
})();
