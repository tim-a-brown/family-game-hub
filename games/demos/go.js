// Go's demo (demo.js; CLAUDE.md, Demos): a 9×9 game against Jamie. Placing a stone (look, then place), liberties, and then,
// later in the game, you capture five white stones by filling their last liberty.
(function () {
  'use strict';
  var G = window.__go, N = 9;
  function S() { return G.state(); }
  function idx(r, c) { return r * N + c; }
  // a tappable spot over a point of the board (the board itself finds the nearest point to a tap)
  function pt(r, c) {
    return function () {
      var bd = document.querySelector('.goban .lay.hl'); if (!bd) return null;
      var i = idx(r, c), n = bd.querySelector('.dm-spot[data-i="' + i + '"]');
      if (!n) {
        var u = 100 / (N + 0.5), s = 0.96;
        n = document.createElement('div'); n.className = 'dm-spot'; n.setAttribute('data-i', i);
        n.style.cssText = 'position:absolute;border-radius:50%;pointer-events:auto;left:' + (0.75 + c - s / 2) * u + '%;top:' + (0.75 + r - s / 2) * u + '%;width:' + s * u + '%;height:' + s * u + '%;';
        bd.appendChild(n);
      }
      return n;
    };
  }
  function pts(l) { return function () { return l.map(function (x) { return pt(x[0], x[1])(); }); }; }
  function stone(r, c) { return function () { return document.querySelector('.goban .stones .st[data-i="' + idx(r, c) + '"]') || pt(r, c)(); }; }
  function stones(l) { return function () { return l.map(function (x) { return stone(x[0], x[1])(); }); }; }
  function moves() { var s = S(); return s ? s.mv : 0; }
  // look at a point, then place the stone there
  async function play(D, r, c, after) {
    var n = moves();
    await D.tap(pt(r, c), { after: 500 });
    await D.tap(pt(r, c), { after: 200 });
    await D.wait(function () { return moves() > n; }, 3000);
    await D.wait(after != null ? after : 900);
  }
  // later in the game: five white stones near the top have one liberty left
  var LATE = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0, 1, 2, 0, 2, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0,
    0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 0, 2, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  var GROUP = [[2, 3], [2, 4], [2, 5], [3, 3], [3, 5]];

  Kit.demoScript({
    intro: 'Here’s how stones are placed and captured in Go, and then you capture five stones yourself.',
    beats: 10,
    end: 'Take turns placing stones, surround empty space, and fill the last liberty of a group to capture it.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      G.start({ mode: '2p', n: N, players: [{ name: me, cpu: false, color: 1 }, { name: me === 'Jamie' ? 'Pat' : 'Jamie', cpu: false, color: 2 }] });
    },
    steps: async function (D) {
      var them = S().players[1].name;
      await D.say('You play black, and black goes first. Stones go on the points where the lines cross, not inside the squares.', { at: '.goban' });
      await D.say('Tap a point to see your stone there, then tap the same point again to place it.', { at: pt(4, 4) });
      await play(D, 4, 4);
      await D.say('The empty points right next to a stone are its liberties. This stone has four.', { at: pts([[3, 4], [4, 3], [4, 5], [5, 4]]) });
      await play(D, 4, 6, 700);
      await D.say('Then ' + them + ' places a white stone, and you take turns. Stones never move once they are placed.', { at: stone(4, 6) });
      await D.set(function () { G.set(LATE, 1, { mv: 24, caps: [0, 0, 0] }); });
      await D.say('Now we skip ahead. The goal is to surround more of the board than ' + them + '.', { pos: 'center', ring: false, wait: 2600 });
      await D.say('Stones that touch along the lines join into a group and share their liberties. These five white stones have only one liberty left, so they glow red.', { at: stones(GROUP) });
      await D.you(pt(3, 4), 'Your turn. Fill that last liberty: tap the point in the middle of them, then tap it again.', {
        until: function () { return S().b[idx(3, 4)] === 1; }
      });
      await D.wait(1500);
      await D.say('You surrounded the group, so all five white stones are captured and come off the board.', { at: stones([[2, 3], [2, 4], [2, 5], [3, 3], [3, 4], [3, 5]]) });
      await D.say('They go in your bowl as prisoners.', { at: '.pbar.bot .pris' });
      await D.say('When you both tap Pass, one after the other, the game ends. Your stones and the empty points you surround are counted, and the bigger score wins.', { at: function () { return [].slice.call(document.querySelectorAll('.go-col .acts .btn')).filter(function (b) { return b.textContent.trim() === 'Pass'; })[0]; } });
    }
  });
})();
