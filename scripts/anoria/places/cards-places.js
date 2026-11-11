// Anoria, Places prototype: the card pool for the test games. The game's own cards (games/anoria/cards.js, read and
// never changed), the ten draft cards that act on Places, and the draft Places with their domains (places.json).
'use strict';
const base = require('../../../games/anoria/cards'), data = require('./places.json');
const CARDS = {}; Object.keys(base.CARDS).forEach(k => { CARDS[k] = base.CARDS[k]; });
const F = (n, f, c, m, reg, y, k, x) => Object.assign({ n, t: 'fig', f, c, m, reg, y, k: k || {}, pl: 1 }, x || {});
// The ten cards that act on Places, at the costs the test games started from. results.txt ("What the Place cards
// should cost") says what each should cost; place-cards.json has those costs and what each card says.
const NEW = {
  pachacuti: F('Pachacuti', 'S', 4, 4, 'AMER', 1450, {}, { arr: ['scout', 3] }),          // look at your top three Places; one may go to your Gate or Outpost
  idrisi: F('Al-Idrisi', 'D', 3, 3, 'MED', 1154, {}, { arr: ['survey', 1] }),             // look through your whole stack for a Place for your Gate or Outpost
  constantine: F('Constantine', 'S', 5, 5, 'MED', 330, {}, { arr: ['found', 1] }),        // the top Place of your stack becomes the Crossroads
  william: F('William the Conqueror', 'V', 5, 5, 'EUR', 1066, {}, { arr: ['conquer', 1] }),   // on their side: they replace the Place where he stands
  wren: F('Christopher Wren', 'A', 3, 3, 'EUR', 1675, {}, { arr: ['rebuild', 1] }),       // a Place from your Place discard pile goes to your Gate or Outpost
  diogenes: F('Diogenes', 'D', 2, 2, 'MED', -350, { cynic: 1 }),                          // the Place where he stands has no rule
  earthquake: { n: 'Earthquake', t: 'deed', f: 'W', c: 2, y: -226, pl: 1 },               // a Gate or an Outpost is replaced from its owner's stack
  vesuvius: { n: 'Vesuvius', t: 'deed', f: 'W', c: 1, y: 79, pl: 1 },                     // lies on a Place: it has no rule until it is replaced
  caperoute: { n: 'The Cape Route', t: 'deed', f: 'D', c: 3, y: 1498, pl: 1 },            // the top Place of your stack becomes the Crossroads
  kudurru: { n: 'Boundary Stone', t: 'relic', f: 'N', c: 1, y: -1200, pl: 1 },            // their cards can't replace or silence your Gate and Outpost
};
Object.keys(NEW).forEach(k => { CARDS[k] = NEW[k]; });
const PLACES = {}, STACKS = {}, TODAY = {};
Object.keys(base.PLACES).forEach(k => { TODAY[k] = 1; });
// pw0: the rule a Place has in the game today (the only rule in play when the players bring no stacks)
const PW0 = { library: 'draw', silk: 'link', colosseum: 'arena', acropolis: 'double', wall: 'fort', stonehenge: 'spark', globe: 'facA', machu: 'closed', timbuktu: 'cheap', petra: 'sanctuary', nineveh: '', seneca: '' };
data.places.forEach(p => { PLACES[p.id] = { n: p.n, reg: p.reg, y: p.y, d: p.d, pw: p.pw, pw0: TODAY[p.id] ? PW0[p.id] : p.pw, stack: p.stack }; (STACKS[p.stack] || (STACKS[p.stack] = [])).push(p.id); });
module.exports = { CARDS, NEW, GUIDES: base.GUIDES, PLACES, CENTER: base.CENTER, EDGE: base.EDGE, ARCH: base.ARCH, STACKS, DOMAINS: data.domains, POWERS: data.powers, ALLPLACES: data.places.map(p => p.id) };
