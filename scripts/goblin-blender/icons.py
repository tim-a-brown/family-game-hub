# Goblin Defenders icons (HUD, tower medallion emblems, sell/upgrade) and projectiles, modelled facing the camera
# (−Y). Each builder returns (object, kind) where kind is 'icon' or 'proj'.
import math
from lib import *

def _shape(points, depth, mat, bevel=0.03, loc=(0, 0, 0), rot=(0, 0, 0), parent=None):
    """an extruded outline (in the XZ plane, facing −Y) with rounded edges"""
    curve = bpy.data.curves.new('shape', 'CURVE'); curve.dimensions = '2D'; curve.fill_mode = 'BOTH'
    sp = curve.splines.new('POLY'); sp.points.add(len(points) - 1)
    for i, (x, y) in enumerate(points): sp.points[i].co = (x, y, 0, 1)
    sp.use_cyclic_u = True
    curve.extrude = depth / 2; curve.bevel_depth = bevel; curve.bevel_resolution = 4
    o = bpy.data.objects.new('shape', curve); bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(mat); o.location = loc; o.rotation_euler = (math.pi / 2 + rot[0], rot[1], rot[2])
    if parent: o.parent = parent
    return o
def _star(R, r, n=5):
    return [((R if i % 2 == 0 else r) * math.cos(math.pi / 2 + i * math.pi / n), (R if i % 2 == 0 else r) * math.sin(math.pi / 2 + i * math.pi / n)) for i in range(n * 2)]
def _circle(r, n=40): return [(r * math.cos(i / n * math.tau), r * math.sin(i / n * math.tau)) for i in range(n)]

def _tube(points, r, mat, parent=None, taper=False):
    """a smooth tube along a 3D polyline (a bevelled curve), optionally tapering to a point"""
    c = bpy.data.curves.new('tube', 'CURVE'); c.dimensions = '3D'; c.bevel_depth = r; c.bevel_resolution = 4; c.use_fill_caps = True
    sp = c.splines.new('POLY'); sp.points.add(len(points) - 1)
    for i, p in enumerate(points): sp.points[i].co = (p[0], p[1], p[2], 1); sp.points[i].radius = (1 - i / (len(points) - 1) * 0.9) if taper else 1
    o = bpy.data.objects.new('tube', c); bpy.context.scene.collection.objects.link(o); o.data.materials.append(mat)
    if parent: o.parent = parent
    return o

def star():
    return _shape(_star(0.48, 0.22), 0.14, flat('starBlue', '#2f7cff', 0.3, emit='#1a50ff', emitStr=0.3), 0.04), 'icon'
def coin():
    g = group('coin'); m = M()
    cyl(0.44, 0.1, m['gold'], (0, 0, 0), (math.pi / 2, 0, 0), g, verts=48)
    torus(0.4, 0.04, metal('coinRim', '#f0a018', 0.3, 1.0, 0.2), (0, -0.05, 0), (math.pi / 2, 0, 0), g, maj=48)
    pts = []
    for i in range(90): a = i * 0.15; r = 0.04 + i * 0.0031; pts.append((math.cos(a) * r, -0.06, math.sin(a) * r))
    _tube(pts, 0.03, metal('coinSwirl', '#e86a08', 0.35, 0.9, 0.1), g)
    return g, 'icon'
def gem():
    g = group('gem'); mat = glass('gemPink', '#ff2ab8', '#c00080', 0.8)
    o = cyl(0.42, 0.2, mat, (0, 0, 0.12), (0, 0, 0), g, verts=8, r2=0.3, bevel=0.0); cone(0.42, 0.42, mat, (0, 0, -0.19), (math.pi, 0, 0), g, verts=8)
    for p in o.data.polygons: p.use_smooth = False
    g.rotation_euler = (math.radians(14), 0, math.radians(22)); return g, 'icon'
def skull(dark=False):
    g = group('skull'); m = M(); mat = metal('skullDark', '#2a2a2c', 0.5, 0.2) if dark else m['bone']
    sphere(0.32, mat, (0, 0, 0.08), parent=g, scale=(1, 0.95, 1))
    box(0.32, 0.26, 0.2, mat, (0, -0.04, -0.18), parent=g, bevel=0.06)
    eye = glow('poisonEye', '#8aff2a', 4) if dark else m['dark']
    for k in (1, -1): sphere(0.09, eye, (k * 0.12, -0.26, 0.04), parent=g, scale=(1, 0.5, 1.15))
    cone(0.045, 0.08, m['dark'], (0, -0.3, -0.07), (math.pi / 2, 0, 0), g, verts=3)
    for i in range(4): box(0.045, 0.05, 0.06, m['dark'], (-0.075 + i * 0.05, -0.17, -0.22), parent=g, bevel=0.01)
    g.rotation_euler = (-0.15, 0, 0); return g, 'icon'
def shield():
    # a heater shield: flat top with rounded shoulders, curving sides to a point
    side = [(0.0, 0.46), (0.18, 0.47), (0.34, 0.44), (0.41, 0.36)] + [(0.41 - 0.41 * (t ** 1.6), 0.36 - 0.86 * t) for t in [i / 10 for i in range(1, 11)]]
    pts = side + [(-x, y) for (x, y) in reversed(side[1:-1])]
    g = group('shield'); _shape(pts, 0.12, M()['gold'], 0.03, parent=g)
    inner = [(x * 0.78, y * 0.82 + 0.02) for (x, y) in side if x >= 0]
    _shape([(0.0, inner[0][1])] + inner[1:] + [(0.0, inner[-1][1])], 0.04, metal('shieldLight', '#fff0b8', 0.3, 0.5, 0.1), 0.01, loc=(0.0, -0.08, 0), parent=g)
    return g, 'icon'
def swords():
    g = group('swords'); m = M()
    for k in (1, -1):
        s = group('s', g, (0, 0, 0), (0, k * 0.7, 0))
        box(0.07, 0.03, 0.66, m['steel'], (0, 0, 0.12), parent=s, bevel=0.01); cone(0.05, 0.1, m['steel'], (0, 0, 0.5), parent=s, verts=4)
        box(0.28, 0.06, 0.06, m['brass'], (0, 0, -0.22), parent=s, bevel=0.015); cyl(0.032, 0.16, m['leather'], (0, 0, -0.32), parent=s)
    return g, 'icon'
def heart():
    pts = []
    for i in range(1, 48):
        t = i / 48 * math.tau; x = 16 * math.sin(t) ** 3; y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x * 0.026, max(y * 0.026 + 0.05, -0.36 + abs(x) * 0.026 * 0.4)))
    return _shape(pts, 0.16, flat('heartRed', '#f01a30', 0.35), 0.035), 'icon'
def lock():
    g = group('lock'); m = M()
    box(0.5, 0.18, 0.4, m['gold'], (0, 0, -0.1), parent=g, bevel=0.05)
    torus(0.16, 0.05, m['steel'], (0, 0, 0.12), (math.pi / 2, 0, 0), g)
    cyl(0.05, 0.03, m['dark'], (0, -0.1, -0.08), (math.pi / 2, 0, 0), g)
    return g, 'icon'
def crown():
    g = group('crown'); m = M()
    cyl(0.32, 0.22, m['gold'], (0, 0, -0.1), parent=g, verts=40, cap=False)
    for i in range(5):
        a = i / 5 * math.tau; cone(0.08, 0.24, m['gold'], (math.cos(a) * 0.3, math.sin(a) * 0.3, 0.1), parent=g, verts=8)
        sphere(0.045, m['orb'], (math.cos(a) * 0.3, math.sin(a) * 0.3, 0.24), parent=g)
    g.rotation_euler = (0.35, 0, 0); return g, 'icon'
def arrowhead():
    g = group('arrow', rot=(0, 0.75, 0)); m = M()
    _shape([(0, 0.5), (0.27, -0.04), (0.1, 0), (0.08, -0.26), (-0.08, -0.26), (-0.1, 0), (-0.27, -0.04)], 0.08, m['steel'], 0.03, parent=g)
    cyl(0.055, 0.34, m['woodDark'], (0, 0, -0.42), parent=g)
    for k in (1, -1): box(0.12, 0.02, 0.2, flat('fletch', '#ff7a2a', 0.6), (k * 0.07, 0, -0.52), (0, k * 0.35, 0), g, bevel=0.005)
    return g, 'icon'
def bombi():
    g = group('bomb'); m = M()
    sphere(0.36, m['black'], (0, 0, -0.05), parent=g, seg=32)
    cyl(0.11, 0.1, m['ironDark'], (0, 0, 0.33), parent=g)
    for a, b in zip([(0, 0, 0.36), (0.07, 0, 0.47), (0.19, 0, 0.5), (0.26, 0, 0.42)], [(0.07, 0, 0.47), (0.19, 0, 0.5), (0.26, 0, 0.42), (0.27, 0, 0.4)]): rod(a, b, 0.025, m['rope'], g)
    sphere(0.07, glow('spark', '#ffd040', 10), (0.27, 0, 0.4), parent=g)
    return g, 'icon'
def snowflake():
    g = group('flake'); mat = glass('flakeIce', '#d8f4ff', '#58b8ff', 1.2)
    for i in range(6):
        a = i * math.pi / 3; arm = group('arm', g, (0, 0, 0), (0, a, 0))
        box(0.07, 0.06, 0.44, mat, (0, 0, 0.22), parent=arm, bevel=0.015)
        for z in (0.2, 0.32):
            for k in (1, -1): box(0.05, 0.05, 0.15, mat, (k * 0.05, 0, z), (0, -k * 0.8, 0), arm, bevel=0.01)
    cyl(0.1, 0.08, mat, (0, 0, 0), (math.pi / 2, 0, 0), g, verts=6)
    return g, 'icon'
def poison(): return skull(True)
def clawi():
    # three talons curling over, cream with a steel middle one, bound to a dark wooden grip
    g = group('claw'); m = M()
    for i in range(3):
        x0 = -0.14 + i * 0.14; pts = []
        for k in range(14):
            t = k / 13; a = math.pi * (0.95 - 0.75 * t)
            pts.append((x0 + 0.26 + math.cos(a) * 0.3, 0, -0.3 + math.sin(a) * 0.5))
        _tube(pts, 0.07 - i * 0.004, m['cream'] if i != 1 else m['steel'], g, taper=True)
    cyl(0.14, 0.22, m['woodDark'], (0.02, 0, -0.32), (0, 0, 0), g)
    torus(0.145, 0.025, m['iron'], (0.02, 0, -0.23), parent=g)
    return g, 'icon'
def teslai():
    g = group('tesla'); m = M()
    sphere(0.24, m['orb'], (0, 0, 0.15), parent=g); sphere(0.12, m['orbCore'], (0, 0, 0.15), parent=g)
    for i in range(4): torus(0.17 - i * 0.012, 0.035, m['coilPink'], (0, 0, -0.16 - i * 0.075), parent=g)
    g.rotation_euler = (0.3, 0, 0); return g, 'icon'
def shell():
    g = group('shell', rot=(0, -0.6, 0)); m = M()
    cyl(0.16, 0.36, m['brass'], (0, 0, -0.1), parent=g); sphere(0.16, m['black'], (0, 0, 0.08), parent=g)
    cone(0.16, 0.26, m['black'], (0, 0, 0.28), parent=g, verts=24); torus(0.165, 0.025, m['redCloth'], (0, 0, -0.04), parent=g)
    return g, 'icon'
def spikes():
    g = group('spk'); m = M(); sphere(0.24, m['black'], parent=g)
    for i in range(14):
        y = 1 - (i + 0.5) / 14 * 2; r = math.sqrt(1 - y * y); a = i * 2.4; d = Vector((math.cos(a) * r, y, math.sin(a) * r))
        c = cone(0.06, 0.2, m['steel'], tuple(d * 0.3), parent=g, verts=6); c.rotation_mode = 'QUATERNION'; c.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    return g, 'icon'
def sell():
    g = group('sell')
    for (x, z, y) in [(-0.17, -0.05, 0), (0.17, -0.05, -0.02), (0, 0.12, -0.04)]:
        c, _ = coin(); c.parent = g; c.scale = (0.55, 0.55, 0.55); c.location = (x, y, z)
    return g, 'icon'
def upgrade():
    pts = [(0, 0.46), (0.38, 0.04), (0.16, 0.04), (0.16, -0.42), (-0.16, -0.42), (-0.16, 0.04), (-0.38, 0.04)]
    return _shape(pts, 0.14, flat('upGreen', '#2ec02e', 0.35, emit='#0a6a0a', emitStr=0.4), 0.05), 'icon'

def p_bolt():
    g = group('bolt', rot=(0, 0, 0)); m = M()
    cyl(0.018, 0.34, m['woodPlain'], (0, 0, 0), (0, math.pi / 2, 0), g, verts=8); cone(0.035, 0.09, m['steel'], (0.2, 0, 0), (0, math.pi / 2, 0), g, verts=4)
    for k in (1, -1): box(0.08, 0.05, 0.015, m['redCloth'], (-0.14, k * 0.02, 0), (k * 0.8, 0, 0), g, bevel=0)
    return g, 'proj'
def p_bomb():
    g = group('pb'); m = M(); sphere(0.1, m['black'], parent=g); sphere(0.03, glow('spark', '#ffd040', 10), (0.03, 0, 0.11), parent=g); return g, 'proj'
def p_rock(): return rock(0.13, M()['rock'], seed=5), 'proj'
def p_ice():
    g = group('pi'); ico(0.08, M()['ice'], parent=g, sub=0, scale=(2.2, 1, 1)); return g, 'proj'
def p_acid():
    g = group('pa'); m = M(); sphere(0.09, m['acid'], parent=g); sphere(0.045, m['acid'], (-0.09, 0, 0.03), parent=g); return g, 'proj'
def p_shell():
    g = group('ps'); m = M(); sphere(0.13, m['black'], parent=g); torus(0.13, 0.02, m['brass'], parent=g); return g, 'proj'
def p_rocket():
    g = group('pr'); m = M()
    cyl(0.05, 0.3, m['redCloth'], (0, 0, 0), (0, math.pi / 2, 0), g); cone(0.05, 0.1, m['brass'], (0.2, 0, 0), (0, math.pi / 2, 0), g)
    for k in (1, -1): box(0.08, 0.02, 0.1, m['iron'], (-0.13, 0, k * 0.05), parent=g, bevel=0)
    return g, 'proj'

ICONS = {'star': star, 'coin': coin, 'gem': gem, 'skull': skull, 'shield': shield, 'swords': swords, 'heart': heart, 'lock': lock, 'crown': crown,
         'arrowhead': arrowhead, 'bomb': bombi, 'snowflake': snowflake, 'poison': poison, 'claw': clawi, 'tesla': teslai, 'shell': shell, 'spikes': spikes,
         'sell': sell, 'upgrade': upgrade, 'p_bolt': p_bolt, 'p_bomb': p_bomb, 'p_rock': p_rock, 'p_ice': p_ice, 'p_acid': p_acid, 'p_shell': p_shell, 'p_rocket': p_rocket}
