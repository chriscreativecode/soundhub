
import { AudioNodeConnector } from "./audio-node-connector";
import { PlayOptions } from "./play-sound-options.interface";
import { SoundEvent } from "./sound-event.interface";
import { SoundEventsEnum } from "./sound-events.enum";
import { SoundGroup } from "./sound-group";
import { DEFAULT_CONFIG, SoundManagerConfig } from "./sound-manager-config";
import { SoundManagerInterface } from "./sound-manager.interface";
import { DEFAULT_PANNER_CONFIG, SoundPannerConfig } from "./sound-panner-config";
import { SoundResetOptions } from "./sound-reset-options.interface";
import { SoundStateInfo } from "./sound-state-info.interface";
import { SoundState } from "./sound-state.interface";
import { Sound } from "./sound.interface";
import { Ticker } from "./ticker";

interface EventListener {
  callback: (event: SoundEvent) => void;
  filter?: { originalId?: string; instanceId?: string; instancePattern?: RegExp };
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
  private eventListeners: Map<SoundEventsEnum, Set<EventListener>> = new Map();
  private readonly activeSources: Map<string, AudioBufferSourceNode | null> = new Map();
  private activeFadeCallbacks: Map<string, () => void> = new Map();
  private isHandlingError: boolean = false;
  private audioNodeConnector: AudioNodeConnector = new AudioNodeConnector();
  private ticker: Ticker;
  private lastError: Error | null = null;
  private masterSpatialPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private readonly DEFAULT_PRECISION: number = 2;
  private soundGroups: Map<string, SoundGroup> = new Map();
  private instanceCounters: Map<string, number> = new Map();

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

      // Create and connect nodes in the correct order
      this.masterGainNode = this.context.createGain();
      this.masterStereoPanner = this.context.createStereoPanner();

      // Connect in chain: masterGainNode -> masterStereoPanner -> destination
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

  private debugLog(...args: any[]): void {
    if (this.config.debug) {
      console.log("[SoundManager]", ...args);
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
      // Forward Orientation
      listener.forwardX.setValueAtTime(0, this.context.currentTime);
      listener.forwardY.setValueAtTime(0, this.context.currentTime);
      listener.forwardZ.setValueAtTime(-1, this.context.currentTime);

      // Up Orientation
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
    const playbackRate = sound.playOptions?.playbackRate ?? 1;
    const source = this.context.createBufferSource();
    source.buffer = sound.buffer;
    sound.source = source;
    source.playbackRate.setValueAtTime(playbackRate, this.context.currentTime);

    this.audioNodeConnector.connectNodes(sound, this.masterGainNode);

    source.onended = () => {
      console.log('sound ended', sound.id);
      this.debugLog(`Sound ${sound.id} ended naturally`);
      if (sound.state === SoundState.Playing && sound.playOptions?.loop) {
        this.handleLoopIteration(sound);
      } else {
        this.handleSoundEnded(sound);
      }
    };

    this.activeSources.set(sound.id, source);

    return source;
  }

  private handleLoopIteration(sound: Sound): void {
    this.debugLog(`Restarting loop for sound ${sound.id}`);

    // Check if we've reached max loops (0 means infinite)
    if (
      sound.playOptions?.maxLoops !== undefined &&
      sound.playOptions?.maxLoops > 0 &&
      (sound.currentLoopCount ?? 0) >= sound.playOptions?.maxLoops - 1  // Subtract 1 to account for initial play
    ) {
      this.debugLog(`Max loops reached for ${sound.id}, stopping`);
      sound.currentLoopCount = 0;
      this.stop(sound.id);
      return;
    }

    // Increment the loop count
    sound.currentLoopCount = (sound.currentLoopCount ?? 0) + 1;

    console.log(`handle loop ${sound.id}`, sound.currentLoopCount);
    this.debugLog(`Loop count: ${sound.currentLoopCount}`);

    // Restart the current instance
    const startTime = (sound.playOptions?.startTime ?? 0) / (sound.playOptions?.playbackRate ?? 1);
    if (sound.playOptions?.createNewInstance) {
      sound.playOptions.createNewInstance = false;
    }

    this.seek(sound.id, startTime, true);

    this.dispatchEvent({
      type: SoundEventsEnum.LOOP_COMPLETED,
      soundId: sound.id,
      timestamp: this.context.currentTime,
      sound,
    });
  }

  private handleSoundEnded(sound: Sound): void {
    // If the sound is already stopped, do nothing
    if (sound.state === SoundState.Stopped) {
      return;
    }
    if (sound.playOptions?.pauseAtDurationReached && sound.playOptions?.duration !== undefined && sound.playOptions.duration > 0) {
      this.pause(sound.id);
      sound.startTime = undefined;
      sound.pausedAt = sound.playOptions?.startTime ?? 0;
      sound.currentTime = 0;
      return;
    }

    sound.state = SoundState.Stopped;
    sound.startTime = undefined;
    sound.pausedAt = sound.playOptions?.startTime ?? 0;
    sound.currentTime = 0;

    if (sound.playOptions?.createNewInstance) {
      // I could not use the cleanupSound in here, because when the first instance is stopped, the second and any other next instance will be stopped too
      // because of the disconnectNodes method in the cleanupSound method
       this.cleanupExistingSource(sound.id);
    } else {
      this.cleanupSound(sound.id);
    }

    this.stopProgressTracking(sound.id);

    // Clean up the sound
    if (sound.playOptions?.createNewInstance) {
      this.removeEventListenersForInstance(sound.id);
    }

    this.dispatchEvent({
      type: SoundEventsEnum.ENDED,
      soundId: sound.id,
      timestamp: this.context.currentTime,
      sound,
    });
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

  private cleanupSound(id: string): void {
    const sound = this.sounds.get(id);
    if (!sound) return;

    this.debugLog(`Cleaning up sound ${id}`);

    this.cancelFadeAnimation(id);

    this.stopProgressTracking(id);

    this.removeEventListenersForInstance(id);

    this.audioNodeConnector.disconnectNodes(sound);

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
      if (source) {
        try {
          source.onended = null;
          source.stop();
          source.disconnect();
        } catch (e) {
          // Ignore errors if source is already stopped
        }
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
      if (sound.source) {
        sound.source.stop();
        sound.source.disconnect();
        sound.source.onended = null;
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
    this.lastError = error instanceof Error ? error : new Error(errorMessage);

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

  private cleanupExistingSource(id: string): void {
    try {
      let sound = this.getValidatedSound(id);
      if (sound.source && sound.state === SoundState.Playing) {
        sound.source.stop();
        sound.source.onended = null;
        sound.source.disconnect();
        this.activeSources.delete(id);
        sound.source = null;
      }
    } catch (error) {
      this.debugLog(`Error cleaning up source for ${id}: ${error}`);
    }
  }

  private getInstanceCounter(id: string): number {
    // Extract the base ID (without any instance suffixes)
    const baseId = id.split(':')[0]; // Use ':' as separator

    // Get or initialize the counter for the base ID
    let counter = this.instanceCounters.get(baseId) || 0;

    // Increment the counter and store it
    this.instanceCounters.set(baseId, counter + 1);

    return counter + 1;
  }

  private resetCounterForSound(id: string): void {
    const baseId = id.split(':')[0];
    this.instanceCounters.delete(baseId);
    this.debugLog(`Counter reset for sound ${baseId}`);
  }

  private reconnectAudioNodes(id: string): void {
    const sound = this.sounds.get(id);
    if (!sound || !sound.source) return;
    this.audioNodeConnector.connectNodes(sound, this.masterGainNode);
  }

  // Playback control-----------------------------------------------------------------------------------------------------------
  public play(id: string, options: PlayOptions = {}, skipDispatchEvent: boolean = false): Sound | undefined {
    //    console.log('play sound', id);
    try {
      const originalSound = this.getValidatedSound(id);
      if (!originalSound) {
        this.debugLog(`Sound ${id} not found`);
      }

      let mergedPlayOptions = { ...originalSound.playOptions, ...options };
      const createNewInstance = mergedPlayOptions.createNewInstance ?? this.config.createNewInstance ?? false;

      let actualId = id;
      let instance: Sound | undefined;

      // Add to group if groupId is specified in options
      let groupId: string | undefined = options.groupId || originalSound.groupId;
      if (groupId) {
          let group = this.soundGroups.get(groupId);
          if (!group) {
              this.debugLog(`Group ${groupId} not found.`);
              return;
          }

          this.debugLog(`Group ${groupId} has ${group.sounds.size} instances. Max instances: ${group.maxInstances}`);

          // Enforce maxInstances before creating the new instance
          if (group.maxInstances && group.sounds.size >= group.maxInstances) {
              const oldestSoundId = Array.from(group.sounds)[0];
              this.debugLog(`Max instances reached. Stopping oldest instance: ${oldestSoundId}`);
              this.stop(oldestSoundId);
              group.sounds.delete(oldestSoundId);
              this.debugLog(`Stopped and removed oldest instance ${oldestSoundId} from group ${groupId}.`);
          }
      }

      if (createNewInstance) {
          const baseId = id.split(':')[0];
          const instanceNumber = this.getInstanceCounter(baseId);
          actualId = `${baseId}:${instanceNumber}`;
          this.debugLog(`Creating new instance with ID: ${actualId}`);

          instance = {
              ...originalSound,
              id: actualId,
              gainNode: this.context.createGain(),
              state: SoundState.Stopped,
              currentTime: 0,
              startTime: mergedPlayOptions?.startTime ?? 0,
              pausedAt: 0,
              currentLoopCount: 0,
              playOptions: {
                  ...mergedPlayOptions,
                  createNewInstance: false,
              },
          };

          this.sounds.set(actualId, instance);

          // Add the new instance to the group
          if (groupId) {
              this.addToSoundGroup(groupId, actualId);
              this.debugLog(`Added new instance ${actualId} to group ${groupId}.`);
          }
      }

      const sound = instance || originalSound;
      if (!sound) {
        this.debugLog(`Failed to create sound instance for ${id}`);
        return;
      }

      sound.playOptions = mergedPlayOptions;

      this.cleanupExistingSource(actualId);

      // Rest of your existing play logic...
      const source: AudioBufferSourceNode = this.setupAudioSource(sound);
      if (!source) {
        this.debugLog(`Failed to create audio source for sound ${id}`);
        return;
      }

      const playbackRate = mergedPlayOptions?.playbackRate || 1;
      let startOffset = 0;
      if (sound.pausedAt !== undefined && sound.pausedAt !== 0) {
        startOffset = sound.pausedAt;
      } else if (mergedPlayOptions.startTime !== undefined) {
        startOffset = mergedPlayOptions.startTime;
      }

      sound.startTime = this.context.currentTime - (startOffset / playbackRate);

      console.log(`playing sound ${sound.id} with a offset: `, sound.startTime, 'rate', playbackRate);

      this.reconnectAudioNodes(actualId);

      if (sound.playOptions?.volume !== undefined) {
        this.setSoundVolume(actualId, sound.playOptions.volume, true);
      }
      if (sound.playOptions?.pan !== undefined && sound.lastPanningType !== 'spatial') {
        this.setPan(actualId, sound.playOptions.pan, true);
      }
      if (sound.playOptions?.panSpatialPosition !== undefined && sound.lastPanningType === 'spatial') {
        this.setSpatialPosition(sound.playOptions.panSpatialPosition.x, sound.playOptions.panSpatialPosition.y, sound.playOptions.panSpatialPosition.z, actualId, undefined, true);
      }
      if (sound.playOptions?.fadeInDuration !== undefined) {
        this.fadeIn(actualId, sound.playOptions?.fadeInDuration ?? this.config?.fadeInDuration ?? 1);
      }
      if (sound.playOptions?.fadeOutDuration !== undefined) {
        this.fadeOut(actualId, sound.playOptions.fadeOutDuration);
      }
      if (sound.playOptions?.playbackRate !== undefined) {
        this.setPlaybackRate(actualId, playbackRate, true);
      }
      if (sound.playOptions?.loop !== undefined) {
        this.setLoop(actualId, sound.playOptions.loop, sound.playOptions.maxLoops);
      }

      source.start(0, startOffset,
        (mergedPlayOptions.duration !== undefined && mergedPlayOptions.duration > 0)
          ? mergedPlayOptions.duration * playbackRate
          : undefined
      );

      sound.state = SoundState.Playing;

      if (mergedPlayOptions.trackProgress || this.config.trackProgress) {
        this.startProgressTracking(actualId);
      }

      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.STARTED,
          soundId: id,
          timestamp: this.context.currentTime,
          sound,
        });
      }
      return sound;
    } catch (error) {
      this.handleError("playing sound", error, id);
    }
  }

  public playSprite(id: string, spriteKey: string, options: PlayOptions, skipDispatchEvent: boolean = false): void {
    const spriteId = `${id}_${spriteKey}`;
    this.play(spriteId, options, skipDispatchEvent);
  }

  public pause(id: string, skipDispatchEvent: boolean = false): void {
    try {
      const sound = this.getValidatedSound(id);
      if (!this.isPlaying(id) || this.isPaused(id)) return;


      // Get the current playback position from the sound's state
      const playbackRate = sound.playOptions?.playbackRate ?? 1;

      // Calculate the raw elapsed time since start
      const rawElapsedTime = (this.context.currentTime - (sound.startTime || 0)) * playbackRate;

      // Store raw time values
      sound.currentTime = rawElapsedTime;
      sound.pausedAt = rawElapsedTime;

      this.debugLog(`Pausing sound ${id}:
        Raw elapsed time: ${rawElapsedTime}
        Adjusted time: ${rawElapsedTime / playbackRate}
        StartTime: ${sound.startTime}
        CurrentTime: ${sound.currentTime}
        PausedAt: ${sound.pausedAt}
        PlaybackRate: ${playbackRate}
    `);

      sound.state = SoundState.Paused;

      this.cleanupExistingSource(id);

      this.stopProgressTracking(id);

      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.PAUSED,
          soundId: id,
          timestamp: this.context.currentTime,
          sound,
        });
      }
    } catch (error) {
      this.handleError("pausing sound", error, id);
    }
  }

  public resume(id: string, skipDispatchEvent: boolean = false): void {
    let sound = this.getValidatedSound(id);
    this.play(id, sound?.playOptions);
    try {
      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.RESUMED,
          soundId: id,
          timestamp: this.context.currentTime,
          sound,
        });
      }
      this.debugLog(`Resumed sound ${id}:`);
    } catch (error) {
      this.handleError("resuming sound", error, id);
    }
  }

  public stop(id: string, skipDispatchEvent: boolean = false): void {
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
      sound.startTime = sound.playOptions?.startTime ?? 0;
      sound.pausedAt = 0;
      sound.currentTime = 0;

      this.removeEventListenersForInstance(id);

      this.resetCounterForSound(id);

      if (!skipDispatchEvent) {
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

  public seek(id: string, time: number, skipDispatchEvent: boolean = false): void {
    try {
      const sound = this.getValidatedSound(id);
      const { duration, currentTime } = this.getSoundState(id);
      // Check if the seek position is at the end of the sound
      if (time >= duration) {
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

      const rawDuration = sound.buffer?.duration || 0;
      const playbackRate = sound.playOptions?.playbackRate || 1;


      // Convert UI time (adjusted) back to raw time for internal storage
      const rawTime = time * playbackRate;

      // Clamp time to valid range (using raw duration)
      const clampedTime = Math.max(0, Math.min(rawTime, rawDuration));

      // Store the raw time position
      sound.currentTime = clampedTime;
      sound.pausedAt = clampedTime;

      if (sound.state === SoundState.Playing) {
        this.cleanupExistingSource(id);
        sound.startTime = this.context.currentTime - (clampedTime / playbackRate);

        this.play(id, sound.playOptions);
      }

      if (skipDispatchEvent) return;

      this.dispatchEvent({
        type: SoundEventsEnum.SEEKED,
        soundId: id,
        currentTime: currentTime,
        timestamp: this.context.currentTime,
        sound,
      });
    } catch (error) {
      this.handleError("seeking sound", error, id);
    }
  }

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

  // End Playback control-----------------------------------------------------------------------------------------------------------

  // Fade managment ----------------------------------------------------------------------------------------------------------------

  public fadeIn(id: string, duration: number, startVolume?: number, endVolume: number = 1, skipDispatchEvent: boolean = false): void {
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
      effectiveStartVolume = sound?.originalVolume !== 1 ? (sound?.originalVolume ?? 0) : 0;
    } else {
      effectiveStartVolume = currentVolume;
    }

    sound.gainNode.gain.setValueAtTime(effectiveStartVolume, this.context.currentTime);

    if (sound.state !== SoundState.Playing) {
      this.play(id, { volume: effectiveStartVolume });
    }

    this.fadeSound(id, effectiveStartVolume, endVolume, duration, () => {
      // Update after sound callback is complete
      sound.volume = endVolume;
      if (sound.playOptions) {
        sound.playOptions.volume = endVolume;
      }

      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.FADE_IN_COMPLETED,
          soundId: id,
          timestamp: this.context.currentTime,
          sound,
        });
      }
    });

  }

  public fadeOut(
    id: string,
    duration: number = this.config.fadeOutDuration!,
    startVolume?: number,
    endVolume: number = 0,
    stopAfterFade: boolean = false,
    skipDispatchEvent: boolean = false
  ): void {
    const sound = this.getValidatedSound(id);

    this.cancelFadeAnimation(id);

    sound.isFadingIn = false;
    sound.isFadingOut = true;

    const currentVolume = sound.gainNode.gain.value;
    const effectiveStartVolume = startVolume ?? currentVolume;

    sound.previousVolume = currentVolume;

    sound.gainNode.gain.setValueAtTime(effectiveStartVolume, this.context.currentTime);

    if (sound.state !== SoundState.Playing) {
      this.play(id, { volume: effectiveStartVolume });
    }
    // Start the fade
    this.fadeSound(id, effectiveStartVolume, endVolume, duration, () => {
      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.FADE_OUT_COMPLETED,
          soundId: id,
          timestamp: this.context.currentTime,
          sound,
        });
      }
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
      const fadeDuration = duration;

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
        sound.volume = this.roundValue(targetVolume);
        sound.gainNode.gain.setValueAtTime(targetVolume, this.context.currentTime);
        onComplete?.();
        this.dispatchEvent({
          type: SoundEventsEnum.VOLUME_CHANGED,
          soundId: id,
          timestamp: this.context.currentTime,
          volume: sound.volume,
          sound
        });

        this.activeFadeCallbacks.delete(id);
      };
      this.activeFadeCallbacks.set(id, fadeCompleteCallback);

      const fadeId = `fade_${id}`;
      const updateFade = () => {
        const currentTime = this.context.currentTime;

        if (currentTime >= endTime) {
          // Clean up
          this.ticker.removeCallback(fadeId);
          fadeCompleteCallback();
          return;
        }

        // Calculate current volume based on progress
        const progress = (currentTime - startTime) / fadeDuration;
        const currentVolume = startVolume + (targetVolume - startVolume) * progress;

        sound.gainNode.gain.setValueAtTime(currentVolume, currentTime);
        sound.volume = this.roundValue(currentVolume);
        sound.playOptions = {
          ...sound.playOptions,
          volume: sound.volume,
        };

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
      const fadeDuration = duration;
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
      const fadeDuration = duration;
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

  // Volume control-----------------------------------------------------------------------------------------------------------------

  public getVolume(id: string): number {
    return this.getSoundVolume(id);
  }

  public setSoundVolume(id: string, volume: number, skipDispatchEvent: boolean = false): void {
    try {
      // Cancel any ongoing fade animation
      this.cancelFadeAnimation(id);

      const sound = this.getValidatedSound(id);
      const validatedVolume = this.setValidatedVolume(volume);
      sound.volume = this.roundValue(validatedVolume);
      sound.originalVolume = validatedVolume;
      sound.playOptions = {
        ...sound.playOptions,
        volume: validatedVolume,
      };

      sound.gainNode.gain.setValueAtTime(validatedVolume, this.context.currentTime);
      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.VOLUME_CHANGED,
          soundId: id,
          timestamp: this.context.currentTime,
          volume: sound.volume,
          sound
        });
      }

    } catch (error) {
      this.handleError("setting volume", error, id);
    }
  }

  public getSoundVolume(id: string): number {
    try {
      const sound = this.getValidatedSound(id);
      return sound.originalVolume ?? sound.volume ?? sound.playOptions?.volume ?? this.config.defaultVolume ?? 1;
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
      const volumeToRestore = sound.previousVolume ?? this.config.defaultVolume ?? 1;
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

  public toggleMute(id: string): void {
    const sound = this.getValidatedSound(id);
    if ((sound?.volume ?? sound?.originalVolume ?? sound.playOptions?.volume ?? 1) > 0) {
      this.mute(id);
    } else {
      this.unmute(id);
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

  // Loop control --------------------------------------------------------------------------------------------------------------------------------
  public setLoop(id: string, loop: boolean, maxLoops: number = -1): void {
    const sound = this.sounds.get(id);
    if (!sound) {
      this.debugLog(`Sound ${id} not found for setting loop`);
      return;
    }

    sound.playOptions = { ...sound.playOptions, loop, maxLoops };
    this.debugLog(`Loop set for sound ${id}: ${loop}`);
  }

  public getLoop(id: string): boolean {
    const sound = this.sounds.get(id);
    if (!sound) {
      this.debugLog(`Sound ${id} not found for getting loop`);
      return false;
    }

    return sound.playOptions?.loop ?? false;
  }

  // End loop control-----------------------------------------------------------------------------------------------------------------------------

  // Sound loading and management-----------------------------------------------------------------------------------------------------------------

  public async loadSounds(soundsToLoad: { id: string; url: string }[]): Promise<void> {
    try {
      const loadPromises: Promise<void>[] = soundsToLoad.map(async ({ id, url }) => {
        if (this.sounds.has(id)) {
          this.debugLog(`Sound with id ${id} already exists. Skipping.`);
          return;
        }

        try {
          // Fetch the audio file
          const response: Response = await fetch(url, {
            credentials: this.config.crossOrigin === "use-credentials" ? "include" : "same-origin",
            mode: this.config.crossOrigin ? "cors" : "no-cors",
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Decode the audio data
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer: AudioBuffer = await this.context.decodeAudioData(arrayBuffer);

          // Create and configure gain node
          const gainNode = this.context.createGain();
          gainNode.connect(this.masterGainNode);
          gainNode.gain.value = this.config.defaultVolume!;

          this.sounds.set(id, {
            id,
            buffer: audioBuffer,
            gainNode,
            source: this.context.createBufferSource(),
            startTime: undefined,
            currentTime: 0,
            pausedAt: undefined,
            state: SoundState.Stopped,
            volume: this.config.defaultVolume!,
            currentLoopCount: 0,
            originalVolume: this.config.defaultVolume!,
            playOptions: {
              startTime: this.config.defaultStartTime ?? 0,
              loop: this.config.loopSounds ?? false,
              maxLoops: this.config.maxLoops || -1,
              playbackRate: this.config.defaultPlaybackRate ?? 1,
              pan: this.config.defaultPan ?? 0,
              volume: this.config.defaultVolume ?? 1,
              trackProgress: this.config.trackProgress || this.config.createNewInstance ? false : true
            },
            panSpatialPosition: this.config.defaultPanSpatialPosition || { x: 0, y: 0, z: 0 },
            pan: this.config.defaultPan ?? 0,
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

  public async loadSound(id: string, url: string): Promise<void> {
    try {
      await this.loadSounds([{ id, url }]);
    } catch (error) {
      this.handleError("loading sound", error, id);
      throw error;
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
      await this.loadSound(id, newUrl);

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

  public unloadSound(id: string): void {
    const sound = this.sounds.get(id);
    if (!sound) {
      this.debugLog(`Sound ${id} not found for unloading`);
      return;
    }

    this.stop(id, false);
    this.cleanupSound(id);
    this.resetCounterForSound(id);

    this.dispatchEvent({
      type: SoundEventsEnum.UNLOADED,
      soundId: id,
      timestamp: this.context.currentTime,
      sound
    });

    this.debugLog(`Sound ${id} unloaded`);
  }

  public removeSound(id: string): void {
    try {
      const sound = this.sounds.get(id);
      if (!sound) return;
      this.unloadSound(id);
      this.sounds.delete(id);
      this.debugLog(`Removed sound ${id}`);
    } catch (error) {
      this.handleError("removing sound", error, id);
    }
  }

  public isSoundLoaded(id: string): boolean {
    const sound = this.sounds.get(id);
    return sound?.buffer != null;
  }

  // Sound group management ----------------------------------------------------------------------------------------------------------------------
  public createSoundGroup(
    groupName: string,
    options: {
      maxInstances?: number;
      playOptions?: PlayOptions; // Add playOptions to the group
    } = {}
  ): void {
    if (this.soundGroups.has(groupName)) {
      this.debugLog(`Group with id ${groupName} already exists.`);
      return;
    }

    this.soundGroups.set(groupName, {
      id: groupName,
      sounds: new Set(),
      maxInstances: options.maxInstances,
      playOptions: options.playOptions,
    });

    this.debugLog(`Created group ${groupName} with options:`, options);
  }

  public addToSoundGroup(groupName: string, soundId: string): void {
    const group = this.soundGroups.get(groupName);
    if (!group) {
      this.debugLog(`Group ${groupName} not found.`);
      return;
    }

    // Check if the group has reached its max instances limit
    if (group.maxInstances && group.sounds.size >= group.maxInstances) {
      // Stop the oldest instance to make room for the new one
      const oldestSoundId = Array.from(group.sounds)[0];
      this.stop(oldestSoundId); // Stop the oldest instance
      group.sounds.delete(oldestSoundId); // Remove it from the group
      this.debugLog(`Stopped oldest instance ${oldestSoundId} to make room for new instance in group ${groupName}.`);
    }

    // Add the new instance to the group
    const sound = this.sounds.get(soundId);
    if (sound) {
      sound.groupId = groupName;
    }
    if (sound && group.playOptions) {
      sound.playOptions = { ...group.playOptions, ...sound.playOptions };
    }

    group.sounds.add(soundId);
    this.debugLog(`Added sound ${soundId} to group ${groupName}.`);
  }

  public removeFromSoundGroup(groupName: string, soundId: string): void {
    const group = this.soundGroups.get(groupName);
    if (!group) {
      this.debugLog(`Group ${groupName} not found.`);
      return;
    }

    group.sounds.delete(soundId);
    this.debugLog(`Removed sound ${soundId} from group ${groupName}.`);
  }

  public getGroup(groupName: string): SoundGroup | undefined {
    return this.soundGroups.get(groupName);
  }

  public removeSoundGroup(groupName: string): void {
    const group = this.soundGroups.get(groupName);
    if (!group) {
      this.debugLog(`Group ${groupName} not found.`);
      return;
    }

    // Stop and clean up all sounds in the group
    group.sounds.forEach((soundId) => {
      this.stop(soundId);
      this.sounds.delete(soundId);
    });

    group.sounds.clear();
    this.soundGroups.delete(groupName);

    this.debugLog(`Cleaned up group ${groupName}.`);
  }

  //End Sound group management ----------------------------------------------------------------------------------------------------------------------


  // Sprite control----------------------------------------------------------------------------------------------------------------------------------
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
        const startSample = Math.floor(start * sampleRate);
        const endSample = Math.floor(end * sampleRate);
        const duration = end - start;

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
        const volume = originalSound.volume ?? this.config.defaultVolume ?? 1;
        gainNode.gain.value = volume;
        gainNode.connect(this.masterGainNode);


        // Create the sprite sound object
        const spriteSound: Sound = {
          id: spriteId,
          buffer: spriteBuffer,
          currentTime: 0,
          source: this.context.createBufferSource(),
          //  volume: volume,
          originalVolume: volume,
          state: SoundState.Stopped,
          gainNode: gainNode,
          // duration: duration,
          playOptions: { ...originalSound.playOptions },
          currentLoopCount: 0,
          panSpatialPosition: this.config.defaultPanSpatialPosition || { x: 0, y: 0, z: 0 },
          pan: originalSound.pan ?? this.config.defaultPan ?? 0,
          //  pausedAt: 0, //this.context.currentTime
          //  startTime: 0,
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

  public getSpriteConfig(id: string): { [key: string]: [number, number] } | undefined {
    try {
      const sound = this.getValidatedSound(id);
      return sound?.sprite;
    } catch (error) {
      this.handleError("getting sprite config", error, id);
      return undefined;
    }
  }

  public removeSpriteSound(spriteKey: string): void {
    try {
      // Find all sprite instances that match the spriteKey
      const spriteInstances = Array.from(this.sounds.keys()).filter(key => key.includes(`_${spriteKey}`));

      if (spriteInstances.length === 0) {
        this.debugLog(`No sprite instances found for key: ${spriteKey}`);
        return;
      }

      // Stop and remove each sprite instance
      spriteInstances.forEach(instanceId => {
        this.stop(instanceId); // Stop the instance
        this.cleanupSound(instanceId); // Clean up resources
        this.sounds.delete(instanceId); // Remove from the sounds map
        this.debugLog(`Removed sprite instance: ${instanceId}`);
      });
      this.debugLog(`All instances of sprite ${spriteKey} removed`);
    } catch (error) {
      this.handleError("removing sprite sound", error, spriteKey);
    }
  }

  public removeSpriteConfig(id: string): void {
    try {
      const sound = this.getValidatedSound(id);
      if (sound) {
        sound.sprite = undefined;
        this.debugLog(`Removed sprite config for sound ${id}`);
      }
    } catch (error) {
      this.handleError("removing sprite config", error, id);
    }
  }

  // End Sprite control-----------------------------------------------------------------------------------------------------------------------------

  // Context -------------------------------------------------------------------------------------------------------------------------------------
  public async suspendContext(): Promise<void> {
    try {
      await this.context.suspend();
      this.debugLog('Audio context suspended');
    } catch (error) {
      this.handleError("suspending context", error);
    }
  }

  public async resumeContext(): Promise<void> {
    try {
      await this.context.resume();
      this.debugLog('Audio context resumed');
    } catch (error) {
      this.handleError("resuming context", error);
    }
  }

  public getContext(): AudioContext {
    return this.context;
  }

  // End Context -----------------------------------------------------------------------------------------------------------------------------------


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

  public isStopped(id: string): boolean {
    try {
      const sound = this.getValidatedSound(id);
      return sound.state === SoundState.Stopped;
    } catch {
      return true;
    }
  }

  public getSoundState(id: string): SoundStateInfo {
    const sound = this.getValidatedSound(id);
    if (!sound) {
      this.debugLog('sound not found in getSoundState', sound);
    }

    const playbackRate = sound.playOptions?.playbackRate ?? 1;
    const rawDuration = sound.buffer?.duration ?? 0;
    const adjustedDuration = rawDuration / playbackRate;

    let currentTime = 0;
    let elapsedTime = 0;

    if (sound.state === SoundState.Playing && sound.startTime !== undefined) {
      elapsedTime = (this.context.currentTime - sound.startTime) * playbackRate;
      currentTime = elapsedTime;

      if (sound.playOptions?.loop) {
        currentTime = currentTime % rawDuration;
      }
    } else {
      currentTime = sound.pausedAt || sound.currentTime || 0;
      elapsedTime = currentTime;
    }
    // Progress calculation using raw time values
    const progressRatio = rawDuration > 0 ? currentTime / rawDuration : 0;

    // Adjust times for UI display
    const adjustedElapsedTime = elapsedTime / playbackRate;
    const adjustedCurrentTime = currentTime / playbackRate;

    this.debugLog(`Sound state for ${id}:
      State: ${sound.state}
      Progress: ${progressRatio}
      Initial offset: ${sound.playOptions?.startTime || 0}ms
      Sound currentTime: ${sound.currentTime}s
      Elapsed time: ${sound.state === SoundState.Playing ? elapsedTime : 0}s
      Current time: ${currentTime}s
      Raw Duration: ${rawDuration}s
      Duration playOptions: ${sound.playOptions?.duration || 0}s
      Adjusted Duration: ${this.roundValue(elapsedTime, 4)}s
      Playback Rate: ${playbackRate}
      Volume: ${sound.volume}
      Pan: ${sound.pan},
      Pan Spatial Position: ${JSON.stringify(sound.panSpatialPosition)}
    `);


    return {
      progress: this.roundValue(progressRatio, 4),
      startTime: sound.startTime || 0,
      currentTime: this.roundValue(adjustedCurrentTime, 4), // Adjusted for UI
      elapsedTime: this.roundValue(adjustedElapsedTime, 4), // Adjusted for UI
      adjustedElapsedTime: this.roundValue(elapsedTime, 4), // Raw value
      duration: this.roundValue(adjustedDuration, 4), // Adjusted for UI
      rawDuration: this.roundValue(rawDuration, 4),
      state: sound.state || SoundState.Stopped,
      volume: sound.volume ?? sound?.playOptions?.volume ?? this.config.defaultVolume ?? 1,
      playbackRate: playbackRate,
      pan: sound.pan ?? sound?.playOptions?.pan ?? 0,
      panSpatialPosition: sound?.panSpatialPosition || { x: 0, y: 0, z: 0 },
    };
  }

  // End State checks---------------------------------------------------------------------------------------------------------------



  // Progress tracking management----------------------------------------------------------------------------------------------------

  public getCurrentTime(id: string): number {
    const { currentTime } = this.getSoundState(id);
    return currentTime;
  }

  public getDuration(id: string): number {
    try {
      const sound = this.getValidatedSound(id);
      return sound?.buffer?.duration || 0;
    } catch (error) {
      this.handleError("getting duration", error, id);
      return 0;
    }
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

  public startProgressTracking(id: string): void {
    // Clear any existing tracking
    this.stopProgressTracking(id);

    // Extract original ID if this is an instance
    const originalId = id.includes('_') ? id.split('_')[0] : id;

    const trackProgress = () => {
      const sound = this.sounds.get(id);
      if (!sound || sound.state !== SoundState.Playing) {
        this.stopProgressTracking(id);
        return;
      }

      const { currentTime, duration, rawDuration, elapsedTime, adjustedElapsedTime, playbackRate } = this.getSoundState(id);
      const progress = duration ? (elapsedTime / duration) : 0;


      if (sound.playOptions?.duration !== undefined && sound.playOptions.duration > 0) {
        if (adjustedElapsedTime >= sound.playOptions.duration * (playbackRate || 1) + (sound.playOptions.startTime ?? 0)) {
          if (sound.playOptions.pauseAtDurationReached && !sound.playOptions.loop) {
            this.pause(id);
          } else {
            if (sound.playOptions?.loop) {
              this.handleLoopIteration(sound);
            } else {
              this.handleSoundEnded(sound);
            }
          }
          return;
        }
      }

      this.dispatchEvent({
        type: SoundEventsEnum.PROGRESS,
        soundId: id,
        originalId,
        instanceId: id,
        currentTime,
        duration: duration || 0,
        progress,
        progressInfo: {
          soundId: id,
          currentTime,
          duration: duration || 0,
          rawDuration: rawDuration || 0,
          progress,
        },
        timestamp: this.context.currentTime,
        sound,
      });
    };

    // Add to ticker with specified interval
    this.ticker.addCallback(`progress_${id}`, trackProgress, this.PROGRESS_UPDATE_INTERVAL);
  }

  public stopProgressTracking(id: string): void {
    this.ticker.removeCallback(`progress_${id}`);
  }

  public setProgressUpdateInterval(interval: number): void {
    this.PROGRESS_UPDATE_INTERVAL = interval;
  }

  // End Progress tracking management----------------------------------------------------------------------------------------------------

  // Panning control-------------------------------------------------------------------------------------------------------------------

  public setPan(id: string, value: number, skipDispatchEvent: boolean = false): void {
    try {
      const sound = this.getValidatedSound(id);
      // Clamp the pan value between -1 and 1
      const clampedValue = Math.max(-1, Math.min(1, value));

      // Remove spatial audio if active
      if (this.isSpatialAudioActive(id)) {
        this.debugLog(`Removed 3D spatial audio, and overwritten with stereo panner for sound ${id}`);
        this.removeSpatialEffect(id);
        sound.lastPanningType = 'stereo';

        // Reset spatial position without dispatching SPATIAL_POSITION_CHANGED
        const restoredPanSpatialPosition = { x: 0, y: 0, z: 0 };
        sound.panSpatialPosition = restoredPanSpatialPosition;
        if (sound.playOptions) {
          sound.playOptions.panSpatialPosition = restoredPanSpatialPosition;
        }
      }

      // Create or update stereoPanner
      if (!sound.stereoPanner) {
        sound.stereoPanner = this.context.createStereoPanner();
      }

      // Store the pan value and update the panner
      sound.pan = clampedValue;
      sound.playOptions = {
        ...sound.playOptions,
        pan: clampedValue,
      };

      sound.lastPanningType = 'stereo';
      if (sound.stereoPanner) {
        sound.stereoPanner.pan.setValueAtTime(sound.pan, this.context.currentTime);
      }

      // Use the AudioNodeConnector to reconnect nodes
      this.audioNodeConnector.connectNodes(sound, this.masterGainNode);

      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.PAN_CHANGED,
          soundId: id,
          timestamp: this.context?.currentTime ?? 0,
          pan: sound.pan || 0,
          previousPan: this.previousGlobalPan,
          sound
        });
      }
      this.debugLog(`Pan set for sound ${sound.id}: ${sound.pan}`);
    } catch (error) {
      this.handleError("setting pan", error, id);
    }
  }

  public resetPan(id?: string): void {
    if (!id) {
      this.resetGlobalPan();
      return;
    }
    const sound = this.getValidatedSound(id);
    this.setPan(id, 0, true);

    this.dispatchEvent({
      type: SoundEventsEnum.PAN_RESET,
      soundId: id,
      timestamp: this.context.currentTime,
      isMaster: false,
      sound
    });
  }

  public removePan(id: string): void {
    try {
      const sound = this.getValidatedSound(id);
      if (sound.stereoPanner) {
        const source = sound.source;
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
      this.sounds.forEach((sound, id) => {
        if (this.isSpatialAudioActive(id)) {
          this.removeSpatialEffect(id);
        }
        // If the sound has its own stereoPanner, update its pan value
        if (sound.stereoPanner) {
          sound.stereoPanner.pan.setValueAtTime(value, this.context.currentTime);
          sound.pan = value; // Update the sound's pan property
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
    this.dispatchEvent({
      type: SoundEventsEnum.PAN_RESET,
      timestamp: this.context.currentTime,
      isMaster: true,
    });

  }

  public getPreviousMasterPan(): number {
    return this.previousGlobalPan;
  }

  public cleanupGlobalPan(): void {
    if (this.masterPannerNode) {
      this.masterPannerNode.disconnect();
      this.masterGainNode.disconnect();
      this.masterGainNode.connect(this.context.destination);
      this.masterPannerNode = null;
    }
  }

  public isStereoPanActive(id: string): boolean {
    const sound = this.sounds.get(id);
    return !!sound?.stereoPanner;
  }

  // End Panning control-------------------------------------------------------------------------------------------------------------------

  // Spatial audio (3D audio)-----------------------------------------------------------------------------------------------------------
  public isSpatialAudioEnabled(): boolean {
    return this.config.spatialAudio === true && this.isSpatialAudioSupported();
  }

  public isSpatialAudioSupported(): boolean {
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

  public setSpatialPosition(
    x: number,
    y: number,
    z: number,
    soundId?: string | null,
    soundPannerConfig?: SoundPannerConfig,
    skipDispatchEvent: boolean = false
  ): void {
    if (!this.isSpatialAudioEnabled()) {
      this.debugLog("Spatial audio is not enabled or supported");
      return;
    }

    x = this.roundValue(x, 2);
    y = this.roundValue(y, 2);
    z = this.roundValue(z, 2);

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

    const source = sound.source;

    // If stereo panning is active, reset it without dispatching PAN_CHANGED
    if (sound.stereoPanner) {
      this.removePan(soundId);
      this.debugLog(`Removed stereo panner, and overwritten with spatial panning for sound ${soundId}`);
    }
    sound.lastPanningType = 'spatial';

    sound.playOptions = {
      ...sound.playOptions,
      panSpatialPosition: { x, y, z },
    };

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


      } else if (soundPannerConfig) {
        // If panner exists and new config is provided, update only the provided values
        Object.entries(soundPannerConfig).forEach(([key, value]) => {
          if (value !== undefined) {
            (sound.pannerNode as any)[key] = value;
          }
        });
      }


      // Reconnect the audio nodes with the panner
      source?.disconnect();
      source?.connect(sound.pannerNode);
      sound.pannerNode.connect(sound.gainNode);


      // Example usage to set the position of the sound source
      //pannerNode.positionX.setValueAtTime(1, audioContext.currentTime); // 1 meter to the right
      //pannerNode.positionY.setValueAtTime(0, audioContext.currentTime); // Same height as the listener
      //pannerNode.positionZ.setValueAtTime(-1, audioContext.currentTime); // 1 meter behind the listener


      // Update position
      sound.pannerNode.positionX.setValueAtTime(x, this.context.currentTime);
      sound.pannerNode.positionY.setValueAtTime(y, this.context.currentTime);
      sound.pannerNode.positionZ.setValueAtTime(z, this.context.currentTime);
      sound.panSpatialPosition = { x, y, z };
      ;
      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.SPATIAL_POSITION_CHANGED,
          soundId,
          timestamp: this.context.currentTime,
          position: sound.panSpatialPosition,
          pannerConfig: soundPannerConfig,
          sound
        });
      }

      this.debugLog(`Set position for sound ${soundId}: x=${x}, y=${y}, z=${z}`);
    } catch (error) {
      this.handleError("setting sound position", error);
    }
  }

  public getSpatialPosition(soundId: string): { x: number; y: number; z: number } | null {
    return this.sounds.get(soundId)?.panSpatialPosition ?? null;
  }

  public setMasterSpatialPosition(x: number, y: number, z: number, config: SoundPannerConfig = {}, skipDispatchEvent: boolean = false): void {
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

      this.masterSpatialPosition = { x, y, z };

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

      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.GLOBAL_SPATIAL_POSITION_CHANGED,
          timestamp: this.context.currentTime,
          position: { x, y, z },
        });
      }
      this.debugLog(`Set master spatial position: x=${x}, y=${y}, z=${z}`);
    } catch (error) {
      this.handleError("setting master spatial position", error);
    }
  }

  public getMasterSpatialPosition(): { x: number; y: number; z: number } {
    return this.masterSpatialPosition;
  }

  public removeSpatialEffect(id: string): void {
    try {
      const sound = this.getValidatedSound(id);
      if (sound.pannerNode) {
        const source = sound.source;
        if (source) {
          source.disconnect();
          source.connect(sound.gainNode);
        }
        sound.pannerNode.disconnect();
        sound.pannerNode = null;
      }
      sound.panSpatialPosition = { x: 0, y: 0, z: 0 };

      // Ensure gainNode is connected to masterGainNode
      sound.gainNode.disconnect();
      sound.gainNode.connect(this.masterGainNode);

    } catch (error) {
      this.handleError("removing spatial effect", error, id);
    }
  }

  public isSpatialAudioActive(id: string): boolean {
    const sound = this.sounds.get(id);
    return !!sound?.pannerNode;
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

  public resetSpatialPosition(id?: string): void {
    if (!this.config.spatialAudio) {
      this.debugLog("Spatial audio is not enabled");
      return;
    }

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
      this.setSpatialPosition(0, 0, 0, id);
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

  public resetMasterSpatialPosition(): void {
    try {
      // Reset the master spatial position to (0, 0, 0)
      if (this.masterPannerNode) {
        this.masterSpatialPosition = { x: 0, y: 0, z: 0 };
        this.masterPannerNode.positionX.setValueAtTime(this.masterSpatialPosition.x, this.context.currentTime);
        this.masterPannerNode.positionY.setValueAtTime(this.masterSpatialPosition.y, this.context.currentTime);
        this.masterPannerNode.positionZ.setValueAtTime(this.masterSpatialPosition.z, this.context.currentTime);

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
        position: this.masterSpatialPosition
      });

      this.debugLog("Reset master spatial position to (0, 0, 0) and cleared spatial settings.");
    } catch (error) {
      this.handleError("resetting master spatial position", error);
    }
  }

  // End Spatial audio (3D audio)-----------------------------------------------------------------------------------------------------------

  // Playback control-----------------------------------------------------------------------------------------------------------------------
  public setPlaybackRate(id: string, rate: number, skipDispatchEvent: boolean = false): void {
    if (!id || typeof rate !== "number" || isNaN(rate) || rate <= 0) {
      this.debugLog("Invalid parameters for playback rate change");
      return;
    }

    try {
      const sound = this.getValidatedSound(id);
      const source = sound.source;
      sound.playOptions = {
        ...sound.playOptions,
        playbackRate: rate,
      };

      if (!sound) {
        this.debugLog(`Sound ${id} not found for playback rate change`);
        return;
      }

      if (!source) {
        this.debugLog(`No active source found for sound ${id}, playback rate not set`);
        return;
      }

      // Update the playback rate
      const playbackRate = sound.playOptions.playbackRate ?? rate ?? 1;
      source.playbackRate.setValueAtTime(playbackRate, this.context.currentTime);

      if (!skipDispatchEvent) {
        // Dispatch event
        this.dispatchEvent({
          type: SoundEventsEnum.PLAYBACK_RATE_CHANGED,
          soundId: id,
          timestamp: this.context.currentTime,
          playbackRate: rate,
          sound
        });
        this.seek(id, this.getSoundState(id).currentTime);
      }
      this.debugLog(`Playback rate set for sound ${id}: ${rate}`);
    } catch (error) {
      this.handleError("setting playback rate", error, id);
    }
  }

  public getPlaybackRate(id: string): number {
    const sound = this.getValidatedSound(id);
    return sound?.source?.playbackRate?.value ?? sound?.playOptions?.playbackRate ?? this.config.defaultPlaybackRate ?? 1;
  }

  // End playback control-------------------------------------------------------------------------------------------------------------------

  // Reset operations ------------------------------------------------------------------------------------------------------------
  public reset(options: SoundResetOptions = {}): void {
    this.debugLog("Resetting sound manager with options:", options);

    // Stop all sounds first
    this.stopAllSounds();

    // Reset master controls
    if (!options.keepVolumes) {
      this.setGlobalVolume(this.config.defaultVolume ?? 1);
      if (this.isMuted) {
        this.unmuteAllSounds();
      }
    }

    if (!options.keepPanning) {
      this.resetGlobalPan();
    }

    if (!options.keepSpatial) {
      this.resetMasterSpatialPosition();
    }

    // Handle loaded sounds
    if (options.unloadSounds) {
      // Reset each sound before cleanup
      this.sounds.forEach((_, id) => {
        this.resetSound(id, options);
      });
      this.cleanup();
      this.sounds.clear();
    } else {
      // Reset each sound individually
      this.sounds.forEach((_, id) => {
        this.resetSound(id, options);
      });
    }

    this.dispatchEvent({
      type: SoundEventsEnum.RESET,
      timestamp: this.context.currentTime,
      resetOptions: options,
    });

    this.debugLog("Sound manager reset completed");
  }

  public resetSound(id: string, options: SoundResetOptions = {}): void {
    const sound = this.sounds.get(id);

    if (!sound) {
      this.debugLog(`Sound ${id} not found for reset`);
      return;
    }

    if (sound.lastPanningType === 'spatial') {
      this.resetSpatialPosition(id);
    } else {
      if (!options.keepPanning) {
        this.removePan(id);
      }
    }

    this.debugLog(`Resetting sound ${id} with options:`, options);

    // Stop the sound if it's playing
    if (sound.state === SoundState.Playing) {
      this.stop(id);
    }

    // Clean up audio routing first
    if (!options.keepSpatial && sound.lastPanningType === 'spatial') {
      // Properly remove spatial audio
      this.removeSpatialEffect(id);

      // Reset spatial position
      sound.panSpatialPosition = { x: 0, y: 0, z: 0 };
      if (sound.playOptions) {
        sound.playOptions.panSpatialPosition = { x: 0, y: 0, z: 0 };
      }

      // Update panning type
      sound.lastPanningType = 'stereo';

      // Ensure proper stereo setup
      if (sound.source) {
        sound.source.disconnect();
        sound.source.connect(sound.gainNode);
      }
    }

    if (!options.keepPanning && sound.lastPanningType === 'stereo') {
      this.removePan(id);
    }

    // Reset basic sound properties
    sound.state = SoundState.Stopped;
    sound.startTime = sound.playOptions?.startTime ?? 0;
    sound.pausedAt = 0;
    sound.currentTime = 0;

    if (!options.keepPlaybackRate) {
      this.setPlaybackRate(id, 1);
    }

    if (!options.keepVolumes) {
      this.setSoundVolume(id, sound.playOptions?.volume ?? this.config.defaultVolume ?? 1);
    }

    // Ensure proper audio node connections
    this.reconnectAudioNodes(id);

    this.dispatchEvent({
      type: SoundEventsEnum.RESET,
      soundId: id,
      timestamp: this.context.currentTime,
      resetOptions: options,
      sound
    });

    this.debugLog(`Sound ${id} reset completed`);
  }
  // End Reset operations -------------------------------------------------------------------------------------------------------


  // Sound / Buffer / Source / GainNode retrieval-------------------------------------------------------------------------------------------
  public getSound(id: string): Sound | undefined {
    return this.sounds.get(id);
  }

  public getBuffer(id: string): AudioBuffer | undefined {
    try {
      const sound = this.getValidatedSound(id);
      return sound?.buffer || undefined;
    } catch (error) {
      this.handleError("getting buffer", error, id);
      return undefined;
    }
  }

  public getSource(id: string): AudioBufferSourceNode | undefined {
    try {
      const sound = this.getValidatedSound(id);
      return sound.source || this.activeSources.get(id) || undefined;
    } catch (error) {
      this.handleError("getting source", error, id);
      return undefined;
    }
  }

  public getGainNode(id: string): GainNode | undefined {
    try {
      const sound = this.getValidatedSound(id);
      return sound?.gainNode || undefined;
    } catch (error) {
      this.handleError("getting gain node", error, id);
      return undefined;
    }
  }

  // End Sound / Buffer / Source / GainNode retrieval---------------------------------------------------------------------------------------

  // Utility functions----------------------------------------------------------------------------------------------------------------------

  public hasSound(id: string): boolean {
    return this.sounds.has(id) && this.sounds.get(id)?.buffer != null;
  }

  public updateSoundOptions(soundId: string, options: Partial<PlayOptions>): void {
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

  // Check if a sound is ready to play (buffer loaded and context running)
  public isReady(): boolean {
    return this.context.state === 'running' && this.sounds.size > 0;
  }

  // Get the total number of sounds in the manager
  public getSoundCount(): number {
    return this.sounds.size;
  }

  public resetAllCounters(): void {
    this.instanceCounters.clear();
    this.debugLog("All instance counters reset");
  }

  public getSoundIds(): string[] {
    return Array.from(this.sounds.keys());
  }

  public setDebugMode(debug: boolean): void {
    this.config.debug = debug;
  }

  public getConfig(): Readonly<SoundManagerConfig> {
    return { ...this.config };
  }

  public getLastError(): Error | null {
    return this.lastError;
  }

  public roundValue(value: number, decimals: number = this.DEFAULT_PRECISION): number {
    if (decimals < 0) decimals = 0;
    if (isNaN(value)) return NaN;
    if (!isFinite(value)) return value;

    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
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

  // End utility methods ---------------------------------------------------------------------------------------------------------------

  // Event listeners -------------------------------------------------------------------------------------------------------------------

  public addEventListener(
    type: SoundEventsEnum,
    callback: (event: SoundEvent) => void,
    filter?: { originalId?: string; instanceId?: string; instancePattern?: RegExp }
  ): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }

    this.eventListeners.get(type)!.add({ callback, filter });
  }

  public removeEventListener(
    type: SoundEventsEnum,
    callback: (event: SoundEvent) => void,
    filter?: { originalId?: string; instancePattern?: RegExp }
  ): void {
    const listeners = this.eventListeners.get(type);
    if (!listeners) return;

    listeners.forEach((listener) => {
      if (
        listener.callback === callback &&
        JSON.stringify(listener.filter) === JSON.stringify(filter)
      ) {
        listeners.delete(listener);
      }
    });
  }

  public removeEventListenersForInstance(instanceId: string): void {
    this.eventListeners.forEach((listeners) => {
      listeners.forEach((listener) => {
        if (listener.filter?.instanceId === instanceId) {
          listeners.delete(listener);
        }
      });
    });
  }

  public dispatchEvent(event: SoundEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (!listeners) return;

    listeners.forEach(({ callback, filter }) => {
      // Apply filter if provided
      if (filter) {
        if (filter.originalId && event.originalId !== filter.originalId) return;
        if (filter.instanceId && event.instanceId !== filter.instanceId) return;
        if (filter.instancePattern && event.instanceId && !filter.instancePattern.test(event.instanceId)) return;
      }

      try {
        callback(event);
      } catch (error) {
        console.error(`Error in event listener for ${event.type}:`, error);
      }
    });
  }

  public hasEventListener(type: SoundEventsEnum): boolean {
    return this.eventListeners.has(type) && this.eventListeners.get(type)!.size > 0;
  }
  // End Listeners----------------------------------------------------------------------------------------------------------------------

}
