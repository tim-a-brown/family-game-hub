# Packs the English-pattern court cards and jokers into the game: python3 scripts/cards/pack.py <folder> [KH,QS,...] [--tag -b]
# Needs Pillow, numpy and scipy (pip install them into a venv). Reads <folder>/<KEY><tag>.png and writes
# cards/<key>.webp and cards/s/<key>.webp.
# 1. Prints the picture in the card's inks: every pixel becomes the nearest of the inks in prompts.json ("inks": paper,
#    black, red, yellow, blue, flesh; the black-and-white joker only black and paper), measured in Lab so it goes by
#    how near two colors look. That is how the real cards are printed: flat inks, nothing in between.
# 2. Cleans it: a 3x3 majority pass smooths ragged edges, every patch of one ink smaller than SPECK pixels is
#    filled with the inks around it (stray dots inside a robe, flecks along an outline), and inside each area closed
#    by black lines the pale pixels all become paper or all flesh, whichever is more common there.
# 3. Crops and sizes it, and saves it through ImageMagick with sharp YUV. A court picture keeps its top: the crop has
#    the shape of half the card's picture box (0.50 by 0.616 card widths, kit.css .face.pic), and the court pictures are
#    made in that shape (1024x1264), so it is the whole picture, less the paper the tool leaves under and over the
#    figure (trim); kit.css shows it again turned over below. The small set is cropped closer (SMALL, sx).
#    A joker is cropped to the whole box (0.58 by 1.232) round the jester himself (fit).
#    Full size is 300 px tall for a court half and 600 for a joker; the small set (cards/s/, for cards under 80 px wide,
#    precached by service-worker.js) is half that. The downsizing averages the inks at their edges, so the lines stay
#    smooth at every size.
# --show <file>: also writes the full-size printed picture (before cropping) there, for looking at.
import sys, os, json, subprocess
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
P = json.load(open(os.path.join(HERE, 'prompts.json')))
args = sys.argv[1:]
tag = ''
if '--tag' in args: i = args.index('--tag'); tag = args[i + 1]; del args[i:i + 2]
show = None
if '--show' in args: i = args.index('--show'); show = args[i + 1]; del args[i:i + 2]
SRC = os.path.abspath(args[0])
keys = args[1].split(',') if len(args) > 1 else [f[:-4] for f in os.listdir(SRC) if f.endswith('.png')]
SMALL = 0.82    # the share of a court picture the small set keeps (below)
SPECK = 40      # pixels, at the 1024-wide source (the black-and-white joker keeps its fine dots: 5)

def hexrgb(h): return [int(h[i:i + 2], 16) for i in (1, 3, 5)]

def lab(rgb):
    c = rgb / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)

def printed(img, names, speck=SPECK):
    inks = np.array([hexrgb(P['inks'][n]) for n in names], float)
    a = np.asarray(img.convert('RGB'), float)
    d = ((lab(a)[:, :, None, :] - lab(inks)[None, None, :, :]) ** 2).sum(-1)
    idx = d.argmin(-1)
    n = len(names)
    # majority of each 3x3 neighbourhood
    votes = np.stack([ndi.uniform_filter((idx == k).astype(float), 3) for k in range(n)], -1)
    idx = votes.argmax(-1)
    # fill patches smaller than SPECK from their surroundings
    small = np.zeros(idx.shape, bool)
    for k in range(n):
        lab_, cnt = ndi.label(idx == k)
        if not cnt: continue
        sizes = ndi.sum(np.ones_like(lab_), lab_, index=np.arange(1, cnt + 1))
        bad = np.zeros(cnt + 1, bool); bad[1:] = sizes < speck
        small |= bad[lab_]
    if small.any():
        _, (iy, ix) = ndi.distance_transform_edt(small, return_indices=True)
        idx = idx[iy, ix]
    # paper and flesh are the two pale inks, and the tool's off-white (a blade, an ermine, a veil) falls between them
    # in blotches: inside each area closed by black lines, every pale pixel takes whichever of the two is the more
    # common there, so a blade is all paper and a face all flesh
    if 'flesh' in names:
        pa, fl = names.index('paper'), names.index('flesh')
        reg, cnt = ndi.label(idx != names.index('black'))
        ix_ = np.arange(cnt + 1)
        npa = ndi.sum(idx == pa, reg, ix_); nfl = ndi.sum(idx == fl, reg, ix_)
        to = np.where(npa >= nfl, pa, fl)
        pale = (idx == pa) | (idx == fl)
        idx = np.where(pale & (reg > 0), to[reg], idx)
    return Image.fromarray(inks[idx].astype(np.uint8), 'RGB')

def trim(img):
    # The picture tool leaves a band of paper under the figure and a little over it. A court half must run off its
    # bottom edge to meet its twin, so the paper under the figure goes (with the outline the tool draws along the
    # cut, if any), and the top keeps a margin of 1.5% over the crown; the crop below then takes the sides in.
    a = np.asarray(img.convert('L'))
    ink = (a < 200).mean(1)
    rows = np.nonzero(ink > 0.5)[0]
    bot = rows[-1] - 10 if len(rows) else a.shape[0]
    top = np.nonzero(ink > 0.004)[0]
    top = max(0, (top[0] if len(top) else 0) - round(a.shape[0] * 0.015))
    return img.crop((0, top, img.size[0], bot))

def fit(img, ratio):
    # A joker stands in the middle of a tall picture: the box is the figure's own bounds with a margin of 3% of its
    # height, widened or lengthened (with paper) to the joker box's shape, so the jester is as large as the box allows.
    a = np.asarray(img.convert('L')) < 200
    ys, xs = np.nonzero(a)
    m = round((ys.max() - ys.min()) * 0.03)
    x0, x1, y0, y1 = xs.min() - m, xs.max() + m, ys.min() - m, ys.max() + m
    w, h = x1 - x0, y1 - y0
    if w / h < ratio: d = round(h * ratio) - w; x0 -= d // 2; x1 = x0 + round(h * ratio)
    else: d = round(w / ratio) - h; y0 -= d // 2; y1 = y0 + round(w / ratio)
    out = Image.new('RGB', (x1 - x0, y1 - y0), tuple(hexrgb(P['inks']['paper'])))
    out.paste(img, (-x0, -y0))
    return out

os.makedirs(os.path.join(REPO, 'cards', 's'), exist_ok=True)
for K in keys:
    k = K.lower(); src = os.path.join(SRC, K + tag + '.png')
    img = Image.open(src)
    jk = k.startswith('jk')
    img = printed(img, ['paper', 'black'], 5) if k == 'jkb' else printed(img, ['paper', 'black', 'red', 'yellow', 'blue', 'flesh'])
    if show: img.save(show if len(keys) == 1 else os.path.join(show, K + '.png'))
    ratio = (0.58 / 1.232) if jk else (0.50 / 0.616)
    img = fit(img, ratio) if jk else trim(img)
    W, H = img.size
    cw = round(H * ratio)
    if cw <= W: box = ((W - cw) // 2, 0, (W - cw) // 2 + cw, H)
    else: ch = round(W / ratio); box = (0, 0, W, ch)
    crop = img.crop(box)
    for sub, h in (('', 600 if jk else 300), ('s/', 300 if jk else 150)):
        w = round(h * ratio)
        if sub and not jk:
            # a small card (a hand of cards on a phone) shows the head and shoulders larger: SMALL of the picture's
            # width (centered at the card's sx in prompts.json) and the top SMALL of its height, so the face, the eyes
            # and what is held still read
            cw_, ch_ = crop.size; z = SMALL; cx = P['cards'].get(K.upper(), {}).get('sx', 0.5)
            x0 = min(max(cx - z / 2, 0), 1 - z)
            crop = crop.crop((round(cw_ * x0), 0, round(cw_ * (x0 + z)), round(ch_ * z)))
        tmp = os.path.join(SRC, '.pack-%s.png' % k)
        crop.resize((w, h), Image.LANCZOS, reducing_gap=3.0).save(tmp)
        # sharp YUV keeps a red line on yellow from bleeding at small sizes
        subprocess.check_call(['convert', tmp, '-strip', '-quality', '82', '-define', 'webp:method=6', '-define', 'webp:use-sharp-yuv=1',
                               os.path.join(REPO, 'cards', sub + k + '.webp')])
        os.remove(tmp)
    print(k, box)
