import { PlayOptions } from "./play-sound-options.interface";
import { SoundEvent } from "./sound-event.interface";
import { SoundEventsEnum } from "./sound-events.enum";
import { SoundGroup } from "./sound-group";
import { SoundHubConfig } from "./sound-hub-config";
import { SoundPannerConfig } from "./sound-panner-config";
import { SoundResetOptions } from "./sound-reset-options.interface";
import { SoundStateInfo } from "./sound-state-info.interface";
import { Sound } from "./sound.interface";
import { SoundLoadState } from "./sound-load-state";
import { StreamOptions } from "./stream-sound";
import { MediaSessionInfo, SoundEventFilter } from "./sound-event-filter";

export interface SoundHubInterface {
  // Playback control: Manage the playback of sounds, including play, pause, resume, stop, and seek operations.
  /* Play a sound by its ID. Optionally, provide PlayOptions to customize playback behavior. */
  play(id: string, options?: PlayOptions, skipDispatchEvent?: boolean): Sound | undefined;
  /* Play a specific sprite from a sound by its ID and sprite key. Optionally, provide PlayOptions for customization. */
  playSprite(id: string, spriteKey: string, options?: PlayOptions, skipDispatchEvent?: boolean): void;
  /* Pause a sound by its ID. Optionally, skip dispatching the pause event. */
  pause(id: string, skipDispatchEvent?: boolean): void;
  /* Resume a paused sound by its ID. Optionally, skip dispatching the resume event. */
  resume(id: string, skipDispatchEvent?: boolean): void;
  /* Stop a sound by its ID. Optionally, skip dispatching the stop event. */
  stop(id: string, skipDispatchEvent?: boolean): void;
  /* Seek to a specific time in a sound by its ID. Optionally, skip dispatching the seek event. */
  seek(id: string, time: number, skipDispatchEvent?: boolean): void;

  // Multiple playback control: Control playback for all sounds simultaneously.
  /* Stop all currently playing sounds. */
  stopAllSounds(): void;
  /* Pause all currently playing sounds. */
  pauseAllSounds(): void;
  /* Resume all paused sounds. */
  resumeAllSounds(): void;

  // Fading: Apply fade-in and fade-out effects to sounds or the global volume.
  /* Fade in a sound by its ID over a specified duration. Optionally, set start and end volumes. */
  fadeIn(id: string, duration: number, startVolume?: number, endVolume?: number, skipDispatchEvent?: boolean): void;
  /* Fade out a sound by its ID over a specified duration. Optionally, set start and end volumes, and stop the sound after fading. */
  fadeOut(id: string, duration?: number, startVolume?: number, endVolume?: number, stopAfterFade?: boolean, skipDispatchEvent?: boolean): void;
  /* Fade in the global volume over a specified duration. Optionally, set start and end volumes. */
  fadeGlobalIn(duration?: number, startVolume?: number, endVolume?: number): void;
  /* Fade out the global volume over a specified duration. Optionally, set start and end volumes. */
  fadeGlobalOut(duration?: number, startVolume?: number, endVolume?: number): void;

  // Volume control: Manage the volume of individual sounds or the global volume.
  /* Get the current volume of a sound by its ID. */
  getVolume(id: string): number;
  /* Set the volume of a sound by its ID. Optionally, skip dispatching the volume change event. */
  setSoundVolume(id: string, volume: number, skipDispatchEvent?: boolean): void;
  /* Get the current volume of a sound by its ID. */
  getSoundVolume(id: string): number;
  /* Set the global volume for all sounds. */
  setGlobalVolume(volume: number): void;
  /* Get the current global volume. */
  getGlobalVolume(): number;

  // Mute control: Mute or unmute individual sounds or all sounds globally.
  /* Mute all sounds. */
  muteAllSounds(): void;
  /* Unmute all sounds. */
  unmuteAllSounds(): void;
  /* Mute a specific sound by its ID. */
  mute(id: string): void;
  /* Unmute a specific sound by its ID. */
  unmute(id: string): void;
  /* Toggle the mute state of a specific sound by its ID. */
  toggleMute(id: string): void;
  /* Toggle the global mute state for all sounds. */
  toggleGlobalMute(): void;

  // Loop control: Control looping behavior for individual sounds.
  /* Set the loop state of a sound by its ID. Optionally, specify the maximum number of loops. */
  setLoop(id: string, loop: boolean, maxLoops?: number): void;
  /* Get the loop state of a sound by its ID. */
  getLoop(id: string): boolean;

  // Sound loading and management: Load, update, and manage sounds in the sound manager.
  /* Load multiple sounds from an array of sound configurations. Pass an array of urls
     for one sound to let the browser pick the format it supports. */
  loadSounds(soundsToLoad: { id: string; url: string | string[] }[], signal?: AbortSignal): Promise<void>;
  /* Load a single sound. The url may be a list of alternatives, and may be left out
     entirely for a sound that was registered with registerSound. */
  loadSound(id: string, url?: string | string[], signal?: AbortSignal): Promise<void>;
  /* Record where a sound lives without fetching it. Load it later with loadSound(id). */
  registerSound(id: string, url: string | string[]): void;
  /* registerSound for a whole list at once. */
  registerSounds(soundsToRegister: { id: string; url: string | string[] }[]): void;
  /* Where a sound is in the loading process: unloaded, loading, loaded or error. */
  getLoadState(id: string): SoundLoadState;
  /* The urls a sound was registered or loaded with. */
  getSoundUrls(id: string): string[];
  /* Whether this browser can play a format, by extension: canPlay('opus'). */
  canPlay(format: string): boolean;
  /* Every extension this browser accepts. */
  getSupportedFormats(): string[];
  /* Update the URL of a sound by its ID. */
  updateSoundUrl(id: string, newUrl: string): Promise<void>;
  /* Unload a sound by its ID, freeing up resources. */
  unloadSound(id: string): void;
  /* Remove a sound by its ID, stopping it and freeing up resources. */
  removeSound(id: string): void;
  /* Check if a sound is loaded by its ID. */
  isSoundLoaded(id: string): boolean;

  // Group management: Create and manage sound groups to control multiple sounds collectively.
  /* Create a new sound group with a specified name and options. */
  createSoundGroup(groupName: string, options?: { maxInstances?: number; playOptions?: PlayOptions }): void;
  /* Add a sound to a group by its ID and the group name. */
  addToSoundGroup(groupName: string, soundId: string): void;
  /* Remove a sound from a group by its ID and the group name. */
  removeFromSoundGroup(groupName: string, soundId: string): void;
  /* Get a sound group by its name. */
  getGroup(groupName: string): SoundGroup | undefined;
  /* Remove a sound group by its name, stopping all sounds in the group. */
  removeSoundGroup(groupName: string): void;

  // Sprite logic: Create and manage sprites from a sound by defining start and end timestamps in seconds.
  /* Set a sprite configuration for a sound by its ID. Define start and end timestamps for each sprite. */
  setSoundSprite(id: string, sprite: { [key: string]: [number, number] }): void;
  /* Get the sprite configuration for a sound by its ID. */
  getSpriteConfig(id: string): { [key: string]: [number, number] } | undefined;
  /* Remove a specific sprite sound by its key. */
  removeSpriteSound(id: string): void;
  /* Remove the sprite configuration for a sound by its ID. */
  removeSpriteConfig(id: string): void;

  // Streaming: load long files as a stream instead of decoding them into memory.
  /* Load a long audio file (podcast, audiobook, radio, a full album track) as a stream.
     Playback, seeking, volume, fades, panning, playback rate, looping, state and progress
     all behave as they do for a buffered sound; sprites and overlap do not apply. */
  loadStream(id: string, url: string, options?: StreamOptions): Promise<void>;
  /* Whether this id was loaded with loadStream rather than loadSound. */
  isStream(id: string): boolean;
  /* The underlying media element, for buffered ranges or Media Session metadata. */
  getStreamElement(id: string): HTMLAudioElement | undefined;

  // Media Session: hand a sound to the operating system's media controls.
  /* Put this sound on the lock screen and wire up the hardware media keys. */
  setMediaSession(id: string, info?: MediaSessionInfo): void;
  /* Take the current sound off the operating system's media controls. */
  clearMediaSession(): void;

  // Context management: Manage the audio context, including suspending and resuming audio processing.
  /* Suspend the audio context, pausing all audio processing. */
  suspendContext(): Promise<void>;
  /* Resume the audio context, restarting audio processing. */
  resumeContext(): Promise<void>;
  /* Get the current audio context. */
  getContext(): AudioContext;
  /* Get the master output audio node for external connections (e.g. AnalyserNode). */
  getMasterOutput(): AudioNode;
  /* Get the entry point of the master chain, to route your own audio sources through master volume, mute, panning and the limiter. */
  getMasterInput(): AudioNode;

  // Master limiter: prevents clipping when many sounds play at the same time.
  /* Enable or disable the master limiter at runtime. */
  setMasterLimiter(enabled: boolean): void;
  /* Whether the master limiter is currently active. */
  isMasterLimiterEnabled(): boolean;
  /* The live limiter node for fine-tuning, or null when disabled. */
  getMasterLimiterNode(): DynamicsCompressorNode | null;

  // State checks: Check the current state of a sound, such as playing, paused, or stopped.
  /* Check if a sound is currently playing by its ID. */
  isPlaying(id: string): boolean;
  /* Check if a sound is currently paused by its ID. */
  isPaused(id: string): boolean;
  /* Check if a sound is currently stopped by its ID. */
  isStopped(id: string): boolean;
  /* Get the current state information of a sound by its ID. */
  getSoundState(id: string): SoundStateInfo;
  /* Get the current playback time of a sound by its ID. */
  getCurrentTime(id: string): number;

  // Progress tracking: Track and manage the playback progress of sounds.
  /* Get the current playback time of a sound by its ID. */
  getCurrentTime(id: string): number;
  /* Get the total duration of a sound by its ID. */
  getDuration(id: string): number;
  /* Get the playback progress of a sound as a ratio (0-1) by its ID. */
  getProgress(id: string): number;
  /* Get the playback progress of a sound as a percentage (0-100) by its ID. */
  getProgressPercentage(id: string): number;
  /* Start tracking the playback progress of a sound by its ID. */
  startProgressTracking(id: string): void;
  /* Stop tracking the playback progress of a sound by its ID. */
  stopProgressTracking(id: string): void;
  /* Set the interval for progress tracking updates. */
  setProgressUpdateInterval(interval: number): void;

  // Pan control: Manage stereo panning for individual sounds or globally.
  /* Set the stereo pan of a sound by its ID. Valid values range from -1 (left) to 1 (right). */
  setPan(id: string, pan: number): void;
  /* Remove the stereo pan effect from a sound by its ID. */
  removePan(id: string): void;
  /* Set the global stereo pan for all sounds. Valid values range from -1 (left) to 1 (right). */
  setGlobalPan(value: number): void;
  /* Get the current global stereo pan value. */
  getGlobalPan(): number;
  /* Reset the stereo pan of a sound by its ID. If no ID is provided, reset the global pan. */
  resetPan(id?: string): void;
  /* Reset the global stereo pan to the center (0). */
  resetGlobalPan(): void;
  /* Clean up the global pan configuration. */
  cleanupGlobalPan(): void;
  /* Check if stereo panning is active for a sound by its ID. */
  isStereoPanActive(id: string): boolean;

  // Spatial audio: Manage 3D spatial audio effects for sounds.
  /* Check if spatial audio is enabled. */
  isSpatialAudioEnabled(): boolean;
  /* Check if spatial audio is supported by the current environment. */
  isSpatialAudioSupported(): boolean;
  /* Set the spatial position of a sound by its ID. Optionally, provide a SoundPannerConfig and skip dispatching the event. */
  setSpatialPosition(x: number, y: number, z: number, soundId?: string | null, soundPannerConfig?: SoundPannerConfig, skipDispatchEvent?: boolean): void;
  /* Get the spatial position of a sound by its ID. */
  getSpatialPosition(soundId: string): { x: number; y: number; z: number } | null;
  /* Set the master spatial position for all sounds. Optionally, provide a SoundPannerConfig and skip dispatching the event. */
  setMasterSpatialPosition(x: number, y: number, z: number, config?: SoundPannerConfig, skipDispatchEvent?: boolean): void;
  /* Get the master spatial position. */
  getMasterSpatialPosition(): { x: number; y: number; z: number } | null;
  /* Remove the spatial effect from a sound by its ID. */
  removeSpatialEffect(id: string): void;
  /* Check if spatial audio is active for a sound by its ID. */
  isSpatialAudioActive(id: string): boolean;
  /* Update the panner configuration for a sound by its ID. */
  updatePannerConfigById(soundId: string, newConfig: Partial<SoundPannerConfig>): void;
  /* Reset the spatial position of a sound by its ID. */
  resetSpatialPosition(id?: string): void;
  /* Reset the master spatial position to the default (0, 0, 0). */
  resetMasterSpatialPosition(): void;
  /* Point a sound in a direction. Works together with the cone settings on the panner config. */
  setSpatialOrientation(soundId: string, x: number, y: number, z: number, skipDispatchEvent?: boolean): void;
  /* The direction a sound points in. */
  getSpatialOrientation(soundId: string): { x: number; y: number; z: number } | null;
  /* Point the master panner in a direction. */
  setMasterSpatialOrientation(x: number, y: number, z: number, skipDispatchEvent?: boolean): void;
  /* The direction the master panner points in. */
  getMasterSpatialOrientation(): { x: number; y: number; z: number };

  // Listener: the ear in the scene. Move this instead of the sounds for a first-person camera.
  /* Move the listener. Every spatial sound is heard from here. */
  setListenerPosition(x: number, y: number, z: number, skipDispatchEvent?: boolean): void;
  /* The current listener position. */
  getListenerPosition(): { x: number; y: number; z: number };
  /* Point the listener. Forward is where the head looks, up is which way is up. */
  setListenerOrientation(forwardX: number, forwardY: number, forwardZ: number, upX?: number, upY?: number, upZ?: number, skipDispatchEvent?: boolean): void;
  /* The current listener orientation. */
  getListenerOrientation(): { forward: { x: number; y: number; z: number }; up: { x: number; y: number; z: number } };
  /* Put the listener back at the centre, looking down negative z. */
  resetListener(): void;

  // Playback rate control: Control the playback speed of sounds.
  /* Set the playback rate of a sound by its ID. */
  setPlaybackRate(id: string, rate: number): void;
  /* Get the playback rate of a sound by its ID. */
  getPlaybackRate(id: string): number;

  // Reset operations: Reset sounds or the entire sound manager to their initial state.
  /* Reset the sound manager to its initial state. Optionally, provide SoundResetOptions to customize the reset behavior. */
  reset(options?: SoundResetOptions): void;
  /* Reset a specific sound by its ID. Optionally, provide SoundResetOptions to customize the reset behavior. */
  resetSound(id: string, options?: SoundResetOptions): void;

  // Sound / Buffer / Source / GainNode retrieval: Retrieve audio-related objects for a sound.
  /* Get the sound object by its ID. */
  getSound(id: string): Sound | undefined;
  /* Get the audio buffer of a sound by its ID. */
  getBuffer(id: string): AudioBuffer | undefined;
  /* Get the audio source node of a sound by its ID. */
  getSource(id: string): AudioBufferSourceNode | undefined;
  /* Get the gain node of a sound by its ID. */
  getGainNode(id: string): GainNode | undefined;

  // Utilities: Utility methods for managing the sound manager and its state.
  /* Check if a sound exists by its ID. */
  hasSound(id: string): boolean;
  /* Update the play options of a sound by its ID. */
  updateSoundOptions(soundId: string, options: Partial<PlayOptions>): void;
  /* Check if the sound manager is ready (context is running and sounds are loaded). */
  isReady(): boolean;
  /* Get the total number of sounds currently loaded. */
  getSoundCount(): number;
  /* Get the IDs of all currently loaded sounds. */
  getSoundIds(): string[];
  /* Enable or disable debug mode. */
  setDebugMode(debug: boolean): void;
  /* Get the current configuration of the sound manager. */
  getConfig(): Readonly<SoundHubConfig>;
  /* Get the last error that occurred in the sound manager. */
  getLastError(): Error | null;
  /* Round a number to a specified number of decimal places. Default precision is DEFAULT_PRECISION */
  roundValue(value: number, decimals: number): number;
  /* Destroy the sound manager, freeing up all resources. */
  destroy(): void;

  // Listeners / Event handling: Manage event listeners for sound-related events.
  /* Add an event listener for a specific SoundEventsEnum type. The optional filter narrows
     which sounds you hear: { soundId } for one sound, { originalId } for every instance of it.
     Returns a function that removes the listener again. */
  addEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void, filter?: SoundEventFilter): () => void;
  /* Listen for the next matching event and then stop listening. Returns a function that
     cancels the listener before it has fired. */
  once(type: SoundEventsEnum, callback: (event: SoundEvent) => void, filter?: SoundEventFilter): () => void;
  /* Remove an event listener for a specific SoundEventsEnum type. Pass the same filter it was added with. */
  removeEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void, filter?: SoundEventFilter): void;
  /* Remove all event listeners associated with a specific instance ID. */
  removeEventListenersForInstance(instanceId: string): void;
  /* Dispatch a custom event to all registered listeners. */
  dispatchEvent(event: SoundEvent): void;
  /* Check if there are any event listeners for a specific SoundEventsEnum type. */
  hasEventListener(type: SoundEventsEnum): boolean;
}