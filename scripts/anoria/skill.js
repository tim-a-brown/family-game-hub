// The robots' skill ladder: one profile against another over the ready decks, seats swapped.
//   node scripts/anoria/skill.js [games]                       Easy, Normal and Hard as the game plays them
//   node scripts/anoria/skill.js [games] '<a>' '<b>'           any two: a profile name or a json of tweaks to holder
const { play, PROF, STD } = require('../../games/anoria/engine'); const { ARCH } = require('../../games/anoria/cards');
const n = +process.argv[2] || 300, D = Object.keys(ARCH), dk = k => ARCH[k].cards.concat(ARCH[k].cards);
function vs(pa, pb, seed) { let w = 0; for (let i = 0; i < n; i++) { const a = D[i % 5], b = D[(i * 3 + 1) % 5], fl = i & 1;
  const S = play(fl ? [dk(b), dk(a)] : [dk(a), dk(b)], fl ? [ARCH[b].guide, ARCH[a].guide] : [ARCH[a].guide, ARCH[b].guide], fl ? [pb, pa] : [pa, pb], STD, seed + i * 11); w += S.winner < 0 ? 0.5 : S.winner === (fl ? 1 : 0) ? 1 : 0; } return (100 * w / n).toFixed(1) + '%'; }
const prof = x => PROF[x] || Object.assign({}, PROF.holder, JSON.parse(x));
if (process.argv[3]) console.log(process.argv[3] + ' beats ' + process.argv[4] + ': ' + vs(prof(process.argv[3]), prof(process.argv[4]), 3100));
else { console.log('Normal beats Easy: ' + vs(PROF.normal, PROF.novice, 3100)); console.log('Hard beats Normal: ' + vs(PROF.hard, PROF.normal, 5100)); console.log('Hard beats Easy: ' + vs(PROF.hard, PROF.novice, 7100)); }
