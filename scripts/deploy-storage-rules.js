#!/usr/bin/env node
// Publishes storage.rules. `firebase deploy --only storage` fails with the deploy service account (it may not
// look up the project's default bucket), so this goes straight to the Firebase Rules API instead.
//   FIREBASE_SERVICE_ACCOUNT='{...}' node scripts/deploy-storage-rules.js
const crypto = require('crypto'), fs = require('fs');
const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const P = 'familygames-da3e5', BUCKET = 'familygames-da3e5.firebasestorage.app';
async function json(url, opt) { const r = await fetch(url, opt); const t = await r.text(); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url + ' ' + t.slice(0, 300)); return JSON.parse(t || '{}'); }
(async () => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url'), now = Math.floor(Date.now() / 1000);
  const body = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = crypto.createSign('RSA-SHA256').update(body).sign(key.private_key).toString('base64url');
  const tok = (await json('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + body + '.' + sig })).access_token;
  const H = { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
  const rel = 'projects/' + P + '/releases/firebase.storage/' + BUCKET;
  const cur = await json('https://firebaserules.googleapis.com/v1/' + rel, { headers: H });
  console.log('current release ruleset:', cur.rulesetName);
  const rs = await json('https://firebaserules.googleapis.com/v1/projects/' + P + '/rulesets', { method: 'POST', headers: H, body: JSON.stringify({ source: { files: [{ name: 'storage.rules', content: fs.readFileSync('storage.rules', 'utf8') }] } }) });
  console.log('new ruleset:', rs.name);
  const up = await json('https://firebaserules.googleapis.com/v1/' + rel, { method: 'PATCH', headers: H, body: JSON.stringify({ release: { name: rel, rulesetName: rs.name } }) });
  console.log('release now:', up.rulesetName);
})().catch((e) => { console.error(e.message); process.exit(1); });
