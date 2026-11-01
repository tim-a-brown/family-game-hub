// TEMPORARY: prints the shape of ESPN's team, schedule and standings answers (the container can't reach ESPN).
const H = { Origin: 'https://games.timbrown.xyz' };
async function get(u) { const r = await fetch(u, { headers: H }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, cors: r.headers.get('access-control-allow-origin'), j }; }
function shape(o, d = 0, max = 3) { if (o == null || typeof o !== 'object') return JSON.stringify(o)?.slice(0, 60); if (d >= max) return Array.isArray(o) ? `[${o.length}]` : '{…}'; if (Array.isArray(o)) return `[${o.length}] ` + (o.length ? shape(o[0], d + 1, max) : ''); return '{' + Object.keys(o).slice(0, 30).map(k => k + ':' + shape(o[k], d + 1, max)).join(', ') + '}'; }
const S = 'https://site.api.espn.com/apis/site/v2/sports/', S2 = 'https://site.api.espn.com/apis/v2/sports/';
(async () => {
  for (const [path, id] of [['football/nfl', 7], ['basketball/nba', 7], ['hockey/nhl', 17], ['baseball/mlb', 27], ['basketball/wnba', 18], ['football/college-football', 228]]) {
    console.log('\n======== ' + path + ' ' + id);
    const t = await get(S + path + '/teams/' + id);
    const tm = t.j && t.j.team || {};
    console.log('TEAM', t.s, t.cors, 'standingSummary=', tm.standingSummary, 'rank=', tm.rank);
    console.log('RECORD', JSON.stringify((tm.record && tm.record.items || []).map(i => ({ d: i.description, t: i.type, s: i.summary, st: (i.stats || []).map(x => x.name + '=' + x.value).join(' ') }))).slice(0, 1500));
    console.log('TEAMKEYS', Object.keys(tm).join(','), 'nextEvent', shape(tm.nextEvent, 0, 2).slice(0, 300), 'groups', JSON.stringify(tm.groups));
    const sc = await get(S + path + '/teams/' + id + '/schedule');
    const ev = sc.j && sc.j.events || [];
    console.log('SCHED', sc.s, sc.cors, 'events', ev.length, 'season', JSON.stringify(sc.j && sc.j.requestedSeason), JSON.stringify(sc.j && sc.j.season));
    const fut = ev.filter(e => new Date(e.date) > Date.now());
    console.log('future', fut.length, 'first future', JSON.stringify(fut[0] || ev[ev.length - 1]).slice(0, 1800));
    const st = await get(S2 + path + '/standings');
    console.log('STAND', st.s, st.cors, shape(st.j, 0, 4).slice(0, 1200));
    const ch = st.j && st.j.children || [];
    ch.forEach(c => { console.log(' child', c.name, c.abbreviation, 'sub', (c.children || []).map(x => x.name).join('|'), 'entries', c.standings && c.standings.entries && c.standings.entries.length); });
    const e0 = (ch[0] && (ch[0].standings ? ch[0].standings.entries : ch[0].children && ch[0].children[0].standings.entries) || [])[0];
    if (e0) console.log(' ENTRY', JSON.stringify({ team: e0.team && { id: e0.team.id, abbr: e0.team.abbreviation }, stats: (e0.stats || []).map(x => (x.name || x.type) + '=' + (x.displayValue || x.value)) }).slice(0, 2000));
    const st3 = await get(S2 + path + '/standings?level=3');
    const c3 = st3.j && st3.j.children || [];
    console.log('STAND level3', st3.s, c3.map(c => c.name + '>' + (c.children || []).map(x => x.name + '(' + (x.standings && x.standings.entries.length) + ')').join(',')).join(' ; ').slice(0, 800));
  }
  for (const u of ['https://site.web.api.espn.com/apis/fitt/v3/sports/football/nfl/powerindex?region=us&lang=en', 'https://site.web.api.espn.com/apis/fitt/v3/sports/basketball/nba/powerindex?region=us&lang=en']) {
    const r = await get(u); console.log('\nFPI', u, r.s, r.cors, shape(r.j, 0, 3).slice(0, 1500));
    const c = r.j && (r.j.categories || []); console.log(' cats', JSON.stringify(c.map(x => ({ n: x.name, l: x.labels, nm: x.names }))).slice(0, 1500));
    const t0 = r.j && r.j.teams && r.j.teams[0]; if (t0) console.log(' team0', JSON.stringify(t0).slice(0, 1500));
  }
})();
