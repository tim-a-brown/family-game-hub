// Sandlot's demo (demo.js; CLAUDE.md, Demos): your team, made from a pile of baseball cards, against the computer's.
// The roster from the cards, then the first inning: the swing chart, a single off the dice, and a two-run home run.
(function () {
  'use strict';
  var L = window.__sandlot;
  function S() { return L.state(); }
  function idle() { var s = S(); return s && s.phase === 'play' && !L.busy() && !s.sideOut; }
  function pa() { return S().log ? S().log.length : 0; }

  Kit.demoScript({
    intro: 'Here’s a game of Sandlot. Your old baseball cards become the players, and you call the pitches.',
    beats: 10,
    end: 'Make a team from your cards, type in the numbers from their backs, and tap Pitch! for every at-bat. Most runs after the last inning wins.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'You';
      L.start({ mode: 'cpu', options: { innings: 3, cputeam: 'own' }, players: [{ name: me, color: Kit.color(0), cpu: false }, { name: 'Sprocket', color: Kit.color(1), cpu: true }] });
      L.team(0);
      // (your team's names, so none is the same as one of the computer's made-up players)
      var NAMES = ['Murphy', 'Alvarez', 'Chen', 'Robinson', 'Duffy', 'Santos', 'Novak', 'Whitaker', 'Ibarra', 'Larkin', 'Petrov', 'Yates', 'Ortega', 'Hale'], k = 0;
      L.set(function (s) { var T = s.teams[0]; T.lineup.concat(T.bench, T.pitchers).forEach(function (id) { if (id && s.P[id]) s.P[id].name = NAMES[k++ % NAMES.length]; }); });
    },
    steps: async function (D) {
      await D.say('Deal a pile of old baseball cards into two teams. Each card is a player, with the numbers from the back of the card.', { at: '.rs-head' });
      await D.say('A hitter plays by his batting average and home runs, and a pitcher by his ERA and strikeouts. You type them in once.', { at: function () { var b = D.q('.rs .lc'); return b && b.children[1]; } });
      await D.tap(function () { return D.qa('.rs .btn-primary.btn-lg').slice(-1)[0]; });
      await D.wait(function () { return S().et === 1; }, 4000);
      await D.wait(600);
      await D.you(function () { return D.qa('.rs .btn-primary.btn-lg').slice(-1)[0]; }, 'The computer brought a team of its own. Tap Play ball!', { until: function () { return S().phase === 'play'; } });
      // you bat first
      await D.set(function () {
        L.set(function (s) { s.home = 1; s.line = [[0], []]; s.tick = 'Coin flip: ' + s.teams[1].name + ' bats last. Play ball!'; });
      });
      await D.wait(1200);
      await D.say('The swing chart shows this hitter’s chances against this pitcher. Better hitters have bigger hit zones, and better pitchers shrink them.', { at: '.mb .chart' });
      await D.say('For every at-bat you tap Pitch!, and three dice pick a spot on the chart. Low rolls favor the pitcher, and high rolls the hitter.', { at: '.dtray' });
      await D.wait(idle, 6000);
      L.rig('S');
      await D.you('.sl .go', 'The first pitch of the game is Play ball! Tap it.', { until: function () { return pa() > 0; } });
      await D.wait(function () { return idle() && pa() > 0; }, 9000);
      await D.wait(500);
      await D.say('A single! The app moves the runners, keeps score and calls the play.', { at: '.mb .tick' });
      await D.say('Between pitches you manage your team: steal, bunt, pinch hit or change pitchers.', { at: '.mv' });
      await D.wait(idle, 6000);
      var n = pa();
      L.rig('HR');
      await D.tap('.sl .go', { say: 'Now your next hitter steps in.' });
      await D.wait(function () { return idle() && pa() > n; }, 12000);
      await D.wait(700);
      await D.say('A home run! Your runner scores ahead of him, and that’s two runs on the scoreboard.', { at: '.sl .sb' });
    }
  });
})();
