// Spades' demo (demo.js; CLAUDE.md, Demos): a hand with EVE as your partner against Bender and Johnny 5. You bid, lead
// the first trick, and then, near the end of the hand, trump a diamond with a low spade: spades are broken and your team
// makes its bid. The last tricks are played and the hand is scored, bags and all.
(function () {
  'use strict';
  var X = window.__spades;
  var SU = ['c', 'd', 's', 'h'], RK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  function id(code) { var s = code.slice(-1), r = code.slice(0, -1); return 'c' + (SU.indexOf(s) * 13 + RK.indexOf(r)); }
  function cardOf(code) { var s = code.slice(-1), r = code.slice(0, -1); return { r: r, s: s, id: id(code) }; }
  function mine(code) { return function () { return document.querySelector('.chand .pcard[data-id="' + id(code) + '"]'); }; }
  function S() { return X.state(); }
  function seat(pos) { return function () { return document.querySelector('.cseat.' + pos); }; }
  function trick() { return document.querySelectorAll('.ctrick .pcard'); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function myTurn() { var s = S(); return s && !X.busy && s.phase === 'play' && s.turn === 0 && s.trick.length < 4; }
  var YOURS = ['As', '9s', '3s', 'Ah', 'Kh', '7h', '4h', 'Qc', '8c', '5c', 'Jd', '6d', '2d'];

  Kit.demoScript({
    intro: 'Here’s how a hand of Spades goes. You’ll bid, and break spades yourself.',
    beats: 11,
    end: 'Bid the tricks your team can take, follow suit when you can, and use your spades to trump the rest.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.start({ players: [{ name: me }, { name: 'Bender', cpu: true }, { name: 'EVE', cpu: true }, { name: 'Johnny 5', cpu: true }], level: 'normal', target: 500, dealer: 3 });
      // your hand is set; everyone else holds at least three hearts, so the first trick goes the way it does
      var hearts = shuffle(['2h', '3h', '5h', '6h', '8h', '9h', '10h', 'Jh', 'Qh']), rest = [];
      SU.forEach(function (s) { if (s !== 'h') RK.forEach(function (r) { if (YOURS.indexOf(r + s) < 0) rest.push(r + s); }); });
      shuffle(rest);
      X.set(function (s) {
        s.hands = [YOURS, hearts.slice(0, 3).concat(rest.slice(0, 10)), hearts.slice(3, 6).concat(rest.slice(10, 20)), hearts.slice(6).concat(rest.slice(20))]
          .map(function (h) { return h.map(cardOf); });
        s.dtHand = YOURS.slice();
      });
    },
    steps: async function (D) {
      await D.say('You sit at the bottom, and EVE, across the table, is your partner. Bender and Johnny 5 play against you.', { at: seat('n') });
      await D.say('First, everyone bids how many tricks they think they’ll win. Spades are trump, so your Ace of Spades and Ace of Hearts should each take one.', { at: '.chand', pos: 'above' });
      await D.you('.bidgrid button.sug', 'The outlined bid is a good guess for your hand. Tap 3 to bid three tricks.', { until: function () { return S().bids[0] != null; } });
      await D.wait(function () { return S().phase === 'play' && myTurn(); }, 12000);
      await D.wait(400);
      await D.say('You lead the first trick, and everyone has to follow suit if they can. Nobody can lead a spade until spades are broken, so you lead your Ace of Hearts.', { at: mine('Ah'), wait: false });
      await D.wait(2600);
      await D.tap(mine('Ah'));
      await D.wait(function () { return S().trickNo >= 1 && !X.busy; }, 9000);
      // near the end of the hand: three cards each, Bender to lead, and your team one trick short of its contract
      await D.set(function () {
        X.set(function (s) {
          var c = function (l) { return l.map(cardOf); };
          s.hands = [c(['9s', '3s', 'Qc']), c(['Kd', '8d', '3d']), c(['5d', 'Jc', '10c']), c(['Qd', '6c', '9h'])];
          var bid = s.bids, nil = function (p) { return bid[p] === 0; };
          var con = (nil(0) ? 0 : bid[0]) + (nil(2) ? 0 : bid[2]), us = Math.max(0, Math.min(10, con - 1)), them = 10 - us;
          var t0 = nil(2) ? us : Math.min(us, bid[0]), t1 = nil(3) ? them : nil(1) ? 0 : Math.ceil(them / 2);
          s.taken = [t0, t1, us - t0, them - t1];
          s.trick = []; s.trickNo = 10; s.turn = 1; s.leader = 1; s.broken = false; s.voids = [{}, {}, {}, {}];
          // (the ten tricks skipped: who took each, for the desk's panel, from the counts above; you took the first)
          s.tl = []; s.taken.forEach(function (n, p) { for (var i = 0; i < n; i++) s.tl.push(p); }); s.lt = null;
        });
      });
      await D.say('Your bid and EVE’s add up to your team’s contract. Now we skip ahead to the last three tricks, and your team needs one more trick to make it.', { at: '.plq.l' });
      await D.wait(function () { return S().trick.length === 3 && myTurn(); }, 9000);
      await D.say('Bender led a diamond, and you don’t have any diamonds left. When you can’t follow suit, you can play any card, even a spade.', { at: trick, ring: false });
      await D.you(mine('3s'), 'Play your 3 of Spades. Even a low spade beats every diamond.', { until: function () { return S().trick.length !== 3; } });
      await D.wait(function () { return S().trickNo >= 11; }, 6000);
      await D.say('That breaks spades, and the trick is yours. Your team has made its contract.', { at: '.plq.l', wait: false });
      await D.wait(function () { return myTurn(); }, 6000);
      await D.wait(1200);
      await D.tap(mine('9s'), { say: 'Now that spades are broken, you can lead one.' });
      await D.wait(function () { return S().trickNo >= 12 && myTurn(); }, 9000);
      await D.tap(mine('Qc'));
      // (the hand's score: a sheet over the table on a phone or a tablet; at a desk, the score sheet beside the table)
      await D.wait(function () { return document.querySelector('.k-sheet .sum') || (S().phase === 'handover' && document.querySelector('.cdk-l .sp-pad .pb .pr')); }, 12000);
      await D.wait(600);
      var over = !!document.querySelector('.k-sheet .sum');
      await D.say('A team that makes its contract scores 10 points for each trick it bid, and 1 point for each trick over.', over ? { at: '.k-sheet .sum', pos: 'above' } : { at: function () { return [].slice.call(document.querySelectorAll('.cdk-l .sp-pad .sp-hd, .cdk-l .sp-pad .pb .pr')).slice(0, 2); } });
      await D.say('Tricks over your bid are bags. Every 10 bags costs your team 100 points, so bid as close as you can. The first team to 500 wins.', { at: function () { return document.querySelector('.k-sheet ul.notes') || document.querySelector('.k-sheet p.muted') || document.querySelector('.cdk-l .sp-pad .sp-bg') || document.querySelector('.cdk-l .sp-pad .pf'); } });
    }
  });
})();
