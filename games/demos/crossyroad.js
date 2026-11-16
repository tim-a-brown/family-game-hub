// Crossy Road's demo (demo.js; CLAUDE.md, Demos): one world (seed 330: grass, a two-lane road, a tree in the way, a
// river with two rows of logs, grass). Taps hop the chicken forward and across the road, a swipe takes it round the
// tree, and you hop it onto the first log yourself. The world is held still while a caption speaks
// (window.__crossy.hold), the chicken's hops are chosen by a small autopilot below that looks ahead at the traffic and
// the logs, and a guard (G.guard in world.js) keeps a demo from ending in a game over.
(function () {
  'use strict';
  var C = window.__crossy, SEED = 330, LAG = 0.42;
  function G() { return C.G(); }
  // the chicken's autopilot: the hop to make L seconds from now, or null to wait
  function pilot(G, L) {
    var P = G.p, t = G.t + L, HOP = 0.12;
    function ent(row, x, a, b, m) {   // a car or truck over x at any time from a to b
      for (var tt = a; tt <= b; tt += 0.02) for (var k = 0; k < row.ents.length; k++) { var e = row.ents[k]; if (Math.abs(x - G.entX(row, e, tt)) < e.len / 2 + 0.26 + m) return true; }
      return false;
    }
    function train(row, x, a, b) { for (var tt = a; tt <= b; tt += 0.03) { var tr = G.trainAt(row, tt); if (tr) return true; } return false; }
    function grassOk(row, c) { return Math.abs(c) <= 4 && !(row.obs && row.obs[c + 12]); }
    // where the chicken stands at time tt (drifting on a log)
    var cur = G.row(P.row);
    var v = P.log && cur.type === 'river' ? cur.dir * cur.speed : 0;
    function xAt(tt) { return P.x + v * (tt - G.t); }
    // is standing in this row at x safe from a to b
    function stand(row, x, a, b) {
      if (row.type === 'road') return !ent(row, x, a, b, 0.35);
      if (row.type === 'rail') return !train(row, x, a, b);
      return true;
    }
    // hop to row r (dc sideways) at time t: safe on landing and for a while after
    function hopTo(dr, dc) {
      var r = P.row + dr, row = G.row(r), x0 = xAt(t);
      var nx2 = G.row(r + 1), hold = nx2 && (nx2.type === 'grass' || (nx2.type === 'river' && nx2.pads)) ? 0.35 : 0.8;
      if (!stand(cur, x0, G.t, t + HOP / 2 + 0.03)) return false;
      if (row.type === 'river' && !row.pads) {
        var xl = (dr ? x0 : x0 + dc) + v * HOP, tl = t + HOP;
        for (var k = 0; k < row.ents.length; k++) {
          var e = row.ents[k], c = G.entX(row, e, tl);
          if (Math.abs(xl - c) <= e.len / 2 - 0.3) { var vl = row.dir * row.speed, xe = Math.round(xl - c - (e.len - 1) / 2) + (e.len - 1) / 2 + c; if (Math.abs(xe + vl * 1.6) < 3.6 && Math.abs(xe) < 3.8) return true; }
        }
        return false;
      }
      if (row.type === 'river' && row.pads) { var cp = Math.round(dr ? x0 : x0 + dc); return row.pads.indexOf(cp) >= 0 && Math.abs(x0 + (dr ? 0 : dc) - cp) < 0.5; }
      var c2 = Math.round(dr ? x0 : x0 + dc);
      if (row.type === 'grass') return grassOk(row, c2);
      if (Math.abs(c2) > 4) return false;
      return stand(row, c2, Math.max(G.t, t - 0.12), t + hold + L);   // (a little early too: a tap's delay varies)
    }
    if (hopTo(1, 0)) return 'u';
    // stuck on grass behind a tree, or drifting toward the edge on a log: step sideways
    var nx = G.row(P.row + 1);
    if (cur.type === 'grass' && nx.type === 'grass' && !grassOk(nx, Math.round(P.x))) {
      var dc = P.x <= 0 ? 1 : -1; if (hopTo(0, dc)) return dc > 0 ? 'r' : 'l'; if (hopTo(0, -dc)) return dc > 0 ? 'l' : 'r';
    }
    if (cur.type === 'river' && Math.abs(xAt(t + 0.6)) > 3.4) { if (hopTo(-1, 0)) return 'd'; var d2 = xAt(t) > 0 ? -1 : 1; if (hopTo(0, d2)) return d2 > 0 ? 'r' : 'l'; }
    // about to be hit where it stands: back down a row
    if (!stand(cur, xAt(t), G.t, t + 0.5) && hopTo(-1, 0)) return 'd';
    return null;
  }
  // a part of the screen as a target (the 3D view has nothing inside it to point at)
  function spot(fx, fy, w, h) {
    return function () {
      var v = document.querySelector('.cr-view'); if (!v) return null;
      return { nodeType: 1, isConnected: true, tagName: 'DIV',
        getBoundingClientRect: function () { var r = v.getBoundingClientRect(), x = r.left + r.width * fx, y = r.top + r.height * fy; return { left: x - w / 2, top: y - h / 2, right: x + w / 2, bottom: y + h / 2, width: w, height: h }; },
        contains: function (t) { return t === v || v.contains(t); }, dispatchEvent: function (e) { return v.dispatchEvent(e); }, closest: function () { return null; }, scrollIntoView: function () {}, style: {} };
    };
  }
  var tapAt = spot(0.5, 0.72, 30, 30);
  function view() { return document.querySelector('.cr-view'); }
  function hold() { C.hold = true; }
  // the chicken makes its own way to a row: a tap for each hop forward, a swipe for a hop sideways or back
  var lag = { u: LAG, s: LAG + 0.15 };   // a tap's delay and a swipe's, learned as the demo goes
  async function walk(D, row, o) {
    o = o || {};
    var t0 = G().t;   // (the world's own clock: a slow device runs it slower)
    while (G().p.row < row && G().t - t0 < 40) {
      if (o.stopAt && o.stopAt()) return;
      if (!G().p.hop) {
        var td = G().t, h0 = G().hops, d = pilot(G(), lag.u);
        if (d) {
          var k = d === 'u' ? 'u' : 's';
          d = pilot(G(), lag[k]);
          if (d === 'u') await D.tap(tapAt, { after: 0 });
          else if (d) {
            var dx = d === 'r' ? 0.22 : d === 'l' ? -0.22 : 0, dy = d === 'd' ? 0.12 : 0;
            await D.drag(spot(0.5, 0.6, 20, 20), spot(0.5 + dx, 0.6 + dy, 20, 20), { after: 0 });
          }
          // how long a tap or a swipe really takes here, in the world's time (a slow device draws fewer frames)
          if (d && G().hops > h0) lag[k] = Math.max(0.06, Math.min(0.8, lag[k] * 0.5 + (G().t - td) * 0.5));
        }
      }
      await D.wait(40);
    }
  }
  // hold the world at a moment when this hop is safe right away
  async function holdFor(D, dir) { await D.wait(function () { var g = G(); return !g.p.hop && pilot(g, 0) === dir; }, 60000); hold(); }

  Kit.demoScript({
    intro: 'Here’s how the chicken hops across roads and rivers, and then you hop onto a log yourself.',
    beats: 8,
    end: 'Tap to hop forward and swipe to hop sideways. Wait for a gap in the traffic, ride the logs, and keep moving.',
    start: function () {
      var me = (localStorage.getItem('my_name') || '').trim() || 'Player';
      C.start(me, SEED);
      G().guard = true;
      hold();
    },
    steps: async function (D) {
      await D.say('Tap anywhere to hop the chicken forward one row. Every row forward scores a point, and your score shows up here.', { at: '.cr-score', pad: 8 });
      C.hold = false;
      await D.tap(tapAt, { after: 250 });
      await D.wait(function () { return !G().p.hop; }, 2000);
      await D.tap(tapAt, { after: 250 });
      await D.wait(function () { return G().p.row >= 2 && !G().p.hop; }, 3000);
      hold();
      await D.say('Cars and trucks race along the road. Wait for a gap, then hop across.', { pos: 'top' });
      C.hold = false;
      await walk(D, 5);
      await D.wait(function () { return !G().p.hop; }, 2000);
      hold();
      await D.say('A tree is in the way. Swipe left or right to hop sideways. A swipe down hops back.', { pos: 'top' });
      C.hold = false;
      await walk(D, 6);
      await D.wait(function () { return !G().p.hop; }, 2000);
      await holdFor(D, 'u');
      await D.say('The river is deadly, so the chicken has to ride the logs. A log carries the chicken along with it.', { pos: 'top' });
      C.hold = 'u';
      await D.you(view, 'Your turn. Tap to hop onto the log.', { pos: 'top', autoTap: tapAt, until: function () { return G().p.row >= 7 && !G().p.hop; } });
      await walk(D, 9);
      await D.wait(function () { return !G().p.hop; }, 2000);
      hold();
      await D.say('Safe on the grass! Hop off a log before it takes the chicken off the side of the screen.', { pos: 'top' });
      C.hold = false;
      await walk(D, 10);
      await D.wait(function () { return !G().p.hop; }, 2000);
      hold();
      await D.say('The view keeps creeping forward, so keep moving. If you wait too long, an eagle swoops down and carries the chicken off.', { pos: 'top' });
      await D.say('Watch out for trains too: when the signal flashes red and the bell rings, stay off the tracks.', { pos: 'top' });
    }
  });
})();
