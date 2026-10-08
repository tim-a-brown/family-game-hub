#!/usr/bin/env node
// Weekly check (see .github/workflows/lorcana-check.yml): download every Lorcana card from Lorcast, run each card's
// text through the same rules code the game uses (the ==RULES== … ==/ABIL== part of games/lorcana-play.html),
// and list the cards whose abilities the game can't run on its own yet.
//   node scripts/check-lorcana-abilities.js [cards.json]   → writes lorcana-check.md, prints a one-line summary
// With a file argument it reads that list ({ cards: { setCode: [card…] } }, as saved by mirror-lorcana-art.js) instead of Lorcast.
const fs = require('fs'), path = require('path');
const API = 'https://api.lorcast.com/v0', UA = { 'User-Agent': 'family-game-hub ability check' };
const html = fs.readFileSync(path.join(__dirname, '..', 'games', 'lorcana-play.html'), 'utf8');
const a = html.indexOf('// ==RULES=='), b = html.indexOf('// ==/ABIL==');
if (a < 0 || b < 0) throw new Error('rules markers not found in lorcana-play.html');
const RULES = new Function(html.slice(a, b) + '\nreturn { prep: prep };')();

async function json(url) { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url); return r.json(); }
async function lorcast() {
  const sj = await json(API + '/sets'), sets = (Array.isArray(sj) ? sj : sj.results || []).filter((s) => s && (s.id || s.code)), cards = {}, names = {};
  for (const s of sets) { const cj = await json(API + '/sets/' + encodeURIComponent(s.id || s.code) + '/cards'); cards[String(s.code || s.id)] = Array.isArray(cj) ? cj : cj.results || []; names[String(s.code || s.id)] = s.name || ''; await new Promise((r) => setTimeout(r, 120)); }
  return { cards, names };
}
// The same fields the game takes from a Lorcast card (fromLorcast in the page)
function card(c, code) {
  const n = (x) => (x == null || x === '' ? null : +x);
  return { id: String(c.id), n: String(c.name), v: c.version ? String(c.version) : '', c: n(c.cost), k: !!c.inkwell, ty: [].concat(c.type || []).map(String),
    cl: Array.isArray(c.classifications) ? c.classifications.map(String) : [], tx: c.text ? String(c.text) : '', kwl: Array.isArray(c.keywords) ? c.keywords.map(String) : [],
    s: n(c.strength), w: n(c.willpower), l: n(c.lore), mv: n(c.move_cost), set: String((c.set && c.set.code) || code) };
}
(async () => {
  const src = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : await lorcast();
  const names = src.names || Object.fromEntries((src.sets || []).map((s) => [String(s.code || s.id), s.name || '']));
  const seen = {}, bad = [];
  let total = 0;
  // the cards the game uses: no playtest ("Coconut", beta) sets, no Illumineer's Quest co-op cards, no odd entries
  const skip = (code) => /^Q/i.test(code) || /coconut|beta|playtest/i.test(code + ' ' + (names[code] || ''));
  for (const code of Object.keys(src.cards)) for (const c of src.cards[code]) {
    if (!c || !c.name || skip(code)) continue;
    const d = RULES.prep(card(c, code)); if (!d.t || d.c == null || d.c < 0) continue; if (seen[d.full]) continue; seen[d.full] = 1; total++;
    if (!d.K.auto) bad.push({ set: d.set, setName: names[d.set] || '', full: d.full, lines: d.A.filter((x) => !x.ok).map((x) => x.text) });
  }
  const bySet = {}; bad.forEach((x) => { (bySet[x.set] = bySet[x.set] || []).push(x); });
  let md = '';
  if (!bad.length) md = 'Every one of the ' + total + ' Lorcana cards on Lorcast runs automatically in the game.\n';
  else {
    md = bad.length + ' of ' + total + ' Lorcana cards have abilities the game can\'t run on its own yet. Players can still use them with the "Do it yourself" tools.\n\n'
      + 'To wire them up, start a Claude Code session on this repo and say: "wire up the Lorcana cards in the weekly check issue".\n';
    Object.keys(bySet).forEach((k) => { md += '\n### Set ' + k + (bySet[k][0].setName ? ' · ' + bySet[k][0].setName : '') + ' (' + bySet[k].length + ')\n\n'; bySet[k].forEach((x) => { md += '- **' + x.full + '**: ' + x.lines.map((l) => l.replace(/\s+/g, ' ')).join(' / ') + '\n'; }); });
  }
  fs.writeFileSync('lorcana-check.md', md);
  fs.writeFileSync('lorcana-check.count', String(bad.length));
  console.log('lorcana check: ' + bad.length + ' of ' + total + ' cards need wiring');
})().catch((e) => { console.error('lorcana check failed: ' + e.message); process.exit(1); });
