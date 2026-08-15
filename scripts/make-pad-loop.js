/**
 * Renders a seamless looping ambient pad to a 16-bit mono WAV.
 *
 *   node scripts/make-pad-loop.js src/sounds/pad-loop.wav
 *
 * This is the file the demo uses to show what `seamlessLoop` does, so it has to
 * be a loop you can leave running: a warm chord that drifts slowly rather than
 * anything with an edge on it.
 *
 * WAV rather than MP3 on purpose. An MP3 carries encoder padding at both ends,
 * and a loop that plays that padding has a hole in it no matter how the loop is
 * driven, which is exactly the thing this file is meant to demonstrate the
 * absence of.
 *
 * Every partial completes a whole number of cycles over the loop, and so does
 * every slow swell, so the end of the file lines up with its start sample for
 * sample.
 */
import fs from "node:fs";

const SR = 16000; // The highest partial here is 440 Hz, so this is already generous
const DURATION = 12; // seconds
const N = SR * DURATION;

/** A2 root with its fifth and two octaves, plus gentle detune for movement. */
const BASE = 110;
const voices = [
  { ratio: 1, gain: 1.0, detune: 0 },
  { ratio: 1, gain: 0.5, detune: 0.4 },      // beats slowly against the root
  { ratio: 1.5, gain: 0.6, detune: 0 },      // fifth
  { ratio: 1.5, gain: 0.3, detune: -0.3 },
  { ratio: 2, gain: 0.42, detune: 0 },       // octave
  { ratio: 3, gain: 0.16, detune: 0.2 },     // octave + fifth, quiet
  { ratio: 4, gain: 0.08, detune: 0 },
  { ratio: 0.5, gain: 0.5, detune: 0 },      // sub, carries the weight
];

/** Slow swells, each a whole number of cycles over the loop. */
const swells = [
  { cycles: 1, depth: 0.14 },
  { cycles: 2, depth: 0.08 },
  { cycles: 3, depth: 0.05 },
];

const samples = new Float32Array(N);
const voiceSum = voices.reduce((sum, v) => sum + v.gain, 0);

for (const v of voices) {
  // Snap each partial to a whole number of cycles over the loop, so it returns
  // to its starting phase. Without this the seam clicks.
  v.frequency = Math.round((BASE * v.ratio + v.detune) * DURATION) / DURATION;
}

for (let i = 0; i < N; i++) {
  const t = i / SR;

  let value = 0;
  for (const v of voices) value += v.gain * Math.sin(2 * Math.PI * v.frequency * t);
  value /= voiceSum;

  let amp = 1;
  for (const s of swells) amp *= 1 + s.depth * Math.sin((2 * Math.PI * s.cycles * t) / DURATION);

  samples[i] = value * amp;
}

// Leaves headroom: the panner, the channel volume and the master all sit after this.
let peak = 0;
for (const s of samples) peak = Math.max(peak, Math.abs(s));
const scale = (0.6 / peak) * 32767;

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
