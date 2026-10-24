#!/usr/bin/env node
// The Stock Market game's prices (games/stocks.html). Twice each weekday (market-data.yml, around midday and after
// the close in New York) this gets a year of daily closes, the latest price and the year's dividends for every
// stock, fund and coin the game trades, plus Treasury yields and the three big indexes, from Yahoo Finance (Stooq
// when Yahoo won't answer), and saves them to Firebase Storage market/quotes.json (public), which the game reads.
// A symbol that can't be fetched keeps its last saved prices.
//   FIREBASE_SERVICE_ACCOUNT='{...json key...}' node scripts/market-data.js        (DRY=1: print, don't save)
const crypto = require('crypto'), zlib = require('zlib');
const BUCKET = 'familygames-da3e5.firebasestorage.app', OBJ = 'market/quotes.json';
// The long view (5 years and all time) for the charts, refreshed once a day: market/history.json
const OBJ2 = 'market/q2.json', AOBJ = 'market/all.json', DDIR = 'market/d/';   // every US stock and ETF (price only); one file per symbol with the full picture
const TOP = 500;   // the biggest companies by value get the full picture
// popular funds beyond the hand-picked ones: [symbol, name, kind]
const FUNDS = [['IVV', 'iShares Core S&P 500 ETF'], ['RSP', 'Invesco S&P 500 Equal Weight ETF'], ['VUG', 'Vanguard Growth ETF'], ['VTV', 'Vanguard Value ETF'], ['SCHB', 'Schwab US Broad Market ETF'],
  ['SCHX', 'Schwab US Large-Cap ETF'], ['VB', 'Vanguard Small-Cap ETF'], ['VO', 'Vanguard Mid-Cap ETF'], ['IJH', 'iShares Core S&P Mid-Cap ETF'], ['IJR', 'iShares Core S&P Small-Cap ETF'],
  ['VEA', 'Vanguard Developed Markets ETF'], ['VWO', 'Vanguard Emerging Markets ETF'], ['IEFA', 'iShares Core MSCI EAFE ETF'], ['IEMG', 'iShares Core MSCI Emerging Markets ETF'], ['EFA', 'iShares MSCI EAFE ETF'],
  ['VIG', 'Vanguard Dividend Appreciation ETF'], ['VYM', 'Vanguard High Dividend Yield ETF'], ['JEPI', 'JPMorgan Equity Premium Income ETF'], ['DGRO', 'iShares Core Dividend Growth ETF'],
  ['VGT', 'Vanguard Information Technology ETF'], ['SMH', 'VanEck Semiconductor ETF'], ['SOXX', 'iShares Semiconductor ETF'], ['XLF', 'Financial Select Sector SPDR'], ['XLV', 'Health Care Select Sector SPDR'],
  ['XLY', 'Consumer Discretionary Select Sector SPDR'], ['XLP', 'Consumer Staples Select Sector SPDR'], ['XLI', 'Industrial Select Sector SPDR'], ['XLU', 'Utilities Select Sector SPDR'], ['XLB', 'Materials Select Sector SPDR'],
  ['XLRE', 'Real Estate Select Sector SPDR'], ['XLC', 'Communication Services Select Sector SPDR'], ['ARKK', 'ARK Innovation ETF'], ['IWF', 'iShares Russell 1000 Growth ETF'], ['IWD', 'iShares Russell 1000 Value ETF'],
  ['IAU', 'iShares Gold Trust'], ['SLV', 'iShares Silver Trust'], ['USO', 'United States Oil Fund'],
  ['BIL', 'SPDR 1-3 Month T-Bill ETF', 'bond', 'bondfund'], ['SGOV', 'iShares 0-3 Month Treasury Bond ETF', 'bond', 'bondfund'], ['IEF', 'iShares 7-10 Year Treasury Bond ETF', 'bond', 'bondfund'],
  ['VCIT', 'Vanguard Intermediate-Term Corporate Bond ETF', 'bond', 'bondfund'], ['VCSH', 'Vanguard Short-Term Corporate Bond ETF', 'bond', 'bondfund'], ['BNDX', 'Vanguard Total International Bond ETF', 'bond', 'bondfund']];
// coins (Coinbase): [symbol, name, about]
const COINS = [['BTC-USD', 'Bitcoin', 'The first cryptocurrency. Trades every day, all day, and swings hard.'], ['ETH-USD', 'Ethereum', 'The network most crypto apps and tokens run on.'],
  ['SOL-USD', 'Solana', 'A fast network for apps and payments.'], ['XRP-USD', 'XRP', 'Built for moving money between banks and countries.'], ['DOGE-USD', 'Dogecoin', 'Started as a joke about a Shiba Inu dog.'],
  ['ADA-USD', 'Cardano', 'A network built step by step from research papers.'], ['AVAX-USD', 'Avalanche', 'A network of many linked blockchains.'], ['LINK-USD', 'Chainlink', 'Feeds real-world data, like prices, to blockchains.'],
  ['LTC-USD', 'Litecoin', 'An early copy of Bitcoin with faster payments.'], ['DOT-USD', 'Polkadot', 'Connects separate blockchains to each other.'], ['BCH-USD', 'Bitcoin Cash', 'A 2017 split from Bitcoin aimed at everyday payments.'],
  ['XLM-USD', 'Stellar', 'Cheap payments across borders.'], ['SHIB-USD', 'Shiba Inu', 'A meme coin inspired by Dogecoin.'], ['UNI-USD', 'Uniswap', 'Trading crypto without a company in the middle.'], ['AAVE-USD', 'Aave', 'Lending and borrowing crypto.']];
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
    dv = ((((dj.data || {}).dividends || {}).rows) || []).map((r) => [mdy(r.exOrEffDate), r4(num(r.amount))]).filter((d) => d[0] && d[1] > 0 && d[0] >= from).sort((a, b) => a[0] < b[0] ? -1 : 1);
  } catch (e) {}
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
// ── The whole US market (Nasdaq's stock screener): every listed stock and ETF in one request each ──
// Sectors as Nasdaq names them, kept as short codes
const SECT = { 'Technology': 'tech', 'Health Care': 'health', 'Finance': 'fin', 'Consumer Discretionary': 'disc', 'Consumer Staples': 'stap', 'Industrials': 'ind', 'Energy': 'energy', 'Real Estate': 're', 'Utilities': 'util', 'Basic Materials': 'mat', 'Telecommunications': 'tel', 'Miscellaneous': 'misc' };
// "Apple Inc. Common Stock" → "Apple"
function cleanName(n) {
  n = String(n || '').replace(/\s+/g, ' ').trim();
  n = n.replace(/\s+(Class [A-C] )?(Common Stock|Ordinary Shares|Common Shares|Capital Stock|Subordinate Voting Shares)\b.*$/i, '')
    .replace(/\s+American Depositary (Shares|Receipts?)\b.*$/i, '').replace(/\s+ADS\b.*$/, '')
    .replace(/,?\s+(Inc\.?|Incorporated|Corporation|Corp\.?|Company|Co\.|Ltd\.?|Limited|PLC|plc|N\.V\.|S\.A\.|AG|SE|Holdings?|Group)$/i, '')
    .replace(/,?\s+(Inc\.?|Corporation|Corp\.?|Ltd\.?|Holdings?)$/i, '').replace(/[,.]$/, '').trim();
  return n;
}
function findRows(o, depth) {   // the screener's rows, wherever they sit in the answer
  if (!o || depth > 4) return null;
  if (Array.isArray(o)) return o.length && o[0] && o[0].symbol ? o : null;
  if (typeof o === 'object') for (const k of Object.keys(o)) { const r = findRows(o[k], (depth || 0) + 1); if (r) return r; }
  return null;
}
async function screener() {
  const out = [];
  const sj = JSON.parse(await fetchText('https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=25000&offset=0&download=true', { headers: NQ }));
  (findRows(sj) || []).forEach((r) => {
    const sym = String(r.symbol || '').trim(), p = num(r.lastsale), ch = num(r.netchange), cap = num(r.marketCap);
    // shares only: no warrants, rights, units or preferred stock
    if (!/^[A-Z]{1,5}$/.test(sym) || !(p > 0) || /\b(Warrants?|Rights?|Units?|Preferred|Depositary Shares, each|Notes due|Debentures)\b/i.test(r.name || '')) return;
    out.push({ sym, name: cleanName(r.name), p, pc: isFinite(ch) ? r4(p - ch) : p, sec: SECT[r.sector] || 'misc', cap: cap > 0 ? cap : 0, k: 's' });
  });
  let etfs = 0;
  try {
    const ej = JSON.parse(await fetchText('https://api.nasdaq.com/api/screener/etf?download=true', { headers: NQ }));
    (findRows(ej) || []).forEach((r) => {
      const sym = String(r.symbol || '').trim(), p = num(r.lastSalePrice || r.lastsale), ch = num(r.netChange || r.netchange);
      if (!/^[A-Z]{1,5}$/.test(sym) || !(p > 0)) return;
      out.push({ sym, name: cleanName(r.companyName || r.name), p, pc: isFinite(ch) ? r4(p - ch) : p, sec: 'fund', cap: 0, k: 'f' }); etfs++;
    });
  } catch (e) { console.log('etf screener: ' + e.message.slice(0, 160)); }
  if (out.length < 3000) throw new Error('screener: only ' + out.length + ' rows');
  console.log('screener: ' + (out.length - etfs) + ' stocks, ' + etfs + ' ETFs');
  return out;
}

// ── What the family owns or watches (each account's Stock Market keys, read with the service account) ──
async function ownedSymbols(key) {
  const tok = await token(key, 'https://www.googleapis.com/auth/datastore');
  const base = 'https://firestore.googleapis.com/v1/projects/familygames-da3e5/databases/(default)/documents', h = { Authorization: 'Bearer ' + tok };
  const pins = []; let page = '';
  for (let i = 0; i < 20; i++) {
    const j = JSON.parse(await fetchText(base + '/pins?showMissing=true&pageSize=300' + (page ? '&pageToken=' + encodeURIComponent(page) : ''), { headers: h }));
    (j.documents || []).forEach((d) => pins.push(d.name.split('/').pop()));
    if (!j.nextPageToken) break; page = j.nextPageToken;
  }
  const syms = {};
  for (const pin of pins) {
    for (const k of ['mk_acct', 'mk_watch']) {
      try {
        const d = JSON.parse(await fetchText(base + '/pins/' + pin + '/st/' + k, { headers: h })), v = d.fields && d.fields.v && d.fields.v.stringValue;
        if (!v) continue;
        const o = JSON.parse(v);
        if (k === 'mk_watch') (Array.isArray(o) ? o : []).forEach((s) => { syms[s] = 1; });
        else ['lots', 'opts', 'orders'].forEach((f) => (o[f] || []).forEach((x) => { if (x && x.sym) syms[x.sym] = 1; }));
      } catch (e) {}
    }
  }
  console.log('owned or watched: ' + Object.keys(syms).length + ' symbols across ' + pins.length + ' accounts');
  return Object.keys(syms).filter((s) => /^[A-Z.\-]{1,10}$/.test(s));
}

// ── Coins: Coinbase's public daily candles, back as far as they go (300 days a request) ──
async function coinDays(sym, all) {
  const byDay = {};
  for (let end = Date.now(), k = 0; k < (all ? 14 : 1); k++, end -= 300 * 864e5) {
    let rows = [];
    try { rows = JSON.parse(await fetchText('https://api.exchange.coinbase.com/products/' + sym + '/candles?granularity=86400&start=' + new Date(end - 300 * 864e5).toISOString() + '&end=' + new Date(end).toISOString())); } catch (e) { if (!k) throw e; break; }
    if (!Array.isArray(rows) || !rows.length) break;
    rows.forEach((c) => { if (isFinite(c[4]) && c[4] > 0) byDay[day(c[0] * 1000)] = c[4]; });   // [time, low, high, open, close, volume]
    await sleep(300);
  }
  return Object.keys(byDay).sort().map((d) => [d, byDay[d]]);
}

// ── Ten years of daily closes from Nasdaq (all it keeps) ──
async function nasdaqYears(sym, kind) {
  const ac = kind === 'stock' ? 'stocks' : 'etf', s = sym.replace('-', '.');
  const hj = JSON.parse(await fetchText('https://api.nasdaq.com/api/quote/' + encodeURIComponent(s) + '/historical?assetclass=' + ac + '&fromdate=' + day(Date.now() - 10.1 * 365.25 * 864e5) + '&todate=' + day(Date.now()) + '&limit=9999', { headers: NQ }));
  const rows = (((hj.data || {}).tradesTable || {}).rows || []).map((r) => [mdy(r.date), num(r.close)]).filter((r) => r[0] && isFinite(r[1]) && r[1] > 0).reverse();
  if (rows.length < 5) throw new Error('nasdaq: ' + rows.length + ' rows');
  return rows;
}
async function nasdaqDividends(sym, kind) {
  const ac = kind === 'stock' ? 'stocks' : 'etf', s = sym.replace('-', '.'), from = day(Date.now() - 370 * 864e5);
  const dj = JSON.parse(await fetchText('https://api.nasdaq.com/api/quote/' + encodeURIComponent(s) + '/dividends?assetclass=' + ac, { headers: NQ }));
  return ((((dj.data || {}).dividends || {}).rows) || []).map((r) => [mdy(r.exOrEffDate), r4(num(r.amount))]).filter((d) => d[0] && d[1] > 0 && d[0] >= from).sort((a, b) => a[0] < b[0] ? -1 : 1);
}
// Thinned for a chart: the last close of each week for the past five years, of each month before that
function thin(rows) {
  const cut = day(Date.now() - 5 * 365.25 * 864e5), out = [];
  const key = (d) => d < cut ? d.slice(0, 7) : (() => { const t = Date.parse(d + 'T12:00:00Z'); return 'w' + Math.floor((t / 864e5 + 3) / 7); })();
  rows.forEach((r, i) => { const nx = rows[i + 1]; if (!nx || key(nx[0]) !== key(r[0])) out.push(r); });
  return out;
}
function packed(rows) {
  const t0 = Date.parse(rows[0][0]);
  return { d0: rows[0][0], h: rows.map((x) => r2(x[1])), o: rows.map((x) => Math.round((Date.parse(x[0]) - t0) / 864e5)) };
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
async function token(key, scope) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: key.client_email, scope: scope || 'https://www.googleapis.com/auth/devstorage.read_write', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = crypto.createSign('RSA-SHA256').update(body).sign(key.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + body + '.' + sig });
  return (await r.json()).access_token;
}

const KEY = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null');
const isCoin = (s) => /-USD$/.test(s);
const stored = (obj) => 'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o/' + encodeURIComponent(obj) + '?alt=media';

(async () => {
  let old = {};
  try { old = JSON.parse(await fetchText(stored(OBJ2))); } catch (e) { try { old = JSON.parse(await fetchText(stored(OBJ))); } catch (e2) { console.log('no saved file yet'); } }
  const now = Date.now(), at = marketOpen() ? now : lastClose();
  // 1. The whole market, and what the family holds
  const U = await screener().catch((e) => { console.log('screener: ' + e.message.slice(0, 200)); return null; });
  const uBy = {}; (U || []).forEach((r) => { uBy[r.sym] = r; });
  const own = KEY ? await ownedSymbols(KEY).catch((e) => { console.log('owned: ' + e.message.slice(0, 160)); return []; }) : [];
  // 2. The symbols with the full picture (a year of prices, dividends, the long view): the hand-picked list, popular
  //    funds, the biggest companies, and anything anyone owns or watches. [sym, name, kind, group, about]
  const deep = [], seen = {};
  const add = (s, n, k, g, a) => { if (seen[s] || isCoin(s)) return; seen[s] = 1; deep.push([s, n, k, g || '', a || '']); };
  LIST.forEach((x) => add(x[0], x[1], x[2], x[3], x[4]));
  FUNDS.forEach((x) => add(x[0], x[1], x[2] || 'fund', x[3] || 'etf', ''));
  if (U) U.filter((r) => r.k === 's' && r.cap > 0).sort((a, b) => b.cap - a.cap).slice(0, TOP).forEach((r) => add(r.sym, r.name, 'stock'));
  own.forEach((s) => { const r = uBy[s]; if (r) add(s, r.name, r.k === 'f' ? 'fund' : 'stock'); else if (old.q && old.q[s]) add(s, old.q[s].n, old.q[s].k, old.q[s].g, old.q[s].a); });
  if (!U && old.q) Object.keys(old.q).forEach((s) => { const q = old.q[s]; add(s, q.n, q.k, q.g, q.a); });   // (no screener today: last time's list)
  console.log('full picture for ' + deep.length + ' symbols plus ' + COINS.length + ' coins');

  const out = { v: 2, at: now, q: {}, rates: {}, idx: {} }, fails = [], details = {}, year = {};
  const jobs = deep.slice();
  async function one([sym, name, kind, group, about]) {
    const prev = old.q && old.q[sym], u = uBy[sym];
    let rows = null, dv = [];
    try { rows = await nasdaqYears(sym, kind === 'coin' ? 'stock' : kind); } catch (e) { console.log('  ' + sym + ': ' + e.message.slice(0, 120)); }
    try { dv = await nasdaqDividends(sym, kind); } catch (e) {}
    let p, pc;
    if (u) { p = u.p; pc = u.pc; }
    else if (rows && rows.length > 1) { p = rows[rows.length - 1][1]; pc = rows[rows.length - 2][1]; }
    else { try { const c = await cnbc(sym, kind, prev); p = c.p; pc = c.pc; } catch (e) {} }
    if (!(p > 0)) { fails.push(sym); if (prev) out.q[sym] = prev; return; }
    let hist = rows ? rows.slice(-253) : prev && prev.h ? prev.h.map((v, i) => [day(Date.parse(prev.d0) + (prev.o ? prev.o[i] : i) * 864e5), v]) : [];
    if (hist.length && hist[hist.length - 1][0] === day(now)) hist[hist.length - 1][1] = p; else if (marketOpen() || !rows) hist.push([day(now), p]);
    if (!hist.length) hist = [[day(now), p]];
    year[sym] = hist;
    const last = hist.slice(-30), d = packed(last);
    out.q[sym] = { n: name, k: kind, g: group || '', a: about || '', sec: u ? u.sec : (prev && prev.sec) || (kind === 'stock' ? 'misc' : 'fund'), cap: u ? Math.round(u.cap / 1e8) / 10 : (prev && prev.cap) || 0,
      p: r4(p), pc: r4(pc), at, d0: d.d0, h: d.h, o: d.o, dv: dv.length ? dv : (prev && prev.dv) || [] };
    if (rows && rows.length > 20) details[sym] = Object.assign({ v: 1, at: now, s: sym, dv: out.q[sym].dv, L: packed(thin(rows)) }, packed(hist));
  }
  async function worker() { while (jobs.length) { await one(jobs.shift()); await sleep(120); } }
  await Promise.all([worker(), worker(), worker(), worker()]);
  // coins
  for (const [sym, name, about] of COINS) {
    const prev = old.q && old.q[sym];
    try {
      const rows = await coinDays(sym, true);
      if (rows.length < 30) throw new Error(rows.length + ' days');
      const hist = rows.slice(-366), d = packed(hist.slice(-30)); year[sym] = hist.slice(-260);
      out.q[sym] = { n: name, k: 'coin', g: 'crypto', a: about, sec: 'crypto', cap: 0, p: r4(hist[hist.length - 1][1]), pc: r4(hist[hist.length - 2][1]), at: now, d0: d.d0, h: d.h, o: d.o, dv: [] };
      details[sym] = Object.assign({ v: 1, at: now, s: sym, dv: [], L: packed(thin(rows)) }, packed(hist));
    } catch (e) { console.log('  ' + sym + ': ' + e.message.slice(0, 120)); fails.push(sym); if (prev) out.q[sym] = prev; }
  }
  // Nasdaq only has dividend dates for Nasdaq-listed shares. For the rest, CNBC's yearly dividend is paid on the usual
  // schedule: four times a year (the 15th of March, June, September and December), bond funds on the 1st of each month.
  const need = Object.keys(out.q).filter((s) => out.q[s].k !== 'coin' && !(out.q[s].dv || []).length);
  for (let i = 0; i < need.length; i += 40) {
    try {
      const part = need.slice(i, i + 40), j = JSON.parse(await fetchText('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=' + encodeURIComponent(part.map((x) => x.replace('-', '.')).join('|')) + '&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=0&output=json'));
      (((j.FormattedQuoteResult || {}).FormattedQuote) || []).forEach((q, k) => {
        const sym = part[k], yr = num(q.dividend); if (!sym || !(yr > 0) || !out.q[sym]) return;
        const monthly = out.q[sym].k === 'bond', dv = [], nd = new Date();
        for (let m = 12; m >= 0; m--) {
          const d = new Date(Date.UTC(nd.getUTCFullYear(), nd.getUTCMonth() - m, monthly ? 1 : 15));
          if (d > nd || (!monthly && d.getUTCMonth() % 3 !== 2)) continue;
          dv.push([day(d.getTime()), r4(yr / (monthly ? 12 : 4))]);
        }
        out.q[sym].dv = dv; out.q[sym].dve = 1; if (details[sym]) details[sym].dv = dv;
      });
    } catch (e) { console.log('cnbc dividends: ' + e.message.slice(0, 160)); }
  }
  // the hand-picked list's order first (the game shows its groups in this order), then the rest by size
  const ordered = {};
  LIST.concat(COINS.map((c) => [c[0]])).forEach((x) => { if (out.q[x[0]]) ordered[x[0]] = out.q[x[0]]; });
  Object.keys(out.q).sort((a, b) => (out.q[b].cap || 0) - (out.q[a].cap || 0)).forEach((s) => { if (!ordered[s]) ordered[s] = out.q[s]; });
  out.q = ordered;
  try { const t = await treasury(); ['irx', 'fvx', 'tnx', 'tyx'].forEach((k) => { if (isFinite(t[k])) out.rates[k] = t[k]; }); out.rates.date = t.date; }
  catch (e) { console.log('treasury: ' + e.message); for (const k in RATES) { try { const q = await yahoo(RATES[k]); out.rates[k] = r4(q.p); } catch (e2) { if (old.rates) out.rates[k] = old.rates[k]; } } }
  for (const k in INDEX) {
    let q = null; try { q = await yahoo(INDEX[k][0]); } catch (e) { try { q = await cnbc({ '^GSPC': '.SPX', '^DJI': '.DJI', '^IXIC': '.IXIC' }[INDEX[k][0]], 'stock', null); } catch (e2) { console.log('  index ' + k + ': ' + e2.message.slice(0, 120)); } }
    if (q) out.idx[k] = { n: INDEX[k][1], p: r2(q.p), pc: r2(q.pc) }; else if (old.idx && old.idx[k]) out.idx[k] = old.idx[k];
    await sleep(250);
  }
  out.asof = Math.max.apply(null, Object.keys(out.q).filter((s) => out.q[s].k !== 'coin').map((s) => out.q[s].at || 0));
  console.log(Object.keys(out.q).length + ' symbols, ' + Object.keys(details).length + ' detail files, ' + fails.length + ' not fetched' + (fails.length ? ': ' + fails.slice(0, 40).join(' ') : ''));
  if (fails.length > deep.length / 2) throw new Error('too many symbols failed; leaving the saved prices as they are');
  const text = JSON.stringify(out);
  // the whole market, compact: [symbol, name, price, previous close, sector, size in billions, s(tock) | f(und)]
  const all = U ? JSON.stringify({ v: 1, at, s: U.map((r) => [r.sym, r.name, r4(r.p), r4(r.pc), r.sec, Math.round(r.cap / 1e8) / 10, r.k]) }) : null;
  if (process.env.DRY) { console.log('quotes ' + text.length + ' bytes, all ' + (all ? all.length : 0) + ' bytes'); return; }
  await upload(OBJ2, text, 'no-cache, max-age=0', true);
  // The file the released game (before the whole-market update) reads: the hand-picked list with a year of closes,
  // and its long view. Kept until every installed copy has moved to q2.json.
  const legacy = { v: 1, at: now, asof: out.asof, q: {}, rates: out.rates, idx: out.idx }, lh = { v: 2, at: now, q: {} };
  LIST.forEach((x) => { const s = x[0], q = out.q[s]; if (!q) return; legacy.q[s] = Object.assign({}, q, year[s] && year[s].length ? packed(year[s]) : {}); delete legacy.q[s].sec; delete legacy.q[s].cap; if (details[s]) lh.q[s] = details[s].L; });
  await upload(OBJ, JSON.stringify(legacy), 'no-cache, max-age=0', true);
  if (Object.keys(lh.q).length) await upload('market/history.json', JSON.stringify(lh), 'public, max-age=3600', true);
  if (all) await upload(AOBJ, all, 'public, max-age=600', true);
  const dj = Object.keys(details);
  async function up() { while (dj.length) { const s = dj.shift(); try { await upload(DDIR + s + '.json', JSON.stringify(details[s]), 'public, max-age=600', true, true); } catch (e) { console.log('  detail ' + s + ': ' + e.message.slice(0, 120)); } } }
  await Promise.all([up(), up(), up(), up(), up(), up()]);
  console.log('Saved ' + Object.keys(details).length + ' detail files');
})().catch((e) => { console.error(e.message || e); process.exit(1); });

let auth = null;
async function upload(obj, text, cache, gz, quiet) {
  if (!auth) {
    if (!KEY) throw new Error('no service account');
    auth = { Authorization: 'Bearer ' + (await token(KEY)) };
  }
  const bd = 'b' + crypto.randomBytes(8).toString('hex');
  const meta = JSON.stringify(Object.assign({ name: obj, contentType: 'application/json', cacheControl: cache }, gz ? { contentEncoding: 'gzip' } : {}));
  const data = gz ? zlib.gzipSync(Buffer.from(text)) : Buffer.from(text);
  const body = Buffer.concat([Buffer.from('--' + bd + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + bd + '\r\nContent-Type: application/json\r\n\r\n'), data, Buffer.from('\r\n--' + bd + '--')]);
  const r = await fetch('https://storage.googleapis.com/upload/storage/v1/b/' + BUCKET + '/o?uploadType=multipart&fields=name', { method: 'POST', headers: Object.assign({ 'Content-Type': 'multipart/related; boundary=' + bd }, auth), body });
  if (!r.ok) throw new Error('upload HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
  if (!quiet) console.log('Saved ' + obj + ' (' + text.length + ' bytes, ' + data.length + ' sent)');
}
