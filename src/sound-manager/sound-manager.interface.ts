import { PlayOptions } from "./play-sound-options.interface";
import { SoundEvent } from "./sound-event.interface";
import { SoundEventsEnum } from "./sound-events.enum";
import { SoundGroup } from "./sound-group";
import { SoundManagerConfig } from "./sound-manager-config";
import { SoundPannerConfig } from "./sound-panner-config";
import { SoundResetOptions } from "./sound-reset-options.interface";
import { SoundStateInfo } from "./sound-state-info.interface";
import { Sound } from "./sound.interface";

export interface SoundManagerInterface {
  // Playback control
  play(id: string, options?: PlayOptions, skipDispatchEvent?: boolean): void;
  playSprite(id: string, spriteKey: string, options: PlayOptions, skipDispatchEvent?: boolean): void
  pause(id: string, skipDispatchEvent?: boolean): void;
  resume(id: string, skipDispatchEvent?: boolean): void;
  stop(id: string, skipDispatchEvent?: boolean): void;
  seek(id: string, time: number, skipDispatchEvent?: boolean): void;

  // Multiple playback control
  stopAllSounds(): void;
  pauseAllSounds(): void;
  resumeAllSounds(): void;

  // Fading
  fadeIn(id: string, duration: number, startVolume?: number, endVolume?: number, skipDispatchEvent?: boolean): void;
  fadeOut(id: string, duration?: number, startVolume?: number, endVolume?: number, stopAfterFade?: boolean, skipDispatchEvent?: boolean): void;
  fadeGlobalIn(duration?: number, startVolume?: number, endVolume?: number): void;
  fadeGlobalOut(duration?: number, startVolume?: number, endVolume?: number): void;
  
  // Volume control
  getVolume(id: string): number;
  setSoundVolume(id: string, volume: number, skipDispatchEvent?: boolean): void;
  getSoundVolume(id: string): number;
  setGlobalVolume(volume: number): void;
  getGlobalVolume(): number;

  // Mute control
  muteAllSounds(): void;
  unmuteAllSounds(): void;
  mute(id: string): void;
  unmute(id: string): void;
  toggleMute(id: string): void;
  toggleGlobalMute(): void;

  // Loop control
  setLoop(id: string, loop: boolean): void
  getLoop(id: string): boolean

  // Sound loading and management
  loadSounds(soundsToLoad: { id: string; url: string }[]): Promise<void>;
  loadSound(id: string, url: string): Promise<void>;
  updateSoundUrl(id: string, newUrl: string): Promise<void>;
  unloadSound(id: string): void
  removeSound(id: string): void
  isSoundLoaded(id: string): boolean;

  // Group management
  createSoundGroup(groupName: string, options: SoundGroup): void;
  addToSoundGroup(groupName: string, soundId: string): void;
  removeFromSoundGroup(groupName: string, soundId: string): void;
  getGroup(groupName: string): SoundGroup | undefined;
  removeSoundGroup(groupName: string): void;

  // Sprite logic
  setSoundSprite(id: string, sprite: { [key: string]: [number, number] }): void;
  getSpriteConfig(id: string): { [key: string]: [number, number] } | undefined;
  removeSpriteSound(id: string): void;
  removeSpriteConfig(id: string): void 

  // Context management
  suspendContext(): Promise<void>;
  resumeContext(): Promise<void>;
  getContext(): AudioContext;

  // State checks
  isPlaying(id: string): boolean;
  isPaused(id: string): boolean;
  isStopped(id: string): boolean;
  getSoundState(id: string): SoundStateInfo;
  getCurrentTime(id: string): number;

 // Progress tracking
  getCurrentTime(id: string): number;
  getDuration(id: string): number;
  getProgress(id: string): number; // Returns the progress as a ratio (0-1)
  getProgressPercentage(id: string): number; // Returns the progress as a percentage (0-100)
  startProgressTracking(id: string): void;
  stopProgressTracking(id: string): void;
  setProgressUpdateInterval(interval: number): void;

  // Pan control
  setPan(id: string, pan: number): void; // -1 (left) to 1 (right)
  removePan(id: string): void;
  setGlobalPan(value: number): void;
  getGlobalPan(): number; // -1 (left) to 1 (right)
  resetPan(id?: string): void;
  resetGlobalPan(): void;
  cleanupGlobalPan(): void;
  isStereoPanActive(id: string): boolean;

  // Spatial audio
  isSpatialAudioEnabled(): boolean;
  isSpatialAudioSupported(): boolean;
  setSpatialPosition(x: number, y: number, z: number, soundId?: string | null, soundPannerConfig?: SoundPannerConfig, skipDispatchEvent?: boolean): void;
  getSpatialPosition(soundId: string): { x: number; y: number; z: number } | null;
  setMasterSpatialPosition(x: number, y: number, z: number, config?: SoundPannerConfig, skipDispatchEvent?: boolean): void;
  getMasterSpatialPosition(): { x: number; y: number; z: number } | null;
  removeSpatialEffect(id: string): void;
  isSpatialAudioActive(id: string): boolean;
  updatePannerConfigById(soundId: string, newConfig: Partial<SoundPannerConfig>): void;
  resetSpatialPosition(id: string): void;
  resetMasterSpatialPosition(): void;

  // Playback rate control
  setPlaybackRate(id: string, rate: number): void;
  getPlaybackRate(id: string): number;

  // Reset operations
  reset(options?: SoundResetOptions): void;
  resetSound(id: string, options?: SoundResetOptions): void;

  // Sound / Buffer / Source / GainNode retrieval
  getSound(id: string): Sound | undefined;
  getBuffer(id: string): AudioBuffer | undefined;
  getSource(id: string): AudioBufferSourceNode | undefined;
  getGainNode(id: string): GainNode | undefined;

  // Utilities
  hasSound(id: string): boolean;
  updateSoundOptions(soundId: string, options: Partial<PlayOptions>): void;
  isReady(): boolean;
  getSoundCount(): number; // Get the number of sounds currently loaded
  getSoundIds(): string[]; // Get the IDs of all sounds currently loaded
  setDebugMode(debug: boolean): void;
  getConfig(): Readonly<SoundManagerConfig>;
  getLastError(): Error | null;
  roundValue(value: number, decimals: number): number; // Default precision is this.DEFAULT_PRECISION
  destroy(): void;

  // Listeners / Event handling
  addEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void;
  removeEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void;
  removeEventListenersForInstance(instanceId: string): void;
  dispatchEvent(event: SoundEvent): void;
  hasEventListener(type: SoundEventsEnum): boolean;

}
