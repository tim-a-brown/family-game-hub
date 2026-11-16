// Riddles' demo (demo.js; CLAUDE.md, Demos): a round that opens on the river riddle. The demo guesses wrong, takes a hint
// for a star and answers RIVER on the Kit keyboard; then you answer the piano riddle yourself.
(function () {
  'use strict';
  var R = window.__rd;
  function S() { return R.get(); }
  function box() { return document.querySelector('.groove input'); }
  function key(ch) {
    var l = document.querySelectorAll('.k-osk .k-osk-k');
    for (var i = 0; i < l.length; i++) if (l[i].dataset.ch != null && l[i].dataset.ch.toLowerCase() === ch.toLowerCase()) return l[i];
    return null;
  }
  function oskOn() { return !!(window.KitOsk && KitOsk.on && KitOsk.on()); }
  // the keyboard goes down while the demo talks, so a caption is never under it (a phone held sideways has no room)
  async function unfocus(D) { var a = document.activeElement; if (a && a.blur && /INPUT/.test(a.tagName)) { a.blur(); await D.wait(450); } }
  function focus() { var b = box(); if (b && document.activeElement !== b) try { b.focus({ preventScroll: true }); } catch (e) {} }
  // typing an answer: on the Kit keyboard key by key, or (a desktop's own keyboard) a letter at a time into the box
  async function type(D, word) {
    focus(); await D.wait(450);
    for (var i = 0; i < word.length; i++) {
      if (oskOn() && key(word[i])) await D.tap(key(word[i]), { after: 70 });
      else { var b = box(); if (!b) return; b.value += word[i]; b.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: word[i] })); await D.wait(150); }
    }
  }
  function res(i) { return S().res[i]; }
  var hintBtn = function () { return document.querySelector('.acts .btn.stone:not([disabled])'); };

  Kit.demoScript({
    intro: 'Here’s how a round of riddles goes. You’ll answer one yourself.',
    beats: 10,
    end: 'Read the riddle, type what you think it is, and take a hint only if you need one. Fewer hints mean more points.',
    start: function () { R.round(['river', 'piano', 'towel', 'map', 'clock']); },
    steps: async function (D) {
      await D.wait(700);
      await unfocus(D);
      await D.say('Each riddle is carved on a stone tablet. Read it and type what you think it is.', { at: '.slab .q' });
      await D.say('A riddle starts with three stars. The more stars you keep, the more points it’s worth.', { at: '.slab .stars' });
      await type(D, 'snake');
      await D.tap('.groove .go', { after: 700 });
      await unfocus(D);
      await D.say('A snake doesn’t sleep in a bed, so that’s not it. Wrong guesses cost nothing, and you can try as often as you like.', { at: '.tried' });
      await D.tap(hintBtn, { say: 'Stuck? A hint helps, but it costs you a star.' });
      await D.wait(900);
      await unfocus(D);
      await D.say('“I’m full of water.” Something that runs, has a mouth and a bed, and is full of water…', { at: '.slips' });
      await type(D, 'river');
      await D.tap('.groove .go', { after: 400 });
      await D.wait(function () { return res(0).done; }, 3000);
      await D.wait(1600);
      await D.say('A river! Two stars on an easy riddle are worth 20 points.', { at: '.slab .carve' });
      await D.tap('.acts .next', { after: 300 });
      await D.wait(function () { return S().i === 1 && box(); }, 3000);
      await D.wait(800);
      await unfocus(D);
      await D.say('Here’s the next one: what has keys but can’t open a single lock?', { at: '.slab .q', wait: 3200 });
      var W = 'piano';
      await D.you('.groove', 'Your turn. Tap the box, type PIANO, then tap Answer.', {
        allow: ['.groove input', '.groove .go', '.k-osk .k-osk-k'],
        until: function () { return res(1).done; },
        autoTap: function () {
          var b = box(); if (!b) return null;
          if (document.activeElement !== b) { b.focus(); return b; }
          return b.value.length < W.length ? (oskOn() ? key(W[b.value.length]) : null) || document.querySelector('.groove .go') : document.querySelector('.groove .go');
        }
      });
      await D.wait(1800);
      await D.say('Solved with no hints, so all three stars count: 30 points. Solve riddles in a row to build your streak.', { at: '.rd-top .tally' });
    }
  });
})();
