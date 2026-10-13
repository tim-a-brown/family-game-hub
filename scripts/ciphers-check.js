#!/usr/bin/env node
// Checks the Cipher Cases data (data/ciphers-cases.js) against the game's own cipher code (games/ciphers.html,
// between the // ==ENGINE== markers): every guess-note lock has exactly one answer, every answer fits its lock,
// the pictures that hold codes agree with the answers, and every phrase can be used for endless codes.
// Run: node scripts/ciphers-check.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const win = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/ciphers-cases.js'), 'utf8'), { window: win });
const html = fs.readFileSync(path.join(root, 'games/ciphers.html'), 'utf8');
const eng = html.slice(html.indexOf('// ==ENGINE=='), html.indexOf('// ==/ENGINE=='));
const E = vm.runInNewContext(eng + '; ({ ABC, MORSE, PHONE, SEM, codeAlpha, tokens, codeText, letters, railRows, colGroups, keyColGroups, derange, keyAlpha, phoneKey, polySquare })', {});
const D = win.CIPHER_DATA;
let bad = 0;
function fail(id, msg) { bad++; console.log('FAIL', id, msg); }

// Mastermind scoring (repeats allowed), and every code it could be
function fb(g, a) { let x = 0, m = 0; const cg = {}, ca = {}; for (let i = 0; i < g.length; i++) { if (g[i] === a[i]) x++; cg[g[i]] = (cg[g[i]] || 0) + 1; ca[a[i]] = (ca[a[i]] || 0) + 1; } for (const d in cg) m += Math.min(cg[d], ca[d] || 0); return [x, m - x]; }
function codes(n) { const out = []; for (let i = 0; i < Math.pow(10, n); i++) out.push(String(i).padStart(n, '0')); return out; }

const ids = {}, perLv = {};
D.cases.forEach(c => {
  if (ids[c.id]) fail(c.id, 'duplicate id'); ids[c.id] = 1;
  perLv[c.lv] = (perLv[c.lv] || 0) + 1;
  ['title', 'setup', 'explain'].forEach(k => { if (!c[k]) fail(c.id, 'missing ' + k); });
  if (!Array.isArray(c.hints) || c.hints.length !== 2) fail(c.id, 'needs two hints');
  const t = c.dev.t;
  if (t === 'msg') {
    if (!c.plain || !c.cipher) return fail(c.id, 'message needs plain and cipher');
    const T = E.tokens(c.cipher, c.plain);
    // linked codes must be one-to-one: one code, one letter
    const k2p = {}, p2k = {};
    T.forEach(x => { if (!x.k) return; if (k2p[x.k] && k2p[x.k] !== x.p) fail(c.id, 'code ' + x.k + ' means two letters'); if (p2k[x.p] && p2k[x.p] !== x.k) fail(c.id, 'letter ' + x.p + ' has two codes'); k2p[x.k] = x.p; p2k[x.p] = x.k; });
    if (c.cipher.t === 'crypto') { const a = E.codeAlpha(c.cipher); if (a.split('').some((ch, i) => ch === E.ABC[i])) fail(c.id, 'cryptogram keeps a letter'); }
    const shown = (c.scene.items || []).filter(i => i.type).map(i => i.type.join(' ')).join(' ');
    if (c.cipher.t === 'keycols' && shown.replace(/\s+/g, ' ').indexOf(E.keyColGroups(E.letters(c.plain), c.cipher.kw).join(' ')) < 0) fail(c.id, 'keyed column note in the picture does not match');
    if (c.cipher.t === 'wordrev' && E.letters(shown) !== E.letters(E.codeText(c.cipher, c.plain))) fail(c.id, 'backwards words in the picture do not match');
    if (c.cipher.t === 'book') { const words = c.cipher.picks.map(([l, w]) => c.cipher.page[l - 1].replace(/[^A-Za-z ]/g, '').split(/\s+/)[w - 1].toUpperCase()); if (words.join(' ') !== c.plain) fail(c.id, 'book code reads ' + words.join(' ')); }
    if (c.cipher.t === 'polybius' && /J/.test(c.plain)) fail(c.id, 'Polybius message has a J');
    if (c.cipher.t === 'vigenere' || c.cipher.t === 'keyword') { if (!/^[A-Z]+$/.test(c.cipher.kw)) fail(c.id, 'bad key word'); }
    if (c.cipher.t === 'rail' && shown.indexOf(E.railRows(E.letters(c.plain), c.cipher.k).join(' ')) < 0) fail(c.id, 'rail note in the picture does not match');
    if (c.cipher.t === 'columns' && shown.indexOf(E.colGroups(E.letters(c.plain), c.cipher.k).join(' ')) < 0) fail(c.id, 'column note in the picture does not match');
    console.log('ok ', c.id, c.title.padEnd(24), E.codeText(c.cipher, c.plain));
    return;
  }
  const n = c.dev.n;
  if (t === 'dial') {
    const parts = c.ans.split('-').map(Number);
    if (parts.length !== n || parts.some(v => !(v >= 0 && v < c.dev.max))) fail(c.id, 'dial answer does not fit');
  } else if (t === 'cryptex') { if (!/^[A-Z]+$/.test(c.ans) || c.ans.length !== n) fail(c.id, 'cryptex answer does not fit'); }
  else if (!/^\d+$/.test(c.ans) || c.ans.length !== n) fail(c.id, 'number answer does not fit');
  if (c.mm) {
    const all = codes(n).filter(a => c.mm.every(g => { const f = fb(g.g, a); return f[0] === g.a && f[1] === g.b; }));
    if (all.length !== 1 || all[0] !== c.ans) fail(c.id, 'guess notes allow ' + JSON.stringify(all.slice(0, 5)));
  }
  console.log('ok ', c.id, c.title.padEnd(24), c.ans);
});

// Answers that come from the pictures
const by = id => D.cases.find(c => c.id === id), item = (c, t) => c.scene.items.filter(i => i.t === t);
(function () {
  const e1 = by('e1'); if ('' + item(e1, 'pot')[0].flowers + item(e1, 'jars')[0].n + item(e1, 'window')[0].birds !== e1.ans) fail('e1', 'picture counts');
  const e2 = by('e2'), cl = item(e2, 'clock'), big = cl.slice().sort((a, b) => b.r - a.r)[0];
  if ('' + cl.length + big.h + item(e2, 'books')[0].list.length !== e2.ans) fail('e2', 'picture counts');
  const e4 = by('e4'); if (item(e4, 'card')[0].type[0].trim().split(/\s+/).map(x => E.ABC[x - 1]).join('') !== e4.ans) fail('e4', 'number card');
  const e6 = by('e6'); if (item(e6, 'bowl')[0].name.split('').map(ch => E.phoneKey(ch).d).join('') !== e6.ans) fail('e6', 'dog name');
  const e7 = by('e7'); if (item(e7, 'tape')[0].morse !== e7.ans) fail('e7', 'morse tape');
  const e8 = by('e8'); if ([item(e8, 'cake')[0].candles, item(e8, 'page')[0].num, parseInt(item(e8, 'postcard')[0].addr, 10)].join('-') !== e8.ans) fail('e8', 'table');
  const m7 = by('m7'), dice = item(m7, 'dice')[0].v, wins = item(m7, 'window');
  if ([dice[0] + dice[1], item(m7, 'clock')[0].m, wins.reduce((s, w) => s + w.panes[0] * w.panes[1], 0)].join('-') !== m7.ans) fail('m7', 'study');
  const m8 = by('m8'); if (String(item(m8, 'chest')[0].word.split('').reduce((s, ch) => s + E.ABC.indexOf(ch) + 1, 0)) !== m8.ans) fail('m8', 'word sum');
  const m9 = by('m9'); if (item(m9, 'posts')[0].word !== m9.ans) fail('m9', 'posts');
  const m10 = by('m10'); if (item(m10, 'bulbs')[0].rows.map(r => parseInt(r, 2)).join('') !== m10.ans) fail('m10', 'bulbs');
  const h8 = by('h8'), sols = [];
  for (let a = 0; a < 40; a++) for (let b = 0; b < 40; b++) for (let c = 0; c < 40; c++) if (b === 3 * a && c === b + 10 && a + b + c === 66) sols.push([a, b, c].join('-'));
  if (sols.length !== 1 || sols[0] !== h8.ans) fail('h8', 'logic ' + sols);
  const h10 = by('h10'); if (item(h10, 'tape')[0].morse.split('').reverse().join('') !== h10.ans) fail('h10', 'radio');
  const sum = (a) => a.reduce((x, y) => x + y, 0), first = (c, t) => item(c, t)[0];
  const eq = (id, got) => { if (String(got) !== by(id).ans) fail(id, 'picture gives ' + got + ', answer is ' + by(id).ans); };
  eq('e11', item(by('e11'), 'crate').map(c => c.n).join(''));
  eq('e12', ['CARRIAGE', 'SEAT', 'PLATFORM'].map(k => first(by('e12'), 'ticket').rows.find(r => r[0] === k)[1]).join(''));
  eq('e13', first(by('e13'), 'tag').hand[0].split('-').map(x => E.ABC[+x - 1]).join(''));
  eq('e14', first(by('e14'), 'scoreboard').rows.map(r => r[1][0]).join(''));
  eq('e16', [first(by('e16'), 'thermo').temp, first(by('e16'), 'hut').num, first(by('e16'), 'skis').n * 2].join('-'));
  eq('e18', first(by('e18'), 'board').dots.join(''));
  eq('e19', first(by('e19'), 'basket').name.split('').map(ch => E.phoneKey(ch).d).join(''));
  eq('e21', item(by('e21'), 'clock').map(c => c.h).join(''));
  eq('e22', first(by('e22'), 'card').hand.map(l => l[0]).join(''));
  const bl = first(by('e23'), 'balloons').list, colorOf = { red: '#d83b3b', blue: '#3b7dd8', green: '#4caf50', yellow: '#f2c12e' };
  eq('e23', ['red', 'blue', 'green', 'yellow'].map(k => bl.find(b => b[0] === colorOf[k])[1]).join(''));
  eq('e24', [first(by('e24'), 'fishbasket').n, item(by('e24'), 'boat').length, first(by('e24'), 'ducks').n].join(''));
  eq('e26', item(by('e26'), 'cup').map(c => sum(c.dice)).join('-'));
  eq('e27', first(by('e27'), 'stones').path.map(p => p[2]).join(''));
  eq('e28', first(by('e28'), 'semaphore').word);
  eq('e29', String(first(by('e29'), 'timer').min) + first(by('e29'), 'eggs').n);
  const sky = first(by('m11'), 'sky'); eq('m11', [sky.stars, sky.planets * 10, sky.comets].join('-'));
  const tt = first(by('m12'), 'timetable').rows.find(r => r[1] === 'Oakham')[0].split(':').map(Number), mins = tt[0] * 60 + tt[1] + 25;
  eq('m12', String(Math.floor(mins / 60)).padStart(2, '0') + String(mins % 60).padStart(2, '0'));
  const pl = first(by('m18'), 'plants').list, tall = pl.reduce((a, b) => b[0] > a[0] ? b : a), fl = pl.find(p => p[2]), rest = pl.filter(p => p !== tall && p !== fl);
  eq('m18', [tall[1], fl[1], rest[0][1] + rest[1][1]].join('-'));
  eq('m19', first(by('m19'), 'apron').name.split('').map(ch => E.phoneKey(ch).d).join(''));
  const fw = first(by('m21'), 'ferris'); eq('m21', fw.letters.filter((x, i) => (i - fw.red) % 2 === 0).join(''));
  eq('m22', first(by('m22'), 'beads').rows.map(r => parseInt(r, 2)).join(''));
  eq('m23', sum(first(by('m23'), 'receipt').lines.map(l => parseInt(l[0], 10) * parseInt(l[1].replace(/\D/g, ''), 10))));
  const KP = { 1: [0, 0], 2: [0, 1], 3: [0, 2], 4: [1, 0], 5: [1, 1], 6: [1, 2], 7: [2, 0], 8: [2, 1], 9: [2, 2] }, at = KP[5].slice(), out = [];
  ['N', 'E', 'S', 'S'].forEach(d => { if (d === 'N') at[0]--; if (d === 'S') at[0]++; if (d === 'E') at[1]++; if (d === 'W') at[1]--; out.push(at[0] * 3 + at[1] + 1); });
  eq('m24', out.join(''));
  const cal = first(by('m29'), 'calendar'), wd = d => (d + 2) % 7;   // day 1 sits under Wednesday (S M T W ...)
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  eq('m29', [days.find(d => wd(d) === 1), days.filter(d => wd(d) === 5).pop(), cal.circle].join('-'));
  if (wd(cal.circle) !== 0) fail('m29', 'circled day is not a Sunday');
  eq('m30', first(by('m30'), 'tallies').groups.slice().reverse().join(''));
  const ts = first(by('h11'), 'telescopes').list.slice().sort((a, b) => a[0] - b[0]).map(t => t[1]).join(''); if (ts !== by('h11').cipher.kw) fail('h11', 'telescopes spell ' + ts);
  if (first(by('h12'), 'piano').press !== by('h12').cipher.kw) fail('h12', 'piano keys');
  if (first(by('h17'), 'engine').name !== by('h17').cipher.kw) fail('h17', 'engine name');
  if (!first(by('h23'), 'map').island.startsWith(by('h23').cipher.kw)) fail('h23', 'island name');
  if (first(by('h19'), 'sign').text !== by('h19').cipher.kw) fail('h19', 'zoo sign');
  if (first(by('m26'), 'lifebuoy').text !== by('m26').cipher.kw) fail('m26', 'lifebuoy');
  const hb = by('h18').book; eq('h18', hb.picks.map(([l, w, k]) => hb.page[l - 1].replace(/[^A-Za-z ]/g, '').split(/\s+/)[w - 1][k - 1].toUpperCase()).join(''));
  const fns = first(by('h20'), 'scoreboard').rows[0][0]; eq('h20', fns.split('').map(ch => E.phoneKey(E.ABC[(E.ABC.indexOf(ch) + 25) % 26]).d).join(''));
  const ck = item(by('h25'), 'clock'), gap = (ck[1].h * 60 + ck[1].m) - (ck[0].h * 60 + ck[0].m); eq('h25', [gap, ck[2].h * 3, gap + ck[2].h * 3].join('-'));
  const roman = r => { const v = { I: 1, V: 5, X: 10, L: 50 }; let n = 0; for (let i = 0; i < r.length; i++) n += v[r[i]] < (v[r[i + 1]] || 0) ? -v[r[i]] : v[r[i]]; return n; };
  eq('h30', first(by('h30'), 'board').chalk.map(l => { const m = l.split(' '), a = roman(m[0]), b = roman(m[2]); return m[1] === '−' ? a - b : m[1] === '÷' ? a / b : a * b; }).join(''));
  const brute = (n, ok) => { const s = []; for (let a = 0; a < 40; a++) for (let b = 0; b < 40; b++) for (let c = 0; c < 40; c++) if (ok(a, b, c)) s.push([a, b, c].join('-')); return s; };
  const h16 = brute(3, (a, b, c) => [a, b, c].every(x => x >= 10 && x < 40 && Math.floor(x / 10) + x % 10 === 10) && a < b && b < c);
  if (h16.length !== 1 || h16[0] !== by('h16').ans) fail('h16', 'logic ' + h16);
  const h28 = brute(3, (a, b, c) => b === 2 * a && c === b + 3 && a + b + c === 33);
  if (h28.length !== 1 || h28[0] !== by('h28').ans) fail('h28', 'logic ' + h28);
  const h22 = []; for (let i = 0; i < 10000; i++) { const d = String(i).padStart(4, '0').split('').map(Number); if (d[0] === 2 * d[3] && d[1] === d[0] + d[3] && d[2] === d[1] - 1 && d[0] + d[1] + d[2] + d[3] === 17) h22.push(d.join('')); }
  if (h22.length !== 1 || h22[0] !== by('h22').ans) fail('h22', 'logic ' + h22);
  const pc = first(by('e15'), 'postcard').line; if (pc !== E.codeText(by('e15').cipher, by('e15').plain)) fail('e15', 'postcard numbers');
  const h4 = by('h4'); if (item(h4, 'spines')[0].titles.map(t => t[0]).join('').toUpperCase() !== h4.cipher.kw) fail('h4', 'book titles');
})();

// Every answer and every picture is different; semaphore letters are all different
const seenA = {}, seenS = {};
D.cases.forEach(c => { const a = c.ans || c.plain, sc = JSON.stringify(c.scene) + JSON.stringify(c.mm || ''); if (seenA[a]) fail(c.id, 'same answer as ' + seenA[a]); seenA[a] = c.id; if (seenS[sc]) fail(c.id, 'same picture as ' + seenS[sc]); seenS[sc] = c.id; });
const semSeen = {}; Object.keys(E.SEM).forEach(k => { const key = E.SEM[k].split(' ').sort().join(' '); if (semSeen[key]) fail('semaphore', k + ' and ' + semSeen[key] + ' look the same'); semSeen[key] = k; });

// Endless phrases: letters only (plus a little punctuation), and enough of them for each level
const lens = { easy: 0, medium: 0, hard: 0 };
D.phrases.forEach(p => {
  if (!/^[A-Z ,'.!?-]+$/.test(p.t)) fail('phrase', p.t);
  const n = E.letters(p.t).length;
  if (n >= 8 && n <= 24) lens.easy++; if (n >= 16 && n <= 36) lens.medium++; if (n >= 26 && n <= 80) lens.hard++;
});
console.log('\ncases per level', perLv, '· phrases', D.phrases.length, 'per level', lens);
if (bad) { console.log(bad + ' problem(s)'); process.exit(1); }
console.log('all good');
