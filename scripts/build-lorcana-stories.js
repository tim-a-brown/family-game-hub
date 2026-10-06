#!/usr/bin/env node
// Refreshes games/lorcana-stories.js (which film or show each Lorcana card is
// from) using LorcanaJSON's current card list, so new sets get their films.
// Runs in the deploy Action before publishing. Existing entries are kept, so a
// failed download just leaves the bundled list as it was.
//   node scripts/build-lorcana-stories.js [path/to/allCards.json]
const fs = require('fs'), path = require('path'), https = require('https');
const OUT = path.join(__dirname, '..', 'games', 'lorcana-stories.js');
const URL = 'https://lorcanajson.org/files/current/en/allCards.json';

// Same plain form the game uses: lowercase, no accents, straight apostrophes
function skey(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim(); }

function get(url, n) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'family-game-hub' } }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && (n || 0) < 4) return res(get(r.headers.location, (n || 0) + 1));
      if (r.statusCode !== 200) return rej(new Error('HTTP ' + r.statusCode));
      const b = []; r.on('data', (c) => b.push(c)); r.on('end', () => res(Buffer.concat(b).toString('utf8')));
    }).on('error', rej).setTimeout(90000, function () { this.destroy(new Error('timeout')); });
  });
}

(async () => {
  const src = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : await get(URL);
  const j = JSON.parse(src), cards = j.cards || j;
  // Start from the bundled list
  const old = fs.readFileSync(OUT, 'utf8'), cur = JSON.parse(old.slice(old.indexOf('{'), old.lastIndexOf('}') + 1));
  const byv = new Map(), names = new Map();
  for (const [k, i] of Object.entries(cur.n)) names.set(k, new Map([[cur.s[i], 1]]));
  for (const [k, i] of Object.entries(cur.v)) byv.set(k, cur.s[i]);
  let added = 0;
  for (const c of cards) {
    if (!c || !c.name || !c.story) continue;
    const n = skey(c.name), kv = n + '|' + skey(c.version);
    if (!names.has(n)) { names.set(n, new Map()); added++; }
    const m = names.get(n); m.set(c.story, (m.get(c.story) || 0) + 1);
    byv.set(kv, c.story);
  }
  const stories = [...new Set([...names.values()].flatMap((m) => [...m.keys()]).concat([...byv.values()]))].sort();
  const ix = new Map(stories.map((s, i) => [s, i])), N = {}, V = {};
  for (const [n, m] of names) {
    const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
    N[n] = ix.get(top);
  }
  for (const [kv, s] of byv) { const n = kv.split('|')[0]; if (stories[N[n]] !== s) V[kv] = ix.get(s); }
  const js = '// Which film or show each Lorcana card comes from (from LorcanaJSON). Keys are\n// normalized card names (lowercase, no accents, straight apostrophes); "name|version"\n// keys cover characters that appear in more than one. Refreshed on deploy by\n// scripts/build-lorcana-stories.js.\nwindow.LORC_STORY = ' + JSON.stringify({ s: stories, n: N, v: V }) + ';\n';
  fs.writeFileSync(OUT, js);
  console.log('lorcana-stories: ' + Object.keys(N).length + ' names (' + added + ' new), ' + stories.length + ' films and shows');
})().catch((e) => { console.log('lorcana-stories: kept the bundled list (' + e.message + ')'); });
