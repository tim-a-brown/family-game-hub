#!/usr/bin/env node
// The home screen's baked frosting: every game's art, blurred, for the glass under a tile's name.
//
//   node scripts/build-tile-glow.js
//
// Writes img/tile-glow.webp (one picture holding every game's glow) and tile-glow.js (where each game's glow lies in
// it). On the home screen a tile's glass band and a Keep playing card's name panel draw their game's glow under the
// glass's dark tint (index.html, the ==LOOKS== block), so the art seems to glow through frosted glass as it did under a
// live backdrop blur, with nothing worked out while the page scrolls (CLAUDE.md, "What keeps the home screen smooth").
//
// Each glow is made by the page itself: index.html in the tile view draws every game's tile and Keep playing card with
// a copy of its art in the art's own place, blurred and saturated as the old live blur looked (blur(11px) saturate(1.3)
// at a 120px tile, a 140px card), and only the part under the glass is kept, at 40% of that size (a blurred picture loses
// nothing at that size). A console game's glow is its console's cartridge with a plain label.
// Run it again after adding a game or changing a game's icon or the tiles' art placement; a game with no glow yet shows
// the glass's plain soft light. Needs Playwright with Chromium (npm i -g playwright; npx playwright install chromium).
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { console.error('Playwright is not installed: npm i -g playwright && npx playwright install chromium (and set NODE_PATH=$(npm root -g))'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const U = 48;                 // a glow's width in the picture (the tile's or card's full width)
const TH = 32, SH = 30;       // how far down each one runs: two thirds of a tile's width under its band, 62% of a card's under its name
const GUT = 2, COLS = 16;     // the empty edge round each glow, and glows to a row
const TILE = 120, CARD = 140; // the sizes whose blur the glows keep (the live blur was 14px at any size)
const SYS = ['nes', 'snes', 'genesis', 'atari2600'];
const BLUR = +(process.env.GLOW_BLUR || 11);   // the blur at those sizes, in px (11 matches Safari's live blur(14px) in Tim's screenshots best)

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
      const p = path.join(ROOT, u);
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port + '/';
  const executablePath = process.env.CHROME || (fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
  const browser = await chromium.launch({ executablePath });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 1600 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await ctx.route(u => !String(u).startsWith(base), r => r.abort());
  // a guest on the tile view, with one cartridge of each console on the shelf (plain labels)
  const carts = SYS.map((s, i) => ({ id: (i + 1).toString(16).padStart(40, '0'), sys: s, name: 'Game' }));
  await ctx.addInitScript(([carts]) => {
    const ls = { fgh_mode: 'guest', gn_tour_seen: '1', gn_sound: '0', gn_home_view: 'tiles', console_sort: 'sys', gn_console_idx: JSON.stringify(carts) };
    for (const k in ls) localStorage.setItem(k, ls[k]);
  }, [carts]);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(base + 'index.html');
  await page.waitForFunction(() => document.querySelector('#list .g.gr.tl'), null, { timeout: 20000 });
  await page.waitForTimeout(1500);

  const map = await page.evaluate(([U, TH, SH, GUT, COLS, TILE, CARD, SYS, BLUR]) => {
    const look = document.documentElement.classList.contains('look');
    if (!look) throw new Error('the page is not in the tile look');
    // the cartridges' art, taken from the shelf's own tiles
    const cartArt = {};
    document.querySelectorAll('#list .g.gr.tl.cart .gi.gi-ct').forEach(gi => { const s = SYS.find(s => gi.querySelector('.ct-' + s)); if (s && !cartArt[s]) cartArt[s] = gi; });
    const ids = []; const seen = {};
    GAMES.forEach(g => { if (g && g.id && !g.cart && !seen[g.id]) { seen[g.id] = 1; ids.push(g.id); } });
    const css = document.createElement('style');
    css.textContent = `
      html, body { background: transparent !important; }
      html::before, html::after, body::before, body::after { display: none !important; }
      body > :not(#glow-stage), html > :not(head):not(body) { visibility: hidden !important; }
      #glow-stage { position: absolute; left: 0; top: 0; z-index: 2147483647; visibility: visible; }
      #glow-stage > * { position: absolute; visibility: visible; }
      #glow-stage .g.gr.tl { border-radius: 0; overflow: hidden; background: none !important; box-shadow: none !important; animation: none !important; }
      #glow-stage .g.gr.tl .go::before, #glow-stage .g.gr.tl .go::after, #glow-stage .g.gr.tl::before, #glow-stage .g.gr.tl::after { display: none !important; }
      #glow-stage .gi.gb { clip-path: inset(100% -100vmax -100vmax -100vmax) !important; filter: blur(var(--bl)) saturate(1.3) !important; }
      #glow-stage .gi.gb > svg.gicon, #glow-stage .gi.gb .gicon.mini-ct { filter: none !important; }
      #glow-stage .sbox { border-radius: 0; overflow: hidden; background: none !important; box-shadow: none !important; animation: none !important; }
      #glow-stage .sbox .art.gb { background: none !important; position: absolute; top: 0; left: 0; right: 0; padding: 0; overflow: visible; clip-path: inset(100% -100vmax -100vmax -100vmax) !important; filter: blur(var(--bl)) saturate(1.3) !important; }
      #glow-stage .sbox .art.gb .gicon { filter: none !important; }
    `;
    document.head.appendChild(css);
    const st = document.createElement('div'); st.id = 'glow-stage'; document.body.appendChild(st);
    const h = (t, a, kids) => { const e = document.createElement(t); for (const k in a || {}) e.setAttribute(k, a[k]); (kids || []).forEach(c => e.appendChild(c)); return e; };
    const svg = id => { const s = document.createElement('span'); s.innerHTML = GameIcon(id); return s.firstElementChild; };
    let n = 0; const out = { t: {}, s: {}, ct: {}, cs: {} };
    // each glow's top left in the picture; the element is placed so the part under the glass starts there
    function cell() { const c = n++ % COLS, r = Math.floor((n - 1) / COLS); return [c * (U + 2 * GUT) + GUT, r * (Math.max(TH, SH) + 2 * GUT) + GUT]; }
    function tile(kind, key, art, cart) {
      const at = cell();
      const gi = art.cloneNode ? art : null;
      const t = h('div', { class: 'g gr tl' + (cart ? ' cart' : ''), style: 'width:' + U + 'px;--bl:' + (BLUR * U / TILE) + 'px' }, [h('button', { class: 'go', type: 'button' }, [gi])]);
      st.appendChild(t);
      const top = gi.offsetHeight;   // the band starts where the art's own box ends
      t.style.height = (top + TH) + 'px'; t.style.left = at[0] + 'px'; t.style.top = (at[1] - top) + 'px';
      out[kind][key] = at;
    }
    function card(kind, key, art, cart) {
      const at = cell();
      const a = h('a', { class: 'sbox' + (cart ? ' ct' : ''), style: 'width:' + U + 'px;--bl:' + (BLUR * U / CARD) + 'px' }, [h('span', { class: 'art gb' }, [art])]);
      st.appendChild(a);
      const top = a.firstChild.offsetHeight;   // the name's glass starts where the art's box ends
      a.style.height = (top + SH) + 'px'; a.style.left = at[0] + 'px'; a.style.top = (at[1] - top) + 'px';
      out[kind][key] = at;
    }
    ids.forEach(id => { const gi = h('span', { class: 'gi gb' }, [svg(id)]); tile('t', id, gi); });
    SYS.forEach(s => { if (!cartArt[s]) return; const gi = cartArt[s].cloneNode(true); gi.classList.add('gb'); tile('ct', s, gi, true); });
    ids.forEach(id => { const w = document.createElement('span'); w.style.display = 'contents'; w.innerHTML = GameIcon(id); card('s', id, w); });
    SYS.forEach(s => { if (!cartArt[s]) return; const c = cartArt[s].querySelector('.gicon.mini-ct').cloneNode(true); card('cs', s, c, true); });
    const rows = Math.ceil(n / COLS);
    out.w = COLS * (U + 2 * GUT); out.h = rows * (Math.max(TH, SH) + 2 * GUT);
    st.style.width = out.w + 'px'; st.style.height = out.h + 'px';
    scrollTo(0, 0);
    return out;
  }, [U, TH, SH, GUT, COLS, TILE, CARD, SYS, BLUR]);
  await page.waitForTimeout(800);
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: map.w, height: map.h }, omitBackground: true });
  // to WebP (with its transparency) in the page's own canvas
  const webp = await page.evaluate(async b64 => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0);
    return c.toDataURL('image/webp', 0.6).split(',')[1];
  }, png.toString('base64'));
  const buf = Buffer.from(webp, 'base64');
  fs.writeFileSync(path.join(ROOT, 'img/tile-glow.webp'), buf);
  if (process.env.GLOW_PNG) fs.writeFileSync(process.env.GLOW_PNG, png);
  const v = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
  const js = '// Made by scripts/build-tile-glow.js: do not edit. Where each game\'s glow lies in img/tile-glow.webp, for the\n' +
    '// home screen\'s baked frosting (index.html, ==LOOKS==): u, the width of one glow; w and h, the picture\'s size; t, a\n' +
    '// tile\'s glow by game; s, a Keep playing card\'s; ct and cs, a cartridge\'s by console. Each is the glow\'s top left.\n' +
    'var TILE_GLOW = ' + JSON.stringify({ src: 'img/tile-glow.webp?v=' + v, u: U, w: map.w, h: map.h, t: map.t, s: map.s, ct: map.ct, cs: map.cs }) + ';\n';
  fs.writeFileSync(path.join(ROOT, 'tile-glow.js'), js);
  console.log('img/tile-glow.webp', map.w + 'x' + map.h, buf.length + ' bytes;', Object.keys(map.t).length, 'games,', Object.keys(map.ct).length, 'consoles');
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
