import { SoundPanType } from "./sound-pan-type.enum";
import { DEFAULT_PANNER_CONFIG, SoundPannerConfig } from "./sound-panner-config";

export interface SoundManagerConfig {
  autoUnlock?: boolean; // Unlock audio for mobile browser that have restrictions
  autoMuteOnHidden?: boolean; // Automatically mute when page or tab of your browser is not active
  autoResumeOnFocus?: boolean; // Automatically resume when page or tab of your browser gets focus
  createNewInstance?: boolean; // Create a new instance of the sound when playing it. 
  // By default this is false. This is useful when you want to play the same sound multiple times simultaneously. 

  // ------- Loading Configuration: -------------------------------------------------------------
  // Loading Behaviour
  webAudioPreferred?: boolean; // Whether to prefer Web Audio API (default: true)
  html5AudioFallback?: boolean; // Whether to use HTML5 Audio as fallback (default: true)
  maxParallelLoads?: number; // Maximum parallel sound loads (default: 6)
  retryDelay?: number; // Delay between retry attempts in seconds (default: 0.5 seconds)

  // Network Handling
  fetchRetries?: number; // Number of retries for failed fetches (default: 2)
  fetchTimeout?: number; // Timeout for fetch requests in seconds
  corsProxy?: string; // URL of CORS proxy service, the ones I tested that work great are: 
  // corsProxy: "https://cors-anywhere.herokuapp.com/", or corsProxy: "https://corsproxy.io/?",  or your own proxy
  fetchStrategy?: 'direct-first' | 'proxy-first' | 'direct-only';

  // Security & Limits
  maxAudioSize?: number; // in bytes, currently the max is set to 50MB  (50 * 1024 * 1024)
  audioCache?: boolean; // Cache the audio file when loading.
  crossOrigin?: "anonymous" | "use-credentials" | null;
  credentialStrategy?: 'auto' | 'omit' | 'include';
  
  // -----End Loading Configuration-------------------------------------------------------------

  masterLimiter?: boolean; // Insert a limiter just before the output so many simultaneous sounds cannot clip (default: false).
  // Off by default so existing projects keep their exact sound. Turn it on when you mix
  // several sounds at once, for example a piano keyboard or a busy game scene.

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
  maxLoops?: number // if loopSounds is true and maxLoops is set, the sound will loop maxLoops times (0 or -1 for infinite)
  pannerNodeConfig?: SoundPannerConfig; // Panner settings for 3D sound
  spatialAudio?: boolean; // Enable spatial audio features
  trackProgress?: boolean; // Track progress of the sound playback. 
  // This will keep track of the process and will dispatch the 'progress' event. This is useful when you want to show the progress of the sound playback.
}

export const DEFAULT_CONFIG: SoundManagerConfig = {
  autoUnlock: true,
  autoMuteOnHidden: true,
  autoResumeOnFocus: true,
  createNewInstance: false,

  // ------- Loading Configuration: -------------------------------------------------------------
  // Loading Behaviour
  webAudioPreferred: true, // Whether to prefer Web Audio API (default: true)
  html5AudioFallback: true, // Whether to use HTML5 Audio as fallback (default: true)
  maxParallelLoads: 10, // Maximum parallel sound loads (default: 10)
  retryDelay: 0.5, // Delay between retry attempts in seconds (default: 0.5 seconds)

  // Network Handling
  fetchRetries: 2, // Number of retries for failed fetches (default: 2)
  fetchTimeout: 8, // Timeout for fetch requests in seconds
  corsProxy: undefined, // URL of CORS proxy service
  fetchStrategy: 'direct-first',

  // Security & Limits
  maxAudioSize: 50 * 1024 * 1024, // 50MB limit
  audioCache: true, // Cache the audio file when loading.
  crossOrigin: null,
  credentialStrategy: 'auto',
  
  // -----End Loading Configuration-------------------------------------------------------------

  masterLimiter: false, // Opt-in, so upgrading never changes how existing projects sound

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
