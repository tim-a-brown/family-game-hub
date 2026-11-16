// The Oregon Trail's demo (demo.js; CLAUDE.md, Demos): a banker's party leaving Independence in April 1848. The party is
// named, Matt's General Store sells oxen and food, you buy the clothing, and the wagon sets out; a stop shows what you can
// do along the way. The trail's own events come from the seeded draw, so they are the same every time.
(function () {
  'use strict';
  var O = window.__ot;
  function S() { return O.state(); }
  function button(text) { return function () { return [].slice.call(document.querySelectorAll('.ot-act .ob, .ot-info .ob')).filter(function (b) { return b.textContent.indexOf(text) >= 0; })[0]; }; }
  function row(k) { return function () { return document.querySelector('.st-row[data-k="' + k + '"]'); }; }
  function plus(k) { return function () { var r = row(k)(); return r && r.querySelectorAll('.st-b')[1]; }; }
  // the store's rows scroll inside their panel: bring a row to its middle before the finger goes there
  // (only the panel itself scrolls: scrollIntoView would also slide the hidden-overflow box under the picture)
  function centerIn(n) {
    var a = n && n.closest('.ot-act'); if (!a) return;
    var r = n.getBoundingClientRect(), q = a.getBoundingClientRect();
    a.scrollTop += (r.top + r.height / 2) - (q.top + q.height / 2);
  }
  async function show(D, k) { await D.set(function () { centerIn(row(k)()); }); await D.wait(250); }
  function qty(k) { var r = row(k)(); return r ? r.querySelector('.q').textContent : ''; }
  // an event on the trail waits for its OK: tap it for the player
  async function okAll(D) {
    for (var i = 0; i < 6; i++) {
      var ok = button('OK')(); if (!ok) return;
      await D.tap(ok, { after: 500 });
    }
  }

  Kit.demoScript({
    intro: 'Here’s how to outfit your wagon and set out for Oregon.',
    beats: 12,
    end: 'Buy enough oxen, food and clothing, set a pace your party can stand, and stop to rest or hunt when they need it.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim();
      O.newGame('banker', 3, me && me !== 'You' ? me.slice(0, 14) : '');
    },
    steps: async function (D) {
      await D.say('It’s 1848, and your wagon party of five is about to leave Independence, Missouri, for Oregon, 2,000 miles away.', { at: '.ot-scr' });
      await D.say('You lead the party with four companions. Their names are typed on the game’s own keys, or a tap on the dice picks one.', { at: '.ot-info' });
      await D.tap(button('These are my companions'), { after: 900 });
      await D.say('At Matt’s General Store you buy what the trip needs. As a banker, you have $1,600 to spend.', { at: '.ot-info .ot-quote' });
      await show(D, 'oxen');
      await D.say('Oxen pull the wagon, and they come in pairs called yokes. Three yokes is a good start.', { at: row('oxen') });
      for (var i = 0; i < 3; i++) await D.tap(plus('oxen'), { after: 200 });
      await show(D, 'food');
      await D.say('Food is sold by the pound. Each tap on the plus adds 50 pounds, and holding it down adds more.', { at: row('food') });
      for (i = 0; i < 6; i++) await D.tap(plus('food'), { after: 160 });
      await show(D, 'clothes');
      await D.you(plus('clothes'), 'Your turn. The mountains get cold, so tap the plus to buy a set of clothing.', {
        until: function () { return qty('clothes') !== '0'; }
      });
      await D.wait(500);
      await D.set(function () { centerIn(button('and leave')()); });
      await D.tap(button('and leave'), { after: 1200 });
      await D.tap(button('Start down the trail'), { after: 600 });
      await D.say('Each day the wagon rolls west. The little map up top shows how far along the trail you are.', { at: '.ot-map', wait: 3600 });
      await D.say('Below it, you can watch the date, the weather, your party’s health and the food that’s left.', { at: '.ot-info .ot-stat', wait: 3400 });
      for (i = 0; i < 40 && S().phase !== 'river'; i++) { await okAll(D); await D.wait(500); }
      await D.wait(function () { return !!button('Take a ferry')(); }, 6000);
      var R = S().river || { depth: 3 };
      await D.say('The trail has reached the Kansas River. It’s ' + R.depth.toFixed(1) + ' feet deep here' + (R.depth > 3 ? ', and in water over 3 feet a wagon fording across can tip over.' : '. Fording is safe under 2½ feet.'), { at: '.ot-info p' });
      await D.you(button('Take a ferry'), 'Your turn. Take the ferry across. It costs $5 and a wait for your turn.', {
        until: function () { return !button('Take a ferry')(); }
      });
      for (i = 0; i < 30 && S().phase === 'river'; i++) { await okAll(D); await D.wait(400); }
      await D.wait(function () { return !!button('OK')() || S().phase !== 'river'; }, 8000);
      await okAll(D);
      await D.wait(function () { return !!button('Stop to size up')(); }, 6000);
      await D.wait(1600);
      await okAll(D);
      await D.tap(button('Stop to size up'), { after: 300 });
      for (i = 0; i < 20 && !document.querySelector('.ot-grid'); i++) { await okAll(D); await D.wait(300); }
      await D.say('Stop any time to check supplies, change the pace or rations, rest, trade or hunt.', { at: '.ot-grid' });
      await D.say('More rivers, sickness and broken wagons wait ahead. Get as many of your party to Oregon as you can.', { at: button('Continue on the trail') });
    }
  });
})();
