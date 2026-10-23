# Goblin Defenders scenery for the map dioramas: the goblin village, cave mouths, the snow gate, trees and bushes of
# each land, rocks, bones, ruins. Builders take (parent, rnd) and build at the parent's origin, 1 unit = 1 cell.
import math, random, bmesh
from lib import *
from lib import _place

def leaf(mat, length, width, bend=0.35, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), seg=6):
    """a tapered, curved leaf blade (two-sided), lying along +X"""
    bm = bmesh.new(); rows = []
    for i in range(seg + 1):
        t = i / seg; w = width * math.sin(math.pi * min(1, t * 1.05)) * (1 - t * 0.3)
        x = length * t; z = -bend * length * t * t
        rows.append([bm.verts.new((x, -w / 2, z)), bm.verts.new((x, 0, z + width * 0.12)), bm.verts.new((x, w / 2, z))])
    for i in range(seg):
        a, b = rows[i], rows[i + 1]
        bm.faces.new((a[0], b[0], b[1], a[1])); bm.faces.new((a[1], b[1], b[2], a[2]))
    me = bpy.data.meshes.new('leaf'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('leaf', me); bpy.context.scene.collection.objects.link(o)
    return _place(o, mat, loc, rot, parent)

def leafmats():
    return [flat('lf1', '#3fa82a', 0.5, edge=False), flat('lf2', '#2a8a22', 0.55, edge=False), flat('lf3', '#78c83a', 0.5, edge=False), flat('lf4', '#1f6a1c', 0.6, edge=False)]

def palm(p, R, s=1.0, lean=0.2):
    m = M(); x = y = 0.0; z = 0.0; g = group('palm', p)
    trunk = flat('palmTrunk', '#8a5a32', 0.85)
    for i in range(8):
        r = (0.075 - i * 0.004) * s; seg = cyl(r, 0.16 * s, trunk, (x, y, z + 0.08 * s), (0, lean * i * 0.14, 0), g, verts=10, r2=r * 0.85, bevel=0)
        x += math.sin(lean * i * 0.14) * 0.16 * s; z += 0.15 * s
    L = leafmats()
    for i in range(9):
        a = i / 9 * math.tau + R.uniform(-0.2, 0.2)
        leaf(L[i % 3], 0.75 * s, 0.22 * s, 0.6, g, (x, y, z), (0, R.uniform(-0.25, 0.1), a))
    for i in range(3): sphere(0.05 * s, flat('coconut', '#5a3a1a', 0.7), (x + math.cos(i * 2) * 0.06 * s, y + math.sin(i * 2) * 0.06 * s, z - 0.05 * s), parent=g)
    return g

def bush(p, R, s=1.0, big=False):
    """a lush jungle bush: many broad leaves fanning from a centre"""
    g = group('bush', p); L = leafmats()
    n = 22 if big else 14
    for layer in range(3):
        for i in range(n // 3 + 2):
            a = i / (n // 3 + 2) * math.tau + R.uniform(-0.3, 0.3) + layer * 0.5
            leaf(L[R.randrange(4)], R.uniform(0.4, 0.62) * s * (1 - layer * 0.18), R.uniform(0.16, 0.26) * s, R.uniform(0.3, 0.7), g, (0, 0, (0.06 + layer * 0.09) * s), (0, R.uniform(-0.6, -0.15) - layer * 0.25, a))
    return g

def fern(p, R, s=1.0):
    g = group('fern', p); L = leafmats()
    for i in range(7):
        a = i / 7 * math.tau + R.uniform(-0.3, 0.3)
        leaf(L[R.randrange(3)], 0.5 * s, 0.1 * s, 0.9, g, (0, 0, 0.05), (0, -0.9, a), seg=8)
    return g

def pine(p, R, s=1.0, snowy=True):
    g = group('pine', p); m = M()
    cyl(0.06 * s, 0.3 * s, flat('pineTrunk', '#6a4428', 0.85), (0, 0, 0.15 * s), parent=g, verts=8)
    needles = flat('needles', '#3a8f5e', 0.8, edge=False)
    for i in range(4):
        r = (0.42 - i * 0.09) * s; z = (0.3 + i * 0.2) * s
        c = cone(r, 0.34 * s, needles, (0, 0, z), parent=g, verts=9)
        for v in c.data.vertices:
            if v.co.z < 0: v.co.x *= 1 + R.uniform(-0.1, 0.12); v.co.y *= 1 + R.uniform(-0.1, 0.12); v.co.z += R.uniform(-0.03, 0.02)
        if snowy: cone(r * 0.95, 0.22 * s, flat('snowCap', '#f8fbff', 0.55, edge=False), (0, 0, z + 0.07 * s), parent=g, verts=9)
    return g

def cactus(p, R, s=1.0):
    g = group('cactus', p); mat = flat('cactusG', '#4f9a42', 0.7)
    capsule(0.08 * s, 0.4 * s, mat, (0, 0, 0.28 * s), parent=g)
    for k in (1, -1):
        capsule(0.05 * s, 0.14 * s, mat, (k * 0.14 * s, 0, (0.34 + k * 0.05) * s), parent=g)
        cyl(0.05 * s, 0.1 * s, mat, (k * 0.09 * s, 0, (0.24 + k * 0.05) * s), (0, math.pi / 2, 0), g)
    sphere(0.045 * s, flat('cactusFlower', '#ff4a6a', 0.5), (0, 0, 0.56 * s), parent=g)
    return g

def rocks(p, R, s=1.0, mat='rock', n=4):
    g = group('rocks', p); m = M()
    for i in range(n):
        rock(R.uniform(0.12, 0.26) * s, m[mat], (R.uniform(-0.25, 0.25) * s, R.uniform(-0.2, 0.2) * s, 0.05 * s), g, seed=R.randrange(99))
    return g

def deadtree(p, R, s=1.0):
    g = group('dead', p); bark = flat('deadBark', '#6a4a32', 0.9)
    cyl(0.07 * s, 0.6 * s, bark, (0, 0, 0.3 * s), parent=g, verts=8, r2=0.03 * s)
    for i in range(4):
        a = i / 4 * math.tau + R.uniform(-0.3, 0.3); z = R.uniform(0.3, 0.55) * s
        rod((0, 0, z), (math.cos(a) * 0.25 * s, math.sin(a) * 0.25 * s, z + 0.18 * s), 0.025 * s, bark, g, verts=6)
    return g

def ribs(p, R, s=1.0):
    g = group('ribs', p); m = M()
    cyl(0.035 * s, 1.0 * s, m['bone'], (0, 0, 0.04), (0, math.pi / 2, 0), g)
    for i in range(6):
        t = torus(0.26 * s - i * 0.02 * s, 0.022 * s, m['bone'], (-0.4 * s + i * 0.16 * s, 0, 0.04), (0, 0, 0), g, maj=24, mn=6)
        t.rotation_euler = (0, math.pi / 2, 0); t.scale = (1, 1, 1)
    sphere(0.12 * s, m['bone'], (0.6 * s, 0, 0.08 * s), parent=g, scale=(1.4, 0.9, 0.8))
    return g

def skulls(p, R, s=1.0):
    g = group('skulls', p); m = M()
    for i, (x, y, z) in enumerate([(0, 0, 0), (0.14, 0.05, 0), (-0.12, 0.06, 0), (0.03, 0.04, 0.12)]):
        k = group('sk', g, (x * s, y * s, (0.08 + z) * s), (0, 0, R.uniform(-0.6, 0.6)))
        sphere(0.08 * s, m['bone'], parent=k)
        for e in (1, -1): sphere(0.022 * s, m['dark'], (e * 0.03 * s, -0.07 * s, 0.01 * s), parent=k, seg=8)
    return g

def pyramid(p, R, s=1.0):
    g = group('pyr', p); m = M()
    for i in range(6):
        w = (1.5 - i * 0.24) * s; box(w, w, 0.2 * s, m['sandstone'], (0, 0, (0.1 + i * 0.2) * s), parent=g, bevel=0.03)
    box(0.3 * s, 0.12 * s, 0.34 * s, m['dark'], (0, -0.76 * s, 0.17 * s), parent=g, bevel=0)
    for i in range(5): rock(0.1 * s, m['sandstone'], ((-0.8 + i * 0.4) * s, -0.9 * s, 0.04), g, seed=i)
    return g

def lilypad(p, R, s=1.0):
    g = group('lily', p); pad = cyl(0.14 * s, 0.01, flat('lilyPad', '#4aa83a', 0.5), (0, 0, 0.04), parent=g, verts=20)
    if R.random() < 0.6: sphere(0.045 * s, flat('lilyFlower', '#fff2a8', 0.5), (0.03 * s, 0, 0.06), parent=g, scale=(1, 1, 0.6))
    return g

def mushroom(p, R, s=1.0):
    g = group('mush', p); m = M()
    cyl(0.04 * s, 0.14 * s, flat('stalk', '#f2ead8', 0.6), (0, 0, 0.07 * s), parent=g)
    sphere(0.1 * s, flat('mushRed', '#d8262e', 0.5), (0, 0, 0.14 * s), parent=g, scale=(1, 1, 0.6))
    for i in range(4): sphere(0.018 * s, flat('dots', '#ffffff', 0.5), (math.cos(i * 1.6) * 0.06 * s, math.sin(i * 1.6) * 0.06 * s, 0.19 * s), parent=g, seg=8)
    return g

def icerock(p, R, s=1.0):
    g = group('ice', p); m = M()
    for i in range(5): ico(0.08 * s, m['ice'], ((i - 2) * 0.07 * s, R.uniform(-0.05, 0.05) * s, 0.1 * s), (R.uniform(-0.4, 0.4), R.uniform(-0.4, 0.4), i), g, sub=0, scale=(0.7, 0.7, 2.2 + R.random()))
    return g

def lavarock(p, R, s=1.0):
    g = group('lavar', p); m = M(); basalt = metal('basalt', '#3a2f2c', 0.95, 0.0, 0.6)
    for i in range(3): rock(R.uniform(0.15, 0.3) * s, basalt, (R.uniform(-0.25, 0.25) * s, R.uniform(-0.2, 0.2) * s, 0.05), g, seed=R.randrange(99))
    sphere(0.06 * s, m['lava'], (0.05 * s, -0.1 * s, 0.25 * s), parent=g)
    return g

def cave(p, R, s=1.0, mat='rock', mossy=True, lava=False):
    """a cave mouth in a heap of boulders facing the viewer, dark inside"""
    g = group('cave', p); m = M()
    inner = m['lava'] if lava else m['dark']
    sphere(0.42 * s, inner, (0, 0.08 * s, 0.2 * s), parent=g, scale=(1.1, 0.6, 0.9))
    mm = [m[mat], flat('moss', '#4f7f3a', 0.9)] if mossy else [m[mat]]
    for i, (x, y, z, r) in enumerate([(-0.48, 0, 0.12, 0.32), (0.46, 0, 0.1, 0.3), (-0.3, 0.06, 0.48, 0.32), (0.28, 0.06, 0.5, 0.34), (0, 0.12, 0.66, 0.3),
                                       (-0.66, 0.25, 0.08, 0.3), (0.66, 0.25, 0.08, 0.3), (-0.12, 0.35, 0.3, 0.38), (0.3, 0.4, 0.3, 0.34)]):
        rock(r * s, mm[i % len(mm)], (x * s, y * s, z * s), g, seed=i + 3)
    return g

def gate(p, R, s=1.0):
    """the snowy stone castle gate the snow levels' enemies march out of"""
    g = group('gate', p); m = M()
    for k in (1, -1):
        cyl(0.26 * s, 0.95 * s, m['stoneGrey'], (k * 0.58 * s, 0, 0.47 * s), parent=g, verts=20)
        for i in range(6): a = i / 6 * math.tau; box(0.1 * s, 0.1 * s, 0.12 * s, m['stoneGrey'], (k * 0.58 * s + math.cos(a) * 0.22 * s, math.sin(a) * 0.22 * s, 1.0 * s), parent=g, bevel=0.01)
        cone(0.28 * s, 0.08 * s, m['snow'], (k * 0.58 * s, 0, 0.98 * s), parent=g, verts=20, r2=0.18 * s)
    box(0.92 * s, 0.32 * s, 0.62 * s, m['stoneGrey'], (0, 0, 0.31 * s), parent=g, bevel=0.02)
    box(0.96 * s, 0.36 * s, 0.07 * s, m['snow'], (0, 0, 0.65 * s), parent=g, bevel=0.03)
    for i in range(4): box(0.13 * s, 0.32 * s, 0.11 * s, m['stoneGrey'], ((-0.33 + i * 0.22) * s, 0, 0.72 * s), parent=g, bevel=0.01)
    box(0.44 * s, 0.1 * s, 0.4 * s, m['dark'], (0, -0.13 * s, 0.2 * s), parent=g, bevel=0)
    cyl(0.22 * s, 0.1 * s, m['dark'], (0, -0.13 * s, 0.4 * s), (math.pi / 2, 0, 0), g, verts=20)
    for i in range(5): box(0.025 * s, 0.03 * s, 0.56 * s, m['ironDark'], ((-0.16 + i * 0.08) * s, -0.19 * s, 0.28 * s), parent=g, bevel=0)
    return g

def village(p, R, s=1.0):
    """the goblin village: round stone towers under tall shingled cone roofs, wooden walls and stairs, the heart flag"""
    g = group('village', p); m = M()
    def tower(x, y, r, h, roof=1.0):
        cyl(r * s, h * s, m['stone'], (x * s, y * s, h * s / 2), parent=g, verts=24)
        torus(r * s * 1.02, 0.025 * s, m['woodDark'], (x * s, y * s, h * s * 0.98), parent=g, maj=24, mn=6)
        c = cone(r * 1.45 * s, r * 2.1 * roof * s, wood('roofShingle', '#e0863a', '#9a4a1a', 14, False), (x * s, y * s, (h + r * 1.05 * roof) * s), parent=g, verts=24)
        cone(r * 1.5 * s, 0.06 * s, m['woodDark'], (x * s, y * s, (h + 0.02) * s), parent=g, verts=24, r2=r * 1.35 * s)
        cyl(0.02 * s, 0.22 * s, m['woodDark'], (x * s, y * s, (h + r * 2.1 * roof + 0.08) * s), parent=g, verts=6)
        box(0.12 * s, 0.03 * s, 0.16 * s, m['dark'], (x * s, (y - r) * s, h * s * 0.55), parent=g, bevel=0)   # a window
    tower(0, 0.1, 0.42, 0.62, 1.15)
    tower(-0.62, -0.18, 0.26, 0.4)
    tower(0.6, -0.12, 0.28, 0.44)
    tower(0.18, 0.62, 0.24, 0.36)
    # the flag: a white banner with a red heart on a tall pole
    cyl(0.025 * s, 0.7 * s, m['woodDark'], (0.0 * s, 0.1 * s, 1.95 * s), parent=g, verts=8)
    fl = box(0.36 * s, 0.01 * s, 0.22 * s, flat('banner', '#f6f2ea', 0.7), (0.19 * s, 0.1 * s, 2.15 * s), parent=g, bevel=0)
    pts = []
    for i in range(1, 40):
        t = i / 40 * math.tau; x = 16 * math.sin(t) ** 3; y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x * 0.0042, y * 0.0042))
    me = bpy.data.meshes.new('heart'); me.from_pydata([(px * s, 0, pz * s) for (px, pz) in pts], [], [list(range(len(pts)))])
    ho = bpy.data.objects.new('heart', me); bpy.context.scene.collection.objects.link(ho); ho.parent = g; ho.location = (0.19 * s, 0.09 * s, 2.15 * s); ho.data.materials.append(flat('heartFlag', '#e0202e', 0.6))
    # a wooden door and stair, a plank walk, a little fence
    box(0.2 * s, 0.05 * s, 0.3 * s, m['woodDark'], (0.05 * s, -0.33 * s, 0.15 * s), parent=g, bevel=0.01)
    for i in range(3): box(0.32 * s, 0.1 * s, 0.03 * s, m['woodPlain'], (0.05 * s, (-0.42 - i * 0.1) * s, (0.06 - i * 0.02) * s), parent=g, bevel=0.005)
    for i in range(6): cyl(0.022 * s, 0.24 * s, m['woodDark'], ((-1.0 + i * 0.09) * s, (-0.35 + i * 0.03) * s, 0.12 * s), parent=g, verts=6)
    for i in range(5): box(0.12 * s, 0.4 * s, 0.025 * s, m['woodPlain'], ((0.75 + i * 0.13) * s, -0.52 * s, 0.015), (0, 0, 0.2), g, bevel=0.004)
    return g

PROPS = {'palm': lambda p, R: palm(p, R), 'palmLeft': lambda p, R: palm(p, R, lean=-0.25), 'bush': bush, 'bushBig': lambda p, R: bush(p, R, 1.4, True), 'fern': fern,
         'pine': lambda p, R: pine(p, R, 1, False), 'pineSnow': pine, 'pineSnowBig': lambda p, R: pine(p, R, 1.4), 'cactus': cactus, 'rocks': rocks,
         'rocksSand': lambda p, R: rocks(p, R, 1, 'sandstone'), 'rocksGrey': lambda p, R: rocks(p, R, 1, 'stoneGrey'), 'deadTree': deadtree, 'ribs': ribs, 'skulls': skulls,
         'pyramid': pyramid, 'lilyPad': lilypad, 'mushroom': mushroom, 'iceRock': icerock, 'volcanoRock': lavarock,
         'cave': lambda p, R: cave(p, R, 1.45), 'caveSnow': lambda p, R: cave(p, R, 1.45, 'stoneGrey', False), 'caveSand': lambda p, R: cave(p, R, 1.45, 'sandstone', False),
         'caveLava': lambda p, R: cave(p, R, 1.45, 'rock', False, True), 'gate': gate, 'village': village}
