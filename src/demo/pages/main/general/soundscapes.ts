import { IconName } from "../../../components/shared/icon-utils";

/**
 * Soundscapes: one click, several channels, each one placed in the room.
 *
 * A single sound playing proves the library loads a file. A scene proves the
 * part that actually matters — a handful of sources running at once, each with
 * its own volume, its own point in 3D space and its own playback rate, all
 * fading in together. Every value below is passed straight through to
 * `soundManager.play()`, which is also why the live API panel can print the
 * scene as copyable code.
 *
 * Positions use the Web Audio listener frame: the visitor sits at the origin
 * facing -z. So -x is left, +x is right, -z is in front, +z is behind, +y is
 * overhead. Every axis stays inside -1 to 1, which is both the range the
 * spatial grid on a channel strip draws and about as far as the demo's inverse
 * distance model can carry a layer before it loses more level than a mix wants.
 */

export interface SpatialPosition {
  x: number;
  y: number;
  z: number;
}

export interface SoundscapeLayer {
  id: string;
  volume: number;
  /** Where this layer sits around the listener; see the note above */
  position: SpatialPosition;
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
    blurb: "Rain on the canopy above you, birds off to the left, a brook running behind your right shoulder.",
    icon: "cloud-rain",
    fadeInDuration: 2.5,
    layers: [
      { id: "rain", volume: 0.65, position: { x: 0, y: 1, z: -0.2 } },
      { id: "birds", volume: 0.45, position: { x: -0.95, y: 0.35, z: -0.7 } },
      { id: "brook", volume: 0.35, position: { x: 0.9, y: -0.2, z: 0.8 } },
    ],
  },
  {
    id: "night-camp",
    name: "Night Camp",
    blurb: "Crickets close behind you, water somewhere off to the left, embers glowing at your feet.",
    icon: "flame",
    fadeInDuration: 3,
    layers: [
      { id: "crickets", volume: 0.5, position: { x: 0.5, y: -0.3, z: 0.9 } },
      { id: "brook", volume: 0.32, position: { x: -1, y: -0.1, z: -0.4 } },
      { id: "magma", volume: 0.26, position: { x: 0, y: -1, z: -0.35 }, playbackRate: 0.8 },
    ],
  },
  {
    id: "deep-current",
    name: "Deep Current",
    blurb: "Everything slowed down and sunk: pressure from below, water to the left, rain reduced to weather far overhead.",
    icon: "waves",
    fadeInDuration: 4,
    layers: [
      { id: "magma", volume: 0.55, position: { x: 0, y: -1, z: -0.5 }, playbackRate: 0.75 },
      { id: "brook", volume: 0.32, position: { x: -1, y: -0.4, z: 0.3 }, playbackRate: 0.6 },
      { id: "rain", volume: 0.26, position: { x: 0.4, y: 1, z: 0.7 }, playbackRate: 0.55 },
    ],
  },
  {
    id: "dawn-chorus",
    name: "Dawn Chorus",
    blurb: "Birds up front and slightly above, strings spread wide ahead, moving water behind you on the right.",
    icon: "sunrise",
    fadeInDuration: 3.5,
    layers: [
      { id: "birds", volume: 0.55, position: { x: -0.3, y: 0.7, z: -1 } },
      { id: "brook", volume: 0.28, position: { x: 0.9, y: -0.25, z: 0.85 } },
      { id: "sound-surfer-constellations", volume: 0.32, position: { x: 0, y: 0.1, z: -1 } },
    ],
  },
];

/**
 * A position in words, for the layer line on a scene card. The point of the
 * scene is that a visitor hears where each channel is, so the card says where
 * it put it rather than printing three coordinates at them.
 */
export function describePosition(position: SpatialPosition): string {
  const parts: string[] = [];

  if (position.z <= -0.35) parts.push("front");
  else if (position.z >= 0.35) parts.push("rear");

  if (position.x <= -0.35) parts.push("left");
  else if (position.x >= 0.35) parts.push("right");

  if (!parts.length) {
    if (position.y >= 0.6) return "overhead";
    if (position.y <= -0.6) return "below";
    return "centre";
  }

  if (position.y >= 0.6) parts.push("high");
  else if (position.y <= -0.6) parts.push("low");

  return parts.join(" ");
}
