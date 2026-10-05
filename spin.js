// spin.js — "Surprise" raffle wheel on the home screen.
// Spin.open({ launch: fn(game), isFav: fn(game) })
//
// A carnival prize wheel loaded with games that match the filters (type,
// players, favorites). Spin with the button or flick the wheel. Pegs on the
// rim knock a leather flapper; the wedge under the flapper wins. Filters are
// remembered on this device ('gn_spin').

var Spin = (function () {
  var MAXW = 24;                      // most wedges that still read well
  var KEY = 'gn_spin';
  var el = function () { return Kit.el.apply(null, arguments); };

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function store(f) { try { localStorage.setItem(KEY, JSON.stringify(f)); } catch (e) {} }

  var css = '' +
    '.sp{position:fixed;inset:0;z-index:60;background:radial-gradient(120% 80% at 50% 0%,#2a2156,var(--bg) 60%);display:flex;flex-direction:column;' +
      'padding:calc(env(safe-area-inset-top) + 8px) calc(env(safe-area-inset-right) + var(--corner-x) + 14px) calc(env(safe-area-inset-bottom) + var(--corner-y) + 12px) calc(env(safe-area-inset-left) + var(--corner-x) + 14px);' +
      'overflow:hidden;animation:sp-in .28s var(--spring,cubic-bezier(.2,1.3,.4,1));}' +
    '@keyframes sp-in{from{opacity:0;transform:scale(.97)}}' +
    '.sp-top{display:flex;align-items:center;gap:10px;min-height:48px;flex:none;}' +
    '.sp-top h2{flex:1;margin:0;font-family:var(--display);font-size:1.45rem;letter-spacing:.01em;}' +
    '.sp-x{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08);color:var(--text);border:0;}' +
    '.sp-x .ico{width:22px;height:22px;}' +
    '.sp-body{flex:1;min-height:0;display:flex;flex-direction:column;gap:10px;}' +
    '.sp-f{flex:none;display:flex;flex-direction:column;gap:8px;}' +
    '.sp-seg{display:flex;gap:4px;padding:4px;border-radius:14px;background:rgba(0,0,0,.25);}' +
    '.sp-seg button{flex:1;min-height:34px;border:0;border-radius:10px;background:none;color:var(--text-2);font:inherit;font-weight:800;font-size:.84rem;display:flex;align-items:center;justify-content:center;gap:5px;}' +
    '.sp-seg button .ico{width:15px;height:15px;}' +
    '.sp-seg button.on{background:var(--surface-3);color:#fff;}' +
    '.sp-chips{display:flex;flex-wrap:wrap;gap:6px;}' +
    '.sp-chips .chip{--cc:var(--text-2);min-height:32px;padding:0 11px 0 9px;gap:6px;font-size:.82rem;}' +
    '.sp-chips .chip .ico{width:15px;height:15px;color:var(--cc);}' +
    '.sp-chips .chip.on{background:var(--cc);color:#fff;box-shadow:none;}' +
    '.sp-chips .chip.on .ico{color:#fff;}' +
    '.sp-chips .chip.fav{--cc:var(--yellow);}' +
    '.sp-chips .chip.fav.on{color:#2b1a00;}.sp-chips .chip.fav.on .ico{color:#2b1a00;}' +
    '.sp-chips .chip.all{--cc:#fff;}.sp-chips .chip.all.on{color:var(--bg);}.sp-chips .chip.all.on .ico{color:var(--bg);}' +
    '.sp-n{font-size:.8rem;font-weight:800;color:var(--text-3);display:flex;align-items:center;gap:8px;min-height:22px;}' +
    '.sp-n button{border:0;background:none;color:var(--accent-2,#9db4ff);font:inherit;font-weight:900;padding:2px 4px;display:inline-flex;align-items:center;gap:4px;}' +
    '.sp-n button .ico{width:14px;height:14px;}' +
    '.sp-stage{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;}' +
    '.sp-wrap{position:relative;flex:none;touch-action:none;user-select:none;-webkit-user-select:none;}' +
    '.sp-wrap canvas{display:block;width:100%;height:100%;filter:drop-shadow(0 14px 24px rgba(0,0,0,.55));}' +
    '.sp-flap{position:absolute;left:50%;top:-6px;width:26px;height:46px;margin-left:-13px;transform-origin:50% 8px;pointer-events:none;filter:drop-shadow(0 3px 3px rgba(0,0,0,.5));}' +
    '.sp-go{flex:none;width:min(100%,360px);display:flex;gap:8px;}' +
    '.sp-go .btn{flex:1;}' +
    '.sp-empty{color:var(--text-3);font-weight:800;text-align:center;padding:20px;}' +
    '.sp-rb{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:40px 0 0;background:linear-gradient(to bottom,transparent,rgba(20,16,41,.92) 38px);}' +
    '.sp-res{flex:none;width:min(100%,420px);display:flex;align-items:center;gap:12px;padding:12px;border-radius:20px;background:var(--surface);box-shadow:0 10px 30px rgba(0,0,0,.4);animation:sp-pop .45s var(--spring,cubic-bezier(.2,1.3,.4,1));}' +
    '@keyframes sp-pop{from{opacity:0;transform:translateY(14px) scale(.94)}}' +
    '.sp-res .gicon{width:56px;height:56px;flex:none;}' +
    '.sp-res .tx{flex:1;min-width:0;}.sp-res .tx b{display:block;font-size:1.15rem;}.sp-res .tx small{display:block;color:var(--text-3);font-weight:700;font-size:.82rem;}' +
    '.sp-res-a{flex:none;width:min(100%,420px);display:grid;grid-template-columns:1fr 1fr;gap:8px;}' +
    '.sp-res-a .btn-primary{grid-column:1/-1;}' +
    '.sp-res-a .btn{white-space:nowrap;}.sp-res-a .btn-soft{font-size:.95rem;padding:0 10px;}.sp-seg button{white-space:nowrap;}' +
    /* Side-by-side when there is width to spare (phone landscape, iPad landscape) */
    '@media (orientation:landscape) and (min-width:640px){.sp-body{flex-direction:row;align-items:stretch;gap:18px;}.sp-f{width:min(42%,380px);overflow:auto;}.sp-stage{flex:1;}}';

  function open(o) {
    if (document.querySelector('.sp')) return;
    if (!document.getElementById('sp-css')) { var st = document.createElement('style'); st.id = 'sp-css'; st.textContent = css; document.head.appendChild(st); }
    var f = load();
    f.cats = Array.isArray(f.cats) ? f.cats : [];   // [] = every type
    f.who = f.who || 'any'; f.fav = !!f.fav;

    var root = el('div', { class: 'sp', role: 'dialog', 'aria-label': 'Spin for a game' });
    var xb = el('button', { type: 'button', class: 'sp-x', 'aria-label': 'Close', html: Kit.icon('close') });
    root.appendChild(el('div', { class: 'sp-top' }, [el('h2', { text: 'Spin for a game' }), xb]));
    var body = el('div', { class: 'sp-body' }), fbox = el('div', { class: 'sp-f' }), stage = el('div', { class: 'sp-stage' });
    body.appendChild(fbox); body.appendChild(stage); root.appendChild(body);
    document.body.appendChild(root);
    var prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';

    // ── Filters ───────────────────────────────────────────────────────────
    var WHO = [['any', 'Any', 'users'], ['1', 'Solo', 'user'], ['2', 'Two', 'users'], ['3', '3+', 'users']];
    function fits(g) {
      if (f.fav && !o.isFav(g)) return false;
      if (f.cats.length && f.cats.indexOf(g.cat) < 0) return false;
      if (f.who !== 'any') {
        var n = +f.who, max = g.max === 0 ? 99 : g.max;
        if (n === 3) { if (max < 3) return false; }
        else if (!(g.min <= n && max >= n)) return false;
      }
      return true;
    }
    var nLine = el('div', { class: 'sp-n' });
    function paintFilters() {
      fbox.innerHTML = '';
      var seg = el('div', { class: 'sp-seg', role: 'tablist', 'aria-label': 'Players' });
      WHO.forEach(function (w) {
        var b = el('button', { type: 'button', class: w[0] === f.who ? 'on' : '', html: Kit.icon(w[2]) + '<span>' + w[1] + '</span>' });
        b.addEventListener('click', function () { f.who = w[0]; changed(); });
        seg.appendChild(b);
      });
      fbox.appendChild(seg);
      var chips = el('div', { class: 'sp-chips' });
      function chip(id, label, ic, cls, color, on, fn) {
        var b = el('button', { type: 'button', class: 'chip' + (cls ? ' ' + cls : '') + (on ? ' on' : ''), 'aria-pressed': String(on), style: color ? { '--cc': color } : null },
          [el('span', { html: Kit.icon(ic) }), el('span', { text: label })]);
        b.addEventListener('click', fn); chips.appendChild(b);
      }
      chip('all', 'All types', 'tiles', 'all', null, !f.cats.length, function () { f.cats = []; changed(); });
      chip('fav', 'Favorites', 'star', 'fav', null, f.fav, function () { f.fav = !f.fav; changed(); });
      GAME_CATS.forEach(function (c) {
        if (c.id === 'tools') return;   // scorekeepers and timers aren't games to spin for
        var on = f.cats.indexOf(c.id) >= 0;
        chip(c.id, c.name, c.id, '', c.color, on, function () {
          if (on) f.cats = f.cats.filter(function (x) { return x !== c.id; });
          else f.cats = f.cats.concat([c.id]);
          if (f.cats.length === GAME_CATS.length - 1) f.cats = [];
          changed();
        });
      });
      fbox.appendChild(chips);
      fbox.appendChild(nLine);
    }
    function changed() { Kit.sfx('tap'); Kit.haptic('light'); store(f); paintFilters(); fill(); }

    // ── Wheel contents ──────────────────────────────────────────────────────
    var pool = [], wedges = [];
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    // Mix the order so neighbours are from different sections where possible
    function spread(a) {
      var out = [], left = a.slice();
      while (left.length) {
        var last = out[out.length - 1], k = 0;
        if (last) for (var i = 0; i < left.length; i++) if (left[i].cat !== last.cat) { k = i; break; }
        out.push(left.splice(k, 1)[0]);
      }
      return out;
    }
    function fill(keep) {
      if (spinning) return;
      pool = GAMES.filter(function (g) { return g.cat !== 'tools' && fits(g); });
      if (!keep) wedges = spread(shuffle(pool.slice()).slice(0, MAXW));
      nLine.innerHTML = '';
      var txt = !pool.length ? 'No games match these filters' :
        pool.length > MAXW ? MAXW + ' of ' + pool.length + ' games on the wheel' : pool.length + (pool.length === 1 ? ' game' : ' games') + ' on the wheel';
      nLine.appendChild(el('span', { text: txt }));
      if (pool.length > MAXW) {
        var sh = el('button', { type: 'button', html: Kit.icon('shuffle') + '<span>New mix</span>' });
        sh.addEventListener('click', function () { Kit.sfx('flip'); fill(); });
        nLine.appendChild(sh);
      }
      angle = Math.random() * Math.PI * 2; picked = -1;
      clearResult(); showControls();
      draw();
    }

    // ── Stage: wheel + controls ─────────────────────────────────────────────
    var wrap = el('div', { class: 'sp-wrap' }), cv = el('canvas'), ctx = cv.getContext('2d');
    var flap = el('div', { class: 'sp-flap', html:
      '<svg viewBox="0 0 26 46" width="26" height="46"><defs><linearGradient id="spf" x1="0" x2="1"><stop offset="0" stop-color="#7a1d1d"/><stop offset=".5" stop-color="#c0392b"/><stop offset="1" stop-color="#7a1d1d"/></linearGradient></defs>' +
      '<circle cx="13" cy="8" r="7.5" fill="#d4a017" stroke="#6b4a0a" stroke-width="1.5"/>' +
      '<path d="M7 10 L13 44 L19 10 Z" fill="url(#spf)" stroke="#4a0f0f" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<circle cx="13" cy="8" r="3" fill="#fff3c4"/></svg>' });
    wrap.appendChild(cv); wrap.appendChild(flap);
    var ctl = el('div', { class: 'sp-go' });
    stage.appendChild(wrap); stage.appendChild(ctl);

    var size = 300, dpr = 1;
    function layout() {
      var r = stage.getBoundingClientRect();
      var reserve = 74;   // spin button / result card below the wheel
      size = Math.max(180, Math.floor(Math.min(r.width - 4, r.height - reserve - 12, 560)));
      dpr = Math.min(3, window.devicePixelRatio || 1);
      wrap.style.width = wrap.style.height = size + 'px';
      cv.width = cv.height = Math.round(size * dpr);
      draw();
    }

    var angle = 0, omega = 0, spinning = false, flapA = 0, flapV = 0, lastPeg = 0, raf = 0, lastT = 0;
    function n() { return wedges.length; }
    function wedgeAt() {
      // pointer sits at the top (-90deg); find which wedge is under it
      var N = n(); if (!N) return -1;
      var w = Math.PI * 2 / N;
      var a = ((-Math.PI / 2 - angle) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2);
      return Math.floor(a / w) % N;
    }
    function shade(hex, amt) {
      var c = hex.replace('#', ''); if (c.length === 3) c = c.replace(/./g, '$&$&');
      var v = parseInt(c, 16), r = v >> 16, g = v >> 8 & 255, b = v & 255;
      var t = amt < 0 ? 0 : 255, p = Math.abs(amt);
      return 'rgb(' + Math.round(r + (t - r) * p) + ',' + Math.round(g + (t - g) * p) + ',' + Math.round(b + (t - b) * p) + ')';
    }
    function draw() {
      var S = cv.width, c = S / 2, R = S / 2 - 6 * dpr, N = n();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, S, S);
      // Rim: dark lacquered wood with a brass edge
      var rim = ctx.createRadialGradient(c, c, R * .86, c, c, R);
      rim.addColorStop(0, '#3b200f'); rim.addColorStop(.6, '#6e3d1c'); rim.addColorStop(1, '#2a160a');
      ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.fillStyle = rim; ctx.fill();
      ctx.lineWidth = 2 * dpr; ctx.strokeStyle = '#d4a017'; ctx.stroke();
      var Ri = R * .9;
      if (!N) {
        ctx.beginPath(); ctx.arc(c, c, Ri, 0, Math.PI * 2); ctx.fillStyle = '#231c45'; ctx.fill();
        hub(c, Ri); return;
      }
      var w = Math.PI * 2 / N, win = spinning ? -1 : picked;
      for (var i = 0; i < N; i++) {
        var a0 = angle + i * w, g = wedges[i];
        ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, Ri, a0, a0 + w); ctx.closePath();
        var gr = ctx.createRadialGradient(c, c, Ri * .15, c, c, Ri);
        var base = g.color || '#555';
        gr.addColorStop(0, shade(base, -.35)); gr.addColorStop(.7, i % 2 ? shade(base, -.08) : base); gr.addColorStop(1, shade(base, -.25));
        ctx.fillStyle = gr; ctx.fill();
        if (win >= 0 && win !== i) { ctx.fillStyle = 'rgba(10,6,25,.55)'; ctx.fill(); }
      }
      // Cream separators
      ctx.strokeStyle = 'rgba(255,244,214,.75)'; ctx.lineWidth = 1.4 * dpr;
      for (i = 0; i < N; i++) {
        var a = angle + i * w;
        ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * Ri * .18, c + Math.sin(a) * Ri * .18); ctx.lineTo(c + Math.cos(a) * Ri, c + Math.sin(a) * Ri); ctx.stroke();
      }
      // Names, reading outward from the hub
      var maxLen = Ri * .66, arcH = 2 * Ri * .72 * Math.sin(w / 2);
      for (i = 0; i < N; i++) {
        var mid = angle + (i + .5) * w, name = wedges[i].name;
        ctx.save(); ctx.translate(c, c); ctx.rotate(mid);
        var fs = Math.min(arcH * .62, 17 * dpr, Ri * .085);
        ctx.font = '800 ' + fs + 'px system-ui, -apple-system, sans-serif';
        var tw = ctx.measureText(name).width;
        if (tw > maxLen) { fs *= maxLen / tw; ctx.font = '800 ' + fs + 'px system-ui, -apple-system, sans-serif'; }
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillStyle = (win >= 0 && win !== i) ? 'rgba(255,255,255,.45)' : '#fff';
        ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 3 * dpr; ctx.shadowOffsetY = 1 * dpr;
        ctx.fillText(name, Ri * .93, 0);
        ctx.restore();
      }
      // Brass pegs at every wedge corner
      for (i = 0; i < N; i++) {
        var pa = angle + i * w, px = c + Math.cos(pa) * R * .95, py = c + Math.sin(pa) * R * .95, pr = Math.max(2.5 * dpr, R * .022);
        var pg = ctx.createRadialGradient(px - pr * .3, py - pr * .3, pr * .1, px, py, pr);
        pg.addColorStop(0, '#fff3c4'); pg.addColorStop(.5, '#d4a017'); pg.addColorStop(1, '#6b4a0a');
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fillStyle = pg; ctx.fill();
      }
      // Winner glow
      if (win >= 0) {
        ctx.save(); ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, Ri, angle + win * w, angle + (win + 1) * w); ctx.closePath();
        ctx.lineWidth = 3 * dpr; ctx.strokeStyle = '#ffd34d'; ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 14 * dpr; ctx.stroke(); ctx.restore();
      }
      hub(c, Ri);
    }
    function hub(c, Ri) {
      var hr = Ri * .17, hg = ctx.createRadialGradient(c - hr * .35, c - hr * .4, hr * .1, c, c, hr);
      hg.addColorStop(0, '#fff3c4'); hg.addColorStop(.45, '#d4a017'); hg.addColorStop(1, '#7a5208');
      ctx.beginPath(); ctx.arc(c, c, hr, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill();
      ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = '#5a3d06'; ctx.stroke();
      ctx.beginPath(); ctx.arc(c, c, hr * .55, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(90,61,6,.6)'; ctx.stroke();
    }

    // ── Physics ─────────────────────────────────────────────────────────────
    // Exponential drag plus a little constant friction; each peg that knocks
    // the flapper takes a bit more, so the last few ticks come slowly.
    function pegIndex() { var N = n(); return Math.floor(((-Math.PI / 2 - angle) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2) / (Math.PI * 2 / N)); }
    var lastTick = 0;
    function step(t) {
      var dt = Math.min(.033, (t - lastT) / 1000 || .016); lastT = t;
      if (spinning) {
        var s = omega > 0 ? 1 : -1;
        omega -= omega * .3 * dt + s * .3 * dt;
        if (omega * s < 0) omega = 0;
        angle += omega * dt;
        var p = pegIndex();
        if (p !== lastPeg) {
          lastPeg = p;
          var hit = Math.min(1, Math.abs(omega) / 14);
          flapV -= s * (5 + 30 * hit);
          omega -= s * Math.min(Math.abs(omega), .02 + .02 * (1 - hit));
          if (t - lastTick > 28) { lastTick = t; Kit.sfx('tick'); if (Math.abs(omega) < 3) Kit.haptic('tick'); }
        }
        if (Math.abs(omega) < .06) { omega = 0; settle(); }
      }
      // Flapper: damped spring back to straight
      flapV += (-flapA * 260 - flapV * 14) * dt; flapA += flapV * dt;
      flapA = Math.max(-38, Math.min(38, flapA));
      flap.style.transform = 'rotate(' + flapA.toFixed(2) + 'deg)';
      draw();
      if (spinning || Math.abs(flapA) > .05 || Math.abs(flapV) > .05) raf = requestAnimationFrame(step);
      else { raf = 0; flap.style.transform = ''; }
    }
    function kick() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(step); } }
    function settle() {
      spinning = false;
      // Never rest on a peg: ease into the wedge if the pointer is right on a line
      var N = n(), w = Math.PI * 2 / N;
      var a = ((-Math.PI / 2 - angle) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2), off = a % w;
      if (off < w * .08) angle -= w * .08 - off; else if (off > w * .92) angle += off - w * .92;
      picked = wedgeAt();
      Kit.sfx('win'); Kit.haptic('success');
      showResult(wedges[picked]);
    }
    var picked = -1;
    function spin(v) {
      if (spinning || n() < 1) return;
      picked = -1; spinning = true;
      omega = v || 10 + Math.random() * 6;
      clearResult();
      lastPeg = pegIndex();
      Kit.sfx('whoosh'); Kit.haptic('light');
      showControls();
      kick();
    }

    // Flick the wheel by hand
    var drag = null;
    wrap.addEventListener('pointerdown', function (e) {
      if (spinning || !n()) return;
      var r = wrap.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      drag = { cx: cx, cy: cy, a: Math.atan2(e.clientY - cy, e.clientX - cx), base: angle, trail: [{ t: performance.now(), a: angle }] };
      wrap.setPointerCapture(e.pointerId);
      if (picked >= 0) { picked = -1; clearResult(); showControls(); }
    });
    wrap.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx), d = a - drag.a;
      if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
      drag.a = a; angle += d;
      var p = pegIndex(); if (p !== lastPeg) { lastPeg = p; flapV -= (d > 0 ? 1 : -1) * 12; Kit.sfx('tick'); kick(); }
      var now = performance.now(); drag.trail.push({ t: now, a: angle });
      while (drag.trail.length > 2 && now - drag.trail[0].t > 90) drag.trail.shift();
      draw();
    });
    function release() {
      if (!drag) return;
      var tr = drag.trail, a0 = tr[0], a1 = tr[tr.length - 1], dt = (a1.t - a0.t) / 1000;
      var v = dt > 0 ? (a1.a - a0.a) / dt : 0;
      drag = null;
      if (Math.abs(v) > 3) spin(Math.sign(v) * Math.min(22, Math.max(8, Math.abs(v) * 1.1)));
    }
    wrap.addEventListener('pointerup', release);
    wrap.addEventListener('pointercancel', release);

    // ── Controls and result ─────────────────────────────────────────────────
    function showControls() {
      ctl.innerHTML = ''; ctl.className = 'sp-go';
      if (!wedges.length) { ctl.appendChild(el('div', { class: 'sp-empty', text: 'Nothing to spin. Try fewer filters.' })); return; }
      var b = el('button', { type: 'button', class: 'btn btn-yellow btn-lg', disabled: spinning ? '' : null, html: Kit.icon('play') + '<span>' + (spinning ? 'Spinning…' : 'Spin') + '</span>' });
      if (spinning) b.disabled = true;
      b.addEventListener('click', function () { spin(); });
      ctl.appendChild(b);
    }
    var rb = null;
    function clearResult() { if (rb) { rb.remove(); rb = null; } ctl.style.visibility = ''; }
    function showResult(g) {
      clearResult();
      ctl.style.visibility = 'hidden';
      var card = el('div', { class: 'sp-res', style: { '--c': g.color } }, [
        el('span', { html: GameIcon(g.id), style: { display: 'contents' } }),
        el('span', { class: 'tx' }, [el('b', { text: g.name }), el('small', { text: g.tag })])
      ]);
      var play = el('button', { type: 'button', class: 'btn btn-primary btn-lg', html: Kit.icon('play') + '<span>Play ' + Kit.esc(g.name) + '</span>' });
      play.addEventListener('click', function () { o.launch(g); });
      var again = el('button', { type: 'button', class: 'btn btn-soft', html: Kit.icon('shuffle') + '<span>Spin again</span>' });
      again.addEventListener('click', function () { spin(); });
      var nope = el('button', { type: 'button', class: 'btn btn-soft', html: Kit.icon('close') + '<span>Not this one</span>' });
      nope.addEventListener('click', function () {
        // Raffle style: pull the ticket and refill from games not on the wheel yet
        var gone = wedges.splice(picked, 1)[0];
        var spare = pool.filter(function (x) { return wedges.indexOf(x) < 0 && x !== gone; });
        if (spare.length) wedges.splice(picked, 0, spare[Math.floor(Math.random() * spare.length)]);
        picked = -1; Kit.sfx('flip');
        clearResult(); showControls(); draw();
      });
      rb = el('div', { class: 'sp-rb' }, [card, el('div', { class: 'sp-res-a' }, [play, again, nope])]);
      stage.appendChild(rb);
      draw();
      if (Kit.confetti) Kit.confetti({ count: 40 });
    }

    function close() {
      cancelAnimationFrame(raf); window.removeEventListener('resize', onR);
      document.body.style.overflow = prevOverflow;
      root.remove(); document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); if ((e.key === ' ' || e.key === 'Enter') && e.target === document.body) { e.preventDefault(); spin(); } }
    function onR() { layout(); }
    xb.addEventListener('click', function () { Kit.sfx('tap'); close(); });
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onR);

    paintFilters();
    fill();
    requestAnimationFrame(layout);
    return { close: close };
  }

  return { open: open };
})();
