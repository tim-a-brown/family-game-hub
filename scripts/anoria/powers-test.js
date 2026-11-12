// node scripts/anoria/powers-test.js: every Domain's power on a table laid by hand, checked against what its sentence
// says (text.js DRULE). Run it after any change to a power; it prints what failed and the count.
const repo = require('path').join(__dirname, '../..');
const E = require(repo + '/games/anoria/engine.js'), C = require(repo + '/games/anoria/cards.js');
const ALL = Object.keys(C.PLACES); let fails = 0, oks = 0;
const ok = (name, cond, more) => { if (cond) oks++; else { fails++; console.log('FAIL ' + name + (more !== undefined ? ' ' + JSON.stringify(more) : '')); } };
// positions: 0 P0 Gate, 1 P0 Outpost, 2 P1 Gate, 3 P1 Outpost, 4 Crossroads
function game(lay, opt) {
  opt = opt || {}; const fill = ALL.filter(x => lay.indexOf(x) < 0 && ['forbidden', 'thermopylae', 'appian', 'globe', 'acropolis', 'aachen'].indexOf(x) < 0);
  const filler = ['forbidden', 'thermopylae', 'appian', 'globe', 'acropolis'];
  const L = [0, 1, 2, 3, 4].map(i => lay[i] || (lay.indexOf(filler[i]) < 0 ? filler[i] : 'aachen'));
  const st = [fill.slice(0, 15), fill.slice(15, 30)];
  const S = E.newGame([C.ARCH.Legion.cards.concat(C.ARCH.Legion.cards), C.ARCH.Court.cards.concat(C.ARCH.Court.cards)], opt.guides || ['leonardo', 'leonardo'], Object.assign({}, E.STD, { log: 1 }), E.rng(7), st, { lay: L, ban: opt.ban, first: 0 });
  S.figs = []; S.turn = 0; S.P.forEach(p => { p.spark = 5; p.hand = []; }); S.ev = [];
  return S;
}
let U = 1000;
const fig = (S, c, o, p, x) => { const f = Object.assign({ u: U++, c, o, p, rdy: 1, arr: 0, tb: 0, stun: 0, stay: 0, li: 0, acted: 0 }, x || {}); S.figs.push(f); return f; };
const has = (acts, f) => acts.some(f);
// ── Commerce ──
{ const S = game([null, 'malacca']); const f = fig(S, 'leonidas', 0, 1); ok('harbour outpost +1', E.might(S, f, 0) === 4, E.might(S, f, 0));
  const T = game(['malacca']); const g = fig(T, 'leonidas', 0, 0); ok('harbour at a Gate: nothing', E.might(T, g, 0) === 3); }
{ const S = game([null, null, null, null, 'petra']); const f = fig(S, 'leonidas', 0, 1); S.P[0].spark = 0; ok('toll: no Spark, no walk in', E.walkDests(S, f).indexOf(4) < 0);
  S.P[0].spark = 2; ok('toll: can walk in', E.walkDests(S, f).indexOf(4) >= 0); E.apply(S, { t: 'walk', u: f.u, p: 4 }); ok('toll paid', S.P[0].spark === 1, S.P[0].spark);
  const S2 = game([null, null, null, null, 'petra']); fig(S2, 'leonidas', 0, 4); const f2 = fig(S2, 'spartacus', 0, 1); S2.P[0].spark = 0; ok('toll: holder walks free', E.walkDests(S2, f2).indexOf(4) >= 0); }
{ const S = game([null, null, null, null, 'lisbon']); fig(S, 'leonidas', 0, 4); E.endRound(S); ok('monopoly +2 at the Crossroads', S.P[0].sb === 2, S.P[0].sb);
  const T = game([null, null, null, null, 'lisbon']); fig(T, 'leonidas', 0, 4); fig(T, 'hammurabi', 1, 4); E.endRound(T); ok('monopoly both there: nothing', T.P[0].sb === 0 && T.P[1].sb === 0);
  const U2 = game([null, 'lisbon']); fig(U2, 'leonidas', 0, 1); E.endRound(U2); ok('monopoly: nothing at an Outpost', U2.P[0].sb === 0); }
{ const S = game([null, 'firenze']); fig(S, 'leonidas', 0, 1); const a = E.actions(S).find(x => x.t === 'loan'); ok('loan offered', !!a, a);
  E.apply(S, a); ok('loan +2', S.P[0].spark === 7 && S.P[0].debt === 2); ok('loan once a turn', !E.actions(S).some(x => x.t === 'loan'));
  E.endTurn(S); S.turn = 0; S.round = 3; E.startTurn(S); ok('debt paid next turn', S.P[0].spark === 4 - 2 && !S.P[0].debt, S.P[0].spark); }
{ const S = game([null, 'timbuktu']); fig(S, 'leonidas', 0, 1); const h = S.P[0].hand.length; const a = E.actions(S).find(x => x.t === 'buy'); ok('buy offered', !!a);
  E.apply(S, a); ok('buy draws', S.P[0].hand.length === h + 1 && S.P[0].spark === 4); ok('buy once', !E.actions(S).some(x => x.t === 'buy'));
  const T = game(['timbuktu']); fig(T, 'leonidas', 0, 0); ok('Timbuktu at a Gate: no buy', !E.actions(T).some(x => x.t === 'buy')); }
{ const S = game([null, null, null, 'carthage']); fig(S, 'leonidas', 0, 3); fig(S, 'hammurabi', 1, 3); const a = E.actions(S).find(x => x.t === 'hire'); ok('hire offered to a player there', !!a);
  E.apply(S, a); ok('hire +2 there', E.mights(S, 3)[0] === 5, E.mights(S, 3)); ok('hire once', !E.actions(S).some(x => x.t === 'hire')); E.endRound(S); ok('hire gone at the count', S.pb[3][0] === 0); }
{ const S = game([null, 'venice', null, null, 'kilwa']); fig(S, 'leonidas', 0, 1); fig(S, 'leonidas', 0, 4); E.endRound(S); ok('league 2 + kilwa 1', S.P[0].sb === 3, S.P[0].sb); }
{ const S = game([null, 'djenne']); fig(S, 'leonidas', 0, 1); fig(S, 'hammurabi', 1, 1); E.endRound(S); ok('fair both', S.P[0].sb === 1 && S.P[1].sb === 1); }
// ── Industry ──
{ const S = game([null, 'damascus']); const f = fig(S, 'spartacus', 0, 1), g = fig(S, 'hammurabi', 0, 1); ok('facV', E.might(S, f, 0) === 4 && E.might(S, g, 0) === 4, [E.might(S, f, 0), E.might(S, g, 0)]); }
{ const S = game([null, 'mainz']); fig(S, 'leonidas', 0, 1); S.P[0].hand = ['caravan', 'caravan']; const h = S.P[0].hand.length; const a = E.actions(S).find(x => x.t === 'deed');
  E.apply(S, a); ok('print draws once', S.P[0].hand.length === h, S.P[0].hand.length); const b = E.actions(S).find(x => x.t === 'deed'); E.apply(S, b); ok('print only once a turn', S.P[0].hand.length === h - 1); }
{ const S = game([null, 'jingdezhen']); fig(S, 'leonidas', 0, 1); S.P[0].relics = ['compass', 'press']; E.endRound(S); ok('kiln 2', S.P[0].sb === 2); }
{ const S = game([null, 'laurion']); fig(S, 'leonidas', 0, 1); E.endRound(S); ok('strike 2', S.P[0].sb === 2); S.P[0].sb = 0; E.endRound(S); ok('strike once', S.P[0].sb === 0); }
{ const S = game([null, 'longjiang']); fig(S, 'leonidas', 0, 1); ok('ships', E.costOf(S, 0, 'zhenghe', 0) === 3 && E.costOf(S, 1, 'zhenghe', 2) === 4); }
{ const S = game([null, 'benin']); const f = fig(S, 'leonidas', 0, 1); ok('stay not yet', E.might(S, f, 0) === 3); E.endRound(S); ok('stay +1', E.might(S, f, 0) === 4, E.might(S, f, 0)); }
// ── Thought ──
{ const S = game([null, 'greenwich']); fig(S, 'leonidas', 0, 1); S.P[0].renown = 0; S.P[1].renown = 5; E.endRound(S); ok('clock: holder goes last', E.firstOf(S) === 1, [S.gw, E.firstOf(S)]);
  const T = game([null, null, null, 'greenwich']); fig(T, 'leonidas', 1, 3); T.P[1].renown = 0; T.P[0].renown = 5; E.endRound(T); ok('clock: holder 1 goes last', E.firstOf(T) === 0); }
{ const S = game([null, 'wisdom']); fig(S, 'leonidas', 0, 1); S.P[0].gone = ['pericles', 'spartacus']; E.endRound(S); ok('recall', S.P[0].hand.indexOf('spartacus') >= 0 && S.P[0].gone.length === 1); }
{ const S = game([null, 'nalanda']); fig(S, 'leonidas', 0, 1); fig(S, 'hammurabi', 1, 1); E.endRound(S); ok('study both draw', S.P[0].hand.length === 1 && S.P[1].hand.length === 1); }
{ const S = game([null, 'padua']); fig(S, 'leonidas', 0, 1); S.P[0].hand = ['spartacus', 'boudica']; E.apply(S, { t: 'fig', h: 0, p: 1 }); ok('school draws', S.P[0].hand.length === 2, S.P[0].hand); E.apply(S, { t: 'fig', h: 0, p: 1 }); ok('school once', S.P[0].hand.length === 1); }
{ const S = game([null, 'seneca']); const f = fig(S, 'socrates', 0, 1), g = fig(S, 'charlemagne', 0, 1, { tb: 1 }); ok('equal', E.might(S, f, 0) === 3 && E.might(S, g, 0) === 4, [E.might(S, f, 0), E.might(S, g, 0)]); }
// ── Land ──
{ const S = game([null, 'himeji']); const a = fig(S, 'leonidas', 0, 1), d = fig(S, 'hammurabi', 1, 1); S.turn = 0; E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('maze: tied attacker out', !E.byU(S, a.u) && !!E.byU(S, d.u)); }
{ const S = game([null, 'gibraltar']); const a = fig(S, 'leonidas', 0, 1), b = fig(S, 'spartacus', 0, 1), d = fig(S, 'hammurabi', 1, 1); ok('siege defender +2', E.might(S, d, 2, a) === 5, E.might(S, d, 2, a)); ok('siege not for the many', E.might(S, a, 2, d) === 6); }
{ const S = game([null, 'laferriere', null, null, null]); const f = fig(S, 'leonidas', 0, 1), g = fig(S, 'hammurabi', 1, 1); ok('citadel own +1', E.might(S, f, 0) === 4 && E.might(S, g, 0) === 3);
  const T = game([null, null, null, null, 'laferriere']); ok('citadel nothing at the Crossroads', E.pw(T, 4) === ''); const T2 = game(['laferriere']); ok('citadel nothing at a Gate', E.pw(T2, 0) === ''); }
{ const S = game(['greenwich']); ok('clock: nothing at a Gate', E.pw(S, 0) === ''); }
{ const S = game([null, 'orleans']); const a = fig(S, 'leonidas', 0, 1), d = fig(S, 'charlemagne', 1, 1); ok('relief +2 vs holder', E.might(S, a, 1, d) === 5, E.might(S, a, 1, d)); }
{ const S = game([null, 'siracusa']); const d = fig(S, 'leonidas', 0, 1); S.P[0].relics = ['compass', 'press']; ok('engines +2', E.might(S, d, 2) === 8); }
{ const S = game([null, 'zimbabwe']); const f = fig(S, 'sundiata', 0, 1), g = fig(S, 'hatshepsut', 0, 1); ok('heartland', E.might(S, g, 0) === 3 + 2, E.might(S, g, 0)); }
{ const S = game([null, null, null, 'nanmadol']); const h = fig(S, 'charlemagne', 1, 3), f = fig(S, 'spartacus', 0, 3); ok('islets: can\'t walk out', E.walkDests(S, f).length === 0); ok('islets: holder can', E.walkDests(S, h).length > 0); }
{ const S = game([null, null, null, null, 'sigiriya']); const f = fig(S, 'leonidas', 0, 0), g = fig(S, 'zhenghe', 0, 1), v = fig(S, 'zhenghe', 1, 2);
  S.P[0].relics = ['compass']; ok('rock: no two-step in', E.walkDests(S, f).indexOf(4) < 0); ok('rock: one step in', E.walkDests(S, g).indexOf(4) >= 0); ok('rock: no voyager from afar', E.walkDests(S, v).indexOf(4) < 0);
  S.P[0].hand = ['fairwinds']; ok('rock: no Fair Winds', !E.actions(S).some(a => a.t === 'deed' && a.p === 4)); }
// ── Culture ──
{ const S = game([null, 'sistine']); ok('patron', E.costOf(S, 0, 'mozart', 1) === 2 && E.costOf(S, 0, 'leonidas', 1) === 3); }
{ const S = game([null, 'heian']); fig(S, 'mozart', 0, 1); ok('court 2', E.rv(S, 1, 0) === 2); }
{ const S = game([null, 'wien']); const a = fig(S, 'homer', 0, 1), b = fig(S, 'virgil', 0, 1, { li: 0 }); b.li = a.u; ok('pupils +2 (and Homer inspires)', E.might(S, b, 0) === 4 + 2 + 1, E.might(S, b, 0)); }
{ const S = game([null, 'taj']); fig(S, 'leonidas', 0, 1); E.endRound(S); const r = S.P[0].renown; E.endRound(S); ok('memorial held twice', S.P[0].renown - r === 1 + 2 + 0 || S.P[0].renown - r >= 3, S.P[0].renown - r); }
{ const S = game([null, 'giza']); const f = fig(S, 'imhotep', 0, 1); ok('facW', E.might(S, f, 0) === 3 + 1 + 1, E.might(S, f, 0)); }
{ const S = game([null, null, 'stonehenge']); const f = fig(S, 'leonidas', 0, 0), g = fig(S, 'boudica', 1, 0); ok('gathering: not for the other player', E.walkDests(S, f).indexOf(2) < 0); ok('gathering: its banner\'s player from anywhere', E.walkDests(S, g).indexOf(2) >= 0); }
{ const S = game([null, 'olympia']); const a = fig(S, 'charlemagne', 0, 1), d = fig(S, 'spartacus', 1, 1); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('victor', a.vic === 1 && E.might(S, a, 0) === 7, E.might(S, a, 0)); }
{ const S = game([null, 'prophetstown']); const a = fig(S, 'leonidas', 0, 1); ok('confed alone', E.might(S, a, 0) === 3); fig(S, 'spartacus', 0, 1); ok('confed two', E.might(S, a, 0) === 4); }
{ const S = game([null, 'deirelbahari']); fig(S, 'leonidas', 0, 1); S.P[0].hand = ['compass']; E.apply(S, { t: 'relic', h: 0 }); ok('punt', S.P[0].renown === 1); }
{ const S = game([null, null, null, null, 'versailles']); fig(S, 'charlemagne', 0, 4); fig(S, 'leonidas', 1, 4); fig(S, 'spartacus', 1, 4); fig(S, 'boudica', 1, 4); ok('rank: costliest holds', E.holder(S, 4) === 0, E.mights(S, 4)); }
{ const S = game([null, 'chichen']); const a = fig(S, 'charlemagne', 0, 1), d = fig(S, 'spartacus', 1, 1); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('ballcourt', S.P[0].renown >= 2, S.P[0].renown); }
{ const S = game([null, 'kumasi']); fig(S, 'leonidas', 0, 1); S.P[0].seals = 2; E.endRound(S); ok('stool mends', S.P[0].seals === 3); S.P[0].seals = 2; E.endRound(S); ok('stool once', S.P[0].seals === 2); }
{ const S = game([null, 'rapanui']); const a = fig(S, 'charlemagne', 1, 1), d = fig(S, 'spartacus', 0, 1); const n = S.P[0].deck.length; S.turn = 1; E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('ancestors', S.P[0].deck.length === n + 1 && S.P[0].deck[S.P[0].deck.length - 1] === 'spartacus'); }
// ── Law ──
{ const S = game([null, null, null, null, 'forum']); fig(S, 'charlemagne', 0, 4); fig(S, 'spartacus', 1, 4); fig(S, 'socrates', 1, 4); ok('vote', E.holder(S, 4) === 1); }
{ const S = game([null, 'independence']); fig(S, 'leonidas', 0, 1); S.P[1].renown = 3; ok('declare', E.rv(S, 1, 0) === 2); S.P[1].renown = 0; ok('declare not ahead', E.rv(S, 1, 0) === 1); }
{ const S = game([null, null, null, null, 'persepolis']); fig(S, 'charlemagne', 0, 4); fig(S, 'spartacus', 1, 4); E.endRound(S); ok('tribute', S.P[0].sb === 1 && S.P[1].sb === -1, [S.P[0].sb, S.P[1].sb]); }
{ const S = game([null, null, null, null, 'babylon']); ok('code', E.costOf(S, 0, 'charlemagne', 4) === 3 && E.costOf(S, 0, 'spartacus', 4) === 3); }
{ const S = game([null, 'onondaga']); const a = fig(S, 'charlemagne', 0, 1); fig(S, 'spartacus', 1, 1); ok('treeofpeace', !E.actions(S).some(x => x.t === 'clash')); }
{ const S = game([null, null, null, null, 'constantinople']); fig(S, 'leonidas', 1, 4); E.endRound(S); fig(S, 'boudica', 0, 4); ok('throne tie to last holder', E.holder(S, 4) === 1, [E.mights(S, 4), S.lh]); }
{ const S = game([null, null, null, null, 'tordesillas']); fig(S, 'leonidas', 0, 4); fig(S, 'themistocles', 1, 4); S.P[0].renown = S.P[1].renown = 0; E.endRound(S); ok('treaty both 1 (and each Gate)', S.P[0].renown === 2 && S.P[1].renown === 2, S.P.map(p => p.renown)); }
{ const S = game([null, null, null, 'runnymede']); const a = fig(S, 'charlemagne', 0, 3), d = fig(S, 'spartacus', 1, 3); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('charter: back to Gate', E.byU(S, d.u) && E.byU(S, d.u).p === 2); }
{ const S = game([null, null, null, 'winchester']); const a = fig(S, 'charlemagne', 0, 3), d = fig(S, 'spartacus', 1, 3); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('wergild', S.P[1].sb === 1); }
// ── Routes ──
{ const S = game([null, null, null, 'lanse']); S.P[0].hand = ['spartacus']; ok('landing: not on their banner', !E.actions(S).some(a => a.t === 'fig' && a.p === 3));
  const T = game([null, null, null, null, 'lanse']); T.P[0].hand = ['spartacus']; ok('landing at the Crossroads', E.actions(T).some(a => a.t === 'fig' && a.p === 4)); T.turn = 1; T.P[1].hand = ['spartacus']; ok('landing: not for the other player', !E.actions(T).some(a => a.t === 'fig' && a.p === 4)); }
{ const S = game([null, null, null, null, 'dunhuang']); const f = fig(S, 'leonidas', 0, 1); fig(S, 'spartacus', 1, 4); E.apply(S, { t: 'walk', u: f.u, p: 4 }); ok('garrison clash', E.actions(S).some(a => a.t === 'clash' && a.u === f.u));
  const T = game([null, null, null, 'dunhuang']); const g = fig(T, 'leonidas', 0, 4); fig(T, 'spartacus', 1, 3); E.apply(T, { t: 'walk', u: g.u, p: 3 }); ok('garrison: not on their banner', !E.actions(T).some(a => a.t === 'clash' && a.u === g.u)); }
{ const S = game([null, 'qhapaq']); const f = fig(S, 'leonidas', 0, 1), g = fig(S, 'spartacus', 0, 4); const a = E.actions(S).find(x => x.t === 'relay'); ok('relay offered', !!a, a); E.apply(S, a); ok('relay swapped', f.p === 4 && g.p === 1 && f.rdy === 1); ok('relay once', !E.actions(S).some(x => x.t === 'relay')); }
{ const S = game([null, null, null, null, 'grandcanal']); const f = fig(S, 'leonidas', 0, 4), g = fig(S, 'boudica', 1, 4); ok('canal to its banner\'s Gate', E.walkDests(S, f).indexOf(0) >= 0 && E.walkDests(S, g).indexOf(2) < 0 && E.walkDests(S, f).indexOf(2) < 0); }
{ const S = game([null, null, null, 'kilwa', 'basra']); const f = fig(S, 'leonidas', 0, 0); ok('port: not from a Gate', E.walkDests(S, f).indexOf(4) < 0); const g = fig(S, 'leonidas', 0, 3); ok('port from Commerce', E.walkDests(S, g).indexOf(4) >= 0); }
{ const S = game([null, 'magellanstrait']); const f = fig(S, 'leonidas', 0, 1); ok('passage', E.walkDests(S, f).indexOf(3) >= 0); }
{ const S = game([null, 'cape']); const f = fig(S, 'leonidas', 0, 1); ok('searoad 2', E.walkDests(S, f).indexOf(3) >= 0); }
{ const S = game(['kittyhawk']); const f = fig(S, 'leonidas', 0, 0); ok('flight', E.walkDests(S, f).indexOf(3) >= 0); ok('flight: not to the other player\'s Gate', E.walkDests(S, f).indexOf(2) < 0); }
console.log(oks + ' passed, ' + fails + ' failed');
