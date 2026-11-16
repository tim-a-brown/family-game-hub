// Pyramid's demo (demo.js; CLAUDE.md, Demos): the first moves of a deal. A 7 and a 6 make 13, you take a King away on
// its own and pair an 8 with a 5, and the stock turns up an Ace that pairs with a Queen.
(function () {
  'use strict';
  var X = window.__pyramid;
  function S() { return X.state(); }
  function card(id) { return function () { return document.querySelector('.felt-in .scard[data-id="' + id + '"]'); }; }
  function cards() { var a = [].slice.call(arguments); return function () { return a.map(function (id) { return card(id)(); }).filter(Boolean); }; }
  function gone(id) { return S().disc.indexOf(id) >= 0; }
  function pyr() { return S().pyr.filter(Boolean).map(function (id) { return card(id)(); }).filter(Boolean); }
  // the bottom row (and a card lying over two below it is never free until both are gone)
  var BOTTOM = ['7s', '6h', 'Kc', 'Qd', '9h', '3c', '5d'];

  Kit.demoScript({
    intro: 'Here’s how a game of Pyramid starts. You’ll take away a King and a pair yourself.',
    beats: 9,
    end: 'Take away pairs that add up to 13, and Kings on their own, until the whole pyramid is gone.',
    start: function () {
      // the pyramid row by row from the top (indexes 0 to 27); the bottom two rows are set, the rest dealt at random
      var set = {}; set[15] = '8c'; set[16] = 'Js';
      BOTTOM.forEach(function (c, k) { set[21 + k] = c; });
      var named = { Ah: 1 }; Object.keys(set).forEach(function (k) { named[set[k]] = 1; });
      var rest = [];
      'shdc'.split('').forEach(function (s) { 'A23456789TJQK'.split('').forEach(function (r) { if (!named[r + s]) rest.push(r + s); }); });
      for (var i = rest.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
      var p = [];
      for (var k = 0; k < 28; k++) p.push(set[k] || rest.pop());
      X.deal({ pyr: p, stock: rest.concat(['Ah']) });   // (the stock's top card last)
    },
    steps: async function (D) {
      await D.wait(1400);
      await D.say('Clear the pyramid by taking cards away in pairs that add up to 13.', { at: pyr });
      await D.say('A card is free when no card lies on top of it. Right now that’s the whole bottom row.', { at: cards.apply(null, BOTTOM) });
      await D.say('An Ace counts 1, a Jack 11, a Queen 12 and a King 13. The 7 of Spades and the 6 of Hearts make 13.', { at: cards('7s', '6h') });
      await D.tap(card('7s'));
      await D.wait(700);
      await D.tap(card('6h'));
      await D.wait(function () { return gone('6h'); }, 3000);
      await D.wait(700);
      await D.you(card('Kc'), 'A King is 13 all by itself. Tap the King of Clubs to take it away.', { until: function () { return gone('Kc'); } });
      await D.wait(700);
      await D.say('With those cards gone, the 8 of Clubs and the Jack of Spades above them are free.', { at: cards('8c', 'Js') });
      await D.you(cards('8c', '5d'), 'The 8 of Clubs and the 5 of Diamonds make 13. Tap one, then the other.', {
        allow: [card('8c'), card('5d')],
        autoTap: function () { return S().sel === '8c' ? card('5d')() : card('8c')(); },
        until: function () { return gone('8c') && gone('5d'); }
      });
      await D.wait(700);
      await D.say('When you can’t find a pair, tap the stock to turn its top card over onto the waste pile.', { at: card('Ah'), avoid: [pyr] });
      await D.tap(card('Ah'));
      await D.wait(function () { return S().waste.indexOf('Ah') >= 0; }, 3000);
      await D.wait(600);
      await D.say('The top card of the waste is free too. The Ace of Hearts makes 13 with the Queen of Diamonds.', { at: cards('Ah', 'Qd'), wait: false, avoid: [pyr] });
      await D.wait(2600);
      await D.tap(card('Ah'));
      await D.wait(500);
      await D.tap(card('Qd'));
      await D.wait(function () { return gone('Qd'); }, 3000);
      await D.wait(900);
      await D.say('You can go through the stock three times, one dot for each time. Clear the whole pyramid to win.', { at: function () { return document.querySelector('.felt-in .pass') || document.querySelector('.felt-in .slot.stock'); }, avoid: [pyr] });
    }
  });
})();
