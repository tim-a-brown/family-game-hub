// Anoria: choosing your starter and opening packs.
//   AnoriaPacks.chooseStarter(app, done)  the first time: the five Guides side by side; the one you choose brings
//                                         their deck, then your welcome packs are opened
//   AnoriaPacks.open(done)                open the packs that are waiting (none waiting: what earns the next one)
//   AnoriaPacks.earned(list, done)        after a won game ([{t:'pack', pack} | {t:'guide', g}]): a new Guide joins
//                                         first, then the packs are opened
// Opening a pack has three beats. The sealed pack is torn across its top (a swipe the tear follows; a tap, Enter or
// Space tears it for you). Its cards come out face down and are turned by the player. It ends on a tally. The cards
// are decided and saved by AnoriaColl.openPack at the moment of the tear, so leaving half way loses nothing.
// A card turns over in the edition it was found in (editions.js). A foil has a moment of its own, bigger the rarer it
// is: a Shiny glints, a Silver foil rings, a Gold foil stops the strip, and a Rainbow foil is an event.
// How a card turns over (Tim, 2026-11-11: "the front edge kind of stopping and the far edge flipping up and over the
// top"): a face-down card waits one slot short of the front with its leading edge on the front slot's edge. As the
// strip brings it in, that edge stays where it is and the rest of the card comes up and over it, back until it is
// edge-on and face after, and lands face up in the front slot (tumble() and land() in torn()). The turn follows the
// strip: under a finger the card comes over as far as the finger has gone, and falls back if the finger lets it go
// short of half way. Its pictures are fetched and decoded the moment the pack is torn (AnoriaUI.warm), and the first
// card does not come out until its picture is ready.
(function () {
  'use strict';
  const C = window.AnoriaCards, TX = window.AnoriaText, Coll = window.AnoriaColl, CARDS = C.CARDS, el = Kit.el;
  const IMG = 'anoria/ui/', TEAR = 15;   // (the tear line: this far down the pack, in % of its height)
  const GOLD = ['#f6e3a1', '#e9cf86', '#b8862d', '#fff1bf', '#ffffff'];
  // the colours a foil throws as it turns over, by edition (1 Shiny, 2 Silver foil, 3 Gold foil, 4 Rainbow foil)
  const FOIL = [null, ['#ffffff', '#dff1ff', '#a9dcff'], ['#ffffff', '#dfe7f2', '#9fb1c8', '#eef3f9'], ['#fff3bf', '#f6d77a', '#d9a431', '#ffffff'], ['#ff7ad1', '#ffd166', '#7dffc0', '#6fc3ff', '#c79bff', '#ffffff']];
  const Ed = () => window.AnoriaEd, EDS = Coll.EDITIONS;
  const U = () => window.AnoriaUI;       // what the table shares (ui.js loads after this file, so ask when needed)
  const calm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const facOf = k => CARDS[k] ? CARDS[k].f : TX.GUIDES[k] ? TX.GUIDES[k].f : 'N';
  const col = k => U().FAC[facOf(k)].c;
  const plural = (n, one, many) => n === 1 ? one : many;
  const kindOf = k => { const c = CARDS[k], kind = c.t === 'fig' ? 'Figure' : c.t === 'relic' ? 'Relic' : c.quick ? 'Quick Deed' : 'Deed'; return c.f === 'N' ? kind : U().FAC[c.f].n + ' ' + kind; };
  function anim(node, frames, o) {   // one movement; a calm screen gets where it's going straight away
    if (!node.animate) return { finished: Promise.resolve() };
    if (calm()) { o = Object.assign({}, o, { duration: 1, delay: 0 }); }
    const a = node.animate(frames, o); if (!a.finished) a.finished = new Promise(r => { a.onfinish = r; }); return a;
  }
  // a small round picture of a card (the Thread it sits on, a gift)
  function thumb(k, cls) { const t = el('span', { class: 'pk-th ' + (cls || ''), style: { '--f': col(k) } }); const im = U().artImg(k, true); if (im) t.appendChild(im); return t; }

  // ═══ The sealed pack ═════════════════════════════════════════════════════════════════════════════════════
  // what's printed on it: the crimped gilt ends, the logo, where it came from on a paper band, how many cards
  function packArt(pack) {
    return el('div', { class: 'pk-art' }, [
      el('i', { class: 'pk-crimp t' }), el('i', { class: 'pk-crimp b' }), el('i', { class: 'pk-frame' }),
      el('img', { class: 'pk-logo', src: IMG + 'logo.webp', alt: '', draggable: 'false' }),
      el('div', { class: 'pk-band' }, [el('span', { class: 'pk-label', text: pack.why }), el('span', { class: 'pk-count' }, [el('b', { text: String(pack.n) }), plural(pack.n, ' card', ' cards')])]),
      el('i', { class: 'pk-perf' })
    ]);
  }
  // The pack as three pieces of the same picture: the body below the tear line, and the strip above it in two
  // parts (the part already torn, which lifts away, and the part still holding). onTorn() runs once, when the tear
  // reaches the far edge.
  function sealedPack(pack, fx, onTorn) {
    const jag = [[0, TEAR]]; for (let x = 1.5 + Math.random() * 2; x < 98.5; x += 2 + Math.random() * 2.6) jag.push([x, TEAR + (Math.random() - .5) * 2.4]); jag.push([100, TEAR]);
    const yAt = x => { for (let i = 1; i < jag.length; i++) if (x <= jag[i][0]) { const a = jag[i - 1], b = jag[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / ((b[0] - a[0]) || 1); } return TEAR; };
    const pt = (p, d) => p[0].toFixed(2) + '% ' + (p[1] + (d || 0)).toFixed(2) + '%';
    const poly = a => 'polygon(' + a.join(',') + ')';
    const leftOf = P => poly(['0 0', P + '% 0', pt([P, yAt(P)], .3)].concat(jag.filter(j => j[0] < P).reverse().map(j => pt(j, .3))));
    const rightOf = P => poly([P + '% 0', '100% 0'].concat(jag.filter(j => j[0] > P).reverse().map(j => pt(j, .3)), [pt([P, yAt(P)], .3)]));
    const clip = (n, v) => { n.style.setProperty('-webkit-clip-path', v); n.style.setProperty('clip-path', v); };
    const piece = cls => el('div', { class: 'pk-pc ' + cls }, [packArt(pack)]);
    const body = piece('body'), keep = piece('keep'), torn = piece('torn');
    const rip = el('i', { class: 'pk-rip' }), spark = el('i', { class: 'pk-spark' }), hint = el('i', { class: 'pk-hint' });
    const tilt = el('div', { class: 'pk-tilt' }, [body, rip, keep, torn, spark, hint]);
    const node = el('div', { class: 'pk-pack', role: 'button', tabindex: '0', 'aria-label': 'Tear open: ' + pack.why + ', ' + pack.n + plural(pack.n, ' card', ' cards') }, [tilt]);
    clip(body, poly(jag.map(j => pt(j)).concat(['100% 100%', '0 100%'])));
    let p = 0, target = 0, dir = 0, drag = null, auto = false, torn1 = false, raf = 0, notch = 0;

    function draw() {
      const P = dir >= 0 ? p * 100 : 100 - p * 100, y = yAt(P);
      clip(torn, dir >= 0 ? leftOf(P) : rightOf(P)); clip(keep, dir >= 0 ? rightOf(P) : leftOf(P));
      torn.style.visibility = p > 0 ? '' : 'hidden'; keep.style.visibility = p < 1 ? '' : 'hidden';
      torn.style.transformOrigin = P + '% ' + y + '%'; torn.style.transform = p > 0 ? 'rotate(' + ((dir >= 0 ? 1 : -1) * (7 + 15 * p)).toFixed(2) + 'deg)' : '';
      rip.style.left = dir >= 0 ? '0' : P + '%'; rip.style.width = (p * 100) + '%'; rip.style.opacity = p > 0 ? '1' : '0';
      spark.style.left = P + '%'; spark.style.top = y + '%'; spark.style.opacity = p > 0 && p < 1 ? '1' : '0';
      tilt.style.transform = p > 0 ? 'rotate(' + ((dir >= 0 ? 1 : -1) * (p - .3) * 2.2).toFixed(2) + 'deg)' : '';
      const r = tilt.getBoundingClientRect(); return { x: r.left + r.width * P / 100, y: r.top + r.height * y / 100 };
    }
    function step() {
      raf = 0; if (torn1) return;
      if (calm()) p = target; else if (auto) p = Math.min(1, p + .06); else { const gap = target - p; p += gap < .006 ? gap : gap * .5; }
      const at = draw(), n = Math.floor(p * 15);
      if (n !== notch) { notch = n; Kit.sfx('slide'); Kit.haptic('tick'); bits(fx, at.x, at.y, 2, GOLD, { d: 26, fall: 34, ms: 520 }); }
      if (p >= 1) return finish(at);
      if (p < target || auto) raf = requestAnimationFrame(step);
    }
    const go = () => { if (!raf && !torn1) raf = requestAnimationFrame(step); };
    function tearAll() { if (torn1) return; if (!dir) dir = 1; auto = true; target = 1; node.classList.add('going'); go(); }
    function finish(at) {
      torn1 = true; node.classList.add('open'); node.classList.remove('going', 'held'); node.removeAttribute('tabindex'); node.setAttribute('aria-hidden', 'true');
      Kit.sfx('whoosh'); Kit.sfx('pop'); Kit.haptic('heavy');
      const s = dir >= 0 ? 1 : -1;
      anim(torn, [{ transform: torn.style.transform }, { transform: 'translate(' + (-s * 8) + '%,-12%) rotate(' + (s * 38) + 'deg)', offset: .3 }, { transform: 'translate(' + (-s * 26) + '%,70%) rotate(' + (s * 130) + 'deg)', opacity: 0 }], { duration: 760, easing: 'cubic-bezier(.4,0,.8,.7)', fill: 'forwards' });
      const r = tilt.getBoundingClientRect(), m = { x: r.left + r.width / 2, y: r.top + r.height * TEAR / 100 };
      bits(fx, m.x, m.y, 26, GOLD, { d: Math.max(90, r.width * .8), a: -Math.PI / 2, spread: 2.6, fall: 40, ms: 900 });
      if (!calm()) { const f = el('i', { class: 'pk-flash', style: { left: m.x + 'px', top: m.y + 'px' } }); fx.appendChild(f); setTimeout(() => f.remove(), 700); }
      onTorn(m);
    }
    // The swipe can start anywhere around the pack (area: the space it sits in): the tear begins where the finger
    // crosses the pack's edge. A tap only counts on the pack itself.
    function bind(area) {
      area.addEventListener('pointerdown', e => { if (torn1 || auto || (e.button != null && e.button > 0)) return; drag = { id: e.pointerId, x0: e.clientX, moved: false, on: node.contains(e.target) }; try { area.setPointerCapture(e.pointerId); } catch (x) {} node.classList.add('held'); });
      area.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id || torn1 || auto) return;
        const dx = e.clientX - drag.x0;
        if (!drag.moved) { if (Math.abs(dx) < 6) return; drag.moved = true; if (!dir) dir = dx > 0 ? 1 : -1; }
        const r = tilt.getBoundingClientRect(), f = (e.clientX - r.left) / r.width, v = Math.max(0, Math.min(1, dir > 0 ? f : 1 - f));
        if (v > target) target = v > .95 ? 1 : v;
        go();
      });
      const up = e => { if (!drag) return; const d = drag; drag = null; node.classList.remove('held'); if (torn1 || e.type === 'pointercancel') return; if (d.moved ? target >= .4 : d.on) tearAll(); else if (target > 0) node.classList.add('part'); };
      area.addEventListener('pointerup', up); area.addEventListener('pointercancel', up);
    }
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tearAll(); } });
    draw();
    return { el: node, bind: bind };
  }
  // a pack drawn small (the row that says what earns the next one, the dots that count the packs)
  const miniPack = cls => el('i', { class: 'pk-mini ' + (cls || '') });

  // small pieces thrown out from a point on the screen: paper as the pack tears, sparks as a new card turns
  function bits(fx, x, y, n, colors, o) {
    if (calm() || !fx || !fx.animate) return; o = o || {};
    for (let i = 0; i < n; i++) {
      const star = i % 3 === 0, a = (o.a != null ? o.a : 0) + (Math.random() - .5) * (o.spread || 6.283), d = (o.d || 60) * (.45 + Math.random() * .75), s = star ? 8 + Math.random() * 8 : 3 + Math.random() * 5;
      const b = el('i', { class: 'pk-bit' + (star ? ' star' : ''), style: { left: x + 'px', top: y + 'px', width: s + 'px', height: s + 'px', background: colors[(Math.random() * colors.length) | 0] } });
      fx.appendChild(b);
      const a1 = b.animate([{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: 'translate(' + (Math.cos(a) * d - s / 2).toFixed(1) + 'px,' + (Math.sin(a) * d + (o.fall || 0) - s / 2).toFixed(1) + 'px) rotate(' + ((Math.random() * 600 - 300) | 0) + 'deg) scale(.3)', opacity: 0 }],
        { duration: (o.ms || 620) * (.7 + Math.random() * .6), easing: 'cubic-bezier(.12,.7,.3,1)' });
      a1.onfinish = () => b.remove();
    }
  }

  // ═══ The event: one layer that carries a new Guide, each pack in turn, and the way out ═══════════════════
  // o = {guides: [{g, starter}], first: [ids of the packs to open first]}
  let running = false;   // (one event at a time: a second tap on the way in doesn't start another over it)
  function run(o, done) {
    if (running) return; running = true;
    const A = U(), guides = (o.guides || []).slice(), first = o.first || [], hadGuide = guides.length > 0;
    let alive = true, after = null, opened = 0, offs = [];
    const sc = A.screen({ title: '', cls: 'pk-screen', onClose: () => { alive = false; running = false; offs.forEach(f => f()); offs = []; if (after) after(); else if (done) done(); } });
    const stage = el('div', { class: 'pk-stage' }), fx = el('div', { class: 'pk-fx', 'aria-hidden': 'true' }), dots = el('div', { class: 'pk-dots' });
    sc.body.appendChild(stage); sc.el.appendChild(fx); sc.tools.appendChild(dots);
    const waiting = () => { const all = Coll.packs(); return all.filter(p => first.indexOf(p.id) >= 0).concat(all.filter(p => first.indexOf(p.id) < 0)); };
    const listen = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); const off = () => t.removeEventListener(ev, fn, opt); offs.push(off); return off; };
    function leave(then) { after = then || null; sc.close(); }
    function toLibrary() { if (window.AnoriaLibrary && window.AnoriaLibrary.open) leave(() => window.AnoriaLibrary.open(done)); }
    // the packs in this sitting as a row of dots: opened, this one, still to come
    function count(cur) {
      const left = waiting().length, total = opened + left; dots.innerHTML = '';
      if (total < 2) { dots.removeAttribute('aria-label'); return; }
      const on = cur ? opened - 1 : opened;
      for (let i = 0; i < total; i++) dots.appendChild(miniPack(i < on ? 'done' : i === on ? 'on' : ''));
      dots.setAttribute('role', 'img'); dots.setAttribute('aria-label', 'Pack ' + (on + 1) + ' of ' + total);
    }
    function next() {
      if (!alive) return;
      stage.className = 'pk-stage'; stage.innerHTML = ''; sc.title.textContent = '';
      if (guides.length) return guide(guides.shift());
      if (waiting().length) return sealed();
      if (!opened && !hadGuide) return nothing();
      leave();
    }

    // ── A Guide steps forward: the one you chose to begin with, or one who joins after a win ──
    function guide(x) {
      const g = x.g, G = TX.GUIDES[g], packs = waiting().length;
      dots.innerHTML = ''; dots.removeAttribute('aria-label');
      const card = el('button', { type: 'button', class: 'pk-g-card', 'aria-label': 'Read ' + G.n + '\'s card', onclick: () => A.openView(g) }, [A.cardEl(g)]);
      const label = guides.length ? 'Next' : packs ? (x.starter ? 'Open your welcome packs' : plural(packs, 'Open your pack', 'Open your packs')) : 'Done';
      const go = el('button', { type: 'button', class: 'btn btn-primary btn-lg pk-g-go', text: label, onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); next(); } });
      const m = el('div', { class: 'pk-moment guide', style: { '--f': col(g) } }, [
        el('div', { class: 'pk-g-show' }, [el('i', { class: 'pk-rays' }), el('i', { class: 'pk-halo' }), card]),
        el('div', { class: 'pk-g-txt' }, [
          el('div', { class: 'pk-k', text: x.starter ? 'Your Guide' : 'A new Guide joins you' }),
          el('h2', { class: 'pk-g-n', text: G.n }),
          el('p', { class: 'pk-g-pow', text: G.tx }),
          x.starter ? el('p', { class: 'pk-g-deck' }, [el('span', { class: 'pk-k', text: 'Your deck' }), el('b', { text: x.deck || '' })]) : el('p', { class: 'pk-g-note', text: 'This Guide is ready to lead any deck you build.' }),
          go])
      ]);
      stage.classList.add('moment'); stage.appendChild(m);
      Kit.sfx('win'); Kit.haptic('success');
      if (!calm()) {
        setTimeout(() => { if (alive && m.isConnected) Kit.confetti({ colors: GOLD.concat([col(g)]), count: 150 }); }, 380);
        setTimeout(() => { if (!alive || !m.isConnected) return; const r = card.getBoundingClientRect(); Kit.sfx('sparkle'); bits(fx, r.left + r.width / 2, r.top + r.height / 2, 30, GOLD.concat([col(g)]), { d: r.width * .9, ms: 1000 }); }, 620);
      }
      setTimeout(() => { if (alive && m.isConnected) try { go.focus({ preventScroll: true }); } catch (e) {} }, 900);
    }

    // ── Nothing waiting: what earns the next one ──
    function nothing() {
      count(false); sc.title.textContent = 'Packs'; stage.classList.add('none');
      const rows = Coll.nextUp().map(x => {
        const isG = x.id === 'guide', mid = el('span', { class: 'pk-n-w' }, [el('b', { text: x.when })]);
        if (isG) {
          if (x.need <= 8) { const row = el('span', { class: 'pk-n-wins', role: 'img', 'aria-label': x.have + ' of ' + x.need + ' wins' }); for (let i = 0; i < x.need; i++) row.appendChild(el('i', { class: i < x.have ? 'on' : '' })); mid.appendChild(row); }
          else mid.appendChild(el('span', { class: 'pk-n-bar', role: 'img', 'aria-label': x.have + ' of ' + x.need + ' wins', style: { '--p': (x.have / x.need).toFixed(3) } }, [el('i')]));
        }
        return el('li', { class: 'pk-n-row' + (x.done ? ' done' : '') + (isG ? ' g' : '') }, [
          isG ? el('i', { class: 'pk-n-g' }) : el('span', { class: 'pk-n-p' }, [miniPack('row'), x.done ? el('span', { class: 'ck', html: Kit.icon('check') }) : null]),
          mid, el('span', { class: 'pk-n-what', text: x.what })]);
      });
      const ok = el('button', { type: 'button', class: 'btn btn-primary btn-block', text: 'Done', onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); leave(); } });
      stage.appendChild(el('div', { class: 'pk-none' }, [
        el('div', { class: 'pk-none-a' }, [el('div', { class: 'pk-ghost', 'aria-hidden': 'true' }, [el('img', { src: IMG + 'logo.webp', alt: '', draggable: 'false' })]), el('h2', { class: 'pk-none-t', text: 'No packs waiting' })]),
        el('div', { class: 'pk-none-b' }, [el('div', { class: 'pk-k', text: 'What earns the next' }), el('ul', { class: 'pk-n-list' }, rows),
          el('div', { class: 'pk-none-acts' }, [window.AnoriaLibrary && window.AnoriaLibrary.open ? el('button', { type: 'button', class: 'btn btn-soft', html: Kit.icon('book') + '<span>Library</span>', onclick: () => { Kit.sfx('tap'); toLibrary(); } }) : null, ok])])
      ]));
      setTimeout(() => { if (alive) try { ok.focus({ preventScroll: true }); } catch (e) {} }, 400);
    }

    // ── The sealed pack, on top of the others still waiting ──
    function sealed() {
      const q = waiting(), pack = q[0];
      count(false); stage.classList.add('sealed');
      const stack = el('div', { class: 'pk-stack' });
      for (let i = Math.min(q.length - 1, 3); i >= 1; i--) stack.appendChild(el('i', { class: 'pk-under u' + i }));
      const P = sealedPack(pack, fx, m => torn(pack, seal, m));
      stack.appendChild(P.el); stack.appendChild(el('i', { class: 'pk-ring' }));
      const many = q.length > 1 ? el('div', { class: 'pk-many' }, [el('b', { text: String(q.length) }), ' packs to open']) : null;
      const seal = el('div', { class: 'pk-seal' }, [stack, many]);
      P.bind(seal); stage.appendChild(seal);
      setTimeout(() => { if (alive && P.el.isConnected) try { P.el.focus({ preventScroll: true }); } catch (e) {} }, 350);
    }

    // ── Torn: the cards are yours from this moment. They come out face down on a strip, and each one turns over as
    // it slides to the front (Tim, 2026-11-11: "use card carousel for pack openings too with cards flipping as they
    // scroll in first time they're revealed"). ──
    function torn(pack, seal, mouth) {
      const res = Coll.openPack(pack.id);
      seal.classList.add('torn');
      if (!alive) return;
      if (!res) { next(); return; }   // (it was opened somewhere else in the meantime)
      opened++;
      count(true);
      const cards = res.cards, n = cards.length, cells = [];
      // Every picture in the pack is fetched and decoded from this moment, the first card's first. The cards wait in
      // the pack for that one (never longer than CEIL: a dead connection cannot hang the pack).
      const keys = cards.map(x => x.c), CEIL = 2600;
      const firstReady = n && A.artReady ? Promise.race([A.artReady(keys[0]), wait(CEIL)]) : Promise.resolve();
      if (A.preload) A.preload(keys);   // (the small pictures next: they are quick, and stand in for a full one that is late)
      if (A.warm) A.warm(keys);
      const flat = calm();   // (a calm screen: no tumble, a card changes face in place with a plain cross-fade)
      // what was yours before this pack (a Thread is only pointed out to a card you can already see)
      const had = {}; cards.forEach(x => { if (had[x.c] == null) had[x.c] = Coll.copies(x.c); if (x.copy !== false) had[x.c]--; });
      res.threads.forEach(t => { if (t.gift) had[t.gift] = (had[t.gift] == null ? Coll.copies(t.gift) : had[t.gift]) - 1; });
      const shown = {}, known = k => !!shown[k] || (had[k] != null ? had[k] > 0 : Coll.copies(k) > 0);
      // The named Legacy Line a card belongs to (Tim, 2026-11-11): shown over the cards as the line itself, the cards
      // you have found in their places and the ones you haven't joined on but hidden. A card that completes a line
      // has a small moment of its own, there and then.
      const lineDone = {}; (C.THREADS || []).forEach(t => { if (t.cards.every(known)) lineDone[t.id] = 1; });
      const lineFor = k => (C.THREADS || []).filter(t => t.cards.indexOf(k) >= 0).map(t => ({ t: t, n: t.cards.filter(c => c === k || known(c)).length })).sort((a, b) => b.n / b.t.cards.length - a.n / a.t.cards.length)[0] || null;
      function lineEl(L, k) {
        const t = L.t, row = el('div', { class: 'pk-ln-row', style: { '--n': t.cards.length } }); let prev = false;
        t.cards.forEach((c, i) => { const kn = c === k || known(c);
          if (i) row.appendChild(el('i', { class: 'pk-ln-j' + (kn && prev ? ' on' : '') }));
          if (kn) { const m = el('span', { class: 'pk-ln-m' + (c === k ? ' me' : ''), style: { '--f': col(c) }, role: 'img', 'aria-label': CARDS[c].n }); const im = A.artImg(c, true); if (im) m.appendChild(im); row.appendChild(m); }
          else row.appendChild(el('span', { class: 'pk-ln-m hid', role: 'img', 'aria-label': 'A card you have not found yet' }));
          prev = kn; });
        return el('div', { class: 'pk-p-line' + (L.n === t.cards.length ? ' full' : ''), 'data-line': t.id }, [el('div', { class: 'pk-ln-h' }, [el('b', { text: t.n }), el('span', { text: L.n + ' of ' + t.cards.length })]), row]);
      }
      function lineMoment(id) {
        const ln = plate.querySelector('.pk-p-line[data-line="' + id + '"]'); if (!ln || !alive) return;
        ln.classList.add('won'); const ct = ln.querySelector('.pk-ln-h span'); if (ct) { ct.className = 'pk-ln-stamp'; ct.textContent = 'Complete'; }
        Kit.sfx('win', .7); Kit.haptic('success');
        const r = ln.getBoundingClientRect(); if (!calm()) bits(fx, r.left + r.width / 2, r.top + r.height / 2, 24, GOLD, { d: Math.max(120, r.width * .55), ms: 950 });
      }
      let left = n, ended = false, dealt = false, F = null, nudge = 0, lastCu = 0;

      // The cards stand on one strip (the same strip a bunch of cards is read on anywhere else: AnoriaUI.makeFlow).
      // They come out face down; each one turns over as it slides to the front for the first time.
      const plate = el('div', { class: 'pk-plate', 'aria-live': 'polite' });
      const flow = el('div', { class: 'vf-flow pk-flow' });
      const strip = el('div', { class: 'vf-strip pk-strip' });
      const foils = cards.some(x => x.ed);   // (a foil's edition is stamped across its foot: the thumbnails stand a little further down)
      const field = el('div', { class: 'pk-field' + (foils ? ' foils' : '') }, [flow, n > 1 ? strip : null]);
      const rest = el('button', { type: 'button', class: 'btn btn-soft pk-rest', onclick: () => turnRest() }, [el('span', { class: 'pk-rest-ic', html: Kit.icon('cards') }), el('span', { class: 'pk-rest-t', text: 'Turn them all' })]);
      const foot = el('div', { class: 'pk-foot' }, [n > 2 ? rest : null]);
      const info = el('div', { class: 'pk-info' }, [plate]), main = el('div', { class: 'pk-main' }, [field, foot]);
      const turned = () => cells.filter(z => z.up);
      cards.forEach((x, i) => {
        const b = el('div', { class: 'vf-c pk-fc' + (flat ? '' : ' tum'), 'data-i': String(i), style: { '--f': col(x.c) } }, [
          el('span', { class: 'pk-glow' }),
          el('span', { class: 'pk-fl' }, [el('span', { class: 'pk-side b' }, [el('div', { class: 'ac back' }, [el('div', { class: 'ac-in' })])]), el('span', { class: 'pk-side f' }, [A.cardEl(x.c, { now: true, tg: true, ed: x.ed || 0 })]), el('i', { class: 'pk-edge' })])]);
        const th = el('button', { type: 'button', class: 'vf-t pk-t', 'aria-label': 'Card ' + (i + 1) + ' of ' + n + ', face down', onclick: () => { if (!dealt || !F) return; Kit.sfx('tap'); F.settle(i, 0); } });
        const c = { el: b, th: th, x: x, up: false, at: 0, landed: flat, sh: null };
        // a tap on a card at the side brings it to the front; a tap on the front card, once it is turned, reads it
        b.addEventListener('click', () => {
          if (!dealt || !F || F.moved()) return;
          if (i !== Math.round(F.pos)) { F.settle(i, 0); return; }
          if (c.up && Date.now() - c.at > 420) A.openView(x.c, { list: turned().map(z => z.x.c), at: turned().indexOf(c) });
        });
        cells.push(c); strip.appendChild(th);
      });
      // (each picture is made ready while the cards are still coming out, so a card never turns over to a blank panel)
      cells.forEach(c => { const im = c.el.querySelector('.pk-side.f .ac-art img'); if (im && im.decode) im.decode().catch(() => {}); });
      plate.appendChild(el('div', { class: 'pk-p-top' }, [el('span', { class: 'pk-p-k', text: pack.why })]));
      plate.appendChild(el('div', { class: 'pk-p-n', text: n + plural(n, ' card', ' cards') }));
      if (!n) plate.appendChild(el('div', { class: 'pk-p-cap keep', text: 'You have every card in every edition.' }));
      stage.classList.remove('sealed'); stage.classList.add('reveal', 'dealing'); if (n <= 4) stage.classList.add('few');
      stage.appendChild(info); stage.appendChild(main);

      // room on the plate for the longest thing it could say about any card here, so the cards never shift as they turn
      function reserve() {
        const keep = Array.from(plate.childNodes), cls = plate.className; let h = 0; plate.style.minHeight = ''; plate.setAttribute('aria-busy', 'true');
        const here = {}; cards.forEach(x => { here[x.c] = 1; });   // (a Thread is only shown to a card you have, or one in this pack)
        cards.forEach(x => {
          const k = x.c, c = CARDS[k]; let far = null;
          const see = (o, tx, back) => { if (tx && (here[o] || known(o)) && (!far || tx.length + CARDS[o].n.length > far.tx.length + CARDS[far.other].n.length)) far = { other: o, from: back ? k : o, to: back ? o : k, tx: tx }; };
          (c.insp || []).concat(c.from || []).forEach(s => { if (s[0] !== '@') see(s, TX.LINKS[s + '>' + k]); });
          Coll.ALL.forEach(t => { const tc = CARDS[t]; if ((tc.insp || []).concat(tc.from || []).indexOf(k) >= 0) see(t, TX.LINKS[k + '>' + t], true); });
          show(k, { first: false, ed: x.ed }, far, true); h = Math.max(h, plate.offsetHeight);
          if (far) { show(k, { first: false, ed: x.ed }, null, true); h = Math.max(h, plate.offsetHeight); }
        });
        // (and for the tally the pack ends on, so the cards don't move when it comes: up to a fifth of the screen, which
        // holds the counts and the foils; a tally that also lists Legacy Lines takes what more it needs when it comes)
        tallyFill(true); h = Math.max(h, Math.min(plate.offsetHeight, Math.round(stage.clientHeight * .2)));
        plate.className = cls; plate.innerHTML = ''; keep.forEach(c => plate.appendChild(c));
        if (h) plate.style.minHeight = h + 'px'; plate.removeAttribute('aria-busy');
      }
      // the front card as tall as the room allows, with the next one showing at each side
      function fit() {
        // (the foot keeps the height of a button whether or not one is showing: Turn the rest goes when one card is
        // left, and the cards must not move when it does)
        if (!ended) { const probe = el('button', { type: 'button', class: 'btn btn-primary pk-b-main', text: 'Done', style: { visibility: 'hidden' } }); foot.style.minHeight = ''; foot.appendChild(probe); const fh = foot.offsetHeight; probe.remove(); foot.style.minHeight = fh + 'px'; }
        if (!ended && n) reserve();
        const r = field.getBoundingClientRect(); if (!r.width || !n) return;
        const under = (n > 1 ? strip.offsetHeight + 6 : 0) + (foils ? 16 : 0);
        const cu = Math.floor(Math.max(64, Math.min(r.height - under - 16, r.width * (n > 1 ? 1.12 : 1.3), 600)));
        if (cu === lastCu) return; lastCu = cu;
        flow.style.setProperty('--cu', cu + 'px'); if (F) F.reset();
      }

      // a Thread between this card and one you can see: a Figure it grew from, or one that grew from it
      function linkFor(k) {
        const c = CARDS[k], out = [];
        (c.insp || []).concat(c.from || []).forEach(s => { if (s[0] !== '@' && s !== k && known(s) && TX.LINKS[s + '>' + k]) out.push({ other: s, from: s, to: k, tx: TX.LINKS[s + '>' + k] }); });
        Coll.ALL.forEach(t => { const tc = CARDS[t]; if (t !== k && (tc.insp || []).concat(tc.from || []).indexOf(k) >= 0 && known(t) && TX.LINKS[k + '>' + t]) out.push({ other: t, from: k, to: t, tx: TX.LINKS[k + '>' + t] }); });
        out.forEach(l => { l.cell = cells.filter(c2 => c2.up && c2.x.c === l.other)[0] || null; });
        return out.sort((a, b) => (b.cell ? 1 : 0) - (a.cell ? 1 : 0))[0] || null;
      }
      function knot(c) { if (!c.el.querySelector('.pk-knot')) c.el.appendChild(el('span', { class: 'pk-knot', html: Kit.icon('link') })); c.th.classList.add('knot'); c.el.classList.remove('thread'); void c.el.offsetWidth; c.el.classList.add('thread'); }

      // the plate: the card at the front. Upright, the card itself is large enough to read, so only a Thread it has
      // to a card of yours is written here; sideways the card is smaller, and the plate beside it says the rest too.
      function show(k, x, link, dry) {
        const t = TX.CARDS[k] || {};
        plate.className = 'pk-plate ' + (x.first ? 'new' : 'two'); plate.style.setProperty('--f', col(k)); plate.innerHTML = '';
        // (a new card says so itself: New is stamped on it as it turns. A foil says which: its gem and its name.)
        plate.appendChild(el('div', { class: 'pk-p-top' }, [el('span', { class: 'pk-p-k' }, [el('i'), kindOf(k)]),
          x.ed ? el('span', { class: 'pk-p-e e' + x.ed }, [Ed().gem(x.ed), EDS[x.ed].n]) : null, x.first || x.copy === false ? null : el('span', { class: 'pk-p-s', text: 'Second copy' })]));
        plate.appendChild(el('div', { class: 'pk-p-n', text: CARDS[k].n }));
        const L = lineFor(k);
        if (L) { plate.appendChild(lineEl(L, k)); if (link) plate.appendChild(el('p', { class: 'pk-p-why', text: link.tx })); }
        else if (link) plate.appendChild(linkEl(link, k));
        else if (t.tx) plate.appendChild(el('div', { class: 'pk-p-cap', html: A.boldKeys(t.tx) }));
        else if (t.fact) plate.appendChild(el('div', { class: 'pk-p-cap it', text: t.fact }));
      }
      // A Legacy Line between the card at the front and a card of yours, drawn the way the reader draws it (notesFor in
      // ui.js): under the words Legacy Line, the card it runs from and the card it runs to as named medallions joined
      // by the gold line, what the line is worth on it as the game's own marks, and the true sentence about the two.
      function linkEl(link, k) {
        const med = c => { const m = el('span', { class: 'ln-m' + (c === k ? ' me' : ''), style: { '--f': col(c) } }); const im = A.artImg(c, true); if (im) m.appendChild(im); return el('span', { class: 'ln-who' }, [m, el('small', { text: CARDS[c].n })]); };
        const legacy = (CARDS[link.to].insp || []).indexOf(link.from) >= 0, w = (cls, tx, say) => el('span', { class: 'ln-w ' + cls, role: 'img', 'aria-label': say }, [el('i'), el('b', { text: tx })]);
        return el('div', { class: 'pk-p-th pk-ll', 'data-to': link.to }, [
          el('div', { class: 'ln-k', text: 'Legacy Line' }),
          el('div', { class: 'ln-row', role: 'img', 'aria-label': 'From ' + CARDS[link.from].n + ' to ' + CARDS[link.to].n }, [med(link.from), el('span', { class: 'ln-line' }, [el('span', { class: 'ln-worth' }, [legacy ? w('sp', '−1', 'costs 1 Spark less') : null, legacy ? w('mi', '+1', 'plus 1 Might') : null, w('re', '+1', 'scores 1 Renown')])]), med(link.to)]),
          el('p', { class: 'ln-why', text: link.tx })]);
      }
      function mark() {
        const t = rest.querySelector('.pk-rest-t'); if (t) t.textContent = left === n ? 'Turn them all' : 'Turn the rest';
        rest.hidden = left < 2;
      }
      // The card has landed face up (or, on a calm screen, changed face): it is counted, stamped and announced.
      // o.pass: the strip is still moving on past this card (a flick, or Turn the rest): it turns, without the fanfare
      function turn(i, o) {
        const c = cells[i]; if (!c || c.up || !alive || ended) return; o = o || {};
        const k = c.x.c, isNew = c.x.first, last = left === 1, ed = c.x.ed || 0, extra = c.x.copy === false;
        c.up = true; c.at = Date.now(); left--; shown[k] = 1;
        // (did this card complete a Legacy Line? its moment comes once the plate shows that line)
        const fin = (C.THREADS || []).filter(t => !lineDone[t.id] && t.cards.indexOf(k) >= 0 && t.cards.every(known));
        fin.forEach(t => { lineDone[t.id] = 1; });
        if (fin.length) setTimeout(() => { if (alive && !ended && cells[Math.round(F ? F.pos : 0)] === c) lineMoment(fin[0].id); }, o && o.pass ? 120 : 520);
        const link = linkFor(k);
        c.el.classList.add('up', isNew ? 'new' : 'two'); if (ed) c.el.classList.add('foil', 'e' + ed);
        // what it is to you, stamped on the card: New or Second copy at its head (a foil of a card you had two of adds
        // no copy, and says neither), and at its foot the edition it came in, as its gem and its name
        if (!extra) c.el.appendChild(el('span', { class: 'pk-tag' + (isNew ? '' : ' two'), text: isNew ? 'New' : 'Second copy' }));
        if (ed) c.el.appendChild(el('span', { class: 'pk-ed e' + ed }, [Ed().gem(ed), EDS[ed].n]));
        c.th.classList.add('up', isNew ? 'new' : 'two'); if (ed) c.th.classList.add('e' + ed); c.th.style.setProperty('--f', col(k));
        c.th.setAttribute('aria-label', CARDS[k].n + (ed ? ', ' + EDS[ed].n : '') + (extra ? '' : isNew ? ', new' : ', a second copy'));
        const im = A.artImg(k, true); if (im) c.th.appendChild(im);
        if (link) { knot(c); if (link.cell) knot(link.cell); }
        // (the sound and the tap in the hand are the card landing)
        if (ed) foilMoment(c, ed, o.pass, last);
        else if (o.pass) { Kit.sfx('deal', .8); Kit.haptic(isNew ? 'light' : 'tick'); }
        else if (isNew) {
          Kit.sfx('deal', 1); Kit.sfx('flip', .6); setTimeout(() => Kit.sfx('sparkle', last ? 1 : .8), 120); Kit.haptic('medium');
          const r = flow.getBoundingClientRect(), w = r.height * .7143; setTimeout(() => { if (alive) bits(fx, r.left + r.width / 2, r.top + r.height / 2, 14, [col(k), '#fff1bf', '#e9cf86'], { d: w * .95, ms: 700 }); }, 90);
        } else { Kit.sfx('deal', 1); Kit.sfx('flip', .5); Kit.haptic('light'); }
        if (link && !o.pass) setTimeout(() => Kit.sfx('good', .6), 300);
        mark();
        if (!left) setTimeout(end, ed > 3 ? 3200 : ed > 2 ? 2100 : o.pass ? 900 : isNew || ed ? 1300 : 1000);
      }
      // A foil turns over: the light runs across it, and the rarer it is the more is made of it. A Shiny glints. A
      // Silver foil rings and throws silver. A Gold foil lifts off the strip in a burst of gold. A Rainbow foil is an
      // event: the room dims, rays turn behind the card, and the colours fly.
      function foilMoment(c, ed, pass, last) {
        if (Ed()) Ed().wake();   // (the light has just run across the foil as it came over: --ls, set by the strip)
        Kit.sfx('deal', pass ? .8 : 1); Kit.sfx('flip', pass ? .5 : .7);
        const fr = flow.getBoundingClientRect(), w = fr.height * .7143, r = c.el.getBoundingClientRect(), cx = Math.max(fr.left, Math.min(fr.right, r.left + r.width / 2)), cy = fr.top + fr.height / 2, quick = calm();
        const later = (ms, fn) => setTimeout(() => { if (alive && !ended && c.el.isConnected) fn(); }, ms);
        if (ed === 1) { later(140, () => Kit.sfx('sparkle', pass ? .5 : .8)); Kit.haptic(pass ? 'light' : 'medium'); if (!pass) later(160, () => bits(fx, cx, cy, 12, FOIL[1], { d: w * .9, ms: 700 })); return; }
        if (ed === 2) { later(140, () => Kit.sfx('sparkle', .9)); if (!pass) later(330, () => Kit.sfx('good', .7)); Kit.haptic('medium'); later(160, () => bits(fx, cx, cy, pass ? 10 : 22, FOIL[2], { d: w * 1.05, ms: 850 })); return; }
        // Gold and Rainbow: the strip has stopped here (front()), and the card has the stage
        c.el.classList.add('big'); later(ed > 3 ? 3000 : 1900, () => c.el.classList.remove('big'));
        if (ed === 3) {
          later(140, () => Kit.sfx('sparkle', 1)); later(320, () => Kit.sfx('win', .75)); Kit.haptic('heavy'); later(380, () => Kit.haptic('success'));
          later(170, () => { bits(fx, cx, cy, 34, FOIL[3], { d: w * 1.3, ms: 1100 }); if (!quick) { const f = el('i', { class: 'pk-flash gold', style: { left: cx + 'px', top: cy + 'px' } }); fx.appendChild(f); setTimeout(() => f.remove(), 700); } });
          return;
        }
        stage.classList.add('prism'); later(3000, () => stage.classList.remove('prism'));
        const rays = el('i', { class: 'pk-prism' }); c.el.insertBefore(rays, c.el.firstChild); setTimeout(() => rays.remove(), 3400);
        Kit.haptic('heavy'); later(150, () => Kit.sfx('sparkle', 1)); later(360, () => { Kit.sfx('win', 1); Kit.haptic('success'); }); later(900, () => Kit.sfx('sparkle', .9)); later(1500, () => { Kit.sfx('good', .8); Kit.haptic('medium'); });
        later(170, () => {
          bits(fx, cx, cy, 44, FOIL[4], { d: w * 1.5, ms: 1300 });
          if (!quick) { const f = el('i', { class: 'pk-flash rain', style: { left: cx + 'px', top: cy + 'px' } }); fx.appendChild(f); setTimeout(() => f.remove(), 900); Kit.confetti({ colors: FOIL[4], count: 170 }); }
        });
        later(950, () => bits(fx, cx, cy, 26, FOIL[4], { d: w * 1.2, ms: 1200 }));
      }
      const big = c => !c.up && (c.x.ed || 0) >= 3;
      // ── The tumble. A face-down card p cards from the front (p = 1 is the slot it waits in, one short of the front):
      // its leading edge is the hinge, on the front slot's right-hand edge, and it has come over by `th` degrees (0
      // would be flat on its back, 90 edge-on, 180 face up in the front slot). Cards further back wait behind it,
      // tilted the same way. The hinge does not move while p goes from 1 to 0: only the angle does, so the far edge
      // comes up toward you and over. Half way along (p = .5) the card is edge-on, which is also where a strip let go
      // of settles forward or back: the face is never seen on a card that then goes back down.
      const LEAN = 48, EPS = .004;
      function tumble(j, p, CU, FX) {
        const c = cells[j]; if (!c || c.landed) return null;
        if (p <= EPS && dealt && !ended) { land(j); return null; }
        const w = CU * .7143, a = Math.max(0, p); let th, sc, tx, op = 1;
        if (a <= 1) { th = 180 - (180 - LEAN) * Math.pow(a, .552); sc = 1 - a * .1; tx = w; }
        else { th = LEAN + Math.min(8, (a - 1) * 5); sc = Math.max(.5, .9 - (a - 1) * .1); tx = w + (a - 1) * FX * CU * .5; op = Math.max(0, 1 - (a - 1) * .38); }
        shadow(c, a, th, sc, w);
        return { t: 'translate3d(' + tx.toFixed(1) + 'px,0,0) rotateY(' + (-th).toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')', z: 100 - Math.round(a * 10) + (a < .5 ? 1 : 0), o: op, dim: Math.min(1, a) };
      }
      // its shadow on the table: under the part of the card that is over it, soft and wide while the card is up on
      // its edge, tighter and darker as it comes down
      function shadow(c, a, th, sc, w) {
        if (a > 1.25 || !dealt) { if (c.sh) c.sh.style.opacity = '0'; return; }
        if (!c.sh) { c.sh = el('i', { class: 'pk-sh' }); flow.insertBefore(c.sh, flow.firstChild); }
        const r = th * Math.PI / 180, foot = Math.cos(r) * w * sc, up = Math.sin(r), x0 = w / 2 + Math.min(0, foot), sx = Math.max(.05, Math.abs(foot) / w) * (1 + up * .1);
        c.sh.style.transform = 'translate3d(' + x0.toFixed(1) + 'px,' + (up * w * .03).toFixed(1) + 'px,0) scale(' + sx.toFixed(3) + ',' + (1 + up * .06).toFixed(3) + ')';
        c.sh.style.opacity = ((.62 - .34 * up) * Math.min(1, (1.25 - a) / .25)).toFixed(3);
        c.sh.style.zIndex = String(100 - Math.round(a * 10) - 1);
      }
      // it has come all the way over: from here on it is an ordinary card on the strip, face up
      function land(j) {
        const c = cells[j]; if (!c || c.landed) return; c.landed = true;
        c.el.classList.remove('tum'); if (c.sh) { c.sh.remove(); c.sh = null; }
        const gliding = !!(F && F.raf), onward = gliding ? F.to !== j : Math.round(F.pos) !== j;
        // (a Gold or Rainbow foil is never flown past: a strip that is gliding on, from a flick or Turn the rest, stops
        // where it has landed, and it has everything it is due)
        const stop = big(c) && gliding && onward;
        if (stop) { rest.disabled = false; Promise.resolve().then(() => { if (alive && !ended && F) F.settle(j, 0); }); }
        turn(j, { pass: onward && !stop });
        c.el.classList.add('land'); setTimeout(() => c.el.classList.remove('land'), 460);
        if (!ended && Math.round(F.pos) === j) show(c.x.c, c.x, linkFor(c.x.c));
      }
      // another card has come to the front: the plate says which, once it is face up. (On a calm screen there is no
      // tumble: the card changes face here, and so does any card the strip went past.)
      function front(i) {
        if (!dealt || ended) return;
        clearTimeout(nudge); flow.classList.remove('nudge');
        const c = cells[i]; if (!c) return;
        if (flat) { for (let j = 0; j < i; j++) if (!cells[j].up) turn(j, { pass: true }); if (!c.up) turn(i, { pass: !!(F && F.raf && F.to !== i) }); }
        if (c.up && !ended) show(c.x.c, c.x, linkFor(c.x.c));
      }
      function turnRest() {
        if (ended || rest.disabled || !F || !dealt) return; rest.disabled = true; Kit.sfx('tap'); Kit.haptic('medium');
        if (flat) { const stop = cells.findIndex(big); cells.forEach((c, i) => { if (!c.up && (stop < 0 || i < stop)) turn(i, { pass: true }); }); if (stop >= 0) rest.disabled = false; F.settle(stop < 0 ? n - 1 : stop, 0); return; }
        F.settle(n - 1, 0, 260);   // (a riffle: each card tumbles over as it reaches the front)
      }
      if (n) {
        F = A.makeFlow({ flow: flow, strip: n > 1 ? strip : null, n: n, at: 0, keep: true, wheel: field, make: j => cells[j].el, front: front, pose: flat ? null : tumble });
        if (!flat) F.pos = -1;   // (nothing is in front yet: the first card tumbles in like the rest)
        listen(document, 'keydown', e => { if (!main.isConnected || !dealt || document.querySelector('.view.show, .pk-moment, .k-scrim.show')) return; F.key(e); });
      }
      fit(); listen(window, 'resize', () => { if (main.isConnected) fit(); });
      // (the room kept on the plate is measured in the book faces: measured again once they have loaded)
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive && !ended && main.isConnected) { lastCu = 0; fit(); } });
      // (the room for the cards also changes without the window changing: the tally is taller than the title was, the
      // buttons under it can wrap)
      if (window.ResizeObserver) { let rq = 0; const ro = new ResizeObserver(() => { cancelAnimationFrame(rq); rq = requestAnimationFrame(() => { if (alive && main.isConnected) fit(); }); }); ro.observe(field); offs.push(() => ro.disconnect()); }

      // ── out of the pack and into your hands ──
      (async function deal() {
        const quick = calm();
        if (!quick) await wait(420);
        if (!alive) return;
        const s = seal.getBoundingClientRect(), f = field.getBoundingClientRect(), st = stage.getBoundingClientRect();
        const to = { x: f.left + f.width / 2, y: st.bottom - Math.min(84, st.height * .16) }, dx = to.x - mouth.x, dy = to.y - mouth.y;
        seal.classList.add('away');
        if (!quick) { seal.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)'; await wait(430); }
        await firstReady;   // (the first card's picture: it is nearly always there by now)
        if (!alive) return;
        stage.classList.remove('dealing');
        if (!quick && n) {
          // the cards come up out of the pack one behind the other and fan out along the strip
          cells.forEach((c, i) => {
            if (i > 4) return;
            const r = flow.getBoundingClientRect(), oy = to.y - (r.top + r.height / 2), d = i * 90, here = c.el.style.transform;
            anim(c.el, [{ transform: 'translate3d(0,' + oy.toFixed(1) + 'px,0) scale(.3)', opacity: 0 }, { opacity: 1, offset: .2 }, { transform: here, opacity: c.el.style.opacity || 1 }],
              { duration: 540, delay: d, easing: 'cubic-bezier(.2,.85,.3,1.08)', fill: 'backwards' });
            setTimeout(() => { if (alive) { Kit.sfx('deal', 1); Kit.haptic('tick'); } }, d + 40);
          });
          await wait((Math.min(n, 5) - 1) * 90 + 560);
        }
        if (!alive) return;
        // (the empty pack slides away while the first card comes over)
        if (!quick) { seal.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + (dy + s.height).toFixed(1) + 'px)'; seal.style.opacity = '0'; setTimeout(() => seal.remove(), 400); } else seal.remove();
        stage.classList.add('turning'); mark();
        if (!n) { end(); return; }
        dealt = true; if (flat) front(0); else F.settle(0, 0, 560);
        // (nobody has slid the strip yet: it leans over for a moment to show there is more to the side)
        if (n > 1 && !quick) nudge = setTimeout(() => { if (alive && !ended && F && Math.round(F.pos) === 0 && left) flow.classList.add('nudge'); }, 2200);
      })();

      // ── every card turned: a Thread it finished, then the tally and where to go next ──
      async function end() {
        if (ended || !alive) return; ended = true; rest.hidden = true; clearTimeout(nudge); flow.classList.remove('nudge');
        for (const t of res.threads) { if (!alive) return; await thread(t); }
        if (!alive) return;
        const more = waiting().length;
        stage.classList.remove('turning'); stage.classList.add('tally');
        tallyFill(false);
        foot.innerHTML = '';
        const btn = (label, cls, fn, ic) => el('button', { type: 'button', class: 'btn ' + cls, html: (ic ? Kit.icon(ic) : '') + '<span>' + Kit.esc(label) + '</span>', onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); fn(); } });
        if (window.AnoriaLibrary && window.AnoriaLibrary.open) foot.appendChild(btn('Library', 'btn-soft pk-b-lib', toLibrary, 'book'));
        const fin = btn('Done', more ? 'btn-soft pk-b-done' : 'btn-primary pk-b-done pk-b-main', () => leave());
        foot.appendChild(fin);
        let nxt = null; if (more) { nxt = btn('Next pack', 'btn-primary pk-b-main', next); foot.appendChild(nxt); }
        fit(); Kit.sfx('good'); Kit.haptic('success');
        setTimeout(() => { if (alive && foot.isConnected) try { (nxt || fin).focus({ preventScroll: true }); } catch (e) {} }, 300);
      }
      // the tally on the plate (dry: only to measure the room it needs, before a card has been turned)
      function tallyFill(dry) {
        const nw = cards.filter(x => x.first).length, tw = cards.filter(x => !x.first && x.copy !== false).length;
        const num = (label, v, cls) => { const b = el('b', { text: dry ? String(v) : '0' }); if (!dry) countUp(b, v); return el('div', { class: 'pk-t-n ' + cls + (v ? '' : ' zero') }, [el('span', { class: 'pk-k', text: label }), b]); };
        plate.className = 'pk-plate tally'; plate.innerHTML = '';
        plate.appendChild(el('div', { class: 'pk-t-row' }, [num('New', nw, 'new'), num(plural(tw, 'Second copy', 'Second copies'), tw, 'two')]));
        // the foils in this pack, as the ladder of editions: each one found is lit, with how many
        const eds = EDS.map((x, e) => cards.filter(y => (y.ed || 0) === e).length);
        if (eds.slice(1).some(v => v)) plate.appendChild(el('div', { class: 'pk-t-eds', role: 'img', 'aria-label': EDS.slice(1).map((x, i) => eds[i + 1] ? eds[i + 1] + ' ' + x.n : '').filter(Boolean).join(', ') },
          EDS.slice(1).map((x, i) => el('span', { class: 'pk-t-e e' + (i + 1) + (eds[i + 1] ? ' on' : '') }, [Ed().gem(i + 1, !eds[i + 1]), eds[i + 1] ? el('b', { text: String(eds[i + 1]) }) : null, el('small', { text: Ed().SHORT[i + 1] })]))));
        if (!n) plate.appendChild(el('div', { class: 'pk-p-cap keep full', text: 'You have every card in every edition.' }));
        if (res.threads.length) {
          const gifts = res.threads.some(t => t.gift);
          plate.appendChild(el('div', { class: 'pk-t-ths' }, [el('span', { class: 'pk-k', text: plural(res.threads.length, 'A Legacy Line', 'Legacy Lines') + (gifts ? plural(res.threads.length, ', and its gift', ', and their gifts') : '') })].concat(res.threads.map(t =>
            el('div', { class: 'pk-t-th' }, [t.gift ? el('button', { type: 'button', class: 'pk-t-gift', 'aria-label': 'Its gift: ' + CARDS[t.gift].n + '. Read it', onclick: () => A.openView(t.gift) }, [thumb(t.gift)]) : null, el('b', { text: t.n })])))));
        }
      }
      function countUp(b, v) {
        if (calm() || v < 1) { b.textContent = String(v); return; }
        let i = 0; const go = () => { if (!b.isConnected) return; i++; b.textContent = String(i); if (i < v) setTimeout(go, Math.max(40, 420 / v)); else b.classList.add('pop'); }; setTimeout(go, 220);
      }

      // ── A Thread finished: its cards joined in a line, and the gift it gives, face down until you turn it ──
      function thread(t) {
        return new Promise(resolve => {
          const T = C.THREADS.filter(x => x.id === t.id)[0] || { cards: [] }, g = t.gift, held = T.cards.every(k => had[k] == null || had[k] > 0);
          const chain = el('div', { class: 'pk-chain', style: { '--n': T.cards.length } }, T.cards.map((k, i) => el('button', { type: 'button', class: 'pk-ch-l', style: { '--f': col(k), '--i': i }, 'aria-label': 'Read ' + CARDS[k].n, onclick: () => A.openView(k) }, [thumb(k), el('span', { text: CARDS[k].n })])));
          const cap = el('div', { class: 'pk-gift-cap', 'aria-live': 'polite' });
          const go = el('button', { type: 'button', class: 'btn btn-primary pk-m-go', text: 'Carry on', hidden: !!g, onclick: () => { Kit.sfx('tap'); m.classList.add('out'); setTimeout(() => { m.remove(); resolve(); }, calm() ? 0 : 220); } });
          let giftEl = null, turned = false;
          if (g) {
            giftEl = el('button', { type: 'button', class: 'pk-c pk-gift', style: { '--f': col(g) }, 'aria-label': 'The gift, face down. Turn it over' }, [
              el('span', { class: 'pk-glow' }), el('span', { class: 'pk-fl' }, [el('span', { class: 'pk-side b' }, [el('div', { class: 'ac back' }, [el('div', { class: 'ac-in' })]), el('i', { class: 'pk-bow' })]), el('span', { class: 'pk-side f' }, [A.cardEl(g, { mini: true })])])]);
            giftEl.addEventListener('click', () => {
              if (turned) { A.openView(g); return; } turned = true;
              const isNew = Coll.copies(g) < 2; giftEl.classList.add('up', 'new', 'lift'); giftEl.classList.remove('next'); setTimeout(() => giftEl.classList.remove('lift'), 800);
              giftEl.setAttribute('aria-label', CARDS[g].n + '. Read it');
              Kit.sfx('flip'); setTimeout(() => Kit.sfx('sparkle'), 150); Kit.haptic('success');
              const r = giftEl.getBoundingClientRect(); bits(fx, r.left + r.width / 2, r.top + r.height / 2, 20, [col(g)].concat(GOLD), { d: r.width, ms: 800 });
              cap.innerHTML = ''; cap.appendChild(el('b', { text: CARDS[g].n })); cap.appendChild(el('span', { text: isNew ? 'New to you' : 'Your second copy' }));
              go.hidden = false; setTimeout(() => { try { go.focus({ preventScroll: true }); } catch (e) {} }, 500);
            });
          }
          const many = res.threads.length > 1 ? el('div', { class: 'pk-m-dots', role: 'img', 'aria-label': 'Legacy Line ' + (res.threads.indexOf(t) + 1) + ' of ' + res.threads.length }, res.threads.map(x => el('i', { class: x === t ? 'on' : '' }))) : null;
          const m = el('div', { class: 'pk-moment thread' }, [el('div', { class: 'pk-m-in' }, [
            el('div', { class: 'pk-m-a' }, [el('div', { class: 'pk-k', text: held ? 'A Legacy Line you hold' : 'Legacy Line complete' }), el('h2', { class: 'pk-m-t', text: t.n }), chain, many]),
            el('div', { class: 'pk-m-b' }, [g ? el('div', { class: 'pk-k gift', text: 'Its gift' }) : null, giftEl, g ? cap : null, go])])]);
          sc.body.appendChild(m);
          Kit.sfx('win'); Kit.haptic('success');
          if (!calm()) T.cards.forEach((k, i) => setTimeout(() => { if (m.isConnected) { Kit.sfx('chip', .6); Kit.haptic('tick'); } }, 260 + i * 170));
          setTimeout(() => { if (!m.isConnected) return; if (giftEl) { giftEl.classList.add('next'); try { giftEl.focus({ preventScroll: true }); } catch (e) {} } else try { go.focus({ preventScroll: true }); } catch (e) {} }, calm() ? 0 : 300 + T.cards.length * 170);
        });
      }
    }

    next();
    return sc;
  }

  // ═══ The very first time: choose a Guide ═════════════════════════════════════════════════════════════════
  const SHORT = { leonardo: 'Leonardo', tubman: 'Tubman', franklin: 'Franklin' };
  function chooseStarter(app, done) {
    const A = U(), DECKS = A.DECKS, tiles = [];
    let cur = -1, busy = false;
    const hero = el('div', { class: 'pk-ch-hero' }, [el('i', { class: 'pk-ch-glow' })]);
    const info = el('div', { class: 'pk-ch-info', 'aria-live': 'polite' });
    const row = el('div', { class: 'pk-ch-row', role: 'radiogroup', 'aria-label': 'The five Guides' });
    const go = el('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block pk-ch-go', onclick: commit });
    DECKS.forEach((name, i) => {
      const g = C.ARCH[name].guide, G = TX.GUIDES[g], pic = el('span', { class: 'pic' }), im = A.artImg(g, true), bar = el('span', { class: 'bar' });
      if (im) pic.appendChild(im);
      A.deckFacs(C.ARCH[name].cards).forEach(x => bar.appendChild(el('i', { style: { '--c': A.FAC[x[0]].c, '--n': x[1] } })));
      const t = el('button', { type: 'button', class: 'pk-ch-t', role: 'radio', 'aria-checked': 'false', tabindex: '-1', 'aria-label': G.n + ', the ' + name + ' deck', style: { '--f': A.FAC[G.f].c, '--i': i }, onclick: () => pick(i, true) }, [pic, el('b', { text: SHORT[g] || G.n }), bar]);
      tiles.push(t); row.appendChild(t);
    });
    row.addEventListener('keydown', e => { const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key]; if (!d) return; e.preventDefault(); const j = (cur + d + DECKS.length) % DECKS.length; pick(j, true); tiles[j].focus(); });
    // a finger drawn across the Guide brings the next one forward
    let sw = null;
    hero.addEventListener('pointerdown', e => { sw = { x: e.clientX, y: e.clientY }; });
    hero.addEventListener('pointerup', e => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null; if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) { hero.setAttribute('data-swiped', String(Date.now())); pick((cur + (dx < 0 ? 1 : -1) + DECKS.length) % DECKS.length, true); } });

    function pick(i, user) {
      if (busy || i === cur) return;
      const fromRight = i > cur; cur = i;
      const name = DECKS[i], g = C.ARCH[name].guide, G = TX.GUIDES[g];
      tiles.forEach((t, j) => { t.classList.toggle('on', j === i); t.setAttribute('aria-checked', String(j === i)); t.setAttribute('tabindex', j === i ? '0' : '-1'); });
      // the Guide steps forward, and the one who was there steps back
      hero.querySelectorAll('.pk-ch-card').forEach(old => { old.classList.add('out'); old.disabled = true; setTimeout(() => old.remove(), calm() ? 0 : 260); });
      const card = el('button', { type: 'button', class: 'pk-ch-card' + (user ? (fromRight ? ' r' : ' l') : ''), 'aria-label': 'Read ' + G.n + '\'s card', onclick: () => { if (Date.now() - (+hero.getAttribute('data-swiped') || 0) > 400) A.openView(g); } }, [A.cardEl(g)]);
      hero.style.setProperty('--f', A.FAC[G.f].c); hero.appendChild(card);
      const facs = el('div', { class: 'pk-ch-facs' }); A.deckFacs(C.ARCH[name].cards).forEach(x => facs.appendChild(el('span', { style: { '--c': A.FAC[x[0]].c } }, [el('i'), A.FAC[x[0]].n])));
      info.innerHTML = '';
      info.appendChild(el('div', { class: 'pk-ch-dk' }, [el('div', {}, [el('span', { class: 'pk-k', text: 'The deck' }), el('b', { text: name })]), facs]));
      info.appendChild(el('p', { class: 'pk-ch-plan', text: A.PLAN[name] }));
      info.appendChild(el('div', { class: 'pk-ch-pow' }, [el('span', { class: 'pk-k', text: Kit.poss(G.n) + ' power' }), el('p', { text: G.tx })]));
      info.appendChild(el('button', { type: 'button', class: 'btn btn-soft btn-sm pk-ch-see', html: Kit.icon('cards') + '<span>See the deck’s ' + A.Coll.DECK + ' cards</span>', onclick: () => { Kit.sfx('tap'); A.deckSheet(A.readyDeck(name)); } }));
      info.classList.remove('in'); void info.offsetWidth; info.classList.add('in');
      go.textContent = 'Begin with ' + G.n;
      if (user) { Kit.sfx('flip'); Kit.haptic('light'); }
    }
    function commit() {
      if (busy || cur < 0) return; busy = true;
      const name = DECKS[cur], g = C.ARCH[name].guide;
      Kit.sfx('tap'); Kit.haptic('medium');
      if (!Coll.chooseStarter(name)) { if (done) done(); return; }   // (already chosen, on another device)
      root.classList.add('gone');
      run({ guides: [{ g: g, starter: true, deck: name }] }, done);
    }
    const root = el('div', { class: 'pk-choose' }, [
      el('div', { class: 'pk-ch-in' }, [
        el('header', { class: 'pk-ch-hd' }, [el('img', { class: 'pk-ch-logo', src: IMG + 'logo.webp', alt: 'Anoria', draggable: 'false' }), el('div', { class: 'pk-ch-ttl' }, [el('h1', { text: 'Choose your Guide' }), el('p', { text: 'Each one brings a deck to begin with.' })])]),
        hero, el('div', { class: 'pk-ch-side' }, [row, info, el('div', { class: 'pk-ch-dock' }, [go])])
      ])
    ]);
    app.innerHTML = ''; app.appendChild(root);
    // the logo first, for a breath (a tap moves on)
    if (!calm() && !(window.AnoriaGuide && window.AnoriaGuide.justRan())) { const sp = el('div', { class: 'pk-ch-splash' }, [el('img', { src: IMG + 'logo.webp', alt: '', draggable: 'false' })]); root.appendChild(sp); sp.addEventListener('pointerdown', () => sp.remove()); setTimeout(() => sp.remove(), 1950); }
    pick(0, false);
  }

  window.AnoriaPacks = {
    chooseStarter: chooseStarter,
    open: function (done) { run({}, done); },
    earned: function (list, done) {
      list = list || [];
      run({ guides: list.filter(x => x && x.t === 'guide' && TX.GUIDES[x.g]).map(x => ({ g: x.g })), first: list.filter(x => x && x.t === 'pack' && x.pack).map(x => x.pack.id) }, done);
    }
  };
})();
