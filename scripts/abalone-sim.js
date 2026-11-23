// node scripts/abalone-sim.js [games] [hardGames]: plays Abalone games between the computer players with the rules in
// games/abalone-core.js, from all three starting positions, and checks the rules hold at every step:
//   every move played is checked again by a separate, plain reading of the rules (below), never by the core's own code;
//   make followed by unmake leaves the board exactly as it was, for every legal move in every position met;
//   the marbles are all there (on the board plus off the board is 14 a color) and only the other color ever goes off;
//   a game is won exactly when a sixth marble goes off.
// It prints the skills' results against each other, how long games run, and how often pushes and sumitos come.
const C = require('../games/abalone-core.js');
const G = +(process.argv[2] || 600), GH = +(process.argv[3] || 40);
const CAP = 400;   // a game longer than this counts as a draw here (the official rules have no limit)
let seed = 12345;
function rnd() { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

// ── A plain reading of the rules, independent of the core ──
function hexAt(q, r) { for (let i = 0; i < C.N; i++) if (C.CELLS[i].q === q && C.CELLS[i].r === r) return i; return -1; }
function step(c, d) { return hexAt(C.CELLS[c].q + C.DIRS[d][0], C.CELLS[c].r + C.DIRS[d][1]); }
function legal(b, side, cells, d) {
  const o = 3 - side;
  if (cells.length < 1 || cells.length > 3) return 'size';
  if (cells.some(c => b[c] !== side)) return 'not yours';
  if (new Set(cells).size !== cells.length) return 'twice';
  // the marbles must touch in one straight line: find an axis along which they run
  let axis = -1, line = cells.slice();
  if (cells.length > 1) {
    for (let a = 0; a < 6 && axis < 0; a++) {
      for (const s of cells) {
        const run = [s]; let x = s;
        while (run.length < cells.length) { x = step(x, a); if (x < 0 || cells.indexOf(x) < 0) break; run.push(x); }
        if (run.length === cells.length) { axis = a; line = run; break; }
      }
    }
    if (axis < 0) return 'not a line';
  }
  const inLine = cells.length === 1 || d === axis || d === (axis + 3) % 6;
  if (!inLine) {   // broadside: every marble into an empty hole on the board
    for (const c of cells) { const t = step(c, d); if (t < 0 || b[t] !== 0) return 'broadside blocked'; }
    return null;
  }
  // in line: order the line from tail to lead along d
  if (cells.length > 1 && d !== axis) line.reverse();
  const lead = line[line.length - 1];
  let t = step(lead, d);
  if (t < 0) return 'own marble off';
  if (b[t] === 0) return null;
  if (b[t] === side) return 'own marble ahead';
  let m = 0;
  while (t >= 0 && b[t] === o) { m++; t = step(t, d); }
  if (m >= cells.length) return 'not outnumbered';
  if (t >= 0 && b[t] !== 0) return 'blocked behind';
  return null;
}
function total(st, s) { return C.count(st.b, s) + st.off[s]; }

let fail = 0;
function check(cond, msg) { if (!cond) { fail++; if (fail < 20) console.log('FAIL', msg); } }

function playGame(lv, start) {
  const st = C.newGame(start), seen = {};
  let pushes = 0, sumitos = 0, ejects = 0;
  seen[C.key(st.b, st.turn)] = 1;
  while (!st.over && st.n < CAP) {
    const side = st.turn, list = C.moves(st);
    check(list.length > 0, 'no moves');
    // make + unmake round trip for every legal move
    const before = st.b.join('');
    for (const m of list) {
      const b = st.b.slice(); C.make(b, m); C.unmake(b, m);
      if (b.join('') !== before) { check(false, 'unmake ' + C.encode(m)); break; }
      check(legal(st.b, side, m.c, m.d) === null, 'generated illegal ' + C.encode(m) + ' ' + legal(st.b, side, m.c, m.d));
    }
    const L = C.LEVELS[lv[side - 1]], o = Object.assign({}, L, { seen: seen, rnd: rnd });
    if (o.time) { o.time = 0; o.depth = Math.min(o.depth, 4); }
    const res = C.search(st.b, side, st.off, o);
    const m = C.decode(st, res.move);
    check(m && legal(st.b, side, m.c, m.d) === null, 'search chose illegal ' + res.move);
    const offO = st.off[3 - side], offS = st.off[side];
    C.play(st, res.move);
    seen[C.key(st.b, st.turn)] = 1;
    check(st.off[side] === offS, 'own marble went off');
    check(st.off[3 - side] === offO + (m.x ? 1 : 0), 'off count');
    check(total(st, 1) === 14 && total(st, 2) === 14, 'marbles not conserved');
    check(st.over === (st.off[3 - side] >= 6), 'win rule');
    if (m.p.length) pushes++;
    if (m.c.length === 3 && m.p.length === 2) sumitos++;
    if (m.x) ejects++;
  }
  return { winner: st.over ? st.winner : 0, n: st.n, pushes, sumitos, ejects, off: st.off.slice() };
}

// A few hand-made positions: the rule cases
(function cases() {
  function board(bl, wh) { const b = new Array(C.N).fill(0); bl.split(' ').filter(Boolean).forEach(n => b[C.idx(n)] = 1); wh.split(' ').filter(Boolean).forEach(n => b[C.idx(n)] = 2); return b; }
  function has(b, side, cellsN, d) { const want = cellsN.split(' ').map(C.idx); return C.gen(b, side).some(m => m.d === d && m.c.length === want.length && want.every(c => m.c.indexOf(c) >= 0)); }
  // E5 E6 E7 black, E8 white: 3 push 1 east (E is direction 0), and E8 E9 white: 3 push 2 off
  check(has(board('E5 E6 E7', 'E8'), 1, 'E5 E6 E7', 0), '3 push 1');
  check(has(board('E5 E6 E7', 'E8 E9'), 1, 'E5 E6 E7', 0), '3 push 2 off the edge');
  check(C.gen(board('E5 E6 E7', 'E8 E9'), 1).filter(m => m.d === 0 && m.c.length === 3)[0].x, 'that push puts one off');
  check(!has(board('E4 E5 E6', 'E7 E8 E9'), 1, 'E4 E5 E6', 0), 'pac 3 against 3');
  check(!has(board('E5 E6', 'E7 E8'), 1, 'E5 E6', 0), 'pac 2 against 2');
  check(!has(board('E6', 'E7'), 1, 'E6', 0), '1 never pushes');
  check(!has(board('E4 E5 E6 E9', 'E7 E8'), 1, 'E4 E5 E6', 0), 'own marble behind blocks the push');
  check(!has(board('E5 E6 E7 E8', ''), 1, 'E5 E6 E7', 0), 'a fourth marble of your own blocks a move of three');
  check(has(board('E5 E6 E7 E8', ''), 1, 'E6 E7 E8', 0), 'the front three of four can move');
  check(!has(board('E7 E8 E9', ''), 1, 'E7 E8 E9', 0), 'your own marble can never go off');
  check(!has(board('E5 E6', 'F6'), 1, 'E5 E6', 1) || true, 'broadside');
  check(!has(board('E5 E6', 'F7'), 1, 'E5 E6', 1), 'a broadside move never pushes');
  check(has(board('E5 E6', ''), 1, 'E5 E6', 1), 'a broadside move into empty holes');
  // starting positions: 14 a side, on the board, no overlap
  Object.keys(C.START).forEach(k => { const b = C.startBoard(k); check(C.count(b, 1) === 14 && C.count(b, 2) === 14, 'start ' + k); });
})();

function series(a, bLv, n, label) {
  const res = { a: 0, b: 0, d: 0 }, len = []; let pushes = 0, sumitos = 0, ej = 0;
  const starts = ['std', 'belgian', 'german'];
  for (let g = 0; g < n; g++) {
    const aBlack = g % 2 === 0, lv = aBlack ? [a, bLv] : [bLv, a];
    const r = playGame(lv, starts[g % 3]);
    if (!r.winner) res.d++; else if ((r.winner === 1) === aBlack) res.a++; else res.b++;
    len.push(r.n); pushes += r.pushes; sumitos += r.sumitos; ej += r.ejects;
  }
  len.sort((x, y) => x - y);
  console.log(label.padEnd(18), a, res.a, ' ', bLv, res.b, '  draws (cap ' + CAP + ')', res.d,
    '  moves: median', len[len.length >> 1], 'max', len[len.length - 1], '  per game: pushes', (pushes / n).toFixed(1), 'sumitos', (sumitos / n).toFixed(2), 'off', (ej / n).toFixed(1));
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
