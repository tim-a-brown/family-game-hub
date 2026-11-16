// Pinochle's demo (demo.js; CLAUDE.md, Demos): a partnership hand with EVE against Bender and Johnny 5. You hold a run
// in hearts, aces around and a pinochle; you bid, name hearts, trade cards with EVE, lay your meld and lead the first
// trick. Then the demo skips to the last trick and the hand's count.
(function () {
  'use strict';
  var X = window.__pino, Core = X.core, used = {};
  // a card by its code ('Ah', '10s'), each copy only once
  function take(code) {
    var s = code.slice(-1), r = code.slice(0, -1);
    var c = Core.deck().filter(function (x) { return x.r === r && x.s === s && !used[x.id]; })[0]; used[c.id] = 1; return c;
  }
  function S() { return X.S; }
  function seat(p) { return function () { return document.querySelectorAll('.pn .tbl .st')[p]; }; }
  function handCard(id) { return function () { return document.querySelector('.pn .hand .pcard[data-id="' + id + '"]'); }; }
  function myTurn(ph) { var s = S(); return s && !X.busy && Core.turn(s) === 0 && (!ph || s.phase === ph); }
  function myPanel() { return document.querySelector('.pn .mb .mp.turn') || document.querySelector('.pn .mb'); }
  var HANDS = [
    ['Ah', '10h', 'Kh', 'Qh', 'Jh', '9h', 'Qs', 'Ks', 'As', 'Jd', 'Ac', 'Ad'],
    ['Kh', '9h', '9s', 'Js', '10s', 'Kc', 'Kc', '9c', 'Jc', 'Kd', 'Kd', '9d'],
    ['Ah', '10h', '9s', 'Js', 'Ks', 'Qc', 'Ac', '10c', 'Qd', 'Qd', 'Jd', 'Ad'],
    ['Jh', 'Qh', '10s', 'Qs', 'As', '9c', 'Jc', 'Qc', '10c', '9d', '10d', '10d']
  ];

  Kit.demoScript({
    intro: 'Here’s how a hand of Pinochle goes. You’ll bid, name trump and lay a big meld.',
    beats: 10,
    end: 'Bid what your meld and your side’s tricks can make, name your best suit as trump, and take the aces, 10s and kings.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      Core.C.rng = (function (a) { return function () { var t = (a = (a + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })(11);
      X.start({ players: [{ name: me }, { name: 'Bender', cpu: true, level: 'normal' }, { name: 'EVE', cpu: true, level: 'normal' }, { name: 'Johnny 5', cpu: true, level: 'normal' }], level: 'normal', target: 1500 }, function (s) {
        used = {};
        s.dealer = 3; s.turn = 0;
        s.hands = HANDS.map(function (h) { return Core.sortHand(h.map(take), null); });
        s.deal = s.hands.map(function (h) { return h.map(Core.code).join(''); });
      });
    },
    steps: async function (D) {
      await D.wait(function () { return myTurn('bid') && document.querySelector('.bidbar'); }, 8000);
      await D.say('Pinochle uses two of each card from 9 up to ace. EVE, across the table, is your partner.', { at: seat(2) });
      await D.say('With hearts as trump, your hand is worth 320 in meld before a card is played: a run in hearts, aces around and a pinochle among them.', { at: '.pn .hand', pos: 'above' });
      await D.you('.bidbar .btn-primary', 'First comes the auction, and whoever bids highest names trump. Tap Bid 250, the lowest bid there is.', { until: function () { return S().auction.length > 0; } });
      await D.wait(function () { return myTurn('trump'); }, 12000);
      await D.wait(400);
      await D.you('.trumps button[aria-label="Hearts as trump"]', 'Everyone else passed, so the bid is yours. Name hearts as trump.', { until: function () { return S().trump === 'h'; } });
      await D.wait(function () { return myTurn('passback'); }, 12000);
      await D.wait(500);
      var back = Core.bot(S(), 0).ids;
      await D.say('EVE passed you four cards to help your hand. You pass her back four that your meld doesn’t need.', { at: function () { return back.map(function (id) { return handCard(id)(); }); }, wait: false });
      await D.wait(2400);
      for (var i = 0; i < back.length; i++) await D.tap(handCard(back[i]), { after: 260 });
      await D.tap('.pn .act .btn-primary');
      await D.wait(function () { return myTurn('meld'); }, 15000);
      await D.wait(400);
      await D.say('Now everyone lays down their meld for all to see. Yours is worth ' + S().melds[0].pts + ' points.', { at: myPanel });
      await D.you('.pn .act .btn-primary', 'Meld only counts if your side wins at least one trick. Tap Play the hand.', { until: function () { return S().phase === 'play'; } });
      await D.wait(function () { return myTurn('play'); }, 8000);
      await D.say('As the bidder, you lead. Everyone has to follow suit, and beat the best card so far if they can.', { at: '.pn .hand', pos: 'above', wait: false });
      await D.wait(1800);
      await D.tap(function () { return document.querySelector('.pn .hand .pcard.ok'); });
      await D.wait(function () { return S().trickNo >= 1 && !X.busy; }, 15000);
      // the last trick of the hand: your side took eight tricks and 160 in counters so far, Bender and Johnny 5 took 60
      await D.set(function () {
        X.set(function (s) {
          // the four cards left: each a copy nobody has played yet
          var mine = s.hands[0].filter(function (c) { return c.r === 'A' && c.s === 'h'; })[0] || s.hands[0].filter(function (c) { return c.s === 'h'; })[0] || s.hands[0][0];
          var pick = function (p, pref) { var h = s.hands[p]; return h.filter(function (c) { return c.s === pref; })[0] || h.filter(function (c) { return c.s !== 'h'; })[0] || h[0]; };
          s.hands = [[mine], [pick(1, 's')], [pick(2, 'c')], [pick(3, 'c')]];
          s.trick = []; s.trickNo = 11; s.turn = s.leader = 0; s.won = [8, 3]; s.cpts = [160, 60];
        });
      });
      await D.say('Aces, 10s and kings are counters, worth 10 points each to the side that takes them. Now we skip ahead to the last trick, which is worth 10 more.', { pos: 'center' });
      await D.wait(function () { return myTurn('play'); }, 6000);
      await D.tap(function () { return document.querySelector('.pn .hand .pcard.ok'); });
      await D.wait(function () { return document.querySelector('.k-sheet .cnt'); }, 12000);
      await D.wait(1600);
      await D.say('Your side’s meld and counters add up to far more than your bid of 250, so you score them all. Falling short would cost you the bid instead. The first side to 1,500 wins.', { at: '.k-sheet .cnt .cr' });
    }
  });
})();
