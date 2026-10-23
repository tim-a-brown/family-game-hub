# Goblin Defenders map backgrounds: each map built as a little 3D diorama (ground, road, water, grass, the village,
# caves, trees, rocks) and path-traced from the game's own camera, so a grid cell lands exactly on its square.
#   python maps.py [map ids...]        renders games/goblin/maps/<id>.jpg (all maps when none are given)
# The ground is stretched in depth by 1/sin(elevation): seen from the camera, cells come out square, while every model
# keeps its true proportions.
import sys, os, math, json, random, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from lib import _rgb
import props
from PIL import Image, ImageFilter
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'games', 'goblin', 'maps')
X0, X1, Y0, Y1 = -4, 22, -3, 12      # the painted area in cells (the grid is 0..16 x 0..9)
PX = int(os.environ.get('GD_MAP_PX', 80))
MK = 16                               # mask pixels per cell
SE = math.sin(ELEV)

def map_data():
    js = subprocess.run(['node', '-e', "const G=require('" + os.path.join(ROOT, 'games/goblindefenders-data.js') + "');process.stdout.write(JSON.stringify({maps:G.MAPS.concat([G.SURVIVAL]),lands:G.LANDS}))"], capture_output=True, text=True, check=True).stdout
    return json.loads(js)

def W(x, y, z=0.0): return (x, -y / SE, z)

LAND = {
    'jungle': dict(g=['#4d9a2a', '#6cb83a', '#3a7d22', '#82c844'], dirt=['#c99a58', '#a87838', '#e2bd7c'], rim='#6e7a2a', tuft=['#3f8f22', '#5aa830', '#2e6e1c'], water=('#14606e', '#3aa8b0'), border=['bushBig', 'palm', 'bush', 'fern', 'bushBig', 'palmLeft', 'bushBig']),
    'snow': dict(g=['#dce8f6', '#f4f8ff', '#b6cbe6', '#e8f0fa'], dirt=['#a7bcd8', '#8aa2c4', '#c8d8ee'], rim='#8fa8cc', tuft=None, water=('#4f8fd0', '#bfe4f8'), border=['pineSnow', 'pineSnowBig', 'iceRock', 'rocksGrey', 'pineSnow']),
    'desert': dict(g=['#e2a94a', '#f0c060', '#c98a34', '#ecb85a'], dirt=['#a8682a', '#8a5420', '#c8884a'], rim='#7a4a18', tuft=['#a88a3a', '#c2a24a'], water=('#2f8fd8', '#7fe0f8'), border=['cactus', 'rocksSand', 'skulls', 'palm', 'cactus', 'rocksSand']),
    'canyon': dict(g=['#b9a183', '#cbb594', '#9a846a', '#a8926f'], dirt=['#7a5a38', '#5e4428', '#94704a'], rim='#5a4430', tuft=['#7a9a3a', '#5f8a32'], water=('#2f7fd0', '#7fc8f4'), border=['rocks', 'deadTree', 'rocksGrey', 'bush', 'rocks']),
    'volcano': dict(g=['#4a3a36', '#5e4842', '#2e2422', '#6a5048'], dirt=['#7a6e66', '#5e524c', '#958a80'], rim='#2a1e1a', tuft=None, water=('#e83a08', '#ff8a20'), border=['volcanoRock', 'deadTree', 'volcanoRock', 'rocks']),
}

def masks(mp):
    """road and water masks (white = road / water) over the painted area, MK pixels a cell, softened"""
    w, h = (X1 - X0) * MK, (Y1 - Y0) * MK
    road = np.zeros((h, w), np.float32); water = np.zeros((h, w), np.float32)
    grid = mp['grid']
    def cell(i, j): return grid[j][i] if 0 <= j < 9 and 0 <= i < 16 else None
    def fill(arr, x0, y0, x1, y1):
        a = int((x0 - X0) * MK); b = int((y0 - Y0) * MK); c = int((x1 - X0) * MK); d = int((y1 - Y0) * MK)
        arr[max(0, b):max(0, d), max(0, a):max(0, c)] = 1
    for j in range(9):
        for i in range(16):
            c = cell(i, j)
            if c in '#SE=' and mp['kind'] != 'maze':
                pad = 0.12
                fill(road, i + pad, j + pad, i + 1 - pad, j + 1 - pad)
                for di, dj in ((1, 0), (0, 1)):
                    n = cell(i + di, j + dj)
                    if n and n in '#SE=': fill(road, i + pad + di * 0.5, j + pad + dj * 0.5, i + 1 - pad + di * 0.5, j + 1 - pad + dj * 0.5)
            if c in '~=': fill(water, i - 0.05, j - 0.05, i + 1.05, j + 1.05)
    # each entrance's road runs on out past the edge, into its cave
    for j in range(9):
        for i in range(16):
            if cell(i, j) != 'S': continue
            if i == 0: fill(road, X0, j + 0.12, 0.5, j + 0.88)
            elif i == 15: fill(road, 15.5, j + 0.12, X1, j + 0.88)
            elif j == 0: fill(road, i + 0.12, Y0, i + 0.88, 0.5)
            elif j == 8: fill(road, i + 0.12, 8.5, i + 0.88, Y1)
    if mp.get('river') is not None:
        x = mp['river']
        for yy in range(Y0, Y1):
            wob = math.sin(yy * 1.3) * 0.12
            fill(water, x + 0.12 + wob, yy, x + 0.88 + wob, yy + 1)
    def soften(a, r):
        im = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))
        return im
    return soften(road, MK * 0.12), soften(water, MK * 0.3), road, water

def img_tex(nt, pil, name):
    p = os.path.join(os.environ.get('GD_WORK', '/tmp'), name + '.png'); pil.save(p)
    im = bpy.data.images.load(p); im.colorspace_settings.name = 'Non-Color'
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = im; t.interpolation = 'Cubic'; t.extension = 'EXTEND'
    return t

def ground_material(L, road_img, water_img, land):
    m, nt, b = (lambda mm: (mm, mm.node_tree, None))(bpy.data.materials.new('ground'))
    m.use_nodes = True; nt = m.node_tree; [nt.nodes.remove(n) for n in list(nt.nodes)]
    out = nt.nodes.new('ShaderNodeOutputMaterial'); b = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(b.outputs[0], out.inputs[0])
    uv = nt.nodes.new('ShaderNodeTexCoord'); obj = uv.outputs['Object']
    rt = img_tex(nt, road_img, 'road_' + land); wt = img_tex(nt, water_img, 'water_' + land)
    nt.links.new(uv.outputs['UV'], rt.inputs[0]); nt.links.new(uv.outputs['UV'], wt.inputs[0])
    def noise(scale, detail=4, rough=0.55):
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail; n.inputs['Roughness'].default_value = rough
        nt.links.new(obj, n.inputs['Vector']); return n
    def ramp(src, cols, pos=None):
        r = nt.nodes.new('ShaderNodeValToRGB'); e = r.color_ramp.elements
        pos = pos or [i / (len(cols) - 1) for i in range(len(cols))]
        e[0].position = pos[0]; e[0].color = _rgb(cols[0]); e[1].position = pos[-1]; e[1].color = _rgb(cols[-1])
        for c, p in zip(cols[1:-1], pos[1:-1]): el = e.new(p); el.color = _rgb(c)
        nt.links.new(src, r.inputs[0]); return r
    def mix(a, bb, fac, mode='MIX'):
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = mode
        nt.links.new(fac, mx.inputs['Factor']); nt.links.new(a, mx.inputs[6]); nt.links.new(bb, mx.inputs[7]); return mx.outputs[2]
    # the land: broad painterly patches of its colours, then fine speckle
    big = noise(0.35, 3, 0.5); mid = noise(1.6, 6, 0.6); fine = noise(9, 8, 0.7)
    g = ramp(big.outputs['Fac'], [L['g'][2], L['g'][0], L['g'][1], L['g'][3]], [0.3, 0.45, 0.58, 0.72]).outputs[0]
    g = mix(g, ramp(mid.outputs['Fac'], [L['g'][2], L['g'][3]], [0.35, 0.7]).outputs[0], mid.outputs['Fac'], 'OVERLAY')
    sp = ramp(fine.outputs['Fac'], ['#000000', '#ffffff'], [0.4, 0.62]).outputs[0]
    g = mix(g, sp, fine.outputs['Fac'], 'SOFT_LIGHT')
    if land in ('snow', 'canyon', 'volcano', 'desert'):   # cracks (ice, dry earth, rock, cooling lava)
        vo = nt.nodes.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = {'snow': 1.4, 'canyon': 2.2, 'volcano': 0.8, 'desert': 1.2}[land]
        nt.links.new(obj, vo.inputs['Vector'])
        cr = ramp(vo.outputs['Distance'], ['#7f7f7f', '#ffffff'], [0.0, 0.016 if land == 'volcano' else 0.03]).outputs[0]
        crackcol = nt.nodes.new('ShaderNodeRGB'); crackcol.outputs[0].default_value = _rgb({'snow': '#8aa6cc', 'canyon': '#6a5844', 'volcano': '#ff5a10', 'desert': '#b0782e'}[land])
        inv = nt.nodes.new('ShaderNodeInvert'); nt.links.new(cr, inv.inputs['Color'])
        g = mix(g, crackcol.outputs[0], inv.outputs['Color'])
        if land == 'volcano':
            em = nt.nodes.new('ShaderNodeMath'); em.operation = 'MULTIPLY'; em.inputs[1].default_value = 1.2
            bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(inv.outputs['Color'], bw.inputs[0]); nt.links.new(bw.outputs[0], em.inputs[0])
            b.inputs['Emission Color'].default_value = _rgb('#ff4a08'); nt.links.new(em.outputs[0], b.inputs['Emission Strength'])
    # the road: packed dirt with pebbly speckle, a darker rim where it meets the grass
    dn = noise(5, 6, 0.6)
    dirt = ramp(dn.outputs['Fac'], [L['dirt'][1], L['dirt'][0], L['dirt'][2]], [0.3, 0.5, 0.7]).outputs[0]
    edge_n = noise(4, 3); rm = nt.nodes.new('ShaderNodeMath'); rm.operation = 'ADD'; nt.links.new(rt.outputs['Color'], rm.inputs[0])
    en = nt.nodes.new('ShaderNodeMath'); en.operation = 'MULTIPLY_ADD'; en.inputs[1].default_value = 0.35; en.inputs[2].default_value = -0.17; nt.links.new(edge_n.outputs['Fac'], en.inputs[0]); nt.links.new(en.outputs[0], rm.inputs[1])
    rmask = ramp(rm.outputs[0], ['#000000', '#ffffff'], [0.42, 0.55]).outputs[0]
    rim = ramp(rm.outputs[0], ['#000000', '#ffffff', '#000000'], [0.25, 0.42, 0.6]).outputs[0]
    col = mix(g, dirt, rmask)
    rimc = nt.nodes.new('ShaderNodeRGB'); rimc.outputs[0].default_value = _rgb(L['rim'])
    rf = nt.nodes.new('ShaderNodeMath'); rf.operation = 'MULTIPLY'; rf.inputs[1].default_value = 0.9
    bw2 = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(rim, bw2.inputs[0]); nt.links.new(bw2.outputs[0], rf.inputs[0])
    col = mix(col, rimc.outputs[0], rf.outputs[0])
    # under the water: dark wet shore
    wm = ramp(wt.outputs['Color'], ['#000000', '#ffffff'], [0.15, 0.5]).outputs[0]
    shore = nt.nodes.new('ShaderNodeRGB'); shore.outputs[0].default_value = _rgb('#3a3020' if land != 'volcano' else '#1a0e08')
    col = mix(col, shore.outputs[0], wm)
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.only_local = True; ao.inputs['Distance'].default_value = 0.4; nt.links.new(col, ao.inputs['Color'])
    nt.links.new(ao.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.9 if land != 'snow' else 0.55
    # bumps: lumpy ground, the road pressed in
    hb = nt.nodes.new('ShaderNodeMath'); hb.operation = 'MULTIPLY_ADD'; hb.inputs[1].default_value = -0.6
    bw3 = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(rmask, bw3.inputs[0]); nt.links.new(bw3.outputs[0], hb.inputs[0]); nt.links.new(mid.outputs['Fac'], hb.inputs[2])
    hb2 = nt.nodes.new('ShaderNodeMath'); hb2.operation = 'ADD'; nt.links.new(hb.outputs[0], hb2.inputs[0]); nt.links.new(fine.outputs['Fac'], hb2.inputs[1])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.45; bump.inputs['Distance'].default_value = 0.15
    nt.links.new(hb2.outputs[0], bump.inputs['Height']); nt.links.new(bump.outputs[0], b.inputs['Normal'])
    return m

def water_material(L, water_img, land):
    m = bpy.data.materials.new('water'); m.use_nodes = True; nt = m.node_tree; [nt.nodes.remove(n) for n in list(nt.nodes)]
    out = nt.nodes.new('ShaderNodeOutputMaterial'); uv = nt.nodes.new('ShaderNodeTexCoord')
    wt = img_tex(nt, water_img, 'waterm_' + land); nt.links.new(uv.outputs['UV'], wt.inputs[0])
    b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 6; nt.links.new(uv.outputs['Object'], n.inputs['Vector'])
    r = nt.nodes.new('ShaderNodeValToRGB'); e = r.color_ramp.elements; e[0].color = _rgb(L['water'][0]); e[1].color = _rgb(L['water'][1]); e[0].position = 0.4; e[1].position = 0.75
    # lighter toward the shore
    edge = nt.nodes.new('ShaderNodeMath'); edge.operation = 'SUBTRACT'; edge.inputs[0].default_value = 1.0; nt.links.new(wt.outputs['Color'], edge.inputs[1])
    ad = nt.nodes.new('ShaderNodeMath'); ad.operation = 'ADD'; nt.links.new(n.outputs['Fac'], ad.inputs[0]); nt.links.new(edge.outputs[0], ad.inputs[1])
    nt.links.new(ad.outputs[0], r.inputs[0]); nt.links.new(r.outputs[0], b.inputs['Base Color'])
    if land == 'volcano':
        b.inputs['Emission Color'].default_value = _rgb('#ff4a06'); b.inputs['Emission Strength'].default_value = 0.8; b.inputs['Roughness'].default_value = 0.6
        crust = nt.nodes.new('ShaderNodeTexVoronoi'); crust.inputs['Scale'].default_value = 5; nt.links.new(uv.outputs['Object'], crust.inputs['Vector'])
        cr = nt.nodes.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].position = 0.25; cr.color_ramp.elements[0].color = (0.03, 0.02, 0.02, 1); cr.color_ramp.elements[1].position = 0.32; cr.color_ramp.elements[1].color = (1, 1, 1, 1)
        nt.links.new(crust.outputs['Distance'], cr.inputs[0])
        mm = nt.nodes.new('ShaderNodeMix'); mm.data_type = 'RGBA'; mm.blend_type = 'MULTIPLY'; mm.inputs['Factor'].default_value = 1
        nt.links.new(r.outputs[0], mm.inputs[6]); nt.links.new(cr.outputs[0], mm.inputs[7]); nt.links.new(mm.outputs[2], b.inputs['Base Color']); nt.links.new(mm.outputs[2], b.inputs['Emission Color'])
    else:
        b.inputs['Roughness'].default_value = 0.04; b.inputs['Coat Weight'].default_value = 1.0; b.inputs['Specular IOR Level'].default_value = 0.8
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.25; nt.links.new(n.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
    sn = nt.nodes.new('ShaderNodeTexNoise'); sn.inputs['Scale'].default_value = 1.6; nt.links.new(uv.outputs['Object'], sn.inputs['Vector'])
    sh = nt.nodes.new('ShaderNodeMath'); sh.operation = 'MULTIPLY_ADD'; sh.inputs[1].default_value = 0.5; nt.links.new(sn.outputs['Fac'], sh.inputs[0]); nt.links.new(wt.outputs['Color'], sh.inputs[2])
    th = nt.nodes.new('ShaderNodeValToRGB'); th.color_ramp.elements[0].position = 0.62; th.color_ramp.elements[1].position = 0.68
    nt.links.new(sh.outputs[0], th.inputs[0]); nt.links.new(th.outputs[0], mx.inputs[0])
    nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(b.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs[0])
    return m

def plane(mat, z, name, sub=1):
    """a ground-sized plane over the painted area (plus a margin), UVs running over the painted area"""
    import bmesh
    bm = bmesh.new(); xs = [X0 - 1 + (X1 - X0 + 2) * i / sub for i in range(sub + 1)]; ys = [Y0 - 1 + (Y1 - Y0 + 2) * j / sub for j in range(sub + 1)]
    vs = [[bm.verts.new(W(x, y, z)) for x in xs] for y in ys]
    uvl = bm.loops.layers.uv.new()
    for j in range(sub):
        for i in range(sub):
            f = bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))   # counter-clockwise from above: facing up
            for lp, (x, y) in zip(f.loops, [(xs[i], ys[j]), (xs[i + 1], ys[j]), (xs[i + 1], ys[j + 1]), (xs[i], ys[j + 1])]):
                lp[uvl].uv = ((x - X0) / (X1 - X0), 1 - (y - Y0) / (Y1 - Y0))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

def scatter_mesh(name, mat, items, blade):
    """many small things (grass blades, pebbles) as one mesh: items = [(x, y, rot, scale)] in cells"""
    import bmesh
    bm = bmesh.new()
    for (x, y, rot, s) in items:
        cx, cy, _ = W(x, y)
        for tri in blade:
            vs = []
            for (px, py, pz) in tri:
                rx = px * math.cos(rot) - py * math.sin(rot); ry = px * math.sin(rot) + py * math.cos(rot)
                vs.append(bm.verts.new((cx + rx * s, cy + ry * s, pz * s)))
            bm.faces.new(vs)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); o.data.materials.append(mat)
    return o

def blades(R):
    """a tuft: five thin blades leaning out"""
    out = []
    for k in range(5):
        a = k / 5 * math.tau + R.uniform(-0.3, 0.3); lean = R.uniform(0.2, 0.5); h = R.uniform(0.06, 0.12); w = 0.012
        tx, ty = math.cos(a) * lean * h, math.sin(a) * lean * h
        out.append([(-w * math.sin(a), w * math.cos(a), 0), (w * math.sin(a), -w * math.cos(a), 0), (tx, ty, h)])
    return out

def build(mp, lands):
    reset(); sc = bpy.context.scene
    land = mp['land']; L = LAND[land]; R = random.Random(mp['seed'] * 31 + 5)
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.7, 0.8, 0.95, 1)
    sun = bpy.data.objects['sun']; sun.data.energy = 3.0
    if land == 'volcano': sun.data.energy = 2.2; sun.data.color = (1, 0.82, 0.7)
    if land == 'snow': sun.data.energy = 2.6
    road_img, water_img, road, water = masks(mp)
    plane(ground_material(L, road_img, water_img, land), 0, 'ground', 1)
    if water.any(): plane(water_material(L, water_img, land), 0.025, 'water', 1)
    def at(arr, x, y):
        i = int((x - X0) * MK); j = int((y - Y0) * MK)
        return arr[min(arr.shape[0] - 1, max(0, j)), min(arr.shape[1] - 1, max(0, i))] if True else 0
    # grass tufts everywhere but the road and the water; pebbles along the road
    if L['tuft']:
        tufts = {c: [] for c in range(len(L['tuft']))}
        dens = 22 if land == 'jungle' else 8
        for k in range(int((X1 - X0) * (Y1 - Y0) * dens)):
            x = R.uniform(X0, X1); y = R.uniform(Y0, Y1)
            if at(road, x, y) > 0.1 or at(water, x, y) > 0.1: continue
            tufts[R.randrange(len(L['tuft']))].append((x, y, R.uniform(0, 6.28), R.uniform(0.8, 1.5)))
        for c, items in tufts.items():
            if items: scatter_mesh('tuft%d' % c, flat('tuft%d' % c + land, L['tuft'][c], 0.7, ao=0.3, edge=False), items, blades(R))
    if land in ('jungle', 'canyon'):
        fl = [flat('flowerW', '#fff8e8', 0.5, edge=False), flat('flowerY', '#ffe04a', 0.5, edge=False), flat('flowerP', '#ff8ac0', 0.5, edge=False)]
        for k in range(int((X1 - X0) * (Y1 - Y0) * 0.8)):
            x = R.uniform(X0, X1); y = R.uniform(Y0, Y1)
            if at(road, x, y) > 0 or at(water, x, y) > 0: continue
            sphere(R.uniform(0.02, 0.03), fl[R.randrange(3)], W(x, y, 0.04), seg=8)
    if mp['kind'] != 'maze':
        peb = []
        for k in range(int((X1 - X0) * (Y1 - Y0) * 10)):
            x = R.uniform(X0, X1); y = R.uniform(Y0, Y1); v = at(road, x, y)
            if 0.0 < v < 1.0 or (v >= 1 and R.random() < 0.1): peb.append((x, y))
        m = metal('pebble' + land, L['dirt'][2] if land != 'volcano' else '#4a3a36', 0.9, 0.0, 0.5)
        for (x, y) in peb[:1200]:
            ico(R.uniform(0.035, 0.07), m, W(x, y, 0.01), (R.random(), R.random(), R.random()), sub=1, scale=(1, 1, 0.55))
    # bridges over the river
    for j in range(9):
        for i in range(16):
            if mp['grid'][j][i] == '=':
                bg = group('bridge', None, W(i + 0.5, j + 0.5, 0.06))
                for q in range(6): box(1.06 / 6 - 0.012, 1.0 / SE * 0.84, 0.05, M()['woodPlain'], ((q - 2.5) * 1.06 / 6, 0, 0), parent=bg, bevel=0.008)
                for k in (1, -1): box(1.1, 0.06, 0.08, M()['woodDark'], (0, k * 0.45 / SE, 0.05), parent=bg, bevel=0.01)
    # the props: the map's own scenery, caves at the entrances, the village at the gate
    placed = []
    def put(kind, x, y, s=1.0, rot=0.0):
        g = group(kind, None, W(x, y), (0, 0, rot)); g.scale = (s, s, s); props.PROPS[kind](g, random.Random(int(x * 97 + y * 13))); placed.append((x, y, kind))
    for d in mp.get('deco', []): put(d[0], d[1], d[2], d[3] if len(d) > 3 else 1.0, R.uniform(-0.4, 0.4))
    cave = lands[land]['cave']; caveSide = {'gate': 'caveSnow'}.get(cave, cave)
    for j in range(9):
        for i in range(16):
            if mp['grid'][j][i] != 'S': continue
            if j == 0: put(cave if cave == 'gate' else caveSide, i + 0.5, -0.35, 0.95)
            elif j == 8: put(caveSide, i + 0.5, 9.55, 0.95)
            elif i == 0: put(caveSide, -0.45, j + 0.55, 0.95, -0.35)
            else: put(caveSide, 16.45, j + 0.55, 0.95, 0.35)
    ex = [(i, j) for j in range(9) for i in range(16) if mp['grid'][j][i] == 'E'][0]
    vp = mp.get('village') or [ex[0] + 0.75, ex[1] + 0.85]
    put('village', vp[0], vp[1], 1.25)
    # blocked cells without scenery get a rock or a bush
    for j in range(9):
        for i in range(16):
            if mp['grid'][j][i] == 'o' and not any(abs(px - i - 0.5) < 0.8 and abs(py - j - 0.5) < 0.8 for (px, py, k) in placed):
                put(R.choice(['rocks', 'bush'] if land in ('jungle', 'canyon') else ['rocksGrey', 'pineSnow'] if land == 'snow' else ['rocksSand', 'cactus'] if land == 'desert' else ['volcanoRock']), i + 0.5, j + 0.6, 0.8)
    # the border: the land's own plants and rocks thick round the edge, clear of roads, caves and the village
    for k in range(520 if land == 'jungle' else 300):
        x = R.uniform(X0 + 0.2, X1 - 0.2); y = R.uniform(Y0 + 0.2, Y1 - 0.1)
        if -0.15 < x < 16.15 and -0.25 < y < 9.3: continue
        if at(road, x, y) > 0 or at(water, x, y) > 0.2: continue
        if any((px - x) ** 2 + (py - y) ** 2 < (1.6 if kk in ('village', 'cave', 'caveSnow', 'caveSand', 'caveLava', 'gate') else 0.55) ** 2 for (px, py, kk) in placed): continue
        put(R.choice(L['border']), x, y, R.uniform(0.85, 1.35), R.uniform(-3, 3))
    return sc

def render_map(mp, lands, out=None, px=None):
    px = px or PX
    sc = build(mp, lands)
    camera((X1 - X0) * px, (Y1 - Y0) * px, px, -X0 * px, -Y0 * px)
    sc.cycles.samples = int(os.environ.get('GD_MAP_SAMPLES', 64)); sc.render.film_transparent = False
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'
    tmp = os.path.join(os.environ.get('GD_WORK', '/tmp'), 'map_' + mp['id'] + '.png')
    render(tmp)
    os.makedirs(OUT, exist_ok=True)
    Image.open(tmp).convert('RGB').save(out or os.path.join(OUT, mp['id'] + '.jpg'), 'JPEG', quality=84, optimize=True, progressive=True)
    json.dump({'x0': X0, 'x1': X1, 'y0': Y0, 'y1': Y1, 'px': px}, open(os.path.join(OUT, 'region.json'), 'w'))

if __name__ == '__main__':
    d = map_data(); want = sys.argv[1:]
    for mp in d['maps']:
        if want and mp['id'] not in want: continue
        render_map(mp, d['lands'], out=os.environ.get('GD_MAP_OUT'))
        print('rendered', mp['id'])
