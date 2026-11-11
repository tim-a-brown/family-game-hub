/* MatKit: a play mat made from a picture, for any game that has play mats.
   A picture is laid anywhere on the mat (it may hang off an edge, or sit to one side and leave mat empty beside it),
   its edges fade into a cloth of the player's choosing, and the player places it by hand. One engine for every game:
   the game says where its pictures come from, what shape its mats are and what its buttons look like.

   The stored value (a small object; MatKit.str gives it as text, MatKit.read takes either back and returns null for
   anything else, so a game's older plain values still load through the game's own code):
     { k: 'art',
       c:  the game's own name for the picture (a card's key or id),
       u:  the picture's address, when the game wants the address to travel with the value (optional),
       w, h: the picture's natural size,
       cr: [x0, y0, x1, y1] the part of the picture that is shown, as fractions of it (optional: the whole picture),
       r:  quarter turns clockwise to stand that part upright (optional: a card scanned on its side),
       x, y: where the middle of the picture lies, as fractions of the mat's width and height (0 to 1),
       s:  the picture's height as a fraction of the mat's height (MIN to MAX),
       f:  the cloth in the empty part (one of FILLS), col: its colour, au: 1 when that colour was taken from the picture,
       d:  how far the whole mat is dimmed so the pieces on it stay the brightest things (0 to .5) }

   MatKit.make(pic, shape)          a new value for pic {c, u, w, h, cr, focus: [fx, fy]} on a mat whose width / height is shape
   MatKit.paint(node, value, o)     lays the mat in node (any positioned element), or brings it up to date. o: {url: the
                                    picture's address, turn: the mat faces the other way, small: a swatch}. Nothing is
                                    rebuilt when only the place, size or cloth has changed: the same picture stays.
   MatKit.clear(node)               takes the mat out of node again (the game is about to draw another kind of mat there)
   MatKit.tone(urls, crop, done)    reads the picture once: done({col: a cloth colour from its edges, d: a dimming for
                                    it}) or done(null) when the picture cannot be read
   MatKit.edit(o)                   the editor. o: {host, value, url(value), shape(), dress(mat, value), onChange(value,
                                    settled), another(), cls, matCls, btn, icons: {hand, centre, small, big}, words}
                                    Returns {el, set(value), value(), fit(), close()}
   MatKit.FILLS, MatKit.COLS        the cloths and the colours on offer */
(function () {
  'use strict';
  var MIN = .6, MAX = 4, FEATHER = .3;
  var FILLS = [
    { id: 'weave', n: 'Plain weave' }, { id: 'lines', n: 'Chart lines' }, { id: 'quilt', n: 'Quilted diamonds' },
    { id: 'stripe', n: 'Woven stripes' }, { id: 'stars', n: 'A field of stars' }
  ];
  var COLS = [['#1b2850', 'Midnight blue'], ['#4a1820', 'Oxblood'], ['#12403a', 'Forest green'], ['#3a2a1c', 'Walnut'], ['#26282e', 'Charcoal'], ['#3b2350', 'Plum']];
  var WORDS = { size: 'Size of the picture', centre: 'Put the picture back in the middle', cloth: 'Cloth', colour: 'Colour', fromPic: 'A colour from the picture', another: 'Choose another picture', stage: 'The picture on the mat. Drag to move it, pinch or scroll to change its size.' };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  function hex(v) { return /^#[0-9a-f]{6}$/i.test(v || '') ? String(v).toLowerCase() : ''; }
  function fillOf(id) { for (var i = 0; i < FILLS.length; i++) if (FILLS[i].id === id) return id; return FILLS[0].id; }
  function cropOf(c) {
    if (!Array.isArray(c) || c.length !== 4) return null;
    var a = c.map(function (v) { return clamp(num(v, 0), 0, 1); });
    return a[2] - a[0] > .05 && a[3] - a[1] > .05 ? a.map(r3) : null;
  }
  function read(v) {
    if (typeof v === 'string') { if (v.charAt(0) !== '{') return null; try { v = JSON.parse(v); } catch (e) { return null; } }
    if (!v || typeof v !== 'object' || v.k !== 'art' || v.c == null || v.c === '') return null;
    var o = { k: 'art', c: String(v.c), w: Math.max(1, num(v.w, 2)), h: Math.max(1, num(v.h, 3)), x: r3(clamp(num(v.x, .5), 0, 1)), y: r3(clamp(num(v.y, .5), 0, 1)),
      s: r3(clamp(num(v.s, 1), MIN, MAX)), f: fillOf(v.f), col: hex(v.col) || COLS[0][0], au: v.au ? 1 : 0, d: r3(clamp(num(v.d, .2), 0, .5)) };
    if (v.u) o.u = String(v.u);
    var cr = cropOf(v.cr); if (cr) o.cr = cr;
    var r = ((num(v.r, 0) | 0) % 4 + 4) % 4; if (r) o.r = r;
    return o;
  }
  // (always the same order of fields, so two values that are the same mat are the same text)
  function str(v) { v = read(v); if (!v) return ''; var o = { k: 'art', c: v.c }; if (v.u) o.u = v.u; o.w = v.w; o.h = v.h; if (v.cr) o.cr = v.cr; if (v.r) o.r = v.r; o.x = v.x; o.y = v.y; o.s = v.s; o.f = v.f; o.col = v.col; o.au = v.au; o.d = v.d; return JSON.stringify(o); }
  // the shape of what is shown: the picture's own, or its shown part's
  function ratio(v) { var cr = v.cr || [0, 0, 1, 1], a = (cr[2] - cr[0]) * v.w / ((cr[3] - cr[1]) * v.h); return v.r % 2 ? 1 / a : a; }
  // A new mat from a picture: the picture fills the mat's height (or about half its width, if that is larger), and
  // lies to the right, so the cloth shows beside it. A picture wide enough to cover the mat lies in the middle.
  function make(pic, shape) {
    shape = shape > .2 ? shape : 2;
    var v = read({ k: 'art', c: pic.c, u: pic.u, w: pic.w, h: pic.h, cr: pic.cr, r: pic.r, col: pic.col, au: pic.au == null ? 1 : pic.au, d: pic.d, f: pic.f });
    if (!v) return null;
    var ar = ratio(v), s = clamp(Math.max(1, .5 * shape / ar), MIN, MAX), wf = s * ar / shape, fx = pic.focus ? pic.focus[0] : .5, fy = pic.focus ? pic.focus[1] : .5;
    v.s = r3(s); v.x = r3(wf >= .96 ? clamp(.5 + (.5 - fx) * wf, 1 - wf / 2, wf / 2) : clamp(1.02 - wf / 2, .5, .8));
    v.y = r3(s > 1 ? clamp(.5 + (.5 - fy) * s, 1 - s / 2, s / 2) : .5);
    return v;
  }

  // ── The look. Sizes hang off the mat's own box (container units), so a value holds at every shape of screen. ──
  function svg(w, h, body) { return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' + body + '</svg>') + '")'; }
  var LIGHT = 'rgba(255,255,255,', DARK = 'rgba(0,0,0,', GILT = 'rgba(246,227,161,';
  var star = function (x, y, r, a) { return '<path d="M' + x + ' ' + (y - r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x - r) + ' ' + y + 'Q' + x + ' ' + y + ' ' + x + ' ' + (y - r) + 'Z" fill="' + GILT + a + ')"/>'; };
  var dot = function (x, y, r, a) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + GILT + a + ')"/>'; };
  var PAT = {
    // a plain weave: fine threads over and under
    weave: [6, 6, svg(6, 6, '<path d="M0 1.5h3M3 4.5h3" stroke="' + LIGHT + '.1)" stroke-width="1"/><path d="M1.5 3v3M4.5 0v3" stroke="' + DARK + '.22)" stroke-width="1"/>')],
    // a chart's fine lines: a dashed graticule with a small cross where the lines meet
    lines: [72, 72, svg(72, 72, '<path d="M0 36h72M36 0v72" fill="none" stroke="' + GILT + '.2)" stroke-width=".7" stroke-dasharray="1.5 3"/><path d="M0 .4h72M.4 0v72" fill="none" stroke="' + GILT + '.11)" stroke-width=".7"/><path d="M36 31v10M31 36h10" stroke="' + GILT + '.42)" stroke-width=".8"/><circle cx="36" cy="36" r="2.2" fill="none" stroke="' + GILT + '.3)" stroke-width=".6"/>')],
    // quilted diamonds: stitched lines, each diamond a little raised
    quilt: [44, 44, svg(44, 44, '<defs><radialGradient id="p"><stop offset="0" stop-color="' + LIGHT + '.09)"/><stop offset="1" stop-color="' + LIGHT + '0)"/></radialGradient></defs><rect width="44" height="44" fill="url(#p)"/><path d="M0 0L44 44M44 0L0 44" stroke="' + DARK + '.3)" stroke-width="2.4"/><path d="M0 0L44 44M44 0L0 44" stroke="' + LIGHT + '.2)" stroke-width=".9" stroke-dasharray="3 2.4"/>')],
    // woven stripes: broad bands with a pin line between
    stripe: [36, 8, svg(36, 8, '<rect width="15" height="8" fill="' + LIGHT + '.055)"/><rect x="18" width="15" height="8" fill="' + DARK + '.13)"/><path d="M16.5 0v8M34.5 0v8" stroke="' + GILT + '.2)" stroke-width=".8"/><path d="M0 2h36M0 6h36" stroke="' + DARK + '.1)" stroke-width="1"/>')],
    // a field of stars: a few large, many small
    stars: [236, 198, svg(236, 198, star(30, 34, 7, 0.5) + star(158, 22, 5, 0.42) + star(96, 88, 9, 0.56) + star(206, 112, 6, 0.46) + star(44, 150, 6, 0.44) + star(140, 170, 8, 0.5) + dot(119, 147, 1, .46) + dot(134, 154, .8, .38) + dot(209, 135, 1, .5) + dot(207, 51, .7, .46) + dot(81, 40, .7, .5) + dot(211, 181, .7, .5) + dot(105, 119, 1.2, .38) + dot(163, 7, 1.2, .34) + dot(19, 13, .8, .38) + dot(157, 11, 1, .42) + dot(116, 155, .8, .5) + dot(63, 167, .9, .46) + dot(5, 173, .7, .46) + dot(171, 75, 1, .5) + dot(219, 25, .9, .42) + dot(198, 62, 1.2, .42) + dot(11, 21, 1.2, .34) + dot(106, 31, .9, .46) + dot(21, 8, .7, .38) + dot(57, 17, 1, .46) + dot(185, 105, 1, .34) + dot(148, 165, .8, .42))]
  };
  var RAMP = function (dir, a, b) {   // a soft shoulder at each end of the picture along one axis
    return 'linear-gradient(' + dir + ',transparent 0,rgba(0,0,0,.1) calc(' + a + ' * .22),rgba(0,0,0,.5) calc(' + a + ' * .5),rgba(0,0,0,.9) calc(' + a + ' * .8),#000 ' + a +
      ',#000 calc(100% - ' + b + '),rgba(0,0,0,.9) calc(100% - ' + b + ' * .8),rgba(0,0,0,.5) calc(100% - ' + b + ' * .5),rgba(0,0,0,.1) calc(100% - ' + b + ' * .22),transparent 100%)';
  };
  var CSS = [
    '.mk-lay{position:absolute;inset:0;z-index:0;overflow:hidden;border-radius:inherit;container-type:size;pointer-events:none;}',
    '.mk-lay.turn{transform:rotate(180deg);}',
    '.mk-lay::after{content:"";position:absolute;inset:0;background:rgba(8,10,20,var(--mk-d,.2));}',
    '.mk-fill{position:absolute;inset:0;display:block;background-color:var(--mk-col,#1b2850);background-repeat:repeat;}',
    FILLS.map(function (f) { var p = PAT[f.id]; return '.mk-fill[data-f=' + f.id + ']{background-image:' + p[2] + ';background-size:calc(' + p[0] + 'px * var(--mk-z,1)) calc(' + p[1] + 'px * var(--mk-z,1));}'; }).join(''),
    // the picture: its box, then how far each of its edges lies inside the mat, then a feather on each edge that is
    // inside (an edge beyond the mat's edge has nothing to fade: its feather closes as the edge goes out)
    '.mk-art{position:absolute;overflow:hidden;--pw:calc(var(--s) * var(--ar) * 100cqh);--ph:calc(var(--s) * 100cqh);--f:calc(min(var(--pw),var(--ph)) * ' + FEATHER + ');',
    '--fl:clamp(0px,calc(var(--f) + 2 * (var(--x) * 100cqw - var(--pw) / 2)),var(--f));--fr:clamp(0px,calc(var(--f) + 2 * ((1 - var(--x)) * 100cqw - var(--pw) / 2)),var(--f));',
    '--ft:clamp(0px,calc(var(--f) + 2 * (var(--y) * 100cqh - var(--ph) / 2)),var(--f));--fb:clamp(0px,calc(var(--f) + 2 * ((1 - var(--y)) * 100cqh - var(--ph) / 2)),var(--f));',
    'width:var(--pw);height:var(--ph);left:calc(var(--x) * 100cqw);top:calc(var(--y) * 100cqh);transform:translate(-50%,-50%);',
    '-webkit-mask-image:' + RAMP('to right', 'var(--fl)', 'var(--fr)') + ',' + RAMP('to bottom', 'var(--ft)', 'var(--fb)') + ';mask-image:' + RAMP('to right', 'var(--fl)', 'var(--fr)') + ',' + RAMP('to bottom', 'var(--ft)', 'var(--fb)') + ';',
    '-webkit-mask-composite:source-in;mask-composite:intersect;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;}',
    '.mk-rot{position:absolute;left:50%;top:50%;width:var(--pw);height:var(--ph);transform:translate(-50%,-50%);}',
    '.mk-rot.q{width:var(--ph);height:var(--pw);}.mk-rot[data-r="1"]{transform:translate(-50%,-50%) rotate(90deg);}.mk-rot[data-r="2"]{transform:translate(-50%,-50%) rotate(180deg);}.mk-rot[data-r="3"]{transform:translate(-50%,-50%) rotate(270deg);}',
    '.mk-art img{position:absolute;display:block;max-width:none;transition:opacity .45s;-webkit-user-drag:none;user-select:none;}',
    '.mk-art img.wait{opacity:0;}',
    // ── the editor ──
    '.mk-ed{display:flex;flex-direction:column;gap:14px;min-width:0;--mk-ring:#e9cf86;--mk-ink:#f3e9d2;--mk-dim:#b9b08f;color:var(--mk-ink);}',
    '.mk-stage{position:relative;box-sizing:border-box;width:100%;padding:16px;overflow:hidden;border-radius:14px;touch-action:none;cursor:grab;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;outline:none;}',
    '.mk-stage.held{cursor:grabbing;}',
    '.mk-stage:focus-visible{box-shadow:0 0 0 2px var(--mk-ring);}',
    '.mk-mat{position:relative;width:100%;margin:0 auto;}',
    // where the whole picture lies, also beyond the mat: a dashed outline with a handle at each corner
    '.mk-ghost{position:absolute;z-index:4;box-sizing:border-box;border:1.5px dashed color-mix(in srgb,var(--mk-ring) 80%,transparent);border-radius:4px;pointer-events:none;box-shadow:0 0 0 1px rgba(0,0,0,.35);}',
    '.mk-h{position:absolute;width:18px;height:18px;margin:-9px;border-radius:50%;background:var(--mk-ring);box-shadow:0 0 0 2px rgba(10,12,22,.85),0 2px 5px rgba(0,0,0,.6);pointer-events:auto;touch-action:none;}',
    '.mk-h::before{content:"";position:absolute;inset:-11px;}',
    '.mk-h.tl{left:0;top:0;cursor:nwse-resize;}.mk-h.tr{right:0;top:0;cursor:nesw-resize;}.mk-h.bl{left:0;bottom:0;cursor:nesw-resize;}.mk-h.br{right:0;bottom:0;cursor:nwse-resize;}',
    // a hand on the picture until it has been moved once
    '.mk-hand{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px;border-radius:50%;display:grid;place-items:center;color:#fff;background:rgba(10,12,22,.62);box-shadow:0 0 0 1.5px color-mix(in srgb,var(--mk-ring) 80%,transparent);transition:opacity .3s;animation:mk-nudge 2.6s ease-in-out 3;}',
    '.mk-hand svg{width:22px;height:22px;}',
    '.mk-stage.moved .mk-hand{opacity:0;}',
    '@keyframes mk-nudge{0%,55%,100%{transform:none;}18%{transform:translate(-14px,5px);}38%{transform:translate(12px,-4px);}}',
    '.mk-ctl{display:flex;flex-direction:column;gap:12px;min-width:0;}',
    '.mk-row{display:flex;align-items:center;gap:10px;min-width:0;}',
    '.mk-row.wrap{flex-wrap:wrap;gap:8px;}',
    '.mk-lab{flex:none;min-width:3.6em;color:var(--mk-dim);}',
    '.mk-ic{flex:none;display:grid;place-items:center;color:var(--mk-dim);}',
    '.mk-ic svg{display:block;}',
    '.mk-ic.s svg{width:15px;height:15px;}.mk-ic.b svg{width:24px;height:24px;}',
    '.mk-range{flex:1;min-width:0;height:32px;margin:0;accent-color:var(--mk-ring);}',
    '.mk-sw,.mk-chip{position:relative;flex:none;padding:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;}',
    '.mk-sw{width:54px;height:40px;border-radius:8px;overflow:hidden;--mk-z:.62;box-shadow:0 0 0 1px rgba(0,0,0,.55),0 2px 5px rgba(0,0,0,.45);}',
    '.mk-sw .mk-fill{border-radius:inherit;}',
    '.mk-chip{width:36px;height:36px;border-radius:50%;background:var(--c);box-shadow:inset 0 2px 4px rgba(255,255,255,.14),inset 0 -3px 5px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.55),0 2px 5px rgba(0,0,0,.45);}',
    // (the first colour is the picture's own: half the chip is the picture, half the colour taken from it)
    '.mk-chip.pic{background:linear-gradient(90deg,transparent 50%,var(--c) 50%),var(--p) center/cover no-repeat,var(--c);}',
    '.mk-sw[aria-pressed=true],.mk-chip[aria-pressed=true]{box-shadow:0 0 0 2px #10131c,0 0 0 4px var(--mk-ring),0 0 14px color-mix(in srgb,var(--mk-ring) 45%,transparent);}',
    '.mk-sw:focus-visible,.mk-chip:focus-visible{outline:2px solid #fff;outline-offset:3px;}',
    '@media (orientation:landscape) and (max-height:560px){.mk-ed{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);align-items:start;gap:14px;}.mk-ctl{gap:9px;}.mk-sw{width:50px;height:36px;}.mk-chip{width:32px;height:32px;}}',
    '@media (max-width:440px){.mk-sw{width:46px;height:36px;}.mk-chip{width:32px;height:32px;}.mk-row,.mk-row.wrap{gap:7px;}.mk-lab{min-width:3.2em;}}','@media (max-width:359px){.mk-sw{width:40px;height:32px;}.mk-chip{width:28px;height:28px;}.mk-row,.mk-row.wrap{gap:5px;}}',
    '@media (prefers-reduced-motion:reduce){.mk-hand{animation:none;}}'
  ].join('');
  var styled = false;
  function style() { if (styled) return; styled = true; var s = document.createElement('style'); s.setAttribute('data-matkit', ''); s.textContent = CSS; document.head.appendChild(s); }
  function el(tag, cls, kids) { var n = document.createElement(tag); if (cls) n.className = cls; (kids || []).forEach(function (k) { if (k) n.appendChild(k); }); return n; }

  // ── Painting a mat ──
  function paint(node, v, o) {
    v = read(v); o = o || {}; if (!node || !v) return false;
    style();
    var m = node._mk;
    if (!m || m.lay.parentNode !== node) {
      m = node._mk = { fill: el('i', 'mk-fill'), img: el('img'), src: '' };
      m.img.alt = ''; m.img.draggable = false; m.img.decoding = 'async';
      m.rot = el('div', 'mk-rot', [m.img]); m.art = el('div', 'mk-art', [m.rot]); m.lay = el('div', 'mk-lay', [m.fill, m.art]); m.lay.setAttribute('aria-hidden', 'true');
      node.insertBefore(m.lay, node.firstChild);
    }
    m.lay.classList.toggle('turn', !!o.turn);
    if (o.small) m.lay.style.setProperty('--mk-z', '.5');
    m.lay.style.setProperty('--mk-d', v.d);
    m.fill.dataset.f = v.f; m.fill.style.setProperty('--mk-col', v.col);
    var cr = v.cr || [0, 0, 1, 1], cw = cr[2] - cr[0], ch = cr[3] - cr[1], st = m.art.style;
    st.setProperty('--x', v.x); st.setProperty('--y', v.y); st.setProperty('--s', v.s); st.setProperty('--ar', r3(ratio(v))); m.rot.className = 'mk-rot' + (v.r % 2 ? ' q' : ''); m.rot.dataset.r = v.r || 0;
    var is = m.img.style; is.width = (100 / cw) + '%'; is.height = (100 / ch) + '%'; is.left = (-100 * cr[0] / cw) + '%'; is.top = (-100 * cr[1] / ch) + '%';
    var url = o.url || v.u || '';
    if (url !== m.src) {
      m.src = url; m.img.classList.remove('wait');
      m.img.onerror = function () { if (o.onerror && m.src === url) o.onerror(url); };
      m.img.src = url;
      // (a picture still on its way fades in over the cloth once; one that is here already is simply there)
      if (!(m.img.complete && m.img.naturalWidth)) { m.img.classList.add('wait'); m.img.onload = function () { m.img.classList.remove('wait'); }; }
    }
    return true;
  }
  function clear(node) { var m = node && node._mk; if (!m) return; if (m.lay.parentNode) m.lay.parentNode.removeChild(m.lay); node._mk = null; }

  // ── A cloth colour from the picture: the colour round its edges, kept dark and quiet enough to play on ──
  function hsl(r, g, b) { r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn; if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; }
  function hslHex(h, s, l) { function f(n) { var k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); } return '#' + [f(0), f(8), f(4)].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }
  var tones = {};
  function tone(urls, crop, done) {
    urls = [].concat(urls || []).filter(Boolean); var key = urls.join('|') + '|' + (crop || []).join(',');
    if (tones[key]) { done(tones[key]); return; }
    (function next() {
      var u = urls.shift(); if (!u) { done(null); return; }
      var im = new Image(), same = false; try { same = /^data:|^blob:/.test(u) || new URL(u, location.href).origin === location.origin; } catch (e) {}
      if (!same) im.crossOrigin = 'anonymous';
      im.onerror = next;
      im.onload = function () {
        try {
          var N = 28, c = document.createElement('canvas'), cr = crop || [0, 0, 1, 1], iw = im.naturalWidth, ih = im.naturalHeight; c.width = c.height = N;
          var g = c.getContext('2d'); g.drawImage(im, cr[0] * iw, cr[1] * ih, (cr[2] - cr[0]) * iw, (cr[3] - cr[1]) * ih, 0, 0, N, N);
          var px = g.getImageData(0, 0, N, N).data, e = [0, 0, 0, 0], lum = 0;
          for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
            var i = (y * N + x) * 4, r = px[i], gg = px[i + 1], b = px[i + 2]; lum += (.2126 * r + .7152 * gg + .0722 * b) / 255;
            if (x < 3 || y < 3 || x >= N - 3 || y >= N - 3) { e[0] += r; e[1] += gg; e[2] += b; e[3]++; }
          }
          lum /= N * N; var h = hsl(e[0] / e[3], e[1] / e[3], e[2] / e[3]);
          var out = tones[key] = { col: hslHex(h[0], Math.min(h[1], .5), clamp(h[2] * .55, .13, .27)), d: r3(clamp(.1 + (lum - .25) * .62, .08, .4)) };
          done(out);
        } catch (er) { next(); }
      };
      im.src = u;
    })();
  }

  // ── The editor: the mat in its real shape, the picture moved by hand ──
  function edit(o) {
    style();
    var W = {}; Object.keys(WORDS).forEach(function (k) { W[k] = (o.words && o.words[k]) || WORDS[k]; });
    var ic = o.icons || {}, btn = o.btn || '', v = read(o.value), closed = false, ptrs = {}, pinch = null, grip = null, moved = false, dirty = false, wheelT = 0;
    var mat = el('div', 'mk-mat' + (o.matCls ? ' ' + o.matCls : '')), ghost = el('div', 'mk-ghost'), hand = el('span', 'mk-hand');
    hand.innerHTML = ic.hand || ''; ghost.appendChild(hand);
    ['tl', 'tr', 'bl', 'br'].forEach(function (c) { var h = el('i', 'mk-h ' + c); h.dataset.h = c; ghost.appendChild(h); });
    var stage = el('div', 'mk-stage', [mat, ghost]); stage.tabIndex = 0; stage.setAttribute('role', 'application'); stage.setAttribute('aria-label', W.stage);
    var range = el('input', 'mk-range'); range.type = 'range'; range.min = '0'; range.max = '1'; range.step = '0.005'; range.setAttribute('aria-label', W.size);
    var centre = el('button', btn + ' mk-centre'); centre.type = 'button'; centre.innerHTML = ic.centre || ''; centre.setAttribute('aria-label', W.centre); centre.title = W.centre;
    var sI = el('span', 'mk-ic s'), bI = el('span', 'mk-ic b'); sI.innerHTML = ic.small || ''; bI.innerHTML = ic.big || '';
    var fills = el('div', 'mk-row wrap'), cols = el('div', 'mk-row wrap');
    var lab = function (t) { var n = el('span', 'mk-lab'); n.textContent = t; return n; };
    var more = null;
    if (o.another) { more = el('button', btn + ' mk-more'); more.type = 'button'; more.textContent = W.another; more.addEventListener('click', function () { o.another(); }); }
    var ctl = el('div', 'mk-ctl', [el('div', 'mk-row mk-size', [sI, range, bI, centre]), el('div', 'mk-row', [lab(W.cloth), fills]), el('div', 'mk-row', [lab(W.colour), cols]), more]);
    var root = el('div', 'mk-ed' + (o.cls ? ' ' + o.cls : ''), [stage, ctl]);
    var t2s = function (t) { return MIN * Math.pow(MAX / MIN, t); }, s2t = function (s) { return Math.log(s / MIN) / Math.log(MAX / MIN); };
    var url = function () { return o.url ? o.url(v) : v.u; };
    function fit() {   // the mat takes the game's real shape, as large as the room allows
      var sh = o.shape ? o.shape() : 2; sh = sh > .2 ? sh : 2;
      mat.style.aspectRatio = sh.toFixed(3) + ' / 1'; mat.style.maxWidth = '';
      if (o.maxH) { var mh = o.maxH(); if (mh > 60) mat.style.maxWidth = Math.round(mh * sh) + 'px'; }
      show();
    }
    function show() {
      paint(mat, v, { url: url() }); if (o.dress) o.dress(mat, v);
      var mw = mat.offsetWidth, mh = mat.offsetHeight, ph = v.s * mh, pw = ph * ratio(v), gs = ghost.style;
      gs.width = pw + 'px'; gs.height = ph + 'px'; gs.left = (mat.offsetLeft + v.x * mw - pw / 2) + 'px'; gs.top = (mat.offsetTop + v.y * mh - ph / 2) + 'px';
      range.value = String(s2t(v.s));
    }
    function swatches() {
      fills.innerHTML = ''; cols.innerHTML = '';
      FILLS.forEach(function (f) {
        var b = el('button', 'mk-sw', [el('i', 'mk-fill')]); b.type = 'button'; b.firstChild.dataset.f = f.id; b.firstChild.style.setProperty('--mk-col', v.col);
        b.setAttribute('aria-label', f.n); b.title = f.n; b.setAttribute('aria-pressed', String(v.f === f.id));
        b.addEventListener('click', function () { if (v.f === f.id) return; v.f = f.id; change(true); swatches(); }); fills.appendChild(b);
      });
      var chip = function (c, name, pic, on, fn) {
        var b = el('button', 'mk-chip' + (pic ? ' pic' : '')); b.type = 'button'; b.style.setProperty('--c', c); if (pic) b.style.setProperty('--p', 'url("' + String(pic).replace(/"/g, '%22') + '")');
        b.setAttribute('aria-label', name); b.title = name; b.setAttribute('aria-pressed', String(on)); b.addEventListener('click', fn); cols.appendChild(b);
      };
      var own = o.own ? o.own(v) : null;   // {col, d} from the picture, when the game has read it
      chip(own ? own.col : v.au ? v.col : COLS[0][0], W.fromPic, o.thumb ? o.thumb(v) : url(), !!v.au, function () { if (v.au) return; var t = o.own ? o.own(v) : null; v.au = 1; if (t) v.col = t.col; change(true); swatches(); });
      COLS.forEach(function (c) { chip(c[0], c[1], '', !v.au && v.col === c[0], function () { if (!v.au && v.col === c[0]) return; v.au = 0; v.col = c[0]; change(true); swatches(); }); });
    }
    function change(settled) { show(); dirty = !settled; if (o.onChange) o.onChange(read(v), !!settled); }   // (v keeps its fine position while a hand is on it; what goes out is rounded)
    function settle() { if (dirty) change(true); }
    function nudge() { if (!moved) { moved = true; stage.classList.add('moved'); } }
    // one finger drags the picture, two change its size about the point between them; a corner handle changes its size
    stage.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return; e.preventDefault(); try { stage.setPointerCapture(e.pointerId); } catch (x) {}
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; stage.classList.add('held'); try { stage.focus({ preventScroll: true }); } catch (x) {}
      var ids = Object.keys(ptrs);
      if (ids.length === 1 && e.target && e.target.dataset && e.target.dataset.h) {
        var r = mat.getBoundingClientRect(), cx = r.left + v.x * r.width, cy = r.top + v.y * r.height; grip = { cx: cx, cy: cy, d: Math.max(8, Math.hypot(e.clientX - cx, e.clientY - cy)), s: v.s };
      } else grip = null;
      if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch = { d: Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)), s: v.s }; grip = null; }
    });
    stage.addEventListener('pointermove', function (e) {
      var p = ptrs[e.pointerId]; if (!p) return;
      var dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      var ids = Object.keys(ptrs), mw = mat.offsetWidth || 1, mh = mat.offsetHeight || 1;
      if (grip) v.s = clamp(grip.s * Math.hypot(e.clientX - grip.cx, e.clientY - grip.cy) / grip.d, MIN, MAX);
      else if (ids.length >= 2 && pinch) {
        var a = ptrs[ids[0]], b = ptrs[ids[1]]; v.s = clamp(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, MIN, MAX);
        v.x = clamp(v.x + dx / 2 / mw, 0, 1); v.y = clamp(v.y + dy / 2 / mh, 0, 1);
      } else { v.x = clamp(v.x + dx / mw, 0, 1); v.y = clamp(v.y + dy / mh, 0, 1); }
      nudge(); change(false);
    });
    function up(e) { if (!ptrs[e.pointerId]) return; delete ptrs[e.pointerId]; var n = Object.keys(ptrs).length; if (n < 2) pinch = null; if (!n) { grip = null; stage.classList.remove('held'); settle(); } }
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', function (e) { e.preventDefault(); v.s = clamp(v.s * Math.exp(-e.deltaY * .0016), MIN, MAX); nudge(); change(false); clearTimeout(wheelT); wheelT = setTimeout(settle, 260); }, { passive: false });
    stage.addEventListener('keydown', function (e) {
      var k = e.key, st = e.shiftKey ? .1 : .02, hit = true;
      if (k === 'ArrowLeft') v.x = clamp(v.x - st, 0, 1); else if (k === 'ArrowRight') v.x = clamp(v.x + st, 0, 1); else if (k === 'ArrowUp') v.y = clamp(v.y - st, 0, 1); else if (k === 'ArrowDown') v.y = clamp(v.y + st, 0, 1);
      else if (k === '+' || k === '=') v.s = clamp(v.s * 1.08, MIN, MAX); else if (k === '-' || k === '_') v.s = clamp(v.s / 1.08, MIN, MAX); else hit = false;
      if (hit) { e.preventDefault(); nudge(); change(true); }
    });
    range.addEventListener('input', function () { v.s = clamp(t2s(+range.value), MIN, MAX); nudge(); change(false); });
    range.addEventListener('change', settle);
    centre.addEventListener('click', function () { v.x = .5; v.y = .5; nudge(); change(true); });
    var onSize = function () { if (closed || !root.isConnected) { window.removeEventListener('resize', onSize); return; } fit(); };
    window.addEventListener('resize', onSize);
    if (o.host) o.host.appendChild(root);
    swatches(); fit(); requestAnimationFrame(function () { if (!closed) fit(); });
    return { el: root, mat: mat, fit: fit, value: function () { return read(v); },
      set: function (nv) { var r = read(nv); if (!r) return; v = r; swatches(); show(); },
      close: function () { if (closed) return; closed = true; clearTimeout(wheelT); settle(); window.removeEventListener('resize', onSize); if (root.parentNode) root.parentNode.removeChild(root); } };
  }

  window.MatKit = { MIN: MIN, MAX: MAX, FILLS: FILLS, COLS: COLS, read: read, str: str, ratio: ratio, make: make, paint: paint, clear: clear, tone: tone, edit: edit, style: style };
})();
