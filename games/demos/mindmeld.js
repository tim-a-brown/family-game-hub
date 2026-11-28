// Hive Mind's demo (demo.js; CLAUDE.md, Demos; the page and its ids still say mindmeld): one round against three
// computer players. You choose the card, "Name 2 things you put on a hot dog", and the Queen Bee die rolls a 1. The demo
// writes Ketchup on the Kit keyboard and you write the second answer yourself; the slips are turned over, Chili and
// Chili sauce are put together by hand, the points are counted, and the hive shakes: the lowest bee drops a level and
// the highest climbs.
(function () {
  'use strict';
  var X = window.__ta;
  function G() { return X.state(); }
  var me = 'You', BOTS = ['Bender', 'EVE', 'Johnny 5'];
  var ANS = [null, ['Ketchup', 'Mustard'], ['Chili', 'Onions'], ['Ketchup', 'Chili sauce']];
  var HOTDOG = 1;   // "Name 2 things you put on a hot dog" among the house questions
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
  function bee(k) { return function () { return document.querySelector('.hive .bee[data-p="' + k + '"]'); }; }
  function drop(D, k) { return D.set(function () { G().ans[k] = ANS[k].slice(); X.kick(); }); }

  Kit.demoScript({
    intro: 'Here’s how a round of Hive Mind goes against three computer players. You’ll choose the card and write an answer yourself.',
    beats: 14,
    end: 'Write what you think the rest of the hive will write. The lowest scores drop down the hive, and a bee who drops out of it ends the game.',
    start: function () {
      me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.local({ mode: 'cpu', timer: 0, players: [{ name: me, color: Kit.color(0) }].concat(BOTS.map(function (n, i) { return { name: n, color: Kit.color(i + 1), cpu: true }; })) });
      var g = G(), hd = -1;
      for (var i = 0; i < X.data.length; i++) if (/hot dog/i.test(X.data[i].q)) { hd = i; break; }
      HOTDOG = hd < 0 ? HOTDOG : hd;
      // you ask first, and the hot dog card is the first one offered
      g.ask = 0; g.offer[0] = HOTDOG; if (g.offer[1] === HOTDOG) g.offer[1] = g.deck.shift();
      X.ui.forceRoll = 0;   // (the Queen Bee die comes up 1)
      X.ui.sig = ''; X.kick();
    },
    steps: async function (D) {
      await D.say('Every player is a bee in the hive, and every bee starts on the top level. Four of you are playing, so the hive has four levels and a door under the last one.', { at: '.hive' });
      await D.say('Players take turns asking. It’s your turn, so you choose which of these two cards everyone answers.', { at: '.offer' });
      await D.you('.offer .pc', 'Tap the hot dog card to ask it.', {
        until: function () { return G().phase === 'write'; },
        autoTap: function () { return document.querySelector('.offer .pc'); }
      });
      await D.set(function () { var g = G(); g.cpuAt = g.players.map(function () { return Date.now() + 864e5; }); X.ui.sig = ''; X.kick(); });   // (the die shows 1, and the computer players hand theirs in when the demo says)
      await D.wait(900);
      await D.say('The Queen Bee die rolled a 1. After this round, the one bee with the lowest score drops a level.', { at: '.qd' });
      await D.say('Everyone writes on their own paper in secret. Each answer scores a point for every player who wrote it, you included.', { at: '.pad' });
      await drop(D, 1);
      await D.say('Bender has handed his paper in already. The check on his bee shows it.', { at: bee(1), wait: 2600 });
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
      await D.you(inp(1), 'Now write a second thing you put on a hot dog, and tap Done to hand your paper in.', {
        allow: [inp(1), '.k-osk .k-osk-k', '.pad .fold'], avoid: ['.k-osk'],
        until: function () { return !!G().ans[0]; },
        autoTap: function () {
          var b = inp(1)(); if (!b) return null;
          if (document.activeElement !== b) { b.focus(); return b; }
          var w = 'Mustard';
          // (a computer's own keyboard: no screen keys to press, so the word goes in and the paper is handed in)
          if (!oskOn()) { if (b.value !== w) { b.value = w; b.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: w })); } return document.querySelector('.pad .fold'); } return b.value.length < w.length ? key(w[b.value.length]) : document.querySelector('.k-osk .k-osk-a-enter');
        }
      });
      await D.wait(function () { return G().phase === 'reveal'; }, 8000);
      await D.wait(1600);
      await D.say('The slips are turned over, and answers that are the same stack up together.', { at: '.stx' });
      await D.say('Chili and Chili sauce mean the same thing, but the game can’t always tell. Tap one stack and then the other to put them together.', { at: function () { return [stack('chilisauce')(), stack('chili')()].filter(Boolean); } });
      await D.tap(stack('chilisauce'), { after: 500 });
      await D.tap(stack('chili'), { after: 900 });
      await D.tap('.acts .btn-primary', { say: 'Then count the points.' });
      await D.wait(2000);
      var pts = G().pts || [0];
      await D.say('Three of you wrote Ketchup, so it scores 3 for each of you. In all, you scored ' + pts[0] + (pts[0] === 1 ? ' point' : ' points') + ' this round, and EVE scored ' + (pts[2] || 0) + '.', { at: bee(0) });
      await D.wait(function () { return X.ui.shook === String(G().round); }, 6000);
      await D.wait(1400);
      await D.say('Then the hive shakes. EVE had the lowest score, so EVE drops to level 2. The highest scores climb a level, but you’re already at the top.', { at: bee(2) });
      await D.say('A bee who has to drop from the last level goes out through the door. That ends the game, and everyone still in the hive wins.', { at: '.hive .door' });
    }
  });
})();
