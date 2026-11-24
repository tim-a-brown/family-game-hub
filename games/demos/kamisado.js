// Kamisado's demo (demo.js; CLAUDE.md, Demos): you play Black and start with the pink tower; the square you land on picks
// the tower Jamie must move; later your move leaves Jamie's orange tower with nowhere to go, so you move again and
// your orange tower runs home to win.
(function () {
  'use strict';
  var A = window.__kamisado;
  function S() { return A.state(); }
  function sq(n) { return A.sq(n); }
  function tw(n) { return A.tower(n); }
  function moved() { var s = S(); return s ? s.n : 0; }
  // later on: your orange tower must move; a move to c6 blocks Jamie's orange tower on a8
  var BLOCK = ['AB.DE.G.', 'bC.....g', '.....F..', '........', '........', '.......H', '.h......', '..fedc.a'];

  Kit.demoScript({
    intro: 'Here’s how the color of a square picks the next tower, and how a blocked tower can win you the round.',
    beats: 9,
    end: 'Every move you make picks the tower the other player must move next. Send them a tower with no way home.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      A.start({ mode: '2p', target: 1, players: [{ name: me, cpu: false, side: 1 }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false, side: 2 }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play black and start, with any tower. Get one tower all the way to ' + them + '’s home row, the far side, to win.', { at: '.frame' });
      await D.you(tw('e1'), 'Tap your pink tower on e1 to pick it up.', { until: function () { return A.sel === A.core.idx('e1'); } });
      await D.say('A tower moves straight or diagonally forward, as far as it likes, never past another tower. The dots show where it can go.', { at: '.frame' });
      await D.you(sq('e5'), 'Tap e5, then tap it again to move there.', { until: function () { return moved() > 0; } });
      await D.wait(900);
      await D.say('Your tower landed on a brown square, so ' + them + ' must move their brown tower next. It glows.', { at: tw('h8') });
      var n = moved();
      await D.set(function () { A.play('h8-h6'); });
      await D.wait(function () { return moved() > n && !A.busy; }, 3000);
      await D.say(them + '’s tower landed on blue, so now you must move your blue tower. A red dot is a move that would send ' + them + ' a tower with a clear way to your home row.', { at: tw('g1') });
      await D.set(function () { A.set(BLOCK, 1, 0); });
      await D.say('A few moves later, you must move the orange tower. Look at ' + them + '’s orange tower on a8: it has nowhere to go.', { at: tw('a8') });
      n = moved();
      await D.you(sq('c6'), 'Tap c6, an orange square, twice. The ring on the dot means ' + them + '’s tower will be blocked.', { until: function () { return moved() > n; } });
      await D.wait(function () { return !A.busy; }, 5000);
      await D.wait(400);
      await D.say('Blocked: ' + them + '’s orange tower moves zero squares. It stands on orange, so you move your orange tower again.', { at: tw('c6') });
      await D.you(sq('c8'), 'Tap c8 twice to run home.', { until: function () { return S().over; } });
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 9000);
      await D.wait(500);
      await D.say('Your tower reached ' + them + '’s home row, so you win. In a match, that tower becomes a Sumo, with a push of its own.', { at: '.k-win .rank', pos: 'above' });
    }
  });
})();
