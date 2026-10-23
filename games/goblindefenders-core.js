// Goblin Defenders: the simulation. No drawing here: the page (goblindefenders.html) draws state and plays the events
// this pushes onto s.ev; the balance test runs the same code in node. Cells are 1 x 1, the centre of cell (i, j) is
// (i + .5, j + .5).
(function (root) {
  'use strict';
  var GD = root.GD || (typeof require !== 'undefined' ? require('./goblindefenders-data.js') : null);
  var COLS = GD.COLS, ROWS = GD.ROWS;
  var T_GRASS = 0, T_ROAD = 1, T_ROCK = 2, T_WATER = 3, T_VILLAGE = 4, T_EXIT = 5, T_SPAWN = 6, T_BRIDGE = 7;
  var CODE = { '.': T_GRASS, '#': T_ROAD, 'o': T_ROCK, '~': T_WATER, 'v': T_VILLAGE, 'E': T_EXIT, 'S': T_SPAWN, '=': T_BRIDGE };

  function cellOf(x) { return Math.floor(x); }
  function idx(i, j) { return j * COLS + i; }
  function inside(i, j) { return i >= 0 && j >= 0 && i < COLS && j < ROWS; }
  function d2(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

  // ── A level ──────────────────────────────────────────────────────────────
  // opts: { shop: {id: rank}, lives?, gold?, seed? }
  function create(map, opts) {
    opts = opts || {};
    var shop = opts.shop || {};
    var s = {
      map: map, maze: map.kind === 'maze', survival: !!map.survival, cells: new Array(COLS * ROWS), tw: new Array(COLS * ROWS),
      spawns: [], exit: null, dist: null, towers: [], enemies: [], projs: [], clouds: [], ev: [], nextId: 1,
      gold: (map.gold || 60) + 10 * (shop.chest || 0), lives: GD.LIVES + 2 * (shop.walls || 0), score: 0, gems: 0, kills: 0, leaks: 0,
      wave: 0, waves: map.waves || 0, spawning: [], countdown: 0, waiting: true, time: 0, over: null,
      shop: shop, sheepT: 35 + Math.random() * 25, hero: { rocketCd: 0, iceCd: 0 }, rnd: GD.rng((opts.seed || map.seed || 1) * 31 + 7), bossesKilled: 0, best: null
    };
    s.maxLives = s.lives;
    for (var j = 0; j < ROWS; j++) for (var i = 0; i < COLS; i++) {
      var ch = (map.grid[j] || '').charAt(i) || '.', t = CODE[ch]; if (t == null) t = T_GRASS;
      s.cells[idx(i, j)] = t; s.tw[idx(i, j)] = null;
      if (t === T_SPAWN) s.spawns.push({ i: i, j: j });
      if (t === T_EXIT) s.exit = { i: i, j: j };
    }
    s.dist = field(s, -1);
    return s;
  }
  function walkable(s, k, block) {
    if (k === block) return false;
    var t = s.cells[k];
    if (t === T_ROAD || t === T_SPAWN || t === T_EXIT || t === T_BRIDGE) return true;
    if (s.maze && t === T_GRASS) return !s.tw[k];
    return false;
  }
  // distance (in steps) from every cell to the village gate; block: a cell to treat as built on (trying a placement)
  function field(s, block) {
    var D = new Int16Array(COLS * ROWS).fill(-1), q = [idx(s.exit.i, s.exit.j)]; D[q[0]] = 0;
    for (var h = 0; h < q.length; h++) {
      var k = q[h], i = k % COLS, j = (k - i) / COLS;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var a = i + d[0], b = j + d[1]; if (!inside(a, b)) return; var n = idx(a, b);
        if (D[n] < 0 && walkable(s, n, block)) { D[n] = D[k] + 1; q.push(n); }
      });
    }
    return D;
  }
  function canBuild(s, i, j) {
    if (!inside(i, j)) return false;
    var k = idx(i, j); if (s.cells[k] !== T_GRASS || s.tw[k]) return false;
    if (!s.maze) return true;
    // a maze: the enemies must still have a way through, and nobody may be standing on (or stepping into) the cell
    for (var e = 0; e < s.enemies.length; e++) { var en = s.enemies[e]; if (en.fly || en.dead) continue; if ((cellOf(en.x) === i && cellOf(en.y) === j) || (en.ti === i && en.tj === j)) return false; }
    var D = field(s, k);
    for (var p = 0; p < s.spawns.length; p++) if (D[idx(s.spawns[p].i, s.spawns[p].j)] < 0) return false;
    for (e = 0; e < s.enemies.length; e++) { en = s.enemies[e]; if (!en.fly && !en.dead && !en.sheep && en.ti != null && inside(en.ti, en.tj) && D[idx(en.ti, en.tj)] < 0) return false; }
    return true;
  }
  // would building here wall the enemies in? (so the grid can show those cells as refused)
  function blocks(s, i, j) { return s.maze && inside(i, j) && s.cells[idx(i, j)] === T_GRASS && !s.tw[idx(i, j)] && !canBuild(s, i, j); }

  // ── Towers ───────────────────────────────────────────────────────────────
  function stat(s, t, key, lv) {
    var d = GD.TOWERS[t.type || t], L = (lv || t.lv) - 1, v = d[key]; if (Array.isArray(v)) v = v[L];
    var m = GD.mastery((s.shop['m_' + (t.type || t)]) || 0);
    if (key === 'dmg' || key === 'dps') v *= m.dmg;
    if (key === 'range') v *= m.range;
    if (key === 'slowT' && (t.type || t) === 'frost') v *= m.dmg;
    return v;
  }
  function unlocked(s, type) { var u = GD.TOWERS[type].unlock; return !u || !!s.shop[u]; }
  function build(s, type, i, j) {
    var d = GD.TOWERS[type]; if (!d || !unlocked(s, type) || s.gold < d.cost || !canBuild(s, i, j)) return null;
    var t = { id: s.nextId++, type: type, lv: 1, i: i, j: j, x: i + .5, y: j + .5, cd: .2, angle: Math.PI * .25 + s.rnd() * .5, spent: d.cost, kills: 0, recoil: 0, fired: 0, built: s.time };
    s.gold -= d.cost; s.towers.push(t); s.tw[idx(i, j)] = t;
    if (s.maze) s.dist = field(s, -1);
    s.ev.push({ t: 'build', tower: t });
    return t;
  }
  function upgradeCost(t) { return t.lv >= 3 ? 0 : GD.TOWERS[t.type].up[t.lv - 1]; }
  function upgrade(s, t) {
    var c = upgradeCost(t); if (!c || s.gold < c) return false;
    s.gold -= c; t.spent += c; t.lv++; s.ev.push({ t: 'upgrade', tower: t }); return true;
  }
  function sellValue(t) { return Math.floor(t.spent / 2); }
  function sell(s, t) {
    var v = sellValue(t); s.gold += v; s.towers.splice(s.towers.indexOf(t), 1); s.tw[idx(t.i, t.j)] = null;
    if (s.maze) s.dist = field(s, -1);
    s.ev.push({ t: 'sell', tower: t, gold: v });
  }

  // ── Waves and enemies ────────────────────────────────────────────────────
  function startWave(s) {
    if (s.over || (s.waves && s.wave >= s.waves)) return false;
    var early = s.waiting ? 0 : Math.ceil(s.countdown);
    s.waiting = false; s.wave++;
    var w = GD.wave(s.map, s.wave);
    w.groups.forEach(function (g) { for (var n = 0; n < g.n; n++) s.spawning.push({ type: g.type, at: s.time + g.at + n * g.gap, hp: w.hp, sp: g.sp }); });
    if (s.wave > 1) { s.gold += w.bonus + early; s.score += (w.bonus + early) * 10; }
    s.countdown = 0;
    s.ev.push({ t: 'wave', n: s.wave, early: early, bonus: s.wave > 1 ? w.bonus + early : 0, boss: w.groups.some(function (g) { return g.boss; }) });
    return true;
  }
  // where an entrance's enemies appear: just past the edge of the map beside it
  function spawnPoint(sp) {
    var x = sp.i + .5, y = sp.j + .5;
    if (sp.i === 0) x = -.6; else if (sp.i === COLS - 1) x = COLS + .6; else if (sp.j === 0) y = -.6; else if (sp.j === ROWS - 1) y = ROWS + .6;
    return { x: x, y: y };
  }
  function spawn(s, type, hpMul, at) {
    var d = GD.ENEMIES[type], sp = at && at.sp != null ? s.spawns[at.sp] : s.spawns[Math.floor(s.rnd() * s.spawns.length)], p = at && at.x != null ? at : spawnPoint(sp);
    var hp = Math.round(d.hp * (d.boss ? Math.max(1, hpMul * .6 + .4) : hpMul));
    var e = { id: s.nextId++, type: type, x: p.x, y: p.y, hp: hp, maxHp: hp, speed: d.speed * (.94 + s.rnd() * .12), armor: d.armor || 0, fly: !!d.fly, boss: !!d.boss,
      ti: at && at.ti != null ? at.ti : sp.i, tj: at && at.tj != null ? at.tj : sp.j, dir: 'r', slow: 0, slowT: 0, phase: s.rnd(), flash: 0, dead: false, born: s.time, healT: 1 + s.rnd(), brood: d.brood ? 3 : 0, wob: s.rnd() * 6 };
    if (e.fly) { e.fx = s.exit.i + .5; e.fy = s.exit.j + .5; }
    s.enemies.push(e); return e;
  }
  function spawnSheep(s) {
    // a sheep wanders in from an edge across the grass, and off again
    var tries = 0, i, j;
    do { i = Math.floor(s.rnd() * COLS); j = Math.floor(s.rnd() * ROWS); tries++; } while (tries < 40 && s.cells[idx(i, j)] !== T_GRASS);
    if (tries >= 40) return;
    var left = s.rnd() < .5, e = spawn(s, 'sheep', 1, { x: left ? -.6 : COLS + .6, y: j + .5, ti: left ? 0 : COLS - 1, tj: j });
    e.sheep = true; e.leaveT = s.time + 22 + s.rnd() * 10; e.speed = .55;
  }
  function sheepFree(s, i, j) { return inside(i, j) && !s.tw[idx(i, j)] && (s.cells[idx(i, j)] === T_GRASS || s.cells[idx(i, j)] === T_ROAD); }

  function moveEnemy(s, e, dt) {
    var sp = e.speed * (e.slowT > 0 ? 1 - e.slow : 1) * (e.frozen > 0 ? 0 : 1);
    if (e.fly) {
      var dx = e.fx - e.x, dy = e.fy - e.y, L = Math.sqrt(dx * dx + dy * dy);
      if (L < .3) return leak(s, e);
      var st = Math.min(L, sp * dt); e.x += dx / L * st; e.y += dy / L * st + Math.sin(s.time * 2 + e.wob) * .15 * dt;
      e.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
      e.left = L; return;
    }
    var step = sp * dt;
    while (step > 0 && !e.dead) {
      var cx = e.ti + .5, cy = e.tj + .5, dx2 = cx - e.x, dy2 = cy - e.y, L2 = Math.abs(dx2) + Math.abs(dy2);
      if (L2 <= step) {
        e.x = cx; e.y = cy; step -= L2;
        if (e.sheep) { if (!nextSheepCell(s, e)) return; continue; }
        if (e.ti === s.exit.i && e.tj === s.exit.j) return leak(s, e);
        if (!nextCell(s, e)) return;
      } else {
        // move along x first then y, so corners stay square like a real path
        if (Math.abs(dx2) > 1e-6) { var mx = Math.min(Math.abs(dx2), step); e.x += Math.sign(dx2) * mx; step -= mx; e.dir = dx2 > 0 ? 'r' : 'l'; }
        else { var my = Math.min(Math.abs(dy2), step); e.y += Math.sign(dy2) * my; step -= my; e.dir = dy2 > 0 ? 'd' : 'u'; }
      }
    }
    var k = inside(e.ti, e.tj) ? s.dist[idx(e.ti, e.tj)] : 99;
    e.left = (k < 0 ? 99 : k) + Math.abs(e.ti + .5 - e.x) + Math.abs(e.tj + .5 - e.y);
  }
  function nextCell(s, e) {
    var D = s.dist, cur = inside(e.ti, e.tj) ? D[idx(e.ti, e.tj)] : -1, best = null, bd = 1e9;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], pdx = e.ti - cellOf(e.x - (e.dir === 'r' ? .01 : e.dir === 'l' ? -.01 : 0)), last = e.lastD;
    for (var n = 0; n < 4; n++) {
      var a = e.ti + dirs[n][0], b = e.tj + dirs[n][1]; if (!inside(a, b)) continue; var v = D[idx(a, b)]; if (v < 0) continue;
      var score = v * 10 + (last && last[0] === dirs[n][0] && last[1] === dirs[n][1] ? 0 : 1);   // straight on wins ties
      if (v < (cur < 0 ? 1e9 : cur) && score < bd) { bd = score; best = dirs[n]; }
    }
    if (!best) { if (cur < 0) { e.stuck = (e.stuck || 0) + 1; } return false; }
    e.lastD = best; e.ti += best[0]; e.tj += best[1]; return true;
  }
  function nextSheepCell(s, e) {
    if (s.time > e.leaveT) { // head for the nearest side edge and wander off
      var tx = e.x < COLS / 2 ? -1 : COLS; e.ti += tx < e.ti ? -1 : 1; if (e.ti < -1 || e.ti > COLS) { e.dead = true; e.gone = true; } return true;
    }
    var opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(function (d) { return sheepFree(s, e.ti + d[0], e.tj + d[1]); });
    if (!opts.length) { e.leaveT = 0; return true; }
    var keep = e.lastD && opts.filter(function (d) { return d[0] === e.lastD[0] && d[1] === e.lastD[1]; })[0];
    var d = keep && s.rnd() < .6 ? keep : opts[Math.floor(s.rnd() * opts.length)];
    e.lastD = d; e.ti += d[0]; e.tj += d[1]; return true;
  }
  function leak(s, e) {
    if (e.dead) return; e.dead = true; e.leaked = true;
    var d = GD.ENEMIES[e.type]; s.lives = Math.max(0, s.lives - d.lives); s.leaks++;
    s.ev.push({ t: 'leak', e: e, lives: d.lives });
    if (s.lives <= 0 && !s.over) { s.over = 'lose'; s.ev.push({ t: 'lose' }); }
  }
  function hurt(s, e, dmg, src, pierce) {
    if (e.dead) return 0;
    var real = pierce ? dmg : Math.max(dmg * .5, dmg - e.armor);   // armour soaks a few points of every hit, never more than half
    e.hp -= real; e.flash = .12;
    if (e.brood && e.hp < e.maxHp * e.brood / 4) {   // the Spider Queen sheds a brood of spiders as she weakens
      e.brood--; for (var n = 0; n < 3; n++) { var b = spawn(s, 'spider', GD.waveHp(s.map, s.wave) * .8, { x: e.x + (s.rnd() - .5) * .3, y: e.y + (s.rnd() - .5) * .3, ti: e.ti, tj: e.tj }); b.lastD = e.lastD; }
      s.ev.push({ t: 'brood', e: e });
    }
    if (e.hp <= 0) kill(s, e, src);
    return real;
  }
  function kill(s, e, src) {
    e.dead = true; e.hp = 0;
    var d = GD.ENEMIES[e.type];
    if (e.sheep) { s.gold += 10; s.gems += 1; s.score += 250; s.ev.push({ t: 'sheep', e: e, gold: 10 }); return; }
    s.gold += d.gold; s.kills++; s.score += Math.ceil(e.maxHp / 3) + (d.boss ? 2000 : 0);
    if (d.boss) { s.bossesKilled++; s.gems += 5; }
    if (src && src.tower) src.tower.kills++;
    s.ev.push({ t: 'kill', e: e, gold: d.gold, boss: !!d.boss });
  }
  function inRange(t, e, r, minR) { var q = d2(t.x, t.y, e.x, e.y); return q <= r * r && (!minR || q >= minR * minR); }
  function pickTarget(s, t) {
    var d = GD.TOWERS[t.type], r = stat(s, t, 'range'), best = null, bl = 1e9, sheep = null;
    for (var n = 0; n < s.enemies.length; n++) {
      var e = s.enemies[n]; if (e.dead || (e.fly && !d.air)) continue;
      if (e.x < -.2 || e.y < -.2 || e.x > COLS + .2 || e.y > ROWS + .2) continue;   // still coming in from the edge
      if (!inRange(t, e, r, d.minRange)) continue;
      if (e.sheep) { sheep = sheep || e; continue; }
      var l = e.left == null ? 99 : e.left; if (l < bl) { bl = l; best = e; }
    }
    return best || sheep;
  }
  function fire(s, t, e) {
    var d = GD.TOWERS[t.type], dmg = stat(s, t, 'dmg');
    t.angle = Math.atan2(e.y - t.y, e.x - t.x); t.recoil = 1; t.fired = s.time;
    if (d.zap) {   // lightning: the first enemy, then jumping to the next nearest
      var hit = [e], pts = [{ x: t.x, y: t.y - .55 }, { x: e.x, y: e.y }], cur = e, n = stat(s, t, 'chain'), k = 1;
      hurt(s, e, dmg, { tower: t });
      while (hit.length < n) {
        var nx = null, nd = 1.8 * 1.8;
        for (var q = 0; q < s.enemies.length; q++) { var o = s.enemies[q]; if (o.dead || hit.indexOf(o) >= 0 || o.sheep) continue; var dd = d2(cur.x, cur.y, o.x, o.y); if (dd < nd) { nd = dd; nx = o; } }
        if (!nx) break; hit.push(nx); pts.push({ x: nx.x, y: nx.y }); k *= .85; hurt(s, nx, dmg * k, { tower: t }); cur = nx;
      }
      s.ev.push({ t: 'zap', tower: t, pts: pts, lv: t.lv }); return;
    }
    if (d.ring) {   // the spike dome: everyone on the ground around it
      var r = stat(s, t, 'range');
      s.enemies.forEach(function (o) { if (!o.dead && !o.fly && inRange(t, o, r)) { hurt(s, o, dmg, { tower: t }); o.slow = Math.max(o.slow, stat(s, t, 'slow')); o.slowT = Math.max(o.slowT, d.slowT); } });
      s.ev.push({ t: 'slam', tower: t, r: r }); return;
    }
    var dist = Math.sqrt(d2(t.x, t.y, e.x, e.y)), dur = Math.max(.12, dist / d.speed);
    // arcing shots aim where the enemy will be when the shot lands
    var lx = e.x, ly = e.y;
    if (d.arc) { var lead = leadPos(s, e, dur); lx = lead.x; ly = lead.y; }
    var p = { type: d.proj, tower: t, kind: t.type, x: t.x + Math.cos(t.angle) * .3, y: t.y - .35 + Math.sin(t.angle) * .2, sx: 0, sy: 0, tx: lx, ty: ly, target: e, t: 0, dur: dur, arc: d.arc || 0, dmg: dmg, lv: t.lv };
    p.sx = p.x; p.sy = p.y;
    s.projs.push(p); s.ev.push({ t: 'shoot', tower: t, p: p });
  }
  // where a ground enemy will be after time dt (walking its path); flyers: straight on
  function leadPos(s, e, dt) {
    var sp = e.speed * (e.slowT > 0 ? 1 - e.slow : 1) * (e.frozen > 0 ? 0 : 1), go = sp * dt;
    if (e.fly || e.sheep) { var dx = (e.fx || e.x) - e.x, dy = (e.fy || e.y) - e.y, L = Math.sqrt(dx * dx + dy * dy) || 1; return { x: e.x + dx / L * Math.min(go, L), y: e.y + dy / L * Math.min(go, L) }; }
    var x = e.x, y = e.y, ti = e.ti, tj = e.tj, D = s.dist, guard = 0;
    while (go > 0 && guard++ < 20) {
      var cx = ti + .5, cy = tj + .5, L2 = Math.abs(cx - x) + Math.abs(cy - y);
      if (L2 >= go) { var fx = Math.abs(cx - x), m = Math.min(fx, go); x += Math.sign(cx - x) * m; go -= m; y += Math.sign(cy - y) * Math.min(Math.abs(cy - y), go); return { x: x, y: y }; }
      x = cx; y = cy; go -= L2;
      var cur = inside(ti, tj) ? D[idx(ti, tj)] : -1, nb = null;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var a = ti + d[0], b = tj + d[1]; if (inside(a, b) && D[idx(a, b)] >= 0 && D[idx(a, b)] < cur && !nb) nb = d; });
      if (!nb) break; ti += nb[0]; tj += nb[1];
    }
    return { x: x, y: y };
  }
  function land(s, p) {
    var d = GD.TOWERS[p.kind], t = p.tower;
    if (p.type === 'bolt') { if (!p.target.dead) hurt(s, p.target, p.dmg, { tower: t }, d.pierce); s.ev.push({ t: 'hit', p: p, x: p.x, y: p.y }); return; }
    var r = d.splash ? stat(s, t, 'splash', p.lv) : 0;
    if (p.type === 'ice') {
      var slow = stat(s, t, 'slow', p.lv), st = stat(s, t, 'slowT', p.lv);
      s.enemies.forEach(function (o) { if (o.dead || o.sheep && o !== p.target) return; if (o === p.target || d2(o.x, o.y, p.x, p.y) <= r * r) {
        var f = GD.ENEMIES[o.type].noSlow ? slow * .4 : slow; o.slow = Math.max(o.slowT > 0 ? o.slow : 0, f); o.slowT = Math.max(o.slowT, st); if (o === p.target) hurt(s, o, p.dmg, { tower: t }); } });
      s.ev.push({ t: 'frost', x: p.x, y: p.y, r: r }); return;
    }
    // splash shots: bomb, acid, rock, shell
    s.enemies.forEach(function (o) { if (o.dead || o.fly) return; var q = d2(o.x, o.y, p.tx, p.ty); if (q <= r * r) hurt(s, o, p.dmg * (q < r * r * .25 ? 1 : .7), { tower: t }, d.pierce); });
    if (p.type === 'acid') { var c = { x: p.tx, y: p.ty, r: r, dps: stat(s, t, 'dps', p.lv), t: d.cloudT, T: d.cloudT, tower: t }; s.clouds.push(c); s.ev.push({ t: 'acid', c: c }); }
    else s.ev.push({ t: 'boom', kind: p.type, x: p.tx, y: p.ty, r: r, lv: p.lv });
  }

  // ── The goblin engineer's powers ─────────────────────────────────────────
  function rocketCd(s) { return 40 - 6 * (s.shop.rockets || 0); }
  function rocket(s, x, y) {
    if (s.hero.rocketCd > 0 || s.over) return false;
    s.hero.rocketCd = rocketCd(s);
    var dmg = 45 * (1 + .35 * (s.shop.rockets || 0)) * Math.max(1, GD.waveHp(s.map, Math.max(1, s.wave)) * .6);
    for (var n = 0; n < 5; n++) { var a = n / 5 * Math.PI * 2, rr = n ? .6 : 0; s.projs.push({ type: 'rocket', kind: 'rocket', x: COLS + .5, y: ROWS + .5, sx: COLS + .5, sy: ROWS + .5, tx: x + Math.cos(a) * rr, ty: y + Math.sin(a) * rr, t: -n * .12, dur: .9, arc: 1.2, dmg: dmg, rocket: true }); }
    s.ev.push({ t: 'rocket', x: x, y: y }); return true;
  }
  function iceStorm(s) {
    if (!s.shop.ice || s.hero.iceCd > 0 || s.over) return false;
    s.hero.iceCd = 60;
    s.enemies.forEach(function (o) { if (!o.dead && !o.sheep) { o.frozen = GD.ENEMIES[o.type].boss ? 1.2 : 3; hurt(s, o, 5); } });
    s.ev.push({ t: 'ice' }); return true;
  }

  // ── One step ─────────────────────────────────────────────────────────────
  function step(s, dt) {
    if (s.over === 'lose' || s.over === 'win') return;
    s.time += dt;
    if (s.hero.rocketCd > 0) s.hero.rocketCd = Math.max(0, s.hero.rocketCd - dt);
    if (s.hero.iceCd > 0) s.hero.iceCd = Math.max(0, s.hero.iceCd - dt);
    if (s.waiting) return;
    // spawn what's due
    for (var n = s.spawning.length - 1; n >= 0; n--) { var q = s.spawning[n]; if (q.at <= s.time) { s.spawning.splice(n, 1); var e = spawn(s, q.type, q.hp); if (GD.ENEMIES[q.type].boss) s.ev.push({ t: 'boss', e: e }); } }
    // the next wave comes on a timer once this one is all out (call it early for gold)
    if (!s.spawning.length && (!s.waves || s.wave < s.waves)) {
      if (s.countdown <= 0) s.countdown = s.wave === 0 ? 0 : 14 + Math.min(8, s.wave * .3);
      else { s.countdown -= dt; if (s.countdown <= 0) { s.countdown = 0; startWave(s); } }
    }
    // sheep now and then
    s.sheepT -= dt; if (s.sheepT <= 0) { s.sheepT = 45 + s.rnd() * 40; spawnSheep(s); }
    // enemies
    for (n = 0; n < s.enemies.length; n++) {
      e = s.enemies[n]; if (e.dead) continue;
      if (e.slowT > 0) e.slowT -= dt; if (e.frozen > 0) e.frozen -= dt; if (e.flash > 0) e.flash -= dt;
      var mv = e.speed * (e.slowT > 0 ? 1 - e.slow : 1) * (e.frozen > 0 ? 0 : 1);
      e.phase = (e.phase + dt * mv * 1.6) % 1;
      if (GD.ENEMIES[e.type].heal) { e.healT -= dt; if (e.healT <= 0) { e.healT = 2.2; var healed = [];
        s.enemies.forEach(function (o) { if (!o.dead && !o.sheep && !o.boss && o.hp < o.maxHp && d2(o.x, o.y, e.x, e.y) < 1.6 * 1.6) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * .08); healed.push(o); } });
        if (healed.length) s.ev.push({ t: 'heal', e: e, list: healed }); } }
      moveEnemy(s, e, dt);
    }
    // acid clouds
    for (n = s.clouds.length - 1; n >= 0; n--) {
      var c = s.clouds[n]; c.t -= dt; if (c.t <= 0) { s.clouds.splice(n, 1); continue; }
      for (var m = 0; m < s.enemies.length; m++) { var o = s.enemies[m]; if (!o.dead && !o.fly && d2(o.x, o.y, c.x, c.y) <= c.r * c.r) { o.poisoned = .3; hurt(s, o, c.dps * dt, { tower: c.tower }, true); o.flash = Math.min(o.flash, .02); } }
    }
    // towers
    for (n = 0; n < s.towers.length; n++) {
      var t = s.towers[n]; t.cd -= dt; if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 4);
      if (t.cd > 0) continue;
      var tg = pickTarget(s, t); if (!tg) { t.cd = .05; continue; }
      fire(s, t, tg); t.cd = 1 / stat(s, t, 'rate');
    }
    // shots in flight
    for (n = s.projs.length - 1; n >= 0; n--) {
      var p = s.projs[n]; p.t += dt; if (p.t < 0) continue;
      if (p.type === 'bolt' || p.type === 'ice') {   // homing
        if (!p.target.dead) { p.tx = p.target.x; p.ty = p.target.y; }
        var dx = p.tx - p.x, dy = p.ty - p.y, L = Math.sqrt(dx * dx + dy * dy), sp = GD.TOWERS[p.kind].speed * dt;
        p.ang = Math.atan2(dy, dx);
        if (L <= sp + .05) { p.x = p.tx; p.y = p.ty; s.projs.splice(n, 1); land(s, p); } else { p.x += dx / L * sp; p.y += dy / L * sp; }
      } else {
        var f = Math.min(1, p.t / p.dur); p.x = p.sx + (p.tx - p.sx) * f; p.y = p.sy + (p.ty - p.sy) * f; p.z = Math.sin(f * Math.PI) * p.arc * Math.min(2.2, Math.sqrt(d2(p.sx, p.sy, p.tx, p.ty)) * .35 + .3);
        if (f >= 1) { s.projs.splice(n, 1);
          if (p.rocket) { s.enemies.forEach(function (o) { if (!o.dead && !o.sheep && d2(o.x, o.y, p.tx, p.ty) < .9 * .9) hurt(s, o, p.dmg, null, true); }); s.ev.push({ t: 'boom', kind: 'rocket', x: p.tx, y: p.ty, r: .9 }); }
          else land(s, p); }
      }
    }
    // clear the dead
    for (n = s.enemies.length - 1; n >= 0; n--) if (s.enemies[n].dead) s.enemies.splice(n, 1);
    // won? every wave sent and nobody left
    if (s.waves && s.wave >= s.waves && !s.spawning.length && !s.enemies.some(function (o) { return !o.sheep; }) && !s.over) {
      s.over = 'win'; s.score += s.lives * 100 + GD.stars(s.lives, s.maxLives) * 500; s.ev.push({ t: 'win' });
    }
  }

  // ── Saving: a checkpoint at the start of a wave ──────────────────────────
  function snapshot(s) {
    return { v: 1, map: s.map.id, wave: s.wave, gold: s.gold, lives: s.lives, maxLives: s.maxLives, score: s.score, gems: s.gems, kills: s.kills, leaks: s.leaks, time: Math.round(s.time),
      bosses: s.bossesKilled, towers: s.towers.map(function (t) { return [t.type, t.lv, t.i, t.j, t.spent, t.kills]; }) };
  }
  function restore(s, snap) {
    s.wave = snap.wave; s.gold = snap.gold; s.lives = snap.lives; s.maxLives = snap.maxLives || s.maxLives; s.score = snap.score; s.gems = snap.gems || 0; s.kills = snap.kills || 0; s.leaks = snap.leaks || 0; s.time = snap.time || 0; s.bossesKilled = snap.bosses || 0;
    snap.towers.forEach(function (a) { var t = { id: s.nextId++, type: a[0], lv: a[1], i: a[2], j: a[3], x: a[2] + .5, y: a[3] + .5, cd: .3, angle: Math.PI * .3, spent: a[4], kills: a[5] || 0, recoil: 0, fired: 0, built: -9 }; s.towers.push(t); s.tw[idx(t.i, t.j)] = t; });
    if (s.maze) s.dist = field(s, -1);
    s.waiting = true;
  }

  var Core = { create: create, step: step, build: build, canBuild: canBuild, blocks: blocks, upgrade: upgrade, upgradeCost: upgradeCost, sell: sell, sellValue: sellValue, stat: stat, unlocked: unlocked,
    startWave: startWave, rocket: rocket, iceStorm: iceStorm, rocketCd: rocketCd, snapshot: snapshot, restore: restore, spawnPoint: spawnPoint, field: field,
    T: { GRASS: T_GRASS, ROAD: T_ROAD, ROCK: T_ROCK, WATER: T_WATER, VILLAGE: T_VILLAGE, EXIT: T_EXIT, SPAWN: T_SPAWN, BRIDGE: T_BRIDGE }, idx: idx, inside: inside };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core; else root.GDCore = Core;
})(this);
