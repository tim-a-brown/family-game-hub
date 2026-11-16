// FreeCell's demo (demo.js; CLAUDE.md, Demos): the end of a deal. A red jack goes on a black queen, a King waits in a free
// cell, sevens go up by themselves, you put the 10 of Spades up, a Queen moves into an empty column, and your Jack of
// Spades puts every column in order, so the whole deal plays itself out.
(function () {
  'use strict';
  var X = window.__freecell;
  function S() { return X.state(); }
  function idle() { return !X.busy; }
  function card(id) { return function () { return document.querySelector('.felt-in .scard[data-id="' + id + '"]'); }; }
  function slots(f) { return function () { return [].slice.call(document.querySelectorAll('.felt-in .slot')).filter(f); }; }
  var cells = slots(function (n) { return n.classList.contains('cell'); });
  var founds = slots(function (n) { return n.textContent === 'A'; });
  function colSlot(i) { return function () { return slots(function (n) { return !n.classList.contains('cell') && n.textContent === ''; })()[i]; }; }
  function table() { return [].concat.apply([], S().tab).map(function (id) { return card(id)(); }).filter(Boolean); }
  // the top card of the foundation for a suit
  function home(s) { return function () { var f = S().found.filter(function (p) { return p.length && p[0][1] === s; })[0]; return f ? card(f[f.length - 1])() : null; }; }
  function where(id) { var s = S(); for (var i = 0; i < 8; i++) if (s.tab[i].indexOf(id) >= 0) return 't' + i; if (s.cells.indexOf(id) >= 0) return 'c'; return 'f'; }
  function run(s, n) { var o = []; for (var k = 0; k < n; k++) o.push('A23456789TJQK'.charAt(k) + s); return o; }

  Kit.demoScript({
    intro: 'Here’s the end of a deal of FreeCell. You’ll make the last moves yourself.',
    beats: 12,
    end: 'Every card is face up, so plan ahead: use the free cells and empty columns to get the cards you need.',
    start: function () {
      X.set({
        deal: 1,
        found: [run('s', 9), run('h', 6), run('c', 9), run('d', 6)],
        tab: [['Kc', '8h', 'Qd'], ['Kd', 'Qs', 'Jd', 'Tc'], ['Kh', 'Qc'], ['9h', 'Jh'], ['7d', '7h', 'Ks'], ['8d', 'Js', 'Th'], ['9d', 'Ts'], ['Qh', 'Jc', 'Td']]
      });
    },
    steps: async function (D) {
      await D.wait(900);
      await D.say('In FreeCell every card is face up from the start, so you can plan every move.', { at: table });
      await D.say('As in Klondike, the foundations build up by suit, from Ace to King. These four are already well on their way.', { at: founds, avoid: [table] });
      await D.say('In the columns you build down in alternating colors. The Jack of Hearts can go on the Queen of Clubs.', { at: function () { return [card('Jh')(), card('Qc')()]; }, avoid: [table] });
      await D.tap(card('Jh'));
      await D.wait(function () { return where('Jh') === 't2' && idle(); }, 4000);
      await D.wait(600);
      await D.say('These four free cells each hold any one card while you work.', { at: cells, avoid: [table] });
      await D.say('The King of Spades has nowhere else to go, so it moves into a free cell.', { at: card('Ks'), wait: false, avoid: [table] });
      await D.tap(card('Ks'));
      await D.wait(function () { return where('7d') === 'f' && idle(); }, 6000);
      await D.wait(500);
      await D.say('That uncovered the 7 of Hearts and the 7 of Diamonds, and both went up by themselves.', { at: function () { return [home('h')(), home('d')()]; }, avoid: [table] });
      await D.you(card('Ts'), 'Tap the 10 of Spades to put it up on the 9.', { avoid: [table], until: function () { return where('Ts') === 'f'; } });
      await D.wait(function () { return idle(); }, 4000);
      await D.wait(500);
      await D.say('Any card can go into an empty column. Watch the Queen of Diamonds move there.', { at: function () { return [card('Qd')(), colSlot(4)()]; }, wait: false, avoid: [table] });
      await D.wait(2600);
      await D.drag(card('Qd'), colSlot(4));
      await D.wait(function () { return where('Th') === 'f' && idle(); }, 7000);
      await D.wait(500);
      await D.say('That freed the 8 and the 9 of Hearts, and the 10 of Hearts followed them up.', { at: home('h'), avoid: [table] });
      await D.you(card('Js'), 'Tap the Jack of Spades. Then every column is in order, and the rest of the cards go up by themselves.', { avoid: [table], until: function () { return where('Js') === 'f'; } });
      await D.wait(function () { return S().won; }, 15000);
      await D.wait(2600);
      await D.say('Every card is home, so you win the deal. The cards leap off the foundations one by one, and a tap skips the show.', { pos: 'top', wait: 4600 });
      if (document.querySelector('canvas.cascade')) await D.tap('canvas.cascade');
      await D.wait(function () { return document.querySelector('.k-win .card'); }, 12000);
      await D.wait(900);
      await D.say('Nearly every deal of FreeCell can be won with careful planning. Each deal has a number, so you can play one again.', { at: function () { return [].slice.call(document.querySelectorAll('.k-win .card button')).filter(function (b) { return /Play deal/.test(b.textContent); })[0] || document.querySelector('.k-win .card'); } });
    }
  });
})();
