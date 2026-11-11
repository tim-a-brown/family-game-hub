import sys
path = sys.argv[1]
s = open(path, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, (n, old[:90]); s = s.replace(old, new)
# cfg.tame: a rule that pays whoever holds the Place pays only a player with a Figure standing there (an empty Gate
# pays nothing), and a Commerce Place makes one Figure a turn cheaper, not every one.
rep("function holds(S, o, w) { for (let i = 0; i < S.places.length; i++) if (pw(S, i, o) === w && holder(S, i) === o) return i + 1; return 0; }",
    "// cfg.tame: a rule that pays whoever holds the Place pays only a player with a Figure standing there (so an empty Gate\n// pays nothing), and a Commerce Place makes the first Figure a player lays there each turn cheaper, not every one.\nconst pays = (S, i, h) => !S.cfg.tame || cnt(S, i, h) > 0;\nfunction holds(S, o, w) { for (let i = 0; i < S.places.length; i++) if (pw(S, i, o) === w && holder(S, i) === o && pays(S, i, o)) return i + 1; return 0; }")
rep("if (place != null && pw(S, place, o) === 'cheap') x -=", "if (place != null && pw(S, place, o) === 'cheap' && !(S.cfg.tame && P.uCh)) x -=")
rep("P.spark -= costOf(S, o, ci, a.p); P.uN++; P.hand.splice(a.h, 1); putFig(S, o, ci, a.p, a.x); }", "P.spark -= costOf(S, o, ci, a.p); if (S.pown && pw(S, a.p, o) === 'cheap') P.uCh = 1; P.uN++; P.hand.splice(a.h, 1); putFig(S, o, ci, a.p, a.x); }")
rep("P.uA = P.uT = P.uD = P.uC = P.uN = 0;", "P.uA = P.uT = P.uD = P.uC = P.uN = 0; P.uCh = 0;")
rep("if (w === 'draw') draw(S, h, dbl); if (w === 'spark') P.sb += dbl;", "if (w === 'draw' && pays(S, i, h)) draw(S, h, dbl); if (w === 'spark' && pays(S, i, h)) P.sb += dbl;")
rep("if (w === 'draw') v += 0.5 * s; else if (w === 'spark') v += 0.6 * s; else if (w === 'forge') v += 0.3 * s; else if (w === 'seal') v += 0.4 * s;", "if (!pays(S, i, h)) { } else if (w === 'draw') v += 0.5 * s; else if (w === 'spark') v += 0.6 * s; else if (w === 'forge') v += 0.3 * s; else if (w === 'seal') v += 0.4 * s;")
open(path, 'w', encoding='utf-8').write(s); print('ok')
