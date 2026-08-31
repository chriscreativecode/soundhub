
import { AudioNodeConnector } from "./audio-node-connector";
import { PlayOptions, wantsOverlap } from "./play-sound-options.interface";
import { SoundEvent } from "./sound-event.interface";
import { SoundEventsEnum } from "./sound-events.enum";
import { SoundGroup } from "./sound-group";
import { DEFAULT_CONFIG, SoundHubConfig } from "./sound-hub-config";
import { SoundHubInterface } from "./sound-hub.interface";
import { SoundLoadState } from "./sound-load-state";
import { SoundPanType } from "./sound-pan-type.enum";
import { DEFAULT_PANNER_CONFIG, SoundPannerConfig } from "./sound-panner-config";
import { SoundResetOptions } from "./sound-reset-options.interface";
import { SoundStateInfo } from "./sound-state-info.interface";
import { SoundState } from "./sound-state.interface";
import { StreamOptions, StreamSound } from "./stream-sound";
import { MediaSessionInfo, SoundEventFilter } from "./sound-event-filter";
import { Sound } from "./sound.interface";
import { Ticker } from "./ticker";

interface EventListener {
  callback: (event: SoundEvent) => void;
  filter?: SoundEventFilter;
}

export class SoundHub implements SoundHubInterface {
  private readonly config: SoundHubConfig;
  private readonly context!: AudioContext;
  private sounds: Map<string, Sound> = new Map();
  private masterGainNode!: GainNode;
  private masterStereoPanner!: StereoPannerNode;
  private masterPannerNode!: PannerNode | null;
  private masterLimiterNode: DynamicsCompressorNode | null = null;
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
  private _spatialAudioSupported: boolean | null = null;
  private readonly DEFAULT_PRECISION: number = 2;
  private soundGroups: Map<string, SoundGroup> = new Map();
  private streams: Map<string, StreamSound> = new Map();
  private mediaSessionId: string | null = null;
  private instanceCounters: Map<string, number> = new Map();
  private loadStates: Map<string, SoundLoadState> = new Map();
  private registeredUrls: Map<string, string[]> = new Map();
  private listenerPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private listenerOrientation: { forward: { x: number; y: number; z: number }; up: { x: number; y: number; z: number } } =
    { forward: { x: 0, y: 0, z: -1 }, up: { x: 0, y: 1, z: 0 } };
  private masterSpatialOrientation: { x: number; y: number; z: number } = { x: 1, y: 0, z: 0 };
  private autoSuspendTimer: ReturnType<typeof setTimeout> | null = null;
  private autoSuspended: boolean = false;
  private static formatSupport: Map<string, boolean> = new Map();
  private unlockHandlers: {
    touchstart: (this: Document, ev: TouchEvent) => void;
    touchend: (this: Document, ev: TouchEvent) => void;
    click: (this: Document, ev: MouseEvent) => void;
  } | null = null;
  private visibilityHandler: (() => void) | null = null;
  private contextResumeHandler: (() => void) | null = null;
  private static readonly RESUME_EVENTS = ["click", "touchstart", "keydown"] as const;
  private static readonly GLOBAL_FADE_ID = "fade_global";
  private static readonly PLAYBACK_STATE_EVENTS: ReadonlySet<SoundEventsEnum> = new Set([
    SoundEventsEnum.STARTED,
    SoundEventsEnum.STOPPED,
    SoundEventsEnum.PAUSED,
    SoundEventsEnum.RESUMED,
    SoundEventsEnum.ENDED,
  ]);

  private VERSION = "6.2.1";

  constructor(config: SoundHubConfig = {}) {
    this.ticker = new Ticker();

    // Normalise a copy. Writing the sanitised values back into the caller's
    // object mutated an argument they may reuse for another SoundHub.
    const userConfig: SoundHubConfig = { ...config };

    this.config = {
      debug: false,
      ...userConfig,
    };
    Object.values(SoundEventsEnum).forEach((type) => {
      this.eventListeners.set(type as SoundEventsEnum, new Set());
    });

    if (userConfig.defaultVolume !== undefined) {
      userConfig.defaultVolume = this.setValidatedVolume(userConfig.defaultVolume);
    }
    if (userConfig.fadeInDuration !== undefined && userConfig.fadeInDuration < 0) {
      userConfig.fadeInDuration = 0;
    }
    if (userConfig.fadeOutDuration !== undefined && userConfig.fadeOutDuration < 0) {
      userConfig.fadeOutDuration = 0;
    }
    if (userConfig.overlap === undefined && userConfig.createNewInstance !== undefined) {
      // `createNewInstance` is the old name for `overlap`. Projects that set it
      // keep the behaviour they had.
      userConfig.overlap = userConfig.createNewInstance;
    }
    if (userConfig.spatialAudio && !this.isSpatialAudioSupported()) {
      this.debugLog("Spatial audio requested but not supported, disabling feature");
      userConfig.spatialAudio = false;
    }

    this.config = { ...DEFAULT_CONFIG, ...userConfig };

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioContext({ latencyHint: "interactive" });

      this.masterGainNode = this.context.createGain();
      this.masterStereoPanner = this.context.createStereoPanner();
      this.masterPannerNode = null;
      this.masterLimiterNode = this.config.masterLimiter ? this.createMasterLimiter() : null;

      // Connect in chain: masterGainNode -> masterStereoPanner -> [limiter] -> destination
      this.rewireMasterChain();

      this.masterStereoPanner.pan.value = this.config.defaultPan ?? 0;
      this.previousGlobalPan = this.config.defaultPan ?? 0;

      this.masterGainNode.gain.value = this.config.defaultVolume!;
      this.previousGlobalVolume = this.config.defaultVolume!;

      this.setupAudioUnlock();

      this.initialize();
    } catch (error) {
      this.handleError("constructor, initialize", error);
    }
  }

  private initialize(): void {
    this.showConsoleInfo();
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
      console.log("[SoundHub]", ...args);
    }
  }

  private setupVisibilityHandling(): void {
    // Keep the reference so destroy() can detach it. An anonymous listener would
    // keep this SoundHub (and its AudioContext) alive on `document` forever.
    this.removeVisibilityHandling();

    this.visibilityHandler = () => {
      if (document.hidden) {
        this.debugLog("Page hidden, auto-muting sounds");
        this.muteAllSounds();
      } else if (this.config.autoResumeOnFocus) {
        this.debugLog("Page visible, auto-resuming sounds");
        this.unmuteAllSounds();
      }
    };

    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  private removeVisibilityHandling(): void {
    if (!this.visibilityHandler) return;
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.visibilityHandler = null;
  }

  private initializeSpatialAudio(): void {
    if (!this.isSpatialAudioSupported()) {
      this.debugLog("Spatial audio not supported, disabling feature");
      this.config.spatialAudio = false;
      return;
    }

    try {
      // Listener at the centre, looking down negative z. Same helper the public
      // setListenerPosition uses, so old Safari gets the same treatment here.
      this.applyListenerValues();

      this.debugLog("Spatial audio initialized");
    } catch (error) {
      this.handleError("initializing spatial audio", error);
    }
  }

  private setupAudioUnlock() {
    if (!this.config.autoUnlock) return;

    this.removeUnlockListeners();

    if (!this.isMobileLikeEnvironment()) return;

    let isUnlocked = false;

    const unlock = async () => {
      if (isUnlocked || this.context.state !== 'suspended') return;

      try {
        const buffer = this.context.createBuffer(1, 1, 22050);
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.context.destination);

        // Very short duration to minimize processing
        source.start(0, 0, 0.1);

        await this.context.resume();

        isUnlocked = true;
        this.removeUnlockListeners();

        this.debugLog('Audio context successfully unlocked');
        this.dispatchEvent({
          type: SoundEventsEnum.UNLOCKED,
          isMaster: true,
          timestamp: this.context.currentTime
        });
      } catch (error) {
        this.debugLog('Audio unlock attempt failed:', error);
      }
    };

    const touchHandler = () => unlock();
    const clickHandler = () => unlock();

    this.unlockHandlers = {
      touchstart: touchHandler,
      touchend: touchHandler,
      click: clickHandler
    };

    const options: AddEventListenerOptions = { passive: true, capture: true };
    document.addEventListener('touchstart', this.unlockHandlers.touchstart, options);
    document.addEventListener('touchend', this.unlockHandlers.touchend, options);
    document.addEventListener('click', this.unlockHandlers.click, options);

    // Also try to unlock immediately in case we're already in an interaction
    unlock();
  }

  private removeUnlockListeners() {
    if (!this.unlockHandlers) return;

    document.removeEventListener('touchstart', this.unlockHandlers.touchstart, true);
    document.removeEventListener('touchend', this.unlockHandlers.touchend, true);
    document.removeEventListener('click', this.unlockHandlers.click, true);

    this.unlockHandlers = null;
  }

  private isMobileLikeEnvironment(): boolean {
    return 'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private setupContextResumeHandlers(): void {
    this.removeContextResumeHandlers();

    // Deliberately not registered with { once: true }: a resume() that rejects
    // would consume the listener and leave the context suspended forever. We
    // detach explicitly once the context is actually running.
    const resumeContext = () => {
      if (this.context.state !== "suspended") {
        this.removeContextResumeHandlers();
        return;
      }

      this.context.resume().then(
        () => {
          this.debugLog("AudioContext resumed after user interaction");
          this.removeContextResumeHandlers();
        },
        (error) => {
          this.debugLog("Failed to resume AudioContext:", error);
        }
      );
    };

    this.contextResumeHandler = resumeContext;
    SoundHub.RESUME_EVENTS.forEach((eventType) => {
      document.addEventListener(eventType, resumeContext);
    });

    this.debugLog("Context resume handlers set up, waiting for user interaction");
  }

  private removeContextResumeHandlers(): void {
    if (!this.contextResumeHandler) return;
    const handler = this.contextResumeHandler;
    SoundHub.RESUME_EVENTS.forEach((eventType) => {
      document.removeEventListener(eventType, handler);
    });
    this.contextResumeHandler = null;
  }

  private setupAudioSource(sound: Sound): AudioBufferSourceNode {
    const playbackRate = sound.playOptions?.playbackRate ?? 1;
    const source = this.context.createBufferSource();
    source.buffer = sound.buffer;
    sound.source = source;
    source.playbackRate.setValueAtTime(playbackRate, this.context.currentTime);

    // A seamless loop is handled by the source node itself. Restarting the
    // source from the ended callback always leaves a small gap, which is
    // inaudible under noise but obvious on a tone, so a bed or a drone can ask
    // for the loop to happen inside the audio graph instead.
    if (sound.playOptions?.loop && sound.playOptions?.seamlessLoop) {
      const loopStart = sound.playOptions.startTime ?? 0;
      const duration = sound.playOptions.duration;

      source.loop = true;
      source.loopStart = loopStart;
      source.loopEnd =
        duration !== undefined && duration > 0
          ? loopStart + duration
          : sound.buffer?.duration ?? 0;
    }

    if (sound.playOptions?.pan !== undefined && sound.panType !== SoundPanType.Spatial) {
      this.setPan(sound.id, sound.playOptions.pan, true);
    }

    if (sound.playOptions?.panSpatialPosition &&
      (sound.playOptions.panSpatialPosition.x !== 0 ||
        sound.playOptions.panSpatialPosition.y !== 0 ||
        sound.playOptions.panSpatialPosition.z !== 0)) {

      const pos = sound.playOptions.panSpatialPosition;
      this.setSpatialPosition(pos.x, pos.y, pos.z, sound.id, undefined, true);
    }

    this.audioNodeConnector.connectNodes(sound, this.masterGainNode);
    this.activeSources.set(sound.id, source);

    source.onended = () => {
      this.debugLog(`Sound ${sound.id} ended naturally`);
      if (sound.state === SoundState.Playing) {
        if (sound.playOptions?.loop) {
          this.handleLoopIteration(sound);
        } else {
          this.handleSoundEnded(sound);
        }
      }
    };

    return source;
  }

  private handleLoopIteration(sound: Sound): void {
    this.debugLog(`Restarting loop for sound ${sound.id}`);

    // Guard: skip loop restart if looping was disabled or sound was stopped/paused in the meantime
    if (!sound.playOptions?.loop) {
      this.debugLog(`Loop was disabled for ${sound.id}, handling as ended`);
      this.handleSoundEnded(sound);
      return;
    }

    if (sound.state !== SoundState.Playing) {
      this.debugLog(`Sound ${sound.id} is no longer playing (state: ${sound.state}), skipping loop iteration`);
      this.handleSoundEnded(sound);
      return;
    }

    // Check if we've reached max loops (0 or -1 means infinite)
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

    sound.currentLoopCount = (sound.currentLoopCount ?? 0) + 1;

    this.debugLog(`Loop count: ${sound.currentLoopCount}`);

    const startTime = (sound.playOptions?.startTime ?? 0) / (sound.playOptions?.playbackRate ?? 1);
    if (sound.playOptions && wantsOverlap(sound.playOptions)) {
      sound.playOptions.overlap = false;
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

    if (wantsOverlap(sound.playOptions)) {
      // I could not use the cleanupSound in here, because when the first instance is stopped, the second and any other next instance will be stopped too
      // because of the disconnectNodes method in the cleanupSound method
      this.cleanupExistingSource(sound.id);
    } else {
      // Listeners survive the cleanup here and are dropped below, after the
      // event. Removing them first meant a listener filtered on this instance
      // was gone by the time its own ended event was dispatched, which is the
      // one event it was waiting for.
      this.cleanupSound(sound.id, true);
    }

    this.stopProgressTracking(sound.id);

    const originalId = sound.id.includes(':') ? sound.id.split(':')[0] : sound.id;
    this.dispatchEvent({
      type: SoundEventsEnum.ENDED,
      soundId: sound.id,
      originalId,
      instanceId: sound.id,
      timestamp: this.context.currentTime,
      sound,
    });

    this.removeEventListenersForInstance(sound.id);
  }

  private scheduleFadeOut(id: string, fadeOutStartTime: number, fadeOutDuration: number): void {
    const sound = this.sounds.get(id);
    if (!sound) return;

    const fadeOutTime = this.context.currentTime + fadeOutStartTime;

    const fadeOutCallback = () => {
      this.fadeOut(id, fadeOutDuration);
    };

    this.ticker.addCallback(`fadeOut_${id}`, () => {
      if (this.context.currentTime >= fadeOutTime) {
        fadeOutCallback();
        this.ticker.removeCallback(`fadeOut_${id}`);
      }
    });
  }

  private cancelScheduledFadeOut(id: string): void {
    this.ticker.removeCallback(`fadeOut_${id}`);
  }

  private cancelFadeAnimation(id: string): void {
    this.ticker.removeCallback(`fade_${id}`);

    // Cancelling a fade abandons it, leaving the volume where the fade got to.
    // Running the completion callback here instead jumped the volume to the
    // fade target, fired fade_in_completed or fade_out_completed, and with
    // stopAfterFade stopped the sound. Turning the volume up halfway through a
    // fade out therefore silenced it.
    this.activeFadeCallbacks.delete(id);

    const sound = this.sounds.get(id);
    if (sound?.gainNode) {
      sound.gainNode.gain.cancelScheduledValues(this.context.currentTime);
    }

    if (sound) {
      sound.isFadingIn = false;
      sound.isFadingOut = false;
    }
  }

  /**
   * Returns a loaded sound or throws. It used to log and return undefined behind
   * a non-null assertion, which turned every unknown id into a TypeError on the
   * next property access. Callers either sit inside a try/catch that reports the
   * failure, or guard with hasSound()/getSound().
   */
  private getValidatedSound(id: string): Sound {
    const sound = this.sounds.get(id);
    if (!sound?.buffer) {
      const error = new Error(`Sound not found or not loaded properly: ${id}`);
      this.handleError("validating sound", error, id);
      throw error;
    }
    return sound;
  }

  private createEmptySoundState(): SoundStateInfo {
    return {
      progress: 0,
      startTime: 0,
      currentTime: 0,
      elapsedTime: 0,
      adjustedElapsedTime: 0,
      duration: 0,
      rawDuration: 0,
      state: SoundState.Stopped,
      volume: this.config.defaultVolume ?? 1,
      playbackRate: this.config.defaultPlaybackRate ?? 1,
      pan: 0,
      panSpatialPosition: { x: 0, y: 0, z: 0 },
    };
  }

  private setValidatedVolume(volume: number): number {
    return Math.max(0, Math.min(1, volume));
  }

  private cleanupSound(id: string, keepEventListeners: boolean = false): void {
    const sound = this.sounds.get(id);
    if (!sound) return;

    this.debugLog(`Cleaning up sound ${id}`);

    this.cancelScheduledFadeOut(id);
    this.cancelFadeAnimation(id);

    this.stopProgressTracking(id);

    if (!keepEventListeners) {
      this.removeEventListenersForInstance(id);
    }

    this.audioNodeConnector.disconnectNodes(sound);

  }

  /**
   * Tears down every loaded sound and its audio nodes. The master chain is left
   * intact on purpose so the manager stays usable afterwards (reset() relies on
   * that); destroy() is what dismantles the master nodes.
   */
  private cleanup(): void {
    // Tear the sounds down while the map is still populated. This used to run
    // after sounds.clear(), which made the node disconnects dead code and leaked
    // every gain/panner node still attached to the master chain.
    this.sounds.forEach((sound, id) => {
      this.cleanupSound(id);

      if (sound.source) {
        try {
          sound.source.onended = null;
          sound.source.stop();
        } catch (e) {
          // Ignore errors if the source was never started or already stopped
        }
        sound.source.disconnect();
        sound.source = null;
      }
      if (sound.pannerNode) {
        sound.pannerNode.disconnect();
        sound.pannerNode = null;
      }
      if (sound.stereoPanner) {
        sound.stereoPanner.disconnect();
        sound.stereoPanner = null;
      }
      sound.gainNode.disconnect();
    });

    // Stop and disconnect any source that outlived its sound entry
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
    this.sounds.clear();
    this.instanceCounters.clear();
    this.ticker.clear();
    this.cleanupGlobalPan();
  }

  private handleError(operation: string, error: unknown, id?: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const context = id ? ` (Sound ID: ${id})` : "";
    const message = `[SoundHub] Error ${operation}${context}: ${errorMessage}`;
    this.lastError = error instanceof Error ? error : new Error(errorMessage);

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
      if (!sound.source) return;

      const currentTime = this.context.currentTime;
      const soundStartTime = sound.startTime || 0;
      const hasBeenRestarted = currentTime - soundStartTime < (sound.buffer?.duration || 0);

      // Only skip cleanup for playing sounds that have been restarted with overlap
      // For paused sounds, we should always stop the source
      if (sound.state === SoundState.Playing &&
        hasBeenRestarted &&
        wantsOverlap(sound.playOptions)) {
        return;
      }

      // Remove the onended handler before stopping to prevent it from firing
      if (sound.source.onended) {
        sound.source.onended = null;
      }

      // Check if the source has been started before attempting to stop it
      if (sound.startTime !== undefined) {
        sound.source.stop();
      }
      sound.source.disconnect();
      this.activeSources.delete(id);
      sound.source = null;
    } catch (error) {
      this.debugLog(`Error cleaning up source for ${id}: ${error}`);
    }
  }

  private getInstanceCounter(id: string): number {
    const baseId = id.split(':')[0]; // Use ':' as separator

    let counter = this.instanceCounters.get(baseId) || 0;

    // Never hand out an id that is still registered: a reset counter would
    // otherwise overwrite a live instance in the sounds map, orphaning its
    // still-playing source.
    do {
      counter++;
    } while (this.sounds.has(`${baseId}:${counter}`));

    this.instanceCounters.set(baseId, counter);

    return counter;
  }

  private resetCounterForSound(id: string): void {
    const baseId = id.split(':')[0];
    this.instanceCounters.delete(baseId);
    this.debugLog(`Counter reset for sound ${baseId}`);
  }

  /**
   * Builds the opt-in master limiter. A DynamicsCompressorNode configured with a
   * hard knee and a high ratio behaves as a limiter: everything below the
   * threshold passes through untouched, peaks above it are held back instead of
   * being hard-clipped by the destination.
   */
  private createMasterLimiter(): DynamicsCompressorNode {
    const limiter = this.context.createDynamicsCompressor();
    const now = this.context.currentTime;

    limiter.threshold.setValueAtTime(-3, now); // dBFS, leaves a little headroom
    limiter.knee.setValueAtTime(0, now);       // Hard knee, so it limits rather than compresses
    limiter.ratio.setValueAtTime(20, now);     // Effectively a brick wall
    limiter.attack.setValueAtTime(0.003, now); // Fast enough to catch note transients
    limiter.release.setValueAtTime(0.25, now);

    return limiter;
  }

  /**
   * (Re)builds the master output chain. The stereo panner always stays in the
   * graph, so enabling or clearing master spatial audio can never drop it and
   * silently disable setGlobalPan(). The limiter, when enabled, always sits last
   * so it catches everything, master panning included.
   *
   * masterGainNode -> [masterPannerNode] -> masterStereoPanner -> [limiter] -> destination
   */
  private rewireMasterChain(): void {
    this.masterGainNode.disconnect();
    this.masterStereoPanner.disconnect();
    this.masterLimiterNode?.disconnect();

    if (this.masterPannerNode) {
      this.masterPannerNode.disconnect();
      this.masterGainNode.connect(this.masterPannerNode);
      this.masterPannerNode.connect(this.masterStereoPanner);
    } else {
      this.masterGainNode.connect(this.masterStereoPanner);
    }

    if (this.masterLimiterNode) {
      this.masterStereoPanner.connect(this.masterLimiterNode);
      this.masterLimiterNode.connect(this.context.destination);
    } else {
      this.masterStereoPanner.connect(this.context.destination);
    }
  }

  /**
   * Turns the master limiter on or off at runtime. Safe to call while sounds are
   * playing; only the output chain is rewired, playback is not interrupted.
   */
  public setMasterLimiter(enabled: boolean): void {
    try {
      if (enabled === !!this.masterLimiterNode) return;

      if (enabled) {
        this.masterLimiterNode = this.createMasterLimiter();
      } else {
        this.masterLimiterNode?.disconnect();
        this.masterLimiterNode = null;
      }

      this.config.masterLimiter = enabled;
      this.rewireMasterChain();
      this.debugLog(`Master limiter ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      this.handleError("toggling master limiter", error);
    }
  }

  public isMasterLimiterEnabled(): boolean {
    return this.masterLimiterNode !== null;
  }

  /**
   * The live limiter node, or null when disabled. Exposed so you can fine-tune
   * threshold, ratio, attack and release, or read `reduction` to show how much
   * gain reduction is being applied.
   */
  public getMasterLimiterNode(): DynamicsCompressorNode | null {
    return this.masterLimiterNode;
  }

  // Format support ------------------------------------------------------------------------------------------------------

  /**
   * MIME type per file extension, with the codec spelled out where a browser
   * needs it to answer honestly. Safari says "maybe" to a bare audio/ogg and
   * then fails to decode, so opus and vorbis are asked for by name.
   */
  private static readonly FORMAT_MIME_TYPES: Record<string, string> = {
    mp3: 'audio/mpeg',
    mpeg: 'audio/mpeg',
    opus: 'audio/ogg; codecs="opus"',
    ogg: 'audio/ogg; codecs="vorbis"',
    oga: 'audio/ogg; codecs="vorbis"',
    wav: 'audio/wav; codecs="1"',
    aac: 'audio/aac',
    caf: 'audio/x-caf; codecs="opus"',
    m4a: 'audio/mp4; codecs="mp4a.40.2"',
    m4b: 'audio/mp4; codecs="mp4a.40.2"',
    mp4: 'audio/mp4; codecs="mp4a.40.2"',
    weba: 'audio/webm; codecs="vorbis"',
    webm: 'audio/webm; codecs="vorbis"',
    flac: 'audio/x-flac',
    dolby: 'audio/mp4; codecs="ec-3"',
  };

  /**
   * Whether this browser can play a format, by extension: canPlay('opus').
   *
   * Static so you can ask before building a hub, which is the moment you
   * usually want it. The answer comes from the browser's own canPlayType, and
   * "maybe" counts as yes, the same way every other player treats it.
   */
  public static canPlay(format: string): boolean {
    const key = format.replace(/^\./, '').toLowerCase();
    const cached = SoundHub.formatSupport.get(key);
    if (cached !== undefined) return cached;

    const mimeType = SoundHub.FORMAT_MIME_TYPES[key];
    let supported = false;

    if (mimeType && typeof document !== 'undefined') {
      try {
        const probe = document.createElement('audio');
        supported = probe.canPlayType(mimeType) !== '';
      } catch {
        supported = false;
      }
    }

    SoundHub.formatSupport.set(key, supported);
    return supported;
  }

  /** Every extension this browser accepts, handy for a diagnostics screen. */
  public static getSupportedFormats(): string[] {
    return Object.keys(SoundHub.FORMAT_MIME_TYPES).filter((format) => SoundHub.canPlay(format));
  }

  /** Instance shortcut for the static of the same name. */
  public canPlay(format: string): boolean {
    return SoundHub.canPlay(format);
  }

  public getSupportedFormats(): string[] {
    return SoundHub.getSupportedFormats();
  }

  /** The extension of a url, without the query string or the hash. */
  private getUrlFormat(url: string): string {
    const withoutQuery = url.split(/[?#]/)[0];
    const match = /\.([a-z0-9]+)$/i.exec(withoutQuery);
    return match ? match[1].toLowerCase() : '';
  }

  /**
   * Pick the first url this browser can actually play.
   *
   * Falls back to the first entry when none of the extensions are recognised,
   * which covers urls without an extension and signed urls from a CDN. Better
   * to try and fail than to refuse to load anything.
   */
  private pickPlayableUrl(urls: string[], id: string): string {
    if (urls.length === 1) return urls[0];

    for (const url of urls) {
      const format = this.getUrlFormat(url);
      if (format && SoundHub.canPlay(format)) {
        this.debugLog(`Picked ${format} for ${id}: ${url}`);
        return url;
      }
    }

    this.debugLog(`No known playable format for ${id}, falling back to ${urls[0]}`);
    return urls[0];
  }

  private normaliseUrls(url: string | string[]): string[] {
    return (Array.isArray(url) ? url : [url]).filter((entry) => typeof entry === 'string' && entry.length > 0);
  }

  // Instance housekeeping ------------------------------------------------------------------------------------------------

  /** Ids of the live instances of one sound, oldest first. */
  private getInstanceIds(baseId: string): string[] {
    const prefix = `${baseId}:`;
    return Array.from(this.sounds.keys())
      .filter((key) => key.startsWith(prefix))
      .sort((a, b) => Number(a.slice(prefix.length)) - Number(b.slice(prefix.length)));
  }

  /**
   * Drop instances that have finished.
   *
   * An instance is a full entry in the sound map with its own gain node. They
   * used to stay there for the lifetime of the page, so a game firing a footstep
   * every half second grew the map by seven thousand entries an hour. Nothing
   * audible was lost, but getSoundIds() and every sweep over the map paid for
   * it. Playing or paused instances are left alone, and so is one that is
   * currently on the lock screen.
   */
  private reapFinishedInstances(baseId: string): void {
    this.getInstanceIds(baseId).forEach((instanceId) => {
      const instance = this.sounds.get(instanceId);
      if (!instance) return;
      if (instance.state === SoundState.Playing || instance.state === SoundState.Paused) return;
      if (instanceId === this.mediaSessionId) return;

      this.cleanupSound(instanceId);
      this.sounds.delete(instanceId);
      if (instance.groupId) {
        this.soundGroups.get(instance.groupId)?.sounds.delete(instanceId);
      }
    });
  }

  /**
   * Keep the number of simultaneous instances under maxInstancesPerSound by
   * stopping the oldest ones. A group with maxInstances does the same for the
   * sounds in it; this is the version for sounds that are in no group.
   */
  private enforceInstanceCeiling(baseId: string): void {
    const ceiling = this.config.maxInstancesPerSound ?? 0;
    if (ceiling <= 0) return;

    const live = this.getInstanceIds(baseId);
    const toRetire = live.length - ceiling + 1; // + 1: one more is about to start
    if (toRetire <= 0) return;

    live.slice(0, toRetire).forEach((instanceId) => {
      this.debugLog(`Instance ceiling of ${ceiling} reached for ${baseId}, stopping ${instanceId}`);
      this.stop(instanceId);
      const instance = this.sounds.get(instanceId);
      this.cleanupSound(instanceId);
      this.sounds.delete(instanceId);
      if (instance?.groupId) {
        this.soundGroups.get(instance.groupId)?.sounds.delete(instanceId);
      }
    });
  }

  private reconnectAudioNodes(id: string): void {
    const sound = this.sounds.get(id);
    if (!sound || !sound.source) return;
    this.audioNodeConnector.connectNodes(sound, this.masterGainNode);
  }

  // Playback control-----------------------------------------------------------------------------------------------------------
  public play(id: string, options: PlayOptions = {}, skipDispatchEvent: boolean = false): Sound | undefined {
    if (this.streams.has(id)) {
      this.streamPlay(id, {
        volume: options.volume,
        pan: options.pan,
        loop: options.loop,
        playbackRate: options.playbackRate,
        startTime: options.startTime,
        trackProgress: options.trackProgress,
      });
      return undefined;
    }

    if (this.autoSuspended) {
      this.wakeFromAutoSuspend();
    }

    if (this.context.state === 'suspended' && this.config.autoUnlock) {
      this.setupAudioUnlock();
    }

    try {
      // Throws for an unknown or unloaded id, handled by the catch below
      const originalSound = this.getValidatedSound(id);

      let mergedPlayOptions = { ...originalSound.playOptions, ...options };
      // An explicit false in the play options still wins over the hub-wide default.
      const overlap = mergedPlayOptions.overlap ?? mergedPlayOptions.createNewInstance ?? this.config.overlap ?? false;

      let actualId = id;
      let instance: Sound | undefined;

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

        // Without overlap there is no instance to add further down, so the sound
        // joins the group here. It used to join only on the overlap path, which
        // left play(id, { groupId }) out of the group entirely: the group stayed
        // empty, its play options never applied, and stopping every member of a
        // group stopped nothing.
        if (!overlap && !group.sounds.has(id)) {
          this.addToSoundGroup(groupId, id);
          // addToSoundGroup merges the group options into the sound, so the
          // per-call options have to be layered on top again.
          mergedPlayOptions = { ...originalSound.playOptions, ...options };
        }
      }

      if (overlap) {
        const baseId = id.split(':')[0];

        // Housekeeping before another voice joins: forget the instances that
        // already finished, then make room if there is a ceiling.
        this.reapFinishedInstances(baseId);
        this.enforceInstanceCeiling(baseId);

        const instanceNumber = this.getInstanceCounter(baseId);
        actualId = `${baseId}:${instanceNumber}`;
        this.debugLog(`Creating new instance with ID: ${actualId}`);

        // Create a DEEP copy of the original sound's playOptions
        const newPlayOptions = JSON.parse(JSON.stringify({
          ...originalSound.playOptions,
          ...options,
          overlap: false,
          createNewInstance: false,
        }));

        const gainNode = this.context.createGain();

        const volume = options.volume ?? originalSound.volume ?? this.config.defaultVolume ?? 1;
        gainNode.gain.value = volume;

        instance = {
          ...originalSound,
          id: actualId,
          gainNode: gainNode,
          state: SoundState.Stopped,
          currentTime: 0,
          startTime: newPlayOptions?.startTime ?? 0,
          pausedAt: 0,
          currentLoopCount: 0,
          playOptions: newPlayOptions,
          volume: volume,
          originalVolume: volume,
          pan: 0,
          panSpatialPosition: { x: 0, y: 0, z: 0 },
          panType: newPlayOptions.panType ?? SoundPanType.Stereo,
          source: null,
          stereoPanner: null,
          pannerNode: null
        };

        this.sounds.set(actualId, instance);

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

      if (instance === undefined) {
        sound.playOptions = mergedPlayOptions;
      }

      this.cleanupExistingSource(sound.id);

      const source: AudioBufferSourceNode = this.setupAudioSource(sound);
      if (!source) {
        this.debugLog(`Failed to create audio source for sound ${id}`);
        return;
      }

      const playbackRate = sound.playOptions?.playbackRate || 1;
      let startOffset = 0;
      if (sound.pausedAt !== undefined && sound.pausedAt !== 0) {
        startOffset = sound.pausedAt;
      } else if (sound.playOptions?.startTime !== undefined) {
        startOffset = sound.playOptions.startTime;
      }

      sound.startTime = this.context.currentTime - (startOffset / playbackRate);

      sound.state = SoundState.Playing;

      if (sound.playOptions?.volume !== undefined) {
        this.setSoundVolume(sound.id, sound.playOptions.volume, true);
      }
      if (sound.playOptions?.pan !== undefined && sound.panType !== SoundPanType.Spatial) {
        this.setPan(sound.id, sound.playOptions.pan, true);
      }
      if (sound.playOptions?.panSpatialPosition !== undefined && sound.panType === SoundPanType.Spatial) {
        this.setSpatialPosition(sound.playOptions.panSpatialPosition.x, sound.playOptions.panSpatialPosition.y, sound.playOptions.panSpatialPosition.z, sound.id, undefined, true);
      }
      if (sound.playOptions?.panSpatialOrientation !== undefined && sound.panType === SoundPanType.Spatial) {
        const direction = sound.playOptions.panSpatialOrientation;
        this.setSpatialOrientation(sound.id, direction.x, direction.y, direction.z, true);
      }
      if (sound.playOptions?.fadeInDuration !== undefined) {
        this.fadeIn(
          sound.id,
          sound.playOptions?.fadeInDuration ?? this.config?.fadeInDuration ?? 1,
          undefined, // startVolume (defaults to 0 or current volume)
          sound.playOptions?.volume // Use PlayOptions.volume as the end volume
        )
      }
      if (sound.playOptions?.fadeOutDuration !== undefined) {
        this.fadeOut(sound.id, sound.playOptions.fadeOutDuration ?? this.config?.fadeOutDuration ?? 1);
      }
      if (sound.playOptions?.playbackRate !== undefined) {
        this.setPlaybackRate(sound.id, playbackRate, true);
      }
      if (sound.playOptions?.loop !== undefined) {
        this.setLoop(sound.id, sound.playOptions.loop, sound.playOptions.maxLoops);
      }

      if (sound.playOptions?.fadeOutBeforeEndDuration !== undefined) {
        this.cancelScheduledFadeOut(sound.id);
        const fadeOutBeforeEndDuration = sound.playOptions.fadeOutBeforeEndDuration;
        const soundDuration = sound.playOptions.duration ?? sound.buffer?.duration ?? 0;
        const remainingDuration = soundDuration - (sound.pausedAt || 0);
        const fadeOutStartTime = remainingDuration - fadeOutBeforeEndDuration;

        if (fadeOutStartTime > 0) {
          this.scheduleFadeOut(sound.id, fadeOutStartTime, sound.playOptions.fadeOutBeforeEndDuration ?? 1);
        }
      }

      // A seamless loop expresses its region with loopStart / loopEnd, so it
      // must not also be given a stop time: that would end the loop after one
      // pass instead of letting it run until the sound is stopped.
      const playForDuration =
        sound.playOptions?.duration !== undefined &&
        sound.playOptions.duration > 0 &&
        !(sound.playOptions.loop && sound.playOptions.seamlessLoop);

      source.start(0, startOffset, playForDuration ? sound.playOptions!.duration! * playbackRate : undefined);

      if (sound.playOptions?.trackProgress === true) {
        this.startProgressTracking(sound.id);
      }

      if (!skipDispatchEvent) {
        const originalId = sound.id.includes(':') ? sound.id.split(':')[0] : sound.id;
        this.dispatchEvent({
          type: SoundEventsEnum.STARTED,
          soundId: sound.id,
          originalId,
          instanceId: sound.id,
          timestamp: this.context.currentTime,
          sound,
        });
      }

      return sound;

    } catch (error) {
      this.handleError("playing sound", error, id);
    }
  }

  public playSprite(id: string, spriteKey: string, options: PlayOptions = {}, skipDispatchEvent: boolean = false): void {
    if (this.streams.has(id)) {
      throw new Error(`Sprites need the samples in memory, so playSprite is not available on the stream "${id}".`);
    }
    const spriteId = `${id}_${spriteKey}`;
    this.play(spriteId, options, skipDispatchEvent);
  }

  public pause(id: string, skipDispatchEvent: boolean = false): void {
    if (this.streams.has(id)) return this.streamPause(id, skipDispatchEvent);
    try {
      const sound = this.getValidatedSound(id);

      if (!this.isPlaying(id) || this.isPaused(id)) return;

      this.cancelScheduledFadeOut(id);

      const playbackRate = sound.playOptions?.playbackRate ?? 1;

      const rawElapsedTime = (this.context.currentTime - (sound.startTime || 0)) * playbackRate;

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

      this.stopProgressTracking(id);

      this.cleanupExistingSource(id);

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
    if (this.streams.has(id)) return this.streamResume(id, skipDispatchEvent);
    try {
      const sound = this.getValidatedSound(id);
      this.play(id, sound?.playOptions);

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
    if (this.streams.has(id)) return this.streamStop(id, skipDispatchEvent);
    try {
      const sound = this.sounds.get(id);
      if (!sound) {
        this.debugLog(`Sound ${id} not found for stopping`);
        return;
      }

      this.cancelScheduledFadeOut(id);
      this.cancelFadeAnimation(id);
      this.stopProgressTracking(id);

      this.cleanupExistingSource(id);

      sound.state = SoundState.Stopped;
      sound.startTime = sound.playOptions?.startTime ?? 0;
      sound.pausedAt = 0;
      sound.currentTime = 0;

      this.removeEventListenersForInstance(id);

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
    if (this.streams.has(id)) return this.streamSeek(id, time, skipDispatchEvent);
    try {
      const sound = this.getValidatedSound(id);
      const { duration, currentTime } = this.getSoundState(id);
      if (time >= duration) {
        if (sound.state === SoundState.Stopped) {
          return;
        }
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

      const clampedTime = Math.max(0, Math.min(rawTime, rawDuration));

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
    this.streams.forEach((_, id) => this.streamStop(id));
    try {
      // Iterate the sounds map, not activeSources: pause() removes the entry from
      // activeSources, so paused sounds were silently skipped and stayed paused.
      const ids = new Set<string>([
        ...Array.from(this.sounds.keys()),
        ...Array.from(this.activeSources.keys())
      ]);

      ids.forEach((id) => {
        const sound = this.sounds.get(id);
        if (!sound || sound.state !== SoundState.Stopped) {
          this.stop(id);
        }
      });

      this.debugLog("All sounds stopped");
    } catch (error) {
      this.handleError("stopping all sounds", error);
    }
  }

  public pauseAllSounds(): void {
    this.streams.forEach((_, id) => this.streamPause(id));
    this.sounds.forEach((sound, id) => {
      if (sound.state === SoundState.Playing) {
        this.pause(id);
      }
    });
  }

  public resumeAllSounds(): void {
    this.streams.forEach((_, id) => this.streamResume(id));
    this.sounds.forEach((sound, id) => {
      if (sound.state == SoundState.Paused) {
        this.resume(id);
      }
    });
  }

  // End Playback control-----------------------------------------------------------------------------------------------------------

  // Fade managment ----------------------------------------------------------------------------------------------------------------

  public fadeIn(id: string, duration: number, startVolume?: number, endVolume?: number, skipDispatchEvent: boolean = false): void {
    if (this.streams.has(id)) {
      const stream = this.streams.get(id)!;
      if (stream.state !== SoundState.Playing) this.streamPlay(id);
      return this.streamFade(id, duration, startVolume ?? 0, endVolume ?? stream.volume ?? 1, false);
    }
    let sound: Sound;
    try {
      sound = this.getValidatedSound(id);
    } catch {
      return; // getValidatedSound already reported the failure
    }

    // Remember this before the flags are reset below, otherwise the
    // "continue from the current volume" branch further down is unreachable.
    const wasFadingOut = sound.isFadingOut === true;

    this.cancelFadeAnimation(id);

    sound.isFadingOut = false;
    sound.isFadingIn = true;

    const currentVolume = this.roundValue(sound.gainNode.gain.value, 2);

    // Target (end volume). Only apply the 0 to 1 guard when endVolume was not explicitly provided,
    // so that an explicit fadeIn(..., 0) is honoured.
    let targetEndVolume: number;
    if (endVolume !== undefined) {
      targetEndVolume = endVolume;
    } else {
      targetEndVolume = sound.volume ?? sound.playOptions?.volume ?? this.config.defaultVolume ?? 1;
      if (targetEndVolume === 0) targetEndVolume = 1;
    }

    let effectiveStartVolume: number;

    if (startVolume !== undefined) {
      effectiveStartVolume = startVolume;
    } else if (wasFadingOut) {
      effectiveStartVolume = currentVolume;
    } else if (currentVolume >= targetEndVolume) {
      // If current volume is at or above target, start from fadeInStartVolume or from 0
      effectiveStartVolume = sound.playOptions?.fadeInStartVolume ?? 0;
    } else {
      effectiveStartVolume = currentVolume;
    }

    sound.gainNode.gain.cancelScheduledValues(this.context.currentTime);

    sound.gainNode.gain.setValueAtTime(effectiveStartVolume, this.context.currentTime);

    if (sound.state !== SoundState.Playing) {
      this.play(id, { volume: effectiveStartVolume });
    }

    this.fadeSound(id, effectiveStartVolume, targetEndVolume, duration, () => {
      sound.volume = targetEndVolume;
      if (sound.playOptions) {
        sound.playOptions.volume = targetEndVolume;
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
    endVolume?: number,
    stopAfterFade: boolean = false,
    skipDispatchEvent: boolean = false
  ): void {
    let sound: Sound;
    try {
      sound = this.getValidatedSound(id);
    } catch {
      return; // getValidatedSound already reported the failure
    }

    this.cancelFadeAnimation(id);

    sound.isFadingIn = false;
    sound.isFadingOut = true;

    const currentVolume = this.roundValue(sound.gainNode.gain.value, 2);
    const effectiveStartVolume = startVolume ?? currentVolume;
    const targetEndVolume = endVolume ?? sound.playOptions?.fadeOutEndVolume ?? 0;

    sound.previousVolume = currentVolume;

    sound.gainNode.gain.setValueAtTime(effectiveStartVolume, this.context.currentTime);

    if (sound.state !== SoundState.Playing) {
      this.play(id, { volume: effectiveStartVolume });
    }
    this.fadeSound(id, effectiveStartVolume, targetEndVolume, duration, () => {
      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.FADE_OUT_COMPLETED,
          soundId: id,
          timestamp: this.context.currentTime,
          sound,
        });
      }
      // Check the resolved target, not the raw parameter: fadeOut(id, 2) fades to
      // 0 via fadeOutEndVolume, but `endVolume` is undefined so stopAfterFade
      // used to be ignored.
      if (targetEndVolume === 0 && stopAfterFade) {
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
      this.cancelFadeAnimation(id);
      const sound = this.getValidatedSound(id);

      sound.volume = startVolume;

      sound.gainNode.gain.cancelScheduledValues(this.context.currentTime);

      // Shorten the fade slightly so it finishes before the sound does
      const fadeDuration = Math.max(0, duration - 0.02); // Reduce by 20ms

      const startTime = this.context.currentTime;
      const endTime = startTime + fadeDuration;

      const fadeCompleteCallback = () => {
        // Same reason as in cancelFadeAnimation: onComplete below can call back
        // into the fade machinery, and it must not find this callback again.
        this.activeFadeCallbacks.delete(id);
        sound.isFadingIn = false;
        sound.isFadingOut = false;
        sound.volume = this.roundValue(targetVolume);
        // getSoundVolume() reads originalVolume, so a fade that only moved
        // `volume` left it reporting the volume from before the fade while
        // getSoundState() already reported the new one.
        sound.originalVolume = sound.volume;
        sound.gainNode.gain.setValueAtTime(targetVolume, this.context.currentTime);
        onComplete?.();
        this.dispatchEvent({
          type: SoundEventsEnum.VOLUME_CHANGED,
          soundId: id,
          timestamp: this.context.currentTime,
          volume: sound.volume,
          sound
        });
      };
      this.activeFadeCallbacks.set(id, fadeCompleteCallback);

      const fadeId = `fade_${id}`;
      const updateFade = () => {
        const currentTime = this.context.currentTime;

        if (currentTime >= endTime) {
          this.ticker.removeCallback(fadeId);
          fadeCompleteCallback();
          return;
        }

        const progress = (currentTime - startTime) / fadeDuration;
        const currentVolume = startVolume + (targetVolume - startVolume) * progress;

        sound.gainNode.gain.setValueAtTime(currentVolume, currentTime);
        sound.volume = this.roundValue(currentVolume);
        sound.originalVolume = sound.volume;

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

      this.masterGainNode.gain.cancelScheduledValues(this.context.currentTime);

      const startTime = this.context.currentTime;
      const fadeDuration = duration;
      const endTime = startTime + fadeDuration;

      // Shared id with fadeGlobalOut: registering it replaces any master fade
      // already running, instead of leaving two loops fighting over master gain.
      const fadeId = SoundHub.GLOBAL_FADE_ID;
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
      const initialVolume = startVolume ?? this.roundValue(this.masterGainNode.gain.value, 2);
      this.previousGlobalVolume = initialVolume;

      const startTime = this.context.currentTime;
      const fadeDuration = duration;
      const endTime = startTime + fadeDuration;

      // Shared id with fadeGlobalIn, see the note there
      const fadeId = SoundHub.GLOBAL_FADE_ID;
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
    if (this.streams.has(id)) return this.streams.get(id)!.volume;
    return this.getSoundVolume(id);
  }

  public setSoundVolume(id: string, volume: number, skipDispatchEvent: boolean = false): void {
    if (this.streams.has(id)) return this.streamSetVolume(id, volume, skipDispatchEvent);
    try {
      this.cancelFadeAnimation(id);
      const sound = this.getValidatedSound(id);

      const validatedVolume = this.setValidatedVolume(volume);
      sound.volume = this.roundValue(validatedVolume);
      sound.originalVolume = validatedVolume;
      sound.playOptions = {
        ...sound.playOptions,
        volume: validatedVolume,
      };

      sound.gainNode.gain.cancelScheduledValues(this.context.currentTime);
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
    if (this.streams.has(id)) return this.streams.get(id)!.volume;
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
    return this.isMuted ? 0 : this.roundValue(this.masterGainNode.gain.value, 2);
  }

  // End Volume control-------------------------------------------------------------------------------------------------------------

  // Mute control-------------------------------------------------------------------------------------------------------------------

  public muteAllSounds(): void {
    this.streams.forEach((_, id) => this.mute(id));
    this.previousGlobalVolume = this.roundValue(this.masterGainNode.gain.value, 2);
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
    this.streams.forEach((_, id) => this.unmute(id));
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
    if (this.streams.has(id)) {
      const stream = this.streams.get(id)!;
      if (!stream.isMuted) {
        stream.previousVolume = stream.volume;
        this.streamSetVolume(id, 0, true);
        stream.isMuted = true;
        this.dispatchEvent({ type: SoundEventsEnum.MUTED, soundId: id, isMuted: true, timestamp: this.context.currentTime });
      }
      return;
    }
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
    if (this.streams.has(id)) {
      const stream = this.streams.get(id)!;
      if (stream.isMuted) {
        this.streamSetVolume(id, stream.previousVolume ?? 1, true);
        stream.isMuted = false;
        this.dispatchEvent({ type: SoundEventsEnum.UNMUTED, soundId: id, isMuted: false, timestamp: this.context.currentTime });
      }
      return;
    }
    try {
      const sound = this.getValidatedSound(id);
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
    if (this.streams.has(id)) {
      return this.streams.get(id)!.isMuted ? this.unmute(id) : this.mute(id);
    }
    try {
      const sound = this.getValidatedSound(id);
      if ((sound?.volume ?? sound?.originalVolume ?? sound.playOptions?.volume ?? 1) > 0) {
        this.mute(id);
      } else {
        this.unmute(id);
      }
    } catch (error) {
      this.handleError("toggling mute", error, id);
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
    if (this.streams.has(id)) {
      // A media element loops natively and never reports the iterations, so
      // maxLoops has nothing to count here.
      this.streams.get(id)!.element.loop = loop;
      return;
    }
    const sound = this.sounds.get(id);
    if (!sound) {
      this.debugLog(`Sound ${id} not found for setting loop`);
      return;
    }

    sound.playOptions = { ...sound.playOptions, loop, maxLoops };

    // A seamless loop lives on the source node, so switching looping off has
    // to reach the node that is already playing.
    if (sound.playOptions.seamlessLoop && sound.source) {
      sound.source.loop = loop;
    }

    this.debugLog(`Loop set for sound ${id}: ${loop}`);
  }

  public getLoop(id: string): boolean {
    if (this.streams.has(id)) return this.streams.get(id)!.element.loop;
    const sound = this.sounds.get(id);
    if (!sound) {
      this.debugLog(`Sound ${id} not found for getting loop`);
      return false;
    }

    return sound.playOptions?.loop ?? false;
  }

  // End loop control-----------------------------------------------------------------------------------------------------------------------------

  // Sound loading and management-----------------------------------------------------------------------------------------------------------------


  private shouldUseProxy(url: string): boolean {
    if (!this.config.corsProxy) return false;
    if (this.isLocalUrl(url)) return false;
    return true;
  }
  
  private isLocalUrl(url: string): boolean {
    return url.startsWith('/') || 
           url.startsWith('./') || 
           url.startsWith('../') ||
           url.startsWith('blob:') ||
           url.startsWith('data:') ||
           !/^https?:/i.test(url);
  }
  
  private getProxyUrl(url: string): string {
    if (!this.shouldUseProxy(url)) return url;
    
    const proxy = this.config.corsProxy!;
    
    // Handle different proxy formats
    if (proxy.includes('cors-anywhere')) {
      // Special handling for cors-anywhere which needs raw URL
      return `${proxy}${url}`; // Don't encode the target URL
    }
    
    if (proxy.includes('?')) {
      // For proxies that expect encoded URLs in query params
      const paramName = proxy.includes('url=') ? '' : 'url=';
      return `${proxy}${paramName}${encodeURIComponent(url)}`;
    }
    
    return `${proxy}${url}`;
  }
  
  private async loadWithWebAudio(id: string, url: string, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    }

    const canProxy = this.shouldUseProxy(url);
    const configuredStrategy = this.config.fetchStrategy ?? 'direct-first';

    let strategies: ('direct' | 'proxy')[];
    if (configuredStrategy === 'direct-only') {
      strategies = ['direct'];
    } else if (configuredStrategy === 'proxy-first') {
      strategies = canProxy ? ['proxy', 'direct'] : ['direct'];
    } else {
      strategies = canProxy ? ['direct', 'proxy'] : ['direct'];
    }

    let lastError: unknown = null;

    for (const strategy of strategies) {
      try {
        // Only the proxy attempt rewrites the URL. A configured corsProxy used to
        // hijack every strategy, which made direct-only and the direct fallback
        // of proxy-first go through the proxy anyway.
        const fetchUrl = strategy === 'proxy' ? this.getProxyUrl(url) : url;

        this.debugLog(`Trying ${strategy} strategy for ${id}`, {
          originalUrl: url,
          fetchUrl: fetchUrl
        });

        const response = await this.fetchWithRetry(fetchUrl, {
          mode: 'cors',
          credentials: 'omit',
          cache: this.config.audioCache ? 'default' : 'no-cache',
          headers: {
            'Accept': 'audio/mpeg, audio/*',
            ...(this.config.fetchHeaders ?? {})
          }
        }, signal);

        return await this.processAudioResponse(id, response);
      } catch (error) {
        if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
          throw error;
        }

        lastError = error;
        this.debugLog(`${strategy} strategy failed for ${id}`, {
          error: error instanceof Error ? error.message : String(error),
          url: url
        });
      }
    }

    throw new Error(
      `Failed to load sound ${id}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  }
  
  private async fetchWithRetry(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
    const { fetchRetries = 2, retryDelay = 0.5, fetchTimeout = 10 } = this.config;
    let lastError: Error | null = null;

    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    }

    const credentialStrategies = this.config.credentialStrategy === 'auto'
      ? (this.config.crossOrigin === "use-credentials" ? ['include', 'omit'] : ['omit'])
      : [this.config.credentialStrategy || 'omit'];

    for (const credentials of credentialStrategies) {
      for (let attempt = 0; attempt <= fetchRetries; attempt++) {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), fetchTimeout * 1000);
        const combinedSignal = signal
          ? AbortSignal.any([signal, controller.signal])
          : controller.signal;

        try {
          const options = {
            ...init,
            credentials: credentials as RequestCredentials,
            signal: combinedSignal
          };

          this.debugLog(`Attempt ${attempt + 1} with credentials=${credentials}`);
          const response = await fetch(url, options);
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          if (init.mode === 'cors') {
            const corsHeader = response.headers.get('access-control-allow-origin');
            if (credentials === 'include' && corsHeader === '*') {
              throw new Error('Invalid CORS: Credentialed request with wildcard origin');
            }
          }

          this.debugLog(`Success after ${Date.now() - startTime}ms`);
          return response;

        } catch (error) {
          clearTimeout(timeoutId);
          if (signal?.aborted) throw error;
          lastError = error instanceof Error ? error : new Error(String(error));
          this.debugLog(`Attempt ${attempt + 1} failed: ${lastError.message}`);
        }

        if (attempt < fetchRetries) {
          if (signal?.aborted) {
            throw signal.reason ?? new DOMException('Aborted', 'AbortError');
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
        }
      }
    }

    throw lastError || new Error('Failed after all retries');
  }

  /**
   * Content types that plausibly carry audio. Being strict about `audio/*` here
   * rejected perfectly valid files: S3 and several CDNs serve audio as
   * application/octet-stream, and m4a/mp4 audio commonly arrives as video/*.
   * decodeAudioData is the real gate; this check only catches obvious mistakes
   * such as an HTML error page returned with status 200.
   */
  private isPlausibleAudioContentType(contentType: string | null): boolean {
    if (!contentType) return true; // No header at all, let the decoder decide

    const type = contentType.split(';')[0].trim().toLowerCase();

    return type.startsWith('audio/')
      || type.startsWith('video/')
      || type === 'application/ogg'
      || type === 'application/octet-stream'
      || type === 'binary/octet-stream';
  }

  private async processAudioResponse(id: string, response: Response, enforceContentType: boolean = true): Promise<void> {
    const contentType = response.headers.get('content-type');
    if (enforceContentType && !this.isPlausibleAudioContentType(contentType)) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && this.config.maxAudioSize && parseInt(contentLength) > this.config.maxAudioSize) {
      throw new Error(`Audio file too large: ${contentLength} bytes (max ${this.config.maxAudioSize} bytes), change the maxAudioSize config in your SoundHubConfig`);
    }
    const fileSize = contentLength ? parseInt(contentLength) : undefined;
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
    this.createSoundNode(id, audioBuffer, fileSize);
    this.debugLog(`Sound ${id} loaded successfully`);
  }

  private async loadWithHtml5Audio(id: string, url: string, signal?: AbortSignal): Promise<void> {
    if (!this.config.html5AudioFallback) {
      throw new Error('HTML5 Audio fallback is disabled in configuration');
    }

    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    }

    // Step 1: let the browser's own media pipeline prove it can play this URL.
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio();
      audio.crossOrigin = this.config.crossOrigin === "use-credentials"
        ? "use-credentials"
        : "anonymous";
      audio.preload = "auto";

      const cleanup = () => {
        audio.oncanplaythrough = null;
        audio.onerror = null;
        signal?.removeEventListener('abort', abortHandler);
      };

      const abortHandler = () => {
        cleanup();
        audio.src = '';
        reject(signal!.reason ?? new DOMException('Aborted', 'AbortError'));
      };

      // Registered once. It used to be attached via both onerror and
      // addEventListener, so cleanup ran twice on every failure.
      const errorHandler = () => {
        cleanup();
        const message = audio.error ? audio.error.message : 'unknown';
        audio.src = '';
        reject(new Error(`HTML5 Audio load error: ${message}`));
      };

      audio.oncanplaythrough = () => {
        cleanup();
        resolve();
      };

      audio.onerror = errorHandler;
      if (signal) signal.addEventListener('abort', abortHandler, { once: true });

      audio.src = url;
      audio.load();
    });

    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    }

    // Step 2: pull the bytes in for the Web Audio graph. This does its own fetch
    // rather than calling loadWithWebAudio again, which would only replay the
    // strategy loop that already failed. Content type is not enforced: the media
    // element above already established that the file is playable.
    const response = await this.fetchWithRetry(url, {
      mode: 'cors',
      credentials: 'omit',
      cache: this.config.audioCache ? 'default' : 'no-cache',
      headers: { ...(this.config.fetchHeaders ?? {}) }
    }, signal);

    await this.processAudioResponse(id, response, false);
    this.debugLog(`Sound ${id} loaded with HTML5 Audio fallback`);
  }

  public async loadSounds(soundsToLoad: { id: string; url: string | string[] }[], signal?: AbortSignal): Promise<void> {
    if (!soundsToLoad.length) return;

    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    }

    try {
      const { maxParallelLoads = 10, webAudioPreferred = true } = this.config;
      const batchSize = Math.max(1, maxParallelLoads);

      // Resolve every entry to the one url this browser can play before any
      // fetching starts, and remember the full list so a later reload can pick
      // again on a different browser.
      const resolved = soundsToLoad.map(({ id, url }) => {
        const urls = this.normaliseUrls(url);
        if (urls.length) this.registeredUrls.set(id, urls);
        return { id, url: this.pickPlayableUrl(urls.length ? urls : this.registeredUrls.get(id) ?? [''], id) };
      });

      const batches: { id: string; url: string }[][] = [];

      for (let i = 0; i < resolved.length; i += batchSize) {
        batches.push(resolved.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        if (signal?.aborted) {
          throw signal.reason ?? new DOMException('Aborted', 'AbortError');
        }

        const loadPromises = batch.map(async ({ id, url }) => {
          if (this.sounds.has(id)) {
            this.debugLog(`Sound with id ${id} already exists. Skipping.`);
            return;
          }

          this.loadStates.set(id, 'loading');
          this.dispatchEvent({
            type: SoundEventsEnum.LOADING,
            soundId: id,
            url,
            loadState: 'loading',
            timestamp: this.context.currentTime
          });

          try {
            if (webAudioPreferred) {
              try {
                await this.loadWithWebAudio(id, url, signal);
                return;
              } catch (webAudioError) {
                if (signal?.aborted) throw webAudioError;
                this.debugLog(`Web Audio load failed for ${id}`, webAudioError);
              }
            }

            await this.loadWithHtml5Audio(id, url, signal);
          } catch (error) {
            this.loadStates.set(id, 'error');
            if (!(error instanceof DOMException && error.name === 'AbortError')) {
              this.handleError("loading sound", error, id);
            }
            throw error;
          }
        });

        const results = await Promise.allSettled(loadPromises);
        const failedLoads = results.filter(r => r.status === 'rejected');

        if (failedLoads.length) {
          const firstRejected = (failedLoads[0] as PromiseRejectedResult).reason;
          if (firstRejected instanceof DOMException && firstRejected.name === 'AbortError') {
            throw firstRejected;
          }
          const failedIds = batch.filter((_, i) => results[i].status === 'rejected').map(s => s.id);
          throw new Error(`Failed to load sounds: ${failedIds.join(', ')}`);
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.handleError("preloading sounds", error);
      }
      throw error;
    }
  }


  private calculateAudioSize(buffer: AudioBuffer): number {
    return buffer.numberOfChannels * buffer.length * 4;
  }

  private createSoundNode(id: string, audioBuffer: AudioBuffer, fileSize?: number): void {
    const gainNode = this.context.createGain();
    gainNode.gain.value = this.config.defaultVolume ?? 1;
    gainNode.connect(this.masterGainNode);

    // Create a buffer source (we'll create a new one each time we play)
    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;

    const bufferSizeInBytes = this.calculateAudioSize(audioBuffer);

    const sound: Sound = {
      id,
      buffer: audioBuffer,
      gainNode,
      source,
      startTime: undefined,
      currentTime: 0,
      pausedAt: undefined,
      state: SoundState.Stopped,
      volume: this.config.defaultVolume ?? 1,
      currentLoopCount: 0,
      originalVolume: this.config.defaultVolume ?? 1,
      playOptions: {
        startTime: this.config.defaultStartTime ?? 0,
        loop: this.config.loopSounds ?? false,
        maxLoops: this.config.maxLoops ?? -1,
        playbackRate: this.config.defaultPlaybackRate ?? 1,
        pan: this.config.defaultPan ?? 0,
        volume: this.config.defaultVolume ?? 1,
        trackProgress: this.config.trackProgress ?? false
      },
      panSpatialPosition: this.config.defaultPanSpatialPosition ?? { x: 0, y: 0, z: 0 },
      pan: this.config.defaultPan ?? 0,
      panType: this.config.defaultPanType ?? SoundPanType.Stereo,
    };

    this.sounds.set(id, sound);
    this.loadStates.set(id, 'loaded');

    this.dispatchEvent({
      type: SoundEventsEnum.LOADED,
      soundId: id,
      timestamp: this.context.currentTime,
      sound,
      duration: audioBuffer.duration,
      bufferSize: bufferSizeInBytes,
      fileSize,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels
    });
  }

  public async loadSound(id: string, url?: string | string[], signal?: AbortSignal): Promise<void> {
    try {
      // Registered with registerSound() earlier: the url is already on file.
      const urls = url !== undefined ? this.normaliseUrls(url) : this.registeredUrls.get(id) ?? [];
      if (!urls.length) {
        throw new Error(`No url for sound ${id}. Pass one to loadSound, or register it first with registerSound.`);
      }
      await this.loadSounds([{ id, url: urls }], signal);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        this.handleError("loading sound", error, id);
      }
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

      // Stop and tear down the existing sound. The entry has to leave the map as
      // well: loadSounds() skips ids that are already registered, so leaving it in
      // place would silently keep the old buffer and never fetch newUrl.
      this.stop(id, true);
      this.cleanupSound(id);
      this.sounds.delete(id);

      await this.loadSound(id, newUrl);

      this.dispatchEvent({
        type: SoundEventsEnum.UPDATED_URL,
        soundId: id,
        timestamp: this.context.currentTime,
        sound: this.sounds.get(id) ?? sound
      });

      this.debugLog(`Sound ${id} URL updated to ${newUrl}`);
    } catch (error) {
      this.handleError("updating sound URL", error, id);
    }
  }

  public unloadSound(id: string): void {
    if (this.streams.has(id)) return this.streamUnload(id);
    const sound = this.sounds.get(id);
    if (!sound) {
      this.debugLog(`Sound ${id} not found for unloading`);
      return;
    }

    this.stop(id, false);
    this.cleanupSound(id);

    // Actually release the sound. Keeping the entry meant the decoded AudioBuffer
    // stayed alive, isSoundLoaded() kept reporting true, and loadSounds() skipped
    // the id on any later reload.
    this.sounds.delete(id);
    this.loadStates.delete(id);
    if (sound.groupId) {
      this.soundGroups.get(sound.groupId)?.sounds.delete(id);
    }
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
    if (this.streams.has(id)) return this.streamUnload(id);
    try {
      const sound = this.sounds.get(id);
      if (!sound) return;
      this.unloadSound(id); // Also removes it from the sounds map
      this.registeredUrls.delete(id); // remove means gone, unload keeps the url for a reload
      this.debugLog(`Removed sound ${id}`);
    } catch (error) {
      this.handleError("removing sound", error, id);
    }
  }

  public isSoundLoaded(id: string): boolean {
    if (this.streams.has(id)) return true;
    const sound = this.sounds.get(id);
    return sound?.buffer != null;
  }

  /**
   * Write down where a sound lives without fetching it yet.
   *
   * Use it for audio you know about but do not need at startup: the boss music,
   * the sounds of level seven. Call `loadSound(id)` with no url when the moment
   * arrives, and `getLoadState(id)` in between to drive a spinner.
   */
  public registerSound(id: string, url: string | string[]): void {
    const urls = this.normaliseUrls(url);
    if (!urls.length) {
      this.debugLog(`registerSound called for ${id} without a usable url`);
      return;
    }
    this.registeredUrls.set(id, urls);
    if (!this.sounds.has(id)) this.loadStates.set(id, 'unloaded');
    this.debugLog(`Registered ${id} with ${urls.length} source(s)`);
  }

  /** registerSound for a whole list at once. */
  public registerSounds(soundsToRegister: { id: string; url: string | string[] }[]): void {
    soundsToRegister.forEach(({ id, url }) => this.registerSound(id, url));
  }

  /** Where a sound is in the loading process: unloaded, loading, loaded or error. */
  public getLoadState(id: string): SoundLoadState {
    if (this.streams.has(id)) return 'loaded';
    if (this.sounds.get(id)?.buffer) return 'loaded';
    return this.loadStates.get(id) ?? 'unloaded';
  }

  /** The url a sound was loaded from, or the list it was registered with. */
  public getSoundUrls(id: string): string[] {
    return [...(this.registeredUrls.get(id) ?? [])];
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

    if (group.maxInstances && group.sounds.size >= group.maxInstances) {
      const oldestSoundId = Array.from(group.sounds)[0];
      this.stop(oldestSoundId); // Stop the oldest instance
      group.sounds.delete(oldestSoundId); // Remove it from the group
      this.debugLog(`Stopped oldest instance ${oldestSoundId} to make room for new instance in group ${groupName}.`);
    }

    const sound = this.sounds.get(soundId);
    if (sound) {
      sound.groupId = groupName;
    }
    if (sound && group.playOptions) {
      // Group options have to win here. createSoundNode already fills playOptions
      // with config-derived defaults for startTime, loop, maxLoops, playbackRate,
      // pan, volume and trackProgress, so spreading the sound last meant those
      // defaults always beat the group and createSoundGroup({ playOptions })
      // had no effect. Per-call options passed to play() still take precedence,
      // since play() merges them on top of this.
      sound.playOptions = { ...sound.playOptions, ...group.playOptions };
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
    if (this.streams.has(id)) {
      throw new Error(`Sprites need the samples in memory, so they are not available on the stream "${id}". Load it with loadSound instead.`);
    }
    try {
      const originalSound = this.getValidatedSound(id);
      if (!originalSound || !originalSound.buffer) {
        throw new Error(`Sound ${id} not found or buffer not loaded`);
      }

      // Record the config on the owner sound so getSpriteConfig() can return it
      // and removeSpriteSound() can resolve a key to its sprite sounds.
      originalSound.sprite = { ...sprite };

      Object.entries(sprite).forEach(([key, [start, end]]) => {
        const spriteId = `${id}_${key}`;
        this.debugLog(
          `Creating sprite ${spriteId} for sound ${id}: Start=${start}s, End=${end}s, Duration=${end - start}s`
        );

        // Convert seconds to samples, clamped to the source buffer. Reading past
        // the end yielded undefined, which lands in a Float32Array as NaN and
        // turns the sprite into silence or noise.
        const sampleRate = originalSound.buffer.sampleRate;
        const totalSamples = originalSound.buffer.length;
        const startSample = Math.max(0, Math.min(Math.floor(start * sampleRate), totalSamples));
        const endSample = Math.max(startSample, Math.min(Math.floor(end * sampleRate), totalSamples));
        const frameCount = endSample - startSample;
        const duration = frameCount / sampleRate;

        if (frameCount <= 0) {
          this.debugLog(
            `Skipping sprite ${spriteId}: range ${start}s-${end}s is empty or outside the buffer (${totalSamples / sampleRate}s)`
          );
          return;
        }

        const numberOfChannels = originalSound.buffer.numberOfChannels;
        const spriteBuffer = this.context.createBuffer(numberOfChannels, frameCount, sampleRate);

        for (let channel = 0; channel < numberOfChannels; channel++) {
          const originalData = originalSound.buffer.getChannelData(channel);
          const spriteData = spriteBuffer.getChannelData(channel);

          spriteData.set(originalData.subarray(startSample, endSample));
        }

        const gainNode = this.context.createGain();
        const volume = originalSound.volume ?? this.config.defaultVolume ?? 1;
        gainNode.gain.value = volume;
        gainNode.connect(this.masterGainNode);


        const spriteSound: Sound = {
          id: spriteId,
          buffer: spriteBuffer,
          currentTime: 0,
          source: this.context.createBufferSource(),
          originalVolume: volume,
          state: SoundState.Stopped,
          gainNode: gainNode,
          playOptions: { ...originalSound.playOptions },
          currentLoopCount: 0,
          panSpatialPosition: this.config.defaultPanSpatialPosition || { x: 0, y: 0, z: 0 },
          pan: originalSound.pan ?? this.config.defaultPan ?? 0,
        };

        if (originalSound.stereoPanner) {
          const stereoPanner = this.context.createStereoPanner();
          stereoPanner.connect(gainNode);
          spriteSound.stereoPanner = stereoPanner;
        }

        this.sounds.set(spriteId, spriteSound);

        this.debugLog(`Created sprite sound ${spriteId}:
                Duration: ${duration}s
                Sample rate: ${sampleRate}
                Channels: ${numberOfChannels}
                Buffer length: ${spriteBuffer.length} samples
            `);

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

  /**
   * Removes a sprite sound and all of its instances.
   *
   * Accepts either a sprite key registered via setSoundSprite ("jump") or the
   * full sprite sound id ("game-sounds_jump"). The previous substring match
   * (`key.includes('_' + spriteKey)`) both over-matched, removing
   * "player_double_jump" for the key "jump", and failed outright when callers
   * passed the full sprite id.
   */
  public removeSpriteSound(spriteKey: string): void {
    try {
      // Resolve the sprite sound ids this key refers to
      const spriteIds = new Set<string>();

      if (this.sounds.has(spriteKey)) {
        spriteIds.add(spriteKey);
      }

      this.sounds.forEach((sound, id) => {
        if (sound.sprite && Object.prototype.hasOwnProperty.call(sound.sprite, spriteKey)) {
          spriteIds.add(`${id}_${spriteKey}`);
        }
      });

      // Include every live instance of those sprite sounds ("<spriteId>:<n>")
      const spriteInstances = Array.from(this.sounds.keys()).filter(
        key => spriteIds.has(key.split(':')[0])
      );

      if (spriteInstances.length === 0) {
        this.debugLog(`No sprite instances found for key: ${spriteKey}`);
        return;
      }

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
      this.cancelAutoSuspend();
      await this.context.suspend();
      this.debugLog('Audio context suspended');
      this.dispatchEvent({
        type: SoundEventsEnum.CONTEXT_SUSPENDED,
        isMaster: true,
        timestamp: this.context.currentTime
      });
    } catch (error) {
      this.handleError("suspending context", error);
    }
  }

  public async resumeContext(): Promise<void> {
    try {
      this.cancelAutoSuspend();
      this.autoSuspended = false;
      await this.context.resume();
      this.debugLog('Audio context resumed');
      this.dispatchEvent({
        type: SoundEventsEnum.CONTEXT_RESUMED,
        isMaster: true,
        timestamp: this.context.currentTime
      });
    } catch (error) {
      this.handleError("resuming context", error);
    }
  }

  // Auto suspend --------------------------------------------------------------------------------------------------------
  //
  // A running AudioContext keeps the audio hardware awake, which costs battery
  // on a phone even when nothing is playing. With `autoSuspend` on, the context
  // goes to sleep after `autoSuspendDelay` seconds of silence and the next
  // play() wakes it up. Off by default: waking up takes a few milliseconds, and
  // a metronome or a game that fires sounds constantly is better off awake.

  /** Whether any buffered sound or stream is making noise right now. */
  private hasActivePlayback(): boolean {
    for (const sound of this.sounds.values()) {
      if (sound.state === SoundState.Playing) return true;
    }
    for (const stream of this.streams.values()) {
      if (stream.state === SoundState.Playing) return true;
    }
    return false;
  }

  private cancelAutoSuspend(): void {
    if (this.autoSuspendTimer === null) return;
    clearTimeout(this.autoSuspendTimer);
    this.autoSuspendTimer = null;
  }

  /** Start or cancel the sleep timer, depending on what is playing. */
  private updateAutoSuspend(): void {
    if (!this.config.autoSuspend) return;

    if (this.hasActivePlayback()) {
      this.cancelAutoSuspend();
      return;
    }

    if (this.autoSuspendTimer !== null || this.context.state !== 'running') return;

    const delay = Math.max(1, this.config.autoSuspendDelay ?? 30) * 1000;
    this.autoSuspendTimer = setTimeout(() => {
      this.autoSuspendTimer = null;
      if (this.hasActivePlayback() || this.context.state !== 'running') return;

      this.context.suspend().then(
        () => {
          this.autoSuspended = true;
          this.debugLog('Audio context suspended after silence');
          this.dispatchEvent({
            type: SoundEventsEnum.CONTEXT_SUSPENDED,
            isMaster: true,
            timestamp: this.context.currentTime
          });
        },
        (error) => this.debugLog('Auto suspend failed:', error)
      );
    }, delay);
  }

  /** Undo an auto suspend. Called by play() before anything is scheduled. */
  private wakeFromAutoSuspend(): void {
    this.cancelAutoSuspend();
    if (!this.autoSuspended) return;

    this.autoSuspended = false;
    this.context.resume().then(
      () => {
        this.debugLog('Audio context resumed from auto suspend');
        this.dispatchEvent({
          type: SoundEventsEnum.CONTEXT_RESUMED,
          isMaster: true,
          timestamp: this.context.currentTime
        });
      },
      (error) => this.debugLog('Waking from auto suspend failed:', error)
    );
  }

  public getContext(): AudioContext {
    return this.context;
  }

  public getMasterOutput(): AudioNode {
    return this.masterStereoPanner;
  }

  /**
   * Entry point of the master chain, for audio you generate yourself
   * (oscillators, a MediaElementSource, a worklet). Connecting here routes that
   * audio through master volume, mute, panning and the limiter, exactly like a
   * loaded sound.
   *
   * Use getMasterOutput() instead when you only want to observe the signal, for
   * example with an AnalyserNode.
   */
  public getMasterInput(): AudioNode {
    return this.masterGainNode;
  }

  // End Context -----------------------------------------------------------------------------------------------------------------------------------


  // State checks-------------------------------------------------------------------------------------------------------------------

  public isPlaying(id: string): boolean {
    if (this.streams.has(id)) return this.streams.get(id)!.state === SoundState.Playing;
    try {
      const sound = this.getValidatedSound(id);
      return sound.state === SoundState.Playing;
    } catch {
      return false;
    }
  }

  public isPaused(id: string): boolean {
    if (this.streams.has(id)) return this.streams.get(id)!.state === SoundState.Paused;
    try {
      const sound = this.getValidatedSound(id);
      return sound.state == SoundState.Paused;
    } catch {
      return false;
    }
  }

  public isStopped(id: string): boolean {
    if (this.streams.has(id)) return this.streams.get(id)!.state === SoundState.Stopped;
    try {
      const sound = this.getValidatedSound(id);
      return sound.state === SoundState.Stopped;
    } catch {
      return true;
    }
  }

  public getSoundState(id: string): SoundStateInfo {
    if (this.streams.has(id)) return this.streamState(id);
    let sound: Sound;
    try {
      sound = this.getValidatedSound(id);
    } catch {
      // Unknown or unloaded id: report a neutral, stopped state rather than
      // throwing out of a getter that UI code polls every frame.
      return this.createEmptySoundState();
    }

    const playbackRate = sound.playOptions?.playbackRate ?? 1;
    const rawDuration = sound.buffer?.duration ?? 0;
    const adjustedDuration = rawDuration / playbackRate;

    let currentTime = 0;
    let elapsedTime = 0;

    if (sound.state === SoundState.Playing && sound.startTime !== undefined) {
      elapsedTime = (this.context.currentTime - sound.startTime) * playbackRate;
      currentTime = elapsedTime;

      if (sound.playOptions?.loop && rawDuration > 0) {
        currentTime = currentTime % rawDuration;

        // A loop reports where it is inside the file, not how long it has been
        // running. A restarting loop gets that for free because every
        // iteration resets the start time, but a seamless loop keeps one start
        // time for the whole run, and its elapsed time would otherwise climb
        // past the duration forever.
        elapsedTime = currentTime;
      }
    } else {
      currentTime = sound.pausedAt || sound.currentTime || 0;
      elapsedTime = currentTime;
    }
    const progressRatio = rawDuration > 0 ? currentTime / rawDuration : 0;

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
    if (this.streams.has(id)) return this.streamDuration(this.streams.get(id)!);
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
    if (this.streams.has(id)) {
      this.stopProgressTracking(id);
      const stream = this.streams.get(id)!;
      this.ticker.addCallback(`progress_${id}`, () => {
        if (stream.state !== SoundState.Playing) {
          this.stopProgressTracking(id);
          return;
        }
        const state = this.streamState(id);
        this.dispatchEvent({
          type: SoundEventsEnum.PROGRESS,
          soundId: id,
          originalId: id,
          instanceId: id,
          currentTime: state.currentTime,
          duration: state.duration,
          progress: state.progress,
          progressInfo: {
            soundId: id,
            currentTime: state.currentTime,
            duration: state.duration,
            rawDuration: state.rawDuration ?? 0,
            progress: state.progress,
          },
          state,
          volume: stream.volume,
          timestamp: this.context.currentTime,
        });
      }, this.PROGRESS_UPDATE_INTERVAL);
      return;
    }
    this.stopProgressTracking(id);

    const originalId = id.includes(':') ? id.split(':')[0] : id;

    const trackProgress = () => {
      const sound = this.sounds.get(id);
      if (!sound || sound.state !== SoundState.Playing) {
        this.stopProgressTracking(id);
        return;
      }

      const soundState = this.getSoundState(id);

      const { currentTime, duration, rawDuration, elapsedTime, adjustedElapsedTime, playbackRate } = soundState;
      const progress = duration ? (elapsedTime / duration) : 0;


      if (sound.playOptions?.duration !== undefined && sound.playOptions.duration > 0) {
        if (adjustedElapsedTime >= (sound.playOptions.duration + (sound.playOptions.startTime ?? 0)) / (playbackRate || 1)) {
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
        state: soundState,
        timestamp: this.context.currentTime,
        volume: sound.volume,
        sound,
      });
    };

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
    if (this.streams.has(id)) {
      const stream = this.streams.get(id)!;
      stream.pan = Math.max(-1, Math.min(1, value));
      if (stream.stereoPanner) stream.stereoPanner.pan.value = stream.pan;
      if (!skipDispatchEvent) {
        this.dispatchEvent({ type: SoundEventsEnum.PAN_CHANGED, soundId: id, pan: stream.pan, timestamp: this.context.currentTime });
      }
      return;
    }
    try {
      const sound = this.getValidatedSound(id);
      const clampedValue = Math.max(-1, Math.min(1, value));

      if (this.isSpatialAudioActive(id)) {
        this.debugLog(`Removed 3D spatial audio, and overwritten with stereo panner for sound ${id}`);
        this.removeSpatialEffect(id);
        sound.panType = SoundPanType.Stereo;

        // Reset spatial position without dispatching SPATIAL_POSITION_CHANGED
        const restoredPanSpatialPosition = { x: 0, y: 0, z: 0 };
        sound.panSpatialPosition = restoredPanSpatialPosition;
        if (sound.playOptions) {
          sound.playOptions.panSpatialPosition = restoredPanSpatialPosition;
        }
      }

      if (!sound.stereoPanner) {
        sound.stereoPanner = this.context.createStereoPanner();
      }

      sound.pan = clampedValue;

      if (sound.playOptions) {
        sound.playOptions.pan = clampedValue;
      }

      sound.panType = SoundPanType.Stereo;
      if (sound.stereoPanner) {
        sound.stereoPanner.pan.setValueAtTime(sound.pan, this.context.currentTime);
      }

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

    try {
      const sound = this.getValidatedSound(id);
      this.setPan(id, 0, true);

      this.dispatchEvent({
        type: SoundEventsEnum.PAN_RESET,
        soundId: id,
        timestamp: this.context.currentTime,
        isMaster: false,
        sound
      });
    } catch (error) {
      this.handleError("resetting pan", error, id);
    }
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

      this.sounds.forEach((_sound, id) => {
        if (this.isSpatialAudioActive(id)) {
          this.removeSpatialEffect(id);
        }
      });

      // Per-sound stereo panners are deliberately left alone. Writing the master
      // value into each of them applied the pan twice (once per sound, once on
      // the master node) and destroyed the individual pan settings.

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
      this.masterPannerNode = null;
      this.rewireMasterChain();
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
    if (this._spatialAudioSupported !== null) {
      return this._spatialAudioSupported;
    }
    try {
      if (!("AudioContext" in window || "webkitAudioContext" in window)) {
        return (this._spatialAudioSupported = false);
      }
      if (!("PannerNode" in window)) {
        return (this._spatialAudioSupported = false);
      }

      // Probe our own listener, falling back to AudioListener.prototype. This
      // used to construct a throwaway AudioContext on every first call, and
      // close() is async so it lingered. Browsers cap the number of live
      // contexts (Chrome allows about six), so several SoundHub instances
      // could exhaust the budget.
      const listener: object | undefined = this.context
        ? this.context.listener
        : (window as any).AudioListener?.prototype;

      if (!listener) {
        return (this._spatialAudioSupported = false);
      }

      const hasRequiredProperties =
        "positionX" in listener &&
        "positionY" in listener &&
        "positionZ" in listener;

      return (this._spatialAudioSupported = hasRequiredProperties);
    } catch (error) {
      this.debugLog("Spatial audio support check failed:", error);
      return (this._spatialAudioSupported = false);
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

    const sound = this.sounds.get(soundId);
    if (!sound) {
      this.debugLog(`Sound ${soundId} not found for position setting`);
      return;
    }

    const source = sound.source;

    // If stereo panning is active, reset it without dispatching PAN_CHANGED.
    // removePan() reroutes the source straight to the gain node, so the panner
    // has to be spliced back in below.
    const sourceWasRerouted = !!sound.stereoPanner;
    if (sound.stereoPanner) {
      this.removePan(soundId);
      this.debugLog(`Removed stereo panner, and overwritten with spatial panning for sound ${soundId}`);
    }
    sound.panType = SoundPanType.Spatial;

    if (sound.playOptions) {
      sound.playOptions.panSpatialPosition = { x, y, z };
    } else {
      sound.playOptions = { panSpatialPosition: { x, y, z } };
    }

    try {
      if (!sound.pannerNode) {
        // mergedConfig is only needed here (one-time setup), not on every position update
        const mergedConfig: SoundPannerConfig = {
          ...DEFAULT_PANNER_CONFIG, // Start with default config
          ...(this.config.pannerNodeConfig || {}), // Override with sound manager config if exists
          ...(soundPannerConfig || {}), // Override with specific config if provided
        };

        sound.pannerNode = this.context.createPanner();
        sound.pannerNode.panningModel = mergedConfig.panningModel!;
        sound.pannerNode.distanceModel = mergedConfig.distanceModel!;
        sound.pannerNode.refDistance = mergedConfig.refDistance!;
        sound.pannerNode.maxDistance = mergedConfig.maxDistance!;
        sound.pannerNode.rolloffFactor = mergedConfig.rolloffFactor!;
        sound.pannerNode.coneInnerAngle = mergedConfig.coneInnerAngle!;
        sound.pannerNode.coneOuterAngle = mergedConfig.coneOuterAngle!;
        sound.pannerNode.coneOuterGain = mergedConfig.coneOuterGain!;

        // Wire the audio graph only when the panner is first created.
        // Repeated disconnect/connect on every call triggers the onended event
        // (see AudioNodeConnector), breaking animation loops and accumulating
        // duplicate pannerNode→gainNode connections.
        source?.disconnect();
        source?.connect(sound.pannerNode);
        sound.pannerNode.connect(sound.gainNode);
      } else {
        // Panner node already exists. Only re-route when removePan() above
        // actually disconnected the source. Doing it on every call re-triggers
        // onended and accumulates duplicate connections, which is exactly the
        // problem the comment in the branch above warns about, and it is the path
        // taken by every position update of a moving source.
        if (sourceWasRerouted) {
          source?.disconnect();
          source?.connect(sound.pannerNode);
          sound.pannerNode.connect(sound.gainNode);
        }

        if (soundPannerConfig && Object.keys(soundPannerConfig).length !== 0) {
          Object.entries(soundPannerConfig).forEach(([key, value]) => {
            if (value !== undefined) {
              (sound.pannerNode as any)[key] = value;
            }
          });
        }
      }

      sound.pannerNode.positionX.setValueAtTime(x, this.context.currentTime);
      sound.pannerNode.positionY.setValueAtTime(y, this.context.currentTime);
      sound.pannerNode.positionZ.setValueAtTime(z, this.context.currentTime);
      sound.panSpatialPosition = { x, y, z };

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
      if (!this.masterPannerNode) {
        this.masterPannerNode = this.context.createPanner();
        // Splice it into the master chain, keeping the stereo panner in place
        this.rewireMasterChain();
      }

      this.masterPannerNode.positionX.setValueAtTime(x, this.context.currentTime);
      this.masterPannerNode.positionY.setValueAtTime(y, this.context.currentTime);
      this.masterPannerNode.positionZ.setValueAtTime(z, this.context.currentTime);

      this.masterSpatialPosition = { x, y, z };

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

  // Listener ------------------------------------------------------------------------------------------------------------
  //
  // The listener is the ear in the scene. Moving sounds around a fixed ear works
  // for a menu or a map; a first-person camera needs the ear to move instead.
  // Both ways use the same panner nodes, so you can mix them.

  /**
   * Older Safari has setPosition and setOrientation instead of AudioParams.
   * Writing through one helper keeps the two shapes out of the callers.
   */
  private applyListenerValues(): void {
    const listener = this.context.listener as AudioListener & {
      setPosition?: (x: number, y: number, z: number) => void;
      setOrientation?: (fx: number, fy: number, fz: number, ux: number, uy: number, uz: number) => void;
    };
    const now = this.context.currentTime;
    const { x, y, z } = this.listenerPosition;
    const { forward, up } = this.listenerOrientation;

    if (listener.positionX) {
      listener.positionX.setValueAtTime(x, now);
      listener.positionY.setValueAtTime(y, now);
      listener.positionZ.setValueAtTime(z, now);
      listener.forwardX.setValueAtTime(forward.x, now);
      listener.forwardY.setValueAtTime(forward.y, now);
      listener.forwardZ.setValueAtTime(forward.z, now);
      listener.upX.setValueAtTime(up.x, now);
      listener.upY.setValueAtTime(up.y, now);
      listener.upZ.setValueAtTime(up.z, now);
      return;
    }

    listener.setPosition?.(x, y, z);
    listener.setOrientation?.(forward.x, forward.y, forward.z, up.x, up.y, up.z);
  }

  private dispatchListenerChanged(): void {
    this.dispatchEvent({
      type: SoundEventsEnum.LISTENER_CHANGED,
      isMaster: true,
      position: { ...this.listenerPosition },
      orientation: { ...this.listenerOrientation.forward },
      up: { ...this.listenerOrientation.up },
      timestamp: this.context.currentTime
    });
  }

  /** Move the ear. Every spatial sound is heard from here. */
  public setListenerPosition(x: number, y: number, z: number, skipDispatchEvent: boolean = false): void {
    if (!this.isSpatialAudioEnabled()) {
      this.debugLog("Spatial audio is not enabled or supported");
      return;
    }
    try {
      this.listenerPosition = { x: this.roundValue(x, 2), y: this.roundValue(y, 2), z: this.roundValue(z, 2) };
      this.applyListenerValues();
      if (!skipDispatchEvent) this.dispatchListenerChanged();
    } catch (error) {
      this.handleError("setting listener position", error);
    }
  }

  public getListenerPosition(): { x: number; y: number; z: number } {
    return { ...this.listenerPosition };
  }

  /**
   * Point the ear. The forward vector is where the head is looking, the up
   * vector is which way is up, so tilting the camera does not roll the sound.
   * Defaults are the Web Audio ones: looking down negative z, up along y.
   */
  public setListenerOrientation(
    forwardX: number,
    forwardY: number,
    forwardZ: number,
    upX: number = 0,
    upY: number = 1,
    upZ: number = 0,
    skipDispatchEvent: boolean = false
  ): void {
    if (!this.isSpatialAudioEnabled()) {
      this.debugLog("Spatial audio is not enabled or supported");
      return;
    }
    try {
      this.listenerOrientation = {
        forward: { x: this.roundValue(forwardX, 2), y: this.roundValue(forwardY, 2), z: this.roundValue(forwardZ, 2) },
        up: { x: this.roundValue(upX, 2), y: this.roundValue(upY, 2), z: this.roundValue(upZ, 2) }
      };
      this.applyListenerValues();
      if (!skipDispatchEvent) this.dispatchListenerChanged();
    } catch (error) {
      this.handleError("setting listener orientation", error);
    }
  }

  public getListenerOrientation(): { forward: { x: number; y: number; z: number }; up: { x: number; y: number; z: number } } {
    return { forward: { ...this.listenerOrientation.forward }, up: { ...this.listenerOrientation.up } };
  }

  /** Back to the centre, looking down negative z. */
  public resetListener(): void {
    this.listenerPosition = { x: 0, y: 0, z: 0 };
    this.listenerOrientation = { forward: { x: 0, y: 0, z: -1 }, up: { x: 0, y: 1, z: 0 } };
    if (!this.isSpatialAudioEnabled()) return;
    this.applyListenerValues();
    this.dispatchListenerChanged();
  }

  // Source direction ----------------------------------------------------------------------------------------------------

  private applyPannerOrientation(panner: PannerNode, x: number, y: number, z: number): void {
    const node = panner as PannerNode & {
      setOrientation?: (x: number, y: number, z: number) => void;
    };
    const now = this.context.currentTime;

    if (node.orientationX) {
      node.orientationX.setValueAtTime(x, now);
      node.orientationY.setValueAtTime(y, now);
      node.orientationZ.setValueAtTime(z, now);
      return;
    }
    node.setOrientation?.(x, y, z);
  }

  /**
   * Point a sound in a direction.
   *
   * On its own this does nothing audible. It gets interesting together with
   * coneInnerAngle and coneOuterAngle on the panner config: those describe a
   * cone, and this says where the cone points. A television facing into the
   * room, a character talking away from you.
   */
  public setSpatialOrientation(soundId: string, x: number, y: number, z: number, skipDispatchEvent: boolean = false): void {
    if (!this.isSpatialAudioEnabled()) {
      this.debugLog("Spatial audio is not enabled or supported");
      return;
    }

    try {
      const sound = this.sounds.get(soundId);
      if (!sound) {
        this.debugLog(`Sound ${soundId} not found for orientation setting`);
        return;
      }

      // A direction needs a panner to point. Positioning the sound where it
      // already is creates one and leaves the position alone.
      if (!sound.pannerNode) {
        const at = sound.panSpatialPosition ?? { x: 0, y: 0, z: 0 };
        this.setSpatialPosition(at.x, at.y, at.z, soundId, undefined, true);
      }
      if (!sound.pannerNode) return;

      const orientation = { x: this.roundValue(x, 2), y: this.roundValue(y, 2), z: this.roundValue(z, 2) };
      this.applyPannerOrientation(sound.pannerNode, orientation.x, orientation.y, orientation.z);

      sound.panSpatialOrientation = orientation;
      sound.playOptions = { ...(sound.playOptions ?? {}), panSpatialOrientation: orientation };

      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.SPATIAL_ORIENTATION_CHANGED,
          soundId,
          orientation,
          timestamp: this.context.currentTime,
          sound
        });
      }
    } catch (error) {
      this.handleError("setting spatial orientation", error, soundId);
    }
  }

  public getSpatialOrientation(soundId: string): { x: number; y: number; z: number } | null {
    return this.sounds.get(soundId)?.panSpatialOrientation ?? null;
  }

  /** The direction of the master panner, for when you position the whole mix at once. */
  public setMasterSpatialOrientation(x: number, y: number, z: number, skipDispatchEvent: boolean = false): void {
    try {
      if (!this.masterPannerNode) {
        const at = this.masterSpatialPosition;
        this.setMasterSpatialPosition(at.x, at.y, at.z, {}, true);
      }
      if (!this.masterPannerNode) return;

      this.masterSpatialOrientation = { x: this.roundValue(x, 2), y: this.roundValue(y, 2), z: this.roundValue(z, 2) };
      this.applyPannerOrientation(
        this.masterPannerNode,
        this.masterSpatialOrientation.x,
        this.masterSpatialOrientation.y,
        this.masterSpatialOrientation.z
      );

      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.SPATIAL_ORIENTATION_CHANGED,
          isMaster: true,
          orientation: { ...this.masterSpatialOrientation },
          timestamp: this.context.currentTime
        });
      }
    } catch (error) {
      this.handleError("setting master spatial orientation", error);
    }
  }

  public getMasterSpatialOrientation(): { x: number; y: number; z: number } {
    return { ...this.masterSpatialOrientation };
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
      if (this.masterPannerNode) {
        this.masterSpatialPosition = { x: 0, y: 0, z: 0 };
        this.masterPannerNode.positionX.setValueAtTime(this.masterSpatialPosition.x, this.context.currentTime);
        this.masterPannerNode.positionY.setValueAtTime(this.masterSpatialPosition.y, this.context.currentTime);
        this.masterPannerNode.positionZ.setValueAtTime(this.masterSpatialPosition.z, this.context.currentTime);

        this.masterPannerNode.coneInnerAngle = DEFAULT_PANNER_CONFIG.coneInnerAngle ?? 360;
        this.masterPannerNode.coneOuterAngle = DEFAULT_PANNER_CONFIG.coneOuterAngle ?? 360;
        this.masterPannerNode.coneOuterGain = DEFAULT_PANNER_CONFIG.coneOuterGain ?? 0;
        this.masterPannerNode.distanceModel = DEFAULT_PANNER_CONFIG.distanceModel ?? "inverse";
        this.masterPannerNode.maxDistance = DEFAULT_PANNER_CONFIG.maxDistance ?? 10000;
        this.masterPannerNode.panningModel = DEFAULT_PANNER_CONFIG.panningModel ?? "HRTF";
        this.masterPannerNode.refDistance = DEFAULT_PANNER_CONFIG.refDistance ?? 1;
        this.masterPannerNode.rolloffFactor = DEFAULT_PANNER_CONFIG.rolloffFactor ?? 0.2;

        // Take the panner back out of the chain, keeping the stereo panner intact
        this.masterPannerNode.disconnect();
        this.masterPannerNode = null; // Clear the masterPannerNode reference
        this.rewireMasterChain();
      }

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
    if (this.streams.has(id)) {
      const stream = this.streams.get(id)!;
      stream.element.playbackRate = Math.max(0.25, Math.min(4, rate));
      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.PLAYBACK_RATE_CHANGED,
          soundId: id,
          playbackRate: stream.element.playbackRate,
          timestamp: this.context.currentTime,
        });
      }
      return;
    }
    if (!id || typeof rate !== "number" || isNaN(rate) || rate <= 0) {
      this.debugLog("Invalid parameters for playback rate change");
      return;
    }

    try {
      const sound = this.getValidatedSound(id);
      const source = sound.source;

      // Capture the position under the OLD rate before overwriting it. startTime
      // is an origin expressed in the previous rate, so reading the position back
      // afterwards mixed the new rate with an old baseline and made the sound
      // jump on every rate change.
      const previousRate = sound.playOptions?.playbackRate ?? 1;
      const rawPosition = sound.state === SoundState.Playing && sound.startTime !== undefined
        ? (this.context.currentTime - sound.startTime) * previousRate
        : (sound.pausedAt ?? 0);

      sound.playOptions = {
        ...sound.playOptions,
        playbackRate: rate,
      };

      if (!source) {
        this.debugLog(`No active source found for sound ${id}, playback rate not set`);
        return;
      }

      source.playbackRate.setValueAtTime(rate, this.context.currentTime);

      if (!skipDispatchEvent) {
        this.dispatchEvent({
          type: SoundEventsEnum.PLAYBACK_RATE_CHANGED,
          soundId: id,
          timestamp: this.context.currentTime,
          playbackRate: rate,
          sound
        });

        if (sound.state === SoundState.Playing) {
          // seek() converts UI time back to raw time using the new rate, so feed
          // it the captured raw position expressed in the new rate.
          this.seek(id, rawPosition / rate);
        }
      }
      this.debugLog(`Playback rate set for sound ${id}: ${rate}`);
    } catch (error) {
      this.handleError("setting playback rate", error, id);
    }
  }

  public getPlaybackRate(id: string): number {
    if (this.streams.has(id)) return this.streams.get(id)!.element.playbackRate;
    try {
      const sound = this.getValidatedSound(id);
      return sound?.source?.playbackRate?.value ?? sound?.playOptions?.playbackRate ?? this.config.defaultPlaybackRate ?? 1;
    } catch {
      return this.config.defaultPlaybackRate ?? 1;
    }
  }

  // End playback control-------------------------------------------------------------------------------------------------------------------

  // Reset operations ------------------------------------------------------------------------------------------------------------
  public reset(options: SoundResetOptions = {}): void {
    this.debugLog("Resetting sound manager with options:", options);

    this.stopAllSounds();

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

    if (options.unloadSounds) {
      this.sounds.forEach((_, id) => {
        this.resetSound(id, options);
      });
      // cleanup() clears the map and leaves the master chain intact, so the
      // manager stays usable and new sounds can be loaded afterwards.
      this.cleanup();
    } else {
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

    if (sound.panType === SoundPanType.Spatial) {
      this.resetSpatialPosition(id);
    } else {
      if (!options.keepPanning) {
        this.removePan(id);
      }
    }

    this.debugLog(`Resetting sound ${id} with options:`, options);

    if (sound.state === SoundState.Playing) {
      this.stop(id);
    }

    if (!options.keepSpatial && sound.panType === SoundPanType.Spatial) {
      this.removeSpatialEffect(id);

      sound.panSpatialPosition = { x: 0, y: 0, z: 0 };
      if (sound.playOptions) {
        sound.playOptions.panSpatialPosition = { x: 0, y: 0, z: 0 };
      }

      sound.panType = SoundPanType.Stereo;

      if (sound.source) {
        sound.source.disconnect();
        sound.source.connect(sound.gainNode);
      }
    }

    if (!options.keepPanning && sound.panType === SoundPanType.Stereo) {
      this.removePan(id);
    }

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
    if (this.streams.has(id)) return this.streams.get(id)!.gainNode;
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
    if (this.streams.has(id)) return true;
    return this.sounds.has(id) && this.sounds.get(id)?.buffer != null;
  }

  public updateSoundOptions(soundId: string, options: Partial<PlayOptions>): void {
    const sound = this.sounds.get(soundId);
    if (!sound) {
      this.debugLog(`Sound ${soundId} not found for updating options`);
      return;
    }

    sound.playOptions = { ...sound.playOptions, ...options };

    if (options.loop !== undefined) {
      sound.playOptions.loop = options.loop;
    }
    if (options.maxLoops !== undefined) {
      sound.playOptions.maxLoops = options.maxLoops;
      sound.currentLoopCount = 0;
    }

    this.debugLog(`Updated options for sound ${soundId}:`, options);

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
    if (this.streams.size) return this.sounds.size + this.streams.size;
    return this.sounds.size;
  }

  public resetAllCounters(): void {
    this.instanceCounters.clear();
    this.debugLog("All instance counters reset");
  }

  public getSoundIds(): string[] {
    if (this.streams.size) return [...this.sounds.keys(), ...this.streams.keys()];
    return Array.from(this.sounds.keys());
  }

  public setDebugMode(debug: boolean): void {
    this.config.debug = debug;
  }

  public getConfig(): Readonly<SoundHubConfig> {
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
    Array.from(this.streams.keys()).forEach((id) => this.streamUnload(id));
    try {
      this.cleanup();

      // Detach everything we attached to `document`, otherwise this instance and
      // its AudioContext stay reachable for the lifetime of the page.
      this.removeVisibilityHandling();
      this.removeContextResumeHandlers();
      this.removeUnlockListeners();
      this.cancelAutoSuspend();

      this.eventListeners.forEach((listeners) => listeners.clear());
      this.soundGroups.clear();
      this.activeFadeCallbacks.clear();

      // Unlike cleanup(), destroy() does dismantle the master chain
      this.masterLimiterNode?.disconnect();
      this.masterLimiterNode = null;
      this.masterStereoPanner.disconnect();
      this.masterGainNode.disconnect();

      this.context.close();
      this.debugLog("SoundHub destroyed");
    } catch (error) {
      this.handleError("destroying sound manager", error);
    }
  }

  // End utility methods ---------------------------------------------------------------------------------------------------------------

  // Event listeners -------------------------------------------------------------------------------------------------------------------

  /**
   * Listen for one kind of event.
   *
   * Without a filter you hear every sound, which means writing
   * `if (event.soundId !== 'x') return` at the top of the callback. The filter
   * does that for you. Use `{ soundId: 'music' }` for one sound, or
   * `{ originalId: 'laser' }` to catch every overlapping instance of it.
   *
   * Returns a function that removes this listener again, which is easier to
   * hold on to than reconstructing the same callback and filter for
   * removeEventListener.
   */
  public addEventListener(
    type: SoundEventsEnum,
    callback: (event: SoundEvent) => void,
    filter?: SoundEventFilter
  ): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }

    const listener: EventListener = { callback, filter };
    this.eventListeners.get(type)!.add(listener);

    return () => {
      this.eventListeners.get(type)?.delete(listener);
    };
  }

  /**
   * Listen for the next matching event and then stop listening.
   *
   * Handy for one-shot cases that would otherwise leak a listener, such as
   * waiting for a track to finish before starting the next one, or for a fade
   * to complete before tearing something down.
   */
  public once(
    type: SoundEventsEnum,
    callback: (event: SoundEvent) => void,
    filter?: SoundEventFilter
  ): () => void {
    const off = this.addEventListener(type, (event) => {
      off();
      callback(event);
    }, filter);

    return off;
  }

  /**
   * Compares two listener filters. JSON.stringify cannot be used here: a RegExp
   * serialises to "{}", so filters with different instancePattern values looked
   * identical and removing one listener removed the others too.
   */
  private filtersMatch(a?: SoundEventFilter, b?: SoundEventFilter): boolean {
    if (a === b) return true;
    if (!a || !b) return false;

    // soundId belongs here as much as the other three. Leaving it out made
    // removeEventListener treat { soundId: 'music' } and { soundId: 'rain' } as
    // the same listener, so removing one removed both.
    if (a.soundId !== b.soundId) return false;
    if (a.originalId !== b.originalId) return false;
    if (a.instanceId !== b.instanceId) return false;

    const patternA = a.instancePattern;
    const patternB = b.instancePattern;
    if (!patternA !== !patternB) return false;
    if (patternA && patternB) {
      return patternA.source === patternB.source && patternA.flags === patternB.flags;
    }

    return true;
  }

  public removeEventListener(
    type: SoundEventsEnum,
    callback: (event: SoundEvent) => void,
    filter?: SoundEventFilter
  ): void {
    const listeners = this.eventListeners.get(type);
    if (!listeners) return;

    listeners.forEach((listener) => {
      if (listener.callback === callback && this.filtersMatch(listener.filter, filter)) {
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
    // Keep the operating system's controls in step before the listeners run,
    // so a UI that reacts to the same event sees a lock screen that agrees.
    if (this.mediaSessionId && event.soundId === this.mediaSessionId) {
      this.updateMediaSessionState(this.mediaSessionId);
    }

    // Only the events that can change whether anything is playing. Progress
    // events fire every few milliseconds and must not walk the sound map.
    if (this.config.autoSuspend && SoundHub.PLAYBACK_STATE_EVENTS.has(event.type)) {
      this.updateAutoSuspend();
    }

    const listeners = this.eventListeners.get(event.type);
    if (!listeners) return;

    listeners.forEach(({ callback, filter }) => {
      if (filter) {
        if (filter.soundId && event.soundId !== filter.soundId) return;
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

  // Streaming ------------------------------------------------------------------------------------------------------
  //
  // Everything above this line decodes a whole file into an AudioBuffer. That
  // is what precise scheduling, sprites and instance stacking need, and it is
  // also why an hour-long recording is a bad fit: the decoded audio has to sit
  // in memory in full before the first sample plays.
  //
  // A stream is the other trade. An HTMLAudioElement does the fetching and
  // decoding as it goes, and MediaElementAudioSourceNode drops the result into
  // the same graph, so master volume, panning and the limiter still apply.
  // What you give up is anything that needs random access to samples: sprites,
  // overlapping instances of one id, and gapless looping.

  /**
   * Load a long audio file as a stream instead of a buffer.
   *
   * Use this for podcasts, audiobooks, radio and background music that runs
   * for an hour. Anywhere waiting for a full download and then holding the
   * decoded audio in memory would be wasteful.
   *
   * Playback, seeking, volume, fades, panning, playback rate, looping, state
   * and progress events all work the way they do for a buffered sound. Sprites
   * and `overlap` do not, because those need the samples in memory.
   */
  public async loadStream(id: string, url: string, options: StreamOptions = {}): Promise<void> {
    if (this.sounds.has(id) || this.streams.has(id)) {
      this.debugLog(`Sound with id ${id} already exists. Skipping.`);
      return;
    }

    const element = new Audio();
    element.preload = options.preload ?? "metadata";
    element.crossOrigin = this.config.crossOrigin ?? "anonymous";
    element.playbackRate = options.playbackRate ?? this.config.defaultPlaybackRate ?? 1;
    element.loop = options.loop ?? this.config.loopSounds ?? false;
    // The gain node carries the volume so fades and mute behave like they do
    // for buffered sounds. The element itself stays at full scale.
    element.volume = 1;

    try {
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          element.removeEventListener("loadedmetadata", onLoaded);
          element.removeEventListener("error", onError);
        };
        const onLoaded = () => { cleanup(); resolve(); };
        const onError = () => {
          cleanup();
          const message = element.error ? element.error.message : "unknown";
          reject(new Error(`Stream load error for ${id}: ${message}`));
        };
        element.addEventListener("loadedmetadata", onLoaded, { once: true });
        element.addEventListener("error", onError, { once: true });
        element.src = url;
        element.load();
      });
    } catch (error) {
      this.handleError("loading stream", error, id);
      throw error;
    }

    const gainNode = this.context.createGain();
    gainNode.gain.value = options.volume ?? this.config.defaultVolume ?? 1;

    const source = this.context.createMediaElementSource(element);
    const stereoPanner = this.context.createStereoPanner();
    stereoPanner.pan.value = options.pan ?? this.config.defaultPan ?? 0;

    source.connect(stereoPanner);
    stereoPanner.connect(gainNode);
    gainNode.connect(this.masterGainNode);

    const stream: StreamSound = {
      id,
      url,
      element,
      source,
      gainNode,
      stereoPanner,
      pannerNode: null,
      panType: SoundPanType.Stereo,
      panSpatialPosition: this.config.defaultPanSpatialPosition ?? { x: 0, y: 0, z: 0 },
      pan: options.pan ?? this.config.defaultPan ?? 0,
      volume: options.volume ?? this.config.defaultVolume ?? 1,
      isMuted: false,
      state: SoundState.Stopped,
      startOffset: options.startTime ?? this.config.defaultStartTime ?? 0,
      options,
      onEnded: () => {
        // A looping element never fires this, so reaching here always means done.
        stream.state = SoundState.Stopped;
        this.stopProgressTracking(id);
        this.dispatchEvent({
          type: SoundEventsEnum.ENDED,
          soundId: id,
          currentTime: element.currentTime,
          duration: this.streamDuration(stream),
          timestamp: this.context.currentTime,
        });
      },
      onError: () => {
        const message = element.error ? element.error.message : "unknown";
        this.lastError = new Error(`Stream error for ${id}: ${message}`);
        this.dispatchEvent({
          type: SoundEventsEnum.ERROR,
          soundId: id,
          error: this.lastError,
          timestamp: this.context.currentTime,
        });
      },
    };

    element.addEventListener("ended", stream.onEnded);
    element.addEventListener("error", stream.onError);

    this.streams.set(id, stream);
    this.debugLog(`Stream ${id} loaded (${this.streamDuration(stream).toFixed(1)}s)`);

    this.dispatchEvent({
      type: SoundEventsEnum.LOADED,
      soundId: id,
      timestamp: this.context.currentTime,
      duration: this.streamDuration(stream),
    });
  }

  /** Whether this id was loaded with loadStream rather than loadSound. */
  public isStream(id: string): boolean {
    return this.streams.has(id);
  }

  /**
   * The underlying media element, for the things only it can do: reading
   * `buffered` ranges to draw a loading bar, or setting Media Session metadata
   * so the lock screen shows the episode title.
   */
  public getStreamElement(id: string): HTMLAudioElement | undefined {
    return this.streams.get(id)?.element;
  }

  private streamDuration(stream: StreamSound): number {
    const duration = stream.element.duration;
    // Live streams report Infinity, and a file whose metadata has not landed
    // yet reports NaN. Neither is something a progress bar can divide by.
    return Number.isFinite(duration) ? duration : 0;
  }

  private streamPlay(id: string, options: StreamOptions = {}): void {
    const stream = this.streams.get(id);
    if (!stream) return;

    if (options.volume !== undefined) this.streamSetVolume(id, options.volume, true);
    if (options.pan !== undefined && stream.stereoPanner) {
      stream.pan = Math.max(-1, Math.min(1, options.pan));
      stream.stereoPanner.pan.value = stream.pan;
    }
    if (options.loop !== undefined) stream.element.loop = options.loop;
    if (options.playbackRate !== undefined) stream.element.playbackRate = options.playbackRate;

    const startAt = options.startTime ?? (stream.state === SoundState.Stopped ? stream.startOffset : undefined);
    if (startAt !== undefined) {
      stream.element.currentTime = startAt;
    }

    // Autoplay policies suspend the context until a gesture. Without this the
    // element would happily play into a graph that produces no sound.
    if (this.context.state === "suspended") void this.context.resume();

    void stream.element.play().catch((error: unknown) => {
      this.handleError("playing stream", error, id);
    });

    stream.state = SoundState.Playing;

    this.dispatchEvent({
      type: SoundEventsEnum.STARTED,
      soundId: id,
      currentTime: stream.element.currentTime,
      duration: this.streamDuration(stream),
      volume: stream.volume,
      timestamp: this.context.currentTime,
    });

    const track = options.trackProgress ?? stream.options.trackProgress ?? this.config.trackProgress ?? false;
    if (track) this.startProgressTracking(id);
  }

  private streamPause(id: string, skipDispatchEvent = false): void {
    const stream = this.streams.get(id);
    if (!stream || stream.state !== SoundState.Playing) return;

    stream.element.pause();
    stream.state = SoundState.Paused;
    this.stopProgressTracking(id);

    if (!skipDispatchEvent) {
      this.dispatchEvent({
        type: SoundEventsEnum.PAUSED,
        soundId: id,
        currentTime: stream.element.currentTime,
        duration: this.streamDuration(stream),
        timestamp: this.context.currentTime,
      });
    }
  }

  private streamResume(id: string, skipDispatchEvent = false): void {
    const stream = this.streams.get(id);
    if (!stream || stream.state !== SoundState.Paused) return;

    if (this.context.state === "suspended") void this.context.resume();
    void stream.element.play().catch((error: unknown) => {
      this.handleError("resuming stream", error, id);
    });
    stream.state = SoundState.Playing;

    if (!skipDispatchEvent) {
      this.dispatchEvent({
        type: SoundEventsEnum.RESUMED,
        soundId: id,
        currentTime: stream.element.currentTime,
        duration: this.streamDuration(stream),
        timestamp: this.context.currentTime,
      });
    }

    const track = stream.options.trackProgress ?? this.config.trackProgress ?? false;
    if (track) this.startProgressTracking(id);
  }

  private streamStop(id: string, skipDispatchEvent = false): void {
    const stream = this.streams.get(id);
    if (!stream) return;

    stream.element.pause();
    stream.element.currentTime = stream.startOffset;
    stream.state = SoundState.Stopped;
    this.stopProgressTracking(id);

    if (!skipDispatchEvent) {
      this.dispatchEvent({
        type: SoundEventsEnum.STOPPED,
        soundId: id,
        currentTime: stream.element.currentTime,
        duration: this.streamDuration(stream),
        timestamp: this.context.currentTime,
      });
    }
  }

  private streamSeek(id: string, time: number, skipDispatchEvent = false): void {
    const stream = this.streams.get(id);
    if (!stream) return;

    const duration = this.streamDuration(stream);
    stream.element.currentTime = duration ? Math.max(0, Math.min(time, duration)) : Math.max(0, time);

    if (!skipDispatchEvent) {
      this.dispatchEvent({
        type: SoundEventsEnum.SEEKED,
        soundId: id,
        currentTime: stream.element.currentTime,
        duration,
        timestamp: this.context.currentTime,
      });
    }
  }

  private streamSetVolume(id: string, volume: number, skipDispatchEvent = false): void {
    const stream = this.streams.get(id);
    if (!stream) return;

    stream.volume = this.setValidatedVolume(volume);
    stream.isMuted = stream.volume === 0;
    stream.gainNode.gain.setValueAtTime(stream.volume, this.context.currentTime);

    if (!skipDispatchEvent) {
      this.dispatchEvent({
        type: SoundEventsEnum.VOLUME_CHANGED,
        soundId: id,
        volume: stream.volume,
        timestamp: this.context.currentTime,
      });
    }
  }

  private streamFade(id: string, duration: number, from: number, to: number, stopAfter: boolean): void {
    const stream = this.streams.get(id);
    if (!stream) return;

    const now = this.context.currentTime;
    const gain = stream.gainNode.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(this.setValidatedVolume(from), now);
    gain.linearRampToValueAtTime(this.setValidatedVolume(to), now + Math.max(0.001, duration));
    stream.volume = this.setValidatedVolume(to);

    window.setTimeout(() => {
      if (!this.streams.has(id)) return;
      if (stopAfter) this.streamStop(id);
      this.dispatchEvent({
        type: to > from ? SoundEventsEnum.FADE_IN_COMPLETED : SoundEventsEnum.FADE_OUT_COMPLETED,
        soundId: id,
        volume: to,
        timestamp: this.context.currentTime,
      });
    }, duration * 1000);
  }

  private streamState(id: string): SoundStateInfo {
    const stream = this.streams.get(id)!;
    const duration = this.streamDuration(stream);
    const currentTime = stream.element.currentTime;

    return {
      progress: duration ? currentTime / duration : 0,
      startTime: stream.startOffset,
      currentTime,
      elapsedTime: currentTime,
      adjustedElapsedTime: currentTime,
      duration,
      rawDuration: duration || null,
      playbackRate: stream.element.playbackRate,
      state: stream.state,
      volume: stream.volume,
      pan: stream.pan,
      panSpatialPosition: stream.panSpatialPosition,
    };
  }

  private streamUnload(id: string): void {
    const stream = this.streams.get(id);
    if (!stream) return;

    if (this.mediaSessionId === id) this.clearMediaSession();

    this.stopProgressTracking(id);
    stream.element.removeEventListener("ended", stream.onEnded);
    stream.element.removeEventListener("error", stream.onError);
    stream.element.pause();

    try {
      stream.source.disconnect();
      stream.stereoPanner?.disconnect();
      stream.pannerNode?.disconnect();
      stream.gainNode.disconnect();
    } catch {
      // Already disconnected; nothing to clean up.
    }

    // Clearing src stops the browser from carrying on with the download.
    stream.element.removeAttribute("src");
    stream.element.load();

    this.streams.delete(id);
    this.dispatchEvent({
      type: SoundEventsEnum.UNLOADED,
      soundId: id,
      timestamp: this.context.currentTime,
    });
  }

  // Media Session --------------------------------------------------------------------------------------------------

  /**
   * Hand one sound to the operating system's media controls.
   *
   * This puts an episode title on a phone's lock screen, draws the artwork,
   * and makes the play/pause key on a keyboard and the buttons on a headset do
   * the right thing. Listeners expect a long recording to behave like a podcast
   * player, and without this they get a silent notification and dead buttons.
   *
   * Works for a streamed sound and a buffered one alike. Call it again with
   * different metadata when the track changes, and clearMediaSession() when
   * playback is done.
   */
  public setMediaSession(id: string, info: MediaSessionInfo = {}): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      this.debugLog("Media Session is not supported in this browser");
      return;
    }

    const session = navigator.mediaSession;
    this.mediaSessionId = id;

    if (info.title || info.artist || info.album || info.artwork) {
      session.metadata = new MediaMetadata({
        title: info.title ?? "",
        artist: info.artist ?? "",
        album: info.album ?? "",
        artwork: info.artwork ?? [],
      });
    }

    const back = info.seekBackwardOffset ?? 15;
    const forward = info.seekForwardOffset ?? 30;

    // A handler set to null takes the button off the lock screen, which is why
    // previoustrack and nexttrack are only wired when the caller supplies them.
    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ["play", () => { this.isPaused(id) ? this.resume(id) : this.play(id); }],
      ["pause", () => this.pause(id)],
      ["stop", () => this.stop(id)],
      ["seekbackward", (details) => {
        const offset = details.seekOffset ?? back;
        this.seek(id, Math.max(0, this.getCurrentTime(id) - offset));
      }],
      ["seekforward", (details) => {
        const offset = details.seekOffset ?? forward;
        this.seek(id, this.getCurrentTime(id) + offset);
      }],
      ["seekto", (details) => {
        if (details.seekTime !== undefined) this.seek(id, details.seekTime);
      }],
      ["previoustrack", info.onPreviousTrack ?? null],
      ["nexttrack", info.onNextTrack ?? null],
    ];

    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Not every browser implements every action; an unknown one throws.
      }
    }

    this.updateMediaSessionState(id);
  }

  /** Take this sound off the operating system's media controls. */
  public clearMediaSession(): void {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    const session = navigator.mediaSession;
    const actions: MediaSessionAction[] = [
      "play", "pause", "stop", "seekbackward", "seekforward", "seekto", "previoustrack", "nexttrack",
    ];
    for (const action of actions) {
      try {
        session.setActionHandler(action, null);
      } catch {
        // See above.
      }
    }

    session.metadata = null;
    session.playbackState = "none";
    this.mediaSessionId = null;
  }

  /**
   * Keeps the lock screen in step. Decides whether it shows a play or a pause
   * button, and where the scrubber sits.
   */
  private updateMediaSessionState(id: string): void {
    if (this.mediaSessionId !== id) return;
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    const session = navigator.mediaSession;
    session.playbackState = this.isPlaying(id) ? "playing" : this.isPaused(id) ? "paused" : "none";

    const duration = this.getDuration(id);
    if (!duration || !session.setPositionState) return;

    try {
      session.setPositionState({
        duration,
        playbackRate: this.getPlaybackRate(id) || 1,
        // A position past the duration throws, and rounding at the end of a
        // track is enough to get there.
        position: Math.min(this.getCurrentTime(id), duration),
      });
    } catch {
      // Metadata not settled yet; the next progress tick will get it.
    }
  }

  // End Media Session ----------------------------------------------------------------------------------------------

  // End streaming --------------------------------------------------------------------------------------------------

  public getVersion(): string {
    return this.VERSION;
  }

  private showConsoleInfo(): void {
    console.info(
      `%csoundhub.js %cv${this.VERSION}\n` +
      `%c© Chris Schardijn\n` +
      `%cDemo:      https://soundhub.chriscreativecode.com/\n` +
      `Docs:      https://soundhub-docs.chriscreativecode.com/\n` +
      `GitHub:    https://github.com/chriscreativecode/soundhub\n` +
      `npm:       https://www.npmjs.com/package/soundhub\n` +
      `Portfolio: https://www.chriscreativecode.com/`,
      "font-family: monospace; font-size: 15px; font-weight: bold; color: #2296F3;",
      "font-family: monospace; font-size: 13px; color: #888;",
      "font-family: monospace; font-size: 12px; color: #888;",
      "font-family: monospace; font-size: 12px; line-height: 1.6;"
    );
  }

}
