'use strict';
// Wax Pack's team logos (WaxLogos): the team's cap mark as it was in a card's season, loaded from Wikimedia on the
// player's own device when a card is drawn and kept there (the Cache API's 'waxpack-logos'), as Sportsbook loads
// ESPN's logos. Tim, 2026-11-28: "you can use the mlb logos for this game like we are for sportsbook. especially include
// the historical ones as appropriate."
// Only marks made of letters are here (a cap's letters, a monogram, a wordmark); a team or a season with none here
// (a mascot or a character, or no file found) shows the team's name in lettering, as it does until a mark has loaded.
//   WaxLogos.find(teamCode, season) -> {k, u: the 250px picture's address, page: its Wikimedia page} or null
//   WaxLogos.url(teamCode, season) -> a promise of an address to draw (a blob from the cache), or null when there is none
// T: [key, [team codes], first season, last season]. Team codes are the Lahman database's (BRO, ML1, KC1, WS2 ...).
(function (root) {
  var T = [
    ['bro-1934', ['BRO'], 1934, 1948], ['bro-1949', ['BRO'], 1949, 1957], ['lan', ['LAN'], 1958, 2025],
    ['bsn', ['BSN'], 1936, 1952], ['ml1', ['ML1'], 1953, 1965], ['atl', ['ATL'], 1966, 2025],
    ['sla-1916', ['SLA'], 1916, 1935], ['sla-1950', ['SLA'], 1936, 1953],
    ['bos', ['BOS'], 1908, 2025],
    ['cal-1966', ['CAL', 'LAA'], 1961, 1971], ['cal-1972', ['CAL'], 1972, 1996], ['ana', ['ANA'], 1997, 2004], ['laa', ['LAA'], 2005, 2025],
    ['chn', ['CHN'], 1903, 2025],
    ['cha-1969', ['CHA'], 1969, 1970], ['cha-1971', ['CHA'], 1971, 1975], ['cha', ['CHA'], 1991, 2025],
    ['cin', ['CIN'], 1901, 2025], ['cle', ['CLE'], 1901, 2021], ['cle-2022', ['CLE'], 2022, 2025],
    ['col', ['COL'], 1993, 2025], ['det', ['DET'], 1901, 2025],
    ['hou', ['HOU'], 1965, 1999], ['hou-2000', ['HOU'], 2000, 2012], ['hou', ['HOU'], 2013, 2025],
    ['pha-1902', ['PHA'], 1901, 1921], ['pha-1951', ['PHA'], 1922, 1954],
    ['kc1-1955', ['KC1'], 1955, 1960], ['kc1-1965', ['KC1'], 1961, 1967], ['oak', ['OAK', 'ATH'], 1968, 2025],
    ['se1', ['SE1'], 1969, 1969], ['min', ['MIN'], 1961, 2001], ['min-2002', ['MIN'], 2002, 2025],
    ['ws1', ['WS1'], 1901, 1960], ['ws2-1961', ['WS2'], 1961, 1962], ['ws2-1963', ['WS2'], 1963, 1967], ['ws2-1968', ['WS2'], 1968, 1971],
    ['nya', ['NYA'], 1903, 2025], ['nyn', ['NYN'], 1962, 2025], ['ny1', ['NY1'], 1883, 1957], ['sfn', ['SFN'], 1958, 2025],
    ['phi', ['PHI'], 1883, 2025], ['pit', ['PIT'], 1887, 2025],
    ['sdn-1969', ['SDN'], 1969, 2003], ['sdn', ['SDN'], 2004, 2025],
    ['sea-1977', ['SEA'], 1977, 1986], ['sea-1987', ['SEA'], 1987, 1992],
    ['sln', ['SLN'], 1900, 2025], ['tba', ['TBA'], 2008, 2025], ['tex', ['TEX'], 1972, 2025], ['ari', ['ARI'], 1998, 2025],
    ['mon', ['MON'], 1969, 2004], ['kca-1969', ['KCA'], 1969, 2001], ['kca-2002', ['KCA'], 2002, 2025],
    ['ml4', ['ML4'], 1970, 1997], ['mil', ['MIL'], 1998, 2025], ['was', ['WAS'], 2005, 2025], ['sea', ['SEA'], 1993, 2025]
  ];
  var U = {   // key -> [the 250px picture, its Wikimedia page]
    "ana": ['https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Anaheim_Angels_02-04_cap_logo.gif/250px-Anaheim_Angels_02-04_cap_logo.gif', 'https://commons.wikimedia.org/wiki/File:Anaheim_Angels_02-04_cap_logo.gif'],
    "ari": ['https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Arizona_Diamondbacks_Cap_Logo.svg/250px-Arizona_Diamondbacks_Cap_Logo.svg.png', 'https://commons.wikimedia.org/wiki/File:Arizona_Diamondbacks_Cap_Logo.svg'],
    "atl": ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Atlanta_Braves_Insignia.svg/250px-Atlanta_Braves_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:Atlanta_Braves_Insignia.svg'],
    "bos": ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/BostonRedSox_CapLogo.svg/250px-BostonRedSox_CapLogo.svg.png', 'https://commons.wikimedia.org/wiki/File:BostonRedSox_CapLogo.svg'],
    "bro-1934": ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Brooklyn_Dodgers_Cap_Logo_%281934_to_1936%2C_1938_to_1955%29.svg/250px-Brooklyn_Dodgers_Cap_Logo_%281934_to_1936%2C_1938_to_1955%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Brooklyn_Dodgers_Cap_Logo_(1934_to_1936,_1938_to_1955).svg'],
    "bro-1949": ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Brooklyn_Dodgers_Cap_Logo_%281949_to_1957%29.svg/250px-Brooklyn_Dodgers_Cap_Logo_%281949_to_1957%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Brooklyn_Dodgers_Cap_Logo_(1949_to_1957).svg'],
    "bsn": ['https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Boston_Braves_Cap_Logo_%281946_to_1952%29.svg/250px-Boston_Braves_Cap_Logo_%281946_to_1952%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Boston_Braves_Cap_Logo_(1946_to_1952).svg'],
    "cal-1966": ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/California_Angels_logo_%281966-1970%29.svg/250px-California_Angels_logo_%281966-1970%29.svg.png', 'https://commons.wikimedia.org/wiki/File:California_Angels_logo_(1966-1970).svg'],
    "cal-1972": ['https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/California_Angels_logo_%281972-1988%29.svg/250px-California_Angels_logo_%281972-1988%29.svg.png', 'https://commons.wikimedia.org/wiki/File:California_Angels_logo_(1972-1988).svg'],
    "cha": ['https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Chicago_White_Sox_Insignia.svg/250px-Chicago_White_Sox_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:Chicago_White_Sox_Insignia.svg'],
    "cha-1969": ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Chicago_White_Sox_Insignia_%281969-1970%29.png/250px-Chicago_White_Sox_Insignia_%281969-1970%29.png', 'https://commons.wikimedia.org/wiki/File:Chicago_White_Sox_Insignia_(1969-1970).png'],
    "cha-1971": ['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Chicago_White_Sox_Insignia_%281971-1975%29.png/250px-Chicago_White_Sox_Insignia_%281971-1975%29.png', 'https://commons.wikimedia.org/wiki/File:Chicago_White_Sox_Insignia_(1971-1975).png'],
    "chn": ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Chicago_Cubs_Cap_Insignia.svg/250px-Chicago_Cubs_Cap_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:Chicago_Cubs_Cap_Insignia.svg'],
    "cin": ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Cincinnati_Reds_Cap_Insignia.svg/250px-Cincinnati_Reds_Cap_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:Cincinnati_Reds_Cap_Insignia.svg'],
    "cle": ['https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Cleveland_Indians_cap_logo.svg/250px-Cleveland_Indians_cap_logo.svg.png', 'https://commons.wikimedia.org/wiki/File:Cleveland_Indians_cap_logo.svg'],
    "cle-2022": ['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Cleveland_Guardians_cap_logo.svg/250px-Cleveland_Guardians_cap_logo.svg.png', 'https://commons.wikimedia.org/wiki/File:Cleveland_Guardians_cap_logo.svg'],
    "col": ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Colorado_Rockies_Cap_Insignia.svg/250px-Colorado_Rockies_Cap_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:Colorado_Rockies_Cap_Insignia.svg'],
    "det": ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Detroit_Tigers_Insignia.svg/250px-Detroit_Tigers_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:Detroit_Tigers_Insignia.svg'],
    "hou": ['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Houston_Astros_cap_logo.svg/250px-Houston_Astros_cap_logo.svg.png', 'https://commons.wikimedia.org/wiki/File:Houston_Astros_cap_logo.svg'],
    "hou-2000": ['https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Houston_astros_logo_cap_primary_2000_2012.png/250px-Houston_astros_logo_cap_primary_2000_2012.png', 'https://commons.wikimedia.org/wiki/File:Houston_astros_logo_cap_primary_2000_2012.png'],
    "kc1-1955": ['https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Kansas_City_Athletics_Cap_Logo_%281955_to_1959%29.svg/250px-Kansas_City_Athletics_Cap_Logo_%281955_to_1959%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Kansas_City_Athletics_Cap_Logo_(1955_to_1959).svg'],
    "kc1-1965": ['https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Kansas_City_Athletics_Cap_Logo_%281965_to_1967%29.svg/250px-Kansas_City_Athletics_Cap_Logo_%281965_to_1967%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Kansas_City_Athletics_Cap_Logo_(1965_to_1967).svg'],
    "kca-1969": ['https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Kansas_City_Royals_Insignia_%281969%E2%80%932001%29.svg/250px-Kansas_City_Royals_Insignia_%281969%E2%80%932001%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Kansas_City_Royals_Insignia_(1969%E2%80%932001).svg'],
    "kca-2002": ['https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Kansas_City_Royals_Insignia_%282002%E2%80%932025%29.svg/250px-Kansas_City_Royals_Insignia_%282002%E2%80%932025%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Kansas_City_Royals_Insignia_(2002%E2%80%932025).svg'],
    "laa": ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Los_Angeles_Angels_Cap_Insignia.svg/250px-Los_Angeles_Angels_Cap_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:Los_Angeles_Angels_Cap_Insignia.svg'],
    "lan": ['https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/LA_Dodgers_cap_logo.svg/250px-LA_Dodgers_cap_logo.svg.png', 'https://commons.wikimedia.org/wiki/File:LA_Dodgers_cap_logo.svg'],
    "mil": ['https://upload.wikimedia.org/wikipedia/en/thumb/2/28/Milwaukee_Brewers_cap_insignia.svg/250px-Milwaukee_Brewers_cap_insignia.svg.png', 'https://en.wikipedia.org/wiki/File:Milwaukee_Brewers_cap_insignia.svg'],
    "min": ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Minnesota_Twins_Insignia.svg/250px-Minnesota_Twins_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:Minnesota_Twins_Insignia.svg'],
    "min-2002": ['https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Minnesota_Twins_cap_logo_%282002-2022%29.svg/250px-Minnesota_Twins_cap_logo_%282002-2022%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Minnesota_Twins_cap_logo_(2002-2022).svg'],
    "ml1": ['https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Milwaukee_Braves_Cap_Logo.svg/250px-Milwaukee_Braves_Cap_Logo.svg.png', 'https://commons.wikimedia.org/wiki/File:Milwaukee_Braves_Cap_Logo.svg'],
    "ml4": ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/MilwaukeeBaseballM.svg/250px-MilwaukeeBaseballM.svg.png', 'https://commons.wikimedia.org/wiki/File:MilwaukeeBaseballM.svg'],
    "mon": ['https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Montreal_Expos_Cap_Logo_%281992_to_2004%29.svg/250px-Montreal_Expos_Cap_Logo_%281992_to_2004%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Montreal_Expos_Cap_Logo_(1992_to_2004).svg'],
    "ny1": ['https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/New_york_giants_logo_cap_1949_1957.png/250px-New_york_giants_logo_cap_1949_1957.png', 'https://commons.wikimedia.org/wiki/File:New_york_giants_logo_cap_1949_1957.png'],
    "nya": ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/NewYorkYankees_caplogo.svg/250px-NewYorkYankees_caplogo.svg.png', 'https://commons.wikimedia.org/wiki/File:NewYorkYankees_caplogo.svg'],
    "nyn": ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/New_York_Mets_Insignia.svg/250px-New_York_Mets_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:New_York_Mets_Insignia.svg'],
    "oak": ['https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Oakland_A%27s_cap_logo.svg/250px-Oakland_A%27s_cap_logo.svg.png', 'https://commons.wikimedia.org/wiki/File:Oakland_A%27s_cap_logo.svg'],
    "pha-1902": ['https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Philadelphia_Athletics_Primary_Logo_%281902_to_1921%29.svg/250px-Philadelphia_Athletics_Primary_Logo_%281902_to_1921%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Philadelphia_Athletics_Primary_Logo_(1902_to_1921).svg'],
    "pha-1951": ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Philadelphia_Athletics_Cap_Logo_%281951_to_1953%29.svg/250px-Philadelphia_Athletics_Cap_Logo_%281951_to_1953%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Philadelphia_Athletics_Cap_Logo_(1951_to_1953).svg'],
    "phi": ['https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Philadelphia_Phillies_Insignia.svg/250px-Philadelphia_Phillies_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:Philadelphia_Phillies_Insignia.svg'],
    "pit": ['https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Pittsburgh_Pirates_Cap_Insignia.svg/250px-Pittsburgh_Pirates_Cap_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:Pittsburgh_Pirates_Cap_Insignia.svg'],
    "sdn": ['https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/San_Diego_Padres_Cap_Insignia.svg/250px-San_Diego_Padres_Cap_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:San_Diego_Padres_Cap_Insignia.svg'],
    "sdn-1969": ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/SD_Logo_Brown.svg/250px-SD_Logo_Brown.svg.png', 'https://commons.wikimedia.org/wiki/File:SD_Logo_Brown.svg'],
    "se1": ['https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Seattle_Pilots_Cap_Logo.svg/250px-Seattle_Pilots_Cap_Logo.svg.png', 'https://commons.wikimedia.org/wiki/File:Seattle_Pilots_Cap_Logo.svg'],
    "sea": ['https://upload.wikimedia.org/wikipedia/en/thumb/8/8a/Seattle_Mariners_Insignia.svg/250px-Seattle_Mariners_Insignia.svg.png', 'https://en.wikipedia.org/wiki/File:Seattle_Mariners_Insignia.svg'],
    "sea-1977": ['https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Seattle_Mariners_cap_insignia_1977.gif/250px-Seattle_Mariners_cap_insignia_1977.gif', 'https://commons.wikimedia.org/wiki/File:Seattle_Mariners_cap_insignia_1977.gif'],
    "sea-1987": ['https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Seattle_Mariners_cap_insignia_1987_to_1992.png/250px-Seattle_Mariners_cap_insignia_1987_to_1992.png', 'https://commons.wikimedia.org/wiki/File:Seattle_Mariners_cap_insignia_1987_to_1992.png'],
    "sfn": ['https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/San_Francisco_Giants_Cap_Insignia.svg/250px-San_Francisco_Giants_Cap_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:San_Francisco_Giants_Cap_Insignia.svg'],
    "sla-1916": ['https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/St._Louis_Browns_Primary_Logo_%281916_to_1935%29.svg/250px-St._Louis_Browns_Primary_Logo_%281916_to_1935%29.svg.png', 'https://commons.wikimedia.org/wiki/File:St._Louis_Browns_Primary_Logo_(1916_to_1935).svg'],
    "sla-1950": ['https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/St._Louis_Browns_Cap_Logo_%281950_to_1951%29.svg/250px-St._Louis_Browns_Cap_Logo_%281950_to_1951%29.svg.png', 'https://commons.wikimedia.org/wiki/File:St._Louis_Browns_Cap_Logo_(1950_to_1951).svg'],
    "sln": ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/St_Louis_Cardinals_Cap_Insignia.svg/250px-St_Louis_Cardinals_Cap_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:St_Louis_Cardinals_Cap_Insignia.svg'],
    "tba": ['https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Tampa_Bay_Rays_cap_logo.svg/250px-Tampa_Bay_Rays_cap_logo.svg.png', 'https://commons.wikimedia.org/wiki/File:Tampa_Bay_Rays_cap_logo.svg'],
    "tex": ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Texas_Rangers_Insignia.svg/250px-Texas_Rangers_Insignia.svg.png', 'https://commons.wikimedia.org/wiki/File:Texas_Rangers_Insignia.svg'],
    "was": ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Washington_Nationals_Cap_Insig.svg/250px-Washington_Nationals_Cap_Insig.svg.png', 'https://commons.wikimedia.org/wiki/File:Washington_Nationals_Cap_Insig.svg'],
    "ws1": ['https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Washington_Senators_Cap_Logo_%281916_to_1925%2C_1928_to_1932%2C_1935%2C_1938_to_1948%29.svg/250px-Washington_Senators_Cap_Logo_%281916_to_1925%2C_1928_to_1932%2C_1935%2C_1938_to_1948%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Washington_Senators_Cap_Logo_(1916_to_1925,_1928_to_1932,_1935,_1938_to_1948).svg'],
    "ws2-1961": ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Washington_Senators_Cap_Logo_%281961_to_1962%29.svg/250px-Washington_Senators_Cap_Logo_%281961_to_1962%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Washington_Senators_Cap_Logo_(1961_to_1962).svg'],
    "ws2-1963": ['https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Washington_Senators_Cap_Logo_%281963_to_1967%29.svg/250px-Washington_Senators_Cap_Logo_%281963_to_1967%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Washington_Senators_Cap_Logo_(1963_to_1967).svg'],
    "ws2-1968": ['https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Washington_Senators_Cap_Logo_%281968_to_1971%29.svg/250px-Washington_Senators_Cap_Logo_%281968_to_1971%29.svg.png', 'https://commons.wikimedia.org/wiki/File:Washington_Senators_Cap_Logo_(1968_to_1971).svg']
  };
  function find(tc, y) {
    if (!tc) return null;
    var best = null, gap = 1e9;
    for (var i = 0; i < T.length; i++) {
      var t = T[i]; if (t[1].indexOf(tc) < 0 || !U[t[0]]) continue;
      if (!y || (y >= t[2] && y <= t[3])) { best = t[0]; gap = 0; break; }
      var g = y < t[2] ? t[2] - y : y - t[3];
      if (g < gap) { gap = g; best = t[0]; }
    }
    if (!best || gap > 12) return null;   // the nearest era's mark while it is close; otherwise the name in lettering
    return { k: best, u: U[best][0], page: U[best][1] };
  }
  // the picture as a same-origin blob (so Keep playing's picture and printing never meet a cross-origin image), from
  // the device's cache when it has it, else fetched once and kept; a failure leaves the lettering
  var CACHE = 'waxpack-logos', MEM = {};
  function url(tc, y) {
    var f = find(tc, y); if (!f) return null;
    if (MEM[f.u]) return MEM[f.u];
    var get = function () {
      var hasCache = typeof caches !== 'undefined';
      return (hasCache ? caches.open(CACHE).then(function (c) { return c.match(f.u).then(function (hit) {
        if (hit) return hit;
        return fetch(f.u, { mode: 'cors', credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); c.put(f.u, r.clone()).catch(function () {}); return r; });
      }); }) : fetch(f.u, { mode: 'cors', credentials: 'omit' })).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
        .then(function (b) { return URL.createObjectURL(b); });
    };
    MEM[f.u] = get().catch(function () { delete MEM[f.u]; return null; });
    return MEM[f.u];
  }
  root.WaxLogos = { T: T, U: U, find: find, url: url };
})(this);
