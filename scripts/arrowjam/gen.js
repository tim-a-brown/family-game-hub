#!/usr/bin/env node
// Arrow Jam's 50 levels, made by construction so every one can be cleared, and written to games/arrowjam/levels.js.
//
//   node scripts/arrowjam/gen.js          make the levels (same seeds, same levels) and print the numbers
//   node scripts/arrowjam/check.js        check every level and print how hard each one is
//
// How a level is made: arrows go onto the board one at a time. Each one keeps the board clearable: the "A must leave
// before B" links (A lies on B's way out) may never go round in a circle, so there is always an order that takes
// every arrow off. (Placing arrows in reverse order of removal, each new one with a clear way out, is the simplest
// case of this; allowing a new arrow whose way out is blocked by older ones, as long as no circle forms, packs boards
// tighter and makes the chains longer.) For harder levels each step tries many arrows and keeps the one that blocks
// the most free arrows and lengthens the chain; a last pass fills the gaps with short arrows or longer tails.
// Several seeds are tried for each level, and the one whose difficulty lies nearest the rising curve is kept.
'use strict';
const fs = require('fs'), path = require('path');
const C = require('../../games/arrowjam/core.js');
const { metrics } = require('./measure.js');
const DX = C.DX, DY = C.DY, N = 50;

function rng(seed) {
  let a = seed >>> 0;
  return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// The board's shape (a string of 0 and 1), for variety from level 8 on
function shape(kind, w, h) {
  let s = '';
  const cx = (w - 1) / 2, cy = (h - 1) / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let on = true;
    const ax = Math.abs(x - cx), ay = Math.abs(y - cy);
    if (kind === 'oct') { const k = Math.floor(Math.min(w, h) / 4); on = Math.min(x, w - 1 - x) + Math.min(y, h - 1 - y) >= k; }
    else if (kind === 'diamond') on = ax / (cx + 0.5) + ay / (cy + 0.5) <= 1.45;
    else if (kind === 'plus') { const t = Math.floor(w / 4), u = Math.floor(h / 4); on = !((x < t || x >= w - t) && (y < u || y >= h - u)); }
    else if (kind === 'donut') { const r = Math.max(0.6, w / 7); on = !(ax <= r && ay <= r * h / w); }
    else if (kind === 'round') on = Math.pow(ax / (cx + 0.75), 2) + Math.pow(ay / (cy + 0.75), 2) <= 1;
    s += on ? '1' : '0';
  }
  return s;
}
const SHAPES = ['full', 'oct', 'full', 'plus', 'full', 'donut', 'full', 'round', 'full', 'diamond'];
// (a diamond leaves out half the board: on the big boards it becomes a rounded one, so a level never shrinks)

// What each level asks for: t runs from 0 (level 1) to 1 (level 50)
function plan(lv) {
  const t = (lv - 1) / (N - 1);
  // a board half again as tall as it is wide (a phone held upright shows it as it is, sideways it turns), from 5 by 7 to 11 by 17
  const n = Math.min(11, 5 + Math.floor((lv - 1) * 6 / 44)), hh = lv <= 3 ? 7 : Math.round(n * 1.5);
  let kind = lv < 8 ? 'full' : lv >= 46 ? (lv === 46 || lv === 48 ? 'oct' : 'full') : SHAPES[lv % SHAPES.length];
  if (kind === 'diamond' && lv > 20) kind = 'round';
  return {
    n, hh, kind,
    fill: lv <= 3 ? 0.42 + 0.06 * lv : Math.min(0.99, 0.62 + 0.6 * Math.sqrt(t)),
    minLen: 1,
    maxLen: lv < 10 ? (lv <= 3 ? 2 : 3) : Math.round(4 + 6 * Math.pow((lv - 10) / 40, 0.9)),
    bend: lv < 10 ? 0 : 0.28 + 0.3 * (lv - 10) / 40,            // the chance a snake turns at each step
    short: lv < 30 ? 0 : 2.4 * (lv - 30) / 20,                   // big boards lean to two-cell arrows, so they hold about 80
    longShare: lv < 10 ? 0 : 0.1 + 0.05 * (lv - 10) / 40,         // the share of arrows that are long snakes (4 cells or more)
    hard: lv <= 2 ? 0.15 : Math.min(1, 0.25 + 0.9 * t),           // how much blocking and long chains are preferred
    tries: Math.round(8 + 40 * t)                                 // arrows tried at each step
  };
}

function build(P, seed) {
  const R = rng(seed), W = P.n, H = P.hh, M = shape(P.kind, W, H), cells = W * H;
  const inM = c => M.charAt(c) === '1';
  const occ = new Int16Array(cells).fill(-1);
  const A = [];                 // {d, c: [tail..head], ray: [cells]}
  const pred = [], succ = [];   // pred[i]: arrows on i's way out (they leave first); succ[i]: arrows i is on the way of
  const cover = [];             // cover[c]: arrows whose way out runs over cell c
  for (let c = 0; c < cells; c++) cover.push([]);
  let filled = 0;
  const target = Math.round(P.fill * M.split('').filter(x => x === '1').length);

  function rayOf(h, d) { const out = []; let x = h % W, y = (h - x) / W; for (;;) { x += DX[d]; y += DY[d]; if (x < 0 || y < 0 || x >= W || y >= H) break; out.push(y * W + x); } return out; }
  // would arrows S (that the new piece blocks) reach arrows B (that block it)? then a circle would form
  function circle(S, B) {
    if (!S.size || !B.size) return false;
    const seen = new Set(), q = [];
    for (const s of S) { if (B.has(s)) return true; seen.add(s); q.push(s); }
    while (q.length) { const u = q.pop(); for (const v of succ[u]) { if (B.has(v)) return true; if (!seen.has(v)) { seen.add(v); q.push(v); } } }
    return false;
  }
  function lengthOfChain() {   // the rounds a perfect player needs (the longest chain of "must leave first")
    const memo = new Int16Array(A.length).fill(0);
    const f = i => { if (memo[i]) return memo[i]; let m = 0; for (const j of pred[i]) m = Math.max(m, f(j)); return (memo[i] = m + 1); };
    let best = 0; for (let i = 0; i < A.length; i++) best = Math.max(best, f(i)); return best;
  }
  const isFree = i => pred[i].size === 0;
  // a candidate arrow with its head at h pointing d, grown back to about len cells
  function grow(h, d, len) {
    if (occ[h] >= 0 || !inM(h)) return null;
    const ray = rayOf(h, d), rs = new Set(ray), B = new Set();
    for (const c of ray) if (occ[c] >= 0) B.add(occ[c]);
    const body = [h], own = new Set([h]);
    let cur = h, dir = d, first = true;
    while (body.length < len) {
      const opts = [];
      if (first) opts.push(dir);
      else {
        const turn = R() < P.bend;
        const ds = turn ? [(dir + 1) % 4, (dir + 3) % 4, dir] : [dir, (dir + 1) % 4, (dir + 3) % 4];
        if (turn && R() < 0.5) { const t = ds[0]; ds[0] = ds[1]; ds[1] = t; }
        opts.push(...(P.bend ? ds : [dir]));
      }
      let moved = false;
      for (const dd of opts) {
        // going back from the head: the previous cell lies opposite the way it moved
        let x = cur % W, y = (cur - x) / W; x -= DX[dd]; y -= DY[dd];
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const c = y * W + x;
        if (occ[c] >= 0 || own.has(c) || rs.has(c) || !inM(c)) continue;
        body.push(c); own.add(c); cur = c; dir = dd; moved = true; break;
      }
      first = false;
      if (!moved) break;
    }
    // the longest version (from the head back) that forms no circle
    for (let L = body.length; L >= 1; L--) {
      const S = new Set();
      for (let k = 0; k < L; k++) for (const j of cover[body[k]]) S.add(j);
      if (!circle(S, B)) return { d, c: body.slice(0, L).reverse(), ray, B, S };
    }
    return null;
  }
  function place(cand) {
    const i = A.length;
    A.push({ d: cand.d, c: cand.c, ray: cand.ray });
    pred.push(new Set(cand.B)); succ.push(new Set(cand.S));
    for (const b of cand.B) succ[b].add(i);
    for (const s of cand.S) pred[s].add(i);
    for (const c of cand.c) { occ[c] = i; filled++; }
    for (const c of cand.ray) cover[c].push(i);
  }
  function pickLen() {
    // mostly two or three cells, a few of one, and now and then a long snake (more of them on harder levels)
    if (P.maxLen > 3 && R() < P.longShare) return 4 + Math.floor(R() * (P.maxLen - 3));
    const top = Math.min(3, P.maxLen), w3 = 3 - P.short, r = R() * (top === 2 ? 3 : 4 + w3);
    return top === 2 ? (r < 1 ? 1 : 2) : r < 1 ? 1 : r < 4 ? 2 : 3;
  }
  let fails = 0, chain = 0;
  while (filled < target && fails < 60) {
    const empty = []; for (let c = 0; c < cells; c++) if (occ[c] < 0 && inM(c)) empty.push(c);
    if (!empty.length) break;
    let best = null, bs = -1e9;
    for (let k = 0; k < P.tries; k++) {
      const h = empty[Math.floor(R() * empty.length)], d = Math.floor(R() * 4);
      const cd = grow(h, d, pickLen());
      if (!cd) continue;
      let blocksFree = 0; for (const s of cd.S) if (isFree(s)) blocksFree++;
      // how far ahead its blocker lies: a block from across the board is harder to see
      let gap = 0; for (const c of cd.ray) { if (occ[c] >= 0) break; gap++; }
      const sc = P.hard * (2.2 * blocksFree + (cd.B.size ? 1.4 : 0) + (cd.B.size ? Math.min(gap, 6) * 0.15 : 0))
        + (cd.c.length >= 4 ? 0.6 : 0) + R() * 1.6 - (cd.c.length === 1 && P.maxLen > 2 ? 0.8 : 0);
      if (sc > bs) { bs = sc; best = cd; }
    }
    if (!best) { fails++; continue; }
    // a harder level keeps the arrow only when the chain doesn't get shorter than the plan wants
    place(best); fails = 0;
  }
  // Fill the gaps on the packed boards: a longer tail on a neighbor, or a short arrow of its own
  if (P.fill >= 0.9) {
    for (let pass = 0; pass < 4; pass++) {
      let added = 0;
      for (let c = 0; c < cells; c++) {
        if (occ[c] >= 0 || !inM(c)) continue;
        let done = false;
        // a neighbor's tail grows into the gap (when that keeps the board clearable)
        const x = c % W, y = (c - x) / W;
        for (let dd = 0; dd < 4 && !done; dd++) {
          const nx = x + DX[dd], ny = y + DY[dd]; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = occ[ny * W + nx]; if (j < 0) continue;
          const a = A[j]; if (a.c[0] !== ny * W + nx || a.c.length >= P.maxLen) continue;
          if (a.ray.indexOf(c) >= 0) continue;
          if (a.c.length === 1 && dd !== a.d) {   // a one-cell arrow grows straight back, so its last step still matches its head
            continue;
          }
          if (a.c.length >= 2 && P.bend === 0) { const t0 = a.c[0], t1 = a.c[1]; if (t0 - t1 !== c - t0) continue; }
          const S = new Set(cover[c]); S.delete(j);
          if (cover[c].indexOf(j) >= 0) continue;
          if (circle(S, pred[j])) continue;
          a.c.unshift(c); occ[c] = j; filled++;
          for (const s of S) { pred[s].add(j); succ[j].add(s); }
          done = true;
        }
        // or an arrow of one cell, any way that keeps the board clearable
        for (let d = 0; d < 4 && !done; d++) {
          const cd = grow(c, d, 1);
          if (cd && cd.c.length === 1) { place(cd); done = true; }
        }
        if (done) added++;
      }
      if (!added) break;
    }
  }
  chain = lengthOfChain();
  return { w: W, h: H, m: M.indexOf('0') >= 0 ? M : undefined, a: A.map(a => [a.d].concat(a.c)), chain };
}

function main() {
  const out = [], rows = [];
  let prevD = 0;
  for (let lv = 1; lv <= N; lv++) {
    const P = plan(lv);
    // the difficulty curve (blind bumps, see measure.js): from about 5 at level 1 to about 1400 at level 50, rising every
    // level. Seeds are tried in batches until one lands above the level before.
    const want = 5 * Math.pow(280, (lv - 1) / (N - 1));
    const cands = [];
    let pick = null, pd = 1e9;
    for (let batch = 0; batch < 8 && (!pick || pick.mt.blind < prevD * 1.02); batch++) {
      for (let s = batch * 14; s < (batch + 1) * 14; s++) {
        const L = build(P, lv * 7919 + s * 104729);
        if (C.check(L).length) continue;
        const c = { L, mt: metrics(L, 400, lv) };
        cands.push(c);
        if (lv === 1 && c.mt.chain < 2) continue;   // (the first level teaches: at least one arrow waits for another)
        const d = Math.abs(Math.log(c.mt.blind + 0.3) - Math.log(want + 0.3)) + (c.mt.blind < prevD * 1.02 ? 5 + (prevD - c.mt.blind) / (prevD + 1) : 0);
        if (d < pd) { pd = d; pick = c; }
      }
    }
    if (!cands.length) throw new Error('no level ' + lv);
    if (!pick) pick = cands[0];
    prevD = Math.max(prevD, pick.mt.blind);
    const L = pick.L; delete L.chain;
    out.push(L);
    rows.push([lv, L.w + 'x' + L.h, P.kind, pick.mt.arrows, pick.mt.cells, pick.mt.fillPct, pick.mt.bent, pick.mt.maxLen, pick.mt.free0, pick.mt.chain, pick.mt.avgFree.toFixed(1), pick.mt.blind.toFixed(1), pick.mt.orders.toFixed(1)]);
  }
  const head = '// Arrow Jam levels, made by scripts/arrowjam/gen.js (do not edit by hand: run it again). Checked by scripts/arrowjam/check.js.\n' +
    '// Each level {w, h, m (the shape, 1 for a cell of the board; left out: every cell), a: arrows [direction 0 up 1 right 2 down 3 left, cells tail to head]}\n';
  const body = 'window.ARROWJAM_LEVELS = [\n' + out.map(L => '  ' + JSON.stringify(L)).join(',\n') + '\n];\n';
  fs.writeFileSync(path.join(__dirname, '../../games/arrowjam/levels.js'), head + body);
  console.log('level size shape arrows cells fill% bent maxlen free-at-start chain avg-free blind-bumps log10-orders');
  rows.forEach(r => console.log(r.join('\t')));
}
if (require.main === module) main();
module.exports = { build, plan, shape };
