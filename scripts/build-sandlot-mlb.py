#!/usr/bin/env python3
"""Builds games/sandlot-mlb.json: every Major League player's seasons, for
Sandlot Showdown's "find the player" card entry.

Source: the Lahman Baseball Database (seanlahman.com), via the pylahman
package's parquet files. Licensed CC BY-SA 3.0; credited in the game's rules.

  pip install pyarrow && pip download --no-deps pylahman && unzip pylahman-*.whl
  python3 scripts/build-sandlot-mlb.py path/to/pylahman/data

Output (compact on purpose, ~1 MB gzipped):
  { "upto": last season, "teams": {teamID: name},
    "p": ["First|Last|hitting|pitching", ...] }
  hitting  = "year,team,G,AB,H,HR,SB,pos;..."   (pos = most games at a position)
  pitching = "year,team,G,IPouts,ER,SO;..."
Multiple stints in a season are added together under the last team.
"""
import sys, os, json, collections
import pyarrow.parquet as pq

src = sys.argv[1] if len(sys.argv) > 1 else 'pylahman/data'
out = os.path.join(os.path.dirname(__file__), '..', 'games', 'sandlot-mlb.json')
def T(n): return pq.read_table(os.path.join(src, n + '.parquet')).to_pydict()

people, bat, pit, app, teams = T('People'), T('Batting'), T('Pitching'), T('Appearances'), T('Teams')
def rows(d):
    ks = list(d.keys())
    for i in range(len(d[ks[0]])): yield {k: d[k][i] for k in ks}
def n(x): return int(x or 0)

tname = {}
for r in rows(teams): tname[r['teamID']] = r['name']          # latest name wins

POS = [('G_p', 'P'), ('G_c', 'C'), ('G_1b', '1B'), ('G_2b', '2B'), ('G_3b', '3B'), ('G_ss', 'SS'), ('G_lf', 'LF'), ('G_cf', 'CF'), ('G_rf', 'RF'), ('G_dh', 'DH')]
pos = collections.defaultdict(collections.Counter)
for r in rows(app):
    for k, p in POS: pos[(r['playerID'], r['yearID'])][p] += n(r.get(k))

B = collections.defaultdict(dict)
for r in rows(bat):
    y = r['yearID']; s = B[r['playerID']].setdefault(y, [r['teamID'], 0, 0, 0, 0, 0])
    s[0] = r['teamID']; s[1] += n(r['G']); s[2] += n(r['AB']); s[3] += n(r['H']); s[4] += n(r['HR']); s[5] += n(r['SB'])
P = collections.defaultdict(dict)
for r in rows(pit):
    y = r['yearID']; s = P[r['playerID']].setdefault(y, [r['teamID'], 0, 0, 0, 0])
    s[0] = r['teamID']; s[1] += n(r['G']); s[2] += n(r['IPouts']); s[3] += n(r['ER']); s[4] += n(r['SO'])

out_p, upto = [], 0
for r in rows(people):
    pid = r['playerID']
    if pid not in B and pid not in P: continue
    first, last = (r['nameFirst'] or '').strip(), (r['nameLast'] or '').strip()
    if not last: continue
    hb = []
    for y in sorted(B.get(pid, {})):
        t, g, ab, h, hr, sb = B[pid][y]
        if ab <= 0: continue
        c = pos.get((pid, y)); ps = c.most_common(1)[0][0] if c and c.most_common(1)[0][1] else ''
        hb.append('%d,%s,%d,%d,%d,%d,%d,%s' % (y, t, g, ab, h, hr, sb, ps)); upto = max(upto, y)
    hp = []
    for y in sorted(P.get(pid, {})):
        t, g, ipo, er, so = P[pid][y]
        if ipo <= 0: continue
        hp.append('%d,%s,%d,%d,%d,%d' % (y, t, g, ipo, er, so)); upto = max(upto, y)
    if not hb and not hp: continue
    out_p.append('|'.join([first, last, ';'.join(hb), ';'.join(hp)]))

json.dump({'upto': upto, 'teams': tname, 'p': out_p}, open(out, 'w'), separators=(',', ':'), ensure_ascii=False)
print('sandlot-mlb.json: %d players, seasons through %d, %.1f MB' % (len(out_p), upto, os.path.getsize(out) / 1e6))
