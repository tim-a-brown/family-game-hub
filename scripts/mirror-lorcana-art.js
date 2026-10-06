#!/usr/bin/env node
// Keeps a copy of every Lorcana card picture in the project's Firebase Storage
// bucket (Google Cloud), so cards keep their art if Lorcast ever goes away.
// Runs in the deploy Action. Only uploads pictures that aren't there yet, and
// never deletes anything. Any failure just leaves the copies as they were.
//   FIREBASE_SERVICE_ACCOUNT='{...json key...}' node scripts/mirror-lorcana-art.js
// The game reads the copies from lorcana/<path on cards.lorcast.io>.
const crypto = require('crypto');
const BUCKET = process.env.ART_BUCKET || 'familygames-da3e5.firebasestorage.app';
const API = 'https://api.lorcast.com/v0';
const UA = { 'User-Agent': 'family-game-hub art mirror' };

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
async function json(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.split('?')[0] + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}

// Access token from the service account key (signed JWT, no extra packages)
async function token(key) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/devstorage.read_write', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = crypto.createSign('RSA-SHA256').update(body).sign(key.private_key).toString('base64url');
  const j = await json('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + body + '.' + sig });
  return j.access_token;
}

(async () => {
  const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null');
  if (!key) throw new Error('no service account');
  const auth = { Authorization: 'Bearer ' + (await token(key)) };

  // What's already copied
  const have = new Set();
  let page = '';
  do {
    const j = await json('https://storage.googleapis.com/storage/v1/b/' + BUCKET + '/o?prefix=lorcana/&fields=items(name),nextPageToken&maxResults=1000' + (page ? '&pageToken=' + encodeURIComponent(page) : ''), { headers: auth });
    (j.items || []).forEach((o) => have.add(o.name));
    page = j.nextPageToken;
  } while (page);

  // Every card picture Lorcast has (same list the game downloads)
  const sj = await json(API + '/sets', { headers: UA });
  const sets = (Array.isArray(sj) ? sj : sj.results || []).filter((s) => s && (s.id || s.code));
  const urls = new Set();
  for (const s of sets) {
    const cj = await json(API + '/sets/' + encodeURIComponent(s.id || s.code) + '/cards', { headers: UA });
    for (const c of Array.isArray(cj) ? cj : cj.results || []) {
      const iu = (c && c.image_uris) || {}, im = iu.digital || iu;
      for (const u of [im.small, im.normal, im.large]) if (u) urls.add(u);
    }
    await sleep(120);
  }

  const todo = [...urls].map((u) => ({ u, name: 'lorcana' + new URL(u).pathname })).filter((x) => !have.has(x.name));
  console.log('lorcana art: ' + have.size + ' already copied, ' + todo.length + ' new of ' + urls.size);
  let done = 0, failed = 0;
  async function one(x) {
    try {
      const r = await fetch(x.u, { headers: UA });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const type = r.headers.get('content-type') || 'application/octet-stream', data = Buffer.from(await r.arrayBuffer());
      const meta = JSON.stringify({ name: x.name, contentType: type, cacheControl: 'public, max-age=31536000, immutable' });
      const bd = 'b' + crypto.randomBytes(12).toString('hex');
      const body = Buffer.concat([Buffer.from('--' + bd + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + bd + '\r\nContent-Type: ' + type + '\r\n\r\n'), data, Buffer.from('\r\n--' + bd + '--')]);
      await json('https://storage.googleapis.com/upload/storage/v1/b/' + BUCKET + '/o?uploadType=multipart&fields=name', { method: 'POST', headers: Object.assign({ 'Content-Type': 'multipart/related; boundary=' + bd }, auth), body });
      done++;
    } catch (e) { if (++failed <= 5) console.log('  skipped ' + x.u + ': ' + e.message); }
  }
  for (let i = 0; i < todo.length; i += 6) { await Promise.all(todo.slice(i, i + 6).map(one)); await sleep(100); }
  console.log('lorcana art: copied ' + done + (failed ? ', ' + failed + ' failed (will retry next deploy)' : ''));
})().catch((e) => { console.log('lorcana art: copies left as they were (' + e.message + ')'); });
