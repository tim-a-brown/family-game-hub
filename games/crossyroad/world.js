// Crossy Road: the world and the rules (no drawing here).
//
// Rows run forward (row 0 is the start, score = furthest row). Columns -4..4 are playable;
// the world carries on either side (shaded) so traffic and logs come and go off screen.
// Everything that moves is a function of the world clock: a car's place is
// offset + speed * t on its lane's loop, a train's arrivals are worked out from the lane's
// period, so the same seed and the same clock always give the same world (and a saved game
// only needs the seed, the clock and where the chicken stood).
//
//   const G = createGame(seed)
//   G.input('u'|'d'|'l'|'r')   hop (buffered up to 2 while in the air)
//   G.step(dt)                 advance (call with small fixed steps)
//   G.row(i)                   a row (generated on demand)
//   G.events                   sound / effect events since the caller last emptied it

export const HALF = 4;            // playable columns: -HALF..HALF
export const HOP_T = 0.12;        // seconds in the air
export const EDGE_X = 5.1;        // carried past this on a log = swept away
export const WRAP = 26;           // lanes are drawn out to here either side
export const BACK = 3.6;          // this many rows behind the camera and the eagle comes
const TRAIN_WARN = 1.3;

function rng32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash2(a, b) { let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export function difficulty(i) { return clamp(i / 220, 0, 1); }
function wrapX(v, loop) { return ((v % loop) + loop) % loop - loop / 2; }

// ── Row helpers (also used by the renderer) ────────────────────────────────
export function entX(row, e, t) { return wrapX(e.off + row.dir * row.speed * t, row.loop); }
export function trainAt(row, t) {
  // the train on this track at time t: { k, front, active, warn }
  const P = row.period, k0 = Math.floor((t - row.phase) / P);
  for (let k = k0 + 1; k >= k0 - 1; k--) {
    const a = row.phase + k * P + hash2(row.i * 7 + 3, k) * P * 0.3;
    if (t >= a - TRAIN_WARN && t <= a + row.pass) {
      const front = -row.dir * WRAP + row.dir * row.speed * (t - a);
      return { k, a, front, active: t >= a, warn: true, len: row.tlen };
    }
  }
  return null;
}
export function blocked(row, c) { return row.type === 'grass' && (Math.abs(c) > 12 || !!(row.obs && row.obs[c + 12])); }

// ── Generator ──────────────────────────────────────────────────────────────
const TREE_KINDS = ['tree1', 'tree2', 'tree3', 'tree2', 'tree1', 'rock', 'stump'];
function makeWorld(seed) {
  const r = rng32(seed >>> 0 || 1);
  const W = { rows: new Map(), genTo: 2, lastType: 'grass', pathCol: 0, lastRiver: null, lastRoadDir: 0 };
  function obsArr() { return new Array(25).fill(null); }
  function edgeTrees(obs, dens) {
    for (let c = -12; c <= 12; c++) if (Math.abs(c) > HALF && r() < dens) obs[c + 12] = TREE_KINDS[(r() * 5) | 0];
  }
  function startRow(i) {
    const rr = rng32((seed ^ (i * 2654435761)) >>> 0);
    const obs = obsArr();
    for (let c = -12; c <= 12; c++) {
      const edge = Math.abs(c) > HALF;
      let p = edge ? 0.8 : i <= -4 ? 1 : i < 0 ? 0.45 : i === 0 ? (Math.abs(c) >= 3 ? 0.5 : 0) : 0.12;
      if (c === 0 && i > -4) p = 0;
      if (rr() < p) obs[c + 12] = TREE_KINDS[(rr() * 5) | 0];
    }
    return { i, type: 'grass', shade: i & 1, obs, coin: null };
  }
  function grassRow(i, d, afterLogs) {
    const obs = obsArr();
    edgeTrees(obs, 0.7);
    const keep = new Set();
    const p0 = W.pathCol, p1 = clamp(p0 + Math.round((r() * 2 - 1) * 3), -HALF, HALF);
    for (let c = Math.min(p0, p1); c <= Math.max(p0, p1); c++) keep.add(c);
    W.pathCol = p1;
    let dens = 0.16 + 0.14 * d, n = 0;
    const cols = [];
    for (let c = -HALF; c <= HALF; c++) cols.push(c);
    for (const c of cols) {
      if (keep.has(c)) continue;
      if (afterLogs && n >= 3) break;
      if (r() < dens) { obs[c + 12] = TREE_KINDS[(r() * TREE_KINDS.length) | 0]; n++; }
    }
    let coin = null;
    if (r() < 0.11) {
      const free = cols.filter(c => !obs[c + 12]);
      if (free.length) coin = free[(r() * free.length) | 0];
    }
    return { i, type: 'grass', shade: i & 1, obs, coin };
  }
  function roadRow(i, d) {
    const truck = r() < 0.26 + 0.08 * d;
    const len = truck ? 2.5 : 1.4;
    const speed = truck ? (1.15 + r() * 1.0) * (1 + 0.75 * d) : (1.6 + r() * 1.9) * (1 + 0.85 * d);
    let dir = r() < 0.5 ? 1 : -1;
    if (W.lastType === 'road' && W.lastRoadDir && r() < 0.6) dir = -W.lastRoadDir;
    W.lastRoadDir = dir;
    const ents = []; let pos = r() * 6;
    while (pos < 2 * WRAP) {
      ents.push({ off: pos, len, kind: truck ? 'truck' : 'car', color: (r() * (truck ? 3 : 5)) | 0 });
      pos += len + Math.max(2.3, (2.6 + r() * 5.6) * (1 - 0.32 * d));
    }
    const loop = Math.max(2 * WRAP + 2, pos);
    const coin = r() < 0.07 ? Math.round((r() * 2 - 1) * HALF) : null;
    return { i, type: 'road', dir, speed, loop, ents, coin, truck };
  }
  function riverRow(i, d) {
    const prev = W.lastRiver;
    const canPads = W.lastType === 'grass' || (prev && prev.pads && W.lastType === 'river');
    if (canPads && r() < 0.24) {
      const pads = new Set([W.pathCol]);
      const extra = 1 + ((r() * 3) | 0);
      for (let k = 0; k < extra; k++) pads.add(Math.round((r() * 2 - 1) * HALF));
      const row = { i, type: 'river', pads: [...pads].sort((a, b) => a - b), dir: 1, speed: 0, loop: 2 * WRAP, ents: [] };
      W.lastRiver = row; return row;
    }
    let dir = prev && !prev.pads && W.lastType === 'river' ? -prev.dir : (r() < 0.5 ? 1 : -1);
    const speed = (0.85 + r() * 1.05) * (1 + 0.6 * d);
    const ents = []; let pos = r() * 4;
    while (pos < 2 * WRAP) {
      const len = 2 + ((r() * (d > 0.6 ? 2 : 3)) | 0);
      ents.push({ off: pos + len / 2, len, kind: 'log' + len });
      pos += len + 1.2 + r() * 2.6 * (1 + 0.45 * d);
    }
    const loop = Math.max(2 * WRAP + 2, pos);
    const row = { i, type: 'river', dir, speed, loop, ents };
    W.lastRiver = row; return row;
  }
  function railRow(i, d) {
    const dir = r() < 0.5 ? 1 : -1, cars = 4 + ((r() * 5) | 0), speed = 25 + 9 * d + r() * 4;
    const tlen = 3 + cars * 2.7;
    const period = 6.2 + r() * 4 - 1.2 * d;
    return { i, type: 'rail', dir, speed, cars, tlen, period, phase: r() * period, pass: (2 * WRAP + tlen) / speed };
  }
  function genBlock() {
    const i0 = W.genTo + 1, d = difficulty(i0);
    let type;
    if (W.lastType === 'grass') {
      const wr = i0 < 10 ? [['road', 0.7], ['river', 0.3]] : [['road', 0.5], ['river', 0.32], ['rail', 0.18]];
      let x = r() * wr.reduce((s, w) => s + w[1], 0);
      for (const w of wr) { x -= w[1]; if (x <= 0) { type = w[0]; break; } }
      type = type || 'road';
    } else if (r() < 0.74 - 0.2 * d) type = 'grass';
    else {
      const opts = ['road', 'river', 'rail'].filter(t => t !== W.lastType && !(t === 'rail' && i0 < 10));
      type = opts[(r() * opts.length) | 0];
    }
    let n;
    if (type === 'grass') n = 1 + (r() < 0.55 - 0.2 * d ? 1 : 0) + (r() < 0.18 ? 1 : 0);
    else if (type === 'road') n = clamp(1 + Math.floor(r() * (2 + 3 * d)) + (r() < 0.3 ? 1 : 0), 1, 6);
    else if (type === 'river') n = clamp(1 + Math.floor(r() * (2 + 1.6 * d)), 1, 4);
    else n = 1 + (r() < 0.25 + 0.3 * d ? 1 : 0);
    const afterLogs = W.lastType === 'river' && W.lastRiver && !W.lastRiver.pads;
    for (let k = 0; k < n; k++) {
      const i = W.genTo + 1;
      const row = type === 'grass' ? grassRow(i, d, afterLogs && k === 0) : type === 'road' ? roadRow(i, d) : type === 'river' ? riverRow(i, d) : railRow(i, d);
      W.rows.set(i, row); W.genTo = i; W.lastType = type;
    }
  }
  W.get = function (i) {
    let row = W.rows.get(i);
    if (row) return row;
    if (i <= 2) { row = startRow(i); W.rows.set(i, row); return row; }
    while (W.genTo < i) genBlock();
    return W.rows.get(i);
  };
  W.prune = function (below) { for (const k of W.rows.keys()) if (k < below) W.rows.delete(k); };
  return W;
}

// ── Game ───────────────────────────────────────────────────────────────────
export function createGame(seed, saved) {
  const W = makeWorld(seed);
  const G = {
    seed, t: 0, state: 'ready', score: 0, maxRow: 0, coins: 0, hops: 0, events: [],
    p: { row: 0, x: 0, face: 'u', hop: null, log: null, pad: null, vrow: 0, vx: 0, landAt: -1, bumpAt: -1, snap: 0 },
    cam: { focus: 0, x: 0 },
    queue: [], death: null, played: 0, overrides: W.rows,
    row: i => W.get(i)
  };
  const P = G.p;
  if (saved) {
    G.t = saved.t || 0; P.row = saved.row | 0; P.x = saved.col | 0; P.vrow = P.row; P.vx = P.x;
    G.maxRow = saved.maxRow | 0; G.score = saved.score | 0; G.coins = saved.coins | 0; G.hops = saved.hops | 0; G.played = saved.played || 0;
    G.cam.focus = P.row; G.cam.x = clamp(P.x, -3, 3) * 0.55;
    W.get(P.row + 40);
    W.prune(P.row - 24);
  }
  function ev(type, o) { G.events.push(Object.assign({ type }, o || {})); }

  function logAt(row, x, t) {
    let best = -1, bd = 1e9;
    for (let k = 0; k < row.ents.length; k++) {
      const e = row.ents[k], c = entX(row, e, t), dd = Math.abs(x - c);
      if (dd <= e.len / 2 + 0.22 && dd < bd) { bd = dd; best = k; }
    }
    return best;
  }
  function logV(row) { return row.dir * row.speed; }

  function startHop(dir) {
    if (G.state !== 'ready' && G.state !== 'play') return;
    const dr = dir === 'u' ? 1 : dir === 'd' ? -1 : 0, dx = dir === 'l' ? -1 : dir === 'r' ? 1 : 0;
    P.face = dir;
    const R = P.row, cur = W.get(R), r1 = R + dr, tr = W.get(r1), x0 = P.x;
    let x1, vx = 0;
    const onLog = P.log && cur.type === 'river';
    if (dr) {
      if (tr.type === 'river' && !tr.pads) { x1 = x0; if (onLog) vx = logV(cur); }
      else x1 = Math.round(x0);
    } else {
      if (onLog) { x1 = x0 + dx; vx = logV(cur); }
      else x1 = Math.round(x0) + dx;
    }
    // trees, rocks and the edge of the world stop a hop (the chicken just turns)
    if (tr.type !== 'river' || tr.pads) {
      const c = Math.round(x1);
      if (Math.abs(c) > HALF || blocked(tr, c)) { P.bumpAt = G.t; ev('bump'); return; }
    } else if (Math.abs(x1) > HALF + 0.6) { P.bumpAt = G.t; ev('bump'); return; }
    if (G.state === 'ready') { G.state = 'play'; ev('start'); }
    P.log = null; P.pad = null;
    P.hop = { r0: R, r1, x0, x1, t: 0, dur: HOP_T, vx, dir };
    G.hops++;
    ev('hop', { dir });
  }

  function land() {
    const h = P.hop; P.hop = null;
    P.row = h.r1; P.x = h.x1; P.landAt = G.t; P.vrow = P.row; P.vx = P.x;
    const row = W.get(P.row);
    if (row.type === 'river') {
      if (row.pads) {
        const c = Math.round(P.x);
        if (row.pads.indexOf(c) >= 0 && Math.abs(P.x - c) < 0.6) { P.snap = P.x - c; P.x = c; P.pad = c; ev('pad', { row: P.row, col: c }); }
        else return die('water');
      } else {
        const k = logAt(row, P.x, G.t);
        if (k < 0) return die('water');
        const e = row.ents[k], c = entX(row, e, G.t);
        // stand on the nearest log segment
        let rel = Math.round(P.x - c - (e.len - 1) / 2) + (e.len - 1) / 2;
        rel = clamp(rel, -(e.len - 1) / 2, (e.len - 1) / 2);
        P.snap = P.x - (c + rel); P.x = c + rel;
        P.log = { idx: k, rel };
        ev('log', { row: P.row, idx: k });
      }
    } else {
      P.x = Math.round(P.x);
      if (row.coin != null && !row.coinTaken && row.coin === P.x) { row.coinTaken = true; G.coins++; ev('coin', { row: P.row, col: P.x }); }
    }
    if (P.row > G.maxRow) { G.maxRow = P.row; G.score = P.row; ev('score', { score: G.score }); }
    ev('land', { ground: row.type });
    if (G.queue.length && G.state === 'play') startHop(G.queue.shift());
  }

  function die(cause, o) {
    if (G.state === 'dying' || G.state === 'dead') return;
    G.state = 'dying'; G.queue.length = 0;
    const k = P.hop ? Math.min(1, P.hop.t / P.hop.dur) : 1;
    G.death = Object.assign({ cause, t: 0, x: P.vx, row: P.vrow, hopK: k, face: P.face }, o || {});
    P.hop = null; P.log = null;
    ev('die', { cause, x: P.vx, row: P.vrow, dir: o && o.dir });
  }

  G.input = function (dir) {
    if (G.state !== 'ready' && G.state !== 'play') return false;
    if (P.hop) { if (G.queue.length < 2) G.queue.push(dir); return true; }
    startHop(dir); return true;
  };

  const prevX = new Map();   // for whoosh sounds: which side of the chicken each car was on
  G.step = function (dt) {
    const t0 = G.t; G.t += dt;
    const t = G.t;
    if (G.state === 'play') G.played += dt;
    if (G.state === 'dying') {
      G.death.t += dt;
      const dur = { car: 1.15, train: 1.3, water: 1.15, edge: 1.15, eagle: 2.0 }[G.death.cause] || 1.2;
      if (G.death.t >= dur) G.state = 'dead';
    }
    if (G.state === 'ready' || G.state === 'play') {
      if (P.hop) {
        const h = P.hop; h.t += dt;
        if (h.vx) { h.x0 += h.vx * dt; h.x1 += h.vx * dt; }
        if (h.t >= h.dur) land();
      } else if (P.log) {
        const row = W.get(P.row), e = row.ents[P.log.idx];
        P.x = entX(row, e, t) + P.log.rel;
        if (Math.abs(P.x) > EDGE_X) die('edge');
      }
      P.snap *= Math.exp(-dt * 30);
    }
    // where the chicken is drawn (and hit-tested)
    if (G.state === 'ready' || G.state === 'play') {
      const h = P.hop;
      if (h) { const k = Math.min(1, h.t / h.dur); P.vrow = h.r0 + (h.r1 - h.r0) * k; P.vx = h.x0 + (h.x1 - h.x0) * k; }
      else { P.vrow = P.row; P.vx = P.x; }
      const curRow = h ? (h.t / h.dur < 0.5 ? h.r0 : h.r1) : P.row, row = W.get(curRow);
      if (row.type === 'road') {
        for (const e of row.ents) {
          const c = entX(row, e, t);
          if (Math.abs(P.vx - c) < e.len / 2 + 0.26) { die('car', { dir: row.dir, kind: e.kind, row: curRow, x: P.vx }); break; }
        }
      } else if (row.type === 'rail') {
        const tr = trainAt(row, t);
        if (tr && tr.active) {
          const a = tr.front, b = tr.front - row.dir * tr.len, lo = Math.min(a, b), hi = Math.max(a, b);
          if (P.vx > lo - 0.3 && P.vx < hi + 0.3) die('train', { dir: row.dir, row: curRow, x: P.vx });
        }
      }
    }
    // camera: follows the chicken forward and creeps on by itself once play starts
    const C = G.cam;
    if (G.state === 'play') {
      C.focus += (0.36 + 0.42 * difficulty(G.maxRow)) * dt;
      if (P.vrow > C.focus) C.focus += (P.vrow - C.focus) * Math.min(1, dt * 3.2);
      if (P.vrow < C.focus - BACK) die('eagle', { x: P.vx, row: P.vrow });
    }
    if (G.state !== 'dying' && G.state !== 'dead') C.x += (clamp(P.vx, -3, 3) * 0.55 - C.x) * Math.min(1, dt * 3);
    // sounds from the world near the chicken
    const pr = Math.round(P.vrow), lo = Math.floor(C.focus) - 6, hi = Math.floor(C.focus) + 16;
    for (let i = lo; i <= hi; i++) {
      const row = W.get(i);
      if (row.type === 'rail') {
        const tr = trainAt(row, t);
        if (tr && row.warnK !== tr.k) { row.warnK = tr.k; ev('bell', { row: i, near: Math.abs(i - pr) }); }
        if (tr && tr.active && row.rushK !== tr.k && Math.abs(i - pr) <= 4 && (row.dir > 0 ? tr.front > P.vx - 9 : tr.front < P.vx + 9)) { row.rushK = tr.k; ev('train', { row: i, near: Math.abs(i - pr) }); }
      } else if (row.type === 'road' && Math.abs(i - pr) <= 1 && G.state !== 'dead') {
        for (let k = 0; k < row.ents.length; k++) {
          const e = row.ents[k], c = entX(row, e, t), key = i * 64 + k, was = prevX.get(key);
          const side = c < P.vx ? -1 : 1;
          if (was != null && was !== side && Math.abs(c - P.vx) < 2) {
            ev('whoosh', { truck: e.kind === 'truck', near: Math.abs(i - pr) });
            if (hash2(i, k * 31 + Math.floor(t)) < (e.kind === 'truck' ? 0.35 : 0.12) && G.state === 'play') ev('horn', { truck: e.kind === 'truck' });
          }
          prevX.set(key, side);
        }
      }
    }
    if (prevX.size > 600) prevX.clear();
    W.prune(Math.floor(C.focus) - 24);
  };

  // Where to put the chicken back after a pause in a saved game: the last solid row it stood on
  G.saveState = function () {
    let row = P.row, col = clamp(Math.round(P.x), -HALF, HALF);
    for (let i = P.row; i > P.row - 20 && W.rows.has(i); i--) {
      const rr = W.get(i);
      if (rr.type !== 'grass') continue;
      let best = null;
      for (let c = -HALF; c <= HALF; c++) if (!blocked(rr, c) && (best == null || Math.abs(c - col) < Math.abs(best - col))) best = c;
      if (best != null) { row = i; col = best; break; }
    }
    return { v: 1, seed: G.seed, t: Math.round(G.t * 1000) / 1000, row, col, maxRow: G.maxRow, score: G.score, coins: G.coins, hops: G.hops, played: Math.round(G.played) };
  };
  G.isDying = () => G.state === 'dying' || G.state === 'dead';
  G.trainAt = trainAt; G.entX = entX;
  return G;
}
