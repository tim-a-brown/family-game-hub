// Test games for Domains on the game's own engine (games/anoria/engine.js). The prototype's tables are in
// scripts/anoria/places/results.txt; these are the same questions asked of the real rules, and domains.txt has the answers.
//   node scripts/anoria/domains.js <experiment> [games per pairing] ['<json of rule switches>'] [first seed]
//   decks    the ready decks with their ready stacks on four sets of 1,000 games (SWAP=a:b tries a change to the stacks)
//   base     the old fixed map beside Domains: length, how games end, the first turn, first dibs, the five ready decks
//   rules    every rule at a Gate, an Outpost and the Crossroads, every kind, every home and every Domain: how often
//            the player who laid it wins (stacks dealt from all 75 and laid with no choice, so nothing is chosen for)
//   law      the Law rule: only the holder can start a clash there, beside nobody can
//   built    a stack of 15 chosen for the deck from all 75 against the ready stacks
//   six      the ready decks with two copies of one, two or three Domain cards each (pack-only, or in the ready decks?)
//   use      how the robots use each Domain card (two copies in each ready deck)
//   cards    the Domain cards in random decks of two factions beside their factions' cards   [games, not per pairing]
//   setup    how well each robot lays its three Domains (a robot that chooses against one that lays at random)
// Every cell but "cards" is the five ready decks against each other in both seats (20 pairings x the games asked
// for), each deck in its own style and with its own ready stack, first to 25 Renown or three Seals. Three at a time.
'use strict';
const { Worker, isMainThread, parentPort } = require('worker_threads');
const E = require('../../games/anoria/engine'), C = require('../../games/anoria/cards');
const { PROF, STD, rng, shuffle, CARDS, PLACES } = E, { ARCH, STACKS, GUIDES } = C;
const D = Object.keys(ARCH), style = { Explorers: 'raider', Legion: 'brawler', Legacy: 'keeper', Court: 'holder', Pathfinders: 'raider' };
const ALLD = Object.keys(PLACES).filter(id => PLACES[id].pw), DC = C.PRINT4.concat(['pachacuti']), FACS = ['D', 'S', 'V', 'A', 'W'], GL = Object.keys(GUIDES), PN = ['holder', 'raider', 'keeper', 'brawler'];
const bump = (m, k, w) => { const x = m[k] || (m[k] = [0, 0]); x[0]++; x[1] += w; };
// one game, as engine.js play() runs it, with the set-up laid at random when the experiment asks (o.rlay)
function playG(decks, guides, profs, cfg, seed, stacks, o) {
  const R = rng(seed), S = E.newGame(decks, guides, cfg, R, stacks, stacks ? { wait: true } : null), N = 2;
  if (stacks) { for (let p = 0; p < N; p++) { const rl = o.rlay === 1 || o.rlay === 'p' + p; E.setupLay(S, p, rl ? E.setupOptions(S, p)[(R() * 6) | 0] : E.setupPick(S, p, profs[p], R)); } E.setupRoll(S, R); }
  while (!S.over) { const first = E.firstOf(S);
    for (let k = 0; k < N && !S.over; k++) { S.turn = (first + k) % N; E.startTurn(S); E.aiTurn(S, profs[S.turn], R); E.endTurn(S); }
    if (!S.over) E.endRound(S); }
  return S;
}
function mkDeck(k, o, R) {
  const d = ARCH[k].cards.concat(ARCH[k].cards); if (!o.pc && !o.cards) return d;
  const add = o.cards ? o.cards.slice() : shuffle(DC.slice(), R).slice(0, o.pc / 2), out = shuffle(d, R).slice(0, d.length - add.length * 2);
  for (const c of add) out.push(c, c); return out;
}
// a stack of 15 chosen for a deck from all 75: by home (the Domains most of its Figures call home), or as the
// collection's "fill the stack for me" would choose it (home, then faction, then rule: coll.js suits)
function build(k, how) {
  const info = E.deckInfo(ARCH[k].cards);
  const val = id => { const pl = PLACES[id], h = info.reg[pl.reg] || 0, r = Math.max(E.layScore(id, 0, { reg: {}, fac: info.fac }), E.layScore(id, 1, { reg: {}, fac: info.fac })); return how === 'home' ? h * 10 + r * 0.01 : how === 'rule' ? r + h * 0.01 : h * 2 + r; };
  return ALLD.slice().sort((a, b) => val(b) - val(a) || (a < b ? -1 : 1)).slice(0, 15);
}
function randDeck(R, must) {
  for (;;) { const fs = shuffle(FACS.slice(), R).slice(0, 2); if (must && must !== 'N' && fs.indexOf(must) < 0) continue; const pool = [];
    for (const k in CARDS) { const c = CARDS[k]; if (C.CARDS[k] && c.pr !== 4 && k !== 'pachacuti' && fs.indexOf(c.f) >= 0) pool.push(k, k); }
    const rel = shuffle(Object.keys(C.CARDS).filter(k => CARDS[k].t === 'relic' && CARDS[k].pr !== 4), R).slice(0, (R() * 3) | 0);
    const d = rel.concat(shuffle(pool, R).slice(0, 40 - rel.length)); if (d.filter(k => CARDS[k].t === 'fig').length >= 23) return { d, fs }; }
}
function cell(job) {
  const cfg = Object.assign({}, STD, job.cfg), o = job.opt || {}, n = job.n, keep = {};
  const r = { label: job.label, g: 0, rounds: 0, rh: {}, deck: {}, seals: 0, ren: 0, cap: 0, first: 0, draws: 0, ko: 0, margin: 0, flips: 0, behind3: 0, dec3: 0, dibsW: 0, hubW: 0, heroW: 0, heroBy: {}, home: 0, plays: 0, repl: 0, moved: 0,
    slot: {}, dom: {}, kind: {}, hm: {}, drawn: {}, played: {}, fac: {}, use: {}, laid: 0, seat0: 0 };
  if (o.over) for (const k in o.over) { keep[k] = CARDS[k]; CARDS[k] = Object.assign({}, CARDS[k], o.over[k]); }   // (CARDS is the engine's own table: other numbers on a card for this cell)
  const one = (ka, kb, seed) => {
    const R = rng(seed * 7 + 11); let decks, guides, profs, stacks = null, test = [null, null];
    if (o.rand) { const TC = o.only || DC, pick = () => { const c = TC[(R() * TC.length) | 0], x = randDeck(R, CARDS[c].f); x.d.splice(0, 2, c, c); return [x, c]; }, a = pick(), b = pick(); decks = [a[0].d, b[0].d]; test = [a, b];
      guides = [GL[(R() * GL.length) | 0], GL[(R() * GL.length) | 0]]; profs = [PROF[PN[(R() * 4) | 0]], PROF[PN[(R() * 4) | 0]]]; stacks = [shuffle(ALLD.slice(), R).slice(0, 15), shuffle(ALLD.slice(), R).slice(0, 15)]; }
    else { decks = [mkDeck(ka, o, R), mkDeck(kb, o, R)]; guides = [ARCH[ka].guide, ARCH[kb].guide]; profs = o.profs ? o.profs.map(x => PROF[x]) : [PROF[style[ka]], PROF[style[kb]]];
      if (cfg.dm) { const SK = o.stacks || STACKS, st = k => (o.build && o.hero === k ? build(k, o.build) : o.rstack ? shuffle(ALLD.slice(), R).slice(0, 15) : SK[k].slice()); stacks = [st(ka), st(kb)]; } }
    const S = playG(decks, guides, profs, cfg, seed, stacks, o), st = S.st, w = S.winner, sc = s => (w < 0 ? 0.5 : w === s ? 1 : 0);
    r.g++; r.rounds += S.round; r.rh[S.round] = (r.rh[S.round] || 0) + 1; if (w === 0) r.seat0++;
    if (!o.rand) { bump(r.deck, ka, sc(0)); bump(r.deck, kb, sc(1)); }
    const top = Math.max(S.P[0].renown, S.P[1].renown);
    if (S.how === 'seals') r.seals++; else if (top >= cfg.target) r.ren++; else r.cap++;
    if (o.hero) { const hw = sc(ka === o.hero ? 0 : 1); r.heroW += hw; bump(r.heroBy, o.hero, hw); }
    r.home += st.home; r.plays += st.plays; if (w < 0) r.draws++; r.ko += st.ko; r.margin += Math.abs(S.P[0].renown - S.P[1].renown);
    const f0 = S.dm ? S.f0 : E.firstOf(Object.assign({}, S, { round: 1, P: S.P.map(() => ({ renown: 0 })) })); if (w === f0) r.first++;
    const L = st.lead; let last = -1; L.forEach(x => { if (x >= 0) { if (last >= 0 && x !== last) r.flips++; last = x; } });
    if (w >= 0 && L.length >= 3 && L[2] >= 0) { r.dec3++; if (L[2] !== w) r.behind3++; }
    if (S.dm) { const su = S.su, d = su.dibs; if (w === d) r.dibsW++; if (w === S.ban[4]) r.hubW++; r.repl += st.repl || 0; r.moved += st.moved || 0;
      for (const k in st.use) r.use[k] = (r.use[k] || 0) + st.use[k];
      if (o.track) { const rec = (id, slot, s) => { const pl = PLACES[id]; bump(r.slot, pl.pw + '|' + slot, sc(s)); bump(r.dom, id, sc(s)); bump(r.kind, pl.d, sc(s)); bump(r.hm, pl.reg, sc(s)); };
        for (const x of st.laid) if (x) for (const y of x) if (!y[2]) { const s = st.laid.indexOf(x); rec(y[0], y[1] === 4 ? 2 : y[1] & 1, s); } } }
    if (o.rand || o.cardstat) for (let s = 0; s < 2; s++) { if (o.rand) { for (const f of test[s][0].fs) bump(r.fac, f, sc(s)); const c = test[s][1]; if (st.seenC[s][c]) bump(r.drawn, c, sc(s)); if (st.played[s][c]) bump(r.played, c, sc(s)); bump(r.fac, 'in:' + c, sc(s)); }
      else for (const c of DC) { if (st.seenC[s][c]) bump(r.drawn, c, sc(s)); if (st.played[s][c]) bump(r.played, c, sc(s)); } }
  };
  if (o.rand) for (let i = 0; i < n; i++) one(null, null, (job.seed || 101) * 31 + i);
  else { let gi = 0; for (const a of D) for (const b of D) { if (a === b) continue; if (o.build) o.hero = a; for (let i = 0; i < n; i++, gi++) { const fl = i & 1; one(fl ? b : a, fl ? a : b, (job.seed || 7000) + gi * 3); } } }
  for (const k in keep) CARDS[k] = keep[k];
  return r;
}
if (!isMainThread) { parentPort.on('message', job => parentPort.postMessage(cell(job))); return; }

// ── the main thread: a pool of workers, then the tables ──
function runAll(jobs) {
  return new Promise(done => { const out = new Array(jobs.length); let next = 0, left = jobs.length; if (!left) done(out);
    for (let k = 0; k < Math.min(+process.env.WORKERS || 3, jobs.length); k++) { const wk = new Worker(__filename); let cur = -1;
      const give = () => { if (next < jobs.length) { cur = next++; wk.postMessage(jobs[cur]); } else wk.terminate(); };
      wk.on('message', res => { out[cur] = res; if (!--left) done(out); give(); }); give(); } });
}
const pc = (a, b) => (b ? (100 * a / b).toFixed(1) : '-'), f1 = x => x.toFixed(1), pad = (s, n) => (s + ' '.repeat(n)).slice(0, n), lpad = (s, n) => (' '.repeat(n) + s).slice(-n);
const decksOf = r => { let lo = 100, hi = 0; const s = D.map(d => { const p = 100 * r.deck[d][1] / r.deck[d][0]; lo = Math.min(lo, p); hi = Math.max(hi, p); return d.slice(0, 5) + ' ' + f1(p); }).join('  '); return { s, spread: hi - lo }; };
const quant = (h, q) => { const ks = Object.keys(h).map(Number).sort((a, b) => a - b); let tot = 0, acc = 0; for (const k of ks) tot += h[k]; for (const k of ks) { acc += h[k]; if (acc >= q * tot) return k; } return ks[ks.length - 1]; };
const game = r => 'rounds ' + (r.rounds / r.g).toFixed(2) + ' (most games ' + quant(r.rh, 0.1) + ' to ' + quant(r.rh, 0.9) + ')  ends on Renown ' + pc(r.ren, r.g) + '% Seals ' + pc(r.seals, r.g) + '%' + (r.cap ? ' limit ' + pc(r.cap, r.g) + '%' : '') +
  '  first turn wins ' + pc(r.first, r.g - r.draws) + '%  lead changes ' + (r.flips / r.g).toFixed(2) + '  winner behind after round 3: ' + pc(r.behind3, r.dec3) + '%  knock-outs ' + f1(r.ko / r.g) + '  margin ' + f1(r.margin / r.g) + '  at home ' + pc(r.home, r.plays) + '%';
const n = +process.argv[3] || 50, exp = process.argv[2], XCFG = JSON.parse(process.argv[4] || '{}'), SEED = +process.argv[5] || 0;
const J = (label, cfg, opt, seed, m) => ({ label, cfg: Object.assign({}, cfg, XCFG), opt: opt || {}, n: m || n, seed: (seed || 7000) + SEED });
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : DC;   // (ONLY=congress,breda: just those cards, for use and cards)
const sum = (rs, f) => { const m = {}; for (const r of rs) for (const k in r[f]) { const x = m[k] || (m[k] = [0, 0]); x[0] += r[f][k][0]; x[1] += r[f][k][1]; } return m; };
const EX = {};
EX.base = async () => {
  const rs = await runAll([J('the old map, set 1', { dm: 0 }), J('the old map, set 2', { dm: 0 }, {}, 91000), J('Domains, set 1', {}), J('Domains, set 2', {}, {}, 91000)]);
  console.log('THE OLD FIXED MAP BESIDE DOMAINS (' + rs[0].g + ' games a row)');
  for (const r of rs) { const d = decksOf(r); console.log(pad(r.label, 22) + game(r) + '\n' + pad('', 22) + 'decks ' + d.s + '  spread ' + f1(d.spread) + (r.label[0] === 'D' ? '  first dibs wins ' + pc(r.dibsW, r.g - r.draws) + '%  the player whose Domain is the Crossroads at the end wins ' + pc(r.hubW, r.g - r.draws) + '%' : '')); }
};
EX.decks = async () => {   // (the ready decks with their ready stacks on several sets of games: the fourth pass on the stacks)
  // SWAP=benin:lanse,venice:orleans tries the ready stacks with those Domains changed between the stacks they are in, without touching cards.js
  let SK = null; if (process.env.SWAP) { SK = {}; for (const k in STACKS) SK[k] = STACKS[k].slice(); for (const pr of process.env.SWAP.split(',')) { const [x, y] = pr.split(':'); for (const k in SK) SK[k] = SK[k].map(id => (id === x ? y : id === y ? x : id)); } }
  const seeds = [7000, 91000, 173000, 255000].slice(0, +process.env.SETS || 4), rs = await runAll(seeds.map(s => J('set ' + s, {}, SK ? { stacks: SK } : {}, s)));
  const tot = {}; for (const r of rs) { const d = decksOf(r); console.log(pad(r.label, 12) + 'decks ' + d.s + '  spread ' + f1(d.spread) + '  rounds ' + (r.rounds / r.g).toFixed(2) + '  Seals ' + pc(r.seals, r.g) + '%  first turn ' + pc(r.first, r.g - r.draws) + '%'); for (const k in r.deck) { const x = tot[k] || (tot[k] = [0, 0]); x[0] += r.deck[k][0]; x[1] += r.deck[k][1]; } }
  const w = D.map(d => 100 * tot[d][1] / tot[d][0]); console.log(pad('all ' + rs.reduce((s, r) => s + r.g, 0) + ' games', 12) + 'decks ' + D.map((d, i) => d.slice(0, 5) + ' ' + f1(w[i])).join('  ') + '  spread ' + f1(Math.max.apply(null, w) - Math.min.apply(null, w)));
};
EX.rules = async () => {
  const rs = await runAll([0, 1, 2].map(k => J('r' + k, {}, { rstack: 1, rlay: 1, track: 1 }, 20000 + k * 50000)));
  const m = sum(rs, 'slot'), dm = sum(rs, 'dom'), kd = sum(rs, 'kind'), hm = sum(rs, 'hm');
  console.log('EVERY RULE AT EVERY POSITION: how often the player who laid it wins (' + rs.reduce((s, r) => s + r.g, 0) + ' games; stacks dealt from all 75 and laid with no choice)\nkind      rule        at your Gate        at your Outpost     at the Crossroads (yours)');
  for (const w of Object.keys(C.DRULES)) console.log(pad(C.DRULES[w], 10) + pad(w, 12) + [0, 1, 2].map(s => { const x = m[w + '|' + s]; return pad(x ? pc(x[1], x[0]) + '% (' + x[0] + ')' : '-', 20); }).join(''));
  console.log('By kind: ' + Object.keys(kd).sort((a, b) => kd[b][1] / kd[b][0] - kd[a][1] / kd[a][0]).map(k => k + ' ' + pc(kd[k][1], kd[k][0]) + '% (' + kd[k][0] + ')').join('  '));
  console.log('By home: ' + Object.keys(hm).sort((a, b) => hm[b][1] / hm[b][0] - hm[a][1] / hm[a][0]).map(k => k + ' ' + pc(hm[k][1], hm[k][0]) + '% (' + hm[k][0] + ')').join('  '));
  const ds = Object.keys(dm).sort((a, b) => dm[b][1] / dm[b][0] - dm[a][1] / dm[a][0]);
  console.log('The 75 Domains, by how often the player who laid one won:\n' + ds.map(k => '  ' + pad(PLACES[k].n, 30) + pad(PLACES[k].d, 10) + pad(PLACES[k].pw, 11) + pad(PLACES[k].reg, 9) + pc(dm[k][1], dm[k][0]) + '% (' + dm[k][0] + ')').join('\n'));
};
EX.law = async () => {
  const rs = await runAll([J('only the holder can start a clash', {}, { rstack: 1, rlay: 1, track: 1 }, 30000), J('nobody can start a clash', { peaceSym: 1 }, { rstack: 1, rlay: 1, track: 1 }, 30000),
    J('only the holder (ready decks, ready stacks)', {}), J('nobody (ready decks, ready stacks)', { peaceSym: 1 })]);
  console.log('THE LAW RULE (' + rs[0].g + ' games a row)');
  for (const r of rs) { const x = s => { const v = r.slot['peace|' + s]; return v ? pc(v[1], v[0]) + '% (' + v[0] + ')' : '-'; };
    console.log(pad(r.label, 46) + (r.slot['peace|0'] ? 'the player who laid it wins: at their Gate ' + x(0) + ', at their Outpost ' + x(1) + ', at the Crossroads ' + x(2) + '  ' : decksOf(r).s + '  spread ' + f1(decksOf(r).spread) + '  ') + 'knock-outs ' + f1(r.ko / r.g) + '  Seals ' + pc(r.seals, r.g) + '%  rounds ' + (r.rounds / r.g).toFixed(2)); }
};
EX.built = async () => {
  const rs = await runAll([J('chosen for home', {}, { build: 'home' }), J('chosen as "fill the stack for me" would', {}, { build: 'both' }), J('chosen for the rules', {}, { build: 'rule' }), J('chosen for home, second set', {}, { build: 'home' }, 91000)]);
  console.log('A STACK OF 15 CHOSEN FOR THE DECK FROM ALL 75, AGAINST THE READY STACKS (' + rs[0].g + ' games a row; ready against ready is 50%)');
  for (const r of rs) console.log(pad(r.label, 42) + 'wins ' + pc(r.heroW, r.g) + '%   by deck ' + D.map(d => d.slice(0, 5) + ' ' + pc(r.heroBy[d][1], r.heroBy[d][0])).join('  ') + '   at home ' + pc(r.home, r.plays) + '%  Seals ' + pc(r.seals, r.g) + '%  rounds ' + (r.rounds / r.g).toFixed(2));
  for (const d of D) console.log('  ' + pad(d + ' for home:', 24) + build(d, 'home').map(id => PLACES[id].n).join(', '));
};
EX.six = async () => {
  const rs = await runAll([J('no Domain cards (the ready decks as they are)', {}), J('one Domain card in each deck (2 copies)', {}, { pc: 2 }), J('two Domain cards in each deck (4 copies)', {}, { pc: 4 }), J('three Domain cards in each deck (6 copies)', {}, { pc: 6 }),
    J('no Domain cards, second set', {}, {}, 91000), J('three Domain cards, second set', {}, { pc: 6 }, 91000)]);
  console.log('THE READY DECKS WITH DOMAIN CARDS IN THEM (' + rs[0].g + ' games a row)');
  for (const r of rs) { const d = decksOf(r); console.log(pad(r.label, 48) + 'decks ' + d.s + '  spread ' + f1(d.spread) + '  rounds ' + (r.rounds / r.g).toFixed(2) + '  Seals ' + pc(r.seals, r.g) + '%  lead changes ' + (r.flips / r.g).toFixed(2) + '  margin ' + f1(r.margin / r.g) + '  Domains replaced a game ' + (r.repl / r.g).toFixed(2) + ', moved ' + (r.moved / r.g).toFixed(2)); }
};
EX.use = async () => {
  const rs = await runAll(ONLY.map(c => J(c, {}, { cards: [c], cardstat: 1 }, 7000, Math.max(4, Math.round(n / 4)))));
  console.log('HOW THE ROBOTS USE EACH DOMAIN CARD (two copies in each ready deck, ' + rs[0].g + ' games a card)\ncard                      played when drawn  wins when drawn  replaced a game  moved a game  what it did');
  for (const r of rs) { const c = r.label, d = r.drawn[c] || [0, 0], p = r.played[c] || [0, 0];
    console.log(pad(CARDS[c].n, 26) + lpad(pc(p[0], d[0]) + '%', 12) + lpad(pc(d[1], d[0]) + '%', 17) + lpad((r.repl / r.g).toFixed(2), 15) + lpad((r.moved / r.g).toFixed(2), 14) + '   ' + Object.keys(r.use).sort().map(k => k + ' ' + (r.use[k] / r.g).toFixed(2)).join(', ')); }
};
EX.cards = async () => {
  const V = JSON.parse(process.env.OVER || '{}'), names = Object.keys(V).length ? Object.keys(V) : ['as in cards.js'];
  const jobs = []; names.forEach((nm, i) => { for (let k = 0; k < 3; k++) jobs.push(J(nm, {}, { rand: 1, over: V[nm] || null, only: process.env.ONLY ? ONLY : null }, 101 + k * 977, Math.round(n / 3))); });
  const rs = await runAll(jobs);
  console.log('THE DOMAIN CARDS IN RANDOM DECKS (two factions, 40 cards, a random Guide, style and stack of 15; each deck has two copies of one Domain card)');
  names.forEach((nm, i) => { const part = rs.slice(i * 3, i * 3 + 3), dr = sum(part, 'drawn'), pl = sum(part, 'played'), fc = sum(part, 'fac'), g = part.reduce((s, r) => s + r.g, 0);
    console.log('\n' + nm + (V[nm] ? ': ' + JSON.stringify(V[nm]) : '') + '  (' + g + ' games)\n  decks by faction: ' + FACS.map(f => f + ' ' + pc(fc[f][1], fc[f][0]) + '%').join('  ') +
      '\ncard                       cost  wins with it in the deck   wins when drawn    its faction\'s decks   played when drawn');
    for (const c of ONLY) { const x = CARDS[c], o = (V[nm] || {})[c] || {}, d = dr[c] || [0, 0], p = pl[c] || [0, 0], inn = fc['in:' + c] || [0, 0], line = x.f === 'N' ? 50 : 100 * fc[x.f][1] / fc[x.f][0];
      console.log(pad(x.n, 27) + pad((o.c != null ? o.c : x.c) + (x.t === 'fig' ? '/' + (o.m != null ? o.m : x.m) : ''), 6) + lpad(pc(inn[1], inn[0]) + '% (' + inn[0] + ')', 16) + lpad(pc(d[1], d[0]) + '% (' + d[0] + ')', 24) + lpad(f1(line) + '%', 14) + lpad(pc(p[0], d[0]) + '%', 20)); } });
};
EX.setup = async () => {
  const P = ['novice', 'normal', 'hard'], jobs = [];
  for (const p of (process.env.ROBOTS ? process.env.ROBOTS.split(',') : P)) jobs.push(J(p + ' choosing, against ' + p + ' laying at random', {}, { profs: [p, p], rlay: 'p1' }), J(p + ' laying at random, against ' + p + ' choosing', {}, { profs: [p, p], rlay: 'p0' }));
  const rs = await runAll(jobs);
  console.log('HOW WELL EACH ROBOT LAYS ITS THREE DOMAINS (both seats the same robot; one chooses, the other lays its three at random; ' + 2 * rs[0].g + ' games a robot)');
  (process.env.ROBOTS ? process.env.ROBOTS.split(',') : P).forEach((p, i) => { const a = rs[2 * i], b = rs[2 * i + 1], w = a.seat0 + (b.g - b.seat0 - b.draws) + (a.draws + b.draws) / 2; console.log(pad(({ novice: 'Easy', normal: 'Normal', hard: 'Hard' })[p], 8) + 'the robot that chooses wins ' + pc(w, a.g + b.g) + '%'); });
};
if (EX[exp]) EX[exp](); else console.log('experiments: ' + Object.keys(EX).join(', '));
