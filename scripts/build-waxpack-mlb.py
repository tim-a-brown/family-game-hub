#!/usr/bin/env python3
"""Builds games/waxpack/mlb.json: every Major League player's seasons and honors, for Wax Pack (the game whose
catalog id is still sandlot). Wax Pack finds the player on a card by name, reads his season from the card's year, and
turns it into ratings measured against that season's league (so a .300 hitter in 1968 is worth more than one in 1999).

Source: the Lahman Baseball Database (seanlahman.com), via the pylahman package's parquet files. CC BY-SA 3.0,
credited in the game's rules.

  pip install pyarrow && pip download --no-deps pylahman && unzip pylahman-*.whl
  python3 scripts/build-waxpack-mlb.py path/to/pylahman/data

Output (compact on purpose):
  { "upto": last season, "teams": {teamID: name}, "lg": {year: [AVG, HR/AB, SB/G, BB/PA, SO/PA, ERA, K/9, BB/9]},
    "p": ["First|Last|born|BT|hitting|pitching|honors", ...] }
  BT       = bats and throws ("RR", "LL", "SR")
  hitting  = "year,team,G,AB,H,2B,3B,HR,RBI,SB,BB,SO,pos;..."   (pos = most games at a position that season)
  pitching = "year,team,G,GS,IPouts,H,ER,HR,BB,SO,W,L,SV;..."
  honors   = "A1985.1986 H2007 M1987 C1985 R1982 G1984.1985 S1983 W1984"  (All-Star, Hall of Fame induction,
             MVP, Cy Young, Rookie of the Year, Gold Glove, Silver Slugger, World Series won with his team)
Several stints in a season are added together under the last team.
"""
import sys, os, json, collections
import pyarrow.parquet as pq

src = sys.argv[1] if len(sys.argv) > 1 else 'pylahman/data'
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'games', 'waxpack', 'mlb.json')
def T(n): return pq.read_table(os.path.join(src, n + '.parquet')).to_pydict()
def rows(d):
    ks = list(d.keys())
    for i in range(len(d[ks[0]])): yield {k: d[k][i] for k in ks}
def n(x):
    try: return int(x or 0)
    except (TypeError, ValueError): return 0

people, bat, pit, app, teams = T('People'), T('Batting'), T('Pitching'), T('Appearances'), T('Teams')
asg, hof, aw = T('AllstarFull'), T('HallOfFame'), T('AwardsPlayers')

tname, wsw = {}, set()
for r in rows(teams):
    tname[r['teamID']] = r['name']
    if r.get('WSWin') == 'Y': wsw.add((r['teamID'], r['yearID']))

POS = [('G_p', 'P'), ('G_c', 'C'), ('G_1b', '1B'), ('G_2b', '2B'), ('G_3b', '3B'), ('G_ss', 'SS'), ('G_lf', 'LF'), ('G_cf', 'CF'), ('G_rf', 'RF'), ('G_dh', 'DH')]
pos = collections.defaultdict(collections.Counter)
for r in rows(app):
    for k, p in POS: pos[(r['playerID'], r['yearID'])][p] += n(r.get(k))

B = collections.defaultdict(dict); teamsOf = collections.defaultdict(set)
LG = collections.defaultdict(lambda: [0] * 12)   # AB H HR SB G BB SO PA | IPouts ER SO BB
for r in rows(bat):
    y = r['yearID']; s = B[r['playerID']].setdefault(y, [r['teamID']] + [0] * 10)
    s[0] = r['teamID']; teamsOf[(r['playerID'], y)].add(r['teamID'])
    for i, k in enumerate(['G', 'AB', 'H', '2B', '3B', 'HR', 'RBI', 'SB', 'BB', 'SO']): s[i + 1] += n(r.get(k))
    L = LG[y]; ab = n(r['AB']); L[0] += ab; L[1] += n(r['H']); L[2] += n(r['HR']); L[3] += n(r['SB']); L[4] += n(r['G'])
    L[5] += n(r['BB']); L[6] += n(r['SO']); L[7] += ab + n(r['BB']) + n(r.get('HBP')) + n(r.get('SF'))
P = collections.defaultdict(dict)
for r in rows(pit):
    y = r['yearID']; s = P[r['playerID']].setdefault(y, [r['teamID']] + [0] * 11)
    s[0] = r['teamID']; teamsOf[(r['playerID'], y)].add(r['teamID'])
    for i, k in enumerate(['G', 'GS', 'IPOuts', 'H', 'ER', 'HR', 'BB', 'SO', 'W', 'L', 'SV']): s[i + 1] += n(r.get(k))
    L = LG[y]; L[8] += n(r['IPOuts']); L[9] += n(r['ER']); L[10] += n(r['SO']); L[11] += n(r['BB'])

lg = {}
for y, L in sorted(LG.items()):
    if not L[0] or not L[8]: continue
    games = L[4] / 9.0 or 1
    lg[y] = [round(L[1] / L[0], 4), round(L[2] / L[0], 5), round(L[3] / games, 4), round(L[5] / max(1, L[7]), 4), round(L[6] / max(1, L[7]), 4),
             round(L[9] * 27 / L[8], 3), round(L[10] * 27 / L[8], 3), round(L[11] * 27 / L[8], 3)]

hon = collections.defaultdict(lambda: collections.defaultdict(set))
for r in rows(asg): hon[r['playerID']]['A'].add(r['yearID'])
for r in rows(hof):
    if r['inducted'] == 'Y' and r['category'] == 'Player': hon[r['playerID']]['H'].add(r['yearID'])
AW = {'Most Valuable Player': 'M', 'Cy Young Award': 'C', 'Rookie of the Year': 'R', 'Gold Glove': 'G', 'Silver Slugger': 'S'}
for r in rows(aw):
    k = AW.get(r['awardID'])
    if k: hon[r['playerID']][k].add(r['yearID'])
for (pid, y), ts in teamsOf.items():
    if any((t, y) in wsw for t in ts): hon[pid]['W'].add(y)

out_p, upto = [], 0
for r in rows(people):
    pid = r['playerID']
    if pid not in B and pid not in P: continue
    first, last = (r['nameFirst'] or '').strip(), (r['nameLast'] or '').strip()
    if not last: continue
    hb = []
    for y in sorted(B.get(pid, {})):
        s = B[pid][y]
        if s[2] <= 0: continue
        c = pos.get((pid, y)); ps = c.most_common(1)[0][0] if c and c.most_common(1)[0][1] else ''
        hb.append(','.join([str(y), s[0]] + [str(v) for v in s[1:]] + [ps])); upto = max(upto, y)
    hp = []
    for y in sorted(P.get(pid, {})):
        s = P[pid][y]
        if s[3] <= 0: continue
        hp.append(','.join([str(y), s[0]] + [str(v) for v in s[1:]])); upto = max(upto, y)
    if not hb and not hp: continue
    h = hon.get(pid, {})
    hs = ' '.join(k + '.'.join(str(y) for y in sorted(h[k])) for k in 'AHMCRGSW' if k in h and h[k])
    bt = (r.get('bats') or '?')[:1] + (r.get('throws') or '?')[:1]
    out_p.append('|'.join([first, last, str(n(r.get('birthYear')) or ''), bt, ';'.join(hb), ';'.join(hp), hs]))

json.dump({'upto': upto, 'teams': tname, 'lg': lg, 'p': out_p}, open(out, 'w'), separators=(',', ':'), ensure_ascii=False)
print('waxpack mlb.json: %d players, seasons through %d, %.1f MB' % (len(out_p), upto, os.path.getsize(out) / 1e6))
