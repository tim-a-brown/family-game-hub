// TEMPORARY: prints the shape of ESPN's answers (the container can't reach ESPN).
async function get(u) { try { const r = await fetch(u, { headers: { Origin: 'https://games.timbrown.xyz' } }); return { s: r.status, cors: r.headers.get('access-control-allow-origin'), j: await r.json().catch(() => null) }; } catch (e) { return { s: 'ERR', j: null }; } }
(async () => {
  for (const u of ['https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/powerindex/7',
                   'https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/2027/powerindex/7',
                   'https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/2026/powerindex/228',
                   'https://sports.core.api.espn.com/v2/sports/basketball/leagues/mens-college-basketball/seasons/2027/powerindex/228',
                   'https://sports.core.api.espn.com/v2/sports/basketball/leagues/wnba/seasons/2026/powerindex/18']) {
    const r = await get(u); const arr = r.j && (r.j.predictives || r.j.stats) || [];
    console.log('\n' + u.split('/leagues/')[1], r.s, r.cors, 'keys', r.j && Object.keys(r.j).join(','));
    arr.forEach(x => console.log('  ', x.name, '|', x.displayName, '|', x.displayValue, '|', (x.description || '').slice(0, 90)));
  }
  for (const lg of ['football/nfl', 'basketball/nba']) {
    const r = await get('https://site.web.api.espn.com/apis/fitt/v3/sports/' + lg + '/powerindex?region=us&lang=en');
    console.log('\nFITT', lg, JSON.stringify((r.j.categories || []).map(c => ({ n: c.name, l: c.labels, nm: c.names }))).slice(0, 2500));
    const t = r.j.teams.find(x => x.team.id === '7'); console.log(' team7', JSON.stringify(t && t.categories).slice(0, 1500));
  }
})();
