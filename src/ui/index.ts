/**
 * Interface sounds without audio files.
 *
 * Every sound here is rendered into an AudioBuffer from a few lines of
 * synthesis the moment you add it, so there is nothing to host, nothing to
 * fetch and no licence to check. The whole set costs about 2 KB of code.
 *
 *   import { SoundHub } from 'soundhub';
 *   import { addUiSounds, uiSounds } from 'soundhub/ui';
 *
 *   const hub = new SoundHub();
 *   addUiSounds(hub);
 *   button.onclick = () => hub.play(uiSounds.click);
 *
 * The sounds are ordinary sounds in the hub after that, so volume, mute,
 * groups, ducking and the event bus all work on them.
 */
import type { SoundHub } from '../index';

export type UiSoundName =
  | 'click'
  | 'tap'
  | 'toggleOn'
  | 'toggleOff'
  | 'success'
  | 'error'
  | 'warning'
  | 'notify'
  | 'pop'
  | 'swipe'
  | 'delete'
  | 'type';

export const UI_SOUND_NAMES: readonly UiSoundName[] = [
  'click', 'tap', 'toggleOn', 'toggleOff', 'success', 'error',
  'warning', 'notify', 'pop', 'swipe', 'delete', 'type',
];

export interface UiSoundsOptions {
  /** Put in front of every name, so click becomes "ui.click". Default: "ui.". */
  prefix?: string;
  /** Volume of every sound, from 0 to 1. Default: 0.6, since interface sounds should sit under the content. */
  volume?: number;
  /** Add only these sounds. Default: all of them. */
  only?: UiSoundName[];
  /** A group to put the sounds in, so one call reaches all of them. Created when it does not exist. Default: none. */
  groupId?: string;
}

/** The ids addUiSounds() gives the sounds with the default prefix: uiSounds.click is "ui.click". */
export const uiSounds: Readonly<Record<UiSoundName, string>> = Object.freeze(
  Object.fromEntries(UI_SOUND_NAMES.map((name) => [name, `ui.${name}`])) as Record<UiSoundName, string>
);

/**
 * Render the interface sounds and add them to the hub. Returns the ids, keyed
 * by name. Safe to call again: the sounds are rendered anew and replaced.
 */
export function addUiSounds(hub: SoundHub, options: UiSoundsOptions = {}): Record<UiSoundName, string> {
  const prefix = options.prefix ?? 'ui.';
  const volume = options.volume ?? 0.6;
  const names = options.only ?? UI_SOUND_NAMES;
  const context = hub.getContext();
  const ids = {} as Record<UiSoundName, string>;

  if (options.groupId && !hub.getGroup(options.groupId)) hub.createSoundGroup(options.groupId);

  names.forEach((name) => {
    const samples = renderUiSound(name, context.sampleRate);
    const buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.getChannelData(0).set(samples);

    const id = `${prefix}${name}`;
    hub.addBuffer(id, buffer);
    // A fast typist or a double click must not cut the previous sound off
    hub.updateSoundOptions(id, { overlap: true, volume });
    hub.setSoundVolume(id, volume, true);
    if (options.groupId) hub.addToSoundGroup(options.groupId, id);
    ids[name] = id;
  });

  return ids;
}

// Synthesis -------------------------------------------------------------------------------------------------------------

type Wave = 'sine' | 'triangle' | 'square' | 'noise';

/** One note: a wave that glides from `from` to `to` Hz under an attack and an exponential decay. */
interface Tone {
  wave: Wave;
  from: number;
  to?: number;
  /** Seconds after the start of the sound */
  at?: number;
  /** Seconds the note lasts, decay included */
  length: number;
  gain: number;
  /** Seconds to reach full level. Default: 2 ms, enough to avoid a click. */
  attack?: number;
  /** For noise: how dark it is, from 0 (bright) to 0.99 (dull). */
  tone?: number;
}

const RECIPES: Record<UiSoundName, Tone[]> = {
  click: [
    { wave: 'triangle', from: 1800, to: 1100, length: 0.018, gain: 0.5, attack: 0.0005 },
    { wave: 'noise', from: 0, length: 0.006, gain: 0.25, attack: 0.0002, tone: 0.2 },
  ],
  tap: [{ wave: 'sine', from: 620, to: 420, length: 0.05, gain: 0.7 }],
  toggleOn: [
    { wave: 'sine', from: 520, length: 0.07, gain: 0.5 },
    { wave: 'sine', from: 780, at: 0.05, length: 0.09, gain: 0.5 },
  ],
  toggleOff: [
    { wave: 'sine', from: 780, length: 0.07, gain: 0.5 },
    { wave: 'sine', from: 520, at: 0.05, length: 0.09, gain: 0.5 },
  ],
  success: [
    { wave: 'triangle', from: 523.25, length: 0.14, gain: 0.45 },
    { wave: 'triangle', from: 659.25, at: 0.08, length: 0.14, gain: 0.45 },
    { wave: 'triangle', from: 783.99, at: 0.16, length: 0.35, gain: 0.45 },
  ],
  error: [
    { wave: 'square', from: 220, length: 0.13, gain: 0.18 },
    { wave: 'square', from: 175, at: 0.12, length: 0.22, gain: 0.18 },
  ],
  warning: [
    { wave: 'triangle', from: 440, length: 0.1, gain: 0.5 },
    { wave: 'triangle', from: 440, at: 0.16, length: 0.1, gain: 0.5 },
  ],
  notify: [
    { wave: 'sine', from: 880, length: 0.45, gain: 0.4 },
    { wave: 'sine', from: 1760, length: 0.2, gain: 0.08 },
    { wave: 'sine', from: 1174.66, at: 0.11, length: 0.5, gain: 0.35 },
  ],
  pop: [{ wave: 'sine', from: 280, to: 950, length: 0.06, gain: 0.7, attack: 0.001 }],
  swipe: [{ wave: 'noise', from: 0, length: 0.16, gain: 0.35, attack: 0.06, tone: 0.9 }],
  delete: [{ wave: 'sine', from: 520, to: 140, length: 0.18, gain: 0.6 }],
  type: [
    { wave: 'noise', from: 0, length: 0.008, gain: 0.35, attack: 0.0002, tone: 0.5 },
    { wave: 'sine', from: 3200, length: 0.006, gain: 0.08, attack: 0.0002 },
  ],
};

/**
 * The samples of one interface sound, mono, between -1 and 1.
 * Deterministic: the noise comes from a fixed seed, so a sound is the same on
 * every load and in every browser.
 */
export function renderUiSound(name: UiSoundName, sampleRate: number): Float32Array {
  const tones = RECIPES[name];
  if (!tones) throw new Error(`There is no interface sound called "${name}".`);

  const seconds = Math.max(...tones.map((t) => (t.at ?? 0) + t.length)) + 0.005;
  const out = new Float32Array(Math.ceil(seconds * sampleRate));
  let seed = 0x2f6b1d3;
  const random = () => {
    // xorshift, good enough for noise and the same everywhere
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return ((seed >>> 0) / 0xffffffff) * 2 - 1;
  };

  tones.forEach((t) => {
    const start = Math.floor((t.at ?? 0) * sampleRate);
    const count = Math.floor(t.length * sampleRate);
    const attack = Math.max(1, Math.floor((t.attack ?? 0.002) * sampleRate));
    // Decay to about -60 dB by the end of the note
    const decay = Math.log(1000) / Math.max(1, count - attack);
    const glide = t.to !== undefined && t.to > 0 ? Math.log(t.to / t.from) / count : 0;
    let phase = 0;
    let dull = 0;

    for (let i = 0; i < count && start + i < out.length; i++) {
      const envelope = i < attack ? i / attack : Math.exp(-decay * (i - attack));
      let sample: number;
      if (t.wave === 'noise') {
        const smooth = t.tone ?? 0;
        dull = dull * smooth + random() * (1 - smooth);
        sample = dull * (1 + smooth * 3);
      } else {
        phase += (t.from * Math.exp(glide * i)) / sampleRate;
        const p = phase - Math.floor(phase);
        sample =
          t.wave === 'sine' ? Math.sin(2 * Math.PI * p)
          : t.wave === 'triangle' ? 1 - 4 * Math.abs(p - 0.5)
          : p < 0.5 ? 1 : -1;
      }
      out[start + i] += sample * envelope * t.gain;
    }
  });

  for (let i = 0; i < out.length; i++) out[i] = Math.max(-1, Math.min(1, out[i]));
  return out;
}
