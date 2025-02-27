import { SoundState } from "./sound-state.interface";

export interface SoundStateInfo {
  progress: number;
  startTime: number;
  currentTime: number;
  elapsedTime: number;
  adjustedElapsedTime: number; // Elapsed time adjusted for playback rate
  duration: number;
  rawDuration: number | null;
  playbackRate: number | null;
  state: SoundState;
  volume: number;
  pan: number;
  panSpatialPosition: { x: number; y: number; z: number };
}