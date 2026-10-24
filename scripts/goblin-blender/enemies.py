# Goblin Defenders enemies (and the goblin hero), modelled after the original's pre-rendered 3-D sprites.
# Each builder makes its model in the current scene and returns {'root', 'pose': fn(phase 0..1), 'fly'}.
# Conventions: the creature faces +X, Z is up, its feet on the origin, 1 unit = 1 map cell; +Y is its left side.
# pose() sets absolute transforms, so it can be called for any phase in any order.
import math, random
from lib import *

TAU = math.tau

# ── Materials ────────────────────────────────────────────────────────────────
def EM():
    m = dict(M())
    m.update({
        'rust': metal('rust', '#8e5a3a', rough=0.62, metal=0.55, grime=0.75),
        'plate': metal('plate', '#6a727e', rough=0.36, metal=0.85, grime=0.5),
        'plateDark': metal('plateDark', '#363a42', rough=0.36, metal=0.85, grime=0.35),
        'blackPlate': metal('blackPlate', '#1a1b20', rough=0.28, metal=0.85, grime=0.25),
        'boneOld': painted('boneOld', '#efe3c6', '#c9b58e', scale=7, bump=0.25, rough=0.55, ao=0.85),
        'skullDemon': painted('skullDemon', '#cdb79a', '#8a7260', scale=6, bump=0.35, rough=0.5, ao=0.9),
        'ratFur': painted('ratFur', '#86593a', '#4e3020', scale=16, bump=0.6, rough=0.9),
        'ratBelly': painted('ratBelly', '#c09a72', '#9a7652', scale=12, bump=0.4, rough=0.85),
        'pink': painted('pink', '#f0a0a0', '#d07a80', scale=10, bump=0.15, rough=0.5, sss=0.2),
        'boarFur': painted('boarFur', '#7a4a2a', '#3e2212', scale=14, bump=0.7, rough=0.9),
        'boarSnout': painted('boarSnout', '#c88878', '#9a5a50', scale=10, bump=0.2, rough=0.55),
        'hoof': metal('hoof', '#2a2220', rough=0.5, metal=0.0, grime=0.3),
        'skinTan': painted('skinTan', '#e0a070', '#b87850', scale=10, bump=0.15, rough=0.6, sss=0.15),
        'ogreSkin': painted('ogreSkin', '#8cc04e', '#6e9e3a', scale=5, bump=0.12, rough=0.55, sss=0.15),
        'goblinSkin': painted('goblinSkin', '#86cc4a', '#5ea030', scale=9, bump=0.2, rough=0.55, sss=0.15),
        'trollSkin': painted('trollSkin', '#a4d2f6', '#6c9ad6', scale=4, bump=0.25, rough=0.28, sss=0.2),
        'clubWood': painted('clubWood', '#8a5028', '#4a2810', scale=12, bump=0.6, rough=0.75),
        'whiteFur': painted('whiteFur', '#f4f6fa', '#c4d0e0', scale=20, bump=0.8, rough=0.95, ao=0.8),
        'brownFur': painted('brownFur', '#7a5434', '#4a301c', scale=20, bump=0.8, rough=0.95),
        'leatherDk': painted('leatherDk', '#5a3418', '#3a2010', scale=12, bump=0.3, rough=0.7),
        'leatherLt': painted('leatherLt', '#9a6438', '#6a4020', scale=12, bump=0.3, rough=0.7),
        'cloth': painted('cloth', '#b82828', '#7a1418', scale=10, bump=0.25, rough=0.8),
        'clothFlat': painted('clothFlat', '#c02a2a', '#801a1c', scale=10, bump=0.2, rough=0.6, edge=False),
        'ginger': painted('ginger', '#d0662a', '#8a3a14', scale=22, bump=0.8, rough=0.9),
        'clothDark': painted('clothDark', '#3a2c4a', '#1e1628', scale=9, bump=0.3, rough=0.85),
        'clothBlack': painted('clothBlack', '#2a2228', '#141016', scale=9, bump=0.3, rough=0.85),
        'cape': painted('cape', '#9a1220', '#5a0810', scale=8, bump=0.3, rough=0.75),
        'wool': painted('woolP', '#ffffff', '#ece6da', scale=26, bump=0.5, rough=0.95, ao=0.3),
        'sheepFace': painted('sheepFace', '#1c1818', '#0e0c0c', scale=10, bump=0.15, rough=0.55),
        'spiderRed': banded('spiderRed', '#f25a14', '#1e0c08', scale=4.2, axis='X', width=0.2),
        'spiderLeg': painted('spiderLeg', '#e8461a', '#b0280a', scale=8, bump=0.1, rough=0.4),
        'spiderDark': painted('spiderDark', '#24100c', '#100604', scale=8, bump=0.1, rough=0.35),
        'queen': banded('queen', '#8a3ad8', '#2a0c48', scale=4.2, axis='X', width=0.22),
        'queenLeg': painted('queenLeg', '#7a34c4', '#4a1888', scale=8, bump=0.1, rough=0.4),
        'garStone': painted('garStone', '#9aa0a8', '#60666e', scale=6, bump=0.9, rough=0.92, ao=0.9),
        'garWing': painted('garWing', '#5e5462', '#3a3240', scale=8, bump=0.5, rough=0.8, sss=0.1),
        'ghost': spectral('ghost', '#8e32dc', '#e070ff', 0.5, 1.0),
        'ghostDeep': spectral('ghostDeep', '#5a18b0', '#c060ff', 0.5, 1.0),
        'ghostLord': spectral('ghostLord', '#4a1690', '#b050ff', 0.45, 1.0),
        'ghostLordDeep': spectral('ghostLordDeep', '#260a50', '#8030d0', 0.4, 1.0),
        'claw': metal('claw', '#1a161c', rough=0.3, metal=0.2, grime=0.2),
        'eyeWhite': flat('eyeWhite', '#fffbe8', 0.25, edge=False),
        'eyeYellow': flat('eyeYellow', '#ffd23a', 0.3, edge=False),
        'eyeGreen': glow('eyeGreen', '#7aff3a', 9),
        'eyeCyan': glow('eyeCyan', '#8af0ff', 9),
        'eyeGhost': glow('eyeGhost', '#fff2a0', 10),
        'eyeOrange': glow('eyeOrange', '#ff8a10', 12),
        'orbGreen': glow('orbGreen', '#4aff1a', 3.0, '#60e030'),
        'flame': glow('flame', '#ff4a08', 6, '#ff7a20'),
        'flameHot': glow('flameHot', '#ffb020', 8, '#ffd060'),
        'lavaSeam': glow('lavaSeam', '#ff3a08', 8),
        'mechBlue': metal('mechBlue', '#3a8ee0', rough=0.3, metal=0.55, grime=0.35),
        'mechBlueDk': metal('mechBlueDk', '#1e5aa8', rough=0.32, metal=0.55, grime=0.35),
        'helmetCream': metal('helmetCream', '#efe2c4', rough=0.38, metal=0.2, grime=0.4),
        'stripeOrange': flat('stripeOrange', '#e8641e', 0.45),
        'ruby': glass('ruby', '#e01a3a', '#a00818', 0.6),
        'emerald': glass('emerald', '#2ae070', '#10a040', 0.5),
        'feather': flat('feather', '#c83a22', 0.8),
        'featherBlk': flat('featherBlk', '#262028', 0.8),
        'plume': flat('plume', '#d81e28', 0.75, edge=False), 'helmIron': metal('helmIron', '#8a929c', rough=0.32, metal=0.85, grime=0.5),
        'whisker': flat('whisker', '#2a2020', 0.6, edge=False),
        'teeth': flat('teeth', '#f4ecd0', 0.4, ao=0.8),
        'gum': flat('gum', '#6a1a1e', 0.6),
        'mouth': flat('mouth', '#2a0a0c', 0.8, edge=False),
    })
    return m

# ── Little helpers ───────────────────────────────────────────────────────────
def G(name, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)): return group(name, parent, loc, rot)
def ell(r, mat, loc, scale=(1, 1, 1), parent=None, rot=(0, 0, 0), seg=24): return sphere(r, mat, loc, rot, parent, scale, seg)
def cone_to(base, d, r, h, mat, parent=None, verts=10, r2=0.0):
    """a cone standing on `base`, pointing along direction d"""
    d = Vector(d).normalized(); o = cone(r, h, mat, tuple(Vector(base) + d * h / 2), parent=parent, verts=verts, r2=r2)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d); return o
def horn(base, d, length, r, mat, parent, curl=(0, 0, 0.0), n=6, seg=10):
    """a curved tapering horn/claw/tusk: starts along d, bends by `curl` (a vector added more toward the tip)"""
    d = Vector(d).normalized(); c = Vector(curl); B = Vector(base); pts = []; rad = []
    for i in range(n):
        t = i / (n - 1); pts.append(tuple(B + d * length * t + c * length * t * t)); rad.append(r * (1 - t) ** 0.9 + 0.0005)
    rad[-1] = 0
    return tube(pts, rad, mat, parent, seg=seg)
def mirror(fn):
    for k in (1, -1): fn(k)
def setrot(o, x=0.0, y=0.0, z=0.0): o.rotation_euler = (x, y, z)
def setloc(o, base, dx=0.0, dy=0.0, dz=0.0): o.location = (base[0] + dx, base[1] + dy, base[2] + dz)
def jag(o, zcut, amt, seed=1, n=7):
    """rag the bottom edge of a robe/cloak: vertices below zcut pushed up and down in points"""
    for v in o.data.vertices:
        if v.co.z < zcut:
            a = math.atan2(v.co.y, v.co.x)
            v.co.z += (abs(math.sin(a * n + seed)) - 0.5) * amt
def eyes(parent, x, y, z, r, mat, pupil=None, scale=(0.6, 1, 1), pr=0.5, look=(1, 0, 0)):
    for k in (1, -1):
        ell(r, mat, (x, k * y, z), scale, parent, seg=16)
        if pupil: ell(r * pr, pupil, (x + r * scale[0] * 0.75, k * y, z), (0.4, 1, 1), parent, seg=12)

def S(ph): return math.sin(TAU * ph)
def C(ph): return math.cos(TAU * ph)

# ── Biped rig ────────────────────────────────────────────────────────────────
class Rig:
    def __init__(s): s.legs = []; s.arms = []; s.base = {}
    def keep(s, *objs):
        for o in objs: s.base[o.name] = tuple(o.location)
    def at(s, o, dx=0.0, dy=0.0, dz=0.0): b = s.base[o.name]; o.location = (b[0] + dx, b[1] + dy, b[2] + dz)

def leg(r, parent, loc, L1, L2, thigh, shin, foot):
    """hip → knee → ankle chain hanging down -Z; thigh(g, L1), shin(g, L2), foot(g) draw the parts"""
    hip = G('hip', parent, loc); thigh(hip, L1)
    kn = G('knee', hip, (0, 0, -L1)); shin(kn, L2)
    an = G('ankle', kn, (0, 0, -L2)); foot(an)
    r.legs.append((hip, kn, an)); r.L = L1 + L2
    return hip
def arm(r, parent, loc, L1, L2, upper, fore, hand):
    sh = G('shoulder', parent, loc); upper(sh, L1)
    el = G('elbow', sh, (0, 0, -L1)); fore(el, L2)
    wr = G('wrist', el, (0, 0, -L2)); hand(wr)
    r.arms.append((sh, el, wr)); return sh

def walk(r, ph, amp=0.45, knee=0.9, arms=0.45, elbow=0.35, bob=0.012, twist=0.07, roll=0.03, lean=0.06):
    """a walk cycle: legs [left, right] swing, the swinging knee bends, the pelvis dips so planted feet stay on the
    ground, arms swing against the legs, shoulders twist and the body rolls over the planted foot"""
    s, c = S(ph), C(ph)
    for i, (hip, kn, an) in enumerate(r.legs):
        k = s if i == 0 else -s; dk = c if i == 0 else -c
        hy = -amp * k; ky = knee * max(0.0, dk) ** 1.3 + 0.06
        setrot(hip, 0, hy, 0); setrot(kn, 0, ky, 0); setrot(an, 0, -(hy + ky) * 0.9 + (0.25 * max(0.0, dk) if dk > 0.3 else 0), 0)
    drop = r.L * (1 - math.cos(amp * abs(s)))
    r.at(r.pelvis, dz=-drop + bob * (1 - abs(s)))
    setrot(r.pelvis, roll * s, 0, -twist * 0.5 * s)
    setrot(r.chest, -roll * s * 0.5, lean, twist * s)
    for i, (sh, el, wr) in enumerate(r.arms):
        k = s if i == 0 else -s
        setrot(sh, 0, arms * k, 0); setrot(el, 0, -elbow - 0.25 * max(0.0, k), 0); setrot(wr, 0, 0, 0)
    if getattr(r, 'head', None): setrot(r.head, roll * s * 0.5, -lean * 0.5 + 0.04 * abs(s), -twist * 0.6 * s)

# ═══ Skeleton warrior (footman) ═════════════════════════════════════════════
def round_shield(parent, R, m, face='woodRed', rim='iron'):
    """the skeletons' round red wooden shield: planks, an iron rim and straps, a domed iron boss; faces local +Z"""
    g = G('shield', parent)
    for i in range(5):   # planks, the grain along each
        w = 2 * R / 5; y = -R + w * (i + 0.5); h = 2 * math.sqrt(max(0.0, R * R - y * y)) * 0.98
        box(h, w * 0.95, 0.026, m[face], (0, y, 0), (0, 0, 0), g, bevel=0.005)
    torus(R, 0.014, m[rim], (0, 0, 0.002), parent=g, maj=40, mn=10)
    for x in (-R * 0.45, R * 0.45): box(0.022, 2 * R * 0.92 * math.sqrt(1 - 0.45 ** 2), 0.01, m[rim], (x, 0, 0.016), parent=g, bevel=0.003)
    ell(R * 0.3, m[rim], (0, 0, 0.012), (1, 1, 0.75), g)
    torus(R * 0.3, 0.008, m['ironDark'], (0, 0, 0.012), parent=g, maj=24, mn=6)
    for i in range(8):
        a = i / 8 * TAU + 0.2; sphere(0.008, m['ironDark'], (math.cos(a) * R * 0.86, math.sin(a) * R * 0.86, 0.016), parent=g, seg=8)
    return g

def sword(parent, L, m, blade='rust', guard='iron', w=0.034):
    """a sword along local +Z from the grip at the origin"""
    g = G('sword', parent)
    cyl(0.011, 0.07, m['leatherDk'], (0, 0, 0.0), parent=g, verts=10, bevel=0)
    ell(0.017, m[guard], (0, 0, -0.045), (1, 1, 1), g, seg=12)
    box(0.026, 0.11, 0.022, m[guard], (0, 0, 0.042), parent=g, bevel=0.006)
    poly = [(-w / 2, 0), (w / 2, 0), (w / 2 * 0.9, L * 0.8), (0, L), (-w / 2 * 0.9, L * 0.8)]
    slab(poly, 0.01, m[blade], (0, 0, 0.05), (math.pi / 2, 0, 0), g, bevel=0.003)   # the flat of the blade faces ±Y
    box(0.008, 0.0125, L * 0.6, m['ironDark'], (0.0, 0, 0.05 + L * 0.34), parent=g, bevel=0)   # fuller
    return g

def skel_bone(g, a, b, r, m):
    """a long bone: a shaft with knobbly ends"""
    tube([a, b], [r, r * 0.85], m['boneOld'], g, seg=10)
    ell(r * 1.5, m['boneOld'], a, (1.1, 1, 1), g, seg=12); ell(r * 1.4, m['boneOld'], b, (1.1, 1, 1), g, seg=12)

def footman():
    m = EM(); r = Rig(); root = G('footman')
    r.pelvis = pel = G('pelvis', root, (0, 0, 0.24)); r.keep(pel)
    ell(0.048, m['boneOld'], (0, 0, 0.0), (0.75, 1.35, 0.6), pel)
    mirror(lambda k: ell(0.03, m['boneOld'], (-0.005, k * 0.04, 0.012), (0.9, 1, 0.8), pel))
    tube([(-0.012, 0, 0), (-0.016, 0, 0.06), (-0.01, 0, 0.13)], [0.014, 0.013, 0.012], m['boneOld'], pel)
    for i in range(4): ell(0.016, m['boneOld'], (-0.014, 0, 0.03 + i * 0.03), (1, 1.2, 0.6), pel, seg=10)   # vertebrae
    r.chest = ch = G('chest', pel, (0, 0, 0.12))
    for i in range(4):   # ribs
        z = 0.025 + i * 0.026; rx = 0.052 + (1.5 - abs(i - 1.5)) * 0.006; ry = 0.06 + (1.5 - abs(i - 1.5)) * 0.008
        pts = []
        for j in range(15):
            a = math.radians(30 + j * 300 / 14); pts.append((rx * math.cos(a) - 0.005, ry * math.sin(a), z - 0.016 * (1 + math.cos(a)) / 2))
        tube(pts, 0.0075, m['boneOld'], ch, seg=8)
    box(0.012, 0.016, 0.09, m['boneOld'], (0.05, 0, 0.055), (0, -0.15, 0), ch, bevel=0.005)   # sternum
    tube([(-0.01, 0, 0.1), (-0.008, 0, 0.14)], 0.012, m['boneOld'], ch)
    mirror(lambda k: tube([(0.03, k * 0.015, 0.118), (0.01, k * 0.06, 0.122), (-0.005, k * 0.085, 0.115)], 0.009, m['boneOld'], ch, seg=8))   # collarbones
    # skull in its helmet
    r.head = hd = G('head', ch, (0.005, 0, 0.2))
    ell(0.072, m['boneOld'], (0, 0, 0), (1.05, 0.95, 1.0), hd)
    ell(0.05, m['boneOld'], (0.03, 0, -0.035), (1.0, 0.95, 0.75), hd)   # cheeks and maxilla
    eyes(hd, 0.052, 0.027, -0.004, 0.022, m['dark'], scale=(0.55, 1, 1.05))
    eyes(hd, 0.058, 0.027, -0.004, 0.008, m['eyeRed'], scale=(0.5, 1, 1))
    cone_to((0.068, 0, -0.03), (1, 0, 0.1), 0.012, 0.006, m['dark'], hd, verts=3)
    for i in range(6): box(0.008, 0.009, 0.011, m['teeth'], (0.06, (i - 2.5) * 0.011, -0.055), parent=hd, bevel=0.002)
    jaw = r.jaw = G('jaw', hd, (-0.01, 0, -0.04))
    tube([(0.0, -0.04, 0.0), (0.05, -0.03, -0.035), (0.075, 0, -0.035), (0.05, 0.03, -0.035), (0.0, 0.04, 0.0)], 0.011, m['boneOld'], jaw, seg=8)
    for i in range(5): box(0.008, 0.009, 0.01, m['teeth'], (0.068, (i - 2) * 0.011, -0.024), parent=jaw, bevel=0.002)
    # the iron helmet with a red plume
    helm = G('helm', hd, (-0.008, 0, 0.03), (0, -0.18, 0))
    lathe([(0.0, 0.07), (0.035, 0.066), (0.058, 0.046), (0.072, 0.018), (0.076, -0.006), (0.088, -0.014), (0.09, -0.022), (0.072, -0.018)], m['helmIron'], parent=helm, seg=32)
    torus(0.079, 0.008, m['ironDark'], (0, 0, -0.008), parent=helm, maj=32, mn=6)
    for i in range(10): a = i / 10 * TAU; sphere(0.006, m['brass'], (math.cos(a) * 0.081, math.sin(a) * 0.081, -0.008), parent=helm, seg=8)
    box(0.012, 0.016, 0.06, m['iron'], (0.078, 0, -0.03), (0, 0.1, 0), helm, bevel=0.004)   # nasal
    box(0.1, 0.02, 0.026, m['ironDark'], (0, 0, 0.068), parent=helm, bevel=0.008)   # crest holder
    rng = random.Random(3)
    for i in range(16):
        t = i / 15; x0 = 0.045 - t * 0.095; z0 = 0.078 - 0.012 * abs(t - 0.4)
        L = 0.07 + 0.05 * math.sin(t * math.pi) + rng.uniform(-0.01, 0.01)
        tip = Vector((x0 - 0.05 - t * 0.05, rng.uniform(-0.006, 0.006), z0 + L * (1 - t * 0.6)))
        mid = Vector((x0 - 0.005, 0, z0 + L * 0.65))
        tube([(x0, rng.uniform(-0.01, 0.01), z0), tuple(mid), tuple(tip)], [0.016, 0.014, 0.0], m['plume'], helm, seg=8, scale_y=0.7)
    # legs: thigh, shin (two bones), foot
    def thigh(g, L): skel_bone(g, (0, 0, -0.012), (0, 0, -L), 0.011, m)
    def shin(g, L):
        ell(0.017, m['boneOld'], (0.004, 0, 0.0), (1, 1, 0.8), g, seg=12)   # knee cap
        tube([(0, 0.006, -0.01), (0, 0.006, -L)], 0.008, m['boneOld'], g, seg=8); tube([(-0.006, -0.006, -0.01), (-0.004, -0.006, -L)], 0.006, m['boneOld'], g, seg=8)
    def foot(g):
        ell(0.014, m['boneOld'], (0, 0, -0.004), (1.2, 1, 0.8), g, seg=10)
        for j in (-1, 0, 1): tube([(0.0, j * 0.01, -0.01), (0.03, j * 0.013, -0.014), (0.05, j * 0.015, -0.015)], [0.007, 0.006, 0.005], m['boneOld'], g, seg=8)
        ell(0.011, m['boneOld'], (-0.014, 0, -0.012), (1.2, 1, 0.8), g, seg=10)
    for k in (1, -1): leg(r, pel, (0, k * 0.045, -0.01), 0.108, 0.108, thigh, shin, foot)
    def upper(g, L): skel_bone(g, (0, 0, 0), (0, 0, -L), 0.009, m)
    def fore(g, L): tube([(0, 0.004, -0.008), (0.0, 0.006, -L)], 0.006, m['boneOld'], g, seg=8); tube([(0, -0.005, -0.008), (0, -0.004, -L)], 0.0055, m['boneOld'], g, seg=8)
    def handR(g):
        ell(0.016, m['boneOld'], (0, 0, -0.012), (1, 0.8, 1.1), g, seg=10)
        for j in range(3): tube([(0.008, (j - 1) * 0.008, -0.02), (0.02, (j - 1) * 0.008, -0.03), (0.016, (j - 1) * 0.008, -0.04)], 0.0045, m['boneOld'], g, seg=6)
        sw = sword(g, 0.24, m); sw.location = (0.004, 0, -0.03); sw.rotation_euler = (0, math.radians(125), 0)
    def handL(g):
        ell(0.016, m['boneOld'], (0, 0, -0.012), (1, 0.8, 1.1), g, seg=10)
        sh = round_shield(g, 0.105, m); sh.location = (0.0, -0.03, -0.03); sh.rotation_euler = (math.radians(62), 0, math.radians(-20))
    arm(r, ch, (-0.005, 0.085, 0.112), 0.1, 0.095, upper, fore, handR)
    arm(r, ch, (-0.005, -0.085, 0.112), 0.1, 0.095, upper, fore, handL)
    for sh, el, wr in r.arms: ell(0.016, m['boneOld'], (0, 0, 0), (1, 1, 1), sh, seg=12)
    def pose(ph):
        walk(r, ph, amp=0.5, knee=1.0, arms=0.0, bob=0.012, twist=0.12, roll=0.05, lean=0.1)
        s, c = S(ph), C(ph)
        shW, elW, wrW = r.arms[0]; shS, elS, wrS = r.arms[1]
        setrot(shS, 0.3, -0.35 + 0.06 * s, -0.1); setrot(elS, 0, -1.1, 0); setrot(wrS, 0, 0, 0)    # the shield held up in front
        setrot(shW, -0.25, -0.7 - 0.6 * s, 0); setrot(elW, 0, -0.9 - 0.4 * max(0, s), 0); setrot(wrW, 0, -0.2 + 0.25 * s, 0)   # the sword swinging high
        setrot(r.jaw, 0, 0.18 * max(0.0, math.sin(TAU * ph * 2)), 0)
    return {'root': root, 'pose': pose, 'fly': False}

# ═══ Giant rat (key 'skeleton': the fast little runner) ═════════════════════
def quad_legs(r, body, spots, build):
    """four legs at (x, side) spots; build(g, front, side) draws one hanging down -Z from its hip"""
    r.qlegs = []
    for (x, k, z) in spots:
        hip = G('qhip', body, (x, k, z)); kn = build(hip, x > 0, 1 if k > 0 else -1); r.qlegs.append((hip, kn, x > 0, k > 0))

def rat():
    m = EM(); r = Rig(); root = G('rat')
    body = r.body = G('body', root, (0, 0, 0.13)); r.keep(body)
    ell(0.1, m['ratFur'], (-0.03, 0, 0.02), (1.55, 1.0, 0.92), body)
    ell(0.085, m['ratFur'], (-0.11, 0, 0.0), (1.1, 1.05, 0.95), body)   # haunches
    ell(0.08, m['ratBelly'], (0.0, 0, -0.03), (1.4, 0.85, 0.6), body)
    rng = random.Random(5)
    for i in range(14):   # tufts of fur along the back
        x = -0.15 + i * 0.022; z = 0.095 - abs(x + 0.03) * 0.25
        cone_to((x, rng.uniform(-0.03, 0.03), z), (-0.8, rng.uniform(-0.3, 0.3), 0.6), 0.016, 0.04, m['ratFur'], body, verts=6)
    hd = r.head = G('head', body, (0.13, 0, 0.03), (0, 0.1, 0))
    tube([(-0.03, 0, 0.0), (0.02, 0, -0.002), (0.07, 0, -0.015), (0.105, 0, -0.03)], [0.06, 0.05, 0.03, 0.014], m['ratFur'], hd, seg=16)
    ell(0.05, m['ratFur'], (0.0, 0, 0.005), (1.1, 1.0, 0.9), hd)
    ell(0.014, m['pink'], (0.11, 0, -0.03), (1, 1.2, 0.9), hd, seg=12)
    mirror(lambda k: [ell(0.014, m['eyeRed'], (0.04, k * 0.032, 0.022), (0.9, 0.8, 1), hd, seg=12),
                      ell(0.017, m['ratFur'], (0.038, k * 0.03, 0.033), (1.2, 1, 0.5), hd, seg=10)])   # eyes and brows
    for k in (1, -1):
        ear = G('ear', hd, (-0.01, k * 0.04, 0.045), (k * -0.5, -0.3, k * 0.4))
        ell(0.03, m['ratFur'], (0, 0, 0.02), (0.45, 1, 1.15), ear, seg=14); ell(0.024, m['pink'], (0.006, 0, 0.02), (0.3, 0.85, 1.0), ear, seg=14)
        for j in range(3): tube([(0.1, k * 0.015, -0.02), (0.14, k * (0.04 + j * 0.01), -0.02 + (j - 1) * 0.012), (0.17, k * (0.07 + j * 0.02), -0.024 + (j - 1) * 0.022)], [0.0015, 0.001, 0.0005], m['whisker'], hd, seg=4)
    for k in (1, -1): box(0.008, 0.009, 0.022, m['teeth'], (0.098, k * 0.005, -0.045), parent=hd, bevel=0.002)
    ell(0.022, m['ratFur'], (0.075, 0, -0.04), (1.4, 0.9, 0.6), hd)   # chin
    # the long tail, in three links so it can wave
    t = body; r.tail = []; pts = [(0, 0, 0), (-0.065, 0, 0.0), (-0.13, 0, -0.006)]
    for i in range(3):
        g = G('tail', t, (-0.17, 0, -0.01) if i == 0 else (-0.13, 0, -0.006)); r.tail.append(g)
        r0 = 0.02 * (1 - i / 3) + 0.004; r1 = 0.02 * (1 - (i + 1) / 3) + 0.003
        tube(pts, [r0, (r0 + r1) / 2, r1 if i < 2 else 0.0], m['pink'], g, seg=10)
        ell(r0, m['pink'], (0, 0, 0), (1, 1, 1), g, seg=10); t = g
    def build(hip, front, k):
        if front:
            tube([(0, 0, 0.0), (0.01, 0, -0.05)], [0.026, 0.016], m['ratFur'], hip, seg=10)
            kn = G('qknee', hip, (0.01, 0, -0.05)); tube([(0, 0, 0), (0.005, 0, -0.07)], [0.012, 0.009], m['pink'], kn, seg=8)
            ft = (0.005, 0, -0.077)
        else:
            ell(0.045, m['ratFur'], (0, 0, -0.015), (1.1, 0.6, 1.2), hip, seg=14)
            kn = G('qknee', hip, (-0.02, 0, -0.06)); tube([(0, 0, 0), (0.0, 0, -0.065)], [0.013, 0.01], m['pink'], kn, seg=8)
            ft = (0.0, 0, -0.072)
        ell(0.014, m['pink'], (ft[0] + 0.012, 0, ft[2]), (1.6, 1.0, 0.45), kn, seg=10)
        for j in (-1, 0, 1): horn((ft[0] + 0.03, j * 0.007, ft[2] - 0.002), (1, j * 0.3, -0.2), 0.012, 0.0035, m['teeth'], kn, n=3, seg=5)
        return kn
    quad_legs(r, body, [(0.09, 0.045, -0.04), (0.09, -0.045, -0.04), (-0.11, 0.06, -0.01), (-0.11, -0.06, -0.01)], build)
    def pose(ph):
        s, c = S(ph), C(ph)
        r.at(body, dz=0.018 * abs(c)); setrot(body, 0, -0.08 * s, 0)
        for hip, kn, front, left in r.qlegs:   # a scampering gallop: fronts together, hinds together, a little apart
            q = S(ph + (0 if front else 0.5) + (0.08 if left else 0)); dq = C(ph + (0 if front else 0.5) + (0.08 if left else 0))
            setrot(hip, 0, -0.65 * q, 0); setrot(kn, 0, (0.7 if front else -0.5) * max(0, dq) * (1 if front else -1) * -1, 0)
        setrot(r.head, 0, 0.1 + 0.08 * s, 0.1 * S(ph * 2))
        for i, g in enumerate(r.tail): setrot(g, 0, 0.12 - 0.08 * i, 0.35 * S(ph - i * 0.15))
    return {'root': root, 'pose': pose, 'fly': False}

# ═══ Armoured knight ════════════════════════════════════════════════════════
def kite_shield(parent, H, W, m, face='cloth', trim='brass'):
    """a tall kite shield, domed, faces local +Z; its long axis local +Y"""
    g = G('kite', parent)
    pts = []
    for i in range(9):   # the rounded top
        a = math.pi * i / 8; pts.append((math.cos(a) * W / 2, H * 0.32 + math.sin(a) * W * 0.22))
    for i in range(1, 8):   # the sides curving down to the point
        t = i / 8; pts.append((-W / 2 * (1 - t ** 1.6), H * 0.32 - t * H))
    pts.append((0, H * 0.32 - H)); n0 = len(pts)
    for i in range(7, 0, -1): t = i / 8; pts.append((W / 2 * (1 - t ** 1.6), H * 0.32 - t * H))
    pts = [pts[0]] + pts[1:]   # outline, anticlockwise from the top right
    slab(pts, 0.03, m[face], (0, 0, 0), parent=g, bevel=0.0, smooth=True, bulge=0.035)
    rim = [(x, y, 0.004) for (x, y) in pts] + [(pts[0][0], pts[0][1], 0.004)]
    tube(rim, 0.012, m[trim], g, seg=8, cap=False)
    tube([(0, H * 0.32 + W * 0.2, 0.03), (0, H * 0.32 - H * 0.92, 0.024)], 0.012, m[trim], g, seg=8, scale_y=0.5)
    tube([(-W * 0.44, H * 0.2, 0.026), (0, H * 0.22, 0.04), (W * 0.44, H * 0.2, 0.026)], 0.012, m[trim], g, seg=8, scale_y=0.5)
    ell(0.03, m['gold'], (0, H * 0.21, 0.04), (1, 1, 0.7), g, seg=16)
    for (x, y) in pts[::2]: sphere(0.007, m['plateDark'], (x * 0.86, (y - 0.0) * 0.92 + 0.01, 0.024), parent=g, seg=8)
    return g

def plate_limb(g, L, r0, r1, m, mat='plate', trim='brass'):
    tube([(0, 0, 0), (0, 0, -L * 0.5), (0, 0, -L)], [r0, (r0 + r1) / 2 * 1.06, r1], m[mat], g, seg=14)
    torus(r1 * 1.02, 0.006, m[trim], (0, 0, -L * 0.92), parent=g, maj=16, mn=6)

def knight():
    m = EM(); r = Rig(); root = G('knight')
    r.pelvis = pel = G('pelvis', root, (0, 0, 0.27)); r.keep(pel)
    lathe([(0.0, 0.04), (0.1, 0.04), (0.112, 0.0), (0.13, -0.06), (0.125, -0.075), (0.0, -0.06)], m['plate'], parent=pel, seg=24)   # faulds
    for z in (-0.02, -0.05): torus(0.12 + (-z) * 0.25, 0.006, m['brass'], (0, 0, z), parent=pel, maj=24, mn=6)
    box(0.04, 0.08, 0.1, m['cloth'], (0.115, 0, -0.06), (0, 0.15, 0), pel, bevel=0.01)   # tabard tail
    r.chest = ch = G('chest', pel, (0, 0, 0.04))
    ell(0.12, m['plate'], (0.0, 0, 0.12), (0.85, 1.05, 1.0), ch)   # cuirass
    ell(0.1, m['plate'], (0.03, 0, 0.13), (0.75, 0.9, 0.95), ch)
    tube([(0.095, 0, 0.04), (0.11, 0, 0.12), (0.095, 0, 0.21)], 0.008, m['brass'], ch, seg=8)   # the ridge
    torus(0.1, 0.012, m['leatherDk'], (0, 0, 0.03), parent=ch, maj=24, mn=8)
    box(0.03, 0.04, 0.035, m['brass'], (0.1, 0, 0.03), parent=ch, bevel=0.008)   # buckle
    lathe([(0.06, 0.2), (0.08, 0.22), (0.055, 0.25), (0.0, 0.25)], m['plateDark'], parent=ch)   # gorget
    torus(0.075, 0.008, m['brass'], (0, 0, 0.215), parent=ch, maj=24, mn=6)
    for k in (1, -1):   # pauldrons: three lames each, brass edged
        pg = G('pauldron', ch, (0.0, k * 0.125, 0.205), (k * 0.35, 0, 0))
        for i, (rr, z) in enumerate([(0.07, 0.0), (0.064, -0.028), (0.056, -0.052)]):
            ell(rr, m['plate'], (0, 0, z), (1.05, 1.0, 0.62), pg, seg=20); torus(rr * 1.0, 0.006, m['brass'], (0, 0, z - 0.004), parent=pg, maj=20, mn=6)
        sphere(0.012, m['brass'], (0, 0, 0.045), parent=pg, seg=10)
    r.head = hd = G('head', ch, (0.01, 0, 0.32))
    lathe([(0.0, 0.1), (0.04, 0.098), (0.068, 0.08), (0.08, 0.05), (0.082, -0.02), (0.08, -0.07), (0.07, -0.085), (0.0, -0.085)], m['plate'], parent=hd, seg=28)   # great helm
    box(0.02, 0.11, 0.016, m['dark'], (0.077, 0, 0.01), parent=hd, bevel=0.004)   # eye slit
    mirror(lambda k: ell(0.007, m['eyeRed'], (0.08, k * 0.024, 0.01), (0.5, 1, 0.8), hd, seg=8))
    box(0.016, 0.018, 0.15, m['brass'], (0.08, 0, -0.01), parent=hd, bevel=0.005)   # the brass cross on the face
    tube([(0.074, -0.075, 0.032), (0.084, 0, 0.034), (0.074, 0.075, 0.032)], 0.009, m['brass'], hd, seg=8)
    torus(0.082, 0.008, m['brass'], (0, 0, -0.062), parent=hd, maj=28, mn=6)
    for i in range(6): mirror(lambda k: sphere(0.005, m['plateDark'], (0.07 - i * 0.002, k * (0.02 + i * 0.006), -0.045), parent=hd, seg=6))   # breaths
    rng = random.Random(9)
    for i in range(9):   # a short red crest
        t = i / 8; x0 = 0.03 - t * 0.09
        tube([(x0, 0, 0.095), (x0 - 0.02, 0, 0.14 - t * 0.02), (x0 - 0.07, 0, 0.13 - t * 0.04)], [0.014, 0.012, 0.0], m['plume'], hd, seg=8, scale_y=0.6)
    def thigh(g, L): plate_limb(g, L, 0.045, 0.04, m); ell(0.042, m['plate'], (0, 0, -0.005), (1, 1, 0.8), g, seg=14)
    def shin(g, L):
        ell(0.035, m['brass'], (0.012, 0, 0.0), (0.9, 1, 0.9), g, seg=14); cone_to((0.04, 0, 0.0), (1, 0, 0.2), 0.012, 0.03, m['plateDark'], g, verts=8)
        plate_limb(g, L, 0.036, 0.04, m)
    def foot(g):
        ell(0.04, m['plate'], (0.02, 0, -0.004), (1.5, 0.95, 0.6), g, seg=16); ell(0.03, m['plateDark'], (0.055, 0, -0.008), (1.2, 0.9, 0.5), g, seg=14)
    for k in (1, -1): leg(r, pel, (0, k * 0.06, -0.03), 0.12, 0.11, thigh, shin, foot)
    def upper(g, L): plate_limb(g, L, 0.035, 0.032, m)
    def fore(g, L): ell(0.03, m['brass'], (0, 0, 0), (1, 1, 1), g, seg=12); plate_limb(g, L, 0.03, 0.036, m)
    def handR(g):
        ell(0.03, m['plateDark'], (0.005, 0, -0.02), (1.1, 1, 1.1), g, seg=14)
        sw = sword(g, 0.3, m, blade='steel', guard='brass', w=0.04); sw.location = (0.0, 0, -0.022); sw.rotation_euler = (0, math.radians(110), 0)
    def handL(g):
        ell(0.03, m['plateDark'], (0.005, 0, -0.02), (1.1, 1, 1.1), g, seg=14)
        sh = kite_shield(g, 0.4, 0.24, m, face='clothFlat'); sh.location = (0.04, -0.05, -0.02); sh.rotation_euler = (math.radians(70), math.pi / 2, 0)
    arm(r, ch, (-0.0, 0.13, 0.17), 0.1, 0.1, upper, fore, handR)
    arm(r, ch, (-0.0, -0.13, 0.17), 0.1, 0.1, upper, fore, handL)
    def pose(ph):
        walk(r, ph, amp=0.4, knee=0.85, arms=0.0, bob=0.01, twist=0.06, roll=0.035, lean=0.06)
        s = S(ph)
        shW, elW, wrW = r.arms[0]; shS, elS, wrS = r.arms[1]
        setrot(shS, 0.15, -0.25 + 0.05 * s, 0); setrot(elS, 0, -1.2, 0); setrot(wrS, 0, 0, 0)
        setrot(shW, -0.2, -0.5 - 0.4 * s, 0); setrot(elW, 0, -0.8 - 0.3 * max(0, s), 0); setrot(wrW, 0, 0.1 * s, 0)
    return {'root': root, 'pose': pose, 'fly': False}

# ═══ Boar rider ═════════════════════════════════════════════════════════════
def rider():
    m = EM(); r = Rig(); root = G('rider')
    boar = r.body = G('boar', root, (0, 0, 0.27)); r.keep(boar)
    ell(0.17, m['boarFur'], (-0.05, 0, 0.0), (1.5, 0.95, 0.95), boar)
    ell(0.15, m['boarFur'], (0.08, 0, 0.03), (1.0, 1.0, 1.08), boar)   # the big shoulders
    rng = random.Random(4)
    for i in range(18):   # the bristly mane down its spine
        x = 0.16 - i * 0.022; z = 0.19 - abs(x - 0.06) * 0.35 - (0.02 if x < -0.05 else 0)
        cone_to((x, rng.uniform(-0.02, 0.02), z), (-0.6, rng.uniform(-0.3, 0.3), 1), 0.022, 0.07 + 0.03 * math.sin(i / 17 * math.pi), m['featherBlk'], boar, verts=5)
    hd = r.head = G('head', boar, (0.22, 0, 0.0), (0, 0.25, 0))
    ell(0.1, m['boarFur'], (0.0, 0, 0.0), (1.2, 0.95, 1.0), hd)
    tube([(0.04, 0, -0.01), (0.12, 0, -0.03), (0.17, 0, -0.045)], [0.07, 0.05, 0.042], m['boarFur'], hd, seg=16)
    cyl(0.044, 0.03, m['boarSnout'], (0.18, 0, -0.045), (0, math.pi / 2, 0), hd, verts=20, bevel=0.008)
    mirror(lambda k: ell(0.01, m['dark'], (0.196, k * 0.017, -0.045), (0.4, 1, 1.2), hd, seg=8))
    mirror(lambda k: horn((0.13, k * 0.04, -0.07), (0.3, k * 0.35, 0.5), 0.13, 0.017, m['teeth'], hd, curl=(-0.3, k * 0.15, 0.25), n=7))   # tusks
    mirror(lambda k: [ell(0.013, m['eyeRed'], (0.07, k * 0.058, 0.035), (0.8, 0.6, 0.8), hd, seg=10),
                      tube([(0.04, k * 0.05, 0.06), (0.08, k * 0.064, 0.05), (0.1, k * 0.055, 0.04)], [0.012, 0.01, 0.004], m['boarFur'], hd, seg=6)])   # eyes under a heavy brow
    mirror(lambda k: cone_to((-0.02, k * 0.06, 0.07), (-0.4, k * 0.6, 0.7), 0.035, 0.08, m['boarFur'], hd, verts=8))   # ears
    tube([(-0.02, 0, -0.07), (0.1, 0, -0.08), (0.14, 0, -0.07)], [0.04, 0.03, 0.015], m['boarFur'], hd, seg=10)   # jaw
    # tail
    tube([(-0.29, 0, 0.04), (-0.33, 0, 0.06), (-0.34, 0.02, 0.1), (-0.32, 0.0, 0.11)], 0.008, m['boarFur'], boar, seg=6)
    # saddle: a blanket, a leather seat with brass studs, a girth strap
    ell(0.12, m['cloth'], (-0.03, 0, 0.13), (1.15, 1.15, 0.28), boar)
    ell(0.08, m['leatherDk'], (-0.03, 0, 0.16), (1.2, 1.05, 0.32), boar)
    torus(0.155, 0.01, m['leatherDk'], (-0.03, 0, 0.02), (math.pi / 2, 0, 0), boar, maj=32, mn=6)
    for i in range(8): a = i / 8 * TAU; sphere(0.008, m['brass'], (-0.03 + math.cos(a) * 0.12, math.sin(a) * 0.12, 0.155), parent=boar, seg=8)
    def build(hip, front, k):
        tube([(0, 0, 0.02), (0.0, 0, -0.07)], [0.05, 0.035], m['boarFur'], hip, seg=12)
        kn = G('qknee', hip, (0, 0, -0.07)); tube([(0, 0, 0), (0.0, 0, -0.1)], [0.027, 0.022], m['boarFur'], kn, seg=10)
        cyl(0.026, 0.035, m['hoof'], (0.006, 0, -0.112), parent=kn, verts=12, r2=0.022)
        return kn
    quad_legs(r, boar, [(0.13, 0.08, -0.06), (0.13, -0.08, -0.06), (-0.15, 0.08, -0.06), (-0.15, -0.08, -0.06)], build)
    # the raider: a bearded brute in leather and an iron horned helmet, a big axe raised
    rd = r.rider = G('raider', boar, (-0.04, 0, 0.19)); r.keep(rd)
    ell(0.065, m['leatherLt'], (0, 0, 0.0), (1.0, 1.2, 0.6), rd)
    ch = G('rchest', rd, (0, 0, 0.0))
    tube([(0, 0, 0.0), (0.01, 0, 0.08), (0.0, 0, 0.14)], [0.07, 0.085, 0.08], m['leatherLt'], ch, seg=16)
    torus(0.07, 0.012, m['leatherDk'], (0, 0, 0.02), parent=ch, maj=20, mn=6); box(0.025, 0.03, 0.03, m['brass'], (0.07, 0, 0.02), parent=ch, bevel=0.006)
    tube([(0.06, -0.06, 0.13), (0.075, 0.0, 0.06), (0.06, 0.06, 0.0)], 0.01, m['leatherDk'], ch, seg=6)   # baldric
    mirror(lambda k: ell(0.045, m['brownFur'], (-0.005, k * 0.075, 0.13), (1.1, 1, 0.7), ch, seg=14))   # fur on the shoulders
    hd2 = G('rhead', ch, (0.01, 0, 0.19))
    ell(0.058, m['skinTan'], (0, 0, 0), (1, 0.95, 1.0), hd2)
    ell(0.05, m['ginger'], (0.03, 0, -0.045), (0.8, 1.0, 1.0), hd2)   # beard
    cone_to((0.05, 0, -0.07), (0.3, 0, -1), 0.03, 0.05, m['ginger'], hd2, verts=10)
    mirror(lambda k: tube([(0.045, k * 0.012, -0.018), (0.05, k * 0.03, -0.02), (0.045, k * 0.045, -0.035)], [0.01, 0.009, 0.004], m['ginger'], hd2, seg=8))   # moustache
    ell(0.015, m['skinTan'], (0.06, 0, 0.0), (1, 0.9, 1), hd2, seg=10)   # nose
    mirror(lambda k: [ell(0.009, m['eyeWhite'], (0.048, k * 0.022, 0.014), (0.6, 1, 0.8), hd2, seg=10), ell(0.005, m['dark'], (0.054, k * 0.022, 0.014), (0.5, 1, 1), hd2, seg=8)])
    lathe([(0.0, 0.07), (0.03, 0.066), (0.055, 0.048), (0.063, 0.02), (0.064, 0.008), (0.068, 0.0), (0.05, 0.004)], m['helmIron'], (0, 0, 0.0), parent=hd2)
    torus(0.064, 0.007, m['brass'], (0, 0, 0.006), parent=hd2, maj=24, mn=6)
    mirror(lambda k: horn((0.0, k * 0.055, 0.04), (0.1, k * 1, 0.4), 0.12, 0.018, m['teeth'], hd2, curl=(0.2, -k * 0.3, 0.8), n=7))
    box(0.01, 0.012, 0.045, m['helmIron'], (0.062, 0, 0.0), parent=hd2, bevel=0.003)
    for k in (1, -1):   # legs straddling the boar
        tube([(0, k * 0.05, 0.0), (0.07, k * 0.12, -0.02), (0.08, k * 0.14, -0.1)], [0.035, 0.032, 0.026], m['leatherDk'], rd, seg=12)
        ell(0.03, m['leatherDk'], (0.1, k * 0.145, -0.115), (1.6, 0.9, 0.7), rd, seg=12)
    sL = G('rshL', ch, (0.0, 0.09, 0.12)); sR = G('rshR', ch, (0.0, -0.09, 0.12)); r.rarms = (sL, sR)
    for sg, k in ((sL, 1), (sR, -1)):
        tube([(0, 0, 0), (0.0, 0, -0.09)], [0.03, 0.026], m['skinTan'], sg, seg=10)
        e = G('rel', sg, (0, 0, -0.09)); tube([(0, 0, 0), (0, 0, -0.08)], [0.026, 0.028], m['leatherLt'], e, seg=10)
        ell(0.026, m['skinTan'], (0, 0, -0.095), (1, 1, 1), e, seg=12)
        if k < 0:   # the axe
            ax = G('axe', e, (0, 0, -0.095), (0, math.radians(100), 0))
            cyl(0.011, 0.34, m['woodDark'], (0, 0, 0.1), parent=ax, verts=10, bevel=0)
            hb = G('axehead', ax, (0, 0, 0.24))
            slab([(0, 0.02), (0.05, 0.05), (0.1, 0.075), (0.11, 0.0), (0.1, -0.075), (0.05, -0.05), (0, -0.02)], 0.016, m['steel'], (0.0, 0, 0), (math.pi / 2, 0, 0), hb, bevel=0.004)
            box(0.03, 0.03, 0.05, m['iron'], (0, 0, 0), parent=hb, bevel=0.006)
            for zz in (-0.06, 0.08): torus(0.013, 0.004, m['leatherDk'], (0, 0, zz), parent=ax, maj=12, mn=5)
        r.base_rel = e
    def pose(ph):
        s, c = S(ph), C(ph)
        r.at(boar, dz=0.03 * abs(c)); setrot(boar, 0, 0.07 * s, 0)
        for hip, kn, front, left in r.qlegs:
            q = S(ph + (0 if front else 0.45) + (0.1 if left else 0)); dq = C(ph + (0 if front else 0.45) + (0.1 if left else 0))
            setrot(hip, 0, -0.55 * q, 0); setrot(kn, 0, 0.7 * max(0, dq) if front else 0.5 * max(0, -dq), 0)
        setrot(r.head, 0, 0.25 + 0.08 * c, 0)
        r.at(rd, dz=0.015 * abs(s)); setrot(rd, 0, -0.07 * s + 0.08, 0)
        sL, sR = r.rarms
        setrot(sL, -0.2, -0.9, 0); sL.children[-1].rotation_euler = (0, -0.6, 0)   # reins
        setrot(sR, 0.3, -1.6 - 0.6 * S(ph * 2 + 0.25) * 0.5, 0); sR.children[-1].rotation_euler = (0, -0.4 - 0.4 * max(0, S(ph * 2)), 0)   # axe up, chopping
    return {'root': root, 'pose': pose, 'fly': False}

# ═══ Spiders (the red desert spider; the spider queen is a huge purple one with a crown) ════════════════════
def spider_model(s=1.0, body='spiderRed', legm='spiderLeg', tipm='spiderDark', crown=False, eyem='eyeRed'):
    m = EM(); r = Rig(); root = G('spider')
    bd = r.body = G('sbody', root, (0, 0, 0.17 * s)); r.keep(bd)
    ell(0.085 * s, m[legm], (0.07 * s, 0, 0.0), (1.15, 1.0, 0.75), bd)   # cephalothorax
    ab = r.abd = G('abdomen', bd, (-0.04 * s, 0, 0.03 * s))
    ell(0.15 * s, m[body], (-0.12 * s, 0, 0.04 * s), (1.2, 1.0, 0.9), ab, rot=(0, -0.3, 0), seg=32)
    for i in range(3):   # pale markings on its back
        ell(0.022 * s * (1 - i * 0.15), m['gold'] if crown else m['eyeYellow'], (-0.1 * s - i * 0.055 * s, 0, 0.175 * s - i * 0.012 * s), (1.2, 1.4 - i * 0.2, 0.35), ab, rot=(0, -0.3 + i * 0.12, 0), seg=14)
    for i in range(4):
        mirror(lambda k: ell(0.016 * s, m[tipm], (-0.14 * s - i * 0.04 * s, k * (0.075 - i * 0.008) * s, 0.155 * s - i * 0.02 * s), (1.0, 1.0, 0.4), ab, rot=(k * 0.5, -0.3, 0), seg=10))
    ell(0.04 * s, m[tipm], (-0.27 * s, 0, 0.0), (0.6, 1, 1), ab, seg=12)   # spinnerets
    # the face: fangs, palps and eight eyes
    hd = r.head = G('shead', bd, (0.14 * s, 0, 0.0))
    ell(0.05 * s, m[legm], (0.0, 0, 0.0), (1.0, 1.1, 0.9), hd)
    for k in (1, -1):
        ell(0.024 * s, m[legm], (0.04 * s, k * 0.022 * s, -0.03 * s), (1, 0.9, 1.1), hd, seg=12)
        horn((0.05 * s, k * 0.022 * s, -0.05 * s), (0.4, -k * 0.2, -1), 0.05 * s, 0.012 * s, m['claw'], hd, curl=(-0.4, -k * 0.1, 0.2), n=5, seg=6)
        tube([(0.03 * s, k * 0.04 * s, -0.02 * s), (0.07 * s, k * 0.06 * s, -0.01 * s), (0.09 * s, k * 0.055 * s, -0.05 * s)], [0.01 * s, 0.009 * s, 0.006 * s], m[tipm], hd, seg=8)   # palps
        ell(0.016 * s, m['dark'], (0.042 * s, k * 0.018 * s, 0.022 * s), (1, 1, 1), hd, seg=12)
        ell(0.007 * s, m[eyem], (0.054 * s, k * 0.018 * s, 0.026 * s), (0.6, 1, 1), hd, seg=8)
        ell(0.01 * s, m['dark'], (0.035 * s, k * 0.04 * s, 0.03 * s), (1, 1, 1), hd, seg=10)
        ell(0.008 * s, m['dark'], (0.02 * s, k * 0.03 * s, 0.045 * s), (1, 1, 1), hd, seg=10)
        ell(0.007 * s, m['dark'], (0.048 * s, k * 0.035 * s, 0.006 * s), (1, 1, 1), hd, seg=8)
    if crown:   # a gold crown with red jewels, sat on the head
        cr = G('crown', hd, (-0.0 * s, 0, 0.045 * s), (0, -0.15, 0))
        cyl(0.05 * s, 0.03 * s, m['gold'], (0, 0, 0), parent=cr, verts=24, r2=0.056 * s, bevel=0.003)
        for i in range(6):
            a = i / 6 * TAU; cone(0.014 * s, 0.045 * s, m['gold'], (math.cos(a) * 0.052 * s, math.sin(a) * 0.052 * s, 0.035 * s), parent=cr, verts=6)
            sphere(0.006 * s, m['gold'], (math.cos(a) * 0.052 * s, math.sin(a) * 0.052 * s, 0.06 * s), parent=cr, seg=8)
            ell(0.007 * s, m['ruby'], (math.cos(a + 0.5) * 0.055 * s, math.sin(a + 0.5) * 0.055 * s, 0.002 * s), (1, 1, 1), cr, seg=8)
        sphere(0.016 * s, m['ruby'], (0.05 * s, 0, 0.0), parent=cr, seg=12)
    # eight legs: each a hip on the cephalothorax, a femur up to a high knee, a tibia down to a black tip
    r.slegs = []
    angs = [38, 72, 108, 142]
    for k in (1, -1):
        for j, a in enumerate(angs):
            ar = math.radians(a)
            hip = G('sleg', bd, (0.07 * s + math.cos(ar) * 0.06 * s, k * math.sin(ar) * 0.06 * s, -0.005 * s))
            reach = (0.24 + (0.03 if j in (0, 3) else 0)) * s; kz = 0.11 * s; kx = reach * 0.42
            tube([(0, 0, 0), (kx * 0.5, 0, kz * 0.85), (kx, 0, kz)], [0.018 * s, 0.016 * s, 0.014 * s], m[legm], hip, seg=10)
            ell(0.018 * s, m[tipm], (kx, 0, kz), (1, 1, 1), hip, seg=12)
            tube([(kx, 0, kz), (kx + (reach - kx) * 0.55, 0, kz * 0.15), (reach, 0, -0.17 * s)], [0.014 * s, 0.011 * s, 0.006 * s], m[legm], hip, seg=10)
            tube([(kx + (reach - kx) * 0.82, 0, -0.08 * s), (reach, 0, -0.165 * s), (reach + 0.004 * s, 0, -0.17 * s)], [0.0115 * s, 0.006 * s, 0.0], m[tipm], hip, seg=8)
            for t in (0.3, 0.6): torus(0.013 * s, 0.004 * s, m[tipm], (kx + (reach - kx) * t, 0, kz - (kz + 0.17 * s) * t * 1.0), (0, 0.6, 0), hip, maj=12, mn=5)
            base = k * ar; hip.rotation_euler = (0, 0, base)
            r.slegs.append((hip, base, k, j))
    def pose(ph):
        for hip, base, k, j in r.slegs:
            off = 0.5 if ((j % 2 == 0) == (k > 0)) else 0.0
            u = S(ph + off); du = C(ph + off)
            yaw = base - k * 0.22 * u
            setrot(hip, 0, -0.3 * max(0.0, du), yaw)
        r.at(bd, dz=0.008 * s * abs(S(ph * 2)))
        setrot(bd, 0.03 * S(ph * 2), 0, 0)
        setrot(r.abd, 0, 0.05 * S(ph * 2), 0.05 * S(ph))
        setrot(r.head, 0, 0, 0.06 * S(ph))
    return {'root': root, 'pose': pose, 'fly': False}

def spider(): return spider_model(1.0)
def spiderQueen(): return spider_model(2.2, 'queen', 'queenLeg', 'spiderDark', crown=True, eyem='eyeGreen')

# ═══ Ogre (and its icy cousin, the frost troll) ═════════════════════════════
def brute(s, skin, kind='ogre'):
    """a big-bellied brute: short thick legs, long heavy arms, a small head pushed forward with an underbite"""
    m = EM(); r = Rig(); root = G(kind)
    S_ = lambda *v: tuple(x * s for x in v)
    r.pelvis = pel = G('pelvis', root, S_(0, 0, 0.3)); r.keep(pel)
    ell(0.15 * s, m[skin], S_(0, 0, 0.02), (1.0, 1.15, 0.8), pel)
    if kind == 'ogre':   # loincloth and belt
        lathe([(0.15 * s, 0.03 * s), (0.165 * s, -0.04 * s), (0.18 * s, -0.12 * s), (0.0, -0.12 * s)], m['leatherLt'], parent=pel, seg=24)
        o = lathe([(0.1 * s, 0.0), (0.12 * s, -0.1 * s), (0.13 * s, -0.16 * s)], m['leatherDk'], S_(0.06, 0, -0.0), parent=pel, seg=10); o.scale = (0.5, 0.6, 1)
        torus(0.155 * s, 0.018 * s, m['leatherDk'], S_(0, 0, 0.035), parent=pel, maj=28, mn=8)
        box(0.05 * s, 0.06 * s, 0.05 * s, m['brass'], S_(0.15, 0, 0.035), parent=pel, bevel=0.008)
        ell(0.03 * s, m['boneOld'], S_(0.14, 0.09, 0.0), (0.8, 1, 1), pel, seg=12)   # a skull trophy
    else:   # a shaggy white fur kilt
        o = lathe([(0.15 * s, 0.04 * s), (0.175 * s, -0.04 * s), (0.19 * s, -0.13 * s), (0.0, -0.13 * s)], m['whiteFur'], parent=pel, seg=28)
        jag(o, -0.1 * s, 0.05 * s, 2, 9)
    r.chest = ch = G('chest', pel, S_(0, 0, 0.06))
    ell(0.2 * s, m[skin], S_(0.05, 0, 0.08), (1.0, 1.05, 0.95), ch)   # the belly
    ell(0.008 * s + 0.01, m['mouth'], S_(0.245, 0, 0.05), (0.5, 1, 1), ch, seg=8)   # navel
    ell(0.18 * s, m[skin], S_(-0.02, 0, 0.27), (0.9, 1.22, 0.82), ch)   # the chest and shoulders
    mirror(lambda k: ell(0.09 * s, m[skin], S_(0.04, k * 0.11, 0.22), (1.0, 1.0, 0.75), ch))   # pecs
    if kind == 'ogre':
        ell(0.12 * s, m['brownFur'], S_(-0.01, 0.17, 0.34), (1.0, 0.9, 0.6), ch)   # a fur pelt over one shoulder
        tube([S_(0.1, 0.17, 0.3), S_(0.17, 0.0, 0.2), S_(0.12, -0.15, 0.12)], 0.022 * s, m['leatherDk'], ch, seg=8)
    else:   # crystal shards bristling from the back
        rng = random.Random(11)
        for i in range(13):
            a = rng.uniform(-1.1, 1.1); z = rng.uniform(0.2, 0.42) * s; base = Vector((-0.12 * s, math.sin(a) * 0.17 * s, z))
            d = Vector((-0.6, math.sin(a) * 0.8, 0.7 + rng.uniform(0, 0.5)))
            h = rng.uniform(0.12, 0.24) * s; c = cone_to(tuple(base), tuple(d), 0.035 * s, h, m['ice' if i % 3 else 'iceDeep'], ch, verts=5)
    hd = r.head = G('head', ch, S_(0.19, 0, 0.37))
    ell(0.095 * s, m[skin], (0, 0, 0), (1.0, 1.0, 0.95), hd)
    ell(0.07 * s, m[skin], S_(0.04, 0, -0.04), (1.05, 1.25, 0.8), hd)   # the jaw jutting out
    tube([S_(0.06, -0.06, 0.03), S_(0.085, 0, 0.04), S_(0.06, 0.06, 0.03)], 0.022 * s, m[skin], hd, seg=10)   # brow
    ell(0.03 * s, m[skin], S_(0.095, 0, 0.0), (0.9, 1.0, 0.85), hd, seg=14)   # nose
    mirror(lambda k: ell(0.009 * s, m['mouth'], S_(0.115, k * 0.012, -0.008), (0.6, 1, 0.8), hd, seg=8))
    eyem = 'eyeYellow' if kind == 'ogre' else 'eyeCyan'
    mirror(lambda k: [ell(0.017 * s, m[eyem], S_(0.072, k * 0.035, 0.018), (0.6, 1, 0.75), hd, seg=12),
                      ell(0.008 * s, m['dark'], S_(0.08, k * 0.033, 0.018), (0.5, 1, 1), hd, seg=8)])
    tube([S_(0.085, -0.05, -0.05), S_(0.105, 0, -0.06), S_(0.085, 0.05, -0.05)], 0.008 * s, m['mouth'], hd, seg=8)   # the mouth line
    mirror(lambda k: horn(S_(0.1, k * 0.035, -0.055), (0.2, k * 0.2, 1), 0.06 * s, 0.014 * s, m['teeth'], hd, curl=(-0.2, k * 0.1, 0.0), n=5, seg=8))   # tusks
    if kind == 'ogre':
        mirror(lambda k: cone_to(S_(-0.01, k * 0.08, 0.01), (-0.4, k * 1, 0.4), 0.03 * s, 0.07 * s, m[skin], hd, verts=10))   # ears
        for i in range(5): cone_to(S_(0.02 - i * 0.03, 0, 0.08 - i * 0.004), (-0.3, 0, 1), 0.018 * s, (0.05 - i * 0.004) * s, m['featherBlk'], hd, verts=6)   # topknot
    else:
        ell(0.07 * s, m['whiteFur'], S_(0.06, 0, -0.08), (0.9, 1.2, 1.1), hd)   # frosty beard
        for i in range(6): cone_to(S_(0.07 + (i % 2) * 0.01, (i - 2.5) * 0.02, -0.1), (0.1, 0, -1), 0.012 * s, (0.05 + (i % 3) * 0.02) * s, m['ice'], hd, verts=5)   # icicles
        ice_cluster(hd, S_(-0.01, 0, 0.07), (-0.3, 0, 1), 4, 0.09 * s, m, seed=21, spread=0.5, r0=0.02 * s)
        for i in range(5): cone_to(S_(0.07 + (i - 2) * 0.004, (i - 2) * 0.025, -0.12), (0.2, (i - 2) * 0.1, -1), 0.02 * s, 0.05 * s, m['whiteFur'], hd, verts=6)
        mirror(lambda k: horn(S_(-0.02, k * 0.07, 0.04), (-0.2, k * 1, 0.5), 0.12 * s, 0.022 * s, m['ice'], hd, curl=(0, -k * 0.4, 0.5), n=6, seg=8))
    def thigh(g, L): tube([(0, 0, 0), (0, 0, -L)], [0.08 * s, 0.065 * s], m[skin], g, seg=14)
    def shin(g, L):
        tube([(0, 0, 0), (0, 0, -L)], [0.065 * s, 0.06 * s], m[skin], g, seg=14)
        if kind == 'ogre': torus(0.065 * s, 0.014 * s, m['leatherDk'], (0, 0, -L * 0.6), parent=g, maj=16, mn=6)
        else: torus(0.07 * s, 0.03 * s, m['whiteFur'], (0, 0, -L * 0.75), parent=g, maj=16, mn=8)
    def foot(g):
        ell(0.07 * s, m[skin], (0.03 * s, 0, -0.018 * s), (1.35, 0.95, 0.5), g)
        for j in (-1, 0, 1): ell(0.022 * s, m[skin], (0.11 * s, j * 0.035 * s, -0.03 * s), (1.0, 1, 0.8), g, seg=10)
    for k in (1, -1): leg(r, pel, S_(0, k * 0.1, -0.03), 0.12 * s, 0.1 * s, thigh, shin, foot)
    def upper(g, L):
        ell(0.075 * s, m[skin], (-0.01 * s, -0.0, -0.02 * s), (1, 0.85, 1.05), g); tube([(0, 0, 0), (0, 0, -L)], [0.065 * s, 0.055 * s], m[skin], g, seg=14)
        if kind != 'ogre': ice_cluster(g, (0, 0, 0.03 * s), (-0.2, 0, 1), 5, 0.13 * s, m, seed=int(g.location.y * 100) + 7, spread=0.55, r0=0.028 * s)
    def fore(g, L):
        tube([(0, 0, 0), (0, 0, -L * 0.6), (0, 0, -L)], [0.06 * s, 0.07 * s, 0.06 * s], m[skin], g, seg=14)
        if kind == 'ogre': tube([(0, 0, -L * 0.45), (0, 0, -L * 0.85)], 0.074 * s, m['leatherDk'], g, seg=14)
        else:
            for i in range(4): cone_to((-0.04 * s, (i - 1.5) * 0.03 * s, -L * (0.3 + i * 0.12)), (-1, (i - 1.5) * 0.3, 0.5), 0.02 * s, 0.07 * s, m['ice'], g, verts=5)
    def fist(g):
        ell(0.068 * s, m[skin], (0.01 * s, 0, -0.04 * s), (1.0, 0.95, 1.05), g)
        for j in range(4): ell(0.02 * s, m[skin], (0.06 * s, (j - 1.5) * 0.03 * s, -0.06 * s), (1, 0.9, 1), g, seg=10)   # knuckles
        ell(0.024 * s, m[skin], (0.03 * s, 0.05 * s if g.parent.parent.location.y > 0 else -0.05 * s, -0.02 * s), (1, 0.8, 1.2), g, seg=10)   # thumb
    def fistClub(g):
        fist(g)
        if kind != 'ogre': return
        cl = G('club', g, (0.01 * s, 0, -0.04 * s), (0, math.radians(95), 0))
        tube([(0, 0, -0.08 * s), (0, 0, 0.1 * s), (0.005 * s, 0, 0.26 * s), (0, 0, 0.36 * s), (0, 0, 0.4 * s)], [0.025 * s, 0.03 * s, 0.055 * s, 0.065 * s, 0.0], m['clubWood'], cl, seg=14)
        for zz in (0.16, 0.06): torus(0.042 * s if zz < 0.1 else 0.05 * s, 0.01 * s, m['iron'], (0, 0, zz * s), parent=cl, maj=16, mn=6)
        rng = random.Random(2)
        for i in range(11):
            a = i * 2.4; z = (0.2 + (i % 4) * 0.045) * s; rr = 0.055 * s
            cone_to((math.cos(a) * rr, math.sin(a) * rr, z), (math.cos(a), math.sin(a), 0.25), 0.012 * s, 0.05 * s, m['steel'], cl, verts=6)
    arm(r, ch, S_(0.0, 0.23, 0.3), 0.15 * s, 0.14 * s, upper, fore, fist)
    arm(r, ch, S_(0.0, -0.23, 0.3), 0.15 * s, 0.14 * s, upper, fore, fistClub)
    for sh, el, wr in r.arms: sh.rotation_euler = (0, 0, 0)
    def pose(ph):
        walk(r, ph, amp=0.35, knee=0.7, arms=0.3, elbow=0.4, bob=0.02 * s, twist=0.12, roll=0.07, lean=0.18)
        s1 = S(ph)
        shL, elL, wrL = r.arms[0]; shR, elR, wrR = r.arms[1]
        setrot(shL, -0.25, 0.35 * s1, 0); setrot(elL, 0, -0.45 - 0.2 * max(0, -s1), 0)
        if kind == 'ogre':   # the club carried high on the shoulder, bouncing
            setrot(shR, 0.3, -0.75 - 0.35 * s1, 0); setrot(elR, 0, -1.2 + 0.2 * s1, 0); setrot(wrR, 0, -0.3, 0)
        else:   # knuckles swinging low
            setrot(shR, 0.25, -0.35 * s1, 0); setrot(elR, 0, -0.45 - 0.2 * max(0, s1), 0)
    return {'root': root, 'pose': pose, 'fly': False}

def ogre(): return brute(0.98, 'ogreSkin', 'ogre')
def frostTroll(): return brute(1.5, 'trollSkin', 'troll')

# ═══ Wraith (and the wraith lord) ═══════════════════════════════════════════
def wraith_model(s=1.0, robe='ghost', deep='ghostDeep', crown=False):
    """a hooded spirit flying flat out: a ragged torso trailing into waving wisps, long arms with black claws"""
    m = EM(); r = Rig(); root = G('wraith')
    bd = r.body = G('wbody', root, (0, 0, 0.26 + 0.08 * s)); r.keep(bd)
    tube([(-0.12 * s, 0, -0.02 * s), (-0.04 * s, 0, 0.0), (0.05 * s, 0, 0.03 * s), (0.11 * s, 0, 0.06 * s)], [0.05 * s, 0.075 * s, 0.085 * s, 0.07 * s], m[robe], bd, seg=18)
    for i in range(4):   # glowing rib-like streaks
        x = -0.04 * s + i * 0.035 * s
        tube([(x, -0.07 * s, 0.03 * s), (x + 0.01 * s, 0, 0.09 * s), (x, 0.07 * s, 0.03 * s)], 0.006 * s, m['eyeGhost'] if False else m[deep], bd, seg=6)
    rng = random.Random(3)
    for i in range(8):   # ragged tatters hanging from the torso
        x = 0.08 * s - i * 0.025 * s; k = 1 if i % 2 else -1
        tube([(x, k * 0.05 * s, -0.02 * s), (x - 0.04 * s, k * 0.07 * s, -0.07 * s), (x - 0.1 * s, k * 0.06 * s, -0.1 * s - rng.uniform(0, 0.03) * s)], [0.03 * s, 0.02 * s, 0.0], m[deep], bd, seg=8, scale_y=0.35)
    # hood with a dark face and glowing eyes
    hd = r.head = G('whead', bd, (0.15 * s, 0, 0.09 * s), (0, -0.25, 0))
    ell(0.085 * s, m[robe], (0, 0, 0), (1.15, 1.0, 0.95), hd)
    tube([(-0.02 * s, 0, 0.04 * s), (-0.08 * s, 0, 0.07 * s), (-0.14 * s, 0, 0.05 * s), (-0.17 * s, 0, 0.02 * s)], [0.05 * s, 0.035 * s, 0.018 * s, 0.0], m[robe], hd, seg=12)
    ell(0.062 * s, m['dark'], (0.045 * s, 0, -0.008 * s), (0.75, 0.95, 0.95), hd)
    mirror(lambda k: ell(0.016 * s, m['eyeGhost'], (0.085 * s, k * 0.022 * s, 0.0), (0.5, 0.9, 0.55), hd, rot=(k * 0.4, 0, 0), seg=10))
    if crown:
        cr = G('crown', hd, (0.0, 0, 0.06 * s), (0, -0.1, 0))
        cyl(0.065 * s, 0.03 * s, m['gold'], (0, 0, 0), parent=cr, verts=28, r2=0.072 * s, bevel=0.003)
        for i in range(7):
            a = i / 7 * TAU; cone(0.016 * s, 0.06 * s, m['gold'], (math.cos(a) * 0.068 * s, math.sin(a) * 0.068 * s, 0.04 * s), parent=cr, verts=6)
            ell(0.008 * s, m['ruby' if i % 2 else 'emerald'], (math.cos(a + 0.45) * 0.072 * s, math.sin(a + 0.45) * 0.072 * s, 0.0), (1, 1, 1), cr, seg=8)
    # wisps trailing behind, three links each so they wave
    r.wisps = []
    rng = random.Random(7)
    for i in range(6):
        y = (i - 2.5) * 0.028 * s; L = (0.1 + rng.uniform(0, 0.04)) * s; prev = bd; rad = 0.04 * s * (1 - abs(i - 2.5) * 0.12)
        start = (-0.1 * s, y, -0.02 * s + rng.uniform(-0.02, 0.02) * s)
        links = []
        for j in range(3):
            g = G('wisp', prev, start if j == 0 else (-L, 0, 0), (0, 0, (i - 2.5) * 0.12 if j == 0 else 0)); links.append(g)
            r0 = rad * (1 - j / 3); r1 = rad * (1 - (j + 1) / 3)
            tube([(0, 0, 0), (-L * 0.5, 0, 0.004 * s), (-L, 0, 0)], [r0, (r0 + r1) / 2, r1 if j < 2 else 0.0], m[robe if j == 0 else deep], g, seg=10, scale_y=0.7)
            prev = g
        r.wisps.append(links)
    # long arms reaching forward, bony black claws
    r.warms = []
    for k in (1, -1):
        sh = G('wsh', bd, (0.09 * s, k * 0.07 * s, 0.05 * s))
        tube([(0, 0, 0), (0.07 * s, k * 0.05 * s, 0.0), (0.12 * s, k * 0.075 * s, -0.01 * s)], [0.03 * s, 0.02 * s, 0.016 * s], m[robe], sh, seg=12)
        el = G('wel', sh, (0.12 * s, k * 0.075 * s, -0.01 * s))
        tube([(0, 0, 0), (0.08 * s, -k * 0.0 * s, 0.0), (0.14 * s, -k * 0.01 * s, 0.0)], [0.015 * s, 0.011 * s, 0.01 * s], m[deep], el, seg=10)
        hand = G('whand', el, (0.14 * s, -k * 0.01 * s, 0.0))
        ell(0.022 * s, m['claw'], (0.01 * s, 0, 0), (1.2, 1.1, 0.6), hand, seg=12)
        for j in range(4):
            a = (j - 1.5) * 0.45
            horn((0.015 * s, 0, 0), (math.cos(a), k * math.sin(a) * 1.0 + k * 0.2, -0.05), 0.1 * s, 0.009 * s, m['claw'], hand, curl=(0, -k * 0.05, -0.35), n=6, seg=6)
        r.warms.append((sh, el, hand, k))
    def pose(ph):
        a = TAU * ph
        r.at(bd, dz=0.035 * s * math.sin(a)); setrot(bd, 0.05 * math.sin(a), -0.08 + 0.04 * math.cos(a), 0)
        for i, links in enumerate(r.wisps):
            for j, g in enumerate(links):
                base = (i - 2.5) * 0.12 if j == 0 else 0
                setrot(g, 0.3 * math.sin(a - j * 1.1 + i * 0.9), 0.25 * math.sin(a - j * 1.2 + i), base + 0.3 * math.sin(a - j * 1.3 + i * 0.7))
        for sh, el, hand, k in r.warms:   # reaching and raking, one then the other
            q = math.sin(a + (0 if k > 0 else math.pi))
            setrot(sh, 0, -0.1 + 0.2 * q, k * (-0.1 + 0.2 * q)); setrot(el, 0, 0.1 - 0.3 * q, -k * (0.25 + 0.15 * q)); setrot(hand, 0, 0.3 + 0.3 * q, -k * 0.2)
        setrot(r.head, 0, -0.25 + 0.08 * math.sin(a + 1), 0.1 * math.sin(a))
    return {'root': root, 'pose': pose, 'fly': True}

def wraith(): return wraith_model(1.0)
def wraithLord(): return wraith_model(1.65, 'ghostLord', 'ghostLordDeep', crown=True)

# ═══ Shaman ═════════════════════════════════════════════════════════════════
def shaman():
    m = EM(); r = Rig(); root = G('shaman')
    r.pelvis = pel = G('pelvis', root, (0, 0, 0.2)); r.keep(pel)
    robe = lathe([(0.0, 0.2), (0.09, 0.2), (0.105, 0.1), (0.12, 0.0), (0.145, -0.12), (0.16, -0.19), (0.0, -0.19)], m['clothDark'], parent=pel, seg=32)
    jag(robe, -0.15, 0.06, 1, 7)
    torus(0.137, 0.011, m['cloth'], (0, 0, -0.085), parent=pel, maj=32, mn=6)   # a red hem band
    for i in range(8): a = i / 8 * TAU; ell(0.009, m['gold'], (math.cos(a) * 0.145, math.sin(a) * 0.145, -0.085), (1, 1, 1), pel, seg=8)
    tube([(0.1, 0.0, 0.12), (0.12, 0.02, 0.0), (0.135, 0.03, -0.1)], [0.025, 0.022, 0.02], m['cloth'], pel, seg=8, scale_y=0.4)   # sash ends
    r.chest = ch = G('chest', pel, (0, 0, 0.12))
    ell(0.1, m['clothDark'], (0, 0, 0.08), (0.95, 1.1, 1.0), ch)
    torus(0.1, 0.014, m['rope'], (0, 0, 0.0), parent=ch, maj=24, mn=6)   # rope belt
    ell(0.035, m['leatherLt'], (0.06, 0.08, -0.03), (0.8, 0.8, 1.1), ch, seg=12)   # pouch
    for i in range(7):   # a necklace of teeth and little skulls
        a = math.radians(-60 + i * 20); p = (math.cos(a) * 0.085 + 0.01, math.sin(a) * 0.085, 0.13 - 0.03 * math.cos(a * 1.5))
        if i % 3 == 0: ell(0.016, m['boneOld'], p, (0.9, 1, 1), ch, seg=10)
        else: cone_to(p, (0.3, 0, -1), 0.008, 0.03, m['teeth'], ch, verts=6)
    tube([(0.07, -0.08, 0.15), (0.1, 0, 0.1), (0.07, 0.08, 0.15)], 0.004, m['rope'], ch, seg=5)
    r.head = hd = G('head', ch, (0.02, 0, 0.23))
    hood = lathe([(0.0, 0.1), (0.04, 0.095), (0.075, 0.07), (0.088, 0.02), (0.085, -0.04), (0.1, -0.08), (0.06, -0.075)], m['clothDark'], parent=hd, seg=28)
    tube([(-0.02, 0, 0.08), (-0.05, 0, 0.12), (-0.1, 0, 0.12), (-0.13, 0, 0.08)], [0.05, 0.035, 0.018, 0.0], m['clothDark'], hd, seg=10)   # the hood's peak, flopping back
    ell(0.065, m['dark'], (0.045, 0, -0.01), (0.65, 0.9, 1.0), hd)
    mirror(lambda k: ell(0.012, m['eyeGreen'], (0.083, k * 0.024, 0.0), (0.4, 1, 0.6), hd, seg=10))
    tube([(0.075, 0, 0.0), (0.1, 0, -0.03), (0.095, 0, -0.045)], [0.012, 0.01, 0.004], m['goblinSkin'], hd, seg=8)   # a hooked nose
    for i in range(5): cone_to((0.07, (i - 2) * 0.015, -0.05), ((0.6, (i - 2) * 0.1, -1)), 0.012, 0.07 - abs(i - 2) * 0.012, m['boneOld'], hd, verts=6)   # a bone-white beard of braids
    for k in (1, -1):   # feathers tied on the hood
        f = horn((-0.04, k * 0.07, 0.04), (-0.6, k * 0.4, 0.6), 0.08, 0.012, m['feather' if k > 0 else 'featherBlk'], hd, curl=(-0.2, 0, -0.1), n=5, seg=6)
    # feet poking out under the robe
    for k in (1, -1):
        hip = G('hip', pel, (0, k * 0.05, -0.05)); kn = G('knee', hip, (0, 0, -0.08)); an = G('ankle', kn, (0, 0, -0.07))
        ell(0.03, m['leatherDk'], (0.025, 0, -0.012), (1.5, 0.95, 0.6), an, seg=12); r.legs.append((hip, kn, an))
    r.L = 0.15
    def sleeve(g, L): lathe([(0.03, 0.01), (0.035, -L * 0.4), (0.05, -L * 1.1), (0.0, -L * 1.05)], m['clothDark'], parent=g, seg=16)
    def fore(g, L): tube([(0, 0, -L * 0.3), (0, 0, -L)], [0.018, 0.016], m['goblinSkin'], g, seg=8)
    def hand(g): ell(0.022, m['goblinSkin'], (0.005, 0, -0.012), (1, 0.9, 1.1), g, seg=12)
    def handStaff(g):
        hand(g)
        st = G('staff', g, (0.005, 0, -0.012), (0, 0, 0))
        rng = random.Random(4); pts = [(rng.uniform(-0.006, 0.006), rng.uniform(-0.006, 0.006), z) for z in [-0.2 + i * 0.07 for i in range(9)]]
        tube(pts, [0.012, 0.012, 0.013, 0.013, 0.014, 0.014, 0.015, 0.017, 0.02], m['woodDark'], st, seg=8)
        top = pts[-1]
        for j in range(4):   # roots twisting up round the orb
            a = j / 4 * TAU
            tube([top, (math.cos(a) * 0.03, math.sin(a) * 0.03, top[2] + 0.04), (math.cos(a + 0.6) * 0.04, math.sin(a + 0.6) * 0.04, top[2] + 0.08), (math.cos(a + 1.2) * 0.012, math.sin(a + 1.2) * 0.012, top[2] + 0.12)], [0.009, 0.008, 0.006, 0.0], m['woodDark'], st, seg=6)
        sphere(0.04, m['orbGreen'], (0, 0, top[2] + 0.075), parent=st, seg=20)
        sphere(0.02, m['orbCore'], (0, 0, top[2] + 0.075), parent=st, seg=12)
        L = bpy.data.lights.new('orbLight', 'POINT'); L.energy = 2.0; L.color = (0.4, 1.0, 0.3); L.shadow_soft_size = 0.03
        lo = bpy.data.objects.new('orbLight', L); bpy.context.scene.collection.objects.link(lo); lo.parent = st; lo.location = (0, 0, top[2] + 0.075)
        for j, mt in enumerate(('feather', 'boneOld', 'featherBlk')):   # charms hanging under the orb
            tube([(0.01, 0, top[2] + 0.0), (0.02 + j * 0.008, (j - 1) * 0.015, top[2] - 0.04)], 0.002, m['rope'], st, seg=4)
            ell(0.012, m[mt], (0.02 + j * 0.008, (j - 1) * 0.015, top[2] - 0.05), (0.7, 0.7, 1.4), st, seg=8)
    arm(r, ch, (0.0, 0.1, 0.13), 0.08, 0.08, sleeve, fore, hand)
    arm(r, ch, (0.0, -0.1, 0.13), 0.08, 0.08, sleeve, fore, handStaff)
    def pose(ph):
        walk(r, ph, amp=0.35, knee=0.6, arms=0.25, elbow=0.4, bob=0.012, twist=0.08, roll=0.04, lean=0.12)
        s1, c1 = S(ph), C(ph)
        setrot(pel, 0.03 * s1, 0.04 * c1, -0.04 * s1)   # the robe swaying
        shL, elL, wrL = r.arms[0]; shR, elR, wrR = r.arms[1]
        setrot(shL, -0.3, -0.5 + 0.15 * s1, 0); setrot(elL, 0.3, -0.9, 0); setrot(wrL, 0, 0, 0)   # a hand raised, casting
        setrot(shR, 0.15, -0.35 - 0.2 * s1, 0); setrot(elR, 0, -0.7 + 0.1 * s1, 0); setrot(wrR, 0, 1.05 + 0.2 * s1 - 0.0, 0)   # the staff walked along
    return {'root': root, 'pose': pose, 'fly': False}

# ═══ Gargoyle ═══════════════════════════════════════════════════════════════
def bat_wing(parent, k, span, m, skin='garWing', bone='garStone'):
    """a bat wing spread along ±Y: an arm bone to the wrist, four finger bones, membrane scalloped between them"""
    g = G('wing', parent)
    wrist = (-0.04 * span, 0.42 * span * k)
    tips = [(0.06 * span, 0.95 * span * k), (-0.22 * span, 1.0 * span * k), (-0.5 * span, 0.8 * span * k), (-0.62 * span, 0.45 * span * k)]
    root2 = (-0.4 * span, 0.06 * span * k)
    outline = [(0.03 * span, 0.0), wrist, tips[0]]
    for i in range(1, len(tips)):
        a, b = Vector(tips[i - 1]), Vector(tips[i]); mid = (a + b) / 2; w = Vector(wrist)
        sc = mid + (w - mid) * 0.32; outline += [tuple(sc), tips[i]]
    w = Vector(wrist); mid = (Vector(tips[-1]) + Vector(root2)) / 2; outline += [tuple(mid + (w - mid) * 0.25), root2]
    if k < 0: outline = outline[::-1]
    slab(outline, 0.008 * span, m[skin], (0, 0, 0), parent=g, smooth=True)
    tube([(0, 0, 0), (wrist[0], wrist[1], 0.012 * span)], [0.035 * span, 0.022 * span], m[bone], g, seg=10)
    ell(0.03 * span, m[bone], (wrist[0], wrist[1], 0.012 * span), (1, 1, 1), g, seg=12)
    horn((wrist[0], wrist[1], 0.02 * span), (0.6, 0.4 * k, 0.6), 0.1 * span, 0.016 * span, m['claw'], g, curl=(0.1, 0, -0.3), n=5, seg=6)   # thumb claw
    for t in tips: tube([(wrist[0], wrist[1], 0.01 * span), ((wrist[0] + t[0]) / 2, (wrist[1] + t[1]) / 2, 0.012 * span), (t[0], t[1], 0.004 * span)], [0.016 * span, 0.011 * span, 0.003 * span], m[bone], g, seg=8)
    return g

def gargoyle():
    m = EM(); r = Rig(); root = G('gargoyle')
    bd = r.body = G('gbody', root, (0, 0, 0.32)); r.keep(bd)
    ell(0.1, m['garStone'], (0, 0, 0.02), (1.25, 0.95, 0.9), bd, rot=(0, -0.35, 0))   # hunched torso
    ell(0.075, m['garStone'], (0.07, 0, 0.06), (1.0, 1.25, 0.9), bd)   # chest
    for i in range(5): cone_to((-0.06 + i * 0.03, 0, 0.11 - abs(i - 1) * 0.012), (-0.4, 0, 1), 0.015, 0.035, m['garStone'], bd, verts=5)   # spine ridges
    hd = r.head = G('ghead', bd, (0.15, 0, 0.08))
    ell(0.06, m['garStone'], (0, 0, 0), (1.15, 1.0, 0.9), hd)
    tube([(0.02, 0, -0.01), (0.07, 0, -0.025), (0.085, 0, -0.035)], [0.04, 0.032, 0.025], m['garStone'], hd, seg=12)   # muzzle
    tube([(0.035, -0.04, 0.025), (0.055, 0, 0.03), (0.035, 0.04, 0.025)], 0.014, m['garStone'], hd, seg=8)   # brow
    mirror(lambda k: ell(0.013, m['eyeOrange'], (0.05, k * 0.026, 0.013), (0.5, 1, 0.6), hd, rot=(k * 0.3, 0, 0), seg=10))
    ell(0.026, m['mouth'], (0.07, 0, -0.045), (1.2, 0.9, 0.35), hd, seg=12)   # snarling mouth
    mirror(lambda k: [cone_to((0.08, k * 0.016, -0.03), (0, 0, -1), 0.006, 0.022, m['teeth'], hd, verts=5), cone_to((0.07, k * 0.022, -0.06), (0, 0, 1), 0.005, 0.016, m['teeth'], hd, verts=5)])
    mirror(lambda k: horn((-0.01, k * 0.04, 0.04), (-0.4, k * 0.5, 0.8), 0.13, 0.017, m['plateDark'], hd, curl=(-0.6, 0, -0.1), n=7, seg=8))
    mirror(lambda k: cone_to((-0.02, k * 0.06, 0.0), (-0.4, k * 1, 0.1), 0.02, 0.06, m['garStone'], hd, verts=6))   # pointed ears
    # arms reaching forward with claws, legs tucked under, a spaded tail
    r.garms = []
    for k in (1, -1):
        sh = G('gsh', bd, (0.08, k * 0.08, 0.04))
        tube([(0, 0, 0), (0.05, k * 0.02, -0.07)], [0.028, 0.022], m['garStone'], sh, seg=10)
        el = G('gel', sh, (0.05, k * 0.02, -0.07)); tube([(0, 0, 0), (0.08, 0, -0.02)], [0.02, 0.018], m['garStone'], el, seg=10)
        ell(0.02, m['garStone'], (0.085, 0, -0.022), (1.2, 1, 0.8), el, seg=10)
        for j in range(3): horn((0.095, (j - 1) * 0.012, -0.025), (1, (j - 1) * 0.3, -0.6), 0.035, 0.006, m['claw'], el, curl=(0, 0, -0.5), n=4, seg=5)
        lg = G('gleg', bd, (-0.06, k * 0.06, -0.04))
        tube([(0, 0, 0), (0.05, k * 0.01, -0.05)], [0.04, 0.03], m['garStone'], lg, seg=10)
        tube([(0.05, k * 0.01, -0.05), (-0.01, k * 0.01, -0.09), (0.01, k * 0.01, -0.1)], [0.022, 0.016, 0.014], m['garStone'], lg, seg=8)
        for j in range(3): horn((0.015, k * 0.01 + (j - 1) * 0.012, -0.1), (1, (j - 1) * 0.3, -0.3), 0.03, 0.006, m['claw'], lg, curl=(0, 0, -0.4), n=4, seg=5)
        r.garms.append((sh, el, lg, k))
    tl = r.tail = G('gtail', bd, (-0.11, 0, -0.01))
    tube([(0, 0, 0), (-0.08, 0, -0.04), (-0.16, 0, -0.03), (-0.21, 0, 0.0)], [0.025, 0.017, 0.01, 0.007], m['garStone'], tl, seg=8)
    slab([(0, 0), (-0.03, 0.025), (-0.06, 0.0), (-0.03, -0.025)], 0.008, m['garWing'], (-0.2, 0, 0.0), (0, 0.3, 0), tl, smooth=True)
    r.wings = []
    for k in (1, -1):
        wg = G('wingRoot', bd, (0.0, k * 0.05, 0.1), (0, 0, 0)); bat_wing(wg, k, 0.3, m); r.wings.append((wg, k))
    def pose(ph):
        a = TAU * ph; f = math.sin(a)
        r.at(bd, dz=-0.03 * f); setrot(bd, 0, -0.15 + 0.05 * math.cos(a), 0)
        for wg, k in r.wings: setrot(wg, k * (-0.25 - 0.75 * f), -0.15 + 0.15 * f, k * (0.15 + 0.15 * f))   # wings beating
        for sh, el, lg, k in r.garms: setrot(sh, 0, -0.2 + 0.15 * f, 0); setrot(el, 0, 0.2 * f, 0); setrot(lg, 0, 0.3 + 0.15 * math.cos(a), 0)
        setrot(r.tail, 0, 0.2 * math.sin(a - 1), 0.3 * math.sin(a * 0.5 * 2 - 2))
        setrot(r.head, 0, 0.12 * math.cos(a), 0)
    return {'root': root, 'pose': pose, 'fly': True}

# ═══ Sheep ══════════════════════════════════════════════════════════════════
def sheep():
    m = EM(); r = Rig(); root = G('sheep')
    bd = r.body = G('sbody', root, (0, 0, 0.22)); r.keep(bd)
    ell(0.12, m['wool'], (0, 0, 0.01), (1.3, 0.95, 0.85), bd)
    rng = random.Random(8)
    for i in range(36):   # puffs of wool all over an egg
        u = rng.uniform(-1, 1); a = rng.uniform(0, TAU); z = rng.uniform(-0.4, 1)
        rr = math.sqrt(max(0, 1 - z * z)); p = (math.cos(a) * rr * 0.15, math.sin(a) * rr * 0.11, z * 0.1 + 0.01)
        ell(rng.uniform(0.045, 0.06), m['wool'], p, (1, 1, 0.9), bd, seg=14)
    hd = r.head = G('shead', bd, (0.16, 0, 0.05), (0, 0.35, 0))
    ell(0.05, m['sheepFace'], (0.02, 0, -0.01), (1.25, 0.85, 0.95), hd)
    ell(0.03, m['sheepFace'], (0.065, 0, -0.03), (1.0, 0.85, 0.8), hd, seg=14)
    mirror(lambda k: [ell(0.012, m['eyeWhite'], (0.045, k * 0.03, 0.01), (0.7, 0.6, 0.9), hd, seg=10), ell(0.006, m['dark'], (0.052, k * 0.032, 0.008), (0.5, 0.6, 1), hd, seg=8)])
    for k in (1, -1):
        ear = G('ear', hd, (0.0, k * 0.04, 0.01), (k * 0.6, 0.3, 0)); ell(0.03, m['sheepFace'], (0, k * 0.025, 0), (0.5, 1.0, 0.35), ear, seg=12)
    for i in range(5): ell(0.025, m['wool'], (-0.0 + (i % 2) * 0.015, (i - 2) * 0.014, 0.04), (1, 1, 1), hd, seg=12)   # a woolly fringe
    def build(hip, front, k):
        tube([(0, 0, 0), (0, 0, -0.06)], [0.02, 0.016], m['sheepFace'], hip, seg=10)
        kn = G('qknee', hip, (0, 0, -0.06)); tube([(0, 0, 0), (0, 0, -0.09)], [0.015, 0.014], m['sheepFace'], kn, seg=10)
        cyl(0.017, 0.022, m['hoof'], (0.004, 0, -0.095), parent=kn, verts=12, r2=0.014)
        return kn
    quad_legs(r, bd, [(0.08, 0.05, -0.06), (0.08, -0.05, -0.06), (-0.08, 0.05, -0.06), (-0.08, -0.05, -0.06)], build)
    ell(0.03, m['wool'], (-0.18, 0, 0.03), (1, 0.8, 1), bd, seg=12)   # tail
    def pose(ph):
        s1, c1 = S(ph), C(ph)
        r.at(bd, dz=0.012 * abs(s1)); setrot(bd, 0.03 * s1, 0.03 * c1, 0)
        for hip, kn, front, left in r.qlegs:   # a trot: diagonal pairs
            q = s1 if (front == left) else -s1; dq = c1 if (front == left) else -c1
            setrot(hip, 0, -0.45 * q, 0); setrot(kn, 0, (-0.6 if front else 0.6) * max(0, dq) * (1 if not front else 1), 0)
        setrot(r.head, 0.08 * S(ph * 2), 0.35 + 0.08 * c1, 0.05 * s1)
    return {'root': root, 'pose': pose, 'fly': False}

# ═══ Black knight boss: a skull-faced demon in black spiked armour, flames for hair ═════════════════════════
def flames(parent, base, s, m, n=7, spread=0.06, height=0.16, seed=1):
    """a crown of flickering flame tongues standing on `base`; returns the tongue groups (they sway in pose)"""
    rng = random.Random(seed); out = []
    for i in range(n):
        a = i / n * TAU + rng.uniform(-0.3, 0.3); rr = spread * rng.uniform(0.3, 1.0)
        g = G('flame', parent, (base[0] + math.cos(a) * rr, base[1] + math.sin(a) * rr, base[2]))
        h = height * rng.uniform(0.6, 1.1) * (1.25 - rr / spread * 0.5); w = 0.03 * s * rng.uniform(0.8, 1.2)
        pts = [(0, 0, 0), (-0.01 * s, 0, h * 0.35), (-0.035 * s, 0.01 * s * math.sin(a), h * 0.7), (-0.07 * s, 0, h)]
        tube(pts, [w, w * 0.9, w * 0.5, 0.0], m['flame'], g, seg=8)
        tube([(0, 0, 0), (-0.008 * s, 0, h * 0.3), (-0.02 * s, 0, h * 0.55)], [w * 0.6, w * 0.5, 0.0], m['flameHot'], g, seg=6)
        out.append((g, rng.uniform(0, TAU)))
    return out

def blackKnight():
    m = EM(); r = Rig(); s = 1.6; root = G('blackKnight')
    S_ = lambda *v: tuple(x * s for x in v)
    r.pelvis = pel = G('pelvis', root, S_(0, 0, 0.27)); r.keep(pel)
    lathe([(0.0, 0.04 * s), (0.1 * s, 0.04 * s), (0.115 * s, 0.0), (0.135 * s, -0.07 * s), (0.0, -0.06 * s)], m['blackPlate'], parent=pel, seg=24)
    box(0.04 * s, 0.1 * s, 0.16 * s, m['cape'], S_(0.11, 0, -0.07), (0, 0.12, 0), pel, bevel=0.01)   # a red tabard
    r.chest = ch = G('chest', pel, S_(0, 0, 0.04))
    ell(0.125 * s, m['blackPlate'], S_(0.0, 0, 0.12), (0.85, 1.08, 1.0), ch)
    for k in (1, -1): tube([S_(0.07, k * 0.02, 0.03), S_(0.1, k * 0.06, 0.12), S_(0.08, k * 0.04, 0.2)], 0.006 * s, m['lavaSeam'], ch, seg=6)   # glowing cracks
    tube([S_(0.1, -0.05, 0.08), S_(0.11, 0.0, 0.1), S_(0.1, 0.05, 0.08)], 0.005 * s, m['lavaSeam'], ch, seg=6)
    # a ribcage of bone across the breastplate
    for i in range(3): tube([S_(0.06, -0.08, 0.1 + i * 0.035), S_(0.11, 0, 0.12 + i * 0.035), S_(0.06, 0.08, 0.1 + i * 0.035)], 0.009 * s, m['skullDemon'], ch, seg=8)
    torus(0.105 * s, 0.014 * s, m['leatherDk'], S_(0, 0, 0.03), parent=ch, maj=24, mn=8)
    ell(0.025 * s, m['skullDemon'], S_(0.105, 0, 0.03), (0.6, 1, 1), ch, seg=12)   # skull buckle
    for k in (1, -1):   # massive spiked pauldrons with bone claws
        pg = G('pauldron', ch, S_(0.0, k * 0.135, 0.2), (k * 0.4, 0, 0))
        ell(0.08 * s, m['blackPlate'], (0, 0, 0), (1.1, 1.0, 0.7), pg); torus(0.08 * s, 0.008 * s, m['lavaSeam'], (0, 0, -0.01 * s), parent=pg, maj=20, mn=6)
        for j in range(3): horn(S_(-0.03 + j * 0.03, 0.0, 0.04), (0.2 * (j - 1), 0.4, 1), 0.12 * s, 0.018 * s, m['skullDemon'], pg, curl=(0.4 - j * 0.2, 0.3, -0.2), n=6, seg=8)
    # the cape
    cp = r.cape = G('cape', ch, S_(-0.08, 0, 0.22))
    o = slab([(0.0, -0.13 * s), (0.0, 0.13 * s), (-0.3 * s, 0.19 * s), (-0.34 * s, 0.1 * s), (-0.31 * s, 0.0), (-0.35 * s, -0.1 * s), (-0.3 * s, -0.19 * s)], 0.012 * s, m['cape'], (0, 0, 0), (0, -(math.pi / 2 - 0.15), 0), cp, smooth=True)
    # the head: a horned demon skull, eyes burning, flames rising off it
    r.head = hd = G('head', ch, S_(0.02, 0, 0.32))
    lathe([(0.0, 0.07 * s), (0.06 * s, 0.065 * s), (0.085 * s, 0.03 * s), (0.088 * s, -0.04 * s), (0.08 * s, -0.08 * s), (0.0, -0.08 * s)], m['blackPlate'], S_(-0.02, 0, 0), parent=hd, seg=24)   # a black hood-helm behind the face
    ell(0.072 * s, m['skullDemon'], S_(0.03, 0, 0.0), (0.95, 0.92, 1.0), hd)
    ell(0.05 * s, m['skullDemon'], S_(0.06, 0, -0.04), (0.9, 0.95, 0.8), hd)
    mirror(lambda k: [ell(0.022 * s, m['dark'], S_(0.085, k * 0.028, 0.0), (0.55, 1, 0.85), hd, seg=12),
                      ell(0.014 * s, m['eyeOrange'], S_(0.093, k * 0.028, 0.0), (0.4, 1, 0.8), hd, seg=10)])
    cone_to(S_(0.1, 0, -0.03), (1, 0, 0.2), 0.012 * s, 0.006 * s, m['dark'], hd, verts=3)
    for i in range(7): box(0.01 * s, 0.009 * s, 0.018 * s, m['teeth'], S_(0.095 - abs(i - 3) * 0.004, (i - 3) * 0.011, -0.062), parent=hd, bevel=0.002)
    for i in range(6): cone_to(S_(0.09 - abs(i - 2.5) * 0.005, (i - 2.5) * 0.012, -0.085), (0.1, 0, 1), 0.006 * s, 0.025 * s, m['teeth'], hd, verts=5)   # fangs
    mirror(lambda k: horn(S_(0.0, k * 0.06, 0.05), (0.1, k * 0.8, 0.6), 0.2 * s, 0.03 * s, m['blackPlate'], hd, curl=(-0.4, k * -0.3, 0.6), n=8, seg=10))
    r.flames = flames(hd, S_(-0.02, 0, 0.06), s, m, n=9, spread=0.07 * s, height=0.2 * s, seed=3)
    def thigh(g, L): plate_limb(g, L, 0.05 * s, 0.045 * s, m, 'blackPlate', 'lavaSeam')
    def shin(g, L):
        ell(0.04 * s, m['blackPlate'], (0.01 * s, 0, 0.0), (1, 1, 0.9), g, seg=14); horn((0.035 * s, 0, 0.0), (1, 0, 0.3), 0.07 * s, 0.015 * s, m['skullDemon'], g, curl=(0, 0, 0.3), n=5, seg=6)
        plate_limb(g, L, 0.04 * s, 0.045 * s, m, 'blackPlate', 'lavaSeam')
    def foot(g): ell(0.045 * s, m['blackPlate'], (0.02 * s, 0, 0.008 * s), (1.5, 0.95, 0.6), g, seg=16); cone_to((0.08 * s, 0, 0.0), (1, 0, -0.1), 0.012 * s, 0.03 * s, m['skullDemon'], g, verts=6)
    for k in (1, -1): leg(r, pel, S_(0, k * 0.065, -0.03), 0.125 * s, 0.11 * s, thigh, shin, foot)
    def upper(g, L): plate_limb(g, L, 0.04 * s, 0.035 * s, m, 'blackPlate', 'lavaSeam')
    def fore(g, L):
        plate_limb(g, L, 0.034 * s, 0.042 * s, m, 'blackPlate', 'lavaSeam')
        for j in range(3): cone_to((-0.03 * s, 0, -L * (0.3 + j * 0.2)), (-1, 0, 0.3), 0.01 * s, 0.04 * s, m['skullDemon'], g, verts=5)
    def handS(g):
        ell(0.035 * s, m['blackPlate'], (0.005 * s, 0, -0.02 * s), (1.1, 1, 1.1), g, seg=14)
        sw = sword(g, 0.36 * s, m, blade='blackPlate', guard='blackPlate', w=0.055 * s); sw.location = (0.0, 0, -0.025 * s); sw.rotation_euler = (0, math.radians(110), 0)
        sw.scale = (1.4, 1.4, 1.0)
        L_ = 0.36 * s; tube([(0, 0.0, 0.07 * s), (0, 0.0, 0.05 * s + L_ * 0.9)], 0.007 * s, m['lavaSeam'], sw, seg=6)   # the glowing edge rune
    def handC(g):
        ell(0.035 * s, m['blackPlate'], (0.005 * s, 0, -0.02 * s), (1.1, 1, 1.1), g, seg=14)
        for j in range(4): horn((0.03 * s, (j - 1.5) * 0.015 * s, -0.03 * s), (1, (j - 1.5) * 0.3, -0.5), 0.06 * s, 0.009 * s, m['skullDemon'], g, curl=(0, 0, -0.6), n=5, seg=6)
    arm(r, ch, S_(-0.0, -0.14, 0.17), 0.105 * s, 0.1 * s, upper, fore, handS)
    arm(r, ch, S_(-0.0, 0.14, 0.17), 0.105 * s, 0.1 * s, upper, fore, handC)
    def pose(ph):
        walk(r, ph, amp=0.38, knee=0.8, arms=0.0, bob=0.015 * s, twist=0.08, roll=0.04, lean=0.08)
        s1 = S(ph)
        shS, elS, wrS = r.arms[0]; shC, elC, wrC = r.arms[1]
        setrot(shS, 0.15, -0.45 - 0.35 * s1, 0); setrot(elS, 0, -0.9 - 0.25 * max(0, s1), 0); setrot(wrS, 0, 0.1 * s1, 0)
        setrot(shC, -0.2, 0.35 * s1 - 0.2, 0); setrot(elC, 0, -0.7, 0); setrot(wrC, 0, 0.3, 0)
        setrot(r.cape, 0.04 * s1, -0.1 - 0.12 * abs(s1), 0)
        for g, off in r.flames: setrot(g, 0.25 * math.sin(TAU * ph * 2 + off), 0.2 * math.sin(TAU * ph * 3 + off * 1.7), 0); g.scale = (1, 1, 0.85 + 0.25 * (0.5 + 0.5 * math.sin(TAU * ph * 2 + off)))
    return {'root': root, 'pose': pose, 'fly': False}

# ═══ Ogre warlord boss: the black spiked steam-tank walker with a cog and a glowing red eye ════════════════
def cog(parent, R, teeth, th, m, mat='cream', loc=(0, 0, 0), rot=(0, 0, 0)):
    g = G('cog', parent, loc, rot)
    cyl(R, th, m[mat], (0, 0, 0), parent=g, verts=40, bevel=0.006)
    for i in range(teeth):
        a = i / teeth * TAU; box(R * 0.24, R * 0.22, th * 0.95, m[mat], (math.cos(a) * R * 1.08, math.sin(a) * R * 1.08, 0), (0, 0, a), g, bevel=0.005)
    cyl(R * 0.62, th * 1.1, m['creamDark'], (0, 0, 0), parent=g, verts=28, bevel=0.004)
    for i in range(5):
        a = i / 5 * TAU; cyl(R * 0.12, th * 1.3, m['ironDark'], (math.cos(a) * R * 0.42, math.sin(a) * R * 0.42, 0), parent=g, verts=14, bevel=0.003)
    hexbolt(R * 0.2, th * 1.6, m['iron'], (0, 0, 0), parent=g)
    return g

def ogreWarlord():
    m = EM(); r = Rig(); root = G('ogreWarlord')
    r.pelvis = pel = G('pelvis', root, (0, 0, 0.6)); r.keep(pel)
    box(0.26, 0.42, 0.14, m['ironDark'], (0, 0, 0.0), parent=pel, bevel=0.03)   # the hip girder
    r.chest = hull = G('hull', pel, (0, 0, 0.16)); hull.scale = (0.88, 0.88, 0.88)
    ell(0.36, m['blackPlate'], (0, 0, 0.08), (1.1, 1.0, 0.82), hull, seg=32)
    torus(0.385, 0.03, m['brass'], (0, 0, 0.02), parent=hull, maj=40, mn=10)
    for i in range(18): a = i / 18 * TAU; sphere(0.014, m['iron'], (math.cos(a) * 0.4, math.sin(a) * 0.395, 0.02), parent=hull, seg=8)
    lathe([(0.39, 0.0), (0.37, -0.12), (0.28, -0.2), (0.0, -0.22)], m['ironDark'], (0, 0, 0.0), parent=hull, seg=32)   # the belly pan
    # spikes all over the upper shell (the big silver ones of the original)
    n = 26
    for i in range(n):
        y = 1 - (i + 0.5) / n * 1.15; rr = math.sqrt(max(0, 1 - y * y)); a = i * 2.39996
        d = Vector((math.cos(a) * rr * 1.1, math.sin(a) * rr, y * 0.82 + 0.05)).normalized()
        if d.x > 0.65 and d.z < 0.45: continue   # keep the face clear
        p = Vector((d.x * 0.38, d.y * 0.35, d.z * 0.29 + 0.08))
        h = 0.18 + 0.09 * (1 - abs(y)); cone_to(tuple(p), tuple(d), 0.065, h, m['steel'], hull, verts=5)
        cyl(0.07, 0.03, m['ironDark'], tuple(p), parent=hull, verts=5, bevel=0.004).rotation_mode = 'QUATERNION'
        hull.children[-1].rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    # the face: a glowing furnace eye in an iron socket, a grille mouth, a battering ram spike
    ell(0.12, m['ironDark'], (0.33, 0, 0.12), (0.5, 1, 1), hull)
    torus(0.095, 0.022, m['brass'], (0.385, 0, 0.12), (0, math.pi / 2, 0), hull, maj=28, mn=8)
    ell(0.085, m['glowRed'], (0.37, 0, 0.12), (0.45, 1, 1), hull)
    ell(0.04, m['flameHot'], (0.405, 0, 0.12), (0.4, 1, 1), hull, seg=14)
    for j in range(3): box(0.02, 0.2, 0.018, m['ironDark'], (0.405, 0, 0.07 + j * 0.05), parent=hull, bevel=0.004)
    L = bpy.data.lights.new('eyeLight', 'POINT'); L.energy = 6; L.color = (1, 0.3, 0.1); L.shadow_soft_size = 0.05
    lo = bpy.data.objects.new('eyeLight', L); bpy.context.scene.collection.objects.link(lo); lo.parent = hull; lo.location = (0.5, 0, 0.12)
    for j in range(5): box(0.05, 0.03, 0.06, m['steel'], (0.36, (j - 2) * 0.05, -0.06), parent=hull, bevel=0.008)   # the grille teeth
    cone_to((0.37, 0, -0.12), (1, 0, -0.15), 0.07, 0.24, m['steel'], hull, verts=6)   # ram
    # a great cream cog on its flank, turning
    r.cog = cog(hull, 0.15, 12, 0.05, m, 'cream', (0.04, -0.37, 0.08), (math.pi / 2, 0, 0))
    r.cog2 = cog(hull, 0.09, 9, 0.04, m, 'brass', (-0.15, -0.34, 0.2), (math.pi / 2 + 0.2, 0, 0))
    # smokestacks with glowing mouths
    for j, y in enumerate((0.1, -0.1)):
        cyl(0.045, 0.3, m['iron'], (-0.27, y, 0.32 + j * 0.03), (0, -0.35, 0), hull, verts=16)
        torus(0.05, 0.012, m['brass'], (-0.32, y, 0.45 + j * 0.03), (0, -0.35, 0), hull, maj=16, mn=6)
        cyl(0.035, 0.02, m['lava'], (-0.325, y, 0.47 + j * 0.03), (0, -0.35, 0), hull, verts=14, bevel=0)
    # stomping legs: a brass hip ball, an iron thigh beam, pistons down to a clawed foot
    def thigh(g, L):
        sphere(0.07, m['brass'], (0, 0, 0), parent=g, seg=18)
        box(0.1, 0.09, L, m['blackPlate'], (0, 0, -L / 2), parent=g, bevel=0.02)
        for zz in (-0.06, -L + 0.05): hexbolt(0.02, 0.02, m['brass'], (0, -0.05, zz), (math.pi / 2, 0, 0), g)
        cone_to((0, 0, -L * 0.4), (1, 0, 0.1), 0.03, 0.08, m['steel'], g, verts=5)
    def shin(g, L):
        sphere(0.06, m['brass'], (0, 0, 0), parent=g, seg=16)
        cyl(0.045, L * 0.6, m['iron'], (0, 0, -L * 0.3), parent=g, verts=18)
        cyl(0.03, L * 0.6, m['steel'], (0, 0, -L * 0.7), parent=g, verts=16)
        for k in (1, -1): cyl(0.012, L * 0.85, m['brass'], (-0.05, k * 0.035, -L * 0.5), parent=g, verts=8)
    def foot(g):
        box(0.2, 0.15, 0.06, m['blackPlate'], (0.03, 0, -0.03), parent=g, bevel=0.02)
        for j in (-1, 0, 1): cone_to((0.12, j * 0.05, -0.04), (1, j * 0.3, -0.25), 0.025, 0.08, m['steel'], g, verts=5)
        cone_to((-0.08, 0, -0.04), (-1, 0, -0.2), 0.022, 0.06, m['steel'], g, verts=5)
    for k in (1, -1): leg(r, pel, (0, k * 0.24, -0.02), 0.28, 0.26, thigh, shin, foot)
    def pose(ph):
        walk(r, ph, amp=0.32, knee=0.75, arms=0.0, bob=0.02, twist=0.06, roll=0.06, lean=0.03)
        r.cog.rotation_euler = (math.pi / 2, TAU * ph * 0.5, 0); r.cog2.rotation_euler = (math.pi / 2 + 0.2, -TAU * ph * 0.67, 0)
    return {'root': root, 'pose': pose, 'fly': False}

# ═══ The goblin hero: an engineer in a blue steam mech with ice-crystal armour ═══════════════════════════
def ice_plate(parent, loc, rot, size, m, mat='iceDeep', seed=1):
    """a faceted plate of ice-blue crystal armour set in a brass frame"""
    g = G('iceplate', parent, loc, rot)
    o = ico(size, m[mat], (0, 0, 0), parent=g, sub=0, scale=(1.0, 1.2, 0.45)); o.rotation_euler = (0, 0, 0.3 * seed)
    tube([(-size * 0.9, -size * 1.0, -size * 0.2), (-size * 0.9, size * 1.0, -size * 0.2)], size * 0.12, m['brass'], g, seg=6)
    return g

def ice_cluster(parent, base, d, n, length, m, seed=1, spread=0.6, r0=0.03):
    rng = random.Random(seed); d = Vector(d).normalized()
    for i in range(n):
        q = (d + Vector((rng.uniform(-spread, spread), rng.uniform(-spread, spread), rng.uniform(-spread, spread)))).normalized()
        cone_to(base, tuple(q), r0 * rng.uniform(0.7, 1.2), length * rng.uniform(0.6, 1.2), m['ice' if i % 2 else 'iceDeep'], parent, verts=5)

def hero():
    m = EM(); r = Rig(); root = G('hero')
    r.pelvis = pel = G('pelvis', root, (0, 0, 0.3)); r.keep(pel)
    box(0.16, 0.26, 0.08, m['mechBlueDk'], (0, 0, 0.0), parent=pel, bevel=0.025)
    r.chest = ch = G('chest', pel, (0, 0, 0.04))
    # the cabin: a round blue riveted tub, brass rim, ice armour on the front
    lathe([(0.0, 0.02), (0.14, 0.02), (0.19, 0.08), (0.205, 0.16), (0.2, 0.24), (0.185, 0.27), (0.17, 0.26), (0.16, 0.2), (0.0, 0.2)], m['mechBlue'], parent=ch, seg=36)
    torus(0.185, 0.02, m['brass'], (0, 0, 0.265), parent=ch, maj=36, mn=8)
    torus(0.2, 0.014, m['mechBlueDk'], (0, 0, 0.12), parent=ch, maj=36, mn=8)
    for i in range(16): a = i / 16 * TAU; sphere(0.009, m['brass'], (math.cos(a) * 0.206, math.sin(a) * 0.206, 0.15), parent=ch, seg=8)
    ice_plate(ch, (0.2, 0.0, 0.11), (0, math.pi / 2 - 0.25, 0), 0.1, m, seed=1)
    for k in (1, -1): ice_plate(ch, (0.12, k * 0.16, 0.11), (k * -0.9, math.pi / 2 - 0.3, k * 0.6), 0.07, m, 'ice', seed=3 + k)
    hexbolt(0.04, 0.03, m['steel'], (0.215, -0.09, 0.2), (0, math.pi / 2 - 0.3, 0), ch)
    hexbolt(0.03, 0.03, m['steel'], (0.215, 0.09, 0.2), (0, math.pi / 2 - 0.3, 0), ch)
    ice_cluster(ch, (-0.05, 0.12, 0.2), (-0.3, 0.6, 0.7), 4, 0.12, m, seed=2)
    ice_cluster(ch, (-0.05, -0.12, 0.2), (-0.3, -0.6, 0.7), 4, 0.12, m, seed=3)
    # the boiler on the back with a chimney
    cyl(0.09, 0.22, m['copper'], (-0.2, 0, 0.17), parent=ch, verts=24)
    for zz in (0.08, 0.26): torus(0.092, 0.012, m['brass'], (-0.2, 0, zz), parent=ch, maj=24, mn=6)
    cyl(0.03, 0.18, m['ironDark'], (-0.22, 0.04, 0.36), (0, -0.2, 0), ch, verts=14)
    cyl(0.04, 0.03, m['brass'], (-0.24, 0.04, 0.45), (0, -0.2, 0), ch, verts=14)
    # the goblin pilot: green, long ears, goggles, a cream helmet with orange stripes
    r.head = hd = G('pilot', ch, (0.04, 0, 0.39))
    hd.scale = (1.25, 1.25, 1.25)
    ell(0.085, m['goblinSkin'], (0, 0, 0), (1.0, 1.05, 0.95), hd)
    ell(0.04, m['goblinSkin'], (0.08, 0, -0.03), (1.0, 0.8, 0.8), hd, seg=14)   # big nose
    mirror(lambda k: [ell(0.024, m['eyeYellow'], (0.07, k * 0.035, 0.005), (0.6, 1, 1), hd, seg=12), ell(0.011, m['dark'], (0.083, k * 0.033, 0.005), (0.5, 1, 1), hd, seg=8)])
    tube([(0.06, -0.06, -0.035), (0.085, 0, -0.05), (0.06, 0.06, -0.035)], 0.007, m['teeth'], hd, seg=6)   # a toothy grin
    tube([(0.065, -0.04, -0.05), (0.08, 0, -0.06), (0.065, 0.04, -0.05)], 0.008, m['mouth'], hd, seg=6)
    mirror(lambda k: [tube([(-0.01, k * 0.07, 0.0), (-0.04, k * 0.14, -0.005), (-0.08, k * 0.2, -0.0)], [0.035, 0.024, 0.0], m['goblinSkin'], hd, seg=10, scale_y=0.4)])   # long ears
    hm = G('helmet', hd, (-0.015, 0, 0.02), (0, -0.35, 0))
    lathe([(0.0, 0.1), (0.05, 0.095), (0.085, 0.07), (0.095, 0.03), (0.097, 0.01), (0.105, 0.0), (0.09, 0.002)], m['helmetCream'], parent=hm, seg=32)
    for y in (-0.03, 0.03): tube([(0.085, y, 0.04), (0.06, y, 0.085), (0.0, y, 0.101), (-0.06, y, 0.085), (-0.085, y, 0.04)], 0.012, m['stripeOrange'], hm, seg=8, scale_y=1.4)
    torus(0.092, 0.012, m['stripeOrange'], (0, 0, 0.012), parent=hm, maj=32, mn=6)
    for k in (1, -1):   # goggles pushed up on the helmet
        cyl(0.025, 0.02, m['brass'], (0.08, k * 0.033, 0.05), (0, math.pi / 2 - 0.5, 0), hm, verts=16)
        cyl(0.019, 0.022, m['ice'], (0.083, k * 0.033, 0.052), (0, math.pi / 2 - 0.5, 0), hm, verts=16, bevel=0)
    # legs: a blue thigh, brass knee, an armoured shin with ice, a big foot
    def thigh(g, L): sphere(0.045, m['brass'], (0, 0, 0), parent=g, seg=14); box(0.07, 0.07, L, m['mechBlueDk'], (0, 0, -L / 2), parent=g, bevel=0.015)
    def shin(g, L):
        sphere(0.04, m['brass'], (0, 0, 0), parent=g, seg=14)
        box(0.09, 0.08, L, m['mechBlue'], (0, 0, -L / 2), parent=g, bevel=0.02)
        ice_plate(g, (0.05, 0, -L * 0.45), (0, math.pi / 2, 0), 0.035, m, 'ice', seed=2)
    def foot(g):
        box(0.15, 0.1, 0.05, m['mechBlueDk'], (0.025, 0, -0.025), parent=g, bevel=0.018)
        box(0.04, 0.1, 0.035, m['brass'], (0.1, 0, -0.03), parent=g, bevel=0.01)
    for k in (1, -1): leg(r, pel, (0, k * 0.1, -0.03), 0.13, 0.12, thigh, shin, foot)
    # arms: the left a crystal-tipped frost cannon, the right a white piston arm with a claw
    def upper(g, L):
        ice_cluster(g, (0, 0, 0.02), (0, 0, 1), 3, 0.08, m, seed=len(r.arms) + 5, spread=0.5)
        ell(0.07, m['mechBlue'], (0, 0, 0.0), (1, 1, 0.75), g); torus(0.07, 0.01, m['brass'], (0, 0, -0.01), parent=g, maj=20, mn=6)
        cyl(0.03, L, m['helmetCream'], (0, 0, -L / 2), parent=g, verts=14)
    def fore(g, L): sphere(0.035, m['brass'], (0, 0, 0), parent=g, seg=12); cyl(0.038, L, m['helmetCream'], (0, 0, -L / 2), parent=g, verts=16); torus(0.04, 0.008, m['stripeOrange'], (0, 0, -L * 0.6), parent=g, maj=16, mn=6)
    def cannon(g):
        c = G('cannon', g, (0, 0, -0.02), (0, math.radians(95), 0))
        cyl(0.045, 0.16, m['mechBlueDk'], (0, 0, 0.07), parent=c, verts=20)
        torus(0.047, 0.012, m['brass'], (0, 0, 0.15), parent=c, maj=20, mn=6); torus(0.047, 0.012, m['brass'], (0, 0, 0.0), parent=c, maj=20, mn=6)
        cyl(0.03, 0.02, m['dark'], (0, 0, 0.155), parent=c, verts=16, bevel=0)
        ice_cluster(c, (0, 0, 0.16), (0, 0, 1), 3, 0.06, m, seed=9, spread=0.35, r0=0.018)
    def clawhand(g):
        c = G('claw', g, (0, 0, -0.02))
        cyl(0.045, 0.04, m['iron'], (0, 0, -0.01), parent=c, verts=16)
        for j in range(3):
            a = j / 3 * TAU; horn((math.cos(a) * 0.03, math.sin(a) * 0.03, -0.03), (math.cos(a) * 0.5, math.sin(a) * 0.5, -1), 0.09, 0.014, m['steel'], c, curl=(-math.cos(a) * 0.5, -math.sin(a) * 0.5, 0), n=5, seg=6)
    arm(r, ch, (0.0, 0.25, 0.2), 0.1, 0.1, upper, fore, cannon)
    arm(r, ch, (0.0, -0.25, 0.2), 0.1, 0.1, upper, fore, clawhand)
    def pose(ph):
        walk(r, ph, amp=0.42, knee=0.85, arms=0.3, elbow=0.6, bob=0.015, twist=0.1, roll=0.05, lean=0.02)
        s1 = S(ph)
        shL, elL, wrL = r.arms[0]; shR, elR, wrR = r.arms[1]
        setrot(shL, -0.15, -0.2 + 0.25 * s1, 0); setrot(elL, 0, -1.2, 0)   # the cannon held forward
        setrot(shR, 0.15, -0.25 * s1, 0); setrot(elR, 0, -0.6 - 0.3 * max(0, s1), 0); setrot(wrR, 0, 0.2, 0)
        setrot(r.head, 0.06 * s1, 0.05 * abs(s1), 0.12 * S(ph * 0.5 + 0.1))
    return {'root': root, 'pose': pose, 'fly': False}

ENEMIES = {
    'footman': footman, 'skeleton': rat, 'knight': knight, 'rider': rider, 'spider': spider, 'ogre': ogre,
    'wraith': wraith, 'shaman': shaman, 'gargoyle': gargoyle, 'sheep': sheep,
    'blackKnight': blackKnight, 'frostTroll': frostTroll, 'spiderQueen': spiderQueen, 'ogreWarlord': ogreWarlord, 'wraithLord': wraithLord,
}
