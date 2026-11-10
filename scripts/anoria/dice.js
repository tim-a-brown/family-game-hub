// What the clash dice do. Each side adds one die to its Might in a clash (today a die of 0, 1, 2).
//   node scripts/anoria/dice.js [games]   compares no dice, 0-2, 0-3 and a full d6
const { play, PROF, STD } = require('../../games/anoria/engine'); const { ARCH } = require('../../games/anoria/cards');
const n = +process.argv[2] || 300, D = Object.keys(ARCH), dk = k => ARCH[k].cards.concat(ARCH[k].cards);
console.log('die'.padEnd(16) + 'clashes/game  decided by the die  upsets  stand-offs  Normal robot beats Easy  rounds');
for (const [label, die] of [['no dice', [0]], ['0, 1, 2 (today)', [0, 1, 2]], ['0 to 3', [0, 1, 2, 3]], ['a full d6', [1, 2, 3, 4, 5, 6]]]) {
  const cfg = Object.assign({}, STD, { die, log: 1 }); let cl = 0, flip = 0, up = 0, tie = 0, w = 0, rounds = 0;
  for (let i = 0; i < n; i++) { const a = D[i % 5], b = D[(i * 3 + 1) % 5], fl = i & 1;
    const S = play(fl ? [dk(b), dk(a)] : [dk(a), dk(b)], fl ? [ARCH[b].guide, ARCH[a].guide] : [ARCH[a].guide, ARCH[b].guide], fl ? [PROF.novice, PROF.holder] : [PROF.holder, PROF.novice], cfg, 3100 + i * 11);
    const me = fl ? 1 : 0; w += S.winner < 0 ? 0.5 : S.winner === me ? 1 : 0; rounds += S.round;
    for (const e of S.ev) if (e.t === 'clash') { cl++; const ba = e.am - e.da, bd = e.dm - e.dd, was = Math.sign(ba - bd), now = Math.sign(e.am - e.dm); if (was !== now) flip++; if (now === 0) tie++; if (now !== 0 && was !== 0 && now !== was) up++; } }
  console.log(label.padEnd(16) + (cl / n).toFixed(1).padStart(8) + (100 * flip / cl).toFixed(0).padStart(16) + '%' + (100 * up / cl).toFixed(0).padStart(12) + '%' + (100 * tie / cl).toFixed(0).padStart(9) + '%' + (100 * w / n).toFixed(1).padStart(18) + '%' + (rounds / n).toFixed(1).padStart(14));
}
