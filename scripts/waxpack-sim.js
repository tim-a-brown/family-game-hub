#!/usr/bin/env node
// Wax Pack's at-bat measured: thousands of 9-inning games between teams of real cards from many decades, played by the
// engine's own at-bat (games/waxpack/engine.js atBat), so the league comes out near real baseball. Then the checks:
// a .330 hitter against a .220 one, an ace fresh and tired, and the order of a team's three pitchers.
//   node scripts/waxpack-sim.js [games] [seed]      TUNE='{"margin":5,"dp":2,...}' tries other numbers (engine tune(),
//   RULE, VAL, RUN and ranges); ENGINE=<path> runs another copy of engine.js (an older one, to compare). The runners
//   move by the printed rule (E.advance) with each card's own speedster card. The milestone powers play too, with the
//   computer's own choices (E.cpuSteal, E.cpuWalk, E.cpuReroll; LEVEL=easy|normal|hard, normal by default).
//   SHOE=1 sets every card's values by the Shoebox rules (E.SHOE) instead of the league labels; NOPOW=1 plays
//   without the powers, to compare.
'use strict';
var E = require(process.env.ENGINE || '../games/waxpack/engine.js'), fs = require('fs'), path = require('path');
E.load(JSON.parse(fs.readFileSync(path.join(__dirname, '../games/waxpack/mlb.json'), 'utf8')));
var N = +process.argv[2] || 4000, R = E.rng(+process.argv[3] || 11);
if (process.env.TUNE) E.tune(JSON.parse(process.env.TUNE));

// The cards: every regular's season from 1950 on, every starter's and every reliever's, as a card of the next year
var HIT = [], STA = [], REL = [];
E.db().list.forEach(function (pl) {
  E.seasons(pl, 'h').forEach(function (s) { if (s.y >= 1950 && s.ab >= 300) HIT.push({ pl: pl, s: s }); });
  E.seasons(pl, 'p').forEach(function (s) {
    if (s.y < 1950) return;
    if (s.gs >= 15 && s.ipo >= 300) STA.push({ pl: pl, s: s });
    else if (s.g >= 35 && s.gs <= 3 && s.ipo >= 120) REL.push({ pl: pl, s: s });
  });
});
function any(a) { return a[Math.floor(R() * a.length)]; }
var SHOE = !!process.env.SHOE, NOPOW = !!process.env.NOPOW, LEVEL = process.env.LEVEL || 'normal';
function card(x, role) { var c = { kind: 'player', role: role, line: x.s, vm: SHOE ? 'shoe' : undefined, r: role === 'p' ? E.rateP(x.s) : E.rateH(x.s), name: E.name(x.pl), pos: role === 'p' ? ['P'] : E.positionsNear(x.pl, x.s.y) }; E.table(c); if (NOPOW) c.r.pw = ''; return c; }
var SPOT = ['C', 'SS', 'CF', '2B', '3B', '1B', 'RF', 'LF', 'DH'];
function fitScore(c, at) { if (at === 'DH') return 1.2; var f = E.fit(c.pos, at); return f === 'home' ? 3 : f === 'near' ? 1.5 : 0; }
function team(o) {
  o = o || {};
  var nine = []; for (var i = 0; i < 9; i++) nine.push(card(any(HIT), 'h'));
  var at = {}, used = {};
  SPOT.forEach(function (p) { var b = null; nine.forEach(function (c, i) { if (used[i]) return; var s = fitScore(c, p); if (!b || s > b.s) b = { i: i, s: s }; }); at[b.i] = p; used[b.i] = 1; });
  var order = nine.map(function (c, i) { return i; }).sort(function (a, b) { return nine[b].r.bat - nine[a].r.bat; });
  var arms = o.arms || [card(any(STA), 'p'), card(any(STA), 'p'), card(any(R() < .6 ? REL : STA), 'p')];
  if (!o.keep) { var ord = E.staffOrder(arms.map(function (a) { return a.r; }), 9); arms = ord.map(function (i) { return arms[i]; }); }
  return { nine: nine, at: at, order: order, arms: arms };
}
// a runner's id in the sim is his team's letter and his place in the nine; the speedster card is the one speed edge
function fastOf(tm, id) { var c = tm[id.charAt(0) === 'b' ? 1 : 0].nine[+id.slice(1)]; return c.r.card === 'speed'; }
function blank() { return { pa: 0, ab: 0, h: 0, d: 0, t: 0, hr: 0, bb: 0, k: 0, e: 0, r: 0, g: 0, dp: 0, sf: 0, hi: 0, guess: 0, bwin: 0, byInn: [], sb: 0, cs: 0, ibb: 0, re: 0, reSaved: 0, slugHR: 0, pmod: 0 }; }
// a card's power by a runner's id (the batting team's letter and his place in the nine)
function cardOf(tm, id) { return tm[id.charAt(0) === 'b' ? 1 : 0].nine[+id.slice(1)]; }
var T = blank();
function game(A, B, st) {
  var tm = [A, B], runs = [0, 0], bat = [0, 0], inn = 1, kartUsed = {}, seen = [{ H: 0, B: 0, J: 0, C: 0, n: 0 }, { H: 0, B: 0, J: 0, C: 0, n: 0 }], looks = [{ H: 0, B: 0, J: 0, C: 0, n: 0 }, { H: 0, B: 0, J: 0, C: 0, n: 0 }];
  for (;;) {
    for (var half = 0; half < 2; half++) {
      if (half === 1 && inn >= 9 && runs[1] > runs[0]) return runs;
      var b = half, f = 1 - b, F = tm[f], Bt = tm[b], so = E.stintOf(inn, 9), P = F.arms[so.i];
      var outs = 0, bases = [null, null, null], before = runs[b]; st.hi++;
      while (outs < 3) {
        var hi = Bt.order[bat[b] % 9], H = Bt.nine[hi], lead = runs[f] - runs[b], cst = { bases: bases, outs: outs, inn: inn, inns: 9, level: LEVEL };
        // a base stealer on first or second, before the pitch
        var opt = E.stealOption(bases, function (id) { return cardOf(tm, id).r.pw === 'steal'; });
        if (opt && E.cpuSteal(Object.assign({}, cst, { lead: -lead }), opt, R)) {
          var sl = E.steal({ bases: bases, outs: outs }, opt.i, R);
          bases = sl.bases; outs = sl.outs; if (sl.ok) st.sb++; else st.cs++;
          if (outs >= 3) break;
          cst.bases = bases; cst.outs = outs;
        }
        // a feared slugger may be walked on purpose
        if (H.r.pw === 'slug') {
          var nx = Bt.nine[Bt.order[(bat[b] + 1) % 9]];
          if (E.cpuWalk(Object.assign({}, cst, { lead: lead }), nx.r.pw === 'slug')) {
            var rw = E.advance({ bases: bases, outs: outs, batter: (b ? 'b' : 'a') + hi }, 'BB', R);
            bat[b]++; st.pa++; st.bb++; st.ibb++; bases = rw.bases; runs[b] += rw.scored.length;
            if (half === 1 && inn >= 9 && runs[1] > runs[0]) break;
            continue;
          }
        }
        bat[b]++;
        var pitch = E.cpuPitch(P.r, H.r, 'normal', looks[b], R), look = E.cpuLook(P.r, H.r, process.env.LOOK || 'easy', seen[f], R);   // a person guessing: one of his pitch cards at random
        seen[f][pitch]++; seen[f].n++; looks[b][look]++; looks[b].n++;
        var right = pitch === look; if (right) st.guess++;
        var pm = E.powerMods(H.r, P.r, { bases: bases, inn: inn, inns: 9, lead: lead });
        st.pmod += pm.b.length + pm.p.length;
        var abc = { bat: H.r.bat, arm: P.r.arm, fat: E.tiredFor(so.k, P.r), guess: right, bcard: H.r.card, pcard: P.r.card, plusB: pm.b, plusP: pm.p, slug: H.r.pw === 'slug' };
        var x = E.atBat(abc, R);
        // the strikeout artist, once a stint
        if (P.r.pw === 'kart' && x.win && !kartUsed[f + ':' + so.i] && E.cpuReroll(x, { bases: bases, level: LEVEL })) { kartUsed[f + ':' + so.i] = 1; x = E.reroll(abc, x, R); st.re++; if (!x.win) st.reSaved++; }
        if (x.why === 'slug') st.slugHR++;
        var o = x.o;
        if (x.win) st.bwin++;
        var pos = null;
        if (o === 'G' || o === 'F') {
          var id = null, fit; pos = E.whereOf(o, E.d6(R)); for (var k in F.at) if (F.at[k] === pos) id = k;
          fit = id != null ? E.fit(F.nine[id].pos, pos) : 'far';
          o = E.BOOT[fit] && E.d20(R) <= E.BOOT[fit] ? 'E' : o === 'G' ? 'GB' : 'FB';
        }
        var res = E.advance({ bases: bases, outs: outs, batter: (b ? 'b' : 'a') + hi, where: pos }, o, R, function (id) { return E.RUN ? fastOf(tm, id) : .4; });
        if (res.tag === 'dp') st.dp++; if (res.tag === 'sf') st.sf++;
        st.pa++; if (o !== 'BB' && res.tag !== 'sf') st.ab++;
        if (/^(S|D|T|HR)$/.test(o)) st.h++; if (o === 'D') st.d++; if (o === 'T') st.t++; if (o === 'HR') st.hr++; if (o === 'BB') st.bb++; if (o === 'K') st.k++; if (o === 'E') st.e++;
        bases = res.bases; outs = res.outs; runs[b] += res.scored.length;
        if (half === 1 && inn >= 9 && runs[1] > runs[0]) break;
      }
      st.byInn[inn] = (st.byInn[inn] || 0) + runs[b] - before;
    }
    if (inn >= 9 && runs[0] !== runs[1]) return runs;
    inn++; if (inn > 15) return runs;
  }
}
var out = [];
function line(s) { out.push(s); console.log(s); }
for (var g = 0; g < N; g++) { var r = game(team(), team(), T); T.r += r[0] + r[1]; T.g++; }
var avg = T.h / T.ab, obp = (T.h + T.bb) / T.pa, slg = (T.h + T.d + 2 * T.t + 3 * T.hr) / T.ab;
line((SHOE ? 'Shoebox rules. ' : '') + 'League, ' + N + ' nine-inning games of random cards from 1951 to ' + E.db().upto + ' (the batter must win by ' + E.RULE.margin + '):');
line('  AVG ' + avg.toFixed(3) + '  OBP ' + obp.toFixed(3) + '  SLG ' + slg.toFixed(3) + '  K ' + (100 * T.k / T.pa).toFixed(1) + '%  BB ' + (100 * T.bb / T.pa).toFixed(1) + '%  HR ' + (100 * T.hr / T.pa).toFixed(1) + '%  2B ' + (100 * T.d / T.pa).toFixed(1) + '%  3B ' + (100 * T.t / T.pa).toFixed(2) + '%  E ' + (100 * T.e / T.pa).toFixed(1) + '%');
line('  Extra-base hits ' + (100 * (T.d + T.t + T.hr) / T.h).toFixed(0) + '% of hits (' + (100 * (T.d + T.t + T.hr) / T.pa).toFixed(1) + '% of plate appearances); runs a team a game ' + (T.r / T.g / 2).toFixed(2) + ', a team per 9 innings ' + (T.r / T.hi * 9).toFixed(2) + '; the batter won ' + (100 * T.bwin / T.pa).toFixed(1) + '% of the rolls; batters named the pitch ' + (100 * T.guess / T.pa).toFixed(1) + '% of the time');
line('  A team a game: double plays grounded into ' + (T.dp / T.g / 2).toFixed(2) + ' (real about 0.8), sacrifice flies ' + (T.sf / T.g / 2).toFixed(2) + ' (real about 0.3); the base-running die ' + (E.RUN ? JSON.stringify(E.RUN) : '(the old chances)'));
line('  A team a game: stolen bases ' + (T.sb / T.g / 2).toFixed(2) + ', caught stealing ' + (T.cs / T.g / 2).toFixed(2) + ' (' + (T.sb + T.cs ? (100 * T.sb / (T.sb + T.cs)).toFixed(0) : '0') + '% safe, on a d20 of ' + E.POW.steal.safe + ' or more), walked on purpose ' + (T.ibb / T.g / 2).toFixed(2) + ', strikeout artists\' second rolls ' + (T.re / T.g / 2).toFixed(2) + ' (' + T.reSaved + ' turned the at-bat), the slugger\'s 19 or 20 home runs ' + (T.slugHR / T.g / 2).toFixed(3) + ', at-bats with a power\'s +1 or +2 ' + (T.pmod / T.g / 2).toFixed(2));
line('  Powers among the cards: ' + (function () { var h = {}, n = 0; HIT.forEach(function (x) { var c = card(x, 'h'); n++; if (c.r.pw) h[c.r.pw] = (h[c.r.pw] || 0) + 1; }); var hp = {}, m = 0; STA.concat(REL).forEach(function (x) { var c = card(x, 'p'); m++; if (c.r.pw) hp[c.r.pw] = (hp[c.r.pw] || 0) + 1; }); return Object.keys(h).map(function (k) { return E.PNAME2[k] + ' ' + (100 * h[k] / n).toFixed(1) + '%'; }).concat(Object.keys(hp).map(function (k) { return E.PNAME2[k] + ' ' + (100 * hp[k] / m).toFixed(1) + '%'; })).join(', '); })() + (SHOE ? ' (Shoebox rules)' : NOPOW ? ' (no powers)' : ''));
line('  Runs by inning (both teams, a game): ' + T.byInn.slice(1, 10).map(function (v) { return (v / T.g).toFixed(2); }).join(' '));

// What a matchup gives, worked out exactly: every pair of d20s, at a given chance of naming the pitch
function mu(h, p, fat, pg) {
  var o = { K: 0, G: 0, F: 0, BB: 0, S: 0, D: 0, T: 0, HR: 0 };
  [[true, pg], [false, 1 - pg]].forEach(function (gw) {
    for (var a = 1; a <= 20; a++) for (var b = 1; b <= 20; b++) {
      var x = E.atBat({ bd: a, pd: b, bat: h.bat, arm: p.arm, fat: fat || 0, guess: gw[0], bcard: h.card, pcard: p.card });
      o[x.o] += gw[1] / 400;
    }
  });
  var ab = 1 - o.BB, hits = o.S + o.D + o.T + o.HR;
  o.avg = hits / ab; o.obp = hits + o.BB; o.slg = (o.S + 2 * o.D + 3 * o.T + 4 * o.HR) / ab; o.woba = .69 * o.BB + .89 * o.S + 1.27 * o.D + 1.62 * o.T + 2.1 * o.HR;
  return o;
}
function say(o) { return 'AVG ' + o.avg.toFixed(3) + ' OBP ' + o.obp.toFixed(3) + ' SLG ' + o.slg.toFixed(3) + ' K ' + (o.K * 100).toFixed(0) + '% BB ' + (o.BB * 100).toFixed(0) + '% HR ' + (o.HR * 100).toFixed(1) + '%'; }
function near(av, y) { var b = null; HIT.forEach(function (x) { if (x.s.y !== y || x.s.ab < 450) return; var d = Math.abs(x.s.h / x.s.ab - av); if (!b || d < b.d) b = { d: d, x: x }; }); return b.x; }
function pit(name, y) { var pl = E.find(name, { year: y + 1, max: 1 })[0]; var s = E.seasons(pl, 'p').filter(function (x) { return x.y === y; })[0]; return card({ pl: pl, s: s }, 'p'); }
function desc(c) { var r = c.r; return c.name + ' ' + c.line.y + ' (' + (c.role === 'p' ? (c.line.er * 27 / c.line.ipo).toFixed(2) + ' ERA): ' : (c.line.h / c.line.ab).toFixed(3).slice(1) + '): ') + (c.role === 'p' ? 'Arm ' : 'Bat ') + (r.bat != null ? r.bat : r.arm) + ', ' + E.CNAME[r.card] + (c.role === 'p' ? ', ' + r.np + ' pitch cards' : ''); }
var PG = T.guess / T.pa, AVP = { arm: 0, card: 'plain' }, AVH = { bat: 0, card: 'contact' };
line('');
line('Matchups, exactly (a batter names the pitch ' + (PG * 100).toFixed(0) + '% of the time, as in the league):');
var hi = card(near(.330, 1987), 'h'), lo = card(near(.220, 1987), 'h');
line('  ' + desc(hi) + ', against an Arm 0 pitcher on the plain card: ' + say(mu(hi.r, AVP, 0, PG)));
line('  ' + desc(lo) + ', against the same: ' + say(mu(lo.r, AVP, 0, PG)));
var ace = pit('Dwight Gooden', 1985), mid = pit('Mike Morgan', 1987), rl = pit('Jeff Reardon', 1987);
line('  ' + desc(ace) + '; ' + desc(mid) + '; ' + desc(rl));
[0, 1, 2].forEach(function (k) { line('    an average hitter (Bat 0, contact card) against Gooden in inning ' + (k + 1) + ' of his stint: ' + say(mu(AVH, ace.r, E.tired(k), PG))); });
line('    an average hitter against Morgan fresh: ' + say(mu(AVH, mid.r, 0, PG)));
line('  Each modifier for an average hitter against an Arm 0 plain card: ' + [-2, -1, 0, 1, 2].map(function (m) { var o = mu({ bat: m, card: 'contact' }, AVP, 0, PG); return (m > 0 ? '+' : '') + m + ' hits ' + o.avg.toFixed(3) + ', on base ' + o.obp.toFixed(3); }).join('; '));
line('  Each card, for a Bat 0 hitter against an Arm 0 plain card (AVG/OBP/SLG): ' + ['slugger', 'power', 'speed', 'patient', 'contact'].map(function (k) { var o = mu({ bat: 0, card: k }, AVP, 0, PG); return E.CNAME[k] + ' ' + o.avg.toFixed(3) + '/' + o.obp.toFixed(3) + '/' + o.slg.toFixed(3); }).join('; '));
line('  Each pitcher card, for an Arm 0 pitcher against a Bat 0 contact hitter: ' + ['strikeout', 'groundball', 'wild', 'plain'].map(function (k) { var o = mu(AVH, { arm: 0, card: k }, 0, PG); return E.CNAME[k] + ' K ' + (o.K * 100).toFixed(0) + '% BB ' + (o.BB * 100).toFixed(0) + '%'; }).join('; '));
var hist = function (list, role) { var h = {}; list.forEach(function (x) { var c = card(x, role), v = role === 'p' ? c.r.arm : c.r.bat; h[v] = (h[v] || 0) + 1; }); return [-2, -1, 0, 1, 2].map(function (v) { return (v > 0 ? '+' : '') + v + ': ' + (100 * (h[v] || 0) / list.length).toFixed(0) + '%'; }).join(', '); };
var kinds = function (list, role) { var h = {}; list.forEach(function (x) { var c = card(x, role); h[c.r.card] = (h[c.r.card] || 0) + 1; if (role === 'p') h['np' + c.r.np] = (h['np' + c.r.np] || 0) + 1; }); return Object.keys(h).map(function (k) { return k + ' ' + (100 * h[k] / list.length).toFixed(0) + '%'; }).join(', '); };
line('  Bat of every regular\'s season: ' + hist(HIT, 'h') + '; cards: ' + kinds(HIT, 'h'));
line('  Arm of every pitcher\'s season: ' + hist(STA.concat(REL), 'p') + '; cards: ' + kinds(STA.concat(REL), 'p'));

line('');
line('The order of three pitchers (Gooden, Morgan, Reardon), runs allowed and games won over ' + Math.round(N / 2) + ' games each:');
[[ace, mid, rl], [mid, ace, rl], [mid, rl, ace], [rl, mid, ace], [ace, rl, mid], [rl, ace, mid]].forEach(function (ord) {
  var st = blank(), ra = 0, w = 0;
  for (var g = 0; g < N / 2; g++) { var rr = game(team({ arms: ord, keep: 1 }), team(), st); ra += rr[1]; if (rr[0] > rr[1]) w++; }
  line('  ' + ord.map(function (x) { return x.name.split(' ').pop(); }).join(', ') + ': ' + (ra / (N / 2)).toFixed(2) + ' runs, won ' + (100 * w / (N / 2)).toFixed(1) + '%');
});
line('  Best fit chooses ' + E.staffOrder([ace.r, mid.r, rl.r], 9).map(function (i) { return [ace, mid, rl][i].name.split(' ').pop(); }).join(', ') + ' for 9 innings');
if (process.env.OUT) fs.writeFileSync(process.env.OUT, out.join('\n') + '\n');
