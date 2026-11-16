// Goblin Defenders' demo (demo.js; CLAUDE.md, Demos): the first map, Lily Pond. A Crossbow goes up beside the road,
// you build a Bomb Tower yourself, the skull sends the first wave, the towers stop it and earn gold, and the Crossbow is
// upgraded. Played sideways on a phone, as the game is.
(function () {
  'use strict';
  var GG = window.__gd, C = GG.core, T = C.T;
  function S() { return GG.state(); }
  function cv() { return document.getElementById('cv'); }
  // a spot on the canvas, in its own CSS pixels (the buttons and the grid are drawn, not elements)
  function spot(fn) {
    return function () {
      var c = cv(); if (!c || !c.isConnected) return null;
      var b = fn(); if (!b) return null;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () { var r = c.getBoundingClientRect(), q = fn() || b; return { left: r.left + q.x - q.r, top: r.top + q.y - q.r, right: r.left + q.x + q.r, bottom: r.top + q.y + q.r, width: q.r * 2, height: q.r * 2 }; },
        contains: function (t) { return t === c; }, dispatchEvent: function (e) { return c.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  function bar(k) { return spot(function () { var l = GG.btns().bar; for (var i = 0; i < l.length; i++) if (l[i].k === k) return l[i]; return null; }); }
  var skull = spot(function () { return GG.btns().wave[0] || null; });
  var upgradeBtn = spot(function () { var l = GG.btns().menu; for (var i = 0; i < l.length; i++) if (l[i].act === 'upgrade') return l[i]; return null; });
  function cell(i, j, n) { return spot(function () { var L = GG.L(); return { x: L.ox + (i + .5) * L.C, y: L.oy + (j + .5) * L.C, r: L.C * (n || .5) }; }); }
  var whole = function () { return cv(); };
  // the best squares for a tower: grass next to the road, with the most road in reach, nearer the village first
  function spots() {
    var s = S(), out = [];
    for (var j = 0; j < window.GD.ROWS; j++) for (var i = 0; i < window.GD.COLS; i++) {
      if (!C.inside(i, j) || !C.canBuild(s, i, j)) continue;
      var n = 0, near = 9;
      for (var b = j - 2; b <= j + 2; b++) for (var a = i - 2; a <= i + 2; a++) {
        if (!C.inside(a, b)) continue; var t = s.cells[C.idx(a, b)];
        if (t === T.ROAD || t === T.BRIDGE) { var d = Math.hypot(a - i, b - j); if (d <= 2.1) n++; near = Math.min(near, d); }
      }
      if (near <= 1.01) out.push({ i: i, j: j, n: n });
    }
    out.sort(function (a, b) { return b.n - a.n; });
    return out;
  }
  function towers() { return S().towers.length; }

  Kit.demoScript({
    intro: 'Here’s how to build towers and send a wave, and then you build one yourself.',
    beats: 9,
    end: 'Build towers beside the road, send the waves, and upgrade the towers that do the most work. Keep the enemy out of the village.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      GG.start(0, me);
    },
    steps: async function (D) {
      // (a phone held upright shows the kit's cover asking to turn it: the demo waits for the turn)
      if (Kit.orientOk && !Kit.orientOk()) { await D.wait(function () { return Kit.orientOk(); }, 600000); GG.pause(false); await D.wait(800); }
      await D.wait(1800);
      var best = spots(), a = best[0], b = best.filter(function (q) { return Math.abs(q.i - a.i) + Math.abs(q.j - a.j) >= 2; })[0] || best[1];
      await D.say('The enemy marches along this road toward the goblin village. Build towers beside it to stop them.', { at: whole, pos: 'top' });
      await D.say('To build, tap a tower in the bar, then tap a square beside the road. The Crossbow costs 10 gold.', { at: bar('crossbow'), pad: 4, wait: 3800 });
      await D.tap(bar('crossbow'), { after: 400 });
      await D.tap(cell(a.i, a.j), { after: 600 });
      await D.wait(function () { return towers() >= 1; }, 3000);
      GG.place(null);
      // your turn: a Bomb Tower
      await D.you(bar('bomb'), 'Your turn. Tap the Bomb Tower in the bar. It costs 15 gold.', { allow: whole, until: function () { return GG.placing() === 'bomb'; } });
      await D.you(cell(b.i, b.j, .6), 'Now tap a square beside the road to build it there.', { allow: whole, until: function () { return towers() >= 2; } });
      await D.wait(500);
      GG.place(null);
      await D.say('Your Bomb Tower throws bombs that blast a whole crowd at once.', { at: cell(b.i, b.j, .9), pad: 4, wait: 2600 });
      await D.say('When you’re ready, tap the skull by the entrance to send the first wave.', { at: skull, pad: 6, wait: 2800 });
      await D.tap(skull, { after: 300 });
      await D.wait(function () { return S().kills >= 2; }, 45000);
      await D.say('Each enemy your towers stop earns gold to spend on more towers.', { at: whole, pos: 'top', wait: false });
      await D.wait(function () { return S().gold >= 15; }, 20000);
      await D.wait(1500);
      await D.say('Tap a tower to see how far it reaches. The green arrow upgrades it, and the coins sell it back.', { at: cell(a.i, a.j, .9), pad: 4, wait: 3600 });
      await D.tap(cell(a.i, a.j), { after: 700 });
      if (GG.btns().menu.some(function (m) { return m.act === 'upgrade'; })) await D.tap(upgradeBtn, { after: 900 });
      await D.wait(1500);
      await D.say('Every enemy that reaches the village costs a heart. Hold out through every wave to save it.', { at: whole, pos: 'top' });
    }
  });
})();
