import sys
path = sys.argv[1]
s = open(path, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:90])
    s = s.replace(old, new)

rep("// Anoria rules simulator: the whole game as code,", "// PLACES PROTOTYPE: a copy of games/anoria/engine.js with each player's own stack of Places behind cfg switches\n// (scripts/anoria/places/README.md). With no stacks handed to newGame it plays exactly as the game's engine does.\n// Anoria rules simulator: the whole game as code,")
rep("factory(require('./cards'))", "factory(require('./cards-places'))")

HELP = r"""const pid = (S, i) => S.places[i];
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
    if (S.nul[i]) return '';
    if (S.cyn) for (const f of S.figs) if (f.p === i && CARDS[f.c].k.cynic && !prot(S, i, f.o)) return '';
    const e = S.cfg.edge; if (o != null && e && (e === 'powerAll' || (e === 'power' && i === 2 * S.N)) && S.pown[i] !== o) return '';
  }
  return p;
}
// The Renown a Place scores for the player who holds it
function rv(S, i, h) { const w = pw(S, i, h); if (w === 'double') return 2; if (w === 'crowd' && cnt(S, i, h) >= 2) return S.cfg.dom === 'pair' && pairOf(S, h, i) ? 3 : 2; return 1; }
// Does this player hold a Place with this rule (the spot + 1, or 0); do they hold this Place and another of its domain
function holds(S, o, w) { for (let i = 0; i < S.places.length; i++) if (pw(S, i, o) === w && holder(S, i) === o) return i + 1; return 0; }
function pairOf(S, o, i) { if (holder(S, i) !== o) return 0; const d = PLACES[S.places[i]].d; for (let j = 0; j < S.places.length; j++) if (j !== i && PLACES[S.places[j]].d === d && holder(S, j) === o) return 1; return 0; }
function dshuf(a, s) { s = (s * 2654435761) >>> 0; for (let i = a.length - 1; i > 0; i--) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const j = (s >>> 8) % (i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
// The top card of a player's Place stack. An empty stack is made again from that player's Place discard pile.
function popTop(S, o) { const P = S.P[o]; if (!P.pst.length) { if (!P.pgone.length) return null; P.pst = dshuf(P.pgone, S.uid * 31 + S.round); P.pgone = []; if (S.st) S.st.pout[o]++; } const id = P.pst.pop(); if (S.st && !P.pst.length) S.st.pzero[o] = 1; return id; }
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
const PV = { spark: [1.2, 0.7, 0.5], cheap: [1.5, 0.5, 0.3], forge: [0.5, 0.4, 0.3], arms: [0.3, 0.5, 0.5], draw: [1, 0.6, 0.5], line: [0.4, 0.4, 0.3], fort: [0.4, 0.7, 0.3], closed: [0.5, 0.8, 0], narrow: [0.2, 0.2, 0], crowd: [0, 0.5, 1], arena: [0, 0.3, 0.4], seal: [0, 0.8, 0.5], sanctuary: [0.1, 0.2, 0.1], link: [-0.5, 0, 0.3], road: [0.8, 0.3, 0.2] };
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
  setPlace(S, 2 * N, hub, d);
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
  if (cfg.dom === 'all' && na >= (cfg.domMin || 1)) { const a = nd[0] === na, b = nd[1] === na; if (a !== b) S.domWin = a ? 0 : 1; }
}
// What the robots think Places' rules and domains are worth (on top of Might, which they already count)
function pval(S, me, hs) { let v = 0; const cfg = S.cfg, dm = [{}, {}], nd = [0, 0], all = {}; let na = 0;
  for (let i = 0; i < hs.length; i++) { const h = hs[i], d = PLACES[S.places[i]].d; if (!all[d]) { all[d] = 1; na++; } if (h < 0) continue; const s = h === me ? 1 : -1, w = pw(S, i, h);
    if (w === 'draw') v += 0.5 * s; else if (w === 'spark') v += 0.6 * s; else if (w === 'forge') v += 0.3 * s; else if (w === 'seal') v += 0.4 * s;
    if (!dm[h][d]) { dm[h][d] = 1; nd[h]++; } }
  if (cfg.dom === 'three') { const k = cfg.domN || 3; for (let o = 0; o < 2; o++) if (nd[o] >= k) v += o === me ? 1 : -1; }
  if (cfg.dom === 'all' && na >= (cfg.domMin || 1)) { v += 0.8 * (nd[me] - nd[1 - me]); for (let o = 0; o < 2; o++) if (nd[o] === na && nd[1 - o] !== na) v += o === me ? 12 : -12; }
  return v; }
// A robot weighing a card that turns up a Place it can't see yet shuffles the stacks in its head (it knows what is in
// a stack, not the order) and takes the average of a few tries.
function hidden(S, a) { const P = S.P[S.turn]; if (a.t === 'fig') { const c = CARDS[P.hand[a.h]]; return !!(c.arr && (c.arr[0] === 'scout' || (a.x && (c.arr[0] === 'found' || c.arr[0] === 'conquer')))); } if (a.t === 'deed') { const ci = P.hand[a.h]; return ci === 'earthquake' || ci === 'caperoute'; } return false; }
function mix(T, k) { for (let o = 0; o < T.N; o++) dshuf(T.P[o].pst, T.uid * 131 + k * 7 + o + T.round * 13 + T.P[o].pst.length); }
function settle(T, prof) { for (let g = 0; T.pend && g < 4; g++) { const o = T.pend.o; let best = null, bv = -1e9; for (const a of pendActions(T)) { const U = clone(T); pendApply(U, a); const v = evalS(U, o, prof); if (v > bv) { bv = v; best = a; } } pendApply(T, best); } }"""
rep("const pid = (S, i) => S.places[i];", HELP)

# might
rep("  if (S.places[f.p] === 'globe' && c.f === 'A') m += 1;", "  const w = pw(S, f.p, f.o); if (w && w === FAC[c.f]) m += 1;\n  if (S.pown && S.cfg.edge === 'might' && f.p === 2 * S.N && S.pown[f.p] === f.o) m += 1;   // (test rule: +1 Might at the Crossroads for the player whose Place it is)")
rep("if (S.places[f.p] === 'wall') m += 1;", "if (w === 'fort') m += S.cfg.fortN || 1;")
# holder
rep("  if (isGate(S, i) && tied.indexOf(i >> 1) >= 0) return i >> 1;", "  if (S.pown && i === 2 * S.N && S.cfg.edge && tied.indexOf(S.pown[i]) >= 0) { const e = S.cfg.edge, w = S.pown[i]; if (e === 'ties0' || (e === 'ties' && mx > 0 && S.figs.some(f => f.p === i && f.o === w))) return w; }   // (test rule: the player whose Place the Crossroads is wins ties there)\n  if (isGate(S, i) && tied.indexOf(i >> 1) >= 0) return i >> 1;")
rep("const room = (S, i, o) => cnt(S, i, o) < S.cfg.cap;", "const room = (S, i, o) => cnt(S, i, o) < (S.pown && pw(S, i) === 'narrow' ? 2 : S.cfg.cap);")
rep("pid(S, a) === 'silk' || pid(S, b) === 'silk'", "pw(S, a) === 'link' || pw(S, b) === 'link'")
rep("p.hand.push(p.deck.pop());", "const dc = p.deck.pop(); p.hand.push(dc); if (S.st) S.st.seenC[o][dc] = 1;")
# walkDests
rep("if (i !== f.p && !(pid(S, i) === 'machu' && ownerOfSpoke(S, i) !== f.o) && room(S, i, f.o)) out.push(i); return out; }", "if (i !== f.p && !(pw(S, i) === 'closed' && ownerOfSpoke(S, i) !== f.o) && room(S, i, f.o)) out.push(i); return out; }")
rep("const ns = (pid(S, a) === 'silk') ? S.places.map((_, i) => i) : S.adj[a].concat(S.places.map((x, i) => x === 'silk' ? i : -1).filter(i => i >= 0));", "const ns = (pw(S, a, f.o) === 'link') ? S.places.map((_, i) => i) : S.adj[a].concat(S.places.map((x, i) => pw(S, i, f.o) === 'link' ? i : -1).filter(i => i >= 0));")
rep("if (j !== f.p && !(pid(S, j) === 'machu' && ownerOfSpoke(S, j) !== f.o) && room(S, j, f.o)) out.push(j); }", "if (j !== f.p && !(pw(S, j) === 'closed' && ownerOfSpoke(S, j) !== f.o) && room(S, j, f.o)) out.push(j); }")
# threads
rep("function threadPlay(S, o, ci, src, u) {\n  const P = S.P[o]; if (!src) return;\n  const ren = S.cfg.threads === 3 || P.lr ? 0 : S.cfg.lineRen;", "function threadPlay(S, o, ci, src, u, pl) {\n  const P = S.P[o]; if (!src) return;\n  let ren = S.cfg.threads === 3 || P.lr ? 0 : S.cfg.lineRen; if (ren && pl != null && S.pown && pw(S, pl, o) === 'line') ren += 1;")
# costOf
rep("if (place != null && pid(S, place) === 'timbuktu') x -= 1;", "if (place != null && pw(S, place, o) === 'cheap') x -= S.cfg.dom === 'pair' && S.pown && pairOf(S, o, place) ? 2 : 1;")
rep("  if (c.t === 'relic' && P.guide === 'leonardo') x -= 1;", "  if (c.t === 'relic' && P.guide === 'leonardo') x -= 1;\n  if (c.t !== 'fig' && S.pown) { const fg = holds(S, o, 'forge'); if (fg) x -= S.cfg.dom === 'pair' && pairOf(S, o, fg - 1) ? 2 : 1; }")
# ko
rep("  S.figs.splice(S.figs.indexOf(f), 1);\n  (S.P[f.o].gone", "  S.figs.splice(S.figs.indexOf(f), 1); if (CARDS[f.c].k.cynic) S.cyn--;\n  (S.P[f.o].gone")
# arrive
rep("function arrive(S, f) {", "function arrive(S, f, x) {")
rep("  if (c.k.scholar) draw(S, o, 1);\n", "  if (c.k.scholar) draw(S, o, 1);\n  if (S.pown && pw(S, f.p, o) === 'arms') f.tb += S.cfg.dom === 'pair' && pairOf(S, o, f.p) ? 2 : 1;\n")
rep("    const [op, n] = c.arr, en = S.figs.filter(g => g.p === f.p && g.o !== o);\n", """    const [op, n] = c.arr, en = S.figs.filter(g => g.p === f.p && g.o !== o);
    if (S.pown) {   // (the cards that act on Places)
      if (op === 'scout') { const ids = []; for (let i = 0; i < n; i++) { const id = popTop(S, o); if (id == null) break; ids.push(id); } if (ids.length) S.pend = { k: 'scout', o: o, ids: ids }; }
      if (op === 'survey' && P.pst.length) S.pend = { k: 'survey', o: o, ids: P.pst.slice() };
      if (op === 'rebuild' && P.pgone.length) S.pend = { k: 'rebuild', o: o, ids: P.pgone.slice() };
      if (op === 'found' && x) { const id = turnPlace(S, o); if (id) setPlace(S, 2 * S.N, id, o); }
      if (op === 'conquer' && x && enemySide(S, o, f.p) && !prot(S, f.p, o)) { const w = f.p >> 1, id = turnPlace(S, w); if (id) setPlace(S, f.p, id, w); }
    }
""")
rep("if (!P.lr) { P.renown += S.cfg.lineRen; P.lr = 1; }", "if (!P.lr) { P.renown += S.cfg.lineRen + (S.pown && pw(S, f.p, o) === 'line' ? 1 : 0); P.lr = 1; }")
rep("if (!f.li) threadPlay(S, o, f.c, threadSrc(S, o, f.c, f.p), f.u);", "if (!f.li) threadPlay(S, o, f.c, threadSrc(S, o, f.c, f.p), f.u, f.p);")
# putFig
rep("function putFig(S, o, ci, place) { const f = { u: S.uid++, c: ci, o, p: place, rdy: CARDS[ci].k.swift ? 1 : 0, arr: 1,", "function putFig(S, o, ci, place, x) { const rd = S.pown && pw(S, place, o) === 'road' ? 1 : 0, f = { u: S.uid++, c: ci, o, p: place, rdy: CARDS[ci].k.swift || rd ? 1 : 0, sw: rd, arr: 1,")
rep("S.figs.push(f); if (S.ev) S.ev.push({ t: 'arrive'", "S.figs.push(f); if (CARDS[ci].k.cynic) S.cyn = (S.cyn || 0) + 1; if (S.ev) S.ev.push({ t: 'arrive'")
rep("arrive(S, f); return f; }", "arrive(S, f, x); return f; }")
# clash
rep("  const here = S.places[a.p];\n", "  const arn = o => pw(S, a.p, o) === 'arena' ? (S.cfg.dom === 'pair' && S.pown && pairOf(S, o, a.p) ? 2 : 1) : 0, arA = arn(a.o), arD = arn(d.o);\n")
rep("if (here === 'colosseum') { A.renown++; if (S.ev) S.ev.push({ t: 'renown', o: a.o, n: 1, why: 'colosseum' }); }", "if (arA) { A.renown += arA; if (S.ev) S.ev.push({ t: 'renown', o: a.o, n: arA, why: 'colosseum' }); }")
rep("if (here === 'colosseum') { D.renown++; if (S.ev) S.ev.push({ t: 'renown', o: d.o, n: 1, why: 'colosseum' }); }", "if (arD) { D.renown += arD; if (S.ev) S.ev.push({ t: 'renown', o: d.o, n: arD, why: 'colosseum' }); }")
# actions
rep("function actions(S) {\n  const o = S.turn,", "function actions(S) {\n  if (S.pend) return pendActions(S);\n  const o = S.turn,")
rep("for (const i of deploy) if (costOf(S, o, ci, i) <= P.spark) out.push({ t: 'fig', h, p: i }); return; }", "for (const i of deploy) if (costOf(S, o, ci, i) <= P.spark) { out.push({ t: 'fig', h, p: i }); if (S.pown && c.arr && ((c.arr[0] === 'found' && canTurn(S, o)) || (c.arr[0] === 'conquer' && enemySide(S, o, i) && !prot(S, i, o) && canTurn(S, i >> 1)))) out.push({ t: 'fig', h, p: i, x: 1 }); } return; }")
rep("const open = g => pid(S, g.p) !== 'petra';", "const open = g => pw(S, g.p, g.o) !== 'sanctuary';")
rep("if (pid(S, i) !== 'petra' && theirs.some(g => g.p === i))", "if (pw(S, i, (o + 1) % S.N) !== 'sanctuary' && theirs.some(g => g.p === i))")
rep("(g.o === o || (room(S, g.p, o) && room(S, f.p, g.o)))) out.push({ t: 'deed', h, u: f.u, v: g.u }); }\n", """(g.o === o || (room(S, g.p, o) && room(S, f.p, g.o)))) out.push({ t: 'deed', h, u: f.u, v: g.u }); }
    else if (!S.pown) return;
    else if (ci === 'earthquake') { for (let i = 0; i < 2 * S.N; i++) if (!prot(S, i, o) && canTurn(S, i >> 1)) out.push({ t: 'deed', h, p: i }); }
    else if (ci === 'vesuvius') { for (let i = 0; i < np; i++) if (!S.nul[i] && pw(S, i) && !prot(S, i, o)) out.push({ t: 'deed', h, p: i }); }
    else if (ci === 'caperoute') { if (canTurn(S, o)) out.push({ t: 'deed', h }); }
""")
rep("const can = f.rdy && (!f.arr || CARDS[f.c].k.swift),", "const can = f.rdy && (!f.arr || CARDS[f.c].k.swift || f.sw),")
# apply
rep("  const o = S.turn, P = S.P[o];\n  if (a.t === 'fig') { const ci = P.hand[a.h]; P.spark -= costOf(S, o, ci, a.p); P.uN++; P.hand.splice(a.h, 1); putFig(S, o, ci, a.p); }", "  const o = S.turn, P = S.P[o];\n  if (a.t === 'pp') { pendApply(S, a); return; }\n  if (a.t === 'fig') { const ci = P.hand[a.h]; P.spark -= costOf(S, o, ci, a.p); P.uN++; P.hand.splice(a.h, 1); putFig(S, o, ci, a.p, a.x); }")
rep("moveFig(S, f, g.p, true); moveFig(S, g, t, true); }\n", """moveFig(S, f, g.p, true); moveFig(S, g, t, true); }
    else if (ci === 'earthquake') { const w = a.p >> 1, id = turnPlace(S, w); if (id) setPlace(S, a.p, id, w); }
    else if (ci === 'vesuvius') S.nul[a.p] = 1;
    else if (ci === 'caperoute') { const id = turnPlace(S, o); if (id) setPlace(S, 2 * S.N, id, o); }
""")
# evalS
rep("  for (let o = 0; o < N; o++) if (o !== me && S.P[o].renown > best) best = S.P[o].renown;\n", "  for (let o = 0; o < N; o++) if (o !== me && S.P[o].renown > best) best = S.P[o].renown;\n  const hs = S.pown && N === 2 ? [] : null;\n")
rep("const val = (pid(S, i) === 'acropolis' ? 2 : 1) * prof.pos[kind] * stake(cfg, S.round), d = m[me] - ob;", "const val = (h >= 0 ? rv(S, i, h) : pw(S, i) === 'double' ? 2 : 1) * prof.pos[kind] * stake(cfg, S.round), d = m[me] - ob; if (hs) hs.push(h);")
rep("  for (const f of S.figs) { const m = might(S, f, 0); if (f.o === me) { cm++; tm += m; } else { co++; to += m; } }", "  if (hs) v += pval(S, me, hs);\n  for (const f of S.figs) { const m = might(S, f, 0); if (f.o === me) { cm++; tm += m; } else { co++; to += m; } }")
# endRound
rep("const P = S.P[h], val = (pid(S, i) === 'acropolis' ? 2 : 1) * stake(cfg, S.round);", "const P = S.P[h], val = rv(S, i, h) * stake(cfg, S.round);")
rep("if (pid(S, i) === 'library') draw(S, h, 1); if (pid(S, i) === 'stonehenge') P.sb = 1;", "const w = pw(S, i, h), dbl = cfg.dom === 'pair' && S.pown && pairOf(S, h, i) ? 2 : 1; if (w === 'draw') draw(S, h, dbl); if (w === 'spark') P.sb += dbl;")
rep("if (isGate(S, i) && (i >> 1) !== h && S.P[i >> 1].seals > 0) {", "if (isGate(S, i) && (i >> 1) !== h && S.P[i >> 1].seals > 0 && S.pown && holds(S, i >> 1, 'seal')) { if (S.st) S.st.sealSaved++; }   // (a Law Place: while you hold it, your Seals cannot be broken)\n    else if (isGate(S, i) && (i >> 1) !== h && S.P[i >> 1].seals > 0) {")
rep("  if (cfg.majority) {", "  if (S.pown && cfg.dom && N === 2) domination(S);\n  if (cfg.majority) {")
rep("  if (N === 2) for (let o = 0; o < 2; o++) if (S.P[o].seals <= 0) {", "  if (S.domWin != null) { S.over = true; S.winner = S.domWin; S.how = 'domains'; return; }\n  if (N === 2) for (let o = 0; o < 2; o++) if (S.P[o].seals <= 0) {")
# clone
rep("places: S.places, adj: S.adj,", "places: S.pown ? S.places.slice() : S.places, pown: S.pown ? S.pown.slice() : null, nul: S.nul ? S.nul.slice() : null, cyn: S.cyn, pend: S.pend, adj: S.adj,")
rep("relics: p.relics.slice(), gone: p.gone ? p.gone.slice() : null }))", "relics: p.relics.slice(), gone: p.gone ? p.gone.slice() : null, pst: p.pst ? p.pst.slice() : null, pgone: p.pgone ? p.pgone.slice() : null }))")
# newGame
rep("function newGame(decks, guides, cfg, R) {", "function newGame(decks, guides, cfg, R, stacks) {")
rep("sealBreaks: 0, upsets: 0 } };", "sealBreaks: 0, upsets: 0, seenC: decks.map(() => ({})), turned: decks.map(() => 0), seenP: decks.map(() => ({})), pout: decks.map(() => 0), pzero: decks.map(() => 0), set: [], picked: {}, repl: 0, replHub: 0, pdup: 0, domR: decks.map(() => 0), domAhead: 0, domBehind: 0, sealSaved: 0 } };")
rep("lines: 0 });\n  }\n  return S;", "lines: 0 });\n    for (const c of hand) S.st.seenC[p][c] = 1;\n  }\n  if (cfg.stacks && stacks) setupPlaces(S, stacks, R, decks);\n  return S;")
# robots
rep("  if (!roll) { const T = clone(S); apply(T, a, 0, 0); return evalS(T, me, prof); }", """  if (!roll && !S.pown) { const T = clone(S); apply(T, a, 0, 0); return evalS(T, me, prof); }
  if (!roll) { const K = hidden(S, a) ? (S.cfg.ksamp || 3) : 1; let s = 0;
    for (let k = 0; k < K; k++) { const T = clone(S); if (K > 1) mix(T, k); apply(T, a, 0, 0); if (T.pend) settle(T, prof); s += evalS(T, me, prof); }
    return s / K; }""")
rep("  const me = S.turn; let best = null, bv = evalS(S, me, prof) + 0.02;\n", "  const me = S.turn;\n  if (S.pend) { let pb = null, pv = -1e9; for (const a of pendActions(S)) { const T = clone(S); pendApply(T, a); let v = evalS(T, me, prof); if (prof.noise) v += (R() - 0.5) * prof.noise; if (v > pv) { pv = v; pb = a; } } return pb; }   // (a Place to choose)\n  let best = null, bv = evalS(S, me, prof) + 0.02;\n")
rep("    if (S.cfg.trace && S.figs.length < nf) S.cfg.trace.push('     knocked out! ' + S.figs.length + ' figures left');\n  }\n", "    if (S.cfg.trace && S.figs.length < nf) S.cfg.trace.push('     knocked out! ' + S.figs.length + ' figures left');\n  }\n  if (S.pend) pendApply(S, { t: 'pp', no: 1 });\n")
rep("function play(decks, guides, profs, cfg, seed) {\n  const R = rng(seed), S = newGame(decks, guides, cfg, R), N = S.N;", "function play(decks, guides, profs, cfg, seed, stacks) {\n  const R = rng(seed), S = newGame(decks, guides, cfg, R, stacks), N = S.N;")
rep("startTurn, endTurn, endRound, firstOf, aiPick, aiTurn, discard, diceOdds, rollClash, threadSrc, fxOf, CARDS, PLACES };", "startTurn, endTurn, endRound, firstOf, aiPick, aiTurn, discard, diceOdds, rollClash, threadSrc, fxOf, CARDS, PLACES, pw, rv, holds, setPlace, turnPlace, placeScore, deckInfo, PV };")
open(path, 'w', encoding='utf-8').write(s)
print('ok')
