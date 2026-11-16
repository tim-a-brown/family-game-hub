// Poker Squares' demo (demo.js; CLAUDE.md, Demos): the last five cards of a grid. A diamond finishes a flush down a
// column, you finish a straight across a row, a 7 makes four of a kind and a second flush at once, and the ten hands
// are scored one by one.
(function () {
  'use strict';
  var X = window.__pokersquares;
  function S() { return X.state(); }
  function sq(r, c) { return function () { return document.querySelector('.ps-grid [aria-label="Place card in row ' + r + ', column ' + c + '"]'); }; }
  function cur() { return document.querySelector('.ps-cur .pcard'); }
  function placed() { return S() ? S().n : 0; }
  function grid() { return document.querySelector('.ps-grid'); }
  // a phone on its side has the table at the right and room at the left: the caption goes there, beside the table, and
  // the ring still goes round what it is about
  function side() { return innerWidth > innerHeight * 1.4 && innerHeight < 560; }
  function table() { return document.querySelector('.ps-table'); }
  async function say(D, text, at, o) {
    o = o || {};
    if (!side()) return D.say(text, { at: at, avoid: [grid], wait: o.wait });
    // (the demo's ring would pull the caption back over the table, so what the caption is about glows in place instead)
    var lit = [].concat(typeof at === 'function' ? at() : at).filter(Boolean);
    lit.forEach(function (n) { n.style.boxShadow = '0 0 0 3px var(--lit), 0 0 18px var(--litg)'; });
    await D.say(text, { at: table, ring: false, wait: o.wait });
    if (o.wait !== false) lit.forEach(function (n) { n.style.boxShadow = ''; });
  }
  function both() { var a = [].slice.call(arguments); return function () { return a.map(function (f) { return f(); }).filter(Boolean); }; }

  Kit.demoScript({
    intro: 'Here’s the end of a game of Poker Squares. You’ll place one of the last cards yourself.',
    beats: 10,
    end: 'Place each card where it helps a row and a column at once, and remember that a card can’t move once it’s down.',
    start: function () {
      var deck = Cards.deck();
      function c(code) { var r = code.slice(0, -1), s = code.slice(-1); return deck.filter(function (x) { return x.r === r && x.s === s; })[0]; }
      // the grid row by row; the five cards still to come are the last in the deck, in the order they come
      var G = ['7s', '7d', '7c', 'Ks', '7h', '9s', '9d', '4c', '4d', '9h', '2c', '3d', '4s', '5c', '6h', 'Qc', 'Qd', 'Jc', '8d', 'Qh', 'As', 'Ad', '10c', '3s', '2h'];
      var last = ['3d', '6h', '7h', '8d', '10c'], first = [], squares = [];
      G.forEach(function (code, i) { if (last.indexOf(code) < 0) { first.push(c(code)); squares.push(i); } });
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.start(me, 'american', { deck: first.concat(last.map(c)), grid: squares });
    },
    steps: async function (D) {
      await D.wait(800);
      await D.say('Twenty-five cards go onto this grid, one at a time. When it’s full, every row and every column is a poker hand.', { at: grid });
      await say(D, 'This is the card you place next. Once a card is down, it stays where you put it.', cur);
      await say(D, 'The box at the end of each row and under each column shows what that hand holds so far.', function () { return [].slice.call(document.querySelectorAll('.ps-grid .lsc:not(.sum)')); });
      await say(D, 'The 3 of Diamonds finishes the second column with five diamonds. That’s a flush.', both(cur, sq(3, 2)), { wait: false });
      await D.wait(3400);
      await D.tap(sq(3, 2));
      await D.wait(function () { return placed() >= 21; }, 3000);
      await D.wait(1500);
      await say(D, 'The 6 of Hearts would finish the middle row. With the 2, 3, 4 and 5 there, it makes a straight.', both(cur, sq(3, 5)));
      await D.you(sq(3, 5), 'Tap the square at the end of the middle row to put the 6 of Hearts there.', { avoid: [grid], until: function () { return placed() >= 22; } });
      await D.wait(1700);
      await say(D, 'The 7 of Hearts makes four 7s across the top row, and five hearts down the last column.', both(cur, sq(1, 5)), { wait: false });
      await D.wait(3400);
      await D.tap(sq(1, 5));
      await D.wait(function () { return placed() >= 23; }, 3000);
      await D.wait(1800);
      await say(D, 'The last two cards fill the grid.', cur, { wait: false });
      await D.tap(sq(4, 4));
      await D.wait(function () { return placed() >= 24; }, 3000);
      await D.wait(700);
      await D.tap(sq(5, 3));
      await D.wait(function () { return S().phase !== 'play'; }, 3000);
      await D.wait(900);
      await say(D, 'Now the ten hands are scored, one after another.', grid, { wait: false });
      await D.wait(function () { return document.querySelector('.k-win .card'); }, 40000);
      await D.wait(900);
      await D.say('Four of a kind is worth 50, a flush 20 and a straight 15. Even a pair scores 2.', { at: function () { return [].slice.call(document.querySelectorAll('.k-win .card h2, .k-win .card .sub')); }, avoid: ['.k-win .card .btn'] });
    }
  });
})();
