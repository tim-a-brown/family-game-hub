#!/usr/bin/env python3
"""Build the crossword bank: daily mini (5x5) and big grids (15x15 Monday-Saturday, 21x21 Sunday), harder from
Monday to Saturday, Sunday at about Friday level.

Grids only (letters and black squares); the clues come from scripts/crossword-clues/*.json and are joined in by
scripts/pack-crosswords.py. Run:  python3 scripts/build-crosswords.py --weeks 160 --out /tmp/xw-grids.json
Output: {"mini0": [[row, ...], ...], ..., "big6": [...]}, 0 = Monday. Re-running tops up whatever is missing.

Word list: the Crossword Nexus Collaborative Word List (MIT), scored for how familiar each entry is (wordfreq).
Monday uses well-known words and ranks familiar ones first; each day after that the pool widens and the ranking
leans more on the list's own quality score. Grids follow newspaper rules: rotational symmetry, every white square
in an across and a down word, words of 3+ letters, all white squares connected, no 2x2 black blocks in the big
grids, no word twice in a grid.

The filling is done by scripts/xwfill.c (compiled on first use with gcc into the temp folder).
"""
import argparse, hashlib, json, os, random, re, subprocess, sys, tempfile, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DICT_URL = 'https://raw.githubusercontent.com/Crossword-Nexus/collaborative-word-list/main/xwordlist.dict'
SCORE_VERSION = 3       # bump when the scoring in load_words changes, to rebuild the cached scores

def load_words(path=None):
    """word -> (quality, familiarity, words). Quality: the Collaborative Word List score (MIT licence, Crossword
    Nexus), 50 = passable, 80+ = good fill. Familiarity: wordfreq zipf of the word, or of the phrase split into
    words (ICECREAM -> "ice cream", a little lower for each extra word), so Monday gets entries everyone knows.
    Words: 1 for a dictionary word or name, else how many words the phrase splits into."""
    path = path or os.path.join(os.environ.get('TMPDIR', '/tmp'), 'xwordlist.dict')
    if not os.path.exists(path):
        subprocess.run(['curl', '-sL', '--max-time', '120', '-o', path, DICT_URL], check=True)
    cache = path + '.scored.json'
    if os.path.exists(cache) and os.path.getmtime(cache) > os.path.getmtime(path):
        data = json.load(open(cache))
        if data.get('_version') == [SCORE_VERSION, sorted(SKIP), list(BAD_PARTS), sorted(SKIP_PARTS)]:
            return {w: tuple(v) for w, v in data['words'].items()}
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
        f = zipf_frequency(w, 'en'); nparts = 1
        if w not in known:
            parts = split(w)
            # a phrase: no grown-up bits, and how well known the phrase is (wordfreq scores a phrase about as
            # common as its rarest word, so take a little off for each extra word)
            if parts and len(parts) > 1 and any(x in SKIP_PARTS for x in parts): continue
            if parts and 1 < len(parts) <= 4 and len(w) >= 6:
                f = max(f, zipf_frequency(' '.join(parts), 'en') - 0.2 * (len(parts) - 1))
            if parts and len(parts) > 1: nparts = len(parts)
        out[w] = (q, round(f, 2), nparts)
    json.dump({'_version': [SCORE_VERSION, sorted(SKIP), list(BAD_PARTS), sorted(SKIP_PARTS)], 'words': out},
              open(cache, 'w'))
    return out

# Fine in a dictionary, not in a family puzzle
SKIP = set('''slave slaves slavery lube nazi nazis rape raped rapes rapist porn sexy sex sexual heroin cocaine meth
suicide abortion hitler genocide drunk drunks booze bong weed stoned whore hell damn crap pee poop butt boob boobs
nude nudes naked kinky erotic orgasm penis vagina breast breasts bra bras thong torture lynch lynched kkk isis
nsfw xxx lsd ecstasy opium stoner pothead hooker pimp stripper bimbo hussy slut ass asses arse thc jew jews bastard bastards
negro negroes gook spic chink dyke fag tranny retard retarded midget gypsy gypsies hooters stds std
sext sexts sexting toke tokes toker helluva murderer murderers corpse corpses satan satanic lust lusts lustful narc narcs teat teats fatwa allah srsly wentboom starreed megameta kalechip
'''.split())
BAD_PARTS = ('fuck', 'shit', 'cunt', 'bitch', 'pussy', 'whore', 'slut', 'porn', 'nigg', 'dildo', 'orgasm', 'jizz',
             'twat', 'wank', 'hitler', 'nazi', 'boob', 'penis', 'vagina', 'erotic', 'horny', 'semen', 'rapist')
SKIP_PARTS = SKIP | set('''sex anal cock dick tits nude naked rape raped kinky fag cum hump humping bang screw screwed
pot weed coke hash crack meth beer booze drunk wine vodka kill killer killed murder gun guns dead die died'''.split())

# Monday .. Sunday. Big grids: 15x15 Monday-Saturday (Friday and Saturday are open, NYT-themeless-style grids with
# 72 words or fewer), Sunday 21x21 at about Friday difficulty.
MIN_Q = [70, 70, 65, 60, 60, 60, 60]                # lowest list score in the pool
PHRASE_Q = 70                                       # lowest list score for a multi-word entry (the list's
                                                    # 60s are full of made-up phrases)
MIN_F = [2.8, 2.6, 2.4, 2.2, 2.0, 1.8, 2.0]         # lowest familiarity in the pool
FAM_W = [1.2, 1.0, 0.8, 0.6, 0.45, 0.3, 0.5]        # ranking: score/10 + FAM_W * familiarity
BIG_SIZE = [15, 15, 15, 15, 15, 15, 21]
BIG_BLACKS = [(36, 40), (36, 40), (35, 40), (34, 40), (32, 38), (32, 37), (74, 82)]
BIG_WORDS = [78, 78, 78, 76, 72, 72, 140]           # most entries allowed (NYT limits)
BIG_MAX3 = [18, 18, 16, 16, 14, 14, 30]             # most 3-letter entries
BIG_LONG = [4, 4, 4, 4, 6, 6, 10]                   # fewest entries of 8+ letters
BIG_MAXLEN = [15, 15, 15, 15, 15, 15, 15]
# Minis: 5x5, friendlier pool
MINI_Q = [80, 80, 80, 75, 75, 65, 75]
MINI_F = [3.6, 3.3, 3.0, 2.7, 2.4, 2.1, 2.5]
MINI_BLACKS = [(4, 6), (4, 6), (2, 4), (2, 4), (2, 4), (0, 2), (0, 2)]

# Vocabulary across the bank: a word already used somewhere gets a small ranking bonus (every distinct entry needs
# a hand-written clue), and a word used more than FREE_USES times in the same day's bank loses PEN per extra use.
PEN, FREE_USES, SEEN_BONUS = 0.03, 6, 0.5

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

def connected(g):
    n = len(g)
    whites = [(r, c) for r in range(n) for c in range(n) if g[r][c] != '#']
    if not whites: return False
    seen = {whites[0]}; st = [whites[0]]
    while st:
        r, c = st.pop()
        for q in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= q[0] < n and 0 <= q[1] < n and g[q[0]][q[1]] != '#' and q not in seen:
                seen.add(q); st.append(q)
    return len(seen) == len(whites)

def valid_pattern(grid, maxlen):
    for d, cells in slots_of(grid):
        if len(cells) < 3 or len(cells) > maxlen: return False
    return connected(grid)

def random_pattern(n, blacks, maxlen, rng, tries=60):
    """Mini grids. Symmetric black squares: first break every run longer than maxlen, then add a few more at
    random. Never makes a word shorter than 3, a 2x2 block of black squares, or a cut-off part of the grid."""
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
            return [''.join(row) for row in g]
    return None

def _runs(g):
    """every white run: (across?, row, col, length)"""
    n = len(g); out = []
    for r in range(n):
        c = 0
        while c < n:
            if g[r][c] == '#': c += 1; continue
            s = c
            while c < n and g[r][c] != '#': c += 1
            out.append((True, r, s, c - s))
    for c in range(n):
        r = 0
        while r < n:
            if g[r][c] == '#': r += 1; continue
            s = r
            while r < n and g[r][c] != '#': r += 1
            out.append((False, s, c, r - s))
    return out

def _line_ok(cells):
    k = 0
    for ch in list(cells) + ['#']:
        if ch == '#':
            if 0 < k < 3: return False
            k = 0
        else: k += 1
    return True

def _place(g, r, c):
    """black square at (r, c) and its 180-degree partner, if the grid stays legal"""
    n = len(g); r2, c2 = n - 1 - r, n - 1 - c
    if g[r][c] == '#' or g[r2][c2] == '#': return False
    g[r][c] = g[r2][c2] = '#'
    ok = True
    for (a, b) in ((r, c), (r2, c2)):
        for dr in (-1, 0):
            for dc in (-1, 0):
                if all(0 <= a + dr + i < n and 0 <= b + dc + j < n and g[a + dr + i][b + dc + j] == '#'
                       for i in (0, 1) for j in (0, 1)):
                    ok = False
    if ok: ok = all(_line_ok(g[x]) for x in {r, r2}) and all(_line_ok([g[x][y] for x in range(n)]) for y in {c, c2})
    if ok: ok = connected(g)
    if not ok: g[r][c] = g[r2][c2] = '.'
    return ok

def big_pattern(n, blacks, maxlen, maxwords, max3, minlong, rng, tries=200):
    """Newspaper-style grid: start open and keep splitting long runs (longer ones more likely), preferring cuts
    that leave 4-8 letter pieces, until the black-square count is reached. Keeps the grid only if the entry
    count, the number of 3-letter entries and the number of long entries look like a real puzzle."""
    def piece(k):
        return 0.6 if k == 0 else 0.35 if k == 3 else 1.0 if k <= 8 else 0.5
    for _ in range(tries):
        g = [['.'] * n for _ in range(n)]
        target = rng.randint(blacks[0], blacks[1])
        nb = bad = 0
        while bad < 300:
            rs = _runs(g)
            over = [x for x in rs if x[3] > maxlen]
            if not over and nb >= target: break
            pool = over or [x for x in rs if x[3] >= 7]
            if not pool: break
            across, r, c, L = rng.choices(pool, [(x[3] - 5) ** 2 for x in pool])[0]
            pos = [p for p in range(L) if (p == 0 or p >= 3) and (L - p - 1 == 0 or L - p - 1 >= 3)]
            if not pos: bad += 1; continue
            p = rng.choices(pos, [piece(p) * piece(L - p - 1) for p in pos])[0]
            if _place(g, *((r, c + p) if across else (r + p, c))): nb = sum(row.count('#') for row in g)
            else: bad += 1
        rs = _runs(g)
        if any(x[3] > maxlen for x in rs) or not (blacks[0] <= nb <= blacks[1] + 1): continue
        if len(rs) > maxwords or sum(x[3] == 3 for x in rs) > max3 or sum(x[3] >= 8 for x in rs) < minlong: continue
        return [''.join(row) for row in g]
    return None

# ---- the C filler ----

def filler_exe():
    src = os.path.join(ROOT, 'scripts', 'xwfill.c')
    exe = os.path.join(tempfile.gettempdir(), 'xwfill-' + hashlib.sha1(open(src, 'rb').read()).hexdigest()[:12])
    if not os.path.exists(exe):
        tmp = exe + '.%d' % os.getpid()
        if subprocess.run(['gcc', '-O2', '-march=native', '-o', tmp, src, '-lm']).returncode:
            subprocess.run(['gcc', '-O2', '-o', tmp, src, '-lm'], check=True)
        os.replace(tmp, exe)
    return exe

class Filler:
    """One xwfill process with one word pool loaded (word -> ranking value)."""
    def __init__(self, pool, seed):
        fd, self.path = tempfile.mkstemp(prefix='xwpool-', suffix='.txt')
        with os.fdopen(fd, 'w') as f:
            f.write(''.join('%s %.3f\n' % (w, v) for w, v in pool.items()))
        self.p = subprocess.Popen([filler_exe(), self.path, str(seed)], stdin=subprocess.PIPE,
                                  stdout=subprocess.PIPE, text=True)
    def cmd(self, line):
        self.p.stdin.write(line + '\n'); self.p.stdin.flush()
        return self.p.stdout.readline().split()
    def fill(self, grid, nodes, secs):
        r = self.cmd('fill %d %s %g' % (nodes, '/'.join(grid), secs))
        return r[1].split('/') if r and r[0] == 'ok' else None
    def close(self):
        self.p.stdin.close(); self.p.wait()
        try: os.unlink(self.path)
        except OSError: pass

def pool_for(kind, day, words):
    """the day's words -> ranking value (list score / 10 + FAM_W * familiarity)"""
    n, q, f = (5, MINI_Q[day], MINI_F[day]) if kind == 'mini' else (BIG_SIZE[day], MIN_Q[day], MIN_F[day])
    return {w: v[0] / 10.0 + FAM_W[day] * v[1] for w, v in words.items()
            if v[0] >= (max(q, PHRASE_Q) if v[2] > 1 else q) and v[1] >= f and len(w) <= n}

def build(kind, day, count, words, rng, used_count, log, seen_words=(), avoid=()):
    if kind == 'mini':
        n = 5
        new_pattern = lambda: random_pattern(5, MINI_BLACKS[day], 5, rng)
        nodes, secs = 5000, 2
    else:
        n = BIG_SIZE[day]
        maxlen = BIG_MAXLEN[day]
        new_pattern = lambda: big_pattern(n, BIG_BLACKS[day], maxlen, BIG_WORDS[day], BIG_MAX3[day], BIG_LONG[day], rng)
        nodes, secs = (40000, 8) if n <= 15 else (80000, 20)
    pool = pool_for(kind, day, words)
    fl = Filler(pool, rng.randrange(1 << 30))
    for k, v in (('pen', PEN), ('free', FREE_USES), ('bonus', SEEN_BONUS)): fl.cmd('set %s %g' % (k, v))
    for w, k in used_count.items():
        if w in pool: fl.cmd('use %s %d' % (w, k))
    for w in seen_words:
        if w in pool and w not in used_count: fl.cmd('seen %s' % w)
    out, seen = [], set()
    t0 = time.time(); fails = 0
    try:
        while len(out) < count:
            pat = new_pattern()
            if not pat: fails += 1; continue
            grid = fl.fill(pat, nodes, secs)
            if not grid: fails += 1; continue
            key = '|'.join(grid)
            if key in seen or key in avoid: continue
            seen.add(key)
            for d, cells in slots_of(grid):
                w = ''.join(grid[r][c] for r, c in cells); used_count[w] = used_count.get(w, 0) + 1
            out.append(grid)
            if kind == 'big' or len(out) % 40 == 0:
                log('%s day %d: %d/%d (%.0fs, %d misses)' % (kind, day, len(out), count, time.time() - t0, fails))
    finally:
        fl.close()
    return out

_words = None
def job(arg):
    global _words
    kind, day, count, seed, part, have, seen_words, avoid = arg
    if _words is None: _words = load_words()
    rng = random.Random(seed * 31 + day * 7 + (0 if kind == 'mini' else 1000) + len(have) * 7919 + part * 104729)
    used = {}
    for g in have:
        for d, cells in slots_of(g):
            w = ''.join(g[r][c] for r, c in cells); used[w] = used.get(w, 0) + 1
    t0 = time.time()
    out = build(kind, day, count, _words, rng, used, lambda s: print(s, flush=True), seen_words, set(avoid))
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
    words = load_words(); filler_exe()  # build the caches once, before the workers start
    # drop grids that no longer fit the word rules (after a filter change) or repeat a grid from another day
    seen = set()
    for k in sorted(res):
        m = re.fullmatch(r'(mini|big)(\d)', k)
        if not m: continue
        allowed = pool_for(m.group(1), int(m.group(2)), words); keep = []
        for g in res[k]:
            key = '|'.join(g)
            if key in seen or any(''.join(g[r][c] for r, c in cells) not in allowed for d, cells in slots_of(g)):
                continue
            seen.add(key); keep.append(g)
        if len(keep) < len(res[k]): print('%s: dropped %d old grids' % (k, len(res[k]) - len(keep)), flush=True)
        res[k] = keep
    from multiprocessing import Pool
    part = 0
    with Pool(a.procs) as pool:
        while True:
            # work comes in small batches so progress is saved often (and a stopped run resumes where it was)
            todo = []
            for kind in a.kinds.split(','):
                for day in map(int, a.days.split(',')):
                    need = a.weeks - len(res.get('%s%d' % (kind, day), []))
                    if need <= 0: continue
                    size = need if kind == 'mini' else 8 if BIG_SIZE[day] > 15 else 16
                    for k in range(0, need, size): todo.append([kind, day, min(size, need - k)])
            if not todo: break
            todo.sort(key=lambda j: (j[0] == 'mini', -BIG_SIZE[j[1]], j[1] in (0, 1, 2, 3)))  # slow ones first
            running = []
            while todo or running:
                while todo and len(running) < a.procs:
                    kind, day, cnt = todo.pop(0); part += 1
                    have = res.get('%s%d' % (kind, day), [])
                    seen_words = sorted({''.join(g[r][c] for r, c in cells) for grids in res.values() for g in grids
                                         for d, cells in slots_of(g)})
                    avoid = ['|'.join(g) for grids in res.values() for g in grids]
                    running.append(pool.apply_async(job, ((kind, day, cnt, a.seed, part, have, seen_words, avoid),)))
                time.sleep(0.5)
                for r in [r for r in running if r.ready()]:
                    running.remove(r)
                    k, grids, secs = r.get()
                    seen = {'|'.join(g) for grids_k in res.values() for g in grids_k}
                    new = [g for g in grids if '|'.join(g) not in seen]
                    res[k] = res.get(k, []) + new[:max(0, a.weeks - len(res.get(k, [])))]
                    tmp = a.out + '.tmp'
                    json.dump(res, open(tmp, 'w')); os.replace(tmp, a.out)
                    print('saved %s: %d (%.0fs)' % (k, len(res[k]), secs), flush=True)

if __name__ == '__main__':
    main()
