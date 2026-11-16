// Yahtzee's demo (demo.js; CLAUDE.md, Demos): three turns late in a game of your own. You hold the sixes and score them,
// which earns the top section's bonus; then a Large Straight and a Yahtzee show the bottom of the card.
(function () {
  'use strict';
  var Y = window.__yahtzee;
  function S() { return Y.state(); }
  function dice() { return [].slice.call(document.querySelectorAll('.tray .dice .die')); }
  function die(i) { return function () { return dice()[i]; }; }
  // the current player's cell in the row with this name (the label's bold words)
  function cell(name) {
    return function () {
      var rows = document.querySelectorAll('.card table.sc tr');
      for (var i = 0; i < rows.length; i++) {
        var b = rows[i].querySelector('th.lbl b');
        if (b && b.textContent === name) return rows[i].querySelector('td.cur') || rows[i];
      }
      return null;
    };
  }
  function row(name) { return function () { var c = cell(name)(); return c && c.closest ? c.closest('tr') : c; }; }
  var roll = '.tray .rollbtn';

  Kit.demoScript({
    intro: 'Here’s how a turn of Yahtzee goes, and then you roll one yourself.',
    beats: 12,
    end: 'Hold the dice that help, and save your big boxes for the big rolls.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      Y.start({ mode: 'cpu', players: [{ name: me, cpu: false, color: Kit.color(0) }] });
      // round 9: most of the top section is filled in, 45 of the 63 its bonus needs
      var s = S();
      s.players[0].card = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, k3: 22, ch: 21, ss: 30 };
      s.round = 9;
      Y.render();
    },
    steps: async function (D) {
      await D.say('Each turn, you roll five dice up to three times. Then you score them in one box on your score card.', { at: '.tray' });
      Y.rig([6, 2, 6, 5, 3]);
      await D.tap(roll);
      await D.wait(700);
      await D.say('You rolled two sixes. A die you tap is held, so it stays put when you roll again.', { at: '.tray .dice' });
      await D.you('.tray .dice', 'Tap both sixes to hold them.', {
        allow: [die(0), die(2)], until: function () { return S().held[0] && S().held[2]; },
        autoTap: function () { return !S().held[0] ? dice()[0] : dice()[2]; }
      });
      await D.wait(300);
      Y.rig([6, 4, 1]);
      await D.say('Now roll again. Only the three dice you didn’t hold will move.', { at: roll, wait: 2600 });
      await D.tap(roll);
      await D.wait(800);
      await D.say('Three sixes! The card shows what each open box would score with these dice.', { at: '.card' , pos: 'above' });
      await D.say('Sixes would score 18, and that brings your top section to 63.', { at: cell('Sixes') });
      await D.you(cell('Sixes'), 'Tap Sixes to score your 18.');
      await D.wait(900);
      await D.say('Reaching 63 in the top section earns a bonus of 35 points.', { at: row('Bonus') });
      // round 10: a Large Straight
      Y.rig([2, 3, 4, 5, 6]);
      await D.tap(roll);
      await D.wait(1300);
      await D.say('Five dice in a row are a Large Straight, worth 40 points.', { at: cell('Lg. Straight') });
      await D.tap(cell('Lg. Straight'));
      await D.wait(900);
      // round 11: four fives, then the fifth
      Y.rig([5, 5, 2, 5, 5]);
      await D.tap(roll);
      await D.wait(700);
      await D.say('Four fives. Hold them all and roll for the fifth.', { at: '.tray .dice', wait: 2600 });
      await D.tap(die(0), { after: 160 });
      await D.tap(die(1), { after: 160 });
      await D.tap(die(3), { after: 160 });
      await D.tap(die(4), { after: 260 });
      Y.rig([5]);
      await D.tap(roll);
      await D.wait(3000);
      await D.say('Five of a kind is a Yahtzee, the best box on the card at 50 points.', { at: cell('Yahtzee') });
      await D.tap(cell('Yahtzee'));
      await D.wait(900);
      await D.say('Every turn fills one box, even if it scores nothing. After 13 rounds, the highest grand total wins.', { at: row('Grand total') });
    }
  });
})();
