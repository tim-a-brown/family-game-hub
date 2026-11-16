// Mind Meld's demo (demo.js; CLAUDE.md, Demos): one card against three computer players, "Name 2 things you put on a hot
// dog". The demo writes Ketchup on the Kit keyboard and you write the second answer yourself; then the slips are turned
// over, Chili and Chili sauce are put together by hand, and the points are counted.
(function () {
  'use strict';
  var X = window.__ta;
  function G() { return X.state(); }
  var me = 'You', BOTS = ['Bender', 'EVE', 'Johnny 5'];
  var ANS = [null, ['Ketchup', 'Mustard'], ['Ketchup', 'Chili'], ['Ketchup', 'Chili sauce']];
  function inp(k) { return function () { return document.querySelectorAll('.pad input')[k] || null; }; }
  function key(ch) {
    var l = document.querySelectorAll('.k-osk .k-osk-k');
    for (var i = 0; i < l.length; i++) if (l[i].dataset.ch != null && l[i].dataset.ch.toLowerCase() === ch.toLowerCase()) return l[i];
    return null;
  }
  function oskOn() { return !!(window.KitOsk && KitOsk.on()); }
  // typing a word: on the Kit keyboard key by key, or (a desktop's own keyboard) a letter at a time into the box
  async function type(D, box, word) {
    for (var i = 0; i < word.length; i++) {
      if (oskOn() && key(word[i])) await D.tap(key(word[i]), { after: 70 });
      else { var b = box(); if (!b) return; b.value += word[i]; b.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: word[i] })); await D.wait(160); }
    }
  }
  function stack(id) { return function () { return document.querySelector('.stk[data-g="' + id + '"]'); }; }
  function slip(k) { return function () { return document.querySelector('.bowl .fs[data-p="' + k + '"]'); }; }
  function drop(D, k) { return D.set(function () { G().ans[k] = ANS[k].slice(); X.kick(); }); }

  Kit.demoScript({
    intro: 'Here’s how a card goes against three computer players. You’ll write an answer on the keyboard yourself.',
    beats: 10,
    end: 'Write what you think everyone else will write. Every answer that matches someone else’s scores.',
    start: function () {
      me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.local({ mode: 'cpu', rounds: 8, timer: 0, players: [{ name: me, color: Kit.color(0) }].concat(BOTS.map(function (n, i) { return { name: n, color: Kit.color(i + 1), cpu: true }; })) });
      var g = G(), pi = 1;   // "Name 2 things you put on a hot dog"
      g.deck[0] = pi; g.qs[0] = X.data[pi].q; g.pi = pi;
      g.cpuAt = g.players.map(function () { return Date.now() + 864e5; });   // (the computer players' slips go in when the demo says)
      X.ui.sig = ''; X.kick();
    },
    steps: async function (D) {
      await D.say('Each card asks for answers. This one says to name two things you put on a hot dog, and the two slips on the card show it wants two.', { at: '.pc' });
      await D.say('Everyone writes on their own paper in secret. Each answer scores a point for every other player who wrote it too.', { at: '.pad' });
      await drop(D, 1);
      await D.say('Bender has folded his paper into the bowl already.', { at: slip(1), wait: 2400 });
      await drop(D, 2);
      await D.tap(inp(0), { say: 'Most people put ketchup on a hot dog, so that’s a good first answer.' });
      await D.set(function () { var b = inp(0)(); if (b) b.focus({ preventScroll: true }); });
      await D.wait(500);
      await type(D, inp(0), 'Ketchup');
      await D.wait(300);
      if (oskOn()) await D.tap('.k-osk .k-osk-a-enter');
      else await D.set(function () { var b = inp(1)(); if (b) b.focus(); });
      await D.wait(400);
      await drop(D, 3);
      await D.you(inp(1), 'Now write a second thing you put on a hot dog, and tap Done to fold your paper into the bowl.', {
        allow: [inp(1), '.k-osk .k-osk-k', '.pad .fold'], avoid: ['.k-osk'],
        until: function () { return !!G().ans[0]; },
        autoTap: function () {
          var b = inp(1)(); if (!b) return null;
          if (document.activeElement !== b) { b.focus(); return b; }
          var w = 'Mustard'; return b.value.length < w.length ? key(w[b.value.length]) : document.querySelector('.k-osk .k-osk-a-enter');
        }
      });
      await D.wait(function () { return G().phase === 'reveal'; }, 8000);
      await D.wait(1600);
      await D.say('The slips are turned over, and answers that are the same stack up together.', { at: '.stx' });
      await D.say('Chili and Chili sauce mean the same thing, but the game can’t always tell. Tap one stack and then the other to put them together.', { at: function () { return [stack('chilisauce')(), stack('chili')()].filter(Boolean); } });
      await D.tap(stack('chilisauce'), { after: 500 });
      await D.tap(stack('chili'), { after: 900 });
      await D.tap('.acts .btn-primary', { say: 'Then count the points.' });
      await D.wait(2400);
      var pts = G().pts || [0];
      await D.say('Everyone wrote Ketchup, so each of you scores 3 for it. In all, you scored ' + pts[0] + (pts[0] === 1 ? ' point' : ' points') + ' on this card.', { at: '.sb' });
      await D.say('An answer nobody else wrote scores nothing. After the last card, the most points wins.', { at: '.stx' });
    }
  });
})();
