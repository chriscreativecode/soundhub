import { SoundPanType } from "./sound-pan-type.enum";

export interface PlayOptions {
  createNewInstance?: boolean; // Create a new instance of the sound when playing it. By default this is false. This is useful when you want to play the same sound multiple times simultaneously.
  duration?:number; // in seconds
  fadeInDuration?: number; // in seconds
  fadeInStartVolume?: number; // 0 to 1
  fadeOutDuration?: number; // in seconds
  groupId?: string; // Group ID for the sounds that will be in this group. 
  isSeeking?: boolean; // used internally for the seek method
  loop?: boolean; // default: false
  maxLoops?: number; // -1 for infinte, number > 0 for specific number of loops
  pan?: number; // -1 (left) to 1 (right)
  panSpatialPosition?: { x: number; y: number; z: number }; //  If you want to use 3D panning you must also set panType to SoundPanType.Spatial
  panType?: SoundPanType; // 'stereo' or 'spatial' (default is 'stereo') 
  pauseAtDurationReached?: boolean; // by default it will trigger the stop method when the duration is reached (when loop is false)
  playbackRate?: number; // 0.5 to 4 (normal speed is 1) 
  startTime?: number; // in seconds
  trackProgress?: boolean; // Track progress of the sound playback. This will keep track of the process and will dispatch the 'progress' event. This is useful when you want to show the progress of the sound playback.
  volume?: number; // 0 to 1
}
