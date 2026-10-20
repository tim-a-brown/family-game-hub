#!/usr/bin/env node
// Puts the circuit rooms' finished pictures (path-traced offline, see games/poker/venue3d.js) into the project's
// Firebase Storage bucket at venues/<key>-<view>-<stage>.jpg, where the poker page reads them. Replaces what's there.
//   FIREBASE_SERVICE_ACCOUNT='{...json key...}' node scripts/upload-venue-art.js <folder of jpgs> [name prefix filter]
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const BUCKET = process.env.ART_BUCKET || 'familygames-da3e5.firebasestorage.app';

async function json(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.split('?')[0] + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}
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
  const dir = process.argv[2], filter = process.argv[3] || '';
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg') && f.startsWith(filter)).sort();
  const auth = { Authorization: 'Bearer ' + (await token(key)) };
  // what's up there, with sizes, so unchanged pictures are left alone
  const have = {};
  let page = '';
  do {
    const j = await json('https://storage.googleapis.com/storage/v1/b/' + BUCKET + '/o?prefix=venues/&fields=items(name,size),nextPageToken&maxResults=1000' + (page ? '&pageToken=' + encodeURIComponent(page) : ''), { headers: auth });
    (j.items || []).forEach((o) => { have[o.name] = +o.size; });
    page = j.nextPageToken;
  } while (page);
  let done = 0, same = 0, failed = 0;
  async function one(f) {
    const name = 'venues/' + f, data = fs.readFileSync(path.join(dir, f));
    if (have[name] === data.length) { same++; return; }
    try {
      const meta = JSON.stringify({ name, contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' });
      const bd = 'b' + crypto.randomBytes(12).toString('hex');
      const body = Buffer.concat([Buffer.from('--' + bd + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + bd + '\r\nContent-Type: image/jpeg\r\n\r\n'), data, Buffer.from('\r\n--' + bd + '--')]);
      await json('https://storage.googleapis.com/upload/storage/v1/b/' + BUCKET + '/o?uploadType=multipart&fields=name', { method: 'POST', headers: Object.assign({ 'Content-Type': 'multipart/related; boundary=' + bd }, auth), body });
      done++;
    } catch (e) { if (++failed <= 5) console.log('  failed ' + f + ': ' + e.message); }
  }
  for (let i = 0; i < files.length; i += 6) await Promise.all(files.slice(i, i + 6).map(one));
  console.log('venue art: ' + done + ' uploaded, ' + same + ' unchanged' + (failed ? ', ' + failed + ' failed' : ''));
})().catch((e) => { console.log('venue art: ' + e.message); process.exit(1); });
