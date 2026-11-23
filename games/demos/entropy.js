// Entropy's demo (demo.js; CLAUDE.md, Demos): Chaos draws a chip from the bag and places it; you, as Order, choose a
// chip, see what each slide would score, and slide it to make red, blue, red; then the board fills, every line is
// counted, and the players change roles.
(function () {
  'use strict';
  var T = window.__entropy;
  function S() { return T.state(); }
  function cell(n) { return function () { return T.cell(n); }; }
  function chip(n) { return function () { return T.chip(n) || T.cell(n); }; }
  // a game under way: Jamie (Chaos) has drawn a blue chip; a red chip waits at c5 and another at e2
  var MID = '0000000 0300060 0010000 0500007 0000000 6000130 0200005';
  // near the end: one square left empty, one blue chip left in the bag
  var END = '5241624675572731333131715425215172637447056264366';

  Kit.demoScript({
    intro: 'Here’s how Chaos places the chips, how Order slides them into patterns, and how the patterns are counted.',
    beats: 11,
    end: 'As Order, slide chips into rows and columns that read the same both ways. As Chaos, put each chip where it spoils them.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      T.start({ mode: '2p', sz: 7, first: 0, seed: 5, players: [{ name: me, cpu: false }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false }] });
      T.set(MID, { chip: 4 });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You and ' + them + ' play two games. In this one you are Order and make patterns. ' + them + ' is Chaos and spoils them.', { at: '.pbar.bot' });
      await D.say('Chaos draws a chip from the bag without looking: a blue one. The stacks beside it show how many of each color are still in the bag.', { at: '.bagbox' });
      await D.tap(cell('d5'), { after: 900 });
      await D.say(them + ' put the blue chip on d5, next to a red chip. Chaos can put it on any empty square.', { at: chip('d5'), avoid: '.bd' });
      await D.you(chip('e2'), 'Your turn as Order. Tap the red chip at the bottom to see where it can slide.', { avoid: '.bd', until: function () { return T.sel() === T.C.sq('e2', 7); } });
      await D.wait(500);
      await D.say('A chip slides along its row or column over empty squares, as a rook moves in chess. Each lit square shows what that slide would score.', { at: cell('e5'), avoid: '.bd' });
      await D.you(cell('e5'), 'Slide the red chip up to the square marked +3.', { avoid: '.bd', until: function () { return S().ph === 'place' && S().b[T.C.sq('e5', 7)] === 1; } });
      await D.wait(1600);
      await D.say('Red, blue, red reads the same both ways. That palindrome scores 3 points, one for each chip, and your plate counts them.', { at: '.pbar.bot .pt', avoid: '.bd' });
      await D.say('Palindromes inside longer ones count too: red, blue, blue, red scores 4, and 2 more for the two blues in its middle.', { pos: 'top', avoid: '.frame' });
      await D.set(function () { T.set(END, { ph: 'slide' }); });
      await D.you('.acts .pass', 'Later in the game, one square is left. Tap Pass, and the last chip comes out of the bag.', { avoid: '.frame', until: function () { return T.busy(); } });
      await D.wait(2600);
      await D.say('When the board is full, every row and every column is counted, and each palindrome in it lights up.', { at: '.frame', avoid: '.frame', wait: 4200 });
      await D.wait(function () { return document.querySelector('.k-mob'); }, 16000);
      await D.say('Then you change roles: ' + them + ' plays Order on an empty board, and you play Chaos. Whoever scores more as Order wins.', { pos: 'top' });
    }
  });
})();
