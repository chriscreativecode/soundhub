import { PlaySoundOptions } from "./play-sound-options.interface";
import { DEFAULT_CONFIG, SoundManagerConfig } from "./sound-manager-config";
import { SoundManagerInterface } from "./sound-manager.interface";
import { SoundStateInfo } from "./sound-state-info.interface";
import { SoundState } from "./sound-state.interface";
import { Sound } from "./sound.interface";

export class SoundManager implements SoundManagerInterface {
  private readonly config: SoundManagerConfig;
  private readonly context: AudioContext;
  private sounds: Map<string, Sound> = new Map();
  private masterGainNode: GainNode;
  private previousGlobalVolume: number = 1;
  private isMuted: boolean = false;

  constructor(config: SoundManagerConfig = {}) {
    // Validate config values
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

  /**
   * Sets the 3D position of a sound in space
   * @param soundId The ID of the sound to position
   * @param x X coordinate in 3D space
   * @param y Y coordinate in 3D space
   * @param z Z coordinate in 3D space
   */
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
            isPlaying: false,
            isPaused: false,
            volume: this.config.defaultVolume!,
            currentLoopCount: 0, // Required property initialized to 0
            loopCount: undefined, // Optional property
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

  private setupLooping(
    source: AudioBufferSourceNode,
    sound: Sound,
    options: PlaySoundOptions
  ): void {
    const shouldLoop = options.loop ?? false;
    const requestedLoopCount = options.loopCount ?? 0;

    // Reset loop counter
    sound.currentLoopCount = 0;
    sound.loopCount = requestedLoopCount;

    this.debugLog("Setting up loop with:", {
      shouldLoop,
      requestedLoopCount,
      soundId: sound.id,
    });

    if (shouldLoop && requestedLoopCount > 0) {
      // For finite loops
      source.loop = false;

      const handleLoop = () => {
        sound.currentLoopCount++;
        this.debugLog(
          `Loop completed: ${sound.currentLoopCount} of ${requestedLoopCount}`
        );

        if (sound.currentLoopCount < requestedLoopCount) {
          // Create and start new source for next iteration
          const newSource = this.context.createBufferSource();
          newSource.buffer = sound.buffer;

          // Connect the new source
          if (sound.stereoPanner) {
            newSource.connect(sound.gainNode);
          } else {
            newSource.connect(sound.gainNode);
          }

          // Set up the same onended handler
          newSource.onended = handleLoop;

          // Replace old source
          sound.sources = [newSource];

          // Start the new iteration immediately
          newSource.start(0);
          sound.startTime = this.context.currentTime;

          this.debugLog(`Started loop iteration ${sound.currentLoopCount + 1}`);
        } else {
          this.debugLog("All loops completed, stopping sound");
          this.stopSound(sound.id);
        }
      };

      // Set up the initial onended handler
      source.onended = handleLoop;
    } else if (shouldLoop) {
      // Infinite loop
      source.loop = true;
      this.debugLog("Set up infinite loop");
    } else {
      // No looping
      source.loop = false;
      this.debugLog("No loop requested");
    }
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

  public async playSound(
    id: string,
    options: PlaySoundOptions = {}
  ): Promise<void> {
    try {
      await this.ensureContext();
      const sound = this.validateSound(id);

      // Stop existing playback
      if (sound.isPlaying) {
        sound.sources.forEach((source) => source.stop());
        sound.sources = [];
      }

      const source = this.context.createBufferSource();
      source.buffer = sound.buffer;

      // Connect source to the first node in the chain
      if (options.pan !== undefined) {
        this.setupStereoPan(sound, options.pan);
        source.connect(sound.gainNode);
      } else {
        source.connect(sound.gainNode);
      }

      // Setup looping before starting playback
      this.setupLooping(source, sound, options);

      // Handle volume and fade-in
      const targetVolume =
        options.volume !== undefined
          ? this.setValidatedVolume(options.volume)
          : sound.volume;

      if (options.fadeIn) {
        sound.gainNode.gain.setValueAtTime(0, this.context.currentTime);
        sound.gainNode.gain.linearRampToValueAtTime(
          targetVolume,
          this.context.currentTime + options.fadeIn / 1000
        );
      } else {
        sound.gainNode.gain.setValueAtTime(
          targetVolume,
          this.context.currentTime
        );
      }

      // Start playback
      sound.sources = [source];
      this.updateSoundState(sound, SoundState.Playing);
      sound.startTime = this.context.currentTime;
      sound.pausedAt = 0;

      // Start playback from specified time if provided
      const startTime = options.startTime || 0;
      source.start(0, startTime);
      sound.startTime = this.context.currentTime - startTime;

      return new Promise<void>((resolve) => {
        if (!options.loop) {
          source.onended = () => {
            if (!sound.isPaused) {
              this.cleanupSource(sound, source);
            }
            resolve();
          };
        }
      });
    } catch (error) {
      this.handleError("playing sound", error, id);
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

  public async fadeOut(
    id: string,
    duration: number = this.config.fadeOutDuration!
  ): Promise<void> {
    try {
      const sound = this.validateSound(id);
      if (!sound.isPlaying) return;

      // Store current volume
      const currentVolume = sound.gainNode.gain.value;

      // Start fade from current volume
      sound.gainNode.gain.setValueAtTime(
        currentVolume,
        this.context.currentTime
      );

      // Ramp to zero
      sound.gainNode.gain.linearRampToValueAtTime(
        0,
        this.context.currentTime + duration / 1000
      );

      // Wait for fade to complete
      await new Promise((resolve) => setTimeout(resolve, duration));

      // Stop the sound after fade
      this.stopSound(id);

      // Reset gain to original volume for next play
      sound.gainNode.gain.setValueAtTime(
        sound.volume,
        this.context.currentTime
      );

      this.debugLog(`Fade out complete for sound ${id}`);
    } catch (error) {
      this.handleError("fading out sound", error, id);
    }
  }

  public seekTo(id: string, time: number): void {
    try {
      const sound = this.validateSound(id);
      const duration = sound.buffer.duration;

      // Clamp time value between 0 and duration
      const clampedTime = Math.max(0, Math.min(time, duration));

      // If sound is playing, stop current playback and start from new position
      if (sound.isPlaying) {
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
      } else if (sound.isPaused) {
        // If paused, just update the pausedAt time
        sound.pausedAt = clampedTime;
      }

      this.debugLog(`Seeked sound ${id} to ${clampedTime}s`);
    } catch (error) {
      this.handleError("seeking sound", error, id);
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

      this.debugLog("Pause state:", {
        id,
        isPlaying: sound.isPlaying,
        isPaused: sound.isPaused,
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

  // You can remove the old fadeIn and fadeOut methods if they're no longer needed

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

      // Stop and disconnect all sources
      sound.sources.forEach((source) => {
        source.stop();
        source.disconnect();
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
      const validatedVolume = this.setValidatedVolume(volume);
      sound.volume = validatedVolume;
      sound.gainNode.gain.setValueAtTime(
        validatedVolume,
        this.context.currentTime
      );
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
    this.sounds.forEach((sound) => {
      if (sound.pannerNode) {
        sound.pannerNode.disconnect();
      }
    });
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
   * Gets the current sound
   * @param id The ID of the sound
   * @returns Object containing sound or null if not found
   */
  public getSound(id: string): Sound | undefined {
    return this.sounds.get(id);
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

    // Calculate current position
    let currentTime = 0;
    if (sound.isPlaying) {
      currentTime = this.context.currentTime - sound.startTime;
    } else if (sound.isPaused) {
      currentTime = sound.pausedAt;
    }

    this.debugLog("Get sound state:", {
      id,
      isPaused: sound.isPaused,
      isPlaying: sound.isPlaying,
      reportedState: state,
      currentTime,
    });

    return {
      state,
      volume: sound.volume,
      duration: sound.buffer?.duration ?? null,
      currentTime,
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
    const context = id ? ` (Sound ID: ${id})` : "";
    const message = `[SoundManager] Error ${operation}${context}: ${errorMessage}`;

    if (this.config.debug) {
      console.error(message, error);
    } else {
      console.error(message);
    }

    throw new Error(message);
  }
}
