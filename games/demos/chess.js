// Chess's demo (demo.js; CLAUDE.md, Demos): the opening moves of a real game show how the pawn, the bishop, the knight and
// the queen move, then you finish it with the four-move checkmate (Scholar's mate: 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7#).
(function () {
  'use strict';
  var C = window.__chess;
  function idx(n) { return (8 - +n.charAt(1)) * 8 + 'abcdefgh'.indexOf(n.charAt(0)); }
  // the piece standing on a square, or the square itself when it is empty
  function at(n) { return function () { return document.querySelector('.bd .layer .pc[data-s="' + idx(n) + '"]:not(.gone)') || document.querySelector('.bd .sq[data-s="' + idx(n) + '"]'); }; }
  function sq(n) { return function () { return document.querySelector('.bd .sq[data-s="' + idx(n) + '"]'); }; }
  function dots() { return document.querySelectorAll('.bd .sq.mv, .bd .sq.cap'); }
  function moved() { var s = C.state(); return s && s.moves ? s.moves.length : 0; }
  async function move(D, a, b, o) {
    o = o || {};
    var n = moved();
    await D.tap(at(a), { after: o.pause != null ? o.pause : 420 });
    if (o.say) await D.say(o.say, { at: o.ringAt || at(a), wait: o.wait, avoid: [dots] });
    await D.tap(sq(b), { after: 300 });
    await D.wait(function () { return moved() > n; }, 3000);
    await D.wait(o.after != null ? o.after : 650);
  }

  Kit.demoScript({
    intro: 'Here’s how the pieces move, and then you finish a game with a checkmate.',
    beats: 11,
    end: 'Every piece has its own way of moving. Protect your king, and look for ways to trap theirs.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      C.start({ mode: '2p', players: [{ name: me, cpu: false, side: 1 }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false, side: -1 }] });
    },
    steps: async function (D) {
      await D.say('You play the white pieces, and White always moves first. To move, tap a piece and then the square it goes to.', { at: '.bd', pos: 'below' });
      await move(D, 'e2', 'e4', { say: 'A pawn moves straight ahead, one square at a time, or two on its very first move. The dots show where it can go.' });
      await D.say('Then Black moves, and the two of you take turns.', { wait: 1800, pos: 'top' });
      await move(D, 'e7', 'e5', { pause: 260 });
      await move(D, 'f1', 'c4', { say: 'A bishop slides any distance along a diagonal, as long as nothing is in its way.' });
      await move(D, 'b8', 'c6', { say: 'A knight jumps in an L: two squares one way, then one to the side. It is the only piece that can jump over others.' });
      await move(D, 'd1', 'h5', { say: 'The queen is the strongest piece. She moves any distance in a straight line or along a diagonal.' });
      await D.say('Your queen and your bishop are both aiming at the pawn on f7, and only Black’s king guards it.', { at: sq('f7') });
      await move(D, 'g8', 'f6', { say: 'Black brings a knight out to attack your queen, and doesn’t see the danger.', ringAt: at('h5') });
      await D.you(at('h5'), 'Your move. Tap your queen.', { until: function () { var s = C.state(); return s && !!document.querySelector('.bd .sq.sel'); } });
      await D.you(at('f7'), 'Now tap the pawn on f7 to capture it. A piece captures by moving onto an enemy’s square.', {
        avoid: [sq('h5')], until: function () { var s = C.state(); return s && s.over; }
      });
      await D.wait(700);
      await D.say('Checkmate! Black’s king is in check, which means under attack, and it has no safe square to move to. The bishop guards your queen, so the king can’t take her either.', { at: sq('e8'), place: 'bottom' });
    }
  });
})();
