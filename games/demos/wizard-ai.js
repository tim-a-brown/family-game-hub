// Wizard's demo (demo.js; CLAUDE.md, Demos): round 3 against three computer players, with hearts as trump. You hold a
// Wizard, the King of Hearts and a Jester: you bid two tricks, lead the Wizard yourself, win with the King, throw the
// Jester to lose the last trick, and score your bid exactly.
(function () {
  'use strict';
  var W = window.__wizard;
  var SU = ['c', 'd', 's', 'h'], RK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  // 'Kh' a card of the deck, 'W0' a Wizard, 'J0' a Jester
  function card(code) {
    if (/^W\d$/.test(code)) return { r: 'W', s: 'W', k: 'w', id: 'w' + code.charAt(1) };
    if (/^J\d$/.test(code)) return { r: 'J', s: 'X', k: 'j', id: 'j' + code.charAt(1) };
    var s = code.slice(-1), r = code.slice(0, -1);
    return { r: r, s: s, id: 'c' + (SU.indexOf(s) * 13 + RK.indexOf(r)) };
  }
  function mine(code) { return function () { return document.querySelector('.hands .chand [data-id="' + card(code).id + '"]'); }; }
  function S() { return W.state(); }
  function seat(p) { return function () { return document.querySelectorAll('.ctable .cseat')[p]; }; }
  function bid(n) { return function () { return [].slice.call(document.querySelectorAll('.cbar .bids button')).filter(function (b) { return b.textContent === String(n); })[0]; }; }
  function myChip() { return document.querySelector('.ctable .cseat.s .info .chip-s:not(.tot)'); }
  // (a round's scores: the sheet that comes up over the table, or, in a large window, the row just written on the score sheet beside it)
  function desk() { return document.documentElement.classList.contains('cdesk-on'); }
  function scored() { return document.querySelector('.k-sheet table.sum') || (desk() && S().phase === 'roundover' && document.querySelector('.cbar .btn-primary')); }
  function row(i) { return function () {
    var t = document.querySelectorAll('.k-sheet table.sum tr')[i]; if (t || !desk()) return t;
    var rows = document.querySelectorAll('.wz-pad .pb .pr:not(.todo):not(.live)'), r = rows[rows.length - 1];
    return r ? r.querySelectorAll('.wz-c')[i - 1] : null;
  }; }
  function trick() { return document.querySelectorAll('.ctrick > *'); }
  function myTurn() { var s = S(); return s && s.phase === 'play' && s.turn === 0 && s.trick.length < 4; }

  Kit.demoScript({
    intro: 'Here’s a round of Wizard. You’ll make your bid and lead with a Wizard yourself.',
    beats: 14,
    end: 'Bid exactly the tricks your hand can win, then take that many and no more. Each round deals one more card, and the highest total at the end wins.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      W.start({ mode: 'cpu', options: { len: 'full', hook: 'any', level: 'normal' },
        players: [{ name: me, cpu: false }, { name: 'Bender', cpu: true }, { name: 'EVE', cpu: true }, { name: 'Johnny 5', cpu: true }] });
      W.set(function (s) {
        s.round = 3; s.dealer = 3; s.turn = 0; s.leader = 0; s.phase = 'bid';
        s.hands = [['W0', 'Kh', 'J0'], ['3h', '6h', '8d'], ['J1', 'Qc', '5h'], ['Js', '9d', '2c']].map(function (h) { return h.map(card); });
        s.trumpCard = card('Ah'); s.trump = 'h';
        s.bids = [null, null, null, null]; s.taken = [0, 0, 0, 0]; s.trick = []; s.trickNo = 0; s.lastWin = -1;
        s.gone = []; s.vd = ['', '', '', '']; s.rounds = [[30, -10, 20, 20], [20, 40, -10, 20]];
        s.detail = [{ bids: [1, 1, 0, 0], took: [1, 0, 0, 0], t: 's', tc: '9s', d: 1, h: '' }, { bids: [0, 2, 1, 0], took: [0, 2, 0, 0], t: 'd', tc: '4d', d: 2, h: '' }];
        s.players.forEach(function (p, i) { p.total = s.rounds[0][i] + s.rounds[1][i]; });
        s.dealt = true;
      });
    },
    steps: async function (D) {
      await D.say('Each round deals one more card than the last. This is round 3, so everyone holds three cards.', { at: '.roundbox' });
      await D.say('After the deal, the next card is turned up to set trump. It’s the Ace of Hearts, so hearts beat every other suit this round.', { at: '.trumpbox' });
      await D.say('The deck has four Wizards and four Jesters. A Wizard always wins the trick, and a Jester always loses it.', { at: function () { return [mine('W0')(), mine('J0')()]; } });
      await D.say('Before anyone plays, each player bids exactly how many tricks they’ll win. You’re left of the dealer, so you bid first.', { at: '.cbar .picker' });
      await D.say('Your Wizard is sure to win a trick. Your King of Hearts is the highest trump left, because the Ace was turned up.', { at: function () { return [mine('W0')(), mine('Kh')()]; } });
      await D.you(bid(2), 'Tap 2 to bid two tricks.', { until: function () { return S().bids[0] === 2; } });
      await D.wait(function () { return S().phase === 'play'; }, 9000);
      await D.wait(1900);
      await D.wait(myTurn, 6000);
      await D.you(mine('W0'), 'You lead the first trick. Tap your Wizard.', { until: function () { return S().trick.length > 0 || S().trickNo > 0; } });
      await D.wait(function () { return S().trick.length === 4; }, 9000);
      await D.wait(function () { return S().trickNo >= 1; }, 6000);
      await D.wait(500);
      await D.say('Nobody can beat a Wizard, so the trick is yours. The chip at your seat now reads 1 of 2.', { at: myChip });
      await D.wait(myTurn, 6000);
      await D.tap(mine('Kh'), { say: 'Now lead the King of Hearts. Everyone has to follow with a heart if they can.' });
      await D.wait(function () { return S().trick.length === 4; }, 9000);
      await D.say('Bender followed with a heart, but your King is the highest trump in the trick, so you win it. Now you have the 2 tricks you bid.', { at: trick, wait: 4200 });
      await D.wait(function () { return S().trickNo >= 2; }, 6000);
      await D.wait(myTurn, 6000);
      await D.say('One more trick would spoil your bid. Lead the Jester, because a Jester always loses.', { at: mine('J0') });
      await D.tap(mine('J0'));
      await D.say('When a Jester is led, the next ordinary card played sets the suit to follow.', { at: trick, wait: 3200 });
      await D.wait(scored, 12000);
      await D.wait(600);
      await D.say('You took exactly the 2 tricks you bid, so you score 20 points plus 10 for each trick, 40 in all.', { at: row(1) });
      await D.say('Bender bid 0 but took a trick, so Bender loses 10 points. A missed bid costs 10 for every trick you were off, over or under.', { at: row(2) });
    }
  });
})();
