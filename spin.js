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
    '.sp-n{flex-wrap:wrap;column-gap:4px;row-gap:0;}.sp-n button{white-space:nowrap;border:0;background:none;color:var(--accent-2,#9db4ff);font:inherit;font-weight:900;padding:2px 4px;display:inline-flex;align-items:center;gap:4px;}' +
    '.sp-n button .ico{width:14px;height:14px;}' +
    '.sp-stage{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;}' +
    '.sp-wrap{position:relative;flex:none;touch-action:none;user-select:none;-webkit-user-select:none;}' +
    '.sp-wrap canvas{display:block;width:100%;height:100%;filter:drop-shadow(0 14px 24px rgba(0,0,0,.55));}' +
    '.sp-spin{position:relative;overflow:hidden;--pw:0%;}.sp-spin::before{content:"";position:absolute;inset:0;width:var(--pw);background:rgba(255,255,255,.45);pointer-events:none;}' +
    '.sp-spin.full::before{animation:sp-blink .25s steps(2) infinite;}@keyframes sp-blink{50%{opacity:.2}}' +
    '.sp-spin>*{position:relative;}.sp-go{flex-direction:column;align-items:center;}.sp-hint{white-space:nowrap;font-size:.74rem;font-weight:800;color:var(--text-3);}' +
    '.sp-go{flex:none;width:min(100%,360px);display:flex;gap:6px;}' +
    '.sp-go .btn{width:100%;}' +
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
    f.off = Array.isArray(f.off) ? f.off : [];   // games taken off the wheel (hold a wedge)

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
      if (f.off.indexOf(g.id) >= 0) return false;
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
      else wedges = wedges.filter(function (g) { return pool.indexOf(g) >= 0; });
      nLine.innerHTML = '';
      var txt = !pool.length ? 'No games match these filters' :
        pool.length > MAXW ? MAXW + ' of ' + pool.length + ' on the wheel' : pool.length + (pool.length === 1 ? ' game' : ' games') + ' on the wheel';
      nLine.appendChild(el('span', { text: txt }));
      if (pool.length > MAXW) {
        var sh = el('button', { type: 'button', html: Kit.icon('shuffle') + '<span>New mix</span>' });
        sh.addEventListener('click', function () { Kit.sfx('flip'); fill(); });
        nLine.appendChild(sh);
      }
      if (f.off.length) {
        var bb = el('button', { type: 'button', html: Kit.icon('undo') + '<span>Bring back ' + f.off.length + '</span>', title: f.off.map(function (id) { var g = findGame(id); return g ? g.name : id; }).join(', ') });
        bb.addEventListener('click', function () { f.off = []; store(f); Kit.sfx('good'); Kit.toast('Every game is back on the wheel'); fill(); });
        nLine.appendChild(bb);
      }
      if (!keep) setAngle(Math.random() * Math.PI * 2); else setAngle(st.th);
      picked = -1;
      clearResult(); showControls();
      draw();
    }

    // ── Stage: wheel + controls ─────────────────────────────────────────────
    var wrap = el('div', { class: 'sp-wrap' }), cv = el('canvas'), ctx = cv.getContext('2d');
    wrap.appendChild(cv);
    var ctl = el('div', { class: 'sp-go' });
    stage.appendChild(wrap); stage.appendChild(ctl);

    // Canvas geometry (device pixels): the flapper hinge sits above the wheel
    var size = 300, dpr = 1, R = 120, CX = 150, CY = 160;
    function layout() {
      var r = stage.getBoundingClientRect();
      var reserve = 92;   // spin button and hint below the wheel
      size = Math.max(180, Math.floor(Math.min(r.width - 4, r.height - reserve - 12, 560)));
      dpr = Math.min(3, window.devicePixelRatio || 1);
      wrap.style.width = wrap.style.height = size + 'px';
      cv.width = cv.height = Math.round(size * dpr);
      R = cv.width * 0.41; CX = cv.width / 2; CY = cv.width * 0.55;
      draw();
    }

    // ── Physics (same model as the Wheel of Fortune wheel) ──────────────────
    // Units: wheel radius = 1, seconds, wheel inertia = 1. Pegs sit on the rim
    // at every wedge corner. The flapper is a rubber pointer hinged above the
    // wheel: a damped rotational spring that stiffens near center. Pegs and
    // flapper touch through a stiff, slightly lossy contact, so each peg bends
    // the flapper, costs the wheel energy, and the flapper snaps back into the
    // next wedge. Fixed 1/600 s steps; the result is read once all is at rest.
    var P = { HP: 1.22, FL: 0.285, RP: 0.925, PR: 0.024, kf: 0.3, Kp: 0.1, bs: 0.08, If: 0.0003, cf: 0.007,
      kc: 300, cc: 0.5, mu: 0.05, F0: 0.25, F1: 0.04, Cd: 0.01, Fs: 0.03, W1: 0.08 };
    var W_MIN = 3.4, W_MAX = 7.3, H = 1 / 600, CAP = 40;
    var st = { th: 0, om: 0, b: 0, bv: 0, t: 0, touch: false, rest: 0 };
    function n() { return wedges.length; }
    function A() { return Math.PI * 2 / Math.max(1, n()); }
    function hw(u) { return 0.05 * (1 - u) + 0.010 * u; }
    function step(h, onHit, kin) {
      var Aw = A(), th = st.th, om = st.om, b = st.b, bv = st.bv, L = P.FL;
      var base = ((th % Aw) + Aw) % Aw, tw = 0, tb = 0, touching = false, sb = Math.sin(b), cb = Math.cos(b);
      for (var k = -2; k <= 1; k++) {
        var ph = base + k * Aw; if (ph < -0.6 || ph > 0.6) continue;
        var sp = Math.sin(ph), cp = Math.cos(ph), rx = P.RP * sp, ry = P.HP - P.RP * cp;
        var u = (rx * sb + ry * cb) / L; u = u < 0 ? 0 : u > 1 ? 1 : u;
        var dx = rx - u * L * sb, dy = ry - u * L * cb, d = Math.sqrt(dx * dx + dy * dy), rc = P.PR + hw(u);
        if (d >= rc || d < 1e-9) continue;
        touching = true;
        var nx = dx / d, ny = dy / d;
        var vx = om * P.RP * cp - bv * u * L * cb, vy = om * P.RP * sp + bv * u * L * sb;
        var vn = vx * nx + vy * ny;
        if (!st.touch && onHit) onHit(-vn);
        var F = P.kc * (rc - d) + (vn < 0 ? -P.cc * vn : 0);
        var Ft = -P.mu * F * Math.tanh((vx * -ny + vy * nx) / 0.05);
        var fx = F * nx - Ft * ny, fy = F * ny + Ft * nx;
        tw += P.RP * (fx * cp + fy * sp);
        tb -= u * L * (fx * cb - fy * sb);
      }
      st.touch = touching;
      if (!kin) {
        var ao = Math.abs(om), fr = (P.Fs + (P.F0 - P.Fs) * Math.min(1, ao / P.W1)) * Math.tanh(om / 0.01) + P.F1 * om + P.Cd * om * ao;
        st.om = om + (tw - fr) * h;
      }
      st.bv = bv + (tb - P.kf * b - P.Kp * Math.tanh(b / P.bs) - P.cf * bv) / P.If * h;
      st.th = th + st.om * h; st.b = b + st.bv * h;
      if (st.b > 1.2) { st.b = 1.2; if (st.bv > 0) st.bv *= -0.3; } else if (st.b < -1.2) { st.b = -1.2; if (st.bv < 0) st.bv *= -0.3; }
      st.t += h;
      if (!touching && Math.abs(st.om) < 0.004 && Math.abs(st.b) < 0.006 && Math.abs(st.bv) < 0.08) st.rest += h; else st.rest = 0;
      return st.rest > 0.12;
    }
    function wedgeAt() { var Aw = A(), a = ((-st.th) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); return Math.floor(a / Aw) % n(); }
    // Start the pointer clear of the pegs so the flapper hangs free
    function setAngle(a) {
      var Aw = A(), x = ((a % Aw) + Aw) % Aw, m = Math.min(0.07, Aw * 0.3);
      if (x < m) a += m - x; else if (x > Aw - m) a -= x - (Aw - m);
      st.th = a; st.om = 0; st.b = 0; st.bv = 0; st.touch = false;
    }

    // Peg on rubber flapper: louder and brighter the harder it hits
    var ac = null, lastClick = 0, lastHap = 0;
    function pegSound(v) {
      try { if (localStorage.getItem('gn_sound') === '0') return; } catch (e) {}
      try {
        if (!ac) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return; ac = new C(); }
        if (ac.state === 'suspended') ac.resume();
        var k = Math.max(0.06, Math.min(1, v / 2.5)), t = ac.currentTime;
        var nN = Math.floor(ac.sampleRate * (0.01 + 0.012 * k)), buf = ac.createBuffer(1, nN, ac.sampleRate), d = buf.getChannelData(0);
        for (var i = 0; i < nN; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / nN);
        var src = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 1300 + 1500 * k; g.gain.value = 0.03 + 0.17 * k;
        src.buffer = buf; src.connect(f); f.connect(g); g.connect(ac.destination); src.start(t);
        var o = ac.createOscillator(), og = ac.createGain(), dur = 0.016 + 0.01 * k;
        o.type = 'square'; o.frequency.value = 900 + 1100 * k;
        og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.004 + 0.014 * k, t + 0.004); og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(og); og.connect(ac.destination); o.start(t); o.stop(t + dur + 0.03);
      } catch (e) {}
    }
    function hit(v, now) {
      if (v < 0.04 || now - lastClick < 28) return;
      lastClick = now; pegSound(v);
      if (v > 0.25 && now - lastHap > 90) { lastHap = now; Kit.haptic('tick'); }
    }

    // ── Drawing ─────────────────────────────────────────────────────────────
    function shade(hex, amt) {
      var c = hex.replace('#', ''); if (c.length === 3) c = c.replace(/./g, '$&$&');
      var v = parseInt(c, 16), r = v >> 16, g = v >> 8 & 255, b = v & 255;
      var t = amt < 0 ? 0 : 255, p = Math.abs(amt);
      return 'rgb(' + Math.round(r + (t - r) * p) + ',' + Math.round(g + (t - g) * p) + ',' + Math.round(b + (t - b) * p) + ')';
    }
    function draw() {
      var Sz = cv.width, N = n(), c = ctx;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, Sz, Sz);
      // Rim: dark lacquered wood with a brass edge
      var Ro = R * 1.06, rim = c.createRadialGradient(CX, CY, R * .95, CX, CY, Ro);
      rim.addColorStop(0, '#2a160a'); rim.addColorStop(.45, '#6e3d1c'); rim.addColorStop(1, '#2a160a');
      c.beginPath(); c.arc(CX, CY, Ro, 0, Math.PI * 2); c.fillStyle = rim; c.fill();
      c.lineWidth = 2 * dpr; c.strokeStyle = '#d4a017'; c.stroke();
      var Ri = R * .985;
      if (!N) { c.beginPath(); c.arc(CX, CY, Ri, 0, Math.PI * 2); c.fillStyle = '#231c45'; c.fill(); hub(); flapper(); return; }
      var w = A(), off = st.th - Math.PI / 2, win = spinning ? -1 : picked, i;
      for (i = 0; i < N; i++) {
        var a0 = off + i * w, base = wedges[i].color || '#555';
        c.beginPath(); c.moveTo(CX, CY); c.arc(CX, CY, Ri, a0, a0 + w); c.closePath();
        var gr = c.createRadialGradient(CX, CY, Ri * .15, CX, CY, Ri);
        gr.addColorStop(0, shade(base, -.35)); gr.addColorStop(.7, i % 2 ? shade(base, -.08) : base); gr.addColorStop(1, shade(base, -.25));
        c.fillStyle = gr; c.fill();
        if (win >= 0 && win !== i) { c.fillStyle = 'rgba(10,6,25,.55)'; c.fill(); }
      }
      c.strokeStyle = 'rgba(255,244,214,.75)'; c.lineWidth = 1.4 * dpr;
      for (i = 0; i < N; i++) {
        var a = off + i * w;
        c.beginPath(); c.moveTo(CX + Math.cos(a) * Ri * .18, CY + Math.sin(a) * Ri * .18); c.lineTo(CX + Math.cos(a) * Ri, CY + Math.sin(a) * Ri); c.stroke();
      }
      // Names, reading outward from the hub, inside the ring of pegs
      var outer = R * .86, maxLen = outer - R * .22, arcH = 2 * R * .62 * Math.sin(w / 2);
      for (i = 0; i < N; i++) {
        var mid = off + (i + .5) * w, name = wedges[i].name;
        c.save(); c.translate(CX, CY); c.rotate(mid);
        var fs = Math.min(arcH * .62, 17 * dpr, R * .09);
        c.font = '800 ' + fs + 'px system-ui, -apple-system, sans-serif';
        var tw = c.measureText(name).width;
        if (tw > maxLen) { fs *= maxLen / tw; c.font = '800 ' + fs + 'px system-ui, -apple-system, sans-serif'; }
        c.textAlign = 'right'; c.textBaseline = 'middle';
        c.fillStyle = (win >= 0 && win !== i) ? 'rgba(255,255,255,.45)' : '#fff';
        c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 3 * dpr; c.shadowOffsetY = 1 * dpr;
        c.fillText(name, outer, 0);
        c.restore();
      }
      // Brass pegs at every wedge corner
      var pr = R * P.PR * 1.15;
      for (i = 0; i < N; i++) {
        var pa = off + i * w, px = CX + Math.cos(pa) * R * P.RP, py = CY + Math.sin(pa) * R * P.RP;
        var pg = c.createRadialGradient(px - pr * .3, py - pr * .3, pr * .1, px, py, pr);
        pg.addColorStop(0, '#fff3c4'); pg.addColorStop(.5, '#d4a017'); pg.addColorStop(1, '#6b4a0a');
        c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fillStyle = pg; c.fill();
      }
      if (win >= 0) {
        c.save(); c.beginPath(); c.moveTo(CX, CY); c.arc(CX, CY, Ri, off + win * w, off + (win + 1) * w); c.closePath();
        c.lineWidth = 3 * dpr; c.strokeStyle = '#ffd34d'; c.shadowColor = '#ffd34d'; c.shadowBlur = 14 * dpr; c.stroke(); c.restore();
      }
      if (holdW >= 0 && holdP > 0) {
        c.save(); c.beginPath(); c.moveTo(CX, CY); c.arc(CX, CY, Ri * (0.2 + 0.8 * holdP), off + holdW * w, off + (holdW + 1) * w); c.closePath();
        c.fillStyle = 'rgba(15,8,30,' + (0.35 + 0.4 * holdP) + ')'; c.fill();
        c.beginPath(); c.moveTo(CX, CY); c.arc(CX, CY, Ri, off + holdW * w, off + (holdW + 1) * w); c.closePath();
        c.lineWidth = 3 * dpr; c.strokeStyle = 'rgba(255,107,107,' + (0.4 + 0.6 * holdP) + ')'; c.stroke(); c.restore();
      }
      hub(); flapper();
    }
    function hub() {
      var hr = R * .17, hg = ctx.createRadialGradient(CX - hr * .35, CY - hr * .4, hr * .1, CX, CY, hr);
      hg.addColorStop(0, '#fff3c4'); hg.addColorStop(.45, '#d4a017'); hg.addColorStop(1, '#7a5208');
      ctx.beginPath(); ctx.arc(CX, CY, hr, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill();
      ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = '#5a3d06'; ctx.stroke();
      ctx.beginPath(); ctx.arc(CX, CY, hr * .55, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(90,61,6,.6)'; ctx.stroke();
    }
    // The flapper bends like rubber: the root stays nearly upright and the tip carries the bend
    function flapperPath(o, L, b) {
      var tx = L * Math.sin(b), ty = L * Math.cos(b), qx = 0.55 * L * Math.sin(0.08 * b), qy = 0.55 * L * Math.cos(0.08 * b);
      var m = 14, lft = [], rgt = [], i;
      for (i = 0; i <= m; i++) {
        var t = i / m, u = 1 - t;
        var x = 2 * u * t * qx + t * t * tx, y = 2 * u * t * qy + t * t * ty;
        var dx = 2 * u * qx + 2 * t * (tx - qx), dy = 2 * u * qy + 2 * t * (ty - qy), dl = Math.sqrt(dx * dx + dy * dy) || 1;
        var wd = R * (0.056 * (1 - t) + 0.011 * t), nx = -dy / dl * wd, ny = dx / dl * wd;
        lft.push([x + nx, y + ny]); rgt.push([x - nx, y - ny]);
      }
      o.beginPath(); o.moveTo(lft[0][0], lft[0][1]);
      for (i = 1; i <= m; i++) o.lineTo(lft[i][0], lft[i][1]);
      o.quadraticCurveTo(tx + (tx - qx) * 0.06, ty + (ty - qy) * 0.06, rgt[m][0], rgt[m][1]);
      for (i = m - 1; i >= 0; i--) o.lineTo(rgt[i][0], rgt[i][1]);
      o.closePath();
      return { tx: tx, ty: ty, qx: qx, qy: qy };
    }
    function flapper() {
      var g = ctx, L = R * P.FL, b = st.b, px = CX, py = CY - R * P.HP;
      g.save(); g.translate(px + R * 0.018, py + R * 0.03);
      flapperPath(g, L, b); g.fillStyle = 'rgba(0,0,0,.35)'; g.fill(); g.restore();
      g.save(); g.translate(px, py);
      var k = flapperPath(g, L, b), ga = 0.6 * b, gx = Math.cos(ga) * R * 0.06, gy = -Math.sin(ga) * R * 0.06;
      var fg = g.createLinearGradient(-gx, -gy, gx, gy); fg.addColorStop(0, '#a50f16'); fg.addColorStop(0.5, '#ff5148'); fg.addColorStop(1, '#8e0b12');
      g.fillStyle = fg; g.fill(); g.lineWidth = 1.2 * dpr; g.strokeStyle = '#3a0306'; g.stroke();
      g.beginPath(); g.moveTo(-R * 0.012, R * 0.04); g.quadraticCurveTo(k.qx - R * 0.01, k.qy, k.tx * 0.92 - R * 0.004, k.ty * 0.92);
      g.lineWidth = Math.max(1, R * 0.01); g.lineCap = 'round'; g.strokeStyle = 'rgba(255,190,180,.45)'; g.stroke();
      var cg = g.createRadialGradient(-R * 0.02, -R * 0.02, 1, 0, 0, R * 0.065); cg.addColorStop(0, '#fff6cf'); cg.addColorStop(0.5, '#e2b440'); cg.addColorStop(1, '#7a5610');
      g.beginPath(); g.arc(0, 0, R * 0.065, 0, Math.PI * 2); g.fillStyle = cg; g.fill(); g.lineWidth = 1.2 * dpr; g.strokeStyle = '#4a3305'; g.stroke();
      g.restore();
    }

    // ── Animation loop ──────────────────────────────────────────────────────
    var spinning = false, picked = -1, raf = 0, last = 0, acc = 0, drag = null;
    function loop(now) {
      raf = 0;
      var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
      var hf = function (v) { hit(v, now); }, j, k;
      if (spinning) {
        acc += dt; var stopped = false;
        while (acc >= H) { acc -= H; if (step(H, hf) || st.t > CAP) { stopped = true; break; } }
        if (stopped) { st.om = 0; acc = 0; settle(); }
      } else if (drag) {
        // The wheel follows the finger; pegs still knock the flapper as they pass
        k = Math.max(1, Math.min(60, Math.round(dt / H))); st.om = Math.max(-30, Math.min(30, (drag.th - st.th) / (k * H)));
        for (j = 0; j < k; j++) step(H, hf, true);
        st.om = 0;
      } else {
        st.om = 0; k = Math.min(60, Math.round(dt / H));
        for (j = 0; j < k; j++) step(H, hf, true);
      }
      draw();
      if (spinning || drag || power !== null || Math.abs(st.b) > 0.002 || Math.abs(st.bv) > 0.02) raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
    function settle() {
      spinning = false;
      picked = wedgeAt();
      Kit.sfx('win'); Kit.haptic('success');
      showResult(wedges[picked]);
    }
    function omegaFor(p) { return (W_MIN + (W_MAX - W_MIN) * Math.max(0, Math.min(1, p))) * (0.96 + Math.random() * 0.08); }
    function spin(om) {
      if (spinning || n() < 1) return;
      picked = -1; spinning = true; power = null;
      st.om = om || omegaFor(0.45 + Math.random() * 0.5); st.t = 0; st.rest = 0; acc = 0;
      clearResult();
      Kit.sfx('whoosh'); Kit.haptic('light');
      showControls();
      kick();
    }

    // Flick the wheel by hand
    function angleOf(e) {
      var r = cv.getBoundingClientRect(), k = r.width / cv.width;
      return Math.atan2(e.clientY - (r.top + CY * k), e.clientX - (r.left + CX * k));
    }
    // Hold a wedge to take that game off the wheel (remembered on this device)
    var hold = null, holdW = -1, holdP = 0;
    function wedgeUnder(e) {
      var r = cv.getBoundingClientRect(), k = cv.width / r.width;
      var dx = (e.clientX - r.left) * k - CX, dy = (e.clientY - r.top) * k - CY;
      if (Math.sqrt(dx * dx + dy * dy) > R || Math.sqrt(dx * dx + dy * dy) < R * .17) return -1;
      var ph = Math.atan2(dx, -dy), a = ((ph - st.th) % (2 * Math.PI) + 4 * Math.PI) % (2 * Math.PI);
      return Math.floor(a / A()) % n();
    }
    function holdTick() {
      if (!hold) return;
      holdP = Math.min(1, (performance.now() - hold.t0) / 650);
      draw();
      if (holdP >= 1) { var i = holdW; endHold(); takeOff(i); return; }
      hold.raf = requestAnimationFrame(holdTick);
    }
    function endHold() { if (hold) cancelAnimationFrame(hold.raf); hold = null; holdW = -1; holdP = 0; draw(); }
    function takeOff(i) {
      var g = wedges[i]; if (!g) return;
      drag = null;
      f.off.push(g.id); store(f);
      Kit.sfx('flip'); Kit.haptic('success');
      pool = pool.filter(function (x) { return x !== g; });
      wedges.splice(i, 1);
      var spare = pool.filter(function (x) { return wedges.indexOf(x) < 0; });
      if (spare.length) wedges.splice(i, 0, spare[Math.floor(Math.random() * spare.length)]);
      Kit.toast(g.name + ' is off the wheel');
      fill(true);
    }
    cv.addEventListener('pointerdown', function (e) {
      if (spinning || !n()) return;
      e.preventDefault();
      var wi = wedgeUnder(e);
      if (wi >= 0) { hold = { t0: performance.now(), x: e.clientX, y: e.clientY, raf: 0 }; holdW = wi; holdP = 0; hold.raf = requestAnimationFrame(holdTick); }
      drag = { last: angleOf(e), th: st.th, s: [[performance.now(), st.th]] };
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      if (picked >= 0) { picked = -1; clearResult(); showControls(); }
      kick();
    });
    cv.addEventListener('pointermove', function (e) {
      if (hold && Math.abs(e.clientX - hold.x) + Math.abs(e.clientY - hold.y) > 10) endHold();
      if (!drag) return;
      var a = angleOf(e), da = a - drag.last;
      if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
      drag.last = a; drag.th += da;
      var now = performance.now(); drag.s.push([now, drag.th]);
      while (drag.s.length > 2 && now - drag.s[0][0] > 120) drag.s.shift();
    });
    function release() {
      if (hold) endHold();
      if (!drag) return;
      var sm = drag.s, now = performance.now(); drag = null;
      var a = sm[0], b = sm[sm.length - 1], dt = (b[0] - a[0]) / 1000;
      var om = dt > 0.008 && now - b[0] < 150 ? (b[1] - a[1]) / dt : 0;
      if (Math.abs(om) > 1.5) spin(Math.sign(om) * Math.max(W_MIN, Math.min(W_MAX * 1.1, Math.abs(om))) * (0.96 + Math.random() * 0.08));
    }
    cv.addEventListener('pointerup', release);
    cv.addEventListener('pointercancel', function () { drag = null; if (hold) endHold(); });

    // Hold Spin to build power (same feel as Wheel of Fortune); a tap is a good, random spin
    var power = null, pT0 = 0, pBtn = null, pRaf = 0;
    function powerTick() {
      if (power === null) return;
      var t = (performance.now() - pT0) / 1600;
      power = t <= 1 ? t : 1;
      if (pBtn) { pBtn.style.setProperty('--pw', (power * 100).toFixed(1) + '%'); pBtn.classList.toggle('full', power >= 1); }
      if (power >= 1 && !pBtn.dataset.buzz) { pBtn.dataset.buzz = '1'; Kit.haptic('light'); }
      pRaf = requestAnimationFrame(powerTick);
    }
    function powerDown(b) { if (spinning || !n()) return; pBtn = b; pBtn.dataset.buzz = ''; power = 0; pT0 = performance.now(); powerTick(); }
    function powerUp() {
      if (power === null) return;
      var held = performance.now() - pT0, p = power; power = null; cancelAnimationFrame(pRaf);
      if (pBtn) { pBtn.style.removeProperty('--pw'); pBtn.classList.remove('full'); }
      spin(held < 220 ? undefined : omegaFor(Math.max(0.15, p)));
    }

    // ── Controls and result ─────────────────────────────────────────────────
    function showControls() {
      ctl.innerHTML = ''; ctl.className = 'sp-go';
      if (!wedges.length) { ctl.appendChild(el('div', { class: 'sp-empty', text: 'Nothing to spin. Try fewer filters.' })); return; }
      var b = el('button', { type: 'button', class: 'btn btn-yellow btn-lg sp-spin', html: Kit.icon('play') + '<span>' + (spinning ? 'Spinning…' : 'Spin') + '</span>' });
      if (spinning) b.disabled = true;
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) {} powerDown(b); });
      b.addEventListener('pointerup', powerUp);
      b.addEventListener('pointercancel', function () { if (power !== null) powerUp(); });
      b.addEventListener('click', function (e) { if (e.detail === 0) spin(); });   // keyboard
      ctl.appendChild(b);
      if (!spinning) ctl.appendChild(el('div', { class: 'sp-hint', text: 'Hold Spin for power · hold a slice to remove it' }));
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
      cancelAnimationFrame(raf); cancelAnimationFrame(pRaf); window.removeEventListener('resize', onR);
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
