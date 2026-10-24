# Goblin Defenders world map: the five lands side by side as one diorama, a dirt road winding through the ten stops.
#   python worldmap.py            renders games/goblin/maps/world.jpg (2:1); the stops' positions are NODES below,
#                                 as fractions of the picture (the game reads them from region.json's "world")
# The stops stay inside the middle of the picture, so it can be cropped to fill an iPad or a wide phone.
import sys, os, math, json, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from lib import _rgb
import maps, props
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

UW, VH = 32, 16                      # the picture in world units
NODES = [(.16, .68), (.23, .42), (.31, .64), (.38, .38), (.47, .66), (.54, .4), (.62, .64), (.69, .38), (.77, .66), (.84, .42)]
BANDS = [('jungle', 0, .27), ('snow', .27, .425), ('desert', .425, .58), ('canyon', .58, .735), ('volcano', .735, 1.0)]

def road_points():
    pts = [(.0, .74)] + NODES + [(1.0, .4)]
    out = []
    for a, b in zip(pts, pts[1:]):
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (0.08 if a[1] < b[1] else -0.08) * 0
        for k in range(12):
            t = k / 12; x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t + math.sin(t * math.pi) * (0.05 if b[1] > a[1] else -0.05)
            out.append((x, y))
    return out

TRAIL = ['#d8b278', '#b88a50', '#ecd29c']; TRAIL_RIM = '#8a6234'

def fix_uv(o):
    # a strip plane's UVs still run over the whole picture
    for lp in o.data.loops:
        v = o.data.vertices[lp.vertex_index].co
        o.data.uv_layers.active.data[lp.index].uv = (v.x / UW, 1 + v.y * maps.SE / VH)

def main():
    maps.X0, maps.X1, maps.Y0, maps.Y1 = 0, UW, 0, VH
    reset(); sc = bpy.context.scene
    sc.cycles.transparent_max_bounces = 32   # the lands' ground layers are see-through where another land shows
    MK = maps.MK; w, h = UW * MK, VH * MK
    road = Image.new('L', (w, h), 0); dr = ImageDraw.Draw(road)
    rp = [(x * w, y * h) for x, y in road_points()]
    dr.line(rp, fill=255, width=int(MK * 0.5), joint='curve')
    for x, y in NODES: dr.ellipse([x * w - MK * 0.8, y * h - MK * 0.65, x * w + MK * 0.8, y * h + MK * 0.65], fill=255)
    water = Image.new('L', (w, h), 0); dw = ImageDraw.Draw(water)
    dw.ellipse([.05 * w, .2 * h, .13 * w, .34 * h], fill=255)                    # a jungle lake
    dw.ellipse([.47 * w, .14 * h, .52 * w, .24 * h], fill=255)                   # the oasis
    dw.line([(.655 * w, 0), (.665 * w, .3 * h), (.645 * w, .55 * h), (.66 * w, h)], fill=255, width=int(MK * 0.7))   # the canyon river
    road_s = road.filter(ImageFilter.GaussianBlur(MK * 0.12)); water_s = water.filter(ImageFilter.GaussianBlur(MK * 0.3))
    road_a = np.asarray(road, np.float32) / 255; water_a = np.asarray(water, np.float32) / 255
    # one ground strip per land, each fading out at its sides into the next
    for k, (land, a, b) in enumerate(BANDS):
        L = dict(maps.LAND[land], dirt=TRAIL, rim=TRAIL_RIM)   # one light dirt trail runs through every land
        m = maps.ground_material(L, road_s, water_s, land)
        if k == 0: maps.plane(m, 0, 'ground_' + land, 1); continue   # the jungle lies under everything; the others fade in over it
        nt = m.node_tree; out = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]; bs = out.inputs[0].links[0].from_node
        uv = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(uv.outputs['UV'], sep.inputs[0])
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3; nt.links.new(uv.outputs['Object'], nz.inputs['Vector'])
        jx = nt.nodes.new('ShaderNodeMath'); jx.operation = 'MULTIPLY_ADD'; jx.inputs[1].default_value = 0.05; nt.links.new(nz.outputs['Fac'], jx.inputs[0]); nt.links.new(sep.outputs['X'], jx.inputs[2])
        ramp = nt.nodes.new('ShaderNodeValToRGB'); e = ramp.color_ramp.elements
        e[0].position = max(0, a - 0.01); e[0].color = (0, 0, 0, 1) if a > 0 else (1, 1, 1, 1); e[1].position = min(1, b + 0.04); e[1].color = (0, 0, 0, 1) if b < 1 else (1, 1, 1, 1)
        e2 = e.new(min(1, a + 0.04) if a > 0 else 0.001); e2.color = (1, 1, 1, 1); e3 = e.new(max(0, b - 0.01) if b < 1 else 0.999); e3.color = (1, 1, 1, 1)
        nt.links.new(jx.outputs[0], ramp.inputs[0])
        tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mx = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(ramp.outputs[0], mx.inputs[0]); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(bs.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs[0])
        # only over its own strip (and the fade), so few layers stack anywhere
        maps.X0, maps.X1 = max(0, (a - 0.03) * UW), min(UW, (b + 0.06) * UW) if b < 1 else UW
        o = maps.plane(m, k * 0.002, 'ground_' + land, 1); maps.X0, maps.X1 = 0, UW
        fix_uv(o)
    # water (lava in the volcano), one plane each side of the canyon
    wm = maps.water_material(maps.LAND['jungle'], water_s, 'worldW'); maps.plane(wm, 0.03, 'water', 1)
    R = random.Random(9)
    def at(arr, x, y):
        i = min(arr.shape[1] - 1, max(0, int(x / UW * arr.shape[1]))); j = min(arr.shape[0] - 1, max(0, int(y / VH * arr.shape[0]))); return arr[j, i]
    def land_at(u):
        for land, a, b in BANDS:
            if a <= u < b: return land
        return 'volcano'
    placed = []
    def put(kind, x, y, s=1.0, rot=0.0):
        g = group(kind, None, maps.W(x, y), (0, 0, rot)); g.scale = (s, s, s); props.PROPS[kind](g, random.Random(int(x * 97 + y * 13))); placed.append((x, y))
    # landmarks
    put('village', .085 * UW, .78 * VH, 1.6); put('gate', .35 * UW, .16 * VH, 1.4); put('pyramid', .505 * UW, .78 * VH, 1.1)
    put('cave', .7 * UW, .14 * VH, 1.3); put('caveLava', .8 * UW, .16 * VH, 1.4); put('ribs', .55 * UW, .2 * VH, 1.4)
    for _ in range(900):
        x = R.uniform(0.2, UW - 0.2); y = R.uniform(0.2, VH - 0.2); u = x / UW
        if at(road_a, x, y) > 0 or at(water_a, x, y) > 0: continue
        if any((nx * UW - x) ** 2 + (ny * VH - y) ** 2 < 1.5 for nx, ny in NODES): continue
        if any((px - x) ** 2 + (py - y) ** 2 < 0.5 for px, py in placed): continue
        land = land_at(u)
        put(R.choice(maps.LAND[land]['border']), x, y, R.uniform(0.9, 1.5), R.uniform(-3, 3))
    PW = int(os.environ.get('GD_WORLD_W', 2400)); maps.camera(PW, PW // 2, PW / UW, 0, 0)
    sc.cycles.samples = int(os.environ.get('GD_MAP_SAMPLES', 64)); sc.render.film_transparent = False
    sc.render.image_settings.color_mode = 'RGB'
    tmp = os.path.join(os.environ.get('GD_WORK', '/tmp'), 'world.png'); render(tmp)
    os.makedirs(maps.OUT, exist_ok=True)
    Image.open(tmp).convert('RGB').save(os.environ.get('GD_MAP_OUT') or os.path.join(maps.OUT, 'world.jpg'), 'JPEG', quality=84, optimize=True, progressive=True)
    json.dump({'nodes': NODES, 'aspect': 2.0}, open(os.path.join(maps.OUT, 'world.json'), 'w'))

if __name__ == '__main__':
    main()
