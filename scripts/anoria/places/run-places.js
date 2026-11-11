// Test games for Places as each player's own stack.   node scripts/anoria/places/run-places.js <experiment> [games per pairing]
//   base    today's Places beside the recommended rules (length, how games end, first turn, the five ready decks)
//   setup   how the Gate, the Outpost and the Crossroads are chosen
//   edge    what the player whose Place lies at the Crossroads gets, and what the other player gets in return
//   stack   stacks of 6 to 20 Places with few, some and many Place cards in the deck
//   domin   the rules for holding Places of several domains
//   powers  every Place rule at a Gate, an Outpost and the Crossroads (who wins with it there)
//   cards   the ten Place cards in random decks, at three costs each     [games, not per pairing]
//   use     how the robots use each Place card
// Every cell is the five ready decks against each other, both seats (20 pairings x the games asked for), each deck
// played in its own style, under first to 25 Renown or three Seals. Four cells run at a time.
'use strict';
const { Worker, isMainThread, parentPort } = require('worker_threads');
const { play, PROF, STD, rng, shuffle } = require('./engine-places'), C = require('./cards-places');
const { ARCH, STACKS, NEW, CARDS, PLACES, ALLPLACES, GUIDES, DOMAINS } = C;
const D = Object.keys(ARCH), style = { Explorers: 'raider', Legion: 'brawler', Legacy: 'keeper', Court: 'holder', Pathfinders: 'raider' };
const BASE = Object.assign({}, STD, { target: 25 }), NEWK = Object.keys(NEW), FACS = ['D', 'S', 'V', 'A', 'W'], GL = Object.keys(GUIDES), PN = ['holder', 'raider', 'keeper', 'brawler'];
// The rules as recommended (RULES.md): draw three, lay two and offer the third; a roll for first dibs; the other player
// takes the first turn; the player whose Place the Crossroads is wins ties there while they have a Figure on it.
const REC = { stacks: 1, setup: 'pick3', sealRule: 'last', edge: 'ties', comp: 'first' };

function mkDeck(k, o, R) {
  const d = ARCH[k].cards.concat(ARCH[k].cards); if (!o.pc) return d;
  const add = o.cards ? o.cards.slice() : shuffle(NEWK.slice(), R).slice(0, o.pc / 2), out = shuffle(d, R).slice(0, d.length - add.length * 2);
  for (const c of add) out.push(c, c); return out;
}
function mkStack(k, o, R) {
  const ss = o.ss || 12; if (o.rstack) return shuffle(ALLPLACES.slice(), R).slice(0, ss);
  const own = shuffle(STACKS[k].slice(), R); if (ss <= own.length) return own.slice(0, ss);
  return own.concat(shuffle(ALLPLACES.filter(x => PLACES[x].stack !== k), R).slice(0, ss - own.length));
}
function randDeck(R) {
  for (;;) { const fs = shuffle(FACS.slice(), R).slice(0, 2), pool = []; for (const k in CARDS) { const c = CARDS[k]; if (fs.indexOf(c.f) >= 0 || c.f === 'N') pool.push(k, k); }
    const d = shuffle(pool, R).slice(0, 40); if (d.filter(k => CARDS[k].t === 'fig').length >= 23) return d; }
}
const bump = (m, k, w) => { const x = m[k] || (m[k] = [0, 0]); x[0]++; x[1] += w; };
function cell(job) {
  const cfg = Object.assign({}, BASE, job.cfg), o = job.opt || {}, n = job.n, keep = {};
  const r = { label: job.label, g: 0, rounds: 0, rh: {}, deck: {}, seals: 0, ren: 0, cap: 0, domWins: 0, first: 0, draws: 0, ko: 0, margin: 0, flips: 0, behind3: 0, dec3: 0, dibsW: 0, hubW: 0, hubKept: 0, th: {}, pzero: 0, pout: 0, seen: 0, pg: 0,
    repl: 0, replHub: 0, pdup: 0, sealSaved: 0, domR: 0, domAhead: 0, domBehind: 0, domDecided: 0, slot: {}, inc: {}, drawn: {}, played: {}, use: {}, picked: {}, hubD: 0, three: 0 };
  if (o.costs) for (const k in o.costs) { keep[k] = CARDS[k]; CARDS[k] = Object.assign({}, CARDS[k], { c: o.costs[k] }); }
  const one = (ka, kb, seed) => {
    const R = rng(seed * 7 + 11); let decks, guides, profs, stacks = null;
    if (o.rand) { decks = [randDeck(R), randDeck(R)]; guides = [GL[(R() * 5) | 0], GL[(R() * 5) | 0]]; profs = [PROF[PN[(R() * 4) | 0]], PROF[PN[(R() * 4) | 0]]]; if (cfg.stacks) stacks = [shuffle(ALLPLACES.slice(), R).slice(0, 12), shuffle(ALLPLACES.slice(), R).slice(0, 12)]; }
    else { decks = [mkDeck(ka, o, R), mkDeck(kb, o, R)]; guides = [ARCH[ka].guide, ARCH[kb].guide]; profs = [PROF[style[ka]], PROF[style[kb]]]; if (cfg.stacks) stacks = [mkStack(ka, o, R), mkStack(kb, o, R)]; }
    const S = play(decks, guides, profs, cfg, seed, stacks), st = S.st, w = S.winner, sc = s => w < 0 ? 0.5 : w === s ? 1 : 0;
    r.g++; r.rounds += S.round; r.rh[S.round] = (r.rh[S.round] || 0) + 1;
    if (!o.rand) { bump(r.deck, ka, sc(0)); bump(r.deck, kb, sc(1)); }
    const top = Math.max(S.P[0].renown, S.P[1].renown);
    if (S.how === 'seals') r.seals++; else if (S.how === 'domains') r.domWins++; else if (top >= cfg.target) r.ren++; else r.cap++;
    if (w === (S.f0 || 0)) r.first++; if (w < 0) r.draws++; r.ko += st.ko; r.margin += Math.abs(S.P[0].renown - S.P[1].renown);
    const L = st.lead; let last = -1; L.forEach(x => { if (x >= 0) { if (last >= 0 && x !== last) r.flips++; last = x; } });
    if (w >= 0 && L.length >= 3 && L[2] >= 0) { r.dec3++; if (L[2] !== w) r.behind3++; }
    if (S.pown) {
      const hub = 2 * S.N; if (w === S.dibs) r.dibsW++; if (w === S.pown[hub]) r.hubW++; if (S.pown[hub] === S.dibs) r.hubKept++;
      for (let s = 0; s < 2; s++) { r.pg++; r.th[st.turned[s]] = (r.th[st.turned[s]] || 0) + 1; r.pzero += st.pzero[s]; if (st.pout[s]) r.pout++; r.seen += Object.keys(st.seenP[s]).length / stacks[s].length; }
      r.repl += st.repl; r.replHub += st.replHub; r.pdup += st.pdup; r.sealSaved += st.sealSaved; r.domR += st.domR[0] + st.domR[1]; r.domAhead += st.domAhead; r.domBehind += st.domBehind;
      if (S.how === 'renown' && w >= 0 && st.domR[w] > st.domR[1 - w] && S.P[w].renown - st.domR[w] <= S.P[1 - w].renown - st.domR[1 - w]) r.domDecided++;
      const ds = {}; S.places.forEach(x => { ds[PLACES[x].d] = 1; }); r.hubD += Object.keys(ds).length;
      if (o.track) { for (let s = 0; s < 2; s++) { bump(r.slot, PLACES[st.set[s][0]].pw + '|0', sc(s)); bump(r.slot, PLACES[st.set[s][1]].pw + '|1', sc(s)); bump(r.slot, 'home ' + PLACES[st.set[s][1]].reg + '|1', sc(s)); } bump(r.slot, PLACES[st.hub0].pw + '|2', sc(S.dibs)); }
      for (const k in st.use) r.use[k] = (r.use[k] || 0) + st.use[k]; for (const k in st.picked) r.picked[k] = (r.picked[k] || 0) + st.picked[k];
    }
    if (o.rand || o.cardstat) for (let s = 0; s < 2; s++) { for (const c of new Set(decks[s])) bump(r.inc, c, sc(s)); for (const c in st.seenC[s]) bump(r.drawn, c, sc(s)); for (const c in st.played[s]) bump(r.played, c, sc(s)); }
  };
  if (o.rand) for (let i = 0; i < n; i++) one(null, null, (o.seed || 101) * 31 + i);
  else { let gi = 0; for (const a of D) for (const b of D) { if (a === b) continue; for (let i = 0; i < n; i++, gi++) { const fl = i & 1; one(fl ? b : a, fl ? a : b, (o.seed || 7000) + gi * 3); } } }
  for (const k in keep) CARDS[k] = keep[k];
  return r;
}
if (!isMainThread) { parentPort.on('message', job => parentPort.postMessage(cell(job))); return; }

// ---- the main thread: a pool of four workers, then the tables ----
function runAll(jobs) {
  return new Promise(done => { const out = new Array(jobs.length); let next = 0, left = jobs.length; if (!left) done(out);
    for (let k = 0; k < Math.min(4, jobs.length); k++) { const wk = new Worker(__filename); let cur = -1;
      const give = () => { if (next < jobs.length) { cur = next++; wk.postMessage(jobs[cur]); } else wk.terminate(); };
      wk.on('message', res => { out[cur] = res; if (!--left) done(out); give(); }); give(); } });
}
const pc = (a, b) => b ? (100 * a / b).toFixed(1) : '-', f1 = x => x.toFixed(1), pad = (s, n) => (s + ' '.repeat(n)).slice(0, n), lpad = (s, n) => (' '.repeat(n) + s).slice(-n);
const decksOf = r => { let lo = 100, hi = 0; const s = D.map(d => { const p = 100 * r.deck[d][1] / r.deck[d][0]; lo = Math.min(lo, p); hi = Math.max(hi, p); return d.slice(0, 5) + ' ' + f1(p); }).join('  '); return { s, spread: hi - lo }; };
const quant = (h, q) => { const ks = Object.keys(h).map(Number).sort((a, b) => a - b); let tot = 0, acc = 0; for (const k of ks) tot += h[k]; for (const k of ks) { acc += h[k]; if (acc >= q * tot) return k; } return ks[ks.length - 1]; };
const meanH = h => { let t = 0, s = 0; for (const k in h) { t += h[k]; s += h[k] * k; } return s / t; };
const maxH = h => Math.max.apply(null, Object.keys(h).map(Number));
const game = r => 'rounds ' + f1(r.rounds / r.g) + ' (most games ' + quant(r.rh, 0.1) + ' to ' + quant(r.rh, 0.9) + ')  ends Renown ' + pc(r.ren, r.g) + '% Seals ' + pc(r.seals, r.g) + '%' + (r.domWins ? ' domains ' + pc(r.domWins, r.g) + '%' : '') + (r.cap ? ' limit ' + pc(r.cap, r.g) + '%' : '') +
  '  first turn wins ' + pc(r.first, r.g - r.draws) + '%  lead changes ' + (r.flips / r.g).toFixed(2) + '  winner behind after round 3: ' + pc(r.behind3, r.dec3) + '%  knock-outs ' + f1(r.ko / r.g) + '  margin ' + f1(r.margin / r.g);
const n = +process.argv[3] || 100, exp = process.argv[2];
const XCFG = JSON.parse(process.argv[4] || '{}');   // (a json of rule switches added to every cell)
const J = (label, cfg, opt, m) => ({ label, cfg: Object.assign({}, cfg, XCFG), opt: opt || {}, n: m || n });
const EX = {};
EX.base = async () => {
  const rs = await runAll([J('today: one shared set of 12 Places', {}), J('today, second set of games', {}, { seed: 91000 }),
    J('own stacks, top two, no edge, seat 1 first', { stacks: 1, setup: 'top2' }), J('own stacks as recommended', REC), J('as recommended, second set', REC, { seed: 91000 }),
    J('as recommended, 2 Place cards in each deck', REC, { pc: 2 }), J('as recommended, 6 Place cards in each deck', REC, { pc: 6 })]);
  console.log('WHAT IT DOES TO THE GAME (first to 25 Renown or three Seals; ' + rs[0].g + ' games a row)');
  for (const r of rs) { const d = decksOf(r); console.log(pad(r.label, 46) + game(r) + '\n' + pad('', 46) + 'decks ' + d.s + '  spread ' + f1(d.spread) + (r.pg ? '  Places replaced a game ' + (r.repl / r.g).toFixed(2) + '  Seals saved by a Law Place ' + (r.sealSaved / r.g).toFixed(2) : '')); }
};
EX.setup = async () => {
  const V = [['top two (Gate, then Outpost), dibs turns a third', 'top2'], ['draw three, lay two, offer the third', 'pick3'], ['free choice from the whole stack', 'free']];
  const rs = await runAll(V.map(v => J(v[0], { stacks: 1, setup: v[1], sealRule: 'last' })));
  console.log('SET-UP (no edge at the Crossroads, seat 1 takes the first turn, first dibs by a roll; ' + rs[0].g + ' games a row)');
  for (const r of rs) { const d = decksOf(r); console.log(pad(r.label, 46) + 'first dibs wins ' + pc(r.dibsW, r.g - r.draws) + '%  ' + game(r) + '\n' + pad('', 46) + 'decks ' + d.s + '  spread ' + f1(d.spread) + '  a Place of yours is on the table in ' + pc(r.seen, r.pg) + '% of your games'); }
};
EX.edge = async () => {
  const E = [['no edge', null], ['wins ties there, with a Figure there', 'ties'], ['wins ties there, even empty', 'ties0'], ['their Figures have +1 Might there', 'might'], ['its rule works only for them', 'power'], ['every Place\'s rule only for its owner', 'powerAll']];
  const Cm = [['nothing in return', null], ['other player takes the first turn', 'first'], ['other player takes the second turn', 'second'], ['other player draws a card', 'card'], ['other player has 1 more Spark on turn 1', 'spark']];
  const jobs = []; for (const e of E) for (const c of Cm) { if (c[1] && e[1] !== 'ties' && !(e[1] === null && c[1] === 'first')) continue; jobs.push(J(e[0] + ' | ' + c[0], { stacks: 1, setup: 'pick3', sealRule: 'last', edge: e[1], comp: c[1] })); }
  const rs = await runAll(jobs);
  console.log('THE CROSSROADS: the player whose Place lies there (first dibs), ' + rs[0].g + ' games a cell, +/- ' + f1(100 * Math.sqrt(0.25 / rs[0].g)) + ' points\n' + pad('edge | in return', 82) + 'first dibs wins  first turn wins  ends on Seals  rounds  deck spread  Crossroads still theirs at the end');
  for (const r of rs) console.log(pad(r.label, 82) + lpad(pc(r.dibsW, r.g - r.draws) + '%', 12) + lpad(pc(r.first, r.g - r.draws) + '%', 17) + lpad(pc(r.seals, r.g) + '%', 15) + lpad(f1(r.rounds / r.g), 8) + lpad(f1(decksOf(r).spread), 13) + lpad(pc(r.hubKept, r.g) + '%', 12));
};
EX.stack = async () => {
  const jobs = []; for (const ss of [6, 8, 10, 12, 15, 20]) for (const p of [0, 2, 6, 12]) jobs.push(J(ss + '|' + p, REC, { ss, pc: p }));
  const rs = await runAll(jobs);
  console.log('STACK SIZE (' + rs[0].g + ' games a cell, ' + rs[0].pg + ' player-games). Place cards: copies in a deck of 40.\nstack  Place cards  Places a player lays (mean, 9 games in 10, most)  stack runs out  a given Place of yours is on the table  Places replaced a game  the same Place turned up by both');
  for (const r of rs) { const [ss, p] = r.label.split('|'); const sh = r.seen / r.pg;
    console.log(lpad(ss, 5) + lpad(p === '0' ? 'none' : p === '2' ? 'few (2)' : p === '6' ? 'some (6)' : 'many (12)', 13) + lpad(meanH(r.th).toFixed(2) + ', ' + quant(r.th, 0.9) + ', ' + maxH(r.th), 28) + lpad(pc(r.pzero, r.pg) + '%', 37) + lpad(pc(r.seen, r.pg) + '% of games (1 in ' + (1 / sh).toFixed(1) + ')', 34) + lpad((r.repl / r.g).toFixed(2), 18) + lpad((r.pdup / r.g).toFixed(3) + ' a game', 26)); }
};
EX.domin = async () => {
  const V = [['no rule', {}], ['3 different domains: 1 more Renown', { dom: 'three' }], ['4 different domains: 1 more Renown', { dom: 'three', domN: 4 }], ['both Places of a domain: their rules pay double', { dom: 'pair' }],
    ['a Place of every domain on the table: you win', { dom: 'all' }], ['the same, with 4 or more domains on the table', { dom: 'all', domMin: 4 }]];
  const rs = await runAll(V.map(v => J(v[0], Object.assign({}, REC, v[1]))));
  console.log('HOLDING SEVERAL DOMAINS (' + rs[0].g + ' games a row; on average ' + (rs[0].hubD / rs[0].g).toFixed(2) + ' different domains lie on the table)');
  for (const r of rs) { const d = decksOf(r); console.log(pad(r.label, 50) + game(r) + '\n' + pad('', 50) + 'decks ' + d.s + '  spread ' + f1(d.spread) +
    (r.domR ? '  bonus Renown a game ' + (r.domR / r.g).toFixed(2) + ', ' + pc(r.domAhead, r.domR) + '% of it to the player already ahead, ' + pc(r.domBehind, r.domR) + '% to the one behind; it decided ' + pc(r.domDecided, r.g) + '% of games' : '') + (r.domWins ? '  decided ' + pc(r.domWins, r.g) + '% of games' : '')); }
};
EX.powers = async () => {
  const rs = await runAll([0, 1, 2, 3].map(k => J('p' + k, { stacks: 1, setup: 'top2', sealRule: 'last' }, { rstack: 1, track: 1, seed: 20000 + k * 50000 })));
  const m = {}; for (const r of rs) for (const k in r.slot) { const x = m[k] || (m[k] = [0, 0]); x[0] += r.slot[k][0]; x[1] += r.slot[k][1]; }
  console.log('EVERY RULE AT EVERY SPOT: how often its owner wins (stacks dealt from all 60, top two with no choice, no edge; ' + rs.reduce((s, r) => s + r.g, 0) + ' games)\nrule        at your Gate        at your Outpost     at the Crossroads (yours)');
  const ws = [...new Set(Object.keys(m).map(k => k.split('|')[0]))].filter(k => k.slice(0, 5) !== 'home ').sort();
  for (const w of ws) console.log(pad(w, 12) + [0, 1, 2].map(s => { const x = m[w + '|' + s]; return pad(x ? pc(x[1], x[0]) + '% (' + x[0] + ')' : '-', 20); }).join(''));
};
EX.cards = async () => {
  const cost = d => { const o = {}; for (const k of NEWK) o[k] = Math.max(0, NEW[k].c + d); return o; };
  const rs = await runAll([J('printed cost', REC, { rand: 1 }), J('1 less', REC, { rand: 1, costs: cost(-1), seed: 202 }), J('1 more', REC, { rand: 1, costs: cost(1), seed: 303 })]);
  console.log('THE PLACE CARDS IN RANDOM DECKS (two factions, 40 cards, random Guide, style and stack of 12; ' + rs[0].g + ' games a column): the win rate of a player who drew the card\n' + pad('card', 26) + rs.map(r => pad(r.label, 26)).join('') + 'played when drawn');
  for (const k of NEWK) console.log(pad(NEW[k].n + ' [' + NEW[k].f + NEW[k].c + ']', 26) + rs.map(r => { const x = r.drawn[k]; return pad(x ? pc(x[1], x[0]) + '% (' + x[0] + ')' : '-', 26); }).join('') + pc((rs[0].played[k] || [0])[0], rs[0].drawn[k][0]) + '%');
  const r = rs[0], by = {}; for (const k in r.drawn) { if (NEW[k]) continue; const c = CARDS[k], key = (c.t === 'fig' ? 'Figures' : c.t === 'deed' ? 'Deeds' : 'Relics') + ' of cost ' + c.c, x = by[key] || (by[key] = [0, 0, 100, 0]); const p = 100 * r.drawn[k][1] / r.drawn[k][0]; x[0]++; x[1] += p; x[2] = Math.min(x[2], p); x[3] = Math.max(x[3], p); }
  console.log('\nThe game\'s own cards in the same games, by cost (win rate of a player who drew the card: average, lowest to highest)');
  for (const k of Object.keys(by).sort()) console.log('  ' + pad(k, 20) + f1(by[k][1] / by[k][0]) + '%  (' + f1(by[k][2]) + ' to ' + f1(by[k][3]) + ', ' + by[k][0] + ' cards)');
  console.log('\n' + game(r));
};
EX.use = async () => {
  const rs = await runAll(NEWK.map(k => J(k, REC, { pc: 2, cards: [k], cardstat: 1 })));
  console.log('HOW THE ROBOTS USE EACH PLACE CARD (two copies in each ready deck, ' + rs[0].g + ' games a card)\n' + pad('card', 24) + 'drawn in  played when drawn  wins when drawn  Places replaced a game   what it did');
  for (const r of rs) { const k = r.label, dr = r.drawn[k] || [0, 0], pl = r.played[k] || [0, 0];
    console.log(pad(NEW[k].n, 24) + lpad(pc(dr[0], r.pg) + '%', 8) + lpad(pc(pl[0], dr[0]) + '%', 19) + lpad(pc(dr[1], dr[0]) + '%', 16) + lpad((r.repl / r.g).toFixed(2), 24) + '   ' + Object.keys(r.use).map(u => u + ' ' + (r.use[u] / r.g).toFixed(2)).concat(Object.keys(r.picked).map(u => 'chose a Place ' + (r.picked[u] / r.g).toFixed(2))).join(', ')); }
};
EX.tune = async () => {   // (one-off comparisons while tuning: a json list of rule switches as the fifth argument)
  const V = JSON.parse(process.argv[5] || '[{}]'), rs = await runAll(V.map(v => J(JSON.stringify(v), Object.assign({ stacks: 1, setup: 'pick3' }, v.cfg || v), v.opt)));
  for (const r of rs) { const d = decksOf(r); console.log(pad(r.label, 60) + 'first dibs wins ' + pc(r.dibsW, r.g - r.draws) + '%  ' + game(r) + '\n' + pad('', 60) + 'decks ' + d.s + '  spread ' + f1(d.spread) + '  Seals saved ' + (r.sealSaved / r.g).toFixed(2)); }
};
if (EX[exp]) EX[exp](); else console.log('experiments: ' + Object.keys(EX).join(', '));
