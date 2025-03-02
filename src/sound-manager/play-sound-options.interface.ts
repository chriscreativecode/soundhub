export interface PlayOptions {
  fadeIn?: number; // in seconds
  fadeInStartVolume?: number; // 0 to 1
  fadeOut?: number; // in seconds
  pan?: number; // -1 (left) to 1 (right)
  panSpatialPosition?: { x: number; y: number; z: number };
  startTime?: number; // in seconds
  volume?: number; // 0 to 1
  loop?: boolean; // default: false
  maxLoops?: number; // -1 for infinte, number > 0 for specific number of loops
  playbackRate?: number;
  duration?:number; // in seconds
  pauseAtDurationReached?: boolean; // by default it will trigger the stop method when the duration is reached
  isSeeking?: boolean; // used internally for the seek method
}
