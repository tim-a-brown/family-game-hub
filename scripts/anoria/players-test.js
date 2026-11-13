// node scripts/anoria/players-test.js: the rules for three to six players and for teams (2026-11-13), each on a table
// laid by hand and checked against what it says: who is put out and when, what leaves the map with them, who wins,
// whose turn it is, teammates who can't clash and share their Renown, how a team holds a Domain, and the cards whose
// meaning changes with more players (the Columbian Exchange, the Congress of Vienna). Prints what failed and the count.
const repo = require('path').join(__dirname, '../..');
const E = require(repo + '/games/anoria/engine.js'), C = require(repo + '/games/anoria/cards.js');
const ALL = Object.keys(C.PLACES).filter(id => C.PLACES[id].pw); let fails = 0, oks = 0;
const ok = (name, cond, more) => { if (cond) oks++; else { fails++; console.log('FAIL ' + name + (more !== undefined ? ' ' + JSON.stringify(more) : '')); } };
// A table of N players laid by hand. Positions: 2o player o's Gate, 2o + 1 their Outpost, 2N the Crossroads. lay names
// Domains by position (null: a plain Domain whose power does nothing that matters here).
const QUIET = ['draw', 'forge', 'print', 'ships', 'books', 'loan', 'recall', 'school', 'punt', 'cheap', 'patron', 'code', 'hire'];   // (powers that change nothing these tests look at)
function game(N, lay, opt) {
  opt = opt || {}; lay = lay || []; const np = 2 * N + 1, used = lay.filter(x => x), plain = ALL.filter(id => used.indexOf(id) < 0 && QUIET.indexOf(C.PLACES[id].pw) >= 0);
  const L = []; let k = 0; for (let i = 0; i < np; i++) L.push(lay[i] || plain[k++]);
  const rest = ALL.filter(id => L.indexOf(id) < 0), st = []; for (let o = 0; o < N; o++) st.push(rest.slice(o * 5, o * 5 + 15));
  const decks = [], guides = []; for (let o = 0; o < N; o++) { decks.push(C.ARCH.Legion.cards.concat(C.ARCH.Legion.cards)); guides.push((opt.guides || [])[o] || 'leonardo'); }
  const S = E.newGame(decks, guides, Object.assign({}, E.STD, { log: 1 }, opt.cfg || {}), E.rng(7), st, { lay: L, ban: opt.ban, first: 0 });
  S.figs = []; S.turn = 0; S.P.forEach(p => { p.spark = 5; p.hand = []; }); S.ev = [];
  return S;
}
let U = 1000;
const fig = (S, c, o, p, x) => { const f = Object.assign({ u: U++, c, o, p, rdy: 1, arr: 0, tb: 0, stun: 0, stay: 0, li: 0, acted: 0 }, x || {}); S.figs.push(f); return f; };

// ── Everyone for themselves: a player with no Seals left is out ──
{ const S = game(3); S.P[2].seals = 1; fig(S, 'leonidas', 0, 4); const g = fig(S, 'spartacus', 2, 5); E.endRound(S);
  ok('3: the last Seal breaks: out', S.P[2].out === 1 && S.P[2].seals === 0, S.P.map(p => [p.out, p.seals]));
  ok('3: their Figures leave the map', !S.figs.some(f => f.o === 2) && S.P[2].gone.indexOf('spartacus') >= 0);
  const ev = S.ev.find(e => e.t === 'out'); ok('3: the out event', ev && ev.o === 2 && ev.us[0] === g.u && JSON.stringify(ev.left) === '[0,1]', ev);
  ok('3: the game goes on with two', !S.over && S.round === 2);
  ok('3: turns leave out a player who is out', E.order(S).indexOf(2) < 0 && E.order(S).length === 2, E.order(S));
  ok('3: their Domains stay, with their banners', S.places[4] && S.ban[4] === 2 && S.ban[5] === 2);
  // (the Gate of a player who is out: anyone holds it, it scores, and nothing breaks)
  S.figs = []; fig(S, 'leonidas', 1, 4); const r = S.P[1].renown, b = S.P[1].broke; E.endRound(S);
  ok('3: a Gate of a player who is out scores, and breaks nothing', S.P[1].renown === r + 2 && S.P[1].broke === b, [S.P[1].renown, r]); }
{ const S = game(3); S.P[2].out = 1; S.P[2].seals = 0; ok('3: the empty Gate of a player who is out is nobody\'s', E.holder(S, 4) === -1 && E.holder(S, 0) === 0, [E.holder(S, 4), E.holder(S, 0)]);
  const T = game(4, [], { cfg: { teams: [[0, 2], [1, 3]] } }); ok('2v2: an empty Gate is its own player\'s', E.holder(T, 2) === 1 && E.holder(T, 4) === 2, [E.holder(T, 2), E.holder(T, 4)]);
  T.P[2].out = 1; ok('2v2: the empty Gate of a player who is out is nobody\'s, not their teammate\'s', E.holder(T, 4) === -1, E.holder(T, 4)); }
{ const S = game(3); S.P[1].seals = 1; S.P[2].seals = 0; S.P[2].out = 1; fig(S, 'leonidas', 0, 2); E.endRound(S);
  ok('3: one player left wins on Seals', S.over && S.how === 'seals' && S.winner === 0, [S.over, S.how, S.winner]); }
{ const S = game(3); S.P.forEach(p => { p.seals = 1; }); fig(S, 'leonidas', 0, 2); fig(S, 'leonidas', 1, 4); fig(S, 'leonidas', 2, 0); S.P[1].renown = 9; S.P[0].renown = 4;
  E.endRound(S); ok('3: everyone out at one count: the most Renown wins', S.over && S.how === 'seals' && S.winner === 1, [S.winner, S.P.map(p => p.renown)]); }
{ const S = game(4); S.P[3].renown = 30; S.P[3].out = 1; S.P[3].seals = 0; S.P[0].renown = 24; fig(S, 'leonidas', 0, 0); E.endRound(S);
  ok('4: Renown of a player who is out never wins', S.over && S.how === 'renown' && S.winner === 0, [S.over, S.winner, S.P[0].renown]); }
{ const S = game(4); S.P[0].renown = 20; S.P[2].renown = 20; fig(S, 'leonidas', 1, 3); S.P[1].renown = 23; E.endRound(S);
  ok('4: first to the target wins at the count', S.over && S.winner === 1 && S.P[1].renown === 25, [S.winner, S.P.map(p => p.renown)]); }
{ const S = game(4, [], { cfg: { outEnds: 1 } }); S.P[2].seals = 1; S.P[3].renown = 9; fig(S, 'leonidas', 0, 4); E.endRound(S);
  ok('4 outEnds: the count that puts a player out ends the game, the most Renown still in wins', S.over && S.winner === 3 && S.P[2].out, [S.over, S.winner]); }
// ── Who goes first ──
{ const S = game(4); S.round = 2; S.P[2].renown = 5; ok('4: the leader goes first, then round the table', JSON.stringify(E.order(S)) === '[2,3,0,1]', E.order(S));
  S.P[3].out = 1; ok('4: round the table leaves out a player who is out', JSON.stringify(E.order(S)) === '[2,0,1]', E.order(S));
  S.P[2].out = 1; S.P[0].renown = 5; S.P[1].renown = 5; S.round = 3; ok('4: level: round the table by rounds, past players who are out', E.firstOf(S) === 0, E.firstOf(S));
  S.gw = 0; ok('4: Greenwich: its holder takes the last turn', JSON.stringify(E.order(S)) === '[1,0]', E.order(S)); }
{ const S = game(4, [], { cfg: { order: 'rank' } }); S.round = 2; S.P[1].renown = 3; S.P[3].renown = 7; ok('4 rank: from the most Renown to the least', JSON.stringify(E.order(S)) === '[3,1,2,0]', E.order(S)); }
// ── Set-up: the highest roll's offer is the Crossroads; a tie rolls again among the tied ──
{ const S = E.newGame([0, 1, 2].map(() => C.ARCH.Legion.cards.concat(C.ARCH.Legion.cards)), ['leonardo', 'leonardo', 'leonardo'], Object.assign({}, E.STD, { log: 1 }), E.rng(3), [0, 1, 2].map(o => ALL.slice(o * 15, o * 15 + 15)), { wait: true });
  for (let o = 0; o < 3; o++) E.setupLay(S, o, E.setupOptions(S, o)[0]);
  E.setupRoll(S, E.rng(5), [[6, 6, 2], [3, 5, 0]]);
  ok('3: set-up, a tie rolls again among the tied', S.su.dibs === 1 && S.su.first === 2 && S.f0 === 2, S.su);
  ok('3: set-up, the Crossroads is the winner\'s offer', S.places[6] === S.su.lay[1].offer && S.ban[6] === 1);
  ok('3: set-up, the others\' offers start their discard piles', S.P[0].dgone.indexOf(S.su.lay[0].offer) >= 0 && S.P[2].dgone.indexOf(S.su.lay[2].offer) >= 0);
  const T = E.newGame([0, 1, 2, 3].map(() => C.ARCH.Legion.cards.concat(C.ARCH.Legion.cards)), ['leonardo', 'leonardo', 'leonardo', 'leonardo'], Object.assign({}, E.STD, { log: 1 }), E.rng(9), [0, 1, 2, 3].map(o => ALL.slice(o * 15, o * 15 + 15)), { wait: true });
  for (let o = 0; o < 4; o++) E.setupLay(T, o, E.setupOptions(T, o)[0]); E.setupRoll(T, E.rng(1));
  ok('4: set-up rolls until one is highest', T.su.step === 'done' && T.places.every(x => x) && T.su.rolls.length >= 1); }
// ── The cards whose meaning changes with more players ──
{ const S = game(3); S.P[0].hand = ['columbian']; const acts = E.actions(S).filter(a => a.t === 'deed');
  ok('3: the Columbian Exchange asks with whom', acts.length === 2 && acts.every(a => a.w === 1 || a.w === 2), acts);
  const before = S.places.slice(); E.apply(S, acts.find(a => a.w === 2));
  ok('3: the Columbian Exchange swaps your Gate and Outpost with theirs', S.places[0] === before[4] && S.places[4] === before[0] && S.places[1] === before[5] && S.places[5] === before[1] && S.places[2] === before[2], S.places); }
{ const S = game(4); S.P[1].out = 1; S.P[0].hand = ['congress']; const a = E.actions(S).find(x => x.t === 'deed'); ok('4: the Congress of Vienna is played', !!a);
  const before = S.places.slice(); E.apply(S, a, 0, 0, { ra: 4, rd: 5 });
  ok('4: Congress 4 and 5: the Outpost and Gate of the next player still in', S.places[5] === before[4] && S.places[4] === before[5], [S.places, before]); }
// ── Teams ──
const T2 = [[0, 2], [1, 3]];
{ const S = game(4, [], { cfg: { teams: T2 } }); const f = fig(S, 'leonidas', 0, 3); fig(S, 'leonidas', 2, 3); const e = fig(S, 'spartacus', 1, 3);
  const cl = E.actions(S).filter(a => a.t === 'clash'); ok('2v2: no clash with a teammate', cl.length && cl.every(a => a.v === e.u), cl);
  ok('2v2: teammates are allies', E.ally(S, 0, 2) && !E.ally(S, 0, 1)); }
{ const S = game(4, [], { cfg: { teams: T2 } }); fig(S, 'leonidas', 2, 0); const b = S.P[0].seals; E.endRound(S);
  ok('2v2: a teammate holding your Gate breaks nothing', S.P[0].seals === b && S.P[2].broke === 0); }
{ const S = game(4, [], { cfg: { teams: T2 } }); fig(S, 'leonidas', 0, 3); fig(S, 'leonidas', 2, 3); fig(S, 'napoleon', 1, 3);
  ok('2v2: teammates\' Might doesn\'t add up: 3 and 3 lose to 5', E.holder(S, 3) === 1, [E.mights(S, 3), E.holder(S, 3)]);
  const A = game(4, [], { cfg: { teams: T2, tmight: 'add' } }); fig(A, 'leonidas', 0, 3); fig(A, 'leonidas', 2, 3); fig(A, 'napoleon', 1, 3);
  ok('2v2 add (a test): 3 and 3 beat 5', E.holder(A, 3) === 0, [E.mights(A, 3), E.holder(A, 3)]);
  const L = game(4, [], { cfg: { teams: T2 } }); fig(L, 'leonidas', 0, 8); fig(L, 'leonidas', 2, 8); fig(L, 'spartacus', 1, 8);
  ok('2v2: teammates level at the top: the team holds it, the first in seat order', E.holder(L, 8) === 0, E.holder(L, 8));
  const M = game(4, [], { cfg: { teams: T2 } }); fig(M, 'leonidas', 0, 8); fig(M, 'spartacus', 2, 8); fig(M, 'spartacus', 1, 8);
  ok('2v2: a teammate standing there doesn\'t take it from you', E.holder(M, 8) === 0, E.holder(M, 8)); }
{ const S = game(4, [], { cfg: { teams: T2 } }); S.P[0].renown = 12; S.P[2].renown = 12; fig(S, 'leonidas', 0, 0); E.endRound(S);
  ok('2v2: a team\'s Renown is its players\' together, and it wins together', S.over && S.how === 'renown' && S.wt === 0 && S.winner === 0, [S.over, S.wt, S.winner]); }
{ const S = game(4, [], { cfg: { teams: T2 } }); S.P[0].seals = 1; fig(S, 'leonidas', 1, 0); E.endRound(S);
  ok('2v2: a player is out, the team plays on', S.P[0].out && !S.over && JSON.stringify(E.order(S).sort()) === '[1,2,3]', E.order(S));
  S.figs = []; S.P[2].seals = 1; fig(S, 'leonidas', 1, 4); E.endRound(S);
  ok('2v2: the team is out when both are out', S.over && S.how === 'seals' && S.wt === 1, [S.over, S.wt]); }
{ const S = game(4, [], { cfg: { teams: T2 } }); fig(S, 'leonidas', 0, 3); const m = fig(S, 'leonidas', 2, 3), e = fig(S, 'hammurabi', 1, 3); S.P[0].hand = ['eclipse']; E.apply(S, E.actions(S).find(a => a.t === 'deed' && a.p === 3));
  ok('2v2: Eclipse stops enemies, not a teammate', e.stun === 1 && !m.stun); }
{ const S = game(4, [], { cfg: { teams: T2 } }); const me = fig(S, 'leonidas', 0, 3), m = fig(S, 'leonidas', 2, 3), e = fig(S, 'hammurabi', 1, 3); S.P[0].hand = ['lisbonquake']; E.apply(S, E.actions(S).find(a => a.t === 'deed' && a.p === 3));
  ok('2v2: the Lisbon Earthquake stops every Figure there', me.stun && m.stun && e.stun); }
{ const S = game(4, [], { cfg: { teams: T2 } }); fig(S, 'leonidas', 0, 3); fig(S, 'boudica', 2, 3); fig(S, 'boudica', 1, 3); S.P[0].hand = ['canossa'];
  const acts = E.actions(S).filter(a => a.t === 'deed'); ok('2v2: the Walk to Canossa chooses an enemy only', acts.length === 1 && E.byU(S, acts[0].v).o === 1, acts); }
{ const S = game(4, [], { cfg: { teams: T2 } }); const f = fig(S, 'pericles', 0, 3); fig(S, 'spartacus', 0, 3); fig(S, 'leonidas', 2, 3); fig(S, 'leonidas', 2, 3); fig(S, 'hammurabi', 1, 3);
  ok('2v2: "more Figures here" counts enemy Figures only', E.might(S, f, 0) === 3 + 2, E.might(S, f, 0)); }
{ const S = game(4, [], { cfg: { teams: T2 } }); fig(S, 'leonidas', 0, 3); S.P[1].hand = ['veto']; S.P[1].reserve = 3; S.P[2].hand = ['veto']; S.P[2].reserve = 3; const e = fig(S, 'hammurabi', 3, 3); S.P[0].hand.push('eclipse');
  E.apply(S, E.actions(S).find(a => a.t === 'deed' && a.p === 3));
  ok('2v2: only the player whose Figure is hit can Veto (a teammate\'s Veto stays in hand)', S.P[2].hand.length === 1 && S.P[1].hand.length === 1 && e.stun === 1, [S.P[1].hand, S.P[2].hand, e.stun]); }
// ── Domain powers with more players ──
{ const S = game(3, [null, null, null, 'persepolis']); fig(S, 'leonidas', 1, 3); fig(S, 'spartacus', 0, 3); fig(S, 'spartacus', 2, 3); E.endRound(S);
  ok('3: Persepolis takes 1 Spark from each enemy there', S.P[1].sb === 2 && S.P[0].sb === -1 && S.P[2].sb === -1, S.P.map(p => p.sb)); }
{ const S = game(3, [null, null, null, null, null, 'machu']); S.P[2].out = 1; S.P[2].seals = 0; const f = fig(S, 'leonidas', 0, 6);
  ok('3: Machu Picchu on the side of a player who is out lets anyone in', E.walkDests(S, f).indexOf(5) >= 0); }
{ const S = game(3, [], { guides: ['joan'] }); S.P[2].renown = 9; S.P[2].out = 1; const f = fig(S, 'leonidas', 0, 3), g = fig(S, 'leonidas', 1, 3);
  ok('3: Joan: a player who is out doesn\'t count as ahead', E.might(S, f, 1, g) === E.might(S, g, 1, f), [E.might(S, f, 1, g), E.might(S, g, 1, f)]); }
{ const S = game(3); S.P[1].renown = 4; S.P[2].renown = 4; S.turn = 0; S.round = 2; E.startTurn(S); const a = S.P[0].spark; S.P[0].renown = 4; S.turn = 0; E.startTurn(S);
  ok('3: catching up: behind every other player, 1 more Spark', a === S.P[0].spark + 1, [a, S.P[0].spark]); }
{ const S = game(3, [null, null, null, null, null, null, 'orleans']); fig(S, 'napoleon', 1, 6); const f = fig(S, 'leonidas', 0, 6); fig(S, 'spartacus', 2, 6);
  ok('3: Orléans helps against whoever holds it', E.might(S, f, 1) === E.might(S, f, 0) + 2); }
// ── A whole game at every count ──
for (const [N, teams] of [[3], [4], [5], [6], [4, T2], [6, [[0, 2, 4], [1, 3, 5]]], [6, [[0, 3], [1, 4], [2, 5]]]]) {
  const ks = Object.keys(C.ARCH), decks = [], guides = [], profs = [];
  for (let o = 0; o < N; o++) { const k = ks[o % 5]; decks.push(C.ARCH[k].cards.concat(C.ARCH[k].cards)); guides.push(C.ARCH[k].guide); profs.push(E.PROF.normal); }
  const S = E.play(decks, guides, profs, Object.assign({}, E.STD, { log: 1 }, teams ? { teams } : {}), 41);
  ok('a whole game, ' + (teams ? JSON.stringify(teams) : N + ' players'), S.over && (S.winner >= 0 || S.winner === -1) && !S.figs.some(f => S.P[f.o].out) && S.ev.filter(e => e.t === 'turn').every(e => !S.ev.some(x => x.t === 'out' && x.o === e.o && S.ev.indexOf(x) < S.ev.indexOf(e))));
}
console.log(oks + ' passed' + (fails ? ', ' + fails + ' failed' : ''));
if (fails) process.exitCode = 1;
