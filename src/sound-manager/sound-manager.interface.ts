import { PlaySoundOptions } from "./play-sound-options.interface";
import { SoundManagerConfig } from "./sound-manager-config";
import { SoundStateInfo } from "./sound-state-info.interface";
import { Sound } from "./sound.interface";

export interface SoundManagerInterface {
  // Playback control
  playSound(id: string, options?: PlaySoundOptions): Promise<void>;
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
  hasSound(id: string): boolean;
  isSoundLoaded(id: string): boolean;

  // State checks
  isPlaying(id: string): boolean;
  isPaused(id: string): boolean;
  getSoundState(id: string): SoundStateInfo;

  // Batch operations
  stopAllSounds(): void;
  pauseAllSounds(): void;
  resumeAllSounds(): void;

  // Fading
  fadeOut(id: string, duration?: number): Promise<void>;
  fadeMasterIn(duration?: number): Promise<void>;
  fadeMasterOut(duration?: number): Promise<void>;

  // Spatial audio
  isSpatialAudioEnabled(): boolean;
  setSoundPosition(id: string, x: number, y: number, z: number): void;
  resetSoundPosition(id: string): void;
  removeSpatialEffect(id: string): void;

  // Pan control
  setPan(id: string, pan: number): void;

  // Utility
  getConfig(): Readonly<SoundManagerConfig>;
  getSound(id: string): Sound | undefined;
  getSoundIds(): string[];
  dispose(): void;
}
