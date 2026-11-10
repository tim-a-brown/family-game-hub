// Anoria: your collection. What you own, what you've seen, the packs waiting to be opened, how packs are earned,
// your decks and the Threads you've finished. No screens here (library.js, packs.js and decks.js draw them); this is
// the one place the rules of collecting live, so the simulator (scripts/anoria/pacing.js) plays the same ones.
//
// Saved under two keys that follow the account like everything else a game stores (a guest's stay on the device):
//   anoria_coll   {v, starter, cards{key: copies}, guides[], seen{key: 1}, fresh{key: 1} (not looked at yet),
//                  packs[{id, k: 'welcome' | 'daily' | 'feat', why, n}], wins, games, day (the day of the last daily
//                  pack), feats{normal, hard, built}, threads{id: 1} (finished and rewarded), opened}
//   anoria_decks  [{id, n, guide, cards[30]}]   the decks you built
//
// The economy, in one place:
//   - Choose a Guide: that Guide's ready deck (15 cards, two of each) is yours, with three welcome packs of 12.
//   - A pack never holds a card you have two of. In a welcome pack half the slots go to cards you have none of; after
//     that any copy you're missing is as likely as any other, so new faces keep turning up for weeks.
//   - Your first win of the day against the computer: a pack of 2.
//   - Once each: your first win against Normal, against Hard, and with a deck you built: a pack of 2.
//   - A new Guide joins you at 3, 8, 15 and 25 wins.
//   - Finishing a named Thread (owning every card on it): a second copy of one of its cards, as a gift. A Thread
//     that comes whole in your starter deck gives none.
//   Played every day, the core set takes about a month to finish (pacing.js).
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards')); else root.AnoriaColl = factory(root.AnoriaCards); })(this, function (C) {
'use strict';
const CARDS = C.CARDS, ARCH = C.ARCH, GUIDES = C.GUIDES, THREADS = C.THREADS;
const ALL = Object.keys(CARDS), CAP = 2, DECK = 30, FRESH = { welcome: 0.5 };
const WELCOME = [12, 12, 12], DAILY = 3, FEAT = 3, GUIDE_AT = [3, 8, 15, 25];
const KEY = 'anoria_coll', DKEY = 'anoria_decks';
const FEATS = { normal: 'Your first win against Normal', hard: 'Your first win against Hard', built: 'Your first win with a deck you built' };

// where it's kept, the dice and the clock: the page's own unless a test hands in others (use())
let store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
let rnd = Math.random, now = () => new Date();
function use(o) { if (o.store) store = o.store; if (o.random) rnd = o.random; if (o.now) now = o.now; cache = null; }

const blank = () => ({ v: 1, starter: null, cards: {}, guides: [], seen: {}, fresh: {}, packs: [], wins: 0, games: 0, day: '', feats: {}, threads: {}, opened: 0, pid: 1 });
let cache = null, cacheRaw = null;
function load() {
  const raw = store.get(KEY);
  if (cache && raw === cacheRaw) return cache;   // (another device's newer copy arriving shows as different text)
  let s = null; try { s = raw ? JSON.parse(raw) : null; } catch (e) {}
  cache = Object.assign(blank(), s && typeof s === 'object' ? s : {}); cacheRaw = raw; return cache;
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
  return { own: own, copies: cop, seen: seen, cards: ALL.length, all: ALL.length * CAP, guides: s.guides.length, guidesAll: Object.keys(GUIDES).length, complete: cop === ALL.length * CAP && s.guides.length === Object.keys(GUIDES).length };
}
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
// Returns {pack, cards: [{c, first (your first copy), n (copies you now have)}], threads: [...] (see settleThreads)}
function openPack(id) {
  const s = load(), i = id == null ? 0 : s.packs.findIndex(p => p.id === id); if (i < 0 || !s.packs[i]) return null;
  const pack = s.packs.splice(i, 1)[0], out = [];
  for (let n = 0; n < pack.n; n++) {
    const k = missing(s, FRESH[pack.k] || 0); if (!k) break;
    const first = !s.cards[k]; s.cards[k] = (s.cards[k] || 0) + 1; s.seen[k] = 1; if (first) s.fresh[k] = 1;
    out.push({ c: k, first: first, n: s.cards[k] });
  }
  s.opened++; save(s);
  return { pack: pack, cards: out, threads: settleThreads() };
}
// One copy you're missing. Each missing copy is as likely as any other (so a card you have none of is twice as
// likely as one you have one of); fresh is the chance the slot goes straight to a card you have none of.
function missing(s, fresh, among) {
  const pool = (among || ALL).filter(k => (s.cards[k] || 0) < CAP); if (!pool.length) return null;
  const none = pool.filter(k => !s.cards[k]); if (none.length && rnd() < fresh) return none[(rnd() * none.length) | 0];
  let tot = 0; pool.forEach(k => { tot += CAP - (s.cards[k] || 0); }); let r = rnd() * tot;
  for (const k of pool) { r -= CAP - (s.cards[k] || 0); if (r < 0) return k; } return pool[pool.length - 1];
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
    if (s.day !== today) { s.day = today; out.push({ t: 'pack', pack: addPack(s, 'daily', 'Your first win today', DAILY) }); }
    const feat = (id, ok) => { if (ok && !s.feats[id]) { s.feats[id] = 1; out.push({ t: 'pack', pack: addPack(s, 'feat', FEATS[id], FEAT) }); } };
    feat('normal', o.level === 'normal' || o.level === 'hard'); feat('hard', o.level === 'hard'); feat('built', !!o.built);
    if (GUIDE_AT.indexOf(s.wins) >= 0) { const left = Object.keys(GUIDES).filter(g => s.guides.indexOf(g) < 0); if (left.length) { const g = left[(rnd() * left.length) | 0]; s.guides.push(g); out.push({ t: 'guide', g: g }); } }
  }
  save(s); return out;
}
// what's next to earn, for the Library to show: [{what, when}]
function nextUp() {
  const s = load(), out = [];
  out.push({ id: 'daily', what: 'A pack of ' + DAILY, when: s.day === dayKey() ? 'Tomorrow, for your first win' : 'Your first win today', done: s.day === dayKey() });
  Object.keys(FEATS).forEach(id => { if (!s.feats[id]) out.push({ id: id, what: 'A pack of ' + FEAT, when: FEATS[id] }); });
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
function myDecks() { let a = []; try { a = JSON.parse(store.get(DKEY) || '[]') || []; } catch (e) {} return Array.isArray(a) ? a : []; }
function saveDeck(d) { const a = myDecks(); if (!d.id) d.id = 'd' + Date.now().toString(36) + ((rnd() * 1296) | 0).toString(36); const i = a.findIndex(x => x.id === d.id); const rec = { id: d.id, n: String(d.n || 'My deck').slice(0, 24), guide: d.guide || '', cards: (d.cards || []).slice() }; if (i >= 0) a[i] = rec; else a.push(rec); store.set(DKEY, JSON.stringify(a)); return rec; }
function deleteDeck(id) { store.set(DKEY, JSON.stringify(myDecks().filter(d => d.id !== id))); }
// Every deck there is to play: the five ready decks (yours to play once you own all of one; your starter always is)
// and the decks you built. [{id, n, guide, cards, ready, starter, built, own (cards of it you own, of 30), ok, why[]}]
function decks() {
  const s = load(), out = [];
  Object.keys(ARCH).forEach(name => { const cards = readyCards(name); let own = 0; ARCH[name].cards.forEach(k => { own += Math.min(CAP, s.cards[k] || 0); });
    const hasG = s.guides.indexOf(ARCH[name].guide) >= 0, ok = own === DECK && hasG;
    out.push({ id: 'ready:' + name, n: name, guide: ARCH[name].guide, cards: cards, ready: true, starter: s.starter === name, own: own, ok: ok, why: ok ? [] : [own < DECK ? 'You own ' + own + ' of its 30 cards' : GUIDES[ARCH[name].guide] + ' hasn\'t joined you yet'] }); });
  myDecks().forEach(d => { const why = problems(d); out.push({ id: d.id, n: d.n, guide: d.guide, cards: d.cards.slice(), built: true, own: d.cards.length, ok: !why.length, why: why }); });
  return out;
}
const deck = id => decks().filter(d => d.id === id)[0] || null;
// Fill a deck to 30 from what you own: more of its own factions first, a sensible spread of costs, Figures over the rest
function finish(d) {
  const s = load(), n = {}, cards = (d.cards || []).slice(); cards.forEach(k => { n[k] = (n[k] || 0) + 1; });
  const fac = {}; cards.forEach(k => { const f = CARDS[k].f; fac[f] = (fac[f] || 0) + 1; });
  const cost = [0, 0, 0, 0, 0, 0, 0]; cards.forEach(k => { cost[Math.min(6, CARDS[k].c)]++; });
  const want = [2, 3, 8, 8, 6, 3, 0];
  while (cards.length < DECK) {
    let best = null, bv = -1e9;
    for (const k of ALL) { const have = Math.min(CAP, s.cards[k] || 0); if ((n[k] || 0) >= have) continue; const c = CARDS[k], cc = Math.min(6, c.c);
      const v = (fac[c.f] || 0) * 0.25 + (c.f === 'N' ? 1 : 0) + (want[cc] - cost[cc]) * 0.6 + (c.t === 'fig' ? 1.2 : 0) - (n[k] ? 0.4 : 0) + rnd() * 0.3;
      if (v > bv) { bv = v; best = k; } }
    if (!best) break;
    cards.push(best); n[best] = (n[best] || 0) + 1; fac[CARDS[best].f] = (fac[CARDS[best].f] || 0) + 1; cost[Math.min(6, CARDS[best].c)]++;
  }
  return cards;
}

return { use, load, reset, dayKey, copies, cardState, counts, markSeen, looked, lookedAll, chooseStarter, packs, openPack, threads, settleThreads, gameOver, nextUp,
  problems, myDecks, saveDeck, deleteDeck, decks, deck, finish, readyCards, CAP, DECK, WELCOME, DAILY, FEAT, GUIDE_AT, FEATS, ALL };
});
