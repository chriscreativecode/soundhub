/**
 * Renders a seamless looping bumblebee hum to a 16-bit mono WAV.
 *
 *   node scripts/make-bee-buzz.js src/sounds/bee-buzz.wav
 *
 * WAV rather than MP3 on purpose: an MP3 carries encoder padding at both ends,
 * and a loop that plays that padding has a hole in it no matter how the loop
 * itself is driven.
 *
 * Everything that moves (the pitch drift, the wing-beat flutter, the airy bed
 * underneath) is built from sines whose periods divide the loop length exactly,
 * and the wing-beat frequency fits a whole number of cycles into it, so the end
 * of the file lines up with its start.
 *
 * The timbre is deliberately closer to a bumblebee than to a wasp: a low
 * fundamental with the upper partials falling away quickly, gentle flutter and
 * only a trace of air. A bright buzz with strong harmonics and deep tremolo is
 * exactly the sound a listener wants to switch off.
 */
import fs from "node:fs";

const SR = 22050; // The hum lives under 2 kHz, so this is plenty of bandwidth
const DURATION = 8; // seconds
const N = SR * DURATION;

/** Whole cycles over the loop, so phase comes back round: a low wing beat. */
const F0 = Math.round(124 * DURATION) / DURATION;

/** Frequency drift, gentle and slow: the bee wanders rather than wavers. */
const drift = [
  { cycles: 2, depth: 0.022 },
  { cycles: 3, depth: 0.014 },
  { cycles: 7, depth: 0.008 },
];

/** Wing-beat flutter. Shallow, or it turns into a nagging tremolo. */
const tremolo = [
  { cycles: 4, depth: 0.07 },
  { cycles: 9, depth: 0.04 },
];

/** Steep rolloff, so the hum stays round instead of rasping. */
const harmonics = [
  { mult: 1, gain: 1.0 },
  { mult: 2, gain: 0.3 },
  { mult: 3, gain: 0.11 },
  { mult: 4, gain: 0.045 },
  { mult: 5, gain: 0.018 },
];

/** A trace of air: a periodic stand-in for noise, kept low and quiet. */
const noisePartials = [];
let seed = 20260815;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
for (let i = 0; i < 160; i++) {
  const hz = 240 + rand() * 1400;
  noisePartials.push({
    cycles: Math.round(hz * DURATION),
    phase: rand() * Math.PI * 2,
    gain: 240 / hz, // falls away with frequency, so the bed stays soft
  });
}

const samples = new Float32Array(N);
const harmonicSum = harmonics.reduce((sum, h) => sum + h.gain, 0);
const noiseSum = noisePartials.reduce((sum, p) => sum + p.gain, 0);
let phase = 0;

for (let i = 0; i < N; i++) {
  const t = i / SR;

  let bend = 0;
  for (const d of drift) bend += d.depth * Math.sin((2 * Math.PI * d.cycles * t) / DURATION);
  phase += (2 * Math.PI * F0 * (1 + bend)) / SR;

  let body = 0;
  for (const h of harmonics) body += h.gain * Math.sin(phase * h.mult);
  body /= harmonicSum;

  let air = 0;
  for (const p of noisePartials) {
    air += p.gain * Math.sin((2 * Math.PI * p.cycles * t) / DURATION + p.phase);
  }
  air /= noiseSum;

  let amp = 1;
  for (const m of tremolo) amp *= 1 + m.depth * Math.sin((2 * Math.PI * m.cycles * t) / DURATION);

  samples[i] = (body * 0.94 + air * 0.06) * amp;
}

// Leaves headroom: the panner and the scene volume both sit after this.
let peak = 0;
for (const s of samples) peak = Math.max(peak, Math.abs(s));
const scale = (0.55 / peak) * 32767;

const data = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) {
  const v = Math.max(-32768, Math.min(32767, Math.round(samples[i] * scale)));
  data.writeInt16LE(v, i * 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

fs.writeFileSync(process.argv[2], Buffer.concat([header, data]));
console.log("wrote", process.argv[2], Math.round((44 + data.length) / 1024), "KB");
