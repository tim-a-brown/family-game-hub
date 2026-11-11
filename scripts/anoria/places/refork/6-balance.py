import sys
path = sys.argv[1]
s = open(path, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, (n, old[:90]); s = s.replace(old, new)
# The balance pass on Law. The rule 'peace': only the player who holds this Domain can start a clash there (it took the place of
# 'seal', which kept a Seal from breaking and measured weak). cfg.sealPeace gave a 'seal' Domain the same (1: as well; 'only': instead).
rep("const used = (S, k) =>", "const peace = (S, i, o) => !!(S.pown && (pw(S, i) === 'peace' || (S.cfg.sealPeace && pw(S, i) === 'seal')) && !(!S.cfg.peaceSym && holder(S, i) === o));   // (the player who holds the Domain may start a clash there; cfg.peaceSym: nobody may)\nconst used = (S, k) =>")
rep("seal: [0, 0.8, 0.5], sanctuary:", "seal: [0, 0.8, 0.5], peace: [0.6, 0.6, 0.4], sanctuary:")
rep("if (en.length && !en.some(g => CARDS[g.c].k.law)) {", "if (en.length && !en.some(g => CARDS[g.c].k.law) && !peace(S, f.p, o)) {")
rep("for (const f of mine) for (const g of theirs) if (g.p === f.p && open(g) && !CARDS[g.c].k.untouchable) out.push({ t: 'deed', h, u: f.u, v: g.u }); }", "for (const f of mine) for (const g of theirs) if (g.p === f.p && open(g) && !CARDS[g.c].k.untouchable && !peace(S, f.p, o)) out.push({ t: 'deed', h, u: f.u, v: g.u }); }")
rep("(cfg.sealRule !== 'last' || S.P[i >> 1].seals === 1) && holds(S, i >> 1, 'seal')) {", "cfg.sealPeace !== 'only' && (cfg.sealRule !== 'last' || S.P[i >> 1].seals === 1) && holds(S, i >> 1, 'seal')) {")
open(path, 'w', encoding='utf-8').write(s); print('ok')
