// The five ready decks against each other under a rules variant.
//   node scripts/anoria/variant.js "<label>" '<json of rule changes>' [games per matchup]
//   e.g. node scripts/anoria/variant.js "one of each, return 1" '{"unique":1,"ret":1}' 200
const { play, PROF, STD } = require('../../games/anoria/engine'); const { ARCH } = require('../../games/anoria/cards');
const label = process.argv[2] || 'today', cfg = Object.assign({}, STD, JSON.parse(process.argv[3] || '{}')), n = +process.argv[4] || 200;
const D = Object.keys(ARCH), style = { Explorers: 'raider', Legion: 'brawler', Legacy: 'keeper', Court: 'holder', Tricksters: 'raider' }, dk = k => ARCH[k].cards.concat(ARCH[k].cards);
let out = (label + ':').padEnd(44), rounds = 0, g = 0, ko = 0, seals = 0, first = 0, lo = 100, hi = 0, th = 0, ln = 0;
for (const a of D) { let w = 0, t = 0;
  for (const b of D) { if (a === b) continue;
    for (let i = 0; i < n; i++) { const fl = i & 1, S = play(fl ? [dk(b), dk(a)] : [dk(a), dk(b)], fl ? [ARCH[b].guide, ARCH[a].guide] : [ARCH[a].guide, ARCH[b].guide], fl ? [PROF[style[b]], PROF[style[a]]] : [PROF[style[a]], PROF[style[b]]], cfg, 7000 + i * 3);
      const me = fl ? 1 : 0; w += S.winner < 0 ? 0.5 : S.winner === me ? 1 : 0; t++; rounds += S.round; g++; ko += S.st.ko; th += S.st.threads || 0; ln += S.st.lines; if (S.how === 'seals') seals++; if (S.winner === 0) first++; } }
  const p = 100 * w / t; lo = Math.min(lo, p); hi = Math.max(hi, p); out += a.slice(0, 5) + ' ' + p.toFixed(1) + '  '; }
console.log(out + '| spread ' + (hi - lo).toFixed(1) + '  rounds ' + (rounds / g).toFixed(1) + '  knock-outs ' + (ko / g).toFixed(1) + '  seal wins ' + (100 * seals / g).toFixed(0) + '%  seat 1 wins ' + (100 * first / g).toFixed(0) + '%  Legacy lines ' + (ln / g).toFixed(1) + '  threads ' + (th / g).toFixed(1));
