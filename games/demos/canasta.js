// Canasta's demo (demo.js; CLAUDE.md, Demos): a turn in the middle of a partnership hand. You take the discard pile with
// a king, which squares your kings up into a natural canasta; then you meld three 9s from the pile and discard.
(function () {
  'use strict';
  var X = window.__canasta, Core = X.core;
  function S() { return X.S; }
  var ID = {};
  function hand(k) { return function () { return document.querySelector('.cn .hand .pcard[data-id="' + ID[k] + '"]'); }; }
  function hands() { var a = [].slice.call(arguments); return function () { return a.map(function (k) { return hand(k)(); }).filter(Boolean); }; }
  function band() { return document.querySelector('.cn .bands-us .band'); }
  function meld(r) { return function () { return document.querySelector('.cn .bands-us .ml[data-r="' + r + '"]'); }; }
  function pile() { return document.querySelector('.cn .mid .disc'); }
  function btn(re) { return function () { return [].slice.call(document.querySelectorAll('.cn .act .btn')).filter(function (b) { return re.test(b.textContent); })[0]; }; }
  function myTurn() { return !X.busy && Core.turn(S()) === 0; }
  function inHand(k) { return S().hands[0].some(function (c) { return c.id === ID[k]; }); }
  function kings() { var m = Core.meldOfRank(S(), 0, 'K'); return m ? m.cards.length : 0; }

  Kit.demoScript({
    intro: 'Here’s a turn in a game of Canasta. You’ll take the discard pile and make a canasta yourself.',
    beats: 10,
    end: 'Meld three or more of a rank, take the pile when its top card fits your melds, and build canastas of seven with your partner.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      var st = Core.newGame({ kind: 'part', target: 5000, level: 'normal',
        players: [{ name: me }, { name: 'Bender', cpu: true, level: 'normal' }, { name: 'Johnny 5', cpu: true, level: 'normal' }, { name: 'EVE', cpu: true, level: 'normal' }] });
      var deck = Core.deck(), used = {};
      function take(code, key) {
        var r = code.slice(0, -1), s = code.slice(-1);
        for (var i = 0; i < deck.length; i++) if (!used[deck[i].id] && deck[i].r === r && deck[i].s === s) { used[deck[i].id] = 1; if (key) ID[key] = deck[i].id; return deck[i]; }
        throw new Error('no ' + code);
      }
      var mineH = [take('Kd', 'K'), take('9s', '9'), take('4h'), take('4c'), take('Jd'), take('8s'), take('Ac'), take('10h', 'T')];
      st.melds = [
        [{ r: 'K', cards: [take('Ks'), take('Ks'), take('Kc'), take('Kc'), take('Kh')] }, { r: '7', cards: [take('7s'), take('7c'), take('2d')] }],
        [{ r: 'Q', cards: [take('Qs'), take('Qd'), take('Qc'), take('JKb')] }, { r: '5', cards: [take('5h'), take('5d'), take('5s')] }]
      ];
      st.red3 = [[take('3d')], [take('3h')]];
      // the discard pile, its top card last: no wild card and no red 3 in it, so it isn't frozen
      st.pile = [take('5c'), take('9h', '9b'), take('Js'), take('9c', '9c'), take('6d'), take('Kh', 'Kp')];
      // everyone else's cards from the rest of the deck (no red 3 in a hand: those are laid out at once)
      var rest = deck.filter(function (c) { return !used[c.id]; });
      for (var i = rest.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
      var pool = rest.filter(function (c) { return !Core.isRed3(c); }), r3 = rest.filter(Core.isRed3);
      st.hands = [mineH, pool.splice(0, 9), pool.splice(0, 7), pool.splice(0, 8)].map(Core.sortHand);
      st.stock = r3.concat(pool);   // (the red 3s left lie deep in the stock)
      st.turn = 0; st.phase = 'draw'; st.took = false; st.asked = 0; st.tmeld = false; st.drawn = []; st.askBy = -1;
      st.pm = [true, true, true, true]; st.pm0 = true; st.out = -1; st.endHow = null; st.disc = []; st.dealR3 = [];
      st.mode = 'cpu'; st.me = 0;
      X.load(st);
    },
    steps: async function (D) {
      await D.wait(700);
      await D.say('You and Johnny 5 are partners against Bender and EVE. Your side’s melds lie here: five kings and three 7s.', { at: band, avoid: ['.cn .mid'] });
      await D.say('A meld is three or more cards of one rank. The 2s and the jokers are wild, like the 2 in your 7s.', { at: meld('7'), avoid: ['.cn .mid'] });
      await D.say('The discard pile has six cards, with a king on top. You can take the whole pile when you can meld its top card.', { at: pile });
      await D.you(hand('K'), 'Your King of Diamonds goes with it. Tap the King of Diamonds.', { avoid: ['.cn .act'], until: function () { return !!document.querySelector('.cn .hand .pcard.sel[data-id="' + ID.K + '"]'); } });
      await D.you(btn(/^Take the pile/), 'Now tap Take the pile.', { until: function () { return !myTurn() || kings() >= 7; } });
      await D.wait(function () { return kings() >= 7 && document.querySelector('.cn .bands-us .ml.can[data-r="K"]'); }, 6000);
      await D.wait(2600);
      await D.say('The two kings made seven, and seven cards of one rank are a canasta. With no wild card in it, it’s a natural canasta, worth 500.', { at: meld('K') });
      await D.wait(function () { return myTurn() && S().phase === 'play'; }, 6000);
      await D.you(hands('9', '9b', '9c'), 'The rest of the pile went into your hand, with two more 9s. Choose your three 9s to start a new meld.', {
        allow: [hand('9'), hand('9b'), hand('9c')],
        autoTap: function () { var k = ['9', '9b', '9c'].filter(function (x) { return !document.querySelector('.cn .hand .pcard.sel[data-id="' + ID[x] + '"]'); })[0]; return k ? hand(k)() : null; },
        until: function () { return document.querySelectorAll('.cn .hand .pcard.sel').length === 3; }
      });
      await D.you(btn(/^Meld 3/), 'Tap Meld 3 nines.', { until: function () { return !!Core.meldOfRank(S(), 0, '9'); } });
      await D.wait(function () { return myTurn(); }, 6000);
      await D.wait(700);
      await D.say('Every turn ends with a discard. The 10 of Hearts is no use to your side.', { at: hand('T'), wait: false });
      await D.wait(2400);
      await D.tap(hand('T'));
      await D.wait(400);
      await D.tap(btn(/^Discard/));
      await D.wait(function () { return !inHand('T'); }, 4000);
      await D.wait(800);
      await D.say('Your side can go out once it has a canasta. Canastas, melds and red 3s score, and the first side to 5,000 wins.', { at: band });
    }
  });
})();
