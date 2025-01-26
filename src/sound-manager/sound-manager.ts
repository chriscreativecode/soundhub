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
    if (sound.maxLoops !== undefined && sound.maxLoops > 0 && sound.currentLoopCount >= sound.maxLoops) {
      sound.currentLoopCount = 0;
      this.stop(sound.id);
      return;
    }

    this.seek(sound.id, 0);

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
    this.cleanupSound(sound.id);

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

    const volumeChangedEvent = {
      type: isMaster ? SoundEventsEnum.MASTER_VOLUME_CHANGED : SoundEventsEnum.VOLUME_CHANGED,
      timestamp: 0,
      volume: 0,
      soundId: soundId,
    };

    const monitorVolume = () => {
      const currentTime = this.context.currentTime;

      if (currentTime < endTime) {
        const currentVolume = gainNode.gain.value;
        volumeChangedEvent.timestamp = currentTime;
        volumeChangedEvent.volume = currentVolume;

        // Dispatch volume change event
        this.dispatchEvent({ ...volumeChangedEvent });

        // Schedule next monitoring frame
        requestAnimationFrame(monitorVolume);
      } else {
        // Final volume update
        const finalVolume = gainNode.gain.value;
        volumeChangedEvent.timestamp = currentTime;
        volumeChangedEvent.volume = finalVolume;

        // Dispatch final event
        this.dispatchEvent({ ...volumeChangedEvent });

        // Call completion callback
        onComplete?.();
      }
    };

    // Start monitoring directly
    monitorVolume();
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

    if (this.config.debug) {
      console.error(message, error);
    } else {
      console.error(message);
    }

    // Dispatch an error event
    this.dispatchEvent({
      type: SoundEventsEnum.ERROR,
      timestamp: this.context.currentTime,
      error: new Error(message),
    });
  }

  // Playback control-----------------------------------------------------------------------------------------------------------

  public play(id: string, options: playOptions = {}, spriteKey?: string): void {
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

      // Initialize gain value before setting up source
      sound.gainNode.gain.setValueAtTime(sound.volume, this.context.currentTime);
      const source = this.setupAudioSource(sound);

      // Apply the stored playback rate if it exists
      if (sound.playbackRate !== undefined) {
        source.playbackRate.setValueAtTime(sound.playbackRate, this.context.currentTime);
      }

      if (options.pan !== undefined) {
        this.setPan(id, options.pan);
      }

      if (options.fadeIn) {
        this.fadeIn(id, options.fadeIn);
      } else {
        sound.gainNode.gain.setValueAtTime(sound.volume, this.context.currentTime);
      }

      let startOffset = sound.pausedAt || options.startTime || 0;
      let endTime: number | undefined;

      // Handle sprite playback
      if (spriteKey && sound.sprite && sound.sprite[spriteKey]) {
        const [start, duration] = sound.sprite[spriteKey];
        startOffset = start / 1000; // Convert milliseconds to seconds
        endTime = (start + duration) / 1000; // Convert milliseconds to seconds
      }

      sound.startTime = this.context.currentTime - startOffset;
      sound.state = SoundState.Playing;

      // Start playback
      source.start(0, startOffset, endTime);

      this.dispatchEvent({
        type: SoundEventsEnum.STARTED,
        soundId: id,
        timestamp: this.context.currentTime,
      });
    } catch (error) {
      this.handleError("playing sound", error, id);
    }
  }

  public playSprite(id: string, spriteKey: string, options: playOptions = {}): void {
    this.play(id, options, spriteKey);
  }

  public pause(id: string): void {
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

  public resume(id: string): void {
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

  public stop(id: string): void {
    try {
      const sound = this.getValidatedSound(id);

      this.cleanupSound(id);
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

  public setPlaybackRate(id: string, rate: number): void {
    try {
      const sound = this.getValidatedSound(id);
      if (!sound) {
        this.debugLog(`Sound ${id} not found for playback rate change`);
        return;
      }
      // Clamp the playback rate to a reasonable range
      const clampedRate = Math.max(0.1, Math.min(4, rate));

      // Store the playback rate on the sound object
      sound.playbackRate = clampedRate;
      const source = this.activeSources.get(id);

      if (source) {
        source.playbackRate.setValueAtTime(clampedRate, this.context.currentTime);

        this.dispatchEvent({
          type: SoundEventsEnum.PLAYBACK_RATE_CHANGED,
          soundId: id,
          timestamp: this.context.currentTime,
          playbackRate: clampedRate,
        });

        this.debugLog(`Playback rate set for sound ${id}: ${clampedRate}`);
      } else {
        this.debugLog(`No active source found for sound ${id}, playback rate not set`);
      }
    } catch (error) {
      this.handleError("setting playback rate", error, id);
    }
  }

  public seek(id: string, time: number): void {
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
        this.handleseekEnd(sound, wasPlaying);
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

  private handleseekEnd(sound: Sound, wasPlaying: boolean): void {
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

  public setSoundVolume(id: string, volume: number): void {
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
            pausedAt: 0,
            state: SoundState.Stopped,
            volume: this.config.defaultVolume!,
            originalVolume: this.config.defaultVolume!,
            loop: this.config.loopSounds ?? false,
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

    // Update sound properties
    if (options.loop !== undefined) {
      sound.loop = options.loop;
    }
    if (options.maxLoops !== undefined) {
      sound.maxLoops = options.maxLoops;
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
      const sound = this.getValidatedSound(id);

      // Validate the sprite configuration
      for (const [key, [start, duration]] of Object.entries(sprite)) {
        if (typeof start !== "number" || typeof duration !== "number" || start < 0 || duration < 0) {
          throw new Error(
            `Invalid sprite configuration for key "${key}". Start and duration must be non-negative numbers.`
          );
        }
      }

      // Set the sprite configuration
      sound.sprite = sprite;

      this.dispatchEvent({
        type: SoundEventsEnum.SPRITE_SET,
        soundId: id,
        timestamp: this.context.currentTime,
        sprite,
      });

      this.debugLog(`Sprite configured for sound ${id}:`, sprite);
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

  public reset(options: SoundResetOptions = {}): void {
    this.debugLog("Resetting sound manager with options:", options);

    this.resetGlobalPan();
    this.resetMasterSpatial();

    // Stop all playback and clean up sounds
    this.sounds.forEach((_sound, id) => {
      this.cleanupSound(id);
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

  private fadeSound(
    id: string,
    startVolume: number,
    targetVolume: number,
    duration: number,
    onComplete?: () => void
  ): void {
    try {
      const sound = this.getValidatedSound(id);
      const fadeDuration = duration / 1000;

      // Ensure we have an active source
      if (!this.activeSources.has(id)) {
        this.debugLog(`No active source for sound ${id}, creating one`);
        this.play(id);
      }

      // Cancel any scheduled changes
      sound.gainNode.gain.cancelScheduledValues(this.context.currentTime);

      // Set the current value
      sound.gainNode.gain.setValueAtTime(startVolume, this.context.currentTime);

      // Schedule the fade
      sound.gainNode.gain.linearRampToValueAtTime(targetVolume, this.context.currentTime + fadeDuration);

      this.monitorVolumeChanges({
        gainNode: sound.gainNode,
        duration: fadeDuration,
        soundId: id,
        isMaster: false,
        onComplete: () => {
          sound.isFadingIn = false;
          sound.isFadingOut = false;
          onComplete?.();
        },
      });
    } catch (error) {
      this.handleError("fading sound", error, id);
    }
  }

  // Usage in fadeIn and fadeOut
  public fadeIn(id: string, duration: number, startVolume?: number, endVolume?: number): void {
    const sound = this.getValidatedSound(id);

    // Cancel any ongoing fades
    sound.gainNode.gain.cancelScheduledValues(this.context.currentTime);

    // Reset fade states
    sound.isFadingOut = false;
    sound.isFadingIn = true;

    startVolume = startVolume ?? 0;
    const targetVolume = endVolume ?? sound.originalVolume ?? sound.volume ?? 1;

    this.fadeSound(id, startVolume, targetVolume, duration);
  }

  public fadeOut(
    id: string,
    duration: number = this.config.fadeOutDuration!,
    startVolume?: number,
    endVolume: number = 0,
    stopAfterFade: boolean = false
  ): void {
    const sound = this.getValidatedSound(id);

    // If sound hasn't been played yet, we need to initialize it
    if (!this.activeSources.has(id)) {
      // Set initial volume
      sound.gainNode.gain.setValueAtTime(startVolume ?? sound.volume, this.context.currentTime);

      // Play the sound (this will create and connect the source)
      this.play(id);
    }

    // Cancel any ongoing fades
    sound.gainNode.gain.cancelScheduledValues(this.context.currentTime);

    // Reset fade states
    sound.isFadingIn = false;
    sound.isFadingOut = true;

    startVolume = startVolume ?? sound.volume;

    this.fadeSound(id, startVolume, endVolume, duration, () => {
      sound.isFadingOut = false;
      // Stop the sound after the fade-out completes
      if (endVolume === 0 && stopAfterFade) {
        this.stop(id);
      }
    });
  }

  public fadeGlobalIn(duration: number = this.config.fadeInDuration!, startVolume?: number, endVolume?: number): void {
    try {
      const initialVolume = startVolume ?? 0;
      const targetVolume = endVolume ?? (this.masterGainNode.gain.value || this.previousGlobalVolume);

      // Cancel any scheduled changes to the gain value
      this.masterGainNode.gain.cancelAndHoldAtTime(this.context.currentTime);

      // Start from initial volume
      this.masterGainNode.gain.setValueAtTime(initialVolume, this.context.currentTime);

      // Ramp to target volume
      this.masterGainNode.gain.linearRampToValueAtTime(targetVolume, this.context.currentTime + duration / 1000);

      this.isMuted = false;

      // Track the ongoing global fade
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
      // Determine start volume
      const initialVolume = startVolume ?? this.masterGainNode.gain.value;
      this.previousGlobalVolume = initialVolume; // Store volume for later

      // Cancel any scheduled changes to the gain value
      this.masterGainNode.gain.cancelAndHoldAtTime(this.context.currentTime);

      // Start fade from initial volume
      this.masterGainNode.gain.setValueAtTime(initialVolume, this.context.currentTime);

      // Ramp to target volume
      this.masterGainNode.gain.linearRampToValueAtTime(endVolume, this.context.currentTime + duration / 1000);

      // Track the ongoing global fade
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

  public setSoundPosition(
    x: number,
    y: number,
    z: number,
    soundId?: string | null,
    soundPannerConfig?: SoundPannerConfig
  ): void {
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

    // If stereo panning is active, warn and return
    if (sound.stereoPanner) {
      if (this.isStereoPanActive(soundId)) {
        this.removePan(soundId);
        this.debugLog(`Removed stereo panner, and overwritet with spatial panning for sound ${soundId}`);
      }
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

      // Update position
      sound.pannerNode.positionX.setValueAtTime(x, this.context.currentTime);
      sound.pannerNode.positionY.setValueAtTime(y, this.context.currentTime);
      sound.pannerNode.positionZ.setValueAtTime(z, this.context.currentTime);

      this.dispatchEvent({
        type: SoundEventsEnum.SPATIAL_POSITION_CHANGED,
        soundId,
        timestamp: this.context.currentTime,
        position: { x, y, z },
        pannerConfig: soundPannerConfig,
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

    // Cleanup active source
    const source = this.activeSources.get(id);
    if (source) {
      source.stop();
      source.disconnect();
      source.onended = null;
      this.activeSources.delete(id);
    }

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
