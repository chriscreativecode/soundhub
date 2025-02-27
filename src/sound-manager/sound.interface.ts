
import { PlayOptions } from "./play-sound-options.interface";
import { SoundState } from "./sound-state.interface";

export interface Sound {
  buffer: AudioBuffer;
  source: AudioBufferSourceNode | null;
  positionTracker?: ConstantSourceNode;
  currentLoopCount?: number;
  gainNode: GainNode;
  id: string;
  isFadingIn?: boolean;
  isFadingOut?: boolean;
  originalVolume?: number;
  pannerNode?: PannerNode | null; // for 3D panning
  pan?: number; // Normal panning value -1 to 1
  panSpatialPosition? : { x: number; y: number; z: number };
  lastPanningType?: 'stereo' | 'spatial';
  pausedAt?: number;
  playOptions?: PlayOptions;
  previousVolume?: number;
  sprite?: { [key: string]: [number, number] }; // Sprite support
  offset?: number;
  startTime?: number;
  state?: SoundState;
  stereoPanner?: StereoPannerNode | null; // just plain left to right panning
  volume?: number;
  duration?: number;
  currentTime?:number;
}
