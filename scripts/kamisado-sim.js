// node scripts/kamisado-sim.js [matches] [--target=1|3|7|15] [--pairs=easy-normal,normal-hard]
// Plays Kamisado matches between the computer players with the rules in games/kamisado-core.js and checks every step
// against a separate plain reading of the rules written here (its own board from the color names, its own moves, its
// own Sumo pushes, blocked towers, deadlocks, promotions, scores and regroups), never the core's code:
//   the board is the published one (every row and column has each color once, orange in each player's near right
//   corner, the same board seen from either side); every move the core allows is one the plain reading allows and the
//   other way round; a tower moves forward or diagonally forward over empty squares, as far as its rank allows (7, 5, 3,
//   1); a push moves a Sumo one square straight on and the other player's towers in front of it (each of a lower rank,
//   no more than its rank, an empty square behind) one square back, and the pusher moves again with the color under the
//   last tower pushed; a blocked tower passes and a loop of passes loses the round for the last player to move, whose
//   opponent promotes the tower of the color that last move ended on; a tower on the far row wins the round and is
//   promoted, scoring 1, 3, 7 or 15; the regroup fills each home row in the order the rules give; the loser starts.
// It prints the skills' results against each other, how long rounds run and how often blocks, pushes and deadlocks come.
const C = require('../games/kamisado-core.js');
const args = process.argv.slice(2);
const G = +(args.find(a => /^\d+$/.test(a)) || 200);
const TARGET = +((args.find(a => a.startsWith('--target=')) || '--target=1').slice(9));
const PAIRS = ((args.find(a => a.startsWith('--pairs=')) || '--pairs=easy-normal,normal-hard').slice(8)).split(',').map(s => s.split('-'));
let seed = 777;
function rnd() { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

// ── A plain reading of the rules ──
const NAMES = ['orange', 'blue', 'purple', 'pink', 'yellow', 'red', 'green', 'brown'];
const ROWS = [   // as the published board is printed, White's home row at the top
  'orange blue purple pink yellow red green brown',
  'red orange pink green blue yellow brown purple',
  'green pink orange red purple brown yellow blue',
  'pink purple blue orange brown green red yellow',
  'yellow red green brown orange blue purple pink',
  'blue yellow brown purple red orange pink green',
  'purple brown yellow blue green pink orange red',
  'brown green red yellow pink purple blue orange'
].map(r => r.split(' ').map(n => NAMES.indexOf(n)));
const col = (r, c) => ROWS[r][c];
let fail = 0;
function check(cond, msg) { if (!cond) { fail++; if (fail < 25) console.log('FAIL', msg); } }
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) check(C.SQ[r * 8 + c] === col(r, c), 'board ' + r + ',' + c);
for (let i = 0; i < 8; i++) {
  check(new Set(ROWS[i]).size === 8, 'row ' + i); check(new Set(ROWS.map(r => r[i])).size === 8, 'column ' + i);
}
check(col(7, 7) === 0 && col(0, 0) === 0, 'orange in each near right corner');
for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) check(col(r, c) === col(7 - r, 7 - c), 'the same board from either side');

// plain towers: {side: 'B' | 'W', color, rank, r, c}
const fwd = s => s === 'B' ? -1 : 1, goal = s => s === 'B' ? 0 : 7, home = s => s === 'B' ? 7 : 0, opp = s => s === 'B' ? 'W' : 'B';
const RANGE = [7, 5, 3, 1, 1], PTS = [1, 3, 7, 15, 15];
function at(T, r, c) { return T.find(t => t.r === r && t.c === c); }
function plainMoves(T, t, pushAllowed) {
  const out = [];
  for (const dc of [-1, 0, 1]) {
    for (let k = 1; k <= RANGE[t.rank]; k++) {
      const r = t.r + fwd(t.side) * k, c = t.c + dc * k;
      if (r < 0 || r > 7 || c < 0 || c > 7 || at(T, r, c)) break;
      out.push({ r, c, push: 0 });
    }
  }
  if (pushAllowed && t.rank >= 1) {
    let k = 0, r = t.r + fwd(t.side), ok = true;
    while (r >= 0 && r <= 7 && at(T, r, t.c)) { const q = at(T, r, t.c); if (q.side === t.side || q.rank >= t.rank) { ok = false; break; } k++; r += fwd(t.side); }
    if (ok && k >= 1 && k <= t.rank && r >= 0 && r <= 7) out.push({ r: t.r + fwd(t.side), c: t.c, push: k });
  }
  return out;
}
function toCore(T) { const b = new Array(64).fill(0); T.forEach(t => { b[t.r * 8 + t.c] = C.piece(t.side === 'B' ? 1 : 2, t.color); }); return b; }
// regroup as the rules say it in words
function plainRegroup(T, fill) {
  const snap = T.map(t => ({ t, r: t.r, c: t.c }));
  const at = (T, r, c) => (snap.find(x => x.r === r && x.c === c) || {}).t;
  for (const s of ['B', 'W']) {
    const rows = s === 'B' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    // "left to right as seen from their own seat"; Black sits at row 7, so its left is column 0; White's left is column 7
    const seen = s === 'B' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    const within = fill === 'L' ? seen : seen.slice().reverse();
    const taken = [];
    rows.forEach(r => within.forEach(c => { const t = at(T, r, c); if (t && t.side === s) taken.push(t); }));
    // placed from the brown square at the left (fill L) or the orange square at the right (fill R)
    const startColor = fill === 'L' ? 7 : 0, h = home(s);
    let c0 = [0, 1, 2, 3, 4, 5, 6, 7].find(c => col(h, c) === startColor);
    const step = c0 === 0 ? 1 : -1;
    check(c0 === within[0], 'the fill starts at the ' + (fill === 'L' ? 'brown' : 'orange') + ' square on the player\'s own ' + (fill === 'L' ? 'left' : 'right'));
    taken.forEach((t, j) => { t.r = h; t.c = c0 + step * j; });
  }
}

const SK = { easy: 0, normal: 1, hard: 2 };
let stats = { rounds: 0, moves: 0, blocks: 0, pushes: 0, dead: 0, promos: [0, 0, 0, 0, 0] };
function playMatch(lv) {
  const st = C.newGame({ target: TARGET });
  const T = [];
  for (let c = 0; c < 8; c++) { T.push({ side: 'B', color: col(7, c), rank: 0, r: 7, c }); T.push({ side: 'W', color: col(0, c), rank: 0, r: 0, c }); }
  let turn = 'B', req = -1, pts = { B: 0, W: 0 }, phase = 'play', def = null, guard = 0;
  while (!st.over && guard++ < 4000) {
    const side = st.turn === 1 ? 'B' : 'W';
    check(side === turn, 'turn'); check(st.phase === phase, 'phase ' + st.phase + ' ' + phase);
    if (phase === 'regroup') {
      check(side === def, 'the Defender chooses the fill');
      const fill = C.chooseFill(st.b, st.rk, st.turn, Object.assign({ rnd }, lv[st.turn - 1] === 'easy' ? { noise: 40, depth: 1 } : { depth: 2 }));
      const r = C.play(st, 'fill ' + fill); check(!!r, 'fill accepted');
      plainRegroup(T, fill);
      check(JSON.stringify(toCore(T)) === JSON.stringify(st.b), 'regroup ' + fill + '\n' + C.grid(st.b).join('\n') + '\n' + C.grid(toCore(T)).join('\n'));
      turn = opp(def); req = -1; phase = 'play'; def = null;
      continue;
    }
    // the moves the plain reading allows
    const plain = [];
    const tw = req < 0 ? T.filter(t => t.side === turn) : T.filter(t => t.side === turn && t.color === req);
    tw.forEach(t => plainMoves(T, t, req >= 0).forEach(m => plain.push(C.NAMES[t.r * 8 + t.c] + '-' + C.NAMES[m.r * 8 + m.c] + (m.push ? '*' : ''))));
    const core = C.legal(st).map(m => C.encode(m.f, m.t, m.push));
    check(plain.slice().sort().join() === core.slice().sort().join(), 'moves ' + plain.sort().join() + ' / ' + core.sort().join());
    check(plain.length > 0, 'the side to move can move');
    const L = Object.assign({}, lv[st.turn - 1] === 'rand' ? { depth: 1, noise: 1e9 } : C.LEVELS[lv[st.turn - 1]], { rnd });
    if (L.time) { L.time = 0; L.depth = 9; }
    const res = C.search(st.b, st.rk, st.turn, st.req, L);
    const mv = res.move; check(plain.includes(mv), 'robot plays a legal move ' + mv);
    const r = C.play(st, mv); check(!!r, 'core accepts ' + mv);
    stats.moves++;
    // the plain reading plays it
    const m = /^([a-h][1-8])-([a-h][1-8])(\*?)$/.exec(mv), f = C.idx(m[1]), to = C.idx(m[2]);
    const t = at(T, f >> 3, f & 7), tr = to >> 3, tc = to & 7;
    let lastSq;
    if (m[3]) {
      stats.pushes++;
      const pushed = []; let rr = tr;
      while (at(T, rr, tc)) { pushed.push(at(T, rr, tc)); rr += fwd(turn); }
      pushed.forEach(q => { q.r += fwd(turn); });
      t.r = tr; t.c = tc;
      const lp = pushed[pushed.length - 1]; lastSq = [lp.r, lp.c];
    } else { t.r = tr; t.c = tc; lastSq = [tr, tc]; }
    check(JSON.stringify(toCore(T)) === JSON.stringify(st.b), 'board after ' + mv);
    const promote = (s, tower) => { pts[s] += PTS[tower.rank]; tower.rank = Math.min(4, tower.rank + 1); stats.promos[tower.rank]++; stats.rounds++; };
    if (!m[3] && tr === goal(turn)) {
      promote(turn, t);
      check(r.win && st.match.pts[st.turn === 1 || st.phase !== 'play' ? 1 : 1] >= 0, 'win');
      def = turn;
    } else {
      // the next to move: the other player, or after a push the pusher again; blocked towers pass; a loop is a deadlock
      let s = m[3] ? turn : opp(turn), rq = col(lastSq[0], lastSq[1]);
      const seen = new Set([s + rq]);
      let dead = false;
      for (;;) {
        const tt = T.find(x => x.side === s && x.color === rq);
        if (plainMoves(T, tt, true).length) break;
        stats.blocks++;
        rq = col(tt.r, tt.c); s = opp(s);
        if (seen.has(s + rq)) { dead = true; break; }
        seen.add(s + rq);
      }
      if (dead) {
        stats.dead++;
        const w = opp(turn), tower = T.find(x => x.side === w && x.color === col(tr, tc));
        promote(w, tower); def = w;
        check(r.deadlock, 'core sees the deadlock');
      } else { turn = s; req = rq; check(!r.deadlock && !r.win, 'no end'); }
    }
    if (def) {
      check(st.match.pts[1] === pts.B && st.match.pts[2] === pts.W, 'points ' + st.match.pts + ' ' + pts.B + ',' + pts.W);
      T.forEach(x => check((st.rk[C.piece(x.side === 'B' ? 1 : 2, x.color)] || 0) === x.rank, 'rank'));
      if (pts[def] >= TARGET || T.some(x => x.rank >= 4)) { check(st.over && st.winner === (def === 'B' ? 1 : 2), 'match over'); break; }
      phase = 'regroup'; turn = def;
      check(st.phase === 'regroup' && st.def === (def === 'B' ? 1 : 2), 'regroup next ' + st.phase + ' ' + mv + ' ' + JSON.stringify(r));
      continue;
    }
    if (!def) { check(st.turn === (turn === 'B' ? 1 : 2) && st.req === req, 'turn ' + st.turn + '/' + st.req + ' vs ' + turn + '/' + req); }
    def = null;
  }
  check(st.over, 'match ended');
  // every round replays from its record (the history view's replay) to the same end
  st.rounds.forEach((rd, i) => {
    const R = C.replay(rd.g0, rd.k0, rd.first, rd.ml, 15), last = R.steps[R.steps.length - 1];
    check(last && last.res.promo && last.res.promo.side === rd.w && last.res.promo.p === rd.p, 'round ' + (i + 1) + ' replays to its end');
  });
  return st;
}
// fixed lines of the push and deadlock rules
(function () {
  const st = C.newGame();
  st.b = C.fromGrid(['........', '........', '........', '...B....', '...a....', '........', '........', '........']);
  st.rk[C.piece(1, 0)] = 1; st.turn = 1; st.req = 0;
  check(C.legal(st).some(m => m.push === 1), 'a Sumo pushes a tower straight ahead');
  st.rk[C.piece(2, 1)] = 1;
  check(!C.legal(st).some(m => m.push), 'a Sumo can\'t push a Sumo');
  st.rk[C.piece(2, 1)] = 0;
  st.b = C.fromGrid(['...B....', '........', '........', '........', '........', '........', '........', '...a....']);
  st.b = C.fromGrid(['........', '...B....', '...a....', '........', '........', '........', '........', '........']);
  check(C.legal(st).some(m => m.push), 'pushed toward its home row');
  st.b = C.fromGrid(['...B....', '...a....', '........', '........', '........', '........', '........', '........']);
  check(!C.legal(st).some(m => m.push), 'no pushing a tower off its own home row');
  st.b = C.fromGrid(['........', '........', '...C....', '...B....', '...a....', '........', '........', '........']);
  check(!C.legal(st).some(m => m.push), 'a Sumo pushes one tower only');
  st.rk[C.piece(1, 0)] = 2;
  check(C.legal(st).some(m => m.push === 2), 'a Double pushes two');
  check(C.targets(st.b, st.rk, C.idx('d4')).every(t => Math.abs((t >> 3) - 4) <= 3), 'a Double moves three at most');
  st.b = C.fromGrid(['........', '........', '........', '...b....', '...B....', '........', '........', '........']);
  check(!C.legal(st).some(m => m.push), 'no push with your own tower in front');
})();

const res = {};
for (const pr of PAIRS) {
  const key = pr.join(' vs ');
  res[key] = { [pr[0]]: 0, [pr[1]]: 0 };
  for (let g = 0; g < G; g++) {
    const flip = g % 2 === 1, lv = flip ? [pr[1], pr[0]] : [pr[0], pr[1]];
    const st = playMatch(lv);
    res[key][lv[st.winner - 1]]++;
  }
}
console.log('matches to', TARGET, 'point(s),', G, 'per pairing, seats alternating');
console.log(JSON.stringify(res));
console.log('rounds', stats.rounds, 'moves/round', (stats.moves / Math.max(1, stats.rounds)).toFixed(1), 'blocks', stats.blocks, 'pushes', stats.pushes, 'deadlocks', stats.dead, 'promotions to rank', stats.promos.slice(1).join('/'));
console.log(fail ? fail + ' FAILURES' : 'all checks passed');
process.exit(fail ? 1 : 0);
