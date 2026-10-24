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
  const r = await fetch(url, Object.assign({ headers: UA, signal: AbortSignal.timeout(12000) }, opt));
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url.split('?')[0]);
  return r.text();
}
const r2 = (n) => Math.round(n * 100) / 100, r4 = (n) => Math.round(n * 10000) / 10000;
const day = (ms) => new Date(ms).toISOString().slice(0, 10);

// Each source returns { p: latest price, pc: previous close, at: ms, hist: [[YYYY-MM-DD, close]], dv: [[YYYY-MM-DD, amount]] }.
// Free sources come and go (and some refuse cloud servers), so several are tried; the first run logs which answer.
let ycookie = '', ycrumb = '';
async function yahooAuth() {
  if (ycrumb) return;
  const r = await fetch('https://fc.yahoo.com/', { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(12000) }).catch(() => null);
  const sc = r && r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  ycookie = sc.map((c) => c.split(';')[0]).join('; ');
  ycrumb = (await fetchText('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: Object.assign({ Cookie: ycookie }, UA) })).trim();
  if (!ycrumb || ycrumb.length > 30) throw new Error('no crumb');
}
async function yahoo(sym) {
  await yahooAuth();
  const j = JSON.parse(await fetchText('https://query2.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(sym) + '?range=1y&interval=1d&events=div&crumb=' + encodeURIComponent(ycrumb), { headers: Object.assign({ Cookie: ycookie }, UA) }));
  const res = j.chart && j.chart.result && j.chart.result[0];
  if (!res || !res.meta) throw new Error('no chart');
  const m = res.meta, ts = res.timestamp || [], cl = ((res.indicators || {}).quote || [{}])[0].close || [];
  const hist = [];
  ts.forEach((t, i) => { if (cl[i] != null && isFinite(cl[i])) hist.push([day(t * 1000), cl[i]]); });
  if (!hist.length || !isFinite(m.regularMarketPrice)) throw new Error('no prices');
  const dv = Object.values((res.events || {}).dividends || {}).map((d) => [day(d.date * 1000), r4(d.amount)]).sort((a, b) => a[0] < b[0] ? -1 : 1);
  const at = (m.regularMarketTime || ts[ts.length - 1]) * 1000;
  if (hist[hist.length - 1][0] !== day(at)) hist.push([day(at), m.regularMarketPrice]); else hist[hist.length - 1][1] = m.regularMarketPrice;
  return { p: m.regularMarketPrice, pc: hist.length > 1 ? hist[hist.length - 2][1] : m.chartPreviousClose, at, hist, dv };
}
// Nasdaq's site API: a year of closes, the latest sale and dividends
const NQ = { Accept: 'application/json, text/plain, */*', 'User-Agent': UA['User-Agent'], Origin: 'https://www.nasdaq.com', Referer: 'https://www.nasdaq.com/' };
const num = (s) => parseFloat(String(s == null ? '' : s).replace(/[$,%\s]/g, ''));
const mdy = (s) => { const m = String(s).match(/(\d+)\/(\d+)\/(\d{4})/); return m ? m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2) : null; };
async function nasdaq(sym, kind) {
  const ac = kind === 'stock' ? 'stocks' : 'etf', s = sym.replace('-', '.');
  const to = day(Date.now()), from = day(Date.now() - 370 * 864e5);
  const hj = JSON.parse(await fetchText('https://api.nasdaq.com/api/quote/' + encodeURIComponent(s) + '/historical?assetclass=' + ac + '&fromdate=' + from + '&todate=' + to + '&limit=400', { headers: NQ }));
  const rows = (((hj.data || {}).tradesTable || {}).rows || []).map((r) => [mdy(r.date), num(r.close)]).filter((r) => r[0] && isFinite(r[1])).reverse();
  if (rows.length < 20) throw new Error('nasdaq: ' + JSON.stringify(hj).slice(0, 160));
  let p = rows[rows.length - 1][1], pc = rows[rows.length - 2][1], at = Date.parse(rows[rows.length - 1][0] + 'T20:00:00Z');
  try {
    const ij = JSON.parse(await fetchText('https://api.nasdaq.com/api/quote/' + encodeURIComponent(s) + '/info?assetclass=' + ac, { headers: NQ }));
    const pd = (ij.data || {}).primaryData || {}, lp = num(pd.lastSalePrice), ch = num(pd.netChange);
    if (isFinite(lp) && lp > 0) {
      p = lp; if (isFinite(ch)) pc = r4(lp - ch); at = marketOpen() ? Date.now() : lastClose();
      if (rows[rows.length - 1][0] === day(Date.now())) rows[rows.length - 1][1] = lp; else rows.push([day(Date.now()), lp]);
    }
  } catch (e) {}
  let dv = [];
  try {
    const dj = JSON.parse(await fetchText('https://api.nasdaq.com/api/quote/' + encodeURIComponent(s) + '/dividends?assetclass=' + ac, { headers: NQ }));
    if (sym === 'KO') console.log('dividends sample: ' + JSON.stringify(dj).slice(0, 400));
    dv = ((((dj.data || {}).dividends || {}).rows) || []).map((r) => [mdy(r.exOrEffDate), r4(num(r.amount))]).filter((d) => d[0] && d[1] > 0 && d[0] >= from).sort((a, b) => a[0] < b[0] ? -1 : 1);
  } catch (e) { if (sym === 'KO') console.log('dividends: ' + e.message); }
  return { p, pc, at, hist: rows.slice(-260), dv };
}
// CNBC: the latest quote only (history then comes from the saved file)
async function cnbc(sym, kind, prev) {
  const s = sym === 'BRK-B' ? 'BRK.B' : sym;
  const j = JSON.parse(await fetchText('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=' + encodeURIComponent(s) + '&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=0&output=json'));
  const q = (((j.FormattedQuoteResult || {}).FormattedQuote) || [])[0];
  const p = q && num(q.last), pc = q && num(q.previous_day_closing);
  if (!isFinite(p) || p <= 0) throw new Error('cnbc: ' + JSON.stringify(j).slice(0, 160));
  const hist = prev && prev.h ? prev.h.map((v, i) => [day(Date.parse(prev.d0) + (prev.o ? prev.o[i] : i) * 864e5), v]) : [];
  if (hist.length && hist[hist.length - 1][0] === day(Date.now())) hist[hist.length - 1][1] = p; else hist.push([day(Date.now()), p]);
  return { p, pc: isFinite(pc) ? pc : p, at: marketOpen() ? Date.now() : lastClose(), hist: hist.slice(-260), dv: (prev && prev.dv) || [] };
}
// CoinGecko for Bitcoin and Ethereum
async function gecko(sym) {
  const id = { 'BTC-USD': 'bitcoin', 'ETH-USD': 'ethereum' }[sym];
  const j = JSON.parse(await fetchText('https://api.coingecko.com/api/v3/coins/' + id + '/market_chart?vs_currency=usd&days=365&interval=daily'));
  const pr = (j.prices || []).filter((x) => isFinite(x[1]));
  if (pr.length < 20) throw new Error('gecko: ' + JSON.stringify(j).slice(0, 160));
  const byDay = {}; pr.forEach((x) => { byDay[day(x[0])] = x[1]; });
  const hist = Object.keys(byDay).sort().map((d) => [d, byDay[d]]);
  return { p: hist[hist.length - 1][1], pc: hist[hist.length - 2][1], at: pr[pr.length - 1][0], hist: hist.slice(-260), dv: [] };
}
// The US Treasury's own daily yield curve
async function treasury() {
  const y = new Date().getFullYear(), out = {};
  for (const yr of [y, y - 1]) {
    const csv = await fetchText('https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/' + yr + '/all?type=daily_treasury_yield_curve&field_tdr_date_value=' + yr + '&page&_format=csv');
    const lines = csv.trim().split(/\r?\n/), head = lines[0].split(',').map((h) => h.replace(/"/g, '').trim());
    const row = lines[1] && lines[1].split(',').map((c) => c.replace(/"/g, '').trim());
    if (!row) continue;
    const col = (n) => { const i = head.indexOf(n); return i >= 0 ? parseFloat(row[i]) : NaN; };
    out.irx = col('3 Mo'); out.fvx = col('5 Yr'); out.tnx = col('10 Yr'); out.tyx = col('30 Yr'); out.date = row[0];
    if (isFinite(out.tnx)) return out;
  }
  throw new Error('treasury: no rows');
}
// New York time: is the market open, and when was the last close (4 PM on the latest weekday)
function ny(t) { const o = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(t)).forEach((x) => { o[x.type] = x.value; }); return o; }
function marketOpen() { const o = ny(Date.now()), m = (+o.hour % 24) * 60 + +o.minute; return !/Sat|Sun/.test(o.weekday) && m >= 570 && m < 960; }
function lastClose() {
  for (let d = 0; d < 7; d++) {
    const t = Date.now() - d * 864e5, o = ny(t), m = (+o.hour % 24) * 60 + +o.minute;
    if (/Sat|Sun/.test(o.weekday) || (d === 0 && m < 960)) continue;
    // 4 PM New York that day: try both offsets and keep the one that reads 16:00 there
    for (const off of ['-04:00', '-05:00']) { const c = Date.parse(o.year + '-' + o.month + '-' + o.day + 'T16:00:00' + off), q = ny(c); if (+q.hour === 16) return c; }
  }
  return Date.now();
}
const SOURCES = { yahoo, nasdaq, cnbc };
let ORDER = ['nasdaq', 'yahoo', 'cnbc'];
async function quote(sym, kind, prev) {
  if (kind === 'coin') { try { return await gecko(sym); } catch (e) { console.log('  gecko ' + sym + ': ' + e.message); } }
  for (const src of ORDER) {
    try { return await SOURCES[src](sym, kind === 'coin' ? 'stock' : kind, prev); } catch (e) { console.log('  ' + src + ' ' + sym + ': ' + e.message.slice(0, 200)); }
  }
  return null;
}
// which sources answer today (tried with Apple), best first
async function probe() {
  const ok = [];
  for (const src of ORDER) { try { const q = await SOURCES[src]('AAPL', 'stock', null); console.log('source ' + src + ': ok, AAPL ' + q.p + ', ' + q.hist.length + ' days'); ok.push(src); } catch (e) { console.log('source ' + src + ': ' + e.message.slice(0, 200)); } }
  ORDER = ok.concat(ORDER.filter((s) => ok.indexOf(s) < 0));
  try { console.log('cnbc KO: ' + (await fetchText('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=KO|BND&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=0&output=json')).slice(0, 2500)); } catch (e) { console.log('cnbc KO: ' + e.message); }
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
  await probe();
  const jobs = LIST.slice();
  async function worker() { while (jobs.length) { const [sym, name, kind, group, about] = jobs.shift(); await one(sym, name, kind, group, about); } }
  async function one(sym, name, kind, group, about) {
    const prev = old.q && old.q[sym];
    const q = await quote(sym, kind, prev);
    if (!q) { fails.push(sym); if (prev) out.q[sym] = prev; return; }
    // closes (oldest first), each with its date as days after the first one (d0); dividends as [date, amount]
    const t0 = Date.parse(q.hist[0][0]);
    out.q[sym] = { n: name, k: kind, g: group, a: about, p: r4(q.p), pc: r4(q.pc), at: q.at, d0: q.hist[0][0], h: q.hist.map((x) => r2(x[1])), o: q.hist.map((x) => Math.round((Date.parse(x[0]) - t0) / 864e5)), dv: q.dv.length ? q.dv : (prev && prev.dv) || [] };
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  // the list's own order (the game shows groups in this order)
  const ordered = {}; LIST.forEach((x) => { if (out.q[x[0]]) ordered[x[0]] = out.q[x[0]]; }); out.q = ordered;
  try { const t = await treasury(); ['irx', 'fvx', 'tnx', 'tyx'].forEach((k) => { if (isFinite(t[k])) out.rates[k] = t[k]; }); out.rates.date = t.date; console.log('Treasury yields ' + JSON.stringify(t)); }
  catch (e) { console.log('treasury: ' + e.message); for (const k in RATES) { try { const q = await yahoo(RATES[k]); out.rates[k] = r4(q.p); } catch (e2) { if (old.rates) out.rates[k] = old.rates[k]; } } }
  for (const k in INDEX) {
    let q = null; try { q = await yahoo(INDEX[k][0]); } catch (e) { try { q = await cnbc({ '^GSPC': '.SPX', '^DJI': '.DJI', '^IXIC': '.IXIC' }[INDEX[k][0]], 'stock', old.idx && old.idx[k] && null); } catch (e2) { console.log('  index ' + k + ': ' + e2.message.slice(0, 120)); } }
    if (q) out.idx[k] = { n: INDEX[k][1], p: r2(q.p), pc: r2(q.pc) }; else if (old.idx && old.idx[k]) out.idx[k] = old.idx[k];
    await sleep(250);
  }
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
