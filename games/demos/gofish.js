// Go Fish's demo (demo.js; CLAUDE.md, Demos): a game with two computer players. You ask Bender for 7s and make a book,
// ask EVE for Kings and are told to go fish, draw from the pond, and then Bender, who heard you ask, takes your King.
(function () {
  'use strict';
  var G = window.__gf, Core = G.core;
  var SU = ['s', 'h', 'c', 'd'], RK = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  function card(code) { var s = code.slice(-1), r = code.slice(0, -1); return { r: r, s: s, id: 'c' + (SU.indexOf(s) * 13 + RK.indexOf(r)) }; }
  function S() { return G.S; }
  function seat(p) { return function () { return document.querySelector('.gf .seat[data-p="' + p + '"]'); }; }
  function grp(r) { return function () { return document.querySelector('.gf .hand .grp[data-r="' + r + '"]'); }; }
  function books(p) { return function () { var m = p === 0 ? document.querySelector('.gf .mine') : seat(p)(); return m && (m.querySelector('.books') || m); }; }
  function quiet() { return S() && !G.busy; }
  function myAsk() { return quiet() && S().turn === 0 && S().phase === 'ask'; }
  // (the computer players choose from a stream of their own, the same every time)
  function seeded(a) { return function () { var t = (a = (a + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  Kit.demoScript({
    intro: 'Here’s how Go Fish goes. You’ll ask for cards and fish from the pond yourself.',
    beats: 12,
    end: 'Ask for a rank you hold, keep asking while you get cards, and fish when you hear Go fish. The most books of four wins.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      Core.C.rng = seeded(7);
      var hands = [['3d', '7s', '7h', '7c', '9c', 'Qh', 'Ks'], ['2h', '5s', '7d', 'Jc', 'Kh', 'Kc', 'Kd'], ['2c', '4s', '6d', '8h', '10c', 'Jd', 'As']];
      var dealt = [].concat.apply([], hands), pond = [];
      SU.forEach(function (s) { RK.forEach(function (r) { if (dealt.indexOf(r + s) < 0) pond.push(card(r + s)); }); });
      for (var i = pond.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = pond[i]; pond[i] = pond[j]; pond[j] = t; }
      G.start({ players: [{ name: me }, { name: 'Bender', cpu: true, level: 'normal' }, { name: 'EVE', cpu: true, level: 'normal' }], level: 'normal', next: 'left', col: 'books' }, function (s) {
        s.hands = hands.map(function (h) { return Core.sortHand(h.map(card)); });
        s.pond = pond; s.books = [[], [], []]; s.bo = []; s.dealtBooks = []; s.ev = []; s.log = [];
        s.turn = 0; s.phase = 'ask'; s.ask = null; s.dealer = 2; s.tn = 1;
      });
    },
    steps: async function (D) {
      await D.wait(myAsk, 6000);
      await D.say('Everyone was dealt seven cards. The rest lie face down in the middle as the pond.', { at: '.gf .pond' });
      await D.say('Your cards are grouped by rank. You have three 7s, and a book is all four.', { at: grp('7') });
      await D.say('On your turn, you ask one player for a rank you already hold.', { at: function () { return [seat(1)(), seat(2)()]; } });
      await D.you(seat(1), 'Tap Bender to ask Bender.', { until: function () { return !!document.querySelector('.gf .seat.pick'); } });
      await D.you(grp('7'), 'Now tap your 7s to ask Bender for 7s.', { until: function () { return S().log.length > 0; } });
      await D.wait(quiet, 9000);
      await D.say('Bender had a 7 and had to hand it over. With all four 7s, you lay down a book.', { at: books(0) });
      await D.say('You got what you asked for, so you ask again. This time you ask EVE for Kings.', { at: seat(2), wait: false });
      await D.wait(1800);
      await D.tap(seat(2), { after: 300 });
      await D.tap(grp('K'));
      await D.wait(function () { return quiet() && S().phase === 'fish'; }, 9000);
      await D.say('EVE doesn’t have a King, so she says Go fish!', { at: seat(2) });
      await D.you('.gf .pond', 'Tap a card in the pond to fish.', { until: function () { return S().phase !== 'fish' || S().turn !== 0; } });
      await D.wait(quiet, 9000);
      await D.say('You didn’t draw a King, so your turn is over and it passes to your left.', { at: seat(1) });
      await D.wait(function () { return S().books[1].length > 0 && quiet(); }, 12000);
      await D.say('Bender heard you ask for Kings, so he asked you for yours. With your King he has all four, and that’s his book.', { at: books(1) });
      await D.say('The number beside each name is how many books that player has. When all 13 books are down, whoever has the most wins.', { at: '.gf .mine .tg' });
    }
  });
})();
