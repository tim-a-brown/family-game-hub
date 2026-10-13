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
const E = vm.runInNewContext(eng + '; ({ ABC, MORSE, PHONE, codeAlpha, tokens, codeText, letters, railRows, colGroups, derange, keyAlpha, phoneKey })', {});
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
  const h4 = by('h4'); if (item(h4, 'spines')[0].titles.map(t => t[0]).join('').toUpperCase() !== h4.cipher.kw) fail('h4', 'book titles');
})();

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
