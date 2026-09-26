import { SoundState } from "./sound-state.interface";

export interface SoundStateInfo {
  progress: number; // ratio from 0 to 1
  startTime: number; // in seconds
  currentTime: number; // position in the file, in seconds, whatever the playback rate
  elapsedTime: number; // position in the file, in seconds
  adjustedElapsedTime: number; // the time it took to hear that far, at the current playback rate
  duration: number; // length of the file, in seconds
  rawDuration: number | null; // length of the file, in seconds
  playbackRate: number | null;
  state: SoundState;
  volume: number; // value from 0 to 1
  pan: number; // from -1 (left) to 1 (right)
  panSpatialPosition: { x: number; y: number; z: number };
}