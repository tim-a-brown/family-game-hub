// How long does the collection take? Plays the collection's own rules (games/anoria/coll.js) for people who play
// every day, checks those rules while it's at it, and says how long the twelve Guides, every card and every finish
// take (Tim, 2026-11-13: the sets, the sphere, the callings and packs of cards you don't have).
//   node scripts/anoria/pacing.js [players] [games a day] [chance to win a game] ['{json: another economy}'] [cards added to the pool]
// The json tries another economy without changing coll.js: {"light": {"game":1,"win":1,"daily":1}, "pack": 5,
// "welcome": [5,5], "guideTurns": [1,2,4,...], "needs": {"joan": 20}, "odds": [0,0.085,0.04,0.018,0.007]}.
// Cards added to the pool: that many made-up cards found only in packs, tiered like the third printing, to see what a
// new printing would do to the pace. The callings happen as often as calls.txt measured (RATES below).
// Exits with an error if a rule does not hold.
const N_ADD = +process.argv[6] || 0;
const C = require('../../games/anoria/cards');
// (made-up cards for a printing still to come, before coll.js reads the set)
for (let i = 0; i < N_ADD; i++) C.CARDS['zz' + i] = { n: 'Card ' + i, t: i % 5 === 4 ? 'deed' : 'fig', f: 'DSVAW'[i % 5], c: 1 + (i % 5), m: 3, reg: 'EUR', era: 4, y: 1500, k: {} };
const Coll = require('../../games/anoria/coll'), { rng } = require('../../games/anoria/engine');
const T = +process.argv[2] || 300, PER = +process.argv[3] || 3, PW = +process.argv[4] || 0.5, OV = JSON.parse(process.argv[5] || '{}');
// how often each calling's measure happens in a game: node scripts/anoria/calls.js (calls.txt)
const RATES = { hold4: 0.381, relics2: 0.51, sealsWin: 0.095, noSealLost: 0.235, lines: 1.62, play3: 3.271, behindWin: 0.358, clash3: 0.821, most: 2.825, facs5: 0.663, scholars3: 0.619 }, RATE_WIN = 0.425;   // (calls.txt, 2026-11-13: 1500 games; the robot won 42.5%)
const COUNTED = { lines: 1, play3: 1, most: 1 };
let bad = 0; const assert = (ok, m) => { if (!ok) { bad++; console.error('FAIL: ' + m); } };
const GK = Object.keys(C.GUIDES), ALL = Coll.ALL, NE = Coll.EDITIONS.length;
const mkStore = () => { const mem = {}; return { mem, store: { get: k => (k in mem ? mem[k] : null), set: (k, v) => { mem[k] = v; } } }; };
let clock = new Date(2027, 0, 1, 12);
const useWith = (o, seed) => { const st = mkStore(); Coll.use(Object.assign({ store: st.store, random: rng(seed), now: () => clock }, o)); return st; };

// ═══ The rules, checked ═════════════════════════════════════════════════════════════════════════════════════
{
  // the sets: 20 different cards each, no card in two sets, the pool is every other card, 8 Domains each, every Domain in a set
  const seen = {}; let dup = 0;
  [['base', Coll.BASE]].concat(GK.map(g => [g, Coll.GSET[g]])).forEach(([id, s]) => {
    assert(s.length === 20, id + ' set has ' + s.length + ' cards, not 20'); assert(new Set(s).size === s.length, id + ' set holds a card twice');
    s.forEach(k => { if (seen[k]) dup++; seen[k] = id; assert(!!C.CARDS[k], id + ' set names ' + k + ', which is not in the game'); });
    const d = Coll.DSET[id]; assert(d.length === 8 && new Set(d).size === 8, id + ' has ' + d.length + ' Domains, not 8 different ones');
  });
  assert(!dup, dup + ' cards are in two sets');
  assert(Coll.POOL.length === ALL.length - 260, 'the pool is ' + Coll.POOL.length + ' cards, not every card in no set');
  Coll.POOL.forEach(k => assert(!Coll.setOf(k), k + ' is in a set and in the pool'));
  const inSet = {}; Object.keys(Coll.DSET).forEach(id => Coll.DSET[id].forEach(d => { inSet[d] = 1; }));
  assert(Coll.DOMS.every(d => inSet[d]), 'a Domain is in no set: ' + Coll.DOMS.filter(d => !inSet[d]).join(' '));
  GK.forEach(g => { const d = Coll.guideDeck(g); assert(d.cards.length === 40 && new Set(d.cards).size === 40, g + '\'s deck is not 40 different cards'); const st = Coll.guideStack(g); assert(st.length === 15 && new Set(st).size === 15, g + '\'s stack is not 15 different Domains'); });

  // a new player: the base set and their Guide's set, 16 Domains, two welcome packs; a Guide's deck plays at once
  const st = useWith({}, 11); Coll.reset(); assert(!Coll.load().starter, 'a fresh collection has no Guide');
  assert(Coll.chooseGuide('akbar') && !Coll.chooseGuide('joan'), 'a Guide is chosen once');
  let s = Coll.load(); assert(Object.keys(s.cards).length === 40, 'a new player has ' + Object.keys(s.cards).length + ' cards, not 40');
  assert(Coll.domains().length === new Set(Coll.DSET.base.concat(Coll.DSET.akbar)).size, 'a new player has the Domains of both sets');
  assert(s.packs.length === Coll.WELCOME.length, 'the welcome packs are waiting');
  const dk = Coll.decks(); assert(dk.length === 1 && dk[0].ok && dk[0].id === 'guide:akbar', 'the first Guide\'s deck can be played');
  assert(!Coll.stackProblems(Coll.stackFor('guide:akbar')).length, 'the first deck\'s stack can be played');
  // a pack: cards you don't have, or finishes you don't have, never a Domain, never one card twice
  const before = JSON.parse(st.mem.anoria_coll), r = Coll.openPack(); s = Coll.load();
  assert(r.cards.length === Coll.WELCOME[0], 'a welcome pack holds ' + r.cards.length + ' cards');
  assert(new Set(r.cards.map(x => x.c)).size === r.cards.length, 'a pack holds a card twice');
  r.cards.forEach(x => { const had = !!before.cards[x.c], edHad = ((before.ed[x.c] || 0) >> x.ed) & 1; assert(x.ed ? !edHad : !had, 'a pack gave ' + x.c + ' in a finish already found'); assert(x.first === !had, 'a pack says ' + x.c + ' is new when it is not'); });
  assert(!r.domains, 'a pack holds no Domain');
  // decks: two of a card you have, never three, never a card you don't have
  const have = Object.keys(s.cards).slice(0, 20), notMine = ALL.filter(k => !s.cards[k])[0];
  assert(!Coll.problems({ guide: 'akbar', cards: have.concat(have) }).length, 'a deck of 20 cards you have, two of each, can be played');
  assert(Coll.problems({ guide: 'akbar', cards: have.concat(have.slice(0, 19), [have[0]]) }).some(w => /More than two/.test(w)), 'three of a card is refused');
  assert(Coll.problems({ guide: 'akbar', cards: have.concat(have.slice(0, 19), [notMine]) }).some(w => /isn't yours/.test(w)), 'a card you don\'t have is refused');
  assert(Coll.copies(have[0]) === 2 && Coll.copies(notMine) === 0, 'a card you have goes in a deck twice');
  // the sphere: a game lights 1, a win 2, the first win of the day 3, and the same however the game is played
  s.signs = 0; s.packs = []; Coll.load(); st.store.set('anoria_coll', JSON.stringify(s));
  const lit = R => R.lit.reduce((a, x) => a + x.n, 0);
  assert(lit(Coll.gameOver({ win: true, level: null })) === 3, 'the first win of the day lights three, in pass and play too');
  assert(lit(Coll.gameOver({ win: true, level: 'hard' })) === 2, 'a later win lights two');
  assert(lit(Coll.gameOver({ win: false, level: 'easy' })) === 1, 'a game lights one');
  let R = null; for (let i = 0; i < 6; i++) R = Coll.gameOver({ win: false }); assert(Coll.load().turns === 1 && Coll.load().signs === 0 && R.turns === 1, 'twelve signs turn the sphere once');
  assert(R.list.some(x => x.t === 'pack' && x.pack.k === 'sphere'), 'a turn of the sphere gives a pack');
  assert(Coll.GUIDE_TURNS.indexOf(1) < 0 || R.list.some(x => x.t === 'guide' && x.why === 'sphere'), 'the first turn of the sphere brings a Guide');
  // a Guide who joins: their set, and only the Domains you did not have
  const g = Coll.load().guides.slice(-1)[0]; assert(Coll.setCards(g).every(k => Coll.owns(k)), 'a Guide who joins brings their set');
  const x = R.list.filter(y => y.t === 'guide')[0]; if (x) assert(x.doms.every(d => Coll.DSET.base.indexOf(d) < 0 && Coll.DSET.akbar.indexOf(d) < 0), 'a Domain you had came again');
  // a calling met brings its Guide
  s = Coll.load(); const left = GK.filter(k => s.guides.indexOf(k) < 0 && Coll.CALLS[k].per === 'game')[0]; s.calls[left] = Coll.CALLS[left].need - 1; st.store.set('anoria_coll', JSON.stringify(s));
  const mm = {}; mm[Coll.CALLS[left].m] = true; R = Coll.gameOver({ win: true, m: mm });
  assert(R.list.some(y => y.t === 'guide' && y.g === left && y.why === 'call') && Coll.load().guides.indexOf(left) >= 0, 'a calling met brings ' + left);
  // the firsts: one pack each
  s = Coll.load(); assert(s.firsts.win && s.firsts.hard, 'the first win and the first against Hard are counted');
  // a collection from before v 6 is cleared, and the decks built then with it
  st.mem.anoria_coll = JSON.stringify({ v: 5, starter: 'Legion', cards: { leonidas: 2 }, guides: ['suntzu'] }); st.mem.anoria_decks = JSON.stringify([{ id: 'd1', n: 'Old', guide: 'suntzu', cards: ['leonidas'] }]);
  Coll.use({ store: st.store }); s = Coll.load(); assert(!s.starter && !Object.keys(s.cards).length && s.v === Coll.VER && !Coll.myDecks().length, 'an older collection starts again');
}

// ═══ The pace ═══════════════════════════════════════════════════════════════════════════════════════════════
const pois = (R, mean) => { let k = 0, L = Math.exp(-mean), p = 1; do { k++; p *= R(); } while (p > L); return k - 1; };
const q = (a, f) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(f * b.length))]; }, avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const out = { g2: [], g6: [], g12: [], call: [], pool: [], all: [], fin: [], d7: [], d30: [], foil: [], packs: [] };
const POOLN = Coll.POOL.length;
for (let t = 0; t < T; t++) {
  const R = rng(9100 + t * 37); useWith(OV, 7000 + t * 13); clock = new Date(2027, 0, 1, 12); Coll.reset();
  Coll.chooseGuide(GK[(R() * GK.length) | 0]);
  const open = () => { let n = 0; while (Coll.packs().length) { const r = Coll.openPack(); n++; r.cards.forEach(x => { if (x.ed) foils++; }); } return n; };
  let foils = 0, packs = open(), d = 0, g2 = 0, g6 = 0, g12 = 0, calls = 0, pool = 0, all = 0, fin = 0, games = 0;
  const finishes = () => { const s = Coll.load(); let n = 0; for (const k of ALL) { const b = s.ed[k] || 0; for (let e = 1; e < NE; e++) if (b >> e & 1) n++; } return n; };
  while (d < 2500) {
    d++; clock = new Date(2027, 0, d, 12);
    for (let i = 0; i < PER; i++) {
      const win = R() < PW, m = {};
      // (a measure that needs a win happens in a won game as often as calls.txt says it happens in a game, over how often the robot won)
      Object.keys(RATES).forEach(k => { const w = k === 'sealsWin' || k === 'noSealLost' || k === 'behindWin'; m[k] = COUNTED[k] ? pois(R, RATES[k]) : w ? win && R() < RATES[k] / RATE_WIN : R() < RATES[k]; });
      const r = Coll.gameOver({ win: win, how: m.sealsWin ? 'seals' : 'renown', level: d < 3 ? 'easy' : d < 20 ? 'normal' : 'hard', built: d > 10 && win, m: m }); games++;
      r.list.forEach(x => { if (x.t === 'guide' && x.why === 'call') calls++; });
      packs += open();
    }
    const s = Coll.load(), nG = s.guides.length, nC = Object.keys(s.cards).length, nP = Coll.POOL.filter(k => s.cards[k]).length;
    if (!g2 && nG >= 2) g2 = d; if (!g6 && nG >= 6) g6 = d; if (!g12 && nG === 12) g12 = d; if (!pool && nP === POOLN) pool = d; if (!all && nC === ALL.length) all = d;
    if (d === 7) out.d7.push(nC); if (d === 30) out.d30.push(nC);
    if (g12 && all && finishes() === (NE - 1) * ALL.length) { fin = d; break; }
  }
  out.g2.push(g2); out.g6.push(g6); out.g12.push(g12); out.call.push(calls); out.pool.push(pool); out.all.push(all); out.fin.push(fin || 2500); out.foil.push(foils); out.packs.push(packs);
}
const L = Coll.LIGHT;
console.log(T + ' players, ' + PER + ' games a day, winning ' + Math.round(PW * 100) + '%. The sphere: ' + Coll.SIGNS + ' signs; a game lights ' + L.game + ', a win ' + (L.game + L.win) + ', the first win of the day ' + (L.game + L.win + L.daily) +
  '; a pack of ' + Coll.PACK + ' each turn; a Guide on turns ' + Coll.GUIDE_TURNS.join(', ') + '. Welcome packs ' + Coll.WELCOME.join(' and ') + '. ' + ALL.length + ' cards, ' + POOLN + ' of them found only in packs' + (N_ADD ? ' (' + N_ADD + ' made up for a printing to come)' : '') + '.');
console.log('  cards after a week ' + avg(out.d7).toFixed(0) + ', after 30 days ' + avg(out.d30).toFixed(0) + ' of ' + ALL.length);
console.log('  second Guide day ' + avg(out.g2).toFixed(1) + ', six Guides day ' + avg(out.g6).toFixed(1) + ', all twelve day ' + avg(out.g12).toFixed(1) + ' (middle ' + q(out.g12, .5) + ', slowest tenth ' + q(out.g12, .9) + '); Guides by calling ' + avg(out.call).toFixed(1) + ' of 11');
console.log('  every card found only in packs day ' + avg(out.pool).toFixed(1) + ' (middle ' + q(out.pool, .5) + ', slowest tenth ' + q(out.pool, .9) + '); every card day ' + avg(out.all).toFixed(1) + ' (middle ' + q(out.all, .5) + ', slowest tenth ' + q(out.all, .9) + ')');
console.log('  every finish of every card day ' + avg(out.fin).toFixed(0) + '; packs opened by then ' + avg(out.packs).toFixed(0) + ', foils in them ' + avg(out.foil).toFixed(0));
if (bad) { console.error(bad + ' rules did not hold'); process.exit(1); } else console.log('  (every rule checked holds)');
