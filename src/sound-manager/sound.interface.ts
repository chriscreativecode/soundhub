import { SoundState } from "./sound-state.interface";

export interface Sound {
  id: string;
  buffer: AudioBuffer;
  gainNode: GainNode;
  stereoPanner?: StereoPannerNode; // just plain left to right panning
  pannerNode?: PannerNode; // for 3D panning
  startTime: number;
  pausedAt: number;
  volume: number;
  loop: boolean;
  maxLoops: number; // 0 means infinite
  currentLoopCount: number;
  originalVolume?: number;
  previousVolume?: number;
  activeSource?: AudioBufferSourceNode;
  state: SoundState;  
}
