"""Generate helicopter, xylophone melody, and bass drop for spatial demo."""
import wave
import math
import struct
import random
import os

SAMPLE_RATE = 44100
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "sounds")

def write_wav(filename, samples):
    """Write mono float samples (-1..1) as a 16-bit WAV file."""
    filepath = os.path.join(OUTPUT_DIR, filename)
    n = len(samples)
    with wave.open(filepath, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        int_samples = [int(max(-32768, min(32767, s * 32767))) for s in samples]
        wf.writeframes(struct.pack(f"<{n}h", *int_samples))
    size_kb = os.path.getsize(filepath) / 1024
    print(f"  Created {filename} ({size_kb:.1f} KB, {n/SAMPLE_RATE:.1f}s)")


def helicopter(duration=6.0):
    """Helicopter: low-frequency rumble with amplitude-modulated rotor chop."""
    n = int(duration * SAMPLE_RATE)
    random.seed(100)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        # rotor frequency ~12 Hz (typical 2-blade at 720 RPM)
        rotor = 0.5 + 0.5 * math.sin(2 * math.pi * 12 * t)
        # add secondary rotor beat
        rotor += 0.3 * math.sin(2 * math.pi * 24 * t)
        # low rumble 70Hz
        rumble = math.sin(2 * math.pi * 70 * t) * 0.35
        # higher engine whine
        whine = math.sin(2 * math.pi * 400 * t) * 0.08
        whine += math.sin(2 * math.pi * 800 * t) * 0.04
        # wind noise
        noise = (random.random() * 2 - 1) * 0.12
        # envelope: fade in/out
        fade = 1.0
        fade_in = int(0.3 * SAMPLE_RATE)
        fade_out = int(0.5 * SAMPLE_RATE)
        if i < fade_in:
            fade = i / fade_in
        elif i > n - fade_out:
            fade = (n - i) / fade_out
        s = (rumble + whine + noise) * rotor * fade * 0.7
        samples.append(s)
    return samples


def xylophone_melody(duration=6.5):
    """Xylophone: pentatonic melody with marimba-like decay."""
    n = int(duration * SAMPLE_RATE)
    # pentatonic scale frequencies (C4 pentatonic)
    pentatonic = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51]
    # melody pattern: ascending then descending
    pattern = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0, 1, 3, 5, 7, 5, 3, 1, 0]
    note_duration = 0.22  # seconds per note
    gap = 0.06  # gap between notes

    samples = []
    note_idx = 0
    pos = 0
    while pos < n and note_idx < len(pattern):
        freq = pentatonic[pattern[note_idx]]
        note_samples = int(note_duration * SAMPLE_RATE)
        for j in range(note_samples):
            if pos + j >= n:
                break
            t = j / SAMPLE_RATE
            # fundamental
            s = math.sin(2 * math.pi * freq * t) * 0.4
            # harmonics for richer xylophone tone
            s += math.sin(2 * math.pi * freq * 3 * t) * 0.15
            s += math.sin(2 * math.pi * freq * 5.6 * t) * 0.08
            # percussive attack/decay
            env = math.exp(-t * 12)
            samples.append(s * env * 0.7)
            pos += 1
        # gap
        gap_samples = int(gap * SAMPLE_RATE)
        for _ in range(gap_samples):
            if pos >= n:
                break
            samples.append(0.0)
            pos += 1
        note_idx += 1

    # pad remaining with silence
    while len(samples) < n:
        samples.append(0.0)
    return samples[:n]


def bass_drop(duration=5.0):
    """Bass drop: deep sub-bass frequency sweep from 80Hz down to 30Hz."""
    n = int(duration * SAMPLE_RATE)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        progress = i / n
        # exponential freq sweep: 80 -> 30 Hz
        freq = 80 * math.exp(-1.0 * progress)
        # gradual fade in then heavy impact
        if progress < 0.1:
            amp = progress / 0.1
        elif progress < 0.3:
            amp = 1.0
        else:
            amp = math.exp(-(progress - 0.3) * 3)
        # sub bass fundamental
        s = math.sin(2 * math.pi * freq * t) * 0.6
        # add second harmonic for richness
        s += math.sin(2 * math.pi * freq * 2 * t) * 0.2
        # subtle distortion/saturation
        s = math.tanh(s * 2) * 0.5
        samples.append(s * amp * 0.85)
    return samples


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Generating spatial SFX to: {OUTPUT_DIR}")

    sounds = {
        "helicopter.wav": helicopter,
        "xylophone-melody.wav": xylophone_melody,
        "bass-drop.wav": bass_drop,
    }

    for filename, generator in sounds.items():
        samples = generator()
        write_wav(filename, samples)

    print(f"\nDone! Generated {len(sounds)} sound effects.")


if __name__ == "__main__":
    main()