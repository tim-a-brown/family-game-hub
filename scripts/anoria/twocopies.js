// Does a second copy of a card add much to the first? Each ready deck plays the other four with none of the card,
// with one copy in place of one copy of a card it already has, and with two copies in place of both: its own Guide
// and robot style, as in endings.js. A card built so that two copies can't be pushed too far shows a small step from
// one copy to two.
//   node scripts/anoria/twocopies.js <card> [games per pair and seat] [first seed] ['<json of rule changes>']
//   e.g. node scripts/anoria/twocopies.js walls 150 52000 '{"cards":{"walls":{"c":5}}}'
// "cards" in the json tries other numbers on a card without touching cards.js; any other key is a rule (cfg), such as
// '{"wallsOnce":1}' (the Theodosian Walls once a game for each player).
'use strict';
const { play, PROF, STD } = require('../../games/anoria/engine'); const { ARCH, CARDS } = require('../../games/anoria/cards');
const K = process.argv[2], n = +process.argv[3] || 100, seed0 = +process.argv[4] || 52000, cfg = Object.assign({}, STD, JSON.parse(process.argv[5] || '{}'));
if (!CARDS[K]) { console.log('no card ' + K); process.exit(1); }
if (cfg.cards) { Object.keys(cfg.cards).forEach(k => Object.assign(CARDS[k], cfg.cards[k])); delete cfg.cards; }
const D = Object.keys(ARCH), style = { Explorers: 'raider', Legion: 'brawler', Legacy: 'keeper', Court: 'holder', Pathfinders: 'raider' };
// (the card it takes the place of: the deck's last card, one of the five it gained when decks grew to 40)
const deck = (d, copies) => { const c = ARCH[d].cards, out = c.concat(c), out0 = c[c.length - 1]; let left = copies; return out.map(x => (x === out0 && left-- > 0 ? K : x)); };
const res = {}; let g = 0;
for (const copies of [0, 1, 2]) { res[copies] = {};
  for (const d of D) { let w = 0, t = 0, used = 0;
    for (const o of D) { if (o === d) continue;
      for (let i = 0; i < 2 * n; i++) { const fl = i & 1, names = fl ? [o, d] : [d, o], decks = fl ? [deck(o, 0), deck(d, copies)] : [deck(d, copies), deck(o, 0)];
        const S = play(decks, names.map(k => ARCH[k].guide), names.map(k => PROF[style[k]]), cfg, seed0 + (g++ % (2 * n * 20)));
        const me = fl ? 1 : 0; w += S.winner === me ? 1 : S.winner < 0 ? 0.5 : 0; t++; if (S.st.played[me][K]) used++; } }
    res[copies][d] = [w, t, used]; } }
const pc = (a, b) => (100 * a / b).toFixed(1);
console.log(CARDS[K].n + ' (' + K + ', cost ' + CARDS[K].c + '), each ready deck against the other four, ' + (2 * n) + ' games a pair, first seed ' + seed0 + (process.argv[5] ? ', ' + process.argv[5] : '') + '. The same seeds for each number of copies.');
console.log('                 none     one      two      one-none  two-one   played in (one, two)');
let s = [0, 0, 0], tt = 0;
for (const d of D) { const r = [0, 1, 2].map(c => 100 * res[c][d][0] / res[c][d][1]); s = s.map((v, i) => v + r[i]); tt++;
  console.log('  ' + (d + '            ').slice(0, 13) + r.map(v => ('     ' + v.toFixed(1)).slice(-6) + '%  ').join('') + ((r[1] - r[0] >= 0 ? '+' : '') + (r[1] - r[0]).toFixed(1) + '      ').slice(0, 10) + ((r[2] - r[1] >= 0 ? '+' : '') + (r[2] - r[1]).toFixed(1) + '      ').slice(0, 10) + pc(res[1][d][2], res[1][d][1]) + '%, ' + pc(res[2][d][2], res[2][d][1]) + '%'); }
const m = s.map(v => v / tt);
console.log('  all          ' + m.map(v => ('     ' + v.toFixed(1)).slice(-6) + '%  ').join('') + ((m[1] - m[0] >= 0 ? '+' : '') + (m[1] - m[0]).toFixed(1) + '      ').slice(0, 10) + ((m[2] - m[1] >= 0 ? '+' : '') + (m[2] - m[1]).toFixed(1)));
