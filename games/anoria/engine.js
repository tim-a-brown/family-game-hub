// Anoria rules simulator: the whole game as code, for 2 to 6 players, with robot players that pick the best
// next step by a scoring rule (a "profile"). run.js plays thousands of games with it and reports balance.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards')); else root.AnoriaEngine = factory(root.AnoriaCards); })(this, function (cards) {
'use strict';
const { PLACES, CENTER, EDGE } = cards;
// (every card a game can hold: the set, and the cards that have left it, which a game saved with one still plays: cards.js RETIRED)
const CARDS = Object.assign({}, cards.RETIRED || {}, cards.CARDS);
// What a Relic or a Deed does belongs to its data, not its name: `fx` names the effect, and a card without one has the
// effect of its own key (the first Relics and Deeds). So the Astrolabe is a Compass in effect, Night Crossing runs the
// Trojan Horse's, and nothing below asks a card for its name.
const fxOf = ci => CARDS[ci].fx || ci;
// ── Domains (Tim, 2026-11-11; the sheet a person reads at a table is scripts/anoria/places/RULES.md) ──────────
// The card that lies at a Gate, an Outpost or the Crossroads is a Domain. Each player brings a stack of 15 of them.
// A game played with Domains has S.dm, and its state says exactly what the pieces on a real table say:
//   S.places[i]   the Domain lying at position i (2o: player o's Gate, 2o + 1: their Outpost, 2N: the Crossroads)
//   S.ban[i]      whose banner lies on that Domain: the player who brought it. The banner travels with the card.
//   S.mk[i]       the card lying across that Domain's rule as a marker (Vesuvius), or 0. It travels with the card too.
//   P.dst         a player's Domain stack (the top is the end of the list). P.dgone: their Domain discard pile.
//   S.su          set-up: what each player drew and laid, the dice, whose offer is the Crossroads, who goes first
//   S.pend        a choice of Domain a player still has to make (Pachacuti, Al-Idrisi, Christopher Wren)
//   S.f0          who took the first turn of the game. S.round, firstOf(S) and track(S) are the round track.
// Diogenes's Silence marker is not kept: it lies on whatever Domain he stands on (silenced(S, i) says what lies on a rule).
// A game without S.dm is on the fixed map of the twelve Places the game had before Domains: a lesson's table
// (guide.js), a test game with no stacks, and a game saved before Domains, which finishes under the rules it began
// with. There each Place has the rule it had then (PLACES[id].pw0), and nothing that belongs to Domains happens.
// Every rule is a word in the Domain's data (PLACES[id].pw, listed in cards.js DRULES), never a Domain's name:
//   spark  whoever holds it gets 1 more Spark next turn          (Commerce: pays nothing at a Gate)
//   cheap  the first Figure a player lays here each turn costs 1 less   (Commerce: nothing at a Gate)
//   forge  whoever holds it pays 1 less for Relics and Deeds     arms   +1 Might on the turn a Figure arrives here
//   draw   whoever holds it draws a card each round              line   a Legacy Line made by a Figure arriving here scores 1 more
//   facD, facA, facS  Discovery, Arts, Statecraft Figures have +1 Might here
//   fort   Figures defending here have +1 Might                  closed only the side's own player walks in (not at the Crossroads)
//   narrow two Figures a player here, not three                  crowd  2 Renown for a player who holds it with two Figures
//   arena  winning a clash here scores 1 Renown                  peace  only the player who holds it can start a clash here
//   sanctuary  Figures here can't be targeted by the other player's Deeds
//   link   a Figure can walk between here and any Domain         road   a Figure that arrives here can walk the same turn
//   double (only on the old map: the Acropolis scored 2 Renown)
const FAC = { A: 'facA', D: 'facD', S: 'facS' };
// The standard rules, as the test games settled them (see scripts/anoria and the design doc)
// dice 'high': a clash is two ordinary dice, the higher roll adds 1 Might (2 when higher by 3 or more).
// unique: one of each person on your side of the table at a time. ret: a Figure whose other copy is in your discard pile costs this much less.
// Scoring is flat (Tim, 2026-11): every Place scores 1 Renown every round, all game, and the first to 25 wins. (Until
// then the stake doubled from round 4: ramp: [1, 1, 1, 2, 2, 2]. cfg.ramp still works, for test games and for a game
// saved under the old rule, which finishes under it.) Flat games run longer than the doubled ones did, which is why a
// deck is 40 cards (coll.js). target: the Renown that wins, 25 since 2026-11-11 (it was 30: OLD_TARGET, which a game
// saved before then finishes under; the page keeps each game's own target, see restore() in ui.js).
// rounds: the round limit, see scripts/anoria/variants.txt ("Decks of 40", "First to 25").
const OLD_TARGET = 30;
// dm: the game is played with Domains (2026-11-11). It is what play() goes by when a test hands it no stacks (each
// deck then brings its ready stack, or fifteen Domains at random: stacksFor); '{"dm":0}' plays the old fixed map.
// newGame() goes only by the stacks it is given, so a lesson's table and a game saved before Domains are untouched.
const STD = { spark: 'round', scoring: 'round', order: 'trail', catchup: 1, rush: 1, target: 25, rounds: 14, sparkCap: 7, draw2: 1, bounty: 1, handMax: 8, dice: 'high', unique: 1, ret: 1, threads: 2, dm: 1 };
const DEF = { rounds: 6, cap: 3, seals: 3, spark: 'round', scoring: 'round', order: 'alt', hand: 5, die: [0, 1, 2], disc: 1, home: 1, lineRen: 1, voyHome: 1, insBonus: 0, sealRen: 1, extraEdge: [] };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(a, R) { for (let i = a.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

// The map: each player's spoke (Gate 2i, Near 2i+1) meets at the hub (2N). Three or more players: neighbours' Nears link too.
function mkMap(N, R, cfg) {
  const edge = shuffle(EDGE.concat(cfg.extraEdge || []), R), ids = [], adj = [];
  for (let i = 0; i < 2 * N; i++) ids.push(edge[i % edge.length]);
  ids.push(CENTER[(R() * CENTER.length) | 0]);
  for (let i = 0; i <= 2 * N; i++) adj.push([]);
  const link = (a, b) => { adj[a].push(b); adj[b].push(a); };
  for (let i = 0; i < N; i++) { link(2 * i, 2 * i + 1); link(2 * i + 1, 2 * N); if (N >= 3) link(2 * i + 1, 2 * ((i + 1) % N) + 1); }
  return { ids, adj };
}
// stacks: each player's Domain stack (a list of Domain ids, 15 in the game). With stacks the game is played with
// Domains and starts with set-up (below). opt.wait: leave set-up to the page, which calls setupOptions, setupLay and
// setupRoll; without it the engine decides (setupAuto: opt.profs, the robots' profiles, say how well each seat chooses).
// opt.lay (with opt.ban, opt.first): the five Domains named directly, for a lesson's table (setupFixed).
function newGame(decks, guides, cfg, R, stacks, opt) {
  cfg = Object.assign({}, DEF, cfg); const N = decks.length, M = mkMap(N, R, cfg);
  const S = { cfg, N, round: 1, turn: 0, uid: 1, places: M.ids, adj: M.adj, pb: M.ids.map(() => new Array(N).fill(0)), figs: [], P: [], over: false, winner: -1, how: '', ev: cfg.log ? [] : null,
    st: { clash: 0, ko: 0, jump: 0, walk: 0, lines: 0, plays: 0, home: 0, lead: [], ev: [], played: decks.map(() => ({})), sealBreaks: 0, upsets: 0 } };
  if (cfg.coin) S.f0 = (Math.random() * N) | 0;   // (who starts, when nobody leads)
  for (let p = 0; p < N; p++) {
    let deck = shuffle(decks[p].slice(), R), hand = deck.splice(0, cfg.hand);
    if (!hand.some(c => CARDS[c].t === 'fig' && CARDS[c].c <= 2)) { deck = shuffle(deck.concat(hand), R); hand = deck.splice(0, cfg.hand); }   // one mulligan
    S.P.push({ deck, hand, relics: [], guide: guides[p], spark: 0, reserve: 0, renown: 0, seals: cfg.seals, broke: 0, sb: 0, uA: 0, uT: 0, uD: 0, uC: 0, uN: 0, uM: 0, lines: 0 });
  }
  if (stacks) { setupBegin(S, stacks, R); if (opt && opt.lay) setupFixed(S, opt.lay, opt.ban, opt.first); else if (!(opt && opt.wait)) setupAuto(S, R, opt && opt.profs); }
  return S;
}
function clone(S) {
  const T = { cfg: S.cfg, N: S.N, round: S.round, turn: S.turn, uid: S.uid, places: S.places, adj: S.adj, pb: S.pb.map(x => x.slice()), figs: S.figs.map(f => Object.assign({}, f)),
    P: S.P.map(p => Object.assign({}, p, { deck: p.deck.slice(), hand: p.hand.slice(), relics: p.relics.slice(), gone: p.gone ? p.gone.slice() : null })), over: S.over, winner: S.winner, how: S.how, st: null, ev: null };
  if (S.dm) { T.dm = S.dm; T.f0 = S.f0; T.places = S.places.slice(); T.ban = S.ban.slice(); T.mk = S.mk.slice(); T.cyn = S.cyn; T.pend = S.pend; for (let o = 0; o < S.N; o++) { T.P[o].dst = S.P[o].dst.slice(); T.P[o].dgone = S.P[o].dgone.slice(); } }
  else if (S.f0 != null) T.f0 = S.f0;
  return T;
}
const stake = (cfg, r) => cfg.ramp ? cfg.ramp[Math.min(r, cfg.ramp.length) - 1] : 1;
const MEND_AT = 5;   // (Lincoln: the round at whose start one of his broken Seals is mended, once a game)
const gateOf = o => 2 * o, ownerOfSpoke = (S, i) => i === 2 * S.N ? -1 : (i >> 1);
const isGate = (S, i) => i < 2 * S.N && !(i & 1);
const enemySide = (S, o, i) => { const w = ownerOfSpoke(S, i); return w >= 0 && w !== o; };
const pid = (S, i) => S.places[i];
// Boundary Stone: the other player's cards cannot replace, move or silence the Domains at your Gate and your Outpost
const prot = (S, i, by) => { const w = ownerOfSpoke(S, i); return !!S.dm && w >= 0 && w !== by && hasFx(S.P[w], 'kudurru'); };
// What lies across a Domain's rule, if anything: Vesuvius ({k: 'card', c}), or the Silence marker of a Figure standing
// there ({k: 'fig', u}: Diogenes; it goes when he goes, and covers whatever Domain lies under him)
function silenced(S, i) {
  if (!S.dm) return null; if (S.mk[i]) return { k: 'card', c: S.mk[i] };
  if (S.cyn) for (const f of S.figs) if (f.p === i && CARDS[f.c].k.cynic && !prot(S, i, f.o)) return { k: 'fig', u: f.u };
  return null;
}
// A Domain's rule where it lies now, as a word ('' when it has none there, or something lies across it)
function pw(S, i) {
  const pl = PLACES[S.places[i]]; if (!pl) return '';
  if (!S.dm) return pl.pw0 || '';
  const p = pl.pw; if (!p) return '';
  if (p === 'closed' && i === 2 * S.N) return '';                                  // (the Crossroads is on nobody's side)
  if ((p === 'spark' || p === 'cheap') && i < 2 * S.N && !(i & 1)) return '';      // (a Commerce Domain pays nothing at a Gate)
  if (S.mk[i]) return '';
  if (S.cyn) for (const f of S.figs) if (f.p === i && CARDS[f.c].k.cynic && !prot(S, i, f.o)) return '';
  return p;
}
// The Renown a Domain scores for the player who holds it
function rv(S, i, h) { const w = pw(S, i); return w === 'double' || (w === 'crowd' && cnt(S, i, h) >= 2) ? 2 : 1; }
// How many Domains with this rule a player holds
function nHeld(S, o, w) { let n = 0; for (let i = 0; i < S.places.length; i++) if (pw(S, i) === w && holder(S, i) === o) n++; return n; }
// At a Law Domain only the player who holds it can start a clash. (cfg.peaceSym, for test games: nobody can.)
const peace = (S, i, o) => pw(S, i) === 'peace' && !!S.dm && (S.cfg.peaceSym || holder(S, i) !== o);
// how many Figures a player can have at a position
const capAt = (S, i) => S.dm && pw(S, i) === 'narrow' ? Math.min(2, S.cfg.cap) : S.cfg.cap;
// (a shuffle that needs no dice: an empty Domain stack remade from its discard pile, Al-Idrisi's shuffle)
function dshuf(a, s) { s = (s * 2654435761) >>> 0; for (let i = a.length - 1; i > 0; i--) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const j = (s >>> 8) % (i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
// The top card of a player's Domain stack. An empty stack is made again from that player's Domain discard pile.
function popTop(S, o) {
  const P = S.P[o];
  if (!P.dst.length) { if (!P.dgone.length) return null; P.dst = dshuf(P.dgone, S.uid * 31 + S.round); P.dgone = []; if (S.ev) S.ev.push({ t: 'restack', o: o, n: P.dst.length }); if (S.st) S.st.restack = (S.st.restack || 0) + 1; }
  return P.dst.pop();
}
// (is there a Domain this player could still turn up: one in their stack or discard pile that is not on the table)
const canTurn = (S, o) => S.P[o].dst.some(x => S.places.indexOf(x) < 0) || S.P[o].dgone.some(x => S.places.indexOf(x) < 0);
// The next Domain a player turns up. A Domain can lie on the table only once: one that is already there goes under
// the stack, and the next is turned up.
function turnDomain(S, o) {
  const P = S.P[o];
  for (let n = P.dst.length + P.dgone.length; n > 0; n--) { const id = popTop(S, o); if (id == null) return null; if (S.places.indexOf(id) < 0) return id; P.dst.unshift(id); if (S.ev) S.ev.push({ t: 'dunder', o: o, id: id }); }
  return null;
}
// A Domain is laid at a position with the banner of the player who brought it. The Domain that was there goes to the
// Domain discard pile of the player whose banner is on it, and Vesuvius, if it lay there, is discarded with it.
// Everything else belongs to the position and stays: the Figures, a Royal Decree, the rounds Imhotep has stood there.
// why: 'setup', or the card that did it.
function layDomain(S, i, id, o, why) {
  const old = S.places[i], was = S.ban[i], mk = S.mk[i]; if (old != null) S.P[was].dgone.push(old);
  S.places[i] = id; S.ban[i] = o; S.mk[i] = 0;
  if (S.ev) S.ev.push({ t: 'domain', p: i, id: id, o: o, old: old, was: was, mk: mk || 0, why: why || '' });
  if (S.st) { (S.st.laid[o] || (S.st.laid[o] = [])).push([id, i, why === 'setup' ? 0 : 1]); if (old != null) S.st.repl = (S.st.repl || 0) + 1; }
}
// Domains change positions: the Domain now at position i is the one that was at perm[i]. The card, its banner and
// Vesuvius lying on it travel together. Figures, a Royal Decree and everything else belong to the position and stay.
function permute(S, perm, why) {
  const pl = S.places.slice(), ow = S.ban.slice(), mk = S.mk.slice();
  for (let i = 0; i < perm.length; i++) { S.places[i] = pl[perm[i]]; S.ban[i] = ow[perm[i]]; S.mk[i] = mk[perm[i]]; }
  if (S.ev) S.ev.push({ t: 'domains', perm: perm.slice(), why: why || '' }); if (S.st) S.st.moved = (S.st.moved || 0) + 1;
}
// A choice of Domain waiting on a player: S.pend = {k, o, ids, c}. k 'scout': Pachacuti's top three (the others go
// under the stack), 'survey': Al-Idrisi's whole stack (which is then shuffled), 'rebuild': Christopher Wren's discard
// pile. The player lays one of them at their Gate or their Outpost, or none: {t: 'dom', id, p} or {t: 'dom', no: 1}.
function pendOpen(S, k, o, ids, c) { S.pend = { k: k, o: o, ids: ids, c: c }; if (S.ev) S.ev.push({ t: 'choose', k: k, o: o, ids: ids.slice(), c: c }); }
function pendActions(S) {
  const q = S.pend, out = [{ t: 'dom', no: 1 }], seen = {}, g = gateOf(q.o);
  for (const id of q.ids) { if (seen[id] || S.places.indexOf(id) >= 0) continue; seen[id] = 1; out.push({ t: 'dom', id: id, p: g }, { t: 'dom', id: id, p: g + 1 }); }
  return out;
}
function pendApply(S, a) {
  const q = S.pend, Q = S.P[q.o]; S.pend = null;
  if (q.k === 'scout') { let used = a.no ? 1 : 0; for (const id of q.ids) { if (!used && id === a.id) { used = 1; continue; } Q.dst.unshift(id); } }
  else if (q.k === 'survey') { if (!a.no) Q.dst.splice(Q.dst.indexOf(a.id), 1); dshuf(Q.dst, S.uid * 17 + S.round); }
  else if (q.k === 'rebuild') { if (!a.no) Q.dgone.splice(Q.dgone.indexOf(a.id), 1); }
  if (S.ev) S.ev.push({ t: 'chose', k: q.k, o: q.o, id: a.no ? null : a.id, p: a.no ? -1 : a.p, c: q.c });
  if (!a.no) { layDomain(S, a.p, a.id, q.o, q.c); if (S.st) S.st.use[q.k] = (S.st.use[q.k] || 0) + 1; }
}
// ── Set-up ──
// Each player shuffles their stack and draws three Domains (S.su.drew[o]). They lay one face down at their Gate and
// one at their Outpost and keep the third as their offer for the Crossroads: setupOptions(S, o) lists the six ways,
// setupLay(S, o, {gate, out, offer}) lays one. When both have laid, setupRoll turns the four up, each player rolls
// a die (again if the dice match), the higher roll's offer is laid at the Crossroads with that player's banner, the
// other player's offer starts their Domain discard pile, and that other player takes the first turn of the game.
// If the two players turn up the same Domain, each puts their copy under their stack and lays the next Domain of
// their stack in its place: a Domain lies on the table only once.
// S.su = {step: 'lay' | 'roll' | 'done', drew: [[3 ids], [3 ids]], lay: [{gate, out, offer} | null, ...],
//         rolls: [[die of player 0, die of player 1], ...], dibs: whose offer is the Crossroads, first: who goes first}
function setupBegin(S, stacks, R) {
  const N = S.N, np = 2 * N + 1;
  S.dm = 1; S.places = new Array(np).fill(null); S.ban = new Array(np).fill(-1); S.mk = new Array(np).fill(0); S.cyn = 0; S.pend = null;
  S.su = { step: 'lay', drew: [], lay: [], rolls: [], dibs: -1, first: -1 };
  for (let o = 0; o < N; o++) { const P = S.P[o]; P.dst = shuffle(stacks[o].slice(), R); P.dgone = []; S.su.drew[o] = [P.dst.pop(), P.dst.pop(), P.dst.pop()]; S.su.lay[o] = null; }
  if (S.st) { S.st.laid = []; S.st.use = {}; }
}
// A table laid by hand, for a lesson or a test: lay = the five Domains [player 0's Gate, their Outpost, player 1's
// Gate, their Outpost, the Crossroads], ban = whose banner is on each, first = who takes the first turn. Each
// player's three drawn Domains go back into their stack first, and a Domain that is laid leaves the stack it is in.
function setupFixed(S, lay, ban, first) {
  const N = S.N; for (let o = 0; o < N; o++) { const P = S.P[o]; P.dst = P.dst.concat(S.su.drew[o]).filter(id => lay.indexOf(id) < 0); }
  ban = ban || lay.map((_, i) => i === 2 * N ? 0 : i >> 1);
  for (let i = 0; i < lay.length; i++) layDomain(S, i, lay[i], ban[i], 'setup');
  S.su = { step: 'done', drew: S.P.map(() => []), lay: S.P.map(() => null), rolls: [], dibs: ban[2 * N], first: first || 0 }; S.f0 = first || 0; if (S.st) S.st.repl = 0;
  return true;
}
function setupOptions(S, o) { const d = S.su.drew[o], out = []; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (b !== a) out.push({ gate: d[a], out: d[b], offer: d[3 - a - b] }); return out; }
function setupLay(S, o, a) {
  const su = S.su; if (!su || su.step !== 'lay' || su.lay[o]) return false;
  if (!setupOptions(S, o).some(x => x.gate === a.gate && x.out === a.out && x.offer === a.offer)) return false;
  su.lay[o] = { gate: a.gate, out: a.out, offer: a.offer }; if (su.lay.every(x => x)) su.step = 'roll';
  return true;
}
// dice: the rolls to use ([[a, b], ...], for a page that lets the players throw them); without it the engine rolls
function setupRoll(S, R, dice) {
  const su = S.su, N = S.N; if (!su || su.step !== 'roll') return false;
  const lay = su.lay.map(x => [x.gate, x.out]);
  // (the same Domain turned up by two players: both copies go under their stacks, and each lays their next Domain)
  for (let g = 0; g < 8; g++) { const dup = []; for (let o = 0; o < N; o++) for (let k = 0; k < 2; k++) if (lay.some((l, q) => q !== o && l.indexOf(lay[o][k]) >= 0)) dup.push([o, k, lay[o][k]]);
    if (!dup.length) break;
    for (const d of dup) { S.P[d[0]].dst.unshift(d[2]); if (S.ev) S.ev.push({ t: 'dunder', o: d[0], id: d[2] }); lay[d[0]][d[1]] = null; }
    for (const d of dup) { const P = S.P[d[0]]; let id = null; for (let n = P.dst.length; n > 0 && id == null; n--) { const x = P.dst.pop(); if (lay.some(l => l.indexOf(x) >= 0)) P.dst.unshift(x); else id = x; } lay[d[0]][d[1]] = id; } }
  for (let o = 0; o < N; o++) { layDomain(S, 2 * o, lay[o][0], o, 'setup'); layDomain(S, 2 * o + 1, lay[o][1], o, 'setup'); }
  let d = -1; for (let g = 0; d < 0; g++) { const r = dice && dice[g] ? dice[g].slice() : S.P.map(() => 1 + ((R() * 6) | 0)); su.rolls.push(r); if (S.ev) S.ev.push({ t: 'sroll', dice: r.slice() });
    const mx = Math.max.apply(null, r); if (r.filter(x => x === mx).length === 1) d = r.indexOf(mx); }
  const ot = (d + 1) % N; su.dibs = d; su.first = ot; S.f0 = ot;
  let hub = su.lay[d].offer; if (S.places.indexOf(hub) >= 0) { S.P[d].dst.unshift(hub); if (S.ev) S.ev.push({ t: 'dunder', o: d, id: hub }); hub = turnDomain(S, d); }
  layDomain(S, 2 * N, hub, d, 'setup');
  for (let o = 0; o < N; o++) if (o !== d) S.P[o].dgone.push(su.lay[o].offer);
  su.step = 'done'; if (S.ev) S.ev.push({ t: 'setup', dibs: d, first: ot, hub: hub });
  if (S.st) { S.st.repl = 0; S.st.dibs = d; S.st.hub0 = hub; }
  return true;
}
// What a robot thinks a Domain is worth to it at [its Gate, its Outpost, the Crossroads], beyond the Might its
// Figures get there. From the test games (scripts/anoria/places/results.txt A4, and domains.txt): Commerce pays
// nothing at a Gate, a road or a link at your own Gate lets the other player in, a crowd wants the Crossroads.
const LAYV = { spark: [0, 0.8, 0.5], cheap: [0, 0.8, 0.3], forge: [0.5, 0.4, 0.3], arms: [0.3, 0.5, 0.5], draw: [1, 0.6, 0.5], line: [0.4, 0.4, 0.3], fort: [0.4, 0.7, 0.3], closed: [0.5, 0.8, 0], narrow: [0.2, 0.2, 0], crowd: [0, 0.5, 1], arena: [0, 0.3, 0.4], peace: [0.6, 0.6, 0.4], sanctuary: [0.1, 0.2, 0.1], link: [-0.5, 0, 0.3], road: [0.8, 0.3, 0.2] };
// (a deck by what it is made of: the share of its Figures from each region, Voyagers apart, and of each faction)
function deckInfo(deck) { const reg = {}, fac = {}; let n = 0; for (const c of deck) { const x = CARDS[c]; if (!x || x.t !== 'fig') continue; n++; if (!x.k.voyager) reg[x.reg] = (reg[x.reg] || 0) + 1; fac[x.f] = (fac[x.f] || 0) + 1; } for (const k in reg) reg[k] /= n || 1; for (const k in fac) fac[k] /= n || 1; return { reg, fac }; }
function layScore(id, slot, info) { const pl = PLACES[id], w = pl.pw || ''; let v = (info.reg[pl.reg] || 0) * [1, 2, 2][slot]; if (w.slice(0, 3) === 'fac') v += (info.fac[w[3]] || 0) * [1, 2, 2][slot]; else if (LAYV[w]) v += LAYV[w][slot]; return v; }
// A robot's choice at set-up: its three Domains to its Gate, its Outpost and its offer, by what suits its deck. A
// robot that judges unclearly (prof.noise: Easy and Normal) chooses that much less surely. No prof: the best lay.
function setupPick(S, o, prof, R) {
  const P = S.P[o], info = deckInfo(P.deck.concat(P.hand)); let best = null, bv = -1e9;
  for (const a of setupOptions(S, o)) { let v = layScore(a.gate, 0, info) + layScore(a.out, 1, info) + 0.5 * layScore(a.offer, 2, info); if (prof && prof.noise && R) v += (R() - 0.5) * prof.noise * 0.6; if (v > bv) { bv = v; best = a; } }
  return best;
}
function setupAuto(S, R, profs) { for (let o = 0; o < S.N; o++) if (!S.su.lay[o]) setupLay(S, o, setupPick(S, o, profs && profs[o], R)); return setupRoll(S, R); }
function might(S, f, mode, oth) {
  const c = CARDS[f.c], k = c.k, pl = PLACES[S.places[f.p]]; let m = c.m + f.tb;
  if (c.reg === pl.reg || (k.voyager && S.cfg.voyHome)) m += S.cfg.home + (k.homeDouble && c.reg === pl.reg ? 2 : 0);   // (Voyagers are at home everywhere)
  let own = 0, opp = 0, insp = 0, isIns = false;
  for (const g of S.figs) {
    if (g.p === f.p) { if (g.o === f.o) { own++; if (g !== f && CARDS[g.c].k.inspiring) insp++; } else opp++; }
    if (g.li === f.u) isIns = true;
  }
  if (f.li) m += 1; if (isIns && S.cfg.insBonus) m += 1; m += Math.min(2, insp);
  if (k.uprising) m += own - 1; if (k.orator && own > opp) m += 2; if (k.underdog && opp > own) m += 2; if (k.monument) m += Math.min(2, f.stay); if (k.shoulders) m += Math.min(2, S.P[f.o].lines);
  const w = pw(S, f.p); if (w && w === FAC[c.f]) m += 1;   // (a theatre for Arts Figures, an observatory for Discovery, a capital for Statecraft)
  if (mode === 1) { if (k.raider && enemySide(S, f.o, f.p)) m += 2; if (k.slayer && oth && CARDS[oth.c].m > c.m) m += 2; if (S.P[f.o].guide === 'suntzu' && !S.P[f.o].uC) m += 0.5; }   // (Sun Tzu: your first clash each turn wins ties)
  if (mode === 2) { if (k.steadfast) m += 2; if (w === 'fort') m += 1; if (S.P[f.o].guide === 'gandhi' && ownerOfSpoke(S, f.p) === f.o) m += 1; }   // (Gandhi: +1 Might when an enemy starts a clash at his own Gate or Outpost)
  return m;
}
function mights(S, i) { const m = S.pb[i].slice(); for (const f of S.figs) if (f.p === i) m[f.o] += might(S, f, 0); return m; }
function holderM(S, i, m) {
  let mx = 0, who = -1, n = 0; for (let o = 0; o < S.N; o++) { if (m[o] > mx) { mx = m[o]; who = o; n = 1; } else if (m[o] === mx) n++; }
  if (mx > 0 && n === 1) return who;
  const tied = []; for (let o = 0; o < S.N; o++) if (m[o] === mx) tied.push(o);
  if (mx > 0) { const cl = tied.filter(o => S.P[o].guide === 'cleopatra' && S.figs.some(f => f.p === i && f.o === o)); if (cl.length === 1) return cl[0]; }
  if (S.dm && mx > 0 && i === 2 * S.N && tied.indexOf(S.ban[i]) >= 0 && S.figs.some(f => f.p === i && f.o === S.ban[i])) return S.ban[i];   // (the banner on the Crossroads: its owner wins a tie there while they have a Figure there)
  if (isGate(S, i) && tied.indexOf(i >> 1) >= 0) return i >> 1;
  return -1;
}
const holder = (S, i) => holderM(S, i, mights(S, i));
const cnt = (S, i, o) => { let n = 0; for (const f of S.figs) if (f.p === i && f.o === o) n++; return n; };
const room = (S, i, o) => cnt(S, i, o) < capAt(S, i);
const hasRelic = (p, r) => p.relics.indexOf(r) >= 0;   // (this very Relic: a Legacy Line names the card)
// A Relic's power, whichever Relic it is. A player has two Relics in play at most, and no two with the same power
// (actions()), so a power never counts twice: nothing here adds up.
const hasFx = (p, fx) => p.relics.some(r => fxOf(r) === fx);
const relicOf = (p, fx) => p.relics.find(r => fxOf(r) === fx) || null;
// (how many times a player has a power. It is 0 or 1 in the game. cfg.relicStack, for test games only, lets two
// different Relics with one power both be played and adds them up: scripts/anoria/relics2.js, set-150-balance.txt)
const nFx = (S, p, fx) => (S.cfg.relicStack ? p.relics.reduce((n, r) => n + (fxOf(r) === fx ? 1 : 0), 0) : hasFx(p, fx) ? 1 : 0);
// the Quick Deeds in a hand that add Might to a clash (Phalanx, and any card with its effect): their places in the hand
const quicks = P => { const out = [], seen = {}; P.hand.forEach((ci, h) => { if (!seen[ci] && fxOf(ci) === 'phalanx') { seen[ci] = 1; out.push(h); } }); return out; };
// Legacy: with lineNear, the one who inspired you has to be at the same Place or the next one over
const near = (S, a, b) => !S.cfg.lineNear || a === b || S.adj[a].indexOf(b) >= 0 || pw(S, a) === 'link' || pw(S, b) === 'link';
function draw(S, o, n) { const p = S.P[o]; for (let i = 0; i < n; i++) { if (!p.deck.length && p.gone && p.gone.length) { p.deck = p.gone; p.gone = []; for (let j = p.deck.length - 1; j > 0; j--) { const q = (j * 7 + S.round * 3 + i) % (j + 1), x = p.deck[j]; p.deck[j] = p.deck[q]; p.deck[q] = x; } } if (p.deck.length) { p.hand.push(p.deck.pop()); p.drawn = (p.drawn || 0) + 1; if (S.ev) S.ev.push({ t: 'draw', o: o }); } } }
function walkDests(S, f, free) {
  const c = CARDS[f.c]; if (c.k.monument) return [];
  const out = [], P = S.P[f.o];
  if (c.k.voyager && !free) { for (let i = 0; i < S.places.length; i++) if (i !== f.p && !(pw(S, i) === 'closed' && ownerOfSpoke(S, i) !== f.o) && room(S, i, f.o)) out.push(i); return out; }
  const seen = {}; seen[f.p] = 1; let fr = [f.p];
  const steps = free ? 1 : Math.max(1 + nFx(S, P, 'compass'), P.guide === 'genghis' ? 2 : 1);   // (Genghis Khan: his Figures walk two steps, as with the Compass)
  for (let s = 0; s < steps; s++) { const nx = []; for (const a of fr) { const ns = (pw(S, a) === 'link') ? S.places.map((_, i) => i) : S.adj[a].concat(S.places.map((x, i) => pw(S, i) === 'link' ? i : -1).filter(i => i >= 0)); for (const b of ns) if (!seen[b]) { seen[b] = 1; nx.push(b); } } fr = nx; }
  // (a closed Domain, as Machu Picchu is: only its own side walks in)
  for (const i in seen) { const j = +i; if (j !== f.p && !(pw(S, j) === 'closed' && ownerOfSpoke(S, j) !== f.o) && room(S, j, f.o)) out.push(j); }
  return out;
}
// Threads: a card can name what it grew from (c.from): a Figure standing on your side, a Relic you have in play, or a
// Place ('@library': for a Figure, the Place it arrives at; for a Relic or a Deed, a Place where you have a Figure).
// A card played along a thread scores the Legacy Renown (once a round, shared with Legacy lines). A Figure's own
// Legacy line (c.insp, Figure to Figure, with its discount and +1 Might) comes first. cfg.threads: 2 is the game's rule
// (Renown only). 1 also made the card cost 1 less, and 3 was the discount alone: both pulled the ready decks 11 to 12
// points apart in test games, where Renown only keeps them within 8 (scripts/anoria/variants.txt).
function threadSrc(S, o, ci, place) {
  const c = CARDS[ci]; if (!S.cfg.threads || !c.from) return null;
  for (const s of c.from) {
    if (s[0] === '@') { const id = s.slice(1);
      if (c.t === 'fig') { if (place != null && pid(S, place) === id) return { k: 'place', p: place }; }
      else { const f = S.figs.find(g => g.o === o && pid(S, g.p) === id); if (f) return { k: 'place', p: f.p }; } }
    else if (CARDS[s].t === 'relic') { if (hasRelic(S.P[o], s)) return { k: 'relic', c: s }; }
    else { const f = S.figs.find(g => g.o === o && g.c === s); if (f) return { k: 'fig', u: f.u }; }
  }
  return null;
}
function threadPlay(S, o, ci, src, u, at) {
  const P = S.P[o]; if (!src) return;
  let ren = S.cfg.threads === 3 || P.lr ? 0 : S.cfg.lineRen; if (ren && at != null && S.dm && pw(S, at) === 'line') ren += 1;   // (a Legacy Line made by a Figure arriving at a school scores 1 more)
  if (S.ev) S.ev.push({ t: 'thread', o: o, c: ci, u: u || 0, src: src, ren: ren });
  if (ren) { P.renown += ren; P.lr = 1; } if (S.st) S.st.threads = (S.st.threads || 0) + 1;
}
function costOf(S, o, ci, place) {
  const c = CARDS[ci], P = S.P[o]; let x = c.c;
  if (c.t === 'fig') { if (c.insp && S.figs.some(f => f.o === o && c.insp.indexOf(f.c) >= 0 && (place == null || near(S, place, f.p)))) x -= S.cfg.disc; else if (S.cfg.threads !== 2 && threadSrc(S, o, ci, place)) x -= S.cfg.disc; if (place != null && pw(S, place) === 'cheap' && !(S.dm && ((P.uCh || 0) >> place) & 1)) x -= 1;   // (a market: with Domains, the first Figure a player lays there each turn)
    if (S.cfg.ret && P.gone && P.gone.indexOf(ci) >= 0) { x -= S.cfg.ret; if (S.st && place != null) S.st.retSeen = 1; } }   // (the return: their other copy lies in your discard pile)
  if (c.t !== 'fig' && S.cfg.threads !== 2 && threadSrc(S, o, ci)) x -= S.cfg.disc;   // (threads 2: Renown only; 3: the discount only)
  if (c.t === 'relic' && P.guide === 'leonardo') x -= 1;
  if (c.t !== 'fig' && S.dm && S.places.some(id => PLACES[id].pw === 'forge')) x -= nHeld(S, o, 'forge');   // (a workshop: whoever holds it pays 1 less for Relics and Deeds)
  if (P.guide === 'curie' && P.uN === 2) x -= 1;   // (Curie: the third card you play each turn costs 1 less)
  if (c.t === 'deed') { if (P.guide === 'franklin' && !P.uD) x -= 1; if (S.figs.some(f => f.o === o && CARDS[f.c].k.deedsLess)) x -= 1; }
  return Math.max(0, x);
}
function ko(S, f, by) {
  // (Mandela: once a round, a Figure of his that is defeated on the other player's side goes back to his Gate instead of leaving the table)
  if (S.P[f.o].guide === 'mandela' && !S.P[f.o].uM && enemySide(S, f.o, f.p) && room(S, gateOf(f.o), f.o)) {
    S.P[f.o].uM = 1; if (S.ev) S.ev.push({ t: 'fallback', u: f.u, c: f.c, o: f.o, from: f.p, to: gateOf(f.o), by: by ? by.u : 0 });
    f.p = gateOf(f.o); f.stay = 0; f.rdy = 0; f.tb = 0; if (S.st) S.st.fallbacks = (S.st.fallbacks || 0) + 1; return; }
  if (S.ev) S.ev.push({ t: 'ko', u: f.u, c: f.c, o: f.o, p: f.p, by: by ? by.u : 0 });
  S.figs.splice(S.figs.indexOf(f), 1); if (S.dm && CARDS[f.c].k.cynic) S.cyn--;
  (S.P[f.o].gone || (S.P[f.o].gone = [])).push(f.c);
  for (const g of S.figs) if (g.li === f.u) { g.li = 0; S.P[g.o].lines--; }
  if (f.li) S.P[f.o].lines--;
  if (S.st) { S.st.ko++; if (by) { const a = CARDS[by.c], b = CARDS[f.c]; if (a.m < b.m) S.st.upsets++; S.st.ev.push([by.c, f.c, S.places[f.p]]); } }
}
// x: the player takes up a "you may" that needs no choosing (Constantine, William the Conqueror)
function arrive(S, f, x) {
  const c = CARDS[f.c], o = f.o, P = S.P[o];
  if (c.k.scholar) draw(S, o, 1);
  if (S.dm && pw(S, f.p) === 'arms') { f.tb += 1; f.ta = 1; }   // (an armoury: +1 Might on the turn a Figure arrives. ta: how much of tb it is)
  if (c.arr) {
    const [op, n] = c.arr, en = S.figs.filter(g => g.p === f.p && g.o !== o);
    if (S.dm) {   // (the Figures that act on Domains)
      if (op === 'scout') { const ids = []; for (let i = 0; i < n; i++) { const id = popTop(S, o); if (id == null) break; ids.push(id); } if (ids.length) pendOpen(S, 'scout', o, ids, f.c); }
      if (op === 'survey' && P.dst.length) pendOpen(S, 'survey', o, P.dst.slice(), f.c);
      if (op === 'rebuild' && P.dgone.some(id => S.places.indexOf(id) < 0)) pendOpen(S, 'rebuild', o, P.dgone.slice(), f.c);
      if (op === 'found' && x) { const id = turnDomain(S, o); if (id) { layDomain(S, 2 * S.N, id, o, f.c); if (S.st) S.st.use.found = (S.st.use.found || 0) + 1; } }
      if (op === 'conquer' && x && enemySide(S, o, f.p) && !prot(S, f.p, o)) { const w = f.p >> 1, id = turnDomain(S, w); if (id) { layDomain(S, f.p, id, w, f.c); if (S.st) S.st.use.conquer = (S.st.use.conquer || 0) + 1; } }
    }
    if (op === 'spark') { P.spark += n; if (S.ev) S.ev.push({ t: 'spark', o: o, n: n }); }
    if (op === 'wits') {   // (Yaa Asantewaa, and Anansi before her: more Spark where the other side holds the Place)
       const rn = 1 + (holder(S, f.p) >= 0 && holder(S, f.p) !== o ? 1 : 0); P.spark += rn; if (S.ev) S.ev.push({ t: 'spark', o: o, n: rn }); }
    if (op === 'stun') { en.sort((a, b) => might(S, b, 0) - might(S, a, 0)); for (let i = 0; i < Math.min(n, en.length); i++) { en[i].stun = 1; if (S.ev) S.ev.push({ t: 'stun', u: en[i].u }); } }
    if (op === 'push' && en.length) { en.sort((a, b) => might(S, a, 0) - might(S, b, 0)); const g = en[0]; if (!CARDS[g.c].k.monument && g.p !== gateOf(g.o)) { const to = stepHome(S, g); if (to >= 0 && room(S, to, g.o)) { if (S.ev) S.ev.push({ t: 'move', u: g.u, from: g.p, to: to, push: 1 }); g.p = to; g.stay = 0; } } }
  }
  if (c.insp) { const ins = S.figs.find(g => g.o === o && g !== f && c.insp.indexOf(g.c) >= 0 && near(S, f.p, g.p)); if (ins) { f.li = ins.u; P.lines++; const lren = P.lr ? 0 : S.cfg.lineRen + (S.dm && pw(S, f.p) === 'line' ? 1 : 0); if (S.ev) S.ev.push({ t: 'line', a: f.u, b: ins.u, o: o, ren: lren }); if (!P.lr) { P.renown += lren; P.lr = 1; } if (S.figs.some(g => g.o === o && CARDS[g.c].k.masterpiece)) draw(S, o, 1); if (S.st) S.st.lines++; } }   // (a line scores once a round; Michelangelo draws)
  if (!f.li) threadPlay(S, o, f.c, threadSrc(S, o, f.c, f.p), f.u, f.p);
}
function stepHome(S, g) { const N = S.N, gate = gateOf(g.o), near = gate + 1; if (g.p === near) return gate; if (g.p === 2 * N) return near; if (S.adj[g.p].indexOf(near) >= 0) return near; return 2 * N; }
// (sw: it arrived at a road, so it can walk on this same turn)
function putFig(S, o, ci, place, x) { const rd = S.dm && pw(S, place) === 'road' ? 1 : 0, f = { u: S.uid++, c: ci, o, p: place, rdy: CARDS[ci].k.swift || rd ? 1 : 0, arr: 1, tb: 0, stun: 0, stay: 0, li: 0 }; if (rd) f.sw = 1; S.figs.push(f); if (S.dm && CARDS[ci].k.cynic) S.cyn++; if (S.ev) S.ev.push({ t: 'arrive', u: f.u, c: ci, o: o, p: place }); if (S.st) { S.st.plays++; if (CARDS[ci].reg === PLACES[S.places[place]].reg) S.st.home++; S.st.played[o][ci] = 1; } arrive(S, f, x); return f; }
// Clash dice. cfg.dice 'high': both sides roll an ordinary die and the higher roll adds 1 Might, or 2 when it is higher
// by 3 or more ('high1': always 1). Without cfg.dice, each side adds a die with the faces in cfg.die.
// diceOdds: every way the dice can fall as [attacker's bonus, defender's bonus, weight]; rollClash: one roll
function diceOdds(cfg) {
  if (cfg.dice) { const two = cfg.dice === 'high' ? 6 : 0; return [[0, 0, 6], [1, 0, 15 - two], [0, 1, 15 - two]].concat(two ? [[2, 0, two], [0, 2, two]] : []); }
  const out = []; for (const x of cfg.die) for (const y of cfg.die) out.push([x, y, 1]); return out;
}
function rollClash(cfg, R) {
  R = R || Math.random;
  if (cfg.dice) { const ra = 1 + ((R() * 6) | 0), rd = 1 + ((R() * 6) | 0), gap = Math.abs(ra - rd), b = !gap ? 0 : cfg.dice === 'high' && gap >= 3 ? 2 : 1; return { ra, rd, da: ra > rd ? b : 0, dd: rd > ra ? b : 0 }; }
  const D = cfg.die, da = D[(R() * D.length) | 0], dd = D[(R() * D.length) | 0]; return { ra: da, rd: dd, da, dd };
}
function clash(S, a, d, da, dd, bonus, raw) {
  const A = S.P[a.o], D = S.P[d.o];
  let am = might(S, a, 1, d) + (bonus || 0) + da, dm = might(S, d, 2, a) + dd;
  // the defender's Phalanx, from Spark left over last turn
  const qs = quicks(D), qi = qs.length ? qs[0] : -1; if (qi >= 0 && D.reserve >= 1 && dm <= am && dm + 2 >= am) { const qc = D.hand[qi]; D.hand.splice(qi, 1); D.reserve -= 1; dm += 2; if (S.st) S.st.played[d.o][qc] = 1; if (S.ev) S.ev.push({ t: 'quick', o: d.o, c: qc, u: d.u }); }
  A.uC = 1; a.rdy = 0; a.acted = 1; if (S.st) S.st.clash++;
  if (S.ev) S.ev.push({ t: 'clash', a: a.u, d: d.u, p: a.p, am: am, dm: dm, da: da, dd: dd, ra: raw ? raw.ra : da, rd: raw ? raw.rd : dd });
  const arena = pw(S, a.p) === 'arena';   // (as the Colosseum is: winning a clash there scores 1 Renown. The event still says 'colosseum'.)
  const ar = A.renown, dr = D.renown;
  if (am > dm) { ko(S, d, a); if (arena) { A.renown++; if (S.ev) S.ev.push({ t: 'renown', o: a.o, n: 1, why: 'colosseum' }); } if (S.cfg.bounty && dr > ar) { A.renown += S.cfg.bounty; if (S.ev) S.ev.push({ t: 'renown', o: a.o, n: S.cfg.bounty, why: 'bounty' }); } } else if (dm > am) { ko(S, a, d); if (arena) { D.renown++; if (S.ev) S.ev.push({ t: 'renown', o: d.o, n: 1, why: 'colosseum' }); } if (S.cfg.bounty && ar > dr) { D.renown += S.cfg.bounty; if (S.ev) S.ev.push({ t: 'renown', o: d.o, n: S.cfg.bounty, why: 'bounty' }); } }
}
function byU(S, u) { for (const f of S.figs) if (f.u === u) return f; return null; }
// Every legal thing the player whose turn it is can do next
function actions(S) {
  if (S.pend) return pendActions(S);
  const o = S.turn, P = S.P[o], out = [], mine = S.figs.filter(f => f.o === o), theirs = S.figs.filter(f => f.o !== o), np = S.places.length;
  const deploy = []; for (let i = 0; i < np; i++) if (room(S, i, o) && (i === gateOf(o) || cnt(S, i, o) > 0)) deploy.push(i);
  const seen = {};
  P.hand.forEach((ci, h) => {
    if (seen[ci]) return; seen[ci] = 1; const c = CARDS[ci];
    if (c.t === 'fig') { if (S.cfg.unique && mine.some(f => f.c === ci)) return;   // (one of each person on your side of the table at a time)
      for (const i of deploy) if (costOf(S, o, ci, i) <= P.spark) { out.push({ t: 'fig', h, p: i });
        // (x: with the "you may" taken up. Constantine: your next Domain to the Crossroads. William: theirs is discarded.)
        if (S.dm && c.arr && ((c.arr[0] === 'found' && canTurn(S, o)) || (c.arr[0] === 'conquer' && enemySide(S, o, i) && !prot(S, i, o) && canTurn(S, i >> 1)))) out.push({ t: 'fig', h, p: i, x: 1 }); }
      return; }
    const x = costOf(S, o, ci); if (x > P.spark) return;
    if (c.t === 'relic') { if (P.relics.length < 2 && (S.cfg.relicStack ? !hasRelic(P, ci) : !hasFx(P, fxOf(ci)))) out.push({ t: 'relic', h }); return; }   // (two Relics, and no two with the same power)
    const open = g => pw(S, g.p) !== 'sanctuary', fx = fxOf(ci);
    if (fx === 'phalanx') return;   // (a Quick Deed is played with a clash, below)
    if (fx === 'eureka' || fx === 'caravan') out.push({ t: 'deed', h });
    else if (fx === 'decree') { for (let i = 0; i < np; i++) if (cnt(S, i, o)) out.push({ t: 'deed', h, p: i }); }
    else if (fx === 'eclipse') { for (let i = 0; i < np; i++) if (pw(S, i) !== 'sanctuary' && theirs.some(g => g.p === i)) out.push({ t: 'deed', h, p: i }); }
    else if (fx === 'encore') { for (const f of mine) if (!f.rdy) out.push({ t: 'deed', h, u: f.u }); }
    else if (fx === 'fairwinds') { for (const f of mine) if (!CARDS[f.c].k.monument) for (let i = 0; i < np; i++) if (i !== f.p && room(S, i, o)) out.push({ t: 'deed', h, u: f.u, p: i }); }
    else if (fx === 'ambush') { for (const f of mine) for (const g of theirs) if (g.p === f.p && open(g) && !CARDS[g.c].k.untouchable && !peace(S, f.p, o)) out.push({ t: 'deed', h, u: f.u, v: g.u }); }
    else if (fx === 'trojan') { P.hand.forEach((cj, h2) => { if (h2 !== h && CARDS[cj].t === 'fig' && CARDS[cj].c <= 3) for (let i = 0; i < np; i++) if (room(S, i, o)) out.push({ t: 'deed', h, h2, p: i }); }); }
    else if (fx === 'rift') { for (const f of mine) for (const g of S.figs) if (g.p !== f.p && g.u !== f.u && !CARDS[f.c].k.monument && !CARDS[g.c].k.monument && (g.o === o ? g.u > f.u : open(g)) && (g.o === o || (room(S, g.p, o) && room(S, f.p, g.o)))) out.push({ t: 'deed', h, u: f.u, v: g.u }); }
    else if (S.dm) {   // (the Deeds that act on Domains: a.p, a.q are positions)
      if (fx === 'earthquake') { for (let i = 0; i < 2 * S.N; i++) if (!prot(S, i, o) && canTurn(S, i >> 1)) out.push({ t: 'deed', h, p: i }); }
      else if (fx === 'vesuvius') { for (let i = 0; i < np; i++) if (!S.mk[i] && !prot(S, i, o)) out.push({ t: 'deed', h, p: i }); }
      else if (fx === 'caperoute') { if (canTurn(S, o)) out.push({ t: 'deed', h }); }
      else if (fx === 'breda') { for (let i = 0; i < np; i++) for (let j = 0; j < np; j++) if (j !== i && !prot(S, i, o) && !prot(S, j, o)) out.push({ t: 'deed', h, p: i, q: j }); }   // (both orders, so a player can tap either Domain first)
      else if (fx === 'columbian') { let ok = S.N === 2; for (let i = 0; i < 2 * S.N; i++) if (prot(S, i, o)) ok = false; if (ok) out.push({ t: 'deed', h }); }
    }
  });
  const ph = quicks(P).filter(h => costOf(S, o, P.hand[h]) <= P.spark);   // (a.ph: a Quick Deed goes with the clash; a.hq: which one, by its place in the hand)
  for (const f of mine) {
    const can = f.rdy && (!f.arr || CARDS[f.c].k.swift || f.sw), canClash = can || (S.cfg.rush && f.arr && !f.acted);
    if (can) for (const i of walkDests(S, f)) out.push({ t: 'walk', u: f.u, p: i });
    if (canClash) {
      const en = theirs.filter(g => g.p === f.p);
      if (en.length && !en.some(g => CARDS[g.c].k.law) && !peace(S, f.p, o)) {
        const gd = en.filter(g => CARDS[g.c].k.guard);
        for (const g of (gd.length ? gd : en)) if (!CARDS[g.c].k.untouchable) { out.push({ t: 'clash', u: f.u, v: g.u }); for (const hq of ph) out.push({ t: 'clash', u: f.u, v: g.u, ph: 1, hq: hq }); }
      }
    }
    if ((P.uA || 0) < nFx(S, P, 'antikythera') && !CARDS[f.c].k.monument) for (let i = 0; i < np; i++) if (i !== f.p && room(S, i, o)) out.push({ t: 'antik', u: f.u, p: i });
    if (P.guide === 'tubman' && !P.uT && !f.arr) for (const i of walkDests(S, f, true)) out.push({ t: 'tub', u: f.u, p: i });
  }
  return out;
}
function moveFig(S, f, to, jump) { if (S.ev) S.ev.push({ t: 'move', u: f.u, from: f.p, to: to, jump: jump ? 1 : 0 }); f.p = to; f.stay = 0; if (S.st) { if (jump) S.st.jump++; else S.st.walk++; } }
function apply(S, a, da, dd, raw) {
  const o = S.turn, P = S.P[o];
  if (a.t === 'dom') { pendApply(S, a); return; }
  if (a.t === 'fig') { const ci = P.hand[a.h]; P.spark -= costOf(S, o, ci, a.p); if (S.dm && pw(S, a.p) === 'cheap') P.uCh = (P.uCh || 0) | (1 << a.p); P.uN++; P.hand.splice(a.h, 1); putFig(S, o, ci, a.p, a.x); }
  else if (a.t === 'relic') { const ci = P.hand[a.h], src = threadSrc(S, o, ci); P.spark -= costOf(S, o, ci); P.uN++; P.hand.splice(a.h, 1); P.relics.push(ci); if (S.ev) S.ev.push({ t: 'relic', o: o, c: ci }); threadPlay(S, o, ci, src); if (S.st) S.st.played[o][ci] = 1; if (S.figs.some(f => f.o === o && CARDS[f.c].k.eureka)) draw(S, o, 1); }
  else if (a.t === 'walk') { const f = byU(S, a.u); const far = S.adj[f.p].indexOf(a.p) < 0; moveFig(S, f, a.p, far); f.rdy = 0; }
  else if (a.t === 'antik') { const f = byU(S, a.u); moveFig(S, f, a.p, true); f.rdy = 0; P.uA = (P.uA || 0) + 1; }
  else if (a.t === 'tub') { moveFig(S, byU(S, a.u), a.p, false); P.uT = 1; }
  else if (a.t === 'clash') { const f = byU(S, a.u), g = byU(S, a.v); if (a.ph) { const h = a.hq != null && fxOf(P.hand[a.hq]) === 'phalanx' ? a.hq : quicks(P)[0], qc = P.hand[h], tsrc = threadSrc(S, o, qc); P.spark -= costOf(S, o, qc); P.uN++; P.hand.splice(h, 1); P.uD = 1; f.tb += 2; f.tq = qc; if (S.st) S.st.played[o][qc] = 1; if (S.ev) S.ev.push({ t: 'quick', o: o, c: qc, u: f.u, att: 1 }); threadPlay(S, o, qc, tsrc); } clash(S, f, g, da, dd, 0, raw); }
  else if (a.t === 'deed') {
    const ci = P.hand[a.h], fx = fxOf(ci), tsrc = threadSrc(S, o, ci); P.spark -= costOf(S, o, ci); P.uN++; P.uD = 1; if (S.st) S.st.played[o][ci] = 1; if (S.ev) S.ev.push({ t: 'deed', o: o, c: ci, p: a.p, u: a.u, v: a.v }); threadPlay(S, o, ci, tsrc);
    let h2c = a.h2 != null ? P.hand[a.h2] : null;
    if (a.h2 != null) { P.hand.splice(Math.max(a.h, a.h2), 1); P.hand.splice(Math.min(a.h, a.h2), 1); } else P.hand.splice(a.h, 1);
    if (fx === 'eureka') draw(S, o, 2);
    else if (fx === 'caravan') P.spark += (S.cfg.caravan || 3);
    else if (fx === 'decree') S.pb[a.p][o] += (S.cfg.decree || 4);
    else if (fx === 'eclipse') { for (const g of S.figs) if (g.p === a.p && g.o !== o) g.stun = 1; }
    else if (fx === 'encore') { const f = byU(S, a.u); f.rdy = 1; f.arr = 0; }
    else if (fx === 'fairwinds') { const f = byU(S, a.u); moveFig(S, f, a.p, true); f.rdy = 0; }
    else if (fx === 'ambush') { const f = byU(S, a.u), g = byU(S, a.v), r = f.rdy; clash(S, f, g, da, dd, 1, raw); if (byU(S, a.u)) f.rdy = r; }
    else if (fx === 'trojan') putFig(S, o, h2c, a.p);
    else if (fx === 'rift') { const f = byU(S, a.u), g = byU(S, a.v), t = f.p; moveFig(S, f, g.p, true); moveFig(S, g, t, true); }
    else if (S.dm) { const use = k => { if (S.st) S.st.use[k] = (S.st.use[k] || 0) + 1; }, side = i => i === 2 * S.N ? 'the Crossroads' : (i >> 1) === o ? 'mine' : 'theirs';
      if (fx === 'earthquake') { const w = a.p >> 1, id = turnDomain(S, w); if (id) { layDomain(S, a.p, id, w, ci); use('earthquake: ' + side(a.p)); } }
      else if (fx === 'vesuvius') { S.mk[a.p] = ci; if (S.ev) S.ev.push({ t: 'marker', p: a.p, c: ci, o: o }); use('vesuvius: ' + side(a.p)); }
      else if (fx === 'caperoute') { const id = turnDomain(S, o); if (id) { layDomain(S, 2 * S.N, id, o, ci); use('caperoute'); } }
      else if (fx === 'breda') { const perm = S.places.map((_, i) => i); perm[a.p] = a.q; perm[a.q] = a.p; use('breda: ' + [side(a.p), side(a.q)].sort().join(' and ')); permute(S, perm, ci); }
      else if (fx === 'columbian') { permute(S, [2, 3, 0, 1, 4], ci); use('columbian'); }
    }
  }
}
const isRoll = a => a.t === 'clash' || (a.t === 'deed' && a.isAmbush);
// How good the table looks to one player: Renown, Seals, Places held and how safely, cards, lines
function evalS(S, me, prof) {
  const P = S.P[me], N = S.N, cfg = S.cfg, left = cfg.target ? Math.max(1, Math.min(4, Math.ceil((cfg.target - Math.max.apply(null, S.P.map(p => p.renown))) / 5))) : cfg.rounds - S.round + 1; let v = 0, best = -1e9, cm = 0, co = 0, tm = 0, to = 0;
  for (let o = 0; o < N; o++) if (o !== me && S.P[o].renown > best) best = S.P[o].renown;
  v += prof.wRen * (P.renown - best) + prof.wSeal * P.broke - 3 * (cfg.seals - P.seals);
  for (let i = 0; i < S.places.length; i++) {
    const m = mights(S, i), h = holderM(S, i, m); let ob = 0; for (let o = 0; o < N; o++) if (o !== me && m[o] > ob) ob = m[o];
    const w = ownerOfSpoke(S, i), kind = w < 0 ? 2 : w === me ? (isGate(S, i) ? 0 : 1) : (isGate(S, i) ? 4 : 3), rw = pw(S, i);
    const val = (h >= 0 ? rv(S, i, h) : rw === 'double' ? 2 : 1) * prof.pos[kind] * stake(cfg, S.round), d = m[me] - ob;
    v += val * (h === me ? 1 : h >= 0 ? -1 : 0) + val * 0.25 * Math.max(-4, Math.min(4, d));
    if (kind === 0 && h !== me) v -= 2.5; if (kind === 4 && h === me) v += prof.wSeal * 0.6;
    if (S.dm && h >= 0) { const s = h === me ? 1 : -1; if (rw === 'draw') v += 0.5 * s; else if (rw === 'spark') v += 0.6 * s; else if (rw === 'forge') v += 0.3 * s; }   // (what a rule that pays its holder is worth, on top of the Renown)
  }
  for (const f of S.figs) { const m = might(S, f, 0); if (f.o === me) { cm++; tm += m; } else { co++; to += m; } }
  v += prof.wFig * (cm - co / (N - 1)) + 0.08 * (tm - to / (N - 1));
  v += 0.35 * Math.min(1, left / 3) * P.hand.length + prof.wLine * P.lines + 0.02 * P.spark;
  for (const r of P.relics) { const fx = fxOf(r); v += (fx === 'press' ? 0.5 : fx === 'antikythera' ? 0.4 : 0.2) * (left - 1); }
  return v;
}
const PROF = {
  holder: { pos: [1, 1, 1.2, 1, 1], wRen: 1, wSeal: 2, wFig: 0.3, wLine: 0.5, noise: 0 },
  raider: { pos: [0.8, 0.8, 1, 1.4, 2.5], wRen: 1, wSeal: 5, wFig: 0.3, wLine: 0.3, noise: 0 },
  keeper: { pos: [1.3, 1.2, 1, 0.6, 0.5], wRen: 1.2, wSeal: 1, wFig: 0.3, wLine: 1.5, noise: 0 },
  brawler: { pos: [1, 1, 1.1, 1, 1], wRen: 1, wSeal: 2, wFig: 0.9, wLine: 0.3, noise: 0 },
  // The three robots you can play. noise: how unclearly it judges a move; quit: its chance, at each step, of calling the
  // turn early with Spark still to spend (the big one: 0.15 loses about three games in four to Normal).
  novice: { pos: [1, 1, 1, 1, 1], wRen: 1, wSeal: 2, wFig: 0.3, wLine: 0.5, noise: 3, quit: 0.15 },      // Easy
  normal: { pos: [1, 1, 1.2, 1, 1], wRen: 1, wSeal: 2, wFig: 0.3, wLine: 0.5, noise: 1.5, quit: 0.03 },  // Normal
  hard: { pos: [0.8, 0.8, 1, 1.4, 2.5], wRen: 1, wSeal: 5, wFig: 0.3, wLine: 0.3, noise: 0 },            // Hard (the raider, playing its best)
};
// A robot weighing a card that turns up a Domain it can't see yet (it knows what is in a stack, not the order)
// shuffles the stacks in its head a few times and takes the average, so it never peeks at the top card.
function hidden(S, a) {
  const P = S.P[S.turn]; if (a.t === 'fig') { const c = CARDS[P.hand[a.h]]; return !!(c.arr && (c.arr[0] === 'scout' || (a.x && (c.arr[0] === 'found' || c.arr[0] === 'conquer')))); }
  if (a.t === 'deed') { const fx = fxOf(P.hand[a.h]); return fx === 'earthquake' || fx === 'caperoute'; } return false;
}
function mix(T, k) { for (let o = 0; o < T.N; o++) dshuf(T.P[o].dst, T.uid * 131 + k * 7 + o + T.round * 13 + T.P[o].dst.length); }
// (a choice of Domain that opens inside a robot's look ahead: it takes the one it likes best)
function settle(T, prof) { for (let g = 0; T.pend && g < 4; g++) { const o = T.pend.o; let best = null, bv = -1e9; for (const a of pendActions(T)) { const U = clone(T); pendApply(U, a); const v = evalS(U, o, prof); if (v > bv) { bv = v; best = a; } } pendApply(T, best); } }
function valueOf(S, a, me, prof) {
  const roll = a.t === 'clash' || (a.t === 'deed' && fxOf(S.P[me].hand[a.h]) === 'ambush');
  if (!roll && S.dm) { const K = hidden(S, a) ? 3 : 1; let s = 0;
    for (let k = 0; k < K; k++) { const T = clone(S); if (K > 1) mix(T, k); apply(T, a, 0, 0); if (T.pend) settle(T, prof); s += evalS(T, me, prof); }
    return s / K; }
  if (!roll) { const T = clone(S); apply(T, a, 0, 0); return evalS(T, me, prof); }
  let s = 0, w = 0; for (const x of diceOdds(S.cfg)) { const T = clone(S); apply(T, a, x[0], x[1]); s += x[2] * evalS(T, me, prof); w += x[2]; } return s / w;
}
// A choice of Domain, as a robot makes it (and as the page makes it for a player until it has a screen to ask with:
// no prof is the plain best choice)
function pendPick(S, prof, R) {
  const o = S.pend.o, pf = prof || PROF.holder; let pb = null, pv = -1e9;
  for (const a of pendActions(S)) { const T = clone(S); pendApply(T, a); let v = evalS(T, o, pf); if (prof && prof.noise && R) v += (R() - 0.5) * prof.noise; if (v > pv) { pv = v; pb = a; } }
  return pb;
}
// The robot's next step (null: it's done for the turn)
function aiPick(S, prof, R) {
  const me = S.turn;
  if (S.pend) return pendPick(S, prof, R);   // (a Domain to choose)
  let best = null, bv = evalS(S, me, prof) + 0.02;
  if (prof.quit && R() < prof.quit) return null;   // (calls it a turn early)
  for (const a of actions(S)) { if (a.q != null && a.q < a.p) continue; let v = valueOf(S, a, me, prof); if (prof.noise) v += (R() - 0.5) * prof.noise; if (v > bv) { bv = v; best = a; } }
  return best;
}
// Who goes first this round: the leader (so whoever is behind has the last word); level, take turns
function firstOf(S) {
  const N = S.N; if (S.cfg.order !== 'trail') return S.cfg.order === 'alt' ? (S.round - 1) % N : 0;
  let mx = -1, tie = false, w = 0; for (let o = 0; o < N; o++) { if (S.P[o].renown > mx) { mx = S.P[o].renown; w = o; tie = false; } else if (S.P[o].renown === mx) tie = true; }
  return tie ? ((S.f0 || 0) + S.round - 1) % N : w;
}
function discard(S, o, h) { const P = S.P[o], c = P.hand.splice(h, 1)[0]; (P.gone || (P.gone = [])).push(c); if (S.ev) S.ev.push({ t: 'discard', o: o, c: c }); }
function aiTurn(S, prof, R) {
  const me = S.turn, D = S.cfg.die;
  for (let n = 0; n < 40; n++) {
    const best = aiPick(S, prof, R);
    if (!best) return;
    if (S.cfg.trace) { const P = S.P[me], f = best.u ? byU(S, best.u) : null, g = best.v ? byU(S, best.v) : null, nm = x => x ? CARDS[x.c].n + '(' + might(S, x, 0) + ')' : '';
      S.cfg.trace.push('  P' + me + ' ' + best.t + ' ' + (best.h != null ? CARDS[P.hand[best.h]].n + ' ' : '') + nm(f) + (g ? ' vs ' + nm(g) : '') + (best.p != null ? ' -> ' + PLACES[S.places[best.p]].n : '') + (best.ph ? ' +Phalanx' : '') + ' [spark ' + P.spark + ']'); }
    const nf = S.figs.length, roll = rollClash(S.cfg, R); apply(S, best, roll.da, roll.dd, roll);
    if (S.cfg.trace && S.figs.length < nf) S.cfg.trace.push('     knocked out! ' + S.figs.length + ' figures left');
  }
}
// The round track, as a table shows it: the round and the last round, who takes the first turn of this round and who
// took the first turn of the game, the Spark a player starts a turn with this round, the Renown that wins, the round
// Lincoln mends a Seal in, and whose Legacy Line counter is turned over (a line has scored for them this round).
function track(S) { const cfg = S.cfg; return { round: S.round, rounds: cfg.rounds, first: firstOf(S), f0: S.f0 || 0, spark: Math.min(S.round + 1, cfg.sparkCap || 99), target: cfg.target, mend: MEND_AT, lines: S.P.map(p => p.lr ? 1 : 0) }; }
function startTurn(S) {
  const o = S.turn, P = S.P[o], cfg = S.cfg;
  for (const f of S.figs) if (f.o === o) { f.rdy = f.stun ? 0 : 1; f.stun = 0; f.arr = 0; f.acted = 0; }
  P.uA = P.uT = P.uD = P.uC = P.uN = 0; if (S.dm) P.uCh = 0;
  let held = 0; if (cfg.spark !== 'round') for (let i = 0; i < S.places.length; i++) if (holder(S, i) === o) held++;
  P.spark = (cfg.spark === 'round' ? Math.min(S.round + 1, cfg.sparkCap || 99) : cfg.spark === 'hold' ? 2 + held : S.round + (held >= 3 ? 1 : 0)) + P.sb; P.sb = 0; P.reserve = 0;
  if (cfg.catchup) { let mn = 1e9; for (let q = 0; q < S.N; q++) if (q !== o && S.P[q].renown < mn) mn = S.P[q].renown; if (P.renown < mn) { P.spark += 1; if (cfg.catchup === 2) draw(S, o, 1); if (cfg.catchup === 3 && mn - P.renown >= (cfg.far || 4)) P.spark += 1; } }
  if (S.ev) S.ev.push({ t: 'turn', o: o, spark: P.spark, round: S.round });
  draw(S, o, 1 + nFx(S, P, 'press') + (cfg.draw2 ? 1 : 0));
  if (P.guide === 'franklin' && P.hand.length <= 4) draw(S, o, 1);   // (Franklin: a thin hand draws one more)
}
function endTurn(S) {
  if (S.pend) pendApply(S, { t: 'dom', no: 1 });   // (a choice of Domain left open is a no)
  const P = S.P[S.turn]; P.reserve = Math.min(2, P.spark); P.spark = 0; P.uN = 9; for (const f of S.figs) { f.tb = 0; if (f.ta) f.ta = 0; }   // (uN 9: Curie's cheaper second card is for her own turn only)
  if (S.cfg.handMax) while (P.hand.length > S.cfg.handMax) { let hi = 0; for (let i = 1; i < P.hand.length; i++) if (CARDS[P.hand[i]].c > CARDS[P.hand[hi]].c) hi = i; discard(S, S.turn, hi); }   // (over the hand limit: the dearest cards go; a screen asks the player first)
}
function endRound(S) {
  const cfg = S.cfg, N = S.N; let last = S.round === cfg.rounds;
  for (let i = 0; i < S.places.length; i++) {
    const h = holder(S, i); if (h < 0) continue; const P = S.P[h], val = rv(S, i, h) * stake(cfg, S.round), w = pw(S, i);
    if (cfg.scoring === 'round') P.renown += val; else if (last) P.renown += 3 * val;
    if (S.ev) S.ev.push({ t: 'hold', p: i, o: h, n: val });
    if (w === 'draw') draw(S, h, 1); if (w === 'spark') P.sb += 1;   // (a rule that pays at the end of the round pays for the Domain lying there now)
    if (isGate(S, i) && (i >> 1) !== h && S.P[i >> 1].seals > 0) { S.P[i >> 1].seals--; P.broke++; P.renown += cfg.sealRen; if (S.st) S.st.sealBreaks++; if (S.ev) S.ev.push({ t: 'seal', o: i >> 1, by: h, left: S.P[i >> 1].seals }); }
  }
  if (cfg.majority) { const hc = new Array(N).fill(0); for (let i = 0; i < S.places.length; i++) { const h = holder(S, i); if (h >= 0) hc[h]++; } let mx = 0, w = -1, tie = false; for (let o = 0; o < N; o++) { if (hc[o] > mx) { mx = hc[o]; w = o; tie = false; } else if (hc[o] === mx) tie = true; } if (!tie && w >= 0) S.P[w].renown += cfg.majority * stake(cfg, S.round); }
  for (const f of S.figs) { const k = CARDS[f.c].k; if ((k.stage || k.tale) && holder(S, f.p) === f.o) { if (k.stage) { S.P[f.o].renown++; if (S.ev) S.ev.push({ t: 'renown', o: f.o, n: 1, why: 'stage', u: f.u }); } else draw(S, f.o, 1); } f.stay++; }
  for (const b of S.pb) b.fill(0); for (const p of S.P) { p.lr = 0; p.uM = 0; }
  if (S.st) { let l = -1, mx = -1, tie = false; for (let o = 0; o < N; o++) { if (S.P[o].renown > mx) { mx = S.P[o].renown; l = o; tie = false; } else if (S.P[o].renown === mx) tie = true; } S.st.lead.push(tie ? -1 : l); }
  if (cfg.target && S.P.some(p => p.renown >= cfg.target)) last = true;
  if (N === 2) for (let o = 0; o < 2; o++) if (S.P[o].seals <= 0) { S.over = true; S.winner = 1 - o; S.how = 'seals'; return; }
  if (last) {
    S.over = true; S.how = 'renown'; const key = o => S.P[o].renown * 1e4 + S.P[o].broke * 100 + S.figs.filter(f => f.o === o).reduce((s, f) => s + might(S, f, 0), 0);
    let mx = -1, w = -1, tie = false; for (let o = 0; o < N; o++) { const k = key(o); if (k > mx) { mx = k; w = o; tie = false; } else if (k === mx) tie = true; } S.winner = tie ? -1 : w;
  } else { S.round++;
    // (Lincoln: once a game, at the start of round 5, one of his broken Seals is mended)
    if (S.round === MEND_AT) for (let o = 0; o < N; o++) { const p = S.P[o]; if (p.guide === 'lincoln' && p.seals < cfg.seals && p.seals > 0) { p.seals++; if (S.ev) S.ev.push({ t: 'mend', o: o, left: p.seals }); } } }
}
// The Domain stack a deck brings when a test names none: a ready deck's own stack (cards.js STACKS), and for any
// other deck fifteen Domains dealt at random from all there are.
const ALLDOM = Object.keys(PLACES).filter(id => PLACES[id].pw);
function stacksFor(decks, R) {
  return decks.map(d => { const set = {}; d.forEach(c => { set[c] = 1; }); const n = Object.keys(set).length;
    for (const k in cards.ARCH) { const a = cards.ARCH[k]; if (a.stack && a.cards.length === n && a.cards.every(c => set[c])) return a.stack.slice(); }
    return shuffle(ALLDOM.slice(), R).slice(0, cards.STACK || 15); });
}
// stacks: each player's Domain stack. With none, cfg.dm (the game's rules have it) deals them (stacksFor); with
// neither, the game is on the old fixed map.
function play(decks, guides, profs, cfg, seed, stacks) {
  const R = rng(seed); if (!stacks && cfg.dm && cards.STACKS) stacks = stacksFor(decks, rng((seed ^ 0x5bd1e995) >>> 0));
  const S = newGame(decks, guides, cfg, R, stacks, { profs: profs }), N = S.N;
  while (!S.over) {
    const first = firstOf(S);
    for (let k = 0; k < N && !S.over; k++) { S.turn = (first + k) % N; startTurn(S); aiTurn(S, profs[S.turn], R); endTurn(S); }
    if (!S.over) { endRound(S); if (S.cfg.trace) S.cfg.trace.push('== end of round ' + (S.over && S.how === 'renown' ? S.cfg.rounds : S.over ? S.round : S.round - 1) + ': renown ' + S.P.map(p => p.renown) + ' seals ' + S.P.map(p => p.seals) + ' holders ' + S.places.map((x, i) => PLACES[x].n.split(' ').pop() + ':' + holder(S, i)).join(' ')); }
  }
  return S;
}
return { play, PROF, rng, shuffle, DEF, STD, OLD_TARGET, newGame, clone, actions, apply, evalS, mights, holder, holderM, might, costOf, walkDests, cnt, room, stake, gateOf, isGate, ownerOfSpoke, enemySide, byU,
  startTurn, endTurn, endRound, firstOf, aiPick, aiTurn, discard, diceOdds, rollClash, threadSrc, fxOf, hasFx, relicOf, quicks, CARDS, PLACES,
  pw, rv, silenced, prot, capAt, track, setupOptions, setupLay, setupRoll, setupAuto, setupPick, setupFixed, stacksFor, pendActions, pendPick, layDomain, turnDomain, permute, deckInfo, layScore, LAYV };
});
