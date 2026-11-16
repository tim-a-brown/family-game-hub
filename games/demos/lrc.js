// Left Right Center's demo (demo.js; CLAUDE.md, Demos): a table of four. You roll your three dice (an L, a C and a dot),
// the computer players roll theirs (EVE's C, C, C empties her stack, and Johnny 5's R gives her a chip back), then the
// demo skips to the end, where Bender's last chip goes in the pot and you win it.
(function () {
  'use strict';
  var L = window.__lrc;
  // every roll of the demo, in order (the page reads __lrc.rig once a roll and sets it back to null)
  var q = [['L', 'C', '.'], ['R', '.', '.'], ['C', 'C', 'C'], ['L', '.', 'R'], ['C']];
  function S() { return L.state(); }
  function seat(i) { return function () { return document.querySelector('.oval .lseat[data-i="' + i + '"]'); }; }
  function idle(cur) { return function () { var s = S(); return s && !L.busy() && s.cur === cur; }; }
  // the table waits after each roll while a caption explains it (__lrc.hold); go() lets the next player roll
  function go() { L.hold(false); L.hold(true); }

  Kit.demoScript({
    intro: 'Here’s how Left Right Center goes. You’ll roll the dice yourself.',
    beats: 10,
    end: 'Roll a die for each chip you have, up to three, and pass the chips where the dice say. The last player with chips wins the pot.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      Object.defineProperty(L, 'rig', { configurable: true, get: function () { return q.length ? q[0] : null; }, set: function (v) { if (v == null) q.shift(); } });
      L.start({ mode: 'cpu', players: [{ name: me, color: Kit.color(0) }, { name: 'Bender', cpu: true, color: Kit.color(1) }, { name: 'EVE', cpu: true, color: Kit.color(2) },
        { name: 'Johnny 5', cpu: true, color: Kit.color(3) }], options: { stake: 0 } });
      L.hold(true);
    },
    steps: async function (D) {
      await D.say('Everyone starts with three chips. The last player who still has chips wins the pot in the middle.', { at: '.oval' });
      await D.you('.rollbtn', 'On your turn, you roll one die for each chip you have, up to three. Tap Roll.', { until: function () { return S().turns > 0; } });
      await D.wait(idle(1), 6000);
      await D.say('An L passes a chip to Bender on your left, and the C puts one in the pot. The dot means you keep that chip.', { at: '.oval .dice' });
      go();
      await D.say('Play goes around to the left, so Bender rolls next.', { at: seat(1), wait: false });
      await D.wait(idle(2), 9000);
      await D.say('Bender rolled an R, which sends a chip back to you on Bender’s right.', { at: seat(0), wait: 2600 });
      go();
      await D.wait(idle(3), 9000);
      await D.say('EVE rolled C, C, C, so all three of her chips went into the pot.', { at: '.oval .pot' });
      go();
      await D.wait(idle(0), 9000);
      await D.say('EVE was out of chips, but Johnny 5’s R sent one back to her. A player with no chips skips their turn and stays in the game.', { at: seat(2) });
      // the end of the game
      await D.set(function () {
        L.set(function (s) {
          s.players.forEach(function (p, i) { p.chips = [2, 1, 0, 0][i]; });
          s.pot = 9; s.cur = 1; s.round = 9; s.last = null;
        });
      });
      await D.say('Now we skip ahead to the end of the game. Only you and Bender have chips left.', { at: function () { return [seat(0)(), seat(1)()]; } });
      go();
      await D.wait(function () { return S().winner != null; }, 9000);
      await D.say('Bender rolled a C, and that last chip went into the pot. You are the only player with chips, so you win everything in the pot.', { at: '.oval .pot', wait: false });
      await D.wait(function () { return document.querySelector('.k-win .card'); }, 9000);
      await D.wait(600);
      await D.say('Every roll is pure luck, so anyone at the table can win the pot.', { at: '.k-win .card' });
    }
  });
})();
