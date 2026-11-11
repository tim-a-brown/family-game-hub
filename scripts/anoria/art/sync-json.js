// Makes set-150.json's `art` for every card the same as text.js (after art-in.js).   node sync-json.js [repo]
const fs = require('fs'), R = process.argv[2] || require('path').resolve(__dirname, '../../..');
const T = require(R + '/games/anoria/text.js'), F = R + '/scripts/anoria/set-150.json'; let s = fs.readFileSync(F, 'utf8'); const J = JSON.parse(s); let n = 0;
J.cards.forEach(c => { const t = T.CARDS[c.key]; if (!t || !t.art || t.art === c.art) return;
  const a = s.indexOf('"key": ' + JSON.stringify(c.key)) >= 0 ? s.indexOf('"key": ' + JSON.stringify(c.key)) : s.indexOf('"key":' + JSON.stringify(c.key)); if (a < 0) throw 'no ' + c.key;
  const old = JSON.stringify(c.art), i = s.indexOf(old, a); if (i < 0) throw 'no art ' + c.key; s = s.slice(0, i) + JSON.stringify(t.art) + s.slice(i + old.length); n++; });
JSON.parse(s); fs.writeFileSync(F, s); console.log('briefs synced', n);
