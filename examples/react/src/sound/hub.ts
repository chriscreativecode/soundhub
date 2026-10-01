import { SoundHub } from 'soundhub';

// The example sounds live in the soundhub repository, served by jsDelivr.
const BASE = 'https://cdn.jsdelivr.net/gh/chriscreativecode/soundhub@main/examples/sounds/';

export const SOUNDS = [
  { id: 'music', url: BASE + 'music.mp3' },
  { id: 'laser', url: BASE + 'laser.wav' },
  { id: 'explosion', url: BASE + 'explosion.wav' },
];

let hub: SoundHub | undefined;
let loading: Promise<void> | undefined;

/**
 * One hub for the whole app, created on first use.
 *
 * It lives in a module rather than in component state, so StrictMode mounting
 * every component twice does not create two hubs. Creating it on first use also
 * keeps it out of server rendering, where there is no AudioContext.
 */
export function getHub(): SoundHub {
  hub ??= new SoundHub({ masterLimiter: true });
  return hub;
}

/** Loads every sound once, however many components ask for it. */
export function loadSounds(): Promise<void> {
  loading ??= getHub().loadSounds(SOUNDS);
  return loading;
}
