// Sets the rendered sphere into the logo, over the old one.   node logo.js <sphere.png> <out.png> [debug]
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const fs = require('fs');
(async () => { const sph = fs.readFileSync(process.argv[2]).toString('base64'), out = process.argv[3];
  const b = await chromium.launch(); const pg = await b.newPage();
  await pg.route('**/__compose.html', r => r.fulfill({ contentType: 'text/html', body: '<canvas id=c></canvas>' }));
  await pg.goto('http://localhost:8799/__compose.html');
  const png = await pg.evaluate(async ({ sph }) => {
    const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
    const base = await load('/games/anoria/ui/logo.webp'), sp = await load('data:image/png;base64,' + sph);
    const Z = 2, W = base.width * Z, H = base.height * Z, c = document.getElementById('c'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high'; g.drawImage(base, 0, 0, W, H);
    const CX = 322 * Z, CY = 324 * Z, R = 77 * Z;
    // the night behind the rings, with the warm light of the sun at its heart
    const q = g.createRadialGradient(CX, CY, 0, CX, CY, R * .97); q.addColorStop(0, '#3a2c12'); q.addColorStop(.45, '#141a2c'); q.addColorStop(1, '#0a1022');
    g.fillStyle = q; g.beginPath(); g.ellipse(CX, CY, R * .95, R * .95 * .965, 0, 0, 7); g.fill();
    const D = 2 * 1.06 * R;   // (the model's picture is 2 * zoom units across; zoom 1.06, the meridian's radius 1)
    g.save(); g.shadowColor = 'rgba(0,0,8,.75)'; g.shadowBlur = 7 * Z; g.shadowOffsetY = 3 * Z; g.drawImage(sp, CX - D / 2, CY - D / 2, D, D); g.restore();
    return c.toDataURL('image/png');
  }, { sph });
  fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64')); console.log('wrote', out); await b.close(); })();
