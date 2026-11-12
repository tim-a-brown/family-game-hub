// node scripts/anoria/deeds-test.js: the seven cards of 2026-11-12 (the Roman Triumph, Medici Patronage, the Hanseatic
// League, the Jubilee of 1300, the Tribune's Veto, Pope Leo I, the Theodosian Walls) and the Quick powers Testudo and
// the Defence of Syracuse were given the same day, each on a table laid by hand and checked against what its card
// says (text.js), limits included. Prints what failed and the count; exits 1 if anything failed.
'use strict';
const repo = require('path').join(__dirname, '../..');
const E = require(repo + '/games/anoria/engine.js'), C = require(repo + '/games/anoria/cards.js');
const ALL = Object.keys(C.PLACES); let fails = 0, oks = 0;
const ok = (name, cond, more) => { if (cond) oks++; else { fails++; console.log('FAIL ' + name + (more !== undefined ? ' ' + JSON.stringify(more) : '')); } };
// positions: 0 P0 Gate, 1 P0 Outpost, 2 P1 Gate, 3 P1 Outpost, 4 Crossroads. Fillers have powers that change nothing here.
const FILL = ['wall', 'thermopylae', 'aachen', 'appian', 'library'];
function game(lay) {
  lay = lay || []; const L = [0, 1, 2, 3, 4].map(i => lay[i] || FILL[i]), rest = ALL.filter(x => L.indexOf(x) < 0);
  const S = E.newGame([C.ARCH.Legion.cards.concat(C.ARCH.Legion.cards), C.ARCH.Court.cards.concat(C.ARCH.Court.cards)], ['leonardo', 'leonardo'], Object.assign({}, E.STD, { log: 1 }), E.rng(7), [rest.slice(0, 15), rest.slice(15, 30)], { lay: L, first: 0 });
  S.figs = []; S.turn = 0; S.P.forEach(p => { p.spark = 5; p.hand = []; p.reserve = 0; p.gone = []; }); S.ev = [];
  return S;
}
let U = 1000;
const fig = (S, c, o, p, x) => { const f = Object.assign({ u: U++, c, o, p, rdy: 1, arr: 0, tb: 0, stun: 0, stay: 0, li: 0, acted: 0 }, x || {}); S.figs.push(f); return f; };
const deeds = (S, k) => E.actions(S).filter(a => a.t === 'deed' && S.P[S.turn].hand[a.h] === k);
const kind = (S, i) => C.PLACES[S.places[i]].d;

// ── The Roman Triumph: a Domain where you have a Figure scores you double at this round's count, if you hold it ──
{ const S = game(); fig(S, 'leonidas', 0, 1); fig(S, 'hammurabi', 1, 3); S.P[0].hand = ['triumph'];
  const acts = deeds(S, 'triumph'); ok('triumph: only where you have a Figure', acts.length === 1 && acts[0].p === 1, acts);
  E.apply(S, acts[0]); ok('triumph: 2 Spark', S.P[0].spark === 3); ok('triumph lies on the table until the count', S.dip.length === 1 && S.dip[0].p === 1 && S.dip[0].c === 'triumph');
  ok('triumph: the banner shows 2', E.rv(S, 1, 0) === 2); ok('triumph: not for the other player', E.rv(S, 1, 1) === 1);
  const r0 = S.P[0].renown; E.endRound(S); ok('triumph: held at the count scores 2', S.P[0].renown - r0 === 2 + 1, S.P[0].renown - r0);   // (its Gate 1 too)
  ok('triumph gone after the count', !S.dbl.length && !S.dip.length && E.rv(S, 1, 0) === 1); }
{ const S = game(); fig(S, 'spartacus', 0, 4); fig(S, 'charlemagne', 1, 4); S.P[0].hand = ['triumph']; E.apply(S, deeds(S, 'triumph')[0]);
  const r1 = S.P[1].renown; E.endRound(S); ok('triumph: not held, nothing, and the holder scores 1', S.P[1].renown - r1 === 1 + 1, S.P[1].renown - r1); }
// ── Medici Patronage and the Hanseatic League: every Domain of the kind you hold ──
{ const S = game(['colosseum', 'kilwa', 'wall', 'appian', 'globe']); fig(S, 'leonidas', 0, 1); fig(S, 'leonidas', 0, 4); S.P[0].hand = ['medici', 'hansa'];
  ok('Colosseum and Globe are Culture, Kilwa Commerce', kind(S, 0) === 'Culture' && kind(S, 4) === 'Culture' && kind(S, 1) === 'Commerce');
  E.apply(S, deeds(S, 'medici')[0]); ok('medici: 3 Spark', S.P[0].spark === 2);
  ok('medici: Culture doubled', E.rv(S, 0, 0) === 2 && E.rv(S, 4, 0) === 2 && E.rv(S, 1, 0) === 1, [E.rv(S, 0, 0), E.rv(S, 4, 0), E.rv(S, 1, 0)]);
  S.P[0].spark = 3; E.apply(S, deeds(S, 'hansa')[0]); ok('hansa: Commerce doubled', E.rv(S, 1, 0) === 2 && E.rv(S, 2, 0) === 1);
  const r0 = S.P[0].renown; E.endRound(S); ok('the count: 2 + 2 + 2', S.P[0].renown - r0 === 6, S.P[0].renown - r0); }
// ── The Jubilee of 1300: every Domain you hold; a Domain scores double only once ──
{ const S = game(); fig(S, 'leonidas', 0, 1); fig(S, 'hammurabi', 1, 3); S.P[0].hand = ['holyyear', 'triumph']; S.P[0].spark = 7;
  E.apply(S, deeds(S, 'holyyear')[0]); ok('jubilee: 5 Spark', S.P[0].spark === 2);
  E.apply(S, deeds(S, 'triumph')[0]); ok('jubilee and a triumph: still double, not four times', E.rv(S, 1, 0) === 2, E.rv(S, 1, 0));
  ok('jubilee: not for the other player', E.rv(S, 3, 1) === 1);
  const r0 = S.P[0].renown, r1 = S.P[1].renown; E.endRound(S); ok('jubilee count: 2 + 2', S.P[0].renown - r0 === 4 && S.P[1].renown - r1 === 2, [S.P[0].renown - r0, S.P[1].renown - r1]); }
// ── The Tribune's Veto ──
function vetoGame(deed, setup) { const S = game(); setup(S); S.P[0].hand = [deed]; S.P[1].hand = ['veto']; S.P[1].reserve = 1; return S; }
{ const S = vetoGame('ambush', S => { fig(S, 'leonidas', 0, 4); fig(S, 'hammurabi', 1, 4); });
  const a = deeds(S, 'ambush')[0]; E.apply(S, a, 2, 0); ok('veto: ambush cancelled, nobody knocked out', S.figs.length === 2 && !S.ev.some(e => e.t === 'clash'));
  ok('veto: both cards to their discard piles', S.P[0].gone.indexOf('ambush') >= 0 && S.P[1].gone.indexOf('veto') >= 0 && !S.P[1].hand.length);
  ok('veto: paid with 1 kept Spark, and the Deed was paid for', S.P[1].reserve === 0 && S.P[0].spark === 2); ok('veto: event', S.ev.some(e => e.t === 'veto' && e.o === 1 && e.d === 'ambush' && e.by === 0)); }
{ const S = vetoGame('ambush', S => { fig(S, 'leonidas', 0, 4); fig(S, 'hammurabi', 1, 4); }); S.P[1].reserve = 0;
  E.apply(S, deeds(S, 'ambush')[0], 3, 0); ok('veto: no Spark kept, no Veto', S.ev.some(e => e.t === 'clash') && S.P[1].hand.length === 1); }
{ const S = vetoGame('eclipse', S => { fig(S, 'leonidas', 0, 4); fig(S, 'hammurabi', 1, 4); fig(S, 'spartacus', 1, 3); });
  E.apply(S, deeds(S, 'eclipse').find(a => a.p === 3)); ok('veto: eclipse on your Figures', !S.figs.some(f => f.stun) && S.P[1].hand.length === 0); }
{ const S = vetoGame('rift', S => { fig(S, 'leonidas', 0, 1); fig(S, 'hammurabi', 1, 3); });
  const a = deeds(S, 'rift').find(x => x.v); E.apply(S, a); ok('veto: rift moving your Figure', S.figs.find(f => f.o === 1).p === 3 && S.P[1].hand.length === 0); }
{ const S = vetoGame('triumph', S => { fig(S, 'leonidas', 0, 1); }); E.apply(S, deeds(S, 'triumph')[0]); ok('veto: a Deed that would score Renown', !(S.dbl || []).length && E.rv(S, 1, 0) === 1 && !(S.dip || []).length); }
{ const S = vetoGame('caravan', S => { fig(S, 'leonidas', 0, 1); }); E.apply(S, deeds(S, 'caravan')[0]); ok('veto: not a Trade Caravan', S.P[0].spark === 7 && S.P[1].hand.length === 1); }
{ const S = vetoGame('eureka', S => { fig(S, 'leonidas', 0, 1); }); E.apply(S, deeds(S, 'eureka')[0]); ok('veto: not Eureka', S.P[1].hand.length === 1); }
{ const S = vetoGame('decree', S => { fig(S, 'leonidas', 0, 1); }); E.apply(S, deeds(S, 'decree')[0]); ok('veto: not a Royal Decree', S.P[1].hand.length === 1 && S.pb[1][0] === 4); }
{ const S = vetoGame('walls', S => { fig(S, 'leonidas', 0, 1); }); E.apply(S, deeds(S, 'walls')[0]); ok('veto: not the Theodosian Walls', S.P[1].hand.length === 1 && S.P[0].seals === 4); }
{ const S = vetoGame('eclipse', S => { fig(S, 'leonidas', 0, 4); fig(S, 'hammurabi', 0, 3); fig(S, 'spartacus', 1, 4); });
  E.apply(S, deeds(S, 'eclipse').find(a => a.p === 4)); ok('veto: eclipse where you have a Figure', S.P[1].hand.length === 0); }
{ const S = game(); S.turn = 1; S.P[1].hand = ['veto']; S.P[1].spark = 5; ok('veto: never played by hand', !E.actions(S).some(a => a.t === 'deed')); }
// ── Pope Leo I: Ward ──
{ const S = game(); fig(S, 'leonidas', 0, 4); const l = fig(S, 'leo', 1, 4), h = fig(S, 'hammurabi', 1, 4); fig(S, 'spartacus', 1, 3); S.P[0].hand = ['eclipse', 'ambush', 'rift'];
  ok('ward: no Eclipse at Leo\'s Domain', !deeds(S, 'eclipse').some(a => a.p === 4) && deeds(S, 'eclipse').some(a => a.p === 3));
  ok('ward: no Ambush on a Figure with him', !deeds(S, 'ambush').length);
  ok('ward: no Rift with a Figure with him', !deeds(S, 'rift').some(a => a.v === l.u || a.v === h.u));
  ok('ward: Leo is a Statecraft Figure', C.CARDS.leo.f === 'S' && C.CARDS.leo.k.ward); }
{ const S = game([null, null, null, null, 'seneca']); const ch = fig(S, 'charlemagne', 1, 4), sp = fig(S, 'socrates', 1, 4); ok('Seneca Falls without a Ward: 3', E.might(S, ch, 0) === 3);
  fig(S, 'leo', 1, 4); ok('ward: Seneca Falls does not lower his side\'s Might', E.might(S, ch, 0) === 6 && E.might(S, sp, 0) === 3, [E.might(S, ch, 0), E.might(S, sp, 0)]); }
{ const S = game([null, null, null, 'himeji']); const a = fig(S, 'leonidas', 0, 3), d = fig(S, 'hammurabi', 1, 3); fig(S, 'leo', 0, 3, { rdy: 0 });
  E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('ward: a tie at Himeji does not knock out his side', !!E.byU(S, a.u) && !!E.byU(S, d.u)); }
{ const S = game([null, null, null, 'nanmadol']); const a = fig(S, 'leonidas', 0, 3); fig(S, 'charlemagne', 1, 3); ok('Nan Madol: stuck without a Ward', !E.walkDests(S, a).length);
  fig(S, 'leo', 0, 3); ok('ward: walks out of Nan Madol', E.walkDests(S, a).length > 0); }
{ const S = game([null, null, null, 'nineveh']); const a = fig(S, 'leonidas', 0, 3); fig(S, 'charlemagne', 1, 3); ok('Nineveh: no clash for the player who does not hold it', !E.actions(S).some(x => x.t === 'clash'));
  fig(S, 'leo', 0, 3, { rdy: 0, acted: 1 }); ok('ward: starts a clash at Nineveh', E.actions(S).some(x => x.t === 'clash' && x.u === a.u)); }
{ const S = game(); fig(S, 'leo', 1, 3); fig(S, 'hammurabi', 1, 4); fig(S, 'leonidas', 0, 4); S.P[0].hand = ['eclipse']; ok('ward: only where he stands', deeds(S, 'eclipse').some(a => a.p === 4)); }
// ── The Theodosian Walls ──
{ const S = game(); S.P[0].hand = ['walls']; ok('walls: 4 Spark', E.costOf(S, 0, 'walls') === 4); E.apply(S, deeds(S, 'walls')[0]); ok('walls: a fourth Seal', S.P[0].seals === 4 && S.P[0].sm === 4, [S.P[0].seals, S.P[0].sm]);
  S.P[0].hand = ['walls']; S.P[0].spark = 5; ok('walls: not past 4', !deeds(S, 'walls').length); }
{ const S = game(); S.P[0].seals = 2; S.P[0].hand = ['walls']; E.apply(S, deeds(S, 'walls')[0]); ok('walls: a broken Seal mended, still 3 on the strip', S.P[0].seals === 3 && S.P[0].sm === 3); }
{ const S = game(); S.P[0].seals = 3; S.P[0].sm = 4; S.P[0].hand = ['walls']; E.apply(S, deeds(S, 'walls')[0]); ok('walls: 3 of 4 mended to 4', S.P[0].seals === 4 && S.P[0].sm === 4); }
{ const S = game(); S.P[0].seals = 4; S.P[0].sm = 4; fig(S, 'leonidas', 1, 0); E.endRound(S); ok('walls: a fourth Seal breaks like any', S.P[0].seals === 3); }
// ── Testudo: a Figure that loses a clash it started on the other player's side falls back to its Gate ──
function tGame(at, lay) { const S = game(lay); const a = fig(S, 'spartacus', 0, at), d = fig(S, 'charlemagne', 1, at); S.P[0].hand = ['testudo']; S.P[0].spark = 3; return { S, a, d }; }
{ const { S, a, d } = tGame(3); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('testudo: back to the Gate', E.byU(S, a.u) && E.byU(S, a.u).p === 0 && S.P[0].spark === 2 && S.P[0].gone.indexOf('testudo') >= 0, [E.byU(S, a.u), S.P[0].spark]);
  ok('testudo: the event', S.ev.some(e => e.t === 'clash' && e.tq === 'testudo') && S.ev.some(e => e.t === 'fallback' && e.why === 'testudo')); }
{ const { S, a, d } = tGame(4); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('testudo: not at the Crossroads', !E.byU(S, a.u) && S.P[0].hand.length === 1); }
{ const { S, a, d } = tGame(1); S.figs.splice(S.figs.indexOf(a), 1); S.figs.splice(S.figs.indexOf(d), 1); const a2 = fig(S, 'spartacus', 0, 1), d2 = fig(S, 'charlemagne', 1, 1); E.apply(S, { t: 'clash', u: a2.u, v: d2.u }, 0, 0); ok('testudo: not on your own side', !E.byU(S, a2.u)); }
{ const { S, a, d } = tGame(3); S.P[0].spark = 0; E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('testudo: not without Spark', !E.byU(S, a.u) && S.P[0].hand.length === 1); }
{ const { S, a, d } = tGame(3); fig(S, 'leonidas', 0, 0); fig(S, 'boudica', 0, 0); fig(S, 'tomoe', 0, 0); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('testudo: not with no room at the Gate', !E.byU(S, a.u) && S.P[0].hand.length === 1); }
{ const { S, a, d } = tGame(3, [null, null, null, 'runnymede']); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('testudo: kept where Runnymede sends the Figure back anyway', E.byU(S, a.u).p === 0 && S.P[0].hand.length === 1); }
{ const { S, a, d } = tGame(3); S.figs.splice(S.figs.indexOf(d), 1); const w = fig(S, 'socrates', 1, 3); a.tb = 3; E.apply(S, { t: 'clash', u: a.u, v: w.u }, 0, 0); ok('testudo: not when the clash is won', !E.byU(S, w.u) && S.P[0].hand.length === 1); }
// ── The Defence of Syracuse: an enemy that would win a clash it started at your Gate or Outpost is driven back ──
function sGame(at) { const S = game(); const a = fig(S, 'charlemagne', 0, at), d = fig(S, 'socrates', 1, at); S.P[1].hand = ['syracuse']; S.P[1].reserve = 1; return { S, a, d }; }
{ const { S, a, d } = sGame(3); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('syracuse: driven back, nobody knocked out', E.byU(S, a.u).p === 0 && !!E.byU(S, d.u) && S.P[1].reserve === 0 && S.P[1].gone.indexOf('syracuse') >= 0);
  ok('syracuse: the attacker has acted', !E.byU(S, a.u).rdy && S.P[0].uC === 1); ok('syracuse: no Bounty', S.P[0].renown === 0); }
{ const { S, a, d } = sGame(2); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('syracuse: at the Gate too', E.byU(S, a.u).p === 0 && !!E.byU(S, d.u)); }
{ const { S, a, d } = sGame(4); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('syracuse: not at the Crossroads', !E.byU(S, d.u) && S.P[1].hand.length === 1); }
{ const { S, a, d } = sGame(3); S.P[1].reserve = 0; E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('syracuse: not without Spark kept', !E.byU(S, d.u)); }
{ const { S, a, d } = sGame(3); fig(S, 'leo', 0, 3, { rdy: 0 }); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('syracuse: not against a Figure with a Ward', !E.byU(S, d.u) && S.P[1].hand.length === 1); }
{ const { S, a, d } = sGame(3); S.figs.splice(S.figs.indexOf(a), 1); const w = fig(S, 'spartacus', 0, 3); S.figs.splice(S.figs.indexOf(d), 1); const dd = fig(S, 'charlemagne', 1, 3); E.apply(S, { t: 'clash', u: w.u, v: dd.u }, 0, 0); ok('syracuse: not when the defender wins anyway', !E.byU(S, w.u) && S.P[1].hand.length === 1); }
{ const S = game(); S.P[0].hand = ['testudo', 'syracuse']; S.P[0].spark = 5; fig(S, 'leonidas', 0, 4); fig(S, 'hammurabi', 1, 4); ok('testudo and syracuse are never played by hand, nor added to a clash', !E.actions(S).some(a => a.t === 'deed' || a.ph)); }
console.log((fails ? fails + ' failed, ' : '') + oks + ' passed');
process.exit(fails ? 1 : 0);
