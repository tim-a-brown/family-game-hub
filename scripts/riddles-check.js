#!/usr/bin/env node
// Checks the riddles: data/riddles.js (the first 100, the answer checker, the daily schedule) and the packs
// data/riddles-pack-1.js .. -4.js. The schema, the counts per level, duplicates, hints that give the answer away,
// the answer checker (RiddleCheck) against a table of cases plus generated ones, that no riddle accepts another
// riddle's answers, and the daily schedule. Exits 1 on any failure.
//   node scripts/riddles-check.js          (add -v to list every case)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const VERBOSE = process.argv.includes('-v');
const PACKS = [1, 2, 3, 4].map(n => 'data/riddles-pack-' + n + '.js');

const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/words-en.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/riddles.js'), 'utf8'), ctx);
const R = ctx.RIDDLES.slice(), C = ctx.RiddleCheck;   // R: the first 100
PACKS.forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx));
const MORE = ctx.RIDDLES_MORE || [], ALL = R.concat(MORE);   // the same order as games/riddles.html
const BASE = new Set(R);

let fails = 0, passes = 0;
const warn = [];
function fail(msg) { fails++; console.log('  FAIL ' + msg); }
function ok(msg) { passes++; if (VERBOSE) console.log('  ok   ' + msg); }
function section(t) { console.log('\n' + t); }

// ── Schema ────────────────────────────────────────────────────────────────
section('Schema');
const KEYS = new Set(['id', 'q', 'a', 'alt', 'hints', 'd', 'why', 'from']);
const ids = new Set();
ALL.forEach((r, i) => {
  const at = '#' + i + ' ' + (r.id || '?');
  Object.keys(r).forEach(k => { if (!KEYS.has(k)) fail(at + ': unknown field ' + k); });
  // the first 100: letters/digits; packs: p<N>-name (more hyphens allowed: p3-letter-b)
  if (typeof r.id !== 'string' || !(BASE.has(r) ? /^[a-z0-9]+$/ : /^p[1-9][0-9]*(-[a-z0-9]+)+$/).test(r.id)) fail(at + ': bad id (want lowercase letters/digits, packs p<N>-name)');
  if (ids.has(r.id)) fail(at + ': duplicate id'); ids.add(r.id);
  ['q', 'a', 'why'].forEach(k => { if (typeof r[k] !== 'string' || !r[k].trim()) fail(at + ': ' + k + ' missing'); });
  if (r.from != null && (typeof r.from !== 'string' || !r.from.trim())) fail(at + ': from must be text');
  if (!Array.isArray(r.alt) || r.alt.some(x => typeof x !== 'string' || !x.trim())) fail(at + ': alt must be a list of strings');
  if (!Array.isArray(r.hints) || r.hints.length !== 2 || r.hints.some(x => typeof x !== 'string' || !x.trim())) fail(at + ': needs exactly 2 hints');
  else if (r.hints[0] === r.hints[1]) fail(at + ': the two hints are the same');
  if (!['easy', 'medium', 'hard'].includes(r.d)) fail(at + ': d must be easy, medium or hard');
  if (r.q && r.q.length > 420) fail(at + ': question is very long (' + r.q.length + ')');
  if (r.why && r.why.length > 320) fail(at + ': explanation is long (' + r.why.length + ')');
  (r.hints || []).forEach(h => { if (h.length > 110) fail(at + ': hint is long: ' + h); });
  if (/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(JSON.stringify(r))) fail(at + ': emoji in the text');
});
ok('fields checked');

// ── Counts ────────────────────────────────────────────────────────────────
section('Counts');
const by = { easy: 0, medium: 0, hard: 0 };
R.forEach(r => { by[r.d] = (by[r.d] || 0) + 1; });
console.log('  first ' + R.length + ': ' + by.easy + ' easy, ' + by.medium + ' medium, ' + by.hard + ' hard; ' + R.filter(r => r.from).length + ' classics with a source');
if (R.length !== 100) fail('expected exactly 100 riddles in data/riddles.js, have ' + R.length);
if (by.easy < 30 || by.easy > 40 || by.medium < 30 || by.medium > 40 || by.hard < 25 || by.hard > 35) fail('levels are lopsided (want about 35/35/30)');
const byAll = { easy: 0, medium: 0, hard: 0 };
ALL.forEach(r => { byAll[r.d] = (byAll[r.d] || 0) + 1; });
console.log('  all ' + ALL.length + ': ' + byAll.easy + ' easy, ' + byAll.medium + ' medium, ' + byAll.hard + ' hard (' + MORE.length + ' from ' + PACKS.length + ' packs)');
if (ALL.length < 1095) fail('want at least 1,095 riddles (three years of dailies), have ' + ALL.length);
['easy', 'medium', 'hard'].forEach(l => { if (byAll[l] < ALL.length * 0.25) fail('too few ' + l + ' riddles overall: ' + byAll[l]); });

// ── Duplicates ────────────────────────────────────────────────────────────
section('Duplicates');
const key = s => C.norm(s).toks.join(' ');
const seenQ = {}, seenA = {};
ALL.forEach(r => {
  const q = key(r.q), a = key(r.a);
  if (seenQ[q]) fail('same question: ' + r.id + ' and ' + seenQ[q]); else seenQ[q] = r.id;
  if (seenA[a]) fail('same answer "' + r.a + '": ' + r.id + ' and ' + seenA[a]); else seenA[a] = r.id;
});
// the same plain alternate in two of the first 100 is allowed (steps: stairs and footsteps) but listed;
// anywhere else it's a failure (see Cross answers)
const altOwner = {};
ALL.forEach(r => [r.a].concat(r.alt).filter(x => x[0] !== '+').forEach(x => { const k = key(x); (altOwner[k] = altOwner[k] || new Set()).add(r); }));
Object.keys(altOwner).forEach(k => {
  const rs = [...altOwner[k]]; if (rs.length < 2) return;
  const msg = '"' + k + '" is accepted by ' + rs.map(r => r.id).join(' and ');
  if (rs.every(r => BASE.has(r))) warn.push(msg); else fail(msg);
});
ok('duplicates checked');

// ── Hints mustn't give the answer away ────────────────────────────────────
section('Hints');
ALL.forEach(r => {
  const ans = ' ' + key(r.a) + ' ';
  r.hints.forEach((h, i) => { if ((' ' + key(h) + ' ').includes(ans)) fail(r.id + ': hint ' + (i + 1) + ' contains the answer: ' + h); });
});
ok('hints checked');

// ── Every riddle accepts its own answers, in the ways people type them ────
section('Own answers');
function expect(r, guess, want, why) {
  const res = C.check(r, guess);
  const got = res.ok ? 'ok' : res.close ? 'close' : 'no';
  const label = (r.id || r.a) + ' <- "' + guess + '"' + (why ? '  (' + why + ')' : '');
  if (got === want || (want === 'not-ok' && got !== 'ok')) ok(label + ' -> ' + got); else fail(label + ': expected ' + want + ', got ' + got);
}
ALL.forEach(r => {
  expect(r, r.a, 'ok', 'canonical');
  expect(r, r.a.toUpperCase(), 'ok', 'upper case');
  expect(r, '  ' + r.a + '?! ', 'ok', 'punctuation and spaces');
  expect(r, "I think it's " + r.a, 'ok', 'lead-in');
  r.alt.forEach(x => {
    if (x[0] === '+') expect(r, 'it is ' + x.slice(1) + ' really', 'ok', 'word set');
    else expect(r, x, 'ok', 'alternate');
  });
});

// Generated typos: swap two letters in the middle of the answer's longest word. Accepted, unless the swap makes
// a real word (then it must be "Close!", not accepted).
section('Generated typos');
let typoN = 0;
ALL.forEach(r => {
  const raw = C.norm(r.a).raw; if (!raw.length) return;
  const w = raw.slice().sort((a, b) => b.length - a.length)[0];
  if (w.length < 5) return;
  const m = Math.floor(w.length / 2), sw = w.slice(0, m - 1) + w[m] + w[m - 1] + w.slice(m + 1);
  if (sw === w) return;
  const guess = raw.map(x => x === w ? sw : x).join(' ');
  typoN++;
  // (a swap or drop that makes a real word is judged by the cases below, since a word set may still accept it)
  if (!C.isWord(sw)) expect(r, guess, 'ok', 'swap');
  const dr = w.slice(0, m) + w.slice(m + 1), g2 = raw.map(x => x === w ? dr : x).join(' ');
  if (!C.isWord(dr)) expect(r, g2, 'ok', 'drop a letter');
});
console.log('  ' + typoN + ' riddles with generated typos');

// ── No riddle accepts another riddle's answer ─────────────────────────────
section('Cross answers');
// Every riddle against every other riddle's answer and plain alternates: none may be accepted. (Between two of the
// first 100 an alternate is only listed, as before.) That's about 7 million checks, so each guess first skips
// the riddles that can't possibly accept it: check() only says ok on an exact match (join or word bag), a word set
// whose every word is near some guessed word, or a typo, and a typo of at most k edits leaves the two words the
// same length give or take k, sharing all but k letters. Words are compared on those bounds before checking.
{
  const t0 = Date.now();
  const cnt = new Map();
  const counts = w => { let c = cnt.get(w); if (!c) { c = new Uint8Array(36); for (let i = 0; i < w.length; i++) { const k = w.charCodeAt(i); c[k >= 97 ? k - 97 : k - 48 + 26]++; } cnt.set(w, c); } return c; };
  // could a and b be within k edits? (normalised words are a-z and 0-9 only)
  const near = (a, b, k) => {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > k) return false;
    const ca = counts(a), cb = counts(b); let sh = 0;
    for (let i = 0; i < 36; i++) sh += ca[i] < cb[i] ? ca[i] : cb[i];
    return sh >= Math.max(a.length, b.length) - k;
  };
  const prep = r => [r.a].concat(r.alt).map(x => {
    if (x[0] === '+') { const m = C.norm(x.slice(1)); return { pat: m.toks, praw: m.raw }; }
    const n = C.norm(x); return { toks: n.toks, raw: n.raw, join: n.toks.join(''), bag: n.toks.filter(w => w !== 'and').slice().sort().join(' ') };
  });
  const F = ALL.map(prep);
  const wordNear = (gs, gr, ts, tr) => gs === ts || gr === tr || near(gs, ts, C.allow(ts.length)) || near(gr, tr, C.allow(tr.length));
  const maybe = (forms, g) => forms.some(f => {
    if (f.pat) return f.pat.every((t, k) => g.toks.some((gs, j) => wordNear(gs, g.raw[j], t, f.praw[k])));
    if (f.join === g.join || f.bag === g.bag) return true;
    if (f.toks.length === g.toks.length) return f.toks.every((t, k) => wordNear(g.toks[k], g.raw[k], t, f.raw[k]));
    return near(g.join, f.join, C.allow(f.join.length));
  });
  let checked = 0, crossAlt = 0;
  ALL.forEach((o, oi) => {
    [o.a].concat(o.alt).filter(x => x[0] !== '+').forEach(x => {
      const n = C.norm(x), g = { toks: n.toks, raw: n.raw, join: n.toks.join(''), bag: n.toks.filter(w => w !== 'and').slice().sort().join(' ') };
      if (!g.toks.length) return;
      ALL.forEach((r, ri) => {
        if (ri === oi || !maybe(F[ri], g)) return;
        checked++;
        if (!C.check(r, x).ok) return;
        const what = x === o.a ? 'the answer to ' + o.id + ' ("' + x + '")' : '"' + x + '" (an alternate for ' + o.id + ')';
        if (x !== o.a && BASE.has(r) && BASE.has(o)) { crossAlt++; if (!(altOwner[key(x)] && altOwner[key(x)].has(r))) warn.push(r.id + ' accepts ' + what); }
        else fail(r.id + ' accepts ' + what);
      });
    });
  });
  console.log('  ' + ALL.length + ' riddles, ' + checked + ' close pairs checked in full (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
}
ok('cross checked');

// ── The daily riddle ──────────────────────────────────────────────────────
section('Daily riddle');
{
  const D = ctx.RiddleDaily;
  // the schedule before the packs (games/riddles.html up to day 1017): a shuffle of the first 100
  const oldOrder = (() => {
    const a = R.map((r, i) => i); let s = 20241013;
    const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  })();
  const pick = d => D.pick(ALL, d);
  for (let d = 1; d <= D.CUT; d++) if (pick(d) !== R[oldOrder[(d - 1) % 100]]) { fail('day ' + d + ' changed: ' + pick(d).id); break; }
  // pinned: these days must never change (add riddles only at the end, never move the first FROZEN)
  const PIN = { 1016: 'cake', 1017: 'fire', 1018: 'p2-crab', 1019: 'p4-train', 1100: 'p4-lighthouse', 1500: 'p1-chair', 2000: 'p3-february', 2117: 'p1-waffle', 2150: 'fire' };
  Object.keys(PIN).forEach(d => { const r = pick(+d); if (!r || r.id !== PIN[d]) fail('daily for day ' + d + ' is ' + (r && r.id) + ', was ' + PIN[d]); });
  // the frozen riddles, in order (fingerprint of their ids)
  if (D.FROZEN > ALL.length) fail('FROZEN (' + D.FROZEN + ') is more than the ' + ALL.length + ' riddles');
  let h = 0x811c9dc5; ALL.slice(0, D.FROZEN).map(r => r.id).join(',').split('').forEach(c => { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; });
  const FP = '885fd20a';
  if (h.toString(16) !== FP) fail('the first ' + D.FROZEN + ' riddles were changed or reordered (fingerprint ' + h.toString(16) + ', want ' + FP + '): add new riddles only at the end');
  // three years with no repeats, starting today
  const seen = {}; let rep = 0;
  for (let d = 1017; d <= 2117; d++) { const r = pick(d); if (seen[r.id]) { rep++; if (rep < 4) fail('daily repeats: ' + r.id + ' on days ' + seen[r.id] + ' and ' + d); } seen[r.id] = d; }
  console.log('  day 1017: ' + pick(1017).id + '; days 1017-2117: ' + Object.keys(seen).length + ' different riddles; no repeats until day ' + (() => { const s2 = {}; for (let d = 1017; ; d++) { const id = pick(d).id; if (s2[id]) return d; s2[id] = 1; } })());
}
ok('daily checked');

// ── The matching rules, case by case ──────────────────────────────────────
section('Matching cases');
const T = (a, alt) => ({ id: 'test:' + a, a, alt: alt || [] });
const CASES = [
  // case, articles, punctuation, lead-ins
  [T('a towel'), 'TOWEL', 'ok'], [T('a towel'), 'the towel', 'ok'], [T('a towel'), 'A Towel!', 'ok'], [T('an echo'), 'echo.', 'ok'],
  [T('a towel'), "it's a towel", 'ok'], [T('a towel'), 'Is it a towel?', 'ok'], [T('a towel'), 'i think its a towel', 'ok'],
  [T('a towel'), 'maybe a towel', 'ok'], [T('a towel'), '   towel   ', 'ok'],
  // plurals and singulars
  [T('footsteps'), 'footstep', 'ok'], [T('a teapot'), 'teapots', 'ok'], [T('a glass'), 'glasses', 'ok'], [T('a box'), 'boxes', 'ok'],
  [T('a berry'), 'berries', 'ok'], [T('a cookie'), 'cookies', 'ok'], [T('a match'), 'matches', 'ok'], [T('a shoe'), 'shoes', 'ok'],
  [T('a bus'), 'bus', 'ok'],
  // spaces and hyphens, word order, ampersands, numbers, contractions, accents
  [T('a teapot'), 'tea pot', 'ok'], [T('a teapot'), 'tea-pot', 'ok'], [T('footsteps'), 'foot steps', 'ok'],
  [T('lunch and dinner'), 'dinner and lunch', 'ok'], [T('lunch and dinner'), 'lunch & dinner', 'ok'],
  [T('seven'), '7', 'ok'], [T('eleven'), '11', 'ok'], [T('one'), '1', 'ok'], [T('twelve'), '12', 'ok'],
  [T("roosters don't lay eggs"), 'roosters do not lay eggs', 'ok'], [T("roosters don't lay eggs"), "rooster's don't lay egg's", 'ok'],
  [T('a cafe'), 'café', 'ok'],
  // small typos, scaled to the word's length
  [T('a candle'), 'candel', 'ok', 'swap, 6 letters'], [T('a candle'), 'cnadle', 'ok', 'swap near the start'],
  [T('a human'), 'humen', 'ok', '5 letters, one change'], [T('a human'), 'hman', 'ok', 'one dropped letter'],
  [T('a keyboard'), 'keybaord', 'ok'], [T('a keyboard'), 'kyebord', 'ok', '8 letters, two edits'],
  [T('Mississippi'), 'missisippi', 'ok'], [T('Mississippi'), 'misisipi', 'close', 'three edits is one past the allowance'],
  [T('bookkeeper'), 'bookeeper', 'ok'], [T('incorrectly'), 'incorectly', 'ok'], [T('an umbrella'), 'umberella', 'ok'],
  [T('a watermelon'), 'watermellon', 'ok'], [T('the vowels'), 'vowles', 'ok'], [T('a sunflower'), 'sun flowr', 'ok', 'split and a typo'],
  // short words: no slack, because one letter makes a different word
  [T('a cat'), 'car', 'no', 'cat vs car'], [T('a cat'), 'bat', 'no'], [T('a cat'), 'cta', 'close', 'typo of a short word: try again'],
  [T('a coin'), 'corn', 'no'], [T('a bee'), 'bed', 'no'], [T('a map'), 'mop', 'no'], [T('fire'), 'fir', 'no'],
  [T('ice'), 'ace', 'no'], [T('an eye'), 'eve', 'no'], [T('time'), 'tine', 'no'], [T('an owl'), 'owe', 'no'], [T('a kite'), 'kits', 'no'],
  [T('the letter W'), 'the letter e', 'not-ok', 'right idea, wrong letter'], [T('the letter E'), 'letter w', 'not-ok'], [T('seven'), 'eleven', 'no'],
  // a real word is never a typo, however close
  [T('a candle'), 'handle', 'close', 'real word, one letter off'], [T('a towel'), 'tower', 'close'], [T('a towel'), 'vowel', 'close'],
  [T('a mirror'), 'minor', 'no'], [T('a clock'), 'cloak', 'close'], [T('a shadow'), 'shallow', 'no', 'real word, two letters off'], [T('a piano'), 'piano', 'ok'],
  [T('a bottle'), 'battle', 'close'], [T('a library'), 'liberty', 'no'], [T('a sponge'), 'spongy', 'not-ok'],
  // clearly different answers
  [T('a towel'), 'a sponge', 'no'], [T('a human'), 'a horse', 'no'], [T('a human'), 'woman', 'not-ok'], [T('an echo'), 'a parrot', 'no'],
  // close: shares a word, or one is inside the other
  [T('a human', ['man']), 'an old man', 'close'], [T('ice'), 'iceberg', 'close'], [T('incorrectly'), 'incorrect', 'close'],
  [T('lunch and dinner'), 'lunch', 'close'], [T('a grandfather, father and son'), 'father and son', 'close'],
  [T('a towel'), 'a fluffy towel', 'close', 'extra words: try just the answer'],
  // word sets: every word, any order, a typo per word, and not when negated
  [T('his horse is named Friday', ['+horse']), 'he rode in on a horse called Friday', 'ok'],
  [T('his horse is named Friday', ['+horse']), 'his hrose', 'ok', 'typo inside a word set'],
  [T('a grandfather, father and son', ['+grandfather']), 'grandpa dad and son', 'not-ok'],
  [T('neither', ['+same']), 'they weigh the same', 'ok'], [T('neither', ['+same']), 'not the same', 'close', 'negated'],
  [T("roosters don't lay eggs", ['+rooster not']), "a rooster can't lay an egg", 'ok'],
  [T("roosters don't lay eggs", ['+rooster not']), 'roosters cannot lay eggs', 'ok'],
  // nonsense
  [T('a towel'), '', 'no'], [T('a towel'), '???', 'no'], [T('a towel'), 'a', 'no']
];
CASES.forEach(c => expect(c[0], c[1], c[2], c[3]));

// Without the word list (it hasn't loaded yet), a typo has to keep the first letter
section('Without the word list');
C.setDict(null);
[[T('a candle'), 'handle', 'close'], [T('a candle'), 'candel', 'ok'], [T('a towel'), 'tower', 'ok', 'accepted: no word list to tell'],
 [T('a human'), 'yuman', 'close']].forEach(c => expect(c[0], c[1], c[2], c[3]));

// ── Real riddles, real guesses ────────────────────────────────────────────
section('Real riddles');
const get = id => R.find(r => r.id === id);
C.setDict(null); // re-read Words on the next call
ctx.RiddleCheck.setDict(new Set(ctx.Words.common().concat(ctx.Words.extra())));
[['sphinx', 'man', 'ok'], ['sphinx', 'Humans!', 'ok'], ['sphinx', 'a person', 'ok'], ['sphinx', 'an old man with a cane', 'ok'],
 ['sphinx', 'a horse', 'no'], ['sphinx', 'a dog', 'no'],
 ['stives', 'one', 'ok'], ['stives', '1', 'ok'], ['stives', 'just me', 'ok'], ['stives', '2802', 'no'], ['stives', 'none', 'not-ok'],
 ['elizabeth', 'they are all the same person', 'ok'], ['elizabeth', 'one girl with four names', 'ok'], ['elizabeth', 'one', 'close'],
 ['feathers', 'They both weigh the same!', 'ok'], ['feathers', 'bricks', 'no'], ['feathers', 'feathers', 'no'],
 ['rooster', "Roosters don't lay eggs", 'ok'], ['rooster', 'it doesnt', 'ok'], ['rooster', 'left', 'no'],
 ['generations', 'grandfather, father and son', 'ok'], ['generations', 'there were only 3 people', 'ok'],
 ['friday', "his horse's name was Friday", 'ok'], ['friday', 'he came on a Friday', 'not-ok'],
 ['samson', 'honey', 'ok'], ['samson', 'a lion', 'close'], ['lice', 'lice', 'ok'], ['lice', 'fish', 'no'],
 ['vowels', 'A, E, I, O, U', 'ok'], ['vowels', 'letters', 'no'], ['year', 'a year', 'ok'], ['year', 'months', 'no'],
 ['letterw', 'W', 'ok'], ['letterw', 'gold', 'no'], ['lettere', 'e', 'ok'], ['lettere', 'w', 'no'],
 ['eight', '8', 'ok'], ['eight', 'infinity', 'no'], ['eleven', '11', 'ok'], ['eleven', '26', 'no'], ['seven', '7', 'ok'],
 ['mary', 'her name is Mary', 'ok'], ['mary', 'Nunu', 'no'], ['queue', 'Q', 'ok'],
 ['towel', 'towle', 'ok'], ['candle', 'handle', 'close'], ['clock', 'cloak', 'close'], ['coin', 'corn', 'no'],
 ['footsteps', 'foot prints', 'ok'], ['teapot', 'Tea Pot', 'ok'], ['mississippi', 'missisippi', 'ok'],
 ['incorrectly', 'incorrect', 'close'], ['lunch', 'dinner and lunch', 'ok'], ['ice', 'an iceberg', 'close'],
 ['corn', 'corn on the cob', 'ok'], ['corn', 'an ear of corn', 'ok'], ['bark', 'the bark of a tree', 'ok'], ['tree', 'bark', 'no'],
 ['carpet', 'a rug', 'no'], ['sunflower', 'sunflowr', 'ok'], ['earring', 'ear ring', 'ok'], ['alphabet', 'ABC', 'ok']
].forEach(c => expect(get(c[0]), c[1], c[2]));

// ── Report ────────────────────────────────────────────────────────────────
console.log('\nNotes (' + warn.length + '):');
warn.forEach(w => console.log('  - ' + w));
console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
