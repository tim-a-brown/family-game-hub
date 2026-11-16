// Apples to Apples' demo (demo.js; CLAUDE.md, Demos): two rounds against three computer players. Johnny 5 judges
// "Creepy" and you play A Haunted House; then you judge "Enormous", turn over the red cards, pick your favorite, and end
// the game there with End game.
(function () {
  'use strict';
  var X = window.__a2a;
  function G() { return X.state(); }
  // red cards by their place in the Core Set (data/a2a-cards.js), green cards the same
  var R = { haunted: 16, pajamas: 338, golf: 302, snowmen: 418, bananas: 74, pogo: 359, tickling: 455,
    vampires: 474, elephants: 181, alarm: 54, freeze: 98, noodles: 326, frogs: 209, hotdogs: 247,
    caves: 119, whales: 482, sandcastle: 33, grapes: 223, libraries: 279, puddles: 370, tape: 176,
    mountains: 312, bikes: 87, mud: 314, fishing: 197, crickets: 149, chimes: 486, camp: 431 };
  var GR = { creepy: 36, enormous: 57 };
  var HANDS = [['haunted', 'pajamas', 'golf', 'snowmen', 'bananas', 'pogo', 'tickling'],
    ['vampires', 'elephants', 'alarm', 'freeze', 'noodles', 'frogs', 'hotdogs'],
    ['caves', 'whales', 'sandcastle', 'grapes', 'libraries', 'puddles', 'tape'],
    ['mountains', 'bikes', 'mud', 'fishing', 'crickets', 'chimes', 'camp']];
  var me = 'You', BOTS = ['Bender', 'EVE', 'Johnny 5'];
  function mine(k) { return function () { var c = document.querySelector('.hand .hc .ac[data-id="' + R[k] + '"]'); return c && c.closest('.hc'); }; }
  function chip(i) { return function () { return document.querySelector('.scores .score[data-i="' + i + '"]'); }; }
  function subs() { return document.querySelectorAll('.plays .sub'); }
  function redName(id) { return X.data().A.RED[id].n; }
  function winner() { var g = G(); return g && g.win ? g.win.p : null; }
  function nameOf(i) { return i === 0 ? me : BOTS[i - 1]; }

  Kit.demoScript({
    intro: 'Here’s how two rounds go against three computer players. You’ll play a red card, and then judge one yourself.',
    beats: 18,
    end: 'Play the red card that fits the green card best, or the one the judge will like most. When you judge, pick your favorite.',
    start: function () {
      me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.local({ mode: 'solo', deck: 'a2a', packs: ['core'], rules: {}, target: 'auto', ghost: false,
        players: [{ name: me, color: Kit.color(0) }].concat(BOTS.map(function (n, i) { return { name: n, color: Kit.color(i + 1), cpu: true }; })) });
      return D0.wait(function () { return !!G(); }, 8000).then(function () {
        X.set(function (g) {
          var used = {};
          g.players.forEach(function (p, i) {
            p.hand = HANDS[i].map(function (k) { used[R[k]] = 1; return R[k]; });
            if (p.cpu) p.pers = { fav: [], noise: 0.2, wild: 0, len: 1 };   // (they play and judge by the cards alone)
          });
          g.pile.a = g.pile.a.filter(function (c) { return !used[c]; });
          g.pile.p = g.pile.p.filter(function (c) { return c !== GR.creepy && c !== GR.enormous; }).concat([GR.enormous, GR.creepy]);
          g.judge = 3; g.round = 1; g.phase = 'flip'; g.prompt = []; g.shown = false; g.subs = [];
        });
      });
    },
    steps: async function (D) {
      await D.say('Everyone holds seven red cards. Each round, one player is the judge, and this round it’s Johnny 5, who wears the crown.', { at: chip(3) });
      await D.wait(function () { return G().shown; }, 6000);
      await D.say('Johnny 5 turned over the green card, Creepy. Everyone else plays the red card from their hand that fits it best.', { at: '.pr-slot' });
      await D.say('A Haunted House, with its squeaky floors, is about as creepy as it gets.', { at: mine('haunted'), pos: 'above' });
      await D.you(mine('haunted'), 'Tap A Haunted House to pick it.', { pos: 'above', until: function () { return X.ui.sel.indexOf(R.haunted) >= 0; } });
      await D.you('.rail .hd .btn', 'Now tap Play it.', { until: function () { return !!G().subs.some(function (s) { return s.p === 0; }); } });
      await D.wait(function () { return G().phase === 'judge'; }, 9000);
      await D.wait(function () { return G().phase === 'result'; }, 12000);
      await D.wait(900);
      var w = winner();
      await D.say(w === 0 ? 'Johnny 5 picked A Haunted House, so you win the green card. With four players, the first to win eight green cards wins.'
        : 'Johnny 5 picked ' + nameOf(w) + '’s card, so ' + nameOf(w) + ' wins the green card. With four players, the first to win eight green cards wins.', { at: chip(w), pos: 'below' });
      await D.say('The judge says why. It’s the judge’s taste that counts, so a funny card can win too.', { at: '.why' });
      await D.tap('.tbl .bar .btn-primary', { say: 'Then the next player to the left is the judge. That’s you.' });
      await D.wait(function () { return G().phase === 'flip' && G().judge === 0; }, 4000);
      await D.wait(500);
      await D.you('.tbl .bar .btn-primary', 'Tap Turn over the green card.', { until: function () { return G().shown; } });
      await D.wait(700);
      await D.say('Enormous! Bender, EVE and Johnny 5 each play a red card face down, so you won’t know whose is whose.', { at: '.pr-slot' });
      await D.wait(function () { return G().phase === 'judge'; }, 9000);
      await D.wait(800);
      await D.say('Turn the red cards over and read them out loud.', { at: '.tbl .bar .btn', wait: 2000 });
      await D.tap('.tbl .bar .btn');
      await D.wait(1400);
      var names = [].map.call(G().subs, function (s) { return redName(s.c[0]); });
      await D.say('You have ' + names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] + ' to choose from.', { at: '.plays' });
      await D.you(subs, 'Which one is the most enormous? Tap your favorite.', { allow: ['.plays .sub'], until: function () { return X.ui.jsel >= 0; } });
      await D.you('.tbl .bar .btn-primary', 'Tap This one wins.', { until: function () { return G().phase === 'result'; } });
      await D.wait(1600);
      var w2 = winner();
      await D.say(nameOf(w2) + ' wins Enormous. Nobody knew whose card it was until you picked it.', { at: chip(w2), pos: 'below' });
      await D.tap('.endrow .btn-soft', { say: 'You can also stop after any round with End game.' });
      await D.wait(function () { return document.querySelector('.k-sheet .k-acts .btn-primary'); }, 3000);
      await D.wait(500);
      await D.say('End game asks first, and says who wins with the green cards they have now.', { at: '.k-sheet p', place: 'bottom', wait: 3400 });
      await D.tap('.k-sheet .k-acts .btn-primary');
      await D.wait(function () { return document.querySelector('.k-win .rank') || document.querySelector('.k-win'); }, 6000);
      await D.wait(1200);
      await D.say('The results card counts everyone’s green cards.', { at: function () { return document.querySelector('.k-win .rank') || document.querySelector('.k-win .card'); } });
    }
  });
  var D0 = { wait: function (fn, max) { return new Promise(function (res) { var t0 = Date.now(); (function p() { if (fn() || Date.now() - t0 > max) return res(); setTimeout(p, 60); })(); }); } };
})();
