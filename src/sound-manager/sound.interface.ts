export interface Sound {
    id: string;
    buffer: AudioBuffer | null;
    url: string;
    sources: AudioBufferSourceNode[];
    gainNode: GainNode;
    startTime: number;
    pausedAt: number;
    isPlaying: boolean;
    isPaused: boolean;
    volume: number;
}