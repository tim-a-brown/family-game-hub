import sys
path = sys.argv[1]
s = open(path, encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    n = s.count(old); assert n == count, (n, old[:90]); s = s.replace(old, new)
# who wins by holding every kind (the Domination switch, left in and off)
rep("if (a !== b) S.domWin = a ? 0 : 1; }\n}", "if (a !== b) { S.domWin = a ? 0 : 1; if (S.st) { const r = S.P[S.domWin].renown - S.P[1 - S.domWin].renown; S.st.domWinLead = r > 0 ? 1 : r < 0 ? -1 : 0; S.st.domWinGap = r; } } }\n}")
# the cards that move Domains: the card, whose it is and anything lying on it travel together; Figures stay where they stand
rep("// A choice of Place waiting on a player", """// Domains change positions: the Domain now at spot i is the one that was at perm[i]. The card, whose it is and Vesuvius
// lying on it travel together. Figures, a Royal Decree and everything else belong to the position and stay.
function permute(S, perm) { const pl = S.places.slice(), ow = S.pown.slice(), nu = S.nul.slice(); for (let i = 0; i < perm.length; i++) { S.places[i] = pl[perm[i]]; S.pown[i] = ow[perm[i]]; S.nul[i] = nu[perm[i]]; }
  if (S.ev) S.ev.push({ t: 'domains', perm: perm.slice() }); if (S.st) S.st.moved = (S.st.moved || 0) + 1; }
// A choice of Place waiting on a player""")
rep("    else if (ci === 'caperoute') { if (canTurn(S, o)) out.push({ t: 'deed', h }); }\n", """    else if (ci === 'caperoute') { if (canTurn(S, o)) out.push({ t: 'deed', h }); }
    else if (ci === 'breda') { for (let i = 0; i < np; i++) for (let j = i + 1; j < np; j++) if (!prot(S, i, o) && !prot(S, j, o)) out.push({ t: 'deed', h, p: i, q: j }); }
    else if (ci === 'columbian' || ci === 'vienna') { let ok = S.N === 2; for (let i = 0; i < 2 * S.N; i++) if (prot(S, i, o)) ok = false; if (ok) out.push({ t: 'deed', h }); }
""")
rep("    else if (ci === 'caperoute') { const id = turnPlace(S, o); if (id) { setPlace(S, 2 * S.N, id, o); used(S, 'caperoute'); } }\n", """    else if (ci === 'caperoute') { const id = turnPlace(S, o); if (id) { setPlace(S, 2 * S.N, id, o); used(S, 'caperoute'); } }
    else if (ci === 'breda') { const perm = S.places.map((_, i) => i); perm[a.p] = a.q; perm[a.q] = a.p; const hub = 2 * S.N, side = i => i === hub ? 'the Crossroads' : (i >> 1) === o ? 'mine' : 'theirs'; used(S, 'exchange: ' + [side(a.p), side(a.q)].sort().join(' and ')); permute(S, perm); }
    else if (ci === 'columbian') { permute(S, [2, 3, 0, 1, 4]); used(S, 'the line reversed'); }
    else if (ci === 'vienna') { const seed = S.uid * 53 + S.round * 7 + (S.rs || 0) * 977 + 1;
      if (S.cfg.vdie) { const g = 2 * o, t = 2 * (1 - o), d = dshuf([0, 1, 2, 3, 4, 5], seed)[0], pr = [[0, 2], [1, 3], [g, g + 1], [t, t + 1], [g + 1, 4], [t + 1, 4]][d], perm = [0, 1, 2, 3, 4]; perm[pr[0]] = pr[1]; perm[pr[1]] = pr[0]; permute(S, perm); used(S, 'a die chose the two Domains'); }   // (cfg.vdie: a die picks which two Domains change places)
      else { permute(S, dshuf([0, 1, 2, 3, 4], seed)); used(S, 'the Domains shuffled'); } }
""")
rep("const ci = P.hand[a.h]; return ci === 'earthquake' || ci === 'caperoute'; } return false; }", "const ci = P.hand[a.h]; return ci === 'earthquake' || ci === 'caperoute' || ci === 'vienna'; } return false; }")
rep("function mix(T, k) { for", "function mix(T, k) { T.rs = k + 1; for")
rep("if (!S.cfg.tame || !P.uCh)", "if (!S.cfg.tame || !P.uCh)", 0)
rep("pw(S, place, o) === 'cheap' && !(S.cfg.tame && P.uCh)", "pw(S, place, o) === 'cheap' && !((S.cfg.tame || S.cfg.cheap1) && P.uCh)")
rep("pw, rv, holds, setPlace, turnPlace, placeScore, deckInfo, PV };", "pw, rv, holds, setPlace, turnPlace, placeScore, deckInfo, PV, permute };")
open(path, 'w', encoding='utf-8').write(s); print('ok')
