# Goblin Defenders towers, modelled after the original's: orange striped wood, cream painted steel, dark iron.
# Each builder returns (base, head, pivot_height); the head turns about Z (it faces +X, the game's angle 0).
import math
from lib import *

def xbase(m, lv, parent, legs=True, spikes=True, w=0.5):
    """the X-shaped cart of crossed beams on four splayed legs, iron caps at the ends"""
    top = 0.24
    for k in (1, -1):
        b = box(w * 2.1, 0.15, 0.11, m['wood'], (0, 0, top), (0, 0, k * math.pi / 4), parent, bevel=0.025)
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2; cx, cy = math.cos(a) * w * 0.98, math.sin(a) * w * 0.98
        # the leg: a stout pale post splayed out, an iron foot
        if legs:
            leg = box(0.11, 0.11, 0.3, m['woodPlain'], (cx * 0.92, cy * 0.92, top * 0.48), (0, 0, 0), parent, bevel=0.025)
            leg.rotation_euler = (-math.sin(a) * 0.32, math.cos(a) * 0.32, a)
            box(0.15, 0.15, 0.05, m['ironDark'], (cx * 1.02, cy * 1.02, 0.025), (0, 0, a), parent, bevel=0.012)
        # cream steel caps over the beam ends
        box(0.17, 0.19, 0.15, m['cream'], (cx, cy, top), (0, 0, a), parent, bevel=0.02)
        hexbolt(0.03, 0.02, m['creamDark'], (cx, cy, top + 0.08), (0, 0, a), parent)
        if spikes and (lv >= 2 or i < 2):
            s = cone(0.05, 0.24 + 0.04 * lv, m['steel'], (cx * 1.18, cy * 1.18, top - 0.02), (0, math.pi / 2, a), parent, verts=4)
    # iron bands round the crossing
    box(0.24, 0.24, 0.13, m['ironDark'], (0, 0, top), (0, 0, math.pi / 4), parent, bevel=0.02)
    if lv >= 2:
        for k in (1, -1): box(0.05, 0.18, 0.13, m['brass'], (k * 0.26, 0, top), (0, 0, math.pi / 4 * k), parent, bevel=0.01)
    return top

def crossbow(lv):
    m = M(); base = group('base'); xbase(m, lv, base)
    head = group('head'); s = [1.0, 1.12, 1.22][lv - 1]
    cyl(0.1, 0.08, m['ironDark'], (0, 0, 0.0), parent=head)
    hexbolt(0.06, 0.04, m['cream'], (0, 0, 0.14), parent=head)
    # the stock: a heavy striped beam along +X with cream clamps
    box(0.78 * s, 0.13, 0.11, m['wood'], (0.04, 0, 0.09), parent=head, bevel=0.025)
    for x in (-0.22, 0.12, 0.3):
        box(0.06, 0.16, 0.14, m['cream'], (x * s, 0, 0.09), parent=head, bevel=0.012)
    box(0.12, 0.2, 0.1, m['ironDark'], (-0.32 * s, 0, 0.1), parent=head, bevel=0.015)   # the winch
    cyl(0.03, 0.34, m['iron'], (-0.32 * s, 0, 0.12), (math.pi / 2, 0, 0), head, verts=12)
    for k in (1, -1): cyl(0.05, 0.03, m['cream'], (-0.32 * s, k * 0.18, 0.12), (math.pi / 2, 0, 0), head, verts=6)
    nb = 2 if lv >= 3 else 1
    for bi in range(nb):
        z = 0.15 + bi * 0.09
        # the bow: two steel arms swept back from the nose, cream caps at the tips, a dark string to the winch
        nose = (0.34 * s, 0, z)
        for k in (1, -1):
            mid = (0.28 * s, k * 0.24 * s, z); tip = (0.16 * s, k * 0.44 * s, z)
            beam(nose, mid, 0.07, 0.055, m['steel'] if lv < 2 else m['iron'], head)
            beam(mid, tip, 0.06, 0.05, m['steel'] if lv < 2 else m['iron'], head)
            box(0.09, 0.09, 0.08, m['cream'], tip, (0, 0, k * 0.4), head, bevel=0.015)
            rod(tip, (-0.26 * s, 0, z + 0.01), 0.008, m['string'], head)
        box(0.1, 0.12, 0.09, m['cream'], (0.36 * s, 0, z), parent=head, bevel=0.015)   # the bow's iron heart
        # the bolt, ready
        cyl(0.016, 0.62 * s, m['woodPlain'], (0.06 * s, 0, z + 0.06), (0, math.pi / 2, 0), head, verts=8, bevel=0)
        cone(0.04, 0.12, m['steel'], (0.4 * s, 0, z + 0.06), (0, math.pi / 2, 0), head, verts=4)
    if lv >= 3:
        # the golden dome over the crossbow, bristling with violet steel spikes (the original's top crossbow)
        d = sphere(0.27, m['gold'], (-0.02, 0, 0.2), parent=head, scale=(1.15, 1, 0.75))
        torus(0.3, 0.03, m['ironDark'], (-0.02, 0, 0.2), parent=head)
        for i in range(5):
            a = i / 5 * math.tau + 0.3; cone(0.045, 0.16, m['purple'], (-0.02 + math.cos(a) * 0.2, math.sin(a) * 0.18, 0.34), (math.sin(a) * 0.6, -math.cos(a) * 0.6 * 0 + 0.0, 0), head, verts=6)
        cone(0.05, 0.2, m['purple'], (-0.02, 0, 0.44), parent=head, verts=6)
    elif lv == 2:
        box(0.2, 0.22, 0.08, m['brass'], (-0.05, 0, 0.2), parent=head, bevel=0.02)
    return base, head, 0.3

def ringbase(m, lv, parent, r=0.36, h=0.16):
    """a round base of upright striped planks with iron hoops, like a squat barrel"""
    n = 14
    for i in range(n):
        a = i / n * math.tau
        box(0.15, 0.06, h, m['wood'], (math.cos(a) * r, math.sin(a) * r, h / 2), (0, 0, a + math.pi / 2), parent, bevel=0.012)
    cyl(r * 0.97, h * 0.9, m['woodDark'], (0, 0, h * 0.45), parent=parent, bevel=0)
    torus(r + 0.03, 0.022, m['iron'], (0, 0, h * 0.25), parent=parent)
    torus(r + 0.03, 0.022, m['brass'] if lv >= 2 else m['iron'], (0, 0, h * 0.8), parent=parent)
    rivets(r + 0.05, h * 0.8, 12, m['cream'], parent, 0.02)
    cyl(r * 0.7, 0.04, m['ironDark'], (0, 0, h + 0.01), parent=parent)
    return h

def bomb(lv):
    """the bone-white cannon on a striped wooden ring"""
    m = M(); base = group('base'); s = [1, 1.08, 1.16][lv - 1]
    ringbase(m, lv, base, 0.36 * s)
    if lv >= 2:
        for i in range(6): a = i / 6 * math.tau; cone(0.04, 0.18, m['steel'], (math.cos(a) * 0.44 * s, math.sin(a) * 0.44 * s, 0.1), (0, math.pi / 2, a), base, verts=4)
    head = group('head')
    # the yoke: two cream steel cheeks with bolts
    for k in (1, -1):
        box(0.24, 0.05, 0.26, m['cream'], (-0.02, k * 0.17 * s, 0.1), parent=head, bevel=0.02)
        hexbolt(0.045, 0.04, m['creamDark'], (0.0, k * 0.2 * s, 0.14), (math.pi / 2, 0, 0), head)
    cyl(0.2 * s, 0.06, m['ironDark'], (0, 0, -0.02), parent=head)
    # the barrel: a carved bone-cream tube flaring to a wide dark muzzle, holes along its sides
    bar = group('barrel', head, (0, 0, 0.14), (0, math.radians(65), 0))
    lathe([(0.0, -0.18), (0.12 * s, -0.18), (0.15 * s, -0.1), (0.13 * s, 0.05), (0.12 * s, 0.22), (0.15 * s, 0.3), (0.17 * s, 0.38), (0.13 * s, 0.4), (0.11 * s, 0.32), (0.0, 0.3)], m['cream'], parent=bar)
    cyl(0.11 * s, 0.03, m['dark'], (0, 0, 0.385), parent=bar, bevel=0)
    for i in range(3):
        for k in (1, -1): sphere(0.03, m['dark'], (k * 0.12 * s, 0, -0.05 + i * 0.09), parent=bar, scale=(0.5, 1, 1), seg=10)
    torus(0.15 * s, 0.022, m['brass'] if lv >= 2 else m['iron'], (0, 0, 0.3), parent=bar)
    if lv >= 3: torus(0.14 * s, 0.02, m['gold'], (0, 0, 0.1), parent=bar); cone(0.05, 0.14, m['steel'], (0, 0, -0.26), (math.pi, 0, 0), bar, verts=6)
    sphere(0.07, m['black'], (-0.2, 0.12, 0.05), parent=head)   # a bomb in the rack
    return base, head, 0.3


def frost(lv):
    """a wooden cradle holding big blue ice crystals, shards of ice round its foot"""
    m = M(); base = group('base'); s = [1, 1.08, 1.16][lv - 1]
    ringbase(m, lv, base, 0.34 * s, 0.14)
    import random as _r; R = _r.Random(lv * 7)
    for i in range(7 + lv * 3):
        a = i / (7 + lv * 3) * math.tau + R.uniform(-0.2, 0.2); rr = 0.36 * s + R.uniform(-0.04, 0.06)
        h = R.uniform(0.12, 0.26) * s
        c = ico(0.05, m['ice'], (math.cos(a) * rr, math.sin(a) * rr, h * 0.4), (R.uniform(-0.5, 0.5), R.uniform(-0.5, 0.5), a), base, sub=0, scale=(0.7, 0.7, h / 0.05))
        c.rotation_euler = (math.sin(a) * 0.5, -math.cos(a) * 0.5 * -1, 0)
    head = group('head')
    cyl(0.16, 0.06, m['ironDark'], (0, 0, -0.02), parent=head)
    # the cradle: two striped beams bent round the crystal, cream steel clamps and bolts
    for k in (1, -1):
        beam((-0.22 * s, k * 0.15, 0.04), (0.24 * s, k * 0.15, 0.04), 0.07, 0.09, m['wood'], head)
        beam((0.24 * s, k * 0.15, 0.04), (0.3 * s, k * 0.13, 0.26), 0.07, 0.08, m['wood'], head)
        beam((-0.22 * s, k * 0.15, 0.04), (-0.26 * s, k * 0.13, 0.24), 0.07, 0.08, m['wood'], head)
        box(0.1, 0.05, 0.12, m['cream'], (0.02, k * 0.19, 0.1), parent=head, bevel=0.015)
        hexbolt(0.035, 0.03, m['creamDark'], (0.02, k * 0.22, 0.12), (math.pi / 2, 0, 0), head)
    # the big crystal block, tipped toward the target, with a steel muzzle ring
    cr = ico(0.2 * s, m['iceDeep'], (0.03, 0, 0.22), (0.3, 0.4, 0.2), head, sub=1, scale=(1.25, 0.95, 0.85))
    for k in range(lv + 1): ico(0.07, m['ice'], (-0.12 + k * 0.08, (k % 2 - 0.5) * 0.18, 0.36 + (k % 2) * 0.05), (k, k * 0.7, 0), head, sub=0, scale=(0.6, 0.6, 1.7))
    cyl(0.07, 0.16, m['cream'], (0.3 * s, 0, 0.22), (0, math.pi / 2 - 0.2, 0), head, verts=16)
    torus(0.075, 0.02, m['brass'] if lv >= 2 else m['iron'], (0.38 * s, 0, 0.24), (0, math.pi / 2 - 0.2, 0), head)
    ico(0.05, m['ice'], (0.42 * s, 0, 0.25), (0, 0, 0), head, sub=0)
    return base, head, 0.26

def poison(lv):
    """the green acid bottle lying in steel bands on sprung legs, a yellow cap and a spike nozzle"""
    m = M(); base = group('base'); s = [1, 1.07, 1.14][lv - 1]
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2; x, y = math.cos(a) * 0.32, math.sin(a) * 0.32
        box(0.16, 0.16, 0.06, m['woodPlain'], (x, y, 0.03), (0, 0, a), base, bevel=0.015)
        for k in range(5): torus(0.05, 0.012, m['steel'], (x * 0.85, y * 0.85, 0.08 + k * 0.03), parent=base, maj=16, mn=6)   # the springs
    box(0.62, 0.62, 0.08, m['wood'], (0, 0, 0.26), (0, 0, math.pi / 4), base, bevel=0.03)
    for i in range(4): a = i * math.pi / 2; box(0.14, 0.14, 0.1, m['cream'], (math.cos(a) * 0.3, math.sin(a) * 0.3, 0.27), (0, 0, a + math.pi / 4), base, bevel=0.02)
    if lv >= 2: torus(0.2, 0.03, m['brass'], (0, 0, 0.3), parent=base)
    head = group('head')
    cyl(0.14, 0.06, m['ironDark'], (0, 0, 0), parent=head)
    tanks = [-0.1, 0.1] if lv >= 3 else [0]
    for y in tanks:
        t = group('tank', head, (0, y, 0.2), (0, math.radians(72), 0)); r = 0.15 * s * (0.8 if lv >= 3 else 1); L = 0.42 * s
        capsule(r, L, m['acid'], (0, 0, 0), parent=t)
        for z in (-L * 0.32, 0, L * 0.32): torus(r * 1.04, 0.025, m['cream'], (0, 0, z), parent=t)
        cyl(r * 0.45, 0.1, m['cream'], (0, 0, L / 2 + r * 0.9), parent=t, verts=16)
        cyl(r * 0.5, 0.06, flat('yellow', '#f2d43a', 0.4), (0, 0, L / 2 + r * 1.0 + 0.06), parent=t, verts=16)
        cone(0.04, 0.12, m['steel'], (0, 0, L / 2 + r + 0.15), parent=t, verts=8)
        sphere(r * 0.6, glow('acidGlow', '#6aff20', 2.0), (0, 0, 0), parent=t)
    for k in (1, -1): box(0.1, 0.05, 0.2, m['cream'], (0, k * 0.18, 0.08), parent=head, bevel=0.015)
    return base, head, 0.32

def claw(lv):
    """the heavy claw: a carved cream arm cocked back over a striped wooden ring, a boulder in its grip"""
    m = M(); base = group('base'); s = [1, 1.1, 1.2][lv - 1]
    ringbase(m, lv, base, 0.38, 0.16)
    if lv >= 3:
        for i in range(6): a = i / 6 * math.tau; cone(0.04, 0.2, m['steel'], (math.cos(a) * 0.46, math.sin(a) * 0.46, 0.1), (0, math.pi / 2, a), base, verts=4)
    head = group('head')
    for k in (1, -1):
        box(0.3, 0.06, 0.3, m['cream'], (-0.04, k * 0.16, 0.12), parent=head, bevel=0.025)
        for z in (0.06, 0.18): sphere(0.03, m['dark'], (-0.04, k * 0.19, z), parent=head, scale=(1, 0.4, 1), seg=10)
        hexbolt(0.045, 0.04, m['creamDark'], (-0.04, k * 0.2, 0.22), (math.pi / 2, 0, 0), head)
    cyl(0.035, 0.36, m['iron'], (-0.04, 0, 0.22), (math.pi / 2, 0, 0), head, verts=12)
    arm = group('arm', head, (-0.04, 0, 0.22), (0, math.radians(-35), 0))
    beam((-0.2 * s, 0, 0), (0.5 * s, 0, 0), 0.1, 0.1, m['cream'], arm, bevel=0.025)
    for x in (0.0, 0.16, 0.32): sphere(0.03, m['dark'], (x * s, 0.05, 0), parent=arm, scale=(1, 0.3, 1), seg=10)
    box(0.18, 0.2, 0.18, m['ironDark'], (-0.24 * s, 0, -0.06), parent=arm, bevel=0.03)   # counterweight
    # the claw: three hooked steel talons round a boulder
    cx = 0.52 * s
    cyl(0.1, 0.05, m['ironDark'], (cx, 0, 0.04), parent=arm)
    rock(0.15, m['rock'], (cx, 0, 0.17), arm, seed=lv)
    for i in range(4):   # hooked talons curling up round the boulder
        a = i / 4 * math.tau + math.pi / 4; dx, dy = math.cos(a), math.sin(a)
        beam((cx + dx * 0.09, dy * 0.09, 0.04), (cx + dx * 0.17, dy * 0.17, 0.14), 0.045, 0.04, m['steel'] if lv < 2 else m['iron'], arm, bevel=0.01)
        beam((cx + dx * 0.17, dy * 0.17, 0.14), (cx + dx * 0.13, dy * 0.13, 0.27), 0.04, 0.035, m['steel'] if lv < 2 else m['iron'], arm, bevel=0.01)
    return base, head, 0.3

def tesla(lv):
    """the electro tower: a round cream robot body on stubby legs, a pink coil and a crackling orb on top"""
    m = M(); base = group('base'); s = [1, 1.08, 1.16][lv - 1]
    for i in range(3):
        a = i / 3 * math.tau + 0.5
        beam((math.cos(a) * 0.1, math.sin(a) * 0.1, 0.32), (math.cos(a) * 0.36, math.sin(a) * 0.36, 0.03), 0.09, 0.08, m['wood'], base)
        box(0.13, 0.13, 0.05, m['ironDark'], (math.cos(a) * 0.37, math.sin(a) * 0.37, 0.025), (0, 0, a), base, bevel=0.012)
    body = sphere(0.24 * s, m['cream'], (0, 0, 0.42), parent=base, scale=(1, 1, 0.9))
    torus(0.245 * s, 0.02, m['creamDark'], (0, 0, 0.42), parent=base)
    for i in range(4): a = i / 4 * math.tau + 0.8; hexbolt(0.045, 0.04, m['iron'], (math.cos(a) * 0.23 * s, math.sin(a) * 0.23 * s, 0.38), (math.pi / 2, 0, a + math.pi / 2), base)
    cyl(0.07, 0.12, m['iron'], (0, 0, 0.66 * s), parent=base)
    # the coil: a spiral of pink wire climbing to the orb
    n = 5 + lv
    for i in range(n): torus(0.11 - i * 0.006, 0.02, m['coilPink'], (0, 0, 0.7 * s + i * 0.035), parent=base, maj=20, mn=8)
    top = 0.7 * s + n * 0.035
    sphere(0.11 * s, m['orb'], (0, 0, top + 0.1 * s), parent=base); sphere(0.05 * s, m['orbCore'], (0, 0, top + 0.1 * s), parent=base)
    torus(0.15 * s, 0.015, m['brass'], (0, 0, top + 0.06 * s), parent=base)
    if lv >= 3:
        for k in (1, -1): cyl(0.02, 0.32, m['brass'], (k * 0.32, 0, 0.36), parent=base); sphere(0.05, m['orb'], (k * 0.32, 0, 0.54), parent=base)
    return base, None, top + 0.1 * s

def mortar(lv):
    """the rocket mortar: red wooden plates and a squat black barrel aimed at the sky"""
    m = M(); base = group('base'); s = [1, 1.08, 1.16][lv - 1]
    box(0.74, 0.74, 0.16, m['woodRed'], (0, 0, 0.08), (0, 0, math.pi / 4), base, bevel=0.04)
    box(0.78, 0.78, 0.04, m['ironDark'], (0, 0, 0.17), (0, 0, math.pi / 4), base, bevel=0.01)
    for i in range(4): a = i * math.pi / 2; cone(0.05, 0.14, m['brass'] if lv >= 2 else m['steel'], (math.cos(a) * 0.4, math.sin(a) * 0.4, 0.24), parent=base, verts=6)
    head = group('head')
    cyl(0.26 * s, 0.08, m['ironDark'], (0, 0, 0), parent=head)
    for k in (1, -1): box(0.16, 0.06, 0.26, m['woodRed'], (0, k * 0.24 * s, 0.1), parent=head, bevel=0.02)
    bar = group('bar', head, (0, 0, 0.12), (0, math.radians(30), 0)); r = 0.17 * s
    lathe([(0.0, -0.12), (r * 1.1, -0.12), (r * 1.25, 0.0), (r * 1.1, 0.2), (r * 1.3, 0.28), (r * 0.85, 0.3), (r * 0.8, 0.05), (0, 0.05)], m['black'], parent=bar)
    torus(r * 1.27, 0.03, m['brass'] if lv >= 2 else m['iron'], (0, 0, 0.27), parent=bar)
    torus(r * 1.15, 0.025, m['redCloth'], (0, 0, 0.08), parent=bar)
    if lv >= 3:
        for i in range(5): a = i / 5 * math.tau; cone(0.03, 0.12, m['steel'], (math.cos(a) * r * 1.3, math.sin(a) * r * 1.3, 0.05), (0, math.pi / 2, a), bar, verts=4)
    return base, head, 0.22

def dome(lv):
    """the blade dome: a black iron ball bristling with blades, a cog on its side and a glowing red eye"""
    m = M(); base = group('base'); s = [1, 1.08, 1.16][lv - 1]
    ringbase(m, lv, base, 0.38, 0.12)
    head = group('head')
    sphere(0.3 * s, m['black'], (0, 0, 0.2), parent=head, scale=(1, 1, 0.92))
    torus(0.3 * s, 0.03, m['brass'] if lv >= 2 else m['iron'], (0, 0, 0.12), parent=head)
    import random as _r; R = _r.Random(3)
    for i in range(18 + lv * 4):
        y = 1 - (i + 0.5) / (18 + lv * 4) * 1.6; rr = math.sqrt(max(0, 1 - y * y)); a = i * 2.4
        d = Vector((math.cos(a) * rr, math.sin(a) * rr, y * 0.9 + 0.1)).normalized()
        if d.z < -0.1: continue
        c = cone(0.05, 0.2 * s, m['steel'], tuple(Vector((0, 0, 0.2)) + d * 0.32 * s), parent=head, verts=4)
        c.rotation_mode = 'QUATERNION'; c.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    # the cog and the eye on the front (+X)
    cyl(0.12, 0.04, m['cream'], (0.27 * s, 0, 0.22), (0, math.pi / 2, 0), head, verts=14)
    for i in range(10): a = i / 10 * math.tau; box(0.04, 0.05, 0.05, m['cream'], (0.28 * s, math.cos(a) * 0.14, 0.22 + math.sin(a) * 0.14), (a, 0, 0), head, bevel=0.005)
    sphere(0.06, m['glowRed'], (0.3 * s, 0.1, 0.32), parent=head, scale=(0.6, 1, 1))
    return base, head, 0.12

TOWERS = {'crossbow': crossbow, 'bomb': bomb, 'frost': frost, 'poison': poison, 'claw': claw, 'tesla': tesla, 'mortar': mortar, 'dome': dome}
