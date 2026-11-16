// Carmen Sandiego's demo (demo.js; CLAUDE.md, Demos): a Gumshoe's World case dealt from a set seed (the Stanley Cup,
// stolen from Montreal; the trail runs to Paris). You question a witness, the clues point to France, the flight goes to
// Paris, and the crime computer takes the thief's ring toward a warrant.
(function () {
  'use strict';
  var H = window.__cs;
  function C() { return H.C(); }
  function key(i) { return function () { return document.querySelectorAll('.cs-act .cs-list > .key')[i]; }; }
  function tab(i) { return function () { return document.querySelectorAll('.cs-act .cs-tabs .tab')[i]; }; }
  function flight(name) { return function () { return [].slice.call(document.querySelectorAll('.cs-act .cs-list > .key')).filter(function (b) { return b.querySelector('.lb') && b.querySelector('.lb').firstChild.textContent === name; })[0]; }; }
  function trait(name) { return function () { return [].slice.call(document.querySelectorAll('.cs-act .trait')).filter(function (t) { return t.firstChild.textContent === name; })[0]; }; }
  // bring a button into view inside the panel that scrolls (not the page: its other boxes clip what they hold)
  function reveal(n) {
    if (typeof n === 'function') n = n(); if (typeof n === 'string') n = document.querySelector(n);
    for (var p = n && n.parentElement; p; p = p.parentElement) {
      var o = getComputedStyle(p).overflowY;
      if (o !== 'auto' && o !== 'scroll') continue;
      var r = n.getBoundingClientRect(), q = p.getBoundingClientRect();
      if (r.bottom > q.bottom) p.scrollTop += r.bottom - q.bottom + 8; else if (r.top < q.top) p.scrollTop -= q.top - r.top + 8;
      return;
    }
  }
  function idle() { return !H.busy() && !document.querySelector('.cs-text .caret'); }

  Kit.demoScript({
    intro: 'Here’s how to question witnesses, follow the trail and get a warrant.',
    beats: 11,
    end: 'Question witnesses, fly where their clues point, and get a warrant before you reach the hideout. Keep an eye on the deadline.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Agent';
      H.start('world', me, 'demo-2');
    },
    steps: async function (D) {
      await D.say('A V.I.L.E. thief has stolen the Stanley Cup from Montreal. Your briefing says the arrest must be made by Sunday at 5 pm.', { at: '.cs-text' });
      await D.wait(idle, 6000);
      await D.tap('.cs-act .key.go', { after: 600 });
      await D.wait(idle, 6000);
      await D.say('Each city has three places where you can question witnesses. Every visit costs hours on the clock.', { at: '.cs-act .cs-list' });
      await D.you(key(0), 'Your turn. Tap the airport to ask the witness there.', {
        until: function () { var c = C().cities[C().at]; return !!(c && c.seen[0]); }
      });
      await D.wait(idle, 8000);
      await D.wait(400);
      await D.say('The witness says the thief asked about a flag with blue, white and red stripes. That’s the flag of France.', { at: '.cs-text' });
      await D.say('The witness also noticed her big ring. That’s a clue about the thief herself, so keep it in mind.', { at: '.cs-text' });
      await D.tap(key(1), { after: 300 });
      await D.wait(idle, 8000);
      await D.say('The Moulin Rouge is in Paris. Both clues point the same way.', { at: '.cs-text' });
      await D.tap(tab(1), { after: 500 });
      await D.wait(idle, 5000);
      await D.say('Depart shows the cities you can fly to from here. Longer flights cost more hours.', { at: '.cs-act .cs-list' });
      await D.tap(flight('Paris'), { after: 300 });
      await D.wait(function () { return C().at !== C().trail[0] && idle(); }, 12000);
      await D.say('You’ve landed in Paris, the next stop on the trail. The witnesses here will point the way on.', { at: '.cs-picw' });
      await D.tap(tab(2), { after: 500 });
      await D.wait(idle, 5000);
      await D.say('The crime computer keeps the traits you’ve heard about. The briefing said the thief is a woman.', { at: '.cs-act' });
      await D.set(function () { reveal(function () { var t = trait('Feature')(); return t && t.querySelector('.key'); }); });
      await D.tap(function () { var t = trait('Feature')(); return t && t.querySelector('.key'); }, { after: 400 });
      await D.tap(function () { var t = trait('Feature')(); return t && t.querySelector('.key'); }, { after: 600 });
      await D.say('With her ring added, only one V.I.L.E. member still matches: Lady Agatha Wayland.', { at: '.cs-ov .crt' });
      await D.set(function () { reveal('.cs-act .key.go'); });
      await D.tap('.cs-act .key.go', { after: 300 });
      await D.wait(1500);
      await D.say('That’s a warrant for her arrest. Find her in the hideout city before the deadline up here runs out.', { at: '.cs-time' });
    }
  });
})();
