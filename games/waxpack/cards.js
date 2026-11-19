'use strict';
// Wax Pack's cards as they are drawn on the screen, the special cards every shoebox has, the famous error cards, and
// the sample stack. A card is drawn in the look of its decade (no maker's logo or design is copied): cream borders and
// a pennant before 1980, white borders and a team band to 1986, loud frames to 1992, a full-bleed photo with a foil
// strip after. The photo of the card, when one was taken, takes the picture's place.
(function (root) {
  // Special cards: what each is, and the one-time play it gives the team that drafts it
  var SPECIAL = {
    team:      { name: 'Team card', play: 'Rally', when: 'bat', say: 'Your hitters get a lift for the rest of this half-inning.' },
    checklist: { name: 'Checklist', play: 'Peek', when: 'atbat', say: 'See the pitcher’s pitch before you choose what to look for.' },
    leaders:   { name: 'League Leaders', play: 'Sure hit', when: 'atbat', say: 'This at-bat is a hit.' },
    highlight: { name: 'Highlight card', play: 'Clutch pitch', when: 'pitch', say: 'The batter can’t guess this pitch right.' },
    as:        { name: 'All-Star card', play: 'All-Star swing', when: 'atbat', say: 'This at-bat swings twice, and the better swing counts.' },
    rb:        { name: 'Record Breaker', play: 'Swing for the record', when: 'atbat', say: 'This batter has three times his home run power for one at-bat.' },
    err:       { name: 'Error card', play: 'Error', when: 'bat', say: 'The other team makes an error on the next ball put in play.' },
    dup:       { name: 'Second copy', play: 'On fire', when: 'own', say: 'He’s on fire for one at-bat: his guess counts as right, and his power goes up.' }
  };
  // Famous printing mistakes a shoebox might hold, told by the announcer when one is logged
  var FAMOUS_ERR = [
    { n: 'billy ripken', y: 1989, say: 'The famous 1989 Fleer Billy Ripken, with words written on the knob of his bat. Fleer covered them up in later printings.' },
    { n: 'frank thomas', y: 1990, say: 'The 1990 Topps Frank Thomas printed without his name on the front.' },
    { n: 'dale murphy', y: 1989, say: 'The 1989 Upper Deck Dale Murphy with the photo printed backward.' }
  ];
  function famousErr(name, y) { var k = String(name || '').toLowerCase(); return FAMOUS_ERR.filter(function (f) { return f.n === k && (!y || f.y === y); })[0] || null; }

  // A stack to try the game with no cards at hand: stars and commons of 1987 to 1990, a few odd cards
  var SAMPLE = [
    ['Wade Boggs', 1988], ['Roger Clemens', 1988], ['Don Mattingly', 1988], ['Kirby Puckett', 1988], ['Tony Gwynn', 1988], ['Dwight Gooden', 1988],
    ['Ozzie Smith', 1988], ['Cal Ripken', 1988], ['Andre Dawson', 1988], [':team', 1988, { team: 'MIN' }], ['Mark McGwire', 1988], ['Orel Hershiser', 1989],
    ['Jose Canseco', 1989], ['Rickey Henderson', 1989], ['Ryne Sandberg', 1989], [':checklist', 1988], ['Dale Murphy', 1988], ['Frank Viola', 1989],
    ['Darryl Strawberry', 1988], ['Eric Davis', 1988], ['Will Clark', 1989], ['Alan Trammell', 1988], [':leaders', 1988], ['Gary Carter', 1988],
    ['Dave Stewart', 1989], ['Benito Santiago', 1988], ['Ken Griffey', 1989, { rk: 1 }], ['Billy Ripken', 1989, { err: 1 }], ['Rob Deer', 1988], ['Dennis Eckersley', 1989],
    ['Vince Coleman', 1988], ['Terry Steinbach', 1989], ['Kevin Seitzer', 1988], [':highlight', 1988]
  ];

  // Team colors by nickname (the drawn card's frame)
  var TC = { Angels: ['#ba0021', '#003263'], Astros: ['#eb6e1f', '#002d62'], Athletics: ['#003831', '#efb21e'], 'Blue Jays': ['#134a8e', '#e8291c'], Braves: ['#13274f', '#ce1141'],
    Brewers: ['#12284b', '#ffc52f'], Cardinals: ['#c41e3a', '#0c2340'], Cubs: ['#0e3386', '#cc3433'], Dodgers: ['#005a9c', '#ef3e42'], Expos: ['#003087', '#e4002b'],
    Giants: ['#fd5a1e', '#27251f'], Indians: ['#0c2340', '#e31937'], Guardians: ['#0c2340', '#e31937'], Mariners: ['#0c2c56', '#005c5c'], Marlins: ['#00a3e0', '#ef3340'],
    Mets: ['#002d72', '#ff5910'], Orioles: ['#df4601', '#27251f'], Padres: ['#4f3a2a', '#ffc425'], Phillies: ['#e81828', '#002d72'], Pirates: ['#27251f', '#fdb827'],
    Rangers: ['#003278', '#c0111f'], 'Red Sox': ['#bd3039', '#0c2340'], Reds: ['#c6011f', '#27251f'], Rockies: ['#33006f', '#c4ced4'], Royals: ['#004687', '#bd9b60'],
    Tigers: ['#0c2340', '#fa4616'], Twins: ['#002b5c', '#d31145'], 'White Sox': ['#27251f', '#c4ced4'], Yankees: ['#0c2340', '#c4ced4'], Diamondbacks: ['#a71930', '#e3d4ad'],
    Rays: ['#092c5c', '#8fbce6'], 'Devil Rays': ['#092c5c', '#8fbce6'], Nationals: ['#ab0003', '#14225a'], Senators: ['#ab0003', '#14225a'], Browns: ['#5a3a22', '#e86a1f'] };
  function colors(nick, seed) {
    if (TC[nick]) return TC[nick];
    var h = 0, s = String(seed || nick || 'x'); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return ['hsl(' + h + ' 55% 34%)', 'hsl(' + ((h + 40) % 360) + ' 70% 55%)'];
  }
  function era(y) { return !y ? 'eighty' : y < 1980 ? 'classic' : y < 1987 ? 'eighty' : y < 1993 ? 'neon' : 'gloss'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // The figure on a card with no photo: a batter at the plate or a pitcher in his windup, in the team's colors
  function figure(role, c1) {
    if (role === 'p') return '<svg class="wc-fig" viewBox="0 0 100 120" aria-hidden="true"><ellipse cx="50" cy="113" rx="30" ry="5" fill="rgba(0,0,0,.25)"/>' +
      '<path d="M44 30 q8 -3 13 3 l2 18 q8 4 16 -6 l5 3 q-8 16 -22 14 l-1 16 l12 30 l-8 3 l-12 -26 l-8 26 l-8 -2 l7 -32 l-2 -24 q-10 10 -18 6 l2 -5 q8 2 14 -10 z" fill="#f4efe4"/>' +
      '<circle cx="51" cy="21" r="8" fill="#e7c9a6"/><path d="M42 19 q9 -11 18 0 l5 1 l-23 0 z" fill="' + c1 + '"/>' +
      '<path d="M44 30 q8 -3 13 3 l1 9 l-15 1 z" fill="' + c1 + '" opacity=".85"/><circle cx="84" cy="44" r="3" fill="#fff"/></svg>';
    return '<svg class="wc-fig" viewBox="0 0 100 120" aria-hidden="true"><ellipse cx="50" cy="113" rx="30" ry="5" fill="rgba(0,0,0,.25)"/>' +
      '<path d="M40 34 q10 -4 16 2 l3 22 l-3 14 l10 34 l-8 2 l-10 -28 l-6 28 l-8 -1 l4 -36 l-2 -20 q-2 -10 4 -17 z" fill="#f4efe4"/>' +
      '<path d="M57 40 l14 -12 l3 3 l-14 14 z" fill="#e7c9a6"/><rect x="66" y="2" width="4.4" height="38" rx="2" transform="rotate(32 68 22)" fill="#c58f52"/>' +
      '<circle cx="48" cy="24" r="8" fill="#e7c9a6"/><path d="M39 22 q9 -12 19 -1 l-2 2 l-17 1 z" fill="' + c1 + '"/>' +
      '<path d="M40 34 q10 -4 16 2 l1 10 l-18 1 z" fill="' + c1 + '" opacity=".85"/></svg>';
  }
  function badge(c) {
    if (c.rk) return '<b class="wc-bdg rk">ROOKIE</b>';
    if (c.as) return '<b class="wc-bdg as">ALL-STAR</b>';
    if (c.rb) return '<b class="wc-bdg rb">RECORD BREAKER</b>';
    return '';
  }
  // c: {kind ('player' or a SPECIAL key), name, last, pos, year, team (nickname), role, rk, as, rb, err, kid}
  // o: {photo (a URL), big}
  function el(c, o) {
    o = o || {};
    var d = document.createElement('div');
    var cl = colors(c.team, c.name), kind = c.kind || 'player', ey = era(c.year);
    d.className = 'wc wc-' + ey + (kind !== 'player' ? ' wc-sp wc-' + kind : '') + (c.kid ? ' wc-kid' : '') + (o.photo ? ' wc-ph' : '');
    d.style.setProperty('--t1', cl[0]); d.style.setProperty('--t2', cl[1]);
    var nm = esc((c.name || '').toUpperCase()), yr = c.year ? '<i class="wc-yr">' + c.year + '</i>' : '';
    var pic;
    if (o.photo) pic = '<div class="wc-pic" style="background-image:url(&quot;' + o.photo + '&quot;)"></div>';
    else if (kind === 'player') pic = '<div class="wc-pic">' + figure(c.role, cl[0]) + '</div>';
    else pic = '<div class="wc-pic">' + specialArt(kind, c, cl) + '</div>';
    if (o.photo) { d.innerHTML = pic + yr; return d; }   // a photo of the real card is the whole card
    var foot;
    if (kind === 'player') {
      var parts = String(c.name || '').trim().split(/\s+/), last = parts.length > 1 ? parts.pop() : parts[0], first = parts.length ? parts.join(' ') : '';
      foot = '<div class="wc-plate"><span class="wc-fn">' + esc(first.toUpperCase()) + '</span><span class="wc-ln">' + esc(last.toUpperCase()) + '</span>' +
        '<span class="wc-tm">' + esc((c.team || (c.kid ? 'SANDLOT' : '')).toUpperCase()) + '</span><span class="wc-pos">' + esc(c.pos || '') + '</span></div>';
    } else foot = '<div class="wc-plate"><span class="wc-ln">' + esc(SPECIAL[kind] ? SPECIAL[kind].name.toUpperCase() : '') + '</span>' +
      (c.team ? '<span class="wc-tm">' + esc(String(c.team).toUpperCase()) + '</span>' : '') + '</div>';
    d.innerHTML = '<div class="wc-in">' + pic + badge(c) + foot + '</div>' + yr;
    d.setAttribute('aria-label', (c.name || (SPECIAL[kind] && SPECIAL[kind].name) || 'Card') + (c.year ? ', ' + c.year : ''));
    if (nm && kind === 'player') d.title = c.name;
    return d;
  }
  function specialArt(kind, c, cl) {
    if (kind === 'checklist') {
      var rows = ''; for (var i = 0; i < 7; i++) rows += '<g transform="translate(14 ' + (18 + i * 13) + ')"><rect width="7" height="7" fill="none" stroke="#333" stroke-width="1"/>' + (i % 3 !== 1 ? '<path d="M1 3.5 l2 2.5 l4 -6" fill="none" stroke="' + cl[0] + '" stroke-width="1.6"/>' : '') + '<rect x="12" y="2" width="' + (40 + (i * 13) % 28) + '" height="3" fill="#555" opacity=".5"/></g>';
      return '<svg viewBox="0 0 100 120" class="wc-fig"><rect x="6" y="8" width="88" height="104" fill="#fbf6e9"/>' + rows + '</svg>';
    }
    if (kind === 'team') return '<svg viewBox="0 0 100 120" class="wc-fig"><rect x="0" y="0" width="100" height="120" fill="' + cl[1] + '" opacity=".35"/>' +
      [0, 1, 2].map(function (r) { return [0, 1, 2, 3, 4].map(function (k) { var x = 14 + k * 18 + (r % 2) * 9, y = 40 + r * 22; return '<circle cx="' + x + '" cy="' + y + '" r="6" fill="#e7c9a6"/><path d="M' + (x - 8) + ' ' + (y + 16) + ' q8 -12 16 0 z" fill="' + cl[0] + '"/>'; }).join(''); }).join('') + '</svg>';
    if (kind === 'leaders') return '<svg viewBox="0 0 100 120" class="wc-fig"><circle cx="30" cy="48" r="20" fill="' + cl[1] + '"/><circle cx="70" cy="72" r="20" fill="' + cl[0] + '"/>' +
      '<circle cx="30" cy="44" r="8" fill="#e7c9a6"/><circle cx="70" cy="68" r="8" fill="#e7c9a6"/><text x="50" y="112" text-anchor="middle" font-size="11" font-weight="900" fill="#fff">1ST</text></svg>';
    return '<svg viewBox="0 0 100 120" class="wc-fig"><g transform="translate(50 58)">' + Array.from({ length: 12 }, function (_, i) { return '<path d="M0 0 L' + (Math.cos(i * Math.PI / 6) * 60).toFixed(1) + ' ' + (Math.sin(i * Math.PI / 6) * 60).toFixed(1) + ' L' + (Math.cos((i + .5) * Math.PI / 6) * 60).toFixed(1) + ' ' + (Math.sin((i + .5) * Math.PI / 6) * 60).toFixed(1) + ' z" fill="' + (i % 2 ? cl[0] : cl[1]) + '" opacity=".7"/>'; }).join('') +
      '<circle r="18" fill="#fff"/><path d="M-9 -2 l6 0 l3 -9 l3 9 l6 0 l-5 4 l2 8 l-6 -5 l-6 5 l2 -8 z" fill="' + cl[0] + '"/></g></svg>';
  }

  // Photos of the real cards stay on this device (IndexedDB), never in the synced league
  var phDB = null, PH = {};
  function store(mode, fn) {
    if (!phDB) phDB = new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no idb'));
      var r = indexedDB.open('waxpack_photos', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('ph'); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
    return phDB.then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction('ph', mode), q = fn(tx.objectStore('ph')); tx.oncomplete = function () { res(q && q.result); }; tx.onerror = function () { rej(tx.error); }; }); });
  }
  function photoPut(key, url) { PH[key] = url; return store('readwrite', function (st) { return st.put(url, key); }).catch(function () {}); }
  function photoGet(key) { if (!key) return Promise.resolve(null); if (PH[key]) return Promise.resolve(PH[key]); return store('readonly', function (st) { return st.get(key); }).then(function (u) { if (u) PH[key] = u; return u || null; }).catch(function () { return null; }); }
  function photoNow(key) { return key ? PH[key] || null : null; }

  var C = { SPECIAL: SPECIAL, FAMOUS_ERR: FAMOUS_ERR, famousErr: famousErr, SAMPLE: SAMPLE, colors: colors, era: era, el: el, photoPut: photoPut, photoGet: photoGet, photoNow: photoNow, esc: esc };
  root.WaxCards = C;
})(this);
