// Hive Mind's demo (demo.js; CLAUDE.md, Demos; the page and its ids still say mindmeld): one round against three
// computer players, about a minute. You choose the card, "Name 2 things you put on a hot dog", and the Queen Bee die
// rolls a 1; you hand in a paper already written (Ketchup, Mustard); Chili and Chili sauce are put together by hand,
// the points are counted, and the hive shakes: EVE, the lowest score, drops a level.
(function () {
  'use strict';
  var X = window.__ta;
  function G() { return X.state(); }
  var me = 'You', BOTS = ['Bender', 'EVE', 'Johnny 5'];
  var ANS = [null, ['Ketchup', 'Mustard'], ['Chili', 'Onions'], ['Ketchup', 'Chili sauce']];
  var HOTDOG = 1;   // "Name 2 things you put on a hot dog" among the house questions
  function stack(id) { return function () { return document.querySelector('.stk[data-g="' + id + '"]'); }; }
  function bee(k) { return function () { return document.querySelector('.hive .bee[data-p="' + k + '"]'); }; }

  Kit.demoScript({
    intro: 'Here’s how a round of Hive Mind goes against three computer players. You’ll choose the card and hand in your answers.',
    beats: 7,
    end: 'Write what you think the rest of the hive will write. The lowest scores drop down the hive, and a bee who drops out of it ends the game.',
    start: function () {
      me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.local({ mode: 'cpu', timer: 0, players: [{ name: me, color: Kit.color(0) }].concat(BOTS.map(function (n, i) { return { name: n, color: Kit.color(i + 1), cpu: true }; })) });
      var g = G(), hd = -1;
      for (var i = 0; i < X.data.length; i++) if (/hot dog/i.test(X.data[i].q)) { hd = i; break; }
      HOTDOG = hd < 0 ? HOTDOG : hd;
      // you ask first, and the hot dog card is the first one offered
      g.ask = 0; g.offer[0] = HOTDOG; if (g.offer[1] === HOTDOG) g.offer[1] = g.deck.shift();
      X.ui.forceRoll = 0;   // (the Queen Bee die comes up 1)
      X.ui.sig = ''; X.kick();
    },
    steps: async function (D) {
      await D.you('.offer .pc', 'Every player is a bee, and every bee starts at the top of the hive. It’s your turn to ask: tap the hot dog card.', {
        until: function () { return G().phase === 'write'; },
        autoTap: function () { return document.querySelector('.offer .pc'); }
      });
      // (the die shows 1; your paper already says Ketchup and Mustard, and the computer players hand theirs in at once)
      await D.set(function () { var g = G(); g.cpuAt = g.players.map(function () { return Date.now() + 864e5; }); X.draft(['Ketchup', 'Mustard']); X.ui.sig = ''; X.kick(); });
      await D.wait(700);
      await D.say('The Queen Bee die rolled a 1, so after this round the one lowest score drops a level.', { at: '.qd' });
      await D.set(function () { [1, 2, 3].forEach(function (k) { G().ans[k] = ANS[k].slice(); }); X.kick(); });
      await D.you('.pad .fold', 'Everyone writes what they think the others will write. Your paper says Ketchup and Mustard: tap to hand it in.', {
        until: function () { return !!G().ans[0]; },
        autoTap: function () { return document.querySelector('.pad .fold'); }
      });
      await D.wait(function () { return G().phase === 'reveal'; }, 8000);
      await D.wait(1300);
      await D.say('Matching answers stack up. Chili and Chili sauce mean the same thing, so tap one and then the other to put them together.', { at: function () { return [stack('chilisauce')(), stack('chili')()].filter(Boolean); } });
      await D.tap(stack('chilisauce'), { after: 400 });
      await D.tap(stack('chili'), { after: 700 });
      await D.tap('.acts .btn-primary', { say: 'Each answer scores a point for every player who wrote it.' });
      await D.wait(1500);
      var pts = G().pts || [0];
      await D.say('Three of you wrote Ketchup, so it scores 3 each. You scored ' + pts[0] + ' this round, and EVE scored only ' + (pts[2] || 0) + '.', { at: bee(0), wait: 3600 });
      await D.wait(function () { return X.ui.shook === String(G().round); }, 6000);
      await D.wait(1100);
      await D.say('The hive shakes: EVE drops a level. A bee who drops from the last level goes out the door, the game ends, and everyone still in the hive wins.', { at: '.hive' });
    }
  });
})();
