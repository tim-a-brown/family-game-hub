// What the scoring ramp does: the five ready decks against each other under a scoring rule, with how long games run,
// how they end, how often the lead changes hands and whether a deck runs out.
//   node scripts/anoria/scoring.js "<label>" '<json of rule changes>' [games per matchup] [copies of each card in a deck]
const { play, PROF, STD } = require('../../games/anoria/engine'); const { ARCH } = require('../../games/anoria/cards');
const label = process.argv[2] || 'today', cfg = Object.assign({}, STD, JSON.parse(process.argv[3] || '{}')), n = +process.argv[4] || 100, copies = +process.argv[5] || 2, seed0 = +process.argv[6] || 1000; cfg.log = 1; let drawn = [], seen = [];
const D = Object.keys(ARCH), style = { Explorers: 'raider', Legion: 'brawler', Legacy: 'keeper', Court: 'holder', Pathfinders: 'raider' };
const dk = k => { let a = []; for (let i = 0; i < copies; i++) a = a.concat(ARCH[k].cards); return a; }, SIZE = dk(D[0]).length;
const capAt = {}; let dry = 0, dryBoth = 0;   // (games that stopped at each round limit; a player with no cards left to draw)
let g = 0, rounds = [], byRen = 0, bySeal = 0, byCap = 0, flips = 0, behind3 = 0, dec3 = 0, behindHalf = 0, decHalf = 0, ranOut = 0, seat0 = 0, lo = 100, hi = 0, wins = {};
for (const a of D) { let w = 0, t = 0;
  for (const b of D) { if (a === b) continue;
    for (let i = 0; i < n; i++) { const fl = i & 1, S = play(fl ? [dk(b), dk(a)] : [dk(a), dk(b)], fl ? [ARCH[b].guide, ARCH[a].guide] : [ARCH[a].guide, ARCH[b].guide], fl ? [PROF[style[b]], PROF[style[a]]] : [PROF[style[a]], PROF[style[b]]], cfg, seed0 + g);
      const me = fl ? 1 : 0; w += S.winner < 0 ? .5 : S.winner === me ? 1 : 0; t++; g++; rounds.push(S.round);
      const top = Math.max(S.P[0].renown, S.P[1].renown);
      if (S.how === 'seals') bySeal++; else if (top >= cfg.target) byRen++; else byCap++;
      if (S.winner === 0) seat0++;
      const L = S.st.lead; let last = -1, f = 0; L.forEach(x => { if (x >= 0) { if (last >= 0 && x !== last) f++; last = x; } }); flips += f;
      if (S.winner >= 0) { if (L.length >= 3 && L[2] >= 0) { dec3++; if (L[2] !== S.winner) behind3++; } const h = Math.floor(L.length / 2) - 1; if (h >= 0 && L[h] >= 0) { decHalf++; if (L[h] !== S.winner) behindHalf++; } }
      const dr = [0, 0]; (S.ev || []).forEach(e => { if (e.t === 'draw') dr[e.o]++; }); const most = Math.max(dr[0], dr[1]) + 5; drawn.push(most); if (most > SIZE) ranOut++; seen.push(Math.min(1, most / SIZE));
      const e0 = !S.P[0].deck.length && !(S.P[0].gone || []).length, e1 = !S.P[1].deck.length && !(S.P[1].gone || []).length; if (e0 || e1) dry++; if (e0 && e1) dryBoth++;
    } }
  const p = 100 * w / t; lo = Math.min(lo, p); hi = Math.max(hi, p); wins[a] = p.toFixed(1); }
rounds.sort((x, y) => x - y); const q = f => rounds[Math.floor(f * (rounds.length - 1))];
console.log(label + '\n  rounds: average ' + (rounds.reduce((s, x) => s + x, 0) / g).toFixed(1) + ', most games ' + q(.1) + ' to ' + q(.9) + ', longest ' + q(1) +
  '\n  ends: ' + (100 * byRen / g).toFixed(0) + '% on Renown, ' + (100 * bySeal / g).toFixed(0) + '% on Seals, ' + (100 * byCap / g).toFixed(0) + '% at the round limit' +
  '\n  the lead changes hands ' + (flips / g).toFixed(2) + ' times a game; the winner was behind after round 3 in ' + (100 * behind3 / dec3).toFixed(0) + '% of games, and behind at half time in ' + (100 * behindHalf / decHalf).toFixed(0) + '%' +
  '\n  cards a player goes through: average ' + (drawn.reduce((s, x) => s + x, 0) / g).toFixed(0) + ', most ' + Math.max.apply(null, drawn) + ' (the busier player each game); more than 30 in ' + (100 * drawn.filter(x => x > 30).length / g).toFixed(0) + '%, more than 40 in ' + (100 * drawn.filter(x => x > 40).length / g).toFixed(0) + '%, more than 45 in ' + (100 * drawn.filter(x => x > 45).length / g).toFixed(0) + '%' +
  '\n  rounds played: ' + [8, 9, 10, 11, 12, 13, 14].map(r => r + '+ in ' + (100 * rounds.filter(x => x >= r).length / g).toFixed(1) + '%').join(', ') + '; a player ends with nothing left to draw in ' + (100 * dry / g).toFixed(1) + '% (both in ' + (100 * dryBoth / g).toFixed(1) + '%)' +
  '\n  a deck of ' + SIZE + ' runs out (the busier player draws past its last card) in ' + (100 * ranOut / g).toFixed(0) + '% of games; seat 1 wins ' + (100 * seat0 / g).toFixed(0) + '%; decks ' + D.map(d => d.slice(0, 5) + ' ' + wins[d]).join('  ') + '  spread ' + (hi - lo).toFixed(1));
