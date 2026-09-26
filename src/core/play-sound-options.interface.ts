import { SoundPanType } from "./sound-pan-type.enum";

export interface PlayOptions {
  /** @deprecated Renamed to `overlap`. Still honoured, and removed in v7. `overlap` wins when both are set. */
  createNewInstance?: boolean;
  /** Seconds to play before the sound ends. Wall clock time, so at double speed it covers twice as much of the file. */
  duration?: number;
  /** Seconds to fade in when the sound starts. */
  fadeInDuration?: number;
  /** Volume the fade in starts from, 0 to 1. */
  fadeInStartVolume?: number;
  /** Seconds to fade out, starting as soon as the sound plays. For a fade at the end, use fadeOutBeforeEndDuration. */
  fadeOutDuration?: number;
  /** Volume the fade out ends at, 0 to 1. Default: 0. */
  fadeOutEndVolume?: number;
  /** Seconds before the end at which a fade out starts. */
  fadeOutBeforeEndDuration?: number;
  /** Group to play the sound into. The group's play options apply, and its maxInstances caps it. */
  groupId?: string;
  /** @deprecated Never read by the hub. Removed in v7. */
  isSeeking?: boolean;
  /** Start over when the end is reached. Default: false. */
  loop?: boolean;
  /** How often a looping sound plays. 0 or -1 loops forever. */
  maxLoops?: number;
  /**
   * Loop inside the audio graph instead of restarting the source, so there is
   * no gap between iterations. Needs loop: true. The loop never ends by itself,
   * so maxLoops is ignored and no loop_completed event is dispatched. Use it for
   * beds and drones, where a restart is audible.
   */
  seamlessLoop?: boolean;
  /**
   * Let the sound overlap itself instead of restarting. Every call gets its own
   * instance with the id "<id>:<n>", which is what play() returns and what the
   * event's instanceId carries. Use it for footsteps, lasers and clicks. Not
   * available on streams. Default: false.
   */
  overlap?: boolean;
  /** Stereo pan, from -1 (left) to 1 (right). */
  pan?: number;
  /** Direction the sound points in. Only audible when the panner has a cone set through coneInnerAngle and coneOuterAngle. */
  panSpatialOrientation?: { x: number; y: number; z: number };
  /** Position in 3D space. Set panType to SoundPanType.Spatial as well. */
  panSpatialPosition?: { x: number; y: number; z: number };
  /** 'stereo' or 'spatial'. Default: 'stereo'. */
  panType?: SoundPanType;
  /** Pause instead of stop when duration is reached. Needs duration, and loop set to false. */
  pauseAtDurationReached?: boolean;
  /** Playback speed. 1 is normal, 2 is double speed. */
  playbackRate?: number;
  /** Second in the file to start from. */
  startTime?: number;
  /** Dispatch `progress` events while the sound plays, for a seek bar or a timer. */
  trackProgress?: boolean;
  /** Volume from 0 to 1. */
  volume?: number;
}

/**
 * Whether these options ask for overlapping playback.
 *
 * `overlap` is the current name and `createNewInstance` the old one, so both
 * have to be read everywhere the audio graph decides whether a sound owns its
 * nodes. `overlap` wins when both are set.
 */
export function wantsOverlap(options?: PlayOptions): boolean {
  return options?.overlap ?? options?.createNewInstance ?? false;
}
