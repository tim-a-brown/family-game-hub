// Anoria: how to play. The quick start (about two minutes of the game being played, shown the first time you open Anoria)
// and the guide's chapters are all lessons: a made-up position on the real table (AnoriaUI.demo in ui.js), played
// step by step by a script, with a caption for each moment, a ring round what it's about and a finger where the
// tap goes. Nothing in a lesson is saved or recorded; your own game waits and comes back when the lesson closes.
//   AnoriaGuide.open()        the contents: quick start, every chapter, the rules on one page
//   AnoriaGuide.quickStart()  play the quick start now
//   AnoriaGuide.firstTime()   true until the quick start has been shown once on this account
(function () {
  'use strict';
  const KEY = 'anoria_guide';
  const el = Kit.el, UI = () => window.AnoriaUI;
  // the Places as the engine numbers them, named from your seat
  const MY_GATE = 0, MY_OUT = 1, CROSS = 4, TH_OUT = 3, TH_GATE = 2;
  const HALT = { halt: 1 };
  const mem = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const memSet = fn => { const m = mem(); fn(m); try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} };
  const myName = () => { let n = ''; try { n = localStorage.getItem('my_name') || ''; } catch (e) {} return n.trim() || 'You'; };
  const fast = () => (window.AnoriaGuide && window.AnoriaGuide.fast) || 0;   // (tests run the lessons quickly)

  // ═══ A position ══════════════════════════════════════════════════════════════════════════════════════════
  // o = {round, places: [your Gate, your Outpost, the Crossroads, their Outpost, their Gate],
  //      me, them: {guide, hand, draw (the next cards, in order), figs: [[card, Place]], relics, renown, seals, reserve, gone}}
  function table(o) {
    const U = UI(), E = U.E, C = U.C, cfg = Object.assign({}, E.DEF, { log: 1 }, E.STD);
    const pad = [C.ARCH.Explorers.cards, C.ARCH.Legion.cards];
    const S = E.newGame([pad[0].concat(pad[0]), pad[1].concat(pad[1])], [o.me.guide, o.them.guide], cfg, E.rng(11));
    const pl = o.places; S.places = [pl[0], pl[1], pl[4], pl[3], pl[2]];
    S.round = o.round || 1; S.turn = 0; S.f0 = 0;
    [o.me, o.them].forEach((x, i) => {
      const P = S.P[i];
      P.hand = (x.hand || []).slice(); P.deck = pad[i].slice(0, 14).concat((x.draw || []).slice().reverse());
      P.relics = (x.relics || []).slice(); P.renown = x.renown || 0; P.seals = x.seals == null ? 3 : x.seals; P.reserve = x.reserve || 0; P.gone = (x.gone || []).slice();
      (x.figs || []).forEach(f => S.figs.push({ u: S.uid++, c: f[0], o: i, p: f[1], rdy: 1, arr: 0, tb: 0, stun: 0, stay: 1, li: 0 }));
    });
    return S;
  }
  function seats(o) {
    const U = UI(), all = x => (x.hand || []).concat(x.draw || [], (x.figs || []).map(f => f[0]), x.relics || []);
    return [{ name: myName(), cpu: false, color: U.PCOL[0], deck: 'Explorers', guide: o.me.guide, cards: all(o.me) },
      { name: 'Sprocket', cpu: true, color: U.PCOL[1], deck: 'Legion', guide: o.them.guide, cards: all(o.them) }];
  }

  // ═══ Playing a lesson ════════════════════════════════════════════════════════════════════════════════════
  let run = null, scr = null, opening = false, ranAt = 0;
  const arr = x => x == null ? [] : Array.isArray(x) ? x : [x];
  const find = t => typeof t === 'string' ? document.querySelector(t) : t;
  // (ui.js calls this whenever the table is torn down: the lesson's captions go with it)
  function halt() {
    const r = run; if (!r) return; run = null;
    clearTimeout(r.timer); window.removeEventListener('resize', r.resize); document.removeEventListener('keydown', r.key);
    document.documentElement.classList.remove('gd-on', 'gd-dim'); r.root.remove(); if (r.wake) r.wake();
  }
  function overlay(r) {
    const d = UI().demo, L = r.lesson;
    r.txt = el('p', { class: 'gd-t' });
    r.next = el('button', { type: 'button', class: 'btn btn-primary btn-sm gd-next', text: 'Next', onclick: e => { e.stopPropagation(); go(); } });
    r.out = el('button', { type: 'button', class: r.auto ? 'btn btn-soft btn-sm gd-out' : 'icon-btn gd-out', 'aria-label': r.auto ? null : 'Close the lesson', text: r.auto ? 'Skip' : null, html: r.auto ? null : Kit.icon('close'),
      onclick: e => { e.stopPropagation(); Kit.sfx('tap'); leave(r); } });
    r.bar = el('i', { class: 'gd-bar' });
    r.plate = el('div', { class: 'gd-plate' + (r.auto ? ' auto' : ''), role: 'status', 'aria-live': 'polite' }, [
      el('div', { class: 'gd-h' }, [el('span', { class: 'gd-k', text: L.n }), r.auto ? r.out : null]), r.txt,
      r.auto ? r.bar : el('div', { class: 'gd-f' }, [r.out, r.next])]);
    r.rings = el('div', { class: 'gd-rings' });
    r.root = el('div', { class: 'gd-root', onclick: go }, [r.rings, r.plate]);
    function go() { if (r.wake) { Kit.sfx('tap'); Kit.haptic('light'); r.wake(); } }
    r.key = e => { if (document.querySelector('.k-scrim.show, .an-screen')) return; if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); go(); } else if (e.key === 'Escape') leave(r); };
    r.resize = () => { clearTimeout(r.rsT); r.rsT = setTimeout(() => { if (run === r) place(r); }, 140); };
    document.addEventListener('keydown', r.key); window.addEventListener('resize', r.resize);
    document.body.appendChild(r.root); document.documentElement.classList.add('gd-on');
    return d;
  }
  // rings round what the caption is about, and the caption where it covers none of it
  function place(r) {
    const f = r.focus || {}, W = window.innerWidth, H = window.innerHeight, rs = [];
    r.rings.innerHTML = '';
    arr(f.at).forEach((t, i) => {
      const n = find(t); if (!n) return; const b = n.getBoundingClientRect(); if (!b.width) return; rs.push(b);
      if (f.ring === false) return;
      const pad = b.width < 60 ? 5 : 3, ring = el('i', { class: 'gd-ring' + (b.width < 70 && b.height < 70 ? ' dot' : '') });
      Object.assign(ring.style, { left: (b.left - pad) + 'px', top: (b.top - pad) + 'px', width: (b.width + 2 * pad) + 'px', height: (b.height + 2 * pad) + 'px' });
      r.rings.appendChild(ring);
      const tag = arr(f.tag)[i];
      if (tag) {
        const tg = el('span', { class: 'gd-tag', text: tag }); r.rings.appendChild(tg);
        const tw = tg.offsetWidth, th = tg.offsetHeight;
        // a wide thing is named inside its left end; a small one above it (below when there's no room)
        if (b.width > 200) Object.assign(tg.style, { left: (b.left + 6) + 'px', top: (b.top + b.height / 2 - th / 2) + 'px' });
        else Object.assign(tg.style, { left: Math.max(6, Math.min(W - tw - 6, b.left + b.width / 2 - tw / 2)) + 'px', top: (b.top - th - 8 > 60 ? b.top - th - 8 : b.bottom + 8) + 'px' });
      }
    });
    arr(f.keep).forEach(t => { const n = find(t); if (n) { const b = n.getBoundingClientRect(); if (b.width) rs.push(b); } });
    // the caption: bottom of the screen if that's clear, else wherever it covers least
    const P = r.plate, land = W > H * 1.15, m = 10, cs = getComputedStyle(document.documentElement);
    const bar = (parseFloat(cs.getPropertyValue('--bar')) || 58) + 6;
    // (sideways the table is the map on the left and everything else on the right: the caption is as wide as that right side)
    const mp = land ? document.querySelector('#app .an-map') : null, mb = mp ? mp.getBoundingClientRect() : { left: m, right: W * .56 };
    P.classList.toggle('wide', land && H < 540);
    P.style.width = Math.round(f.clash ? Math.min(W - 2 * m, 620) : Math.min(land ? Math.max(280, Math.min(W - mb.right - 2 * m, mb.right - mb.left)) : W - 2 * m, 470)) + 'px';
    const pw = P.offsetWidth, ph = P.offsetHeight, cx = (W - pw) / 2, bot = H - ph - m - (parseFloat(cs.getPropertyValue('--safe-b')) || 0);
    const lx = Math.max(m, mb.left), spots = f.clash ? [[cx, bot]] : land ? [[W - pw - m, bot], [lx, bot], [W - pw - m, bar], [lx, bar], [cx, bot]] : [[cx, bot], [cx, bar], [cx, (H - ph) / 2]];
    let best = spots[0], bv = Infinity;
    spots.forEach(s => {
      let v = 0; rs.forEach(b => { const w = Math.min(s[0] + pw, b.right) - Math.max(s[0], b.left), h = Math.min(s[1] + ph, b.bottom) - Math.max(s[1], b.top); if (w > 0 && h > 0) v += w * h; });
      if (v < bv - 1) { bv = v; best = s; }
    });
    P.style.left = Math.round(best[0]) + 'px'; P.style.top = Math.round(best[1]) + 'px';
  }
  function show(r, text, o) {
    o = o || {};
    r.txt.innerHTML = text; r.focus = { at: o.at, keep: o.keep, tag: o.tag, ring: o.ring, clash: o.clash };
    r.plate.classList.add('on'); r.plate.classList.remove('tick'); void r.plate.offsetWidth; r.plate.classList.add('tick');
    place(r);
  }
  // what a lesson's script calls: every step is a promise that throws HALT if the lesson was closed meanwhile
  function helpers(r, d) {
    const my = r.my, alive = () => run === r && d.gen() === my;
    const ok = v => { if (!alive() || v === false) throw HALT; return v; };
    const S = () => d.S();
    const legal = (pred, what) => { const a = d.acts().find(pred); if (!a) throw new Error('guide: not a legal step: ' + what); return a; };
    const fig = (key, o) => { const f = S().figs.find(x => x.c === key && x.o === (o || 0)); if (!f) throw new Error('guide: no ' + key + ' on the table'); return f; };
    const hand = (key, o) => { const h = S().P[o || 0].hand.indexOf(key); if (h < 0) throw new Error('guide: ' + key + ' is not in hand'); return h; };
    const L = {
      S: S, fig: fig, first: !!r.o.first,
      card: key => '.an-hand .hc[data-h="' + hand(key) + '"]', row: p => '.pl[data-p="' + p + '"]', piece: (key, o) => '.fp[data-u="' + fig(key, o).u + '"]',
      pause: ms => d.wait(ms / (fast() || 1)).then(ok),
      // a caption, and wait: for a tap (a chapter) or for long enough to read it (the quick start)
      say(text, o) {
        ok(); show(r, text, o); r.plate.classList.remove('busy');
        // (long enough to read it and then look at what it points to: Tim found 1 s + 44 ms a letter too fast)
        const ms = Math.max(3800, 1800 + text.replace(/<[^>]+>/g, '').length * 62) / (fast() ? 40 : 1);
        if (r.auto) { r.bar.style.animation = 'none'; void r.bar.offsetWidth; r.bar.style.animation = 'gd-fill ' + ms + 'ms linear forwards'; }
        return new Promise((res, rej) => {
          r.wake = () => { r.wake = null; clearTimeout(r.timer); r.rings.innerHTML = ''; r.focus = { keep: r.focus && r.focus.keep, clash: r.focus && r.focus.clash }; r.plate.classList.add('busy'); if (alive()) res(); else rej(HALT); };
          if (window.AnoriaGuide.hold) return;   // (tests step through by hand)
          if (r.auto || fast()) r.timer = setTimeout(r.wake, fast() && !r.auto ? 30 : ms);
        });
      },
      // a caption that stays up while the next thing plays
      note(text, o) { ok(); show(r, text, o); r.plate.classList.add('busy'); if (r.auto) r.bar.style.animation = 'none'; },
      // the same, with time to read it before the table starts to move
      async tell(text, o) { L.note(text, o); await L.pause(Math.max(1500, text.replace(/<[^>]+>/g, '').length * 36)); },
      hush() { r.plate.classList.remove('on'); r.rings.innerHTML = ''; r.focus = null; },
      // a finger comes down where a player would tap
      async tap(t) {
        const n = find(t); if (!n) return; const b = n.getBoundingClientRect(), f = el('i', { class: 'gd-tap' });
        f.style.left = (b.left + b.width / 2) + 'px'; f.style.top = (b.top + b.height * .56) + 'px'; r.root.appendChild(f); setTimeout(() => f.remove(), 900);
        await L.pause(460); Kit.haptic('light');
      },
      async turn(o) { ok(await d.turn(o || 0)); },
      async endTurn(o) { if (!o) { await L.tap('.an-strip.me .st-go'); Kit.sfx('pop'); } ok(await d.endTurn()); },
      async count(keep) { if (!keep) L.hush(); ok(await d.count()); },
      async round() { L.hush(); ok(await d.round()); },
      set(fn) { ok(); d.set(fn); },
      speed(n) { d.speed(fast() || n); },
      // the table dims, the position changes, the table comes back
      async later(text, fn) {
        L.note(text, {}); document.documentElement.classList.add('gd-dim'); await L.pause(520);
        d.light(false); d.set(fn); document.documentElement.classList.remove('gd-dim'); await L.pause(700);
      },
      // your own steps, the way a player makes them: tap what to play (everywhere it can go lights up), tap where
      // o.lit: a caption to read while the lights are on
      async lift(sel, o) { await L.tap(sel.kind === 'hand' ? '.an-hand .hc[data-h="' + sel.h + '"]' : '.fp[data-u="' + sel.u + '"]'); d.lift(sel); if (o && o.lit) await L.say(o.lit, o); else await L.pause(700); },
      async play(key, p, o) {
        const h = hand(key), a = legal(x => x.t === 'fig' && x.h === h && x.p === p, key + ' to ' + p);
        await L.lift({ kind: 'hand', h: h }, o && o.lit ? Object.assign({ keep: ['.an-hand', L.row(p)] }, o) : null);
        await L.tap(L.row(p) + ' .pl-tile'); ok(await d.act(a)); await L.pause(350);
      },
      async relic(key, o) {
        const h = hand(key), a = legal(x => x.t === 'relic' && x.h === h, key);
        await L.lift({ kind: 'hand', h: h }, o && o.lit ? Object.assign({ keep: ['.an-hand', '.an-strip.me'] }, o) : null);
        await L.tap('.an-strip.me .relic.tgt'); ok(await d.act(a)); await L.pause(350);
      },
      async deed(key, o) {
        const h = hand(key), a = legal(x => x.t === 'deed' && x.h === h, key);
        await L.lift({ kind: 'hand', h: h }, o && o.lit ? Object.assign({ keep: ['.an-hand', '.an-cap'] }, o) : null);
        await L.tap('.an-cap .cap-play'); ok(await d.act(a)); await L.pause(350);
      },
      async walk(key, p, o) {
        const u = fig(key).u, a = legal(x => x.t === 'walk' && x.u === u && x.p === p, key + ' walks to ' + p);
        await L.lift({ kind: 'fig', u: u }, o && o.lit ? Object.assign({ keep: ['.an-map'] }, o) : null);
        await L.tap(L.row(p) + ' .pl-tile'); ok(await d.act(a)); await L.pause(350);
      },
      // dice: [yours, theirs]. o.hold: captions to read while the clash is on the screen
      async clash(key, foe, dice, o) {
        o = o || {}; const u = fig(key).u, v = fig(foe, 1).u, a = legal(x => x.t === 'clash' && x.u === u && x.v === v && !x.ph, key + ' against ' + foe);
        await L.lift({ kind: 'fig', u: u }, o.lit ? Object.assign({ keep: ['.an-map'] }, o) : null);
        await L.tap('.fp[data-u="' + v + '"]'); L.hush(); held(o.hold);
        ok(await d.act(a, dice)); await L.pause(350);
      },
      // the other player's steps: no fingers, just the moves
      them: {
        async turn() { ok(await d.turn(1)); await L.pause(350); },
        async play(key, p) { const h = hand(key, 1); ok(await d.act(legal(x => x.t === 'fig' && x.h === h && x.p === p, 'their ' + key))); await L.pause(420); },
        async walk(key, p) { const u = fig(key, 1).u; ok(await d.act(legal(x => x.t === 'walk' && x.u === u && x.p === p, 'their ' + key + ' walks'))); await L.pause(420); },
        async clash(key, foe, dice, o) { const u = fig(key, 1).u, v = fig(foe).u; L.hush(); held(o && o.hold); ok(await d.act(legal(x => x.t === 'clash' && x.u === u && x.v === v && !x.ph, 'their ' + key + ' clashes'), dice)); await L.pause(350); },
        async endTurn() { ok(await d.endTurn()); await L.pause(250); }
      }
    };
    // (the clash stays on the screen while its captions are read)
    function held(lines) { if (lines && lines.length) d.holdClash(async () => { for (const t of lines) await L.say(t, { clash: true }); L.hush(); }); }
    return L;
  }
  function endCard(r, o) {
    r.plate.classList.remove('on'); r.rings.innerHTML = ''; r.focus = null; r.wake = null;
    const card = el('div', { class: 'gd-end', role: 'dialog', 'aria-label': o.title, onclick: e => e.stopPropagation() }, [
      el('div', { class: 'gd-k', text: o.k }), el('h2', { text: o.title }), o.text ? el('p', { html: o.text }) : null,
      el('div', { class: 'gd-end-b' }, o.actions.filter(Boolean).map((a, i) => el('button', { type: 'button', class: 'btn ' + (i ? 'btn-soft' : 'btn-primary'), text: a.label, onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); a.fn(); } })))]);
    r.root.classList.add('ended'); r.root.appendChild(card); requestAnimationFrame(() => card.classList.add('on')); Kit.sfx('good');
  }
  // closing a lesson: back to the contents if that's where it was opened, else back to your own game or the setup
  function leave(r) { const o = r.o; halt(); if (o.from === 'contents') open(); else finish(); }
  function finish() { ranAt = Date.now(); const d = UI().demo; if (d.on()) d.end(); }
  async function play(L, o) {
    o = o || {}; halt(); if (scr) { opening = true; scr.close(); opening = false; }
    const U = UI(), d = U.demo, spec = L.table();
    const r = { lesson: L, auto: !!L.auto, o: o };
    r.my = d.begin({ S: table(spec), players: seats(spec) });
    run = r; overlay(r);
    if (fast()) d.speed(fast());
    try {
      await L.run(helpers(r, d));
      if (run !== r) return;
      memSet(m => { (m.seen = m.seen || {})[L.id] = 1; });
      endCard(r, L.end(r, o));
    } catch (e) {
      if (e === HALT) return;
      if (window.console) console.error('anoria guide', L.id, e);
      if (run === r) leave(r);
    }
  }

  const d_count = L => L.count(true);   // (the quick start's caption stays up through the count)

  // ═══ The quick start ═════════════════════════════════════════════════════════════════════════════════════
  const QUICK = {
    id: 'quick', n: 'Quick start', auto: true,
    table: () => ({ round: 1, places: ['nineveh', 'petra', 'library', 'seneca', 'wall'],
      me: { guide: 'leonardo', hand: ['copernicus', 'galileo', 'compass', 'eureka', 'zhenghe'], draw: ['hatshepsut', 'marcopolo', 'hypatia', 'press', 'daedalus', 'fairwinds'] },
      them: { guide: 'suntzu', hand: ['leonidas', 'tomoe', 'joan', 'yisunsin', 'boudica'], draw: ['spartacus', 'saladin', 'hannibal', 'ambush'] } }),
    async run(L) {
      await L.pause(400); L.speed(.8);   // (a learner's pace: the table moves a little slower than in a real game)
      if (L.first) await L.say('Welcome to Anoria. Here are about two minutes of the game being played.');
      await L.say('Five Places lie between you and the other player. Your Gate is nearest you.', { at: [L.row(MY_GATE), L.row(TH_GATE)], tag: ['Your Gate', 'Their Gate'], keep: '.an-map' });
      await L.turn(0);
      await L.say('Each turn you draw 2 cards and gain <b>Spark</b> to spend.', { at: '.an-strip.me .st-spark', keep: '.an-hand' });
      await L.play('hatshepsut', MY_GATE, { lit: 'When you tap a Figure, the Places it can reach light up.' });
      await L.say('It arrives at your Gate. The number on its shield is its <b>Might</b>.', { at: L.piece('hatshepsut') });
      await L.tell('Then the other player takes a turn.');
      await L.endTurn(); await L.them.turn(); await L.them.play('spartacus', TH_GATE); await L.pause(900); await L.them.endTurn();
      await L.tell('When both have played, the round is counted.');
      await d_count(L);
      await L.say('Whoever has more Might at a Place holds it, and scores 1 <b>Renown</b>.', { at: ['.an-strip.me .st-ren', '.an-strip.opp .st-ren'] });
      await L.tell('This is round 2. Each round brings one more Spark.');
      await L.them.turn(); await L.them.walk('spartacus', TH_OUT); await L.them.endTurn();
      await L.turn(0);
      await L.walk('hatshepsut', MY_OUT, { lit: 'A Figure can walk one step each turn.' });
      await L.later('A few rounds on…', S => {
        S.round = 4; S.P[0].renown = 6; S.P[1].renown = 6; S.P[0].spark = 0;
        const at = (k, o, p) => { const f = S.figs.find(x => x.c === k && x.o === o); f.p = p; f.rdy = 1; f.arr = 0; f.acted = 0; };
        const add = (k, o, p) => { S.figs.push({ u: S.uid++, c: k, o: o, p: p, rdy: 1, arr: 0, tb: 0, stun: 0, stay: 1, li: 0 }); const h = S.P[o].hand.indexOf(k); if (h >= 0) S.P[o].hand.splice(h, 1); };
        at('hatshepsut', 0, MY_OUT); at('spartacus', 1, TH_OUT); add('copernicus', 0, CROSS); add('tomoe', 1, CROSS); add('leonidas', 1, TH_GATE);
      });
      await L.turn(0);
      await L.clash('copernicus', 'tomoe', [5, 3], { lit: 'Two Figures at the same Place can <b>clash</b>.', at: [L.piece('copernicus'), L.piece('tomoe', 1)],
        hold: ['Both roll a die. The higher roll adds 1 Might, and the Figure with the lower total is knocked out.'] });
      await L.tell('The Crossroads is yours.');
      await L.endTurn(); await d_count(L);
      await L.say('From round 4 every Place scores 2. <b>The first player to 30 Renown wins.</b>', { at: '.an-strip.me .st-ren' });
      await L.say('You can also win by breaking all 3 of their <b>Seals</b>. One Seal breaks each time you hold their Gate when a round is counted.', { at: ['.an-strip.opp .st-seals', L.row(TH_GATE)] });
    },
    end(r, o) {
      const first = !UI().Coll.load().starter;
      return { k: 'Quick start', title: 'That’s the game', text: 'Relics, Deeds, Guides and Threads add the twists. The guide has a short lesson on each, under the <b>?</b> at the top.',
        actions: [{ label: o.from === 'contents' ? 'Back to the guide' : first ? 'Choose your Guide' : 'Done', fn: () => leave(r) },
          { label: 'Watch it again', fn: () => play(QUICK, o) },
          o.from === 'contents' ? null : { label: 'See the full guide', fn: () => { halt(); open(); } }] };
    }
  };

  // ═══ The chapters ════════════════════════════════════════════════════════════════════════════════════════
  const PL = ['globe', 'nineveh', 'library', 'seneca', 'wall'];
  const CHAPTERS = [
    { id: 'map', n: 'The map and the goal', sub: 'Five Places, 30 Renown, 3 Seals', art: 'library',
      table: () => ({ round: 1, places: PL, me: { guide: 'leonardo', hand: ['copernicus', 'galileo', 'compass', 'eureka', 'hatshepsut'] }, them: { guide: 'suntzu', hand: ['leonidas', 'tomoe', 'joan', 'phalanx', 'boudica'] } }),
      async run(L) {
        await L.pause(400);
        await L.say('Five Places lie in a line between you and the other player.', { at: '.an-map' });
        await L.say('The two nearest you are your side: your <b>Gate</b> and your <b>Outpost</b>.', { at: [L.row(MY_OUT), L.row(MY_GATE)], tag: ['Your Outpost', 'Your Gate'] });
        await L.say('The <b>Crossroads</b> in the middle is shared.', { at: L.row(CROSS), tag: 'The Crossroads' });
        await L.say('The far two are the other player’s side.', { at: [L.row(TH_GATE), L.row(TH_OUT)], tag: ['Their Gate', 'Their Outpost'] });
        await L.say('Every Place has a rule of its own, printed under its name. Tap a Place to read it.', { at: L.row(CROSS) + ' .pl-plate' });
        await L.say('Hold Places to score <b>Renown</b>. The first player to reach 30 at the end of a round wins.', { at: '.an-strip.me .st-ren' });
        await L.say('Each player has 3 <b>Seals</b>. A player who loses all three loses the game at once.', { at: ['.an-strip.me .st-seals', '.an-strip.opp .st-seals'] });
      } },
    { id: 'turn', n: 'Your turn', sub: 'Cards, Spark and what carries over', art: 'copernicus',
      table: () => ({ round: 3, places: PL, me: { guide: 'cleopatra', renown: 3, hand: ['copernicus', 'compass', 'galileo', 'zhenghe'], draw: ['hypatia', 'eureka'], figs: [['hatshepsut', MY_GATE]] },
        them: { guide: 'suntzu', renown: 5, hand: ['leonidas', 'joan', 'phalanx', 'boudica'], figs: [['tomoe', TH_GATE]] } }),
      async run(L) {
        await L.pause(400); await L.turn(0);
        await L.say('Your turn starts the same way every time. Your Figures are ready to act again, and you draw 2 cards.', { at: [L.card('hypatia'), L.card('eureka')] });
        await L.say('You gain <b>Spark</b>: 2 in round 1 and one more each round, up to 7. This is round 3, so you gain 4.', { at: '.an-strip.me .st-spark', keep: '.an-cap' });
        await L.say('You are behind on Renown, so you get 1 extra, which makes 5.', { at: ['.an-strip.me .st-spark', '.an-strip.me .st-ren', '.an-strip.opp .st-ren'] });
        await L.say('Cards you can pay for glow. Play as many as you like, in any order.', { at: '.an-hand' });
        await L.play('copernicus', MY_GATE);
        await L.say('Copernicus cost 3, so you have 2 left.', { at: '.an-strip.me .st-spark' });
        await L.endTurn();
        await L.say('You keep up to 2 Spark you don’t spend through the other player’s turn. A card like Phalanx is paid for with that Spark.', { at: '.an-strip.me .st-spark' });
        await L.say('You can hold 8 cards when your turn ends. If you have more, you choose which ones to discard.', { at: '.an-hand' });
      } },
    { id: 'figures', n: 'Figures', sub: 'Arriving, walking, one thing a turn', art: 'hatshepsut',
      table: () => ({ round: 3, places: PL, me: { guide: 'cleopatra', hand: ['copernicus', 'galileo', 'compass'], draw: ['eureka', 'hypatia'], figs: [['hatshepsut', MY_OUT]] },
        them: { guide: 'suntzu', hand: ['leonidas', 'joan', 'phalanx'], figs: [['tomoe', TH_OUT]] } }),
      async run(L) {
        await L.pause(400); await L.turn(0);
        await L.play('copernicus', MY_OUT, { lit: 'A Figure arrives at your Gate, or at any Place where you already have a Figure.', at: [L.row(MY_GATE), L.row(MY_OUT)] });
        await L.say('A Figure that has just arrived can’t walk this turn. It can still clash.', { at: L.piece('copernicus') });
        await L.walk('hatshepsut', CROSS, { lit: 'Each Figure does one thing a turn: <b>walk</b> one step to the next Place, or <b>clash</b>.', at: L.piece('hatshepsut') });
        await L.say('A Figure that has acted goes dim until your next turn.', { at: L.piece('hatshepsut') });
        await L.say('Up to 3 of your Figures can stand at one Place.', { at: L.row(MY_OUT) + ' .pl-side.R' });
      } },
    { id: 'might', n: 'Might, home and away', sub: 'Shields, home regions and Voyagers', art: 'daedalus',
      table: () => ({ round: 4, places: PL, me: { guide: 'cleopatra', hand: ['copernicus', 'daedalus', 'galileo'], draw: ['eureka', 'hypatia', 'compass', 'press'] },
        them: { guide: 'suntzu', hand: ['leonidas', 'joan', 'phalanx'], figs: [['tomoe', TH_GATE]] } }),
      async run(L) {
        await L.pause(400); await L.turn(0);
        await L.play('copernicus', MY_GATE, { lit: 'The number on a card’s shield is its <b>Might</b>. Copernicus has 4.', at: L.card('copernicus') });
        await L.say('Here he has 5. The Globe Theatre is in Europe, his <b>home region</b>, and a Figure at home has +1. The small house shows that he is at home.', { at: L.piece('copernicus') });
        await L.play('daedalus', MY_GATE);
        await L.say('Daedalus is a <b>Voyager</b>, so he is at home at every Place.', { at: L.piece('daedalus') });
        await L.say('The two numbers on a Place are each side’s total Might there.', { at: L.row(MY_GATE) + ' .pl-tots' });
        await L.later('Your next turn…', S => { S.figs.forEach(f => { f.rdy = 1; f.arr = 0; f.acted = 0; }); });
        await L.turn(0);
        await L.walk('copernicus', MY_OUT);
        await L.say('Away from home, Copernicus is back to 4.', { at: L.piece('copernicus') });
        await L.walk('daedalus', TH_OUT, { lit: 'And a Voyager can walk to any Place, not just the next one.', at: L.piece('daedalus') });
      } },
    { id: 'clash', n: 'A clash', sub: 'Dice, Guards and Bounty', art: 'leonidas',
      table: () => ({ round: 4, places: PL, me: { guide: 'cleopatra', renown: 7, hand: ['galileo', 'compass'], draw: ['eureka', 'hypatia'], figs: [['copernicus', CROSS], ['haytham', TH_OUT]] },
        them: { guide: 'tubman', renown: 8, hand: ['joan', 'boudica'], figs: [['tomoe', CROSS], ['leonidas', TH_OUT], ['spartacus', TH_OUT]] } }),
      async run(L) {
        await L.pause(400); await L.turn(0);
        await L.clash('copernicus', 'tomoe', [4, 2], { lit: 'A Figure can clash with an enemy at the same Place. The numbers over the enemy are the Might on each side.', at: [L.piece('copernicus'), L.piece('tomoe', 1)],
          hold: ['Both roll a die. The higher roll adds 1 to its Figure’s Might.', 'Then the Figure with the lower total is knocked out. If the totals are tied, both stay.'] });
        await L.say('The other player was ahead on Renown, so that knock-out is a <b>Bounty</b>, worth 1 Renown.', { at: '.an-strip.me .st-ren' });
        await L.clash('haytham', 'leonidas', [6, 2], { lit: 'Leonidas is a <b>Guard</b>: enemies here must clash with him first. He is also <b>Steadfast</b>, which gives him +2 Might when he defends.', at: L.piece('leonidas', 1),
          hold: ['A roll that wins by 3 or more adds 2 Might instead of 1.'] });
        await L.say('A Figure can clash the turn it arrives, but each Figure acts only once a turn.', { at: L.piece('haytham') });
      } },
    { id: 'relics', n: 'Relics and Deeds', sub: 'Cards that stay, cards that happen once', art: 'compass',
      table: () => ({ round: 3, places: PL, me: { guide: 'cleopatra', hand: ['compass', 'eureka', 'phalanx', 'galileo'], draw: ['hypatia', 'zhenghe', 'press', 'daedalus'], figs: [['copernicus', MY_GATE]] },
        them: { guide: 'tubman', hand: ['joan', 'boudica'], draw: ['saladin', 'ambush'], figs: [['tomoe', CROSS]] } }),
      async run(L) {
        await L.pause(400); await L.turn(0);
        await L.relic('compass', { lit: 'A <b>Relic</b> goes beside your Guide and stays in play.', at: '.an-strip.me .st-relics' });
        await L.say('You can have 2 Relics at a time.', { at: '.an-strip.me .st-relics' });
        await L.walk('copernicus', CROSS, { lit: 'The Compass lets your Figures walk two steps.', at: [L.row(MY_OUT), L.row(CROSS)] });
        await L.deed('eureka', { lit: 'A <b>Deed</b> happens once and is gone. Eureka! draws 2 cards.', at: L.card('eureka') });
        await L.endTurn();
        await L.say('You ended the turn with 2 Spark unspent and Phalanx in your hand.', { at: ['.an-strip.me .st-spark', L.card('phalanx')] });
        await L.them.turn();
        await L.them.clash('tomoe', 'copernicus', [4, 2], { hold: ['<b>Phalanx</b> plays itself when it saves your Figure, paid for with the Spark you kept.'] });
        await L.say('You can read a Relic or a Deed the same way as any card, by tapping it.', { at: '.an-strip.me .st-relics' });
      } },
    { id: 'guide', n: 'Your Guide', sub: 'A power that is always on', art: 'leonardo',
      table: () => ({ round: 2, places: PL, me: { guide: 'leonardo', hand: ['press', 'copernicus', 'galileo', 'eureka'], draw: ['hypatia', 'compass'] },
        them: { guide: 'suntzu', hand: ['leonidas', 'joan', 'phalanx'], figs: [['tomoe', TH_GATE]] } }),
      async run(L) {
        await L.pause(400);
        await L.say('Your <b>Guide</b> stands beside you all game. Their power is always on.', { at: '.an-strip.me .st-guide' });
        await L.turn(0);
        await L.relic('press', { lit: 'Leonardo da Vinci makes Relics cost 1 less. The Printing Press costs 2, so with him you pay 1.', at: ['.an-strip.me .st-guide', '.an-strip.me .st-spark'] });
        await L.say('The other player has a Guide too. Tap either one to read it.', { at: '.an-strip.opp .st-guide' });
        await L.say('You start with one Guide. More join you as you win, at 3, 8, 15 and 25 wins.', { at: '.an-strip.me .st-guide' });
      } },
    { id: 'legacy', n: 'Legacy lines and Threads', sub: 'Who inspired whom', art: 'virgil',
      table: () => ({ round: 3, places: ['petra', 'nineveh', 'library', 'seneca', 'wall'], me: { guide: 'cleopatra', hand: ['virgil', 'eureka', 'galileo'], draw: ['hypatia', 'compass', 'press', 'daedalus'], figs: [['homer', MY_OUT], ['archimedes', CROSS]] },
        them: { guide: 'suntzu', hand: ['leonidas', 'joan', 'phalanx'], figs: [['tomoe', TH_GATE]] } }),
      async run(L) {
        await L.pause(400); await L.turn(0);
        await L.play('virgil', MY_GATE, { lit: 'A <b>Legacy</b> Figure names who inspired it. Virgil modelled the Aeneid on Homer, and Homer is on your side.', at: [L.card('virgil'), L.piece('homer')] });
        await L.say('A gold line joins them. Virgil cost 1 less, has +1 Might while Homer stands, and you score 1 Renown.', { at: [L.piece('virgil'), L.piece('homer')] });
        await L.later('The next round…', S => { S.round = 4; S.P[0].lr = 0; S.figs.forEach(f => { f.rdy = 1; f.arr = 0; f.acted = 0; }); });
        await L.turn(0);
        await L.deed('eureka', { lit: 'A <b>Thread</b> works the same way for any card that grew out of something. Eureka! came from Archimedes.', at: [L.card('eureka'), L.piece('archimedes')] });
        await L.say('Archimedes stands on your side, so playing it scores 1 Renown.', { at: '.an-strip.me .st-ren' });
        await L.say('Lines and Threads score once a round between them. Read a card to see what it grew from.', { at: '.an-hand' });
      } },
    { id: 'count', n: 'The count', sub: 'Who holds what, and what it scores', art: 'acropolis',
      table: () => ({ round: 3, places: PL, me: { guide: 'leonardo', renown: 4, hand: ['galileo', 'compass'], figs: [['copernicus', MY_GATE], ['hatshepsut', MY_OUT]] },
        them: { guide: 'suntzu', renown: 5, hand: ['joan', 'phalanx'], figs: [['leonidas', MY_OUT], ['tomoe', CROSS]] } }),
      async run(L) {
        await L.pause(400);
        await L.say('When both players have had a turn, the round is counted, Place by Place.', { at: '.an-map' });
        await L.count();
        await L.say('The side with more Might holds a Place. In rounds 1 to 3 each Place scores 1 Renown.', { at: L.row(MY_GATE) });
        await L.say('When the Might is tied, nobody holds the Place.', { at: L.row(MY_OUT) });
        await L.say('An empty or tied Gate stays with its owner.', { at: L.row(TH_GATE) });
        await L.round();
        await L.say('From round 4 every Place scores 2. The banner on a Place shows what it is worth, in the colour of whoever holds it now.', { at: L.row(CROSS) + ' .pl-flag' });
        await L.say('Whoever has more Renown goes first next round, so the player behind has the last word.', { at: ['.an-strip.me .st-ren', '.an-strip.opp .st-ren'] });
        await L.say('If both players pass 30 in the same round, whoever has more Renown wins. The game also ends after 14 rounds, and again whoever has more Renown wins.', { at: '.an-cap .cap-round' });
      } },
    { id: 'seals', n: 'Gates and Seals', sub: 'The other way to win', art: 'wall',
      table: () => ({ round: 5, places: PL, me: { guide: 'leonardo', renown: 12, hand: ['galileo', 'compass'], figs: [['zhenghe', TH_GATE], ['copernicus', MY_GATE]] },
        them: { guide: 'suntzu', renown: 13, hand: ['joan', 'phalanx'], figs: [['spartacus', TH_GATE], ['tomoe', CROSS]] } }),
      async run(L) {
        await L.pause(400);
        await L.say('Your Figures can walk all the way to the other player’s Gate.', { at: L.row(TH_GATE) });
        await L.say('Zheng He has more Might there than their Figure. Watch the count.', { at: [L.piece('zhenghe'), L.piece('spartacus', 1)] });
        await L.count();
        await L.say('If you hold their Gate when the round is counted, one of their <b>Seals</b> breaks and you score 1 more Renown.', { at: '.an-strip.opp .st-seals' });
        await L.say('If you break all 3, you win on the spot, no matter what the Renown is.', { at: '.an-strip.opp .st-seals' });
        await L.say('It works both ways. An empty Gate is safe, but a Gate with only their Figures in it is not.', { at: L.row(MY_GATE) });
      } },
    { id: 'twins', n: 'Two of a card', sub: 'One of each person, and the return', art: 'galileo',
      table: () => ({ round: 4, places: PL, me: { guide: 'cleopatra', hand: ['copernicus', 'galileo', 'eureka'], draw: ['hypatia', 'compass', 'press', 'daedalus'], figs: [['copernicus', CROSS]] },
        them: { guide: 'tubman', hand: ['joan', 'boudica'], draw: ['saladin', 'ambush'], figs: [['charlemagne', CROSS]] } }),
      async run(L) {
        await L.pause(400); await L.turn(0);
        await L.lift({ kind: 'hand', h: 0 }, { lit: 'A deck holds two of each card, but only <b>one of each person</b> can stand on your side at a time.', at: [L.card('copernicus'), L.piece('copernicus')], keep: '.an-cap' });
        UI().demo.drop();
        await L.endTurn(); await L.them.turn();
        await L.them.clash('charlemagne', 'copernicus', [4, 4]);
        await L.them.endTurn();
        await L.later('Your next turn…', S => { S.round = 5; });
        await L.turn(0);
        await L.play('copernicus', MY_GATE, { lit: '<b>The return</b>: a Figure whose other copy is in your discard pile costs 1 less. Copernicus comes back for 2.', at: L.card('copernicus') });
        await L.say('A pack never gives you a third copy of a card.', { at: L.piece('copernicus') });
      } },
    { id: 'read', n: 'Reading a card', sub: 'Skills, home and Threads', art: 'hypatia',
      table: () => ({ round: 3, places: PL, me: { guide: 'leonardo', hand: ['galileo', 'compass', 'eureka'], figs: [['leonidas', MY_OUT], ['copernicus', MY_GATE]] },
        them: { guide: 'suntzu', hand: ['joan', 'phalanx'], figs: [['tomoe', TH_GATE]] } }),
      async run(L) {
        await L.pause(400);
        await L.say('Tap any card, Figure, Guide or Place to read it full size.', { at: L.piece('leonidas') });
        await L.tap(L.piece('leonidas')); L.hush(); UI().openView('leonidas', { u: L.fig('leonidas').u }); await L.pause(3400); UI().closeView(); await L.pause(300);
        await L.say('A Figure’s skills are in bold on its card, each with what it does: Guard, Steadfast, Scholar, Swift, Inspiring, Raider, Voyager.', { at: L.piece('leonidas') });
        await L.say('The card also names its home region and any Thread, which is what it grew from or what grew from it.', { at: L.piece('leonidas') });
        await L.say('Every card you own, and every one you have seen, is in the Library.', {});
      } }
  ];
  CHAPTERS.forEach((c, i) => {
    c.end = (r, o) => { const nx = CHAPTERS[i + 1];
      return { k: 'Chapter ' + (i + 1) + ' of ' + CHAPTERS.length, title: c.n, text: nx ? null : 'That is every rule. The cards do the rest.',
        actions: [nx ? { label: 'Next: ' + nx.n, fn: () => play(nx, o) } : { label: 'Done', fn: () => leave(r) }, { label: 'Watch it again', fn: () => play(c, o) }, nx ? { label: 'All chapters', fn: () => { halt(); open(); } } : null] }; };
  });

  // ═══ The contents ════════════════════════════════════════════════════════════════════════════════════════
  function open() {
    const U = UI(); if (!U) return; halt(); if (scr) return;
    const seen = mem().seen || {}, from = { from: 'contents' };
    const tick = id => seen[id] ? el('span', { class: 'gd-seen', html: Kit.icon('check'), 'aria-label': 'Watched' }) : el('span', { class: 'gd-go', html: Kit.icon('play') });
    scr = U.screen({ title: 'How to play', cls: 'an-gd', onClose: () => { scr = null; if (!opening) finish(); } });
    const art = k => { const s = el('span', { class: 'gd-art' }); const im = U.artImg(k, true); if (im) s.appendChild(im); return s; };
    const b = scr.body;
    b.appendChild(el('button', { type: 'button', class: 'gd-qs', onclick: () => { Kit.sfx('tap'); play(QUICK, from); } }, [
      el('span', { class: 'gd-qs-play', html: Kit.icon('play') }),
      el('span', { class: 'gd-qs-t' }, [el('b', { text: 'Quick start' }), el('small', { text: 'About two minutes of the game being played' })]),
      el('span', { class: 'gd-qs-arts' }, [art('hatshepsut'), art('copernicus'), art('tomoe')])]));
    b.appendChild(el('h2', { class: 'gd-sec', text: 'The guide' }));
    b.appendChild(el('p', { class: 'gd-lead', text: 'Twelve short lessons, each played out on the table.' }));
    const list = el('div', { class: 'gd-list' });
    CHAPTERS.forEach((c, i) => list.appendChild(el('button', { type: 'button', class: 'gd-row' + (seen[c.id] ? ' seen' : ''), onclick: () => { Kit.sfx('tap'); play(c, from); } }, [
      art(c.art), el('span', { class: 'gd-n', text: String(i + 1) }), el('span', { class: 'gd-row-t' }, [el('b', { text: c.n }), el('small', { text: c.sub })]), tick(c.id)])));
    b.appendChild(list);
    b.appendChild(el('button', { type: 'button', class: 'gd-all', onclick: () => Kit.rules() }, [el('span', { class: 'gd-all-i', html: Kit.icon('book') }), el('span', { class: 'gd-row-t' }, [el('b', { text: 'Every rule on one page' }), el('small', { text: 'To look something up' })])]));
  }

  window.AnoriaGuide = {
    open: open, halt: halt, quickStart: o => { memSet(m => { m.qs = 1; }); return play(QUICK, Object.assign({ first: !UI().Coll.load().starter }, o)); },
    firstTime: () => !mem().qs, justRan: () => Date.now() - ranAt < 1500, chapters: () => CHAPTERS.map(c => c.id), play: id => play(id === 'quick' ? QUICK : CHAPTERS.find(c => c.id === id), {}), running: () => !!run
  };
})();
