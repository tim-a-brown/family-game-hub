// PLACES PROTOTYPE: a copy of games/anoria/engine.js with each player's own stack of Places behind cfg switches
// (scripts/anoria/places/README.md). With no stacks handed to newGame it plays exactly as the game's engine does.
// Anoria rules simulator: the whole game as code, for 2 to 6 players, with robot players that pick the best
// next step by a scoring rule (a "profile"). run.js plays thousands of games with it and reports balance.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards-places')); else root.AnoriaEngine = factory(root.AnoriaCards); })(this, function (cards) {
'use strict';
const { CARDS, PLACES, CENTER, EDGE } = cards;
// The standard rules, as the test games settled them (see scripts/anoria and the design doc)
// dice 'high': a clash is two ordinary dice, the higher roll adds 1 Might (2 when higher by 3 or more).
// unique: one of each person on your side of the table at a time. ret: a Figure whose other copy is in your discard pile costs this much less.
// Scoring is flat (Tim, 2026-11): every Place scores 1 Renown every round, all game, and the first to 30 wins. (Until
// then the stake doubled from round 4: ramp: [1, 1, 1, 2, 2, 2]. cfg.ramp still works, for test games and for a game
// saved under the old rule, which finishes under it.) Flat games run about two rounds longer, which is why a deck
// is 40 cards (coll.js). rounds: the round limit, see scripts/anoria/variants.txt ("Decks of 40").
const STD = { spark: 'round', scoring: 'round', order: 'trail', catchup: 1, rush: 1, target: 30, rounds: 14, sparkCap: 7, draw2: 1, bounty: 1, handMax: 8, dice: 'high', unique: 1, ret: 1, threads: 2 };
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
function newGame(decks, guides, cfg, R, stacks) {
  cfg = Object.assign({}, DEF, cfg); const N = decks.length, M = mkMap(N, R, cfg);
  const S = { cfg, N, round: 1, turn: 0, uid: 1, places: M.ids, adj: M.adj, pb: M.ids.map(() => new Array(N).fill(0)), figs: [], P: [], over: false, winner: -1, how: '', ev: cfg.log ? [] : null,
    st: { clash: 0, ko: 0, jump: 0, walk: 0, lines: 0, plays: 0, home: 0, lead: [], ev: [], played: decks.map(() => ({})), sealBreaks: 0, upsets: 0, seenC: decks.map(() => ({})), turned: decks.map(() => 0), seenP: decks.map(() => ({})), pout: decks.map(() => 0), pzero: decks.map(() => 0), set: [], picked: {}, use: {}, hub0: null, repl: 0, replHub: 0, pdup: 0, domR: decks.map(() => 0), domAhead: 0, domBehind: 0, sealSaved: 0 } };
  if (cfg.coin) S.f0 = (Math.random() * N) | 0;   // (who starts, when nobody leads)
  for (let p = 0; p < N; p++) {
    let deck = shuffle(decks[p].slice(), R), hand = deck.splice(0, cfg.hand);
    if (!hand.some(c => CARDS[c].t === 'fig' && CARDS[c].c <= 2)) { deck = shuffle(deck.concat(hand), R); hand = deck.splice(0, cfg.hand); }   // one mulligan
    S.P.push({ deck, hand, relics: [], guide: guides[p], spark: 0, reserve: 0, renown: 0, seals: cfg.seals, broke: 0, sb: 0, uA: 0, uT: 0, uD: 0, uC: 0, lines: 0 });
    for (const c of hand) S.st.seenC[p][c] = 1;
  }
  if (cfg.stacks && stacks) setupPlaces(S, stacks, R, decks);
  return S;
}
function clone(S) {
  return { cfg: S.cfg, N: S.N, round: S.round, turn: S.turn, uid: S.uid, places: S.pown ? S.places.slice() : S.places, pown: S.pown ? S.pown.slice() : null, nul: S.nul ? S.nul.slice() : null, cyn: S.cyn, pend: S.pend, adj: S.adj, pb: S.pb.map(x => x.slice()), figs: S.figs.map(f => Object.assign({}, f)),
    P: S.P.map(p => Object.assign({}, p, { deck: p.deck.slice(), hand: p.hand.slice(), relics: p.relics.slice(), gone: p.gone ? p.gone.slice() : null, pst: p.pst ? p.pst.slice() : null, pgone: p.pgone ? p.pgone.slice() : null })), over: S.over, winner: S.winner, how: S.how, st: null, ev: null };
}
const stake = (cfg, r) => cfg.ramp ? cfg.ramp[Math.min(r, cfg.ramp.length) - 1] : 1;
const gateOf = o => 2 * o, ownerOfSpoke = (S, i) => i === 2 * S.N ? -1 : (i >> 1);
const isGate = (S, i) => i < 2 * S.N && !(i & 1);
const enemySide = (S, o, i) => { const w = ownerOfSpoke(S, i); return w >= 0 && w !== o; };
const pid = (S, i) => S.places[i];
// ---- Places as each player's own stack (cfg.stacks, with the two stacks handed to newGame) ----
// S.pown[i]: whose card the Place at spot i is. S.nul[i]: Vesuvius lies on it. P.pst: a player's Place stack (its top
// is the end of the list). P.pgone: their Place discard pile. S.pend: a choice of Place a player has still to make.
// PLACES[id].pw is a Place's rule as a word and PLACES[id].d its domain; pw0 is the rule it has in the game today.
const FAC = { A: 'facA', D: 'facD', S: 'facS', V: 'facV', W: 'facW' };
const prot = (S, i, by) => { const w = ownerOfSpoke(S, i); return w >= 0 && w !== by && S.P[w].relics.indexOf('kudurru') >= 0; };   // (Boundary Stone)
// A Place's rule. None while Vesuvius lies on it or Diogenes stands there. o: the player asking, for the test rules in
// which a rule works only for the player whose card the Place is (cfg.edge 'power': at the Crossroads; 'powerAll').
function pw(S, i, o) {
  const pl = PLACES[S.places[i]], p = S.pown ? pl.pw : pl.pw0;
  if (!p) return '';
  if (p === 'double' && i !== 2 * S.N) return '';
  if (p === 'closed' && i === 2 * S.N) return '';
  if (S.pown) {
    if ((p === 'spark' || p === 'cheap') && !S.cfg.gatepay && i < 2 * S.N && !(i & 1)) return '';   // (a Commerce Place pays at an Outpost or the Crossroads, not behind a Gate: see results.txt)
    if (S.nul[i]) return '';
    if (S.cyn) for (const f of S.figs) if (f.p === i && CARDS[f.c].k.cynic && !prot(S, i, f.o)) return '';
    const e = S.cfg.edge; if (o != null && e && (e === 'powerAll' || (e === 'power' && i === 2 * S.N)) && S.pown[i] !== o) return '';
  }
  return p;
}
// The Renown a Place scores for the player who holds it
function rv(S, i, h) { const w = pw(S, i, h); if (w === 'double') return 2; if (w === 'crowd' && cnt(S, i, h) >= 2) return S.cfg.dom === 'pair' && pairOf(S, h, i) ? 3 : 2; return 1; }
// Does this player hold a Place with this rule (the spot + 1, or 0); do they hold this Place and another of its domain
// cfg.tame: a rule that pays whoever holds the Place pays only a player with a Figure standing there (so an empty Gate
// pays nothing), and a Commerce Place makes the first Figure a player lays there each turn cheaper, not every one.
const pays = (S, i, h) => !S.cfg.tame || cnt(S, i, h) > 0;
function holds(S, o, w) { for (let i = 0; i < S.places.length; i++) if (pw(S, i, o) === w && holder(S, i) === o && pays(S, i, o)) return i + 1; return 0; }
function pairOf(S, o, i) { if (holder(S, i) !== o) return 0; const d = PLACES[S.places[i]].d; for (let j = 0; j < S.places.length; j++) if (j !== i && PLACES[S.places[j]].d === d && holder(S, j) === o) return 1; return 0; }
function dshuf(a, s) { s = (s * 2654435761) >>> 0; for (let i = a.length - 1; i > 0; i--) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const j = (s >>> 8) % (i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
// The top card of a player's Place stack. An empty stack is made again from that player's Place discard pile.
function popTop(S, o) { const P = S.P[o]; if (!P.pst.length) { if (!P.pgone.length) return null; P.pst = dshuf(P.pgone, S.uid * 31 + S.round); P.pgone = []; if (S.st) S.st.pout[o]++; } const id = P.pst.pop(); if (S.st && !P.pst.length) S.st.pzero[o] = 1; return id; }
const used = (S, k) => { if (S.st) S.st.use[k] = (S.st.use[k] || 0) + 1; };
const canTurn = (S, o) => S.P[o].pst.length + S.P[o].pgone.length > 0;
// The next Place a player turns up: a Place that is already on the table goes to the bottom of the stack instead
function turnPlace(S, o) { const P = S.P[o]; for (let n = P.pst.length + P.pgone.length; n > 0; n--) { const id = popTop(S, o); if (id == null) return null; if (S.places.indexOf(id) < 0) return id; P.pst.unshift(id); if (S.st) S.st.pdup++; } return null; }
// A Place is laid at a spot. The one that was there goes to its owner's Place discard pile, Vesuvius comes off, and
// everything else at the spot stays as it is: the Figures, a Royal Decree, the rounds Imhotep has stood there.
function setPlace(S, i, id, o) {
  const old = S.places[i]; if (old != null) S.P[S.pown[i]].pgone.push(old);
  S.places[i] = id; S.pown[i] = o; S.nul[i] = 0;
  if (S.ev) S.ev.push({ t: 'place', p: i, id: id, o: o, old: old });
  if (S.st) { S.st.turned[o]++; S.st.seenP[o][id] = (S.st.seenP[o][id] || 0) + 1; if (old != null) { S.st.repl++; if (i === 2 * S.N) S.st.replHub++; } }
}
// A choice of Place waiting on a player (Pachacuti's three, Al-Idrisi's whole stack, Wren's discard pile)
function pendActions(S) { const q = S.pend, out = [{ t: 'pp', no: 1 }], seen = {}, g = gateOf(q.o);
  for (const id of q.ids) { if (seen[id] || S.places.indexOf(id) >= 0) continue; seen[id] = 1; out.push({ t: 'pp', id: id, p: g }, { t: 'pp', id: id, p: g + 1 }); } return out; }
function pendApply(S, a) { const q = S.pend, Q = S.P[q.o]; S.pend = null;
  if (q.k === 'scout') { let used = a.no ? 1 : 0; for (const id of q.ids) { if (!used && id === a.id) { used = 1; continue; } Q.pst.unshift(id); } }
  else if (q.k === 'survey') { if (!a.no) Q.pst.splice(Q.pst.indexOf(a.id), 1); dshuf(Q.pst, S.uid * 17 + S.round); }
  else if (q.k === 'rebuild') { if (!a.no) Q.pgone.splice(Q.pgone.indexOf(a.id), 1); }
  if (!a.no) { setPlace(S, a.p, a.id, q.o); if (S.st) S.st.picked[q.k] = (S.st.picked[q.k] || 0) + 1; } }
// Set-up. cfg.setup 'top2': the top card is your Gate, the next your Outpost, and whoever has first dibs turns one more
// for the Crossroads. 'pick3': you draw three and lay one at your Gate, one at your Outpost and offer the third for the
// Crossroads ('top3': the same with no choice, in the order they come). 'free': you choose all three from your whole stack.
// First dibs is a roll (cfg.dibs fixes the seat). cfg.comp: what the other player gets: 'first' the first turn,
// 'second' the second turn, 'card' a card, 'spark' 1 Spark on their first turn.
const PV = { spark: [0, 0.8, 0.5], cheap: [0, 0.8, 0.3], forge: [0.5, 0.4, 0.3], arms: [0.3, 0.5, 0.5], draw: [1, 0.6, 0.5], line: [0.4, 0.4, 0.3], fort: [0.4, 0.7, 0.3], closed: [0.5, 0.8, 0], narrow: [0.2, 0.2, 0], crowd: [0, 0.5, 1], arena: [0, 0.3, 0.4], seal: [0, 0.8, 0.5], sanctuary: [0.1, 0.2, 0.1], link: [-0.5, 0, 0.3], road: [0.8, 0.3, 0.2] };
function deckInfo(deck) { const reg = {}, fac = {}; let n = 0; for (const c of deck) { const x = CARDS[c]; if (x.t !== 'fig') continue; n++; if (!x.k.voyager) reg[x.reg] = (reg[x.reg] || 0) + 1; fac[x.f] = (fac[x.f] || 0) + 1; } for (const k in reg) reg[k] /= n || 1; for (const k in fac) fac[k] /= n || 1; return { reg, fac }; }
function placeScore(id, slot, info, pvt) { const pl = PLACES[id], w = pl.pw; let v = (info.reg[pl.reg] || 0) * [1, 2, 2][slot]; if (w.slice(0, 3) === 'fac') v += (info.fac[w[3]] || 0) * [1, 2, 2][slot]; else { const t = (pvt && pvt[w]) || PV[w]; if (t) v += t[slot]; } return v; }
function bestThree(ids, info, pvt) { let best = null, bv = -1e9; for (const a of ids) for (const b of ids) if (b !== a) for (const c of ids) if (c !== a && c !== b) { const v = placeScore(a, 0, info, pvt) + placeScore(b, 1, info, pvt) + 0.5 * placeScore(c, 2, info, pvt); if (v > bv) { bv = v; best = [a, b, c]; } } return best; }
function setupPlaces(S, stacks, R, decks) {
  const N = S.N, cfg = S.cfg, np = 2 * N + 1, mode = cfg.setup || 'top2', cand = [];
  S.places = new Array(np).fill(null); S.pown = new Array(np).fill(-1); S.nul = new Array(np).fill(0); S.cyn = 0; S.pend = null;
  for (let o = 0; o < N; o++) { S.P[o].pst = shuffle(stacks[o].slice(), R); S.P[o].pgone = []; }
  for (let o = 0; o < N; o++) { const P = S.P[o]; let three;
    if (mode === 'free') { three = bestThree(P.pst.filter(x => S.places.indexOf(x) < 0), deckInfo(decks[o]), cfg.pvt); for (const id of three) P.pst.splice(P.pst.indexOf(id), 1); }
    else { three = [turnPlace(S, o), turnPlace(S, o), mode === 'top2' ? null : turnPlace(S, o)]; if (mode === 'pick3') three = bestThree(three, deckInfo(decks[o]), cfg.pvt); }
    setPlace(S, 2 * o, three[0], o); setPlace(S, 2 * o + 1, three[1], o); cand[o] = three[2]; if (S.st) S.st.set[o] = three.slice(); }
  const d = cfg.dibs != null ? cfg.dibs : (R() * N) | 0, ot = (d + 1) % N; S.dibs = d;
  let hub = cand[d]; if (hub == null || S.places.indexOf(hub) >= 0) { if (hub != null) S.P[d].pst.unshift(hub); hub = turnPlace(S, d); }
  setPlace(S, 2 * N, hub, d); if (S.st) S.st.hub0 = hub;
  for (let o = 0; o < N; o++) if (o !== d && cand[o] != null) { if (cfg.candTo === 'bottom') S.P[o].pst.unshift(cand[o]); else S.P[o].pgone.push(cand[o]); }
  const c = cfg.comp; if (c === 'first') S.f0 = ot; else if (c === 'second') S.f0 = d; else if (c === 'card') draw(S, ot, 1); else if (c === 'spark') S.P[ot].sb = 1;
  if (S.st) S.st.repl = S.st.replHub = 0;
}
// "Controlling these leads to domination": the test rules for holding Places of several domains at the end of a round.
// cfg.dom 'three': a player who holds Places of three different domains (cfg.domN) scores 1 more Renown. 'all': a
// player who holds a Place of every domain on the table wins (cfg.domMin: only with that many domains on the table).
// 'pair' is in the rules themselves: holding two Places of one domain doubles what their rules pay.
function domination(S) { const cfg = S.cfg, dm = [{}, {}], nd = [0, 0], all = {}; let na = 0;
  for (let i = 0; i < S.places.length; i++) { const d = PLACES[S.places[i]].d, h = holder(S, i); if (!all[d]) { all[d] = 1; na++; } if (h >= 0 && !dm[h][d]) { dm[h][d] = 1; nd[h]++; } }
  if (cfg.dom === 'three') { const k = cfg.domN || 3, r = [S.P[0].renown, S.P[1].renown]; for (let o = 0; o < 2; o++) if (nd[o] >= k) { S.P[o].renown += 1; if (S.ev) S.ev.push({ t: 'renown', o: o, n: 1, why: 'domains' }); if (S.st) { S.st.domR[o]++; if (r[o] > r[1 - o]) S.st.domAhead++; else if (r[o] < r[1 - o]) S.st.domBehind++; } } }
  if (cfg.dom === 'all' && na >= (cfg.domMin || 1)) { const a = nd[0] === na, b = nd[1] === na; if (a !== b) { S.domWin = a ? 0 : 1; if (S.st) { const r = S.P[S.domWin].renown - S.P[1 - S.domWin].renown; S.st.domWinLead = r > 0 ? 1 : r < 0 ? -1 : 0; S.st.domWinGap = r; } } }
}
// What the robots think Places' rules and domains are worth (on top of Might, which they already count)
function pval(S, me, hs) { let v = 0; const cfg = S.cfg, dm = [{}, {}], nd = [0, 0], all = {}; let na = 0;
  for (let i = 0; i < hs.length; i++) { const h = hs[i], d = PLACES[S.places[i]].d; if (!all[d]) { all[d] = 1; na++; } if (h < 0) continue; const s = h === me ? 1 : -1, w = pw(S, i, h);
    if (!pays(S, i, h)) { } else if (w === 'draw') v += 0.5 * s; else if (w === 'spark') v += 0.6 * s; else if (w === 'forge') v += 0.3 * s; else if (w === 'seal') v += 0.4 * s;
    if (!dm[h][d]) { dm[h][d] = 1; nd[h]++; } }
  if (cfg.dom === 'three') { const k = cfg.domN || 3; for (let o = 0; o < 2; o++) if (nd[o] >= k) v += o === me ? 1 : -1; }
  if (cfg.dom === 'all' && na >= (cfg.domMin || 1)) { v += 0.8 * (nd[me] - nd[1 - me]); for (let o = 0; o < 2; o++) if (nd[o] === na && nd[1 - o] !== na) v += o === me ? 12 : -12; }
  return v; }
// A robot weighing a card that turns up a Place it can't see yet shuffles the stacks in its head (it knows what is in
// a stack, not the order) and takes the average of a few tries.
function hidden(S, a) { const P = S.P[S.turn]; if (a.t === 'fig') { const c = CARDS[P.hand[a.h]]; return !!(c.arr && (c.arr[0] === 'scout' || (a.x && (c.arr[0] === 'found' || c.arr[0] === 'conquer')))); } if (a.t === 'deed') { const ci = P.hand[a.h]; return ci === 'earthquake' || ci === 'caperoute'; } return false; }
function mix(T, k) { for (let o = 0; o < T.N; o++) dshuf(T.P[o].pst, T.uid * 131 + k * 7 + o + T.round * 13 + T.P[o].pst.length); }
function settle(T, prof) { for (let g = 0; T.pend && g < 4; g++) { const o = T.pend.o; let best = null, bv = -1e9; for (const a of pendActions(T)) { const U = clone(T); pendApply(U, a); const v = evalS(U, o, prof); if (v > bv) { bv = v; best = a; } } pendApply(T, best); } }
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
  const w = pw(S, f.p, f.o); if (w && w === FAC[c.f]) m += 1;
  if (S.pown && S.cfg.edge === 'might' && f.p === 2 * S.N && S.pown[f.p] === f.o) m += 1;   // (test rule: +1 Might at the Crossroads for the player whose Place it is)
  if (mode === 1) { if (k.raider && enemySide(S, f.o, f.p)) m += 2; if (k.slayer && oth && CARDS[oth.c].m > c.m) m += 2; if (S.P[f.o].guide === 'suntzu' && !S.P[f.o].uC) m += 0.5; }   // (Sun Tzu: your first clash each turn wins ties)
  if (mode === 2) { if (k.steadfast) m += 2; if (w === 'fort') m += 1; }
  return m;
}
function mights(S, i) { const m = S.pb[i].slice(); for (const f of S.figs) if (f.p === i) m[f.o] += might(S, f, 0); return m; }
function holderM(S, i, m) {
  let mx = 0, who = -1, n = 0; for (let o = 0; o < S.N; o++) { if (m[o] > mx) { mx = m[o]; who = o; n = 1; } else if (m[o] === mx) n++; }
  if (mx > 0 && n === 1) return who;
  const tied = []; for (let o = 0; o < S.N; o++) if (m[o] === mx) tied.push(o);
  if (mx > 0) { const cl = tied.filter(o => S.P[o].guide === 'cleopatra' && S.figs.some(f => f.p === i && f.o === o)); if (cl.length === 1) return cl[0]; }
  if (S.pown && i === 2 * S.N && S.cfg.edge && tied.indexOf(S.pown[i]) >= 0) { const e = S.cfg.edge, w = S.pown[i]; if (e === 'ties0' || (e === 'ties' && mx > 0 && S.figs.some(f => f.p === i && f.o === w))) return w; }   // (test rule: the player whose Place the Crossroads is wins ties there)
  if (isGate(S, i) && tied.indexOf(i >> 1) >= 0) return i >> 1;
  return -1;
}
const holder = (S, i) => holderM(S, i, mights(S, i));
const cnt = (S, i, o) => { let n = 0; for (const f of S.figs) if (f.p === i && f.o === o) n++; return n; };
const room = (S, i, o) => cnt(S, i, o) < (S.pown && pw(S, i) === 'narrow' ? 2 : S.cfg.cap);
const hasRelic = (p, r) => p.relics.indexOf(r) >= 0;
// Legacy: with lineNear, the one who inspired you has to be at the same Place or the next one over
const near = (S, a, b) => !S.cfg.lineNear || a === b || S.adj[a].indexOf(b) >= 0 || pw(S, a) === 'link' || pw(S, b) === 'link';
function draw(S, o, n) { const p = S.P[o]; for (let i = 0; i < n; i++) { if (!p.deck.length && p.gone && p.gone.length) { p.deck = p.gone; p.gone = []; for (let j = p.deck.length - 1; j > 0; j--) { const q = (j * 7 + S.round * 3 + i) % (j + 1), x = p.deck[j]; p.deck[j] = p.deck[q]; p.deck[q] = x; } } if (p.deck.length) { const dc = p.deck.pop(); p.hand.push(dc); if (S.st) S.st.seenC[o][dc] = 1; p.drawn = (p.drawn || 0) + 1; if (S.ev) S.ev.push({ t: 'draw', o: o }); } } }
function walkDests(S, f, free) {
  const c = CARDS[f.c]; if (c.k.monument) return [];
  const out = [], P = S.P[f.o];
  if (c.k.voyager && !free) { for (let i = 0; i < S.places.length; i++) if (i !== f.p && !(pw(S, i) === 'closed' && ownerOfSpoke(S, i) !== f.o) && room(S, i, f.o)) out.push(i); return out; }
  const seen = {}; seen[f.p] = 1; let fr = [f.p];
  const steps = hasRelic(P, 'compass') && !free ? 2 : 1;
  for (let s = 0; s < steps; s++) { const nx = []; for (const a of fr) { const ns = (pw(S, a, f.o) === 'link') ? S.places.map((_, i) => i) : S.adj[a].concat(S.places.map((x, i) => pw(S, i, f.o) === 'link' ? i : -1).filter(i => i >= 0)); for (const b of ns) if (!seen[b]) { seen[b] = 1; nx.push(b); } } fr = nx; }
  // (Machu Picchu: only its own side walks in)
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
function threadPlay(S, o, ci, src, u, pl) {
  const P = S.P[o]; if (!src) return;
  let ren = S.cfg.threads === 3 || P.lr ? 0 : S.cfg.lineRen; if (ren && pl != null && S.pown && pw(S, pl, o) === 'line') ren += 1;
  if (S.ev) S.ev.push({ t: 'thread', o: o, c: ci, u: u || 0, src: src, ren: ren });
  if (ren) { P.renown += ren; P.lr = 1; } if (S.st) S.st.threads = (S.st.threads || 0) + 1;
}
function costOf(S, o, ci, place) {
  const c = CARDS[ci], P = S.P[o]; let x = c.c;
  if (c.t === 'fig') { if (c.insp && S.figs.some(f => f.o === o && c.insp.indexOf(f.c) >= 0 && (place == null || near(S, place, f.p)))) x -= S.cfg.disc; else if (S.cfg.threads !== 2 && threadSrc(S, o, ci, place)) x -= S.cfg.disc; if (place != null && pw(S, place, o) === 'cheap' && !(S.cfg.tame && P.uCh)) x -= S.cfg.dom === 'pair' && S.pown && pairOf(S, o, place) ? 2 : 1;
    if (S.cfg.ret && P.gone && P.gone.indexOf(ci) >= 0) { x -= S.cfg.ret; if (S.st && place != null) S.st.retSeen = 1; } }   // (the return: their other copy lies in your discard pile)
  if (c.t !== 'fig' && S.cfg.threads !== 2 && threadSrc(S, o, ci)) x -= S.cfg.disc;   // (threads 2: Renown only; 3: the discount only)
  if (c.t === 'relic' && P.guide === 'leonardo') x -= 1;
  if (c.t !== 'fig' && S.pown) { const fg = holds(S, o, 'forge'); if (fg) x -= S.cfg.dom === 'pair' && pairOf(S, o, fg - 1) ? 2 : 1; }
  if (c.t === 'deed') { if (P.guide === 'franklin' && !P.uD) x -= 1; if (S.figs.some(f => f.o === o && CARDS[f.c].k.deedsLess)) x -= 1; }
  return Math.max(0, x);
}
function ko(S, f, by) {
  if (S.ev) S.ev.push({ t: 'ko', u: f.u, c: f.c, o: f.o, p: f.p, by: by ? by.u : 0 });
  S.figs.splice(S.figs.indexOf(f), 1); if (CARDS[f.c].k.cynic) S.cyn--; (S.P[f.o].gone || (S.P[f.o].gone = [])).push(f.c);
  for (const g of S.figs) if (g.li === f.u) { g.li = 0; S.P[g.o].lines--; }
  if (f.li) S.P[f.o].lines--;
  if (S.st) { S.st.ko++; if (by) { const a = CARDS[by.c], b = CARDS[f.c]; if (a.m < b.m) S.st.upsets++; S.st.ev.push([by.c, f.c, S.places[f.p]]); } }
}
function arrive(S, f, x) {
  const c = CARDS[f.c], o = f.o, P = S.P[o];
  if (c.k.scholar) draw(S, o, 1);
  if (S.pown && pw(S, f.p, o) === 'arms') f.tb += S.cfg.dom === 'pair' && pairOf(S, o, f.p) ? 2 : 1;
  if (c.arr) {
    const [op, n] = c.arr, en = S.figs.filter(g => g.p === f.p && g.o !== o);
    if (S.pown) {   // (the cards that act on Places)
      if (op === 'scout') { const ids = []; for (let i = 0; i < n; i++) { const id = popTop(S, o); if (id == null) break; ids.push(id); } if (ids.length) S.pend = { k: 'scout', o: o, ids: ids }; }
      if (op === 'survey' && P.pst.length) S.pend = { k: 'survey', o: o, ids: P.pst.slice() };
      if (op === 'rebuild' && P.pgone.length) S.pend = { k: 'rebuild', o: o, ids: P.pgone.slice() };
      if (op === 'found' && x) { const id = turnPlace(S, o); if (id) { setPlace(S, 2 * S.N, id, o); used(S, 'found'); } }
      if (op === 'conquer' && x && enemySide(S, o, f.p) && !prot(S, f.p, o)) { const w = f.p >> 1, id = turnPlace(S, w); if (id) { setPlace(S, f.p, id, w); used(S, 'conquer'); } }
    }
    if (op === 'spark') { P.spark += n; if (S.ev) S.ev.push({ t: 'spark', o: o, n: n }); }
    if (op === 'wits') {   // (Anansi: Spark won by his wits, more of it where the other side holds the Place)
       const rn = 1 + (holder(S, f.p) >= 0 && holder(S, f.p) !== o ? 1 : 0); P.spark += rn; if (S.ev) S.ev.push({ t: 'spark', o: o, n: rn }); }
    if (op === 'stun') { en.sort((a, b) => might(S, b, 0) - might(S, a, 0)); for (let i = 0; i < Math.min(n, en.length); i++) { en[i].stun = 1; if (S.ev) S.ev.push({ t: 'stun', u: en[i].u }); } }
    if (op === 'push' && en.length) { en.sort((a, b) => might(S, a, 0) - might(S, b, 0)); const g = en[0]; if (!CARDS[g.c].k.monument && g.p !== gateOf(g.o)) { const to = stepHome(S, g); if (to >= 0 && room(S, to, g.o)) { if (S.ev) S.ev.push({ t: 'move', u: g.u, from: g.p, to: to, push: 1 }); g.p = to; g.stay = 0; } } }
  }
  if (c.insp) { const ins = S.figs.find(g => g.o === o && g !== f && c.insp.indexOf(g.c) >= 0 && near(S, f.p, g.p)); if (ins) { f.li = ins.u; P.lines++; if (S.ev) S.ev.push({ t: 'line', a: f.u, b: ins.u, o: o, ren: P.lr ? 0 : S.cfg.lineRen }); if (!P.lr) { P.renown += S.cfg.lineRen + (S.pown && pw(S, f.p, o) === 'line' ? 1 : 0); P.lr = 1; } if (S.figs.some(g => g.o === o && CARDS[g.c].k.masterpiece)) draw(S, o, 1); if (S.st) S.st.lines++; } }   // (a line scores once a round; Michelangelo draws)
  if (!f.li) threadPlay(S, o, f.c, threadSrc(S, o, f.c, f.p), f.u, f.p);
}
function stepHome(S, g) { const N = S.N, gate = gateOf(g.o), near = gate + 1; if (g.p === near) return gate; if (g.p === 2 * N) return near; if (S.adj[g.p].indexOf(near) >= 0) return near; return 2 * N; }
function putFig(S, o, ci, place, x) { const rd = S.pown && pw(S, place, o) === 'road' ? 1 : 0, f = { u: S.uid++, c: ci, o, p: place, rdy: CARDS[ci].k.swift || rd ? 1 : 0, sw: rd, arr: 1, tb: 0, stun: 0, stay: 0, li: 0 }; S.figs.push(f); if (CARDS[ci].k.cynic) S.cyn = (S.cyn || 0) + 1; if (S.ev) S.ev.push({ t: 'arrive', u: f.u, c: ci, o: o, p: place }); if (S.st) { S.st.plays++; if (CARDS[ci].reg === PLACES[S.places[place]].reg) S.st.home++; S.st.played[o][ci] = 1; } arrive(S, f, x); return f; }
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
  const qi = D.hand.indexOf('phalanx'); if (qi >= 0 && D.reserve >= 1 && dm <= am && dm + 2 >= am) { D.hand.splice(qi, 1); D.reserve -= 1; dm += 2; if (S.st) S.st.played[d.o].phalanx = 1; if (S.ev) S.ev.push({ t: 'quick', o: d.o, c: 'phalanx', u: d.u }); }
  A.uC = 1; a.rdy = 0; a.acted = 1; if (S.st) S.st.clash++;
  if (S.ev) S.ev.push({ t: 'clash', a: a.u, d: d.u, p: a.p, am: am, dm: dm, da: da, dd: dd, ra: raw ? raw.ra : da, rd: raw ? raw.rd : dd });
  const arn = o => pw(S, a.p, o) === 'arena' ? (S.cfg.dom === 'pair' && S.pown && pairOf(S, o, a.p) ? 2 : 1) : 0, arA = arn(a.o), arD = arn(d.o);
  const ar = A.renown, dr = D.renown;
  if (am > dm) { ko(S, d, a); if (arA) { A.renown += arA; if (S.ev) S.ev.push({ t: 'renown', o: a.o, n: arA, why: 'colosseum' }); } if (S.cfg.bounty && dr > ar) { A.renown += S.cfg.bounty; if (S.ev) S.ev.push({ t: 'renown', o: a.o, n: S.cfg.bounty, why: 'bounty' }); } } else if (dm > am) { ko(S, a, d); if (arD) { D.renown += arD; if (S.ev) S.ev.push({ t: 'renown', o: d.o, n: arD, why: 'colosseum' }); } if (S.cfg.bounty && ar > dr) { D.renown += S.cfg.bounty; if (S.ev) S.ev.push({ t: 'renown', o: d.o, n: S.cfg.bounty, why: 'bounty' }); } }
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
      for (const i of deploy) if (costOf(S, o, ci, i) <= P.spark) { out.push({ t: 'fig', h, p: i }); if (S.pown && c.arr && ((c.arr[0] === 'found' && canTurn(S, o)) || (c.arr[0] === 'conquer' && enemySide(S, o, i) && !prot(S, i, o) && canTurn(S, i >> 1)))) out.push({ t: 'fig', h, p: i, x: 1 }); } return; }
    const x = costOf(S, o, ci); if (x > P.spark) return;
    if (c.t === 'relic') { if (P.relics.length < 2 && !hasRelic(P, ci)) out.push({ t: 'relic', h }); return; }
    const open = g => pw(S, g.p, g.o) !== 'sanctuary';
    if (ci === 'eureka' || ci === 'caravan') out.push({ t: 'deed', h });
    else if (ci === 'decree') { for (let i = 0; i < np; i++) if (cnt(S, i, o)) out.push({ t: 'deed', h, p: i }); }
    else if (ci === 'eclipse') { for (let i = 0; i < np; i++) if (pw(S, i, (o + 1) % S.N) !== 'sanctuary' && theirs.some(g => g.p === i)) out.push({ t: 'deed', h, p: i }); }
    else if (ci === 'encore') { for (const f of mine) if (!f.rdy) out.push({ t: 'deed', h, u: f.u }); }
    else if (ci === 'fairwinds') { for (const f of mine) if (!CARDS[f.c].k.monument) for (let i = 0; i < np; i++) if (i !== f.p && room(S, i, o)) out.push({ t: 'deed', h, u: f.u, p: i }); }
    else if (ci === 'ambush') { for (const f of mine) for (const g of theirs) if (g.p === f.p && open(g) && !CARDS[g.c].k.untouchable) out.push({ t: 'deed', h, u: f.u, v: g.u }); }
    else if (ci === 'trojan') { P.hand.forEach((cj, h2) => { if (h2 !== h && CARDS[cj].t === 'fig' && CARDS[cj].c <= 3) for (let i = 0; i < np; i++) if (room(S, i, o)) out.push({ t: 'deed', h, h2, p: i }); }); }
    else if (ci === 'rift') { for (const f of mine) for (const g of S.figs) if (g.p !== f.p && g.u !== f.u && !CARDS[f.c].k.monument && !CARDS[g.c].k.monument && (g.o === o ? g.u > f.u : open(g)) && (g.o === o || (room(S, g.p, o) && room(S, f.p, g.o)))) out.push({ t: 'deed', h, u: f.u, v: g.u }); }
    else if (!S.pown) return;
    else if (ci === 'earthquake') { for (let i = 0; i < 2 * S.N; i++) if (!prot(S, i, o) && canTurn(S, i >> 1)) out.push({ t: 'deed', h, p: i }); }
    else if (ci === 'vesuvius') { for (let i = 0; i < np; i++) if (!S.nul[i] && pw(S, i) && !prot(S, i, o)) out.push({ t: 'deed', h, p: i }); }
    else if (ci === 'caperoute') { if (canTurn(S, o)) out.push({ t: 'deed', h }); }
  });
  const ph = P.hand.indexOf('phalanx') >= 0 && costOf(S, o, 'phalanx') <= P.spark;
  for (const f of mine) {
    const can = f.rdy && (!f.arr || CARDS[f.c].k.swift || f.sw), canClash = can || (S.cfg.rush && f.arr && !f.acted);
    if (can) for (const i of walkDests(S, f)) out.push({ t: 'walk', u: f.u, p: i });
    if (canClash) {
      const en = theirs.filter(g => g.p === f.p);
      if (en.length && !en.some(g => CARDS[g.c].k.law)) {
        const gd = en.filter(g => CARDS[g.c].k.guard);
        for (const g of (gd.length ? gd : en)) if (!CARDS[g.c].k.untouchable) { out.push({ t: 'clash', u: f.u, v: g.u }); if (ph) out.push({ t: 'clash', u: f.u, v: g.u, ph: 1 }); }
      }
    }
    if (hasRelic(P, 'antikythera') && !P.uA && !CARDS[f.c].k.monument) for (let i = 0; i < np; i++) if (i !== f.p && room(S, i, o)) out.push({ t: 'antik', u: f.u, p: i });
    if (P.guide === 'tubman' && !P.uT && !f.arr) for (const i of walkDests(S, f, true)) out.push({ t: 'tub', u: f.u, p: i });
  }
  return out;
}
function moveFig(S, f, to, jump) { if (S.ev) S.ev.push({ t: 'move', u: f.u, from: f.p, to: to, jump: jump ? 1 : 0 }); f.p = to; f.stay = 0; if (S.st) { if (jump) S.st.jump++; else S.st.walk++; } }
function apply(S, a, da, dd, raw) {
  const o = S.turn, P = S.P[o];
  if (a.t === 'pp') { pendApply(S, a); return; }
  if (a.t === 'fig') { const ci = P.hand[a.h]; P.spark -= costOf(S, o, ci, a.p); if (S.pown && pw(S, a.p, o) === 'cheap') P.uCh = 1; P.hand.splice(a.h, 1); putFig(S, o, ci, a.p, a.x); }
  else if (a.t === 'relic') { const ci = P.hand[a.h], src = threadSrc(S, o, ci); P.spark -= costOf(S, o, ci); P.hand.splice(a.h, 1); P.relics.push(ci); if (S.ev) S.ev.push({ t: 'relic', o: o, c: ci }); threadPlay(S, o, ci, src); if (S.st) S.st.played[o][ci] = 1; if (S.figs.some(f => f.o === o && CARDS[f.c].k.eureka)) draw(S, o, 1); }
  else if (a.t === 'walk') { const f = byU(S, a.u); const far = S.adj[f.p].indexOf(a.p) < 0; moveFig(S, f, a.p, far); f.rdy = 0; }
  else if (a.t === 'antik') { const f = byU(S, a.u); moveFig(S, f, a.p, true); f.rdy = 0; P.uA = 1; }
  else if (a.t === 'tub') { moveFig(S, byU(S, a.u), a.p, false); P.uT = 1; }
  else if (a.t === 'clash') { const f = byU(S, a.u), g = byU(S, a.v); if (a.ph) { const h = P.hand.indexOf('phalanx'), tsrc = threadSrc(S, o, 'phalanx'); P.spark -= costOf(S, o, 'phalanx'); P.hand.splice(h, 1); P.uD = 1; f.tb += 2; if (S.st) S.st.played[o].phalanx = 1; if (S.ev) S.ev.push({ t: 'quick', o: o, c: 'phalanx', u: f.u, att: 1 }); threadPlay(S, o, 'phalanx', tsrc); } clash(S, f, g, da, dd, 0, raw); }
  else if (a.t === 'deed') {
    const ci = P.hand[a.h], tsrc = threadSrc(S, o, ci); P.spark -= costOf(S, o, ci); P.uD = 1; if (S.st) S.st.played[o][ci] = 1; if (S.ev) S.ev.push({ t: 'deed', o: o, c: ci, p: a.p, u: a.u, v: a.v }); threadPlay(S, o, ci, tsrc);
    let h2c = a.h2 != null ? P.hand[a.h2] : null;
    if (a.h2 != null) { P.hand.splice(Math.max(a.h, a.h2), 1); P.hand.splice(Math.min(a.h, a.h2), 1); } else P.hand.splice(a.h, 1);
    if (ci === 'eureka') draw(S, o, 2);
    else if (ci === 'caravan') P.spark += (S.cfg.caravan || 3);
    else if (ci === 'decree') S.pb[a.p][o] += (S.cfg.decree || 4);
    else if (ci === 'eclipse') { for (const g of S.figs) if (g.p === a.p && g.o !== o) g.stun = 1; }
    else if (ci === 'encore') { const f = byU(S, a.u); f.rdy = 1; f.arr = 0; }
    else if (ci === 'fairwinds') { const f = byU(S, a.u); moveFig(S, f, a.p, true); f.rdy = 0; }
    else if (ci === 'ambush') { const f = byU(S, a.u), g = byU(S, a.v), r = f.rdy; clash(S, f, g, da, dd, 1, raw); if (byU(S, a.u)) f.rdy = r; }
    else if (ci === 'trojan') putFig(S, o, h2c, a.p);
    else if (ci === 'rift') { const f = byU(S, a.u), g = byU(S, a.v), t = f.p; moveFig(S, f, g.p, true); moveFig(S, g, t, true); }
    else if (ci === 'earthquake') { const w = a.p >> 1, id = turnPlace(S, w); if (id) { setPlace(S, a.p, id, w); used(S, w === o ? 'earthquake on their own Place' : 'earthquake on the other player\'s'); } }
    else if (ci === 'vesuvius') { S.nul[a.p] = 1; used(S, a.p === 2 * S.N ? 'vesuvius on the Crossroads' : (a.p >> 1) === o ? 'vesuvius on their own Place' : 'vesuvius on the other player\'s'); }
    else if (ci === 'caperoute') { const id = turnPlace(S, o); if (id) { setPlace(S, 2 * S.N, id, o); used(S, 'caperoute'); } }
  }
}
const isRoll = a => a.t === 'clash' || (a.t === 'deed' && a.isAmbush);
// How good the table looks to one player: Renown, Seals, Places held and how safely, cards, lines
function evalS(S, me, prof) {
  const P = S.P[me], N = S.N, cfg = S.cfg, left = cfg.target ? Math.max(1, Math.min(4, Math.ceil((cfg.target - Math.max.apply(null, S.P.map(p => p.renown))) / 5))) : cfg.rounds - S.round + 1; let v = 0, best = -1e9, cm = 0, co = 0, tm = 0, to = 0;
  for (let o = 0; o < N; o++) if (o !== me && S.P[o].renown > best) best = S.P[o].renown;
  const hs = S.pown && N === 2 ? [] : null;
  v += prof.wRen * (P.renown - best) + prof.wSeal * P.broke - 3 * (cfg.seals - P.seals);
  for (let i = 0; i < S.places.length; i++) {
    const m = mights(S, i), h = holderM(S, i, m); let ob = 0; for (let o = 0; o < N; o++) if (o !== me && m[o] > ob) ob = m[o];
    const w = ownerOfSpoke(S, i), kind = w < 0 ? 2 : w === me ? (isGate(S, i) ? 0 : 1) : (isGate(S, i) ? 4 : 3);
    const val = (h >= 0 ? rv(S, i, h) : pw(S, i) === 'double' ? 2 : 1) * prof.pos[kind] * stake(cfg, S.round), d = m[me] - ob; if (hs) hs.push(h);
    v += val * (h === me ? 1 : h >= 0 ? -1 : 0) + val * 0.25 * Math.max(-4, Math.min(4, d));
    if (kind === 0 && h !== me) v -= 2.5; if (kind === 4 && h === me) v += prof.wSeal * 0.6;
  }
  if (hs) v += pval(S, me, hs);
  for (const f of S.figs) { const m = might(S, f, 0); if (f.o === me) { cm++; tm += m; } else { co++; to += m; } }
  v += prof.wFig * (cm - co / (N - 1)) + 0.08 * (tm - to / (N - 1));
  v += 0.35 * Math.min(1, left / 3) * P.hand.length + prof.wLine * P.lines + 0.02 * P.spark;
  for (const r of P.relics) v += (r === 'press' ? 0.5 : r === 'antikythera' ? 0.4 : 0.2) * (left - 1);
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
function valueOf(S, a, me, prof) {
  const roll = a.t === 'clash' || (a.t === 'deed' && S.P[me].hand[a.h] === 'ambush');
  if (!roll && !S.pown) { const T = clone(S); apply(T, a, 0, 0); return evalS(T, me, prof); }
  if (!roll) { const K = hidden(S, a) ? (S.cfg.ksamp || 3) : 1; let s = 0;
    for (let k = 0; k < K; k++) { const T = clone(S); if (K > 1) mix(T, k); apply(T, a, 0, 0); if (T.pend) settle(T, prof); s += evalS(T, me, prof); }
    return s / K; }
  let s = 0, w = 0; for (const x of diceOdds(S.cfg)) { const T = clone(S); apply(T, a, x[0], x[1]); s += x[2] * evalS(T, me, prof); w += x[2]; } return s / w;
}
// The robot's next step (null: it's done for the turn)
function aiPick(S, prof, R) {
  const me = S.turn;
  if (S.pend) { let pb = null, pv = -1e9; for (const a of pendActions(S)) { const T = clone(S); pendApply(T, a); let v = evalS(T, me, prof); if (prof.noise) v += (R() - 0.5) * prof.noise; if (v > pv) { pv = v; pb = a; } } return pb; }   // (a Place to choose)
  let best = null, bv = evalS(S, me, prof) + 0.02;
  if (prof.quit && R() < prof.quit) return null;   // (calls it a turn early)
  for (const a of actions(S)) { let v = valueOf(S, a, me, prof); if (prof.noise) v += (R() - 0.5) * prof.noise; if (v > bv) { bv = v; best = a; } }
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
  if (S.pend) pendApply(S, { t: 'pp', no: 1 });
}
function startTurn(S) {
  const o = S.turn, P = S.P[o], cfg = S.cfg;
  for (const f of S.figs) if (f.o === o) { f.rdy = f.stun ? 0 : 1; f.stun = 0; f.arr = 0; f.acted = 0; }
  P.uA = P.uT = P.uD = P.uC = 0; P.uCh = 0;
  let held = 0; if (cfg.spark !== 'round') for (let i = 0; i < S.places.length; i++) if (holder(S, i) === o) held++;
  P.spark = (cfg.spark === 'round' ? Math.min(S.round + 1, cfg.sparkCap || 99) : cfg.spark === 'hold' ? 2 + held : S.round + (held >= 3 ? 1 : 0)) + P.sb; P.sb = 0; P.reserve = 0;
  if (cfg.catchup) { let mn = 1e9; for (let q = 0; q < S.N; q++) if (q !== o && S.P[q].renown < mn) mn = S.P[q].renown; if (P.renown < mn) { P.spark += 1; if (cfg.catchup === 2) draw(S, o, 1); if (cfg.catchup === 3 && mn - P.renown >= (cfg.far || 4)) P.spark += 1; } }
  if (S.ev) S.ev.push({ t: 'turn', o: o, spark: P.spark, round: S.round });
  draw(S, o, (hasRelic(P, 'press') ? 2 : 1) + (cfg.draw2 ? 1 : 0));
  if (P.guide === 'franklin' && P.hand.length <= 4) draw(S, o, 1);   // (Franklin: a thin hand draws one more)
}
function endTurn(S) {
  const P = S.P[S.turn]; P.reserve = Math.min(2, P.spark); P.spark = 0; for (const f of S.figs) f.tb = 0;
  if (S.cfg.handMax) while (P.hand.length > S.cfg.handMax) { let hi = 0; for (let i = 1; i < P.hand.length; i++) if (CARDS[P.hand[i]].c > CARDS[P.hand[hi]].c) hi = i; discard(S, S.turn, hi); }   // (over the hand limit: the dearest cards go; a screen asks the player first)
}
function endRound(S) {
  const cfg = S.cfg, N = S.N; let last = S.round === cfg.rounds;
  for (let i = 0; i < S.places.length; i++) {
    const h = holder(S, i); if (h < 0) continue; const P = S.P[h], val = rv(S, i, h) * stake(cfg, S.round);
    if (cfg.scoring === 'round') P.renown += val; else if (last) P.renown += 3 * val;
    if (S.ev) S.ev.push({ t: 'hold', p: i, o: h, n: val });
    const w = pw(S, i, h), dbl = cfg.dom === 'pair' && S.pown && pairOf(S, h, i) ? 2 : 1; if (w === 'draw' && pays(S, i, h)) draw(S, h, dbl); if (w === 'spark' && pays(S, i, h)) P.sb += dbl;
    if (isGate(S, i) && (i >> 1) !== h && S.P[i >> 1].seals > 0 && S.pown && (cfg.sealRule !== 'last' || S.P[i >> 1].seals === 1) && holds(S, i >> 1, 'seal')) { if (S.st) S.st.sealSaved++; }   // (a Law Place: while you hold it, your Seals cannot be broken)
    else if (isGate(S, i) && (i >> 1) !== h && S.P[i >> 1].seals > 0) { S.P[i >> 1].seals--; P.broke++; P.renown += cfg.sealRen; if (S.st) S.st.sealBreaks++; if (S.ev) S.ev.push({ t: 'seal', o: i >> 1, by: h, left: S.P[i >> 1].seals }); }
  }
  if (S.pown && cfg.dom && N === 2) domination(S);
  if (cfg.majority) { const hc = new Array(N).fill(0); for (let i = 0; i < S.places.length; i++) { const h = holder(S, i); if (h >= 0) hc[h]++; } let mx = 0, w = -1, tie = false; for (let o = 0; o < N; o++) { if (hc[o] > mx) { mx = hc[o]; w = o; tie = false; } else if (hc[o] === mx) tie = true; } if (!tie && w >= 0) S.P[w].renown += cfg.majority * stake(cfg, S.round); }
  for (const f of S.figs) { const k = CARDS[f.c].k; if ((k.stage || k.tale) && holder(S, f.p) === f.o) { if (k.stage) { S.P[f.o].renown++; if (S.ev) S.ev.push({ t: 'renown', o: f.o, n: 1, why: 'stage', u: f.u }); } else draw(S, f.o, 1); } f.stay++; }
  for (const b of S.pb) b.fill(0); for (const p of S.P) p.lr = 0;
  if (S.st) { let l = -1, mx = -1, tie = false; for (let o = 0; o < N; o++) { if (S.P[o].renown > mx) { mx = S.P[o].renown; l = o; tie = false; } else if (S.P[o].renown === mx) tie = true; } S.st.lead.push(tie ? -1 : l); }
  if (cfg.target && S.P.some(p => p.renown >= cfg.target)) last = true;
  if (S.domWin != null) { S.over = true; S.winner = S.domWin; S.how = 'domains'; return; }
  if (N === 2) for (let o = 0; o < 2; o++) if (S.P[o].seals <= 0) { S.over = true; S.winner = 1 - o; S.how = 'seals'; return; }
  if (last) {
    S.over = true; S.how = 'renown'; const key = o => S.P[o].renown * 1e4 + S.P[o].broke * 100 + S.figs.filter(f => f.o === o).reduce((s, f) => s + might(S, f, 0), 0);
    let mx = -1, w = -1, tie = false; for (let o = 0; o < N; o++) { const k = key(o); if (k > mx) { mx = k; w = o; tie = false; } else if (k === mx) tie = true; } S.winner = tie ? -1 : w;
  } else S.round++;
}
function play(decks, guides, profs, cfg, seed, stacks) {
  const R = rng(seed), S = newGame(decks, guides, cfg, R, stacks), N = S.N;
  while (!S.over) {
    const first = firstOf(S);
    for (let k = 0; k < N && !S.over; k++) { S.turn = (first + k) % N; startTurn(S); aiTurn(S, profs[S.turn], R); endTurn(S); }
    if (!S.over) { endRound(S); if (S.cfg.trace) S.cfg.trace.push('== end of round ' + (S.over && S.how === 'renown' ? S.cfg.rounds : S.over ? S.round : S.round - 1) + ': renown ' + S.P.map(p => p.renown) + ' seals ' + S.P.map(p => p.seals) + ' holders ' + S.places.map((x, i) => PLACES[x].n.split(' ').pop() + ':' + holder(S, i)).join(' ')); }
  }
  return S;
}
return { play, PROF, rng, shuffle, DEF, STD, newGame, clone, actions, apply, evalS, mights, holder, holderM, might, costOf, walkDests, cnt, room, stake, gateOf, isGate, ownerOfSpoke, enemySide, byU,
  startTurn, endTurn, endRound, firstOf, aiPick, aiTurn, discard, diceOdds, rollClash, threadSrc, CARDS, PLACES, pw, rv, holds, setPlace, turnPlace, placeScore, deckInfo, PV };
});
