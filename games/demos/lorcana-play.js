// Lorcana's demo (demo.js; CLAUDE.md, Demos): one turn against the computer, with the real cards. You put a card into
// your inkwell, play Pumbaa with the ink, challenge Sprocket's exerted Aurora with Mickey Mouse and banish her, and send
// Kristoff questing for lore.
(function () {
  'use strict';
  var L = window.__lorcana;
  function S() { return L.state(); }
  var U = {};
  function card(k) { return function () { return document.querySelector('.lp [data-uid="' + U[k] + '"]'); }; }
  function zoomBtn(re) { return function () { return [].slice.call(document.querySelectorAll('.lz button, .lz [role=button]')).filter(function (b) { return re.test(b.textContent) && !b.disabled; })[0]; }; }
  function barBtn(re) { return function () { return [].slice.call(document.querySelectorAll('.lp-bar button')).filter(function (b) { return re.test(b.textContent) && !b.disabled; })[0]; }; }
  function zoomOpen() { return !!document.querySelector('.lz'); }
  function where(k) { var s = S(), u = U[k]; for (var i = 0; i < 2; i++) for (var z in { hand: 1, ink: 1, board: 1, discard: 1 }) if (s.P[i][z].indexOf(u) >= 0) return z; return ''; }

  Kit.demoScript({
    intro: 'Here’s a turn of Lorcana. You’ll put a card into your inkwell and send a character into a challenge yourself.',
    beats: 12,
    end: 'Each turn, ink a card, play characters with your ink, and quest for lore. Challenge exerted characters to banish them. The first to 20 lore wins.',
    start: async function (D) {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      await D.wait(function () { return L.db.status === 'ready' || L.db.status === 'error'; }, 90000);
      if (L.db.status !== 'ready') return;
      L.start({ mode: 'cpu', players: [{ name: me, cpu: false, color: Kit.color(0) }, { name: 'Sprocket', cpu: true, color: Kit.color(1) }], options: { first: 'p1' } },
        [{ kind: 'quick', inks: ['Amber', 'Steel'] }, { kind: 'quick', inks: ['Ruby', 'Sapphire'] }]);
      var s = S();
      // the deal goes back into the decks; the table is set for your fourth turn
      s.P.forEach(function (P) { P.deckL = P.deckL.concat(P.hand, P.ink, P.board); P.hand = []; P.ink = []; P.board = []; });
      ['Minnie Mouse - Always Classy', 'Goons - Maleficent\'s Underlings', 'Donald Duck - Boisterous Fowl'].forEach(function (n, i) { U['i' + i] = L.put(0, n, 'ink'); });
      U.mickey = L.put(0, 'Mickey Mouse - True Friend', 'board');
      U.kristoff = L.put(0, 'Kristoff - Official Ice Master', 'board');
      U.stitch = L.put(0, 'Stitch - New Dog', 'hand');
      U.pumbaa = L.put(0, 'Pumbaa - Friendly Warthog', 'hand');
      U.lilo = L.put(0, 'Lilo - Galactic Hero', 'hand');
      U.minnie = L.put(0, 'Minnie Mouse - Beloved Princess', 'hand');
      ['Flounder - Voice of Reason', 'Sergeant Tibbs - Courageous Cat', 'Jasmine - Disguised', 'Abu - Mischievous Monkey'].forEach(function (n, i) { U['o' + i] = L.put(1, n, 'ink'); });
      U.aurora = L.put(1, 'Aurora - Regal Princess', 'board', { ex: true });
      U.scar = L.put(1, 'Scar - Fiery Usurper', 'board');
      for (var k = 0; k < 4; k++) s.P[1].hand.push(s.P[1].deckL.pop());
      s.P[0].lore = 9; s.P[1].lore = 11;
      s.phase = 'play'; s.step = 'main'; s.turn = 7; s.cur = 0; s.first = 0; s.mull = [true, true]; s.mullWho = null; s.viewer = 0; s.startFired = 7;
      s.P[0].inked = false; s.P[1].inked = false; s.hist = []; s.log = [];
      L.load(s);
    },
    steps: async function (D) {
      if (L.db.status !== 'ready') { await D.say('The cards haven’t downloaded yet. Try the demo again once you’re online.', { pos: 'center' }); return; }
      await D.say('You and Sprocket race to 20 lore. You have 9, and Sprocket has 11.', { at: '.lp-strip.bot' });
      await D.say('Once a turn, you can put a card from your hand into your inkwell. A card with a ring around its cost can be inked.', { at: card('stitch') });
      await D.tap(card('stitch'));
      await D.wait(zoomOpen, 3000);
      await D.you(zoomBtn(/Ink it/), 'Tap Ink it to put Stitch into your inkwell, face down.', { until: function () { return where('stitch') === 'ink'; } });
      await D.wait(1200);
      await D.say('Ink pays for the cards you play. Your four ink are ready, which is enough for Pumbaa.', { at: '.lp-strip.bot' });
      await D.tap(card('pumbaa'));
      await D.wait(zoomOpen, 3000);
      await D.tap(zoomBtn(/^Play/));
      await D.wait(function () { return where('pumbaa') === 'board'; }, 4000);
      await D.wait(1400);
      await D.say('Pumbaa is drying. A character can’t quest or challenge on the turn it’s played.', { at: card('pumbaa') });
      await D.say('Aurora quested on Sprocket’s last turn, so she’s exerted, turned on her side. Only exerted characters can be challenged.', { at: card('aurora') });
      await D.tap(card('mickey'));
      await D.wait(zoomOpen, 3000);
      await D.you(zoomBtn(/^Challenge/), 'Mickey is ready and dry, so he can challenge. Tap Challenge.', { until: function () { return !zoomOpen() || where('aurora') === 'discard'; } });
      await D.wait(600);
      await D.you(card('aurora'), 'Tap Aurora to choose her.', { until: function () { return !!barBtn(/Challenge/)() || where('aurora') === 'discard'; } });
      await D.wait(400);
      await D.you(barBtn(/Challenge/), 'Now tap Challenge Aurora to send Mickey in.', { until: function () { return where('aurora') === 'discard'; } });
      await D.wait(2400);
      await D.say('Each deals damage equal to its strength. Mickey’s 3 is more than Aurora’s willpower of 2, so she’s banished, and Mickey survives with 2 damage.', { at: card('mickey') });
      await D.say('Kristoff can quest. Questing exerts him, and you gain the lore on his card, which is 2.', { at: card('kristoff') });
      await D.tap(card('kristoff'));
      await D.wait(zoomOpen, 3000);
      await D.tap(zoomBtn(/^Quest/));
      await D.wait(2200);
      await D.say('That brings you to 11 lore. When you’re done, you end your turn, and Sprocket plays.', { at: '.lp-strip.bot' });
    }
  });
})();
