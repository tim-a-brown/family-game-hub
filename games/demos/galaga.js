// Galaga's demo (demo.js; CLAUDE.md, Demos): the arcade's own program, started with five fighters so a demo never
// reaches a game over. Start drops in a coin, the stick slides the fighter, Fire shoots into the swarm as it flies in,
// and then you shoot one down yourself. The game is held still while a caption speaks (window.__gg.freeze).
(function () {
  'use strict';
  var A = window.__gg, M = A.core.M;
  function hits() { return M[0x9844] | M[0x9845] << 8; }
  function shots() { return M[0x9846] | M[0x9847] << 8; }
  function inGame() { return A.core.state() === 3; }
  var screen = function () { return document.getElementById('scr'); };
  function freeze(on) { A.freeze(on); }
  function pad(d) { return function () { return document.querySelector('#pad i.' + d); }; }
  // the finger rests on the stick while the fighter slides
  async function slide(D, d, ms) {
    await D.tap(pad(d), { ghost: true, after: 0 });
    A.move(d === 'l', d === 'r');
    await D.wait(ms);
    A.move(false, false);
  }
  async function fire(D, n, gap) { for (var i = 0; i < n; i++) await D.tap('#fbtn', { after: gap || 120 }); }

  Kit.demoScript({
    intro: 'Here’s how to fly and fire, and then you shoot down part of the swarm yourself.',
    beats: 8,
    end: 'Slide with the stick, tap Fire to shoot, and clear the whole swarm to finish each stage.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      A.start({ who: me, lives: 5 });
    },
    steps: async function (D) {
      await D.say('This is the 1981 arcade game, just as it ran in the cabinet. Press Start to drop in a coin.', { at: '#fbtn', wait: 3800 });
      await D.tap('#fbtn', { after: 300 });
      await D.wait(function () { return inGame(); }, 6000);
      await D.wait(3600);
      await D.say('The Galaga swarm flies in, takes its places in a formation, and then dives at your fighter.', { at: screen, pos: 'below', wait: false });
      await D.wait(3400);
      freeze(true);
      await D.say('The stick slides your fighter left and right along the bottom of the screen.', { at: '#pad', wait: 2600 });
      freeze(false);
      await slide(D, 'l', 700);
      await slide(D, 'r', 1100);
      freeze(true);
      await D.say('Tap Fire to shoot. Only two of your shots can be in the air at once, so make them count.', { at: '#fbtn', wait: 3400 });
      freeze(false);
      await fire(D, 6, 260);
      await D.wait(600);
      // your turn: keep firing until something goes down
      var h0 = hits();
      await D.you('#fbtn', 'Your turn. Tap Fire to shoot down part of the swarm.', { avoid: [screen], until: function () { return hits() > h0; } });
      await D.wait(700);
      freeze(true);
      await D.say('A hit! Bees and butterflies are worth more when you catch them diving. A green Boss Galaga takes two hits.', { at: screen, pos: 'below' });
      await D.say('Watch out for a boss’s blue tractor beam: it captures your fighter. Shoot that boss as it dives to win the fighter back, and the two fly side by side.', { at: screen, pos: 'below' });
    }
  });
})();
