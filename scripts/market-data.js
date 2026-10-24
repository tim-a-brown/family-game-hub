#!/usr/bin/env node
// The Stock Market game's prices (games/stocks.html). Twice each weekday (market-data.yml, around midday and after
// the close in New York) this gets a year of daily closes, the latest price and the year's dividends for every
// stock, fund and coin the game trades, plus Treasury yields and the three big indexes, from Yahoo Finance (Stooq
// when Yahoo won't answer), and saves them to Firebase Storage market/quotes.json (public), which the game reads.
// A symbol that can't be fetched keeps its last saved prices.
//   FIREBASE_SERVICE_ACCOUNT='{...json key...}' node scripts/market-data.js        (DRY=1: print, don't save)
const crypto = require('crypto');
const BUCKET = 'familygames-da3e5.firebasestorage.app', OBJ = 'market/quotes.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', Accept: 'application/json,text/csv,*/*' };

// [symbol, name, kind (stock | fund | bond | coin), group, one line about it]
const LIST = [
  ['SPY', 'SPDR S&P 500 ETF', 'fund', 'index', 'The 500 biggest US companies in one share. The most traded fund in the world.'],
  ['VOO', 'Vanguard S&P 500 ETF', 'fund', 'index', 'The same 500 companies as SPY, with one of the lowest yearly fees (0.03%).'],
  ['VTI', 'Vanguard Total Stock Market ETF', 'fund', 'index', 'Nearly every US stock, big and small: about 3,500 companies.'],
  ['QQQ', 'Invesco QQQ (Nasdaq-100)', 'fund', 'index', 'The 100 biggest companies on the Nasdaq, heavy on tech.'],
  ['DIA', 'SPDR Dow Jones Industrial Average ETF', 'fund', 'index', 'The 30 companies in the Dow, the oldest US stock index.'],
  ['IWM', 'iShares Russell 2000 ETF', 'fund', 'index', '2,000 smaller US companies. Bumpier, with more room to grow.'],
  ['VXUS', 'Vanguard Total International Stock ETF', 'fund', 'index', 'Companies outside the US: Europe, Japan, China, India and more.'],
  ['VT', 'Vanguard Total World Stock ETF', 'fund', 'index', 'The whole world’s stock market in one fund.'],
  ['SCHD', 'Schwab US Dividend Equity ETF', 'fund', 'sector', '100 US companies known for paying steady, growing dividends.'],
  ['VNQ', 'Vanguard Real Estate ETF', 'fund', 'sector', 'Companies that own buildings: apartments, offices, warehouses, cell towers.'],
  ['XLK', 'Technology Select Sector SPDR', 'fund', 'sector', 'Only the tech companies in the S&P 500.'],
  ['XLE', 'Energy Select Sector SPDR', 'fund', 'sector', 'Oil and gas companies in the S&P 500.'],
  ['GLD', 'SPDR Gold Shares', 'fund', 'sector', 'Each share is backed by real gold in a vault.'],
  ['BND', 'Vanguard Total Bond Market ETF', 'bond', 'bondfund', 'Thousands of US government and company bonds in one fund.'],
  ['AGG', 'iShares Core US Aggregate Bond ETF', 'bond', 'bondfund', 'The standard US bond index: Treasuries, mortgages and company bonds.'],
  ['SHY', 'iShares 1-3 Year Treasury Bond ETF', 'bond', 'bondfund', 'Short-term US Treasuries: small swings, modest interest.'],
  ['TLT', 'iShares 20+ Year Treasury Bond ETF', 'bond', 'bondfund', 'Long-term US Treasuries: moves a lot when interest rates change.'],
  ['TIP', 'iShares TIPS Bond ETF', 'bond', 'bondfund', 'Treasuries that grow with inflation.'],
  ['LQD', 'iShares Investment Grade Corporate Bond ETF', 'bond', 'bondfund', 'Bonds from big, solid companies. A bit more interest than Treasuries.'],
  ['HYG', 'iShares High Yield Corporate Bond ETF', 'bond', 'bondfund', '“Junk” bonds: riskier companies paying higher interest.'],
  ['MUB', 'iShares National Muni Bond ETF', 'bond', 'bondfund', 'City and state bonds. Their interest is free of federal income tax.'],
  ['AAPL', 'Apple', 'stock', 'tech', 'iPhone, Mac, iPad, Apple Watch and the App Store.'],
  ['MSFT', 'Microsoft', 'stock', 'tech', 'Windows, Office, Teams, Azure cloud and Xbox.'],
  ['NVDA', 'Nvidia', 'stock', 'tech', 'The chips that run video games and most of the world’s AI.'],
  ['GOOGL', 'Alphabet (Google)', 'stock', 'tech', 'Google Search, YouTube, Android and Waymo.'],
  ['AMZN', 'Amazon', 'stock', 'tech', 'Online shopping, Prime and AWS, the biggest cloud.'],
  ['META', 'Meta Platforms', 'stock', 'tech', 'Facebook, Instagram, WhatsApp and Quest headsets.'],
  ['TSLA', 'Tesla', 'stock', 'tech', 'Electric cars, batteries and solar. Famous for big swings.'],
  ['AMD', 'AMD', 'stock', 'tech', 'Computer and game console chips (PlayStation, Xbox).'],
  ['INTC', 'Intel', 'stock', 'tech', 'The original PC chip maker.'],
  ['CRM', 'Salesforce', 'stock', 'tech', 'Software companies use to track customers.'],
  ['ADBE', 'Adobe', 'stock', 'tech', 'Photoshop, Acrobat and Premiere.'],
  ['ORCL', 'Oracle', 'stock', 'tech', 'Databases and cloud computing for big organizations.'],
  ['NTDOY', 'Nintendo', 'stock', 'fun', 'Switch, Mario, Zelda and Pokémon (shares from Japan, traded in the US).'],
  ['SONY', 'Sony', 'stock', 'fun', 'PlayStation, movies, music and cameras.'],
  ['RBLX', 'Roblox', 'stock', 'fun', 'The game platform where players build the games.'],
  ['EA', 'Electronic Arts', 'stock', 'fun', 'Madden, EA Sports FC, The Sims and Apex Legends.'],
  ['TTWO', 'Take-Two Interactive', 'stock', 'fun', 'Grand Theft Auto, NBA 2K and Red Dead.'],
  ['DIS', 'Disney', 'stock', 'fun', 'Theme parks, Disney+, Marvel, Pixar and Star Wars.'],
  ['NFLX', 'Netflix', 'stock', 'fun', 'The biggest streaming service.'],
  ['SPOT', 'Spotify', 'stock', 'fun', 'Music and podcasts.'],
  ['MAT', 'Mattel', 'stock', 'fun', 'Barbie, Hot Wheels, UNO and Fisher-Price.'],
  ['HAS', 'Hasbro', 'stock', 'fun', 'Monopoly, Nerf, Transformers and Magic: The Gathering.'],
  ['PTON', 'Peloton', 'stock', 'fun', 'Connected bikes, treadmills and workout classes.'],
  ['UAL', 'United Airlines', 'stock', 'travel', 'Denver is one of its biggest hubs.'],
  ['DAL', 'Delta Air Lines', 'stock', 'travel', 'The biggest US airline by revenue.'],
  ['LUV', 'Southwest Airlines', 'stock', 'travel', 'Open seating, two free bags, big in Denver.'],
  ['MAR', 'Marriott', 'stock', 'travel', 'The world’s biggest hotel company.'],
  ['HLT', 'Hilton', 'stock', 'travel', 'Hilton, Hampton, DoubleTree and Waldorf Astoria.'],
  ['H', 'Hyatt', 'stock', 'travel', 'Hyatt, Park Hyatt, Andaz and Grand Hyatt hotels.'],
  ['IHG', 'IHG Hotels', 'stock', 'travel', 'Holiday Inn, InterContinental and Kimpton.'],
  ['ABNB', 'Airbnb', 'stock', 'travel', 'Homes and experiences to rent around the world.'],
  ['BKNG', 'Booking Holdings', 'stock', 'travel', 'Booking.com, Priceline, Kayak and OpenTable.'],
  ['RCL', 'Royal Caribbean', 'stock', 'travel', 'Cruise ships, including the biggest ones afloat.'],
  ['KO', 'Coca-Cola', 'stock', 'food', 'Coke, Sprite, Dasani and Minute Maid. Has raised its dividend 60+ years in a row.'],
  ['PEP', 'PepsiCo', 'stock', 'food', 'Pepsi, Gatorade, Doritos and Cheetos.'],
  ['MCD', 'McDonald’s', 'stock', 'food', 'About 40,000 restaurants worldwide.'],
  ['SBUX', 'Starbucks', 'stock', 'food', 'Coffee shops in about 80 countries.'],
  ['CMG', 'Chipotle', 'stock', 'food', 'Burritos and bowls.'],
  ['DPZ', 'Domino’s Pizza', 'stock', 'food', 'The world’s biggest pizza chain.'],
  ['COST', 'Costco', 'stock', 'food', 'Membership warehouse stores.'],
  ['WMT', 'Walmart', 'stock', 'food', 'The world’s biggest store chain.'],
  ['TGT', 'Target', 'stock', 'food', 'Department stores across the US.'],
  ['NKE', 'Nike', 'stock', 'food', 'Shoes and sportswear.'],
  ['LULU', 'Lululemon', 'stock', 'food', 'Yoga and running clothes.'],
  ['HD', 'Home Depot', 'stock', 'food', 'Tools, lumber and everything for home projects.'],
  ['JPM', 'JPMorgan Chase', 'stock', 'money', 'The biggest US bank, and Chase credit cards.'],
  ['V', 'Visa', 'stock', 'money', 'Its network handles a big share of the world’s card payments.'],
  ['MA', 'Mastercard', 'stock', 'money', 'The other big card network.'],
  ['PYPL', 'PayPal', 'stock', 'money', 'PayPal and Venmo.'],
  ['BRK-B', 'Berkshire Hathaway', 'stock', 'money', 'Warren Buffett’s company: Geico, BNSF railroad, See’s Candies and big stock holdings.'],
  ['JNJ', 'Johnson & Johnson', 'stock', 'health', 'Medicines and medical devices.'],
  ['LLY', 'Eli Lilly', 'stock', 'health', 'Medicines, including the newest weight-loss drugs.'],
  ['PFE', 'Pfizer', 'stock', 'health', 'Medicines and vaccines.'],
  ['UNH', 'UnitedHealth', 'stock', 'health', 'The biggest US health insurer.'],
  ['XOM', 'ExxonMobil', 'stock', 'energy', 'The biggest US oil company.'],
  ['CVX', 'Chevron', 'stock', 'energy', 'Oil, gas and gas stations.'],
  ['FCX', 'Freeport-McMoRan', 'stock', 'energy', 'Copper and gold mines, based in Phoenix.'],
  ['NEM', 'Newmont', 'stock', 'energy', 'The world’s biggest gold miner, based in Denver.'],
  ['BHP', 'BHP', 'stock', 'energy', 'The world’s biggest mining company: iron ore, copper and coal.'],
  ['RIO', 'Rio Tinto', 'stock', 'energy', 'Iron ore, aluminum and copper mines.'],
  ['CAT', 'Caterpillar', 'stock', 'energy', 'The big yellow machines that dig mines and build roads.'],
  ['F', 'Ford', 'stock', 'cars', 'F-150, Mustang and Bronco.'],
  ['GM', 'General Motors', 'stock', 'cars', 'Chevrolet, GMC, Cadillac and Buick.'],
  ['TM', 'Toyota', 'stock', 'cars', 'The world’s biggest carmaker (shares from Japan, traded in the US).'],
  ['BTC-USD', 'Bitcoin', 'coin', 'crypto', 'The first cryptocurrency. Trades every day, all day, and swings hard.'],
  ['ETH-USD', 'Ethereum', 'coin', 'crypto', 'The second-biggest cryptocurrency, and a platform for apps.'],
];
const RATES = { irx: '^IRX', fvx: '^FVX', tnx: '^TNX', tyx: '^TYX' };   // 13-week, 5-, 10-, 30-year Treasury yields (%)
const INDEX = { spx: ['^GSPC', 'S&P 500'], dji: ['^DJI', 'Dow'], ixic: ['^IXIC', 'Nasdaq'] };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchText(url, opt) {
  const r = await fetch(url, Object.assign({ headers: UA }, opt));
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.split('?')[0]);
  return r.text();
}
const r2 = (n) => Math.round(n * 100) / 100, r4 = (n) => Math.round(n * 10000) / 10000;
const day = (ms) => new Date(ms).toISOString().slice(0, 10);

// Yahoo: a year of daily closes, the latest price, and dividends
async function yahoo(sym) {
  const j = JSON.parse(await fetchText('https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?range=1y&interval=1d&events=div&includePrePost=false'));
  const res = j.chart && j.chart.result && j.chart.result[0];
  if (!res || !res.meta) throw new Error('no chart');
  const m = res.meta, ts = res.timestamp || [], cl = ((res.indicators || {}).quote || [{}])[0].close || [];
  const hist = [];
  ts.forEach((t, i) => { if (cl[i] != null && isFinite(cl[i])) hist.push([day(t * 1000), cl[i]]); });
  if (!hist.length || !isFinite(m.regularMarketPrice)) throw new Error('no prices');
  const dv = Object.values((res.events || {}).dividends || {}).map((d) => [day(d.date * 1000), r4(d.amount)]).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const at = (m.regularMarketTime || ts[ts.length - 1]) * 1000;
  // the latest price stands in for today's close until the day is over
  if (hist[hist.length - 1][0] !== day(at)) hist.push([day(at), m.regularMarketPrice]); else hist[hist.length - 1][1] = m.regularMarketPrice;
  return { p: m.regularMarketPrice, pc: hist.length > 1 ? hist[hist.length - 2][1] : m.chartPreviousClose, at, hist, dv, src: 'y' };
}
// Stooq (no dividends): daily history as CSV
async function stooq(sym) {
  const s = sym.replace('-USD', '').toLowerCase().replace('-', '.') + (/-USD$/.test(sym) ? '.v' : '.us');
  const csv = await fetchText('https://stooq.com/q/d/l/?s=' + encodeURIComponent(s) + '&i=d');
  const rows = csv.trim().split('\n').slice(1).map((l) => l.split(',')).filter((c) => c.length >= 5 && isFinite(+c[4]));
  if (rows.length < 20) throw new Error('stooq: no rows');
  const hist = rows.slice(-260).map((c) => [c[0], +c[4]]);
  const last = hist[hist.length - 1];
  return { p: last[1], pc: hist[hist.length - 2][1], at: Date.parse(last[0] + 'T21:00:00Z'), hist, dv: [], src: 's' };
}
async function quote(sym) {
  try { return await yahoo(sym); } catch (e) { console.log('  yahoo ' + sym + ': ' + e.message); }
  try { return await stooq(sym); } catch (e) { console.log('  stooq ' + sym + ': ' + e.message); }
  return null;
}

async function token(key) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: key.client_email, scope: 'https://www.googleapis.com/auth/devstorage.read_write', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = crypto.createSign('RSA-SHA256').update(body).sign(key.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + body + '.' + sig });
  return (await r.json()).access_token;
}

(async () => {
  let old = {};
  try { old = JSON.parse(await fetchText('https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o/' + encodeURIComponent(OBJ) + '?alt=media')); } catch (e) { console.log('no saved file yet'); }
  const out = { v: 1, at: Date.now(), q: {}, rates: {}, idx: {} }, fails = [];
  for (const [sym, name, kind, group, about] of LIST) {
    const q = await quote(sym);
    const prev = old.q && old.q[sym];
    if (!q) { fails.push(sym); if (prev) out.q[sym] = prev; await sleep(300); continue; }
    // closes (oldest first), each with its date as days after the first one (d0); dividends as [date, amount]
    const t0 = Date.parse(q.hist[0][0]);
    out.q[sym] = { n: name, k: kind, g: group, a: about, p: r4(q.p), pc: r4(q.pc), at: q.at, d0: q.hist[0][0], h: q.hist.map((x) => r2(x[1])), o: q.hist.map((x) => Math.round((Date.parse(x[0]) - t0) / 864e5)), dv: q.dv.length ? q.dv : (prev && prev.dv) || [] };
    await sleep(250);
  }
  for (const k in RATES) { const q = await quote(RATES[k]); if (q) out.rates[k] = r4(q.p); else if (old.rates) out.rates[k] = old.rates[k]; await sleep(250); }
  for (const k in INDEX) { const q = await quote(INDEX[k][0]); if (q) out.idx[k] = { n: INDEX[k][1], p: r2(q.p), pc: r2(q.pc), h: q.hist.slice(-30).map((x) => r2(x[1])) }; else if (old.idx) out.idx[k] = old.idx[k]; await sleep(250); }
  // the market's own time for the stock prices (the latest of them)
  out.asof = Math.max.apply(null, Object.keys(out.q).filter((s) => out.q[s].k !== 'coin').map((s) => out.q[s].at || 0));
  console.log(Object.keys(out.q).length + ' symbols, ' + fails.length + ' not fetched' + (fails.length ? ': ' + fails.join(' ') : '') + '; rates ' + JSON.stringify(out.rates));
  if (fails.length > LIST.length / 2) throw new Error('too many symbols failed; leaving the saved prices as they are');
  const text = JSON.stringify(out);
  if (process.env.DRY) { console.log(text.length + ' bytes'); return; }
  const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null');
  if (!key) throw new Error('no service account');
  const auth = { Authorization: 'Bearer ' + (await token(key)) };
  const bd = 'b' + crypto.randomBytes(8).toString('hex');
  const meta = JSON.stringify({ name: OBJ, contentType: 'application/json', cacheControl: 'no-cache, max-age=0' });
  const body = '--' + bd + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + bd + '\r\nContent-Type: application/json\r\n\r\n' + text + '\r\n--' + bd + '--';
  const r = await fetch('https://storage.googleapis.com/upload/storage/v1/b/' + BUCKET + '/o?uploadType=multipart&fields=name', { method: 'POST', headers: Object.assign({ 'Content-Type': 'multipart/related; boundary=' + bd }, auth), body });
  if (!r.ok) throw new Error('upload HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
  console.log('Saved ' + OBJ + ' (' + text.length + ' bytes)');
})().catch((e) => { console.error(e.message || e); process.exit(1); });
