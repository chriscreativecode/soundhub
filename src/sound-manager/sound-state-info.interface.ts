import { SoundState } from "./sound-state.interface";

export interface SoundStateInfo {
    state: SoundState;
    volume: number;
    duration: number | null;
  }