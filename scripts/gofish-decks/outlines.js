// Real outlines for the US States and Countries decks, from Natural Earth / US Census data (us-atlas, world-atlas),
// each projected on its own (a transverse Mercator centered on the place, so no shape is stretched) and fitted to a
// 1000 x 1000 square with a margin. Writes outlines.json: {key: [[ring of [x,y]], ...]} (holes are rings too: drawn
// with the even-odd rule).
const fs = require('fs'), topo = require('topojson-client');
const d3 = require('d3-geo');
const us = require('us-atlas/states-10m.json'), world = require('world-atlas/countries-50m.json');
const states = topo.feature(us, us.objects.states).features, countries = topo.feature(world, world.objects.countries).features;
const WANT = {
  california: ['s', 'California'], texas: ['s', 'Texas'], florida: ['s', 'Florida'], newyork: ['s', 'New York'], alaska: ['s', 'Alaska'],
  hawaii: ['s', 'Hawaii'], arizona: ['s', 'Arizona'], washington: ['s', 'Washington'], louisiana: ['s', 'Louisiana'], michigan: ['s', 'Michigan'],
  southdakota: ['s', 'South Dakota'], pennsylvania: ['s', 'Pennsylvania'], maine: ['s', 'Maine'],
  japan: ['c', 'Japan'], china: ['c', 'China'], india: ['c', 'India'], france: ['c', 'France'], italy: ['c', 'Italy'], uk: ['c', 'United Kingdom'],
  egypt: ['c', 'Egypt'], southafrica: ['c', 'South Africa'], brazil: ['c', 'Brazil'], mexico: ['c', 'Mexico'], canada: ['c', 'Canada'],
  peru: ['c', 'Peru'], australia: ['c', 'Australia']
};
const out = {}, M = 60, S = 1000;
for (const k in WANT) {
  const [t, n] = WANT[k];
  let f = (t === 's' ? states : countries).find(x => x.properties.name === n);
  if (!f) throw new Error('no ' + n);
  f = JSON.parse(JSON.stringify(f));
  // France: the mainland and Corsica only (the overseas regions would shrink it to a dot); Hawaii: the main islands only
  const keepNear = { france: [2.5, 46.5, 12], alaska: null, hawaii: [-157.5, 20.5, 4], australia: [134, -26, 25], china: [104, 35, 30] }[k];
  if (keepNear && f.geometry.type === 'MultiPolygon') {
    f.geometry.coordinates = f.geometry.coordinates.filter(p => { const c = d3.geoCentroid({ type: 'Polygon', coordinates: p }); return Math.abs(c[0] - keepNear[0]) < keepNear[2] && Math.abs(c[1] - keepNear[1]) < keepNear[2]; });
  }
  // drop specks: polygons under 0.15% of the place's largest polygon's area (they vanish at card size anyway)
  if (f.geometry.type === 'MultiPolygon') {
    const areas = f.geometry.coordinates.map(p => d3.geoArea({ type: 'Polygon', coordinates: p })), big = Math.max(...areas);
    f.geometry.coordinates = f.geometry.coordinates.filter((p, i) => areas[i] > big * (k === 'canada' ? 0.004 : 0.0015));
  }
  const c = d3.geoCentroid(f);
  const pr = d3.geoTransverseMercator().rotate([-c[0], -c[1]]).fitExtent([[M, M], [S - M, S - M]], f);
  const rings = [];
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  polys.forEach(p => p.forEach(r => { const pts = r.map(q => pr(q)).filter(Boolean).map(q => [Math.round(q[0]), Math.round(q[1])]).filter((q, i, a) => !i || q[0] !== a[i - 1][0] || q[1] !== a[i - 1][1]); if (pts.length > 2) rings.push(pts); }));
  out[k] = rings;
  console.log(k, rings.length, 'rings');
}
fs.writeFileSync(__dirname + '/outlines.json', JSON.stringify(out));
