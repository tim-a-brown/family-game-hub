import sys
path = sys.argv[1]
s = open(path, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, (n, old[:90]); s = s.replace(old, new)
rep("  if (S.pown) {\n    if (S.nul[i]) return '';", "  if (S.pown) {\n    if ((p === 'spark' || p === 'cheap') && !S.cfg.gatepay && i < 2 * S.N && !(i & 1)) return '';   // (a Commerce Place pays at an Outpost or the Crossroads, not behind a Gate: see results.txt)\n    if (S.nul[i]) return '';")
rep("S.P[i >> 1].seals > 0 && S.pown && holds(S, i >> 1, 'seal')) {", "S.P[i >> 1].seals > 0 && S.pown && (cfg.sealRule !== 'last' || S.P[i >> 1].seals === 1) && holds(S, i >> 1, 'seal')) {")
rep("const PV = { spark: [1.2, 0.7, 0.5], cheap: [1.5, 0.5, 0.3],", "const PV = { spark: [0, 0.8, 0.5], cheap: [0, 0.8, 0.3],")
open(path, 'w', encoding='utf-8').write(s); print('ok')
