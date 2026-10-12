#!/usr/bin/env python3
"""Build the crossword bank: daily mini and large grids, harder from Monday to Sunday.

Grids only (letters and black squares); the clues come from scripts/crossword-clues/*.json and are joined in by
scripts/pack-crosswords.py. Run:  python3 scripts/build-crosswords.py --weeks 160 --out /tmp/xw-grids.json

Word list: the app's everyday dictionary (data/words-en.js, SCOWL common with offensive words removed),
ranked by how common each word is (wordfreq). Monday uses only very common words; each day after that the pool
widens. Grids follow newspaper rules: rotational symmetry, every white square in an across and a down word,
words of 3+ letters, all white squares connected, no word twice in a grid.
"""
import argparse, json, math, random, re, subprocess, sys, time, os
LOOK, NODES = 8, 3000

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DICT_URL = 'https://raw.githubusercontent.com/Crossword-Nexus/collaborative-word-list/main/xwordlist.dict'

def load_words(path=None):
    """word -> (quality, familiarity). Quality: the Collaborative Word List score (MIT licence, Crossword Nexus),
    50 = passable, 80+ = good fill. Familiarity: wordfreq zipf of the word, or of the phrase split into words
    (ICECREAM -> "ice cream"), so Monday gets entries everyone knows."""
    path = path or os.path.join(os.environ.get('TMPDIR', '/tmp'), 'xwordlist.dict')
    if not os.path.exists(path):
        subprocess.run(['curl', '-sL', '--max-time', '120', '-o', path, DICT_URL], check=True)
    cache = path + '.scored.json'
    if os.path.exists(cache) and os.path.getmtime(cache) > max(os.path.getmtime(path), os.path.getmtime(__file__)):
        return {w: tuple(v) for w, v in json.load(open(cache)).items()}
    from wordfreq import zipf_frequency
    js = open(os.path.join(ROOT, 'data/words-en.js')).read()
    known = set()
    for v in ('C', 'E'):
        packed = re.search(r"var %s = '([^']*)'" % v, js).group(1); prev = ''
        for m in re.finditer(r'(\d)([a-z]+)', packed):
            prev = prev[:int(m.group(1))] + m.group(2); known.add(prev)
    seg = {w for w in known if len(w) >= 2 or w in ('a', 'i')} | {'a', 'i'}
    def split(w):
        # fewest dictionary words that spell w
        best = [None] * (len(w) + 1); best[0] = []
        for i in range(1, len(w) + 1):
            for j in range(max(0, i - 15), i):
                if best[j] is not None and w[j:i] in seg and (best[i] is None or len(best[j]) + 1 < len(best[i])):
                    best[i] = best[j] + [w[j:i]]
        return best[len(w)]
    out = {}
    for line in open(path, encoding='utf-8', errors='ignore'):
        if ';' not in line: continue
        w, q = line.strip().rsplit(';', 1)
        w = w.lower()
        if not re.fullmatch(r'[a-z]{3,21}', w): continue
        try: q = int(q)
        except ValueError: continue
        if q < 50 or w in SKIP or any(b in w for b in BAD_PARTS): continue
        f = zipf_frequency(w, 'en')
        if w not in known:
            parts = split(w)
            # a phrase: no grown-up bits, and how well known the phrase is
            if parts and len(parts) > 1 and any(x in SKIP_PARTS for x in parts): continue
            if parts and 1 < len(parts) <= 4 and len(w) >= 6: f = max(f, zipf_frequency(' '.join(parts), 'en') + 0.3)
        out[w] = (q, round(f, 2))
    json.dump(out, open(cache, 'w'))
    return out

# Fine in a dictionary, not in a family puzzle
SKIP = set('''slave slaves slavery lube nazi nazis rape raped rapes rapist porn sexy sex sexual heroin cocaine meth
suicide abortion hitler genocide drunk drunks booze bong weed stoned whore hell damn crap pee poop butt boob boobs
nude nudes naked kinky erotic orgasm penis vagina breast breasts bra bras thong torture lynch lynched kkk isis
nsfw xxx lsd ecstasy opium stoner pothead hooker pimp stripper bimbo hussy slut
'''.split())
BAD_PARTS = ('fuck', 'shit', 'cunt', 'bitch', 'pussy', 'whore', 'slut', 'porn', 'nigg', 'dildo', 'orgasm', 'jizz',
             'twat', 'wank', 'hitler', 'nazi', 'boob', 'penis', 'vagina', 'erotic', 'horny', 'semen', 'rapist')
SKIP_PARTS = SKIP | set('''sex anal cock dick tits nude naked rape raped kinky fag cum hump humping bang screw screwed
pot weed coke hash crack meth beer booze drunk wine vodka kill killer killed murder gun guns dead die died'''.split())

# Monday .. Sunday: minimum list score and familiarity. Like the newspaper: Monday 15x15 easy, Saturday hardest
# 15x15, Sunday the big 21x21.
MIN_Q = [80, 80, 75, 70, 70, 60, 70]
MIN_F = [3.3, 3.0, 2.7, 2.4, 2.1, 1.8, 2.2]
MINI_BLACKS = [(4, 6), (4, 6), (2, 4), (2, 4), (2, 4), (0, 2), (0, 2)]
BIG_SIZE = [15, 15, 15, 15, 15, 15, 21]
BIG_BLACKS = [(36, 42), (36, 42), (34, 40), (34, 40), (30, 38), (28, 36), (72, 82)]
BIG_MAXLEN = [9, 9, 10, 10, 11, 11, 11]

class Index:
    """Per length: bitmask of words with letter c at position i, for fast pattern matching."""
    def __init__(self, words, score):
        self.by_len = {}
        for w in words:
            self.by_len.setdefault(len(w), []).append(w)
        self.masks = {}
        self.all = {}
        self.score = score
        for L, ws in self.by_len.items():
            ws.sort(key=lambda w: -score[w])
            m = [[0] * 26 for _ in range(L)]
            for k, w in enumerate(ws):
                bit = 1 << k
                for i, ch in enumerate(w):
                    m[i][ord(ch) - 97] |= bit
            self.masks[L] = m
            self.all[L] = (1 << len(ws)) - 1
        self.pos = {}
        for L, ws in self.by_len.items():
            for k, w in enumerate(ws): self.pos[w] = k
    def match(self, pattern):
        L = len(pattern)
        if L not in self.all: return 0
        mask = self.all[L]; m = self.masks[L]
        for i, ch in enumerate(pattern):
            if ch != '.':
                mask &= m[i][ord(ch) - 97]
                if not mask: return 0
        return mask
    def words_of(self, L, mask, limit=None):
        ws = self.by_len[L]; out = []
        while mask:
            low = mask & -mask; k = low.bit_length() - 1
            out.append(ws[k]); mask ^= low
            if limit and len(out) >= limit: break
        return out

def slots_of(grid):
    n = len(grid); slots = []
    for r in range(n):
        c = 0
        while c < n:
            if grid[r][c] != '#':
                s = c
                while c < n and grid[r][c] != '#': c += 1
                slots.append(('A', [(r, x) for x in range(s, c)]))
            else: c += 1
    for c in range(n):
        r = 0
        while r < n:
            if grid[r][c] != '#':
                s = r
                while r < n and grid[r][c] != '#': r += 1
                slots.append(('D', [(x, c) for x in range(s, r)]))
            else: r += 1
    return slots

def valid_pattern(grid, maxlen):
    n = len(grid)
    for d, cells in slots_of(grid):
        if len(cells) < 3 or len(cells) > maxlen: return False
    # connected white squares
    whites = [(r, c) for r in range(n) for c in range(n) if grid[r][c] != '#']
    if not whites: return False
    seen = {whites[0]}; st = [whites[0]]
    while st:
        r, c = st.pop()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (r + dr, c + dc)
            if 0 <= q[0] < n and 0 <= q[1] < n and grid[q[0]][q[1]] != '#' and q not in seen:
                seen.add(q); st.append(q)
    return len(seen) == len(whites)

def random_pattern(n, blacks, maxlen, rng, tries=60):
    """Symmetric black squares: first break every run longer than maxlen, then add a few more at random.
    Never makes a word shorter than 3, a 2x2 block of black squares, or a cut-off part of the grid."""
    def ok_at(g, r, c):
        r2, c2 = n - 1 - r, n - 1 - c
        if g[r][c] == '#' or g[r2][c2] == '#': return False
        g[r][c] = g[r2][c2] = '#'
        good = True
        for (a, b) in ((r, c), (r2, c2)):
            for dr in (-1, 0):
                for dc in (-1, 0):
                    q = [(a + dr + i, b + dc + j) for i in (0, 1) for j in (0, 1)]
                    if all(0 <= x < n and 0 <= y < n and g[x][y] == '#' for x, y in q): good = False
        if good:
            for d, cells in slots_of(g):
                if len(cells) < 3: good = False; break
        if good: good = valid_pattern(g, 99)
        if not good: g[r][c] = g[r2][c2] = '.'
        return good
    for _ in range(tries):
        g = [['.'] * n for _ in range(n)]
        target = rng.randint(blacks[0], blacks[1])
        stuck = False
        for _ in range(400):
            long = [cells for d, cells in slots_of(g) if len(cells) > maxlen]
            if not long: break
            cells = rng.choice(long)
            opts = list(range(len(cells))); rng.shuffle(opts)
            if not any(ok_at(g, *cells[k]) for k in opts): stuck = True; break
        if stuck or any(len(c) > maxlen for d, c in slots_of(g)): continue
        cnt = sum(row.count('#') for row in g)
        cells = [(r, c) for r in range(n) for c in range(n)]; rng.shuffle(cells)
        for (r, c) in cells:
            if cnt >= target: break
            if ok_at(g, r, c): cnt = sum(row.count('#') for row in g)
        if blacks[0] <= cnt <= blacks[1] + 1:
            return g
    return None

def fill(grid, index, rng, used_count, deadline):
    """Constraint fill: every slot keeps a bitmask of words that still fit; each guess is propagated to the
    crossing slots until nothing changes (arc consistency), so dead ends show up right away."""
    n = len(grid)
    slots = [cells for d, cells in slots_of(grid)]
    lens = [len(c) for c in slots]
    cross = [[] for _ in slots]          # cross[s][k] = (t, j): slot t crosses slot s at s's k-th / t's j-th square
    at = {}
    for si, cells in enumerate(slots):
        for k, rc in enumerate(cells): at.setdefault(rc, []).append((si, k))
    for si, cells in enumerate(slots):
        row = []
        for k, rc in enumerate(cells):
            o = [x for x in at[rc] if x[0] != si]
            row.append(o[0] if o else None)
        cross[si] = row
    for L in set(lens):
        if L not in index.all: return None
    masks = [index.all[L] for L in lens]
    M = index.masks
    def letters(si, k, mask):
        m = M[lens[si]][k]
        return [c for c in range(26) if mask & m[c]]
    def propagate(masks, queue):
        while queue:
            s = queue.pop()
            ms = masks[s]
            for k, x in enumerate(cross[s]):
                if x is None: continue
                t, j = x
                allow = 0; mt = M[lens[t]][j]; ml = M[lens[s]][k]
                for c in range(26):
                    if ms & ml[c]: allow |= mt[c]
                nm = masks[t] & allow
                if nm != masks[t]:
                    if not nm: return False
                    masks[t] = nm; queue.append(t)
        return True
    if not propagate(masks, list(range(len(slots)))): return None
    nodes = [0]
    def rec(masks):
        if time.time() > deadline or nodes[0] > NODES: return None
        best, bc = None, 1 << 60
        for si, m in enumerate(masks):
            c = m.bit_count()
            if 1 < c < bc: best, bc = si, c
        if best is None:
            ws = [index.by_len[lens[si]][m.bit_length() - 1] for si, m in enumerate(masks)]
            return masks if len(set(ws)) == len(ws) else None
        cands = index.words_of(lens[best], masks[best], limit=300)
        cands.sort(key=lambda w: -(index.score[w] - 0.2 * used_count.get(w, 0) + rng.random() * 0.9))
        taken = set()
        for si, m in enumerate(masks):
            if m.bit_count() == 1: taken.add(index.by_len[lens[si]][m.bit_length() - 1])
        tried = []
        for w in cands[:LOOK]:
            if w in taken: continue
            nm = list(masks)
            nm[best] = 1 << index.pos[w]
            if propagate(nm, [best]):
                # prefer words that leave the crossing words the most choices
                room = sum(math.log2(m.bit_count()) for m in nm)
                tried.append((room + index.score[w] + rng.random(), nm))
        tried.sort(key=lambda x: -x[0])
        for _, nm in tried[:12]:
            nodes[0] += 1
            r = rec(nm)
            if r: return r
            if time.time() > deadline or nodes[0] > NODES: return None
        return None
    res = rec(masks)
    if not res: return None
    letters_at = {}
    words = []
    for si, m in enumerate(res):
        w = index.by_len[lens[si]][m.bit_length() - 1]; words.append(w)
        for k, rc in enumerate(slots[si]): letters_at[rc] = w[k]
    out = [''.join('#' if grid[r][c] == '#' else letters_at[(r, c)] for c in range(n)) for r in range(n)]
    return out, words

def build(kind, day, count, words, rng, used_count, log):
    q, f = MIN_Q[day], MIN_F[day]
    if kind == 'mini':
        n, blacks, maxlen = 5, MINI_BLACKS[day], 5
        q, f = min(q, 75) + 5, f + 0.3      # minis stay friendly
    else:
        n, blacks, maxlen = BIG_SIZE[day], BIG_BLACKS[day], BIG_MAXLEN[day]
    pool = {w: v[1] + v[0] / 40.0 for w, v in words.items() if v[0] >= q and v[1] >= f and len(w) <= maxlen}
    index = Index(list(pool), pool)
    out, seen = [], set()
    t0 = time.time(); fails = 0
    while len(out) < count:
        pat = random_pattern(n, blacks, maxlen, rng)
        if not pat: fails += 1; continue
        res = fill(pat, index, rng, used_count, time.time() + (2.0 if kind == 'mini' else 20.0 if n > 15 else 10.0))
        if not res: fails += 1; continue
        grid, ws = res
        key = '|'.join(grid)
        if key in seen: continue
        seen.add(key)
        for w in ws: used_count[w] = used_count.get(w, 0) + 1
        out.append(grid)
        if len(out) % 20 == 0:
            log('%s day %d: %d/%d (%.0fs, %d misses)' % (kind, day, len(out), count, time.time() - t0, fails))
    return out

def job(arg):
    kind, day, count, seed, have = arg
    words = load_words()
    rng = random.Random(seed * 31 + day * 7 + (0 if kind == 'mini' else 1000) + len(have))
    used = {}
    for g in have:
        for d, cells in slots_of(g):
            w = ''.join(g[r][c] for r, c in cells); used[w] = used.get(w, 0) + 1
    t0 = time.time()
    out = build(kind, day, count, words, rng, used, lambda s: print(s, flush=True))
    return '%s%d' % (kind, day), out, time.time() - t0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--weeks', type=int, default=160)
    ap.add_argument('--out', default='/tmp/xw-grids.json')
    ap.add_argument('--kinds', default='mini,big')
    ap.add_argument('--days', default='0,1,2,3,4,5,6')
    ap.add_argument('--seed', type=int, default=20261012)
    ap.add_argument('--procs', type=int, default=4)
    a = ap.parse_args()
    res = json.load(open(a.out)) if os.path.exists(a.out) else {}
    jobs = []
    for kind in a.kinds.split(','):
        for day in map(int, a.days.split(',')):
            have = res.get('%s%d' % (kind, day), [])
            if len(have) < a.weeks: jobs.append((kind, day, a.weeks - len(have), a.seed, have))
    jobs.sort(key=lambda j: j[0] == 'mini')    # slow ones first
    from multiprocessing import Pool
    with Pool(a.procs) as pool:
        for k, grids, secs in pool.imap_unordered(job, jobs):
            res[k] = res.get(k, []) + grids
            json.dump(res, open(a.out, 'w'))
            print('saved %s: %d (%.0fs)' % (k, len(res[k]), secs), flush=True)

if __name__ == '__main__':
    main()
