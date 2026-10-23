# Quick look: towers assembled (head turned toward the viewer's right), each level side by side.
# python preview.py <out.png> crossbow bomb ...
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import towers
from PIL import Image
out = sys.argv[1]; names = sys.argv[2:]
tiles = []
for n in names:
    for lv in (1, 2, 3):
        reset(); camera(256, 300, 200, 128, 220); shadow_catcher(4)
        base, head, pv = towers.TOWERS[n](lv)
        if head: head.location = (0, 0, pv); head.rotation_euler = (0, 0, -math.radians(30))
        p = f'/tmp/claude-0/-home-user-family-game-hub/fdf5916c-743f-5f77-9ee1-1fb566f60dd9/scratchpad/bl/{n}{lv}.png'
        bpy.context.scene.cycles.samples = 32
        render(p); tiles.append(p)
ims = [Image.open(p) for p in tiles]
W = 256 * 3; H = 300 * len(names)
o = Image.new('RGBA', (W, H), (110, 170, 70, 255))
for i, im in enumerate(ims): o.alpha_composite(im, ((i % 3) * 256, (i // 3) * 300))
o.save(out)
