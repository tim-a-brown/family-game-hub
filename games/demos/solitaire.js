// Solitaire's demo (demo.js; CLAUDE.md, Demos): a deal of Klondike laid out so the moves that matter come one after
// another: a red 6 on a black 7, an ace and a 2 going up by themselves, you putting the 3 of Spades up and a King into
// the empty column, the stock turning a card, and a run of two moving together.
(function () {
  'use strict';
  var X = window.__solitaire;
  function card(id) { return function () { return document.querySelector('.felt-in .scard[data-id="' + id + '"]'); }; }
  function cards() { var a = [].slice.call(arguments); return function () { return a.map(function (id) { return card(id)(); }).filter(Boolean); }; }
  function S() { return X.state(); }
  function idle() { return !X.busy; }
  function slotsWith(t) { return function () { return [].slice.call(document.querySelectorAll('.felt-in .slot')).filter(function (n) { return n.textContent === t; }); }; }
  function where(id) { var s = S(); for (var i = 0; i < 7; i++) if (s.tab[i].indexOf(id) >= 0) return 't' + i; for (var f = 0; f < 4; f++) if (s.found[f].indexOf(id) >= 0) return 'f'; return s.waste.indexOf(id) >= 0 ? 'w' : 's'; }
  // the face-up card at the end of each column
  // every card in the columns (the captions keep clear of them)
  function table() { var s = S(); return [].concat.apply([], s.tab).map(function (id) { return card(id)(); }).filter(Boolean); }
  function tops() { var s = S(); return s.tab.map(function (p) { return p.length ? card(p[p.length - 1])() : null; }).filter(Boolean); }

  Kit.demoScript({
    intro: 'Here’s how Klondike solitaire goes. You’ll make two of the moves yourself.',
    beats: 11,
    end: 'Build down the columns in alternating colors, and up the foundations by suit from Ace to King.',
    start: function () {
      // columns bottom card first (only the last card of each starts face up); the stock's top card last
      var tab = [['5s'], ['9d', '7c'], ['2s', 'As', '6h'], ['8h', 'Qc', 'Kh', '3s'], [0, 0, 0, 0, 'Td'], [0, 0, 0, 0, 0, '4h'], [0, 0, 0, 0, 0, 0, '9s']];
      var named = {}; tab.forEach(function (p) { p.forEach(function (c) { if (c) named[c] = 1; }); }); named.Jh = 1;
      var rest = [];
      'shdc'.split('').forEach(function (s) { 'A23456789TJQK'.split('').forEach(function (r) { if (!named[r + s]) rest.push(r + s); }); });
      for (var i = rest.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
      // (the face-down cards are never aces or 2s: nothing goes up that the story doesn't show)
      rest.sort(function (a, b) { return /^[A2]/.test(a) - /^[A2]/.test(b); }).reverse();
      tab = tab.map(function (p) { return p.map(function (c) { return c || rest.pop(); }); });
      X.deal({ draw: 1, scoring: 'std', tab: tab, stock: rest.concat(['Jh']) });
    },
    steps: async function (D) {
      await D.wait(1300);
      await D.say('Your goal is to build all 52 cards up on these four foundations, one suit to a pile, from Ace to King.', { at: slotsWith('A'), avoid: [table] });
      await D.say('These are the seven columns. Only the last card in each column is face up.', { at: tops });
      await D.say('In the columns, you build down in alternating colors. The 6 of Hearts can go on the 7 of Clubs.', { at: cards('6h', '7c'), avoid: [table] });
      await D.tap(card('6h'));
      await D.wait(function () { return where('2s') === 'f' && idle(); }, 6000);
      await D.wait(500);
      await D.say('The card under the 6 turned over. It was the Ace of Spades, and an ace goes up to a foundation by itself. The 2 of Spades under it went up too.', { at: card('2s'), avoid: [table] });
      await D.you(card('3s'), 'Tap the 3 of Spades to put it on the 2.', { avoid: [table], until: function () { return where('3s') === 'f'; } });
      await D.wait(function () { return idle(); }, 4000);
      await D.wait(400);
      await D.you(card('Kh'), 'The King of Hearts turned over, and a column is empty now. Only a King can go into an empty column. Tap the King of Hearts.', { avoid: [table], until: function () { return where('Kh') === 't2'; } });
      await D.wait(function () { return idle(); }, 4000);
      await D.wait(500);
      await D.say('The Queen of Clubs goes on the King of Hearts, black on red.', { at: card('Qc'), wait: false, avoid: [table] });
      await D.tap(card('Qc'));
      await D.wait(function () { return where('Qc') === 't2' && idle(); }, 4000);
      await D.wait(900);
      await D.say('When you need more cards, tap the stock. It turns a card over onto the waste pile.', { at: card('Jh'), avoid: [table] });
      await D.tap(card('Jh'));
      await D.wait(function () { return where('Jh') === 'w' && idle(); }, 4000);
      await D.wait(500);
      await D.say('The Jack of Hearts fits on the Queen of Clubs.', { at: card('Jh'), wait: false, avoid: [table] });
      await D.tap(card('Jh'));
      await D.wait(function () { return where('Jh') === 't2' && idle(); }, 4000);
      await D.wait(900);
      await D.say('A run of face-up cards moves together. The 7 of Clubs takes the 6 of Hearts with it onto the 8 of Hearts.', { at: cards('7c', '6h', '8h'), avoid: [table] });
      await D.tap(card('7c'));
      await D.wait(function () { return where('7c') === 't3' && idle(); }, 4000);
      await D.wait(900);
      await D.say('If you get stuck, the light bulb shows you a move, and Undo takes moves back.', { at: '.sbar' });
    }
  });
})();
