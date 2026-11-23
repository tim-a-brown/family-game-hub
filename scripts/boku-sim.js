// node scripts/boku-sim.js [games] [hardGames]: plays Boku games between the computer players with the rules in
// games/boku-core.js and checks the rules hold at every step, with a separate plain reading of the rules written here
// (its own board from coordinates, its own sandwich test, its own scan of every line for five), never the core's code:
//   every move played puts a marble into an empty hole, never the hole the other player emptied by a capture the turn
//   before; a capture takes one of exactly two of the other color trapped in a straight line between the new marble
//   and another of the mover's own; a move that makes five takes nothing;
//   a game ends exactly when the scan finds five or more in a row (for the player who just moved) or the board fills;
//   marbles add up: on the board plus taken is the number each side has placed.
// It prints the skills' results against each other, how long games run and how often captures come.
const C = require('../games/boku-core.js');
const G = +(process.argv[2] || 400), GH = +(process.argv[3] || 40);
let seed = 4242;
function rnd() { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

// ── A plain reading of the rules ──
// the board: rows of 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5 from the top, laid out on a triangular grid. A hole is at
// (column x2 = twice its horizontal place, row y); its six neighbours are (x2 +-2, y) and (x2 +-1, y +-1).
const ROWLEN = [5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5];
const HOLES = [];   // {x2, y}, in the core's order (row by row from the top, left to right)
ROWLEN.forEach((n, y) => { for (let j = 0; j < n; j++) HOLES.push({ x2: 2 * j - (n - 1), y }); });
function holeAt(x2, y) { for (let i = 0; i < HOLES.length; i++) if (HOLES[i].x2 === x2 && HOLES[i].y === y) return i; return -1; }
const STEPS = [[2, 0], [1, -1], [-1, -1], [-2, 0], [-1, 1], [1, 1]];
function walk(h, s, k) { return holeAt(HOLES[h].x2 + s[0] * k, HOLES[h].y + s[1] * k); }
// five or more of a color in a straight line anywhere on the board
function fiveOn(b, color) {
  for (let h = 0; h < HOLES.length; h++) {
    if (b[h] !== color) continue;
    for (const s of STEPS.slice(0, 3)) {
      let n = 1; while (n < 5) { const t = walk(h, s, n); if (t < 0 || b[t] !== color) break; n++; }
      if (n >= 5) return true;
    }
  }
  return false;
}
function trapped(b, h, color) {   // the other color's marbles a marble of color placed on h would trap, each once
  const o = 3 - color, out = [];
  for (const s of STEPS) {
    const a = walk(h, s, 1), a2 = walk(h, s, 2), e = walk(h, s, 3);
    if (a >= 0 && a2 >= 0 && e >= 0 && b[a] === o && b[a2] === o && b[e] === color) { if (!out.includes(a)) out.push(a); if (!out.includes(a2)) out.push(a2); }
  }
  return out;
}

let fail = 0;
function check(cond, msg) { if (!cond) { fail++; if (fail < 20) console.log('FAIL', msg); } }
check(HOLES.length === 80 && C.N === 80, 'eighty holes');
// the core's neighbours agree with the plain board's
for (let h = 0; h < 80; h++) for (let d = 0; d < 6; d++) {
  const mine = walk(h, [[2, 0], [1, -1], [-1, -1], [-2, 0], [-1, 1], [1, 1]][d], 1);
  if (C.nb(h, d) !== mine) { check(false, 'neighbour ' + C.NAMES[h] + ' ' + d); break; }
}

function playGame(lv) {
  const st = C.newGame(), b = new Array(80).fill(0), placed = [0, 0, 0];
  let forbidden = -1, caps = 0, ends = null;
  while (!st.over) {
    const side = st.turn, L = Object.assign({}, C.LEVELS[lv[side - 1]], { rnd });
    if (L.time) { L.time = 0; L.depth = Math.min(L.depth, 4); }
    const res = C.search(st.b, side, st.blk, st.caps, L);
    const mv = C.parse(res.move);
    check(mv, 'unparsable ' + res.move);
    // the plain reading
    check(st.blk === forbidden, 'blocked hole ' + st.blk + ' vs ' + forbidden);
    if (mv.pass) { check(b.every((v, i) => v || i === forbidden), 'passed with a hole free'); forbidden = -1; C.play(st, 'pass'); continue; }
    check(b[mv.c] === 0, 'placed on a marble');
    check(mv.c !== forbidden, 'placed on the hole just emptied');
    b[mv.c] = side; placed[side]++;
    const won = fiveOn(b, side);
    const before = b.slice(); before[mv.c] = 0;
    const tr = trapped(before, mv.c, side);
    if (mv.x >= 0) { check(!won, 'captured with a winning move'); check(tr.includes(mv.x), 'captured a marble not trapped ' + res.move); }
    // every capture the plain reading allows, the core allows (on a copy)
    if (!won) for (const x of tr) { const cp = C.clone(st); check(C.play(cp, C.encode(mv.c, x)), 'core refused a capture ' + C.encode(mv.c, x)); }
    // a capture of a marble not trapped is refused
    if (!won) for (let x = 0; x < 80; x++) if (before[x] === 3 - side && !tr.includes(x)) { const cp = C.clone(st); if (C.play(cp, C.encode(mv.c, x))) { check(false, 'core took an untrapped marble'); break; } }
    const r = C.play(st, res.move);
    check(r, 'core refused its own move ' + res.move);
    forbidden = -1;
    if (mv.x >= 0) { b[mv.x] = 0; forbidden = mv.x; caps++; }
    const full = b.every(v => v);
    check(st.b.join('') === b.join(''), 'boards differ');
    check(st.over === (won || full), 'end rule (won ' + won + ', full ' + full + ', over ' + st.over + ')');
    if (won) { check(st.winner === side, 'winner'); ends = 'five'; }
    else if (full) { check(st.draw && !st.winner, 'draw'); ends = 'full'; }
    for (const s of [1, 2]) check(C.count(st.b, s) + st.caps[3 - s] === placed[s], 'marbles add up');
    // the core passes for a player whose only free hole is the forbidden one
    if (!st.over && st.ml[st.ml.length - 1] === 'pass') { check(b.every((v, i) => v || i === forbidden), 'pass with a hole free'); forbidden = -1; }
  }
  return { winner: st.winner, n: st.n, caps, ends, dbl: st.dbl[1] + st.dbl[2] };
}

// Hand-made cases
(function cases() {
  function set(spec) { const st = C.newGame(); spec.w.split(' ').filter(Boolean).forEach(n => st.b[C.idx(n)] = 1); spec.b.split(' ').filter(Boolean).forEach(n => st.b[C.idx(n)] = 2); st.turn = spec.turn || 1; return st; }
  // row F has 10 holes: W on F1, B on F2 F3, W places F4: captures one of F2, F3
  let st = set({ w: 'F1', b: 'F2 F3' });
  check(C.play(C.clone(st), 'F4 xF2') && C.play(C.clone(st), 'F4 xF3'), 'sandwich capture either one');
  check(C.play(C.clone(st), 'F4'), 'capture is optional');
  check(!C.play(C.clone(st), 'F4 xF1'), 'own marble never taken');
  st = set({ w: 'F1', b: 'F2' }); check(!C.play(C.clone(st), 'F3 xF2'), 'one marble is not a sandwich');
  st = set({ w: 'F1', b: 'F2 F3 F4' }); check(!C.play(C.clone(st), 'F5 xF2'), 'three marbles are not a sandwich');
  // the forbidden hole: after W takes F3, Black may not play F3, but may next turn after
  st = set({ w: 'F1', b: 'F2 F3' }); C.play(st, 'F4 xF3');
  check(st.blk === C.idx('F3') && !C.play(C.clone(st), 'F3'), 'the just-emptied hole is forbidden');
  C.play(st, 'A1'); C.play(st, 'A2'); check(C.play(C.clone(st), 'F3'), 'the hole is free again a turn later');
  // a five wins, and takes nothing
  st = set({ w: 'F1 F2 F3 F4', b: 'E1' }); check(C.play(C.clone(st), 'F5').five, 'five wins');
  st = set({ w: 'F1 F2 F3 F4', b: 'G1 G2' }); st.b[C.idx('H1')] = 1;
  // F5 makes five; no capture may go with it
  check(!C.play(C.clone(st), 'F5 xG1'), 'no capture with a winning move');
  // six in a row wins too
  st = set({ w: 'F1 F2 F3 F5 F6', b: '' }); check(C.play(C.clone(st), 'F4').five.length === 6, 'six in a row wins');
  // a marble placed between two of the other's is safe
  st = set({ w: 'F1 F4', b: 'F2', turn: 2 }); C.play(st, 'F3'); check(st.b[C.idx('F2')] === 2 && st.b[C.idx('F3')] === 2, 'placing into a sandwich is safe');
})();

function series(a, bLv, n, label) {
  const res = { a: 0, b: 0, d: 0 }, len = []; let caps = 0, dbl = 0;
  for (let g = 0; g < n; g++) {
    const aWhite = g % 2 === 0, lv = aWhite ? [a, bLv] : [bLv, a];
    const r = playGame(lv);
    if (!r.winner) res.d++; else if ((r.winner === 1) === aWhite) res.a++; else res.b++;
    len.push(r.n); caps += r.caps; dbl += r.dbl;
  }
  len.sort((x, y) => x - y);
  console.log(label.padEnd(18), a, res.a, ' ', bLv, res.b, '  draws', res.d, '  turns: median', len[len.length >> 1], 'max', len[len.length - 1],
    '  per game: captures', (caps / n).toFixed(2), 'double threats', (dbl / n).toFixed(2));
  return res;
}
const t0 = Date.now();
series('easy', 'easy', G, 'Easy vs Easy');
series('easy', 'normal', G, 'Easy vs Normal');
series('normal', 'normal', Math.max(10, G >> 2), 'Normal vs Normal');
series('normal', 'hard', GH, 'Normal vs Hard');
series('easy', 'hard', Math.max(6, GH >> 1), 'Easy vs Hard');
console.log(fail ? fail + ' FAILURES' : 'All checks passed', ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
process.exit(fail ? 1 : 0);
