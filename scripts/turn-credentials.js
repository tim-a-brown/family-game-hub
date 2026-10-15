#!/usr/bin/env node
// Fresh TURN logins for online games. A TURN server passes a game's traffic between two devices that can't
// reach each other directly (phone data, Wi-Fi that keeps devices apart). Cloudflare runs the server; its
// logins expire, so the turn-credentials Action asks for new ones every few hours and saves them to Firebase
// Storage at online/ice.js (public: every player's browser needs them, and they expire within a day). A script, not
// JSON: the bucket sends no CORS headers (and the service account may not change that), and a page can load a
// script from anywhere.
//   CF_TURN_KEY_ID=... CF_TURN_API_TOKEN=... FIREBASE_SERVICE_ACCOUNT='{...}' node scripts/turn-credentials.js
// online.js reads the file before connecting; without it, games fall back to direct links and the relay.
const crypto = require('crypto');
const BUCKET = process.env.ART_BUCKET || 'familygames-da3e5.firebasestorage.app';
// Two days when Cloudflare allows it (a day otherwise). The Action runs every six hours and on every deploy, so a few
// missed runs (GitHub sometimes skips scheduled ones) still leave the games a good login.
const TTLS = [172800, 86400];

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
  const id = process.env.CF_TURN_KEY_ID, tok = process.env.CF_TURN_API_TOKEN;
  if (!id || !tok) { console.log('No Cloudflare TURN key set (CF_TURN_KEY_ID, CF_TURN_API_TOKEN): nothing to do.'); return; }
  const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null');
  if (!key) throw new Error('no service account');

  let r = null, TTL = 0;
  for (const ttl of TTLS) {
    try {
      r = await json('https://rtc.live.cloudflare.com/v1/turn/keys/' + encodeURIComponent(id) + '/credentials/generate-ice-servers', {
        method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: ttl })
      });
      TTL = ttl; break;
    } catch (e) { if (ttl === TTLS[TTLS.length - 1]) throw e; console.log('Cloudflare refused a ' + ttl + ' s login; trying shorter'); }
  }
  let servers = r.iceServers;
  if (servers && !Array.isArray(servers)) servers = [servers];
  if (!servers || !servers.length) throw new Error('Cloudflare sent no servers');
  // browsers can't use port 53 (it just times out), so leave those addresses out
  servers = servers.map((s) => Object.assign({}, s, { urls: [].concat(s.urls).filter((u) => !/:53(\?|$)/.test(u)) })).filter((s) => s.urls.length);
  const now = Date.now();
  const out = 'window.__fghIce && window.__fghIce(' + JSON.stringify({ iceServers: servers, at: now, exp: now + TTL * 1000 }) + ');';

  const auth = { Authorization: 'Bearer ' + (await token(key)) };
  const bd = 'b' + crypto.randomBytes(8).toString('hex');
  const meta = JSON.stringify({ name: 'online/ice.js', contentType: 'text/javascript', cacheControl: 'no-cache, max-age=0' });
  const body = '--' + bd + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + bd + '\r\nContent-Type: text/javascript\r\n\r\n' + out + '\r\n--' + bd + '--';
  await json('https://storage.googleapis.com/upload/storage/v1/b/' + BUCKET + '/o?uploadType=multipart&fields=name', { method: 'POST', headers: Object.assign({ 'Content-Type': 'multipart/related; boundary=' + bd }, auth), body });
  console.log('Saved online/ice.js: ' + servers.reduce((n, s) => n + s.urls.length, 0) + ' server addresses, good until ' + new Date(now + TTL * 1000).toISOString());
})().catch((e) => { console.error(e.message || e); process.exit(1); });
