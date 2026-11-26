// UNO's demo (its files say spanishone) (demo.js; CLAUDE.md, Demos): the end of a hand against two computer players. A 5 matched by number,
// a Draw Two on EVE, your Wild and its color, drawing when nothing matches, and you calling UNO! and going out.
(function () {
  'use strict';
  var X = window.__so, Core = X.core;
  var used = {};
  // a card of the deck by color and value (r y g b w; 0 to 9, s, r, d2, w, w4), each one only once
  function take(c, v) { var k = Core.deck().filter(function (x) { return x.c === c && x.v === v && !used[x.id]; })[0]; used[k.id] = 1; return k; }
  var ID = {};
  function hand(id) { return function () { return document.querySelector('.so-hand .oc[data-id="' + id + '"]'); }; }
  function S() { return X.S; }
  function seat(p) { return function () { return document.querySelector('.so-op[data-p="' + p + '"]'); }; }
  function top() { return document.querySelector('.so-disc .oc:last-of-type') || document.querySelector('.so-disc'); }
  function myTurn() { var s = S(); return s && !X.busy && Core.turn(s) === 0; }

  Kit.demoScript({
    intro: 'Here’s the end of a hand of UNO. You’ll play your Wild and call UNO! yourself.',
    beats: 13,
    end: 'Match the color or the number, keep a Wild for when nothing else works, and call UNO! before your last card.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      Core.C.rng = function () { return 0.5; };   // (the computer players choose the same way every time)
      var s = Core.newGame({ players: [{ name: me }, { name: 'Bender', cpu: true, level: 'normal' }, { name: 'EVE', cpu: true, level: 'normal' }], to: 0, level: 'normal' });
      var mine = [take('b', '5'), take('r', '7'), take('w', 'w'), take('r', '2')];
      ID = { b5: mine[0].id, r7: mine[1].id, wild: mine[2].id, r2: mine[3].id };
      var bender = [take('b', 'd2'), take('r', '9'), take('r', '3'), take('g', '4'), take('y', '6')];
      var eve = [take('g', '1'), take('y', '8'), take('b', '0'), take('g', '0')];
      var first = take('r', '5');
      // what EVE draws, from the top of the pile: two for the Draw Two, then one on each of her next two turns
      var drawn = [take('y', '1'), take('b', '6'), take('g', '7'), take('y', '5')];
      var rest = Core.deck().filter(function (x) { return !used[x.id]; });
      for (var i = rest.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
      s.hands = [mine, bender, eve].map(function (h) { return Core.sortHand(h); });
      s.draw = rest.concat(drawn); s.pile = [first]; s.color = 'r'; s.turn = 0; s.dir = 1; s.dealer = 2;
      s.called = [false, false, false]; s.voids = [{}, {}, {}]; s.run = { v: '5', n: 1 }; s.passes = 0; s.phase = 'play'; s.pend = 0; s.four = null; s.drawn = null;
      s.mode = 'cpu'; s.me = 0; s.seen = s.round;
      X.S = s; X.paint(); X.next();
    },
    steps: async function (D) {
      await D.say('This is the pile. On your turn, you play a card that matches the top card’s color or its number.', { at: '.so-ring' });
      await D.say('The top card is a red 5. Your blue 5 matches its number, so you can play it.', { at: hand(ID.b5) });
      await D.tap(hand(ID.b5));
      await D.wait(1100);
      await D.say('Now the color in play is blue.', { at: '.so-ring .so-badge', wait: 1900 });
      await D.wait(function () { return S().hands[2].length > 4; }, 9000);
      await D.say('Bender played a Draw Two, so EVE draws two cards and misses her turn.', { at: seat(2) });
      await D.wait(myTurn, 9000);
      await D.say('Your red cards don’t match a blue Draw Two, but a Wild can go on any card.', { at: hand(ID.wild) });
      await D.you(hand(ID.wild), 'Tap your Wild.', { until: function () { return !!document.querySelector('.so-pick .so-cb.r'); } });
      await D.wait(400);
      await D.you('.so-pick .so-cb.r', 'Choose red, because both of your other cards are red.', { avoid: ['.so-pick .so-cols'], until: function () { return !document.querySelector('.so-pick'); } });
      await D.wait(1200);
      await D.wait(function () { return S().hands[2].length > 6; }, 12000);
      await D.say('Bender played a red 9. EVE had no red card and no 9, so she drew a card. It didn’t match either, so her turn is over.', { at: seat(2) });
      await D.wait(myTurn, 9000);
      await D.say('Now you hold two cards, and you can play one of them.', { at: '.so-hand', wait: 2400, avoid: ['.so-btns'] });
      await D.you('.so-btns .call', 'Before you play your second-to-last card, tap UNO! If someone catches you without calling UNO, you draw two cards.', {
        until: function () { return S().called[0]; }
      });
      await D.wait(500);
      await D.you(hand(ID.r7), 'Now play your red 7.', { until: function () { return S().hands[0].length === 1; } });
      await D.wait(myTurn, 12000);
      await D.say('Bender played a red 3, and EVE had to draw again.', { at: '.so-ring', wait: 2600 });
      await D.you(hand(ID.r2), 'Play your last card to go out.', { until: function () { return S().hands[0].length === 0; } });
      await D.wait(function () { return document.querySelector('.k-win .rank') || document.querySelector('.so-tally .pn'); }, 9000);
      await D.wait(900);
      await D.say('You went out first, so you win. In a game to 500, you would score the points of every card the others are still holding.', { at: function () { return document.querySelector('.k-win .rank') || document.querySelector('.so-tally .pn'); } });
    }
  });
})();
