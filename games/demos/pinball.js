// Pinball's demo (demo.js; CLAUDE.md, Demos): a game on Haunted Manor. The finger pulls the plunger and launches the
// ball, the table plays itself for a moment while the flippers and scoring are explained, then you work the flippers for
// a while; a ball that waits in the shooter lane during your turn is launched for you.
(function () {
  'use strict';
  var P = window.__pin;   // (the page's module script sets it, after this file has run: see start)
  function g() { return P.get() || {}; }
  function view() { return document.querySelector('.pb-view canvas') || document.querySelector('.pb-view'); }
  // a point on the plunger's close-up, `down` px below the knob's resting place
  function knob(down) {
    return function () {
      var p = P.plunger(), el = document.querySelector('.pb-plunger .grab') || document.querySelector('.pb-plunger'); if (!p || !el) return null;
      var x = p.rect[0] + p.rect[2] / 2, y = p.knobY + (down || 0);
      return { nodeType: 1, isConnected: true, tagName: 'DIV', getBoundingClientRect: function () { return { left: x - 3, top: y - 3, right: x + 3, bottom: y + 3, width: 6, height: 6 }; },
        contains: function (t) { return t === el || el.contains(t); }, dispatchEvent: function (e) { return el.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  function flippers() { return [document.querySelector('.pb-flipL'), document.querySelector('.pb-flipR')].filter(Boolean); }
  var flips = 0;
  window.addEventListener('pointerdown', function (e) { if (e.target && e.target.closest && e.target.closest('.pb-flip')) flips++; }, true);
  // (during your turn a ball waiting in the shooter lane goes up by itself)
  var keepGoing = 0;
  function keepLaunching(on) {
    clearInterval(keepGoing); keepGoing = 0;
    if (on) keepGoing = setInterval(function () { var s = g(); if (s.state === 'serve' || s.waitPlunge) P.launch(0.8); }, 1200);
  }

  // a phone held sideways shows the kit's Turn your phone upright cover over the table: the demo waits behind it
  // (and the game, paused when the phone turned, carries on)
  function upright(D) {
    if (!document.querySelector('.k-rotate')) return Promise.resolve();
    return D.wait(function () { return !document.querySelector('.k-rotate'); }, 1e7).then(function () { if (g().paused) P.resume(); return D.wait(600); });
  }

  Kit.demoScript({
    intro: 'Here’s how to launch the ball and work the flippers.',
    beats: 7,
    end: 'Pull the plunger to launch, hold the flipper buttons to keep the ball in play, and aim for the ramps and targets.',
    start: async function (D) {
      await D.wait(function () { return !!window.__pin; }, 10000);
      P = window.__pin;
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      P.begin('haunted', me);
      await D.wait(function () { return P.ready() && g().waitPlunge && P.plunger() && P.plunger().show; }, 15000);
    },
    steps: async function (D) {
      await upright(D);
      await D.wait(800);
      await D.say('Keep the ball in play and score as many points as you can. A game is three balls.', { at: view });
      await D.say('To launch, drag the plunger’s knob down and let go. The further you pull, the harder the shot.', { at: '.pb-plunger', pad: 4, wait: 2800 });
      var tr = (P.plunger() || {}).travel || 140;
      await D.drag(knob(0), [knob(tr * 0.3), knob(tr * 0.6), knob(tr * 0.85), knob(tr * 0.85)], { after: 300 });
      await D.wait(function () { return g().state === 'play' && !g().waitPlunge; }, 4000);
      P.auto(true, 1);
      await D.say('The big red buttons in the bottom corners work the flippers. Hold one to raise its flipper and hit the ball back up.', { at: flippers, pad: 6, wait: 4400 });
      await D.say('Ramps, bumpers and targets all score. Big shots made one after another score combo points.', { at: view, wait: 4200 });
      P.auto(false);
      await upright(D);
      var t0 = Date.now(), f0 = flips;
      keepLaunching(true);
      try {
        await D.you(flippers, 'Your turn. Hold the flipper buttons as the ball comes down to keep it in play.', {
          allow: function () { return flippers().concat([view()]); },
          autoTap: function () { P.auto(true, 1); return flippers()[0]; },
          until: function () { return flips > f0 && Date.now() - t0 > 9000; }
        });
      } finally { keepLaunching(false); }
      P.auto(true, 1);   // (the table plays on behind the last words)
      await D.say('Nudge bumps the table to save a ball, but bump it too often and the table tilts.', { at: '.pb-nudge', pad: 6 });
      await D.say('There are six tables to choose from, each with its own ramps, modes and multiball.', { at: view });
    }
  });
})();
