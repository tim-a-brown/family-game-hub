// What a Guide is worth: every ready deck plays every other ready deck (both seats) under its own Guide, then again
// under each Guide in turn, the other side always keeping its own. The number is how many points of win rate the Guide
// adds to or takes from a deck, averaged over the five decks, with each deck's figure beside it.
//   node scripts/anoria/guides.js [games per pair and seat] [first seed] [guide,guide] ['<json of rule changes>']
const { play, PROF, STD } = require('../../games/anoria/engine'); const { ARCH, GUIDES } = require('../../games/anoria/cards');
const n = +process.argv[2] || 100, seed0 = +process.argv[3] || 5000, only = process.argv[4] ? process.argv[4].split(',') : Object.keys(GUIDES), CFG = Object.assign({}, STD, JSON.parse(process.argv[5] || '{}'));
// (the Guides of the roster of twelve who are not in cards.js yet: they are still cards there, until the roster changes)
const NEW = { joan: 'Joan of Arc', saladin: 'Saladin', shakespeare: 'Shakespeare', wuzetian: 'Empress Wu', akbar: 'Akbar', mansamusa: 'Mansa Musa', sorjuana: 'Sor Juana' };
const D = Object.keys(ARCH), style = { Explorers: 'raider', Legion: 'brawler', Legacy: 'keeper', Court: 'holder', Pathfinders: 'raider' };
const dk = k => ARCH[k].cards.concat(ARCH[k].cards);
function rate(deck, guide) { let w = 0, g = 0, seals = 0, rounds = 0;
  for (const opp of D) if (opp !== deck) for (let i = 0; i < 2 * n; i++) { const me = i & 1, nm = me ? [opp, deck] : [deck, opp];
    const S = play(nm.map(dk), nm.map((k, s) => s === me ? guide : ARCH[k].guide), nm.map(k => PROF[style[k]]), CFG, seed0 + g); g++;
    w += S.winner < 0 ? .5 : S.winner === me ? 1 : 0; if (S.how === 'seals' && S.winner !== me) seals++; rounds += S.round; }
  return { w: 100 * w / g, lostSeals: 100 * seals / g, rounds: rounds / g, g: g }; }
const base = {}; D.forEach(d => { base[d] = rate(d, ARCH[d].guide); });
console.log('each deck under its own Guide: ' + D.map(d => d + ' ' + base[d].w.toFixed(1)).join('  ') + '   (' + base[D[0]].g + ' games a deck, about ±' + (100 / Math.sqrt(base[D[0]].g)).toFixed(1) + ' a figure)');
for (const gd of only) { const r = D.map(d => rate(d, gd)), dif = r.map((x, i) => x.w - base[D[i]].w), avg = dif.reduce((a, b) => a + b, 0) / D.length;
  console.log(((GUIDES[gd] || NEW[gd] || gd) + ':').padEnd(20) + (avg >= 0 ? '+' : '') + avg.toFixed(1) + '   by deck ' + D.map((d, i) => d.slice(0, 5) + ' ' + (dif[i] >= 0 ? '+' : '') + dif[i].toFixed(1)).join('  ') +
    '   loses on Seals ' + (r.reduce((a, x) => a + x.lostSeals, 0) / D.length).toFixed(0) + '%, rounds ' + (r.reduce((a, x) => a + x.rounds, 0) / D.length).toFixed(1)); }
