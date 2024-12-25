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
    currentLoopCount: number;  // Make this required, not optional
    loopCount?: number;
  }