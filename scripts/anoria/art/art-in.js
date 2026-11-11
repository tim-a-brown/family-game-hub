// Brings a finished picture batch into the game: packs final/*.png into games/anoria/art (and art/t), adds the keys
// to PAINTED, sets FY from fy.json (or "FY n" is given by hand in the batch's fy.json), and puts the brief as finally
// used (briefs.json) back into the card's `art` in text.js.
//   node art-in.js <batch folder> [repo root] [skip=key,key]
const fs = require('fs'), path = require('path'), cp = require('child_process');
const B = path.resolve(process.argv[2]), R = path.resolve(process.argv[3] || require('path').resolve(__dirname, '../../..'));
const skip = (process.argv[4] || '').replace('skip=', '').split(',').filter(Boolean);
const TJ = R + '/games/anoria/text.js'; let src = fs.readFileSync(TJ, 'utf8');
const keys = fs.readdirSync(B + '/final').filter(f => /\.png$/.test(f)).map(f => f.replace('.png', '')).filter(k => skip.indexOf(k) < 0);
const briefs = fs.existsSync(B + '/briefs.json') ? JSON.parse(fs.readFileSync(B + '/briefs.json', 'utf8')) : {};
const fy = fs.existsSync(B + '/fy.json') ? JSON.parse(fs.readFileSync(B + '/fy.json', 'utf8')) : {};
// 1. the pictures (pack-art.sh skips files that exist: remove the old ones first)
const tmp = B + '/_in'; fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp);
keys.forEach(k => { fs.copyFileSync(B + '/final/' + k + '.png', tmp + '/' + k + '.png'); ['', 't/'].forEach(d => fs.rmSync(R + '/games/anoria/art/' + d + k + '.webp', { force: true })); });
cp.execSync('bash ' + R + '/scripts/anoria/pack-art.sh ' + tmp, { stdio: 'inherit' }); fs.rmSync(tmp, { recursive: true, force: true });
// 2. the briefs
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\s+/g, ' ').trim(); let nb = 0, miss = [];
keys.forEach(k => { let b = briefs[k]; if (b && typeof b === 'object') b = b.brief || b.art || b.text; if (!b) return;
  const m = new RegExp('^ {4}' + k + ': \\{', 'm').exec(src); if (!m) { miss.push(k); return; }
  const eol = src.indexOf('\n', m.index + 1), a = src.indexOf("art: '", m.index); if (a < 0 || a > eol) { miss.push(k + ' (no art)'); return; }
  let i = a + 6; while (i < eol && !(src[i] === "'" && src[i - 1] !== '\\')) i++;
  src = src.slice(0, a + 6) + esc(b) + src.slice(i); nb++; });
// 3. PAINTED
const pm = /const PAINTED = '([^']*)'/.exec(src); const have = pm[1].split(' ').filter(Boolean); keys.forEach(k => { if (have.indexOf(k) < 0) have.push(k); });
src = src.replace(pm[0], "const PAINTED = '" + have.join(' ') + "'");
// 4. FY
let nf = 0; Object.keys(fy).forEach(k => { if (keys.indexOf(k) < 0) return; const v = +(typeof fy[k] === 'object' ? fy[k].fy : fy[k]); if (!(v >= 0)) return;
  const re = new RegExp('([{ ,]\\s*)' + k + ': \\d+'); const s0 = src.indexOf('const FY = {'), s1 = src.indexOf('};', s0); let seg = src.slice(s0, s1);
  if (re.test(seg)) seg = seg.replace(re, '$1' + k + ': ' + v); else seg = seg.replace(/\s*$/, '') + ', ' + k + ': ' + v + ' ';
  src = src.slice(0, s0) + seg + src.slice(s1); nf++; });
fs.writeFileSync(TJ, src);
cp.execSync('node -e "const T=require(\'' + TJ + '\'); if(!T.CARDS) throw 1"');
console.log('pictures', keys.length, 'briefs', nb, 'FY', nf, 'painted now', have.length, miss.length ? 'MISSING ' + miss.join(', ') : '');
