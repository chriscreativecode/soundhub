import { DEFAULT_PANNER_CONFIG, SoundPannerConfig } from "./sound-panner-config";

export interface SoundManagerConfig {
  autoMuteOnHidden?: boolean; // Automatically mute when page or tab of your browser is not active
  autoResumeOnFocus?: boolean; // Automatically resume when page or tab of your browser gets focus
  crossOrigin?: "anonymous" | "use-credentials" | null; // CORS setting for audio files
  debug?: boolean; // Enable debug logging
  defaultPlaybackRate: number // The default playbackRate is 1
  defaultPan?: number; // The default pan value = 0, in the center. Posiible values are (-1 to 1)
  defaultVolume?: number; // Default volume for new sounds (0-1)
  fadeInDuration?: number; // Default fade-in duration in milliseconds
  fadeOutDuration?: number; // Default fade-out duration in milliseconds
  spatialAudio?: boolean; // Enable spatial audio features
  loopSounds?: boolean // Loop all sounds by default
  maxLoops?: number // if loopSounds is true and maxLoops is set, the sound will loop maxLoops times  (-1 is for infinite)
  pannerNodeConfig?: SoundPannerConfig; // Panner settings for 3D sound
}

export const DEFAULT_CONFIG: SoundManagerConfig = {
  autoMuteOnHidden: true,
  autoResumeOnFocus: true,
  crossOrigin: null,
  debug: false,
  defaultPlaybackRate: 1,
  defaultPan: 0,
  defaultVolume: 1,
  fadeInDuration: 500,
  fadeOutDuration: 500,
  spatialAudio: true,
  loopSounds: false,
  maxLoops: -1,
  pannerNodeConfig: DEFAULT_PANNER_CONFIG,
};
