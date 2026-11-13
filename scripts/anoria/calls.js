// How often each Guide's calling happens in a game (coll.js CALLS), measured the way the table measures it: every
// event of a robot game goes through AnoriaColl.track for the first player, with a 'count' after each round's count.
// The first player is the Normal robot with a random Guide's deck (the base set and that Guide's set), against Normal
// and Hard with another. pacing.js uses these rates to play the callings.
//   node scripts/anoria/calls.js [games] [seed]     (calls.txt has the last run)
const E = require('../../games/anoria/engine'), C = require('../../games/anoria/cards'), Coll = require('../../games/anoria/coll');
const N = +process.argv[2] || 1200, SEED = +process.argv[3] || 300000, GK = Object.keys(C.GUIDES);
const deck = g => Coll.guideDeck(g).cards, sealRen = E.STD.sealRen != null ? E.STD.sealRen : 1;
const sum = {}, games = []; let wins = 0;
for (let i = 0; i < N; i++) {
  const R = E.rng(SEED + i * 31), a = GK[(R() * GK.length) | 0], b = GK[(R() * GK.length) | 0];
  const S = E.play([deck(a), deck(b)], [a, b], [E.PROF.normal, E.PROF[i & 1 ? 'hard' : 'normal']], Object.assign({}, E.STD, { log: 1 }), SEED + i, [Coll.guideStack(a), Coll.guideStack(b)]);
  const m = Coll.trackStart(), ren = [0, 0]; let held = false;
  for (const ev of S.ev) {
    if (ev.t === 'turn' && held) { Coll.track(m, { t: 'count', ren: ren.slice() }, 0); held = false; }
    Coll.track(m, ev, 0);
    if (ev.t === 'hold') { held = true; if (ev.o >= 0 && ev.o < 2) ren[ev.o] += ev.n || 0; }
    else if (ev.t === 'renown' && ev.o >= 0 && ev.o < 2) ren[ev.o] += ev.n;
    else if ((ev.t === 'line' || ev.t === 'thread') && ev.o >= 0 && ev.o < 2) ren[ev.o] += ev.ren || 0;
    else if (ev.t === 'seal' && ev.by >= 0 && ev.by < 2) ren[ev.by] += sealRen;
  }
  if (held) Coll.track(m, { t: 'count', ren: ren.slice() }, 0);
  const win = S.winner === 0, x = Coll.trackEnd(m, { win: win, how: S.how }); if (win) wins++;
  Object.keys(x).forEach(k => { sum[k] = (sum[k] || 0) + +x[k]; }); games.push(x);
}
console.log(N + ' games: the Normal robot with a random Guide\'s deck against Normal and Hard, each with another. It won ' + (100 * wins / N).toFixed(1) + '%.');
console.log('Each calling\'s measure, per game (a yes-or-no measure: the share of games in which it happened):');
Object.keys(Coll.CALLS).forEach(g => { const c = Coll.CALLS[g]; if (!c.m) return; console.log('  ' + g.padEnd(12) + c.m.padEnd(11) + (sum[c.m] / N).toFixed(3) + '   need ' + c.need + ': "' + c.say.replace('#', c.need) + '"'); });
console.log('RATES ' + JSON.stringify(Object.keys(sum).reduce((o, k) => { o[k] = +(sum[k] / N).toFixed(3); return o; }, {})));
