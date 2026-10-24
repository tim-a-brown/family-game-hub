# Goblin Defenders sprite render: path-traces the Blender models (towers.py, enemies.py, icons.py) into frames, trims
# each to its pixels and packs them into WebP sheets with an index (games/goblin/sprites.json) the game reads.
#   python render.py frames <group> [names...]   render frames into the work folder (groups: towers enemies hero icons)
#   python render.py pack                         pack every rendered frame into games/goblin/
# Run with the Python that has bpy (pip install bpy). Frames are cached in WORK, so groups can be re-rendered alone.
import sys, os, math, json, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORK = os.environ.get('GD_WORK', '/tmp/goblin-frames')
OUT = os.environ.get('GD_OUT', os.path.join(ROOT, 'games', 'goblin'))
ANG = 16; WALK = 8
# frame layouts: w, h, px per cell, anchor (the origin) x, y
TW = (330, 300, 150, 125, 220)     # tower bases: the cell centre (room on the right and top for the shadow)
HD = (240, 240, 150, 120, 130)     # tower heads: turning about their pivot
EN = (150, 150, 145, 75, 116)      # enemies: feet
BOSS = (260, 260, 140, 130, 204)
IC = (160, 160, 150, 80, 80)       # icons
PJ = (72, 72, 150, 36, 36)         # projectiles

def meta_path(): return os.path.join(WORK, 'meta.json')
def load_meta():
    try: return json.load(open(meta_path()))
    except Exception: return {}
def save_meta(m): json.dump(m, open(meta_path(), 'w'), indent=0)

def shot(key, sheet, f, samples=40, extra=None, elev=None):
    w, h, u, ax, ay = f
    sc = bpy.context.scene; sc.cycles.samples = samples
    for o in [o for o in sc.objects if o.type == 'CAMERA']: bpy.data.objects.remove(o, do_unlink=True)
    camera(w, h, u, ax, ay, ELEV if elev is None else elev)
    p = os.path.join(WORK, sheet, key + '.png'); os.makedirs(os.path.dirname(p), exist_ok=True)
    render(p)
    e = {'s': sheet, 'w': w, 'h': h, 'u': u, 'ax': ax, 'ay': ay}
    if extra: e.update(extra)
    json.dump(e, open(p[:-4] + '.json', 'w'))   # each frame keeps its own layout beside it

def do_towers(names):
    import towers
    for t in names or list(towers.TOWERS):
        for lv in (1, 2, 3):
            reset(); shadow_catcher(5)
            base, head, pv = towers.TOWERS[t](lv)
            if head:   # the head sits on its pivot, unseen but casting its shadow onto the base's ground
                head.location = (0, 0, pv)
                for o in head.children_recursive: o.visible_camera = False
            shot(t + str(lv), 'towers', TW, 48, {'pv': round(pv, 3)})
            if not head or os.environ.get('GD_BASES_ONLY'): continue
            for o in head.children_recursive: o.visible_camera = True
            base.hide_render = True
            for o in base.children_recursive: o.hide_render = True
            bpy.data.objects['catcher'].hide_render = True
            head.hide_render = False
            for o in head.children_recursive: o.hide_render = False
            head.location = (0, 0, 0)
            for i in range(ANG):
                # screen angle a (0 = right, pi/2 = down the screen, toward the viewer)
                head.rotation_euler = (0, 0, -i / ANG * math.tau)
                shot(t + str(lv) + '_' + str(i), 'heads_' + t, HD, 32)

def do_enemies(names):
    import enemies
    for e in names or list(enemies.ENEMIES):
        boss = e in ('blackKnight', 'frostTroll', 'spiderQueen', 'ogreWarlord', 'wraithLord')
        reset(); shadow_catcher(4)
        mdl = enemies.ENEMIES[e]()   # built once, re-posed for every frame
        for d, a in (('r', 0.0), ('d', -math.pi / 2), ('u', math.pi / 2)):
            for i in range(WALK):
                mdl['pose'](i / WALK); mdl['root'].rotation_euler = (0, 0, a)
                bpy.context.view_layer.update()
                shot(e + '_' + d + str(i), 'bosses' if boss else 'enemies', BOSS if boss else EN, 16, {'fly': 1} if mdl.get('fly') else None)

def do_hero():
    import enemies
    reset(); shadow_catcher(4); mdl = enemies.hero()
    for i in range(WALK):
        mdl['pose'](i / WALK); mdl['root'].rotation_euler = (0, 0, -math.pi / 2 + 0.5); bpy.context.view_layer.update()
        shot('hero_d' + str(i), 'enemies', (170, 190, 200, 85, 150), 20)

def do_icons(names):
    import icons
    for k in names or list(icons.ICONS):
        reset()
        obj, kind = icons.ICONS[k]()
        bpy.context.scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
        shot(k, 'proj' if kind == 'proj' else 'icons', PJ if kind == 'proj' else IC, 40, elev=None if kind == 'proj' else math.radians(10))

def feather(im):
    # the shadow catcher leaves faint noise everywhere and a hard edge where a long shadow leaves the frame:
    # drop the noise and fade the alpha to nothing over the last pixels at each side
    import numpy as np
    from PIL import Image
    a = np.asarray(im, np.float32).copy(); al = a[:, :, 3]
    al[al < 8] = 0
    h, w = al.shape; n = max(8, min(w, h) // 8)
    rx = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / n, 0, 1); ry = np.clip(np.minimum(np.arange(h), h - 1 - np.arange(h)) / n, 0, 1)
    a[:, :, 3] = al * np.minimum.outer(ry, rx)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')

def pack():
    from PIL import Image
    # every rendered frame: its layout from the sidecar json, else from the older meta.json, else its sheet's layout
    old = load_meta(); meta = {}; sheets = {}
    def layout(sheet):
        f = TW if sheet == 'towers' else HD if sheet.startswith('heads') else BOSS if sheet == 'bosses' else PJ if sheet == 'proj' else IC if sheet == 'icons' else EN
        return {'s': sheet, 'w': f[0], 'h': f[1], 'u': f[2], 'ax': f[3], 'ay': f[4]}
    pvs = {}
    for png in glob.glob(os.path.join(WORK, '*', '*.png')):
        sheet = os.path.basename(os.path.dirname(png)); key = os.path.basename(png)[:-4]
        side = png[:-4] + '.json'
        e = json.load(open(side)) if os.path.exists(side) else old.get(key) or layout(sheet)
        if sheet == 'towers' and 'pv' not in e:
            if not pvs:
                import towers
                for t, fn in towers.TOWERS.items():
                    for lv in (1, 2, 3): reset(); pvs[t + str(lv)] = fn(lv)[2]
            e['pv'] = round(pvs.get(key, 0.3), 3)
        if key.startswith('hero_'): e.update({'w': 170, 'h': 190, 'u': 200, 'ax': 85, 'ay': 150})
        meta[key] = e; sheets.setdefault(sheet, []).append(key)
    index = {'v': 2, 'elev': 48, 'sheets': {}, 'frames': {}}
    total = 0
    for name, keys in sorted(sheets.items()):
        frames = []
        for k in sorted(keys):
            im = Image.open(os.path.join(WORK, meta[k]['s'], k + '.png')).convert('RGBA')
            im = feather(im)
            bb = im.getchannel('A').point(lambda a: 255 if a > 6 else 0).getbbox() or (0, 0, 1, 1)
            bb = (max(0, bb[0] - 1), max(0, bb[1] - 1), min(im.width, bb[2] + 1), min(im.height, bb[3] + 1))
            frames.append((k, im.crop(bb), bb))
        # shelf-pack, tallest first
        frames.sort(key=lambda f: -f[1].height)
        MAXW = 2048; x = y = rh = 0; pos = {}
        for k, im, bb in frames:
            if x + im.width > MAXW: x = 0; y += rh; rh = 0
            pos[k] = (x, y); x += im.width; rh = max(rh, im.height)
        H = y + rh; W = min(MAXW, max(pos[k][0] + im.width for k, im, bb in frames))
        sheet = Image.new('RGBA', (W, H))
        for k, im, bb in frames:
            sheet.paste(im, pos[k]); e = meta[k]
            f = {'s': name, 'x': pos[k][0], 'y': pos[k][1], 'w': im.width, 'h': im.height, 'ax': e['ax'] - bb[0], 'ay': e['ay'] - bb[1], 'u': e['u']}
            if 'pv' in e: f['pv'] = e['pv']
            if e.get('fly'): f['fly'] = 1
            index['frames'][k] = f
        fn = name + '.webp'; sheet.save(os.path.join(OUT, fn), 'WEBP', quality=86, method=6)
        index['sheets'][name] = {'file': fn, 'w': W, 'h': H}
        sz = os.path.getsize(os.path.join(OUT, fn)); total += sz
        print(name, W, 'x', H, round(sz / 1024), 'KB')
    json.dump(index, open(os.path.join(OUT, 'sprites.json'), 'w'), separators=(',', ':'))
    print('total', round(total / 1024), 'KB', len(index['frames']), 'frames')

if __name__ == '__main__':
    os.makedirs(WORK, exist_ok=True)
    cmd = sys.argv[1]
    if cmd == 'frames':
        grp, names = sys.argv[2], sys.argv[3:]
        {'towers': do_towers, 'enemies': do_enemies, 'icons': do_icons}.get(grp, lambda n: do_hero())(names)
    elif cmd == 'pack': pack()
