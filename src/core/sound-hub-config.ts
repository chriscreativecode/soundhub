import { SoundPanType } from "./sound-pan-type.enum";
import { DEFAULT_PANNER_CONFIG, SoundPannerConfig } from "./sound-panner-config";

export interface SoundHubConfig {
  /** Unlock audio on the first touch or click, for mobile browsers that start muted. Default: true. */
  autoUnlock?: boolean;
  /** Mute everything while the page or tab is hidden. Default: true. */
  autoMuteOnHidden?: boolean;
  /** Unmute again when the page comes back, if autoMuteOnHidden muted it. A mute you set yourself stays. Default: true. */
  autoResumeOnFocus?: boolean;
  /**
   * Suspend the audio context after a stretch of silence, so a phone stops
   * spending battery on an idle audio graph. The next play() wakes it up.
   * Default: false.
   */
  autoSuspend?: boolean;
  /** Seconds of silence before autoSuspend kicks in. Default: 30. */
  autoSuspendDelay?: number;
  /** @deprecated Renamed to `overlap`. Still honoured, and removed in v7. `overlap` wins when both are set. */
  createNewInstance?: boolean;
  /**
   * Let every sound overlap itself instead of restarting. Per sound this is
   * play(id, { overlap: true }). Set it here when your whole project is sound
   * effects and restarting is never what you want. Default: false.
   */
  overlap?: boolean;

  // Loading

  /** Decode with the Web Audio API first. Default: true. */
  webAudioPreferred?: boolean;
  /** Try an HTML5 audio element when the Web Audio load fails. Default: true. */
  html5AudioFallback?: boolean;
  /** How many sounds load at the same time. Default: 10. */
  maxParallelLoads?: number;
  /** Seconds between retries of a failed fetch. Default: 0.5. */
  retryDelay?: number;
  /** Extra request headers for every audio fetch, such as { Authorization: "Bearer ..." } for files behind a token. */
  fetchHeaders?: Record<string, string>;
  /** Retries for a failed fetch. Default: 2. */
  fetchRetries?: number;
  /** Seconds before a fetch is given up. Default: 8. */
  fetchTimeout?: number;
  /**
   * Prefix for a CORS proxy, used for remote urls according to fetchStrategy.
   * For example "https://corsproxy.io/?". Run your own proxy in production.
   */
  corsProxy?: string;
  /**
   * 'direct-first' fetches the url and falls back to corsProxy, 'proxy-first'
   * does it the other way round, and 'direct-only' never uses the proxy.
   * Default: 'direct-first'.
   */
  fetchStrategy?: 'direct-first' | 'proxy-first' | 'direct-only';
  /** Largest file to load, in bytes. Default: 50 MB. */
  maxAudioSize?: number;
  /** Let the browser cache fetched audio. Default: true. */
  audioCache?: boolean;
  /** The crossOrigin setting for the HTML5 fallback and for streams. Default: null. */
  crossOrigin?: "anonymous" | "use-credentials" | null;
  /** Whether fetches send cookies. 'auto' tries with credentials when crossOrigin is "use-credentials". Default: 'auto'. */
  credentialStrategy?: 'auto' | 'omit' | 'include';

  /**
   * How many overlapping instances one sound may have at the same time. Reaching
   * it stops the oldest instance instead of stacking another one. A cheap guard
   * against a stuck key spawning a thousand voices. Default: 0, no ceiling.
   */
  maxInstancesPerSound?: number;
  /**
   * Put a limiter just before the output so many sounds at once cannot clip.
   * Off by default so a project keeps its exact sound. Turn it on when you mix
   * several sounds at once, such as a piano keyboard or a busy game scene.
   */
  masterLimiter?: boolean;

  /** Log what the hub does to the console. Default: false. */
  debug?: boolean;
  /** @deprecated Never read by the hub. Set `duration` in the play options instead. Removed in v7. */
  defaultDuration?: number;
  /** Stereo pan for new sounds, from -1 (left) to 1 (right). Default: 0. */
  defaultPan?: number;
  /** Spatial position for new sounds. Default: { x: 0, y: 0, z: 0 }. */
  defaultPanSpatialPosition?: { x: number; y: number; z: number };
  /** Pan type for new sounds. Default: SoundPanType.Stereo. */
  defaultPanType?: SoundPanType;
  /** Playback rate for new sounds. Default: 1. */
  defaultPlaybackRate?: number;
  /** Second to start new sounds from. Default: 0. */
  defaultStartTime?: number;
  /** Volume for new sounds, from 0 to 1. Default: 1. */
  defaultVolume?: number;
  /** Seconds for a fade in when none is given. Default: 0.5. */
  fadeInDuration?: number;
  /** Seconds for a fade out when none is given. Default: 0.5. */
  fadeOutDuration?: number;
  /** Loop new sounds. Default: false. */
  loopSounds?: boolean;
  /** How often a looping sound plays. 0 or -1 loops forever. Default: -1. */
  maxLoops?: number;
  /** Panner settings for 3D sound. Default: DEFAULT_PANNER_CONFIG. */
  pannerNodeConfig?: SoundPannerConfig;
  /** Enable spatial audio, when the browser supports it. Default: true. */
  spatialAudio?: boolean;
  /** Dispatch `progress` events while a sound plays, for a seek bar or a timer. Default: true. */
  trackProgress?: boolean;
}

export const DEFAULT_CONFIG: SoundHubConfig = {
  autoUnlock: true,
  autoMuteOnHidden: true,
  autoResumeOnFocus: true,
  autoSuspend: false,
  autoSuspendDelay: 30,
  overlap: false,

  webAudioPreferred: true,
  html5AudioFallback: true,
  maxParallelLoads: 10,
  retryDelay: 0.5,
  fetchHeaders: undefined,
  fetchRetries: 2,
  fetchTimeout: 8,
  corsProxy: undefined,
  fetchStrategy: 'direct-first',
  maxAudioSize: 50 * 1024 * 1024,
  audioCache: true,
  crossOrigin: null,
  credentialStrategy: 'auto',

  maxInstancesPerSound: 0,

  masterLimiter: false,

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
