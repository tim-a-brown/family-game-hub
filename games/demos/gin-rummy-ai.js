// Gin Rummy's demo (demo.js; CLAUDE.md, Demos): a hand against the computer, two turns from the end. You take the 7 of
// Hearts from the discard pile for your run, throw away your highest deadwood, draw an Ace from the stock and knock.
(function () {
  'use strict';
  var X = window.__gin;
  var RN = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' }, SN = { s: 'Spades', h: 'Hearts', d: 'Diamonds', c: 'Clubs' };
  function S() { return X.state(); }
  function c(code) { return { r: code.slice(0, -1), s: code.slice(-1) }; }
  function name(x) { return (RN[x.r] || x.r) + ' of ' + SN[x.s]; }
  function idOf(code) { var x = c(code), h = S().hands[0]; for (var i = 0; i < h.length; i++) if (h[i].r === x.r && h[i].s === x.s) return h[i].id; return null; }
  function mine(code) { return function () { var id = idOf(code); return id && document.querySelector('.chand .pcard[data-id="' + id + '"]'); }; }
  function stock() { return document.querySelector('.gpiles .gpile:first-child'); }
  function disc() { return document.querySelector('.gpiles .gpile:nth-child(2)'); }
  function dw() { return document.querySelector('.cseat.s .dw'); }
  function btn(re) { return function () { return [].slice.call(document.querySelectorAll('.cbar .btn')).filter(function (b) { return re.test(b.textContent); })[0]; }; }
  function myTurn(ph) { var s = S(); return s && s.turn === 0 && s.phase === ph; }
  // (in a large window the hands are laid down on the felt and the hand is written on the score sheet beside the
  // table; a phone and a tablet get both on a sheet)
  function laid() { return document.querySelector('.ctable .gd-lay'); }

  Kit.demoScript({
    intro: 'Here’s the end of a hand of Gin Rummy. You’ll draw, discard and knock yourself.',
    beats: 12,
    end: 'Draw, discard, and build sets and runs. Knock when your deadwood is 10 or less, or hold out for gin and 25 points more.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      var hands = [['4h', '5h', '6h', '9s', '9d', '9c', 'Kd', '2s', '3d', 'Qs'], ['Kc', 'Qh', 'Jc', '10s', '8h', '6s', '5c', '2h', 'Ad', '7s']];
      var discard = ['Jd', '7h'], top = ['Ac', '4d'];   // (the stock's top card last: Bender draws the 4 of Diamonds, then you the Ace of Clubs)
      var used = {}; hands.concat([discard, top]).forEach(function (l) { l.forEach(function (x) { used[x] = 1; }); });
      var rest = Cards.deck().map(function (x) { return x.r + x.s; }).filter(function (x) { return !used[x]; });
      for (var i = rest.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
      X.start({
        players: [{ name: me, cpu: false }, { name: 'Bender', cpu: true, level: 'normal' }], target: 100, dealer: 1, turn: 0, phase: 'draw', turnNo: 6,
        hands: hands.map(function (h) { return h.map(c); }), discard: discard.map(c), stock: rest.concat(top).map(c)
      });
    },
    steps: async function (D) {
      await D.wait(700);
      await D.say('These are your ten cards. In Gin Rummy you collect melds: sets of three or four of a rank, and runs of three or more in a suit.', { at: '.chand' });
      await D.say('Your melds are found for you, and a bracket marks each one. You have a run of hearts and a set of 9s.', { at: '.chand' });
      await D.say('The cards that aren’t in a meld are deadwood. Yours add up to 25.', { at: dw });
      await D.you(disc, 'The 7 of Hearts on the discard pile fits your run of hearts. Tap the discard pile to take it.', { until: function () { return myTurn('discard'); } });
      await D.wait(900);
      await D.say('Now you throw one card away. The King of Diamonds is your highest deadwood.', { at: mine('Kd'), wait: false });
      await D.wait(2600);
      await D.tap(mine('Kd'));
      await D.wait(400);
      await D.tap(btn(/^Discard/));
      await D.wait(function () { return myTurn('draw'); }, 9000);
      await D.wait(500);
      var thrown = S().discard[S().discard.length - 1];
      await D.say('Bender drew from the stock and threw away the ' + name(thrown) + '.', { at: disc });
      await D.you(stock, 'Now draw a card from the stock.', { until: function () { return myTurn('discard'); } });
      await D.wait(900);
      await D.say('You drew the Ace of Clubs. When your deadwood is 10 or less after you discard, you can knock to end the hand.', { at: dw });
      await D.you(mine('Qs'), 'Tap the Queen of Spades to choose it.', { until: function () { return S().sel === idOf('Qs'); } });
      await D.you(btn(/^Knock/), 'Without the Queen your deadwood is 6. Tap Knock with 6.', { until: function () { return S().phase === 'reveal'; } });
      await D.wait(function () { return document.querySelector('.k-sheet .rv') || laid(); }, 8000);
      await D.wait(1200);
      var desk = !!laid();
      var r = S().res, lay = r && r.dLays && r.dLays.length ? r.dLays.map(function (l) { return name(l.c); }) : [];
      await D.say('Both hands are laid down. ' + (lay.length ? 'Bender laid off the ' + lay.join(' and the ') + ' on your melds, so ' + (lay.length > 1 ? 'they don’t' : 'it doesn’t') + ' count against him.' : 'None of Bender’s cards fit your melds, so all his loose cards count as deadwood.'), { at: desk ? (lay.length ? '.gd-lay .rv-p.bot' : '.gd-lay .rv-p:not(.bot)') : lay.length ? '.k-sheet .rv-p' : '.k-sheet .rv-p + .rv-p' });
      await D.say('You score the difference between the two deadwood counts. Hands go on until someone reaches 100.', { at: desk ? '.cdk-panel.cdk-l' : '.k-sheet table.sum' });
    }
  });
})();
