'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// Picture Mysteries: the case generator. Builds fresh, fair picture-mystery
// cases from a seed, in exactly the same shape as the hand-made cases in
// data/mysteries-cases.js, drawn by data/mysteries-scene.js.
//
//   MysteryGen.daily(day)            the daily case for day N (1 = 1 Jan 2024)
//   MysteryGen.endless(level, n)     the n-th "endless" case at a level
//   MysteryGen.make(tpl, level, seed, occ)   one case from one template
//   MysteryGen.byId(id)              'daily-1018' / 'endless-hard-7' -> case
//
// Every random choice uses integer maths on a seeded generator, so a day's case
// is the same on every device. Each case also carries `logic` (what the solver
// in scripts/mysteries-gen-check.js needs to prove there is exactly one answer)
// and `key` (its essential content, used to check that no case repeats).
//
// Templates: culprit (who did it, by clues left at the scene), oddone (one of a
// row of identical things is different), missing (before/after photos),
// tracks (follow one trail of prints to a gate), keys (match a key to its
// imprint), timeline (candles, ice, shadows), seating (find a place at the table
// from someone's habits), impostor (match a logo or a portrait).
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  var OL = '#2b2433';
  var FIRST_DAY = 1018; // the first generated daily (14 Oct 2026); earlier days used the hand-made bank

  // ── Seeded randomness ───────────────────────────────────────────────────
  function hstr(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function RNG(seed) {
    var a = seed >>> 0;
    function f() { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    var r = {
      f: f,
      int: function (lo, hi) { return lo + Math.floor(f() * (hi - lo + 1)); },
      pick: function (l) { return l[Math.floor(f() * l.length)]; },
      chance: function (p) { return f() < p; },
      shuffle: function (l) { l = l.slice(); for (var i = l.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)), t = l[i]; l[i] = l[j]; l[j] = t; } return l; },
      sample: function (l, k) { return r.shuffle(l).slice(0, k); }
    };
    return r;
  }

  // ── Words ───────────────────────────────────────────────────────────────
  var GIRLS = ['Ava', 'Bea', 'Cleo', 'Daisy', 'Edie', 'Faye', 'Gemma', 'Hana', 'Iris', 'Jade', 'Kira', 'Lena', 'Maya', 'Nell', 'Opal', 'Pia', 'Rosa', 'Sadie', 'Tess', 'Uma', 'Vera', 'Wren', 'Yara', 'Zoe', 'Amara', 'Bonnie', 'Coco', 'Dot', 'Elsie', 'Freya', 'Greta', 'Hazel', 'Ines', 'Juno', 'Kate', 'Lola', 'Mabel', 'Nina', 'Olive', 'Poppy', 'Ruby', 'Tilly', 'Violet', 'Willa', 'Esme', 'Leah', 'Asha', 'Mei', 'Noor', 'Priya', 'Ada', 'Isla', 'Lucy', 'Mia', 'Nora', 'Sofia'];
  var BOYS = ['Alfie', 'Ben', 'Cal', 'Dev', 'Eli', 'Finn', 'Gus', 'Hugo', 'Ivo', 'Jack', 'Kai', 'Leo', 'Max', 'Ned', 'Otto', 'Pete', 'Raj', 'Sam', 'Theo', 'Vic', 'Wes', 'Zack', 'Arlo', 'Bruno', 'Caleb', 'Dan', 'Ezra', 'Felix', 'George', 'Harry', 'Isaac', 'Jonah', 'Kit', 'Louis', 'Milo', 'Nico', 'Ollie', 'Remy', 'Sid', 'Toby', 'Will', 'Omar', 'Ravi', 'Kofi', 'Tariq', 'Jun', 'Luca', 'Rory', 'Joe', 'Ted'];
  var SUR = ['Ash', 'Baker', 'Bell', 'Brook', 'Cole', 'Dale', 'Ellis', 'Fox', 'Grant', 'Hale', 'Hart', 'Ives', 'Kemp', 'Lane', 'Marsh', 'Moss', 'Nash', 'Oakes', 'Park', 'Pike', 'Quill', 'Reed', 'Rowe', 'Shaw', 'Stone', 'Thorne', 'Vale', 'Wade', 'West', 'Young', 'Okafor', 'Patel', 'Singh', 'Chen', 'Kim', 'Lopez', 'Rossi', 'Novak', 'Silva', 'Ortiz', 'Ahmed', 'Nguyen', 'Haddad', 'Olsen', 'Ward', 'Fry', 'Gale', 'Penn'];
  function pron(gd) { return gd === 'f' ? { he: 'she', his: 'her', him: 'her', He: 'She', His: 'Her' } : { he: 'he', his: 'his', him: 'him', He: 'He', His: 'His' }; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function poss(n) { return n + '’s'; }
  function andList(l) { return l.length < 2 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1]; }
  function orList(l) { return l.length < 2 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' or ' + l[l.length - 1]; }
  var NUMW = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  function numw(k) { return NUMW[k] || String(k); }
  // fill {slots} in a phrase
  function fill(t, o) { return t.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  // a set of distinct names (gender per name), adults get a title + surname
  function names(r, genders, adult) {
    var used = {}, out = [];
    genders.forEach(function (gd) {
      var nm, key, guard = 0;
      do {
        var first = r.pick(gd === 'f' ? GIRLS : BOYS);
        nm = adult ? (gd === 'f' ? r.pick(['Mrs.', 'Ms.', 'Mrs.', 'Dr.']) : r.pick(['Mr.', 'Mr.', 'Dr.'])) + ' ' + r.pick(SUR) : first;
        key = adult ? nm.split(' ')[1] : nm;
      } while ((used[key] || used['#' + key.charAt(0)]) && ++guard < 200);
      used[key] = 1; used['#' + key.charAt(0)] = 1;
      out.push(nm);
    });
    return out;
  }

  // ── Colours (named, so the text can say them) ─────────────────────────────
  var CLOTH = { red: '#c0392b', blue: '#3a6ea5', green: '#3a8a4a', yellow: '#f2c230', purple: '#8a4aa0', orange: '#e8862a', pink: '#e0607a', teal: '#1a9a9a', white: '#f4f0e6', grey: '#8a909a', brown: '#8a5a34', navy: '#2b3a5a' };
  var CLOTH_MAIN = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'];
  var HAIRC = { black: '#1f1a1a', brown: '#6a4020', ginger: '#c0441a', blond: '#e8c060', grey: '#b0aca6' };
  var LEGC = ['#2b3a5a', '#3b4a6b', '#5a4a3a', '#2b2b33', '#7a3b4a', '#4a5a3a', '#6a6a76', '#8a6a4a'];
  function rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function cdist(a, b) { var x = rgb(a), y = rgb(b); return Math.sqrt((x[0] - y[0]) * (x[0] - y[0]) * 0.3 + (x[1] - y[1]) * (x[1] - y[1]) * 0.59 + (x[2] - y[2]) * (x[2] - y[2]) * 0.11) ; }
  var SKIN = ['#f6d4b4', '#eab48b', '#cf9465', '#a86b40', '#7a4a2b', '#f3c7a2'];
  var PAT_ADJ = { plain: 'plain', stripes: 'striped', dots: 'spotted', check: 'checked' };
  function patPc(col) { return col === 'yellow' || col === 'white' || col === 'pink' || col === 'orange' ? '#2b2433' : '#f4f0e6'; }

  // ── Small drawing helpers (raw SVG for scenery the kit has no item for) ──
  function sv(svg, o) { o = o || {}; return ['svg', { svg: svg, x: o.x, y: o.y, s: o.s, id: o.id, r: o.r }]; }
  function R1(v) { return Math.round(v * 10) / 10; }
  function bunting(x0, x1, y, cols) {
    var s = '<path d="M' + x0 + ' ' + y + ' Q' + R1((x0 + x1) / 2) + ' ' + (y + 16) + ' ' + x1 + ' ' + y + '" fill="none" stroke="#7a5a3a" stroke-width="1.3"/>', n = Math.floor((x1 - x0) / 30);
    for (var i = 0; i < n; i++) { var x = x0 + 15 + i * 30, t = (x - x0) / (x1 - x0), yy = y + 16 * 4 * t * (1 - t) * 0.5 + 2; s += '<path d="M' + R1(x - 6) + ' ' + R1(yy) + 'L' + R1(x + 6) + ' ' + R1(yy) + 'L' + R1(x) + ' ' + R1(yy + 12) + 'Z" fill="' + cols[i % cols.length] + '" stroke="#2b2433" stroke-width="1"/>'; }
    return s;
  }
  var FLAGS = ['#e0384a', '#3a8ad8', '#f2c230', '#3aa65a', '#9b59b6', '#ff8a3d'];

  // ═════════════════════════════════════════════════════════════════════════
  // People: random looks, and the kit's person item from them
  // ═════════════════════════════════════════════════════════════════════════
  var STYLE = { long: { len: 'long', curly: false }, longcurly: { len: 'long', curly: true }, pony: { len: 'long', curly: false }, short: { len: 'short', curly: false }, spiky: { len: 'short', curly: false }, curly: { len: 'short', curly: true }, side: { len: 'short', curly: false } };
  function styleFor(r, len, curly) { var l = Object.keys(STYLE).filter(function (k) { return STYLE[k].len === len && STYLE[k].curly === curly; }); return r.pick(l); }
  function look(r, gd, kid) {
    var top = r.pick(CLOTH_MAIN.concat(['white', 'navy', 'grey']));
    var P = {
      gd: gd, kid: kid, skin: r.int(0, 5), hcName: r.pick(kid ? ['black', 'brown', 'ginger', 'blond'] : ['black', 'brown', 'ginger', 'blond', 'grey']),
      hair: gd === 'f' ? r.pick(['long', 'longcurly', 'pony', 'bob', 'bun', 'braids', 'curly', 'short']) : r.pick(['short', 'spiky', 'side', 'curly', 'short', 'side'].concat(kid ? [] : ['bald'])),
      top: top, pat: r.pick(['plain', 'plain', 'stripes', 'dots', 'check']),
      legs: gd === 'f' ? r.pick(['skirt', 'dress', 'pants']) : (kid ? r.pick(['shorts', 'pants']) : 'pants'), lc: r.pick(LEGC),
      shoe: kid ? r.pick(['sneaker', 'sneaker', 'boot']) : (gd === 'f' ? r.pick(['heel', 'sneaker', 'boot']) : r.pick(['sneaker', 'boot'])), shoes: r.pick(['#2b2b33', '#7a3b2a', '#c0392b', '#3a6ea5', '#5a4a3a', '#f4f0e6']),
      glasses: r.chance(0.18) ? r.pick(['round', 'square']) : null, acc: [], marks: [], armL: 'down', armR: 'down', mouth: r.pick(['smile', 'smile', 'flat', 'o', 'smirk'])
    };
    if (P.hcName === 'grey' && kid) P.hcName = 'brown';
    if (!kid && r.chance(0.25)) P.acc.push(r.pick(['necklace:#e8c34a', 'scarf:' + CLOTH[r.pick(CLOTH_MAIN)], 'watch', gd === 'm' ? 'tie:' + CLOTH[r.pick(['red', 'blue', 'green', 'purple'])] : 'earrings:#e8c34a']));
    if (gd === 'm' && !kid && r.chance(0.2)) P.stache = 1;
    return P;
  }
  function personItem(P, id, x, y, s, name, extra) {
    var o = { id: id, x: x, y: y, s: s, kid: P.kid ? 1 : 0, skin: P.skin, hair: P.hair, hc: HAIRC[P.hcName], top: CLOTH[P.top] || P.top, legs: P.legs, lc: P.lc, shoe: P.shoe, shoes: P.shoes, glasses: P.glasses, acc: P.acc.slice(), marks: P.marks.slice(), armL: P.armL, armR: P.armR, mouth: P.mouth, name: name, eyes: P.eyes, stache: P.stache, sl: P.sl, holdL: P.holdL, holdR: P.holdR, hat: P.hat, hatc: P.hatc };
    if (P.pat && P.pat !== 'plain') { o.pat = P.pat; o.pc = P.pc || patPc(P.top); }
    if (P.legs === 'dress' && P.pat !== 'plain') { o.pat = P.pat; o.pc = P.pc || patPc(P.top); }
    if (P.coat) o.coat = P.coat;
    for (var k in (extra || {})) o[k] = extra[k];
    return ['person', o];
  }
  function hairLen(st) { return STYLE[st] ? STYLE[st].len : (st === 'bob' || st === 'bun' || st === 'braids' ? 'long' : st === 'bald' ? 'none' : 'short'); }
  function hairCurly(st) { return STYLE[st] ? STYLE[st].curly : false; }

  var T = {};

  // ═════════════════════════════════════════════════════════════════════════
  // CULPRIT: who did it, from the clues left at the scene
  // ═════════════════════════════════════════════════════════════════════════
  // Each setting: the photo of where it happened (an inset) with spots for each kind of clue,
  // the room behind the suspects, and what the thief would have got on them (the "mark").
  var CULPRIT_SETS = [
    { key: 'pie', adult: true, out: true, place: 'window', things: [['blueberry pie', '#6a3aa8', 'purple', 'blueberry'], ['cherry pie', '#d0103a', 'red', 'cherry'], ['blackberry pie', '#5a2a6a', 'purple', 'blackberry']],
      titles: ['The {Thing} Thief', 'The Vanishing {Thing}', 'Who Took the {Thing}?', 'The Windowsill Mystery'],
      setup: ['{Owner} left a {thing} cooling on the kitchen windowsill during {his} garden party. Ten minutes later it was gone.', 'At {poss} garden party, a fresh {thing} vanished from the kitchen windowsill while everyone was out on the lawn.', 'Someone reached in through {poss} kitchen window and took the {thing} cooling on the sill.'],
      who: ['{Nc} guests slipped away from the party for a few minutes.', 'Only {n} guests were near the house at the time.', '{Nc} guests say they never went near the kitchen.'],
      caption: 'The kitchen window', mark: 'juice' },
    { key: 'bakery', adult: true, out: false, place: 'door', things: [['tray of cinnamon buns', '', '', 'buns'], ['birthday cake', '', '', 'cake'], ['gingerbread house', '', '', 'gingerbread']],
      titles: ['Trouble at the Bakery', 'The Bakery Back Door', 'The Missing {Thing}', 'Flour Power'],
      setup: ['Early this morning, someone crept in by the back door of {poss} bakery and made off with a {thing}.', 'The {thing} in {poss} bakery was ready for collection. Now it’s gone, and the back door is open.', 'A {thing} disappeared from {poss} bakery while {he} was serving customers at the front.'],
      who: ['{Nc} people were seen near the back door.', '{Nc} customers were waiting in the shop at the time.', 'The baker has {n} suspects, all still in the shop.'],
      caption: 'The back door', mark: 'flour' },
    { key: 'museum', adult: true, out: false, place: 'plinth', things: [['golden egg', '', '', 'egg'], ['golden owl', '', '', 'owl'], ['golden crown', '', '', 'crown']],
      titles: ['The {Thing}', 'Night at the Museum', 'The Empty Plinth', 'Gone in a Flash'],
      setup: ['The museum’s famous {thing} was given a fresh coat of gold paint this morning. By lunchtime its plinth was empty.', 'Someone stepped over the rope and took the {thing} from its plinth at the town museum. Its gold paint was still wet.', 'The {thing} vanished from the museum while the guard had a cup of tea. The paint on it was still drying.'],
      who: ['{Nc} visitors were in the gallery at the time.', 'The guard stopped {n} visitors at the door.', '{Nc} people were in the room when it went missing.'],
      caption: 'The empty plinth', mark: 'gold' },
    { key: 'shed', adult: false, out: true, place: 'door', things: [['prize marrow', '', '', 'marrow'], ['bag of sweets', '', '', 'sweets'], ['football', '', '', 'football']],
      titles: ['Wet Paint!', 'The Shed Door', 'The Missing {Thing}', 'Fresh Paint, Fresh Clues'],
      setup: ['{Owner} painted {his} garden shed this morning. While the paint was drying, someone opened the shed and took the {thing}.', 'Someone sneaked into {poss} shed and took the {thing}, even though the door had a WET PAINT sign on it.', 'The {thing} was safe in {poss} shed this morning. Now it’s gone, and the freshly painted door has been opened.'],
      who: ['{Nc} kids were playing in the garden.', '{Nc} kids were in the garden all afternoon.', 'There were {n} kids in the garden, and they all say it wasn’t them.'],
      caption: 'The shed door', mark: 'paint' },
    { key: 'class', adult: false, out: false, place: 'cupboard', things: [['box of gold stars', '', '', 'stars'], ['class trophy', '', '', 'trophy'], ['hamster treats', '', '', 'treats']],
      titles: ['The Art Cupboard', 'Trouble in Class', 'The {Thing} Mystery', 'Paint on Your Hands'],
      setup: ['When {Owner} opened the art cupboard after break, the {thing} had gone. A pot of green paint inside had been knocked over.', 'Someone raided the art cupboard at break time and took the {thing}, knocking over a pot of green paint.', 'The {thing} was in the art cupboard before break. Now it’s missing, and there’s green paint everywhere.'],
      who: ['{Nc} pupils stayed inside at break.', '{Nc} children were in the classroom.', 'Only {n} pupils had the chance.'],
      caption: 'The art cupboard', mark: 'green' },
    { key: 'camp', adult: false, out: true, place: 'tent', things: [['bag of marshmallows', '', '', 'marshmallows'], ['chocolate bars', '', '', 'chocolate'], ['torch', '', '', 'torch']],
      titles: ['Midnight Snack', 'The Campsite Caper', 'Trouble at Camp', 'The {Thing} Raid'],
      setup: ['At summer camp, someone unzipped the leaders’ tent last night and took the {thing}. The chocolate stash inside was raided too.', 'The {thing} went missing from the supplies tent at camp. Somebody also helped themselves to the chocolate.', 'In the night, someone sneaked into the camp leaders’ tent, ate the chocolate and took the {thing}.'],
      who: ['{Nc} campers were awake after lights out.', '{Nc} campers share the nearest tents.', 'The leaders have {n} suspects.'],
      caption: 'The leaders’ tent', mark: 'choc' }
  ];
  // a stain the thief picked up: mk (person marks), part (to circle), on (what it sits on), what (words),
  // src (the clue in the photo), no/noS (a clean suspect: sentence / short), oth (a different stain), vp (the culprit has it)
  var MARKS = {
    juice: function (S, thing) { return { mk: 'paint:' + thing[1] + ':chest::1.9', part: 'paint', on: 'top', col: thing[1], what: thing[2] + ' ' + thing[3] + ' juice', src: 'Fresh ' + thing[3] + ' juice dripped down the wall under the sill. The thief would have some on them.', no: '{he} has no juice on {him}', noS: 'no juice', oth: '{his} stain is {col}, not ' + thing[2], vp: 'has ' + thing[3] + ' juice down {his} front' }; },
    flour: function () { return { mk: 'flour', part: 'flour', on: 'top', col: '#ffffff', what: 'flour', src: 'A sack of flour burst all over the floor. The thief would be covered in it.', no: '{he} has no flour on {him}', noS: 'no flour', vp: 'has flour down {his} front' }; },
    gold: function () { return { mk: 'paint:#d4a017:handL::1.7', part: 'paint', on: 'skinL', col: '#d4a017', what: 'gold paint', src: 'Flecks of wet gold paint are left on the plinth, so the thief has gold paint on their hands.', no: '{his} hands are clean', noS: 'clean hands', oth: '{his} hand has {col} paint on it, not gold', vp: 'has gold paint on {his} hand' }; },
    paint: function (S, thing, r) { var c = r.pick(['green', 'blue', 'red', 'yellow']); return { mk: 'paint:' + CLOTH[c] + ':elbowR:vstripes', part: 'paint', on: 'sleeveR', col: CLOTH[c], cname: c, what: c + ' paint', src: 'There’s a smudge in the wet ' + c + ' paint on the door, just at elbow height.', no: '{he} has no paint on {his} sleeves', noS: 'no paint', oth: '{his} paint is {col}, not ' + c, vp: 'has stripes of ' + c + ' paint on {his} elbow', door: CLOTH[c] }; },
    green: function () { return { mk: 'paint:#3aa65a:handR::1.7', part: 'paint', on: 'skinR', col: '#3aa65a', what: 'green paint', src: 'The pot of green paint was knocked over, so the thief got green paint on their hand.', no: '{his} hands are clean', noS: 'clean hands', oth: '{his} hand has {col} paint on it, not green', vp: 'has green paint on {his} hand' }; },
    choc: function () { return { mk: 'choc paint:#5a2d14:handR::1.7', part: 'paint', on: 'skinR', col: '#5a2d14', what: 'chocolate', src: 'An empty chocolate wrapper lies by the tent. The thief would have chocolate on them.', no: '{he} has no chocolate on {him}', noS: 'no chocolate', oth: '{he} has a milk moustache, not chocolate', othS: 'a milk moustache', vp: 'has chocolate on {his} face and fingers' }; }
  };

  T.culprit = function (r, level, occ) {
    var set = CULPRIT_SETS[(occ + hstr('culprit')) % CULPRIT_SETS.length];
    if (r.chance(0.35)) set = r.pick(CULPRIT_SETS);
    var thing = r.pick(set.things), adult = set.adult;
    var N = level === 'easy' ? 4 : level === 'medium' ? r.pick([4, 5]) : 5;
    var k = level === 'easy' ? 2 : level === 'medium' ? 3 : r.pick([3, 4]);
    var kinds = ['hair', 'fabric', 'glove', 'mark'].concat(adult ? ['shoe'] : []);
    var K = r.sample(kinds, k);
    if (level === 'easy' && K.indexOf('mark') < 0 && r.chance(0.6)) K[0] = 'mark';
    var M = MARKS[set.mark](set, thing, r);
    // the culprit
    var ansShoe = adult ? r.pick(['heel', 'flat', 'flat']) : 'flat';
    var A = { hairCol: r.pick(Object.keys(HAIRC).filter(function (c) { return adult || c !== 'grey'; })), hairLen: r.pick(['long', 'short']), hairCurly: r.chance(0.5),
      fabCol: r.pick(CLOTH_MAIN), fabPat: r.pick(['plain', 'stripes', 'dots', 'check']), shoe: ansShoe, glove: r.pick(['brown', 'black', 'red', 'green', 'blue', 'yellow']), gloveSide: r.pick(['L', 'R']), mark: 'yes' };
    if (level !== 'easy' && K.indexOf('fabric') >= 0 && A.fabPat === 'plain') A.fabPat = r.pick(['stripes', 'dots', 'check']);
    var GLOVEC = { brown: '#7a3b2a', black: '#2b2b33', red: '#c0392b', green: '#3a8a4a', blue: '#3a6ea5', yellow: '#e8b830' };
    // decoys: the first k each fail exactly one clue (so every clue is needed), the rest fail one or two
    var people = [{ ans: true, v: JSON.parse(JSON.stringify(A)), fails: [] }];
    for (var i = 0; i < N - 1; i++) {
      var fails = i < k ? [K[i]] : r.sample(K, Math.min(K.length, r.pick([1, 2])));
      people.push({ ans: false, v: JSON.parse(JSON.stringify(A)), fails: fails });
    }
    function otherCol(list, not) { return r.pick(list.filter(function (c) { return c !== not; })); }
    people.forEach(function (p) {
      p.fails.forEach(function (c) {
        var v = p.v;
        if (c === 'hair') {
          var mode = level === 'easy' ? 'col' : level === 'medium' ? r.pick(['col', 'len', 'col']) : r.pick(['len', 'curl', 'curl']);
          if (mode === 'col') v.hairCol = otherCol(Object.keys(HAIRC).filter(function (c2) { return adult || c2 !== 'grey'; }), A.hairCol);
          else if (mode === 'len') v.hairLen = A.hairLen === 'long' ? 'short' : 'long';
          else v.hairCurly = !A.hairCurly;
        } else if (c === 'fabric') {
          var fm = level === 'easy' ? 'col' : level === 'medium' ? r.pick(['col', 'pat']) : 'pat';
          if (fm === 'col') v.fabCol = otherCol(CLOTH_MAIN, A.fabCol); else v.fabPat = otherCol(['plain', 'stripes', 'dots', 'check'], A.fabPat);
        } else if (c === 'shoe') v.shoe = A.shoe === 'heel' ? 'flat' : 'heel';
        else if (c === 'glove') v.glove = level === 'easy' ? r.pick(['none', 'other']) : level === 'medium' ? r.pick(['other', 'pair']) : 'pair';
        else if (c === 'mark') v.mark = level === 'hard' && M.other ? r.pick(['none', 'other']) : 'none';
      });
    });
    // a decoy that differs only in a way the clue can't see would be a second answer: make sure none slipped through
    people = r.shuffle(people);
    var ids = people.map(function (p, i) { return 's' + (i + 1); });
    var gds = people.map(function (p) { return p.v.shoe === 'heel' ? 'f' : r.pick(['f', 'm']); });
    var nm = names(r, gds, adult);
    var ans = people.findIndex ? people.findIndex(function (p) { return p.ans; }) : people.map(function (p) { return p.ans; }).indexOf(true);
    // looks
    var P = people.map(function (p, i) {
      var L = look(r, gds[i], !adult), v = p.v;
      if (K.indexOf('hair') >= 0) { L.hcName = v.hairCol; L.hair = styleFor(r, v.hairLen, v.hairCurly); if (gds[i] === 'm' && L.hair === 'pony') L.hair = 'long'; }
      if (K.indexOf('fabric') >= 0) { L.top = v.fabCol; L.pat = v.fabPat; }
      else if (L.top === A.fabCol && r.chance(0.5)) L.top = otherCol(CLOTH_MAIN, A.fabCol);
      if (adult) L.shoe = v.shoe === 'heel' ? 'heel' : r.pick(['sneaker', 'boot']);
      if (L.shoe === 'heel' && gds[i] !== 'f') L.shoe = 'boot';
      if (L.legs === 'dress' && K.indexOf('fabric') < 0) L.legs = 'skirt';
      // gloves
      if (K.indexOf('glove') >= 0) {
        var gv = v.glove;
        var avoid = K.indexOf('mark') >= 0 ? (M.on === 'skinR' ? 'R' : M.on === 'skinL' ? 'L' : null) : null;
        var side = avoid ? (avoid === 'R' ? 'L' : 'R') : (gv === A.glove ? v.gloveSide : r.pick(['L', 'R']));
        if (gv === A.glove) L.marks.push('glove:' + side + ':' + GLOVEC[A.glove]);
        else if (gv === 'other') L.marks.push('glove:' + side + ':' + GLOVEC[otherCol(Object.keys(GLOVEC), A.glove)]);
        else if (gv === 'pair') L.marks.push('gloves:' + GLOVEC[A.glove]);
      }
      // the mark (stain) the culprit picked up
      if (K.indexOf('mark') >= 0) {
        if (v.mark === 'yes') L.marks = L.marks.concat(M.mk.split(' '));
        else if (v.mark === 'other') {
          if (set.mark === 'choc') L.marks.push('milk');
          else { var oc = r.pick(['#3a8ad8', '#e8862a', '#3aa65a', '#c0392b'].filter(function (c) { return cdist(c, M.col) > 120; })); L.marks = L.marks.concat(M.mk.replace(M.col, oc).split(' ')); v.markCol = oc; }
        }
      }
      // keep stains readable against what they sit on
      if (K.indexOf('mark') >= 0 && M.on === 'top') { var tries = 0; while ((cdist(CLOTH[L.top], M.col) < 110 || (set.mark === 'flour' && ['white', 'yellow', 'pink', 'orange'].indexOf(L.top) >= 0)) && tries++ < 20) { if (K.indexOf('fabric') >= 0) break; L.top = r.pick(CLOTH_MAIN); } }
      if (K.indexOf('mark') >= 0 && M.on === 'sleeveR') { L.sl = null; var t2 = 0; while (cdist(CLOTH[L.top], M.col) < 110 && t2++ < 20 && K.indexOf('fabric') < 0) L.top = r.pick(CLOTH_MAIN.concat(['white', 'navy'])); }
      if (K.indexOf('mark') >= 0 && (M.on === 'skinL' || M.on === 'skinR')) { var t3 = 0; while (cdist(SKIN[L.skin], M.col) < 70 && t3++ < 20) L.skin = r.int(0, 5); }
      // a few props for colour
      var hp = r.pick([null, null, 'cup', 'book', 'phone', 'balloon', 'bag']);
      if (hp && K.indexOf('glove') < 0 && K.indexOf('mark') < 0) { if (r.chance(0.5)) { L.armR = 'hold'; L.holdR = hp; } else { L.armL = 'hold'; L.holdL = hp; } }
      L.v = v;
      return L;
    });
    // glove sides recorded after the swap above
    P.forEach(function (L, i) { var g = L.marks.filter(function (m) { return /^glove:/.test(m); })[0]; if (g) L.gloveSide = g.split(':')[1]; });
    // ── the picture ──
    var W = 400, H = 340, items = [], gy = 206;
    var bg = set.out ? ['outside', { groundY: gy, ground: set.key === 'camp' ? '#6a9a4a' : '#79b85a', sky: set.key === 'camp' ? '#f2b48a' : '#9fd3f2', sky2: set.key === 'camp' ? '#fde2c0' : '#dff1fb', hills: set.key === 'camp' ? '#5a8a5a' : '#9fcf7a' }]
      : ['room', { wall: set.key === 'museum' ? '#d9cdb5' : set.key === 'bakery' ? '#f3e2c4' : '#e6efe6', paper: set.key === 'museum' ? 'diamonds' : set.key === 'bakery' ? 'tiles' : null, floorY: gy, floor: set.key === 'museum' ? '#8a6a4a' : set.key === 'bakery' ? '#c9a77a' : '#b88a5e', floorKind: set.key === 'bakery' ? 'tile' : null, rail: set.key === 'museum' ? 120 : null }];
    items = backdrop(set, r);
    // the inset photo of the scene, with the clues
    var inset = insetScene(set, K, A, M, GLOVEC, r);
    items.push(['photo', { x: 12, y: 10, w: 160, h: 140, caption: set.caption, r: -1.2, bg: inset.bg, items: inset.items }]);
    // the suspects
    var sc = adult ? (N === 5 ? 0.9 : 0.95) : (N === 5 ? 1.08 : 1.12), x0 = N === 5 ? 46 : 58, dx = N === 5 ? 77 : 95;
    P.forEach(function (L, i) { items.push(personItem(L, ids[i], x0 + i * dx, 316 - (i % 2) * 4, sc, nm[i], { tagY: 12 })); });
    // ── words ──
    var taken = nm.join(' '), sur;
    do { sur = r.pick(SUR); } while (taken.indexOf(sur) >= 0);
    var owner = r.pick(['Mrs.', 'Mr.', 'Ms.']) + ' ' + sur;
    var ownerG = owner.indexOf('Mr.') === 0 ? 'm' : 'f', op = pron(ownerG);
    var o = { Owner: owner, poss: poss(owner), his: op.his, thing: thing[0], Thing: thing[0].split(' ').map(cap).join(' ').replace('Of', 'of'), Nc: cap(numw(N)), n: numw(N) };
    var title = fill(r.pick(set.titles), o);
    if (title.length > 26) title = fill(set.titles[set.titles.length - 1], o);
    var setup = fill(r.pick(set.setup), o) + ' ' + fill(r.pick(set.who), o) + (level === 'easy' ? ' The thief left ' + numw(k) + ' clues behind.' : '');
    var q = r.pick(['Who took the ' + thing[0] + '?', 'Who is the thief?', 'Who took it?']);
    if (set.key === 'camp') q = r.pick(['Who raided the tent?', 'Who took the ' + thing[0] + '?']);
    // describe each clue, and who it rules out (in order)
    var ev = { hair: 'ev-hair', fabric: 'ev-scrap', glove: 'ev-glove', mark: 'ev-mark', shoe: 'ev-print' };
    function clueText(c) {
      if (c === 'hair') return cap(r.pick(['a', 'one']) === 'a' ? 'A' : 'One') + ' ' + (A.hairLen === 'long' ? 'long' : 'short') + ', ' + (A.hairCurly ? 'curly' : 'straight') + ' ' + A.hairCol + ' hair is caught on the ' + inset.where.hair + '.';
      if (c === 'fabric') return 'A scrap of ' + (A.fabPat === 'plain' ? 'plain ' + A.fabCol : A.fabCol + ' ' + PAT_ADJ[A.fabPat]) + ' cloth is snagged on the ' + inset.where.fabric + '.';
      if (c === 'glove') return 'The thief dropped one ' + A.glove + ' glove, so they must still be wearing the other one.';
      if (c === 'shoe') return A.shoe === 'heel' ? 'The print ' + inset.where.shoe + ' was made by a high heel.' : 'The print ' + inset.where.shoe + ' is from a flat shoe: there’s no heel mark.';
      return M.src;
    }
    // why a suspect is ruled out: [short (for brackets), sentence (with he/she)]
    function why(c, L) {
      var v = L.v, pr = pron(L.gd), t = { he: pr.he, his: pr.his, him: pr.him }, tw = L.legs === 'dress' ? 'dress' : 'shirt';
      if (c === 'hair') return v.hairCol !== A.hairCol ? [v.hairCol + ' hair', pr.his + ' hair is ' + v.hairCol] : v.hairLen !== A.hairLen ? [v.hairLen + ' hair', pr.his + ' hair is ' + v.hairLen] : [(v.hairCurly ? 'curly' : 'straight') + ' hair', pr.his + ' hair is ' + (v.hairCurly ? 'curly' : 'straight')];
      if (c === 'fabric') return v.fabCol !== A.fabCol ? ['a ' + v.fabCol + ' ' + tw, pr.his + ' ' + tw + ' is ' + v.fabCol] : ['a ' + PAT_ADJ[v.fabPat] + ' ' + tw, pr.his + ' ' + v.fabCol + ' ' + tw + ' is ' + PAT_ADJ[v.fabPat] + (A.fabPat === 'plain' ? '' : ', not ' + PAT_ADJ[A.fabPat])];
      if (c === 'shoe') return v.shoe === 'heel' ? ['high heels', pr.he + ' is wearing high heels'] : ['flat ' + (L.shoe === 'boot' ? 'boots' : 'sneakers'), pr.he + ' is in flat ' + (L.shoe === 'boot' ? 'boots' : 'sneakers')];
      if (c === 'glove') { var gc = Object.keys(GLOVEC).filter(function (gk) { return L.marks.some(function (m) { return m.indexOf(GLOVEC[gk]) >= 0; }); })[0] || 'different'; return v.glove === 'pair' ? ['both gloves on', pr.he + ' still has both gloves on'] : v.glove === 'other' ? ['a ' + gc + ' glove', pr.his + ' glove is ' + gc] : ['no gloves', pr.he + ' isn’t wearing gloves']; }
      if (v.mark === 'other') { var oc = set.mark === 'choc' ? '' : colName(v.markCol); return [M.othS || oc + ' paint', fill(M.oth, Object.assign(t, { col: oc }))]; }
      return [M.noS, fill(M.no, t)];
    }
    function outText(list) {
      if (list.length === 1) {
        var i = list[0], w = why(K0, P[i]);
        return r.pick(['That rules out ' + nm[i] + ' (' + w[0] + ').', 'So it can’t be ' + nm[i] + ': ' + w[1] + '.', nm[i] + ' is in the clear: ' + w[1] + '.']);
      }
      var ws = list.map(function (i) { return why(K0, P[i])[0]; });
      if (ws.every(function (w) { return w === ws[0]; })) return r.pick(['That rules out both ', 'That clears both ']).replace('both', list.length > 2 ? 'all of' : 'both') + andList(list.map(function (i) { return nm[i]; })) + ' (' + ws[0] + ').';
      return r.pick(['That rules out ', 'That clears ']) + andList(list.map(function (i, j) { return nm[i] + ' (' + ws[j] + ')'; })) + '.';
    }
    var K0 = null;
    function part(c, i) { var L = P[i]; return c === 'hair' ? { p: ids[i] + '.head', pad: 1 } : c === 'fabric' ? { p: ids[i] + '.body' } : c === 'shoe' ? { p: ids[i] + '.shoes', pad: 2 } : c === 'glove' ? { p: ids[i] + '.hand' + (L.gloveSide || 'L'), pad: 3 } : { p: ids[i] + '.' + M.part, pad: 3 }; }
    var alive = P.map(function () { return true; }), steps = [];
    K.forEach(function (c) {
      var out = [];
      P.forEach(function (L, i) { if (alive[i] && people[i].fails.indexOf(c) >= 0) { out.push(i); alive[i] = false; } });
      var t = clueText(c); K0 = c;
      if (out.length) t += ' ' + outText(out);
      steps.push({ text: t, marks: [{ id: ev[c], pad: 2 }] });
    });
    var L0 = P[ans], pr0 = pron(L0.gd);
    var fits = K.map(function (c) {
      if (c === 'hair') return 'has ' + A.hairLen + ', ' + (A.hairCurly ? 'curly' : 'straight') + ' ' + A.hairCol + ' hair';
      if (c === 'fabric') return 'wears a ' + (A.fabPat === 'plain' ? 'plain' : PAT_ADJ[A.fabPat]) + ' ' + A.fabCol + ' ' + (L0.legs === 'dress' ? 'dress' : 'shirt');
      if (c === 'shoe') return A.shoe === 'heel' ? 'is in high heels' : 'is in flat ' + (L0.shoe === 'boot' ? 'boots' : 'sneakers');
      if (c === 'glove') return 'still has the other ' + A.glove + ' glove on';
      return fill(M.vp, { his: pr0.his });
    });
    steps.push({ text: 'Only ' + nm[ans] + ' fits every clue: ' + pr0.he + ' ' + andList(fits) + '.', marks: K.map(function (c) { return part(c, ans); }) });
    var subtle = K.filter(function (c) { return people.some(function (p) { var v = p.v; return p.fails.length === 1 && p.fails[0] === c && ((c === 'hair' && v.hairCol === A.hairCol) || (c === 'fabric' && v.fabCol === A.fabCol) || (c === 'glove' && v.glove === 'pair') || (c === 'mark' && v.mark === 'other')); }); });
    var hard1 = subtle.length ? r.pick(subtle) : K[K.length - 1];
    var hints = [
      { text: level === 'easy' ? 'Check the ' + numw(k) + ' clues in the photo against everyone in the line-up.' : r.pick(['There are ' + numw(k) + ' clues in the photo. Each one rules somebody out.', 'Find all ' + numw(k) + ' clues in the photo, then use them one at a time to cross people off.']) },
      { text: { hair: 'Look closely at the hair: its colour, its length and whether it’s curly all matter.', fabric: 'Match the scrap of cloth exactly: the colour and the pattern.', glove: 'One glove was dropped. Who is wearing just one glove, in that colour?', mark: 'The thief would have ' + M.what + ' on them. Check everyone carefully.', shoe: 'Is the print from a high heel or a flat shoe? Then check everyone’s feet.' }[hard1], at: { id: ev[hard1], pad: 8 } }
    ];
    var verdict = nm[ans] + ' ' + (set.key === 'camp' ? 'raided the tent.' : 'took the ' + thing[0] + '.');
    // essential content: the clue values and every suspect's clue-relevant looks, in order
    var key = 'culprit|' + set.key + '|' + thing[3] + '|' + K.join(',') + '|' + JSON.stringify(A) + '|' + P.map(function (L) { return [L.hcName, hairLen(L.hair), hairCurly(L.hair), L.top, L.pat, L.shoe, L.marks.join('+')].join('/'); }).join(';') + '|' + ans;
    return {
      type: 'Who did it', title: title, setup: setup, q: q, size: [W, H], tap: true,
      choices: ids.map(function (id, i) { return { id: id, label: nm[i] }; }), answer: ids[ans],
      scene: { bg: bg, items: items }, hints: hints, solution: { steps: steps, verdict: verdict }, key: key,
      logic: { tpl: 'culprit', clues: K, culprit: A, glovec: GLOVEC, mark: M.mk, adult: adult }
    };
  };
  function colName(hex) { for (var k in CLOTH) if (CLOTH[k] === hex) return k; return { '#3a8ad8': 'blue', '#e8862a': 'orange', '#3aa65a': 'green', '#c0392b': 'red' }[hex] || 'a different colour'; }

  // the room behind the line-up
  function backdrop(set, r) {
    var it = [];
    if (set.key === 'pie') {
      it.push(sv(bunting(184, 400, 18, r.shuffle(FLAGS))), ['tree', { x: 380, y: 206, size: 0.8 }], ['table', { x: 214, y: 206, w: 120, h: 44, cloth: '#fbf6e6', clothPat: 'check', clothPc: '#e0607a' }], ['cake', { x: 244, y: 158, color: '#f6b3c8', candles: 3 }], ['cup', { x: 290, y: 160, color: '#3a8ad8' }], ['cup', { x: 312, y: 160, color: '#f2c230' }], ['cloud', { x: 300, y: 70, s: 0.9 }]);
    } else if (set.key === 'bakery') {
      it.push(['sign', { x: 236, y: 46, w: 110, h: 26, text: 'BAKERY', size: 15, post: false, color: '#7a3b2a', ink: '#fbf6e6' }]);
      var loaves = '';
      [[200, 96], [232, 96], [264, 96], [300, 96], [336, 96], [372, 96]].forEach(function (q, i) { loaves += i % 2 ? '<ellipse cx="' + q[0] + '" cy="' + (q[1] - 7) + '" rx="13" ry="8" fill="#d9a35a" stroke="#2b2433" stroke-width="1.1"/><path d="M' + (q[0] - 7) + ' ' + (q[1] - 11) + 'l4 6M' + (q[0] - 1) + ' ' + (q[1] - 12) + 'l4 6M' + (q[0] + 5) + ' ' + (q[1] - 11) + 'l3 5" stroke="#a8722a" stroke-width="1.2"/>' : '<path d="M' + (q[0] - 12) + ' ' + q[1] + 'Q' + (q[0] - 12) + ' ' + (q[1] - 18) + ' ' + q[0] + ' ' + (q[1] - 18) + 'Q' + (q[0] + 12) + ' ' + (q[1] - 18) + ' ' + (q[0] + 12) + ' ' + q[1] + 'Z" fill="#c98a3a" stroke="#2b2433" stroke-width="1.1"/>'; });
      it.push(['shelf', { x: 184, y: 96, w: 210, color: '#8a5a34' }], sv(loaves), ['counter', { x: 186, y: 206, w: 214, h: 70, color: '#c9a77a', top: '#f4efe4' }], ['cake', { x: 250, y: 130, color: '#fbf6e6', candles: 0 }], ['pie', { x: 330, y: 134, filling: '#d0103a' }]);
    } else if (set.key === 'museum') {
      it.push(['frame', { x: 196, y: 30, w: 54, h: 44, art: 'mountain' }], ['frame', { x: 270, y: 22, w: 46, h: 58, color: '#8a6a2a', bg: '#3a4a6a', items: [['person', { x: 23, y: 120, s: 0.75, hair: 'bun', hc: '#3a2414', top: '#7a2e3a', blush: false }]] }], ['frame', { x: 336, y: 34, w: 50, h: 38, art: 'boat' }]);
      it.push(sv('<rect x="190" y="120" width="210" height="4" fill="#b8a888"/>'), ['svg', { svg: '<path d="M200 206V150M392 206V150" stroke="#2b2433" stroke-width="7"/><path d="M200 206V150M392 206V150" stroke="#c9a227" stroke-width="5"/><path d="M200 156Q296 186 392 156" fill="none" stroke="#2b2433" stroke-width="5"/><path d="M200 156Q296 186 392 156" fill="none" stroke="#b0273a" stroke-width="3"/>' }], ['bench', { x: 254, y: 206, w: 84, color: '#6a4126' }]);
    } else if (set.key === 'shed') {
      it.push(['house', { x: 250, y: 206, w: 120, h: 84, color: '#e8d7b5', roof: '#6a4a8a' }], ['tree', { x: 206, y: 206, size: 0.85 }], ['fence', { x: 180, y: 216, w: 220, h: 44, color: '#f4efe4' }], ['cloud', { x: 330, y: 40, s: 0.9 }], ['sun', { x: 380, y: 30, r: 11 }]);
    } else if (set.key === 'class') {
      it.push(['svg', { svg: '<rect x="200" y="26" width="176" height="96" rx="3" fill="#8a5a34" stroke="#2b2433" stroke-width="1.2"/><rect x="206" y="32" width="164" height="84" fill="#2f5a46" stroke="#2b2433" stroke-width="1"/><rect x="216" y="118" width="144" height="5" fill="#8a5a34" stroke="#2b2433" stroke-width="1"/><rect x="226" y="114" width="10" height="4" fill="#fbfbff"/>' }],
        ['caption', { x: 288, y: 62, text: r.pick(['Art day!', 'Paint a rainbow', 'Spelling test Friday', '3 + 4 = 7']), size: 15, fill: '#f4f4ec' }], ['caption', { x: 288, y: 90, text: r.pick(['Be kind', 'Well done, class!', 'Tidy up time']), size: 12, fill: '#e8e8de' }],
        sv(bunting(184, 400, 6, r.shuffle(FLAGS))), ['globe', { x: 220, y: 206, s: 0.9 }], ['table', { x: 250, y: 206, w: 120, h: 40, color: '#c98a3a' }], ['books', { x: 300, y: 160, colors: ['#3a6ea5', '#e0b351', '#b0413e'] }]);
    } else if (set.key === 'camp') {
      var tent = function (x, c) { return '<path d="M' + (x - 40) + ' 206L' + x + ' 140L' + (x + 40) + ' 206Z" fill="' + c + '" stroke="#2b2433" stroke-width="1.3"/><path d="M' + x + ' 140L' + (x - 8) + ' 206H' + (x + 8) + 'Z" fill="#2b2433" opacity=".5"/>'; };
      it.push(['tree', { x: 196, y: 206, size: 0.9, kind: 'pine', color: '#3f7a4a' }], ['tree', { x: 388, y: 206, size: 1, kind: 'pine', color: '#3a6a44' }], sv(tent(262, '#e8862a') + tent(338, '#3a8a7a')));
    }
    return it;
  }
  // the photo of where it happened: background + one item per clue (ids ev-*)
  function insetScene(set, K, A, M, GLOVEC, r) {
    var it = [], where = {}, w = 160, h = 140, bgc = '#e8d0b0', ground = '#7a5a3a';
    if (set.place === 'window') {
      it.push(sv('<rect width="160" height="140" fill="#d8b890"/><rect x="18" y="6" width="112" height="74" fill="#f4efe4" stroke="#2b2433" stroke-width="1.4"/><rect x="25" y="13" width="98" height="60" fill="#bfe0f2" stroke="#2b2433" stroke-width="1.2"/><path d="M74 13v60M25 43h98" stroke="#f4efe4" stroke-width="4"/><path d="M10 80h128l-5 9H15z" fill="#f4efe4" stroke="#2b2433" stroke-width="1.3"/><rect x="0" y="112" width="160" height="28" fill="#6a4a2e"/><path d="M0 112h160" stroke="#2b2433" stroke-width="1"/><path d="M6 118q10 -3 18 0M118 132q8 -3 16 0" stroke="#4f3520" stroke-width="1.2" fill="none"/><rect x="68" y="38" width="12" height="9" rx="1.5" fill="#c9a227" stroke="#2b2433" stroke-width="1"/><path d="M80 41h8" stroke="#2b2433" stroke-width="2"/>'));
      where = { hair: 'window latch', fabric: 'nail on the window frame', shoe: 'in the mud under the window' };
      if (K.indexOf('hair') >= 0) it.push(['strand', { id: 'ev-hair', x: 86, y: 44, color: HAIRC[A.hairCol], len: A.hairLen, curly: A.hairCurly }]);
      if (K.indexOf('fabric') >= 0) it.push(sv('<circle cx="14" cy="30" r="1.6" fill="#7a828c" stroke="#2b2433" stroke-width=".6"/>'), ['scrap', { id: 'ev-scrap', x: 14, y: 42, color: CLOTH[A.fabCol], pat: A.fabPat === 'plain' ? null : A.fabPat, pc: patPc(A.fabCol), r: 12 }]);
      if (K.indexOf('shoe') >= 0) it.push(['print', { id: 'ev-print', x: 52, y: 126, r: 82, kind: A.shoe === 'heel' ? 'heel' : 'shoe', tread: 'zigzag', size: 24, col: '#2e1c10' }]);
      if (K.indexOf('glove') >= 0) it.push(['glove1', { id: 'ev-glove', x: 128, y: 127, color: GLOVEC[A.glove], r: -72 }]);
      if (K.indexOf('mark') >= 0) it.push(['svg', { id: 'ev-mark', svg: '<path d="M104 89q-2 8 0 14M110 89q1 5 -1 9M116 89q-1 10 1 16" stroke="' + M.col + '" stroke-width="2.6" fill="none" stroke-linecap="round"/><ellipse cx="110" cy="89" rx="10" ry="1.8" fill="' + M.col + '"/>' }]);
      return { bg: ['plain', { color: bgc }], items: it, where: where };
    }
    if (set.place === 'door' || set.place === 'cupboard') {
      var cup = set.place === 'cupboard', dc = set.key === 'shed' ? M.door || '#3a8a4a' : cup ? '#c98a3a' : '#5a7a9a';
      var floor = set.key === 'bakery' ? '#7a6a5a' : set.key === 'shed' ? '#6a4a2e' : '#b88a5e';
      it.push(sv('<rect width="160" height="140" fill="' + (set.key === 'shed' ? '#9fd3f2' : set.key === 'bakery' ? '#f3e2c4' : '#e6efe6') + '"/><rect x="0" y="112" width="160" height="28" fill="' + floor + '"/><path d="M0 112h160" stroke="#2b2433" stroke-width="1"/>' +
        (cup ? '<rect x="30" y="8" width="96" height="104" fill="#8a5a34" stroke="#2b2433" stroke-width="1.3"/><rect x="36" y="14" width="84" height="96" fill="#5a3a22"/><path d="M36 50h84M36 82h84" stroke="#8a5a34" stroke-width="3"/><path d="M78 14L102 20V104L78 110Z" fill="' + dc + '" stroke="#2b2433" stroke-width="1.2"/><rect x="40" y="36" width="12" height="14" fill="#e0b351" stroke="#2b2433" stroke-width=".8"/><rect x="56" y="38" width="10" height="12" fill="#3a6ea5" stroke="#2b2433" stroke-width=".8"/><rect x="96" y="56" width="5" height="10" rx="2" fill="#c9a227" stroke="#2b2433" stroke-width=".8"/>'
          : '<rect x="34" y="6" width="74" height="106" fill="' + (set.key === 'shed' ? '#8a5a34' : '#d9c9a8') + '" stroke="#2b2433" stroke-width="1.3"/><rect x="40" y="12" width="62" height="100" fill="' + dc + '" stroke="#2b2433" stroke-width="1.2"/><rect x="47" y="20" width="48" height="34" fill="none" stroke="#2b2433" stroke-width=".9" opacity=".5"/><rect x="47" y="62" width="48" height="40" fill="none" stroke="#2b2433" stroke-width=".9" opacity=".5"/><circle cx="94" cy="64" r="2.6" fill="#e8c34a" stroke="#2b2433" stroke-width=".8"/><path d="M128 34v6" stroke="#2b2433" stroke-width="1.4"/><path d="M128 40q0 5 4 5" fill="none" stroke="#7a828c" stroke-width="2"/>') +
        (set.key === 'shed' ? '<path d="M136 92v22" stroke="#2b2433" stroke-width="3.6"/><path d="M136 92v22" stroke="#8a5a34" stroke-width="2"/><rect x="116" y="74" width="40" height="20" rx="2" fill="#fbf6e6" stroke="#2b2433" stroke-width="1"/><text x="136" y="82" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="7" fill="#b02a2a">WET</text><text x="136" y="90" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="7" fill="#b02a2a">PAINT</text>' : '')));
      where = cup ? { hair: 'cupboard handle', fabric: 'cupboard hinge', shoe: 'on the floor' } : { hair: 'coat hook', fabric: 'nail on the door frame', shoe: set.key === 'bakery' ? 'in the spilt flour' : 'in the mud by the door' };
      if (K.indexOf('hair') >= 0) it.push(['strand', { id: 'ev-hair', x: cup ? 98 : 131, y: cup ? 64 : 44, color: HAIRC[A.hairCol], len: A.hairLen, curly: A.hairCurly }]);
      if (K.indexOf('fabric') >= 0) it.push(cup ? ['scrap', { id: 'ev-scrap', x: 116, y: 28, color: CLOTH[A.fabCol], pat: A.fabPat === 'plain' ? null : A.fabPat, pc: patPc(A.fabCol), r: -14 }] : ['scrap', { id: 'ev-scrap', x: 22, y: 60, color: CLOTH[A.fabCol], pat: A.fabPat === 'plain' ? null : A.fabPat, pc: patPc(A.fabCol), r: 16 }]);
      if (set.key === 'bakery') it.push(sv('<path d="M96 140Q92 124 112 118Q140 112 160 118V140Z" fill="#fbfaf5" stroke="#d8d0c0" stroke-width="1"/><path d="M134 116l8 -10 14 2 4 10z" fill="#e8dcc0" stroke="#2b2433" stroke-width="1"/><text x="148" y="114" font-family="sans-serif" font-size="4.5" text-anchor="middle" fill="#7a5a3a">FLOUR</text>'));
      if (K.indexOf('shoe') >= 0) it.push(['print', { id: 'ev-print', x: set.key === 'bakery' ? 126 : 70, y: 127, r: 80, kind: A.shoe === 'heel' ? 'heel' : 'shoe', tread: 'zigzag', size: 24, col: set.key === 'bakery' ? '#6a5a4a' : '#3a2414' }]);
      if (K.indexOf('glove') >= 0) it.push(['glove1', { id: 'ev-glove', x: 18, y: 126, color: GLOVEC[A.glove], r: 70 }]);
      if (K.indexOf('mark') >= 0) {
        if (set.key === 'bakery') it.push(['svg', { id: 'ev-mark', svg: '<path d="M100 124q8 -6 18 -2q6 4 -2 8q-8 4 -16 -6z" fill="#fff" stroke="#c9c2b0" stroke-width=".8"/><circle cx="96" cy="118" r="2.2" fill="#fff" stroke="#c9c2b0" stroke-width=".6"/>' }]);
        else if (set.key === 'shed') it.push(['svg', { id: 'ev-mark', svg: '<path d="M52 70q12 -7 24 -1q4 8 -3 13q-11 5 -19 -1q-5 -5 -2 -11z" fill="#000" opacity=".12"/><path d="M57 70v14M63 69v16M69 70v14" stroke="#b08a5a" stroke-width="2.6" stroke-linecap="round"/>' }]);
        else it.push(['svg', { id: 'ev-mark', svg: '<path d="M70 132q-10 -2 -8 -8q6 -6 16 -2q6 4 0 9z" fill="' + M.col + '" stroke="#2b2433" stroke-width=".8"/><rect x="72" y="118" width="10" height="11" rx="1" fill="#fbfaf5" stroke="#2b2433" stroke-width="1" transform="rotate(60 77 123)"/><path d="M84 112q4 0 6 4 3 4 0 6-3 2-5 -2" fill="' + M.col + '" stroke="#2b2433" stroke-width=".8"/>' }]);
      }
      return { bg: ['plain', { color: bgc }], items: it, where: where };
    }
    if (set.place === 'plinth') {
      it.push(sv('<rect width="160" height="140" fill="#d9cdb5"/><rect x="0" y="112" width="160" height="28" fill="#8a6a4a"/><path d="M0 112h160" stroke="#2b2433" stroke-width="1"/><rect x="52" y="44" width="56" height="68" fill="#efe8da" stroke="#2b2433" stroke-width="1.3"/><rect x="46" y="36" width="68" height="10" fill="#f8f2e6" stroke="#2b2433" stroke-width="1.2"/><rect x="62" y="64" width="36" height="12" rx="1" fill="#e8c34a" stroke="#2b2433" stroke-width=".8"/><path d="M14 112V62M146 112V62" stroke="#2b2433" stroke-width="5"/><path d="M14 112V62M146 112V62" stroke="#c9a227" stroke-width="3"/><path d="M14 66Q30 84 50 78" fill="none" stroke="#2b2433" stroke-width="4"/><path d="M14 66Q30 84 50 78" fill="none" stroke="#b0273a" stroke-width="2.4"/><circle cx="14" cy="61" r="3.4" fill="#c9a227" stroke="#2b2433" stroke-width="1"/><circle cx="146" cy="61" r="3.4" fill="#c9a227" stroke="#2b2433" stroke-width="1"/>'));
      where = { hair: 'rope post', fabric: 'corner of the plinth', shoe: 'on the polished floor' };
      if (K.indexOf('hair') >= 0) it.push(['strand', { id: 'ev-hair', x: 146, y: 64, color: HAIRC[A.hairCol], len: A.hairLen, curly: A.hairCurly }]);
      if (K.indexOf('fabric') >= 0) it.push(['scrap', { id: 'ev-scrap', x: 112, y: 52, color: CLOTH[A.fabCol], pat: A.fabPat === 'plain' ? null : A.fabPat, pc: patPc(A.fabCol), r: 20 }]);
      if (K.indexOf('shoe') >= 0) it.push(['print', { id: 'ev-print', x: 34, y: 126, r: 80, kind: A.shoe === 'heel' ? 'heel' : 'shoe', tread: 'zigzag', size: 24, col: '#4a3424' }]);
      if (K.indexOf('glove') >= 0) it.push(['glove1', { id: 'ev-glove', x: 128, y: 126, color: GLOVEC[A.glove], r: -64 }]);
      if (K.indexOf('mark') >= 0) it.push(['svg', { id: 'ev-mark', svg: '<g fill="' + M.col + '" stroke="#7a5a10" stroke-width=".5"><circle cx="66" cy="40" r="2.2"/><circle cx="74" cy="38.6" r="1.6"/><circle cx="90" cy="40.4" r="2.4"/><circle cx="98" cy="39" r="1.5"/><path d="M80 37q4 -2 6 1q-2 3 -6 -1z"/></g>' }]);
      return { bg: ['plain', { color: bgc }], items: it, where: where };
    }
    // tent
    it.push(sv('<rect width="160" height="140" fill="#f2c49a"/><rect x="0" y="100" width="160" height="40" fill="#6a9a4a"/><path d="M8 116L80 14L152 116Z" fill="#e8862a" stroke="#2b2433" stroke-width="1.4"/><path d="M80 14L60 116H100Z" fill="#b8641a" stroke="#2b2433" stroke-width="1.2"/><path d="M80 18V116" stroke="#2b2433" stroke-width="1" stroke-dasharray="2 2"/><rect x="77" y="46" width="6" height="9" rx="1.5" fill="#9aa3ad" stroke="#2b2433" stroke-width=".8"/><path d="M150 116l8 8M10 116l-6 8" stroke="#7a828c" stroke-width="2"/>'));
    where = { hair: 'tent zip', fabric: 'tent peg', shoe: 'in the mud' };
    if (K.indexOf('hair') >= 0) it.push(['strand', { id: 'ev-hair', x: 82, y: 54, color: HAIRC[A.hairCol], len: A.hairLen, curly: A.hairCurly }]);
    if (K.indexOf('fabric') >= 0) it.push(['scrap', { id: 'ev-scrap', x: 146, y: 126, color: CLOTH[A.fabCol], pat: A.fabPat === 'plain' ? null : A.fabPat, pc: patPc(A.fabCol), r: -10 }]);
    if (K.indexOf('shoe') >= 0) it.push(['print', { id: 'ev-print', x: 40, y: 128, r: 76, kind: A.shoe === 'heel' ? 'heel' : 'shoe', tread: 'zigzag', size: 24, col: '#3a2414' }]);
    if (K.indexOf('glove') >= 0) it.push(['glove1', { id: 'ev-glove', x: 114, y: 128, color: GLOVEC[A.glove], r: -70 }]);
    if (K.indexOf('mark') >= 0) it.push(['svg', { id: 'ev-mark', svg: '<g transform="rotate(-18 24 104)"><rect x="10" y="98" width="30" height="11" rx="1" fill="#7a3b2a" stroke="#2b2433" stroke-width="1"/><rect x="22" y="98" width="10" height="11" fill="#e8c34a" stroke="#2b2433" stroke-width=".8"/><rect x="40" y="99.5" width="7" height="8" fill="#5a2d14" stroke="#2b2433" stroke-width=".8"/></g>' }]);
    return { bg: ['plain', { color: bgc }], items: it, where: where };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ODD ONE OUT: a row of things that should be identical; one differs in one detail
  // ═════════════════════════════════════════════════════════════════════════
  function lr(v) { return v === 'L' ? 'left' : 'right'; }
  var ODD = {
    gnome: { kind: 'gnome', one: 'gnome', label: 'Gnome', fake: 'the fake',
      feats: {
        buttons: { lv: 'mh', vals: [3, 2, 4], part: 'buttons', say: function (v) { return numw(v) + ' gold buttons'; } },
        buckle: { lv: 'em', vals: ['square', 'round'], say: function (v) { return 'a ' + v + ' belt buckle'; } },
        tip: { lv: 'em', vals: ['L', 'R'], say: function (v) { return 'a hat that flops to the ' + lr(v); } },
        shovel: { lv: 'e', vals: ['R', 'L'], say: function (v) { return 'a spade on the ' + lr(v); } }
      },
      decoys: [['snail', 'a snail'], ['moss', 'some moss'], ['leaf', 'a leaf']], decoyNote: 'Moss, snails and leaves don’t count: they aren’t part of the mould.', decoyAfter: 'just garden visitors',
      setup: ['{Owner}’s {n} garden gnomes all came out of the same mould, so they are exactly alike. Last night a prankster swapped one of them for a look-alike from the garden shop.', 'Every gnome in {poss} garden was cast from one mould, so they should be identical. This morning {his} neighbour admitted swapping one for a copy, as a joke.'],
      q: ['Which gnome is the fake?', 'Which gnome was swapped?'], titles: ['The Gnome Swap', 'Gnome Sweet Gnome', 'A Gnome of a Different Mould', 'The Garden Prankster'] },
    cupcake: { kind: 'cupcake', one: 'cupcake', label: 'Cupcake', fake: 'the odd one out',
      feats: {
        cherry: { lv: 'e', vals: [true, false], part: 'icing', say: function (v) { return v ? 'a cherry on top' : 'no cherry'; } },
        stripes: { lv: 'mh', vals: [5, 4, 6], part: 'wrap', say: function (v) { return numw(v) + ' stripes on the wrapper'; } },
        sprinkles: { lv: 'h', vals: [4, 3, 5], part: 'icing', say: function (v) { return numw(v) + ' sprinkles'; } },
        swirl: { lv: 'mh', vals: ['R', 'L'], part: 'icing', say: function (v) { return 'an icing swirl that curls to the ' + lr(v); } }
      },
      decoys: [['flag', 'a flag'], ['fly', 'a fly'], ['ptag', 'a price tag']], decoyNote: 'Flags, price tags and flies don’t count.', decoyAfter: 'added after baking',
      setup: ['{Owner} piped a tray of cupcakes for the bakery window, every one exactly the same. When {he} wasn’t looking, {his} apprentice swapped one for a cupcake from the shop across the road.', 'The cupcakes in {poss} bakery window are all made to one recipe, so they look identical. One of them is from somewhere else.'],
      q: ['Which cupcake is the odd one out?', 'Which cupcake was swapped?'], titles: ['The Cupcake Copycat', 'Something Fishy at the Bakery', 'One of These Cupcakes', 'Icing on the Case'] },
    teacup: { kind: 'teacup', one: 'cup', label: 'Cup', fake: 'the copy', rows: 2,
      feats: {
        handle: { lv: 'e', vals: ['R', 'L'], part: 'handle', say: function (v) { return 'the handle on the ' + lr(v); } },
        motif: { lv: 'e', vals: ['dot', 'heart'], part: 'dots', say: function (v) { return v === 'heart' ? 'little hearts' : 'round spots'; } },
        dots: { lv: 'mh', vals: [3, 4, 2], part: 'dots', say: function (v) { return numw(v) + ' spots'; } },
        rim: { lv: 'mh', vals: [true, false], part: 'rim', say: function (v) { return v ? 'a gold rim' : 'no gold rim'; } }
      },
      decoys: [['steam', 'steam'], ['spoon', 'a spoon'], ['sugar', 'a sugar cube']], decoyNote: 'Tea, spoons and sugar don’t count.', decoyAfter: 'nothing to do with the cups',
      setup: ['Great-aunt {First}’s tea set came with six cups, all exactly alike. One broke years ago, and she replaced it with a copy from a market stall.', '{Owner} collects old tea sets. This set should have six identical cups, but the seller admitted one of them is a copy.'],
      q: ['Which cup is the copy?', 'Which cup doesn’t belong to the set?'], titles: ['A Storm in a Teacup', 'The Copied Cup', 'Not My Cup of Tea', 'The Odd Teacup'] },
    nutcracker: { kind: 'nutcracker', one: 'soldier', label: 'Soldier', fake: 'the fake',
      feats: {
        plume: { lv: 'e', vals: ['#3a8ad8', '#3aa65a', '#e0384a'], part: 'plume', say: function (v) { return 'a ' + { '#3a8ad8': 'blue', '#3aa65a': 'green', '#e0384a': 'red' }[v] + ' plume'; } },
        sword: { lv: 'em', vals: ['R', null], part: 'sword', say: function (v) { return v ? 'a sword' : 'no sword'; } },
        buttons: { lv: 'mh', vals: [3, 2, 4], part: 'buttons', say: function (v) { return numw(v) + ' buttons'; } },
        sash: { lv: 'mh', vals: ['R', 'L'], part: 'sash', say: function (v) { return 'a sash going down to the ' + lr(v); } }
      },
      decoys: [['ribbon', 'a red price ribbon'], ['dust', 'dust on the hat']], decoyNote: 'Price ribbons and dust don’t count.', decoyAfter: 'just from the shop',
      setup: ['The toy soldiers in {poss} shop are carved from one pattern, so they’re all the same. Somebody slipped in a cheap copy, hoping nobody would notice.', '{Owner} carves toy soldiers, every one exactly alike. A rival shop has put a copy in the row to sell as one of {his}.'],
      q: ['Which soldier is the fake?', 'Which soldier is the copy?'], titles: ['The Toy Soldier', 'Stand to Attention!', 'One Soldier Out of Line', 'The Copycat Carver'] },
    birdhouse: { kind: 'birdhouse', one: 'birdhouse', label: 'Birdhouse', fake: 'the different one',
      feats: {
        hole: { lv: 'e', vals: ['round', 'square', 'heart'], part: 'hole', say: function (v) { return v === 'heart' ? 'a heart-shaped hole' : 'a ' + v + ' hole'; } },
        roof: { lv: 'e', vals: ['#b0413e', '#3a6ea5', '#3a8a4a'], part: 'roof', say: function (v) { return 'a ' + { '#b0413e': 'red', '#3a6ea5': 'blue', '#3a8a4a': 'green' }[v] + ' roof'; } },
        perch: { lv: 'mh', vals: [true, false], part: 'perch', say: function (v) { return v ? 'a perch' : 'no perch'; } },
        chimney: { lv: 'mh', vals: ['R', 'L'], part: 'chimney', say: function (v) { return 'the chimney on the ' + lr(v); } },
        flowers: { lv: 'h', vals: [3, 2, 4], part: 'flowers', say: function (v) { return numw(v) + ' painted flowers'; } }
      },
      decoys: [['bird', 'a bird'], ['leaf', 'a leaf']], decoyNote: 'Birds and leaves don’t count.', decoyAfter: 'just visitors',
      setup: ['{Owner} built a row of birdhouses from one plan, all exactly the same. {His} grandson made one more to join the row, but didn’t follow the plan exactly.', 'The birdhouses along {poss} fence were all made from one kit. One was built from a different kit.'],
      q: ['Which birdhouse is different?', 'Which birdhouse wasn’t built from the plan?'], titles: ['Birdhouse Row', 'Home Tweet Home', 'The Odd Birdhouse', 'A Different Nest'] }
  };
  var ODD_KEYS = ['gnome', 'cupcake', 'teacup', 'nutcracker', 'birdhouse', 'clock'];
  function plLabel(F, list) { return (list.length > 1 ? F.label + 's ' : F.label + ' ') + andList(list.map(String)); }
  T.oddone = function (r, level, occ) {
    var fam = ODD_KEYS[(occ + hstr('odd')) % ODD_KEYS.length];
    if (r.chance(0.3)) fam = r.pick(ODD_KEYS);
    if (fam === 'clock') return clockShop(r, level);
    var F = ODD[fam], N = level === 'easy' ? r.pick([4, 5]) : level === 'medium' ? 5 : 6;
    var lv = level.charAt(0), feats = Object.keys(F.feats).filter(function (k) { return F.feats[k].lv.indexOf(lv) >= 0; });
    var f = r.pick(feats), base = {};
    Object.keys(F.feats).forEach(function (k) { base[k] = r.pick(F.feats[k].vals); });
    var oddV = r.pick(F.feats[f].vals.filter(function (v) { return v !== base[f]; })), odd = r.int(0, N - 1);
    // things the same for all of them, picked per case
    var common = {};
    if (fam === 'cupcake') { common.wrap = r.pick(['#e0607a', '#3a8ad8', '#f2c230', '#3aa65a', '#9b59b6']); common.icing = r.pick(['#fbe3ec', '#fbf6e6', '#d9b4f0', '#c8f0d8', '#7a4a2a']); common.sprinkles = base.sprinkles; }
    if (fam === 'teacup') { common.pc = r.pick(['#3a6ea5', '#e0607a', '#3aa65a', '#e8862a']); common.band = r.pick([null, '#3a6ea5', '#c0392b']); common.rim = null; }
    if (fam === 'nutcracker') { common.jacket = r.pick(['#c0392b', '#3a6ea5', '#3a8a4a']); common.hat = r.pick(['#1d1d26', '#7a2e3a']); }
    if (fam === 'birdhouse') { common.color = r.pick(['#e0b351', '#f4efe4', '#8fc0d8', '#e8a87a']); }
    if (fam === 'gnome') { common.hat = r.pick(['#d33a3a', '#3a6ea5', '#3a8a4a']); common.coat = r.pick(['#3a6ea5', '#d33a3a', '#7a3b8a', '#e8862a']); if (common.hat === common.coat) common.coat = '#e8b830'; }
    var nd = level === 'easy' ? r.pick([0, 1]) : level === 'medium' ? 2 : 3;
    var dIdx = r.sample(Array.apply(null, Array(N)).map(function (_, i) { return i; }).filter(function (i) { return level === 'hard' || i !== odd; }), nd);
    var dk = r.shuffle(F.decoys), deco = {};
    dIdx.forEach(function (i, j) { deco[i] = dk[j % dk.length]; });
    function params(i) {
      var p = {}, v = {};
      Object.keys(F.feats).forEach(function (k) { v[k] = k === f && i === odd ? oddV : base[k]; });
      for (var c in common) p[c] = common[c];
      if (fam === 'gnome') { p.buttons = v.buttons; p.buckle = v.buckle; p.tip = v.tip; p.shovel = v.shovel; }
      if (fam === 'cupcake') { p.cherry = v.cherry; p.stripes = v.stripes; p.sprinkles = v.sprinkles; p.swirl = v.swirl; }
      if (fam === 'teacup') { p.handle = v.handle; p.motif = v.motif; p.dots = v.dots; p.rim = v.rim ? '#d4a017' : null; }
      if (fam === 'nutcracker') { p.plume = v.plume; p.sword = v.sword; p.buttons = v.buttons; p.sash = v.sash; }
      if (fam === 'birdhouse') { p.hole = v.hole; p.roof = v.roof; p.perch = v.perch; p.chimney = v.chimney; p.flowers = v.flowers; }
      if (deco[i]) { var dd = deco[i][0]; p[dd] = dd === 'flag' ? r.pick(['#3a8ad8', '#e0384a', '#3aa65a']) : dd === 'ptag' ? r.pick(['£2', '£3', '50p']) : dd === 'ribbon' ? '#e0384a' : dd === 'bird' ? r.pick(['#3a8ad8', '#e8862a']) : 1; }
      return { p: p, v: v };
    }
    // ── the picture ──
    var items = [], ids = [], W = 400, H = 300, rows = F.rows && N > 5 ? 2 : 1;
    var S = { gnome: N > 5 ? 1.25 : 1.4, cupcake: N > 5 ? 1.45 : 1.6, teacup: rows > 1 ? 1.3 : 1.15, nutcracker: N > 5 ? 1.2 : 1.3, birdhouse: N > 5 ? 1.15 : 1.25 }[fam];
    if (fam === 'gnome') items.push(['sun', { x: 352, y: 36, r: 13 }], ['cloud', { x: 90, y: 40, s: 1.1 }], ['cloud', { x: 236, y: 30, s: 0.8 }], ['fence', { x: 0, y: 150, w: 400, h: 50, color: '#f4efe4' }], ['flowerbed', { x: 0, y: 158, w: 400, colors: r.shuffle(['#e04a6a', '#ffd23f', '#9b59b6', '#ff8a3d']), seed: r.int(1, 99) }]);
    if (fam === 'birdhouse') items.push(['cloud', { x: 80, y: 34 }], ['cloud', { x: 300, y: 26, s: 0.8 }], ['tree', { x: 30, y: 214, size: 0.9 }], ['tree', { x: 382, y: 214, size: 0.8 }], ['fence', { x: 0, y: 228, w: 400, h: 40, color: '#c9a77a' }]);
    if (fam === 'cupcake') items.push(['sign', { x: 130, y: 36, w: 140, h: 24, text: r.pick(['FRESH TODAY', 'CUPCAKES', 'BAKED TODAY']), size: 13, post: false, color: '#7a3b2a', ink: '#fbf6e6' }], ['svg', { svg: '<rect x="10" y="220" width="380" height="10" rx="2" fill="#f4efe4" stroke="#2b2433" stroke-width="1.2"/><rect x="10" y="230" width="380" height="70" fill="#c98a5a" stroke="#2b2433" stroke-width="1.2"/><path d="M10 238h380" stroke="#a8693a" stroke-width="1"/>' }]);
    if (fam === 'teacup') items.push(['svg', { svg: '<rect x="14" y="10" width="372" height="290" rx="4" fill="#8a5a34" stroke="#2b2433" stroke-width="1.4"/><rect x="24" y="20" width="352" height="280" fill="#f0e2c4"/>' + (rows > 1 ? '<rect x="18" y="128" width="364" height="9" fill="#a0703f" stroke="#2b2433" stroke-width="1.1"/>' : '') + '<rect x="18" y="246" width="364" height="9" fill="#a0703f" stroke="#2b2433" stroke-width="1.1"/>' }]);
    if (fam === 'nutcracker') items.push(['svg', { svg: '<rect x="0" y="232" width="400" height="12" fill="#8a5a34" stroke="#2b2433" stroke-width="1.2"/><rect x="0" y="244" width="400" height="56" fill="#6e4528"/>' }], ['sign', { x: 140, y: 34, w: 120, h: 22, text: 'TOY SHOP', size: 12, post: false, color: '#2f5a46', ink: '#f4efe4' }]);
    var bgs = { gnome: ['outside', { groundY: 150, ground: '#79b85a', hills: '#9fcf7a' }], birdhouse: ['outside', { groundY: 230, ground: '#79b85a', hills: '#9fcf7a' }], cupcake: ['room', { wall: '#f3e2c4', paper: 'stripes', floorY: 300 }], teacup: ['plain', { color: '#6e4a2e' }], nutcracker: ['room', { wall: '#e8d8b8', paper: 'diamonds', floorY: 300 }] };
    var perRow = Math.ceil(N / rows);
    for (var i = 0; i < N; i++) {
      var row = Math.floor(i / perRow), col = i % perRow, nIn = row === rows - 1 ? N - perRow * (rows - 1) : perRow;
      var gap = (W - 40) / nIn, x = 20 + gap * (col + 0.5);
      var y = { gnome: 248, birdhouse: 252, cupcake: 214, teacup: rows > 1 ? (row ? 236 : 118) : 236, nutcracker: 226 }[fam];
      var pp = params(i), id = 'o' + (i + 1);
      ids.push(id);
      var o = { id: id, x: Math.round(x), y: y, s: S }; for (var k in pp.p) o[k] = pp.p[k];
      items.push([F.kind, o]);
      var ty = { gnome: 286, birdhouse: 284, cupcake: 254, teacup: rows > 1 ? (row ? 272 : 156) : 272, nutcracker: 266 }[fam];
      items.push(fam === 'gnome' || fam === 'birdhouse' ? ['stake', { x: Math.round(x), y: ty + 6, text: String(i + 1) }] : ['tag', { x: Math.round(x), y: ty, text: String(i + 1), s: 0.85 }]);
    }
    // ── words ──
    var gd = r.pick(['f', 'm']), first = r.pick(gd === 'f' ? GIRLS : BOYS), owner = (gd === 'f' ? r.pick(['Mrs.', 'Ms.']) : 'Mr.') + ' ' + r.pick(SUR), pr = pron(gd);
    var o2 = { Owner: owner, poss: poss(owner), his: pr.his, His: pr.His, he: pr.he, n: numw(N), First: r.pick(GIRLS) };
    var setup = fill(r.pick(F.setup), o2).replace('six cups', numw(N) + ' cups');
    if (nd) setup += ' ' + F.decoyNote;
    var Fi = F.feats[f], others = []; for (var j = 0; j < N; j++) if (j !== odd) others.push(j + 1);
    var dList = Object.keys(deco).map(function (i) { return deco[i][1] + ' on ' + F.one + ' ' + (+i + 1); });
    var steps = [
      { text: plLabel(F, others) + ' all have ' + Fi.say(base[f]) + '.' + (dList.length ? ' ' + cap(andList(dList)) + (dList.length > 1 ? ' are ' : ' is ') + F.decoyAfter + '.' : ''), marks: others.slice(0, 2).map(function (k) { return Fi.part ? { p: 'o' + k + '.' + Fi.part, pad: 2 } : { id: 'o' + k }; }) },
      { text: F.label + ' ' + (odd + 1) + ' has ' + Fi.say(oddV) + '.', marks: [Fi.part ? { p: 'o' + (odd + 1) + '.' + Fi.part, pad: 2 } : { id: 'o' + (odd + 1) }] }
    ];
    var hintAt = others[0], areaWord = { buttons: 'buttons', buckle: 'belt', tip: 'hat', shovel: 'hands', cherry: 'top', stripes: 'wrapper', sprinkles: 'icing', swirl: 'icing', handle: 'handle', motif: 'pattern', dots: 'pattern', rim: 'rim', plume: 'hat', sword: 'side', sash: 'sash', hole: 'front', roof: 'roof', perch: 'front', chimney: 'roof', flowers: 'flowers' }[f];
    var hints = [
      { text: nd ? F.decoyNote + ' Compare the ' + F.one + 's themselves, one detail at a time.' : 'Pick one detail and check it on every ' + F.one + ', then move on to the next detail.' },
      { text: 'Look closely at each ' + F.one + '’s ' + areaWord + '. Are they really all the same?', at: Fi.part ? { p: 'o' + hintAt + '.' + Fi.part, pad: 4 } : { id: 'o' + hintAt, pad: 2 } }
    ];
    var key = 'oddone|' + fam + '|' + N + '|' + f + '|' + JSON.stringify(base) + '|' + JSON.stringify(oddV) + '|' + odd + '|' + JSON.stringify(common) + '|' + Object.keys(deco).map(function (i) { return i + deco[i][0]; }).join(',');
    return {
      type: 'Odd one out', title: r.pick(F.titles), setup: setup, q: r.pick(F.q), size: [W, H], tap: true,
      choices: ids.map(function (id, i) { return { id: id, label: F.label + ' ' + (i + 1) }; }), answer: ids[odd],
      scene: { bg: bgs[fam], items: items }, hints: hints, solution: { steps: steps, verdict: F.label + ' ' + (odd + 1) + ' is ' + F.fake + '.' }, key: key,
      logic: { tpl: 'oddone', fam: fam, feats: Object.keys(F.feats), kind: F.kind }
    };
  };
  // the clock shop: all the clocks look different, but they should all tell the same time
  function timeWords(h, m) {
    var H12 = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
    var hh = h % 12, nx = (h + 1) % 12;
    if (m === 0) return H12[hh] + ' o’clock';
    if (m === 15) return 'quarter past ' + H12[hh];
    if (m === 30) return 'half past ' + H12[hh];
    if (m === 45) return 'quarter to ' + H12[nx];
    var MW = { 5: 'five', 10: 'ten', 20: 'twenty', 25: 'twenty-five' };
    return m < 30 ? MW[m] + ' past ' + H12[hh] : MW[60 - m] + ' to ' + H12[nx];
  }
  function clockShop(r, level) {
    var N = level === 'easy' ? 5 : 6, h = r.int(1, 12), m = r.pick([0, 10, 15, 20, 30, 40, 45, 50]), oh = h, om = m;
    if (level === 'easy') { oh = ((h - 1 + r.pick([3, 4, 5, 6, 7])) % 12) + 1; om = r.pick([0, 15, 30, 45].filter(function (x) { return x !== m; })); }
    else if (level === 'medium') { if (r.chance(0.5)) oh = ((h - 1 + r.pick([2, 3, 9, 10])) % 12) + 1; else om = (m + r.pick([15, 20, 30, 40, 45])) % 60; }
    else { if (r.chance(0.5)) oh = ((h - 1 + r.pick([1, 11])) % 12) + 1; else om = (m + r.pick([10, 50])) % 60; }
    var odd = r.int(0, N - 1), items = [], ids = [];
    var frames = r.shuffle(['#5a3a22', '#c9a227', '#2f5a46', '#7a2e3a', '#3a3a46', '#8a5a34', '#b0413e']), faces = ['#fbf6e6', '#fdfaf0', '#f4ead0', '#eef3f7'];
    items.push(['svg', { svg: '<rect x="0" y="262" width="400" height="38" fill="#7a5233"/><path d="M0 262h400" stroke="#2b2433" stroke-width="1.2"/>' }], ['sign', { x: 150, y: 30, w: 100, h: 22, text: 'CLOCKS', size: 12, post: false, color: '#3a3a46', ink: '#f4efe4' }]);
    var pos = N === 5 ? [[70, 100], [200, 96], [330, 100], [130, 196], [270, 196]] : [[70, 100], [200, 96], [330, 100], [70, 200], [200, 204], [330, 200]];
    pos = r.shuffle(pos);
    for (var i = 0; i < N; i++) {
      var id = 'c' + (i + 1); ids.push(id);
      var rr = level === 'hard' ? r.int(26, 30) : r.int(22, 28);
      items.push(['clock', { id: id, x: pos[i][0], y: pos[i][1], r: rr, h: i === odd ? oh : h, m: i === odd ? om : m, color: frames[i % frames.length], face: faces[i % faces.length], nums: r.chance(0.5) ? 1 : 0 }]);
      items.push(['tag', { x: pos[i][0], y: pos[i][1] + rr + 16, text: String(i + 1), s: 0.85 }]);
    }
    var owner = r.pick(['Mr.', 'Mrs.', 'Ms.']) + ' ' + r.pick(SUR), others = []; for (var j = 0; j < N; j++) if (j !== odd) others.push(j + 1);
    var steps = [
      { text: 'Clocks ' + andList(others.map(String)) + ' look different, but they all say ' + timeWords(h, m) + '.', marks: others.slice(0, 2).map(function (k) { return { id: 'c' + k }; }) },
      { text: 'Clock ' + (odd + 1) + ' says ' + timeWords(oh, om) + '. ' + r.pick(['It has stopped.', 'It stopped earlier and hasn’t moved since.']), marks: [{ id: 'c' + (odd + 1) }] }
    ];
    return {
      type: 'Odd one out', title: r.pick(['Tick Tock', 'The Stopped Clock', 'Time Stands Still', 'The Clock Shop']), size: [400, 300], tap: true,
      setup: r.pick(['Every morning, ' + owner + ' sets all the clocks in ' + (owner.indexOf('Mr.') === 0 ? 'his' : 'her') + ' shop to exactly the same time, and they keep perfect time. Today, one of them has stopped.', 'All the clocks in ' + poss(owner) + ' shop keep perfect time, and they were all set together this morning. But one clock has stopped.']) + (level !== 'easy' ? ' Don’t be fooled by the frames: only the time matters.' : ''),
      q: r.pick(['Which clock has stopped?', 'Which clock is wrong?']),
      choices: ids.map(function (id, i) { return { id: id, label: 'Clock ' + (i + 1) }; }), answer: ids[odd],
      scene: { bg: ['room', { wall: r.pick(['#e8dcc0', '#dfe6e0', '#efe0d0']), paper: r.pick(['stripes', 'dots', null]), floorY: 262, floor: '#7a5233' }], items: items },
      hints: [{ text: 'The clocks all look different, but only the time matters. Read the time on each one.' }, { text: 'Read clock ' + others[0] + ' first. Do all the others say the same?', at: { id: 'c' + others[0], pad: 3 } }],
      solution: { steps: steps, verdict: 'Clock ' + (odd + 1) + ' has stopped.' },
      key: 'oddone|clock|' + N + '|' + h + ':' + m + '|' + oh + ':' + om + '|' + odd,
      logic: { tpl: 'oddone', fam: 'clock' }
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // WHAT'S MISSING: two photos of the same shelves, before and after
  // ═════════════════════════════════════════════════════════════════════════
  var OBJ = {
    globe: ['the globe', 'globe', {}, 30], trophy: ['the trophy', 'trophy', { s: 1.1 }, 28], ship: ['the ship in a bottle', 'ship', {}, 58], camera: ['the camera', 'camera', {}, 26], bear: ['the teddy bear', 'bear', {}, 28],
    toycar: ['the toy car', 'toycar', {}, 30], vase: ['the vase', 'vase', { color: '#d98a3a', s: 0.9 }, 24], books: ['the stack of books', 'books', {}, 32], teapot: ['the teapot', 'teapot', {}, 44], candle: ['the candle', 'candle', { len: 20, holder: 6, lit: false, s: 0.9 }, 24],
    piggy: ['the piggy bank', 'piggy', {}, 40], snowglobe: ['the snow globe', 'snowglobe', {}, 30], hourglass: ['the hourglass', 'hourglass', {}, 26], duck: ['the rubber duck', 'duck', {}, 36], robot: ['the toy robot', 'robot', { s: 0.9 }, 32],
    rocket: ['the toy rocket', 'rocket', {}, 28], shell: ['the seashell', 'shell', {}, 32], musicbox: ['the music box', 'musicbox', {}, 40], radio: ['the radio', 'radio', {}, 40], lantern: ['the lantern', 'lantern', {}, 24], plant: ['the pot plant', 'plant', { s: 0.6, pot: '#3a8a7a' }, 30], jar: ['the sweet jar', 'jar', { cookies: 4, s: 0.8, label: 'SWEETS' }, 28]
  };
  var MISS_SETS = [
    { key: 'party', who: '{Owner}', place: 'treasure shelves', cap: ['Before the party', 'After the party'], setup: '{Owner} took a photo of {his} treasure shelves before {his} big party, and another one afterwards. Something is gone!', wall: '#eadcc0', paper: 'dots' },
    { key: 'class', who: '{Owner}', place: 'show-and-tell shelves', cap: ['Monday', 'Friday'], setup: 'Class 3 keeps its show-and-tell things on two shelves. {Owner} took a photo on Monday and another on Friday, and one thing has vanished.', wall: '#e6efe6', paper: 'stripes' },
    { key: 'shop', who: '{Owner}', place: 'shop window', cap: ['9 o’clock', '5 o’clock'], setup: 'The security camera in {poss} toy shop photographs the window shelves every morning and evening. Between the two photos, something disappeared.', wall: '#efe0d0', paper: 'diamonds' },
    { key: 'gran', who: 'Grandma', place: 'mantelpiece shelves', cap: ['Saturday', 'Sunday'], setup: 'Grandma photographs her shelves of treasures every weekend. The grandkids visited on Sunday, and now one treasure is missing.', wall: '#f0e2d8', paper: 'stripes' },
    { key: 'museum', who: '{Owner}', place: 'museum display', cap: ['Opening time', 'Closing time'], setup: 'The children’s museum photographs its touch-and-see shelves at opening and closing time. Today, one thing didn’t make it to closing time.', wall: '#dfe6e0', paper: null }
  ];
  T.missing = function (r, level, occ) {
    var set = MISS_SETS[(occ + hstr('missing')) % MISS_SETS.length]; if (r.chance(0.3)) set = r.pick(MISS_SETS);
    var nB = level === 'easy' ? 6 : level === 'medium' ? 7 : 8;
    var pool = r.sample(Object.keys(OBJ), nB + 1), before = pool.slice(0, nB), extra = pool[nB];
    // 8 slots: 4 per shelf
    var slots = [0, 1, 2, 3, 4, 5, 6, 7];
    var posB = r.sample(slots, nB), place = {};
    before.forEach(function (o, i) { place[o] = posB[i]; });
    var gone = r.pick(before), after = {}, moved = [], added = null;
    before.forEach(function (o) { if (o !== gone) after[o] = place[o]; });
    var free = function () { var used = {}; Object.keys(after).forEach(function (o) { used[after[o]] = 1; }); return slots.filter(function (s) { return !used[s]; }); };
    var stay = before.filter(function (o) { return o !== gone; });
    var nMove = level === 'easy' ? 1 : level === 'medium' ? 2 : 3;
    var mv = r.sample(stay, nMove);
    if (level === 'easy') { var f1 = free().filter(function (s) { return s !== place[gone]; }); if (f1.length) after[mv[0]] = r.pick(f1); else { after[mv[0]] = after[stay[0] === mv[0] ? stay[1] : stay[0]]; } }
    else if (level === 'medium') { var t = after[mv[0]]; after[mv[0]] = after[mv[1]]; after[mv[1]] = t; }
    else { var t2 = after[mv[0]]; after[mv[0]] = after[mv[1]]; after[mv[1]] = t2; after[mv[2]] = place[gone]; added = extra; var fr = free(); after[added] = r.pick(fr); }
    // anything that changed place counts as moved
    stay.forEach(function (o) { if (after[o] !== place[o]) moved.push(o); });
    var unmoved = stay.filter(function (o) { return moved.indexOf(o) < 0; });
    function shelfItems(map, tag) {
      var rows = [[], []];
      Object.keys(map).forEach(function (o) { var sl = map[o], d = OBJ[o], x = 52 + (sl % 4) * 90, it = { id: o + tag, x: x, y: 0 }; for (var k in d[2]) it[k] = d[2][k]; if (o === 'ship') it.x = x; rows[sl < 4 ? 0 : 1].push([d[1], it]); });
      return [['frame', { x: 300, y: 10, w: 40, h: 26, art: r.f() < 0.5 ? 'mountain' : 'boat' }], ['shelf', { x: 12, y: 78, w: 352, color: '#9a6438', items: rows[0] }], ['shelf', { x: 12, y: 156, w: 352, color: '#9a6438', items: rows[1] }]];
    }
    var frameArt = r.pick(['mountain', 'boat']);
    var itB = shelfItems(place, 'B'), itA = shelfItems(after, 'A');
    itA[0][1].art = itB[0][1].art = frameArt;
    var items = [
      ['photo', { x: 12, y: 10, w: 376, h: 176, caption: set.cap[0], bg: ['room', { wall: set.wall, paper: set.paper, floorY: 400 }], items: itB, r: -0.6 }],
      ['photo', { x: 12, y: 222, w: 376, h: 176, caption: set.cap[1], bg: ['room', { wall: set.wall, paper: set.paper, floorY: 400 }], items: itA, r: 0.5 }]
    ];
    var gd = r.pick(['f', 'm']), owner = (gd === 'f' ? r.pick(['Mrs.', 'Ms.']) : 'Mr.') + ' ' + r.pick(SUR), pr = pron(gd);
    var setup = fill(set.setup, { Owner: owner, poss: poss(owner), his: pr.his }) + (moved.length ? ' ' + r.pick(['A few things were moved around, too.', 'Some things were moved around, too.', 'A few things got moved, as well.']) : '') + (added ? ' And something new appeared.' : '');
    if (level === 'easy') setup = setup.replace('A few things were moved around, too.', 'One thing was moved, too.').replace('Some things were moved around, too.', 'One thing was moved, too.').replace('A few things got moved, as well.', 'One thing got moved, as well.');
    var choiceObjs = [gone].concat(r.sample(moved, Math.min(moved.length, level === 'easy' ? 1 : 2))).concat(added ? [added] : []);
    choiceObjs = choiceObjs.concat(r.sample(unmoved, Math.max(0, 5 - choiceObjs.length)));
    choiceObjs = r.shuffle(choiceObjs.slice(0, 5));
    var nameOf = function (o) { return OBJ[o][0]; };
    var steps = [];
    if (moved.length) steps.push({ text: cap(andList(moved.map(nameOf))) + (moved.length > 1 ? ' only moved' : ' only moved') + ': ' + (moved.length > 1 ? 'they’re still in the second photo, in new places.' : 'it’s still in the second photo, in a new place.'), marks: moved.map(function (o) { return { id: o + 'A', pad: 2 }; }) });
    if (added) steps.push({ text: cap(nameOf(added)) + ' is new: it wasn’t in the first photo at all, so it can’t have been taken.', marks: [{ id: added + 'A', pad: 2 }] });
    steps.push({ text: cap(nameOf(gone)) + ' is in the first photo, but nowhere in the second.', marks: [{ id: gone + 'B', pad: 3 }] });
    var hints = [
      { text: r.pick(['Go along the top shelf in the first photo, one thing at a time, and find each thing in the second photo.', 'Take each thing in the first photo and look for it in the second. Moved things are still there somewhere.']) },
      { text: added ? 'Something new was added, and it’s a trap. Check the bottom shelf of the first photo too.' : 'Moved things are still in the second photo, just in a different place. Which one isn’t there at all?', at: { id: 'photo2', box: [12, 222, 376, 176] } }
    ];
    hints[1].at = { box: [12, 222, 376, 176] };
    return {
      type: 'What’s missing', title: r.pick(['The Missing Treasure', 'Now You See It', 'Spot the Gap', 'Gone Missing', 'Before and After', 'The Vanishing Act']), setup: setup,
      q: r.pick(['What was taken?', 'What’s missing from the ' + set.place + '?', 'What disappeared?']), size: [400, 420], tap: false,
      choices: choiceObjs.map(function (o) { return { id: o, label: cap(nameOf(o)) }; }), answer: gone,
      scene: { bg: ['desk', { color: r.pick(['#6e4a2e', '#7a5233', '#5e4030']) }], items: items }, hints: hints,
      solution: { steps: steps, verdict: cap(nameOf(gone)) + ' was taken.' },
      key: 'missing|' + JSON.stringify(place) + '|' + JSON.stringify(after) + '|' + gone,
      logic: { tpl: 'missing', before: place, after: after, gone: gone }
    };
  };

  // ═════════════════════════════════════════════════════════════════════════
  // Putting it together
  // ═════════════════════════════════════════════════════════════════════════
  var TPL = ['culprit'];
  var DAILY_LV = ['hard', 'easy', 'easy', 'medium', 'medium', 'hard', 'hard']; // Sun..Sat, like the other dailies
  function levelFor(day) { return DAILY_LV[((day % 7) + 7) % 7]; } // day 1 (1 Jan 2024) was a Monday
  function blockPerm(b) { return RNG(hstr('mysteries-week-' + b)).shuffle(TPL); }
  // the template for a day: each block of 8 days uses every template once, in a shuffled order,
  // and a block never starts with the template the last one ended on
  function tplFor(day) {
    var n = TPL.length, b = Math.floor(day / n), i = day % n, p = blockPerm(b);
    if (n > 1) { var prev = blockPerm(b - 1); if (p[0] === prev[n - 1]) { var t = p[0]; p[0] = p[1]; p[1] = t; } }
    return { tpl: p[i], occ: b };
  }
  function make(tpl, level, seed, occ) {
    var r = RNG(seed), c = T[tpl](r, level, occ || 0);
    c.level = level; c.gen = true; c.tpl = tpl;
    return c;
  }
  var cache = {};
  function daily(day) {
    var id = 'daily-' + day;
    if (cache[id]) return cache[id];
    var t = tplFor(day), c = make(t.tpl, levelFor(day), hstr('mysteries-daily-' + day), t.occ);
    c.id = id; c.no = day; c.daily = day;
    return (cache[id] = c);
  }
  function endless(level, n) {
    var id = 'endless-' + level + '-' + n;
    if (cache[id]) return cache[id];
    var tpl = TPL[(n + hstr(level)) % TPL.length];
    var c = make(tpl, level, hstr('mysteries-endless-' + level + '-' + n), n + 7);
    c.id = id; c.no = n;
    return (cache[id] = c);
  }
  function byId(id) {
    var m = /^daily-(\d+)$/.exec(id || ''); if (m) return daily(+m[1]);
    m = /^endless-(easy|medium|hard)-(\d+)$/.exec(id || ''); if (m) return endless(m[1], +m[2]);
    return null;
  }
  window.MysteryGen = { daily: daily, endless: endless, make: make, byId: byId, templates: TPL, levelFor: levelFor, tplFor: tplFor, FIRST_DAY: FIRST_DAY, hash: hstr, RNG: RNG };
})();
