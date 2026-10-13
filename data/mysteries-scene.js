'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// Picture Mysteries: the scene kit. Draws each case's picture as SVG from the
// compact item lists in data/mysteries-cases.js.
//
//   MysteryScene.render(caseObj, uid) -> '<svg …>'   the whole picture
//   MysteryScene.size(caseObj) -> [w, h]               its viewBox size
//
// A scene is { bg: [kind, props], items: [[kind, props], …] } in a 400 × 300
// space (or caseObj.size). Items are drawn in order (later = in front).
// Any item with an `id` becomes <g data-id="id">, so the game can make it
// tappable and the solution can circle it. People also tag their parts
// (data-p="id.head", "id.handR", "id.shoes", …). L and R always mean the
// viewer's left and right of the picture.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  var OL = '#2b2433';
  var SKIN = ['#f6d4b4', '#eab48b', '#cf9465', '#a86b40', '#7a4a2b', '#f3c7a2'];
  var uidN = 0;

  // ── tiny SVG helpers ─────────────────────────────────────────────────────
  function n(v) { return Math.round(v * 100) / 100; }
  function sty(fill, o) {
    o = o || {};
    var s = ' fill="' + (fill || 'none') + '"';
    if (o.st !== 0) s += ' stroke="' + (o.st || OL) + '" stroke-width="' + (o.sw == null ? 1.2 : o.sw) + '" stroke-linejoin="round" stroke-linecap="round"';
    if (o.op != null) s += ' opacity="' + o.op + '"';
    if (o.a) s += ' ' + o.a;
    return s;
  }
  function rect(x, y, w, h, fill, o) { o = o || {}; return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(Math.max(0, w)) + '" height="' + n(Math.max(0, h)) + '"' + (o.rx ? ' rx="' + o.rx + '"' : '') + sty(fill, o) + '/>'; }
  function circ(x, y, r, fill, o) { return '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(r) + '"' + sty(fill, o) + '/>'; }
  function ell(x, y, rx, ry, fill, o) { return '<ellipse cx="' + n(x) + '" cy="' + n(y) + '" rx="' + n(rx) + '" ry="' + n(ry) + '"' + sty(fill, o) + '/>'; }
  function path(d, fill, o) { return '<path d="' + d + '"' + sty(fill, o) + '/>'; }
  function line(x1, y1, x2, y2, col, w, o) { o = o || {}; return '<path d="M' + n(x1) + ' ' + n(y1) + 'L' + n(x2) + ' ' + n(y2) + '" stroke="' + (col || OL) + '" stroke-width="' + (w || 1.2) + '" stroke-linecap="round" fill="none"' + (o.op != null ? ' opacity="' + o.op + '"' : '') + (o.a ? ' ' + o.a : '') + '/>'; }
  function poly(pts, fill, o) { return '<path d="M' + pts.map(function (p) { return n(p[0]) + ' ' + n(p[1]); }).join('L') + 'Z"' + sty(fill, o) + '/>'; }
  function pline(pts, col, w, o) { o = o || {}; return '<path d="M' + pts.map(function (p) { return n(p[0]) + ' ' + n(p[1]); }).join('L') + '" fill="none" stroke="' + (col || OL) + '" stroke-width="' + (w || 1.2) + '" stroke-linecap="round" stroke-linejoin="round"' + (o.op != null ? ' opacity="' + o.op + '"' : '') + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + '/>'; }
  // a thick outlined stroke (arms, legs, straps): dark line under a coloured one
  function limb(d, col, w) { return '<path d="' + d + '" fill="none" stroke="' + OL + '" stroke-width="' + n(w + 2.4) + '" stroke-linecap="round" stroke-linejoin="round"/><path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + n(w) + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
  function g(body, o) {
    o = o || {}; var a = '';
    if (o.x != null || o.y != null || o.s != null || o.r != null || o.fx) {
      a = ' transform="translate(' + n(o.x || 0) + ' ' + n(o.y || 0) + ')' + (o.r ? ' rotate(' + o.r + ')' : '') + (o.s != null && o.s !== 1 ? ' scale(' + n(o.s) + ')' : '') + (o.fx ? ' scale(-1 1)' : '') + '"';
    }
    if (o.id) a += ' data-id="' + o.id + '"';
    if (o.p) a += ' data-p="' + o.p + '"';
    if (o.op != null) a += ' opacity="' + o.op + '"';
    if (o.clip) a += ' clip-path="url(#' + o.clip + ')"';
    if (o.a) a += ' ' + o.a;
    return '<g' + a + '>' + body + '</g>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function text(x, y, t, o) {
    o = o || {};
    var f = o.font === 'sign' ? '"Lilita One",system-ui,sans-serif' : o.font === 'serif' ? 'Georgia,"Times New Roman",serif' : o.font === 'sans' ? 'system-ui,-apple-system,"Segoe UI",sans-serif' : '"Patrick Hand","Bradley Hand",cursive';
    return '<text x="' + n(x) + '" y="' + n(y) + '" font-family=\'' + f + '\' font-size="' + (o.size || 10) + '" fill="' + (o.fill || OL) + '" text-anchor="' + (o.anchor || 'middle') + '"' + (o.weight ? ' font-weight="' + o.weight + '"' : '') + (o.ls ? ' letter-spacing="' + o.ls + '"' : '') + (o.r ? ' transform="rotate(' + o.r + ' ' + n(x) + ' ' + n(y) + ')"' : '') + (o.op != null ? ' opacity="' + o.op + '"' : '') + (o.a ? ' ' + o.a : '') + '>' + esc(t) + '</text>';
  }
  // colour mixing: amt > 0 lightens towards white, < 0 darkens towards black
  function shade(hex, amt) {
    var h = String(hex || '#888').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
    var c = [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); });
    var t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    return '#' + c.map(function (v) { var x = Math.round(v + (t - v) * p); return ('0' + Math.max(0, Math.min(255, x)).toString(16)).slice(-2); }).join('');
  }
  function rng(seed) { var a = (seed || 1) >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shadow(x, y, rx, ry, op) { return ell(x, y, rx, ry || rx * 0.22, '#000', { st: 0, op: op == null ? 0.16 : op }); }

  // per-render context: unique ids for clip paths and patterns
  var C = null;
  function nid(k) { return C.uid + '-' + k + '-' + (C.n++); }
  function def(s) { C.defs.push(s); }

  // ── People ───────────────────────────────────────────────────────────────
  // x, y (feet), s scale, kid, skin, hair, hc, top, pat ('stripes'|'dots'|'check'), pc, sl ('short'),
  // coat, apron, legs ('pants'|'shorts'|'skirt'|'dress'), lc, tights, shoe ('sneaker'|'boot'|'heel'|'slipper'|'sock'|'bare'),
  // shoes (colour), hat, hatc, glasses, stache, beard, mouth, eyes, armL, armR (pose), holdL, holdR,
  // acc [...], marks [...], name, id, tagY
  function body(p) {
    var kid = !!p.kid, k = kid ? 0.8 : 1;
    var hip = kid ? -36 : -50, sh = kid ? -66 : -89, hy = kid ? -82 : -105, hr = kid ? 14 : 13;
    return { kid: kid, k: k, hip: hip, sh: sh, hy: hy, hr: hr, sw: kid ? 12.5 : 16, ww: kid ? 11.5 : 14.5 };
  }
  // where the arm bends and ends for a pose (left side; mirror x for the right)
  function armPts(B, pose) {
    var sx = -B.sw + 2, sy = B.sh + 4, k = B.k, el, hd;
    switch (pose) {
      case 'hip': el = [sx - 13 * k, sy + 15 * k]; hd = [sx + 2, B.hip - 4]; break;
      case 'up': el = [sx - 6 * k, sy - 16 * k]; hd = [sx - 7 * k, sy - 33 * k]; break;
      case 'wave': el = [sx - 16 * k, sy + 4 * k]; hd = [sx - 16 * k, sy - 15 * k]; break;
      case 'hold': el = [sx - 6 * k, sy + 20 * k]; hd = [sx + 9 * k, sy + 21 * k]; break;
      case 'chest': el = [sx - 5 * k, sy + 18 * k]; hd = [sx + 12 * k, sy + 10 * k]; break;
      case 'out': el = [sx - 15 * k, sy + 6 * k]; hd = [sx - 31 * k, sy + 5 * k]; break;
      case 'low': el = [sx - 9 * k, sy + 17 * k]; hd = [sx - 15 * k, sy + 33 * k]; break;
      case 'back': el = [sx - 4 * k, sy + 16 * k]; hd = [sx + 4 * k, sy + 26 * k]; break;
      case 'mouth': el = [sx - 7 * k, sy + 16 * k]; hd = [sx + 13 * k, B.hy - sy + sy + 6]; break;
      default: el = [sx - 4 * k, sy + 18 * k]; hd = [sx - 6 * k, sy + 35 * k];
    }
    return { s: [sx, sy], e: el, h: hd };
  }
  function mir(pt, side) { return side === 'R' ? [-pt[0], pt[1]] : pt; }
  function patFill(p, base) {
    if (!p.pat) return base;
    var id = nid('pt'), pc = p.pc || shade(base, -0.35), s = '';
    if (p.pat === 'stripes') s = '<pattern id="' + id + '" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="' + base + '"/><rect y="0" width="6" height="2.6" fill="' + pc + '"/></pattern>';
    else if (p.pat === 'vstripes') s = '<pattern id="' + id + '" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="' + base + '"/><rect x="0" width="2.4" height="6" fill="' + pc + '"/></pattern>';
    else if (p.pat === 'dots') s = '<pattern id="' + id + '" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="' + base + '"/><circle cx="2" cy="2" r="1.2" fill="' + pc + '"/><circle cx="5.5" cy="5.5" r="1.2" fill="' + pc + '"/></pattern>';
    else if (p.pat === 'check') s = '<pattern id="' + id + '" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="' + base + '"/><rect width="4" height="8" fill="' + pc + '" opacity=".45"/><rect width="8" height="4" fill="' + pc + '" opacity=".45"/></pattern>';
    else if (p.pat === 'star') s = '<pattern id="' + id + '" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="' + base + '"/><path d="M6 2.5l1 2.3 2.4.2-1.8 1.6.6 2.4L6 7.7 3.8 9l.6-2.4L2.6 5l2.4-.2z" fill="' + pc + '"/></pattern>';
    else return base;
    def(s); return 'url(#' + id + ')';
  }
  function has(list, key) { return (list || []).some(function (m) { return m === key || String(m).indexOf(key + ':') === 0; }); }
  function arg(list, key, i, d) { var m = (list || []).filter(function (m) { return String(m).indexOf(key + ':') === 0; })[0]; if (!m) return d; var a = String(m).split(':'); return a[i] == null || a[i] === '' ? d : a[i]; }
  function argsAll(list, key) { return (list || []).filter(function (m) { return String(m).indexOf(key + ':') === 0; }).map(function (m) { return String(m).split(':'); }); }

  function person(p) {
    var B = body(p), id = p.id || '', P = function (part) { return id ? id + '.' + part : null; };
    var skin = p.skin != null && typeof p.skin === 'number' ? SKIN[p.skin] : p.skin || SKIN[0];
    var top = p.top || '#4a78c2', lc = p.lc || '#3b4a6b', hc = p.hc || '#4a2e1c', acc = p.acc || [], mk = p.marks || [];
    var topFill = patFill(p, top);
    var armL = armPts(B, p.armL || 'down'), armR = armPts(B, p.armR || 'down');
    armR = { s: mir(armR.s, 'R'), e: mir(armR.e, 'R'), h: mir(armR.h, 'R') };
    var out = [];
    out.push(shadow(0, 0, 20 * B.k, 4.5));
    var hairBack = hairLayer(p, B, hc, 'back');
    out.push(hairBack);
    // arms that go behind the body
    function armSvg(a, side, pose, holding) {
      var d = 'M' + n(a.s[0]) + ' ' + n(a.s[1]) + 'Q' + n(a.e[0]) + ' ' + n(a.e[1]) + ' ' + n(a.h[0]) + ' ' + n(a.h[1]);
      var w = 7.4 * B.k, col = p.coat || top, s = '';
      if (p.sl === 'short' && !p.coat) {
        var m = [(a.s[0] + a.e[0]) / 2, (a.s[1] + a.e[1]) / 2];
        s += limb(d, skin, w * 0.82);
        s += limb('M' + n(a.s[0]) + ' ' + n(a.s[1]) + 'L' + n(m[0]) + ' ' + n(m[1]), top, w);
      } else s += limb(d, col, w);
      if (pose !== 'back') {
        var hm = 'hand' + side;
        var glv = argsAll(p.marks, 'glove').filter(function (q) { return q[1] === side; })[0];
        s += g(glv ? path('M' + n(a.h[0] - 4.4 * B.k) + ' ' + n(a.h[1] - 4) + 'h' + n(8.8 * B.k) + 'v4.4q0 4.4 -4.4 4.4q-4.4 0 -4.4 -4.4z', glv[2] || '#7a3b2a') : circ(a.h[0], a.h[1], 4.1 * B.k, has(p.marks, 'gloves') ? arg(p.marks, 'gloves', 1, '#7a3b2a') : skin), { p: P(hm) });
        if (has(acc, 'watch' + side) || (side === 'L' && has(acc, 'watch')) ) {
          var wx = a.e[0] + (a.h[0] - a.e[0]) * 0.72, wy = a.e[1] + (a.h[1] - a.e[1]) * 0.72;
          s += g(circ(wx, wy, 2.6 * B.k, arg(acc, 'watch' + side, 1, '#d8c06a'), { sw: 0.9 }) + circ(wx, wy, 1.3 * B.k, '#fff', { sw: 0.5 }), { p: P('watch' + side) });
        }
        if (has(acc, 'ring' + side)) s += g(circ(a.h[0] + (side === 'L' ? 2.4 : -2.4), a.h[1] + 1.2, 1.3, '#e8c34a', { sw: 0.6 }), { p: P('ring' + side) });
      }
      return g(s, { p: P('arm' + side) });
    }
    if ((p.armL || 'down') === 'back') out.push(armSvg(armL, 'L', 'back'));
    if ((p.armR || 'down') === 'back') out.push(armSvg(armR, 'R', 'back'));
    // legs
    var legs = p.legs || 'pants', hip = B.hip, k = B.k, ll = '';
    var legSkin = p.tights || skin;
    if (legs === 'pants') {
      ll += path('M' + n(-B.ww) + ' ' + n(hip) + 'L' + n(-B.ww + 1) + ' -4L-1.5 -4L0 ' + n(hip + 10 * k) + 'L1.5 -4L' + n(B.ww - 1) + ' -4L' + n(B.ww) + ' ' + n(hip) + 'Z', patFill({ pat: p.lpat, pc: p.lpc }, lc));
    } else if (legs === 'shorts') {
      var sb = hip + 22 * k;
      ll += rect(-B.ww + 3, sb - 2, 7.5 * k, -sb - 2, legSkin) + rect(B.ww - 3 - 7.5 * k, sb - 2, 7.5 * k, -sb - 2, legSkin);
      ll += path('M' + n(-B.ww) + ' ' + n(hip) + 'L' + n(-B.ww - 1) + ' ' + n(sb) + 'L-1 ' + n(sb) + 'L0 ' + n(hip + 8 * k) + 'L1 ' + n(sb) + 'L' + n(B.ww + 1) + ' ' + n(sb) + 'L' + n(B.ww) + ' ' + n(hip) + 'Z', lc);
    } else {
      var hem = legs === 'dress' ? hip + 26 * k : hip + 24 * k;
      ll += rect(-B.ww + 3.5, hem - 4, 6.5 * k, -hem, legSkin) + rect(B.ww - 3.5 - 6.5 * k, hem - 4, 6.5 * k, -hem, legSkin);
      var sc = legs === 'dress' ? topFill : patFill({ pat: p.lpat, pc: p.lpc }, lc);
      ll += path('M' + n(-B.ww + 1) + ' ' + n(hip - 3) + 'L' + n(-B.ww - 8 * k) + ' ' + n(hem) + 'Q0 ' + n(hem + 4) + ' ' + n(B.ww + 8 * k) + ' ' + n(hem) + 'L' + n(B.ww - 1) + ' ' + n(hip - 3) + 'Z', sc);
    }
    if (has(mk, 'mud') && arg(mk, 'mud', 1) === 'knees') ll += g(circ(-7, hip + 24 * k, 3.4, '#6b4a2a', { st: 0, op: 0.9 }) + circ(7.5, hip + 26 * k, 2.6, '#6b4a2a', { st: 0, op: 0.85 }), { p: P('knees') });
    if (has(mk, 'grass')) ll += g(circ(-7, hip + 24 * k, 3.4, '#4f9a3a', { st: 0, op: 0.85 }) + circ(7.5, hip + 25 * k, 3, '#4f9a3a', { st: 0, op: 0.8 }), { p: P('knees') });
    out.push(g(ll, { p: P('legs') }));
    out.push(g(shoes(p, B), { p: P('shoes') }));
    // coat tails behind torso bottom
    if (p.coat) out.push(path('M' + n(-B.sw) + ' ' + n(B.sh + 2) + 'L' + n(-B.ww - 5) + ' ' + n(hip + 22 * k) + 'L' + n(B.ww + 5) + ' ' + n(hip + 22 * k) + 'L' + n(B.sw) + ' ' + n(B.sh + 2) + 'Z', p.coat));
    // torso
    var tor = 'M' + n(-B.sw) + ' ' + n(B.sh + 5) + 'Q' + n(-B.sw) + ' ' + n(B.sh) + ' ' + n(-B.sw + 5) + ' ' + n(B.sh) + 'L' + n(B.sw - 5) + ' ' + n(B.sh) + 'Q' + n(B.sw) + ' ' + n(B.sh) + ' ' + n(B.sw) + ' ' + n(B.sh + 5) + 'L' + n(B.ww) + ' ' + n(hip + 2) + 'L' + n(-B.ww) + ' ' + n(hip + 2) + 'Z';
    var tb = path(tor, topFill);
    if (p.coat) {
      tb += path('M' + n(-B.sw) + ' ' + n(B.sh + 5) + 'Q' + n(-B.sw) + ' ' + n(B.sh) + ' ' + n(-B.sw + 5) + ' ' + n(B.sh) + 'L-4 ' + n(B.sh) + 'L-3 ' + n(hip + 22 * k) + 'L' + n(-B.ww - 5) + ' ' + n(hip + 22 * k) + 'Z', p.coat);
      tb += path('M' + n(B.sw) + ' ' + n(B.sh + 5) + 'Q' + n(B.sw) + ' ' + n(B.sh) + ' ' + n(B.sw - 5) + ' ' + n(B.sh) + 'L4 ' + n(B.sh) + 'L3 ' + n(hip + 22 * k) + 'L' + n(B.ww + 5) + ' ' + n(hip + 22 * k) + 'Z', p.coat);
      if (p.coatBtn) { var cb = ''; for (var bi = 0; bi < (p.coatBtns || 3); bi++) { var by = B.sh + 12 + bi * 10 * k; cb += p.coatMiss === bi ? path('M-6 ' + n(by - 1) + 'q1.5 2 -0.5 3.4q-1 1 0.6 2', 'none', { st: shade(p.coat, -0.4), sw: 0.7 }) : circ(-6, by, 1.6, p.coatBtn, { sw: 0.5 }); } tb += g(cb, { p: P('buttons') }); }
    }
    if (p.apron) tb += path('M-8 ' + n(B.sh + 8) + 'L8 ' + n(B.sh + 8) + 'L' + n(B.ww - 1) + ' ' + n(hip + 16 * k) + 'L' + n(-B.ww + 1) + ' ' + n(hip + 16 * k) + 'Z', p.apron) + line(-8, B.sh + 8, -B.sw + 4, B.sh + 1, p.apron, 1.5) + line(8, B.sh + 8, B.sw - 4, B.sh + 1, p.apron, 1.5);
    if (p.vest) tb += path('M' + n(-B.sw + 1) + ' ' + n(B.sh + 4) + 'L-3 ' + n(B.sh + 20) + 'L-3 ' + n(hip + 2) + 'L' + n(-B.ww) + ' ' + n(hip + 2) + 'Z', p.vest) + path('M' + n(B.sw - 1) + ' ' + n(B.sh + 4) + 'L3 ' + n(B.sh + 20) + 'L3 ' + n(hip + 2) + 'L' + n(B.ww) + ' ' + n(hip + 2) + 'Z', p.vest);
    if (p.belt) tb += rect(-B.ww, hip - 3, B.ww * 2, 4, p.belt, { sw: 0.8 });
    if (p.buttons) for (var bj = 0; bj < p.buttons; bj++) tb += circ(0, B.sh + 8 + bj * 8 * k, 1.3, p.btnc || '#f2e3b0', { sw: 0.5 });
    if (p.logo) tb += g(logoMark(p.logo, 5.5), { x: B.sw - 7, y: B.sh + 10 });
    out.push(g(tb, { p: P('body') }));
    // accessories on the chest
    var ch = '';
    if (has(acc, 'tie')) ch += path('M-2 ' + n(B.sh + 1) + 'L2 ' + n(B.sh + 1) + 'L3 ' + n(B.sh + 22) + 'L0 ' + n(B.sh + 26) + 'L-3 ' + n(B.sh + 22) + 'Z', arg(acc, 'tie', 1, '#b02a3a'), { sw: 0.9 });
    if (has(acc, 'bowtie')) ch += path('M0 ' + n(B.sh + 2) + 'L-6 ' + n(B.sh - 1) + 'L-6 ' + n(B.sh + 5) + 'ZM0 ' + n(B.sh + 2) + 'L6 ' + n(B.sh - 1) + 'L6 ' + n(B.sh + 5) + 'Z', arg(acc, 'bowtie', 1, '#b02a3a'), { sw: 0.8 });
    if (has(acc, 'necklace')) ch += path('M-5 ' + n(B.sh) + 'Q0 ' + n(B.sh + 8) + ' 5 ' + n(B.sh), 'none', { st: arg(acc, 'necklace', 1, '#e8c34a'), sw: 1.1 }) + circ(0, B.sh + 6, 1.6, arg(acc, 'necklace', 1, '#e8c34a'), { sw: 0.5 });
    if (has(acc, 'badge')) ch += g(g(rect(-4, -2.75, 8, 5.5, arg(acc, 'badge', 1, '#ffffff'), { sw: 0.7, rx: 0.8 }) + (arg(acc, 'badge', 2) ? logoMark(arg(acc, 'badge', 2), 2.2) : ''), { x: B.sw - 8, y: B.sh + 10, s: +arg(acc, 'badge', 3, 1) }), { p: P('badge') });
    if (has(acc, 'bag')) ch += line(-B.sw + 4, B.sh + 1, B.ww + 4, hip - 2, arg(acc, 'bag', 1, '#7a4a2a'), 1.8) + rect(B.ww, hip - 6, 11 * k, 9 * k, arg(acc, 'bag', 1, '#7a4a2a'), { rx: 2 });
    if (has(acc, 'backpack')) ch += line(-B.sw + 5, B.sh + 1, -B.sw + 6, B.sh + 20, arg(acc, 'backpack', 1, '#c0392b'), 2.4) + line(B.sw - 5, B.sh + 1, B.sw - 6, B.sh + 20, arg(acc, 'backpack', 1, '#c0392b'), 2.4);
    if (has(acc, 'flower')) ch += g(flowerHead(arg(acc, 'flower', 1, '#e04a6a'), 2.4), { x: -B.sw + 7, y: B.sh + 6 });
    if (has(acc, 'pocket')) ch += rect(-B.sw + 5, B.sh + 8, 7, 6, shade(top, -0.12), { sw: 0.7 });
    if (has(acc, 'pen')) ch += line(-B.sw + 7, B.sh + 5, -B.sw + 7, B.sh + 11, arg(acc, 'pen', 1, '#1f4fbf'), 1.4);
    if (has(acc, 'scarf')) { var scf = arg(acc, 'scarf', 1, '#c0392b'); ch += rect(-B.sw + 3, B.sh - 3, B.sw * 2 - 6, 6.5, scf, { rx: 3 }) + rect(B.sw - 10, B.sh + 2, 6, 15 * k, scf, { rx: 1.5 }); }
    if (ch) out.push(ch);
    // marks on the body
    var mb = '';
    argsAll(mk, 'paint').forEach(function (a) {
      var col = a[1] || '#3aa65a', where = a[2] || 'elbowR', pt = where === 'elbowR' ? armR.e : where === 'elbowL' ? armL.e : where === 'handR' ? armR.h : where === 'handL' ? armL.h : where === 'chest' ? [0, B.sh + 14] : where === 'knee' ? [-6, hip + 24 * k] : armR.e;
      var s = '';
      if (a[3] === 'stripes') for (var si = -1; si <= 1; si++) s += rect(pt[0] - 4.5, pt[1] - 1.1 + si * 3.4, 9, 1.8, col, { st: 0, rx: 0.8 });
      else if (a[3] === 'vstripes') for (var sv = -1; sv <= 1; sv++) s += rect(pt[0] - 1 + sv * 3.6, pt[1] - 4.5, 2.1, 9, col, { st: 0, rx: 0.8 });
      else s += path('M' + n(pt[0] - 3) + ' ' + n(pt[1] - 2) + 'q3 -2 5 0q2 3 -1 4q-3 2 -4 -1z', col, { st: 0 });
      mb += g(s, { p: P('paint') });
    });
    if (has(mk, 'crumbs')) { var R1 = rng(7); var cs = ''; for (var ci = 0; ci < 7; ci++) cs += circ(-6 + R1() * 12, B.sh + 8 + R1() * 16, 0.9 + R1() * 0.5, '#b07a3a', { st: 0 }); mb += g(cs, { p: P('crumbs') }); }
    if (has(mk, 'flour')) mb += g(circ(-5, B.sh + 16, 3.2, '#fff', { st: 0, op: 0.85 }) + circ(3, B.sh + 22, 2.2, '#fff', { st: 0, op: 0.8 }), { p: P('flour') });
    if (has(mk, 'wet')) mb += g(path('M' + n(-B.sw) + ' ' + n(B.sh + 5) + 'Q' + n(-B.sw + 5) + ' ' + n(B.sh - 1) + ' -4 ' + n(B.sh + 1) + 'L-5 ' + n(B.sh + 8) + 'Q' + n(-B.sw + 4) + ' ' + n(B.sh + 10) + ' ' + n(-B.sw) + ' ' + n(B.sh + 12) + 'Z', '#1b3a6b', { st: 0, op: 0.28 }) + path('M' + n(B.sw) + ' ' + n(B.sh + 5) + 'Q' + n(B.sw - 5) + ' ' + n(B.sh - 1) + ' 4 ' + n(B.sh + 1) + 'L5 ' + n(B.sh + 8) + 'Q' + n(B.sw - 4) + ' ' + n(B.sh + 10) + ' ' + n(B.sw) + ' ' + n(B.sh + 12) + 'Z', '#1b3a6b', { st: 0, op: 0.28 }), { p: P('wetback') });
    // arms in front, then marks on the clothes (paint on an elbow sits on the sleeve)
    if ((p.armL || 'down') !== 'back') out.push(armSvg(armL, 'L', p.armL));
    if ((p.armR || 'down') !== 'back') out.push(armSvg(armR, 'R', p.armR));
    if (mb) out.push(mb);
    if (p.holdL) out.push(g(held(p.holdL, p), { x: armL.h[0], y: armL.h[1], p: P('holdL') }));
    if (p.holdR) out.push(g(held(p.holdR, p), { x: armR.h[0], y: armR.h[1], p: P('holdR'), fx: false }));
    // head
    out.push(head(p, B, skin, hc, P));
    var tagY = p.tagY != null ? p.tagY : 13;
    if (p.name) out.push(nameTag(0, tagY / (p.s || 1), p.name, 1 / (p.s || 1)));
    return g(out.join(''), { x: p.x, y: p.y, s: p.s, id: p.id, a: p.id ? 'data-kind="person"' : '' });
  }
  function nameTag(x, y, t, sc) {
    var w = Math.max(24, String(t).length * 5.6 + 10);
    return g(rect(-w / 2, -6.5, w, 13, '#fbf6e6', { rx: 2, sw: 0.9 }) + circ(-w / 2 + 4, 0, 1.2, '#c9b98f', { st: 0 }) + text(1.5, 3.8, t, { size: 10.5, fill: '#2b2433' }), { x: x, y: y, s: sc || 1, a: 'data-tag="1"' });
  }
  function hairLayer(p, B, hc, layer) {
    var st = p.hair || 'short', y = B.hy, r = B.hr, s = '';
    if (layer === 'back') {
      if (st === 'long' || st === 'longcurly') s = path('M' + n(-r - 1.5) + ' ' + n(y - 3) + 'Q' + n(-r - 3) + ' ' + n(y + 26) + ' ' + n(-r + 2) + ' ' + n(y + 30) + 'L' + n(r - 2) + ' ' + n(y + 30) + 'Q' + n(r + 3) + ' ' + n(y + 26) + ' ' + n(r + 1.5) + ' ' + n(y - 3) + 'Z', hc);
      else if (st === 'bob') s = path('M' + n(-r - 2) + ' ' + n(y - 3) + 'Q' + n(-r - 3) + ' ' + n(y + 12) + ' ' + n(-r + 1) + ' ' + n(y + 14) + 'L' + n(r - 1) + ' ' + n(y + 14) + 'Q' + n(r + 3) + ' ' + n(y + 12) + ' ' + n(r + 2) + ' ' + n(y - 3) + 'Z', hc);
      else if (st === 'pony') s = path('M' + n(r - 2) + ' ' + n(y - 8) + 'Q' + n(r + 12) + ' ' + n(y - 6) + ' ' + n(r + 9) + ' ' + n(y + 16) + 'Q' + n(r + 4) + ' ' + n(y + 6) + ' ' + n(r - 2) + ' ' + n(y - 2) + 'Z', hc) + circ(r - 1, y - 7, 2.2, p.bow || '#e04a6a', { sw: 0.8 });
      else if (st === 'afro') s = circ(0, y - 3, r + 7, hc);
      else if (st === 'bun') s = circ(0, y - r - 4, 6, hc);
      else if (st === 'pigtails') s = ell(-r - 4, y + 2, 4.5, 8, hc) + ell(r + 4, y + 2, 4.5, 8, hc);
    }
    return s;
  }
  function head(p, B, skin, hc, P) {
    var y = B.hy, r = B.hr, s = '', st = p.hair || 'short', acc = p.acc || [], mk = p.marks || [];
    s += rect(-3.6, y + r - 3, 7.2, 6, skin, { sw: 1 });
    s += circ(-r + 0.3, y + 1, 3, skin, { sw: 1 }) + circ(r - 0.3, y + 1, 3, skin, { sw: 1 });
    if (has(acc, 'notchL')) s += g(path('M' + n(-r - 3.2) + ' ' + n(y - 1.2) + 'l2.6 1.7 -2.6 1.5z', arg(acc, 'notchL', 1, '#fff'), { st: 0 }), { p: P('earL') });
    if (has(acc, 'notchR')) s += g(path('M' + n(r + 3.2) + ' ' + n(y - 1.2) + 'l-2.6 1.7 2.6 1.5z', arg(acc, 'notchR', 1, '#fff'), { st: 0 }), { p: P('earR') });
    if (has(acc, 'earrings')) s += circ(-r + 0.3, y + 4.5, 1.2, arg(acc, 'earrings', 1, '#e8c34a'), { sw: 0.5 }) + circ(r - 0.3, y + 4.5, 1.2, arg(acc, 'earrings', 1, '#e8c34a'), { sw: 0.5 });
    s += circ(0, y, r, skin);
    // face
    var f = '', ex = 4.6, ey = y - 0.5, look = p.eyes === 'side' ? 1.4 : p.eyes === 'sideL' ? -1.4 : 0;
    if (p.eyes === 'closed') f += path('M' + n(-ex - 1.8) + ' ' + n(ey) + 'q1.8 1.6 3.6 0M' + n(ex - 1.8) + ' ' + n(ey) + 'q1.8 1.6 3.6 0', 'none', { sw: 1 });
    else {
      var er = p.eyes === 'wide' ? 2 : 1.55, ic = p.eyec;
      if (ic) f += circ(-ex + look, ey, er + 0.7, '#fff', { sw: 0.5 }) + circ(ex + look, ey, er + 0.7, '#fff', { sw: 0.5 }) + circ(-ex + look, ey, er, ic, { st: 0 }) + circ(ex + look, ey, er, ic, { st: 0 }) + circ(-ex + look, ey, er * 0.45, '#111', { st: 0 }) + circ(ex + look, ey, er * 0.45, '#111', { st: 0 });
      else f += circ(-ex + look, ey, er, '#2b2433', { st: 0 }) + circ(ex + look, ey, er, '#2b2433', { st: 0 });
    }
    f += path('M' + n(-ex - 2.2) + ' ' + n(ey - 4) + 'q2.2 -1.4 4.4 0M' + n(ex - 2.2) + ' ' + n(ey - 4) + 'q2.2 -1.4 4.4 0', 'none', { st: shade(hc, -0.2), sw: 1.1 });
    f += path('M-0.6 ' + n(y + 1) + 'q1.6 2 0 3', 'none', { st: shade(skin, -0.35), sw: 0.9 });
    var my = y + 6.5, m = p.mouth || 'smile';
    if (p.lips) f += g(path('M-3.6 ' + n(my - 0.4) + 'q1.8 -1.6 3.6 -0.4q1.8 -1.2 3.6 0.4q-1.6 2.6 -3.6 2.6q-2 0 -3.6 -2.6z', p.lips, { sw: 0.7 }), { p: P('lips') });
    else if (m === 'smile') f += path('M-3.4 ' + n(my - 0.6) + 'q3.4 3 6.8 0', 'none', { sw: 1.1 });
    else if (m === 'grin') f += path('M-4 ' + n(my - 1) + 'q4 5.5 8 0z', '#fff', { sw: 1 });
    else if (m === 'o') f += ell(0, my + 0.5, 1.8, 2.2, '#5a2a2a', { sw: 0.8 });
    else if (m === 'frown') f += path('M-3.2 ' + n(my + 1.4) + 'q3.2 -2.6 6.4 0', 'none', { sw: 1.1 });
    else if (m === 'smirk') f += path('M-2.6 ' + n(my + 0.6) + 'q3.8 1.2 5.6 -1.4', 'none', { sw: 1.1 });
    else f += line(-2.8, my + 0.6, 2.8, my + 0.6, OL, 1.1);
    if (p.blush !== false) f += circ(-7.5, y + 3.5, 2.2, '#ff8a8a', { st: 0, op: 0.28 }) + circ(7.5, y + 3.5, 2.2, '#ff8a8a', { st: 0, op: 0.28 });
    if (has(acc, 'freckles')) for (var fi = 0; fi < 3; fi++) f += circ(-8 + fi * 1.6, y + 2 + (fi % 2), 0.45, '#9a5a3a', { st: 0 }) + circ(5 + fi * 1.6, y + 2 + (fi % 2), 0.45, '#9a5a3a', { st: 0 });
    if (has(acc, 'scar')) f += g(path('M' + n(arg(acc, 'scar', 1, 'L') === 'L' ? -8 : 5) + ' ' + n(y - 6) + 'l3 4M' + n(arg(acc, 'scar', 1, 'L') === 'L' ? -8.6 : 4.4) + ' ' + n(y - 4.2) + 'l2 -1', 'none', { st: '#a8584a', sw: 0.8 }), { p: P('scar') });
    if (has(acc, 'plaster')) f += g(rect(4, y + 1, 5, 2.6, '#f0c89a', { sw: 0.6, rx: 1, a: 'transform="rotate(-25 6 ' + n(y + 2) + ')"' }), { p: P('plaster') });
    // marks on the face
    if (has(mk, 'choc')) f += g(path('M' + n(2.2) + ' ' + n(my - 0.6) + 'q2.4 -0.6 2.8 1.4q-0.8 1.8 -2.8 0.6z', '#5a2d14', { st: 0 }) + circ(5.6, my + 2.4, 0.8, '#5a2d14', { st: 0 }), { p: P('mouth') });
    if (has(mk, 'milk')) f += g(path('M-4.6 ' + n(my - 2.2) + 'q4.6 -1.8 9.2 0q-1 1.4 -2 0.6q-1.2 1.3 -2.6 0.4q-1.3 1.1 -2.6 0.2q-1.1 0.9 -2 -1.2z', '#ffffff', { st: '#c9c4bd', sw: 0.5 }), { p: P('mouth') });
    if (has(mk, 'paint') && argsAll(mk, 'paint').some(function (a) { return a[2] === 'cheek'; })) {
      var pc = argsAll(mk, 'paint').filter(function (a) { return a[2] === 'cheek'; })[0][1];
      f += g(path('M-9 ' + n(y + 1) + 'q2 -1.5 4 0q0.5 2.5 -2 2.8q-2.4 -0.4 -2 -2.8z', pc, { st: 0 }), { p: P('cheek') });
    }
    if (p.stache) f += g(path('M-5.6 ' + n(my - 1.4) + 'q2.8 -3 5.6 -0.6q2.8 -2.4 5.6 0.6q-2.8 1.4 -5.6 0q-2.8 1.4 -5.6 0z', p.stachec || hc, { sw: 0.7 }), { p: P('stache') });
    if (p.beard) f += g(path('M' + n(-r + 1) + ' ' + n(y + 1) + 'Q' + n(-r + 2) + ' ' + n(y + r + 6) + ' 0 ' + n(y + r + 7) + 'Q' + n(r - 2) + ' ' + n(y + r + 6) + ' ' + n(r - 1) + ' ' + n(y + 1) + 'Q' + n(r - 4) + ' ' + n(y + 7) + ' 4 ' + n(my + 1.5) + 'Q0 ' + n(my + 3) + ' -4 ' + n(my + 1.5) + 'Q' + n(-r + 4) + ' ' + n(y + 7) + ' ' + n(-r + 1) + ' ' + n(y + 1) + 'Z', p.beardc || hc, { sw: 0.9 }), { p: P('beard') });
    if (has(acc, 'mole')) { var mside = arg(acc, 'mole', 1, 'L'); f += g(circ(mside === 'L' ? -6.8 : 6.8, y + 3.4, +arg(acc, 'mole', 2, 0.95), '#3a2418', { st: 0 }), { p: P('mole') }); }
    s += g(f, { p: P('face') });
    // hair (front)
    s += hairFront(p, y, r, hc);
    // glasses
    if (p.glasses) {
      var gl = '';
      if (p.glasses === 'square') gl = rect(-ex - 3.6, ey - 2.8, 7.2, 5.6, 'rgba(220,235,255,.25)', { sw: 1.1, rx: 1 }) + rect(ex - 3.6, ey - 2.8, 7.2, 5.6, 'rgba(220,235,255,.25)', { sw: 1.1, rx: 1 });
      else if (p.glasses === 'sun') gl = rect(-ex - 3.8, ey - 2.6, 7.6, 5, '#1d1d26', { sw: 1, rx: 2 }) + rect(ex - 3.8, ey - 2.6, 7.6, 5, '#1d1d26', { sw: 1, rx: 2 });
      else gl = circ(-ex, ey, 3.5, 'rgba(220,235,255,.25)', { sw: 1.1 }) + circ(ex, ey, 3.5, 'rgba(220,235,255,.25)', { sw: 1.1 });
      gl += line(-ex + 3.4, ey - 0.6, ex - 3.4, ey - 0.6, OL, 1);
      s += g(gl, { p: P('glasses') });
    }
    if (p.hat) s += g(hat(p.hat, p.hatc, y, r, p), { p: P('hat') });
    // weather on the head
    if (has(mk, 'wet')) { var dr = ''; [[-r - 2, y + 9], [r + 3, y + 13], [-r + 1, y + 19], [r - 1, y + 22]].forEach(function (d) { dr += path('M' + n(d[0]) + ' ' + n(d[1] - 2.6) + 'q1.6 2.4 1.6 3.4a1.6 1.6 0 0 1 -3.2 0q0 -1 1.6 -3.4z', '#7fc4f2', { st: '#3a7fb8', sw: 0.6 }); }); s += g(dr, { p: P('drips') }); }
    if (has(mk, 'snow')) s += g(ell(-4, y - r + 1, 6, 2.6, '#fff', { sw: 0.6 }) + ell(5, y - r + 2, 4, 2, '#fff', { sw: 0.6 }), { p: P('snowhead') });
    return g(s, { p: P('head') });
  }
  function hairFront(p, y, r, hc) {
    var st = p.hair || 'short', s = '';
    var cap = 'M' + n(-r - 0.6) + ' ' + n(y + 1) + 'Q' + n(-r - 1) + ' ' + n(y - r - 2) + ' 0 ' + n(y - r - 1.6) + 'Q' + n(r + 1) + ' ' + n(y - r - 2) + ' ' + n(r + 0.6) + ' ' + n(y + 1);
    if (st === 'bald') return path('M' + n(-r - 0.4) + ' ' + n(y + 1) + 'Q' + n(-r - 1) + ' ' + n(y - 6) + ' ' + n(-r + 4) + ' ' + n(y - 8) + 'L' + n(-r + 3) + ' ' + n(y - 1) + 'Z', hc, { sw: 0.9 }) + path('M' + n(r + 0.4) + ' ' + n(y + 1) + 'Q' + n(r + 1) + ' ' + n(y - 6) + ' ' + n(r - 4) + ' ' + n(y - 8) + 'L' + n(r - 3) + ' ' + n(y - 1) + 'Z', hc, { sw: 0.9 });
    if (st === 'spiky') return path('M' + n(-r - 0.6) + ' ' + n(y - 1) + 'L' + n(-r + 1) + ' ' + n(y - r - 2) + 'L-6 ' + n(y - r + 1) + 'L-3 ' + n(y - r - 5) + 'L0 ' + n(y - r) + 'L3 ' + n(y - r - 5) + 'L6 ' + n(y - r + 1) + 'L' + n(r - 1) + ' ' + n(y - r - 2) + 'L' + n(r + 0.6) + ' ' + n(y - 1) + 'Q' + n(r - 3) + ' ' + n(y - 8) + ' 0 ' + n(y - 7) + 'Q' + n(-r + 3) + ' ' + n(y - 8) + ' ' + n(-r - 0.6) + ' ' + n(y - 1) + 'Z', hc);
    if (st === 'curly' || st === 'afro' || st === 'longcurly') {
      var cs = '', R2 = rng(3);
      for (var a = -170; a <= -10; a += 22) { var t = a * Math.PI / 180; cs += circ(Math.cos(t) * (r - 0.5), y + Math.sin(t) * (r - 0.5) - 1, 4.4 + R2() * 0.8, hc); }
      if (st === 'longcurly') [[-r - 1, y + 6], [-r, y + 13], [-r - 1.5, y + 20], [r + 1, y + 6], [r, y + 13], [r + 1.5, y + 20]].forEach(function (q) { cs += circ(q[0], q[1], 3.8, hc); });
      return cs;
    }
    // a cap of hair with a fringe; long/bob/pony/bun/pigtails/braids/short/side all start here
    var fr = st === 'side' ? 'Q' + n(r - 2) + ' ' + n(y - 4) + ' ' + n(-2) + ' ' + n(y - 7) + 'Q' + n(-r + 2) + ' ' + n(y - 6) + ' ' + n(-r - 0.6) + ' ' + n(y + 1) + 'Z'
      : st === 'long' || st === 'bob' ? 'Q' + n(r - 1) + ' ' + n(y - 6) + ' ' + n(4) + ' ' + n(y - 6) + 'Q0 ' + n(y - 9) + ' -4 ' + n(y - 6) + 'Q' + n(-r + 1) + ' ' + n(y - 6) + ' ' + n(-r - 0.6) + ' ' + n(y + 1) + 'Z'
      : 'Q' + n(r - 3) + ' ' + n(y - 7) + ' ' + n(3) + ' ' + n(y - 6.5) + 'Q-1 ' + n(y - 9) + ' -5 ' + n(y - 6) + 'Q' + n(-r + 2) + ' ' + n(y - 7) + ' ' + n(-r - 0.6) + ' ' + n(y + 1) + 'Z';
    s += path(cap + fr, hc);
    if (st === 'long' || st === 'bob') s += path('M' + n(-r - 0.6) + ' ' + n(y) + 'Q' + n(-r - 1.5) + ' ' + n(y + 8) + ' ' + n(-r + 1) + ' ' + n(y + (st === 'bob' ? 12 : 16)) + 'L' + n(-r + 2) + ' ' + n(y + 1) + 'Z', hc, { sw: 0.9 }) + path('M' + n(r + 0.6) + ' ' + n(y) + 'Q' + n(r + 1.5) + ' ' + n(y + 8) + ' ' + n(r - 1) + ' ' + n(y + (st === 'bob' ? 12 : 16)) + 'L' + n(r - 2) + ' ' + n(y + 1) + 'Z', hc, { sw: 0.9 });
    if (st === 'braids') s += path('M' + n(-r + 1) + ' ' + n(y + 2) + 'q-2 8 0 16q-1 6 0 10', 'none', { st: hc, sw: 4.2 }) + path('M' + n(r - 1) + ' ' + n(y + 2) + 'q2 8 0 16q1 6 0 10', 'none', { st: hc, sw: 4.2 }) + circ(-r + 1, y + 28, 1.8, p.bow || '#e04a6a', { sw: 0.6 }) + circ(r - 1, y + 28, 1.8, p.bow || '#e04a6a', { sw: 0.6 });
    return s;
  }
  function hat(kind, col, y, r, p) {
    var c = col || '#2f3a5a', top = y - r + 2;
    switch (kind) {
      case 'cap': return path('M' + n(-r - 0.5) + ' ' + n(y - 3) + 'Q' + n(-r) + ' ' + n(top - 9) + ' 0 ' + n(top - 9) + 'Q' + n(r) + ' ' + n(top - 9) + ' ' + n(r + 0.5) + ' ' + n(y - 3) + 'Z', c) + path('M' + n(r - 2) + ' ' + n(y - 4) + 'Q' + n(r + 9) + ' ' + n(y - 6) + ' ' + n(r + 12) + ' ' + n(y - 2) + 'L' + n(r - 2) + ' ' + n(y - 1) + 'Z', shade(c, -0.15)) + (p.capLogo ? g(logoMark(p.capLogo, 3), { x: -2, y: top - 3 }) : '');
      case 'beanie': return path('M' + n(-r - 0.8) + ' ' + n(y - 2) + 'Q' + n(-r) + ' ' + n(top - 11) + ' 0 ' + n(top - 11) + 'Q' + n(r) + ' ' + n(top - 11) + ' ' + n(r + 0.8) + ' ' + n(y - 2) + 'Z', c) + rect(-r - 1, y - 6, r * 2 + 2, 5, shade(c, -0.15), { rx: 2 }) + circ(0, top - 12, 3.4, p.pom || '#f4f0e6');
      case 'top': return rect(-r - 6, y - r + 1, r * 2 + 12, 3.6, c, { rx: 1.5 }) + rect(-r + 2, y - r - 20, r * 2 - 4, 22, c) + rect(-r + 2, y - r - 3, r * 2 - 4, 3.5, p.band || '#8a2a3a', { sw: 0.8 });
      case 'bowler': return rect(-r - 4, y - r + 1, r * 2 + 8, 3.2, c, { rx: 1.5 }) + path('M' + n(-r + 1) + ' ' + n(y - r + 2) + 'Q' + n(-r + 1) + ' ' + n(y - r - 13) + ' 0 ' + n(y - r - 13) + 'Q' + n(r - 1) + ' ' + n(y - r - 13) + ' ' + n(r - 1) + ' ' + n(y - r + 2) + 'Z', c);
      case 'chef': return rect(-r + 1, y - r - 4, r * 2 - 2, 7, '#fff') + circ(-6, y - r - 9, 6.5, '#fff') + circ(5, y - r - 10, 7, '#fff') + circ(0, y - r - 14, 6, '#fff');
      case 'party': return path('M' + n(-8) + ' ' + n(y - r + 3) + 'L0 ' + n(y - r - 20) + 'L8 ' + n(y - r + 3) + 'Z', c) + line(-4, y - r - 6, 4, y - r - 4, '#fff', 1.6) + circ(0, y - r - 21, 2.4, '#ffd23f');
      case 'hard': return path('M' + n(-r - 1.5) + ' ' + n(y - 3) + 'Q' + n(-r) + ' ' + n(top - 10) + ' 0 ' + n(top - 10) + 'Q' + n(r) + ' ' + n(top - 10) + ' ' + n(r + 1.5) + ' ' + n(y - 3) + 'Z', c || '#f2c230') + rect(-r - 4, y - 4.5, r * 2 + 8, 3.2, c || '#f2c230', { rx: 1.5 }) + line(0, top - 9, 0, y - 5, shade(c || '#f2c230', -0.2), 1.6);
      case 'sun': return ell(0, y - r + 2, r + 12, 4, c) + path('M' + n(-r + 1) + ' ' + n(y - r + 2) + 'Q' + n(-r + 2) + ' ' + n(y - r - 11) + ' 0 ' + n(y - r - 11) + 'Q' + n(r - 2) + ' ' + n(y - r - 11) + ' ' + n(r - 1) + ' ' + n(y - r + 2) + 'Z', c) + rect(-r + 1, y - r - 2, r * 2 - 2, 3, p.band || '#c0392b', { sw: 0.7 });
      case 'beret': return ell(-2, y - r + 1, r + 3, 5.5, c) + circ(-2, y - r - 4, 1.4, c);
      case 'hood': return path('M' + n(-r - 4) + ' ' + n(y + r) + 'Q' + n(-r - 6) + ' ' + n(y - r - 6) + ' 0 ' + n(y - r - 6) + 'Q' + n(r + 6) + ' ' + n(y - r - 6) + ' ' + n(r + 4) + ' ' + n(y + r) + 'L' + n(r - 1) + ' ' + n(y + r - 2) + 'Q' + n(r) + ' ' + n(y - r + 1) + ' 0 ' + n(y - r + 1) + 'Q' + n(-r) + ' ' + n(y - r + 1) + ' ' + n(-r + 1) + ' ' + n(y + r - 2) + 'Z', c);
      case 'crown': return path('M' + n(-r + 2) + ' ' + n(y - r + 3) + 'L' + n(-r + 1) + ' ' + n(y - r - 8) + 'L-4 ' + n(y - r - 2) + 'L0 ' + n(y - r - 10) + 'L4 ' + n(y - r - 2) + 'L' + n(r - 1) + ' ' + n(y - r - 8) + 'L' + n(r - 2) + ' ' + n(y - r + 3) + 'Z', '#e8c34a');
      case 'cowboy': return path('M' + n(-r - 12) + ' ' + n(y - r + 1) + 'Q0 ' + n(y - r + 7) + ' ' + n(r + 12) + ' ' + n(y - r + 1) + 'Q0 ' + n(y - r + 3) + ' ' + n(-r - 12) + ' ' + n(y - r + 1) + 'Z', c) + path('M' + n(-r + 1) + ' ' + n(y - r + 2) + 'L' + n(-r + 3) + ' ' + n(y - r - 12) + 'Q0 ' + n(y - r - 8) + ' ' + n(r - 3) + ' ' + n(y - r - 12) + 'L' + n(r - 1) + ' ' + n(y - r + 2) + 'Z', c);
      case 'helmet': return path('M' + n(-r - 1.5) + ' ' + n(y - 1) + 'Q' + n(-r - 1) + ' ' + n(top - 11) + ' 0 ' + n(top - 11) + 'Q' + n(r + 1) + ' ' + n(top - 11) + ' ' + n(r + 1.5) + ' ' + n(y - 1) + 'Z', c) + line(-4, top - 9, -3, top - 2, '#fff', 1.4, { op: 0.6 });
      case 'police': return rect(-r - 1, y - r - 4, r * 2 + 2, 7, c, { rx: 1 }) + path('M' + n(-r - 3) + ' ' + n(y - r - 4) + 'Q0 ' + n(y - r - 14) + ' ' + n(r + 3) + ' ' + n(y - r - 4) + 'Z', c) + path('M' + n(-r) + ' ' + n(y - r + 3) + 'Q0 ' + n(y - r + 8) + ' ' + n(r) + ' ' + n(y - r + 3) + 'Z', '#1d1d26') + circ(0, y - r - 4, 2.2, '#e8c34a', { sw: 0.6 });
      default: return '';
    }
  }
  function shoes(p, B) {
    var t = p.shoe || 'sneaker', c = p.shoes || '#3a3a46', s = '', mk = p.marks || [];
    var skin = p.skin != null && typeof p.skin === 'number' ? SKIN[p.skin] : p.skin || SKIN[0];
    [-1, 1].forEach(function (d) {
      // each shoe is drawn toe-right, then flipped for the left foot
      var x = d * (B.ww - 5), f = '';
      if (t === 'boot') f += path('M-5.5 -14L5.5 -14L5.5 -3Q10.5 -3 10.5 1.5L-6 1.5Z', c) + rect(-6, 0.4, 16.5, 2, shade(c, -0.35), { st: 0 });
      else if (t === 'heel') f += path('M-4 -3Q6 -4 7 1L-3 1L-4 4L-5 1Z', c);
      else if (t === 'sock') f += ell(1.5, 0, 7, 3.6, c) + (p.sockPat ? circ(-0.5, -0.5, 1, p.sockPat, { st: 0 }) + circ(4, 0.6, 1, p.sockPat, { st: 0 }) : '');
      else if (t === 'bare') f += ell(1.5, 0, 6.5, 3.2, skin);
      else if (t === 'slipper') f += ell(1.5, 0, 7.5, 3.8, c) + ell(1.5, -2, 4, 1.8, shade(c, 0.4), { st: 0 });
      else f += path('M-6 1.6Q-6 -5 0 -5Q8 -4.4 8.4 1.6Z', c) + line(-5.2, 0.6, 7.6, 0.6, p.sole || '#fff', 1.6);
      if (has(mk, 'mud') && arg(mk, 'mud', 1, 'shoes') === 'shoes') f += circ(2, -1, 2.4, '#6b4a2a', { st: 0, op: 0.95 }) + circ(-3, 0, 1.7, '#6b4a2a', { st: 0, op: 0.95 }) + circ(5, 0.5, 1.2, '#6b4a2a', { st: 0 });
      if (has(mk, 'soot')) f += circ(2, -1, 2.4, '#2a2a2e', { st: 0, op: 0.9 }) + circ(-3, 0, 1.7, '#2a2a2e', { st: 0, op: 0.9 });
      if (has(mk, 'sand')) f += circ(2, -1, 2.2, '#e3c27a', { st: 0 }) + circ(-3, 0.3, 1.5, '#e3c27a', { st: 0 });
      s += g(f, { x: x, y: -3, fx: d < 0 });
    });
    if (has(mk, 'puddle')) s = ell(0, 1, 26, 4.5, '#8cc3e6', { st: '#5a96c2', sw: 0.8, op: 0.75 }) + s;
    return s;
  }
  function flowerHead(c, r) { var s = ''; for (var a = 0; a < 5; a++) { var t = a * Math.PI * 2 / 5; s += circ(Math.cos(t) * r, Math.sin(t) * r, r * 0.8, c, { sw: 0.5 }); } return s + circ(0, 0, r * 0.6, '#ffd23f', { sw: 0.5 }); }
  // small company/club logos used on uniforms, vans, badges
  function logoMark(kind, r) {
    r = r || 4;
    if (kind === 'drop') return path('M0 ' + n(-r) + 'Q' + n(r * 0.9) + ' ' + n(-r * 0.1) + ' ' + n(r * 0.75) + ' ' + n(r * 0.4) + 'A' + n(r * 0.78) + ' ' + n(r * 0.78) + ' 0 0 1 ' + n(-r * 0.75) + ' ' + n(r * 0.4) + 'Q' + n(-r * 0.9) + ' ' + n(-r * 0.1) + ' 0 ' + n(-r) + 'Z', '#2f8fd6', { sw: r * 0.12 }) + line(-r * 0.32, r * 0.5, r * 0.3, -r * 0.2, '#fff', r * 0.22);
    if (kind === 'drop2') return path('M0 ' + n(-r) + 'Q' + n(r * 0.9) + ' ' + n(-r * 0.1) + ' ' + n(r * 0.75) + ' ' + n(r * 0.4) + 'A' + n(r * 0.78) + ' ' + n(r * 0.78) + ' 0 0 1 ' + n(-r * 0.75) + ' ' + n(r * 0.4) + 'Q' + n(-r * 0.9) + ' ' + n(-r * 0.1) + ' 0 ' + n(-r) + 'Z', '#2f8fd6', { sw: r * 0.12 }) + line(-r * 0.32, -r * 0.2, r * 0.3, r * 0.5, '#fff', r * 0.22);
    if (kind === 'flame') return path('M0 ' + n(-r) + 'Q' + n(r) + ' ' + n(-r * 0.2) + ' ' + n(r * 0.6) + ' ' + n(r * 0.6) + 'Q0 ' + n(r * 1.1) + ' ' + n(-r * 0.6) + ' ' + n(r * 0.6) + 'Q' + n(-r) + ' ' + n(-r * 0.2) + ' 0 ' + n(-r) + 'Z', '#e8662a', { sw: r * 0.12 });
    if (kind === 'star') return path('M0 ' + n(-r) + 'L' + n(r * 0.3) + ' ' + n(-r * 0.3) + 'L' + n(r) + ' ' + n(-r * 0.3) + 'L' + n(r * 0.45) + ' ' + n(r * 0.15) + 'L' + n(r * 0.65) + ' ' + n(r) + 'L0 ' + n(r * 0.5) + 'L' + n(-r * 0.65) + ' ' + n(r) + 'L' + n(-r * 0.45) + ' ' + n(r * 0.15) + 'L' + n(-r) + ' ' + n(-r * 0.3) + 'L' + n(-r * 0.3) + ' ' + n(-r * 0.3) + 'Z', '#ffd23f', { sw: r * 0.12 });
    return circ(0, 0, r, '#888');
  }
  // things held in a hand (drawn at the hand)
  function held(kind, p) {
    switch (kind) {
      case 'cup': return rect(-4, -8, 8, 9, '#fff', { rx: 1.5 }) + path('M4 -6q4 0 4 3t-4 3', 'none', { sw: 1.1 }) + path('M-1 -11q-1.5 -2 0 -4M2 -11q-1.5 -2 0 -4', 'none', { st: '#bbb', sw: 0.8 });
      case 'milk': return path('M-4 -10L4 -10L3.4 2L-3.4 2Z', 'rgba(230,240,250,.6)') + path('M-3.8 -6L3.8 -6L3.4 2L-3.4 2Z', '#fff', { st: 0 }) + path('M-4 -10L4 -10L3.4 2L-3.4 2Z', 'none');
      case 'book': return rect(-6, -9, 12, 10, '#7a3b8a', { rx: 1 }) + line(-6, -8, 6, -8, '#fff', 0.6, { op: 0.6 });
      case 'phone': return rect(-2.8, -8, 5.6, 9, '#22222c', { rx: 1 }) + rect(-2, -7, 4, 7, '#6fb6e8', { st: 0 });
      case 'umbrella': return line(0, 0, 0, -30, OL, 1.6) + path('M-3 -28Q0 -40 3 -28L4 -6Q0 -2 -4 -6Z', p.umbc || '#2b5aa8') + path('M0 0q0 4 3 4', 'none', { sw: 1.4 });
      case 'umbrellaWet': return line(0, 0, 0, -30, OL, 1.6) + path('M-3 -28Q0 -40 3 -28L4 -6Q0 -2 -4 -6Z', p.umbc || '#2b5aa8') + path('M0 0q0 4 3 4', 'none', { sw: 1.4 }) + path('M5 -4q1.4 2 1.4 3a1.4 1.4 0 0 1 -2.8 0q0 -1 1.4 -3zM-5 2q1.2 1.8 1.2 2.6a1.2 1.2 0 0 1 -2.4 0q0 -.8 1.2 -2.6z', '#7fc4f2', { st: '#3a7fb8', sw: 0.5 });
      case 'umbrellaDown': return path('M0 -4q-4 0 -4 4', 'none', { sw: 1.6 }) + line(0, -4, 0, 34, OL, 1.4) + path('M-2.6 4Q-5 16 -1.6 30L1.6 30Q5 16 2.6 4Z', p.umbc || '#2b5aa8') + line(0, 4, 0, 30, shade(p.umbc || '#2b5aa8', -0.25), 0.8) + (p.umbWet ? path('M2 33q1.3 2 1.3 3a1.3 1.3 0 0 1 -2.6 0q0 -1 1.3 -3z', '#7fc4f2', { st: '#3a7fb8', sw: 0.5 }) : '');
      case 'icepop': return rect(-3.2, -15, 6.4, 12, p.popc || '#4fc25a', { rx: 3 }) + rect(-0.8, -3, 1.6, 6, '#e3c27a', { sw: 0.6 });
      case 'icecream': return path('M-4 -4L0 6L4 -4Z', '#e3b56a') + circ(0, -7, 4.6, p.icc || '#f6b3c8');
      case 'balloon': return line(0, 0, 2, -34, '#555', 0.7) + ell(2, -44, 9, 11, p.balc || '#e0384a') + path('M0 -33l2 -2 2 2z', p.balc || '#e0384a', { sw: 0.6 });
      case 'cookie': return circ(0, -2, 4.5, '#d9a35a') + circ(-1.5, -3, 0.8, '#5a2d14', { st: 0 }) + circ(1.6, -1, 0.8, '#5a2d14', { st: 0 });
      case 'carrot': return path('M-2 -12L2 -12L0 2Z', '#f08a2a') + path('M-1 -12l-2 -4M1 -12l2 -4M0 -12v-5', 'none', { st: '#3f9a3a', sw: 1.2 });
      case 'apple': return circ(0, -3, 4.4, '#d33a3a') + line(0, -7, 1, -10, '#5a3a1a', 1);
      case 'key': return keyShape({ teeth: p.keyTeeth || [3, 1, 2], head: 'round', col: '#d8b64a' }, 0.6, -6, -2);
      case 'flower': return line(0, 0, 0, -16, '#3f9a3a', 1.4) + g(flowerHead(p.flc || '#e04a6a', 2.6), { x: 0, y: -17 });
      case 'bag': return path('M-7 0L7 0L6 -11L-6 -11Z', p.bagc || '#c98a3a') + path('M-3 -11q3 -5 6 0', 'none', { sw: 1.2 });
      case 'brush': return rect(-1, -16, 2, 13, '#c98a3a', { sw: 0.6 }) + rect(-2, -20, 4, 5, p.brushc || '#3aa65a', { sw: 0.6 });
      case 'leash': return path('M0 0q10 8 22 8', 'none', { st: p.leashc || '#c0392b', sw: 1.6 });
      case 'bat': return path('M-1.5 2L1.5 2L4 -30L-1 -30Z', '#c98a3a');
      case 'glove': return path('M-6 -2Q-7 -12 0 -12Q7 -12 6 -2Q0 2 -6 -2Z', '#a0622a');
      case 'ball': return circ(0, -4, 5, '#fff') + path('M-3 -8q2 4 0 8M3 -8q-2 4 0 8', 'none', { st: '#d33a3a', sw: 0.6 });
      case 'toolbox': return rect(-11, -2, 22, 12, p.tbc || '#c0392b', { rx: 1.5 }) + path('M-5 -2v-4h10v4', 'none', { sw: 1.4 }) + (p.tbLogo ? g(logoMark(p.tbLogo, 3.2), { x: 0, y: 4 }) : '');
      case 'clipboard': return rect(-6, -10, 12, 15, '#c98a3a', { rx: 1 }) + rect(-4.5, -7.5, 9, 11, '#fff', { st: 0 }) + rect(-2, -11, 4, 2.4, '#888', { sw: 0.5 });
      case 'camera': return rect(-7, -8, 14, 9, '#333', { rx: 1.5 }) + circ(0, -3.5, 3, '#6fa8d8', { sw: 1 });
      case 'brushbroom': return line(0, 6, 0, -26, '#a0622a', 2) + path('M-5 6L5 6L7 14L-7 14Z', '#e3c27a');
      case 'shovel': return line(0, 4, 0, -24, '#a0622a', 1.8) + path('M-3.6 4L3.6 4L3 12Q0 15 -3 12Z', '#9aa3ad');
      case 'magnifier': return line(0, 0, -6, -6, '#7a4a2a', 2.2) + circ(-10, -10, 5, 'rgba(200,230,255,.4)', { st: '#c9a227', sw: 1.6 });
      case 'pie': return ell(0, -1, 10, 3.6, '#c98a3a') + ell(0, -2.4, 8.5, 2.6, '#7a3b8a', { sw: 0.7 });
      case 'sign': return line(0, 4, 0, -20, '#a0622a', 1.6) + rect(-12, -34, 24, 15, '#fff', { rx: 1 }) + text(0, -23, p.signText || '', { size: 7 });
      default: return '';
    }
  }

  // ── Animals ──────────────────────────────────────────────────────────────
  function dog(p) {
    var c = p.color || '#c98a4a', d = p.dir === 'L' ? -1 : 1, s = '';
    s += shadow(0, 0, 22, 4);
    var legs = [[-12, 0], [-6, 0], [9, 0], [14, 0]];
    legs.forEach(function (l) { s += rect(l[0] - 2.4, -14, 4.8, 14, shade(c, -0.08), { rx: 2 }); if (p.mud) s += circ(l[0], -1.5, 2.6, '#6b4a2a', { st: 0 }); });
    s += path('M-17 -12Q-24 -24 -21 -30', 'none', { st: OL, sw: 5 }) + path('M-17 -12Q-24 -24 -21 -30', 'none', { st: c, sw: 2.8 });
    s += ell(0, -18, 18, 9, c);
    if (p.spots) s += circ(-6, -20, 4, p.spots, { st: 0 }) + circ(6, -15, 3, p.spots, { st: 0 });
    s += circ(17, -29, 8.5, c) + ell(23.5, -26, 6, 4.2, shade(c, 0.15)) + circ(28.4, -27.4, 1.8, '#2b2433', { st: 0 });
    s += p.sleep ? path('M18.4 -31.5q2 1.6 4 0', 'none', { sw: 0.9 }) : circ(20.4, -31.5, 1.3, '#2b2433', { st: 0 });
    s += path('M11 -35Q6 -30 9 -21Q13 -24 14 -33Z', shade(c, -0.25));
    if (p.collar) s += path('M10 -24Q15 -19 22 -21', 'none', { st: OL, sw: 3.6 }) + path('M10 -24Q15 -19 22 -21', 'none', { st: p.collar, sw: 2.2 });
    if (p.wet) s += path('M-4 -8q1.4 2 1.4 3a1.4 1.4 0 0 1 -2.8 0q0 -1 1.4 -3z', '#7fc4f2', { st: '#3a7fb8', sw: 0.5 });
    return g(g(s, { fx: d < 0 }), { x: p.x, y: p.y, s: p.s || 1, id: p.id });
  }
  function cat(p) {
    var c = p.color || '#6b6b78', d = p.dir === 'L' ? -1 : 1, s = '';
    s += shadow(0, 0, 13, 3);
    s += path('M8 -2Q20 -2 18 -16Q17 -22 21 -24', 'none', { st: OL, sw: 4.6 }) + path('M8 -2Q20 -2 18 -16Q17 -22 21 -24', 'none', { st: c, sw: 2.6 });
    s += path('M-10 0Q-12 -18 0 -20Q12 -18 10 0Z', c);
    if (p.stripes) s += path('M-8 -12h5M-9 -7h5M4 -13h5M5 -8h5', 'none', { st: p.stripes, sw: 1.4 });
    s += path('M-9 -24L-8 -33L-3 -28ZM9 -24L8 -33L3 -28Z', c);
    s += circ(0, -24, 8.5, c);
    s += circ(-3, -25, 1.4, '#e8d24a', { sw: 0.5 }) + circ(3, -25, 1.4, '#e8d24a', { sw: 0.5 }) + path('M-1 -22l1 1 1 -1', 'none', { sw: 0.8 });
    if (p.collar) s += path('M-6 -17Q0 -14 6 -17', 'none', { st: p.collar, sw: 2 });
    if (p.wetPaws) s += circ(-6, -1, 2, '#7fc4f2', { st: 0, op: 0.8 }) + circ(6, -1, 2, '#7fc4f2', { st: 0, op: 0.8 });
    if (p.whiteChest) s += ell(0, -12, 4, 6, '#f4f0e6', { st: 0 });
    return g(g(s, { fx: d < 0 }), { x: p.x, y: p.y, s: p.s || 1, id: p.id });
  }

  // ── Footprints: one print, a trail, and a pair of boots shown soles-up ──
  // tread: 'zigzag'|'dots'|'lines'|'waves'|'grid'|'plain'; notch: a chunk missing from the heel
  function printShape(kind, size, tread, col, notch, foot, op) {
    var s = '', L = size || 10, Wd = L * 0.42, id = nid('pr');
    var fd = foot === 'R' ? 1 : -1;
    if (kind === 'paw' || kind === 'bigpaw') {
      var q = kind === 'bigpaw' ? L * 0.11 : L * 0.08;
      s += ell(0, q * 1.6, q * 2.1, q * 1.7, col, { st: 0 });
      [[-2.2, -1.2], [-0.8, -2.6], [0.8, -2.6], [2.2, -1.2]].forEach(function (t) { s += ell(t[0] * q, t[1] * q, q * 0.75, q * 0.95, col, { st: 0 }); });
      return g(s, { op: op });
    }
    if (kind === 'bird') return pline([[0, L * 0.3], [0, -L * 0.25]], col, L * 0.08) + pline([[0, -L * 0.05], [-L * 0.28, -L * 0.42]], col, L * 0.08) + pline([[0, -L * 0.05], [L * 0.28, -L * 0.42]], col, L * 0.08);
    if (kind === 'heel') {
      // a high-heel print: the front of the sole, a gap, then one small square heel
      s += path('M0 ' + n(-L * 0.5) + 'Q' + n(Wd * 0.62) + ' ' + n(-L * 0.48) + ' ' + n(Wd * 0.52) + ' ' + n(-L * 0.12) + 'Q' + n(Wd * 0.4) + ' ' + n(L * 0.06) + ' ' + n(Wd * 0.22) + ' ' + n(L * 0.08) + 'L' + n(-Wd * 0.22) + ' ' + n(L * 0.08) + 'Q' + n(-Wd * 0.4) + ' ' + n(L * 0.06) + ' ' + n(-Wd * 0.52) + ' ' + n(-L * 0.12) + 'Q' + n(-Wd * 0.62) + ' ' + n(-L * 0.48) + ' 0 ' + n(-L * 0.5) + 'Z', col, { st: 0 });
      s += rect(-L * 0.08, L * 0.32, L * 0.16, L * 0.16, col, { st: 0, rx: L * 0.03 });
      return g(s, { op: op });
    }
    // shoe/boot outline (toe up)
    var out = 'M0 ' + n(-L * 0.5) + 'Q' + n(Wd * 0.62) + ' ' + n(-L * 0.5) + ' ' + n(Wd * 0.55) + ' ' + n(-L * 0.12) + 'Q' + n(Wd * 0.36) + ' ' + n(L * 0.05) + ' ' + n(Wd * 0.42) + ' ' + n(L * 0.25) + 'Q' + n(Wd * 0.45) + ' ' + n(L * 0.5) + ' 0 ' + n(L * 0.5) + 'Q' + n(-Wd * 0.45) + ' ' + n(L * 0.5) + ' ' + n(-Wd * 0.42) + ' ' + n(L * 0.25) + 'Q' + n(-Wd * 0.36) + ' ' + n(L * 0.05) + ' ' + n(-Wd * 0.55) + ' ' + n(-L * 0.12) + 'Q' + n(-Wd * 0.62) + ' ' + n(-L * 0.5) + ' 0 ' + n(-L * 0.5) + 'Z';
    if (fd > 0) out = out; // same outline; the foot only flips the notch
    def('<clipPath id="' + id + '"><path d="' + out + '"/></clipPath>');
    var t = '', w = Wd, h = L, sw = Math.max(0.5, L * 0.06);
    if (tread === 'zigzag') for (var yy = -h * 0.4; yy < h * 0.55; yy += h * 0.19) t += pline([[-w, yy], [-w * 0.66, yy - h * 0.09], [-w * 0.33, yy], [0, yy - h * 0.09], [w * 0.33, yy], [w * 0.66, yy - h * 0.09], [w, yy]], col, sw * 1.5);
    else if (tread === 'dots') for (var yd = -h * 0.4; yd < h * 0.5; yd += h * 0.15) for (var xd = -w * 0.6; xd <= w * 0.6; xd += w * 0.4) t += circ(xd + ((Math.round(yd * 10) % 2) ? 0 : w * 0.2), yd, h * 0.045, col, { st: 0 });
    else if (tread === 'lines') for (var yl = -h * 0.42; yl < h * 0.5; yl += h * 0.13) t += line(-w, yl, w, yl, col, sw * 1.4);
    else if (tread === 'waves') for (var yw = -h * 0.42; yw < h * 0.5; yw += h * 0.15) t += path('M' + n(-w) + ' ' + n(yw) + 'q' + n(w / 4) + ' ' + n(-h * 0.07) + ' ' + n(w / 2) + ' 0t' + n(w / 2) + ' 0t' + n(w / 2) + ' 0t' + n(w / 2) + ' 0', 'none', { st: col, sw: sw * 1.4 });
    else if (tread === 'grid') { for (var yg = -h * 0.42; yg < h * 0.5; yg += h * 0.14) t += line(-w, yg, w, yg, col, sw); for (var xg = -w; xg <= w; xg += w * 0.35) t += line(xg, -h, xg, h, col, sw); }
    else if (tread === 'chevron') for (var yc = -h * 0.4; yc < h * 0.5; yc += h * 0.17) t += pline([[-w, yc + h * 0.07], [0, yc - h * 0.02], [w, yc + h * 0.07]], col, sw * 1.5);
    else t += rect(-w, -h, w * 2, h * 2, col, { st: 0, op: 0.7 });
    s += path(out, col, { st: 0, op: 0.28 }) + g(t, { clip: id }) + path(out, 'none', { st: col, sw: sw * 1.3 });
    if (notch) s += path('M' + n(fd * Wd * 0.48) + ' ' + n(L * 0.2) + 'L' + n(fd * Wd * 0.05) + ' ' + n(L * 0.32) + 'L' + n(fd * Wd * 0.46) + ' ' + n(L * 0.44) + 'Z', notch === true ? '#fff' : notch, { st: 0 });
    return g(s, { op: op });
  }
  // a trail of prints along a polyline: {pts, kind, size, tread, col, notch, gap, side, op, fade}
  function trail(p) {
    var pts = p.pts, gap = p.gap || (p.size || 10) * 1.3, side = p.side == null ? (p.kind === 'paw' || p.kind === 'bigpaw' ? 0.32 : 0.36) * (p.size || 10) : p.side, s = '';
    var col = p.col || '#6b4a2a', i = 0, dist = p.start || 0, segs = [];
    for (var k = 1; k < pts.length; k++) { var dx = pts[k][0] - pts[k - 1][0], dy = pts[k][1] - pts[k - 1][1]; segs.push({ a: pts[k - 1], dx: dx, dy: dy, len: Math.hypot(dx, dy) }); }
    var total = segs.reduce(function (a, b) { return a + b.len; }, 0), d = dist;
    while (d <= total) {
      var acc = 0, sg = null; for (var j = 0; j < segs.length; j++) { if (d <= acc + segs[j].len || j === segs.length - 1) { sg = segs[j]; break; } acc += segs[j].len; }
      var t = sg.len ? (d - acc) / sg.len : 0, ux = sg.len ? sg.dx / sg.len : 0, uy = sg.len ? sg.dy / sg.len : 1;
      var lr = i % 2 ? 1 : -1, x = sg.a[0] + sg.dx * t - uy * side * lr, y = sg.a[1] + sg.dy * t + ux * side * lr;
      var ang = Math.atan2(uy, ux) * 180 / Math.PI + 90;
      var op = p.fade ? Math.max(0.15, 1 - (d / total) * p.fade) : 1;
      if (p.kind === 'bike') s += '';
      else s += g(printShape(p.kind || 'shoe', p.size || 10, p.tread || 'plain', col, p.notch, lr > 0 ? 'R' : 'L', op), { x: x, y: y, r: n(ang) });
      d += gap; i++;
    }
    if (p.kind === 'bike') {
      s += pline(pts, col, p.w || 2.2, { op: 0.7 });
      if (p.tread) s += pline(pts, shade(col, 0.5), p.w || 2.2, { dash: p.tread === 'zigzag' ? '1.4 1.4' : '0.6 2.4', op: 0.8 });
    }
    return g(s, { id: p.id });
  }
  function bootSoles(p) {
    // a pair of boots tipped over, soles toward us
    var c = p.color || '#3a3a46', L = p.size || 26, s = '', sw = L * 0.42;
    [-1, 1].forEach(function (d) {
      var x = d * sw * 0.62;
      s += g(path('M0 ' + n(-L * 0.55) + 'Q' + n(sw * 0.7) + ' ' + n(-L * 0.55) + ' ' + n(sw * 0.62) + ' ' + n(-L * 0.12) + 'Q' + n(sw * 0.42) + ' ' + n(L * 0.05) + ' ' + n(sw * 0.48) + ' ' + n(L * 0.27) + 'Q' + n(sw * 0.5) + ' ' + n(L * 0.56) + ' 0 ' + n(L * 0.56) + 'Q' + n(-sw * 0.5) + ' ' + n(L * 0.56) + ' ' + n(-sw * 0.48) + ' ' + n(L * 0.27) + 'Q' + n(-sw * 0.42) + ' ' + n(L * 0.05) + ' ' + n(-sw * 0.62) + ' ' + n(-L * 0.12) + 'Q' + n(-sw * 0.7) + ' ' + n(-L * 0.55) + ' 0 ' + n(-L * 0.55) + 'Z', c) +
        printShape('shoe', L, p.tread, p.treadCol || shade(c, 0.5), p.notch && d === (p.notchFoot === 'L' ? -1 : 1) ? (p.notchCol || '#eadfc9') : false, d > 0 ? 'R' : 'L') +
        (p.mud ? circ(sw * 0.1, L * 0.1, L * 0.12, '#6b4a2a', { st: 0, op: 0.85 }) + circ(-sw * 0.15, -L * 0.25, L * 0.08, '#6b4a2a', { st: 0, op: 0.85 }) : ''), { x: x, y: 0 });
    });
    return g(s + (p.name ? nameTag(0, L * 0.56 + 10, p.name) : ''), { x: p.x, y: p.y, s: p.s, id: p.id, r: p.r });
  }

  // ── Keys and locks ─────────────────────────────────────────────────────
  // teeth: heights 1–4 along the blade; head: 'round'|'square'|'clover'|'oval'
  function keyShape(k, sc, x, y, rot) {
    var c = k.col || '#d8b64a', s = '', head = k.head || 'round';
    var hd = head === 'square' ? rect(-9, -9, 18, 18, c, { rx: 2.5 }) : head === 'clover' ? circ(-4, -4, 6, c) + circ(4, -4, 6, c) + circ(0, 4, 6, c) : head === 'oval' ? ell(0, 0, 11, 8, c) : head === 'diamond' ? poly([[0, -11], [10, 0], [0, 11], [-10, 0]], c) : circ(0, 0, 10, c);
    s += hd + circ(0, 0, 2.8, k.hole || '#fdf8ec');
    var bl = 'M8 -3L52 -3', teeth = k.teeth || [2, 3, 1];
    var tp = 'M8 -3.5L56 -3.5L58 0L56 3.5'; var x0 = 54 - teeth.length * 8;
    var tpts = '';
    for (var i = teeth.length - 1; i >= 0; i--) { var tx = x0 + i * 8; tpts += 'L' + n(tx + 8) + ' 3.5L' + n(tx + 6) + ' ' + n(3.5 + teeth[i] * 2.4) + 'L' + n(tx + 2) + ' ' + n(3.5 + teeth[i] * 2.4) + 'L' + n(tx) + ' 3.5'; }
    s += path(tp + tpts + 'L8 3.5Z', c);
    s += line(12, 0, 50, 0, shade(c, -0.3), 0.7);
    if (k.tag) s += path('M-10 2q-8 8 -4 16', 'none', { st: '#888', sw: 0.8 }) + rect(-22, 16, 18, 10, k.tag, { rx: 2 });
    return g(s, { x: x || 0, y: y || 0, s: sc || 1, r: rot });
  }

  // ── Furniture and room objects ───────────────────────────────────────────
  function door(p) {
    var w = p.w || 64, h = p.h || 140, c = p.color || '#8a5a34', s = '';
    s += rect(-4, -h - 4, w + 8, h + 4, shade(c, -0.25));
    if (p.open) s += rect(0, -h, w, h, '#2a2230') + path('M0 ' + -h + 'L' + n(w * (p.open === 'half' ? 0.5 : 0.25)) + ' ' + n(-h + 8) + 'L' + n(w * (p.open === 'half' ? 0.5 : 0.25)) + ' -2L0 0Z', c) + (p.outside ? rect(2, -h + 2, w - 4, h - 4, p.outside, { st: 0, op: 0.9 }) : '');
    else {
      s += rect(0, -h, w, h, c);
      s += rect(8, -h + 10, w - 16, h * 0.36, shade(c, 0.08), { sw: 0.9 }) + rect(8, -h * 0.48, w - 16, h * 0.4, shade(c, 0.08), { sw: 0.9 });
      if (p.window) s += rect(12, -h + 14, w - 24, h * 0.26, '#bfe0f2', { sw: 0.9 });
      s += circ(w - 9, -h * 0.5, 2.6, '#e8c34a', { sw: 0.8 });
      if (p.bolt) s += g(rect(w - 14, -h * 0.66, 10, 4, '#9aa3ad', { sw: 0.7 }) + rect(w - 6, -h * 0.66 - 1, 8, 6, '#7a828c', { sw: 0.7 }), { p: (p.id || 'door') + '.bolt' });
      if (p.keyIn) s += g(keyShape({ teeth: [2, 3], head: 'round', col: '#d8b64a' }, 0.22, w - 12, -h * 0.45, 90), { p: (p.id || 'door') + '.key' });
    }
    if (p.mat) s += path('M-6 0L' + n(w + 6) + ' 0L' + n(w + 12) + ' 9L-12 9Z', p.mat, { sw: 1 });
    if (p.sign) s += rect(w / 2 - 16, -h + 2, 32, 12, '#fff', { rx: 1.5 }) + text(w / 2, -h + 11, p.sign, { size: 8 });
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function windowItem(p) {
    var w = p.w || 80, h = p.h || 70, s = '', fr = p.frame || '#f4efe4', sky = p.sky || '#bfe0f2';
    s += rect(-5, -5, w + 10, h + 10, fr) + rect(0, 0, w, h, sky);
    if (p.view) s += g(p.view, { clip: (function () { var id = nid('wv'); def('<clipPath id="' + id + '"><rect width="' + w + '" height="' + h + '"/></clipPath>'); return id; })() });
    if (p.rain) { var R = rng(11), rr = ''; for (var i = 0; i < w * h / 90; i++) { var x = R() * w, y = R() * h; rr += line(x, y, x - 2, y + 7, '#6f9fc4', 0.9, { op: 0.8 }); } s += rr; }
    if (p.snow) { var R2 = rng(13), sn = ''; for (var j = 0; j < w * h / 120; j++) sn += circ(R2() * w, R2() * h, 0.9 + R2(), '#fff', { st: 0 }); s += sn; }
    if (p.night) s += rect(0, 0, w, h, '#1b2448', { st: 0, op: 0.85 }) + circ(w * 0.72, h * 0.3, 6, '#f6f0c8', { st: 0 });
    s += line(w / 2, 0, w / 2, h, fr, 3.5) + line(0, h / 2, w, h / 2, fr, 3.5) + rect(0, 0, w, h, 'none', { sw: 1.4 });
    if (p.latch) s += g(rect(w / 2 - 3, h / 2 - 7, 6, 5, p.latch === 'open' ? '#9aa3ad' : '#c9a227', { sw: 0.7 }) + (p.latch === 'open' ? line(w / 2 + 3, h / 2 - 5, w / 2 + 9, h / 2 - 11, OL, 1.4) : line(w / 2 - 3, h / 2 - 4.5, w / 2 + 6, h / 2 - 4.5, OL, 1.6)), { p: (p.id || 'window') + '.latch' });
    if (p.web) s += g(webSvg(p.web[0] != null ? p.web[0] : w * 0.82, p.web[1] != null ? p.web[1] : h * 0.18, p.web[2] || 13), { p: (p.id || 'window') + '.web' });
    if (p.sill) s += rect(-9, h + 4, w + 18, 6, fr);
    if (p.curtains) { var cc = p.curtains; s += path('M-8 -10Q' + n(w * 0.12) + ' ' + n(h * 0.4) + ' -2 ' + n(h + 12) + 'L-14 ' + n(h + 12) + 'L-14 -10Z', cc) + path('M' + n(w + 8) + ' -10Q' + n(w * 0.88) + ' ' + n(h * 0.4) + ' ' + n(w + 2) + ' ' + n(h + 12) + 'L' + n(w + 14) + ' ' + n(h + 12) + 'L' + n(w + 14) + ' -10Z', cc) + rect(-18, -14, w + 36, 4, '#7a5a3a', { rx: 2 }); }
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function webSvg(cx, cy, r) {
    var s = '';
    for (var a = 0; a < 6; a++) { var t = a * Math.PI / 3; s += line(cx, cy, cx + Math.cos(t) * r, cy + Math.sin(t) * r, '#fff', 0.5, { op: 0.9 }); }
    for (var q = 1; q <= 3; q++) { var pts = []; for (var b = 0; b <= 6; b++) { var tt = b * Math.PI / 3; pts.push([cx + Math.cos(tt) * r * q / 3.3, cy + Math.sin(tt) * r * q / 3.3]); } s += pline(pts, '#fff', 0.45, { op: 0.9 }); }
    return s;
  }
  function curtain(p) {
    // a long curtain to the floor (something may hide behind it: feet below)
    var w = p.w || 60, h = p.h || 170, c = p.color || '#a33a4a', s = '';
    s += rect(-6, -h - 6, w + 12, 4, '#7a5a3a', { rx: 2 });
    s += path('M0 ' + -h + 'L' + w + ' ' + -h + 'L' + n(w + 2) + ' -' + (p.gap || 10) + 'L-2 -' + (p.gap || 10) + 'Z', c);
    for (var i = 1; i < 5; i++) s += line(i * w / 5, -h + 2, i * w / 5 + (i % 2 ? 1 : -1), -(p.gap || 10) - 2, shade(c, -0.25), 1.2);
    if (p.bulge) s += path('M' + n(w * 0.3) + ' ' + n(-h * 0.55) + 'Q' + n(w * 0.5) + ' ' + n(-h * 0.62) + ' ' + n(w * 0.7) + ' ' + n(-h * 0.55), 'none', { st: shade(c, 0.25), sw: 2 });
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function counter(p) {
    var w = p.w || 160, h = p.h || 72, c = p.color || '#7fa6b8', top = p.top || '#e9e2d0', s = '';
    s += rect(0, -h, w, h, c);
    var dn = Math.max(1, Math.round(w / 52));
    for (var i = 0; i < dn; i++) { var dw = w / dn; s += rect(i * dw + 5, -h + 14, dw - 10, h - 20, shade(c, 0.1), { sw: 0.9 }) + rect(i * dw + dw / 2 - 6, -h + 20, 12, 3, '#cfd5da', { sw: 0.7, rx: 1.5 }); }
    s += rect(-4, -h - 7, w + 8, 8, top, { rx: 1.5 });
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function table(p) {
    var w = p.w || 110, h = p.h || 48, c = p.color || '#9a6438', s = '';
    s += shadow(w / 2, 0, w * 0.5, 4);
    s += rect(6, -h, 6, h, shade(c, -0.15)) + rect(w - 12, -h, 6, h, shade(c, -0.15));
    if (p.cloth) s += path('M-6 ' + (-h - 4) + 'L' + (w + 6) + ' ' + (-h - 4) + 'L' + (w + 10) + ' ' + n(-h + (p.long ? h - 4 : 18)) + 'L-10 ' + n(-h + (p.long ? h - 4 : 18)) + 'Z', patFill({ pat: p.clothPat, pc: p.clothPc }, p.cloth));
    else s += rect(-4, -h - 6, w + 8, 7, c, { rx: 1.5 });
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function chair(p) {
    var c = p.color || '#9a6438', s = '', d = p.dir === 'R' ? -1 : 1;
    s += rect(0, -30, 4, 30, shade(c, -0.15)) + rect(26, -30, 4, 30, shade(c, -0.15));
    s += rect(-2, -34, 34, 5, c, { rx: 1.5 });
    var bx = d > 0 ? -2 : 28;
    s += rect(bx, -78, 6, 46, c, { rx: 2 }) + rect(bx + (d > 0 ? 0 : -24), -78, 30, 8, c, { rx: 2 });
    if (p.hang) s += g(held(p.hang, p), { x: bx + 3, y: -66 });
    if (p.cane) s += g(path('M0 0L0 -38Q0 -46 7 -46Q12 -46 12 -40', 'none', { st: OL, sw: 3.6 }) + path('M0 0L0 -38Q0 -46 7 -46Q12 -46 12 -40', 'none', { st: '#7a4a2a', sw: 2 }), { x: bx + (d > 0 ? -4 : 10), y: -2, p: (p.id || 'chair') + '.cane' });
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function sofa(p) {
    var w = p.w || 150, c = p.color || '#5a7ab0', s = '';
    s += shadow(w / 2, 0, w * 0.52, 5);
    s += rect(0, -62, w, 34, shade(c, -0.08), { rx: 10 });
    s += rect(-10, -44, 24, 40, c, { rx: 8 }) + rect(w - 14, -44, 24, 40, c, { rx: 8 });
    s += rect(6, -34, w - 12, 26, c, { rx: 6 });
    s += line(w / 2, -32, w / 2, -10, shade(c, -0.25), 1.2);
    s += rect(-2, -6, 6, 6, '#5a3a22') + rect(w - 4, -6, 6, 6, '#5a3a22');
    if (p.cushion) s += rect(14, -58, 26, 22, p.cushion, { rx: 6, a: 'transform="rotate(-8 27 -47)"' });
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function armchair(p) {
    var c = p.color || '#b0573a', s = '';
    s += shadow(32, 0, 36, 4);
    s += rect(4, -74, 56, 46, shade(c, -0.08), { rx: 12 }) + rect(-6, -46, 18, 42, c, { rx: 7 }) + rect(52, -46, 18, 42, c, { rx: 7 }) + rect(8, -34, 48, 26, c, { rx: 6 }) + rect(0, -6, 5, 6, '#5a3a22') + rect(59, -6, 5, 6, '#5a3a22');
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function shelf(p) {
    // a wall shelf (plank + brackets); items sit on it via p.items in shelf-local coords (y = 0 is the plank top)
    var w = p.w || 150, c = p.color || '#a0703f', s = '';
    s += (p.items ? items(p.items) : '');
    s += rect(0, 0, w, 6, c, { rx: 1 }) + path('M10 6L10 18L22 6Z', shade(c, -0.15)) + path('M' + (w - 10) + ' 6L' + (w - 10) + ' 18L' + (w - 22) + ' 6Z', shade(c, -0.15));
    if (p.dust) s = rect(0, -1.8, w, 1.8, '#d8d2c4', { st: 0, op: 0.9 }) + s;
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function bookcase(p) {
    var w = p.w || 120, h = p.h || 170, rows = p.rows || 4, c = p.color || '#7a4a2a', s = '';
    s += rect(0, -h, w, h, shade(c, -0.25)) + rect(0, -h, w, h, 'none', { sw: 1.4 });
    var rh = (h - 10) / rows;
    for (var r = 0; r < rows; r++) s += rect(0, -h + 6 + (r + 1) * rh - 5, w, 5, c);
    s += rect(-4, -h - 6, w + 8, 7, c, { rx: 1 }) + rect(0, -h, 6, h, c) + rect(w - 6, -h, 6, h, c);
    if (p.books !== false) {
      var R = rng(p.seed || 5), cols = p.colors || ['#b0413e', '#3a6ea5', '#e0b351', '#4f8a5b', '#7a4a8a', '#d98a3a', '#2f4a6a', '#c9c2b0'];
      for (var rr = 0; rr < rows; rr++) {
        if (p.skipRows && p.skipRows.indexOf(rr) >= 0) continue;
        var x = 9, yb = -h + 6 + (rr + 1) * rh - 5;
        while (x < w - 16) { var bw = 6 + R() * 6, bh = rh * (0.55 + R() * 0.35); if (R() < 0.08) { x += bw + 4; continue; } s += rect(x, yb - bh, bw, bh, cols[Math.floor(R() * cols.length)], { sw: 0.8 }); x += bw + 0.5; }
      }
    }
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function book(p) {
    // one book spine standing on a shelf: x,y (bottom-left), w,h, color, label, dust, upside
    var s = '', w = p.w || 10, h = p.h || 40, c = p.color || '#3a6ea5';
    s += rect(0, -h, w, h, c, { sw: 0.9 }) + line(1.5, -h + 4, w - 1.5, -h + 4, shade(c, 0.35), 0.8) + line(1.5, -6, w - 1.5, -6, shade(c, 0.35), 0.8);
    if (p.crack) s += path('M' + n(w * 0.2) + ' ' + n(-h * 0.6) + 'l' + n(w * 0.35) + ' 3 ' + n(-w * 0.2) + ' 4 ' + n(w * 0.4) + ' 3', 'none', { st: shade(c, 0.5), sw: 0.7 });
    if (p.label) s += rect(1.5, -h * 0.42 - 5, w - 3, 9, '#fbf6e6', { sw: 0.5 }) + text(w / 2, -h * 0.42 + 2, p.label, { size: Math.min(8, w * 0.8), font: 'sans', weight: 700 });
    if (p.title) s += text(w / 2, -h / 2, p.title, { size: 5, fill: '#fff', r: p.upside ? 90 : -90, font: 'serif' });
    if (p.dust) s += rect(-0.2, -h - 1.6, w + 0.4, 1.6, '#d8d2c4', { st: 0 });
    if (p.marks) s += g(circ(w * 0.3, -h - 0.8, 0.7, shade(c, -0.2), { st: 0 }) + circ(w * 0.65, -h - 0.9, 0.7, shade(c, -0.2), { st: 0 }), { p: (p.id || 'book') + '.top' });
    if (p.ribbon) s += path('M' + n(w * 0.5) + ' ' + n(-h) + 'l0 -7l-1.5 2', 'none', { st: p.ribbon, sw: 1.4 });
    return g(s, { x: p.x, y: p.y, id: p.id, r: p.tilt });
  }
  function rug(p) { var w = p.w || 160, c = p.color || '#a3483a'; return g(ell(0, 0, w / 2, w * 0.09, c) + ell(0, 0, w / 2 - 8, w * 0.09 - 3, 'none', { st: shade(c, 0.3), sw: 1.4 }), { x: p.x, y: p.y, id: p.id }); }
  function lamp(p) { var c = p.color || '#e9c46a', s = shadow(0, 0, 12, 3) + rect(-1.6, -112, 3.2, 110, '#5a5a66') + ell(0, -2, 11, 3, '#5a5a66') + path('M-16 -110L16 -110L10 -136L-10 -136Z', c); if (p.on) s += path('M-16 -110L16 -110L40 -30L-40 -30Z', '#fff2b0', { st: 0, op: 0.18 }); return g(s, { x: p.x, y: p.y, id: p.id }); }
  function plant(p) {
    var c = p.pot || '#c0643a', s = shadow(0, 0, 14, 3), lf = p.leaf || '#4f9a4a', sz = p.size || 1;
    var R = rng(p.seed || 2);
    for (var i = 0; i < 7; i++) { var a = -150 + i * 20 + R() * 8, t = a * Math.PI / 180, L = 26 + R() * 14; s += path('M0 -20Q' + n(Math.cos(t) * L * 0.4 - 4) + ' ' + n(-20 + Math.sin(t) * L * 0.6) + ' ' + n(Math.cos(t) * L) + ' ' + n(-20 + Math.sin(t) * L) + 'Q' + n(Math.cos(t) * L * 0.6 + 4) + ' ' + n(-20 + Math.sin(t) * L * 0.4) + ' 0 -20Z', i % 2 ? lf : shade(lf, -0.12), { sw: 0.9 }); }
    s += path('M-12 -22L12 -22L9 0L-9 0Z', c) + rect(-13, -24, 26, 5, shade(c, -0.1), { rx: 1 });
    return g(s, { x: p.x, y: p.y, s: sz, id: p.id });
  }
  function vase(p) {
    var c = p.color || '#3a7ab8', s = '';
    if (p.broken) {
      s += path('M-14 0L-6 -6L-2 0Z', c) + path('M2 0L8 -9L14 -2L10 0Z', c) + path('M-20 -2L-14 -7L-12 -1Z', shade(c, 0.15)) + path('M16 0L21 -5L24 0Z', shade(c, -0.1));
      if (p.water) s = ell(0, 0, p.water, p.water * 0.22, '#9fd2f0', { st: '#5a96c2', sw: 0.6, op: 0.85 }) + s;
      if (p.flowers) s += g(line(0, 0, -16, -6, '#3f9a3a', 1.2) + g(flowerHead(p.flowers, 2.6), { x: -18, y: -6 }), { x: -6, y: -2 }) + g(line(0, 0, 14, -4, '#3f9a3a', 1.2) + g(flowerHead(shade(p.flowers, 0.2), 2.4), { x: 16, y: -5 }), { x: 4, y: -1 });
      return g(s, { x: p.x, y: p.y, id: p.id });
    }
    s += shadow(0, 0, 10, 2.4) + path('M-6 -30Q-12 -22 -10 -10Q-8 0 0 0Q8 0 10 -10Q12 -22 6 -30Z', c) + rect(-6, -33, 12, 4, shade(c, -0.15), { rx: 1 });
    if (p.flowers) { s += line(0, -32, -6, -48, '#3f9a3a', 1.2) + line(0, -32, 6, -46, '#3f9a3a', 1.2) + line(0, -32, 0, -52, '#3f9a3a', 1.2); s += g(flowerHead(p.flowers, 2.8), { x: -6, y: -49 }) + g(flowerHead(shade(p.flowers, 0.25), 2.6), { x: 6, y: -47 }) + g(flowerHead(p.flowers, 2.6), { x: 0, y: -54 }); }
    return g(s, { x: p.x, y: p.y, s: p.s, id: p.id });
  }
  // wall clock: h:m in 12h; mirror: drawn back to front, as seen in a mirror
  function clock(p) {
    var r = p.r || 18, h = p.h || 3, m = p.m || 0, s = '', c = p.color || '#5a3a22';
    s += circ(0, 0, r + 3, c) + circ(0, 0, r, p.face || '#fbf6e6', { sw: 1 });
    for (var i = 0; i < 12; i++) { var t = i * Math.PI / 6, L = i % 3 === 0 ? 0.2 : 0.1; s += line(Math.sin(t) * r * (0.92 - L), -Math.cos(t) * r * (0.92 - L), Math.sin(t) * r * 0.92, -Math.cos(t) * r * 0.92, OL, i % 3 === 0 ? 1.4 : 0.8); }
    if (p.nums) { [12, 3, 6, 9].forEach(function (v) { var t = (v % 12) * Math.PI / 6; s += text(Math.sin(t) * r * 0.62, -Math.cos(t) * r * 0.62 + r * 0.13, String(v), { size: r * 0.36, font: 'serif', weight: 700 }); }); }
    var ha = ((h % 12) + m / 60) * Math.PI / 6, ma = m * Math.PI / 30;
    s += line(0, 0, Math.sin(ha) * r * 0.5, -Math.cos(ha) * r * 0.5, OL, r * 0.1) + line(0, 0, Math.sin(ma) * r * 0.78, -Math.cos(ma) * r * 0.78, OL, r * 0.06) + circ(0, 0, r * 0.07, OL, { st: 0 });
    if (p.label) s += text(0, r * 0.45, p.label, { size: r * 0.16, font: 'serif' });
    return g(g(s, { fx: p.mirror }), { x: p.x, y: p.y, id: p.id });
  }
  function candle(p) {
    // x,y: base; len: remaining candle length; holder height; lit; drips
    var len = p.len || 40, hh = p.holder || 8, c = p.color || '#f4efe0', s = '', w = p.w || 10;
    s += shadow(0, 0, 14, 2.6);
    s += path('M-12 0L12 0L9 -' + hh + 'L-9 -' + hh + 'Z', p.holderc || '#c9a227') + (hh > 10 ? rect(-3, -hh, 6, hh - 4, p.holderc || '#c9a227') + ell(0, -hh, 10, 2.6, p.holderc || '#c9a227') : '');
    s += rect(-w / 2, -hh - len, w, len, c, { sw: 1 });
    var R = rng(p.seed || 4);
    for (var d = 0; d < (p.drips || 0); d++) { var dx = -w / 2 + R() * w, dl = 3 + R() * Math.min(len * 0.6, 12); s += rect(dx - 1.2, -hh - len, 2.4, dl, shade(c, -0.04), { st: 0, rx: 1.2 }); }
    s += ell(0, -hh - len, w / 2, 1.6, shade(c, -0.08), { sw: 0.8 });
    s += line(0, -hh - len, 0, -hh - len - 4, OL, 1);
    if (p.lit !== false) s += path('M0 ' + n(-hh - len - 15) + 'Q4 ' + n(-hh - len - 8) + ' 0 ' + n(-hh - len - 3) + 'Q-4 ' + n(-hh - len - 8) + ' 0 ' + n(-hh - len - 15) + 'Z', '#ffcf4a', { st: '#e8862a', sw: 0.8 }) + circ(0, -hh - len - 8, 9, '#ffe9a0', { st: 0, op: 0.25 });
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function fireplace(p) {
    var w = p.w || 120, h = p.h || 100, s = '';
    s += rect(0, -h, w, h, p.color || '#b7704f') + rect(-8, -h - 8, w + 16, 10, '#8a5a3a', { rx: 1.5 });
    var fid = nid('fp'), br = ''; def('<clipPath id="' + fid + '"><rect x="0" y="' + -h + '" width="' + w + '" height="' + h + '"/></clipPath>');
    for (var r = 0; r < 6; r++) for (var c = -1; c < 7; c++) br += rect(c * w / 6 + (r % 2 ? w / 12 : 0) + 1, -h + r * h / 6 + 1, w / 6 - 2, h / 6 - 2, 'none', { st: shade(p.color || '#b7704f', -0.2), sw: 0.6 });
    s += g(br, { clip: fid });
    s += path('M' + n(w * 0.18) + ' 0L' + n(w * 0.18) + ' ' + n(-h * 0.5) + 'Q' + n(w / 2) + ' ' + n(-h * 0.72) + ' ' + n(w * 0.82) + ' ' + n(-h * 0.5) + 'L' + n(w * 0.82) + ' 0Z', '#1d1a1f');
    if (p.ash) s += ell(w / 2, -4, w * 0.24, 4, '#6d6a70', { st: 0 }) + (p.ashPrint ? g(printShape('shoe', 13, 'zigzag', '#2a2a2e', false, 'L'), { x: w / 2 + 2, y: -5, r: 80, p: (p.id || 'fire') + '.ash' }) : '');
    if (p.logs) s += rect(w * 0.3, -10, w * 0.4, 6, '#6a4126', { rx: 3 }) + rect(w * 0.36, -15, w * 0.3, 6, '#7a4a2a', { rx: 3 });
    if (p.fire) s += path('M' + n(w * 0.4) + ' -10Q' + n(w * 0.45) + ' -36 ' + n(w / 2) + ' -44Q' + n(w * 0.56) + ' -30 ' + n(w * 0.6) + ' -10Z', '#ffb43a', { st: '#e8662a' });
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function frame(p) {
    // a picture on the wall; p.items drawn inside (frame-local, w × h)
    var w = p.w || 60, h = p.h || 44, s = '', id = nid('fr');
    def('<clipPath id="' + id + '"><rect x="0" y="0" width="' + w + '" height="' + h + '"/></clipPath>');
    s += rect(-5, -5, w + 10, h + 10, p.color || '#b8862a', { rx: 1 }) + rect(0, 0, w, h, p.bg || '#d8e6d0', { sw: 0.9 });
    if (p.items) s += g(items(p.items), { clip: id });
    else if (p.art === 'mountain') s += g(poly([[0, h], [w * 0.35, h * 0.3], [w * 0.6, h * 0.7], [w * 0.8, h * 0.45], [w, h]], '#7a9a6a', { st: 0 }) + circ(w * 0.78, h * 0.25, h * 0.1, '#f6d36a', { st: 0 }), { clip: id });
    else if (p.art === 'boat') s += g(rect(0, h * 0.65, w, h * 0.35, '#4a8ac2', { st: 0 }) + path('M' + n(w * 0.3) + ' ' + n(h * 0.65) + 'L' + n(w * 0.7) + ' ' + n(h * 0.65) + 'L' + n(w * 0.62) + ' ' + n(h * 0.78) + 'L' + n(w * 0.38) + ' ' + n(h * 0.78) + 'Z', '#8a5a34', { sw: 0.7 }) + path('M' + n(w * 0.5) + ' ' + n(h * 0.62) + 'L' + n(w * 0.5) + ' ' + n(h * 0.2) + 'L' + n(w * 0.68) + ' ' + n(h * 0.58) + 'Z', '#fff', { sw: 0.7 }), { clip: id });
    if (p.plate) s += rect(w / 2 - 18, h + 6, 36, 9, '#e8c34a', { sw: 0.7, rx: 1 }) + text(w / 2, h + 13, p.plate, { size: 6.5, font: 'serif' });
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function mirror(p) {
    // a mirror on the wall; its items are drawn back to front (they are reflections)
    var w = p.w || 100, h = p.h || 70, s = '', id = nid('mr');
    def('<clipPath id="' + id + '"><rect x="0" y="0" width="' + w + '" height="' + h + '" rx="' + (p.rx || 4) + '"/></clipPath>');
    s += rect(-6, -6, w + 12, h + 12, p.color || '#c9a227', { rx: (p.rx || 4) + 4 });
    s += rect(0, 0, w, h, p.bg || '#cfe3ea', { rx: p.rx || 4 });
    if (p.items) s += g(g(items(p.items), { a: 'transform="translate(' + w + ' 0) scale(-1 1)"' }), { clip: id });
    s += g(path('M' + n(w * 0.1) + ' ' + n(h) + 'L' + n(w * 0.45) + ' 0L' + n(w * 0.55) + ' 0L' + n(w * 0.2) + ' ' + n(h) + 'Z', '#fff', { st: 0, op: 0.22 }) + path('M' + n(w * 0.3) + ' ' + n(h) + 'L' + n(w * 0.65) + ' 0L' + n(w * 0.69) + ' 0L' + n(w * 0.34) + ' ' + n(h) + 'Z', '#fff', { st: 0, op: 0.18 }), { clip: id });
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function coatrack(p) {
    var s = shadow(0, 0, 16, 3) + rect(-2, -150, 4, 148, '#6a4126') + path('M-16 0L0 -16L16 0', 'none', { st: '#6a4126', sw: 4 }) + circ(0, -152, 4, '#6a4126');
    s += path('M0 -140l-12 -6M0 -140l12 -6', 'none', { st: '#6a4126', sw: 3 });
    (p.hang || []).forEach(function (h, i) { s += g(hangItem(h), { x: i % 2 ? 12 : -12, y: -144 }); });
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function hangItem(h) {
    var c = h.color || '#7a5a3a';
    if (h.kind === 'coat') return path('M-8 0L8 0L12 50L-12 50Z', c) + line(0, 2, 0, 48, shade(c, -0.25), 1);
    if (h.kind === 'hat') return path('M-8 0Q0 -12 8 0Z', c) + rect(-11, -1, 22, 3, c, { rx: 1 });
    if (h.kind === 'umbrella') return path('M0 0q0 -6 4 -6', 'none', { sw: 1.4 }) + path('M-4 2Q0 -2 4 2L5 40Q0 44 -5 40Z', c) + (h.wet ? path('M2 44q1.4 2 1.4 3a1.4 1.4 0 0 1 -2.8 0q0 -1 1.4 -3z', '#7fc4f2', { st: '#3a7fb8', sw: 0.5 }) : '');
    if (h.kind === 'scarf') return path('M-3 0L3 0L5 40L-1 40Z', c);
    if (h.kind === 'bag') return path('M0 0L-6 14M0 0L6 14', 'none', { sw: 1 }) + rect(-9, 14, 18, 14, c, { rx: 2 });
    return '';
  }
  function umbrellaStand(p) {
    var s = '';
    (p.umbrellas || []).forEach(function (u, i) { s += g(line(0, 0, 0, -44, OL, 1.4) + path('M-4 -40Q0 -50 4 -40L6 -8Q0 -4 -6 -8Z', u.color || '#2b5aa8') + path('M0 -44q0 -6 4 -6', 'none', { sw: 1.4 }) + (u.wet ? path('M5 -4q1.4 2 1.4 3a1.4 1.4 0 0 1 -2.8 0q0 -1 1.4 -3z', '#7fc4f2', { st: '#3a7fb8', sw: 0.5 }) : ''), { x: -8 + i * 8, y: -6, r: -8 + i * 8 }); });
    s += path('M-14 0L14 0L12 -28L-12 -28Z', p.color || '#4a4a56');
    if (p.puddle) s = ell(4, 2, 22, 3.6, '#8cc3e6', { st: '#5a96c2', sw: 0.7, op: 0.8 }) + s;
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function toybox(p) {
    var w = p.w || 60, c = p.color || '#d9534f', s = '';
    s += shadow(w / 2, 0, w * 0.55, 3) + rect(0, -34, w, 34, c, { rx: 2 }) + line(0, -17, w, -17, shade(c, -0.2), 1);
    if (p.open) s += path('M-2 -34L' + (w + 2) + ' -34L' + (w + 8) + ' -46L4 -46Z', shade(c, 0.12));
    else s += rect(-2, -38, w + 4, 6, shade(c, 0.12), { rx: 1.5 });
    if (p.peek) s += p.peek;
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function jar(p) {
    var c = p.color || 'rgba(220,235,245,.75)', s = '';
    s += shadow(0, 0, 14, 2.6) + path('M-13 -32Q-16 -20 -13 -4Q-12 0 0 0Q12 0 13 -4Q16 -20 13 -32Z', c);
    for (var i = 0; i < (p.cookies || 0); i++) s += circ(-6 + (i % 3) * 6, -6 - Math.floor(i / 3) * 7, 4, '#d9a35a', { sw: 0.7 });
    s += rect(-11, -36, 22, 5, '#c9a227', { rx: 1.5 });
    if (p.label) s += rect(-9, -24, 18, 9, '#fbf6e6', { sw: 0.6 }) + text(0, -17.5, p.label, { size: 6 });
    if (!p.lidOff) s += path('M-12 -36Q0 -46 12 -36Z', p.lid || '#c0643a') + circ(0, -44, 2.6, p.lid || '#c0643a');
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function puddle(p) { return g(ell(0, 0, p.rx || 20, p.ry || 4, p.color || '#9fd2f0', { st: '#5a96c2', sw: 0.8, op: p.op == null ? 0.85 : p.op }), { x: p.x, y: p.y, id: p.id }); }
  function crumbs(p) {
    var R = rng(p.seed || 9), s = '', pts = p.pts;
    for (var k = 1; k < pts.length; k++) { var a = pts[k - 1], b = pts[k], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (var d = 0; d < L; d += (p.gap || 9)) { var t = d / L; s += circ(a[0] + (b[0] - a[0]) * t + (R() - 0.5) * 5, a[1] + (b[1] - a[1]) * t + (R() - 0.5) * 3, 0.9 + R() * 0.9, p.color || '#b07a3a', { st: 0 }); } }
    return g(s, { id: p.id });
  }

  // ── Outdoors ───────────────────────────────────────────────────────────
  function fence(p) {
    var w = p.w || 200, h = p.h || 56, c = p.color || '#f4efe4', s = '', gap = p.gap || 14;
    s += rect(0, -h * 0.75, w, 6, shade(c, -0.08)) + rect(0, -h * 0.3, w, 6, shade(c, -0.08));
    for (var x = 2; x < w - 6; x += gap) s += path('M' + x + ' 0L' + x + ' ' + (-h + 6) + 'L' + (x + 4.5) + ' ' + -h + 'L' + (x + 9) + ' ' + (-h + 6) + 'L' + (x + 9) + ' 0Z', c);
    if (p.smudge) { var sx = p.smudge[0], sy = p.smudge[1]; s += g(path('M' + (sx - 12) + ' ' + (sy - 6) + 'q12 -6 24 0q2 8 -4 12q-10 4 -18 0q-6 -4 -2 -12z', shade(c, 0.25), { st: 0, op: 0.95 }) + line(sx - 9, sy - 2, sx + 8, sy - 3, shade(c, -0.25), 0.8) + line(sx - 7, sy + 2, sx + 9, sy + 1, shade(c, -0.25), 0.8), { p: (p.id || 'fence') + '.smudge' }); }
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function signItem(p) {
    var w = p.w || 60, h = p.h || 26, s = '';
    if (p.post !== false) s += rect(w / 2 - 2, 0, 4, p.post || 30, '#8a5a34');
    s += rect(0, -h, w, h, p.color || '#fbf6e6', { rx: 2 }) + text(w / 2, -h / 2 + (p.size || 10) * 0.36, p.text || '', { size: p.size || 10, font: p.font || 'sign', fill: p.ink || '#b02a2a' });
    if (p.text2) s += text(w / 2, -h / 2 + (p.size || 10) * 1.3, p.text2, { size: (p.size || 10) * 0.7, font: 'sans', fill: p.ink || '#b02a2a' });
    return g(s, { x: p.x, y: p.y, id: p.id, r: p.r });
  }
  function tree(p) {
    var c = p.color || '#4f9a4a', sz = p.size || 1, s = '';
    s += shadow(0, 0, 24, 4) + path('M-6 0L-4 -50L4 -50L6 0Z', '#7a4a2a');
    if (p.kind === 'pine') s += poly([[0, -130], [-28, -60], [28, -60]], c) + poly([[0, -110], [-34, -40], [34, -40]], shade(c, -0.08));
    else s += circ(-18, -66, 22, shade(c, -0.08)) + circ(18, -70, 22, shade(c, -0.08)) + circ(0, -88, 26, c) + circ(-10, -64, 18, c) + circ(12, -62, 16, c);
    if (p.snow) s += path('M-24 -98Q0 -122 24 -98Q0 -108 -24 -98Z', '#fff', { sw: 0.8 });
    return g(s, { x: p.x, y: p.y, s: sz, id: p.id });
  }
  function bush(p) { var c = p.color || '#4f9a4a', w = p.w || 50; var s = circ(-w * 0.28, -w * 0.22, w * 0.28, shade(c, -0.08)) + circ(w * 0.28, -w * 0.22, w * 0.28, shade(c, -0.08)) + circ(0, -w * 0.34, w * 0.32, c) + rect(-w * 0.5, -w * 0.2, w, w * 0.2, c, { st: 0 }); if (p.flowers) { var R = rng(p.seed || 3); for (var i = 0; i < 6; i++) s += circ(-w * 0.4 + R() * w * 0.8, -w * 0.1 - R() * w * 0.45, 2.2, p.flowers, { sw: 0.5 }); } return g(s, { x: p.x, y: p.y, id: p.id }); }
  function flowerbed(p) { var w = p.w || 80, s = rect(0, -8, w, 10, '#6b4a2a', { st: 0, rx: 3 }), R = rng(p.seed || 8); for (var x = 6; x < w - 4; x += 9) { var hh = 12 + R() * 8; s += line(x, -6, x, -hh, '#3f9a3a', 1.2) + g(flowerHead(p.colors ? p.colors[Math.floor(R() * p.colors.length)] : '#e04a6a', 2.4), { x: x, y: -hh }); } return g(s, { x: p.x, y: p.y, id: p.id }); }
  function gnome(p) {
    var s = '', hat = p.hat || '#d33a3a', coat = p.coat || '#3a6ea5', tip = p.tip === 'R' ? 1 : -1;
    s += shadow(0, 0, 13, 3);
    s += rect(-9, -9, 7, 9, '#2b2b33', { rx: 2 }) + rect(2, -9, 7, 9, '#2b2b33', { rx: 2 });
    s += path('M-13 -7Q-15 -40 0 -44Q15 -40 13 -7Z', coat);
    s += rect(-13, -16, 26, 4, p.belt || '#6a4126', { sw: 0.8 });
    s += (p.buckle === 'round' ? circ(0, -14, 2.6, '#e8c34a', { sw: 0.7 }) : rect(-2.6, -16.6, 5.2, 5.2, '#e8c34a', { sw: 0.7 }));
    var bt = ''; for (var b = 0; b < (p.buttons == null ? 3 : p.buttons); b++) bt += circ(0, -21 - b * 5, 1.4, '#e8c34a', { sw: 0.5 });
    s += g(bt, { p: p.id ? p.id + '.buttons' : null });
    s += path('M-9.5 -46Q-11 -37 0 -34Q11 -37 9.5 -46Z', '#f4f0e6');
    s += circ(0, -49, 7, '#f2c6a0') + circ(-2.7, -50.6, 0.95, OL, { st: 0 }) + circ(2.7, -50.6, 0.95, OL, { st: 0 }) + circ(0, -47.4, 2.3, '#e8907a', { sw: 0.6 });
    s += path('M-9 -54Q-8 -72 ' + (6 * tip) + ' -78Q' + (2 * tip) + ' -68 9 -54Z', hat);
    s += rect(-10, -56.5, 20, 4, shade(hat, -0.15), { rx: 2 });
    var hx = p.shovel === 'L' ? -15 : 15;
    if (p.shovel !== false) s += line(hx, 2, hx, -30, '#a0622a', 1.6) + path('M' + (hx - 3) + ' 2L' + (hx + 3) + ' 2L' + (hx + 2.4) + ' 8Q' + hx + ' 10 ' + (hx - 2.4) + ' 8Z', '#9aa3ad', { sw: 0.8 }) + circ(hx, -20, 2.6, '#f2c6a0', { sw: 0.8 });
    if (p.snail) s += g(circ(0, 0, 3.4, '#c98a3a', { sw: 0.7 }) + path('M-1 0a1.4 1.4 0 1 1 1.4 1.4', 'none', { sw: 0.6 }) + path('M3 2L8 2Q9 0 8 -2', '#9a8a6a', { sw: 0.6 }), { x: -1 * tip, y: -63 });
    if (p.leaf) s += path('M5 -56q6 -4 9 2q-5 3 -9 -2z', '#d9822a', { sw: 0.6 });
    if (p.moss) s += circ(-8, -3, 2.2, '#6a9a3a', { st: 0, op: 0.85 }) + circ(-5, -1, 1.6, '#6a9a3a', { st: 0, op: 0.85 }) + circ(-10, -6, 1.4, '#6a9a3a', { st: 0, op: 0.85 });
    return g(s, { x: p.x, y: p.y, s: p.s || 1.4, id: p.id });
  }
  function stake(p) { return g(rect(-1.4, -16, 2.8, 18, '#a0703f') + rect(-8, -26, 16, 12, '#fbf6e6', { rx: 1.5 }) + text(0, -17, p.text, { size: 10, font: 'sign', fill: OL }), { x: p.x, y: p.y, id: p.id }); }
  function snowman(p) {
    var s = shadow(0, 0, 22, 4) + circ(0, -18, 20, '#fbfbff') + circ(0, -50, 15, '#fbfbff') + circ(0, -74, 11, '#fbfbff');
    s += circ(-3.5, -76, 1.2, OL, { st: 0 }) + circ(3.5, -76, 1.2, OL, { st: 0 }) + path('M0 -73L9 -71L0 -71Z', '#f08a2a', { sw: 0.7 });
    for (var b = 0; b < 3; b++) s += circ(0, -56 + b * 6, 1.4, OL, { st: 0 });
    s += line(-14, -52, -30, -62, '#6a4126', 1.6) + line(14, -52, 30, -64, '#6a4126', 1.6);
    if (p.hat) s += g(hat(p.hat, p.hatc, -74, 11, { band: p.band }), { p: (p.id || 'snowman') + '.hat' });
    if (p.scarf) s += rect(-11, -66, 22, 5, p.scarf, { rx: 2 }) + rect(4, -63, 5, 12, p.scarf, { rx: 1.5 });
    return g(s, { x: p.x, y: p.y, s: p.s, id: p.id });
  }
  function house(p) {
    var w = p.w || 120, h = p.h || 90, c = p.color || '#e8d7b5', rc = p.roof || '#8a3a2a', s = '';
    s += rect(0, -h, w, h, c) + poly([[-8, -h], [w / 2, -h - w * 0.36], [w + 8, -h]], rc);
    if (p.snowRoof) s += poly([[-9, -h - 1], [w / 2, -h - w * 0.36 - 3], [w + 9, -h - 1]], '#fbfdff', { sw: 1 }) + rect(-9, -h - 1, w + 18, 4, rc, { sw: 0.9 }) + path('M' + n(w * 0.2) + ' ' + n(-h - 3) + 'q6 4 12 0M' + n(w * 0.62) + ' ' + n(-h - 3) + 'q5 3 10 0', 'none', { st: '#c9d6e2', sw: 1 });
    s += rect(w * 0.12, -h * 0.75, w * 0.22, h * 0.26, '#bfe0f2') + rect(w * 0.66, -h * 0.75, w * 0.22, h * 0.26, '#bfe0f2');
    s += rect(w * 0.4, -h * 0.55, w * 0.2, h * 0.55, p.door || '#5a3a8a') + circ(w * 0.56, -h * 0.28, 1.6, '#e8c34a', { sw: 0.5 });
    if (p.num) s += rect(w * 0.43, -h * 0.66, w * 0.14, h * 0.09, '#fbf6e6', { sw: 0.7 }) + text(w * 0.5, -h * 0.59, p.num, { size: 7, font: 'sans', weight: 700 });
    if (p.label) s += nameTag(w / 2, 14, p.label);
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function car(p) {
    var c = p.color || '#d33a3a', d = p.dir === 'L' ? -1 : 1, s = '';
    s += shadow(0, 2, 46, 5);
    s += path('M-48 -10Q-48 -24 -36 -26L-24 -27L-14 -42Q-10 -46 0 -46L20 -46Q28 -46 32 -40L40 -28Q50 -26 50 -16L50 -8L-48 -8Z', c);
    s += path('M-10 -40L-2 -40L-2 -28L-20 -28Z', '#bfe0f2', { sw: 0.9 }) + path('M2 -40L20 -40Q25 -40 28 -36L33 -28L2 -28Z', '#bfe0f2', { sw: 0.9 });
    s += rect(44, -22, 5, 4, '#ffe9a0', { sw: 0.6 }) + rect(-48, -20, 4, 4, '#e0384a', { sw: 0.6 });
    s += circ(-28, -8, 9, '#2b2b33') + circ(-28, -8, 4, '#9aa3ad') + circ(30, -8, 9, '#2b2b33') + circ(30, -8, 4, '#9aa3ad');
    if (p.plate) s += rect(-48, -16, 16, 6, '#fbf6e6', { sw: 0.6 });
    var inner = '';
    if (p.snowRoof) inner += g(path('M-16 -43Q-12 -50 0 -50L20 -50Q28 -50 32 -42L28 -44L-12 -44Z', '#fff', { sw: 0.8 }), { p: (p.id || 'car') + '.roof' });
    if (p.snowHood) inner += g(path('M33 -29Q42 -33 50 -22L50 -18Q44 -27 33 -26Z', '#fff', { sw: 0.8 }), { p: (p.id || 'car') + '.hood' }) + path('M-48 -14Q-48 -26 -30 -27L-26 -25Q-44 -24 -46 -12Z', '#fff', { sw: 0.8 });
    else if (p.wetHood) inner += g(path('M34 -27Q42 -27 49 -19', 'none', { st: '#6f9fc4', sw: 1.2 }) + path('M40 -20q1.2 1.8 1.2 2.6a1.2 1.2 0 0 1 -2.4 0q0 -.8 1.2 -2.6z', '#7fc4f2', { st: '#3a7fb8', sw: 0.5 }) + path('M36 -24q1 1.4 1 2a1 1 0 0 1 -2 0q0 -.6 1 -2z', '#7fc4f2', { st: '#3a7fb8', sw: 0.5 }), { p: (p.id || 'car') + '.hood' });
    if (p.snowGlass) inner += path('M-10 -40L-2 -40L-2 -28L-20 -28Z', '#fff', { sw: 0.8, op: 0.95 }) + path('M2 -40L20 -40Q25 -40 28 -36L33 -28L2 -28Z', '#fff', { sw: 0.8, op: 0.95 });
    s += inner;
    return g(g(s, { fx: d < 0 }), { x: p.x, y: p.y, s: p.s, id: p.id });
  }
  function van(p) {
    var c = p.color || '#f4f4f4', s = '';
    s += shadow(0, 2, 58, 5);
    s += path('M-60 -8L-60 -60Q-60 -64 -56 -64L26 -64Q32 -64 36 -56L48 -36Q60 -32 60 -20L60 -8Z', c);
    s += path('M30 -58L36 -58L46 -38L30 -38Z', '#bfe0f2', { sw: 0.9 });
    s += circ(-36, -8, 10, '#2b2b33') + circ(-36, -8, 4.5, '#9aa3ad') + circ(38, -8, 10, '#2b2b33') + circ(38, -8, 4.5, '#9aa3ad');
    if (p.stripe) s += rect(-60, -30, 108, 6, p.stripe, { st: 0 });
    if (p.logo) s += g(logoMark(p.logo, 11), { x: -44, y: -44, p: (p.id || 'van') + '.logo' }) + text(-29, -45, p.name || '', { size: 10, font: 'sign', fill: p.ink || '#1f4a7a', anchor: 'start' }) + text(-29, -36.5, p.sub || '', { size: 5.6, font: 'sans', fill: p.ink || '#1f4a7a', anchor: 'start' });
    return g(s, { x: p.x, y: p.y, s: p.s, id: p.id });
  }
  function lamppost(p) { var s = shadow(0, 0, 10, 2.4) + rect(-2.4, -120, 4.8, 120, '#3a3a46') + rect(-6, -6, 12, 6, '#3a3a46') + path('M-9 -120L9 -120L6 -134L-6 -134Z', '#3a3a46') + rect(-6, -132, 12, 10, '#ffe9a0', { sw: 0.8 }); return g(s, { x: p.x, y: p.y, id: p.id }); }
  function bench(p) { var w = p.w || 80, c = p.color || '#8a5a34', s = shadow(w / 2, 0, w * 0.5, 3) + rect(6, -22, 4, 22, '#3a3a46') + rect(w - 10, -22, 4, 22, '#3a3a46') + rect(0, -24, w, 5, c, { rx: 1 }) + rect(0, -42, w, 5, c, { rx: 1 }) + rect(0, -34, w, 5, c, { rx: 1 }); return g(s, { x: p.x, y: p.y, id: p.id }); }
  function barn(p) {
    var w = p.w || 150, h = p.h || 90, s = '', c = p.color || '#b0413e';
    s += rect(0, -h, w, h, c) + path('M-6 ' + -h + 'L' + n(w * 0.2) + ' ' + n(-h - 34) + 'L' + n(w * 0.8) + ' ' + n(-h - 34) + 'L' + (w + 6) + ' ' + -h + 'Z', '#5a3a3a');
    for (var x = 8; x < w; x += 10) s += line(x, -h + 2, x, -2, shade(c, -0.15), 1);
    s += rect(w * 0.32, -h * 0.68, w * 0.36, h * 0.68, shade(c, -0.12)) + path('M' + n(w * 0.32) + ' ' + n(-h * 0.68) + 'L' + n(w * 0.68) + ' 0M' + n(w * 0.68) + ' ' + n(-h * 0.68) + 'L' + n(w * 0.32) + ' 0', 'none', { st: '#fbf6e6', sw: 2.4 }) + rect(w * 0.32, -h * 0.68, w * 0.36, h * 0.68, 'none', { st: '#fbf6e6', sw: 2.4 });
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  // a post or person-sized thing with its shadow: shadow {dx, len} drawn on the ground as a skewed dark shape
  function castShadow(p) {
    // a shadow lying on the ground from (x, y): w = width of the thing, len = how far it reaches, dir 1 = right, -1 = left;
    // head: false for posts and trees (no round end). Ground is seen at an angle, so the shadow runs a little "back" (up).
    var w = p.w || 10, len = p.len || 40, d = p.dir || 1, back = len * (p.back == null ? 0.1 : p.back), th = p.th || Math.max(3, w * 0.42), s = '';
    if (len < 8) s += ell(0, 0.5, w * 0.75 + len * 0.3, 2.6, '#1b1b2a', { st: 0, op: p.op || 0.34 });
    else {
      var ex = d * len, ey = -back;
      s += path('M' + n(-w / 2) + ' 0.6L' + n(w / 2) + ' -0.6L' + n(ex) + ' ' + n(ey + th / 2) + 'L' + n(ex) + ' ' + n(ey - th / 2) + 'Z', '#1b1b2a', { st: 0, op: p.op || 0.34 });
      if (p.head !== false) s += ell(ex + d * th * 0.9, ey, th * 1.1, th * 0.8, '#1b1b2a', { st: 0, op: p.op || 0.34 });
    }
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function post(p) { var h = p.h || 40; return g(rect(-3, -h, 6, h, p.color || '#8a5a34', { sw: 1 }) + path('M-3 ' + -h + 'L0 ' + (-h - 4) + 'L3 ' + -h + 'Z', p.color || '#8a5a34', { sw: 1 }), { x: p.x, y: p.y, id: p.id }); }
  function sun(p) { var s = ''; for (var i = 0; i < 10; i++) { var t = i * Math.PI / 5; s += line(Math.cos(t) * (p.r || 12) * 1.25, Math.sin(t) * (p.r || 12) * 1.25, Math.cos(t) * (p.r || 12) * 1.6, Math.sin(t) * (p.r || 12) * 1.6, '#f6c34a', 2); } return g(s + circ(0, 0, p.r || 12, '#ffd34d', { st: '#e8a62a' }), { x: p.x, y: p.y, id: p.id }); }
  function cloud(p) { var s = circ(-14, 0, 10, '#fff', { st: 0 }) + circ(0, -6, 13, '#fff', { st: 0 }) + circ(14, 0, 10, '#fff', { st: 0 }) + rect(-14, 0, 28, 10, '#fff', { st: 0 }); return g(s, { x: p.x, y: p.y, s: p.s, op: p.op == null ? 0.9 : p.op }); }
  function rainfall(p, W, H) { var R = rng(p.seed || 21), s = '', N = p.n || 90; for (var i = 0; i < N; i++) { var x = R() * (p.w || W), y = R() * (p.h || H); s += line(x, y, x - 3, y + 10, '#8db6d6', 1, { op: 0.6 }); } return g(s, { x: p.x || 0, y: p.y || 0 }); }
  function snowfall(p, W, H) { var R = rng(p.seed || 22), s = '', N = p.n || 70; for (var i = 0; i < N; i++) s += circ(R() * (p.w || W), R() * (p.h || H), 0.8 + R() * 1.3, '#fff', { st: 0, op: 0.9 }); return g(s, { x: p.x || 0, y: p.y || 0 }); }

  // ── Table things ───────────────────────────────────────────────────────
  function cake(p) { var c = p.color || '#f6b3c8', s = shadow(0, 0, 22, 3) + ell(0, -1, 24, 4, '#fff') + rect(-18, -22, 36, 20, '#f4e2c4') + rect(-18, -26, 36, 8, c, { rx: 3 }); if (p.slice) s += path('M6 -26L18 -26L18 -2L6 -2Z', '#fff', { st: 0 }) + path('M6 -26L6 -2', 'none', { sw: 1 }); if (p.candles) for (var i = 0; i < p.candles; i++) s += rect(-12 + i * 8, -34, 2.4, 8, '#9ad1f0', { sw: 0.5 }) + path('M' + (-10.8 + i * 8) + ' -40q2 3 0 5q-2 -2 0 -5z', '#ffcf4a', { sw: 0.4 }); return g(s, { x: p.x, y: p.y, id: p.id }); }
  function plate(p) { var s = ell(0, 0, p.r || 12, (p.r || 12) * 0.3, '#fff') + ell(0, 0, (p.r || 12) * 0.65, (p.r || 12) * 0.18, 'none', { st: '#ccc', sw: 0.6 }); if (p.food) s += ell(0, -1.5, (p.r || 12) * 0.5, (p.r || 12) * 0.18, p.food, { sw: 0.7 }); return g(s, { x: p.x, y: p.y, id: p.id }); }
  function cup(p) { var c = p.color || '#fff', s = rect(-5, -11, 10, 11, c, { rx: 1.5 }) + path('M5 -8q4 0 4 3t-4 3', 'none', { sw: 1 }); if (p.steam) s += path('M-1 -14q-2 -3 0 -6M2 -14q-2 -3 0 -6', 'none', { st: '#aab', sw: 0.8 }); if (p.lipstick) s += path('M-3 -11q1.6 1.6 3.2 0', 'none', { st: '#d0304a', sw: 1.4 }); return g(s, { x: p.x, y: p.y, id: p.id }); }
  function glass(p) { var lvl = p.level == null ? 0.6 : p.level, c = p.color || '#f2d34a', s = ''; s += path('M-6 -20L6 -20L5 0L-5 0Z', 'rgba(220,235,250,.5)'); if (lvl > 0) s += path('M' + n(-6 + lvl * 0) + ' ' + n(-20 * lvl) + 'L6 ' + n(-20 * lvl) + 'L5 0L-5 0Z', c, { st: 0, op: 0.85 }); for (var i = 0; i < (p.ice || 0); i++) s += rect(-4 + (i % 2) * 4, -20 * lvl - 1 + Math.floor(i / 2) * 4, 3.6, 3.6, '#e9f6ff', { sw: 0.5, rx: 0.6 }); if (p.straw) s += line(2, -26, 0, -2, p.straw, 1.4); s += path('M-6 -20L6 -20L5 0L-5 0Z', 'none'); return g(s, { x: p.x, y: p.y, id: p.id }); }
  function pie(p) { var s = shadow(0, 0, 22, 3) + ell(0, -2, 22, 6, '#c98a3a') + ell(0, -4, 19, 4.6, p.filling || '#7a3b8a', { sw: 0.8 }); if (p.missing) s += path('M0 -4L18 -6L14 -1Z', p.missing === true ? '#fff' : p.missing, { sw: 0.6 }); for (var i = 0; i < 4; i++) s += line(-14 + i * 8, -7, -10 + i * 8, -2, '#e3b56a', 1.4); return g(s, { x: p.x, y: p.y, id: p.id }); }
  function teapot(p) { var c = p.color || '#3a7ab8'; return g(ell(0, -10, 13, 10, c) + path('M12 -12Q20 -16 22 -22', 'none', { st: OL, sw: 3 }) + path('M-12 -14q-8 0 -8 5t8 5', 'none', { sw: 2 }) + ell(0, -20, 7, 2.4, shade(c, -0.15)) + circ(0, -23, 1.8, shade(c, -0.15)), { x: p.x, y: p.y, id: p.id }); }
  function note(p) {
    var w = p.w || 60, h = p.h || 40, s = '';
    s += rect(0, 0, w, h, p.color || '#fbf6e6', { sw: 0.8, a: 'filter="url(#' + C.uid + '-soft)"' });
    if (p.lines) for (var y = 10; y < h - 2; y += 7) s += line(3, y, w - 3, y, '#a9c7ee', 0.5);
    (p.text || []).forEach(function (t, i) { s += text(p.align === 'left' ? 4 : w / 2, 10 + i * (p.lh || 9), t, { size: p.size || 7.5, anchor: p.align === 'left' ? 'start' : 'middle', fill: p.ink || '#1f2a6b', font: p.font }); });
    if (p.pin) s += circ(w / 2, 3, 2.6, p.pin, { sw: 0.7 });
    if (p.tape) s += rect(w / 2 - 9, -4, 18, 7, 'rgba(240,230,190,.8)', { st: 0, a: 'transform="rotate(-6 ' + n(w / 2) + ' 0)"' });
    return g(s, { x: p.x, y: p.y, id: p.id, r: p.r });
  }
  function calendar(p) { var s = rect(0, 0, 34, 38, '#fff', { rx: 1.5 }) + rect(0, 0, 34, 10, p.color || '#c0392b', { rx: 1.5 }) + text(17, 7.6, p.month || 'MAY', { size: 7, fill: '#fff', font: 'sans', weight: 800 }) + text(17, 31, p.day || '14', { size: 18, font: 'sans', weight: 800 }) + circ(9, 0, 1.4, '#888', { st: 0 }) + circ(25, 0, 1.4, '#888', { st: 0 }); return g(s, { x: p.x, y: p.y, id: p.id }); }
  function trophy(p) { var c = p.color || '#e8c34a'; return g(path('M-8 -26L8 -26Q8 -12 0 -10Q-8 -12 -8 -26Z', c) + path('M-8 -23q-6 0 -5 5t6 3M8 -23q6 0 5 5t-6 3', 'none', { st: OL, sw: 1.2 }) + rect(-2, -11, 4, 6, c, { sw: 0.8 }) + rect(-7, -5, 14, 5, '#5a3a22', { sw: 0.8 }), { x: p.x, y: p.y, s: p.s, id: p.id }); }
  function globe(p) { return g(rect(-1.5, -6, 3, 6, '#5a3a22') + ell(0, -1, 9, 2, '#5a3a22') + circ(0, -20, 13, '#5aa0d8') + path('M-8 -26q4 -3 8 0t2 6q-4 2 -6 -1t-4 -5zM2 -12q4 -2 7 1q-2 4 -6 3z', '#6bbf5a', { sw: 0.6 }) + path('M-14 -20A14 14 0 0 1 14 -20', 'none', { st: '#c9a227', sw: 1.4 }), { x: p.x, y: p.y, s: p.s, id: p.id }); }
  function bear(p) { var c = p.color || '#b07a4a'; return g(circ(-9, -36, 4.5, c) + circ(9, -36, 4.5, c) + ell(0, -12, 11, 12, c) + circ(0, -30, 10, c) + ell(0, -27, 4, 3, shade(c, 0.3)) + circ(-3.4, -32, 1, OL, { st: 0 }) + circ(3.4, -32, 1, OL, { st: 0 }) + circ(-9, -4, 4, c) + circ(9, -4, 4, c) + (p.bow ? path('M0 -21l-5 -3v6zM0 -21l5 -3v6z', p.bow, { sw: 0.6 }) : ''), { x: p.x, y: p.y, s: p.s, id: p.id }); }
  function shipBottle(p) { return g(path('M-22 -2Q-24 -14 -14 -16L14 -16Q22 -16 22 -10L28 -10L28 -6L22 -6Q22 0 14 0L-14 0Q-22 0 -22 -2Z', 'rgba(200,230,215,.55)') + path('M-12 -6L10 -6L6 -2L-8 -2Z', '#8a5a34', { sw: 0.6 }) + path('M-1 -6L-1 -15L8 -7Z', '#fff', { sw: 0.5 }) + rect(-3, 0, 6, 3, '#8a5a34', { sw: 0.6 }) + rect(27, -10, 4, 4, '#a0703f', { sw: 0.5 }), { x: p.x, y: p.y, s: p.s, id: p.id }); }
  function toycar(p) { var c = p.color || '#3a7ab8'; return g(path('M-14 -4L-14 -10L-8 -10L-4 -16L6 -16L10 -10L14 -10L14 -4Z', c) + circ(-8, -3, 3.4, '#2b2b33') + circ(8, -3, 3.4, '#2b2b33'), { x: p.x, y: p.y, s: p.s, id: p.id }); }
  function cameraObj(p) { return g(rect(-12, -16, 24, 16, '#2b2b33', { rx: 2 }) + rect(-6, -19, 8, 4, '#2b2b33', { rx: 1 }) + circ(2, -8, 5.5, '#6fa8d8', { st: '#9aa3ad', sw: 1.6 }) + circ(-8, -13, 1.4, '#e0384a', { st: 0 }), { x: p.x, y: p.y, s: p.s, id: p.id }); }
  function booksStack(p) { var s = '', cols = p.colors || ['#b0413e', '#3a6ea5', '#e0b351']; for (var i = 0; i < cols.length; i++) s += rect(-14 + (i % 2) * 2, -6 - i * 6, 28, 6, cols[i], { sw: 0.8 }); return g(s, { x: p.x, y: p.y, s: p.s, id: p.id }); }
  function soap(p) {
    // a bar of soap with a key pressed into it (the key's outline, sunk in)
    var s = rect(-40, -22, 80, 44, p.color || '#f4e6d0', { rx: 10 }) + rect(-36, -18, 72, 36, 'none', { st: shade(p.color || '#f4e6d0', -0.08), sw: 1.2, rx: 8 });
    if (p.key) s += g('<g opacity=".5">' + keyShape(Object.assign({}, p.key, { col: shade(p.color || '#f4e6d0', -0.28), hole: shade(p.color || '#f4e6d0', -0.05) }), 1, 0, 0) + '</g>', { x: -24, y: 0, s: 0.72, p: (p.id || 'soap') + '.print' });
    return g(s, { x: p.x, y: p.y, s: p.s, id: p.id, r: p.r });
  }
  function keyItem(p) { return g(keyShape(p, p.s || 0.8, 0, 0, p.r) + (p.label ? nameTag(18 * (p.s || 0.8), 26, p.label) : ''), { x: p.x, y: p.y, id: p.id }); }
  function toolbox(p) { return g(held('toolbox', { tbc: p.color, tbLogo: p.logo }), { x: p.x, y: p.y, s: p.s || 1.6, id: p.id }); }
  function label(p) { return g(nameTag(0, 0, p.text), { x: p.x, y: p.y, s: p.s, id: p.id }); }
  function caption(p) { return text(p.x, p.y, p.text, { size: p.size || 11, font: p.font || 'hand', fill: p.fill || OL, anchor: p.anchor, weight: p.weight, r: p.r, op: p.op }); }
  function paper(p) {
    // a worksheet / letter with handwriting lines given as {t:'text'} or drawn glyph rows
    var w = p.w || 80, h = p.h || 100, s = rect(0, 0, w, h, p.color || '#fffdf6', { sw: 0.8 });
    if (p.ruled) for (var y = 16; y < h - 4; y += 10) s += line(4, y, w - 4, y, '#a9c7ee', 0.5);
    if (p.head) s += text(w / 2, 10, p.head, { size: 7, font: 'sans', weight: 700, fill: '#555' });
    if (p.body) s += p.body;
    return g(s, { x: p.x, y: p.y, id: p.id, r: p.r });
  }
  function tag(p) { return g(rect(-14, -8, 28, 16, p.color || '#fbf6e6', { rx: 2, sw: 0.9 }) + circ(-10, 0, 1.6, '#c9b98f', { st: 0 }) + text(2, 4, p.text, { size: p.size || 11, font: 'sign' }), { x: p.x, y: p.y, s: p.s, id: p.id, r: p.r }); }

  // ── Top-down pieces (maps, tables seen from above) ───────────────────────
  function tpath(p) { return g(pline(p.pts, OL, (p.w || 22) + 2.4) + pline(p.pts, p.color || '#e3cf9f', p.w || 22), { id: p.id }); }
  function tpond(p) { return g(ell(0, 0, p.rx || 40, p.ry || 26, '#7cc0e8', { st: '#4a8ac2', sw: 1.4 }) + ell(-8, -6, (p.rx || 40) * 0.4, (p.ry || 26) * 0.25, '#bfe6f8', { st: 0, op: 0.7 }), { x: p.x, y: p.y, id: p.id }); }
  function ttree(p) { var r = p.r || 16, c = p.color || '#4f9a4a'; return g(circ(3, 4, r, '#000', { st: 0, op: 0.15 }) + circ(0, 0, r, c) + circ(-r * 0.3, -r * 0.3, r * 0.45, shade(c, 0.15), { st: 0 }), { x: p.x, y: p.y, id: p.id }); }
  function tbench(p) { return g(rect(-16, -5, 32, 10, '#8a5a34', { rx: 1.5 }) + line(-14, -1.6, 14, -1.6, '#6a4126', 0.8) + line(-14, 1.6, 14, 1.6, '#6a4126', 0.8), { x: p.x, y: p.y, r: p.r, id: p.id }); }
  function tpaths(p) { return g(p.paths.map(function (q) { return pline(q.pts || q, OL, (q.w || p.w || 22) + 2.4); }).join('') + p.paths.map(function (q) { return pline(q.pts || q, p.color || '#e3cf9f', q.w || p.w || 22); }).join(''), { id: p.id }); }
  function tgate(p) { return g(g(rect(-15, -4.5, 30, 9, '#5a5a66', { rx: 2 }) + line(-10, -4.5, -10, 4.5, '#8a8a96', 1) + line(0, -4.5, 0, 4.5, '#8a8a96', 1) + line(10, -4.5, 10, 4.5, '#8a8a96', 1), { r: p.r }) + tag({ text: p.text, x: p.lx || 0, y: p.ly == null ? -16 : p.ly }), { x: p.x, y: p.y, id: p.id }); }
  function troundtable(p) {
    // a round table seen from above with N place settings; seats [{plate, food, fork:'L'|'R', cup:{color}, hat, cane, ...}]
    var r = p.r || 60, N = p.seats.length, s = '';
    p.seats.forEach(function (st, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / N, cr = r + 20 * (p.cs || 1), cx = Math.cos(a) * cr, cy = Math.sin(a) * cr, deg = a * 180 / Math.PI + 90;
      var ch = rect(-15, -12, 30, 24, p.chair || '#9a6438', { rx: 5 }) + rect(-15, -16, 30, 7, shade(p.chair || '#9a6438', -0.2), { rx: 2 });
      if (st.hat) ch += g(circ(0, -1, 10.5, st.hat, { sw: 0.9 }) + circ(0, -1, 6.4, shade(st.hat, -0.25), { sw: 0.6 }) + circ(-2, -3, 2.4, shade(st.hat, 0.2), { st: 0, op: 0.6 }), { p: 'seat' + (i + 1) + '.hat' });
      if (st.scarf) ch += g(path('M-14 -10q14 10 28 0l0 5q-14 10 -28 0z', st.scarf, { sw: 0.7 }) + rect(6, -6, 5, 14, st.scarf, { sw: 0.7, rx: 1.5 }), { p: 'seat' + (i + 1) + '.scarf' });
      if (st.bag) ch += g(rect(-7, -4, 14, 10, st.bag, { rx: 2, sw: 0.8 }) + path('M-4 -4q4 -5 8 0', 'none', { sw: 1 }), { p: 'seat' + (i + 1) + '.bag' });
      if (st.cane) ch += g(path('M-18 -10L-18 14Q-18 20 -12 20', 'none', { st: OL, sw: 3.4 }) + path('M-18 -10L-18 14Q-18 20 -12 20', 'none', { st: '#7a4a2a', sw: 2 }), { p: 'seat' + (i + 1) + '.cane' });
      s += g(ch, { x: cx, y: cy, r: n(deg), s: p.cs || 1 });
    });
    s += circ(4, 6, r, '#000', { st: 0, op: 0.15 }) + circ(0, 0, r, p.cloth || '#f4efe4', { sw: 1.4 }) + circ(0, 0, r - 6, 'none', { st: shade(p.cloth || '#f4efe4', -0.1), sw: 1 });
    p.seats.forEach(function (st, i) {
      var ss = p.ss || 1, a = -Math.PI / 2 + i * 2 * Math.PI / N, px = Math.cos(a) * (r - 20 * ss), py = Math.sin(a) * (r - 20 * ss), deg = a * 180 / Math.PI + 90, t = '';
      t += circ(0, 0, 11, '#fff') + circ(0, 0, 7, 'none', { st: '#d8d2c4', sw: 0.7 });
      if (st.food) t += circ(0, 0, 5, st.food, { sw: 0.6 });
      if (st.peas) t += g([[ -6, 8 ], [-4, 9], [-7, 6]].map(function (q) { return circ(q[0], q[1], 1.1, '#5aa83a', { sw: 0.4 }); }).join(''), {});
      // fork and knife: forkSide 'L' means the fork lies on the diner's left
      var fx = st.fork === 'R' ? -1 : 1;
      t += g(rect(-0.9, -4, 1.8, 13, '#aab2bc', { sw: 0.5 }) + path('M-2.8 -4Q-2.8 -1 0 -1Q2.8 -1 2.8 -4Z', '#aab2bc', { sw: 0.5 }) + path('M-2.4 -4v-6M-0.8 -4v-6M0.8 -4v-6M2.4 -4v-6', 'none', { st: '#7a828c', sw: 0.8 }), { x: fx * 15, y: 0, p: 'seat' + (i + 1) + '.fork' });
      t += g(rect(-0.9, 1, 1.8, 9, '#7a828c', { sw: 0.5 }) + path('M-1.6 1L-1.6 -9Q1.8 -8 1.6 1Z', '#dfe3e8', { sw: 0.5 }), { x: -fx * 15, y: 0, p: 'seat' + (i + 1) + '.knife' });
      if (st.cup) t += g(circ(0, 0, 5, '#fff') + circ(0, 0, 3.6, st.cup, { sw: 0.5 }) + path('M5 0h3', 'none', { sw: 1.4 }) + (st.lipstick ? path('M-3.6 -3.4q2 -1.6 4 -1.2', 'none', { st: '#d0304a', sw: 1.4 }) : '') + (st.sugar ? rect(9, -8, 4, 6, '#fff', { sw: 0.5 }) : ''), { x: 18 * (st.cupSide === 'L' ? 1 : -1), y: -13, p: 'seat' + (i + 1) + '.cup' });
      if (st.glasses) t += g(circ(-3, 0, 2.4, 'none', { sw: 0.7 }) + circ(3, 0, 2.4, 'none', { sw: 0.7 }) + line(-0.6, 0, 0.6, 0, OL, 0.7), { x: -10, y: -14, p: 'seat' + (i + 1) + '.glasses' });
      if (st.cards) t += g(rect(-8, -5, 10, 14, '#fff', { sw: 0.6, rx: 1, a: 'transform="rotate(-12)"' }) + rect(-2, -5, 10, 14, '#fff', { sw: 0.6, rx: 1, a: 'transform="rotate(10)"' }), { x: 0, y: 0 });
      s += g(t, { x: px, y: py, r: n(deg), s: ss });
      var tr = r + (p.tagR || 48);
      if (p.numbers !== false) s += g(tag({ text: String(i + 1), x: 0, y: 0, s: 0.8 }), { x: Math.cos(a) * tr + (p.tagDx || 0) * (Math.abs(Math.cos(a)) < 0.1 ? 1.15 : Math.sign(Math.cos(a))), y: Math.sin(a) * tr });
    });
    return g(s, { x: p.x, y: p.y, id: p.id });
  }
  function twall(p) { return pline(p.pts, p.color || '#4a3a5a', p.w || 6); }
  function tcase(p) { var s = rect(-14, -10, 28, 20, 'rgba(200,230,250,.55)', { sw: 1.2 }) + rect(-14, -10, 28, 20, 'none', { st: '#7a828c', sw: 1.6 }); if (p.empty) s += rect(-5, -5, 10, 10, 'none', { st: '#a33', sw: 0.8, a: 'stroke-dasharray="1.6 1.6"' }); else if (p.gem) s += path('M-4 0L0 -5L4 0L0 5Z', p.gem, { sw: 0.6 }); return g(s, { x: p.x, y: p.y, r: p.r, id: p.id }); }
  function laser(p) { return g(pline(p.pts, '#ff3a4a', 1.4, { op: 0.85 }) + p.pts.map(function (q) { return circ(q[0], q[1], 2.2, '#5a5a66', { sw: 0.6 }); }).join(''), { id: p.id }); }
  function rope(p) { return g(pline(p.pts, '#b0273a', 2.2) + p.pts.map(function (q) { return circ(q[0], q[1], 2.6, '#c9a227', { sw: 0.6 }); }).join(''), { id: p.id }); }
  function tdoor(p) { var s = rect(-12, -3.5, 24, 7, p.color || '#c98a3a', { sw: 0.9 }); if (p.tape) s += line(-13, -5, 13, 5, '#e8c32a', 2.6) + line(-13, 5, 13, -5, '#e8c32a', 2.6); if (p.paint) s += rect(-12, -3, 24, 6, '#3aa65a', { sw: 0.9 }); return g(g(s, { r: p.r }) + (p.text ? tag({ text: p.text, x: p.lx || 0, y: p.ly || 0, s: 0.85 }) : ''), { x: p.x, y: p.y, id: p.id }); }
  function tsign(p) { return g(path('M-8 6L0 -8L8 6Z', '#f2c230', { sw: 0.9 }) + text(0, 4, '!', { size: 9, font: 'sans', weight: 900 }), { x: p.x, y: p.y, id: p.id }); }
  function tcar(p) { var c = p.color || '#d33a3a'; return g(rect(-12, -22, 24, 44, c, { rx: 6 }) + rect(-9, -12, 18, 10, '#bfe0f2', { sw: 0.8 }) + rect(-9, 6, 18, 8, '#bfe0f2', { sw: 0.8 }) + (p.snow ? rect(-10, -4, 20, 12, '#fff', { sw: 0.6, rx: 3 }) : ''), { x: p.x, y: p.y, r: p.r, id: p.id }); }
  function tsnowman(p) { return g(circ(3, 4, 15, '#9aa7b8', { st: 0, op: 0.35 }) + line(-12, 2, -26, 8, '#6a4126', 1.8) + line(12, -1, 26, -8, '#6a4126', 1.8) + circ(0, 0, 14, '#fbfbff') + circ(0, 0, 9, '#fbfbff') + (p.hat ? circ(0, 0, 6.5, p.hat, { sw: 0.9 }) + circ(0, 0, 4.4, shade(p.hat, 0.12), { sw: 0.6 }) : circ(0, 0, 4, '#fbfbff', { sw: 0.6 })) + path('M5 6l6 3-5 -0.5z', '#f08a2a', { sw: 0.6 }), { x: p.x, y: p.y, id: p.id }); }
  function tporch(p) { return g(rect(0, 0, p.w || 120, p.h || 30, '#c8a27a', { sw: 1.2 }) + line(0, (p.h || 30) / 2, p.w || 120, (p.h || 30) / 2, '#a8825a', 0.8), { x: p.x, y: p.y, id: p.id }); }
  function trect(p) { return g(rect(0, 0, p.w, p.h, p.color || '#ccc', { st: p.st === 0 ? 0 : p.stc || OL, sw: p.sw || 1.2, rx: p.rx }), { x: p.x, y: p.y, id: p.id, op: p.op }); }

  // ── Panels: a photo inside the picture (before/after, alibi snapshots) ───
  function photo(p) {
    var w = p.w, h = p.h, sc = p.scale || 1, s = '', id = nid('ph');
    def('<clipPath id="' + id + '"><rect x="0" y="0" width="' + n(w) + '" height="' + n(h) + '"/></clipPath>');
    var b = p.border == null ? 6 : p.border, bb = p.caption ? 18 : b;
    s += rect(-b, -b, w + b * 2, h + b + bb, p.paper || '#fbfaf5', { sw: 0.8 });
    s += g(g(background(p.bg || ['plain', {}], w / sc, h / sc) + items(p.items || []), { s: sc }), { clip: id });
    s += rect(0, 0, w, h, 'none', { st: 'rgba(0,0,0,.25)', sw: 0.8 });
    if (p.caption) s += text(w / 2, h + 12.5, p.caption, { size: p.capSize || 11, fill: '#3a3550' });
    return g(s, { x: p.x, y: p.y, r: p.r, id: p.id });
  }

  // ── Backgrounds ────────────────────────────────────────────────────────
  function background(bg, W, H) {
    var k = bg[0], o = bg[1] || {}, s = '';
    if (k === 'room') {
      var fy = o.floorY || 200, wall = o.wall || '#efe2c8';
      s += rect(0, 0, W, fy, wall, { st: 0 });
      if (o.paper === 'stripes') for (var x = 0; x < W; x += 22) s += rect(x, 0, 9, fy, shade(wall, -0.05), { st: 0 });
      else if (o.paper === 'dots') for (var yy = 12; yy < fy - 10; yy += 22) for (var xx = (yy / 22) % 2 ? 11 : 0; xx < W; xx += 22) s += circ(xx, yy, 2, shade(wall, -0.08), { st: 0 });
      else if (o.paper === 'diamonds') for (var yd = 0; yd < fy; yd += 24) for (var xd = 0; xd < W + 24; xd += 24) s += path('M' + xd + ' ' + yd + 'l6 6l-6 6l-6 -6z', shade(wall, -0.06), { st: 0 });
      else if (o.paper === 'tiles') { for (var yt = 0; yt < fy; yt += 16) s += line(0, yt, W, yt, shade(wall, -0.1), 0.8); for (var xt = 0; xt < W; xt += 16) s += line(xt, 0, xt, fy, shade(wall, -0.1), 0.8); }
      if (o.rail) s += rect(0, o.rail, W, 5, shade(wall, -0.15), { st: 0 });
      var fl = o.floor || '#c48a52';
      s += rect(0, fy, W, H - fy, fl, { st: 0 });
      if (o.floorKind === 'tile') { for (var r = 0; r * 18 < H - fy; r++) for (var c = 0; c * 26 < W; c++) if ((r + c) % 2) s += rect(c * 26, fy + r * 18, 26, 18, shade(fl, -0.08), { st: 0 }); }
      else if (o.floorKind === 'carpet') s += rect(0, fy, W, H - fy, shade(fl, 0.04), { st: 0 });
      else { var py = fy; var R = rng(31), gap = 10; while (py < H) { s += line(0, py, W, py, shade(fl, -0.18), 0.9); var off = R() * 60; for (var px = off; px < W; px += 70 + R() * 30) s += line(px, py, px, py + gap, shade(fl, -0.18), 0.8); py += gap; gap *= 1.12; } }
      s += rect(0, fy - 7, W, 8, o.base || shade(wall, -0.28), { st: 0 }) + line(0, fy, W, fy, shade(wall, -0.45), 1);
    } else if (k === 'outside') {
      var gy = o.groundY || 200, skyA = o.sky || '#9fd3f2', skyB = o.sky2 || '#dff1fb', gid = nid('sky');
      def('<linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + skyA + '"/><stop offset="1" stop-color="' + skyB + '"/></linearGradient>');
      s += rect(0, 0, W, gy, 'url(#' + gid + ')', { st: 0 });
      if (o.hills) s += path('M0 ' + gy + 'Q' + W * 0.2 + ' ' + (gy - 40) + ' ' + W * 0.45 + ' ' + (gy - 14) + 'T' + W + ' ' + (gy - 22) + 'L' + W + ' ' + gy + 'Z', o.hills, { st: 0 });
      var gc = o.ground || '#7cc25a';
      s += rect(0, gy, W, H - gy, gc, { st: 0 });
      if (o.grass !== false && !o.snow) { var R3 = rng(41); for (var i = 0; i < W / 6; i++) { var gx = R3() * W, gyy = gy + 6 + R3() * (H - gy - 6); s += path('M' + n(gx) + ' ' + n(gyy) + 'l1.4 -4l1.4 4', 'none', { st: shade(gc, -0.18), sw: 0.8 }); } }
      if (o.snow) s += rect(0, gy, W, H - gy, '#f6f9fc', { st: 0 }) + line(0, gy, W, gy, '#c9d6e2', 1);
      if (o.walk) s += rect(0, o.walk[0], W, o.walk[1], o.walkColor || '#cfc8ba', { st: 0 }) + (function () { var t = ''; for (var x = 0; x < W; x += 40) t += line(x, o.walk[0], x - 6, o.walk[0] + o.walk[1], shade(o.walkColor || '#cfc8ba', -0.15), 0.8); return t; })();
      if (o.road) s += rect(0, o.road[0], W, o.road[1], '#5a5a66', { st: 0 }) + (function () { var t = ''; for (var x = 10; x < W; x += 50) t += rect(x, o.road[0] + o.road[1] / 2 - 1.5, 26, 3, '#f4efe4', { st: 0 }); return t; })();
    } else if (k === 'top') {
      s += rect(0, 0, W, H, o.color || '#86c66a', { st: 0 });
      if (o.texture !== false) { var R4 = rng(51); for (var j = 0; j < W * H / 400; j++) { var tx = R4() * W, ty = R4() * H; s += o.snow ? circ(tx, ty, 0.8, '#dfe8f0', { st: 0 }) : path('M' + n(tx) + ' ' + n(ty) + 'l1 -3l1 3', 'none', { st: shade(o.color || '#86c66a', -0.12), sw: 0.7 }); } }
    } else if (k === 'desk') {
      s += rect(0, 0, W, H, o.color || '#8a5a34', { st: 0 });
      for (var yw = 0; yw < H; yw += 7) s += line(0, yw + Math.sin(yw) * 2, W, yw + Math.cos(yw) * 2, shade(o.color || '#8a5a34', -0.1), 0.8, { op: 0.6 });
    } else {
      s += rect(0, 0, W, H, o.color || '#efe9dc', { st: 0 });
    }
    return s;
  }

  var KINDS = {
    person: person, dog: dog, cat: cat, door: door, window: windowItem, curtain: curtain, counter: counter, table: table, chair: chair, sofa: sofa, armchair: armchair,
    shelf: shelf, bookcase: bookcase, book: book, rug: rug, lamp: lamp, plant: plant, vase: vase, clock: clock, candle: candle, fireplace: fireplace, frame: frame, mirror: mirror,
    coatrack: coatrack, umbrellas: umbrellaStand, toybox: toybox, jar: jar, puddle: puddle, crumbs: crumbs, trail: trail, soles: bootSoles, print: function (p) { return g(printShape(p.kind || 'shoe', p.size || 10, p.tread, p.col || '#6b4a2a', p.notch, p.foot, p.op), { x: p.x, y: p.y, r: p.r, id: p.id }); },
    fence: fence, sign: signItem, tree: tree, bush: bush, flowerbed: flowerbed, gnome: gnome, stake: stake, snowman: snowman, house: house, car: car, van: van, lamppost: lamppost, bench: bench, barn: barn,
    castShadow: castShadow, post: post, sun: sun, cloud: cloud, cake: cake, plate: plate, cup: cup, glass: glass, pie: pie, teapot: teapot, note: note, calendar: calendar, trophy: trophy, globe: globe,
    bear: bear, ship: shipBottle, toycar: toycar, camera: cameraObj, books: booksStack, soap: soap, key: keyItem, toolbox: toolbox, label: label, caption: caption, paper: paper, tag: tag,
    tpath: tpath, tpaths: tpaths, tpond: tpond, ttree: ttree, tbench: tbench, tgate: tgate, troundtable: troundtable, twall: twall, tcase: tcase, laser: laser, rope: rope, tdoor: tdoor, tsign: tsign, tcar: tcar, tsnowman: tsnowman, tporch: tporch, trect: trect,
    photo: photo, held: function (p) { return g(held(p.kind, p), { x: p.x, y: p.y, s: p.s, id: p.id, r: p.r }); },
    svg: function (p) { return g(p.svg || '', { x: p.x, y: p.y, s: p.s, id: p.id, r: p.r }); },
    group: function (p) { return g(items(p.items || []), { x: p.x, y: p.y, s: p.s, id: p.id, r: p.r, fx: p.fx }); },
    rain: function (p) { return rainfall(p, C.W, C.H); }, snow: function (p) { return snowfall(p, C.W, C.H); }
  };
  function items(list) {
    return (list || []).map(function (it) {
      var f = KINDS[it[0]]; if (!f) { if (window.console) console.warn('[mysteries] unknown item', it[0]); return ''; }
      return f(it[1] || {});
    }).join('');
  }

  // ── Finding things in a drawn picture, and the solution's marks ──────────
  // ref: {p:'max.mouth'} a person's part · {id:'jar'} an item · {x, y, r} a spot · {box:[x,y,w,h]} · {pts:[[x,y],…]}
  // (+ pad). Returns {x, y, w, h} in picture units, or null.
  function box(svg, ref) {
    if (!svg || !ref) return null;
    var pad = ref.pad || 0, b = null;
    if (ref.box) b = { x: ref.box[0], y: ref.box[1], w: ref.box[2], h: ref.box[3] };
    else if (ref.pts) { var xs = ref.pts.map(function (q) { return q[0]; }), ys = ref.pts.map(function (q) { return q[1]; }); b = { x: Math.min.apply(null, xs), y: Math.min.apply(null, ys) }; b.w = Math.max.apply(null, xs) - b.x; b.h = Math.max.apply(null, ys) - b.y; }
    else if (ref.x != null) { var r = ref.r || 10; b = { x: ref.x - r, y: ref.y - r, w: r * 2, h: r * 2 }; }
    else {
      var sel = ref.p ? '[data-p="' + ref.p + '"]' : ref.id ? '[data-id="' + ref.id + '"]' : null;
      var els = sel ? svg.querySelectorAll(sel) : [], world = svg.querySelector('.ms-world');
      if (!els.length || !world) return null;
      var inv = world.getCTM().inverse(), x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      Array.prototype.forEach.call(els, function (e) {
        var bb; try { bb = e.getBBox(); } catch (er) { return; }
        if (!bb || (!bb.width && !bb.height)) return;
        var m = inv.multiply(e.getCTM()), pt = svg.createSVGPoint();
        [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height], [bb.x + bb.width, bb.y + bb.height]].forEach(function (c) {
          pt.x = c[0]; pt.y = c[1]; var q = pt.matrixTransform(m);
          x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
        });
      });
      if (x0 === Infinity) return null;
      b = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
  }
  // One solution mark as SVG (drawn over the picture). t: 'ring' (default) | 'path' (along pts, arrow at the end) | 'arrow' (from → the ref)
  function markSvg(svg, m, num) {
    var col = m.hint ? '#f2b200' : (m.col || '#d0192b'), s = '', cls = 'ms-mk' + (m.hint ? ' ms-hintmk' : '');
    if (m.t === 'path' && m.pts) {
      var d = 'M' + m.pts.map(function (q) { return n(q[0]) + ' ' + n(q[1]); }).join('L');
      s += '<path class="ms-draw" pathLength="1" d="' + d + '" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>';
      s += '<path class="ms-draw" pathLength="1" d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="' + (m.dash ? '1 0' : '1 0') + '"/>';
      var a = m.pts[m.pts.length - 2], b = m.pts[m.pts.length - 1], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      s += '<path class="ms-pop" d="M' + n(b[0] + Math.cos(ang) * 4) + ' ' + n(b[1] + Math.sin(ang) * 4) + 'L' + n(b[0] + Math.cos(ang + 2.5) * 8) + ' ' + n(b[1] + Math.sin(ang + 2.5) * 8) + 'L' + n(b[0] + Math.cos(ang - 2.5) * 8) + ' ' + n(b[1] + Math.sin(ang - 2.5) * 8) + 'Z" fill="' + col + '" stroke="#fff" stroke-width="1"/>';
      if (num) s += badge(m.pts[0][0], m.pts[0][1] - 10, num, col);
      return '<g class="' + cls + '">' + s + '</g>';
    }
    var bb = box(svg, m); if (!bb) return '';
    var cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2, rx = Math.max(bb.w / 2 + 5, 9), ry = Math.max(bb.h / 2 + 5, 9);
    if (m.t === 'arrow' && m.from) {
      var fx = m.from[0], fy = m.from[1], an = Math.atan2(cy - fy, cx - fx);
      var ex = cx - Math.cos(an) * (rx + 2), ey = cy - Math.sin(an) * (ry + 2);
      var dd = 'M' + n(fx) + ' ' + n(fy) + 'Q' + n((fx + ex) / 2 - Math.sin(an) * 14) + ' ' + n((fy + ey) / 2 + Math.cos(an) * 14) + ' ' + n(ex) + ' ' + n(ey);
      s += '<path class="ms-draw" pathLength="1" d="' + dd + '" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/><path class="ms-draw" pathLength="1" d="' + dd + '" fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linecap="round"/>';
      s += '<path class="ms-pop" d="M' + n(ex) + ' ' + n(ey) + 'L' + n(ex - Math.cos(an - 0.5) * 8) + ' ' + n(ey - Math.sin(an - 0.5) * 8) + 'L' + n(ex - Math.cos(an + 0.5) * 8) + ' ' + n(ey - Math.sin(an + 0.5) * 8) + 'Z" fill="' + col + '" stroke="#fff" stroke-width="1"/>';
      if (num) s += badge(fx, fy - 9, num, col);
      return '<g class="' + cls + '">' + s + '</g>';
    }
    // a pencil ring: an ellipse drawn with a slight overshoot, like circling something on a photo
    var rot = m.rot == null ? -8 : m.rot;
    var P = function (deg, k) { var t = deg * Math.PI / 180; return n(cx + Math.cos(t) * rx * k) + ' ' + n(cy + Math.sin(t) * ry * k); };
    var ring = 'M' + P(14, 1) + 'A' + n(rx) + ' ' + n(ry) + ' 0 0 0 ' + P(-166, 1) + 'A' + n(rx * 1.04) + ' ' + n(ry * 1.04) + ' 0 0 0 ' + P(14, 1.04) + 'A' + n(rx * 1.07) + ' ' + n(ry * 1.07) + ' 0 0 0 ' + P(-34, 1.07);
    s += '<path class="ms-draw" pathLength="1" d="' + ring + '" fill="none" stroke="#fff" stroke-width="' + (m.hint ? 4 : 5) + '" stroke-linecap="round" opacity=".75" transform="rotate(' + rot + ' ' + n(cx) + ' ' + n(cy) + ')"/>';
    s += '<path class="ms-draw" pathLength="1" d="' + ring + '" fill="none" stroke="' + col + '" stroke-width="' + (m.hint ? 2 : 2.6) + '" stroke-linecap="round"' + (m.hint ? ' stroke-dasharray="0.04 0.025"' : '') + ' transform="rotate(' + rot + ' ' + n(cx) + ' ' + n(cy) + ')"/>';
    if (num) s += badge(cx + rx * 0.72, cy - ry * 0.72 - 2, num, col);
    return '<g class="' + cls + '">' + s + '</g>';
  }
  function badge(x, y, num, col) {
    return '<g class="ms-pop ms-badge" transform="translate(' + n(x) + ' ' + n(y) + ')"><circle r="7" fill="' + col + '" stroke="#fff" stroke-width="1.6"/><text y="3.4" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="800" font-size="9.5" fill="#fff">' + num + '</text></g>';
  }

  function size(cs) { return cs.size || [400, 300]; }
  function render(cs, uid) {
    var sz = size(cs), W = sz[0], H = sz[1], prev = C;
    C = { uid: uid || ('ms' + (++uidN)), n: 0, defs: [], W: W, H: H };
    var sc = cs.scene || {};
    var body = background(sc.bg || ['plain', {}], W, H) + items(sc.items || []);
    C.defs.push('<filter id="' + C.uid + '-soft" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.2" flood-opacity=".25"/></filter>');
    var out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" class="ms-svg" data-w="' + W + '" data-h="' + H + '"><defs>' + C.defs.join('') + '</defs><g id="' + C.uid + '-world" class="ms-world">' + body + '</g></svg>';
    C = prev;
    return out;
  }
  window.MysteryScene = { render: render, size: size, shade: shade, box: box, markSvg: markSvg };
})();
