import { PlayOptions } from "./play-sound-options.interface";
import { SoundEvent } from "./sound-event.interface";
import { SoundEventsEnum } from "./sound-events.enum";
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

  // Volume control
  getVolume(id: string): number;
  setSoundVolume(id: string, volume: number): void;
  getSoundVolume(id: string): number;
  setGlobalVolume(volume: number): void;
  getGlobalVolume(): number;

  // Loop control
  setLoop(id: string, loop: boolean): void
  getLoop(id: string): boolean

  // Mute control
  muteAllSounds(): void;
  unmuteAllSounds(): void;
  mute(id: string): void;
  unmute(id: string): void;
  toggleGlobalMute(): void;
  toggleMute(id: string): void;

  // Sound loading and management
  loadSounds(soundsToLoad: { id: string; url: string }[]): Promise<void>;
  loadSound(id: string, url: string): Promise<void>;
  updateSoundUrl(id: string, newUrl: string): Promise<void>;
  unloadSound(id: string): void
  removeSound(id: string): void
  isSoundLoaded(id: string): boolean;
  hasSound(id: string): boolean;

  // State checks
  isPlaying(id: string): boolean;
  isPaused(id: string): boolean;
  isStopped(id: string): boolean;
  getSoundState(id: string): SoundStateInfo;
  getSoundCount(): number;
  isReady(): boolean;

  // Progress tracking
  getCurrentTime(id: string): number;
  getDuration(id: string): number;
  getProgress(id: string): number; // Returns the progress as a ratio (0-1)
  getProgressPercentage(id: string): number;
  startProgressTracking(id: string): void;
  stopProgressTracking(id: string): void;

  // Batch operations
  stopAllSounds(): void;
  pauseAllSounds(): void;
  resumeAllSounds(): void;
  reset(options?: SoundResetOptions): void;

  // Fading
  fadeIn(id: string, duration: number, startVolume?: number, endVolume?: number): void;
  fadeOut(id: string, duration?: number, startVolume?: number, endVolume?: number, stopAfterFade?: boolean): void;
  fadeGlobalIn(duration?: number, startVolume?: number, endVolume?: number): void;
  fadeGlobalOut(duration?: number, startVolume?: number, endVolume?: number): void;

  // Spatial audio
  isSpatialAudioEnabled(): boolean;
  setSpatialPosition(x: number, y: number, z: number, soundId?: string | null, soundPannerConfig?: SoundPannerConfig, skipEvent?: boolean): void;
  getSpatialPosition(soundId: string): { x: number; y: number; z: number } | null;
  setMasterSpatialPosition(x: number, y: number, z: number, config?: SoundPannerConfig, skipEvent?: boolean): void;
  resetSpatialPosition(id: string): void;
  removeSpatialEffect(id: string): void;
  isSpatialAudioActive(id: string): boolean;
  updatePannerConfigById(soundId: string, newConfig: Partial<SoundPannerConfig>): void;

  // Pan control
  setPan(id: string, pan: number): void;
  removePan(id: string): void;
  setGlobalPan(value: number): void;
  getGlobalPan(): number;
  resetPan(id?: string): void;
  resetGlobalPan(): void;
  cleanupGlobalPan(): void;
  isStereoPanActive(id: string): boolean;

  // Sprite logic
  setSoundSprite(id: string, sprite: { [key: string]: [number, number] }): void;
  getSpriteConfig(id: string): { [key: string]: [number, number] } | undefined;
  removeSpriteConfig(id: string): void 

  // Context management
  suspendContext(): Promise<void>;
  resumeContext(): Promise<void>;
  getContext(): AudioContext;

  // Utilities
  setDebugMode(debug: boolean): void;
  getConfig(): Readonly<SoundManagerConfig>;
  getSound(id: string): Sound | undefined;
  getBuffer(id: string): AudioBuffer | undefined;
  getSource(id: string): AudioBufferSourceNode | undefined;
  getGainNode(id: string): GainNode | undefined;
  getSoundIds(): string[];
  updateSoundOptions(soundId: string, options: Partial<PlayOptions>): void;
  setPlaybackRate(id: string, rate: number): void;
  getLastError(): Error | null;
  roundValue(value: number, decimals: number): number; // Default precision is this.DEFAULT_PRECISION
  destroy(): void;

  // Listeners / Event handling
  addEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void;
  removeEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void;
  dispatchEvent(event: SoundEvent): void;
  hasEventListener(type: SoundEventsEnum): boolean;

}
