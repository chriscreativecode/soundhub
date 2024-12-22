import { SoundStateInfo } from "./sound-state-info.interface";
import { SoundState } from "./sound-state.interface";
import { Sound } from "./sound.interface";

export class SoundManager {
  private readonly context: AudioContext;
  private sounds: Map<string, Sound> = new Map();
  private masterGainNode: GainNode;
  private previousGlobalVolume: number = 1;
  private isMuted: boolean = false;

  constructor() {
    try {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioContext({ latencyHint: "interactive" });
      this.masterGainNode = this.context.createGain();
      this.masterGainNode.connect(this.context.destination);

      if (this.context.state !== "suspended") {
        this.context.suspend();
      }

      this.setupContextResumeHandlers();
    } catch (error) {
      this.handleError("constructor, initialize", error);
    }
  }

  private setupContextResumeHandlers(): void {
    const resumeContext = async () => {
      if (this.context.state === "suspended") {
        try {
          await this.context.resume();
          ["click", "touchstart", "keydown"].forEach((event) => {
            document.removeEventListener(event, resumeContext);
          });
        } catch (error) {
          this.handleError("resuming context", error);
        }
      }
    };

    ["click", "touchstart", "keydown"].forEach((event) => {
      document.addEventListener(event, resumeContext, { once: true });
    });
  }

  private async ensureContext(): Promise<void> {
    if (this.context.state === "suspended") {
      await this.resumeAudioContext();
    }
  }

  /**
   * Resumes the audio context
   * @throws Error if context fails to resume
   */
  public async resumeAudioContext(): Promise<void> {
    if (this.context.state === "suspended") {
      try {
        await this.context.resume();
      } catch (error) {
        this.handleError("resuming audio context", error);
      }
    }
  }

  /**
   * Checks if the audio context is ready
   * @returns boolean indicating if audio is ready to play
   */
  public isAudioReady(): boolean {
    return this.context.state === "running";
  }

  /**
   * Preloads multiple sounds for later use
   * @param soundsToLoad Array of sound configurations to load
   * @throws Error if loading fails
   */
  public async preloadSounds(
    soundsToLoad: { id: string; url: string }[]
  ): Promise<void> {
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
            volume: 1,
          });

          console.debug(`Sound ${id} loaded successfully`);
        } catch (error) {
          this.handleError("loading sound", error, id);
        }
      });

      await Promise.all(loadPromises);
    } catch (error) {
      this.handleError("preloading sounds", error);
    }
  }

  public async playSound(id: string, volume?: number): Promise<void> {
    try {
      await this.ensureContext();
      const sound = this.validateSound(id);

      // Stop any existing playback of this sound
      if (sound.isPlaying) {
        sound.sources.forEach((source) => source.stop());
        sound.sources = [];
      }

      const source = this.context.createBufferSource();
      source.buffer = sound.buffer;
      source.connect(sound.gainNode);

      if (volume !== undefined) {
        this.setVolumeById(id, this.setValidatedVolume(volume));
      }

      sound.sources.push(source);
      this.updateSoundState(sound, SoundState.Playing);
      sound.startTime = this.context.currentTime;
      sound.pausedAt = 0;

      source.start(0);

      return new Promise<void>((resolve) => {
        source.onended = () => {
          // Only update state to stopped if the sound isn't paused
          if (!sound.isPaused) {
            this.cleanupSource(sound, source);
            sound.isPlaying = false;
            sound.isPaused = false;
          }
          resolve();
        };
      });
    } catch (error) {
      this.handleError("playing sound", error, id);
    }
  }

  /**
   * Plays a sound by its ID
   * @param id The ID of the sound to play
   * @param volume Optional volume level (0-1)
   * @returns Promise that resolves when the sound ends
   */
  public pauseSound(id: string): void {
    try {
      const sound = this.validateSound(id);
      if (!sound.isPlaying || sound.isPaused) return;

      // Calculate how much of the sound has played
      sound.pausedAt = this.context.currentTime - sound.startTime;

      // Stop current sources without triggering onended
      sound.sources.forEach((source) => {
        source.onended = null; // Remove onended handler
        source.stop();
      });
      sound.sources = [];

      // Update state to paused
      sound.isPlaying = false;
      sound.isPaused = true;

      console.debug("Pause state:", {
        id,
        isPlaying: sound.isPlaying,
        isPaused: sound.isPaused,
        pausedAt: sound.pausedAt,
      });
    } catch (error) {
      this.handleError("pausing sound", error, id);
    }
  }

  /**
   * Updates the state of a sound
   * @param sound The sound to update
   * @param state The new state to set
   */
  private updateSoundState(sound: Sound, state: SoundState): void {
    switch (state) {
      case SoundState.Playing:
        sound.isPlaying = true;
        sound.isPaused = false;
        break;
      case SoundState.Paused:
        sound.isPlaying = false;
        sound.isPaused = true;
        // Don't reset pausedAt here
        break;
      case SoundState.Stopped:
        sound.isPlaying = false;
        sound.isPaused = false;
        sound.pausedAt = 0;
        break;
    }
  }
  /**
   * Validates and returns a sound object by its ID
   * @param id The ID of the sound to validate
   * @throws Error if sound is not found or not properly loaded
   */
  private validateSound(id: string): Sound {
    const sound = this.sounds.get(id);
    if (!sound?.buffer) {
      this.handleError(
        "validating sound",
        "Sound not found or not loaded properly",
        id
      );
    }
    return sound!;
  }

  /**
   * Ensures volume is within valid range (0-1)
   * @param volume The volume to validate
   * @returns Validated volume value
   */
  private setValidatedVolume(volume: number): number {
    return Math.max(0, Math.min(1, volume));
  }

  /**
   * Cleans up a sound source after it ends
   * @param sound The sound containing the source
   * @param source The source to clean up
   */
  private cleanupSource(sound: Sound, source: AudioBufferSourceNode): void {
    const index = sound.sources.indexOf(source);
    if (index !== -1) {
      sound.sources.splice(index, 1);
    }
    if (sound.sources.length === 0) {
      this.updateSoundState(sound, SoundState.Stopped);
    }
  }

  /**
   * Resumes playback of a paused sound
   * @param id The ID of the sound to resume
   */
  public resumeSound(id: string): void {
    try {
      const sound = this.validateSound(id);
      if (!sound.isPaused) return;

      const source = this.context.createBufferSource();
      source.buffer = sound.buffer;
      source.connect(sound.gainNode);

      // Start playing from the paused position
      const offset = sound.pausedAt;
      source.start(0, offset);

      sound.sources.push(source);
      sound.startTime = this.context.currentTime - offset; // Adjust start time to account for the offset
      this.updateSoundState(sound, SoundState.Playing);

      // Set up onended handler
      source.onended = () => {
        this.cleanupSource(sound, source);
      };
    } catch (error) {
      this.handleError("resuming sound", error, id);
    }
  }

  /**
   * Stops playback of a sound
   * @param id The ID of the sound to stop
   */
  public stopSound(id: string): void {
    try {
      const sound = this.validateSound(id);
      sound.sources.forEach((source) => source.stop());
      sound.sources = [];
      this.updateSoundState(sound, SoundState.Stopped);
    } catch (error) {
      this.handleError("stopping sound", error, id);
    }
  }

  /**
   * Stops all currently playing sounds
   */
  public stopAllSounds(): void {
    try {
      this.sounds.forEach((sound) => {
        sound.sources.forEach((source) => source.stop());
        sound.sources = [];
        this.updateSoundState(sound, SoundState.Stopped);
      });
    } catch (error) {
      this.handleError("stopping all sounds", error);
    }
  }

  /**
   * Pauses all currently playing sounds
   */
  public pauseAllSounds(): void {
    this.sounds.forEach((sound, id) => {
      if (sound.isPlaying) {
        this.pauseSound(id);
      }
    });
  }

  /**
   * Resumes all paused sounds
   */
  public resumeAllSounds(): void {
    this.sounds.forEach((sound, id) => {
      if (sound.isPaused) {
        this.resumeSound(id);
      }
    });
  }

  /**
   * Sets the volume for a specific sound
   * @param id The ID of the sound
   * @param volume The volume level (0-1)
   */
  public setVolumeById(id: string, volume: number): void {
    try {
      const sound = this.validateSound(id);
      sound.volume = this.setValidatedVolume(volume);
      sound.gainNode.gain.value = sound.volume;
    } catch (error) {
      this.handleError("setting volume", error, id);
    }
  }

  /**
   * Gets the current volume of a sound
   * @param id The ID of the sound
   * @returns The current volume level
   */
  public getVolumeById(id: string): number {
    const sound = this.validateSound(id);
    return sound.volume;
  }

  /**
   * Sets the global volume for all sounds
   * @param volume The volume level (0-1)
   */
  public setGlobalVolume(volume: number): void {
    this.previousGlobalVolume = this.setValidatedVolume(volume);
    if (!this.isMuted) {
      this.masterGainNode.gain.value = this.previousGlobalVolume;
    }
  }

  /**
   * Gets the current global volume
   * @returns The current global volume level
   */
  public getGlobalVolume(): number {
    return this.isMuted ? 0 : this.masterGainNode.gain.value;
  }

  /**
   * Mutes all sounds
   */
  public muteAllSounds(): void {
    this.isMuted = true;
    this.masterGainNode.gain.value = 0;
  }

  /**
   * Unmutes all sounds
   */
  public unmuteAllSounds(): void {
    this.isMuted = false;
    this.masterGainNode.gain.value = this.previousGlobalVolume;
  }

  /**
   * Mutes a specific sound
   * @param id The ID of the sound to mute
   */
  public muteSoundById(id: string): void {
    try {
      const sound = this.validateSound(id);
      sound.gainNode.gain.value = 0;
    } catch (error) {
      this.handleError("muting sound", error, id);
    }
  }

  /**
   * Unmutes a specific sound
   * @param id The ID of the sound to unmute
   */
  public unmuteSoundById(id: string): void {
    try {
      const sound = this.validateSound(id);
      sound.gainNode.gain.value = sound.volume;
    } catch (error) {
      this.handleError("unmuting sound", error, id);
    }
  }

  /**
   * Toggles global mute state
   */
  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.masterGainNode.gain.value = this.isMuted
      ? 0
      : this.previousGlobalVolume;
  }

  /**
   * Checks if a sound is currently playing
   * @param id The ID of the sound
   * @returns Boolean indicating if the sound is playing
   */
  public isPlaying(id: string): boolean {
    try {
      const sound = this.validateSound(id);
      return sound.isPlaying;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a sound is currently paused
   * @param id The ID of the sound
   * @returns Boolean indicating if the sound is paused
   */
  public isPaused(id: string): boolean {
    try {
      const sound = this.validateSound(id);
      return sound.isPaused;
    } catch {
      return false;
    }
  }

  /**
   * Performs cleanup and disposes of the sound manager
   */
  private cleanup(): void {
    this.stopAllSounds();
    this.sounds.clear();
    this.masterGainNode.disconnect();
  }

  /**
   * Disposes of the sound manager and closes the audio context
   */
  public dispose(): void {
    try {
      this.cleanup();
      this.context.close();
    } catch (error) {
      this.handleError("disposing sound manager", error);
    }
  }

  /**
   * Gets all loaded sound IDs
   * @returns Array of sound IDs
   */
  public getSoundIds(): string[] {
    return Array.from(this.sounds.keys());
  }

  /**
   * Gets the current state of a sound
   * @param id The ID of the sound
   * @returns Object containing sound state information or null if not found
   */
  public getSoundState(id: string): SoundStateInfo {
    const sound = this.validateSound(id);
    let state: SoundState;

    if (sound.isPaused) {
      state = SoundState.Paused;
    } else if (sound.isPlaying) {
      state = SoundState.Playing;
    } else {
      state = SoundState.Stopped;
    }

    console.debug("Get sound state:", {
      id,
      isPaused: sound.isPaused,
      isPlaying: sound.isPlaying,
      reportedState: state,
    });

    return {
      state,
      volume: sound.volume,
      duration: sound.buffer?.duration ?? null,
    };
  }

  /**
   * Handles errors throughout the sound manager
   * @param operation The operation that caused the error
   * @param error The error that occurred
   * @param id Optional sound ID related to the error
   */
  private handleError(operation: string, error: unknown, id?: string): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const message = `Error ${operation}${
      id ? ` (Sound ID: ${id})` : ""
    }: ${errorMessage}`;
    console.error(message);
    throw new Error(message);
  }
}
