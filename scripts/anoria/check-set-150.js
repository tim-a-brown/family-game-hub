// Checks scripts/anoria/set-150.json (150 more cards, drafted for packs) against the game's own files:
// games/anoria/cards.js (keys, factions, regions, eras), text.js (how card text is worded) and engine.js (which
// skills and arrival effects exist). Prints what is wrong, then the counts. Exits 1 if anything is wrong.
//   node scripts/anoria/check-set-150.js
'use strict';
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '../../games/anoria');
const C = require(path.join(dir, 'cards.js')), T = require(path.join(dir, 'text.js'));
const ENG = fs.readFileSync(path.join(dir, 'engine.js'), 'utf8');
const SET = JSON.parse(fs.readFileSync(path.join(__dirname, 'set-150.json'), 'utf8'));
const cards = SET.cards, bad = [], warn = [];
const err = (k, m) => bad.push(k + ': ' + m);

// What cards.js and engine.js know
const OLD = C.CARDS, FACS = {}, REGS = {};
Object.keys(OLD).forEach(k => { FACS[OLD[k].f] = 1; if (OLD[k].reg) REGS[OLD[k].reg] = 1; });
Object.keys(C.PLACES).forEach(k => { REGS[C.PLACES[k].reg] = 1; });
const ERAS = C.ERAS.length - 1, eraOf = y => { for (let e = 1; e <= ERAS; e++) if (y <= C.ERAS[e].to) return e; return ERAS; };
const KEYWORDS = {}; ENG.replace(/\bk\.([A-Za-z]+)/g, (m, w) => { KEYWORDS[w] = 1; return m; });
const ARRS = {}; ENG.replace(/op === '([a-z]+)'/g, (m, w) => { ARRS[w] = 1; return m; });
const namedInEngine = k => ENG.indexOf("'" + k + "'") >= 0;   // (a Relic or Deed the engine handles by its key)
// The skill words a card's text leads with, and the keyword each one stands for
const LEAD = { Voyager: 'voyager', Scholar: 'scholar', Guard: 'guard', Steadfast: 'steadfast', Inspiring: 'inspiring', Swift: 'swift', Raider: 'raider', Law: 'law' };
// The range of cost and Might the game's Figures have now, by cost
const RANGE = {}; Object.keys(OLD).forEach(k => { const c = OLD[k]; if (c.t !== 'fig') return; const r = RANGE[c.c] || (RANGE[c.c] = [9, 0]); r[0] = Math.min(r[0], c.m); r[1] = Math.max(r[1], c.m); });

if (cards.length !== 150) err('set', 'has ' + cards.length + ' cards, not 150');
const NEW = {}; cards.forEach(c => { if (NEW[c.key]) err(c.key, 'key used twice in the set'); NEW[c.key] = c; });
const names = {}; Object.keys(OLD).forEach(k => { names[OLD[k].n.toLowerCase()] = k; });
Object.keys(C.GUIDES).forEach(k => { names[C.GUIDES[k].toLowerCase()] = 'guide ' + k; });
const known = s => s[0] === '@' ? !!C.PLACES[s.slice(1)] : !!(OLD[s] || NEW[s]);

cards.forEach(c => {
  const k = c.key, fig = c.t === 'fig';
  if (!/^[a-z]+$/.test(k)) err(k, 'key is not lowercase letters');
  if (OLD[k] || C.GUIDES[k] || C.PLACES[k]) err(k, 'key is already used in cards.js');
  if (names[String(c.n).toLowerCase()]) err(k, 'name is already in the game (' + names[c.n.toLowerCase()] + ')');
  if (['fig', 'relic', 'deed'].indexOf(c.t) < 0) err(k, 'unknown type ' + c.t);
  ['n', 'f', 'cap', 'tx', 'fact', 'art', 'src'].forEach(f => { if (typeof c[f] !== 'string' || (!c[f] && !(f === 'tx' && fig))) err(k, 'missing ' + f); });
  if (typeof c.sure !== 'boolean') err(k, 'sure must be true or false');
  if (typeof c.c !== 'number' || c.c < 0) err(k, 'missing cost');
  if (typeof c.y !== 'number') err(k, 'missing year');
  if (!FACS[c.f]) err(k, 'unknown faction ' + c.f);
  if (fig) {
    if (!REGS[c.reg]) err(k, 'unknown region ' + c.reg);
    if (!(c.era >= 1 && c.era <= ERAS)) err(k, 'unknown era ' + c.era); else if (c.era !== eraOf(c.y)) err(k, 'era ' + c.era + ' does not match year ' + c.y);
    if (c.y > C.ERAS[ERAS].to) warn.push(k + ' (' + c.y + ')');
    if (typeof c.m !== 'number') err(k, 'missing Might');
    else if (!RANGE[c.c]) err(k, 'no Figure in the game costs ' + c.c);
    else if (c.m < RANGE[c.c][0] || c.m > RANGE[c.c][1]) err(k, 'Might ' + c.m + ' is outside what cost ' + c.c + ' has now (' + RANGE[c.c].join(' to ') + ')');
    if (!c.k || typeof c.k !== 'object') err(k, 'missing k'); else Object.keys(c.k).forEach(w => { if (!KEYWORDS[w]) err(k, 'engine.js has no skill ' + w); });
    if (c.arr && (!ARRS[c.arr[0]] || typeof c.arr[1] !== 'number')) err(k, 'engine.js has no arrival effect ' + c.arr);
    if (!Array.isArray(c.ll) || c.ll.length !== 2 || Math.abs(c.ll[0]) > 180 || Math.abs(c.ll[1]) > 90) err(k, 'bad ll');
    // the text leads with a skill word exactly when the card has that skill, and names its Legacy
    Object.keys(LEAD).forEach(w => { const has = new RegExp('(^|\\. )' + w + '[.:]').test(c.tx); if (has !== !!(c.k && c.k[LEAD[w]])) err(k, 'text and skills disagree about ' + w); });
    if (/Legacy of /.test(c.tx) !== !!c.insp) err(k, 'text and insp disagree about Legacy');
    (c.insp || []).forEach(s => { const o = OLD[s] || NEW[s]; if (!o || o.t !== 'fig') err(k, 'Legacy source ' + s + ' is not a Figure'); else if (c.tx.indexOf(o.n) < 0) err(k, 'text does not name ' + o.n); });
    if ((c.arr || []).length && !/On arrival, /.test(c.tx)) err(k, 'text does not give the arrival effect');
  } else {
    if (c.m != null || c.k || c.arr || c.insp) err(k, 'only Figures have m, k, arr or insp');
    const src = OLD[c.as]; if (!src || src.t !== c.t || !namedInEngine(c.as)) err(k, 'as must be a ' + c.t + ' that engine.js handles');
    else { if (c.c !== src.c) err(k, 'cost differs from ' + c.as); if (c.tx !== T.CARDS[c.as].tx) err(k, 'text differs from ' + c.as); if (!!c.quick !== !!src.quick) err(k, 'quick differs from ' + c.as); }
    if (c.t === 'relic' && c.f !== 'N') err(k, 'a Relic is faction N');
    if (c.t === 'relic' && !Array.isArray(c.ll)) err(k, 'missing ll');
  }
  // links: every source exists and has its sentence, and there is no sentence without a source
  const srcs = (c.insp || []).concat(c.from || []), links = c.links || {};
  srcs.forEach(s => { if (!known(s)) err(k, 'link source ' + s + ' is not a card or a Place'); if (s === k) err(k, 'links to itself'); const t = links[s + '>' + k]; if (!t) err(k, 'no sentence for ' + s + '>' + k); else if (!/[.!?”]$/.test(t)) err(k, 'link sentence has no full stop'); if (T.LINKS[s + '>' + k]) err(k, 'text.js already has ' + s + '>' + k); });
  Object.keys(links).forEach(l => { const p = l.split('>'); if (p[1] !== k || srcs.indexOf(p[0]) < 0) err(k, 'stray link ' + l); });
  if ((c.insp || []).some(s => (c.from || []).indexOf(s) >= 0)) err(k, 'a source is in both insp and from');
  // writing: no dots stringing facts together, nothing cut off
  ['n', 'cap', 'tx', 'fact', 'art', 'say'].concat(Object.keys(links).map(l => 'links.' + l)).forEach(f => { const v = f.slice(0, 6) === 'links.' ? links[f.slice(6)] : c[f]; if (typeof v !== 'string') return;
    if (/ · |·/.test(v)) err(k, f + ' has a middle dot'); if (/…|\.\.\./.test(v)) err(k, f + ' has an ellipsis'); if (/\s\s|^\s|\s$/.test(v)) err(k, f + ' has stray spaces'); });
  if (c.fact && !/[.!?”]$/.test(c.fact)) err(k, 'fact has no full stop');
  if (c.fact && c.fact.length > 330) err(k, 'fact is ' + c.fact.length + ' letters long');
  if (!/top left corner/.test(c.art || '')) err(k, 'art brief does not keep the top left corner clear');
  if (!/^(https:\/\/|[A-Z])/.test(c.src || '')) err(k, 'src is not a URL or a book');
});
// no two-way Legacy or Thread loops inside the set
cards.forEach(c => (c.insp || []).concat(c.from || []).forEach(s => { const o = NEW[s]; if (o && (o.insp || []).concat(o.from || []).indexOf(c.key) >= 0) err(c.key, 'and ' + s + ' each name the other as a source'); }));

// named lines
const oldIds = {}; C.THREADS.forEach(t => { oldIds[t.id] = t; });
const ids = {}; (SET.threads || []).forEach(t => {
  if (ids[t.id] || oldIds[t.id]) err('thread ' + t.id, 'id already used'); ids[t.id] = 1;
  if (!t.n || !Array.isArray(t.cards) || t.cards.length < 2) err('thread ' + t.id, 'needs a name and two cards or more');
  (t.cards || []).forEach(k => { if (!OLD[k] && !NEW[k]) err('thread ' + t.id, 'unknown card ' + k); });
  (t.places || []).forEach(p => { if (!C.PLACES[p]) err('thread ' + t.id, 'unknown Place ' + p); });
  if (!(t.cards || []).some(k => NEW[k])) err('thread ' + t.id, 'has no new card');
  if (C.THREADS.some(o => o.n === t.n)) err('thread ' + t.id, 'name already used');
});
(SET.threadAdds || []).forEach(t => { if (!oldIds[t.id]) err('threadAdds ' + t.id, 'cards.js has no such line'); t.add.forEach(k => { if (!NEW[k]) err('threadAdds ' + t.id, 'unknown new card ' + k); }); });
(SET.existing || []).forEach(x => { if (!OLD[x.card]) err('existing ' + x.card, 'not a card in cards.js'); if (!NEW[x.source]) err('existing ' + x.card, 'source ' + x.source + ' is not in the set'); if (['from', 'insp'].indexOf(x.add) < 0 || !x.sentence) err('existing ' + x.card, 'needs add and sentence');
  if (x.add === 'insp' && (OLD[x.card].t !== 'fig' || NEW[x.source].t !== 'fig')) err('existing ' + x.card, 'a Legacy line joins two Figures'); });

// ── the report ──
const pad = (s, n) => (s + '                              ').slice(0, n), num = (v, n) => ('           ' + v).slice(-n);
function table(title, rows, cols, cell, total) {
  console.log('\n' + title);
  console.log(pad('', 22) + cols.map(c => num(c, 9)).join('') + (total ? num('all', 7) : ''));
  rows.forEach(r => { let sum = 0; const line = cols.map(c => { const v = cell(r[0], c); sum += v; return num(v || '.', 9); }).join(''); console.log(pad(r[1], 22) + line + (total ? num(sum, 7) : '')); });
}
const count = f => cards.filter(f).length;
const FAC = [['D', 'Discovery'], ['S', 'Statecraft'], ['V', 'Valor'], ['A', 'Arts'], ['W', 'Wonder'], ['N', 'no faction (Relics)']];
const TYPES = ['fig', 'relic', 'deed'], REG = Object.keys(REGS), figs = cards.filter(c => c.t === 'fig');
console.log('set-150.json: ' + cards.length + ' cards (' + TYPES.map(t => count(c => c.t === t) + ' ' + t).join(', ') + ')');
table('By faction and type', FAC, TYPES, (f, t) => count(c => c.f === f && c.t === t), true);
table('Figures by faction and region', FAC.slice(0, 5), REG, (f, r) => figs.filter(c => c.f === f && c.reg === r).length, true);
console.log(pad('all', 22) + REG.map(r => num(figs.filter(c => c.reg === r).length, 9)).join('') + num(figs.length, 7));
table('Figures by faction and era', FAC.slice(0, 5), C.ERAS.slice(1).map((e, i) => i + 1), (f, e) => figs.filter(c => c.f === f && c.era === e).length, true);
console.log(pad('all', 22) + C.ERAS.slice(1).map((e, i) => num(figs.filter(c => c.era === i + 1).length, 9)).join('') + num(figs.length, 7));
C.ERAS.slice(1).forEach((e, i) => console.log('  era ' + (i + 1) + ': ' + e.n + ', to ' + e.to));
table('By faction and cost (all cards)', FAC, [0, 1, 2, 3, 4, 5], (f, n) => count(c => c.f === f && c.c === n), true);
console.log(pad('all', 22) + [0, 1, 2, 3, 4, 5].map(n => num(count(c => c.c === n), 9)).join('') + num(cards.length, 7));
const kw = {}; figs.forEach(c => { Object.keys(c.k).forEach(w => { kw[w] = (kw[w] || 0) + 1; }); if (c.arr) { const a = c.arr[0] + ' ' + c.arr[1]; kw['arrive: ' + a] = (kw['arrive: ' + a] || 0) + 1; } if (!Object.keys(c.k).length && !c.arr) kw['(no skill)'] = (kw['(no skill)'] || 0) + 1; });
console.log('\nSkills on Figures: ' + Object.keys(kw).sort((a, b) => kw[b] - kw[a]).map(w => w + ' ' + kw[w]).join(', '));
const as = {}; cards.filter(c => c.as).forEach(c => { (as[c.as] = as[c.as] || []).push(c.key); });
console.log('Relics and Deeds, by the card whose effect they take: ' + Object.keys(as).map(a => a + ' (' + as[a].join(', ') + ')').join('; '));
const nLinks = cards.reduce((s, c) => s + Object.keys(c.links || {}).length, 0), lineCards = count(c => c.insp), threadCards = count(c => c.from);
console.log('Links: ' + nLinks + ' sentences; ' + lineCards + ' Figures with a Legacy line, ' + threadCards + ' cards with a Thread; ' + count(c => (c.insp || []).concat(c.from || []).some(s => OLD[s] || s[0] === '@')) + ' cards link back to a card or Place already in the game');
console.log('Named lines proposed: ' + (SET.threads || []).length + ' (' + (SET.threads || []).filter(t => t.cards.length >= 3).length + ' of three cards or more); new cards for ' + (SET.threadAdds || []).length + ' lines the game has');
console.log('Women: ' + figs.filter(c => /\b(she|her)\b/i.test(c.tx + ' ' + c.fact)).length + ' of ' + figs.length + ' Figures (counted from the wording)');
console.log('Checked this session (sure): ' + count(c => c.sure) + ' of ' + cards.length + (count(c => !c.sure) ? '; not sure: ' + cards.filter(c => !c.sure).map(c => c.key).join(', ') : ''));
if (warn.length) console.log('After ' + C.ERAS[ERAS].to + ', so filed in era ' + ERAS + ' until cards.js has a later era: ' + warn.join(', '));
console.log('\n' + (bad.length ? bad.length + ' PROBLEMS\n  ' + bad.join('\n  ') : 'All checks passed.'));
process.exit(bad.length ? 1 : 0);
