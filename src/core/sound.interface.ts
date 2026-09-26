
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
  isMuted?: boolean;
  originalVolume?: number;
  /** The 3D panner, when the sound uses spatial panning. */
  pannerNode?: PannerNode | null;
  /** Stereo pan, from -1 (left) to 1 (right). */
  pan?: number;
  /** Direction the sound points in, for the cone settings. */
  panSpatialOrientation?: { x: number; y: number; z: number };
  panSpatialPosition? : { x: number; y: number; z: number };
  panType?: SoundPanType; 
  pausedAt?: number;
  playOptions?: PlayOptions;
  previousVolume?: number;
  /** The ranges given to setSoundSprite, as [start, end] in seconds. */
  sprite?: { [key: string]: [number, number] };
  /** AudioContext time at which the file would have been at 0. The position while playing is worked out from it. */
  startTime?: number;
  state?: SoundState;
  /** Left to right panning. */
  stereoPanner?: StereoPannerNode | null;
  /** From 0 to 1. */
  volume?: number;
  duration?: number;
  /** Position in the file in seconds, kept while paused. */
  currentTime?: number;
  instanceId?:string;
  instanceCount?:number;
  baseId?: string;
}
