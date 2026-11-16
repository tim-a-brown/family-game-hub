// Hot Dog Stand's demo (demo.js; CLAUDE.md, Demos): the first event of a Rookie season dealt from a set seed (a football
// game on a warm afternoon). Read the ticket, order hot dogs and buns, you add the soda, raise a price on the chalkboard,
// open the stand and watch the line, then read the ledger.
(function () {
  'use strict';
  var H = window.__hd;
  function S() { return H.state(); }
  function row(k) { return function () { var i = ['dog', 'bun', 'soda', 'chips', 'cocoa'].indexOf(k); return document.querySelectorAll('.hd .rows .ord')[i]; }; }
  function more(k) { return function () { var r = row(k)(); return r && r.querySelector('button[aria-label="More"]'); }; }
  function tab(n) { return function () { return document.querySelectorAll('.hd .tabs button')[n]; }; }
  function price(k) { return function () { var i = ['dog', 'soda', 'chips', 'cocoa'].indexOf(k); return document.querySelectorAll('.hd .chalk .prow')[i]; }; }
  function raise(k) { return function () { var r = price(k)(); return r && r.querySelector('button[aria-label="Raise"]'); }; }

  Kit.demoScript({
    intro: 'Here’s how to stock the stand, set your prices and open for a game day.',
    beats: 11,
    end: 'Read the ticket, order what the crowd will want, price it right and watch the line. Grow your $500 into the season goal.',
    start: function () {
      H.start('rookie', 4242);
    },
    steps: async function (D) {
      await D.say('Every event starts with a ticket. This one is a football game on a warm afternoon, with about 55,000 fans.', { at: '.tkt' });
      await D.say('Hot dogs only sell with a bun, so order both. Each tap on the plus adds one case or one bag.', { at: function () { return [row('dog')(), row('bun')()]; }, pad: 4 });
      for (var i = 0; i < 2; i++) await D.tap(more('dog'), { after: 220 });
      for (i = 0; i < 4; i++) await D.tap(more('bun'), { after: 220 });
      await D.say('Two cases make 80 hot dogs, and four bags make 96 buns to go with them.', { at: function () { return [row('dog')(), row('bun')()]; }, pad: 4 });
      // (on a short screen the soda row can sit under the panel's foot: bring it to the middle first)
      await D.set(function () { var r = row('soda')(); if (r) r.scrollIntoView({ block: 'center' }); });
      await D.wait(300);
      await D.you(more('soda'), 'Your turn. It’s a warm day, so fans will want something cold. Tap the plus to order a case of soda.', {
        until: function () { return S().order.soda >= 1; }
      });
      await D.wait(400);
      await D.tap(tab(1), { after: 500 });
      await D.say('The chalkboard sets your prices. A higher price earns more on each sale, but more fans walk past.', { at: '.hd .chalk' });
      await D.tap(raise('dog'), { after: 300 });
      await D.tap(raise('dog'), { after: 500 });
      await D.say('A big crowd will pay a little more, so the hot dogs go up to $4.50.', { at: price('dog'), pad: 4 });
      await D.tap(tab(2), { after: 500 });
      await D.say('On the Crew tab you can hire helpers to move the line faster, and buy ads to bring more fans.', { at: '.hd .rows', wait: 3200 });
      await D.tap('.hd .foot .btn-primary', { after: 2600 });
      await D.wait(function () { return !!document.querySelector('.hd .ctl'); }, 4000);
      await D.tap(function () { return document.querySelectorAll('.hd .ctl .seg button')[1]; }, { after: 300 });
      await D.say('The game is on. Fans line up at your window, and the till counts what you take in.', { at: '.hd .live .till', wait: 3800 });
      await D.say('These counts show who walked away and why: the price, the wait, or something sold out.', { at: '.hd .live .lost', wait: 4200 });
      await D.tap('.hd .ctl .btn-soft', { after: 300 });
      await D.wait(function () { return !!document.querySelector('.hd .ledger'); }, 8000);
      await D.wait(2600);
      await D.say('After each event, the ledger shows what sold, what it all cost and what you made.', { at: '.hd .ledger' });
      await D.say('The notes say what to change for next time. Reach $7,000 by the last of the 8 events to win the season.', { at: '.hd .notes' });
    }
  });
})();
