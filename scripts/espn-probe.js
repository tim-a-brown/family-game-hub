// TEMPORARY: prints the shape of ESPN's rankings (the container can't reach ESPN).
async function get(u) { try { const r = await fetch(u, { headers: { Origin: 'https://games.timbrown.xyz' } }); return { s: r.status, cors: r.headers.get('access-control-allow-origin'), j: await r.json().catch(() => null) }; } catch (e) { return { s: 'ERR', j: null }; } }
(async () => {
  for (const p of ['football/college-football', 'basketball/mens-college-basketball']) {
    const r = await get('https://site.api.espn.com/apis/site/v2/sports/' + p + '/rankings');
    console.log('\n' + p, r.s, r.cors, 'keys', r.j && Object.keys(r.j).join(','));
    (r.j && r.j.rankings || []).forEach(k => {
      console.log(' RANKING', JSON.stringify({ id: k.id, name: k.name, short: k.shortName, type: k.type, headline: k.headline, date: k.date, n: (k.ranks || []).length, others: (k.others || []).length, keys: Object.keys(k).join(',') }));
      const r0 = (k.ranks || [])[0]; if (r0) console.log('   rank0', JSON.stringify(Object.assign({}, r0, { team: r0.team && { id: r0.team.id, abbr: r0.team.abbreviation, loc: r0.team.location, nick: r0.team.nickname, name: r0.team.name, logo: r0.team.logos && r0.team.logos[0] && r0.team.logos[0].href, logoKey: r0.team.logo, color: r0.team.color } })).slice(0, 700));
    });
    console.log(' available', JSON.stringify(r.j && r.j.availableRankings && r.j.availableRankings.map(x => x.name + '|' + x.type)).slice(0, 600));
    console.log(' latestWeek', JSON.stringify(r.j && r.j.latestWeek).slice(0, 300));
  }
  // conference leaders for the CFP field: first entry of each FBS conference
  const st = await get('https://site.api.espn.com/apis/v2/sports/football/college-football/standings?group=80');
  (st.j && st.j.children || []).forEach(c => { const e = c.standings && c.standings.entries || []; console.log(' CONF', c.name, c.abbreviation, 'leader', e[0] && e[0].team.abbreviation, e[0] && JSON.stringify((e[0].stats || []).slice(0, 14).map(x => x.name + '=' + x.displayValue))); });
})();
