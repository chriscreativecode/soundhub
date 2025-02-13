import { SoundState } from "./sound-state.interface";

export interface SoundStateInfo {
    currentTime: number;
    duration: number | null;
    playbackRate : number | null;
    state: SoundState;
    volume: number;
  }