#!/usr/bin/env node
// Go Fish: plays thousands of games between the computer players with the game's own rules (games/gofish-core.js),
// checks every move against the rules and that every game ends with all 13 books down, and measures the three skill
// levels against each other and how often the game's special moments come up.
// Every themed deck (games/gofish/decks.js) is played too, in turn: the rules are the same, and the game's sentences
// must name every subject properly. Then the same number of games are played for pairs (the setup's Collect), 2 to 6
// players: every move checked, all 52 cards accounted for after every move, never a pair left in a hand, and every
// game ending with all 26 pairs down (each rank twice).
//   node scripts/gofish-sim.js [games] [seed]
'use strict';
const Core = require('../games/gofish-core.js');
const Decks = require('../games/gofish/decks.js');
const THEMES = [null].concat(Decks.DECKS.map(d => d.id));
const N = +process.argv[2] || 4000;
let seed = +process.argv[3] || 7;
Core.C.rng = function () {   // (mulberry32: a small generator with good low bits)
  seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function check(st) {
  let total = st.pond.length;
  st.hands.forEach(h => { total += h.length; });
  st.books.forEach(b => { total += b.length * 4; });
  if (total !== 52) throw new Error('cards lost: ' + total);
  const ids = {};
  st.pond.concat(...st.hands).forEach(c => { if (ids[c.id]) throw new Error('card twice ' + c.id); ids[c.id] = 1; });
  st.hands.forEach((h, p) => { Core.ranksIn(h).forEach(r => { if (Core.countOf(h, r) >= 4) throw new Error('book left in hand'); }); });
}
function play(levels, next, theme) {
  const players = levels.map((l, i) => ({ name: 'P' + i, cpu: true, level: l }));
  const st = Core.newGame({ players, next, theme });
  if ((st.theme || null) !== theme) throw new Error('theme not kept: ' + theme);
  check(st);
  let moves = 0;
  const m = { lucky: 0, big: 0, streak4: 0, sweep: 0, dealt: st.dealtBooks.length, dry: 0, refill: 0 };
  while (st.phase !== 'over') {
    const p = Core.turn(st);
    const a = Core.bot(st, p);
    if (!a) throw new Error('no move for ' + p + ' in ' + st.phase);
    // the move the bot wants must be one a person could make
    if (a.k === 'ask' && !Core.canAsk(st, p, a.to, a.r)) throw new Error('illegal ask');
    const before = Core.clone(st);
    const mv = Core.apply(st, p, a);
    if (!mv) throw new Error('refused move ' + JSON.stringify(a) + ' phase ' + before.phase);
    // the answer is the truth: a "Go fish" only when they had none
    if (mv.k === 'ask' && mv.n !== Core.countOf(before.hands[a.to], a.r)) throw new Error('wrong answer');
    if (mv.k === 'ask' && mv.n === 3) m.big++;
    if (mv.k === 'ask' && mv.dry) m.dry++;
    if (mv.k === 'fish' && mv.lucky) m.lucky++;
    if (mv.k === 'fish' && mv.refill) m.refill++;
    if (mv.streak === 4) m.streak4++;
    check(st);
    if (++moves > 3000) throw new Error('game did not end');
  }
  if (Core.booksDown(st) !== 13) throw new Error('ended with ' + Core.booksDown(st) + ' books');
  if (st.hands.some(h => h.length) || st.pond.length) throw new Error('cards left at the end');
  if (Math.max(...Core.scores(st)) === 13) m.sweep++;
  // the sentences the history keeps name the deck's subjects, never a rank or "undefined"
  Core.highlights(st).forEach(h => { if (/undefined|null|NaN/.test(h) || (theme && /\b(\d+s|Jacks|Queens|Kings|Aces)\b/.test(h))) throw new Error('bad sentence: ' + h); });
  if (theme && Core.historyDetail(st).th !== theme) throw new Error('history lost the theme');
  return { st, moves, m };
}

const LV = ['easy', 'normal', 'hard'];
const wins = { easy: 0, normal: 0, hard: 0 }, games = { easy: 0, normal: 0, hard: 0 };
const tot = { lucky: 0, big: 0, streak4: 0, sweep: 0, dealt: 0, dry: 0, refill: 0, moves: 0 };
const head = {};   // head to head, two players
let n2 = 0;
for (let g = 0; g < N; g++) {
  const n = 2 + (g % 5);
  const levels = [];
  for (let i = 0; i < n; i++) levels.push(LV[(g + i) % 3]);
  const r = play(levels, g % 4 === 3 ? 'asked' : 'left', THEMES[g % THEMES.length]);
  tot.moves += r.moves;
  Object.keys(r.m).forEach(k => { tot[k] += r.m[k]; });
  const w = r.st.winner;
  levels.forEach((l, i) => { games[l] += 1 / 1; if (w.indexOf(i) >= 0) wins[l] += 1 / w.length; });
  if (n === 2) { n2++; const k = levels.join(' v '); head[k] = head[k] || [0, 0, 0]; head[k][2]++; w.forEach(i => { head[k][i] += 1 / w.length; }); }
}
const pct = (a, b) => (100 * a / b).toFixed(1) + '%';
console.log(N + ' games across the standard deck and ' + (THEMES.length - 1) + ' themed decks, every one ended with all 13 books down and no card lost.');
// every subject of every deck, said every way
Decks.DECKS.forEach(d => Core.RANKS.forEach(r => { [Core.plural(r, d.id), Core.single(r, d.id), Core.aOf(r, d.id), Core.many(2, r, d.id)].forEach(w => { if (!w || /undefined/.test(w)) throw new Error(d.id + ' ' + r); }); }));
console.log('Every subject of the ' + Decks.DECKS.length + ' themed decks has its words.');
console.log('Average moves a game: ' + (tot.moves / N).toFixed(1));
console.log('Share of wins against share of seats:');
LV.forEach(l => console.log('  ' + l.padEnd(7) + ' won ' + pct(wins[l], games[l]) + ' of the games it sat in'));
console.log('Two players, head to head (wins of the first, wins of the second, games):');
Object.keys(head).forEach(k => console.log('  ' + k.padEnd(16) + head[k].map(x => +x.toFixed(1)).join(', ')));
console.log('Moments, per game: the fish you wished for ' + (tot.lucky / N).toFixed(2) + ', three of a rank in one ask ' + (tot.big / N).toFixed(3) +
  ', a streak of 4 asks ' + (tot.streak4 / N).toFixed(3) + ', all 13 books by one player ' + pct(tot.sweep, N) + ', a book in the deal ' + (tot.dealt / N).toFixed(3));
console.log('Go fish with the pond empty, per game: ' + (tot.dry / N).toFixed(2) + '; a fish because the hand ran out: ' + (tot.refill / N).toFixed(2));

// ═══ Pairs ═══
function checkP(st) {
  const ids = {};
  const see = id => { if (ids[id]) throw new Error('card twice ' + id); ids[id] = 1; };
  st.pond.forEach(c => see(c.id));
  st.hands.forEach(h => h.forEach(c => see(c.id)));
  st.books.forEach((b, p) => {
    if (st.pc[p].length !== b.length) throw new Error('pair cards lost');
    st.pc[p].forEach((two, i) => { two.split('.').forEach(id => { see(id); const k = +id.slice(1); if (Core.RANKS[k % 13] !== b[i]) throw new Error('a pair of the wrong rank'); }); });
  });
  if (Object.keys(ids).length !== 52) throw new Error('cards lost: ' + Object.keys(ids).length);
  st.hands.forEach(h => { Core.ranksIn(h).forEach(r => { if (Core.countOf(h, r) >= 2) throw new Error('a pair left in a hand'); }); });
}
function playP(levels, next, theme) {
  const players = levels.map((l, i) => ({ name: 'P' + i, cpu: true, level: l }));
  const st = Core.newGame({ players, next, theme, col: 'pairs' });
  if (!Core.isPairs(st)) throw new Error('col not kept');
  checkP(st);
  let moves = 0;
  const m = { lucky: 0, pond: 0, both: 0, streak4: 0, dealtAll: 0, opening: st.dealtBooks.length, dry: 0, refill: 0 };
  while (st.phase !== 'over') {
    const p = Core.turn(st);
    const a = Core.bot(st, p);
    if (!a) throw new Error('no move for ' + p + ' in ' + st.phase);
    if (a.k === 'ask' && !Core.canAsk(st, p, a.to, a.r)) throw new Error('illegal ask');
    const before = Core.clone(st);
    const mv = Core.apply(st, p, a);
    if (!mv) throw new Error('refused move ' + JSON.stringify(a));
    if (mv.k === 'ask') {
      if (mv.n !== Core.countOf(before.hands[a.to], a.r)) throw new Error('wrong answer');
      if (mv.n > 1) throw new Error('more than one card handed over');
      if (mv.n && (mv.books.length !== 1 || mv.books[0] !== a.r)) throw new Error('the card asked for did not make a pair');
      if (mv.n && Core.turn(st) !== p && st.phase !== 'over' && st.hands[p].length) throw new Error('the turn passed after a good ask');
      if (mv.dry) m.dry++;
    }
    if (mv.k === 'fish') {
      const had = Core.countOf(before.hands[p], mv.c.r);
      if (had !== mv.books.length) throw new Error('a fished match not laid');
      if (mv.lucky) m.lucky++; else if (mv.books.length) m.pond++;
      if (mv.books.length && !mv.lucky && mv.asked && !mv.asked.alone && Core.turn(st) === p && st.phase !== 'over' && st.n > 1 && st.hands.some((h, q) => q !== p && h.length)) {
        // (a pair from the pond that wasn't the rank asked for doesn't keep the turn, unless nobody else can play)
        if (st.next === 'left' || mv.asked.to !== p) throw new Error('kept the turn after an unwished pair');
      }
      if (mv.refill) m.refill++;
    }
    if (mv.streak === 4) m.streak4++;
    checkP(st);
    if (++moves > 3000) throw new Error('game did not end');
  }
  if (Core.booksDown(st) !== 26) throw new Error('ended with ' + Core.booksDown(st) + ' pairs');
  const per = {}; st.books.forEach(b => b.forEach(r => { per[r] = (per[r] || 0) + 1; }));
  Core.RANKS.forEach(r => { if (per[r] !== 2) throw new Error('rank ' + r + ' made ' + per[r] + ' pairs'); });
  if (st.hands.some(h => h.length) || st.pond.length) throw new Error('cards left at the end');
  st.ev.forEach(e => { if (e.k === 'both') m.both++; if (e.k === 'dealt') m.dealtAll++; });
  Core.highlights(st).forEach(h => { if (/undefined|null|NaN/.test(h) || (theme && /\b(\d+s|Jacks|Queens|Kings|Aces)\b/.test(h))) throw new Error('bad sentence: ' + h); });
  const d = Core.historyDetail(st);
  if (d.cl !== 'p' || d.o.split(' ').length !== 26 || d.o.split(' ').some(x => !/^\d\.[2-9TJQKA]\.\d+\.[afd]\.[shcd]{2}$/.test(x))) throw new Error('history detail: ' + d.o);
  return { st, moves, m, hl: Core.highlights(st).length };
}
{
  const wins = { easy: 0, normal: 0, hard: 0 }, games = { easy: 0, normal: 0, hard: 0 };
  const tot = { lucky: 0, pond: 0, both: 0, streak4: 0, dealtAll: 0, opening: 0, dry: 0, refill: 0, moves: 0, bothHl: 0 };
  const head = {}, byN = {};
  for (let g = 0; g < N; g++) {
    const n = 2 + (g % 5);
    const levels = [];
    for (let i = 0; i < n; i++) levels.push(LV[(g + i) % 3]);
    const r = playP(levels, g % 4 === 3 ? 'asked' : 'left', THEMES[g % THEMES.length]);
    tot.moves += r.moves;
    Object.keys(r.m).forEach(k => { tot[k] += r.m[k]; });
    if (Core.highlights(r.st).some(h => /both pairs/.test(h))) tot.bothHl++;
    byN[n] = byN[n] || { g: 0, moves: 0, opening: 0 }; byN[n].g++; byN[n].moves += r.moves; byN[n].opening += r.m.opening / n;
    const w = r.st.winner;
    levels.forEach((l, i) => { games[l] += 1; if (w.indexOf(i) >= 0) wins[l] += 1 / w.length; });
    if (n === 2) { const k = levels.join(' v '); head[k] = head[k] || [0, 0, 0]; head[k][2]++; w.forEach(i => { head[k][i] += 1 / w.length; }); }
  }
  console.log('');
  console.log('Pairs: ' + N + ' games, 2 to 6 players, every one ended with all 26 pairs down, each rank twice, no card lost and never a pair left in a hand.');
  console.log('Average moves a game: ' + (tot.moves / N).toFixed(1) + ' (' + Object.keys(byN).map(n => n + ' players ' + (byN[n].moves / byN[n].g).toFixed(1)).join(', ') + ')');
  console.log('Pairs laid from the dealt hand, per player: ' + Object.keys(byN).map(n => n + ' players ' + (byN[n].opening / byN[n].g).toFixed(2)).join(', '));
  console.log('Share of wins against share of seats:');
  LV.forEach(l => console.log('  ' + l.padEnd(7) + ' won ' + pct(wins[l], games[l]) + ' of the games it sat in'));
  console.log('Two players, head to head (wins of the first, wins of the second, games):');
  Object.keys(head).forEach(k => console.log('  ' + k.padEnd(16) + head[k].map(x => +x.toFixed(1)).join(', ')));
  console.log('Moments, per game: the fish you wished for ' + (tot.lucky / N).toFixed(2) + ', another pair from the pond ' + (tot.pond / N).toFixed(2) +
    ', both pairs of a rank by one player in play ' + (tot.both / N).toFixed(2) + ' (kept as a highlight in ' + pct(tot.bothHl, N) + ' of games), a streak of 4 asks ' + (tot.streak4 / N).toFixed(3) +
    ', all four of a rank in the deal ' + (tot.dealtAll / N).toFixed(3));
  console.log('Go fish with the pond empty, per game: ' + (tot.dry / N).toFixed(2) + '; a fish because the hand ran out: ' + (tot.refill / N).toFixed(2));
}
