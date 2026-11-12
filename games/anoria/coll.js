// Anoria: your collection. What you own, what you've seen, the packs waiting to be opened, how packs are earned,
// your decks and the Threads you've finished. No screens here (library.js, packs.js and decks.js draw them); this is
// the one place the rules of collecting live, so the simulator (scripts/anoria/pacing.js) plays the same ones.
//
// Saved under two keys that follow the account like everything else a game stores (a guest's stay on the device):
//   anoria_coll   {v, starter, cards{key: copies}, guides[], seen{key: 1}, fresh{key: 1} (not looked at yet),
//                  packs[{id, k: 'welcome' | 'daily' | 'feat', why, n}], wins, games, day (the day of the last daily
//                  pack), feats{normal, hard, built}, threads{id: 1} (finished and rewarded), opened,
//                  ed{key: bits} (the editions of a card found besides Matte: bit 1 Shiny, 2 Silver foil, 3 Gold foil,
//                  4 Rainbow foil), look{key: 0..4} (the edition the card is shown in)}
//   anoria_decks  [{id, n, guide, cards[]}]   the decks you built (a deck is DECK cards: one saved when a deck was 30
//                  is kept as it is and reads as 10 short until it is filled)
//
// The economy, in one place:
//   - Choose a Guide: that Guide's ready deck (20 cards, two of each) is yours, with three welcome packs of 12.
//   - A pack never holds a card you have two of. In a welcome pack half the slots go to cards you have none of; after
//     that any copy you're missing is as likely as any other, so new faces keep turning up for weeks.
//   - Your first win of the day against the computer: a pack of 2.
//   - Once each: your first win against Normal, against Hard, and with a deck you built: a pack of 2.
//   - A new Guide joins you at 3, 7, 12, 17, 23, 29, 35, 41 and 48 wins (ten Guides: the one you chose and nine more).
//   - Finishing a named Thread (owning every card on it): a second copy of one of its cards, as a gift. A Thread
//     that comes whole in your starter deck gives none.
//   Played every day at three games a day, the first series (91 cards since decks grew to 40) takes about a month to
//   finish (pacing.js, pacing.txt).
//   - Two series (2026-11-11, the third printing: 150 more cards, found only in packs, so the set is 241). The first
//     series is the 91 cards every ready deck is made of; the second is the 150. PACK_ORDER 'series': a pack holds
//     first-series cards until you have two of each, and only then the second series, so the first month is what it
//     was and the new cards are what comes after it. 'mixed' draws from the whole set at once. pacing.txt has both.
//   - v 2 (2026-11, a deck grew from 30 cards to 40): a collection from before is given the five new cards of its
//     starter deck, and of any other ready deck it already owned all of, so every deck it could play it still can.
//   - v 3 (2026-11-11, the legends left the set: cards.js RETIRED): whoever owned a retired card owns the card that has
//     its slot instead, as many copies, and the decks they built hold it too. No pack can give a retired card, because
//     packs only ever draw from the set (ALL). A named Thread finished before keeps its flag under its old id.
//   - Editions (v 4, Tim, 2026-11-11): every card is printed in five finishes that play the same, each rarer than the
//     one before: Matte, Shiny, Silver foil, Gold foil and Rainbow foil (EDITIONS). Every card out of a pack has one,
//     rolled by ED_ODDS. A Matte card is a copy you are missing, as before. A foil is a card you have not found in
//     that finish, whether or not you have two of it: it counts as a copy if you are missing one, and either way the
//     finish is yours for that card for good, on every copy. So a pack never holds something you already have, and
//     once you have two of every card the packs go on turning up finishes until there are none left to find. While
//     copies are still missing, a foil of a card you have two of is an extra card in the pack, so the set takes as
//     long to complete as it did before there were foils. A collection from before has every card in Matte, and an
//     edition found for a card that is retired later goes to the card that takes its slot.
//   - Rarity (the same day: "make more powerful cards more rare to find in packs"): every card has a tier from its
//     power, 1 Common to 4 Legendary (RARE, worked out by scripts/anoria/rarity.js and written down here), and a
//     pack slot is that much less likely to be a card of a higher tier (TIER_W).
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards')); else root.AnoriaColl = factory(root.AnoriaCards); })(this, function (C) {
'use strict';
const CARDS = C.CARDS, ARCH = C.ARCH, GUIDES = C.GUIDES, THREADS = C.THREADS, GROWN = C.GROWN || {}, RETIRED = C.RETIRED || {};
const ALL = Object.keys(CARDS), CAP = 2, DECK = 40, FRESH = { welcome: 0.5 };
const GUIDE_AT = [3, 7, 12, 17, 23, 29, 35, 41, 48], VER = 4;
let WELCOME = [12, 12, 12];   // (the welcome packs; pacing.js can try others through use())
let DAILY = 5, FEAT = 5;   // (cards in an earned pack, 5 since 2026-11-12, Tim: "do 5 cards"; pacing.js can try other sizes through use())
// ── How packs work with a set of 241 cards: the two lines to change ─────────────────────────────────────────
// PACK_ORDER 'series': packs hold the first series (the 91 cards of the first two printings) until you have two of
// each card in it, and then the second series (the 150 cards of the third printing). 'mixed': any card of the whole
// set you are missing, from the first pack on (the ready decks then take about four months to fill, not one).
let PACK_ORDER = 'mixed';   // (Tim, 2026-11-12: "all series should be available in packs, no requirement to have both of every card first, until we have special sets in the future")
// SERIES2_PACK: how many cards an earned pack holds once the first series is complete. 0: the same as any earned
// pack (DAILY and FEAT, 3 today). 5 is what pacing.txt recommends, so the 150 take about two months and not three
// and a half. Tim's to decide: it is 0 until he does.
let SERIES2_PACK = 0;
const seriesOf = k => (CARDS[k] && CARDS[k].pr === 3 ? 2 : 1), S1 = ALL.filter(k => seriesOf(k) === 1);
// the first series is complete: two of every card in it
const s1done = s => S1.every(k => (s.cards[k] || 0) >= CAP);
// the cards a pack can hold today
const inPacks = s => (PACK_ORDER === 'series' && !s1done(s) ? S1 : ALL);
// how many cards an earned pack holds today
const packSize = (s, n) => (PACK_ORDER === 'series' && SERIES2_PACK && s1done(s) ? SERIES2_PACK : n);
const KEY = 'anoria_coll', DKEY = 'anoria_decks';
// The five editions of a card, commonest first, and the chance that a card out of a pack is each of the foils (the
// rest are Matte). pacing.js plays these: about one pack in three holds a foil of some kind, and a Rainbow foil is
// weeks apart.
const EDITIONS = [{ id: 'matte', n: 'Matte' }, { id: 'shiny', n: 'Shiny' }, { id: 'silver', n: 'Silver foil' }, { id: 'gold', n: 'Gold foil' }, { id: 'rainbow', n: 'Rainbow foil' }];
let ED_ODDS = [0, 0.085, 0.04, 0.018, 0.007];
// Rarity. The cards of each tier, from "node scripts/anoria/rarity.js 6000" (rarity.txt has the table). A card on
// none of the lists (a new set, before the script is run again) goes by its cost.
const RARE = {
  4: 'zhenghe newton alexander charlemagne elizabeth sittingbull caesar scipio alfred',
  3: 'chingshih sargon hannibal aristotle shaka beethoven mansamusa hiawatha bolivar joan darwin toussaint chaucer michelangelo yisunsin virgil imhotep hammurabi',
  2: 'copernicus dante saladin murasaki shakespeare douglass sundiata blackbeard galileo leonidas antikythera ashoka sacagawea magellan homer leif theodora zhangqian nzinga lakshmibai mozart marcopolo haytham artemisia marcus yaa tecumseh',
  1: 'faraday hokusai tomoe plato sorjuana germain confucius boudica harun coleman ibnbattuta ibnsina hatshepsut rift shenkuo archimedes pericles ambush press khutulun ada crossing phalanx caravan socrates ashurbanipal nostradamus compass sappho hypatia spartacus mencius eureka eclipse fairwinds encore decree'
};
// The third printing (the 150 cards found only in packs), tiered among themselves by the same measure: 'node
// scripts/anoria/rarity.js 6000 3' (rarity.txt). The cards the game had before keep the tiers above, and the marks
// printed on them: they are not ranked again against the new ones.
const RARE3 = {
  4: 'humboldt augustus napoleon victoria qinshihuang washington amundsen hippocrates pasteur bach cyrus eleanor verne zenobia',
  3: 'menelik vercingetorix lalibela telescope rosetta tchaikovsky braille zumbi goethe sextant cervantes tolstoy suleiman pachacuti starchart lapulapu ropebridge catherine equiano hiroshige nezahualcoyotl bly darius musashi aeschylus stirrup tesla ferdowsi',
  2: 'amanirenas pythagoras vangogh nightingale testudo gutenberg arminius libai wuzetian akbar stanton andersen chiefjoseph sejong halley alkhwarizmi poe voltaire nanny fibonacci locomotive rumi shelley oakley enheduanna ramesses brownsbox gentileschi wrightflyer jenner kepler syracuse kublai richard basho montagu hildegard pakal fuhao trung teutoburg anning',
  1: 'dickinson duchatelet sequoyah wollstonecraft shahjahan beagle ibnkhaldun seishonagon anthony marathonmarch planter zhangheng tutankhamun voyagingcanoe longship joplin champollion paper emancipation cailun tomb quipu houdini birchbark austen typhoon grace adwa david rubicon euclid eratosthenes rite kadesh brahmagupta twain pictureshow telegraph thoreau wallace wheatley tablet magnacarta goldrush hieroglyphs balloon wheel naovictoria ninth astrolabe manuscripts folio truce'
};
const TIERS = ['', 'Common', 'Uncommon', 'Rare', 'Legendary'], TIER_W = [0, 1, 0.6, 0.35, 0.2], TIER = {};
[RARE, RARE3].forEach(L => Object.keys(L).forEach(t => L[t].split(' ').forEach(k => { if (k) TIER[k] = +t; })));
const rarity = k => TIER[k] || (!CARDS[k] ? 1 : CARDS[k].c >= 5 ? 3 : CARDS[k].c >= 4 ? 2 : 1);
const FEATS = { normal: 'Your first win against Normal', hard: 'Your first win against Hard', built: 'Your first win with a deck you built' };

// where it's kept, the dice and the clock: the page's own unless a test hands in others (use())
let store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
let rnd = Math.random, now = () => new Date();
function use(o) { if (o.store) store = o.store; if (o.random) rnd = o.random; if (o.now) now = o.now; if (o.daily) DAILY = o.daily; if (o.feat) FEAT = o.feat; if (o.odds) ED_ODDS = o.odds;
  if (o.welcome) WELCOME = o.welcome; if (o.order) PACK_ORDER = o.order; if (o.pack2 != null) SERIES2_PACK = o.pack2; cache = null; }

const blank = () => ({ v: VER, starter: null, cards: {}, guides: [], seen: {}, fresh: {}, packs: [], wins: 0, games: 0, day: '', feats: {}, threads: {}, opened: 0, pid: 1, ed: {}, look: {} });
let cache = null, cacheRaw = null;
function load() {
  const raw = store.get(KEY);
  if (cache && raw === cacheRaw) return cache;   // (another device's newer copy arriving shows as different text)
  let s = null; try { s = raw ? JSON.parse(raw) : null; } catch (e) {}
  cache = Object.assign(blank(), s && typeof s === 'object' ? s : {}); cacheRaw = raw;
  if (cache.starter === 'Tricksters') cache.starter = 'Pathfinders';   // (the deck's first name, before it was renamed)
  if (!cache.ed || typeof cache.ed !== 'object') cache.ed = {}; if (!cache.look || typeof cache.look !== 'object') cache.look = {};
  // (retired cards first, so that a ready deck owned whole under its old cards still counts as owned whole in grow().
  // retire() goes by what is in the collection, not by its version: a device that has not updated yet can write the
  // old keys back, and they are put right again here. v 4 added editions: a collection from before has none found,
  // so every card is Matte, and nothing else changes.)
  const v = cache.v || 1, had = !!cache.starter, swapped = retire(cache);
  if (v < 2) grow(cache);
  if (v < VER || swapped) { cache.v = VER; if (had || swapped) save(cache); myDecks(); }   // (myDecks puts the decks they built right too)
  return cache;
}
// The cards that have left the set (cards.js RETIRED): each copy becomes a copy of the card that has its slot now, a
// card that had been seen is still seen, and the new card shows as new in the Library of someone who owned the old
// one. A named Thread that now comes whole in the starter deck is simply theirs, as it is for someone starting today.
// Returns true if anything changed.
function retire(s) {
  let ch = false;
  Object.keys(RETIRED).forEach(old => { const k = RETIRED[old].to;
    if (s.cards && s.cards[old] != null) { if (s.cards[old] > 0) { s.cards[k] = Math.min(CAP, (s.cards[k] || 0) + s.cards[old]); s.seen[k] = 1; s.fresh[k] = 1; } delete s.cards[old]; ch = true; }
    if (s.seen && s.seen[old] != null) { s.seen[k] = 1; delete s.seen[old]; ch = true; }
    if (s.fresh && s.fresh[old] != null) { if (s.cards[k]) s.fresh[k] = 1; delete s.fresh[old]; ch = true; }
    // (the editions found for the old card, and the one it was shown in, are the new card's)
    if (s.ed && s.ed[old] != null) { s.ed[k] = (s.ed[k] || 0) | s.ed[old]; delete s.ed[old]; ch = true; }
    if (s.look && s.look[old] != null) { if (s.look[old] > (s.look[k] || 0)) s.look[k] = s.look[old]; delete s.look[old]; ch = true; } });
  if (ch && s.starter && ARCH[s.starter]) { const mine = ARCH[s.starter].cards; THREADS.forEach(t => { if (!s.threads[t.id] && t.cards.every(k => mine.indexOf(k) >= 0)) s.threads[t.id] = 1; }); }
  return ch;
}
// A collection from when a deck was 30 cards: each ready deck gained five cards (cards.js GROWN). The starter deck's
// five are given, two of each, and so are those of any other ready deck this collection owned every card of, so a deck
// that could be played yesterday can be played today. They show as new in the Library. A named Thread that now comes
// whole inside the starter deck is simply theirs, as it is for someone starting today.
function grow(s) {
  if (!s.starter || !ARCH[s.starter]) return;
  Object.keys(ARCH).forEach(name => {
    const add = GROWN[name] || [], old = ARCH[name].cards.filter(k => add.indexOf(k) < 0);
    if (name !== s.starter && !old.every(k => (s.cards[k] || 0) >= CAP)) return;
    add.forEach(k => { if ((s.cards[k] || 0) < CAP) { if (!s.cards[k]) s.fresh[k] = 1; s.cards[k] = CAP; s.seen[k] = 1; } });
  });
  const mine = ARCH[s.starter].cards;
  THREADS.forEach(t => { if (!s.threads[t.id] && t.cards.every(k => mine.indexOf(k) >= 0)) s.threads[t.id] = 1; });
}
function save(s) { cacheRaw = JSON.stringify(s); cache = s; store.set(KEY, cacheRaw); return s; }
function reset() { cache = null; store.set(KEY, JSON.stringify(blank())); store.set(DKEY, '[]'); }
const dayKey = d => { d = d || now(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

// ── What you have ───────────────────────────────────────────────────────────────────────────────────────────
const copies = k => load().cards[k] || 0;
// 'own' (with how many), 'seen' (met across the table, not yours) or 'new' (never seen)
function cardState(k) { const s = load(), n = s.cards[k] || 0; return n ? 'own' : s.seen[k] ? 'seen' : 'new'; }
function counts() {
  const s = load(); let own = 0, cop = 0, seen = 0;
  for (const k of ALL) { const n = Math.min(CAP, s.cards[k] || 0); if (n) { own++; cop += n; } else if (s.seen[k]) seen++; }
  return { own: own, copies: cop, seen: seen, cards: ALL.length, all: ALL.length * CAP, series: PACK_ORDER === 'series' ? (s1done(s) ? 2 : 1) : 0, guides: s.guides.length, guidesAll: Object.keys(GUIDES).length, complete: cop === ALL.length * CAP && s.guides.length === Object.keys(GUIDES).length };
}
// The editions of a card: which are found ([Matte, Shiny, Silver foil, Gold foil, Rainbow foil]: Matte is found once
// you own the card), the one it is shown in, and choosing another (only one you have found).
function editions(k) { const s = load(), b = s.ed[k] || 0; return EDITIONS.map((x, e) => (e ? !!(b >> e & 1) : (s.cards[k] || 0) > 0)); }
function look(k) { const s = load(), e = s.look[k] || 0; return e && (s.ed[k] || 0) >> e & 1 ? e : 0; }
function setLook(k, e) { const s = load(); e = +e || 0; if (!CARDS[k] || look(k) === e || (e && !((s.ed[k] || 0) >> e & 1))) return false; if (e) s.look[k] = e; else delete s.look[k]; save(s); return true; }
// how many cards have been found in each edition
function edCounts() { const s = load(), n = EDITIONS.map(() => 0); for (const k of ALL) { if (s.cards[k]) n[0]++; const b = s.ed[k] || 0; for (let e = 1; e < n.length; e++) if (b >> e & 1) n[e]++; } return n; }
function markSeen(keys) { const s = load(); let ch = false; (keys || []).forEach(k => { if (CARDS[k] && !s.seen[k]) { s.seen[k] = 1; ch = true; } }); if (ch) save(s); }
function looked(k) { const s = load(); if (s.fresh[k]) { delete s.fresh[k]; save(s); } }
// (leaving the Library: you've seen what's new there)
function lookedAll() { const s = load(); if (Object.keys(s.fresh).length) { s.fresh = {}; save(s); } }

// ── Starting out ────────────────────────────────────────────────────────────────────────────────────────────
function chooseStarter(name) {
  const s = load(); if (s.starter || !ARCH[name]) return false;
  s.starter = name; ARCH[name].cards.forEach(k => { s.cards[k] = CAP; s.seen[k] = 1; });
  s.guides = [ARCH[name].guide];
  // (a Thread that comes whole in the starter is simply yours: gifts are for the ones you finish by collecting)
  THREADS.forEach(t => { if (t.cards.every(k => s.cards[k])) s.threads[t.id] = 1; });
  WELCOME.forEach(n => s.packs.push({ id: s.pid++, k: 'welcome', why: 'A welcome pack', n: n }));
  save(s); return true;
}

// ── Packs ───────────────────────────────────────────────────────────────────────────────────────────────────
// Open the pack with this id (the oldest one if none is named): its cards join the collection.
// Returns {pack, cards: [{c, first (your first copy), n (copies you now have), ed (the edition it came in, 0..4),
// copy (it added a copy: a foil of a card you had two of did not)}], threads: [...] (see settleThreads)}
// A foil of a card you already had two of comes as an extra card (the slot it turned up in still holds a copy you are
// missing), so the foils never hold the set back: a pack of 3 can have 4 cards in it.
function openPack(id) {
  const s = load(), i = id == null ? 0 : s.packs.findIndex(p => p.id === id); if (i < 0 || !s.packs[i]) return null;
  const pack = s.packs.splice(i, 1)[0], out = [];
  for (let n = 0, extra = 0; n < pack.n; n++) {
    const x = slot(s, FRESH[pack.k] || 0); if (!x) break;
    const k = x.k, copy = (s.cards[k] || 0) < CAP, first = !s.cards[k];
    if (copy) s.cards[k] = (s.cards[k] || 0) + 1; s.seen[k] = 1; if (first) s.fresh[k] = 1;
    if (x.e) found(s, k, x.e);
    out.push({ c: k, first: first, n: s.cards[k], ed: x.e, copy: copy });
    if (!copy && extra < pack.n && ALL.some(c => (s.cards[c] || 0) < CAP)) { extra++; n--; }
  }
  s.opened++; save(s);
  return { pack: pack, cards: out, threads: settleThreads() };
}
// One slot of a pack: which card, in which edition. The edition is rolled first (ED_ODDS). A Matte slot is a copy
// you are missing; a foil slot is a card you have not found in that finish. A roll with nothing left to give moves
// up to the next edition that has (then down), so a slot is only empty when there is nothing at all left to find.
function rollEdition() { let r = rnd(); for (let e = EDITIONS.length - 1; e > 0; e--) { if (r < ED_ODDS[e]) return e; r -= ED_ODDS[e]; } return 0; }
function slot(s, fresh) {
  const e0 = rollEdition(), order = []; for (let e = e0; e < EDITIONS.length; e++) order.push(e); for (let e = e0 - 1; e >= 0; e--) order.push(e);
  for (const e of order) {
    if (!e) { const k = missing(s, fresh); if (k) return { k: k, e: 0 }; continue; }
    const pool = inPacks(s).filter(k => !((s.ed[k] || 0) >> e & 1)); if (!pool.length) continue;   // (a foil is a card of the series the packs are on)
    return { k: weighted(pool, k => TIER_W[rarity(k)]), e: e };
  }
  return null;
}
function weighted(pool, w) { let tot = 0; pool.forEach(k => { tot += w(k); }); let r = rnd() * tot; for (const k of pool) { r -= w(k); if (r < 0) return k; } return pool[pool.length - 1]; }
// this edition of this card is found, for good; the card is shown in it unless it is already shown in a rarer one
function found(s, k, e) { s.ed[k] = (s.ed[k] || 0) | (1 << e); if (e > (s.look[k] || 0)) s.look[k] = e; }
// One copy you're missing. Each missing copy is as likely as any other of its rarity (so a card you have none of is
// twice as likely as one you have one of, and a Common is likelier than a Legendary by TIER_W); fresh is the chance
// the slot goes straight to a card you have none of.
function missing(s, fresh, among) {
  const pool = (among || inPacks(s)).filter(k => (s.cards[k] || 0) < CAP); if (!pool.length) return null;
  const none = pool.filter(k => !s.cards[k]); if (none.length && rnd() < fresh) return weighted(none, k => TIER_W[rarity(k)]);
  return weighted(pool, k => TIER_W[rarity(k)] * (CAP - (s.cards[k] || 0)));
}
const packs = () => load().packs.slice();
function addPack(s, k, why, n) { const p = { id: s.pid++, k: k, why: why, n: n }; s.packs.push(p); return p; }

// ── Threads ─────────────────────────────────────────────────────────────────────────────────────────────────
// each named Thread with the cards of it you own
function threads() { const s = load(); return THREADS.map(t => { const have = t.cards.filter(k => s.cards[k]); return { id: t.id, n: t.n, cards: t.cards.slice(), places: (t.places || []).slice(), have: have, done: have.length === t.cards.length, rewarded: !!s.threads[t.id] }; }); }
// Threads finished since last time: each gives a second copy of one of its own cards (any missing copy if it has
// none to give). Returns
// [{id, n, gift: key | null}] and saves.
function settleThreads() {
  const s = load(), out = [];
  for (const t of THREADS) {
    if (s.threads[t.id] || !t.cards.every(k => s.cards[k])) continue;
    s.threads[t.id] = 1;
    const gift = missing(s, 0, t.cards) || missing(s, 0);
    if (gift) { if (!s.cards[gift]) s.fresh[gift] = 1; s.cards[gift] = (s.cards[gift] || 0) + 1; s.seen[gift] = 1; }
    out.push({ id: t.id, n: t.n, gift: gift });
  }
  if (out.length) { save(s); const more = settleThreads(); return out.concat(more); }   // (a gift can finish another Thread)
  return out;
}

// ── Playing earns ───────────────────────────────────────────────────────────────────────────────────────────
// After a game. o = {win, cpu (it was against the computer), level ('easy' | 'normal' | 'hard'), built (you played a
// deck you built), seen: [card keys the other side showed]}. Only games against the computer earn.
// Returns what it earned: [{t: 'pack', pack} | {t: 'guide', g}], in the order to show them.
function gameOver(o) {
  const s = load(), out = []; o = o || {};
  (o.seen || []).forEach(k => { if (CARDS[k]) s.seen[k] = 1; });
  s.games++;
  if (o.win && o.cpu && s.starter) {
    s.wins++;
    const today = dayKey();
    if (s.day !== today) { s.day = today; out.push({ t: 'pack', pack: addPack(s, 'daily', 'Your first win today', packSize(s, DAILY)) }); }
    const feat = (id, ok) => { if (ok && !s.feats[id]) { s.feats[id] = 1; out.push({ t: 'pack', pack: addPack(s, 'feat', FEATS[id], packSize(s, FEAT)) }); } };
    feat('normal', o.level === 'normal' || o.level === 'hard'); feat('hard', o.level === 'hard'); feat('built', !!o.built);
    if (GUIDE_AT.indexOf(s.wins) >= 0) { const left = Object.keys(GUIDES).filter(g => s.guides.indexOf(g) < 0); if (left.length) { const g = left[(rnd() * left.length) | 0]; s.guides.push(g); out.push({ t: 'guide', g: g }); } }
  }
  save(s); return out;
}
// what's next to earn, for the Library to show: [{what, when}]
function nextUp() {
  const s = load(), out = [];
  out.push({ id: 'daily', n: packSize(s, DAILY), what: 'A pack of ' + packSize(s, DAILY), when: s.day === dayKey() ? 'Tomorrow, for your first win' : 'Your first win today', done: s.day === dayKey() });
  Object.keys(FEATS).forEach(id => { if (!s.feats[id]) out.push({ id: id, n: packSize(s, FEAT), what: 'A pack of ' + packSize(s, FEAT), when: FEATS[id] }); });
  const at = GUIDE_AT.filter(n => n > s.wins)[0]; if (at && s.guides.length < Object.keys(GUIDES).length) out.push({ id: 'guide', what: 'A new Guide', when: 'At ' + at + ' wins', have: s.wins, need: at });
  return out;
}

// ── Decks ───────────────────────────────────────────────────────────────────────────────────────────────────
const readyCards = name => ARCH[name].cards.concat(ARCH[name].cards);
// what's wrong with a deck, in words ([] when it can be played)
function problems(d) {
  const s = load(), out = [], n = {}; (d.cards || []).forEach(k => { n[k] = (n[k] || 0) + 1; });
  if (!d.guide || s.guides.indexOf(d.guide) < 0) out.push('Choose a Guide');
  const len = (d.cards || []).length; if (len !== DECK) out.push(len < DECK ? (DECK - len) + ' more to add' : (len - DECK) + ' too many');
  Object.keys(n).forEach(k => { if (!CARDS[k]) out.push('A card that isn\'t in the game'); else if (n[k] > CAP) out.push('More than two of ' + CARDS[k].n); else if (n[k] > (s.cards[k] || 0)) out.push('You have ' + (s.cards[k] || 0) + ' of ' + CARDS[k].n); });
  return out;
}
function myDecks() { let a = []; try { a = JSON.parse(store.get(DKEY) || '[]') || []; } catch (e) {} if (!Array.isArray(a)) return [];
  // (a deck built with a card that has left the set holds the card that has its slot now, and is saved that way)
  let ch = false; a.forEach(d => { if (d && Array.isArray(d.cards)) d.cards = d.cards.map(k => { if (!RETIRED[k]) return k; ch = true; return RETIRED[k].to; }); });
  if (ch) store.set(DKEY, JSON.stringify(a));
  return a; }
function saveDeck(d) { const a = myDecks(); if (!d.id) d.id = 'd' + Date.now().toString(36) + ((rnd() * 1296) | 0).toString(36); const i = a.findIndex(x => x.id === d.id); const rec = { id: d.id, n: String(d.n || 'My deck').slice(0, 24), guide: d.guide || '', cards: (d.cards || []).slice() }; if (i >= 0) a[i] = rec; else a.push(rec); store.set(DKEY, JSON.stringify(a)); return rec; }
function deleteDeck(id) { store.set(DKEY, JSON.stringify(myDecks().filter(d => d.id !== id))); }
// Every deck there is to play: the five ready decks (yours to play once you own all of one; your starter always is)
// and the decks you built. [{id, n, guide, cards, ready, starter, built, own (cards of it you own, of DECK), ok, why[]}]
function decks() {
  const s = load(), out = [];
  Object.keys(ARCH).forEach(name => { const cards = readyCards(name); let own = 0; ARCH[name].cards.forEach(k => { own += Math.min(CAP, s.cards[k] || 0); });
    const hasG = s.guides.indexOf(ARCH[name].guide) >= 0, ok = own === DECK && hasG;
    out.push({ id: 'ready:' + name, n: name, guide: ARCH[name].guide, cards: cards, ready: true, starter: s.starter === name, own: own, ok: ok, why: ok ? [] : [own < DECK ? 'You own ' + own + ' of its ' + DECK + ' cards' : GUIDES[ARCH[name].guide] + ' hasn\'t joined you yet'] }); });
  myDecks().forEach(d => { const why = problems(d); out.push({ id: d.id, n: d.n, guide: d.guide, cards: d.cards.slice(), built: true, own: d.cards.length, ok: !why.length, why: why }); });
  return out;
}
const deck = id => decks().filter(d => d.id === id)[0] || null;
// Fill a deck to DECK cards from what you own: more of its own factions first, a sensible spread of costs, Figures over the rest.
// Relics: a player has two in play and no two with the same power, so a deck that has fewer than two Relic cards is
// given Relics until it has two, each with a power the deck does not hold yet, and no more after that (with 23
// Relics to own it would otherwise fill up with cards it could never play; before, it was never given any).
const fxOf = k => CARDS[k].fx || k;
function finish(d) {
  const s = load(), n = {}, cards = (d.cards || []).slice(); cards.forEach(k => { n[k] = (n[k] || 0) + 1; });
  const fac = {}; cards.forEach(k => { const f = CARDS[k].f; fac[f] = (fac[f] || 0) + 1; });
  const cost = [0, 0, 0, 0, 0, 0, 0]; cards.forEach(k => { cost[Math.min(6, CARDS[k].c)]++; });
  const want = [3, 4, 11, 11, 8, 3, 0];   // (how many cards at each cost a deck of 40 wants)
  while (cards.length < DECK) {
    let best = null, bv = -1e9;
    for (const k of ALL) { const have = Math.min(CAP, s.cards[k] || 0); if ((n[k] || 0) >= have) continue; const c = CARDS[k], cc = Math.min(6, c.c);
      const rel = c.t === 'relic' ? (cards.filter(x => CARDS[x].t === 'relic').length < 2 && !cards.some(x => CARDS[x].t === 'relic' && fxOf(x) === fxOf(k)) ? 3 : -9) : 0;
      const v = (fac[c.f] || 0) * 0.25 + rel + (want[cc] - cost[cc]) * 0.6 + (c.t === 'fig' ? 1.2 : 0) - (n[k] ? 0.4 : 0) + rnd() * 0.3;
      if (v > bv) { bv = v; best = k; } }
    if (!best) break;
    cards.push(best); n[best] = (n[best] || 0) + 1; fac[CARDS[best].f] = (fac[CARDS[best].f] || 0) + 1; cost[Math.min(6, CARDS[best].c)]++;
  }
  return cards;
}

return { use, load, reset, grow, retire, dayKey, copies, cardState, counts, editions, look, setLook, edCounts, rarity, EDITIONS, TIERS, TIER_W, VER, get ED_ODDS() { return ED_ODDS; }, markSeen, looked, lookedAll, chooseStarter, packs, openPack, threads, settleThreads, gameOver, nextUp,
  problems, myDecks, saveDeck, deleteDeck, decks, deck, finish, readyCards, CAP, DECK, get WELCOME() { return WELCOME; }, get DAILY() { return DAILY; }, get FEAT() { return FEAT; }, GUIDE_AT, FEATS, ALL,
  seriesOf, S1, get PACK_ORDER() { return PACK_ORDER; }, get SERIES2_PACK() { return SERIES2_PACK; } };
});
