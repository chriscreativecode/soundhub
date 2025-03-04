import { PlayOptions } from "./play-sound-options.interface";
import { SoundEventsEnum } from "./sound-events.enum";
import { SoundPannerConfig } from "./sound-panner-config";
import { SoundProgressStateInfo } from "./sound-progress-state-info";
import { SoundResetOptions } from "./sound-reset-options.interface";
import { Sound } from "./sound.interface";

export interface SoundEvent {
  currentTime?: number;
  duration?:number;
  error?: Error;
  isMaster?: boolean;
  isMuted?: boolean;
  options?: PlayOptions;
  pan?: number;
  pannerConfig?: SoundPannerConfig;
  playbackRate?: number;
  position?: { x: number; y: number; z: number };
  previousPan?: number;
  progress?: number; // ratio from 0 to 1
  progressInfo?: SoundProgressStateInfo;
  resetOptions?: SoundResetOptions;
  sound?: Sound;
  soundId?: string;
  originalId?: string; // Add this to track the original sound ID
  instanceId?: string; // Add this for instance tracking
  timestamp?: number;
  type: SoundEventsEnum;
  volume?: number;
}
