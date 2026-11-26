// node scripts/continuo-sim.js [games] [--pairs=easy-normal,normal-hard] [--np=2] [--hand=1] [--check=N]
// Plays Continuo games between the computer players with the rules in games/continuo-core.js and checks every step
// against a separate plain reading of the rules written here, never the core's code:
//   the cards: every way of coloring the motif (a corner, its L, the other L, the other corner, a ≠ b, b ≠ c, c ≠ d,
//   two or three colors) drawn as a 4 by 4 grid, two grids the same card when a quarter turn takes one to the other:
//   42 cards, the same 42 as the core's, each lying the two ways the core allows (a half turn changes nothing);
//   where a card fits: on no square already covered, touching a square of another card along a side, and every square
//   it touches along a side the same color; the places the core offers are exactly the places the plain reading finds,
//   for every card in hand, both ways round, on the first N games (--check, default 40) and spot checks after;
//   the score: after the card is down, every chain (a run of one color joined along sides) with a square on the new
//   card and a square on another card scores its whole length, each chain once;
//   a card goes under the deck only when no card in hand fits anywhere; the cards on the table, in the deck, in hands
//   and set aside are always the 42; the totals add up; the highest total wins and equal totals share it.
// It prints the skills' results against each other and the scores games come to.
const C = require('../games/continuo-core.js');
const args = process.argv.slice(2);
const G = +(args.find(a => /^\d+$/.test(a)) || 200);
const arg = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const PAIRS = arg('pairs', 'easy-normal,normal-hard,easy-hard').split(',').map(s => s.split('-'));
const NP = +arg('np', 2), HAND = +arg('hand', 1), CHECK = +arg('check', 40);
let fail = 0;
function check(cond, msg) { if (!cond) { fail++; if (fail < 25) console.log('FAIL', msg); } }

// ── A plain reading of the cards ──
const MOTIF = ['abcd', 'bbcc', 'ccbb', 'dcba'];
function grid(k) { return MOTIF.map(r => r.split('').map(ch => k['abcd'.indexOf(ch)])); }
function turn(g) { return g.map((row, r) => row.map((_, c) => g[3 - c][r])); }   // a quarter turn clockwise
const key = g => g.map(r => r.join('')).join('/');
const plainCards = [], seenK = {};
for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++) for (let d = 0; d < 4; d++) {
  if (a === b || b === c || c === d || new Set([a, b, c, d]).size > 3) continue;
  let g = grid([a, b, c, d]); const ks = [];
  for (let i = 0; i < 4; i++) { ks.push(key(g)); g = turn(g); }
  if (ks.some(k => seenK[k])) continue;
  ks.forEach(k => { seenK[k] = 1; });
  plainCards.push(ks);
}
check(plainCards.length === 42, 'the plain reading has ' + plainCards.length + ' cards');
check(C.TILES.length === 42, 'the core has ' + C.TILES.length + ' cards');
const coreWays = C.TILES.map((_, t) => [0, 1].map(o => { const cl = C.cells(t, o); return [0, 1, 2, 3].map(r => cl.slice(r * 4, r * 4 + 4).join('')).join('/'); }));
coreWays.forEach((w, t) => {
  const pc = plainCards.find(ks => ks.indexOf(w[0]) >= 0);
  check(pc, 'card ' + t + ' is one of the plain cards');
  if (pc) { check(pc.indexOf(w[1]) >= 0, 'card ' + t + ' turned is the same card'); check(new Set(pc).size === 2 && pc.indexOf(w[0]) >= 0 && pc.indexOf(w[1]) >= 0 && w[0] !== w[1], 'card ' + t + ' lies exactly two ways'); }
});
check(new Set(coreWays.map(w => plainCards.findIndex(ks => ks.indexOf(w[0]) >= 0))).size === 42, 'no two core cards are the same card');

// ── A plain reading of the table ──
function table(pl) { const m = new Map(); pl.forEach((p, k) => { const cl = C.cells(p[0], p[1]); for (let i = 0; i < 16; i++) m.set((p[2] + (i % 4)) + ',' + (p[3] + Math.floor(i / 4)), { c: cl[i], k }); }); return m; }
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function plainFits(m, t, o, x, y) {
  const cl = C.cells(t, o); let touch = 0;
  for (let i = 0; i < 16; i++) {
    const cx = x + (i % 4), cy = y + Math.floor(i / 4);
    if (m.has(cx + ',' + cy)) return false;
    for (const [dx, dy] of SIDES) {
      const nx = cx + dx, ny = cy + dy;
      if (nx >= x && nx < x + 4 && ny >= y && ny < y + 4) continue;
      const q = m.get(nx + ',' + ny); if (!q) continue;
      touch++; if (q.c !== cl[i]) return false;
    }
  }
  return touch > 0;
}
function plainPlaces(m, t) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  m.forEach((_, k) => { const [x, y] = k.split(',').map(Number); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  const out = [];
  for (let o = 0; o < 2; o++) for (let x = x0 - 4; x <= x1 + 1; x++) for (let y = y0 - 4; y <= y1 + 1; y++) if (plainFits(m, t, o, x, y)) out.push(o + ':' + x + ':' + y);
  return out;
}
function plainScore(pl, t, o, x, y) {
  const m = table(pl.concat([[t, o, x, y]])), K = pl.length, seen = new Set(); let score = 0;
  for (let i = 0; i < 16; i++) {
    const s0 = (x + (i % 4)) + ',' + (y + Math.floor(i / 4)); if (seen.has(s0)) continue;
    const c = m.get(s0).c, stack = [s0], comp = []; seen.add(s0);
    while (stack.length) { const s = stack.pop(); comp.push(s); const [cx, cy] = s.split(',').map(Number); for (const [dx, dy] of SIDES) { const n = (cx + dx) + ',' + (cy + dy), q = m.get(n); if (q && q.c === c && !seen.has(n)) { seen.add(n); stack.push(n); } } }
    if (comp.some(s => m.get(s).k !== K)) score += comp.length;
  }
  return score;
}

// ── Games ──
let seed = 20261126;
const tally = {}, scores = [], unders = [];
let games = 0, checked = 0;
for (const [A, B] of PAIRS) {
  const key2 = A + '-' + B; tally[key2] = { [A]: 0, [B]: 0, tie: 0, pts: { [A]: 0, [B]: 0 } };
  for (let g = 0; g < G; g++) {
    const seats = []; for (let i = 0; i < NP; i++) seats.push((i + g) % 2 ? B : A);
    const st = C.newGame({ np: NP, hand: HAND, seed: seed++ });
    const full = games < CHECK; games++;
    let un = 0;
    check(st.pl.length === 1 && st.pl[0][2] === 0 && st.pl[0][3] === 0, 'the first card is turned up in the middle');
    while (!st.over) {
      const before = C.clone(st), m = table(st.pl), hand = st.hands[st.turn].slice();
      const fitsNow = hand.map(t => plainPlaces(m, t));
      if (full || st.n % 7 === 0) {
        checked++;
        hand.forEach((t, i) => {
          const core = C.allFits(C.boardFor(st), t).map(f => f.o + ':' + f.x + ':' + f.y).sort(), plain = fitsNow[i].slice().sort();
          check(core.join() === plain.join(), 'the places card ' + t + ' fits: core ' + core.length + ', plain ' + plain.length);
          C.allFits(C.boardFor(st), t).slice(0, 12).forEach(f => check(f.s === plainScore(st.pl, t, f.o, f.x, f.y), 'score of ' + t + ' at ' + f.x + ',' + f.y + ': core ' + f.s + ' plain ' + plainScore(st.pl, t, f.o, f.x, f.y)));
        });
      }
      const r = C.search(st, { level: seats[st.turn], seed: seed++ }), mv = C.parse(r.move), p = st.turn;
      const res = C.play(st, r.move);
      check(res, 'the core takes its own move ' + r.move);
      if (!res) break;
      if (mv.aside) { un++; check(fitsNow.every(f => !f.length), 'a card goes under the deck only when nothing in hand fits'); }
      else {
        check(plainFits(m, mv.t, mv.o, mv.x, mv.y), 'the card fits where it went: ' + r.move);
        const ps = plainScore(before.pl, mv.t, mv.o, mv.x, mv.y);
        check(res.s === ps, 'points for ' + r.move + ': core ' + res.s + ', plain ' + ps);
        check(st.sc[p] === before.sc[p] + ps, 'the total grows by the points');
      }
      let n = st.pl.length + st.deck.length + st.aside.length; st.hands.forEach(h => { n += h.length; });
      const all = new Set(st.pl.map(q => q[0]).concat(st.deck, st.aside, ...st.hands));
      check(n === 42 && all.size === 42, 'the 42 cards are all accounted for');
      st.hands.forEach(h => check(h.length <= HAND, 'no hand holds more than ' + HAND));
    }
    const sum = st.sc.map((_, i) => st.pl.filter(q => q[4] === i).reduce((a, q) => a + q[5], 0));
    check(sum.join() === st.sc.join(), 'the totals are the cards’ points added up');
    const top = Math.max(...st.sc);
    check(st.win.join() === st.sc.map((v, i) => v === top ? i : -1).filter(i => i >= 0).join(), 'the highest total wins');
    check(st.deck.length === 0 && st.hands.every(h => !h.length), 'the game ends with every card played');
    unders.push(un); scores.push(...st.sc);
    const T = tally[key2];
    st.sc.forEach((v, i) => { T.pts[seats[i]] += v; });
    if (st.win.length > 1) T.tie++; else T[seats[st.win[0]]]++;
  }
}
console.log('Continuo sim: ' + games + ' games of ' + NP + ' players, ' + HAND + ' card' + (HAND > 1 ? 's' : '') + ' in hand; ' + checked + ' positions checked in full against the plain reading');
for (const k in tally) {
  const [A, B] = k.split('-'), T = tally[k], n = T[A] + T[B] + T.tie, pa = T.pts[A] / (n * NP / 2), pb = T.pts[B] / (n * NP / 2);
  console.log('  ' + A + ' against ' + B + ': ' + A + ' won ' + T[A] + ', ' + B + ' won ' + T[B] + ', ' + T.tie + ' ties; ' + A + ' scored ' + pa.toFixed(1) + ' a seat, ' + B + ' ' + pb.toFixed(1));
}
scores.sort((a, b) => a - b);
console.log('  scores: lowest ' + scores[0] + ', middle ' + scores[scores.length >> 1] + ', highest ' + scores[scores.length - 1] + '; cards under the deck a game: ' + (unders.reduce((a, b) => a + b, 0) / unders.length).toFixed(2));
console.log(fail ? fail + ' FAILURES' : 'Every step agreed with the plain reading.');
process.exit(fail ? 1 : 0);
