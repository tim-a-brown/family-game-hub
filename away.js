// Away: what a live online table shows while a player's device has dropped out (Centipede, Space Invaders, TetriNET,
// Pong). One design language for all of them:
//  - on the play surface, the player's piece stays where it was, ghosted in their seat color, with a ring round it
//    that drains while the table waits for them (Away.ring, drawn by the game on its own canvas);
//  - when the wait runs out the game holds still for the host and a composed glass panel comes up over the field
//    (Away.ask): the player's token at its head, one sentence, and the choices laid out as real options, the main one
//    in gold (a robot face in the player's color for "Let the computer play ...");
//  - while the computer plays for them, their piece carries a small robot badge in their color (Away.bot);
//  - when they come back, a moment says so (Away.back) and the game lights the piece up again.
// Away.note is the plate other players' devices see while the host chooses; Away.pill a small plate that stands for
// a panel put away (Pong, where the match waits). Away.wait(n) is how long the nth wait lasts: 45 s, then 90, 180...
(function () {
  'use strict';
  var doc = document;
  function el(tag, attrs, kids) {
    var e = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v == null) return;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v;
      else if (k === 'style') Object.keys(v).forEach(function (s) { if (s.indexOf('--') === 0) e.style.setProperty(s, v[s]); else e.style[s] = v[s]; });
      else if (k.indexOf('on') === 0 && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return e;
  }
  function poss(n) { return (window.Kit && Kit.poss ? Kit.poss(n) : n + '’s').replace(/'/g, '’'); }
  function sfx(k) { try { if (window.Kit && Kit.sfx) Kit.sfx(k); } catch (e) {} }
  function haptic(k) { try { if (window.Kit && Kit.haptic) Kit.haptic(k); } catch (e) {} }

  var CSS =
    // the scrim: the field dims and softens under the panel, as everything stands still
    '.aw-scrim{position:fixed;inset:0;z-index:420;background:radial-gradient(120% 90% at var(--fx,50%) var(--fy,50%),rgba(6,7,22,.42),rgba(4,5,16,.72));' +
    '-webkit-backdrop-filter:blur(3px) saturate(.75);backdrop-filter:blur(3px) saturate(.75);opacity:0;transition:opacity .28s ease;touch-action:none;}' +
    '.aw-scrim.show{opacity:1;}.aw-scrim.gone{opacity:0;pointer-events:none;}' +
    '.aw-pn{position:fixed;left:0;top:0;box-sizing:border-box;padding:20px 20px 18px;border-radius:26px;color:var(--text,#f3f1fb);font-family:var(--font,"Schibsted Grotesk",system-ui,sans-serif);' +
    'background:radial-gradient(120% 70% at 50% 0%,rgba(255,255,255,.1),rgba(255,255,255,0) 62%),var(--sheet-bg,rgba(24,26,48,.94));' +
    'box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 0 0 1px var(--gl-line,rgba(255,255,255,.12)),0 30px 60px -24px rgba(0,0,0,.85),0 0 0 1px rgba(0,0,0,.25);' +
    '-webkit-backdrop-filter:blur(22px) saturate(1.2);backdrop-filter:blur(22px) saturate(1.2);transform:translateY(14px) scale(.96);opacity:0;' +
    'transition:transform .42s cubic-bezier(.2,1.3,.4,1),opacity .22s ease;overflow:hidden;}' +
    '.aw-scrim.show .aw-pn{transform:none;opacity:1;}.aw-scrim.gone .aw-pn{transform:translateY(8px) scale(.97);opacity:0;transition-duration:.2s;}' +
    // a hairline in the player's color along the top, as their seat's light
    '.aw-pn::before{content:"";position:absolute;left:22%;right:22%;top:0;height:2px;border-radius:2px;background:var(--pc);box-shadow:0 0 12px 1px var(--pc);opacity:.85;}' +
    // the head: their token in a ring that has run out, and the sentence
    '.aw-hd{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;}' +
    '.aw-tok{position:relative;flex:none;width:64px;height:64px;display:grid;place-items:center;}' +
    '.aw-tok .avatar{width:50px;height:50px;font-size:21px;filter:saturate(.55) brightness(.92);box-shadow:0 0 0 2px rgba(10,11,26,.9);}' +
    '.aw-tok svg.rg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;}' +
    '.aw-tok svg.rg circle{fill:none;stroke:var(--pc);stroke-width:2.4;stroke-linecap:round;}' +
    '.aw-tok svg.rg .tr{opacity:.24;}.aw-tok svg.rg .dash{stroke-dasharray:3 6.2;opacity:.8;transform-origin:50% 50%;animation:awSpin 9s linear infinite;}' +
    '.aw-tok .cut{position:absolute;right:-1px;bottom:1px;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#1a1b30;color:#fff;' +
    'box-shadow:0 0 0 2px var(--sheet-solid,#181a30),inset 0 0 0 1px rgba(255,255,255,.16);}' +
    '.aw-tok .cut svg{width:14px;height:14px;}' +
    '.aw-ln{margin:0;font-size:18px;line-height:1.28;font-weight:700;letter-spacing:-.01em;text-wrap:balance;max-width:24em;}' +
    // the choices: real options, the main one in gold
    '.aw-ch{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px;}' +
    '.aw-op{appearance:none;border:0;margin:0;cursor:pointer;font:inherit;color:var(--text,#f3f1fb);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:10px;' +
    'min-width:0;padding:16px 12px 15px;border-radius:20px;text-align:center;background:var(--gl-2,rgba(255,255,255,.1));' +
    'box-shadow:inset 0 0 0 1px var(--gl-line,rgba(255,255,255,.12)),inset 0 1px 0 rgba(255,255,255,.08);transition:transform .14s cubic-bezier(.3,.7,.2,1),filter .15s,box-shadow .15s;-webkit-tap-highlight-color:transparent;}' +
    '.aw-op b{font-size:15.5px;line-height:1.25;font-weight:700;text-wrap:balance;}' +
    '.aw-op:active{transform:translateY(1px) scale(.97);filter:brightness(.94);}' +
    '.aw-op:focus-visible{outline:2px solid var(--lit,#ffd34d);outline-offset:3px;}' +
    '.aw-op.main{background:linear-gradient(180deg,var(--gold-hi,#ffe486),var(--gold-lo,#f6b93b));color:var(--gold-ink,#2a1c00);' +
    'box-shadow:inset 0 1px 0 rgba(255,255,255,.75),0 14px 28px -14px rgba(255,190,60,.75);}' +
    '@media (hover:hover){.aw-op:hover{filter:brightness(1.06);}}' +
    '.aw-ic{flex:none;width:52px;height:52px;display:grid;place-items:center;border-radius:50%;}' +
    '.aw-ic .avatar.botav{width:52px;height:52px;}' +
    '.aw-ic.gl{background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);color:var(--text,#fff);}' +
    '.aw-ic.gl svg{width:26px;height:26px;}' +
    '.aw-op.main .aw-ic.gl{background:rgba(42,28,0,.12);box-shadow:inset 0 0 0 1px rgba(42,28,0,.22);color:var(--gold-ink,#2a1c00);}' +
    '.aw-ic.hg svg{animation:awTurn 3.6s cubic-bezier(.6,0,.3,1) infinite;}' +
    '@keyframes awTurn{0%,72%{transform:none;}88%,100%{transform:rotate(180deg);}}' +
    '@keyframes awSpin{to{transform:rotate(360deg);}}' +
    // a short screen (a phone on its side): the token beside the sentence, the options beside each other, lower
    '.aw-pn.sh{padding:14px 16px 14px;border-radius:22px;}.aw-pn.sh .aw-hd{flex-direction:row;text-align:left;gap:14px;}' +
    '.aw-pn.sh .aw-ln{font-size:17px;}.aw-pn.sh .aw-ch{margin-top:13px;}' +
    '.aw-pn.sh .aw-op{flex-direction:row;justify-content:flex-start;text-align:left;padding:10px 14px 10px 10px;gap:12px;border-radius:18px;}' +
    '.aw-pn.sh .aw-ic,.aw-pn.sh .aw-ic .avatar.botav{width:44px;height:44px;}' +
    // a narrow screen (a phone upright): the options one over the other, each a row
    '.aw-pn.nr .aw-ch{grid-template-columns:1fr;gap:8px;}' +
    '.aw-pn.nr .aw-op{flex-direction:row;justify-content:flex-start;text-align:left;padding:11px 16px 11px 11px;gap:14px;border-radius:18px;}' +
    '.aw-pn.nr .aw-ic,.aw-pn.nr .aw-ic .avatar.botav{width:46px;height:46px;}' +
    '.aw-pn.nr .aw-op b{font-size:16px;}' +
    '@media (prefers-reduced-motion:reduce){.aw-pn,.aw-scrim{transition:none;}.aw-ic.hg svg,.aw-tok svg.rg .dash{animation:none;}}' +
    // the plate other devices see while the host chooses, and a panel put away
    '.aw-nt{position:fixed;left:0;top:0;z-index:410;display:flex;align-items:center;gap:10px;box-sizing:border-box;max-width:calc(100vw - 24px);padding:7px 16px 7px 7px;border-radius:999px;' +
    'font-family:var(--font,"Schibsted Grotesk",system-ui,sans-serif);color:var(--text,#f3f1fb);background:var(--toast-bg,rgba(40,43,74,.9));' +
    'box-shadow:inset 0 1px 0 rgba(255,255,255,.18),inset 0 0 0 1px var(--gl-line,rgba(255,255,255,.12)),0 14px 30px -14px rgba(0,0,0,.8);' +
    '-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);opacity:0;transform:translateY(-8px);transition:opacity .22s,transform .3s cubic-bezier(.2,1.2,.4,1);}' +
    '.aw-nt.show{opacity:1;transform:none;}.aw-nt.gone{opacity:0;transform:translateY(-6px);pointer-events:none;}' +
    '.aw-nt b{font-size:14px;line-height:1.25;font-weight:650;text-wrap:balance;}' +
    '.aw-nt.one b{white-space:nowrap;}' +
    '.aw-nt .aw-tok{width:38px;height:38px;}.aw-nt .aw-tok .avatar{width:30px;height:30px;font-size:13px;}.aw-nt .aw-tok svg.rg circle{stroke-width:2;}' +
    '.aw-dim{position:fixed;z-index:405;pointer-events:none;border-radius:inherit;background:rgba(4,5,16,.5);-webkit-backdrop-filter:saturate(.7);backdrop-filter:saturate(.7);opacity:0;transition:opacity .3s;}' +
    '.aw-dim.show{opacity:1;}' +
    'button.aw-nt{appearance:none;border:0;cursor:pointer;font:inherit;}button.aw-nt:active{transform:scale(.97);}';

  function css() { if (!doc.getElementById('aw-kit-css')) doc.head.appendChild(el('style', { id: 'aw-kit-css', text: CSS })); }

  var SVG = {
    // a plug pulled out: the device has dropped out
    cut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 9.2a14 14 0 0 1 19 0"/><path d="M5.8 12.6a9.2 9.2 0 0 1 12.4 0"/><path d="M9.2 16a4.4 4.4 0 0 1 5.6 0"/><circle cx="12" cy="19.4" r="1.2" fill="currentColor" stroke="none"/><path d="M4 3.5l16 17" stroke="#ff7a7a" stroke-width="2.6"/></svg>',
    wait: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3h11M6.5 21h11"/>' +
      '<path d="M8 3c0 4.2 4 5.6 4 9s-4 4.8-4 9M16 3c0 4.2-4 5.6-4 9s4 4.8 4 9"/><path d="M9.6 6.6h4.8L12 9.8z" fill="currentColor" stroke="none" opacity=".9"/><path d="M8.9 19.6c.9-1.9 2-2.5 3.1-2.5s2.2.6 3.1 2.5z" fill="currentColor" stroke="none" opacity=".9"/></svg>',
    end: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h13l-2.6 4L18 12H5"/>' +
      '<path d="M9 4v8M13 4v8" opacity=".55"/></svg>'
  };
  function ringSvg(dashed) {
    return '<svg class="rg" viewBox="0 0 64 64" aria-hidden="true"><circle class="tr" cx="32" cy="32" r="29.5"/>' + (dashed ? '<circle class="dash" cx="32" cy="32" r="29.5"/>' : '') + '</svg>';
  }
  function token(name, color, o) {
    o = o || {};
    var av = window.Kit && Kit.avatar ? Kit.avatar.el(name, null, color) : el('span', { class: 'avatar', style: { '--c': color }, text: String(name || '?').charAt(0).toUpperCase() });
    return el('span', { class: 'aw-tok', style: { '--pc': color } }, [av, el('span', { html: ringSvg(o.dashed !== false) }).firstChild, o.cut === false ? null : el('i', { class: 'cut', html: SVG.cut })]);
  }
  function icon(kind, color) {
    if (kind === 'bot') {
      var f = window.Kit && Kit.botFace ? Kit.botFace('', color) : el('span', { class: 'avatar', style: { '--c': color } });
      return el('span', { class: 'aw-ic' }, [f]);
    }
    return el('span', { class: 'aw-ic gl' + (kind === 'wait' ? ' hg' : ''), html: SVG[kind] || '' });
  }
  // (at: the field's element, or a function that gives it, for a game that builds its field again on a turn)
  function atOf(at) { return typeof at === 'function' ? at() : at; }
  function rectOf(at) {
    at = atOf(at);
    var vw = window.innerWidth, vh = window.innerHeight;
    var r = at && at.isConnected ? at.getBoundingClientRect() : null;
    if (!r || !r.width) return { left: 0, top: 0, width: vw, height: vh, right: vw, bottom: vh };
    return r;
  }

  var cur = null;
  // o: {name, color, at: the field element, line, choices: [{id, label, icon: 'bot' | 'wait' | 'end', main}], onPick(id)}
  function ask(o) {
    css();
    if (cur) cur.close(true);
    var scrim = el('div', { class: 'aw-scrim' }), done = false;
    var head = el('div', { class: 'aw-hd' }, [token(o.name, o.color), el('p', { class: 'aw-ln', text: o.line })]);
    var btns = (o.choices || []).map(function (c) {
      return el('button', { type: 'button', class: 'aw-op' + (c.main ? ' main' : ''), 'data-pick': c.id, onclick: function (e) {
        e.stopPropagation(); if (done) return;
        sfx(c.main ? 'pop' : 'tap'); haptic(c.main ? 'medium' : 'light');
        H.close(); if (o.onPick) o.onPick(c.id);
      } }, [icon(c.icon, o.color), el('b', { text: c.label })]);
    });
    var pn = el('div', { class: 'aw-pn', role: 'dialog', 'aria-modal': 'true', 'aria-label': o.line, style: { '--pc': o.color } }, [head, el('div', { class: 'aw-ch' }, btns)]);
    scrim.appendChild(pn);
    ['pointerdown', 'touchstart', 'mousedown', 'click', 'wheel'].forEach(function (k) { scrim.addEventListener(k, function (e) { if (!pn.contains(e.target)) { e.preventDefault(); } e.stopPropagation(); }, { passive: false }); });
    function key(e) {
      if (done) return;
      if (e.key === 'Escape') { var w = btns.filter(function (b) { return !b.classList.contains('main'); })[0]; if (w) { e.preventDefault(); e.stopPropagation(); w.click(); } }
      else if (e.key === 'Enter' && !(doc.activeElement && pn.contains(doc.activeElement))) { var m = btns.filter(function (b) { return b.classList.contains('main'); })[0]; if (m) { e.preventDefault(); e.stopPropagation(); m.click(); } }
      else if (e.key !== 'Tab') e.stopPropagation();
    }
    doc.addEventListener('keydown', key, true);
    function place() {
      if (done || !scrim.isConnected) return;
      var vw = window.innerWidth, vh = window.innerHeight, M = 14, f = rectOf(o.at);
      var short = vh < 540 && vw > vh, w = Math.min(short ? 560 : 500, vw - 2 * M);
      pn.classList.toggle('sh', short);
      pn.classList.toggle('nr', !short && w < 430);
      pn.style.width = w + 'px';
      var h = pn.offsetHeight;
      var cx = f.left + f.width / 2, cy = f.top + f.height / 2;
      var x = Math.max(M, Math.min(vw - M - w, cx - w / 2)), y = Math.max(M, Math.min(vh - M - h, cy - h / 2));
      pn.style.left = Math.round(x) + 'px'; pn.style.top = Math.round(y) + 'px';
      scrim.style.setProperty('--fx', Math.round(cx / vw * 100) + '%'); scrim.style.setProperty('--fy', Math.round(cy / vh * 100) + '%');
    }
    var at0 = atOf(o.at), ro = window.ResizeObserver && at0 ? new ResizeObserver(function () { requestAnimationFrame(place); }) : null;
    // (a field can take its new size a moment after the window does)
    function onRs() { requestAnimationFrame(place); setTimeout(place, 140); setTimeout(place, 400); }
    var H = {
      el: scrim, panel: pn, place: place,
      close: function (now) {
        if (done) return; done = true; if (cur === H) cur = null;
        doc.removeEventListener('keydown', key, true); window.removeEventListener('resize', onRs); if (ro) ro.disconnect();
        if (now) { scrim.remove(); return; }
        scrim.classList.remove('show'); scrim.classList.add('gone'); setTimeout(function () { scrim.remove(); }, 260);
      }
    };
    doc.body.appendChild(scrim); place();
    if (ro) ro.observe(at0);
    window.addEventListener('resize', onRs);
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (!done) scrim.classList.add('show'); }); });
    var m0 = btns.filter(function (b) { return b.classList.contains('main'); })[0];
    sfx('pop'); haptic('medium');
    cur = H;
    return H;
  }

  // A plate at the top of the field: another device's view while the host chooses (o.text), or a panel put away
  // (o.onTap: a tap brings it back).
  function note(o) {
    css();
    var n = el(o.onTap ? 'button' : 'div', { type: o.onTap ? 'button' : null, class: 'aw-nt' + (String(o.text).length < 30 ? ' one' : ''), role: o.onTap ? null : 'status', 'aria-live': 'polite', style: { '--pc': o.color },
      onclick: o.onTap ? function () { sfx('tap'); haptic('light'); o.onTap(); } : null }, [token(o.name, o.color, { cut: false }), el('b', { text: o.text })]);
    var done = false, dim = o.dim ? el('div', { class: 'aw-dim' }) : null;
    function place() {
      if (done || !n.isConnected) return;
      n.style.left = '0px'; n.style.top = '0px';
      var vw = window.innerWidth, vh = window.innerHeight, f = rectOf(o.at), w = n.offsetWidth, h = n.offsetHeight;
      n.style.left = Math.round(Math.max(12, Math.min(vw - 12 - w, f.left + (f.width - w) / 2))) + 'px';
      n.style.top = Math.round(o.mid ? Math.max(8, Math.min(vh - 8 - h, f.top + (f.height - h) / 2)) : Math.max(8, f.top + 12)) + 'px';
      if (dim) { dim.style.left = f.left + 'px'; dim.style.top = f.top + 'px'; dim.style.width = f.width + 'px'; dim.style.height = f.height + 'px'; var ae = atOf(o.at); dim.style.borderRadius = ae ? getComputedStyle(ae).borderRadius : '0'; }
    }
    function onRs() { requestAnimationFrame(place); setTimeout(place, 140); setTimeout(place, 400); }
    if (dim) doc.body.appendChild(dim);
    doc.body.appendChild(n); place(); window.addEventListener('resize', onRs);
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (!done) { n.classList.add('show'); if (dim) dim.classList.add('show'); } }); });
    return {
      el: n, place: place,
      close: function () {
        if (done) return; done = true; window.removeEventListener('resize', onRs); n.classList.remove('show'); n.classList.add('gone'); setTimeout(function () { n.remove(); }, 260);
        if (dim) { dim.classList.remove('show'); setTimeout(function () { dim.remove(); }, 320); }
      }
    };
  }

  // ── On the game's own canvas ──
  // The ring round a piece whose device has dropped out: a faint track in their color and, over it, what is left of
  // the wait (frac 1 to 0) from the top, clockwise, with a bright tip. frac null: a slow dashed ring turning (waiting
  // with no end, or the host choosing). lw: the line's width in the canvas's own units.
  function ring(g, x, y, r, color, frac, t, lw) {
    lw = lw || Math.max(1, r * 0.12);
    var TAU = Math.PI * 2;
    g.save();
    g.lineCap = 'round';
    g.globalAlpha = 0.1; g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.globalAlpha = 0.22; g.strokeStyle = color; g.lineWidth = lw;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    if (frac == null) {
      var n = 14, a0 = (t || 0) * 0.9;
      g.globalAlpha = 0.55 + 0.3 * Math.sin((t || 0) * 3);
      for (var i = 0; i < n; i++) { var a = a0 + i * TAU / n; g.beginPath(); g.arc(x, y, r, a, a + TAU / n * 0.42); g.stroke(); }
    } else if (frac > 0) {
      frac = Math.min(1, frac);
      var s = -Math.PI / 2, e = s + TAU * frac;
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.28; g.lineWidth = lw * 2.6; g.beginPath(); g.arc(x, y, r, s, e); g.stroke();
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 0.95; g.lineWidth = lw; g.beginPath(); g.arc(x, y, r, s, e); g.stroke();
      // the tip, brighter as the wait runs low
      var tx = x + Math.cos(e) * r, ty = y + Math.sin(e) * r, low = frac < 0.25 ? 0.5 + 0.5 * Math.sin((t || 0) * 10) : 1;
      g.globalAlpha = low; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(tx, ty, lw * 0.75, 0, TAU); g.fill();
    }
    g.restore();
  }
  // A small robot badge in the player's color: the computer is playing this piece
  function bot(g, x, y, r, color) {
    var TAU = Math.PI * 2;
    g.save();
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(x, y + r * 0.12, r * 1.08, 0, TAU); g.fill();
    var gr = g.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
    gr.addColorStop(0, '#34374f'); gr.addColorStop(1, '#14152a');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.lineWidth = Math.max(1, r * 0.2); g.strokeStyle = color; g.beginPath(); g.arc(x, y, r - g.lineWidth / 2, 0, TAU); g.stroke();
    // the head: antenna, ears, face, two gold eyes
    var u = r / 12, hx = x - 7.4 * u, hy = y - 3.4 * u, hw = 14.8 * u, hh = 11.4 * u, rr = 3.6 * u;
    g.strokeStyle = '#f3f1fb'; g.lineWidth = Math.max(0.6, 1.4 * u);
    g.beginPath(); g.moveTo(x, hy); g.lineTo(x, hy - 2.6 * u); g.stroke();
    g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(x, hy - 3.6 * u, 1.6 * u, 0, TAU); g.fill();
    g.fillStyle = '#d9d7e6'; g.fillRect(hx - 2 * u, y - 0.4 * u, 2 * u, 4 * u); g.fillRect(hx + hw, y - 0.4 * u, 2 * u, 4 * u);
    g.fillStyle = '#f3f1fb';
    g.beginPath(); g.moveTo(hx + rr, hy); g.lineTo(hx + hw - rr, hy); g.quadraticCurveTo(hx + hw, hy, hx + hw, hy + rr); g.lineTo(hx + hw, hy + hh - rr);
    g.quadraticCurveTo(hx + hw, hy + hh, hx + hw - rr, hy + hh); g.lineTo(hx + rr, hy + hh); g.quadraticCurveTo(hx, hy + hh, hx, hy + hh - rr); g.lineTo(hx, hy + rr); g.quadraticCurveTo(hx, hy, hx + rr, hy); g.fill();
    g.fillStyle = '#e8a200';
    g.beginPath(); g.arc(x - 3.1 * u, y + 1.6 * u, 1.55 * u, 0, TAU); g.arc(x + 3.1 * u, y + 1.6 * u, 1.55 * u, 0, TAU); g.fill();
    g.strokeStyle = '#1b1c2e'; g.lineWidth = Math.max(0.5, 1.1 * u); g.beginPath(); g.moveTo(x - 1.8 * u, y + 4.9 * u); g.lineTo(x + 1.8 * u, y + 4.9 * u); g.stroke();
    g.restore();
  }
  // How much of a ghost's alpha to use this frame: dim, with a faint flicker now and then, as a lost signal
  function ghostAlpha(t, seed) {
    var a = 0.46 + 0.08 * Math.sin(t * 2.2 + (seed || 0));
    var k = (t * 7 + (seed || 0) * 13) % 23;
    if (k < 0.35) a *= 0.35; else if (k > 11 && k < 11.2) a *= 0.6;
    return a;
  }

  // ── Moments ──
  // Where a moment lies: across the lower edge of o.rect ({left, top, width, height} on the screen: a piece's own
  // place), or of the top part of o.at (o.top: the moment stays clear of the pieces along the field's foot), or o.at
  function anchor(o) {
    var r = o.rect;
    var ae = atOf(o.at);
    if (!r && o.top && ae && ae.isConnected) { var f = ae.getBoundingClientRect(); r = { left: f.left, top: f.top, width: f.width, height: f.height * 0.42 }; }
    if (!r) return ae || null;
    var at = el('div', { 'aria-hidden': 'true', style: { position: 'fixed', pointerEvents: 'none', visibility: 'hidden', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' } });
    doc.body.appendChild(at); setTimeout(function () { at.remove(); }, 3000);
    return at;
  }
  // the moment's tile is in the player's color: its letter or icon dark on a light color (a yellow seat), white on a dark one
  function inked(root, color) {
    var sq = root && root.querySelector && root.querySelector('.k-mo-sq'), m = /^#([0-9a-f]{6})$/i.exec(color || '');
    if (!sq || !m) return root;
    var n = parseInt(m[1], 16), lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    sq.style.color = lum > 0.62 ? '#1b1530' : '#ffffff';
    return root;
  }
  // they are back: a short moment in their color (the game lights their piece up where it stands)
  function back(o) {
    sfx('pop'); haptic('success');
    if (window.Kit && Kit.moment) inked(Kit.moment({ chip: String(o.name || '?').charAt(0).toUpperCase(), color: o.color, title: o.name + ' is back', line: o.line || null, at: anchor(o), ms: 2000 }), o.color);
  }
  // the computer takes their piece
  function botOn(o) {
    if (window.Kit && Kit.moment) inked(Kit.moment({ icon: 'bot', color: o.color, title: o.title, line: o.line || null, at: anchor(o), ms: 2400 }), o.color);
  }
  // the nth wait (0 first): 45 s, then twice as long each time "Keep waiting" is chosen
  function wait(n) { var b = window.__awayAskMs || 45000; return b * Math.pow(2, Math.min(4, n || 0)); }

  window.Away = { ask: ask, note: note, ring: ring, bot: bot, ghostAlpha: ghostAlpha, back: back, botOn: botOn, wait: wait, token: token, poss: poss, current: function () { return cur; } };
})();
