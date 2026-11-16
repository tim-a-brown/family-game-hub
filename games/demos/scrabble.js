// Scrabble's demo (demo.js; CLAUDE.md, Demos): the first move of a game against the computer. HOME goes across the star,
// one tile dragged and two tapped into place; you place the E and play it for 18; Bender answers with a word of its own.
(function () {
  'use strict';
  var X = window.__scrabble;
  function S() { return X.state(); }
  function tile(l) {
    return function () {
      var t = S().players[0].rack.filter(function (x) { return x.l === l; })[0];
      return t ? document.querySelector('.sc-rack .tl[data-id="' + t.id + '"]') : null;
    };
  }
  function sq(i) { return function () { return document.querySelector('.sc-board .sq[data-i="' + i + '"], .sq[data-i="' + i + '"]'); }; }
  function placed() { return X.pend().length; }
  function lastWord() { return [].slice.call(document.querySelectorAll('.sq .tl.last')).map(function (n) { return n.closest('.sq'); }); }

  Kit.demoScript({
    intro: 'Here’s how a game of Scrabble starts. You’ll finish the first word and play it yourself.',
    beats: 11,
    end: 'Make words from your seven tiles that join the words on the board, and aim for the bonus squares.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      return X.start({ mode: 'cpu', level: 'normal', players: [{ name: me, cpu: false, score: 0, rack: [] }, { name: 'Bender', cpu: true, level: 'normal', score: 0, rack: [] }] }, 'HOMEART');
    },
    steps: async function (D) {
      await D.say('These are your seven tiles. The small number on each one is what that letter scores.', { at: '.sc-rack' });
      await D.say('The first word has to cover the star in the middle. The star doubles the score of that word.', { at: sq(112) });
      await D.say('Drag a tile from your rack onto a square of the board.', { at: tile('H'), wait: 2400 });
      await D.drag(tile('H'), sq(110), { after: 500 });
      await D.say('You can also tap a tile, then tap the square it goes on.', { at: tile('O'), wait: 2600 });
      await D.tap(tile('O'), { after: 250 });
      await D.tap(sq(111), { after: 400 });
      await D.tap(tile('M'), { after: 250 });
      await D.tap(sq(112), { after: 500 });
      await D.you(tile('E'), 'Tap your E, then the square after the M, to spell HOME.', {
        allow: [tile('E'), sq(113)], until: function () { return placed() >= 4; },
        autoTap: function () { return document.querySelector('.sc-rack .tl.sel') ? sq(113)() : tile('E')(); }
      });
      await D.wait(500);
      await D.say('HOME is a word, so the Play button shows its score. H, O, M and E add up to 9, and the star doubles it to 18.', { at: '.sc-acts .play' });
      await D.you('.sc-acts .play', 'Tap Play 18.', { until: function () { return S().players[0].score > 0; } });
      await D.wait(function () { return S().turn === 1; }, 6000);
      await D.say('You draw new tiles to fill your rack back up to seven. Now it’s Bender’s turn.', { at: '.sc-rack', wait: 3000 });
      await D.wait(function () { var s = S(); return s.turn === 0 && X.ready(); }, 15000);
      await D.wait(1600);
      await D.say('Bender made a word that joins yours. Every new word has to connect to the tiles already on the board.', { at: lastWord });
      await D.say('Squares marked Double Letter or Triple Letter multiply one tile. Double Word and Triple Word squares multiply the whole word.', { pos: 'top' });
      await D.say('When the tiles run out, the player with the highest score wins.', { at: '.sc-pls' });
    }
  });
})();
