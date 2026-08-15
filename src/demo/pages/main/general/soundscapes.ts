import { IconName } from "../../../components/shared/icon-utils";

/**
 * Soundscapes: one click, several channels.
 *
 * A single sound playing proves the library loads a file. A scene proves the
 * part that actually matters — a handful of sources running at once, each with
 * its own volume, its own place in the stereo field and its own playback rate,
 * all fading in together. Every value below is passed straight through to
 * `soundManager.play()`, which is also why the live API panel can print the
 * scene as copyable code.
 */

export interface SoundscapeLayer {
  id: string;
  volume: number;
  /** -1 hard left, 0 centre, 1 hard right */
  pan: number;
  playbackRate?: number;
}

export interface Soundscape {
  id: string;
  name: string;
  blurb: string;
  icon: IconName;
  /** Seconds; every layer fades up together so a scene never slams in */
  fadeInDuration: number;
  layers: SoundscapeLayer[];
}

export const SOUNDSCAPES: Soundscape[] = [
  {
    id: "rainy-forest",
    name: "Rainy Forest",
    blurb: "Rain overhead, birds off to the left, a brook running on the right.",
    icon: "cloud-rain",
    fadeInDuration: 2.5,
    layers: [
      { id: "rain", volume: 0.65, pan: 0 },
      { id: "birds", volume: 0.4, pan: -0.6 },
      { id: "brook", volume: 0.3, pan: 0.55 },
    ],
  },
  {
    id: "night-camp",
    name: "Night Camp",
    blurb: "Crickets close by, water in the distance, something warm underneath.",
    icon: "flame",
    fadeInDuration: 3,
    layers: [
      { id: "crickets", volume: 0.5, pan: 0.15 },
      { id: "brook", volume: 0.28, pan: -0.5 },
      { id: "magma", volume: 0.22, pan: 0, playbackRate: 0.8 },
    ],
  },
  {
    id: "deep-current",
    name: "Deep Current",
    blurb: "Everything slowed down until the rain reads as pressure instead of weather.",
    icon: "waves",
    fadeInDuration: 4,
    layers: [
      { id: "magma", volume: 0.55, pan: 0, playbackRate: 0.75 },
      { id: "brook", volume: 0.3, pan: -0.35, playbackRate: 0.6 },
      { id: "rain", volume: 0.22, pan: 0.4, playbackRate: 0.55 },
    ],
  },
  {
    id: "dawn-chorus",
    name: "Dawn Chorus",
    blurb: "Birds up front over a slow bed of strings and moving water.",
    icon: "sunrise",
    fadeInDuration: 3.5,
    layers: [
      { id: "birds", volume: 0.55, pan: -0.2 },
      { id: "brook", volume: 0.25, pan: 0.45 },
      { id: "sound-surfer-constellations", volume: 0.3, pan: 0 },
    ],
  },
];
