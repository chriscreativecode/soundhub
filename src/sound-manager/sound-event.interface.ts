import { playOptions } from "./play-sound-options.interface";
import { SoundEventsEnum } from "./sound-events.enum";
import { SoundPannerConfig } from "./sound-panner-config";
import { SoundResetOptions } from "./sound-reset-options.interface";

export interface SoundEvent {
    currentTime?: number;
    error?: Error;
    isMaster?: boolean;
    isMuted?: boolean;
    options?: playOptions;
    pan?: number;
    pannerConfig?: SoundPannerConfig;
    position?: {x:number, y:number, z: number};
    previousPan?: number;
    resetOptions?: SoundResetOptions;
    soundId?: string;
    timestamp?: number;
    type: SoundEventsEnum;
    volume?: number;
  }