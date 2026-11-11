// How long does the core set take to collect? Plays the collection's own rules (games/anoria/coll.js) for someone who
// plays every day, and checks those rules while it's at it.
//   node scripts/anoria/pacing.js [players] [games a day] [chance to win a game] [cards in a daily pack] [cards in a one-time pack]
// (the last two try another economy without changing coll.js; left out, they are the game's own)
const Coll = require('../../games/anoria/coll'); const { rng } = require('../../games/anoria/engine'); const { ARCH, CARDS, GROWN } = require('../../games/anoria/cards');
const T = +process.argv[2] || 400, PER = +process.argv[3] || 3, PW = +process.argv[4] || 0.5, DAILY = +process.argv[5] || 0, FEAT = +process.argv[6] || 0, DECK = Coll.DECK, WEL = Coll.WELCOME.reduce((a, b) => a + b, 0), assert = (ok, m) => { if (!ok) { console.error('FAILED: ' + m); process.exit(1); } };
const D = Object.keys(ARCH), days = [], seenAll = [], guidesAll = [], sum = { welcomeNew: 0, own3: 0, daily: 0, feat: 0, gifts: 0 }; let after7 = 0, after14 = 0, after21 = 0, own7 = 0, own14 = 0, own21 = 0;
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
  assert(JSON.parse(mem.anoria_coll).v === 2 && Coll.load().wins === 9, 'the collection is saved as the new version, with everything else as it was');
  const d = Coll.deck('dold'); assert(d && !d.ok && d.cards.length === 30 && d.why.join() === '10 more to add', 'a 30-card deck is kept and reads as 10 short: ' + (d && d.why.join('; ')));
  const full = Coll.saveDeck({ id: 'dold', n: 'Old thirty', guide: 'suntzu', cards: Coll.finish({ cards: d.cards }) }); assert(full.cards.length === DECK && Coll.deck('dold').ok && built.every((k, i) => full.cards[i] === k), 'Finish it for me fills it to ' + DECK + ' and keeps its 30');
  Coll.load(); assert(JSON.parse(mem.anoria_coll).v === 2 && GROWN.Legion.every(k => Coll.copies(k) === 2), 'the gift is made once'); }
for (let t = 0; t < T; t++) {
  const mem = {}, R = rng(1000 + t * 13); let day = new Date(2027, 0, 1);
  Coll.use({ store: { get: k => (k in mem ? mem[k] : null), set: (k, v) => { mem[k] = v; } }, random: R, now: () => day, daily: DAILY || Coll.DAILY, feat: FEAT || Coll.FEAT });
  Coll.reset(); assert(Coll.decks().every(d => !d.ok), 'nothing is playable before a starter is chosen');
  const st = D[(R() * 5) | 0]; assert(Coll.chooseStarter(st) && !Coll.chooseStarter(D[0]), 'a starter is chosen once');
  assert(Coll.counts().copies === DECK && Coll.packs().length === 3 && Coll.deck('ready:' + st).ok && Coll.deck('ready:' + st).cards.length === DECK, 'the starter is ' + DECK + ' cards, playable, with three packs');
  let gifts = 0; const open = () => { let r; while ((r = Coll.openPack())) { assert(r.cards.every(c => c.n <= 2), 'never more than two of a card'); gifts += r.threads.filter(x => x.gift).length; if (r.pack.k === 'welcome') sum.welcomeNew += r.cards.filter(c => c.first).length; } };
  open(); sum.own3 += Coll.counts().own; assert(Coll.counts().copies === DECK + WEL + gifts, 'three welcome packs make ' + (DECK + WEL) + ' cards (plus any Thread gifts)');
  // a deck you built: valid, saved, listed
  const mine = Coll.saveDeck({ n: 'Mine', guide: ARCH[st].guide, cards: Coll.finish({ cards: [] }) }); assert(Coll.deck(mine.id).ok && mine.cards.length === DECK, 'Finish it for me builds a playable deck of ' + DECK + ': ' + Coll.deck(mine.id).why.join('; '));
  assert(Coll.problems({ guide: ARCH[st].guide, cards: Coll.readyCards(st).slice(0, DECK - 1).concat(['nosuch']) }).length === 1 && Coll.problems({ guide: 'nobody', cards: [] }).length === 2, 'problems are named');
  let d = 0, sawAll = 0, gotGuides = 0, nd = 0, nf = 0;
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
}
days.sort((a, b) => a - b); const avg = a => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1), q = p => days[Math.min(days.length - 1, Math.floor(p * days.length))];
console.log('All checks passed. ' + T + ' players, ' + PER + ' games a day against the computer, winning ' + Math.round(PW * 100) + '% of them. A daily pack holds ' + Coll.DAILY + ' cards and a one-time pack ' + Coll.FEAT + '.');
console.log('After the three welcome packs: ' + (sum.welcomeNew / T).toFixed(1) + ' new cards, ' + (sum.own3 / T).toFixed(1) + ' of ' + Coll.ALL.length + ' different cards owned.');
console.log('Cards owned (of ' + 2 * Coll.ALL.length + ') after a week: ' + (after7 / T).toFixed(0) + ', two weeks: ' + (after14 / T).toFixed(0) + ', three weeks: ' + (after21 / T).toFixed(0));
console.log('Different cards owned (of ' + Coll.ALL.length + ') after a week: ' + (own7 / T).toFixed(1) + ', two weeks: ' + (own14 / T).toFixed(1) + ', three weeks: ' + (own21 / T).toFixed(1));
console.log('The last new card turns up after ' + avg(seenAll) + ' days; all five Guides after ' + avg(guidesAll) + ' days.');
console.log('Nothing left to collect after ' + avg(days) + ' days on average (quickest ' + days[0] + ', middle ' + q(0.5) + ', slowest ' + days[days.length - 1] + ').');
console.log('Along the way: ' + (sum.daily / T).toFixed(1) + ' daily packs, ' + (sum.feat / T).toFixed(1) + ' one-time packs.');
