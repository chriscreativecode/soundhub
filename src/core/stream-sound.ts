import { SoundPanType } from "./sound-pan-type.enum";
import { SoundState } from "./sound-state.interface";

/**
 * Options for a streamed sound.
 *
 * A stream is backed by an HTMLAudioElement instead of a decoded AudioBuffer,
 * so the browser pulls the file in as it plays rather than downloading and
 * decoding it up front. That is what makes a one-hour recording practical: a
 * buffered hour of stereo 44.1 kHz costs roughly 600 MB of memory and a long
 * decode before the first sound comes out.
 */
export interface StreamOptions {
  /** 0 to 1. Defaults to the hub's defaultVolume. */
  volume?: number;
  /** -1 (left) to 1 (right). Stereo panning only. */
  pan?: number;
  /** Start over when the end is reached. */
  loop?: boolean;
  /** 0.5 to 4. Podcast listeners want this one. */
  playbackRate?: number;
  /** Second to start from when play() is called with no explicit seek. */
  startTime?: number;
  /** Dispatch `progress` events while playing. Defaults to the hub's config. */
  trackProgress?: boolean;
  /**
   * How much the browser should fetch before playback starts.
   * 'metadata' (the default) fetches only duration and headers, which is what
   * you want for a long file; 'auto' lets the browser buffer ahead.
   */
  preload?: "none" | "metadata" | "auto";
}

/**
 * A sound backed by a media element rather than a buffer.
 *
 * The element is routed through MediaElementAudioSourceNode into the same chain
 * a buffered sound uses: gain, then panning, then the master bus. Master volume,
 * master pan and the limiter therefore apply to streams the same way they apply
 * to everything else.
 *
 * @internal
 */
export interface StreamSound {
  id: string;
  url: string;
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gainNode: GainNode;
  stereoPanner: StereoPannerNode | null;
  pannerNode: PannerNode | null;
  panType: SoundPanType;
  panSpatialPosition: { x: number; y: number; z: number };
  pan: number;
  volume: number;
  previousVolume?: number;
  isMuted: boolean;
  state: SoundState;
  startOffset: number;
  options: StreamOptions;
  onEnded: () => void;
  onError: () => void;
}
