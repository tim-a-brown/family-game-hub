# Builds games/axisallies-classic.js (the Axis & Allies Classic board) from TripleA's World War II Classic map.
import re, json, sys, os
# usage: python3 scripts/build-aa-classic.py <path to a clone of github.com/triplea-maps/world_war_ii_classic>
SRC = (sys.argv[1].rstrip('/') if len(sys.argv) > 1 else '../triplea-maps/world_war_ii_classic') + '/map/'
s = open(SRC + 'games/classic.xml').read()
terr = re.findall(r'<territory name="([^"]*)"( water="true")?', s)
own = dict(re.findall(r'<territoryOwner territory="([^"]*)" owner="([^"]*)"', s))
P = {'Russians': 'su', 'Germans': 'de', 'British': 'uk', 'Japanese': 'jp', 'Americans': 'us'}
att = {}
for m in re.finditer(r'<attachment name="territoryAttachment" attachTo="([^"]*)"[^>]*>(.*?)</attachment>', s, re.S):
    d = dict(re.findall(r'<option name="([^"]*)" value="([^"]*)"', m.group(2))); att[m.group(1)] = d
conns = re.findall(r'<connection t1="([^"]*)" t2="([^"]*)"', s)
place = re.findall(r'<unitPlacement unitType="([^"]*)" territory="([^"]*)" quantity="(\d+)" owner="([^"]*)"', s)
canals = {}
for m in re.finditer(r'<attachment name="canalAttachment" attachTo="([^"]*)"[^>]*>(.*?)</attachment>', s, re.S):
    d = dict(re.findall(r'<option name="([^"]*)" value="([^"]*)"', m.group(2)))
    canals.setdefault(d['canalName'], {'z': [], 'land': d['landTerritories'].split(':')})['z'].append(m.group(1))
# polygons and centres (the source map is 3500 x 2000; ours is half that)
polys = {}
for line in open(SRC + 'polygons.txt'):
    if '<' not in line: continue
    name = line[:line.index('<')].strip()
    rings = re.findall(r'<([^>]*)>', line)
    polys[name] = [[(int(a), int(b)) for a, b in re.findall(r'\((-?\d+),(-?\d+)\)', r)] for r in rings]
cent = {}
for line in open(SRC + 'centers.txt'):
    m = re.match(r'(.*?)\s+\((-?\d+),\s*(-?\d+)\)', line.strip())
    if m: cent[m.group(1).strip()] = (int(m.group(2)), int(m.group(3)))
FIX = {'Mediteranean': 'Mediterranean', 'Carribean': 'Caribbean', 'Antartic': 'Antarctic', 'Columbia': 'Colombia'}
def disp(n, sea):
    for a, b in FIX.items(): n = n.replace(a, b)
    if sea: n = n.replace(' Sea Zone', '').replace(' sea zone', '')
    return n
CITY = {'Russia': 'Moscow', 'Germany': 'Berlin', 'United Kingdom': 'London', 'Japan': 'Tokyo', 'East US': 'Washington'}
def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]; L = (dx * dx + dy * dy) ** .5 or 1
    imax, dmax = 0, -1
    for i in range(1, len(pts) - 1):
        p = pts[i]
        d = abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / L if (dx or dy) else ((p[0]-a[0])**2+(p[1]-a[1])**2)**.5
        if d > dmax: imax, dmax = i, d
    if dmax <= eps: return [a, b]
    return dp(pts[:imax + 1], eps)[:-1] + dp(pts[imax:], eps)
def path(rings):
    out = ''
    for r in rings:
        if len(r) < 3: continue
        # closed ring: split in two halves so DP keeps its shape
        h = len(r) // 2
        q = dp(r[:h + 1], 2.2)[:-1] + dp(r[h:] + [r[0]], 2.2)[:-1]
        q = [(round(x / 2), round(y / 2)) for x, y in q]
        qq = [q[0]]
        for p in q[1:]:
            if p != qq[-1]: qq.append(p)
        if len(qq) < 3: continue
        out += 'M%d %d' % qq[0]
        for i in range(1, len(qq)): out += 'l%d %d' % (qq[i][0] - qq[i - 1][0], qq[i][1] - qq[i - 1][1])
        out += 'z'
    return out
names = [t[0] for t in terr]
idx = {n: i for i, n in enumerate(names)}
fac = set(t for u, t, q, o in place if u == 'factory') | set(n for n, d in att.items() if d.get('originalFactory') == 'true')
TER, GEO = [], []
for n, w in terr:
    sea = bool(w); d = att.get(n, {})
    flags = 0
    if n in fac: flags |= 1
    if d.get('capital'): flags |= 4 | 2
    if not sea and n not in own: flags |= 8
    cx, cy = cent.get(n, (0, 0))
    TER.append([disp(n, sea), 1 if sea else 0, int(d.get('production', 0)), P.get(own.get(n), ''), flags, round(cx / 2), round(cy / 2), CITY.get(n, '')])
    GEO.append(path(polys.get(n, [])))
    if n not in polys: print('no polygon', n, file=sys.stderr)
    if n not in cent: print('no centre', n, file=sys.stderr)
ADJ = [[] for _ in names]
for a, b in conns:
    ia, ib = idx[a], idx[b]
    if ib not in ADJ[ia]: ADJ[ia].append(ib)
    if ia not in ADJ[ib]: ADJ[ib].append(ia)
for a in ADJ: a.sort()
UK = {'infantry': 'inf', 'armour': 'arm', 'fighter': 'ftr', 'bomber': 'bmb', 'transport': 'tra', 'carrier': 'cv', 'battleship': 'bb', 'submarine': 'sub', 'aaGun': 'aa', 'artillery': 'art', 'destroyer': 'dd'}
SETUP = [[idx[t], P[o], UK[u], int(q)] for u, t, q, o in place if u != 'factory']
CAN = []
for nm, c in canals.items():
    z = [idx[x] for x in c['z']]
    CAN.append([z[0], z[1], [idx[x] for x in c['land']], nm])
js = '// Axis & Allies Classic (the 1984 Milton Bradley board): territories, sea zones, values, adjacency, canals and\n'
js += '// starting armies. Converted from the TripleA project\'s World War II Classic map (github.com/triplea-maps/\n'
js += '// world_war_ii_classic) by a script; outlines simplified and drawn at half size (1750 x 1000, like the 1942 board).\n'
js += '// TER[i] = [name, isSea, ipc, startOwner, flags(1 factory, 2 victory city, 4 capital, 8 impassable), cx, cy, city]\n'
js += 'var CLASSIC_BOARD = {\nTER:' + json.dumps(TER, separators=(',', ':')) + ',\nADJ:' + json.dumps(ADJ, separators=(',', ':')) + ',\nSETUP:' + json.dumps(SETUP, separators=(',', ':')) + ',\nCANALS:' + json.dumps(CAN, separators=(',', ':')) + ',\nGEO:' + json.dumps(GEO, separators=(',', ':')) + '\n};\n'
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'games', 'axisallies-classic.js'), 'w').write(js)
print(len(TER), len(js), 'bytes', CAN, file=sys.stderr)
print('xs', min(t[5] for t in TER), max(t[5] for t in TER), 'ys', min(t[6] for t in TER), max(t[6] for t in TER), file=sys.stderr)
