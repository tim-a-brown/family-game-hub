// Shell Game's demo (demo.js; CLAUDE.md, Demos): the first level with the gold ring riding on the cup that hides the ball,
// and you pick the cup yourself; then a miss on level 2 costs a chance, and level 7 brings a fourth cup.
(function () {
  'use strict';
  var X = window.__shell;
  function S() { return X.state(); }
  function ballCup() { var b = document.querySelector('.sg-felt .sg-ball'); return b && b.closest('.sg-w'); }
  function otherCup() { var b = ballCup(), l = [].slice.call(document.querySelectorAll('.sg-felt .sg-w')); return l.filter(function (w) { return w !== b; })[0]; }
  function ball() { return document.querySelector('.sg-felt .sg-ball'); }
  function lifted() { var w = ballCup(); return w && w.querySelector('.sg-cup'); }
  function cups() { return document.querySelectorAll('.sg-felt .sg-w'); }
  function picking() { return X.picking() && !X.busy(); }
  function shown() { return !X.busy() && !X.picking(); }
  var go = '.sg-go', board = '.sg-board';

  Kit.demoScript({
    intro: 'Here’s how the Shell Game goes. You’ll find the ball yourself.',
    beats: 11,
    end: 'Watch the one cup with the ball under it, not the whole table, and tap it when the cups stop.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.start({ mode: 'solo', players: [{ name: me, color: Kit.color(0) }], options: { lives: 3, pace: 'classic' } });
    },
    steps: async function (D) {
      await D.say('One cup is lifted, so you can see the red ball under it.', { at: ball, pos: 'below', avoid: [lifted] });
      await D.say('When you tap Shuffle, the cup drops over the ball and the cups swap places.', { at: go });
      await D.tap(go, { after: 200 });
      // the ring rides on the cup with the ball, all through the shuffle
      await D.say('Keep your eye on this cup.', { at: ballCup, wait: false });
      await D.wait(picking, 12000);
      D.clear();
      await D.you('.sg-felt', 'Which cup has the ball? Tap it.', { allow: function () { return [].slice.call(cups()); }, autoTap: ballCup, until: shown, spot: false });
      await D.wait(500);
      if (S().runs[0].cleared) {
        await D.say('You found it, so you clear level 1. Every level adds more moves, and the cups get faster.', { at: board });
        await D.tap(go, { after: 200 });
        await D.say('Now watch what happens when you lose track of the ball.', { pos: 'top', ring: false, wait: false });
        await D.wait(picking, 15000);
        await D.tap(otherCup, { after: 300 });
        await D.wait(shown, 4000);
        await D.wait(400);
      } else D.ring(null);
      await D.say('Not that one! The ball was under the cup that’s lifted now.', { at: ball, pos: 'below', avoid: [lifted] });
      await D.say('A wrong cup costs one of your three chances, and you play the same level again.', { at: '.sg-lives' });
      // later in the run
      await D.set(function () { X.level(7); });
      await D.say('Now we skip ahead to level 7, where a fourth cup joins the table. Level 13 brings a fifth.', { at: board });
      await D.tap(go, { after: 900 });
      await D.tap(go, { after: 200 });
      await D.say('The cups move faster now, and sometimes two pairs swap at once.', { at: ballCup, wait: false });
      await D.wait(picking, 15000);
      await D.tap(ballCup, { after: 300 });
      await D.wait(shown, 4000);
      await D.say('Found it! Clear as many levels as you can before your three chances run out.', { at: board });
    }
  });
})();
