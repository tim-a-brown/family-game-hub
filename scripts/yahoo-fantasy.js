#!/usr/bin/env node
// Fantasy scores from Yahoo for the Sportsbook's tickers (games/sportsbook.html pins them beside the strips).
// Every league on the signed-in Yahoo account (football, basketball, baseball, hockey), this week's matchups with
// points and projections, saved to Firebase Storage fantasy/scores.json (public, read by the game).
//
// The Yahoo login: one sign-in, then kept fresh here. The app's secret never leaves GitHub; the long-lived login
// (Yahoo's refresh token) is kept in Storage at fantasy/private/yahoo.json, which nobody but this service account can
// read (storage.rules has no rule for it, so it's closed).
//   CODE=<the code Yahoo shows after you approve>  node scripts/yahoo-fantasy.js   one-time sign-in, then a first run
//   node scripts/yahoo-fantasy.js                                                  the regular run (yahoo-fantasy.yml)
// Needs YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET, FIREBASE_SERVICE_ACCOUNT. DRY=1 prints instead of saving the scores.
const crypto = require('crypto');
const BUCKET = 'familygames-da3e5.firebasestorage.app', OUT = 'fantasy/scores.json', TOKEN = 'fantasy/private/yahoo.json';
const ID = process.env.YAHOO_CLIENT_ID, SECRET = process.env.YAHOO_CLIENT_SECRET, CODE = (process.env.CODE || '').trim();
const API = 'https://fantasysports.yahooapis.com/fantasy/v2/';
if (!ID || !SECRET) { console.error('YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET are needed'); process.exit(1); }

// ── Google Storage with the service account ──
let gTok = null;
async function google() {
  if (gTok) return gTok;
  const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url'), now = Math.floor(Date.now() / 1000);
  const body = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/devstorage.read_write', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = crypto.createSign('RSA-SHA256').update(body).sign(key.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + body + '.' + sig });
  if (!r.ok) throw new Error('Google token HTTP ' + r.status);
  return (gTok = (await r.json()).access_token);
}
async function put(obj, text, cache) {
  const meta = { name: obj, contentType: 'application/json', cacheControl: cache };
  const bnd = 'b' + crypto.randomBytes(8).toString('hex');
  const body = '--' + bnd + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + bnd + '\r\nContent-Type: application/json\r\n\r\n' + text + '\r\n--' + bnd + '--';
  const r = await fetch('https://storage.googleapis.com/upload/storage/v1/b/' + BUCKET + '/o?uploadType=multipart&fields=name', { method: 'POST', headers: { Authorization: 'Bearer ' + await google(), 'Content-Type': 'multipart/related; boundary=' + bnd }, body });
  if (!r.ok) throw new Error('upload HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
async function get(obj) {
  const r = await fetch('https://storage.googleapis.com/storage/v1/b/' + BUCKET + '/o/' + encodeURIComponent(obj) + '?alt=media', { headers: { Authorization: 'Bearer ' + await google() } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('read HTTP ' + r.status);
  return r.json();
}

// ── Yahoo sign-in ──
async function yahooToken(form) {
  const r = await fetch('https://api.login.yahoo.com/oauth2/get_token', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(ID + ':' + SECRET).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(Object.assign({ redirect_uri: 'oob' }, form)).toString() });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {}
  if (!r.ok || !j || !j.access_token) throw new Error('Yahoo sign-in HTTP ' + r.status + ' ' + (j && (j.error_description || j.error) || t.slice(0, 160)));
  return j;
}
async function login() {
  if (CODE) {
    const j = await yahooToken({ grant_type: 'authorization_code', code: CODE });
    await put(TOKEN, JSON.stringify({ refresh: j.refresh_token, guid: j.xoauth_yahoo_guid || null, at: Date.now() }), 'private, no-store');
    console.log('Signed in to Yahoo; the login is saved.');
    return j.access_token;
  }
  const saved = await get(TOKEN);
  if (!saved || !saved.refresh) throw new Error('Not signed in to Yahoo yet: run the "Yahoo sign-in" Action with the code from Yahoo.');
  const j = await yahooToken({ grant_type: 'refresh_token', refresh_token: saved.refresh });
  if (j.refresh_token && j.refresh_token !== saved.refresh) await put(TOKEN, JSON.stringify(Object.assign(saved, { refresh: j.refresh_token, at: Date.now() })), 'private, no-store');
  return j.access_token;
}

// ── Yahoo's JSON: lists come as {"0": {...}, "1": {...}, count: n}, records as arrays of little objects ──
function list(c) { return c ? Object.keys(c).filter((k) => /^\d+$/.test(k)).sort((a, b) => a - b).map((k) => c[k]) : []; }
function rec(x) {
  if (!Array.isArray(x)) return x || {};
  const o = {};
  x.forEach((e) => { const v = Array.isArray(e) ? rec(e) : e; if (v && typeof v === 'object') Object.assign(o, v); });
  return o;
}
async function y(tok, path) {
  const r = await fetch(API + path + (path.includes('?') ? '&' : '?') + 'format=json', { headers: { Authorization: 'Bearer ' + tok, Accept: 'application/json' } });
  const t = await r.text();
  if (!r.ok) throw new Error('Yahoo ' + path + ' HTTP ' + r.status + ' ' + t.slice(0, 200));
  return JSON.parse(t).fantasy_content;
}
const num = (v) => { const n = parseFloat(v); return isFinite(n) ? Math.round(n * 100) / 100 : null; };
function teamOf(t) {
  const r = rec(t), m = rec(list(r.managers)[0] && list(r.managers)[0].manager ? [list(r.managers)[0].manager] : []);
  const logo = r.team_logos && list(r.team_logos)[0] && list(r.team_logos)[0].team_logo && list(r.team_logos)[0].team_logo.url;
  return {
    key: r.team_key, name: r.name, mine: r.is_owned_by_current_login == 1, mgr: m.nickname || null, logo: logo || null,
    pts: r.team_points ? num(r.team_points.total) : null, proj: r.team_projected_points ? num(r.team_projected_points.total) : null,
    win: r.win_probability != null ? num(r.win_probability) : null
  };
}

(async () => {
  const tok = await login();
  const u = await y(tok, 'users;use_login=1/games;game_codes=nfl,nba,mlb,nhl/leagues');
  const user = rec(list(u.users)[0].user), leagues = [];
  list(user.games).forEach((g) => {
    const game = rec(g.game);
    list(game.leagues).forEach((l) => { const L = rec(l.league); if (L.league_key) leagues.push({ L, sport: game.code, season: game.season, over: game.is_game_over == 1 }); });
  });
  console.log('leagues:', leagues.map((x) => x.sport + ' ' + x.L.name + (x.over ? ' (season over)' : '')).join(', ') || 'none');
  const out = [];
  for (const { L, sport, season, over } of leagues) {
    if (over || L.is_finished == 1) continue;
    try {
      const s = await y(tok, 'league/' + L.league_key + '/scoreboard');
      const lg = rec(s.league), sb = lg.scoreboard || {}, inner = list(sb)[0] || sb;
      const matchups = list(inner.matchups).map((m) => {
        const mu = m.matchup || {}, teams = list((list(mu)[0] || mu).teams).map((t) => teamOf(t.team));
        return { st: mu.status || null, tie: mu.is_tied == 1, winner: mu.winner_team_key || null, teams };
      }).filter((m) => m.teams.length === 2);
      out.push({ key: L.league_key, name: L.name, sport, season, week: num(sb.week || L.current_week), url: L.url || null, scoring: L.scoring_type || null, matchups });
    } catch (e) { console.log('skipped ' + L.name + ': ' + e.message); }
  }
  // your matchup first in each league
  out.forEach((L) => L.matchups.sort((a, b) => (b.teams.some((t) => t.mine) ? 1 : 0) - (a.teams.some((t) => t.mine) ? 1 : 0)));
  const doc = { v: 1, at: Date.now(), leagues: out };
  if (process.env.DRY) { console.log(JSON.stringify(doc, null, 1)); return; }
  await put(OUT, JSON.stringify(doc), 'no-cache, max-age=0');
  const mine = out.map((L) => { const m = L.matchups.find((x) => x.teams.some((t) => t.mine)); return m ? L.name + ': ' + m.teams.map((t) => t.name + ' ' + t.pts).join(' vs ') : L.name; });
  console.log('saved ' + OUT + ': ' + (mine.join('; ') || 'no leagues in season'));
})().catch((e) => { console.error(e.message); process.exit(1); });
