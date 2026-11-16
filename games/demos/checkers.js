// Checkers' demo (demo.js; CLAUDE.md, Demos): the opening moves against Jamie show a step, a jump and a jump back; then,
// later in the game, you make a double jump onto the far row and are crowned, and your king jumps backward to win.
(function () {
  'use strict';
  var K = window.__checkers;
  function S() { return K.state(); }
  // squares by the board's own numbering (row * 8 + column; Black starts on rows 0 to 2)
  function sq(s) { return function () { return document.querySelector('.bd .sq[data-s="' + s + '"]'); }; }
  function sqs(l) { return function () { return l.map(function (s) { return sq(s)(); }); }; }
  function dots() { return document.querySelectorAll('.bd .sq.mv, .bd .sq.jp'); }
  function plies() { var s = S(); return s ? s.n : 0; }
  async function move(D, path, o) {
    o = o || {};
    var n = plies();
    await D.tap(sq(path[0]), { after: o.pause != null ? o.pause : 420 });
    if (o.say) await D.say(o.say, { at: o.ringAt || sq(path[0]), avoid: [dots] });
    for (var i = 1; i < path.length; i++) await D.tap(sq(path[i]), { after: 300 });
    await D.wait(function () { return plies() > n; }, 3000);
    await D.wait(o.after != null ? o.after : 750);
  }
  // later in the game: Black to move, with a double jump onto the far row
  function later() {
    var b = []; for (var i = 0; i < 64; i++) b.push(0);
    [1, 12, 26, 42, 51].forEach(function (s) { b[s] = 1; });
    [35, 53, 60].forEach(function (s) { b[s] = -1; });
    return b;
  }

  Kit.demoScript({
    intro: 'Here’s how checkers move and jump, and then you make a double jump and crown a king.',
    beats: 12,
    end: 'Move forward on the dark squares, jump whenever you can, and get to the far side to make a king.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      K.start({ mode: '2p', forced: true, players: [{ name: me, cpu: false, side: 1 }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false, side: -1 }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play the black checkers, and Black moves first. The checkers only ever sit on the dark squares.', { at: '.bd' });
      await move(D, [19, 28], { say: 'A checker moves one square diagonally forward. The dots show where this one can go.' });
      await move(D, [42, 35], { pause: 260, after: 500 });
      await D.say(them + ' moved a red checker right next to yours, with an empty square behind it.', { at: sq(35) });
      await D.say('Now you can jump over it onto the empty square, and the checker you jump is captured. If you can jump, you have to.', { at: sqs([28, 35, 42]) });
      await move(D, [28, 42], { after: 900 });
      await move(D, [51, 33], { pause: 260, after: 600 });
      await D.say(them + ' had to jump too, and took your checker back.', { at: sq(33) });
      await D.set(function () { K.set(later(), 1); });
      await D.say('Now we skip ahead to later in the game.', { pos: 'center', ring: false, wait: 2200 });
      await D.say('This checker can jump two of ' + them + '’s checkers in one move. After a jump, a checker that can jump again keeps going.', { at: sqs([26, 35, 44, 53, 62]) });
      await D.you(sq(26), 'Your turn. Tap your glowing checker.', { until: function () { return !!document.querySelector('.bd .sq.sel'); } });
      await D.you(sqs([44, 62]), 'Now tap the empty square past ' + them + '’s checker, and then the next one.', {
        allow: [dots], until: function () { return plies() > 0; },
        autoTap: function () { return document.querySelector('.bd .sq.jp'); }
      });
      await D.wait(2200);
      await D.say('A double jump! Your checker reached the far side, so it’s crowned a king.', { at: sq(62) });
      await move(D, [60, 53], { pause: 260, after: 600 });
      await D.say('A king can move and jump backward as well as forward.', { at: sqs([62, 53, 44]) });
      await D.you(sq(62), them + ' has one checker left. Tap your king, then jump backward over that checker.', {
        allow: [sq(62), dots], until: function () { var s = S(); return s && s.over; },
        autoTap: function () { return document.querySelector('.bd .sq.jp') || sq(62)(); }
      });
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 6000);
      await D.wait(700);
      await D.say('You captured every one of ' + them + '’s checkers, so you win!', { at: '.k-win h2', pos: 'above' });
    }
  });
})();
