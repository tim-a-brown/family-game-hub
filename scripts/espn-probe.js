// TEMPORARY: prints the shape of ESPN's answers (the container can't reach ESPN).
const H = { Origin: 'https://games.timbrown.xyz' };
async function get(u) { try { const r = await fetch(u, { headers: H }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, cors: r.headers.get('access-control-allow-origin'), j }; } catch (e) { return { s: 'ERR ' + e.message, j: null }; } }
const S = 'https://site.api.espn.com/apis/site/v2/sports/', S2 = 'https://site.api.espn.com/apis/v2/sports/';
function ent(j) { const out = []; (function walk(n, path) { if (!n) return; if (n.standings && n.standings.entries) n.standings.entries.forEach(e => out.push({ g: path + '/' + (n.abbreviation || n.name), e })); (n.children || []).forEach(c => walk(c, path + '/' + (n.abbreviation || n.name))); })(j, ''); return out; }
(async () => {
  for (const path of ['football/nfl', 'basketball/nba', 'hockey/nhl', 'baseball/mlb', 'basketball/wnba']) {
    const st = await get(S2 + path + '/standings?level=3');
    const es = ent(st.j);
    console.log('\n== ' + path + ' level3 entries', es.length, 'cors', st.cors);
    const e = es[0]; if (e) console.log(' ', e.g, e.e.team.abbreviation, JSON.stringify((e.e.stats || []).map(x => (x.name || x.type) + '=' + (x.displayValue != null ? x.displayValue : x.value))).slice(0, 1400));
    const nm = new Set(); es.forEach(x => (x.e.stats || []).forEach(s => nm.add(s.name || s.type))); console.log('  all stat names', [...nm].join(','));
    const nm2 = new Set(); es.forEach(x => (x.e.note ? nm2.add(JSON.stringify(x.e.note)) : 0)); console.log('  notes', [...nm2].slice(0, 6).join(' '));
  }
  // MLB schedule out of season, and with seasontype
  for (const q of ['', '?seasontype=2', '?season=2027&seasontype=2', '?season=2026&seasontype=2']) { const r = await get(S + 'baseball/mlb/teams/27/schedule' + q); console.log('MLB sched', q, r.s, (r.j && r.j.events || []).length, r.j && JSON.stringify(r.j.requestedSeason)); }
  // WNBA (offseason) and college
  for (const [p, id] of [['basketball/wnba', 18], ['football/college-football', 228], ['basketball/mens-college-basketball', 228]]) {
    const r = await get(S + p + '/teams/' + id + '/schedule'); const ev = r.j && r.j.events || [];
    console.log('SCHED', p, r.s, r.cors, ev.length, 'future', ev.filter(e => new Date(e.date) > Date.now()).length, JSON.stringify(r.j && r.j.requestedSeason));
    if (ev[0]) { const c = ev[ev.length - 1].competitions[0]; console.log('  last ev comp keys', Object.keys(c).join(','), 'status', JSON.stringify(c.status && c.status.type), 'competitor keys', Object.keys(c.competitors[0]).join(','), 'score', JSON.stringify(c.competitors[0].score), 'rec', JSON.stringify(c.competitors[0].record), 'rank', JSON.stringify(c.competitors[0].curatedRank)); }
  }
  for (const [p, q] of [['football/college-football', ''], ['football/college-football', '?group=80'], ['basketball/mens-college-basketball', '']]) {
    const st = await get(S2 + p + '/standings' + q); const es = ent(st.j);
    console.log('COLL STAND', p, q, st.s, st.cors, 'entries', es.length, 'groups', [...new Set(es.map(x => x.g))].slice(0, 8).join(' | '));
    const cl = es.find(x => x.e.team.id === '228'); if (cl) console.log('  clemson', cl.g, JSON.stringify(cl.e.stats.map(x => (x.name || x.type) + '=' + (x.displayValue != null ? x.displayValue : x.value))).slice(0, 800));
  }
  // playoff odds sources
  const urls = [
    'https://site.web.api.espn.com/apis/fitt/v3/sports/football/nfl/powerindex?region=us&lang=en',
    'https://site.web.api.espn.com/apis/fitt/v3/sports/basketball/nba/powerindex?region=us&lang=en',
    'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/types/2/teams/7/projection',
    'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/powerindex/7',
    'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/2027/powerindex/7',
    'https://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl/seasons/2027/powerindex/17',
  ];
  for (const u of urls) { const r = await get(u); console.log('\nODDS', u, r.s, 'cors', r.cors, JSON.stringify(r.j).slice(0, 1600)); }
})();
