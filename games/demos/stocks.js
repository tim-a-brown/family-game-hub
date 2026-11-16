// Stock Market's demo (demo.js; CLAUDE.md, Demos): on a sample market (the demo never reaches the network, so its prices
// are an example, and a caption says so), you move $1,000 from your bankroll into the account, open Apple, buy $500 of it,
// and see it in your portfolio.
(function () {
  'use strict';
  var M = window.__mk;
  function mulberry(a) { return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var DAY = 864e5;
  // a sample market: [symbol, name, kind, group, sector, size in $ billions, price, change today, about]
  var LIST = [
    ['VOO', 'Vanguard S&P 500 ETF', 'fund', 'index', 'fund', 0, 548.2, 0.004, 'The 500 biggest US companies in one share.'],
    ['VTI', 'Vanguard Total Stock Market ETF', 'fund', 'index', 'fund', 0, 291.6, 0.003, 'Nearly every US company in one share.'],
    ['QQQ', 'Invesco QQQ Trust', 'fund', 'index', 'fund', 0, 482.9, 0.007, 'The 100 biggest companies on the Nasdaq.'],
    ['AAPL', 'Apple', 'stock', 'tech', 'tech', 3400, 228.4, 0.012, 'iPhones, Macs and the App Store.'],
    ['MSFT', 'Microsoft', 'stock', 'tech', 'tech', 3100, 418.7, -0.004, 'Windows, Office, Xbox and cloud computing.'],
    ['NVDA', 'Nvidia', 'stock', 'tech', 'tech', 2900, 121.3, 0.021, 'The chips behind gaming and AI.'],
    ['NTDOY', 'Nintendo', 'stock', 'fun', 'disc', 70, 13.4, -0.006, 'Mario, Zelda and the Switch.'],
    ['DIS', 'Disney', 'stock', 'fun', 'disc', 170, 94.1, 0.002, 'Theme parks, movies and Disney+.'],
    ['KO', 'Coca-Cola', 'stock', 'food', 'stap', 300, 69.8, -0.001, 'Coke, Sprite and hundreds of other drinks.'],
    ['UAL', 'United Airlines', 'stock', 'travel', 'ind', 25, 58.2, 0.015, 'One of the biggest US airlines.']
  ];
  function sample() {
    var r = mulberry(31), now = Date.now(), q = {};
    LIST.forEach(function (x) {
      // 30 closes, a gentle walk that ends at today's previous close
      var pc = x[6] / (1 + x[7]), h = [pc], v = pc;
      for (var i = 0; i < 29; i++) { v = v / (1 + (r() - 0.47) * 0.03); h.unshift(Math.round(v * 100) / 100); }
      var d0 = new Date(now - 41 * DAY), o = h.map(function (_, i) { return Math.round(i * 41 / 30); });
      q[x[0]] = { n: x[1], k: x[2], g: x[3], a: x[8], sec: x[4], cap: x[5], p: x[6], pc: Math.round(pc * 100) / 100, at: now, d0: d0.toISOString().slice(0, 10), h: h, o: o, dv: [] };
    });
    return { v: 2, at: now, asof: now, q: q, rates: { irx: 4.1, fvx: 4.0, tnx: 4.2, tyx: 4.5 },
      idx: { spx: { n: 'S&P 500', p: 5970.2, pc: 5948.6 }, dji: { n: 'Dow', p: 43870.4, pc: 43820.1 }, ixic: { n: 'Nasdaq', p: 19210.5, pc: 19105.9 } } };
  }
  function A() { return M.A(); }
  function segBtn(t) { return function () { return [].slice.call(document.querySelectorAll('.mk-main .seg button')).filter(function (b) { return b.textContent === t; })[0]; }; }
  function chipBtn(t) { return function () { return [].slice.call(document.querySelectorAll('.k-sheet .qchips button')).filter(function (b) { return b.textContent === t; })[0]; }; }
  function row(name) { return function () { return [].slice.call(document.querySelectorAll('.mk-main .row')).filter(function (b) { var n = b.querySelector('.nm b'); return n && n.textContent === name; })[0]; }; }
  function group(g) { return '.mk-main .chips .chip[data-g="' + g + '"]'; }
  var addMoney = '.cashrow .btn-g', sheetGo = '.k-sheet .tt > .btn-primary';
  var paneBuy = function () { return [].slice.call(document.querySelectorAll('.pane.on .btn-g')).filter(function (b) { return b.textContent === 'Buy'; })[0]; };
  var cash = function () { return document.querySelector('.cashrow') || document.querySelector('.mk'); };
  var value = function () { return document.querySelector('.pnl .val') || document.querySelector('.mk'); };

  Kit.demoScript({
    intro: 'Here’s how investing works in the Stock Market. You’ll buy a stock yourself.',
    beats: 11,
    end: 'Add money from your bankroll, buy stocks and funds at their real prices, and watch your account go up and down with the market.',
    start: function () {
      // (the bank lives in memory during a demo; a low one is topped up so the deposit fits)
      if ((parseInt(localStorage.getItem('casino_bank'), 10) || 0) < 1000) localStorage.setItem('casino_bank', '1500');
      M.demoMarket(sample(), 'basic');
    },
    steps: async function (D) {
      await D.say('This is your investing account. You play with money from your casino bankroll, in the real stock market.', { at: value });
      await D.say('The prices in this demo are an example. In the game they’re real, and they update every hour while the market is open.', { pos: 'center' });
      await D.tap(addMoney, { say: 'First, move some money in. Add money takes it from your bankroll.', after: 900 });
      await D.tap(chipBtn('$1,000'), { after: 600 });
      await D.tap(sheetGo, { after: 900 });
      await D.say('Your $1,000 waits here as cash, earning a little interest, until you invest it.', { at: cash });
      await D.tap(segBtn('Market'), { after: 800 });
      await D.say('The Market tab has stocks and funds in groups. An index fund like VOO owns a slice of 500 companies in one share.', { at: '.mk-main .rows' });
      await D.tap(group('tech'), { after: 800 });
      await D.you(row('Apple'), 'Tap Apple to see its price and chart.', { until: function () { return !!document.querySelector('.pane.on'); } });
      await D.wait(900);
      await D.say('A share of Apple costs $228.40 today. The chart shows how the price has moved.', { at: function () { var p = document.querySelector('.pane.on .in .val') || document.querySelector('.pane.on .in .pnl'); return p || document.querySelector('.pane.on .in'); }, avoid: [paneBuy] });
      await D.tap(paneBuy, { after: 900 });
      await D.tap(chipBtn('$500'), { say: 'You can buy part of a share. Here’s $500 worth.', after: 900 });
      await D.you(sheetGo, 'Tap Buy AAPL to buy it at today’s price.', { until: function () { return A().lots.length > 0; } });
      await D.wait(2000);
      await D.tap('.pane.on .top .back', { after: 600 });
      await D.tap(segBtn('Portfolio'), { after: 900 });
      await D.say('Your portfolio shows what you own and what it’s worth now. When the price of Apple moves, so does your account.', { at: function () { return [].slice.call(document.querySelectorAll('.mk-main .pnl')).filter(function (p) { var h = p.querySelector('h3'); return h && /^Stocks, funds/.test(h.textContent); })[0] || document.querySelector('.mk-main'); } });
      await D.say('Sell any time, and Cash out sends money back to your bankroll for the other casino games.', { at: cash });
    }
  });
})();
