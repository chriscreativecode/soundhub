import { SoundState } from "./sound-state.interface";

export interface SoundStateInfo {
    currentTime: number;
    duration: number | null;
    state: SoundState;
    volume: number;
  }