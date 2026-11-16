// Deal or No Deal's demo (demo.js; CLAUDE.md, Demos): you pick your case and open the first case yourself; the rest of
// round 1 opens, the Banker calls, and you say No deal. Then the demo skips to the last two cases: you keep yours, and
// it holds one of the big amounts.
(function () {
  'use strict';
  var X = window.__dond;
  var CUM = [6, 11, 15, 18, 20, 21, 22, 23, 24];   // cases open by the end of each round
  function S() { return X.state(); }
  function g() { return S().players[0].g; }
  function kase(i) { return function () { return document.querySelector('.cases .case[data-i="' + i + '"]'); }; }
  function shut() { var l = []; for (var i = 0; i < 26; i++) if (g().opened.indexOf(i) < 0 && i !== g().my) l.push(i); return l; }
  // a closed case on the stage holding a small amount (or the smallest there is)
  function smallCase() { var l = shut().sort(function (a, b) { return g().vals[a] - g().vals[b]; }); return l[Math.min(3, l.length - 1)]; }
  function calm() { return !X.busy() && !document.querySelector('.rv, .ring'); }

  Kit.demoScript({
    intro: 'Here’s how Deal or No Deal goes. You’ll pick your case and open one yourself.',
    beats: 11,
    end: 'Open cases, watch the money board, and decide each time the Banker calls: take the deal, or play on for what’s in your case.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.start({ mode: 'solo', players: [{ name: me, color: Kit.color(0) }], options: { pace: 'tv' } });
    },
    steps: async function (D) {
      await D.say('There are 26 cases, holding every amount on the money board from 1 cent to $1,000,000.', { at: '.floor .col.hi' });
      await D.you('#cases', 'Pick your case. Nobody knows what’s inside, and it stays on your podium until the end.', {
        allow: function () { return D.qa('.cases .case.can'); }, autoTap: kase(6), until: function () { return g().my != null; }, spot: false
      });
      await D.wait(900);
      await D.you('#cases', 'Now you open the other cases, six in the first round. Tap any case on the stage.', {
        allow: function () { return D.qa('.cases .case.can'); }, autoTap: function () { return kase(smallCase())(); }, until: function () { return g().opened.length > 0; }, spot: false
      });
      await D.wait(calm, 9000);
      await D.say('That amount goes dark on the money board, because it isn’t in your case. Small amounts in blue are good news, and big ones in gold hurt.', { at: '.floor' });
      // the rest of round 1: four more open at once, and the demo opens the sixth
      await D.set(function () {
        X.set(function (s) { var gg = s.players[0].g; for (var k = 0; k < 4; k++) gg.opened.push(smallCase()); });
      });
      await D.tap(function () { return kase(smallCase())(); }, { say: 'Here are four more, and the last case of round 1.' });
      D.clear();
      await D.wait(function () { return g().phase === 'offer' && calm(); }, 15000);
      await D.wait(900);
      await D.say('After each round, the Banker calls with an offer to buy your case.', { at: '.desk .led' });
      await D.say('To take the deal, you lift the clear cover and press the red button.', { at: '.desk .dealw' });
      await D.you('.desk .nodeal', 'This offer is low. Tap No deal to keep playing.', { until: function () { return g().phase === 'open'; } });
      await D.wait(500);
      // the end of the game: every offer turned down, and two cases left
      await D.set(function () {
        X.set(function (s) {
          var gg = s.players[0].g, m = gg.my, un = [];
          for (var i = 0; i < 26; i++) if (gg.opened.indexOf(i) < 0) un.push(i);
          var vals = un.map(function (i) { return gg.vals[i]; }).sort(function (a, b) { return a - b; });
          var big = [300000, 200000, 400000, 100000, 500000, 75000, 750000, 50000].filter(function (v) { return vals.indexOf(v) >= 0; })[0] || vals[vals.length - 1], small = vals[0];
          var rest = vals.filter(function (v) { return v !== big && v !== small; });
          var other = un.filter(function (i) { return i !== m; })[0], others = un.filter(function (i) { return i !== m && i !== other; });
          gg.vals[m] = big; gg.vals[other] = small;
          // the rest go back in the cases in an order where the big ones come out late, then open round by round
          rest.sort(function (a, b) { return (a % 7) - (b % 7) || a - b; });
          others.forEach(function (i, k) { gg.vals[i] = rest[k]; });
          for (var r = 1; r <= 8; r++) {
            while (gg.opened.length < CUM[r]) gg.opened.push(others.shift());
            gg.round = r; gg.offers.push({ r: r, amt: X.offer(r) });
          }
          gg.round = 9; gg.phase = 'swap';
        });
      });
      await D.say('Now we skip ahead to the end, after saying No deal to every offer. The bars show what the Banker offered each round.', { at: '.desk .tl' });
      await D.say('When only your case and one other are left, you can keep your case or swap it for the last one on the stage.', { at: '.desk .duo' });
      await D.tap('.desk #keep', { say: 'You keep yours. First the last case on the stage opens, then your own.' });
      await D.wait(function () { return g().phase === 'done'; }, 20000);
      await D.wait(function () { return document.querySelector('.k-win .card'); }, 6000);
      await D.wait(500);
      var won = g().vals[g().my];
      await D.say('Your case held $' + won.toLocaleString('en-US') + ', and that’s what you win.', { at: '.k-win .card' });
    }
  });
})();
