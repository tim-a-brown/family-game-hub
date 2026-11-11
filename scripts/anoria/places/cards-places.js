// Anoria, Domains prototype: the card pool for the test games. The game's own cards (games/anoria/cards.js, read and
// never changed), the draft cards that act on Domains, and the 75 draft Domains with their kinds and homes
// (domains.json). In code a Domain is still a "place", as it is in the game's engine: PLACES[id] = { n, reg (its
// home), d (its kind), pw (its rule), pw0 (the rule it has in the game today), stack }.
'use strict';
const base = require('../../../games/anoria/cards'), data = require('./domains.json');
const CARDS = {}; Object.keys(base.CARDS).forEach(k => { CARDS[k] = base.CARDS[k]; });
const F = (n, f, c, m, reg, y, k, x) => Object.assign({ n, t: 'fig', f, c, m, reg, y, k: k || {}, pl: 1 }, x || {});
// The cards that act on Domains, at the costs the test games started from. results.txt says what each should cost;
// domain-cards.json has those costs and what each card says.
const NEW = {
  pachacuti: F('Pachacuti', 'S', 4, 4, 'AMER', 1450, {}, { arr: ['scout', 3] }),          // look at your top three Domains; one may go to your Gate or Outpost
  idrisi: F('Al-Idrisi', 'D', 3, 3, 'MED', 1154, {}, { arr: ['survey', 1] }),             // look through your whole stack for a Domain for your Gate or Outpost
  constantine: F('Constantine', 'S', 5, 5, 'MED', 330, {}, { arr: ['found', 1] }),        // the top Domain of your stack becomes the Crossroads
  william: F('William the Conqueror', 'V', 5, 5, 'EUR', 1066, {}, { arr: ['conquer', 1] }),   // on their side: the Domain where he stands is replaced
  wren: F('Christopher Wren', 'A', 3, 3, 'EUR', 1675, {}, { arr: ['rebuild', 1] }),       // a Domain from your discard pile goes to your Gate or Outpost
  diogenes: F('Diogenes', 'D', 2, 2, 'MED', -350, { cynic: 1 }),                          // the Domain where he stands has no rule
  earthquake: { n: 'Earthquake', t: 'deed', f: 'W', c: 2, y: -226, pl: 1 },               // the Domain at a Gate or an Outpost is replaced
  vesuvius: { n: 'Vesuvius', t: 'deed', f: 'W', c: 1, y: 79, pl: 1 },                     // lies on a Domain: it has no rule until it is replaced
  caperoute: { n: 'The Cape Route', t: 'deed', f: 'D', c: 3, y: 1498, pl: 1 },            // the top Domain of your stack becomes the Crossroads
  kudurru: { n: 'Boundary Stone', t: 'relic', f: 'N', c: 1, y: -1200, pl: 1 },            // their cards can't replace, move or silence the Domains at your Gate and Outpost
};
// The three cards that move Domains from one position to another (the second round of tests)
const MOVE = {
  breda: { n: 'Treaty of Breda', t: 'deed', f: 'S', c: 2, y: 1667, pl: 1 },               // two Domains change places
  columbian: { n: 'The Columbian Exchange', t: 'deed', f: 'D', c: 3, y: 1492, pl: 1 },    // the line is reversed: Gate for Gate, Outpost for Outpost
  vienna: { n: 'Congress of Vienna', t: 'deed', f: 'S', c: 3, y: 1815, pl: 1 },           // all five Domains are shuffled and dealt back
};
Object.keys(NEW).forEach(k => { CARDS[k] = NEW[k]; }); Object.keys(MOVE).forEach(k => { CARDS[k] = MOVE[k]; });
const PLACES = {}, STACKS = {}, KD = { Commerce: 'COM', Industry: 'IND', Thought: 'THO', Land: 'LAND', Culture: 'CUL', Law: 'LAW', Routes: 'ROU' };
// pw0: the rule a Place has in the game today (the only rule in play when the players bring no stacks)
const PW0 = { library: 'draw', silk: 'link', colosseum: 'arena', acropolis: 'double', wall: 'fort', stonehenge: 'spark', globe: 'facA', machu: 'closed', timbuktu: 'cheap', petra: 'sanctuary', nineveh: '', seneca: '' };
data.domains.forEach(p => { PLACES[p.id] = { n: p.n, reg: p.home, y: p.y, d: KD[p.kind], kind: p.kind, pw: p.rule, pw0: base.PLACES[p.id] ? PW0[p.id] : p.rule, stack: p.stack }; (STACKS[p.stack] || (STACKS[p.stack] = [])).push(p.id); });
module.exports = { CARDS, RETIRED: base.RETIRED, NEW, MOVE, GUIDES: base.GUIDES, PLACES, CENTER: base.CENTER, EDGE: base.EDGE, ARCH: base.ARCH, STACKS, KINDS: data.kinds, RULES: data.rules, ALLPLACES: data.domains.map(p => p.id) };
