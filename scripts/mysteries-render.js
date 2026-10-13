#!/usr/bin/env node
// Picture Mysteries: render every case's picture to PNG for review.
//
//   node scripts/mysteries-render.js [outDir] [caseId ...]     (outDir defaults to <tmp>/mysteries-review)
//
// For each case it writes <id>.png (the picture as the player sees it) and
// <id>-solution.png (the same picture with the solution's marks, hint circles
// and the answer listed), plus index.html: a contact sheet with the case text,
// question, choices, hints and solution beside each picture.
// Needs Playwright with Chromium (npm i -g playwright; npx playwright install chromium).
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { console.error('Playwright is not installed: npm i -g playwright && npx playwright install chromium (and set NODE_PATH=$(npm root -g))'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'mysteries-review'));
const ONLY = process.argv.slice(3);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port + '/';
  const executablePath = process.env.CHROME || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2 });
  page.on('pageerror', e => console.error('page error:', e.message));
  page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log('console:', m.text()); });
  await page.goto(base + 'kit.css'); // same origin for the page below
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"><base href="' + base + '"><link rel="stylesheet" href="kit.css"><style>body{margin:0;background:#fff;}#s{width:800px;}#s svg{display:block;width:100%;height:auto;}</style>' +
    '<script src="data/mysteries-scene.js"></script><script src="data/mysteries-cases.js"></script></head><body><div id="s"></div></body></html>', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all(['10px "Patrick Hand"', '10px "Lilita One"'].map(f => document.fonts.load(f))));
  const cases = await page.evaluate(() => MYSTERY_CASES.map(c => ({ id: c.id, level: c.level, no: c.no, title: c.title, setup: c.setup, q: c.q, choices: c.choices, answer: c.answer, hints: c.hints.map(h => h.text), steps: c.solution.steps.map(s => s.text), verdict: c.solution.verdict, type: c.type })));
  const sheet = [];
  for (const c of cases) {
    if (ONLY.length && !ONLY.includes(c.id)) continue;
    const problems = await page.evaluate(id => {
      const cs = MYSTERY_CASES.find(x => x.id === id), host = document.getElementById('s');
      host.innerHTML = MysteryScene.render(cs, 'rv');
      const svg = host.querySelector('svg'), out = [];
      // every choice that names a scene item must exist; every mark must resolve
      cs.choices.forEach(ch => { if (cs.tap !== false && !svg.querySelector('[data-id="' + ch.id + '"]') && cs.tap) out.push('choice not in scene: ' + ch.id); });
      if (!cs.choices.some(ch => ch.id === cs.answer)) out.push('answer is not a choice');
      cs.solution.steps.forEach((st, i) => (st.marks || []).forEach(m => { if (!MysteryScene.box(svg, m)) out.push('step ' + (i + 1) + ' mark missing: ' + JSON.stringify(m)); }));
      cs.hints.forEach((h, i) => { if (h.at && !MysteryScene.box(svg, h.at)) out.push('hint ' + (i + 1) + ' spot missing'); });
      return out;
    }, c.id);
    if (problems.length) console.log(c.id + ':', problems.join('; '));
    const el = await page.$('#s svg');
    await el.screenshot({ path: path.join(OUT, c.id + '.png') });
    await page.evaluate(id => {
      const cs = MYSTERY_CASES.find(x => x.id === id), svg = document.querySelector('#s svg');
      let marks = '';
      cs.solution.steps.forEach((st, i) => (st.marks || []).forEach(m => { marks += MysteryScene.markSvg(svg, m, i + 1); }));
      cs.hints.forEach(h => { if (h.at) marks += MysteryScene.markSvg(svg, Object.assign({ hint: true }, h.at), 0); });
      svg.insertAdjacentHTML('beforeend', '<g>' + marks + '</g>');
    }, c.id);
    await el.screenshot({ path: path.join(OUT, c.id + '-solution.png') });
    sheet.push(c);
    console.log('rendered', c.id);
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]);
  fs.writeFileSync(path.join(OUT, 'index.html'), '<!doctype html><meta charset="utf-8"><title>Picture Mysteries review</title><style>body{font:15px/1.45 system-ui;margin:24px;background:#f4f1ea;color:#222}section{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 360px;gap:16px;margin:0 0 36px;padding:16px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1)}img{width:100%;border:1px solid #ddd}h2{margin:0 0 6px}small{color:#777}.ans{color:#1a7a3a;font-weight:700}</style>' +
    sheet.map(c => '<section><img src="' + c.id + '.png"><img src="' + c.id + '-solution.png"><div><small>' + esc(c.level) + ' · case ' + c.no + ' · ' + esc(c.id) + ' · ' + esc(c.type) + '</small><h2>' + esc(c.title) + '</h2><p>' + esc(c.setup) + '</p><p><b>' + esc(c.q) + '</b></p><p>' + c.choices.map(ch => ch.id === c.answer ? '<span class="ans">' + esc(ch.label) + '</span>' : esc(ch.label)).join(' · ') + '</p><p><small>Hints:</small><br>' + c.hints.map(esc).join('<br>') + '</p><p><small>Solution:</small><br>' + c.steps.map((s, i) => (i + 1) + '. ' + esc(s)).join('<br>') + '<br><b>' + esc(c.verdict) + '</b></p></div></section>').join(''));
  console.log('wrote', OUT);
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
