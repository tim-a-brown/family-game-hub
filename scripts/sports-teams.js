#!/usr/bin/env node
// Every team in each Sportsbook league (games/sportsbook.html, My teams), saved to Firebase Storage
// sportsbook/teams.json (public) once a week by sports-teams.yml. ESPN's team lists don't always answer the app (and a
// league out of season has no games on the board to find teams in), so the app reads this first.
// College lists join several of ESPN's divisions (FBS and FCS football, Division I basketball) and the full list.
//   FIREBASE_SERVICE_ACCOUNT='{...json key...}' node scripts/sports-teams.js        (DRY=1: print, don't save)
const crypto = require('crypto');
const BUCKET = 'familygames-da3e5.firebasestorage.app', OBJ = 'sportsbook/teams.json';
const API = 'https://site.api.espn.com/apis/site/v2/sports/';
const LEAGUES = {
  mlb: ['baseball/mlb', ['limit=1000']],
  nba: ['basketball/nba', ['limit=1000']],
  wnba: ['basketball/wnba', ['limit=1000']],
  nfl: ['football/nfl', ['limit=1000']],
  nhl: ['hockey/nhl', ['limit=1000']],
  cbb: ['basketball/mens-college-basketball', ['groups=50&limit=1000', 'limit=1000']],
  cfb: ['football/college-football', ['groups=80&limit=1000', 'groups=81&limit=1000', 'limit=1000']]
};
const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', Accept: 'application/json' };
const KEY = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;

async function getJSON(u) { const r = await fetch(u, { headers: UA }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
function teamsOf(j) {
  const raw = (((j.sports || [])[0] || {}).leagues || [])[0];
  return ((raw && raw.teams) || []).map(x => { const t = x.team || x; return { id: String(t.id), abbr: t.abbreviation || '', name: t.displayName || '', short: t.shortDisplayName || t.name || '', loc: t.location || '', nick: t.name || '', color: t.color ? '#' + t.color : '#556070', logo: (t.logos && t.logos[0] && t.logos[0].href) || '' }; })
    .filter(t => t.id && t.name);
}
async function main() {
  const out = { at: Date.now(), lg: {} };
  for (const k of Object.keys(LEAGUES)) {
    const [path, qs] = LEAGUES[k], seen = {}, list = [];
    for (const q of qs) {
      try {
        const t = teamsOf(await getJSON(API + path + '/teams?' + q));
        let add = 0; t.forEach(x => { if (!seen[x.id]) { seen[x.id] = 1; list.push(x); add++; } });
        console.log(k + ' ' + q + ': ' + t.length + ' teams (' + add + ' new)');
      } catch (e) { console.log(k + ' ' + q + ': ' + e.message); }
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    if (list.length) out.lg[k] = list;
    console.log(k + ': ' + list.length + ' in all');
  }
  ['Virginia Tech', 'Clemson', 'James Madison', 'Maryland'].forEach(n => console.log('check ' + n + ': cfb ' + !!(out.lg.cfb || []).find(t => t.name.indexOf(n) === 0) + ', cbb ' + !!(out.lg.cbb || []).find(t => t.name.indexOf(n) === 0)));
  if (!Object.keys(out.lg).length) throw new Error('no teams at all');
  if (process.env.DRY) return;
  await upload(OBJ, JSON.stringify(out));
}
function b64(o) { return Buffer.from(JSON.stringify(o)).toString('base64url'); }
async function token(key) {
  const now = Math.floor(Date.now() / 1000);
  const body = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/devstorage.read_write', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = crypto.createSign('RSA-SHA256').update(body).sign(key.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + body + '.' + sig });
  const j = await r.json(); if (!j.access_token) throw new Error('no token'); return j.access_token;
}
async function upload(obj, text) {
  if (!KEY) throw new Error('no service account');
  const auth = { Authorization: 'Bearer ' + (await token(KEY)) };
  const bd = 'b' + crypto.randomBytes(8).toString('hex');
  const meta = JSON.stringify({ name: obj, contentType: 'application/json', cacheControl: 'public, max-age=3600' });
  const body = Buffer.concat([Buffer.from('--' + bd + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + bd + '\r\nContent-Type: application/json\r\n\r\n'), Buffer.from(text), Buffer.from('\r\n--' + bd + '--')]);
  const r = await fetch('https://storage.googleapis.com/upload/storage/v1/b/' + BUCKET + '/o?uploadType=multipart&fields=name', { method: 'POST', headers: Object.assign({ 'Content-Type': 'multipart/related; boundary=' + bd }, auth), body });
  if (!r.ok) throw new Error('upload HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
  console.log('Saved ' + obj + ' (' + text.length + ' bytes)');
}
main().catch(e => { console.error(e.message); process.exit(1); });
