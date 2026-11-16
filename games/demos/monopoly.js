// Monopoly's demo (demo.js; CLAUDE.md, Demos): a game against the computer. You roll and buy Oriental Avenue; later,
// with all three light blue streets yours, Bender lands on Vermont Avenue and pays double rent, and you build a house.
(function () {
  'use strict';
  var X = window.__mono, M = X.M;
  function S() { return X.S(); }
  function sq(n) { return function () { return document.querySelector('.mboard [data-sq="' + n + '"]'); }; }
  function main() { return document.querySelector('.mact .btns .btn-primary'); }
  function calm() { return !X.busy(); }

  Kit.demoScript({
    intro: 'Here’s how a turn of Monopoly goes. You’ll buy a street and build a house yourself.',
    beats: 10,
    end: 'Buy what you land on, collect a whole color group, then build houses so the rent climbs.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.start([{ name: me, cpu: false, tok: 'car' }, { name: 'Bender', cpu: true, level: 'normal', tok: 'dog' }], { level: 'normal' });
    },
    steps: async function (D) {
      await D.wait(1200);
      await D.say('Everyone starts on Go with $1,500. On your turn, you roll two dice and move that many squares.', { at: main });
      M.forceDice([[2, 4]]);
      await D.tap(main);
      await D.wait(function () { return S().phase === 'buy' && calm(); }, 9000);
      await D.say('You landed on Oriental Avenue. Nobody owns it yet, so you can buy it.', { at: sq(6) });
      await D.you(main, 'Tap Buy for $100.', { until: function () { return S().own[6] === 0; } });
      await D.wait(calm, 6000);
      await D.wait(500);
      await D.say('The deed is yours now. Anyone else who lands on Oriental Avenue pays you rent.', { at: sq(6) });

      // later: all three light blue streets are yours, and Bender is about to roll
      await D.set(function () {
        var s = JSON.parse(JSON.stringify(S()));
        s.own[6] = 0; s.own[8] = 0; s.own[9] = 0; s.own[1] = 1; s.own[39] = 1;
        s.players[0].pos = 11; s.players[0].cash = 1180; s.players[1].pos = 5; s.players[1].cash = 960;
        s.cur = 1; s.phase = 'roll'; s.dice = null; s.dbl = 0; s.offer = null; s.turn = 9; s.round = 5;
        M.forceDice([[1, 2]]);
        X.setState(s);
      });
      await D.say('Now we skip ahead. You own all three light blue streets, and it’s Bender’s turn.', { at: function () { return [sq(6)(), sq(8)(), sq(9)()]; } });
      await D.wait(function () { var s = S(); return s.cur === 0 && s.phase === 'roll' && calm(); }, 15000);
      await D.wait(400);
      await D.say('Bender landed on your Vermont Avenue and paid you $12. With the whole group, the rent is doubled.', { at: sq(8) });
      await D.say('Owning a whole color group also lets you build houses, and each house raises the rent.', { at: '.mact .tools .btn' });
      await D.tap('.mact .tools .btn');
      await D.wait(600);
      await D.you('button[aria-label="Plan to build on Vermont Avenue"]', 'Tap the plus beside Vermont Avenue to plan a house there.', { until: function () { return !!document.querySelector('.mact .bgo.btn-primary:not([disabled])'); } });
      await D.wait(500);
      await D.say('A house on a light blue street costs $50.', { at: '.mact .bgo.btn-primary', wait: 2600 });
      await D.tap('.mact .bgo.btn-primary');
      await D.wait(function () { return S().hs[8] === 1 && calm(); }, 6000);
      await D.wait(500);
      await D.say('Now anyone who lands on Vermont Avenue pays $30. The last player who hasn’t gone bankrupt wins.', { at: sq(8) });
    }
  });
})();
