// Sportsbook's demo (demo.js; CLAUDE.md, Demos): the real book runs on ESPN's live games, which a demo can't reach or
// replay the same way twice, so it plays on a fixed sample slate of three NFL games (a caption says so). You read the
// moneyline, put $25 on the Bills, place the bet, and the demo skips ahead to the final score to grade the ticket.
(function () {
  'use strict';
  var B = window.__sb;
  var DAY = 864e5;
  function tm(id, abbr, loc, nick, color, rec) { return { id: id, abbr: abbr, name: loc + ' ' + nick, short: nick, loc: loc, nick: nick, color: color, logo: '', rec: rec, rank: 0, score: null }; }
  function slate() {
    // tomorrow at 1:00 and 4:25 in the afternoon (ahead of now, so betting is open, and near enough for the tickers)
    var d = new Date(); d.setHours(13, 0, 0, 0); d.setDate(d.getDate() + 1);
    var t1 = d.getTime(), t2 = t1 + 3.4 * 3600e3;
    function g(id, t, away, home, ml, sp, tot) { return { id: id, lg: 'nfl', t: t, state: 'pre', done: false, detail: '', sname: 'STATUS_SCHEDULED', neutral: false, away: away, home: home, ml: ml, sp: sp, tot: tot }; }
    return [
      g('demo-1', t1, tm('12', 'KC', 'Kansas City', 'Chiefs', '#e31837', '8-2'), tm('2', 'BUF', 'Buffalo', 'Bills', '#00338d', '8-2'), { a: 120, h: -140 }, { a: 2.5, h: -2.5, ao: -110, ho: -110 }, { n: 47.5, o: -110, u: -110 }),
      g('demo-2', t1, tm('9', 'GB', 'Green Bay', 'Packers', '#204e32', '7-3'), tm('3', 'CHI', 'Chicago', 'Bears', '#0b162a', '4-6'), { a: -175, h: 150 }, { a: -3.5, h: 3.5, ao: -110, ho: -110 }, { n: 42.5, o: -110, u: -110 }),
      g('demo-3', t2, tm('6', 'DAL', 'Dallas', 'Cowboys', '#002244', '5-5'), tm('21', 'PHI', 'Philadelphia', 'Eagles', '#004c54', '8-2'), { a: 210, h: -250 }, { a: 6.5, h: -6.5, ao: -110, ho: -110 }, { n: 45.5, o: -110, u: -110 })
    ];
  }
  function px(k) { return '.px[data-k="' + k + '"]'; }
  var BILLS = 'demo-1:ml:h', game = '.gm[data-gid="demo-1"]';
  function bets() { return B.bets(); }
  var slipBar = '.slip-bar';
  var place = function () { var l = [].slice.call(document.querySelectorAll('.tk.slipbody .place')); return l.filter(function (b) { return b.offsetWidth; })[0]; };
  var slipBody = function () { var l = [].slice.call(document.querySelectorAll('.tk.slipbody')); return l.filter(function (b) { return b.offsetWidth; })[0]; };
  var money = function () { return document.querySelector('.sb-money'); };

  Kit.demoScript({
    intro: 'Here’s how a bet works in the Sportsbook. You’ll pick a team and place the bet yourself.',
    beats: 9,
    end: 'Tap a price to put it on your slip, choose your stake and place the bet. When the game ends, a winning ticket pays into your bankroll.',
    start: function () {
      // (the bank lives in memory during a demo; a low one is topped up so the bet fits)
      if ((parseInt(localStorage.getItem('casino_bank'), 10) || 0) < 100) localStorage.setItem('casino_bank', '1000');
      B.demoSlate('nfl', slate(), 'fan');
    },
    steps: async function (D) {
      await D.say('The board lists real games with the prices to bet on them. This demo uses three sample NFL games, so it plays the same every time.', { at: game });
      await D.say('The last column is the moneyline: a bet on who wins. The Bills are favored at −140, so $140 on them wins $100. The Chiefs at +120 win $120 for every $100.', { at: function () { return [D.q(px('demo-1:ml:a')), D.q(px(BILLS))]; } });
      await D.say('The spread and the total are other ways to bet the same game: by how much a team wins, and how many points are scored in all.', { at: function () { return [D.q(px('demo-1:sp:a')), D.q(px('demo-1:tot:u'))]; } });
      await D.you(px(BILLS), 'Tap the Bills’ moneyline to put it on your bet slip.', { until: function () { return !!document.querySelector(px(BILLS) + '.on'); } });
      await D.wait(500);
      if (D.q(slipBar) && D.q(slipBar).offsetWidth) await D.tap(slipBar, { say: 'Your slip opens from the bar at the bottom.', after: 900 });
      await D.say('The slip shows your pick, your stake and what it would win. The stake starts at $25, so a Bills win pays $18 on top of your $25.', { at: slipBody });
      await D.you(place, 'Tap Place bet.', { until: function () { return bets().length > 0; } });
      await D.wait(2600);
      // (at a desk, a large window, open tickets have a column of their own at the left)
      var openCol = function () { var h = document.querySelector('.sd-l .sb-day'); return h && h.offsetWidth ? h : null; };
      await D.say(openCol() ? 'Your ticket waits under Open bets until the game is played. Now we skip ahead to the final score.' : 'Your ticket waits under My bets until the game is played. Now we skip ahead to the final score.', { at: function () { return openCol() || D.q('.sb-view') || money(); }, wait: 3600 });
      await D.set(function () { return B.finish('demo-1', 20, 27); });
      await D.wait(function () { return document.querySelector('.k-sheet'); }, 6000);
      await D.wait(1600);
      var t = bets()[0];
      await D.say('The Bills won 27 to 20, so your ticket wins. It pays $' + (t && t.pay || 43) + ' into your bankroll, your $25 back and $' + ((t && t.pay || 43) - 25) + ' more.', { at: function () { return D.q('.k-sheet .res-sum') || D.q('.k-sheet'); } });
    }
  });
})();
