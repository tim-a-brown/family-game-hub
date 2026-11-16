// Poker's demo (demo.js; CLAUDE.md, Demos): one hand of Texas Hold'em at the default table, a cash game against three
// computer players. You're the big blind, call a raise with Ace-King, bet the flop when an Ace comes, bet again when the
// turn gives you two pair, check the river, and win at the showdown against Ace-Queen.
(function () {
  'use strict';
  var P = window.__pk;
  function S() { return P.S; }
  function H() { return P.S && P.S.hand; }
  function mulberry(a) { return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function first(i) { return S().players[i].name.split(' ')[0]; }
  function seatOf(i) {
    return function () {
      var name = S().players[i].name, l = document.querySelectorAll('.pseat');
      for (var k = 0; k < l.length; k++) { var n = l[k].querySelector('.nm'); if (n && (n.textContent.trim() === name || n.textContent.trim() === name.split(' ')[0])) return l[k]; }
      return null;
    };
  }
  function myTurn(street) { return function () { var h = H(); return h && h.phase === 'bet' && h.actor === 0 && h.street === street && !!document.querySelector('.pctl.mine .pbar'); }; }
  function btn(cls) { return '.pctl .pbar .' + cls; }
  function preset(t) { return function () { return [].slice.call(document.querySelectorAll('.pctl .psz .pre button')).filter(function (b) { return b.textContent === t; })[0]; }; }
  function board(n) { return function () { return [].slice.call(document.querySelectorAll('.pboard .card, .pboard > *')).slice(0, n); }; }
  var hand = function () { return document.querySelector('.pme .phand') || document.querySelector('.phand'); };
  var me = function () { return seatOf(0)() || document.querySelector('.pme'); };

  Kit.demoScript({
    intro: 'Here’s a hand of Texas Hold’em against three computer players. You’ll call and bet yourself.',
    beats: 13,
    end: 'Make the best five-card hand from your two cards and the five shared ones, and bet when you think yours is best.',
    start: function () {
      Math.random = mulberry(7);   // (the seats, the names and the dealer button come out the same every time)
      var nm = (localStorage.getItem('my_name') || '').trim() || 'You';
      // (the bank lives in memory during a demo; a low one is topped up so the $200 buy-in fits)
      if ((parseInt(localStorage.getItem('casino_bank'), 10) || 0) < 400) localStorage.setItem('casino_bank', '1000');
      P.hold(true);
      P.table({ mode: 'he', players: [{ name: nm }, { name: 'a', cpu: true }, { name: 'b', cpu: true }, { name: 'c', cpu: true }], options: { fmt: 'cash', pgame: 'he', ai: 'regular', coach: 'off' } });
      P.rig([['Ah', 'Kd'], ['9c', '4d'], ['Ad', 'Qc'], ['8c', '3d']], ['Ac', '7d', '2s', 'Kc', '5h']);
      // seat 1 is under the gun, seat 2 has the button, seat 3 the small blind, and you the big blind
      P.moves([{ t: 'fold' }, { t: 'raise', to: 6 }, { t: 'fold' }, { t: 'call' }, { t: 'call' }, { t: 'check' }]);
    },
    steps: async function (D) {
      await D.say('In Texas Hold’em, everyone is dealt two cards face down. These two are yours, and only you can see them.', { at: hand });
      await D.say('Two players start the betting with forced bets called blinds. You’re the big blind this hand, so $2 of your chips are already in.', { at: me });
      await D.wait(myTurn(0), 15000);
      await D.say(first(1) + ' folded, ' + first(2) + ' raised to $6, and ' + first(3) + ' folded. To stay in, you have to match the $6.', { at: seatOf(2), avoid: ['.pctl'] });
      await D.you(btn('btn-green'), 'An Ace and a King are a strong start. Tap Call to put in $4 more.', { until: function () { return H().street > 0; } });
      await D.wait(myTurn(1), 9000);
      await D.say('Three shared cards come face up. Everyone uses them with their own two cards. This is called the flop.', { at: '.pboard', avoid: ['.pctl'] });
      await D.say('The Ace of Clubs pairs your Ace, so you have a pair of Aces with a King beside them.', { at: '.pboard', avoid: ['.pctl'] });
      await D.tap(preset('½'), { say: 'You choose how much to bet on this row. Half the pot is a good size here.', after: 700 });
      await D.you(btn('btn-yellow'), 'Tap Bet to put the chips in.', { until: function () { return H().bet[0] > 0 || H().street > 1; } });
      await D.wait(myTurn(2), 9000);
      await D.say(first(2) + ' called. The fourth card, the turn, is the King of Clubs, and now you have two pair: Aces and Kings.', { at: '.pboard', avoid: ['.pctl'] });
      await D.wait(1100);
      await D.tap(preset('½'), { after: 500 });
      await D.tap(btn('btn-yellow'), { say: 'Bet again while your hand is ahead.' });
      await D.wait(myTurn(3), 9000);
      await D.wait(1100);
      await D.tap(btn('btn-soft'), { say: first(2) + ' called again. The last card, the river, is the 5 of Hearts. Check, and see what happens.' });
      await D.wait(function () { return H().phase === 'done'; }, 9000);
      await D.wait(1600);
      await D.say(first(2) + ' checked too, so both hands are shown. ' + first(2) + ' has an Ace and a Queen, only a pair of Aces, and your two pair wins the pot.', { at: seatOf(2), avoid: ['.pctl', '.pboard'] });
      await D.say('After each hand the dealer button moves one seat to the left, and so do the blinds.', { at: '.pdealer', avoid: ['.pctl'] });
    }
  });
})();
