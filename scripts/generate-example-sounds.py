"""
Generates every audio file used by the example page.

The examples ship in a public repository, so the audio has to be ours. Nothing
here is sampled or downloaded: each file is synthesised from oscillators and
noise, which makes the whole examples/sounds folder unambiguously MIT along
with the rest of the project.

    python scripts/generate-example-sounds.py

Needs numpy, and ffmpeg on PATH for the mp3 encoding.
"""
import os
import subprocess
import wave

import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "examples", "sounds")


# --------------------------------------------------------------- helpers ---

def t(seconds: float) -> np.ndarray:
    return np.linspace(0.0, seconds, int(seconds * SR), endpoint=False)

def square(freq, dur, duty=0.5):
    x = (freq * t(dur)) % 1.0
    return np.where(x < duty, 1.0, -1.0)

def sine(freq, dur):
    return np.sin(2 * np.pi * freq * t(dur))

def sweep(f0, f1, dur, kind="square"):
    x = t(dur)
    freq = np.linspace(f0, f1, len(x))
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return np.sign(np.sin(phase)) if kind == "square" else np.sin(phase)

def noise(dur):
    return np.random.uniform(-1.0, 1.0, int(dur * SR))

def decay(n, k=5.0, attack=0.005):
    env = np.exp(-k * np.linspace(0.0, 1.0, n))
    a = min(int(attack * SR), n)
    env[:a] *= np.linspace(0.0, 1.0, a)
    return env

def lowpass(signal, alpha=0.05):
    """One-pole filter. Enough to take the fizz off white noise."""
    out = np.empty_like(signal)
    acc = 0.0
    for i, s in enumerate(signal):
        acc += alpha * (s - acc)
        out[i] = acc
    return out

def place(track, start, chunk, gain=1.0):
    i = int(start * SR)
    end = min(i + len(chunk), len(track))
    track[i:end] += chunk[: end - i] * gain

def normalise(signal, peak=0.85):
    top = np.max(np.abs(signal))
    return signal * (peak / top) if top else signal

def save(name, signal, mp3=False, bitrate="128k"):
    signal = normalise(signal)
    path = os.path.join(OUT, name if not mp3 else name.replace(".mp3", ".wav"))
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((signal * 32767).astype("<i2").tobytes())
    if mp3:
        target = os.path.join(OUT, name)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-b:a", bitrate, target],
            check=True,
        )
        os.remove(path)
        path = target
    print(f"  {os.path.basename(path):24} {os.path.getsize(path) / 1024:8.1f} KB")


# ------------------------------------------------------------ sprite sheet --
# The example page slices this file with these exact timings, so the regions
# below have to keep matching SPRITES in examples/demo.ts.

def blip(freq, dur, k=6.0, duty=0.5):
    return square(freq, dur, duty) * decay(int(dur * SR), k)

def sprite_sheet():
    track = np.zeros(int(30 * SR))

    # nextLevel 0.0 to 2.0
    for i, f in enumerate([523, 659, 784, 1047]):
        place(track, 0.05 + i * 0.2, blip(f, 0.22, 4), 0.5)
    place(track, 0.9, blip(1319, 0.9, 3), 0.5)

    # powerUp 2.5 to 4.5
    place(track, 2.6, sweep(220, 1800, 1.4) * decay(int(1.4 * SR), 2.5), 0.45)
    place(track, 3.9, blip(2093, 0.4, 4), 0.35)

    # jump 4.5 to 5.5
    place(track, 4.6, sweep(420, 1000, 0.16) * decay(int(0.16 * SR), 5), 0.55)

    # fail 6.0 to 8.5
    for i, f in enumerate([392, 330, 262, 196]):
        place(track, 6.1 + i * 0.5, blip(f, 0.55, 3, duty=0.35), 0.5)

    # catch 8.5 to 9.2
    place(track, 8.6, blip(1245, 0.14, 9), 0.55)

    # danger 16.5 to 18.5
    for i in range(6):
        place(track, 16.6 + i * 0.3, blip(880 if i % 2 == 0 else 622, 0.22, 6), 0.45)

    # victory 20.5 to 22.5
    for i, f in enumerate([523, 659, 784, 1047, 784, 1047]):
        place(track, 20.6 + i * 0.16, blip(f, 0.3, 4), 0.42)
    place(track, 21.7, blip(1568, 0.7, 2.5), 0.45)

    # attack 28.0 to 29.5
    place(track, 28.1, lowpass(noise(0.5), 0.4) * decay(int(0.5 * SR), 7), 0.6)
    place(track, 28.1, sweep(900, 90, 0.5) * decay(int(0.5 * SR), 4), 0.4)

    return track


# ------------------------------------------------------------ one-shot sfx --

def laser():
    d = 0.8
    body = sweep(3000, 200, d) * decay(int(d * SR), 6)
    return body * 0.8 + noise(d) * decay(int(d * SR), 14) * 0.15

def explosion():
    d = 1.6
    n = int(d * SR)
    return lowpass(noise(d), 0.08) * decay(n, 3.5) + sine(45, d) * decay(n, 4) * 0.6

def whoosh():
    d = 1.0
    n = int(d * SR)
    swell = np.sin(np.linspace(0, np.pi, n)) ** 2
    return lowpass(noise(d), 0.25) * swell

def power_up():
    d = 1.2
    out = np.zeros(int(d * SR))
    for i, f in enumerate([262, 330, 392, 523, 659, 784]):
        place(out, i * 0.14, blip(f, 0.4, 5), 0.5)
    return out


# ------------------------------------------------------------------ beds ----

def music(dur=24.0):
    """Four looping chords with a slow melody on top."""
    out = np.zeros(int(dur * SR))
    chords = [[220, 262, 330], [175, 220, 262], [131, 165, 196], [196, 247, 294]]
    bar = dur / len(chords)
    for i, chord in enumerate(chords):
        for f in chord:
            voice = sine(f, bar) + 0.3 * sine(f * 2, bar)
            fade = np.minimum(np.linspace(0, 12, len(voice)), 1.0)
            fade *= np.minimum(np.linspace(12, 0, len(voice)), 1.0)
            place(out, i * bar, voice * fade, 0.22)
    melody = [523, 659, 587, 494, 523, 440, 392, 440]
    for i, f in enumerate(melody):
        place(out, 1.0 + i * (dur / len(melody)), sine(f, 1.6) * decay(int(1.6 * SR), 2.2), 0.16)
    return out

def rain(dur=12.0):
    body = lowpass(noise(dur), 0.35) * 0.5
    gusts = 1.0 + 0.25 * np.sin(2 * np.pi * 0.13 * t(dur))
    out = body * gusts
    for _ in range(60):  # individual drips
        place(out, np.random.uniform(0, dur - 0.2), sine(np.random.uniform(900, 2600), 0.05)
              * decay(int(0.05 * SR), 12), 0.12)
    return out

def birds(dur=12.0):
    out = lowpass(noise(dur), 0.06) * 0.12
    for _ in range(38):
        d = np.random.uniform(0.06, 0.16)
        f0 = np.random.uniform(1800, 3200)
        chirp = sweep(f0, f0 * np.random.uniform(0.6, 1.7), d, "sine") * decay(int(d * SR), 6)
        place(out, np.random.uniform(0, dur - 0.3), chirp, np.random.uniform(0.2, 0.45))
    return out

def helicopter(dur=8.0):
    x = t(dur)
    rotor = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 11.0 * x))  # blade slap
    body = lowpass(noise(dur), 0.5) * rotor
    engine = 0.4 * np.sin(2 * np.pi * 62 * x) + 0.2 * np.sin(2 * np.pi * 124 * x)
    return body * 0.7 + engine * rotor


# ------------------------------------------------------------------ main ----

if __name__ == "__main__":
    np.random.seed(7)  # same files on every run
    os.makedirs(OUT, exist_ok=True)
    print(f"Writing to {os.path.abspath(OUT)}")

    save("sprites.mp3", sprite_sheet(), mp3=True)
    save("music.mp3", music(), mp3=True)
    save("rain.mp3", rain(), mp3=True, bitrate="96k")
    save("birds.mp3", birds(), mp3=True, bitrate="96k")
    save("helicopter.mp3", helicopter(), mp3=True, bitrate="96k")

    save("laser.wav", laser())
    save("explosion.wav", explosion())
    save("whoosh.wav", whoosh())
    save("power-up.wav", power_up())

    print("Done.")
