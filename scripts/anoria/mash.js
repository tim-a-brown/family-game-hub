// "A deck is two packs": each ready deck's different cards as a pack (20 cards now; 15 when this was first run). A deck is any two of them shuffled together (one copy
// of each card), or one pack twice (the decks the balance runs tuned). Every deck plays every other.
//   node scripts/anoria/mash.js [games per matchup]
const { play, PROF, STD } = require('../../games/anoria/engine'); const { ARCH } = require('../../games/anoria/cards');
const n = +process.argv[2] || 40, P = Object.keys(ARCH), decks = [];
for (let i = 0; i < P.length; i++) for (let j = i; j < P.length; j++) decks.push({ name: i === j ? P[i] + ' x2' : P[i] + ' + ' + P[j], cards: ARCH[P[i]].cards.concat(ARCH[P[j]].cards), guides: [ARCH[P[i]].guide, ARCH[P[j]].guide], pure: i === j });
const res = decks.map(() => ({ w: 0, g: 0, seals: 0, rounds: 0 }));
for (let a = 0; a < decks.length; a++) for (let b = a + 1; b < decks.length; b++) for (let i = 0; i < n; i++) {
  const fl = i & 1, A = decks[a], B = decks[b], ga = A.guides[(i >> 1) & 1], gb = B.guides[(i >> 2) & 1];
  const S = play(fl ? [B.cards, A.cards] : [A.cards, B.cards], fl ? [gb, ga] : [ga, gb], [PROF.holder, PROF.holder], STD, 9100 + a * 131 + b * 17 + i * 3);
  const wa = S.winner < 0 ? 0.5 : S.winner === (fl ? 1 : 0) ? 1 : 0;
  res[a].w += wa; res[b].w += 1 - wa; res[a].g++; res[b].g++; res[a].rounds += S.round || 0; res[b].rounds += S.round || 0;
  if (S.how === 'seals') res[wa === 1 ? a : b].seals++;
}
const rows = decks.map((d, i) => ({ name: d.name, pure: d.pure, win: 100 * res[i].w / res[i].g, seals: 100 * res[i].seals / res[i].g, rounds: res[i].rounds / res[i].g })).sort((x, y) => y.win - x.win);
console.log('TWO PACKS MAKE A DECK (' + n + ' games per matchup, ' + res[0].g + ' games per deck)\n' + 'deck'.padEnd(26) + 'win %   seal wins %   rounds');
rows.forEach(r => console.log(r.name.padEnd(26) + r.win.toFixed(1).padStart(5) + '   ' + r.seals.toFixed(1).padStart(8) + '      ' + r.rounds.toFixed(1)));
const mix = rows.filter(r => !r.pure), pure = rows.filter(r => r.pure), avg = a => a.reduce((s, r) => s + r.win, 0) / a.length;
console.log('\nmixed decks average ' + avg(mix).toFixed(1) + '% (range ' + Math.min(...mix.map(r => r.win)).toFixed(1) + ' to ' + Math.max(...mix.map(r => r.win)).toFixed(1) + '); one pack twice average ' + avg(pure).toFixed(1) + '% (range ' + Math.min(...pure.map(r => r.win)).toFixed(1) + ' to ' + Math.max(...pure.map(r => r.win)).toFixed(1) + ')');
