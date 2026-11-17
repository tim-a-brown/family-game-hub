// Rook's demo (demo.js; CLAUDE.md, Demos): a hand with you and EVE as partners against two computer players. You bid
// 120 and win the bid, take the nest, bury five cards and name red as trump; then, in the last two tricks, the Rook
// takes Bender's Red 1 and your Yellow 1 takes the last trick and the nest, and the hand is scored.
(function () {
  'use strict';
  var R = window.__rook;
  var COLS = ['r', 'y', 'g', 'b'], RANKS = [1, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5];
  function S() { return R.state(); }
  function all() { var d = []; COLS.forEach(function (c) { RANKS.forEach(function (r) { d.push({ id: c + r, c: c, r: r }); }); }); d.push({ id: 'rook', c: 'x', r: 0, rook: true }); return d; }
  function pts(c) { return c.rook ? 20 : c.r === 1 ? 15 : (c.r === 14 || c.r === 10) ? 10 : c.r === 5 ? 5 : 0; }
  function cards(ids) { var d = all(); return ids.map(function (id) { return d.filter(function (c) { return c.id === id; })[0]; }); }
  function mine(id) { return function () { return document.querySelector('.chand [data-id="' + id + '"]'); }; }
  function seat(p) { return function () { return document.querySelectorAll('.ctable .cseat')[p]; }; }
  function trick() { return document.querySelectorAll('.ctrick > *'); }
  // (in a large window the score strip is put away and the panel at the right says the bid and each side's points; a
  // hand's scores are the sheet that comes up over the table, or there the row just written on the score sheet)
  function desk() { return document.documentElement.classList.contains('cdesk-on'); }
  function scored() { return document.querySelector('.k-sheet table.sum') || (desk() && S().phase === 'handover' && document.querySelector('.cbar .btn-primary')); }
  function ours() {
    var t = document.querySelectorAll('.k-sheet table.sum tr')[1]; if (t || !desk()) return t;
    var rows = document.querySelectorAll('.rk-pad .pb .pr'), r = rows[rows.length - 1];
    return r ? r.querySelector('.cv') : null;
  }
  var HAND = ['rook', 'r14', 'r13', 'r12', 'r10', 'r9', 'b1', 'g6', 'y7', 'b8'], NEST = ['y1', 'g1', 'r11', 'y9', 'g5'];
  var BURY = ['g6', 'y7', 'b8', 'y9', 'g5'];

  Kit.demoScript({
    intro: 'Here’s a hand of Rook. You’ll win the bid, name trump and play the Rook yourself.',
    beats: 13,
    end: 'Bid what your team can capture, pick the color you’re strongest in as trump, and remember that the Rook beats every other card.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      R.start({ target: 500, level: 'normal', players: [{ name: me, cpu: false }, { name: 'Bender', cpu: true, level: 'normal' }, { name: 'EVE', cpu: true, level: 'normal' }, { name: 'Johnny 5', cpu: true, level: 'normal' }] });
      R.set(function (s) {
        // the rest of the deck, in color order, dealt round the table so nobody else has a long color
        var used = HAND.concat(NEST), rest = all().filter(function (c) { return used.indexOf(c.id) < 0; });
        var others = [[], [], []]; rest.forEach(function (c, i) { others[i % 3].push(c); });
        s.dealer = 3; s.turn = 0; s.leader = 0; s.phase = 'bid';
        s.hands = [cards(HAND), others[0], others[1], others[2]];
        s.nest = cards(NEST);
        s.bids = [null, null, null, null]; s.high = 0; s.bidder = -1; s.bid = 0; s.trump = null; s.sel = []; s.fromNest = [];
      });
    },
    steps: async function (D) {
      await D.say('Rook has four colors numbered 1 and 5 to 14. In each color the 1 is highest, then 14, 13 and on down to 5.', { at: '.chand' });
      await D.say('This bird is the Rook. Whatever color is trump, the Rook is the highest trump of all.', { at: mine('rook') });
      await D.say('EVE sits across from you and is your partner. Together you capture points: 20 for the Rook, 15 for each 1, 10 for each 14 and 10, and 5 for each 5.', { at: seat(2) });
      await D.say('Each player bids the points their team will capture, or passes. With the Rook and five red cards, you can raise the bid to 120.', { at: '.cbar .bidbar' });
      for (var i = 0; i < 4; i++) await D.tap('.cbar .bidbar .amt button[aria-label="Raise bid"]', { after: 200 });
      await D.you('.cbar .bidbar .btn-primary', 'Tap Bid to bid 120.', { until: function () { return S().bids[0] === 120; } });
      await D.wait(function () { return S().phase !== 'bid'; }, 12000);
      await D.say('Everyone else passed, so you win the bid at 120. Your team needs 120 points to make it.', { at: function () { return desk() ? document.querySelector('.cdk-r .rk-ln') || document.querySelector('.cdk-r .rk-b.rk-me') : document.querySelector('.rk-top .rk-mid'); }, wait: 3000 });
      await D.wait(function () { return S().fromNest && S().fromNest.length === 5; }, 6000);
      await D.wait(600);
      await D.say('You pick up the five cards of the nest, outlined in green, then bury any five face down. You keep your red cards and the 1s.', { at: function () { return S().fromNest.map(function (id) { return mine(id)(); }); } });
      for (var k = 0; k < BURY.length; k++) await D.tap(mine(BURY[k]), { after: 160 });
      await D.tap('.cbar .btn-primary');
      await D.wait(function () { return S().phase === 'trump'; }, 4000);
      await D.wait(400);
      await D.you(function () { return D.qa('.cbar .trumps button')[0]; }, 'Name trump. You have six red cards and the Rook, so tap Red.', { until: function () { return S().trump === 'r'; } });
      await D.wait(1800);
      // the last two tricks of the hand
      await D.set(function () {
        R.set(function (s) {
          s.hands = [cards(['rook', 'y1']), cards(['r1', 'y6']), cards(['b14', 'g10']), cards(['r7', 'b12'])];
          var keep = ['rook', 'y1', 'r1', 'y6', 'b14', 'g10', 'r7', 'b12'].concat(BURY);
          var rest = all().filter(function (c) { return keep.indexOf(c.id) < 0; }).sort(function (a, b) { return pts(b) - pts(a); });
          var ours = [], theirs = [], sum = 0;
          rest.forEach(function (c) { if (sum + pts(c) <= 60 && ours.length < 18) { ours.push(c); sum += pts(c); } else theirs.push(c); });
          s.taken = [ours, theirs]; s.played = rest.map(function (c) { return c.id; });
          s.discards = cards(BURY); s.nest = []; s.sel = []; s.fromNest = [];
          s.phase = 'play'; s.trump = 'r'; s.bid = 120; s.high = 120; s.bidder = 0;
          s.trick = []; s.trickNo = 8; s.turn = 0; s.leader = 0; s.tricks = [3, 2, 2, 1]; s.vd = [{}, {}, {}, {}];
        });
      });
      await D.say('Now we skip ahead to the last two tricks. Your team has 60 points so far.', { at: function () { return desk() ? document.querySelector('.cdk-r .rk-tug .ends span') : document.querySelector('.rk-top .rk-team.us'); }, wait: 3200 });
      await D.you(mine('rook'), 'You lead. Play the Rook, and everyone has to follow with red if they can.', { until: function () { return S().trick.length > 0; } });
      await D.wait(function () { return S().trick.length === 4; }, 9000);
      await D.say('Bender had to give up the Red 1, and the Rook beats it. That trick is worth 45 points.', { at: trick });
      await D.wait(function () { return S().trickNo >= 9 && S().turn === 0; }, 9000);
      await D.tap(mine('y1'), { say: 'Whoever takes the last trick also gets the buried cards. Lead your Yellow 1.' });
      await D.wait(scored, 15000);
      await D.wait(600);
      await D.say('Your team took 135 points, at least the 120 you bid, so you score all 135. A team that takes less than its bid loses the whole bid.', { at: ours });
    }
  });
})();
