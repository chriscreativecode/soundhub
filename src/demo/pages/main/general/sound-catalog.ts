import { IconName } from "../../../components/shared/icon-utils";

/**
 * Human-readable identity for every sound in the demo.
 *
 * The library only ever needs the raw id, but a page full of `intro-speach`
 * and `sound-surfer-constellations` tells a visitor nothing about what they
 * are about to hear. The catalog gives each channel a name, a family and one
 * line describing what it is useful for, so the list can be scanned, filtered
 * and understood before a single button is pressed.
 */

export type SoundCategory = "ambience" | "music" | "voice" | "game";

export interface SoundMeta {
  /** Name shown in the channel strip */
  label: string;
  category: SoundCategory;
  /** One line: what this clip is, and what it is good for demonstrating */
  blurb: string;
}

export interface CategoryMeta {
  label: string;
  icon: IconName;
}

export const CATEGORY_META: Record<SoundCategory, CategoryMeta> = {
  ambience: { label: "Ambience", icon: "waves" },
  music: { label: "Music", icon: "music-note" },
  voice: { label: "Voice", icon: "unmute" },
  game: { label: "Game", icon: "sprite" },
};

const CATALOG: Record<string, SoundMeta> = {
  "intro-speach": {
    label: "Intro Voice-over",
    category: "voice",
    blurb: "Spoken line. The clearest way to hear what panning does to a centre image.",
  },
  "piano-tone": {
    label: "Piano Tone",
    category: "music",
    blurb: "One sustained note, so a change in playback rate is impossible to miss.",
  },
  "game-sound": {
    label: "8-bit Game Sounds",
    category: "game",
    blurb: "A single file holding several effects, cut into sprites by start and end time.",
  },
  "game-sound_levelup": {
    label: "Level Up",
    category: "game",
    blurb: "Sprite region 2.4s - 4.0s of the 8-bit file.",
  },
  "game-sound_jump": {
    label: "Jump",
    category: "game",
    blurb: "Sprite region 4.0s - 5.0s of the 8-bit file.",
  },
  birds: {
    label: "Forest Birds",
    category: "ambience",
    blurb: "Wide, busy stereo bed. Move it in the 3D grid and the flock moves with it.",
  },
  rain: {
    label: "Rainfall",
    category: "ambience",
    blurb: "Steady noise floor. Good for hearing fades and small volume steps.",
  },
  crickets: {
    label: "Night Crickets",
    category: "ambience",
    blurb: "Dense high end that reveals how HRTF differs from equal-power panning.",
  },
  brook: {
    label: "Running Brook",
    category: "ambience",
    blurb: "Water loop with no obvious seam, built to be left running underneath.",
  },
  magma: {
    label: "Undersea Magma",
    category: "ambience",
    blurb: "Low rumble. Slow it down and it turns into something much larger.",
  },
  "little-wonders-song": {
    label: "Little Wonders",
    category: "music",
    blurb: "Full mix. Useful for checking that the master limiter keeps its head.",
  },
  "sound-surfer-constellations": {
    label: "Constellations",
    category: "music",
    blurb: "Long ambient track for testing seeking and progress tracking.",
  },
};

/**
 * Falls back to a title-cased id, so a sound added to the manifest without a
 * catalog entry still shows up with something readable instead of breaking.
 */
export function getSoundMeta(id: string): SoundMeta {
  const known = CATALOG[id];
  if (known) return known;

  return {
    label: id
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    category: "ambience",
    blurb: "",
  };
}
