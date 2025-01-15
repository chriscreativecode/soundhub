import { PlaySoundOptions } from "./play-sound-options.interface";
import { SoundEvent } from "./sound-event.interface";
import { SoundEventsEnum } from "./sound-events.enum";
import { SoundManagerConfig } from "./sound-manager-config";
import { SoundPannerConfig } from "./sound-panner-config";
import { SoundResetOptions } from "./sound-reset-options.interface";
import { SoundStateInfo } from "./sound-state-info.interface";
import { Sound } from "./sound.interface";

export interface SoundManagerInterface {
  // Playback control
  playSound(id: string, options?: PlaySoundOptions): void;
  pauseSound(id: string): void;
  resumeSound(id: string): void;
  stopSound(id: string): void;
  seekTo(id: string, time: number): void;

  // Volume control
  setVolumeById(id: string, volume: number): void;
  getVolumeById(id: string): number;
  setGlobalVolume(volume: number): void;
  getGlobalVolume(): number;

  // Mute control
  muteAllSounds(): void;
  unmuteAllSounds(): void;
  muteSoundById(id: string): void;
  unmuteSoundById(id: string): void;
  toggleMute(): void;

  // Sound loading and management
  preloadSounds(soundsToLoad: { id: string; url: string }[]): Promise<void>;
  updateSoundUrl(id: string, newUrl: string): Promise<void>;
  isSoundLoaded(id: string): boolean;
  hasSound(id: string): boolean;

  // State checks
  isPlaying(id: string): boolean;
  isPaused(id: string): boolean;
  getSoundState(id: string): SoundStateInfo;

  // Batch operations
  stopAllSounds(): void;
  pauseAllSounds(): void;
  resumeAllSounds(): void;
  reset(options?: SoundResetOptions): void;

  // Fading
  fadeIn(id: string, duration: number, startVolume?: number, endVolume?: number): void;
  fadeOut(id: string, duration?: number, startVolume?: number, endVolume?: number): void;
  fadeMasterIn(duration?: number, startVolume?: number, endVolume?: number): void;
  fadeMasterOut(duration?: number, startVolume?: number, endVolume?: number): void;

  // Spatial audio
  isSpatialAudioEnabled(): boolean;
  setSoundPosition(id: string, x: number, y: number, z: number, soundPannerConfig?: SoundPannerConfig): void;
  resetSoundPosition(id: string): void;
  removeSpatialEffect(id: string): void;
  isSpatialAudioActive(id: string): boolean;
  updatePannerConfig(soundId: string, newConfig: Partial<SoundPannerConfig>): void 

  // Pan control
  setPan(id: string, pan: number): void;
  removePan(id: string): void;
  setMasterPan(value: number): void;
  getMasterPan(): number;
  resetMasterPan(): void;
  isStereoPanActive(id: string): boolean;

  // Utility
  getConfig(): Readonly<SoundManagerConfig>;
  getSound(id: string): Sound | undefined;
  getSoundIds(): string[];
  updateSoundOptions(soundId: string, options: Partial<PlaySoundOptions>): void;
  isStopped(id: string): boolean;
  destroy(): void;

  // listeners
  addEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void;
  removeEventListener(type: SoundEventsEnum, callback: (event: SoundEvent) => void): void;
}
