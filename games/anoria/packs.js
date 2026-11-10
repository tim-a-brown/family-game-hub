// Anoria: choosing your starter and opening packs.
//   AnoriaPacks.chooseStarter(app, done)  the first time: the five Guides side by side; the one you choose brings
//                                         their deck, then your welcome packs are opened
//   AnoriaPacks.open(done)                open the packs that are waiting (none waiting: what earns the next one)
//   AnoriaPacks.earned(list, done)        after a won game ([{t:'pack', pack} | {t:'guide', g}]): a new Guide joins
//                                         first, then the packs are opened
// Opening a pack has three beats. The sealed pack is torn across its top (a swipe the tear follows; a tap, Enter or
// Space tears it for you). Its cards come out face down and are turned by the player. It ends on a tally. The cards
// are decided and saved by AnoriaColl.openPack at the moment of the tear, so leaving half way loses nothing.
(function () {
  'use strict';
  const C = window.AnoriaCards, TX = window.AnoriaText, Coll = window.AnoriaColl, CARDS = C.CARDS, el = Kit.el;
  const IMG = 'anoria/ui/', TEAR = 15;   // (the tear line: this far down the pack, in % of its height)
  const GOLD = ['#f6e3a1', '#e9cf86', '#b8862d', '#fff1bf', '#ffffff'];
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
          x.starter ? el('p', { class: 'pk-g-deck' }, [el('span', { class: 'pk-k', text: 'Your deck' }), el('b', { text: x.deck || '' })]) : el('p', { class: 'pk-g-note', text: 'Ready to lead any deck you build.' }),
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

    // ── Torn: the cards are yours from this moment. They come out face down and are turned by the player. ──
    function torn(pack, seal, mouth) {
      const res = Coll.openPack(pack.id);
      seal.classList.add('torn');
      if (!alive) return;
      if (!res) { next(); return; }   // (it was opened somewhere else in the meantime)
      opened++;
      count(true);
      const cards = res.cards, n = cards.length, cells = [];
      // what was yours before this pack (a Thread is only pointed out to a card you can already see)
      const had = {}; cards.forEach(x => { had[x.c] = (had[x.c] == null ? Coll.copies(x.c) : had[x.c]) - 1; });
      res.threads.forEach(t => { if (t.gift) had[t.gift] = (had[t.gift] == null ? Coll.copies(t.gift) : had[t.gift]) - 1; });
      const shown = {}, known = k => !!shown[k] || (had[k] != null ? had[k] > 0 : Coll.copies(k) > 0);
      let left = n, cols = 1, lifted = null, ended = false, sweep = null, mute = 0, turnedByHand = 0;

      const plate = el('div', { class: 'pk-plate', 'aria-live': 'polite' });
      const grid = el('div', { class: 'pk-grid' }), lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); lines.setAttribute('class', 'pk-lines'); lines.setAttribute('aria-hidden', 'true');
      const field = el('div', { class: 'pk-field' }, [grid, lines]);
      const rest = el('button', { type: 'button', class: 'btn btn-soft pk-rest', onclick: () => turnRest() }, [el('span', { class: 'pk-rest-ic', html: Kit.icon('cards') }), el('span', { class: 'pk-rest-t', text: 'Turn them all' })]);
      const foot = el('div', { class: 'pk-foot' }, [n > 2 ? rest : null]);
      // where there's room beside the cards (an iPad on its side): the card just turned, large enough to read
      const big = el('button', { type: 'button', class: 'pk-big', 'aria-label': 'The card just turned', disabled: true }, [el('div', { class: 'ac back' }, [el('div', { class: 'ac-in' })])]);
      let bigKey = null; big.addEventListener('click', () => { if (bigKey) A.openView(bigKey); });
      const info = el('div', { class: 'pk-info' }, [big, plate]), main = el('div', { class: 'pk-main' }, [field, foot]);
      cards.forEach((x, i) => {
        const b = el('button', { type: 'button', class: 'pk-c', 'data-i': String(i), style: { '--f': col(x.c) }, 'aria-label': 'Card ' + (i + 1) + ' of ' + n + ', face down' }, [
          el('span', { class: 'pk-glow' }),
          el('span', { class: 'pk-fl' }, [el('span', { class: 'pk-side b' }, [el('div', { class: 'ac back' }, [el('div', { class: 'ac-in' })])]), el('span', { class: 'pk-side f' }, [A.cardEl(x.c, { mini: true })])])]);
        cells.push({ el: b, x: x, up: false, at: 0 }); grid.appendChild(b);
      });
      plate.appendChild(el('div', { class: 'pk-p-top' }, [el('span', { class: 'pk-p-k', text: pack.why })]));
      plate.appendChild(el('div', { class: 'pk-p-n', text: n + plural(n, ' card', ' cards') }));
      if (!n) plate.appendChild(el('div', { class: 'pk-p-cap keep', text: 'You already have two of every card.' }));
      stage.classList.remove('sealed'); stage.classList.add('reveal', 'dealing'); if (n <= 4) stage.classList.add('few');
      stage.appendChild(info); stage.appendChild(main);

      // room on the plate for the longest thing it could say about any card here, so the cards never shift as they turn
      function reserve() {
        const keep = Array.from(plate.childNodes), cls = plate.className; let h = 0; plate.style.minHeight = ''; plate.setAttribute('aria-busy', 'true');
        cards.forEach(x => {
          const k = x.c, c = CARDS[k]; let far = null;
          const see = (o, tx) => { if (tx && (!far || tx.length + CARDS[o].n.length > far.tx.length + CARDS[far.other].n.length)) far = { other: o, tx: tx }; };
          (c.insp || []).concat(c.from || []).forEach(s => { if (s[0] !== '@') see(s, TX.LINKS[s + '>' + k]); });
          Coll.ALL.forEach(t => { const tc = CARDS[t]; if ((tc.insp || []).concat(tc.from || []).indexOf(k) >= 0) see(t, TX.LINKS[k + '>' + t]); });
          show(k, { first: false }, far, true); h = Math.max(h, plate.offsetHeight);
          if (far) { show(k, { first: false }, null, true); h = Math.max(h, plate.offsetHeight); }
        });
        plate.className = cls; plate.innerHTML = ''; keep.forEach(c => plate.appendChild(c));
        if (h) plate.style.minHeight = h + 'px'; plate.removeAttribute('aria-busy');
      }
      // the biggest the cards can be with all of them in view
      function fit() {
        if (!ended && n) reserve();
        const r = field.getBoundingClientRect(); if (!r.width || !n) return;
        const gap = r.width < 430 || r.height < 340 ? 7 : 10, top = 12, cap = n <= 2 ? 300 : n <= 4 ? 240 : 190;
        const size = c => { const rows = Math.ceil(n / c); return Math.min((r.width - gap * (c - 1)) / c, (r.height - top - gap * (rows - 1)) / rows / 1.4, cap); };
        let best = { w: 0, c: 1 };
        for (let c = 1; c <= n; c++) { const w = size(c), v = w * (n % c ? .9 : 1); if (v > best.v + .25 || !best.w) best = { w: w, c: c, v: v }; }
        if (n <= 3 && size(n) >= 120) best = { w: size(n), c: n };   // two or three sit side by side
        if (ended && cols > 1 && cols <= n && size(cols) >= best.w * .88) best = { w: size(cols), c: cols };   // (the tally keeps the cards where they were)
        const w = Math.max(40, Math.floor(best.w)); cols = best.c;
        grid.style.setProperty('--cw', w + 'px'); grid.style.setProperty('--gap', gap + 'px'); grid.style.width = (cols * w + (cols - 1) * gap) + 'px';
        grid.classList.toggle('small', w < 94); grid.style.setProperty('--lift', w >= 150 ? '1.08' : w >= 94 ? '1.26' : '1.5');
        // a card that grows as it turns grows away from the nearest edge
        cells.forEach((c, i) => { const cx = i % cols, cy = Math.floor(i / cols), rows = Math.ceil(n / cols); c.el.style.transformOrigin = (cols > 1 ? cx / (cols - 1) * 100 : 50) + '% ' + (rows > 1 ? cy / (rows - 1) * 100 : 50) + '%'; });
        lines.innerHTML = '';
      }
      fit(); listen(window, 'resize', () => { if (main.isConnected) fit(); });

      // a Thread between this card and one you can see: a Figure it grew from, or one that grew from it
      function linkFor(k) {
        const c = CARDS[k], out = [];
        (c.insp || []).concat(c.from || []).forEach(s => { if (s[0] !== '@' && s !== k && known(s) && TX.LINKS[s + '>' + k]) out.push({ other: s, tx: TX.LINKS[s + '>' + k] }); });
        Coll.ALL.forEach(t => { const tc = CARDS[t]; if (t !== k && (tc.insp || []).concat(tc.from || []).indexOf(k) >= 0 && known(t) && TX.LINKS[k + '>' + t]) out.push({ other: t, tx: TX.LINKS[k + '>' + t] }); });
        out.forEach(l => { l.cell = cells.filter(c2 => c2.up && c2.x.c === l.other)[0] || null; });
        return out.sort((a, b) => (b.cell ? 1 : 0) - (a.cell ? 1 : 0))[0] || null;
      }
      function knot(c) { if (!c.el.querySelector('.pk-knot')) c.el.appendChild(el('span', { class: 'pk-knot', html: Kit.icon('link') })); c.el.classList.remove('thread'); void c.el.offsetWidth; c.el.classList.add('thread'); }
      function tie(a, b) {   // a gilt line between two cards on the table, drawn and then let go
        if (calm()) return;
        const f = field.getBoundingClientRect(), ra = a.el.getBoundingClientRect(), rb = b.el.getBoundingClientRect();
        const x1 = ra.left + ra.width / 2 - f.left, y1 = ra.top + ra.height / 2 - f.top, x2 = rb.left + rb.width / 2 - f.left, y2 = rb.top + rb.height / 2 - f.top;
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'), bend = Math.min(40, Math.hypot(x2 - x1, y2 - y1) * .18);
        p.setAttribute('d', 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'Q' + ((x1 + x2) / 2).toFixed(1) + ' ' + ((y1 + y2) / 2 - bend).toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1));
        lines.appendChild(p); const len = p.getTotalLength ? p.getTotalLength() : 200; p.style.setProperty('--len', String(len));
        setTimeout(() => p.remove(), 2600);
      }

      function show(k, x, link, dry) {   // the plate: what was just turned
        const t = TX.CARDS[k] || {};
        if (!dry) { bigKey = k; big.disabled = false; big.setAttribute('aria-label', 'Read ' + CARDS[k].n); big.innerHTML = ''; big.appendChild(A.cardEl(k)); big.style.setProperty('--f', col(k)); big.classList.remove('in'); void big.offsetWidth; big.classList.add('in'); }
        plate.className = 'pk-plate ' + (x.first ? 'new' : 'two'); plate.style.setProperty('--f', col(k)); plate.innerHTML = '';
        plate.appendChild(el('div', { class: 'pk-p-top' }, [el('span', { class: 'pk-p-k' }, [el('i'), kindOf(k)]), el('span', { class: 'pk-p-s', text: x.first ? 'New' : 'Second copy' })]));
        plate.appendChild(el('div', { class: 'pk-p-n', text: CARDS[k].n }));
        if (link) plate.appendChild(el('div', { class: 'pk-p-th' }, [el('span', { class: 'pk-p-who', role: 'img', 'aria-label': 'A Thread to ' + CARDS[link.other].n }, [thumb(link.other), el('i', { html: Kit.icon('link') })]), el('span', { class: 'tx', text: link.tx })]));
        else if (t.tx) plate.appendChild(el('div', { class: 'pk-p-cap', html: A.boldKeys(t.tx) }));
        else if (t.fact) plate.appendChild(el('div', { class: 'pk-p-cap it', text: t.fact }));
      }
      function mark() {   // which face-down card asks to be turned: the first, until the player has the idea; then only the last
        cells.forEach(c => c.el.classList.remove('next', 'last'));
        const down = cells.filter(c => !c.up); if (!down.length) return;
        if (down.length === 1 && n > 1) down[0].el.classList.add('last'); else if (turnedByHand < 2) down[0].el.classList.add('next');
        const t = rest.querySelector('.pk-rest-t'); if (t) t.textContent = left === n ? 'Turn them all' : 'Turn the rest';
        rest.hidden = left < 2;
      }
      function settle(c) { if (lifted === c) lifted = null; c.el.classList.remove('lift'); }
      function turn(i, o) {
        const c = cells[i]; if (!c || c.up || !alive || ended) return; o = o || {};
        const k = c.x.c, isNew = c.x.first, last = left === 1;
        c.up = true; c.at = Date.now(); left--; shown[k] = 1; if (!o.quiet) turnedByHand++;
        if (lifted) settle(lifted);
        const link = linkFor(k);
        c.el.classList.add('up', isNew ? 'new' : 'two'); c.el.classList.remove('next', 'last');
        c.el.setAttribute('aria-label', CARDS[k].n + (isNew ? ', new. Read it' : ', a second copy. Read it'));
        c.el.appendChild(isNew ? el('span', { class: 'pk-tag', text: 'New' }) : el('span', { class: 'pk-two', text: '2' }));
        if (link) { knot(c); if (link.cell) { knot(link.cell); if (!o.quiet) tie(link.cell, c); } }
        if (o.quiet) { Kit.sfx('flip', .7); if (isNew) Kit.haptic('light'); }
        else if (isNew) {
          Kit.sfx('flip'); setTimeout(() => Kit.sfx('sparkle', last ? 1 : .8), 140); Kit.haptic('medium');
          if (!o.swept) { c.el.classList.add('lift'); lifted = c; setTimeout(() => settle(c), 760); }   // (a card that came up would hide the next one from a passing finger)
          const r = c.el.getBoundingClientRect(); setTimeout(() => bits(fx, r.left + r.width / 2, r.top + r.height / 2, 14, [col(k), '#fff1bf', '#e9cf86'], { d: r.width * .95, ms: 700 }), 160);
        } else { Kit.sfx('flip', .8); Kit.haptic('light'); }
        if (link && !o.quiet) setTimeout(() => Kit.sfx('good', .6), 300);
        if (!o.quiet || o.say) show(k, c.x, link);
        mark();
        if (!left) setTimeout(end, o.quiet ? 500 : isNew ? 900 : 650);
      }
      function turnRest() {
        if (ended || rest.disabled) return; rest.disabled = true; Kit.sfx('tap'); Kit.haptic('medium');
        const down = cells.map((c, i) => i).filter(i => !cells[i].up), gapMs = calm() ? 0 : Math.max(55, Math.min(95, 700 / down.length));
        down.forEach((i, j) => setTimeout(() => turn(i, { quiet: true, say: j === down.length - 1 }), j * gapMs));
      }
      // a tap turns a card (a second tap reads it); a finger drawn across the cards turns each one it passes
      const cellAt = e => { const t = document.elementFromPoint(e.clientX, e.clientY), b = t && t.closest ? t.closest('.pk-c') : null; return b && grid.contains(b) ? +b.getAttribute('data-i') : -1; };
      grid.addEventListener('pointerdown', e => { sweep = { id: e.pointerId, from: cellAt(e), went: false }; });
      grid.addEventListener('pointermove', e => {
        if (!sweep || e.pointerId !== sweep.id || (e.pointerType === 'mouse' && !e.buttons)) return;
        const i = cellAt(e); if (i < 0 || i === sweep.from && !sweep.went) return;
        if (!sweep.went) { sweep.went = true; if (sweep.from >= 0) turn(sweep.from, { swept: true }); }
        turn(i, { swept: true });
      });
      const lift = () => { if (sweep && sweep.went) mute = Date.now(); sweep = null; };
      grid.addEventListener('pointerup', lift); grid.addEventListener('pointercancel', lift);
      grid.addEventListener('click', e => {
        const b = e.target.closest ? e.target.closest('.pk-c') : null; if (!b) return; const i = +b.getAttribute('data-i'), c = cells[i];
        if (Date.now() - mute < 350) return;
        if (!c.up) turn(i); else if (Date.now() - c.at > 420) A.openView(c.x.c);
      });
      grid.addEventListener('keydown', e => {
        const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key]; if (!d) return;
        const b = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.pk-c') : null; if (!b) return;
        const j = +b.getAttribute('data-i') + d; if (cells[j]) { e.preventDefault(); cells[j].el.focus(); }
      });

      // ── out of the pack and onto the table ──
      (async function deal() {
        const quick = calm();
        if (!quick) await wait(420);
        if (!alive) return;
        const s = seal.getBoundingClientRect(), f = field.getBoundingClientRect(), st = stage.getBoundingClientRect();
        const to = { x: f.left + f.width / 2, y: st.bottom - Math.min(84, st.height * .16) }, dx = to.x - mouth.x, dy = to.y - mouth.y;
        seal.classList.add('away');
        if (!quick) { seal.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)'; await wait(430); }
        if (!alive) return;
        stage.classList.remove('dealing');
        if (!quick && n) {
          cells.forEach((c, i) => {
            const r = c.el.getBoundingClientRect(), ox = to.x - (r.left + r.width / 2), oy = to.y - (r.top + r.height / 2), d = i * (n > 6 ? 62 : 110);
            anim(c.el, [{ transform: 'translate(' + ox.toFixed(1) + 'px,' + oy.toFixed(1) + 'px) scale(.35) rotate(' + ((Math.random() * 30 - 15) | 0) + 'deg)', opacity: 0 }, { opacity: 1, offset: .12 }, { transform: 'none', opacity: 1 }],
              { duration: 520, delay: d, easing: 'cubic-bezier(.2,.85,.3,1.12)', fill: 'backwards' });
            setTimeout(() => { if (alive) { Kit.sfx('deal', n > 6 ? .7 : 1); Kit.haptic('tick'); } }, d + 40);
          });
          await wait((n - 1) * (n > 6 ? 62 : 110) + 520);
        }
        if (!alive) return;
        if (!quick) { seal.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + (dy + s.height).toFixed(1) + 'px)'; seal.style.opacity = '0'; await wait(380); }
        seal.remove(); stage.classList.add('turning'); mark();
        if (!n) { end(); return; }
        if (alive && cells[0]) try { cells[0].el.focus({ preventScroll: true }); } catch (e) {}
      })();

      // ── every card turned: a Thread it finished, then the tally and where to go next ──
      async function end() {
        if (ended || !alive) return; ended = true; rest.hidden = true; if (lifted) settle(lifted); lines.innerHTML = '';
        cells.forEach(c => c.el.classList.remove('next', 'last'));
        for (const t of res.threads) { if (!alive) return; await thread(t); }
        if (!alive) return;
        const nw = cards.filter(x => x.first).length, tw = n - nw, more = waiting().length;
        stage.classList.remove('turning'); stage.classList.add('tally');
        const num = (label, v, cls) => { const b = el('b', { text: '0' }); countUp(b, v); return el('div', { class: 'pk-t-n ' + cls + (v ? '' : ' zero') }, [el('span', { class: 'pk-k', text: label }), b]); };
        plate.className = 'pk-plate tally'; plate.innerHTML = '';
        plate.appendChild(el('div', { class: 'pk-t-row' }, [num('New', nw, 'new'), num(plural(tw, 'Second copy', 'Second copies'), tw, 'two')]));
        if (res.threads.length) {
          const gifts = res.threads.some(t => t.gift);
          plate.appendChild(el('div', { class: 'pk-t-ths' }, [el('span', { class: 'pk-k', text: plural(res.threads.length, 'A Thread', 'Threads') + (gifts ? plural(res.threads.length, ', and its gift', ', and their gifts') : '') })].concat(res.threads.map(t =>
            el('div', { class: 'pk-t-th' }, [t.gift ? el('button', { type: 'button', class: 'pk-t-gift', 'aria-label': 'Its gift: ' + CARDS[t.gift].n + '. Read it', onclick: () => A.openView(t.gift) }, [thumb(t.gift)]) : null, el('b', { text: t.n })])))));
        }
        foot.innerHTML = '';
        const btn = (label, cls, fn, ic) => el('button', { type: 'button', class: 'btn ' + cls, html: (ic ? Kit.icon(ic) : '') + '<span>' + Kit.esc(label) + '</span>', onclick: () => { Kit.sfx('tap'); Kit.haptic('light'); fn(); } });
        if (window.AnoriaLibrary && window.AnoriaLibrary.open) foot.appendChild(btn('Library', 'btn-soft pk-b-lib', toLibrary, 'book'));
        const fin = btn('Done', more ? 'btn-soft pk-b-done' : 'btn-primary pk-b-done pk-b-main', () => leave());
        foot.appendChild(fin);
        let nxt = null; if (more) { nxt = btn('Next pack', 'btn-primary pk-b-main', next); foot.appendChild(nxt); }
        fit(); Kit.sfx('good'); Kit.haptic('success');
        setTimeout(() => { if (alive && foot.isConnected) try { (nxt || fin).focus({ preventScroll: true }); } catch (e) {} }, 300);
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
          const many = res.threads.length > 1 ? el('div', { class: 'pk-m-dots', role: 'img', 'aria-label': 'Thread ' + (res.threads.indexOf(t) + 1) + ' of ' + res.threads.length }, res.threads.map(x => el('i', { class: x === t ? 'on' : '' }))) : null;
          const m = el('div', { class: 'pk-moment thread' }, [el('div', { class: 'pk-m-in' }, [
            el('div', { class: 'pk-m-a' }, [el('div', { class: 'pk-k', text: held ? 'A Thread you hold' : 'Thread finished' }), el('h2', { class: 'pk-m-t', text: t.n }), chain, many]),
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
      info.appendChild(el('button', { type: 'button', class: 'btn btn-soft btn-sm pk-ch-see', html: Kit.icon('cards') + '<span>See its 30 cards</span>', onclick: () => { Kit.sfx('tap'); A.deckSheet(A.readyDeck(name)); } }));
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
        el('header', { class: 'pk-ch-hd' }, [el('img', { class: 'pk-ch-logo', src: IMG + 'logo.webp', alt: 'Anoria', draggable: 'false' }), el('div', { class: 'pk-ch-ttl' }, [el('h1', { text: 'Choose your Guide' }), el('p', { text: 'Each brings a deck to begin with.' })])]),
        hero, el('div', { class: 'pk-ch-side' }, [row, info, el('div', { class: 'pk-ch-dock' }, [go])])
      ])
    ]);
    app.innerHTML = ''; app.appendChild(root);
    // the logo first, for a breath (a tap moves on)
    if (!calm()) { const sp = el('div', { class: 'pk-ch-splash' }, [el('img', { src: IMG + 'logo.webp', alt: '', draggable: 'false' })]); root.appendChild(sp); sp.addEventListener('pointerdown', () => sp.remove()); setTimeout(() => sp.remove(), 1950); }
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
