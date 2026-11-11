// Sets the rendered sphere into the card back: the old sphere is painted out with the back's own navy (the oval frame,
// the four compass stars and the corners stay), then the new one is laid in with a soft shadow.
//   node compose.js <sphere.png> <out.png> [k px-per-unit at 1x] [debug]
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const fs = require('fs');
(async () => { const sph = fs.readFileSync(process.argv[2]).toString('base64'), out = process.argv[3], K = +(process.argv[4] || 158), dbg = process.argv[5] === 'debug';
  const b = await chromium.launch(); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.route('**/__compose.html', r => r.fulfill({ contentType: 'text/html', body: '<canvas id=c></canvas>' }));
  await pg.goto('http://localhost:8799/__compose.html');
  const png = await pg.evaluate(async ({ sph, K, dbg }) => {
    const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
    const base = await load('/games/anoria/ui/card-back.webp'), sp = await load('data:image/png;base64,' + sph);
    const Z = 2, W = base.width * Z, H = base.height * Z, c = document.getElementById('c'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high'; g.drawImage(base, 0, 0, W, H);
    const CX = 319.5 * Z, CY = 471 * Z, RX = 156 * Z, RY = 204 * Z;
    // the navy to paint with: a clean piece of the back from beside the oval, laid like tiles, each turned over its neighbour so no edge shows
    const pw = 78, ph = 108, px = 52, py = 178, fill = document.createElement('canvas'); fill.width = W; fill.height = H; const f = fill.getContext('2d'); f.imageSmoothingQuality = 'high';
    for (let j = 0, y = CY - RY - 100; y < CY + RY + 100; j++, y += ph * Z) for (let i = 0, x = CX - RX - 60; x < CX + RX + 60; i++, x += pw * Z) {
      f.save(); f.translate(x + (i % 2 ? pw * Z : 0), y + (j % 2 ? ph * Z : 0)); f.scale(i % 2 ? -1 : 1, j % 2 ? -1 : 1); f.drawImage(base, px, py, pw, ph, 0, 0, pw * Z, ph * Z); f.restore(); }
    // where to paint: the oval's inside, short of the frame, and not the inner points of the left and right stars
    const m = document.createElement('canvas'); m.width = W; m.height = H; const k = m.getContext('2d');
    const m0 = document.createElement('canvas'); m0.width = W; m0.height = H; const k0 = m0.getContext('2d'); k0.fillStyle = '#fff'; k0.beginPath(); k0.ellipse(CX, CY, 164 * Z, 244 * Z, 0, 0, 7); k0.fill(); k0.clearRect(0, 0, W, CY - RY + 4 * Z); k0.clearRect(0, CY + RY - 4 * Z, W, H);
    k.filter = 'blur(' + 3 * Z + 'px)'; k.drawImage(m0, 0, 0); k.filter = 'none';
    k.globalCompositeOperation = 'destination-out';
    const wedge = (ax, bx) => { k.beginPath(); k.moveTo(ax * Z, 474.8 * Z); k.lineTo(bx * Z, (474.8 - 11) * Z); k.lineTo(bx * Z, (474.8 + 11) * Z); k.closePath(); k.fill(); };
    wedge(197, 146); wedge(442, 494);
    f.globalCompositeOperation = 'destination-in'; f.drawImage(m, 0, 0);
    g.drawImage(fill, 0, 0);
    if (dbg) return c.toDataURL('image/png');
    // the sphere: K px to one unit of the model at 1x; the model's picture is 2 * 1.36 units across
    const D = 2 * 1.36 * K * Z, SX = 319.5 * Z, SY = 470 * Z;
    g.save(); g.shadowColor = 'rgba(0,0,8,.7)'; g.shadowBlur = 14 * Z; g.shadowOffsetX = 5 * Z; g.shadowOffsetY = 9 * Z; g.drawImage(sp, SX - D / 2, SY - D / 2, D, D); g.restore();
    g.drawImage(sp, SX - D / 2, SY - D / 2, D, D);
    return c.toDataURL('image/png');
  }, { sph, K, dbg });
  fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64')); console.log('wrote', out, errs.join(' | ')); await b.close(); })();
