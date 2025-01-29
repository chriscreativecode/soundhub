import { playOptions } from "./play-sound-options.interface";
import { SoundEventsEnum } from "./sound-events.enum";
import { SoundPannerConfig } from "./sound-panner-config";
import { SoundProgressStateInfo } from "./sound-progress-state-info";
import { SoundResetOptions } from "./sound-reset-options.interface";
import { Sound } from "./sound.interface";

export interface SoundEvent {
  currentTime?: number;
  error?: Error;
  isMaster?: boolean;
  isMuted?: boolean;
  options?: playOptions;
  pan?: number;
  pannerConfig?: SoundPannerConfig;
  position?: { x: number; y: number; z: number };
  previousPan?: number;
  resetOptions?: SoundResetOptions;
  soundId?: string;
  progress?: number; // ratio from 0 to 1
  progressInfo?: SoundProgressStateInfo;
  timestamp?: number;
  duration?:number;
  playbackRate?: number;
  sound?: Sound;
  type: SoundEventsEnum;
  volume?: number;
}
