// Poker: the chance each Hold'em starting hand wins before the flop, against 1 to 9 opponents holding any cards,
// written into games/poker.html between /*==PREFLOP==*/ and /*==/PREFLOP==*/.
// Exact counting is out of reach before the flop (billions of deals), so every one of the 169 starting hands is dealt
// out against random hands and random boards a great many times: 1.5 million deals heads-up, 250,000 against 2 or more,
// which puts every number within about a tenth of a percent. A tie counts as an equal share of the pot.
// It uses the game's own hand evaluator, read out of poker.html. Run: node scripts/build-preflop-odds.js
'use strict';
const fs = require('fs'), path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const FILE = path.join(__dirname, '..', 'games', 'poker.html');
const HU = 1500000, MULTI = 250000, MAXOPP = 9;

function evaluator() {
  const s = fs.readFileSync(FILE, 'utf8');
  const a = s.indexOf('// ── Hand evaluator'), b = s.indexOf('  function catOf', a);
  if (a < 0 || b < 0) throw new Error('evaluator not found in poker.html');
  return new Function(s.slice(a, b) + '\nreturn ev;')();
}
// the 169 starting hands as a 13 x 13 grid: pairs on the diagonal, suited above it (row = higher rank), offsuit below
function classOf(i) { const r = Math.floor(i / 13), c = i % 13; return r === c ? { hi: r, lo: r, suited: false } : r > c ? { hi: r, lo: c, suited: true } : { hi: c, lo: r, suited: false }; }

if (isMainThread) {
  const t0 = Date.now(), jobs = [], N = 4, res = [];
  for (let w = 0; w < N; w++) jobs.push(new Promise((ok, no) => {
    const wk = new Worker(__filename, { workerData: { w, N } });
    wk.on('message', (m) => { res.push(...m); }); wk.on('error', no); wk.on('exit', ok);
  }));
  Promise.all(jobs).then(() => {
    const table = [];
    for (let k = 1; k <= MAXOPP; k++) {
      const row = [];
      for (let i = 0; i < 169; i++) row.push(Math.round(res.find((x) => x.i === i && x.k === k).eq * 1000));
      table.push(row.join(','));
    }
    const line = "/*==PREFLOP==*/var PREFLOP = '" + table.join(';') + "';/*==/PREFLOP==*/";
    let s = fs.readFileSync(FILE, 'utf8');
    s = s.replace(/\/\*==PREFLOP==\*\/[\s\S]*?\/\*==\/PREFLOP==\*\//, line);
    fs.writeFileSync(FILE, s);
    const aa = res.find((x) => x.i === 12 * 13 + 12 && x.k === 1).eq, k72 = res.find((x) => x.i === 0 * 13 + 5 && x.k === 1).eq;
    console.log('done in ' + Math.round((Date.now() - t0) / 1000) + 's: AA ' + (aa * 100).toFixed(1) + '%, 72o ' + (k72 * 100).toFixed(1) + '% heads-up');
  });
} else {
  const ev = evaluator(), { w, N } = workerData, out = [];
  let seed = 0x9e3779b9 ^ (w * 7919 + 1);
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const deck = new Int32Array(52), seven = [0, 0, 0, 0, 0, 0, 0];
  for (let i = w; i < 169; i += N) {
    const c = classOf(i);
    for (let k = 1; k <= MAXOPP; k++) {
      const trials = k === 1 ? HU : MULTI;
      let share = 0;
      for (let t = 0; t < trials; t++) {
        // a concrete hand of this class, its suits picked at random
        const s1 = Math.floor(rnd() * 4); let s2 = c.suited ? s1 : Math.floor(rnd() * 3); if (!c.suited && s2 >= s1) s2++;
        const h1 = c.hi * 4 + s1, h2 = c.lo * 4 + s2;
        let n = 0; for (let x = 0; x < 52; x++) if (x !== h1 && x !== h2) deck[n++] = x;
        const need = 5 + 2 * k;
        for (let x = 0; x < need; x++) { const j = x + Math.floor(rnd() * (n - x)), tmp = deck[x]; deck[x] = deck[j]; deck[j] = tmp; }
        seven[0] = h1; seven[1] = h2; for (let x = 0; x < 5; x++) seven[2 + x] = deck[x];
        const me = ev(seven); let ties = 0, lost = false;
        for (let o = 0; o < k; o++) {
          seven[0] = deck[5 + 2 * o]; seven[1] = deck[6 + 2 * o];
          const v = ev(seven); if (v > me) { lost = true; break; } if (v === me) ties++;
        }
        if (!lost) share += 1 / (ties + 1);
      }
      out.push({ i, k, eq: share / trials });
    }
  }
  parentPort.postMessage(out);
}
