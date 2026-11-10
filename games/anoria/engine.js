// Anoria rules simulator: the whole game as code, for 2 to 6 players, with robot players that pick the best
// next step by a scoring rule (a "profile"). run.js plays thousands of games with it and reports balance.
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards')); else root.AnoriaEngine = factory(root.AnoriaCards); })(this, function (cards) {
'use strict';
const { CARDS, PLACES, CENTER, EDGE } = cards;
// The standard rules, as the test games settled them (see scripts/anoria and the design doc)
const STD = { spark: 'round', scoring: 'round', order: 'trail', catchup: 1, ramp: [1, 1, 1, 2, 2, 2], rush: 1, target: 30, rounds: 14, sparkCap: 7, draw2: 1, bounty: 1, handMax: 8 };
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
function newGame(decks, guides, cfg, R) {
  cfg = Object.assign({}, DEF, cfg); const N = decks.length, M = mkMap(N, R, cfg);
  const S = { cfg, N, round: 1, turn: 0, uid: 1, places: M.ids, adj: M.adj, pb: M.ids.map(() => new Array(N).fill(0)), figs: [], P: [], over: false, winner: -1, how: '', ev: cfg.log ? [] : null,
    st: { clash: 0, ko: 0, jump: 0, walk: 0, lines: 0, plays: 0, home: 0, lead: [], ev: [], played: decks.map(() => ({})), sealBreaks: 0, upsets: 0 } };
  if (cfg.coin) S.f0 = (Math.random() * N) | 0;   // (who starts, when nobody leads)
  for (let p = 0; p < N; p++) {
    let deck = shuffle(decks[p].slice(), R), hand = deck.splice(0, cfg.hand);
    if (!hand.some(c => CARDS[c].t === 'fig' && CARDS[c].c <= 2)) { deck = shuffle(deck.concat(hand), R); hand = deck.splice(0, cfg.hand); }   // one mulligan
    S.P.push({ deck, hand, relics: [], guide: guides[p], spark: 0, reserve: 0, renown: 0, seals: cfg.seals, broke: 0, sb: 0, uA: 0, uT: 0, uD: 0, uC: 0, lines: 0 });
  }
  return S;
}
function clone(S) {
  return { cfg: S.cfg, N: S.N, round: S.round, turn: S.turn, uid: S.uid, places: S.places, adj: S.adj, pb: S.pb.map(x => x.slice()), figs: S.figs.map(f => Object.assign({}, f)),
    P: S.P.map(p => Object.assign({}, p, { deck: p.deck.slice(), hand: p.hand.slice(), relics: p.relics.slice(), gone: p.gone ? p.gone.slice() : null })), over: S.over, winner: S.winner, how: S.how, st: null, ev: null };
}
const stake = (cfg, r) => cfg.ramp ? cfg.ramp[Math.min(r, cfg.ramp.length) - 1] : 1;
const gateOf = o => 2 * o, ownerOfSpoke = (S, i) => i === 2 * S.N ? -1 : (i >> 1);
const isGate = (S, i) => i < 2 * S.N && !(i & 1);
const enemySide = (S, o, i) => { const w = ownerOfSpoke(S, i); return w >= 0 && w !== o; };
const pid = (S, i) => S.places[i];
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
  if (S.places[f.p] === 'globe' && c.f === 'A') m += 1;
  if (mode === 1) { if (k.raider && enemySide(S, f.o, f.p)) m += 2; if (k.slayer && oth && CARDS[oth.c].m > c.m) m += 2; if (S.P[f.o].guide === 'suntzu' && !S.P[f.o].uC) m += 0.5; }   // (Sun Tzu: your first clash each turn wins ties)
  if (mode === 2) { if (k.steadfast) m += 2; if (S.places[f.p] === 'wall') m += 1; }
  return m;
}
function mights(S, i) { const m = S.pb[i].slice(); for (const f of S.figs) if (f.p === i) m[f.o] += might(S, f, 0); return m; }
function holderM(S, i, m) {
  let mx = 0, who = -1, n = 0; for (let o = 0; o < S.N; o++) { if (m[o] > mx) { mx = m[o]; who = o; n = 1; } else if (m[o] === mx) n++; }
  if (mx > 0 && n === 1) return who;
  const tied = []; for (let o = 0; o < S.N; o++) if (m[o] === mx) tied.push(o);
  if (mx > 0) { const cl = tied.filter(o => S.P[o].guide === 'cleopatra' && S.figs.some(f => f.p === i && f.o === o)); if (cl.length === 1) return cl[0]; }
  if (isGate(S, i) && tied.indexOf(i >> 1) >= 0) return i >> 1;
  return -1;
}
const holder = (S, i) => holderM(S, i, mights(S, i));
const cnt = (S, i, o) => { let n = 0; for (const f of S.figs) if (f.p === i && f.o === o) n++; return n; };
const room = (S, i, o) => cnt(S, i, o) < S.cfg.cap;
const hasRelic = (p, r) => p.relics.indexOf(r) >= 0;
// Legacy: with lineNear, the one who inspired you has to be at the same Place or the next one over
const near = (S, a, b) => !S.cfg.lineNear || a === b || S.adj[a].indexOf(b) >= 0 || pid(S, a) === 'silk' || pid(S, b) === 'silk';
function draw(S, o, n) { const p = S.P[o]; for (let i = 0; i < n; i++) { if (!p.deck.length && p.gone && p.gone.length) { p.deck = p.gone; p.gone = []; for (let j = p.deck.length - 1; j > 0; j--) { const q = (j * 7 + S.round * 3 + i) % (j + 1), x = p.deck[j]; p.deck[j] = p.deck[q]; p.deck[q] = x; } } if (p.deck.length) { p.hand.push(p.deck.pop()); p.drawn = (p.drawn || 0) + 1; if (S.ev) S.ev.push({ t: 'draw', o: o }); } } }
function walkDests(S, f, free) {
  const c = CARDS[f.c]; if (c.k.monument) return [];
  const out = [], P = S.P[f.o];
  if (c.k.voyager && !free) { for (let i = 0; i < S.places.length; i++) if (i !== f.p && !(pid(S, i) === 'machu' && ownerOfSpoke(S, i) !== f.o) && room(S, i, f.o)) out.push(i); return out; }
  const seen = {}; seen[f.p] = 1; let fr = [f.p];
  const steps = hasRelic(P, 'compass') && !free ? 2 : 1;
  for (let s = 0; s < steps; s++) { const nx = []; for (const a of fr) { const ns = (pid(S, a) === 'silk') ? S.places.map((_, i) => i) : S.adj[a].concat(S.places.map((x, i) => x === 'silk' ? i : -1).filter(i => i >= 0)); for (const b of ns) if (!seen[b]) { seen[b] = 1; nx.push(b); } } fr = nx; }
  // (Machu Picchu: only its own side walks in)
  for (const i in seen) { const j = +i; if (j !== f.p && !(pid(S, j) === 'machu' && ownerOfSpoke(S, j) !== f.o) && room(S, j, f.o)) out.push(j); }
  return out;
}
function costOf(S, o, ci, place) {
  const c = CARDS[ci], P = S.P[o]; let x = c.c;
  if (c.t === 'fig') { if (c.insp && S.figs.some(f => f.o === o && c.insp.indexOf(f.c) >= 0 && (place == null || near(S, place, f.p)))) x -= S.cfg.disc; if (place != null && pid(S, place) === 'timbuktu') x -= 1; }
  if (c.t === 'relic' && P.guide === 'leonardo') x -= 1;
  if (c.t === 'deed') { if (P.guide === 'franklin' && !P.uD) x -= 1; if (S.figs.some(f => f.o === o && CARDS[f.c].k.deedsLess)) x -= 1; }
  return Math.max(0, x);
}
function ko(S, f, by) {
  if (S.ev) S.ev.push({ t: 'ko', u: f.u, c: f.c, o: f.o, p: f.p, by: by ? by.u : 0 });
  S.figs.splice(S.figs.indexOf(f), 1); (S.P[f.o].gone || (S.P[f.o].gone = [])).push(f.c);
  for (const g of S.figs) if (g.li === f.u) { g.li = 0; S.P[g.o].lines--; }
  if (f.li) S.P[f.o].lines--;
  if (S.st) { S.st.ko++; if (by) { const a = CARDS[by.c], b = CARDS[f.c]; if (a.m < b.m) S.st.upsets++; S.st.ev.push([by.c, f.c, S.places[f.p]]); } }
}
function arrive(S, f) {
  const c = CARDS[f.c], o = f.o, P = S.P[o];
  if (c.k.scholar) draw(S, o, 1);
  if (c.arr) {
    const [op, n] = c.arr, en = S.figs.filter(g => g.p === f.p && g.o !== o);
    if (op === 'spark') { P.spark += n; if (S.ev) S.ev.push({ t: 'spark', o: o, n: n }); }
    if (op === 'rob') { const rn = 1 + (holder(S, f.p) >= 0 && holder(S, f.p) !== o ? 1 : 0); P.spark += rn; if (S.ev) S.ev.push({ t: 'spark', o: o, n: rn }); }
    if (op === 'stun') { en.sort((a, b) => might(S, b, 0) - might(S, a, 0)); for (let i = 0; i < Math.min(n, en.length); i++) { en[i].stun = 1; if (S.ev) S.ev.push({ t: 'stun', u: en[i].u }); } }
    if (op === 'push' && en.length) { en.sort((a, b) => might(S, a, 0) - might(S, b, 0)); const g = en[0]; if (!CARDS[g.c].k.monument && g.p !== gateOf(g.o)) { const to = stepHome(S, g); if (to >= 0 && room(S, to, g.o)) { if (S.ev) S.ev.push({ t: 'move', u: g.u, from: g.p, to: to, push: 1 }); g.p = to; g.stay = 0; } } }
  }
  if (c.insp) { const ins = S.figs.find(g => g.o === o && g !== f && c.insp.indexOf(g.c) >= 0 && near(S, f.p, g.p)); if (ins) { f.li = ins.u; P.lines++; if (S.ev) S.ev.push({ t: 'line', a: f.u, b: ins.u, o: o, ren: P.lr ? 0 : S.cfg.lineRen }); if (!P.lr) { P.renown += S.cfg.lineRen; P.lr = 1; } if (S.figs.some(g => g.o === o && CARDS[g.c].k.masterpiece)) draw(S, o, 1); if (S.st) S.st.lines++; } }   // (a line scores once a round; Michelangelo draws)
}
function stepHome(S, g) { const N = S.N, gate = gateOf(g.o), near = gate + 1; if (g.p === near) return gate; if (g.p === 2 * N) return near; if (S.adj[g.p].indexOf(near) >= 0) return near; return 2 * N; }
function putFig(S, o, ci, place) { const f = { u: S.uid++, c: ci, o, p: place, rdy: CARDS[ci].k.swift ? 1 : 0, arr: 1, tb: 0, stun: 0, stay: 0, li: 0 }; S.figs.push(f); if (S.ev) S.ev.push({ t: 'arrive', u: f.u, c: ci, o: o, p: place }); if (S.st) { S.st.plays++; if (CARDS[ci].reg === PLACES[S.places[place]].reg) S.st.home++; S.st.played[o][ci] = 1; } arrive(S, f); return f; }
function clash(S, a, d, da, dd, bonus) {
  const A = S.P[a.o], D = S.P[d.o];
  let am = might(S, a, 1, d) + (bonus || 0) + da, dm = might(S, d, 2, a) + dd;
  // the defender's Phalanx, from Spark left over last turn
  const qi = D.hand.indexOf('phalanx'); if (qi >= 0 && D.reserve >= 1 && dm <= am && dm + 2 >= am) { D.hand.splice(qi, 1); D.reserve -= 1; dm += 2; if (S.st) S.st.played[d.o].phalanx = 1; if (S.ev) S.ev.push({ t: 'quick', o: d.o, c: 'phalanx', u: d.u }); }
  A.uC = 1; a.rdy = 0; a.acted = 1; if (S.st) S.st.clash++;
  if (S.ev) S.ev.push({ t: 'clash', a: a.u, d: d.u, p: a.p, am: am, dm: dm, da: da, dd: dd });
  const here = S.places[a.p];
  const ar = A.renown, dr = D.renown;
  if (am > dm) { ko(S, d, a); if (here === 'colosseum') { A.renown++; if (S.ev) S.ev.push({ t: 'renown', o: a.o, n: 1, why: 'colosseum' }); } if (S.cfg.bounty && dr > ar) { A.renown += S.cfg.bounty; if (S.ev) S.ev.push({ t: 'renown', o: a.o, n: S.cfg.bounty, why: 'bounty' }); } } else if (dm > am) { ko(S, a, d); if (here === 'colosseum') { D.renown++; if (S.ev) S.ev.push({ t: 'renown', o: d.o, n: 1, why: 'colosseum' }); } if (S.cfg.bounty && ar > dr) { D.renown += S.cfg.bounty; if (S.ev) S.ev.push({ t: 'renown', o: d.o, n: S.cfg.bounty, why: 'bounty' }); } }
}
function byU(S, u) { for (const f of S.figs) if (f.u === u) return f; return null; }
// Every legal thing the player whose turn it is can do next
function actions(S) {
  const o = S.turn, P = S.P[o], out = [], mine = S.figs.filter(f => f.o === o), theirs = S.figs.filter(f => f.o !== o), np = S.places.length;
  const deploy = []; for (let i = 0; i < np; i++) if (room(S, i, o) && (i === gateOf(o) || cnt(S, i, o) > 0)) deploy.push(i);
  const seen = {};
  P.hand.forEach((ci, h) => {
    if (seen[ci]) return; seen[ci] = 1; const c = CARDS[ci];
    if (c.t === 'fig') { if (S.cfg.unique && mine.some(f => f.c === ci)) return;   // (one of each person on your side of the table at a time)
      for (const i of deploy) if (costOf(S, o, ci, i) <= P.spark) out.push({ t: 'fig', h, p: i }); return; }
    const x = costOf(S, o, ci); if (x > P.spark) return;
    if (c.t === 'relic') { if (P.relics.length < 2 && !hasRelic(P, ci)) out.push({ t: 'relic', h }); return; }
    const open = g => pid(S, g.p) !== 'petra';
    if (ci === 'eureka' || ci === 'caravan') out.push({ t: 'deed', h });
    else if (ci === 'decree') { for (let i = 0; i < np; i++) if (cnt(S, i, o)) out.push({ t: 'deed', h, p: i }); }
    else if (ci === 'eclipse') { for (let i = 0; i < np; i++) if (pid(S, i) !== 'petra' && theirs.some(g => g.p === i)) out.push({ t: 'deed', h, p: i }); }
    else if (ci === 'encore') { for (const f of mine) if (!f.rdy) out.push({ t: 'deed', h, u: f.u }); }
    else if (ci === 'fairwinds') { for (const f of mine) if (!CARDS[f.c].k.monument) for (let i = 0; i < np; i++) if (i !== f.p && room(S, i, o)) out.push({ t: 'deed', h, u: f.u, p: i }); }
    else if (ci === 'ambush') { for (const f of mine) for (const g of theirs) if (g.p === f.p && open(g) && !CARDS[g.c].k.untouchable) out.push({ t: 'deed', h, u: f.u, v: g.u }); }
    else if (ci === 'trojan') { P.hand.forEach((cj, h2) => { if (h2 !== h && CARDS[cj].t === 'fig' && CARDS[cj].c <= 3) for (let i = 0; i < np; i++) if (room(S, i, o)) out.push({ t: 'deed', h, h2, p: i }); }); }
    else if (ci === 'rift') { for (const f of mine) for (const g of S.figs) if (g.p !== f.p && g.u !== f.u && !CARDS[f.c].k.monument && !CARDS[g.c].k.monument && (g.o === o ? g.u > f.u : open(g)) && (g.o === o || (room(S, g.p, o) && room(S, f.p, g.o)))) out.push({ t: 'deed', h, u: f.u, v: g.u }); }
  });
  const ph = P.hand.indexOf('phalanx') >= 0 && costOf(S, o, 'phalanx') <= P.spark;
  for (const f of mine) {
    const can = f.rdy && (!f.arr || CARDS[f.c].k.swift), canClash = can || (S.cfg.rush && f.arr && !f.acted);
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
function apply(S, a, da, dd) {
  const o = S.turn, P = S.P[o];
  if (a.t === 'fig') { const ci = P.hand[a.h]; P.spark -= costOf(S, o, ci, a.p); P.hand.splice(a.h, 1); putFig(S, o, ci, a.p); }
  else if (a.t === 'relic') { const ci = P.hand[a.h]; P.spark -= costOf(S, o, ci); P.hand.splice(a.h, 1); P.relics.push(ci); if (S.ev) S.ev.push({ t: 'relic', o: o, c: ci }); if (S.st) S.st.played[o][ci] = 1; if (S.figs.some(f => f.o === o && CARDS[f.c].k.eureka)) draw(S, o, 1); }
  else if (a.t === 'walk') { const f = byU(S, a.u); const far = S.adj[f.p].indexOf(a.p) < 0; moveFig(S, f, a.p, far); f.rdy = 0; }
  else if (a.t === 'antik') { const f = byU(S, a.u); moveFig(S, f, a.p, true); f.rdy = 0; P.uA = 1; }
  else if (a.t === 'tub') { moveFig(S, byU(S, a.u), a.p, false); P.uT = 1; }
  else if (a.t === 'clash') { const f = byU(S, a.u), g = byU(S, a.v); if (a.ph) { const h = P.hand.indexOf('phalanx'); P.spark -= costOf(S, o, 'phalanx'); P.hand.splice(h, 1); P.uD = 1; f.tb += 2; if (S.st) S.st.played[o].phalanx = 1; if (S.ev) S.ev.push({ t: 'quick', o: o, c: 'phalanx', u: f.u, att: 1 }); } clash(S, f, g, da, dd, 0); }
  else if (a.t === 'deed') {
    const ci = P.hand[a.h]; P.spark -= costOf(S, o, ci); P.uD = 1; if (S.st) S.st.played[o][ci] = 1; if (S.ev) S.ev.push({ t: 'deed', o: o, c: ci, p: a.p, u: a.u, v: a.v });
    let h2c = a.h2 != null ? P.hand[a.h2] : null;
    if (a.h2 != null) { P.hand.splice(Math.max(a.h, a.h2), 1); P.hand.splice(Math.min(a.h, a.h2), 1); } else P.hand.splice(a.h, 1);
    if (ci === 'eureka') draw(S, o, 2);
    else if (ci === 'caravan') P.spark += 3;
    else if (ci === 'decree') S.pb[a.p][o] += 4;
    else if (ci === 'eclipse') { for (const g of S.figs) if (g.p === a.p && g.o !== o) g.stun = 1; }
    else if (ci === 'encore') { const f = byU(S, a.u); f.rdy = 1; f.arr = 0; }
    else if (ci === 'fairwinds') { const f = byU(S, a.u); moveFig(S, f, a.p, true); f.rdy = 0; }
    else if (ci === 'ambush') { const f = byU(S, a.u), g = byU(S, a.v), r = f.rdy; clash(S, f, g, da, dd, 1); if (byU(S, a.u)) f.rdy = r; }
    else if (ci === 'trojan') putFig(S, o, h2c, a.p);
    else if (ci === 'rift') { const f = byU(S, a.u), g = byU(S, a.v), t = f.p; moveFig(S, f, g.p, true); moveFig(S, g, t, true); }
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
    const w = ownerOfSpoke(S, i), kind = w < 0 ? 2 : w === me ? (isGate(S, i) ? 0 : 1) : (isGate(S, i) ? 4 : 3);
    const val = (pid(S, i) === 'acropolis' ? 2 : 1) * prof.pos[kind] * stake(cfg, S.round), d = m[me] - ob;
    v += val * (h === me ? 1 : h >= 0 ? -1 : 0) + val * 0.25 * Math.max(-4, Math.min(4, d));
    if (kind === 0 && h !== me) v -= 2.5; if (kind === 4 && h === me) v += prof.wSeal * 0.6;
  }
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
  novice: { pos: [1, 1, 1, 1, 1], wRen: 1, wSeal: 2, wFig: 0.3, wLine: 0.5, noise: 2.5 },
};
function valueOf(S, a, me, prof) {
  const roll = a.t === 'clash' || (a.t === 'deed' && S.P[me].hand[a.h] === 'ambush');
  if (!roll) { const T = clone(S); apply(T, a, 0, 0); return evalS(T, me, prof); }
  let s = 0; const D = S.cfg.die; for (const x of D) for (const y of D) { const T = clone(S); apply(T, a, x, y); s += evalS(T, me, prof); } return s / (D.length * D.length);
}
// The robot's next step (null: it's done for the turn)
function aiPick(S, prof, R) {
  const me = S.turn; let best = null, bv = evalS(S, me, prof) + 0.02;
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
    const nf = S.figs.length; apply(S, best, D[(R() * D.length) | 0], D[(R() * D.length) | 0]);
    if (S.cfg.trace && S.figs.length < nf) S.cfg.trace.push('     knocked out! ' + S.figs.length + ' figures left');
  }
}
function startTurn(S) {
  const o = S.turn, P = S.P[o], cfg = S.cfg;
  for (const f of S.figs) if (f.o === o) { f.rdy = f.stun ? 0 : 1; f.stun = 0; f.arr = 0; f.acted = 0; }
  P.uA = P.uT = P.uD = P.uC = 0;
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
    const h = holder(S, i); if (h < 0) continue; const P = S.P[h], val = (pid(S, i) === 'acropolis' ? 2 : 1) * stake(cfg, S.round);
    if (cfg.scoring === 'round') P.renown += val; else if (last) P.renown += 3 * val;
    if (S.ev) S.ev.push({ t: 'hold', p: i, o: h, n: val });
    if (pid(S, i) === 'library') draw(S, h, 1); if (pid(S, i) === 'stonehenge') P.sb = 1;
    if (isGate(S, i) && (i >> 1) !== h && S.P[i >> 1].seals > 0) { S.P[i >> 1].seals--; P.broke++; P.renown += cfg.sealRen; if (S.st) S.st.sealBreaks++; if (S.ev) S.ev.push({ t: 'seal', o: i >> 1, by: h, left: S.P[i >> 1].seals }); }
  }
  if (cfg.majority) { const hc = new Array(N).fill(0); for (let i = 0; i < S.places.length; i++) { const h = holder(S, i); if (h >= 0) hc[h]++; } let mx = 0, w = -1, tie = false; for (let o = 0; o < N; o++) { if (hc[o] > mx) { mx = hc[o]; w = o; tie = false; } else if (hc[o] === mx) tie = true; } if (!tie && w >= 0) S.P[w].renown += cfg.majority * stake(cfg, S.round); }
  for (const f of S.figs) { const k = CARDS[f.c].k; if ((k.stage || k.tale) && holder(S, f.p) === f.o) { if (k.stage) { S.P[f.o].renown++; if (S.ev) S.ev.push({ t: 'renown', o: f.o, n: 1, why: 'stage', u: f.u }); } else draw(S, f.o, 1); } f.stay++; }
  for (const b of S.pb) b.fill(0); for (const p of S.P) p.lr = 0;
  if (S.st) { let l = -1, mx = -1, tie = false; for (let o = 0; o < N; o++) { if (S.P[o].renown > mx) { mx = S.P[o].renown; l = o; tie = false; } else if (S.P[o].renown === mx) tie = true; } S.st.lead.push(tie ? -1 : l); }
  if (cfg.target && S.P.some(p => p.renown >= cfg.target)) last = true;
  if (N === 2) for (let o = 0; o < 2; o++) if (S.P[o].seals <= 0) { S.over = true; S.winner = 1 - o; S.how = 'seals'; return; }
  if (last) {
    S.over = true; S.how = 'renown'; const key = o => S.P[o].renown * 1e4 + S.P[o].broke * 100 + S.figs.filter(f => f.o === o).reduce((s, f) => s + might(S, f, 0), 0);
    let mx = -1, w = -1, tie = false; for (let o = 0; o < N; o++) { const k = key(o); if (k > mx) { mx = k; w = o; tie = false; } else if (k === mx) tie = true; } S.winner = tie ? -1 : w;
  } else S.round++;
}
function play(decks, guides, profs, cfg, seed) {
  const R = rng(seed), S = newGame(decks, guides, cfg, R), N = S.N;
  while (!S.over) {
    const first = firstOf(S);
    for (let k = 0; k < N && !S.over; k++) { S.turn = (first + k) % N; startTurn(S); aiTurn(S, profs[S.turn], R); endTurn(S); }
    if (!S.over) { endRound(S); if (S.cfg.trace) S.cfg.trace.push('== end of round ' + (S.over && S.how === 'renown' ? S.cfg.rounds : S.over ? S.round : S.round - 1) + ': renown ' + S.P.map(p => p.renown) + ' seals ' + S.P.map(p => p.seals) + ' holders ' + S.places.map((x, i) => PLACES[x].n.split(' ').pop() + ':' + holder(S, i)).join(' ')); }
  }
  return S;
}
return { play, PROF, rng, shuffle, DEF, STD, newGame, clone, actions, apply, evalS, mights, holder, holderM, might, costOf, walkDests, cnt, room, stake, gateOf, isGate, ownerOfSpoke, enemySide, byU,
  startTurn, endTurn, endRound, firstOf, aiPick, aiTurn, discard, CARDS, PLACES };
});
