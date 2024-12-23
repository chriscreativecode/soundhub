export interface Sound {
    buffer: AudioBuffer | null;
    gainNode: GainNode;
    id: string;
    isPaused: boolean;
    isPlaying: boolean;
    loop?: boolean;
    pannerNode?: PannerNode;
    pausedAt: number;
    sources: AudioBufferSourceNode[];
    startTime: number;
    url: string;
    volume: number;
}