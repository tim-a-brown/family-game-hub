#!/usr/bin/env python3
"""Pack the crossword bank for the app: grids (scripts/build-crosswords.py) + clues (one JSON per helper part,
{ENTRY: {"e": [...], "h": [...]}} or {ENTRY: "DROP"}) -> data/xw/<mini|big><weekday>-<block>.json.

Each file holds BLOCK puzzles [{g: [rows], c: {answer: clue}}] for one kind and weekday (0 = Monday); the app picks
bank[kind][weekday][week % WEEKS] (see EPOCH, WEEKS, BLOCK in games/crossword.html).
Clue level: easy for big Monday-Wednesday and minis Monday-Thursday, hard otherwise. An answer with several clues
rotates through them puzzle by puzzle, so a common word doesn't always get the same clue.
Run: python3 scripts/pack-crosswords.py GRIDS.json CLUE_DIR [--check]   (--check: report missing/dropped, write nothing)
"""
import json, os, sys, glob, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOCK = 40

def entries(g):
    n = len(g); out = []
    for r in range(n):
        out += [w for w in g[r].split('#') if len(w) >= 2]
    for c in range(n):
        col = ''.join(g[r][c] for r in range(n))
        out += [w for w in col.split('#') if len(w) >= 2]
    return out

def main():
    grids_path, clue_dir = sys.argv[1], sys.argv[2]
    check = '--check' in sys.argv
    grids = json.load(open(grids_path))
    clues = {}
    for f in sorted(glob.glob(os.path.join(clue_dir, '*.json'))):
        for k, v in json.load(open(f)).items(): clues[k.upper()] = v
    missing, dropped = {}, {}
    out = {}
    for key, lst in sorted(grids.items()):
        kind, day = key[:-1], int(key[-1])
        lvl = 'e' if (kind == 'big' and day <= 2) or (kind == 'mini' and day <= 3) else 'h'
        puzzles = []
        for i, g in enumerate(lst):
            c = {}
            for w in entries(g):
                W = w.upper(); v = clues.get(W)
                if v == 'DROP': dropped.setdefault(W, []).append(key + '#' + str(i)); continue
                opts = (v or {}).get(lvl) or (v or {}).get('h' if lvl == 'e' else 'e') or []
                if not opts: missing.setdefault(W, []).append(key + '#' + str(i)); continue
                pick = int(hashlib.md5((key + str(i) + W).encode()).hexdigest(), 16) % len(opts)
                c[w.lower()] = opts[pick]
            puzzles.append({'g': [r.lower() for r in g], 'c': c})
        out[key] = puzzles
    bad = {}
    for W, where in list(missing.items()) + list(dropped.items()):
        for x in where: bad[x] = 1
    print('puzzles', sum(len(v) for v in out.values()), 'missing clues', len(missing), 'dropped words', len(dropped), 'puzzles affected', len(bad))
    if check or bad:
        json.dump({'missing': sorted(missing), 'dropped': sorted(dropped)}, open(os.path.join(clue_dir, '..', 'pack-report.json'), 'w'), indent=0)
        if bad: print('not writing: fix the report first (rebuild grids without dropped words, write missing clues)'); return
    d = os.path.join(ROOT, 'data', 'xw'); os.makedirs(d, exist_ok=True)
    for f in glob.glob(os.path.join(d, '*.json')): os.remove(f)
    n = 0
    for key, puzzles in out.items():
        for b in range(0, len(puzzles), BLOCK):
            p = os.path.join(d, '%s-%d.json' % (key, b // BLOCK))
            json.dump(puzzles[b:b + BLOCK], open(p, 'w'), separators=(',', ':'), ensure_ascii=False); n += 1
    print('wrote', n, 'files to data/xw/')

if __name__ == '__main__':
    main()
