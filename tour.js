// ==== Game Night tour (tour.js) ====
// Two ways in, one set of animated scenes (little working models of the app, drawn with the real game icons):
//   Tour.intro(opts)   "First time here?": a swipeable overview, one big idea per slide. The sign-in page opens it,
//                      and its last slide signs you in (opts.onGoogle, opts.onPin, opts.onGuest). From inside the app
//                      (opts.app) the last slide leads into the guide instead.
//   Tour.guide(topic, opts)   How Game Night works: the same scenes with everything spelled out, topic by topic, and
//                      buttons that open the real thing. topic: signin | together | link | scores | home (none: the
//                      list). opts.actions: { move, changePin } from the home screen.
// Needs kit.js (Kit.el, Kit.icon, Kit.avatar, Kit.sfx) and games.js; game-icons.js draws the real icons when loaded.
var Tour = (function () {
  'use strict';
  var doc = document, K = window.Kit, el = K.el, icon = K.icon;
  var still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function A(n, k, o) { return n && n.animate && !still ? n.animate(k, Object.assign({ fill: 'both' }, o)) : null; }
  function sfx(n) { try { K.sfx(n); } catch (e) {} }
  function haptic(n) { try { K.haptic(n); } catch (e) {} }
  var ALL = (typeof GAMES !== 'undefined' ? GAMES : []).filter(function (g) { return !g.hidden && !g.cart && g.cat !== 'tools' && g.cat !== 'console'; });
  function game(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i].id === id) return ALL[i]; return null; }
  function pick(ids, n) {
    var out = ids.map(game).filter(Boolean);
    for (var i = 0; out.length < n && i < ALL.length; i++) if (out.indexOf(ALL[i]) < 0) out.push(ALL[i]);
    return out.slice(0, n);
  }
  function gIcon(g) { try { if (window.GameIcon) return GameIcon(g.id); } catch (e) {} return icon('gamepad'); }
  // a game's little tile: its icon on its colour, as on the home screen
  function chip(g, cls) { return el('span', { class: 'tr-gi' + (cls ? ' ' + cls : ''), style: { '--c': g.color }, html: gIcon(g) }); }
  // screen distances to the stage's own (a stage can be drawn larger on big screens with zoom)
  function kz(box) { var r = box.getBoundingClientRect(); return r.width ? box.offsetWidth / r.width : 1; }
  function av(name, color, cls) { return K.avatar.el(name, cls || null, color); }
  var G_LOGO = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  var MARK = '<svg viewBox="40 40 176 176" aria-hidden="true"><g fill="none" stroke-width="18" stroke-linecap="round"><path d="M148 72A58 58 0 0 1 184 108" stroke="#ffd166"/><path d="M184 148A58 58 0 0 1 148 184" stroke="#ff7a8a"/><path d="M108 184A58 58 0 0 1 72 148" stroke="#4fd1c5"/><path d="M72 108A58 58 0 0 1 108 72" stroke="#8b7cff"/></g><g fill="#fff"><circle cx="79" cy="79" r="16"/><circle cx="177" cy="79" r="16"/><circle cx="177" cy="177" r="16"/><circle cx="79" cy="177" r="16"/></g></svg>';
  var PEOPLE = [['Ava', '#ff7a8a'], ['Leo', '#4fd1c5'], ['Mia', '#8b7cff'], ['You', '#ffd166']];

  // ── Timelines: each scene runs its own little show and starts it again until it's stopped ──
  function timeline() {
    var ts = [], on = true;
    return {
      at: function (ms, fn) { ts.push(setTimeout(function () { if (on) fn(); }, ms)); },
      stop: function () { on = false; ts.forEach(clearTimeout); ts = []; },
      live: function () { return on; }
    };
  }
  // a scene: build(box) puts its pieces in the box and returns run(T) (one pass, which calls T.at to schedule)
  // and the length of a pass; the stage loops it while it's on screen
  function stage(build, cls) {
    var box = el('div', { class: 'tr-stage' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true' }), sc = null, T = null;
    function loop() { if (!T || !T.live()) return; sc.run(T); T.at(sc.len, loop); }
    return {
      el: box,
      play: function () { this.stop(); box.innerHTML = ''; sc = build(box); T = timeline(); if (still) { if (sc.still) sc.still(); return; } loop(); },
      stop: function () { if (T) T.stop(); T = null; box.getAnimations && box.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); }); }
    };
  }

  // ── The scenes ──
  var SCENES = {};
  // Every game in one place: the tiles fly in from all sides and land in a grid, the count runs up, then they shuffle
  SCENES.games = function (box) {
    var gs = pick(['yahtzee', 'hearts', 'chess', 'wordle', 'monopoly', 'poker', 'galaga', 'scrabble', 'blackjack', 'battleship', 'spades', 'sudoku'], 12);
    var grid = el('div', { class: 'tr-grid' }), tiles = gs.map(function (g) { var t = chip(g, 'big'); grid.appendChild(t); return t; });
    var n = el('b', { text: '0' }), count = el('div', { class: 'tr-count' }, [n, el('span', { text: 'games' })]);
    box.appendChild(grid); box.appendChild(count);
    function setCount(v) { n.textContent = String(v); }
    return {
      len: 6200,
      still: function () { setCount(ALL.length); },
      run: function (T) {
        setCount(0);
        tiles.forEach(function (t, i) {
          var a = (i * 137.5) * Math.PI / 180, r = 260;
          A(t, [{ transform: 'translate(' + Math.cos(a) * r + 'px,' + Math.sin(a) * r + 'px) rotate(' + (i % 2 ? 160 : -160) + 'deg) scale(.4)', opacity: 0 },
                { transform: 'translate(0,0) rotate(' + (i % 2 ? -8 : 8) + 'deg) scale(1.12)', opacity: 1, offset: .75 },
                { transform: 'none', opacity: 1 }], { duration: 700, delay: i * 70, easing: 'cubic-bezier(.2,.8,.3,1)' });
        });
        T.at(250, function () { sfx('whoosh'); });
        A(count, [{ opacity: 0, transform: 'translateY(16px) scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 900, easing: 'cubic-bezier(.2,1.4,.4,1)' });
        var total = ALL.length;
        for (var k = 0; k <= 20; k++) (function (k) { T.at(900 + k * 45, function () { setCount(Math.round(total * k / 20)); }); })(k);
        // a few tiles take a bow, one after another
        [2300, 2800, 3300, 3800, 4300].forEach(function (ms, j) {
          T.at(ms, function () { var t = tiles[(j * 5 + 3) % tiles.length]; A(t, [{ transform: 'none' }, { transform: 'translateY(-10px) scale(1.18) rotate(-6deg)' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.3,1.6,.5,1)', fill: 'none' }); });
        });
        T.at(5500, function () { tiles.forEach(function (t, i) { A(t, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.5) rotate(' + (i % 2 ? 40 : -40) + 'deg)' }], { duration: 420, delay: i * 25, easing: 'ease-in' }); }); A(count, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }); });
      }
    };
  };
  // Three ways to play: a spotlight moves across Just me, Pass and play, and Online, and each one acts itself out
  SCENES.together = function (box) {
    function card(t, kids) { return el('div', { class: 'tr-mode' }, [el('div', { class: 'tr-mode-art' }, kids), el('b', { text: t })]); }
    var bot = el('span', { class: 'tr-bot', html: icon('bot') });
    var me1 = av('You', '#ffd166', 'sm');
    var phone = el('span', { class: 'tr-mini-phone' }), pa = av('Ava', '#ff7a8a', 'sm'), pb = av('Leo', '#4fd1c5', 'sm');
    var ph1 = el('span', { class: 'tr-mini-phone' }), ph2 = el('span', { class: 'tr-mini-phone' }), wave = el('i', { class: 'tr-wave' });
    var cards = [
      card('Just me', [me1, el('span', { class: 'tr-vs', text: 'vs' }), bot]),
      card('Pass & play', [pa, phone, pb]),
      card('Online', [ph1, wave, ph2])
    ];
    var row = el('div', { class: 'tr-modes' }, cards);
    box.appendChild(row);
    return {
      len: 7200,
      still: function () { cards[1].classList.add('on'); },
      run: function (T) {
        cards.forEach(function (c, i) { A(c, [{ opacity: 0, transform: 'translateY(30px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: i * 120, easing: 'cubic-bezier(.2,1.3,.4,1)' }); });
        function focus(i) { cards.forEach(function (c, k) { c.classList.toggle('on', k === i); }); sfx('tick'); }
        T.at(700, function () { focus(0); A(bot, [{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(14deg)' }, { transform: 'rotate(0)' }], { duration: 700, iterations: 2, fill: 'none' }); });
        T.at(2700, function () { focus(1); A(phone, [{ transform: 'translateX(-22px) rotate(-12deg)' }, { transform: 'translateX(22px) rotate(12deg)' }], { duration: 650, iterations: 4, direction: 'alternate', easing: 'ease-in-out', fill: 'none' }); });
        T.at(4700, function () { focus(2); A(wave, [{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 0 }], { duration: 700, iterations: 3, fill: 'none' }); });
        T.at(6800, function () { cards.forEach(function (c) { c.classList.remove('on'); A(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }); }); });
      }
    };
  };
  // Your games follow you: a score made on the phone flies up through the cloud and lands on the tablet
  SCENES.sync = function (box) {
    var gs = pick(['yahtzee', 'galaga', 'wordle', 'hearts'], 4);
    function screen(cls) { return el('div', { class: 'tr-dev ' + cls }, [el('div', { class: 'tr-dev-scr' })]); }
    var ph = screen('ph'), tb = screen('tb'), cloud = el('span', { class: 'tr-cloud', html: icon('cloud') }), spark = el('i', { class: 'tr-spark' });
    box.appendChild(ph); box.appendChild(tb); box.appendChild(cloud); box.appendChild(spark);
    function row(g, score, isNew, wide) { return el('div', { class: 'tr-srow' + (isNew ? ' new' : '') }, [chip(g, 'sm'), wide ? el('span', { class: 'grow', text: g.name }) : el('span', { class: 'grow' }), el('b', { text: score })]); }
    var round = 0;
    return {
      len: 5200,
      still: function () { ph.firstChild.appendChild(row(gs[0], '280')); tb.firstChild.appendChild(row(gs[0], '280', false, true)); },
      run: function (T) {
        var g = gs[round++ % gs.length], score = String([280, 48200, 6, 95][(round - 1) % 4]);
        ph.firstChild.innerHTML = ''; tb.firstChild.innerHTML = '';
        T.at(300, function () { var r = row(g, score, true); ph.firstChild.appendChild(r); A(r, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1.08)', offset: .7 }, { opacity: 1, transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.2,1.4,.4,1)' }); sfx('good'); });
        T.at(1100, function () {
          var b = box.getBoundingClientRect(), p = ph.getBoundingClientRect(), t = tb.getBoundingClientRect(), c = cloud.getBoundingClientRect(), z = kz(box);
          var x0 = (p.left + p.width / 2 - b.left) * z, y0 = (p.top + p.height / 2 - b.top) * z, x1 = (c.left + c.width / 2 - b.left) * z, y1 = (c.top + c.height / 2 - b.top) * z, x2 = (t.left + t.width / 2 - b.left) * z, y2 = (t.top + t.height / 2 - b.top) * z;
          A(spark, [{ transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.4)', opacity: 0 }, { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(1)', opacity: 1, offset: .1 },
                    { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(1.4)', opacity: 1, offset: .5 }, { transform: 'translate(' + x2 + 'px,' + y2 + 'px) scale(1)', opacity: 1, offset: .92 },
                    { transform: 'translate(' + x2 + 'px,' + y2 + 'px) scale(.2)', opacity: 0 }], { duration: 1500, easing: 'ease-in-out', fill: 'none' });
          A(cloud, [{ transform: 'none' }, { transform: 'scale(1.3)' }, { transform: 'none' }], { duration: 500, delay: 650, fill: 'none' });
        });
        T.at(2550, function () { var r = row(g, score, true, true); tb.firstChild.appendChild(r); A(r, [{ opacity: 0, transform: 'translateY(-14px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,1.4,.4,1)' }); A(tb, [{ boxShadow: '0 0 0 0 rgba(74,222,128,.9)' }, { boxShadow: '0 0 0 14px rgba(74,222,128,0)' }], { duration: 700, fill: 'none' }); sfx('tick'); });
      }
    };
  };
  // Two ways in: a PIN typed into four slots, and Google's button with its check
  SCENES.signin = function (box) {
    var slots = [0, 1, 2, 3].map(function () { return el('span', { class: 'tr-slot' }); });
    var gb = el('div', { class: 'tr-gbtn', html: G_LOGO }), ok = el('i', { class: 'tr-ok', html: icon('check') });
    function line(ic, t) { return el('div', { class: 'tr-li' }, [el('span', { html: icon(ic) }), el('span', { text: t })]); }
    var pinC = el('div', { class: 'tr-way' }, [el('small', { text: 'PIN' }), el('div', { class: 'tr-slots' }, slots), line('key', 'Four digits'), line('users', 'Handy on a family iPad')]);
    var gC = el('div', { class: 'tr-way g' }, [el('small', { text: 'Google' }), el('div', { class: 'tr-gwrap' }, [gb, ok]), line('check', 'Nothing to remember'), line('lock', 'Only you get in')]);
    box.appendChild(el('div', { class: 'tr-ways' }, [pinC, el('span', { class: 'tr-or', text: 'or' }), gC]));
    return {
      len: 5600,
      still: function () { slots.forEach(function (s, i) { s.textContent = '•'; s.classList.add('on'); }); ok.classList.add('on'); },
      run: function (T) {
        slots.forEach(function (s) { s.textContent = ''; s.classList.remove('on'); }); ok.classList.remove('on'); gC.classList.remove('done'); pinC.classList.remove('done');
        A(pinC, [{ opacity: 0, transform: 'translateX(-30px) rotate(-4deg)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.2,1.3,.4,1)' });
        A(gC, [{ opacity: 0, transform: 'translateX(30px) rotate(4deg)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 120, easing: 'cubic-bezier(.2,1.3,.4,1)' });
        var d = String(Math.floor(Math.random() * 9000) + 1000);
        slots.forEach(function (s, i) { T.at(700 + i * 260, function () { s.textContent = d[i]; s.classList.add('on'); sfx('tick'); A(s, [{ transform: 'scale(1.3)' }, { transform: 'none' }], { duration: 260, fill: 'none' }); }); });
        T.at(1900, function () { pinC.classList.add('done'); A(slots[0].parentNode, [{ transform: 'none' }, { transform: 'scale(1.06)' }, { transform: 'none' }], { duration: 380, fill: 'none' }); });
        T.at(2700, function () { A(gb, [{ transform: 'none' }, { transform: 'scale(.88)' }, { transform: 'none' }], { duration: 300, fill: 'none' }); sfx('tap'); });
        T.at(3150, function () { ok.classList.add('on'); gC.classList.add('done'); sfx('good'); });
        T.at(5200, function () { [pinC, gC].forEach(function (c) { A(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }); }); });
      }
    };
  };
  // Linking: one phone shows a code, the other scans it, a link snaps between the two people, and a game played
  // together drops into both of their histories
  SCENES.link = function (box) {
    var qr = el('div', { class: 'tr-qr' });
    for (var i = 0; i < 49; i++) qr.appendChild(el('i', { class: (i * 7919 + (i >> 2) * 31) % 5 < 2 || [0, 1, 7, 8, 5, 6, 12, 13, 35, 36, 42, 43].indexOf(i) >= 0 ? 'on' : '' }));
    var scan = el('i', { class: 'tr-scan' });
    function side(name, color, kids) { return el('div', { class: 'tr-side' }, [av(name, color, 'lg'), el('b', { text: name }), el('div', { class: 'tr-dev ph' }, [el('div', { class: 'tr-dev-scr' }, kids)])]); }
    var hA = el('div', { class: 'tr-hist' }), hB = el('div', { class: 'tr-hist' });
    var L = side('Ava', '#ff7a8a', [qr, hA]), R = side('Leo', '#4fd1c5', [scan, hB]);
    var lk = el('span', { class: 'tr-link', html: icon('link') }), burst = el('i', { class: 'tr-burst' });
    var g = pick(['hearts'], 1)[0], res = el('div', { class: 'tr-res' }, [chip(g, 'sm'), el('span', { text: 'Ava won' })]);
    box.appendChild(L); box.appendChild(R); box.appendChild(lk); box.appendChild(burst); box.appendChild(res);
    function hrow() { return el('div', { class: 'tr-hrow' }, [chip(g, 'xs'), el('span', { text: g.name })]); }
    return {
      len: 7400,
      still: function () { lk.classList.add('on'); qr.style.display = 'none'; hA.appendChild(hrow()); hB.appendChild(hrow()); },
      run: function (T) {
        hA.innerHTML = ''; hB.innerHTML = ''; qr.style.display = ''; scan.style.display = ''; lk.classList.remove('on'); res.style.opacity = '0';
        A(qr, [{ opacity: 0, transform: 'scale(.4) rotate(-20deg)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 300, easing: 'cubic-bezier(.2,1.4,.4,1)' });
        T.at(900, function () { A(scan, [{ transform: 'translateY(0)' }, { transform: 'translateY(52px)' }], { duration: 520, iterations: 3, direction: 'alternate', easing: 'ease-in-out', fill: 'none' }); });
        T.at(2500, function () {
          scan.style.display = 'none'; lk.classList.add('on'); sfx('good'); haptic('success');
          A(lk, [{ transform: 'translate(-50%,-50%) scale(0) rotate(-90deg)' }, { transform: 'translate(-50%,-50%) scale(1.4) rotate(10deg)', offset: .6 }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 600, easing: 'cubic-bezier(.2,1.4,.4,1)' });
          A(burst, [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(2.6)', opacity: 0 }], { duration: 700, easing: 'ease-out', fill: 'none' });
          [L, R].forEach(function (s, i) { A(s.firstChild, [{ transform: 'none' }, { transform: 'translateX(' + (i ? -8 : 8) + 'px) scale(1.1)' }, { transform: 'none' }], { duration: 500, fill: 'none' }); });
        });
        T.at(3600, function () { qr.style.display = 'none'; res.style.opacity = '1'; A(res, [{ opacity: 0, transform: 'translate(-50%,0) scale(.5)' }, { opacity: 1, transform: 'translate(-50%,0) scale(1)' }], { duration: 460, easing: 'cubic-bezier(.2,1.4,.4,1)' }); sfx('pop'); });
        T.at(4700, function () {
          A(res, [{ opacity: 1, transform: 'translate(-50%,0)' }, { opacity: 0, transform: 'translate(-50%,40px) scale(.6)' }], { duration: 420, easing: 'ease-in' });
          [hA, hB].forEach(function (h, i) { T.at(250 + i * 120, function () { var r = hrow(); h.appendChild(r); A(r, [{ opacity: 0, transform: 'translateY(-20px) scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,1.4,.4,1)' }); sfx('tick'); }); });
        });
        T.at(7000, function () { [L, R].forEach(function (s) { A(s, [{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }], { duration: 400, fill: 'none' }); }); });
      }
    };
  };
  // Linked high scores: an arcade board with your friends on it; your new score climbs past theirs to the top
  SCENES.scores = function (box) {
    var g = pick(['galaga', 'centipede', 'snake'], 1)[0];
    var head = el('div', { class: 'tr-bh' }, [chip(g, 'sm'), el('b', { text: g.name }), el('span', { class: 'tr-bh-k', html: icon('trophy') })]);
    var rows = [['AVA', 'Ava', '#ff7a8a', 48200, true], ['LEO', 'Leo', '#4fd1c5', 41750, true], ['MIA', 'Mia', '#8b7cff', 30100, true]];
    var you = null, list = el('div', { class: 'tr-blist' });
    function fmt(v) { return Math.round(v).toLocaleString('en-US'); }
    function mk(r, me) {
      return el('div', { class: 'tr-brow' + (me ? ' me' : '') }, [el('span', { class: 'tr-rk' }), el('span', { class: 'tr-ini', text: r[0] }), av(r[1], r[2], 'sm'),
        r[4] ? el('span', { class: 'tr-lk', html: icon('link') }) : el('span', { class: 'tr-lk none' }), el('b', { class: 'tr-sc', text: fmt(r[3]) })]);
    }
    var board = el('div', { class: 'tr-board' }, [head, list]), stamp = el('div', { class: 'tr-stamp', text: 'New high score' });
    box.appendChild(board); box.appendChild(stamp);
    function ranks() { [].forEach.call(list.children, function (r, i) { r.firstChild.textContent = String(i + 1); }); }
    return {
      len: 7000,
      still: function () { list.innerHTML = ''; you = mk(['YOU', 'You', '#ffd166', 52400, false], true); list.appendChild(you); rows.forEach(function (r) { list.appendChild(mk(r)); }); ranks(); },
      run: function (T) {
        list.innerHTML = ''; stamp.style.opacity = '0';
        var els = rows.map(function (r) { return mk(r); }); els.forEach(function (e) { list.appendChild(e); });
        you = mk(['YOU', 'You', '#ffd166', 12000, false], true); list.appendChild(you); ranks();
        A(board, [{ opacity: 0, transform: 'perspective(600px) rotateX(30deg) translateY(20px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.2,1,.3,1)' });
        [].forEach.call(list.children, function (r, i) { A(r, [{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 300 + i * 110, easing: 'cubic-bezier(.2,1.2,.4,1)' }); });
        var sc = you.querySelector('.tr-sc'), v = 12000;
        // the score runs up, passing each friend on the way
        function climb(to, ms, steps) { for (var k = 1; k <= steps; k++) (function (k, from) { T.at(ms + k * 40, function () { sc.textContent = fmt(from + (to - from) * k / steps); }); })(k, v); v = to; }
        function pass(ms) {
          T.at(ms, function () {
            var prev = you.previousElementSibling; if (!prev) return;
            var z = kz(box), a = you.getBoundingClientRect().top * z, b = prev.getBoundingClientRect().top * z;
            list.insertBefore(you, prev); ranks();
            A(you, [{ transform: 'translateY(' + (a - b) + 'px)' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'none' });
            A(prev, [{ transform: 'translateY(' + (b - a) + 'px)' }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'none' });
            sfx('tick');
          });
        }
        climb(31000, 1200, 10); pass(1650);
        climb(42500, 1900, 10); pass(2350);
        climb(52400, 2600, 12); pass(3150);
        T.at(3500, function () { you.classList.add('top'); stamp.style.opacity = '1'; A(stamp, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(2.2) rotate(-12deg)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1) rotate(-6deg)' }], { duration: 420, easing: 'cubic-bezier(.2,1.3,.4,1)' }); sfx('win'); haptic('success'); });
        T.at(5200, function () { A(stamp, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 }); });
        T.at(6600, function () { you.classList.remove('top'); A(board, [{ opacity: 1 }, { opacity: 0 }], { duration: 350 }); });
      }
    };
  };
  // Make it yours: a finger taps a game's star and the tile flies up into Favorites; then a whole section is
  // switched off and folds away
  SCENES.home = function (box) {
    var gs = pick(['yahtzee', 'farkle', 'blackjack', 'roulette'], 4);
    function mini(g) { return el('div', { class: 'tr-mt' }, [chip(g, 'sm'), el('b', { text: g.name }), el('span', { class: 'tr-star', html: icon('star') })]); }
    var favRow = el('div', { class: 'tr-favrow' }, [el('span', { class: 'tr-slotd' })]);
    var fav = el('div', { class: 'tr-sec fav' }, [el('div', { class: 'tr-sech' }, [el('span', { html: icon('star') }), el('b', { text: 'Favorites' })]), favRow]);
    var t1 = mini(gs[0]), t2 = mini(gs[1]);
    var sw = el('i', { class: 'tr-sw on' });
    var dice = el('div', { class: 'tr-sec' }, [el('div', { class: 'tr-sech' }, [el('span', { html: icon('dice') }), el('b', { text: 'Dice & Luck' })]), el('div', { class: 'tr-mrow' }, [t1, t2])]);
    var casRow = el('div', { class: 'tr-mrow' }, [mini(gs[2]), mini(gs[3])]);
    var cas = el('div', { class: 'tr-sec' }, [el('div', { class: 'tr-sech' }, [el('span', { html: icon('casino') }), el('b', { text: 'Casino' }), sw]), casRow]);
    var finger = el('i', { class: 'tr-finger' });
    box.appendChild(el('div', { class: 'tr-home' }, [fav, dice, cas])); box.appendChild(finger);
    function tapAt(node, T, ms) {
      T.at(ms, function () {
        var b = box.getBoundingClientRect(), r = node.getBoundingClientRect(), z = kz(box), x = (r.left + r.width / 2 - b.left) * z, y = (r.top + r.height / 2 - b.top) * z;
        A(finger, [{ transform: 'translate(' + (x + 60) + 'px,' + (y + 70) + 'px)', opacity: 0 }, { transform: 'translate(' + x + 'px,' + y + 'px)', opacity: 1, offset: .7 }, { transform: 'translate(' + x + 'px,' + y + 'px) scale(.8)', opacity: 1, offset: .85 }, { transform: 'translate(' + x + 'px,' + y + 'px)', opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'none' });
      });
    }
    return {
      len: 8200,
      still: function () { t1.classList.add('faved'); favRow.innerHTML = ''; favRow.appendChild(mini(gs[0])); sw.classList.remove('on'); cas.classList.add('off'); },
      run: function (T) {
        favRow.innerHTML = ''; favRow.appendChild(el('span', { class: 'tr-slotd' })); t1.classList.remove('faved'); sw.classList.add('on'); cas.classList.remove('off');
        [fav, dice, cas].forEach(function (s, i) { A(s, [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: i * 120, easing: 'cubic-bezier(.2,1.2,.4,1)' }); });
        var star = t1.querySelector('.tr-star');
        tapAt(star, T, 900);
        T.at(1550, function () {
          t1.classList.add('faved'); sfx('pop'); haptic('light');
          A(star, [{ transform: 'scale(1)' }, { transform: 'scale(1.9) rotate(72deg)' }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.2,1.4,.4,1)', fill: 'none' });
          var b = box.getBoundingClientRect(), r = t1.getBoundingClientRect(), d = favRow.getBoundingClientRect(), z = kz(box);
          var ghost = mini(gs[0]); ghost.classList.add('tr-ghost'); ghost.style.left = (r.left - b.left) * z + 'px'; ghost.style.top = (r.top - b.top) * z + 'px'; ghost.style.width = r.width * z + 'px'; box.appendChild(ghost);
          var dx = (d.left - r.left) * z, dy = (d.top - r.top) * z;
          A(ghost, [{ transform: 'none' }, { transform: 'translate(' + dx * .5 + 'px,' + (dy - 40) + 'px) scale(1.15) rotate(-6deg)', offset: .5 }, { transform: 'translate(' + dx + 'px,' + dy + 'px)' }], { duration: 750, easing: 'cubic-bezier(.4,0,.2,1)' });
          T.at(780, function () { ghost.remove(); favRow.innerHTML = ''; var f = mini(gs[0]); f.classList.add('faved'); favRow.appendChild(f); A(f, [{ transform: 'scale(1.15)' }, { transform: 'none' }], { duration: 300 }); A(fav, [{ boxShadow: '0 0 0 0 rgba(255,209,102,.8)' }, { boxShadow: '0 0 0 12px rgba(255,209,102,0)' }], { duration: 700, fill: 'none' }); sfx('good'); });
        });
        tapAt(sw, T, 3700);
        T.at(4350, function () { sw.classList.remove('on'); sfx('tick'); });
        T.at(4700, function () { cas.classList.add('off'); A(casRow, [{ opacity: 1, maxHeight: '80px' }, { opacity: 0, maxHeight: '0px' }], { duration: 500, easing: 'ease-in-out' }); });
        T.at(7800, function () { A(box.firstChild, [{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'none' }); });
      }
    };
  };
  // the end of the overview: the Game Night mark builds itself
  SCENES.mark = function (box) {
    var m = el('div', { class: 'tr-mark', html: MARK });
    box.appendChild(m);
    var arcs = m.querySelectorAll('path'), dots = m.querySelectorAll('circle');
    [].forEach.call(arcs, function (p) { p.style.transformBox = 'view-box'; p.style.transformOrigin = '50% 50%'; });
    [].forEach.call(dots, function (p) { p.style.transformBox = 'view-box'; p.style.transformOrigin = '50% 50%'; });
    return {
      len: 6000,
      run: function (T) {
        [].forEach.call(dots, function (c, k) { var dx = k === 0 || k === 3 ? -1 : 1, dy = k < 2 ? -1 : 1; A(c, [{ opacity: 0, transform: 'translate(' + dx * 160 + 'px,' + dy * 160 + 'px) scale(.4)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: k * 90, easing: 'cubic-bezier(.3,1.3,.4,1)' }); });
        [].forEach.call(arcs, function (p, k) { A(p, [{ opacity: 0, transform: 'rotate(-' + (220 + k * 30) + 'deg) scale(1.8)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: 200 + k * 90, easing: 'cubic-bezier(.22,.8,.3,1)' }); });
        T.at(1300, function () { A(m, [{ transform: 'none' }, { transform: 'scale(1.08) rotate(-4deg)' }, { transform: 'none' }], { duration: 500, fill: 'none' }); });
        T.at(2000, function () { A(m, [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 3600, easing: 'cubic-bezier(.6,0,.4,1)', fill: 'none' }); });
      }
    };
  };

  // ── Styles ──
  var CSS = '' +
'.tr-ov{position:fixed;inset:0;z-index:90;display:flex;flex-direction:column;color:var(--text);background:radial-gradient(120% 80% at 50% 0%,#2c2160 0%,#17123a 55%,#0d0a22 100%);opacity:0;transition:opacity .35s ease;overflow:hidden;}' +
'.tr-ov.show{opacity:1;}' +
'.tr-ov .tr-x{position:absolute;top:calc(var(--safe-t,0px) + 10px);right:calc(var(--safe-r,0px) + 12px);z-index:5;width:44px;height:44px;border-radius:50%;border:0;background:var(--w08,rgba(255,255,255,.08));color:var(--text);display:grid;place-items:center;}' +
'.tr-ov .tr-x .ico{width:20px;height:20px;}' +
'.tr-float{position:absolute;inset:0;pointer-events:none;opacity:.1;}' +
'.tr-float .tr-gi{position:absolute;animation:trDrift var(--d,18s) linear infinite;}' +
'@keyframes trDrift{from{transform:translateY(110vh) rotate(0)}to{transform:translateY(-20vh) rotate(260deg)}}' +
'.tr-track{flex:1;min-height:0;display:flex;transition:transform .5s cubic-bezier(.25,.9,.3,1);touch-action:pan-y;}' +
'.tr-slide{flex:none;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(10px,3vh,26px);padding:calc(var(--safe-t,0px) + 60px) 20px 10px;text-align:center;}' +
'.tr-copy{max-width:440px;display:flex;flex-direction:column;gap:8px;align-items:center;}' +
'.tr-kick{font-size:.74rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--yellow);}' +
'.tr-copy h2{font-family:var(--display);font-weight:400;font-size:clamp(1.9rem,7.5vw,2.6rem);line-height:1.02;}' +
'.tr-copy p{color:var(--text-2);font-weight:700;font-size:1rem;line-height:1.4;text-wrap:pretty;}' +
'.tr-slide .tr-copy > *{opacity:0;transform:translateY(14px);transition:opacity .45s ease,transform .5s cubic-bezier(.2,1.2,.4,1);}' +
'.tr-slide.on .tr-copy > *{opacity:1;transform:none;}' +
'.tr-slide.on .tr-copy > :nth-child(2){transition-delay:.08s;} .tr-slide.on .tr-copy > :nth-child(3){transition-delay:.16s;} .tr-slide.on .tr-copy > :nth-child(4){transition-delay:.24s;}' +
'.tr-foot{display:flex;align-items:center;gap:14px;padding:12px 20px calc(var(--safe-b,0px) + 18px);max-width:520px;width:100%;margin:0 auto;}' +
'.tr-dots{display:flex;gap:7px;flex:1;}' +
'.tr-dots i{width:8px;height:8px;border-radius:4px;background:var(--w1,rgba(255,255,255,.18));transition:width .3s,background .3s;cursor:pointer;}' +
'.tr-dots i.on{width:26px;background:var(--yellow);}' +
'.tr-next{min-width:132px;min-height:50px;gap:8px;}' +
'.tr-next .ico{width:18px;height:18px;}' +
'.tr-cta{display:flex;flex-direction:column;gap:10px;width:100%;max-width:340px;}' +
'.tr-cta .btn{min-height:52px;gap:10px;}' +
'.tr-cta .gbtn{background:#fff;color:#1f1f1f;box-shadow:0 2px 0 rgba(0,0,0,.25),inset 0 0 0 1px #dadce0;}' +
'.tr-cta .gbtn svg,.tr-cta .ico{width:20px;height:20px;}' +
/* stage */
'.tr-stage{position:relative;width:min(340px,100%);height:clamp(220px,36vh,290px);flex:none;}' +
'.tr-gi{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:12px;background:var(--c);box-shadow:inset 0 -3px 0 rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.3);flex:none;}' +
'.tr-gi svg{width:78%;height:78%;}' +
'.tr-gi.big{width:100%;height:auto;aspect-ratio:1;border-radius:16px;}' +
'.tr-gi.sm{width:30px;height:30px;border-radius:9px;}' +
'.tr-gi.xs{width:20px;height:20px;border-radius:6px;box-shadow:none;}' +
'.tr-grid{position:absolute;left:50%;top:6px;transform:translateX(-50%);width:min(250px,80%);display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}' +
'.tr-count{position:absolute;left:0;right:0;margin:0 auto;width:max-content;bottom:0;display:flex;align-items:baseline;gap:8px;padding:6px 16px;border-radius:999px;background:rgba(0,0,0,.35);box-shadow:inset 0 0 0 1px var(--w1,rgba(255,255,255,.12));white-space:nowrap;}' +
'.tr-count b{font-family:var(--display);font-weight:400;font-size:1.9rem;line-height:1;color:var(--yellow);font-variant-numeric:tabular-nums;min-width:2.2ch;text-align:right;}' +
'.tr-count span{font-weight:900;color:var(--text-2);}' +
'.tr-stage.c-games{height:clamp(240px,40vh,300px);}' +
/* modes */
'.tr-modes{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:10px;}' +
'.tr-mode{flex:1;max-width:108px;display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 6px 14px;border-radius:20px;background:rgba(0,0,0,.28);box-shadow:inset 0 0 0 1.5px var(--w08,rgba(255,255,255,.08));transition:transform .4s cubic-bezier(.2,1.3,.4,1),box-shadow .3s,background .3s;}' +
'.tr-mode b{font-size:.84rem;font-weight:900;color:var(--text-2);text-align:center;line-height:1.15;}' +
'.tr-mode.on{transform:translateY(-10px) scale(1.07);background:rgba(255,209,102,.12);box-shadow:inset 0 0 0 2px var(--yellow),0 14px 30px rgba(0,0,0,.4);}' +
'.tr-mode.on b{color:var(--text);}' +
'.tr-mode-art{height:64px;display:flex;align-items:center;justify-content:center;gap:4px;position:relative;}' +
'.tr-vs{font-size:.66rem;font-weight:900;color:var(--text-3);}' +
'.tr-bot{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#3a3466;color:#cfd2ff;}' +
'.tr-bot .ico{width:18px;height:18px;}' +
'.tr-mini-phone{width:16px;height:28px;border-radius:4px;background:#0b0920;box-shadow:inset 0 0 0 2px #9a95c8;flex:none;}' +
'.tr-mode-art .tr-mini-phone + .tr-wave{width:22px;height:3px;border-radius:2px;background:var(--green);transform-origin:left;}' +
'.tr-mode-art .avatar.sm{width:26px;height:26px;font-size:.75rem;}' +
/* devices */
'.tr-dev{position:absolute;border-radius:16px;background:#0b0920;box-shadow:inset 0 0 0 3px #4a4478,0 10px 26px rgba(0,0,0,.4);padding:9px;}' +
'.tr-dev-scr{position:relative;width:100%;height:100%;border-radius:9px;background:linear-gradient(180deg,#221b4a,#16123a);overflow:hidden;display:flex;flex-direction:column;gap:5px;padding:6px;}' +
'.tr-dev.ph{width:96px;height:176px;}' +
'.tr-stage .tr-dev.ph{left:4%;top:50%;margin-top:-88px;}' +
'.tr-dev.tb{right:2%;top:50%;width:178px;height:136px;margin-top:-68px;}' +
'.tr-cloud{position:absolute;left:0;right:0;margin:0 auto;top:6px;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.08);color:#9ecbff;}' +
'.tr-cloud .ico{width:26px;height:26px;}' +
'.tr-spark{position:absolute;left:0;top:0;width:18px;height:18px;margin:-9px;border-radius:50%;background:radial-gradient(circle,#fff 0 30%,#ffd166 50%,rgba(255,209,102,0) 72%);box-shadow:0 0 18px #ffd166;opacity:0;pointer-events:none;}' +
'.tr-srow{display:flex;align-items:center;gap:6px;padding:5px;border-radius:9px;background:rgba(255,255,255,.07);font-size:.68rem;font-weight:800;min-width:0;}' +
'.tr-srow .grow{flex:1;min-width:0;overflow-wrap:anywhere;line-height:1.1;}' +
'.tr-srow b{font-family:var(--display);font-weight:400;font-size:.95rem;color:var(--yellow);}' +
'.tr-srow.new{box-shadow:inset 0 0 0 1.5px var(--yellow);}' +
/* sign-in */
'.tr-ways{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:8px;}' +
'.tr-or{font-size:.7rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--text-3);}' +
'.tr-way{flex:1;max-width:150px;display:flex;flex-direction:column;align-items:center;gap:9px;padding:14px 10px;border-radius:20px;background:rgba(0,0,0,.28);box-shadow:inset 0 0 0 1.5px var(--w08,rgba(255,255,255,.08));transition:box-shadow .3s;}' +
'.tr-way.done{box-shadow:inset 0 0 0 2px var(--yellow);}' +
'.tr-way.g.done{box-shadow:inset 0 0 0 2px var(--green);}' +
'.tr-way > small{font-size:.68rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:var(--text-3);}' +
'.tr-slots{display:flex;gap:5px;}' +
'.tr-slot{width:24px;height:30px;border-radius:8px;display:grid;place-items:center;background:rgba(0,0,0,.35);box-shadow:inset 0 0 0 1.5px var(--w1,rgba(255,255,255,.14));font-family:var(--display);font-size:1.1rem;}' +
'.tr-slot.on{box-shadow:inset 0 0 0 1.5px var(--yellow);}' +
'.tr-gwrap{position:relative;height:30px;display:flex;align-items:center;}' +
'.tr-gbtn{width:46px;height:30px;border-radius:999px;background:#fff;display:grid;place-items:center;box-shadow:0 2px 0 rgba(0,0,0,.3);}' +
'.tr-gbtn svg{width:18px;height:18px;}' +
'.tr-ok{position:absolute;right:-12px;top:-8px;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:var(--green);color:#fff;transform:scale(0);transition:transform .4s cubic-bezier(.2,1.5,.4,1);}' +
'.tr-ok.on{transform:scale(1);}' +
'.tr-ok .ico{width:13px;height:13px;}' +
'.tr-li{display:flex;align-items:flex-start;gap:6px;width:100%;font-size:.72rem;font-weight:800;color:var(--text-2);text-align:left;line-height:1.2;}' +
'.tr-li > span:first-child{flex:none;color:var(--text-3);}' +
'.tr-li .ico{width:14px;height:14px;}' +
/* link */
'.tr-side{position:absolute;top:0;display:flex;flex-direction:column;align-items:center;gap:4px;width:110px;}' +
'.tr-side:first-child{left:2%;} .tr-side:nth-child(2){right:2%;}' +
'.tr-side > b{font-size:.8rem;}' +
'.tr-side .avatar.lg{width:46px;height:46px;font-size:1.2rem;}' +
'.tr-side .tr-dev.ph{position:relative;left:auto;top:auto;margin:0;width:92px;height:150px;}' +
'.tr-qr{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;padding:5px;margin:16px auto 0;width:66px;border-radius:6px;background:#fff;}' +
'.tr-qr i{aspect-ratio:1;background:transparent;} .tr-qr i.on{background:#151231;}' +
'.tr-scan{position:absolute;left:8px;right:8px;top:18px;height:3px;border-radius:2px;background:#4ade80;box-shadow:0 0 12px #4ade80;}' +
'.tr-link{position:absolute;left:50%;top:76px;transform:translate(-50%,-50%) scale(0);width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:var(--yellow);color:#2b1a00;box-shadow:0 6px 16px rgba(0,0,0,.4);}' +
'.tr-link.on{transform:translate(-50%,-50%) scale(1);}' +
'.tr-link .ico{width:24px;height:24px;}' +
'.tr-burst{position:absolute;left:50%;top:76px;width:60px;height:60px;border-radius:50%;box-shadow:0 0 0 4px var(--yellow);opacity:0;pointer-events:none;}' +
'.tr-res{position:absolute;left:50%;top:132px;transform:translate(-50%,0);display:flex;align-items:center;gap:6px;padding:6px 10px 6px 6px;border-radius:12px;background:#fff;color:#1f1b3a;font-weight:900;font-size:.8rem;box-shadow:0 8px 20px rgba(0,0,0,.4);white-space:nowrap;opacity:0;}' +
'.tr-hist{display:flex;flex-direction:column;gap:4px;margin-top:auto;}' +
'.tr-hrow{display:flex;align-items:center;gap:5px;padding:4px;border-radius:7px;background:rgba(255,255,255,.08);font-size:.62rem;font-weight:800;}' +
/* scores */
'.tr-board{position:absolute;left:0;right:0;margin:0 auto;top:0;width:min(290px,96%);padding:10px;border-radius:18px;background:#07060f;box-shadow:inset 0 0 0 2px #ff4fd8,0 0 22px rgba(255,79,216,.35),0 12px 30px rgba(0,0,0,.5);}' +
'.tr-bh{display:flex;align-items:center;gap:8px;padding:2px 4px 8px;}' +
'.tr-bh b{font-family:var(--display);font-weight:400;font-size:1.15rem;letter-spacing:.04em;color:#7ff6ff;text-shadow:0 0 10px rgba(127,246,255,.6);flex:1;text-align:left;}' +
'.tr-bh-k{color:var(--yellow);} .tr-bh-k .ico{width:20px;height:20px;}' +
'.tr-blist{display:flex;flex-direction:column;gap:5px;}' +
'.tr-brow{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:10px;background:rgba(255,255,255,.05);font-weight:900;}' +
'.tr-brow .avatar.sm{width:24px;height:24px;font-size:.7rem;}' +
'.tr-rk{width:16px;color:var(--text-3);font-variant-numeric:tabular-nums;}' +
'.tr-ini{width:38px;text-align:left;letter-spacing:.12em;color:#fff;font-family:var(--display);font-weight:400;}' +
'.tr-lk{width:18px;color:#7ff6ff;} .tr-lk .ico{width:14px;height:14px;} .tr-lk.none{visibility:hidden;}' +
'.tr-sc{margin-left:auto;font-family:var(--display);font-weight:400;font-size:1.05rem;font-variant-numeric:tabular-nums;color:#fff;}' +
'.tr-brow.me{background:rgba(255,209,102,.14);box-shadow:inset 0 0 0 1.5px var(--yellow);}' +
'.tr-brow.me .tr-ini,.tr-brow.me .tr-sc{color:var(--yellow);}' +
'.tr-brow.top{animation:trGlow .8s ease-in-out 3;}' +
'@keyframes trGlow{50%{box-shadow:inset 0 0 0 1.5px var(--yellow),0 0 22px rgba(255,209,102,.7);}}' +
'.tr-stamp{position:absolute;left:50%;top:58%;padding:5px 14px;border:3px solid var(--yellow);border-radius:10px;font-family:var(--display);font-size:1.35rem;color:var(--yellow);background:rgba(7,6,15,.75);white-space:nowrap;transform:translate(-50%,-50%) rotate(-6deg);opacity:0;pointer-events:none;text-shadow:0 0 12px rgba(255,209,102,.6);}' +
/* home */
'.tr-home{position:absolute;inset:0;display:flex;flex-direction:column;gap:8px;}' +
'.tr-sec{padding:8px;border-radius:16px;background:rgba(0,0,0,.25);transition:opacity .4s;}' +
'.tr-sec.fav{background:rgba(255,209,102,.08);box-shadow:inset 0 0 0 1.5px rgba(255,209,102,.4);}' +
'.tr-sech{display:flex;align-items:center;gap:6px;font-size:.8rem;margin-bottom:6px;}' +
'.tr-sech .ico{width:15px;height:15px;}' +
'.tr-sec.fav .tr-sech{color:var(--yellow);} .tr-sec.fav .tr-sech .ico{fill:var(--yellow);}' +
'.tr-sec.off .tr-sech{color:var(--text-3);}' +
'.tr-sech .tr-sw{margin-left:auto;}' +
'.tr-sw{position:relative;width:34px;height:20px;border-radius:10px;background:var(--w1,rgba(255,255,255,.18));transition:background .25s;flex:none;}' +
'.tr-sw::after{content:"";position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .25s cubic-bezier(.2,1.4,.4,1);}' +
'.tr-sw.on{background:var(--green);} .tr-sw.on::after{transform:translateX(14px);}' +
'.tr-mrow,.tr-favrow{display:grid;grid-template-columns:1fr 1fr;gap:6px;overflow:hidden;}' +
'.tr-favrow{min-height:42px;}' +
'.tr-slotd{border-radius:10px;border:1.5px dashed rgba(255,209,102,.4);min-height:40px;}' +
'.tr-mt{display:flex;align-items:center;gap:6px;padding:5px;border-radius:11px;background:rgba(255,255,255,.07);min-width:0;}' +
'.tr-mt b{flex:1;min-width:0;font-family:var(--display);font-weight:400;font-size:.8rem;line-height:1.05;overflow-wrap:anywhere;}' +
'.tr-star{color:var(--text-3);flex:none;} .tr-star .ico{width:15px;height:15px;}' +
'.tr-mt.faved .tr-star{color:var(--yellow);} .tr-mt.faved .tr-star .ico{fill:var(--yellow);}' +
'.tr-ghost{position:absolute;z-index:3;box-shadow:0 10px 24px rgba(0,0,0,.5);background:#2b2357;}' +
'.tr-finger{position:absolute;left:0;top:0;width:30px;height:30px;margin:-15px;border-radius:50%;background:rgba(255,255,255,.85);box-shadow:0 0 0 6px rgba(255,255,255,.25);opacity:0;pointer-events:none;z-index:4;}' +
/* mark */
'.tr-mark{position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px;}' +
'.tr-mark svg{width:100%;height:100%;overflow:visible;}' +
/* sideways phone: the scene on the left, the words on the right */
'@media (orientation:landscape) and (max-height:520px){' +
'  .tr-slide{flex-direction:row;gap:28px;padding:calc(var(--safe-t,0px) + 40px) calc(var(--safe-r,0px) + 30px) 6px calc(var(--safe-l,0px) + 30px);text-align:left;}' +
'  .tr-slide .tr-copy{align-items:flex-start;} .tr-stage{height:min(240px,62vh);} .tr-copy h2{font-size:1.9rem;}' +
'  .tr-foot{padding-bottom:calc(var(--safe-b,0px) + 10px);}}' +
/* the guide */
'.tr-guide{background:var(--bg,#14102b);}' +
'.tr-gh{display:flex;align-items:center;gap:8px;padding:calc(var(--safe-t,0px) + 10px) 14px 8px;}' +
'.tr-gh h1{flex:1;font-family:var(--display);font-weight:400;font-size:1.4rem;line-height:1.1;}' +
'.tr-gh .icon-btn{width:42px;height:42px;border-radius:50%;border:0;background:var(--w05,rgba(255,255,255,.06));color:var(--text);display:grid;place-items:center;}' +
'.tr-gh .icon-btn .ico{width:20px;height:20px;}' +
'.tr-chips{display:flex;gap:8px;overflow-x:auto;padding:4px 14px 10px;scrollbar-width:none;}' +
'.tr-chips::-webkit-scrollbar{display:none;}' +
'.tr-chips button{flex:none;display:flex;align-items:center;gap:6px;padding:8px 13px;border:0;border-radius:999px;background:var(--w05,rgba(255,255,255,.06));color:var(--text-2);font-weight:900;font-size:.85rem;white-space:nowrap;}' +
'.tr-chips button .ico{width:16px;height:16px;}' +
'.tr-chips button.on{background:var(--tc);color:#1a1433;}' +
'.tr-gbody{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 16px calc(var(--safe-b,0px) + 24px);}' +
'.tr-gwrap2{max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:14px;}' +
'.tr-ghero{position:relative;border-radius:24px;padding:14px 10px 50px;display:flex;flex-direction:column;align-items:center;background:radial-gradient(120% 90% at 50% 0%,color-mix(in srgb,var(--tc) 30%,#1d1745) 0%,#151033 70%);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--tc) 45%,transparent);overflow:hidden;}' +
'.tr-ghero .tr-stage{height:250px;}' +
'.tr-replay{position:absolute;right:10px;bottom:10px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(0,0,0,.35);color:var(--text-2);display:grid;place-items:center;}' +
'.tr-replay .ico{width:16px;height:16px;}' +
'.tr-lead{font-size:1.05rem;font-weight:800;line-height:1.4;color:var(--text);text-wrap:pretty;}' +
'.tr-part{border-radius:20px;padding:14px 14px 10px;background:var(--w05,rgba(255,255,255,.05));opacity:0;transform:translateY(18px);transition:opacity .5s ease,transform .55s cubic-bezier(.2,1.1,.4,1);}' +
'.tr-part.in{opacity:1;transform:none;}' +
'.tr-part h3{display:flex;align-items:center;gap:10px;font-size:1.05rem;margin-bottom:8px;}' +
'.tr-part h3 .ic{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb,var(--tc) 25%,transparent);color:var(--tc);flex:none;}' +
'.tr-part h3 .ic svg{width:19px;height:19px;}' +
'.tr-steps{display:flex;flex-direction:column;gap:2px;}' +
'.tr-step{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-top:1px solid var(--w05,rgba(255,255,255,.06));font-weight:700;color:var(--text-2);line-height:1.4;font-size:.94rem;opacity:0;transform:translateX(-10px);transition:opacity .4s ease,transform .45s cubic-bezier(.2,1.2,.4,1);}' +
'.tr-step:first-child{border-top:0;}' +
'.tr-part.in .tr-step{opacity:1;transform:none;}' +
'.tr-step .n{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--w08,rgba(255,255,255,.08));color:var(--text);font-size:.78rem;font-weight:900;margin-top:1px;}' +
'.tr-step .n .ico{width:13px;height:13px;}' +
'.tr-step b{color:var(--text);}' +
'.tr-try{display:flex;flex-wrap:wrap;gap:8px;}' +
'.tr-try .btn{flex:1 1 180px;min-height:48px;gap:8px;}' +
'.tr-try .btn .ico,.tr-try .btn svg{width:18px;height:18px;}' +
'.tr-hub{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;}' +
'.tr-card{position:relative;display:flex;align-items:center;gap:14px;padding:16px;border:0;border-radius:22px;text-align:left;color:var(--text);background:linear-gradient(135deg,color-mix(in srgb,var(--tc) 26%,#1d1745),#18133a);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--tc) 40%,transparent);overflow:hidden;opacity:0;transform:translateY(20px) scale(.97);transition:opacity .45s,transform .5s cubic-bezier(.2,1.2,.4,1);}' +
'.tr-card.in{opacity:1;transform:none;}' +
'.tr-card:active{transform:scale(.98);}' +
'.tr-card .big{flex:none;width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:var(--tc);color:#1a1433;box-shadow:0 6px 16px rgba(0,0,0,.35);}' +
'.tr-card .big svg{width:30px;height:30px;}' +
'.tr-card .grow{flex:1;min-width:0;}' +
'.tr-card b{display:block;font-family:var(--display);font-weight:400;font-size:1.25rem;line-height:1.1;}' +
'.tr-card small{display:block;margin-top:3px;font-weight:700;font-size:.84rem;color:var(--text-2);line-height:1.3;}' +
'.tr-card .chev{flex:none;color:var(--text-3);} .tr-card .chev .ico{width:20px;height:20px;}' +
'.tr-card.ov{--tc:#ffd166;}' +
'.tr-card .big.g{background:#fff;}' +
'@media (orientation:landscape) and (min-width:820px){' +
'  .tr-gwrap2.topic{max-width:1100px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);align-items:start;column-gap:22px;}' +
'  .tr-gwrap2.topic .tr-ghero{position:sticky;top:0;grid-row:span 30;}' +
'  .tr-gwrap2.topic .tr-ghero .tr-stage{height:300px;}}' +
'@media (min-width:700px) and (min-height:700px){.tr-slide .tr-stage{zoom:1.45;} .tr-copy{max-width:520px;} .tr-copy p{font-size:1.1rem;}}' +
'@media (min-width:700px) and (min-height:600px){.tr-ghero .tr-stage{zoom:1.3;}}' +
'@media (prefers-reduced-motion:reduce){.tr-float{display:none;} .tr-part,.tr-step,.tr-card,.tr-slide .tr-copy > *{opacity:1;transform:none;transition:none;}}';
  var styled = false;
  function style() { if (styled) return; styled = true; doc.head.appendChild(el('style', { text: CSS })); }

  // gentle background: game icons drifting up behind everything
  function floaters() {
    var f = el('div', { class: 'tr-float' }), gs = pick([], 14);
    gs.forEach(function (g, i) { var t = chip(g); t.style.left = ((i * 37) % 92) + '%'; t.style.setProperty('--d', (14 + (i * 7) % 12) + 's'); t.style.animationDelay = -((i * 2.3) % 18) + 's'; f.appendChild(t); });
    return f;
  }
  function overlay(cls, label) {
    style();
    var ov = el('div', { class: 'tr-ov' + (cls ? ' ' + cls : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': label });
    doc.body.appendChild(ov);
    var prevOverflow = doc.body.style.overflow; doc.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { requestAnimationFrame(function () { ov.classList.add('show'); }); });
    ov._close = function () { ov.classList.remove('show'); doc.body.style.overflow = prevOverflow; setTimeout(function () { ov.remove(); }, 360); };
    return ov;
  }

  // ── The overview ──
  var N_GAMES = ALL.length;
  var SLIDES = [
    { s: 'games', k: 'Welcome to Game Night', h: 'Every game night, in one app', p: N_GAMES + ' games: cards, board games, dice, puzzles, party games, casino and arcade. Rules built in, pieces and dice that feel real.' },
    { s: 'together', k: 'Play your way', h: 'Solo, with family, or online', p: 'Take on the computer, pass the phone around the table, or play friends on their own phones, even over days.' },
    { s: 'sync', k: 'Sign in', h: 'Your games follow you', p: 'Scores, history and games in progress go with you to every phone and tablet you sign in on.' },
    { s: 'signin', k: 'Two ways in', h: 'A PIN or your Google account', p: 'A PIN is four digits, quick on a shared family iPad. Google has nothing to remember and only you can get in. Or just look around as a guest.' },
    { s: 'link', k: 'Friends & family', h: 'Link the people you play with', p: 'Scan each other’s code once. Their avatars come along, and games you play together land in both of your histories.' },
    { s: 'scores', k: 'Bragging rights', h: 'Your friends are on your scoreboards', p: 'Linked players’ best arcade scores show up on yours. Beat them and everyone knows.' },
    { s: 'home', k: 'Make it yours', h: 'Star your favorites, hide the rest', p: 'Favorites sit at the top. Switch off the games and sections you never play.' },
    { s: 'mark', k: 'Ready?', h: 'Let’s play', p: '', last: true }
  ];
  function intro(opts) {
    opts = opts || {};
    var ov = overlay('', 'Welcome to Game Night'), cur = 0, stages = [];
    ov.appendChild(floaters());
    var x = el('button', { type: 'button', class: 'tr-x', 'aria-label': 'Close', html: icon('close') });
    var track = el('div', { class: 'tr-track' }), dots = el('div', { class: 'tr-dots' }), next = el('button', { type: 'button', class: 'btn btn-primary tr-next' });
    SLIDES.forEach(function (sl, i) {
      var st = stage(SCENES[sl.s], 'c-' + sl.s); stages.push(st);
      var copy = el('div', { class: 'tr-copy' }, [el('div', { class: 'tr-kick', text: sl.k }), el('h2', { text: sl.h }), sl.p ? el('p', { text: sl.p }) : null]);
      if (sl.last) copy.appendChild(finale());
      track.appendChild(el('div', { class: 'tr-slide', 'aria-hidden': 'true' }, [st.el, copy]));
      dots.appendChild(el('i', { onclick: function () { go(i); } }));
    });
    function finale() {
      var box = el('div', { class: 'tr-cta' });
      function b(cls, html, fn) { box.appendChild(el('button', { type: 'button', class: 'btn ' + cls, html: html, onclick: function () { sfx('tap'); close(); setTimeout(fn, 200); } })); }
      if (opts.app) {
        b('btn-primary', icon('book') + '<span>See everything you can do</span>', function () { guide(null, opts); });
        b('btn-ghost', '<span>Start playing</span>', function () {});
      } else {
        if (opts.onGoogle) b('gbtn', G_LOGO + '<span>Sign in with Google</span>', opts.onGoogle);
        if (opts.onPin) b('btn-soft', icon('key') + '<span>Use a PIN</span>', opts.onPin);
        if (opts.onGuest) b('btn-ghost', '<span>Look around as a guest</span>', opts.onGuest);
      }
      return box;
    }
    ov.appendChild(x); ov.appendChild(track);
    ov.appendChild(el('div', { class: 'tr-foot' }, [dots, next]));
    function go(i) {
      i = Math.max(0, Math.min(SLIDES.length - 1, i));
      if (i !== cur) { stages[cur].stop(); sfx('whoosh'); }
      cur = i;
      track.style.transform = 'translateX(' + (-100 * i) + '%)';
      [].forEach.call(track.children, function (s, k) { s.classList.toggle('on', k === i); s.setAttribute('aria-hidden', String(k !== i)); });
      [].forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i); });
      var last = i === SLIDES.length - 1;
      next.hidden = last;
      next.innerHTML = '<span>' + (i === 0 ? 'Show me' : 'Next') + '</span>' + icon('right');
      setTimeout(function () { if (cur === i) stages[i].play(); }, 260);
    }
    function close() { stages.forEach(function (s) { s.stop(); }); doc.removeEventListener('keydown', onKey); ov._close(); try { localStorage.setItem('gn_toured', String(Date.now())); } catch (e) {} if (opts.onClose) opts.onClose(); }
    function onKey(e) { if (e.key === 'ArrowRight') go(cur + 1); else if (e.key === 'ArrowLeft') go(cur - 1); else if (e.key === 'Escape') close(); }
    doc.addEventListener('keydown', onKey);
    next.onclick = function () { sfx('tap'); go(cur + 1); };
    x.onclick = function () { sfx('tap'); close(); };
    // swipe between slides
    var sx = null, sy = 0, dx = 0;
    track.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; sx = e.clientX; sy = e.clientY; dx = 0; track.style.transition = 'none'; });
    track.addEventListener('pointermove', function (e) { if (sx == null) return; dx = e.clientX - sx; if (Math.abs(dx) > Math.abs(e.clientY - sy)) track.style.transform = 'translateX(calc(' + (-100 * cur) + '% + ' + dx + 'px))'; });
    function end() { if (sx == null) return; track.style.transition = ''; sx = null; if (dx < -50) go(cur + 1); else if (dx > 50) go(cur - 1); else go(cur); }
    track.addEventListener('pointerup', end); track.addEventListener('pointercancel', end); track.addEventListener('pointerleave', end);
    go(0);
    return { close: close };
  }

  // ── The guide ──
  var TOPICS = [
    { id: 'signin', ic: 'key', tc: '#ffd166', t: 'Signing in', d: 'A PIN or Google, what comes with you, and moving over' },
    { id: 'together', ic: 'users', tc: '#4fd1c5', t: 'Playing together', d: 'Solo, against the computer, pass and play, online' },
    { id: 'link', ic: 'link', tc: '#ff7a8a', t: 'Friends & family', d: 'Linking, shared history, and who played what' },
    { id: 'scores', ic: 'trophy', tc: '#8b7cff', t: 'Linked high scores', d: 'Your initials, friends on your boards, the cabinet' },
    { id: 'home', ic: 'star', tc: '#7ee081', t: 'Favorites & hiding', d: 'Your games up top, the rest out of the way' }
  ];
  function signedIn() { return !!(window.FGHSync && FGHSync.isPin && FGHSync.isPin()); }
  function isGoogle() { return !!(window.FGHSync && FGHSync.isGoogle && FGHSync.isGoogle()); }
  // each topic: a lead, then parts (a title, an icon, its steps) and buttons that open the real thing
  function content(id, opts) {
    var acts = (opts && opts.actions) || {}, pin = window.FGHSync && FGHSync.pin ? FGHSync.pin() : null;
    var X = {
      signin: {
        lead: 'Signing in keeps your games on every phone and tablet you use. There are two ways to do it, and you can always play as a guest.',
        parts: [
          ['cloud', 'What comes with you', [
            'High scores and the history of every game you’ve played.',
            '<b>Games in progress.</b> Stop a game on your phone and pick it up on the iPad, right where you left it.',
            'Your favorites, your home screen, game settings and Lorcana decks.',
            'Linked players, your avatar and your arcade initials.']],
          ['key', 'A PIN', [
            '<b>Four digits</b> you pick, or tap <b>Assign me a random PIN</b> for one nobody has.',
            'Quick on a shared family iPad: tap it in and you’re you.',
            'Anyone who knows your PIN can open your account, so the app turns down easy ones like 1234.',
            'To change it, tap your avatar, then <b>Change PIN</b>. Other devices on the old PIN sign out and ask for the new one.']],
          ['google', 'Google', [
            'Tap <b>Sign in with Google</b> and pick your account. Nothing to remember.',
            'Only you can get in, because Google checks it’s you.',
            'Everyone needs their own Google account. Kids can keep using a PIN.']],
          ['swap', 'Moving a PIN account to Google', [
            'Tap your avatar, then <b>Move to Google sign-in</b>.',
            'Everything comes along: scores, history, saved games, settings, links and online tables.',
            'Your other phones and tablets ask you to sign in with Google the next time they open.',
            'Your old PIN is given up. After 30 days someone else can use it.',
            'A child’s account that a parent looks after stays on its PIN.']],
          ['user', 'Playing as a guest', [
            'Everything stays on this one device and nothing goes to the cloud.',
            'A guest’s games stay separate from any account you sign in to later.']],
          ['logout', 'Signing out', [
            'Tap your avatar, then <b>Sign out</b>. Your games are packed away on the device and come back when you sign in again.']]
        ],
        tries: signedIn() ? (isGoogle() ? [] : [
          acts.move ? ['google', 'Move to Google sign-in', acts.move] : null,
          acts.changePin ? ['key', 'Change PIN', acts.changePin] : null]) : [['key', 'Sign in', function () { location.href = '/gate.html'; }]]
      },
      together: {
        lead: 'Every game starts the same way: one list of seats. Fill them with people, robots or both.',
        parts: [
          ['user', 'Just you', ['One seat. Puzzles, solitaire, arcade games and daily challenges.']],
          ['bot', 'Against the computer', [
            'Flip the robot switch on the other seats. Each robot gets its own name.',
            'Set how good the computer is in the game’s options.']],
          ['phone', 'Pass and play', [
            'Add everyone at the table, then pass the phone around.',
            'In games with hidden cards the screen covers your hand before the next person takes over.']],
          ['globe', 'Online', [
            'Tap <b>Play online</b> beside the start button. Friends join on their own phones with the four-letter table code.',
            'Linked friends see your open table right on their home screen, with your avatar.',
            'Turn-based games can take days. The home screen shows <b>Your turn</b> under Keep playing when it’s your move.']],
          ['history', 'Keep playing', [
            'A game you leave partway waits at the top of the home screen, on all of your devices.',
            'Swipe it away when you’re done with it.']]
        ],
        tries: window.Kit && Kit.managePlayers ? [['users', 'Frequent players', function () { Kit.managePlayers(); }]] : []
      },
      link: {
        lead: 'Link the people you play with, and the app knows who’s who on every phone.',
        parts: [
          ['sparkle', 'What linking does', [
            'Their avatar comes from their own phone, so their picture is always right.',
            'Games you play together go into both of your histories.',
            'You see each other’s best arcade scores.',
            'When a linked friend opens an online table, it shows up for you with their avatar.']],
          ['link', 'How to link someone', [
            '<b>On their phone:</b> tap their avatar, then <b>Share my profile</b>. They get a QR code and a six-letter code.',
            '<b>On yours:</b> open <b>Frequent players</b> from your avatar or any game’s menu, then tap the link button next to their name.',
            'Scan their QR code, or type in the code.',
            'Their phone asks them to accept. Once they do, it works both ways.']],
          ['inbox', 'Games you play together', [
            'Play on one phone with them in a seat and the game is copied into their history too.',
            'Turn on <b>Ask before adding games</b> to look each one over first.',
            'Tap <b>Not me</b> to send one back if it wasn’t you.']],
          ['shield', 'Family', [
            'A parent can look after a child’s account from <b>Family</b>: a game timer, and sections or games switched off.']],
          ['minus', 'Unlinking', ['Under <b>Linked players</b>, tap the person and choose <b>Unlink</b>.']]
        ],
        tries: signedIn() ? [
          window.Kit && Kit.links ? ['link', 'Share my profile', function () { Kit.links.profile(); }] : null,
          window.Kit && Kit.managePlayers ? ['users', 'Frequent players', function () { Kit.managePlayers(); }] : null] : [['key', 'Sign in to link players', function () { location.href = '/gate.html'; }]]
      },
      scores: {
        lead: 'Every arcade and puzzle game keeps a top 50. Link your people and their best scores land on your boards too.',
        parts: [
          ['gamepad', 'Your initials', [
            'Three letters, like an arcade cabinet.',
            'Set them under your avatar, <b>Arcade initials</b>. They’re filled in for you whenever you make a board.']],
          ['link', 'Friends on your boards', [
            'Linked players’ best scores show up on your boards, with their avatar beside them.',
            'Pass one and you move up past them. They see it on their boards too.']],
          ['trophy', 'The High Scores cabinet', [
            '<b>High Scores</b> in Tools shows every board in one place.',
            'Flip between games and modes with the arrows.']],
          ['sparkle', 'A new high score', [
            'Make the board and the game celebrates.',
            'The score goes to all of your devices and to everyone you’ve linked.']]
        ],
        tries: [
          signedIn() && window.Kit && Kit.links ? ['gamepad', 'Arcade initials', function () { Kit.links.initials(); }] : null,
          ['trophy', 'Open High Scores', function () { location.href = (/\/games\//.test(location.pathname) ? '' : 'games/') + 'hiscores.html'; }]]
      },
      home: {
        lead: 'Make the home screen yours: the games you love up top, the ones you don’t play out of the way.',
        parts: [
          ['star', 'Favorites', [
            'Tap the star on any game’s tile. It joins <b>Favorites</b> at the top of the home screen.',
            'Press and hold a favorite to arrange them. The tiles wiggle: drag one to a new spot, then tap <b>Done</b>.',
            'Tap the star again to take it off.']],
          ['eye', 'Hide games and sections', [
            'Tap your avatar, then <b>Home screen</b>.',
            'Drag sections into the order you like.',
            'Switch a section off to hide all of its games, or open it and switch off single games.',
            'Hidden games leave the home screen, search, Surprise and High Scores.']],
          ['undo', 'Bring them back', [
            'Switch them on again anytime in Home screen. Nothing is deleted: scores and history stay.']],
          ['search', 'Find anything fast', [
            'Search by name, tap a section to jump to it, or pick how many people are playing to see only games that fit.',
            'Can’t decide? <b>Surprise</b> picks one for you.']],
          ['cloud', 'On every device', ['Favorites, order and hidden games follow your account.']]
        ],
        tries: window.Kit && Kit.homeSheet ? [['tiles', 'Home screen', function () { Kit.homeSheet(); }]] : []
      }
    };
    var c = X[id]; c.tries = (c.tries || []).filter(Boolean); return c;
  }
  var SCENE_OF = { signin: 'signin', together: 'together', link: 'link', scores: 'scores', home: 'home' };
  function guide(topic, opts) {
    opts = opts || {};
    var ov = overlay('tr-guide', 'How Game Night works'), st = null, obs = null;
    var back = el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Back' , html: icon('back') });
    var title = el('h1', { text: 'How Game Night works' });
    var x = el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', html: icon('close') });
    var chips = el('div', { class: 'tr-chips' }), body = el('div', { class: 'tr-gbody' });
    ov.appendChild(el('div', { class: 'tr-gh' }, [back, title, x])); ov.appendChild(chips); ov.appendChild(body);
    TOPICS.forEach(function (t) {
      chips.appendChild(el('button', { type: 'button', 'data-t': t.id, style: { '--tc': t.tc }, html: icon(t.ic) + '<span>' + t.t + '</span>', onclick: function () { sfx('tap'); show(t.id); } }));
    });
    function reveal(nodes) {
      if (obs) obs.disconnect();
      if (!('IntersectionObserver' in window)) { nodes.forEach(function (n) { n.classList.add('in'); }); return; }
      obs = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } }); }, { root: body, threshold: .12 });
      nodes.forEach(function (n) { obs.observe(n); });
    }
    function hub() {
      if (st) st.stop(); st = null;
      back.style.visibility = 'hidden'; chips.style.display = 'none'; title.textContent = 'How Game Night works';
      var wrap = el('div', { class: 'tr-gwrap2' }), grid = el('div', { class: 'tr-hub' });
      wrap.appendChild(el('p', { class: 'tr-lead', text: 'Everything you can do once you’re signed in. Pick one to see it in action.' }));
      TOPICS.forEach(function (t, i) {
        var c = el('button', { type: 'button', class: 'tr-card', style: { '--tc': t.tc }, onclick: function () { sfx('tap'); show(t.id); } },
          [el('span', { class: 'big', html: icon(t.ic) }), el('span', { class: 'grow' }, [el('b', { text: t.t }), el('small', { text: t.d })]), el('span', { class: 'chev', html: icon('right') })]);
        c.style.transitionDelay = (i * 60) + 'ms'; grid.appendChild(c);
      });
      var ovc = el('button', { type: 'button', class: 'tr-card ov', onclick: function () { sfx('tap'); close(); setTimeout(function () { intro({ app: true, actions: opts.actions }); }, 250); } },
        [el('span', { class: 'big', html: icon('play') }), el('span', { class: 'grow' }, [el('b', { text: 'Watch the overview' }), el('small', { text: 'Game Night in a minute' })]), el('span', { class: 'chev', html: icon('right') })]);
      ovc.style.transitionDelay = (TOPICS.length * 60) + 'ms'; grid.appendChild(ovc);
      wrap.appendChild(grid);
      body.innerHTML = ''; body.scrollTop = 0; body.appendChild(wrap);
      reveal([].slice.call(grid.children));
    }
    function show(id) {
      var t = TOPICS.filter(function (x) { return x.id === id; })[0]; if (!t) return hub();
      var c = content(id, opts);
      back.style.visibility = ''; chips.style.display = ''; title.textContent = t.t;
      ov.style.setProperty('--tc', t.tc);
      [].forEach.call(chips.children, function (b) { var on = b.getAttribute('data-t') === id; b.classList.toggle('on', on); if (on && b.scrollIntoView) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: still ? 'auto' : 'smooth' }); });
      if (st) st.stop();
      st = stage(SCENES[SCENE_OF[id]], 'c-' + id);
      var replay = el('button', { type: 'button', class: 'tr-replay', 'aria-label': 'Play it again', html: icon('undo'), onclick: function () { sfx('tap'); st.play(); } });
      var wrap = el('div', { class: 'tr-gwrap2 topic' }, [el('div', { class: 'tr-ghero' }, [st.el, replay]), el('p', { class: 'tr-lead', text: c.lead })]);
      var parts = c.parts.map(function (p, k) {
        var steps = el('div', { class: 'tr-steps' }, p[2].map(function (s, j) {
          var n = p[2].length > 1 && /How to|Moving/.test(p[1]) ? el('span', { class: 'n', text: String(j + 1) }) : el('span', { class: 'n', html: icon('check') });
          var row = el('div', { class: 'tr-step' }, [n, el('span', { html: s })]); row.style.transitionDelay = (120 + j * 70) + 'ms'; return row;
        }));
        var ic = p[0] === 'google' ? G_LOGO : icon(p[0]);
        return el('div', { class: 'tr-part' }, [el('h3', null, [el('span', { class: 'ic', html: ic }), el('span', { text: p[1] })]), steps]);
      });
      parts.forEach(function (p) { wrap.appendChild(p); });
      if (c.tries.length) wrap.appendChild(el('div', { class: 'tr-try' }, c.tries.map(function (tr, i) {
        return el('button', { type: 'button', class: 'btn ' + (i ? 'btn-soft' : 'btn-primary'), html: (tr[0] === 'google' ? G_LOGO : icon(tr[0])) + '<span>' + tr[1] + '</span>', onclick: function () { sfx('tap'); close(); setTimeout(tr[2], 250); } });
      })));
      body.innerHTML = ''; body.scrollTop = 0; body.appendChild(wrap);
      setTimeout(function () { if (st) st.play(); }, 200);
      reveal(parts);
    }
    function close() { if (st) st.stop(); if (obs) obs.disconnect(); doc.removeEventListener('keydown', onKey); ov._close(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    doc.addEventListener('keydown', onKey);
    back.onclick = function () { sfx('tap'); hub(); };
    x.onclick = function () { sfx('tap'); close(); };
    if (topic) show(topic); else hub();
    return { close: close, show: show };
  }

  return { intro: intro, guide: guide, scenes: SCENES, topics: TOPICS };
})();
