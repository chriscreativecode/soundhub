"""Generate cool sound effects (WAV) for the spatial 3D audio demo."""
import wave
import math
import struct
import random
import os

SAMPLE_RATE = 44100
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "sounds")

def write_wav(filename, samples, channels=1):
    """Write mono float samples (-1..1) as a 16-bit WAV file."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    n = len(samples)
    with wave.open(filepath, "w") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(SAMPLE_RATE)
        # convert float to int16
        int_samples = [int(max(-32768, min(32767, s * 32767))) for s in samples]
        wf.writeframes(struct.pack(f"<{n}h", *int_samples))
    size_kb = os.path.getsize(filepath) / 1024
    print(f"  Created {filename} ({size_kb:.1f} KB, {n/SAMPLE_RATE:.1f}s)")


def envelope(duration, attack=0.01, decay_start=0.3):
    """Linear attack + exponential decay envelope."""
    total = int(duration * SAMPLE_RATE)
    attack_samples = int(attack * SAMPLE_RATE)
    env = []
    for i in range(total):
        if i < attack_samples:
            env.append(i / attack_samples)
        else:
            t = (i - attack_samples) / (total - attack_samples)
            decay = math.exp(-t * 4)  # rapid decay
            env.append(decay * (1.0 - decay_start * t))
    return env


def laser_zap(duration=5.0):
    """Sci-fi laser: frequency sweep from 3000Hz to 200Hz."""
    n = int(duration * SAMPLE_RATE)
    env = envelope(duration, attack=0.005, decay_start=0.4)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        freq = 3000 - (2800 * (i / n))  # sweep down
        phase = 2 * math.pi * freq * t
        # add harmonics
        s = (math.sin(phase) * 0.6 +
             math.sin(phase * 2) * 0.25 +
             math.sin(phase * 3) * 0.15)
        samples.append(s * env[i] * 0.8)
    return samples


def explosion(duration=5.0):
    """Explosion: shaped white noise with low-frequency rumble."""
    n = int(duration * SAMPLE_RATE)
    random.seed(42)
    env = envelope(duration, attack=0.002, decay_start=0.5)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        # low freq rumble
        rumble = math.sin(2 * math.pi * 40 * t) * 0.5
        # noise burst
        noise = (random.random() * 2 - 1) * 0.4
        s = rumble + noise
        samples.append(s * env[i] * 0.7)
    return samples


def whoosh(duration=5.0):
    """Whoosh: filtered noise sweeping from high to low."""
    n = int(duration * SAMPLE_RATE)
    random.seed(123)
    env = envelope(duration, attack=0.02, decay_start=0.3)
    samples = []
    # simple band-pass simulation via running average
    buf = [0.0] * 20
    buf_idx = 0
    for i in range(n):
        noise = random.random() * 2 - 1
        buf[buf_idx] = noise
        buf_idx = (buf_idx + 1) % len(buf)
        # moving average acts as low-pass
        filtered = sum(buf) / len(buf)
        # high-pass: subtract slower average
        slow_avg = sum(buf[:5]) / 5 if len(buf) > 0 else 0
        s = (filtered - slow_avg * 0.5) * 0.7
        samples.append(s * env[i] * 0.8)
    return samples


def power_up(duration=5.0):
    """Video game power-up: ascending multi-tone sweep."""
    n = int(duration * SAMPLE_RATE)
    env = envelope(duration, attack=0.02, decay_start=0.2)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        progress = i / n
        # start low, go high
        base_freq = 200 + progress * 2000
        # arpeggio-like steps
        step = int(progress * 8) % 4
        multipliers = [1.0, 1.25, 1.5, 2.0]
        freq = base_freq * multipliers[step]
        phase = 2 * math.pi * freq * t
        s = (math.sin(phase) * 0.5 +
             math.sin(phase * 2) * 0.2 +
             math.sin(phase * 0.5) * 0.3)
        samples.append(s * env[i] * 0.75)
    return samples


def glitch(duration=5.0):
    """Digital glitch: random noise bursts and stutters."""
    n = int(duration * SAMPLE_RATE)
    random.seed(777)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        # random bursts
        burst = random.random()
        if burst > 0.85:
            # glitch burst
            s = (random.random() * 2 - 1) * 0.6
            # add some tonal glitch
            s += math.sin(2 * math.pi * random.randint(200, 4000) * t) * 0.3
        elif burst > 0.7:
            # quieter background noise
            s = (random.random() * 2 - 1) * 0.15
        else:
            s = 0.0
        samples.append(s * 0.7)
    return samples


def alien_signal(duration=6.0):
    """Alien/ET signal: wobbly sine with tremolo."""
    n = int(duration * SAMPLE_RATE)
    env = envelope(duration, attack=0.05, decay_start=0.3)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        # carrier wobbles
        carrier = 800 + math.sin(2 * math.pi * 2 * t) * 400
        # tremolo
        tremolo = 0.5 + 0.5 * math.sin(2 * math.pi * 6 * t)
        phase = 2 * math.pi * carrier * t
        s = math.sin(phase) * tremolo
        # add ring modulation
        s += math.sin(phase) * math.sin(2 * math.pi * 1200 * t) * 0.3
        samples.append(s * env[i] * 0.65)
    return samples


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Generating SFX to: {OUTPUT_DIR}")

    sounds = {
        "laser-zap.wav": laser_zap,
        "explosion.wav": explosion,
        "whoosh.wav": whoosh,
        "power-up.wav": power_up,
        "glitch.wav": glitch,
        "alien-signal.wav": alien_signal,
    }

    for filename, generator in sounds.items():
        samples = generator()
        write_wav(filename, samples)

    print(f"\nDone! Generated {len(sounds)} sound effects.")


if __name__ == "__main__":
    main()