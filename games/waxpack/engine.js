'use strict';
// Wax Pack's engine: the player database, ratings measured against the card's own league, and the at-bat.
// Pure (no DOM): the page and Node (scripts/waxpack-sim.js) both run it.
//
// The database (games/waxpack/mlb.json, built by scripts/build-waxpack-mlb.py from the Lahman database):
//   p: "First|Last|born|BT|hitting|pitching|honors"; lg: {year: [AVG, HR/AB, SB/G, BB/PA, SO/PA, ERA, K/9, BB/9]}
// A card shows the season before its year (a 1988 card prints 1987's line); a rookie card with no season before it
// uses the season of its year. Every rate is divided by that season's league rate and multiplied by one timeless
// league (NEUTRAL), so a .300 hitter of 1968 is worth more than a .300 hitter of 1999, and the cards of any decade can
// play one another.
//
// The at-bat (dist): the pitcher's pitch (H heat, B breaking ball, J junk) against what the batter looks for. A batter
// who guesses right squares the ball up; a wrong guess helps the pitcher. Each pitch also leans on a rating: heat on the
// pitcher's Stuff and the hitter's Power, the breaking ball on Stuff and Contact, junk on Control and the hitter's Eye.
(function (root) {
  var NEUTRAL = { avg: .260, hr: .025, bb: .085, so: .16, era: 4.10, k9: 6.2, bb9: 3.3, sb: .059 };
  var PITCHES = ['H', 'B', 'J'];
  var PNAME = { H: 'Heat', B: 'Breaking ball', J: 'Junk' };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp1(v, lo, hi) { return clamp(1 + 9 * (v - lo) / (hi - lo), 1, 10); }
  function rng(seed) {   // mulberry32: a saved game replays the same rolls
    var s = seed >>> 0;
    var f = function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.state = function () { return s; };
    return f;
  }
  function hash(str) { var h = 2166136261; str = String(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function skey(s) { s = String(s || '').toLowerCase(); try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {} return s.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }

  // ── The database ──────────────────────────────────────────────────────────
  var DB = null;
  function load(j) {
    DB = { upto: j.upto, teams: j.teams || {}, lg: j.lg || {}, list: [], byId: {} };
    j.p.forEach(function (s, i) {
      var a = s.split('|');
      var pl = { i: i, f: a[0], l: a[1], born: +a[2] || 0, bt: a[3] || '', hs: a[4] || '', ps: a[5] || '', hon: a[6] || '' };
      pl.k = skey(a[0] + ' ' + a[1]); pl.lk = skey(a[1]); pl.fk = skey(a[0]);
      var y = /^(\d{4})/.exec(pl.hs || pl.ps); pl.y0 = y ? +y[1] : 0;
      var m = /(\d{4}),[^;]*$/.exec(pl.hs.length > pl.ps.length ? pl.hs : pl.ps);
      pl.y1 = Math.max(lastYear(pl.hs), lastYear(pl.ps));
      pl.id = pl.lk.replace(/ /g, '') + '-' + pl.fk.replace(/ /g, '') + '-' + pl.y0;   // a stable id for the league
      DB.list.push(pl); DB.byId[pl.id] = pl;
    });
    return DB;
  }
  function lastYear(s) { if (!s) return 0; var k = s.lastIndexOf(';'); return +(s.slice(k + 1, k + 5)); }
  function seasons(pl, role) {
    var key = role === 'p' ? '_p' : '_h';
    if (pl[key]) return pl[key];
    var src = role === 'p' ? pl.ps : pl.hs;
    return (pl[key] = !src ? [] : src.split(';').map(function (x) {
      var a = x.split(','), v = a.map(Number);
      if (role === 'p') return { y: v[0], t: a[1], g: v[2], gs: v[3], ipo: v[4], h: v[5], er: v[6], hr: v[7], bb: v[8], so: v[9], w: v[10], l: v[11], sv: v[12] };
      return { y: v[0], t: a[1], g: v[2], ab: v[3], h: v[4], d: v[5], tr: v[6], hr: v[7], rbi: v[8], sb: v[9], bb: v[10], so: v[11], pos: a[12] || '' };
    }));
  }
  function honors(pl) {
    if (pl._hon) return pl._hon;
    var o = {};
    String(pl.hon || '').split(' ').forEach(function (t) { if (t) o[t.charAt(0)] = t.slice(1).split('.').map(Number); });
    return (pl._hon = o);
  }
  function teamName(code) { return (DB && DB.teams[code]) || code || ''; }
  function nick(code) { var n = teamName(code); if (/Red Sox|White Sox|Blue Jays/.test(n)) return n.replace(/^.* (\w+ \w+)$/, '$1'); return n.replace(/^.* /, ''); }
  function lgOf(y) { var L = DB && (DB.lg[y] || DB.lg[String(y)]); return L ? { avg: L[0], hr: L[1], sb: L[2] / 9, bb: L[3], so: L[4], era: L[5], k9: L[6], bb9: L[7] } : NEUTRAL; }
  function byId(id) { return DB && DB.byId[id]; }
  function name(pl) { return pl.f + ' ' + pl.l; }

  // Find the player for what was typed: whole words at the start of the last name first, then the first name, then
  // famous (long) careers; a card year puts players who played around it first.
  function find(q, o) {
    o = o || {};
    var k = skey(q); if (k.length < 2 || !DB) return [];
    var words = k.split(' '), yr = o.year || 0, out = [];
    DB.list.forEach(function (pl) {
      var sc = 0;
      if (words.length > 1) {
        var lw = words[words.length - 1], fw = words.slice(0, -1).join(' ');
        if (pl.k === k) sc = 5;
        else if (pl.lk.indexOf(lw) === 0 && pl.fk.indexOf(fw) === 0) sc = 4;
        else if (pl.k.indexOf(k) >= 0) sc = 2;
        else if (pl.lk === lw) sc = 1;
      } else if (pl.lk === k) sc = 4; else if (pl.lk.indexOf(k) === 0) sc = 3; else if (pl.fk === k) sc = 1.5; else if (pl.k.indexOf(' ' + k) > 0) sc = 1;
      if (!sc) return;
      if (yr) sc += pl.y0 <= yr && pl.y1 >= yr - 1 ? 1.5 : Math.abs(yr - pl.y1) < 4 ? .4 : 0;
      out.push({ pl: pl, sc: sc, n: pl.hs.length + pl.ps.length });
    });
    out.sort(function (a, b) { return b.sc - a.sc || b.n - a.n; });
    return out.slice(0, o.max || 8).map(function (x) { return x.pl; });
  }

  // What he mostly did: 'p' a pitcher, 'h' a hitter (a two-way card uses the role the card year shows most)
  function roleOf(pl, year) {
    var H = seasons(pl, 'h'), P = seasons(pl, 'p');
    if (!P.length) return 'h'; if (!H.length) return 'p';
    var near = function (L, f) { var t = 0; L.forEach(function (s) { if (!year || Math.abs(s.y - year) <= 2) t += f(s); }); return t; };
    var ab = near(H, function (s) { return s.ab; }), ipo = near(P, function (s) { return s.ipo; });
    if (!ab && !ipo) { ab = 0; H.forEach(function (s) { ab += s.ab; }); P.forEach(function (s) { ipo += s.ipo; }); }
    return ipo * 1.4 > ab ? 'p' : 'h';
  }
  // The season a card shows: the year before the card's year, or the card's own year for a rookie card
  function cardSeason(pl, role, cardYear) {
    var L = seasons(pl, role); if (!L.length) return null;
    if (cardYear) {
      var want = cardYear - 1, best = null;
      L.forEach(function (s) { if (s.y <= want && (!best || s.y > best.y)) best = s; });
      if (best && want - best.y <= 3) return best;
      var same = L.filter(function (s) { return s.y === cardYear; })[0];
      if (same) return same;
      if (best) return best;
      return L[0];
    }
    var full = L.filter(function (s) { return role === 'p' ? s.ipo >= 300 : s.ab >= 300; });
    var pool = full.length ? full : L;
    return pool.reduce(function (a, s) { return (role === 'p' ? s.ipo : s.ab) > (role === 'p' ? a.ipo : a.ab) ? s : a; }, pool[0]);
  }
  // Positions he could play from the card's season and the two either side of it
  function positionsNear(pl, y) {
    var c = {};
    seasons(pl, 'h').forEach(function (s) { if (s.pos && Math.abs(s.y - y) <= 2) c[s.pos] = (c[s.pos] || 0) + s.g * (s.y === y ? 2 : 1); });
    return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; });
  }

  // ── Ratings (1 to 10) ─────────────────────────────────────────────────────
  // Hitters: Contact (average), Power (home runs a time at bat), Speed (steals and triples), Eye (walks against
  // strikeouts). Pitchers: Stuff (strikeouts, with runs allowed), Control (walks), Stamina (innings a game).
  // Each comes with the rates the at-bat uses, already moved to the timeless league.
  function rateH(s) {
    var L = lgOf(s.y), pa = s.ab + s.bb;
    var avgR = ((s.h + L.avg * 80) / (s.ab + 80)) / L.avg;
    var hrR = ((s.hr + L.hr * 120) / (s.ab + 120)) / L.hr;
    var bbR = ((s.bb + L.bb * 100) / (pa + 100)) / L.bb;
    var soR = ((s.so + L.so * 100) / (pa + 100)) / L.so;
    var sbR = ((s.sb + s.tr * 1.5 + L.sb * 25) / (s.g + 25)) / L.sb;
    return {
      con: Math.round(lerp1(avgR, .80, 1.22)), pow: Math.round(lerp1(Math.log(hrR) / Math.LN2, -2, 1.45)),
      spd: Math.round(lerp1(Math.log(Math.max(.05, sbR)) / Math.LN2, -2.6, 3.1)),
      eye: Math.round(lerp1(.6 * bbR + .4 / soR, .62, 1.55)),
      avg: clamp(NEUTRAL.avg * avgR, .15, .40), hr: clamp(NEUTRAL.hr * hrR, .001, .11), bb: clamp(NEUTRAL.bb * bbR, .03, .22),
      so: clamp(NEUTRAL.so * soR, .05, .38), sp: clamp((Math.log(Math.max(.05, sbR)) / Math.LN2 + 2.6) / 5.7, 0, 1)
    };
  }
  function rateP(s) {
    var L = lgOf(s.y), ipo = s.ipo;
    var eraR = ((s.er + L.era / 27 * 150) / (ipo + 150)) / (L.era / 27);
    var k9R = ((s.so + L.k9 / 27 * 150) / (ipo + 150)) / (L.k9 / 27);
    var bbR = ((s.bb + L.bb9 / 27 * 150) / (ipo + 150)) / (L.bb9 / 27);
    var start = s.gs / Math.max(1, s.g) >= .5, ipg = ipo / 3 / Math.max(1, start ? s.gs : s.g);
    return {
      stf: Math.round(lerp1(.6 * Math.log(k9R) / Math.LN2 - .4 * Math.log(eraR) / Math.LN2, -.75, .75)),
      ctl: Math.round(lerp1(-Math.log(bbR) / Math.LN2, -.8, .8)),
      sta: Math.round(clamp(start ? 2 + (ipg - 4) * 2.3 : 1 + ipg * 1.6, 1, 10)),
      era: clamp(NEUTRAL.era * eraR, 1.4, 9), k9: clamp(NEUTRAL.k9 * k9R, 2, 13), bb9: clamp(NEUTRAL.bb9 * bbR, 1, 7), start: start
    };
  }
  // A card nobody can find (a minor leaguer, a blank back, a name the app doesn't know): a scout's report. The same
  // name always gets the same report.
  function scout(nameStr, role) {
    var r = rng(hash(skey(nameStr) + role));
    function g() { var t = 0; for (var i = 0; i < 3; i++) t += r(); return t / 3; }
    if (role === 'p') {
      var stf = Math.round(2 + g() * 7), ctl = Math.round(2 + g() * 7), sta = Math.round(2 + g() * 7);
      return { stf: stf, ctl: ctl, sta: sta, era: 5.6 - stf * .22 - ctl * .08, k9: 3.6 + stf * .55, bb9: 5.4 - ctl * .38, start: sta >= 5, scout: true };
    }
    var con = Math.round(2 + g() * 7), pow = Math.round(1 + g() * 7), spd = Math.round(1 + g() * 8), eye = Math.round(2 + g() * 6);
    return { con: con, pow: pow, spd: spd, eye: eye, avg: .205 + con * .0095, hr: .004 + pow * .0042, bb: .05 + eye * .0075, so: .25 - con * .011, sp: (spd - 1) / 9, scout: true };
  }
  var KID = { con: 3, pow: 2, spd: 4, eye: 3, avg: .225, hr: .009, bb: .065, so: .2, sp: .35, kid: true };
  var ARM = { stf: 2, ctl: 3, sta: 3, era: 6.4, k9: 4.2, bb9: 4.6, start: false, kid: true };   // a fielder on the mound

  // ── The at-bat ────────────────────────────────────────────────────────────
  var ORDER = ['K', 'GB', 'FB', 'LD', 'PU', 'E', 'BB', 'HBP', 'S', 'D', 'T', 'HR'];
  // H: a hitter's rates, P: a pitcher's; c: {pitch, look, guess (true right, false wrong, null none), tired 0..1,
  //   rally, hot, sure (a guaranteed hit), slug (record breaker: three times the power), err (the next ball in play
  //   is an error), glove (the error rate where the ball goes)}
  function dist(H, P, c) {
    c = c || {};
    var era = P.era * (1 + (c.tired || 0) * .55), q = clamp(era / NEUTRAL.era, .35, 2.6);
    var k9 = P.k9 * (1 - (c.tired || 0) * .3), bb9 = P.bb9 * (1 + (c.tired || 0) * .45);
    var p = c.pitch || 'H', pw = clamp((H.hr - .004) / .06, 0, 1), cn = clamp((H.avg - .2) / .12, 0, 1);
    var stf = clamp((P.stf || 5) / 10, .1, 1), ctl = clamp((P.ctl || 5) / 10, .1, 1), eyeV = clamp((H.eye || 5) / 10, .1, 1);
    // log5 against the timeless league, then the pitch
    var kRate = H.so * (k9 / NEUTRAL.k9) * .95, bbRate = H.bb * Math.pow(bb9 / NEUTRAL.bb9, .9);
    var avg = (function (b, pp, l) { var x = b * pp / l, y = (1 - b) * (1 - pp) / (1 - l); return x / (x + y); })(H.avg, clamp(NEUTRAL.avg * Math.pow(q, .45), .15, .4), NEUTRAL.avg);
    var hrM = Math.pow(q, .6);
    if (p === 'H') { kRate *= .82 + .42 * stf; hrM *= .8 + .55 * pw; bbRate *= .9; }
    else if (p === 'B') { kRate *= .9 + .3 * stf; avg *= 1.06 - .12 * stf + .06 * cn; hrM *= .92; }
    else { bbRate *= 1.35 - .5 * ctl + .3 * eyeV; avg *= 1.02; hrM *= .86 + .2 * (1 - ctl); kRate *= .85; }
    if (c.guess === true) { avg *= 1.2; hrM *= 1.4; kRate *= .72; }
    else if (c.guess === false) { avg *= .9; hrM *= .82; kRate *= 1.16; }
    if (c.rally) avg += .035;
    if (c.hot) { avg += .03; hrM *= 1.8; }
    if (c.slug) hrM *= 3;
    var bb = clamp(bbRate, .02, .3), hbp = .009, ab = 1 - bb - hbp;
    var h = clamp(avg, .1, .55) * ab;
    var hrShare = Math.min(.6, (H.hr / Math.max(.12, H.avg)) * hrM);
    var hr = h * hrShare, t3 = h * (.008 + .035 * (H.sp || 0)), d2 = h * (.18 + .07 * pw), s1 = Math.max(0, h - hr - t3 - d2);
    var e = c.glove || .014;
    var k = Math.min(clamp(kRate, .03, .45), ab - h - e - .08);
    var outs = Math.max(.05, ab - h - k - e);
    var fb = .3 + .12 * pw, ld = .13, pu = .08, gb = 1 - fb - ld - pu;
    var d = { K: k, GB: outs * gb, FB: outs * fb, LD: outs * ld, PU: outs * pu, E: e, BB: bb, HBP: hbp, S: s1, D: d2, T: t3, HR: hr };
    if (c.sure) { var hs = d.S + d.D + d.T + d.HR; ['K', 'GB', 'FB', 'LD', 'PU', 'E', 'BB', 'HBP'].forEach(function (x) { d[x] = 0; }); if (!hs) d.S = 1; }
    if (c.err) { var inPlay = d.GB + d.FB + d.LD + d.PU; d.E += inPlay; d.GB = d.FB = d.LD = d.PU = 0; }
    return d;
  }
  function pick(d, u) {
    var tot = 0, k; for (k in d) tot += d[k];
    var x = u * tot, acc = 0;
    for (var i = 0; i < ORDER.length; i++) { acc += d[ORDER[i]]; if (x < acc) return ORDER[i]; }
    return 'HR';
  }
  function pitchCount(o, r) {
    var base = { K: 4.8, BB: 5.7, HBP: 3.2 }[o];
    return Math.max(1, Math.round((base == null ? 3.4 : base) + (r() - .5) * 3));
  }
  // Move runners for an outcome. st = {bases:[id|null x3], outs, batter}; sp(id) -> speed 0..1.
  // Returns {bases, outs, scored:[ids], rbi, tag} and never changes st.
  function advance(st, o, r, sp) {
    var b = st.bases.slice(), outs = st.outs, scored = [], bat = st.batter, tag = '', rbi = true;
    function score(id) { if (id) scored.push(id); }
    function force() { if (b[0]) { if (b[1]) { if (b[2]) score(b[2]); b[2] = b[1]; } b[1] = b[0]; } b[0] = bat; }
    var two = outs === 2;
    switch (o) {
      case 'BB': case 'HBP': force(); break;
      case 'E': rbi = false; score(b[2]); b[2] = b[1]; b[1] = b[0]; b[0] = bat; break;
      case 'S':
        score(b[2]); b[2] = null;
        if (b[1]) { if (r() < (two ? .88 : .64) + .2 * sp(b[1])) score(b[1]); else b[2] = b[1]; b[1] = null; }
        if (b[0]) { if (!b[2] && r() < (two ? .42 : .28) + .22 * sp(b[0])) b[2] = b[0]; else b[1] = b[0]; }
        b[0] = bat; break;
      case 'D':
        score(b[2]); score(b[1]); b[2] = b[1] = null;
        if (b[0]) { if (r() < (two ? .65 : .42) + .3 * sp(b[0])) score(b[0]); else b[2] = b[0]; }
        b[0] = null; b[1] = bat; break;
      case 'T': score(b[2]); score(b[1]); score(b[0]); b = [null, null, bat]; break;
      case 'HR': score(b[2]); score(b[1]); score(b[0]); score(bat); b = [null, null, null]; tag = ['solo', 'two-run', 'three-run', 'slam'][scored.length - 1]; break;
      case 'K': outs++; break;
      case 'GB':
        if (two) { outs++; break; }
        if (b[0] && r() < .38 - .22 * sp(bat)) {
          outs += 2; tag = 'dp'; rbi = false; b[0] = null;
          if (outs < 3) { score(b[2]); b[2] = b[1]; b[1] = null; } else b = [null, null, null];
          break;
        }
        if (b[0] && b[1] && b[2]) { if (r() < .3) { outs++; tag = 'home'; b[2] = b[1]; b[1] = b[0]; b[0] = bat; break; } }
        else if (b[0] && r() < .45) {
          outs++; tag = 'fc';
          if (b[2] && !b[1] && r() < .5) { score(b[2]); b[2] = null; }
          if (b[1]) { b[2] = b[2] || b[1]; b[1] = null; }
          b[0] = bat; break;
        }
        outs++;
        if (b[2] && (b[1] && b[0] || r() < .6)) { score(b[2]); b[2] = null; }
        if (b[1] && !b[2]) { b[2] = b[1]; b[1] = null; }
        if (b[0] && !b[1]) { b[1] = b[0]; b[0] = null; }
        break;
      case 'FB':
        outs++;
        if (outs < 3) {
          if (b[2] && r() < .72 + .2 * sp(b[2])) { score(b[2]); b[2] = null; tag = 'sf'; }
          if (b[1] && !b[2] && r() < .45) { b[2] = b[1]; b[1] = null; }
        }
        break;
      default: outs++;   // LD, PU
    }
    if (outs >= 3) { outs = 3; if (o === 'GB' || o === 'K' || o === 'PU' || o === 'LD' || o === 'FB') scored = []; }
    return { bases: b, outs: outs, scored: scored, rbi: rbi ? scored.length : 0, tag: tag };
  }

  // ── Fielding ─────────────────────────────────────────────────────────────
  // Where a ball in play goes, by kind, and what a glove out of position costs. A card playing his printed position
  // (or the one he played most around the card's year) has a sure glove; a near position (an outfielder in another
  // outfield spot, a middle infielder across the bag, a corner infielder at the other corner) makes a few more errors;
  // anything else makes many more.
  var FIELD = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  var WHERE = { GB: { '1B': 2, '2B': 3, SS: 3.2, '3B': 2.6, P: .8 }, FB: { LF: 3, CF: 3.4, RF: 3, '2B': .3, SS: .3 }, LD: { LF: 2, CF: 2, RF: 2, SS: 1.4, '2B': 1.4, '3B': 1.2, '1B': 1 }, PU: { C: 2, '1B': 1.5, '3B': 1.5, '2B': 1.2, SS: 1.2 } };
  var NEAR = { LF: ['CF', 'RF'], CF: ['LF', 'RF'], RF: ['LF', 'CF'], '2B': ['SS'], SS: ['2B', '3B'], '3B': ['1B', 'SS'], '1B': ['3B', 'DH'], C: [], DH: [] };
  function fit(pos, at) {   // pos: the positions he plays, most first; at: where he stands
    if (!pos || !pos.length) return 'far';
    if (pos.indexOf(at) >= 0 && (pos[0] === at || pos.indexOf(at) < 3)) return 'home';
    if (pos.some(function (p) { return (NEAR[p] || []).indexOf(at) >= 0 || (NEAR[at] || []).indexOf(p) >= 0; })) return 'near';
    if (pos[0] === 'P' && at === 'P') return 'home';
    return 'far';
  }
  var ERR = { home: .012, near: .04, far: .11 };
  function where(o, r) {
    var w = WHERE[o]; if (!w) return null;
    var tot = 0, k; for (k in w) tot += w[k];
    var x = r() * tot; for (k in w) { x -= w[k]; if (x <= 0) return k; } return k;
  }

  // ── The computer's side of the duel ───────────────────────────────────────
  // Easy picks at random. Normal leans on the matchup: a pitcher throws what his ratings and the hitter's weakness
  // favor; a hitter looks for what this pitcher likes. Hard also reads what the other side has done this game and
  // stays hard to read itself.
  function pitchWeights(P, H) {
    var stf = (P.stf || 5) / 10, ctl = (P.ctl || 5) / 10, pow = (H.pow || 5) / 10, con = (H.con || 5) / 10, eye = (H.eye || 5) / 10;
    return { H: .6 + 1.2 * stf - .7 * pow, B: .6 + .7 * stf + .3 * ctl - .5 * con, J: .5 + 1.1 * ctl - .6 * eye };
  }
  function cpuPitch(P, H, level, seen, r) {
    if (level === 'easy') return PITCHES[Math.floor(r() * 3)];
    var w = pitchWeights(P, H);
    if (level === 'hard' && seen && seen.n >= 4) PITCHES.forEach(function (k) { w[k] *= 1.35 - (seen[k] || 0) / seen.n; });   // away from what the batter keeps looking for
    return weighted(w, r, level === 'hard' ? 1.4 : 1);
  }
  function cpuLook(P, H, level, seen, r) {
    if (level === 'easy') return PITCHES[Math.floor(r() * 3)];
    var w = pitchWeights(P, H);
    if (level === 'hard' && seen && seen.n >= 3) PITCHES.forEach(function (k) { w[k] *= .65 + (seen[k] || 0) / seen.n * 1.2; });   // toward what this pitcher has been throwing
    return weighted(w, r, level === 'hard' ? 1.6 : 1.1);
  }
  function weighted(w, r, sharp) {
    var t = 0, k, v = {};
    for (k in w) { v[k] = Math.pow(Math.max(.05, w[k]), sharp); t += v[k]; }
    var x = r() * t; for (k in v) { x -= v[k]; if (x <= 0) return k; } return 'H';
  }

  var E = { NEUTRAL: NEUTRAL, PITCHES: PITCHES, PNAME: PNAME, ORDER: ORDER, FIELD: FIELD, ERR: ERR, KID: KID, ARM: ARM,
    clamp: clamp, rng: rng, hash: hash, skey: skey, load: load, db: function () { return DB; }, seasons: seasons, honors: honors,
    teamName: teamName, nick: nick, lgOf: lgOf, byId: byId, name: name, find: find, roleOf: roleOf, cardSeason: cardSeason,
    positionsNear: positionsNear, rateH: rateH, rateP: rateP, scout: scout, dist: dist, pick: pick, pitchCount: pitchCount,
    advance: advance, fit: fit, where: where, cpuPitch: cpuPitch, cpuLook: cpuLook, pitchWeights: pitchWeights };
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.WaxEngine = E;
})(this);
