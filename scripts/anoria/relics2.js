// Two Relics with one power: what should happen? Since the third printing, several Relics do the same thing (the
// Astrolabe is a Compass in effect), and a player can have two Relics in play. This plays the question both ways.
//   node scripts/anoria/relics2.js [games for each line]
// Both players get a random deck (run.js randDeck, with its own Relics taken out). Player A's deck is then given two
// copies each of two Relics with the SAME power; player B's is given two copies each of two Relics with DIFFERENT
// powers, one of them that same power. Seats swap every game.
//   the game's rule   no two Relics with the same power in play: A's second Relic can never be played
//   stacked           cfg.relicStack: both are played and the power counts twice (two more cards a turn, three steps,
//                     two jumps a turn)
// A's share of wins says what a second Relic of the same power is worth. 50% is level.
'use strict';
const { play, PROF, STD, rng } = require('../../games/anoria/engine'); const { CARDS } = require('../../games/anoria/cards'); const { randDeck, GL } = require('./run');
const n = +process.argv[2] || 600, PN = ['holder', 'raider', 'keeper', 'brawler'];
const SAME = { 'the Printing Press\'s power (draw one more card each turn)': ['press', 'paper'], 'the Compass\'s power (walk two steps)': ['compass', 'astrolabe'], 'the Antikythera Mechanism\'s power (one jump a turn)': ['antikythera', 'balloon'] };
const OTHER = { press: 'compass', compass: 'press', antikythera: 'press' };
const give = (deck, relics) => { const d = deck.filter(k => CARDS[k].t !== 'relic'), add = relics.concat(relics); return add.concat(d).slice(0, deck.length); };
console.log('Two Relics with one power, ' + n + ' games for each line. Player A holds two Relics with the same power; player B holds that Relic and one with another power.');
Object.keys(SAME).forEach(label => {
  const [x, y] = SAME[label], line = [];
  [['the game\'s rule (the second cannot be played)', {}], ['stacked (both count)', { relicStack: 1 }]].forEach(([nm, cfg]) => {
    let w = 0, played2 = 0;
    for (let i = 0; i < n; i++) { const R = rng(31000 + i * 7919), a = give(randDeck(R), [x, y]), b = give(randDeck(R), [x, OTHER[x]]), fl = i & 1, pa = PROF[PN[(R() * 4) | 0]], pb = PROF[PN[(R() * 4) | 0]], ga = GL[(R() * 5) | 0], gb = GL[(R() * 5) | 0];
      const S = play(fl ? [b, a] : [a, b], fl ? [gb, ga] : [ga, gb], fl ? [pb, pa] : [pa, pb], Object.assign({}, STD, cfg), 31000 + i), me = fl ? 1 : 0;
      w += S.winner === me ? 1 : S.winner < 0 ? 0.5 : 0; if (S.P[me].relics.indexOf(x) >= 0 && S.P[me].relics.indexOf(y) >= 0) played2++; }
    line.push(nm + ': A wins ' + (100 * w / n).toFixed(1) + '%' + (cfg.relicStack ? ' (had both in play in ' + (100 * played2 / n).toFixed(0) + '% of games)' : ''));
  });
  console.log('  ' + label + '\n    ' + line.join('\n    '));
});
