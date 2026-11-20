'use strict';
// Wax Pack's drawn card: a front and a back in the look of a late-1980s or early-1990s baseball card, at any size.
// Every design here is original: no maker's layout, logo or wordmark, no league or team logo. The picture on the front
// is a photograph of an anonymous ballplayer in a plain uniform (games/waxpack/art, made by the picture tool from the
// briefs in scripts/waxpack-art/), picked for the man's role and hands; the person's own photo of their real card takes
// its place in the frame when there is one.
//
//   WaxCard.face(card, opts) -> element    a card front
//   WaxCard.back(card, opts) -> element    a card back: his seasons up to the card's season, a line from his honors
//   WaxCard.artFor(card)     -> key        the picture for a card (the same player always gets the same picture)
//   WaxCard.styleFor(card)   -> style id   the design for a card's year
//   WaxCard.colors(card)     -> [main, second]   team colors, plain colors keyed by the team's code
//   WaxCard.fit(root)        names too long for their plate are set condensed, never cut (runs by itself too)
//
// card: the shape ui.js makes (makeCard): {kind, name, year, sy (the season shown), tc (team code), team (nickname),
//   pos ([positions] or 'SS'), role ('h' | 'p'), pid, rk, as, rb, err, kid, scout, line}. Anything missing is left off.
// opts: {size (px number or a CSS length; default: the width of the parent), photo (a URL or Blob: the person's own
//   photo of this card), photoWhole (true: that photo is the whole card, not just its picture), art (a picture key, to
//   force one), style (a style id, to force one), pos (the position he stands at now, for the badge)}
//
// Sizes are in container units of the card, so one element reads at any size; under 130px wide a card keeps only its
// picture, his last name and his position (nothing under 9px), and under 76px wide the special marks go too.
// Fonts (fonts/waxpack-*.woff2, credits in fonts/waxpack-LICENSE.txt): Oswald Bold (block names), Yellowtail (script
// first names), Barlow Condensed (the gloss nameplate and the back's stat table), Alfa Slab One (block plates; the
// repo's own copy).
(function (root) {
  var E = function () { return root.WaxEngine || null; };
  var BASE = (function () {
    try { var s = document.currentScript && document.currentScript.src; if (s) return s.replace(/[^/]*$/, ''); } catch (e) {}
    return 'waxpack/';
  })();

  // ── Team colors (plain colors, no logos), by the database's team code ─────────────────────────────────────
  var TEAM = {
    ATL: ['#13274f', '#ce1141'], BAL: ['#df4601', '#1d1d1b'], BOS: ['#bd3039', '#0c2340'], CAL: ['#003263', '#ba0021'],
    ANA: ['#ba0021', '#003263'], LAA: ['#ba0021', '#003263'], CHA: ['#27251f', '#c4ced4'], CHN: ['#0e3386', '#cc3433'],
    CIN: ['#c6011f', '#1d1d1b'], CLE: ['#0c2340', '#e31937'], COL: ['#33006f', '#c4ced4'], DET: ['#0c2340', '#fa4616'],
    FLO: ['#00a3e0', '#ef3340'], MIA: ['#00a3e0', '#ef3340'], HOU: ['#002d62', '#eb6e1f'], KCA: ['#004687', '#bd9b60'],
    LAN: ['#005a9c', '#ef3e42'], MIL: ['#12284b', '#ffc52f'], ML4: ['#12284b', '#ffc52f'], MIN: ['#002b5c', '#d31145'],
    MON: ['#003087', '#e4002b'], NYA: ['#0c2340', '#c4ced4'], NYN: ['#002d72', '#ff5910'], OAK: ['#003831', '#efb21e'],
    ATH: ['#003831', '#efb21e'], PHI: ['#e81828', '#002d72'], PIT: ['#27251f', '#fdb827'], SDN: ['#4f3a2a', '#ffc425'],
    SEA: ['#0c2c56', '#005c5c'], SFN: ['#fd5a1e', '#27251f'], SLN: ['#c41e3a', '#0c2340'], TBA: ['#092c5c', '#8fbce6'],
    TEX: ['#003278', '#c0111f'], TOR: ['#134a8e', '#e8291c'], WAS: ['#ab0003', '#14225a'], ARI: ['#a71930', '#30ced8'],
    ML1: ['#0c2340', '#ce1141'], BSN: ['#0c2340', '#ce1141'], BRO: ['#005a9c', '#c4ced4'], NY1: ['#fd5a1e', '#1d1d1b'],
    PHA: ['#003087', '#c4ced4'], KC1: ['#006241', '#efb21e'], SLA: ['#5a3a22', '#e86a1f'], WS1: ['#14225a', '#ab0003'],
    WS2: ['#14225a', '#ab0003'], SE1: ['#003087', '#efb21e']
  };
  // the same colors by nickname, for a card that knows only that (and the special cards)
  var NICK = { Angels: 'CAL', Astros: 'HOU', Athletics: 'OAK', 'Blue Jays': 'TOR', Braves: 'ATL', Brewers: 'MIL', Cardinals: 'SLN',
    Cubs: 'CHN', Dodgers: 'LAN', Expos: 'MON', Giants: 'SFN', Indians: 'CLE', Guardians: 'CLE', Mariners: 'SEA', Marlins: 'FLO',
    Mets: 'NYN', Orioles: 'BAL', Padres: 'SDN', Phillies: 'PHI', Pirates: 'PIT', Rangers: 'TEX', 'Red Sox': 'BOS', Reds: 'CIN',
    Rockies: 'COL', Royals: 'KCA', Tigers: 'DET', Twins: 'MIN', 'White Sox': 'CHA', Yankees: 'NYA', Diamondbacks: 'ARI',
    Rays: 'TBA', 'Devil Rays': 'TBA', Nationals: 'WAS', Senators: 'WS2', Browns: 'SLA', Pilots: 'SE1' };
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function colors(c) {
    c = c || {};
    var code = c.tc && TEAM[c.tc] ? c.tc : NICK[c.team];
    if (code && TEAM[code]) return TEAM[code];
    var h = hash(c.team || c.tc || c.name || 'x') % 360;
    return ['hsl(' + h + ' 52% 30%)', 'hsl(' + ((h + 40) % 360) + ' 68% 52%)'];
  }
  // a team's name as it was in the card's season (the database keeps a franchise's latest name)
  function nickFor(c) {
    var y = c.sy || c.year || 0, tc = c.tc;
    if (tc === 'CLE' && y && y < 2022) return 'Indians';
    if (tc === 'TBA' && y && y < 2008) return 'Devil Rays';
    if (c.team) return c.team;
    var e = E(); return tc && e && e.nick ? e.nick(tc) : '';
  }

  // ── The designs ─────────────────────────────────────────────────────────────────────────────────────────────
  // vintage: cream stock, a rounded photo, the position in a team-colored disc (before 1980)
  // corner:  white border, a team-colored banner across the lower corner, the first name in script
  // stripe:  a team-colored border with a diagonal band in the second color, a block nameplate
  // frame:   a gray stock border, the photo framed in two lines, a block nameplate with the position at its end
  // script:  white border, a thick team-colored frame, the name in script over a swash
  // gloss:   the photo to a thin dark edge, a gradient nameplate and a foil rule (the 1990s)
  var STYLES = ['vintage', 'corner', 'stripe', 'frame', 'script', 'gloss'];
  var BY_YEAR = { 1980: 'corner', 1981: 'frame', 1982: 'stripe', 1983: 'script', 1984: 'corner', 1985: 'stripe', 1986: 'frame',
    1987: 'script', 1988: 'corner', 1989: 'stripe', 1990: 'frame', 1991: 'gloss', 1992: 'script', 1993: 'gloss', 1994: 'corner',
    1995: 'gloss', 1996: 'frame', 1997: 'gloss', 1998: 'stripe', 1999: 'gloss' };
  function styleFor(c) {
    var y = (c && c.year) || 0;
    if (!y) return 'corner';
    if (y < 1980) return 'vintage';
    if (BY_YEAR[y]) return BY_YEAR[y];
    return y % 2 ? 'gloss' : 'stripe';
  }

  // ── The pictures ────────────────────────────────────────────────────────────────────────────────────────────
  function art() { return root.WaxArt || { list: [] }; }
  function bt(c) { var e = E(), pl = c.pid && e && e.byId ? e.byId(c.pid) : null; return pl && pl.bt ? pl.bt : ''; }
  function rgb(col) {
    var m = /^#([0-9a-f]{6})$/i.exec(col || ''); if (m) { var n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
    m = /hsl\((\d+) (\d+)% (\d+)%\)/.exec(col || ''); if (!m) return [80, 80, 80];
    var h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100, q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function f(t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  function dist(a, b) { a = rgb(a); b = rgb(b); return Math.sqrt(2 * Math.pow(a[0] - b[0], 2) + 4 * Math.pow(a[1] - b[1], 2) + 3 * Math.pow(a[2] - b[2], 2)); }
  function posOf(c, o) { var p = (o && o.pos) || (c.role === 'p' ? 'P' : Array.isArray(c.pos) ? c.pos[0] : c.pos); return String(p || (c.role === 'p' ? 'P' : '')); }
  // The picture for a card: by what he does (a pitcher pitches, a catcher crouches, a shortstop dives, a hitter bats
  // from his own side), then a cap near the team's color, then his id, so the same player always gets the same one.
  function artFor(c) {
    c = c || {};
    var L = art().list; if (!L.length) return null;
    var key = c.pid || (c.name || '') + '|' + (c.year || ''), h = hash(key), p = posOf(c), b = bt(c), bats = b.charAt(0), thr = b.charAt(1);
    function pool(role, hand) { return L.filter(function (a) { return a.role === role && (!hand || a.hand === hand); }); }
    var side = bats === 'L' ? 'L' : bats === 'R' ? 'R' : bats === 'B' || bats === 'S' ? (h & 1 ? 'L' : 'R') : (h % 5 === 0 ? 'L' : 'R');
    var P;
    if (c.kind && c.kind !== 'player') P = L.filter(function (a) { return a.role === 'sp-' + c.kind; });
    if (!P || !P.length) {
      if (c.role === 'p' || p === 'P') {
        P = pool('pitch', thr === 'L' ? 'L' : thr === 'R' ? 'R' : (h % 4 === 0 ? 'L' : 'R'));
      } else {
        var bat = pool('bat', side).concat(pool('swing', side)), field = [];
        if (p === 'C') field = pool('catcher').concat(L.filter(function (a) { return a.k === 'pose-4'; }));
        else if (p === '1B') field = pool('first');
        else if (/^(SS|2B|3B)$/.test(p)) field = pool('infield');
        else if (/^(OF|LF|CF|RF)$/.test(p)) field = pool('outfield');
        if (c.r && c.r.spd >= 8) field = field.concat(pool('run'));
        if (c.rk) field = field.concat(pool('pose'));
        P = field.length && h % 5 < 3 ? field : bat;
      }
    }
    if (!P.length) P = L;
    var t1 = colors(c)[0], near = P.filter(function (a) { return a.cap && dist(a.cap, t1) < 220; });
    var Q = near.length ? near : P;
    return Q[(h >>> 3) % Q.length].k;
  }
  // the ink that reads on a team color: white on a dark color, near-black on a light one
  function ink(col) { var c = rgb(col).map(function (v) { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2] > .36 ? '#141414' : '#fff'; }
  function paintColors(d, cl) { d.style.setProperty('--t1', cl[0]); d.style.setProperty('--t2', cl[1]); d.style.setProperty('--i1', ink(cl[0])); d.style.setProperty('--i2', ink(cl[1])); }
  function artSrc(k, small) { return BASE + 'art/' + k + (small ? '-s' : '') + '.webp'; }

  // ── Building ────────────────────────────────────────────────────────────────────────────────────────────────
  function h(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  function nameParts(c) {
    if (c.kid) return ['Sandlot', 'Kid'];
    var parts = String(c.name || '').trim().split(/\s+/);
    if (parts.length < 2) return ['', parts[0] || ''];
    var last = parts.pop();
    if (/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(last) && parts.length > 1) last = parts.pop() + ' ' + last;   // Ken Griffey Jr.
    return [parts.join(' '), last];
  }
  var SPN = { team: 'Team card', checklist: 'Checklist', leaders: 'League Leaders', highlight: 'Highlight', as: 'All-Star', rb: 'Record Breaker', err: 'Error card', dup: 'Second copy' };
  function sizeOf(n, o) {
    if (o.size == null) return;
    n.style.width = typeof o.size === 'number' ? o.size + 'px' : o.size;
  }
  function photoUrl(p) { if (!p) return ''; if (typeof p === 'string') return p; try { return URL.createObjectURL(p); } catch (e) { return ''; } }
  function picture(c, o) {
    var box = h('div', 'wxc-ph'), img = h('img');
    img.alt = ''; img.decoding = 'async'; img.draggable = false;
    var own = photoUrl(o.photo);
    if (own) { img.src = own; box.classList.add('own'); }
    else if (c.kind === 'checklist') { box.classList.add('list'); box.appendChild(checklist(c)); return box; }
    else {
      var k = o.art || artFor(c);
      if (!k) { box.classList.add('none'); return box; }
      img.src = artSrc(k, false);
      img.srcset = artSrc(k, true) + ' 240w, ' + artSrc(k, false) + ' 640w';
      img.sizes = typeof o.size === 'number' ? Math.round(o.size * .9) + 'px' : (o.size || '260px');
      var a = (art().byKey || {})[k]; if (a && a.fy != null) img.style.objectPosition = '50% ' + a.fy + '%';
      box.dataset.art = k;
    }
    box.appendChild(img);
    return box;
  }
  function checklist(c) {
    var w = h('div', 'wxc-chk'), seed = hash(c.year || 'x');
    for (var i = 0; i < 9; i++) { var r = h('i', ((seed >> i) & 1) && i % 3 !== 1 ? 'on' : ''); r.style.setProperty('--l', (48 + ((seed >> (i * 2)) & 31)) + '%'); w.appendChild(r); }
    return w;
  }
  function mark(c) {
    if (c.rk) return h('b', 'wxc-mk rk', 'ROOKIE');
    if (c.as) return h('b', 'wxc-mk as', 'ALL-STAR');
    if (c.rb) return h('b', 'wxc-mk rb', 'RECORD BREAKER');
    return null;
  }
  function face(c, o) {
    c = c || {}; o = o || {};
    var st = STYLES.indexOf(o.style) >= 0 ? o.style : styleFor(c), cl = colors(c);
    var d = h('div', 'wxc wxc-' + st + (c.kind && c.kind !== 'player' ? ' wxc-sp' : ''));
    paintColors(d, cl);
    sizeOf(d, o);
    var nm = nameParts(c), pos = posOf(c, o), team = nickFor(c);
    if (c.kind && c.kind !== 'player') { nm = ['', SPN[c.kind] || 'Card']; pos = ''; }
    d.setAttribute('role', 'img');
    d.setAttribute('aria-label', (c.kind && c.kind !== 'player' ? SPN[c.kind] || 'Card' : (c.name || 'Card')) + (c.year ? ', ' + c.year : ''));
    if (o.photo && o.photoWhole) {   // the person's photo of the whole card
      d.classList.add('wxc-whole'); var im = h('img'); im.alt = ''; im.src = photoUrl(o.photo); d.appendChild(im);
      d.appendChild(h('i', 'wxc-fx')); return d;
    }
    var deco = h('i', 'wxc-deco'); d.appendChild(deco);
    d.appendChild(picture(c, o));
    var np = h('div', 'wxc-np');
    if (nm[0]) np.appendChild(h('span', 'wxc-fn', nm[0]));
    np.appendChild(h('span', 'wxc-ln', String(nm[1])));
    if (team && !c.kid) np.appendChild(h('span', 'wxc-tm', team));
    else if (c.kid) np.appendChild(h('span', 'wxc-tm', 'Sandlot'));
    d.appendChild(np);
    if (pos) d.appendChild(h('b', 'wxc-pos', pos));
    var mk = mark(c); if (mk) d.appendChild(mk);
    d.appendChild(h('i', 'wxc-fx'));
    watch(d);
    return d;
  }

  // ── The back ────────────────────────────────────────────────────────────────────────────────────────────────
  var HAND = { R: 'Right', L: 'Left', B: 'Both', S: 'Both' };
  var POSN = { P: 'Pitcher', C: 'Catcher', '1B': 'First base', '2B': 'Second base', '3B': 'Third base', SS: 'Shortstop', LF: 'Left field', CF: 'Center field', RF: 'Right field', OF: 'Outfield', DH: 'Designated hitter' };
  function f3(x) { return isFinite(x) ? x.toFixed(3).replace(/^0/, '') : '.000'; }
  function ipStr(ipo) { return Math.floor(ipo / 3) + (ipo % 3 ? '.' + (ipo % 3) : ''); }
  function clubOf(s) { return nickFor({ tc: s.t, sy: s.y, team: '' }) || s.t || ''; }
  var MAXROWS = 12;
  function rowsFor(L, role, upto) {
    var S = L.filter(function (s) { return !upto || s.y <= upto; });
    if (!S.length) S = L.slice(0, 1);
    var out = [], tot = role === 'p' ? { g: 0, gs: 0, ipo: 0, h: 0, er: 0, bb: 0, so: 0, w: 0, l: 0, sv: 0 } : { g: 0, ab: 0, h: 0, d: 0, tr: 0, hr: 0, rbi: 0, sb: 0, bb: 0 };
    S.forEach(function (s) { for (var k in tot) tot[k] += s[k] || 0; });
    var rows = S.slice();
    if (rows.length > MAXROWS) {   // the earliest seasons together on one line, so nothing is lost
      var early = rows.splice(0, rows.length - MAXROWS + 1), sum = { y0: early[0].y, y1: early[early.length - 1].y, t: '' };
      for (var k in tot) sum[k] = early.reduce(function (a, s) { return a + (s[k] || 0); }, 0);
      rows.unshift(sum);
    }
    rows.forEach(function (s) { out.push(s); });
    tot.total = true;
    return { rows: out, tot: tot, n: S.length };
  }
  function cells(s, role) {
    var yr = s.total ? 'Totals' : s.y0 ? String(s.y0).slice(2) + '–' + String(s.y1).slice(2) : String(s.y), tm = s.total || s.y0 ? '' : clubOf(s);
    if (role === 'p') {
      var era = s.ipo ? (s.er * 27 / s.ipo).toFixed(2) : '0.00';
      return [yr, tm, s.w, s.l, era, s.g, s.gs, ipStr(s.ipo), s.h, s.bb, s.so, s.sv];
    }
    return [yr, tm, s.g, s.ab, s.h, s.d, s.tr, s.hr, s.rbi, s.sb, f3(s.h / Math.max(1, s.ab))];
  }
  var HEAD = { p: ['Year', 'Club', 'W', 'L', 'ERA', 'G', 'GS', 'IP', 'H', 'BB', 'SO', 'SV'], h: ['Year', 'Club', 'G', 'AB', 'H', '2B', '3B', 'HR', 'RBI', 'SB', 'AVG'] };
  // one line from the honors he had won by the card's season (a 1988 card can't know about 1995), in whole sentences
  function bio(c, pl, upto) {
    var e = E(); if (!pl || !e || !e.honors) return '';
    var H = e.honors(pl), out = [];
    function have(k) { return (H[k] || []).filter(function (y) { return !upto || y <= upto; }); }
    var A = have('A'), M = have('M'), C = have('C'), R = have('R'), G = have('G'), S = have('S'), W = have('W');
    if (M.length) out.push('He was named Most Valuable Player in ' + list(M) + '.');
    if (C.length) out.push('He won the Cy Young Award in ' + list(C) + '.');
    if (R.length) out.push('He was Rookie of the Year in ' + R[0] + '.');
    if (A.length) out.push(A.length === 1 ? 'He made the All-Star team in ' + A[0] + '.' : 'He has made ' + A.length + ' All-Star teams.');
    if (G.length) out.push(G.length === 1 ? 'He won a Gold Glove in ' + G[0] + '.' : 'He has won ' + G.length + ' Gold Gloves.');
    if (S.length && out.length < 3) out.push(S.length === 1 ? 'He won a Silver Slugger in ' + S[0] + '.' : 'He has won ' + S.length + ' Silver Sluggers.');
    if (W.length && out.length < 3) out.push('He won the World Series in ' + list(W) + '.');
    return out.slice(0, 3).join(' ');
  }
  function list(a) { return a.length < 3 ? a.join(' and ') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function seasonLine(c, s, role) {
    if (!s) return '';
    if (role === 'p') {
      if (s.sv >= 20) return 'He saved ' + s.sv + ' games in ' + s.y + '.';
      if (s.w >= 15) return 'He won ' + s.w + ' games in ' + s.y + '.';
      return 'He struck out ' + s.so + ' batters in ' + ipStr(s.ipo) + ' innings in ' + s.y + '.';
    }
    if (s.hr >= 25) return 'He hit ' + s.hr + ' home runs in ' + s.y + '.';
    if (s.sb >= 30) return 'He stole ' + s.sb + ' bases in ' + s.y + '.';
    if (s.ab >= 300) return 'He batted ' + f3(s.h / s.ab) + ' in ' + s.y + '.';
    return 'He played in ' + s.g + ' games in ' + s.y + '.';
  }
  function back(c, o) {
    c = c || {}; o = o || {};
    var cl = colors(c), d = h('div', 'wxb');
    paintColors(d, cl);
    sizeOf(d, o);
    var e = E(), pl = c.pid && e && e.byId ? e.byId(c.pid) : null, role = c.role === 'p' ? 'p' : 'h';
    var num = h('b', 'wxb-no', String(1 + hash((c.pid || c.name || '') + c.year) % 792));
    var hd = h('div', 'wxb-hd'), nm = h('div', 'wxb-nm');
    nm.appendChild(h('span', 'wxb-name', String(c.kid ? 'Sandlot kid' : c.name || SPN[c.kind] || 'Card').toUpperCase()));
    var pos = posOf(c, o), team = nickFor(c);
    var sub = h('span', 'wxb-sub'); sub.appendChild(h('span', '', POSN[pos] || pos || ''));
    if (team) sub.appendChild(h('span', '', team));
    nm.appendChild(sub);
    hd.appendChild(num); hd.appendChild(nm); d.appendChild(hd);
    var facts = h('div', 'wxb-facts');
    function fact(k, v) { if (!v) return; var f = h('span', 'wxb-f'); f.appendChild(h('i', '', k)); f.appendChild(h('b', '', v)); facts.appendChild(f); }
    if (pl) {
      var b = pl.bt || '';
      fact('Bats', HAND[b.charAt(0)]); fact('Throws', HAND[b.charAt(1)]); fact('Born', pl.born ? String(pl.born) : '');
    } else if (c.scout) fact('Scouting', 'Report');
    d.appendChild(facts);
    var upto = c.sy || (c.year ? c.year - 1 : 0);
    var L = pl && e.seasons ? e.seasons(pl, role) : [];
    var txt = pl ? bio(c, pl, upto || c.year) : '';
    if (!txt && pl) txt = seasonLine(c, c.line || L.filter(function (s) { return s.y === upto; })[0], role);
    if (!txt) txt = c.kid ? 'He plays every day after school and never misses a pickup game.' : c.scout ? 'The record book has no line for him, so a scout sized him up.' : c.kind && c.kind !== 'player' ? '' : '';
    if (L.length) {
      var R = rowsFor(L, role, upto || 0), t = h('table', 'wxb-st ' + role), tr = h('tr');
      HEAD[role].forEach(function (x) { tr.appendChild(h('th', '', x)); }); var th = h('thead'); th.appendChild(tr); t.appendChild(th);
      var tb = h('tbody');
      R.rows.concat(R.n > 1 ? [R.tot] : []).forEach(function (s) {
        var r = h('tr', s.total ? 'tot' : s.y0 ? 'grp' : ''); cells(s, role).forEach(function (v) { r.appendChild(h('td', '', String(v))); }); tb.appendChild(r);
      });
      t.appendChild(tb);
      var wrap = h('div', 'wxb-tw'); wrap.appendChild(t); d.appendChild(wrap);
      d.style.setProperty('--rows', R.rows.length + (R.n > 1 ? 2 : 1));
    } else d.appendChild(h('div', 'wxb-tw none'));
    if (txt) d.appendChild(h('p', 'wxb-bio', txt));
    var ft = h('div', 'wxb-ft'); ft.appendChild(h('span', '', c.year ? String(c.year) : '')); ft.appendChild(h('span', '', 'Printed for Wax Pack'));
    d.appendChild(ft);
    d.appendChild(h('i', 'wxc-fx'));
    watch(d);
    return d;
  }

  // ── Names that run long are set condensed, as card makers did, never cut ───────────────────────────────────
  var RO = null;
  function fitOne(card) {
    card.querySelectorAll('.wxc-ln,.wxc-fn,.wxc-tm,.wxb-name').forEach(function (n) {
      n.style.transform = ''; n.style.letterSpacing = '';
      var box = n.parentNode.clientWidth, w = n.scrollWidth;
      if (!box || !w) return;
      var room = box - (parseFloat(getComputedStyle(n).marginLeft) || 0) - (parseFloat(getComputedStyle(n).marginRight) || 0);
      if (w > room + .5) n.style.transform = 'scaleX(' + Math.max(.4, room / w).toFixed(3) + ')';
    });
  }
  function watch(card) {
    if (typeof ResizeObserver === 'undefined') return;
    if (!RO) RO = new ResizeObserver(function (es) { es.forEach(function (en) { if (en.contentRect.width) fitOne(en.target); }); });
    RO.observe(card);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (card.isConnected) fitOne(card); });
  }
  function fit(rootEl) { (rootEl || document).querySelectorAll('.wxc,.wxb').forEach(fitOne); }

  root.WaxCard = { face: face, back: back, artFor: artFor, styleFor: styleFor, colors: colors, fit: fit, STYLES: STYLES, TEAM: TEAM, artSrc: artSrc };
})(this);
