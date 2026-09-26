/**
 * Options for hub.createVariations(): one name for several takes of the same
 * sound, so repeated footsteps, hits and clicks do not sound like a loop.
 */
export interface VariationOptions {
  /**
   * How the next take is picked.
   * 'random' picks any take except the one that just played.
   * 'shuffle' plays every take once, in a random order, before any repeats.
   * 'cycle' plays them in the order given.
   * Default: 'random'.
   */
  order?: 'random' | 'shuffle' | 'cycle';
  /** A random playback rate between these two, as [min, max]. [0.95, 1.05] is a subtle spread. */
  pitch?: [number, number];
  /** A random volume factor between these two, as [min, max]. Multiplies the volume passed to play(), or 1. */
  volume?: [number, number];
  /** Let the takes overlap each other. Default: true, since that is what repeated effects want. */
  overlap?: boolean;
}

/** @internal */
export interface VariationSet {
  id: string;
  members: string[];
  options: VariationOptions;
  last: number;
  /** Takes left before a shuffle starts over, as indexes into members */
  bag: number[];
}
