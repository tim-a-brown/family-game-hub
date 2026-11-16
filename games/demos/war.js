// War's demo (demo.js; CLAUDE.md, Demos): a game against one computer player. You turn up a king and take the round,
// Bender's queen takes the next, then two nines tie and it's war: you lay three cards face down and one face up, and your
// ace takes all ten cards.
(function () {
  'use strict';
  var W = window.__war, Core = W.core;
  function S() { return W.S; }
  function pile(p) { return function () { return document.querySelectorAll('.wr .tbl .pile')[p]; }; }
  function tag(p) { return function () { return document.querySelectorAll('.wr .tbl .tg')[p]; }; }
  function up() { return [].slice.call(document.querySelectorAll('.wr .tbl .wc.up')); }
  function round() { return S() ? S().round : 0; }
  function quiet() { return !W.busy; }

  Kit.demoScript({
    intro: 'Here’s how War goes. You’ll flip your own cards and fight a war.',
    beats: 13,
    end: 'Flip your top card, and the higher card takes both. When two cards tie, it’s war, and the winner takes everything on the table.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      W.start([{ name: me }, { name: 'Bender', cpu: true }], { down: 3, aces: 'high', shuffle: 2, rounds: 0 });
      // your pile and Bender's, set so the first rounds go one way, then the other, then to war
      var mine = ['Kh', '5d', '9s', '2c', '4h', '8c', 'As'], his = ['7c', 'Qd', '9h', '3s', '6d', 'Jc', 'Td'], used = mine.concat(his), rest = [];
      Core.SUITS.forEach(function (s) { Core.RANKS.forEach(function (r) { if (used.indexOf(r + s) < 0) rest.push(r + s); }); });
      for (var i = rest.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
      W.set(function (s) {
        s.piles = [mine.concat(rest.slice(0, 19)), his.concat(rest.slice(19))];
        s.lo = [26, 26]; s.tr = '26,26';
      });
    },
    steps: async function (D) {
      await D.say('The whole deck is dealt out face down. You have 26 cards, and so does Bender.', { at: pile(0) });
      await D.say('Nobody looks at their cards. Each round, you both turn up the top card of your pile.', { pos: 'center' });
      await D.you(pile(0), 'Tap your pile to turn up your top card.', { until: function () { return round() > 1; } });
      await D.wait(quiet, 6000);
      await D.say('Your king beats Bender’s 7, so you take both cards. They go under the bottom of your pile.', { at: tag(0) });
      await D.tap(pile(0), { say: 'Next round.' });
      await D.wait(function () { return round() > 2 && quiet(); }, 8000);
      await D.say('This time Bender’s queen beats your 5, and Bender takes them.', { at: tag(1) });
      await D.tap(pile(0));
      await D.wait(function () { return S().phase === 'war' && quiet(); }, 8000);
      await D.say('Two nines tie. That means war!', { at: up, wait: 2600 });
      await D.say('In a war, each of you lays three cards face down and one face up. The outlines show where yours will land.', { at: function () { return [].slice.call(document.querySelectorAll('.wr .tbl .gh')).slice(0, 4); }, avoid: [up, pile(0), pile(1)], place: innerHeight < 500 ? 'top' : null });
      await D.you(pile(0), 'Tap your pile to go to war.', { until: function () { return round() > 3; } });
      await D.wait(function () { return document.querySelector('.wr .tbl .wc.win'); }, 6000);
      await D.say('Your ace beats Bender’s 10!', { at: up, wait: false });
      await D.wait(2000);
      await D.wait(quiet, 9000);
      await D.wait(300);
      await D.say('You won the war, so you took all ten cards on the table. Now you have 31.', { at: tag(0) });
      await D.say('The bar at the top shows who holds more of the deck. Whoever ends up with every card wins.', { at: '.wr .tbl .mtr' });
      await D.say('You can also hold your pile to keep flipping, or choose Auto or Fast to let the cards flip by themselves.', { at: '.wr .tbl .spd' });
    }
  });
})();
