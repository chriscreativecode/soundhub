import { PlaySoundOptions } from "./play-sound-options.interface";
import { SoundEvent } from "./sound-event.interface";
import { SoundEventsEnum } from "./sound-events.enum";
import { DEFAULT_CONFIG, SoundManagerConfig } from "./sound-manager-config";
import { SoundManagerInterface } from "./sound-manager.interface";
import { SoundResetOptions } from "./sound-reset-options.interface";
import { SoundStateInfo } from "./sound-state-info.interface";
import { SoundState } from "./sound-state.interface";
import { Sound } from "./sound.interface";

export class SoundManager implements SoundManagerInterface {
  private readonly config: SoundManagerConfig;
  private readonly context!: AudioContext;
  private sounds: Map<string, Sound> = new Map();
  private masterGainNode!: GainNode;
  private masterStereoPanner!: StereoPannerNode;
  private previousGlobalVolume: number = 1;
  private isMuted: boolean = false;
  private previousGlobalPan: number = 0;

  private eventListeners: Map<SoundEventsEnum, Set<(event: SoundEvent) => void>> = new Map();
  private readonly activeSources: Map<string, AudioBufferSourceNode> = new Map();

  constructor(config: SoundManagerConfig = {}) {
    this.config = {
      debug: false,
      ...config,
    };
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
      this.debugLog("Spatial audio requested but not supported, disabling feature");
      config.spatialAudio = false;
    }

    this.config = { ...DEFAULT_CONFIG, ...config };

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioContext({ latencyHint: "interactive" });
      // Create the nodes
      this.masterGainNode = this.context.createGain();
      this.masterStereoPanner = this.context.createStereoPanner();

      // Connect nodes in chain.
      // masterGainNode -> masterStereoPanner -> destination
      this.masterStereoPanner.connect(this.context.destination);
      this.masterGainNode.connect(this.masterStereoPanner);

      this.masterStereoPanner.pan.value = this.config.defaultPan ?? 0;
      this.previousGlobalPan = this.config.defaultPan ?? 0;

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
      const tempContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

    this.debugLog("Context resume handlers set up, waiting for user interaction");
  }

  private setupAudioSource(sound: Sound): AudioBufferSourceNode {
    const source = this.context.createBufferSource();
    source.buffer = sound.buffer;

    // Connect audio nodes
    this.connectAudioNodes(sound, source);

    // Set up onended handler with looping logic
    source.onended = () => {
      console.log("sound inside onended", sound);
      this.debugLog(`Sound ${sound.id} ended naturally`);

      if (sound.state === SoundState.Playing && sound.loop) {
        this.handleLoopIteration(sound);
      } else {
        this.handleSoundEnded(sound);
      }
    };
    // Store the active source
    this.activeSources.set(sound.id, source);
    sound.activeSource = source;

    return source;
  }

  private handleLoopIteration(sound: Sound): void {
    this.debugLog(`Restarting loop for sound ${sound.id}`);

    sound.currentLoopCount = (sound.currentLoopCount ?? 0) + 1;

    // Check if we've reached max loops (0 means infinite)
    if (sound.maxLoops > 0 && sound.currentLoopCount >= sound.maxLoops) {
      sound.currentLoopCount = 0;
      this.stopSound(sound.id);
      return;
    }

    this.seekTo(sound.id, 0);

    this.dispatchEvent({
      type: SoundEventsEnum.LOOP_COMPLETED,
      soundId: sound.id,
      timestamp: this.context.currentTime,
    });
  }

  private handleSoundEnded(sound: Sound): void {
    sound.state = SoundState.Stopped;
    sound.startTime = 0;
    sound.pausedAt = 0;

    this.cleanupExistingSource(sound.id);

    this.dispatchEvent({
      type: SoundEventsEnum.ENDED,
      soundId: sound.id,
      timestamp: this.context.currentTime,
    });
  }

  private monitorVolumeChanges(params: {
    gainNode: GainNode;
    duration: number;
    soundId?: string;
    isMaster?: boolean;
    onComplete?: () => void;
  }): void {
    const { gainNode, duration, soundId, isMaster = false, onComplete } = params;
    const startTime = this.context.currentTime;
    const endTime = startTime + duration;

    const monitorVolume = () => {
      const currentTime = this.context.currentTime;
      if (currentTime < endTime) {
        const currentVolume = gainNode.gain.value;

        // Update volume state for individual sounds
        if (soundId) {
          const sound = this.sounds.get(soundId);
          if (sound) {
            sound.volume = currentVolume;
          }
        }

        // Dispatch volume change event
        if (isMaster) {
          this.dispatchEvent({
            type: SoundEventsEnum.MASTER_VOLUME_CHANGED,
            timestamp: currentTime,
            volume: currentVolume,
          });
        } else if (soundId) {
          this.dispatchEvent({
            type: SoundEventsEnum.VOLUME_CHANGED,
            soundId,
            timestamp: currentTime,
            volume: currentVolume,
          });
        }

        requestAnimationFrame(monitorVolume);
      } else {
        // Final volume update
        const finalVolume = gainNode.gain.value;

        // Final volume state update and event dispatch
        if (isMaster) {
          this.dispatchEvent({
            type: SoundEventsEnum.MASTER_VOLUME_CHANGED,
            timestamp: currentTime,
            volume: finalVolume,
          });
        } else if (soundId) {
          const sound = this.sounds.get(soundId);
          if (sound) {
            sound.volume = finalVolume;
          }

          this.dispatchEvent({
            type: SoundEventsEnum.VOLUME_CHANGED,
            soundId,
            timestamp: currentTime,
            volume: finalVolume,
          });
        }

        // Call completion callback if provided
        if (onComplete) {
          onComplete();
        }
      }
    };

    requestAnimationFrame(monitorVolume);
  }

  private getValidatedSound(id: string): Sound {
    const sound = this.sounds.get(id);
    if (!sound?.buffer) {
      this.handleError("validating sound", "Sound not found or not loaded properly", id);
    }
    return sound!;
  }

  private setValidatedVolume(volume: number): number {
    return Math.max(0, Math.min(1, volume));
  }

  private connectAudioNodes(sound: Sound, source: AudioBufferSourceNode): void {
    if (sound.stereoPanner) {
      source.connect(sound.stereoPanner);
      sound.stereoPanner.connect(sound.gainNode);
      sound.gainNode.connect(this.masterGainNode);
    } else if (sound.pannerNode) {
      source.connect(sound.pannerNode);
      sound.pannerNode.connect(sound.gainNode);
      sound.gainNode.connect(this.masterGainNode);
    } else {
      source.connect(sound.gainNode);
      sound.gainNode.connect(this.masterGainNode);
    }
  }

  private clearAudioProcessing(id: string, preserveSpatialAudio: boolean = false): void {
    const sound = this.sounds.get(id);
    if (!sound) return;

    const source = this.activeSources.get(id);
    if (source) {
      source.disconnect();
    }

    // Store spatial position if we need to preserve it
    const pannerPosition =
      preserveSpatialAudio && sound.pannerNode
        ? {
            x: sound.pannerNode.positionX.value,
            y: sound.pannerNode.positionY.value,
            z: sound.pannerNode.positionZ.value,
          }
        : null;

    if (sound.pannerNode && !preserveSpatialAudio) {
      sound.pannerNode.disconnect();
      sound.pannerNode = undefined;
    }

    if (sound.stereoPanner) {
      sound.stereoPanner.disconnect();
      sound.stereoPanner = undefined;
    }

    // Reconnect the audio chain, preserving spatial audio if needed
    if (source) {
      if (preserveSpatialAudio && pannerPosition) {
        if (!sound.pannerNode) {
          sound.pannerNode = this.context.createPanner();
          // Set position using individual properties, pannerNode.setPosition is depricated.
          sound.pannerNode.positionX.value = pannerPosition.x;
          sound.pannerNode.positionY.value = pannerPosition.y;
          sound.pannerNode.positionZ.value = pannerPosition.z;
        }
        source.connect(sound.pannerNode);
        sound.pannerNode.connect(sound.gainNode);
      } else {
        source.connect(sound.gainNode);
      }
      sound.gainNode.connect(this.masterGainNode);
    }
  }

  private cleanup(): void {
    // Stop and disconnect all active sources
    this.activeSources.forEach((source) => {
      try {
        source.onended = null;
        source.stop();
        source.disconnect();
      } catch (e) {
        // Ignore errors if source is already stopped
      }
    });
    this.activeSources.clear();

    // Clean up other audio nodes
    this.sounds.forEach((sound) => {
      if (sound.pannerNode) {
        sound.pannerNode.disconnect();
      }
      if (sound.stereoPanner) {
        sound.stereoPanner.disconnect();
      }
      sound.gainNode.disconnect();
    });

    this.sounds.clear();
    this.masterStereoPanner.disconnect();
    this.masterGainNode.disconnect();
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

  // Playback control-----------------------------------------------------------------------------------------------------------

  public playSound(id: string, options: PlaySoundOptions = {}): void {
    console.log(" play options inside playSound", options);
    try {
      const sound = this.getValidatedSound(id);
      sound.currentLoopCount = 0;
      if (options.maxLoops === -1) {
        sound.loop = true;
        sound.maxLoops = 0; // Infinite loops
      } else {
        sound.loop = options.loop || false;
        sound.maxLoops = options.maxLoops ?? 0;
      }

      console.log("play sound in sound manager", sound);

      const source = this.setupAudioSource(sound);

      if (options.pan !== undefined) {
        this.setPan(id, options.pan);
      }

      if (options.fadeIn) {
        this.fadeIn(id, options.fadeIn);
      } else {
        sound.gainNode.gain.setValueAtTime(sound.volume, this.context.currentTime);
      }

      const startOffset = sound.pausedAt || options.startTime || 0;

      sound.startTime = this.context.currentTime - startOffset;
      sound.state = SoundState.Playing;

      // Start playback
      source.start(0, startOffset);

      this.dispatchEvent({
        type: SoundEventsEnum.STARTED,
        soundId: id,
        timestamp: this.context.currentTime,
      });
    } catch (error) {
      this.handleError("playing sound", error, id);
    }
  }

  public pauseSound(id: string): void {
    try {
      const sound = this.getValidatedSound(id);
      if (!this.isPlaying(id) || this.isPaused(id)) return;

      // Update state
      sound.state = SoundState.Paused;

      // Calculate how much of the sound has played
      sound.pausedAt = this.context.currentTime - sound.startTime;

      // Stop current source without triggering onended
      const activeSource = this.activeSources.get(id);
      if (activeSource) {
        activeSource.onended = null;
        activeSource.stop();
        activeSource.disconnect();
        this.activeSources.delete(id);
      }

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

  public resumeSound(id: string): void {
    try {
      const sound = this.getValidatedSound(id);
      if (!this.isPaused(id)) return;

      // Create and set up new source
      const source = this.setupAudioSource(sound);

      // Start playing from the paused position
      const offset = sound.pausedAt || 0;
      source.start(0, offset);

      // Update state
      sound.startTime = this.context.currentTime - offset;
      sound.state = SoundState.Playing;

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
      const sound = this.getValidatedSound(id);

      this.cleanupExistingSource(id);

      // Reset state
      sound.state = SoundState.Stopped;
      sound.startTime = 0;
      sound.pausedAt = 0;

      // Pass true to preserve spatial audio
      this.clearAudioProcessing(id, true);

      this.dispatchEvent({
        type: SoundEventsEnum.STOPPED,
        soundId: id,
        timestamp: this.context.currentTime,
      });
    } catch (error) {
      this.handleError("stopping sound", error, id);
    }
  }

  private cleanupExistingSource(id: string): void {
    const currentSource = this.activeSources.get(id);
    if (currentSource) {
      currentSource.stop();
      currentSource.disconnect();
      currentSource.onended = null;
      this.activeSources.delete(id);
    }
  }

  public seekTo(id: string, time: number): void {
    try {
      const sound = this.getValidatedSound(id);
      const duration = sound.buffer.duration;
      const clampedTime = Math.max(0, Math.min(time, duration));
      const isSeekingToEnd = clampedTime >= duration;
      const wasPlaying = sound.state === SoundState.Playing;
      // cleanup existing source if playing to prevent multiple instances of the same sound
      if (wasPlaying) {
        this.cleanupExistingSource(id);
      }

      // Handle seeking to end
      if (isSeekingToEnd) {
        this.handleSeekToEnd(sound, wasPlaying);
        return;
      }

      // Update timing state and resume if needed
      if (wasPlaying) {
        this.resumeFromPosition(sound, clampedTime);
      } else {
        sound.pausedAt = clampedTime;
      }

      this.dispatchEvent({
        type: SoundEventsEnum.SEEKED,
        soundId: id,
        currentTime: clampedTime,
        timestamp: this.context.currentTime,
      });
    } catch (error) {
      this.handleError("seeking sound", error, id);
    }
  }

  private handleSeekToEnd(sound: Sound, wasPlaying: boolean): void {
    if (sound.loop && wasPlaying) {
      // Loop: start from beginning
      const newSource = this.setupAudioSource(sound);
      sound.startTime = this.context.currentTime;
      sound.pausedAt = 0;
      newSource.start(0, 0);

      this.dispatchEvent({
        type: SoundEventsEnum.LOOP_COMPLETED,
        soundId: sound.id,
        timestamp: this.context.currentTime,
      });
    } else {
      this.handleSoundEnded(sound);
    }
  }

  private resumeFromPosition(sound: Sound, position: number): void {
    const newSource = this.setupAudioSource(sound);
    sound.startTime = this.context.currentTime - position;
    sound.state = SoundState.Playing;
    newSource.start(0, position);
  }

  // End Playback control-----------------------------------------------------------------------------------------------------------

  // Volume control-----------------------------------------------------------------------------------------------------------------

  public setVolumeById(id: string, volume: number): void {
    try {
      const sound = this.getValidatedSound(id);
      const validatedVolume = this.setValidatedVolume(volume);
      sound.volume = validatedVolume;
      sound.originalVolume = validatedVolume;
      sound.gainNode.gain.setValueAtTime(validatedVolume, this.context.currentTime);
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
      const sound = this.getValidatedSound(id);
      return sound.originalVolume ?? sound.volume;
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

    this.dispatchEvent({
      type: SoundEventsEnum.MASTER_VOLUME_CHANGED,
      timestamp: this.context.currentTime,
      volume: this.previousGlobalVolume,
    });
  }

  public getGlobalVolume(): number {
    return this.isMuted ? 0 : this.masterGainNode.gain.value;
  }

  // End Volume control-------------------------------------------------------------------------------------------------------------

  // Mute control-------------------------------------------------------------------------------------------------------------------

  public muteAllSounds(): void {
    this.previousGlobalVolume = this.masterGainNode.gain.value;
    this.masterGainNode.gain.setValueAtTime(0, this.context.currentTime);
    this.isMuted = true;

    this.dispatchEvent({
      type: SoundEventsEnum.MUTE_GLOBAL,
      timestamp: this.context.currentTime,
      isMuted: true,
      volume: 0,
    });
  }

  public unmuteAllSounds(): void {
    this.masterGainNode.gain.setValueAtTime(this.previousGlobalVolume, this.context.currentTime);
    this.isMuted = false;

    this.dispatchEvent({
      type: SoundEventsEnum.UNMUTE_GLOBAL,
      timestamp: this.context.currentTime,
      isMuted: false,
      volume: this.previousGlobalVolume,
    });
  }

  public muteSoundById(id: string): void {
    try {
      const sound = this.getValidatedSound(id);

      sound.previousVolume = sound.volume;
      sound.volume = 0;
      sound.gainNode.gain.setValueAtTime(0, this.context.currentTime);

      this.dispatchEvent({
        type: SoundEventsEnum.MUTED,
        soundId: id,
        timestamp: this.context.currentTime,
        volume: 0,
        isMuted: true,
      });
    } catch (error) {
      this.handleError("muting sound", error, id);
    }
  }

  public unmuteSoundById(id: string): void {
    try {
      const sound = this.getValidatedSound(id);
      // Restore the previous volume
      const volumeToRestore = sound.previousVolume || this.config.defaultVolume!;
      sound.volume = volumeToRestore;
      sound.gainNode.gain.setValueAtTime(volumeToRestore, this.context.currentTime);

      this.dispatchEvent({
        type: SoundEventsEnum.UNMUTED,
        soundId: id,
        timestamp: this.context.currentTime,
        volume: volumeToRestore,
        isMuted: false,
      });
    } catch (error) {
      this.handleError("unmuting sound", error, id);
    }
  }

  public toggleMute(): void {
    if (this.isMuted) {
      this.unmuteAllSounds();
    } else {
      this.muteAllSounds();
    }
  }

  // End Mute control-----------------------------------------------------------------------------------------------------------------------------

  // Sound loading and management-----------------------------------------------------------------------------------------------------------------

  public async preloadSounds(soundsToLoad: { id: string; url: string }[]): Promise<void> {
    try {
      const loadPromises = soundsToLoad.map(async ({ id, url }) => {
        if (this.sounds.has(id)) {
          this.debugLog(`Sound with id ${id} already exists. Skipping.`);
          return;
        }

        try {
          // Fetch the audio file
          const response = await fetch(url, {
            credentials: this.config.crossOrigin === "use-credentials" ? "include" : "same-origin",
            mode: this.config.crossOrigin ? "cors" : "no-cors",
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Decode the audio data
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

          // Create and configure gain node
          const gainNode = this.context.createGain();
          gainNode.connect(this.masterGainNode);
          gainNode.gain.value = this.config.defaultVolume!;

          // Store the sound
          this.sounds.set(id, {
            id,
            buffer: audioBuffer,
            gainNode,
            startTime: 0,
            pausedAt: 0,
            state: SoundState.Stopped,
            volume: this.config.defaultVolume!,
            originalVolume: this.config.defaultVolume!,
          });

          this.debugLog(`Sound ${id} loaded successfully`);
        } catch (error) {
          // Log the error but don't fail silently
          this.handleError("loading sound", error, id);
          // Re-throw to be caught by Promise.allSettled
          throw error;
        }
      });

      // Use Promise.allSettled to handle both successful and failed loads
      const results = await Promise.allSettled(loadPromises);

      // Process results
      const failedLoads = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");

      if (failedLoads.length > 0) {
        const failedIds = soundsToLoad.filter((_, index) => results[index].status === "rejected").map(({ id }) => id);

        this.debugLog(`Failed to load sounds: ${failedIds.join(", ")}`);
        throw new Error(`Failed to load ${failedLoads.length} sound(s)`);
      }
    } catch (error) {
      this.handleError("preloading sounds", error);
      throw error; // Re-throw to allow caller to handle the error
    }
  }

  public updateSoundUrl(id: string, newUrl: string): Promise<void> {
    return this.preloadSounds([{ id, url: newUrl }]);
  }

  public isSoundLoaded(id: string): boolean {
    const sound = this.sounds.get(id);
    return sound?.buffer != null;
  }

  public hasSound(id: string): boolean {
    return this.sounds.has(id) && this.sounds.get(id)?.buffer != null;
  }

  // End Sound loading and management-----------------------------------------------------------------------------------------------

  // State checks-------------------------------------------------------------------------------------------------------------------

  public isPlaying(id: string): boolean {
    const sound = this.getValidatedSound(id);
    return sound.state === SoundState.Playing;
  }

  public isPaused(id: string): boolean {
    try {
      const sound = this.getValidatedSound(id);
      return sound.state == SoundState.Paused;
    } catch {
      return false;
    }
  }

  public getSoundState(id: string): SoundStateInfo {
    const sound = this.getValidatedSound(id);
    let currentTime = 0;

    if (sound.state === SoundState.Playing) {
      currentTime = this.context.currentTime - sound.startTime;
    } else if (sound.state === SoundState.Paused) {
      currentTime = sound.pausedAt;
    }

    if (sound.buffer) {
      currentTime = Math.min(currentTime, sound.buffer.duration);
    }

    return {
      currentTime,
      duration: sound.buffer?.duration || null,
      state: sound.state,
      volume: sound.volume,
    };
  }

  // End State checks---------------------------------------------------------------------------------------------------------------

  // Master / Global batch operations-----------------------------------------------------------------------------------------------

  public stopAllSounds(): void {
    try {
      const activeIds = Array.from(this.activeSources.keys());
      activeIds.forEach((id) => this.stopSound(id));
      this.debugLog("All sounds stopped");
    } catch (error) {
      this.handleError("stopping all sounds", error);
    }
  }

  public pauseAllSounds(): void {
    this.sounds.forEach((sound, id) => {
      if (sound.state === SoundState.Playing) {
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

  public reset(options: SoundResetOptions = {}): void {
    this.debugLog("Resetting sound manager with options:", options);

    // Stop all playback
    this.stopAllSounds();

    // Reset master controls if not keeping volumes
    if (!options.keepVolumes) {
      this.setGlobalVolume(this.config.defaultVolume ?? 1);
      if (this.isMuted) {
        this.unmuteAllSounds();
      }
    }

    // Reset master pan if not keeping panning
    if (!options.keepPanning) {
      this.resetMasterPan();
    }

    // Handle loaded sounds
    if (options.unloadSounds) {
      this.cleanup();
      this.sounds.clear();
    } else {
      this.sounds.forEach((sound, id) => {
        if (!options.keepVolumes) {
          this.setVolumeById(id, this.config.defaultVolume ?? 1);
        }

        if (!options.keepPanning && this.isStereoPanActive(id)) {
          this.removePan(id);
        }

        if (!options.keepSpatial && this.isSpatialAudioActive(id)) {
          this.removeSpatialEffect(id);
        }

        // Reset sound state
        sound.state = SoundState.Stopped;
        sound.startTime = 0;
        sound.pausedAt = 0;
      });
    }

    this.dispatchEvent({
      type: SoundEventsEnum.RESET,
      timestamp: this.context.currentTime,
      resetOptions: options,
    });

    this.debugLog("Sound manager reset completed");
  }

  // End Master / Global batch operations-------------------------------------------------------------------------------------------

  // Fading ------------------------------------------------------------------------------------------------------------------------

  public fadeIn(id: string, duration: number, startVolume?: number, endVolume?: number): void {
    if (duration <= 0) {
      this.debugLog(`Invalid fade duration: ${duration}`);
      return;
    }
    try {
      const sound = this.getValidatedSound(id);
      const fadeInDuration = duration / 1000;

      const defaultStartVolume = 0;

      const initialVolume = startVolume ?? defaultStartVolume;
      const targetVolume = endVolume ?? sound.originalVolume ?? sound.volume ?? 1;

      // Set initial volume
      sound.gainNode.gain.setValueAtTime(initialVolume, this.context.currentTime);

      // Ramp to target volume
      sound.gainNode.gain.linearRampToValueAtTime(targetVolume, this.context.currentTime + fadeInDuration);

      this.monitorVolumeChanges({
        gainNode: sound.gainNode,
        duration: fadeInDuration,
        soundId: id,
        onComplete: () => {
          sound.volume = targetVolume;
          this.dispatchEvent({
            type: SoundEventsEnum.FADE_IN_COMPLETED,
            soundId: id,
            timestamp: this.context.currentTime,
          });
        },
      });
    } catch (error) {
      this.handleError("fading in from current position", error, id);
    }
  }

  public fadeOut(
    id: string,
    duration: number = this.config.fadeOutDuration!,
    startVolume?: number,
    endVolume: number = 0
  ): void {
    try {
      const sound = this.getValidatedSound(id);
      if (!this.isPlaying(id)) return;

      const fadeOutDuration = duration / 1000; // Convert to seconds
      const currentVolume = startVolume ?? sound.gainNode.gain.value;

      // Store the original volume before fading out
      sound.originalVolume = currentVolume;

      // Start fade from current volume
      sound.gainNode.gain.setValueAtTime(currentVolume, this.context.currentTime);

      // Ramp to zero
      sound.gainNode.gain.linearRampToValueAtTime(endVolume, this.context.currentTime + fadeOutDuration);

      this.monitorVolumeChanges({
        gainNode: sound.gainNode,
        duration: fadeOutDuration,
        soundId: id,
        onComplete: () => {
          if (endVolume === 0) {
            this.stopSound(id);
          }
          this.dispatchEvent({
            type: SoundEventsEnum.FADE_OUT_COMPLETED,
            soundId: id,
            timestamp: this.context.currentTime,
          });
        },
      });
    } catch (error) {
      this.handleError("fading out sound", error, id);
    }
  }

  public fadeMasterIn(duration: number = this.config.fadeInDuration!, startVolume?: number, endVolume?: number): void {
    try {
      const initialVolume = startVolume ?? 0;
      const targetVolume = endVolume ?? (this.masterGainNode.gain.value || this.previousGlobalVolume);

      // Start from initial volume
      this.masterGainNode.gain.setValueAtTime(initialVolume, this.context.currentTime);

      // Ramp to target volume
      this.masterGainNode.gain.linearRampToValueAtTime(targetVolume, this.context.currentTime + duration / 1000);

      this.isMuted = false;

      this.monitorVolumeChanges({
        gainNode: this.masterGainNode,
        duration: duration / 1000,
        isMaster: true,
        onComplete: () => {
          this.dispatchEvent({
            type: SoundEventsEnum.FADE_MASTER_IN_COMPLETED,
            timestamp: this.context.currentTime,
            volume: targetVolume,
          });
          this.debugLog(`Master fade in complete. Target volume: ${targetVolume}`);
        },
      });
    } catch (error) {
      this.handleError("fading in master volume", error);
    }
  }

  public fadeMasterOut(
    duration: number = this.config.fadeOutDuration!,
    startVolume?: number,
    endVolume: number = 0
  ): void {
    if (duration <= 0) {
      this.debugLog(`Invalid fade duration: ${duration}`);
      return;
    }
    try {
      // Determine start volume
      const initialVolume = startVolume ?? this.masterGainNode.gain.value;
      this.previousGlobalVolume = initialVolume; // Store volume for later

      // Start fade from initial volume
      this.masterGainNode.gain.setValueAtTime(initialVolume, this.context.currentTime);

      // Ramp to target volume
      this.masterGainNode.gain.linearRampToValueAtTime(endVolume, this.context.currentTime + duration / 1000);

      this.monitorVolumeChanges({
        gainNode: this.masterGainNode,
        duration: duration / 1000,
        isMaster: true,
        onComplete: () => {
          this.isMuted = endVolume === 0;
          if (endVolume === 0) {
            this.masterGainNode.gain.setValueAtTime(0, this.context.currentTime);
          }
          this.dispatchEvent({
            type: SoundEventsEnum.FADE_MASTER_OUT_COMPLETED,
            timestamp: this.context.currentTime,
            volume: endVolume,
          });
          this.debugLog("Master fade out complete");
        },
      });
    } catch (error) {
      this.handleError("fading out master volume", error);
    }
  }

  // End Fading ------------------------------------------------------------------------------------------------------------------------

  // Spatial audio (3D audio)-----------------------------------------------------------------------------------------------------------

  public isSpatialAudioEnabled(): boolean {
    return this.config.spatialAudio === true && this.isSpatialAudioSupported();
  }

  public setSoundPosition(soundId: string, x: number, y: number, z: number): void {
    if (!this.config.spatialAudio) {
      this.debugLog("Spatial audio is not enabled");
      return;
    }

    const sound = this.sounds.get(soundId);
    const source = this.activeSources.get(soundId);

    if (!sound) {
      this.debugLog(`Sound ${soundId} not found for position setting`);
      return;
    }

    // If stereo panning is active, warn and return
    if (sound.stereoPanner) {
      if (this.isStereoPanActive(soundId)) {
        this.removePan(soundId);
        this.debugLog(`Removed stereo panner, and overwritet with spatial panning for sound ${soundId}`);
      }
    }

    try {
      // Create a panner node if it doesn't exist
      if (!sound.pannerNode) {
        sound.pannerNode = this.context.createPanner();
        sound.pannerNode.panningModel = "HRTF";
        sound.pannerNode.distanceModel = "inverse";
        sound.pannerNode.refDistance = 1;
        sound.pannerNode.maxDistance = 10000;
        sound.pannerNode.rolloffFactor = 1;

        // Reconnect the audio nodes with the panner
        source?.disconnect();
        source?.connect(sound.pannerNode);
        sound.pannerNode.connect(sound.gainNode);
      }

      // Update position
      sound.pannerNode.positionX.setValueAtTime(x, this.context.currentTime);
      sound.pannerNode.positionY.setValueAtTime(y, this.context.currentTime);
      sound.pannerNode.positionZ.setValueAtTime(z, this.context.currentTime);

      this.dispatchEvent({
        type: SoundEventsEnum.SPATIAL_POSITION_CHANGED,
        soundId,
        timestamp: this.context.currentTime,
        position: { x, y, z },
      });

      this.debugLog(`Set position for sound ${soundId}: x=${x}, y=${y}, z=${z}`);
    } catch (error) {
      this.handleError("setting sound position", error);
    }
  }

  public resetSoundPosition(id: string): void {
    this.setSoundPosition(id, 0, 0, 0);
  }

  public removeSpatialEffect(id: string): void {
    try {
      const sound = this.getValidatedSound(id);
      if (sound.pannerNode) {
        const source = this.activeSources.get(id);
        if (source) {
          source.disconnect();
          source.connect(sound.gainNode);
        }
        sound.pannerNode.disconnect();
        sound.pannerNode = undefined;
        sound.gainNode.connect(this.masterGainNode);
      }
    } catch (error) {
      this.handleError("removing spatial effect", error, id);
    }
  }

  public isSpatialAudioActive(id: string): boolean {
    const sound = this.sounds.get(id);
    return !!sound?.pannerNode;
  }

  // End Spatial audio (3D audio)------------------------------------------------------------------------------------------------------

  // Pan control ----------------------------------------------------------------------------------------------------------------------

  public setPan(id: string, value: number): void {
    try {
      const sound = this.getValidatedSound(id);

      // Remove spatial audio if active
      if (this.isSpatialAudioActive(id)) {
        this.removeSpatialEffect(id);
      }

      // Create stereo panner if it doesn't exist
      if (!sound.stereoPanner) {
        sound.stereoPanner = this.context.createStereoPanner();
        // Get the active source
        const source = this.activeSources.get(sound.id);
        if (source) {
          // Reconnect the audio nodes with the stereo panner
          source.disconnect();
          source.connect(sound.stereoPanner);
          sound.stereoPanner.connect(sound.gainNode);
        }
      }

      // Clamp pan value between -1 and 1
      const pannedValue = Math.max(-1, Math.min(1, value));
      sound.stereoPanner.pan.setValueAtTime(pannedValue, this.context.currentTime);

      this.dispatchEvent({
        type: SoundEventsEnum.PAN_CHANGED,
        soundId: id, // Add this line
        timestamp: this.context?.currentTime ?? 0,
        pan: pannedValue,
        previousPan: this.previousGlobalPan,
      });

      this.debugLog(`Pan set for sound ${sound.id}: ${pannedValue}`);
    } catch (error) {
      this.handleError("setting pan", error, id);
    }
  }

  public removePan(id: string): void {
    try {
      const sound = this.getValidatedSound(id);
      if (sound.stereoPanner) {
        const source = this.activeSources.get(id);
        if (source) {
          source.disconnect();
          source.connect(sound.gainNode);
        }
        sound.stereoPanner.disconnect();
        sound.stereoPanner = undefined;
      }
    } catch (error) {
      this.handleError("removing pan", error, id);
    }
  }

  public setMasterPan(value: number): void {
    try {
      this.previousGlobalPan = this.masterStereoPanner.pan.value;

      // Reset spatial position for all sounds using spatial audio
      this.sounds.forEach((_sound, id) => {
        if (this.isSpatialAudioActive(id)) {
          this.removeSpatialEffect(id);
        }
      });

      // Clamp pan value between -1 and 1
      const pannedValue = Math.max(-1, Math.min(1, value));
      this.masterStereoPanner.pan.setValueAtTime(pannedValue, this.context.currentTime);

      this.dispatchEvent({
        type: SoundEventsEnum.MASTER_PAN_CHANGED,
        timestamp: this.context?.currentTime ?? 0,
        pan: pannedValue,
        previousPan: this.previousGlobalPan,
      });

      this.debugLog(`Master pan set to: ${pannedValue}`);
    } catch (error) {
      this.handleError("setting master pan", error);
    }
  }

  public getMasterPan(): number {
    return this.masterStereoPanner.pan.value;
  }

  public resetMasterPan(): void {
    this.setMasterPan(0);
    this.previousGlobalPan = 0;
  }

  public getPreviousMasterPan(): number {
    return this.previousGlobalPan;
  }

  public isStereoPanActive(id: string): boolean {
    const sound = this.sounds.get(id);
    return !!sound?.stereoPanner;
  }

  // End Pan control ----------------------------------------------------------------------------------------------------------------------

  // Utility methods-----------------------------------------------------------------------------------------------------------------------

  public getConfig(): Readonly<SoundManagerConfig> {
    return { ...this.config };
  }

  public getSound(id: string): Sound | undefined {
    return this.sounds.get(id);
  }

  public getSoundIds(): string[] {
    return Array.from(this.sounds.keys());
  }

  public isStopped(id: string): boolean {
    try {
      const sound = this.getValidatedSound(id);
      return sound.state === SoundState.Stopped;
    } catch {
      return true;
    }
  }

  public destroy(): void {
    try {
      this.cleanup();
      this.context.close();
    } catch (error) {
      this.handleError("disposing sound manager", error);
    }
  }

  // End Utility methods-------------------------------------------------------------------------------------------------------------------

  // Listeners-----------------------------------------------------------------------------------------------------------------------------

  public addEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void {
    this.eventListeners.get(type)?.add(callback);
  }

  public removeEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void {
    this.eventListeners.get(type)?.delete(callback);
  }

  // End Listeners----------------------------------------------------------------------------------------------------------------------
}
