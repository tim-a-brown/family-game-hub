// Builds games/carmen/maps.js: land outlines for the Carmen Sandiego travel maps, packed small.
//   world: Natural Earth land at 1:50m (world-atlas, public domain), points rounded to 0.1 degree
//   usa:   US state outlines (us-atlas, from the US Census Bureau, public domain)
// Run once after changing it:  (in a scratch folder) npm i world-atlas@2 us-atlas@3 topojson-client@3
//   node scripts/build-carmen-maps.js <that folder>/node_modules
// Each ring is packed as base-36 deltas of tenths of a degree: "x,y;dx,dy;dx,dy..." rings joined with "|".
const fs = require('fs'), path = require('path');
const nm = process.argv[2]; if (!nm) { console.error('usage: node build-carmen-maps.js <node_modules>'); process.exit(1); }
const topo = require(path.join(nm, 'topojson-client'));
function rings(geo) {
  const out = [];
  (geo.features || [geo]).forEach(f => {
    const g = f.geometry || f; if (!g) return;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    polys.forEach(p => p.forEach(r => out.push({ r, id: f.id })));
  });
  return out;
}
// drop points closer than tol (degrees) to the last kept one; skip tiny rings
function pack(r, tol, minPts) {
  const pts = []; let lx = 1e9, ly = 1e9;
  r.forEach(([x, y]) => { if (Math.hypot(x - lx, y - ly) >= tol) { pts.push([Math.round(x * 10), Math.round(y * 10)]); lx = x; ly = y; } });
  if (pts.length < minPts) return null;
  let s = pts[0][0].toString(36) + ',' + pts[0][1].toString(36), px = pts[0][0], py = pts[0][1];
  for (let i = 1; i < pts.length; i++) { const dx = pts[i][0] - px, dy = pts[i][1] - py; if (!dx && !dy) continue; s += ';' + dx.toString(36) + ',' + dy.toString(36); px = pts[i][0]; py = pts[i][1]; }
  return s;
}
const land = require(path.join(nm, 'world-atlas/land-50m.json'));
const world = rings(topo.feature(land, land.objects.land)).map(o => pack(o.r, 0.18, 5)).filter(Boolean);
const us = require(path.join(nm, 'us-atlas/states-10m.json'));
const states = rings(topo.feature(us, us.objects.states)).map(o => { const p = pack(o.r, 0.12, 4); return p ? o.id + ':' + p : null; }).filter(Boolean);
const names = {}; topo.feature(us, us.objects.states).features.forEach(f => { names[f.id] = f.properties.name; });
const js = '// Land outlines for the Carmen Sandiego travel maps. Built by scripts/build-carmen-maps.js from Natural Earth\n' +
  '// (world-atlas, public domain) and US Census state outlines (us-atlas, public domain). Do not edit by hand.\n' +
  'window.CARMEN_MAPS = {\n  world: ' + JSON.stringify(world.join('|')) + ',\n  usa: ' + JSON.stringify(states.join('|')) + ',\n  usaNames: ' + JSON.stringify(names) + '\n};\n';
fs.writeFileSync(path.join(__dirname, '../games/carmen/maps.js'), js);
console.log('world rings', world.length, 'us rings', states.length, 'bytes', js.length);
