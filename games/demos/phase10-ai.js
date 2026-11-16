// Phase 10's demo (demo.js; CLAUDE.md, Demos): a hand on Phase 2 against two computer players. You take the Green 7
// from the discard pile to finish your set, build and lay down the phase, add a card to your run, and discard a Skip.
(function () {
  'use strict';
  var P = window.__p10;
  function S() { return P.state(); }
  // a card from the cards at the table: 'r7' a number (r b g y), 'w' a Wild, 's' a Skip
  function pull(all, code) {
    var c = code.charAt(0), n = +code.slice(1) || 0;
    for (var i = 0; i < all.length; i++) if (all[i].c === c && all[i].n === n) return all.splice(i, 1)[0];
    return null;
  }
  var ID = {};
  function card(code) { return function () { return document.querySelector('.chand [data-id="' + ID[code] + '"]'); }; }
  function cards(list) { return function () { return list.map(function (c) { return card(c)(); }).filter(Boolean); }; }
  function myTurn() { var s = S(); return s && s.stage === 'play' && s.turn === 0; }
  var HAND = ['r7', 'b7', 'g3', 'y4', 'r5', 'b6', 'b2', 'g9', 's', 'r12'];

  Kit.demoScript({
    intro: 'Here’s a hand of Phase 10. You’ll finish your phase and lay it down yourself.',
    beats: 11,
    end: 'Collect the sets and runs your phase asks for, lay them down, then get rid of your cards. The first to finish all ten phases wins.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      P.start({ last: 10, players: [{ name: me, cpu: false }, { name: 'Bender', cpu: true, level: 'normal' }, { name: 'EVE', cpu: true, level: 'normal' }] });
      P.set(function (s) {
        var all = [].concat.apply([], s.hands).concat(s.discard, s.stock);
        var mine = HAND.map(function (c) { var x = pull(all, c); ID[c] = x.id; return x; });
        var top = pull(all, 'g7'); ID.g7 = top.id;
        var under = pull(all, 'y10');
        for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = all[i]; all[i] = all[j]; all[j] = t; }
        s.hand = 2; s.dealer = 2; s.turn = 0; s.step = 'draw'; s.stage = 'play';
        s.hands = [mine, all.splice(0, 10), all.splice(0, 10)];
        s.discard = [under, top]; s.stock = all;
        s.laid = [null, null, null]; s.skipNext = [false, false, false]; s.turns = [0, 0, 0]; s.handSkips = [0, 0, 0];
        s.sel = null; s.building = false; s.build = null; s.bActive = 0; s.lastHit = null;
        s.players[0].ph = 2; s.players[1].ph = 2; s.players[2].ph = 1;
        s.players[0].total = 25; s.players[1].total = 15; s.players[2].total = 60;
      });
    },
    steps: async function (D) {
      await D.say('Phase 10 has ten phases to lay down, one after another. You’re on Phase 2, which is a set of 3 and a run of 4.', { at: '.phstrip' });
      await D.say('A set is cards of the same number, in any colors. A run is numbers in a row, in any colors.', { at: '.chand' });
      await D.say('Your 3, 4, 5 and 6 are already a run of 4, and you have two 7s toward the set.', { at: cards(['g3', 'y4', 'r5', 'b6', 'r7', 'b7']) });
      await D.you('#discardTop', 'Each turn starts with a draw. The Green 7 on the discard pile makes three 7s, so tap it to take it.', { until: function () { return S().step === 'play'; } });
      await D.wait(800);
      await D.you('.cbar .btn-primary', 'Now you have the whole phase. Tap Build phase.', { until: function () { return S().building; } });
      await D.wait(400);
      await D.say('Each group of the phase has its own space. You tap a group, then tap the cards that go in it.', { at: '.builder .mats' });
      var order = ['r7', 'b7', 'g7', 'g3', 'y4', 'r5', 'b6'];
      for (var i = 0; i < order.length; i++) await D.tap(card(order[i]), { after: 140 });
      await D.wait(500);
      await D.you('.cbar .btn-primary', 'Both groups are ready. Tap Lay down.', { until: function () { return S().laid[0]; } });
      await D.wait(2600);
      await D.say('Your phase is on the table. Next hand, you’ll go for Phase 3.', { at: '.melds .mrow' });
      await D.tap(card('b2'), { say: 'Once your phase is down, you can add cards to any phase on the table. Your Blue 2 fits in front of your run.' });
      await D.wait(300);
      await D.tap('.melds .grp.tgt');
      await D.wait(900);
      await D.say('A turn ends with a discard. A Skip makes the player you choose lose their next turn.', { at: card('s') });
      await D.tap(card('s'), { after: 300 });
      await D.tap('.cbar .btn-primary');
      await D.wait(function () { return document.querySelector('.k-sheet .skiplist'); }, 4000);
      await D.tap(function () { return document.querySelectorAll('.k-sheet .skiplist .btn')[0]; });
      await D.wait(1400);
      await D.say('Bender loses a turn. The hand ends when someone plays their last card. Everyone who laid down a phase moves on, and cards left in hand count as points against you.', { at: function () { return document.querySelectorAll('.ctable .cseat')[0]; } });
    }
  });
})();
