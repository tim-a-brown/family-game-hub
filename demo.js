// ═══════════════════════════════════════════════════════════════════════════
// Demos: a game played for a first-time player on the game's own table, with captions, a finger that taps the real
// pieces, and a move or two the player makes themselves (Tim, 2026-11-16: "interactive animated demos ... accessible
// with a small icon on the game menu"). Loaded by kit.js only on a page opened as games/<page>.html?demo=1, after the
// game's own scripts; then the game's script, games/demos/<page>.js, calls Kit.demoScript({...}).
//
// The page is a sandbox (sync.js, top): localStorage reads the device's settings, names, scores and history, but the
// game's own saves read as empty, and every write lands in memory for this page only; the cloud never loads; Math.random
// is seeded, so a deal comes out the same every time; Kit.record files nothing.
//
// A script:
//   Kit.demoScript({
//     intro: 'Here’s how a hand of Hearts goes.',   // under the game's name while the table is set
//     beats: 9,                                        // dots in the progress row (each D.say fills one)
//     start: async D => { ... },                       // set the table (the game's test hook), behind the curtain
//     steps: async D => { ... },                       // the demo itself
//     end: 'Keep your points low, and watch out for the Queen of Spades.'   // the closing card's line
//   });
// What a step can do (all return promises):
//   D.say(text, {at, ring, spot, pos, wait, dot})  a caption plate; at: an element, a selector or a function giving one
//       (ringed in gold, the caption placed clear of it); spot: dim the rest; pos: 'top' | 'bottom' | 'center' when there
//       is no at; wait: ms to stay before moving on (default: long enough to read it; false: go on at once, the caption
//       stays); a tap on the caption moves on sooner
//   D.tap(target, {say})   the finger glides there, presses, and a real pointer and click event is sent where it lands
//   D.drag(from, to)       the finger presses at one, carries to the other and lets go (pointer events all the way)
//   D.you(target, text, {allow, until, spot})   the player's turn: the target is ringed and only it (or allow) takes a
//       tap; resolves once until() is true (default: the first tap); a hint finger shows the way if they wait
//   D.wait(ms | fn, maxMs)  wait a time, or until fn() is true
//   D.set(fn)             arrange the table (await fn()), then let it paint
//   D.ring(target) / D.clear()   ring something with no words / take the caption and ring away
//   D.q(sel) / D.qa(sel)  querySelector helpers
//   D.done()              the closing card (also shown when steps end)
// URL extras for tests and recordings: &demoauto=1 (D.you taps for the player after a moment), &seed=<n>, &from=home.
// window.__demo: {phase, says, step, done} for tests.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.KitDemo) return;
  var doc = document, root = doc.documentElement;
  var Q = location.search;
  var AUTO = /[?&]demoauto=1(&|$)/.test(Q), FROM_HOME = /[?&]from=home(&|$)/.test(Q);
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var ABORT = { abort: true };
  var st = { aborted: false, ended: false, dots: 0, beat: 0, cap: null, ring: null, ringSpec: null, finger: null, fx: 0, fy: 0, allow: null, synth: 0, youDone: null };
  var T = window.__demo = { phase: 'boot', says: [], step: 0, done: false, taps: 0 };

  function game() { try { return Kit.game(); } catch (e) { return null; } }
  function el(tag, cls, html) { var n = doc.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function check() { if (st.aborted) throw ABORT; }
  // a target: an element, a selector, or a function giving one; a function may give a list (the ring and the caption
  // then go round all of it, and a tap goes to the first)
  function group(spec) {
    if (!spec) return [];
    try {
      if (typeof spec === 'function') spec = spec();
      if (typeof spec === 'string') spec = doc.querySelector(spec);
    } catch (e) { return []; }
    var l = spec && typeof spec.length === 'number' && spec.nodeType !== 1 ? [].slice.call(spec) : [spec];
    return l.filter(function (n) { return n && n.nodeType === 1 && n.isConnected; });
  }
  function resolve(spec) { return group(spec)[0] || null; }
  function rectOf(n) {
    if (Array.isArray(n)) {
      var u = null;
      n.forEach(function (x) { var r = x.getBoundingClientRect(); if (!r.width && !r.height) return;
        u = u ? { left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; });
      if (!u) return rectOf(n[0]);
      u.width = u.right - u.left; u.height = u.bottom - u.top; return u;
    }
    var q = n.getBoundingClientRect(); return { left: q.left, top: q.top, right: q.right, bottom: q.bottom, width: q.width, height: q.height };
  }
  function vw() { return window.innerWidth; } function vh() { return window.innerHeight; }

  // ── The look (Night glass, gold for what is happening now) ─────────────────────────────────────────────────────
  var CSS =
    '.k-demo-ui{font-family:var(--font,"Schibsted Grotesk",system-ui,sans-serif);-webkit-user-select:none;user-select:none;}' +
    '.k-demo-strip{position:fixed;left:0;right:0;top:0;z-index:9100;display:flex;align-items:center;gap:10px;padding:0 max(12px,calc(12px + var(--corner-x,0px)));' +
      'background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,0) 70%),rgba(14,15,30,.9);-webkit-backdrop-filter:blur(20px) saturate(1.3);backdrop-filter:blur(20px) saturate(1.3);box-shadow:0 1px 0 rgba(255,255,255,.1);}' +
    '.k-demo-strip .x{flex:none;display:grid;place-items:center;width:42px;height:42px;border:0;border-radius:14px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);color:#f3f1fb;cursor:pointer;}' +
    '.k-demo-strip .x:active{transform:scale(.93);}' +
    '.k-demo-strip .x svg{width:20px;height:20px;}' +
    '.k-demo-strip .mid{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:10px;}' +
    '.k-demo-strip .gi{flex:none;width:26px;height:26px;display:grid;place-items:center;}' +
    '.k-demo-strip .gi svg{width:26px;height:26px;}' +
    '@media (max-width:360px){.k-demo-strip .gi{display:none;}}' +
    '.k-demo-dots{--d:min(7px,calc((100vw - 210px) / var(--n,10) / 2));display:flex;gap:var(--d);align-items:center;}' +
    '.k-demo-dots i{flex:none;width:var(--d);height:var(--d);border-radius:50%;background:rgba(255,255,255,.22);transition:background .3s,transform .3s;}' +
    '.k-demo-dots i.on{background:var(--lit,#ffd34d);box-shadow:0 0 8px rgba(255,190,60,.6);}' +
    '.k-demo-dots i.now{transform:scale(1.35);}' +
    '.k-demo-strip .sk{flex:none;height:42px;padding:0 16px;border:0;border-radius:14px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);color:#f3f1fb;font:750 15px/1 var(--font,system-ui);cursor:pointer;}' +
    '.k-demo-strip .sk:active{transform:scale(.96);}' +
    '.k-demo-cap{position:fixed;z-index:9120;left:0;top:0;box-sizing:border-box;width:max-content;max-width:min(430px,calc(100vw - 28px));padding:13px 18px 14px;border-radius:18px;' +
      'background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,0) 60%),rgba(22,24,46,.93);-webkit-backdrop-filter:blur(18px) saturate(1.3);backdrop-filter:blur(18px) saturate(1.3);' +
      'box-shadow:inset 0 0 0 1px rgba(255,255,255,.13),0 22px 44px -14px rgba(0,0,0,.75);color:#f3f1fb;font-weight:600;font-size:16.5px;line-height:1.36;letter-spacing:-.008em;text-wrap:pretty;' +
      'opacity:0;transform:translateY(6px) scale(.98);transition:opacity .28s,transform .38s cubic-bezier(.2,.9,.25,1.2);cursor:pointer;}' +
    '.k-demo-cap.show{opacity:1;transform:none;}' +
    '.k-demo-cap .ln{position:absolute;left:14px;right:14px;top:0;height:2px;border-radius:2px;overflow:hidden;}' +
    '.k-demo-cap .ln::before{content:"";position:absolute;inset:0;background:rgba(255,211,77,.25);}' +
    '.k-demo-cap .ln i{position:absolute;inset:0;background:var(--lit,#ffd34d);box-shadow:0 0 10px 1px rgba(255,190,60,.7);transform-origin:0 50%;transform:scaleX(0);}' +
    '.k-demo-cap.you{padding-left:16px;display:flex;align-items:center;gap:12px;box-shadow:inset 0 0 0 1px rgba(255,211,77,.45),0 0 0 4px rgba(255,211,77,.08),0 22px 44px -14px rgba(0,0,0,.75);}' +
    '.k-demo-cap.you .ln i{transform:none;}' +
    '.k-demo-cap .hd{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:linear-gradient(180deg,#ffe486,#f6b93b);color:#2a1c00;}' +
    '.k-demo-cap .hd svg{width:20px;height:20px;}' +
    '.k-demo-cap .nub{position:absolute;width:14px;height:14px;background:rgba(22,24,46,.96);box-shadow:inset 1px 1px 0 rgba(255,255,255,.13);transform:rotate(45deg);}' +
    '.k-demo-cap.you .nub{box-shadow:inset 1px 1px 0 rgba(255,211,77,.45);}' +
    '.k-demo-cap .nub.up{top:-7px;} .k-demo-cap .nub.dn{bottom:-7px;transform:rotate(225deg);} .k-demo-cap .nub.lf{left:-7px;transform:rotate(-45deg);} .k-demo-cap .nub.rt{right:-7px;transform:rotate(135deg);}' +
    '.k-demo-ring{position:fixed;z-index:9050;left:0;top:0;pointer-events:none;border-radius:16px;box-shadow:0 0 0 2px var(--lit,#ffd34d),0 0 18px 3px rgba(255,190,60,.55);opacity:0;transition:opacity .25s;}' +
    '.k-demo-ring.show{opacity:1;}' +
    '.k-demo-ring.spot{box-shadow:0 0 0 2px var(--lit,#ffd34d),0 0 18px 3px rgba(255,190,60,.55),0 0 0 200vmax rgba(5,6,16,.5);}' +
    '.k-demo-ring::after{content:"";position:absolute;inset:-2px;border-radius:inherit;box-shadow:0 0 0 2px var(--lit,#ffd34d);opacity:0;animation:kDmPulse 1.6s ease-out infinite;}' +
    '@keyframes kDmPulse{0%{opacity:.85;transform:scale(1);}100%{opacity:0;transform:scale(1.12);}}' +
    '.k-demo-finger{position:fixed;z-index:9200;left:0;top:0;width:0;height:0;pointer-events:none;opacity:0;transition:opacity .25s;}' +
    '.k-demo-finger.show{opacity:1;}' +
    '.k-demo-finger b{position:absolute;left:-23px;top:-23px;width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.55),rgba(255,255,255,.22) 62%,rgba(255,255,255,.1));' +
      'box-shadow:inset 0 0 0 2px rgba(255,255,255,.9),0 6px 16px rgba(0,0,0,.45);transition:transform .14s cubic-bezier(.3,.7,.2,1);}' +
    '.k-demo-finger.down b{transform:scale(.8);}' +
    '.k-demo-rip{position:fixed;z-index:9190;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;pointer-events:none;box-shadow:0 0 0 2px var(--lit,#ffd34d);animation:kDmRip .55s ease-out forwards;}' +
    '@keyframes kDmRip{0%{opacity:.95;transform:scale(.5);}100%{opacity:0;transform:scale(2);}}' +
    '.k-demo-curtain{position:fixed;inset:0;z-index:9080;display:grid;place-items:center;padding:24px;background:var(--page-bg,#0e0f1b);background-color:var(--bg,#0e0f1b);transition:opacity .5s;}' +
    '.k-demo-curtain.out{opacity:0;pointer-events:none;}' +
    '.k-demo-curtain .in{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;max-width:420px;animation:kDmUp .6s cubic-bezier(.2,.9,.25,1) both;}' +
    '.k-demo-curtain .ic{width:92px;height:92px;filter:drop-shadow(0 0 26px color-mix(in srgb,var(--h,#8b7cff) 55%,transparent)) drop-shadow(0 10px 18px rgba(0,0,0,.4));}' +
    '.k-demo-curtain .ic svg{width:100%;height:100%;}' +
    '.k-demo-curtain h2{margin:0;font-family:var(--display,system-ui);font-weight:800;font-size:2.1rem;letter-spacing:-.03em;color:#f3f1fb;}' +
    '.k-demo-curtain p{margin:0;color:var(--text-2,#c6c4da);font-size:1.05rem;line-height:1.4;}' +
    '@keyframes kDmUp{0%{opacity:0;transform:translateY(14px) scale(.97);}100%{opacity:1;transform:none;}}' +
    '.k-demo-end{position:fixed;inset:0;z-index:9300;display:grid;place-items:center;padding:24px max(24px,calc(24px + var(--corner-x,0px)));background:rgba(6,7,16,.62);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);opacity:0;transition:opacity .35s;}' +
    '.k-demo-end.show{opacity:1;}' +
    '.k-demo-end .pn{position:relative;box-sizing:border-box;width:min(400px,100%);padding:30px 24px 22px;border-radius:28px;text-align:center;' +
      'background:linear-gradient(160deg,color-mix(in srgb,var(--h,#8b7cff) 22%,transparent),rgba(255,255,255,.04) 60%),rgba(22,24,46,.95);box-shadow:inset 0 0 0 1px rgba(255,255,255,.13),0 30px 60px -20px rgba(0,0,0,.8);' +
      'transform:translateY(16px) scale(.96);transition:transform .5s cubic-bezier(.2,.9,.25,1.15);overflow:hidden;}' +
    '.k-demo-end.show .pn{transform:none;}' +
    '.k-demo-end .pn::before{content:"";position:absolute;left:22px;right:22px;top:0;height:2px;border-radius:2px;background:var(--lit,#ffd34d);box-shadow:0 0 12px 1px rgba(255,190,60,.7);}' +
    '.k-demo-end .ic{width:74px;height:74px;margin:0 auto 12px;filter:drop-shadow(0 0 22px color-mix(in srgb,var(--h,#8b7cff) 55%,transparent));}' +
    '.k-demo-end .ic svg{width:100%;height:100%;}' +
    '.k-demo-end h2{margin:0 0 8px;font-family:var(--display,system-ui);font-weight:800;font-size:1.7rem;letter-spacing:-.03em;color:#f3f1fb;}' +
    '.k-demo-end p{margin:0 0 20px;color:var(--text-2,#c6c4da);font-size:1rem;line-height:1.4;text-wrap:pretty;}' +
    '.k-demo-end .acts{display:flex;flex-direction:column;gap:10px;}' +
    '.k-demo-end .btn{width:100%;}' +
    '@media (orientation:landscape) and (max-height:520px){.k-demo-end .pn{padding:22px 22px 18px;}.k-demo-end .ic{width:54px;height:54px;margin-bottom:6px;}.k-demo-end p{margin-bottom:14px;}.k-demo-end .acts{flex-direction:row;}.k-demo-cap{font-size:15.5px;padding:11px 16px 12px;}}' +
    '@media (prefers-reduced-motion:reduce){.k-demo-ring::after{animation:none;}.k-demo-cap{transition:opacity .2s;transform:none;}.k-demo-rip{animation-duration:.01s;}}';

  var X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  var ui = {};
  function build() {
    var sty = el('style'); sty.textContent = CSS; doc.head.appendChild(sty);
    // the strip over the game bar: the way out, how far along the demo is, and Skip
    var g = game();
    ui.strip = el('div', 'k-demo-ui k-demo-strip');
    ui.x = el('button', 'x', X_ICON); ui.x.type = 'button'; ui.x.setAttribute('aria-label', 'Leave the demo');
    ui.x.onclick = function () { tick(); leave(); };
    ui.mid = el('div', 'mid');
    if (g && window.GameIcon) { var gi = el('span', 'gi', GameIcon(g.id)); ui.mid.appendChild(gi); }
    ui.dots = el('div', 'k-demo-dots'); ui.mid.appendChild(ui.dots);
    ui.skip = el('button', 'sk', 'Skip'); ui.skip.type = 'button'; ui.skip.setAttribute('aria-label', 'Skip to the end of the demo');
    ui.skip.onclick = function () { tick(); skip(); };
    ui.strip.appendChild(ui.x); ui.strip.appendChild(ui.mid); ui.strip.appendChild(ui.skip);
    doc.body.appendChild(ui.strip);
    placeStrip();
    window.addEventListener('resize', placeStrip);
    ui.ring = el('div', 'k-demo-ui k-demo-ring'); doc.body.appendChild(ui.ring);
    ui.finger = el('div', 'k-demo-ui k-demo-finger', '<b></b>'); doc.body.appendChild(ui.finger);
    st.fx = vw() / 2; st.fy = vh() + 40; moveFinger(st.fx, st.fy, true);
  }
  function tick() { try { Kit.sfx('tap'); Kit.haptic('light'); } catch (e) {} }
  // the strip covers the game bar exactly (its buttons wait until the demo is over)
  function placeStrip() {
    var bar = doc.querySelector('.gbar'), r = bar ? bar.getBoundingClientRect() : null;
    var safe = 0; try { safe = parseFloat(getComputedStyle(root).getPropertyValue('--safe-t')) || 0; } catch (e) {}
    var h = r && r.height ? Math.max(52, r.bottom) : 56 + safe;
    ui.strip.style.height = h + 'px';
    ui.strip.style.paddingTop = (r && r.top > 0 ? 0 : Math.max(0, h - 56)) + 'px';
    st.top = h;
  }
  function paintDots() {
    ui.dots.innerHTML = ''; ui.dots.style.setProperty('--n', Math.max(1, st.dots));
    for (var i = 0; i < st.dots; i++) { var d = el('i'); if (i < st.beat) d.className = 'on'; if (i === st.beat - 1) d.className += ' now'; ui.dots.appendChild(d); }
  }

  // ── Only the demo's own taps (and the player's, on their turn) reach the game ─────────────────────────────────
  function inUi(t) { return t && t.closest && t.closest('.k-demo-ui, .k-demo-end'); }
  function allowed(t) {
    if (!st.allow || !t || !t.closest) return false;
    var list = st.allow();
    for (var i = 0; i < list.length; i++) if (list[i] && (list[i] === t || list[i].contains(t))) return true;
    return false;
  }
  ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'contextmenu', 'dblclick'].forEach(function (type) {
    window.addEventListener(type, function (e) {
      if (st.synth || inUi(e.target)) return;
      // (the rest of a press the player began on their target goes through too, wherever the game has captured it)
      var ok = allowed(e.target) || (st.allow && type !== 'pointerdown' && type !== 'mousedown' && type !== 'touchstart' && Date.now() < (st.okUntil || 0));
      if (!st.ended && ok) {
        if (type === 'pointerdown' || type === 'mousedown' || type === 'touchstart') st.okUntil = Date.now() + 1500;
        if ((type === 'click' || type === 'pointerup') && st.youTap) setTimeout(st.youTap, 0);
        return;
      }
      if (st.ended) return;
      e.stopImmediatePropagation(); if (e.cancelable && type !== 'touchstart') e.preventDefault();
      if (type === 'pointerdown' && st.allow) hint();
    }, { capture: true, passive: false });
  });
  window.addEventListener('keydown', function (e) {
    if (st.ended || inUi(e.target)) return;
    if (e.key === 'Escape') { e.preventDefault(); leave(); return; }
    e.stopImmediatePropagation(); e.preventDefault();
  }, true);

  // ── The finger ───────────────────────────────────────────────────────────────────────────────────────────────
  function moveFinger(x, y, now) {
    st.fx = x; st.fy = y;
    var f = ui.finger;
    f.style.transition = now || reduce ? 'opacity .25s' : 'opacity .25s, transform .62s cubic-bezier(.3,.75,.25,1)';
    f.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
  }
  function showFinger(on) { ui.finger.classList.toggle('show', !!on); }
  var hideT = 0;
  function fingerIdle() { clearTimeout(hideT); hideT = setTimeout(function () { showFinger(false); }, 1300); }
  function ripple(x, y) {
    if (reduce) return;
    var r = el('div', 'k-demo-ui k-demo-rip'); r.style.left = x + 'px'; r.style.top = y + 'px'; doc.body.appendChild(r);
    setTimeout(function () { r.remove(); }, 600);
  }
  // a point inside the target that is really the target there (a fanned card shows only its edge)
  function hitPoint(n) {
    var r = rectOf(n), best = null, bd = 1e9, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var hide = [ui.ring, ui.finger, st.cap].filter(Boolean), old = hide.map(function (h) { return h.style.visibility; });
    hide.forEach(function (h) { h.style.visibility = 'hidden'; });
    for (var i = 0; i <= 6; i++) for (var j = 0; j <= 6; j++) {
      var x = r.left + r.width * (0.08 + 0.84 * i / 6), y = r.top + r.height * (0.08 + 0.84 * j / 6);
      if (x < 0 || y < 0 || x >= vw() || y >= vh()) continue;
      var hit = doc.elementFromPoint(x, y);
      if (hit && (hit === n || n.contains(hit))) { var d = (x - cx) * (x - cx) + (y - cy) * (y - cy) * 1.4; if (d < bd) { bd = d; best = { x: x, y: y, hit: hit }; } }
    }
    hide.forEach(function (h, k) { h.style.visibility = old[k]; });
    return best || { x: Math.max(1, Math.min(vw() - 1, cx)), y: Math.max(1, Math.min(vh() - 1, cy)), hit: n };
  }
  function inView(n) { var r = rectOf(n); return r.top >= (st.top || 0) && r.bottom <= vh() && r.left >= 0 && r.right <= vw(); }
  function bringIn(n) {
    if (inView(n)) return Promise.resolve();
    try { n.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); } catch (e) { try { n.scrollIntoView(); } catch (x) {} }
    return sleep(reduce ? 60 : 480);
  }
  var PID = 41;
  function fire(type, x, y, target, extra) {
    var o = Object.assign({ bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, screenX: x, screenY: y, view: window, button: 0, buttons: type === 'pointerup' || type === 'mouseup' || type === 'click' ? 0 : 1 }, extra || {});
    var ev;
    if (/^pointer/.test(type) && window.PointerEvent) ev = new PointerEvent(type, Object.assign({ pointerId: PID, pointerType: 'touch', isPrimary: true, width: 20, height: 20, pressure: type === 'pointerup' ? 0 : 0.5 }, o));
    else ev = new MouseEvent(type.replace(/^pointer/, 'mouse'), o);
    st.synth++;
    try { target.dispatchEvent(ev); } finally { st.synth--; }
    return ev;
  }
  function press(p) {
    var t = p.hit;
    fire('pointerdown', p.x, p.y, t);
    fire('mousedown', p.x, p.y, t);
    // (a game may redraw on pointerdown: the release goes to whatever is there now)
    var up = doc.elementFromPoint(p.x, p.y) || t; if (inUi(up)) up = t;
    fire('pointerup', p.x, p.y, up);
    fire('mouseup', p.x, p.y, up);
    if (up === t || t.contains(up) || up.contains(t)) fire('click', p.x, p.y, up.isConnected ? up : t);
  }
  function glideTo(x, y) {
    showFinger(true); clearTimeout(hideT);
    var d = Math.hypot(x - st.fx, y - st.fy);
    moveFinger(x, y);
    return sleep(reduce ? 80 : Math.max(260, Math.min(640, 240 + d * 0.9)));
  }
  function tapAt(spec, o) {
    o = o || {};
    var n = resolve(spec); if (!n) { console.warn('[demo] nothing to tap', spec); return Promise.resolve(false); }
    return bringIn(n).then(function () {
      check();
      n = resolve(spec) || n;
      var p = hitPoint(n);
      return glideTo(p.x, p.y).then(function () {
        check();
        p = hitPoint(resolve(spec) || n);   // (where it is now, in case it moved under the finger)
        moveFinger(p.x, p.y, true);
        ui.finger.classList.add('down'); ripple(p.x, p.y);
        try { Kit.haptic('tick'); } catch (e) {}
        return sleep(reduce ? 40 : 120).then(function () {
          if (!o.ghost) { press(p); T.taps++; }
          ui.finger.classList.remove('down');
          fingerIdle();
          return sleep(o.after != null ? o.after : 380).then(function () { return true; });
        });
      });
    });
  }

  // ── Captions and the ring ───────────────────────────────────────────────────────────────────────────────────
  var ringRaf = 0;
  function ringLoop() {
    ringRaf = 0;
    var g = group(st.ringSpec), n = g[0];
    if (!n) { ui.ring.classList.remove('show'); if (st.ringSpec) ringRaf = requestAnimationFrame(ringLoop); return; }
    var r = rectOf(g), pad = st.ringPad != null ? st.ringPad : 6, rad = 16;
    try { var br = parseFloat(getComputedStyle(n).borderTopLeftRadius) || 0; rad = Math.max(10, Math.min(28, br + pad)); } catch (e) {}
    var s = ui.ring.style;
    s.width = (r.width + pad * 2) + 'px'; s.height = (r.height + pad * 2) + 'px';
    s.transform = 'translate3d(' + (r.left - pad) + 'px,' + (r.top - pad) + 'px,0)'; s.borderRadius = rad + 'px';
    ui.ring.classList.add('show');
    if (st.cap && st.capAt) placeCap(st.cap, g, st.capPos);
    ringRaf = requestAnimationFrame(ringLoop);
  }
  function ring(spec, o) {
    o = o || {};
    st.ringSpec = spec || null; st.ringPad = o.pad;
    ui.ring.classList.toggle('spot', !!o.spot);
    if (!spec) { ui.ring.classList.remove('show'); return; }
    if (!ringRaf) ringRaf = requestAnimationFrame(ringLoop);
  }
  function clearCap() {
    var c = st.cap; st.cap = null; st.capAt = null;
    if (c) { c.classList.remove('show'); setTimeout(function () { c.remove(); }, 300); }
  }
  function clear() { clearCap(); ring(null); }
  // where a caption goes: clear of what it points at, above or below it (beside it on a short screen), never under the
  // strip; with nothing to point at, where the script says
  function placeCap(c, n, pos) {
    var W = vw(), H = vh(), top = (st.top || 0) + 10, bot = H - 14, m = 14;
    // a target with no room above or below it but some at a side (a tall score card beside the dice): the caption narrows
    // to fit beside it
    if (n && !st.capPlace && c._narrow == null) {
      var r0 = rectOf(n), h0 = c.offsetHeight, side = Math.max(r0.left - 16 - m, W - m - r0.right - 16);
      c._narrow = r0.bottom + 16 + h0 > bot && r0.top - 16 - h0 < top && side >= 230 && side < c.offsetWidth ? Math.floor(side) : 0;
      if (c._narrow) c.style.maxWidth = c._narrow + 'px';
    }
    var cw = c.offsetWidth, ch = c.offsetHeight, x, y, nub = null, nubAt = 0;
    var avoid = (st.avoid || []).map(group).filter(function (l) { return l.length; }).map(rectOf);
    function over(a, b) { var w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return w > 0 && h > 0 ? w * h : 0; }
    function cost(bx, by) { var b = { left: bx, top: by, right: bx + cw, bottom: by + ch }, s = 0; avoid.forEach(function (a) { s += over(a, b); }); return s; }
    if (n && st.capPlace) n = null, pos = st.capPlace;   // (place: 'top' | 'bottom' puts it at that edge whatever it points at)
    if (n) {
      var r = rectOf(n), gap = 16, cx = Math.max(m, Math.min(W - cw - m, r.left + r.width / 2 - cw / 2));
      var c1 = [], ok = function (x0, y0, side) { c1.push({ x: x0, y: y0, side: side, over: cost(x0, y0) + over(r, { left: x0, top: y0, right: x0 + cw, bottom: y0 + ch }) * 4 }); };
      if (r.bottom + gap + ch <= bot) ok(cx, r.bottom + gap, 'below');
      if (r.top - gap - ch >= top) ok(cx, r.top - gap - ch, 'above');
      var cy = Math.max(top, Math.min(bot - ch, r.top + r.height / 2 - ch / 2));
      if (r.right + gap + cw <= W - m) ok(r.right + gap, cy, 'right');
      if (r.left - gap - cw >= m) ok(r.left - gap - cw, cy, 'left');
      // above or below, but something it must not cover is in the way: past that thing instead
      c1.slice().forEach(function (k) {
        if (!(k.over > 0) || (k.side !== 'above' && k.side !== 'below')) return;
        var box = { left: k.x, right: k.x + cw, top: k.y, bottom: k.y + ch }, hit = avoid.filter(function (a) { return over(a, box) > 0; });
        if (!hit.length) return;
        if (k.side === 'above') { var y2 = Math.min.apply(null, hit.map(function (a) { return a.top; })) - 10 - ch; if (y2 >= top) ok(k.x, y2, 'above'); }
        else { var y3 = Math.max.apply(null, hit.map(function (a) { return a.bottom; })) + 10; if (y3 + ch <= bot) ok(k.x, y3, 'below'); }
      });
      if (!c1.length) {   // too big to go round: the edge it covers least
        ok(cx, top, 'top'); ok(cx, bot - ch, 'bottom');
      }
      // prefer the side with more room, unless it covers something it shouldn't
      var pref = pos === 'above' ? 'above' : pos === 'below' ? 'below' : (r.top + r.height / 2 > (top + bot) / 2 ? 'above' : 'below');
      c1.sort(function (a, b) { return a.over - b.over || (a.side === pref ? -1 : b.side === pref ? 1 : 0); });
      var pick = c1[0]; x = pick.x; y = pick.y;
      if (pick.side === 'below') { nub = 'up'; nubAt = Math.max(16, Math.min(cw - 30, r.left + r.width / 2 - x - 7)); }
      else if (pick.side === 'above') { nub = 'dn'; nubAt = Math.max(16, Math.min(cw - 30, r.left + r.width / 2 - x - 7)); }
      else if (pick.side === 'right') { nub = 'lf'; nubAt = Math.max(12, Math.min(ch - 26, r.top + r.height / 2 - y - 7)); }
      else if (pick.side === 'left') { nub = 'rt'; nubAt = Math.max(12, Math.min(ch - 26, r.top + r.height / 2 - y - 7)); }
    } else {
      x = (W - cw) / 2;
      y = pos === 'top' ? top + 6 : pos === 'center' ? (top + bot) / 2 - ch / 2 : bot - ch - 10;
      if (avoid.length) {   // slide up or down off anything it must not cover
        var tries = [y, top + 6, (top + bot) / 2 - ch / 2, bot - ch - 10], best = y, bc = 1e12;
        tries.forEach(function (t) { var k = cost(x, t); if (k < bc) { bc = k; best = t; } });
        y = best;
      }
    }
    c.style.transform = '';
    c.style.left = Math.round(x) + 'px'; c.style.top = Math.round(y) + 'px';
    var nb = c.querySelector('.nub');
    if (nb) { nb.className = 'nub ' + (nub || ''); nb.style.display = nub ? '' : 'none'; if (nub === 'up' || nub === 'dn') { nb.style.left = nubAt + 'px'; nb.style.top = ''; } else if (nub) { nb.style.top = nubAt + 'px'; nb.style.left = ''; } }
  }
  function readMs(text) { var w = String(text).split(/\s+/).length; return Math.max(2300, Math.min(7500, 1100 + w * 270)); }
  function caption(text, o) {
    o = o || {};
    clearCap();
    var c = el('div', 'k-demo-ui k-demo-cap' + (o.you ? ' you' : ''));
    c.setAttribute('role', 'status'); c.setAttribute('aria-live', 'polite');
    c.innerHTML = '<span class="ln"><i></i></span><span class="nub"></span>' + (o.you ? '<span class="hd">' + (window.Kit ? Kit.icon('tap') : '') + '</span>' : '') + '<span class="tx"></span>';
    c.querySelector('.tx').textContent = text;
    doc.body.appendChild(c);
    st.cap = c; st.capAt = o.at || null; st.capPos = o.pos; st.capPlace = o.place || null; st.avoid = o.avoid ? [].concat(o.avoid) : [];
    var g = group(o.at); placeCap(c, g.length ? g : null, o.pos);
    requestAnimationFrame(function () { c.classList.add('show'); });
    T.says.push(text);
    return c;
  }
  function say(text, o) {
    check(); o = o || {};
    if (o.dot !== false) { st.beat++; paintDots(); T.step = st.beat; }
    var tn = resolve(o.at);
    return (tn ? bringIn(tn) : Promise.resolve()).then(function () { check(); return sayNow(text, o); });
  }
  function sayNow(text, o) {
    if (o.at && o.ring !== false) ring(o.at, { spot: o.spot, pad: o.pad }); else ring(null);
    var c = caption(text, o);
    try { Kit.sfx('pop', 0.35); } catch (e) {}
    if (o.wait === false) return Promise.resolve();
    var ms = o.wait != null ? o.wait : readMs(text);
    var line = c.querySelector('.ln i');
    if (line && line.animate && !reduce) line.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
    else if (line) line.style.transform = 'scaleX(1)';
    return new Promise(function (res) {
      var done = false, t = setTimeout(fin, ms);
      function fin() { if (done) return; done = true; clearTimeout(t); res(); }
      c.addEventListener('click', function () { tick(); fin(); });
      st.onAbort = fin;
    }).then(check);
  }

  // the player's turn
  var hintT = 0;
  function hint() {
    var n = st.youTarget && resolve(st.youTarget); if (!n || st.hinting) return;
    st.hinting = true;
    tapAt(n, { ghost: true, after: 200 }).catch(function () {}).then(function () { st.hinting = false; });
  }
  function you(target, text, o) {
    check(); o = o || {};
    st.beat++; paintDots(); T.step = st.beat;
    var list = function () {
      var a = [].concat(o.allow || target).map(function (s) {
        if (typeof s === 'string') return [].slice.call(doc.querySelectorAll(s));
        return resolve(s);
      });
      return [].concat.apply([], a).filter(Boolean);
    };
    return bringIn(resolve(target) || doc.body).then(function () {
      st.youTarget = target;
      ring(target, { spot: o.spot !== false, pad: o.pad });
      caption(text, { at: target, you: true, pos: o.pos, avoid: o.avoid });
      try { Kit.sfx('sparkle', 0.5); Kit.haptic('medium'); } catch (e) {}
      return new Promise(function (res) {
        var over = false, iv = 0;
        var fin = function () {
          if (over || (o.until && !o.until())) return;
          over = true; clearInterval(iv); st.allow = null; st.youTap = null; st.youTarget = null; st.onAbort = null;
          try { Kit.haptic('success'); } catch (e) {}
          res();
        };
        st.allow = list; st.youTap = function () { setTimeout(fin, 30); };
        st.onAbort = function () { over = true; clearInterval(iv); st.allow = null; st.youTap = null; res(); };
        var idle = 0;
        hintT = iv = setInterval(function () { if (over) return; idle++; if (idle === 5 || (idle > 5 && idle % 6 === 5)) hint(); if (o.until && o.until()) fin(); }, 1000);
        // (tests and recordings: the demo takes the player's turn for them after a moment)
        if (AUTO) (function auto() {
          setTimeout(function () {
            if (over || !st.allow || st.aborted) return;
            var pick = o.autoTap ? resolve(o.autoTap) : resolve(target);
            if (!pick) { var l = list(); pick = l[0]; }
            if (!pick) return;
            var keep = st.allow; st.allow = null;
            tapAt(pick).then(function () { if (over) return; st.allow = keep; if (o.until && !o.until()) auto(); else fin(); });
          }, 1500);
        })();
      });
    }).then(function () { clear(); }).then(check);
  }

  function waitFor(x, max) {
    check();
    if (typeof x === 'number') return sleep(x).then(check);
    var t0 = Date.now(); max = max || 15000;
    return new Promise(function (res) {
      (function poll() {
        if (st.aborted) return res();
        var ok = false; try { ok = x(); } catch (e) {}
        if (ok || Date.now() - t0 > max) { if (!ok) console.warn('[demo] waited too long for', String(x)); return res(); }
        setTimeout(poll, 90);
      })();
    }).then(check);
  }

  function drag(from, to, o) {
    o = o || {};
    var a = resolve(from), b = resolve(to); if (!a || !b) return Promise.resolve(false);
    var p = hitPoint(a);
    return glideTo(p.x, p.y).then(function () {
      check();
      ui.finger.classList.add('down'); ripple(p.x, p.y);
      fire('pointerdown', p.x, p.y, p.hit); fire('mousedown', p.x, p.y, p.hit);
      var q = rectOf(resolve(to) || b), tx = q.left + q.width / 2, ty = q.top + q.height / 2;
      var steps = reduce ? 2 : 22, i = 0;
      return new Promise(function (res) {
        (function step() {
          i++;
          var k = i / steps, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          var x = p.x + (tx - p.x) * e, y = p.y + (ty - p.y) * e;
          moveFinger(x, y, true);
          var over = doc.elementFromPoint(x, y) || doc.body; if (inUi(over)) over = p.hit;
          fire('pointermove', x, y, over); fire('mousemove', x, y, over);
          if (i < steps) setTimeout(step, 22); else res({ x: x, y: y });
        })();
      });
    }).then(function (end) {
      var over = doc.elementFromPoint(end.x, end.y) || doc.body; if (inUi(over)) over = b;
      fire('pointerup', end.x, end.y, over); fire('mouseup', end.x, end.y, over);
      ui.finger.classList.remove('down'); fingerIdle(); T.taps++;
      return sleep(o.after != null ? o.after : 400).then(function () { return true; });
    });
  }

  // ── The beginning and the end ──────────────────────────────────────────────────────────────────────────────
  function curtain(script) {
    var g = game();
    ui.cur = el('div', 'k-demo-ui k-demo-curtain');
    var inner = el('div', 'in');
    if (g && window.GameIcon) inner.appendChild(el('div', 'ic', GameIcon(g.id)));
    var h = el('h2'); h.textContent = g ? g.name : doc.title; inner.appendChild(h);
    if (script.intro) { var p = el('p'); p.textContent = script.intro; inner.appendChild(p); }
    ui.cur.appendChild(inner);
    doc.body.appendChild(ui.cur);
  }
  function lift() {
    root.classList.remove('k-demo-boot');
    if (!ui.cur) return;
    var c = ui.cur; ui.cur = null; c.classList.add('out'); setTimeout(function () { c.remove(); }, 520);
  }
  function homeUrl() { var g = game(); return '../index.html' + (g ? '#sheet=' + encodeURIComponent(g.id) : ''); }
  function plainUrl() { return location.pathname; }
  function go(u) { st.ended = true; root.classList.add('k-going'); location.replace(u); }
  function leave() { st.aborted = true; go(FROM_HOME ? homeUrl() : plainUrl()); }
  function skip() { if (st.ended) return; st.aborted = true; if (st.onAbort) st.onAbort(); end(); }
  function end() {
    if (st.ended) return; st.ended = true; T.done = true; T.phase = 'end';
    clearInterval(hintT); clear(); showFinger(false); lift();
    st.beat = st.dots; paintDots();
    var g = game(), sc = st.script || {};
    var box = el('div', 'k-demo-ui k-demo-end'), pn = el('div', 'pn');
    if (g && window.GameIcon) pn.appendChild(el('div', 'ic', GameIcon(g.id)));
    var h = el('h2'); h.textContent = 'You’re ready to play'; pn.appendChild(h);
    if (sc.end) { var p = el('p'); p.textContent = sc.end; pn.appendChild(p); }
    var acts = el('div', 'acts');
    var play = el('button', 'btn btn-primary btn-lg', (window.Kit ? Kit.icon('play') : '') + '<span>Play now</span>'); play.type = 'button';
    play.onclick = function () { tick(); go(plainUrl()); };
    var again = el('button', 'btn btn-soft btn-lg', (window.Kit ? Kit.icon('undo') : '') + '<span>Watch again</span>'); again.type = 'button';
    again.onclick = function () { tick(); st.ended = true; root.classList.add('k-going'); location.reload(); };
    acts.appendChild(play); acts.appendChild(again); pn.appendChild(acts); box.appendChild(pn);
    doc.body.appendChild(box);
    requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.add('show'); }); });
    try { Kit.sfx('sparkle'); Kit.haptic('success'); } catch (e) {}
  }

  var D = {
    say: say, you: you, tap: function (t, o) { check(); o = o || {}; var p = o.say ? say(o.say, { at: t, wait: false }) : Promise.resolve(); return p.then(function () { return tapAt(t, o); }).then(function (r) { check(); return r; }); },
    drag: function (a, b, o) { check(); return drag(a, b, o).then(function (r) { check(); return r; }); },
    wait: waitFor, ring: function (t, o) { ring(t, o); }, clear: clear,
    set: function (fn) { check(); return Promise.resolve(fn && fn()).then(function () { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); }).then(check); },
    q: function (s) { return doc.querySelector(s); }, qa: function (s) { return [].slice.call(doc.querySelectorAll(s)); },
    done: function () { end(); return Promise.resolve(); },
    sfx: function (n, v) { try { Kit.sfx(n, v); } catch (e) {} }, haptic: function (k) { try { Kit.haptic(k); } catch (e) {} },
    get aborted() { return st.aborted; }, auto: AUTO, reduce: reduce
  };

  function run(script) {
    if (st.script) return;
    st.script = script || {};
    st.dots = Math.max(0, script.beats | 0);
    build(); paintDots(); curtain(script);
    T.phase = 'start';
    var t0 = Date.now();
    Promise.resolve().then(function () { return script.start ? script.start(D) : null; })
      .then(function () { return sleep(Math.max(0, (reduce ? 500 : 1500) - (Date.now() - t0))); })
      .then(function () { lift(); T.phase = 'steps'; return sleep(reduce ? 80 : 560); })
      .then(function () { return script.steps ? script.steps(D) : null; })
      .catch(function (e) { if (e !== ABORT) console.error('[demo]', e); })
      .then(function () { end(); });
  }
  window.KitDemo = { run: run, D: D, leave: leave, skip: skip };
})();
