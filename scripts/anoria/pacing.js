// How long does the core set take to collect? Plays the collection's own rules (games/anoria/coll.js) for someone who
// plays every day, and checks those rules while it's at it.
//   node scripts/anoria/pacing.js [players] [games a day] [chance to win a game] [cards in a daily pack] [cards in a one-time pack] [edition odds]
// (the last three try another economy without changing coll.js; left out, they are the game's own. Edition odds are
// the chance of Shiny, Silver foil, Gold foil and Rainbow foil for one card, as "0.085,0.04,0.018,0.009")
// It also says how the editions turn up: how often a pack holds a foil, when the first of each edition is found, and
// how long the foils go on after the set itself is complete.
const Coll = require('../../games/anoria/coll'); const { rng } = require('../../games/anoria/engine'); const { ARCH, CARDS, GROWN } = require('../../games/anoria/cards');
const T = +process.argv[2] || 400, PER = +process.argv[3] || 3, PW = +process.argv[4] || 0.5, DAILY = +process.argv[5] || 0, FEAT = +process.argv[6] || 0, ODDS = process.argv[7] ? [0].concat(process.argv[7].split(',').map(Number)) : null, DECK = Coll.DECK, NE = Coll.EDITIONS.length, WEL = Coll.WELCOME.reduce((a, b) => a + b, 0), assert = (ok, m) => { if (!ok) { console.error('FAILED: ' + m); process.exit(1); } };
const D = Object.keys(ARCH), days = [], seenAll = [], guidesAll = [], sum = { welcomeNew: 0, own3: 0, daily: 0, feat: 0, gifts: 0 }; let after7 = 0, after14 = 0, after21 = 0, own7 = 0, own14 = 0, own21 = 0;
const firstEd = Coll.EDITIONS.map(() => []), firstTier = [0, 0, 0, 0, 0], tierN = [0, 0, 0, 0, 0], edAll = [], mk = () => ({ packs: 0, foilPacks: 0, cards: 0, n: Coll.EDITIONS.map(() => 0), later: Coll.EDITIONS.map(() => 0), noCopy: 0, wel: 0, days: 0 }), ED1 = mk(), ED2 = mk(); let ed = ED1;
// A collection and a built deck from when a deck was 30 cards: nothing that could be played is lost, and the old deck
// is kept, reads as 10 short, and can be filled.
{ const mem = {}, old = name => ARCH[name].cards.filter(k => GROWN[name].indexOf(k) < 0), cards = {};
  old('Legion').concat(old('Court')).forEach(k => { cards[k] = 2; }); old('Legacy').slice(0, 14).forEach(k => { cards[k] = Math.max(cards[k] || 0, 2); });
  const built = old('Legion').concat(old('Legion'));
  mem.anoria_coll = JSON.stringify({ v: 1, starter: 'Legion', cards: cards, guides: ['suntzu', 'cleopatra', 'franklin'], seen: {}, fresh: {}, packs: [], wins: 9, games: 20, day: '', feats: {}, threads: {}, opened: 3, pid: 4 });
  mem.anoria_decks = JSON.stringify([{ id: 'dold', n: 'Old thirty', guide: 'suntzu', cards: built }]);
  Coll.use({ store: { get: k => (k in mem ? mem[k] : null), set: (k, v) => { mem[k] = v; } }, random: rng(5), now: () => new Date(2027, 0, 1) });
  assert(built.length === 30, 'the old deck in this check is 30 cards');
  assert(Coll.deck('ready:Legion').ok && Coll.deck('ready:Court').ok, 'an older collection can still play its starter and a ready deck it had finished');
  assert(!Coll.deck('ready:Legacy').ok && Coll.deck('ready:Legacy').own === 28, 'a ready deck it had not finished gets nothing');
  assert(GROWN.Legion.concat(GROWN.Court).every(k => Coll.copies(k) === 2) && GROWN.Legacy.every(k => Coll.copies(k) === 0), 'the new cards of those decks are given, two of each');
  assert(JSON.parse(mem.anoria_coll).v === Coll.VER && Coll.load().wins === 9, 'the collection is saved as the new version, with everything else as it was');
  assert(Coll.ALL.every(k => Coll.look(k) === 0 && Coll.editions(k).every((on, e) => on === (e === 0 && Coll.copies(k) > 0))) && Coll.edCounts().slice(1).every(n => n === 0), 'a collection from before editions has every card in Matte and nothing else found');
  assert(!Coll.setLook(built[0], 3) && Coll.look(built[0]) === 0, 'an edition that has not been found cannot be chosen');
  const d = Coll.deck('dold'); assert(d && !d.ok && d.cards.length === 30 && d.why.join() === '10 more to add', 'a 30-card deck is kept and reads as 10 short: ' + (d && d.why.join('; ')));
  const full = Coll.saveDeck({ id: 'dold', n: 'Old thirty', guide: 'suntzu', cards: Coll.finish({ cards: d.cards }) }); assert(full.cards.length === DECK && Coll.deck('dold').ok && built.every((k, i) => full.cards[i] === k), 'Finish it for me fills it to ' + DECK + ' and keeps its 30');
  Coll.load(); assert(JSON.parse(mem.anoria_coll).v === Coll.VER && GROWN.Legion.every(k => Coll.copies(k) === 2), 'the gift is made once');
  // a collection saved after decks grew (v 2) is only stamped: it is not given the new cards a second time
  mem.anoria_coll = JSON.stringify({ v: 2, starter: 'Legion', cards: { hannibal: 2 }, guides: ['suntzu'], seen: {}, fresh: {}, packs: [], wins: 1, games: 2, day: '', feats: {}, threads: {}, opened: 0, pid: 1 });
  Coll.use({}); assert(Coll.counts().copies === 2 && Coll.load().v === Coll.VER && Coll.look('hannibal') === 0, 'a version 2 collection loads as it was, all Matte'); }
for (let t = 0; t < T; t++) {
  const mem = {}, R = rng(1000 + t * 13); let day = new Date(2027, 0, 1);
  Coll.use({ store: { get: k => (k in mem ? mem[k] : null), set: (k, v) => { mem[k] = v; } }, random: R, now: () => day, daily: DAILY || Coll.DAILY, feat: FEAT || Coll.FEAT, odds: ODDS || Coll.ED_ODDS });
  Coll.reset(); assert(Coll.decks().every(d => !d.ok), 'nothing is playable before a starter is chosen');
  const st = D[(R() * 5) | 0]; assert(Coll.chooseStarter(st) && !Coll.chooseStarter(D[0]), 'a starter is chosen once');
  assert(Coll.counts().copies === DECK && Coll.packs().length === 3 && Coll.deck('ready:' + st).ok && Coll.deck('ready:' + st).cards.length === DECK, 'the starter is ' + DECK + ' cards, playable, with three packs');
  ed = ED1; let gifts = 0, got = 0, d = 0; const seenEd = Coll.EDITIONS.map(() => 0), seenTier = [0, 0, 0, 0, 0];
  const open = () => { let r; while ((r = Coll.openPack())) {
    assert(r.cards.every(c => c.n <= 2), 'never more than two of a card'); const cp = r.cards.filter(c => c.copy).length; assert(cp === r.pack.n || r.cards.length === 2 * r.pack.n || Coll.counts().copies === 2 * Coll.ALL.length, 'a pack holds as many copies you were missing as it says, while there are copies left to find'); assert(r.cards.length <= 2 * r.pack.n, 'a pack holds at most as many extra foils as it has cards');
    r.cards.forEach(c => { got += c.copy ? 1 : 0; ed.cards++; ed.n[c.ed]++; if (r.pack.k !== 'welcome') ed.later[c.ed]++; if (!c.copy) ed.noCopy++;
      assert(c.copy || c.ed > 0, 'a card that adds no copy is a foil'); assert(!c.ed || (Coll.editions(c.c)[c.ed] && Coll.look(c.c) >= c.ed), 'a foil out of a pack is found for good, and the card is shown in it');
      if (!seenEd[c.ed]) { seenEd[c.ed] = 1; firstEd[c.ed].push(d); } const t = Coll.rarity(c.c); if (c.first && !seenTier[t]) { seenTier[t] = 1; firstTier[t] += d; tierN[t]++; } });
    ed.packs++; if (r.cards.some(c => c.ed)) ed.foilPacks++; if (r.pack.k === 'welcome') ed.wel += r.cards.filter(c => c.ed).length;
    gifts += r.threads.filter(x => x.gift).length; if (r.pack.k === 'welcome') sum.welcomeNew += r.cards.filter(c => c.first).length; } };
  open(); sum.own3 += Coll.counts().own; assert(got === WEL && Coll.counts().copies === DECK + WEL + gifts, 'three welcome packs make ' + (DECK + WEL) + ' cards (plus any Thread gifts; a foil of a card you had two of is an extra)');
  // a deck you built: valid, saved, listed
  const mine = Coll.saveDeck({ n: 'Mine', guide: ARCH[st].guide, cards: Coll.finish({ cards: [] }) }); assert(Coll.deck(mine.id).ok && mine.cards.length === DECK, 'Finish it for me builds a playable deck of ' + DECK + ': ' + Coll.deck(mine.id).why.join('; '));
  assert(Coll.problems({ guide: ARCH[st].guide, cards: Coll.readyCards(st).slice(0, DECK - 1).concat(['nosuch']) }).length === 1 && Coll.problems({ guide: 'nobody', cards: [] }).length === 2, 'problems are named');
  let sawAll = 0, gotGuides = 0, nd = 0, nf = 0;
  while (!Coll.counts().complete && d < 400) {
    d++; day = new Date(2027, 0, 1 + d);
    for (let g = 0; g < PER; g++) { const win = R() < PW, level = d > 9 ? 'hard' : 'normal', got = Coll.gameOver({ win: win, cpu: true, level: level, built: d > 4, seen: [Object.keys(CARDS)[(R() * Object.keys(CARDS).length) | 0]] });
      got.forEach(x => { if (x.t === 'pack') { if (x.pack.k === 'daily') nd++; else nf++; } }); }
    assert(Coll.packs().length <= 4, 'at most one daily pack a day'); open();
    const c = Coll.counts(); if (!sawAll && c.own === c.cards) sawAll = d; if (!gotGuides && c.guides === c.guidesAll) gotGuides = d;
    if (d === 7) { after7 += c.copies; own7 += c.own; } if (d === 14) { after14 += c.copies; own14 += c.own; } if (d === 21) { after21 += c.copies; own21 += c.own; }
  }
  assert(Coll.counts().complete, 'the set can be finished'); assert(Coll.threads().every(x => x.done && x.rewarded), 'every Thread is finished by then');
  assert(Coll.gameOver({ win: true, cpu: false, level: 'hard' }).length === 0, 'pass and play earns nothing');
  days.push(d); seenAll.push(sawAll); guidesAll.push(gotGuides); sum.daily += nd; sum.feat += nf; sum.gifts += gifts + Coll.threads().length - gifts;
  // the set is complete: the packs go on, and now every card in them is a finish not found before
  ED1.days += d; ed = ED2; const d1 = d;
  const total = (NE - 1) * Coll.ALL.length, left = () => total - Coll.edCounts().slice(1).reduce((a, b) => a + b, 0);
  while (left() && d < 3000) {
    d++; day = new Date(2027, 0, 1 + d);
    for (let g = 0; g < PER; g++) Coll.gameOver({ win: R() < PW, cpu: true, level: 'hard', built: true });
    const before = left(), n = Coll.packs().reduce((a, x) => a + x.n, 0); open();
    assert(before - left() === Math.min(n, before), 'once the set is complete, every card out of a pack is a finish not found before');
  }
  assert(!left(), 'every edition of every card can be found'); edAll.push(d); ED2.days += d - d1;
  Coll.gameOver({ win: true, cpu: true, level: 'hard' }); const last = Coll.openPack(); assert(!last || last.cards.length === 0, 'with nothing left to find, a pack is empty');
}
days.sort((a, b) => a - b); const avg = a => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1), q = p => days[Math.min(days.length - 1, Math.floor(p * days.length))];
console.log('All checks passed. ' + T + ' players, ' + PER + ' games a day against the computer, winning ' + Math.round(PW * 100) + '% of them. A daily pack holds ' + Coll.DAILY + ' cards and a one-time pack ' + Coll.FEAT + '.');
console.log('After the three welcome packs: ' + (sum.welcomeNew / T).toFixed(1) + ' new cards, ' + (sum.own3 / T).toFixed(1) + ' of ' + Coll.ALL.length + ' different cards owned.');
console.log('Cards owned (of ' + 2 * Coll.ALL.length + ') after a week: ' + (after7 / T).toFixed(0) + ', two weeks: ' + (after14 / T).toFixed(0) + ', three weeks: ' + (after21 / T).toFixed(0));
console.log('Different cards owned (of ' + Coll.ALL.length + ') after a week: ' + (own7 / T).toFixed(1) + ', two weeks: ' + (own14 / T).toFixed(1) + ', three weeks: ' + (own21 / T).toFixed(1));
console.log('The last new card turns up after ' + avg(seenAll) + ' days; all five Guides after ' + avg(guidesAll) + ' days.');
console.log('Nothing left to collect after ' + avg(days) + ' days on average (quickest ' + days[0] + ', middle ' + q(0.5) + ', slowest ' + days[days.length - 1] + ').');
console.log('Along the way: ' + (sum.daily / T).toFixed(1) + ' daily packs, ' + (sum.feat / T).toFixed(1) + ' one-time packs.');
const mid = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : '-'; }, pc = v => (100 * v).toFixed(1) + '%';
console.log('\nRarity. The first card of each tier turns up on day (0 is the welcome packs): ' + [1, 2, 3, 4].map(t => Coll.TIERS[t] + ' ' + (tierN[t] ? (firstTier[t] / tierN[t]).toFixed(1) : '-')).join(', ') + '. A pack slot is ' + [2, 3, 4].map(t => Coll.TIER_W[t] + ' times as likely to be ' + (t === 2 ? 'an ' : 'a ') + Coll.TIERS[t]).join(', ') + ' as a Common.');
console.log('Editions. The chance a card out of a pack is ' + Coll.EDITIONS.slice(1).map((x, i) => x.n + ' ' + pc(Coll.ED_ODDS[i + 1])).join(', ') + '.');
console.log('While the set is being collected: a pack holds a foil of some kind ' + pc(ED1.foilPacks / ED1.packs) + ' of the time (one pack in ' + (ED1.packs / ED1.foilPacks).toFixed(1) + '), and the three welcome packs hold ' + (ED1.wel / T).toFixed(1) + ' foils between them.');
console.log('  After the welcome packs, a foil turns up every ' + Coll.EDITIONS.slice(1).map((x, i) => (ED1.days / ED1.later[i + 1]).toFixed(0) + ' days (' + x.n + ')').join(', ') + '; a foil of any kind every ' + (ED1.days / ED1.later.slice(1).reduce((a, b) => a + b, 0)).toFixed(1) + ' days.');
console.log('  By the day the set is complete a player has found ' + Coll.EDITIONS.slice(1).map((x, i) => (ED1.n[i + 1] / T).toFixed(1) + ' ' + x.n).join(', ') + '.');
console.log('The first of each edition is found on day (middle player; quickest to slowest): ' + Coll.EDITIONS.slice(1).map((x, i) => { const a = firstEd[i + 1].slice().sort((p, q) => p - q); return x.n + ' ' + mid(a) + ' (' + a[0] + ' to ' + a[a.length - 1] + ')'; }).join(', ') + '.');
console.log('  A foil of a card you already had two of is an extra card in its pack: ' + (ED1.noCopy / T).toFixed(1) + ' of those for each player before the set is complete.');
console.log('After the set is complete every card out of a pack is a finish not found before, the commonest first: ' + Coll.EDITIONS.slice(1).map((x, i) => x.n + ' ' + pc(ED2.n[i + 1] / ED2.cards)).join(', ') + ' of them.');
console.log('Every edition of every card (' + (NE - 1) * Coll.ALL.length + ' finishes besides Matte) is found after ' + avg(edAll) + ' days on average (quickest ' + Math.min.apply(null, edAll) + ', slowest ' + Math.max.apply(null, edAll) + ').');
