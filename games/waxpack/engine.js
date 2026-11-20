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
// The at-bat (atBat): two d20s and a margin to beat, then the winner's own die read on his card; see "The at-bat" below.
(function (root) {
  var NEUTRAL = { avg: .260, hr: .025, bb: .085, so: .16, era: 4.10, k9: 6.2, bb9: 3.3, sb: .059 };
  var PITCHES = ['H', 'B', 'J'];
  var PNAME = { H: 'Heat', B: 'Breaking ball', J: 'Junk', C: 'Changeup' };
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
      var a0 = pl.hs ? +pl.hs.slice(0, 4) : 9999, b0 = pl.ps ? +pl.ps.slice(0, 4) : 9999; pl.y0 = Math.min(a0, b0);
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
      era: clamp(NEUTRAL.era * eraR, 1.4, 9), k9: clamp(NEUTRAL.k9 * k9R, 2, 13), bb9: clamp(NEUTRAL.bb9 * bbR, 1, 7), start: start, ipg: Math.round(ipg * 10) / 10
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
  var ARM = { stf: 2, ctl: 3, sta: 3, era: 6.4, k9: 4.2, bb9: 4.6, start: false, kid: true };   // a sandlot kid on the mound

  // ── The at-bat: one throw of two d20s, a margin to beat, and the winner's own die read on his card ─────────
  // Everything here plays at a table with two d20s, the pitch cards and a label in each card's sleeve (the menu's Print
  // the table cards). The pitcher lays one of his pitch cards face down and the batter names one; both flip. Both roll a
  // d20 and add their modifiers; the batter wins the at-bat when his total beats the pitcher's by the margin or more,
  // and otherwise the pitcher wins it. The winner reads his own die (the number rolled, not the total) on his own card:
  // a batter on his Guessed right row (a single on a narrow win, then doubles, triples and home runs) when he named the pitch, or his Guessed wrong row
  // (singles, doubles, and a patient hitter's walks) when he didn't; a pitcher on his row of ball four, ground outs, fly
  // outs and strikeouts. So fewer pitch cards make extra-base hits likelier, and more of them hold power down.
  // A pitcher is 1 lower in the third inning of his stint, and another 1 lower for each inning after.
  // A player's values are worked out once from the season on his card, against his own league that year (the rates
  // rateH and rateP have already moved to the timeless league), so a 1968 pitcher and a 2000 hitter are each judged
  // against their own season; the values are few and whole, so they print on a small card for a real table.
  // scripts/waxpack-sim.js plays thousands of games with real cards to set the margin and the ranges.
  var RULE = { margin: 7, tire: 3 };   // tire: the inning of a stint (from 1) that costs 1
  // Each row is ranges of the die, 1 to 20: [first, last, what happened]. The winner's die is high more often than
  // low (he won the throw), so the best outcome of each row is at its top. A batter who named the pitch but only just
  // won the throw (a die of 11 or less) squared it up for a single: the doubles in his row start at 12, which keeps
  // doubles near the real 4.6 in 100 plate appearances.
  var RANGES = {
    slugger: { wrong: [[1, 10, 'BB'], [11, 20, 'S']], right: [[1, 11, 'S'], [12, 12, 'D'], [13, 20, 'HR']] },
    power: { wrong: [[1, 10, 'BB'], [11, 20, 'S']], right: [[1, 11, 'S'], [12, 15, 'D'], [16, 20, 'HR']] },
    speed: { wrong: [[1, 10, 'BB'], [11, 18, 'S'], [19, 20, 'D']], right: [[1, 11, 'S'], [12, 15, 'D'], [16, 18, 'T'], [19, 20, 'HR']] },
    patient: { wrong: [[1, 12, 'BB'], [13, 20, 'S']], right: [[1, 11, 'S'], [12, 18, 'D'], [19, 20, 'HR']] },
    contact: { wrong: [[1, 10, 'BB'], [11, 20, 'S']], right: [[1, 11, 'S'], [12, 19, 'D'], [20, 20, 'HR']] },
    strikeout: [[1, 3, 'BB'], [4, 8, 'G'], [9, 13, 'F'], [14, 20, 'K']],
    groundball: [[1, 3, 'BB'], [4, 12, 'G'], [13, 16, 'F'], [17, 20, 'K']],
    wild: [[1, 6, 'BB'], [7, 11, 'G'], [12, 16, 'F'], [17, 20, 'K']],
    plain: [[1, 3, 'BB'], [4, 9, 'G'], [10, 16, 'F'], [17, 20, 'K']]
  };
  var CNAME = { slugger: 'Slugger', power: 'Power hitter', speed: 'Speedster', patient: 'Patient hitter', contact: 'Contact hitter', strikeout: 'Strikeout pitcher', groundball: 'Ground-ball pitcher', wild: 'Wild pitcher', plain: 'Plain card' };
  var BNAME = { K: 'Strikeout', G: 'Ground out', F: 'Fly out', BB: 'Walk', S: 'Single', D: 'Double', T: 'Triple', HR: 'Home run', E: 'Error' };
    var RANK = { K: 0, G: 1, F: 1, O: 1, E: 1, BB: 2, S: 3, D: 4, T: 5, HR: 6 };

  // The values. Modifier: −2 to +2 against his own league that year: the top tenth +2, clearly above +1, about
  // average 0, clearly below −1, the bottom tenth −2 (the cuts are the tenths and the thirds of every regular's and
  // every pitcher's season since 1950); a batter by getting on base and hitting safely (on-base average plus batting
  // average), a pitcher by ERA. Pitch cards: 2 to 4 from his strikeouts a game against his league. Card: from his
  // real numbers. A season under 200 at-bats or 50 innings is too short to read: 0 and the plain card (a hitter's
  // plain card is the contact card).
  var VAL = { bat: [.538, .574, .627, .669], arm: [-.241, -.064, .194, .392], k4: 6.6, k3: 5.0, kCard: 7.4, wild: 3.9, slug: .046, pow: .033, spd: .8, eye: .8, shortAB: 200, shortIP: 150 };
  function step(x, cuts) { var v = -2; for (var i = 0; i < cuts.length; i++) if (x >= cuts[i]) v++; return v; }
  function valuesH(r, s) {
    if (r.kid) return { mod: -2, card: 'contact', kid: 1 };
    if (!s || s.ab < VAL.shortAB) return { mod: 0, card: 'contact', short: 1 };
    var card = r.hr >= VAL.slug ? 'slugger' : r.hr >= VAL.pow ? 'power' : r.sp >= VAL.spd ? 'speed' : r.bb >= .09 && r.bb >= r.so * VAL.eye ? 'patient' : 'contact';
    return { mod: step(r.bb + (1 - r.bb - .008) * r.avg + r.avg, VAL.bat), card: card };
  }
  function valuesP(r, s) {
    if (r.kid) return { mod: -2, card: 'plain', np: 2, kid: 1 };
    var np = r.k9 >= VAL.k4 ? 4 : r.k9 >= VAL.k3 ? 3 : 2;
    if (!s || s.ipo < VAL.shortIP) return { mod: 0, card: 'plain', np: np, short: 1 };
    var card = r.k9 >= VAL.kCard ? 'strikeout' : r.bb9 >= VAL.wild ? 'wild' : 'groundball';
    return { mod: step(-Math.log(r.era / NEUTRAL.era) / Math.LN2, VAL.arm), card: card, np: np };
  }
  var PITCHES4 = ['H', 'B', 'J', 'C'];
  // c: a card in the game ({role, line: the season on its back, kid, r: its rates}); writes the values into c.r:
  // bat or arm (the modifier), card (its ranges), and a pitcher's pitches
  function table(c) {
    if (!c || !c.r || c.kind && c.kind !== 'player') return c;
    if (c.r.vv === 3) return c;
    var r = c.r, kid = c.kid || r.kid;
    if (c.role === 'p') { var p = valuesP(Object.assign({}, r, { kid: kid }), c.scout ? null : c.line); r.arm = p.mod; r.card = p.card; r.np = p.np; r.pitches = PITCHES4.slice(0, p.np); r.short = p.short || 0; }
    else { var h = valuesH(Object.assign({}, r, { kid: kid }), c.scout ? null : c.line); r.bat = h.mod; r.card = h.card; r.short = h.short || 0; }
    r.vv = 3;
    return c;
  }
  // a card's ranges: a pitcher's one row, or a batter's row for the guess ('right' or 'wrong'); and what a die reads
  function ranges(card, row) { var f = RANGES[card] || RANGES.plain; return Array.isArray(f) ? f : f[row || 'wrong']; }
  function readDie(card, row, die) { var rg = ranges(card, row); for (var i = 0; i < rg.length; i++) if (die >= rg[i][0] && die <= rg[i][1]) return rg[i][2]; return rg[rg.length - 1][2]; }
  function d20(r) { return 1 + Math.floor(r() * 20); }
  function d6(r) { return 1 + Math.floor(r() * 6); }
  // a pitcher's fatigue in the k-th inning of his stint (k from 0): 0, 0, −1, −2, −3 at most
  function tired(k) { return -Math.min(3, Math.max(0, k + 2 - RULE.tire)); }

  // A team's three pitchers share the innings: 9 is 3, 3, 3; 5 is 2, 2, 1; 3 is 1, 1, 1. Extra innings belong to the
  // last of them. stintOf(inning, innings) = {i: which pitcher (0 to 2), k: his innings before this one in the stint}.
  function stints(inn) { var a = Math.ceil(inn / 3), c = Math.floor(inn / 3); return [a, inn - a - c, c]; }
  function stintOf(inn, n) {
    var s = stints(n), at = 0;
    for (var i = 0; i < 3; i++) { if (inn <= at + s[i]) return { i: i, k: inn - at - 1 }; at += s[i]; }
    return { i: 2, k: inn - (n - s[2]) - 1 };
  }
  // The order of a team's three pitchers (Best fit, and the computer's): each stint scored by the pitcher's modifier
  // with his fatigue inning by inning, the late innings counting a little more (a run in the 8th decides more games
  // than a run in the 2nd). arms: their values ({arm}); returns the order as indexes into arms.
  function staffOrder(arms, inn) {
    var st = stints(inn), perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]], best = null;
    perms.forEach(function (p) {
      var v = 0;
      p.forEach(function (ai, si) { var a = arms[ai] || { arm: -2 }; for (var k = 0; k < st[si]; k++) v += (a.arm + tired(k)) * (1 + .08 * si); });
      if (!best || v > best.v + 1e-9) best = { v: v, p: p };
    });
    return best.p;
  }

  // The at-bat's rule lives here alone: what the page shows (steps) and what happened (o). The page and the sim both
  // call atBat, so a new way to roll is a change to this function and the ranges it reads.
  // c: {bat, arm, fat (the pitcher's fatigue, 0 or less), guess (true when the batter named the pitch), plusB / plusP:
  //   [{k, v}] cards in play for each side, bcard, pcard (card names), sure (League Leaders: the batter wins and a walk
  //   is a single), rb (Record Breaker: a hit goes up one), two (All-Star: the batter rolls twice and keeps the
  //   higher), bd, pd (fixed dice, for demos and tests)}; r: the dice.
  // Returns {bd, pd, bdice, bt, pt, need, win, row ('right', 'wrong' or 'p'), die (the winner's die), range, face
  //   (what the card says), o (what happened: K G F BB S D T HR), why, modsB, modsP, steps}
  function atBat(c, r) {
    var modsB = [{ k: 'bat', v: c.bat | 0 }].concat(c.plusB || []), modsP = [{ k: 'arm', v: c.arm | 0 }];
    if (c.fat) modsP.push({ k: 'tired', v: c.fat });
    (c.plusP || []).forEach(function (m) { modsP.push(m); });
    var sb = 0, sp = 0; modsB.forEach(function (m) { sb += m.v; }); modsP.forEach(function (m) { sp += m.v; });
    var bdice = [c.bd || d20(r)]; if (c.two) bdice.push(d20(r));
    var bd = Math.max.apply(null, bdice), pd = c.pd || d20(r);
    var bt = bd + sb, pt = pd + sp, need = RULE.margin, beat = bt - pt >= need;
    var win = !!(c.sure || beat), row = win ? (c.guess ? 'right' : 'wrong') : 'p';
    var die = win ? bd : pd, card = win ? c.bcard : c.pcard, rg = ranges(card, row), range = null;
    rg.forEach(function (x) { if (die >= x[0] && die <= x[1]) range = x; });
    var face = range[2], o = face, why = '';
    if (c.sure && !beat) why = 'sure';
    if (c.sure && o === 'BB') { o = 'S'; why = 'sure'; }
    if (c.rb && RANK[o] >= RANK.S) { var up = { S: 'D', D: 'T', T: 'HR', HR: 'HR' }[o]; if (up !== o) { o = up; why = 'rb'; } }
    var x = { bd: bd, pd: pd, bdice: bdice, sb: sb, sp: sp, bt: bt, pt: pt, need: need, win: win, row: row, die: die, range: range, card: card, face: face, o: o, why: why, modsB: modsB, modsP: modsP };
    x.steps = [{ k: 'mods' }, { k: 'dice' }, { k: 'margin', need: need, by: bt - pt }, { k: 'row', row: row }, { k: 'read', side: win ? 'b' : 'p', card: card, die: die, range: range }];
    if (why) x.steps.push({ k: 'mark', why: why, from: face, to: o });
    return x;
  }
  // A ground out or a fly out goes to a fielder: a d6 says which. A fielder out of position rolls a d20: at a near
  // position he boots it on a 1, at a far one on a 1, 2 or 3.
  var WHERE6 = { G: ['1B', '2B', '2B', 'SS', 'SS', '3B'], F: ['LF', 'LF', 'CF', 'CF', 'RF', 'RF'] };
  var BOOT = { home: 0, near: 1, far: 3 };
  function whereOf(kind, f) { return WHERE6[kind][f - 1]; }
  function tune(o) { for (var k in o) { if (k in RULE) RULE[k] = o[k]; if (k in VAL) VAL[k] = o[k]; if (k in RUN) RUN[k] = o[k]; if (k === 'ranges') for (var f in o.ranges) RANGES[f] = o.ranges[f]; } }
  function pitchCount(o, r) {
    var base = { K: 4.8, BB: 5.7 }[o];
    return Math.max(1, Math.round((base == null ? 3.4 : base) + (r() - .5) * 3));
  }
  // ── Running the bases ───────────────────────────────────────────────────────
  // One rule for the app and the table: the printed reference page (printSheet in ui.js) says exactly this, a line a
  // case, and advance() does exactly what it says. Chance is one d6, rolled only where a line says so, and the
  // speedster card (his card, 'speed') is the one edge a runner has. RUN holds the faces a roll needs; the sim sets them.
  //   Walk or hit by pitch: the batter takes first; a runner moves up only when he is forced.
  //   Single: runners on second and third score; a runner on first goes to second, or to third on a d6 of s13 or
  //     more (a speedster always).
  //   Double: runners on second and third score; a runner on first goes to third, or scores on a d6 of d1h or more
  //     (a speedster always).
  //   Triple or home run: every runner scores.
  //   Ground out: with a runner on first and fewer than two outs, a d6 of dp or less (dpFast with a speedster
  //     batting) is a double play, the runner from first out as well. Runners on first and second move up a base,
  //     and a runner on third scores only when the bases were loaded.
  //   Fly out: with fewer than two outs a runner on third tags and scores on a d6 of tag or more (tagFast for a
  //     speedster); on a fly to center a runner on second then takes third when it is open.
  //   Error: the batter is safe at first and every runner moves up one base.
  //   No run scores on a play that makes the third out.
  var RUN = { s13: 5, d1h: 5, dp: 3, dpFast: 2, tag: 3, tagFast: 2 };
  // st = {bases: [id|null x3], outs, batter, where (the fielder of an out in play), die (a fixed d6, for tests)}; fast(id): his
  // card is the speedster's. Returns {bases, outs, scored: [ids], rbi, tag ('dp', 'sf', or a home run's kind), roll}
  // and never changes st. roll, when a d6 was rolled: {k: 's13' | 'd1h' | 'dp' | 'tag', d: the face, need: the faces
  // that make it as [lo, hi], ok: whether it happened, who: the runner (the batter, for a double play)}.
  function advance(st, o, r, fast) {
    var b = st.bases.slice(), outs = st.outs, scored = [], bat = st.batter, tag = '', rbi = true, roll = null;
    fast = fast || function () { return false; };
    function score(id) { if (id) scored.push(id); }
    function die(k, who, lo, hi) { var d = st.die || d6(r); roll = { k: k, d: d, need: [lo, hi], ok: d >= lo && d <= hi, who: who }; return roll.ok; }
    function up() { score(b[2]); b[2] = b[1]; b[1] = b[0]; b[0] = null; }   // every runner moves up one base
    switch (o) {
      case 'BB': case 'HBP':
        if (b[0]) { if (b[1]) { if (b[2]) score(b[2]); b[2] = b[1]; } b[1] = b[0]; }
        b[0] = bat; break;
      case 'E': rbi = false; up(); b[0] = bat; break;
      case 'S':
        score(b[2]); score(b[1]); b[2] = b[1] = null;
        if (b[0]) { if (fast(b[0]) || die('s13', b[0], RUN.s13, 6)) b[2] = b[0]; else b[1] = b[0]; }
        b[0] = bat; break;
      case 'D':
        score(b[2]); score(b[1]); b[2] = b[1] = null;
        if (b[0]) { if (fast(b[0]) || die('d1h', b[0], RUN.d1h, 6)) score(b[0]); else b[2] = b[0]; }
        b[0] = null; b[1] = bat; break;
      case 'T': score(b[2]); score(b[1]); score(b[0]); b = [null, null, bat]; break;
      case 'HR': score(b[2]); score(b[1]); score(b[0]); score(bat); b = [null, null, null]; tag = ['solo', 'two-run', 'three-run', 'slam'][scored.length - 1]; break;
      case 'K': outs++; break;
      case 'GB':
        var loaded = !!(b[0] && b[1] && b[2]);
        if (b[0] && outs < 2 && die('dp', bat, 1, fast(bat) ? RUN.dpFast : RUN.dp)) { outs += 2; tag = 'dp'; rbi = false; b[0] = null; }
        else outs++;
        if (outs < 3) {
          if (loaded) up();   // forced home
          else { if (b[1] && !b[2]) { b[2] = b[1]; b[1] = null; } if (b[0] && !b[1]) { b[1] = b[0]; b[0] = null; } }
        }
        break;
      case 'FB':
        outs++;
        if (outs < 3) {
          if (b[2] && die('tag', b[2], fast(b[2]) ? RUN.tagFast : RUN.tag, 6)) { score(b[2]); b[2] = null; tag = 'sf'; }
          if (st.where === 'CF' && b[1] && !b[2]) { b[2] = b[1]; b[1] = null; }
        }
        break;
      default: outs++;   // LD, PU: nobody moves
    }
    if (outs >= 3) { outs = 3; scored = []; }
    return { bases: b, outs: outs, scored: scored, rbi: rbi ? scored.length : 0, tag: tag, roll: roll };
  }

  // The faces of the d6 a roll needs, said the way a person says them: "a 5 or 6", "a 1, 2 or 3", "3 to 6"
  function faces(lo, hi) {
    if (lo === hi) return 'a ' + lo;
    if (hi - lo === 1) return 'a ' + lo + ' or ' + hi;
    if (hi - lo === 2) return 'a ' + lo + ', ' + (lo + 1) + ' or ' + hi;
    return lo + ' to ' + hi;
  }
  // The rule as it is printed (the reference page) and told (How to play): [the case, what happens], one line a case.
  // Made from RUN, so the words never drift from what advance() does.
  function runLines() {
    return [
      ['Walk or hit by pitch', 'The batter takes first. A runner moves up only when he’s forced.'],
      ['Single', 'Runners on second and third score. A runner on first goes to second, or to third on ' + faces(RUN.s13, 6) + '. A speedster on first always takes third.'],
      ['Double', 'Runners on second and third score. A runner on first goes to third, or scores on ' + faces(RUN.d1h, 6) + '. A speedster on first always scores.'],
      ['Triple or home run', 'Every runner scores.'],
      ['Strikeout', 'Nobody moves.'],
      ['Ground out', 'With a runner on first and fewer than two outs, ' + faces(1, RUN.dp) + ' is a double play (' + faces(1, RUN.dpFast) + ' with a speedster batting). Runners on first and second move up. A runner on third scores only if the bases were loaded.'],
      ['Fly out', 'With fewer than two outs, a runner on third tags and scores on ' + faces(RUN.tag, 6) + ' (' + faces(RUN.tagFast, 6) + ' for a speedster). On a fly to center, a runner on second then takes third if it’s open.'],
      ['Error', 'The batter is safe at first, and every runner moves up one base.'],
      ['Third out', 'No run scores on a play that makes the third out.']
    ];
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
    var w = { H: .6 + 1.2 * stf - .7 * pow, B: .6 + .7 * stf + .3 * ctl - .5 * con, J: .5 + 1.1 * ctl - .6 * eye, C: .5 + .8 * ctl - .4 * pow };
    var has = P.pitches || PITCHES, out = {}; has.forEach(function (k) { out[k] = w[k]; });
    return out;
  }
  // the pitches a pitcher holds (his pitch cards): the batter guesses among these
  function pitchesOf(P) { return (P && P.pitches) || PITCHES; }
  function cpuPitch(P, H, level, seen, r) {
    var has = pitchesOf(P);
    if (level === 'easy') return has[Math.floor(r() * has.length)];
    var w = pitchWeights(P, H);
    if (level === 'hard' && seen && seen.n >= 4) has.forEach(function (k) { w[k] *= 1.35 - (seen[k] || 0) / seen.n; });   // away from what the batter keeps looking for
    return weighted(w, r, level === 'hard' ? 1.4 : 1);
  }
  function cpuLook(P, H, level, seen, r) {
    var has = pitchesOf(P);
    if (level === 'easy') return has[Math.floor(r() * has.length)];
    var w = pitchWeights(P, H);
    if (level === 'hard' && seen && seen.n >= 3) has.forEach(function (k) { w[k] *= .65 + (seen[k] || 0) / seen.n * 1.2; });   // toward what this pitcher has been throwing
    return weighted(w, r, level === 'hard' ? 1.6 : 1.1);
  }
  function weighted(w, r, sharp) {
    var t = 0, k, v = {};
    for (k in w) { v[k] = Math.pow(Math.max(.05, w[k]), sharp); t += v[k]; }
    var x = r() * t; for (k in v) { x -= v[k]; if (x <= 0) return k; } return 'H';
  }

  var E = { NEUTRAL: NEUTRAL, PITCHES: PITCHES, PITCHES4: PITCHES4, PNAME: PNAME, FIELD: FIELD, ERR: ERR, KID: KID, ARM: ARM,
    RULE: RULE, RANGES: RANGES, ranges: ranges, readDie: readDie, CNAME: CNAME, BNAME: BNAME, RANK: RANK, VAL: VAL, BOOT: BOOT, WHERE6: WHERE6, whereOf: whereOf,
    valuesH: valuesH, valuesP: valuesP, table: table, tired: tired, stints: stints, stintOf: stintOf, staffOrder: staffOrder,
    atBat: atBat, d20: d20, d6: d6, tune: tune,
    clamp: clamp, rng: rng, hash: hash, skey: skey, load: load, db: function () { return DB; }, seasons: seasons, honors: honors,
    teamName: teamName, nick: nick, lgOf: lgOf, byId: byId, name: name, find: find, roleOf: roleOf, cardSeason: cardSeason,
    positionsNear: positionsNear, rateH: rateH, rateP: rateP, scout: scout, pitchCount: pitchCount,
    advance: advance, RUN: RUN, faces: faces, runLines: runLines, fit: fit, where: where, pitchesOf: pitchesOf, cpuPitch: cpuPitch, cpuLook: cpuLook, pitchWeights: pitchWeights };
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.WaxEngine = E;
})(this);
