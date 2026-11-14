// Arvela online (Tim, 2026-11-14: "add online to all the remaining games"): each person on their own device, at their
// own pace, through TurnNet (turnnet.js): one table doc in turnRooms holding the whole game, with seats, accts, turn and
// drive kept the way every TurnNet game keeps them, so the home screen shows "Your turn" with no Arvela code of its own.
//
// THE TABLE'S STATE (TurnNet's st, JSON): {v, mi, seed, lv, teams, pl, ph, G, over}
//   mi      the number of moves made at the table (one more each move; a device that has seen mi - 1 plays the move back)
//   seed    the table's own seed: every die and every shuffle comes from it (E.rng(seed, mi) in each move), never from a
//           device's own random, so the game is the same game whichever device makes the move
//   lv      the computer players' skill; teams, who plays together (ui.js teamsFor, as the setup offers them)
//   pl      [{name, cpu, d}] in seat order: d is the deck the person brought from their own collection on their own
//           device ({n, id, guide, cards, stack, built, mat}); null until they have chosen it (ph 'decks')
//   ph      'decks' while someone still has to choose a deck, then 'game'
//   G       the page's game (ui.js G, with the engine's state S in it, saved the way ui.js saves a game: S without cfg,
//           st and ev). It holds every player's hand, draw pile and Domain stack, as the Spades and Hearts tables hold
//           every hand: each device draws only its own (ui.viewer is the device's seat).
//   G.cls   each person's callings, counted from their own seat (coll.js track), for the rewards at the end
//   over    a game that ended before it began (someone left while the decks were being chosen)
//
// A MOVE (mv, what a device sends; step() makes it, inside TurnNet's transaction, on the table as it is on the server):
//   {k: 'deck', d}      the deck a person brings (ph 'decks')
//   {k: 'lay', a}       the set-up: {gate, out, offer}, each person at the same time; the last one to lay rolls the dice
//   {k: 'act', a}       an engine action, checked against E.actions (or E.pendActions for a choice of Domain)
//   {k: 'disc', h}      a card discarded over the hand limit (the turn ends by itself once the hand is down to it)
//   {k: 'end'}          the end of the turn: the next turn starts in the same move, and the count when the round ends
// What a move did is kept in the table's mv as phases, [{t: 'e', evs, ctx} | {t: 'count', evs} | {t: 'round', r} |
// {t: 'lay', o} | {t: 'roll', rolls}], each with the engine's events, and every device plays them back with the
// table's own playback (ui.js playEvents, roundEnd, banner, suRoll), the other players' moves as the computer's are.
// The bookkeeping (tally, the turn log, the game's history) runs ui.js's own code on this copy (AnoriaUI.net.swap), in
// the same order as ui.js's own game loop: actPhase is doAction, endPhase endTurn, startPhase beginTurn, rollPhase suRoll.
// A change to what those do to G needs the same change here.
//
// Two players are people only. With three to six the computer plays any seat nobody takes, and a seat whose person
// leaves; its moves are made by whichever person's device has the table open (TurnNet's bot), one step at a time.
// Leaving a game of two ends it, and the other player wins.
(function () {
  'use strict';
  const UI = window.AnoriaUI, H = UI && UI.net;
  if (!window.TurnNet || !H) return;
  const E = window.AnoriaEngine, C = window.AnoriaCards, Coll = window.AnoriaColl, TX = window.AnoriaText, el = Kit.el;
  const ui = H.ui, KEY = 'anoria', REC = 'anoria_net_rec';
  const clone = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const lsJ = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const lsP = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const TXG = Object.assign({}, TX.OLD_GUIDES || {}, TX.GUIDES);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // ═══ The game's state, packed for the table and unpacked to play ═══
  function pack(g) { const S = g.S; return Object.assign({}, g, { S: Object.assign({}, S, { cfg: null, st: null, ev: null }) }); }
  function unpack(gp) {
    const g = clone(gp), S = g.S;
    S.cfg = H.cfgOf(g); S.st = null; S.ev = [];
    g.players.forEach(H.deckOf); g.seen = g.seen || {};
    return g;
  }
  // (the dice and shuffles of move number mi at this table)
  const rngOf = st => E.rng((st.seed ^ Math.imul(st.mi + 1, 0x9E3779B1)) >>> 0);
  const pname = (g, o) => g.players[o].name;

  // A new game from the seats and their decks (ui.js newGame, without the screen): the engine's state with Domains
  // at their set-up, the computer players' Domains laid at once
  function buildGame(st) {
    const N = st.pl.length, teams = st.teams || null, cols = H.seatColors(N, teams), R = E.rng((st.seed ^ 0x5bd1e995) >>> 0);
    const players = st.pl.map((p, i) => {
      const d = p.d, q = { name: p.name, cpu: !!p.cpu, color: cols[i], deck: d.n, deckId: d.id, built: !!d.built, guide: d.guide, cards: d.cards.map(C.now), stack: (d.stack || []).slice() };
      if (p.cpu) q.level = st.lv; if (d.mat && !p.cpu) q.mat = d.mat;
      return q;
    });
    const dmOn = !!C.DM_LIVE;
    players.forEach(p => { p.stack = dmOn ? H.stackOf(p) : null; });
    const ecfg = H.cfgStd(); if (teams) { ecfg.teams = teams; ecfg.target = E.targetFor(teams); }
    const S = E.newGame(players.map(p => p.cards.slice()), players.map(p => p.guide), ecfg, E.rng(st.seed >>> 0), dmOn ? players.map(p => p.stack.slice()) : null, { wait: dmOn });
    S.st = null; S.ev = [];
    const seats = () => players.map(() => ({ ko: 0, lines: 0, seals: 0, held: 0 }));
    const g = { mode: 'net', level: st.lv, sc: 2, tg: S.cfg.target, rfx: S.cfg.rfx, teams: teams, players: players, S: S, ord: E.order(S), k: 0, ph: 'start', started: Date.now(), n: 0,
      stats: seats(), hist: [], seen: {}, tale: { links: [], seals: [], hold: [], tot: [], ko: players.map(() => ({})), outs: [] }, cl: null, cls: players.map(p => (p.cpu ? null : Coll.trackStart())), cv: Coll.VER, log: [] };
    S.turn = g.ord[0];
    if (S.su && S.su.step !== 'done') { g.ph = 'setup'; players.forEach((p, o) => { if (p.cpu) E.setupLay(S, o, E.setupPick(S, o, H.profOf(p, g.level), R)); }); }
    else H.swap(g, () => startPhase(g, { ph: [] }));
    return g;
  }
  // (each person's callings, from their own seat: ui.js callTrack does it for the first player at a table of one device)
  function trackAll(g, evs) { (g.cls || []).forEach((m, o) => { if (m) evs.forEach(ev => Coll.track(m, ev, o)); }); }

  // ═══ The moves (pure: TurnNet may run one again on a newer table) ═══
  // doAction: one engine action, with the table's dice
  function actPhase(g, a, R, rec) {
    const S = g.S, o = S.turn, P = S.P[o], ctx = { a: a, o: o };
    ctx.key = a.h != null ? P.hand[a.h] : a.ph ? H.quickOf(a) : null; ctx.h2key = a.h2 != null ? P.hand[a.h2] : null;
    if (a.t === 'clash' && a.ph) ctx.key = H.quickOf(a);
    ctx.cost = ctx.key ? E.costOf(S, o, ctx.key, a.t === 'fig' ? a.p : undefined) : 0;
    const roll = E.rollClash(S.cfg, R); ctx.roll = roll;
    E.apply(S, a, roll.da, roll.dd, roll);
    const evs = S.ev.splice(0); g.n++; H.tally(evs); H.logEvs(evs); trackAll(g, evs);
    ctx.random = evs.some(e => e.t === 'draw' || e.t === 'clash' || e.t === 'domain' || e.t === 'choose' || e.t === 'dunder' || e.t === 'congress' || e.t === 'veto');
    ctx.veto = evs.find(e => e.t === 'veto') || null;
    if (g.players[o].cpu) g.bn = (g.bn || 0) + 1;
    rec.ph.push({ t: 'e', evs: evs, ctx: ctx });
  }
  // beginTurn: the round's banner, then the turn's Spark and cards (a person's Foresight waits for them: S.pend)
  function startPhase(g, rec) {
    const S = g.S, o = S.turn, pl = g.players[o];
    if (g.k === 0) rec.ph.push({ t: 'round', r: S.round });
    E.startTurn(S, { ask: !pl.cpu }); g.ph = 'play'; g.bn = 0;
    const evs = S.ev.splice(0); H.logEvs(evs); trackAll(g, evs);
    rec.ph.push({ t: 'e', evs: evs, ctx: { o: o } });
  }
  // endTurn: the turn ends, the next one in the round begins, or the count and then the next round's first turn
  function endPhase(g, rec) {
    const S = g.S, o = S.turn;
    E.endTurn(S); const evs = S.ev.splice(0); H.logEvs(evs); rec.ph.push({ t: 'e', evs: evs, ctx: { o: o } });
    const r0 = S.P.map(p => p.renown);
    if (g.k < g.ord.length - 1) { g.k++; S.turn = g.ord[g.k]; g.ph = 'start'; }
    else {
      const rNow = g.hist.length + 1; E.endRound(S); const evR = S.ev.splice(0); H.logEvs(evR, rNow); const held = H.tally(evR) || {}; trackAll(g, evR); trackAll(g, [{ t: 'count', ren: S.P.map(p => p.renown) }]);
      if (g.tale) g.tale.hold.push(H.posOrder().map(i => (held[i] == null ? '.' : 'abcdef'[held[i]])).join(''));
      g.hist.push(S.P.map((p, i) => p.renown - r0[i])); if (g.tale) g.tale.tot.push(S.P.map(p => p.renown).join('-'));
      if (S.over) g.over = true; else { g.ord = E.order(S); g.k = 0; S.turn = g.ord[0]; g.ph = 'start'; }
      rec.ph.push({ t: 'count', evs: evR });
    }
    if (g.over) H.logEnd(); else startPhase(g, rec);
  }
  // suRoll: everyone has laid, so the Domains turn up and the dice decide the Crossroads
  function rollPhase(g, R, rec) {
    const S = g.S; E.setupRoll(S, R); S.ev.splice(0);
    const su = S.su, first = su.first, dibs = su.dibs;
    g.ord = S.N > 2 ? E.order(S) : [first, 1 - first]; g.k = 0; S.turn = g.ord[0];
    g.log = g.log || []; g.log.push({ o: dibs, x: [Kit.poss(pname(g, dibs)) + ' offer, ', { k: '@' + S.places[2 * S.N] }, ', is the Crossroads, and ' + (pname(g, first) === 'You' ? 'you take' : pname(g, first) + ' takes') + ' the first turn.'] });
    rec.ph.push({ t: 'roll', rolls: clone(su.rolls) });
    g.ph = 'start'; startPhase(g, rec);
  }
  // A deck a person brings: checked against the game's cards (40, two of a card at most) and Domains
  function deckOk(d) {
    if (!d || !Array.isArray(d.cards) || !C.GUIDES[d.guide] && !TXG[d.guide]) return null;
    const cards = d.cards.map(C.now), n = {};
    if (cards.length !== Coll.DECK || cards.some(k => !C.CARDS[k] || (n[k] = (n[k] || 0) + 1) > 2)) return null;
    const stack = (Array.isArray(d.stack) ? d.stack : []).filter((id, i, a) => C.PLACES[id] && a.indexOf(id) === i);
    return { n: String(d.n || TXG[d.guide].n).slice(0, 40), id: String(d.id || ''), guide: d.guide, cards: cards, stack: stack, built: !!d.built, mat: typeof d.mat === 'string' ? d.mat.slice(0, 4000) : null };
  }
  // one move by seat o: {state, mv} or null when it can't be made on this table
  function step(st, o, m) {
    if (!st || st.over || !m) return null;
    const rec = { k: m.k, o: o, ph: [] }, R = rngOf(st);
    if (st.ph === 'decks') {
      if (m.k !== 'deck' || !st.pl[o] || st.pl[o].d) return null;
      const d = deckOk(m.d); if (!d) return null;
      st.pl[o].d = d; rec.ph.push({ t: 'deck', o: o });
      if (st.pl.every(p => p.d)) { st.G = pack(buildGame(st)); st.ph = 'game'; }
      st.mi++; return { state: st, mv: rec };
    }
    const g = unpack(st.G), S = g.S;
    if (g.over) return null;
    const ok = H.swap(g, () => {
      if (m.k === 'lay') {
        if (g.ph !== 'setup' || !S.su || S.su.step !== 'lay' || S.su.lay[o] || !m.a) return false;
        if (!E.setupLay(S, o, { gate: m.a.gate, out: m.a.out, offer: m.a.offer })) return false;
        rec.a = { gate: m.a.gate, out: m.a.out, offer: m.a.offer }; rec.ph.push({ t: 'lay', o: o });
        if (S.su.step === 'roll') rollPhase(g, R, rec);
        return true;
      }
      if (g.ph !== 'play') return false;
      if (m.k === 'act') {
        const list = S.pend ? (S.pend.o === o ? E.pendActions(S) : []) : S.turn === o ? E.actions(S) : [];
        const a = list.find(x => same(x, m.a)); if (!a) return false;
        rec.a = a; actPhase(g, a, R, rec); return true;
      }
      if (S.pend || S.turn !== o) return false;
      const P = S.P[o];
      if (m.k === 'disc') {
        if (!(P.hand.length > E.handMax(S, o)) || !(m.h >= 0 && m.h < P.hand.length)) return false;
        rec.h = m.h; E.discard(S, o, m.h); const evs = S.ev.splice(0); H.logEvs(evs); rec.ph.push({ t: 'e', evs: evs, ctx: { h: m.h, o: o } });
        if (P.hand.length <= E.handMax(S, o)) endPhase(g, rec);
        return true;
      }
      if (m.k === 'end') {
        if (!g.players[o].cpu && P.hand.length > E.handMax(S, o)) return false;
        endPhase(g, rec); return true;
      }
      return false;
    });
    if (!ok) return null;
    st.G = pack(g); st.mi++;
    return { state: st, mv: rec };
  }

  // ═══ TurnNet's side: whose move it is, the end, the computer's moves, leaving ═══
  function turnOf(st) {
    if (!st || st.over) return [];
    if (st.ph === 'decks') return st.pl.map((p, o) => (p.d ? -1 : o)).filter(o => o >= 0);
    const g = st.G; if (!g || g.over) return [];
    const S = g.S;
    if (g.ph === 'setup') return S.su && S.su.step === 'lay' ? g.players.map((p, o) => (S.su.lay[o] ? -1 : o)).filter(o => o >= 0) : [];
    if (S.pend) return [S.pend.o];
    return [S.turn];
  }
  function overOf(st) {
    if (!st) return null;
    if (st.over) return { win: [st.over.w], text: st.pl[st.over.left].name + ' left the game', left: st.over.left };
    const g = st.G; if (!g || !g.over) return null;
    const S = g.S, w = S.winner, names = o => g.players[o].name;
    if (w < 0) return { win: [], text: 'A draw' };
    const win = g.teams ? g.players.map((p, o) => o).filter(o => g.teams.some(t => t.indexOf(o) >= 0 && t.indexOf(w) >= 0)) : [w];
    return { win: win, text: win.map(names).join(' & ') + (win.length > 1 ? ' win' : ' wins') };
  }
  // the deck of one of the twelve Guides, for a computer player (a Guide nobody else at the table has, while there are any)
  function robotDeck(st, R) {
    const used = st.pl.map(p => p.d && p.d.guide), pool = E.shuffle(Object.keys(C.GUIDES), R), g = pool.find(x => used.indexOf(x) < 0) || pool[0];
    const d = H.readyDeck(g); return { n: d.n, id: d.id, guide: d.guide, cards: d.cards.slice(), stack: Coll.guideStack(d.guide), built: false };
  }
  function bot(state, s) {
    const st = clone(state); if (turnOf(st).indexOf(s) < 0) return null;
    if (st.ph === 'decks') return step(st, s, { k: 'deck', d: robotDeck(st, rngOf(st)) });
    const g = unpack(st.G);
    const m = H.swap(g, () => {
      const S = g.S, prof = H.profOf(g.players[s], g.level);
      if (g.ph === 'setup') return { k: 'lay', a: E.setupPick(S, s, prof, Math.random) };
      if (S.pend && S.pend.o === s) return { k: 'act', a: E.pendPick(S, prof, Math.random) };
      if (S.turn !== s) return null;
      const a = (g.bn || 0) < 40 ? E.aiPick(S, prof, Math.random) : null;
      return a ? { k: 'act', a: a } : { k: 'end' };
    });
    return m ? step(st, s, m) : null;
  }
  // A person leaving: in a game of two the other player wins; with more, the computer takes their seat
  function resign(state, s) {
    const st = clone(state), two = st.pl.length === 2;
    if (st.ph === 'decks') {
      if (two) { st.over = { w: 1 - s, left: s }; st.mi++; return st; }
      st.pl[s].cpu = true; st.mi++; return { state: st, bot: true };
    }
    const g = unpack(st.G), S = g.S;
    if (two && !g.over) {
      S.over = true; S.winner = 1 - s; S.how = 'left'; g.over = true; g.left = s;
      (g.log = g.log || []).push({ h: 'e', x: [g.players[s].name + ' left the game, so ' + g.players[1 - s].name + ' wins.'] });
      st.G = pack(g); st.mi++; return st;
    }
    g.players[s].cpu = true; g.players[s].level = g.level; if (g.cls) g.cls[s] = null; st.pl[s].cpu = true;
    st.G = pack(g); st.mi++;
    return { state: st, bot: true };
  }

  // ═══ This device at the table ═══
  // L.st: the table's state as this device has played it; L.q: what has come in and is still to be played back
  const L = { st: null, q: [], run: false, net: null, seat: -1, code: null };
  const DRV = {
    seat: () => (L.seat >= 0 ? L.seat : 0),
    act: a => send({ k: 'act', a: a }),
    end: () => send({ k: 'end' }),
    disc: h => send({ k: 'disc', h: h }),
    lay: a => { if (!a.gate || !a.out || !a.offer) return; Kit.sfx('flip'); Kit.haptic('medium'); send({ k: 'lay', a: a }); },
    su: () => after(),
    recover: () => { if (L.st) load(L.st); },
    win: winOpts
  };
  function myTurn() { return !!L.net && L.seat >= 0 && turnOf(L.st).indexOf(L.seat) >= 0; }
  // your move: shown at once (TurnNet draws it here before the server has it), then written as a transaction
  function send(m) {
    if (!L.net || !myTurn()) return;
    const wasDisc = ui.discard;
    ui.sel = null; H.setBusy(true); H.render();
    L.net.act(st => step(st, L.seat, m)).then(ok => {
      if (ok) return;
      // (refused: the table changed under the move. The table as it is comes back here and is drawn again)
      setTimeout(() => { if (!L.run && !L.q.length && L.net && L.net.state) { load(L.net.state); ui.discard = wasDisc && myTurn(); H.render(); } }, 400);
    });
  }
  function show(net, info) {
    L.net = net; L.seat = net.seat; L.code = net.code;
    H.attach(DRV);
    L.q.push({ st: clone(net.state), prev: clone(info.prev), mv: clone(net.mv), fresh: !!info.fresh, again: !!info.again, mine: !!info.mine });
    pump();
  }
  async function pump() {
    if (L.run) return; L.run = true;
    try {
      while (L.q.length) {
        // (your own move is still being written: what comes in meanwhile waits for it)
        while (window.TurnNet._t && TurnNet._t.busy && !L.q[L.q.length - 1].mine) await new Promise(r => setTimeout(r, 120));
        const x = L.q.shift();
        try { await take(x); } catch (e) { console.warn('[arvela net]', e); load(x.st); }
      }
    } finally { L.run = false; }
  }
  async function take(x) {
    if (!x.st) return;
    // (a table older than the one shown, or as old: your own move was rebuilt on a newer table, and the table with it
    // is on its way. It is drawn as it is only if nothing newer comes)
    if (L.st && !x.fresh && !x.again && !x.mine && x.st.mi <= L.st.mi && !same(L.st, x.st)) {
      for (let t = 0; t < 15 && !L.q.some(y => y.st && y.st.mi > L.st.mi); t++) await new Promise(r => setTimeout(r, 100));
      if (L.q.some(y => y.st && y.st.mi > L.st.mi)) return;
    }
    // (the move is played back from the table as it was just before it: the one the server had, or the one shown here)
    const cur = L.st, onTable = cur && cur.ph === 'game' && H.get().G && H.get().G.mode === 'net' && x.st.ph === 'game';
    const base = x.prev && x.prev.ph === 'game' && x.prev.mi === x.st.mi - 1 ? x.prev : cur && cur.mi === x.st.mi - 1 ? cur : null;
    if (x.fresh || x.again || !onTable || !base || !x.mv || !x.mv.ph) {
      if (cur && !x.fresh && !x.again && same(cur, x.st)) return;
      if (x.again) document.querySelectorAll('.k-win').forEach(n => n.remove());
      return load(x.st);
    }
    return animate(base, x.st, x.mv);
  }
  // the table drawn as it is, with nothing played back (coming to the table, or after a move this device missed)
  function load(st) {
    L.st = st; H.attach(DRV);
    document.querySelectorAll('.clash,.show-card,.an-banner,.an-story,.an-fore').forEach(n => n.remove());
    ui.pend = null;
    if (st.over || st.ph === 'decks') { H.stop(); if (st.over) return earlyEnd(st); return deckScreen(st); }
    const g = unpack(st.G), me = L.seat;
    H.stop(); H.put(g, null);
    ui.view = me >= 0 ? me : 0; ui.viewer = me >= 0 ? me : -1; ui.hideHand = me < 0; ui.banner = g.S.round; ui.su = null; ui.ack = null; ui.discard = false; ui.sel = null; ui.count = -1;
    H.setCols(g.S.N > 2 || g.teams ? g.players.map(p => p.color) : null);
    H.buildTable(); H.put(g, H.snap()); H.render();
    if (g.n === 0 && g.ph !== 'play') Kit.gameStart();
    return after();
  }
  // A move played back: what it did, phase by phase, with the table's own pieces. The engine's state is the table's
  // (S); the screen (V) follows the events along, and comes level with it at the end.
  async function animate(prev, st, mv) {
    const my = H.gen(), g = unpack(st.G), mine = mv.o === L.seat;
    let said = null;
    if (mv.k === 'act' && !mine && mv.a) { try { const pg = unpack(prev.G); said = H.swap(pg, () => H.moveSaid(mv.a)); } catch (e) {} }
    ui.sel = null; if (!mine) ui.ack = null; H.setBusy(true);
    const rolled = mv.ph.some(p => p.t === 'roll');
    for (const ph of mv.ph) {
      if (H.gen() !== my) return;
      if (ph.t === 'lay') { if (rolled) continue; H.put(g); H.render(); if (!mine) Kit.sfx('flip', .6); continue; }
      if (ph.t === 'roll') {
        // (the dice as the table rolled them, with the set-up's own show: ui.js suRoll on the table as it was before them)
        const w = unpack(prev.G); let ok = E.setupLay(w.S, mv.o, mv.a) && w.S.su.step === 'roll';
        if (!ok) return load(st);
        w.S.ev = []; w.suDice = ph.rolls; ui.su = null; ok = false; w.suDone = () => { ok = true; };
        H.put(w); await H.suRoll();
        if (!ok) { if (H.gen() === my) load(st); return; }
        continue;
      }
      H.put(g);
      if (ph.t === 'e') { if (!(await H.playEvents(clone(ph.evs), Object.assign({}, ph.ctx)))) return; }
      else if (ph.t === 'count') { H.render(); if (!(await H.roundEnd(clone(ph.evs)))) return; }
      else if (ph.t === 'round') {
        if (ui.banner !== ph.r) {
          ui.banner = ph.r; Kit.sfx('pop');
          await H.banner('', 'Round ' + ph.r, ph.r === 1 ? '<span>' + (g.teams ? 'The first team to ' : 'First to ') + g.S.cfg.target + ' Renown</span>' : '');
        }
      }
    }
    if (H.gen() !== my) return;
    L.st = st; H.put(g); H.settle();
    if (said) ui.ack = said;
    return after();
  }
  // What this device does now: lay its Domains, make its choice, take its turn, or watch
  function after() {
    const { G: g } = H.get(); if (!g || g.mode !== 'net') return;
    const S = g.S, me = L.seat;
    if (me < 0) { H.setBusy(false); H.legal(); H.render(); return; }
    if (g.over) return endGame();
    if (g.ph === 'setup') {
      const lay = S.su && S.su.lay[me];
      if (!lay) { if (!ui.su || ui.su.o !== me || ui.su.wait) ui.su = { o: me, put: {}, sel: null }; H.setBusy(false); }
      else { ui.su = { o: me, put: { gate: lay.gate, out: lay.out, offer: lay.offer }, sel: null, wait: true }; H.setBusy(true); }
      H.render(); return;
    }
    ui.su = null;
    if (S.pend && S.pend.o === me) {   // (a choice that is yours: a Domain to lay, Foresight's order, the Cyrus Cylinder)
      const my = H.gen(), at = L.st && L.st.mi; ui.ack = null;
      H.askPend().then(a => { if (H.gen() === my && L.st && L.st.mi === at && a) send({ k: 'act', a: a }); });
      return;
    }
    if (S.turn === me && !S.pend) { ui.ack = null; ui.discard = ui.discard && S.P[me].hand.length > E.handMax(S, me); }
    else ui.discard = false;
    H.setBusy(false); H.legal(); H.render();
  }

  // ═══ Choosing a deck (each person, on their own device, from their own collection) ═══
  let CSSDONE = false;
  function css() {
    if (CSSDONE) return; CSSDONE = true;
    const s = document.createElement('style');
    s.textContent = '.an-nd{display:flex;flex-direction:column;gap:16px;padding-bottom:8px;}' +
      '.an-nd .nd-p{margin:0;color:var(--text-2);font-family:var(--fell, var(--font));font-size:1.02rem;line-height:1.35;text-align:center;}' +
      '.an-nd .nd-who{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;}' +
      '.an-nd .nd-chip{display:inline-flex;align-items:center;gap:7px;padding:5px 12px 5px 5px;border-radius:999px;background:var(--w05,rgba(255,255,255,.05));box-shadow:inset 0 0 0 1px rgba(217,180,90,.28);font-size:.95rem;}' +
      '.an-nd .nd-chip .avatar{width:28px;height:28px;font-size:.8rem;flex:none;}' +
      '.an-nd .nd-chip small{display:block;font-size:.76rem;color:var(--text-3);line-height:1.1;}' +
      '.an-nd .nd-chip b{display:block;font-weight:600;line-height:1.15;}' +
      '.an-nd .nd-chip.ok{box-shadow:inset 0 0 0 1px rgba(217,180,90,.7);}' +
      '.an-nd .k-startdock{padding-left:max(17px,16px);padding-right:max(17px,16px);}' +
      '.an-nd .nd-wait{display:flex;flex-direction:column;align-items:center;gap:12px;padding:28px 0 12px;}' +
      '.an-nd .nd-dots{display:flex;gap:7px;}.an-nd .nd-dots i{width:8px;height:8px;border-radius:50%;background:#d9b45a;opacity:.35;animation:ndp 1.2s infinite ease-in-out;}' +
      '.an-nd .nd-dots i:nth-child(2){animation-delay:.2s}.an-nd .nd-dots i:nth-child(3){animation-delay:.4s}' +
      '@keyframes ndp{0%,100%{opacity:.25;transform:scale(.85)}50%{opacity:1;transform:scale(1.1)}}';
    document.head.appendChild(s);
  }
  const listAnd = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  function deckScreen(st) {
    css(); ui.su = null;
    const app = UI.app, me = L.seat, mine = me >= 0 && st.pl[me] && !st.pl[me].d && !st.pl[me].cpu;
    document.documentElement.classList.remove('an-low');
    app.className = 'stage'; app.innerHTML = ''; window.scrollTo(0, 0);
    if (mine && !Coll.load().starter && window.AnoriaPacks) { window.AnoriaPacks.chooseStarter(app, () => { if (L.st === st) deckScreen(st); }); return; }
    const host = st.pl[0] ? st.pl[0].name : '';
    const wrap = el('div', { class: 'setup an-nd' });
    wrap.appendChild(el('div', { class: 'setup-hero' }, [el('h1', { text: mine ? 'Your deck' : 'Choosing decks' })]));
    const waiting = st.pl.filter(p => !p.d && !p.cpu).map(p => p.name);
    wrap.appendChild(el('p', { class: 'nd-p', text: (mine ? (me === 0 ? 'Choose the deck you bring to the table. Its Guide is your Guide for this game.' : 'Choose the deck you bring to ' + Kit.poss(host) + ' table. Its Guide is your Guide for this game.')
      : waiting.length ? 'The game begins when ' + listAnd(waiting) + (waiting.length > 1 ? ' have' : ' has') + ' chosen a deck.' : 'The game is about to begin.').replace(/'/g, '\u2019') }));
    // who is at the table, and whose deck is ready
    const who = el('div', { class: 'nd-who' });
    st.pl.forEach((p, o) => {
      const g = p.d ? TXG[p.d.guide] : null, av = Kit.avatar && Kit.avatar.el ? Kit.avatar.el(p.name, null, Kit.color ? Kit.color(o) : null) : el('span', { class: 'avatar', text: p.name.charAt(0) });
      who.appendChild(el('span', { class: 'nd-chip' + (p.d ? ' ok' : '') }, [av, el('span', {}, [el('b', { text: o === me ? 'You' : p.name }), el('small', { text: p.d ? (g ? g.n : p.d.n) : p.cpu ? 'The computer' : 'Choosing a deck' })])]));
    });
    wrap.appendChild(who);
    if (mine) {
      const pick = { v: H.starterId() };
      try { const sv = lsJ('gn_setup_anoria', {}); if (sv && sv.options && sv.options.deck0) pick.v = sv.options.deck0; } catch (e) {}
      const box = el('div');
      const paint = () => {
        box.innerHTML = '';
        const p = H.deckPicker('The decks you have', pick.v, v => { pick.v = v; paint(); }, 'me');
        // (building or changing a deck happens away from the table: those buttons belong to the setup)
        p.querySelectorAll('.dk-new').forEach(n => n.remove());
        p.querySelectorAll('.dk-btns .btn').forEach(b => { if (/^Change$/.test(b.textContent.trim())) b.remove(); });
        box.appendChild(p);
      };
      paint(); wrap.appendChild(box);
      const go = el('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block k-start shine', text: 'Bring this deck', onclick: () => {
        const d = Coll.deck(H.deckChoice(pick.v, 'me')); if (!d || !d.ok) { Kit.toast('That deck can’t be played yet'); return; }
        const stack = H.stackOf({ deckId: d.id, deck: d.n, cpu: false });
        let mat = null; try { mat = localStorage.getItem(H.matKey); } catch (e) {}
        Kit.sfx('pop'); Kit.haptic('medium'); go.disabled = true;
        L.net.act(s => step(s, me, { k: 'deck', d: { n: d.n, id: d.id, guide: d.guide, cards: d.cards.slice(), stack: stack, built: !!d.built, mat: mat } })).then(ok => { if (!ok) go.disabled = false; });
      } });
      wrap.appendChild(el('div', { class: 'k-startdock' }, [go]));
    } else {
      wrap.appendChild(el('div', { class: 'nd-wait' }, [el('div', { class: 'nd-dots', 'aria-hidden': 'true' }, [el('i'), el('i'), el('i')])]));
      wrap.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-block', text: 'Leave the table', onclick: leaveAsk }));
    }
    app.appendChild(wrap);
  }
  function leaveAsk() {
    const two = L.st && L.st.pl && L.st.pl.length === 2;
    Kit.confirm('Leave the online game?', { ok: 'Leave', danger: true, body: two ? 'The game ends, and the other player wins.' : 'The computer takes your seat, and the others play on.' }).then(ok => { if (ok) TurnNet.leave(); });
  }

  // ═══ The end ═══
  // The game's history and what it earns are kept on each person's own device, once for each game
  function recorded(key) { return lsJ(REC, []).indexOf(key) >= 0; }
  function markRec(key) { const l = lsJ(REC, []); l.push(key); lsP(REC, l.slice(-40)); }
  function recKey(code, g, s) { return code + ':' + g.started + ':' + s; }
  function endGame() {
    const { G: g } = H.get(), me = L.seat;
    H.setBusy(false); H.render();
    const key = recKey(L.code, g, me);
    if (me >= 0 && !g.players[me].cpu && !recorded(key)) { markRec(key); try { H.record(); } catch (e) { console.warn('[arvela net] record', e); } }
    setTimeout(() => { if (H.get().G === g) H.showWin(false); }, 400);
  }
  // someone left while the decks were being chosen: the game never began
  function earlyEnd(st) {
    const o = st.over, me = L.seat, nm = st.pl[o.left].name;
    UI.app.className = 'stage'; UI.app.innerHTML = '';
    Kit.win({ icon: 'users', title: o.left === me ? 'You left the table' : nm + ' left the table', sub: 'The game ended before it began.', again: () => TurnNet.leave(), againLabel: 'Back to the game’s setup' });
  }
  // The results card at the table: whose win it is from where you sit, Play again at the same table, and the way out
  function winOpts(o) {
    const { G: g } = H.get(); if (!g || g.mode !== 'net') return o;
    const S = g.S, w = S.winner, me = L.seat, T = g.teams;
    const ours = w >= 0 && me >= 0 && (T ? E.ally(S, me, w) : w === me);
    if (w >= 0 && me >= 0) {
      o.lose = !ours; o.icon = ours ? 'trophy' : 'users';
      if (ours) o.title = T ? 'Your team wins!' : 'You win!';
      if (ours && !T && TXG[S.P[w].guide]) o.sub = (TXG[S.P[w].guide].n + ' was your Guide').replace(/'/g, '’');
    }
    if (S.how === 'left' && g.left != null) {
      const nm = g.players[g.left].name;
      o.notes = [(nm + ' left the game, so ' + (ours ? 'you win.' : g.players[w].name + ' wins.')).replace(/'/g, '’')];
      o.sub = 'In round ' + S.round;
    }
    o.again = () => { if (L.net) L.net.again(); }; o.againLabel = 'Play again';
    o.setup = () => TurnNet.leave(); o.setupLabel = 'Leave the table';
    const R = g.rew && g.rew.list && window.AnoriaPacks ? g.rew.list : null;
    if (R && R.length && o.extra && o.extra.length) { const lb = o.extra[0].label; o.extra = [{ label: lb, onClick: () => { window.AnoriaPacks.earned(R, () => { if (L.st) load(L.st); else H.showSetup(); }); } }]; }
    return o;
  }
  // A game that ended while this device was away: its history and its rewards are kept here the next time the page
  // opens, so nobody misses what a game earned by not looking at its end
  function catchUp() {
    const st0 = TurnNet._store ? TurnNet._store() : null; if (!st0) return;
    const codes = lsJ('tn_mine_' + KEY, []).concat(lsJ('anoria_net_tables', [])).filter((c, i, a) => typeof c === 'string' && a.indexOf(c) === i).slice(0, 12);
    const dev = window.Online && Online.dev ? Online.dev() : lsJ('tn_dev', '');
    codes.forEach(code => {
      st0.get(code).then(d => {
        if (!d || d.game !== KEY || d.status !== 'over' || !d.st) return;
        const s = (d.seats || []).findIndex(x => x && !x.bot && x.dev === dev); if (s < 0) return;
        let st = null; try { st = JSON.parse(d.st); } catch (e) { return; }
        if (!st || !st.G || !st.G.over || st.G.players[s].cpu) return;
        const g = unpack(st.G), key = recKey(code, g, s); if (recorded(key)) return;
        if (L.code === code) return;   // (at that table now: its own end records it)
        markRec(key);
        const was = { seat: L.seat };
        L.seat = s; H.attach(DRV);
        try { H.swap(g, () => H.record()); } catch (e) {}
        L.seat = was.seat; if (!L.code) H.attach(null);
        if (UI.hubRefresh) UI.hubRefresh();
      }).catch(() => {});
    });
  }
  function remember(code) { const l = lsJ('anoria_net_tables', []).filter(c => c !== code); l.unshift(code); lsP('anoria_net_tables', l.slice(0, 12)); }

  // ═══ The table's settings, from the game's own setup ═══
  const setupSaved = () => lsJ('gn_setup_anoria', {}) || {};
  const seatsWanted = () => { const n = +setupSaved().count || 2; return Math.max(2, Math.min(6, n)); };
  function opts() {
    const sv = setupSaved(), op = sv.options || {}, n = seatsWanted();
    const d = Coll.deck(H.deckChoice(op.deck0, 'me')) || Coll.deck(H.starterId());
    let mat = null; try { mat = localStorage.getItem(H.matKey); } catch (e) {}
    const host = d ? { n: d.n, id: d.id, guide: d.guide, cards: d.cards.slice(), stack: H.stackOf({ deckId: d.id, deck: d.n, cpu: false }), built: !!d.built, mat: mat } : null;
    return { n: n, teams: (n === 4 || n === 6) ? H.teamsFor(n, op.teams) || null : null, lv: H.LEVEL[op.level] ? op.level : 'normal', d: host };
  }
  function start(players, o, last) {
    o = o || {};
    const st = { v: 1, mi: 0, seed: (Math.random() * 4294967296) >>> 0, lv: o.lv || 'normal', teams: null, ph: 'decks', G: null,
      pl: players.map(p => ({ name: p.name, cpu: !!p.bot, d: null })) };
    const N = st.pl.length;
    if (o.teams && o.teams.every(t => t.every(x => x < N)) && (N === 4 || N === 6)) st.teams = o.teams;
    if (last && last.pl && last.pl.length === N) st.pl.forEach((p, i) => { p.d = last.pl[i].d || null; if (last.pl[i].cpu) p.cpu = true; });
    else if (o.d) st.pl[0].d = deckOk(o.d);
    const R = E.rng((st.seed ^ 0x2545f491) >>> 0);
    st.pl.forEach(p => { if (p.cpu && !p.d) p.d = robotDeck(st, R); });
    if (st.pl.every(p => p.d)) { st.G = pack(buildGame(st)); st.ph = 'game'; }
    return st;
  }
  function leave() {
    H.attach(null); L.st = null; L.q = []; L.net = null; L.seat = -1; L.code = null;
    document.querySelectorAll('.k-win').forEach(n => n.remove());
    H.stop(); H.resume();
  }

  const CFG = {
    game: KEY, title: 'Arvela', min: 2, get max() { return seatsWanted(); }, botMs: 1300,
    seats: (n, o) => Math.max(n, (o && o.n) || seatsWanted()),
    opts: opts, start: start, turn: turnOf, over: overOf, bot: bot, resign: resign,
    leaveNote: st => (st && st.pl && st.pl.length === 2 ? 'The game ends, and the other player wins.' : 'The computer takes your seat, and the others play on.'),
    show: (net, info) => { if (net.code) remember(net.code); show(net, info); },
    leave: leave
  };
  TurnNet.setup(CFG);
  setTimeout(catchUp, 2500);

  // for tests: the move maker and the table's state as this device has it
  window.__anoriaNet = { step: step, turn: turnOf, over: overOf, bot: bot, start: start, L: L, send: send, after: after };
})();
