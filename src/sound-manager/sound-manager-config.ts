import { SoundPanType } from "./sound-pan-type.enum";
import { DEFAULT_PANNER_CONFIG, SoundPannerConfig } from "./sound-panner-config";

export interface SoundManagerConfig {
  autoMuteOnHidden?: boolean; // Automatically mute when page or tab of your browser is not active
  autoResumeOnFocus?: boolean; // Automatically resume when page or tab of your browser gets focus
  createNewInstance?: boolean; // Create a new instance of the sound when playing it. By default this is false. This is useful when you want to play the same sound multiple times simultaneously. 
  crossOrigin?: "anonymous" | "use-credentials" | null; // CORS setting for audio files
  debug?: boolean; // Enable debug logging
  defaultDuration?: number; // Default duration for new sounds, default is undefined (full length of the sound)
  defaultPan?: number; // The default pan value = 0, in the center. Posiible values are (-1 to 1)
  defaultPanSpatialPosition?: { x: number; y: number; z: number };
  defaultPanType?: SoundPanType; // Default pan type
  defaultPlaybackRate?: number // The default playbackRate is 1
  defaultStartTime?: number; // Default start time for new sounds
  defaultVolume?: number; // Default volume for new sounds (0-1)
  fadeInDuration?: number; // Default fade-in duration in seconds
  fadeOutDuration?: number; // Default fade-out duration in seconds
  loopSounds?: boolean // Loop all sounds by default
  maxLoops?: number // if loopSounds is true and maxLoops is set, the sound will loop maxLoops times  (-1 is for infinite)
  pannerNodeConfig?: SoundPannerConfig; // Panner settings for 3D sound
  spatialAudio?: boolean; // Enable spatial audio features
  trackProgress?: boolean; // Track progress of the sound playback. This will keep track of the process and will dispatch the 'progress' event. This is useful when you want to show the progress of the sound playback.
}

export const DEFAULT_CONFIG: SoundManagerConfig = {
  autoMuteOnHidden: true,
  autoResumeOnFocus: true,
  createNewInstance: false,
  crossOrigin: null,
  debug: false,
  defaultDuration: undefined,
  defaultPan: 0,
  defaultPanSpatialPosition: { x: 0, y: 0, z: 0 },
  defaultPanType: SoundPanType.Stereo,
  defaultPlaybackRate: 1,
  defaultStartTime: 0,
  defaultVolume: 1,
  fadeInDuration: 0.5,
  fadeOutDuration: 0.5,
  loopSounds: false,
  maxLoops: -1,
  pannerNodeConfig: DEFAULT_PANNER_CONFIG,
  spatialAudio: true,
  trackProgress: true,
};
