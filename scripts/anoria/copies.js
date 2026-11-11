// How many copies of one card should a deck be allowed? Two tests, each with and without "one of each person on your
// side of the table at a time" (cfg.unique).
//   node scripts/anoria/copies.js star [games per opponent]   one strong card at 1, 2, 3, 4 and 6 copies in its ready deck
//   node scripts/anoria/copies.js cap  [games per opponent]   whole decks built to a cap: the deck's strongest cards, as many copies of each as the cap allows
const { play, PROF, STD } = require('../../games/anoria/engine'); const { ARCH, CARDS } = require('../../games/anoria/cards');
const part = process.argv[2] || 'star', n = +process.argv[3] || 30, D = Object.keys(ARCH), DECK = require('../../games/anoria/coll').DECK;
const style = { Explorers: 'raider', Legion: 'brawler', Legacy: 'keeper', Court: 'holder', Pathfinders: 'raider' }, base = k => ARCH[k].cards.concat(ARCH[k].cards);
// strongest first (win rate when played, from fin-cards.txt), for choosing what a capped deck keeps
const RANK = require('fs').readFileSync(__dirname + '/fin-cards.txt', 'utf8').split('WIN RATE WHEN THE CARD WAS PLAYED')[1].split('\n\n')[0].split('\n').map(l => l.trim().replace(/ \[.*$/, '')).filter(Boolean);
const rank = k => { const i = RANK.indexOf(CARDS[k].n); return i < 0 ? 99 : i; };
function run(deck, name, cfg, seed0) {   // this deck against the four other ready decks
  let w = 0, g = 0, seen = 0;
  for (const b of D) { if (b === name) continue;
    for (let i = 0; i < n; i++) { const fl = i & 1, S = play(fl ? [base(b), deck] : [deck, base(b)], fl ? [ARCH[b].guide, ARCH[name].guide] : [ARCH[name].guide, ARCH[b].guide], fl ? [PROF[style[b]], PROF[style[name]]] : [PROF[style[name]], PROF[style[b]]], cfg, seed0 + i * 7 + D.indexOf(b) * 1000);
      const me = fl ? 1 : 0; g++; w += S.winner < 0 ? 0.5 : S.winner === me ? 1 : 0; seen += Object.keys(S.st.played[me]).length; } }
  return { win: 100 * w / g, seen: seen / g, g };
}
const U = Object.assign({}, STD, { unique: 1 });
if (part === 'star') {
  const stars = { Legion: ['charlemagne', 'leonidas'], Court: ['hatshepsut', 'elizabeth'], Legacy: ['alexander', 'newton'], Explorers: ['zhenghe', 'copernicus'], Pathfinders: ['imhotep', 'beowulf'] };
  const withK = (name, x, k) => {   // k copies of x; the weakest other cards give up (or take) the room, never below one copy
    const cnt = {}; ARCH[name].cards.forEach(c => cnt[c] = 2); cnt[x] = k;
    const others = ARCH[name].cards.filter(c => c !== x).sort((a, b) => rank(b) - rank(a)); let tot = DECK - 2 + k, i = 0;
    while (tot > DECK) { const c = others[i++ % others.length]; if (cnt[c] > 1) { cnt[c]--; tot--; } }
    while (tot < DECK) { cnt[others[others.length - 1 - (i++ % others.length)]]++; tot++; }
    const out = []; Object.keys(cnt).forEach(c => { for (let j = 0; j < cnt[c]; j++) out.push(c); }); return out;
  };
  const K = [1, 2, 3, 4, 6], sum = {}, sumU = {}; K.forEach(k => { sum[k] = [0, 0]; sumU[k] = [0, 0]; });
  console.log('ONE STRONG CARD AT k COPIES (' + (n * 4) + ' games per cell): win % of its deck against the other four ready decks\n' + 'card'.padEnd(22) + K.map(k => (k + ' cop').padStart(8)).join('') + '   |  one of each person at a time:' + [3, 4, 6].map(k => (k + ' cop').padStart(8)).join(''));
  for (const name of D) for (const x of stars[name]) {
    let row = (CARDS[x].n + ' (' + name.slice(0, 4) + ')').padEnd(22), rowU = '';
    for (const k of K) { const r = run(withK(name, x, k), name, STD, 4200); sum[k][0] += r.win; sum[k][1]++; row += r.win.toFixed(1).padStart(8); if (k >= 3) { const u = run(withK(name, x, k), name, U, 4200); sumU[k][0] += u.win; sumU[k][1]++; rowU += u.win.toFixed(1).padStart(8); } }
    console.log(row + '   |                                 ' + rowU);
  }
  console.log('AVERAGE'.padEnd(22) + K.map(k => (sum[k][0] / sum[k][1]).toFixed(1).padStart(8)).join('') + '   |                                 ' + [3, 4, 6].map(k => (sumU[k][0] / sumU[k][1]).toFixed(1).padStart(8)).join(''));
}
if (part === 'cap') {
  const capped = (name, L) => { const cs = ARCH[name].cards.slice().sort((a, b) => rank(a) - rank(b)), out = []; for (const c of cs) for (let j = 0; j < L && out.length < DECK; j++) out.push(c); return out; };
  console.log('WHOLE DECKS BUILT TO A CAP (' + (n * 4) + ' games per cell): the deck\'s strongest cards, as many copies as the cap allows\n' + 'deck'.padEnd(14) + ['2 (today)', 'cap 3', 'cap 4', 'cap 6'].map(x => x.padStart(11)).join('') + '   | one of each person:' + ['cap 3', 'cap 4', 'cap 6'].map(x => x.padStart(9)).join('') + '   | different cards played per game: 2, 3, 4, 6');
  const tot = {}, totU = {};
  for (const name of D) { let row = name.padEnd(14), rowU = '', sv = [];
    for (const L of [2, 3, 4, 6]) { const r = run(capped(name, L), name, STD, 5200); row += r.win.toFixed(1).padStart(11); sv.push(r.seen.toFixed(1)); (tot[L] = tot[L] || []).push(r.win);
      if (L > 2) { const u = run(capped(name, L), name, U, 5200); rowU += u.win.toFixed(1).padStart(9); (totU[L] = totU[L] || []).push(u.win); } }
    console.log(row + '   |                    ' + rowU + '   | ' + sv.join(', ')); }
  const av = a => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1);
  console.log('AVERAGE'.padEnd(14) + [2, 3, 4, 6].map(L => av(tot[L]).padStart(11)).join('') + '   |                    ' + [3, 4, 6].map(L => av(totU[L]).padStart(9)).join(''));
}
