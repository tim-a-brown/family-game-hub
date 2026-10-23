// Goblin Defenders sprite build: renders models.js / icons.js in headless Chromium (three.js, WebGL) and packs the
// frames into WebP sheets plus an index (games/goblin/sprites.json). Run from the repo root:
//   node scripts/goblin-sprites/build.mjs                 full build into games/goblin/
//   node scripts/goblin-sprites/build.mjs preview <out.png> [prefix ...]   one contact sheet to look at
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
import fs from 'fs'; import path from 'path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const [, , mode, outArg, ...only] = process.argv;
const PORT = 8765 + Math.floor(Math.random() * 200);
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const p = await b.newPage();
  p.on('console', m => console.log('page:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://127.0.0.1:${PORT}/scripts/goblin-sprites/render.html`);
  await p.waitForFunction(() => window.ready, null, { timeout: 60000 });
  const t0 = Date.now();
  const res = await p.evaluate(async ({ mode, only }) => {
    const frames = await window.renderJobs(only && only.length ? only : null);
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    for (const f of frames) f.img = await load(f.png);
    if (mode === 'towerview') {   // each tower level assembled (base + head turned toward the bottom-right), at 1.5x
      const K = Math.cos(40 * Math.PI / 180), by = {}; frames.forEach(f => by[f.key] = f);
      const bases = frames.filter(f => f.sheet === 'towers'), Z = 1.5, cw = 176 * Z, ch = 216 * Z, cols = 6;
      const c = document.createElement('canvas'); c.width = cw * cols; c.height = ch * Math.ceil(bases.length / cols); const g = c.getContext('2d');
      g.fillStyle = '#7cb552'; g.fillRect(0, 0, c.width, c.height);
      bases.forEach((f, i) => { const x = (i % cols) * cw, y = Math.floor(i / cols) * ch; g.save(); g.translate(x, y); g.scale(Z, Z);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(f.ax, f.ay, 56, 34, 0, 0, 7); g.fill();
        g.drawImage(f.img, 0, 0); const h = by[f.key + '_' + (window.HA || 3)]; if (h) g.drawImage(h.img, f.ax - h.ax, f.ay - f.pivot * K * 128 - h.ay); g.restore(); });
      return { preview: c.toDataURL('image/png') };
    }
    if (mode === 'preview') {   // one sheet on a grass colour, frames in rows by sheet
      const W = 1800; let x = 0, y = 0, rh = 0; const pos = [];
      frames.forEach(f => { if (x + f.w > W) { x = 0; y += rh + 4; rh = 0; } pos.push([x, y]); x += f.w + 4; rh = Math.max(rh, f.h); });
      const c = document.createElement('canvas'); c.width = W; c.height = y + rh; const g = c.getContext('2d');
      g.fillStyle = '#6fae4a'; g.fillRect(0, 0, c.width, c.height);
      frames.forEach((f, i) => { g.strokeStyle = 'rgba(0,0,0,.15)'; g.strokeRect(pos[i][0] + .5, pos[i][1] + .5, f.w - 1, f.h - 1); g.drawImage(f.img, pos[i][0], pos[i][1]); });
      return { preview: c.toDataURL('image/png') };
    }
    // pack each sheet: frames of one size in a grid (towers, heads, enemies...), or shelves for mixed sizes (props)
    const sheets = {}, index = { v: 1, sheets: {}, frames: {} };
    frames.forEach(f => (sheets[f.sheet] = sheets[f.sheet] || []).push(f));
    const files = {};
    for (const name of Object.keys(sheets)) {
      const list = sheets[name], MAXW = 2048; let x = 0, y = 0, rh = 0;
      list.forEach(f => { if (x + f.w > MAXW) { x = 0; y += rh; rh = 0; } f.x = x; f.y = y; x += f.w; rh = Math.max(rh, f.h); });
      const c = document.createElement('canvas'); c.width = Math.min(MAXW, Math.max(...list.map(f => f.x + f.w))); c.height = y + rh;
      const g = c.getContext('2d'); list.forEach(f => g.drawImage(f.img, f.x, f.y));
      files[name] = c.toDataURL('image/webp', .9);
      index.sheets[name] = { file: name + '.webp', w: c.width, h: c.height };
      list.forEach(f => { const e = { s: name, x: f.x, y: f.y, w: f.w, h: f.h, ax: f.ax, ay: f.ay, u: f.u }; if (f.pivot != null) e.pv = +f.pivot.toFixed(3); if (f.fly) e.fly = 1; index.frames[f.key] = e; });
    }
    return { files, index };
  }, { mode, only });
  console.log('rendered in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  if (mode === 'preview' || mode === 'towerview') fs.writeFileSync(outArg, Buffer.from(res.preview.split(',')[1], 'base64'));
  else {
    const dir = path.join(ROOT, 'games/goblin'); fs.mkdirSync(dir, { recursive: true });
    for (const [n, d] of Object.entries(res.files)) { const buf = Buffer.from(d.split(',')[1], 'base64'); fs.writeFileSync(path.join(dir, n + '.webp'), buf); console.log(n, (buf.length / 1024).toFixed(0) + ' KB', res.index.sheets[n].w + 'x' + res.index.sheets[n].h); }
    fs.writeFileSync(path.join(dir, 'sprites.json'), JSON.stringify(res.index));
  }
} finally { await b.close(); srv.kill(); }
