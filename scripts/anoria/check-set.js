// Checks the third printing (the 150 cards found only in packs: `pr: 3` in games/anoria/cards.js, their words in
// text.js) against the game's own files and against scripts/anoria/set-150.json, which keeps where each card's
// facts came from. Prints the split by kind, faction, region, era and cost, what is wrong, and exits 1 if anything is.
//   node scripts/anoria/check-set.js
// (It took the place of check-set-150.js, which checked the draft before it was merged.)
'use strict';
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '../../games/anoria');
const C = require(path.join(dir, 'cards.js')), T = require(path.join(dir, 'text.js')), E = require(path.join(dir, 'engine.js')), Coll = require(path.join(dir, 'coll.js'));
const ENG = fs.readFileSync(path.join(dir, 'engine.js'), 'utf8');
const SET = JSON.parse(fs.readFileSync(path.join(__dirname, 'set-150.json'), 'utf8'));
const CARDS = C.CARDS, NEW = C.PRINT3, bad = [], err = (k, m) => bad.push(k + ': ' + m);
const ERAS = C.ERAS.length - 1, eraOf = y => { for (let e = 1; e <= ERAS; e++) if (y <= C.ERAS[e].to) return e; return ERAS; };
const KEYWORDS = {}; ENG.replace(/\bk\.([A-Za-z]+)/g, (m, w) => { KEYWORDS[w] = 1; return m; });
const ARRS = {}; ENG.replace(/op === '([a-z]+)'/g, (m, w) => { ARRS[w] = 1; return m; });
const FX = {}; ENG.replace(/fx === '([a-z]+)'|(?:hasFx|nFx)\((?:S, )?P, '([a-z]+)'\)/g, (m, a, b) => { FX[a || b] = 1; return m; });
// The skill words a card's text leads with, and the keyword each one stands for
const LEAD = { Voyager: 'voyager', Scholar: 'scholar', Guard: 'guard', Steadfast: 'steadfast', Inspiring: 'inspiring', Swift: 'swift', Raider: 'raider', Law: 'law' };
const REGS = {}; Object.keys(C.PLACES).forEach(k => { REGS[C.PLACES[k].reg] = 1; });
const names = {}; Object.keys(CARDS).forEach(k => { const n = CARDS[k].n.toLowerCase(); if (names[n]) err(k, 'has the same name as ' + names[n]); names[n] = k; });
Object.keys(C.GUIDES).forEach(k => { if (names[C.GUIDES[k].toLowerCase()]) err(k, 'a Guide is also a card'); });
const JS = {}; SET.cards.forEach(c => { JS[c.key] = c; });

if (NEW.length !== 137) err('set', 'the third printing has ' + NEW.length + ' cards, not 137');   // (150 as made; 13 are held for a later set: heldForLater in set-150.json)
NEW.forEach(k => {
  const c = CARDS[k], t = T.CARDS[k], fig = c.t === 'fig';
  if (!t) return err(k, 'no words in text.js');
  if (c.pr !== 3) err(k, 'not marked pr 3');
  if (Object.keys(C.ARCH).some(d => C.ARCH[d].cards.indexOf(k) >= 0)) err(k, 'is in a ready deck (the third printing is found only in packs)');
  ['cap', 'fact', 'art'].forEach(f => { if (typeof t[f] !== 'string' || !t[f]) err(k, 'missing ' + f); });
  if (typeof c.y !== 'number') err(k, 'missing year');
  if (fig) {
    if (!REGS[c.reg]) err(k, 'unknown region ' + c.reg);
    if (c.era !== eraOf(c.y)) err(k, 'era ' + c.era + ' does not match year ' + c.y);
    Object.keys(c.k).forEach(w => { if (!KEYWORDS[w]) err(k, 'engine.js has no skill ' + w); });
    if (c.arr && (!ARRS[c.arr[0]] || typeof c.arr[1] !== 'number')) err(k, 'engine.js has no arrival effect ' + c.arr);
    if (!Array.isArray(t.ll) || t.ll.length !== 2 || Math.abs(t.ll[0]) > 180 || Math.abs(t.ll[1]) > 90) err(k, 'bad ll');
    // the text leads with a skill word exactly when the card has that skill, and names its Legacy
    Object.keys(LEAD).forEach(w => { const has = new RegExp('(^|\\. )' + w + '[.:]').test(t.tx); if (has !== !!c.k[LEAD[w]]) err(k, 'text and skills disagree about ' + w); });
    if (/Legacy of /.test(t.tx) !== !!c.insp) err(k, 'text and insp disagree about Legacy');
    (c.insp || []).forEach(s => { const o = CARDS[s]; if (!o || o.t !== 'fig') err(k, 'Legacy source ' + s + ' is not a Figure'); else if (t.tx.indexOf(o.n) < 0) err(k, 'text does not name ' + o.n); });
    if ((c.arr || []).length && !/When you play (him|her), /.test(t.tx)) err(k, 'text does not give the arrival effect');
    if (!/a (fifth|quarter) of the way down|in the upper half/.test(t.art) && k !== 'houdini') err(k, 'art brief does not say where the head is (a fifth or a quarter of the way down, or in the upper half)');
  } else {
    // a Relic or a Deed has the effect, the cost and the rules text of the card its `fx` names
    const fx = E.fxOf(k), src = CARDS[fx] || C.RETIRED[fx], st = T.CARDS[fx] || T.RETIRED[fx];
    if (!FX[fx]) err(k, 'engine.js has no effect ' + fx);
    else if (!src || src.t !== c.t) err(k, 'fx must name a ' + c.t);
    else { if (c.c !== src.c) err(k, 'cost differs from ' + fx); if (t.tx !== st.tx) err(k, 'text differs from ' + fx); if (!!c.quick !== !!src.quick) err(k, 'quick differs from ' + fx); }
    if (c.t === 'relic' && c.f !== 'N') err(k, 'a Relic is faction N');
    if (c.t === 'relic' && !Array.isArray(t.ll)) err(k, 'missing ll');
    if (c.m != null || c.k || c.arr || c.insp) err(k, 'only Figures have m, k, arr or insp');
  }
  // links: every source is a card in the set or a Place, and has its sentence
  (c.insp || []).concat(c.from || []).forEach(s => { if (s[0] === '@' ? !C.PLACES[s.slice(1)] : !CARDS[s]) err(k, 'link source ' + s + ' is not a card in the set or a Place'); if (s === k) err(k, 'links to itself');
    const l = T.LINKS[s + '>' + k]; if (!l) err(k, 'no sentence for ' + s + '>' + k); else if (!/[.!?”]$/.test(l)) err(k, 'link sentence has no full stop');
    const o = CARDS[s]; if (o && (o.insp || []).concat(o.from || []).indexOf(k) >= 0) err(k, 'and ' + s + ' each name the other as a source');
    // (a line between two Relics with the same power could never be made: a player has no two such Relics in play)
    if (o && o.t === 'relic' && c.t === 'relic' && E.fxOf(s) === E.fxOf(k)) err(k, 'its Legacy Line is from a Relic with the same power'); });
  if ((c.insp || []).some(s => (c.from || []).indexOf(s) >= 0)) err(k, 'a source is in both insp and from');
  // writing: no dots stringing facts together, nothing cut off, nothing about a card that has left the set
  ['cap', 'tx', 'fact', 'art'].forEach(f => { const v = t[f]; if (typeof v !== 'string') return;
    if (/·/.test(v)) err(k, f + ' has a middle dot'); if (/…|\.\.\./.test(v)) err(k, f + ' has an ellipsis'); if (/\s\s|^\s|\s$/.test(v)) err(k, f + ' has stray spaces');
    Object.keys(C.RETIRED).forEach(r => { if (v.indexOf(C.RETIRED[r].n) >= 0 && !C.GUIDES[r]) err(k, f + ' names ' + C.RETIRED[r].n + ', which has left the set'); }); });
  if (!/[.!?”]$/.test(t.fact)) err(k, 'fact has no full stop');
  if (t.fact.length > 330) err(k, 'fact is ' + t.fact.length + ' letters long');
  if (!/top left corner/.test(t.art) || !/top right corner/.test(t.art)) err(k, 'art brief does not keep both top corners clear');
  if (!T.NOPIC[k] && !fs.existsSync(path.join(dir, 'art', k + '.webp'))) err(k, 'is listed as painted but has no picture in art/');
  if (!Coll.rarity(k)) err(k, 'has no rarity');
  // the record of sources
  const j = JS[k]; if (!j) err(k, 'is not in set-150.json'); else { if (j.n !== c.n) err(k, 'name differs from set-150.json'); if (j.fact !== t.fact) err(k, 'fact differs from set-150.json'); if (j.art !== t.art) err(k, 'art brief differs from set-150.json'); if (j.c !== c.c || (fig && j.m !== c.m)) err(k, 'numbers differ from set-150.json'); if (!/^(https:\/\/|[A-Z])/.test(j.src || '')) err(k, 'no source'); }
});
SET.cards.forEach(c => { if (!CARDS[c.key]) err(c.key, 'is in set-150.json and not in the game'); });
// older cards given a Legacy Line by the third printing
Object.keys(CARDS).forEach(k => { if (CARDS[k].pr === 3) return; (CARDS[k].from || []).concat(CARDS[k].insp || []).forEach(s => { if (s[0] !== '@' && !CARDS[s]) err(k, 'links to ' + s + ', which is not in the set'); if (!T.LINKS[s + '>' + k]) err(k, 'no sentence for ' + s + '>' + k); }); });
// named lines
const ids = {}; C.THREADS.forEach(t => { if (ids[t.id] || t.id === 'horse' || t.id === 'nights') err('line ' + t.id, 'id already used'); ids[t.id] = 1;
  if (!t.n || t.cards.length < 2) err('line ' + t.id, 'needs a name and two cards or more'); t.cards.forEach(k => { if (!CARDS[k]) err('line ' + t.id, 'unknown card ' + k); }); (t.places || []).forEach(p => { if (!C.PLACES[p]) err('line ' + t.id, 'unknown Place ' + p); });
  if (C.THREADS.filter(o => o.n === t.n).length > 1) err('line ' + t.id, 'name used twice'); });
(SET.dropped || []).forEach(d => { if (CARDS[d.key] && CARDS[d.key].pr === 3) err('dropped ' + d.key, 'is in the set'); });
(SET.needsEngine || []).forEach(x => { if (names[String(x.n).toLowerCase()]) err('needsEngine ' + x.n, 'is already a card'); });

// ── the report ──
const pad = (s, n) => (s + '                              ').slice(0, n), num = (v, n) => ('           ' + v).slice(-n);
function table(title, rows, cols, cell) {
  console.log('\n' + title); console.log(pad('', 22) + cols.map(c => num(c, 9)).join('') + num('all', 7));
  rows.forEach(r => { let sum = 0; const line = cols.map(c => { const v = cell(r[0], c); sum += v; return num(v || '.', 9); }).join(''); console.log(pad(r[1], 22) + line + num(sum, 7)); });
}
const count = f => NEW.filter(k => f(CARDS[k], k)).length, all = Object.keys(CARDS);
const FAC = [['D', 'Discovery'], ['S', 'Statecraft'], ['V', 'Valor'], ['A', 'Arts'], ['W', 'Wonder'], ['N', 'no faction (Relics)']], TYPES = ['fig', 'relic', 'deed'], KIND = { fig: 'Figures', relic: 'Relics', deed: 'Deeds' };
console.log('The third printing: ' + NEW.length + ' cards, in a set of ' + all.length + '.');
console.log('\nThe split by kind'); console.log(pad('', 22) + num('3rd', 9) + num('before', 9) + num('set', 9));
TYPES.forEach(t => console.log(pad(KIND[t], 22) + num(count(c => c.t === t), 9) + num(all.filter(k => CARDS[k].t === t && CARDS[k].pr !== 3).length, 9) + num(all.filter(k => CARDS[k].t === t).length, 9)));
table('By faction and kind', FAC, TYPES, (f, t) => count(c => c.f === f && c.t === t));
table('Figures by faction and region', FAC.slice(0, 5), Object.keys(REGS), (f, r) => count(c => c.t === 'fig' && c.f === f && c.reg === r));
table('Figures by faction and era', FAC.slice(0, 5), C.ERAS.slice(1).map((e, i) => i + 1), (f, e) => count(c => c.t === 'fig' && c.f === f && c.era === e));
table('By faction and cost', FAC, [0, 1, 2, 3, 4, 5], (f, n) => count(c => c.f === f && c.c === n));
const fx = {}; NEW.forEach(k => { if (CARDS[k].t !== 'fig') (fx[E.fxOf(k)] = fx[E.fxOf(k)] || []).push(k); });
console.log('\nRelics and Deeds, by the card whose effect they have: ' + Object.keys(fx).map(a => a + ' (' + fx[a].join(', ') + ')').join('; '));
const tier = [0, 0, 0, 0, 0]; NEW.forEach(k => { tier[Coll.rarity(k)]++; });
console.log('Rarity: ' + [1, 2, 3, 4].map(t => Coll.TIERS[t] + ' ' + tier[t]).join(', ') + '.');
console.log('Legacy Lines: ' + count(c => c.insp) + ' Figures with a Legacy (insp), ' + count(c => c.from) + ' cards with a Legacy Line from a card or a Place; ' + C.THREADS.length + ' named lines in the set, ' + C.THREADS.filter(t => t.cards.some(k => CARDS[k].pr === 3)).length + ' of them with a card of the third printing.');
console.log('Pictures still to be made: ' + Object.keys(T.NOPIC).length + ' of ' + NEW.length + '.');
console.log('Sources (set-150.json): ' + SET.cards.filter(c => c.sure).length + ' of ' + SET.cards.length + ' cards were confirmed by a search or a full text; written from memory and not searched: ' + SET.cards.filter(c => !c.sure).map(c => c.key).join(', ') + '.');
console.log('Still waiting for engine work, and not in the set: ' + (SET.needsEngine || []).map(x => x.n).join(', ') + '.');
if (bad.length) { console.log('\nWRONG (' + bad.length + '):\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('\nNothing wrong.');
