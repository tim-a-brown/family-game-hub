// Battleship's demo (demo.js; CLAUDE.md, Demos): a battle against the computer. A ship is dragged onto your ocean and
// turned, Auto-place sets out the rest, and you start the battle; a miss, a hit, and you sink Bender's Destroyer.
(function () {
  'use strict';
  var B = window.__battleship;
  function S() { return B.state(); }
  function cell(sea, i) { return function () { return document.querySelectorAll('.sea.' + sea + ' .cells .cell')[i]; }; }
  function myTurn() { var s = S(); return s.phase === 'battle' && s.turn === 0 && !B.busy(); }
  // Bender's fleet: Carrier, Battleship, Cruiser, Submarine, Destroyer (the Destroyer on E5 and E6)
  var FLEET = [{ r: 1, c: 1, h: true }, { r: 6, c: 8, h: false }, { r: 8, c: 2, h: true }, { r: 3, c: 0, h: false }, { r: 4, c: 4, h: true }];

  Kit.demoScript({
    intro: 'Here’s how a game of Battleship goes. You’ll sink one of Bender’s ships yourself.',
    beats: 11,
    end: 'Hide your fleet, then hunt: after a hit, fire at the squares around it until the ship sinks.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      B.start({ level: 'normal', players: [{ name: me, cpu: false }, { name: 'Bender', cpu: true }] });
    },
    steps: async function (D) {
      await D.say('First you place your five ships on your ocean grid, where Bender can’t see them.', { at: '.sea.own' });
      await D.say('Drag a ship onto your ocean grid. This is the Carrier, five squares long.', { at: '.dock .dship' });
      await D.drag('.dock .dship', cell('own', 22), { after: 600 });
      await D.say('Ships go across or up and down. Tap a ship on the grid to turn it.', { at: '.sea.own .ship', wait: 2800 });
      await D.tap('.sea.own .ship', { after: 700 });
      await D.say('Auto-place sets out the whole fleet for you in one go.', { at: '.pbtns .btn', wait: 2600 });
      await D.tap('.pbtns .btn', { after: 900 });
      await D.you('.btn-primary.btn-block', 'Your fleet is ready. Tap Ready for battle.', { until: function () { return S().phase === 'battle'; } });
      await D.set(function () { B.set(function (s) { s.fleets[1] = FLEET.map(function (x) { return { r: x.r, c: x.c, h: x.h }; }); }); });
      await D.wait(400);
      await D.say('This grid is Bender’s waters. Each turn you fire one shot by tapping a square.', { at: '.sea.tgt' });
      await D.tap(cell('tgt', 22));
      await D.wait(function () { return S().shots[1].some(Boolean) && myTurn(); }, 8000);
      await D.wait(600);
      await D.say('Your white peg is a miss. Then Bender fired back at your own ocean, on this grid.', { at: '.sea.own' });
      await D.tap(cell('tgt', 44));
      await D.wait(900);
      await D.say('A red peg is a hit. Part of one of Bender’s ships is on that square.', { at: cell('tgt', 44) });
      await D.wait(myTurn, 8000);
      await D.you(cell('tgt', 45), 'After a hit, try the squares next to it. Tap the square to its right.', { until: function () { return !!S().shots[0][45]; } });
      await D.wait(1800);
      await D.say('You sank Bender’s Destroyer. It shows on the grid now, and it’s crossed off Bender’s fleet.', { at: function () { return document.querySelector('.side .fl.sunk') || '.side'; } });
      await D.say('Sink all five of Bender’s ships before Bender sinks yours, and you win.', { at: '.sea.tgt' });
    }
  });
})();
