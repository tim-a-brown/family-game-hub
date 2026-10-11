#!/usr/bin/env python3
"""Renders the six Pinball table music beds as seamless loops.

    python3 sounds/pinball/make-music.py      (needs numpy, scipy and ffmpeg)

Everything is synthesised here from scratch (no samples, no General MIDI):
detuned "supersaw" and noise pads through slow filters, Karplus-Strong
plucked strings, modal (physically modelled) marimba and music box, a breathy
flute, an additive fairground band organ, a multi-rank church/theatre pipe
organ, FM bells, a theremin-like glide, brass tuba, slide whistle,
percussion from filtered noise and metallic oscillators, chorus, soft saturation and
a generated convolution reverb. Every note tail and the reverb wrap round the
loop end, so each file loops with no seam. Output: <table>.mp3 (32 kHz mono,
64 kbps, the loop plus PAD samples of wrap-around either side) next to this
script, plus loops.json with each loop's exact length, the PAD, and where in the
loop the player starts and wraps ('start', in samples: the quietest moment,
chosen by wrap_point so the join is inaudible).
"""
import json, os, subprocess
import numpy as np
from scipy import signal

SR = 32000
HERE = os.path.dirname(os.path.abspath(__file__))
# Each mp3 holds its loop with PAD samples of the loop's own tail before it and its own head after it. The player
# (games/pinball/audio.js, MUSIC_PAD) loops a window that starts PAD/2 into the file, so the loop points sit inside
# continuous audio, clear of the MP3 encoder's start-up and end padding and the browser resampler's edges, whether or
# not the browser trims the encoder delay.
PAD = 2048
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
        """Add x starting at time t, wrapping anything past the loop end to the start. Every note gets a 1 ms
        fade-in and a 3 ms fade-out here, so no note can start or stop on a non-zero sample (a click)."""
        b = self.bus(name)
        x = np.array(x, float)
        fi, fo = min(len(x) // 4, int(0.001 * SR)), min(len(x) // 4, int(0.003 * SR))
        if fi:
            x[:fi] *= np.linspace(0, 1, fi)
        if fo:
            x[-fo:] *= np.linspace(1, 0, fo)
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


def circ_fx(fn):
    """Apply a bus effect (IIR filter, saturation) seamlessly: run it over three copies and keep the middle one."""
    return lambda x: fn(np.tile(x, 3))[len(x):2 * len(x)]


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


def sweep_lowpass(x, f0, f1, steps=None):
    """Lowpass whose cutoff glides f0 -> f1 across x (block-wise, in small enough steps that it cannot zipper)."""
    steps = steps or max(24, len(x) // 512)
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
    return (body + skin) * env(n, 0, dur * 0.3)   # fade the tail out rather than cutting it off


def shaker(dur=0.09, f=7000):
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = np.minimum(t / 0.012, 1) * np.exp(-t / 0.03) * env(n, 0, dur * 0.4)
    return highpass(rng.standard_normal(n), f) * e * 0.5


def snare(dur=0.3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = bandpass(rng.standard_normal(n), 1800, 0.8) * np.exp(-t / 0.07) * 0.8 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04) * 0.5
    return x * env(n, 0, dur * 0.3)


def chorus(x, depth=0.004, rate=0.6, base=0.012, mix=0.5):
    n = len(x)
    t = np.arange(n)
    rate = max(1, round(rate * n / SR)) / (n / SR)   # a whole number of LFO cycles per loop, so the seam cannot jump
    out = x.copy()
    for k, ph in enumerate((0, 2.1)):
        d = (base + depth * np.sin(2 * np.pi * rate * t / SR + ph)) * SR
        out += mix * np.interp((t - d) % n, t, x, period=n)   # circular: stays seamless
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
    out *= min(0.95 / (np.max(np.abs(out)) + 1e-9), getattr(tr, 'rms', 0.18) / (rms + 1e-9))   # about -15 dBFS RMS, peaks below 0 dB
    return out


# ── the five tables ──────────────────────────────────────────────────────────
def nebula():
    # deep space, kept apart from both the haunted organ and the Neon synthwave (no supersaw, no saw bass, no beat):
    # a drone of sine partials whose upper harmonics shimmer in and out, a slow sub throb, glassy FM-bell pings in a
    # floating 3+3+4+3+3 pattern with long echoes, radar blips, and a theremin-like gliding lead, in D lydian
    beat = 8.0
    tr = Track(beat * 4)
    chords = [[38, 45, 52, 54, 61], [35, 42, 50, 54, 57], [31, 38, 47, 50, 54], [33, 40, 49, 52, 57]]
    for i, ch in enumerate(chords):
        for m in ch[1:]:
            tr.add('drone', shimmer(mtof(m + 12), beat + 3, 2.5, 3.0) / len(ch) ** 0.5, i * beat - 1.0)
        tr.add('air', noise_pad(mtof(ch[-1] + 12), beat + 3, 9, 3, 3), i * beat - 1.0)
    t = np.arange(tr.n) / SR
    fsub = round(mtof(38) * tr.n / SR) / (tr.n / SR)   # whole cycles per loop
    throb = 0.55 + 0.45 * np.cos(2 * np.pi * t / 2.0) ** 2   # a slow throb, 16 per loop
    tr.bus('sub')[:] += 0.35 * np.sin(2 * np.pi * fsub * t) * throb
    step = 0.25
    for i, ch in enumerate(chords):
        pcs = {m % 12 for m in ch}
        notes = [m for m in range(69, 110) if m % 12 in pcs][:7]
        for half in range(2):
            for j, (k, idx) in enumerate(zip((0, 3, 6, 10, 13), ((0, 2, 4, 3, 6), (1, 4, 2, 5, 3))[half])):
                when = i * beat + half * 4.0 + k * step
                tr.add('ping', fm_ping(mtof(notes[idx]), 1.8) * (1.0 if j == 0 else 0.7), when)
        tr.add('radar', radar_blip(), i * beat + 5.5)
    lead = [(8.4, [(0, 81), (1.6, 78), (2.6, 83), (4.2, 81)], 6.4),
            (24.4, [(0, 76), (1.2, 81), (2.5, 85), (4.0, 83), (5.0, 81)], 6.6)]
    for when, pts, dur in lead:
        tr.add('lead', theremin(pts, dur), when)
    echo = lambda x: sum(0.55 ** j * np.roll(x, int(j * 0.75 * SR)) for j in range(6))   # circular: seamless
    return tr, {'drone': (0.75, [lambda x: chorus(x, 0.004, 0.25),   # 0.25 Hz: whole LFO cycles per loop, so no seam
                                  lambda x: reverb(x, 6.0, 0.04, 6000, 0.5)]),
                'air': (0.4, [lambda x: reverb(x, 6.0, 0.05, 4000, 0.6)]),
                'sub': (0.5, []),
                'ping': (0.55, [echo, lambda x: reverb(x, 4.0, 0.04, 8000, 0.4)]),
                'radar': (0.16, [echo, lambda x: reverb(x, 3.0, 0.03, 8000, 0.4)]),
                'lead': (0.4, [lambda x: reverb(x, 5.0, 0.06, 6000, 0.45)])}


def shimmer(f, dur, a, r):
    """Space drone voice: sine partials (fundamental plus 2nd-8th harmonics), each slightly detuned and fading in and
    out on its own slow cycle, so the top of the sound glitters without any saw buzz."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for k, amp in ((1, 1.0), (2, 0.35), (3, 0.22), (4, 0.14), (5, 0.1), (6, 0.08), (8, 0.06)):
        if f * k < SR * 0.45:
            lfo = 0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(0.07, 0.35) * t + rng.random() * 6) if k > 1 else 1
            x += amp * lfo * np.sin(2 * np.pi * f * k * (1 + rng.uniform(-0.0015, 0.0015)) * t + rng.random() * 6)
    return x * env(n, a, r) * 0.6


def fm_ping(f, dur=1.8, ratio=1.41, index=2.6):
    """Glassy FM bell: a sine phase-modulated by an inharmonic partner whose depth dies away quickly."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    idx = index * np.exp(-t / 0.12) + 0.25
    return np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t / 0.45) * env(n, 0.002, 0.1)


def radar_blip():
    """Sonar/radar: two short rising sine chirps."""
    out = np.zeros(int(0.6 * SR))
    for k, (start, a) in enumerate(((0.0, 1.0), (0.22, 0.6))):
        n = int(0.09 * SR)
        t = np.arange(n) / SR
        f = 1500 * (1 + 0.35 * t / 0.09)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.004, 0.06) * a
        i = int(start * SR)
        out[i:i + n] += x
    return out


def theremin(pts, dur):
    """Theremin / ondes martenot: a near-sine voice gliding between pitches (portamento), with a wide slow vibrato."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    target = np.zeros(n)
    for when, m in pts:
        target[int(when * SR):] = m
    b, a = signal.butter(1, 4.0 / (SR / 2))   # about 0.1 s glide
    curve = signal.lfilter(b, a, target - target[0]) + target[0]
    f = mtof(curve) * (1 + 0.011 * np.sin(2 * np.pi * 5.3 * t) * np.clip(t / 0.6, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.12 * np.sin(2 * ph) + 0.04 * np.sin(3 * ph)) * env(n, 0.5, 1.2) * 0.5


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


ORGAN_SPECTRA = {'principal': [1, 0.45, 0.3, 0.2, 0.14, 0.1, 0.07, 0.05, 0.035, 0.025],   # open diapason
                 'flute': [1, 0.2, 0.08],
                 'bourdon': [1, 0, 0.28, 0, 0.1, 0, 0.04],                                 # stopped pipe: odd harmonics
                 'reed': [1 / k ** 0.75 for k in range(1, 25)]}                             # trumpet / bombarde


def pipe_organ(f, dur, ranks, a=0.5, r=0.5, trem=0.0):
    """Church / theatre pipe organ note. ranks = [(footage ratio to 8', rank kind, level), ...]: e.g. 0.5 is 16',
    1 is 8', 2 is 4', 3 and 4 a 2 2/3' + 2' mixture. Each rank is its own slightly mistuned pipe with its own
    spectrum, so the stops beat against each other like a real chest; a puff of chiff on the speech; a slow swell
    attack; an optional theatre-organ tremulant (wobbling wind: pitch and loudness)."""
    n = int((dur + r) * SR)
    t = np.arange(n) / SR
    wob = np.sin(2 * np.pi * 6.1 * t + rng.random() * 6)
    pm = 1 + 0.003 * trem * wob
    out = np.zeros(n)
    for ratio, kind, lvl in ranks:
        fr = f * ratio * 2 ** (rng.uniform(-2.5, 2.5) / 1200)
        ph = 2 * np.pi * np.cumsum(fr * pm) / SR
        for k, amp in enumerate(ORGAN_SPECTRA[kind], 1):
            if amp and fr * k < min(6500, SR * 0.45):
                out += lvl * amp * np.sin(k * ph + rng.random() * 6)
    chiff = bandpass(rng.standard_normal(n), min(f * 3, 6000), 3) * np.exp(-t / 0.04) * 0.15
    wind = bandpass(rng.standard_normal(n), min(f * 2, 4000), 6) * 0.015
    e = env(n, a, r)
    return (out * (1 + 0.18 * trem * wob) + wind) * e + chiff * (e > 0)


def haunted():
    # gothic pipe-organ piece in D minor (4/4, 72 bpm, 12 bars): a pedal line creeping down chromatically
    # (lament bass), slow-swelling full-organ chords through diminished and Neapolitan colours, a tremulant reed
    # solo that climbs to a climax, the old out-of-tune music box carrying the tune in the hushed first phrase,
    # and the low beating drone underneath, all in a cavernous chapel
    beat = 60 / 72
    bar = 4 * beat
    tr = Track(bar * 12)
    t = np.arange(tr.n) / SR
    drone = circ(lambda n: highpass(sum(lowpass(saw(mtof(m) * (1 + d), n), 420) for m, d in [(38, 0), (38, 0.003), (45, 0), (51, 0.002)]), 70), tr.n)
    tr.bus('drone')[:] += drone * (0.6 + 0.4 * np.sin(2 * np.pi * t / 40.0) ** 2)
    SOFT = [(0.5, 'bourdon', 0.7), (1, 'flute', 0.8), (1, 'principal', 0.3), (2, 'flute', 0.25)]
    MID = [(0.5, 'bourdon', 0.7), (1, 'principal', 0.9), (2, 'principal', 0.45), (1, 'reed', 0.25)]
    FULL = [(0.5, 'bourdon', 0.75), (1, 'principal', 1.0), (2, 'principal', 0.55), (3, 'principal', 0.22), (4, 'principal', 0.25), (1, 'reed', 0.5)]
    PEDAL = [(0.5, 'bourdon', 1.0), (1, 'principal', 0.6), (1, 'reed', 0.35)]
    SOLO = [(1, 'reed', 0.9), (1, 'principal', 0.5), (2, 'principal', 0.2)]
    # (pedal note, chord) per bar: Dm, Dm/C#, Dm/C, B half-dim | Bb, Gm/Bb, Eb (Neapolitan), A7b9 | C#dim7, Dm/F, Gm6, A7b9
    harm = [(38, [62, 65, 69]), (37, [62, 65, 69]), (36, [62, 65, 69]), (35, [62, 65, 69, 71]),
            (34, [62, 65, 70]), (34, [62, 67, 70]), (39, [63, 67, 70]), (33, [61, 64, 67, 70]),
            (37, [61, 64, 67, 70]), (41, [62, 65, 69]), (43, [62, 64, 67, 70]), (33, [61, 64, 67, 70])]
    for b, (ped, ch) in enumerate(harm):
        reg, lvl = (SOFT, 0.75) if b < 4 else (MID, 0.85) if b < 8 else (FULL, 1.0)
        for i, m in enumerate(ch):
            tr.add('organ', pipe_organ(mtof(m), bar + 0.15, reg, 0.9, 0.7) * lvl / len(ch) ** 0.5, b * bar + 0.02 * i)
        tr.add('organ', pipe_organ(mtof(ch[0] - 12), bar + 0.15, reg, 0.9, 0.7) * lvl * 0.5, b * bar)   # left hand doubles low
        tr.add('pedal', pipe_organ(mtof(ped), bar + 0.1, PEDAL, 0.35, 0.5) * (0.8 if b < 4 else 1.0), b * bar)
    # the tune (bar, beat, midi, beats): original
    tune = [(0, 0, 74, 2), (0, 2, 77, 1), (0, 3, 76, 1), (1, 0, 76, 3), (1, 3, 73, 1), (2, 0, 74, 2), (2, 2, 81, 2),
            (3, 0, 81, 1), (3, 1, 80, 1), (3, 2, 77, 2),
            (4, 0, 77, 2), (4, 2, 74, 1), (4, 3, 77, 1), (5, 0, 82, 3), (5, 3, 81, 1), (6, 0, 79, 2), (6, 2, 75, 2),
            (7, 0, 73, 2), (7, 2, 82, 1), (7, 3, 81, 1),
            (8, 0, 82, 2), (8, 2, 79, 1), (8, 3, 76, 1), (9, 0, 77, 2), (9, 2, 74, 2), (10, 0, 79, 1), (10, 1, 82, 1),
            (10, 2, 86, 2), (11, 0, 85, 2), (11, 2, 82, 1), (11, 3, 81, 1)]
    for b, k, m, d in tune:
        when = b * bar + k * beat
        if b < 4:   # hushed first phrase: the old music box, slightly out of tune
            tr.add('box', music_box(mtof(m + 12) * (1 + rng.uniform(-0.007, 0.007)), 3.5) * 0.6, when)
        else:
            tr.add('solo', pipe_organ(mtof(m), d * beat * 0.95, SOLO, 0.12, 0.35, 1.0), when)
            if b >= 8:
                tr.add('solo', pipe_organ(mtof(m - 12), d * beat * 0.95, SOLO, 0.12, 0.35, 1.0) * 0.45, when)
    for when, m in [(5 * bar + 2 * beat, 86), (6 * bar + 3 * beat, 87)]:   # a couple of stray music-box notes later on
        tr.add('box', music_box(mtof(m) * (1 + rng.uniform(-0.008, 0.008)), 3.5) * 0.4, when)
    chapel = lambda w: (lambda x: reverb(x, 4.5, 0.035, 4000, w))
    return tr, {'drone': (0.2, [lambda x: reverb(x, 5.0, 0.02, 2000, 0.4)]),
                'organ': (0.55, [chapel(0.42)]),
                'pedal': (0.5, [chapel(0.35)]),
                'solo': (0.42, [chapel(0.38)]),
                'box': (0.6, [lambda x: reverb(x, 6.5, 0.06, 6000, 0.65)])}


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
    ph = t % beat
    pump = 1 - 0.45 * np.exp(-ph / 0.12) * (1 - np.exp(-ph / 0.004))   # ducks in over ~10 ms: no gain step, no click
    tr.buses['chords'] = tr.buses['chords'] * pump
    return tr, {'chords': (0.8, [lambda x: chorus(x, 0.004, 0.5), lambda x: reverb(x, 3.0, 0.03, 6000, 0.4)]),
                'bass': (0.45, [soft, circ_fx(lambda x: highpass(x, 55))]),
                'drums': (0.45, [lambda x: reverb(x, 0.9, 0.01, 5000, 0.15)]),
                'snare': (0.45, [lambda x: reverb(x, 2.4, 0.02, 5000, 0.5)]),
                'arp': (0.4, [lambda x: reverb(x, 3.0, 0.08, 7000, 0.5)])}


def organ_pipe(f, dur, reed=1.0, flute=0.6, vol=1.0, punch=1.0):
    """Fairground band-organ note: a brassy reed (trumpet) rank, a band-limited narrow pulse through a
    horn formant, and a slightly sharp flute rank so the two beat gently. Punchy onset: the pipe speaks a
    touch flat and settles, with a short chiff of wind; the tone sags a little after the attack."""
    n = int((dur + 0.05) * SR)
    t = np.arange(n) / SR
    scoop = 1 - 0.012 * punch * np.exp(-t / 0.018)
    out = np.zeros(n)
    if reed:
        ph = 2 * np.pi * np.cumsum(f * scoop) / SR + rng.random() * 6
        x = np.zeros(n)
        for k in range(1, int(min(7000, SR * 0.45) / f) + 1):
            x += np.sin(np.pi * k * 0.28) / k * np.sin(k * ph)
        out += reed * (bandpass(x, 1700, 0.9) * 0.9 + lowpass(x, 2500) * 0.5)
    if flute:
        ph = 2 * np.pi * np.cumsum(f * 1.0025 * scoop) / SR + rng.random() * 6
        out += flute * 0.6 * (np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph))
    chiff = bandpass(rng.standard_normal(n), min(f * 3, 7000), 2) * np.exp(-t / 0.012) * 0.25 * punch
    e = env(n, 0.006, 0.04) * (0.78 + 0.22 * np.exp(-t / 0.12))
    return (out * e + chiff) * vol


def tuba(f, dur):
    """Oom-pah tuba: additive brass whose upper harmonics flare on the attack (the 'blat') then mellow."""
    n = int((dur + 0.06) * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(f * (1 - 0.02 * np.exp(-t / 0.025))) / SR
    br = np.exp(-t / 0.07)
    x = np.zeros(n)
    for k in range(1, int(min(3000, SR * 0.45) / f) + 1):
        x += np.exp(-(k - 1) / (1.5 + 5 * br)) / k * np.sin(k * ph)
    return x * env(n, 0.012, 0.06) * (0.7 + 0.3 * br)


def march_snare(acc=1.0):
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    wires = (bandpass(rng.standard_normal(n), 3500, 0.7) + highpass(rng.standard_normal(n), 2000) * 0.5) * np.exp(-t / 0.055)
    body = (np.sin(2 * np.pi * 185 * t) + 0.4 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t / 0.03)
    return (wires * 0.7 + body * 0.5) * acc * env(n, 0, 0.06)


def cymbal(decay=0.05, hp=6000, dur=None):
    """Metallic cymbal: clashing square waves at inharmonic ratios plus hiss. Short = hand cymbal 'chick', long = crash."""
    n = int((dur or decay * 6) * SR)
    t = np.arange(n) / SR
    metal = sum(np.sign(np.sin(2 * np.pi * fr * 1.6 * t + rng.random() * 6)) for fr in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    x = highpass(metal, hp) * 0.25 + highpass(rng.standard_normal(n), hp + 1000) * 0.5
    return lowpass(x, 11000) * np.exp(-t / decay) * np.minimum(t / 0.001, 1) * env(n, 0, n / SR * 0.3)   # crash fades out, not cut


def xylo(f, dur=0.6):
    return modal(f, dur, [1, 3.0, 6.1], [0.22, 0.07, 0.025], [1, 0.3, 0.08], 0.002, 0.4)


def glock(f, dur=1.4):
    return modal(f, dur, [1, 2.76, 5.4, 8.93], [0.9, 0.35, 0.12, 0.05], [1, 0.35, 0.12, 0.05], 0.0015, 0.2)


def slide_whistle(pts, dur):
    """Slide whistle: a near-pure tone gliding through (fraction-of-note, midi) points, with a little breath."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    u, m = zip(*pts)
    f = mtof(np.interp(t / dur, u, m)) * (1 + 0.004 * np.sin(2 * np.pi * 6 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    breath = bandpass(rng.standard_normal(n), 2200, 1.2) * 0.05
    return (np.sin(ph) + 0.06 * np.sin(2 * ph) + breath) * env(n, 0.03, 0.05)


def midway():
    # an upbeat circus march in C (2/4, 137 bpm), 32 bars: A theme with chromatic runs, A' (with a tenor
    # counter-line), a bouncy polka trio in F with glockenspiel, then a stop-time chromatic climb and a
    # turnaround, ending with a snare roll and a slide whistle back into the top. A bright fairground band
    # organ (reed + flute + piccolo ranks) over oom-pah tuba and organ chords, bass drum, march snare and
    # hand cymbals, xylophone on the runs. Every 16th note is exactly 3500 samples, so the loop is 28.0 s.
    s16 = 3500 / SR
    bar = 8 * s16
    tr = Track(bar * 32)
    tr.rms = 0.168   # a bright band organ sounds louder than the other beds at equal RMS: about -16 LUFS like them
    CH = {'C': ([64, 67, 72], 48, 43), 'A7': ([61, 64, 67], 45, 40), 'Dm': ([62, 65, 69], 50, 45),
          'G7': ([62, 65, 71], 43, 38), 'D7': ([62, 66, 72], 50, 45), 'E7': ([62, 64, 68], 52, 47),
          'F': ([65, 69, 72], 41, 36), 'Bb': ([62, 65, 70], 46, 41), 'C7': ([64, 67, 70], 48, 43)}
    prog = ['C', 'A7', 'Dm', 'G7', 'C', 'A7', 'D7', 'G7',
            'C', 'A7', 'Dm', 'G7', 'C', 'E7', ('F', 'G7'), 'C',
            'F', 'F', 'C7', 'F', 'F', 'Bb', 'C7', 'D7',
            'G7', 'G7', 'C', 'A7', 'Dm', 'G7', 'C', 'G7']
    # the tune, one list per bar of (16th within the bar, midi, length in 16ths); original, written for this table
    a1 = [[(0, 67, 1), (1, 68, 1), (2, 69, 1), (3, 70, 1), (4, 72, 2), (6, 76, 2)],
          [(0, 79, 2), (2, 78, 1), (3, 77, 1), (4, 76, 2), (6, 73, 2)],
          [(0, 74, 2), (2, 77, 2), (4, 81, 2), (6, 77, 2)],
          [(0, 79, 1), (1, 78, 1), (2, 79, 1), (3, 81, 1), (4, 79, 2), (6, 77, 2)]]
    tune = a1 + [
        [(0, 76, 1), (1, 75, 1), (2, 76, 1), (3, 79, 1), (4, 84, 4)],
        [(0, 82, 2), (2, 81, 1), (3, 80, 1), (4, 79, 1), (5, 78, 1), (6, 77, 1), (7, 76, 1)],
        [(0, 78, 2), (2, 74, 2), (4, 72, 2), (6, 69, 2)],
        [(0, 71, 2), (2, 74, 2), (4, 77, 2)]] + a1 + [
        [(0, 76, 1), (1, 75, 1), (2, 76, 1), (3, 79, 1), (4, 84, 4)],
        [(0, 83, 2), (2, 82, 1), (3, 81, 1), (4, 80, 2), (6, 76, 2)],
        [(0, 77, 2), (2, 81, 2), (4, 79, 2), (6, 77, 1), (7, 74, 1)],
        [(0, 72, 2), (2, 67, 2), (4, 72, 2)],
        # trio (polka) in F
        [(0, 69, 2), (2, 72, 2), (4, 77, 2), (6, 76, 1), (7, 77, 1)],
        [(0, 81, 3), (3, 79, 1), (4, 77, 2), (6, 72, 2)],
        [(0, 70, 2), (2, 72, 1), (3, 70, 1), (4, 79, 2), (6, 76, 2)],
        [(0, 77, 4), (4, 72, 2), (6, 69, 2)],
        [(0, 69, 2), (2, 72, 2), (4, 77, 2), (6, 76, 1), (7, 77, 1)],
        [(0, 82, 3), (3, 81, 1), (4, 77, 2), (6, 74, 2)],
        [(0, 79, 1), (1, 78, 1), (2, 79, 1), (3, 76, 1), (4, 72, 2), (6, 70, 2)],
        [(0, 66, 2), (2, 69, 2), (4, 72, 2), (6, 74, 2)],
        # stop-time chromatic climb, turnaround
        [(k, 71 + k, 1) for k in range(8)],
        [(0, 79, 2), (2, 78, 1), (3, 79, 1), (4, 80, 1), (5, 81, 1), (6, 82, 1), (7, 83, 1)],
        [(0, 84, 4), (4, 79, 2), (6, 76, 2)],
        [(0, 82, 1), (1, 81, 1), (2, 80, 1), (3, 79, 1), (4, 78, 1), (5, 77, 1), (6, 76, 1), (7, 73, 1)],
        [(0, 74, 2), (2, 77, 2), (4, 81, 2), (6, 77, 2)],
        [(0, 79, 2), (2, 77, 2), (4, 74, 2), (6, 71, 2)],
        [(0, 72, 2), (2, 76, 2), (4, 79, 2), (6, 84, 2)],
        [(0, 83, 2)]]
    walks = {7: [(0, 43, 4), (4, 45, 2), (6, 47, 2)], 15: [(0, 36, 4), (4, 38, 2), (6, 40, 2)],
             23: [(0, 50, 4), (4, 48, 2), (6, 45, 2)], 31: [(0, 43, 4), (4, 45, 2), (6, 47, 2)]}
    counter = {8: [52], 9: [49], 10: [50], 11: [53], 12: [52], 13: [56], 14: [57, 55], 15: [52]}
    stop = (24, 25)
    trio = range(16, 24)
    for b in range(32):
        t0 = b * bar
        halves = prog[b] if isinstance(prog[b], tuple) else (prog[b], prog[b])
        # oom: tuba and bass drum on the beats (root, then the fifth below), walking bass at phrase ends
        if b in stop:
            bass = [(0, CH[halves[0]][1], 4)]
        elif b in walks:
            bass = walks[b]
        else:
            bass = [(0, CH[halves[0]][1], 4), (4, CH[halves[1]][1 if halves[0] != halves[1] else 2], 4)]
        for k, m, ln in bass:
            tr.add('tuba', tuba(mtof(m), min(ln, 2.2) * s16), t0 + k * s16)
        for k in ((0,) if b in stop else (0, 4)):
            tr.add('kick', drum(95, 52, 0.35, 0.15, 250) * (1.0 if k == 0 else 0.75), t0 + k * s16)
        # pah: short organ chords on the off-beats (one big hit in stop time)
        for k, name in ([(0, halves[0])] if b in stop else [(2, halves[0]), (6, halves[1])] if b != 31 else [(2, halves[0])]):
            for i, m in enumerate(CH[name][0]):
                tr.add('pah', organ_pipe(mtof(m), (2.5 if b in stop else 1.2) * s16, 0.7, 0.6, 0.5), t0 + k * s16 + 0.004 * i)
        # snare and hand cymbals: off-beat 'chick', ghost pickups, ruffs into phrase ends, 16ths in stop time
        if b in stop:
            sn = [(k, 0.25 + 0.05 * k + (0.3 if b == 25 else 0)) for k in range(8)]
        elif b == 31:
            sn = [(2, 0.8)] + [(4 + k / 2, 0.3 + 0.08 * k) for k in range(8)]
        elif b in trio:
            sn = [(2, 0.55), (6, 0.55)]
        elif b % 4 == 3:
            sn = [(2, 0.8), (4, 0.4), (5, 0.5), (6, 0.65), (7, 0.8)]
        else:
            sn = [(2, 0.8), (3, 0.25), (6, 0.8), (7, 0.3)]
        for k, a in sn:
            tr.add('snare', march_snare(a), t0 + k * s16)
        if b in stop:
            tr.add('cym', cymbal(0.25, 5000) * 0.8, t0)
        else:
            for k in (2, 6):
                tr.add('cym', cymbal(0.045) * (0.4 if b in trio else 0.5), t0 + k * s16)
        if b in (0, 16, 26):
            tr.add('cym', cymbal(0.9, 4000, 2.5) * 0.9, t0)
        # the tune: brassy band organ with a piccolo rank an octave up; the trio is lighter and flutier
        for k, m, ln in tune[b]:
            when = t0 + k * s16
            d = ln * s16 * (0.92 if ln == 1 else 0.78)
            if b in trio:
                tr.add('lead', organ_pipe(mtof(m), d, 0.5, 1.0, 0.9, 0.8), when)
                tr.add('glock', glock(mtof(m + 12), 1.2) * 0.5, when)
            else:
                tr.add('lead', organ_pipe(mtof(m), d, 1.0, 0.6, 1.0), when)
                tr.add('lead', organ_pipe(mtof(m + 12), d, 0.0, 1.0, 0.28, 0.5), when)
            if b in (5, 13) or 24 <= b <= 27:
                tr.add('xylo', xylo(mtof(m + 12)) * 0.8, when)
        if b in counter:
            for i, m in enumerate(counter[b]):
                ln = 8 / len(counter[b])
                tr.add('counter', organ_pipe(mtof(m), ln * s16 * 0.9, 0.8, 0.5, 0.5, 0.4), t0 + i * ln * s16)
    # glockenspiel dings on the big notes, slide-whistle flourishes into the trio and back to the top
    for b, k in ((4, 4), (12, 4), (26, 0)):
        tr.add('glock', glock(mtof(96), 1.6) * 0.45, b * bar + k * s16)
    tr.add('whistle', slide_whistle([(0, 72), (0.15, 70), (1, 84)], 2 * s16), 15 * bar + 6 * s16)
    tr.add('whistle', slide_whistle([(0, 67), (0.5, 74), (1, 88)], 6 * s16), 31 * bar + 2 * s16)
    tent = lambda w: (lambda x: reverb(x, 1.4, 0.015, 6000, w))
    return tr, {'lead': (0.55, [lambda x: chorus(x, 0.002, 0.5, 0.008, 0.25), circ_fx(lambda x: lowpass(x, 6500)), tent(0.24)]),
                'counter': (0.5, [tent(0.3)]),
                'pah': (0.62, [tent(0.24)]),
                'tuba': (0.42, [tent(0.12)]),
                'kick': (0.55, [tent(0.12)]),
                'snare': (0.28, [tent(0.2)]),
                'cym': (0.13, [tent(0.15)]),
                'xylo': (0.35, [tent(0.25)]),
                'glock': (0.22, [tent(0.3)]),
                'whistle': (0.3, [tent(0.3)])}


def wrap_point(out):
    """The player's loop wrap joins two separately encoded copies of the same instant, whose MP3 coding noise differs
    a little, and the coding noise is largest where the music is loud and noisy (a snare, full organ). So put the
    wrap in the quietest, least noisy 30 ms of the loop: least energy above 1.5 kHz, then least energy overall."""
    n = len(out)
    hf = highpass(np.tile(out, 3), 1500)[n:2 * n]
    w = int(0.03 * SR)

    def mavg(x):   # circular moving average, centred
        c = np.cumsum(np.r_[x[-w:], x, x[:w]])
        return (c[w + w // 2:w + w // 2 + n] - c[w // 2 - 1 + 1:w // 2 + n]) / w
    return int(np.argmin(mavg(hf ** 2) + 0.1 * mavg(out ** 2)))


def main():
    # python3 make-music.py [table ...]: render only those tables (default: all), merging their lengths into loops.json
    import sys
    tables = [('nebula', nebula), ('pirate', pirate), ('haunted', haunted), ('jungle', jungle), ('neon', neon), ('midway', midway)]
    want = sys.argv[1:]
    loops, starts = {}, {}
    lp = os.path.join(HERE, 'loops.json')
    if want and os.path.exists(lp):
        with open(lp) as f:
            old = json.load(f)
            loops, starts = old.get('samples', {}), old.get('start', {})
    for name, fn in tables:
        if want and name not in want:
            continue
        tr, mix = fn()
        out = master(tr, mix)
        wav = os.path.join(HERE, name + '.wav')
        from scipy.io import wavfile
        i = wrap_point(out)                           # the file's loop starts here, so the player wraps here
        rot = np.roll(out, -((i + PAD // 2) % tr.n))  # file sample PAD/2 (where the player starts) = loop sample i
        padded = np.concatenate([rot[-PAD:], rot, rot[:PAD]])
        starts[name] = i
        wavfile.write(wav, SR, np.round(padded * 32767).astype(np.int16))
        mp3 = os.path.join(HERE, name + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '64k', mp3], check=True)
        os.remove(wav)
        loops[name] = tr.n
        print(name, '%.2f s' % (tr.n / SR), os.path.getsize(mp3) // 1024, 'KB', 'rms %.3f' % np.sqrt(np.mean(out ** 2)))
    with open(os.path.join(HERE, 'loops.json'), 'w') as f:
        json.dump({'rate': SR, 'pad': PAD, 'samples': loops, 'start': starts}, f)


if __name__ == '__main__':
    main()
