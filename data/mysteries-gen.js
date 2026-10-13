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
      return r.pick(['That rules out ', 'That clears ']) + andList(list.map(function (i) { return nm[i] + ' (' + why(K0, P[i])[0] + ')'; })) + '.';
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
      if (c === 'fabric') return 'is wearing a ' + (A.fabPat === 'plain' ? 'plain' : PAT_ADJ[A.fabPat]) + ' ' + A.fabCol + ' ' + (L0.legs === 'dress' ? 'dress' : 'shirt');
      if (c === 'shoe') return A.shoe === 'heel' ? 'is in high heels' : 'is wearing flat ' + (L0.shoe === 'boot' ? 'boots' : 'sneakers');
      if (c === 'glove') return 'is wearing the other ' + A.glove + ' glove';
      return fill(M.vp, { his: pr0.his });
    });
    steps.push({ text: 'Only ' + nm[ans] + ' fits every clue: ' + pr0.he + ' ' + andList(fits) + '.', marks: K.map(function (c) { return part(c, ans); }) });
    var hard1 = K.slice().sort(function (a, b) { return ({ glove: 0, mark: 1, fabric: 2, hair: 3, shoe: 2 })[b] - ({ glove: 0, mark: 1, fabric: 2, hair: 3, shoe: 2 })[a]; })[0];
    var hints = [
      { text: level === 'easy' ? 'Check the ' + numw(k) + ' clues in the photo against everyone in the line-up.' : r.pick(['There are ' + numw(k) + ' clues in the photo. Each one rules somebody out.', 'Find all ' + numw(k) + ' clues in the photo, then use them one at a time to cross people off.']) },
      { text: { hair: 'Look closely at the hair: its colour, its length and whether it’s curly all matter.', fabric: 'Match the scrap of cloth exactly: the colour and the pattern.', glove: 'One glove was dropped. Who is wearing only one glove, in that colour?', mark: 'The thief would have ' + M.what + ' on them. Check everyone carefully.', shoe: 'Look at the print, then at everyone’s shoes.' }[hard1], at: { id: ev[hard1], pad: 8 } }
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
      it.push(['tree', { x: 196, y: 206, size: 0.9, kind: 'pine', color: '#3f7a4a' }], ['tree', { x: 388, y: 206, size: 1, kind: 'pine', color: '#3a6a44' }], sv(tent(262, '#e8862a') + tent(338, '#3a8a7a')), sv('<path d="M286 214l10 -6M300 216l-12 -5" stroke="#6a4126" stroke-width="4" stroke-linecap="round"/><path d="M293 210q-6 -10 0 -18q2 8 6 4q2 8 -6 14z" fill="#ffb43a" stroke="#e8662a" stroke-width="1"/>'));
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
        (set.key === 'shed' ? '<rect x="112" y="28" width="40" height="20" rx="2" fill="#fbf6e6" stroke="#2b2433" stroke-width="1"/><text x="132" y="36" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="7" fill="#b02a2a">WET</text><text x="132" y="44" text-anchor="middle" font-family="Lilita One,sans-serif" font-size="7" fill="#b02a2a">PAINT</text><path d="M132 48v20" stroke="#8a5a34" stroke-width="2"/>' : '')));
      where = cup ? { hair: 'cupboard handle', fabric: 'cupboard hinge', shoe: 'on the floor' } : { hair: 'coat hook', fabric: 'nail on the door frame', shoe: set.key === 'bakery' ? 'in the spilt flour' : 'in the mud by the door' };
      if (K.indexOf('hair') >= 0) it.push(['strand', { id: 'ev-hair', x: cup ? 98 : 131, y: cup ? 64 : 44, color: HAIRC[A.hairCol], len: A.hairLen, curly: A.hairCurly }]);
      if (K.indexOf('fabric') >= 0) it.push(cup ? ['scrap', { id: 'ev-scrap', x: 116, y: 28, color: CLOTH[A.fabCol], pat: A.fabPat === 'plain' ? null : A.fabPat, pc: patPc(A.fabCol), r: -14 }] : ['scrap', { id: 'ev-scrap', x: 22, y: 60, color: CLOTH[A.fabCol], pat: A.fabPat === 'plain' ? null : A.fabPat, pc: patPc(A.fabCol), r: 16 }]);
      if (set.key === 'bakery') it.push(sv('<path d="M96 140Q92 124 112 118Q140 112 160 118V140Z" fill="#fbfaf5" stroke="#d8d0c0" stroke-width="1"/><path d="M134 116l8 -10 14 2 4 10z" fill="#e8dcc0" stroke="#2b2433" stroke-width="1"/><text x="148" y="114" font-family="sans-serif" font-size="4.5" text-anchor="middle" fill="#7a5a3a">FLOUR</text>'));
      if (K.indexOf('shoe') >= 0) it.push(['print', { id: 'ev-print', x: set.key === 'bakery' ? 126 : 70, y: 127, r: 80, kind: A.shoe === 'heel' ? 'heel' : 'shoe', tread: 'zigzag', size: 24, col: set.key === 'bakery' ? '#6a5a4a' : '#3a2414' }]);
      if (K.indexOf('glove') >= 0) it.push(['glove1', { id: 'ev-glove', x: 18, y: 126, color: GLOVEC[A.glove], r: 70 }]);
      if (K.indexOf('mark') >= 0) {
        if (set.key === 'bakery') it.push(['svg', { id: 'ev-mark', svg: '<path d="M100 124q8 -6 18 -2q6 4 -2 8q-8 4 -16 -6z" fill="#fff" stroke="#c9c2b0" stroke-width=".8"/><circle cx="96" cy="118" r="2.2" fill="#fff" stroke="#c9c2b0" stroke-width=".6"/>' }]);
        else if (set.key === 'shed') it.push(['svg', { id: 'ev-mark', svg: '<path d="M54 76q10 -6 22 -1q3 7 -3 11q-10 4 -18 -1q-4 -4 -1 -9z" fill="' + M.col + '" opacity=".65"/><path d="M57 79h16M58 83h15" stroke="#fff" stroke-width="1" opacity=".7"/>' }]);
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
