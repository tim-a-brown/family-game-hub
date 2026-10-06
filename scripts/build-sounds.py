#!/usr/bin/env python3
"""Builds sounds/*.mp3 (the Kit's game sounds) from Kenney's CC0 audio packs.

Source: kenney.nl Casino Audio, Impact Sounds, RPG Audio, Interface Sounds,
UI Audio and Music Jingles (all CC0). Each sound is trimmed, layered where
noted, normalized and saved as a small mono MP3. Re-run with the packs
unzipped under sounds-src/<pack>/ (download them from kenney.nl;
keep sounds-src out of the repo):  python3 scripts/build-sounds.py
"""
import subprocess, numpy as np, os, glob, sys
SR = 44100
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'sounds-src'); OUT = os.path.join(ROOT, 'sounds')

def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', os.path.join(SRC, p), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    if not len(x): sys.exit('missing ' + p)
    return x / (np.abs(x).max() or 1)
def pitch(x, r):           # r > 1 = higher (and shorter), like speeding up the tape
    if r == 1: return x
    n = int(len(x) / r); return np.interp(np.arange(n) * r, np.arange(len(x)), x)
def trim(x, thr=0.02, pre=0.004):
    e = np.abs(x); idx = np.where(e > thr * e.max())[0]
    if not len(idx): return x
    a = max(0, idx[0] - int(pre * SR)); b = min(len(x), idx[-1] + int(0.03 * SR))
    return x[a:b]
def lowpass(x, hz):
    a = np.exp(-2 * np.pi * hz / SR); y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s = (1 - a) * v + a * s; y[i] = s
    return y
def mix(*parts):          # parts: (signal, start_seconds, gain)
    n = max(int(t * SR) + len(s) for s, t, g in parts); y = np.zeros(n)
    for s, t, g in parts: i = int(t * SR); y[i:i + len(s)] += s * g
    return y
def save(name, x, maxlen=None, fade=0.03):
    x = trim(x)
    if maxlen: x = x[:int(maxlen * SR)]
    f = min(len(x) // 3, int(fade * SR))
    if f: x[-f:] *= np.linspace(1, 0, f) ** 2
    x[:32] *= np.linspace(0, 1, 32)
    x = x / (np.abs(x).max() or 1) * 0.89
    pcm = (x * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-v', 'quiet', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-codec:a', 'libmp3lame', '-b:a', '96k', os.path.join(OUT, name + '.mp3')], input=pcm, check=True)

C, I, R, U, J, K = 'casino-audio/', 'impact-sounds/', 'rpg-audio/', 'interface-sounds/', 'ui-audio/', 'music-jingles/'
S = {
  'tap':   [J + 'click2.ogg', J + 'click4.ogg', J + 'click1.ogg'],
  'tick':  [U + 'tick_004.ogg', U + 'tick_002.ogg'],
  'pop':   [U + 'drop_002.ogg', U + 'drop_003.ogg'],
  'flip':  [C + 'card-place-1.ogg', C + 'card-place-2.ogg', C + 'card-place-4.ogg', C + 'card-slide-5.ogg'],
  'deal':  [C + 'card-slide-1.ogg', C + 'card-slide-6.ogg', C + 'card-slide-4.ogg'],
  'chip':  [C + 'chips-collide-1.ogg', C + 'chips-collide-2.ogg', C + 'chips-stack-2.ogg', C + 'chips-stack-5.ogg'],
  'roll':  [C + 'dice-throw-1.ogg', C + 'dice-throw-3.ogg', C + 'dice-throw-2.ogg'],
  'whoosh':[R + 'cloth2.ogg', R + 'cloth3.ogg', C + 'card-fan-1.ogg'],
  'good':  [K + 'jingles_PIZZI16.ogg', K + 'jingles_PIZZI04.ogg'],
  'bad':   [K + 'jingles_PIZZI09.ogg', K + 'jingles_PIZZI05.ogg'],
  'win':   [K + 'jingles_STEEL10.ogg', K + 'jingles_PIZZI02.ogg'],
  'lose':  [K + 'jingles_PIZZI11.ogg', K + 'jingles_PIZZI14.ogg'],
}
os.makedirs(OUT, exist_ok=True)
for f in glob.glob(os.path.join(OUT, '*.mp3')): os.remove(f)
counts = {}
for name, files in S.items():
    for i, f in enumerate(files): save('%s-%d' % (name, i + 1), load(f), maxlen=0.9 if name in ('whoosh', 'flip', 'deal', 'roll') else None)
    counts[name] = len(files)
# Layered sounds
for i, (m1, m2, k) in enumerate([('impactMetal_light_003', 'impactMetal_heavy_001', 'knifeSlice2'), ('impactMetal_light_000', 'impactMetal_medium_003', 'knifeSlice')]):
    save('clash-%d' % (i + 1), mix((load(I + m1 + '.ogg'), 0, 1), (load(I + m2 + '.ogg'), 0.004, 0.7), (trim(load(R + k + '.ogg')), 0.0, 0.45)))
counts['clash'] = 2
for i, base in enumerate(['impactGlass_light_001', 'impactGlass_light_003']):
    g = load(I + base + '.ogg')
    save('sparkle-%d' % (i + 1), mix((pitch(g, 1.6), 0, .8), (pitch(g, 2.0), 0.07, .7), (pitch(g, 2.5), 0.14, .65), (trim(load(U + 'glass_004.ogg')), 0.05, .25)), fade=0.12)
counts['sparkle'] = 2
for i, (p, s) in enumerate([('impactPunch_heavy_002', 'impactSoft_heavy_003'), ('impactPunch_heavy_000', 'impactSoft_heavy_001')]):
    save('boom-%d' % (i + 1), mix((lowpass(load(I + p + '.ogg'), 2500), 0, .8), (load(I + s + '.ogg'), 0, 1), (pitch(load(I + s + '.ogg'), .7), .02, .5)), fade=0.1)
counts['boom'] = 2
for i, d in enumerate(['drop_003', 'drop_002']):
    save('splash-%d' % (i + 1), mix((trim(load(R + 'dropLeather.ogg')), 0, 1), (load(I + 'impactSoft_medium_00%d.ogg' % i), 0, .5), (pitch(load(U + d + '.ogg'), 1.25), 0.05, .35)))
counts['splash'] = 2
print(counts)
open(os.path.join(OUT, 'LICENSE.txt'), 'w').write('Game sounds built from Kenney (kenney.nl) audio packs: Casino Audio, Impact Sounds,\nRPG Audio, Interface Sounds, UI Audio, Music Jingles. License: CC0 1.0 (public domain).\nBuilt by scripts/build-sounds.py.\n')
