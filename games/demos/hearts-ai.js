// Hearts' demo (demo.js; CLAUDE.md, Demos): a hand against three computer players. You pass three cards and lead the 2 of
// Clubs; then the demo skips to the last four tricks, where hearts are broken, the Queen of Spades lands on Bender, you follow
// suit, and the hand is scored.
(function () {
  'use strict';
  var H = window.__hearts;
  var SU = ['c', 'd', 's', 'h'], RK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  function id(code) { var s = code.slice(-1), r = code.slice(0, -1); return 'c' + (SU.indexOf(s) * 13 + RK.indexOf(r)); }
  function cardOf(code) { var s = code.slice(-1), r = code.slice(0, -1); return { r: r, s: s, id: id(code) }; }
  function mine(code) { return function () { return document.querySelector('.chand .pcard[data-id="' + id(code) + '"]'); }; }
  function S() { return H.state(); }
  function seat(pos) { return function () { return document.querySelector('.cseat.' + pos); }; }
  function trick() { return document.querySelectorAll('.ctrick .pcard'); }
  function sortH(h) { return h.sort(function (a, b) { return SU.indexOf(a.s) - SU.indexOf(b.s) || RK.indexOf(a.r) - RK.indexOf(b.r); }); }
  var PASS = ['Qs', 'As', 'Ah'];

  Kit.demoScript({
    intro: 'Here’s how a hand of Hearts goes. You’ll pass three cards and play a few tricks yourself.',
    beats: 15,
    end: 'Keep your points low, and watch where the Queen of Spades goes.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      H.start({ mode: 'cpu', level: 'normal', players: [{ name: me }, { name: 'Bender', cpu: true }, { name: 'EVE', cpu: true }, { name: 'Johnny 5', cpu: true }] });
      // your hand is set; the others get the rest of the deck, shuffled (the same way every time in a demo)
      var yours = ['2c', '5c', '9c', '3d', '8d', 'Jd', '4s', '9s', 'Qs', 'As', '4h', '10h', 'Ah'], rest = [];
      SU.forEach(function (s) { RK.forEach(function (r) { if (yours.indexOf(r + s) < 0) rest.push(cardOf(r + s)); }); });
      for (var i = rest.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
      H.set(function (s) {
        s.hands = [sortH(yours.map(cardOf)), sortH(rest.slice(0, 13)), sortH(rest.slice(13, 26)), sortH(rest.slice(26))];
        s.passSel = [];
      });
    },
    steps: async function (D) {
      await D.say('Before each hand, everyone passes three cards. This hand they go to the player on your left.', { at: '.chand', pos: 'above' });
      await D.say('Pass the cards that could win you points, like the Queen of Spades and your aces.', { at: '.chand', pos: 'above' });
      await D.you('.chand', 'Tap the Queen of Spades, the Ace of Spades and the Ace of Hearts.', {
        allow: PASS.map(mine), pos: 'above',
        until: function () { var sel = S().passSel || []; return PASS.every(function (c) { return sel.indexOf(id(c)) >= 0; }); },
        autoTap: function () { var sel = S().passSel || []; var c = PASS.filter(function (x) { return sel.indexOf(id(x)) < 0; })[0]; return c ? mine(c)() : null; }
      });
      await D.you('.cbar .btn-primary', 'Now tap Pass left to send them to Bender.', { until: function () { return S().phase === 'play'; } });
      await D.wait(function () { return S().phase === 'play'; });
      await D.wait(500);
      await D.say('Johnny 5, on your right, passed three cards to you. They stand a little higher in your hand.', { at: '.chand', pos: 'above' });
      await D.say('Whoever holds the 2 of Clubs leads the first trick, and this time that’s you.', { at: mine('2c') });
      await D.you(mine('2c'), 'Tap the 2 of Clubs to lead it.', { until: function () { return S().trick.length > 0 || S().trickNo > 0; } });
      await D.say('Everyone has to follow suit, so each player puts down a club if they have one. The highest club takes the trick.', { at: trick, ring: false, wait: 4200 });
      await D.wait(function () { return S().trickNo >= 1; }, 9000);
      // the last four tricks of the hand, set up so the rest of what can happen in Hearts happens
      await D.set(function () {
        H.set(function (s) {
          var o = function (l) { return sortH(l.map(cardOf)); };
          s.hands = [o(['4d', '2h', '9h', 'Jh']), o(['Kd', '3h', '5h', '7h']), o(['Ah', 'Qh', '8h', '4h']), o(['Qs', 'Kh', '10h', '6h'])];
          s.trick = []; s.trickNo = 9; s.turn = 0; s.leader = 0; s.broken = false; s.taken = [0, 0, 0, 0]; s.tw = [2, 3, 2, 2]; s.received = []; s.recvAll = null; s.last = null; s.tl = []; s.sentAll = null;
        });
      });
      await D.say('Now we skip ahead to the last four tricks of the hand.', { pos: 'center', ring: false, wait: 2400 });
      await D.you(mine('4d'), 'It’s your lead, and nobody can lead a heart until one has been played. Tap the 4 of Diamonds.', { until: function () { return S().trick.length > 0; } });
      await D.wait(function () { return S().trick.length === 4; }, 6000);
      await D.say('Nobody else had a diamond, so they could play any card. EVE played a heart, and now hearts are broken.', { at: trick, wait: false });
      await D.wait(function () { return S().trickNo >= 10; }, 6000);
      await D.wait(1600);
      await D.say('Bender took that trick, with a heart and the Queen of Spades in it. That’s 14 points against Bender.', { at: seat('w') });
      await D.wait(function () { return S().turn === 0 && S().trick.length === 3; }, 9000);
      await D.you(mine('2h'), 'Now you have to follow suit with a heart. Play your 2 of Hearts, which is too low to win the trick.', { until: function () { return S().trick.length !== 3 || S().trickNo > 10; } });
      await D.wait(function () { return S().trickNo >= 11; }, 6000);
      await D.say('Johnny 5 played the highest heart, so Johnny 5 takes those four hearts, for 4 points.', { at: seat('e') });
      await D.wait(function () { return S().turn === 0; }, 9000);
      await D.tap(mine('9h'), { say: 'The rest of the hand plays out the same way.' });
      await D.wait(function () { return S().turn === 0 && S().trickNo === 12; }, 9000);
      await D.tap(mine('Jh'));
      // (the hand's scores: a sheet over the table on a phone or a tablet; at a desk, the score sheet beside the table)
      await D.wait(function () { return document.querySelector('.k-sheet .sum') || (S().phase === 'handover' && document.querySelector('.cdk-l .cdk-pad .pb .pr')); }, 9000);
      await D.wait(500);
      await D.say('Each heart counts 1 point and the Queen of Spades counts 13. You took none this hand.', { at: function () { var rows = [].slice.call(document.querySelectorAll('.k-sheet .sum tr')).slice(0, 3); return rows.length ? rows : [].slice.call(document.querySelectorAll('.cdk-l .cdk-pad .ph, .cdk-l .cdk-pad .pb .pr')); } });
      await D.say('Hands go on until someone reaches 100. Then the lowest score wins.', { at: function () { return document.querySelector('.k-sheet p.muted') || document.querySelector('.cdk-l .cdk-pad .pf'); } });
    }
  });
})();
