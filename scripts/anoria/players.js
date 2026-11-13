// Three to six players, and teams (2026-11-13): the five ready decks dealt round the table, each with its own robot
// style (as endings.js plays them), on four threads at once.
//   node scripts/anoria/players.js <shape> [games] [first seed] ['<json of rule changes>']
//   shape: 2, 3, 4, 5, 6 (everyone for themselves), or teams: 2v2, 3v3, 2v2v2 (teammates sit on alternating spokes)
//   e.g. node scripts/anoria/players.js 4 400 1000 '{"target":30}'
// "prof": "<name>" in the json plays every seat with one robot (as "normal"); "byN": {"<shape>": {rule changes}} gives
// rules for one shape only (as "target" by player count).
// It says: how often each seat wins, counted from the player who took the first turn of the game (seat 1) round the
// table (in a team game, each team, counted from the first player's team), each deck's share of wins against what a
// fair share is, how long games run, how they end (Renown, the last side left after Seals, the round limit), how many
// players are put out of the game and when, and how far ahead the winner is.
'use strict';
const path = require('path'), { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const ROOT = path.join(__dirname, '../..');
const SHAPES = { 2: [2], 3: [3], 4: [4], 5: [5], 6: [6], '2v2': [4, [[0, 2], [1, 3]]], '3v3': [6, [[0, 2, 4], [1, 3, 5]]], '2v2v2': [6, [[0, 3], [1, 4], [2, 5]]] };
const STYLE = { Explorers: 'raider', Legion: 'brawler', Legacy: 'keeper', Court: 'holder', Pathfinders: 'raider' };

function runGames(shape, from, to, seed0, extra) {
  const E = require(path.join(ROOT, 'games/anoria/engine')), { ARCH } = require(path.join(ROOT, 'games/anoria/cards'));
  const D = Object.keys(ARCH), dk = k => ARCH[k].cards.concat(ARCH[k].cards), [N, teams] = SHAPES[shape];
  const x = Object.assign({}, extra); const by = x.byN; delete x.byN; const prof = x.prof; delete x.prof;
  const cfg = Object.assign({}, E.STD, { target: E.targetFor(teams) }, x, by && by[shape] ? by[shape] : {}, teams ? { teams } : {});   // (the target by the size of a side unless the json names one)
  const out = [];
  for (let i = from; i < to; i++) {
    // (the decks round the table: a fresh order of the five every game, so each deck sits in each seat as often; six
    // players: one deck twice)
    const R = E.rng(seed0 * 7 + i * 7919), ord = E.shuffle(D.slice(), R), ks = []; for (let o = 0; o < N; o++) ks.push(ord[o % 5]);
    const t0 = Date.now(), S = E.play(ks.map(dk), ks.map(k => ARCH[k].guide), ks.map(k => E.PROF[prof || STYLE[k]]), cfg, seed0 + i);
    const ren = S.P.map((p, o) => E.sren(S, o)), sides = teams ? teams.length : N, sideOf = o => (S.tm ? S.tm[o] : o);
    const sr = new Array(sides).fill(0); for (let o = 0; o < N; o++) sr[sideOf(o)] = ren[o];
    const ws = S.winner >= 0 ? sideOf(S.winner) : -1, srt = sr.slice().sort((a, b) => b - a);
    out.push({ N, f0: S.f0 || 0, w: S.winner, ws, fs: sideOf(S.f0 || 0), how: S.how, round: S.round, ks, top: ws >= 0 ? sr[ws] : srt[0], second: ws >= 0 ? Math.max.apply(null, sr.filter((_, k) => k !== ws).concat([-99])) : srt[1],
      outs: (S.st.outs || []).map(x => x[1]), sat: (S.st.outs || []).map(x => S.round - x[1]), seals: S.st.sealBreaks, l4: teams ? null : S.st.lead[3], ms: Date.now() - t0, target: cfg.target, sides });
  }
  return out;
}

if (!isMainThread) { parentPort.postMessage(runGames(workerData.shape, workerData.from, workerData.to, workerData.seed0, workerData.extra)); return; }

const shape = process.argv[2] || '3', n = +process.argv[3] || 200, seed0 = +process.argv[4] || 1000, extra = JSON.parse(process.argv[5] || '{}');
if (!SHAPES[shape]) { console.log('shapes: ' + Object.keys(SHAPES).join(', ')); process.exit(1); }
const TH = Math.min(4, n), jobs = [];
for (let t = 0; t < TH; t++) jobs.push(new Promise((res, rej) => { const w = new Worker(__filename, { workerData: { shape, from: Math.floor(n * t / TH), to: Math.floor(n * (t + 1) / TH), seed0, extra } }); w.on('message', res); w.on('error', rej); }));
Promise.all(jobs).then(parts => {
  const G = [].concat.apply([], parts), N = G[0].N, sides = G[0].sides, teams = sides !== N, pc = (a, b) => (100 * a / b).toFixed(1);
  const seatW = new Array(sides).fill(0); let draws = 0;
  const deck = {}; let l4 = 0, l4n = 0, sat = [], ren = 0, seal = 0, cap = 0, rounds = [], outs = 0, gOut = 0, firstOut = [], margin = 0, top = 0, ms = 0;
  for (const g of G) {
    if (g.ws < 0) draws++; else seatW[teams ? (g.ws - g.fs + sides) % sides : (g.w - g.f0 + N) % N]++;
    if (g.how === 'seals') seal++; else if (g.top >= g.target) ren++; else cap++;
    rounds.push(g.round); outs += g.outs.length; sat = sat.concat(g.sat); if (g.outs.length) { gOut++; firstOut.push(Math.min.apply(null, g.outs)); }
    if (g.ws >= 0) { margin += g.top - g.second; top += g.top; } ms += g.ms; if (g.l4 != null && g.l4 >= 0) { l4n++; if (g.l4 === g.w) l4++; }
    g.ks.forEach((k, o) => { const d = deck[k] || (deck[k] = { g: 0, w: 0 }); d.g++; if (g.w >= 0 && (teams ? false : g.w === o)) d.w++; });
  }
  rounds.sort((a, b) => a - b); const q = f => rounds[Math.floor(f * (rounds.length - 1))], avg = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  const won = G.length - draws, fair = 100 / sides;
  console.log(shape + (teams ? ' (teams)' : ' players') + '  ' + G.length + ' games, first seed ' + seed0 + (Object.keys(extra).length ? ', ' + JSON.stringify(extra) : '') + ', first to ' + G[0].target + ', ' + (ms / G.length).toFixed(0) + ' ms a game');
  console.log('  ' + (teams ? 'teams (the first player\'s team first)' : 'seats (from the first player)') + ': ' + seatW.map((w, k) => (k + 1) + ': ' + pc(w, G.length)).join('  ') + '  (fair ' + fair.toFixed(1) + ', spread ' + ((Math.max.apply(null, seatW) - Math.min.apply(null, seatW)) * 100 / G.length).toFixed(1) + ')  draws ' + pc(draws, G.length));
  if (!teams) console.log('  decks (wins of games played, fair ' + fair.toFixed(1) + '): ' + Object.keys(deck).map(k => k + ' ' + pc(deck[k].w, deck[k].g)).join('  '));
  console.log('  rounds: average ' + avg(rounds).toFixed(2) + ', most games ' + q(0.1) + ' to ' + q(0.9) + ', longest ' + q(1));
  console.log('  ends: ' + pc(ren, G.length) + '% on Renown, ' + pc(seal, G.length) + '% the last ' + (teams ? 'team' : 'player') + ' left after Seals, ' + pc(cap, G.length) + '% at the round limit');
  console.log('  players put out: ' + (outs / G.length).toFixed(2) + ' a game, in ' + pc(gOut, G.length) + '% of games' + (firstOut.length ? ', the first in round ' + avg(firstOut).toFixed(1) + ' on average, and a player put out sits out ' + avg(sat).toFixed(1) + ' rounds' : '') + '; the winner has ' + (top / Math.max(1, won)).toFixed(1) + ' Renown, ahead of the next by ' + (margin / Math.max(1, won)).toFixed(1) + (l4n ? '; the leader after round 4 wins ' + pc(l4, l4n) + '%' : ''));
});
