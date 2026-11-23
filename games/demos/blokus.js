// Blokus's demo (demo.js; CLAUDE.md, Demos): the first piece on your corner, which you put down; later a piece turned
// and laid across the other player's corners, a block; then the single square played last for the end count.
(function () {
  'use strict';
  var T = window.__blokus;
  function S() { return T.state(); }
  function piece(p) { return function () { return T.piece(p); }; }
  function cell(x) { return function () { return T.cell(x); }; }
  function btn(re) { return function () { return [].slice.call(document.querySelectorAll('.acts .btn')).filter(function (b) { return re.test(b.textContent); })[0] || null; }; }
  function ghost() { return T.ghost(); }
  // mid game: Blue to move, with the L of five able to cover three squares Yellow and Green could start from
  var MID = 'j300 r10h j69x r19g r21q j623 r28q s08f s03g m53o s07j j26t o255 u24p m36c t05n';
  var BLOCK_P = 11, BLOCK_CELL = 307;
  // near the end: Blue has only the single square left, and Yellow, Red and Green are out
  var END = 'r000 j00h j69x j29g j21q r31i r28q s08e s02w s02j s07j r36s m34m t03l u25u q26b t35o u32e l63p m482 u26q o10n t12n l46o o08g m21p o274 t44i l13w l30v m64x n7a4 q093 k127 n79s u08j k002 p10r p06h k0ar n250 f10a g2ae i140 p16v d31x f64b g23i c11o b05s b177 d131 b15u a04y a026 p21z f447 c15j o208 g05x f30b i360 c13n h07m b03e e08s a036 d38o e03r';

  Kit.demoScript({
    intro: 'Here’s how a piece goes down corner to corner, how a piece can block another color, and how the game is counted.',
    beats: 14,
    end: 'Start in your corner, touch your own color only at the corners, block where you can, and keep the single square for last.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      T.start({ mode: 'cpu', players: [{ name: me, cpu: false }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: true, level: 'normal' }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play Blue and Red, and ' + them + ' plays Yellow and Green. Blue starts in the top left corner. Fit as many of your 21 pieces on the board as you can.', { at: '.frame' });
      await D.you(piece(16), 'Your turn. Tap the V in your tray to pick it up.', { avoid: '.tray', until: function () { return T.sel().p === 16; } });
      await D.say('The V lies on the board where it fits. Your first piece covers your corner square, and the white edge means it fits there.', { at: ghost, avoid: '.tray' });
      await D.you(btn(/Place/), 'Tap Place to put it down.', { until: function () { return S().n > 0; } });
      await D.wait(function () { return S().n >= 2; }, 6000);
      await D.wait(700);
      await D.set(function () { T.set(MID); });
      await D.say('Later on, every new blue piece has to touch a blue piece corner to corner, never along a side. The small diamonds show every square where Blue can start one.', { at: '.frame' });
      await D.you(piece(BLOCK_P), 'Tap the L of five to pick it up.', { avoid: '.tray', until: function () { return T.sel().p === BLOCK_P; } });
      await D.tap(btn(/Turn/), { say: 'The Turn button turns the piece a quarter at a time, and Flip turns it over.', after: 900 });
      await D.you(cell(BLOCK_CELL), 'Tap this square to move the piece there.', { until: function () { return T.sel().a >= 0 && T.sel().ok && S().b[BLOCK_CELL] === 0 && T.C.cellsOf(T.C.enc(T.sel().p, T.sel().o, T.sel().a)).indexOf(BLOCK_CELL) >= 0; } });
      await D.you(btn(/Place/), 'The gold sparks show the blue corners it touches. Tap Place.', { until: function () { return S().n > 16; } });
      await D.wait(1300);
      await D.say('That L covered squares where Yellow and Green could have started a piece. Other colors may touch yours along a side, so a piece across their corners blocks them.', { at: '.frame' });
      await D.set(function () { T.set(END); });
      await D.say('Near the end, Yellow, Red and Green have no piece that fits anywhere, so they are out. Blue has one piece left: the single square.', { at: '.plates' });
      await D.you(piece(0), 'Tap the single square.', { avoid: '.tray', until: function () { return T.sel().p === 0; } });
      await D.you(btn(/Place/), 'Put it down with Place.', { until: function () { return S().over; } });
      await D.wait(function () { return document.querySelector('.k-win h2'); }, 16000);
      await D.wait(700);
      await D.say('Each color loses a point for every square left over. Blue placed all 21, the single square last, for 20 bonus points, so you win.', { at: '.k-win .rank', pos: 'above' });
    }
  });
})();
