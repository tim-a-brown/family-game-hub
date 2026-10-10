#!/usr/bin/env python3
"""Renders the six Pinball table music beds as seamless loops.

    python3 sounds/pinball/make-music.py      (needs numpy, scipy and ffmpeg)

Everything is synthesised here from scratch (no samples, no General MIDI):
detuned "supersaw" and noise pads through slow filters, Karplus-Strong
plucked strings, modal (physically modelled) marimba and music box, a breathy
flute, percussion from filtered noise with swing, chorus, soft saturation and
a generated convolution reverb. Every note tail and the reverb wrap round the
loop end, so each file loops with no seam. Output: <table>.mp3 (32 kHz mono,
64 kbps) next to this script, plus loops.json with each loop's exact length.
"""
import json, os, subprocess
import numpy as np
from scipy import signal

SR = 32000
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(7)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


class Track:
    def __init__(self, seconds):
        self.n = int(round(seconds * SR))
        self.buses = {}

    def bus(self, name):
        if name not in self.buses:
            self.buses[name] = np.zeros(self.n)
        return self.buses[name]

    def add(self, name, x, t):
        """Add x starting at time t, wrapping anything past the loop end to the start."""
        b = self.bus(name)
        i = int(round(t * SR)) % self.n
        while len(x):
            k = min(len(x), self.n - i)
            b[i:i + k] += x[:k]
            x = x[k:]
            i = 0


def circ(gen, n, fade=0.6):
    """A continuous sound made loopable: render a bit past the end and crossfade that overhang into the start."""
    m = int(fade * SR)
    x = gen(n + m)
    y = x[:n].copy()
    w = np.linspace(0, 1, m)
    y[:m] = x[:m] * w + x[n:n + m] * (1 - w)
    return y


# ── building blocks ──────────────────────────────────────────────────────────
def env(n, a, r, sustain=1.0):
    """Attack/release envelope over n samples (a, r in seconds)."""
    e = np.full(n, sustain)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        e[:na] = np.linspace(0, sustain, na) ** 1.5
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** 2
    return e


def lowpass(x, fc, q=0.707):
    b, a = signal.butter(2, min(fc, SR * 0.45) / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def bandpass(x, f, q):
    b, a = signal.iirpeak(min(f, SR * 0.45) / (SR / 2), q)
    return signal.lfilter(b, a, x)


def highpass(x, fc):
    b, a = signal.butter(2, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def sweep_lowpass(x, f0, f1, steps=24):
    """Lowpass whose cutoff glides f0 -> f1 across x (block-wise, smooth enough for pads)."""
    out = np.zeros_like(x)
    edges = np.linspace(0, len(x), steps + 1).astype(int)
    zi = None
    for k in range(steps):
        fc = f0 * (f1 / f0) ** (k / max(1, steps - 1))
        b, a = signal.butter(2, min(fc, SR * 0.45) / (SR / 2), 'low')
        if zi is None:
            zi = signal.lfilter_zi(b, a) * 0
        out[edges[k]:edges[k + 1]], zi = signal.lfilter(b, a, x[edges[k]:edges[k + 1]], zi=zi)
    return out


def saw(f, n, phase=None):
    t = np.arange(n) / SR
    p = rng.random() if phase is None else phase
    return 2 * ((f * t + p) % 1.0) - 1


def supersaw(f, dur, voices=7, detune_cents=14):
    n = int(dur * SR)
    out = np.zeros(n)
    for v in range(voices):
        c = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune_cents
        out += saw(f * 2 ** (c / 1200), n)
    return out / voices


def pad(notes, dur, cutoff=(500, 1100), a=2.0, r=2.5, voices=7):
    x = sum(supersaw(mtof(m), dur, voices) for m in notes) / len(notes)
    x = sweep_lowpass(x, cutoff[0], cutoff[1])
    return x * env(len(x), a, r)


def noise_pad(f, dur, q=6, a=2.0, r=2.5):
    n = int(dur * SR)
    x = bandpass(rng.standard_normal(n), f, q) * 0.25
    return x * env(n, a, r)


def pluck(f, dur, bright=0.5, decay=0.996):
    """Karplus-Strong string: a noise burst circulating in a damped delay line."""
    n = int(dur * SR)
    N = max(2, int(round(SR / f)))
    burst = rng.uniform(-1, 1, N)
    burst = lowpass(burst, 1200 + bright * 6000)
    x = np.zeros(n)
    x[:N] = burst
    a = np.zeros(N + 2)
    a[0] = 1
    a[N] = -decay * 0.5
    a[N + 1] = -decay * 0.5
    y = signal.lfilter([1.0], a, x)
    return y * env(n, 0.002, min(0.3, dur * 0.3))


def modal(f, dur, ratios, decays, amps, strike=0.003, click=0.2):
    """A struck bar or comb: a few inharmonic partials, each ringing down at its own rate."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for r, d, a in zip(ratios, decays, amps):
        if f * r < SR * 0.45:
            x += a * np.sin(2 * np.pi * f * r * t + rng.random() * 6.28) * np.exp(-t / d)
    hit = bandpass(rng.standard_normal(n), min(f * 4, 9000), 2) * np.exp(-t / strike) * click
    return (x + hit) * env(n, 0.001, 0.05)


def marimba(f, dur=1.2):
    return modal(f, dur, [1, 3.93, 9.24], [0.55, 0.16, 0.05], [1, 0.32, 0.1], 0.004, 0.25)


def music_box(f, dur=3.0):
    return modal(f, dur, [1, 2.76, 5.4, 8.93], [1.8, 0.7, 0.3, 0.12], [1, 0.4, 0.18, 0.08], 0.002, 0.15)


def flute(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t / 0.4, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    tone = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
    breath = bandpass(rng.standard_normal(n), f, 3) * 0.35 + highpass(rng.standard_normal(n), 3000) * 0.02
    return (tone + breath) * env(n, 0.09, 0.25) * 0.5


def reed(notes, dur):
    """Concertina-ish: a pair of slightly mistuned saws per note, nasal formant, bellows tremolo."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = sum(saw(mtof(m), n) + saw(mtof(m) * 1.004, n) for m in notes) / (2 * len(notes))
    x = bandpass(x, 1100, 1.2) * 0.6 + lowpass(x, 900) * 0.6
    return x * (1 + 0.12 * np.sin(2 * np.pi * 4.3 * t)) * env(n, 0.12, 0.3)


def drum(f0, f1, dur, noise_amt=0.3, nf=400):
    """Hand drum / kick: a pitch-dropping thump with a little skin noise."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur * 0.35))
    skin = bandpass(rng.standard_normal(n), nf, 1.5) * np.exp(-t / 0.02) * noise_amt
    return body + skin


def shaker(dur=0.09, f=7000):
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = np.minimum(t / 0.012, 1) * np.exp(-t / 0.03)
    return highpass(rng.standard_normal(n), f) * e * 0.5


def snare(dur=0.3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return bandpass(rng.standard_normal(n), 1800, 0.8) * np.exp(-t / 0.07) * 0.8 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04) * 0.5


def chorus(x, depth=0.004, rate=0.6, base=0.012, mix=0.5):
    n = len(x)
    t = np.arange(n)
    out = x.copy()
    for k, ph in enumerate((0, 2.1)):
        d = (base + depth * np.sin(2 * np.pi * rate * t / SR + ph)) * SR
        out += mix * np.interp((t - d) % n, t, x)   # circular: stays seamless
    return out / (1 + mix)


def reverb(x, decay=3.0, predelay=0.02, damp=6000, wet=0.35):
    """Convolution reverb with a generated impulse (decaying, darkening noise), applied circularly."""
    n_ir = int(min(len(x) - 1, decay * 1.6 * SR))
    t = np.arange(n_ir) / SR
    ir = rng.standard_normal(n_ir) * np.exp(-t * 6.9 / decay)
    ir = lowpass(ir, damp) + lowpass(ir, damp * 0.4) * 0.6
    pd = int(predelay * SR)
    ir = np.concatenate([np.zeros(pd), ir])[:n_ir]
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    h = np.zeros(len(x))
    h[:len(ir)] = ir
    y = np.real(np.fft.ifft(np.fft.fft(x) * np.fft.fft(h)))   # circular convolution wraps the tail
    return x * (1 - wet) + y * wet * 2.2


def soft(x, drive=1.4):
    return np.tanh(x * drive) / np.tanh(drive)


def master(tr, mix):
    out = np.zeros(tr.n)
    for name, (gain, fx) in mix.items():
        pass
    for name, (gain, fx) in mix.items():
        if name in tr.buses:
            b = tr.buses[name]
            for f in fx:
                b = f(b)
            out += b * gain
    # gentle high-pass (phone speakers cannot play deep bass anyway), made seamless by filtering three copies
    out = highpass(np.tile(out, 3), 60)[tr.n:2 * tr.n]
    out = soft(out / (np.max(np.abs(out)) + 1e-9) * 0.9, 1.2)
    rms = np.sqrt(np.mean(out ** 2))
    out *= min(0.95 / (np.max(np.abs(out)) + 1e-9), 0.18 / (rms + 1e-9))   # about -15 dBFS RMS, peaks below 0 dB
    return out


# ── the five tables ──────────────────────────────────────────────────────────
def nebula():
    # spacey ambient: slow evolving supersaw/noise pads in D, sub drone, distant glassy sparkles
    beat = 8.0
    tr = Track(beat * 4)
    chords = [[38, 45, 52, 54, 61], [35, 42, 50, 54, 57], [31, 38, 47, 50, 54], [33, 40, 49, 52, 57]]
    for i, ch in enumerate(chords):
        tr.add('pad', pad(ch, beat + 3, (350, 1300) if i % 2 == 0 else (1300, 450), 2.5, 3.0), i * beat - 1.0)
        tr.add('air', noise_pad(mtof(ch[-1] + 12), beat + 3, 9, 3, 3), i * beat - 1.0)
    t = np.arange(tr.n) / SR
    fsub = round(mtof(38) * tr.n / SR) / (tr.n / SR)   # whole cycles per loop
    tr.bus('sub')[:] += 0.35 * np.sin(2 * np.pi * fsub * t) * (0.7 + 0.3 * np.sin(2 * np.pi * t / (beat * 4)))
    for k, (when, m) in enumerate([(1.5, 74), (5.2, 81), (9.0, 78), (13.7, 85), (17.4, 76), (21.1, 83), (25.6, 81), (29.2, 88)]):
        tr.add('glass', music_box(mtof(m), 4.0) * 0.5, when)
    return tr, {'pad': (1.0, [lambda x: chorus(x, 0.005, 0.25), lambda x: reverb(x, 6.0, 0.04, 5000, 0.55)]),
                'air': (0.6, [lambda x: reverb(x, 6.0, 0.05, 4000, 0.6)]),
                'sub': (0.5, []),
                'glass': (0.55, [lambda x: reverb(x, 7.0, 0.08, 7000, 0.75)])}


def pirate():
    # gentle sea-shanty in D minor, 6/8: plucked guitar, concertina chords, a breathy flute, soft bodhran, the sea
    e8 = 0.32                      # one eighth note
    bar = 6 * e8
    tr = Track(bar * 16)
    prog = ['Dm', 'Dm', 'C', 'C', 'Dm', 'Dm', 'Am', 'Am', 'F', 'F', 'C', 'C', 'Dm', 'Am', 'Dm', 'Dm']
    ch = {'Dm': [50, 53, 57], 'C': [48, 52, 55], 'Am': [45, 48, 52], 'F': [41, 45, 48]}
    for b, name in enumerate(prog):
        notes = ch[name]
        t0 = b * bar
        for k, m in enumerate([notes[0] - 12, notes[1], notes[2], notes[0], notes[2], notes[1]]):
            sw = 0.012 if k % 2 else 0
            tr.add('gtr', pluck(mtof(m), 1.6, 0.35) * (0.9 if k in (0, 3) else 0.6), t0 + k * e8 + sw)
        tr.add('reed', reed([n + 12 for n in notes], bar - 0.05) * 0.5, t0)
        tr.add('drum', drum(110, 70, 0.5, 0.25, 300) * 0.8, t0)
        tr.add('drum', drum(130, 80, 0.4, 0.2, 400) * 0.45, t0 + 3 * e8)
    melody = [(0, 62, 2), (2, 65, 1), (3, 69, 2), (5, 67, 1), (6, 65, 3), (9, 64, 3), (12, 62, 2), (14, 60, 1), (15, 62, 3),
              (48, 69, 2), (50, 72, 1), (51, 70, 2), (53, 69, 1), (54, 67, 3), (57, 65, 3), (60, 64, 2), (62, 65, 1), (63, 62, 3),
              (72, 62, 2), (74, 65, 1), (75, 69, 3), (78, 67, 3), (84, 65, 2), (86, 64, 1), (87, 62, 5)]
    for when, m, d in melody:
        tr.add('flute', flute(mtof(m), d * e8 + 0.1), when * e8)
    t = np.arange(tr.n) / SR
    sea = circ(lambda n: highpass(lowpass(rng.standard_normal(n), 700), 120), tr.n) * (0.5 + 0.5 * np.sin(2 * np.pi * t / (bar * 4))) ** 2
    tr.bus('sea')[:] += sea
    return tr, {'gtr': (0.9, [lambda x: reverb(x, 1.8, 0.02, 6000, 0.25)]),
                'reed': (0.45, [lambda x: chorus(x, 0.002, 0.8), lambda x: reverb(x, 2.2, 0.03, 5000, 0.3)]),
                'flute': (0.55, [lambda x: reverb(x, 2.5, 0.03, 7000, 0.35)]),
                'drum': (0.7, [lambda x: reverb(x, 1.5, 0.01, 3000, 0.2)]),
                'sea': (0.25, [])}


def haunted():
    # dark ambient: a low beating drone, a slow string swell, and a sparse, slightly out-of-tune music box
    tr = Track(40.0)
    t = np.arange(tr.n) / SR
    drone = circ(lambda n: highpass(sum(lowpass(saw(mtof(m) * (1 + d), n), 420) for m, d in [(38, 0), (38, 0.003), (45, 0), (51, 0.002)]), 70), tr.n)
    tr.bus('drone')[:] += drone * (0.6 + 0.4 * np.sin(2 * np.pi * t / 40.0) ** 2)
    for when, notes in [(2.0, [50, 51]), (18.0, [53, 54]), (30.0, [49, 50])]:
        tr.add('strings', pad(notes, 12.0, (300, 900), 4.0, 5.0, 9), when)
    box = [(0.0, 74), (1.2, 77), (2.4, 76), (3.6, 72), (5.4, 70), (7.2, 69),
           (20.0, 74), (21.2, 81), (22.4, 77), (23.6, 76), (25.4, 73), (28.0, 74)]
    for when, m in box:
        tr.add('box', music_box(mtof(m) * (1 + rng.uniform(-0.006, 0.006)), 3.5) * 0.6, when)
    for when in (11.0, 33.0):
        tr.add('air', noise_pad(420, 7.0, 4, 2.5, 3.5) * 0.8, when)
    return tr, {'drone': (0.35, [lambda x: reverb(x, 5.0, 0.02, 2000, 0.4)]),
                'strings': (0.9, [lambda x: chorus(x, 0.006, 0.18), lambda x: reverb(x, 6.0, 0.05, 4000, 0.55)]),
                'box': (0.8, [lambda x: reverb(x, 6.5, 0.06, 6000, 0.7)]),
                'air': (0.4, [lambda x: reverb(x, 5.0, 0.05, 3000, 0.5)])}


def jungle():
    # hand percussion (congas, shaker) with swing, a marimba ostinato in A minor pentatonic, a breathy flute
    s16 = 60 / 104 / 4
    bar = 16 * s16
    tr = Track(bar * 12)
    pent = [57, 60, 62, 64, 67, 69, 72]
    ost = [0, 2, 4, 2, 5, 4, 2, 1]
    for b in range(12):
        t0 = b * bar
        shift = [0, 0, -2, 1][b % 4]
        for k in range(16):
            sw = 0.022 if k % 2 else 0
            tr.add('shaker', shaker() * (0.9 if k % 4 == 2 else 0.5), t0 + k * s16 + sw)
        for k, (f0, f1, amp) in {0: (240, 180, 1.0), 3: (330, 260, 0.6), 6: (240, 180, 0.7), 8: (200, 150, 0.9), 10: (330, 260, 0.6), 11: (330, 260, 0.45), 14: (240, 180, 0.7)}.items():
            tr.add('perc', drum(f0, f1, 0.35, 0.5, 900) * amp, t0 + k * s16 + (0.022 if k % 2 else 0))
        tr.add('perc', drum(90, 55, 0.6, 0.15, 200) * 0.9, t0)
        for k in range(8):
            m = pent[(ost[k] + shift) % len(pent)]
            tr.add('marimba', marimba(mtof(m), 1.0) * (0.8 if k % 2 == 0 else 0.55), t0 + k * 2 * s16 + (0.022 if k % 2 else 0))
    for when, m, d in [(4 * bar, 76, 6), (4 * bar + 7 * s16, 74, 2), (4 * bar + 9 * s16, 72, 7), (6 * bar, 69, 10),
                       (8 * bar + 2 * s16, 72, 4), (8 * bar + 6 * s16, 74, 4), (8 * bar + 10 * s16, 76, 6), (9 * bar + 2 * s16, 79, 4), (9 * bar + 6 * s16, 76, 12)]:
        tr.add('flute', flute(mtof(m), d * s16 + 0.1), when)
    return tr, {'shaker': (0.35, [lambda x: reverb(x, 1.2, 0.01, 8000, 0.2)]),
                'perc': (0.8, [lambda x: reverb(x, 1.6, 0.015, 4000, 0.25)]),
                'marimba': (0.75, [lambda x: reverb(x, 2.0, 0.02, 6000, 0.3)]),
                'flute': (0.5, [lambda x: reverb(x, 2.8, 0.04, 7000, 0.4)])}


def neon():
    # mellow synthwave: filtered supersaw chords with a gentle sidechain pump, warm saw bass, soft drums, a plucked arp
    beat = 60 / 86
    bar = 4 * beat
    tr = Track(bar * 8)
    prog = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]]
    bass = [45, 41, 36, 43]
    for b in range(8):
        t0 = b * bar
        ch = prog[b % 4]
        tr.add('chords', pad(ch, bar + 0.4, (700, 1500) if b % 2 else (1500, 800), 0.25, 0.6, 7), t0)
        for k in range(8):
            m = bass[b % 4] - (12 if k % 2 == 0 else 0)
            n = int(beat / 2 * SR)
            x = lowpass(saw(mtof(m), n), 420) * env(n, 0.005, 0.12)
            tr.add('bass', x, t0 + k * beat / 2)
        for k in range(4):
            tr.add('drums', drum(150, 45, 0.45, 0.05, 200) * (1.0 if k % 2 == 0 else 0.7), t0 + k * beat)
            if k % 2 == 1:
                tr.add('snare', snare() * 0.7, t0 + k * beat)
        for k in range(8):
            tr.add('drums', shaker(0.05, 8000) * (0.45 if k % 2 else 0.25), t0 + k * beat / 2 + (0.03 if k % 2 else 0))
        arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12]
        for k in range(8):
            tr.add('arp', pluck(mtof(arp[k % 4]), 0.6, 0.8, 0.993) * 0.5, t0 + k * beat / 2 + beat / 4)
    # sidechain pump on the chords, locked to the beat
    t = np.arange(tr.n) / SR
    pump = 1 - 0.45 * np.exp(-((t % beat) / 0.12))
    tr.buses['chords'] = tr.buses['chords'] * pump
    return tr, {'chords': (0.8, [lambda x: chorus(x, 0.004, 0.5), lambda x: reverb(x, 3.0, 0.03, 6000, 0.4)]),
                'bass': (0.45, [soft, lambda x: highpass(x, 55)]),
                'drums': (0.45, [lambda x: reverb(x, 0.9, 0.01, 5000, 0.15)]),
                'snare': (0.45, [lambda x: reverb(x, 2.4, 0.02, 5000, 0.5)]),
                'arp': (0.4, [lambda x: reverb(x, 3.0, 0.08, 7000, 0.5)])}


def midway():
    # a quiet steam-calliope waltz in F (3/4 at 72 bpm): layered detuned pipes with a breathy chiff, an oom-pah-pah
    # of bass pipe and chord pipes, a sparse glockenspiel answer, all in a big tent with a long reverb
    beat = 60 / 72
    bar = 3 * beat
    tr = Track(bar * 16)

    def pipe(f, dur, vol=1.0, bright=1.0):
        """Calliope whistle: a steam-blown pipe. Two mistuned voices of odd-and-even partials, slow vibrato, breath noise."""
        n = int(dur * SR)
        t = np.arange(n) / SR
        out = np.zeros(n)
        for cents in (-7, 7):
            ff = f * 2 ** (cents / 1200)
            vib = 1 + 0.004 * np.sin(2 * np.pi * 5.4 * t + rng.random() * 6) * np.clip(t / 0.25, 0, 1)
            ph = 2 * np.pi * np.cumsum(ff * vib) / SR
            for k, a in ((1, 1.0), (2, 0.5), (3, 0.42 * bright), (4, 0.2 * bright), (5, 0.12 * bright), (6, 0.06 * bright)):
                if ff * k < SR * 0.45:
                    out += a * np.sin(k * ph + rng.random() * 6)
        out /= 2.3
        breath = bandpass(rng.standard_normal(n), min(f * 3, 6000), 2.5) * 0.08 + bandpass(rng.standard_normal(n), min(f * 1.0, 3000), 8) * 0.05
        chiff = bandpass(rng.standard_normal(n), min(f * 4, 8000), 1.5) * np.exp(-t / 0.025) * 0.5
        e = env(n, 0.035, 0.18)
        return (out * e + breath * e + chiff) * vol * 0.5

    chords = {'F': ([65, 69, 72], 41), 'C': ([64, 67, 70, 72], 48), 'Bb': ([62, 65, 70], 46), 'Gm': ([62, 67, 70], 43)}
    prog = ['F', 'C', 'Bb', 'F', 'F', 'C', 'Bb', 'F', 'F', 'Gm', 'C', 'F', 'F', 'Bb', 'C', 'F']
    for b, name in enumerate(prog):
        notes, bass = chords[name]
        t0 = b * bar
        tr.add('bass', pipe(mtof(bass), beat * 0.9, 0.9, 0.5), t0)
        tr.add('bass', pipe(mtof(bass + 12), beat * 0.9, 0.35, 0.5), t0 + 0.01)
        for k in (1, 2):
            for i, m in enumerate(notes):
                tr.add('chords', pipe(mtof(m), beat * 0.55, 0.42 / len(notes) ** 0.5, 0.8), t0 + k * beat + 0.012 * i)
    # the tune, in quarter and half notes (bar, beat, midi, beats)
    melody = [(0, 0, 72, 1), (0, 1, 69, 1), (0, 2, 65, 1), (1, 0, 67, 2), (1, 2, 69, 1), (2, 0, 70, 1), (2, 1, 69, 1), (2, 2, 67, 1), (3, 0, 65, 3),
              (4, 0, 72, 1), (4, 1, 74, 1), (4, 2, 76, 1), (5, 0, 77, 2), (5, 2, 76, 1), (6, 0, 74, 1), (6, 1, 72, 1), (6, 2, 70, 1), (7, 0, 69, 3),
              (8, 0, 69, 1), (8, 1, 70, 1), (8, 2, 72, 1), (9, 0, 74, 2), (9, 2, 72, 1), (10, 0, 70, 1), (10, 1, 69, 1), (10, 2, 67, 1), (11, 0, 72, 3),
              (12, 0, 72, 1), (12, 1, 69, 1), (12, 2, 65, 1), (13, 0, 67, 2), (13, 2, 70, 1), (14, 0, 69, 1), (14, 1, 67, 1), (14, 2, 64, 1), (15, 0, 65, 3)]
    for b, k, m, d in melody:
        when = b * bar + k * beat
        tr.add('lead', pipe(mtof(m + 12), d * beat * 0.92, 0.75, 1.0), when)
        tr.add('lead', pipe(mtof(m), d * beat * 0.92, 0.3, 0.7), when + 0.008)
    # a glockenspiel answers the ends of phrases
    for b, k, m in [(3, 1, 84), (3, 2, 81), (7, 1, 88), (7, 2, 84), (11, 1, 86), (11, 2, 84), (15, 1, 84), (15, 1.5, 81), (15, 2, 77)]:
        tr.add('glock', music_box(mtof(m), 2.2) * 0.5, b * bar + k * beat)
    return tr, {'lead': (0.8, [lambda x: chorus(x, 0.003, 0.35, 0.011, 0.4), lambda x: reverb(x, 2.4, 0.03, 5500, 0.42)]),
                'chords': (0.55, [lambda x: chorus(x, 0.003, 0.3), lambda x: reverb(x, 2.4, 0.03, 4500, 0.45)]),
                'bass': (0.6, [lambda x: reverb(x, 1.8, 0.02, 2500, 0.3)]),
                'glock': (0.35, [lambda x: reverb(x, 3.5, 0.05, 7000, 0.6)])}


def main():
    # python3 make-music.py [table ...]: render only those tables (default: all), merging their lengths into loops.json
    import sys
    tables = [('nebula', nebula), ('pirate', pirate), ('haunted', haunted), ('jungle', jungle), ('neon', neon), ('midway', midway)]
    want = sys.argv[1:]
    loops = {}
    lp = os.path.join(HERE, 'loops.json')
    if want and os.path.exists(lp):
        with open(lp) as f:
            loops = json.load(f).get('samples', {})
    for name, fn in tables:
        if want and name not in want:
            continue
        tr, mix = fn()
        out = master(tr, mix)
        wav = os.path.join(HERE, name + '.wav')
        from scipy.io import wavfile
        wavfile.write(wav, SR, (out * 32767).astype(np.int16))
        mp3 = os.path.join(HERE, name + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '64k', mp3], check=True)
        os.remove(wav)
        loops[name] = tr.n
        print(name, '%.2f s' % (tr.n / SR), os.path.getsize(mp3) // 1024, 'KB', 'rms %.3f' % np.sqrt(np.mean(out ** 2)))
    with open(os.path.join(HERE, 'loops.json'), 'w') as f:
        json.dump({'rate': SR, 'samples': loops}, f)


if __name__ == '__main__':
    main()
