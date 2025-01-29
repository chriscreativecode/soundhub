import { playOptions } from "./play-sound-options.interface";
import { SoundState } from "./sound-state.interface";

export interface Sound {
  buffer: AudioBuffer;
  currentLoopCount?: number;
  gainNode: GainNode;
  id: string;
  isFadingIn?: boolean;
  isFadingOut?: boolean;
  originalVolume?: number;
  pannerNode?: PannerNode; // for 3D panning
  pausedAt: number;
  playOptions?: playOptions;
  previousVolume?: number;
  sprite?: { [key: string]: [number, number] }; // Sprite support
  startTime: number;
  state: SoundState;
  stereoPanner?: StereoPannerNode; // just plain left to right panning
  volume: number;
  duration?: number;
  currentTime?:number;
}
