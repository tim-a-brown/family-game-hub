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
  // WHICH WAY: a park from above; follow one set of prints to the gate they leave by
  // ═════════════════════════════════════════════════════════════════════════
  var TRACKERS = {
    puppy: { lv: 'em', who: ['Biscuit', 'Pepper', 'Noodle', 'Muffin', 'Pip', 'Bramble', 'Toffee', 'Scout'], kind: 'paw', size: 11, gap: 9, side: 2.4, col: '#4a3018',
      desc: 'the tiniest paw prints', start: 'collar',
      setup: '{W} the puppy slipped out of {his} collar in {Park} and ran off. The muddy paths are covered in tracks, but {W} is tiny, so {his} paw prints are the smallest of all.', q: 'Which gate did {W} leave by?', verdict: '{W} left by Gate {G}.',
      decoys: [['bigpaw', 17, 'big dog paw prints'], ['shoe:lines', 13, 'shoe prints'], ['bike', 0, 'bike tracks'], ['bird', 12, 'bird tracks']] },
    hen: { lv: 'em', who: ['Henrietta', 'Mabel', 'Clucky', 'Dolly', 'Ginger', 'Peggy'], kind: 'bird', size: 13, gap: 10, side: 2.6, col: '#4a3018',
      desc: 'the three-toed bird prints', start: 'feathers',
      setup: '{W} the hen escaped from the petting farm in {Park}, leaving a few feathers by {his} crate. Hens leave little three-toed prints in the mud.', q: 'Which gate did {W} wander out of?', verdict: '{W} went out by Gate {G}.',
      decoys: [['paw', 12, 'small paw prints'], ['bigpaw', 17, 'big dog paw prints'], ['shoe:dots', 13, 'shoe prints'], ['bike', 0, 'bike tracks']] },
    bike: { lv: 'mh', who: ['Mr. Grant', 'Mrs. Okafor', 'Dr. Penn', 'Ms. Rossi'], kind: 'bike', tread: 'zigzag', col: '#3a2414', desc: 'the bike tracks with the zigzag tread',
      start: 'rack', setup: 'Someone borrowed {poss} new bike from the rack in {Park} and rode off. Its new tyres leave a zigzag pattern; the park’s other bikes have smooth tyres.', q: 'Which gate did the bike go out of?', verdict: 'The bike left by Gate {G}.',
      decoys: [['bike:plain', 0, 'smooth bike tracks'], ['bike:plain', 0, 'smooth bike tracks'], ['bigpaw', 17, 'dog prints'], ['shoe:lines', 13, 'shoe prints']] },
    notch: { lv: 'h', who: ['the thief'], kind: 'shoe', tread: 'zigzag', notch: true, size: 16, gap: 17, side: 4.2, col: '#3a2414', desc: 'the zigzag boot prints with a notch cut out of the heel',
      start: 'bag', setup: 'A thief snatched a bag at the bandstand in {Park}, dropped it by the path and ran. The thief’s boots have a zigzag tread, with a notch cut out of one heel.', q: 'Which gate did the thief escape through?', verdict: 'The thief escaped through Gate {G}.',
      decoys: [['shoe:zigzag', 16, 'zigzag boot prints with whole heels'], ['shoe:zigzag', 16, 'zigzag boot prints with whole heels'], ['shoe:dots', 15, 'dotted shoe prints'], ['bigpaw', 17, 'dog prints']] },
    chevron: { lv: 'h', who: ['the thief'], kind: 'shoe', tread: 'chevron', size: 16, gap: 17, side: 4.2, col: '#3a2414', desc: 'the prints with arrow-shaped tread',
      start: 'bag', setup: 'A thief grabbed a purse in {Park}, dropped it as they ran, and escaped through one of the gates. The thief’s trainers have a tread of little arrows.', q: 'Which gate did the thief escape through?', verdict: 'The thief escaped through Gate {G}.',
      decoys: [['shoe:zigzag', 16, 'zigzag prints'], ['shoe:zigzag', 16, 'zigzag prints'], ['shoe:lines', 15, 'striped prints'], ['bigpaw', 17, 'dog prints']] }
  };
  var PARKS = ['Maple Park', 'Willow Park', 'Oak Hill Park', 'Riverside Park', 'Bluebell Park', 'Elm Green', 'Kingfisher Park', 'Hazel Common'];
  T.tracks = function (r, level) {
    var lvc = level.charAt(0), tk = r.pick(Object.keys(TRACKERS).filter(function (k) { return TRACKERS[k].lv.indexOf(lvc) >= 0; })), TK = TRACKERS[tk];
    // the paths: a 3 x 3 grid of crossings (jittered), a few links removed, four gates
    var X = [70 + r.int(-12, 12), 200 + r.int(-14, 14), 330 + r.int(-12, 12)], Y = [72 + r.int(-10, 10), 152 + r.int(-10, 10), 230 + r.int(-10, 10)];
    var nodes = [], edges = [], adj = {};
    for (var rr = 0; rr < 3; rr++) for (var cc = 0; cc < 3; cc++) nodes.push([X[cc] + r.int(-10, 10), Y[rr] + r.int(-8, 8)]);
    function addE(a, b) { edges.push([a, b]); }
    for (rr = 0; rr < 3; rr++) for (cc = 0; cc < 2; cc++) addE(rr * 3 + cc, rr * 3 + cc + 1);
    for (rr = 0; rr < 2; rr++) for (cc = 0; cc < 3; cc++) addE(rr * 3 + cc, rr * 3 + cc + 3);
    // gates: N (top), E (right), S (bottom), W (left); nodes 9..12
    var gN = r.int(0, 2), gE = r.int(0, 2), gS = r.int(0, 2), gW = r.int(0, 2);
    nodes.push([nodes[gN][0], 0], [400, nodes[gE * 3 + 2][1]], [nodes[6 + gS][0], 300], [0, nodes[gW * 3][1]]);
    addE(gN, 9); addE(gE * 3 + 2, 10); addE(6 + gS, 11); addE(gW * 3, 12);
    // drop some inner links, keeping everything connected
    var drop = r.shuffle(edges.slice(0, 12)), removed = 0, want = level === 'hard' ? 2 : 3;
    function connected(es) { var seen = { 0: 1 }, st = [0], A2 = {}; es.forEach(function (e) { (A2[e[0]] = A2[e[0]] || []).push(e[1]); (A2[e[1]] = A2[e[1]] || []).push(e[0]); }); while (st.length) { var x = st.pop(); (A2[x] || []).forEach(function (y) { if (!seen[y]) { seen[y] = 1; st.push(y); } }); } return Object.keys(seen).length === nodes.length; }
    drop.forEach(function (e) { if (removed >= want) return; var rest = edges.filter(function (x) { return x !== e; }); if (connected(rest)) { edges = rest; removed++; } });
    edges.forEach(function (e) { (adj[e[0]] = adj[e[0]] || []).push(e[1]); (adj[e[1]] = adj[e[1]] || []).push(e[0]); });
    var gates = [9, 10, 11, 12], letters = r.shuffle(['A', 'B', 'C', 'D']);
    // all simple paths from a to any gate (gates are dead ends)
    function walks(a, minL, maxL, toGate) {
      var out = [];
      (function go(path) {
        var x = path[path.length - 1];
        if (path.length > 1 && gates.indexOf(x) >= 0) { if (path.length - 1 >= minL && (!toGate || toGate.indexOf(x) >= 0)) out.push(path.slice()); return; }
        if (path.length - 1 >= maxL) return;
        (adj[x] || []).forEach(function (y) { if (path.indexOf(y) < 0) { path.push(y); go(path); path.pop(); } });
      })([a]);
      return out;
    }
    var L = level === 'easy' ? [3, 4] : level === 'medium' ? [4, 6] : [5, 8];
    var starts = r.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]), route = null, start;
    for (var si = 0; si < starts.length && !route; si++) { var ws = walks(starts[si], L[0], L[1]); if (ws.length) { route = r.pick(ws); start = starts[si]; } }
    if (!route) { start = 4; route = walks(4, 2, 9)[0]; }
    var endGate = route[route.length - 1];
    // other trails: gate to gate, using some of the same paths
    var nDec = level === 'easy' ? 2 : level === 'medium' ? 3 : 4, load = {}, trails = [];
    function ek(a, b) { return a < b ? a + '-' + b : b + '-' + a; }
    function useLoad(p, d) { for (var i = 1; i < p.length; i++) load[ek(p[i - 1], p[i])] = (load[ek(p[i - 1], p[i])] || 0) + d; }
    useLoad(route, 1);
    var dk = r.shuffle(TK.decoys).slice(0, nDec), overlapNeeded = level !== 'easy';
    dk.forEach(function (d, j) {
      var g0 = r.pick(gates), cand = walks(g0, 2, 7).filter(function (p) { for (var i = 1; i < p.length; i++) if ((load[ek(p[i - 1], p[i])] || 0) >= 3) return false; return true; });
      // prefer trails that share a stretch with the route and pass through its start
      cand.sort(function (a, b) { return score(b) - score(a); });
      function score(p) { var s = 0; for (var i = 1; i < p.length; i++) if (load[ek(p[i - 1], p[i])]) s += 2; if (p.indexOf(start) >= 0 && j === 0) s += 5; return s + r.f(); }
      var p = cand[Math.min(cand.length - 1, r.int(0, 2))];
      if (p) { useLoad(p, 1); trails.push({ path: p, d: d }); }
    });
    // lanes: each trail gets its own lane on a shared path
    var laneUse = {};
    function lanePts(path, me) {
      var pts = [];
      for (var i = 0; i < path.length; i++) {
        var a = nodes[path[i]];
        // offset at this node: average of the normals of the edges in and out
        var off = [0, 0], k = 0;
        [[path[i - 1], path[i]], [path[i], path[i + 1]]].forEach(function (e) {
          if (e[0] == null || e[1] == null) return;
          var key = ek(e[0], e[1]), lo = Math.min(e[0], e[1]), hi = Math.max(e[0], e[1]);
          var users = laneUse[key], idx = users.indexOf(me), nU = users.length, o = (idx - (nU - 1) / 2) * 8;
          var dx = nodes[hi][0] - nodes[lo][0], dy = nodes[hi][1] - nodes[lo][1], len = Math.sqrt(dx * dx + dy * dy) || 1;
          off[0] += -dy / len * o; off[1] += dx / len * o; k++;
        });
        pts.push([R1(a[0] + off[0] / k), R1(a[1] + off[1] / k)]);
      }
      return pts;
    }
    var all = [{ path: route, d: null, me: 'T' }].concat(trails.map(function (t, i) { t.me = 'D' + i; return t; }));
    all.forEach(function (t) { for (var i = 1; i < t.path.length; i++) { var key = ek(t.path[i - 1], t.path[i]); (laneUse[key] = laneUse[key] || []).push(t.me); } });
    // ── the picture ──
    var items = [];
    items.push(['tpaths', { paths: edges.map(function (e) { return { pts: [nodes[e[0]], nodes[e[1]]], w: 30 }; }) }]);
    // things in the open spaces between paths
    var cells = [[0, 1, 3, 4], [1, 2, 4, 5], [3, 4, 6, 7], [4, 5, 7, 8]].map(function (q) { var x = 0, y = 0; q.forEach(function (n2) { x += nodes[n2][0]; y += nodes[n2][1]; }); return [R1(x / 4), R1(y / 4)]; });
    var lm = r.shuffle(['pond', 'bandstand', 'sandpit', 'trees']), names2 = {};
    cells.forEach(function (c, i) {
      var k = lm[i]; names2[i] = { pond: 'the pond', bandstand: 'the bandstand', sandpit: 'the sandpit', trees: 'the trees' }[k];
      if (k === 'pond') items.push(['tpond', { x: c[0], y: c[1], rx: 34, ry: 20 }]);
      else if (k === 'bandstand') items.push(sv('<circle cx="' + c[0] + '" cy="' + c[1] + '" r="22" fill="#f4efe4" stroke="#2b2433" stroke-width="1.4"/><circle cx="' + c[0] + '" cy="' + c[1] + '" r="16" fill="#c0392b" stroke="#2b2433" stroke-width="1.2"/><path d="M' + (c[0] - 16) + ' ' + c[1] + 'h32M' + c[0] + ' ' + (c[1] - 16) + 'v32" stroke="#8a2a20" stroke-width="1.2"/>'));
      else if (k === 'sandpit') items.push(sv('<rect x="' + (c[0] - 26) + '" y="' + (c[1] - 16) + '" width="52" height="32" rx="6" fill="#e9d38f" stroke="#8a5a34" stroke-width="3"/><circle cx="' + (c[0] - 8) + '" cy="' + (c[1] + 2) + '" r="4" fill="#e0384a" stroke="#2b2433" stroke-width=".8"/><path d="M' + (c[0] + 6) + ' ' + (c[1] - 6) + 'l8 8" stroke="#3a6ea5" stroke-width="2.4"/>'));
      else items.push(['ttree', { x: c[0] - 14, y: c[1] - 6, r: 17 }], ['ttree', { x: c[0] + 16, y: c[1] + 8, r: 14, color: '#3f8a3a' }]);
    });
    [[24, 24], [376, 24], [24, 276], [376, 276], [140, 290], [270, 12]].forEach(function (q) { if (!nodes.some(function (nn) { return Math.abs(nn[0] - q[0]) < 30 && Math.abs(nn[1] - q[1]) < 30; })) items.push(['ttree', { x: q[0], y: q[1], r: r.int(12, 18), color: r.pick(['#4f9a4a', '#3f8a3a']) }]); });
    // the trails
    function trailItem(kind, size, pts, id, extra) {
      var k = kind.split(':'), o = { id: id, pts: pts, col: '#4a3018' };
      if (k[0] === 'bike') { o.kind = 'bike'; o.w = 2.8; o.tread = k[1] === 'plain' ? null : 'zigzag'; }
      else { o.kind = k[0]; o.size = size; o.tread = k[1] || (k[0] === 'shoe' ? 'lines' : null); o.gap = size * 1.05; o.side = k[0].indexOf('paw') >= 0 ? size * 0.22 : size * 0.26; }
      for (var e in (extra || {})) o[e] = extra[e];
      return ['trail', o];
    }
    trails.forEach(function (t, i) { items.push(trailItem(t.d[0], t.d[1], lanePts(t.path, t.me), 'tr' + i)); });
    var rp = lanePts(route, 'T');
    items.push(trailItem(TK.kind + (TK.tread ? ':' + TK.tread : ''), TK.size || 0, rp, 'route', TK.kind === 'bike' ? { tread: 'zigzag' } : { gap: TK.gap, side: TK.side, notch: TK.notch ? '#86c66a' : null }));
    // where it started
    var sp = nodes[start], startSvg = TK.start === 'collar' ? '<path d="M-7 -3 a7 4 0 1 0 14 0 a7 4 0 1 0 -14 0" fill="none" stroke="#e0384a" stroke-width="2.6"/><circle cx="0" cy="2" r="2" fill="#e8c34a" stroke="#2b2433" stroke-width=".6"/>'
      : TK.start === 'feathers' ? '<rect x="-12" y="-9" width="22" height="16" rx="2" fill="#c98a3a" stroke="#2b2433" stroke-width="1"/><path d="M-12 -3h22M-12 2h22" stroke="#8a5a34" stroke-width="1"/><path d="M14 -2q6 -6 9 0q-4 2 -9 0zM12 6q5 -2 7 3q-4 1 -7 -3z" fill="#f4efe4" stroke="#2b2433" stroke-width=".7"/>'
      : TK.start === 'rack' ? '<rect x="-16" y="-6" width="32" height="12" rx="2" fill="#9aa3ad" stroke="#2b2433" stroke-width="1"/><path d="M-10 -6v12M-2 -6v12M6 -6v12" stroke="#5a5a66" stroke-width="1.6"/>'
      : '<rect x="-8" y="-6" width="16" height="12" rx="2" fill="#7a3b8a" stroke="#2b2433" stroke-width="1"/><path d="M-4 -6q4 -6 8 0" fill="none" stroke="#2b2433" stroke-width="1.2"/>';
    items.push(['svg', { id: 'start', x: R1(sp[0] + (route[1] != null && nodes[route[1]][0] > sp[0] ? -18 : 18)), y: R1(sp[1] + (nodes[route[1]][1] > sp[1] ? -16 : 16)), svg: startSvg }]);
    gates.forEach(function (gn, i) {
      var p = nodes[gn], rot = i === 1 || i === 3 ? 90 : 0;
      var lx = i === 0 ? 30 : i === 2 ? 30 : i === 1 ? -6 : 6, ly = i === 0 ? 4 : i === 2 ? -6 : -30;
      items.push(['tgate', { id: letters[i], x: R1(p[0] + (i === 1 ? -6 : i === 3 ? 6 : 0)), y: R1(p[1] + (i === 0 ? 6 : i === 2 ? -6 : 0)), r: rot, text: letters[i], lx: lx, ly: ly }]);
    });
    // ── words ──
    var who = r.pick(TK.who), wgd = /^(Mrs|Ms)\./.test(who) || ['Henrietta', 'Mabel', 'Dolly', 'Peggy', 'Biscuit', 'Pepper', 'Muffin', 'Toffee'].indexOf(who) >= 0 ? 'f' : 'm', wp = pron(wgd);
    var park = r.pick(PARKS), G = letters[gates.indexOf(endGate)];
    var o3 = { W: who, his: wp.his, poss: poss(who), Park: park, G: G };
    // narrate the route by compass direction, past landmarks
    function dir(a, b) { var dx = nodes[b][0] - nodes[a][0], dy = nodes[b][1] - nodes[a][1]; return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north'); }
    function past(a, b) {
      var mx = (nodes[a][0] + nodes[b][0]) / 2, my = (nodes[a][1] + nodes[b][1]) / 2, best = null, bd = 1e9;
      cells.forEach(function (c, i) { var d = Math.abs(c[0] - mx) + Math.abs(c[1] - my); if (d < bd) { bd = d; best = i; } });
      return bd < 90 ? names2[best] : null;
    }
    var legs = []; for (var i = 1; i < route.length; i++) { var d0 = dir(route[i - 1], route[i]); if (legs.length && legs[legs.length - 1].d === d0) legs[legs.length - 1].to = i; else legs.push({ d: d0, from: i - 1, to: i }); }
    var sayStart = { collar: 'From ' + poss(who) + ' collar', feathers: 'From the crate', rack: 'From the bike rack', bag: 'From the dropped bag' }[TK.start];
    var steps = [];
    var decDesc = andList(trails.map(function (t) { return t.d[2]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    steps.push({ text: cap(TK.desc) + ' are the ones to follow. The ' + decDesc + ' belong to somebody else.', marks: [{ id: 'start', pad: 3 }] });
    var groups = legs.length <= 2 ? [legs] : [legs.slice(0, Math.ceil(legs.length / 2)), legs.slice(Math.ceil(legs.length / 2))];
    groups.forEach(function (gl, gi) {
      var words = gl.map(function (lg, li) { var p2 = past(route[lg.from], route[lg.to]); return (li ? 'then ' : '') + lg.d + (p2 && r.chance(0.7) ? ' past ' + p2 : ''); });
      var a = gl[0].from, b = gl[gl.length - 1].to, last = gi === groups.length - 1;
      var tx = (gi === 0 ? sayStart + ', the prints head ' : r.pick(['At the next crossing they turn ', 'From there they go ', 'Then the prints go '])) + words.join(', ') + (last ? ', and out through Gate ' + G + '.' : '.');
      if (TK.kind === 'bike') tx = tx.replace('the prints head', 'the zigzag tracks head').replace('Then the prints go', 'Then the tracks go');
      steps.push({ text: tx, marks: [{ t: 'path', pts: rp.slice(a, b + 1) }].concat(last ? [{ id: G }] : []) });
    });
    // a crossing where another trail goes a different way
    var turnAt = route[Math.min(route.length - 2, 1 + r.int(0, Math.max(0, route.length - 3)))];
    var hints = [
      { text: 'Start at ' + { collar: 'the red collar', feathers: 'the crate and the feathers', rack: 'the bike rack', bag: 'the dropped bag' }[TK.start] + '. Follow only ' + TK.desc + '.' },
      { text: 'Where paths cross, other tracks go other ways. Check which way ' + TK.desc + ' go.', at: { x: nodes[turnAt][0], y: nodes[turnAt][1], r: 22 } }
    ];
    return {
      type: 'Which way', title: fill(r.pick(tk === 'puppy' ? ['Where Did {W} Go?', 'Puppy on the Loose', 'Follow the Paw Prints'] : tk === 'hen' ? ['The Great Hen Escape', 'Where Did {W} Go?', 'Which Way, {W}?'] : tk === 'bike' ? ['The Borrowed Bike', 'Tyre Tracks', 'On Your Bike'] : ['The Bag Snatcher', 'Follow That Thief!', 'Footprints in the Park']), o3),
      setup: fill(TK.setup, o3), q: fill(TK.q, o3), size: [400, 300], tap: true,
      choices: ['A', 'B', 'C', 'D'].map(function (l) { return { id: l, label: 'Gate ' + l }; }), answer: G,
      scene: { bg: ['top', { color: '#86c66a' }], items: items }, hints: hints,
      solution: { steps: steps, verdict: fill(TK.verdict, o3) },
      key: 'tracks|' + tk + '|' + JSON.stringify(nodes) + '|' + JSON.stringify(edges) + '|' + route.join('-') + '|' + trails.map(function (t) { return t.d[0] + ':' + t.path.join('-'); }).join(';') + '|' + letters.join(''),
      logic: { tpl: 'tracks', route: route, gateOf: gates.map(function (gn, i) { return [gn, letters[i]]; }), target: TK.kind + (TK.tread ? ':' + TK.tread : '') + (TK.notch ? ':notch' : ''), others: trails.map(function (t) { return t.d[0]; }) }
    };
  };

  // ═════════════════════════════════════════════════════════════════════════
  // WHICH KEY: match a key to the print it left
  // ═════════════════════════════════════════════════════════════════════════
  var KEY_SETS = [
    { mat: 'soap', bg: ['room', { wall: '#dbe9ee', paper: 'tiles', floorY: 400 }], setup: '{Owner} lost the only key to {his} {lock}. Luckily, {he} once pressed it into a bar of soap so a locksmith could copy it. The locksmith brought {n} keys that look almost the same.', q: 'Which key will open the {lock}?', title: ['The Key in the Soap', 'Soap Opera', 'Locked Out'] },
    { mat: 'clay', bg: ['desk', { color: '#7a5233' }], setup: 'Someone pressed one of the school’s keys into modelling clay to make a copy, then hung it back on the board. {Owner} found the lump of clay in the art room.', q: 'Which key was copied?', title: ['Caught in Clay', 'The Copied Key', 'Mischief in the Art Room'] },
    { mat: 'wax', bg: ['desk', { color: '#5e4030' }], setup: 'A burglar pressed one of {poss} keys into candle wax to copy it, then put it back on the hook. The wax was left behind on the hall table.', q: 'Which key did the burglar copy?', title: ['Waxing Lyrical', 'The Key in the Wax', 'Copycat Burglar'] },
    { mat: 'paper', bg: ['desk', { color: '#8a5a34' }], setup: 'Before {Owner} went away, {he} drew round the key to the {lock} on a notepad, so {his} neighbour could find it on the key board. Only one key is an exact match.', q: 'Which key opens the {lock}?', title: ['Drawn to the Key', 'The Key Tracing', 'Which Key?'] }
  ];
  T.keys = function (r, level, occ) {
    var set = KEY_SETS[(occ + hstr('keys')) % KEY_SETS.length]; if (r.chance(0.3)) set = r.pick(KEY_SETS);
    var N = level === 'easy' ? 4 : 5, heads = ['round', 'square', 'clover', 'oval', 'diamond'], nT = level === 'easy' ? 3 : 4;
    var A = { head: r.pick(heads), teeth: [] };
    for (var i = 0; i < nT; i++) A.teeth.push(r.int(1, 4));
    if (A.teeth.every(function (t) { return t === A.teeth[0]; })) A.teeth[1] = (A.teeth[1] % 4) + 1;
    var keys = [{ head: A.head, teeth: A.teeth.slice(), ans: true, why: null }], sig = {};
    sig[A.head + A.teeth.join('')] = 1;
    var guard = 0;
    while (keys.length < N && guard++ < 500) {
      var k = { head: A.head, teeth: A.teeth.slice(), why: '' }, mode;
      var j = keys.length;
      if (level === 'easy') mode = j <= 1 ? 'head' : 'teeth2';
      else if (level === 'medium') mode = j === 1 ? 'head' : r.pick(['teeth1big', 'swap', 'teeth2']);
      else mode = r.pick(['teeth1', 'teeth1', 'swap']);
      if (mode === 'head') { k.head = r.pick(heads.filter(function (h) { return h !== A.head; })); if (level === 'easy') k.teeth = A.teeth.map(function (t) { return r.int(1, 4); }); k.why = 'head'; }
      else if (mode === 'swap') { var a = r.int(0, nT - 2); if (k.teeth[a] === k.teeth[a + 1]) continue; var t0 = k.teeth[a]; k.teeth[a] = k.teeth[a + 1]; k.teeth[a + 1] = t0; k.why = 'teeth'; }
      else if (mode === 'teeth1' || mode === 'teeth1big') { var b = r.int(0, nT - 1), dlt = mode === 'teeth1' ? 1 : 2; var nv = k.teeth[b] + (r.chance(0.5) ? dlt : -dlt); if (nv < 1 || nv > 4) nv = k.teeth[b] + (nv < 1 ? dlt : -dlt); if (nv < 1 || nv > 4) continue; k.teeth[b] = nv; k.why = 'teeth'; }
      else { var c1 = r.sample([0, 1, 2, 3].slice(0, nT), 2); c1.forEach(function (c) { var opts = [1, 2, 3, 4].filter(function (v) { return Math.abs(v - k.teeth[c]) >= 2; }); if (opts.length) k.teeth[c] = r.pick(opts); }); k.why = 'teeth'; }
      var sg = k.head + k.teeth.join('');
      if (sig[sg]) continue;
      sig[sg] = 1; keys.push(k);
    }
    keys = r.shuffle(keys);
    var ans = keys.map(function (k) { return !!k.ans; }).indexOf(true), L = ['A', 'B', 'C', 'D', 'E'];
    var kr = level === 'easy' ? 0 : level === 'medium' ? r.pick([-12, 10, 14, -8]) : r.pick([180, 172, 188]);
    var items = [];
    items.push(['svg', { svg: '<rect x="198" y="10" width="194" height="282" rx="4" fill="#c9a77a" stroke="#2b2433" stroke-width="1.4"/><rect x="204" y="16" width="182" height="270" fill="#d9bf92"/>' + Array.apply(null, Array(N)).map(function (_, i) { var y = 34 + i * (N === 5 ? 54 : 66); return '<circle cx="218" cy="' + y + '" r="3" fill="#7a828c" stroke="#2b2433" stroke-width=".8"/>'; }).join('') }]);
    keys.forEach(function (k, i) {
      var y = 34 + i * (N === 5 ? 54 : 66);
      items.push(['key', { id: 'k' + L[i], x: 230, y: y, s: 1.4, head: k.head, teeth: k.teeth, col: r.pick(['#d8b64a', '#c9a227', '#cfae4a', '#bfc6cc', '#c98a5a']) }]);
      items.push(['tag', { x: 364, y: y + 4, text: L[i] }]);
    });
    var gd = r.pick(['f', 'm']), owner = (gd === 'f' ? r.pick(['Mrs.', 'Ms.', 'Dr.']) : r.pick(['Mr.', 'Dr.'])) + ' ' + r.pick(SUR), pr = pron(gd), lock = r.pick(['shed', 'garden gate', 'attic', 'boathouse', 'old piano', 'treasure chest', 'cellar']);
    var o4 = { Owner: owner, poss: poss(owner), his: pr.his, he: pr.he, n: numw(N), lock: lock };
    items.unshift(['imprint', { id: 'imp', x: 100, y: 150, s: 1.45, mat: set.mat, key: { head: A.head, teeth: A.teeth }, kr: kr, r: r.int(-4, 4) }]);
    if (set.mat === 'paper') items.unshift(['svg', { svg: '<rect x="20" y="100" width="160" height="104" fill="#fbf8ee" opacity="0"/>' }]);
    if (set.mat === 'soap') items.push(['svg', { svg: '<ellipse cx="100" cy="262" rx="70" ry="14" fill="#fff" stroke="#2b2433" stroke-width="1.2" opacity=".9"/><circle cx="60" cy="230" r="4" fill="#fff" opacity=".7" stroke="#9fc4d6"/><circle cx="148" cy="222" r="3" fill="#fff" opacity=".7" stroke="#9fc4d6"/>' }]);
    if (set.mat === 'wax') items.push(['candle', { x: 52, y: 270, len: 30, holder: 8, drips: 3, seed: r.int(1, 9) }]);
    if (set.mat === 'paper') items.push(['held', { kind: 'brush', x: 170, y: 250, r: 70, brushc: '#2b2433' }]);
    function tw(t) { return t.map(function (v) { return ['short', 'medium', 'tall', 'tallest'][v - 1]; }).join(', '); }
    var steps = [{ text: 'The print has ' + (A.head === 'oval' ? 'an oval' : 'a ' + A.head) + ' head, and its teeth go: ' + tw(A.teeth) + (kr > 90 ? ' (it was pressed in upside down, so read it from the head)' : '') + '.', marks: [{ p: 'imp.print', pad: 2 }] }];
    var byHead = keys.map(function (k, i) { return i; }).filter(function (i) { return keys[i].head !== A.head; });
    if (byHead.length) steps.push({ text: (byHead.length > 1 ? 'Keys ' + andList(byHead.map(function (i) { return L[i]; })) + ' have the wrong head' : 'Key ' + L[byHead[0]] + ' has the wrong head') + ': ' + andList(byHead.map(function (i) { return keys[i].head === 'oval' ? 'oval' : keys[i].head; })) + '.', marks: byHead.map(function (i) { return { id: 'k' + L[i] }; }) });
    var byT = keys.map(function (k, i) { return i; }).filter(function (i) { return keys[i].head === A.head && !keys[i].ans; });
    if (byT.length) steps.push({ text: (byT.length > 1 ? 'Keys ' + andList(byT.map(function (i) { return L[i]; })) + ' have the right head, but their teeth don’t match' : 'Key ' + L[byT[0]] + ' has the right head, but its teeth don’t match') + (level === 'hard' ? ': check them one tooth at a time.' : '.'), marks: byT.map(function (i) { return { id: 'k' + L[i] }; }) });
    steps.push({ text: 'Key ' + L[ans] + ' matches the print exactly.', marks: [{ id: 'k' + L[ans] }] });
    return {
      type: 'Which key', title: r.pick(set.title), setup: fill(set.setup, o4) + (kr > 90 ? ' The key was pressed in the other way up.' : ''), q: fill(set.q, o4), size: [400, 300], tap: true,
      choices: keys.map(function (k, i) { return { id: 'k' + L[i], label: 'Key ' + L[i] }; }), answer: 'k' + L[ans],
      scene: { bg: set.bg, items: items },
      hints: [{ text: 'Check the shape of the key’s head in the print first.' }, { text: kr > 90 ? 'The print is upside down. Start from the head and compare the teeth one by one.' : 'Then compare the teeth one by one, starting from the head.', at: { p: 'imp.print', pad: 3 } }],
      solution: { steps: steps, verdict: 'Key ' + L[ans] + (set.mat === 'soap' || set.mat === 'paper' ? ' opens the ' + lock + '.' : ' was copied.') },
      key: 'keys|' + set.mat + '|' + JSON.stringify(A) + '|' + keys.map(function (k) { return k.head + k.teeth.join(''); }).join(',') + '|' + kr,
      logic: { tpl: 'keys', print: A, keys: keys.map(function (k) { return { head: k.head, teeth: k.teeth }; }) }
    };
  };

  // ═════════════════════════════════════════════════════════════════════════
  // TIMELINE: candles burning down, ice melting, shadows that don't fit
  // ═════════════════════════════════════════════════════════════════════════
  T.timeline = function (r, level, occ) {
    var v = ['candles', 'ice', 'shadows'][(occ + hstr('timeline')) % 3];
    if (r.chance(0.3)) v = r.pick(['candles', 'ice', 'shadows']);
    return v === 'shadows' ? shadowAlibi(r, level) : burnOrMelt(r, level, v);
  };
  function burnOrMelt(r, level, v) {
    var N = level === 'easy' ? 4 : 5, gds = []; for (var i = 0; i < N; i++) gds.push(r.pick(['f', 'm']));
    var nm = names(r, gds, false), ask = level === 'hard' ? r.pick(['first', 'last', 'second']) : r.pick(['first', 'last']);
    // amounts left: distinct, with a gap that suits the level
    var amt = [], items = [], ids = nm.map(function (n2, i) { return 'p' + (i + 1); });
    if (v === 'candles') {
      var gap = level === 'easy' ? 9 : level === 'medium' ? 7 : 5, full = 56, lens = [];
      var pool = []; for (var L = 10; L <= 50; L += gap) pool.push(L);
      lens = r.sample(pool, N);
      var holders = lens.map(function () { return r.pick([6, 8, 12, 20, 30, 40]); });
      if (level !== 'easy') { var order = lens.map(function (l, i) { return i; }).sort(function (a, b) { return lens[a] - lens[b]; }); holders[order[0]] = 40; holders[order[N - 1]] = 6; }
      amt = lens;
      items.push(['window', { x: 16, y: 34, w: 60, h: 74, night: 1, frame: '#c9b48a', curtains: '#7a2e3a' }], ['frame', { x: 296, y: 22, w: 70, h: 44, art: r.pick(['mountain', 'boat']), bg: '#2a3a5a' }],
        ['fireplace', { x: 100, y: 248, w: 200, h: 96, logs: 1, fire: 1, color: '#9a6a4a' }], ['svg', { svg: '<rect x="88" y="140" width="224" height="12" rx="2" fill="#6a4126" stroke="#2b2433" stroke-width="1.2"/>' }]);
      var x0 = N === 5 ? 110 : 120, dx = N === 5 ? 45 : 54;
      lens.forEach(function (l, i) { items.push(['candle', { id: ids[i], x: x0 + i * dx, y: 140, len: l, holder: holders[i], drips: r.int(0, 3), seed: r.int(1, 30), holderc: r.pick(['#c9a227', '#b8862a', '#9aa3ad', '#c98a5a']) }]); items.push(['label', { x: x0 + i * dx, y: 162, text: nm[i], s: 0.78 }]); });
      items.push(['table', { x: 322, y: 282, w: 70, h: 46, color: '#8a5a34' }], ['candle', { id: 'ref', x: 356, y: 236, len: full, holder: 6, lit: false, holderc: '#9aa3ad' }], ['label', { x: 356, y: 250, text: 'New', s: 0.72 }], ['rug', { x: 200, y: 280, w: 200, color: '#7a2e3a' }]);
      if (r.chance(0.6)) items.push(['cat', { x: 54, y: 280, color: r.pick(['#3a3a46', '#e3a35a', '#9a9aa6']), whiteChest: 1, dir: 'R' }]);
    } else {
      // glasses of lemonade with ice: everyone got four cubes when they arrived
      var cubes = r.sample([0, 1, 2, 3, 4], N);
      if (level === 'easy') cubes = r.sample([0, 1, 2, 3, 4], N);
      amt = cubes;
      items.push(sv(bunting(0, 400, 14, r.shuffle(FLAGS))), ['table', { x: 22, y: 250, w: 356, h: 50, cloth: r.pick(['#fbf6e6', '#e8f2fb']), clothPat: 'check', clothPc: r.pick(['#3a8ad8', '#e0607a', '#3aa65a']) }]);
      var gx0 = N === 5 ? 60 : 72, gdx = N === 5 ? 58 : 70;
      cubes.forEach(function (c, i) { items.push(['glass', { id: ids[i], x: gx0 + i * gdx, y: 196, s: 1.7, level: r.pick([0.45, 0.6, 0.75, 0.9]), ice: c, color: r.pick(['#f2d34a', '#f6e27a']), straw: r.pick(['#e0384a', '#3a8ad8', '#3aa65a', '#f2c230']) }]); items.push(['label', { x: gx0 + i * gdx, y: 214, text: nm[i], s: 0.78 }]); });
      items.push(['svg', { svg: '<rect x="296" y="40" width="96" height="76" rx="4" fill="#fbf6e6" stroke="#2b2433" stroke-width="1.2"/>' }], ['glass', { id: 'ref', x: 344, y: 104, s: 1.7, level: 0.9, ice: 4, color: '#f2d34a' }], ['caption', { x: 344, y: 54, text: 'Just poured', size: 10, font: 'sans', weight: 700, fill: '#7a6a52' }]);
      items.push(['sun', { x: 40, y: 50, r: 14 }]);
    }
    // order of arrival: more burnt / more melted = arrived earlier
    var order = ids.map(function (id, i) { return i; }).sort(function (a, b) { return amt[a] - amt[b]; });
    var ansI = ask === 'first' ? order[0] : ask === 'last' ? order[N - 1] : order[1];
    var host = r.pick(['Grandma', 'Grandpa', 'Aunt Rose', 'Uncle Joe', 'Mum', 'Dad']);
    var setup, q, steps = [], hints;
    if (v === 'candles') {
      setup = r.pick(['At the lake cabin, each cousin lit a brand-new candle on the mantel the moment they arrived.', 'On the night of the power cut, each of the cousins lit a new candle on the mantelpiece as soon as they got in.', 'At ' + poss(host) + ' cottage, every guest lights a new candle on the mantel when they arrive.']) + ' All the candles came from the same box and burn at the same speed. None has been blown out yet.';
      q = 'Who got there ' + ask + '?';
      steps.push({ text: 'A new candle from the box is this long, and every candle on the mantel started out the same.', marks: [{ id: 'ref', pad: 2 }] });
      if (level !== 'easy') steps.push({ text: 'The holders are different heights, so the flames are no help. Only the wax counts: the shorter the candle, the longer it has burned.', marks: [] });
      steps.push({ text: ask === 'first' ? poss(nm[ansI]) + ' candle is the shortest of all, so it has been burning the longest.' : ask === 'last' ? poss(nm[ansI]) + ' candle is the longest, so it was lit most recently.' : poss(nm[order[0]]) + ' candle is the shortest, and ' + poss(nm[ansI]) + ' is the next shortest.', marks: [{ id: ids[ansI], pad: -1 }].concat(ask === 'second' ? [{ id: ids[order[0]], pad: -1 }] : []) });
      hints = [{ text: 'A candle gets shorter the longer it burns. Look at the wax, not the holders.' }, { text: 'Compare each candle with the new one on the side table.', at: { id: 'ref', pad: 4 } }];
    } else {
      setup = r.pick(['At ' + poss(host) + ' garden party, everyone got a glass of lemonade with four ice cubes the moment they arrived.', 'It was a scorching day. As each friend arrived at the picnic, ' + host + ' handed them a lemonade with four ice cubes in it.']) + ' The ice melts at the same speed in every glass. How much lemonade they have drunk doesn’t matter.';
      q = 'Who arrived ' + ask + '?';
      steps.push({ text: 'A freshly poured glass has four ice cubes. The longer a glass has been standing, the more ice has melted.', marks: [{ id: 'ref', pad: 2 }] });
      steps.push({ text: ask === 'first' ? poss(nm[ansI]) + ' glass has the fewest ice cubes left' + (amt[ansI] === 0 ? ': they’ve all melted' : '') + ', so it has been standing the longest.' : ask === 'last' ? poss(nm[ansI]) + ' glass has the most ice left, so it was poured most recently.' : poss(nm[order[0]]) + ' glass has the fewest cubes, and ' + poss(nm[ansI]) + ' has the next fewest.', marks: [{ id: ids[ansI], pad: 2 }].concat(ask === 'second' ? [{ id: ids[order[0]], pad: 2 }] : []) });
      hints = [{ text: 'Ice melts the longer it sits. Ignore how full the glasses are.' }, { text: 'Count the ice cubes in each glass.', at: { id: ids[order[1]], pad: 4 } }];
    }
    return {
      type: 'Timeline', title: v === 'candles' ? r.pick(['Home Before Dark', 'Burning the Candle', 'Wax Works', 'Candlelight']) : r.pick(['On the Rocks', 'Melting Moments', 'Ice to Meet You', 'The Lemonade Clue']),
      setup: setup, q: q, size: [400, 300], tap: true,
      choices: ids.map(function (id, i) { return { id: id, label: nm[i] }; }), answer: ids[ansI],
      scene: { bg: v === 'candles' ? ['room', { wall: '#2f3a52', paper: 'stripes', floorY: 248, floor: '#7a5233' }] : ['outside', { groundY: 210, ground: '#79b85a', hills: '#9fcf7a' }], items: items },
      hints: hints, solution: { steps: steps, verdict: nm[ansI] + ' arrived ' + ask + '.' },
      key: 'timeline|' + v + '|' + ask + '|' + amt.join(','),
      logic: { tpl: 'timeline', v: v, ask: ask, amounts: amt }
    };
  }
  function shadowAlibi(r, level) {
    var N = 4, gds = []; for (var i = 0; i < N; i++) gds.push(r.pick(['f', 'm']));
    var nm = names(r, gds, false), fake = r.int(0, N - 1), dirR = r.chance(0.5) ? 1 : -1, hour = r.pick([9, 10, 4, 5]);
    var mode = level === 'easy' ? 'short' : level === 'medium' ? r.pick(['short', 'dir']) : 'dir';
    var props = r.shuffle(['tree', 'pond', 'hay', 'sign']);
    var farm = r.pick(['Clover Farm', 'Hill Top Farm', 'Meadow Farm', 'Brook Farm', 'Apple Tree Farm']);
    function snap(i) {
      var long = !(i === fake && mode === 'short'), d = i === fake && mode === 'dir' ? -dirR : dirR, items = [], len = long ? 46 : 4, prop = props[i], px = 64;
      if (prop === 'tree') items.push(['castShadow', { x: px, y: 98, w: 6, len: long ? 24 : 3, th: 14, back: 0, head: false, op: 0.36, dir: d }], ['tree', { x: px, y: 98, size: 0.3 }]);
      if (prop === 'pond') items.push(sv('<ellipse cx="66" cy="104" rx="20" ry="5" fill="#7cc0e8" stroke="#4a8ac2" stroke-width="1"/>'));
      if (prop === 'hay') items.push(['castShadow', { x: px, y: 98, w: 20, len: long ? 22 : 3, head: false, op: 0.36, dir: d }], sv('<rect x="54" y="84" width="20" height="14" rx="3" fill="#e3c27a" stroke="#2b2433" stroke-width="1"/><path d="M56 89h16M56 93h16" stroke="#c9a24a" stroke-width="1"/>'));
      if (prop === 'sign') items.push(['castShadow', { x: px, y: 98, w: 4, len: long ? 12 : 3, th: 5, back: 0, head: false, op: 0.36, dir: d }], ['sign', { x: 54, y: 78, w: 22, h: 12, text: 'EGGS', size: 6, post: 20, ink: '#7a4a2a' }]);
      var cx = d > 0 ? 24 : 44;
      if (prop === 'tree' || prop === 'hay' || prop === 'sign') cx = d > 0 ? 18 : 30;
      items.push(['castShadow', { id: 'sh' + i, x: cx, y: 98, w: 12, len: len, th: 12, back: 0.02, op: 0.5, dir: d }]);
      var L0 = look(r, gds[i], true); L0.armR = 'wave';
      items.push(personItem(L0, 'kid' + i, cx, 98, 0.42, null));
      if (mode === 'dir' && level === 'hard' && r.chance(0.4)) items.push(['cloud', { x: 60, y: 22, s: 0.5 }]);
      else if (!long) items.push(['sun', { x: 46, y: 16, r: 6 }]);
      return items;
    }
    var items = [], ref = [];
    ref.push(['sun', { x: dirR > 0 ? 22 : 354, y: 30, r: 12 }], ['barn', { x: 60, y: 116, w: 120, h: 72 }], ['clock', { id: 'clk', x: 120, y: 32, r: 11, h: hour, m: 0, nums: 1 }]);
    [214, 254, 294].forEach(function (x, k) { ref.push(['castShadow', { id: k ? null : 'postsh', x: x, y: 124, w: 6, len: 46, th: 9, back: 0.04, head: false, op: 0.48, dir: dirR }], ['post', { x: x, y: 124, h: 34 }]); });
    ref.push(sv('<path d="M208 104h96M208 114h96" stroke="#8a5a34" stroke-width="2.4"/>'));
    var skyA = hour < 12 ? '#bfe0f2' : '#f4c98a', skyB = hour < 12 ? '#eaf6fb' : '#fde9c8';
    items.push(['photo', { x: 12, y: 10, w: 376, h: 150, caption: poss(r.pick(['Farmer Jo', 'Farmer Sam', 'Farmer Ruth', 'Farmer Ali'])) + ' photo at ' + hour + ' o’clock', r: -0.5, bg: ['outside', { groundY: 112, ground: '#86c66a', sky: skyA, sky2: skyB }], items: ref }]);
    for (i = 0; i < N; i++) items.push(['photo', { id: 'ph' + i, x: 14 + i * 96, y: 196, w: 84, h: 112, caption: nm[i], r: [-3, 2, -1.5, 3][i], bg: ['outside', { groundY: 72, ground: '#86c66a', sky: skyA, sky2: skyB }], items: snap(i) }]);
    var others = []; for (i = 0; i < N; i++) if (i !== fake) others.push(i);
    var side = dirR > 0 ? 'right' : 'left', oside = dirR > 0 ? 'left' : 'right';
    var steps = [{ text: 'In the farmer’s photo, taken at ' + hour + ' o’clock, the fence posts cast long shadows pointing to the ' + side + '.', marks: [{ id: 'clk' }, { id: 'postsh', pad: 2 }] },
      { text: andList(others.map(function (k) { return nm[k]; })) + ' all have long shadows pointing ' + side + ' too, so their photos fit.', marks: others.map(function (k) { return { id: 'sh' + k, pad: 1 }; }) },
      { text: mode === 'short' ? poss(nm[fake]) + ' shadow is just a little spot under ' + pron(gds[fake]).his + ' feet. The sun was high in the sky: that photo was taken around midday.' : poss(nm[fake]) + ' shadow points to the ' + oside + ', so the sun was on the other side of the sky. That photo was taken at a different time of day.', marks: [{ id: 'sh' + fake, pad: 4 }] }];
    return {
      type: 'Timeline', title: r.pick(['Shadows at ' + farm, 'The Shadow Knows', 'A Shady Alibi', 'Picture Perfect?']), size: [400, 340], tap: true,
      setup: 'Someone left the gate of the goat pen open at ' + farm + ' at ' + hour + ' o’clock. Four helpers each showed the farmer a photo of themselves, taken at ' + hour + ' o’clock somewhere else on the farm. The farmer took a photo of the barn at exactly ' + hour + ' o’clock too. One alibi photo is a fake.',
      q: r.pick(['Whose photo was NOT taken at ' + hour + ' o’clock?', 'Whose alibi photo is the fake?']),
      choices: nm.map(function (n2, i) { return { id: 'ph' + i, label: n2 }; }), answer: 'ph' + fake,
      scene: { bg: ['desk', { color: r.pick(['#7a5233', '#6e4a2e']) }], items: items },
      hints: [{ text: 'The farmer’s photo shows how long the shadows were at ' + hour + ' o’clock, and which way they pointed.' }, { text: mode === 'short' ? 'Compare each helper’s shadow with the fence posts’ shadows.' : 'Check which way every shadow points.', at: { id: 'postsh', pad: 6 } }],
      solution: { steps: steps, verdict: poss(nm[fake]) + ' photo is a fake. ' + nm[fake] + ' left the gate open.' },
      key: 'timeline|shadows|' + mode + '|' + dirR + '|' + hour + '|' + fake + '|' + props.join(','),
      logic: { tpl: 'timeline', v: 'shadows', mode: mode, fake: fake }
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SEATING: a round table from above; find someone's place from their habits
  // ═════════════════════════════════════════════════════════════════════════
  // a habit: what it says, how to test a seat, and how to make a seat fit it or not
  var HABITS = {
    lefty: { say: ['{N} is left-handed, so {he} always swaps {his} knife and fork.', '{N} eats left-handed: {his} fork goes on the right.'], test: function (s) { return s.fork === 'R'; }, yes: function (s) { s.fork = 'R'; }, no: function (s) { s.fork = 'L'; }, part: 'fork', noS: 'fork on the left', yesS: 'knife and fork swapped', lv: 'emh' },
    black: { say: ['{He} drinks {his} coffee black.', '{He} never takes milk in {his} coffee.'], test: function (s) { return s.cup === '#3a2414'; }, yes: function (s) { s.cup = '#3a2414'; }, no: function (s) { s.cup = '#c8a27a'; }, part: 'cup', noS: 'milky coffee', yesS: 'black coffee', lv: 'emh' },
    milk: { say: ['{He} always has lots of milk in {his} coffee.', '{He} likes {his} coffee milky.'], test: function (s) { return s.cup === '#c8a27a'; }, yes: function (s) { s.cup = '#c8a27a'; }, no: function (s) { s.cup = '#3a2414'; }, part: 'cup', noS: 'black coffee', yesS: 'milky coffee', lv: 'emh' },
    hat: { say: ['{He} hangs {his} hat on the back of {his} chair.', '{He} came in a hat and hung it on {his} chair.'], test: function (s) { return !!s.hat; }, yes: function (s, r) { s.hat = r.pick(['#3a4a6a', '#7a3b2a', '#2f3a2f']); s.scarf = null; s.bag = null; }, no: function (s, r) { s.hat = null; if (r.chance(0.5)) s[r.pick(['scarf', 'bag'])] = r.pick(['#c0392b', '#9b59b6', '#3a8a4a']); }, part: 'hat', noS: 'no hat', yesS: 'a hat', lv: 'emh', chair: 1 },
    scarf: { say: ['{He} left {his} scarf on {his} chair.', '{He} hung {his} scarf over {his} chair.'], test: function (s) { return !!s.scarf; }, yes: function (s, r) { s.scarf = r.pick(['#c0392b', '#3a8a4a', '#e8862a']); s.hat = null; s.bag = null; }, no: function (s, r) { s.scarf = null; if (r.chance(0.5)) s[r.pick(['hat', 'bag'])] = r.pick(['#3a4a6a', '#9b59b6', '#7a3b2a']); }, part: 'scarf', noS: 'no scarf', yesS: 'a scarf', lv: 'mh', chair: 1 },
    lipstick: { say: ['{He} wears bright red lipstick.', '{He} always wears red lipstick.'], test: function (s) { return !!s.lipstick; }, yes: function (s) { s.lipstick = 1; }, no: function (s) { s.lipstick = 0; }, part: 'cup', noS: 'no lipstick on the cup', yesS: 'lipstick on the cup', lv: 'mh', f: 1 },
    sugar: { say: ['{He} takes a sugar lump with {his} coffee, but never eats it.', '{He} always asks for a sugar lump, then leaves it on the saucer.'], test: function (s) { return !!s.sugar; }, yes: function (s) { s.sugar = 1; }, no: function (s) { s.sugar = 0; }, part: 'cup', noS: 'no sugar lump', yesS: 'a sugar lump', lv: 'mh' },
    peas: { say: ['{He} can’t stand peas and always leaves them.', '{He} never eats {his} peas.'], test: function (s) { return !!s.peas; }, yes: function (s) { s.peas = 1; }, no: function (s) { s.peas = 0; }, part: 'fork', noS: 'no peas left', yesS: 'peas left over', lv: 'h', plate: 1 },
    cane: { say: ['{He} walks with a cane and props it against {his} chair.', '{He} leans {his} walking stick on {his} chair.'], test: function (s) { return !!s.cane; }, yes: function (s) { s.cane = 1; }, no: function (s) { s.cane = 0; }, part: 'cane', noS: 'no cane', yesS: 'a cane', lv: 'emh', chair: 1 }
  };
  var SEAT_SETS = [
    { key: 'reunion', cloth: '#f7f2e6', chair: '#8a5a34', floor: '#b88a5e', setup: 'At the family reunion dinner, a gust of wind blew every place card off the table. {N} left {his} wallet behind, and {Host} wants to know where {he} sat.', q: 'Which seat was {N}’s?' },
    { key: 'cafe', cloth: '#e8f2fb', chair: '#3a3a46', floor: '#c9a77a', setup: 'The book club met at the café, and somebody left a library book under the table. It’s {N}’s, but nobody remembers where {he} sat.', q: 'Where did {N} sit?' },
    { key: 'birthday', cloth: '#fbe8ef', chair: '#c98a3a', floor: '#a8784a', setup: 'After {Host}’s birthday lunch, {N} phoned: {he} left {his} glasses case on {his} chair. Everyone has gone home, and the waiter needs to find the right seat.', q: 'Which seat was {N}’s?' },
    { key: 'captain', cloth: '#f4efe4', chair: '#2f5a8a', floor: '#6a8aa8', setup: 'On the cruise ship, the captain’s dinner guests have all gone up on deck. {N} lost an earring at the table and wants to know which seat {he} had.', q: 'Which seat did {N} have?' }
  ];
  T.seating = function (r, level, occ) {
    var set = SEAT_SETS[(occ + hstr('seat')) % SEAT_SETS.length]; if (r.chance(0.3)) set = r.pick(SEAT_SETS);
    var N = level === 'easy' ? 5 : level === 'medium' ? 6 : r.pick([6, 7]), k = level === 'easy' ? 2 : level === 'medium' ? 3 : 4;
    var gd = r.pick(['f', 'm']), lvc = level.charAt(0);
    var pool = Object.keys(HABITS).filter(function (h) { return HABITS[h].lv.indexOf(lvc) >= 0 && (!HABITS[h].f || gd === 'f'); });
    // never two habits about the same thing (cup colour, chair)
    var K = [], usedCup = false, usedChair = false;
    r.shuffle(pool).forEach(function (h) {
      if (K.length >= k) return;
      var H = HABITS[h];
      if ((h === 'black' || h === 'milk') && usedCup) return;
      if (H.chair && usedChair) return;
      if (h === 'black' || h === 'milk') usedCup = true;
      if (H.chair) usedChair = true;
      K.push(h);
    });
    function blank() { return { food: r.pick(['#d98a3a', '#c9a24a', '#b8643a']), fork: r.chance(0.75) ? 'L' : 'R', cup: r.pick(['#3a2414', '#c8a27a']), cupSide: 'R' }; }
    var seats = [], target = blank();
    K.forEach(function (h) { HABITS[h].yes(target, r); });
    // decoys: the first k each break exactly one habit; the rest break one or two
    for (var i = 0; i < N - 1; i++) {
      var s = JSON.parse(JSON.stringify(target)), br = i < k ? [K[i]] : r.sample(K, r.pick([1, 2]));
      // a little extra variety on things that aren't clues
      if (K.indexOf('lefty') < 0 && r.chance(0.3)) s.fork = r.pick(['L', 'R']);
      if (K.indexOf('black') < 0 && K.indexOf('milk') < 0) s.cup = r.pick(['#3a2414', '#c8a27a']);
      br.forEach(function (h) { HABITS[h].no(s, r); });
      s.breaks = br;
      seats.push(s);
    }
    target.breaks = [];
    var pos = r.int(0, N - 1); seats.splice(pos, 0, target);
    // things nobody's habits mention, so they can't help or hurt
    seats.forEach(function (s) {
      if (K.indexOf('hat') < 0 && K.indexOf('scarf') < 0 && !s.hat && !s.scarf && !s.bag && r.chance(0.3)) s.bag = r.pick(['#9b59b6', '#c0392b', '#3a6ea5']);
      if (K.indexOf('lipstick') < 0) s.lipstick = gd === 'm' && r.chance(0.25) ? 1 : 0;
      if (K.indexOf('sugar') < 0 && r.chance(0.25)) s.sugar = 1;
      if (K.indexOf('peas') < 0 && r.chance(0.2)) s.peas = 1;
    });
    // safety: the target is the only seat that fits every habit
    var fitsAll = seats.map(function (s) { return K.every(function (h) { return HABITS[h].test(s); }); });
    var items = [];
    items.push(['svg', { svg: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (i2) { return '<path d="M0 ' + (i2 * 32 + 14) + 'H400" stroke="' + MysteryScene_shade(set.floor) + '" stroke-width="1.2"/>'; }).join('') }]);
    items.push(['svg', { svg: '<rect x="20" y="16" width="360" height="268" rx="16" fill="#7a2e3a" opacity=".5"/>' }]);
    items.push(['troundtable', { x: 200, y: 150, r: 86, ss: 1.35, cs: 1.2, tagR: 34, tagDx: 34, cloth: set.cloth, chair: set.chair, seats: seats.map(function (s) { return { food: s.food, fork: s.fork, cup: s.cup, cupSide: 'R', hat: s.hat, scarf: s.scarf, bag: s.bag, cane: s.cane, lipstick: s.lipstick, sugar: s.sugar, peas: s.peas }; }) }]);
    items.push(sv('<circle cx="200" cy="150" r="15" fill="#fff" stroke="#2b2433" stroke-width="1"/>' + [0, 1, 2, 3, 4].map(function (i3) { var a = i3 * 1.256; return '<circle cx="' + R1(200 + Math.cos(a) * 6) + '" cy="' + R1(150 + Math.sin(a) * 6) + '" r="3" fill="' + r.pick(['#e04a6a', '#f2c230', '#9b59b6']) + '" stroke="#2b2433" stroke-width=".6"/>'; }).join('')));
    var nmT = names(r, [gd], false)[0], hostG = r.pick(['f', 'm']), host = hostG === 'f' ? r.pick(['Aunt Jen', 'Grandma', 'Aunt Mo', 'Mrs. ' + r.pick(SUR)]) : r.pick(['Uncle Al', 'Grandpa', 'Mr. ' + r.pick(SUR)]);
    var titled = gd === 'f' ? r.pick(['Aunt ', 'Great-aunt ', '', 'Cousin ']) : r.pick(['Uncle ', 'Great-uncle ', '', 'Cousin ']), who = titled + nmT, pr = pron(gd);
    var tt = { N: who, he: pr.he, He: pr.He, his: pr.his, Host: host };
    var habitsText = K.map(function (h, j) { var t = r.pick(HABITS[h].say); if (j === 0) t = t.replace('{He}', '{N}'); return fill(t.replace(/^\{N\}/, j === 0 ? '{N}' : '{He}'), tt); }).join(' ');
    var setup = fill(set.setup, tt) + ' ' + habitsText;
    // solution: one habit at a time
    var alive = seats.map(function () { return true; }), steps = [];
    K.forEach(function (h) {
      var H = HABITS[h], fit = [], out = [];
      seats.forEach(function (s, i4) { if (!alive[i4]) return; if (H.test(s)) fit.push(i4); else { out.push(i4); alive[i4] = false; } });
      var nos = out.map(function (i4) { return i4 + 1; });
      var t = cap(H.yesS) + ' at seat' + (fit.length > 1 ? 's ' : ' ') + andList(fit.map(function (i4) { return String(i4 + 1); })) + (out.length ? '. Seat' + (nos.length > 1 ? 's ' : ' ') + andList(nos.map(String)) + (nos.length > 1 ? ' have ' : ' has ') + H.noS + '.' : '.');
      if (h === 'lefty') t = (fit.length > 1 ? 'Seats ' : 'Seat ') + andList(fit.map(function (i4) { return String(i4 + 1); })) + (fit.length > 1 ? ' have' : ' has') + ' the knife and fork swapped' + (out.length ? '; the others have the fork on the left.' : '.');
      steps.push({ text: t, marks: fit.slice(0, 4).map(function (i4) { return { p: 'seat' + (i4 + 1) + '.' + H.part, pad: 2 }; }) });
    });
    var last = steps[steps.length - 1]; last.text += ' Only seat ' + (pos + 1) + ' fits everything.';
    return {
      type: 'Seating', title: r.pick(['Where Did ' + who + ' Sit?', poss(who) + ' Seat', 'The Empty Chair', 'Table Manners', 'Take a Seat']).replace(/^(.{27}).*$/, 'Take a Seat'), setup: setup, q: fill(set.q, tt), size: [400, 300], tap: false,
      choices: seats.map(function (s, i5) { return { id: 's' + (i5 + 1), label: 'Seat ' + (i5 + 1) }; }), answer: 's' + (pos + 1),
      scene: { bg: ['top', { color: set.floor, texture: false }], items: items },
      hints: [{ text: 'Check every place at the table for each of the ' + numw(k) + ' things ' + who + ' always does.' }, { text: 'Start with ' + { lefty: 'the knives and forks: most people keep the fork on their left', black: 'the coffee cups: which coffee is black?', milk: 'the coffee cups: which coffee is milky?', hat: 'the chairs: which has a hat on it?', scarf: 'the chairs: which has a scarf?', lipstick: 'the cups: which has lipstick on the rim?', sugar: 'the saucers: which has a sugar lump?', peas: 'the plates: who left peas?', cane: 'the chairs: which has a cane?' }[K[0]] + '.' }],
      solution: { steps: steps, verdict: who + ' sat in seat ' + (pos + 1) + '.' },
      key: 'seating|' + K.join(',') + '|' + JSON.stringify(seats.map(function (s) { return [s.fork, s.cup, s.hat ? 1 : 0, s.scarf ? 1 : 0, s.bag ? 1 : 0, s.cane ? 1 : 0, s.lipstick, s.sugar ? 1 : 0, s.peas ? 1 : 0]; })) + '|' + pos,
      logic: { tpl: 'seating', habits: K, fits: fitsAll }
    };
  };
  function MysteryScene_shade(c) { var x = rgb(c); return '#' + x.map(function (v) { return ('0' + Math.round(v * 0.85).toString(16)).slice(-2); }).join(''); }

  // ═════════════════════════════════════════════════════════════════════════
  // IMPOSTOR: a company logo on the van vs everyone's badge, or a portrait vs claimants
  // ═════════════════════════════════════════════════════════════════════════
  var FIRMS = [
    { name: 'DRIP-FIX', sub: 'Plumbing', full: 'Drip-Fix Plumbing', job: 'a leaky sink', logo: { shape: 'drop', mark: 'wrench', color: '#2f8fd6' }, uni: '#1a9a9a', van: '#f4f4f4', stripe: '#1a9a9a', ink: '#16707a' },
    { name: 'BRIGHT SPARK', sub: 'Electricians', full: 'Bright Spark Electricians', job: 'a broken light', logo: { shape: 'circle', mark: 'bolt', color: '#e8862a' }, uni: '#2b3a5a', van: '#f4f0e6', stripe: '#e8862a', ink: '#2b3a5a' },
    { name: 'GREEN THUMB', sub: 'Gardeners', full: 'Green Thumb Gardeners', job: 'an overgrown hedge', logo: { shape: 'leaf', mark: 'bar', color: '#3a8a4a' }, uni: '#3a8a4a', van: '#f4f4f4', stripe: '#3a8a4a', ink: '#2a6a3a' },
    { name: 'SAFE-LOCK', sub: 'Locksmiths', full: 'Safe-Lock Locksmiths', job: 'a stuck front-door lock', logo: { shape: 'shield', mark: 'dot', color: '#8a4aa0' }, uni: '#3a3a46', van: '#f4f0e6', stripe: '#8a4aa0', ink: '#5a2a6a' },
    { name: 'HOMEFIX', sub: 'Builders', full: 'HomeFix Builders', job: 'a wobbly wall', logo: { shape: 'house', mark: 'bar', color: '#c0392b' }, uni: '#e8b830', van: '#f4f4f4', stripe: '#c0392b', ink: '#8a2a20' },
    { name: 'STAR SHINE', sub: 'Window cleaners', full: 'Star Shine Window Cleaners', job: 'some very dirty windows', logo: { shape: 'star', mark: 'dot', color: '#e8b830' }, uni: '#3a6ea5', van: '#f4f4f4', stripe: '#3a6ea5', ink: '#2a4a7a' }
  ];
  T.impostor = function (r, level, occ) {
    if (level === 'hard' && r.chance(0.6)) return portrait(r, level);
    var F = FIRMS[(occ + hstr('firm')) % FIRMS.length]; if (r.chance(0.3)) F = r.pick(FIRMS);
    var N = level === 'easy' ? 3 : 4, real = JSON.parse(JSON.stringify(F.logo));
    var shapes = ['drop', 'circle', 'shield', 'star', 'house', 'leaf'], marks = ['wrench', 'bolt', 'bar', 'dot'], cols = ['#2f8fd6', '#e8862a', '#3a8a4a', '#8a4aa0', '#c0392b', '#e8b830'];
    var hasTilt = real.mark === 'wrench' || real.mark === 'bolt' || real.mark === 'bar';
    var fakes = [], sigs = {}; sigs[JSON.stringify(real)] = 1;
    var modes = level === 'easy' ? ['shape', 'color', 'mark'] : level === 'medium' ? ['color', 'mark'].concat(hasTilt ? ['tilt', 'tilt'] : ['shape']) : (hasTilt ? ['tilt', 'mark', 'tilt'] : ['mark', 'color']);
    var guard = 0;
    while (fakes.length < N - 1 && guard++ < 100) {
      var f = JSON.parse(JSON.stringify(real)), m = modes[fakes.length % modes.length];
      if (m === 'shape') f.shape = r.pick(shapes.filter(function (x) { return x !== real.shape; }));
      if (m === 'color') f.color = r.pick(cols.filter(function (x) { return cdist(x, real.color) > 90; }));
      if (m === 'mark') f.mark = r.pick(marks.filter(function (x) { return x !== real.mark; }));
      if (m === 'tilt') f.tilt = real.tilt === 'L' ? 'R' : 'L';
      var sg = JSON.stringify(f); if (sigs[sg]) continue; sigs[sg] = 1; f.mode = m; fakes.push(f);
    }
    var people = r.shuffle([{ logo: real, real: true }].concat(fakes.map(function (f) { return { logo: f }; })));
    var gds = people.map(function () { return r.pick(['f', 'm']); }), nm = names(r, gds, false), ans = people.map(function (p) { return !!p.real; }).indexOf(true);
    var items = [['cloud', { x: 60, y: 34 }], ['house', { x: 236, y: 196, w: 156, h: 136, color: r.pick(['#e9d7b9', '#d8e2ea', '#f0d8c8']), roof: r.pick(['#4a5a6a', '#7a3a2a', '#3a4a3a']), door: r.pick(['#2f6a5a', '#7a2e3a', '#3a6ea5']) }], ['bush', { x: 386, y: 200, w: 30, flowers: '#e04a6a' }]];
    items.push(['van', { id: 'van', x: 104, y: 214, s: 1.24, color: F.van, stripe: F.stripe, logo: real, name: F.name, sub: F.sub, ink: F.ink }]);
    var sc = 0.98, x0 = N === 3 ? 232 : 196, dx = N === 3 ? 66 : 62;
    people.forEach(function (p, i) {
      var L0 = look(r, gds[i], false); L0.top = F.uni; L0.pat = 'plain'; L0.lc = F.uni === '#e8b830' ? '#3a3a46' : F.uni; L0.legs = 'pants'; L0.shoe = r.pick(['boot', 'sneaker']); L0.acc = []; if (r.chance(0.5)) { L0.armR = 'hold'; L0.holdR = 'toolbox'; }
      var pi = personItem(L0, 'w' + i, x0 + i * dx, 290 - (i % 2) * 4, sc, nm[i], { tagY: 12, belt: '#2b2b33', tbc: r.pick(['#c0392b', '#3a6ea5', '#3a3a46']) });
      pi[1].top = F.uni;
      items.push(pi);
      items.push(['logo', { x: x0 + i * dx + 7.5 * sc, y: 290 - (i % 2) * 4 - 77 * sc, r: 5.4, s: sc, logo: p.logo, p: 'w' + i + '.badge' }]);
    });
    var family = 'the ' + r.pick(SUR) + 's';
    var setup = cap(family) + ' called ' + F.full + ' about ' + F.job + ', and the company’s van just parked outside. Then ' + numw(N) + ' people in work clothes knocked at the door, all saying they were from ' + F.full + '. ' + (N === 3 ? 'Two of them are' : 'Three of them are') + ' tricksters after a free lunch.';
    function diff(f) {
      if (f.mode === 'shape') return 'the wrong shape';
      if (f.mode === 'color') return 'the wrong colour';
      if (f.mode === 'mark') return 'a different sign inside';
      return 'the sign inside facing the wrong way, like a copy made in a mirror';
    }
    var steps = [{ text: 'The real ' + F.full + ' logo is on the van. Look at its shape, its colour and the sign inside it' + (hasTilt ? ', and which way that sign leans' : '') + '.', marks: [{ p: 'van.logo', pad: 2 }] }];
    people.forEach(function (p, i) { if (!p.real) steps.push({ text: poss(nm[i]) + ' badge has ' + diff(p.logo) + '.', marks: [{ p: 'w' + i + '.badge', pad: 3 }] }); });
    steps.push({ text: poss(nm[ans]) + ' badge matches the van exactly.', marks: [{ p: 'w' + ans + '.badge', pad: 3 }] });
    return {
      type: 'Impostor', title: r.pick(['Who’s the Real ' + F.sub.replace(/s$/, '').replace('Window cleaner', 'Window Cleaner') + '?', 'Badge of Honour', 'The Copycat Workers', 'Spot the Fake']), setup: setup,
      q: 'Who really works for ' + F.full + '?', size: [400, 300], tap: true,
      choices: nm.map(function (n2, i) { return { id: 'w' + i, label: n2 }; }), answer: 'w' + ans,
      scene: { bg: ['outside', { groundY: 186, ground: '#79b85a', walk: [196, 104], walkColor: '#d6cfc0' }], items: items },
      hints: [{ text: 'Anyone can buy a work outfit. Compare everyone’s badge with the logo on the van.' }, { text: level === 'easy' ? 'Check the shape, the colour and the sign inside each badge.' : 'Look closely at the sign inside each badge, and which way it faces.', at: { p: 'van.logo', pad: 3 } }],
      solution: { steps: steps, verdict: nm[ans] + ' is the real one.' },
      key: 'impostor|logo|' + F.name + '|' + people.map(function (p) { return JSON.stringify(p.logo); }).join(';'),
      logic: { tpl: 'impostor', v: 'logo', real: real, badges: people.map(function (p) { return p.logo; }) }
    };
  };
  function portrait(r, level) {
    var gd = r.pick(['f', 'm']), N = r.pick([3, 4]);
    // permanent marks: mole (side), nicked ear (side), scar (side)
    var kinds = r.sample(['mole', 'ear', 'scar'], level === 'hard' ? 3 : 2), A = {};
    kinds.forEach(function (k) { A[k] = r.pick(['L', 'R']); });
    var claim = [{ m: JSON.parse(JSON.stringify(A)), real: true }], sigs = {}; sigs[JSON.stringify(A)] = 1;
    var modes = r.shuffle(['mirror', 'missing', 'oneside']), guard = 0;
    while (claim.length < N && guard++ < 50) {
      var m = JSON.parse(JSON.stringify(A)), md = modes[(claim.length - 1) % modes.length], why;
      if (md === 'mirror') { kinds.forEach(function (k) { m[k] = A[k] === 'L' ? 'R' : 'L'; }); why = 'has the marks on the wrong sides, as if copied from a mirror'; }
      else if (md === 'missing') { var k0 = r.pick(kinds); delete m[k0]; why = 'has no ' + { mole: 'mole', ear: 'nick in the ear', scar: 'scar' }[k0]; }
      else { var k1 = r.pick(kinds); m[k1] = A[k1] === 'L' ? 'R' : 'L'; why = 'has the ' + { mole: 'mole', ear: 'nicked ear', scar: 'scar' }[k1] + ' on the wrong side'; }
      var sg = JSON.stringify(m); if (sigs[sg]) continue; sigs[sg] = 1;
      claim.push({ m: m, why: why });
    }
    claim = r.shuffle(claim);
    var ans = claim.map(function (c) { return !!c.real; }).indexOf(true);
    var title0 = gd === 'f' ? r.pick(['Lady', 'Duchess', 'Great-aunt']) : r.pick(['Lord', 'Sir', 'Great-uncle']), first = r.pick(gd === 'f' ? ['Ada', 'Beatrice', 'Clara', 'Edith', 'Florence', 'Harriet'] : ['Edmund', 'Albert', 'Cecil', 'Rupert', 'Hugo', 'Percy']), who = title0 + ' ' + first;
    var manor = r.pick(['Blackwood Manor', 'Hollyhock Hall', 'Raven Court', 'Thornbury House', 'Ashcombe Hall']);
    function acc(m, wall) { var a = []; if (m.mole) a.push('mole:' + m.mole + ':1.5'); if (m.ear) a.push('notch' + m.ear + ':' + wall); if (m.scar) a.push('scar:' + m.scar); return a; }
    var wall = r.pick(['#3d5a4c', '#5a3d4c', '#3d4c5a']), skin = r.int(0, 5), hcN = r.pick(['black', 'brown', 'ginger', 'blond']);
    var pItem = ['person', { id: 'sitter', x: 60, y: 300, s: 2.2, skin: skin, hair: gd === 'f' ? 'bun' : 'side', hc: HAIRC[hcN], top: '#f4f0e6', coat: r.pick(['#2f5a3a', '#5a2a3a', '#2b3a5a']), acc: acc(A, '#6a4a36').concat(gd === 'm' ? ['tie:#a8202e'] : ['necklace:#e8c34a']), stache: gd === 'm' && r.chance(0.5) ? 1 : 0, mouth: 'flat', blush: false }];
    var items = [['frame', { id: 'portrait', x: 140, y: 8, w: 120, h: 110, color: '#c9a227', bg: '#7a5a3a', plate: who.toUpperCase(), items: [['svg', { svg: '<rect width="120" height="112" fill="#6a4a36"/><circle cx="60" cy="40" r="50" fill="#8a6a46" opacity=".5"/>' }], pItem] }],
      ['lamp', { x: 36, y: 250, color: '#e8c34a', on: 1 }], ['plant', { x: 372, y: 250, s: 1.1, pot: '#7a3b2a' }], ['rug', { x: 200, y: 288, w: 340, color: '#7a2e3a' }]];
    var xs = N === 3 ? [82, 200, 318] : [62, 152, 248, 338], gds = claim.map(function () { return gd; }), nm = names(r, gds, true);
    claim.forEach(function (c, i) {
      var L0 = look(r, gd, false); L0.skin = skin; L0.hcName = hcN; L0.hair = gd === 'f' ? r.pick(['bun', 'long', 'bob', 'pony', 'short']) : r.pick(['side', 'short', 'curly', 'spiky']);
      L0.acc = acc(c.m, wall); if (gd === 'm' && r.chance(0.5)) L0.stache = 1; L0.glasses = null; L0.mouth = r.pick(['smile', 'flat', 'smirk']);
      var it = personItem(L0, 'c' + i, xs[i], 294 + (i % 2) * 4, N === 3 ? 1.3 : 1.22, nm[i], { tagY: 12 });
      if (gd === 'm' && r.chance(0.4)) it[1].beard = 1;
      if (r.chance(0.5)) it[1].coat = r.pick(['#2b3a5a', '#5a3a22', '#2f5a3a', '#7a2e3a']);
      items.push(it);
    });
    var markWords = { mole: 'a mole on the {s} cheek', ear: 'a nick in the {s} ear', scar: 'a little scar over the {s} eye' };
    function partOf(k, side) { return k === 'mole' ? 'mole' : k === 'ear' ? 'ear' + side : 'scar'; }
    // L/R in the picture are the viewer's; the sitter's own right is on our left
    var desc = kinds.map(function (k) { return markWords[k].replace('{s}', A[k] === 'L' ? 'right' : 'left'); });
    var steps = [{ text: 'In the portrait, ' + first + ' has ' + andList(desc) + '. (' + (gd === 'f' ? 'Her' : 'His') + ' right is on your left.)', marks: kinds.map(function (k) { return { p: 'sitter.' + partOf(k, A[k]), pad: 3 }; }) }];
    claim.forEach(function (c, i) { if (!c.real) steps.push({ text: nm[i] + ' ' + c.why + '.', marks: [{ p: 'c' + i + '.head', pad: -4 }] }); });
    steps.push({ text: nm[ans] + ' has changed ' + (gd === 'f' ? 'her' : 'his') + ' clothes and hair, but every mark is exactly where it should be.', marks: kinds.map(function (k) { return { p: 'c' + ans + '.' + partOf(k, A[k]), pad: 3 }; }) });
    return {
      type: 'Impostor', title: r.pick(['The Long-Lost ' + title0, 'The Return of ' + who, 'Who Is ' + who + '?', 'Portrait of a Fake']).replace(/^(.{28}).*$/, 'Portrait of a Fake'),
      setup: numw(N).charAt(0).toUpperCase() + numw(N).slice(1) + ' people have arrived at ' + manor + ', each saying they are ' + who + ', who sailed away years ago. The butler compares them with ' + first + '’s portrait. Clothes, hair and beards can change, but some things can’t.',
      q: 'Which one is the real ' + who + '?', size: [400, 320], tap: true,
      choices: nm.map(function (n2, i) { return { id: 'c' + i, label: n2 }; }), answer: 'c' + ans,
      scene: { bg: ['room', { wall: wall, paper: 'diamonds', floorY: 250, floor: '#6a4a32', rail: 160 }], items: items },
      hints: [{ text: 'Ignore anything a person could change: clothes, hats, beards, haircuts.' }, { text: 'Compare the little marks on the face and ears with the portrait. Check which side each one is on.', at: { box: [140, 8, 120, 110] } }],
      solution: { steps: steps, verdict: nm[ans] + ' is the real ' + who + '.' },
      key: 'impostor|portrait|' + gd + '|' + JSON.stringify(A) + '|' + claim.map(function (c) { return JSON.stringify(c.m); }).join(';'),
      logic: { tpl: 'impostor', v: 'portrait', real: A, claims: claim.map(function (c) { return c.m; }) }
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Putting it together
  // ═════════════════════════════════════════════════════════════════════════
  var TPL = ['culprit', 'oddone', 'missing', 'tracks', 'keys', 'timeline', 'seating', 'impostor'];
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
