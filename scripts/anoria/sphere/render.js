// Renders the sphere (scene.html) to a transparent PNG.   node render.js <out.png> [px] ['{"yaw":38,...}'] [stub]
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const fs = require('fs');
(async () => { const out = process.argv[2], px = +(process.argv[3] || 1600), p = process.argv[4] || '{}', stub = process.argv[5] || '.3';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: px, height: px } }); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.route('**/__sphere.html*', r => r.fulfill({ contentType: 'text/html', body: fs.readFileSync(__dirname + '/scene.html', 'utf8') }));
  await pg.goto('http://localhost:8799/__sphere.html?px=' + px + '&stub=' + stub + '&p=' + encodeURIComponent(p));
  try { await pg.waitForFunction(() => window.__done, null, { timeout: 60000 }); } catch (e) { console.log('NOT DONE', errs.join(' | ')); await b.close(); process.exit(1); }
  const d = await pg.evaluate(() => window.__png); fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64'));
  console.log('wrote', out, errs.length ? 'ERR ' + errs.join(' | ') : ''); await b.close(); })();
