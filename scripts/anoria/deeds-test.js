// node scripts/anoria/deeds-test.js: the seven cards of 2026-11-12 (the Roman Triumph, Medici Patronage, the Hanseatic
// League, the Jubilee of 1300, the Tribune's Veto, Pope Leo I, the Theodosian Walls), the Quick powers Testudo and
// the Defence of Syracuse were given the same day, and the six that came after them (Damascus Steel, the Abacus, the
// Peace of Westphalia, the Lisbon Earthquake, the Edict of Milan, the Walk to Canossa: held-2026-11-12.txt), and the
// Timbuktu Manuscripts' power of 2026-11-13 (relics-2026-11-13.txt), each on
// a table laid by hand and checked against what its card says (text.js), limits included. Prints what failed and the count; exits 1 if anything failed.
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
{ const { S, a, d } = tGame(3); fig(S, 'leonidas', 0, 0); fig(S, 'boudica', 0, 0); fig(S, 'yoshitsune', 0, 0); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); ok('testudo: not with no room at the Gate', !E.byU(S, a.u) && S.P[0].hand.length === 1); }
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
// ── The five held cards and the Walk to Canossa (2026-11-12, held-2026-11-12.txt) ──
const clashes = S => E.actions(S).filter(a => a.t === 'clash' && !a.ph);
const relic = (S, k) => E.actions(S).find(a => a.t === 'relic' && S.P[S.turn].hand[a.h] === k);
// ── Damascus Steel: your Figures have +1 Might when attacking ──
{ const S = game(); const a = fig(S, 'boudica', 0, 4), d = fig(S, 'yoshitsune', 1, 4); S.P[0].hand = ['dsteel'];
  const m1 = E.might(S, a, 1, d), m0 = E.might(S, a, 0), m2 = E.might(S, a, 2, d);
  S.P[0].guide = 'cleopatra'; ok('dsteel: 3 Spark (Tim, 2026-11-13)', E.costOf(S, 0, 'dsteel') === 3); E.apply(S, relic(S, 'dsteel'));
  ok('dsteel: +1 when attacking', E.might(S, a, 1, d) === m1 + 1, [m1, E.might(S, a, 1, d)]);
  ok('dsteel: nothing when holding or defending', E.might(S, a, 0) === m0 && E.might(S, a, 2, d) === m2);
  ok('dsteel: not for the other player', E.might(S, d, 1, a) === E.might(S, d, 1, a) && !S.P[1].relics.length);
  S.turn = 0; const e0 = S.ev.length; E.apply(S, { t: 'clash', u: a.u, v: d.u }, 0, 0); const ce = S.ev.slice(e0).find(e => e.t === 'clash');
  ok('dsteel: counted in the clash', ce && ce.am === m1 + 1, ce); }
{ const S = game(); S.P[0].relics = ['compass']; S.P[0].hand = ['dsteel']; ok('dsteel: beside a Relic with another power', !!relic(S, 'dsteel'));
  S.P[0].relics = ['compass', 'press']; ok('dsteel: not a third Relic', !relic(S, 'dsteel')); }
// ── The Abacus: your Deeds cost 1 less ──
{ const S = game(); S.P[0].guide = 'cleopatra'; S.P[0].hand = ['abacus']; ok('abacus: 2 Spark', E.costOf(S, 0, 'abacus') === 2); E.apply(S, relic(S, 'abacus'));
  ok('abacus: a Deed 1 less', E.costOf(S, 0, 'holyyear') === 4 && E.costOf(S, 0, 'walls') === 3 && E.costOf(S, 0, 'triumph') === 1);
  ok('abacus: never below 0', E.costOf(S, 0, 'eclipse') === 0); ok('abacus: not a Figure or a Relic', E.costOf(S, 0, 'leonidas') === 3 && E.costOf(S, 0, 'press') === 2);
  ok('abacus: not the other player\'s Deeds', E.costOf(S, 1, 'holyyear') === 5); }
{ const S = game(); S.P[0].relics = ['abacus']; fig(S, 'ada', 0, 0); ok('abacus and a Figure that makes Deeds cheaper add up', E.costOf(S, 0, 'holyyear') === 3); }
{ const S = game(); fig(S, 'leonidas', 0, 4); fig(S, 'hammurabi', 1, 4); S.P[0].hand = ['ambush']; S.P[1].hand = ['veto']; S.P[1].relics = ['abacus']; S.P[1].reserve = 0;
  E.apply(S, deeds(S, 'ambush')[0], 0, 0); ok('abacus: a Tribune\'s Veto at 0 plays itself with no Spark kept', S.ev.some(e => e.t === 'veto')); }
// ── The Peace of Westphalia: nobody can start a clash at one Domain until this round ends ──
{ const S = game(); const a = fig(S, 'boudica', 0, 4), d = fig(S, 'yoshitsune', 1, 4); fig(S, 'leonidas', 0, 1); fig(S, 'charlemagne', 1, 1); S.P[0].hand = ['westphalia'];
  ok('westphalia: 1 Spark, any Domain', E.costOf(S, 0, 'westphalia') === 1 && deeds(S, 'westphalia').length === 5);
  E.apply(S, deeds(S, 'westphalia').find(x => x.p === 4)); ok('westphalia lies on the Domain until the count', S.dip.some(x => x.c === 'westphalia' && x.p === 4 && x.o === 0));
  ok('westphalia: no clash there for you', !clashes(S).some(x => x.u === a.u) && clashes(S).some(x => x.p === undefined && E.byU(S, x.u).p === 1));
  S.turn = 1; E.startTurn(S); ok('westphalia: nor for them', !clashes(S).some(x => x.u === d.u));
  S.P[1].hand = ['ambush']; ok('westphalia: no Ambush there either', !deeds(S, 'ambush').some(x => x.u === d.u));
  S.P[1].hand = ['westphalia']; ok('westphalia: not twice on one Domain', !deeds(S, 'westphalia').some(x => x.p === 4));
  E.endRound(S); S.turn = 0; E.startTurn(S); ok('westphalia: gone at the count', !(S.dip || []).length && clashes(S).some(x => x.u === a.u)); }
{ const S = game(); fig(S, 'boudica', 0, 4); const d = fig(S, 'yoshitsune', 1, 4); fig(S, 'leo', 1, 4, { rdy: 0 }); S.P[0].hand = ['westphalia'];
  E.apply(S, deeds(S, 'westphalia').find(x => x.p === 4)); S.turn = 1; E.startTurn(S); ok('westphalia: a Ward keeps the other player\'s Peace off its side', clashes(S).some(x => x.u === d.u)); }
{ const S = game(['forbidden']); fig(S, 'boudica', 0, 0); const d = fig(S, 'yoshitsune', 1, 0); S.P[0].hand = ['westphalia'];
  E.apply(S, deeds(S, 'westphalia').find(x => x.p === 0)); S.turn = 1; E.startTurn(S); ok('westphalia: nor at the Forbidden City', clashes(S).some(x => x.u === d.u)); }
{ const S = game(); fig(S, 'boudica', 0, 4); fig(S, 'yoshitsune', 1, 4); S.P[0].hand = ['westphalia']; S.P[1].hand = ['veto']; S.P[1].reserve = 1;
  E.apply(S, deeds(S, 'westphalia')[0]); ok('westphalia: the Veto does not cancel a Peace', !S.ev.some(e => e.t === 'veto') && S.P[1].hand.length === 1); }
// ── The Lisbon Earthquake: every Figure at one Domain, yours and theirs, misses its next turn ──
{ const S = game(); const a = fig(S, 'boudica', 0, 4), b = fig(S, 'leonidas', 0, 4), d = fig(S, 'yoshitsune', 1, 4), x = fig(S, 'charlemagne', 1, 3); S.P[0].hand = ['lisbonquake'];
  ok('lisbon: 1 Spark, only where a Figure stands', E.costOf(S, 0, 'lisbonquake') === 1 && deeds(S, 'lisbonquake').map(q => q.p).sort().join() === '3,4');
  E.apply(S, deeds(S, 'lisbonquake').find(q => q.p === 4)); ok('lisbon: everyone there', a.stun && b.stun && d.stun && !x.stun);
  ok('lisbon: the event', S.ev.some(e => e.t === 'quake' && e.p === 4 && e.us.length === 3));
  ok('lisbon: yours can still act this turn', clashes(S).some(q => q.u === a.u));
  S.turn = 1; E.startTurn(S); ok('lisbon: theirs miss their next turn', !d.rdy && !clashes(S).some(q => q.u === d.u) && x.rdy);
  E.endTurn(S); S.turn = 0; E.startTurn(S); ok('lisbon: yours miss your next turn', !a.rdy && !b.rdy && !E.actions(S).some(q => q.u === a.u || q.u === b.u)); }
{ const S = game(); const a = fig(S, 'boudica', 0, 4), d = fig(S, 'yoshitsune', 1, 4), l = fig(S, 'leo', 1, 4); S.P[0].hand = ['lisbonquake'];
  E.apply(S, deeds(S, 'lisbonquake').find(q => q.p === 4)); ok('lisbon: a Ward keeps it off the other side', a.stun && !d.stun && !l.stun); }
{ const S = game(['forbidden']); const a = fig(S, 'boudica', 0, 0), d = fig(S, 'yoshitsune', 1, 0); S.P[0].hand = ['lisbonquake'];
  E.apply(S, deeds(S, 'lisbonquake').find(q => q.p === 0)); ok('lisbon: the Forbidden City keeps it off the other side', a.stun && !d.stun); }
{ const S = vetoGame('lisbonquake', S => { fig(S, 'boudica', 0, 4); fig(S, 'yoshitsune', 1, 4); }); E.apply(S, deeds(S, 'lisbonquake')[0]);
  ok('lisbon: the Veto cancels it', S.ev.some(e => e.t === 'veto') && !S.figs.some(f => f.stun)); }
{ const S = vetoGame('lisbonquake', S => { fig(S, 'boudica', 0, 3); fig(S, 'yoshitsune', 1, 4); }); E.apply(S, deeds(S, 'lisbonquake').find(q => q.p === 3));
  ok('lisbon: no Veto where none of yours stands', !S.ev.some(e => e.t === 'veto') && S.figs[0].stun); }
// ── The Edict of Milan: until this round ends, the other player can't start a clash with your Figures at one Domain ──
{ const S = game(); const a = fig(S, 'boudica', 0, 4), d = fig(S, 'yoshitsune', 1, 4), e = fig(S, 'leonidas', 1, 1); fig(S, 'spartacus', 0, 1); S.P[1].hand = ['milan']; S.turn = 1;
  ok('milan: 2 Spark, only where you have a Figure', E.costOf(S, 1, 'milan') === 2 && deeds(S, 'milan').map(q => q.p).sort().join() === '1,4');
  E.apply(S, deeds(S, 'milan').find(q => q.p === 4)); ok('milan lies on the Domain until the count', S.dip.some(x => x.c === 'milan' && x.p === 4 && x.o === 1));
  ok('milan: your Figure can still start a clash', clashes(S).some(q => q.u === d.u));
  S.turn = 0; E.startTurn(S); ok('milan: no clash with them there', !clashes(S).some(q => q.v === d.u) && clashes(S).some(q => q.v === e.u));
  S.P[0].hand = ['ambush']; ok('milan: no Ambush on them', !deeds(S, 'ambush').some(q => q.v === d.u));
  const n = fig(S, 'charlemagne', 1, 4); ok('milan: a Figure that comes later is sheltered too', !clashes(S).some(q => q.v === n.u));
  S.P[0].hand = ['eclipse']; ok('milan: a Deed that is not a clash still reaches them', deeds(S, 'eclipse').some(q => q.p === 4));
  E.endRound(S); S.turn = 0; E.startTurn(S); ok('milan: gone at the count', clashes(S).some(q => q.v === n.u)); }
{ const S = game(); const d = fig(S, 'yoshitsune', 1, 4); const a = fig(S, 'boudica', 0, 4); S.P[1].hand = ['milan']; S.turn = 1; E.apply(S, deeds(S, 'milan')[0]);
  S.figs.splice(S.figs.indexOf(d), 1); const d2 = fig(S, 'yoshitsune', 1, 3); S.turn = 0; E.startTurn(S); fig(S, 'leonidas', 0, 3);
  ok('milan: a Figure that walks out is not sheltered', clashes(S).some(q => q.v === d2.u)); }
{ const S = vetoGame('milan', S => { fig(S, 'boudica', 0, 4); fig(S, 'yoshitsune', 1, 4); }); E.apply(S, deeds(S, 'milan')[0]); ok('milan: the Veto does not cancel it', !S.ev.some(e => e.t === 'veto')); }
// ── The Walk to Canossa: an enemy Figure's skills and powers don't work until this round ends ──
{ const S = game(); const a = fig(S, 'boudica', 0, 4), g = fig(S, 'leonidas', 1, 4), h = fig(S, 'hammurabi', 1, 4); S.P[0].hand = ['canossa'];
  ok('canossa: 1 Spark, an enemy Figure with a skill', E.costOf(S, 0, 'canossa') === 1 && deeds(S, 'canossa').map(q => q.v).sort().join() === [g.u, h.u].sort().join());
  ok('Hammurabi\'s Law: no clash here', !clashes(S).length);
  const s0 = E.might(S, g, 2, a); E.apply(S, deeds(S, 'canossa').find(q => q.v === h.u));
  ok('canossa: the card lies on the Figure until the count', S.dip.some(x => x.c === 'canossa' && x.u === h.u && x.p === -1) && h.hush === 1);
  ok('canossa: the event', S.ev.some(e => e.t === 'hush' && e.u === h.u && e.o === 0));
  ok('canossa: Law silenced, Leonidas\'s Guard still works', clashes(S).length === 1 && clashes(S)[0].v === g.u, clashes(S));
  S.P[0].hand = ['canossa']; E.apply(S, deeds(S, 'canossa').find(q => q.v === g.u)); S.P[0].spark = 5;
  ok('canossa: Guard silenced, both can be clashed', clashes(S).length === 2);
  ok('canossa: Steadfast silenced', E.might(S, g, 2, a) === s0 - 2, [s0, E.might(S, g, 2, a)]);
  S.P[0].hand = ['canossa']; ok('canossa: not twice on one Figure', !deeds(S, 'canossa').length);
  E.endRound(S); ok('canossa: gone at the count', !g.hush && !h.hush && E.might(S, g, 2, a) === s0 && !(S.dip || []).length); }
{ const S = game(); const sp = fig(S, 'spartacus', 1, 4), x = fig(S, 'leonidas', 1, 4); fig(S, 'boudica', 0, 4); S.P[0].hand = ['canossa'];
  const m = E.might(S, sp, 0); E.apply(S, deeds(S, 'canossa').find(q => q.v === sp.u)); ok('canossa: a power that is not a skill word stops too (Spartacus)', E.might(S, sp, 0) === m - 1, [m, E.might(S, sp, 0)]); }
{ const S = game(); fig(S, 'socrates', 1, 4); fig(S, 'boudica', 0, 4); S.P[0].hand = ['canossa']; ok('canossa: not a Figure with nothing on its card to stop', !deeds(S, 'canossa').length); }
{ const S = game(); const l = fig(S, 'leo', 1, 4), g = fig(S, 'leonidas', 1, 4), y = fig(S, 'boudica', 1, 3); S.P[0].hand = ['canossa'];
  ok('canossa: not a Figure with a Ward, nor one standing with it', deeds(S, 'canossa').map(q => q.v).join() === String(y.u)); }
{ const S = game(['forbidden']); fig(S, 'leonidas', 1, 0); const y = fig(S, 'boudica', 1, 3); S.P[0].hand = ['canossa']; ok('canossa: not at the Forbidden City', deeds(S, 'canossa').map(q => q.v).join() === String(y.u)); }
{ const S = game(); const i = fig(S, 'imhotep', 1, 3), f = fig(S, 'boudica', 0, 4); S.P[0].hand = ['canossa', 'rift'];
  ok('Imhotep can\'t be moved', !deeds(S, 'rift').some(q => q.v === i.u)); E.apply(S, deeds(S, 'canossa').find(q => q.v === i.u)); ok('canossa: Imhotep can be moved', deeds(S, 'rift').some(q => q.v === i.u)); }
{ const S = game(); const t = fig(S, 'yoshitsune', 1, 3, { rdy: 1, arr: 1 }); fig(S, 'boudica', 0, 3); S.P[0].hand = ['canossa']; E.apply(S, deeds(S, 'canossa')[0]);
  S.turn = 1; ok('canossa: Swift silenced', !E.actions(S).some(q => q.t === 'walk' && q.u === t.u)); }
{ const S = game([null, null, null, null, 'seneca']); const dg = fig(S, 'diogenes', 1, 4); S.cyn = 1; fig(S, 'boudica', 0, 4); ok('Diogenes silences Seneca Falls', !E.pw(S, 4) && E.silenced(S, 4));
  S.P[0].hand = ['canossa']; E.apply(S, deeds(S, 'canossa').find(q => q.v === dg.u)); ok('canossa: Diogenes humbled, Seneca Falls works again', E.pw(S, 4) === 'equal' && !E.silenced(S, 4)); }
{ const S = game(); const l = fig(S, 'leo', 0, 4), w = fig(S, 'boudica', 0, 4); fig(S, 'yoshitsune', 1, 4); S.turn = 1; S.P[1].hand = ['canossa', 'eclipse'];
  ok('canossa: Leo\'s side can\'t be chosen', !deeds(S, 'canossa').length); }
{ const S = vetoGame('canossa', S => { fig(S, 'boudica', 0, 4); fig(S, 'leonidas', 1, 4); }); E.apply(S, deeds(S, 'canossa')[0]); ok('canossa: the Veto does not cancel it', !S.ev.some(e => e.t === 'veto') && S.figs[1].hush); }
{ const S = game(); const g = fig(S, 'leonidas', 1, 4); fig(S, 'boudica', 0, 4); S.P[0].hand = ['canossa']; E.apply(S, deeds(S, 'canossa')[0]);
  const T = E.clone(S); ok('canossa: a copy of the table keeps it', T.figs.find(f => f.u === g.u).hush === 1 && T.dip.length === 1); }
// ── every card of the six, played by the robots, in whole games: no throw ──
{ const decks = [C.ARCH.Legion.cards.slice(0, 14).concat(['dsteel', 'abacus', 'westphalia', 'lisbonquake', 'milan', 'canossa']), C.ARCH.Court.cards.slice(0, 14).concat(['dsteel', 'abacus', 'westphalia', 'lisbonquake', 'milan', 'canossa'])];
  let err = null, used = {}; for (let s = 1; s <= 20 && !err; s++) { try { const S = E.play([decks[0].concat(decks[0]), decks[1].concat(decks[1])], ['leonardo', 'suntzu'], [E.PROF.normal, E.PROF.hard], Object.assign({}, E.STD, {}), s); Object.keys(S.st.played[0]).concat(Object.keys(S.st.played[1])).forEach(k => { used[k] = 1; }); } catch (e) { err = e; } }
  ok('robots play whole games with the six', !err, err && err.stack);
  ok('robots play each of the six', ['dsteel', 'abacus', 'westphalia', 'lisbonquake', 'milan', 'canossa'].every(k => used[k]), Object.keys(used).filter(k => ['dsteel', 'abacus', 'westphalia', 'lisbonquake', 'milan', 'canossa'].indexOf(k) >= 0)); }
// ── The Timbuktu Manuscripts and the Quipu (2026-11-13): you can hold 10 cards in your hand ──
const T10 = require(repo + '/games/anoria/text.js');
ok('manuscripts: the card says so', T10.CARDS.manuscripts.tx === 'You can hold 10 cards in your hand.' && T10.CARDS.quipu.tx === T10.CARDS.manuscripts.tx);
ok('manuscripts: its own power, and the Quipu has it', E.fxOf('manuscripts') === 'manuscripts' && E.fxOf('quipu') === 'manuscripts' && C.CARDS.quipu.c === C.CARDS.manuscripts.c);
const eleven = ['leonidas', 'hammurabi', 'spartacus', 'charlemagne', 'socrates', 'boudica', 'eureka', 'ambush', 'eclipse', 'triumph', 'walls'];
{ const S = game(); S.P[0].guide = 'cleopatra'; S.P[0].hand = ['manuscripts']; ok('manuscripts: 2 Spark', E.costOf(S, 0, 'manuscripts') === 2);
  ok('the plain limit is 8', E.handMax(S, 0) === 8 && E.handMax(S, 1) === 8); E.apply(S, relic(S, 'manuscripts'));
  ok('manuscripts: 10 for its player', E.handMax(S, 0) === 10); ok('manuscripts: 8 for the other player', E.handMax(S, 1) === 8);
  S.P[0].hand = eleven.slice(); E.endTurn(S); ok('manuscripts: 11 cards keep 10 when the turn ends', S.P[0].hand.length === 10 && S.P[0].gone.length === 1, S.P[0].hand.length);
  S.turn = 1; S.P[1].hand = eleven.slice(); E.endTurn(S); ok('the other player keeps 8', S.P[1].hand.length === 8, S.P[1].hand.length); }
{ const S = game(); S.P[0].relics = ['quipu']; S.P[0].hand = eleven.slice(0, 10); E.endTurn(S); ok('quipu: 10 cards are kept', S.P[0].hand.length === 10 && !S.P[0].gone.length); }
{ const S = game(); S.P[0].hand = eleven.slice(0, 9); E.endTurn(S); ok('without it, 9 cards keep 8', S.P[0].hand.length === 8); }
{ const S = game(); S.P[0].relics = ['manuscripts']; S.P[0].hand = ['quipu']; ok('quipu: not beside the Manuscripts, the same power', !relic(S, 'quipu'));
  S.P[0].relics = ['press']; S.P[0].hand = ['manuscripts']; ok('manuscripts: beside the Printing Press, another power', !!relic(S, 'manuscripts')); }
{ const S = game(); S.cfg = Object.assign({}, S.cfg, { hold: 9 }); S.P[0].relics = ['manuscripts']; ok('cfg.hold: a test game tries 9', E.handMax(S, 0) === 9); }
{ const S = game(); S.P[0].relics = ['manuscripts']; const T = E.clone(S); ok('manuscripts: a copy of the table keeps it', E.handMax(T, 0) === 10); }
{ const d = C.ARCH.Legion.cards.slice(0, 18).concat(['manuscripts', 'quipu']); let err = null, used = 0, kept = 0;
  for (let s = 1; s <= 20 && !err; s++) { try { const S = E.play([d.concat(d), d.concat(d)], ['leonardo', 'suntzu'], [E.PROF.normal, E.PROF.hard], Object.assign({}, E.STD), 100 + s); for (let o = 0; o < 2; o++) if (S.st.played[o].manuscripts || S.st.played[o].quipu) used++; } catch (e) { err = e; } }
  ok('robots play whole games with the Manuscripts and the Quipu', !err, err && err.stack); ok('robots play them', used > 10, used); }
// ── The Relic powers of 2026-11-13 (relics-proposal.md with Tim's decisions: relics-2026-11-13b.txt), each held to
// the sentence on its card, its cost and its limits ──
const TXC = require(repo + '/games/anoria/text.js').CARDS;
const says = (k, tx) => ok(k + ': the card says "' + tx + '"', TXC[k].tx === tx, TXC[k].tx);
const power = (k, fx, c) => ok(k + ': ' + fx + '\'s power, ' + c + ' Spark', E.fxOf(k) === fx && C.CARDS[k].c === c, [E.fxOf(k), C.CARDS[k].c]);
const acts = (S, t) => E.actions(S).filter(a => a.t === t);
// (a game whose turn is starting: the draw pile known, nobody ahead)
const turnGame = (lay) => { const S = game(lay); S.P.forEach(p => { p.deck = ['spartacus', 'socrates', 'eureka', 'hammurabi', 'leonidas']; p.renown = 0; }); return S; };
// Foresight: the Antikythera Mechanism (from 3 Spark to 2) and the Dresden Codex
{ const FS = 'At the start of your turn, before you draw, look at the top 3 cards of your draw pile and put them back in any order.';
  says('codex', FS); says('antikythera', FS); power('codex', 'codex', 2); power('antikythera', 'codex', 2);
  { const S = turnGame(); S.P[0].relics = ['codex']; S.P[0].deck = ['eureka', 'galileo', 'spartacus', 'charlemagne']; S.P[0].hand = [];
    E.startTurn(S); ok('foresight: the robots put the dearest card they can pay for on top', S.P[0].hand[0] === 'spartacus' && S.P[0].hand[1] === 'charlemagne' && S.P[0].deck[S.P[0].deck.length - 1] === 'galileo', [S.P[0].hand, S.P[0].deck]);
    ok('foresight: said in an event', S.ev.some(e => e.t === 'rfx' && e.fx === 'codex' && e.n === 3)); }
  { const S = turnGame(); S.P[0].relics = ['antikythera']; S.P[0].deck = ['eureka', 'galileo', 'spartacus', 'charlemagne']; S.P[0].hand = [];
    E.startTurn(S, { ask: true }); ok('foresight: a person chooses before drawing', S.pend && S.pend.k === 'fore' && !S.P[0].hand.length && S.pend.ids.join() === 'charlemagne,spartacus,galileo', S.pend);
    const os = E.actions(S); ok('foresight: every order of the three', os.length === 6 && os.every(a => a.t === 'dom' && a.ord.length === 3), os.length);
    E.apply(S, os.find(a => a.ord.join() === 'galileo,eureka,charlemagne') || { t: 'dom', ord: ['galileo', 'spartacus', 'charlemagne'] });
    ok('foresight: put back in the order chosen, then drawn', !S.pend && S.P[0].hand.join() === 'galileo,spartacus' && S.P[0].deck[S.P[0].deck.length - 1] === 'charlemagne', [S.P[0].hand, S.P[0].deck]); }
  { const S = turnGame(); S.P[0].relics = ['codex']; S.P[0].deck = ['galileo']; S.P[0].hand = []; E.startTurn(S, { ask: true }); ok('foresight: nothing to order in a pile of 1', !S.pend && S.P[0].hand.length === 1); }
  { const S = turnGame(); S.P[0].relics = ['codex']; S.P[0].hand = ['antikythera']; ok('foresight: the Antikythera not beside the Codex, the same power', !relic(S, 'antikythera')); } }
// Landing: the Viking Longship and the Voyaging Canoe (3 Spark to 2)
{ says('longship', 'You can play your Figures at the Crossroads.'); says('voyagingcanoe', 'You can play your Figures at the Crossroads.'); power('longship', 'longship', 2); power('voyagingcanoe', 'longship', 2);
  const S = game(); S.P[0].hand = ['spartacus']; const at = () => acts(S, 'fig').map(a => a.p).sort().join();
  ok('landing: without it, only at your Gate', at() === '0', at()); S.P[0].relics = ['voyagingcanoe']; ok('landing: at the Crossroads too', at() === '0,4', at());
  fig(S, 'leonidas', 0, 4); fig(S, 'boudica', 0, 4); fig(S, 'socrates', 0, 4); ok('landing: not where you have 3 Figures already', at() === '0', at()); }
// Convoy: The Wheel
{ says('wheel', 'When one of your Figures walks, one other Figure of yours at the same Domain can walk with it.'); power('wheel', 'wheel', 1);
  const S = game(); const a = fig(S, 'leonidas', 0, 0), b = fig(S, 'boudica', 0, 0), c = fig(S, 'spartacus', 0, 0, { rdy: 0 });
  ok('convoy: not without it', !acts(S, 'walk').some(x => x.w2)); S.P[0].relics = ['wheel'];
  const w = acts(S, 'walk').filter(x => x.u === a.u && x.w2); ok('convoy: one other Figure there walks with it', w.length && w.every(x => x.w2 === b.u), w);
  ok('convoy: not a Figure that has moved this turn', !acts(S, 'walk').some(x => x.w2 === c.u));
  E.apply(S, w.find(x => x.p === 1)); ok('convoy: both walk', a.p === 1 && b.p === 1 && !a.rdy && !b.rdy);
  ok('convoy: said as walking with it', S.ev.some(e => e.t === 'move' && e.u === b.u && e.with === a.u));
  const T = game(); T.P[0].relics = ['wheel']; const d = fig(T, 'leonidas', 0, 0), e = fig(T, 'boudica', 0, 0); fig(T, 'spartacus', 0, 1);
  ok('convoy: not into a Domain with room for one (Thermopylae holds two)', acts(T, 'walk').some(x => x.u === d.u && x.p === 1) && !acts(T, 'walk').some(x => x.p === 1 && x.w2)); }
// Railway: the Steam Locomotive
{ says('locomotive', 'Once a turn, one of your Figures at your Gate can walk to any Domain where you have another Figure.'); power('locomotive', 'locomotive', 1);
  const S = game(); S.P[0].relics = ['locomotive']; const a = fig(S, 'leonidas', 0, 0), b = fig(S, 'boudica', 0, 0); fig(S, 'spartacus', 0, 3); const c = fig(S, 'socrates', 0, 1);
  const r = acts(S, 'rail'); ok('railway: from your Gate to a Domain where you have a Figure', r.some(x => x.u === a.u && x.p === 3) && r.every(x => x.p === 3) && !r.some(x => x.u === c.u), r);
  E.apply(S, r.find(x => x.u === a.u)); ok('railway: it walked there', a.p === 3 && !a.rdy && S.ev.some(e => e.t === 'move' && e.rail));
  ok('railway: once a turn', !acts(S, 'rail').length); S.P[0].uRw = 0; S.P[0].relics = []; ok('railway: not without it', !acts(S, 'rail').length); }
// Charge: the Stirrup
{ says('stirrup', 'Your Figures can start a clash on a turn they walk.'); power('stirrup', 'stirrup', 1);
  for (const on of [0, 1]) { const S = game(); if (on) S.P[0].relics = ['stirrup']; const a = fig(S, 'boudica', 0, 1); const d = fig(S, 'spartacus', 1, 4);
    E.apply(S, acts(S, 'walk').find(x => x.u === a.u && x.p === 4)); const cl = acts(S, 'clash').some(x => x.u === a.u && x.v === d.u);
    ok(on ? 'charge: a Figure that walked can still start a clash' : 'charge: without it, a Figure that walked can\'t', cl === !!on); } }
// Rebuilding: the Inca Rope Bridge (1 Spark to 2)
{ says('ropebridge', 'Once a game, when a round ends, mend one of your broken Seals.'); power('ropebridge', 'ropebridge', 2);
  const S = game(); S.P[0].relics = ['ropebridge']; E.endRound(S); ok('rebuilding: nothing to mend, nothing used', S.P[0].seals === 3 && !S.P[0].rb);
  S.P[0].seals = 2; E.endRound(S); ok('rebuilding: a broken Seal mended at the count', S.P[0].seals === 3 && S.P[0].rb === 1 && S.ev.some(e => e.t === 'mend' && e.why === 'ropebridge' && e.r === 'ropebridge'));
  S.P[0].seals = 2; E.endRound(S); ok('rebuilding: once a game', S.P[0].seals === 2);
  const T = game(); T.P[1].relics = ['ropebridge']; fig(T, 'charlemagne', 0, 2); E.endRound(T); ok('rebuilding: after the Seal that breaks at the same count', T.P[1].seals === 3 && T.P[1].rb === 1, T.P[1].seals); }
// Homecoming: the Cyrus Cylinder, and Rapa Nui
{ says('cyruscylinder', 'Once a round, when one of your Figures is knocked out, it goes back into your hand.'); power('cyruscylinder', 'cyruscylinder', 1);
  const S = game(); S.P[1].relics = ['cyruscylinder']; let a = fig(S, 'charlemagne', 0, 4), d = fig(S, 'spartacus', 1, 4);
  E.apply(S, { t: 'clash', u: a.u, v: d.u }, 2, 0); ok('homecoming: the Figure goes back into its player\'s hand', S.P[1].hand.indexOf('spartacus') >= 0 && S.P[1].gone.indexOf('spartacus') < 0 && S.ev.some(e => e.t === 'home' && e.to === 'hand'));
  a.rdy = 1; a.acted = 0; S.P[0].uC = 0; d = fig(S, 'socrates', 1, 4); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 2, 0); ok('homecoming: once a round', S.P[1].gone.indexOf('socrates') >= 0);
  E.endRound(S); a.rdy = 1; a.acted = 0; d = fig(S, 'boudica', 1, 4); E.apply(S, { t: 'clash', u: a.u, v: d.u }, 2, 0); ok('homecoming: again the next round', S.P[1].hand.indexOf('boudica') >= 0);
  const R = game([null, null, null, null, 'rapanui']); R.P[1].relics = ['cyruscylinder']; const b = fig(R, 'charlemagne', 0, 4), e = fig(R, 'spartacus', 1, 4);
  E.apply(R, { t: 'clash', u: b.u, v: e.u }, 2, 0); ok('homecoming at Rapa Nui: its player chooses', R.pend && R.pend.k === 'home' && R.pend.o === 1 && E.actions(R).length === 2);
  ok('homecoming at Rapa Nui: the robots choose the hand', (E.aiPick(R, E.PROF.normal, E.rng(3)) || {}).home === 'hand');
  E.apply(R, E.actions(R).find(x => x.home === 'top')); ok('homecoming at Rapa Nui: on top of the deck, and the Cylinder kept for the round', R.P[1].deck[R.P[1].deck.length - 1] === 'spartacus' && !R.P[1].uCy && !R.pend);
  const R2 = game([null, null, null, null, 'rapanui']); const b2 = fig(R2, 'charlemagne', 0, 4), e2 = fig(R2, 'spartacus', 1, 4); E.apply(R2, { t: 'clash', u: b2.u, v: e2.u }, 2, 0); ok('Rapa Nui without the Cylinder: on top of the deck, no choice', !R2.pend && R2.P[1].deck[R2.P[1].deck.length - 1] === 'spartacus'); }
// Bastion: Greek Fire
{ says('greekfire', 'Your Figures have +1 Might when defending at your Gate or your Outpost.'); power('greekfire', 'greekfire', 2);
  const S = game(); const a = fig(S, 'spartacus', 0, 0), b = fig(S, 'boudica', 0, 1), c = fig(S, 'socrates', 0, 4), en = fig(S, 'leonidas', 1, 4);
  const before = [a, b, c].map(f => [E.might(S, f, 2, en), E.might(S, f, 1, en), E.might(S, f, 0)]); S.P[0].relics = ['greekfire']; const after = [a, b, c].map(f => [E.might(S, f, 2, en), E.might(S, f, 1, en), E.might(S, f, 0)]);
  ok('bastion: +1 defending at your Gate and your Outpost', after[0][0] === before[0][0] + 1 && after[1][0] === before[1][0] + 1);
  ok('bastion: not at the Crossroads, not attacking or holding', after[2][0] === before[2][0] && after[0][1] === before[0][1] && after[0][2] === before[0][2]); }
// Volley: Mysore Rockets
{ says('rockets', 'Once a turn, one of your Figures can start a clash with an enemy Figure at the next Domain, without moving. If your Figure loses, nothing happens to it.'); power('rockets', 'rockets', 3);
  const S = game(); S.P[0].relics = ['rockets']; const a = fig(S, 'boudica', 0, 1), d = fig(S, 'spartacus', 1, 4), far = fig(S, 'socrates', 1, 3);
  const v = acts(S, 'clash').filter(x => x.rk); ok('volley: at the next Domain only', v.length && v.every(x => x.v === d.u), v);
  E.apply(S, v.find(x => !x.ph), 0, 6); ok('volley: losing does nothing to the Figure that fired, and it stays', E.byU(S, a.u) && a.p === 1 && E.byU(S, d.u));
  const ce = S.ev.find(e => e.t === 'clash'); ok('volley: the clash is at the target\'s Domain', ce && ce.p === 4 && ce.rk && ce.from === 1, ce);
  ok('volley: once a turn', !acts(S, 'clash').some(x => x.rk));
  const T = game(); T.P[0].relics = ['rockets']; const a2 = fig(T, 'charlemagne', 0, 1), d2 = fig(T, 'spartacus', 1, 4); E.apply(T, acts(T, 'clash').find(x => x.rk), 3, 0);
  ok('volley: winning knocks the target out, and the Figure that fired stays', !E.byU(T, d2.u) && a2.p === 1);
  ok('volley: not without it', (() => { const U = game(); fig(U, 'boudica', 0, 1); fig(U, 'spartacus', 1, 4); return !acts(U, 'clash').length; })());
  const P = game([null, null, null, null, 'onondaga']); P.P[0].relics = ['rockets']; fig(P, 'boudica', 0, 1); fig(P, 'spartacus', 1, 4); ok('volley: the target\'s Domain\'s rules apply (Onondaga: no clash starts there)', !acts(P, 'clash').length);
  const L = game(); L.P[0].relics = ['rockets']; fig(L, 'boudica', 0, 1); fig(L, 'hammurabi', 1, 4); ok('volley: Law at the target\'s Domain stops it', !acts(L, 'clash').length);
  const M = game([null, null, null, null, 'colosseum']); M.P[0].relics = ['rockets']; const a3 = fig(M, 'spartacus', 0, 1), d3 = fig(M, 'charlemagne', 1, 4); const r1 = M.P[1].renown;
  { const H = game([null, null, null, null, 'mainz']); const ah = fig(H, 'boudica', 0, 1), dh = fig(H, 'spartacus', 1, 4);   // (Boudica is at home in Europe: at Mainz, not at Thermopylae)
    ok('volley: the Might is reckoned at the target\'s Domain (home there)', E.clashM(H, ah, dh, 1)[0] === E.clashM(H, ah, dh, 0)[0] + 1 && ah.p === 1, [E.clashM(H, ah, dh, 1), E.clashM(H, ah, dh, 0)]); }
  E.apply(M, acts(M, 'clash').find(x => x.rk), 0, 0); ok('volley at the Colosseum: the defender who wins scores there', M.P[1].renown === r1 + 1 && E.byU(M, a3.u)); }
// Decipher: the Rosetta Stone
{ says('rosetta', 'Each Legacy Line you make scores 1 more Renown.'); power('rosetta', 'rosetta', 2);
  for (const on of [0, 1]) { const S = game(); if (on) S.P[0].relics = ['rosetta']; fig(S, 'socrates', 0, 0); S.P[0].hand = ['plato']; const r0 = S.P[0].renown;
    E.apply(S, acts(S, 'fig').find(x => x.p === 0)); ok(on ? 'decipher: a Legacy Line scores 1 more' : 'a Legacy Line scores 1', S.P[0].renown - r0 === 1 + on, S.P[0].renown - r0); } }
// Far sight: the Telescope (2 Spark to 1)
{ says('telescope', 'Each opponent shows you the first card they draw each turn.'); power('telescope', 'telescope', 1);
  const S = turnGame(); S.P[1].relics = ['telescope']; S.P[0].hand = [];
  E.startTurn(S); const sh = S.ev.filter(e => e.t === 'shown');
  ok('far sight: the first card drawn is shown to the Telescope\'s player', sh.length === 1 && sh[0].o === 0 && sh[0].c === 'leonidas' && sh[0].c === S.P[0].hand[0] && sh[0].by.join() === '1' && sh[0].r === 'telescope', sh);
  ok('far sight: only the first, and then held as any card (nothing kept in the state)', S.P[0].hand.length === 2 && S.P[0].shown === undefined);
  const U = turnGame(); U.P[0].relics = ['telescope']; E.startTurn(U); ok('far sight: not for its own player', !U.ev.some(e => e.t === 'shown'));
  const V = turnGame(); V.P[1].relics = ['telescope']; V.turn = 1; E.startTurn(V); ok('far sight: not the Telescope\'s player\'s own draw', !V.ev.some(e => e.t === 'shown')); }
// Reading: Braille
{ says('braille', 'When you play a Scholar Figure, you draw one more card.'); power('braille', 'braille', 2);
  for (const on of [0, 1]) { const S = turnGame(); if (on) S.P[0].relics = ['braille']; S.P[0].hand = ['galileo', 'spartacus']; S.P[0].spark = 5;
    E.apply(S, acts(S, 'fig').find(x => S.P[0].hand[x.h] === 'galileo')); ok(on ? 'reading: a Scholar draws 2' : 'a Scholar draws 1', S.P[0].hand.length === 2 + on, S.P[0].hand.length); }
  const S = turnGame(); S.P[0].relics = ['braille']; S.P[0].hand = ['spartacus']; E.apply(S, acts(S, 'fig')[0]); ok('reading: not for a Figure that is not a Scholar', !S.P[0].hand.length); }
// Stores: the Clay Tablet
{ says('tablet', 'While you are not ahead in Renown, you gain 1 more Spark at the start of each turn.');
  ok('stores: ' + C.CARDS.tablet.c + ' Spark, its own power', E.fxOf('tablet') === 'tablet');
  const sp = (r0, r1, on) => { const S = turnGame(); S.round = 3; if (on) S.P[0].relics = ['tablet']; S.P[0].renown = r0; S.P[1].renown = r1; S.cfg = Object.assign({}, S.cfg, { catchup: 0 }); E.startTurn(S); return S.P[0].spark; };
  ok('stores: +1 when level', sp(4, 4, 1) === sp(4, 4, 0) + 1); ok('stores: +1 when behind', sp(2, 4, 1) === sp(2, 4, 0) + 1); ok('stores: nothing when ahead', sp(5, 4, 1) === sp(5, 4, 0));
  const S = turnGame(); S.P[0].relics = ['tablet']; E.startTurn(S); ok('stores: said in an event', S.ev.some(e => e.t === 'spark' && e.why === 'relic' && e.r === 'tablet')); }
// Library Cave: the Dunhuang Star Chart
{ says('starchart', 'Once a turn, you can pay 1 Spark to take a card from your discard pile into your hand.'); power('starchart', 'starchart', 2);
  const S = game(); S.P[0].gone = ['spartacus', 'charlemagne', 'spartacus']; ok('library cave: not without it', !acts(S, 'cave').length); S.P[0].relics = ['starchart'];
  const cs = acts(S, 'cave'); ok('library cave: one move for each card, the dearest first', cs.map(a => a.c).join() === 'charlemagne,spartacus', cs);
  E.apply(S, cs[1]); ok('library cave: 1 Spark, the card into the hand', S.P[0].spark === 4 && S.P[0].hand.join() === 'spartacus' && S.P[0].gone.join() === 'spartacus,charlemagne' && S.ev.some(e => e.t === 'cave' && e.c === 'spartacus'));
  ok('library cave: once a turn', !acts(S, 'cave').length); const T = game(); T.P[0].relics = ['starchart']; T.P[0].gone = ['spartacus']; T.P[0].spark = 0; ok('library cave: needs 1 Spark', !acts(T, 'cave').length); }
// Safe conduct: the Paiza (3 Spark to 1)
{ says('paiza', 'Your Figures never miss a turn.'); power('paiza', 'paiza', 1);
  const S = game(); S.P[1].relics = ['paiza']; const g = fig(S, 'charlemagne', 1, 0); S.P[0].hand = ['socrates', 'eclipse']; S.P[0].spark = 5;
  ok('safe conduct: no Eclipse where every enemy Figure has it', !deeds(S, 'eclipse').length);
  E.apply(S, acts(S, 'fig').find(x => S.P[0].hand[x.h] === 'socrates')); ok('safe conduct: a Figure that stuns does nothing', !g.stun);
  const Q = game(); Q.P[0].relics = ['paiza']; const m = fig(Q, 'leonidas', 0, 4); fig(Q, 'charlemagne', 1, 4); Q.P[0].hand = ['lisbonquake']; Q.P[0].spark = 5;
  E.apply(Q, deeds(Q, 'lisbonquake').find(x => x.p === 4)); ok('safe conduct: the Lisbon Earthquake does not stop its player\'s Figures', !m.stun && Q.figs.find(f => f.o === 1).stun === 1);
  const R = game(); R.P[0].relics = ['paiza']; const n = fig(R, 'leonidas', 0, 1, { stun: 1 }); R.P[0].deck = ['spartacus', 'socrates']; E.startTurn(R); ok('safe conduct: a Figure with a stun on it still takes its turn', n.rdy === 1); }
// The jump keeps its power under the Montgolfier Balloon's key
{ power('balloon', 'balloon', 3); power('sextant', 'balloon', 3); power('chronometer', 'balloon', 3);
  const S = game(); S.P[0].relics = ['wrightflyer']; fig(S, 'leonidas', 0, 1); ok('the jump: the Wright Flyer jumps', acts(S, 'antik').length > 0); }
// Damascus Steel keeps its power alone, at 3 Spark; Greek Fire and the Rockets have their own
{ ok('Damascus Steel is the only Relic with its power', Object.keys(C.CARDS).filter(k => C.CARDS[k].t === 'relic' && E.fxOf(k) === 'dsteel').join() === 'dsteel');
  const S = game(); S.P[0].relics = ['dsteel', 'greekfire']; ok('Greek Fire beside Damascus Steel: two powers', !!S); S.P[0].relics = ['rockets']; S.P[0].hand = ['dsteel']; ok('Damascus Steel beside the Rockets', !!relic(S, 'dsteel')); }
// A game saved before 2026-11-13 keeps the powers its Relics had (cfg.rfx)
{ const old = S => { S.cfg = Object.assign({}, S.cfg); delete S.cfg.rfx; return S; };
  { const S = old(game()); S.P[0].relics = ['antikythera']; fig(S, 'leonidas', 0, 1); ok('an old game: the Antikythera Mechanism still jumps', acts(S, 'antik').length > 0 && E.fxOf('antikythera', S) === 'balloon'); }
  { const S = old(turnGame()); S.P[0].relics = ['telescope']; S.P[0].hand = []; E.startTurn(S); ok('an old game: the Telescope still draws one more card', S.P[0].hand.length === 3 && !S.pend); }
  { const S = old(game()); S.P[0].relics = ['rockets']; const a = fig(S, 'boudica', 0, 4), d = fig(S, 'spartacus', 1, 4); const m = E.might(S, a, 1, d); S.P[0].relics = []; ok('an old game: Mysore Rockets still give +1 Might when attacking', m === E.might(S, a, 1, d) + 1); }
  { const S = old(game()); S.P[0].relics = ['wheel']; fig(S, 'leonidas', 0, 0); fig(S, 'boudica', 0, 0); ok('an old game: The Wheel still walks two steps, and no Convoy', acts(S, 'walk').some(x => x.p === 4) && !acts(S, 'walk').some(x => x.w2)); }
  { const S = old(game()); S.P[0].relics = ['codex']; S.P[0].hand = ['telescope']; ok('an old game: two Relics with one old power still can\'t both be in play', !relic(S, 'telescope')); } }
// Every Relic: robots in whole games with the new powers, no throw, each played
{ const NEWR = ['codex', 'antikythera', 'longship', 'wheel', 'locomotive', 'stirrup', 'ropebridge', 'cyruscylinder', 'greekfire', 'rockets', 'rosetta', 'telescope', 'braille', 'tablet', 'starchart', 'paiza'];
  let err = null; const used = {};
  for (let s = 1; s <= 40 && !err; s++) { const k = s % 8, rs = NEWR.slice(2 * k, 2 * k + 2), d = C.ARCH.Legion.cards.slice(0, 16).concat(rs, rs), e = C.ARCH.Court.cards.slice(0, 16).concat(NEWR.slice((2 * k + 4) % 16, (2 * k + 4) % 16 + 2)).concat(['cyruscylinder', 'telescope']);
    try { const S = E.play([d.concat(d.slice(0, 20)), e.concat(e)], ['leonardo', 'suntzu'], [E.PROF.normal, E.PROF.hard], Object.assign({}, E.STD), 300 + s); for (let o = 0; o < 2; o++) Object.keys(S.st.played[o]).forEach(c => { used[c] = 1; }); } catch (x) { err = x; } }
  ok('robots play whole games with the new Relic powers', !err, err && err.stack); ok('robots play every one of them', NEWR.every(k => used[k]), NEWR.filter(k => !used[k])); }
console.log((fails ? fails + ' failed, ' : '') + oks + ' passed');
process.exit(fails ? 1 : 0);
