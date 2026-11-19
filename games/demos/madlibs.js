// Mad Libs' demo (demo.js; CLAUDE.md, Demos): The Camping Trip. The demo writes the first word on the Kit keyboard and taps
// an idea for the second, skips ahead, you write a body noise yourself, and the finished story types itself out.
(function () {
  'use strict';
  var X = window.__ml;
  function S() { return X.state(); }
  var me = 'You';
  // the words the demo fills in while it skips ahead, by the blank's name in the story
  var FILL = { NUMBER: '12', ADJ1: 'sparkly', CREATURE: 'moose', NOISE2: 'hiccup', FOOD: 'spaghetti', BODYPART: 'elbow', ANIMALSOUND: 'Moo',
    WEATHER: 'snow', GOOEY: 'peanut butter', EXCL: 'Holy guacamole', ADV: 'sleepily', GAME: 'checkers' };
  function story() { return X.stories.filter(function (s) { return s.id === 'camping'; })[0]; }
  function box() { return document.querySelector('.wline input'); }
  function key(ch) {
    var l = document.querySelectorAll('.k-osk .k-osk-k');
    for (var i = 0; i < l.length; i++) if (l[i].dataset.ch != null && l[i].dataset.ch.toLowerCase() === ch.toLowerCase()) return l[i];
    return null;
  }
  function oskOn() { return !!(window.KitOsk && KitOsk.on()); }
  // typing a word: on the Kit keyboard key by key, or (a desktop's own keyboard) a letter at a time into the box
  async function type(D, word) {
    for (var i = 0; i < word.length; i++) {
      if (oskOn() && key(word[i])) await D.tap(key(word[i]), { after: 70 });
      else { var b = box(); if (!b) return; b.value += word[i]; b.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: word[i] })); await D.wait(160); }
    }
  }
  // on to the next blank: the keyboard's own Next (or Done) key, which keeps the keyboard up; the pad's button without it
  function next(D) { return D.tap(oskOn() ? '.k-osk .k-osk-a-enter' : '.fillacts .btn-primary'); }
  function shelf(title) { return function () { return [].filter.call(document.querySelectorAll('.shelf .st'), function (b) { var t = b.querySelector('b'); return t && t.textContent === title; })[0]; }; }

  Kit.demoScript({
    intro: 'Here’s how a story gets made. You’ll write one of the words yourself.',
    beats: 10,
    end: 'Fill in the words without seeing the story, then read it out loud. The sillier the words, the better.',
    start: function () {
      me = (localStorage.getItem('my_name') || '').trim() || 'You';
      X.begin([{ name: me, color: Kit.color(0) }], true);
    },
    steps: async function (D) {
      await D.say('Pick a story from the shelf, or tap Surprise me for one you haven’t played.', { at: '.pick .btn-primary' });
      await D.tap(shelf('The Camping Trip'));
      await D.wait(600);
      await D.say('The pad asks for one word at a time, but you don’t get to see the story yet. That’s the fun part!', { at: '.wtype' });
      await D.say('This blank wants a person’s name. Anyone at all works.', { at: '.wline', wait: 2600 });
      await D.set(function () { var b = box(); if (b) b.focus({ preventScroll: true }); });
      await D.wait(400);
      await type(D, 'Grandpa');
      await D.wait(300);
      await next(D);
      await D.wait(function () { return S().i === 1; }, 3000);
      await D.wait(500);
      await D.say('Not sure what a word type means? The note under it explains, and the ideas are words you can tap.', { at: '.ex' });
      await D.tap('.ex button');
      await D.wait(300);
      await next(D);
      await D.wait(function () { return S().i === 2; }, 3000);
      await D.set(function () {
        var st = story(), s = S();
        st.b.forEach(function (b, i) { if (FILL[b[0]] != null) s.words[i] = FILL[b[0]]; });
        s.i = st.b.length - 2; s.phase = 'fill';
        X.render();
      });
      await D.say('Now we skip ahead to the last two blanks.', { pos: 'center', ring: false, wait: 2200 });
      await D.wait(300);
      await D.you('.wline', 'Write a body noise on the keyboard, like a burp or a sneeze, and then tap Next.', {
        allow: ['.wline input', '.k-osk .k-osk-k', '.fillacts .btn-primary', '.ex button'], avoid: ['.k-osk'],
        until: function () { return S().i >= story().b.length - 1; },
        autoTap: function () {
          var b = box(); if (!b) return null;
          if (document.activeElement !== b) { b.focus(); return b; }
          var w = 'burp';
          // (a computer's own keyboard: no screen keys to press, so the word goes in and Next is pressed)
          if (!oskOn()) { if (b.value !== w) { b.value = w; b.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: w })); } return document.querySelector('.fillacts .btn-primary'); }
          return b.value.length < w.length ? key(w[b.value.length]) : document.querySelector('.k-osk .k-osk-a-enter');
        }
      });
      await D.wait(500);
      await D.say('The last blank is a feeling. Tap one of the ideas, and then Done to reveal the story.', { at: '.ex', wait: 2600 });
      await D.tap('.ex button');
      await D.wait(300);
      await next(D);
      await D.wait(function () { return S().phase === 'reveal'; }, 3000);
      await D.wait(900);
      await D.say('The story types itself out, with your words in color. Read it out loud to everyone!', { at: '.pad h2', place: 'bottom', wait: 6500 });
      await D.tap('.skipbtn', { say: 'Skip shows the rest of it at once.' });
      await D.wait(1400);
      await D.say('Tap Read aloud and the phone reads it to the table. Favorite keeps a story you love.', { at: '.revacts' });
    }
  });
})();
