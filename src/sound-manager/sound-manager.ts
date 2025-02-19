
import { playOptions } from "./play-sound-options.interface";
import { SoundEvent } from "./sound-event.interface";
import { SoundEventsEnum } from "./sound-events.enum";
import { DEFAULT_CONFIG, SoundManagerConfig } from "./sound-manager-config";
import { SoundManagerInterface } from "./sound-manager.interface";
import { DEFAULT_PANNER_CONFIG, SoundPannerConfig } from "./sound-panner-config";
import { SoundResetOptions } from "./sound-reset-options.interface";
import { SoundStateInfo } from "./sound-state-info.interface";
import { SoundState } from "./sound-state.interface";
import { Sound } from "./sound.interface";

// Add to sound-manager.ts

interface TickerCallback {
  id: string;
  callback: (deltaTime: number) => void;
  interval?: number;
  lastUpdate?: number;
}

class Ticker {
  private callbacks: Map<string, TickerCallback> = new Map();
  private animationFrameId: number | null = null;
  private lastTick: number = 0;

  constructor() {
    this.tick = this.tick.bind(this);
  }

  private tick(timestamp: number): void {
    const deltaTime = timestamp - (this.lastTick || timestamp);
    this.lastTick = timestamp;

    this.callbacks.forEach(callback => {
      if (!callback.interval) {
        callback.callback(deltaTime);
        return;
      }

      callback.lastUpdate = callback.lastUpdate || timestamp;
      const elapsed = timestamp - callback.lastUpdate;

      if (elapsed >= callback.interval) {
        callback.callback(deltaTime);
        callback.lastUpdate = timestamp;
      }
    });

    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  public start(): void {
    if (!this.animationFrameId) {
      this.lastTick = performance.now();
      this.animationFrameId = requestAnimationFrame(this.tick);
    }
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public addCallback(id: string, callback: (deltaTime: number) => void, interval?: number): void {
    this.callbacks.set(id, { id, callback, interval });
    this.start();
  }

  public removeCallback(id: string): void {
    this.callbacks.delete(id);
    if (this.callbacks.size === 0) {
      this.stop();
    }
  }

  public clear(): void {
    this.callbacks.clear();
    this.stop();
  }
}

export class SoundManager implements SoundManagerInterface {
  private readonly config: SoundManagerConfig;
  private readonly context!: AudioContext;
  private sounds: Map<string, Sound> = new Map();
  private masterGainNode!: GainNode;
  private masterStereoPanner!: StereoPannerNode;
  private masterPannerNode!: PannerNode | null;
  private previousGlobalVolume: number = 1;
  private isMuted: boolean = false;
  private previousGlobalPan: number = 0;
  private PROGRESS_UPDATE_INTERVAL = 50; // 50ms default, could be configurable
  private eventListeners: Map<SoundEventsEnum, Set<(event: SoundEvent) => void>> = new Map();
  private readonly activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private activeFadeCallbacks: Map<string, () => void> = new Map();
  private isHandlingError: boolean = false;
  private ticker: Ticker;
  private readonly DEFAULT_PRECISION: number = 2;

  constructor(config: SoundManagerConfig = {}) {
    this.ticker = new Ticker();
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
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      });
    }
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
      console.log("[SoundManager]", ...args);
    }
  }

  public setDebugMode(debug: boolean): void {
    this.config.debug = debug;
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
    const playbackRate = sound.playOptions?.playbackRate || 1;
    const source = this.context.createBufferSource();
    console.log('SETUPBUFFER', source.buffer, sound.buffer, playbackRate);
    source.buffer = sound.buffer;

    // Set playback rate before connecting
    source.playbackRate.setValueAtTime(playbackRate, this.context.currentTime);

    // Connect audio nodes
    this.connectAudioNodes(sound, source);

    // Set up onended handler
    source.onended = () => {
      this.debugLog(`Sound ${sound.id} ended naturally`);
      if (sound.state === SoundState.Playing && sound.playOptions?.loop) {
        this.handleLoopIteration(sound);
      } else {
        this.handleSoundEnded(sound);
      }
    };

    // Store the active source
    this.activeSources.set(sound.id, source);

    return source;
  }

  private handleLoopIteration(sound: Sound): void {
    this.debugLog(`Restarting loop for sound ${sound.id}`);

    sound.currentLoopCount = (sound.currentLoopCount ?? 0) + 1;

    // Check if we've reached max loops (0 means infinite)
    if (
      sound.playOptions?.maxLoops !== undefined &&
      sound.playOptions?.maxLoops > 0 &&
      sound.currentLoopCount >= sound.playOptions?.maxLoops
    ) {
      sound.currentLoopCount = 0;
      this.stop(sound.id);
      return;
    }

    // This works after the second time playing after a loop
    // this.play(sound.id, sound.playOptions);

    this.seek(sound.id, 0, true);

    this.dispatchEvent({
      type: SoundEventsEnum.LOOP_COMPLETED,
      soundId: sound.id,
      timestamp: this.context.currentTime,
      sound
    });
  }

  private handleSoundEnded(sound: Sound): void {
    // If the sound is already stopped, do nothing
    if (sound.state === SoundState.Stopped) {
      return;
    }

    // Update the sound state
    sound.state = SoundState.Stopped;
    sound.startTime = 0;
    sound.pausedAt = 0;

    // Clean up the existing source and stop progress tracking
    this.cleanupExistingSource(sound.id);
    this.stopProgressTracking(sound.id);

    // Dispatch the ENDED event
    this.dispatchEvent({
      type: SoundEventsEnum.ENDED,
      soundId: sound.id,
      timestamp: this.context.currentTime,
      sound,
    });

    // Clean up the sound
    this.cleanupSound(sound.id);
  }

  // Optional: Method to configure update interval
  public setProgressUpdateInterval(interval: number): void {
    this.PROGRESS_UPDATE_INTERVAL = interval;
  }

  private startProgressTracking(id: string): void {
    // Clear any existing tracking
    this.stopProgressTracking(id);

    const trackProgress = () => {
      const sound = this.sounds.get(id);
      if (!sound || sound.state !== SoundState.Playing) {
        this.stopProgressTracking(id);
        return;
      }

      const { currentTime, duration } = this.getSoundState(id);
      const progress = duration ? currentTime / duration : 0;

      this.dispatchEvent({
        type: SoundEventsEnum.PROGRESS,
        soundId: id,
        currentTime,
        duration: duration || 0,
        progress,
        progressInfo: {
          soundId: id,
          currentTime,
          duration: duration || 0,
          progress,
        },
        timestamp: this.context.currentTime,
        sound,
      });
    };

    // Add to ticker with specified interval
    this.ticker.addCallback(`progress_${id}`, trackProgress, this.PROGRESS_UPDATE_INTERVAL);
  }


  private stopProgressTracking(id: string): void {
    this.ticker.removeCallback(`progress_${id}`);
  }

  private cancelFadeAnimation(id: string): void {
    // Remove the fade callback from ticker
    this.ticker.removeCallback(`fade_${id}`);

    // Execute and remove any stored fade callback
    const fadeCallback = this.activeFadeCallbacks.get(id);
    if (fadeCallback) {
      fadeCallback(); // Execute callback to clean up
      this.activeFadeCallbacks.delete(id);
    }

    // Cancel any scheduled gain changes
    const sound = this.sounds.get(id);
    if (sound?.gainNode) {
      sound.gainNode.gain.cancelScheduledValues(this.context.currentTime);
    }

    // Reset fade states
    if (sound) {
      sound.isFadingIn = false;
      sound.isFadingOut = false;
    }
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
    // Clean up all sounds
    this.sounds.forEach((_sound, id) => {
      this.cleanupSound(id);
    });

    // Clear the sounds map
    this.sounds.clear();

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
    this.cleanupGlobalPan();

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

    // Just log the error without throwing
    if (this.config.debug) {
      console.error(message, error);
    } else {
      console.error(message);
    }

    // Only dispatch error event if we're not already handling an error
    if (!this.isHandlingError) {
      this.isHandlingError = true;
      try {
        this.dispatchEvent({
          type: SoundEventsEnum.ERROR,
          timestamp: this.context.currentTime,
          error: new Error(message),
        });
      } finally {
        this.isHandlingError = false;
      }
    }
  }

  // Playback control-----------------------------------------------------------------------------------------------------------


  public play(id: string, options: playOptions = {}): void {
    try {
      const sound = this.getValidatedSound(id);
      if (!sound) {
        this.debugLog(`Sound ${id} not found`);
        return;
      }

      // Merge existing playOptions with new options
      sound.playOptions = { ...sound.playOptions, ...options };
      console.log('PLAY with volume', sound.volume, sound.playOptions);

      // Default newSoundInstance to true if not provided
      const newSoundInstance = options.newSoundInstance ?? true;

      // If newSoundInstance is false, try to reuse the existing source
      if (!newSoundInstance) {
        this.cleanupExistingSource(id);
      }

      // Handle Loop options
      if (options.maxLoops === -1) {
        sound.playOptions.loop = true;
        sound.playOptions.maxLoops = 0; // Infinite loops
      } else {
        sound.playOptions.loop = options.loop || sound.playOptions.loop || false;
        sound.playOptions.maxLoops = options.maxLoops ?? sound.playOptions.maxLoops ?? 0;
      }

      // Setup volume
      const validatedVolume = this.setValidatedVolume(sound.playOptions?.volume ?? sound.volume);
      sound.volume = validatedVolume;
      sound.originalVolume = validatedVolume;

      const source = this.setupAudioSource(sound);
      if (!source) {
        this.debugLog(`Failed to create audio source for sound ${id}`);
        return;
      }

      const startTime = sound.pausedAt || options.startTime || 0;
      sound.currentTime = startTime; // Store the current time position

      // Configure playback rate
      const playbackRate = options.playbackRate ?? sound.playOptions?.playbackRate ?? 1;
      if (playbackRate !== undefined) {
        source.playbackRate.setValueAtTime(playbackRate, this.context.currentTime);
      }

      // Handle fade in
      if (options.fadeIn && options.isSeeking === false) {
        this.fadeIn(id, options.fadeIn, sound.playOptions.fadeInStartVolume ?? 0, options.volume);
      } else if (options.fadeOut && options.isSeeking === false) {
        // Set normal volume if no fade
        this.fadeOut(id, options.fadeOut);
      } else {
        sound.gainNode.gain.setValueAtTime(validatedVolume, this.context.currentTime);
      }

      // Apply pan if needed
      if (options.pan !== undefined) {
        this.setPan(id, options.pan);
      }

      // Ensure only one of pan or spatial audio is applied
      if (options.pan !== undefined && options.panSpatialPosition) {
        this.debugLog(`Both pan and panSpatialPosition provided for sound ${id}. Only one will be applied.`);
        // Prioritize spatial audio if both are provided
        this.setSoundPosition(options.panSpatialPosition.x, options.panSpatialPosition.y, options.panSpatialPosition.z, id);
      } else if (options.pan !== undefined) {
        // Apply normal panning
        this.setPan(id, options.pan);
      } else if (options.panSpatialPosition) {
        // Apply spatial audio
        this.setSoundPosition(options.panSpatialPosition.x, options.panSpatialPosition.y, options.panSpatialPosition.z, id);
      }

      // Calculate the buffer position
      const bufferPosition = startTime * playbackRate; // Adjust start time for playback rate

      // If isSeeking is true, only seek and don't start playback unless the sound was already playing
      if (options.isSeeking) {
        if (sound.state === SoundState.Playing) {
          // If the sound was already playing, continue playing from the new position
          source.start(0, bufferPosition, sound.buffer.duration);
          sound.state = SoundState.Playing;
        } else {
          // If the sound was not playing, just update the position without starting playback
          sound.pausedAt = startTime;
          sound.currentTime = startTime;
          sound.state = SoundState.Paused;
        }
      } else {
        // Normal playback behavior
        source.start(0, bufferPosition, sound.buffer.duration);
        sound.state = SoundState.Playing;
      }

      sound.startTime = this.context.currentTime;

      this.startProgressTracking(id);

      this.debugLog(`Playing sound ${id}:
        Sound duration: ${sound.buffer.duration}s
        Start offset: ${startTime}s
        Buffer Position: ${bufferPosition}s
        Playback Rate: ${playbackRate}
        Volume: ${validatedVolume}
        Pan: ${options.pan}
        Pan spatial position: ${options.panSpatialPosition}
        Loop: ${sound.playOptions.loop}
        Fade in: ${options.fadeIn ? options.fadeIn + "ms" : "no"}
        Is Seeking: ${options.isSeeking ? "yes" : "no"}
      `);

      this.dispatchEvent({
        type: SoundEventsEnum.STARTED,
        soundId: id,
        timestamp: this.context.currentTime,
        sound,
      });
    } catch (error) {
      this.handleError("playing sound", error, id);
    }
  }

  public playSprite(id: string, spriteKey: string, options: playOptions): void {
    const spriteId = `${id}_${spriteKey}`;
    this.play(spriteId, options);
  }

  public pause(id: string): void {
    console.log("pause", id);
    try {
      const sound = this.getValidatedSound(id);
      if (!this.isPlaying(id) || this.isPaused(id)) return;

      // Get the current playback position from the sound's state
      const { currentTime } = this.getSoundState(id);
      sound.pausedAt = currentTime;

      // Update state
      sound.state = SoundState.Paused;

      // Stop current source without triggering onended
      this.cleanupExistingSource(id);

      this.stopProgressTracking(id);

      this.dispatchEvent({
        type: SoundEventsEnum.PAUSED,
        soundId: id,
        timestamp: this.context.currentTime,
        sound,
      });

      this.debugLog("Pause state:", {
        id,
        pausedAt: sound.pausedAt,
      });
    } catch (error) {
      this.handleError("pausing sound", error, id);
    }
  }

  public resume(id: string): void {
    console.log("resume", id);
    this.play(id);
    let sound = this.getValidatedSound(id);
    try {
      this.dispatchEvent({
        type: SoundEventsEnum.RESUMED,
        soundId: id,
        timestamp: this.context.currentTime,
        sound,
      });
      this.debugLog(`Resumed sound ${id}:`);
    } catch (error) {
      this.handleError("resuming sound", error, id);
    }
  }

  public stop(id: string, dispatchEvent = true): void {
    try {
      const sound = this.sounds.get(id);
      if (!sound) {
        this.debugLog(`Sound ${id} not found for stopping`);
        return;
      }

      // Cancel any ongoing operations first
      this.cancelFadeAnimation(id);
      this.stopProgressTracking(id);

      // Stop and cleanup the source first
      this.cleanupExistingSource(id);

      // Reset state after source cleanup
      sound.state = SoundState.Stopped;
      sound.startTime = 0;
      sound.pausedAt = 0;
      sound.currentTime = 0;

      // Clear audio processing while preserving spatial audio
      this.clearAudioProcessing(id, true);

      if (dispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.STOPPED,
          soundId: id,
          timestamp: this.context.currentTime,
          sound
        });
      }

    } catch (error) {
      console.error(`Error stopping sound ${id}:`, error);
      // Avoid recursive error handling
      this.dispatchEvent({
        type: SoundEventsEnum.ERROR,
        timestamp: this.context.currentTime,
        error: new Error(`Failed to stop sound ${id}: ${error}`),
      });
    }
  }

  private cleanupExistingSource(id: string): void {
    try {
      const currentSource = this.activeSources.get(id);
      if (currentSource) {
        try {
          currentSource.stop();
        } catch (e) {
          // Ignore errors if source is already stopped
          this.debugLog(`Warning: Could not stop source for ${id}: ${e}`);
        }
        currentSource.disconnect();
        currentSource.onended = null;
        this.activeSources.delete(id);
      }
    } catch (error) {
      this.debugLog(`Error cleaning up source for ${id}: ${error}`);
      // Don't throw, just log
    }
  }

  public setPlaybackRate(id: string, rate: number, skip: boolean = false): void {
    console.log('setPlaybackRate', id, rate);
    if (!id || typeof rate !== "number" || isNaN(rate) || rate <= 0) {
      this.debugLog("Invalid parameters for playback rate change");
      return;
    }

    try {
      const sound = this.getValidatedSound(id);
      const source = this.activeSources.get(id);
      console.log('new rate', rate, sound.playOptions);
      // Initialize or update playOptions in one step
      sound.playOptions = {
        ...sound.playOptions,
        playbackRate: rate,
      };

      console.log('mofified rate', rate, sound.playOptions);

      if (!sound) {
        this.debugLog(`Sound ${id} not found for playback rate change`);
        return;
      }

      if (!source) {
        this.debugLog(`No active source found for sound ${id}, playback rate not set`);
        return;
      }

      // Update the playback rate
      source.playbackRate.setValueAtTime(rate, this.context.currentTime);

      if(skip) {
        return;
      }
      
      this.seek(id, this.getSoundState(id).currentTime);

      // Dispatch event
      this.dispatchEvent({
        type: SoundEventsEnum.PLAYBACK_RATE_CHANGED,
        soundId: id,
        timestamp: this.context.currentTime,
        playbackRate: rate,
        sound
      });

      this.debugLog(`Playback rate set for sound ${id}: ${rate}`);
    } catch (error) {
      this.handleError("setting playback rate", error, id);
    }
  }

  public seek(id: string, time: number, skipDispatchEvent: boolean = false): void {
    try {
      const sound = this.getValidatedSound(id);
      const playbackRate = sound.playOptions?.playbackRate || 1;
      const adjustedDuration = sound.buffer.duration / playbackRate;

      console.log('SEEK with volume', sound.volume);
      // Clamp time based on adjusted duration
      const clampedTime = Math.max(0, Math.min(time, adjustedDuration));

      // Check if the seek position is at the end of the sound
      if (clampedTime >= adjustedDuration) {
        // If the sound is already stopped, do nothing
        if (sound.state === SoundState.Stopped) {
          return;
        }

        // Handle looping if enabled
        if (sound.state === SoundState.Playing && sound.playOptions?.loop) {
          this.handleLoopIteration(sound);
        } else {
          this.handleSoundEnded(sound);
        }

        return;
      }

      // Update the pausedAt property to store the seek position
      sound.pausedAt = clampedTime;

      // If the sound is currently playing, stop it and restart from the new position
      if (sound.state === SoundState.Playing) {
        this.cleanupExistingSource(id);

        // Update startTime to reflect the new playback position
        sound.startTime = this.context.currentTime - clampedTime / playbackRate;

        this.play(id, {
          startTime: clampedTime,
          newSoundInstance: false,
          isSeeking: true, // Indicate that this is a seek operation
        });
      } else {
        // If the sound is paused, update the pausedAt value
        sound.pausedAt = clampedTime;
      }

      if (skipDispatchEvent) return;

      this.dispatchEvent({
        type: SoundEventsEnum.SEEKED,
        soundId: id,
        currentTime: clampedTime, // Use adjusted time for event
        timestamp: this.context.currentTime,
        sound,
      });
    } catch (error) {
      this.handleError("seeking sound", error, id);
    }
  }


  // End Playback control-----------------------------------------------------------------------------------------------------------

  // Volume control-----------------------------------------------------------------------------------------------------------------

  private roundedValue(value: number, decimals: number = this.DEFAULT_PRECISION): number {
    return Number(value.toFixed(decimals));
  }

  public setSoundVolume(id: string, volume: number): void {
    try {
      // Cancel any ongoing fade animation
      this.cancelFadeAnimation(id);

      const sound = this.getValidatedSound(id);
      const validatedVolume = this.setValidatedVolume(volume);
      sound.volume = this.roundedValue(validatedVolume);
      sound.originalVolume = validatedVolume;
      console.log('Set sound volume ', sound.volume, validatedVolume)
      sound.gainNode.gain.setValueAtTime(validatedVolume, this.context.currentTime);
      this.dispatchEvent({
        type: SoundEventsEnum.VOLUME_CHANGED,
        soundId: id,
        timestamp: this.context.currentTime,
        volume: sound.volume,
        sound
      });
    } catch (error) {
      this.handleError("setting volume", error, id);
    }
  }

  public getSoundVolume(id: string): number {
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
      isMaster: true,
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

  public toggleMute(id: string): void {
    const sound = this.getValidatedSound(id);
    if (sound.volume > 0) {
      this.mute(id);
    } else {
      this.unmute(id);
    }
  }

  public mute(id: string): void {
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
        sound
      });
    } catch (error) {
      this.handleError("muting sound", error, id);
    }
  }

  public unmute(id: string): void {
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
        sound
      });
    } catch (error) {
      this.handleError("unmuting sound", error, id);
    }
  }

  public toggleGlobalMute(): void {
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
            currentTime: 0,
            pausedAt: 0,
            state: SoundState.Stopped,
            volume: this.config.defaultVolume!,
            originalVolume: this.config.defaultVolume!,
            playOptions: { loop: this.config.loopSounds ?? false, maxLoops: -1, playbackRate: 1, pan: 0, volume: this.config.defaultVolume || 1 },
            panSpatialPosition: { x: 0, y: 0, z: 0 },
            pan: 0,
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

  public async updateSoundUrl(id: string, newUrl: string): Promise<void> {
    try {
      const sound = this.sounds.get(id);
      if (!sound) {
        this.debugLog(`Sound ${id} not found for URL update`);
        return;
      }

      // Clean up the existing sound
      this.cleanupSound(id);

      // Load the new sound
      await this.preloadSounds([{ id, url: newUrl }]);

      this.dispatchEvent({
        type: SoundEventsEnum.UPDATED_URL,
        soundId: id,
        timestamp: this.context.currentTime,
        sound
      });

      this.debugLog(`Sound ${id} URL updated to ${newUrl}`);
    } catch (error) {
      this.handleError("updating sound URL", error, id);
    }
  }

  public updateSoundOptions(soundId: string, options: Partial<playOptions>): void {
    const sound = this.sounds.get(soundId);
    if (!sound) {
      this.debugLog(`Sound ${soundId} not found for updating options`);
      return;
    }

    sound.playOptions = { ...sound.playOptions, ...options };

    // Update sound properties
    if (options.loop !== undefined) {
      sound.playOptions.loop = options.loop;
    }
    if (options.maxLoops !== undefined) {
      sound.playOptions.maxLoops = options.maxLoops;
      // Reset loop count when changing max loops
      sound.currentLoopCount = 0;
    }

    this.debugLog(`Updated options for sound ${soundId}:`, options);

    // Dispatch event for UI updates
    this.dispatchEvent({
      type: SoundEventsEnum.OPTIONS_UPDATED,
      soundId,
      timestamp: this.context.currentTime,
      options,
    });
  }

  public setSoundSprite(id: string, sprite: { [key: string]: [number, number] }): void {
    try {
      const originalSound = this.getValidatedSound(id);
      if (!originalSound || !originalSound.buffer) {
        throw new Error(`Sound ${id} not found or buffer not loaded`);
      }

      Object.entries(sprite).forEach(([key, [start, end]]) => {
        const spriteId = `${id}_${key}`;
        this.debugLog(
          `Creating sprite ${spriteId} for sound ${id}: Start=${start}ms, End=${end}ms, Duration=${end - start}ms`
        );

        // Convert milliseconds to samples
        const sampleRate = originalSound.buffer.sampleRate;
        const startSample = Math.floor((start / 1000) * sampleRate);
        const endSample = Math.floor((end / 1000) * sampleRate);
        const duration = (end - start) / 1000;

        // Create a new buffer for the sprite
        const numberOfChannels = originalSound.buffer.numberOfChannels;
        const spriteBuffer = this.context.createBuffer(numberOfChannels, endSample - startSample, sampleRate);

        // Copy the data from the original buffer to the sprite buffer
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const originalData = originalSound.buffer.getChannelData(channel);
          const spriteData = spriteBuffer.getChannelData(channel);

          for (let i = 0; i < spriteData.length; i++) {
            spriteData[i] = originalData[i + startSample];
          }
        }

        // Create audio nodes for the sprite
        const gainNode = this.context.createGain();
        gainNode.gain.value = originalSound.volume;
        gainNode.connect(this.masterGainNode);

        // Create the sprite sound object
        const spriteSound: Sound = {
          id: spriteId,
          buffer: spriteBuffer,
          volume: originalSound.volume,
          originalVolume: originalSound.volume,
          state: SoundState.Stopped,
          gainNode: gainNode,
          duration: duration,
          playOptions: { ...originalSound.playOptions },
          currentLoopCount: 0,
          pausedAt: 0, //this.context.currentTime
          startTime: 0,
        };

        // Add stereoPanner if needed
        if (originalSound.stereoPanner) {
          const stereoPanner = this.context.createStereoPanner();
          stereoPanner.connect(gainNode);
          spriteSound.stereoPanner = stereoPanner;
        }

        // Store the new sprite sound
        this.sounds.set(spriteId, spriteSound);

        this.debugLog(`Created sprite sound ${spriteId}:
                Duration: ${duration}s
                Sample rate: ${sampleRate}
                Channels: ${numberOfChannels}
                Buffer length: ${spriteBuffer.length} samples
            `);

        // Dispatch event to notify that sprites have been created
        this.dispatchEvent({
          type: SoundEventsEnum.SPRITE_SET,
          soundId: spriteId,
          timestamp: this.context.currentTime,
          sound: spriteSound
        });
      });
    } catch (error) {
      this.handleError("setting sound sprite", error, id);
    }
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

    // Calculate adjusted duration based on playbackRate
    const playbackRate = sound.playOptions?.playbackRate || 1;
    const adjustedDuration = sound.buffer ? sound.buffer.duration / playbackRate : 0;
    console.log('getSoundState', sound.state, adjustedDuration, playbackRate);
    if (sound.state === SoundState.Playing) {
      const elapsedTime = this.context.currentTime - sound.startTime;
      // Don't multiply by playbackRate here since elapsedTime is already in real-time
      currentTime = (sound.currentTime || 0) + elapsedTime;

      // Handle looping
      if (sound.playOptions?.loop) {
        currentTime = currentTime % adjustedDuration;
      }
    } else if (sound.state === SoundState.Paused || sound.state === SoundState.Stopped) {
      console.log('paused at', sound.pausedAt);
      currentTime = sound.pausedAt || 0;
    }

    // Ensure currentTime doesn't exceed adjusted duration
    if (sound.buffer) {
      currentTime = Math.min(currentTime, adjustedDuration);
    }

    console.log('getSoundState', currentTime, adjustedDuration, playbackRate, sound.buffer);

    this.debugLog(`Sound state for ${id}:
      State: ${sound.state}
      Initial offset: ${sound.currentTime}s
      Elapsed time: ${sound.state === SoundState.Playing ? this.context.currentTime - sound.startTime : 0}s
      Current time: ${currentTime}s
      Raw Duration: ${sound.buffer?.duration || 0}s
      Adjusted Duration: ${adjustedDuration}s
      Playback Rate: ${playbackRate}
      Volume: ${sound.volume}
      Pan: ${sound.pan},
      Pan Spatial Position: ${JSON.stringify(sound.panSpatialPosition)}
    `);

    return {
      currentTime,
      duration: adjustedDuration || null,
      state: sound.state,
      volume: sound.volume,
      playbackRate: playbackRate,
      pan: sound.pan || sound?.playOptions?.pan || 0,
      panSpatialPosition: sound?.panSpatialPosition || { x: 0, y: 0, z: 0 },
    };
  }

  // Returns the current playback time in seconds
  public getCurrentTime(id: string): number {
    const { currentTime } = this.getSoundState(id);
    return currentTime;
  }

  // Returns the progress as a ratio (0-1)
  public getProgress(id: string): number {
    const { currentTime, duration } = this.getSoundState(id);
    if (!duration) return 0;
    return currentTime / duration;
  }

  // Returns the progress as a percentage (0-100)
  public getProgressPercentage(id: string): number {
    return this.getProgress(id) * 100;
  }

  // End State checks---------------------------------------------------------------------------------------------------------------

  // Master / Global batch operations-----------------------------------------------------------------------------------------------

  public stopAllSounds(): void {
    try {
      const activeIds = Array.from(this.activeSources.keys());
      activeIds.forEach((id) => this.stop(id));
      this.debugLog("All sounds stopped");
    } catch (error) {
      this.handleError("stopping all sounds", error);
    }
  }

  public pauseAllSounds(): void {
    this.sounds.forEach((sound, id) => {
      if (sound.state === SoundState.Playing) {
        this.pause(id);
      }
    });
  }

  public resumeAllSounds(): void {
    this.sounds.forEach((sound, id) => {
      if (sound.state == SoundState.Paused) {
        this.resume(id);
      }
    });
  }

  public resetSound(id: string, options: SoundResetOptions = {}): void {
    console.log('reset sound?', id);
    const sound = this.sounds.get(id);

    if (!sound) {
      this.debugLog(`Sound ${id} not found for reset`);
      return;
    }

    this.debugLog(`Resetting sound ${id} with options:`, options);

    // Stop the sound if it's playing
    if (sound.state === SoundState.Playing) {
      this.stop(id);
    }

    // Reset sound state
    sound.state = SoundState.Stopped;
    sound.startTime = 0;
    sound.pausedAt = 0;
    sound.currentTime = 0;

    if (!options.keepPlaybackRate) {
      this.setPlaybackRate(id, 1);
    }

    // Reset volume if not keeping volumes
    if (!options.keepVolumes) {
      this.setSoundVolume(id, this.config.defaultVolume ?? 1);
    }

    // Reset panning if not keeping panning
    if (!options.keepPanning && this.isStereoPanActive(id)) {
      this.removePan(id);
    }

    // Reset spatial audio if not keeping spatial
    if (!options.keepSpatial && this.isSpatialAudioActive(id)) {
      this.removeSpatialEffect(id);
      sound.panSpatialPosition = { x: 0, y: 0, z: 0 };
    }

    // Dispatch event to notify that the sound has been reset
    this.dispatchEvent({
      type: SoundEventsEnum.RESET,
      soundId: id,
      timestamp: this.context.currentTime,
      resetOptions: options,
      sound
    });

    this.debugLog(`Sound ${id} reset completed`);
  }

  public reset(options: SoundResetOptions = {}): void {
    this.debugLog("Resetting sound manager with options:", options);

    this.resetGlobalPan();
    this.resetMasterSpatial();

    // // Stop all playback and clean up sounds
    this.sounds.forEach((_sound, id) => {
      this.stop(id, false);
    });

    // Reset master controls if not keeping volumes
    if (!options.keepVolumes) {
      this.setGlobalVolume(this.config.defaultVolume ?? 1);
      if (this.isMuted) {
        this.unmuteAllSounds();
      }
    }

    // Reset master pan if not keeping panning
    if (!options.keepPanning) {
      this.resetGlobalPan();
    }

    // Handle loaded sounds
    if (options.unloadSounds) {
      this.cleanup();
      this.sounds.clear();
    } else {
      this.sounds.forEach((sound, id) => {
        if (!options.keepVolumes) {
          this.setSoundVolume(id, this.config.defaultVolume ?? 1);
        }

        if (!options.keepPanning && this.isStereoPanActive(id)) {
          this.removePan(id);
        }

        if (!options.keepSpatial && this.isSpatialAudioActive(id)) {
          this.removeSpatialEffect(id);
          sound.panSpatialPosition = { x: 0, y: 0, z: 0 };
        }

        if (!options.keepPlaybackRate) {
          this.setPlaybackRate(id, 1);
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

  // Usage in fadeIn and fadeOut
  public fadeIn(id: string, duration: number, startVolume?: number, endVolume: number = 1): void {
    console.log('Fade in', id, duration, startVolume, endVolume);
    const sound = this.getValidatedSound(id);

    // Cancel any ongoing fade animation
    this.cancelFadeAnimation(id);

    // Reset fade states
    sound.isFadingOut = false;
    sound.isFadingIn = true;

    // Get the current volume
    const currentVolume = sound.gainNode.gain.value;

    // Determine the start volume based on different conditions
    let effectiveStartVolume: number;

    if (startVolume !== undefined) {
      // If startVolume is explicitly provided, use it
      effectiveStartVolume = startVolume;
    } else if (sound.isFadingOut) {
      // If we're coming from a fadeOut, use the current volume
      effectiveStartVolume = currentVolume;
    } else if (currentVolume >= endVolume) {
      // If current volume is at or above target, start from 0
      effectiveStartVolume = 0;
    } else {
      // Otherwise, continue from current volume
      effectiveStartVolume = currentVolume;
    }

    // Store the original volume for potential future use
    sound.originalVolume = endVolume;

    // Immediately set the volume to the start value
    sound.gainNode.gain.setValueAtTime(effectiveStartVolume, this.context.currentTime);

    // Start the fade
    this.fadeSound(id, effectiveStartVolume, endVolume, duration);

    if (sound.state !== SoundState.Playing) {
      this.play(id, { newSoundInstance: false, volume: effectiveStartVolume });
    }
  }

  public fadeOut(
    id: string,
    duration: number = this.config.fadeOutDuration!,
    startVolume?: number,
    endVolume: number = 0,
    stopAfterFade: boolean = false
  ): void {
    const sound = this.getValidatedSound(id);

    // Cancel any ongoing fade animation
    this.cancelFadeAnimation(id);

    // Reset fade states
    sound.isFadingIn = false;
    sound.isFadingOut = true;

    // Use the current volume as the start volume if not provided
    const currentVolume = sound.gainNode.gain.value;
    const effectiveStartVolume = startVolume ?? currentVolume;

    // Store the current volume before fading out
    sound.previousVolume = currentVolume;

    // Immediately set the volume to the start value
    sound.gainNode.gain.setValueAtTime(effectiveStartVolume, this.context.currentTime);

    // Start the fade
    this.fadeSound(id, effectiveStartVolume, endVolume, duration, () => {
      if (endVolume === 0 && stopAfterFade) {
        this.stop(id);
      }
    });
  }

  private fadeSound(
    id: string,
    startVolume: number,
    targetVolume: number,
    duration: number,
    onComplete?: () => void
  ): void {
    try {
      const sound = this.getValidatedSound(id);
      sound.volume = startVolume;
      const fadeDuration = duration / 1000;

      // Cancel any previously scheduled changes to the gain value
      sound.gainNode.gain.cancelScheduledValues(this.context.currentTime);

      // Cancel any existing fade
      this.cancelFadeAnimation(id);

      const startTime = this.context.currentTime;
      const endTime = startTime + fadeDuration;

      // Store the new fade callback
      const fadeCompleteCallback = () => {
        sound.isFadingIn = false;
        sound.isFadingOut = false;
        onComplete?.();
        this.activeFadeCallbacks.delete(id);
      };
      this.activeFadeCallbacks.set(id, fadeCompleteCallback);

      const fadeId = `fade_${id}`;
      const updateFade = () => {
        const currentTime = this.context.currentTime;

        if (currentTime >= endTime) {
          // Fade complete
          sound.gainNode.gain.setValueAtTime(targetVolume, currentTime);
          sound.volume = this.roundedValue(targetVolume);

          this.dispatchEvent({
            type: SoundEventsEnum.VOLUME_CHANGED,
            soundId: id,
            timestamp: currentTime,
            volume: sound.volume,
            sound
          });

          // Clean up
          this.ticker.removeCallback(fadeId);
          fadeCompleteCallback();
          return;
        }

        // Calculate current volume based on progress
        const progress = (currentTime - startTime) / fadeDuration;
        const currentVolume = startVolume + (targetVolume - startVolume) * progress;

        sound.gainNode.gain.setValueAtTime(currentVolume, currentTime);
        sound.volume = this.roundedValue(currentVolume);

        this.dispatchEvent({
          type: SoundEventsEnum.VOLUME_CHANGED,
          soundId: id,
          timestamp: currentTime,
          volume: sound.volume,
          sound
        });
      };

      // Add fade update to ticker
      this.ticker.addCallback(fadeId, updateFade);

      this.debugLog(`Fade scheduled for sound ${id}:
        Start time: ${startTime}
        Duration: ${fadeDuration}
        Start volume: ${startVolume}
        Target volume: ${targetVolume}
      `);

    } catch (error) {
      this.handleError("fading sound", error, id);
    }
  }

  public fadeGlobalIn(duration: number = this.config.fadeInDuration!, startVolume?: number, endVolume?: number): void {
    try {
      const initialVolume = startVolume ?? 0;
      const targetVolume = endVolume ?? (this.masterGainNode.gain.value || this.previousGlobalVolume);

      // Cancel any scheduled changes
      this.masterGainNode.gain.cancelScheduledValues(this.context.currentTime);

      const startTime = this.context.currentTime;
      const fadeDuration = duration / 1000;
      const endTime = startTime + fadeDuration;

      const fadeId = 'fade_global_in';
      const updateGlobalFade = () => {
        const currentTime = this.context.currentTime;

        if (currentTime >= endTime) {
          this.masterGainNode.gain.setValueAtTime(targetVolume, currentTime);
          this.isMuted = false;

          this.dispatchEvent({
            type: SoundEventsEnum.FADE_MASTER_IN_COMPLETED,
            timestamp: currentTime,
            volume: targetVolume,
          });

          this.ticker.removeCallback(fadeId);
          return;
        }

        const progress = (currentTime - startTime) / fadeDuration;
        const currentVolume = initialVolume + (targetVolume - initialVolume) * progress;

        this.masterGainNode.gain.setValueAtTime(currentVolume, currentTime);

        this.dispatchEvent({
          type: SoundEventsEnum.MASTER_VOLUME_CHANGED,
          timestamp: currentTime,
          volume: currentVolume,
          isMaster: true,
        });
      };

      this.ticker.addCallback(fadeId, updateGlobalFade);

    } catch (error) {
      this.handleError("fading in master volume", error);
    }
  }

  public fadeGlobalOut(
    duration: number = this.config.fadeOutDuration!,
    startVolume?: number,
    endVolume: number = 0
  ): void {
    if (duration <= 0) {
      this.debugLog(`Invalid fade duration: ${duration}`);
      return;
    }

    try {
      const initialVolume = startVolume ?? this.masterGainNode.gain.value;
      this.previousGlobalVolume = initialVolume;

      const startTime = this.context.currentTime;
      const fadeDuration = duration / 1000;
      const endTime = startTime + fadeDuration;

      const fadeId = 'fade_global_out';
      const updateGlobalFade = () => {
        const currentTime = this.context.currentTime;

        if (currentTime >= endTime) {
          this.masterGainNode.gain.setValueAtTime(endVolume, currentTime);
          this.isMuted = endVolume === 0;

          this.dispatchEvent({
            type: SoundEventsEnum.FADE_MASTER_OUT_COMPLETED,
            timestamp: currentTime,
            volume: endVolume,
          });

          this.ticker.removeCallback(fadeId);
          return;
        }

        const progress = (currentTime - startTime) / fadeDuration;
        const currentVolume = initialVolume + (endVolume - initialVolume) * progress;

        this.masterGainNode.gain.setValueAtTime(currentVolume, currentTime);

        this.dispatchEvent({
          type: SoundEventsEnum.MASTER_VOLUME_CHANGED,
          timestamp: currentTime,
          volume: currentVolume,
          isMaster: true,
        });
      };

      this.ticker.addCallback(fadeId, updateGlobalFade);

    } catch (error) {
      this.handleError("fading out master volume", error);
    }
  }


  // End Fading ------------------------------------------------------------------------------------------------------------------------

  // Spatial audio (3D audio)-----------------------------------------------------------------------------------------------------------

  public isSpatialAudioEnabled(): boolean {
    return this.config.spatialAudio === true && this.isSpatialAudioSupported();
  }

  public setSoundPosition(
    x: number,
    y: number,
    z: number,
    soundId?: string | null,
    soundPannerConfig?: SoundPannerConfig
  ): void {
    x = this.roundedValue(x, 3);
    y = this.roundedValue(y, 3);
    z = this.roundedValue(z, 3);

    if (!this.config.spatialAudio) {
      this.debugLog("Spatial audio is not enabled");
      return;
    }

    if (!soundId) {
      this.debugLog(`Sound ${soundId} not found, global sound position will be used`);
      this.setMasterSpatialPosition(x, y, z, soundPannerConfig);
      return;
    }

    // Handle individual sound positioning
    const sound = this.sounds.get(soundId);
    if (!sound) {
      this.debugLog(`Sound ${soundId} not found for position setting`);
      return;
    }

    const source = this.activeSources.get(soundId);

    // If stereo panning is active, reset it without dispatching PAN_CHANGED
    if (sound.stereoPanner) {
      this.removePan(soundId);
      this.debugLog(`Removed stereo panner, and overwritten with spatial panning for sound ${soundId}`);
    }

    try {
      // Merge configurations in order of precedence
      const mergedConfig: SoundPannerConfig = {
        ...DEFAULT_PANNER_CONFIG, // Start with default config
        ...(this.config.pannerNodeConfig || {}), // Override with sound manager config if exists
        ...(soundPannerConfig || {}), // Override with specific config if provided
      };

      // Create a panner node if it doesn't exist
      if (!sound.pannerNode) {
        sound.pannerNode = this.context.createPanner();
        sound.pannerNode.panningModel = mergedConfig.panningModel!;
        sound.pannerNode.distanceModel = mergedConfig.distanceModel!;
        sound.pannerNode.refDistance = mergedConfig.refDistance!;
        sound.pannerNode.maxDistance = mergedConfig.maxDistance!;
        sound.pannerNode.rolloffFactor = mergedConfig.rolloffFactor!;
        sound.pannerNode.coneInnerAngle = mergedConfig.coneInnerAngle!;
        sound.pannerNode.coneOuterAngle = mergedConfig.coneOuterAngle!;
        sound.pannerNode.coneOuterGain = mergedConfig.coneOuterGain!;

        // Reconnect the audio nodes with the panner
        source?.disconnect();
        source?.connect(sound.pannerNode);
        sound.pannerNode.connect(sound.gainNode);
      } else if (soundPannerConfig) {
        // If panner exists and new config is provided, update only the provided values
        Object.entries(soundPannerConfig).forEach(([key, value]) => {
          if (value !== undefined) {
            (sound.pannerNode as any)[key] = value;
          }
        });
      }

      // Example usage to set the position of the sound source
      //pannerNode.positionX.setValueAtTime(1, audioContext.currentTime); // 1 meter to the right
      //pannerNode.positionY.setValueAtTime(0, audioContext.currentTime); // Same height as the listener
      //pannerNode.positionZ.setValueAtTime(-1, audioContext.currentTime); // 1 meter behind the listener


      // Update position
      sound.pannerNode.positionX.setValueAtTime(x, this.context.currentTime);
      sound.pannerNode.positionY.setValueAtTime(0, this.context.currentTime);
      sound.pannerNode.positionZ.setValueAtTime(z, this.context.currentTime);
      sound.panSpatialPosition = { x, y, z };

      this.dispatchEvent({
        type: SoundEventsEnum.SPATIAL_POSITION_CHANGED,
        soundId,
        timestamp: this.context.currentTime,
        position: sound.panSpatialPosition,
        pannerConfig: soundPannerConfig,
        sound
      });

      this.debugLog(`Set position for sound ${soundId}: x=${x}, y=${y}, z=${z}`);
    } catch (error) {
      this.handleError("setting sound position", error);
    }
  }

  public resetSoundPosition(id?: string): void {
    if (!this.config.spatialAudio) {
      this.debugLog("Spatial audio is not enabled");
      return;
    }

    // Reset master spatial position
    if (!id) {
      this.debugLog("Resetting master spatial position");
      this.setMasterSpatialPosition(0, 0, 0);

      this.dispatchEvent({
        type: SoundEventsEnum.SPATIAL_POSITION_RESET,
        timestamp: this.context.currentTime,
        isMaster: true,
      });
      return;
    }

    // Reset individual sound position
    const sound = this.sounds.get(id);
    if (!sound) {
      this.debugLog(`Sound ${id} not found for position reset`);
      return;
    }

    if (sound.pannerNode) {
      this.setSoundPosition(0, 0, 0, id);
      this.debugLog(`Reset position for sound ${id}`);

      this.dispatchEvent({
        type: SoundEventsEnum.SPATIAL_POSITION_RESET,
        soundId: id,
        timestamp: this.context.currentTime,
        isMaster: false,
        sound
      });
    }
  }

  public setMasterSpatialPosition(x: number, y: number, z: number, config: SoundPannerConfig = {}): void {
    try {
      // Create or update master panner node
      if (!this.masterPannerNode) {
        this.masterPannerNode = this.context.createPanner();
        // Disconnect and reconnect the nodes in the chain
        this.masterGainNode.disconnect();
        this.masterPannerNode.connect(this.context.destination);
        this.masterGainNode.connect(this.masterPannerNode);
      }

      // Update master panner position
      this.masterPannerNode.positionX.setValueAtTime(x, this.context.currentTime);
      this.masterPannerNode.positionY.setValueAtTime(y, this.context.currentTime);
      this.masterPannerNode.positionZ.setValueAtTime(z, this.context.currentTime);

      // Merge config values into masterPannerNode
      if (config.coneInnerAngle !== undefined) {
        this.masterPannerNode.coneInnerAngle = config.coneInnerAngle;
      }
      if (config.coneOuterAngle !== undefined) {
        this.masterPannerNode.coneOuterAngle = config.coneOuterAngle;
      }
      if (config.coneOuterGain !== undefined) {
        this.masterPannerNode.coneOuterGain = config.coneOuterGain;
      }
      if (config.distanceModel !== undefined) {
        this.masterPannerNode.distanceModel = config.distanceModel;
      }
      if (config.maxDistance !== undefined) {
        this.masterPannerNode.maxDistance = config.maxDistance;
      }
      if (config.panningModel !== undefined) {
        this.masterPannerNode.panningModel = config.panningModel;
      }
      if (config.refDistance !== undefined) {
        this.masterPannerNode.refDistance = config.refDistance;
      }
      if (config.rolloffFactor !== undefined) {
        this.masterPannerNode.rolloffFactor = config.rolloffFactor;
      }

      this.dispatchEvent({
        type: SoundEventsEnum.GLOBAL_SPATIAL_POSITION_CHANGED,
        timestamp: this.context.currentTime,
        position: { x, y, z },
      });

      this.debugLog(`Set master spatial position: x=${x}, y=${y}, z=${z}`);
    } catch (error) {
      this.handleError("setting master spatial position", error);
    }
  }

  public resetMasterSpatial(): void {
    try {
      // Reset the master spatial position to (0, 0, 0)
      if (this.masterPannerNode) {
        this.masterPannerNode.positionX.setValueAtTime(0, this.context.currentTime);
        this.masterPannerNode.positionY.setValueAtTime(0, this.context.currentTime);
        this.masterPannerNode.positionZ.setValueAtTime(0, this.context.currentTime);

        // Reset all spatial settings to their defaults using DEFAULT_PANNER_CONFIG
        this.masterPannerNode.coneInnerAngle = DEFAULT_PANNER_CONFIG.coneInnerAngle ?? 360;
        this.masterPannerNode.coneOuterAngle = DEFAULT_PANNER_CONFIG.coneOuterAngle ?? 360;
        this.masterPannerNode.coneOuterGain = DEFAULT_PANNER_CONFIG.coneOuterGain ?? 0;
        this.masterPannerNode.distanceModel = DEFAULT_PANNER_CONFIG.distanceModel ?? "inverse";
        this.masterPannerNode.maxDistance = DEFAULT_PANNER_CONFIG.maxDistance ?? 10000;
        this.masterPannerNode.panningModel = DEFAULT_PANNER_CONFIG.panningModel ?? "HRTF";
        this.masterPannerNode.refDistance = DEFAULT_PANNER_CONFIG.refDistance ?? 1;
        this.masterPannerNode.rolloffFactor = DEFAULT_PANNER_CONFIG.rolloffFactor ?? 0.2;

        // Optionally, disconnect and remove the masterPannerNode
        this.masterGainNode.disconnect(); // Disconnect from the masterPannerNode
        this.masterGainNode.connect(this.context.destination); // Reconnect directly to the destination
        this.masterPannerNode = null; // Clear the masterPannerNode reference
      }

      // Dispatch an event to notify listeners of the reset
      this.dispatchEvent({
        type: SoundEventsEnum.GLOBAL_SPATIAL_POSITION_CHANGED,
        timestamp: this.context.currentTime,
        position: { x: 0, y: 0, z: 0 },
      });

      this.debugLog("Reset master spatial position to (0, 0, 0) and cleared spatial settings.");
    } catch (error) {
      this.handleError("resetting master spatial position", error);
    }
  }

  // Add cleanup method for master panner
  public cleanupGlobalPan(): void {
    if (this.masterPannerNode) {
      this.masterPannerNode.disconnect();
      this.masterGainNode.disconnect();
      this.masterGainNode.connect(this.context.destination);
      this.masterPannerNode = null;
    }
  }

  public updatePannerConfigById(soundId: string, newConfig: Partial<SoundPannerConfig>): void {
    const sound = this.sounds.get(soundId);
    if (!sound?.pannerNode) {
      this.debugLog(`No panner node found for sound ${soundId}`);
      return;
    }

    try {
      Object.entries(newConfig).forEach(([key, value]) => {
        if (value !== undefined) {
          (sound.pannerNode as any)[key] = value;
        }
      });

      this.debugLog(`Updated panner config for sound ${soundId}`, newConfig);
    } catch (error) {
      this.handleError("updating panner configuration", error);
    }
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
        this.debugLog(`Removed 3D spatial audio, and overwritten with stereo panner for sound ${id}`);
        this.removeSpatialEffect(id);

        // Reset spatial position without dispatching SPATIAL_POSITION_CHANGED
        sound.panSpatialPosition = { x: 0, y: 0, z: 0 };
        if (sound.playOptions) {
          sound.playOptions.panSpatialPosition = { x: 0, y: 0, z: 0 };
        }
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
      sound.pan = Math.max(-1, Math.min(1, value));
      sound.stereoPanner.pan.setValueAtTime(sound.pan, this.context.currentTime);

      this.dispatchEvent({
        type: SoundEventsEnum.PAN_CHANGED,
        soundId: id,
        timestamp: this.context?.currentTime ?? 0,
        pan: sound.pan || 0,
        previousPan: this.previousGlobalPan,
        sound
      });

      this.debugLog(`Pan set for sound ${sound.id}: ${sound.pan}`);
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
        sound.pan = 0;
      }
    } catch (error) {
      this.handleError("removing pan", error, id);
    }
  }

  public setGlobalPan(value: number): void {
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
        isMaster: true,
      });

      this.debugLog(`Master pan set to: ${pannedValue}`);
    } catch (error) {
      this.handleError("setting master pan", error);
    }
  }

  public getGlobalPan(): number {
    return this.masterStereoPanner.pan.value;
  }

  public resetGlobalPan(): void {
    this.setGlobalPan(0);
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

  private cleanupSound(id: string): void {
    const sound = this.sounds.get(id);
    if (!sound) return;

    this.cancelFadeAnimation(id);
    this.cleanupExistingSource(id);

    // Cleanup panner nodes
    if (sound.pannerNode) {
      sound.pannerNode.disconnect();
      sound.pannerNode = undefined;
    }

    if (sound.stereoPanner) {
      sound.stereoPanner.disconnect();
      sound.stereoPanner = undefined;
    }

    // Cleanup gain node
    sound.gainNode.disconnect();

    // Remove the sound from the map
    this.sounds.delete(id);
  }

  public destroy(): void {
    try {
      this.cleanup();
      this.context.close();
      this.debugLog("SoundManager destroyed");
    } catch (error) {
      this.handleError("destroying sound manager", error);
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
