// The Place cards' back: the same back in another colour, so the two kinds of card sort apart on a real table.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const pg = await b.newPage();
  await pg.route('**/__compose.html', r => r.fulfill({ contentType: 'text/html', body: '<canvas id=c></canvas>' }));
  await pg.goto('http://localhost:8799/__compose.html');
  const png = await pg.evaluate(async () => { const i = new Image(); await new Promise(ok => { i.onload = ok; i.src = '/games/anoria/ui/card-back.webp'; });
    const c = document.getElementById('c'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    // wherever the back is blue (the cloth, not the gold), the red and blue swap and the green drops: navy becomes oxblood
    for (let k = 0; k < p.length; k += 4) { const r = p[k], gg = p[k + 1], bl = p[k + 2]; if (bl > r) { const t = (bl - r) / bl; p[k] = Math.min(255, bl * (1 + .55 * t)); p[k + 1] = gg * (1 - .5 * t); p[k + 2] = r * (1 - .25 * t); } }
    g.putImageData(d, 0, 0); return c.toDataURL('image/png'); });
  fs.writeFileSync(process.argv[2], Buffer.from(png.split(',')[1], 'base64')); await b.close(); })();
