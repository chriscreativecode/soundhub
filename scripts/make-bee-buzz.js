/**
 * Renders a seamless looping bee buzz to a 16-bit mono WAV.
 *
 *   node scripts/make-bee-buzz.js bee.wav
 *   ffmpeg -i bee.wav -codec:a libmp3lame -b:a 96k -ar 44100 -ac 1 src/sounds/bee-buzz.mp3
 *
 * Everything that moves (pitch drift, wing-beat flutter, the airy noise bed) is
 * built from sines whose periods divide the loop length exactly, and the base
 * frequency fits a whole number of cycles into it, so the end of the file lines
 * up with its start and the loop has no seam.
 */
const fs = require("fs");

const SR = 44100;
const DURATION = 10; // seconds
const N = SR * DURATION;

/** Whole cycles over the loop, so phase comes back round: ~228 Hz wing beat. */
const F0 = Math.round(228 * DURATION) / DURATION;

/** Modulators, each an integer number of cycles over the loop. */
const drift = [
  { cycles: 3, depth: 0.055 },
  { cycles: 7, depth: 0.03 },
  { cycles: 11, depth: 0.02 },
  { cycles: 23, depth: 0.012 },
];

const tremolo = [
  { cycles: 5, depth: 0.16 },
  { cycles: 13, depth: 0.09 },
  { cycles: 31, depth: 0.05 },
];

/** Harmonic weights: a buzz is a rasp, so the upper partials stay present. */
const harmonics = [
  { mult: 1, gain: 1.0 },
  { mult: 2, gain: 0.62 },
  { mult: 3, gain: 0.38 },
  { mult: 4, gain: 0.22 },
  { mult: 5, gain: 0.13 },
  { mult: 6, gain: 0.07 },
];

/** A periodic stand-in for air noise: many sines, fixed phases, integer cycles. */
const noisePartials = [];
let seed = 20260815;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
for (let i = 0; i < 220; i++) {
  const cycles = Math.round(600 + rand() * 5200);
  noisePartials.push({ cycles, phase: rand() * Math.PI * 2, gain: 1 / (1 + i * 0.03) });
}

const samples = new Float32Array(N);
let phase = 0;

for (let i = 0; i < N; i++) {
  const t = i / SR;

  let bend = 0;
  for (const d of drift) bend += d.depth * Math.sin((2 * Math.PI * d.cycles * t) / DURATION);
  const freq = F0 * (1 + bend);
  phase += (2 * Math.PI * freq) / SR;

  let body = 0;
  for (const h of harmonics) body += h.gain * Math.sin(phase * h.mult);
  body /= harmonics.reduce((sum, h) => sum + h.gain, 0);

  let air = 0;
  for (const p of noisePartials) {
    air += p.gain * Math.sin((2 * Math.PI * p.cycles * t) / DURATION + p.phase);
  }
  air /= noisePartials.length * 0.5;

  let amp = 1;
  for (const m of tremolo) amp *= 1 + m.depth * Math.sin((2 * Math.PI * m.cycles * t) / DURATION);

  samples[i] = (body * 0.82 + air * 0.18) * amp * 0.5;
}

// Normalise to a comfortable level, leaving headroom for the panner.
let peak = 0;
for (const s of samples) peak = Math.max(peak, Math.abs(s));
const scale = (0.78 / peak) * 32767;

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
console.log("wrote", process.argv[2], (44 + data.length) / 1024, "KB");
