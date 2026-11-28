'use strict';
// Wax Pack's team logos (WaxLogos), the team's cap letters as they were in a card's season, from Wikimedia Commons.
// Only files Commons hosts as public domain (too simple for copyright: letters on a cap) or under a free license are
// here, and only letter marks; a season with none (the Expos, the Royals, the Orioles, the Blue Jays and the rest that
// Commons can't host) shows the team's name in lettering instead. Tim, 2026-11-28: "you can use the mlb logos for this
// game like we are for sportsbook. especially include the historical ones as appropriate."
//   WaxLogos.find(teamCode, season) -> file name in games/waxpack/logos/, or null
// T: [file, [team codes], first season, last season]. The database's team codes are Lahman's (BRO, ML1, KC1, WS2 ...).
// SRC: where each file came from (its Commons page) and its license there.
(function (root) {
  var T = [
    ['bro-1934.webp', ['BRO'], 1934, 1948], ['bro-1949.webp', ['BRO'], 1949, 1957], ['lan.webp', ['LAN'], 1958, 2025],
    ['bsn.webp', ['BSN'], 1936, 1952], ['ml1.webp', ['ML1'], 1953, 1965], ['atl.webp', ['ATL'], 1966, 2025],
    ['sla-1916.webp', ['SLA'], 1916, 1935], ['sla-1950.webp', ['SLA'], 1936, 1953],
    ['bos.webp', ['BOS'], 1908, 2025],
    ['cal-1966.webp', ['CAL', 'LAA'], 1961, 1971], ['cal-1972.webp', ['CAL'], 1972, 1996], ['ana.webp', ['ANA'], 1997, 2004], ['laa.webp', ['LAA'], 2005, 2025],
    ['chn.webp', ['CHN'], 1903, 2025],
    ['cha-1969.webp', ['CHA'], 1969, 1970], ['cha-1971.webp', ['CHA'], 1971, 1975], ['cha.webp', ['CHA'], 1991, 2025],
    ['cin.webp', ['CIN'], 1901, 2025], ['cle.webp', ['CLE'], 1901, 2021], ['cle-2022.webp', ['CLE'], 2022, 2025],
    ['col.webp', ['COL'], 1993, 2025], ['det.webp', ['DET'], 1901, 2025],
    ['hou.webp', ['HOU'], 1965, 1999], ['hou-2000.webp', ['HOU'], 2000, 2012], ['hou.webp', ['HOU'], 2013, 2025],
    ['pha-1902.webp', ['PHA'], 1901, 1921], ['pha-1951.webp', ['PHA'], 1922, 1954],
    ['kc1-1955.webp', ['KC1'], 1955, 1960], ['kc1-1965.webp', ['KC1'], 1961, 1967], ['oak.webp', ['OAK', 'ATH'], 1968, 2025],
    ['se1.webp', ['SE1'], 1969, 1969], ['min.webp', ['MIN'], 1961, 2001], ['min-2002.webp', ['MIN'], 2002, 2025],
    ['ws1.webp', ['WS1'], 1901, 1960], ['ws2-1961.webp', ['WS2'], 1961, 1962], ['ws2-1963.webp', ['WS2'], 1963, 1967], ['ws2-1968.webp', ['WS2'], 1968, 1971],
    ['nya.webp', ['NYA'], 1903, 2025], ['nyn.webp', ['NYN'], 1962, 2025], ['ny1.webp', ['NY1'], 1883, 1957], ['sfn.webp', ['SFN'], 1958, 2025],
    ['phi.webp', ['PHI'], 1883, 2025], ['pit.webp', ['PIT'], 1887, 2025],
    ['sdn-1969.webp', ['SDN'], 1969, 2003], ['sdn.webp', ['SDN'], 2004, 2025],
    ['sea-1977.webp', ['SEA'], 1977, 1986], ['sea-1987.webp', ['SEA'], 1987, 1992],
    ['sln.webp', ['SLN'], 1900, 2025], ['tba.webp', ['TBA'], 2008, 2025], ['tex.webp', ['TEX'], 1972, 2025], ['ari.webp', ['ARI'], 1998, 2025]
  ];
  var SRC = {   // file -> [its Commons page, its license there]
    'ana.webp': ['https://commons.wikimedia.org/wiki/File:Anaheim_Angels_02-04_cap_logo.gif', 'Public domain'],
    'ari.webp': ['https://commons.wikimedia.org/wiki/File:Arizona_Diamondbacks_Cap_Logo.svg', 'Public domain'],
    'atl.webp': ['https://commons.wikimedia.org/wiki/File:Atlanta_Braves_Insignia.svg', 'Public domain'],
    'bos.webp': ['https://commons.wikimedia.org/wiki/File:BostonRedSox_CapLogo.svg', 'Public domain'],
    'bro-1934.webp': ['https://commons.wikimedia.org/wiki/File:Brooklyn_Dodgers_Cap_Logo_(1934_to_1936,_1938_to_1955).svg', 'Public domain'],
    'bro-1949.webp': ['https://commons.wikimedia.org/wiki/File:Brooklyn_Dodgers_Cap_Logo_(1949_to_1957).svg', 'Public domain'],
    'bsn.webp': ['https://commons.wikimedia.org/wiki/File:Boston_Braves_Cap_Logo_(1946_to_1952).svg', 'Public domain'],
    'cal-1966.webp': ['https://commons.wikimedia.org/wiki/File:California_Angels_logo_(1966-1970).svg', 'Public domain'],
    'cal-1972.webp': ['https://commons.wikimedia.org/wiki/File:California_Angels_logo_(1972-1988).svg', 'Public domain'],
    'cha-1969.webp': ['https://commons.wikimedia.org/wiki/File:Chicago_White_Sox_Insignia_(1969-1970).png', 'Public domain'],
    'cha-1971.webp': ['https://commons.wikimedia.org/wiki/File:Chicago_White_Sox_Insignia_(1971-1975).png', 'Public domain'],
    'cha.webp': ['https://commons.wikimedia.org/wiki/File:Chicago_White_Sox_Insignia.svg', 'Public domain'],
    'chn.webp': ['https://commons.wikimedia.org/wiki/File:Chicago_Cubs_Cap_Insignia.svg', 'Public domain'],
    'cin.webp': ['https://commons.wikimedia.org/wiki/File:Cincinnati_Reds_Cap_Insignia.svg', 'Public domain'],
    'cle-2022.webp': ['https://commons.wikimedia.org/wiki/File:Cleveland_Guardians_cap_logo.svg', 'Public domain'],
    'cle.webp': ['https://commons.wikimedia.org/wiki/File:Cleveland_Indians_cap_logo.svg', 'Public domain'],
    'col.webp': ['https://commons.wikimedia.org/wiki/File:Colorado_Rockies_Cap_Insignia.svg', 'Public domain'],
    'det.webp': ['https://commons.wikimedia.org/wiki/File:Detroit_Tigers_Insignia.svg', 'Public domain'],
    'hou-2000.webp': ['https://commons.wikimedia.org/wiki/File:Houston_astros_logo_cap_primary_2000_2012.png', 'Public domain'],
    'hou.webp': ['https://commons.wikimedia.org/wiki/File:Houston_Astros_cap_logo.svg', 'Public domain'],
    'kc1-1955.webp': ['https://commons.wikimedia.org/wiki/File:Kansas_City_Athletics_Cap_Logo_(1955_to_1959).svg', 'Public domain'],
    'kc1-1965.webp': ['https://commons.wikimedia.org/wiki/File:Kansas_City_Athletics_Cap_Logo_(1965_to_1967).svg', 'Public domain'],
    'laa.webp': ['https://commons.wikimedia.org/wiki/File:Los_Angeles_Angels_Cap_Insignia.svg', 'Public domain'],
    'lan.webp': ['https://commons.wikimedia.org/wiki/File:LA_Dodgers_cap_logo.svg', 'Public domain'],
    'min-2002.webp': ['https://commons.wikimedia.org/wiki/File:Minnesota_Twins_cap_logo_(2002-2022).svg', 'Public domain'],
    'min.webp': ['https://commons.wikimedia.org/wiki/File:Minnesota_Twins_Insignia.svg', 'Public domain'],
    'ml1.webp': ['https://commons.wikimedia.org/wiki/File:Milwaukee_Braves_Cap_Logo.svg', 'Public domain'],
    'nya.webp': ['https://commons.wikimedia.org/wiki/File:NewYorkYankees_caplogo.svg', 'Public domain'],
    'nyn.webp': ['https://commons.wikimedia.org/wiki/File:New_York_Mets_Insignia.svg', 'Public domain'],
    'oak.webp': ['https://commons.wikimedia.org/wiki/File:Oakland_A%27s_cap_logo.svg', 'Public domain'],
    'pha-1902.webp': ['https://commons.wikimedia.org/wiki/File:Philadelphia_Athletics_Primary_Logo_(1902_to_1921).svg', 'Public domain'],
    'pha-1951.webp': ['https://commons.wikimedia.org/wiki/File:Philadelphia_Athletics_Cap_Logo_(1951_to_1953).svg', 'Public domain'],
    'phi.webp': ['https://commons.wikimedia.org/wiki/File:Philadelphia_Phillies_Insignia.svg', 'Public domain'],
    'pit.webp': ['https://commons.wikimedia.org/wiki/File:Pittsburgh_Pirates_Cap_Insignia.svg', 'Public domain'],
    'sdn-1969.webp': ['https://commons.wikimedia.org/wiki/File:SD_Logo_Brown.svg', 'Public domain'],
    'sdn.webp': ['https://commons.wikimedia.org/wiki/File:San_Diego_Padres_Cap_Insignia.svg', 'Public domain'],
    'se1.webp': ['https://commons.wikimedia.org/wiki/File:Seattle_Pilots_Cap_Logo.svg', 'Public domain'],
    'sea-1977.webp': ['https://commons.wikimedia.org/wiki/File:Seattle_Mariners_cap_insignia_1977.gif', 'Public domain'],
    'sea-1987.webp': ['https://commons.wikimedia.org/wiki/File:Seattle_Mariners_cap_insignia_1987_to_1992.png', 'Public domain'],
    'sfn.webp': ['https://commons.wikimedia.org/wiki/File:San_Francisco_Giants_Cap_Insignia.svg', 'Public domain'],
    'sla-1916.webp': ['https://commons.wikimedia.org/wiki/File:St._Louis_Browns_Primary_Logo_(1916_to_1935).svg', 'Public domain'],
    'sla-1950.webp': ['https://commons.wikimedia.org/wiki/File:St._Louis_Browns_Cap_Logo_(1950_to_1951).svg', 'Public domain'],
    'sln.webp': ['https://commons.wikimedia.org/wiki/File:St_Louis_Cardinals_Cap_Insignia.svg', 'Public domain'],
    'tba.webp': ['https://commons.wikimedia.org/wiki/File:Tampa_Bay_Rays_cap_logo.svg', 'Public domain'],
    'tex.webp': ['https://commons.wikimedia.org/wiki/File:Texas_Rangers_Insignia.svg', 'Public domain'],
    'ws1.webp': ['https://commons.wikimedia.org/wiki/File:Washington_Senators_Cap_Logo_(1916_to_1925,_1928_to_1932,_1935,_1938_to_1948).svg', 'Public domain'],
    'ws2-1961.webp': ['https://commons.wikimedia.org/wiki/File:Washington_Senators_Cap_Logo_(1961_to_1962).svg', 'Public domain'],
    'ws2-1963.webp': ['https://commons.wikimedia.org/wiki/File:Washington_Senators_Cap_Logo_(1963_to_1967).svg', 'Public domain'],
    'ws2-1968.webp': ['https://commons.wikimedia.org/wiki/File:Washington_Senators_Cap_Logo_(1968_to_1971).svg', 'Public domain']
  };
  // the files in this folder: a mark listed in T but not here yet shows the team's name in lettering, and is never
  // asked for (Commons' file server was throttling the download on 2026-11-28; see the report)
  var HAVE_LIST = [];
  var HAVE = {}; HAVE_LIST.forEach(function (f) { HAVE[f] = 1; });
  function find(tc, y) {
    if (!tc) return null;
    var best = null, gap = 1e9;
    for (var i = 0; i < T.length; i++) {
      var t = T[i]; if (t[1].indexOf(tc) < 0) continue;
      if (!HAVE[t[0]]) continue;
      if (!y || (y >= t[2] && y <= t[3])) return t[0];
      var g = y < t[2] ? t[2] - y : y - t[3];
      if (g < gap) { gap = g; best = t[0]; }
    }
    return gap <= 12 ? best : null;   // the nearest era's mark, while it is close; else the team's name in lettering
  }
  root.WaxLogos = { T: T, SRC: SRC, HAVE: HAVE, find: find };
})(this);
