// Anoria: your collection. What you have, what you've seen, the packs waiting to be opened, the sphere and how it
// turns, the Guides and their callings, your decks and the Legacy Lines you've finished. No screens here (packs.js,
// library.js, decks.js and rewards.js draw them); this is the one place the rules of collecting live, so the pacing
// script (scripts/anoria/pacing.js) plays the same ones.
//
// Saved under two keys that follow the account like everything else a game stores (a guest's stay on the device):
//   anoria_coll   {v, starter (the Guide you chose to begin with), guides[] (the Guides with you), cards{key: 1} (the
//                  cards you have), seen{key: 1} (met across the table), fresh{key: 1} (not looked at yet),
//                  ed{key: bits} (the finishes of a card found besides Matte: bit 1 Shiny, 2 Silver foil, 3 Gold foil,
//                  4 Rainbow foil), look{key: 0..4} (the finish the card is shown in), doms{id: 1}, dnew{id: 1},
//                  packs[{id, k: 'welcome' | 'sphere' | 'first', why, n}], pid, opened (packs opened), games, wins,
//                  day (the day of your last first win of the day), signs (signs lit on the sphere now, 0 to 11),
//                  turns (full turns of the sphere), firsts{id: 1}, calls{guide: progress}, threads{id: 1} (the named
//                  Legacy Lines you have every card of), stacks{'guide:key': [ids]} (the Domain stack chosen for a
//                  Guide's deck, when it is not the deck's own)}
//   anoria_decks  [{id, n, guide, cards[], stack[]}]   the decks you built, each with the Domain stack saved for it
//
// The economy, in one place (Tim, 2026-11-13: "the starter pack should have 20 different cards + 8 domains, same with
// the guide packs that each have 8 domains"; extra copies are never awarded: you uncover a card or a finish, never
// multiples):
//   - The sets (cards.js BASE, GSET, DSET). Every company has the base set: 20 different cards and 8 Domains, the
//     same for everyone. Each of the twelve Guides brings a set of their own: 20 different cards and 8 Domains (some
//     Domains are in two Guides' sets). A new player chooses one of all twelve Guides and has the base set and that
//     Guide's set. The cards in no set (POOL) are found only in packs, and a card added to the game later joins them.
//   - A card you have can go in a deck twice (CAP) at once. So a Guide's deck is the 40 different cards of the base
//     set and that Guide's set, one of each, and any deck is 40 cards with no more than two of a card.
//   - The sphere has twelve signs (SIGNS). A finished game lights 1, a win lights 2 and your first win of the day 3
//     (LIGHT). However a game is played (against the computer or pass and play) it lights the same. Each time the
//     sphere comes full circle you have a pack of PACK cards, and on the turns in GUIDE_TURNS a Guide you don't have
//     yet joins you too, with their set.
//   - Each Guide also has a calling (CALLS): something done in games, which brings that Guide sooner. A Guide's
//     Domains you already have give nothing extra.
//   - Four firsts give a pack each (FIRSTS): your first win, your first against Normal and against Hard, and your
//     first with a deck you built. And two welcome packs come with your first Guide (WELCOME).
//   - A pack's every slot is a card you don't have or a finish you don't have: the finish is rolled first (ED_ODDS),
//     then the card, a Common more likely than a Legendary (TIER_W). Packs draw from the whole set, the cards of
//     Guides who haven't joined you included, and never hold a Domain: Domains come only with sets.
//   pacing.js plays all of this and checks it; pacing.txt has the numbers.
//   - v 6 (2026-11-13, Tim: "you can wipe any existing collections and start over too. i'm the only one that's played
//     so far"): a collection or decks from before are cleared and the first run starts again. The key names stay.
//   - Rarity: every card has a tier from its power, 1 Common to 4 Legendary (RARE, worked out by
//     scripts/anoria/rarity.js and written down here). It is printed on the card and weighs its chance in a pack.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards')); else root.AnoriaColl = factory(root.AnoriaCards); })(this, function (C) {
'use strict';
const CARDS = C.CARDS, GUIDES = C.GUIDES, THREADS = C.THREADS;
const ALL = Object.keys(CARDS), CAP = 2, DECK = 40, VER = 6;
const KEY = 'anoria_coll', DKEY = 'anoria_decks';
const PLACES = C.PLACES || {}, DOMS = Object.keys(PLACES).filter(id => PLACES[id].pw), STACK = C.STACK || 15;
const GKEYS = Object.keys(GUIDES);
// ── The sets: the base set and each Guide's (cards.js). A card that is not in the game on this page (the Domain cards
// with ?domains=0) is left out of them.
const has = k => !!CARDS[k];
const BASE = (C.BASE || []).filter(has), GSET = {}, DSET = { base: ((C.DSET || {}).base || []).filter(id => PLACES[id]) };
GKEYS.forEach(g => { GSET[g] = ((C.GSET || {})[g] || []).filter(has); DSET[g] = ((C.DSET || {})[g] || []).filter(id => PLACES[id]); });
const SET_OF = {}; BASE.forEach(k => { SET_OF[k] = 'base'; }); GKEYS.forEach(g => GSET[g].forEach(k => { SET_OF[k] = g; }));
// the cards found only in packs: every card in no set, so a card added to the game joins them by itself
const POOL = ALL.filter(k => !SET_OF[k]);
const setOf = k => SET_OF[k] || null;
const setCards = id => (id === 'base' ? BASE : GSET[id] || []).slice();
// ── The sphere, the Guides and the packs: the numbers to change (pacing.js plays them, pacing.txt has the table) ──
const SIGNS = 12;   // (the signs round the sphere: a full turn)
let LIGHT = { game: 1, win: 1, daily: 1 };   // (a finished game lights 1, a win 1 more, your first win of the day 1 more)
let PACK = 5;   // (cards in a pack the sphere or a first gives)
let WELCOME = [5, 5];   // (the welcome packs that come with your first Guide)
let GUIDE_TURNS = [1, 2, 4, 6, 9, 12, 15, 18, 21, 24, 27];   // (the turns of the sphere on which a Guide joins you: with the callings, all twelve in about 29 days at 3 games a day)
// The five finishes of a card, commonest first, and the chance that a slot of a pack is each of the foils (the rest
// are Matte: a card you don't have yet)
const EDITIONS = [{ id: 'matte', n: 'Matte' }, { id: 'shiny', n: 'Shiny' }, { id: 'silver', n: 'Silver foil' }, { id: 'gold', n: 'Gold foil' }, { id: 'rainbow', n: 'Rainbow foil' }];
let ED_ODDS = [0, 0.085, 0.04, 0.018, 0.007];
// The callings: what each Guide asks of you to join sooner (Tim, 2026-11-13). `per`: 'game' counts the games in which
// it happened (m[x] true), 'count' adds up m[x] over games, 'packs' counts the packs you open. The needs are set so that
// a calling is met about as soon as the sphere would bring that Guide (pacing.js, calls.txt for how often each happens).
// Each need is about 80 games' worth of what the robots did (scripts/anoria/calls.js, calls.txt). `say` is the calling
// as a player reads it, with # for the number.
const CALLS = {
  cleopatra: { per: 'game', m: 'hold4', need: 30, say: 'Hold four Domains when a round ends, in # games.' },
  leonardo: { per: 'game', m: 'relics2', need: 40, say: 'Have two Relics in play at once, in # games.' },
  tubman: { per: 'game', m: 'sealsWin', need: 8, say: 'Win # games by breaking all of the other player\'s Seals.' },
  suntzu: { per: 'game', m: 'noSealLost', need: 20, say: 'Win # games without losing a Seal.' },
  shakespeare: { per: 'count', m: 'lines', need: 130, say: 'Make # Legacy Lines.' },
  curie: { per: 'count', m: 'play3', need: 250, say: 'Play three cards in one turn, # times.' },
  joan: { per: 'game', m: 'behindWin', need: 30, say: 'Win # games in which you were behind when a round ended.' },
  saladin: { per: 'game', m: 'clash3', need: 65, say: 'Win three clashes you started in one game, in # games.' },
  wuzetian: { per: 'count', m: 'most', need: 225, say: 'Hold more Domains than the other player when a round ends, # times.' },
  akbar: { per: 'game', m: 'facs5', need: 50, say: 'Play Figures of all five factions in one game, in # games.' },
  mansamusa: { per: 'packs', need: 18, say: 'Open # packs.' },
  sorjuana: { per: 'game', m: 'scholars3', need: 50, say: 'Play three Scholars in one game, in # games.' }
};
const FIRSTS = { win: 'Your first win', normal: 'Your first win against Normal', hard: 'Your first win against Hard', built: 'Your first win with a deck you built' };
// Rarity. The cards of each tier, from "node scripts/anoria/rarity.js 6000" (rarity.txt has the table). A card on
// none of the lists (a new set, before the script is run again) goes by its cost.
const RARE = {
  4: 'zhenghe newton alexander charlemagne elizabeth sittingbull caesar scipio alfred',
  3: 'chingshih sargon hannibal aristotle shaka beethoven askia hiawatha bolivar genghis darwin toussaint chaucer michelangelo yisunsin virgil imhotep hammurabi',
  2: 'copernicus dante baibars murasaki moliere douglass sundiata blackbeard galileo leonidas antikythera ashoka sacagawea magellan homer leif theodora zhangqian nzinga lakshmibai mozart marcopolo haytham artemisia marcus yaa tecumseh',
  1: 'faraday hokusai tomoe plato christine germain confucius boudica harun coleman ibnbattuta ibnsina hatshepsut rift shenkuo archimedes pericles ambush press khutulun ada crossing phalanx caravan socrates ashurbanipal nostradamus compass sappho hypatia spartacus mencius eureka eclipse fairwinds encore decree'
};
// The third printing, tiered among themselves by the same measure ('node scripts/anoria/rarity.js 6000 3'), and the
// cards added after it at the end of each list, each by its own run, so that no older card's printed mark moved.
const RARE3 = {
  4: 'humboldt augustus napoleon victoria qinshihuang washington amundsen hippocrates pasteur bach cyrus eleanor verne zenobia shackleton nebuchadnezzar',
  3: 'menelik vercingetorix lalibela telescope rosetta tchaikovsky braille zumbi goethe sextant cervantes tolstoy suleiman pachacuti starchart lapulapu ropebridge catherine equiano hiroshige nezahualcoyotl bly darius musashi aeschylus stirrup tesla ferdowsi cyruscylinder themistocles mehmed holyyear',
  2: 'amanirenas pythagoras vangogh nightingale testudo gutenberg arminius libai franklin lincoln stanton andersen chiefjoseph sejong halley alkhwarizmi poe voltaire nanny fibonacci locomotive rumi shelley oakley enheduanna ramesses brownsbox gentileschi wrightflyer jenner kepler syracuse kublai richard basho montagu hildegard pakal fuhao trung teutoburg anning thutmose jaisingh khayyam afonso medici westphalia lisbonquake',
  1: 'dickinson duchatelet sequoyah wollstonecraft shahjahan beagle ibnkhaldun seishonagon anthony marathonmarch planter zhangheng tutankhamun voyagingcanoe longship joplin champollion paper emancipation cailun tomb quipu houdini birchbark austen typhoon grace adwa david rubicon euclid eratosthenes rite kadesh brahmagupta twain pictureshow telegraph thoreau wallace wheatley tablet magnacarta goldrush hieroglyphs balloon wheel naovictoria ninth astrolabe manuscripts folio truce paiza rubaiyat declaration exhibition leo hansa walls triumph veto milan canossa dsteel abacus'
};
// The twelve Domain cards (cards.js P4), tiered among themselves ("node scripts/anoria/domains.js cards")
const RARE4 = { 4: 'william', 3: 'constantine wren', 2: 'diogenes breda kudurru', 1: 'earthquake columbian idrisi caperoute vesuvius congress' };
// ==P5==
// The newest cards of the prime set (cards.js P5), tiered among themselves ('node scripts/anoria/rarity.js 6000 5')
const RARE5 = {
  4: 'cook peter tranhungdao babur tagore zubaidah rockets',
  3: 'solon abbas ieyasu piye zapata augustine rembrandt liliuokalani sinan hasekura tupaia chronometer transit banzhao',
  2: 'biruni alrazi ulughbeg tycho ezana kamehameha wells aethelflaed tupacamaru garibaldi hafez zeami vivaldi bachdang thousand gitanjali panama revere fadlan larrey',
  1: 'bassi banneker mendeleev ramanujan moshoeshoe cuauhtemoc qiujin garcilaso asmau nefertiti sixsky leoafricanus seondeok greekfire stickchart raingauge codex ether periodic paddle malta fourseasons nightwatch krakatoa hunayn cherschel synesius'
};
// ==/P5==
const TIERS = ['', 'Common', 'Uncommon', 'Rare', 'Legendary'], TIER_W = [0, 1, 0.6, 0.35, 0.2], TIER = {};
[RARE, RARE3, RARE4, RARE5].forEach(L => Object.keys(L).forEach(t => L[t].split(' ').forEach(k => { if (k) TIER[k] = +t; })));
const rarity = k => TIER[k] || (!CARDS[k] ? 1 : CARDS[k].c >= 5 ? 3 : CARDS[k].c >= 4 ? 2 : 1);

// where it's kept, the dice and the clock: the page's own unless a test hands in others (use())
let store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
let rnd = Math.random, now = () => new Date();
function use(o) { if (o.store) store = o.store; if (o.random) rnd = o.random; if (o.now) now = o.now; if (o.odds) ED_ODDS = o.odds; if (o.pack) PACK = o.pack;
  if (o.welcome) WELCOME = o.welcome; if (o.light) LIGHT = Object.assign({}, LIGHT, o.light); if (o.guideTurns) GUIDE_TURNS = o.guideTurns;
  if (o.needs) Object.keys(o.needs).forEach(g => { if (CALLS[g]) CALLS[g].need = o.needs[g]; }); cache = null; }

const blank = () => ({ v: VER, starter: null, guides: [], cards: {}, seen: {}, fresh: {}, ed: {}, look: {}, doms: {}, dnew: {}, packs: [], pid: 1, opened: 0, games: 0, wins: 0, day: '', signs: 0, turns: 0, firsts: {}, calls: {}, threads: {}, stacks: {} });
let cache = null, cacheRaw = null;
function load() {
  const raw = store.get(KEY);
  if (cache && raw === cacheRaw) return cache;   // (another device's newer copy arriving shows as different text)
  let s = null; try { s = raw ? JSON.parse(raw) : null; } catch (e) {}
  // (a collection from before v 6 is cleared: the first run starts again, and so do the decks built then)
  if (s && typeof s === 'object' && (s.v || 1) < VER) { s = null; store.set(DKEY, '[]'); store.set(KEY, JSON.stringify(blank())); }
  cache = Object.assign(blank(), s && typeof s === 'object' ? s : {}); cacheRaw = store.get(KEY);
  ['cards', 'seen', 'fresh', 'ed', 'look', 'doms', 'dnew', 'firsts', 'calls', 'threads', 'stacks'].forEach(k => { if (!cache[k] || typeof cache[k] !== 'object') cache[k] = {}; });
  if (!Array.isArray(cache.guides)) cache.guides = []; if (!Array.isArray(cache.packs)) cache.packs = [];
  return cache;
}
function save(s) { cacheRaw = JSON.stringify(s); cache = s; store.set(KEY, cacheRaw); return s; }
function reset() { cache = null; store.set(KEY, JSON.stringify(blank())); store.set(DKEY, '[]'); }
const dayKey = d => { d = d || now(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

// ── What you have ───────────────────────────────────────────────────────────────────────────────────────────
const owns = k => !!load().cards[k];
// how many of a card can go in your decks: both, once you have it
const copies = k => (load().cards[k] ? CAP : 0);
// 'own', 'seen' (met across the table, not yours) or 'new' (never seen)
function cardState(k) { const s = load(); return s.cards[k] ? 'own' : s.seen[k] ? 'seen' : 'new'; }
function counts() {
  const s = load(); let own = 0, seen = 0;
  for (const k of ALL) { if (s.cards[k]) own++; else if (s.seen[k]) seen++; }
  const dom = DOMS.filter(id => s.doms[id]).length;
  return { own: own, seen: seen, cards: ALL.length, doms: dom, domsAll: DOMS.length, guides: s.guides.length, guidesAll: GKEYS.length, complete: own === ALL.length && s.guides.length === GKEYS.length };
}
// Each set and how much of it you have: the base set first, then the Guides in the order of cards.js.
// [{id: 'base' | guide, have, of, joined}]
function setsProgress() { const s = load(); return ['base'].concat(GKEYS).map(id => { const c = setCards(id); return { id: id, have: c.filter(k => s.cards[k]).length, of: c.length, joined: id === 'base' ? !!s.starter : s.guides.indexOf(id) >= 0 }; }); }
// The cards found only in packs, by tier: [null, [have, of] Common, Uncommon, Rare, Legendary]
function poolProgress() { const s = load(), t = [null, [0, 0], [0, 0], [0, 0], [0, 0]]; POOL.forEach(k => { const r = rarity(k); t[r][1]++; if (s.cards[k]) t[r][0]++; }); return t; }
// The finishes of a card: which are found ([Matte, Shiny, Silver foil, Gold foil, Rainbow foil]: Matte is found once
// you have the card), the one it is shown in, and choosing another (only one you have found).
function editions(k) { const s = load(), b = s.ed[k] || 0; return EDITIONS.map((x, e) => (e ? !!(b >> e & 1) : !!s.cards[k])); }
function look(k) { const s = load(), e = s.look[k] || 0; return e && (s.ed[k] || 0) >> e & 1 ? e : 0; }
function setLook(k, e) { const s = load(); e = +e || 0; if (!CARDS[k] || look(k) === e || (e && !((s.ed[k] || 0) >> e & 1))) return false; if (e) s.look[k] = e; else delete s.look[k]; save(s); return true; }
// how many cards have been found in each finish
function edCounts() { const s = load(), n = EDITIONS.map(() => 0); for (const k of ALL) { if (s.cards[k]) n[0]++; const b = s.ed[k] || 0; for (let e = 1; e < n.length; e++) if (b >> e & 1) n[e]++; } return n; }
function markSeen(keys) { const s = load(); let ch = false; (keys || []).forEach(k => { if (CARDS[k] && !s.seen[k]) { s.seen[k] = 1; ch = true; } }); if (ch) save(s); }
function looked(k) { const s = load(); if (s.fresh[k]) { delete s.fresh[k]; save(s); } }
// (leaving the Library: you've seen what's new there)
function lookedAll() { const s = load(); if (Object.keys(s.fresh).length) { s.fresh = {}; save(s); } }

// ── Starting out, and a Guide joining ───────────────────────────────────────────────────────────────────────
// A set comes to you: its cards (each new one shows as new), its Domains (only the ones you don't have), and the
// named Legacy Lines it completes. Returns {cards: [keys new to you], doms: [ids new to you]}.
function giveSet(s, id, quiet) {
  const out = { cards: [], doms: [] };
  setCards(id).forEach(k => { if (!s.cards[k]) { s.cards[k] = 1; out.cards.push(k); if (!quiet) s.fresh[k] = 1; } s.seen[k] = 1; });
  (DSET[id] || []).forEach(d => { if (!s.doms[d]) { s.doms[d] = 1; out.doms.push(d); if (!quiet) s.dnew[d] = 1; } });
  if (id !== 'base' && s.guides.indexOf(id) < 0) s.guides.push(id);
  return out;
}
// The very first choice: one of all twelve Guides. The base set and that Guide's set are yours, with two welcome packs.
function chooseGuide(g) {
  if (!GUIDES[g] && C.ARCH && C.ARCH[g]) g = C.ARCH[g].guide;   // (a test that still names a deck of before)
  const s = load(); if (s.starter || !GUIDES[g]) return false;
  s.starter = g; giveSet(s, 'base', true); giveSet(s, g, true);
  // (a Legacy Line that comes whole in your first deck is simply yours)
  THREADS.forEach(t => { if (t.cards.every(k => s.cards[k])) s.threads[t.id] = 1; });
  WELCOME.forEach(n => addPack(s, 'welcome', 'A welcome pack', n));
  save(s); return true;
}
// A Guide's deck: the base set and their set, one of each card
const guideDeck = g => ({ id: 'guide:' + g, n: (C.GUIDES[g] || g), guide: g, cards: BASE.concat(GSET[g] || []), ready: true });

// ── Packs ───────────────────────────────────────────────────────────────────────────────────────────────────
const packs = () => load().packs.slice();
function addPack(s, k, why, n) { const p = { id: s.pid++, k: k, why: why, n: n || PACK }; s.packs.push(p); return p; }
function rollEdition() { let r = rnd(); for (let e = EDITIONS.length - 1; e > 0; e--) { if (r < ED_ODDS[e]) return e; r -= ED_ODDS[e]; } return 0; }
function weighted(pool, w) { let tot = 0; pool.forEach(k => { tot += w(k); }); let r = rnd() * tot; for (const k of pool) { r -= w(k); if (r < 0) return k; } return pool[pool.length - 1]; }
// One slot of a pack: which card, in which finish. The finish is rolled first. A Matte slot is a card you don't have;
// a foil slot is a card you have not found in that finish (and if you don't have the card, it's yours in that finish).
// A roll with nothing left to give moves up to the next finish that has, then down, so a slot is empty only when there
// is nothing at all left to find. No card comes twice in one pack.
function slot(s, not) {
  const e0 = rollEdition(), order = []; for (let e = e0; e < EDITIONS.length; e++) order.push(e); for (let e = e0 - 1; e >= 0; e--) order.push(e);
  for (const e of order) {
    const pool = ALL.filter(k => !not[k] && (e ? !((s.ed[k] || 0) >> e & 1) : !s.cards[k])); if (!pool.length) continue;
    return { k: weighted(pool, k => TIER_W[rarity(k)]), e: e };
  }
  return null;
}
// this finish of this card is found, for good; the card is shown in it unless it is already shown in a rarer one
function found(s, k, e) { s.ed[k] = (s.ed[k] || 0) | (1 << e); if (e > (s.look[k] || 0)) s.look[k] = e; }
// Open the pack with this id (the oldest one if none is named): its cards join the collection.
// Returns {pack, cards: [{c, first (a card new to you), ed (the finish it came in, 0..4), was (the finish a card you
// had was shown in before, -1 for a new card)}], threads: [{id, n}]} and,
// for Mansa Musa's calling, guides: [{g, why: 'call'}] when this pack brought a Guide.
function openPack(id) {
  const s = load(), i = id == null ? 0 : s.packs.findIndex(p => p.id === id); if (i < 0 || !s.packs[i]) return null;
  const pack = s.packs.splice(i, 1)[0], out = [], not = {};
  for (let n = 0; n < pack.n; n++) {
    const x = slot(s, not); if (!x) break;
    const k = x.k, first = !s.cards[k], was = first ? -1 : look(k); not[k] = 1;
    s.cards[k] = 1; s.seen[k] = 1; if (first) s.fresh[k] = 1;
    if (x.e) found(s, k, x.e);
    out.push({ c: k, first: first, ed: x.e, was: was });
  }
  s.opened++;
  const guides = callsCheck(s);
  save(s);
  return { pack: pack, cards: out, threads: settleThreads(), guides: guides };
}

// ── Legacy Lines ────────────────────────────────────────────────────────────────────────────────────────────
// each named Legacy Line with the cards of it you have
function threads() { const s = load(); return THREADS.map(t => { const have = t.cards.filter(k => s.cards[k]); return { id: t.id, n: t.n, cards: t.cards.slice(), places: (t.places || []).slice(), have: have, done: have.length === t.cards.length, rewarded: !!s.threads[t.id] }; }); }
// The named Legacy Lines finished since last time, marked as finished: [{id, n}]
function settleThreads() {
  const s = load(), out = [];
  for (const t of THREADS) { if (s.threads[t.id] || !t.cards.every(k => s.cards[k])) continue; s.threads[t.id] = 1; out.push({ id: t.id, n: t.n, gift: null }); }
  if (out.length) save(s);
  return out;
}

// ── The callings ────────────────────────────────────────────────────────────────────────────────────────────
// What a game did, counted from its events as they happen (the table calls track() with each event, the pacing
// script with a whole game's): m = trackStart(); track(m, ev, me) for every event; trackEnd(m, {win, how}) at the end.
// Events: the engine's own, and {t: 'count', ren: [Renown of each player]} once each round's count is over.
function trackStart() { return { held: null, relics: 0, relics2: false, lines: 0, plays: 0, cur: -1, play3: 0, behind: false, clashWon: 0, facs: {}, scholars: 0, hold4: false, most: 0, lost: false, own: {} }; }
function track(m, ev, me) {
  if (!m || !ev) return m;
  const t = ev.t;
  if (t === 'hold') { m.held = m.held || {}; if (ev.o >= 0) m.held[ev.o] = (m.held[ev.o] || 0) + 1; }
  else if (t === 'count') { const h = m.held || {}, mine = h[me] || 0; if (mine >= 4) m.hold4 = true; if (Object.keys(h).every(o => +o === me || h[o] < mine) && mine > 0) m.most++;
    if (ev.ren && ev.ren.some((r, o) => o !== me && r > ev.ren[me])) m.behind = true; m.held = null; }
  else if (t === 'turn') { m.cur = ev.o; m.plays = 0; }
  else if (t === 'seal') { if (ev.o === me) m.lost = true; }
  else if ((t === 'line' || t === 'thread') && ev.o === me) m.lines++;
  else if (t === 'clash') { if (m.own[ev.a] === me && ev.am > ev.dm) m.clashWon++; }
  if ((t === 'arrive' && !ev.why) || t === 'relic' || t === 'deed') { if (ev.o === me && m.cur === me) { m.plays++; if (m.plays === 3) m.play3++; } }
  if (t === 'arrive') { if (ev.u) m.own[ev.u] = ev.o; if (ev.o === me && CARDS[ev.c]) { const c = CARDS[ev.c]; if (c.f && c.f !== 'N') m.facs[c.f] = 1; if (c.k && c.k.scholar) m.scholars++; } }
  if (t === 'relic' && ev.o === me) { m.relics++; if (m.relics >= 2) m.relics2 = true; }   // (a Relic stays in play: the second played is two in play at once)
  return m;
}
// the game's measures for the callings
function trackEnd(m, o) {
  m = m || trackStart(); o = o || {};
  return { hold4: !!m.hold4, relics2: !!m.relics2, sealsWin: !!o.win && o.how === 'seals', noSealLost: !!o.win && !m.lost, lines: m.lines, play3: m.play3,
    behindWin: !!o.win && !!m.behind, clash3: m.clashWon >= 3, most: m.most, facs5: Object.keys(m.facs).length >= 5, scholars3: m.scholars >= 3 };
}
// Each calling that is still open, with how far along it is: [{g, say, have, need}]
function callings() { const s = load(); return GKEYS.filter(g => s.guides.indexOf(g) < 0).map(g => { const c = CALLS[g]; return { g: g, say: c.say.replace('#', c.need), have: Math.min(c.need, callHave(s, g)), need: c.need }; }); }
const callHave = (s, g) => (CALLS[g].per === 'packs' ? s.opened : s.calls[g] || 0);
// the callings met: each brings its Guide. Returns [{g, why: 'call'}]
function callsCheck(s, out) {
  const got = [];
  GKEYS.forEach(g => { if (s.guides.indexOf(g) >= 0 || !s.starter) return; if (callHave(s, g) >= CALLS[g].need) { const x = giveSet(s, g); got.push({ g: g, why: 'call', cards: x.cards, doms: x.doms }); } });
  return got;
}

// ── Playing earns ───────────────────────────────────────────────────────────────────────────────────────────
// After a finished game, however it was played (Tim: "a game earns the same however it's played"). o = {win (you won),
// how ('seals' | 'renown'), level ('easy' | 'normal' | 'hard', against the computer), built (you played a deck you
// built), seen: [card keys the other side showed], m: the game's measures (trackEnd)}.
// Returns {lit: [{n, why}] (the signs this game lit, in order), from (signs lit before), turns (full turns it made),
// signs (lit now), list: [{t: 'guide', g, why: 'sphere' | 'call'} | {t: 'pack', pack}] (what it earned, in the order to
// show them), calls: [{g, say, was, have, need}] (the callings it moved on)}
function gameOver(o) {
  const s = load(); o = o || {};
  (o.seen || []).forEach(k => { if (CARDS[k]) s.seen[k] = 1; });
  const R = { lit: [], from: s.signs, turns: 0, signs: 0, list: [], calls: [] };
  if (!s.starter) { save(s); return R; }
  s.games++;
  R.lit.push({ n: LIGHT.game, why: 'game' });
  if (o.win) { s.wins++; R.lit.push({ n: LIGHT.win, why: 'win' }); const today = dayKey(); if (s.day !== today) { s.day = today; R.lit.push({ n: LIGHT.daily, why: 'daily' }); } }
  // the firsts
  const first = (id, ok) => { if (ok && !s.firsts[id]) { s.firsts[id] = 1; R.list.push({ t: 'pack', pack: addPack(s, 'first', FIRSTS[id], PACK) }); } };
  if (o.win) { first('win', true); first('normal', o.level === 'normal' || o.level === 'hard'); first('hard', o.level === 'hard'); first('built', !!o.built); }
  // the callings
  const m = o.m || {};
  GKEYS.forEach(g => { if (s.guides.indexOf(g) >= 0) return; const c = CALLS[g]; if (c.per === 'packs') return; const was = s.calls[g] || 0, add = c.per === 'count' ? (+m[c.m] || 0) : m[c.m] ? 1 : 0;
    if (add) { s.calls[g] = was + add; R.calls.push({ g: g, say: c.say.replace('#', c.need), was: Math.min(c.need, was), have: Math.min(c.need, was + add), need: c.need }); } });
  // the sphere
  let n = R.lit.reduce((a, x) => a + x.n, 0); s.signs += n;
  while (s.signs >= SIGNS) {
    s.signs -= SIGNS; s.turns++; R.turns++;
    R.list.push({ t: 'pack', pack: addPack(s, 'sphere', 'The sphere came round', PACK) });
    if (GUIDE_TURNS.indexOf(s.turns) >= 0) { const left = GKEYS.filter(g => s.guides.indexOf(g) < 0); if (left.length) { const g = left[(rnd() * left.length) | 0]; const x = giveSet(s, g); R.list.unshift({ t: 'guide', g: g, why: 'sphere', cards: x.cards, doms: x.doms }); } }
  }
  callsCheck(s).forEach(x => R.list.unshift({ t: 'guide', g: x.g, why: 'call', cards: x.cards, doms: x.doms }));
  R.signs = s.signs;
  save(s); settleThreads();
  return R;
}
// The sphere as it stands: {lit (signs lit now), of (SIGNS), turns (full turns so far), next (the turn that brings the
// next Guide, or 0), toGuide (turns from now to it)}
function sphere() { const s = load(), next = GUIDE_TURNS.filter(t => t > s.turns)[0] || 0, left = GKEYS.some(g => s.guides.indexOf(g) < 0);
  return { lit: s.signs, of: SIGNS, turns: s.turns, next: left ? next : 0, toGuide: left && next ? next - s.turns : 0, light: Object.assign({}, LIGHT), today: s.day === dayKey() }; }
// what's next to earn, for the screens to show: the next turn of the sphere and the firsts not had yet
function nextUp() {
  const s = load(), sp = sphere(), out = [];
  out.push({ id: 'sphere', n: PACK, what: 'A pack of ' + PACK, have: s.signs, need: SIGNS });
  Object.keys(FIRSTS).forEach(id => { if (!s.firsts[id]) out.push({ id: id, n: PACK, what: 'A pack of ' + PACK, when: FIRSTS[id] }); });
  if (sp.next) out.push({ id: 'guide', what: 'A new Guide', turns: sp.toGuide });
  return out;
}

// ── Decks ───────────────────────────────────────────────────────────────────────────────────────────────────
// what's wrong with a deck, in words ([] when it can be played)
function problems(d) {
  const s = load(), out = [], n = {}; (d.cards || []).forEach(k => { n[k] = (n[k] || 0) + 1; });
  if (!d.guide || s.guides.indexOf(d.guide) < 0) out.push('Choose a Guide');
  const len = (d.cards || []).length; if (len !== DECK) out.push(len < DECK ? (DECK - len) + ' more to add' : (len - DECK) + ' too many');
  Object.keys(n).forEach(k => { if (!CARDS[k]) out.push('A card that isn\'t in the game'); else if (n[k] > CAP) out.push('More than two of ' + CARDS[k].n); else if (!s.cards[k]) out.push(CARDS[k].n + ' isn\'t yours yet'); });
  return out;
}
function myDecks() { let a = []; try { a = JSON.parse(store.get(DKEY) || '[]') || []; } catch (e) {} return Array.isArray(a) ? a.filter(d => d && Array.isArray(d.cards)) : []; }
function saveDeck(d) { const a = myDecks(); if (!d.id) d.id = 'd' + Date.now().toString(36) + ((rnd() * 1296) | 0).toString(36); const i = a.findIndex(x => x.id === d.id); const rec = { id: d.id, n: String(d.n || 'My deck').slice(0, 24), guide: d.guide || '', cards: (d.cards || []).slice() }; const st = d.stack || (i >= 0 ? a[i].stack : null); if (st) rec.stack = st.slice(); if (i >= 0) a[i] = rec; else a.push(rec); store.set(DKEY, JSON.stringify(a)); return rec; }
function deleteDeck(id) { store.set(DKEY, JSON.stringify(myDecks().filter(d => d.id !== id))); }
// Every deck there is to play: each Guide's deck you have (the Guide you began with first) and the decks you built.
// [{id, n, guide, cards, ready, starter, built, ok, why[]}]
function decks() {
  const s = load(), out = [], gs = s.guides.slice().sort((a, b) => (b === s.starter) - (a === s.starter) || GKEYS.indexOf(a) - GKEYS.indexOf(b));
  gs.forEach(g => { const d = guideDeck(g); d.starter = g === s.starter; d.ok = true; d.why = []; out.push(d); });
  myDecks().forEach(d => { const why = problems(d); out.push({ id: d.id, n: d.n, guide: d.guide, cards: d.cards.slice(), built: true, ok: !why.length, why: why }); });
  return out;
}
function deck(id) { id = String(id || ''); if (id.indexOf('guide:') === 0) { const g = id.slice(6); if (!GUIDES[g]) return null; const d = guideDeck(g), joined = load().guides.indexOf(g) >= 0; d.ok = joined; d.why = joined ? [] : [GUIDES[g] + ' hasn\'t joined you yet']; return d; } return decks().filter(d => d.id === id)[0] || null; }

// ── Domains and stacks ──────────────────────────────────────────────────────────────────────────────────────
const hasDomain = id => !!load().doms[id];
const domains = () => { const s = load(); return DOMS.filter(id => s.doms[id]); };
const domainState = id => (load().doms[id] ? 'own' : 'new');
const domainFresh = id => !!load().dnew[id];
function domainLooked(id) { const s = load(); if (id == null ? Object.keys(s.dnew).length : s.dnew[id]) { if (id == null) s.dnew = {}; else delete s.dnew[id]; save(s); } }
// what is wrong with a stack, in words ([] when it can be played): STACK Domains you have, no two the same.
// There is no limit on kinds or homes (Tim: a player can stack with Domains that give their cards more of an edge).
function stackProblems(st) {
  const s = load(), out = [], seen = {}; st = st || [];
  if (st.length !== STACK) out.push(st.length < STACK ? (STACK - st.length) + ' more to add' : (st.length - STACK) + ' too many');
  st.forEach(id => { if (!PLACES[id]) out.push('A Domain that isn\'t in the game'); else if (seen[id]) out.push('More than one ' + PLACES[id].n); else if (!s.doms[id]) out.push(PLACES[id].n + ' isn\'t yours yet'); seen[id] = 1; });
  return out;
}
// How well a Domain suits a deck: mostly how many of the deck's Figures are at home there (worth about 5 points of
// win rate to a stack chosen that way: scripts/anoria/domains.txt), then its faction's Domains, then a little for
// the rules that play well at a Gate or an Outpost.
const RULEV = { spark: 0.8, cheap: 0.8, forge: 0.5, arms: 0.5, draw: 1, line: 0.4, fort: 0.7, closed: 0.8, narrow: 0.2, crowd: 0.5, arena: 0.3, peace: 0.6, sanctuary: 0.2, link: 0, road: 0.8,
  // (the 75 powers, 2026-11-12: by how the Domain read at a Gate or an Outpost in scripts/anoria/domains.txt section 14)
  harbour: 0.3, league: 0.8, monopoly: 0.2, hire: 0.3, loan: 0.4, books: 0.4, toll: 0, fair: 0.7, ships: 0.7, strike: 0.6, print: 0.6, kiln: 0.6, stay: 0.4, clock: 0.4, school: 0.4,
  recall: 0.3, study: 0.3, equal: 0.5, siege: 0.4, maze: 0.3, citadel: 0.5, relief: 0.5, engines: 0.6, heartland: 0.1, islets: 0.1, rock: 0.7, ancestors: 0.2, victor: 0.4,
  confederacy: 0.2, pupils: 0.4, patron: 0.7, memorial: 0.7, court: 0.4, punt: 0.1, rank: 0.2, gathering: 0.5, ballcourt: 0.1, stool: 0.1, treaty: 0.5, charter: 0, vote: 0.6,
  declare: 0.1, tribute: 0.2, code: 0.8, treeofpeace: 0.1, throne: 0.2, wergild: 0.4, searoad: 0.5, landing: 0.2, garrison: 0.5, passage: 0.6, canal: 0.1, relay: 0.7, port: 0.4, flight: 0.6 };
function suits(cards) {
  const reg = {}, fac = {}; let n = 0; (cards || []).forEach(k => { const c = CARDS[k]; if (!c || c.t !== 'fig') return; n++; if (!(c.k && c.k.voyager)) reg[c.reg] = (reg[c.reg] || 0) + 1; fac[c.f] = (fac[c.f] || 0) + 1; });
  return id => { const pl = PLACES[id], w = pl.pw || ''; return 10 * (reg[pl.reg] || 0) / (n || 1) + (w.slice(0, 3) === 'fac' ? 2 * (fac[w[3]] || 0) / (n || 1) : (RULEV[w] || 0) * 0.1); };
}
const best = (cards, ids) => { const v = suits(cards); return ids.slice().sort((a, b) => v(b) - v(a) || (a < b ? -1 : 1)); };
// A Guide's own stack: the 15 of the 16 Domains of the base set and their set that suit their deck best (the
// computer plays this one; a person's Guide deck starts from it)
const guideStack = g => best(guideDeck(g).cards, DSET.base.concat((DSET[g] || []).filter(id => DSET.base.indexOf(id) < 0))).slice(0, STACK);
// Fill a stack to STACK from the Domains you have: the ones given first (keep), then the ones that suit these cards best
function autoStack(cards, keep) {
  const s = load(), out = []; (keep || []).forEach(id => { if (PLACES[id] && s.doms[id] && out.indexOf(id) < 0 && out.length < STACK) out.push(id); });
  const rest = best(cards, DOMS.filter(id => s.doms[id] && out.indexOf(id) < 0));
  return out.concat(rest.slice(0, STACK - out.length));
}
// The stack a deck is played with (deck id as decks() gives it): the one saved for it, if it can still be played;
// otherwise, for a Guide's deck, its own stack, and for a deck you built the Domains you have that suit it best.
function stackFor(id) {
  const s = load(), g = String(id).indexOf('guide:') === 0 ? id.slice(6) : null, d = g ? null : myDecks().filter(x => x.id === id)[0];
  const saved = g ? s.stacks[id] : d && d.stack;
  if (saved && !stackProblems(saved).length) return saved.slice();
  const cards = g ? guideDeck(g).cards : d ? d.cards : [];
  return autoStack(cards, (saved || []).concat(g && GUIDES[g] ? guideStack(g) : []));
}
// Save a stack for a deck (a Guide deck's goes in the collection, a built deck's with the deck). Returns the problems
// ([] if it was saved). A Guide deck's stack saved as its own stack is simply the default again.
function saveStack(id, st) {
  const why = stackProblems(st); if (why.length) return why;
  const s = load(), g = String(id).indexOf('guide:') === 0 ? id.slice(6) : null;
  if (g) { if (!GUIDES[g]) return ['No such deck']; const own = guideStack(g); if (own.length === st.length && own.every(x => st.indexOf(x) >= 0)) delete s.stacks[id]; else s.stacks[id] = st.slice(); save(s); return []; }
  const a = myDecks(), i = a.findIndex(x => x.id === id); if (i < 0) return ['No such deck'];
  a[i].stack = st.slice(); store.set(DKEY, JSON.stringify(a)); return [];
}
// Fill a deck to DECK cards from what you have: more of its own factions first, a sensible spread of costs, Figures
// over the rest. Relics: a deck that has fewer than two Relic cards is given Relics until it has two, each with a power
// the deck does not hold yet, and no more after that.
const fxOf = k => CARDS[k].fx || k;
function finish(d) {
  const s = load(), n = {}, cards = (d.cards || []).slice(); cards.forEach(k => { n[k] = (n[k] || 0) + 1; });
  const fac = {}; cards.forEach(k => { const f = CARDS[k].f; fac[f] = (fac[f] || 0) + 1; });
  const cost = [0, 0, 0, 0, 0, 0, 0]; cards.forEach(k => { cost[Math.min(6, CARDS[k].c)]++; });
  const want = [3, 4, 11, 11, 8, 3, 0];   // (how many cards at each cost a deck of 40 wants)
  while (cards.length < DECK) {
    let top = null, bv = -1e9;
    for (const k of ALL) { if (!s.cards[k] || (n[k] || 0) >= CAP) continue; const c = CARDS[k], cc = Math.min(6, c.c);
      const rel = c.t === 'relic' ? (cards.filter(x => CARDS[x].t === 'relic').length < 2 && !cards.some(x => CARDS[x].t === 'relic' && fxOf(x) === fxOf(k)) ? 3 : -9) : 0;
      const v = (fac[c.f] || 0) * 0.25 + rel + (want[cc] - cost[cc]) * 0.6 + (c.t === 'fig' ? 1.2 : 0) - (n[k] ? 0.4 : 0) + rnd() * 0.3;
      if (v > bv) { bv = v; top = k; } }
    if (!top) break;
    cards.push(top); n[top] = (n[top] || 0) + 1; fac[CARDS[top].f] = (fac[CARDS[top].f] || 0) + 1; cost[Math.min(6, CARDS[top].c)]++;
  }
  return cards;
}

return { use, load, reset, dayKey, owns, copies, cardState, counts, setsProgress, poolProgress, editions, look, setLook, edCounts, rarity, EDITIONS, TIERS, TIER_W, VER, get ED_ODDS() { return ED_ODDS; },
  markSeen, looked, lookedAll, chooseGuide, chooseStarter: chooseGuide, guideDeck, guideStack, packs, openPack, threads, settleThreads, gameOver, nextUp, sphere, callings, trackStart, track, trackEnd,
  problems, myDecks, saveDeck, deleteDeck, decks, deck, finish, CAP, DECK, ALL, BASE, GSET, DSET, POOL, setOf, setCards, CALLS, FIRSTS, SIGNS,
  get LIGHT() { return LIGHT; }, get PACK() { return PACK; }, get WELCOME() { return WELCOME; }, get GUIDE_TURNS() { return GUIDE_TURNS; },
  DOMS, STACK, hasDomain, domains, domainState, domainFresh, domainLooked, stackProblems, autoStack, stackFor, saveStack };
});
