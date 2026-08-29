import { SoundState } from "./sound-state.interface";

export interface SoundStateInfo {
  progress: number; // ratio from 0 to 1
  startTime: number; // in seconds
  currentTime: number; // in seconds
  elapsedTime: number; // in seconds
  adjustedElapsedTime: number; // Elapsed time adjusted for playback rate
  duration: number; // in seconds
  rawDuration: number | null; // in seconds
  playbackRate: number | null;
  state: SoundState;
  volume: number; // value from 0 to 1
  pan: number; // value form 0 to 1
  panSpatialPosition: { x: number; y: number; z: number };
}