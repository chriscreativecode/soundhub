import { PlaySoundOptions } from "./play-sound-options.interface";
import { SoundEvent } from "./sound-event.interface";
import { SoundEventsEnum } from "./sound-events.enum";
import { DEFAULT_CONFIG, SoundManagerConfig } from "./sound-manager-config";
import { SoundManagerInterface } from "./sound-manager.interface";
import { SoundStateInfo } from "./sound-state-info.interface";
import { SoundState } from "./sound-state.interface";
import { Sound } from "./sound.interface";

export class SoundManager implements SoundManagerInterface {
  private readonly config: SoundManagerConfig;
  private readonly context!: AudioContext;
  private sounds: Map<string, Sound> = new Map();
  private masterGainNode!: GainNode;
  private previousGlobalVolume: number = 1;
  private isMuted: boolean = false;
  private eventListeners: Map<
    SoundEventsEnum,
    Set<(event: SoundEvent) => void>
  > = new Map();

  constructor(config: SoundManagerConfig = {}) {
    // Validate config values
    Object.values(SoundEventsEnum).forEach((type) => {
      this.eventListeners.set(type as SoundEventsEnum, new Set());
    });

    if (config.defaultVolume !== undefined) {
      config.defaultVolume = this.setValidatedVolume(config.defaultVolume);
    }
    if (config.fadeInDuration !== undefined && config.fadeInDuration < 0) {
      config.fadeInDuration = 0;
    }
    if (config.fadeOutDuration !== undefined && config.fadeOutDuration < 0) {
      config.fadeOutDuration = 0;
    }
    if (config.spatialAudio && !this.isSpatialAudioSupported()) {
      this.debugLog(
        "Spatial audio requested but not supported, disabling feature"
      );
      config.spatialAudio = false;
    }

    this.config = { ...DEFAULT_CONFIG, ...config };

    try {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioContext({ latencyHint: "interactive" });
      this.masterGainNode = this.context.createGain();
      this.masterGainNode.connect(this.context.destination);
      this.masterGainNode.gain.value = this.config.defaultVolume!;
      this.previousGlobalVolume = this.config.defaultVolume!;
      this.initialize();
    } catch (error) {
      this.handleError("constructor, initialize", error);
    }
  }

  private initialize(): void {
    this.setupContextResumeHandlers();
    if (this.config.autoMuteOnHidden) {
      this.setupVisibilityHandling();
    }

    if (this.config.spatialAudio) {
      this.initializeSpatialAudio();
    }

    this.debugLog("Initialized with config:", this.config);
  }

  public addEventListener(
    type: SoundEventsEnum,
    callback: (event: SoundEvent) => void
  ): void {
    this.eventListeners.get(type)?.add(callback);
  }

  public removeEventListener(
    type: SoundEventsEnum,
    callback: (event: SoundEvent) => void
  ): void {
    this.eventListeners.get(type)?.delete(callback);
  }

  private dispatchEvent(event: SoundEvent): void {
    this.eventListeners.get(event.type)?.forEach((callback) => callback(event));
  }

  private setupVisibilityHandling(): void {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.debugLog("Page hidden, auto-muting sounds");
        this.muteAllSounds();
      } else if (this.config.autoResumeOnFocus) {
        this.debugLog("Page visible, auto-resuming sounds");
        this.unmuteAllSounds();
      }
    });
  }

  private debugLog(...args: any[]): void {
    if (this.config.debug) {
      console.debug("[SoundManager]", ...args);
    }
  }

  private isSpatialAudioSupported(): boolean {
    try {
      // Check for basic Web Audio API support
      if (!("AudioContext" in window || "webkitAudioContext" in window)) {
        return false;
      }

      // Check for PannerNode support
      if (!("PannerNode" in window)) {
        return false;
      }

      // Check for specific spatial audio properties
      const tempContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const hasRequiredProperties =
        "positionX" in tempContext.listener &&
        "positionY" in tempContext.listener &&
        "positionZ" in tempContext.listener;

      // Cleanup
      tempContext.close();

      return hasRequiredProperties;
    } catch (error) {
      this.debugLog("Spatial audio support check failed:", error);
      return false;
    }
  }

  public isSpatialAudioEnabled(): boolean {
    return this.config.spatialAudio === true && this.isSpatialAudioSupported();
  }

  private initializeSpatialAudio(): void {
    if (!this.isSpatialAudioSupported()) {
      this.debugLog("Spatial audio not supported, disabling feature");
      this.config.spatialAudio = false;
      return;
    }

    try {
      // Create a listener for spatial audio
      const listener = this.context.listener;

      // Set default listener position (at the center)
      listener.positionX.setValueAtTime(0, this.context.currentTime);
      listener.positionY.setValueAtTime(0, this.context.currentTime);
      listener.positionZ.setValueAtTime(0, this.context.currentTime);

      // Set orientation (optional)
      listener.forwardX.setValueAtTime(0, this.context.currentTime);
      listener.forwardY.setValueAtTime(0, this.context.currentTime);
      listener.forwardZ.setValueAtTime(-1, this.context.currentTime);
      listener.upX.setValueAtTime(0, this.context.currentTime);
      listener.upY.setValueAtTime(1, this.context.currentTime);
      listener.upZ.setValueAtTime(0, this.context.currentTime);

      this.debugLog("Spatial audio initialized");
    } catch (error) {
      this.handleError("initializing spatial audio", error);
    }
  }

  public removeSpatialEffect(id: string): void {
    try {
      const sound = this.validateSound(id);
      if (sound.pannerNode) {
        sound.gainNode.disconnect(sound.pannerNode);
        sound.pannerNode.disconnect();
        sound.pannerNode = undefined;
        sound.gainNode.connect(this.masterGainNode);
      }
    } catch (error) {
      this.handleError("removing spatial effect", error, id);
    }
  }

  public hasSound(id: string): boolean {
    return this.sounds.has(id) && this.sounds.get(id)?.buffer != null;
  }

  public getConfig(): Readonly<SoundManagerConfig> {
    return { ...this.config };
  }

  public setSoundPosition(
    soundId: string,
    x: number,
    y: number,
    z: number
  ): void {
    if (!this.config.spatialAudio) {
      this.debugLog("Spatial audio is not enabled");
      return;
    }

    const sound = this.getSound(soundId);
    if (!sound) return;

    try {
      // Create a panner node if it doesn't exist
      if (!sound.pannerNode) {
        sound.pannerNode = this.context.createPanner();
        sound.pannerNode.panningModel = "HRTF";
        sound.pannerNode.distanceModel = "inverse";
        sound.pannerNode.refDistance = 1;
        sound.pannerNode.maxDistance = 10000;
        sound.pannerNode.rolloffFactor = 1;

        // Connect the panner node to the audio graph
        sound.gainNode.disconnect();
        sound.gainNode.connect(sound.pannerNode);
        sound.pannerNode.connect(this.masterGainNode);
      }

      // Update position
      sound.pannerNode.positionX.setValueAtTime(x, this.context.currentTime);
      sound.pannerNode.positionY.setValueAtTime(y, this.context.currentTime);
      sound.pannerNode.positionZ.setValueAtTime(z, this.context.currentTime);

      this.debugLog(
        `Set position for sound ${soundId}: x=${x}, y=${y}, z=${z}`
      );
    } catch (error) {
      this.handleError("setting sound position", error);
    }
  }

  /**
   * Reset the 3D sound position
   * @param id The ID of the sound to position
   */
  public resetSoundPosition(id: string): void {
    this.setSoundPosition(id, 0, 0, 0);
  }

  private setupContextResumeHandlers(): void {
    const resumeContext = async () => {
      if (this.context.state === "suspended") {
        try {
          await this.context.resume();
          this.debugLog("AudioContext resumed after user interaction");

          // Remove the event listeners once we've successfully resumed
          ["click", "touchstart", "keydown"].forEach((eventType) => {
            document.removeEventListener(eventType, resumeContext);
          });
        } catch (error) {
          this.debugLog("Failed to resume AudioContext:", error);
        }
      }
    };

    ["click", "touchstart", "keydown"].forEach((eventType) => {
      document.addEventListener(eventType, resumeContext, { once: true });
    });

    this.debugLog(
      "Context resume handlers set up, waiting for user interaction"
    );
  }

  private async ensureContext(): Promise<void> {
    if (this.context.state === "suspended") {
      this.debugLog("AudioContext is suspended, attempting to resume...");
      try {
        await this.context.resume();
        this.debugLog("AudioContext resumed successfully");
      } catch (error) {
        this.debugLog(
          "Failed to resume AudioContext, waiting for user interaction"
        );
      }
    }
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
          const response = await fetch(url, {
            credentials:
              this.config.crossOrigin === "use-credentials"
                ? "include"
                : "same-origin",
            mode: this.config.crossOrigin ? "cors" : "no-cors",
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

          const gainNode = this.context.createGain();
          gainNode.connect(this.masterGainNode);
          gainNode.gain.value = this.config.defaultVolume!;

          this.sounds.set(id, {
            id,
            buffer: audioBuffer,
            sources: [],
            gainNode,
            startTime: 0,
            pausedAt: 0,
            state: SoundState.Stopped,
            volume: this.config.defaultVolume!,
          });

          this.debugLog(`Sound ${id} loaded successfully`);
        } catch (error) {
          this.handleError("loading sound", error, id);
        }
      });

      await Promise.all(loadPromises);
    } catch (error) {
      this.handleError("preloading sounds", error);
    }
  }

  public updateSoundUrl(id: string, newUrl: string): Promise<void> {
    return this.preloadSounds([{ id, url: newUrl }]);
  }

  public isSoundLoaded(id: string): boolean {
    const sound = this.sounds.get(id);
    return sound?.buffer != null;
  }

  private setupStereoPan(sound: Sound, pan: number): void {
    try {
      // Create stereo panner if it doesn't exist
      if (!sound.stereoPanner) {
        sound.stereoPanner = this.context.createStereoPanner();

        // Disconnect existing connections
        sound.gainNode.disconnect();

        // Connect the new audio chain: gainNode -> stereoPanner -> masterGainNode
        sound.gainNode.connect(sound.stereoPanner);
        sound.stereoPanner.connect(this.masterGainNode);
      }

      // Clamp pan value between -1 and 1
      const pannedValue = Math.max(-1, Math.min(1, pan));
      sound.stereoPanner.pan.setValueAtTime(
        pannedValue,
        this.context.currentTime
      );

      this.debugLog(`Pan set for sound ${sound.id}: ${pannedValue}`);
    } catch (error) {
      this.handleError("setting up stereo pan", error);
    }
  }

  public playSound(id: string, options: PlaySoundOptions = {}): void {
    try {
      const sound = this.validateSound(id);

      // Stop any currently playing sources
      this.stopSound(id);

      const source = this.context.createBufferSource();
      source.buffer = sound.buffer;

      // Connect source to the audio chain
      if (options.pan !== undefined) {
        this.setupStereoPan(sound, options.pan);
      }
      this.connectAudioNodes(sound, source);

      if (options.fadeIn) {
        this.fadeIn(id, options.fadeIn);
      } else {
        // Set immediate volume if no fade
        sound.gainNode.gain.setValueAtTime(
          sound.volume,
          this.context.currentTime
        );
      }

      // Simple onended handler
      source.onended = () => {
        this.cleanupSource(sound, source);
        this.dispatchEvent({
          type: SoundEventsEnum.ENDED,
          soundId: id,
          timestamp: this.context.currentTime,
        });
      };

      // Start playback
      sound.sources = [source];
      sound.startTime = this.context.currentTime;
      sound.state = SoundState.Playing;

      source.start(0, options.startTime || 0);

      this.dispatchEvent({
        type: SoundEventsEnum.STARTED,
        soundId: id,
        timestamp: this.context.currentTime,
      });
    } catch (error) {
      this.handleError("playing sound", error, id);
    }
  }

  public fadeOut(
    id: string,
    duration: number = this.config.fadeOutDuration!
  ): void {
    try {
      const sound = this.validateSound(id);
      if (!this.isPlaying(id)) return;

      const fadeOutDuration = duration / 1000; // Convert to seconds
      const currentVolume = sound.gainNode.gain.value;

      // Start fade from current volume
      sound.gainNode.gain.setValueAtTime(
        currentVolume,
        this.context.currentTime
      );

      // Ramp to zero
      sound.gainNode.gain.linearRampToValueAtTime(
        0,
        this.context.currentTime + fadeOutDuration
      );

      // Schedule fade-out completed event and stop
      setTimeout(() => {
        this.stopSound(id);

        // Reset gain to original volume for next play
        sound.gainNode.gain.setValueAtTime(
          sound.volume,
          this.context.currentTime
        );

        this.dispatchEvent({
          type: SoundEventsEnum.FADE_OUT_COMPLETED,
          soundId: id,
          timestamp: this.context.currentTime,
        });

        this.debugLog(`Fade out complete for sound ${id}`);
      }, duration);
    } catch (error) {
      this.handleError("fading out sound", error, id);
    }
  }

  public fadeIn(id: string, duration: number): void {
    try {
      const sound = this.validateSound(id);

      const fadeInDuration = duration / 1000; // Convert to seconds

      // Store the current volume for later reset
      const targetVolume = sound.volume;

      // Immediately set volume to 0
      sound.gainNode.gain.setValueAtTime(0, this.context.currentTime);

      // Ramp to target volume
      sound.gainNode.gain.linearRampToValueAtTime(
        targetVolume,
        this.context.currentTime + fadeInDuration
      );

      // Schedule fade-in completed event
      setTimeout(() => {
        this.dispatchEvent({
          type: SoundEventsEnum.FADE_IN_COMPLETED,
          soundId: id,
          timestamp: this.context.currentTime,
        });
      }, duration);
    } catch (error) {
      this.handleError("fading in from current position", error, id);
    }
  }

  // Add method to update pan value
  public setPan(id: string, pan: number): void {
    try {
      const sound = this.validateSound(id);
      this.setupStereoPan(sound, pan);
    } catch (error) {
      this.handleError("setting pan", error, id);
    }
  }

  public seekTo(id: string, time: number): void {
    try {
      const sound = this.validateSound(id);
      const duration = sound.buffer.duration;

      // Clamp time value between 0 and duration
      const clampedTime = Math.max(0, Math.min(time, duration));

      // If sound is playing, stop current playback and start from new position
      if (this.isPlaying(id)) {
        // Stop current sources
        sound.sources.forEach((source) => {
          source.stop();
          source.disconnect();
        });

        // Create new source
        const newSource = this.context.createBufferSource();
        newSource.buffer = sound.buffer;

        // Connect the source to the audio chain
        if (sound.stereoPanner) {
          newSource.connect(sound.gainNode);
        } else {
          newSource.connect(sound.gainNode);
        }

        // Start playback from the new position
        newSource.start(0, clampedTime);
        sound.sources = [newSource];
        sound.startTime = this.context.currentTime - clampedTime;

        // Set up onended handler
        newSource.onended = () => {
          this.cleanupSource(sound, newSource);
        };
      } else if (this.isPaused(id)) {
        // If paused, just update the pausedAt time
        sound.pausedAt = clampedTime;
      }
      this.dispatchEvent({
        type: SoundEventsEnum.SEEKED,
        soundId: id,
        currentTime: clampedTime,
        timestamp: this.context.currentTime,
      });

      this.debugLog(`Seeked sound ${id} to ${clampedTime}s`);
    } catch (error) {
      this.handleError("seeking sound", error, id);
    }
  }

  public pauseSound(id: string): void {
    try {
      const sound = this.validateSound(id);
      if (!this.isPlaying(id) || this.isPaused(id)) return;

      // Update state
      sound.state = SoundState.Paused;

      // Calculate how much of the sound has played
      sound.pausedAt = this.context.currentTime - sound.startTime;

      // Stop current sources without triggering onended
      sound.sources.forEach((source) => {
        source.onended = null; // Remove onended handler
        source.stop();
      });
      sound.sources = [];

      this.dispatchEvent({
        type: SoundEventsEnum.PAUSED,
        soundId: id,
        timestamp: this.context.currentTime,
      });

      this.debugLog("Pause state:", {
        id,
        pausedAt: sound.pausedAt,
      });
    } catch (error) {
      this.handleError("pausing sound", error, id);
    }
  }

  public async fadeMasterIn(
    duration: number = this.config.fadeInDuration!
  ): Promise<void> {
    try {
      // Get current volume as target (or use previous volume if currently muted)
      const targetVolume =
        this.masterGainNode.gain.value || this.previousGlobalVolume;

      // Start from 0
      this.masterGainNode.gain.setValueAtTime(0, this.context.currentTime);

      // Ramp to target volume
      this.masterGainNode.gain.linearRampToValueAtTime(
        targetVolume,
        this.context.currentTime + duration / 1000
      );

      // Wait for fade to complete
      await new Promise((resolve) => setTimeout(resolve, duration));

      // Ensure we end at the correct volume
      this.masterGainNode.gain.setValueAtTime(
        targetVolume,
        this.context.currentTime
      );
      this.isMuted = false;

      this.debugLog(`Master fade in complete. Target volume: ${targetVolume}`);
    } catch (error) {
      this.handleError("fading in master volume", error);
    }
  }

  public async fadeMasterOut(
    duration: number = this.config.fadeOutDuration!
  ): Promise<void> {
    try {
      const startVolume = this.masterGainNode.gain.value;
      this.previousGlobalVolume = startVolume; // Store current volume for later

      // Start fade from current volume
      this.masterGainNode.gain.setValueAtTime(
        startVolume,
        this.context.currentTime
      );

      // Ramp to zero
      this.masterGainNode.gain.linearRampToValueAtTime(
        0,
        this.context.currentTime + duration / 1000
      );

      // Wait for fade to complete
      await new Promise((resolve) => setTimeout(resolve, duration));

      // Ensure we end at zero
      this.masterGainNode.gain.setValueAtTime(0, this.context.currentTime);
      this.isMuted = true;

      this.debugLog("Master fade out complete");
    } catch (error) {
      this.handleError("fading out master volume", error);
    }
  }

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

  private setValidatedVolume(volume: number): number {
    return Math.max(0, Math.min(1, volume));
  }

  private cleanupSource(sound: Sound, source: AudioBufferSourceNode): void {
    const index = sound.sources.indexOf(source);
    if (index !== -1) {
      sound.sources.splice(index, 1);
    }
    if (sound.sources.length === 0) {
      sound.state = SoundState.Stopped;
      sound.pausedAt = 0;
    }
  }

  private connectAudioNodes(sound: Sound, source: AudioBufferSourceNode): void {
    if (sound.stereoPanner) {
      source.connect(sound.gainNode);
      sound.gainNode.connect(sound.stereoPanner);
      sound.stereoPanner.connect(this.masterGainNode);
    } else {
      source.connect(sound.gainNode);
      sound.gainNode.connect(this.masterGainNode);
    }
  }

  public resumeSound(id: string): void {
    try {
      const sound = this.validateSound(id);
      if (!this.isPaused(id)) return;

      const source = this.context.createBufferSource();
      source.buffer = sound.buffer;

      // Connect the source to the audio chain
      this.connectAudioNodes(sound, source);

      // Start playing from the paused position
      const offset = sound.pausedAt || 0;
      source.start(0, offset);

      sound.sources = [source];
      sound.startTime = this.context.currentTime - offset;

      // Update state
      sound.state = SoundState.Playing;

      // Set up onended handler
      source.onended = () => {
        this.cleanupSource(sound, source);
      };

      this.dispatchEvent({
        type: SoundEventsEnum.RESUMED,
        soundId: id,
        timestamp: this.context.currentTime,
      });
    } catch (error) {
      this.handleError("resuming sound", error, id);
    }
  }

  public stopSound(id: string): void {
    try {
      const sound = this.validateSound(id);

      // Stop and disconnect all sources
      sound.sources.forEach((source) => {
        try {
          source.onended = null; // Remove onended handler first
          source.stop();
          source.disconnect();
        } catch (e) {
          // Ignore errors if source is already stopped
        }
      });
      sound.sources = [];

      // Clean up stereo panner if it exists
      if (sound.stereoPanner) {
        sound.stereoPanner.disconnect();
        sound.stereoPanner = undefined;
      }

      // Reset gain node connection
      sound.gainNode.disconnect();
      sound.gainNode.connect(this.masterGainNode);

      // Reset state
      sound.pausedAt = 0;
      sound.startTime = 0;
      sound.state = SoundState.Stopped;

      this.dispatchEvent({
        type: SoundEventsEnum.STOPPED,
        soundId: id,
        timestamp: this.context.currentTime,
      });
    } catch (error) {
      this.handleError("stopping sound", error, id);
    }
  }

  public stopAllSounds(): void {
    try {
      this.sounds.forEach((sound) => {
        sound.sources.forEach((source) => source.stop());
        sound.sources = [];
        sound.state = SoundState.Stopped;
      });
    } catch (error) {
      this.handleError("stopping all sounds", error);
    }
  }

  public pauseAllSounds(): void {
    this.sounds.forEach((sound, id) => {
      if (sound.state == SoundState.Playing) {
        this.pauseSound(id);
      }
    });
  }

  public resumeAllSounds(): void {
    this.sounds.forEach((sound, id) => {
      if (sound.state == SoundState.Paused) {
        this.resumeSound(id);
      }
    });
  }

  public setVolumeById(id: string, volume: number): void {
    try {
      const sound = this.validateSound(id);
      const validatedVolume = this.setValidatedVolume(volume);
      sound.volume = validatedVolume;
      sound.gainNode.gain.setValueAtTime(
        validatedVolume,
        this.context.currentTime
      );
      this.dispatchEvent({
        type: SoundEventsEnum.VOLUME_CHANGED,
        soundId: id,
        timestamp: this.context.currentTime,
        volume: sound.volume,
      });
    } catch (error) {
      this.handleError("setting volume", error, id);
    }
  }

  public getVolumeById(id: string): number {
    try {
      const sound = this.validateSound(id);
      return sound.volume;
    } catch (error) {
      this.handleError("getting volume", error, id);
      return 0;
    }
  }

  public setGlobalVolume(volume: number): void {
    this.previousGlobalVolume = this.setValidatedVolume(volume);
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
    try {
      const sound = this.validateSound(id);

      sound.previousVolume = sound.volume;
      sound.volume = 0;
      sound.gainNode.gain.setValueAtTime(0, this.context.currentTime);

      this.dispatchEvent({
        type: SoundEventsEnum.MUTED,
        soundId: id,
        timestamp: this.context.currentTime,
        volume: 0,
      });
    } catch (error) {
      this.handleError("muting sound", error, id);
    }
  }

  public unmuteSoundById(id: string): void {
    try {
      const sound = this.validateSound(id);
      // Restore the previous volume
      const volumeToRestore =
        sound.previousVolume || this.config.defaultVolume!;
      sound.volume = volumeToRestore;
      sound.gainNode.gain.setValueAtTime(
        volumeToRestore,
        this.context.currentTime
      );

      this.dispatchEvent({
        type: SoundEventsEnum.UNMUTED,
        soundId: id,
        timestamp: this.context.currentTime,
        volume: volumeToRestore,
      });
    } catch (error) {
      this.handleError("unmuting sound", error, id);
    }
  }

  public toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.masterGainNode.gain.value = this.isMuted
      ? 0
      : this.previousGlobalVolume;
  }

  public isPlaying(id: string): boolean {
    const sound = this.validateSound(id);
    return sound.state === SoundState.Playing;
  }

  public isPaused(id: string): boolean {
    try {
      const sound = this.validateSound(id);
      return !!(sound.state == SoundState.Paused);
    } catch {
      return false;
    }
  }

  private cleanup(): void {
    this.sounds.forEach((sound) => {
      if (sound.pannerNode) {
        sound.pannerNode.disconnect();
      }
    });
    this.stopAllSounds();
    this.sounds.clear();
    this.masterGainNode.disconnect();
  }

  public dispose(): void {
    try {
      this.cleanup();
      this.context.close();
    } catch (error) {
      this.handleError("disposing sound manager", error);
    }
  }

  public getSound(id: string): Sound | undefined {
    return this.sounds.get(id);
  }

  public getSoundIds(): string[] {
    return Array.from(this.sounds.keys());
  }

  public getSoundState(id: string): SoundStateInfo {
    const sound = this.validateSound(id);
    return {
      currentTime: this.context.currentTime,
      duration: sound.buffer?.duration || null,
      state: sound.state,
      volume: sound.volume,
    };
  }

  private handleError(operation: string, error: unknown, id?: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const context = id ? ` (Sound ID: ${id})` : "";
    const message = `[SoundManager] Error ${operation}${context}: ${errorMessage}`;

    if (this.config.debug) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }
}
