// Five Crowns' demo (demo.js; CLAUDE.md, Demos): round 4 against two computer players, with Sixes wild. You take the
// Jack of Hearts from the discard pile to finish a run, throw away your last loose card and go out; then the round is
// counted.
(function () {
  'use strict';
  var F = window.__fc;
  function S() { return F.state(); }
  // every card at the table, to deal from: '9h' a card (t stars, h, c, s, d), 'JK' a Joker
  function pull(all, code) {
    var r = code === 'JK' ? 'JK' : code.slice(0, -1), s = code === 'JK' ? 'j' : code.slice(-1);
    for (var i = 0; i < all.length; i++) if (all[i].r === r && all[i].s === s) return all.splice(i, 1)[0];
    return null;
  }
  var ID = {};
  function card(code) { return function () { return document.querySelector('.fc-hand [data-id="' + ID[code] + '"]'); }; }
  function groups() { return document.querySelectorAll('.fc-hand .fc-grp.meld'); }
  function myTurn() { var s = S(); return s && s.turn === 0 && (s.phase === 'draw' || s.phase === 'discard'); }

  Kit.demoScript({
    intro: 'Here’s a round of Five Crowns. You’ll pick up the card you need and go out.',
    beats: 11,
    end: 'Make books and runs, and watch which cards are wild this round. Go out first, and the lowest total after eleven rounds wins.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      F.start({ len: 11, players: [{ name: me, cpu: false }, { name: 'Bender', cpu: true, level: 'normal' }, { name: 'EVE', cpu: true, level: 'normal' }] });
      F.set(function (s) {
        var all = [].concat.apply([], s.hands).concat(s.discard, s.stock);
        var mine = ['9h', '10h', 'Qt', 'Qs', '6c', '3d'].map(function (c) { var x = pull(all, c); ID[c] = x.id; return x; });
        var top = pull(all, 'Jh'); ID.Jh = top.id;
        var under = pull(all, '8s');
        for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = all[i]; all[i] = all[j]; all[j] = t; }
        s.round = 4; s.wild = 6; s.dealer = 2; s.turn = 0; s.phase = 'draw'; s.outBy = -1; s.turns = [0, 0, 0]; s.sel = null; s.drew = null;
        s.hands = [mine, all.splice(0, 6), all.splice(0, 6)];
        s.discard = [under, top]; s.stock = all;
        s.rounds = [{ pts: [0, 14, 31], out: 0, catch: ['0/0', '0/0', '0/0'] }, { pts: [22, 0, 9], out: 1, catch: ['0/0', '0/0', '0/0'] }, { pts: [8, 25, 0], out: 2, catch: ['0/0', '0/0', '0/0'] }];
        s.players[0].total = 30; s.players[1].total = 39; s.players[2].total = 40;
      });
    },
    steps: async function (D) {
      await D.say('Five Crowns has five suits: stars, hearts, clubs, spades and diamonds. Every round, you try to put all your cards into groups.', { at: '.fc-hand' });
      await D.say('The wild card changes every round. This is round 4, so Sixes are wild, and Jokers are always wild.', { at: '.fc-wild' });
      await D.say('The game sorts your hand into groups for you. Your two Queens and the wild 6 make a book, which is three or more of one number.', { at: groups });
      await D.say('On your turn, take one card, from the stock face down or the discard pile face up. Then throw one card away.', { at: '.fc-piles' });
      await D.you('[data-pile="discard"]', 'The Jack of Hearts fits your 9 and 10 of Hearts. Tap the discard pile to take it.', { until: function () { return S().phase === 'discard'; } });
      await D.wait(900);
      await D.say('A run is three or more in a row in one suit. Now your 9, 10 and Jack of Hearts make one.', { at: function () { return groups()[1] || groups(); } });
      await D.tap(card('3d'), { say: 'Only the 3 of Diamonds is left over, so throw it away.' });
      await D.wait(500);
      await D.you('.cbar .btn-green', 'Every card you keep is in a group, so you can go out. Tap Go out!', { until: function () { return S().outBy === 0; } });
      await D.wait(900);
      await D.say('You went out! Bender and EVE each get one more turn, then they lay down what they can.', { at: '.ctable', ring: false, wait: 3600 });
      // (the round is counted on a sheet over the table; in a large window everyone's cards lie on the table instead,
      // the round is written on the score sheet beside it, and the button that deals the next round is in the bar)
      await D.wait(function () { return document.querySelector('.k-sheet .fc-sum') || (S().phase === 'roundover' && document.querySelector('.fc-seat .fcd-laid')); }, 15000);
      await D.wait(700);
      await D.say('Going out scores 0. Cards left out of a group count their number against you, a wild card 20, and a Joker 50.', { at: function () { return document.querySelectorAll('.k-sheet .fc-sr')[1] || document.querySelector('.fc-seat .fcd-laid'); } });
      await D.say('The next round deals one more card, and Sevens are wild.', { at: function () { return document.querySelector('.k-sheet .k-acts .btn-primary') || document.querySelector('.cbar .btn-primary'); } });
    }
  });
})();
