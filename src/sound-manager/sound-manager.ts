import { Sound } from "./sound.interface";

export class SoundManager {
    private readonly context: AudioContext;
    private sounds: Map<string, Sound>;
    private masterGainNode: GainNode;
    private isInitialized: boolean = false;
    private previousGlobalVolume: number = 1;
    private isMuted: boolean = false;

    constructor() {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            this.context = new AudioContext();
            this.sounds = new Map();
            this.masterGainNode = this.context.createGain();
            this.masterGainNode.connect(this.context.destination);
            this.setupContextResumeHandlers();
        } catch (error) {
            console.error('Failed to initialize SoundManager:', error);
            throw new Error('Audio context initialization failed');
        }
    }

    private setupContextResumeHandlers(): void {
        const resumeHandler = async (event: Event) => {
            await this.resumeAudioContext();
            if (this.isInitialized) {
                ['click', 'keydown', 'touchstart'].forEach(eventType => {
                    document.removeEventListener(eventType, resumeHandler);
                });
            }
        };

        ['click', 'keydown', 'touchstart'].forEach(eventType => {
            document.addEventListener(eventType, resumeHandler, { once: true });
        });
    }

    private async resumeAudioContext(): Promise<void> {
        if (this.context.state === 'suspended') {
            try {
                await this.context.resume();
                this.isInitialized = true;
                console.debug('AudioContext resumed successfully');
            } catch (error) {
                console.error('Failed to resume AudioContext:', error);
                throw error;
            }
        }
    }

    public async preloadSounds(soundsToLoad: { id: string; url: string }[]): Promise<void> {
        try {
            const loadPromises = soundsToLoad.map(async ({ id, url }) => {
                if (this.sounds.has(id)) {
                    console.warn(`Sound with id ${id} already exists. Skipping.`);
                    return;
                }

                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

                    const gainNode = this.context.createGain();
                    gainNode.connect(this.masterGainNode);

                    this.sounds.set(id, {
                        id,
                        buffer: audioBuffer,
                        url,
                        sources: [],
                        gainNode,
                        startTime: 0,
                        pausedAt: 0,
                        isPlaying: false,
                        isPaused: false,
                        volume: 1
                    });

                    console.debug(`Sound ${id} loaded successfully`);
                } catch (error) {
                    console.error(`Error loading sound ${id}:`, error);
                    throw error;
                }
            });

            await Promise.all(loadPromises);
        } catch (error) {
            console.error('Error in preloadSounds:', error);
            throw error;
        }
    }

    public async playSound(id: string, volume?: number): Promise<void> {
        try {
            if (this.context.state === 'suspended') {
                await this.resumeAudioContext();
            }

            const sound = this.sounds.get(id);
            if (!sound || !sound.buffer) {
                throw new Error(`Sound ${id} not found or not loaded properly`);
            }

            const source = this.context.createBufferSource();
            source.buffer = sound.buffer;
            source.connect(sound.gainNode);

            if (volume !== undefined) {
                this.setVolumeById(id, volume);
            }

            sound.sources.push(source);
            sound.isPlaying = true;
            sound.isPaused = false;
            sound.startTime = this.context.currentTime;

            source.start(0);

            return new Promise((resolve) => {
                source.onended = () => {
                    this.cleanupSource(sound, source);
                    resolve();
                };
            });
        } catch (error) {
            console.error(`Error playing sound ${id}:`, error);
            throw error;
        }
    }

    private cleanupSource(sound: Sound, source: AudioBufferSourceNode): void {
        const index = sound.sources.indexOf(source);
        if (index !== -1) {
            sound.sources.splice(index, 1);
        }
        if (sound.sources.length === 0) {
            sound.isPlaying = false;
        }
    }

    public pauseSound(id: string): void {
        try {
            const sound = this.sounds.get(id);
            if (!sound || !sound.isPlaying || sound.isPaused) return;

            sound.pausedAt = this.context.currentTime - sound.startTime;
            sound.sources.forEach(source => source.stop());
            sound.sources = [];
            sound.isPaused = true;
            sound.isPlaying = false;
        } catch (error) {
            console.error(`Error pausing sound ${id}:`, error);
        }
    }

    public resumeSound(id: string): void {
        try {
            const sound = this.sounds.get(id);
            if (!sound || !sound.isPaused || !sound.buffer) return;

            const source = this.context.createBufferSource();
            source.buffer = sound.buffer;
            source.connect(sound.gainNode);

            sound.sources.push(source);
            sound.isPlaying = true;
            sound.isPaused = false;
            sound.startTime = this.context.currentTime - sound.pausedAt;

            source.start(0, sound.pausedAt);
        } catch (error) {
            console.error(`Error resuming sound ${id}:`, error);
        }
    }

    public stopAllSounds(): void {
        try {
            this.sounds.forEach(sound => {
                sound.sources.forEach(source => source.stop());
                sound.sources = [];
                sound.isPlaying = false;
                sound.isPaused = false;
                sound.pausedAt = 0;
            });
        } catch (error) {
            console.error('Error stopping all sounds:', error);
        }
    }

    public pauseAllSounds(): void {
        this.sounds.forEach((sound, id) => {
            if (sound.isPlaying) {
                this.pauseSound(id);
            }
        });
    }

    public resumeAllSounds(): void {
        this.sounds.forEach((sound, id) => {
            if (sound.isPaused) {
                this.resumeSound(id);
            }
        });
    }

    public setVolumeById(id: string, volume: number): void {
        const sound = this.sounds.get(id);
        if (sound) {
            sound.volume = Math.max(0, Math.min(1, volume));
            sound.gainNode.gain.value = sound.volume;
        }
    }

    public getVolumeById(id: string): number {
        const sound = this.sounds.get(id);
        return sound ? sound.volume : 0;
    }

    public setGlobalVolume(volume: number): void {
        this.previousGlobalVolume = Math.max(0, Math.min(1, volume));
        if (!this.isMuted) {
            this.masterGainNode.gain.value = this.previousGlobalVolume;
        }
    }

    public getGlobalVolume(): number {
        return this.isMuted ? 0 : this.masterGainNode.gain.value;
    }

    public muteAllSounds(): void {
        this.isMuted = true;
        this.masterGainNode.gain.value = 0;
    }

    public unmuteAllSounds(): void {
        this.isMuted = false;
        this.masterGainNode.gain.value = this.previousGlobalVolume;
    }

    public muteSoundById(id: string): void {
        const sound = this.sounds.get(id);
        if (sound) {
            sound.gainNode.gain.value = 0;
        }
    }

    public unmuteSoundById(id: string): void {
        const sound = this.sounds.get(id);
        if (sound) {
            sound.gainNode.gain.value = sound.volume;
        }
    }

    public toggleMute(): void {
        this.isMuted = !this.isMuted;
        this.masterGainNode.gain.value = this.isMuted ? 0 : this.previousGlobalVolume;
    }

    public isPlaying(id: string): boolean {
        const sound = this.sounds.get(id);
        return sound ? sound.isPlaying : false;
    }

    public isPaused(id: string): boolean {
        const sound = this.sounds.get(id);
        return sound ? sound.isPaused : false;
    }

    public dispose(): void {
        try {
            this.stopAllSounds();
            this.sounds.clear();
            this.context.close();
        } catch (error) {
            console.error('Error disposing SoundManager:', error);
        }
    }

    public getSoundIds(): string[] {
        return Array.from(this.sounds.keys());
    }

    public getSoundState(id: string): {
        isPlaying: boolean;
        isPaused: boolean;
        volume: number;
        duration: number | null;
    } | null {
        const sound = this.sounds.get(id);
        if (!sound) return null;

        return {
            isPlaying: sound.isPlaying,
            isPaused: sound.isPaused,
            volume: sound.volume,
            duration: sound.buffer ? sound.buffer.duration : null
        };
    }
}