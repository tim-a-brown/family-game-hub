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
//   S.lh          who held each Domain when the last round ended, by the Domain's id ({id: player}): the token a table
//                 lays on the card at the count (the Taj Mahal, Constantinople). It travels with the card.
//   S.gw          who held Greenwich when the last round ended (-1: nobody): that player takes the last turn of this round
//   P.debt        Spark Florence lent this turn, taken off the player's next turn. P.lau, P.ks: the player has had
//                 Laurion's silver, has mended a Seal at Kumasi (once a game each: a token turned over on the card).
//   P.uL, uB, uH, uRl, uP, uPd   once a turn: borrowed at Florence, bought a card at Timbuktu, hired at Carthage,
//                 relayed on the Qhapaq Ñan, drew at Gutenberg's Workshop, drew at Padua
//   f.vic         an Olympic victor (+1 Might while in play: a marker on the Figure). f.gar: walked into Dunhuang this
//                 turn, so it can still start a clash there.
// Diogenes's Silence marker is not kept: it lies on whatever Domain he stands on (silenced(S, i) says what lies on a rule).
// A game without S.dm is on the fixed map of the twelve Places the game had before Domains: a lesson's table
// (guide.js), a test game with no stacks, and a game saved before Domains, which finishes under the rules it began
// with. There each Place has the rule it had then (PLACES[id].pw0), and nothing that belongs to Domains happens.
// Every Domain has a power of its own (Tim, 2026-11-12: "domain powers list is approved"): one word in its data
// (PLACES[id].pw, listed with its kind in cards.js DRULES), no two the same, and never a Domain's name in the code. The
// sentence a player reads is text.js DRULE[word], the tile's label ui.js DSHORT[word]. Each word's test lives where that
// kind of rule lives: Might (might), walking (walkDests), costs (costOf), clashes (clash), knock-outs (ko), who holds a
// Domain (holderM), what it scores (rv), the end of a round (endRound), the four choices (actions, apply). The numbers a
// power gives are DV below. Where a power works is in pw(): a Commerce Domain and Greenwich do nothing at a Gate, Lisbon
// works only at the Crossroads, Citadelle Laferrière only at an Outpost, Machu Picchu not at the Crossroads.
// scripts/anoria/domains.js "each" measures every one at every position (domains.txt section 14), and
// scripts/anoria/powers-test.js checks each against its sentence.
//   Commerce  spark (Kilwa: holder +1 Spark next turn), cheap (Tlatelolco: the first Figure a player plays there each turn
//             costs 1 less), harbour (Malacca: every Figure is at home there), toll (Petra: a player who does not hold it
//             pays 1 Spark to walk a Figure in), monopoly (Lisbon, at the Crossroads: the one player with Figures there
//             gets 2 Spark next turn), loan (Florence: its holder can borrow 2 Spark once a turn, paid back next turn: {t: 'loan', p}),
//             books (Timbuktu: its holder can pay 1 Spark once a turn to draw a card: {t: 'buy', p}), hire (Carthage: a
//             player with a Figure there can pay 1 Spark once a turn for +2 Might there this round: {t: 'hire', p}),
//             league (Venice: its holder gets 1 Spark next turn for each Commerce Domain they hold), fair (Djenné:
//             everyone with a Figure there gets 1 Spark next turn)
//   Industry  forge (Ironbridge: Relics and Deeds 1 less for its holder), arms (Meroë: +1 Might on the turn a Figure is
//             played there), facV (Damascus), print (Gutenberg: its holder draws a card the first time each turn they
//             play a Relic or a Deed), kiln (Jingdezhen: holder +1 Spark next turn for each Relic they have), strike
//             (Laurion: 2 Spark the first time each player holds it at a count), ships (Nanjing: Voyagers cost 1 less
//             for its holder), stay (Benin City: +1 Might for a Figure that has stood there since the last count)
//   Thought   draw (the Library: holder draws a card), line (Plato's Academy: a Legacy Line made by a Figure played there
//             scores 1 more), facD (the Royal Society), clock (Greenwich, not at a Gate: its holder at the count takes the last
//             turn of the next round), recall (House of Wisdom: holder takes the top card of their discard pile back), study
//             (Nalanda: everyone with a Figure there draws), school (Padua: the first Figure you play there each turn
//             draws you a card), equal (Seneca Falls: every Figure there starts from 3 Might)
//   Land      fort (the Great Wall: defenders +1), closed (Machu Picchu: only its own side walks in), narrow (Thermopylae:
//             two Figures a player), maze (Himeji: a tied clash knocks out the Figure that started it), siege
//             (Gibraltar: defenders +2 while outnumbered there), citadel (Laferrière, at an Outpost: its own side's Figures +1), relief
//             (Orléans: +2 to a Figure starting a clash there while the other player holds it), engines (Syracuse:
//             defenders +1 for each Relic their player has), heartland (Great Zimbabwe: at home +2, not +1), islets (Nan
//             Madol: while one player holds it the other can't walk Figures out), rock (Sigiriya: a Figure comes there
//             only by being played or by one step from next to it)
//   Culture   arena (the Colosseum: winning a clash there scores 1), crowd (the Acropolis: 2 Renown held with two
//             Figures), facA (the Globe), patron (Sistine: Arts Figures played there cost 1 less), court (Heian-kyō: 2
//             Renown held with an Arts Figure), pupils (Vienna: a Legacy Line gives +2 Might there), memorial (the Taj
//             Mahal: 1 more Renown for a holder who held it at the last count), facW (Giza), gathering (Stonehenge: its
//             banner's player can walk Figures there from anywhere), victor (Olympia: a Figure that wins a clash there keeps +1 Might),
//             confederacy (Prophetstown: +1 Might while its player has another Figure there), punt (Deir el-Bahari:
//             its holder scores 1 Renown for each Relic they play), rank (Versailles: the costliest Figure holds it),
//             ballcourt (Chichén Itzá: winning a clash there by 3 or more scores 2), stool (Kumasi: its holder at the
//             count mends a broken Seal, once a game each), ancestors (Rapa Nui: a Figure knocked out there goes on top
//             of its player's deck)
//   Law       peace (Nineveh: only its holder can start a clash there), sanctuary (the Forbidden City: safe from the
//             other player's Deeds), facS (Aachen), vote (the Forum: the most Figures hold it), declare (Independence
//             Hall: 2 Renown for a holder who is behind), tribute (Persepolis: its holder takes 1 Spark from the other
//             player's next turn while both have Figures there), code (Babylon: a Figure played there costs 3), treeofpeace
//             (Onondaga: nobody can start a clash there), throne (Constantinople: a tie goes to whoever held it at the last
//             count), treaty (Tordesillas: a tie with both there scores 1 for each), charter (Runnymede: a Figure that
//             loses a clash there goes back to its Gate), wergild (Winchester: a Figure knocked out there gets its
//             player 1 Spark next turn)
//   Routes    link (the Silk Road), road (the Appian Way: a Figure played there can walk that turn), landing (L'Anse aux
//             Meadows: its banner's player can play Figures there, when it lies away from their side), garrison
//             (Dunhuang: its banner's player's Figure that walks there can clash that turn), relay (the Qhapaq Ñan: a Figure there can swap places with another of yours once a turn: {t:
//             'relay', u, v}), canal (the Grand Canal: its banner's player's Figures can walk
//             between it and their Gate), port (Basra: linked to every
//             Commerce Domain), passage (the Strait of Magellan: a walk from there to the other player's Outpost),
//             searoad (the Cape: a walk from there can be two steps), flight (Kitty Hawk: a walk from there can go anywhere but the
//             other player's Gate)
//   double    (only on the old map: the Acropolis scored 2 Renown)
const FAC = { A: 'facA', D: 'facD', S: 'facS', V: 'facV', W: 'facW' };
// The numbers the Domain powers give, in one place (a test game can try others, cfg.dv, e.g. '{"dv":{"code":4}}', or
// switch a power off as a control: '{"dv":{"off":["code"]}}')
const DV = { monopoly: 2, loan: 2, hire: 2, strike: 2, code: 3, codeCap: 0, equal: 3, siege: 2, relief: 2, heartland: 1, declare: 2, punt: 1, ballcourt: 2, fort: 1, tribute: 1, stay: 1, citadel: 1, confed: 1, kiln: 1 };
const dv = (S, k) => (S.cfg.dv && S.cfg.dv[k] != null ? S.cfg.dv[k] : DV[k]);
// (is a Domain with this power on the table at all: a cheap test before looking for who holds it)
const onTable = (S, w) => !!S.dm && S.places.some(id => PLACES[id] && PLACES[id].pw === w);
// (the position of the Domain with this power, where it works, or -1)
const posOf = (S, w) => { for (let i = 0; i < S.places.length; i++) if (pw(S, i) === w) return i; return -1; };
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
    st: { clash: 0, ko: 0, jump: 0, walk: 0, lines: 0, plays: 0, home: 0, lead: [], ev: [], played: decks.map(() => ({})), seenC: decks.map(() => ({})), sealBreaks: 0, upsets: 0 } };   // (seenC: the cards each player has had in hand, for the test games)
  if (cfg.coin) S.f0 = (Math.random() * N) | 0;   // (who starts, when nobody leads)
  for (let p = 0; p < N; p++) {
    let deck = shuffle(decks[p].slice(), R), hand = deck.splice(0, cfg.hand);
    if (!hand.some(c => CARDS[c].t === 'fig' && CARDS[c].c <= 2)) { deck = shuffle(deck.concat(hand), R); hand = deck.splice(0, cfg.hand); }   // one mulligan
    for (const c of hand) S.st.seenC[p][c] = 1;
    S.P.push({ deck, hand, relics: [], guide: guides[p], spark: 0, reserve: 0, renown: 0, seals: cfg.seals, broke: 0, sb: 0, uA: 0, uT: 0, uD: 0, uC: 0, uN: 0, uM: 0, uW: 0, uR: 0, sg: 0, lines: 0 });
  }
  if (stacks) { setupBegin(S, stacks, R); if (opt && opt.lay) setupFixed(S, opt.lay, opt.ban, opt.first); else if (!(opt && opt.wait)) setupAuto(S, R, opt && opt.profs); }
  return S;
}
function clone(S) {
  const T = { cfg: S.cfg, N: S.N, round: S.round, turn: S.turn, uid: S.uid, places: S.places, adj: S.adj, pb: S.pb.map(x => x.slice()), figs: S.figs.map(f => Object.assign({}, f)),
    P: S.P.map(p => Object.assign({}, p, { deck: p.deck.slice(), hand: p.hand.slice(), relics: p.relics.slice(), gone: p.gone ? p.gone.slice() : null })), over: S.over, winner: S.winner, how: S.how, st: null, ev: null };
  if (S.dm) { T.dm = S.dm; T.f0 = S.f0; T.places = S.places.slice(); T.ban = S.ban.slice(); T.mk = S.mk.slice(); T.cyn = S.cyn; T.pend = S.pend; T.gw = S.gw; if (S.lh) T.lh = Object.assign({}, S.lh); for (let o = 0; o < S.N; o++) { T.P[o].dst = S.P[o].dst.slice(); T.P[o].dgone = S.P[o].dgone.slice(); } }
  else if (S.f0 != null) T.f0 = S.f0;
  return T;
}
const stake = (cfg, r) => cfg.ramp ? cfg.ramp[Math.min(r, cfg.ramp.length) - 1] : 1;
const COURT_W = 0.6;   // (what the robots count Akbar's court as, in Renown, while it stands: the rest of the round can still undo it. At 1 they gave up too much else for it)
const MEND_AT = 5;   // (Lincoln: the round at whose start one of his broken Seals is mended, once a game)
const gateOf = o => 2 * o, ownerOfSpoke = (S, i) => i === 2 * S.N ? -1 : (i >> 1);
const isGate = (S, i) => i < 2 * S.N && !(i & 1);
const enemySide = (S, o, i) => { const w = ownerOfSpoke(S, i); return w >= 0 && w !== o; };
const pid = (S, i) => S.places[i];
// The Guides who joined with the roster of twelve (2026-11-11). Each power is one test by the Guide's key, where the
// rule it bends lives; scripts/anoria/guides.txt has what each is worth and every draft that was tried.
//   joan       her Figures have +1 Might in a clash they start while the other player has more Renown (might)
//   saladin    the first time each turn that a Figure of his wins a clash it started, he gains 1 Spark (clash)
//   shakespeare the first time each round that a Figure of his is defeated at the Crossroads, he scores 1 Renown (ko)
//   wuzetian   holding more Places than the other player when a round ends gives her 1 more Spark next turn (endRound)
//   akbar      Figures of two or more factions at the Crossroads when a round ends score him 1 Renown (endRound)
//   mansamusa  up to 2 Spark he has not spent are his to spend next turn (startTurn)
//   sorjuana   her Scholar Figures cost 1 less (costOf; Tim, 2026-11-12: her first draft, a cheaper first Deed, was Franklin's)
const behind = (S, o) => S.P.some(p => p.renown > S.P[o].renown);
// (Akbar's court: Figures of his of two or more factions standing at the Crossroads)
const atCourt = (S, o) => { if (S.P[o].guide !== 'akbar') return false; const hub = 2 * S.N; let f0 = null; for (const g of S.figs) if (g.p === hub && g.o === o) { const x = CARDS[g.c].f; if (f0 === null) f0 = x; else if (x !== f0) return true; } return false; };
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
  if (S.cfg.dv && S.cfg.dv.off && S.cfg.dv.off.indexOf(p) >= 0) return '';   // (test games: a power switched off, as a control)
  if (p === 'closed' && i === 2 * S.N) return '';                                  // (Machu Picchu: the Crossroads is on nobody's side)
  if (p === 'citadel' && (i === 2 * S.N || !(i & 1))) return '';                  // (Citadelle Laferrière: only at an Outpost)
  if (p === 'monopoly' && i !== 2 * S.N) return '';                               // (Lisbon: only at the Crossroads)
  if ((pl.d === 'Commerce' || p === 'clock') && i < 2 * S.N && !(i & 1)) return '';   // (a Commerce Domain does nothing at a Gate, and nor does Greenwich)
  if (S.mk[i]) return '';
  if (S.cyn) for (const f of S.figs) if (f.p === i && CARDS[f.c].k.cynic && !prot(S, i, f.o)) return '';
  return p;
}
// The Renown a Domain scores for the player who holds it
function rv(S, i, h) {
  const w = pw(S, i); let v = 1;
  if (w === 'double' || (w === 'crowd' && cnt(S, i, h) >= 2) || (w === 'court' && S.figs.some(f => f.p === i && f.o === h && CARDS[f.c].f === 'A'))) v = 2;   // (the Acropolis; Heian-kyō with an Arts Figure)
  else if (w === 'declare' && behind(S, h)) v = dv(S, 'declare');   // (Independence Hall, for a holder who is behind)
  else if (w === 'memorial' && S.lh && S.lh[S.places[i]] === h) v = 2;   // (the Taj Mahal, held again)
  return v;
}
// How many Domains with this rule a player holds
function nHeld(S, o, w) { let n = 0; for (let i = 0; i < S.places.length; i++) if (pw(S, i) === w && holder(S, i) === o) n++; return n; }
// At a Law Domain only the player who holds it can start a clash (Nineveh); at Onondaga nobody can. (cfg.peaceSym, for test games: nobody can at Nineveh either.)
const peace = (S, i, o) => { if (!S.dm) return false; const w = pw(S, i); return w === 'treeofpeace' || (w === 'peace' && (S.cfg.peaceSym || holder(S, i) !== o)); };
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
  if (S.lh) { delete S.lh[id]; if (old != null) delete S.lh[old]; }   // (a Domain that leaves the table, or comes onto it, carries no holder's token)
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
// k 'congress' (Congress of Vienna, when a die shows a 6): the player names the Domain a 6 stands for, by its
// position: {t: 'dom', p, q}, the two Domains named (p is the one the other die named, when only one die is a 6).
// Naming the same Domain twice is allowed, as two dice may: that Domain is then replaced. There is no saying no.
function pendActions(S) {
  if (S.pend.k === 'congress') { const q = S.pend, out = [], np = S.places.length, ok = i => !prot(S, i, q.o);
    if (q.fixed >= 0) { for (let y = 0; y < np; y++) if (ok(y)) out.push({ t: 'dom', p: q.fixed, q: y }); }
    else for (let x = 0; x < np; x++) for (let y = x; y < np; y++) if (ok(x) && ok(y)) out.push({ t: 'dom', p: x, q: y });
    return out; }
  const q = S.pend, out = [{ t: 'dom', no: 1 }], seen = {}, g = gateOf(q.o);
  for (const id of q.ids) { if (seen[id] || S.places.indexOf(id) >= 0) continue; seen[id] = 1; out.push({ t: 'dom', id: id, p: g }, { t: 'dom', id: id, p: g + 1 }); }
  return out;
}
function pendApply(S, a) {
  const q = S.pend, Q = S.P[q.o]; S.pend = null;
  if (q.k === 'congress') { if (S.ev) S.ev.push({ t: 'chose', k: q.k, o: q.o, p: a.no ? -1 : a.p, q: a.no ? -1 : a.q, c: q.c }); if (!a.no) congressDo(S, q.o, q.c, a.p, a.q); return; }
  if (q.k === 'scout') { let used = a.no ? 1 : 0; for (const id of q.ids) { if (!used && id === a.id) { used = 1; continue; } Q.dst.unshift(id); } }
  else if (q.k === 'survey') { if (!a.no) Q.dst.splice(Q.dst.indexOf(a.id), 1); dshuf(Q.dst, S.uid * 17 + S.round); }
  else if (q.k === 'rebuild') { if (!a.no) Q.dgone.splice(Q.dgone.indexOf(a.id), 1); }
  if (S.ev) S.ev.push({ t: 'chose', k: q.k, o: q.o, id: a.no ? null : a.id, p: a.no ? -1 : a.p, c: q.c });
  if (!a.no) { layDomain(S, a.p, a.id, q.o, q.c); if (S.st) S.st.use[q.k] = (S.st.use[q.k] || 0) + 1; }
}
// Congress of Vienna. Two dice, each naming a Domain counted along the line from the player's own Gate: 1 their Gate,
// 2 their Outpost, 3 the Crossroads, 4 the other player's Outpost, 5 the other player's Gate. The two Domains named
// change places. A 6 names any Domain the player chooses (a choice left open in S.pend). If both name the same
// Domain, it is discarded and replaced from the stack of the player whose banner is on it. The roll is in the
// event ({t: 'congress', o, c, dice: [a, b], p: [the position each die names, or -1 for a 6]}), so a table can
// throw the same dice. Boundary Stone: a Domain it protects does not move and is not replaced, so a roll that names
// one does nothing ({t: 'nothing', c, why: 'kudurru'}), and a 6 cannot name one.
function congressDo(S, o, ci, x, y) {
  const use = k => { if (S.st) S.st.use[k] = (S.st.use[k] || 0) + 1; };
  if (prot(S, x, o) || prot(S, y, o)) { if (S.ev) S.ev.push({ t: 'nothing', c: ci, why: 'kudurru' }); use('congress: nothing'); return; }
  if (x !== y) { const perm = S.places.map((_, i) => i); perm[x] = y; perm[y] = x; permute(S, perm, ci); use('congress: two Domains change places'); return; }
  const w = S.ban[x], id = canTurn(S, w) ? turnDomain(S, w) : null;
  if (id) { layDomain(S, x, id, w, ci); use('congress: a double, that Domain replaced'); } else { if (S.ev) S.ev.push({ t: 'nothing', c: ci, why: 'stack' }); use('congress: nothing'); }
}
function congress(S, o, ci, d1, d2) {
  const g = 2 * o, t = 2 * ((o + 1) % S.N), line = [g, g + 1, 2 * S.N, t + 1, t], n1 = d1 === 6 ? -1 : line[d1 - 1], n2 = d2 === 6 ? -1 : line[d2 - 1];
  if (S.ev) S.ev.push({ t: 'congress', o: o, c: ci, dice: [d1, d2], p: [n1, n2] });
  if (n1 >= 0 && n2 >= 0) return congressDo(S, o, ci, n1, n2);
  const fixed = n1 >= 0 ? n1 : n2;   // (-1: two sixes, the player names both)
  S.pend = { k: 'congress', o: o, ids: [], c: ci, fixed: fixed };
  if ((fixed >= 0 && prot(S, fixed, o)) || !pendActions(S).length) { S.pend = null; if (S.ev) S.ev.push({ t: 'nothing', c: ci, why: 'kudurru' }); if (S.st) S.st.use['congress: nothing'] = (S.st.use['congress: nothing'] || 0) + 1; return; }
  if (S.ev) S.ev.push({ t: 'choose', k: 'congress', o: o, ids: [], c: ci, fixed: fixed });
  if (S.st) S.st.use[fixed >= 0 ? 'congress: a six, one Domain chosen' : 'congress: two sixes, both chosen'] = (S.st.use[fixed >= 0 ? 'congress: a six, one Domain chosen' : 'congress: two sixes, both chosen'] || 0) + 1;
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
// How a robot lays its three Domains: what a Domain's rule is worth to it at [its Gate, its Outpost, as its offer for
// the Crossroads], in tenths of a point of win rate, beyond the Might its own Figures get there (home: how much the
// share of its Figures who are at home on the Domain counts at each). Only what two sets of test games agree on is
// in it (the prototype's table A4 in places/results.txt, and "rules" in domains.txt, which lay Domains with no
// choice): a road or a link at your own Gate lets the other player in, a market that pays Spark belongs at an
// Outpost, a closed Domain at your Gate, an arena not at the Crossroads.
// This is a forward lay: the Domain a robot's Figures are most at home on goes to its Outpost or is offered for the
// Crossroads. It is not the strongest lay. A robot that keeps that Domain at its own Gate, and never offers it, wins
// about 2 points more against a random lay (cfg.layv {"home": [1, 0.5, -1], ...}: domains.txt, "setup"), but every
// Gate is then better held, games end on Seals 29% of the time where they end 33% today, and the decks that win by
// raiding fall 3 to 4 points behind. The ready stacks are balanced for the forward lay, which keeps the game as it
// is. If the robots are ever taught the defensive lay, the ready stacks need another pass with it.
const LAYV = { home: [0.5, 1, 1], spark: [0, 0.35, 0], cheap: [-0.2, 0, 0.2], forge: [0.2, 0, 0.2], arms: [0.35, 0.4, 0], draw: [0.1, 0, 0], line: [0.15, 0.1, 0.4], facD: [0, 0, 0.2], fort: [-0.15, -0.2, -0.1], closed: [0.5, 0, -0.3], narrow: [0, -0.3, 0.4],
  crowd: [0.1, 0.2, 0], arena: [0, 0, -0.5], facA: [0.1, -0.4, 0.25], peace: [0, 0, 0], sanctuary: [0.2, 0, 0], facS: [0.15, 0, 0], link: [-0.3, 0, 0], road: [-0.5, -0.1, 0],
  // (the 75 powers, 2026-11-12: half of what domains.js "each" measured at a position, where it was 3 points or more
  // from the line, in domains.txt section 14. A power that reads level everywhere is 0: nothing to choose between)
  harbour: [0, 0, 0], toll: [-0.1, -0.15, 0.15], monopoly: [0, 0, 0], loan: [0, 0, -0.1], books: [-0.15, 0, 0], hire: [0, 0, 0], league: [0, 0.2, 0], fair: [0, 0.15, 0],
  facV: [0, 0, 0], print: [0, 0, -0.1], kiln: [0.2, -0.15, -0.1], strike: [0.2, 0, 0], ships: [0, 0, -0.1], stay: [0, 0, 0],
  clock: [0, 0, 0], recall: [0, 0, 0.2], study: [0, 0, 0], school: [0, 0, 0], equal: [0, 0.15, -0.1],
  maze: [0, -0.1, -0.1], siege: [0, -0.15, 0], citadel: [0, 0, 0], relief: [0, -0.15, -0.15], engines: [0, 0.15, 0], heartland: [-0.15, 0, 0], islets: [0, 0, 0], rock: [0.25, 0, -0.25],
  patron: [0, 0, 0], court: [0, 0, -0.1], pupils: [0, 0, 0], memorial: [0, 0.2, 0.15], facW: [0, 0, 0], gathering: [0, 0, 0], victor: [0, 0, 0], confederacy: [-0.1, 0, -0.2],
  punt: [0, 0, 0], rank: [0, 0, 0], ballcourt: [0, 0, 0], stool: [0, 0, 0], ancestors: [0, 0, 0],
  vote: [0.2, 0, -0.15], declare: [0, 0, 0.2], tribute: [0, 0, -0.1], code: [0.25, 0, -0.1], treeofpeace: [-0.25, 0, 0], throne: [0, 0, 0], treaty: [0, 0, 0], charter: [-0.15, -0.2, 0], wergild: [0, 0, -0.15],
  landing: [0, 0, -0.1], garrison: [0, 0, 0], relay: [0.15, 0, 0.15], canal: [0, 0, 0], port: [0, 0, 0.25], passage: [0, 0, 0], searoad: [0, 0, 0], flight: [0, 0, 0] };
// (a deck by what it is made of: the share of its Figures from each region, Voyagers apart, and of each faction)
function deckInfo(deck) { const reg = {}, fac = {}; let n = 0; for (const c of deck) { const x = CARDS[c]; if (!x || x.t !== 'fig') continue; n++; if (!x.k.voyager) reg[x.reg] = (reg[x.reg] || 0) + 1; fac[x.f] = (fac[x.f] || 0) + 1; } for (const k in reg) reg[k] /= n || 1; for (const k in fac) fac[k] /= n || 1; return { reg, fac }; }
// (tab: another table to try, for the test games: cfg.layv)
function layScore(id, slot, info, tab) { const pl = PLACES[id], w = pl.pw || '', T = tab || LAYV, hw = T.home || [1, 2, 2]; let v = (info.reg[pl.reg] || 0) * hw[slot]; if (w.slice(0, 3) === 'fac') v += (info.fac[w[3]] || 0) * hw[slot]; if (T[w]) v += T[w][slot]; return v; }
// A robot's choice at set-up: its three Domains to its Gate, its Outpost and its offer, by what suits its deck. A
// robot that judges unclearly (prof.noise: Easy and Normal) chooses that much less surely. No prof: the best lay.
function setupPick(S, o, prof, R) {
  const P = S.P[o], info = deckInfo(P.deck.concat(P.hand)); let best = null, bv = -1e9;
  for (const a of setupOptions(S, o)) { let v = layScore(a.gate, 0, info, S.cfg.layv) + layScore(a.out, 1, info, S.cfg.layv) + 0.5 * layScore(a.offer, 2, info, S.cfg.layv); if (prof && prof.noise && R) v += (R() - 0.5) * prof.noise * 0.6; if (v > bv) { bv = v; best = a; } }
  return best;
}
function setupAuto(S, R, profs) { for (let o = 0; o < S.N; o++) if (!S.su.lay[o]) setupLay(S, o, setupPick(S, o, profs && profs[o], R)); return setupRoll(S, R); }
function might(S, f, mode, oth) {
  const c = CARDS[f.c], k = !S.dm && c.k0 ? c.k0 : c.k, pl = PLACES[S.places[f.p]], w = pw(S, f.p), home = c.reg === pl.reg;   // (k0: a card whose skills changed with Domains keeps its old ones on the old map)
  let m = (w === 'equal' ? dv(S, 'equal') : c.m) + f.tb + (f.vic || 0);   // (Seneca Falls: every Figure there starts from 3. An Olympic victor keeps +1)
  if (home || (k.voyager && S.cfg.voyHome) || w === 'harbour') m += S.cfg.home + (k.homeDouble && home ? 2 : 0) + (w === 'heartland' && home ? dv(S, 'heartland') : 0);   // (Voyagers are at home everywhere, and everyone is at Malacca; Great Zimbabwe's own +2)
  let own = 0, opp = 0, insp = 0, isIns = false;
  for (const g of S.figs) {
    if (g.p === f.p) { if (g.o === f.o) { own++; if (g !== f && CARDS[g.c].k.inspiring) insp++; } else opp++; }
    if (g.li === f.u) isIns = true;
  }
  if (f.li) m += w === 'pupils' ? 2 : 1; if (isIns && S.cfg.insBonus) m += 1; m += Math.min(2, insp);   // (Vienna: +2 from a Legacy Line)
  if (k.uprising) m += own - 1; if (k.orator && own > opp) m += 2; if (k.underdog && opp > own) m += 2; if (k.monument) m += Math.min(2, f.stay); if (k.shoulders) m += Math.min(2, S.P[f.o].lines);
  if (w && w === FAC[c.f]) m += 1;   // (a theatre for Arts Figures, an observatory for Discovery, a capital for Statecraft, a forge for Valor, a wonder for Wonder)
  if (w === 'stay' && f.stay >= 1) m += dv(S, 'stay');   // (Benin City: a Figure that has stood there since the last count)
  else if (w === 'citadel' && ownerOfSpoke(S, f.p) === f.o) m += dv(S, 'citadel');   // (Citadelle Laferrière: its own side's Figures)
  else if (w === 'confederacy' && own >= 2) m += dv(S, 'confed');   // (Prophetstown: while another of its player's Figures is there too)
  if (mode === 1) { if (k.raider && enemySide(S, f.o, f.p)) m += 2; if (k.slayer && oth && CARDS[oth.c].m > c.m) m += 2; if (S.P[f.o].guide === 'suntzu' && !S.P[f.o].uC) m += 0.5; if (S.P[f.o].guide === 'joan' && behind(S, f.o)) m += 1;   // (Sun Tzu: your first clash each turn wins ties. Joan of Arc: +1 Might in a clash her Figures start while she is behind)
    if (w === 'relief') { const h = holder(S, f.p); if (h >= 0 && h !== f.o) m += dv(S, 'relief'); } }   // (Orléans: a Figure that starts a clash there while the other player holds it)
  if (mode === 2) { if (k.steadfast) m += 2; if (S.P[f.o].guide === 'gandhi' && ownerOfSpoke(S, f.p) === f.o) m += 1;   // (Gandhi: +1 Might when an enemy starts a clash at his own Gate or Outpost)
    if (w === 'fort') m += dv(S, 'fort'); else if (w === 'siege' && own < opp) m += dv(S, 'siege'); else if (w === 'engines') m += S.P[f.o].relics.length; }   // (the Great Wall; Gibraltar, while outnumbered there; Syracuse, for each Relic)
  return m;
}
function mights(S, i) { const m = S.pb[i].slice(); for (const f of S.figs) if (f.p === i) m[f.o] += might(S, f, 0); return m; }
function holderM(S, i, m) {
  const w = S.dm ? pw(S, i) : '';
  if (w === 'rank' || w === 'vote') {   // (Versailles: the costliest Figure there holds it. The Roman Forum: the most Figures. Level: Might decides)
    const sc = new Array(S.N).fill(0); for (const f of S.figs) if (f.p === i) sc[f.o] = w === 'vote' ? sc[f.o] + 1 : Math.max(sc[f.o], CARDS[f.c].c);
    let bx = 0, bw = -1, bn = 0; for (let o = 0; o < S.N; o++) { if (sc[o] > bx) { bx = sc[o]; bw = o; bn = 1; } else if (sc[o] === bx) bn++; }
    if (bx > 0 && bn === 1) return bw;
  }
  let mx = 0, who = -1, n = 0; for (let o = 0; o < S.N; o++) { if (m[o] > mx) { mx = m[o]; who = o; n = 1; } else if (m[o] === mx) n++; }
  if (mx > 0 && n === 1) return who;
  const tied = []; for (let o = 0; o < S.N; o++) if (m[o] === mx) tied.push(o);
  if (w === 'throne' && mx > 0 && S.lh) { const l = S.lh[S.places[i]]; if (l != null && tied.indexOf(l) >= 0) return l; }   // (Constantinople: a tie goes to whoever held it at the last count)
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
function draw(S, o, n) { const p = S.P[o]; for (let i = 0; i < n; i++) { if (!p.deck.length && p.gone && p.gone.length) { p.deck = p.gone; p.gone = []; for (let j = p.deck.length - 1; j > 0; j--) { const q = (j * 7 + S.round * 3 + i) % (j + 1), x = p.deck[j]; p.deck[j] = p.deck[q]; p.deck[q] = x; } } if (p.deck.length) { const dc = p.deck.pop(); p.hand.push(dc); if (S.st) S.st.seenC[o][dc] = 1; p.drawn = (p.drawn || 0) + 1; if (S.ev) S.ev.push({ t: 'draw', o: o }); } } }
// (Sigiriya: nothing comes there but a Figure played there or one walking a single step from next to it)
const rockAt = (S, i) => !!S.dm && pw(S, i) === 'rock';
function walkDests(S, f, free) {
  const c = CARDS[f.c]; if (c.k.monument) return [];
  const out = [], P = S.P[f.o], np = S.places.length, W = S.places.map((_, i) => pw(S, i));
  if (W[f.p] === 'islets') { const h = holder(S, f.p); if (h >= 0 && h !== f.o) return []; }   // (Nan Madol: the other player's Figures can't walk out while one player holds it)
  // where a Figure can walk in: a closed Domain (Machu Picchu) only on its own side; Sigiriya only one step from next
  // to it; Petra only by paying 1 Spark, for a player who doesn't hold it
  const ok = j => j !== f.p && !(W[j] === 'closed' && ownerOfSpoke(S, j) !== f.o) && room(S, j, f.o) && (W[j] !== 'rock' || S.adj[f.p].indexOf(j) >= 0) && (W[j] !== 'toll' || P.spark >= 1 || holder(S, j) === f.o);
  if (c.k.voyager && !free) { for (let i = 0; i < np; i++) if (ok(i)) out.push(i); return out; }
  const seen = {}; seen[f.p] = 1; let fr = [f.p];
  let steps = free ? 1 : Math.max(1 + nFx(S, P, 'compass'), P.guide === 'genghis' ? 2 : 1);   // (Genghis Khan: his Figures walk two steps, as with the Compass)
  if (!free && W[f.p] === 'searoad') steps = Math.max(steps, 2);   // (the Cape of Good Hope: a walk from there can be two steps)
  const all = S.places.map((_, i) => i), links = [], gather = [], canal = [], port = [], com = [], gate = gateOf(f.o);
  const mine = i => S.ban[i] === f.o;   // (the Domain has its walker's player's banner)
  W.forEach((w, i) => { if (w === 'link') links.push(i); else if (w === 'gathering') { if (mine(i)) gather.push(i); } else if (w === 'canal') { if (mine(i)) canal.push(i); } else if (w === 'port') port.push(i); if (S.dm && PLACES[S.places[i]].d === 'Commerce') com.push(i); });   // (Stonehenge and the Grand Canal: for the player whose banner is on them)
  // (where a walk can go next from a: the map's lines, the Silk Road, and the Routes and Culture Domains that open more ways)
  const next = a => { const w = W[a]; if (w === 'link' || w === 'flight') return all;   // (the Silk Road both ways; Kitty Hawk out to anywhere)
    let ns = S.adj[a].concat(links, gather);   // (Stonehenge: in from anywhere, for its banner's player)
    if (w === 'canal' && mine(a)) ns.push(gate); if (a === gate) ns = ns.concat(canal);   // (the Grand Canal: linked to the walker's own Gate)
    if (w === 'port') ns = ns.concat(com); if (port.length && com.indexOf(a) >= 0) ns = ns.concat(port);   // (Basra: linked to every Commerce Domain)
    if (w === 'passage') for (let q = 0; q < S.N; q++) if (q !== f.o) ns.push(2 * q + 1);   // (the Strait of Magellan: to the other player's Outpost)
    return ns; };
  for (let s = 0; s < steps; s++) { const nx = []; for (const a of fr) for (const b of next(a)) if (!seen[b]) { seen[b] = 1; nx.push(b); } fr = nx; }
  const fly = W[f.p] === 'flight';   // (Kitty Hawk: anywhere but the other player's Gate, unless that Gate is next to it anyway)
  for (const i in seen) { const j = +i; if (ok(j) && !(fly && isGate(S, j) && j !== gate && S.adj[f.p].indexOf(j) < 0)) out.push(j); }
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
  const c = CARDS[ci], P = S.P[o], wp = S.dm && place != null ? pw(S, place) : ''; let x = c.c;
  if (c.t === 'fig' && wp === 'code') x = dv(S, 'codeCap') ? Math.min(c.c, dv(S, 'codeCap')) : dv(S, 'code');   // (Babylon: every Figure played there costs 3, whatever its card says; anything that makes it cheaper still counts)
  if (c.t === 'fig') { if (wp === 'patron' && c.f === 'A') x -= 1;   // (the Sistine Chapel: Arts Figures played there)
    if (c.k.voyager && onTable(S, 'ships')) x -= nHeld(S, o, 'ships');   // (the Treasure Shipyard: Voyagers, for its holder)
    if (c.insp && S.figs.some(f => f.o === o && c.insp.indexOf(f.c) >= 0 && (place == null || near(S, place, f.p)))) x -= S.cfg.disc; else if (S.cfg.threads !== 2 && threadSrc(S, o, ci, place)) x -= S.cfg.disc; if (place != null && pw(S, place) === 'cheap' && !(S.dm && ((P.uCh || 0) >> place) & 1)) x -= 1;   // (a market: with Domains, the first Figure a player lays there each turn)
    if (S.cfg.ret && P.gone && P.gone.indexOf(ci) >= 0) { x -= S.cfg.ret; if (S.st && place != null) S.st.retSeen = 1; } }   // (the return: their other copy lies in your discard pile)
  if (c.t !== 'fig' && S.cfg.threads !== 2 && threadSrc(S, o, ci)) x -= S.cfg.disc;   // (threads 2: Renown only; 3: the discount only)
  if (c.t === 'relic' && P.guide === 'leonardo') x -= 1;
  if (c.t !== 'fig' && S.dm && S.places.some(id => PLACES[id].pw === 'forge')) x -= nHeld(S, o, 'forge');   // (a workshop: whoever holds it pays 1 less for Relics and Deeds)
  if (P.guide === 'curie' && P.uN === 2) x -= 1;   // (Curie: the third card you play each turn costs 1 less)
  if (c.t === 'fig' && P.guide === 'sorjuana' && c.k.scholar) x -= 1;   // (Sor Juana: her Scholar Figures cost 1 less)
  if (c.t === 'deed') { if (P.guide === 'franklin' && !P.uD) x -= 1;   // (Franklin: the first Deed each turn costs 1 less)
    if (S.figs.some(f => f.o === o && CARDS[f.c].k.deedsLess)) x -= 1; }
  return Math.max(0, x);
}
function ko(S, f, by) {
  const w = S.dm ? pw(S, f.p) : '', g0 = gateOf(f.o);
  // (Runnymede: a Figure that loses a clash there goes back to its player's Gate, if that Gate has room. One already at its own Gate is knocked out)
  if (by && w === 'charter' && f.p !== g0 && room(S, g0, f.o) && !rockAt(S, g0)) {
    if (S.ev) S.ev.push({ t: 'fallback', u: f.u, c: f.c, o: f.o, from: f.p, to: g0, by: by.u, why: 'charter' });
    f.p = g0; f.stay = 0; f.rdy = 0; f.tb = 0; f.gar = 0; if (S.st) S.st.fallbacks = (S.st.fallbacks || 0) + 1; return; }
  // (Mandela: once a round, a Figure of his that is defeated on the other player's side goes back to his Gate instead of leaving the table)
  if (S.P[f.o].guide === 'mandela' && !S.P[f.o].uM && enemySide(S, f.o, f.p) && room(S, gateOf(f.o), f.o)) {
    S.P[f.o].uM = 1; if (S.ev) S.ev.push({ t: 'fallback', u: f.u, c: f.c, o: f.o, from: f.p, to: gateOf(f.o), by: by ? by.u : 0 });
    f.p = gateOf(f.o); f.stay = 0; f.rdy = 0; f.tb = 0; if (S.st) S.st.fallbacks = (S.st.fallbacks || 0) + 1; return; }
  if (S.ev) S.ev.push(w === 'ancestors' ? { t: 'ko', u: f.u, c: f.c, o: f.o, p: f.p, by: by ? by.u : 0, top: 1 } : { t: 'ko', u: f.u, c: f.c, o: f.o, p: f.p, by: by ? by.u : 0 });
  if (w === 'wergild') { S.P[f.o].sb += 1; if (S.ev) S.ev.push({ t: 'spark', o: f.o, n: 1, why: 'next', w: w, p: f.p }); }   // (Winchester: its player gets 1 more Spark next turn)
  // (Shakespeare: the first time each round that a Figure of his is defeated at the Crossroads, he scores 1 Renown)
  { const Q = S.P[f.o]; if (Q.guide === 'shakespeare' && !Q.uW && f.p === 2 * S.N) { Q.uW = 1; Q.renown += 1; if (S.ev) S.ev.push({ t: 'renown', o: f.o, n: 1, why: 'tragedy' }); if (S.st) S.st.tragedies = (S.st.tragedies || 0) + 1; } }
  S.figs.splice(S.figs.indexOf(f), 1); if (S.dm && CARDS[f.c].k.cynic) S.cyn--;
  if (w === 'ancestors') S.P[f.o].deck.push(f.c);   // (Rapa Nui: on top of its player's deck, not into the discard pile)
  else (S.P[f.o].gone || (S.P[f.o].gone = [])).push(f.c);
  for (const g of S.figs) if (g.li === f.u) { g.li = 0; S.P[g.o].lines--; }
  if (f.li) S.P[f.o].lines--;
  if (S.st) { S.st.ko++; if (by) { const a = CARDS[by.c], b = CARDS[f.c]; if (a.m < b.m) S.st.upsets++; S.st.ev.push([by.c, f.c, S.places[f.p]]); } }
}
// x: the player takes up a "you may" that needs no choosing (Constantine, William the Conqueror)
function arrive(S, f, x) {
  const c = CARDS[f.c], o = f.o, P = S.P[o];
  if (c.k.scholar) draw(S, o, 1);
  if (S.dm && pw(S, f.p) === 'arms') { f.tb += 1; f.ta = 1; }   // (an armoury: +1 Might on the turn a Figure arrives. ta: how much of tb it is)
  if (S.dm && pw(S, f.p) === 'school' && !P.uPd) { P.uPd = 1; if (S.ev) S.ev.push({ t: 'dpow', w: 'school', o: o, p: f.p }); draw(S, o, 1); }   // (Padua: the first Figure you play there each turn draws you a card)
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
  const at = a.p, w = pw(S, at), arena = w === 'arena';   // (as the Colosseum is: winning a clash there scores 1 Renown. The event still says 'colosseum'.)
  const ar = A.renown, dr = D.renown, maze = am === dm && w === 'maze';   // (Himeji Castle: a tie knocks out the Figure that started the clash)
  if (S.dm && (am > dm || dm > am || maze)) { const win = am > dm ? a : d, wo = win.o;   // (what the Domain gives the winner)
    if (w === 'ballcourt' && Math.abs(am - dm) >= 3) { S.P[wo].renown += dv(S, 'ballcourt'); if (S.ev) S.ev.push({ t: 'renown', o: wo, n: dv(S, 'ballcourt'), why: 'ballcourt', p: at, u: win.u }); }   // (Chichén Itzá: a win by 3 or more)
    if (w === 'victor' && !win.vic) { win.vic = 1; if (S.ev) S.ev.push({ t: 'victor', u: win.u, o: wo, p: at }); } }   // (Olympia: the winner keeps +1 Might)
  if (am > dm) { ko(S, d, a); if (A.guide === 'saladin' && !A.uR) { A.uR = 1; A.spark += 1; if (S.ev) S.ev.push({ t: 'spark', o: a.o, n: 1, why: 'ransom' }); } if (arena) { A.renown++; if (S.ev) S.ev.push({ t: 'renown', o: a.o, n: 1, why: 'colosseum' }); } if (S.cfg.bounty && dr > ar) { A.renown += S.cfg.bounty; if (S.ev) S.ev.push({ t: 'renown', o: a.o, n: S.cfg.bounty, why: 'bounty' }); } } else if (dm > am || maze) { ko(S, a, d); if (arena) { D.renown++; if (S.ev) S.ev.push({ t: 'renown', o: d.o, n: 1, why: 'colosseum' }); } if (S.cfg.bounty && ar > dr) { D.renown += S.cfg.bounty; if (S.ev) S.ev.push({ t: 'renown', o: d.o, n: S.cfg.bounty, why: 'bounty' }); } }
}
function byU(S, u) { for (const f of S.figs) if (f.u === u) return f; return null; }
// Every legal thing the player whose turn it is can do next
function actions(S) {
  if (S.pend) return pendActions(S);
  const o = S.turn, P = S.P[o], out = [], mine = S.figs.filter(f => f.o === o), theirs = S.figs.filter(f => f.o !== o), np = S.places.length;
  const deploy = []; for (let i = 0; i < np; i++) if (room(S, i, o) && (i === gateOf(o) || cnt(S, i, o) > 0 || (S.dm && pw(S, i) === 'landing' && S.ban[i] === o && ownerOfSpoke(S, i) !== o))) deploy.push(i);   // (L'Anse aux Meadows: its banner's player can play Figures there when it lies off their own side)
  const rk = i => rockAt(S, i);   // (Sigiriya: no jumping in)
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
    else if (fx === 'fairwinds') { for (const f of mine) if (!CARDS[f.c].k.monument) for (let i = 0; i < np; i++) if (i !== f.p && room(S, i, o) && !rk(i)) out.push({ t: 'deed', h, u: f.u, p: i }); }
    else if (fx === 'ambush') { for (const f of mine) for (const g of theirs) if (g.p === f.p && open(g) && !CARDS[g.c].k.untouchable && !peace(S, f.p, o)) out.push({ t: 'deed', h, u: f.u, v: g.u }); }
    else if (fx === 'trojan') { P.hand.forEach((cj, h2) => { if (h2 !== h && CARDS[cj].t === 'fig' && CARDS[cj].c <= 3) for (let i = 0; i < np; i++) if (room(S, i, o)) out.push({ t: 'deed', h, h2, p: i }); }); }
    else if (fx === 'rift') { for (const f of mine) for (const g of S.figs) if (g.p !== f.p && g.u !== f.u && !rk(f.p) && !rk(g.p) && !CARDS[f.c].k.monument && !CARDS[g.c].k.monument && (g.o === o ? g.u > f.u : open(g)) && (g.o === o || (room(S, g.p, o) && room(S, f.p, g.o)))) out.push({ t: 'deed', h, u: f.u, v: g.u }); }
    else if (S.dm) {   // (the Deeds that act on Domains: a.p, a.q are positions)
      if (fx === 'earthquake') { for (let i = 0; i < 2 * S.N; i++) if (!prot(S, i, o) && canTurn(S, i >> 1)) out.push({ t: 'deed', h, p: i }); }
      else if (fx === 'vesuvius') { for (let i = 0; i < np; i++) if (!S.mk[i] && !prot(S, i, o)) out.push({ t: 'deed', h, p: i }); }
      else if (fx === 'caperoute') { if (canTurn(S, o)) out.push({ t: 'deed', h }); }
      else if (fx === 'breda') { for (let i = 0; i < np; i++) for (let j = 0; j < np; j++) if (j !== i && !prot(S, i, o) && !prot(S, j, o)) out.push({ t: 'deed', h, p: i, q: j }); }   // (both orders, so a player can tap either Domain first)
      else if (fx === 'congress') { if (S.N === 2) out.push({ t: 'deed', h }); }
      else if (fx === 'columbian') { let ok = S.N === 2; for (let i = 0; i < 2 * S.N; i++) if (prot(S, i, o)) ok = false; if (ok) out.push({ t: 'deed', h }); }
    }
  });
  const ph = quicks(P).filter(h => costOf(S, o, P.hand[h]) <= P.spark);   // (a.ph: a Quick Deed goes with the clash; a.hq: which one, by its place in the hand)
  for (const f of mine) {
    const can = f.rdy && (!f.arr || CARDS[f.c].k.swift || f.sw), canClash = can || (S.cfg.rush && f.arr && !f.acted) || (f.gar && !f.acted);   // (gar: it walked into Dunhuang this turn)
    if (can) for (const i of walkDests(S, f)) out.push({ t: 'walk', u: f.u, p: i });
    if (canClash) {
      const en = theirs.filter(g => g.p === f.p);
      if (en.length && !en.some(g => CARDS[g.c].k.law) && !peace(S, f.p, o)) {
        const gd = en.filter(g => CARDS[g.c].k.guard);
        for (const g of (gd.length ? gd : en)) if (!CARDS[g.c].k.untouchable) { out.push({ t: 'clash', u: f.u, v: g.u }); for (const hq of ph) out.push({ t: 'clash', u: f.u, v: g.u, ph: 1, hq: hq }); }
      }
    }
    if ((P.uA || 0) < nFx(S, P, 'antikythera') && !CARDS[f.c].k.monument) for (let i = 0; i < np; i++) if (i !== f.p && room(S, i, o) && !rk(i)) out.push({ t: 'antik', u: f.u, p: i });
    if (P.guide === 'tubman' && !P.uT && !f.arr) for (const i of walkDests(S, f, true)) out.push({ t: 'tub', u: f.u, p: i });
  }
  // The four Domain powers a player chooses to use, each once a turn (the page's buttons are in scanActs, ui.js):
  //   {t: 'loan', p}   Florence: its holder borrows 2 Spark now, and starts their next turn with 2 Spark less
  //   {t: 'buy', p}    Timbuktu: its holder pays 1 Spark to draw a card
  //   {t: 'hire', p}   Carthage: a player with a Figure there pays 1 Spark to count 2 more Might there until the round ends
  //   {t: 'relay', u, v}   the Qhapaq Ñan: your Figure u standing there and your Figure v anywhere else change places
  // p: the position of the Domain. None of them is a walk, so it uses no Figure's walk.
  if (S.dm) for (let i = 0; i < np; i++) { const w = pw(S, i);
    if (w === 'loan') { if (!P.uL && holder(S, i) === o) out.push({ t: 'loan', p: i }); }
    else if (w === 'books') { if (!P.uB && P.spark >= 1 && (P.deck.length || (P.gone && P.gone.length)) && holder(S, i) === o) out.push({ t: 'buy', p: i }); }
    else if (w === 'hire') { if (!P.uH && P.spark >= 1 && cnt(S, i, o) > 0) out.push({ t: 'hire', p: i }); }
    else if (w === 'relay' && !P.uRl) { for (const f of mine) if (f.p === i && !CARDS[f.c].k.monument) for (const g of mine) if (g.p !== i && !CARDS[g.c].k.monument && !rk(g.p)) out.push({ t: 'relay', u: f.u, v: g.u }); }
  }
  return out;
}
function moveFig(S, f, to, jump, relay) { if (S.ev) S.ev.push(relay ? { t: 'move', u: f.u, from: f.p, to: to, jump: 1, relay: 1 } : { t: 'move', u: f.u, from: f.p, to: to, jump: jump ? 1 : 0 }); f.p = to; f.stay = 0; if (f.gar) f.gar = 0; if (S.st) { if (jump) S.st.jump++; else S.st.walk++; } }
// A walk into a Domain: Petra takes 1 Spark from a player who doesn't hold it (to the bank); Dunhuang lets the Figure still clash this turn
function walked(S, o, f, to, far) {
  const P = S.P[o], w = S.dm ? pw(S, to) : '';
  if (w === 'toll' && holder(S, to) !== o) { P.spark -= 1; if (S.ev) S.ev.push({ t: 'toll', o: o, p: to, n: 1 }); }
  moveFig(S, f, to, far); if (w === 'garrison' && S.ban[to] === o) f.gar = 1;   // (Dunhuang, for the player whose banner is on it)
}
// Gutenberg's Workshop: its holder draws a card the first time each turn they play a Relic or a Deed (h: they held it as they played)
function printed(S, o, h) { const P = S.P[o]; if (!h || P.uP) return; P.uP = 1; if (S.ev) S.ev.push({ t: 'dpow', w: 'print', o: o, p: posOf(S, 'print') }); draw(S, o, 1); }
function apply(S, a, da, dd, raw) {
  const o = S.turn, P = S.P[o];
  if (a.t === 'dom') { pendApply(S, a); return; }
  if (a.t === 'loan') { const n = dv(S, 'loan'); P.spark += n; P.debt = (P.debt || 0) + n; P.uL = 1; if (S.ev) S.ev.push({ t: 'loan', o: o, p: a.p, n: n }); if (S.st) S.st.use.loan = (S.st.use.loan || 0) + 1; return; }
  if (a.t === 'buy') { P.spark -= 1; P.uB = 1; if (S.ev) S.ev.push({ t: 'buy', o: o, p: a.p }); draw(S, o, 1); if (S.st) S.st.use.buy = (S.st.use.buy || 0) + 1; return; }
  if (a.t === 'hire') { const n = dv(S, 'hire'); P.spark -= 1; P.uH = 1; S.pb[a.p][o] += n; if (S.ev) S.ev.push({ t: 'hire', o: o, p: a.p, n: n }); if (S.st) S.st.use.hire = (S.st.use.hire || 0) + 1; return; }
  if (a.t === 'relay') { const f = byU(S, a.u), g = byU(S, a.v), t = f.p; P.uRl = 1; if (S.ev) S.ev.push({ t: 'relay', o: o, u: f.u, v: g.u, p: f.p, q: g.p }); moveFig(S, f, g.p, true, 1); moveFig(S, g, t, true, 1); if (S.st) S.st.use.relay = (S.st.use.relay || 0) + 1; return; }
  const prt = S.dm && (a.t === 'relic' || a.t === 'deed' || (a.t === 'clash' && a.ph)) && !P.uP && onTable(S, 'print') ? nHeld(S, o, 'print') : 0;
  if (a.t === 'fig') { const ci = P.hand[a.h]; P.spark -= costOf(S, o, ci, a.p); if (S.dm && pw(S, a.p) === 'cheap') P.uCh = (P.uCh || 0) | (1 << a.p); P.uN++; P.hand.splice(a.h, 1); putFig(S, o, ci, a.p, a.x); }
  else if (a.t === 'relic') { const ci = P.hand[a.h], src = threadSrc(S, o, ci), pt = S.dm && onTable(S, 'punt') ? posOf(S, 'punt') : -1, punt = pt >= 0 && holder(S, pt) === o; P.spark -= costOf(S, o, ci); P.uN++; P.hand.splice(a.h, 1); P.relics.push(ci); if (S.ev) S.ev.push({ t: 'relic', o: o, c: ci }); threadPlay(S, o, ci, src); if (S.st) S.st.played[o][ci] = 1; if (S.figs.some(f => f.o === o && CARDS[f.c].k.eureka)) draw(S, o, 1);
    if (punt) { P.renown += dv(S, 'punt'); if (S.ev) S.ev.push({ t: 'renown', o: o, n: dv(S, 'punt'), why: 'punt', p: pt }); }   // (Deir el-Bahari: its holder scores for each Relic they play)
    printed(S, o, prt); }
  else if (a.t === 'walk') { const f = byU(S, a.u); const far = S.adj[f.p].indexOf(a.p) < 0; walked(S, o, f, a.p, far); f.rdy = 0; }
  else if (a.t === 'antik') { const f = byU(S, a.u); moveFig(S, f, a.p, true); f.rdy = 0; P.uA = (P.uA || 0) + 1; }
  else if (a.t === 'tub') { walked(S, o, byU(S, a.u), a.p, false); P.uT = 1; }
  else if (a.t === 'clash') { const f = byU(S, a.u), g = byU(S, a.v); if (a.ph) { const h = a.hq != null && fxOf(P.hand[a.hq]) === 'phalanx' ? a.hq : quicks(P)[0], qc = P.hand[h], tsrc = threadSrc(S, o, qc); P.spark -= costOf(S, o, qc); P.uN++; P.hand.splice(h, 1); P.uD = 1; f.tb += 2; f.tq = qc; if (S.st) S.st.played[o][qc] = 1; if (S.ev) S.ev.push({ t: 'quick', o: o, c: qc, u: f.u, att: 1 }); threadPlay(S, o, qc, tsrc); printed(S, o, prt); } clash(S, f, g, da, dd, 0, raw); }
  else if (a.t === 'deed') {
    const ci = P.hand[a.h], fx = fxOf(ci), tsrc = threadSrc(S, o, ci); P.spark -= costOf(S, o, ci); P.uN++; P.uD = 1; if (S.st) S.st.played[o][ci] = 1; if (S.ev) S.ev.push({ t: 'deed', o: o, c: ci, p: a.p, u: a.u, v: a.v }); threadPlay(S, o, ci, tsrc); printed(S, o, prt);
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
      // (Congress of Vienna: the two dice are the clash dice the caller rolled, raw.ra and raw.rd, as they fell; a caller that hands in none gets a roll made from the state)
      else if (fx === 'congress') { const die = (v, k) => (v >= 1 && v <= 6 && v === (v | 0) ? v : 1 + dshuf([0, 1, 2, 3, 4, 5], S.uid * 53 + S.round * 7 + k)[0]); congress(S, o, ci, die(raw && raw.ra, 1), die(raw && raw.rd, 32)); }
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
    if (S.dm && rw) v += domWorth(S, i, rw, h, me);
  }
  if (S.dm) { v -= DEBT_W * (P.debt || 0); for (let o = 0; o < N; o++) v += (o === me ? 1 : -1 / (N - 1)) * SPARK_W * (S.P[o].sb || 0); }   // (Florence's debt; Spark a Domain has given for the next turn)
  for (const f of S.figs) { const m = might(S, f, 0); if (f.o === me) { cm++; tm += m; } else { co++; to += m; } }
  v += prof.wFig * (cm - co / (N - 1)) + 0.08 * (tm - to / (N - 1));
  v += 0.35 * Math.min(1, left / 3) * P.hand.length + prof.wLine * P.lines + 0.02 * P.spark;
  for (let o = 0; o < N; o++) if (atCourt(S, o)) v += (o === me ? 1 : -1) * COURT_W * prof.wRen;   // (Akbar's court, as it stands)
  for (const r of P.relics) { const fx = fxOf(r); v += (fx === 'press' ? 0.5 : fx === 'antikythera' ? 0.4 : 0.2) * (left - 1); }
  return v;
}
// What a Domain's power is worth to the robots as they judge the table, on top of the Renown it scores, for the power
// that pays its holder or the players there later (they look one move ahead, so what comes at the count, next turn
// or next round has to be counted here or they misplay it). In the units evalS uses: 1 Renown is about 1.
const SPARK_W = 0.5, DEBT_W = 0.55;   // (a Spark next turn; a Spark of Florence's debt)
function domWorth(S, i, w, h, me) {
  const s = h === me ? 1 : h >= 0 ? -1 : 0, Q = h >= 0 ? S.P[h] : null, N = S.N, here = o => cnt(S, i, o) > 0;
  switch (w) {
    case 'draw': return 0.5 * s;
    case 'spark': return 0.6 * s;
    case 'forge': return 0.3 * s;
    case 'print': case 'punt': case 'books': return 0.3 * s;
    case 'ships': return 0.2 * s;
    case 'loan': return 0.2 * s;
    case 'recall': return Q && Q.gone && Q.gone.length ? 0.4 * s : 0;
    case 'kiln': return Q ? 0.5 * s * Q.relics.length : 0;
    case 'strike': return Q && !Q.lau ? 1.5 * s : 0;   // (Laurion: 3 Spark, once for each player)
    case 'stool': return Q && !Q.ks && Q.seals > 0 && Q.seals < S.cfg.seals ? 2.5 * s : 0;   // (Kumasi: a Seal mended, once)
    case 'clock': return 0.5 * s;   // (Greenwich: the last turn of the next round)
    case 'memorial': return 0.6 * s;   // (the Taj Mahal: held again at the next count, it scores 1 more)
    case 'throne': return 0.2 * s;
    case 'league': { if (!Q) return 0; let n = 0; for (let k = 0; k < S.places.length; k++) if (PLACES[S.places[k]].d === 'Commerce' && holder(S, k) === h) n++; return 0.5 * s * n; }
    case 'tribute': { if (!Q) return 0; for (let q = 0; q < N; q++) if (q !== h && here(q)) return 1 * s; return 0; }
    case 'monopoly': { let one = -1, n = 0; for (let o = 0; o < N; o++) if (here(o)) { one = o; n++; } return n === 1 ? (one === me ? 1 : -1) * 1.0 : 0; }
    case 'fair': { let v = 0; for (let o = 0; o < N; o++) if (here(o)) v += (o === me ? 0.5 : -0.5 / (N - 1)); return v; }
    case 'study': { let v = 0; for (let o = 0; o < N; o++) if (here(o)) v += (o === me ? 0.45 : -0.45 / (N - 1)); return v; }
  }
  return 0;
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
  // (Florence's loan is worth only what it lets the robot play now that it couldn't before, less the debt: it looks one play further)
  if (a.t === 'loan') { const T = clone(S); apply(T, a, 0, 0); let best = evalS(T, me, prof); const sp = S.P[me].spark;
    for (const b of actions(T)) if ((b.t === 'fig' || b.t === 'relic' || b.t === 'deed') && costOf(T, me, T.P[me].hand[b.h], b.t === 'fig' ? b.p : undefined) > sp) { const v = valueOf(T, b, me, prof); if (v > best) best = v; }
    return best; }
  const roll = a.t === 'clash' || (a.t === 'deed' && fxOf(S.P[me].hand[a.h]) === 'ambush');
  if (!roll && S.dm && a.t === 'deed' && fxOf(S.P[me].hand[a.h]) === 'congress') {   // (Congress of Vienna: the average over the 36 ways two dice fall)
    let s = 0; for (let d1 = 1; d1 <= 6; d1++) for (let d2 = d1; d2 <= 6; d2++) { const T = clone(S); if (d1 === d2) mix(T, d1); apply(T, a, 0, 0, { ra: d1, rd: d2 }); if (T.pend) settle(T, prof); s += (d1 === d2 ? 1 : 2) * evalS(T, me, prof); }
    return s / 36; }
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
// Who goes first this round: the leader (so whoever is behind has the last word); level, take turns. With Domains,
// whoever held Greenwich at the last count goes last.
function firstOf(S) {
  const N = S.N; if (S.dm && S.gw >= 0) return (S.gw + 1) % N;   // (Greenwich: whoever held it at the last count takes the last turn)
  if (S.cfg.order !== 'trail') return S.cfg.order === 'alt' ? (S.round - 1) % N : 0;
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
  P.uA = P.uT = P.uD = P.uC = P.uN = P.uR = 0; if (S.dm) { P.uCh = 0; P.uL = P.uB = P.uH = P.uRl = P.uP = P.uPd = 0; }
  let held = 0; if (cfg.spark !== 'round') for (let i = 0; i < S.places.length; i++) if (holder(S, i) === o) held++;
  // (Mansa Musa: up to 2 Spark he did not spend, his reserve, are his again. Empress Wu: 1 more for the Places she held, P.sg)
  const kept = P.guide === 'mansamusa' ? P.reserve : 0;
  P.spark = (cfg.spark === 'round' ? Math.min(S.round + 1, cfg.sparkCap || 99) : cfg.spark === 'hold' ? 2 + held : S.round + (held >= 3 ? 1 : 0)) + P.sb + (P.sg || 0) + kept; P.sb = 0; P.sg = 0; P.reserve = 0;
  if (cfg.catchup) { let mn = 1e9; for (let q = 0; q < S.N; q++) if (q !== o && S.P[q].renown < mn) mn = S.P[q].renown; if (P.renown < mn) { P.spark += 1; if (cfg.catchup === 2) draw(S, o, 1); if (cfg.catchup === 3 && mn - P.renown >= (cfg.far || 4)) P.spark += 1; } }
  const debt = P.debt || 0; if (debt) { P.spark = Math.max(0, P.spark - debt); P.debt = 0; }   // (Florence: what was borrowed last turn is paid back)
  if (P.spark < 0) P.spark = 0;   // (Persepolis's tribute never takes a player below nothing)
  if (S.ev) { S.ev.push({ t: 'turn', o: o, spark: P.spark - kept, round: S.round }); if (kept) S.ev.push({ t: 'spark', o: o, n: kept, why: 'kept' }); if (debt) S.ev.push({ t: 'debt', o: o, n: debt }); }
  draw(S, o, 1 + nFx(S, P, 'press') + (cfg.draw2 ? 1 : 0));
  if (P.guide === 'franklin' && P.hand.length <= 4) draw(S, o, 1);   // (Franklin: a thin hand draws one more)
}
function endTurn(S) {
  if (S.pend) pendApply(S, { t: 'dom', no: 1 });   // (a choice of Domain left open is a no)
  const P = S.P[S.turn]; P.reserve = Math.min(2, P.spark); P.spark = 0; P.uN = 9; for (const f of S.figs) { f.tb = 0; if (f.ta) f.ta = 0; if (f.gar) f.gar = 0; }   // (uN 9: Curie's cheaper second card is for her own turn only)
  if (S.cfg.handMax) while (P.hand.length > S.cfg.handMax) { let hi = 0; for (let i = 1; i < P.hand.length; i++) if (CARDS[P.hand[i]].c > CARDS[P.hand[hi]].c) hi = i; discard(S, S.turn, hi); }   // (over the hand limit: the dearest cards go; a screen asks the player first)
}
// Tordesillas: the players tied on Might there, when every one of them has a Figure there (null: no such tie)
function treatyTie(S, i) {
  const m = mights(S, i), mx = Math.max.apply(null, m); if (!(mx > 0)) return null;
  const tied = []; for (let o = 0; o < S.N; o++) if (m[o] === mx) tied.push(o);
  return tied.length >= 2 && tied.every(o => cnt(S, i, o) > 0) ? tied : null;
}
function endRound(S) {
  const cfg = S.cfg, N = S.N, np = S.places.length; let last = S.round === cfg.rounds;
  // (who holds each Domain as the round ends, its power and what it scores, all read before anything is scored: so
  // Independence Hall sees who is behind as the count begins)
  const hs = [], ws = [], vs = []; for (let i = 0; i < np; i++) { hs[i] = holder(S, i); ws[i] = pw(S, i); vs[i] = hs[i] >= 0 ? rv(S, i, hs[i]) * stake(cfg, S.round) : 0; }
  // (Spark a Domain gives for the player's next turn: a token beside their Spark on a real table)
  const pay = (o, n, w, i) => { if (!n) return; S.P[o].sb += n; if (S.ev && S.dm) S.ev.push({ t: 'spark', o: o, n: n, why: 'next', w: w, p: i }); };
  for (let i = 0; i < np; i++) {
    const h = hs[i], w = ws[i], tie = w === 'treaty' ? treatyTie(S, i) : null;
    if (tie) for (const o of tie) { S.P[o].renown += 1; if (S.ev) S.ev.push({ t: 'renown', o: o, n: 1, why: 'treaty', p: i }); }   // (Tordesillas: a tie with both there scores 1 for each, in place of holding it)
    if (h < 0) continue; const P = S.P[h], val = vs[i];
    if (!tie) { if (cfg.scoring === 'round') P.renown += val; else if (last) P.renown += 3 * val;
      if (S.ev) S.ev.push({ t: 'hold', p: i, o: h, n: val }); }
    if (w === 'draw') { if (S.ev && S.dm) S.ev.push({ t: 'dpow', w: w, o: h, p: i }); draw(S, h, 1); } if (w === 'spark') pay(h, 1, w, i);   // (a rule that pays at the end of the round pays for the Domain lying there now)
    if (isGate(S, i) && (i >> 1) !== h && S.P[i >> 1].seals > 0) { S.P[i >> 1].seals--; P.broke++; P.renown += cfg.sealRen; if (S.st) S.st.sealBreaks++; if (S.ev) S.ev.push({ t: 'seal', o: i >> 1, by: h, left: S.P[i >> 1].seals }); }
  }
  // (what the other Domains give as the round ends, each for the Domain lying there now)
  if (S.dm) {
    for (let i = 0; i < np; i++) { const w = ws[i], h = hs[i]; if (!w) continue;
      if (w === 'monopoly') { const pr = []; for (let o = 0; o < N; o++) if (cnt(S, i, o)) pr.push(o); if (pr.length === 1) pay(pr[0], dv(S, 'monopoly'), w, i); }   // (Lisbon, at the Crossroads: the only player with Figures there)
      else if (w === 'fair') { for (let o = 0; o < N; o++) if (cnt(S, i, o)) pay(o, 1, w, i); }   // (Djenné: everyone who has a Figure there)
      else if (w === 'study') { for (let o = 0; o < N; o++) if (cnt(S, i, o)) { if (S.ev) S.ev.push({ t: 'dpow', w: w, o: o, p: i }); draw(S, o, 1); } }   // (Nalanda: everyone who has a Figure there draws)
      else if (h < 0) continue;
      else if (w === 'league') { let n = 0; for (let k = 0; k < np; k++) if (hs[k] === h && PLACES[S.places[k]].d === 'Commerce') n++; pay(h, n, w, i); }   // (Venice: 1 for each Commerce Domain its holder holds)
      else if (w === 'kiln') pay(h, dv(S, 'kiln') * S.P[h].relics.length, w, i);   // (Jingdezhen: 1 for each Relic its holder has)
      else if (w === 'strike') { if (!S.P[h].lau) { S.P[h].lau = 1; pay(h, dv(S, 'strike'), w, i); } }   // (Laurion: once a game for each player)
      else if (w === 'recall') { const Q = S.P[h]; if (Q.gone && Q.gone.length) { const c = Q.gone.pop(); Q.hand.push(c); if (S.ev) S.ev.push({ t: 'recall', o: h, c: c, p: i }); } }   // (the House of Wisdom: the top card of the discard pile back into the hand)
      else if (w === 'tribute') { for (let q = 0; q < N; q++) if (q !== h && cnt(S, i, q)) { pay(h, dv(S, 'tribute'), w, i); pay(q, -dv(S, 'tribute'), w, i); } }   // (Persepolis: from a player who has Figures there and doesn't hold it)
      else if (w === 'stool') { const Q = S.P[h]; if (!Q.ks && Q.seals > 0 && Q.seals < cfg.seals) { Q.seals++; Q.ks = 1; if (S.ev) S.ev.push({ t: 'mend', o: h, left: Q.seals, why: w, p: i }); } }   // (Kumasi: once a game for each player, after any Seal breaks)
    }
    S.gw = -1; for (let i = 0; i < np; i++) if (ws[i] === 'clock' && hs[i] >= 0) { S.gw = hs[i]; if (S.ev) S.ev.push({ t: 'dpow', w: 'clock', o: hs[i], p: i }); }   // (Greenwich: its holder takes the last turn of the next round)
    S.lh = {}; for (let i = 0; i < np; i++) if (hs[i] >= 0) S.lh[S.places[i]] = hs[i];   // (who held each Domain at this count: the Taj Mahal and Constantinople ask)
  }
  if (cfg.majority) { const hc = new Array(N).fill(0); for (let i = 0; i < S.places.length; i++) { const h = holder(S, i); if (h >= 0) hc[h]++; } let mx = 0, w = -1, tie = false; for (let o = 0; o < N; o++) { if (hc[o] > mx) { mx = hc[o]; w = o; tie = false; } else if (hc[o] === mx) tie = true; } if (!tie && w >= 0) S.P[w].renown += cfg.majority * stake(cfg, S.round); }
  for (const f of S.figs) { const k = CARDS[f.c].k; if ((k.stage || k.tale) && holder(S, f.p) === f.o) { if (k.stage) { S.P[f.o].renown++; if (S.ev) S.ev.push({ t: 'renown', o: f.o, n: 1, why: 'stage', u: f.u }); } else draw(S, f.o, 1); } f.stay++; }
  // (Akbar: Figures of two or more factions at the Crossroads score him 1 Renown. Empress Wu: holding more Places than
  // the other player gives her 1 more Spark next turn, unless this round ends the game)
  for (let o = 0; o < N; o++) { const p = S.P[o];
    if (atCourt(S, o)) { p.renown += 1; if (S.ev) S.ev.push({ t: 'renown', o: o, n: 1, why: 'court' }); }
    if (p.guide === 'wuzetian' && !last && !(cfg.target && S.P.some(q => q.renown >= cfg.target)) && !(N === 2 && S.P.some(q => q.seals <= 0))) {
      const hc = new Array(N).fill(0); for (let i = 0; i < S.places.length; i++) { const h = holder(S, i); if (h >= 0) hc[h]++; }
      if (hc.every((x, q) => q === o || x < hc[o])) { p.sg = 1; if (S.ev) S.ev.push({ t: 'spark', o: o, n: 1, why: 'next' }); } } }
  for (const b of S.pb) b.fill(0); for (const p of S.P) { p.lr = 0; p.uM = 0; p.uW = 0; }
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
