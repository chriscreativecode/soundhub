import { SoundPanType } from "./sound-pan-type.enum";

export interface PlayOptions {
  /** @deprecated Renamed to `overlap`. Still honoured, and removed in v7. */
  createNewInstance?: boolean; // Old name for overlap. Both work; overlap wins when you set both.
  duration?:number; // in seconds
  fadeInDuration?: number; // in seconds
  fadeInStartVolume?: number; // 0 to 1
  fadeOutDuration?: number; // in seconds, when you play a sound it will immidiately start fading out
  fadeOutEndVolume?: number; // 0 to 1
  fadeOutBeforeEndDuration?: number; // in seconds, fade out before the sound ends
  groupId?: string; // Group ID for the sounds that will be in this group.
  isSeeking?: boolean; // used internally for the seek method
  loop?: boolean; // default: false
  maxLoops?: number; // 0 or -1 for infinite, number > 0 for specific number of loops
  seamlessLoop?: boolean; // Loop inside the audio graph instead of restarting the source, so there is no gap between iterations. Requires loop: true. Trade-off: the loop never ends by itself, so maxLoops is ignored and no 'loop-completed' event is dispatched. Use it for beds and drones, where a restart is audible.
  overlap?: boolean; // Let the sound overlap itself instead of restarting. Default: false. Every call gets its own instance with the id "<id>:<n>", which is what the play() return value and the event's instanceId carry. Use it for footsteps, lasers and clicks. Not available on streams.
  pan?: number; // -1 (left) to 1 (right)
  panSpatialOrientation?: { x: number; y: number; z: number }; // Direction the sound points in. Only does something when the panner has a cone set through coneInnerAngle and coneOuterAngle.
  panSpatialPosition?: { x: number; y: number; z: number }; //  If you want to use 3D panning you must also set panType to SoundPanType.Spatial
  panType?: SoundPanType; // 'stereo' or 'spatial' (default is 'stereo')
  pauseAtDurationReached?: boolean; // This will only work if you set the duration and if that duration is reached it will pause. Note: Loop must be false.
  playbackRate?: number; // 0.5 to 4 (normal speed is 1)
  startTime?: number; // in seconds
  trackProgress?: boolean; // Track progress of the sound playback. This will keep track of the process and will dispatch the 'progress' event. This is useful when you want to show the progress of the sound playback.
  volume?: number; // 0 to 1
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
