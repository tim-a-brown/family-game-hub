#!/usr/bin/env python3
# pack.py <deck-id> <src dir of <key>.png> <out dir> [outlines.json]
# Makes a deck's card pictures: the subject is cut from its plain generated background (a flood fill from the edges,
# stopped by the drawing's own outlines), scaled so every subject fills the frame the same way, and laid on the deck's
# panel (a soft radial of its two panel colors). For the US States and Countries decks the place's real outline (from
# outlines.json) lies on the panel under the landmark. Writes <key>.webp (360 px) and <key>-t.webp (120 px).
import sys, json, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from collections import deque

deck_id, SRC, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
OUTL = json.load(open(sys.argv[4])) if len(sys.argv) > 4 else {}
here = os.path.dirname(os.path.abspath(__file__))
DECK = json.loads(subprocess.check_output(['node', '-e', "const D=require(process.argv[1]);const d=D.get(process.argv[2]);console.log(JSON.stringify({pan:d.pan,back:d.back,map:!!d.map,dark:!!d.dark,keys:d.s.map(x=>x[0])}))", os.environ.get('DECKS_JS', ''), deck_id]))
os.makedirs(OUT, exist_ok=True)
S = 1080   # working size (3x the 360 output)

def hexc(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def panel(size):
    a, b = np.array(hexc(DECK['pan'][0]), float), np.array(hexc(DECK['pan'][1]), float)
    y, x = np.mgrid[0:size, 0:size] / (size - 1)
    r = np.clip(np.hypot(x - 0.5, y - 0.44) / 0.72, 0, 1) ** 1.4
    img = a[None, None, :] * (1 - r[..., None]) + b[None, None, :] * r[..., None]
    return Image.fromarray(img.astype(np.uint8), 'RGB')

def cutout(im, tol):
    """alpha mask of the subject: everything not reached by a flood fill from the border through background-colored pixels"""
    a = np.asarray(im.convert('RGB')).astype(np.int32)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(-1))
    open_ = dist < tol
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if open_[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if open_[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and open_[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    # background shut inside the drawing (between a tripod's legs, under a cat's chin): a pocket of the very same flat
    # color as the background, big enough to matter, is background too; a white part of the subject is shaded and
    # grained, so it is never as flat as the paper it was drawn on
    from scipy import ndimage
    flat = (dist < tol * 0.4) & ~seen
    lab, n = ndimage.label(flat)
    if n:
        sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
        means = ndimage.mean(dist, lab, index=np.arange(1, n + 1))
        sds = ndimage.standard_deviation(dist, lab, index=np.arange(1, n + 1))
        keep = np.zeros(n + 1, bool)
        for i in range(n):
            if sizes[i] > h * w * 0.0012 and means[i] < 5 and sds[i] < 2.0: keep[i + 1] = True
        pocket = keep[lab]
        # grow each pocket out to the outline, as the flood fill does from the edges
        grow = ndimage.binary_dilation(pocket, iterations=3) & open_
        seen = seen | pocket | grow
    m = Image.fromarray(np.where(seen, 0, 255).astype(np.uint8), 'L')
    # soften: a pixel half way between the background and the drawing is half see-through
    soft = np.clip((dist - tol * 0.35) / (tol * 0.9), 0, 1)
    mm = np.maximum(np.asarray(m) / 255.0, np.where(seen, soft, 1))
    return Image.fromarray((mm * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.6)), bg

def outline_layer(key, size, fill, line):
    rings = OUTL.get(key)
    if not rings: return None
    k = size / 1000.0
    m = np.zeros((size, size), bool)
    for r in rings:
        rm = Image.new('L', (size, size), 0); ImageDraw.Draw(rm).polygon([(p[0] * k, p[1] * k) for p in r], fill=255)
        m ^= np.asarray(rm) > 127
    mask = Image.fromarray((m * 255).astype(np.uint8), 'L')
    lay = Image.new('RGBA', (size, size), fill + (0,))
    lay.putalpha(mask)
    edge = mask.filter(ImageFilter.MaxFilter(9)); edge = Image.fromarray(np.clip(np.asarray(edge).astype(int) - np.asarray(mask).astype(int), 0, 255).astype(np.uint8))
    ring = Image.new('RGBA', (size, size), line + (0,)); ring.putalpha(edge)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0)); out.alpha_composite(lay); out.alpha_composite(ring)
    return out

def mix(c1, c2, t): return tuple(int(round(c1[i] * (1 - t) + c2[i] * t)) for i in range(3))

keys = sys.argv[5].split(',') if len(sys.argv) > 5 and sys.argv[5] else DECK['keys']
for key in keys:
    f = os.path.join(SRC, key + '.png')
    if not os.path.exists(f): print('missing', key); continue
    im = Image.open(f).convert('RGB').resize((S, S), Image.LANCZOS)
    mask, bg = cutout(im, 30)
    bb = mask.point(lambda v: 255 if v > 40 else 0).getbbox()
    sub = im.convert('RGBA'); sub.putalpha(mask); sub = sub.crop(bb)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    fillf = 0.74 if DECK['map'] else 0.84
    sc = fillf * S / max(bw, bh)
    sub = sub.resize((max(1, int(bw * sc)), max(1, int(bh * sc))), Image.LANCZOS)
    base = panel(S).convert('RGBA')
    if DECK['map']:
        pa, bk = hexc(DECK['pan'][1]), hexc(DECK['back'][0])
        ol = outline_layer(key, S, mix(pa, bk, 0.22), mix(pa, bk, 0.62))
        if ol: base.alpha_composite(ol)
    # a soft contact shadow under the subject so it sits on the panel
    sh = Image.new('RGBA', sub.size, (0, 0, 0, 0)); sh.putalpha(sub.getchannel('A').point(lambda v: int(v * 0.18)))
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    x, y = (S - sub.width) // 2, (S - sub.height) // 2
    base.alpha_composite(sh, (x + 6, y + 12)); base.alpha_composite(sub, (x, y))
    big = base.convert('RGB').resize((360, 360), Image.LANCZOS)
    big.save(os.path.join(OUT, key + '.webp'), 'WEBP', quality=82, method=6)
    base.convert('RGB').resize((120, 120), Image.LANCZOS).save(os.path.join(OUT, key + '-t.webp'), 'WEBP', quality=80, method=6)
    Image.fromarray(np.asarray(mask)).resize((360, 360)).save(os.path.join(here, 'masks', deck_id + '-' + key + '.png')) if os.path.isdir(os.path.join(here, 'masks')) else None
    print('packed', key)
