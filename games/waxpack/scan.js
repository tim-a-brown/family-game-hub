'use strict';
// Wax Pack's card reader: a photo of a card's front or back, read on the device (Tesseract.js, vendored in
// games/waxpack/ocr/, nothing sent anywhere), matched to the player database. It reads the name, and where the back's
// stat table can be read, the card's year (the copyright line, or the last season in the table plus one) and that
// season's line, which is checked against the database. The person always confirms the match; typing the name is the
// way that always works.
//
//   WaxScan.read(fileOrBlob, {onStep}) -> Promise<{text, lines:[{t, h}], rot, ms}>   (needs the page; lazy-loads OCR)
//   WaxScan.match(ocr, E) -> {cands: [{pl, score, role, year}], year, statYear, line}   (pure: Node runs it in tests)
(function (root) {
  var BASE = (function () { try { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') : 'waxpack/'; } catch (e) { return 'waxpack/'; } })();
  var worker = null, wready = null;

  function simd() {   // WebAssembly SIMD (Safari 16.4 and later): the faster core
    try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (e) { return false; }
  }
  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('load ' + src)); }; document.head.appendChild(s); });
  }
  function getWorker(onStep) {
    if (wready) return wready;
    var ocr = BASE + 'ocr/';
    wready = (window.Tesseract ? Promise.resolve() : loadScript(ocr + 'tesseract.min.js')).then(function () {
      return window.Tesseract.createWorker('eng', 1, {
        workerPath: ocr + 'worker.min.js', corePath: ocr + (simd() ? 'tesseract-core-simd-lstm.js' : 'tesseract-core-lstm.js'),
        langPath: ocr.replace(/\/$/, ''), workerBlobURL: false,
        logger: function (m) { if (onStep && m && m.status) onStep(m.status, m.progress); }
      });
    }).then(function (w) { worker = w; return w.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' }).then(function () { return w; }); });
    wready.catch(function () { wready = null; });
    return wready;
  }
  // The photo drawn small enough to read quickly, gray, its contrast stretched; turned by a quarter turns
  function prep(img, turn, o) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, k = Math.min(2.5, (o && o.px || 2200) / Math.max(w, h));
    var cw = Math.round(w * k), ch = Math.round(h * k), side = turn % 2;
    var c = document.createElement('canvas'); c.width = side ? ch : cw; c.height = side ? cw : ch;
    var g = c.getContext('2d', { willReadFrequently: true });
    g.translate(c.width / 2, c.height / 2); g.rotate(turn * Math.PI / 2); g.drawImage(img, -cw / 2, -ch / 2, cw, ch);
    var d = g.getImageData(0, 0, c.width, c.height), p = d.data, hist = new Uint32Array(256), n = p.length / 4;
    for (var i = 0; i < p.length; i += 4) { var v = (p[i] * 299 + p[i + 1] * 587 + p[i + 2] * 114) / 1000 | 0; p[i] = v; hist[v]++; }
    var lo = 0, hi = 255, acc = 0; while (acc < n * .02 && lo < 254) acc += hist[lo++]; acc = 0; while (acc < n * .02 && hi > lo + 1) acc += hist[hi--];
    for (i = 0; i < p.length; i += 4) { var u = Math.max(0, Math.min(255, (p[i] - lo) * 255 / (hi - lo))); p[i] = p[i + 1] = p[i + 2] = u; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.putImageData(d, 0, 0);
    return c;
  }
  function toImage(src) {
    return new Promise(function (res, rej) {
      if (src instanceof HTMLCanvasElement || src instanceof HTMLImageElement) return res(src);
      var url = typeof src === 'string' ? src : URL.createObjectURL(src), im = new Image();
      im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('image')); }; im.src = url;
    });
  }
  function linesOf(data) {
    var out = [];
    (data.blocks || []).forEach(function (b) { (b.paragraphs || []).forEach(function (p) { (p.lines || []).forEach(function (l) {
      var t = (l.text || '').trim(); if (t) out.push({ t: t, h: l.bbox ? l.bbox.y1 - l.bbox.y0 : 0, c: l.confidence || 0 });
    }); }); });
    if (!out.length && data.text) data.text.split('\n').forEach(function (t) { t = t.trim(); if (t) out.push({ t: t, h: 0, c: 0 }); });
    return out;
  }
  // Read a photo: upright first; a card held sideways (most backs of the late 1980s are printed sideways) is turned
  // a quarter each way and the reading that finds the surest player wins. E (the engine, loaded) scores each reading.
  function read(src, o) {
    o = o || {}; var t0 = Date.now(), step = o.onStep;
    return Promise.all([toImage(src), getWorker(step)]).then(function (a) {
      var img = a[0], w = a[1], best = null;
      function pass(turn) {
        return w.recognize(prep(img, turn), {}, { blocks: true, text: true }).then(function (r) {
          var ocr = { text: r.data.text || '', lines: linesOf(r.data), rot: turn, conf: r.data.confidence || 0 };
          ocr.m = o.E ? match(ocr, o.E) : null;
          var sc = ocr.m && ocr.m.cands[0] ? ocr.m.cands[0].score : 0;
          if (!best || sc > best.sc || !best.sc && ocr.text.length > best.ocr.text.length) best = { sc: sc, ocr: ocr };
          return sc;
        });
      }
      return pass(0).then(function (sc) {
        if (sc >= .86 && !o.all) return;
        if (step) step('turning the card', 0);
        return pass(3).then(function (s3) { if (s3 >= .86 && !o.all) return; return pass(1).then(function (s1) { if (Math.max(sc, s1, s3) < .6 || o.all) return pass(2); }); });
      }).then(function () { best.ocr.ms = Date.now() - t0; return best.ocr; });
    });
  }

  // ── Matching what was read to a player ──────────────────────────────────────
  var NICK = [['bob', 'bobby', 'robert', 'rob', 'robby', 'robbie'], ['bill', 'billy', 'william', 'will', 'willie'], ['jim', 'jimmy', 'james', 'jamie'],
    ['mike', 'michael', 'mickey'], ['tom', 'tommy', 'thomas'], ['dave', 'david', 'davey'], ['dan', 'danny', 'daniel'], ['joe', 'joseph', 'joey'],
    ['ken', 'kenny', 'kenneth'], ['chris', 'christopher'], ['rick', 'ricky', 'richard', 'rich', 'richie', 'dick'], ['ron', 'ronnie', 'ronald'],
    ['don', 'donnie', 'donald'], ['greg', 'gregory', 'gregg'], ['steve', 'steven', 'stephen'], ['jeff', 'jeffrey'], ['tony', 'anthony'],
    ['al', 'alan', 'albert', 'allen'], ['ed', 'eddie', 'edward', 'eddy'], ['fred', 'freddie', 'frederick'], ['pete', 'peter'], ['matt', 'matthew'],
    ['andy', 'andrew', 'andre'], ['alex', 'alexander'], ['ozzie', 'osvaldo', 'oswaldo'], ['charlie', 'charles', 'chuck'], ['larry', 'lawrence'],
    ['jerry', 'gerald', 'jerome'], ['terry', 'terrence'], ['nick', 'nicholas'], ['sam', 'samuel', 'sammy'], ['ben', 'benjamin', 'benny'],
    ['jack', 'john', 'johnny', 'jon'], ['pat', 'patrick'], ['walt', 'walter'], ['herb', 'herbert'], ['ray', 'raymond'], ['gene', 'eugene'],
    ['vince', 'vincent'], ['mitch', 'mitchell'], ['doug', 'douglas'], ['frank', 'francisco', 'frankie'], ['manny', 'manuel'], ['jose', 'joey'],
    ['phil', 'phillip', 'philip'], ['randy', 'randall'], ['tim', 'timothy'], ['jay', 'jason'], ['kevin', 'kev'], ['cal', 'calvin'], ['nate', 'nathan'],
    ['wally', 'wallace'], ['lou', 'louis'], ['les', 'lester'], ['gary', 'garry'], ['marty', 'martin'], ['zane', 'zane']];
  var NK = {}; NICK.forEach(function (g) { g.forEach(function (n) { NK[n] = (NK[n] || []).concat(g); }); });
  var STOP = ('the and of for in on at to by his he with was a an is as it from first second third base baseman pitcher catcher outfield outfielder ' +
    'infield infielder shortstop designated hitter bats throws born home height weight ht wt major league leagues minor record batting pitching ' +
    'team year club games avg ab hr rbi sb bb so era ip er won lost totals total complete card topps fleer donruss score upper deck bowman leaf ' +
    'company inc printed usa all star stars rookie rated draft drafted signed acquired trade traded led hit hits run runs season career ' +
    'right left resides ml lg yr pos ' + 'january february march april may june july august september october november december').split(' ');
  var STOPS = {}; STOP.forEach(function (w) { STOPS[w] = 1; });
  var IDX = null;
  function index(E) {
    if (IDX && IDX.db === E.db()) return IDX;
    var by = {}, lens = {};
    E.db().list.forEach(function (pl) {
      var k = pl.lk.replace(/ /g, ''); if (k.length < 2) return;
      (by[k] = by[k] || []).push(pl);
      var parts = pl.lk.split(' '); if (parts.length > 1) { var tail = parts[parts.length - 1]; if (tail.length >= 4) (by[tail] = by[tail] || []).push(pl); }
    });
    Object.keys(by).forEach(function (k) { (lens[k.length] = lens[k.length] || []).push(k); });
    var teams = {}; Object.keys(E.db().teams).forEach(function (c) { var nk = E.skey(E.nick(c)); if (nk) (teams[nk] = teams[nk] || []).push(c); });
    return (IDX = { db: E.db(), by: by, lens: lens, teams: teams });
  }
  function lev(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i]; var lo = i;
      for (j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1)); if (cur[j] < lo) lo = cur[j]; }
      if (lo > max) return max + 1; prev = cur;
    }
    return prev[b.length];
  }
  // OCR's usual mistakes on card type: 0/o, 1/l/i, 5/s, 8/b, rn/m, vv/w
  function clean(w) {
    return String(w).toLowerCase().replace(/[0]/g, 'o').replace(/[1|!]/g, 'l').replace(/5/g, 's').replace(/8/g, 'b').replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/[^a-z'\-]/g, '').replace(/^['\-]+|['\-]+$/g, '');
  }
  function firstSim(read, first) {
    if (!read) return 0;
    var f = first.toLowerCase().replace(/[^a-z ]/g, '').split(' ')[0]; if (!f) return 0;
    if (read === f) return 1;
    if ((NK[read] || []).indexOf(f) >= 0) return .95;
    if (read.length >= 3 && (f.indexOf(read) === 0 || read.indexOf(f) === 0)) return .85;
    if (read.length === 1 && f.charAt(0) === read) return .6;
    var d = lev(read, f, 2); return d <= 2 ? Math.max(0, 1 - d / Math.max(3, f.length)) * .9 : 0;
  }
  function match(ocr, E) {
    var I = index(E), text = ocr.text || ocr.lines.map(function (l) { return l.t; }).join('\n');
    var lines = (ocr.lines && ocr.lines.length ? ocr.lines : text.split('\n').map(function (t) { return { t: t, h: 0 }; }));
    var maxH = Math.max.apply(null, lines.map(function (l) { return l.h || 0; }).concat([1]));
    // the card's year: a copyright line, else the stat table's last season plus one
    var year = 0, statYear = 0, m;
    var cr = /(?:©|\(c\)|copyright|\bc)\s*'?\s*(19[4-9]\d|20[0-2]\d)/i.exec(text) || /(19[4-9]\d|20[0-2]\d)\s+(?:the\s+)?(?:topps|fleer|donruss|score|upper|leaf|bowman|o-pee)/i.exec(text);
    if (cr) year = +cr[1];
    var rows = [];
    lines.forEach(function (l) {
      var r = /^\s*['‘’]?((?:19|20)?\d{2})\b[\s.,:;]+([A-Za-z.'\- ]{2,24}?)\s+([\d .,/\-]{6,})$/.exec(l.t);
      if (!r) return;
      var y = +r[1]; if (y < 100) y += y > 30 ? 1900 : 2000;
      if (y < 1940 || y > 2026) return;
      rows.push({ y: y, team: r[2].trim(), nums: r[3].trim().split(/[\s,]+/).filter(Boolean) });
    });
    if (rows.length) statYear = Math.max.apply(null, rows.map(function (r) { return r.y; }));
    if (statYear && (!year || year <= statYear || year > statYear + 2)) year = statYear + 1;   // (a misread copyright line: 1983 read as 1963)
    var yearsSeen = []; (text.match(/\b(19[5-9]\d|20[0-2]\d)\b/g) || []).forEach(function (y) { yearsSeen.push(+y); });
    // teams named anywhere on the card
    var words = [], teamSeen = {};
    lines.forEach(function (l, li) {
      var ws = l.t.split(/[\s,.:;]+/).map(clean).filter(Boolean);
      ws.forEach(function (w, wi) { words.push({ w: w, li: li, wi: wi, h: l.h, line: ws }); });
      ws.forEach(function (w, wi) { [w, wi < ws.length - 1 ? w + ' ' + ws[wi + 1] : ''].forEach(function (x) { if (x && I.teams[x]) I.teams[x].forEach(function (c) { teamSeen[c] = 1; }); }); });
    });
    var cand = {};
    function consider(key, wd, extra) {
      if (key.length < 3 || STOPS[key]) return;
      var max = key.length >= 8 ? 2 : key.length >= 5 ? 1 : 0, ks = [];
      if (I.by[key]) ks.push([key, 0]);
      if (max) for (var L = key.length - max; L <= key.length + max; L++) (I.lens[L] || []).forEach(function (k) {
        if (k === key || k.charAt(0) !== key.charAt(0) && k.charAt(1) !== key.charAt(1)) return;
        var d = lev(key, k, max); if (d <= max) ks.push([k, d]);
      });
      ks.forEach(function (kd) {
        var lastS = 1 - kd[1] / Math.max(4, kd[0].length);
        I.by[kd[0]].forEach(function (pl) {
          // the first name: the word before it on its line, or after it ("GRICH, BOB"), or the line above (a name in two lines)
          var near = [wd.line[wd.wi - 1], wd.line[wd.wi + 1], extra];
          var prevLine = words.filter(function (x) { return x.li === wd.li - 1; }); if (prevLine.length) near.push(prevLine[prevLine.length - 1].w);
          var fs = 0; near.forEach(function (x) { if (x) fs = Math.max(fs, firstSim(x, pl.f)); });
          var sz = maxH > 1 && wd.h ? wd.h / maxH : .5;
          var sc = .5 * lastS + .26 * fs + .06 * sz;
          // when he played: the card's year if one was read, else the years printed on it, else the shoebox years
          if (year) sc += pl.y0 <= year && pl.y1 >= year - 1 ? .12 : pl.y0 <= year + 1 && pl.y1 >= year - 3 ? .05 : -.1;
          else if (yearsSeen.length) sc += yearsSeen.some(function (y) { return y >= pl.y0 && y <= pl.y1 + 1; }) ? .08 : -.04;
          else sc += pl.y1 >= 1978 && pl.y0 <= 1998 ? .05 : 0;
          if (Object.keys(teamSeen).length) {
            var hit = false; [E.seasons(pl, 'h'), E.seasons(pl, 'p')].forEach(function (L) { L.forEach(function (s) { if (teamSeen[s.t] && (!year || Math.abs(s.y - year) <= 2)) hit = true; }); });
            sc += hit ? .06 : -.01;
          }
          sc += Math.min(.03, (pl.hs.length + pl.ps.length) / 40000);   // a long career is more likely on a card
          var c = cand[pl.i];
          if (!c || sc > c.score) cand[pl.i] = { pl: pl, score: sc, last: lastS, first: fs };
        });
      });
    }
    words.forEach(function (wd, k) {
      consider(wd.w.replace(/['\-]/g, ''), wd);
      var nx = words[k + 1]; if (nx && nx.li === wd.li) consider((wd.w + nx.w).replace(/['\-]/g, ''), wd, wd.line[wd.wi - 1]);   // Van Slyke, de la Rosa
    });
    var list = Object.keys(cand).map(function (k) { return cand[k]; }).sort(function (a, b) { return b.score - a.score; });
    // the stat line for the season before the card, checked against the database
    var line = null;
    if (list.length && statYear) {
      var top = list[0].pl, row = rows.filter(function (r) { return r.y === statYear; }).pop();
      var role = E.roleOf(top, statYear), s = E.seasons(top, role).filter(function (x) { return x.y === statYear; })[0];
      if (row && s) {
        var want = role === 'p' ? [s.w, s.l, s.g, s.so, s.bb, s.h, s.er] : [s.g, s.ab, s.h, s.hr, s.rbi, s.sb, s.bb, s.so, s.d, s.tr];
        var got = row.nums.map(function (x) { return x.replace(/[^\d]/g, ''); }).filter(Boolean).map(Number), agree = 0;
        want.forEach(function (v) { if (got.indexOf(v) >= 0) agree++; });
        line = { y: statYear, read: row.nums.join(' '), agree: agree, of: want.length };
        if (agree >= 3) list[0].score += .1;
      }
    }
    list.forEach(function (c) { c.role = E.roleOf(c.pl, year || 0); c.year = year || 0; });
    return { cands: list.slice(0, 6), year: year, statYear: statYear, line: line, teams: Object.keys(teamSeen) };
  }

  var S = { read: read, match: match, prep: prep, simd: simd, warm: function () { return getWorker(); }, ready: function () { return !!worker; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = S; else root.WaxScan = S;
})(this);
