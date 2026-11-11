// Anoria: the editions of a card (Tim, 2026-11-11: "adapt the card art selection mechanic from lorcana such that a
// player could uncover different editions of the cards through the pack opens and can switch the art on the card at
// any point through an icon opposite the art/text toggle button").
// Every card is printed in five finishes that play the same: Matte, Shiny, Silver foil, Gold foil and Rainbow foil.
// Which ones you have found, and which one each card is shown in, are part of your collection (coll.js: found in
// packs, kept in anoria_coll, so they follow the account). This file is how they look and how you choose:
//   AnoriaEd.dress(card, key, o)  called by cardEl (ui.js) on every card it makes: the card takes the finish it is
//                                 shown in (o.ed names another; o.plain is Matte whatever you chose: lessons), a full
//                                 card gets its rarity mark, and a card being read (o.tg) gets the edition button on
//                                 the picture's lower right, opposite the picture and words button
//   AnoriaEd.piece(node, key)     a piece that is not a card (a Figure on the map) takes the edition on its frame
//   AnoriaEd.choose(button, key)  the chooser: the five editions of this very card, the ones not found yet locked. A
//                                 tap on one you have found changes the card there and then, wherever it is drawn
//   AnoriaEd.gem(e, off)          an edition drawn small (the Library, a pack's tags and tally)
//   AnoriaEd.wake()               a foil card has come to the front: the light starts following
// The light on a foil follows the finger, the pointer or the tilt of the phone, as Lorcana's does, but only on the
// card in front of you (the one being read, the front card of a strip, a card out of a pack). Cards on the table and
// in the hand keep still. The looks are editions.css.
(function () {
  'use strict';
  const Coll = window.AnoriaColl, CARDS = window.AnoriaCards.CARDS, el = Kit.el, ED = Coll.EDITIONS;
  const SHORT = ['Matte', 'Shiny', 'Silver', 'Gold', 'Rainbow'], ALLCLS = ED.slice(1).map(x => 'ed-' + x.id);
  const U = () => window.AnoriaUI;
  const calm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const of = key => (CARDS[key] ? Coll.look(key) : 0);
  const cls = key => { const e = of(key); return e ? 'ed-' + ED[e].id : ''; };
  const gem = (e, off) => el('i', { class: 'ed-gem e' + e + (off ? ' off' : '') });

  // ═══ A card takes its finish ═════════════════════════════════════════════════════════════════════════════
  function paint(n, e) {
    ALLCLS.forEach(c => n.classList.remove(c)); n.querySelectorAll('.ed-fx').forEach(x => x.remove());
    n.setAttribute('data-ed', String(e));
    if (e) {
      n.classList.add('ed-' + ED[e].id);
      const art = n.querySelector('.ac-art');
      if (art && !n.classList.contains('mini')) { art.appendChild(el('i', { class: 'ed-fx a', 'aria-hidden': 'true' })); art.appendChild(el('i', { class: 'ed-fx b', 'aria-hidden': 'true' })); }
    }
    const b = n.querySelector('.ac-ed'); if (b) { const g = b.querySelector('.ed-gem'); if (g) g.className = 'ed-gem e' + e; b.setAttribute('aria-label', 'Choose the edition of ' + CARDS[n.getAttribute('data-card')].n + '. It is shown in ' + ED[e].n); }
  }
  function dress(n, key, o) {
    o = o || {}; if (!CARDS[key]) return n;
    const e = o.ed != null ? o.ed : o.plain ? 0 : of(key);
    if (o.plain) n.setAttribute('data-edfix', '1');
    if (!o.mini) {
      const r = Coll.rarity(key), mark = () => el('i', { class: 'ac-rar r' + r, role: 'img', 'aria-label': Coll.TIERS[r] });
      n.classList.add('rar');
      const paper = n.querySelector('.ac-paper'), brief = n.querySelector('.ac-brief'), art = n.querySelector('.ac-art');
      if (paper) paper.appendChild(mark()); if (brief) brief.appendChild(mark());
      if (o.tg && art) art.appendChild(el('button', { type: 'button', class: 'ac-ed', 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
        onpointerdown: ev => ev.stopPropagation(), onclick: function (ev) { ev.stopPropagation(); choose(this, key); } }, [gem(e)]));
    }
    paint(n, e);
    if (e && !o.mini) wake();
    return n;
  }
  // a piece that is not a card (a Figure on the map): its frame takes the edition, and follows a change
  function piece(n, key) { const c = cls(key); n.setAttribute('data-edk', key); if (c) n.classList.add(c); return n; }
  // the card is shown in another edition now: every place it is drawn follows
  function refresh(key) {
    const e = of(key);
    document.querySelectorAll('.ac[data-card="' + key + '"]').forEach(n => { if (n.closest('.ed-pick') || n.getAttribute('data-edfix')) return; paint(n, e); if (n._dot) n._dot(); });   // (a borderless card's words lie differently: the dot on its map finds its place again)
    document.querySelectorAll('[data-edk="' + key + '"]').forEach(n => { ALLCLS.forEach(c => n.classList.remove(c)); if (e) n.classList.add('ed-' + ED[e].id); });
    wake();
  }

  // ═══ The chooser ═════════════════════════════════════════════════════════════════════════════════════════
  let open = null;
  function close() { if (!open) return; const o = open; open = null; o.btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('keydown', o.key, true); window.removeEventListener('resize', close); o.box.classList.remove('show'); o.scrim.remove(); setTimeout(() => o.box.remove(), 200); try { o.btn.focus({ preventScroll: true }); } catch (e) {} }
  function choose(btn, key) {
    if (open) { const same = open.btn === btn; close(); if (same) return; }
    const have = Coll.editions(key), name = CARDS[key].n, opts = [];
    have[0] = true;   // (Matte is how a card is printed: a card you have only seen across the table is shown in it too)
    const row = el('div', { class: 'ed-row', role: 'radiogroup', 'aria-label': 'The editions of ' + name });
    function mark() { const cur = of(key); opts.forEach((b, e) => { const on = e === cur; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); b.setAttribute('tabindex', on ? '0' : '-1'); }); }
    ED.forEach((x, e) => {
      const b = el('button', { type: 'button', class: 'ed-o' + (have[e] ? '' : ' off'), role: 'radio', 'aria-label': x.n + (have[e] ? '' : ', not found yet'), 'aria-disabled': String(!have[e]),
        onclick: ev => {
          ev.stopPropagation();
          if (!have[e]) { Kit.sfx('tick'); Kit.haptic('tick'); b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); return; }
          if (!Coll.setLook(key, e)) return;
          Kit.sfx('flip', .7); if (e) setTimeout(() => Kit.sfx('sparkle', .5 + e * .1), 90); Kit.haptic(e > 2 ? 'medium' : 'light');
          refresh(key); mark(); b.classList.remove('just'); void b.offsetWidth; b.classList.add('just'); sweep();
        } }, [
        el('span', { class: 'ed-sw an-hand small' }, [U().cardEl(key, { mini: true, ed: e, now: true })]),
        have[e] ? null : el('span', { class: 'ed-lock', html: Kit.icon('lock') }),
        el('small', { text: SHORT[e] })]);
      opts.push(b); row.appendChild(b);
    });
    const scrim = el('div', { class: 'ed-scrim', onclick: ev => { ev.stopPropagation(); close(); } });
    const box = el('div', { class: 'ed-pick', role: 'dialog', 'aria-label': 'The editions of ' + name, onclick: ev => ev.stopPropagation() }, [row]);
    // as wide as five small cards, over the button it came from (under it where there is no room above)
    const W = window.innerWidth, r = btn.getBoundingClientRect(), ew = Math.max(40, Math.min(56, Math.floor((W - 16 - 20 - 32) / 5))), bw = ew * 5 + 32 + 20;
    box.style.setProperty('--ew', ew + 'px'); box.style.width = bw + 'px';
    const cx = r.left + r.width / 2, left = Math.max(8, Math.min(W - bw - 8, cx - bw * .82));
    box.style.left = left + 'px'; box.style.setProperty('--ox', Math.max(16, Math.min(bw - 16, cx - left)) + 'px');
    document.body.appendChild(scrim); document.body.appendChild(box);
    const h = box.offsetHeight, above = r.top - h - 12;
    if (above >= 8) box.style.top = above + 'px'; else { box.classList.add('below'); box.style.top = Math.min(window.innerHeight - h - 8, r.bottom + 12) + 'px'; }
    function keyFn(ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close(); return; }
      const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[ev.key]; if (!d) return;
      ev.preventDefault(); ev.stopPropagation();
      const at = Math.max(0, opts.indexOf(document.activeElement)), j = (at + d + opts.length) % opts.length; try { opts[j].focus(); } catch (e) {}
    }
    open = { btn: btn, box: box, scrim: scrim, key: keyFn };
    btn.setAttribute('aria-expanded', 'true'); document.addEventListener('keydown', keyFn, true); window.addEventListener('resize', close);
    mark(); Kit.sfx('tap'); Kit.haptic('light');
    requestAnimationFrame(() => { box.classList.add('show'); try { opts[of(key)].focus({ preventScroll: true }); } catch (e) {} });
  }

  // ═══ The light on a foil ═════════════════════════════════════════════════════════════════════════════════
  // Where the light falls on the card in front: -1..1 across and down. It follows the pointer (a mouse over the card,
  // a finger on it) or the tilt of the phone, eased so it feels weighty; left alone, it drifts a little, so a foil is
  // never quite still. Cards that aren't in front keep the light where the page left it (editions.css: its rest).
  const REST = { x: -.3, y: -.35 };
  const T = { x: REST.x, y: REST.y, cx: REST.x, cy: REST.y, raf: 0, ptr: false, tilt: null, base: null, prev: null, sweep: 0, was: [], listening: false, asked: false };
  const front = () => Array.prototype.filter.call(document.querySelectorAll('.view:not(.flow):not(.lesson) > .ac, .vf-c.front .ac:not(.back)'), n => n.getAttribute('data-ed') > 0);
  function frame(now) {
    T.raf = 0;
    const cards = front();
    T.was.forEach(n => { if (cards.indexOf(n) < 0) { n.style.removeProperty('--lx'); n.style.removeProperty('--ly'); n._lv = ''; } });
    // (no foil in front: nothing to light. While cards are being read, look again shortly: the next one may be a foil.)
    T.was = cards; if (!cards.length || document.hidden) { if (!cards.length && document.querySelector('.view, .pk-flow')) { clearTimeout(T.poll); T.poll = setTimeout(wake, 350); } return; }
    const quiet = calm();
    let tx = T.ptr ? T.x : T.tilt ? T.tilt.x : REST.x, ty = T.ptr ? T.y : T.tilt ? T.tilt.y : REST.y;
    if (!T.ptr && !quiet) { tx += Math.sin(now / 2300) * .2; ty += Math.sin(now / 3100 + 1) * .1; }
    if (quiet) { T.cx = REST.x; T.cy = REST.y; } else { T.cx += (tx - T.cx) * .12; T.cy += (ty - T.cy) * .12; }
    let x = T.cx; if (T.sweep && !quiet) { const p = (now - T.sweep) / 800; if (p >= 1) T.sweep = 0; else { const e2 = p * p * (3 - 2 * p); x = -1.5 + 3 * e2; T.cx = x; } }
    const v = x.toFixed(3) + ' ' + T.cy.toFixed(3);
    cards.forEach(n => { if (n._lv === v) return; n._lv = v; n.style.setProperty('--lx', x.toFixed(3)); n.style.setProperty('--ly', T.cy.toFixed(3)); });
    if (!quiet) T.raf = requestAnimationFrame(frame);
  }
  function wake() { if (!T.raf) T.raf = requestAnimationFrame(frame); listenTilt(); }
  function sweep() { T.sweep = performance.now(); wake(); }
  function onPtr(e) {
    if (e.pointerType !== 'mouse' && !e.buttons && e.type !== 'pointerdown') return;
    const c = T.was[0]; if (!c || !c.isConnected) { if (e.type === 'pointerdown') wake(); return; }
    const r = c.getBoundingClientRect(); if (!r.width) return;
    if (e.clientX < r.left - r.width * .4 || e.clientX > r.right + r.width * .4 || e.clientY < r.top - 40 || e.clientY > r.bottom + 40) { T.ptr = false; wake(); return; }
    T.x = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width * .55))); T.y = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height * .55))); T.ptr = true; wake();
  }
  document.addEventListener('pointermove', onPtr, { passive: true }); document.addEventListener('pointerdown', onPtr, { passive: true });
  ['pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, e => { if (e.pointerType !== 'mouse') { T.ptr = false; wake(); } }, { passive: true }));
  document.addEventListener('keydown', () => wake()); document.addEventListener('wheel', () => wake(), { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  // the phone's tilt (Lorcana's way: the angle it is held at is the resting angle, and drifts slowly with the hand)
  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    const land = Math.abs(window.orientation || (screen.orientation && screen.orientation.angle) || 0) === 90;
    const b = land ? e.gamma : e.beta, g = land ? -e.beta : e.gamma;
    if (!T.base) T.base = { b: b, g: g };
    const pv = T.prev; T.prev = { b: b, g: g };
    if (pv) { const jb = b - pv.b, jg = g - pv.g; if (Math.abs(jb) > 25) T.base.b += jb; if (Math.abs(jg) > 25) T.base.g += jg; }   // (the sensor's own jumps are not the hand's)
    T.base.b += (b - T.base.b) * .003; T.base.g += (g - T.base.g) * .003;
    T.tilt = { x: Math.max(-1, Math.min(1, REST.x + (g - T.base.g) / 11)), y: Math.max(-1, Math.min(1, REST.y + (b - T.base.b) / 11)) };
    if (T.was.length && !T.raf) wake();
  }
  function listenTilt() {
    if (T.listening || calm() || !('DeviceOrientationEvent' in window)) return;
    const ask = typeof DeviceOrientationEvent.requestPermission === 'function';
    if (ask && lsGet('anoria_tilt_dev') !== '1') return;
    T.listening = true; window.addEventListener('deviceorientation', onOrient);
  }
  // An iPhone asks before it shares its tilt, and only from a tap: asked once, the first time a foil is in front
  document.addEventListener('click', () => {
    if (T.asked || T.listening || calm() || typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function' || lsGet('anoria_tilt_dev') || !front().length) return;
    T.asked = true;
    DeviceOrientationEvent.requestPermission().then(r => { lsSet('anoria_tilt_dev', r === 'granted' ? '1' : 'no'); if (r === 'granted') listenTilt(); }).catch(() => { T.asked = false; });
  });

  window.AnoriaEd = { ED: ED, SHORT: SHORT, of: of, cls: cls, gem: gem, piece: piece, dress: dress, paint: paint, refresh: refresh, choose: choose, close: close, wake: wake, sweep: sweep };
})();
