# Merge the reviewed trivia category files (scratchpad trivia/out/<cat>.json) into data/trivia-questions.js,
# dropping exact and near-duplicate questions across categories. Run: python3 scripts/merge-trivia.py [-v]
import json, re, os, sys
SP='/tmp/claude-0/-home-user-family-game-hub/b80fdf31-982b-5614-81cf-ef05718282c1/scratchpad'
out=SP+'/trivia/out'
CATS=[["animals","Animals","paw","#16a34a"],["space","Space","rocket","#6d28d9"],["science","Science","lightbulb","#7c3aed"],["nature","Nature & Weather","leaf","#059669"],["world","World & Geography","globe","#0284c7"],["america","America","flag","#2563eb"],["history","World History","history","#dc2626"],["colorado","Colorado","mountain","#d97706"],["sports","Sports","trophy","#ea580c"],["movies","Movies & TV","camera","#db2777"],["music","Music","music","#c026d3"],["food","Food & Drink","pizza","#c2410c"],["math","Numbers & Math","plus","#4f46e5"],["words","Words & Language","words","#0d9488"],["body","Human Body","heart","#e11d48"],["tech","Inventions & Tech","bolt","#0891b2"],["books","Books & Stories","book","#9333ea"],["art","Art & Culture","palette","#be185d"]]
def norm(t): return re.sub(r'[^a-z0-9 ]','',t.lower()).strip()
STOP=set('the a an of in is was what which who how many to on for by and or did does this that with from at as its are were be most called named known kind type'.split())
def words(t): return set(w for w in norm(t).split() if w not in STOP)
def ents(t): return set(w.lower() for w in re.findall(r"\b[A-Z][a-zA-Z']+|\b\d+\b", t)[1:])  # capitalised words / numbers after the first word
KEEP={'The word "boss" comes from which language?','How many valves does the human heart have?'}
rows=[]; seen={}; near=[]; byans={}
for c in CATS:
    for r in json.load(open(os.path.join(out,c[0]+'.json'))):
        q,a,w,f,lv=r; k=norm(q)
        if k in seen: continue
        an=norm(a); ws=words(q); es=ents(q); dup=None
        for (oq,ows,oes,oc) in byans.get(an,[]):
            j=len(ws&ows)/max(1,len(ws|ows))
            if j>=0.5 and not ((es-oes) and (oes-es)) and not ((ws-ows) and (ows-ws) and j<0.6): dup=(oq,oc); break
        if dup and q in KEEP: dup=None
        if dup: near.append((c[0],q,a,dup)); continue
        seen[k]=c[0]; byans.setdefault(an,[]).append((q,ws,es,c[0]))
        rows.append([q,a,w,f,lv,c[0]])
print('rows',len(rows),'near dups dropped',len(near))
if '-v' in sys.argv:
    for x in near: print('NEAR',x[0],'|',x[1],'<->',x[3][1],'|',x[3][0])
js='// Trivia question bank (games/trivia.html loads this). Built by merging the reviewed category files.\n// cats: [id, name, icon (Kit.icon name), colour]\n// q: [question, answer, [wrong1, wrong2, wrong3], fact, level (1 upper elementary, 2 general knowledge, 3 genius), catId]\nvar TRIVIA = {\ncats: [\n'+',\n'.join(json.dumps(c,ensure_ascii=False) for c in CATS)+'\n],\nq: [\n'+',\n'.join(json.dumps(r,ensure_ascii=False) for r in rows)+'\n]\n};\n'
open('/home/user/family-game-hub/data/trivia-questions.js','w').write(js)
print('bytes',len(js.encode()))
