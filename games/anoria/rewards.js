// Arvela: the sphere and what it brings (Tim, 2026-11-13). The rules are coll.js's; this file draws them.
//   AnoriaRewards.sphere({lit, fresh, size})  the sphere with its twelve signs: lit, just lit (fresh), dark
//   AnoriaRewards.endPanel(R, quiet)          for the results card (Kit.win's show slot): the signs a game lit, the
//                                             sphere coming round, a Guide joining, a calling moving on
//   AnoriaRewards.path(done)                  the screen of the sphere: the turns to the next Guide, how signs are
//                                             lit, the firsts still to come, and every calling
//   AnoriaRewards.collection(done)            the screen of your collection: a ring for each set, the cards found
//                                             only in packs, the finishes and the Domains
// Every sign is a small diamond on a gilt ring round the sphere from the card back. A finished game lights 1, a win
// 2 and your first win of the day 3; when the twelfth is lit the sphere comes round and you have a pack.
(function () {
  'use strict';
  const U = () => window.AnoriaUI, Coll = window.AnoriaColl, C = window.AnoriaCards, TX = window.AnoriaText, el = Kit.el;
  const calm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const NAME = g => TX.GUIDES[g].n;
  // the names a ring or a list has room for
  const SHORT = { leonardo: 'Leonardo', tubman: 'Tubman', shakespeare: 'Shakespeare', suntzu: 'Sun Tzu', wuzetian: 'Empress Wu', mansamusa: 'Mansa Musa', sorjuana: 'Sor Juana', curie: 'Marie Curie', joan: 'Joan of Arc' };
  const short = g => SHORT[g] || NAME(g);
  const face = (g, cls) => { const s = el('span', { class: 'rw-face ' + (cls || '') }); const im = U().artImg(g, true); if (im) s.appendChild(im); return s; };
  const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const signs = n => (n === 1 ? 'one sign' : (WORD[n] || n) + ' signs');

  // ═══ The sphere ════════════════════════════════════════════════════════════════════════════════════════════
  function sphere(o) {
    o = o || {}; const lit = o.lit || 0, fresh = o.fresh || 0, N = Coll.SIGNS;
    const w = el('div', { class: 'rw-sph' + (o.cls ? ' ' + o.cls : ''), role: 'img', 'aria-label': lit + ' of ' + N + ' signs on the sphere are lit' });
    if (o.size) w.style.setProperty('--sz', o.size + 'px');
    w.appendChild(el('i', { class: 'rw-globe' }));
    let s = '<svg class="rw-signs" viewBox="0 0 100 100" aria-hidden="true"><circle class="rw-ring" cx="50" cy="50" r="44.5"/><circle class="rw-ring2" cx="50" cy="50" r="39.5"/>';
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2, x = 50 + 42 * Math.cos(a), y = 50 + 42 * Math.sin(a), on = i < lit, nw = on && i >= lit - fresh;
      s += '<g class="rw-sg' + (on ? ' on' : '') + (nw ? ' nw' : '') + '" data-i="' + i + '" transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') rotate(' + (i * 30) + ')"><circle class="rw-halo" r="6.4"/><path d="M0 -4.4 L3.5 0 L0 4.4 L-3.5 0 Z"/></g>';
    }
    w.insertAdjacentHTML('beforeend', s + '</svg>');
    return w;
  }
  // the signs from `from` lit one after another, n of them (a calm screen: all at once). Each time the twelfth is lit the
  // sphere comes round: it flashes, and the signs still to light start again from the first.
  function lightUp(w, from, n) {
    const gs = w.querySelectorAll('.rw-sg'), N = gs.length, quick = calm();
    const set = upTo => gs.forEach((g, i) => { g.classList.toggle('on', i < upTo); g.classList.remove('nw'); });
    if (quick) { const end = (from + n) % N, wraps = from + n >= N; set(end); for (let i = 0; i < end; i++) if (i >= (wraps ? 0 : from)) gs[i].classList.add('nw'); if (wraps) { w.classList.add('round'); Kit.sfx('win', .7); } return; }
    set(from);
    let i = 0;
    const step = () => {
      if (!w.isConnected && i) return;
      if (i >= n) { if ((from + n) % N === 0) set(0); return; }   // (it came round on the last sign: the ring starts again empty)
      const at = (from + i) % N; if (at === 0 && i) set(0);
      gs[at].classList.add('on', 'nw'); Kit.sfx('chip', .6); Kit.haptic('tick'); i++;
      if (at === N - 1) { setTimeout(() => { if (!w.isConnected) return; w.classList.add('round'); Kit.sfx('win', .7); Kit.haptic('success'); setTimeout(() => w.classList.remove('round'), 1400); }, 200); setTimeout(step, 1300); }
      else setTimeout(step, 260);
    };
    setTimeout(step, 650);
  }

  // ═══ The results card: one panel ═══════════════════════════════════════════════════════════════════════════
  // R is what Coll.gameOver gave. The panel is a single box: the sphere with the signs this game lit beside what lit
  // them, then a row for each Guide who joined and for the calling that moved nearest to its end.
  function endPanel(R, quiet) {
    if (!R || !R.lit || !R.lit.length) return null;
    const total = R.lit.reduce((a, x) => a + x.n, 0), N = Coll.SIGNS, round = R.turns > 0;
    const sp = sphere({ lit: quiet ? (round ? R.signs : R.from + total) : R.from, size: 92 });
    const WHY = { game: 'for the game', win: 'for the win', daily: 'for today\'s first win' };
    const lit = el('ul', { class: 'rw-e-lit' }, R.lit.map(x => el('li', {}, [el('b', { text: '+' + x.n }), el('span', { text: WHY[x.why] })])));
    const packsNow = R.list.filter(x => x.t === 'pack' && x.pack.k === 'sphere').length;
    const say = round ? (packsNow > 1 ? 'The sphere came round ' + WORD[packsNow] + ' times, and a pack is waiting for each time.' : 'The sphere came round, and a pack of\u00a0' + Coll.PACK + ' is waiting for you.')
      : (N - R.signs) + ' more ' + ((N - R.signs) === 1 ? 'sign brings' : 'signs bring') + ' the sphere round.';
    const top = el('div', { class: 'rw-e-top' }, [sp, el('div', { class: 'rw-e-say' }, [el('span', { class: 'rw-k', text: 'This game lit ' + signs(total) }), lit, el('p', { class: 'rw-e-p' + (round ? ' gold' : ''), text: say })])]);
    const box = el('div', { class: 'rw-end' + (round ? ' round' : '') }, [top]);
    // a Guide who joined: by the sphere or by their calling
    R.list.filter(x => x.t === 'guide').forEach(x => {
      const set = Coll.setCards(x.g).length, doms = (x.doms || []).length;
      box.appendChild(el('div', { class: 'rw-e-row join' }, [face(x.g, 'lit'), el('div', { class: 'rw-e-w' }, [
        el('b', { text: NAME(x.g) + ' joins your company' }),
        el('span', { text: (x.why === 'call' ? 'The calling is met. ' : '') + 'The ' + set + ' cards of ' + Kit.poss(NAME(x.g)) + ' set are yours' + (doms ? ', with ' + doms + (doms === 1 ? ' Domain' : ' Domains') + '.' : '.') })])]));
    });
    // a first (your first win, against Normal, against Hard, with a deck you built): a pack of its own
    R.list.filter(x => x.t === 'pack' && x.pack.k === 'first').forEach(x => {
      box.appendChild(el('div', { class: 'rw-e-row first' }, [el('span', { class: 'rw-e-pk' }, [el('i', { class: 'pk-mini' })]), el('div', { class: 'rw-e-w' }, [
        el('b', { text: x.pack.why }), el('span', { text: 'A pack of\u00a0' + x.pack.n + ' is waiting for you.' })])]));
    });
    // the calling this game moved nearest to its end (one row: the others are on the sphere's screen)
    const joined = R.list.filter(x => x.t === 'guide').map(x => x.g), c = R.calls.filter(x => joined.indexOf(x.g) < 0).sort((a, b) => b.have / b.need - a.have / a.need)[0];
    if (c) {
      const bar = el('span', { class: 'rw-bar' }, [el('i', { style: { width: (100 * c.was / c.need).toFixed(1) + '%' } })]);
      box.appendChild(el('div', { class: 'rw-e-row call' }, [face(c.g), el('div', { class: 'rw-e-w' }, [
        el('div', { class: 'rw-e-h' }, [el('b', { text: NAME(c.g) }), el('span', { class: 'rw-of', text: c.have + ' of ' + c.need })]), bar, el('small', { text: c.say })])]));
      setTimeout(() => { const i = bar.firstChild; if (i) i.style.width = (100 * c.have / c.need).toFixed(1) + '%'; }, quiet || calm() ? 0 : 900);
    }
    if (!quiet) lightUp(sp, R.from, total);
    return box;
  }

  // ═══ The sphere's screen ═══════════════════════════════════════════════════════════════════════════════════
  const tap = () => { Kit.sfx('tap'); Kit.haptic('light'); };
  function path(done) {
    const A = U(), sp = Coll.sphere(), sc = A.screen({ title: 'The sphere', cls: 'rw-scr rw-path', onClose: () => { if (done) done(); } });
    const L = el('section', { class: 'rw-col a' }), R = el('section', { class: 'rw-col b' });
    sc.body.appendChild(el('div', { class: 'rw-split' }, [L, R]));
    // the sphere, and the turns ahead of it as far as the next Guide
    const big = sphere({ lit: sp.lit, cls: 'big' });
    big.appendChild(el('div', { class: 'rw-mid' }, [el('b', { text: String(sp.lit) }), el('span', { text: 'of ' + sp.of })]));
    L.appendChild(big);
    if (sp.next) {
      const tr = el('div', { class: 'rw-turns', role: 'img', 'aria-label': 'A pack each time the sphere comes round, and a new Guide in ' + sp.toGuide + (sp.toGuide === 1 ? ' turn' : ' turns') });
      for (let t = 1; t <= sp.toGuide; t++) tr.appendChild(t === sp.toGuide ? el('span', { class: 'rw-t g', html: A.MARK.guide }) : el('i', { class: 'pk-mini rw-t' }));
      L.appendChild(tr);
      L.appendChild(el('p', { class: 'rw-say c', text: sp.toGuide === 1 ? 'The next time the sphere comes round, it brings a pack and a new Guide.' : 'Each time the sphere comes round it brings a pack of\u00a0' + Coll.PACK + ' cards. ' + sp.guideSay }));
    } else L.appendChild(el('p', { class: 'rw-say c', text: 'Each time the sphere comes round it brings a pack of\u00a0' + Coll.PACK + ' cards.' }));
    // how a sign is lit
    const LG = [[sp.light.game, 'A finished game lights one sign.'], [sp.light.game + sp.light.win, 'A win lights two.'], [sp.light.game + sp.light.win + sp.light.daily, 'Your first win of the day lights three.']];
    L.appendChild(el('ul', { class: 'rw-how' }, LG.map(x => el('li', {}, [el('span', { class: 'rw-dm' }, Array.from({ length: x[0] }, () => el('i'))), el('span', { text: x[1] })]))));
    // the firsts still to come
    const firsts = Coll.nextUp().filter(x => Coll.FIRSTS[x.id]);
    if (firsts.length) { L.appendChild(el('h2', { class: 'rw-cap', text: 'A pack for each first' }));
      L.appendChild(el('ul', { class: 'rw-firsts' }, firsts.map(x => el('li', {}, [el('i', { class: 'pk-mini' }), el('span', { text: x.when })])))); }
    // the callings
    const calls = Coll.callings().sort((a, b) => b.have / b.need - a.have / a.need);
    if (calls.length) {
      R.appendChild(el('h2', { class: 'rw-cap', text: 'Or call a Guide sooner' }));
      R.appendChild(el('div', { class: 'rw-calls' }, calls.map(c => el('button', { type: 'button', class: 'rw-call' + (c.have / c.need >= .8 ? ' near' : ''), 'aria-label': NAME(c.g) + ': ' + c.say + ' ' + c.have + ' of ' + c.need, onclick: () => { tap(); A.openView(c.g); } }, [
        face(c.g), el('div', { class: 'rw-e-w' }, [el('div', { class: 'rw-e-h' }, [el('b', { text: short(c.g) }), el('span', { class: 'rw-of', text: c.have + ' of ' + c.need })]),
          el('span', { class: 'rw-bar' }, [el('i', { style: { width: (100 * c.have / c.need).toFixed(1) + '%' } })]), el('small', { text: c.say })])]))));
    } else R.appendChild(el('p', { class: 'rw-say', text: 'All twelve Guides are with you.' }));
    return sc;
  }

  // ═══ The collection's screen ═══════════════════════════════════════════════════════════════════════════════
  function ring(x) {
    const r = 33, c = 2 * Math.PI * r, f = x.of ? x.have / x.of : 0, base = x.id === 'base';
    const b = el('button', { type: 'button', class: 'rw-ring' + (x.joined ? '' : ' locked') + (base ? ' base' : '') + (x.have === x.of ? ' full' : ''), 'aria-label': (base ? 'The base set' : Kit.poss(NAME(x.id)) + ' set') + ': ' + x.have + ' of ' + x.of + ' cards' + (x.joined ? '' : ', not with you yet'),
      onclick: () => { tap(); const keys = Coll.setCards(x.id); U().browse((base ? [] : [x.id]).concat(keys.filter(k => Coll.owns(k))), { title: base ? 'The base set' : Kit.poss(NAME(x.id)) + ' set', sub: x.have + ' of ' + x.of + ' cards are yours' }); } });
    const r0 = el('span', { class: 'rw-r' }); r0.innerHTML = '<svg viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="' + r + '" class="tr"/><circle cx="38" cy="38" r="' + r + '" class="fl" stroke-dasharray="' + (c * f).toFixed(1) + ' ' + c.toFixed(1) + '"/></svg>';
    const fc = el('span', { class: 'rw-rf' }); if (base) fc.appendChild(el('img', { src: 'anoria/ui/logo.webp', alt: '', draggable: 'false' })); else { const im = U().artImg(x.id, true); if (im) fc.appendChild(im); }
    r0.appendChild(fc); if (!x.joined) r0.appendChild(el('span', { class: 'rw-lock', html: Kit.icon('lock') }));
    b.appendChild(r0); b.appendChild(el('b', { class: 'rw-rn', text: base ? 'The base set' : short(x.id) })); b.appendChild(el('span', { class: 'rw-rc', text: x.have + ' of ' + x.of }));
    return b;
  }
  function collection(done) {
    const A = U(), sc = A.screen({ title: 'Your collection', cls: 'rw-scr rw-coll', onClose: () => { if (done) done(); } });
    const L = el('section', { class: 'rw-col a' }), R = el('section', { class: 'rw-col b' });
    sc.body.appendChild(el('div', { class: 'rw-split' }, [L, R]));
    L.appendChild(el('h2', { class: 'rw-cap', text: 'The sets' }));
    const sets = Coll.setsProgress();
    L.appendChild(el('div', { class: 'rw-rings base' }, sets.slice(0, 1).map(ring)));
    L.appendChild(el('div', { class: 'rw-rings' }, sets.slice(1).map(ring)));
    // the cards found only in packs, by tier
    const pool = Coll.poolProgress(), TN = Coll.TIERS;
    R.appendChild(el('h2', { class: 'rw-cap', text: 'Found only in packs' }));
    R.appendChild(el('div', { class: 'rw-tiers' }, [1, 2, 3, 4].filter(t => pool[t][1]).map(t => el('div', { class: 'rw-tier' }, [
      el('span', { class: 'rw-tn' }, [el('i', { class: 'rr-i r' + t }), TN[t]]), el('span', { class: 'rw-bar' }, [el('i', { style: { width: (100 * pool[t][0] / pool[t][1]).toFixed(1) + '%' } })]), el('span', { class: 'rw-of', text: pool[t][0] + ' of ' + pool[t][1] })]))));
    // the finishes
    const ed = Coll.edCounts(), Ed = window.AnoriaEd;
    R.appendChild(el('h2', { class: 'rw-cap', text: 'Finishes you have found' }));
    R.appendChild(el('div', { class: 'rw-eds' }, Coll.EDITIONS.map((x, e) => el('div', { class: 'rw-ed' + (ed[e] ? ' on' : '') }, [Ed ? Ed.gem(e, !ed[e]) : null, el('b', { text: String(ed[e]) }), el('small', { text: Ed ? Ed.SHORT[e] : x.n })]))));
    // the Domains
    const c = Coll.counts();
    R.appendChild(el('h2', { class: 'rw-cap', text: 'Domains' }));
    R.appendChild(el('div', { class: 'rw-tier one' }, [el('span', { class: 'rw-tn', text: 'Yours' }), el('span', { class: 'rw-bar' }, [el('i', { style: { width: (100 * c.doms / c.domsAll).toFixed(1) + '%' } })]), el('span', { class: 'rw-of', text: c.doms + ' of ' + c.domsAll })]));
    R.appendChild(el('p', { class: 'rw-say', text: 'Domains come with the sets: each Guide who joins you brings ' + ((Coll.DSET.cleopatra || []).length || 8) + '.' }));
    return sc;
  }

  window.AnoriaRewards = { sphere: sphere, lightUp: lightUp, endPanel: endPanel, path: path, collection: collection, short: short };
})();
