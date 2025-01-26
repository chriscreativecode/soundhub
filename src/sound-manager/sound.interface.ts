import { SoundState } from "./sound-state.interface";

export interface Sound {
  activeSource?: AudioBufferSourceNode;
  buffer: AudioBuffer;
  currentLoopCount?: number;
  gainNode: GainNode;
  id: string;
  isFadingIn?: boolean;
  isFadingOut?: boolean;
  loop?: boolean;
  maxLoops?: number; // 0 means infinite
  originalVolume?: number;
  pannerNode?: PannerNode; // for 3D panning
  playbackRate?: number;
  pausedAt: number;
  previousVolume?: number;
  sprite?: { [key: string]: [number, number] }; // Sprite support
  startTime: number;
  state: SoundState;  
  stereoPanner?: StereoPannerNode; // just plain left to right panning
  volume: number;
}
