/**
 * Every sound on this page is synthesised in the browser and handed to
 * SoundManager as a WAV blob url, so the demo ships without audio assets.
 */

const SAMPLE_RATE = 44100;

export interface SoundLayer {
  type: OscillatorType | 'noise';
  freq?: number;
  freqEnd?: number;
  gain?: number;
  attack?: number;
  start?: number;
  duration?: number;
  filter?: { type: BiquadFilterType; freq: number; freqEnd?: number; q?: number };
}

export interface SoundRecipe {
  id: string;
  label: string;
  emoji: string;
  duration: number;
  layers: SoundLayer[];
}

// ── WAV encoding ─────────────────────────────────────────────────────────────

function writeWavString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function audioBufferToWavBlobUrl(buffer: AudioBuffer): string {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const dataLength = buffer.length * numChannels * (bitDepth / 8);
  const ab = new ArrayBuffer(44 + dataLength);
  const view = new DataView(ab);

  writeWavString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeWavString(view, 8, 'WAVE');
  writeWavString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeWavString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return URL.createObjectURL(new Blob([ab], { type: 'audio/wav' }));
}

// ── Rendering ────────────────────────────────────────────────────────────────

function createNoiseBuffer(ctx: OfflineAudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.ceil(SAMPLE_RATE * seconds));
  const buffer = ctx.createBuffer(1, length, SAMPLE_RATE);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export async function renderRecipe(recipe: SoundRecipe): Promise<string> {
  const ctx = new OfflineAudioContext(1, Math.ceil(SAMPLE_RATE * recipe.duration), SAMPLE_RATE);

  for (const layer of recipe.layers) {
    const start = layer.start ?? 0;
    const duration = Math.max(0.02, layer.duration ?? recipe.duration - start);
    const peak = layer.gain ?? 0.4;
    const attack = Math.min(layer.attack ?? 0.005, duration / 2);

    // A single attack/decay envelope per layer. Exponential ramps can never
    // reach zero, so the decay targets a value low enough to be inaudible.
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    let source: AudioScheduledSourceNode;
    if (layer.type === 'noise') {
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, duration);
      source = noise;
    } else {
      const osc = ctx.createOscillator();
      osc.type = layer.type;
      osc.frequency.setValueAtTime(layer.freq ?? 440, start);
      if (layer.freqEnd !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(layer.freqEnd, 1), start + duration);
      }
      source = osc;
    }

    let tail: AudioNode = source;
    if (layer.filter) {
      const filter = ctx.createBiquadFilter();
      filter.type = layer.filter.type;
      filter.frequency.setValueAtTime(layer.filter.freq, start);
      if (layer.filter.freqEnd !== undefined) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(layer.filter.freqEnd, 1), start + duration);
      }
      if (layer.filter.q !== undefined) filter.Q.value = layer.filter.q;
      tail.connect(filter);
      tail = filter;
    }

    tail.connect(gain);
    gain.connect(ctx.destination);
    source.start(start);
    source.stop(start + duration);
  }

  const rendered = await ctx.startRendering();
  return audioBufferToWavBlobUrl(rendered);
}

// ── Lab sounds ───────────────────────────────────────────────────────────────

export const LAB_SOUNDS: SoundRecipe[] = [
  {
    id: 'laser', label: 'Laser', emoji: '⚡', duration: 0.45,
    layers: [
      { type: 'square', freq: 880, freqEnd: 180, gain: 0.32, duration: 0.4 },
      { type: 'sawtooth', freq: 1400, freqEnd: 260, gain: 0.12, duration: 0.3, filter: { type: 'lowpass', freq: 4000, freqEnd: 700 } },
    ],
  },
  {
    id: 'blip', label: 'Blip', emoji: '🔵', duration: 0.3,
    layers: [{ type: 'square', freq: 660, gain: 0.3, duration: 0.25 }],
  },
  {
    id: 'pop', label: 'Pop', emoji: '💥', duration: 0.4,
    layers: [
      { type: 'triangle', freq: 340, freqEnd: 70, gain: 0.4, duration: 0.35 },
      { type: 'noise', gain: 0.18, duration: 0.12, filter: { type: 'lowpass', freq: 2400, freqEnd: 300 } },
    ],
  },
  {
    id: 'ping', label: 'Ping', emoji: '🔔', duration: 0.9,
    layers: [
      { type: 'sine', freq: 1320, gain: 0.32, duration: 0.85 },
      { type: 'sine', freq: 2640, gain: 0.1, duration: 0.4 },
    ],
  },
  {
    id: 'drone', label: 'Drone', emoji: '🌊', duration: 2.6,
    layers: [
      // A sawtooth at 82.5 Hz behind a soft lowpass: the harmonics land at 165,
      // 247 and 330 Hz, so the pad stays audible on speakers that drop
      // everything below ~100 Hz while still reading as the lowest voice.
      { type: 'sawtooth', freq: 82.5, gain: 0.26, attack: 0.3, duration: 2.5, filter: { type: 'lowpass', freq: 900, freqEnd: 420, q: 4 } },
      { type: 'sine', freq: 165, gain: 0.14, attack: 0.5, duration: 2.5 },
      { type: 'sine', freq: 82.5, gain: 0.16, attack: 0.4, duration: 2.5 },
    ],
  },
  {
    id: 'mid-tone', label: 'Mid Tone', emoji: '🎵', duration: 2.2,
    layers: [
      { type: 'sine', freq: 165, gain: 0.4, attack: 0.15, duration: 2.1 },
      { type: 'triangle', freq: 330, gain: 0.1, attack: 0.4, duration: 2.1 },
    ],
  },
  {
    id: 'high-pad', label: 'High Pad', emoji: '✨', duration: 3.1,
    layers: [
      { type: 'sine', freq: 330, gain: 0.3, attack: 0.25, duration: 3.0 },
      { type: 'sine', freq: 495, gain: 0.14, attack: 0.6, duration: 3.0 },
    ],
  },
];

// ── Game sounds ──────────────────────────────────────────────────────────────

export const GAME_SOUNDS: SoundRecipe[] = [
  {
    id: 'sfx-laser', label: 'Laser', emoji: '🔫', duration: 0.42,
    layers: [
      { type: 'square', freq: 1200, freqEnd: 160, gain: 0.26, duration: 0.4 },
      { type: 'sawtooth', freq: 620, freqEnd: 90, gain: 0.12, duration: 0.35, filter: { type: 'lowpass', freq: 3200, freqEnd: 500 } },
    ],
  },
  {
    id: 'sfx-boom', label: 'Hit', emoji: '💥', duration: 0.55,
    layers: [
      { type: 'noise', gain: 0.5, duration: 0.5, filter: { type: 'lowpass', freq: 2200, freqEnd: 120 } },
      { type: 'sine', freq: 140, freqEnd: 40, gain: 0.35, duration: 0.45 },
    ],
  },
  {
    id: 'sfx-hit', label: 'Ship down', emoji: '🛡️', duration: 0.9,
    layers: [
      { type: 'noise', gain: 0.45, duration: 0.85, filter: { type: 'lowpass', freq: 1100, freqEnd: 70 } },
      { type: 'square', freq: 220, freqEnd: 45, gain: 0.3, duration: 0.7 },
    ],
  },
  {
    id: 'sfx-shield', label: 'Shield hit', emoji: '🧱', duration: 0.3,
    layers: [
      // Short, dry and mid-range, so a crumbling bunker never masks the
      // explosion of the raider that fired the shot
      { type: 'noise', gain: 0.3, duration: 0.14, filter: { type: 'bandpass', freq: 1600, freqEnd: 700, q: 1.4 } },
      { type: 'square', freq: 320, freqEnd: 150, gain: 0.16, duration: 0.1 },
    ],
  },
  {
    id: 'sfx-alarm', label: 'Alarm', emoji: '🚨', duration: 0.75,
    layers: [
      { type: 'square', freq: 880, gain: 0.22, duration: 0.16 },
      { type: 'square', freq: 620, gain: 0.22, start: 0.2, duration: 0.16 },
      { type: 'square', freq: 880, gain: 0.22, start: 0.4, duration: 0.16 },
      { type: 'square', freq: 620, gain: 0.22, start: 0.58, duration: 0.16 },
    ],
  },
  {
    id: 'sfx-wave', label: 'Wave clear', emoji: '🏁', duration: 0.85,
    layers: [
      { type: 'square', freq: 523, gain: 0.22, duration: 0.13 },
      { type: 'square', freq: 659, gain: 0.22, start: 0.14, duration: 0.13 },
      { type: 'square', freq: 784, gain: 0.22, start: 0.28, duration: 0.13 },
      { type: 'square', freq: 1046, gain: 0.24, start: 0.42, duration: 0.4 },
    ],
  },
  {
    id: 'sfx-over', label: 'Game over', emoji: '☠️', duration: 1.5,
    layers: [
      { type: 'sawtooth', freq: 440, freqEnd: 55, gain: 0.28, duration: 1.4, filter: { type: 'lowpass', freq: 2600, freqEnd: 300 } },
      { type: 'noise', gain: 0.16, duration: 1.2, filter: { type: 'lowpass', freq: 900, freqEnd: 80 } },
    ],
  },
  {
    id: 'sfx-blip', label: 'Blip', emoji: '🔹', duration: 0.14,
    layers: [{ type: 'square', freq: 1400, freqEnd: 900, gain: 0.18, duration: 0.1 }],
  },
];

export function soundDuration(id: string): number {
  return [...LAB_SOUNDS, ...GAME_SOUNDS].find(s => s.id === id)?.duration ?? 0.5;
}
