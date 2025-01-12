export interface PlaySoundOptions {
    fadeIn?: number;
    fadeOut?: number;
    pan?: number;
    startTime?: number;
    volume?: number;
}

export interface Sound {
    id: string;
    buffer: AudioBuffer;
    gainNode: GainNode;
    stereoPanner?: StereoPannerNode;
    pannerNode?: PannerNode;
    startTime: number;
    pausedAt: number;
    volume: number;
    originalVolume?: number;
    previousVolume?: number;
    activeSource?: AudioBufferSourceNode;
    state: SoundState;
}

export interface SoundEvent {
    currentTime?: number;
    error?: Error;
    soundId?: string;
    timestamp?: number;
    type: SoundEventsEnum;
    volume?: number;
    isMuted?: boolean;
    pan?: number;
    position?: {
        x: number;
        y: number;
        z: number;
    };
    previousPan?: number;
    resetOptions?: SoundResetOptions;
}

export enum SoundEventsEnum {
    ENDED = "ended",
    ERROR = "error",
    FADE_IN_COMPLETED = "fade_in_completed",
    FADE_OUT_COMPLETED = "fade_out_completed",
    FADE_MASTER_IN_COMPLETED = "fade_master_in_completed",
    FADE_MASTER_OUT_COMPLETED = "fade_master_out_completed",
    MASTER_VOLUME_CHANGED = "master_volume_changed",
    MUTED = "muted",
    MUTE_GLOBAL = "mute_global",
    UNMUTE_GLOBAL = "unmute_global",
    MASTER_PAN_CHANGED = "master_pan_changed",
    PAN_CHANGED = "pan_changed",
    PAUSED = "paused",
    RESET = "reset",
    RESUMED = "resumed",
    SEEKED = "seeked",
    SPATIAL_POSITION_CHANGED = "spatial_position_changed",
    STARTED = "started",
    STOPPED = "stopped",
    UNMUTED = "unmuted",
    VOLUME_CHANGED = "volume_changed"
}

export interface SoundManagerConfig {
    autoMuteOnHidden?: boolean;
    autoResumeOnFocus?: boolean;
    crossOrigin?: "anonymous" | "use-credentials" | null;
    debug?: boolean;
    defaultPan?: number;
    defaultVolume?: number;
    fadeInDuration?: number;
    fadeOutDuration?: number;
    spatialAudio?: boolean;
}

export interface SoundManagerInterface {
    playSound(id: string, options?: PlaySoundOptions): void;
    pauseSound(id: string): void;
    resumeSound(id: string): void;
    stopSound(id: string): void;
    seekTo(id: string, time: number): void;
    setVolumeById(id: string, volume: number): void;
    getVolumeById(id: string): number;
    setGlobalVolume(volume: number): void;
    getGlobalVolume(): number;
    muteAllSounds(): void;
    unmuteAllSounds(): void;
    muteSoundById(id: string): void;
    unmuteSoundById(id: string): void;
    toggleMute(): void;
    preloadSounds(soundsToLoad: { id: string; url: string; }[]): Promise<void>;
    updateSoundUrl(id: string, newUrl: string): Promise<void>;
    isSoundLoaded(id: string): boolean;
    hasSound(id: string): boolean;
    isPlaying(id: string): boolean;
    isPaused(id: string): boolean;
    getSoundState(id: string): SoundStateInfo;
    stopAllSounds(): void;
    pauseAllSounds(): void;
    resumeAllSounds(): void;
    reset(options?: SoundResetOptions): void;
    fadeIn(id: string, duration: number, startVolume?: number, endVolume?: number): void;
    fadeOut(id: string, duration?: number, startVolume?: number, endVolume?: number): void;
    fadeMasterIn(duration?: number, startVolume?: number, endVolume?: number): void;
    fadeMasterOut(duration?: number, startVolume?: number, endVolume?: number): void;
    isSpatialAudioEnabled(): boolean;
    setSoundPosition(id: string, x: number, y: number, z: number): void;
    resetSoundPosition(id: string): void;
    removeSpatialEffect(id: string): void;
    isSpatialAudioActive(id: string): boolean;
    setPan(id: string, pan: number): void;
    removePan(id: string): void;
    setMasterPan(value: number): void;
    getMasterPan(): number;
    resetMasterPan(): void;
    isStereoPanActive(id: string): boolean;
    getConfig(): Readonly<SoundManagerConfig>;
    getSound(id: string): Sound | undefined;
    getSoundIds(): string[];
    isStopped(id: string): boolean;
    destroy(): void;
    addEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void;
    removeEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void;
}

export interface SoundResetOptions {
    keepVolumes?: boolean;
    keepPanning?: boolean;
    keepSpatial?: boolean;
    unloadSounds?: boolean;
}

export enum SoundState {
    Playing = "playing",
    Paused = "paused",
    Stopped = "stopped"
}

export interface SoundStateInfo {
    currentTime: number;
    duration: number | null;
    state: SoundState;
    volume: number;
}