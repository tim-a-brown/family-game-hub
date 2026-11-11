import sys
path = sys.argv[1]
s = open(path, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, (n, old[:90]); s = s.replace(old, new)
rep("picked: {}, repl: 0,", "picked: {}, use: {}, hub0: null, repl: 0,")
rep("  setPlace(S, 2 * N, hub, d);\n", "  setPlace(S, 2 * N, hub, d); if (S.st) S.st.hub0 = hub;\n")
rep("const canTurn = (S, o) =>", "const used = (S, k) => { if (S.st) S.st.use[k] = (S.st.use[k] || 0) + 1; };\nconst canTurn = (S, o) =>")
rep("if (op === 'found' && x) { const id = turnPlace(S, o); if (id) setPlace(S, 2 * S.N, id, o); }", "if (op === 'found' && x) { const id = turnPlace(S, o); if (id) { setPlace(S, 2 * S.N, id, o); used(S, 'found'); } }")
rep("const w = f.p >> 1, id = turnPlace(S, w); if (id) setPlace(S, f.p, id, w); }\n    }", "const w = f.p >> 1, id = turnPlace(S, w); if (id) { setPlace(S, f.p, id, w); used(S, 'conquer'); } }\n    }")
rep("else if (ci === 'earthquake') { const w = a.p >> 1, id = turnPlace(S, w); if (id) setPlace(S, a.p, id, w); }", "else if (ci === 'earthquake') { const w = a.p >> 1, id = turnPlace(S, w); if (id) { setPlace(S, a.p, id, w); used(S, w === o ? 'earthquake on their own Place' : 'earthquake on the other player\\'s'); } }")
rep("else if (ci === 'vesuvius') S.nul[a.p] = 1;", "else if (ci === 'vesuvius') { S.nul[a.p] = 1; used(S, a.p === 2 * S.N ? 'vesuvius on the Crossroads' : (a.p >> 1) === o ? 'vesuvius on their own Place' : 'vesuvius on the other player\\'s'); }")
rep("else if (ci === 'caperoute') { const id = turnPlace(S, o); if (id) setPlace(S, 2 * S.N, id, o); }", "else if (ci === 'caperoute') { const id = turnPlace(S, o); if (id) { setPlace(S, 2 * S.N, id, o); used(S, 'caperoute'); } }")
open(path, 'w', encoding='utf-8').write(s); print('ok')
