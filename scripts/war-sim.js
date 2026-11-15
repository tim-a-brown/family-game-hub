// node scripts/war-sim.js [games]: plays War games with the rules in games/war-core.js for every table size and
// option, checks the rules hold at every step (the cards are always all there, nobody lays out of turn, every game
// ends), and prints how long games run and how often the rare moments come.
const C = require('../games/war-core.js');
const N = +(process.argv[2] || 2000);
function check(st, deck) {
  const all = [];
  st.piles.forEach(p => p.forEach(c => all.push(c))); st.tbl.forEach(t => t.forEach(x => all.push(x.c)));
  if (all.length !== deck) throw new Error('cards: ' + all.length + ' of ' + deck);
  if (new Set(all).size !== all.length) throw new Error('a card twice');
}
function pct(a, k) { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * k))]; }
const VARIANTS = [
  { n: 2, o: {} }, { n: 2, o: { shuffle: 0 } }, { n: 2, o: { down: 1 } }, { n: 2, o: { aces: 'low' } }, { n: 2, o: { aces: 'two' } },
  { n: 2, o: { rounds: 100 } }, { n: 3, o: {} }, { n: 3, o: { shuffle: 0 } }, { n: 4, o: {} }, { n: 4, o: { shuffle: 0, down: 1 } }
];
let fail = 0;
VARIANTS.forEach(V => {
  const len = [], why = {}, wins = new Array(V.n).fill(0); let dbl = 0, tri = 0, ace2 = 0, back = 0, comeback = 0, long = 0;
  for (let g = 0; g < N; g++) {
    const pl = []; for (let i = 0; i < V.n; i++) pl.push({ name: 'P' + i, cpu: i > 0 });
    const st = C.newGame(pl, V.o, g * 7919 + 13), deck = C.total(st);
    let steps = 0;
    try {
      while (st.phase !== 'over') {
        const t = C.turn(st);
        if (!t.length) throw new Error('nobody to move');
        const w = C.waiting(st);
        if (t.some(p => w.indexOf(p) < 0)) throw new Error('turn outside the battle');
        const mv = C.lay(st, t[0]);
        if (!mv) throw new Error('no move for ' + t[0]);
        if (!mv.res && C.waiting(st).indexOf(t[0]) >= 0) throw new Error('still waiting on a player who laid');
        if (mv.res) {
          if (mv.res.k === 'take' && mv.res.wars === 2) dbl++;
          if (mv.res.k === 'take' && mv.res.wars >= 3) tri++;
          if (mv.res.ace2) ace2++;
          if (mv.res.k === 'back') back++;
        }
        check(st, deck);
        if (++steps > 200000) throw new Error('runaway');
      }
    } catch (e) { fail++; if (fail < 5) console.log('FAIL', JSON.stringify(V), 'game', g, e.message); continue; }
    len.push(st.round - 1); why[st.why] = (why[st.why] || 0) + 1;
    if (st.winner >= 0) { wins[st.winner]++; if (st.lo[st.winner] < 5 && st.why === 'all') comeback++; }
    if (st.round - 1 >= 600) long++;
  }
  const avg = len.reduce((a, b) => a + b, 0) / len.length;
  console.log(V.n + 'p ' + JSON.stringify(V.o).padEnd(28) + ' rounds avg ' + avg.toFixed(0).padStart(5) + '  median ' + String(pct(len, .5)).padStart(5) + '  90% ' + String(pct(len, .9)).padStart(5) +
    '  ends ' + JSON.stringify(why) + '  wins ' + wins.join('/') + '  per game: double ' + (dbl / N).toFixed(2) + ' triple+ ' + (tri / N).toFixed(3) + ' 2-takes-A ' + (ace2 / N).toFixed(2) +
    ' back ' + back + '  comeback ' + (100 * comeback / N).toFixed(1) + '%  600+ rounds ' + (100 * long / N).toFixed(1) + '%');
});
console.log(fail ? fail + ' FAILED' : 'every game followed the rules and ended');
process.exit(fail ? 1 : 0);
