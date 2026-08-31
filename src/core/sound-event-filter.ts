/**
 * Narrows which events a listener hears.
 *
 * Every field is optional and they combine with AND. Leave the whole thing off
 * and the listener hears every sound.
 */
export interface SoundEventFilter {
  /** Exactly this sound. The common case. */
  soundId?: string;
  /** Every overlapping instance of one sound, played with `overlap`. */
  originalId?: string;
  /** One specific instance. */
  instanceId?: string;
  /** Instances whose id matches a pattern, for grouping by naming convention. */
  instancePattern?: RegExp;
}

/**
 * What the operating system shows while a sound is playing: the lock screen,
 * the notification shade, the media keys on a keyboard.
 */
export interface MediaSessionInfo {
  title?: string;
  artist?: string;
  album?: string;
  /** At least one 512×512 image gives the best result across platforms. */
  artwork?: { src: string; sizes?: string; type?: string }[];
  /** Seconds the skip-back button jumps. Default 15, the podcast convention. */
  seekBackwardOffset?: number;
  /** Seconds the skip-forward button jumps. Default 30. */
  seekForwardOffset?: number;
  /** Wire up the previous-track button. Left out, the button stays dark. */
  onPreviousTrack?: () => void;
  /** Wire up the next-track button. */
  onNextTrack?: () => void;
}
