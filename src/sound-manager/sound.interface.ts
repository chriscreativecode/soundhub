import { SoundState } from "./sound-state.interface";

export interface Sound {
    id: string;
    buffer: AudioBuffer;
    sources: AudioBufferSourceNode[];
    gainNode: GainNode;
    stereoPanner?: StereoPannerNode;
    pannerNode?: PannerNode;
    startTime: number;
    pausedAt: number;
    isPlaying: boolean;
    isPaused: boolean;
    volume: number;
    state: SoundState;
    currentLoopCount: number;  // Make this required, not optional
    loopCount?: number;
  }