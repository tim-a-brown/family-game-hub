// Mancala's demo (demo.js; CLAUDE.md, Demos): a game against the computer. You sow four stones that end in your store
// and go again; then, later in the game, your last stone lands in an empty pit and takes the stones across from it.
(function () {
  'use strict';
  var M = window.__mancala;
  function S() { return M.state(); }
  function pit(i) { return function () { return document.querySelectorAll('.mboard .pit')[i]; }; }
  function mine() { return [0, 1, 2, 3, 4, 5].map(function (i) { return pit(i)(); }); }
  function idle() { var s = S(); return s && !M.busy() && !s.over; }

  Kit.demoScript({
    intro: 'Here’s how stones are sown in Mancala. You’ll play two moves yourself.',
    beats: 11,
    end: 'Sow your stones to land in your store for another turn, or in an empty pit of your own to capture.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      M.start({ mode: 'cpu', level: 'med', per: 4, players: [{ name: me, cpu: false, color: Kit.color(0) }, { name: 'Bender', cpu: true, color: Kit.color(1) }] });
    },
    steps: async function (D) {
      await D.say('The six pits along your side are yours. Every pit starts with four stones.', { at: mine });
      await D.say('This long pit is your store. The player with the most stones in their store at the end wins.', { at: pit(6) });
      await D.you(pit(2), 'Tap this pit. You scoop up its four stones and drop them one at a time into the next pits.', {
        until: function () { return M.busy() || S().moves >= 1; }
      });
      await D.wait(function () { return S().moves >= 1 && !M.busy(); }, 8000);
      await D.wait(400);
      await D.say('Your last stone landed in your own store, so you get another turn.', { at: pit(6) });
      await D.say('Stones carry on past your store and into Bender’s pits. Only Bender’s store is ever skipped.', { at: pit(5) });
      await D.tap(pit(5));
      await D.wait(function () { var s = S(); return s.cur === 1; }, 9000);
      await D.say('Now it’s Bender’s turn.', { at: '.mtag.opp', wait: 1800 });
      await D.wait(function () { return idle() && S().cur === 0; }, 15000);
      await D.wait(600);
      // later in the game: a capture to be made
      await D.set(function () { M.board([2, 3, 1, 4, 0, 2, 13, 1, 8, 2, 0, 3, 1, 8], 0); });
      await D.say('Now we skip ahead to later in the game.', { pos: 'center', ring: false, wait: 2200 });
      await D.say('This pit on your side is empty, and Bender’s pit across from it holds eight stones.', { at: function () { return [pit(4)(), pit(8)()]; } });
      M.hold(true);   // (Bender waits while the capture is explained)
      await D.you(pit(1), 'Tap this pit. Its three stones end in that empty pit.', {
        until: function () { var s = S(); return M.busy() || s.st.caps.length > 0; }
      });
      await D.wait(function () { return S().st.caps.length > 0; }, 6000);
      await D.wait(function () { return S().cur === 1 && !M.busy(); }, 6000);
      await D.wait(300);
      await D.say('That’s a capture. Your last stone landed in an empty pit on your side, so it goes into your store with all eight stones across from it.', { at: pit(6) });
      await D.say('When all six pits on one side are empty, the game ends. The other player adds the stones left on their side to their store.', { at: mine });
      M.hold(false);
      await D.wait(1500);
    }
  });
})();
