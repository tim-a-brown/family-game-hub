'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// Mazes: the maze engine for games/mazes.html (and its history view).
// Seeded, so a maze is just {shape, size, paths, seed}: the same four values
// always give the same maze (the Daily maze is the same for everyone).
//
//   MazeCore.make({shape:'square'|'round', size:'easy'..'expert', paths:'winding'|'mixed'|'branchy', seed})
//     -> maze {n, nb, links, start, finish, par, depth, solution, ...}
//        a perfect maze: every square reachable, exactly one way between any two
//   MazeCore.walls(m, tr, gaps)    SVG path data for the walls (tr: drawn on its side)
//   MazeCore.line(m, cells, tr, o) SVG path data for a line through cells (o.entry / o.exit stubs)
//   MazeCore.center / cellAt / bounds     geometry in drawing units (U per square)
//   MazeCore.treePath(m, a, b, limit)     the one way from a to b (null if longer than limit)
//   MazeCore.daily('2026-10-11')          today's maze settings
// Paths: winding = recursive backtracker (long corridors), mixed = Wilson's
// (uniform spanning tree), branchy = growing tree / Prim's (many short dead ends).
// ═══════════════════════════════════════════════════════════════════════════
var MazeCore = (function () {
  var U = 10, TAU = Math.PI * 2;
  var SIZES = {
    easy:   { name: 'Easy',   cols: 8,  rows: 12, rings: 6 },
    medium: { name: 'Medium', cols: 14, rows: 21, rings: 10 },
    hard:   { name: 'Hard',   cols: 20, rows: 30, rings: 14 },
    expert: { name: 'Expert', cols: 30, rows: 45, rings: 20 }
  };
  var PATHS = { winding: 'Winding', mixed: 'Mixed', branchy: 'Branchy' };

  // ── Seeded random ──────────────────────────────────────────────────────────
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function ri(R, n) { return Math.floor(R() * n); }

  // ── Grids: cells and who is next to whom ──────────────────────────────────
  function rectGrid(cols, rows) {
    var n = cols * rows, nb = [];
    for (var i = 0; i < n; i++) {
      var r = Math.floor(i / cols), c = i % cols, l = [];
      if (r > 0) l.push(i - cols);
      if (c < cols - 1) l.push(i + 1);
      if (r < rows - 1) l.push(i + cols);
      if (c > 0) l.push(i - 1);
      nb.push(l);
    }
    return { shape: 'square', cols: cols, rows: rows, n: n, nb: nb };
  }
  // Rings of cells around a centre cell; a ring splits its cells when they get too wide
  function polarGrid(rings) {
    var counts = [1], off = [0], ring = [0], idx = [0], i, j;
    for (i = 1; i < rings; i++) { var prev = counts[i - 1]; counts.push(prev * Math.max(1, Math.round(TAU * i / prev))); }
    for (i = 1; i < rings; i++) off.push(off[i - 1] + counts[i - 1]);
    var n = off[rings - 1] + counts[rings - 1], nb = [];
    for (i = 0; i < n; i++) nb.push([]);
    for (i = 1; i < rings; i++) for (j = 0; j < counts[i]; j++) { ring.push(i); idx.push(j); }
    function add(a, b) { nb[a].push(b); nb[b].push(a); }
    for (i = 1; i < rings; i++) {
      var cnt = counts[i], ratio = counts[i] / counts[i - 1];
      for (j = 0; j < cnt; j++) {
        var c = off[i] + j;
        add(c, off[i] + (j + 1) % cnt);
        add(c, i === 1 ? 0 : off[i - 1] + Math.floor(j / ratio));
      }
    }
    return { shape: 'round', rings: rings, counts: counts, off: off, ring: ring, idx: idx, n: n, nb: nb };
  }
  function inward(m, c) { var i = m.ring[c]; if (i <= 0) return -1; if (i === 1) return 0; return m.off[i - 1] + Math.floor(m.idx[c] / (m.counts[i] / m.counts[i - 1])); }
  function cwOf(m, c) { var i = m.ring[c]; return m.off[i] + (m.idx[c] + 1) % m.counts[i]; }

  // ── Generators: each returns links[cell] = [cells it opens into] ──────────
  function blank(n) { var L = []; for (var i = 0; i < n; i++) L.push([]); return L; }
  function link(L, a, b) { L[a].push(b); L[b].push(a); }
  function backtracker(g, R, root) {
    var L = blank(g.n), seen = new Uint8Array(g.n), st = [root]; seen[root] = 1;
    while (st.length) {
      var c = st[st.length - 1], o = [];
      for (var k = 0; k < g.nb[c].length; k++) if (!seen[g.nb[c][k]]) o.push(g.nb[c][k]);
      if (!o.length) { st.pop(); continue; }
      var x = o[ri(R, o.length)]; link(L, c, x); seen[x] = 1; st.push(x);
    }
    return L;
  }
  function wilson(g, R) {
    var L = blank(g.n), inT = new Uint8Array(g.n), next = new Int32Array(g.n), order = [], i;
    for (i = 0; i < g.n; i++) order.push(i);
    for (i = order.length - 1; i > 0; i--) { var j = ri(R, i + 1), t = order[i]; order[i] = order[j]; order[j] = t; }
    inT[order[0]] = 1;
    for (i = 1; i < order.length; i++) {
      var u = order[i], c = u;
      if (inT[u]) continue;
      while (!inT[c]) { var x = g.nb[c][ri(R, g.nb[c].length)]; next[c] = x; c = x; }   // loop-erased: the last exit wins
      c = u;
      while (!inT[c]) { inT[c] = 1; link(L, c, next[c]); c = next[c]; }
    }
    return L;
  }
  function prim(g, R, root) {
    var L = blank(g.n), seen = new Uint8Array(g.n), act = [root]; seen[root] = 1;
    while (act.length) {
      var k = ri(R, act.length), c = act[k], o = [];
      for (var q = 0; q < g.nb[c].length; q++) if (!seen[g.nb[c][q]]) o.push(g.nb[c][q]);
      if (!o.length) { act[k] = act[act.length - 1]; act.pop(); continue; }
      var x = o[ri(R, o.length)]; link(L, c, x); seen[x] = 1; act.push(x);
    }
    return L;
  }
  function bfs(m, from) {
    var dist = new Int32Array(m.n).fill(-1), par = new Int32Array(m.n).fill(-1), q = new Int32Array(m.n), h = 0, t = 0;
    dist[from] = 0; q[t++] = from;
    while (h < t) {
      var c = q[h++], l = m.links[c];
      for (var k = 0; k < l.length; k++) { var x = l[k]; if (dist[x] < 0) { dist[x] = dist[c] + 1; par[x] = c; q[t++] = x; } }
    }
    return { dist: dist, par: par };
  }

  function make(o) {
    o = o || {};
    var sz = SIZES[o.size] ? o.size : 'easy', S = SIZES[sz], shape = o.shape === 'round' ? 'round' : 'square';
    var paths = PATHS[o.paths] ? o.paths : 'winding', seed = (o.seed >>> 0) || 1;
    var R = rng(hash(shape + ':' + sz + ':' + paths + ':' + seed));
    var m = shape === 'round' ? polarGrid(S.rings) : rectGrid(S.cols, S.rows);
    var root = shape === 'round' ? 0 : ri(R, m.n);
    m.links = paths === 'mixed' ? wilson(m, R) : paths === 'branchy' ? prim(m, R, root) : backtracker(m, R, root);
    m.size = sz; m.sizeName = S.name; m.paths = paths; m.pathsName = PATHS[paths]; m.seed = seed; m.U = U;
    var i, best = -1, d;
    if (shape === 'round') {
      // finish in the middle; start at the edge, as far from the middle as the maze allows
      m.finish = 0; d = bfs(m, 0).dist;
      var o0 = m.off[m.rings - 1];
      for (i = o0; i < m.n; i++) if (d[i] > best) { best = d[i]; m.start = i; }
      m.rot = 0; m.rot = Math.PI / 2 - aMid(m, m.start);
    } else {
      // start somewhere on the top edge; finish on the bottom edge, as far away as it gets
      m.start = ri(R, m.cols); d = bfs(m, m.start).dist;
      for (i = (m.rows - 1) * m.cols; i < m.n; i++) if (d[i] > best) { best = d[i]; m.finish = i; }
    }
    var t = bfs(m, m.start); m.par = t.par; m.depth = t.dist;
    m.solution = pathTo(m, m.finish);
    return m;
  }
  function linked(m, a, b) { return a >= 0 && b >= 0 && m.links[a].indexOf(b) >= 0; }
  // start → c
  function pathTo(m, c) { var out = []; while (c >= 0) { out.push(c); c = m.par[c]; } return out.reverse(); }
  // The one way from a to b through the maze, or null when it is longer than limit steps
  function treePath(m, a, b, limit) {
    var pa = [a], pb = [b], x = a, y = b, steps = 0, lim = limit == null ? 1e9 : limit;
    while (x !== y) {
      if (m.depth[x] >= m.depth[y]) { x = m.par[x]; pa.push(x); } else { y = m.par[y]; pb.push(y); }
      if (++steps > lim || x < 0 || y < 0) return null;
    }
    pb.pop(); return pa.concat(pb.reverse());
  }
  // Is this a perfect maze? (every cell reachable, links = cells - 1, links symmetric and between neighbours)
  function check(m) {
    var e = 0, ok = true;
    for (var i = 0; i < m.n; i++) m.links[i].forEach(function (x) { e++; if (m.links[x].indexOf(i) < 0 || m.nb[i].indexOf(x) < 0) ok = false; });
    var d = bfs(m, 0).dist, reach = 0; for (i = 0; i < m.n; i++) if (d[i] >= 0) reach++;
    return { perfect: ok && e / 2 === m.n - 1 && reach === m.n, edges: e / 2, cells: m.n, reachable: reach, solution: m.solution.length };
  }

  // ── Geometry (drawing units; a square is U across) ────────────────────────
  function f(x) { return Math.round(x * 100) / 100; }
  function P(tr, x, y) { return tr ? f(y) + ' ' + f(x) : f(x) + ' ' + f(y); }
  function rMid(m, c) { var i = m.ring[c]; return i === 0 ? 0 : (i + 0.5) * U; }
  // round mazes are turned (m.rot) so the way in is at the bottom
  function aMid(m, c) { var i = m.ring[c]; return i === 0 ? 0 : (m.idx[c] + 0.5) / m.counts[i] * TAU + (m.rot || 0); }
  function polar(r, a) { return [r * Math.cos(a), r * Math.sin(a)]; }
  function center(m, c, tr) {
    if (m.shape === 'round') return polar(rMid(m, c), aMid(m, c));
    var x = (c % m.cols + 0.5) * U, y = (Math.floor(c / m.cols) + 0.5) * U;
    return tr ? [y, x] : [x, y];
  }
  function cellAt(m, x, y, tr) {
    if (m.shape === 'round') {
      var rr = Math.hypot(x, y) / U, i = Math.floor(rr);
      if (i >= m.rings) return -1;
      if (i === 0) return 0;
      var a = Math.atan2(y, x) - (m.rot || 0); a = ((a % TAU) + TAU) % TAU;
      return m.off[i] + Math.min(m.counts[i] - 1, Math.floor(a / TAU * m.counts[i]));
    }
    var gx = tr ? y : x, gy = tr ? x : y, c = Math.floor(gx / U), r = Math.floor(gy / U);
    if (c < 0 || r < 0 || c >= m.cols || r >= m.rows) return -1;
    return r * m.cols + c;
  }
  function bounds(m, tr) {
    if (m.shape === 'round') { var R = m.rings * U; return { x: -R, y: -R, w: 2 * R, h: 2 * R }; }
    return tr ? { x: 0, y: 0, w: m.rows * U, h: m.cols * U } : { x: 0, y: 0, w: m.cols * U, h: m.rows * U };
  }
  // An arc on a circle of radius r from angle a0 to a1 (a1 > a0)
  function arc(r, a0, a1) {
    var p = polar(r, a0), q = polar(r, a1);
    if (a1 - a0 >= TAU - 1e-6) { var h = polar(r, a0 + Math.PI); return 'M' + f(p[0]) + ' ' + f(p[1]) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(h[0]) + ' ' + f(h[1]) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(p[0]) + ' ' + f(p[1]); }
    return 'M' + f(p[0]) + ' ' + f(p[1]) + 'A' + f(r) + ' ' + f(r) + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + f(q[0]) + ' ' + f(q[1]);
  }
  // Runs of wall around a circle (w[j] = wall on cell j), merged into as few arcs as possible
  function ringRuns(w, r, rot) {
    var n = w.length, out = '', k = w.indexOf(false), j;
    rot = rot || 0;
    if (k < 0) return arc(r, rot, rot + TAU);
    var s = -1;
    for (j = k + 1; j <= k + n; j++) {
      var on = j < k + n && w[j % n];
      if (on && s < 0) s = j;
      if (!on && s >= 0) { out += arc(r, s / n * TAU + rot, j / n * TAU + rot); s = -1; }
    }
    return out;
  }
  // Wall lines. gaps: leave the way in (and, on a square maze, the way out) open
  function walls(m, tr, gaps) {
    var d = '', r, c, s;
    if (m.shape === 'round') {
      for (var i = 1; i < m.rings; i++) {
        var n = m.counts[i], w = [], o = m.off[i];
        for (var j = 0; j < n; j++) w.push(!linked(m, o + j, inward(m, o + j)));
        d += ringRuns(w, i * U, m.rot);
        for (j = 0; j < n; j++) if (!linked(m, o + j, cwOf(m, o + j))) {
          var a = (j + 1) / n * TAU + (m.rot || 0), p = polar(i * U, a), q = polar((i + 1) * U, a);
          d += 'M' + f(p[0]) + ' ' + f(p[1]) + 'L' + f(q[0]) + ' ' + f(q[1]);
        }
      }
      var last = m.rings - 1, ow = [];
      for (j = 0; j < m.counts[last]; j++) ow.push(!(gaps && m.off[last] + j === m.start));
      return d + ringRuns(ow, m.rings * U, m.rot);
    }
    function seg(x0, y0, x1, y1) { d += 'M' + P(tr, x0, y0) + 'L' + P(tr, x1, y1); }
    function hw(r, c) {
      if (r === 0) return !(gaps && m.start === c);
      if (r === m.rows) return !(gaps && m.finish === (m.rows - 1) * m.cols + c);
      return !linked(m, (r - 1) * m.cols + c, r * m.cols + c);
    }
    function vw(r, c) { return c === 0 || c === m.cols || !linked(m, r * m.cols + c - 1, r * m.cols + c); }
    for (r = 0; r <= m.rows; r++) {
      s = -1;
      for (c = 0; c <= m.cols; c++) { var on = c < m.cols && hw(r, c); if (on && s < 0) s = c; if (!on && s >= 0) { seg(s * U, r * U, c * U, r * U); s = -1; } }
    }
    for (c = 0; c <= m.cols; c++) {
      s = -1;
      for (r = 0; r <= m.rows; r++) { var on2 = r < m.rows && vw(r, c); if (on2 && s < 0) s = r; if (!on2 && s >= 0) { seg(c * U, s * U, c * U, r * U); s = -1; } }
    }
    return d;
  }
  // Wall segments in square units [x0,y0,x1,y1] (closed edges), for the labyrinth's walls
  function segments(m) {
    var out = [], r, c, s;
    for (r = 0; r <= m.rows; r++) {
      s = -1;
      for (c = 0; c <= m.cols; c++) {
        var on = c < m.cols && (r === 0 || r === m.rows || !linked(m, (r - 1) * m.cols + c, r * m.cols + c));
        if (on && s < 0) s = c; if (!on && s >= 0) { out.push([s, r, c, r]); s = -1; }
      }
    }
    for (c = 0; c <= m.cols; c++) {
      s = -1;
      for (r = 0; r <= m.rows; r++) {
        var on2 = r < m.rows && (c === 0 || c === m.cols || !linked(m, r * m.cols + c - 1, r * m.cols + c));
        if (on2 && s < 0) s = r; if (!on2 && s >= 0) { out.push([c, s, c, r]); s = -1; }
      }
    }
    return out;
  }
  // A line through cells (each next to the one before). Round mazes follow the rings with arcs.
  // o.entry: start from outside the way in; o.exit: carry on out of the way out (square mazes)
  function line(m, cells, tr, o) {
    o = o || {};
    if (!cells.length) return '';
    var d = '';
    if (m.shape !== 'round') {
      var pts = cells.map(function (c) { return center(m, c, tr); });
      function out(c, up) { var x = (c % m.cols + 0.5) * U, y = up ? 0 : (m.rows + 0.9) * U; return tr ? [y, x] : [x, y]; }
      if (o.entry && cells[0] === m.start) pts.unshift(out(m.start, true));
      if (o.exit && cells[cells.length - 1] === m.finish) pts.push(out(m.finish, false));
      return pts.map(function (p, i) { return (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1]); }).join('');
    }
    // Round: radial steps run along the narrower (outer) cell's middle; ring steps follow the ring
    function norm(a) { while (a > Math.PI) a -= TAU; while (a <= -Math.PI) a += TAU; return a; }
    function arcTo(r, a0, a1) {
      var dl = norm(a1 - a0); if (Math.abs(dl) < 1e-6 || r === 0) return '';
      var q = polar(r, a0 + dl);
      return 'A' + f(r) + ' ' + f(r) + ' 0 0 ' + (dl > 0 ? 1 : 0) + ' ' + f(q[0]) + ' ' + f(q[1]);
    }
    function rel(a, b) { return m.ring[a] === m.ring[b] ? null : aMid(m, m.ring[a] > m.ring[b] ? a : b); }
    var n = cells.length, ent = [], lev = [], k;
    for (k = 0; k < n; k++) {
      var c = cells[k], mid = aMid(m, c);
      ent.push(k > 0 && rel(cells[k - 1], c) != null ? rel(cells[k - 1], c) : mid);
      lev.push(k < n - 1 && rel(c, cells[k + 1]) != null ? rel(c, cells[k + 1]) : mid);
    }
    var p0 = polar(rMid(m, cells[0]), ent[0]);
    if (o.entry && cells[0] === m.start) { var e = polar(m.rings * U, ent[0]); d = 'M' + f(e[0]) + ' ' + f(e[1]) + 'L' + f(p0[0]) + ' ' + f(p0[1]); }
    else d = 'M' + f(p0[0]) + ' ' + f(p0[1]);
    for (k = 0; k < n; k++) {
      var r0 = rMid(m, cells[k]);
      d += arcTo(r0, ent[k], lev[k]);
      if (k === n - 1) break;
      var nx = cells[k + 1], r1 = rMid(m, nx);
      if (m.ring[nx] === m.ring[cells[k]]) d += arcTo(r0, lev[k], ent[k + 1]);
      else { var q = polar(r1, ent[k + 1]); d += 'L' + f(q[0]) + ' ' + f(q[1]); }
    }
    return d;
  }
  // Where the way in and the way out are (for the START / FINISH marks): {x, y, dx, dy} with (dx,dy) pointing out of the maze
  function door(m, which, tr) {
    var c = which === 'start' ? m.start : m.finish;
    if (m.shape === 'round') {
      if (which === 'finish') return { x: 0, y: 0, dx: 0, dy: 0 };
      var a = aMid(m, c), p = polar(m.rings * U, a); return { x: p[0], y: p[1], dx: Math.cos(a), dy: Math.sin(a) };
    }
    var x = (c % m.cols + 0.5) * U, top = which === 'start', y = top ? 0 : m.rows * U, dy = top ? -1 : 1;
    return tr ? { x: y, y: x, dx: dy, dy: 0 } : { x: x, y: y, dx: 0, dy: dy };
  }

  // ── Daily maze: one per calendar day, easiest on Monday, biggest on Saturday ──
  var WEEK = [['hard', 'round'], ['easy', 'square'], ['medium', 'square'], ['easy', 'round'], ['hard', 'square'], ['medium', 'round'], ['expert', 'square']];
  function daily(day) {
    var seed = 100000 + hash('maze-daily:' + day) % 900000, R = rng(seed);
    var dt = new Date(day + 'T12:00:00'), w = WEEK[isNaN(dt) ? 1 : dt.getDay()];
    return { seed: seed, size: w[0], shape: w[1], paths: ['winding', 'mixed', 'branchy'][ri(R, 3)] };
  }

  // ── History view: the maze and the line through it (registered when hist-view.js is on the page) ──
  function svgOf(m, cells, o) {
    o = o || {};
    var b = bounds(m, false), pad = U * 1.4, vb = (b.x - pad) + ' ' + (b.y - pad) + ' ' + (b.w + 2 * pad) + ' ' + (b.h + 2 * pad);
    var sw = Math.max(1.1, U * 0.13);
    return '<svg viewBox="' + vb + '" class="' + (o.cls || '') + '" role="img" aria-label="The maze">' +
      '<path d="' + walls(m, false, true) + '" fill="none" stroke="#23263a" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      (cells && cells.length ? '<path d="' + line(m, cells, false, { entry: true, exit: o.exit }) + '" fill="none" stroke="' + (o.color || '#d2402c') + '" stroke-width="' + U * 0.34 + '" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>' : '') +
      '</svg>';
  }
  function histView(e, ui) {
    var dt = e && e.dt; if (!dt || !dt.s) return null;
    var m = make({ shape: dt.sh, size: dt.z, paths: dt.p, seed: dt.s }), head = dt.h >= 0 && dt.h < m.n ? dt.h : m.start;
    var solved = head === m.finish;
    ui.css('hv-maze', '.hv-maze{align-self:center;width:100%;max-width:300px;padding:10px;border-radius:6px;background:linear-gradient(180deg,#fffaf0,#f5ecd7);box-shadow:0 6px 16px -6px rgba(0,0,0,.6);box-sizing:border-box;}.hv-maze svg{width:100%;height:auto;display:block;}');
    var box = ui.el('div', { class: 'hv-maze', html: svgOf(m, pathTo(m, head), { exit: solved }) });
    var kids = [box];
    if (ui.stats) { var st = ui.stats([['Time', dt.t != null ? clock(dt.t) : null], ['Hints', dt.hn || 0], ['Wrong turns', dt.w != null ? dt.w : null], ['Holes', dt.f ? dt.f : null]]); if (st) kids.push(st); }
    return ui.section((dt.m === 'tilt' ? 'Labyrinth' : 'Maze') + ' No. ' + dt.s, kids, { icon: 'compass' });
  }
  function clock(s) { s = Math.max(0, Number(s) || 0); var m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); }
  if (typeof window !== 'undefined' && window.HistView && HistView.register) HistView.register('mazes', histView);

  return {
    U: U, SIZES: SIZES, PATHS: PATHS, rng: rng, hash: hash, make: make, check: check, linked: linked, pathTo: pathTo, treePath: treePath,
    walls: walls, segments: segments, line: line, center: center, cellAt: cellAt, bounds: bounds, door: door, inward: inward,
    daily: daily, svg: svgOf, histView: histView, clock: clock
  };
})();
if (typeof module !== 'undefined') module.exports = MazeCore;
