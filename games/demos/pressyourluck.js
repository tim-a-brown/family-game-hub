// Press Your Luck's demo (demo.js; CLAUDE.md, Demos): the first round's Big Board against two computer contestants. You
// spin and stop the board yourself on cash with an extra spin, then spin again and stop on a Whammy, which takes it all.
// (The demo starts everyone with five spins; a caption says that the show's toss-up questions earn them.)
(function () {
  'use strict';
  var Y = window.__pyl;
  function S() { return Y.state(); }
  function me() { return S().players[0]; }
  function deciding() { var u = Y.ui(); return u.await === 'decide' && S().cur === 0; }
  function running() { return Y.ui().await === 'stop'; }
  function pod(i) { return function () { return document.querySelectorAll('.pods .pod')[i]; }; }
  function lit() { var u = Y.ui(); return u.lit >= 0 ? document.querySelectorAll('.board .sq')[u.lit] : null; }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  Kit.demoScript({
    intro: 'Here’s how the Big Board works in Press Your Luck. You’ll stop the board yourself.',
    beats: 10,
    end: 'Spin and stop the board for cash, prizes and extra spins, and stop before a Whammy takes it all. The most money wins.',
    start: function () {
      var nm = (localStorage.getItem('my_name') || '').trim() || 'You';
      Y.start({ mode: 'cpu', players: [{ name: nm }, { name: 'Bender', cpu: true }, { name: 'EVE', cpu: true }], options: { earn: 's5', level: 'mixed', bonus: 'on' } });
    },
    steps: async function (D) {
      await D.wait(function () { return document.querySelector('.pan .gobtn'); }, 6000);
      await D.say('In the show, contestants earn their spins by answering toss-up questions. This time everyone starts with five spins.', { at: '.pan' });
      await D.tap('.pan .gobtn', { after: 300 });
      await D.wait(deciding, 12000);
      await D.say('The Big Board’s eighteen squares flash cash, prizes and Whammies. You want the light to stop on money.', { at: '.board' });
      await D.you('.dome', 'It’s your turn. Tap the big button to spin the board.', { until: running });
      Y.force({ t: 'cash', s: 1 });
      await D.wait(1500);
      await D.you('.dome', 'The light is hopping around the board. Tap Stop!', { until: function () { return !running(); }, spot: false });
      await D.wait(function () { return deciding() && me().bank > 0; }, 12000);
      await D.say('You won ' + money(me().bank) + ', and the square gave you one more spin too.', { at: pod(0) });
      await D.say('Now you can press your luck and spin again, or pass your spins to the leader, who has to play them.', { at: '.ctl' });
      await D.tap('.dome', { after: 1800 });
      Y.force({ t: 'wh' });
      await D.tap('.dome', { say: 'You spin again, and this time…' });
      await D.wait(function () { return me().wh > 0; }, 12000);
      await D.wait(1600);
      await D.say('A Whammy! It takes every dollar you’ve won so far.', { at: pod(0), wait: 3000 });
      await D.wait(deciding, 12000);
      await D.say('A fourth Whammy puts you out of the game, so each one makes the next spin riskier.', { at: pod(0) });
      await D.say('When all the spins are played, round two has bigger money. After two rounds, the most money wins, and the winner plays the Bonus Round.', { at: '.board' });
    }
  });
})();
