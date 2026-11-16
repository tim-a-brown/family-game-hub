// Would You Rather's demo (demo.js; CLAUDE.md, Demos): a Quick vote at a table of four. Jamie, Pete and Sam take sides on
// "Be able to fly, or be able to breathe underwater", you take yours, and Reveal shows the split.
(function () {
  'use strict';
  var W = window.__wy;
  function S() { return W.state(); }
  var me = 'You', P = [];
  function chip(name, side) { return function () { return document.querySelector('.wcard.' + side + ' .vchip[aria-label="' + name + ' picks ' + side.toUpperCase() + '"]'); }; }
  function rows() { return document.querySelectorAll('.wcard .res .row1'); }
  function res(side) { return function () { return document.querySelector('.wcard.' + side + ' .res .row1'); }; }
  function card(side) { return function () { return document.querySelector('.wcard.' + side); }; }
  function names(side) { return S().votes.map(function (v, i) { return v === side ? P[i] : null; }).filter(Boolean); }
  var NUM = ['no', 'one', 'two', 'three', 'four'];
  // a name tapped onto a side, said with the card it's on ringed (so the caption keeps clear of the other names)
  async function vote(D, i, side, text) { await D.say(text, { at: card(side), wait: false }); await D.tap(chip(P[i], side), { after: 900 }); }
  function and(a) { return a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0] || ''; }

  Kit.demoScript({
    intro: 'Here’s how a question goes at a table of four. You’ll pick your side yourself.',
    beats: 12,
    end: 'Read both choices out loud, everyone picks a side, then reveal the split and talk it over.',
    start: function () {
      me = (localStorage.getItem('my_name') || '').trim() || 'You';
      P = [me].concat(['Jamie', 'Pete', 'Sam', 'Pat'].filter(function (n) { return n !== me; }).slice(0, 3));
      W.start({ mode: 'tally', players: P.map(function (n, i) { return { name: n, color: Kit.color(i) }; }), options: { rounds: 10, score: 'none' } });
      W.ask('Be able to fly');
    },
    steps: async function (D) {
      await D.say('Here’s the question: would you rather be able to fly, or be able to breathe underwater?', { at: '.cards' });
      await D.say('Everyone says their pick out loud. Then each name is tapped on the side that person chose.', { at: card('a') });
      await vote(D, 1, 'a', P[1] + ' would rather fly.');
      await vote(D, 2, 'b', P[2] + ' would rather breathe underwater.');
      await vote(D, 3, 'a', P[3] + ' would rather fly too.');
      await D.you(function () { return [chip(me, 'a')(), chip(me, 'b')()]; }, 'Your turn. Tap your name on the side you would pick.', {
        allow: [chip(me, 'a'), chip(me, 'b')], autoTap: chip(me, 'b'), until: function () { return !!S().votes[0]; }
      });
      await D.wait(400);
      await D.say('With everyone in, the button says Reveal. Tap it to see how the table voted.', { at: '.acts .btn-primary', wait: 2600 });
      await D.tap('.acts .btn-primary');
      await D.wait(function () { return S().phase === 'reveal'; }, 3000);
      await D.wait(1900);
      var a = names('a'), b = names('b');
      if (a.length === b.length) await D.say('It’s a split decision, ' + NUM[a.length] + ' and ' + NUM[b.length] + '. ' + and(a) + ' would rather fly, and ' + and(b) + ' would rather breathe underwater. Time to argue about it!', { at: rows });
      else {
        var win = a.length > b.length ? a : b, lose = a.length > b.length ? b : a, what = a.length > b.length ? 'fly' : 'breathe underwater';
        await D.say(and(win) + ' would rather ' + what + '. That’s ' + NUM[win.length] + ' votes against ' + NUM[lose.length] + '.', { at: res(a.length > b.length ? 'a' : 'b') });
        if (lose.length === 1) await D.say(lose[0] + ' stands alone, and whoever stands alone has to explain why!', { at: res(a.length > b.length ? 'b' : 'a') });
      }
      await D.say('You can also play a Secret vote, where the phone is passed around and everyone picks in private, and you can keep score if you like.', { pos: 'center', ring: false });
      await D.say('Then it’s on to the next question.', { at: '.acts .btn-primary', wait: 1800 });
      await D.tap('.acts .btn-primary');
      await D.wait(900);
      await D.say('After the last question, you see how everyone voted, and who agreed with whom the most.', { at: '.cards' });
    }
  });
})();
