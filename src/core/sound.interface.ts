
import { PlayOptions } from "./play-sound-options.interface";
import { SoundPanType } from "./sound-pan-type.enum";
import { SoundState } from "./sound-state.interface";

export interface Sound {
  buffer: AudioBuffer;
  source: AudioBufferSourceNode | null;
  positionTracker?: ConstantSourceNode;
  currentLoopCount?: number;
  gainNode: GainNode;
  groupId?: string;
  id: string;
  isFadingIn?: boolean;
  isFadingOut?: boolean;
  originalVolume?: number;
  pannerNode?: PannerNode | null; // for 3D panning
  pan?: number; // Normal panning value -1 to 1
  panSpatialOrientation?: { x: number; y: number; z: number }; // Direction the sound points in, for cone settings
  panSpatialPosition? : { x: number; y: number; z: number };
  panType?: SoundPanType; 
  pausedAt?: number;
  playOptions?: PlayOptions;
  previousVolume?: number;
  sprite?: { [key: string]: [number, number] }; // Sprite support
  startTime?: number; // in seconds
  state?: SoundState;
  stereoPanner?: StereoPannerNode | null; // just plain left to right panning
  volume?: number; // values from 0 to 1
  duration?: number; // in seconds
  currentTime?:number; // in seconds
  instanceId?:string;
  instanceCount?:number;
  baseId?: string; // Base sound ID (e.g., "game-sound_jump")
}
