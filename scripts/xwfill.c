/* xwfill: fast crossword grid filler, driven by scripts/build-crosswords.py.

   Build:  gcc -O2 -o xwfill scripts/xwfill.c -lm
   Run:    xwfill WORDS [seed]
   WORDS:  one "word score" per line (a-z, score: higher = better fill).

   Commands on stdin, one per line; every command gets one reply line:
     use WORD N          WORD has been used N times already (each use costs `pen` in the word's rank)
     set NAME VALUE      pen | noise | look | beta | tries | scan | deep
     fill NODES ROWS     ROWS: grid rows joined by '/', '#' = black, '.' = open, a-z = fixed letter
                         reply "ok ROWS NODES" or "fail NODES"

   Method: every slot keeps a bitset of the words that still fit. Each square keeps the set of letters both
   its words still allow; a change on either side filters the crossing slot (arc consistency), so dead ends
   show up at once. Search picks the slot with the fewest words left (weighted by how often it has failed),
   ranks its candidates by score plus a little noise, looks one step ahead to prefer words that leave the
   crossings the most room, and restarts with growing node limits. No word is used twice in a grid. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <math.h>
#include <time.h>

typedef uint64_t u64;
#define MAXL 21
#define MAXCELLS (MAXL * MAXL)
#define MAXSLOTS 600
#define MAXK 64

/* ---- words ---- */
static int nw[MAXL + 1], W64[MAXL + 1];
static uint8_t *wl[MAXL + 1];          /* letters, nw*L */
static float *wsc[MAXL + 1];           /* score */
static int *wuse[MAXL + 1];            /* times used */
static u64 *B[MAXL + 1];               /* B[L][(pos*26+c)*W + x] */

static double pen = 0.15, noise = 0.6, beta = 0.25;
static int look = 8, tries = 30;

static u64 rs = 88172645463325252ULL;
static inline u64 rnd(void) { rs ^= rs << 13; rs ^= rs >> 7; rs ^= rs << 17; return rs; }
static inline double rnd01(void) { return (rnd() >> 11) * (1.0 / 9007199254740992.0); }

/* hash of all words -> (L, idx) */
static int hsize; static int *hL, *hI;
static uint64_t hstr(const char *s) { uint64_t h = 1469598103934665603ULL; while (*s) { h ^= (uint8_t)*s++; h *= 1099511628211ULL; } return h; }
static int wordeq(int L, int i, const char *s) { for (int k = 0; k < L; k++) if (s[k] - 'a' != wl[L][i * L + k]) return 0; return s[L] == 0; }
static void hput(int L, int i) {
    char buf[MAXL + 1]; for (int k = 0; k < L; k++) buf[k] = 'a' + wl[L][i * L + k]; buf[L] = 0;
    uint64_t h = hstr(buf) & (hsize - 1);
    while (hL[h]) h = (h + 1) & (hsize - 1);
    hL[h] = L; hI[h] = i;
}
static int hget(const char *s, int *L, int *i) {
    int n = strlen(s); if (n < 2 || n > MAXL) return 0;
    uint64_t h = hstr(s) & (hsize - 1);
    while (hL[h]) { if (hL[h] == n && wordeq(n, hI[h], s)) { *L = n; *i = hI[h]; return 1; } h = (h + 1) & (hsize - 1); }
    return 0;
}

typedef struct { char w[MAXL + 1]; int L; float s; } Raw;
static int rawcmp(const void *a, const void *b) {
    const Raw *x = a, *y = b;
    if (x->L != y->L) return x->L - y->L;
    if (x->s != y->s) return x->s > y->s ? -1 : 1;
    return strcmp(x->w, y->w);
}

static void load(const char *path) {
    FILE *f = fopen(path, "r"); if (!f) { perror(path); exit(1); }
    int cap = 1 << 16, n = 0; Raw *r = malloc(sizeof(Raw) * cap);
    char w[256]; float s;
    while (fscanf(f, "%255s %f", w, &s) == 2) {
        int L = strlen(w), ok = L >= 2 && L <= MAXL;
        for (int k = 0; ok && k < L; k++) if (w[k] < 'a' || w[k] > 'z') ok = 0;
        if (!ok) continue;
        if (n == cap) { cap *= 2; r = realloc(r, sizeof(Raw) * cap); }
        strcpy(r[n].w, w); r[n].L = L; r[n].s = s; n++;
    }
    fclose(f);
    qsort(r, n, sizeof(Raw), rawcmp);
    /* drop duplicates */
    int m = 0;
    for (int i = 0; i < n; i++) if (!m || strcmp(r[m - 1].w, r[i].w)) r[m++] = r[i];
    n = m;
    for (int i = 0; i < n; i++) nw[r[i].L]++;
    for (int L = 2; L <= MAXL; L++) {
        W64[L] = (nw[L] + 63) / 64;
        wl[L] = calloc((size_t)nw[L] * L + 1, 1);
        wsc[L] = calloc(nw[L] + 1, sizeof(float));
        wuse[L] = calloc(nw[L] + 1, sizeof(int));
        B[L] = calloc((size_t)L * 26 * W64[L] + 1, sizeof(u64));
    }
    int idx[MAXL + 1] = {0};
    for (int i = 0; i < n; i++) {
        int L = r[i].L, k = idx[L]++;
        wsc[L][k] = r[i].s;
        for (int p = 0; p < L; p++) {
            int c = r[i].w[p] - 'a'; wl[L][k * L + p] = c;
            B[L][(size_t)(p * 26 + c) * W64[L] + (k >> 6)] |= 1ULL << (k & 63);
        }
    }
    hsize = 1; while (hsize < 2 * n + 16) hsize <<= 1;
    hL = calloc(hsize, sizeof(int)); hI = calloc(hsize, sizeof(int));
    for (int L = 2; L <= MAXL; L++) for (int k = 0; k < nw[L]; k++) hput(L, k);
    free(r);
}

/* ---- grid ---- */
static int R, C, ncell, nslot;
static int slen[MAXSLOTS], scell[MAXSLOTS][MAXL], sx[MAXSLOTS][MAXL], sxp[MAXSLOTS][MAXL], off[MAXSLOTS];
static int total64;
static char grid[MAXCELLS];
static double wdeg[MAXSLOTS];

typedef struct { u64 *dom; uint32_t *cm; uint8_t *asg; int *word; } St;
static St *stk; static int stkcap;
static St scratch;
static int stk_t64;
static int inq[MAXSLOTS], q[MAXSLOTS * 4];

static void st_alloc(St *s) {
    s->dom = malloc(sizeof(u64) * (total64 + 1)); s->cm = malloc(sizeof(uint32_t) * MAXCELLS);
    s->asg = malloc(MAXSLOTS); s->word = malloc(sizeof(int) * MAXSLOTS);
}
static void st_copy(St *d, const St *s) {
    memcpy(d->dom, s->dom, sizeof(u64) * total64); memcpy(d->cm, s->cm, sizeof(uint32_t) * ncell);
    memcpy(d->asg, s->asg, nslot); memcpy(d->word, s->word, sizeof(int) * nslot);
}

static int parse_grid(const char *rows) {
    R = 0; C = -1; int c = 0;
    for (const char *p = rows;; p++) {
        if (*p == '/' || *p == 0 || *p == '\n' || *p == ' ') {
            if (C < 0) C = c; else if (c != C) return 0;
            R++; c = 0;
            if (*p != '/') break;
        } else { if (R * MAXL + c >= MAXCELLS || c >= MAXL) return 0; grid[R * MAXL + c] = *p; c++; }
    }
    if (R < 2 || C < 2 || R > MAXL) return 0;
    /* compact to R*C */
    char g2[MAXCELLS];
    for (int r = 0; r < R; r++) for (int x = 0; x < C; x++) g2[r * C + x] = grid[r * MAXL + x];
    memcpy(grid, g2, R * C); ncell = R * C;
    nslot = 0;
    int aslot[MAXCELLS], apos[MAXCELLS], dslot[MAXCELLS], dpos[MAXCELLS];
    for (int i = 0; i < ncell; i++) aslot[i] = dslot[i] = -1;
    for (int r = 0; r < R; r++) for (int x = 0; x < C;) {
        if (grid[r * C + x] == '#') { x++; continue; }
        int s = x; while (x < C && grid[r * C + x] != '#') x++;
        if (x - s >= 2) { if (nslot >= MAXSLOTS) return 0; slen[nslot] = x - s;
            for (int k = 0; k < x - s; k++) { scell[nslot][k] = r * C + s + k; aslot[r * C + s + k] = nslot; apos[r * C + s + k] = k; }
            nslot++; }
    }
    for (int x = 0; x < C; x++) for (int r = 0; r < R;) {
        if (grid[r * C + x] == '#') { r++; continue; }
        int s = r; while (r < R && grid[r * C + x] != '#') r++;
        if (r - s >= 2) { if (nslot >= MAXSLOTS) return 0; slen[nslot] = r - s;
            for (int k = 0; k < r - s; k++) { scell[nslot][k] = (s + k) * C + x; dslot[(s + k) * C + x] = nslot; dpos[(s + k) * C + x] = k; }
            nslot++; }
    }
    for (int s = 0; s < nslot; s++) for (int k = 0; k < slen[s]; k++) {
        int cell = scell[s][k];
        if (aslot[cell] == s) { sx[s][k] = dslot[cell]; sxp[s][k] = dpos[cell]; }
        else { sx[s][k] = aslot[cell]; sxp[s][k] = apos[cell]; }
    }
    total64 = 0;
    for (int s = 0; s < nslot; s++) { off[s] = total64; total64 += W64[slen[s]]; }
    return 1;
}

static inline int cnt(const u64 *D, int W) { int c = 0; for (int x = 0; x < W; x++) c += __builtin_popcountll(D[x]); return c; }
static inline int first_bit(const u64 *D, int W) { for (int x = 0; x < W; x++) if (D[x]) return x * 64 + __builtin_ctzll(D[x]); return -1; }

/* keep only words of slot s whose letter at pos j is in mask; returns -1 if empty, 1 if changed, 0 if not */
static int filter(St *st, int s, int j, uint32_t mask) {
    int L = slen[s], W = W64[L]; u64 *D = st->dom + off[s];
    uint32_t inv = (~mask) & 0x3ffffff;
    int use_inv = __builtin_popcount(inv) < __builtin_popcount(mask);
    int lets[26], nl = 0; uint32_t m = use_inv ? inv : mask;
    for (int c = 0; c < 26; c++) if (m >> c & 1) lets[nl++] = c;
    const u64 *base = B[L] + (size_t)j * 26 * W;
    int changed = 0; u64 any = 0;
    for (int x = 0; x < W; x++) {
        u64 d = D[x]; if (!d) continue;
        u64 a = 0;
        for (int i = 0; i < nl; i++) a |= base[(size_t)lets[i] * W + x];
        u64 nd = use_inv ? (d & ~a) : (d & a);
        if (nd != d) { D[x] = nd; changed = 1; }
        any |= nd;
    }
    if (!any) return -1;
    return changed;
}

/* letters each position of slot s still allows */
static int support(St *st, int s, uint32_t *sup) {
    int L = slen[s], W = W64[L]; u64 *D = st->dom + off[s];
    int n = cnt(D, W);
    if (!n) return 0;
    for (int k = 0; k < L; k++) sup[k] = 0;
    if (n <= 4 * W + 32) {
        for (int x = 0; x < W; x++) { u64 d = D[x]; while (d) { int b = __builtin_ctzll(d); d &= d - 1;
            const uint8_t *w = wl[L] + (size_t)(x * 64 + b) * L; for (int k = 0; k < L; k++) sup[k] |= 1u << w[k]; } }
    } else {
        for (int k = 0; k < L; k++) {
            uint32_t cm = st->cm[scell[s][k]];
            const u64 *base = B[L] + (size_t)k * 26 * W;
            for (int c = 0; c < 26; c++) if (cm >> c & 1) {
                const u64 *b = base + (size_t)c * W;
                for (int x = 0; x < W; x++) if (D[x] & b[x]) { sup[k] |= 1u << c; break; }
            }
        }
    }
    return n;
}

static int qn;
static void push(int s) { if (!inq[s]) { inq[s] = 1; q[qn++] = s; } }
static void clearq(void) { while (qn) inq[q[--qn]] = 0; }

/* arc consistency + singleton handling; returns 0 on wipeout */
static int settle(St *st) {
    for (;;) {
        while (qn) {
            int s = q[--qn]; inq[s] = 0;
            uint32_t sup[MAXL];
            if (!support(st, s, sup)) { wdeg[s] += 1; clearq(); return 0; }
            for (int k = 0; k < slen[s]; k++) {
                int cell = scell[s][k];
                uint32_t nm = st->cm[cell] & sup[k];
                if (!nm) { wdeg[s] += 1; clearq(); return 0; }
                if (nm != st->cm[cell]) {
                    st->cm[cell] = nm;
                    int t = sx[s][k];
                    if (t >= 0) {
                        int r = filter(st, t, sxp[s][k], nm);
                        if (r < 0) { wdeg[t] += 1; wdeg[s] += 0.5; clearq(); return 0; }
                        if (r) push(t);
                    }
                }
            }
        }
        /* newly forced words: mark them and take them out of every other slot of the same length */
        int any = 0;
        for (int s = 0; s < nslot; s++) {
            if (st->asg[s]) continue;
            int L = slen[s], W = W64[L]; u64 *D = st->dom + off[s];
            if (cnt(D, W) != 1) continue;
            int w = first_bit(D, W);
            st->asg[s] = 1; st->word[s] = w; any = 1;
            for (int t = 0; t < nslot; t++) {
                if (t == s || slen[t] != L) continue;
                u64 *E = st->dom + off[t];
                if (E[w >> 6] >> (w & 63) & 1) {
                    if (st->asg[t]) { wdeg[s] += 1; clearq(); return 0; }
                    E[w >> 6] &= ~(1ULL << (w & 63));
                    if (!cnt(E, W)) { wdeg[t] += 1; clearq(); return 0; }
                    push(t);
                }
            }
        }
        if (!any && !qn) return 1;
    }
}

typedef struct { double k; int w; } Cand;
static Cand *cand;
static int scan = 150, deep = 0;
static int candcmp(const void *a, const void *b) { double x = ((const Cand *)a)->k, y = ((const Cand *)b)->k; return x < y ? 1 : x > y ? -1 : 0; }
static long nodes, limit;
static int soldepth;
static double deadline;
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec * 1e-9; }

static void assign(St *st, int s, int w) {
    u64 *D = st->dom + off[s]; memset(D, 0, sizeof(u64) * W64[slen[s]]);
    D[w >> 6] = 1ULL << (w & 63);
    push(s);
}

static double room(St *st) {
    double r = 0;
    for (int s = 0; s < nslot; s++) if (!st->asg[s]) r += log2((double)cnt(st->dom + off[s], W64[slen[s]]));
    return r;
}

/* returns 1 solved, 0 exhausted, -1 out of budget */
static int search(int depth) {
    St *st = &stk[depth];
    int best = -1; double bv = 1e300;
    for (int s = 0; s < nslot; s++) {
        if (st->asg[s]) continue;
        double v = cnt(st->dom + off[s], W64[slen[s]]) / wdeg[s];
        if (v < bv) { bv = v; best = s; }
    }
    if (best < 0) { soldepth = depth; return 1; }
    int L = slen[best], W = W64[L]; u64 *D = st->dom + off[best];
    int K = look > MAXK ? MAXK : look;
    int cw[MAXK]; double rk[MAXK]; int ord[MAXK], no = 0;
    if (deep) {
        /* rank every candidate by score + noise - reuse penalty, then look one full step ahead:
           skip candidates that wipe out, prefer ones that leave the most room */
        int nc = 0;
        for (int x = 0; x < W; x++) { u64 d = D[x]; while (d) { int b = __builtin_ctzll(d); d &= d - 1; int w = x * 64 + b;
            cand[nc].w = w; cand[nc].k = wsc[L][w] - pen * wuse[L][w] + noise * rnd01(); nc++; } }
        if (nc > 1) qsort(cand, nc, sizeof(Cand), candcmp);
        for (int i = 0; i < nc && i < scan && no < K; i++) {
            st_copy(&scratch, st); assign(&scratch, best, cand[i].w);
            if (!settle(&scratch)) continue;
            cw[no] = cand[i].w; rk[no] = cand[i].k + beta * room(&scratch); ord[no] = no; no++;
        }
        for (int a = 1; a < no; a++) { int v = ord[a], b = a; while (b > 0 && rk[ord[b - 1]] < rk[v]) { ord[b] = ord[b - 1]; b--; } ord[b] = v; }
    } else {
        /* rank = score + noise - reuse penalty + beta * room left in the crossing slots (log2 of their word counts) */
        static double lg[MAXL][26];
        for (int k = 0; k < L; k++) {
            int t = sx[best][k];
            for (int c = 0; c < 26; c++) lg[k][c] = -1e9;
            uint32_t cm = st->cm[scell[best][k]];
            if (t < 0 || st->asg[t]) { for (int c = 0; c < 26; c++) if (cm >> c & 1) lg[k][c] = 0; continue; }
            int Lt = slen[t], Wt = W64[Lt], j = sxp[best][k]; const u64 *E = st->dom + off[t];
            for (int c = 0; c < 26; c++) if (cm >> c & 1) {
                const u64 *bb = B[Lt] + (size_t)(j * 26 + c) * Wt; int n = 0;
                for (int x = 0; x < Wt; x++) n += __builtin_popcountll(E[x] & bb[x]);
                if (n) lg[k][c] = log2((double)n);
            }
        }
        for (int x = 0; x < W; x++) { u64 d = D[x]; while (d) { int b = __builtin_ctzll(d); d &= d - 1; int w = x * 64 + b;
            const uint8_t *lt = wl[L] + (size_t)w * L; double rm = 0;
            for (int k = 0; k < L; k++) rm += lg[k][lt[k]];
            if (rm < -1e8) continue;
            double key = wsc[L][w] - pen * wuse[L][w] + noise * rnd01() + beta * rm;
            if (no < K) { int i = no++; while (i > 0 && rk[i - 1] < key) { rk[i] = rk[i - 1]; cw[i] = cw[i - 1]; i--; } rk[i] = key; cw[i] = w; }
            else if (key > rk[K - 1]) { int i = K - 1; while (i > 0 && rk[i - 1] < key) { rk[i] = rk[i - 1]; cw[i] = cw[i - 1]; i--; } rk[i] = key; cw[i] = w; }
        } }
        for (int i = 0; i < no; i++) ord[i] = i;
    }
    for (int i = 0; i < no; i++) {
        if (++nodes > limit) return -1;
        if ((nodes & 255) == 0 && now() > deadline) return -1;
        St *nx = &stk[depth + 1];
        st_copy(nx, st); assign(nx, best, cw[ord[i]]);
        if (!settle(nx)) continue;
        int r = search(depth + 1);
        if (r) return r;
    }
    return 0;
}

static int luby(int i) { /* 1 1 2 1 1 2 4 ... */
    for (int k = 1; k < 32; k++) if (i == (1 << k) - 1) return 1 << (k - 1);
    for (int k = 1;; k++) if ((1 << (k - 1)) <= i && i < (1 << k) - 1) return luby(i - (1 << (k - 1)) + 1);
}

static void do_fill(long budget, double secs, const char *rows) {
    if (!parse_grid(rows)) { printf("fail 0 badgrid\n"); return; }
    for (int s = 0; s < nslot; s++) if (nw[slen[s]] == 0) { printf("fail 0 nolen%d\n", slen[s]); return; }
    if (stkcap < nslot + 2 || !stk || total64 > stk_t64) {
        for (int i = 0; i < stkcap; i++) { free(stk[i].dom); free(stk[i].cm); free(stk[i].asg); free(stk[i].word); }
        free(stk); free(scratch.dom); free(scratch.cm); free(scratch.asg); free(scratch.word);
        stkcap = nslot + 2; stk_t64 = total64; stk = malloc(sizeof(St) * stkcap);
        for (int i = 0; i < stkcap; i++) st_alloc(&stk[i]);
        st_alloc(&scratch);
    }
    St *st = &stk[0];
    for (int s = 0; s < nslot; s++) {
        u64 *D = st->dom + off[s]; int L = slen[s], W = W64[L];
        for (int x = 0; x < W; x++) D[x] = ~0ULL;
        if (nw[L] & 63) D[W - 1] = (1ULL << (nw[L] & 63)) - 1;
        st->asg[s] = 0; wdeg[s] = 1;
    }
    for (int i = 0; i < ncell; i++) st->cm[i] = grid[i] >= 'a' && grid[i] <= 'z' ? 1u << (grid[i] - 'a') : 0x3ffffff;
    qn = 0;
    for (int s = 0; s < nslot; s++) for (int k = 0; k < slen[s]; k++) if (st->cm[scell[s][k]] != 0x3ffffff)
        if (filter(st, s, k, st->cm[scell[s][k]]) < 0) { printf("fail 0\n"); return; }
    for (int s = 0; s < nslot; s++) push(s);
    if (!settle(st)) { printf("fail 0\n"); return; }
    nodes = 0; deadline = now() + secs;
    St root; st_alloc(&root); st_copy(&root, st);
    int res = -1; long used = 0;
    for (int t = 1; t <= tries && used < budget && now() < deadline; t++) {
        long lim = (long)luby(t) * (budget / 16 > 50 ? budget / 16 : 50);
        if (lim > budget - used) lim = budget - used;
        nodes = 0; limit = lim;
        if (t > 1) st_copy(st, &root);
        res = search(0);
        used += nodes > lim ? lim : nodes;
        if (res == 1) break;
        for (int s = 0; s < nslot; s++) wdeg[s] = 1 + (wdeg[s] - 1) * 0.5;
    }
    if (res != 1) { printf("fail %ld\n", used); free(root.dom); free(root.cm); free(root.asg); free(root.word); return; }
    St *sol = &stk[soldepth];
    char out[MAXCELLS];
    for (int i = 0; i < ncell; i++) out[i] = '#';
    for (int s = 0; s < nslot; s++) {
        int L = slen[s], w = sol->word[s];
        for (int k = 0; k < L; k++) out[scell[s][k]] = 'a' + wl[L][(size_t)w * L + k];
    }
    for (int s = 0; s < nslot; s++) wuse[slen[s]][sol->word[s]]++;
    printf("ok ");
    for (int r = 0; r < R; r++) { if (r) putchar('/'); fwrite(out + r * C, 1, C, stdout); }
    printf(" %ld\n", used);
    free(root.dom); free(root.cm); free(root.asg); free(root.word);
}

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "usage: xwfill WORDS [seed]\n"); return 2; }
    load(argv[1]);
    { int mx = 1; for (int L = 2; L <= MAXL; L++) if (nw[L] > mx) mx = nw[L]; cand = malloc(sizeof(Cand) * mx); }
    if (argc > 2) { rs ^= strtoull(argv[2], 0, 10) * 0x9E3779B97F4A7C15ULL; if (!rs) rs = 1; for (int i = 0; i < 10; i++) rnd(); }
    static char line[1 << 16];
    while (fgets(line, sizeof line, stdin)) {
        char cmd[16], a[1 << 15]; double v; long n;
        if (sscanf(line, "%15s", cmd) != 1) continue;
        if (!strcmp(cmd, "use") && sscanf(line, "%*s %s %ld", a, &n) == 2) {
            int L, i; if (hget(a, &L, &i)) wuse[L][i] = n; printf("ok\n");
        } else if (!strcmp(cmd, "set") && sscanf(line, "%*s %s %lf", a, &v) == 2) {
            if (!strcmp(a, "pen")) pen = v; else if (!strcmp(a, "noise")) noise = v;
            else if (!strcmp(a, "look")) look = (int)v; else if (!strcmp(a, "beta")) beta = v;
            else if (!strcmp(a, "tries")) tries = (int)v; else if (!strcmp(a, "scan")) scan = (int)v;
            else if (!strcmp(a, "deep")) deep = (int)v;
            printf("ok\n");
        } else if (!strcmp(cmd, "fill")) {
            double secs = 60; char rows[4096];
            if (sscanf(line, "%*s %ld %s %lf", &n, rows, &secs) < 2) { printf("fail 0 usage\n"); }
            else do_fill(n, secs, rows);
        } else printf("err\n");
        fflush(stdout);
    }
    return 0;
}
