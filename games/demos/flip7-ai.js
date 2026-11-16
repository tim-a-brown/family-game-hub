// Flip 7's demo (demo.js; CLAUDE.md, Demos): a round against two computer players. Everyone is dealt a card, you flip
// and Bender busts on a second 6, then you stay with your points; later in the game you flip a seventh different
// number for a Flip 7.
(function () {
  'use strict';
  var F = window.__flip7;
  function S() { return F.state(); }
  // the deck in the order the cards will come off it ('9' a number, '+4' a bonus card)
  function stack(s, list) {
    var top = list.map(function (code) {
      var k = code.charAt(0) === '+' ? 'm' : 'n', v = +code.replace('+', '');
      var i = -1; s.deck.forEach(function (c, j) { if (i < 0 && c.k === k && c.v === v) i = j; });
      return s.deck.splice(i, 1)[0];
    });
    s.deck = s.deck.concat(top.reverse());
  }
  function num(v, i) { return { id: 'z' + i, k: 'n', v: v }; }
  function spot(p) { return function () { return document.querySelectorAll('.ctable .spot')[p === 0 ? document.querySelectorAll('.ctable .spot').length - 1 : p - 1]; }; }
  function myRow() { return document.querySelector('.ctable .spot.me .line'); }
  function myTurn() { var s = S(); return s && s.phase === 'play' && !s.choose && !s.queue.length && s.turn === 0 && !s.acted && s.status[0] === 'in'; }
  var flip = '.cbar .btn-primary', stay = '.cbar .btn-soft';

  Kit.demoScript({
    intro: 'Here’s a round of Flip 7. You’ll decide when to flip and when to stop.',
    beats: 15,
    end: 'Flip for more points, but stay before a repeat number busts you. Seven different numbers is a Flip 7, and the first to 200 wins.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      F.start({ target: 200, players: [{ name: me, cpu: false }, { name: 'Bender', cpu: true, level: 'normal' }, { name: 'EVE', cpu: true, level: 'normal' }] });
      F.set(function (s) { stack(s, ['9', '6', '10', '4', '6', '+4', '11', '2', '7', '3', '12', '5']); }, -1);
    },
    steps: async function (D) {
      await D.say('In Flip 7 you flip cards to build points. The deck has one 1, two 2s, and so on up to twelve 12s.', { at: '.mid .pile' });
      await D.set(function () { F.set(null, 200); });
      await D.say('Everyone starts the round with one card.', { at: '.ctable', wait: 3200, ring: false });
      await D.wait(myTurn, 9000);
      await D.say('Your 9 is worth 9 points. On your turn, you flip another card or stay with what you have.', { at: myRow });
      await D.you(flip, 'Tap Flip to take the next card.', { until: function () { return S().acted || !myTurn(); } });
      await D.wait(1400);
      await D.say('A 4 is a new number, so your score goes up to 13.', { at: myRow, wait: 2800 });
      await D.wait(function () { return S().status[1] === 'bust'; }, 9000);
      await D.wait(500);
      await D.say('Bender flipped a second 6. Flipping a number you already have is a bust, so Bender scores nothing this round.', { at: spot(1) });
      await D.wait(myTurn, 9000);
      await D.tap(flip, { say: 'You flip again.' });
      await D.wait(1400);
      await D.say('An 11 brings you to 24. Each new number adds points, and each one is another number that could repeat.', { at: myRow });
      await D.wait(myTurn, 9000);
      await D.say('Your bust risk shows how likely the next card is to repeat one of your numbers.', { at: '.spot.me .risk' });
      await D.you(stay, 'Stay to keep your 24 points for this round.', { until: function () { return S().status[0] === 'stay'; } });
      await D.wait(function () { return document.querySelector('.k-sheet table.sum'); }, 20000);
      await D.wait(600);
      await D.say('The round ends when everyone has stayed or busted. Your 24 points go on your score.', { at: function () { return document.querySelectorAll('.k-sheet table.sum tr')[1]; } });
      await D.tap('.k-sheet .k-acts .btn-primary');
      await D.set(function () {
        F.set(function (s) {
          s.round = 5; s.players[0].total = 118; s.players[1].total = 131; s.players[2].total = 97;
          s.rounds = [[24, 0, 38], [31, 40, 0], [0, 52, 27], [63, 39, 32]];
          s.details = [['', 'Bust', ''], ['', '', 'Bust'], ['Bust', '', ''], ['', '', '']];
          s.rows = [[1, 2, 3, 5, 7, 8].map(num), [num(9, 7), num(10, 8)], [num(6, 9)]];
          s.status = ['in', 'stay', 'in']; s.phase = 'play'; s.turn = 0; s.acted = false; s.queue = []; s.choose = null; s.dealer = 1;
          s.deferred = [[], [], []]; s.msg = 'Your turn';
          stack(s, ['12']);
        }, -1);
      });
      await D.say('Now we skip ahead to a later round.', { pos: 'center', ring: false, wait: 2200 });
      await D.say('You have six different numbers. A seventh is a Flip 7: it ends the round at once and scores 15 bonus points.', { at: myRow });
      await D.you(flip, 'Tap Flip to go for seven.', { until: function () { return S().status[0] === 'flip7' || S().status[0] === 'bust'; } });
      await D.wait(function () { return document.querySelector('.k-sheet table.sum'); }, 9000);
      await D.wait(600);
      await D.say('A 12 made seven different numbers, so the round ended at once. Your 53 points include the 15 bonus points.', { at: function () { return document.querySelectorAll('.k-sheet table.sum tr')[1]; } });
    }
  });
})();
