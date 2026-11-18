// ═══════════════════════════════════════════════════════════════════════════
// Mexican Train: the table, inside games/dominoes.html (the Game choice in Dominoes' setup). The rules are
// games/mexicantrain-core.js (MTCore); this file draws them and takes the player's moves.
//
// window.MTUI (called by dominoes.html):
//   init({app, showSetup, levels, lvName})     once, before anything else
//   start({mode, players, options})            a new game from the setup (players [{name, cpu, level, color}])
//   resume() -> bool                           the saved game on this device, if there is one
//   active() / stop() / undo() / clearSave() / rules()
//   net: {opts(o), start, turn, over, bot, show, leave}   the online table (TurnNet), dispatched to by the page
//
// The table: a wooden hub in the middle with the engine, and every train running out from it as a lane of real
// tiles: each player's own train in their seat color with their avatar at its head, the Mexican Train on a rail
// track with the gold engine at its head. A marker (a little engine in the owner's color) stands at the head of a
// train that is open to everyone. A long train pushes together toward the hub as it grows (each tile under the next
// one shows only the half nearest the hub, which is all a train needs: the next tile's near end repeats it), so the
// open end is always the farthest out, at full size. Lanes run down the table when it is taller than wide and across
// it when it is wider; with many players on a tall table the lanes run both ways out of a hub in the middle.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var C = window.MTCore, el = Kit.el;
  var SAVE = 'dominoes_mt', KEY = 'dominoes', NETREC_KEY = 'dominoes_mt_netrec';
  var PIP = ['', '#2a8fd6', '#2f9e44', '#d63a2f', '#8b5a2b', '#283593', '#c99a06', '#8e3fb0', '#11807f', '#c2185b', '#e8710a', '#546e7a', '#1c1c1c'];
  var NUMW = C.NUMW;
  var H = {}, app = null, S = null, tok = 0, busy = false, sel = -1, SPD = 1, undoSnap = null, handing = false;
  var NET = null, NETQ = [], NETBUSY = false, NETFLY = null, NETWIN = null;
  var showPrev = false;   // the table as the last round ended (its result is being shown)

  function save() {
    if (!S || NET) return;
    try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {}
    if (S.phase !== 'over') Kit.resume.set('Mexican Train · Round ' + (S.round + 1) + ' of ' + S.R, { keys: [SAVE] });
  }
  function clearSave() { try { localStorage.removeItem(SAVE); } catch (e) {} }
  function later(fn, ms) { var t = tok; setTimeout(function () { if (t === tok && S) fn(); }, Math.max(0, ms * SPD)); }
  // who(i) is how the table speaks of a seat ("You" for the person holding the device); nm(i) is the name the record keeps
  function nm(i) { return S.players[i].name; }
  function who(i) { return you(i) ? 'You' : S.players[i].name; }
  function isBot(i) { return NET ? !!(NET.seats[i] && NET.seats[i].bot) : !!S.players[i].cpu; }
  function humans() { return S.players.filter(function (p, i) { return !isBot(i); }).length; }
  function firstHuman() { for (var i = 0; i < S.n; i++) if (!S.players[i].cpu) return i; return 0; }
  function you(i) { return S.players[i].name === 'You' || (!isBot(i) && i === viewer() && (!!NET || humans() === 1)); }
  function you0(i) { return S.players[i].name === 'You'; }
  function verb(i, a, b) { return you(i) ? a : b; }   // ("You draw" / "Pete draws")
  function dname(v) { return 'double ' + NUMW[v]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function mex() { return S.n; }
  function trainName(tr, owner) {
    if (tr === mex()) return 'the Mexican Train';
    if (owner != null && tr === owner) return verb(owner, 'your own train', 'their own train');
    return you(tr) ? 'your train' : Kit.poss(nm(tr)) + ' train';
  }
  // the seat whose tiles show in the rack (-1: hidden, between people passing the device)
  function viewer() {
    if (NET) return NET.seat;
    if (S.viewer != null && S.viewer >= 0) return S.viewer;
    if (S.viewer === -1 && humans() > 1) return -1;
    return firstHuman();
  }
  function rackSeat() { var v = viewer(); return v >= 0 ? v : (humans() > 1 ? S.cur : firstHuman()); }

  // ═════════════════════════════════════════════════════════════════════════
  // Start, resume, stop
  // ═════════════════════════════════════════════════════════════════════════
  function init(o) { H = o || {}; app = o.app; }
  function start(cfg) {
    tok++; NET = null; sel = -1; undoSnap = null; busy = false; showPrev = false;
    var o = cfg.options || {};
    S = C.newGame(cfg.players.map(function (p, i) { return { name: p.name, cpu: !!p.cpu, level: p.cpu ? H.lvName(p.level || o.level) : undefined, color: p.color || Kit.color(i) }; }),
      { first: o.mtfirst, dbl: o.mtdbl, rounds: o.mtrounds });
    S.mode = cfg.mode; S.started = Date.now(); S.viewer = humans() > 1 ? -1 : firstHuman();
    Kit.gameStart();
    build(); save();
    dealShow(function () { step(); });
  }
  function resume() {
    var sv = null; try { sv = JSON.parse(localStorage.getItem(SAVE)); } catch (e) {}
    if (!sv || !sv.mt || !sv.players || sv.phase === 'over') return false;
    tok++; S = sv; NET = null; sel = -1; undoSnap = null; busy = false; showPrev = false;
    if (humans() > 1) S.viewer = -1;
    build(); paint(); step();
    return true;
  }
  function active() { return !!S && !!app && app.classList.contains('mtapp'); }
  function stop() { tok++; S = null; busy = false; sel = -1; if (app) app.classList.remove('mtapp'); closeSheets(); }
  function undo() {
    if (NET) { Kit.toast('Tiles can’t be taken back online'); return; }
    if (!S || S.phase === 'over') return Kit.toast('Nothing to undo');
    if (!undoSnap || busy) return Kit.toast('Nothing to undo');
    tok++; busy = false; handing = false;
    S = JSON.parse(undoSnap); undoSnap = null; sel = -1;
    Kit.sfx('whoosh'); Kit.toast('Tile taken back');
    save(); paint(); step();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // The flow: whose move, the computer's moves, passing the device
  // ═════════════════════════════════════════════════════════════════════════
  function step() {
    if (!S || NET || S.phase !== 'play' || busy) { if (S && !NET && S.phase === 'over' && !busy) finish(); return; }
    var p = S.cur;
    if (isBot(p)) { paint(); later(botAct, 650); return; }
    if (humans() > 1 && S.viewer !== p) { if (undoSnap && S.viewer >= 0) later(handoff, 900); else handoff(); return; }
    paint();
  }
  function botAct() {
    if (!S || NET || S.phase !== 'play' || busy || !isBot(S.cur)) return;
    var p = S.cur, mv = C.botMove(S, p);
    act(p, mv);
  }
  function handoff() {
    if (handing || !S || S.phase !== 'play' || isBot(S.cur) || S.viewer === S.cur) return;
    handing = true; S.viewer = -1; undoSnap = null; save(); paint();
    var t = tok, i = S.cur, p = S.players[i];
    Kit.handoff({ name: p.name, color: p.color, what: 'tiles', msg: S.lastSay || '' }).then(function () {
      handing = false;
      if (t !== tok || !S || S.cur !== i || S.phase !== 'play') return;
      S.viewer = i; save(); paint({ fresh: true });
    });
  }
  // a move on this device: made in the rules, then played back on the table
  function act(p, mv) {
    if (!S || busy) return false;
    var from = mv.k === 'play' ? srcRect(p, mv.id) : null;
    var before = !isBot(p) && mv.k !== 'draw' ? JSON.stringify(S) : null;
    var ev = C.apply(S, p, mv);
    if (!ev) return false;
    if (mv.k === 'draw' || isBot(p)) undoSnap = null; else undoSnap = before;
    if (ev.some(function (e) { return e.e === 'round'; })) undoSnap = null;
    sel = -1; save();
    playback(ev, { from: from }, step);
    return true;
  }
  function myTurn() {
    if (!S || S.phase !== 'play' || busy || showPrev) return false;
    if (NET) return !NETBUSY && NET.myTurn() && S.cur === NET.seat;
    return !isBot(S.cur) && S.viewer === S.cur;
  }
  // a move by the person holding the device
  function you2(mv) {
    if (!myTurn()) return;
    if (NET) {
      if (mv.k === 'play') NETFLY = srcRect(S.cur, mv.id);
      busy = true; sel = -1; paint();
      var seat = NET.seat;
      NET.act(function (st) { var ev = C.apply(st, seat, mv); return ev ? { state: st, mv: { p: seat, ev: ev } } : null; })
        .then(function (ok) { if (!ok) { busy = false; if (S) paint(); } });
      return;
    }
    act(S.cur, mv);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Playing the events back: motion, sound, haptics and the moments
  // ═════════════════════════════════════════════════════════════════════════
  function playback(ev, o, done) {
    busy = true; o = o || {};
    var i = 0, t = tok;
    function nx() {
      if (t !== tok) return;
      if (i >= ev.length) { busy = false; paint(); done && done(); return; }
      var e = ev[i++];
      one(e, o, nx);
    }
    nx();
  }
  function one(e, o, nx) {
    var mine = viewer() >= 0 && e.p === viewer();
    if (e.e === 'play') {
      var P = S.players[e.p];
      S.lastSay = who(e.p) + ' played the ' + C.tname(e.t) + ' on ' + trainName(e.tr, e.p) + '.';
      paint({ fly: { id: e.id, from: o.from || plateRect(e.p), bot: isBot(e.p) } });
      o.from = null;
      later(function () {
        clack(); Kit.haptic(mine ? 'medium' : 'light'); bump(e.tr);
        if (e.cover) { lanePulse(e.tr, 'cover'); Kit.sfx('good'); say(e.p, 'Covered'); if (mine || e.waited > S.n) { Kit.callout(e.waited > S.n ? 'Double covered at last' : 'Double covered', P.color); } }
        else if (e.dbl) { Kit.sfx('pop'); say(e.p, 'Double!'); lanePulse(e.tr, 'dbl'); }
        if (e.first && !e.dbl) {
          if (mine) { Kit.moment({ title: 'All aboard', line: 'Your train has left the station.', icon: 'flag', color: P.color, at: tblEl, ms: 1500 }); Kit.sfx('sparkle'); }
          else say(e.p, 'Train started');
          lanePulse(e.tr, 'start');
        }
        if (e.mex) { Kit.callout('The Mexican Train is rolling', P.color); Kit.sfx('sparkle'); lanePulse(e.tr, 'start'); }
        if (e.off && mine) say(e.p, 'Train closed');
      }, 430);
      later(nx, e.cover && e.waited > S.n ? 900 : e.first || e.mex ? 800 : isBot(e.p) ? 560 : 500);
      return;
    }
    if (e.e === 'draw') {
      var from = boneRect(), seen = mine && !NET ? true : mine;
      paint({ hideId: seen ? e.id : -1 });
      Kit.sfx('flip');
      flyBack(from, seen ? rackRect(e.id) : plateRect(e.p), function () {
        paint({ flipId: seen ? e.id : -1 });
        if (!e.fits) say(e.p, 'Drew');
        later(nx, 220);
      });
      return;
    }
    if (e.e === 'pass') {
      S.lastSay = who(e.p) + (e.on ? ' couldn’t play and put out ' + (you(e.p) ? 'your' : 'a') + ' marker.' : ' passed.');
      paint({ markerDrop: e.on ? e.p : -1 });
      say(e.p, 'Pass'); Kit.sfx('tap'); if (e.on) Kit.haptic(mine ? 'heavy' : 'light');
      later(nx, 650);
      return;
    }
    if (e.e === 'runEnd') { if (e.n >= 4) { say(e.p, e.n + ' in a row'); if (e.n >= (S.n <= 5 ? 10 : 8)) { Kit.moment({ title: 'Express', line: who(e.p) + ' laid ' + e.n + ' tiles on ' + verb(e.p, 'your', 'their') + ' own train in one turn.', chip: String(e.n), color: S.players[e.p].color, tone: isBot(e.p) && humans() ? 'bad' : '', at: tblEl, ms: 1800 }); Kit.sfx('sparkle'); later(nx, 1300); return; } } nx(); return; }
    if (e.e === 'turn') { nx(); return; }
    if (e.e === 'block') { Kit.callout('Blocked!'); Kit.sfx('bad'); later(nx, 900); return; }
    if (e.e === 'round') { roundEnd(e.res, nx); return; }
    if (e.e === 'deal') { dealShow(nx); return; }
    if (e.e === 'over') { nx(); return; }
    nx();
  }
  // the round is over: the table as it ended, going out, the count, the sheet
  function roundEnd(r, nx) {
    showPrev = true; paint();
    var w = r.w, bad = function (i) { return isBot(i) && humans() > 0 && !(NET && i === NET.seat); };
    var vw = viewer();
    var delay = 0;
    if (r.k === 'out') {
      var P = S.players[w];
      Kit.callout('Domino!', P.color); Kit.sfx(bad(w) ? 'bad' : 'good'); Kit.haptic('success');
      if (!bad(w) && (vw < 0 || vw === w || !NET)) Kit.confetti({ count: 100 });
      delay = 1200;
      // the round won with nothing left: the others' dots counted up
      later(function () {
        // the others' dots, fewest first: "Jamie is left with 4 dots, Pete with 12 and Pam with 30."
        var rest = r.pips.map(function (x, i) { return { i: i, x: x }; }).filter(function (o) { return o.i !== w; }).sort(function (a, b) { return a.x - b.x; });
        function dt(x) { return x + (x === 1 ? ' dot' : ' dots'); }
        var line = r.firstOut ? who(w) + ' went out on ' + verb(w, 'your', 'their') + ' very first turn.'
          : rest.length > 3 ? 'The other ' + rest.length + ' players are left with ' + rest[0].x + ' to ' + dt(rest[rest.length - 1].x) + '.'
          : rest.map(function (o, k) { return k ? who(o.i) + ' with ' + o.x : who(o.i) + ' ' + verb(o.i, 'are', 'is') + ' left with ' + dt(o.x); }).join(', ').replace(/, ([^,]*)$/, rest.length > 1 ? ' and $1' : ', $1') + '.';
        Kit.moment({ big: !!r.firstOut, title: 'Round ' + (r.round + 1) + ' won with 0', line: line, pts: '0', color: P.color, tone: bad(w) ? 'bad' : '', at: tblEl, ms: 2000 });
      }, 900);
      delay = 3000;
    } else { delay = 900; }
    if (r.blank != null) {
      var bi = r.blank;
      later(function () {
        Kit.moment({ title: 'Caught with the double blank', line: (you(bi) ? 'You were' : who(bi) + ' was') + ' still holding the double blank, and it counts 50.', pts: '+50', color: S.players[bi].color, tone: bad(bi) ? '' : 'bad', at: tblEl, ms: 2000 });
        Kit.sfx(bad(bi) ? 'good' : 'bad'); Kit.haptic(bad(bi) ? 'light' : 'heavy');
      }, delay);
      delay += 2300;
    }
    later(function () { roundSheet(r, function () { showPrev = false; nx(); }); }, delay);
  }
  var sheetH = null, sheetGo = null, sheetKeep = { v: false };
  function closeSheets() { mCount = null; if (sheetH) { try { sheetH.close(); } catch (e) {} sheetH = null; } if (NETWIN) { try { NETWIN.close(); } catch (e) {} NETWIN = null; } }
  function roundSheet(r, go) {
    if (mdkSet()) { deskRound(r, go); return; }   // (a large window: the count is written beside the table, nothing covers it)
    var P = S.prev, last = S.phase === 'over' && S.prev && S.prev.round === S.R - 1;
    var box = el('div', { class: 'mt-res' });
    var head = r.k === 'out' ? '<b>' + Kit.esc(who(r.w)) + '</b> ' + verb(r.w, 'went', 'went') + ' out.' : r.w >= 0 ? 'Nobody could play. <b>' + Kit.esc(who(r.w)) + '</b> had the fewest dots.' : 'Nobody could play.';
    box.appendChild(el('p', { class: 'head', html: head }));
    var order = S.players.map(function (p, i) { return i; }).sort(function (a, b) { return r.pips[a] - r.pips[b] || a - b; });
    var tb = el('div', { class: 'mt-rrows' });
    order.forEach(function (i) {
      var p = S.players[i], h = P.hands[i], tl = el('div', { class: 'tl' });
      if (!h.length) tl.appendChild(el('em', { text: 'Out' }));
      h.forEach(function (t) { tl.appendChild(tileEl(t[0], t[1], 'lie')); });
      tb.appendChild(el('div', { class: 'row' + (i === r.w ? ' won' : '') }, [
        el('div', { class: 'nm', style: { '--c': p.color } }, [el('i'), el('span', { text: p.name })]), tl,
        el('div', { class: 'pp' }, [el('b', { text: '+' + r.pips[i] }), el('small', { text: 'Total ' + P.scores[i] })])
      ]));
    });
    box.appendChild(tb);
    box.appendChild(el('p', { class: 'muted foot', text: last ? 'That was the last round. The lowest total wins.' : 'Lowest total after ' + S.R + ' rounds wins. Next round, the engine is the ' + dname(12 - r.round - 1) + '.' }));
    var t = tok, gone = false;
    function proceed() { sheetH = null; sheetGo = null; if (gone || t !== tok) return; gone = true; go(); }
    var label = last ? 'See the results' : 'Next round';
    var keep = sheetKeep = { v: false };   // (v: the window grew to a desk, and the count moved beside the table)
    sheetGo = { r: r, go: go };
    sheetH = Kit.sheet({ title: 'Round ' + (r.round + 1) + ' of ' + S.R, node: box, actions: [{ label: label, primary: true, onClick: proceed }], onClose: function () { if (keep.v) return; setTimeout(proceed, 0); } });
    if (!humans() || (NET && NET.seat < 0)) later(function () { if (sheetH) sheetH.close(); }, 2200);
  }
  // a new round: the engine goes into the hub and the tiles are dealt
  function dealShow(nx) {
    showPrev = false;
    if (!NET && humans() > 1) S.viewer = -1;
    build(); paint({ deal: true });
    Kit.sfx('deal'); later(function () { Kit.sfx('deal'); }, 180);
    Kit.callout('Round ' + (S.round + 1) + ': the ' + dname(S.eng));
    S.lastSay = '';
    later(nx, 1100);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // The end: the record and the results card
  // ═════════════════════════════════════════════════════════════════════════
  function highlights() {
    var hl = [], X = S.hl, st = C.standings(S), w = st[0];
    var zeros = Object.keys(X.outs).map(function (i) { return { p: +i, n: X.outs[i] }; }).sort(function (a, b) { return b.n - a.n; });
    if (zeros.length && zeros[0].n >= 3) hl.push(nm(zeros[0].p) + ' went out in ' + zeros[0].n + ' of the ' + S.R + ' rounds');
    (X.first1 || []).slice(0, 2).forEach(function (f) { hl.push(nm(f.p) + ' went out on the first turn of round ' + (f.round + 1)); });
    // (only the rarer ones: about the longest one game in ten has, by the sim; most games have a run of 5 and a train
    // of 10, which isn't news)
    if (X.run && X.run.n >= (S.n <= 5 ? 13 : 10)) hl.push(nm(X.run.p) + ' laid ' + X.run.n + ' tiles on ' + (you0(X.run.p) ? 'your' : 'their') + ' own train in one turn in round ' + (X.run.round + 1));
    if (X.long && X.long.n >= Math.round(14 + 60 / S.n)) hl.push(Kit.poss(nm(X.long.p)) + ' own train ran to ' + X.long.n + ' tiles in round ' + (X.long.round + 1));
    (X.blank || []).slice(0, 2).forEach(function (b) { hl.push(nm(b.p) + ' ' + (you0(b.p) ? 'were' : 'was') + ' caught with the double blank in round ' + (b.round + 1)); });
    if (X.bigLoss && X.bigLoss.n >= 100 + Math.round(180 / S.n)) hl.push(nm(X.bigLoss.p) + ' took ' + X.bigLoss.n + ' dots in round ' + (X.bigLoss.round + 1));
    return hl;
  }
  function modeName() {
    return 'Mexican Train, ' + S.R + ' rounds, ' + S.n + ' players' + (S.o.first === 'run' ? ', a train on the first turn' : '') + (S.o.dbl === 'open' ? ', doubles covered later' : '') +
      (NET ? ', online' : S.mode === 'cpu' ? ', vs computer' : S.players.some(function (p) { return p.cpu; }) ? ', with computers' : '');
  }
  function record() {
    var st = C.standings(S), wins = C.winners(S), wname = wins.map(nm).join(' & ');
    var hl = highlights();
    var spm = specials();
    spm.forEach(function (x) { hl.unshift(x.h); });
    hl.unshift(wname + ' won with ' + S.scores[wins[0]] + (S.scores[wins[0]] === 1 ? ' dot' : ' dots') + ', ' + st.filter(function (x) { return wins.indexOf(x.p) < 0; }).map(function (x) { return nm(x.p) + ' ' + x.s; }).join(', '));
    Kit.record(KEY, {
      started: S.started, mode: modeName(), lowWins: true,
      players: S.players.map(function (p, i) { return { name: p.name, score: S.scores[i], cpu: isBot(i) }; }),
      winner: wins.length === 1 ? nm(wins[0]) : null,
      summary: (wins.length === 1 ? wname + ' won' : wname + ' tied') + ' · Mexican Train',
      rounds: { labels: S.rr.map(function (r, i) { return 'Double ' + (12 - i); }), scores: S.rr.map(function (r) { return r.slice(); }) },
      highlights: hl.slice(0, 8), detail: C.detail(S)
    });
    return spm;
  }
  // the rarer match wins: a clean sweep of the rounds, a comeback from far behind
  function specials() {
    var wins = C.winners(S), w = wins[0], out = [];
    if (wins.length !== 1) return out;
    var allZero = S.rr.every(function (r) { return r[w] === 0; });
    var run = S.scores.map(function () { return 0; }), behind = 0;
    S.rr.forEach(function (r) { r.forEach(function (v, k) { run[k] += v; }); var best = Math.min.apply(null, run.filter(function (x, k) { return k !== w; })); behind = Math.max(behind, run[w] - best); });
    if (allZero) out.push({ t: 'Clean sweep', l: who(w) + ' went out in every round and finished with 0.', h: nm(w) + ' went out in every round' });
    else if (behind >= 60) out.push({ t: 'Comeback', l: who(w) + ' ' + verb(w, 'were', 'was') + ' ' + behind + ' dots behind and still won.', h: nm(w) + ' came back from ' + behind + ' dots behind' });
    return out;
  }
  function finish() {
    if (!S || S.phase !== 'over') return;
    var st = C.standings(S), wins = C.winners(S), me = viewer();
    var spm = [];
    var recKey = NET ? NET.code + ':' + S.started : null, recs = {};
    if (NET) { try { recs = JSON.parse(localStorage.getItem(NETREC_KEY) || '{}') || {}; } catch (e) {} }
    if (!NET) { spm = record(); clearSave(); }
    else if (NET.seat >= 0 && !recs[recKey]) { recs[recKey] = Date.now(); try { localStorage.setItem(NETREC_KEY, JSON.stringify(recs)); } catch (e) {} spm = record(); }
    else spm = specials();
    tok++;
    var lose = NET ? wins.indexOf(NET.seat) < 0 : humans() > 0 && !wins.some(function (i) { return !isBot(i); });
    var rank = st.map(function (x) { return { name: nm(x.p), score: x.s, color: S.players[x.p].color, cpu: isBot(x.p), me: NET ? x.p === NET.seat : humans() === 1 && !isBot(x.p) }; });
    var wname = wins.map(nm).join(' & ');
    var title = wins.length > 1 ? 'A tie: ' + wname : wins[0] === me && (NET || humans() === 1) ? 'You win!' : you(wins[0]) ? 'You win!' : wname + ' wins!';
    var sub = 'Mexican Train, ' + S.R + ' rounds · The lowest total wins';
    var t0 = tok;
    if (spm.length) {
      Kit.moment({ big: true, title: spm[0].t, line: spm[0].l, icon: lose ? 'bot' : 'trophy', tone: lose ? 'bad' : '', at: tblEl, ms: 2300 });
      Kit.sfx(lose ? 'lose' : 'sparkle'); Kit.haptic(lose ? 'heavy' : 'success');
    }
    var again = NET ? null : { mode: S.mode, players: S.players.map(function (p) { return { name: p.name, cpu: p.cpu, level: p.level, color: p.color }; }), options: { mtfirst: S.o.first, mtdbl: S.o.dbl, mtrounds: S.R } };
    setTimeout(function () {
      if (t0 !== tok) return;
      var res = NET && NET.result, left = res && res.left != null;
      NETWIN = Kit.win({
        icon: lose ? 'bot' : 'trophy', title: left ? res.text : title, sub: sub, rank: rank, lose: lose && !left,
        againLabel: NET && left ? 'Back to the lobby' : 'Play again',
        again: function () { if (NET) { if (left) { TurnNet.leave(); TurnNet.open(); } else NET.again(); } else start(again); },
        look: 'Look at the table',
        setup: NET ? null : function () { stop(); clearSave(); H.showSetup(); }
      });
    }, spm.length ? 2500 : 300);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Tiles: a double-12 tile, ivory with colored pips (each number its own color, as a double-12 set has them)
  // ═════════════════════════════════════════════════════════════════════════
  // pip spots as [x%, y%] for 0 to 12, on a square half
  var A3 = [25, 50, 75], SP = (function () {
    function g(list) { return list.map(function (k) { return [A3[k % 3], A3[Math.floor(k / 3)]]; }); }
    var c4x = [22, 50, 78], c4y = [17, 39, 61, 83];
    function c4(cols) { var o = []; cols.forEach(function (rows, ci) { rows.forEach(function (y) { o.push([c4x[ci], y]); }); }); return o; }
    return [[], g([4]), g([2, 6]), g([2, 4, 6]), g([0, 2, 6, 8]), g([0, 2, 4, 6, 8]), g([0, 3, 6, 2, 5, 8]), g([0, 3, 6, 2, 5, 8, 4]), g([0, 1, 2, 3, 5, 6, 7, 8]), g([0, 1, 2, 3, 4, 5, 6, 7, 8]),
      c4([c4y, [39, 61], c4y]), c4([c4y, [28, 50, 72], c4y]), c4([c4y, c4y, c4y])];
  })();
  function halfEl(v) {
    var h = el('div', { class: 'hf' + (v >= 10 ? ' sm' : '') });
    SP[v].forEach(function (p) { h.appendChild(el('i', { style: { left: p[0] + '%', top: p[1] + '%', 'background-color': PIP[v] } })); });
    return h;
  }
  function tileEl(a, b, cls) {
    var d = el('div', { class: 'mtt' + (cls ? ' ' + cls : '') });
    d.appendChild(halfEl(a)); d.appendChild(halfEl(b)); d.appendChild(el('b', { class: 'pin' }));
    d.setAttribute('aria-label', a === b ? cap(dname(a)) : a + ' and ' + b);
    return d;
  }
  function backEl(cls) { var d = el('div', { class: 'mtt back' + (cls ? ' ' + cls : '') }); d.appendChild(el('b', { class: 'pin' })); d.setAttribute('aria-label', 'Face-down tile'); return d; }
  // the marker: a little engine in the owner's color (the Mexican Train's is gold)
  function engineSvg(col, big) {
    return '<svg viewBox="0 0 40 30" aria-hidden="true"><g stroke="rgba(0,0,0,.55)" stroke-width="1.2" stroke-linejoin="round">' +
      '<path d="M5 22V12h4V7h10v5h7l6-5h3v15z" fill="' + col + '"/>' +
      '<rect x="21" y="3" width="4" height="9" rx="1" fill="' + col + '"/>' +
      '<path d="M10 9h6v4h-6z" fill="rgba(255,255,255,.75)"/>' +
      '<path d="M35 22l3 4H2l3-4z" fill="#2b2b2b"/></g>' +
      '<g fill="#1b1b1b" stroke="' + (big ? '#ffe486' : 'rgba(255,255,255,.65)') + '" stroke-width="1.3"><circle cx="11" cy="24" r="3.4"/><circle cx="20" cy="24" r="3.4"/><circle cx="29" cy="24" r="3.4"/></g>' +
      '<path d="M7 13.5h28" stroke="rgba(255,255,255,.35)" stroke-width="1"/></svg>';
  }

  // ═════════════════════════════════════════════════════════════════════════
  // The page
  // ═════════════════════════════════════════════════════════════════════════
  var W_, whoEl, tblEl, feltEl, railEl, hubEl, lanesEl, layerEl, boneEl, rndEl, statusEl, msgEl, actsEl, rackEl, engEl;
  var nodes = {}, plates = {};
  function build() {
    if (!app) return;
    if (W_ && W_.isConnected && app.classList.contains('mtapp')) return;
    app.innerHTML = ''; app.className = 'stage mtapp'; nodes = {}; plates = {};
    W_ = el('div', { class: 'mtw' });
    whoEl = el('div', { class: 'mt-who', style: { 'view-transition-name': 'mt-who' } });
    tblEl = el('div', { class: 'mt-tbl wood', style: { 'view-transition-name': 'mt-table' } });
    feltEl = el('div', { class: 'felt-in' });
    railEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); railEl.setAttribute('class', 'mt-rails');
    hubEl = el('div', { class: 'mt-hub' });
    lanesEl = el('div', { class: 'mt-lanes' });
    layerEl = el('div', { class: 'mt-layer' });
    rndEl = el('div', { class: 'mt-plq mt-rnd' });
    boneEl = el('button', { type: 'button', class: 'mt-plq mt-bone', 'aria-label': 'Boneyard', onclick: function () { if (myTurn() && C.canDraw(S)) you2({ k: 'draw' }); } });
    feltEl.appendChild(railEl); feltEl.appendChild(lanesEl); feltEl.appendChild(hubEl); feltEl.appendChild(layerEl); feltEl.appendChild(rndEl); feltEl.appendChild(boneEl);
    feltEl.addEventListener('click', function (e) { if (!e.target.closest('.mt-lane.can, .mt-ghost, .mt-bone') && sel >= 0) { sel = -1; paint(); } });
    tblEl.appendChild(feltEl);
    statusEl = el('div', { class: 'mt-status', style: { 'view-transition-name': 'mt-status' } });
    msgEl = el('div', { class: 'mt-msg' }); actsEl = el('div', { class: 'mt-acts' });
    statusEl.appendChild(msgEl);
    rackEl = el('div', { class: 'mt-rack', style: { 'view-transition-name': 'mt-rack' } });
    W_.appendChild(whoEl); W_.appendChild(tblEl); W_.appendChild(statusEl); W_.appendChild(rackEl); W_.appendChild(actsEl);
    // (a large window: the rounds and the round in play, drawn only while a desk layout shows)
    ladEl = el('aside', { class: 'mdk-panel mdk-lad', 'aria-label': 'Rounds', style: { 'view-transition-name': 'mt-lad' } });
    sideEl = el('aside', { class: 'mdk-panel mdk-side', 'aria-label': 'This round', style: { 'view-transition-name': 'mt-side' } });
    W_.appendChild(ladEl); W_.appendChild(sideEl);
    MDK = null; mKey = ''; mOffKey = '';
    app.appendChild(W_);
    setBarH();
    // (names are fitted by measuring, so measure again once the fonts are in)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (S && W_ && W_.isConnected) paintWho(); });
  }
  function setBarH() { var b = document.querySelector('.gbar'); document.documentElement.style.setProperty('--barh', (b ? b.offsetHeight : 60) + 'px'); }
  function paint(o) {
    o = o || {};
    if (!S || !W_ || !W_.isConnected) return;
    W_.setAttribute('data-n', S.n);
    mdkSet();
    paintWho(); paintStatus(); paintRack(o); paintDesk(); mdkGive(o); paintTable(o);   // (the panels first: a counted round's panel takes its own height, and the table is laid out in what is left)
  }
  function V() {
    if (showPrev && S.prev) return { trains: S.prev.trains, hands: S.prev.hands, eng: S.prev.eng, round: S.prev.round, cur: -1, dbl: null, scores: S.prev.scores, prev: true };
    return { trains: S.trains, hands: S.hands, eng: S.eng, round: S.round, cur: S.phase === 'play' ? S.cur : -1, dbl: S.dbl, scores: S.scores };
  }

  // ── The players ──
  function paintWho() {
    var v = V(), me = viewer(), lo = Math.min.apply(null, v.scores);
    whoEl.innerHTML = ''; plates = {};
    var cols = MDK ? MDK.cols : S.n <= 4 ? S.n : Math.ceil(S.n / 2);
    whoEl.style.setProperty('--cols', cols); whoEl.classList.toggle('c4', cols >= 4 && !MDK);
    S.players.forEach(function (p, i) {
      var on = v.cur === i, h = v.hands[i].length;
      var av = isBot(i) ? el('span', { class: 'avatar sm', style: { '--c': p.color }, html: Kit.icon('bot') }) : Kit.avatar.el(p.name, 'sm', p.color);
      var q = el('div', { class: 'mt-pl' + (on ? ' on' : '') + (i === me ? ' me' : ''), style: { '--c': p.color } }, [
        av,
        el('div', { class: 'tx' }, [el('div', { class: 'nm', text: p.name }),
          el('div', { class: 'ln' }, [el('span', { class: 'ct', html: '<i></i>' + h }), el('b', { class: 'sc' + (v.scores[i] === lo && S.round > 0 ? ' lo' : ''), text: String(v.scores[i]) })])]),
        on && (isBot(i) || (NET && i !== NET.seat)) ? el('span', { class: 'think' }, [el('i'), el('i'), el('i')]) : null
      ]);
      q.title = p.name + ': ' + h + (h === 1 ? ' tile' : ' tiles') + ', ' + v.scores[i] + ' in all';
      plates[i] = q; whoEl.appendChild(q); bubble(i);
    });
    fitNames(whoEl.querySelectorAll('.mt-pl .nm'));
  }
  // a name that doesn't fit eases down in size, then goes to its first word ("Kathleen M." is "Kathleen")
  function fitNames(list) {
    [].forEach.call(list, function (n) {
      Kit.fitText(n, 0.72);
      if (n.scrollWidth > n.clientWidth + 1 && /\s/.test(n.textContent.trim())) { n.textContent = n.textContent.trim().split(/\s+/)[0]; Kit.fitText(n, 0.72); }
      if (n.scrollWidth > n.clientWidth + 1) Kit.fitText(n, 0.5);
    });
  }
  var bubbles = {};
  function say(i, text) { bubbles[i] = { text: text, t: Date.now() }; bubble(i); }
  function bubble(i) {
    var b = bubbles[i]; if (!b) return;
    var age = Date.now() - b.t; if (age > 1650) { delete bubbles[i]; return; }
    var host = plates[i]; if (!host) return;
    var old = host.querySelector('.say'); if (old) old.remove();
    var n = el('div', { class: 'say', text: b.text }); n.style.animationDelay = (-age) + 'ms';
    host.appendChild(n); setTimeout(function () { n.remove(); }, 1700 - age);
  }

  // ── Whose turn, what to do ──
  function paintStatus() {
    msgEl.innerHTML = ''; actsEl.innerHTML = '';
    var cur = S.players[S.cur], line = '', sub = '', col = cur.color;
    if (showPrev || S.phase === 'over') {
      var r = S.prev && S.prev.res;
      line = r && r.k === 'out' ? who(r.w) + ' went out' : 'Blocked';
      sub = S.phase === 'over' ? 'The game is over' : 'Counting the dots';
      if (r && r.w >= 0) col = S.players[r.w].color;
      // (a desk: the round is counted beside the table, and the way on is a button here)
      if (MDK && mCount) {
        sub = 'Lowest total after ' + S.R + ' rounds wins.';
        actsEl.appendChild(el('button', { type: 'button', class: 'btn btn-primary mdk-go', html: '<span>' + mCount.label + '</span>', onclick: mCount.go }));
      }
    } else if (isBot(S.cur) || (NET && S.cur !== NET.seat)) {
      line = isBot(S.cur) ? cur.name + ' is thinking' : Kit.poss(cur.name) + ' turn';
      sub = S.lastSay || '';
    } else if (!NET && S.viewer !== S.cur) {
      line = 'Pass to ' + cur.name; sub = 'Their tiles stay hidden until they hold the button';
    } else {
      var ms = C.legal(S), owed = S.dbl && S.o.dbl === 'cover';
      line = humans() === 1 || NET || you(S.cur) ? 'Your turn' : Kit.poss(cur.name) + ' turn';
      if (owed) sub = (S.dbl.p === S.cur && S.tn.need ? 'Cover your ' : 'Cover the ') + dname(S.trains[S.dbl.tr].t[S.trains[S.dbl.tr].t.length - 1][0]) + ' first';
      else if (S.tn.need) sub = 'You played a double, so play again';
      else if (S.tn.on) sub = 'Lay another on your train, or stop';
      else if (S.tn.run && !S.tn.n) sub = 'Your first turn: lay a train of your own';
      if (ms.length) {
        if (!sub) sub = sel >= 0 ? 'Tap a glowing train' : 'Tap a tile to play it';
      } else if (C.canDraw(S)) {
        sub = (owed ? 'Nothing covers the double. ' : 'Nothing fits. ') + 'Draw from the boneyard';
        actsEl.appendChild(btn('plus', 'Draw', function () { you2({ k: 'draw' }); }, true));
      } else if (C.canPass(S)) {
        sub = S.trains[S.cur].m ? 'Nothing fits, so you pass' : 'Nothing fits, so you pass and put out your marker';
        actsEl.appendChild(btn('right', 'Pass', function () { you2({ k: 'pass' }); }, true));
      }
      if (C.canDone(S)) actsEl.appendChild(btn('check', 'End turn', function () { you2({ k: 'done' }); }, !ms.length));
    }
    if (!NET && undoSnap && S.phase === 'play' && !busy && !showPrev && S.viewer >= 0 && !isBot(S.viewer)) {
      var ub = btn('undo', 'Undo', function () { undo(); }, false, 'btn-soft');
      ub.setAttribute('aria-label', 'Undo'); if (actsEl.children.length) ub.classList.add('ic');   // (beside another button: its icon alone on a narrow phone)
      actsEl.insertBefore(ub, actsEl.firstChild);
    }
    W_.classList.toggle('acts-on', !!actsEl.children.length);
    msgEl.style.setProperty('--c', col);
    msgEl.appendChild(el('span', { class: 'dot' }));
    msgEl.appendChild(el('span', null, [document.createTextNode(line), sub ? el('small', { text: sub }) : null]));
  }
  function sideways() { return innerWidth > innerHeight; }
  function btn(ic, label, fn, primary, cls) { return el('button', { type: 'button', class: 'btn ' + (cls || (primary ? 'btn-primary' : 'btn-soft')), html: Kit.icon(ic) + '<span>' + label + '</span>', onclick: fn }); }

  // ── Your rack ──
  function rackFit(n) {
    var w = rackEl.clientWidth - 20, side = sideways();
    var big = Math.min(innerWidth, innerHeight) >= 700, maxW = big ? 54 : side ? 46 : 40, gap = big ? 8 : 6;
    var hMax = side ? Math.max(80, rackEl.clientHeight - 26) : Math.min(big ? 250 : 170, innerHeight * 0.22);
    // (a desk: your tiles the size of the table's where the window allows, in as few rows as keeps them large)
    if (MDK) { w = rackEl.clientWidth - 28; maxW = MDK.rt; gap = 8; hMax = MDK.fill ? Math.max(120, rackEl.clientHeight - 34) : MDK.rackH - 34; }
    var best = { tw: 14, rows: 1, per: n };
    for (var rows = 1; rows <= (MDK ? 5 : 4); rows++) {
      var per = Math.ceil(n / rows), tw = Math.min(maxW, (w - (per - 1) * gap) / per);
      if (rows * tw * 2 + (rows - 1) * gap > hMax) tw = Math.min(tw, (hMax - (rows - 1) * gap) / (rows * 2));
      if (tw > best.tw + 0.5) best = { tw: tw, rows: rows, per: per };
    }
    best.tw = Math.max(14, Math.floor(best.tw));
    return best;
  }
  function paintRack(o) {
    rackEl.innerHTML = '';
    var v = V(), seat = rackSeat(), hidden = viewer() < 0 || (!NET && humans() > 1 && S.viewer !== seat);
    if (NET && NET.seat < 0) hidden = true;
    var hand = v.hands[seat] || [];
    var turn = !showPrev && myTurn() && S.cur === seat;
    rackEl.classList.toggle('on', turn);
    var nKeep = Math.max(hand.length, 7);
    var fit = rackFit(nKeep);
    rackEl.style.setProperty('--tw', fit.tw + 'px');
    rackEl.style.minHeight = MDK ? (MDK.fill ? '' : (fit.tw * 2 * fit.rows + (fit.rows - 1) * 8 + 34) + 'px') : sideways() ? '' : (fit.tw * 2 * fit.rows + (fit.rows - 1) * 8 + 26) + 'px';
    var who0 = S.players[seat];
    rackEl.appendChild(el('div', { class: 'lbl', html: hidden ? 'Hidden tiles' : who0.name === 'You' ? 'Your tiles' : '<b>' + Kit.esc(who0.name) + '</b>’s tiles' }));   // (the rack names whose tiles they are)
    var ms = turn ? C.legal(S) : [], ok = {};
    ms.forEach(function (m) { ok[m.id] = 1; });
    if (!hand.length) rackEl.appendChild(el('div', { class: 'empty', text: 'No tiles left' }));
    hand.forEach(function (t, k) {
      var id = C.tid(t), d = hidden ? backEl() : tileEl(t[0], t[1]);
      d.setAttribute('data-id', id); d.style.setProperty('--tw', fit.tw + 'px');
      if (!hidden) {
        d.setAttribute('role', 'button'); d.tabIndex = 0;
        if (sel === id) d.classList.add('sel');
        if (turn && !ok[id]) d.classList.add('no');
        if (turn && ok[id]) d.classList.add('fit');
        d.addEventListener('pointerdown', function (e) { onDown(e, t, d); });
        d.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapTile(t, d); } });
      }
      if (o.deal) { d.classList.add('dealin'); d.style.animationDelay = (k * 45) + 'ms'; }
      if (o.hideId === id || (o.fly && o.fly.id === id)) d.style.visibility = 'hidden';
      if (o.flipId === id) d.classList.add('flipin');
      rackEl.appendChild(d);
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // A large window (a computer). The table takes the window: the hub, the lanes and the tiles are sized from it (to a
  // largest tile of MT_U across), the plaques on the felt step up with it (--k), and the room beside the table holds
  // what was a tap away or not shown: under the players at the left the rounds as a ladder from the double 12 down,
  // every round's dots and the totals; at the right, between whose turn it is and your tiles, the round in play (the
  // double that must be covered, every train's length, open end and marker, the round play by play). A counted round
  // is written on the ladder and where your tiles were; no sheet covers the table.
  //   wide   1200 or more across, 430 or more tall   players over the rounds | table | whose turn, the round, your tiles, the buttons
  //          (the round in play is left out where the column is too short for it: your tiles take the room)
  //   tall   1200 or more tall, a quarter taller than wide   players; the rounds and the round in play; table; your tiles
  //   stack  900 or more each way, short of the others   players in a row, the table the full width, your tiles
  // MDK is set only while one of them shows; every other window keeps the phone's and the tablet's layouts.
  // ═════════════════════════════════════════════════════════════════════════
  var MDK = null, MT_U = 88, mCount = null, mKey = '', mRounds = -1, mLog = -1, mFor = 0, ladEl = null, sideEl = null;
  function clampN(a, x, b) { return Math.max(a, Math.min(b, x)); }
  function mdkPlan(W, H) {
    if (H >= 1200 && H >= W * 1.25 && W >= 560) return 'tall';
    if (W >= 1200 && H >= 430) return 'wide';
    if (W >= 900 && H >= 900) return 'stack';
    return null;
  }
  // The panels give way, not the tiles. A desk layout is kept only while its table is no worse than the tablet's
  // layout would be in the same window: every train whole at WHOLE_MIN across or more, or else tiles as large as
  // the tablet's and no train pushed together that the tablet's layout would lay whole. mdkGive() measures the felt the tablet's layout has here once a round
  // and a window size and lays the trains out on both; where the desk loses, the window has the tablet's layout
  // until the next round (mOff).
  var mOff = false, mOffKey = '', mDev = null;
  function mdkSet() {
    if (!W_ || !S) return null;
    var key = [innerWidth, innerHeight, S.n, S.round, S.phase === 'over' ? 1 : 0].join(':');
    if (key !== mOffKey) { mOffKey = key; mOff = false; mDev = null; }
    return mdkApply(mOff ? null : mdkPlan(innerWidth, innerHeight));
  }
  function mdkGive(o) {
    if (!MDK || S.phase !== 'play' || showPrev || mCount) return;
    var v = V(), tests = [v];
    if (!mDev) {
      var pl = MDK.pl;
      mdkApply(null); paintWho(); paintStatus(); paintRack({});
      mDev = { w: feltEl.clientWidth, h: feltEl.clientHeight + 6 };
      mdkApply(pl); paintWho(); paintStatus(); paintRack(o); paintDesk();
    }
    if (!mDev.w || !mDev.h) return;
    function look(g) { var u = 0, whole = true; g.lanes.forEach(function (ln) { u = Math.max(u, ln.u || 0); if (ln.tight) whole = false; }); return { u: u, whole: whole }; }
    var W = feltEl.clientWidth, H = feltEl.clientHeight, keep = MDK, lose = false;
    tests.forEach(function (vv) {
      if (lose) return;
      var a = look(layoutAll(W, H, vv)); MDK = null;
      var d; try { d = look(layoutAll(mDev.w, mDev.h, vv)); } finally { MDK = keep; }
      // (whole at WHOLE_MIN or more is what a desk is for; short of that, the desk must not have smaller tiles than the
      // tablet's layout, nor push trains together where the tablet's layout would lay them whole)
      var ok = a.whole ? a.u >= Math.min(WHOLE_MIN, d.u) - .3 : !d.whole && a.u >= d.u - .3;   // (both pushed together: the desk's tiles no smaller)
      if (!ok) lose = true;
    });
    if (!lose) return;
    mOff = true; mdkApply(null); mKey = '';
    paintWho(); paintStatus(); paintRack(o); paintDesk();
  }
  function mdkApply(pl) {
    var W = innerWidth, H = innerHeight, st = W_.style, n = S.n;
    if (!pl) {
      if (MDK) { W_.className = 'mtw'; app.classList.remove('mdkapp'); ['--k', '--lw', '--rw', '--ph', '--pk'].forEach(function (k) { st.removeProperty(k); }); }
      MDK = null; return null;
    }
    var lw = 0, rw = 0, ph = 0, colH = H - 82, side = false, rackH, fill = false, cols, rt, deal = C.perHand(n);
    var count = !!mCount || (S.phase === 'over' && !!S.prev);
    function need(w, t) { var per = Math.max(1, Math.floor((w - 20) / (t + 8))), rows = Math.ceil(deal / per); return rows * 2 * t + (rows - 1) * 8 + 34; }
    if (pl === 'wide') {
      lw = clampN(250, W * .17, 500); rw = clampN(270, W * .18, 520);   // (no wider than they need: the trains want the table's width)
      rt = clampN(48, rw / 5.6, MT_U);
      rackH = Math.min(need(rw, rt), H * .46, colH - 130);
      // (the round in play needs its head and a row a train; a column too short for that gives the room to your tiles)
      side = colH - 150 - rackH >= 70 + (n + 1) * 30;
      if (!side) { rackH = colH - 140; fill = true; }
      cols = n <= 4 ? 1 : 2;
    } else if (pl === 'tall') {
      rt = clampN(48, W / 12, MT_U);
      // (five or six players: the room the round in play needs for a row a train; seven or eight: the rounds alone, across the window)
      ph = n <= 4 ? clampN(260, H * .22, 400) : n <= 6 ? Math.max(clampN(200, H * .14, 260), 88 + (n + 1) * 25) : clampN(200, H * .14, 260);
      rackH = Math.min(need(W - 40, rt), H * .18); side = n <= 6;
      cols = n <= 4 ? n : Math.ceil(n / 2);
    } else { rt = clampN(48, W / 12, MT_U); rackH = Math.min(need(W - 40, rt), H * .22); cols = (W - 40) / n >= 112 ? n : Math.ceil(n / 2); }
    MDK = { pl: pl, max: MT_U, rt: rt, k: clampN(1, Math.min(W / 1500, H / 950), 1.6), side: side, rackH: rackH, fill: fill, cols: cols, count: count };
    var cls = 'mtw mdk mdk-' + pl + (H < 640 ? ' short' : '') + (side ? '' : ' noside') + (count ? ' count' : '') + (W_.classList.contains('acts-on') ? ' acts-on' : '');
    if (W_.className !== cls) W_.className = cls;
    app.classList.add('mdkapp');
    st.setProperty('--k', MDK.k.toFixed(3)); st.setProperty('--lw', Math.round(lw) + 'px'); st.setProperty('--rw', Math.round(rw) + 'px'); st.setProperty('--ph', Math.round(ph) + 'px');
    return MDK;
  }
  // The count of a round at a desk: written where your tiles were, the way on a button where the turn's buttons are.
  function deskRound(r, go) {
    var t = tok, gone = false, last = S.phase === 'over' && S.prev && S.prev.round === S.R - 1;
    mCount = { r: r, label: last ? 'See the results' : 'Next round', go: function () { if (gone || t !== tok) return; gone = true; mCount = null; go(); } };
    paint();
    if (!humans() || (NET && NET.seat < 0)) later(function () { if (mCount && mCount.go) mCount.go(); }, 2200);
  }
  // the window changed between a desk and a device's size while a round is counted: the count moves with it
  function mdkSync() {
    if (!S || !W_) return;
    var on = !!mdkSet();
    if (on && sheetH && sheetGo) { var g = sheetGo; sheetKeep.v = true; try { sheetH.close(); } catch (e) {} sheetH = null; sheetGo = null; deskRound(g.r, g.go); }
    else if (!on && mCount) { var c = mCount; mCount = null; mdkSet(); roundSheet(c.r, c.go); }
  }
  function avOf(i, cls) { var p = S.players[i]; return isBot(i) ? el('span', { class: 'avatar' + (cls ? ' ' + cls : ''), style: { '--c': p.color }, html: Kit.icon('bot') }) : Kit.avatar.el(p.name, 'sm', p.color); }
  function pipChip(v) { return el('b', { class: 'mdk-pip' + (v ? '' : ' z'), style: { '--pc': v ? PIP[v] : '#8c8778' }, text: String(v) }); }
  // this round, play by play, from the record the history keeps (S.pl): a tile played on a train, a tile drawn, a pass
  function roundLog(pl) {
    var out = [];
    String(pl || '').split(' ').forEach(function (w) {
      var m = /^(\d)([0-9a-c])([0-9a-c])([a-hm])$/.exec(w);
      if (m) { out.push({ p: +m[1], t: [parseInt(m[2], 13), parseInt(m[3], 13)], tr: m[4] === 'm' ? S.n : m[4].charCodeAt(0) - 97 }); return; }
      m = /^(\d)([dx])$/.exec(w); if (!m) return;
      out.push(m[2] === 'x' ? { p: +m[1], pass: 1 } : { p: +m[1], drew: 1 });
    });
    return out.filter(function (e) { return !!S.players[e.p] && (e.tr == null || e.tr <= S.n); });
  }
  function paintDesk() {
    if (!MDK || !ladEl) { mKey = ''; return; }
    var v = V();
    var key = JSON.stringify([MDK.pl, MDK.side, MDK.count, innerWidth, innerHeight, S.started, S.round, S.phase, S.cur, S.scores, S.rr.length, S.pl || '', v.prev ? 1 : 0, S.hands.map(function (h) { return h.length; }), S.trains.map(function (T) { return T.t.length + (T.m ? 'm' : ''); }),
      S.dbl ? S.dbl.tr : -1, viewer(), mCount ? 1 : 0, ladEl.clientWidth, ladEl.clientHeight, sideEl.clientWidth, sideEl.clientHeight]);
    if (key === mKey) return;
    mKey = key;
    if (mFor !== S.started) { mFor = S.started; mRounds = -1; mLog = -1; }
    if (MDK.pl !== 'stack') paintLadder(v);
    if (MDK.count) paintCount(); else if (MDK.side) paintSide(v);
  }
  // the rounds: a row a round from the double 12 down, a column a player, the round in play lit, the rounds to come
  // ruled and empty, the totals at the foot (the lowest is ahead)
  function paintLadder(v) {
    var n = S.n, me = NET ? NET.seat : humans() === 1 ? firstHuman() : -1, lo = Math.min.apply(null, S.scores);
    var inn = el('div', { class: 'mdk-in' });
    inn.appendChild(el('div', { class: 'mdk-h' }, [el('h2', { text: 'Rounds' }), el('small', { text: 'Dots left in hand' })]));
    var pad = el('div', { class: 'mdk-pad', style: { '--n': String(n), '--mi': String(me) } });
    if (me >= 0) pad.appendChild(el('div', { class: 'meb' }));
    function row(cls, label, cells) { return el('div', { class: 'pr ' + cls }, [el('span', { class: 'rl' }, label ? [label] : [])].concat(cells)); }
    function cell(x, cls) { return el('span', { class: 'cv' + (cls ? ' ' + cls : ''), text: x == null ? '' : String(x) }); }
    pad.appendChild(row('ph', null, S.players.map(function (p, i) { return el('span', { class: 'pc' + (i === me ? ' me' : ''), title: p.name }, [avOf(i), el('span', { class: 'pn', text: p.name })]); })));
    var body = el('div', { class: 'pb' }), just = mRounds >= 0 && S.rr.length === mRounds + 1, live = null;
    for (var r = 0; r < S.R; r++) {
      var done = r < S.rr.length, cur = !done && r === S.round && S.phase === 'play' && !v.prev;
      var cells = S.players.map(function (p, i) {
        if (!done) return cell('');
        var x = S.rr[r][i], w = S.ro[r] && S.ro[r].w === i;
        return cell(x, x === 0 || w ? 'hot' : '');
      });
      var rw = row((cur ? 'live' : '') + (done ? '' : ' todo') + (just && r === S.rr.length - 1 ? ' just' : ''), pipChip(12 - r), cells);
      if (cur || (done && r === S.rr.length - 1 && !live)) live = rw;
      body.appendChild(rw);
    }
    mRounds = S.rr.length;
    pad.appendChild(body);
    pad.appendChild(row('pf', el('span', { text: 'Total' }), S.scores.map(function (x) { return cell(x, S.rr.length && x === lo ? 'lead' : ''); })));
    inn.appendChild(pad);
    var goal = el('div', { class: 'mdk-goal', text: 'After ' + S.R + ' rounds the lowest total wins.' });
    inn.appendChild(goal);
    ladEl.innerHTML = ''; ladEl.appendChild(inn);
    ladEl.classList.toggle('gone', ladEl.clientHeight < 170);
    // the numbers as large as a column allows; names under the pictures only where they can be read
    var fs = parseFloat(getComputedStyle(pad).fontSize), colW = (pad.clientWidth - fs * 1.1 - fs * 2.6) / n;
    pad.style.setProperty('--cf', clampN(11, colW / 2.25, fs * 1.42).toFixed(1) + 'px');
    if (colW < fs * 3.4) pad.classList.add('nonames');
    // every round on the sheet where there is room; where there isn't, whole rows with the round in play in view
    var rh0 = Math.max(22, fs * 1.75), bh = body.clientHeight;
    if (bh < rh0 * Math.min(S.R, 5)) { goal.remove(); bh = body.clientHeight; }
    var rows = Math.max(1, Math.min(S.R, Math.floor(bh / rh0))), rh = Math.min(Math.floor(bh / rows), Math.round(fs * 2.7));
    pad.style.setProperty('--rh', rh + 'px'); body.style.flex = '0 0 ' + (rh * rows) + 'px';
    if (live && rows < S.R) { var at = [].indexOf.call(body.children, live); body.scrollTop = clampN(0, at - rows + 2, S.R - rows) * rh; }
    // room left under the sheet: the totals round by round, the lowest line ahead
    if (rows === S.R && bh - rh * rows > Math.max(170, fs * 10) && S.rr.length >= 1) {
      pad.style.flex = 'none';
      var lb = el('div', { class: 'mdk-lbl' }, [el('span', { text: 'Totals, round by round' }), el('span', { text: 'The lowest is ahead' })]), ch = el('div', { class: 'mdk-race' });
      inn.insertBefore(lb, goal.parentNode ? goal : null); inn.insertBefore(ch, goal.parentNode ? goal : null);
      drawRace(ch, me);
    }
  }
  function drawRace(ch, me) {
    var W = ch.clientWidth, H = ch.clientHeight; if (W < 80 || H < 80) return;
    var run = S.players.map(function () { return [0]; });
    S.rr.forEach(function (r) { r.forEach(function (x, i) { run[i].push(run[i][run[i].length - 1] + x); }); });
    var max = Math.max.apply(null, S.scores.concat([1])), l = 34, rgt = 16, t = 12, b = 22;
    var span = Math.max(3, S.rr.length);   // (the rounds played so far fill the width)
    function X(k) { return l + (W - l - rgt) * k / span; }
    function Y(x) { return t + (H - t - b) * x / max; }
    var h = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">';
    [0, max].forEach(function (x) { h += '<line class="ax" x1="' + l + '" x2="' + (W - rgt) + '" y1="' + Y(x).toFixed(1) + '" y2="' + Y(x).toFixed(1) + '"/><text class="tk" x="' + (l - 6) + '" y="' + (Y(x) + 4).toFixed(1) + '" text-anchor="end">' + x + '</text>'; });
    for (var r = 1; r <= S.rr.length; r++) h += '<line class="tick" x1="' + X(r).toFixed(1) + '" x2="' + X(r).toFixed(1) + '" y1="' + (H - b) + '" y2="' + (H - b + 4) + '"/>';
    h += '<text class="tk" x="' + X(1).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle">12</text><text class="tk" x="' + X(S.rr.length).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle">' + (13 - S.rr.length) + '</text>';
    var order = S.players.map(function (p, i) { return i; }).sort(function (a, c) { return (a === me) - (c === me) || S.scores[c] - S.scores[a]; });
    order.forEach(function (i) {
      var d = run[i].map(function (x, k) { return (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(x).toFixed(1); }).join(''), e = run[i].length - 1;
      h += '<path d="' + d + '" stroke="' + S.players[i].color + '" class="ln' + (i === me ? ' me' : '') + '"/><circle cx="' + X(e).toFixed(1) + '" cy="' + Y(run[i][e]).toFixed(1) + '" r="' + (i === me ? 5 : 4) + '" fill="' + S.players[i].color + '"/>';
    });
    ch.innerHTML = h + '</svg>';
  }
  // the round in play: the double that must be covered, every train (its length, its open end, its marker), the round play by play
  function paintSide(v) {
    var inn = el('div', { class: 'mdk-in' }), me = rackSeat(), i;
    sideEl.innerHTML = ''; sideEl.appendChild(inn);
    inn.appendChild(el('div', { class: 'mdk-h' }, [el('h2', { text: 'Round ' + (v.round + 1) }), el('small', { text: 'The engine is the ' + dname(v.eng) })]));
    var owed = !v.prev && v.dbl && S.o.dbl === 'cover' ? v.dbl.tr : -1, ow = null;
    if (owed >= 0) {
      var T0 = v.trains[owed].t;
      ow = el('p', { class: 'mdk-owed', text: 'The ' + dname(T0[T0.length - 1][0]) + ' on ' + trainName(owed) + ' must be covered before anything else is played.' });
      inn.appendChild(ow);
    }
    var lbl1 = el('div', { class: 'mdk-lbl' }, [el('span', { text: 'Trains' }), el('span', { class: 'cols' }, [el('span', { text: 'Tiles' }), el('span', { text: 'Open end' })])]), tb = el('div', { class: 'mdk-tr' });
    laneOrder().forEach(function (tr) {
      var T = v.trains[tr], m = tr === mex(), p = m ? null : S.players[tr], end = T.t.length ? T.t[T.t.length - 1][1] : v.eng;
      var hd = m ? el('span', { class: 'eng', html: engineSvg('#e9c46a', true) }) : avOf(tr);
      var tx = el('div', { class: 'tx' }, [el('div', { class: 'nm', text: m ? 'Mexican Train' : p.name })]);
      if (owed === tr) tx.appendChild(el('div', { class: 'mk hot', text: 'Double to cover' }));
      else if (m) tx.appendChild(el('div', { class: 'mk', text: T.t.length ? 'Open to everyone' : 'Not started yet' }));
      else if (T.m) tx.appendChild(el('div', { class: 'mk', text: 'Open to everyone' }));
      else if (!T.t.length) tx.appendChild(el('div', { class: 'mk', text: 'Not started yet' }));
      var kids = [hd, tx];
      if (T.m && !m) kids.push(el('span', { class: 'mkr', html: engineSvg(p.color) }));
      kids.push(el('span', { class: 'ct', text: String(T.t.length) })); kids.push(pipChip(end));
      tb.appendChild(el('div', { class: 'row' + (tr === me && viewer() >= 0 ? ' me' : '') + (owed === tr ? ' owed' : '') + (T.m || m ? ' open' : ''), style: { '--c': m ? '#e9c46a' : p.color } }, kids));
    });
    inn.appendChild(lbl1); inn.appendChild(tb);
    var log = S.pl != null && !v.prev ? roundLog(S.pl) : null, lbl3 = null, lg = null;
    if (log && log.length) {
      lbl3 = el('div', { class: 'mdk-lbl' }, [el('span', { text: 'This round, play by play' })]);
      lg = el('div', { class: 'mdk-log' });
      log.forEach(function (e, x) {
        var P = S.players[e.p], kids = [el('i'), el('span', { class: 'n', text: P.name })], say = P.name;
        if (e.t) {
          kids.push(tileEl(e.t[0], e.t[1]));
          if (e.tr !== e.p) kids.push(e.tr === mex() ? el('span', { class: 'to eng', html: engineSvg('#e9c46a', true) }) : el('span', { class: 'to', style: { '--c': S.players[e.tr].color } }));
          say += ' played the ' + C.tname(e.t) + ' on ' + (e.tr === mex() ? 'the Mexican Train' : e.tr === e.p ? 'their own train' : Kit.poss(nm(e.tr)) + ' train');
        } else if (e.drew) { kids.push(el('span', { class: 'w', text: 'Drew' })); say += ' drew a tile'; }
        else { kids.push(el('span', { class: 'w', text: 'Passed' })); say += ' passed'; }
        var rw = el('div', { class: 'lr' + (mLog >= 0 && x >= mLog ? ' new' : ''), style: { '--c': P.color } }, kids);
        rw.setAttribute('aria-label', say + '.');
        lg.appendChild(rw);
      });
      inn.appendChild(lbl3); inn.appendChild(lg);
    }
    mLog = log ? log.length : -1;
    // a short panel gives up its least needed part first: the play by play, then the words under the names
    function over() { return inn.scrollHeight > inn.clientHeight + 1; }
    if (lg) {
      var lh0 = parseFloat(getComputedStyle(lg).fontSize) * 2.1, hc = lg.clientHeight, rows = Math.floor(hc / lh0);
      if (rows < 2 || over()) { lbl3.remove(); lg.remove(); }
      else { var lh = Math.floor(hc / rows); lg.style.setProperty('--lh', lh + 'px'); lg.style.flex = '0 0 ' + (lh * Math.min(rows, log.length)) + 'px'; lg.scrollTop = lg.scrollHeight; }
    }
    if (over()) tb.classList.add('tight');
    if (over()) [].forEach.call(tb.querySelectorAll('.mk:not(.hot)'), function (x) { x.remove(); });
    if (over() && ow) ow.remove();
    sideEl.classList.toggle('gone', over());   // (never cut: a panel that still can't hold its rows is left empty)
  }
  // a round that has been counted: what everyone was left holding, their dots and their new totals
  function paintCount() {
    var P = S.prev, r = mCount ? mCount.r : P && P.res; if (!P || !r) return;
    var last = S.phase === 'over' && P.round === S.R - 1;
    var inn = el('div', { class: 'mdk-in' });
    sideEl.innerHTML = ''; sideEl.appendChild(inn); sideEl.classList.remove('gone');
    inn.appendChild(el('div', { class: 'mdk-h' }, [el('h2', { text: 'Round ' + (r.round + 1) }), el('small', { text: 'of ' + S.R })]));
    var box = el('div', { class: 'mdk-res' });
    box.appendChild(el('p', { class: 'head', html: r.k === 'out' ? '<b>' + Kit.esc(who(r.w)) + '</b> went out.' : r.w >= 0 ? 'Nobody could play. <b>' + Kit.esc(who(r.w)) + '</b> had the fewest dots.' : 'Nobody could play.' }));
    var order = S.players.map(function (p, i) { return i; }).sort(function (a, b) { return r.pips[a] - r.pips[b] || a - b; }), tb = el('div', { class: 'rows' });
    order.forEach(function (i) {
      var p = S.players[i], h = P.hands[i], tl = el('div', { class: 'tl' });
      if (!h.length) tl.appendChild(el('em', { text: 'Out' }));
      h.forEach(function (t) { tl.appendChild(tileEl(t[0], t[1])); });
      tb.appendChild(el('div', { class: 'row' + (i === r.w ? ' won' : ''), style: { '--c': p.color } }, [avOf(i), el('div', { class: 'who', text: p.name }), tl,
        el('div', { class: 'pp' }, [el('b', { text: '+' + r.pips[i] }), el('small', { text: 'Total ' + P.scores[i] })])]));
    });
    box.appendChild(tb);
    var foot = el('p', { class: 'foot', text: last ? 'That was the last round. The lowest total wins.' : 'Next round, the engine is the ' + dname(12 - r.round - 1) + '.' });
    box.appendChild(foot);
    inn.appendChild(box);
    // (the tiles as large as the panel has room for; a panel too short for them keeps the dots alone)
    function over() { return inn.scrollHeight > inn.clientHeight + 1 || sideEl.scrollHeight > sideEl.clientHeight + 1; }
    ['tight', 'small', 'tiny', 'bare', 'slim', 'two'].forEach(function (c) { if (over()) box.classList.add(c); });
    if (over()) foot.remove();
    mLog = -1;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // The table's layout
  // ═════════════════════════════════════════════════════════════════════════
  // the lanes in order: your own train first, then the others in turn from you, the Mexican Train last
  function laneOrder() {
    var v = rackSeat(), out = [];
    for (var k = 0; k < S.n; k++) out.push((v + k) % S.n);
    out.push(mex());
    return out;
  }
  var WHOLE_MIN = 42;   // (a desk: the smallest a tile is made so that every train lies whole)
  function tileMax() { return MDK ? MDK.max : Math.min(innerWidth, innerHeight) >= 700 ? 54 : 40; }
  function deskCap(g) { return Math.max(g.len / 11, Math.min(54, g.len / 9)); }
  function geometry(W, H, tr) {
    var L = S.n + 1, big = !!MDK || Math.min(innerWidth, innerHeight) >= 700, maxU = tileMax(), pad = 8;
    // (a desk: the hub, the heads and the band the plaques lie in step up with the window)
    var kk = MDK ? MDK.k : 1, capD = MDK ? 150 * kk : big ? 150 : 112, capD2 = MDK ? 140 * kk : big ? 140 : 100, capH = 36 * kk, pb = 30 * kk, colMin = MDK ? 130 * kk : big ? 130 : 108;
    var cands = [];
    function laneU(wc) { return Math.max(9, Math.min(maxU, (wc - 6) * 0.82)); }
    var need = 8;   // (a fixed need, so the table keeps its shape through a round)
    function score(g) { var per = g.len / (2 * g.u); return g.u * Math.min(1, per / need) * (g.cross ? 1.06 : 1); }
    // lanes down the table (hub at the top), or both ways out of a hub in the middle
    var tall = H >= W * 0.85;
    if (tall) {
      var D = Math.max(64, Math.min(W * 0.3, H * 0.19, capD)), wc = (W - 2 * pad) / L, u = laneU(wc), hd = Math.max(26, Math.min(capH, wc * 0.62)) + 8;
      cands.push({ o: 'col', banks: 1, D: D, hub: [W / 2, pad + D / 2], u: u, wc: wc, hd: hd, len: H - pad - (pad + D + 8 + hd), cross: 2 * u <= wc - 6 });
      if (L >= 5) {
        var Lb = Math.ceil(L / 2), wc2 = (W - 2 * pad) / Lb, u2 = laneU(wc2), D2 = Math.max(64, Math.min(W * 0.26, H * 0.15, capD2)), hd2 = Math.max(26, Math.min(capH, wc2 * 0.62)) + 8;
        var cy = pb + (H - pb) / 2;
        var g2 = { o: 'col', banks: 2, D: D2, hub: [W / 2, cy], u: u2, wc: wc2, hd: hd2, len: (H - pb - pad - D2) / 2 - 8 - hd2, cross: 2 * u2 <= wc2 - 6 };
        cands.push(g2);
      }
    } else {
      // (a narrow table with many trains keeps the hub's column to the hub itself, its plaques stacked small, so the
      // trains have the length)
      var nar = !big && W < 420 && L >= 5;
      var Dr = nar ? Math.max(52, Math.min(H * 0.3, W * 0.2, 80)) : Math.max(60, Math.min(H * 0.34, W * 0.2, MDK ? capD : big ? 150 : 104)), col = (nar ? Math.max(Dr, 66) : Math.max(Dr, colMin)) + pad, hc = (H - 2 * pad) / L, ur = laneU(hc), hw = Math.max(26, Math.min(capH, hc * 0.62)) + 8;
      cands.push({ o: 'row', banks: 1, nar: nar, D: Dr, col: col, hub: [pad + col / 2, H / 2], u: ur, wc: hc, hd: hw, len: W - pad - (col + 8 + hw), cross: 2 * ur <= hc - 6 });
    }
    // (a desk: a tile no larger than lets a train run five or six tiles out before it has to bend or push together,
    // and never smaller for that than a tablet's)
    if (MDK) cands.forEach(function (g) { g.u = Math.max(9, Math.min(g.u, deskCap(g))); g.cross = 2 * g.u <= g.wc - 6; });
    var best = cands[0]; cands.forEach(function (g) { if (score(g) > score(best) * 1.04) best = g; });
    best.W = W; best.H = H; best.pad = pad; best.pb = pb;
    return best;
  }
  // A train you can't play on now folds when the table is crowded: with many players on a small screen the trains
  // you can play on (your own, the Mexican Train, any train with its marker out, a double that must be covered) take
  // the room, so their tiles are large enough to read, and the others lie in thinner lanes with every tile still
  // there, the open end at the far end as always. Each lane's width across, in lane order: [{w, c}] (c its middle).
  function laneOpen(tr, v) { var me = rackSeat(); return tr === me || tr === mex() || !!v.trains[tr].m || (!v.prev && v.dbl && S.o.dbl === 'cover' && v.dbl.tr === tr); }
  function laneWidths(list, avail, g, v) {
    var n = list.length, t0 = avail / n, big = !!MDK || Math.min(innerWidth, innerHeight) >= 700, maxU = tileMax();
    var open = list.map(function (tr) { return laneOpen(tr, v); }), nO = open.filter(Boolean).length, nF = n - nO, fw = 1;
    // (fold only where an even share would leave the tiles small, and only as far as the open lanes can use the room)
    if (nO && nF && (t0 - 6) * 0.82 < (big ? 30 : 22)) {
      var tMax = maxU / 0.82 + 6;
      fw = Math.max(0.6, Math.min(1, (avail / tMax - nO) / nF));
    }
    var t = avail / (nO + fw * nF), at = g.pad;
    return list.map(function (tr, k) { var w = open[k] ? t : t * fw, o = { w: w, c: at + w / 2, fold: !open[k] && fw < 1 }; at += w; return o; });
  }
  // every lane's box and its tiles' places
  function layoutAll(W, H, vv) {
    var v = vv || V(), g = geometry(W, H, v.trains), ord = laneOrder(), L = ord.length, pad = g.pad, lanes = [];
    var Lb = Math.ceil(L / 2), LW = g.banks === 2 ? laneWidths(ord.slice(0, Lb), W - 2 * pad, g, v).concat(laneWidths(ord.slice(Lb), W - 2 * pad, g, v)) : laneWidths(ord, (g.o === 'col' ? W : H) - 2 * pad, g, v);
    var tOpen = Math.max.apply(null, LW.map(function (x) { return x.w; }));
    if (LW.some(function (x) { return x.fold; })) { g.u = Math.max(g.u, Math.min(tileMax(), (tOpen - 6) * 0.82, MDK ? deskCap(g) : 1e9)); g.wc = tOpen; }
    ord.forEach(function (tr, k) {
      var ln = { tr: tr, k: k }, lw = LW[k], wk = lw.w;
      ln.fold = lw.fold;
      if (g.o === 'col' && g.banks === 1) {
        var x = lw.c, y0 = pad + g.D + 8;
        ln.dir = 'down'; ln.c = x; ln.head = [x, y0 + g.hd / 2]; ln.a0 = y0 + g.hd; ln.a1 = g.H - pad;
        ln.box = { x: x - wk / 2 + 2, y: y0, w: wk - 4, h: g.H - pad - y0 };
      } else if (g.o === 'col') {
        var lower = k < Lb;
        var xc = lw.c, hy = g.hub[1];
        if (lower) { var yb = hy + g.D / 2 + 8; ln.dir = 'down'; ln.head = [xc, yb + g.hd / 2]; ln.a0 = yb + g.hd; ln.a1 = g.H - pad; ln.box = { x: xc - wk / 2 + 2, y: yb, w: wk - 4, h: g.H - pad - yb }; }
        else { var yt = hy - g.D / 2 - 8; ln.dir = 'up'; ln.head = [xc, yt - g.hd / 2]; ln.a0 = yt - g.hd; ln.a1 = g.pb + pad; ln.box = { x: xc - wk / 2 + 2, y: g.pb + pad, w: wk - 4, h: yt - g.pb - pad }; }
      } else {
        var y = lw.c, x0 = pad + g.col + 8;
        ln.dir = 'right'; ln.c = y; ln.head = [x0 + g.hd / 2, y]; ln.a0 = x0 + g.hd; ln.a1 = g.W - pad;
        ln.box = { x: x0, y: y - wk / 2 + 2, w: g.W - pad - x0, h: wk - 4 };
      }
      ln.wc = wk;
      ln.wc = ln.wc || g.wc;
      placeTiles(ln, v.trains[tr].t, g);
      lanes.push(ln);
    });
    // A desk: no tile lies on another, as on a real table. The tiles come down from the size the window allows until
    // every train lies whole, running straight out or bent back beside itself where its lane is wide enough, as far
    // as WHOLE_MIN across; only a table that can't hold its trains whole at that size pushes them together.
    if (MDK) {
      var sizes = [], q;
      for (q = g.u; q > WHOLE_MIN; q *= 0.96) sizes.push(q);
      if (g.u >= WHOLE_MIN) sizes.push(WHOLE_MIN); else sizes.push(g.u);
      for (var si = 0; si < sizes.length; si++) {
        var gw = Object.assign({}, g, { u: sizes[si], whole: true });
        lanes.forEach(function (ln) { placeTiles(ln, v.trains[ln.tr].t, gw); });
        if (!lanes.some(function (ln) { return ln.tight; })) { g.u = sizes[si]; g.lanes = lanes; return g; }
      }
      g.u = Math.min(g.u, WHOLE_MIN);
      lanes.forEach(function (ln) { placeTiles(ln, v.trains[ln.tr].t, g); });
    }
    // every train's tiles one size: the size the most crowded lane needs, unless that is under three quarters of the
    // full size (then only that lane's tiles come down further)
    // (the open lanes only, when some are folded: a folded lane's tiles are its own size)
    var uMin = Math.min.apply(null, lanes.filter(function (ln) { return !ln.fold; }).map(function (ln) { return ln.u; })), uAll = Math.max(uMin, g.u * 0.74);
    if (uAll < g.u - 0.5) { var g2 = Object.assign({}, g, { u: uAll }); lanes.forEach(function (ln) { placeTiles(ln, v.trains[ln.tr].t, g2); }); }
    g.lanes = lanes;
    return g;
  }
  // A lane's tiles. A train that fits runs straight out from the hub. A longer one in a wide lane bends: it runs to the
  // lane's far end, turns and comes back beside itself (two or three lines), the way a train of real tiles snakes on a
  // table. Where there is no room to bend, it pushes together toward the hub: each older tile slides under the next and
  // shows the half nearest the hub (the next tile's near end repeats the other half), and the newest stay whole.
  var BACK = { down: 'up', up: 'down', right: 'left', left: 'right' };
  function placeTiles(ln, T, g) {
    var u = Math.min(g.u, Math.max(9, (ln.wc - 6) * 0.82)), cross = 2 * u <= ln.wc - 6, sgn = ln.dir === 'up' ? -1 : 1;
    var A = Math.abs(ln.a1 - ln.a0), n = T.length, gap = Math.max(1.5, u * 0.06);
    function lens(uu, cr) { return T.map(function (t) { return t[0] === t[1] && cr ? uu : 2 * uu; }); }
    var ls = lens(u, cross), total = ls.reduce(function (s, x) { return s + x + gap; }, 0) + 2 * u + gap;
    ln.lines = [ln.c]; ln.sgn = sgn; ln.tight = false;
    // pushed together, the newest K tiles and the doubles whole and every older tile showing CF of its length: the
    // largest tile size that fits the lane that way
    var K = Math.min(n, 3), CF = 0.3, fixU = 2.06, oldU = 0;
    T.forEach(function (t, i) { var dbl = t[0] === t[1], l = dbl && cross ? 1 : 2; if (i >= n - K || dbl) fixU += l + 0.06; else oldU += l; });
    var uPush = Math.min(u, A / (fixU + CF * oldU));
    if (total > A) {
      // bend: as many lines as the lane is wide (up to four), the tiles as large as they can be, when that keeps them
      // larger than pushing together would
      for (var uu = u; uu >= 9 && (g.whole || uu > uPush * 1.08); uu *= 0.96) {
        var k = Math.min(4, Math.floor((ln.wc - 4) / (uu * 1.3)));
        if (k >= 2) {
          var gp = Math.max(1.5, uu * 0.06), per = Math.floor((A - gp) / (2 * uu + gp));
          if (per >= 2 && per * k >= n + 1) return snake(ln, T, uu, k, per, gp);
        }
        if (g.whole) break;   // (a desk looking for the size at which every train lies whole: this size or none)
      }
    }
    if (total > A) ln.tight = true;   // (from here on the train is pushed together, or its own tiles made smaller)
    var adv;
    if (total > A && n > K) {
      // push together: doubles keep their room, the older plain tiles slide under the next
      if (uPush < u - 0.5) { u = Math.max(8, uPush); cross = cross && 2 * u <= ln.wc - 6; ls = lens(u, cross); gap = Math.max(1, u * 0.06); }
      var fixed = 2 * u + gap, older = 0;
      ls.forEach(function (x, i) { var dbl = T[i][0] === T[i][1]; if (i >= n - K || dbl) fixed += x + gap; else older += x; });
      var c = older ? Math.max(CF, Math.min(1, (A - fixed) / older)) : 1;
      adv = ls.map(function (x, i) { return i < n - K && T[i][0] !== T[i][1] ? x * c : x + gap; });
    } else {
      if (total > A) { u = Math.max(8, u * A / total); ls = lens(u, cross); gap = Math.max(1, u * 0.06); }
      adv = ls.map(function (x) { return x + gap; });
    }
    var a = ln.a0 + sgn * gap, items = [];
    T.forEach(function (t, i) {
      var len = ls[i], dbl = t[0] === t[1];
      items.push({ t: t, id: C.tid(t), along: a + sgn * len / 2, c: ln.c, dir: ln.dir, u: u, dbl: dbl, cross: dbl && cross, z: i + 1 });
      a += sgn * adv[i];
    });
    ln.u = u; ln.cross = cross; ln.items = items; ln.next = { along: a, c: ln.c, dir: ln.dir, sgn: sgn };
  }
  function snake(ln, T, u, k, per, gap) {
    var sp = Math.min((ln.wc - 4) / k, u * 1.6), items = [], sgn0 = ln.dir === 'up' ? -1 : 1, i;
    ln.lines = [];
    for (i = 0; i < k; i++) ln.lines.push(ln.c + (i - (k - 1) / 2) * sp);
    function at(j) {
      // the j-th place: its line, and how far along that line (a line going back starts at the far end)
      var line = Math.floor(j / per), pos = j % per, back = line % 2 === 1, sgn = back ? -sgn0 : sgn0;
      var start = back ? ln.a0 + sgn0 * (gap + per * (2 * u + gap) - gap) : ln.a0 + sgn0 * gap;
      var a = start + sgn * pos * (2 * u + gap);
      return { along: a + sgn * u, c: ln.lines[line], dir: back ? BACK[ln.dir] : ln.dir, sgn: sgn, a: a };
    }
    T.forEach(function (t, j) { var p = at(j); items.push({ t: t, id: C.tid(t), along: p.along, c: p.c, dir: p.dir, u: u, dbl: t[0] === t[1], cross: false, z: j + 1 }); });
    var nx = at(T.length);
    ln.u = u; ln.cross = false; ln.items = items; ln.next = { along: nx.a, c: nx.c, dir: nx.dir, sgn: nx.sgn };
  }
  var ROTOF = { down: 0, up: 180, right: -90, left: 90 };
  function itemBox(ln, it) {
    // the tile's center on the table and its turn: half A (the near end along the train) first
    var horiz = it.dir === 'right' || it.dir === 'left', cx = horiz ? it.along : it.c, cy = horiz ? it.c : it.along;
    return { cx: cx, cy: cy, rot: ROTOF[it.dir] + (it.cross ? 90 : 0), u: it.u };
  }
  function slotBox(ln, dbl) {
    var N = ln.next, u = ln.u, cross = dbl && ln.cross, len = cross ? u : 2 * u, along = N.along + N.sgn * len / 2;
    var horiz = N.dir === 'right' || N.dir === 'left';
    var w = horiz ? len : (cross ? 2 * u : u), h = horiz ? (cross ? 2 * u : u) : len;
    return { x: (horiz ? along : N.c) - w / 2, y: (horiz ? N.c : along) - h / 2, w: w, h: h };
  }

  // ── Drawing the table ──
  var curG = null;
  function paintTable(o) {
    var v = V(), W = feltEl.clientWidth, Hh = feltEl.clientHeight;
    if (!W || !Hh) return;
    var g = layoutAll(W, Hh); curG = g;
    feltEl.setAttribute('data-o', g.o + g.banks); feltEl.classList.toggle('nar', !!g.nar);
    // the hub and the engine
    var D = g.D;
    hubEl.style.width = hubEl.style.height = D + 'px';
    hubEl.style.left = (g.hub[0] - D / 2) + 'px'; hubEl.style.top = (g.hub[1] - D / 2) + 'px';
    if (!engEl || engEl._v !== v.eng) {
      hubEl.innerHTML = '';
      for (var q = 0; q < 8; q++) hubEl.appendChild(el('span', { class: 'notch', style: { transform: 'translate(-50%,-50%) rotate(' + (q * 45 + 22.5) + 'deg) translateY(-' + (D * 0.41) + 'px)' } }));
      engEl = tileEl(v.eng, v.eng, 'eng'); engEl._v = v.eng; hubEl.appendChild(engEl);
      if (o.deal) { engEl.classList.add('drop'); }
    }
    var ue = Math.min(D * 0.3, g.u * 1.15);
    engEl.style.setProperty('--tw', ue + 'px');
    engEl.style.left = (D / 2 - ue / 2) + 'px'; engEl.style.top = (D / 2 - ue) + 'px';
    engEl.style.transform = g.o === 'row' ? 'rotate(0deg)' : 'rotate(90deg)';
    // rails from the hub to each train's head
    var rs = '';
    g.lanes.forEach(function (ln) {
      var hx = g.hub[0], hy = g.hub[1], tx = ln.head[0], ty = ln.head[1];
      var ang = Math.atan2(ty - hy, tx - hx), sx = hx + Math.cos(ang) * D * 0.46, sy = hy + Math.sin(ang) * D * 0.46;
      var mx = g.o === 'row' ? (sx + tx) / 2 : tx, my = g.o === 'row' ? ty : (sy + ty) / 2;
      var m = ln.tr === mex();
      rs += '<path d="M' + sx.toFixed(1) + ' ' + sy.toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + tx.toFixed(1) + ' ' + ty.toFixed(1) + '" class="' + (m ? 'rx' : 'rp') + '" style="--c:' + (m ? '#e9c46a' : S.players[ln.tr].color) + '"/>';
    });
    railEl.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh); railEl.setAttribute('width', W); railEl.setAttribute('height', Hh);
    railEl.innerHTML = rs;
    // the lanes: band, head (avatar or the gold engine), marker, and the place a tap plays
    var me = viewer(), selT = sel >= 0 && myTurn() ? (S.hands[S.cur].filter(function (t) { return C.tid(t) === sel; })[0] || null) : null;
    var targets = {}; if (selT) C.legal(S).forEach(function (m) { if (m.id === sel) targets[m.tr] = m; });
    var owed = !v.prev && v.dbl && S.o.dbl === 'cover' ? v.dbl.tr : -1;
    // (each lane keeps its element from one paint to the next, so a lane that widens or folds glides with its tiles)
    var oldL = {};
    [].forEach.call(lanesEl.children, function (c) { oldL[c.getAttribute('data-tr')] = c; });
    g.lanes.forEach(function (ln) {
      var tr = ln.tr, T = v.trains[tr], m = tr === mex(), p = m ? null : S.players[tr];
      var b = ln.box, can = !!targets[tr];
      var lane = oldL[tr] || el('div');
      delete oldL[tr];
      lane.className = 'mt-lane ' + ln.dir + (m ? ' mx' : '') + (tr === me ? ' mine' : '') + (T.m && !m ? ' open' : '') + (can ? ' can' : '') + (selT && !can ? ' dim' : '') + (owed === tr ? ' owed' : '') + (owed >= 0 && owed !== tr ? ' wait' : '') + (ln.fold ? ' fold' : '');
      lane.style.left = b.x + 'px'; lane.style.top = b.y + 'px'; lane.style.width = b.w + 'px'; lane.style.height = b.h + 'px'; lane.style.setProperty('--c', m ? '#e9c46a' : p.color);
      if (MDK && m) lane.style.setProperty('--tk', Math.round((ln.u || g.u) * 1.36) + 'px');
      lane.onclick = can ? function (e) { e.stopPropagation(); playOn(targets[tr]); } : null;
      lane.innerHTML = '';
      lane.setAttribute('data-tr', tr);
      // the head
      var hs = Math.max(16, Math.min(g.hd - 8, 34 * (MDK ? MDK.k : 1), ln.wc - 3)), head = el('div', { class: 'mt-head', style: { left: (ln.head[0] - b.x - hs / 2) + 'px', top: (ln.head[1] - b.y - hs / 2) + 'px', width: hs + 'px', height: hs + 'px' } });
      if (MDK) head.style.fontSize = (hs * 0.42) + 'px';
      if (m) head.appendChild(el('span', { class: 'mxeng', html: engineSvg('#e9c46a', true) }));
      else {
        var av = isBot(tr) ? el('span', { class: 'avatar sm', style: { '--c': p.color }, html: Kit.icon('bot') }) : Kit.avatar.el(p.name, 'sm', p.color);
        head.appendChild(av);
        if (T.m) { var mk = el('span', { class: 'mk' + (o.markerDrop === tr ? ' drop' : ''), html: engineSvg(p.color) }); head.appendChild(mk); }
      }
      head.setAttribute('aria-label', m ? 'The Mexican Train' : Kit.poss(p.name) + ' train' + (T.m ? ', open to everyone' : ''));
      lane.appendChild(head);
      if (can) {
        var sb = slotBox(ln, selT[0] === selT[1]);
        lane.appendChild(el('div', { class: 'mt-ghost', style: { left: (sb.x - b.x) + 'px', top: (sb.y - b.y) + 'px', width: sb.w + 'px', height: sb.h + 'px' } }));
      }
      lanesEl.appendChild(lane);
    });
    Object.keys(oldL).forEach(function (k) { oldL[k].remove(); });
    // the tiles
    var seen = {};
    if (o.fly) S.lastPlay = o.fly.id;
    var lastId = !v.prev && S.lastPlay != null ? S.lastPlay : -1;
    g.lanes.forEach(function (ln) {
      ln.items.forEach(function (it) {
        var bx = itemBox(ln, it), nd = nodes[it.id], fresh = false;
        seen[it.id] = 1;
        if (!nd || nd._a !== it.t[0] || nd._b !== it.t[1]) {
          if (nd) nd.remove();
          nd = tileEl(it.t[0], it.t[1], 'nt'); nd._a = it.t[0]; nd._b = it.t[1];
          layerEl.appendChild(nd); nodes[it.id] = nd; fresh = true;
        }
        nd.style.setProperty('--tw', bx.u + 'px');
        nd.style.left = (bx.cx - bx.u / 2) + 'px'; nd.style.top = (bx.cy - bx.u) + 'px';
        nd.style.transform = 'rotate(' + bx.rot + 'deg)';
        nd.style.zIndex = it.z;
        nd.classList.toggle('dbl', it.dbl);
        nd.classList.toggle('last', it.id === lastId);
        nd.classList.toggle('owed', owed === ln.tr && it.dbl && it === ln.items[ln.items.length - 1]);
        if (fresh) {
          void nd.offsetWidth; nd.classList.remove('nt');
          if (o.fly && o.fly.id === it.id) flyIn(nd, bx, o.fly);
          else if (o.deal) nd.classList.add('dealin');
        }
      });
    });
    Object.keys(nodes).forEach(function (id) { if (!seen[id]) { nodes[id].remove(); delete nodes[id]; } });
    // the round and the boneyard
    rndEl.innerHTML = '';
    rndEl.appendChild(el('b', { text: 'Round ' + (v.round + 1) })); rndEl.appendChild(el('small', { text: 'of ' + S.R }));
    boneEl.innerHTML = '';
    var pile = el('div', { class: 'pile' }), nb = Math.min(S.bone.length, 4);
    var pk = MDK ? MDK.k : 1;
    for (var i = 0; i < nb; i++) { var bk = backEl('mini'); bk.style.left = (i * 5 * pk) + 'px'; bk.style.top = ((i % 2 ? 3 : 0) * pk) + 'px'; bk.style.transform = 'rotate(' + (i % 2 ? 90 : 82) + 'deg)'; pile.appendChild(bk); }
    boneEl.appendChild(pile);
    boneEl.appendChild(el('span', null, [el('b', { text: String(v.prev ? '' : S.bone.length) }), el('small', { text: v.prev ? 'Round over' : S.bone.length === 1 ? 'tile left' : 'tiles left' })]));
    var canD = myTurn() && C.canDraw(S);
    boneEl.classList.toggle('go', canD); boneEl.disabled = !canD; boneEl.classList.toggle('none', !S.bone.length);
    // the plaques sit where the layout leaves room: beside the hub, or in the band over the lanes
    placePlaques(g);
  }
  function placePlaques(g) {
    var pad = 8;
    if (g.o === 'row') {
      rndEl.style.left = pad + 'px'; rndEl.style.top = pad + 'px'; rndEl.style.right = 'auto'; rndEl.style.bottom = 'auto';
      boneEl.style.left = pad + 'px'; boneEl.style.bottom = pad + 'px'; boneEl.style.top = 'auto'; boneEl.style.right = 'auto';
      rndEl.style.maxWidth = boneEl.style.maxWidth = (g.col - 4) + 'px';
    } else {
      rndEl.style.left = pad + 'px'; rndEl.style.top = pad + 'px'; rndEl.style.right = 'auto'; rndEl.style.bottom = 'auto';
      boneEl.style.right = pad + 'px'; boneEl.style.top = pad + 'px'; boneEl.style.left = 'auto'; boneEl.style.bottom = 'auto';
      var room = g.banks === 1 ? (g.W - g.D) / 2 - pad * 2 : g.W / 2 - pad * 2;
      rndEl.style.maxWidth = boneEl.style.maxWidth = room + 'px';
    }
  }
  function flyIn(nd, bx, f) {
    if (!nd.animate || !f.from) return;
    var r = nd.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var dx = f.from.x - cx, dy = f.from.y - cy, k = (f.from.w || bx.u) / bx.u, r0 = f.bot ? bx.rot + 30 : 0;
    nd.animate([
      { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + r0 + 'deg) scale(' + k + ')', offset: 0 },
      { transform: 'translate(' + dx * .3 + 'px,' + (dy * .3 - 16) + 'px) rotate(' + (bx.rot * .75 + r0 * .25) + 'deg) scale(1.14)', offset: .62 },
      { transform: 'rotate(' + bx.rot + 'deg) scale(1)', offset: 1 }
    ], { duration: 430 * SPD, easing: 'cubic-bezier(.3,.6,.35,1)' });
  }
  function lanePulse(tr, kind) {
    var ln = lanesEl.querySelector('.mt-lane[data-tr="' + tr + '"]'); if (!ln) return;
    ln.classList.remove('pulse', 'p-cover', 'p-dbl', 'p-start'); void ln.offsetWidth; ln.classList.add('pulse', 'p-' + kind);
    setTimeout(function () { ln.classList.remove('pulse', 'p-' + kind); }, 1100);
  }
  function bump(tr) { if (!tblEl) return; tblEl.classList.remove('bump'); void tblEl.offsetWidth; tblEl.classList.add('bump'); }
  // where tiles fly from and to
  function srcRect(p, id) {
    if (p === viewer() || (!NET && p === S.viewer)) {
      var n = rackEl && rackEl.querySelector('.mtt[data-id="' + id + '"]');
      if (n) { var r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }
    }
    return plateRect(p);
  }
  function plateRect(p) { var q = plates[p]; if (q) { var r = q.getBoundingClientRect(); return { x: r.left + 20, y: r.top + r.height / 2, w: 12 }; } return null; }
  function rackRect(id) {
    var n = rackEl.querySelector('.mtt[data-id="' + id + '"]');
    if (n) { var r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }
    var rr = rackEl.getBoundingClientRect(); return { x: rr.left + rr.width / 2, y: rr.top + rr.height / 2, w: 30 };
  }
  function boneRect() { var r = boneEl.getBoundingClientRect(), k = MDK ? MDK.k : 1; return { x: r.left + 20 * k, y: r.top + r.height / 2, w: 10 * k }; }
  function flyBack(from, to, done) {
    if (!from || !to) { done(); return; }
    var b = backEl('fly'), w0 = from.w || 10;
    b.style.setProperty('--tw', w0 + 'px');
    b.style.left = (from.x - w0 / 2) + 'px'; b.style.top = (from.y - w0) + 'px';
    document.body.appendChild(b);
    var dur = 380 * SPD;
    if (b.animate) b.animate([
      { transform: 'rotate(90deg) scale(1)' },
      { transform: 'translate(' + (to.x - from.x) * .5 + 'px,' + ((to.y - from.y) * .5 - 30) + 'px) rotate(30deg) scale(' + (1 + (to.w / w0 - 1) * .6) + ')' },
      { transform: 'translate(' + (to.x - from.x) + 'px,' + (to.y - from.y) + 'px) rotate(0deg) scale(' + (to.w / w0) + ')' }
    ], { duration: dur, easing: 'cubic-bezier(.3,.6,.35,1)', fill: 'forwards' });
    var t = tok;
    setTimeout(function () { b.remove(); if (t === tok && S) done(); }, dur + 20);
  }
  // two ivory tiles meeting
  var actx = null;
  function clack() {
    try { if (localStorage.getItem('gn_sound') === '0') return; } catch (e) {}
    try {
      var Cx = window.AudioContext || window.webkitAudioContext; if (!Cx) return;
      actx = actx || new Cx(); if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime;
      [[0, .5, 2400], [0.03, .2, 3300]].forEach(function (c) {
        var n = Math.floor(actx.sampleRate * 0.03), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
        var src = actx.createBufferSource(), f = actx.createBiquadFilter(), gn = actx.createGain();
        f.type = 'bandpass'; f.frequency.value = c[2]; f.Q.value = 1.6; gn.gain.value = c[1];
        src.buffer = buf; src.connect(f); f.connect(gn); gn.connect(actx.destination); src.start(t + c[0]);
      });
    } catch (e) {}
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Input: tap a tile, then the train; or drag the tile onto a train
  // ═════════════════════════════════════════════════════════════════════════
  function movesFor(id) { return C.legal(S).filter(function (m) { return m.id === id; }); }
  function playOn(m) { if (!m || !myTurn()) return; sel = -1; you2({ k: 'play', id: m.id, tr: m.tr }); }
  function tapTile(t, d) {
    if (!myTurn()) { if (S && S.phase === 'play' && isBot(S.cur)) Kit.toast('Wait for ' + who(S.cur)); return; }
    var id = C.tid(t), ms = movesFor(id);
    if (!ms.length) {
      Kit.sfx('bad'); Kit.haptic('error');
      if (d) { d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); }
      var owed = S.dbl && S.o.dbl === 'cover';
      Kit.toast(owed ? 'The double has to be covered first' : C.legal(S).length ? 'That tile doesn’t fit any train you can play on' : C.canDraw(S) ? 'Nothing fits. Draw from the boneyard' : 'Nothing fits, so you pass');
      return;
    }
    if (ms.length === 1) { playOn(ms[0]); return; }
    sel = sel === id ? -1 : id;
    Kit.sfx('tick'); Kit.haptic('tick');
    paint();
  }
  var drag = null;
  function onDown(e, t, d) {
    if (e.button > 0 || drag) return;
    drag = { t: t, d: d, x: e.clientX, y: e.clientY, moved: false, g: null, pid: e.pointerId };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onCancel);
  }
  function unbind() { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel); }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && dx * dx + dy * dy < 64) return;
    if (!drag.moved) {
      if (!myTurn() || !movesFor(C.tid(drag.t)).length) return;
      drag.moved = true; sel = C.tid(drag.t); paint();
      var d0 = rackEl.querySelector('.mtt[data-id="' + sel + '"]'); if (d0) { d0.classList.add('drag'); drag.d = d0; }
      drag.g = tileEl(drag.t[0], drag.t[1], 'dragt');
      drag.g.style.setProperty('--tw', (d0 ? d0.getBoundingClientRect().width : 34) + 'px');
      document.body.appendChild(drag.g);
    }
    e.preventDefault();
    drag.g.style.left = e.clientX + 'px'; drag.g.style.top = e.clientY + 'px';
    var hit = laneAt(e.clientX, e.clientY);
    [].forEach.call(lanesEl.querySelectorAll('.mt-lane.can'), function (l) { l.classList.toggle('hot', l === hit); });
  }
  function laneAt(x, y) {
    var best = null;
    [].forEach.call(lanesEl.querySelectorAll('.mt-lane.can'), function (l) { var r = l.getBoundingClientRect(); if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) best = l; });
    return best;
  }
  function onUp(e) {
    var dg = drag; if (!dg || e.pointerId !== dg.pid) return;
    drag = null; unbind();
    if (!dg.moved) { tapTile(dg.t, dg.d); return; }
    if (dg.g) dg.g.remove();
    var hit = laneAt(e.clientX, e.clientY);
    if (hit && myTurn()) { var tr = +hit.getAttribute('data-tr'), m = movesFor(C.tid(dg.t)).filter(function (x) { return x.tr === tr; })[0]; if (m) { playOn(m); return; } }
    sel = -1; paint();
  }
  function onCancel() { var dg = drag; drag = null; unbind(); if (dg && dg.g) dg.g.remove(); if (S) paint(); }
  document.addEventListener('keydown', function (e) {
    if (!active() || document.querySelector('.k-scrim') || document.querySelector('.k-ho')) return;
    if (e.key === 'Escape' && sel >= 0) { sel = -1; paint(); }
    if ((e.key === 'd' || e.key === 'D') && myTurn() && C.canDraw(S)) you2({ k: 'draw' });
  });
  // turning the device: everything glides to the new shape
  var rT = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rT);
    rT = setTimeout(function () {
      if (!active() || !W_ || !W_.isConnected) return;
      if (drag) { paint(); return; }
      Kit.glide(function () { setBarH(); mdkSync(); paint(); });
    }, 80);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Online (turnnet.js): the table holds the whole game; each device draws its own seat's tiles only
  // ═════════════════════════════════════════════════════════════════════════
  var netAPI = {
    start: function (players, o) {
      var st = C.newGame(players.map(function (x, i) { return { name: x.name, cpu: !!x.bot, level: x.bot ? H.lvName(o.level) : undefined, color: Kit.color(i) }; }),
        { first: o.mtfirst, dbl: o.mtdbl, rounds: o.mtrounds });
      st.mode = 'online'; st.started = Date.now();
      return st;
    },
    turn: function (st) { return st && st.phase === 'play' ? [st.cur] : []; },
    over: function (st) {
      if (!st || st.phase !== 'over') return null;
      var w = C.winners(st), lo = st.scores[w[0]];
      return { win: w, text: w.map(function (i) { return st.players[i].name; }).join(' & ') + (w.length > 1 ? ' tie with ' : ' wins with ') + lo };
    },
    bot: function (st, seat) {
      if (!st || st.phase !== 'play' || st.cur !== seat) return null;
      var ev = C.apply(st, seat, C.botMove(st, seat));
      return ev ? { state: st, mv: { p: seat, ev: ev } } : null;
    },
    show: function (net, info) {
      info = info || {};
      NET = net;
      var e = { st: JSON.parse(JSON.stringify(net.state)), info: info };
      if (info.fresh || info.again) { NETQ = [e]; if (NETBUSY) { tok++; NETBUSY = false; busy = false; } closeSheets(); }
      else NETQ.push(e);
      if (!NETBUSY) netNext();
    },
    leave: function () { NET = null; NETQ = []; NETBUSY = false; tok++; busy = false; sel = -1; closeSheets(); S = null; }
  };
  function netNext() {
    if (!NET) { NETQ = []; NETBUSY = false; return; }
    var e = NETQ.shift();
    if (!e) { NETBUSY = false; if (S && W_) paint(); return; }
    NETBUSY = true;
    var info = e.info, mv = info.mv, quick = NETQ.length > 3 || document.hidden;
    var fresh = !S || !active() || info.fresh || info.again || !mv || !mv.ev;
    var mine = mv && mv.p === NET.seat;
    var from = mine && NETFLY ? NETFLY : null; NETFLY = null;
    S = e.st; busy = false; sel = -1;
    if (fresh || quick) {
      showPrev = false; build(); paint({ deal: !!info.again });
      if (info.again) { Kit.sfx('deal'); Kit.callout('New game'); }
      if (S.phase === 'over') setTimeout(function () { if (NET) finish(); }, info.fresh ? 300 : 700);
      NETBUSY = false; netNext(); return;
    }
    playback(mv.ev, { from: from }, function () {
      NETBUSY = false;
      if (S.phase === 'over' && NET) finish();
      netNext();
    });
  }

  // ── How to play ──
  function rules() {
    return '<p class="goal">Get rid of your tiles round after round. Every round, the dots left in your hand count against you, and after the last round the lowest total wins.</p>' +
      '<h3>The tiles and the hub</h3><ul><li>Mexican Train is played with a double-12 set: 91 tiles with 0 (blank) to 12 dots on each end. Each number has its own color, so matching ends are easy to spot.</li>' +
      '<li>There are 13 rounds. In the first round the double 12 goes in the hub in the middle of the table. That double is the <b>engine</b>. The next round the engine is the double 11, and so on down to the double blank. A shorter game plays 7 rounds, from the double 12 down to the double 6.</li>' +
      '<li>With 2 to 4 players everyone takes 15 tiles, with 5 or 6 players 12 tiles, and with 7 or 8 players 11 tiles. The rest are the <b>boneyard</b>.</li></ul>' +
      '<h3>The trains</h3><ul><li>Every player has a train of their own that runs out from the hub, with their picture at its head. There is also one public train, the <b>Mexican Train</b>, on the gold track.</li>' +
      '<li>The first tile on any train must match the engine. After that each tile matches the open end of the train.</li></ul>' +
      '<h3>Your turn</h3><ul><li>Play one tile: on your own train, on the Mexican Train (anyone can start it, on any turn), or on another player’s train if their marker is out.</li>' +
      '<li>Tap a tile. If it fits more than one train, the trains it can go on glow: tap the one you want. You can also drag the tile onto a train.</li>' +
      '<li>If nothing fits, draw one tile from the boneyard. If it fits, play it. If it doesn’t, you pass and your <b>marker</b>, a little engine, goes on your train. Now anyone can play on your train until you play on it yourself, which takes the marker off.</li></ul>' +
      '<h3>Doubles</h3><ul><li>When you play a double, you play again.</li>' +
      '<li>A double must be covered before anything else is played anywhere. The next tile goes on the double, by you or by whoever comes next. If you can’t cover it, draw one. If that tile covers it, play it. If not, you pass and put out your marker, and the next player has to cover the double.</li></ul>' +
      '<h3>The end of a round</h3><ul><li>The round ends when someone plays their last tile, even a double. It also ends when the boneyard is empty and nobody can play.</li>' +
      '<li>Everyone adds up the dots left in their hand, and the double blank counts 50. Going out scores 0.</li></ul>' +
      '<h3>Choices in the setup</h3><ul><li><b>First turn</b>: one tile, as usual, or <b>lay a train</b>: on your first turn of each round you may play as many tiles as you can on your own train, one after another, and end your turn when you like.</li>' +
      '<li><b>Doubles</b>: covered first (the usual rule), or <b>covered later</b>: play carries on everywhere and anyone can cover the double when it suits them.</li>' +
      '<li><b>Rounds</b>: 13, or 7 for a shorter game.</li></ul>' +
      '<h3>Pass and play</h3><p>Your tiles are secret. Between turns a screen asks you to pass the device, and the next player holds the button to see their tiles.</p>' +
      '<h3>Undo</h3><p>Undo takes back the tile you just played, as long as you haven’t drawn and the next player hasn’t moved.</p>' +
      '<h3>Online</h3><ul><li>Play online opens a table for up to 8 people, each on their own device. The computer plays any seat nobody takes.</li><li>Each of you sees only your own tiles. When a round ends, the next one is dealt at once, and everyone sees how the round was counted.</li></ul>';
  }

  window.MTUI = {
    init: init, start: start, resume: resume, active: active, stop: stop, undo: undo, clearSave: clearSave, rules: rules,
    net: netAPI, isNet: function () { return !!NET; }
  };
  // test hooks
  window.__mt = {
    S: function () { return S; }, busy: function () { return busy; }, speed: function (x) { SPD = x; },
    my: myTurn, legal: function () { return S ? C.legal(S) : []; },
    play: function (i) { var m = C.legal(S)[i || 0]; if (m && myTurn()) { you2({ k: 'play', id: m.id, tr: m.tr }); return true; } return false; },
    move: function (mv) { if (myTurn()) { you2(mv); return true; } return false; },
    hint: function () { return S ? C.botMove(S, S.cur) : null; },
    load: function (st) { tok++; S = st; NET = null; busy = false; showPrev = false; build(); paint(); step(); },
    geo: function () { return curG; }
  };
})();
