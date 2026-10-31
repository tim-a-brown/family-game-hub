#!/usr/bin/env node
// Console games without their controls. Reads every game library in Firebase Storage (roms/<lib>/index.json: the
// house games and each account's own) and lists the games games/console-actions.js doesn't know yet, so the
// Controller buttons sheet can't say what their buttons do. Writes console-controls.md (the issue text) and
// console-controls.count; the console-controls Action keeps one GitHub issue from them. Changes nothing.
//   FIREBASE_SERVICE_ACCOUNT='{...json key...}' node scripts/check-console-controls.js
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const BUCKET = 'familygames-da3e5.firebasestorage.app';
const SYS = { nes: 'NES', snes: 'Super Nintendo', genesis: 'Sega Genesis', atari2600: 'Atari 2600' };

async function json(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.split('?')[0] + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}
async function token(key) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/devstorage.read_only', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = crypto.createSign('RSA-SHA256').update(body).sign(key.private_key).toString('base64url');
  const j = await json('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + body + '.' + sig });
  return j.access_token;
}

(async () => {
  const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null');
  if (!key) throw new Error('no service account');
  const auth = { Authorization: 'Bearer ' + (await token(key)) };
  global.window = {};
  require(path.join(__dirname, '..', 'games', 'console-actions.js'));
  // every library's list
  const idx = [];
  let page = '';
  do {
    const j = await json('https://storage.googleapis.com/storage/v1/b/' + BUCKET + '/o?prefix=roms/&fields=items(name),nextPageToken&maxResults=1000' + (page ? '&pageToken=' + page : ''), { headers: auth });
    (j.items || []).forEach((o) => { if (/^roms\/[0-9a-f]{32}\/index\.json$/.test(o.name)) idx.push(o.name); });
    page = j.nextPageToken || '';
  } while (page);
  const games = {};   // sys|title key -> {sys, name, n}
  for (const name of idx) {
    const ix = await json('https://storage.googleapis.com/storage/v1/b/' + BUCKET + '/o/' + encodeURIComponent(name) + '?alt=media', { headers: auth }).catch(() => null);
    if (!ix || !ix.carts) continue;
    Object.keys(ix.carts).forEach((id) => {
      const c = ix.carts[id]; if (!c || !SYS[c.sys] || (ix.del && ix.del[id])) return;
      if (window.CONSOLE_GAME(c.sys, c.name)) return;
      const k = c.sys + '|' + window.CONSOLE_TITLE_KEY(c.name);
      (games[k] = games[k] || { sys: c.sys, name: c.name, n: 0 }).n++;
    });
  }
  const miss = Object.values(games).sort((a, b) => a.sys.localeCompare(b.sys) || a.name.localeCompare(b.name));
  let md = '';
  if (miss.length) {
    md = 'These console games are on someone\'s shelf, but the Controller buttons sheet doesn\'t know what their buttons do yet ' +
      '(it shows just the button names). Add each to `games/console-actions.js`, from the game\'s original instruction manual.\n\n';
    Object.keys(SYS).forEach((s) => {
      const l = miss.filter((g) => g.sys === s); if (!l.length) return;
      md += '### ' + SYS[s] + '\n' + l.map((g) => '- ' + g.name).join('\n') + '\n\n';
    });
    md += '_Checked ' + idx.length + ' game libraries on ' + new Date().toISOString().slice(0, 10) + '._\n';
  }
  fs.writeFileSync('console-controls.md', md);
  fs.writeFileSync('console-controls.count', String(miss.length));
  console.log(idx.length + ' libraries, ' + miss.length + ' games without controls' + (miss.length ? ':\n' + miss.map((g) => '  ' + g.sys + ': ' + g.name).join('\n') : ''));
})().catch((e) => { console.error(e.message); process.exit(1); });
