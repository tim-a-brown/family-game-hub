# Contact sheet of the enemies: each at three facings (side, toward the camera, away) and two poses.
# python preview_enemies.py <out.png> [keys...]   (no keys: all of them, then the hero)
import sys, os, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
import enemies
from PIL import Image, ImageDraw
OUT = sys.argv[1]; keys = sys.argv[2:] or list(enemies.ENEMIES) + ['hero']
TMP = os.path.join(os.path.dirname(os.path.abspath(OUT)), 'etiles'); os.makedirs(TMP, exist_ok=True)
BOSS = {'blackKnight', 'frostTroll', 'spiderQueen', 'ogreWarlord', 'wraithLord'}
FACE = [('side', 0.0), ('front', -math.pi / 2), ('back', math.pi / 2)]
POSES = [0.0, 0.3]
SAMPLES = int(os.environ.get('SAMPLES', 16))
rows = []
for k in keys:
    t0 = time.time()
    reset(); big = k in BOSS
    W = 280 if big else 220 if k in ('ogre', 'rider', 'hero') else 160
    camera(W, W, 150 if big else 200, W // 2, int(W * 0.8)); shadow_catcher(6)
    bpy.context.scene.cycles.samples = SAMPLES
    mdl = enemies.hero() if k == 'hero' else enemies.ENEMIES[k]()
    tiles = []
    for ph in POSES:
        for fn, rz in FACE:
            mdl['root'].rotation_euler = (0, 0, rz); mdl['pose'](ph)
            p = os.path.join(TMP, f'{k}-{fn}-{ph}.png'); render(p); tiles.append(p)
    rows.append((k, W, tiles)); print(k, round(time.time() - t0, 1), 's', flush=True)
TW = max(w for _, w, _ in rows) * 6
H = sum(w for _, w, _ in rows)
sheet = Image.new('RGBA', (TW, H), (104, 168, 64, 255)); d = ImageDraw.Draw(sheet); y = 0
for k, W, tiles in rows:
    for i, p in enumerate(tiles): sheet.alpha_composite(Image.open(p), (i * W, y))
    d.text((4, y + 2), k, fill=(255, 255, 255, 255)); y += W
sheet.save(OUT); print('saved', OUT)
