// Tetris's demo (demo.js; CLAUDE.md, Demos): the stack has a gap down its right edge. A T block shows Rotate, the arrows
// and Drop, an O block is dragged into place on the board, and then you turn the long I block, slide it into the gap and
// drop it for a Tetris: four lines at once. The falling block waits in the air the whole time (window.__tet.float).
(function () {
  'use strict';
  var T = window.__tet;
  function S() { return T.get(); }
  function key(lab) { return function () { return document.querySelector('.ar-key[aria-label="' + lab + '"]'); }; }
  var ROT = key('Rotate'), LEFT = key('Move left'), RIGHT = key('Move right'), DROP = key('Hard drop');
  function keys() { return [ROT(), LEFT(), RIGHT(), DROP(), key('Soft drop')()].filter(Boolean); }
  // a cell of the well on the screen (the canvas has nothing inside it, so this stands in for one)
  function cell(x, y, w, h) {
    return function () {
      var cv = T.canvas(), a = T.at(x, y); if (!cv || !a) return null;
      w = w || 1; h = h || 1;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () { var q = T.at(x, y), l = q.x - q.c / 2, t = q.y - q.c / 2; return { left: l, top: t, right: l + q.c * w, bottom: t + q.c * h, width: q.c * w, height: q.c * h }; },
        contains: function (t) { return t === cv; }, dispatchEvent: function (e) { return cv.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  // the falling block, as a box round its cells
  function piece() {
    var s = S(), p = s && s.cur; if (!p) return null;
    var CELLS = { I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]] };
    var cs = p.r === 0 && CELLS[p.t] ? CELLS[p.t] : null;
    if (!cs) return cell(p.x + (p.t === 'I' ? 2 : 1), p.y - 4, 1, p.t === 'I' ? 4 : 3)();
    var x0 = 9, x1 = 0, y0 = 99, y1 = 0;
    cs.forEach(function (c) { x0 = Math.min(x0, p.x + c[0]); x1 = Math.max(x1, p.x + c[0]); y0 = Math.min(y0, p.y + c[1]); y1 = Math.max(y1, p.y + c[1]); });
    return cell(x0, y0 - 4, x1 - x0 + 1, y1 - y0 + 1)();
  }
  var STACK = ['ZZSSOOJJL.', 'ZSSLOOJTT.', 'IIIIJJLTO.', 'OOZZSSLLL.'];
  function waitPiece(t) { return function () { var s = S(); return s && s.phase === 'play' && s.cur && s.cur.t === t; }; }
  async function taps(D, k, n, gap) { for (var i = 0; i < n; i++) await D.tap(k, { after: gap || 200 }); }

  Kit.demoScript({
    intro: 'Here’s how to move and turn the falling blocks, and then you clear four lines at once.',
    beats: 9,
    end: 'Turn and slide each block so it fills a row. A full row clears, and four rows at once is a Tetris.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      T.start({ who: me });
      T.float(true);
      T.setRows(STACK);
      T.setQueue(['T', 'O', 'I', 'L', 'S']);
    },
    steps: async function (D) {
      await D.wait(waitPiece('T'), 6000);
      await D.say('Blocks fall into the well one at a time. Your job is to fill rows all the way across.', { at: cell(0, 16, 10, 4) });
      await D.say('Rotate turns the falling block. Each tap turns it a quarter of the way round.', { at: ROT, wait: 2600 });
      await taps(D, ROT, 4, 260);
      await D.say('The arrows slide it left and right.', { at: LEFT, wait: 1800 });
      await taps(D, LEFT, 3, 220);
      await D.say('The outline under it shows where it will land. Drop sends it straight down.', { at: DROP, wait: 2800 });
      await D.tap(DROP, { after: 500 });
      await D.wait(waitPiece('O'), 3000);
      await D.say('You can also play right on the board: drag a block to slide it, tap to turn it, and flick down to drop it.', { at: piece, pad: 10, wait: false });
      await D.wait(1600);
      var a = S().cur;
      await D.drag(cell(a.x + 1, a.y - 4), cell(a.x - 1, a.y - 4), { after: 300 });
      await D.wait(1200);
      await D.tap(DROP, { after: 500 });
      await D.wait(waitPiece('I'), 3000);
      await D.say('The next blocks wait at the side, so you can plan ahead. Here comes the long I block.', { at: piece, pad: 10 });
      // your turn: stand the I block up, slide it into the gap down the right, and drop it (a miss gets another I block)
      for (var tries = 0; tries < 3 && S().lines < 4; tries++) {
        var lines = S().lines, pcs = S().stats.pieces;
        await D.you(function () { return keys(); }, tries ? 'Try again. Turn the I block upright, slide it all the way right, and drop it.' : 'Your turn. Turn the I block upright, slide it into the gap on the right, and drop it to clear four lines.', {
          allow: keys, pos: 'above', avoid: [piece, cell(9, 15, 1, 5)],
          autoTap: function () { var p = S().cur; if (!p) return DROP(); if (p.r % 2 === 0) return ROT(); if (p.x < 7) return RIGHT(); return DROP(); },
          until: function () { var s = S(); return s.lines > lines || s.stats.pieces > pcs; }
        });
        await D.wait(900);
        if (S().lines < 4) {
          await D.set(function () { var e = []; for (var i = 0; i < 20; i++) e.push('..........'); T.setRows(e.concat(STACK)); T.setCur('I'); });
          await D.wait(300);
        }
      }
      await D.wait(600);
      await D.say('Tetris! Four lines at once scores the most points of any move.', { at: '.ar-hud', wait: 3200 });
      await D.say('Every ten lines, the level goes up and the blocks fall faster. The game ends when the stack reaches the top.', { at: cell(0, 0, 10, 20) });
    }
  });
})();
