// Lines of Action's demo (demo.js; CLAUDE.md, Demos): the counting rule on the opening move, then one piece later in
// the game whose lines show a jump over its own piece, a line blocked by an enemy piece and a capture, which you make;
// then you join your last piece to the rest and win.
(function () {
  'use strict';
  var L = window.__loa;
  function S() { return L.state(); }
  function sq(n) { return function () { return document.querySelector('.bd .sq[data-s="' + L.C.sqOf(n) + '"]'); }; }
  function sqs(l) { return function () { return l.map(function (n) { return sq(n)(); }); }; }
  function moved() { var s = S(); return s ? s.n : 0; }
  // later in the game: Black's piece on b4 can jump its own piece on d4, is blocked by White's c5, and can take b6
  var MID = ['....b...', 'w......w', '.w...b.w', '..w.....', '.b.b..w.', 'b.......', 'w....b.w', '...bb...'];
  // near the end: every black piece but the one on f1 is in one group
  var END = ['........', '.w....w.', '...b....', '..bb..w.', '....b...', '.w.bb...', '...w..w.', '.....b..'];

  Kit.demoScript({
    intro: 'Here’s how pieces count their way across the board, and how joining every piece wins.',
    beats: 12,
    end: 'Count the pieces on a line to see how far you move, jump your own pieces, take theirs, and join all of yours into one group.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      L.start({ mode: '2p', players: [{ name: me, cpu: false, side: 1 }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false, side: -1 }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play black, along the top and bottom edges. ' + them + ' plays white, down the two sides.', { at: '.frame' });
      await D.say('To win, join all of your pieces into one group, touching side by side or corner to corner. Right now you have two groups.', { at: '.pbar.bot .grp' });
      await D.tap(sq('c1'), { after: 500 });
      await D.say('A piece moves exactly as many squares as there are pieces on its whole line, both colors, counting itself.', { at: sq('c1'), avoid: '.bd' });
      await D.say('The c column holds two pieces, so this one moves two squares. Each landing shows its number.', { at: sqs(['c1', 'c8', 'c3']), avoid: '.bd' });
      await D.you(sq('c3'), 'Your turn. Move the piece two squares up.', { avoid: '.bd', until: function () { return moved() > 0; } });
      await D.wait(900);
      await D.tap(sq('h4'), { after: 400 });
      await D.tap(sq('f2'), { after: 900 });
      await D.set(function () { L.set(MID, 1); });
      await D.tap(sq('b4'), { after: 600 });
      await D.say('Later in a game, this row holds three pieces, so the piece moves three squares, jumping your own piece on the way.', { at: sqs(['b4', 'd4', 'e4']), avoid: '.bd' });
      await D.say('A piece can never jump the other player’s pieces, so this diagonal is blocked.', { at: sqs(['c5']), avoid: '.bd' });
      await D.say('Two squares up is a white piece. Landing on it captures it.', { at: sqs(['b6']), avoid: '.bd' });
      await D.you(sq('b6'), 'Your turn. Capture the white piece.', { avoid: '.bd', until: function () { return moved() > 0; } });
      await D.wait(1100);
      await D.set(function () { L.set(END, 1); });
      await D.say('Near the end, all your pieces but one are in a group.', { at: sqs(['f1', 'e4', 'd3']), avoid: '.bd' });
      await D.tap(sq('f1'), { after: 500 });
      await D.you(sq('f2'), 'Your turn. Move it up one square to join the group.', { avoid: '.bd', until: function () { return moved() > 0; } });
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 12000);
      await D.wait(700);
      await D.say('All of your pieces touch in one group, so you win the game.', { at: '.k-win .rank', pos: 'above' });
    }
  });
})();
