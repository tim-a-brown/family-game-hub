// Horse Race's demo (demo.js; CLAUDE.md, Demos): one race of six. You read the program, pick a horse at middling odds,
// bet $10 to win, watch the race (your horse wins, as the demo's script says) and see the tote pay you.
(function () {
  'use strict';
  var HR = window.__hr;
  function mulberry(a) { return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function S() { return HR.state(); }
  var pick = 0;
  function horse() { return S().field.horses[pick]; }
  function row(i) { return function () { return document.querySelector('.prog .hz[data-i="' + i + '"]'); }; }
  function odds(h) { return h.ml[0] + ' to ' + h.ml[1]; }
  function chip(v) { return '.rail .tray button[data-v="' + v + '"]'; }
  var go = '.rail .btn.go', prog = '.prog', types = '.btypes';

  Kit.demoScript({
    intro: 'Here’s a race at the track. You’ll pick a horse and place the bet yourself.',
    beats: 9,
    end: 'Read the program, pick your horse and the kind of bet, and cheer them home. Longer odds pay more when they come in.',
    start: function () {
      Math.random = mulberry(5);   // (the same field, the same odds and the same race every time)
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      // (the bank lives in memory during a demo; a low one is topped up so the bets fit)
      if ((parseInt(localStorage.getItem('casino_bank'), 10) || 0) < 100) localStorage.setItem('casino_bank', '1000');
      HR.start([{ name: me }], { field: '6', pace: 'quick', voice: 'on' });
      // a horse at middling odds: not the favorite, not a long shot
      var hs = S().field.horses, best = 1e9;
      hs.forEach(function (h, i) { var m = h.ml[0] / h.ml[1], d = Math.abs(m - 4); if (d < best) { best = d; pick = i; } });
      HR.winner(pick);
    },
    steps: async function (D) {
      await D.say('This is the program for the next race. Each horse has its number, its name and its odds at the right.', { at: prog });
      var hs = S().field.horses, lo = Math.min.apply(null, hs.map(function (h) { return h.ml[0] / h.ml[1]; }));
      var favs = hs.filter(function (h) { return h.ml[0] / h.ml[1] === lo; });
      await D.say('Low odds mean a horse is expected to do well. ' + (favs.length > 1 ? favs.map(function (h) { return h.name; }).join(' and ') + ' are the favorites at ' + odds(favs[0]) + ', so a win on either pays the least.'
        : favs[0].name + ' is the favorite at ' + odds(favs[0]) + ', so a win on it pays the least.'), { at: function () { return favs.map(function (h) { return row(hs.indexOf(h))(); }); } });
      await D.you(row(pick), 'Tap ' + horse().name + ', number ' + horse().post + ', at ' + odds(horse()) + '.', { until: function () { return S().pick.sel[0] === pick; } });
      await D.say('A Win bet pays if your horse finishes first. Place pays for first or second, and Show for any of the top three.', { at: types });
      await D.tap(chip(5), { say: 'Each chip you tap goes on your horse to win. Here’s $10.', after: 400 });
      await D.tap(chip(5), { after: 600 });
      await D.you(go, 'Tap Race for $10 to send them off.', { until: function () { return S().phase !== 'bet'; } });
      await D.wait(1500);
      await D.say('The call box tells you who’s in front as they run. Your horse wears the number ' + horse().post + ' cloth.', { at: '.call', wait: false });
      await D.wait(function () { return S().race && S().race.settled && !document.querySelector('.rail.rk-race'); }, 90000);
      await D.wait(1800);
      var paid = S().race && S().race.res && S().race.res[0] || Math.round(10 * (1 + horse().ml[0] / horse().ml[1]));
      await D.say(horse().name + ' won! At ' + odds(horse()) + ', your $10 ticket brings back $' + paid + ', your $10 and $' + (paid - 10) + ' more.', { at: '.tote' });
      await D.say('Next race starts a new program, with new horses and new odds.', { at: go });
    }
  });
})();
