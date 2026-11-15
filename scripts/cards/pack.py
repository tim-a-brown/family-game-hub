# Packs painted cards into the game: python3 scripts/cards/pack.py <folder> [KH,QS,...]
# Reads <folder>/<KEY>.png (1024x1536) and writes cards/<key>.webp and cards/s/<key>.webp (needs ImageMagick).
# A court picture keeps its top: the crop has the shape of half the card's picture box (0.50 by 0.616 card widths,
# kit.css .face.pic), from the crown down; kit.css shows it again turned over below. A joker is cropped to the whole
# box (0.58 by 1.232), centred. Full size is 300 px tall for a court half and 600 for a joker; the small set (cards/s/,
# for cards under 80 px wide, and precached by service-worker.js) is half that.
import sys, os, subprocess
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.abspath(sys.argv[1])
keys = sys.argv[2].split(',') if len(sys.argv) > 2 else [f[:-4] for f in os.listdir(SRC) if f.endswith('.png')]
os.makedirs(os.path.join(REPO, 'cards', 's'), exist_ok=True)
for K in keys:
    k = K.lower(); src = os.path.join(SRC, K + '.png')
    if not os.path.exists(src): src = os.path.join(SRC, k + '.png')
    W, H = map(int, subprocess.check_output(['identify', '-format', '%w %h', src]).split())
    jk = k.startswith('jk')
    ratio = (0.58 / 1.232) if jk else (0.50 / 0.616)
    cw = round(H * ratio)
    if cw <= W: box = ((W - cw) // 2, 0, (W - cw) // 2 + cw, H)
    else: ch = round(W / ratio); box = (0, 0, W, ch)
    crop = '%dx%d+%d+%d' % (box[2] - box[0], box[3] - box[1], box[0], box[1])
    for sub, h in (('', 600 if jk else 300), ('s/', 300 if jk else 150)):
        w = round(h * ratio)
        subprocess.check_call(['convert', src, '-crop', crop, '+repage', '-filter', 'Lanczos', '-resize', '%dx%d!' % (w, h), '-strip',
                               '-quality', '84', '-define', 'webp:method=6', os.path.join(REPO, 'cards', sub + k + '.webp')])
    print(k, crop)
