import { playOptions } from "./play-sound-options.interface";
import { SoundEvent } from "./sound-event.interface";
import { SoundEventsEnum } from "./sound-events.enum";
import { SoundManagerConfig } from "./sound-manager-config";
import { SoundPannerConfig } from "./sound-panner-config";
import { SoundResetOptions } from "./sound-reset-options.interface";
import { SoundStateInfo } from "./sound-state-info.interface";
import { Sound } from "./sound.interface";

export interface SoundManagerInterface {
  // Playback control
  play(id: string, options?: playOptions): void;
  playSprite(id: string, spriteKey: string, options: playOptions): void
  pause(id: string): void;
  resume(id: string): void;
  stop(id: string): void;
  seek(id: string, time: number): void;

  // Volume control
  setSoundVolume(id: string, volume: number): void;
  getSoundVolume(id: string): number;
  setGlobalVolume(volume: number): void;
  getGlobalVolume(): number;

  // Mute control
  muteAllSounds(): void;
  unmuteAllSounds(): void;
  mute(id: string): void;
  unmute(id: string): void;
  toggleGlobalMute(): void;
  toggleMute(id: string): void;

  // Sound loading and management
  preloadSounds(soundsToLoad: { id: string; url: string }[]): Promise<void>;
  updateSoundUrl(id: string, newUrl: string): Promise<void>;
  isSoundLoaded(id: string): boolean;
  hasSound(id: string): boolean;

  // State checks
  isPlaying(id: string): boolean;
  isPaused(id: string): boolean;
  isStopped(id: string): boolean;
  getSoundState(id: string): SoundStateInfo;

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
  setSoundPosition(x: number, y: number, z: number, id?: string | null, soundPannerConfig?: SoundPannerConfig): void;
  setMasterSpatialPosition(x: number, y: number, z: number, config?: SoundPannerConfig): void;
  resetSoundPosition(id: string): void;
  removeSpatialEffect(id: string): void;
  isSpatialAudioActive(id: string): boolean;
  updatePannerConfigById(soundId: string, newConfig: Partial<SoundPannerConfig>): void 

  // Pan control
  setPan(id: string, pan: number): void;
  removePan(id: string): void;
  setGlobalPan(value: number): void;
  getGlobalPan(): number;
  resetGlobalPan(): void;
  cleanupGlobalPan(): void;
  isStereoPanActive(id: string): boolean;

  // Utility
  getConfig(): Readonly<SoundManagerConfig>;
  getSound(id: string): Sound | undefined;
  getSoundIds(): string[];
  updateSoundOptions(soundId: string, options: Partial<playOptions>): void;
  setPlaybackRate(id: string, rate: number): void;
  setSoundSprite(id: string, sprite: { [key: string]: [number, number] }): void;
  destroy(): void;

  // listeners
  addEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void;
  removeEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void;
}
