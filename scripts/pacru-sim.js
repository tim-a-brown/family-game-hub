// node scripts/pacru-sim.js [games] [--np=2|3|4] [--pairs=easy-normal,normal-hard] [--rand=N]
// Plays Pacru games between the computer players with the rules in games/pacru-core.js and checks every turn against a
// separate plain reading of the rules written here (its own board of named fields, its own borderlands, chevrons, power
// of movement, moves, connections, pincers, border changes, transformations, meetings, reorientations and the ends of
// the game), never the core's code:
//   the starting position is the booklet's back page; every move the core allows from every chevron is one the plain
//   reading allows and the other way round; the choices a move leaves (connection or border, where a border change or
//   transformation goes, a meeting's field) are the same lists; after every turn the plain reading's board, chevrons,
//   whose turn it is, who is out and who has won are the core's. A turn by a random player (--rand games of each count)
//   takes any choice at random, reorientations too, so the rare actions come up.
// It prints the skills' results against each other, how long games run and how often each special action comes.
const C = require('../games/pacru-core.js');
const args = process.argv.slice(2);
const G = +(args.find(a => /^\d+$/.test(a)) || 60);
const NPS = (args.find(a => a.startsWith('--np=')) || '--np=2,3,4').slice(5).split(',').map(Number);
const PAIRS = ((args.find(a => a.startsWith('--pairs=')) || '--pairs=easy-normal,normal-hard').slice(8)).split(',').map(s => s.split('-'));
const RANDN = +((args.find(a => a.startsWith('--rand=')) || '--rand=40').slice(7));
let seed = 4242;
function rnd() { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
let fail = 0;
function check(cond, msg) { if (!cond) { fail++; if (fail < 30) console.log('FAIL', msg); } }

// ── A plain reading of the rules ──
// fields by name, 'a1' to 'i9'; a borderland is the 3 by 3 block a field is in
const FILES = 'abcdefghi';
const name = (f, r) => FILES[f] + (r + 1);              // f, r from 0: file a = 0, rank 1 = 0
const fr = n => [FILES.indexOf(n[0]), +n[1] - 1];
const land = n => { const [f, r] = fr(n); return Math.floor(f / 3) + ',' + Math.floor(r / 3); };
// headings as steps of [file, rank]: north is up the board (rank grows)
const HEAD = { N: [0, 1], NE: [1, 1], E: [1, 0], SE: [1, -1], S: [0, -1], SW: [-1, -1], W: [-1, 0], NW: [-1, 1] };
const RING = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const turnBy = (h, k) => RING[(RING.indexOf(h) + k + 8) % 8];
const STARTS = {   // the booklet's back page, by color
  Black: [['c9', 'S'], ['a5', 'E'], ['c1', 'N']], Red: [['g9', 'S'], ['i5', 'W'], ['g1', 'N']],
  Yellow: [['e9', 'S'], ['a7', 'E'], ['i7', 'W']], Green: [['e1', 'N'], ['a3', 'E'], ['i3', 'W']]
};
const FOURTH = { Black: ['i1', 'NW'], Red: ['a9', 'SE'] };
const TGT = { 2: 42, 3: 28, 4: 24 };
// P = {np, colors [seat], mk {field: seat}, chev {field: {s, h}}, turn, out [seat], win}
function plainStart(np, colors) {
  const P = { np, colors, mk: {}, chev: {}, turn: 0, out: colors.map(() => false), win: -1 };
  colors.forEach((c, s) => { const l = STARTS[c].slice(); if (np === 2) l.push(FOURTH[c]); l.forEach(([n, h]) => { P.chev[n] = { s, h }; }); });
  return P;
}
const onBoard = (f, r) => f >= 0 && f < 9 && r >= 0 && r < 9;
const go = (n, h, k) => { const [f, r] = fr(n), [df, dr] = HEAD[h]; return onBoard(f + df * k, r + dr * k) ? name(f + df * k, r + dr * k) : null; };
function powerP(P, n, s) { let c = 0; for (const m in P.mk) if (P.mk[m] === s && land(m) === land(n)) c++; return Math.max(1, c); }
// the fields a chevron could reach along a heading, in a straight run, ignoring whether it may stop there
function reach(P, n) {
  const ch = P.chev[n], out = [];
  for (const h of [turnBy(ch.h, -1), ch.h, turnBy(ch.h, 1)]) {
    const passed = [];
    for (let k = 1; k <= powerP(P, n, ch.s); k++) { const t = go(n, h, k); if (!t) break; out.push({ t, h, k, passed: passed.slice() }); passed.push(t); }
  }
  return out;
}
// attacks: reach the field with no chevron on any field passed
function attacks(P, n, t) { return reach(P, n).some(q => q.t === t && q.passed.every(x => !P.chev[x])); }
function plainMoves(P, n) {
  const ch = P.chev[n], s = ch.s, out = [];
  for (const q of reach(P, n)) {
    const jumps = q.passed.filter(x => P.chev[x]).length, occ = P.chev[q.t];
    const conn = q.k >= 2 && P.mk[n] === s && P.mk[q.t] === s;
    if (occ) {
      if (occ.s === s || jumps) continue;
      // a pincer: two or more of the mover's chevrons attack the field
      const att = Object.keys(P.chev).filter(m => P.chev[m].s === s && attacks(P, m, q.t));
      if (att.length >= 2) out.push({ t: q.t, h: q.h, k: q.k, pin: true, passed: q.passed, change: false, jump: false });
      continue;
    }
    if (P.mk[q.t] !== undefined && P.mk[q.t] !== s) continue;
    if (jumps && !conn) continue;
    out.push({ t: q.t, h: q.h, k: q.k, pin: false, passed: q.passed, change: conn && !jumps, jump: conn && jumps > 0 });
  }
  return out;
}
function plainCanMove(P, s) { return Object.keys(P.chev).some(n => P.chev[n].s === s && plainMoves(P, n).length); }
function count(P, s) { return Object.values(P.mk).filter(v => v === s).length; }
function borderFields(P, t, s) {   // after landing on t: the fields a border change may go on
  const all = []; for (let f = 0; f < 9; f++) for (let r = 0; r < 9; r++) if (land(name(f, r)) === land(t)) all.push(name(f, r));
  const neutral = all.filter(x => P.mk[x] === undefined);
  if (neutral.length) return { list: neutral.filter(x => x === t || !P.chev[x]).sort(), trans: false };
  return { list: all.filter(x => !P.chev[x] && P.mk[x] !== s).sort(), trans: true };
}
// play a parsed move on P with its choices: {from, to, kind, mark, bonus} or {from, rot, rm}; returns the choices a
// move leaves, as the plain reading sees them: {kind (both benefits on offer), marks, bonus}
function plainPlay(P, mv) {
  const s = P.turn, seen = {};
  if (mv.rot != null) {
    const ch = P.chev[mv.from];
    check(ch && ch.s === s, 'reorient own chevron');
    check(mv.rm.length === Math.abs(mv.rot) * 2, 'reorient pays 2 markers each 45 degrees');
    mv.rm.forEach(x => { check(P.mk[x] === s && !P.chev[x], 'reorient takes own unoccupied markers'); delete P.mk[x]; });
    ch.h = turnBy(ch.h, mv.rot);
  } else {
    const ch = P.chev[mv.from], q = plainMoves(P, mv.from).find(x => x.t === mv.to);
    check(q, 'move allowed ' + mv.from + '-' + mv.to);
    if (!q) return seen;
    let captured = -1;
    if (q.pin) { captured = P.chev[mv.to].s; delete P.chev[mv.to]; P.mk[mv.to] = s; }
    delete P.chev[mv.from]; P.chev[mv.to] = { s, h: q.h };
    const crosses = land(mv.from) !== land(mv.to);
    const changes = q.passed.filter(x => P.mk[x] !== s);
    let doChange = q.change, doCross = crosses;
    if (q.change && crosses) {
      const bf = borderFields(P, mv.to, s);
      if (!changes.length) doChange = false;
      else if (!bf.list.length) doCross = false;
      else { seen.kind = true; if (mv.kind === 'c') doCross = false; else doChange = false; }
    }
    if (doChange) changes.forEach(x => { P.mk[x] = s; });
    if (doCross) {
      const bf = borderFields(P, mv.to, s); seen.marks = bf.list;
      if (bf.list.length) { check(bf.list.includes(mv.mark), 'border field allowed ' + mv.mark); P.mk[mv.mark] = s; }
    }
    // a meeting: the mover on its color points at another of its chevrons on its color, which points back
    const fwd = go(mv.to, q.h, 1), o = fwd && P.chev[fwd];
    if (P.mk[mv.to] === s && o && o.s === s && o.h === turnBy(q.h, 4) && P.mk[fwd] === s) {
      seen.meet = true;
      const others = P.colors.some((c, p) => p !== s && count(P, p) >= 9);
      if (others) {
        const free = []; for (let f = 0; f < 9; f++) for (let r = 0; r < 9; r++) { const x = name(f, r); if (!P.chev[x] && P.mk[x] !== s) free.push(x); }
        seen.bonus = free.sort();
        if (free.length) { check(free.includes(mv.bonus), 'meeting field allowed'); P.mk[mv.bonus] = s; }
      }
    }
    if (captured >= 0 && !Object.values(P.chev).some(c => c.s === captured)) P.out[captured] = true;
  }
  // the target; then the next player in, out if blocked; the last one left wins
  if (count(P, s) >= TGT[P.np]) { P.win = s; return seen; }
  for (let g = 0; g < 10; g++) {
    const live = P.colors.map((c, p) => p).filter(p => !P.out[p]);
    if (live.length <= 1) { P.win = live[0]; return seen; }
    let nx = P.turn; do { nx = (nx + 1) % P.np; } while (P.out[nx]);
    P.turn = nx;
    if (plainCanMove(P, nx)) return seen;
    Object.keys(P.chev).forEach(n => { if (P.chev[n].s === nx) delete P.chev[n]; });
    P.out[nx] = true;
  }
  return seen;
}
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function fieldOf(x) { return C.NAMES[x]; }
function same(P, st) {
  for (let x = 0; x < 81; x++) {
    const n = fieldOf(x), b = st.b[x], ch = st.ch[x];
    if ((P.mk[n] === undefined ? 0 : P.mk[n] + 1) !== b) return 'marker at ' + n;
    const pc = P.chev[n];
    if (!pc !== (ch < 0)) return 'chevron at ' + n;
    if (pc && (pc.s !== ch >> 3 || DIRS[ch & 7] !== pc.h)) return 'chevron facing at ' + n;
  }
  if (!st.over && P.turn !== st.turn) return 'turn ' + P.turn + ' ' + st.turn;
  for (let p = 0; p < st.np; p++) if (!!P.out[p] !== !!st.out[p]) return 'out ' + p;
  if (st.over !== (P.win >= 0) || (st.over && st.win !== P.win)) return 'winner';
  return '';
}
// the starting positions, read from the booklet's back page
for (const np of [2, 3, 4]) {
  const st = C.newGame(np), cols = st.col.map(c => C.COLORS[c]);
  check(JSON.stringify(cols) === JSON.stringify(np === 2 ? ['Black', 'Red'] : np === 3 ? ['Yellow', 'Red', 'Black'] : ['Black', 'Yellow', 'Red', 'Green']), 'seat colors ' + np);
  const P = plainStart(np, cols);
  check(!same(P, st), 'start ' + np + ' ' + same(P, st));
  check(Object.keys(P.chev).length === (np === 2 ? 8 : np * 3), 'chevron count ' + np);
  check(st.target === TGT[np], 'target ' + np);
}

// a turn by a player who chooses at random among every legal move and choice (reorientations too)
function randomMove(st) {
  const s = st.turn, cs = C.chevrons(st, s), list = [];
  cs.forEach(f => C.dests(st, f).forEach(q => list.push({ f, t: q.t })));
  const rc = C.rotCands(st, s);
  if (rc.length >= 2 && rnd() < 0.12) {
    const f = cs[Math.floor(rnd() * cs.length)], r = [-2, -1, 1, 2].filter(r => rc.length >= Math.abs(r) * 2);
    const rr = r[Math.floor(rnd() * r.length)], pool = rc.slice(), rm = [];
    while (rm.length < Math.abs(rr) * 2) rm.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    return C.encode({ f, r: rr, rm });
  }
  const b = list[Math.floor(rnd() * list.length)], m = { f: b.f, t: b.t };
  for (let g = 0; g < 4; g++) {
    const r = C.work(C.wcopy(st), m);
    if (!r.need) return C.encode({ f: b.f, t: b.t, kind: r.kind, mark: r.mark, bonus: r.bonus });
    m[r.need] = r.opts[Math.floor(rnd() * r.opts.length)];
  }
  return null;
}
const tally = { games: 0, moves: 0, pin: 0, meet: 0, bonus: 0, conv: 0, convMoves: 0, jump: 0, trans: 0, kind: 0, rot: 0, rot90: 0, blk: 0, cap: 0, target: 0, last: 0, cap600: 0 };
function playGame(np, skills, rand) {
  const st = C.newGame(np), P = plainStart(np, st.col.map(c => C.COLORS[c]));
  while (!st.over && st.n < 800) {
    const s = st.turn;
    // every move from every chevron, as the plain reading has them
    C.chevrons(st, s).forEach(f => {
      const a = C.dests(st, f).map(q => fieldOf(q.t) + (q.pin ? 'x' : '')).sort().join(' ');
      const b = plainMoves(P, fieldOf(f)).map(q => q.t + (q.pin ? 'x' : '')).sort().join(' ');
      check(a === b, 'moves from ' + fieldOf(f) + ': core ' + a + ' | plain ' + b);
    });
    let mv;
    if (rand && (rand === 1 || rnd() < 0.5)) mv = randomMove(st);
    else if (rand) { const r = C.search(st, Object.assign({}, C.LEVELS.easy, { seed: Math.floor(rnd() * 1e9) })); mv = r && r.move; }
    else { const L = Object.assign({}, C.LEVELS[skills[s]], { seed: Math.floor(rnd() * 1e9) }); const r = C.search(st, L); mv = r && r.move; }
    check(!!mv, 'a move exists');
    if (!mv) break;
    const pm = C.parse(mv), plainMv = pm.r != null ? { from: fieldOf(pm.f), rot: pm.r, rm: pm.rm.map(fieldOf) } : { from: fieldOf(pm.f), to: fieldOf(pm.t), kind: pm.kind, mark: pm.mark >= 0 ? fieldOf(pm.mark) : undefined, bonus: pm.bonus >= 0 ? fieldOf(pm.bonus) : undefined };
    // the choices the core asks for match the plain reading's
    if (pm.r == null) {
      const P2 = JSON.parse(JSON.stringify(P)), seen = plainPlay(P2, plainMv);
      let m = { f: pm.f, t: pm.t }, asked = {};
      for (let g = 0; g < 4; g++) {
        const r = C.work(C.wcopy(st), m); if (!r.need) break;
        asked[r.need] = r.opts.map(fieldOf).sort();
        m[r.need] = r.need === 'kind' ? pm.kind : r.need === 'mark' ? pm.mark : pm.bonus;
      }
      check(!!asked.kind === !!seen.kind, 'connection or border asked ' + mv);
      check(JSON.stringify(asked.mark || []) === JSON.stringify((seen.marks || []).length ? seen.marks : []), 'border fields ' + mv + ' ' + JSON.stringify(asked.mark) + ' ' + JSON.stringify(seen.marks));
      check(JSON.stringify(asked.bonus || []) === JSON.stringify(seen.bonus && seen.bonus.length ? seen.bonus : []), 'meeting fields ' + mv);
    }
    const res = C.play(st, mv);
    check(!!res, 'core plays ' + mv);
    if (!res) break;
    plainPlay(P, plainMv);
    const d = same(P, st); check(!d, 'after ' + mv + ': ' + d);
    if (d) break;
    tally.moves++;
    if (res.r != null) { tally.rot++; if (Math.abs(res.r) === 2) tally.rot90++; }
    else {
      if (res.pin) tally.pin++; if (res.meet >= 0) tally.meet++; if (res.bonus >= 0) tally.bonus++;
      if (res.conv.length) { tally.conv += res.conv.length; tally.convMoves++; } if (res.conn === 2) tally.jump++;
      if (res.trans && res.mark >= 0) tally.trans++; if (res.kind) tally.kind++;
    }
    (res.out || []).forEach(o => { if (o.why === 'blk') tally.blk++; else tally.cap++; });
  }
  tally.games++;
  if (st.over) tally[st.why]++; else tally.cap600++;
  return st;
}
const t0 = Date.now();
// random players: the rare actions
for (const np of NPS) for (let g = 0; g < RANDN; g++) playGame(np, null, g % 2 ? 1 : 2);
function say(t) { return t + ' (' + tally.games + '): moves ' + tally.moves + ', pincers ' + tally.pin + ', meetings ' + tally.meet + ' (' + tally.bonus + ' with a field), connection changes ' + tally.convMoves + ' (' + tally.conv + ' fields), connection jumps ' + tally.jump + ', transformations ' + tally.trans + ', connection-or-border choices ' + tally.kind + ', reorientations ' + tally.rot + ' (' + tally.rot90 + ' of 90 degrees), blocked out ' + tally.blk + ', taken out ' + tally.cap + ', won on markers ' + tally.target + ', last left ' + tally.last + ', unfinished ' + tally.cap600; }
console.log(say('Random players, and random players half the time with Easy the other half'));
// the skills against each other, seats alternating
for (const np of NPS) for (const [a, b] of PAIRS) {
  const w = { [a]: 0, [b]: 0 }; let len = 0, tgt = 0, done = 0;
  for (let g = 0; g < G; g++) {
    // two players: one of each, seats swapped every game; more: one of `a` against the rest as `b`
    const skills = []; const aSeat = g % np;
    for (let s = 0; s < np; s++) skills.push(s === aSeat ? a : b);
    const st = playGame(np, skills, false);
    if (st.over) { done++; w[skills[st.win]]++; len += st.n; if (st.why === 'target') tgt++; }
  }
  const share = np === 2 ? '' : ' (an even share for the one ' + a + ' is ' + Math.round(100 / np) + '%)';
  console.log(np + ' players, one ' + a + ' against ' + (np - 1) + ' ' + b + ': ' + a + ' won ' + w[a] + ' of ' + G + share + ', ' + (np === 2 ? b + ' ' + w[b] + ', ' : '') + 'average ' + Math.round(len / Math.max(1, done)) + ' turns, ' + tgt + ' on markers, ' + (G - done) + ' unfinished');
}
console.log(say('Every game so far'));
console.log((fail ? fail + ' FAILURES' : 'Every turn agreed with the plain reading of the rules') + ' (' + Math.round((Date.now() - t0) / 1000) + ' s)');
process.exit(fail ? 1 : 0);
