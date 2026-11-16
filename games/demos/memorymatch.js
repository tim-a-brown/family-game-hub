// Memory Match's demo (demo.js; CLAUDE.md, Demos): a solo game of 12 animal cards with three pairs left. Two flips that
// miss, a lucky pair, a pair found by remembering a card, and you take the last pair.
(function () {
  'use strict';
  var MM = window.__mm;
  function S() { return MM.get(); }
  function card(i) { return function () { return document.querySelectorAll('.mm .grid .mc')[i]; }; }
  var A1, A2, B1, B2, C1, C2;
  function up(i) { return function () { var c = card(i)(); return !!(c && c.classList.contains('up')); }; }
  function pairs() { return S().players[0].pairs; }
  function an(w) { return (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w; }

  Kit.demoScript({
    intro: 'Here’s how a turn goes, and then you find the last pair.',
    beats: 7,
    end: 'Flip two cards a turn, remember every card you see, and clear the table in as few moves as you can.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      MM.start('animals', '4x3', [{ name: me, color: Kit.color(0) }]);
      var s = S(), first = {}, order = [];
      s.cards.forEach(function (a, i) { if (first[a] == null) { first[a] = [i]; order.push(a); } else first[a].push(i); });
      // three pairs stay on the table, the other three were found earlier
      var keep = [order[0], order[2], order[4]];
      A1 = first[keep[0]][0]; A2 = first[keep[0]][1];
      B1 = first[keep[1]][0]; B2 = first[keep[1]][1];
      C1 = first[keep[2]][0]; C2 = first[keep[2]][1];
      order.forEach(function (a) {
        if (keep.indexOf(a) >= 0) return;
        first[a].forEach(function (i) { s.owner[i] = 0; s.seen[i] = true; });
        s.order.push(0); s.ma = (s.ma || []).concat([a]);
      });
      s.mo = [2, 4, 5]; s.moves = 5; s.time = 38;
      s.players[0].pairs = 3; s.players[0].best = 2;
      MM.redraw();
    },
    steps: async function (D) {
      await D.say('Find all the matching pairs. Three of the six pairs are still on the table.', { at: '.mm .stats' });
      await D.tap(card(A1), { after: 350 });
      await D.tap(card(B1), { after: 300 });
      await D.say('Each turn, you flip two cards. ' + MM.name(A1).replace(/^./, function (c) { return c.toUpperCase(); }) + ' and ' + MM.name(B1).toLowerCase() + ' don’t match, so they turn back over. Remember where each one was!', { at: function () { return [card(A1)(), card(B1)()]; }, wait: 4200 });
      await D.wait(function () { return !up(A1)(); }, 3000);
      await D.tap(card(C1), { after: 350 });
      await D.tap(card(C2), { after: 300 });
      await D.wait(700);
      await D.say('Two ' + MM.name(C1).toLowerCase() + ' cards! A match goes in your pile, and you go again.', { at: '.mm .stats', wait: 3600 });
      await D.wait(function () { return pairs() >= 4; }, 4000);
      await D.tap(card(B2), { after: 500 });
      await D.say('This is the other ' + MM.name(B2).toLowerCase() + '. You saw its partner a moment ago.', { at: card(B1) });
      await D.tap(card(B1), { after: 300 });
      await D.wait(function () { return pairs() >= 5; }, 4000);
      await D.wait(500);
      await D.you(card(A2), 'Your turn. Tap the card you haven’t seen yet.', { until: up(A2) });
      await D.you(card(A1), 'It’s ' + an(MM.name(A2).toLowerCase()) + '. Where was the other one? Tap it.', { until: up(A1) });
      await D.wait(2600);
      await D.say('All matched! Your moves and your time go on your best scores.', { pos: 'top' });
    }
  });
})();
