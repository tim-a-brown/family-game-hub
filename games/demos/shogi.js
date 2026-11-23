// Shogi's demo (demo.js; CLAUDE.md, Demos): the opening move, then a middle game where you take a Pawn with your Rook
// and promote it to a Dragon, and a Gold dropped from your stand checkmates the other King.
(function () {
  'use strict';
  var G = window.__shogi;
  function S() { return G.state(); }
  function sq(n) { return function () { return document.querySelector('.bd .sq[data-s="' + G.sq(n) + '"]'); }; }
  function sqs(l) { return function () { return l.map(function (n) { return sq(n)(); }); }; }
  function moved() { var s = S(); return s && s.g ? s.g.n : 0; }
  function slot(t) { return function () { return document.querySelector('.stand[data-side="1"] .hp[data-t="' + t + '"]'); }; }
  async function play(D, txt, after) {
    var n = moved();
    await D.set(function () { G.play(txt); });
    await D.wait(function () { return moved() > n; }, 3000);
    await D.wait(after != null ? after : 1300);
  }
  function at(list, hb, hw) {
    var b = []; for (var i = 0; i < 81; i++) b.push(0);
    Object.keys(list).forEach(function (k) { b[G.sq(k)] = list[k]; });
    function h(o) { var a = [0, 0, 0, 0, 0, 0, 0, 0]; Object.keys(o || {}).forEach(function (k) { a[k] = o[k]; }); return a; }
    return { b: b, hb: h(hb), hw: h(hw), turn: 1 };
  }
  // the middle game: White's King on 5a has wandered from its Golds; your Silver stands on 5c
  var MID = at({ '5a': -8, '9a': -2, '8a': -3, '1a': -2, '7b': -5, '3b': -5, '9c': -1, '8c': -1, '7c': -1, '6c': -1, '4c': -1, '2c': -1, '1c': -1, '8b': -7,
    '5c': 4, '2h': 7, '5i': 8, '4i': 5, '6h': 5, '7h': 4, '9g': 1, '8g': 1, '7g': 1, '6g': 1, '4g': 1, '3g': 1, '1g': 1, '9i': 2, '1i': 2, '8i': 3, '2i': 3, '8h': 6 },
    { 5: 1, 1: 1 }, { 6: 1, 4: 1, 1: 1 });

  Kit.demoScript({
    intro: 'Here’s how the pieces move, how a piece promotes, and how a piece you captured comes back to win the game.',
    beats: 11,
    end: 'Promote your Rook and Bishop when you can, keep the pieces you capture, and drop them where they hurt most.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      G.start({ mode: '2p', players: [{ name: me, cpu: false, side: 1 }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false, side: -1 }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play Black, at the bottom, and Black moves first. Every piece points toward the player it belongs to, so the pieces pointing down are ' + Kit.poss(them) + '.', { at: '.frame', ring: false });
      await D.you(sq('7g'), 'Tap the Pawn on 7g to see where it can go.', { until: function () { return !!document.querySelector('.sq.mv'); } });
      await D.you(sq('7f'), 'A Pawn steps one square straight ahead. Tap the dot to move it.', { until: function () { return moved() > 0; } });
      await D.wait(900);
      await play(D, 'P3c-3d', 900);
      await D.set(function () { G.set(MID); });
      await D.say('Now we’re in the middle of a game. The pieces you capture sit on your piece stand, and they are yours to use.', { at: '.stand[data-side="1"]' });
      await D.you(sq('2h'), 'The three rows at the far side are where pieces promote. Tap your Rook.', { until: function () { return !!document.querySelector('.sq.mv'); } });
      await D.you(sq('2c'), 'Tap the Pawn on 2c to capture it. A red mark means the piece can promote there.', { until: function () { return !!document.querySelector('.promo'); } });
      await D.you('.promo button.go', 'Your Rook reached the promotion zone, so it can turn over. Tap Promote to make it a Dragon.', { until: function () { return moved() > 0; } });
      await D.wait(2600);
      await D.say('The Pawn you took flew to your stand. The Dragon moves like a Rook and also one square diagonally.', { at: sqs(['2c']) });
      await play(D, 'P9c-9d', 1000);
      await D.you(slot(5), 'Now tap the Gold on your stand. Instead of moving a piece, you can drop one from your stand onto an empty square.', { until: function () { return !!document.querySelector('.sq.mv'); } });
      await D.you(sq('5b'), 'Drop the Gold right in front of the King, on 5b. Your Silver on 5c protects it.', { avoid: sqs(['5c', '5a']), until: function () { return moved() > 2; } });
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 16000);
      await D.wait(700);
      await D.say('The King can’t take the Gold and has nowhere left to go. That’s checkmate, and you won.', { at: '.k-win .rank', pos: 'above' });
    }
  });
})();
