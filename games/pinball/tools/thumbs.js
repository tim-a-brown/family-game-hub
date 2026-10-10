// Regenerates the picker thumbnails (games/pinball/thumbs/<id>.webp) by rendering each table once with the real
// engine in headless Chromium. Run from the repo root with a local server on :8765:
//   curl -s -o /dev/null localhost:8765 || (setsid nohup python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &)
//   node games/pinball/tools/thumbs.js            (all six)      node games/pinball/tools/thumbs.js haunted neon
// Needs Playwright (the lead's container has it at /opt/node22/lib/node_modules/playwright) and the Playwright
// Chromium build; swiftshader WebGL is fine, it just takes ~10 s per table.
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ['haunted', 'nebula', 'pirate', 'jungle', 'neon', 'midway'];
const W = 560, H = 600, OUT = path.join(__dirname, '..', 'thumbs');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 800, height: 900 } })).newPage();
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(() => { localStorage.setItem('fgh_mode', 'guest'); localStorage.setItem('gn_sound', '0'); });
  await p.goto('http://localhost:8765/games/pinball.html?nothumbs=1');
  await p.waitForFunction(() => window.__pin && window.__pin.tables, null, { timeout: 60000 });
  await p.evaluate(() => (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('20px Bungee'), document.fonts.load('700 20px Cinzel')]).catch(() => 0) : 0);
  for (const id of IDS) {
    const data = await p.evaluate(async ([id, W, H]) => {
      const m = await import('./pinball/engine.js');
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const r = window.__pin.renderer();
      m.renderThumb(window.__pin.tables[id], r, c, { hq: true });
      return c.toDataURL('image/webp', 0.8);
    }, [id, W, H]);
    const isWebp = data.startsWith('data:image/webp');
    const file = path.join(OUT, id + (isWebp ? '.webp' : '.png'));
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    console.log(id, file, fs.statSync(file).size, 'bytes');
  }
  await b.close();
})();
